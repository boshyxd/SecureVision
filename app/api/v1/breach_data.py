from fastapi import APIRouter, Depends, HTTPException, UploadFile, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.orm import Session
from typing import List
import logging
import json
from starlette.websockets import WebSocketState
import asyncio
from datetime import datetime

from app.models.database import get_db, BreachEntry
from app.models.schemas import BreachEntryCreate, BreachEntry as BreachEntrySchema
from app.services.data_enrichment import DataEnrichmentService, DataEnrichmentResult, BreachData

logger = logging.getLogger(__name__)

router = APIRouter(tags=["breach-data"])

active_connections: List[WebSocket] = []

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time breach updates"""
    logger.info("New WebSocket connection attempt")
    
    client_host = websocket.client.host
    logger.info(f"Client connecting from: {client_host}")
    
    try:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_host}")
        active_connections.append(websocket)
        
        try:
            while websocket.client_state == WebSocketState.CONNECTED:
                try:
                    # Shorter timeout for more responsive connection management
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                    logger.debug(f"Received WebSocket message from {client_host}: {data}")
                    
                    if data == "pong":
                        continue
                        
                    # If we receive an entry ID, send the full entry data including breach info
                    try:
                        message = json.loads(data)
                        if isinstance(message, dict) and 'id' in message:
                            entry_id = message['id']
                            db = get_db()
                            try:
                                entry = db.query(BreachEntry).filter(BreachEntry.id == entry_id).first()
                                if entry:
                                    await broadcast_breach_entry(entry)
                            finally:
                                db.close()
                    except json.JSONDecodeError:
                        pass
                        
                except asyncio.TimeoutError:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text("ping")
                        logger.debug(f"Sent ping to {client_host}")
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket connection closed by client: {client_host}")
        except Exception as e:
            logger.error(f"WebSocket error for {client_host}: {str(e)}")
        finally:
            if websocket in active_connections:
                active_connections.remove(websocket)
            logger.info(f"WebSocket connection cleaned up for {client_host}")
            
    except Exception as e:
        logger.error(f"Failed to establish WebSocket connection for {client_host}: {str(e)}")
        if websocket in active_connections:
            active_connections.remove(websocket)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=1000)
        raise

async def broadcast_breach_entry(entry: BreachEntry):
    """Broadcast a new breach entry to all connected WebSocket clients"""
    if not active_connections:
        logger.debug("No active WebSocket connections to broadcast to")
        return
        
    tags = json.loads(entry.tags) if isinstance(entry.tags, str) else (entry.tags or [])
    
    entry_dict = {
        "id": str(entry.id),
        "url": entry.url,
        "username": entry.username,
        "password": entry.password,
        "risk_score": float(entry.risk_score) if entry.risk_score is not None else 0.5,
        "pattern_type": entry.pattern_type or 'unknown',
        "last_analyzed": entry.last_checked.isoformat() if entry.last_checked else None,
        "metadata": {
            "domain": entry.domain,
            "ip_address": entry.ip_address,
            "port": entry.port,
            "path": entry.path,
            "page_title": entry.page_title,
            "service_type": entry.service_type,
            "status": entry.status_code,
            "hasCaptcha": bool(entry.has_captcha),
            "hasMfa": bool(entry.has_mfa),
            "isSecure": bool(entry.is_secure),
            "tags": tags,
            "breach_info": {
                "is_breached": bool(entry.had_breach),
                "total_breaches": entry.breach_count,
                "total_pwned": entry.total_pwned,
                "latest_breach": entry.latest_breach.isoformat() if entry.latest_breach else None,
                "data_classes": entry.data_classes or [],
                "breaches": entry.breach_details or []
            }
        }
    }
    
    logger.debug(f"Broadcasting breach entry to {len(active_connections)} clients")
    disconnected = []
    for connection in active_connections:
        try:
            if connection.client_state == WebSocketState.CONNECTED:
                await connection.send_json(entry_dict)
            else:
                disconnected.append(connection)
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {str(e)}")
            disconnected.append(connection)
    
    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)

# This endpoint is designed for the data ingestion workflow using MQTT workers.
@router.post("/", response_model=BreachEntrySchema)
async def create_breach_entry(
    entry: DataEnrichmentResult,
    db: Session = Depends(get_db)
):
    """Create a new breach entry with enriched data"""
    try:
        # Create new entry
        db_entry = BreachEntry(
            url=entry.url,
            username=entry.username,
            password=entry.password,
            domain=entry.domain,
            ip_address=entry.ip_address,
            port=entry.port,
            path=entry.path,
            page_title=entry.page_title,
            service_type=entry.service_type,
        )
        db_entry.has_captcha = 1 if entry.has_captcha else 0
        db_entry.has_mfa = 1 if entry.has_mfa else 0
        db_entry.is_secure = 1 if entry.is_secure else 0
        db_entry.status_code = entry.status_code
        db_entry.tags = entry.tags

        breach_info = entry.breach_info
        db_entry.had_breach = 1 if breach_info.get('is_breached') else 0
        db_entry.breach_count = breach_info.get('total_breaches', 0)
        db_entry.total_pwned = breach_info.get('total_pwned', 0)
        
        if breach_info.latest_breach:
            try:
                if isinstance(breach_info.latest_breach, str):
                    # Try parsing ISO format first
                    try:
                        db_entry.latest_breach = datetime.fromisoformat(breach_info.latest_breach)
                    except ValueError:
                        # If that fails, try parsing YYYY-MM-DD format
                        db_entry.latest_breach = datetime.strptime(breach_info.latest_breach, '%Y-%m-%d')
                else:
                    db_entry.latest_breach = breach_info.latest_breach
            except Exception as e:
                logger.error(f"Error parsing breach date: {str(e)}")
                db_entry.latest_breach = None

        db_entry.data_classes = breach_info.data_classes
        db_entry.breach_details = breach_info.data_classes

        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return db_entry
            
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating breach entry: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{entry_id}", response_model=BreachEntrySchema)
async def get_breach_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a specific breach entry"""
    entry = db.query(BreachEntry).filter(BreachEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry.to_dict()

@router.get("/", response_model=List[BreachEntrySchema])
async def list_breach_entries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List breach entries"""
    entries = db.query(BreachEntry).offset(skip).limit(limit).all()
    return [entry.to_dict() for entry in entries]

@router.delete("/{entry_id}")
async def delete_breach_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a breach entry"""
    entry = db.query(BreachEntry).filter(BreachEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    try:
        db.delete(entry)
        db.commit()
        return {"message": "Entry deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting breach entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete entry")

@router.put("/{entry_id}", response_model=BreachEntrySchema)
async def update_breach_entry(
    entry_id: int,
    entry_update: BreachEntryCreate,
    db: Session = Depends(get_db)
):
    """Update a breach entry"""
    db_entry = db.query(BreachEntry).filter(BreachEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    try:
        async with DataEnrichmentService() as service:
            enriched_data = await service.enrich_entry(entry_update.url)
            
        if not enriched_data:
            raise HTTPException(status_code=400, detail="Failed to enrich entry data")
            
        for key, value in enriched_data.model_dump().items():
            setattr(db_entry, key, value)
            
        db_entry.url = entry_update.url
        db_entry.username = entry_update.username
        db_entry.password = entry_update.password
        
        db.commit()
        db.refresh(db_entry)
        
        return db_entry.to_dict()
        
    except Exception as e:
        logger.error(f"Error updating breach entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update entry") 