import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import Base, engine
from app.core.config import settings
import mysql.connector
from mysql.connector import Error

def create_database():
    """Create the database if it doesn't exist"""
    try:
        conn = mysql.connector.connect(
            host=settings.MYSQL_HOST,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD
        )
        
        if conn.is_connected():
            cursor = conn.cursor()
            
            # Create database if it doesn't exist
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB}")
            print(f"Database '{settings.MYSQL_DB}' created successfully")
            
            cursor.close()
            conn.close()
            
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        sys.exit(1)

def init_db():
    """Initialize database tables"""
    try:
        # Create database
        create_database()
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialization completed") 