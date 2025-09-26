import mysql.connector
import os
from dotenv import load_dotenv
import random
from geopy import distance

# Load environment variables
load_dotenv()

# ===  Constants ====
DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT'))
DB_LENTO_PELI = os.getenv('DB_LENTO_PELI')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')

# ===  DB connection ====
yhteys = mysql.connector.connect(
    host= DB_HOST,
    port= DB_PORT,
    database= DB_LENTO_PELI,
    user= DB_USER,
    password= DB_PASSWORD,
    autocommit=True
)

# === Function: automatically defining stage criterias === 
def task_criteria():
    # 0 = Max CO2 consumption, 1= flights, 2= countries
    stages_starter =  (1000, 5, 3) # At least 5 stages
    return stages_starter

# ==== Function: Get all airports ====
def get_all_airports():
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
def get_airports_by_country(country_code):
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

# ==== Function: Distance counter ====
def distance_counter(coord1, coord2):
    """Calculate distance between two coordinates"""
    dist = distance.distance(coord1, coord2).km
    return dist

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
    
    if len(candidates) < num_stops:
        # Not enough good candidates, use closest ones
        candidates = sorted([a for a in all_airports 
                           if a['ident'] not in [start_airport['ident'], end_airport['ident']]], 
                          key=lambda x: calc_distance(start_airport, x))
    
    # Select best stops
    if num_stops <= 3 and len(candidates) <= 15:
        # Small numbers: try combinations
        best_route = None
        best_distance = float('inf')
        
        for stop_combo in combinations(candidates[:15], min(num_stops, len(candidates))):
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
        
        for _ in range(min(num_stops, len(remaining))):
            best_stop = min(remaining, 
                          key=lambda x: total_route_distance([start_airport] + selected + [x] + [end_airport]))
            selected.append(best_stop)
            remaining.remove(best_stop)
        
        return [start_airport] + selected + [end_airport]

# === Function: Display available countries ===
def show_countries():
    """Show available countries with airports"""
    sql = "SELECT DISTINCT iso_country, name FROM airport WHERE type IN ('large_airport') ORDER BY iso_country;"
    cursor = yhteys.cursor()
    cursor.execute(sql)
    countries = cursor.fetchall()
    
    print("\n🌍 Available countries:")
    for i, (code, name) in enumerate(countries, 1):
        print(f"   {i:2}. {name} ({code})")
    
    return countries

# ==== Function: table creator ====

# === Function: ask user input ====
def user_input (question):
    return input(question)

# === Function: Allow user to pass next or keep same if fail task ====
def pass_stage(co2_used, co2_target, flights_used, max_flights):
    """Check if user passes the stage"""
    if co2_used <= co2_target and flights_used <= max_flights:
        print(f"🎉 Congratulations! You passed the stage!")
        print(f"   CO2 used: {co2_used:.1f}kg (limit: {co2_target}kg)")
        print(f"   Flights used: {flights_used} (limit: {max_flights})")
        return True
    else:
        print(f"❌ Stage failed!")
        if co2_used > co2_target:
            print(f"   CO2 exceeded: {co2_used:.1f}kg > {co2_target}kg")
        if flights_used > max_flights:
            print(f"   Too many flights: {flights_used} > {max_flights}")
        return False

# === Main program ===
def main():
    welcome_message = """
🛩️  ===== FLIGHT GAME - ROUTE PLANNER =====
Plan your flights wisely to stay within CO2 and flight limits!
    """
    print(welcome_message)
    
    # Load airports
    print("Loading airports...")
    all_airports = get_all_airports()
    print(f"✅ Loaded {len(all_airports)} airports")
    
    user_name = user_input('Give your name: ')
    print(f"Welcome {user_name}! 🎮")
    
    # Get task criteria
    (co2_target, max_flights, min_countries) = task_criteria()
    print(f"\n📋 Your mission:")
    print(f"   • Max CO2: {co2_target}kg")
    print(f"   • Max flights: {max_flights}")
    print(f"   • Visit at least {min_countries} countries")
    
    # Game variables
    current_location = "EFHK"  # Helsinki
    total_co2 = 0
    total_flights = 0
    visited_countries = set()
    flight_history = []
    
    print(f"\n📍 Starting location: Helsinki, Finland (EFHK)")
    
    while total_flights < max_flights and total_co2 < co2_target:
        print(f"\n" + "="*50)
        print(f"Flight #{total_flights + 1} | CO2: {total_co2:.1f}/{co2_target}kg | Countries: {len(visited_countries)}")
        
        # Show countries
        countries = show_countries()
        
        # Choose country
        try:
            country_choice = int(user_input('\nChoose country number: ')) - 1
            if not 0 <= country_choice < len(countries):
                print("❌ Invalid choice!")
                continue
            
            selected_country = countries[country_choice]
            country_code, country_name = selected_country
            print(f"Selected: {country_code}")
            
        except ValueError:
            print("❌ Please enter a valid number!")
            continue
        
        # Show airports in country
        country_airports = get_airports_by_country(country_code)
        if not country_airports:
            print("❌ No large airports found in this country!")
            continue
        
        print(f"\n🛬 Airports in {country_code}:")
        for i, airport in enumerate(country_airports, 1):
            print(f"   {i:2}. {airport['ident']} - {airport['name']} ({airport['city']})")
        
        # Choose destination
        try:
            airport_choice = int(user_input('\nChoose airport number: ')) - 1
            if not 0 <= airport_choice < len(country_airports):
                print("❌ Invalid choice!")
                continue
            
            destination_code = country_airports[airport_choice]['ident']
            destination_name = country_airports[airport_choice]['name']
            
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
        try:
            num_stops = int(user_input('Number of stops (0-3): ') or "0")
            if not 0 <= num_stops <= 3:
                print("❌ Please enter 0-3 stops")
                continue
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
        print(f"   CO2 after trip: {projected_co2:.1f}/{co2_target}kg")
        print(f"   Flights after trip: {projected_flights}/{max_flights}")
        
        if projected_co2 > co2_target or projected_flights > max_flights:
            print("⚠️  This trip would exceed your limits!")
            continue_choice = user_input("Continue anyway? (y/n): ").lower()
            if continue_choice != 'y':
                continue
        
        # Confirm trip
        confirm = user_input("Take this trip? (y/n): ").lower()
        if confirm != 'y':
            continue
        
        # Execute trip
        total_co2 += route_co2
        total_flights += len(route) - 1  # Number of flight segments
        visited_countries.add(country_code)
        current_location = destination_code
        
        flight_history.append({
            'route': route,
            'distance': route_distance,
            'co2': route_co2
        })
        
        print(f"\n🎯 Trip completed!")
        print(f"   New location: {destination_name}")
        print(f"   Countries visited: {len(visited_countries)}")
        
        # Check game end conditions
        if len(visited_countries) >= min_countries:
            if pass_stage(total_co2, co2_target, total_flights, max_flights):
                break
        
        # Continue or quit
        if total_flights >= max_flights or total_co2 >= co2_target:
            print("❌ Limits reached!")
            break
        
        continue_game = user_input("\nContinue to next destination? (y/n): ").lower()
        if continue_game != 'y':
            break
    
    # Game summary
    print(f"\n🏁 GAME OVER!")
    print(f"   Final CO2: {total_co2:.1f}kg")
    print(f"   Total flights: {total_flights}")
    print(f"   Countries visited: {len(visited_countries)}")

if yhteys.is_connected():
    print("✅ Successfully connected to database!")
    main()
else:
    print("❌ Failed to connect to database!")