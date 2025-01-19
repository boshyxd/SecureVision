import asyncio
import sys
from pathlib import Path
import logging

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from app.services.data_enrichment import DataEnrichmentService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_enrichment():
    # Test URLs from the actual sample data
    test_urls = [
        "https://panelist.cint.com",           # Regular website
        "https://login.live.com/ppsecure/post.srf",  # Microsoft login with MFA
        "https://www.connexus.com/login.aspx",  # .NET login page
        "https://app.clickup.com",             # Modern SaaS with security
        "https://biosd.kemdikbud.go.id",       # Government site
        "http://morrispay.in/CustomerLogin.aspx",  # Payment portal
        "https://www.webcheats.com.br",        # Gaming site
        "https://secure.confused.com",         # Secure portal
        "https://www.ecigmafia.com/login.php"  # PHP login page
    ]
    
    async with DataEnrichmentService() as service:
        for url in test_urls:
            logger.info(f"\n{'='*50}")
            logger.info(f"Testing URL: {url}")
            try:
                enriched = await service.enrich_entry(url)
                logger.info("\nBasic Information:")
                logger.info(f"Domain: {enriched.get('domain')}")
                logger.info(f"IP Address: {enriched.get('ip_address')}")
                logger.info(f"Port: {enriched.get('port')}")
                logger.info(f"Path: {enriched.get('path')}")
                
                logger.info("\nSecurity Features:")
                logger.info(f"Service Type: {enriched.get('service_type')}")
                logger.info(f"Has CAPTCHA: {enriched.get('has_captcha')}")
                logger.info(f"Has MFA: {enriched.get('has_mfa')}")
                logger.info(f"Is Secure: {enriched.get('is_secure')}")
                
                logger.info("\nAccessibility:")
                logger.info(f"Status Code: {enriched.get('status_code')}")
                logger.info(f"Page Title: {enriched.get('page_title')}")
                logger.info(f"Tags: {enriched.get('tags')}")
                
                # Check breach status
                breach_data = await service.analyze_url(url)
                if breach_data and 'extra_metadata' in breach_data:
                    breach_info = breach_data['extra_metadata'].get('breach_info')
                    if breach_info:
                        logger.info("\nBreach Information:")
                        logger.info(f"Total Breaches: {breach_info.get('total_breaches')}")
                        logger.info(f"Total Pwned: {breach_info.get('total_pwned')}")
                        logger.info(f"Latest Breach: {breach_info.get('latest_breach')}")
                        logger.info(f"Data Classes: {breach_info.get('data_classes')}")
                
                if enriched.get('extra_metadata'):
                    logger.info("\nAdditional Metadata:")
                    logger.info(f"DNS Resolution: {enriched['extra_metadata'].get('dns_resolution')}")
                    if 'shodan' in enriched['extra_metadata']:
                        shodan = enriched['extra_metadata']['shodan']
                        logger.info(f"Open Ports: {shodan.get('ports')}")
                        logger.info(f"Services: {shodan.get('services')}")
                
            except Exception as e:
                logger.error(f"Error enriching {url}: {str(e)}")
            
            await asyncio.sleep(1)  # Rate limiting

if __name__ == "__main__":
    asyncio.run(test_enrichment()) 