from pydantic import BaseModel
from typing import Optional, Dict, Any

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

class BreachEntryCreate(BreachEntryBase):
    pass

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