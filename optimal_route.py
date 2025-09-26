import mysql.connector
import math
from geopy.distance import great_circle
import time
from itertools import permutations
import random
from operator import itemgetter
import os
from dotenv import load_dotenv

load_dotenv()

# Load DB connection info from environment variables
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_USER = os.getenv('DB_USER')
DB_LENTO_PELI = os.getenv('DB_LENTO_PELI')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT', 3306))

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

def distance(airport1, airport2):
    """Calculate distance between two airports in kilometers"""
    coords1 = (airport1['latitude_deg'], airport1['longitude_deg'])
    coords2 = (airport2['latitude_deg'], airport2['longitude_deg'])
    return great_circle(coords1, coords2).kilometers

def find_airport(airports, code):
    """Find airport by code"""
    for airport in airports:
        if airport['ident'].lower() == code.lower():
            return airport
    return None

def total_distance(route):
    """Calculate total distance for a route"""
    total = 0
    for i in range(len(route) - 1):
        total += distance(route[i], route[i + 1])
    return total

def find_candidate_stops(start, end, all_airports, max_detour=800):
    """Find airports that could be good stops (not too far from direct route)"""
    direct_dist = distance(start, end)
    candidates = []
    
    for airport in all_airports:
        if airport in [start, end]:
            continue
        
        # Distance if we go via this airport
        via_dist = distance(start, airport) + distance(airport, end)
        detour = via_dist - direct_dist
        
        # Only consider if detour isn't too big
        if detour <= max_detour:
            candidates.append(airport)
    
    return candidates

def find_best_stops(start, end, all_airports, num_stops):
    """Find the best stops automatically"""
    if num_stops == 0:
        return []
    
    # Get candidate airports
    candidates = find_candidate_stops(start, end, all_airports)
    
    # If not enough candidates, expand search
    if len(candidates) < num_stops * 2:
        candidates = find_candidate_stops(start, end, all_airports, max_detour=1500)
    
    # Try different combinations and pick the best
    if num_stops <= 3 and len(candidates) <= 20:
        # Small numbers: try best combinations
        from itertools import combinations
        best_stops = None
        best_dist = float('inf')
        
        for stop_combo in combinations(candidates, num_stops):
            # Find best order for these stops
            route = optimize_route([start] + list(stop_combo) + [end])
            dist = total_distance(route)
            
            if dist < best_dist:
                best_dist = dist
                best_stops = list(stop_combo)
        
        return best_stops or candidates[:num_stops]
    
    else:
        # Large numbers: use greedy approach
        selected = []
        remaining = candidates.copy()
        
        for _ in range(min(num_stops, len(candidates))):
            best_airport = None
            best_dist = float('inf')
            
            for candidate in remaining:
                test_route = [start] + selected + [candidate] + [end]
                test_route = optimize_route(test_route)
                dist = total_distance(test_route)
                
                if dist < best_dist:
                    best_dist = dist
                    best_airport = candidate
            
            if best_airport:
                selected.append(best_airport)
                remaining.remove(best_airport)
        
        return selected

def optimize_route(airports):
    """Find best order for airports (keep start and end fixed)"""
    if len(airports) <= 2:
        return airports
    
    start, end = airports[0], airports[-1]
    middle = airports[1:-1]
    
    if len(middle) <= 4:
        # Small: try all orders
        best_route = None
        best_dist = float('inf')
        
        for perm in permutations(middle):
            route = [start] + list(perm) + [end]
            dist = total_distance(route)
            if dist < best_dist:
                best_dist = dist
                best_route = route
        return best_route
    
    else:
        # Large: use nearest neighbor
        route = [start]
        remaining = middle.copy()
        current = start
        
        while remaining:
            nearest = min(remaining, key=lambda x: distance(current, x))
            route.append(nearest)
            remaining.remove(nearest)
            current = nearest
        
        route.append(end)
        return route

def plan_route(start, end, all_airports, num_stops):
    """Main route planning function"""
    start_time = time.time()
    
    # Find best stops
    if num_stops > 0:
        stops = find_best_stops(start, end, all_airports, num_stops)
        route = optimize_route([start] + stops + [end])
    else:
        route = [start, end]
    
    calc_time = time.time() - start_time
    return route, total_distance(route), calc_time

def main():
    """Main program"""
    print("🛩️  Simple Airport Route Planner")
    print("=" * 40)
    
    # Load airports
    print("Loading airports...")
    airports = get_all_airports_with_coords(connection)
    print(f"✅ Loaded {len(airports)} airports")
    
    while True:
        print("\n" + "-" * 40)
        
        # Get input
        start_code = input("Departure airport (or 'quit'): ").strip()
        if start_code.lower() == 'quit':
            break
        
        end_code = input("Destination airport: ").strip()
        
        try:
            num_stops = int(input("Number of stops (0-5): ") or "0")
            if not 0 <= num_stops <= 5:
                print("❌ Please enter 0-5 stops")
                continue
        except ValueError:
            print("❌ Please enter a valid number")
            continue
        
        # Find airports
        start = find_airport(airports, start_code)
        end = find_airport(airports, end_code)
        
        if not start:
            print(f"❌ Airport '{start_code}' not found")
            continue
        if not end:
            print(f"❌ Airport '{end_code}' not found")
            continue
        
        # Plan route
        print(f"\n🔍 Planning route with {num_stops} stops...")
        route, dist, calc_time = plan_route(start, end, airports, num_stops)
        
        # Show results
        print(f"\n✅ Route found in {calc_time:.2f}s")
        print(f"📏 Total distance: {dist:.0f} km")
        print("🛣️  Route:")
        
        for i, airport in enumerate(route):
            if i == 0:
                prefix = "🛫 START"
            elif i == len(route) - 1:
                prefix = "🛬 END  "
            else:
                prefix = f"🔄 STOP{i}"
            
            print(f"   {prefix}: {airport['ident']} - {airport['name']}")
        
        # Compare with direct flight
        if num_stops > 0:
            direct_dist = distance(start, end)
            extra = dist - direct_dist
            print(f"\n📊 Direct: {direct_dist:.0f}km | With stops: {dist:.0f}km | Extra: {extra:.0f}km")
    

connection = mysql.connector.connect(
    host= DB_HOST,
    port= DB_PORT,
    database= DB_LENTO_PELI,
    user= DB_USER,
    password= DB_PASSWORD,
    autocommit=True
    )

if connection.is_connected():
    print("✅ Successfully connected to database!")
    main()
else:
    print("❌ Failed to connect to database!")
