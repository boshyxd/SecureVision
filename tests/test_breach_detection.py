import pytest
import asyncio
from app.services.data_enrichment import DataEnrichmentService

def extract_base_domain(url: str) -> str:
    """Extract base domain from URL using the same logic as the service"""
    if '//' in url:
        domain = url.split('//')[-1]
    else:
        domain = url
    
    domain = domain.split('/')[0].lower()
    domain = domain.split('?')[0]
    domain = domain.split('#')[0]
    domain = domain.split('@')[-1]
    domain = domain.split(':')[0]
    domain = domain.strip('.')
    
    if domain.startswith('www.'):
        domain = domain[4:]
    
    domain_parts = domain.split('.')
    if len(domain_parts) > 2:
        domain = '.'.join(domain_parts[-2:])
    
    return domain

@pytest.fixture
async def enrichment_service():
    async with DataEnrichmentService() as service:
        yield service

@pytest.mark.asyncio
async def test_check_breach_status_with_known_breach():
    """Test breach detection with a known breached domain (Adobe)"""
    async with DataEnrichmentService() as service:
        # Test cases with expected breach
        test_urls = [
            "adobe.com",
            "https://www.adobe.com",
            "https://www.adobe.com/login",
            "http://adobe.com/products",
            "@adobe.com",
        ]
        
        print("\nTesting breach detection for Adobe domain:")
        for url in test_urls:
            print(f"\nTesting URL: {url}")
            breach_info = await service.analyze_url(url)
            print(f"Breach info: {breach_info.get('breach_info', {})}")
            
            assert breach_info.get('breach_info'), f"Expected breach info for {url}"
            assert breach_info['breach_info'].get('breaches'), f"Expected breaches for {url}"
            assert breach_info['breach_info']['total_pwned'] > 0, f"Expected pwned count > 0 for {url}"
            
            # Print detailed breach information
            for breach in breach_info['breach_info'].get('breaches', []):
                print(f"\nBreach details:")
                print(f"  Name: {breach.get('name')}")
                print(f"  Title: {breach.get('title')}")
                print(f"  Date: {breach.get('breach_date')}")
                print(f"  Pwned count: {breach.get('pwn_count')}")
                print(f"  Data classes: {', '.join(breach.get('data_classes', []))}")

@pytest.mark.asyncio
async def test_check_breach_status_url_cleaning():
    """Test URL cleaning with various formats"""
    async with DataEnrichmentService() as service:
        test_cases = [
            ("https://www.adobe.com/login", "adobe.com"),
            ("http://user:pass@adobe.com:8080/path?query#fragment", "adobe.com"),
            ("https://sub.adobe.com/products/", "adobe.com"),
            ("adobe.com", "adobe.com"),
            ("@adobe.com", "adobe.com"),
        ]
        
        print("\nTesting URL cleaning:")
        for input_url, expected_domain in test_cases:
            print(f"\nInput URL: {input_url}")
            extracted_domain = extract_base_domain(input_url)
            print(f"Extracted domain: {extracted_domain}")
            assert extracted_domain == expected_domain, f"Expected {expected_domain}, got {extracted_domain}"

@pytest.mark.asyncio
async def test_check_breach_status_no_breach():
    """Test breach detection with domains that shouldn't have breaches"""
    async with DataEnrichmentService() as service:
        test_urls = [
            "example.com",
            "test.local",
            "nonexistent.domain.com",
        ]
        
        print("\nTesting breach detection for non-breached domains:")
        for url in test_urls:
            print(f"\nTesting URL: {url}")
            breach_info = await service.analyze_url(url)
            print(f"Breach info: {breach_info.get('breach_info', {})}")
            
            assert not breach_info.get('breach_info', {}).get('breaches'), f"Expected no breaches for {url}"
            assert breach_info.get('breach_info', {}).get('total_pwned', 0) == 0, f"Expected pwned count = 0 for {url}" 