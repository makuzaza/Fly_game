// Base URL of your Flask backend
const API_BASE = "http://localhost:5000/api";

/* -------------------------------------------------------
   GET /api/airports
   Fetch all airports
------------------------------------------------------- */
export async function fetchAirports() {
    try {
        const res = await fetch(`${API_BASE}/airports`);

        if (!res.ok) {
            throw new Error(`Failed to fetch airports: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
}

/* -------------------------------------------------------
   GET /api/layover_route/<origin>/<destination>/<num_of_stops>
   Fetch multi-stop (layover) flight route
------------------------------------------------------- */
export async function fetchLayoverRoute(origin, destination, num_of_stops=0) {
    try {
        const res = await fetch(`${API_BASE}/layover_route/${origin}/${destination}/${num_of_stops}`);

        if (!res.ok) {
            throw new Error(`Route fetch failed: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
}

/* -------------------------------------------------------
   GET /api/stage
   Fetch stage criteria: places, origin, co2 budget, order, clues, etc.
------------------------------------------------------- */
export async function fetchStage() {
    try {
        const res = await fetch(`${API_BASE}/stage`);

        if (!res.ok) {
            throw new Error(`Failed to fetch stage: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
}

/* -------------------------------------------------------
   GET /api/reset
   Reset game api to initial state
------------------------------------------------------- */
export async function resetGame() {
    try {
        const res = await fetch(`${API_BASE}/reset`, {
            method: "GET"
        });

        if (!res.ok) {
            throw new Error(`Failed to reset: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("Reset Error:", err);
        return null;
    }
}

/* -------------------------------------------------------
   GET /api/result
   Fetch player game results
------------------------------------------------------- */
export async function fetchGameResults() {
    try {
        const res = await fetch(`${API_BASE}/result`);

        if (!res.ok) {
            throw new Error(`Failed to fetch results: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
}

/* -------------------------------------------------------
   GET /api/leaderboard
   Fetch leaderboard from results table
------------------------------------------------------- */

export async function fetchLeaderboard() {
  try {
    const response = await fetch(`http://localhost:5000/api/leaderboard`);
    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard");
    }
    return await response.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

/* -------------------------------------------------------
    GET /api/airports/country/<code>
    Fetch airports by country code
------------------------------------------------------- */

export async function fetchAirportsByCountry(code) {
    try {
        const res = await fetch(`${API_BASE}/airports/country/${code}`);

        if (!res.ok) {
            throw new Error(`API error ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("Error fetching airports:", err);
        return null;
    }
}
