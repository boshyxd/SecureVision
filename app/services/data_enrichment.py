import aiohttp
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import socket
import whois
from datetime import datetime
import re
from typing import Dict, Any, List
import logging
from shodan import Shodan
import pyotp
import requests
from urllib.parse import urljoin
import os

logger = logging.getLogger(__name__)

class DataEnrichmentService:
    def __init__(self):
        self.session = None
        self.timeout = aiohttp.ClientTimeout(total=10)
        self.shodan_client = Shodan(os.getenv('SHODAN_API_KEY'))
        self.hibp_headers = {
            'user-agent': 'SecureVision-Enrichment'  # Still required by HIBP
        }
        self.virustotal_api_key = os.getenv('VIRUSTOTAL_API_KEY')

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def analyze_url(self, url: str) -> Dict[str, Any]:
        """Analyze a URL and gather metadata"""
        try:
            parsed_url = urlparse(url)
            metadata = {
                "domain": parsed_url.netloc,
                "path": parsed_url.path,
                "port": parsed_url.port or (443 if parsed_url.scheme == 'https' else 80),
                "is_secure": parsed_url.scheme == 'https',
                "status_code": None,
                "page_title": None,
                "service_type": None,
                "has_captcha": False,
                "has_mfa": False,
                "has_totp": False,
                "shodan_data": None,
                "security_headers": {},
                "tags": []
            }

            try:
                ip_address = socket.gethostbyname(parsed_url.netloc)
                metadata["ip_address"] = ip_address
                if self._is_local_ip(ip_address):
                    metadata["tags"].append("local-ip")
                
                try:
                    shodan_info = self.shodan_client.host(ip_address)
                    metadata["shodan_data"] = {
                        "ports": shodan_info.get('ports', []),
                        "vulns": shodan_info.get('vulns', []),
                        "tags": shodan_info.get('tags', []),
                        "hostnames": shodan_info.get('hostnames', [])
                    }
                    
                    if shodan_info.get('vulns'):
                        metadata["tags"].append("vulnerable")
                    
                    for banner in shodan_info.get('data', []):
                        if banner.get('product'):
                            metadata["service_type"] = banner.get('product').lower()
                            break
                except Exception as e:
                    logger.warning(f"Shodan lookup failed for {ip_address}: {str(e)}")

            except socket.gaierror:
                metadata["tags"].append("unresolved")
                return metadata

            try:
                async with self.session.get(url, allow_redirects=True, verify_ssl=False) as response:
                    metadata["status_code"] = response.status
                    metadata["security_headers"] = dict(response.headers)
                    
                    if response.status == 200:
                        metadata["tags"].append("active")
                        content = await response.text()
                        await self._analyze_content(content, metadata)
                        
                        if 'Strict-Transport-Security' in response.headers:
                            metadata["tags"].append("hsts-enabled")
                        if 'Content-Security-Policy' in response.headers:
                            metadata["tags"].append("csp-enabled")
            except Exception as e:
                logger.error(f"Error fetching URL {url}: {str(e)}")
                metadata["tags"].append("unreachable")

            if await self._is_parked_domain(parsed_url.netloc):
                metadata["tags"].append("parked")

            if await self._check_breach_status(parsed_url.netloc):
                metadata["tags"].append("breached")

            return metadata
        except Exception as e:
            logger.error(f"Error analyzing URL {url}: {str(e)}")
            return {
                "status_code": None,
                "tags": ["error"]
            }

    async def _analyze_content(self, content: str, metadata: Dict[str, Any]):
        """Analyze page content for various indicators"""
        soup = BeautifulSoup(content, 'html.parser')

        title_tag = soup.find('title')
        if title_tag:
            metadata["page_title"] = title_tag.text.strip()

        forms = soup.find_all('form')
        for form in forms:
            if self._is_login_form(form):
                metadata["tags"].append("login-form")
                
                if self._has_captcha(form, content):
                    metadata["has_captcha"] = True
                
                if self._has_mfa_indicators(form, content):
                    metadata["has_mfa"] = True
                
                service_type = self._identify_service_type(content, metadata["domain"], metadata["path"])
                if service_type:
                    metadata["service_type"] = service_type
                break

    def _is_login_form(self, form) -> bool:
        """Check if a form is likely a login form"""
        login_indicators = {
            'input': {'type': ['password', 'email', 'text']},
            'action': ['login', 'signin', 'auth'],
            'class': ['login', 'signin'],
            'id': ['login', 'signin']
        }

        has_password = bool(form.find('input', {'type': 'password'}))
        if not has_password:
            return False

        for input_tag in form.find_all('input'):
            if input_tag.get('type') in login_indicators['input']['type']:
                return True

        form_action = form.get('action', '').lower()
        form_class = ' '.join(form.get('class', [])).lower()
        form_id = form.get('id', '').lower()

        return any(
            indicator in form_action or 
            indicator in form_class or 
            indicator in form_id 
            for indicator in login_indicators['action']
        )

    def _has_captcha(self, form, content: str) -> bool:
        """Check for CAPTCHA indicators"""
        captcha_indicators = [
            'captcha',
            'recaptcha',
            'g-recaptcha',
            'h-captcha',
            'cf-turnstile'
        ]
        
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in captcha_indicators)

    def _has_mfa_indicators(self, form, content: str) -> bool:
        """Check for MFA/2FA indicators including TOTP"""
        mfa_indicators = [
            'two-factor',
            'two factor',
            '2-factor',
            '2 factor',
            'mfa',
            '2fa',
            'authenticator',
            'verification code',
            'totp',
            'time-based',
            'google authenticator',
            'microsoft authenticator',
            'authy',
            'one-time code',
            'authentication app'
        ]
        
        totp_patterns = [
            r'otpauth://totp/',
            r'data-totp',
            r'totp-secret',
            r'secretkey=[A-Z2-7]+'
        ]
        
        content_lower = content.lower()
        has_mfa = any(indicator in content_lower for indicator in mfa_indicators)
        has_totp = any(re.search(pattern, content, re.IGNORECASE) for pattern in totp_patterns)
        
        if has_totp:
            self.metadata["has_totp"] = True
            
        return has_mfa or has_totp

    def _identify_service_type(self, content: str, domain: str, path: str) -> str:
        """Identify the web application type"""
        service_patterns = {
            'wordpress': [r'wp-login', r'wp-admin', r'wordpress'],
            'citrix': [r'citrix', r'netscaler'],
            'cisco': [r'cisco', r'webvpn'],
            'coremail': [r'coremail'],
            'rdweb': [r'rdweb', r'remote.aspx'],
        }

        url_check = f"{domain}{path}".lower()
        content_lower = content.lower()

        for service, patterns in service_patterns.items():
            if any(re.search(pattern, url_check) for pattern in patterns) or \
               any(pattern in content_lower for pattern in patterns):
                return service

        if re.search(r'admin|administrator', url_check):
            return 'admin-portal'

        return 'standard-login'

    def _is_local_ip(self, ip: str) -> bool:
        """Check if IP is in local/private ranges"""
        local_patterns = [
            r'^127\.',
            r'^10\.',
            r'^172\.(1[6-9]|2[0-9]|3[0-1])\.',
            r'^192\.168\.',
            r'^169\.254\.',
            r'^fc00:',
            r'^fe80:',
        ]
        return any(re.match(pattern, ip) for pattern in local_patterns)

    async def _is_parked_domain(self, domain: str) -> bool:
        """Check if domain is parked"""
        try:
            domain_info = whois.whois(domain)
            if not domain_info.domain_name:
                return True

            parking_services = [
                'parked.com',
                'sedoparking.com',
                'parkingcrew.net',
                'hugedomains.com',
                'godaddy.com'
            ]
            
            nameservers = domain_info.name_servers
            if nameservers:
                nameservers = [ns.lower() for ns in nameservers if ns]
                return any(parking in ' '.join(nameservers) for parking in parking_services)
            
            return False
        except Exception:
            return False

    async def _check_breach_status(self, domain: str) -> bool:
        """Check if domain has been involved in known breaches using HIBP public domain breach endpoint"""
        if not domain:
            return False
            
        try:
            # Rate limiting: Sleep briefly between requests as per HIBP requirements
            await asyncio.sleep(1.6)  # HIBP rate limit is ~1.5s between requests
            
            async with self.session.get(
                f'https://haveibeenpwned.com/api/v3/breaches',
                headers=self.hibp_headers
            ) as response:
                if response.status == 200:
                    breaches = await response.json()
                    # Filter breaches for the specific domain
                    domain_breaches = [
                        breach for breach in breaches 
                        if breach.get('Domain', '').lower() == domain.lower()
                    ]
                    return len(domain_breaches) > 0
                elif response.status == 429:
                    # Rate limited - wait and retry once
                    await asyncio.sleep(2)
                    async with self.session.get(
                        f'https://haveibeenpwned.com/api/v3/breaches',
                        headers=self.hibp_headers
                    ) as retry_response:
                        if retry_response.status == 200:
                            breaches = await retry_response.json()
                            domain_breaches = [
                                breach for breach in breaches 
                                if breach.get('Domain', '').lower() == domain.lower()
                            ]
                            return len(domain_breaches) > 0
                
            return False
        except Exception as e:
            logger.error(f"Error checking breach status for {domain}: {str(e)}")
            return False 