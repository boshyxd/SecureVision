import paho.mqtt.client as mqtt
import json
import binascii
from typing import Dict, Any, Generator
from datetime import datetime
import asyncio
from urllib.parse import urlparse
import json
import os
from dataclasses import dataclass

from app.gadgets.breach_entry_relay import BreachEntryRelay
from app.models.schemas import ParsedBreachEntry

def get_file_lines(file_path: str) -> Generator[tuple[int, str], None, None]:
    with open(file_path, "r", encoding="utf-8") as f:
        for index, line in enumerate(f):
            if not line.strip():
                continue
            yield (index, line.strip())

def process_line(line: str, index: int, stats: Dict[str, int]) -> ParsedBreachEntry | None:
    try:
        last_colon = line.rindex(":")
        second_last_colon = line.rindex(":", 0, last_colon)

        url = line[:second_last_colon]
        username = line[second_last_colon + 1 : last_colon]
        password = line[last_colon + 1 :]

        if not url or not username or not password:
            raise ValueError("Missing required fields")

        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError("Invalid URL format")

        hostname = parsed_url.hostname or "unknown"
        path = parsed_url.path or "/"
        port = parsed_url.port or (
            443 if parsed_url.scheme == "https" else 80
        )
        is_secure = parsed_url.scheme == "https"

        entry = ParsedBreachEntry(
            url=url,
            username=username,
            password=password,
            hostname=hostname,
            path=path,
            port=port,
            is_secure=is_secure,
            line_number=index
        )

        stats["processed"] += 1
        return entry
    except ValueError as value_error:
        stats["failed"] += 1
        print(f"Value Error: {str(value_error)}")
        print(f"Line: {str(line)}")
        return None

async def parse_breach_file(file_path: str, relay: BreachEntryRelay) -> Dict[str, int]:
    """Process a breach data file and store entries in database"""
    stats = {"total_lines": 0, "processed": 0, "failed": 0}

    try:
        line_data = get_file_lines(file_path)
        for index, line in line_data:
            stats["total_lines"] += 1
            entry = process_line(line, index, stats)
            if entry is None:
                continue
            relay.broadcast(entry, index)
            # Whatever else
        return stats
    except Exception as e:
        print(f"UNKNOWN ERROR: {str(e)}")
        return stats