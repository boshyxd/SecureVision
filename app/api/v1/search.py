from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models.database import get_db, BreachEntry
from pydantic import BaseModel
import ipaddress
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["search"])

class SearchFilters(BaseModel):
    domain: Optional[str] = None
    port: Optional[int] = None
    application: Optional[List[str]] = None
    has_captcha: Optional[bool] = None
    has_mfa: Optional[bool] = None
    is_secure: Optional[bool] = None
    excludeNonRoutable: Optional[bool] = None
    risk_score_min: Optional[float] = None
    risk_score_max: Optional[float] = None

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

@router.get("/")
async def search_breaches(
    query: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    filters: SearchFilters = Depends(),
    db: Session = Depends(get_db)
):
    try:
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

        # Apply domain filter
        if filters.domain:
            base_query = base_query.filter(BreachEntry.domain.ilike(f"%{filters.domain}%"))

        # Apply port filter
        if filters.port is not None:
            base_query = base_query.filter(BreachEntry.port == filters.port)

        # Apply application type filter
        if filters.application:
            base_query = base_query.filter(
                or_(*[BreachEntry.service_type.ilike(f"%{app}%") for app in filters.application])
            )

        # Apply security feature filters
        if filters.has_captcha is not None:
            base_query = base_query.filter(BreachEntry.has_captcha == (1 if filters.has_captcha else 0))
        
        if filters.has_mfa is not None:
            base_query = base_query.filter(BreachEntry.has_mfa == (1 if filters.has_mfa else 0))
        
        if filters.is_secure is not None:
            base_query = base_query.filter(BreachEntry.is_secure == (1 if filters.is_secure else 0))

        # Apply risk score filters
        if filters.risk_score_min is not None:
            base_query = base_query.filter(BreachEntry.risk_score >= filters.risk_score_min)
        
        if filters.risk_score_max is not None:
            base_query = base_query.filter(BreachEntry.risk_score <= filters.risk_score_max)

        # Apply local IP exclusion
        if filters.excludeNonRoutable:
            base_query = base_query.filter(
                ~BreachEntry.ip_address.in_([
                    '127.0.0.1',
                    'localhost',
                    '::1'
                ])
            ).filter(
                ~BreachEntry.ip_address.like('192.168.%')
            ).filter(
                ~BreachEntry.ip_address.like('10.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.16.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.17.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.18.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.19.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.20.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.21.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.22.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.23.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.24.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.25.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.26.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.27.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.28.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.29.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.30.%')
            ).filter(
                ~BreachEntry.ip_address.like('172.31.%')
            )

        # Calculate total before pagination
        total = base_query.count()

        # Apply pagination
        entries = base_query.offset((page - 1) * page_size).limit(page_size).all()

        return {
            "entries": [entry.to_dict() for entry in entries],
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": total > page * page_size
        }

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_search_stats(db: Session = Depends(get_db)):
    """Get statistics about breach entries"""
    try:
        critical_endpoints = db.query(BreachEntry).filter(
            or_(
                BreachEntry.path.ilike('%/admin%'),
                BreachEntry.path.ilike('%/vpn%'),
                BreachEntry.path.ilike('%/rdweb%'),
                BreachEntry.service_type.ilike('admin%'),
                BreachEntry.service_type.ilike('vpn%'),
                BreachEntry.service_type.ilike('rdweb%')
            )
        ).count()

        active_services = db.query(BreachEntry).filter(
            BreachEntry.status_code == 200
        ).count()

        exposed_admin = db.query(BreachEntry).filter(
            or_(
                BreachEntry.path.ilike('%/admin%'),
                BreachEntry.path.ilike('%/wp-admin%'),
                BreachEntry.path.ilike('%/administrator%'),
                BreachEntry.path.ilike('%/panel%'),
                BreachEntry.path.ilike('%/dashboard%')
            )
        ).count()

        vulnerable_services = db.query(BreachEntry).filter(
            and_(
                BreachEntry.has_mfa == 0,
                BreachEntry.has_captcha == 0,
                BreachEntry.status_code == 200
            )
        ).count()

        unprotected_endpoints = db.query(BreachEntry).filter(
            BreachEntry.is_secure == 0
        ).count()

        unreachable_services = db.query(BreachEntry).filter(
            and_(
                BreachEntry.status_code != None,
                BreachEntry.status_code != 200
            )
        ).count()

        return {
            "critical_endpoints": critical_endpoints,
            "active_services": active_services,
            "exposed_admin": exposed_admin,
            "vulnerable_services": vulnerable_services,
            "unprotected_endpoints": unprotected_endpoints,
            "unreachable_services": unreachable_services
        }

    except Exception as e:
        logger.error(f"Error getting search stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve search statistics") 