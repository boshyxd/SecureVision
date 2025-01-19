from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "SecureVision"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "securevision")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")

    # These will help with the broadcasting
    MQTT_URL: str = os.getenv("MQTT_URL", "ssl://localhost:8080")
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "admin")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "admin")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"mysql+mysqlconnector://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

settings = Settings() 