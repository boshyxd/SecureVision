from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, BigInteger, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MYSQL_URL = os.getenv("MYSQL_URL", "mysql+pymysql://root:password@localhost/securevision")
engine = create_engine(
    MYSQL_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class BreachEntry(Base):
    __tablename__ = "breach_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url = Column(String(2048), nullable=False, index=True)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    
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
    
    tags = Column(JSON)
    extra_metadata = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "username": self.username,
            "password": self.password,
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
                "isSecure": bool(self.is_secure)
            },
            "tags": self.tags or [],
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