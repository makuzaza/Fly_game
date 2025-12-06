import logging
from flask import Flask, jsonify
from flask_cors import CORS
from tips_countries import tips_countries
from db import get_connection

# --- Game Logic ---
from airport import AirportManager
from stage import Stage

def create_app():
    app = Flask(__name__)

    # --- Game Logic Initialization ---
    airport_manager = AirportManager()
    stage_state = {
        "level": 0,
        "origin": "EFHK"
        }
    stage = Stage(stage_state["level"])

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
                "co2_needed": stage.calc_co2_emmission(distance),
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
    # GET Stage - /api/stage     
    # -----------------------------
    @app.route("/api/stage", methods=["GET"])
    def get_stage():
        """
            Compute the stage and return: places, co2_budget, order_countries, origin, current_stage and clues.
        """
        try:
            # === Increase level ===
            stage_state["level"] += 1
            stage.level = stage_state["level"]

            session_state = {
                "current_stage": stage_state["level"],
                "origin": stage_state["origin"], 
                "places": {},
                "co2_available": 0,
                "order_countries": [],
                "clues": {},
            }

            # Generate the task
            task = stage.task_criteria(
                session_state=session_state,
                airport_manager=airport_manager
            )

            # Add clues based on selected countries
            task["clues"] = {
                country: tips_countries.get(country, "No clue available")
                for country in task.get("places", {}).keys()
            }

            # Update origin
            if task["order_countries"]:
                last_country = task["order_countries"][-1]
                # Convert country → airport IATA
                last_airport = task["places"][last_country]
                stage_state["origin"] = last_airport
 
            return jsonify(task), 200

        except Exception as e:
            logger.error(f"Error in stage criteria: {e}")
            return jsonify({"error": "Failed to generate stage"}), 500
    
    # -----------------------------
    # GET Reset - /api/reset     
    # -----------------------------
    # Probably will need to be changed to POST, is not get to make it easier to test using browser.

    @app.route("/api/reset", methods=["GET"]) 
    def reset_game():
        try:
            stage_state["level"] = 0
            stage_state["origin"] = "EFHK"
            stage.level = 0

            return jsonify({
                "message": "Game reset",
                "level": stage_state["level"],
                "origin": stage_state["origin"]
            }), 200

        except Exception as e:
            logger.error(f"Error resetting game: {e}")
            return jsonify({"error": "Failed to reset game"}), 500
        
    # -----------------------------
    # GET Result - /api/result     
    # -----------------------------
    @app.route("/api/result", methods=["GET"])
    def get_results():
        """
            Retrieve the current game results for a player.
        """
        
        try:   
            data = {
                "levels_passed": 5,
                "total_distance_km": 20000,
                "countries_visited": 9,
                "total_co2_kg": 2500,
                "game_status": "Win"
            }
            return jsonify(data), 200

        except Exception as e:
            logger.error(f"Error fetching game results: {e}")
            return jsonify({"error": "Failed to fetch game results"}), 500

    # -------------------------------------
    # GET Leaderboard - /api/leaderboard
    # -------------------------------------
    @app.route("/api/leaderboard")
    def leaderboard():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                name,
                ROUND(km_amount)  AS km_amount,
                ROUND(co2_amount) AS co2_amount,
                ROUND(efficiency) AS efficiency,
                status
            FROM results
            ORDER BY efficiency DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        # add rank
        leaderboard_data = []
        for i, row in enumerate(rows, start=1):
            row["place"] = i
            leaderboard_data.append(row)

        top10 = leaderboard_data[:10]

        return jsonify({"leaderboard": top10})

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

