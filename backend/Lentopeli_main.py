from db import *
from stages import *
from db_updating import *
from tips_countries import tips_countries
import rules
import copy
from show_map import showMap
from datetime import datetime
from airport import AirportManager

yhteys = get_connection()
airport_manager = AirportManager()
all_airports = airport_manager.get_all_airports()

# === Ask user input ===
def user_input(question: str, session_state: dict):
    u_input = input(question)
    if quit_input(u_input):
        session_state['game_status'] = 'Quit'
    return u_input

def quit_input(u_input: str):
    return u_input.lower() in ('x', 'quit')

def get_country_name(code):
    for c, name in airport_manager.show_countries() or []:
        if c.upper() == code.upper():
            return name
    return code.upper()

# === Print the table of user's results to the screen ===
def results_output(levels, countries_visited, dist, co2):
    # === A list with output values, it is easy to add new rows ===
    results = [
        ("Level passed", levels),
        ("Countries visited", countries_visited),
        ("Total distance, km", round(dist)),
        ("Total CO2, kg", round(co2)),
    ]

    print("Your game results:")
    print("-" * 42)
    for label, value in results:
        print(f"| {label:<25} | {value:>10} |")
        print("-" * 42)
    return

def stage_guess_country(yhteys, country_code, airport_manager):
    if not country_code:
        return None, None, []

    # === Get mapping from DB once ===
    icao = country_code.upper()
    display_name = get_country_name(icao)

    country_airports = airport_manager.get_airports_by_country(icao) 

    if not country_airports:
        print(f"❌ No airports found for {display_name}")
        return None, None, []

    return icao, display_name, country_airports

def end_of_game(user_name, stage, flight_history, t_distance,co2, status):
    # === Print output to the console ===
    results_output(stage, flight_history, t_distance, co2)

    # === Add table "results" to the Database ===
    db_table_creator()

    # === Add game results to the DB table "results" ===
    date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # === Check, if data was written to the Database ===
    if results_to_db(user_name, date, stage, flight_history, t_distance, co2, status):
        print("✅ Your records are added successfully to the database!")
    else:
        print("❌ Something went wrong!.")

    print("See you next time!")
    return

def main():
    # === Game initializer ===
    if not yhteys.is_connected() or not all_airports:
        print("❌ Failed to connect to database, or to download the airports!")
        return

    showMap(airport_manager.all_airports)
    print("✅ Successfully connected to database and downloaded the airports for routes!")

    # === Game session states ===
    session_state = {
        "origin": 'EFHK',
        "destination": "",
        "current_stage": 0,
        "co2_available": 0,
        "places": {},
        "game_status": None
    }

    total_state = {
        "total_distance": 0.0,
        "total_co2": 0,
        "total_flights": 0,
        "flight_history": []
    }

    # === Game Constants ===
    welcome_message = """
        🛩️  ===== FLIGHT GAME - ROUTE PLANNER =====
        Plan your flights wisely to stay within CO2 and flight limits!
    """

    # === Game flow ===
    print(welcome_message)
    # === Ask to show the game rules ===
    story_dialog = user_input('Do you want to read the background story? (Y): ', session_state)
    if story_dialog.strip().upper() == 'Y':
        # === Print strings line by line ===
        for line in rules.get_story():
            print(line)

    user_name = user_input('Give your name: ', session_state)
    print(f"Welcome {user_name}! 🎮")

    # === Create counter for max 3 replaying ===
    replay_count = 0

    # === Start of level ===
    while session_state['current_stage'] < 5:
        if session_state["game_status"] in ("Lose", "Quit"):
            break

        # === Save values for replaying ===
        backup_state = copy.deepcopy(session_state)
        backup_total = copy.deepcopy(total_state)

        starting_airport = airport_manager.find_airport(session_state['origin'])

        print(f"\n📍 Starting location: {starting_airport.name} ({starting_airport.country})")

        # === Generate task and update session_state ===
        task_criteria(session_state, airport_manager)

        print(f"🗺️  This is your {session_state['current_stage']} mission: ")
        print(f"💨 You have {session_state['co2_available']:.2f} kg of CO2 available")
        print(f" and you have to visit {len(session_state['places'])} countries")

        countries_to_visit = list(session_state['places'].keys())

        # === Loop for 3 countries ===
        while countries_to_visit:
            print(f"\n🕵️  Clues:")
            for i, country in enumerate(countries_to_visit, start=1):
                clue = tips_countries.get(country, "No clue available.")
                print(f"{i}. {clue}")

            # === Guessing system with 3 wrong attempts ===
            attempts = 0
            matched_country = None

            while True:
                country_code_guess = user_input('\nGuess the country code: ', session_state).strip().upper()
                if session_state["game_status"] == "Quit":
                    break

                    # Check if the guessed country matches one of the targets
                for country in countries_to_visit:
                    if country_code_guess == country.upper():
                        matched_country = country
                        print("✅ Correct!")
                        break

                if matched_country:
                    break  # Exit loop when correct

                attempts += 1
                if attempts >= 3:
                    # Reveal the correct country after 3 wrong guesses (but do NOT auto-select it)
                    correct_country_code = countries_to_visit[0]
                    correct_country_name = get_country_name(correct_country_code)
                    print(f"🤖 Tip unlocked! The correct country is: {correct_country_name} ({correct_country_code})")
                    print("You can now type it to continue.")
                    attempts = 0  # optional: reset attempts so they can keep guessing
                else:
                    print(f"❌ Wrong guess. Try again. ({attempts}/3)")

            if matched_country is None:
                break

            country_code, country_name, country_airports = stage_guess_country(yhteys, matched_country, airport_manager)
            if not country_airports:
                print(f"❌ No airports found for {matched_country}. Try another country.")
                continue  # Ask again

            print(f"\n🛬 Airports in {country_name} ({country_code}):")
            for i, airport in enumerate(country_airports, 1):
                print(f"   {i:2}. {airport.ident} - {airport.name} ({airport.city})")

        # === Choose destination ===
            while True:
                try:
                    airport_choice = int(user_input('\nChoose airport number to fly to: ', session_state)) - 1
                    if not 0 <= airport_choice < len(country_airports):
                        print("❌ Invalid choice!")
                        continue
                    destination_code = country_airports[airport_choice].ident
                    destination_name = country_airports[airport_choice].name
                    break
                except ValueError:
                    print("❌ Please enter a valid number!")
                continue      

            destination_airport = airport_manager.find_airport(destination_code)
            origin_airport = airport_manager.find_airport(session_state['origin'])
            
            if not destination_airport or not origin_airport:
                print("❌ Could not find airport details.")
                continue

            # === Find optimal route with specified number of stops ===
            print(f"\n🛫 Planning route from {origin_airport.name} to {destination_airport.name}...")
            route = airport_manager.find_route_with_stops(origin_airport, destination_airport, 2) # # Hardcoded 2 stops for now in the future will the the value set by a function that automatically set the stops based on the distance.

            if not route:
                print("❌ Could not find a valid route.")
                continue

            route_distance = airport_manager.total_route_distance(route)
            route_co2 = calc_co2_emmission(route_distance)

            # === ROUTE SUMMARY ===
            # === If level passed, it will be added to total amounts. If level replayed, it will move to 0 ===
            print(f"\n📍 Route Summary:")
            print(f"   Distance: {route_distance:.0f} km")
            print(f"   CO2 Required: {route_co2:.2f} kg")
            print(f"   CO2 Remaining: {session_state['co2_available']:.2f} kg")

            for i, airport in enumerate(route):
                if i == 0:
                    print(f"   🛫 START: {airport.ident} - {airport.name}")
                elif i == len(route) - 1:
                    print(f"   🛬 END:   {airport.ident} - {airport.name}")
                else:
                    print(f"   🔄 STOP:  {airport.ident} - {airport.name}")
            # === Update game session state after completing a route ===
            # === These needed for a results table ===
            session_state['co2_available'] -= route_co2

            if session_state['co2_available'] >= 0:

                session_state['origin'] = destination_code
                countries_to_visit.remove(matched_country)  # Remove guessed country
                total_state["total_distance"] += route_distance
                total_state["total_co2"] += route_co2
                total_state["total_flights"] += len(route) - 1
                total_state["flight_history"].append({
                    'route': route,
                    'co2': route_co2,
                    'distance': route_distance,
                })

                print(f"🎯 Arrived at {matched_country}. CO2 left: {session_state['co2_available']:.2f} kg")
                session_state["game_status"] = "Win"
            else:
                session_state['current_stage'] -= 1
                print("❌ Your plane was unable to reach its destination.")
                if replay_count < 3:
                    print(f"You still have {3-replay_count} tries to replay.")
                    replay_level = user_input("🛫 Do you want to replay this stage? (y): ", session_state)
                    if replay_level.strip().lower() == "y":
                        session_state["game_status"] = "Replay"
                        break
                    else:
                        session_state["game_status"] = "Lose"
                        break
                else:
                    session_state["game_status"] = "Lose"
                    break

        # === Choices: win, replay, lose ===
        if session_state["game_status"] == "Win":
            replay_count = 0
            print("\n🎉 Mission complete!")
        elif session_state["game_status"] == "Replay":
            replay_count += 1
            session_state = copy.deepcopy(backup_state)
            total_state = copy.deepcopy(backup_total)
            print(f"This is your {replay_count} replaying.")
            continue
        elif session_state["game_status"] == "Lose":
            print("Next time might be your chance!")
        elif session_state["game_status"] == "Quit":
            session_state['current_stage'] -= 1
            print("Let's play another time again!")

    # === END OF THE GAME ===
    end_of_game(user_name, session_state['current_stage'], len(total_state["flight_history"]), total_state["total_distance"], total_state["total_co2"], session_state['game_status'])

main()
