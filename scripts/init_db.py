import pymysql
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

load_dotenv()

def init_mysql():
    """Initialize MySQL database"""
    try:
        conn = pymysql.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', ''),
            charset='utf8mb4'
        )
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("DROP DATABASE IF EXISTS securevision")
                cursor.execute("CREATE DATABASE securevision CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                print("Database 'securevision' recreated successfully")
                
                cursor.execute(f"GRANT ALL PRIVILEGES ON securevision.* TO '{os.getenv('MYSQL_USER')}'@'localhost'")
                cursor.execute("FLUSH PRIVILEGES")
                print("Database privileges granted successfully")
                
            conn.commit()
        finally:
            conn.close()

        from app.models.database import Base, engine
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
        
    except pymysql.err.OperationalError as e:
        error_code = e.args[0]
        if error_code == 1045:
            print("Error: Access denied. Please check your MySQL username and password in .env file")
            print("Current settings:")
            print(f"User: {os.getenv('MYSQL_USER')}")
            print(f"Host: {os.getenv('MYSQL_HOST')}")
            print("Make sure these credentials are correct and the user has appropriate privileges")
        else:
            print(f"Database Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init_mysql() 