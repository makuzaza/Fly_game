import mysql.connector
import os
from dotenv import load_dotenv
import random
from geopy import distance
from route_count import *
from save_to_db import *
import folium
from tips import *
import story

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

# === Function: ask user input ===
def user_input (question):
    return input(question)

def create_stages():
# simple ordered list of 5 stages; extend details as needed
    return [
        {'id': 1, 'type': 'guess_country'},
        {'id': 2, 'type': 'route_with_stop', 'stops': 1},
        {'id': 3, 'type': 'info_stage'},
        {'id': 4, 'type': 'challenge_stage'},
        {'id': 5, 'type': 'final_stage'}
    ]

def stage_guess_country(yhteys, country_tips, user_input, get_country_airports):
    countries = show_countries(yhteys)
    countries_with_tips = [c for c in countries if c[0] in country_tips]
        
    random_country = random.choice(countries_with_tips)
    random_code, random_name = random_country
    tip = country_tips[random_code]
    print(f"\n🌍 Country tip: {tip}")

        # Loop until user guesses correctly
    while True:
        user_guess = user_input("Guess the country code (or press 'h' for all list of countries): ").strip().upper()
        if user_guess == 'H':
            print("\nAvailable countries:")
            for i, (code, name) in enumerate(countries_with_tips, 1): # could replace with countries to limit the list
                print(f"   {i:2}. {code} - {name}")
            continue  # Ask again after showing the list
        if user_guess == random_code:
            print("✅ Correct! Proceeding...")
            country_airports = get_country_airports(yhteys, random_code)
            return random_code, random_name, country_airports
        print("❌ Incorrect. Try again!")

# === Main program ===
def main():
    welcome_message = """
🛩️  ===== FLIGHT GAME - ROUTE PLANNER =====
Plan your flights wisely to stay within CO2 and flight limits!
    """
    print(welcome_message)
    # game starts
    # ask to show the story
    storyDialog = input('Do you want to read the background story? (Y/N): ')
    if storyDialog.strip().upper() == 'Y':
        # print wrapped string line by line
        for line in story.getStory():
            print(line)

    # Load airports
    print("Loading airports...")
    all_airports = get_all_airports(yhteys)
    print(f"✅ Loaded {len(all_airports)} airports")
    showMap(all_airports)
    
    user_name = user_input('Give your name: ')
    print(f"Welcome {user_name}! 🎮")
    
    # Game variables
    current_location = "EFHK"  # Helsinki
    total_co2 = 0
    total_flights = 0
    flight_history = []
    
    print(f"\n📍 Starting location: Helsinki, Finland (EFHK)")
    
    stages = create_stages()
    for stage in stages:
        if stage['type'] == 'guess_country':
            country_code, country_name, country_airports = stage_guess_country(yhteys, country_tips, user_input, get_airports_by_country)
            print(f"\n🛬 Airports in {country_name}:")
            for i, airport in enumerate(country_airports, 1):
                print(f"   {i:2}. {airport['ident']} - {airport['name']} ({airport['city']})")
        elif stage['type'] == 'route_with_stop':
            num_stops = stage.get('stops', 0)
            # Handle route planning with stops
        else:
            print(f"Unknown stage type: {stage['type']}")
        
        # Choose destination
        while True:
            try:
                airport_choice = int(user_input('\nChoose airport number to fly to: ')) - 1
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
        
        # if not start_airport or not end_airport:
        #     print("❌ Airport not found!")
        #     continue
        if start_airport['ident'] == end_airport['ident']:
            print("❌ Start and destination airports must be different. Please start again.")
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
        if route is None:
            print("❌ Could not find a valid route. Please try again.")
            continue 
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
        print(f"   Flights in this trip: {len(route) - 1}")
        print(f"   Total flights: {projected_flights}")

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
    db_table_creator(yhteys)
    results_to_db(yhteys, user_name, 1, total_flights, sum(f['distance'] for f in flight_history), total_co2)
    print(f"   results saved to database")

if yhteys.is_connected():
    print("✅ Successfully connected to database!")
    main()
else:
    print("❌ Failed to connect to database!")
