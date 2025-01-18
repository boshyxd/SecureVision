import sys
from pathlib import Path
import logging
from sqlalchemy import func

project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from app.models.database import get_db, BreachEntry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Check ingested data"""
    db = next(get_db())
    try:
        total_count = db.query(func.count(BreachEntry.id)).scalar()
        logger.info(f"Total entries: {total_count}")
        
        service_counts = db.query(
            BreachEntry.service_type,
            func.count(BreachEntry.id)
        ).group_by(BreachEntry.service_type).all()
        
        logger.info("\nService type distribution:")
        for service_type, count in service_counts:
            logger.info(f"- {service_type or 'Unknown'}: {count}")
            
        captcha_count = db.query(func.count(BreachEntry.id)).filter(BreachEntry.has_captcha == 1).scalar()
        mfa_count = db.query(func.count(BreachEntry.id)).filter(BreachEntry.has_mfa == 1).scalar()
        secure_count = db.query(func.count(BreachEntry.id)).filter(BreachEntry.is_secure == 1).scalar()
        
        logger.info("\nSecurity features:")
        logger.info(f"- Has CAPTCHA: {captcha_count}")
        logger.info(f"- Has MFA: {mfa_count}")
        logger.info(f"- Is Secure (HTTPS): {secure_count}")
        
        logger.info("\nSample entries:")
        sample_entries = db.query(BreachEntry).limit(3).all()
        for entry in sample_entries:
            logger.info(f"\nURL: {entry.url}")
            logger.info(f"Domain: {entry.domain}")
            logger.info(f"Service Type: {entry.service_type}")
            logger.info(f"Tags: {entry.tags}")
            logger.info(f"Status Code: {entry.status_code}")
            
    finally:
        db.close()

if __name__ == "__main__":
    main() 