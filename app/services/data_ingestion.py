from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import asyncio
from urllib.parse import urlparse

from app.models.database import BreachEntry
from app.services.data_enrichment import DataEnrichmentService

logger = logging.getLogger(__name__)

async def process_breach_file(
    file_path: str,
    db: Session,
    enrichment_service: DataEnrichmentService
) -> Dict[str, int]:
    """Process a breach data file and store entries in database"""
    stats = {
        'total_lines': 0,
        'processed': 0,
        'failed': 0
    }
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            stats['total_lines'] = sum(1 for line in f if line.strip())
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                    
                try:
                    line = line.strip()
                    last_colon = line.rindex(':')
                    second_last_colon = line.rindex(':', 0, last_colon)
                    
                    url = line[:second_last_colon]
                    username = line[second_last_colon + 1:last_colon]
                    password = line[last_colon + 1:]
                    
                    if not url or not username or not password:
                        raise ValueError("Missing required fields")
                    
                    parsed_url = urlparse(url)
                    if not parsed_url.scheme or not parsed_url.netloc:
                        raise ValueError("Invalid URL format")
                        
                    domain = parsed_url.netloc
                    path = parsed_url.path or '/'
                    port = parsed_url.port or (443 if parsed_url.scheme == 'https' else 80)
                    
                    entry = BreachEntry(
                        url=url,
                        username=username,
                        password=password,
                        domain=domain,
                        path=path,
                        port=port,
                        is_secure=1 if parsed_url.scheme == 'https' else 0,
                        tags=[],
                        extra_metadata={}
                    )
                    
                    db.add(entry)
                    db.commit()
                    db.refresh(entry)
                    
                    from app.api.v1.breach_data import broadcast_breach_entry
                    await broadcast_breach_entry(entry)
                    
                    try:
                        try:
                            ip_data = await enrichment_service._resolve_domain(domain)
                            if ip_data:
                                entry.ip_address = ip_data.get('ip_address')
                                entry.tags = ip_data.get('tags', [])
                                db.commit()
                                db.refresh(entry)
                                await broadcast_breach_entry(entry)
                        except Exception as e:
                            logger.warning(f"Domain resolution failed for {domain}: {str(e)}")

                        try:
                            url_data = await enrichment_service._check_url_accessibility(url)
                            if url_data:
                                entry.status_code = url_data.get('status_code')
                                entry.has_captcha = url_data.get('has_captcha', 0)
                                entry.has_mfa = url_data.get('has_mfa', 0)
                                entry.page_title = url_data.get('page_title')
                                if url_data.get('tags'):
                                    entry.tags = list(set(entry.tags or [] + url_data['tags']))
                                if url_data.get('service_type'):
                                    entry.service_type = url_data['service_type']
                                db.commit()
                                db.refresh(entry)
                                await broadcast_breach_entry(entry)
                        except Exception as e:
                            logger.warning(f"URL accessibility check failed for {url}: {str(e)}")

                        try:
                            breach_data = await enrichment_service._check_breach_status(domain)
                            if breach_data:
                                if 'breached' not in entry.tags:
                                    entry.tags = list(set(entry.tags or [] + ['breached']))
                                entry.extra_metadata = {
                                    **(entry.extra_metadata or {}),
                                    'breach_info': breach_data
                                }
                                db.commit()
                                db.refresh(entry)
                                await broadcast_breach_entry(entry)
                        except Exception as e:
                            logger.warning(f"Breach status check failed for {domain}: {str(e)}")

                        stats['processed'] += 1
                        logger.info(f"Progress: {stats['processed']}/{stats['total_lines']} entries processed")

                    except Exception as e:
                        logger.error(f"Enrichment failed for entry {entry.id}: {str(e)}")
                        stats['failed'] += 1

                except Exception as e:
                    logger.error(f"Failed to process line: {str(e)}")
                    stats['failed'] += 1

        logger.info(f"File processing completed: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Fatal error processing file: {str(e)}")
        return stats 