from sqlalchemy import Column, Integer, String, Float, JSON, TIMESTAMP, BigInteger, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.core.config import settings

Base = declarative_base()

class BreachEntry(Base):
    __tablename__ = "breach_entries"

    id = Column(BigInteger, primary_key=True, index=True)
    url = Column(String(2048), index=True)
    username = Column(String(255))
    password = Column(String(255))
    risk_score = Column(Float, default=0.0)
    metadata = Column(JSON)

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 