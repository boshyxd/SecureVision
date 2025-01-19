from fastapi import APIRouter, Depends, HTTPException, UploadFile, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.orm import Session
from typing import List
import logging
import json
from starlette.websockets import WebSocketState
import asyncio

from app.models.database import get_db, BreachEntry
from app.models.schemas import BreachEntryCreate, BreachEntry as BreachEntrySchema
from app.services.data_enrichment import DataEnrichmentService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["breach-data"])

active_connections: List[WebSocket] = []

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time breach updates"""
    logger.info("New WebSocket connection attempt")
    
    client_host = websocket.client.host
    logger.info(f"Client connecting from: {client_host}")
    
    existing_connections = [conn for conn in active_connections 
                          if conn.client.host == client_host]
    
    if existing_connections:
        logger.info(f"Rejecting connection from {client_host} - already connected")
        await websocket.close(code=1000, reason="Already connected")
        return
    
    try:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_host}")
        active_connections.append(websocket)
        
        try:
            while websocket.client_state == WebSocketState.CONNECTED:
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                    logger.debug(f"Received WebSocket message from {client_host}: {data}")
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
            "tags": tags
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

@router.post("/", response_model=BreachEntrySchema)
async def create_breach_entry(
    entry: BreachEntryCreate,
    db: Session = Depends(get_db)
):
    """Create a new breach entry"""
    try:
        async with DataEnrichmentService() as service:
            enriched_data = await service.enrich_entry(entry.url)
            
        if not enriched_data:
            raise HTTPException(status_code=400, detail="Failed to enrich entry data")
            
        db_entry = BreachEntry(
            url=entry.url,
            username=entry.username,
            password=entry.password,
            **enriched_data
        )
        
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return db_entry.to_dict()
        
    except Exception as e:
        logger.error(f"Error creating breach entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create breach entry")

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
            
        for key, value in enriched_data.items():
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