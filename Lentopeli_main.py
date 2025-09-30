import mysql.connector
import os
from dotenv import load_dotenv
import random
from geopy import distance
from route_count import *

# Load environment variables
load_dotenv()

# ===  DB connection ====
yhteys = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DB_LENTO_PELI"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    autocommit=True
)

# === Function: Database table creator ===
def db_table_creator():
    sql = f"""
        CREATE TABLE IF NOT EXISTS results (
            ID INT NOT NULL AUTO_INCREMENT,
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
def results_to_db(name, level, city, km, co2):
    sql = f"""
        INSERT INTO results (name, levels, cities, km_amount, co2_amount)
        VALUES (%s, %s, %s, %s, %s);
    """
    cursor = yhteys.cursor()  # yhteys is a connection function
    cursor.execute(sql, (name, level, city, km, co2))
    yhteys.commit()   # save changes
    return

# === Function: ask user input ===
def user_input (question):
    return input(question)

# === Main program ===
def main():
    welcome_message = """
🛩️  ===== FLIGHT GAME - ROUTE PLANNER =====
Plan your flights wisely to stay within CO2 and flight limits!
    """
    print(welcome_message)
    
    # Load airports
    print("Loading airports...")
    all_airports = get_all_airports(yhteys)
    print(f"✅ Loaded {len(all_airports)} airports")
    
    user_name = user_input('Give your name: ')
    print(f"Welcome {user_name}! 🎮")
    
    # Game variables
    current_location = "EFHK"  # Helsinki
    total_co2 = 0
    total_flights = 0
    flight_history = []
    
    print(f"\n📍 Starting location: Helsinki, Finland (EFHK)")
    
    while True:
        
        # Show countries
        show = user_input("Show available countries? (y): ").strip().lower()
        while show not in ['y']:
            show = user_input("Please enter 'y': ").strip().lower()
        if show == "y":
            countries = show_countries(yhteys)

        # Choose country
        while True:
            try:
                country_choice = int(user_input('\nChoose country number: ')) - 1
                if not 0 <= country_choice < len(countries):
                    print("❌ Invalid choice!")
                    continue
                selected_country = countries[country_choice]
                country_code, country_name = selected_country
                print(f"Selected: {country_code}")
                break
            except ValueError:
                print("❌ Please enter a valid number!")
                continue
        
        # Show airports in country
        country_airports = get_airports_by_country(yhteys, country_code)
        if not country_airports:
            print("❌ No large airports found in this country!")
            continue
        
        print(f"\n🛬 Airports in {country_name}:")
        for i, airport in enumerate(country_airports, 1):
            print(f"   {i:2}. {airport['ident']} - {airport['name']} ({airport['city']})")
        
        # Choose destination
        while True:
            try:
                airport_choice = int(user_input('\nChoose airport number: ')) - 1
                if not 0 <= airport_choice < len(country_airports):
                    print("❌ Invalid choice!")
                    continue
                destination_code = country_airports[airport_choice]['ident']
                destination_name = country_airports[airport_choice]['name']
                break
            except ValueError:
                print("❌ Please enter a valid number!")
                continue         
        
        # Find full airport details
        start_airport = find_airport(all_airports, current_location)
        end_airport = find_airport(all_airports, destination_code)
        
        if not start_airport or not end_airport:
            print("❌ Airport not found!")
            continue
        
        # Ask for stops
        while True:
            try:
                num_stops = int(user_input('Number of stops (0-5): ') or "0")
                if not 0 <= num_stops <= 5:
                    print("❌ Please enter 0-5 stops")
                    continue
                break
            except ValueError:
                print("❌ Please enter a valid number")
                continue
        
        # Plan route
        print(f"\n🔍 Planning route from {start_airport['name']} to {destination_name}...")
        if num_stops > 0:
            print(f"   Finding {num_stops} optimal stops...")
        
        route = find_route_with_stops(start_airport, end_airport, all_airports, num_stops)
        route_distance = total_route_distance(route)
        route_co2 = calculate_co2(route_distance)
        
        # Show route
        print(f"\n✈️  Planned route:")
        print(f"   Direct distance: {calc_distance(start_airport, end_airport):.0f} km")
        print(f"   More than direct: {route_distance - calc_distance(start_airport, end_airport):.0f} km extra")
        print(f"📏 Total distance: {route_distance:.0f} km")
        print(f"💨 CO2 emissions: {route_co2:.1f} kg")
        
        for i, airport in enumerate(route):
            if i == 0:
                print(f"   🛫 START: {airport['ident']} - {airport['name']}")
            elif i == len(route) - 1:
                print(f"   🛬 END:   {airport['ident']} - {airport['name']}")
            else:
                print(f"   🔄 STOP:  {airport['ident']} - {airport['name']}")
        
        # Check if this would exceed limits
        projected_co2 = total_co2 + route_co2
        projected_flights = total_flights + len(route) - 1
        
        print(f"\n📊 Impact:")
        print(f"   CO2: {projected_co2:.1f}kg")
        print(f"   Flights: {total_flights}")
        print(f"   Flights: {projected_flights}")

        # Execute trip
        total_co2 += route_co2
        total_flights += len(route) - 1  # Number of flight segments
        current_location = destination_code
        
        flight_history.append({
            'route': route,
            'distance': route_distance,
            'co2': route_co2
        })
        
        print(f"\n🎯 Trip completed!")
        print(f"   New location: {destination_name}")

        continue_game = user_input("\nContinue to next destination? (y/n): ").lower()
        if continue_game != 'y':
            break
    
    # Game summary
    print(f"\n🏁 GAME OVER!")
    print(f"   Final CO2: {total_co2:.1f}kg")
    db_table_creator()
    print(f"   table created")
    results_to_db(user_name, 1, total_flights, sum(f['distance'] for f in flight_history), total_co2)
    print(f"   results saved to database")

if yhteys.is_connected():
    print("✅ Successfully connected to database!")
    main()
else:
    print("❌ Failed to connect to database!")

# welcome_message = "Welcome to the eco flight game!"
# print(welcome_message)
# user_name = user_input('Give your name: ')
# # === Save user in db (table: game, collumm screeen_name)

# task_criteria()
# print('You are currently in Finland Helsinki.')
# print(f"This is your {session_state['current_stage']} task.")
# country_list = list(session_state['places'].keys())
# task = f" You have {session_state['co2_available']}kg of CO2 available and you gotta visit {country_list[0]}, {country_list[1]} and {country_list[2]}."
# print(task)
# print('Make sure you visit the 3 countries without exceeding the amout of CO2 available')

# country_selection = user_input('Choose your destination (country): ')

# if session_state['current_stage'] == 1:
#     origen_coord = search_coordination('EFEJ')
# else:
#     origen_coord = search_coordination(session_state['origen'])

# destination_coord = search_coordination(session_state['places'][country_selection])

# dist_km = distance_counter(origen_coord, destination_coord)
# co2_spent = calc_co2_emmission(dist_km)

# session_state['destination'] = country_selection
# print(f"You flew from {session_state['origen']} to {session_state['destination']}")
# session_state['origen'] = country_selection
# session_state['co2_available'] -= co2_spent

# # call table creator and print table (country, city, distance, CO2 spend, How much there is still)
# print(f"Here we should print the table but for now will print - flight distance: {dist_km:.2f} km and CO2 spent: {co2_spent:.2f} kg, CO2 still available: {session_state['co2_available']:.2f}")

# # repeat till the 3 flights are done 
# # check if the user will pass to the next stage or if the user faild and will have to repeat task.
# # If pass = Save how much was spent in the data base if not do it again.
# # leave or continue the game
