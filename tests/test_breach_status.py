import pytest
from app.services.data_enrichment import DataEnrichmentService

TEST_DOMAINS = [
    "adobe.com",
    "linkedin.com",
    "facebook.com",
    "example.com"
]

@pytest.fixture
def service():
    """Create DataEnrichmentService instance"""
    return DataEnrichmentService()

@pytest.mark.asyncio
async def test_breach_status_check(service):
    """Test breach status checking with known breached domains"""
    async with service:
        for domain in TEST_DOMAINS[:3]:
            is_breached = await service._check_breach_status(domain)
            assert is_breached, f"Expected {domain} to be marked as breached"
        
        is_breached = await service._check_breach_status(TEST_DOMAINS[3])
        assert not is_breached, f"Expected {TEST_DOMAINS[3]} to not be marked as breached"

@pytest.mark.asyncio
async def test_breach_status_integration(service):
    """Test breach status integration with URL analysis"""
    test_urls = [
        f"https://{domain}/login" for domain in TEST_DOMAINS
    ]
    
    async with service:
        for url in test_urls:
            metadata = await service.analyze_url(url)
            if any(domain in url for domain in TEST_DOMAINS[:3]):
                assert "breached" in metadata["tags"], f"Expected {url} to be tagged as breached"
            else:
                assert "breached" not in metadata["tags"], f"Expected {url} to not be tagged as breached"

@pytest.mark.asyncio
async def test_hibp_rate_limits(service):
    """Test handling of HIBP rate limits"""
    async with service:
        results = []
        for _ in range(5):
            is_breached = await service._check_breach_status("adobe.com")
            results.append(is_breached)
        
        assert any(results), "Expected at least some requests to succeed"

@pytest.mark.asyncio
async def test_breach_status_error_handling(service):
    """Test breach status checking error handling"""
    async with service:
        is_breached = await service._check_breach_status("not-a-real-domain-12345.com")
        assert not is_breached, "Expected invalid domain to return False"
        
        is_breached = await service._check_breach_status("")
        assert not is_breached, "Expected empty domain to return False"
        
        is_breached = await service._check_breach_status("http://invalid")
        assert not is_breached, "Expected malformed domain to return False"

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 