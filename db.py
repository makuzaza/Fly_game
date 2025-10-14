import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# ===  DB connection ====
def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_LENTO_PELI"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        autocommit=True
    )
