import paho.mqtt.client as mqtt
from urllib.parse import urlparse
import binascii

from app.models.schemas import ParsedBreachEntry
from app.core.config import settings


class BreachEntryRelay:
    """Broadcasts a new breach entry using MQTT."""
    def __init__(self):
        parsed_mqtt_url = urlparse(settings.MQTT_URL)
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        self._client.tls_set()
        self._client.connect(parsed_mqtt_url.hostname, parsed_mqtt_url.port, 60)
        self._client.loop_start()

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        print(f"Connected with result code {reason_code}")

    def broadcast(self, entry: ParsedBreachEntry):
        url = entry.url
        encoded_url = url.encode()
        hex_url = (binascii.hexlify(encoded_url).decode(),)
        self._client.publish(f"urls/parsed/{hex_url}", entry.json())
        print(f"Published {url} to queue.")
