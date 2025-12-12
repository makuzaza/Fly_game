import logging, requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from tips_countries import tips_countries
from db import get_connection
from db_updating import db_table_creator, results_to_db
from dotenv import load_dotenv
import os

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
                "GET /api/stage": "Get next stage (increments level)",
                "GET /api/stage/replay/<stage_num>": "Replay specific stage without incrementing level",
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
    # GET layover route - /api/layover_route/EFHK/KJFK/0        
    # -----------------------------
    @app.route("/api/layover_route/<origin_code>/<dest_code>/<num_of_stops>", methods=["GET"])
    def get_layover_route(origin_code, dest_code, num_of_stops=0):
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
                    "error": "Missing required path parameters: /api/layover_route/<origin>/<destination>/<num_of_stops>"
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
            layover_route = airport_manager.find_route_with_stops(origin, dest, int(num_of_stops))
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

            # Update origin
            if task["order_countries"]:
                last_country = task["order_countries"][-1]
                # Convert country → airport ICAO
                if last_country in task.get("places", {}):
                    data = task["places"][last_country]
                    if isinstance(data, dict):
                        stage_state["origin"] = data.get("icao")
                    else:
                        stage_state["origin"] = None
                        logger.error(f"Invalid data format for {last_country}: {data}")
                else:
                    stage_state["origin"] = None
                    logger.error(f"{last_country} not found in places")
 
            return jsonify(task), 200

        except Exception as e:
            logger.error(f"Error in stage criteria: {e}")
            return jsonify({"error": "Failed to generate stage"}), 500
    
    # -----------------------------
    # GET Stage Replay - /api/stage/replay/<stage_num>
    # -----------------------------
    @app.route("/api/stage/replay/<int:stage_num>", methods=["GET"])
    def replay_stage(stage_num):
        """
            Replay a specific stage without incrementing the level.
            Generates new clues for the same stage number.
        """
        try:
            # Set the stage level without incrementing
            stage_state["level"] = stage_num
            stage.level = stage_state["level"]

            session_state = {
                "current_stage": stage_state["level"],
                "origin": stage_state["origin"], 
                "places": {},
                "co2_available": 0,
                "order_countries": [],
                "clues": {},
            }

            # Generate the task with new clues
            task = stage.task_criteria(
                session_state=session_state,
                airport_manager=airport_manager
            )
            # Update origin (same logic as regular stage)
            if task["order_countries"]:
                last_country = task["order_countries"][-1]
                if last_country in task.get("places", {}):
                    data = task["places"][last_country]
                    if isinstance(data, dict):
                        stage_state["origin"] = data.get("icao")
                    else:
                        stage_state["origin"] = None
                        logger.error(f"Invalid data format for {last_country}: {data}")
                else:
                    stage_state["origin"] = None
                    logger.error(f"{last_country} not found in places")
 
            return jsonify(task), 200

        except Exception as e:
            logger.error(f"Error in stage replay: {e}")
            return jsonify({"error": "Failed to replay stage"}), 500

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
    # POST Result - /api/saveResult
    # -----------------------------
    @app.route("/api/saveResult", methods=["POST"])
    def save_result():
        data = request.get_json()

        name = data.get("name")
        date = data.get("date")
        levels = data.get("levels")
        cities = data.get("cities")
        km = data.get("km_amount")
        co2 = data.get("co2_amount")
        eff = data.get("efficiency")
        status = data.get("status")

        success = results_to_db(name, date, levels, cities, km, co2, eff, status)

        if success:
            return jsonify({"message": "Result saved"}), 200
        else:
            return jsonify({"error": "Failed to save result"}), 500

    # -----------------------------
    # GET Result - /api/result     
    # -----------------------------
    @app.route("/api/result", methods=["GET"])
    def get_results():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute("""
                SELECT levels, km_amount, cities, co2_amount, efficiency, status
                FROM results
                ORDER BY id DESC LIMIT 1
            """)
            row = cursor.fetchone()
            conn.close()

            if row:
                row["km_amount"] = round(float(row["km_amount"]))
                row["co2_amount"] = round(float(row["co2_amount"]))
                row["efficiency"] = round(float(row["efficiency"]))
                return jsonify(row), 200

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
                id,
                name,
                ROUND(km_amount)  AS km_amount,
                ROUND(co2_amount) AS co2_amount,
                ROUND(efficiency) AS efficiency,
                status
            FROM results
            ORDER BY efficiency DESC
        """)
        rows = cursor.fetchall()

        # current player - the last line in the table
        cursor.execute("""
            SELECT
                id,
                name,
                ROUND(km_amount)  AS km_amount,
                ROUND(co2_amount) AS co2_amount,
                ROUND(efficiency) AS efficiency,
                status
            FROM results
            ORDER BY id DESC LIMIT 1
        """)
        current_result = cursor.fetchone()
        conn.close()

        # add rank
        leaderboard_data = []
        for i, row in enumerate(rows, start=1):
            row["place"] = i
            leaderboard_data.append(row)

        top10 = leaderboard_data[:10]

        # check, if current player in the top-10
        current_in_top10 = any(r["id"] == current_result["id"] for r in top10)

        if not current_in_top10:
            # search real rank
            for r in leaderboard_data:
                if r["id"] == current_result["id"]:
                    current_result["place"] = r["place"]
                    break
            # replace the last line in leaderboard
            current_result["display_place"] = current_result["place"]
            top10[-1] = current_result
        else:
            # if in top-10, add display_place = place
            for r in top10:
                r["display_place"] = r["place"]

        return jsonify({
            "leaderboard": top10,
            "current_id": current_result["id"]
        })

    # -----------------------------
    # Weather API
    # -----------------------------
    @app.route("/api/weather", methods=["GET"])
    def get_weather():
        icao = request.args.get("icao")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT latitude_deg, longitude_deg FROM airport WHERE ident = %s", (icao,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"error": "ICAO not found"}), 404
        lat, lon = row["latitude_deg"], row["longitude_deg"]

        load_dotenv()
        api_key = os.getenv("WEATHER_API_KEY")

        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}"
        try:
            result = requests.get(weather_url)
            if result.status_code == 200:
                json_result = result.json()
                return jsonify({
                    "weather": json_result["weather"][0]["main"],
                    "wind": json_result["wind"]["speed"],
                    "description": json_result["weather"][0]["description"],
                    "temperature": round(json_result["main"]["temp"] - 273.15),
                    "icon": f"http://openweathermap.org/img/wn/{json_result['weather'][0]['icon']}@2x.png"
                })
            else:
                return jsonify({"error": "Failed to fetch weather"}), result.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({"error": "Search failed"}), 500

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
    db_table_creator()
    app = create_app()
    # Listen ONLY on local machine
    app.run(host="localhost", port=5000, debug="1")

