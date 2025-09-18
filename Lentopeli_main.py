import mysql.connector
import random

# ===  Constants ====

# === Function: automatically defining stage criterias === 
def task_criteria():
    # 0 = Max CO2 consumpition, 1= flights, 2= countries
    stages_starter =  (1000, 5, 3) # Atleast 5 stages
    return 

# ==== Function: Distace counter ====

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