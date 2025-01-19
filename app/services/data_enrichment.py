import os
import sys
import aiohttp
import logging
from urllib.parse import urlparse, urljoin
import socket
import dns.resolver
import dns.exception
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import shodan
import re
import asyncio
import time
import random
import paho.mqtt.client as mqtt
import json
from dataclasses import dataclass
from pydantic import BaseModel


# This is to have the data enrichment thing be self contained
class ParsedBreachEntry(BaseModel):
    url: str
    username: str
    password: str
    hostname: str
    path: str
    port: int
    is_secure: bool
    line_number: int


# This was literally because the model and APIs got very . . . tangled.
class BreachData(BaseModel):
    had_breach: bool
    breach_count: Optional[int]
    total_pwned: Optional[int]
    latest_breach: Union[datetime, str, None]
    data_classes: Optional[List[Any]]
    breach_details: Optional[List[Any]]


class DataEnrichmentResult(BaseModel):
    url: str
    username: str
    password: str
    domain: str
    ip_address: Optional[str]
    port: int
    path: str
    page_title: Optional[str]
    service_type: Optional[str]
    has_captcha: bool
    has_mfa: bool
    is_secure: bool
    status_code: Optional[int]
    tags: List[str]

    breach_info: BreachData


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
logger.addHandler(handler)


class DataEnrichmentService:
    def __init__(self):
        self.shodan_api_key = os.getenv("SHODAN_API_KEY")
        self.shodan_api = (
            shodan.Shodan(self.shodan_api_key) if self.shodan_api_key else None
        )
        self.session = aiohttp.ClientSession()
        self.breach_cache = {}
        self.last_breach_check = {}
        self.breachdirectory_api_key = os.getenv("BREACHDIRECTORY_API_KEY")
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

    async def enrich_entry(
        self,
        entry_input: ParsedBreachEntry,
        websocket_manager=None,
        entry_id: str = None,
    ) -> DataEnrichmentResult:
        """Enrich a breach entry with additional data and send real-time updates"""
        try:
            url = entry_input.url
            username = entry_input.username
            password = entry_input.password
            hostname = entry_input.hostname
            path = entry_input.path
            port = entry_input.port
            is_secure = entry_input.is_secure

            breach_info_data = await self._check_breach_status(hostname)

            breach_info = BreachData(
                had_breach=bool(breach_info_data.get("breaches")),
                breach_count=len(breach_info_data.get("breaches", [])),
                total_pwned=breach_info_data.get("total_pwned", 0),
                latest_breach=breach_info_data.get("latest_breach"),
                data_classes=breach_info_data.get("data_classes", []),
                breach_details=breach_info_data.get("breaches", []),
            )

            result = DataEnrichmentResult(
                url=url,
                username=username,
                password=password,
                domain=hostname,
                ip_address=None,
                path=path,
                port=port,
                page_title=None,
                service_type=None,
                status_code=None,
                has_captcha=False,
                has_mfa=False,
                is_secure=is_secure,
                tags=breach_info_data.get(
                    "tags", []
                ),  # add any breach tags out the gate
                breach_info=breach_info,
            )

            # Add protocol tag
            result.tags.append("https" if is_secure else "http")

            # Send initial update with structured metadata
            if websocket_manager and entry_id:
                await websocket_manager.broadcast_update(
                    {
                        "id": entry_id,
                        "url": url,
                        "metadata": result,
                        "risk_score": 0.5,
                        "pattern_type": "unknown",
                        "last_analyzed": datetime.utcnow().isoformat(),
                    }
                )

            # Handle local IP
            if self._is_local_ip(hostname):
                result.tags.append("local-ip")
                return result

            # Check service type
            service_type = self._detect_service_type(url, path)
            if service_type:
                result.service_type = service_type
                result.tags.append(f"service-{service_type}")
                if websocket_manager and entry_id:
                    await websocket_manager.broadcast_update(
                        {
                            "id": entry_id,
                            "url": url,
                            "metadata": result,
                            "risk_score": 0.5,
                            "pattern_type": "unknown",
                            "last_analyzed": datetime.utcnow().isoformat(),
                        }
                    )

            # Resolve domain
            try:
                ip_data = await self._resolve_domain(hostname)
                if ip_data:
                    result.ip_address = ip_data.get("ip_address")
                    if ip_data.get("tags"):
                        result.tags.extend(ip_data["tags"])
                    if websocket_manager and entry_id:
                        await websocket_manager.broadcast_update(
                            {
                                "id": entry_id,
                                "url": url,
                                "metadata": result,
                                "risk_score": 0.5,
                                "pattern_type": "unknown",
                                "last_analyzed": datetime.utcnow().isoformat(),
                            }
                        )
            except Exception as e:
                logger.error(f"Error resolving domain {hostname}: {str(e)}")

            # Check URL accessibility
            try:
                url_data = await self._check_url_accessibility(url)
                if url_data:
                    result.status_code = url_data.get("status_code")
                    result.page_title = url_data.get("page_title")
                    result.has_captcha = bool(url_data.get("has_captcha"))
                    result.has_mfa = bool(url_data.get("has_mfa"))
                    if url_data.get("tags"):
                        result.tags.extend(url_data["tags"])
                    if websocket_manager and entry_id:
                        await websocket_manager.broadcast_update(
                            {
                                "id": entry_id,
                                "url": url,
                                "metadata": result,
                                "risk_score": 0.5,
                                "pattern_type": "unknown",
                                "last_analyzed": datetime.utcnow().isoformat(),
                            }
                        )
            except Exception as e:
                logger.error(f"Error checking URL accessibility: {str(e)}")

            # Deduplicate tags
            result.tags = list(set(result.tags))

            # Final update with all information
            if websocket_manager and entry_id:
                await websocket_manager.broadcast_update(
                    {
                        "id": entry_id,
                        "url": url,
                        "metadata": result,
                        "risk_score": 0.5,
                        "pattern_type": "unknown",
                        "last_analyzed": datetime.utcnow().isoformat(),
                    }
                )

            return result

        except Exception as e:
            logger.error(f"Error enriching entry for URL {url}: {str(e)}")
            logger.error(e)
            return result

    async def _resolve_domain(self, domain: str) -> Dict[str, Any]:
        """Resolve domain to IP address"""
        try:
            answers = dns.resolver.resolve(domain, "A")
            ip = str(answers[0])

            if self._is_non_routable_ip(ip):
                return {
                    "ip_address": ip,
                    "tags": ["local-ip"],
                    "extra_metadata": {"dns_resolution": "non-routable"},
                }

            return {
                "ip_address": ip,
                "tags": [],
                "extra_metadata": {"dns_resolution": "resolved"},
            }

        except dns.exception.DNSException:
            return {
                "ip_address": None,
                "tags": ["unresolved"],
                "extra_metadata": {"dns_resolution": "failed"},
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
                "services": [],
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
            async with self.session.get(
                url, timeout=timeout, allow_redirects=True, verify_ssl=False
            ) as response:
                status = response.status

                result = {"status_code": status, "tags": []}

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

                            service_type = self._detect_service_type_from_content(
                                text, url
                            )
                            if service_type:
                                result["service_type"] = service_type
                    except Exception as e:
                        logger.error(
                            f"Error processing response content for {url}: {str(e)}"
                        )

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
                "extra_metadata": {"error": str(e)},
            }
        except Exception as e:
            logger.error(f"Error checking URL accessibility for {url}: {str(e)}")
            return {
                "status_code": None,
                "tags": ["error"],
                "extra_metadata": {"error": str(e)},
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
            "fe80:",
        ]
        return any(ip.startswith(prefix) for prefix in non_routable)

    def _extract_title(self, html: str) -> Optional[str]:
        """Extract page title from HTML"""
        try:
            import re

            title_match = re.search(
                r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL
            )
            if title_match:
                return " ".join(title_match.group(1).strip())
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
            'id="login"',
        ]
        return any(indicator in html.lower() for indicator in login_indicators)

    def _has_captcha(self, html: str) -> bool:
        """Check if page has CAPTCHA"""
        captcha_indicators = [
            "recaptcha",
            "captcha",
            "hcaptcha",
            "g-recaptcha",
            "turnstile",
        ]
        return any(indicator in html.lower() for indicator in captcha_indicators)

    def _has_mfa(self, html: str) -> bool:
        """Check if page has MFA/2FA indicators"""
        mfa_indicators = [
            "two-factor",
            "two factor",
            "2fa",
            "mfa",
            "authenticator",
            "verification code",
            "security key",
            "one-time code",
            "one time password",
        ]
        return any(indicator in html.lower() for indicator in mfa_indicators)

    def _detect_service_type(self, url: str, path: str) -> Optional[str]:
        """Detect the service type based on URL and path patterns."""
        service_patterns = {
            "wordpress": r"/wp-(login|admin|content)",
            "citrix": r"/citrix/|/Citrix/",
            "rdweb": r"/rdweb/",
            "coremail": r"/coremail/",
            "cisco": r"/cisco/",
        }

        for service, pattern in service_patterns.items():
            if re.search(pattern, path):
                return service
        return None

    def _detect_service_type_from_content(self, html: str, url: str) -> Optional[str]:
        """Detect service type from page content"""
        service_patterns = {
            "wordpress": ["wp-login", "wordpress"],
            "citrix": ["citrix", "netscaler", "xenapp"],
            "rdweb": ["rd web access", "remote desktop"],
            "coremail": ["coremail"],
            "cisco": ["cisco", "webvpn"],
            "office365": ["office 365", "microsoft online"],
            "cpanel": ["cpanel"],
            "plesk": ["plesk"],
            "jira": ["jira"],
            "confluence": ["confluence"],
        }

        html_lower = html.lower()
        url_lower = url.lower()

        for service, patterns in service_patterns.items():
            if any(
                pattern in html_lower or pattern in url_lower for pattern in patterns
            ):
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
            r"^127\.",
            r"^10\.",
            r"^172\.(1[6-9]|2[0-9]|3[0-1])\.",
            r"^192\.168\.",
            r"^localhost$",
            r"^::1$",
        ]

        return any(re.match(pattern, ip_or_domain) for pattern in local_patterns)

    async def analyze_url(self, url: str) -> Dict[str, Any]:
        """Analyze URL and check breach status - this is the main entry point for URL analysis"""
        try:
            if not url:
                return {"breach_info": {}}

            if "//" in url:
                domain = url.split("//")[-1]
            else:
                domain = url

            domain = domain.split("/")[0].lower()
            domain = domain.split("?")[0]
            domain = domain.split("#")[0]
            domain = domain.split("@")[-1]
            domain = domain.split(":")[0]
            domain = domain.strip(".")

            if domain.startswith("www."):
                domain = domain[4:]

            domain_parts = domain.split(".")
            if len(domain_parts) > 2:
                domain = ".".join(domain_parts[-2:])

            breach_info = await self._check_breach_status(domain)

            tags = []

            if breach_info.get("tags"):
                tags.extend(breach_info["tags"])

            if url.startswith("https://"):
                tags.append("https")
            else:
                tags.append("http")

            return {
                "domain": domain,
                "ip_address": None,
                "port": None,
                "path": None,
                "page_title": None,
                "service_type": None,
                "has_captcha": 0,
                "has_mfa": 0,
                "is_secure": 1 if url.startswith("https://") else 0,
                "status_code": None,
                "tags": tags,
                "breach_info": breach_info,
                "extra_metadata": {
                    "breach_details": breach_info,
                    "breach_summary": {
                        "total_breaches": len(breach_info.get("breaches", [])),
                        "total_pwned": breach_info.get("total_pwned", 0),
                        "latest_breach": breach_info.get("latest_breach"),
                        "data_classes": breach_info.get("data_classes", []),
                    },
                },
            }
        except Exception as e:
            logger.error(f"Error analyzing URL {url}: {str(e)}")
            return {"breach_info": {}}

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

            if "//" in domain:
                domain = domain.split("//")[-1]
            domain = domain.split("/")[0].lower()
            domain = domain.split("?")[0]
            domain = domain.split("#")[0]
            domain = domain.split("@")[-1]
            domain = domain.split(":")[0]
            domain = domain.strip(".")

            if domain.startswith("www."):
                domain = domain[4:]

            domain_parts = domain.split(".")
            if len(domain_parts) > 2:
                domains_to_check = [
                    domain,
                    ".".join(domain_parts[-2:]),
                ]
            else:
                domains_to_check = [domain]

            logger.info(f"Checking breach status for domains: {domains_to_check}")

            if not any(
                re.match(r"^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$", d)
                for d in domains_to_check
            ):
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
                "breaches": [],
                "total_pwned": 0,
                "latest_breach": None,
                "data_classes": [],
                "tags": [],
            }

            logger.info(f"Making HIBP API request for domains: {domains_to_check}")
            async with self.session.get(
                f"https://haveibeenpwned.com/api/v2/breaches",
                headers={
                    "User-Agent": "SecureVision-Enrichment",
                    "Accept": "application/json",
                },
            ) as response:
                if response.status == 200:
                    try:
                        all_breaches = await response.json()
                        logger.info(f"Got {len(all_breaches)} total breaches from HIBP")

                        domain_breaches = []
                        for d in domains_to_check:
                            domain_breaches.extend(
                                [
                                    b
                                    for b in all_breaches
                                    if (
                                        d == b.get("Domain", "").lower()
                                        or d.endswith("." + b.get("Domain", "").lower())
                                        or b.get("Domain", "").lower().endswith("." + d)
                                    )
                                ]
                            )

                        domain_breacher = list(
                            {b["Name"]: b for b in domain_breaches}.values()
                        )

                        logger.info(
                            f"Found {len(domain_breaches)} breaches for domains {domains_to_check}"
                        )

                        if domain_breaches:
                            total_pwned = sum(
                                b.get("PwnCount", 0) for b in domain_breaches
                            )
                            latest_date = max(
                                b.get("BreachDate", "1970-01-01")
                                for b in domain_breaches
                            )
                            all_data_classes = set()

                            for breach in domain_breaches:
                                breach_info["breaches"].append(
                                    {
                                        "name": breach.get("Name"),
                                        "title": breach.get("Title"),
                                        "breach_date": breach.get("BreachDate"),
                                        "pwn_count": breach.get("PwnCount", 0),
                                        "data_classes": breach.get("DataClasses", []),
                                        "is_verified": breach.get("IsVerified", False),
                                        "is_sensitive": breach.get(
                                            "IsSensitive", False
                                        ),
                                        "description": breach.get("Description", ""),
                                    }
                                )
                                all_data_classes.update(breach.get("DataClasses", []))

                            breach_info["total_pwned"] = total_pwned
                            breach_info["latest_breach"] = latest_date
                            breach_info["data_classes"] = list(all_data_classes)
                            breach_info["tags"] = ["breached"]

                            logger.info(
                                f"Breach details for {domain}: {total_pwned} accounts pwned, latest breach on {latest_date}"
                            )

                            if any(
                                b.get("is_sensitive", False) for b in domain_breaches
                            ):
                                breach_info["tags"].append("sensitive-breach")
                                logger.info(f"Added sensitive-breach tag for {domain}")
                            if total_pwned > 1000000:
                                breach_info["tags"].append("major-breach")
                                logger.info(
                                    f"Added major-breach tag for {domain} ({total_pwned} accounts)"
                                )
                            if any(
                                "Passwords" in b.get("DataClasses", [])
                                for b in domain_breaches
                            ):
                                breach_info["tags"].append("password-breach")
                                logger.info(f"Added password-breach tag for {domain}")
                        else:
                            logger.info(f"No breaches found for domain {domain}")
                    except Exception as e:
                        logger.error(
                            f"Error parsing HIBP response for {domain}: {str(e)}"
                        )
                else:
                    logger.error(
                        f"HIBP API returned status {response.status} for domain {domain}"
                    )

                self.breach_cache[domain] = breach_info
                self.last_breach_check[domain] = now
                return breach_info

        except Exception as e:
            logger.error(f"Error checking breach status for domain {domain}: {str(e)}")
            return {}

    def _cleanup_cache(self, current_time: datetime) -> None:
        """Clean up old cache entries"""
        old_time = current_time - datetime.timedelta(hours=1)
        self.last_breach_check = {
            k: v
            for k, v in self.last_breach_check.items()
            if (current_time - v).total_seconds() < 3600
        }
        self.breach_cache = {
            k: v for k, v in self.breach_cache.items() if k in self.last_breach_check
        }


# TODO: Get this to a centralized config component, probably somewhere in core? But that would break the self-containment aspect
@dataclass
class WorkerConfig:
    MQTT_URL: str = os.getenv("MQTT_URL", "ssl://localhost:8080")
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "admin")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "admin")
    API_URL: str = os.getenv("API_URL", "http://localhost:8000/api/v1")
    WORKER_INDEX: int = int(os.getenv("WORKER_INDEX", "0"))


class DataEnrichmentWorker:
    def __init__(self):
        config = WorkerConfig()

        self._worker_index = config.WORKER_INDEX

        logger.info("Worker %s", self._worker_index)

        parsed_mqtt_url = urlparse(config.MQTT_URL)
        self.api_url = config.API_URL

        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
        self._client.tls_set()
        self._client.connect(parsed_mqtt_url.hostname, parsed_mqtt_url.port, 60)
        self._client.loop_forever()

    async def _process_entry(self, entry: ParsedBreachEntry):
        async with DataEnrichmentService() as service:
            result = await service.enrich_entry(entry)
        await self._create_entry(result)

    async def _create_entry(self, data: DataEnrichmentResult):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                urljoin(self.api_url, "/api/v1/breach-data"), json=data.model_dump()
            ) as response:
                logger.info("Request body: %s", data.model_dump())
                logger.info("Breach Entry POST Status: %s", response.status)
                logger.info("Breach Entry Response Test: %s", await response.text())
                logger.info("JSON: %s", await response.json())

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        logger.info("Connected with result code %s.", reason_code)
        # Subscribe to all URL parse updates
        client.subscribe(f"urls/parsed/{self._worker_index}")

    def _on_message(self, client, userdata, message):
        try:
            # Parse the JSON message
            url_data = json.loads(message.payload.decode())
            logger.info("Received batch: %s:", url_data["url"])
            logger.info("Message payload: %s", message.payload)

            parsed_data = ParsedBreachEntry(**url_data)
            asyncio.run(self._process_entry(parsed_data))
            logger.info("-------------------")
        except Exception as e:
            logger.error("Error processing message: %s", str(e))


def run_worker():
    logger.info("STARTING WORKER.")
    worker = DataEnrichmentWorker()


if __name__ == "__main__":
    run_worker()
