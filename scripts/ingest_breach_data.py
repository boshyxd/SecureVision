import asyncio
import aiofiles
from pathlib import Path
import sys
from sqlalchemy.orm import Session
from app.models.database import get_db, init_db as initialize_database
from app.services.data_enrichment import DataEnrichmentService
from app.services.data_ingestion import process_breach_file
import click
import logging
from tqdm import tqdm

project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@click.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--chunk-size', default=100, help='Number of lines to process in each chunk')
@click.option('--max-concurrent', default=5, help='Maximum number of concurrent chunks')
@click.option('--init-db/--no-init-db', default=False, help='Initialize database before ingestion')
def main(file_path: str, chunk_size: int, max_concurrent: int, init_db: bool):
    """Main entry point for the script"""
    if init_db:
        logger.info("Initializing database...")
        initialize_database()

    logger.info(f"Starting ingestion of {file_path}")
    logger.info(f"Chunk size: {chunk_size}, Max concurrent chunks: {max_concurrent}")

    async def run():
        async with DataEnrichmentService() as enrichment_service:
            db = next(get_db())
            try:
                stats = await process_breach_file(
                    file_path,
                    db,
                    enrichment_service,
                    chunk_size=chunk_size,
                    max_concurrent_chunks=max_concurrent
                )
                
                logger.info(f"""
Ingestion complete:
- Total lines: {stats['total_lines']}
- Successfully processed: {stats['processed']}
- Failed: {stats['failed']}
- Chunks processed: {stats['chunks_processed']}
- Success rate: {(stats['processed'] / stats['total_lines'] * 100):.2f}%
                """)
                
            except Exception as e:
                logger.error(f"Error during ingestion: {str(e)}")
                raise
            finally:
                db.close()

    asyncio.run(run())

if __name__ == "__main__":
    main() 