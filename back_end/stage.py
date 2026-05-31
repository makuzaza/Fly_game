import random
from itertools import permutations
from tips_countries import tips_countries


class Stage:
    def __init__(self, level):
        self.level = level

    def task_criteria(self, session_state, airport_manager):
        session_state['current_stage'] += 1

        selected_countries = random.sample(list(tips_countries.keys()), 3)

        places = {}
        for country_code in selected_countries:
            country_airports = [
                a for a in airport_manager.all_airports
                if a.country.upper() == country_code.upper()
            ]
            if country_airports:
                places[country_code] = random.choice(country_airports).ident
            else:
                print(f"⚠️ No large airport found for {country_code}. Skipping.")

        session_state['places'] = places

        best_order = self.get_shortest_route(session_state, airport_manager)
        session_state['co2_available'] = best_order['co2_with_margin']

        return session_state

    def calc_co2_emmission(self, distance_km):
        return distance_km * 0.15

    def get_shortest_route(self, session_state, airport_manager, margin=1.2):
        places = session_state.get('places', {})
        if not places or len(places) < 2:
            print("⚠️ Not enough places to calculate best route.")
            return None

        start_airport = airport_manager.find_airport(session_state.get('origin'))

        dest_airports = []
        for country, icao in places.items():
            airport = airport_manager.find_airport(icao)
            if airport:
                dest_airports.append((country, airport))
            else:
                print(f"⚠️ Airport {icao} for {country} not found.")
                return None

        best_route, best_distance, best_order_countries = None, 10000000000, None

        for perm in permutations(dest_airports):
            route = [start_airport] + [airport for _, airport in perm]
            dist = airport_manager.total_route_distance(route)
            if dist < best_distance:
                best_distance = dist
                best_route = route
                best_order_countries = [country for country, _ in perm]

        total_co2 = self.calc_co2_emmission(best_distance)

        return {
            'route': best_route,
            'order_countries': best_order_countries,
            'total_distance': best_distance,
            'total_co2': total_co2,
            'co2_with_margin': total_co2 * margin,
        }
