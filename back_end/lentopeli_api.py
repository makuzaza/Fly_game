import logging
from flask import Flask, jsonify
from flask_cors import CORS

# --- Game Logic ---
from game_logic import airport

def create_app():
    app = Flask(__name__)

    # --- Game Logic Initialization ---
    airport_manager = airport.AirportManager()

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
                "GET /api/result": "Retun a single game result"
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
            Flight connection (For cases when not usign direct flight between two countries).
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
