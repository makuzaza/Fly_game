import mysql.connector
import os
from dotenv import load_dotenv
import random
from geopy import distance

# Load environment variables
load_dotenv()

# ===  States ====
session_state = {
    "origen": 'Finland',
    "destination": '',
    "current_stage": 0,
    "co2_available": 0,
    "places": {}
}

# ===  DB connection ====
yhteys = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DB_LENTO_PELI"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    autocommit=True
)

# === Function: automatically defining stage criterias (destination and CO₂ limit) === 
def task_criteria():
    session_state['current_stage'] += 1
    co2_base = 3000
    session_state['co2_available'] = co2_base * session_state['current_stage'] * 0.6

    cursor = yhteys.cursor()
    cursor.execute('SELECT MAX(id) FROM airport')
    max_id = cursor.fetchone()[0]

    places = {}

    while len(places) < 3:
        random_id = random.randint(1, max_id)
        sql = f"""
            SELECT airport.ident, country.name 
            FROM airport
            JOIN country ON airport.iso_country = country.iso_country 
            WHERE airport.id = {random_id} AND airport.iso_country IS NOT NULL
        """
        cursor.execute(sql)
        result = cursor.fetchone()

        if result:
            icao, country_name = result
            if country_name not in places:
                places[country_name] = icao
    
    session_state['places'] = places
    return

# === Function: CO2 Emmission ===
def calc_co2_emmission(distance_km, aircraft_type='small_plane'):
    emission_factors = {
        'small_plane': 0.15,
        'regional_jet': 0.25,
        'passenger_jet': 0.3
    }
    return distance_km * emission_factors.get(aircraft_type, 0.3)

# ==== Function: Get coordination ====
def search_coordination(icao):
    sql = f"SELECT latitude_deg, longitude_deg FROM airport where ident='{icao}'"
    cursor = yhteys.cursor()   # yhteys is a connection function
    cursor.execute(sql)
    result = cursor.fetchall()

    if cursor.rowcount >0 :
        for line in result:
            coord = [line[0], line[1]]
    return coord

# === Function: Distance counter ===
def distance_counter(coord1, coord2):
    dist = distance.distance(coord1, coord2).km
    return dist

# === Function: Database table creator ===
def db_table_creator():
    sql = f"""
        CREATE TABLE IF NOT EXISTS results (
            ID NOT NULL AUTO_INCREMENT,
            name VARCHAR(40),
            levels INT,
            cities INT,
            km_amount FLOAT,
            co2_amount FLOAT,
            PRIMARY KEY (ID)
        );
    """
    cursor = yhteys.cursor()  # yhteys is a connection function
    cursor.execute(sql)
    yhteys.commit()   # save changes
    return

# === Function: Fill the database table 'results' ===


# === Function: table creator ===

# === Function: ask user input ===
def user_input (question):
    return input(question)

# === Function: Allow user to pass next or keep same if fail task ====
def pass_stage():
    return

# === Main program ===
welcome_message = "Welcome to the eco flight game!"
print(welcome_message)
user_name = user_input('Give your name: ')
# === Save user in db (table: game, collumm screeen_name)

task_criteria()
print('You are currently in Finland Helsinki.')
print(f"This is your {session_state['current_stage']} task.")
country_list = list(session_state['places'].keys())
task = f" You have {session_state['co2_available']}kg of CO2 available and you gotta visit {country_list[0]}, {country_list[1]} and {country_list[2]}."
print(task)
print('Make sure you visit the 3 countries without exceeding the amout of CO2 available')

country_selection = user_input('Choose your destination (country): ')

if session_state['current_stage'] == 1:
    origen_coord = search_coordination('EFEJ')
else:
    origen_coord = search_coordination(session_state['origen'])

destination_coord = search_coordination(session_state['places'][country_selection])

dist_km = distance_counter(origen_coord, destination_coord)
co2_spent = calc_co2_emmission(dist_km)

session_state['destination'] = country_selection
print(f"You flew from {session_state['origen']} to {session_state['destination']}")
session_state['origen'] = country_selection
session_state['co2_available'] -= co2_spent

# call table creator and print table (country, city, distance, CO2 spend, How much there is still)
print(f"Here we should print the table but for now will print - flight distance: {dist_km:.2f} km and CO2 spent: {co2_spent:.2f} kg, CO2 still available: {session_state['co2_available']:.2f}")

# repeat till the 3 flights are done 
# check if the user will pass to the next stage or if the user faild and will have to repeat task.
# If pass = Save how much was spent in the data base if not do it again.
# leave or continue the game

