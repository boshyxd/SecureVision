import asyncio
import aiofiles
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.database import get_db, init_db
from app.services.data_enrichment import DataEnrichmentService
from tests.test_data_ingestion import process_breach_line
from typing import List, Optional
import click
from tqdm import tqdm
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def process_chunk(
    lines: List[str],
    db: Session,
    enrichment_service: DataEnrichmentService,
    pbar: Optional[tqdm] = None
) -> int:
    """Process a chunk of breach data lines"""
    tasks = []
    for line in lines:
        if line.strip():
            tasks.append(process_breach_line(line, db, enrichment_service))
    
    try:
        entries = await asyncio.gather(*tasks)
        if pbar:
            pbar.update(len(entries))
        return len(entries)
    except Exception as e:
        logger.error(f"Error processing chunk: {str(e)}")
        return 0

async def count_file_lines(file_path: str) -> int:
    """Count number of lines in file"""
    count = 0
    async with aiofiles.open(file_path, 'r') as f:
        async for _ in f:
            count += 1
    return count

@click.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--chunk-size', default=100, help='Number of lines to process in parallel')
@click.option('--init-db/--no-init-db', default=False, help='Initialize database before ingestion')
async def ingest_breach_data(file_path: str, chunk_size: int, init_db: bool):
    """Ingest breach data from a file"""
    if init_db:
        logger.info("Initializing database...")
        init_db()

    total_lines = await count_file_lines(file_path)
    logger.info(f"Processing {total_lines} lines from {file_path}")

    current_chunk: List[str] = []
    processed_count = 0
    error_count = 0

    # Initialize progress bar
    with tqdm(total=total_lines, desc="Processing entries") as pbar:
        async with DataEnrichmentService() as enrichment_service:
            db = next(get_db())
            try:
                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        if not line.strip():
                            continue
                        
                        current_chunk.append(line)
                        
                        if len(current_chunk) >= chunk_size:
                            try:
                                processed = await process_chunk(
                                    current_chunk,
                                    db,
                                    enrichment_service,
                                    pbar
                                )
                                processed_count += processed
                                error_count += len(current_chunk) - processed
                            except Exception as e:
                                logger.error(f"Chunk processing error: {str(e)}")
                                error_count += len(current_chunk)
                            
                            current_chunk = []

                # Process remaining lines
                if current_chunk:
                    try:
                        processed = await process_chunk(
                            current_chunk,
                            db,
                            enrichment_service,
                            pbar
                        )
                        processed_count += processed
                        error_count += len(current_chunk) - processed
                    except Exception as e:
                        logger.error(f"Final chunk processing error: {str(e)}")
                        error_count += len(current_chunk)

            finally:
                db.close()

    logger.info(f"""
    Ingestion complete:
    - Total lines: {total_lines}
    - Processed successfully: {processed_count}
    - Errors: {error_count}
    """)

if __name__ == "__main__":
    asyncio.run(ingest_breach_data()) 