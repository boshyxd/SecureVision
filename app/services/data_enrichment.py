import aiohttp
from urllib.parse import urlparse
from bs4 import BeautifulSoup
# from app.models.database import SessionLocal, BreachEntry
import shodan
import os
import dotenv
import requests
import re

dotenv.load_dotenv()
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY")


async def check_url_accessibility(url: str) -> dict:
    """Check if URL is accessible"""
    # TODO: Implement URL accessibility check
    return {
        "status_code": None,
        "title": None,
        "has_login_form": False
    }


async def resolve_domain(domain: str) -> dict:
    """Resolve domain to IP address"""
    # TODO: Implement domain resolution
    return {
        "resolved": False,
        "ip": None
    }


async def enrich_breach_data(entry_id: int):
    """Enrich breach data with additional information"""
    # TODO: Implement data enrichment and update breach_metadata
    pass


# https://shodan.readthedocs.io/en/latest/tutorial.html
def shodan_scan_host(host_ip):
    api = shodan.Shodan(SHODAN_API_KEY)
    host = api.host(host_ip)

    # Print general info
    print("""
            IP: {}
            Organization: {}
            Operating System: {}
    """.format(host['ip_str'], host.get('org', 'n/a'), host.get('os', 'n/a')))

    # Print all banners
    for item in host['data']:
        print("""
                    Port: {}
                    Banner: {}

            """.format(item['port'], item['data']))


# https://developer.shodan.io/api
def shodan_resolve_dns(hostnames):
    url = f"https://api.shodan.io/dns/resolve?hostnames={hostnames}&key={SHODAN_API_KEY}"

    try:
        response = requests.get(url)
        response.raise_for_status()
        dns_data = response.json()
        print('Resolved DNS:', dns_data)
        return dns_data
    except requests.exceptions.RequestException as e:
        print(f"Error resolving DNS: {e}")
        return None


def check_captcha(url):
    response = requests.get(url)
    html_content = response.text
    captcha_patterns = [
        r"google\.com/recaptcha",  # reCAPTCHA
        r"gstatic\.com/recaptcha",  # reCAPTCHA assets
        r"hcaptcha\.com",  # hCaptcha
        r"\.hcaptcha\.com/1/api.js",  # hCaptcha script
        r"data-sitekey",  # Common attribute for CAPTCHA widgets
        r"captcha",  # General keyword
    ]

    # Search for patterns
    if any(re.search(pattern, html_content, re.IGNORECASE) for pattern in captcha_patterns):
        return True
    else:
        return False


def detect_password_fields(url):
    try:
        response = requests.get(url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        input_fields = soup.find_all('input')

        # Look for password fields
        password_fields = []
        for field in input_fields:
            field_type = field.get('type', '').lower()
            autocomplete = field.get('autocomplete', '').lower()
            field_name = field.get('name', '').lower()
            field_id = field.get('id', '').lower()
            field_class = ' '.join(field.get('class', [])).lower()

            if (
                    field_type == 'password' or
                    'password' in autocomplete or
                    'password' in field_name or
                    'password' in field_id or
                    'password' in field_class
            ):
                password_fields.append(field)

        if password_fields:
            return True
        else:
            return False

    except Exception as e:
        print(f"Error: {e}")
        return False


url = "https://www.facebook.com/login"
print(detect_password_fields(url))
