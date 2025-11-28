from db import get_connection
from geopy import distance

yhteys = get_connection()

# === Show available countries with airports ===
def show_countries(yhteys):
    sql = "SELECT DISTINCT country.iso_country, country.name FROM airport, country WHERE airport.iso_country = country.iso_country AND airport.type IN ('large_airport') ORDER BY country.name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    countries = cursor.fetchall()

    return countries