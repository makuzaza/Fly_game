from db import get_connection
from geopy import distance

yhteys = get_connection()

# ==== Calculate distance between two airports ====
def calc_distance(airport1, airport2):
    return distance.distance((airport1['lat'], airport1['lng']), (airport2['lat'], airport2['lng'])).kilometers

# === Calculate total distance for route ===
def total_route_distance(route):
    total = 0
    for i in range(len(route) - 1):
        total += calc_distance(route[i], route[i + 1])
    return total

# === Find airport by ICAO code ===
def find_airport(airports, code):
    for airport in airports:
        if airport['ident'].upper() == code.upper():
            return airport
    return None

# === Get all airports from DB ===
def get_all_airports():
    sql = "SELECT ident, name, latitude_deg, longitude_deg, municipality, iso_country FROM airport WHERE type IN ('large_airport') ORDER BY name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()
    
    airports = []
    for row in result:
        airports.append({
            'ident': row[0],
            'name': row[1],
            'lat': row[2],
            'lng': row[3],
            'city': row[4] or 'N/A',
            'country': row[5]
        })
    return airports

# === Get airports in a specific country ===
def get_airports_by_country(country_code):
    sql = f"SELECT DISTINCT airport.ident, airport.name, airport.municipality, country.iso_country, country.name FROM airport, country WHERE airport.iso_country = country.iso_country AND airport.type IN ('large_airport') AND country.iso_country = '{country_code}' ORDER BY airport.name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()
    
    airports = []
    for row in result:
        airports.append({
            'ident': row[0],
            'name': row[1],
            'city': row[2] or 'N/A',
            'country_code': row[3],
            'country_name': row[4]
        })
    return airports

# === Main Function: Find optimal route with specified number of stops ===
def find_route_with_stops(start_airport, end_airport, num_stops=0):
    if num_stops == 0:
        return [start_airport, end_airport]

    # === Find candidate airports (not too far from direct route) ===
    direct_dist = calc_distance(start_airport, end_airport)
    candidates = []

    all_airports = get_all_airports()
    for airport in all_airports:
        if airport['ident'] in [start_airport['ident'], end_airport['ident']]:
            continue
        via_dist = calc_distance(start_airport, airport) + calc_distance(airport, end_airport)
        if via_dist - direct_dist <= 1000:  # Max 1000km detour
            candidates.append(airport)

    # === If not enough candidates for the requested number of stops, return None ===
    if len(candidates) < num_stops:
        print(f"❌ Not enough candidate airports for {num_stops} stops. Only {len(candidates)} available.")
        return None

    # === Select best stops ===
    if num_stops <= 3 and len(candidates) <= 15:
        # === Small numbers: try combinations ===
        from itertools import combinations, permutations
        best_route = None
        best_distance = float('inf')

        for stop_combo in combinations(candidates[:15], num_stops):
            # === Try all orders ===
            for perm in permutations(stop_combo):
                route = [start_airport] + list(perm) + [end_airport]
                dist = total_route_distance(route)
                if dist < best_distance:
                    best_distance = dist
                    best_route = route
        return best_route

    else:
        # === Greedy selection for larger numbers ===
        selected = []
        remaining = candidates[:20]  # Limit candidates

        for _ in range(num_stops):
            if not remaining:
                break
            best_stop = min(remaining, 
                          key=lambda x: total_route_distance([start_airport] + selected + [x] + [end_airport]))
            selected.append(best_stop)
            remaining.remove(best_stop)

        return [start_airport] + selected + [end_airport]

# === Show available countries with airports ===
def show_countries(yhteys):
    sql = "SELECT DISTINCT country.iso_country, country.name FROM airport, country WHERE airport.iso_country = country.iso_country AND airport.type IN ('large_airport') ORDER BY country.name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    countries = cursor.fetchall()

    return countries