import logging
from flask import Flask, jsonify
from flask_cors import CORS

# --- Game Logic ---
from airport import AirportManager
from game import Game

def create_app():
    app = Flask(__name__)

    # --- Game Logic Initialization ---
    airport_manager = AirportManager()
    game_manager = Game(player_name="Example test")

    # --- Headers ---
    CORS(app) 

    # --- Logging ---
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # --- Security headers ---
    @app.after_request
    def set_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    # -----------------------------
    # API Documentation
    # -----------------------------
    @app.route("/")
    def index():
        return jsonify({
            "api": "Flight Game API",
            "version": "1.0",
            "description": "REST API for lento peli game.",
            "available_endpoints": {
                "GET /api/airports": "Returns all airports",
                "GET /api/layover_route/<origin_code>/<dest_code>": "Return intermidiate aerport stops (layover) between two countries",
                "GET /api/result": "Retun a single game result",
            }
        }), 200
    
    # -----------------------------
    # Get all airports - /api/airports
    # -----------------------------
    @app.route("/api/airports", methods=["GET"])
    def get_airports():
        """
            Returns a list of all airports with their basic information.
        """
        
        try:
            # Prepare result
            data = [
                {
                    "ident": i.ident,
                    "name": i.name,
                    "lat": i.lat,
                    "lng": i.lng,
                    "city": i.city,
                    "country": i.country
                }
                for i in airport_manager.all_airports
            ]
            return jsonify(data), 200
        except Exception as e:
            logger.error(f"Error fetching airports: {e}")
            return jsonify({"error": "Failed to fetch airports"}), 500
    
    # -----------------------------
    # GET layover route - /api/layover_route/EFHK/KJFK        
    # -----------------------------

    @app.route("/api/layover_route/<origin_code>/<dest_code>", methods=["GET"])
    def get_layover_route(origin_code, dest_code):
        """
            Flight connection (For cases when not using direct flight between two countries).
            Calculates a layover (multi-stop) flight route between two airports.
            Returns:
                - total distance in kilometers
                - all intermediate connection airports (stops) with details 
        """

        try:
            # Validate parameters
            if not origin_code or not dest_code:
                return jsonify({
                    "error": "Missing required path parameters: /api/layover_route/<origin>/<destination>"
                }), 400

            # Find airports
            origin = airport_manager.find_airport(origin_code)
            dest = airport_manager.find_airport(dest_code)

            if not origin or not dest:
                return jsonify({
                    "error": "Airport not found",
                    "missing": {
                        "origin": origin_code if not origin else None,
                        "destination": dest_code if not dest else None
                    }
                }), 404

            # Compute layover route
            layover_route = airport_manager.find_route_with_stops(origin, dest, num_stops=2)
            distance = airport_manager.total_route_distance(layover_route)

            # Prepare result
            data = {
                "origin": origin_code,
                "destination": dest_code,
                "distance_km": distance,
                "stops": len(layover_route) - 2,  # count intermediates only
                "layover_route": [
                    {
                        "ident": i.ident,
                        "name": i.name,
                        "city": i.city,
                        "country": i.country
                    }
                    for i in layover_route
                ]
            }

            return jsonify(data), 200

        except Exception as e:
            logger.error(f"Error calculating layover route: {e}")
            return jsonify({"error": "Failed to calculate route"}), 500
    
    # -----------------------------
    # GET airports by country - /api/airports/country/FI
    # -----------------------------
    @app.route("/api/airports/country/<country_code>", methods=["GET"])
    def get_airports_by_country(country_code):
        """Return all airports that belong to a given country code (ISO / ICAO)."""

        try:
            code = country_code.upper()

            airports = airport_manager.get_airports_by_country(code)

            if not airports:
                return jsonify({
                    "country": code,
                    "airports": [],
                    "message": "No airports found"
                }), 200

            data = [
                {
                    "ident": a.ident,
                    "name": a.name,
                    "lat": a.lat,
                    "lng": a.lng,
                    "city": a.city,
                    "country": a.country
                }
                for a in airports
            ]
            return jsonify({
                "country": code,
                "airports": data
            }), 200

        except Exception as e:
            logger.error(f"Error fetching airports by country: {e}")
            return jsonify({"error": "Failed to fetch airports"}), 500

    # -----------------------------
    # GET Result - /api/result     
    # -----------------------------
    @app.route("/api/result", methods=["GET"])
    def get_results():
        """
            Retrieve the current game results for a player.
        """
        
        try:
            total = game_manager.total
            session = game_manager.session
            if not game_manager.total or game_manager.session["game_status"] is None:
                #return jsonify({"error": "No game played yet"}), 404
                # Example static data for now
                data = {
                    "levels_passed": 5,
                    "total_distance_km": 20000,
                    "countries_visited": 15,
                    "total_co2_kg": 2500,
                    "game_status": "Win"
                }
                return jsonify(data), 200
        
            data = {
                "levels_passed": session.get("current_stage", 0),
                "total_distance_km": total.get("total_distance", 0.0),
                "countries_visited": len(session.get("places", {})),
                "total_co2_kg": total.get("total_co2", 0.0),
                "game_status": session.get("game_status", "Not started")
            }
            return jsonify(data), 200

        except Exception as e:
            logger.error(f"Error fetching game results: {e}")
            return jsonify({"error": "Failed to fetch game results"}), 500

    # -----------------------------
    # Error handling
    # -----------------------------
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return app

# Run
if __name__ == "__main__":
    app = create_app()
    # Listen ONLY on local machine
    app.run(host="localhost", port=5000, debug="1")
