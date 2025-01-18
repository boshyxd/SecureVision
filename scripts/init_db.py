import pymysql
import os
from dotenv import load_dotenv
from app.models.database import Base, engine

load_dotenv()

def init_mysql():
    """Initialize MySQL database"""
    conn = pymysql.connect(
        host=os.getenv('MYSQL_HOST', 'localhost'),
        user=os.getenv('MYSQL_USER', 'root'),
        password=os.getenv('MYSQL_PASSWORD', 'password'),
        charset='utf8mb4'
    )
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("DROP DATABASE IF EXISTS securevision")
            cursor.execute("CREATE DATABASE securevision CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.commit()
        print("Database 'securevision' recreated successfully")
    finally:
        conn.close()

    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")

if __name__ == "__main__":
    init_mysql() 