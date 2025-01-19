from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, BigInteger, Text, Enum, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
import json

load_dotenv()

logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment or construct it from components"""
    url = os.getenv("MYSQL_URL")
    if url:
        return url
    
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    host = os.getenv("MYSQL_HOST", "localhost")
    db = os.getenv("MYSQL_DB", "securevision")
    
    return f"mysql+pymysql://{user}:{password}@{host}/{db}"

MYSQL_URL = get_database_url()
engine = create_engine(
    MYSQL_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    echo=os.getenv("DEBUG", "false").lower() == "true"
)

try:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")
    raise

class BreachEntry(Base):
    __tablename__ = "breach_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url = Column(String(2048), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    
    # Risk assessment fields
    risk_score = Column(Float, default=0.5)
    pattern_type = Column(String(50), default='unknown')
    
    domain = Column(String(255), index=True)
    ip_address = Column(String(45), index=True)
    port = Column(Integer)
    path = Column(String(1024))
    page_title = Column(Text)
    
    service_type = Column(String(50), index=True)
    
    has_captcha = Column(Integer, default=0)
    has_mfa = Column(Integer, default=0)
    is_secure = Column(Integer, default=0)
    status_code = Column(Integer)
    
    # Breach status fields
    had_breach = Column(Integer, default=0)
    breach_count = Column(Integer, default=0)
    total_pwned = Column(BigInteger, default=0)
    latest_breach = Column(DateTime)
    data_classes = Column(JSON)
    breach_details = Column(JSON)
    
    tags = Column(JSON)
    extra_metadata = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_breach_entries_url', 'url', mysql_length=767),
    )

    def to_dict(self):
        # Handle JSON fields that might be strings
        try:
            data_classes = self.data_classes if isinstance(self.data_classes, list) else (
                json.loads(self.data_classes) if self.data_classes else []
            )
        except:
            data_classes = []

        try:
            breach_details = self.breach_details if isinstance(self.breach_details, list) else (
                json.loads(self.breach_details) if self.breach_details else []
            )
        except:
            breach_details = []

        try:
            tags = self.tags if isinstance(self.tags, list) else (
                json.loads(self.tags) if self.tags else []
            )
        except:
            tags = []

        return {
            "id": self.id,
            "url": self.url,
            "username": self.username,
            "password": self.password,
            "risk_score": float(self.risk_score) if self.risk_score is not None else 0.5,
            "pattern_type": self.pattern_type or 'unknown',
            "metadata": {
                "domain": self.domain,
                "ip_address": self.ip_address,
                "port": self.port,
                "path": self.path,
                "page_title": self.page_title,
                "service_type": self.service_type,
                "status": self.status_code,
                "hasCaptcha": bool(self.has_captcha),
                "hasMfa": bool(self.has_mfa),
                "isSecure": bool(self.is_secure),
                "breach_info": {
                    "is_breached": bool(self.had_breach),
                    "total_breaches": self.breach_count or 0,
                    "total_pwned": self.total_pwned or 0,
                    "latest_breach": self.latest_breach.isoformat() if self.latest_breach else None,
                    "data_classes": data_classes,
                    "breaches": breach_details
                },
                "tags": tags
            },
            "last_analyzed": self.last_checked.isoformat() if self.last_checked else None,
            "extra_metadata": self.extra_metadata or {}
        }

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 