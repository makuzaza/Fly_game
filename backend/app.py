import os
import json
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv

from airport import AirportManager

load_dotenv()

app = Flask(__name__)
CORS(app)

airport_manager = AirportManager()

# -----------------------------
# 1. Get all airports
# -----------------------------
@app.route('/airports')
def airports():
    data = [
        {
            "ident": a.ident,
            "name": a.name,
            "lat": a.lat,
            "lng": a.lng,
            "city": a.city,
            "country": a.country
        }
        for a in airport_manager.all_airports
    ]
    return json.dumps(data, indent=4)


# -----------------------------
# 2. Plan route
# Example: /route?from=EFHK&to=KJFK
# -----------------------------
@app.route('/route')
def route():
    origin_code = request.args.get("from")
    dest_code = request.args.get("to")

    origin = airport_manager.find_airport(origin_code)
    dest = airport_manager.find_airport(dest_code)

    if not origin or not dest:
        return json.dumps({"error": "Airport not found"})

    route = airport_manager.find_route_with_stops(origin, dest, num_stops=2)
    distance = airport_manager.total_route_distance(route)

    result = {
        "distance_km": distance,
        "route": [
            {"ident": a.ident, "name": a.name, "city": a.city}
            for a in route
        ]
    }

    return json.dumps(result, indent=4)


if __name__ == '__main__':
    app.run(port=5000)
