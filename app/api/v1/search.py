from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models.database import get_db, BreachEntry
from pydantic import BaseModel
import ipaddress
from urllib.parse import urlparse

router = APIRouter()

class SearchFilters(BaseModel):
    service_types: Optional[List[str]] = None
    security_features: Optional[List[str]] = None
    status: Optional[List[str]] = None
    ports: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    exclude_tags: Optional[List[str]] = None
    exclude_local_ips: Optional[bool] = True

def is_local_ip(ip: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip)
        return (
            ip_obj.is_private or
            ip_obj.is_loopback or
            ip_obj.is_link_local or
            str(ip_obj).startswith('192.168.') or
            str(ip_obj).startswith('127.')
        )
    except ValueError:
        return False

@router.get("/search")
async def search_breaches(
    query: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    filters: SearchFilters = Depends(),
    db: Session = Depends(get_db)
):
    base_query = db.query(BreachEntry)

    if query:
        base_query = base_query.filter(
            or_(
                BreachEntry.url.ilike(f"%{query}%"),
                BreachEntry.domain.ilike(f"%{query}%"),
                BreachEntry.ip_address.ilike(f"%{query}%"),
                BreachEntry.path.ilike(f"%{query}%"),
                BreachEntry.service_type.ilike(f"%{query}%")
            )
        )

    if filters.service_types:
        base_query = base_query.filter(
            BreachEntry.service_type.in_(filters.service_types)
        )

    if filters.security_features:
        for feature in filters.security_features:
            if feature == 'CAPTCHA':
                base_query = base_query.filter(BreachEntry.has_captcha == 1)
            elif feature == 'MFA':
                base_query = base_query.filter(BreachEntry.has_mfa == 1)
            elif feature == 'HTTPS':
                base_query = base_query.filter(BreachEntry.is_secure == 1)

    if filters.status:
        status_conditions = []
        for status in filters.status:
            if status == 'active':
                status_conditions.append(BreachEntry.status_code == 200)
            elif status == 'pending':
                status_conditions.append(BreachEntry.status_code == None)
            elif status == 'invalid':
                status_conditions.append(BreachEntry.status_code != 200)
        if status_conditions:
            base_query = base_query.filter(or_(*status_conditions))

    if filters.ports:
        base_query = base_query.filter(BreachEntry.port.in_(filters.ports))

    if filters.tags:
        for tag in filters.tags:
            base_query = base_query.filter(BreachEntry.tags.contains([tag]))

    if filters.exclude_tags:
        for tag in filters.exclude_tags:
            base_query = base_query.filter(~BreachEntry.tags.contains([tag]))

    if filters.exclude_local_ips:
        base_query = base_query.filter(
            ~BreachEntry.ip_address.in_([
                '127.0.0.1',
                'localhost',
                '::1'
            ])
        )

    total = base_query.count()

    entries = base_query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "entries": [entry.to_dict() for entry in entries],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/stats")
async def get_search_stats(db: Session = Depends(get_db)):
    """Get search statistics"""
    pass 