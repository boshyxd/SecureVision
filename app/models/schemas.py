from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class BreachEntryBase(BaseModel):
    url: str
    username: str
    password: str

class ParsedBreachEntry(BreachEntryBase):    
    hostname: str
    path: str
    port: int
    is_secure: bool
    line_number: int

class BreachEntryCreate(ParsedBreachEntry):
    domain: Optional[str]
    ip_address: Optional[str]
    page_title: Optional[str]
    
    service_type: Optional[str]
    
    has_captcha: Optional[int]
    has_mfa: Optional[int]
    is_secure: Optional[int]
    status_code: Optional[int]
    
    # Breach status fields
    had_breach: int
    breach_count: int
    total_pwned: int
    latest_breach: datetime | None
    data_classes: Dict[str, Any]
    breach_details: Dict[str, Any]
    
    tags: list[str]
    extra_metadata: Dict[str, Any]

class BreachEntry(BreachEntryBase):
    id: int
    risk_score: float
    breach_metadata: Dict[str, Any]

    class Config:
        from_attributes = True

class SearchFilters(BaseModel):
    domain: Optional[str] = None
    application: Optional[str] = None
    url_path: Optional[str] = None 