import os
import aiohttp
import logging
from urllib.parse import urlparse
import socket
import dns.resolver
import dns.exception
from typing import Dict, Any, List, Optional
from datetime import datetime
import shodan
import re
import asyncio
import time
import random

logger = logging.getLogger(__name__)

class DataEnrichmentService:
    def __init__(self):
        self.shodan_api_key = os.getenv('SHODAN_API_KEY')
        self.shodan_api = shodan.Shodan(self.shodan_api_key) if self.shodan_api_key else None
        self.session = aiohttp.ClientSession()
        self.breach_cache = {}
        self.last_breach_check = {}
        self.breachdirectory_api_key = os.getenv('BREACHDIRECTORY_API_KEY')
        self.last_api_call = 0
        self.rate_limit_delay = 1.1
        if not self.breachdirectory_api_key:
            logger.error("BreachDirectory API key not found in environment variables")

    async def __aenter__(self):
        if not self.session or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session and not self.session.closed:
            await self.session.close()

    async def enrich_entry(self, url: str, websocket_manager=None, entry_id: str = None) -> Dict[str, Any]:
        """Enrich a breach entry with additional data and send real-time updates"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.split(':')[0]
            path = parsed.path or '/'
            port = parsed.port or (443 if parsed.scheme == 'https' else 80)
            is_secure = parsed.scheme == 'https'
            
            # Initialize metadata
            metadata = {
                'domain': domain,
                'ip_address': None,
                'port': port,
                'path': path,
                'page_title': None,
                'service_type': None,
                'hasCaptcha': False,
                'hasMfa': False,
                'isSecure': is_secure,
                'status': None,
                'tags': []
            }
            
            # Add protocol tag
            metadata['tags'].append('https' if is_secure else 'http')
            
            # Get breach information
            breach_info = await self._check_breach_status(domain)
            
            # Structure breach information for database
            metadata['breach_info'] = {
                'is_breached': bool(breach_info.get('breaches')),
                'total_breaches': len(breach_info.get('breaches', [])),
                'total_pwned': breach_info.get('total_pwned', 0),
                'latest_breach': breach_info.get('latest_breach'),
                'data_classes': breach_info.get('data_classes', []),
                'breaches': breach_info.get('breaches', [])
            }
            
            # Add breach-related tags
            if breach_info and breach_info.get('tags'):
                metadata['tags'].extend(breach_info['tags'])
            
            # Send initial update with structured metadata
            if websocket_manager and entry_id:
                await websocket_manager.broadcast_update({
                    'id': entry_id,
                    'url': url,
                    'metadata': metadata,
                    'risk_score': 0.5,
                    'pattern_type': 'unknown',
                    'last_analyzed': datetime.utcnow().isoformat()
                })
            
            # Handle local IP
            if self._is_local_ip(domain):
                metadata['tags'].append('local-ip')
                return metadata

            # Check service type
            service_type = self._detect_service_type(url, path)
            if service_type:
                metadata['service_type'] = service_type
                metadata['tags'].append(f'service-{service_type}')
                if websocket_manager and entry_id:
                    await websocket_manager.broadcast_update({
                        'id': entry_id,
                        'url': url,
                        'metadata': metadata,
                        'risk_score': 0.5,
                        'pattern_type': 'unknown',
                        'last_analyzed': datetime.utcnow().isoformat()
                    })

            # Resolve domain
            try:
                ip_data = await self._resolve_domain(domain)
                if ip_data:
                    metadata['ip_address'] = ip_data.get('ip_address')
                    if ip_data.get('tags'):
                        metadata['tags'].extend(ip_data['tags'])
                    if websocket_manager and entry_id:
                        await websocket_manager.broadcast_update({
                            'id': entry_id,
                            'url': url,
                            'metadata': metadata,
                            'risk_score': 0.5,
                            'pattern_type': 'unknown',
                            'last_analyzed': datetime.utcnow().isoformat()
                        })
            except Exception as e:
                logger.error(f"Error resolving domain {domain}: {str(e)}")

            # Check URL accessibility
            try:
                url_data = await self._check_url_accessibility(url)
                if url_data:
                    metadata.update({
                        'status': url_data.get('status_code'),
                        'page_title': url_data.get('page_title'),
                        'hasCaptcha': bool(url_data.get('has_captcha')),
                        'hasMfa': bool(url_data.get('has_mfa'))
                    })
                    if url_data.get('tags'):
                        metadata['tags'].extend(url_data['tags'])
                    if websocket_manager and entry_id:
                        await websocket_manager.broadcast_update({
                            'id': entry_id,
                            'url': url,
                            'metadata': metadata,
                            'risk_score': 0.5,
                            'pattern_type': 'unknown',
                            'last_analyzed': datetime.utcnow().isoformat()
                        })
            except Exception as e:
                logger.error(f"Error checking URL accessibility: {str(e)}")

            # Deduplicate tags
            metadata['tags'] = list(set(metadata['tags']))
            
            # Final update with all information
            if websocket_manager and entry_id:
                await websocket_manager.broadcast_update({
                    'id': entry_id,
                    'url': url,
                    'metadata': metadata,
                    'risk_score': 0.5,
                    'pattern_type': 'unknown',
                    'last_analyzed': datetime.utcnow().isoformat()
                })
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error enriching entry for URL {url}: {str(e)}")
            return {
                'domain': domain,
                'ip_address': None,
                'port': port,
                'path': path,
                'page_title': None,
                'service_type': None,
                'hasCaptcha': False,
                'hasMfa': False,
                'isSecure': is_secure,
                'status': None,
                'tags': [],
                'breach_info': {
                    'is_breached': False,
                    'total_breaches': 0,
                    'total_pwned': 0,
                    'latest_breach': None,
                    'data_classes': [],
                    'breaches': []
                }
            }

    async def _resolve_domain(self, domain: str) -> Dict[str, Any]:
        """Resolve domain to IP address"""
        try:
            answers = dns.resolver.resolve(domain, 'A')
            ip = str(answers[0])
            
            if self._is_non_routable_ip(ip):
                return {
                    "ip_address": ip,
                    "tags": ["local-ip"],
                    "extra_metadata": {"dns_resolution": "non-routable"}
                }
                
            return {
                "ip_address": ip,
                "tags": [],
                "extra_metadata": {"dns_resolution": "resolved"}
            }
            
        except dns.exception.DNSException:
            return {
                "ip_address": None,
                "tags": ["unresolved"],
                "extra_metadata": {"dns_resolution": "failed"}
            }
        except Exception as e:
            logger.error(f"Error resolving domain {domain}: {str(e)}")
            return {}

    async def _get_shodan_data(self, ip: str) -> Dict[str, Any]:
        """Get Shodan data for an IP address"""
        try:
            if not self.shodan_api:
                return {}
                
            host = self.shodan_api.host(ip)
            
            shodan_data = {
                "ports": host.get("ports", []),
                "hostnames": host.get("hostnames", []),
                "os": host.get("os", ""),
                "modules": [],
                "tags": host.get("tags", []),
                "last_update": host.get("last_update", ""),
                "services": []
            }
            
            for item in host.get("data", []):
                module = item.get("_shodan", {}).get("module")
                if module:
                    shodan_data["modules"].append(module)
                
                service_info = {
                    "port": item.get("port"),
                    "protocol": item.get("transport", ""),
                    "service": item.get("product", ""),
                    "version": item.get("version", ""),
                }
                shodan_data["services"].append(service_info)
            
            return shodan_data
            
        except shodan.APIError as e:
            logger.error(f"Shodan API error for IP {ip}: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Error getting Shodan data for IP {ip}: {str(e)}")
            return {}

    async def _check_url_accessibility(self, url: str) -> Dict[str, Any]:
        """Check if URL is accessible and get page title"""
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with self.session.get(url, timeout=timeout, allow_redirects=True, verify_ssl=False) as response:
                status = response.status
                
                result = {
                    "status_code": status,
                    "tags": []
                }
                
                if status == 200:
                    result["tags"].append("active")
                    try:
                        text = await response.text()
                        title = self._extract_title(text)
                        if title:
                            result["page_title"] = title
                            
                        if self._has_login_form(text):
                            result["tags"].append("login-form")
                            
                            if self._has_captcha(text):
                                result["has_captcha"] = 1
                            if self._has_mfa(text):
                                result["has_mfa"] = 1
                                
                            service_type = self._detect_service_type_from_content(text, url)
                            if service_type:
                                result["service_type"] = service_type
                    except Exception as e:
                        logger.error(f"Error processing response content for {url}: {str(e)}")
                            
                elif status == 404:
                    result["tags"].append("not-found")
                elif status >= 500:
                    result["tags"].append("server-error")
                    
                return result
                
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            logger.warning(f"Connection error for {url}: {str(e)}")
            return {
                "status_code": None,
                "tags": ["unreachable"],
                "extra_metadata": {"error": str(e)}
            }
        except Exception as e:
            logger.error(f"Error checking URL accessibility for {url}: {str(e)}")
            return {
                "status_code": None,
                "tags": ["error"],
                "extra_metadata": {"error": str(e)}
            }

    def _is_non_routable_ip(self, ip: str) -> bool:
        """Check if IP is non-routable"""
        non_routable = [
            "127.",
            "10.",
            "172.16.",
            "192.168.",
            "169.254.",
            "0.",
            "::1",
            "fc00:",
            "fe80:"
        ]
        return any(ip.startswith(prefix) for prefix in non_routable)

    def _extract_title(self, html: str) -> Optional[str]:
        """Extract page title from HTML"""
        try:
            import re
            title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            if title_match:
                return title_match.group(1).strip()
        except Exception:
            pass
        return None

    def _has_login_form(self, html: str) -> bool:
        """Check if page has a login form"""
        login_indicators = [
            'type="password"',
            'name="password"',
            'name="login"',
            'name="username"',
            'name="user"',
            'class="login"',
            'id="login"'
        ]
        return any(indicator in html.lower() for indicator in login_indicators)

    def _has_captcha(self, html: str) -> bool:
        """Check if page has CAPTCHA"""
        captcha_indicators = [
            'recaptcha',
            'captcha',
            'hcaptcha',
            'g-recaptcha',
            'turnstile'
        ]
        return any(indicator in html.lower() for indicator in captcha_indicators)

    def _has_mfa(self, html: str) -> bool:
        """Check if page has MFA/2FA indicators"""
        mfa_indicators = [
            'two-factor',
            'two factor',
            '2fa',
            'mfa',
            'authenticator',
            'verification code',
            'security key',
            'one-time code',
            'one time password'
        ]
        return any(indicator in html.lower() for indicator in mfa_indicators)

    def _detect_service_type(self, url: str, path: str) -> Optional[str]:
        """Detect the service type based on URL and path patterns."""
        service_patterns = {
            'wordpress': r'/wp-(login|admin|content)',
            'citrix': r'/citrix/|/Citrix/',
            'rdweb': r'/rdweb/',
            'coremail': r'/coremail/',
            'cisco': r'/cisco/'
        }
        
        for service, pattern in service_patterns.items():
            if re.search(pattern, path):
                return service
        return None

    def _detect_service_type_from_content(self, html: str, url: str) -> Optional[str]:
        """Detect service type from page content"""
        service_patterns = {
            'wordpress': ['wp-login', 'wordpress'],
            'citrix': ['citrix', 'netscaler', 'xenapp'],
            'rdweb': ['rd web access', 'remote desktop'],
            'coremail': ['coremail'],
            'cisco': ['cisco', 'webvpn'],
            'office365': ['office 365', 'microsoft online'],
            'cpanel': ['cpanel'],
            'plesk': ['plesk'],
            'jira': ['jira'],
            'confluence': ['confluence']
        }
        
        html_lower = html.lower()
        url_lower = url.lower()
        
        for service, patterns in service_patterns.items():
            if any(pattern in html_lower or pattern in url_lower for pattern in patterns):
                return service
                
        return None

    def _process_tags(self, data: Dict[str, Any]) -> List[str]:
        """Process and combine all tags"""
        tags = set(data.get("tags", []))
        
        if data.get("service_type"):
            tags.add(f"service-{data['service_type']}")
            
        if data.get("has_captcha"):
            tags.add("has-captcha")
        if data.get("has_mfa"):
            tags.add("has-mfa")
        if data.get("is_secure"):
            tags.add("https")
        else:
            tags.add("http")
            
        if data.get("status_code") == 200:
            tags.add("active")
        elif data.get("status_code") == 404:
            tags.add("not-found")
        elif data.get("status_code") and data.get("status_code") >= 500:
            tags.add("server-error")
            
        return list(tags) 

    def _is_local_ip(self, ip_or_domain: str) -> bool:
        """Check if an IP or domain is local/private."""
        if not ip_or_domain:
            return False
        
        local_patterns = [
            r'^127\.',
            r'^10\.',
            r'^172\.(1[6-9]|2[0-9]|3[0-1])\.',
            r'^192\.168\.',
            r'^localhost$',
            r'^::1$'
        ]
        
        return any(re.match(pattern, ip_or_domain) for pattern in local_patterns) 

    async def analyze_url(self, url: str) -> Dict[str, Any]:
        """Analyze URL and check breach status - this is the main entry point for URL analysis"""
        try:
            if not url:
                return {'breach_info': {}}

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

            breach_info = await self._check_breach_status(domain)
            
            tags = []
            
            if breach_info.get('tags'):
                tags.extend(breach_info['tags'])

            if url.startswith('https://'):
                tags.append('https')
            else:
                tags.append('http')

            return {
                'domain': domain,
                'ip_address': None,
                'port': None,
                'path': None,
                'page_title': None,
                'service_type': None,
                'has_captcha': 0,
                'has_mfa': 0,
                'is_secure': 1 if url.startswith('https://') else 0,
                'status_code': None,
                'tags': tags,
                'breach_info': breach_info,
                'extra_metadata': {
                    'breach_details': breach_info,
                    'breach_summary': {
                        'total_breaches': len(breach_info.get('breaches', [])),
                        'total_pwned': breach_info.get('total_pwned', 0),
                        'latest_breach': breach_info.get('latest_breach'),
                        'data_classes': breach_info.get('data_classes', [])
                    }
                }
            }
        except Exception as e:
            logger.error(f"Error analyzing URL {url}: {str(e)}")
            return {'breach_info': {}}

    async def _wait_for_rate_limit(self):
        """Ensure we don't exceed API rate limits"""
        now = time.time()
        time_since_last_call = now - self.last_api_call
        if time_since_last_call < self.rate_limit_delay:
            delay = self.rate_limit_delay - time_since_last_call
            await asyncio.sleep(delay)
        self.last_api_call = time.time()

    async def _check_breach_status(self, domain: str) -> Dict[str, Any]:
        """Check if a domain has been breached using HIBP public breach data"""
        try:
            if not domain or not isinstance(domain, str):
                return {}

            if '//' in domain:
                domain = domain.split('//')[-1]
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
                domains_to_check = [
                    domain,
                    '.'.join(domain_parts[-2:]),
                ]
            else:
                domains_to_check = [domain]
            
            logger.info(f"Checking breach status for domains: {domains_to_check}")
            
            if not any(re.match(r'^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$', d) for d in domains_to_check):
                logger.warning(f"Invalid domain format: {domain}")
                return {}

            now = datetime.utcnow()
            for d in domains_to_check:
                if d in self.breach_cache:
                    cache_time = self.last_breach_check.get(d)
                    if cache_time and (now - cache_time).total_seconds() < 3600:
                        logger.info(f"Using cached breach info for {d}")
                        return self.breach_cache[d]

            if len(self.last_breach_check) > 100:
                self._cleanup_cache(now)

            breach_info = {
                'breaches': [],
                'total_pwned': 0,
                'latest_breach': None,
                'data_classes': [],
                'tags': []
            }

            logger.info(f"Making HIBP API request for domains: {domains_to_check}")
            async with self.session.get(
                f"https://haveibeenpwned.com/api/v2/breaches",
                headers={
                    'User-Agent': 'SecureVision-Enrichment',
                    'Accept': 'application/json'
                }
            ) as response:
                if response.status == 200:
                    try:
                        all_breaches = await response.json()
                        logger.info(f"Got {len(all_breaches)} total breaches from HIBP")
                        
                        domain_breaches = []
                        for d in domains_to_check:
                            domain_breaches.extend([
                                b for b in all_breaches 
                                if (d == b.get('Domain', '').lower() or
                                    d.endswith('.' + b.get('Domain', '').lower()) or
                                    b.get('Domain', '').lower().endswith('.' + d))
                            ])
                        
                        domain_breaches = list({b['Name']: b for b in domain_breaches}.values())
                        
                        logger.info(f"Found {len(domain_breaches)} breaches for domains {domains_to_check}")
                        
                        if domain_breaches:
                            total_pwned = sum(b.get('PwnCount', 0) for b in domain_breaches)
                            latest_date = max(b.get('BreachDate', '1970-01-01') for b in domain_breaches)
                            all_data_classes = set()
                            
                            for breach in domain_breaches:
                                breach_info['breaches'].append({
                                    'name': breach.get('Name'),
                                    'title': breach.get('Title'),
                                    'breach_date': breach.get('BreachDate'),
                                    'pwn_count': breach.get('PwnCount', 0),
                                    'data_classes': breach.get('DataClasses', []),
                                    'is_verified': breach.get('IsVerified', False),
                                    'is_sensitive': breach.get('IsSensitive', False),
                                    'description': breach.get('Description', '')
                                })
                                all_data_classes.update(breach.get('DataClasses', []))
                            
                            breach_info['total_pwned'] = total_pwned
                            breach_info['latest_breach'] = latest_date
                            breach_info['data_classes'] = list(all_data_classes)
                            breach_info['tags'] = ['breached']
                            
                            logger.info(f"Breach details for {domain}: {total_pwned} accounts pwned, latest breach on {latest_date}")

                            if any(b.get('is_sensitive', False) for b in domain_breaches):
                                breach_info['tags'].append('sensitive-breach')
                                logger.info(f"Added sensitive-breach tag for {domain}")
                            if total_pwned > 1000000:
                                breach_info['tags'].append('major-breach')
                                logger.info(f"Added major-breach tag for {domain} ({total_pwned} accounts)")
                            if any('Passwords' in b.get('DataClasses', []) for b in domain_breaches):
                                breach_info['tags'].append('password-breach')
                                logger.info(f"Added password-breach tag for {domain}")
                        else:
                            logger.info(f"No breaches found for domain {domain}")
                    except Exception as e:
                        logger.error(f"Error parsing HIBP response for {domain}: {str(e)}")
                else:
                    logger.error(f"HIBP API returned status {response.status} for domain {domain}")

                self.breach_cache[domain] = breach_info
                self.last_breach_check[domain] = now
                
                logger.info(f"Final breach info for {domain}: {breach_info}")
                return breach_info

        except Exception as e:
            logger.error(f"Error checking breach status for domain {domain}: {str(e)}")
            return {}

    def _cleanup_cache(self, current_time: datetime) -> None:
        """Clean up old cache entries"""
        old_time = current_time - datetime.timedelta(hours=1)
        self.last_breach_check = {
            k: v for k, v in self.last_breach_check.items() 
            if (current_time - v).total_seconds() < 3600
        }
        self.breach_cache = {
            k: v for k, v in self.breach_cache.items() 
            if k in self.last_breach_check
        } 