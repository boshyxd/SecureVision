from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from datetime import datetime
from app.models.database import BreachEntry
from app.services.data_enrichment import DataEnrichmentService
import re

logger = logging.getLogger(__name__)

async def process_breach_line(line: str, db: Session, service: DataEnrichmentService) -> Optional[BreachEntry]:
    """Process a single line of breach data."""
    try:
        parts = line.strip().rsplit(':', 2)
        if len(parts) != 3:
            logger.warning(f"Invalid line format: {line}")
            return None
            
        url, username, password = parts
        
        if not re.match(r'^https?://', url):
            logger.warning(f"Invalid URL format: {url}")
            return None
            
        enriched_data = await service.enrich_entry(url)
        if not enriched_data:
            logger.warning(f"Failed to enrich data for URL: {url}")
            return None
            
        entry = BreachEntry(
            url=url,
            username=username,
            password=password,
            domain=enriched_data.get('domain'),
            ip_address=enriched_data.get('ip_address'),
            port=enriched_data.get('port'),
            path=enriched_data.get('path'),
            page_title=enriched_data.get('page_title'),
            service_type=enriched_data.get('service_type'),
            has_captcha=enriched_data.get('has_captcha', 0),
            has_mfa=enriched_data.get('has_mfa', 0),
            is_secure=enriched_data.get('is_secure', 0),
            status_code=enriched_data.get('status_code'),
            tags=enriched_data.get('tags', []),
            extra_metadata=enriched_data.get('extra_metadata', {}),
            created_at=datetime.utcnow(),
            last_checked=datetime.utcnow(),
            last_modified=datetime.utcnow()
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
        
    except Exception as e:
        logger.error(f"Error processing breach line: {str(e)}")
        db.rollback()
        return None

async def process_breach_file(file_path: str, db: Session, enrichment_service: DataEnrichmentService) -> List[BreachEntry]:
    """Process a breach data file"""
    entries = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entry = await process_breach_line(line, db, enrichment_service)
                    if entry:
                        entries.append(entry)
                        
        return entries
    except Exception as e:
        logger.error(f"Error processing breach file {file_path}: {str(e)}")
        return [] 