from geopy import distance
import folium
import os
from folium.plugins import Search
from db import get_connection

yhteys = get_connection()

def get_all_airports():
    sql = "SELECT ident, name, latitude_deg, longitude_deg, municipality, iso_country FROM airport WHERE type IN ('large_airport') AND name NOT LIKE '%CLICK HERE%' ORDER BY name;"
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

def get_airports_by_country(country_code):
    sql = f"SELECT ident, name, municipality FROM airport WHERE iso_country='{country_code}' AND type IN ('large_airport') AND name NOT LIKE '%CLICK HERE%' ORDER BY name;"
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

def find_airport(airports, code):
    for airport in airports:
        if airport['ident'].upper() == code.upper():
            return airport
    return None

def calculate_co2(distance_km):
    return distance_km * 0.25

def calc_distance(airport1, airport2):
    return distance.distance((airport1['lat'], airport1['lng']), 
                           (airport2['lat'], airport2['lng'])).kilometers

def total_route_distance(route):
    total = 0
    for i in range(len(route) - 1):
        total += calc_distance(route[i], route[i + 1])
    return total

def find_route_with_stops(start_airport, end_airport, all_airports, num_stops):
    if num_stops == 0:
        return [start_airport, end_airport]

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
        current_pos = start_airport
        remaining = candidates[:30]  # Limit candidates

        for i in range(num_stops):
            if not remaining:
                break

            progress_candidates = [
                a for a in remaining 
                if calc_distance(a, end_airport) < calc_distance(current_pos, end_airport)
            ]
            if not progress_candidates:
                progress_candidates = remaining

            best_stop = min(progress_candidates, key=lambda x: calc_distance(current_pos, x))
            selected.append(best_stop)
            remaining.remove(best_stop)
            current_pos = best_stop

        return [start_airport] + selected + [end_airport]

def show_countries(country_code=None):
    if country_code:
        sql = "SELECT country.iso_country, country.name FROM country WHERE country.iso_country = %s;"
        cursor = yhteys.cursor()
        cursor.execute(sql, (country_code,))
        result = cursor.fetchone()
        return result[1] if result else country_code
    else:
        sql = "SELECT DISTINCT country.iso_country, country.name FROM airport, country WHERE airport.iso_country = country.iso_country AND airport.type IN ('large_airport') ORDER BY country.name;"
        cursor = yhteys.cursor()
        cursor.execute(sql)
        countries = cursor.fetchall()
        return countries

def show_map(coordinates, output_file='map.html'):
    if os.path.exists(output_file):
        print(f"Map '{output_file}' already exists. Skipping creation.")
        return
    map = folium.Map(location=[coordinates[0]['lat'], coordinates[0]['lng']], zoom_start=5)
    marker_group = folium.FeatureGroup(name="Airports")

    for airport in coordinates:
        marker = folium.Marker(
            location=[airport['lat'], airport['lng']],
            popup=f"{airport['name']}<br><b>{airport['ident']}</b><br>{airport['city']}, {airport['country']}",
            tooltip=airport['ident'],
            icon=folium.Icon(color='blue', icon='plane', prefix='fa')
        )
        marker.options['name'] = f"{airport['ident']} - {airport['name']} - {airport['city']}"
        marker.add_to(marker_group)

    marker_group.add_to(map)

    Search(
        layer=marker_group,
        search_label='name',
        placeholder='Search by name, city or ICAO code',
        collapsed=False,
        search_zoom=7,
        casesensitive=False
    ).add_to(map)

    map.save('map.html')
