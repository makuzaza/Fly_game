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
                "GET /api/route/<from>/<to>": "Calculates a route between two airports",
                "GET /api/results": "retun the results of the game"
            }
        }), 200
    
    # -----------------------------
    # Get all airports
    # -----------------------------
    @app.route("/api/airports", methods=["GET"])
    def get_airports():
        """
        Returns a list of all airports with their basic information.
        """
        
        try:
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
            return jsonify(data), 200
        except Exception as e:
            logger.error(f"Error fetching airports: {e}")
            return jsonify({"error": "Failed to fetch airports"}), 500


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
