import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# ===  Constants ====
DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT'))
DB_LENTO_PELI = os.getenv('DB_LENTO_PELI')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')

# ===  DB connection ====
def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_LENTO_PELI,
        user=DB_USER,
        password=DB_PASSWORD,
        autocommit=True
    )
