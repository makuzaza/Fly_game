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
from db import get_connection
from datetime import datetime

yhteys = get_connection()
countries = show_countries()
MAX_CO2 = None

def user_input(question):
    response = input(question).strip()
    if response.upper() in ['QUIT', 'X']:
        return 'quit_game'
    return response

def create_stages():
    return [
        {'id': 1, 'type': 'guess_country'},
        {'id': 2, 'type': 'route_with_stop', 'stops': 1},
        {'id': 3, 'type': 'route_with_stop', 'stops': 2},
        {'id': 4, 'type': 'route_with_stop', 'stops': 3},
        {'id': 5, 'type': 'route_with_stop', 'stops': 4}
    ]

def ask_with_attempts(prompt, correct_answer, on_help=None):
    attempts = 0
    while attempts < 3:
        user_guess = user_input(prompt).strip().upper()

        if user_guess == 'quit_game':
            game_status = "Quit"
            end_game(user_name, date, stage_index, total_flights, total_co2, game_status, flight_history)
            return

        if on_help and user_guess == 'H':
            on_help()
            continue

        if user_guess == correct_answer:
            return True

        attempts += 1
        remaining = 3 - attempts
        if remaining > 0:
            print(f"🔴 Incorrect. Try again! ({remaining} attempts left)")
    return False

def get_countries_with_tips(country_tips):
    return [c for c in countries if c[0] in country_tips] or countries

def generate_mission(all_airports, country_tips):
    stages = create_stages()
    countries_with_tips = get_countries_with_tips(country_tips)
    mission_countries = random.sample(countries_with_tips, 5)
    
    current_pos = "EFHK"
    total_mission_co2 = 0
    
    for i, (country_code, country_name) in enumerate(mission_countries):
        country_airports = get_airports_by_country(country_code)
        if not country_airports:
            continue
        target_airport = random.choice(country_airports)
        start_airport = find_airport(all_airports, current_pos)
        end_airport = find_airport(all_airports, target_airport['ident'])
        
        stage = stages[i]
        num_stops = stage.get('stops', 0) if stage['type'] == 'route_with_stop' else 0
        
        if num_stops > 0:
            route = find_route_with_stops(start_airport, end_airport, all_airports, num_stops)
            distance = total_route_distance(route)
        else:
            distance = calc_distance(start_airport, end_airport)
        
        total_mission_co2 += calculate_co2(distance)
        current_pos = target_airport['ident']
    
    MAX_CO2 = round(total_mission_co2 * 1.2) 
    
    print(f"\n📋 YOUR MISSION:")
    print(f"   You must visit {len(mission_countries)} countries")
    print(f"   CO2 Budget: {MAX_CO2} kg")
    print(f"\n🗺️  Your destination tips:")
    for i, (code, name) in enumerate(mission_countries, 1):
        tip = country_tips[code]
        print(f"   Stage {i}: {tip}")
    
    return mission_countries, MAX_CO2
    
def stage_guess_country(country_tips, user_input, get_country_airports, selected_country=None):
    countries_with_tips = get_countries_with_tips(country_tips)
    random_code, random_name = selected_country
    tip = country_tips[random_code]
    print(f"\n🌍 Country tip: {tip}")

    if ask_with_attempts("Guess the country code (or press 'H' for all list of countries): ", random_code, on_help=show_country_list):
        print(f"✅ Correct {random_code} - {random_name}! Proceeding...")
    else:
        print(f"❌ Wrong! The correct answer was: {random_code} - {random_name}")
        global MAX_CO2
        MAX_CO2 *= 0.95
        print(f"   ❗ Penalty applied! New CO2 budget: {MAX_CO2:.1f} kg")
    country_airports = get_country_airports(random_code)
    return random_code, random_name, country_airports

def show_country_list():
    countries_with_tips = get_countries_with_tips(country_tips)
    print("\nAvailable countries:")
    for i, (code, name) in enumerate(countries_with_tips, 1):
        print(f"   {i:2}. {code} - {name}")
    return
        
def show_full_country_list():
    print("\nAvailable countries:")
    for i, (code, name) in enumerate(countries, 1):
        print(f"   {i:2}. {code} - {name}")
    return

def results_output(stage_index, total_flights, distance, co2):
    results = [
        ("Level passed", stage_index),
        ("Total flights", total_flights),
        ("Total distance, km", round(distance)),
        ("Total CO2, kg", round(co2)),
    ]

    print("Your game results:")
    print("-" * 42)
    for label, value in results:
        print(f"| {label:<25} | {value:>10} |")
        print("-" * 42)
    return

def end_game(user_name, date, stage_index, total_flights, total_co2, game_status, flight_history):
    print(f"\n🏁 GAME OVER!")
    print(f"   Status: {game_status}")
    print(f"   Final CO2: {total_co2:.1f}kg")
    print(f"   Total flights: {total_flights}")
    levels_passed = stage_index or 0
    results_output(levels_passed, total_flights, sum(f['distance'] for f in flight_history), total_co2)
    db_table_creator()
    results_to_db(user_name, date, levels_passed, total_flights, sum(f['distance'] for f in flight_history), total_co2, game_status)
    print(f"results_to_db({user_name}, {date}, {levels_passed}, {total_flights}, {sum(f['distance'] for f in flight_history)}, {total_co2}, {game_status})")
    print(f"Results saved to database")
    return

date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# === Main program ===
def main():
    welcome_message = """
🛩️  ===== FLIGHT GAME - ROUTE PLANNER =====
Plan your flights wisely to stay within CO2 and flight limits!
    """
    print(welcome_message)

    storyDialog = input('Do you want to read the background story? (Y/N): ')
    if storyDialog.strip().upper() == 'Y':
        for line in story.getStory():
            print(line)

    print("Loading airports...")
    all_airports = get_all_airports()
    print(f"✅ Loaded {len(all_airports)} airports")
    show_map(all_airports)
    
    user_name = user_input('Give your name: ')
    if user_name == 'quit_game':
        game_status = "Quit"
        end_game(user_name, date, 0, 0, 0, game_status, [])
        return
    print(f"Welcome {user_name}! 🎮")
    
    stages = create_stages()
    global MAX_CO2
    mission_countries, MAX_CO2 = generate_mission(all_airports, country_tips)
    
    current_location = "EFHK"  # Helsinki
    total_co2 = 0
    total_flights = 0
    flight_history = []
    game_status = None

    for stage_index, stage in enumerate(stages, 1):
        print(f"\n--- Stage {stage_index}/{len(stages)} ---")
        starting_airport = find_airport(all_airports, current_location)
        print(f"\n📍 Current location: {starting_airport['name']} ({starting_airport['country']})")
        country_code, country_name, country_airports = stage_guess_country(country_tips, user_input, get_airports_by_country, mission_countries[stage_index - 1])
        print(f"\n🛬 Airports in {country_name}:")
        for i, airport in enumerate(country_airports, 1):
            print(f"   {i:2}. {airport['ident']} - {airport['name']} ({airport['city']})")

        if stage['type'] == 'guess_country':
            num_stops = 0
        elif stage['type'] == 'route_with_stop':
            num_stops = stage.get('stops', stage_index)
            print(f"\n✈️  Stage: Plan a route with {num_stops} stop(s).")
        
        # Choose destination
        while True:
            try:
                airport_choice = user_input('\nChoose airport number to fly to: ')
                if airport_choice == 'quit_game':
                    game_status = "Quit"
                    end_game(user_name, date, stage_index, total_flights, total_co2, game_status, flight_history)
                    return
                airport_choice = int(airport_choice) - 1
                if not 0 <= airport_choice < len(country_airports):
                    print("❌ Invalid choice!")
                    continue
                destination_code = country_airports[airport_choice]['ident']
                destination_name = country_airports[airport_choice]['name']
                break
            except ValueError:
                print("❌ Please enter a valid number!")
                continue         
        
        start_airport = find_airport(all_airports, current_location)
        end_airport = find_airport(all_airports, destination_code)
        
        if start_airport['ident'] == end_airport['ident']:
            print("❌ Start and destination airports must be different. Please start again.")
            continue

        print(f"\n🔍 Planning route from {start_airport['name']} to {destination_name}...")
        if num_stops > 0:
            print(f"   Finding {num_stops} optimal stops...")
            route = find_route_with_stops(start_airport, end_airport, all_airports, num_stops)
            print(route)
            route_countries = " - ".join([airport['country'] for airport in route])
            print(f"{route_countries}")

            for i in range(1, len(route) - 1):
                stop_number = i
                stop_country_code = route[i]['country']
                stop_country_name = show_countries(stop_country_code)
                if ask_with_attempts(f"Guess the country code for stop {stop_number} (city name {route[i]['city']}): ", stop_country_code, on_help=show_full_country_list):
                    print(f"✅ Correct  {stop_country_code} - {stop_country_name} ({route[i]['name']})! Proceeding...")
                else:
                    print(f"❌ Wrong! The correct answer was: {stop_country_code} - {stop_country_name} ({route[i]['name']})")
                    MAX_CO2 *= 0.95
                    print(f"   ❗ Penalty applied! New CO2 budget: {MAX_CO2:.1f} kg")
                continue

            route_distance = total_route_distance(route)
            route_co2 = calculate_co2(route_distance)
        else:
            route = [start_airport, end_airport]
            route_distance = calc_distance(start_airport, end_airport)
            route_co2 = calculate_co2(route_distance)
        
        print(f"\n✈️  Planned route:")
        print(f"   Direct distance: {calc_distance(start_airport, end_airport):.0f} km")
        print(f"   More than direct distance: {route_distance - calc_distance(start_airport, end_airport):.0f} km extra")
        print(f"📏 Total distance: {route_distance:.0f} km")
        print(f"💨 CO2 emissions: {route_co2:.1f} kg")
        
        for i, airport in enumerate(route):
            if i == 0:
                print(f"   🛫 START: {airport['ident']} - {airport['name']} {airport['country']}")
            elif i == len(route) - 1:
                print(f"   🛬 END:   {airport['ident']} - {airport['name']} {airport['country']}")
            else:
                print(f"   🔄 STOP:  {airport['ident']} - {airport['name']} {airport['country']}")

        # Check if this would exceed limits
        projected_co2 = total_co2 + route_co2
        projected_flights = total_flights + len(route) - 1
        
        print(f"\n📊 Impact:")
        print(f"   CO2: {projected_co2:.1f}kg / {round(MAX_CO2)}kg max")
        print(f"   Flights in this trip: {len(route) - 1}")
        print(f"   Total flights: {projected_flights}")

        total_co2 += route_co2
        total_flights += len(route) - 1 

        if projected_co2 > MAX_CO2:
            print(f"\n❌ GAME OVER - limits exceeded!")
            game_status = "Lose"
            break
            
        flight_history.append({
            'route': route,
            'distance': route_distance,
            'co2': route_co2
        })
        
        print(f"\n🎯 Trip completed!")
        current_location = destination_code

        if stage_index >= len(stages):
            game_status = "Win"
            print("\n🎉 CONGRATULATIONS - YOU WON THE GAME!")
            break

        print(f"\n📍 New location updated to: {destination_name} ({current_location})")

        continue_game = user_input("\nContinue to next destination? (y/n): ").lower()
        if continue_game == 'quit_game' or continue_game == 'n':
            game_status = "Quit"
            break

    # Game summary
    end_game(user_name, date, stage_index, total_flights, total_co2, game_status, flight_history)

if yhteys.is_connected():
    print("✅ Successfully connected to database!")
    main()
else:
    print("❌ Failed to connect to database!")