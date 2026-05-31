import csv
import os
from geopy import distance
from itertools import combinations, permutations

_DIR = os.path.dirname(os.path.abspath(__file__))


class Airport:
    def __init__(self, ident, name, lat, lng, city, country):
        self.ident = ident
        self.name = name
        self.lat = lat
        self.lng = lng
        self.city = city
        self.country = country


class AirportManager:
    def __init__(self):
        self.all_airports = self._load_airports()
        self._countries = self._load_countries()

    def _load_airports(self):
        airports = []
        with open(os.path.join(_DIR, "airports.csv"), newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                airports.append(Airport(
                    ident=row["ident"],
                    name=row["name"],
                    lat=float(row["latitude_deg"]),
                    lng=float(row["longitude_deg"]),
                    city=row["municipality"] or "N/A",
                    country=row["iso_country"],
                ))
        return airports

    def _load_countries(self):
        with open(os.path.join(_DIR, "countries.csv"), newline="", encoding="utf-8") as f:
            return [(row["iso_country"], row["name"]) for row in csv.DictReader(f)]

    def calc_distance(self, airport1, airport2):
        return distance.distance(
            (airport1.lat, airport1.lng), (airport2.lat, airport2.lng)
        ).kilometers

    def total_route_distance(self, route):
        total = 0
        for i in range(len(route) - 1):
            total += self.calc_distance(route[i], route[i + 1])
        return total

    def find_airport(self, code):
        for airport in self.all_airports:
            if airport.ident.upper() == code.upper():
                return airport
        return None

    def get_airports_by_country(self, country_code):
        return [
            a for a in self.all_airports
            if a.country.upper() == country_code.upper()
        ]

    def show_countries(self):
        return self._countries

    def find_route_with_stops(self, start_airport, end_airport, num_stops=0):
        if num_stops == 0:
            return [start_airport, end_airport]

        direct_dist = self.calc_distance(start_airport, end_airport)
        candidates = [
            a for a in self.all_airports
            if a.ident not in (start_airport.ident, end_airport.ident)
            and (
                self.calc_distance(start_airport, a)
                + self.calc_distance(a, end_airport)
                - direct_dist
            ) <= 1000
        ]

        if len(candidates) < num_stops:
            return None

        if num_stops <= 3 and len(candidates) <= 15:
            best_route, best_distance = None, float("inf")
            for stop_combo in combinations(candidates[:15], num_stops):
                for perm in permutations(stop_combo):
                    route = [start_airport] + list(perm) + [end_airport]
                    dist = self.total_route_distance(route)
                    if dist < best_distance:
                        best_distance = dist
                        best_route = route
            return best_route

        selected, remaining = [], candidates[:20]
        for _ in range(num_stops):
            if not remaining:
                break
            best_stop = min(
                remaining,
                key=lambda x: self.total_route_distance(
                    [start_airport] + selected + [x] + [end_airport]
                ),
            )
            selected.append(best_stop)
            remaining.remove(best_stop)
        return [start_airport] + selected + [end_airport]
