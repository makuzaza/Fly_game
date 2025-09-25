import mysql.connector
import math
from geopy.distance import great_circle
import time
from itertools import permutations
import random
from operator import itemgetter

def get_all_airports_with_coords(connection):
    """Get all airports with coordinates from database"""
    cursor = connection.cursor()
    sql = "SELECT ident, name, latitude_deg, longitude_deg, municipality FROM airport WHERE type IN ('large_airport') ORDER BY name;"
    cursor.execute(sql)
    result = cursor.fetchall()
    
    airports = []
    for row in result:
        airports.append({
            'ident': row[0],
            'name': row[1],
            'latitude_deg': row[2],
            'longitude_deg': row[3],
            'municipality': row[4] if row[4] else 'N/A'
        })
    
    return airports

def calculate_distance(airport1, airport2):
    """Calculate distance between two airports in kilometers"""
    coords1 = (airport1['latitude_deg'], airport1['longitude_deg'])
    coords2 = (airport2['latitude_deg'], airport2['longitude_deg'])
    return great_circle(coords1, coords2).kilometers

def find_airport_by_ident(airports, ident_code):
    """Find airport by ident code"""
    for airport in airports:
        if airport['ident'].lower() == ident_code.lower():
            return airport
    return None

def calculate_total_distance(route_airports):
    """Calculate total distance for a route"""
    total = 0
    for i in range(len(route_airports) - 1):
        total += calculate_distance(route_airports[i], route_airports[i + 1])
    return total

def get_airports_along_route(start_airport, end_airport, all_airports, max_deviation=500):
    """Get airports that are reasonably close to the direct route"""
    direct_distance = calculate_distance(start_airport, end_airport)
    candidate_airports = []
    
    for airport in all_airports:
        if airport == start_airport or airport == end_airport:
            continue
        
        # Calculate detour distance (start -> airport -> end)
        detour_distance = (calculate_distance(start_airport, airport) + 
                          calculate_distance(airport, end_airport))
        
        # Only consider airports that don't add too much distance
        if detour_distance - direct_distance <= max_deviation:
            deviation = detour_distance - direct_distance
            candidate_airports.append((airport, deviation))
    
    # Sort by deviation (least detour first)
    # without lambda
    candidate_airports.sort(key=itemgetter(1))
    # candidate_airports.sort(key=lambda x: x[1])
    return [airport for airport, _ in candidate_airports]

def find_best_stops_greedy(start_airport, end_airport, all_airports, num_stops):
    """Find best stops using greedy approach with geographical awareness"""
    if num_stops == 0:
        return []
    
    # Get candidate airports along the route
    candidates = get_airports_along_route(start_airport, end_airport, all_airports)
    
    if len(candidates) < num_stops:
        # If not enough candidates, expand search
        candidates = get_airports_along_route(start_airport, end_airport, all_airports, max_deviation=1000)
    
    if len(candidates) < num_stops:
        # Still not enough, use closest airports
        distances = [(airport, calculate_distance(start_airport, airport) + calculate_distance(airport, end_airport)) 
                    for airport in all_airports if airport not in [start_airport, end_airport]]
        # distances.sort(key=lambda x: x[1]) 
        # Sort without lambda
        distances.sort(key=itemgetter(1))

        candidates = [airport for airport, _ in distances]
    
    # Use greedy selection to build optimal route
    selected_stops = []
    current_start = start_airport
    
    for i in range(num_stops):
        best_stop = None
        best_total_distance = float('inf')
        
        for candidate in candidates:
            if candidate in selected_stops:
                continue
            
            # Calculate total distance if we add this candidate
            temp_route = [current_start, candidate, end_airport]
            if selected_stops:
                # Insert optimally among existing stops
                temp_stops = selected_stops + [candidate]
                temp_route = find_optimal_order([current_start] + temp_stops + [end_airport])
            
            total_dist = calculate_total_distance(temp_route)
            
            if total_dist < best_total_distance:
                best_total_distance = total_dist
                best_stop = candidate
        
        if best_stop:
            selected_stops.append(best_stop)
    
    return selected_stops

def find_optimal_order(airports_to_order):
    """Find optimal order for a list of airports (keeping first and last fixed)"""
    if len(airports_to_order) <= 2:
        return airports_to_order
    
    start = airports_to_order[0]
    end = airports_to_order[-1]
    middle_airports = airports_to_order[1:-1]
    
    if len(middle_airports) <= 4:
        # Brute force for small numbers
        best_route = None
        best_distance = float('inf')
        
        for perm in permutations(middle_airports):
            route = [start] + list(perm) + [end]
            distance = calculate_total_distance(route)
            if distance < best_distance:
                best_distance = distance
                best_route = route
        
        return best_route
    else:
        # Use nearest neighbor for larger numbers
        return nearest_neighbor_order(start, end, middle_airports)

def nearest_neighbor_order(start, end, stops):
    """Order stops using nearest neighbor heuristic"""
    if not stops:
        return [start, end]
    
    route = [start]
    remaining = stops.copy()
    current = start
    
    while remaining:
        # without lambda
        nearest = min(remaining, key=itemgetter(1))
        # nearest = min(remaining, key=lambda x: calculate_distance(current, x))
        route.append(nearest)
        remaining.remove(nearest)
        current = nearest
    
    route.append(end)
    return route

def improve_route_2opt(route):
    """Improve route using 2-opt local search"""
    if len(route) <= 3:
        return route, calculate_total_distance(route)
    
    best_route = route.copy()
    best_distance = calculate_total_distance(best_route)
    improved = True
    max_iterations = 100
    iteration = 0
    
    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        
        for i in range(1, len(route) - 2):
            for j in range(i + 1, len(route) - 1):
                # Try reversing the segment between i and j
                new_route = route.copy()
                new_route[i:j+1] = reversed(new_route[i:j+1])
                
                new_distance = calculate_total_distance(new_route)
                if new_distance < best_distance:
                    best_route = new_route
                    best_distance = new_distance
                    route = new_route
                    improved = True
                    break
            if improved:
                break
    
    return best_route, best_distance

def find_optimal_route_with_auto_stops(start_airport, end_airport, all_airports, num_stops):
    """Main function to find optimal route with automatically selected stops"""
    start_time = time.time()
    
    if num_stops == 0:
        route = [start_airport, end_airport]
        distance = calculate_distance(start_airport, end_airport)
        calc_time = time.time() - start_time
        return route, distance, calc_time
    
    # Strategy 1: Greedy selection of stops
    print(f"   🔍 Finding {num_stops} optimal stops...")
    selected_stops = find_best_stops_greedy(start_airport, end_airport, all_airports, num_stops)
    
    if len(selected_stops) < num_stops:
        print(f"   ⚠️  Only found {len(selected_stops)} suitable stops")
    
    # Strategy 2: Optimize the order
    print(f"   🔄 Optimizing route order...")
    all_route_airports = [start_airport] + selected_stops + [end_airport]
    optimal_route = find_optimal_order(all_route_airports)
    
    # Strategy 3: Improve with 2-opt if we have time
    if len(optimal_route) > 3:
        print(f"   ⚡ Applying 2-opt improvements...")
        optimal_route, optimal_distance = improve_route_2opt(optimal_route)
    else:
        optimal_distance = calculate_total_distance(optimal_route)
    
    calc_time = time.time() - start_time
    return optimal_route, optimal_distance, calc_time

def simple_route_planner(connection):
    """Main route planning function"""
    print("\n🛩️  Automatic Airport Route Planner")
    print("=" * 50)
    
    # Load airports
    print("Loading airports...")
    start_time = time.time()
    airports = get_all_airports_with_coords(connection)
    load_time = time.time() - start_time
    print(f"✅ Loaded {len(airports)} airports in {load_time:.2f} seconds")
    
    while True:
        print("\n" + "=" * 50)
        
        # Get start airport
        start_code = input("Enter departure airport code, for example, KJFK: ").strip().upper()
        if start_code.lower() == 'quit':
            break
        
        start_airport = find_airport_by_ident(airports, start_code)
        if not start_airport:
            print(f"❌ Airport '{start_code}' not found!")
            continue
        
        # Get end airport
        end_code = input("Enter destination airport code: ").strip().upper()
        end_airport = find_airport_by_ident(airports, end_code)
        if not end_airport:
            print(f"❌ Airport '{end_code}' not found!")
            continue
        
        # Get number of stops
        while True:
            try:
                num_stops = input("Enter number of stops (0-8): ").strip()
                if not num_stops:
                    num_stops = 0
                else:
                    num_stops = int(num_stops)
                
                if 0 <= num_stops <= 8:
                    break
                else:
                    print("❌ Please enter a number between 0 and 8")
            except ValueError:
                print("❌ Please enter a valid number")
        
        # Calculate direct route first
        direct_distance = calculate_distance(start_airport, end_airport)
        
        # Calculate optimal route with stops
        print(f"\n🔍 Planning route from {start_airport['name']} to {end_airport['name']}")
        if num_stops > 0:
            print(f"   automatically finding {num_stops} optimal stops...")
        
        optimal_route, optimal_distance, calc_time = find_optimal_route_with_auto_stops(
            start_airport, end_airport, airports, num_stops
        )
        
        # Display results
        print(f"\n✅ Route calculated in {calc_time:.3f} seconds")
        print(f"📏 Total distance: {optimal_distance:.0f} km")
        print(f"🛣️  Optimal route:")
        
        for i, airport in enumerate(optimal_route):
            if i == 0:
                print(f"   🛫 START: {airport['ident']} - {airport['name']} ({airport['municipality']})")
            elif i == len(optimal_route) - 1:
                print(f"   🛬 END:   {airport['ident']} - {airport['name']} ({airport['municipality']})")
            else:
                print(f"   🔄 STOP {i}: {airport['ident']} - {airport['name']} ({airport['municipality']})")
        
        # Show segment distances
        print(f"\n📊 Segment distances:")
        for i in range(len(optimal_route) - 1):
            segment_dist = calculate_distance(optimal_route[i], optimal_route[i + 1])
            print(f"   {optimal_route[i]['ident']} → {optimal_route[i + 1]['ident']}: {segment_dist:.0f} km")
        
        # Compare with direct route
        print(f"\n📈 Route comparison:")
        print(f"   Direct route: {direct_distance:.0f} km")
        print(f"   With stops:   {optimal_distance:.0f} km")
        
        if num_stops > 0:
            extra_distance = optimal_distance - direct_distance
            efficiency = (direct_distance / optimal_distance) * 100
            print(f"   Extra distance: {extra_distance:.0f} km ({(extra_distance/direct_distance)*100:.1f}% longer)")
            print(f"   Route efficiency: {efficiency:.1f}%")
        else:
            print(f"   Route efficiency: 100%")

connection = mysql.connector.connect(
    host='127.0.0.1',
    port= 3306,
    database='flight_game',
    user='maria',
    password='salasana',
    autocommit=True
    )

if connection.is_connected():
    print("✅ Successfully connected to database!")
    simple_route_planner(connection)
else:
    print("❌ Failed to connect to database!")
