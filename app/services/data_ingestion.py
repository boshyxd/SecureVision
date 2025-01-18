from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
from app.models.database import BreachEntry
from app.services.data_enrichment import DataEnrichmentService
import re
from sqlalchemy.exc import SQLAlchemyError
import asyncio
from contextlib import contextmanager

logger = logging.getLogger(__name__)

@contextmanager
def batch_commit(db: Session):
    """Context manager for batch database commits"""
    try:
        yield
        db.commit()
    except Exception as e:
        logger.error(f"Error in batch commit: {str(e)}")
        db.rollback()
        raise

async def process_breach_line(line: str, db: Session, service: DataEnrichmentService) -> Optional[Dict[str, Any]]:
    """Process a single line of breach data and return entry data without committing."""
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
            
        return {
            'url': url,
            'username': username,
            'password': password,
            'domain': enriched_data.get('domain'),
            'ip_address': enriched_data.get('ip_address'),
            'port': enriched_data.get('port'),
            'path': enriched_data.get('path'),
            'page_title': enriched_data.get('page_title'),
            'service_type': enriched_data.get('service_type'),
            'has_captcha': enriched_data.get('has_captcha', 0),
            'has_mfa': enriched_data.get('has_mfa', 0),
            'is_secure': enriched_data.get('is_secure', 0),
            'status_code': enriched_data.get('status_code'),
            'tags': enriched_data.get('tags', []),
            'extra_metadata': enriched_data.get('extra_metadata', {}),
            'created_at': datetime.utcnow(),
            'last_checked': datetime.utcnow(),
            'last_modified': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error processing breach line: {str(e)}")
        return None

async def process_chunk(lines: List[str], db: Session, service: DataEnrichmentService) -> int:
    """Process a chunk of breach data lines with batch commit"""
    entries_data = []
    try:
        # Process all lines in parallel
        tasks = [process_breach_line(line, db, service) for line in lines if line.strip()]
        entries_data = await asyncio.gather(*tasks)
        entries_data = [entry for entry in entries_data if entry is not None]
        
        if not entries_data:
            return 0
            
        # Batch create entries
        with batch_commit(db):
            entries = [BreachEntry(**data) for data in entries_data]
            db.bulk_save_objects(entries)
            
        return len(entries_data)
        
    except Exception as e:
        logger.error(f"Error processing chunk: {str(e)}")
        return 0

async def process_breach_file(
    file_path: str,
    db: Session,
    enrichment_service: DataEnrichmentService,
    chunk_size: int = 100,
    max_concurrent_chunks: int = 5
) -> Dict[str, int]:
    """Process a breach data file with chunked processing and statistics"""
    stats = {
        'total_lines': 0,
        'processed': 0,
        'failed': 0,
        'chunks_processed': 0
    }
    
    try:
        # Count total lines first
        with open(file_path, 'r', encoding='utf-8') as f:
            stats['total_lines'] = sum(1 for _ in f)
        
        # Process in chunks
        current_chunk = []
        chunk_tasks = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                    
                current_chunk.append(line)
                
                if len(current_chunk) >= chunk_size:
                    # Process chunk
                    chunk_tasks.append(
                        process_chunk(current_chunk.copy(), db, enrichment_service)
                    )
                    current_chunk = []
                    
                    # If we have enough tasks, wait for some to complete
                    if len(chunk_tasks) >= max_concurrent_chunks:
                        chunk_results = await asyncio.gather(*chunk_tasks)
                        stats['processed'] += sum(chunk_results)
                        stats['chunks_processed'] += len(chunk_results)
                        chunk_tasks = []
            
            # Process remaining lines
            if current_chunk:
                chunk_tasks.append(
                    process_chunk(current_chunk, db, enrichment_service)
                )
            
            if chunk_tasks:
                chunk_results = await asyncio.gather(*chunk_tasks)
                stats['processed'] += sum(chunk_results)
                stats['chunks_processed'] += len(chunk_results)
        
        stats['failed'] = stats['total_lines'] - stats['processed']
        return stats
        
    except Exception as e:
        logger.error(f"Error processing breach file {file_path}: {str(e)}")
        return stats 