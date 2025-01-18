import pytest
from sqlalchemy.orm import Session
from app.services.data_enrichment import DataEnrichmentService
from app.services.data_ingestion import process_breach_line
import asyncio

# Sample test data with proper format
SAMPLE_DATA = """https://panelist.cint.com:user1:pass123
https://login.live.com/ppsecure/post.srf:admin:password123
https://m.facebook.com:test@example.com:testpass
http://127.0.0.1:8080:localuser:localpass
http://192.168.1.1:admin:admin123
https://wordpress.example.com/wp-login.php:wpuser:wppass"""

@pytest.fixture
def enrichment_service():
    return DataEnrichmentService()

@pytest.mark.asyncio
async def test_data_ingestion(db: Session, enrichment_service: DataEnrichmentService):
    """Test basic data ingestion and enrichment"""
    line = SAMPLE_DATA.split("\n")[0]
    entry = await process_breach_line(line, db, enrichment_service)
    
    assert entry is not None
    assert entry.url == "https://panelist.cint.com"
    assert entry.username == "user1"
    assert entry.password == "pass123"
    assert entry.domain == "panelist.cint.com"
    assert entry.is_secure == 1

@pytest.mark.asyncio
async def test_bulk_ingestion(db: Session, enrichment_service: DataEnrichmentService):
    """Test bulk data ingestion"""
    tasks = []
    for line in SAMPLE_DATA.split("\n"):
        if line:
            tasks.append(process_breach_line(line, db, enrichment_service))
    
    entries = await asyncio.gather(*tasks)
    valid_entries = [e for e in entries if e is not None]
    
    assert len(valid_entries) > 0
    assert all(e.url and e.username and e.password for e in valid_entries)

@pytest.mark.asyncio
async def test_security_features(db: Session, enrichment_service: DataEnrichmentService):
    """Test security feature detection"""
    # Test WordPress login detection
    wp_line = "https://wordpress.example.com/wp-login.php:wpuser:wppass"
    entry = await process_breach_line(wp_line, db, enrichment_service)
    
    assert entry is not None
    assert "service-wordpress" in entry.tags
    
    # Test HTTPS detection
    secure_line = "https://secure.example.com:user:pass"
    entry = await process_breach_line(secure_line, db, enrichment_service)
    
    assert entry is not None
    assert entry.is_secure == 1
    assert "https" in entry.tags

@pytest.mark.asyncio
async def test_error_handling(db: Session, enrichment_service: DataEnrichmentService):
    """Test handling of invalid data"""
    invalid_line = "not-a-url:user:pass"
    entry = await process_breach_line(invalid_line, db, enrichment_service)
    assert entry is None
    
    empty_line = "::"
    entry = await process_breach_line(empty_line, db, enrichment_service)
    assert entry is None

@pytest.mark.asyncio
async def test_local_ip_detection(db: Session, enrichment_service: DataEnrichmentService):
    """Test detection of local IP addresses"""
    local_urls = [
        "http://127.0.0.1:8080:user:pass",
        "http://localhost:user:pass",
        "http://192.168.1.1:user:pass"
    ]
    
    for line in local_urls:
        entry = await process_breach_line(line, db, enrichment_service)
        assert entry is not None
        assert "local-ip" in entry.tags

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 