from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.services.data_ingestion import process_breach_file
from app.services.data_enrichment import DataEnrichmentService
import tempfile
import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload")
async def upload_breach_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload and process a breach data file
    File format should be: url:username:password (one entry per line)
    """
    if not file.filename.endswith('.txt'):
        raise HTTPException(
            status_code=400,
            detail="Only .txt files are supported"
        )

    try:
        with tempfile.NamedTemporaryFile(delete=False, mode='wb') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            async with DataEnrichmentService() as service:
                stats = await process_breach_file(temp_path, db, service)
                
            logger.info(f"File processing completed: {stats}")
            
            return {
                "message": "File processing completed",
                "filename": file.filename,
                "stats": stats
            }
            
        finally:
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Failed to delete temp file {temp_path}: {str(e)}")

    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process uploaded file: {str(e)}"
        ) 