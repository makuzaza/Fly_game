File system
Ohj2_ryhmaProj/
    back_end/
        game_logic/
            __init__.py
            config_manager.py
            estage_manager.py
            results_manager.py
            route_engine_manager.py
            session_manager.py
            utils.py
        db.py
        index.py
        requirements.txt
        routes.py (The endpoints here must match the enpoints called in the front_end api.js)
    front_end/
        assets/
        pages/
        services/
            api.js (The endpoints here must match the enpoints created in the routs.py)
        utils/
        index.html
        index.js
        styles.css


Architecture proposal 

BACK-END

In the game_logic folder we have Managers where each manager is one class
Each classes will have methods that will provide what a certain route endpoint needs

who servers each endpoint:

| Endpoint                                         | Manager Used                        |
| ------------------------------------------------ | ----------------------------------- |
| GET **/api/game_rules**                          | ConfigManager                       |
| POST **/api/start_game**                         | SessionManager + StageManager       |
| GET **/api/airports_in_country/<country>**       | RouteEngineManager                  |
| POST **/api/country_guess**                      | StageManager + SessionManager       |
| GET **/api/distance_co2/<origin>/<destination>** | RouteEngineManager                  |
| POST **/api/complete_stage**                     | SessionManager + RouteEngineManager |
| POST **/api/replay_stage**                       | SessionManager                      |
| POST **/api/results**                            | ResultsManager                      |
| GET **/api/results**                             | ResultsManager                      |


ConfigManager -> administrate game rules and clues (read-only)

SessionManager -> Stores and updates the full game session state
    - Stores origin, stage, CO₂, countries to visit...
    - Replay backup states
    - Tracking status ("Win", "Lose", "Quit")
    - Updating CO₂ after route
    - Updating origin after route

StageManager -> create a stage by handling the criterias for a single stage
    - Selecting countries
    - Preparing clues
    - Handling guessing attempts
    - Checking if stage is completed

RouteEngineManager -> Handles ALL airport & route computation
    - Finding airports
    - Generating multi-stop routes
    - Computing distance + CO₂
    - Route summary

ResultsManager -> DB leaderboard + store results
    - Saving to DB
    - Formatting results
    - Final summary


Each manager has one job only.

The routes.py will call methods from the classes and send as response to the front_end requests.
Each route end point will be responsible to send one specific data or to update the back_end session state.

We might need more of less route end points, also we might or not need inheritance we will need to see that.