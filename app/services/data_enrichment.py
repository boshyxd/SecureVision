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

logger = logging.getLogger(__name__)

class DataEnrichmentService:
    def __init__(self):
        self.shodan_api_key = os.getenv('SHODAN_API_KEY')
        self.shodan_api = shodan.Shodan(self.shodan_api_key) if self.shodan_api_key else None
        self.session = None
        self.breach_cache = {}
        self.last_breach_check = {}

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def enrich_entry(self, url: str) -> Dict[str, Any]:
        """Enrich a breach entry with additional data"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.split(':')[0]
            path = parsed.path
            port = parsed.port or (443 if parsed.scheme == 'https' else 80)
            is_secure = parsed.scheme == 'https'
            
            tags = []
            if is_secure:
                tags.append('https')
            else:
                tags.append('http')
            
            if self._is_local_ip(domain):
                tags.append('local-ip')
                return {
                    'domain': domain,
                    'ip_address': None,
                    'port': port,
                    'path': path,
                    'service_type': None,
                    'has_captcha': False,
                    'has_mfa': False,
                    'is_secure': is_secure,
                    'status_code': None,
                    'tags': tags,
                    'extra_metadata': {'dns_resolution': 'local'}
                }

            service_type = self._detect_service_type(url, path)
            if service_type:
                tags.append(f'service-{service_type}')

            if not re.match(r'^https?://', url):
                return None

            enriched_data = {
                "domain": domain,
                "ip_address": None,
                "port": port,
                "path": path,
                "page_title": None,
                "service_type": service_type,
                "has_captcha": 0,
                "has_mfa": 0,
                "is_secure": is_secure,
                "status_code": None,
                "tags": tags,
                "extra_metadata": {}
            }

            ip_data = await self._resolve_domain(domain)
            if ip_data:
                enriched_data.update(ip_data)

            if self.shodan_api and enriched_data["ip_address"]:
                shodan_data = await self._get_shodan_data(enriched_data["ip_address"])
                if shodan_data:
                    enriched_data["extra_metadata"]["shodan"] = shodan_data
                    
                    if "http" in shodan_data.get("modules", []):
                        for port in shodan_data.get("ports", []):
                            if port == enriched_data["port"]:
                                enriched_data["service_type"] = self._detect_service_type(
                                    shodan_data, enriched_data["path"]
                                )
                                break

            url_data = await self._check_url_accessibility(url)
            if url_data:
                enriched_data.update(url_data)

            enriched_data["tags"] = self._process_tags(enriched_data)
            
            return enriched_data
            
        except Exception as e:
            logger.error(f"Error enriching entry for URL {url}: {str(e)}")
            return {}

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
            async with self.session.get(url, timeout=10, allow_redirects=True) as response:
                status = response.status
                text = await response.text()
                
                result = {
                    "status_code": status,
                    "tags": []
                }
                
                if status == 200:
                    result["tags"].append("active")
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
                            
                elif status == 404:
                    result["tags"].append("not-found")
                elif status >= 500:
                    result["tags"].append("server-error")
                    
                return result
                
        except aiohttp.ClientError:
            return {
                "status_code": None,
                "tags": ["unreachable"]
            }
        except Exception as e:
            logger.error(f"Error checking URL accessibility for {url}: {str(e)}")
            return {}

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
        """Analyze URL and check breach status"""
        enriched_data = await self.enrich_entry(url)
        if enriched_data and enriched_data.get('domain'):
            domain = enriched_data['domain']
            is_breached = await self._check_breach_status(domain)
            
            if is_breached and domain in self.breach_cache:
                breach_info = self.breach_cache[domain]
                enriched_data['tags'] = enriched_data.get('tags', []) + ['breached']
                enriched_data['extra_metadata']['breach_info'] = {
                    'total_breaches': len(breach_info['breaches']),
                    'total_pwned': breach_info['total_pwned'],
                    'latest_breach': breach_info['latest_breach'],
                    'data_classes': breach_info['data_classes'],
                    'breaches': breach_info['breaches']
                }
                
        return enriched_data

    async def _check_breach_status(self, domain: str) -> bool:
        """Check if a domain has been breached using HIBP API"""
        try:
            if not domain or not isinstance(domain, str):
                return False

            domain = domain.split('/')[0].lower()
            if not re.match(r'^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$', domain):
                return False

            now = datetime.utcnow()
            if domain in self.breach_cache:
                cache_time = self.last_breach_check.get(domain)
                if cache_time and (now - cache_time).total_seconds() < 3600:
                    return bool(self.breach_cache[domain].get('breaches'))

            if len(self.last_breach_check) > 100:
                self._cleanup_cache(now)

            async with self.session.get(
                f'https://haveibeenpwned.com/api/v3/breaches?domain={domain}',
                headers={'User-Agent': 'SecureVision-Enrichment'}
            ) as response:
                if response.status == 200:
                    breaches = await response.json()
                    
                    breach_info = {
                        'breaches': [],
                        'total_pwned': 0,
                        'latest_breach': None,
                        'data_classes': set()
                    }

                    for breach in breaches:
                        breach_info['breaches'].append({
                            'name': breach.get('Name'),
                            'title': breach.get('Title'),
                            'breach_date': breach.get('BreachDate'),
                            'pwn_count': breach.get('PwnCount', 0),
                            'data_classes': breach.get('DataClasses', []),
                            'is_verified': breach.get('IsVerified', False),
                            'is_sensitive': breach.get('IsSensitive', False)
                        })
                        breach_info['total_pwned'] += breach.get('PwnCount', 0)
                        breach_info['data_classes'].update(breach.get('DataClasses', []))
                        
                        breach_date = breach.get('BreachDate')
                        if breach_date and (not breach_info['latest_breach'] or breach_date > breach_info['latest_breach']):
                            breach_info['latest_breach'] = breach_date

                    breach_info['data_classes'] = list(breach_info['data_classes'])
                    
                    self.breach_cache[domain] = breach_info
                    self.last_breach_check[domain] = now
                    
                    return bool(breach_info['breaches'])
                else:
                    logger.warning(f"HIBP API returned status {response.status} for domain {domain}")
                    return False

        except Exception as e:
            logger.error(f"Error checking breach status for domain {domain}: {str(e)}")
            return False

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