import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.database import BreachEntry, get_db, init_db, engine, Base
from app.services.data_enrichment import DataEnrichmentService
from app.api.v1.search import router, SearchFilters
from typing import Generator
import asyncio
from tests.test_data_ingestion import process_breach_line

TEST_DATA = """
https://admin.wordpress.example.com/wp-login.php:admin:pass123
https://vpn.company.com:443/citrix/:user1:pass456
https://internal.local/rdweb/:user2:pass789
https://login.service.com:8080/auth:user3:pass321
https://secure.app.com/mfa-login:user4:pass654
https://legacy.system.com:user5:pass987
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
def client(db: Session):
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router)
    
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture(scope="function")
async def populated_db(db: Session):
    """Populate database with test data"""
    service = DataEnrichmentService()
    
    for line in TEST_DATA.split("\n"):
        if line:
            await process_breach_line(line, db, service)
    
    return db

def test_search_by_domain(client, populated_db):
    """Test searching by domain"""
    response = client.get("/search?query=wordpress.example.com")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) > 0
    assert "wordpress" in data["entries"][0]["url"].lower()

def test_search_by_service_type(client, populated_db):
    """Test filtering by service type"""
    filters = SearchFilters(service_types=["wordpress"])
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) > 0
    for entry in data["entries"]:
        assert entry["metadata"]["service_type"] == "wordpress"

def test_search_by_port(client, populated_db):
    """Test filtering by port"""
    filters = SearchFilters(ports=[443])
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) > 0
    for entry in data["entries"]:
        assert entry["metadata"]["port"] == 443

def test_search_by_path(client, populated_db):
    """Test searching by URL path"""
    response = client.get("/search?query=/rdweb/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) > 0
    assert "/rdweb/" in data["entries"][0]["url"]

def test_exclude_local_ips(client, populated_db):
    """Test excluding local IPs"""
    filters = SearchFilters(exclude_local_ips=True)
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    for entry in data["entries"]:
        if entry["metadata"].get("ip_address"):
            assert not entry["metadata"]["ip_address"].startswith(("192.168", "127.0"))

def test_search_by_tags(client, populated_db):
    """Test filtering by tags"""
    filters = SearchFilters(tags=["active"])
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    for entry in data["entries"]:
        assert "active" in entry["tags"]

    filters = SearchFilters(exclude_tags=["unreachable"])
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    for entry in data["entries"]:
        assert "unreachable" not in entry["tags"]

def test_search_security_features(client, populated_db):
    """Test filtering by security features"""
    filters = SearchFilters(security_features=["MFA"])
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    for entry in data["entries"]:
        assert entry["metadata"]["hasMfa"]

def test_pagination(client, populated_db):
    """Test search pagination"""
    response = client.get("/search", params={"page": 1, "page_size": 2})
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) <= 2
    first_page_ids = {entry["id"] for entry in data["entries"]}

    response = client.get("/search", params={"page": 2, "page_size": 2})
    assert response.status_code == 200
    data = response.json()
    second_page_ids = {entry["id"] for entry in data["entries"]}

    assert not first_page_ids.intersection(second_page_ids)

def test_combined_filters(client, populated_db):
    """Test combining multiple search filters"""
    filters = SearchFilters(
        service_types=["citrix"],
        security_features=["HTTPS"],
        ports=[443],
        exclude_local_ips=True
    )
    response = client.get("/search", params={"filters": filters.dict()})
    assert response.status_code == 200
    data = response.json()
    
    for entry in data["entries"]:
        metadata = entry["metadata"]
        assert metadata["service_type"] == "citrix"
        assert metadata["isSecure"]
        assert metadata["port"] == 443
        if metadata.get("ip_address"):
            assert not metadata["ip_address"].startswith(("192.168", "127.0"))

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 