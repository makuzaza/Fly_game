"""
This file contains all Flask API routes.
Each endpoint receives requests from the frontend,
delegates game logic to the /game_logic modules,
and returns a JSON response.

The routes below collectively control the entire game flow:
- starting a new game
- generating missions
- validating guesses
- calculating routes and CO₂
- completing/replaying stages
- saving and displaying results
"""

# HERE IS BASICALLY EXERCISE 1 MODULE 13 FROM THE PYTHON EXERCISES THAT WE DID.

# =====================================================================
# === GET /api/game_rules ===
# ---------------------------------------------------------------------
# Returns the game rules and/or background story in JSON format.
# =====================================================================


# =====================================================================
# === POST /api/start_game ===
# ---------------------------------------------------------------------
# Initializes a NEW game session.
# Response example:
#   {
#       "session_id": "abc123",
#       "origin": "EFHK",
#       "current_stage": 1,
#       "co2_available": 3500,
#       "clues": {"Japan": "...", "Brazil": "..."},
#       "game_status": "In Progress"
#   }
# =====================================================================


# =====================================================================
# === GET /api/airports_in_country/<country> ===
# ---------------------------------------------------------------------
# Returns all airports in the given country (read-only).
# =====================================================================


# =====================================================================
# === POST /api/country_guess ===
# ---------------------------------------------------------------------
# Validates the user’s guessed country for the current stage.
# =====================================================================


# =====================================================================
# === GET /api/distance_co2/<origin>/<destination> ===
# ---------------------------------------------------------------------
# Calculates:
#   - flight distance (km)
#   - CO₂ emission (kg)
#   - optimal route (with stops) between airports
#
# Response example:
#   {
#       "origin": "EFHK",
#       "destination": "RJTT",
#       "distance": 8734,
#       "co2": 512,
#       "route": [
#           {"ident": "EFHK", "city": "Helsinki"},
#           {"ident": "DXB",  "city": "Dubai"},
#           {"ident": "RJTT", "city": "Tokyo"}
#       ]
#   }
# =====================================================================


# =====================================================================
# === POST /api/complete_stage ===
# ---------------------------------------------------------------------
# Called when the player selects an airport + confirms a route.
# =====================================================================


# =====================================================================
# === POST /api/replay_stage ===
# ---------------------------------------------------------------------
# Restores the session to the state it had at the BEGINNING of the stage.
# =====================================================================


# =====================================================================
# === POST /api/results ===
# ---------------------------------------------------------------------
# Saves final game results into the database.
# =====================================================================


# =====================================================================
# === GET /api/results ===
# ---------------------------------------------------------------------
# Returns leaderboard of all results stored in DB.
# =====================================================================
