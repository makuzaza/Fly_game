from airport import AirportManager
from stages import task_criteria, calc_co2_emmission
from tips_countries import tips_countries
from db_updating import db_table_creator, results_to_db
from datetime import datetime
from db import get_connection
import copy

class Game:
    def __init__(self, player_name):
        self.player_name = player_name
        self.yhteys = get_connection()
        self.airport_manager = AirportManager()

        self.session = {
            "origin": "EFHK",
            "destination": "",
            "current_stage": 0,
            "co2_available": 0,
            "places": {},
            "game_status": None,
        }

        self.total = {
            "total_distance": 0.0,
            "total_co2": 0,
            "total_flights": 0,
            "flight_history": []
        }

    def get_country_name(self, code):
        for c, name in self.airport_manager.show_countries() or []:
            if c.upper() == code.upper():
                return name
        return code.upper()

    def stage_guess_country(self, country_code):
        if not country_code:
            return None, None, []

        icao = country_code.upper()
        display_name = self.get_country_name(icao)
        country_airports = self.airport_manager.get_airports_by_country(icao)

        return icao, display_name, country_airports

    def start(self):
        print("\n🛫 Welcome to the Flight Route Game!\n")

        self.session["current_stage"] = 0
        replay_count = 0

        while self.session["current_stage"] < 5:
            if self.session["game_status"] in ("Lose", "Quit"):
                break

            backup_session = copy.deepcopy(self.session)
            backup_total = copy.deepcopy(self.total)

            task_criteria(self.session, self.airport_manager)

            print(f"\n===== STAGE {self.session['current_stage']} =====")
            print(f"You have {self.session['co2_available']:.2f} kg CO2 available")
            print("Countries to guess:", ", ".join(self.session["places"].keys()))

            countries_to_visit = list(self.session["places"].keys())

            while countries_to_visit:
                print("\n🕵️ Clues:")
                for c in countries_to_visit:
                    print(f"{c}: {tips_countries.get(c, 'No clue.')}")

                matched_country = None
                attempts = 0

                while True:
                    user_guess = input("\nGuess country code: ").strip().upper()
                    if user_guess == "X":
                        self.session["game_status"] = "Quit"
                        break

                    if user_guess in countries_to_visit:
                        matched_country = user_guess
                        print("✅ Correct!")
                        break

                    attempts += 1
                    if attempts >= 3:
                        correct_code = countries_to_visit[0]
                        print(f"🤖 Tip: Correct country = {correct_code}")
                        attempts = 0
                    else:
                        print("❌ Wrong. Try again!")

                if matched_country is None:
                    break

                icao, cname, airports = self.stage_guess_country(matched_country)
                if not airports:
                    print("❌ No airports found.")
                    continue

                print(f"\nAirports in {cname}:")
                for i, a in enumerate(airports, 1):
                    print(f"{i}. {a.ident} - {a.name} ({a.city})")

                while True:
                    try:
                        pick = int(input("Choose airport number: ")) - 1
                        if 0 <= pick < len(airports):
                            dest_code = airports[pick].ident
                            break
                        print("Invalid number.")
                    except:
                        print("Enter a number!")

                origin = self.airport_manager.find_airport(self.session["origin"])
                dest = self.airport_manager.find_airport(dest_code)

                route = self.airport_manager.find_route_with_stops(origin, dest, 2)
                if not route:
                    print("❌ No valid route.")
                    continue

                dist = self.airport_manager.total_route_distance(route)
                co2 = calc_co2_emmission(dist)

                print(f"\nRoute distance: {dist:.1f} km")
                print(f"CO2 required: {co2:.2f}")

                if co2 > self.session["co2_available"]:
                    print("❌ Not enough CO2!")
                    print("You must replay this stage.")

                    replay_count += 1
                    if replay_count > 3:
                        self.session["game_status"] = "Lose"
                        break

                    self.session = copy.deepcopy(backup_session)
                    self.total = copy.deepcopy(backup_total)
                    continue

                self.session["co2_available"] -= co2
                self.session["origin"] = dest_code
                countries_to_visit.remove(matched_country)

                self.total["total_distance"] += dist
                self.total["total_co2"] += co2
                self.total["total_flights"] += len(route) - 1
                self.total["flight_history"].append({
                    "route": [a.ident for a in route],
                    "distance": dist,
                    "co2": co2
                })

                print(f"🎯 Arrived! CO2 left: {self.session['co2_available']:.2f}")

        self.end_game()
        return

    def end_game(self):
        print("\n===== GAME OVER =====")
        print(f"Total distance: {self.total['total_distance']:.1f} km")
        print(f"Total CO2: {self.total['total_co2']:.2f} kg")
        print(f"Flights: {self.total['total_flights']}")

        db_table_creator()
        date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        results_to_db(
            self.player_name,
            date,
            self.session["current_stage"],
            len(self.total["flight_history"]),
            self.total["total_distance"],
            self.total["total_co2"],
            self.session["game_status"],
        )

        print("Results saved to database.")
