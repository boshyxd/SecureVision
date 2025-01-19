import paho.mqtt.client as mqtt
import json
from typing import Optional, List, Dict, Any
import os
from urllib.parse import urlparse
from dataclasses import dataclass

# TODO: Get this to a centralized config component, probably somewhere in core
@dataclass
class WorkerConfig:
    MQTT_URL: str = os.getenv("MQTT_URL", "ssl://localhost:8080")
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "admin")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "admin")
    API_URL: str = os.getenv("API_URL", "http://localhost:8000/api/v1")

class BreachEntryPublisher:
    def __init__(self):
        config = WorkerConfig()

        parsed_mqtt_url = urlparse(config.MQTT_URL)
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
        self._client.tls_set()
        self._client.connect(parsed_mqtt_url.hostname, parsed_mqtt_url.port, 60)

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        print(f"Connected with result code {reason_code}")

    def run(self):
        self._client.loop_start()
    
    def broadcast(self, entry_dict: Dict[str, Any]):
        pass



class DataEnrichmentWorker:
    def __init__(self):
        config = WorkerConfig()

        parsed_mqtt_url = urlparse(config.MQTT_URL)

        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
        self._client.tls_set()
        self._client.connect(parsed_mqtt_url.hostname, parsed_mqtt_url.port, 60)

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        print(f"Connected with result code {reason_code}")
        # Subscribe to all URL parse updates
        client.subscribe("urls/parse/#")

    def _on_message(self, client, userdata, message):
        try:
            # Parse the JSON message
            url_data = json.loads(message.payload.decode())
            print(f"Received batch: {url_data['batch_number']}:")
            print("-------------------")
        except Exception as e:
            print(f"Error processing message: {e}")

    def run(self):
        self._client.loop_forever()


def main():
    worker = DataEnrichmentWorker()
    worker.run()


if __name__ == "__main__":
    main()