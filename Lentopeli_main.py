import mysql.connector
import random
from geopy import distance

# ===  Constants ====

# === Function: automatically defining stage criteria ===
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
(n, task) = task_criteria()
Task = f"You are currently in Finland Helsinki, this is your {n} task: {task}"
print("choose your destination (country and city)")
country_selection = user_input(' Choose a country: ')