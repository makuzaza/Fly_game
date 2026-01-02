import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests 
from airport import AirportManager
from game import Game
from stage import Stage
from tips_countries import tips_countries
import os

active_games = {}

def create_app():
    app = Flask(__name__)

    airport_manager = AirportManager()

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
                "POST /api/game/start": "Start a new game",
                "GET /api/game/state/<player_name>": "Get current game state",
                "POST /api/game/guess": "Submit country guess",
                "POST /api/game/select-airport": "Select airport and calculate route",
                "POST /api/game/confirm-flight": "Confirm flight and update game state",
                "POST /api/game/replay-stage": "Replay current stage",
                "POST /api/game/end-lose": "End game with lose status",
                "POST /api/game/quit": "Quit the current game",
                "GET /api/airports": "Returns all airports",
                "GET /api/layover_route/<origin_code>/<dest_code>": "Return intermediate airport stops",
                "GET /api/result/<player_name>": "Return game result",
            }
        }), 200
    
    # -----------------------------
    # Start new game - POST /api/game/start
    # -----------------------------
    @app.route("/api/game/start", methods=["POST"])
    def start_game():
        """Start a new game for a player"""
        try:
            data = request.json
            player_name = data.get("player_name", "Player")
            
            game = Game(player_name)
            active_games[player_name] = game
            
            game.session["current_stage"] = 0
            stage = Stage(1)
            stage.task_criteria(game.session, game.airport_manager)
            
            countries_to_visit = list(game.session["places"].keys())
            tips = [tips_countries.get(c, "No clue.") for c in countries_to_visit]
            
            return jsonify({
                "status": "started",
                "player_name": player_name,
                "stage": game.session["current_stage"],
                "co2_available": game.session["co2_available"],
                "countries": countries_to_visit,
                "tips": tips,
                "origin": game.session["origin"]
            }), 200
            
        except Exception as e:
            logger.error(f"Error starting game: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Get game state - GET /api/game/state/<player_name>
    # -----------------------------
    @app.route("/api/game/state/<player_name>", methods=["GET"])
    def get_game_state(player_name):
        """Get current game state"""
        try:
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            countries_to_visit = list(game.session["places"].keys())
            
            return jsonify({
                "stage": game.session["current_stage"],
                "co2_available": game.session["co2_available"],
                "origin": game.session["origin"],
                "countries": countries_to_visit,
                "game_status": game.session["game_status"],
                "total_distance": game.total["total_distance"],
                "total_co2": game.total["total_co2"],
                "flights_count": len(game.total["flight_history"])
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting game state: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Submit country guess - POST /api/game/guess
    # -----------------------------
    @app.route("/api/game/guess", methods=["POST"])
    def guess_country():
        """Check if country guess is correct"""
        try:
            data = request.json
            player_name = data.get("player_name")
            guess = data.get("guess", "").strip().upper()
            
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            countries_to_visit = list(game.session["places"].keys())
            
            if guess in countries_to_visit:
                country_name = game.get_country_name(guess)
                airports = game.airport_manager.get_airports_by_country(guess)
                
                airports_data = [
                    {
                        "ident": a.ident,
                        "name": a.name,
                        "city": a.city
                    }
                    for a in airports
                ]
                
                return jsonify({
                    "correct": True,
                    "country_code": guess,
                    "country_name": country_name,
                    "airports": airports_data
                }), 200
            else:
                correct_country_code = countries_to_visit[0] if countries_to_visit else ""
                correct_country_name = game.get_country_name(correct_country_code) if correct_country_code else ""
                return jsonify({
                    "correct": False,
                    "message": "Wrong guess. Try again!",
                    "country_code": correct_country_code,
                    "country_name": correct_country_name
                }), 200
                
        except Exception as e:
            logger.error(f"Error processing guess: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Select airport and calculate route - POST /api/game/select-airport
    # -----------------------------
    @app.route("/api/game/select-airport", methods=["POST"])
    def select_airport():
        """Select destination airport and calculate route"""
        try:
            data = request.json
            player_name = data.get("player_name")
            dest_code = data.get("airport_code")
            country_code = data.get("country_code")
            stops = data.get("stops", 0)
            
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            
            # Find airports
            origin = game.airport_manager.find_airport(game.session["origin"])
            dest = game.airport_manager.find_airport(dest_code)
            
            if not origin or not dest:
                return jsonify({"error": "Airport not found"}), 404
            
            route = game.airport_manager.find_route_with_stops(origin, dest, stops)
            
            if not route:
                return jsonify({"error": "Could not find valid route"}), 400
            
            stage = Stage(game.session["current_stage"])
            dist = game.airport_manager.total_route_distance(route)
            co2 = stage.calc_co2_emmission(dist)
            
            route_data = [
                {
                    "ident": a.ident,
                    "name": a.name,
                    "type": "START" if i == 0 else ("END" if i == len(route)-1 else "STOP")
                }
                for i, a in enumerate(route)
            ]
            
            enough_co2 = co2 <= game.session["co2_available"]
            
            return jsonify({
                "route": route_data,
                "distance": round(dist, 1),
                "co2_required": round(co2, 2),
                "co2_available": round(game.session["co2_available"], 2),
                "enough_co2": enough_co2,
                "stops": stops
            }), 200
            
        except Exception as e:
            logger.error(f"Error calculating route: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Confirm flight - POST /api/game/confirm-flight
    # -----------------------------
    @app.route("/api/game/confirm-flight", methods=["POST"])
    def confirm_flight():
        """Confirm the flight and update game state"""
        try:
            data = request.json
            player_name = data.get("player_name")
            dest_code = data.get("airport_code")
            country_code = data.get("country_code")
            distance = data.get("distance")
            co2 = data.get("co2")
            
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            
            if co2 > game.session["co2_available"]:
                return jsonify({
                    "error": "not_enough_co2",
                    "message": "Not enough CO2 for this flight!",
                    "co2_required": co2,
                    "co2_available": game.session["co2_available"]
                }), 400
            
            game.session["co2_available"] -= co2
            game.session["origin"] = dest_code
            
            if country_code in game.session["places"]:
                del game.session["places"][country_code]
            
            game.total["total_distance"] += distance
            game.total["total_co2"] += co2
            game.total["total_flights"] += 1
            game.total["flight_history"].append({
                "country": country_code,
                "distance": distance,
                "co2": co2
            })
            
            countries_remaining = list(game.session["places"].keys())
            stage_complete = len(countries_remaining) == 0
            
            if stage_complete:
                if game.session["current_stage"] >= 5:
                    game.session["game_status"] = "Win"
                    return jsonify({
                        "stage_complete": True,
                        "game_complete": True,
                        "message": "Congratulations! You completed all stages!"
                    }), 200
                else:
                    next_stage_number = game.session["current_stage"] + 1
                    game.session["current_stage"] = next_stage_number - 1
                    
                    stage = Stage(next_stage_number)
                    stage.task_criteria(game.session, game.airport_manager)
                    
                    countries_to_visit = list(game.session["places"].keys())
                    tips = [tips_countries.get(c, "No clue.") for c in countries_to_visit]
                    
                    return jsonify({
                        "stage_complete": True,
                        "game_complete": False,
                        "next_stage": game.session["current_stage"],
                        "co2_available": game.session["co2_available"],
                        "countries": countries_to_visit,
                        "tips": tips
                    }), 200
            else:
                tips = [tips_countries.get(c, "No clue.") for c in countries_remaining]
                return jsonify({
                    "stage_complete": False,
                    "countries_remaining": countries_remaining,
                    "tips": tips,
                    "co2_available": game.session["co2_available"]
                }), 200
                
        except Exception as e:
            logger.error(f"Error confirming flight: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Replay stage - POST /api/game/replay-stage
    # -----------------------------
    @app.route("/api/game/replay-stage", methods=["POST"])
    def replay_stage():
        """Replay the current stage"""
        try:
            data = request.json
            player_name = data.get("player_name")
            backup_session = data.get("backup_session")
            backup_total = data.get("backup_total")
            
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            
            if backup_session and backup_total:
                game.session = backup_session
                game.total = backup_total

            current_stage_num = game.session["current_stage"]
        
            game.session["places"] = {}
        
            stage = Stage(current_stage_num)
            game.session["current_stage"] = current_stage_num - 1
            stage.task_criteria(game.session, game.airport_manager)

            countries_to_visit = list(game.session["places"].keys())
            tips = [tips_countries.get(c, "No clue.") for c in countries_to_visit]
            
            return jsonify({
                "replayed": True,
                "stage": game.session["current_stage"],
                "co2_available": game.session["co2_available"],
                "countries": countries_to_visit,
                "tips": tips,
                "origin": game.session["origin"]
            }), 200
            
        except Exception as e:
            logger.error(f"Error replaying stage: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # End game with lose status - POST /api/game/end-lose
    # -----------------------------
    @app.route("/api/game/end-lose", methods=["POST"])
    def end_game_lose():
        """End game with lose status"""
        try:
            data = request.json
            player_name = data.get("player_name")
            
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            
            game.session["current_stage"] -= 1
            game.session["game_status"] = "Lose"
            
            return jsonify({
                "game_ended": True,
                "status": "Lose",
                "final_stage": game.session["current_stage"]
            }), 200
            
        except Exception as e:
            logger.error(f"Error ending game: {e}")
            return jsonify({"error": str(e)}), 500

    # -----------------------------
    # Quit game - POST /api/game/quit
    # -----------------------------
    @app.route("/api/game/quit", methods=["POST"])
    def quit_game():
        try:
            data = request.json
            player_name = data.get("player_name")

            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404

            game = active_games[player_name]

            if not game.session.get("game_status"):
                game.session["game_status"] = "Quit"

            return jsonify({
                "game_ended": True,
                "status": "Quit"
            }), 200

        except Exception as e:
            logger.error(f"Error quitting game: {e}")
            return jsonify({"error": "Failed to quit game"}), 500

    # -----------------------------
    # GET Airports - /api/airports
    # -----------------------------
    @app.route("/api/airports", methods=["GET"])
    def get_airports():
        """Returns a list of all airports with their basic information."""
        try:
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
    # GET Result - /api/result/<player_name>
    # -----------------------------
    @app.route("/api/result/<player_name>", methods=["GET"])
    def get_results(player_name):
        """Retrieve the current game results for a player."""
        try:
            if player_name not in active_games:
                return jsonify({"error": "Game not found"}), 404
            
            game = active_games[player_name]
            
            data = {
                "player_name": player_name,
                "levels_achieved": game.session["current_stage"],
                "total_distance_km": round(game.total["total_distance"], 1),
                "countries_visited": len(game.total["flight_history"]),
                "total_co2_kg": round(game.total["total_co2"], 2),
                "game_status": game.session["game_status"] or "Quit"
            }
            return jsonify(data), 200

        except Exception as e:
            logger.error(f"Error fetching game results: {e}")
            return jsonify({"error": "Failed to fetch game results"}), 500

    # -----------------------------
    # Weather API
    # -----------------------------
    @app.route("/api/weather/<icao>", methods=["GET"])
    def get_weather(icao):

        airport = airport_manager.find_airport(icao)
        
        if not airport:
            return jsonify({"error": "Airport not found"}), 404
        
        lat, lon = airport.lat, airport.lng

        API_KEY = os.getenv("OPENWEATHER_API_KEY")
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}"
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

if __name__ == "__main__":
    app = create_app()
    app.run(host="localhost", port=5000, debug=True)