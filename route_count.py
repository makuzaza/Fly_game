from geopy import distance
import folium
import os

# ==== Function: Get all airports ====
def get_all_airports(yhteys):
    """Get all large airports with coordinates"""
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

# ==== Function: Get airports by country ====
def get_airports_by_country(yhteys, country_code):
    """Get airports in a specific country"""
    sql = f"SELECT ident, name, municipality FROM airport WHERE iso_country='{country_code}' AND type IN ('large_airport') ORDER BY name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()
    
    airports = []
    for row in result:
        airports.append({
            'ident': row[0],
            'name': row[1],
            'city': row[2] or 'N/A'
        })
    return airports

# ==== Function: Find airport by code ====
def find_airport(airports, code):
    """Find airport by ICAO code"""
    for airport in airports:
        if airport['ident'].upper() == code.upper():
            return airport
    return None

# ==== Function: Get coordination ====
def search_coordination(icao):
    """Get coordinates for airport"""
    sql = f"SELECT latitude_deg, longitude_deg FROM airport WHERE ident='{icao}'"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()

    if cursor.rowcount > 0:
        for line in result:
            coord = [line[0], line[1]]
        return coord
    return None

# ==== Function: Calculate CO2 emissions ====
def calculate_co2(distance_km):
    """Calculate CO2 emissions for flight distance (simplified)"""
    # Rough estimate: 0.25 kg CO2 per km per passenger
    return distance_km * 0.25

# ==== Route Planning Functions ====
def calc_distance(airport1, airport2):
    """Calculate distance between airports"""
    return distance.distance((airport1['lat'], airport1['lng']), 
                           (airport2['lat'], airport2['lng'])).kilometers

def total_route_distance(route):
    """Calculate total distance for route"""
    total = 0
    for i in range(len(route) - 1):
        total += calc_distance(route[i], route[i + 1])
    return total

def find_route_with_stops(start_airport, end_airport, all_airports, num_stops):
    """Find optimal route with specified number of stops"""
    if num_stops == 0:
        return [start_airport, end_airport]

    # Find candidate airports (not too far from direct route)
    direct_dist = calc_distance(start_airport, end_airport)
    candidates = []

    for airport in all_airports:
        if airport['ident'] in [start_airport['ident'], end_airport['ident']]:
            continue
        via_dist = calc_distance(start_airport, airport) + calc_distance(airport, end_airport)
        if via_dist - direct_dist <= 1000:  # Max 1000km detour
            candidates.append(airport)

    # If not enough candidates for the requested number of stops, return None
    if len(candidates) < num_stops:
        print(f"❌ Not enough candidate airports for {num_stops} stops. Only {len(candidates)} available.")
        return None

    # Select best stops
    if num_stops <= 3 and len(candidates) <= 15:
        # Small numbers: try combinations
        from itertools import combinations, permutations
        best_route = None
        best_distance = float('inf')

        for stop_combo in combinations(candidates[:15], num_stops):
            # Try all orders
            for perm in permutations(stop_combo):
                route = [start_airport] + list(perm) + [end_airport]
                dist = total_route_distance(route)
                if dist < best_distance:
                    best_distance = dist
                    best_route = route
        return best_route

    else:
        # Greedy selection for larger numbers
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

# === Function: Display available countries ===
def show_countries(yhteys):
    """Show available countries with airports"""
    sql = "SELECT DISTINCT country.iso_country, country.name FROM airport, country WHERE airport.iso_country = country.iso_country AND airport.type IN ('large_airport') ORDER BY country.name;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    countries = cursor.fetchall()
    
    print("\n🌍 Available countries:")
    for i, (country_code, country_name) in enumerate(countries, 1):
        print(f"   {i:2}. {country_name}")

    return countries

def showMap(coordinates, output_file='map.html'):
    if os.path.exists(output_file):
        print(f"Map '{output_file}' already exists. Skipping creation.")
        return
    map = folium.Map(location=[coordinates[0]['lat'], coordinates[0]['lng']], zoom_start=5)
    folium.Marker(
        location=[coordinates[0]['lat'], coordinates[0]['lng']],
        popup=coordinates[0]['name'],
        icon=folium.Icon(color='green', icon='info-sign')
    ).add_to(map)
    print(f"Adding {len(coordinates)} markers to the map...")

    for i in range(1, len(coordinates)):
        folium.Marker(
            location=[coordinates[i]['lat'], coordinates[i]['lng']],
            popup=f"{coordinates[i]['name']}<br><b>{coordinates[i]['ident']}</b><br>{coordinates[i]['city']}, {coordinates[i]['country']}",
        ).add_to(map)

    # folium.PolyLine(
    #     locations=[
    #         [coordinates[0]['lat'], coordinates[0]['lng']],
    #         [coordinates[-1]['lat'], coordinates[-1]['lng']]
    #     ],
    #     color='blue',
    #     weight=2,
    #     opacity=0.7
    # ).add_to(map)

    map.save('map.html')
