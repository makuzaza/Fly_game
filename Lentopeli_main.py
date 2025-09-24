import mysql.connector
import os
from dotenv import load_dotenv
import random
from geopy import distance

# Load environment variables
load_dotenv()

# ===  Constants ====

# ===  DB connection ====
yhteys = mysql.connector.connect(
    host= DB_HOST,
    port= DB_PORT,
    database= DB_LENTO_PELI,
    user= DB_USER,
    password= DB_PASSWORD,
    autocommit=True
)

# === Function: automatically defining stage criterias === 
def task_criteria():
    # 0 = Max CO2 consumption, 1= flights, 2= countries
    stages_starter =  (1000, 5, 3) # At least 5 stages
    return 

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

# ==== Function: Distance counter ====
def distance_counter(coord1, coord2):
    dist = distance.distance(coord1, coord2).km
    return dist

# ==== Function: table creator ====

# === Function: ask user input ====
def user_input (question):
    return input(question)

# === Function: Allow user to pass next or keep same if fail task ====
def pass_stage():
    return

# === Main program ===
welcome_message = ""
print(welcome_message)
user_name = user_input('Give your name: ')
# === Save user in db (table: game, collumm screeen_name)
(n, co2_tsrget, places_clues) = task_criteria()
Task = f"You are currently in Finland Helsinki, this is your {n} CO2 target: {co2_tsrget}, places visit; {places_clues}"
print("choose your destination (country)")
country_selection = user_input(' Choose a country: ')
# call possible routes 
# print it and ask to choose an option (ennumarate the options).
destination_selection = user_input('Choose destination: ')
# Call distance calculator 
# message: tell how was the trip and show the table (country, city, distance, CO2 spend, How much there is still)
# repeat till the ammount of flights are concluded 
# check if the user will pass to the next stage or if the user faild and will have to repeat task.
# If pass = Save how much was spent in the data base if not do it again.
# leave or continue the game