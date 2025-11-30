# first you should run in terminal === python test_server.py ===
# then in browser http://127.0.0.1:5000/results
# can remove this file, when will be correct flask in project

from flask import Flask, jsonify, render_template

app = Flask(__name__, template_folder="front_end", static_folder="front_end")

@app.route("/api/results")
def get_results():     # Static data for tests, later it will be added from the database
    results = {
        "levels_passed": 5,
        "total_distance_km": 20000,
        "countries_visited": 15,
        "total_co2_kg": 2500,
        "game_status": "Win"
    }
    return jsonify(results)

@app.route("/results")
def results_page():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)