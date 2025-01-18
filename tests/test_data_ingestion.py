import pytest
import asyncio
from sqlalchemy.orm import Session
from app.models.database import BreachEntry, get_db, init_db, engine, Base
from app.services.data_enrichment import DataEnrichmentService
from typing import List, Generator

SAMPLE_DATA = """
https://panelist.cint.com:user1:pass123
https://login.live.com/ppsecure/post.srf:user2:pass456
https://m.facebook.com:user3:pass789
https://www.webcheats.com.br:user4:pass321
https://login.proboards.com:user5:pass654
https://users.nexusmods.com/auth/sign_up:user6:pass987
https://www.ecigmafia.com/login.php:user7:pass147
https://discord.com:user8:pass258
https://app.clickup.com:user9:pass369
https://club.pokemon.com:user10:pass741
""".strip()

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def enrichment_service() -> Generator[DataEnrichmentService, None, None]:
    service = DataEnrichmentService()
    yield service

async def process_breach_line(line: str, db: Session, enrichment_service: DataEnrichmentService) -> BreachEntry:
    """Process a single line of breach data"""
    url, username, password = line.strip().split(":")
    
    async with enrichment_service as service:
        metadata = await service.analyze_url(url)
    
    entry = BreachEntry(
        url=url,
        username=username,
        password=password,
        domain=metadata.get("domain"),
        ip_address=metadata.get("ip_address"),
        port=metadata.get("port"),
        path=metadata.get("path"),
        page_title=metadata.get("page_title"),
        service_type=metadata.get("service_type"),
        has_captcha=1 if metadata.get("has_captcha") else 0,
        has_mfa=1 if metadata.get("has_mfa") else 0,
        is_secure=1 if metadata.get("is_secure") else 0,
        status_code=metadata.get("status_code"),
        tags=metadata.get("tags", [])
    )
    
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@pytest.mark.asyncio
async def test_data_ingestion(db: Session, enrichment_service: DataEnrichmentService):
    """Test basic data ingestion and enrichment"""
    line = SAMPLE_DATA.split("\n")[0]
    entry = await process_breach_line(line, db, enrichment_service)
    
    assert entry.url == "https://panelist.cint.com"
    assert entry.username == "user1"
    assert entry.password == "pass123"
    
    assert entry.domain == "panelist.cint.com"
    assert entry.port == 443
    assert entry.is_secure == 1
    assert isinstance(entry.tags, list)

@pytest.mark.asyncio
async def test_bulk_ingestion(db: Session, enrichment_service: DataEnrichmentService):
    """Test bulk data ingestion"""
    tasks = []
    for line in SAMPLE_DATA.split("\n"):
        if line:
            tasks.append(process_breach_line(line, db, enrichment_service))
    
    entries = await asyncio.gather(*tasks)
    
    assert len(entries) == 10
    
    domains = {entry.domain for entry in entries}
    assert "m.facebook.com" in domains
    assert "discord.com" in domains
    
    service_types = {entry.service_type for entry in entries if entry.service_type}
    assert len(service_types) > 0

@pytest.mark.asyncio
async def test_security_features(db: Session, enrichment_service: DataEnrichmentService):
    """Test security feature detection"""
    entries = []
    for line in SAMPLE_DATA.split("\n"):
        if line:
            entry = await process_breach_line(line, db, enrichment_service)
            entries.append(entry)
    
    secure_count = sum(1 for e in entries if e.is_secure == 1)
    assert secure_count > 0
    
    all_tags = set()
    for entry in entries:
        if entry.tags:
            all_tags.update(entry.tags)
    
    expected_tags = {"active", "login-form", "unreachable"}
    assert all_tags.intersection(expected_tags)

@pytest.mark.asyncio
async def test_error_handling(db: Session, enrichment_service: DataEnrichmentService):
    """Test handling of invalid data"""
    invalid_line = "not-a-url:user:pass"
    entry = await process_breach_line(invalid_line, db, enrichment_service)
    assert "error" in entry.tags
    
    invalid_line = "https://definitely.not.exists.example.com:user:pass"
    entry = await process_breach_line(invalid_line, db, enrichment_service)
    assert "unresolved" in entry.tags

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
        assert "local-ip" in entry.tags

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 