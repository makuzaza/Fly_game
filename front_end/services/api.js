/* 
    This file is ment to have the fetch calls to our API endpoints.
    The frontend uses these to drive the game.
*/

/* === Get /api/game_rules === */
// In a josn object returns the list of rules for the game

/* === POST /api/start_game === */ 
// Initialize a new game session.
// Backend generates the stage: origen, CO2 budget, clues, total_distance, metadata( current stage, game_status ).
// API Returns in a json format the session stage object for frontend to store in localStorage or as the game state.

/* === GET /api/airports_in_country/<country> === */
// In a josn object returns the list of airports for the given country (read-only).

/* === POST /api/country_guess === */
// validate the country guess, return true or false. 
// If true, update the setate in the backend.

/* === GET /api/distance_co2/<origin>/<destination> === */
// Returns distance, CO2, and optimal route (read-only).

/* === POST /api/complete_stage === */
// Backend verifies whether the player has completed the stage successfully.
// Updates stage, replay counter, CO2 remaining.
// Returns true if stage passed, false if failed.

/* === POST /api/replay-stage === */
// backend resets session stage

/* === Post /api/results/<name> === */
// Post results to the db and assigned to the given name

/* === Get /api/results === */
// get the  results leaderboard
