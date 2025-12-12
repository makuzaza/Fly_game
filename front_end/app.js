import {
  initMap,
  setOnAirportClick,
  highlightAirports,
  highlightRoute,
  resizeMap,
  getAirports,
  getMap,
} from "./mapScreen.js";

import { showGameScreen, showResultsScreen, showGameModal } from "./index.js";

// -----------------------------
// Game State
// -----------------------------
let gameState = {
  playerName: "",
  stage: 0,
  co2Available: 0,
  co2Initial: 0,
  countries: [],
  tips: [],
  origin: "",
  originName: "",
  originCountry: "",
  correctCountryName: "",
  selectedCountry: null,
  selectedAirport: null,
  wrongAttempts: 0,
  replayCount: 0,
  backupSession: null,
  backupTotal: null,
  currentStops: 0, 
};

const API_URL = "https://flygame-production.up.railway.app";
let mapInitialized = false;

function getAirportInfo(ident) {
  const airports = getAirports();
  return airports.find((a) => a.ident === ident) || null;
}

// -----------------------------
// Initialize Map when game screen is shown
// -----------------------------
async function initializeMap() {
  if (!mapInitialized) {
    const container = document.getElementById("map-container");
    if (!container) {
      return;
    }

    await initMap("map-container", API_URL);
    mapInitialized = true;

    setOnAirportClick((airport) => {
      if (
        document.getElementById("airport-selection").style.display === "block"
      ) {
        handleAirportSelect(airport.ident, gameState.selectedCountry);
      }
    });
  } else {
    resizeMap();
  }
}

// -----------------------------
// API Calls
// -----------------------------
async function startNewGame(playerName) {
  try {
    const response = await fetch(`${API_URL}/api/game/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName }),
    });

    if (!response.ok) throw new Error("Failed to start game");

    const data = await response.json();
    gameState.playerName = playerName;
    gameState.stage = data.stage;
    gameState.co2Available = data.co2_available;
    gameState.co2Initial = data.co2_available;
    gameState.countries = data.countries;
    gameState.tips = data.tips;
    gameState.origin = data.origin;
    gameState.wrongAttempts = 0;
    gameState.replayCount = 0;

    await saveBackup();
    showGameScreen();
    updateGameDisplay();

    setTimeout(async () => {
      await initializeMap();
    }, 100);
  } catch (error) {
    alert("Error starting game: " + error.message);
  }
}

async function restartGame() {
  mapInitialized = false;
  try {
    const map = getMap();
    if (map) {
      map.remove();
    }
  } catch (e) {
    console.warn("Could not reset map:", e);
  }
  await startNewGame(gameState.playerName);
}

async function submitGuess(guess) {
  try {
    const response = await fetch(`${API_URL}/api/game/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: gameState.playerName,
        guess: guess,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    alert("Error submitting guess: " + error.message);
    return null;
  }
}

async function selectAirport(airportCode, countryCode) {
  try {
    const response = await fetch(`${API_URL}/api/game/select-airport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: gameState.playerName,
        airport_code: airportCode,
        country_code: countryCode,
        stops: gameState.currentStops
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    alert("Error calculating route: " + error.message);
    return null;
  }
}

async function confirmFlight(airportCode, countryCode, distance, co2) {
  try {
    const response = await fetch(`${API_URL}/api/game/confirm-flight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: gameState.playerName,
        airport_code: airportCode,
        country_code: countryCode,
        distance: distance,
        co2: co2,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to confirm flight");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    alert("Error confirming flight: " + error.message);
    return null;
  }
}

export async function getGameResults() {
  try {
    const response = await fetch(
      `${API_URL}/api/result/${gameState.playerName}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    alert("Error fetching results: " + error.message);
    return null;
  }
}

async function saveBackup() {
  try {
    const response = await fetch(
      `${API_URL}/api/game/state/${gameState.playerName}`
    );
    const data = await response.json();

    gameState.backupSession = {
      origin: data.origin,
      current_stage: data.stage,
      co2_available: data.co2_available,
      places: {},
      game_status: null,
    };

    data.countries.forEach((country) => {
      gameState.backupSession.places[country] = country;
    });

    gameState.backupTotal = {
      total_distance: data.total_distance,
      total_co2: data.total_co2,
      total_flights: data.flights_count,
      flight_history: [],
    };
  } catch (error) {
    console.error("Error saving backup:", error);
  }
}

async function replayStage() {
  try {
    const response = await fetch(`${API_URL}/api/game/replay-stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: gameState.playerName,
        backup_session: gameState.backupSession,
        backup_total: gameState.backupTotal,
      }),
    });

    const data = await response.json();

    if (data.replayed) {
      gameState.stage = data.stage;
      gameState.co2Available = data.co2_available;
      gameState.co2Initial = data.co2_available; 
      gameState.countries = data.countries;
      gameState.tips = data.tips;
      gameState.wrongAttempts = 0;
      gameState.replayCount++;
      gameState.currentStops = 0;  
      gameState.wrongAttempts = 0;
      gameState.selectedCountry = null;
      gameState.selectedAirport = null;

      document.getElementById("airport-selection").style.display = "none";
      document.getElementById("route-info").style.display = "none";
      document.getElementById("country-input").value = "";

      updateGameDisplay();
      document.getElementById("guess-section").style.display = "block";

      if (mapInitialized) {
        const { displayAirportMarkers } = await import("./mapScreen.js");
        displayAirportMarkers();
      }
    }
  } catch (error) {
    alert("Error replaying stage: " + error.message);
  }
}

async function quitGame() {
  try {
    await fetch(`${API_URL}/api/game/quit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: gameState.playerName }),
    });
  } catch (error) {
    console.error("Error quitting game:", error);
  }
}

async function endGameWithLose() {
  try {
    const response = await fetch(`${API_URL}/api/game/end-lose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: gameState.playerName,
      }),
    });

    const data = await response.json();

    if (data.game_ended) {
      const results = await getGameResults();
      showResults(results);
    }
  } catch (error) {
    alert("Error ending game: " + error.message);
  }
}

// -----------------------------
// Display Functions
// -----------------------------
function updateGameDisplay() {
    document.querySelectorAll('.stage-circle').forEach((circle, index) => {
        circle.classList.remove('completed', 'current');
        const stageNum = index + 1;
        if (stageNum < gameState.stage) {
            circle.classList.add('completed');
        } else if (stageNum === gameState.stage) {
            circle.classList.add('current');
        }
    });
    
    const co2Display = document.getElementById("co2-display");
    const co2Progress = document.getElementById("co2-progress");
    const co2Value = gameState.co2Available || 0;
    const maxCO2 = gameState.co2Initial || co2Value;
    const percentage = maxCO2 > 0 ? (co2Value / maxCO2) * 100 : 0;
    
    co2Display.textContent = co2Value.toFixed(2);
    co2Progress.style.width = `${percentage}%`;
    
    co2Progress.classList.remove('low', 'critical');
    if (percentage < 30) {
        co2Progress.classList.add('critical');
    } else if (percentage < 50) {
        co2Progress.classList.add('low');
    }
    
    let originText = "EFHK - Helsinki-Vantaa (FI)";
    if (gameState.originName) {
        originText = `${gameState.origin} - ${gameState.originName} (${gameState.originCountry})`;
    }
    document.getElementById("current-origin").textContent = originText;
    
    const cluesList = document.querySelector('.clues-overlay #clues-list');
    cluesList.innerHTML = "";
    gameState.tips.forEach((tip, index) => {
        const clueItem = document.createElement("p");
        clueItem.textContent = `${tip}`;
        cluesList.appendChild(clueItem);
    });
    
    document.getElementById("country-input").value = "";
    document.getElementById("guess-feedback").textContent = "";
    document.getElementById("attempts-info").textContent = "";
    document.getElementById("airport-selection").style.display = "none";
    document.getElementById("route-info").style.display = "none";
    gameState.wrongAttempts = 0;
}

async function displayAirports(airports, countryName, countryCode) {
  const airportsList = document.getElementById("airports-list");
  airportsList.innerHTML = `<p>Airports in ${countryName}:</p>`;

  airports.forEach((airport, index) => {
    const airportBtn = document.createElement("li");
    airportBtn.className = "airport-btn";
    airportBtn.textContent = `${airport.ident} - ${
      airport.name
    } (${airport.city})`;
    airportBtn.onclick = () => handleAirportSelect(airport.ident, countryCode);
    airportsList.appendChild(airportBtn);
  });

  document.getElementById("airport-selection").style.display = "block";

  if (!mapInitialized) {
    await initializeMap();
  }

  const airportCodes = airports.map((a) => a.ident);
  highlightAirports(airportCodes);
}

function displayRoute(routeData) {
  const routeDetails = document.getElementById("route-details");
  const startAirport = routeData.route[0];
  const endAirport = routeData.route[routeData.route.length - 1];
  routeDetails.innerHTML = `
        <p><strong>Distance:</strong> ${routeData.distance} km</p>
        <p><strong>CO2 Required:</strong> ${routeData.co2_required} kg</p>
        <p><strong>CO2 Available:</strong> ${routeData.co2_available} kg</p>
        <div class="route-airports">
            <div class="airport-box start">
                <div class="airport-code">${startAirport.ident}</div>
                <div class="airport-name">${startAirport.name}</div>
            </div>
            
            <div class="route-arrow">
                <div class="arrow-head">→</div>
            </div>
            
            <div class="airport-box end">
                <div class="airport-code">${endAirport.ident}</div>
                <div class="airport-name">${endAirport.name}</div>
            </div>
        </div>
        <div class="route-path">
            ${routeData.route
              .map(
                (stop) =>
                  `<p>${
                    stop.type === "START"
                      ? "🛫"
                      : stop.type === "END"
                      ? "🛬"
                      : "🔄"
                  } ${stop.type}: ${stop.ident} - ${stop.name}</p>`
              )
              .join("")}
        </div>
    `;

  if (!routeData.enough_co2) {
    routeDetails.innerHTML += `<p style="color: red;">❌ Not enough CO2 for this route!</p>`;
    document.getElementById("btn-confirm-flight").style.display = "none";

    const replayBtn = document.createElement("button");
    replayBtn.id = "btn-ask-replay";
    replayBtn.textContent = "Options";
    replayBtn.onclick = handleCO2Failure;
    routeDetails.appendChild(replayBtn);
  } else {
    document.getElementById("btn-confirm-flight").style.display =
      "inline-block";
  }

  document.getElementById("route-info").style.display = "block";
    document.getElementById("airport-selection").style.display = "none";
  highlightRoute(routeData);
}

export function showResults(results) {
  showResultsScreen();
  const container = document.getElementById("results-container");
  container.innerHTML = `
        <h3>Your Results:</h3>
        <table>
            <tr><td>Levels Achieved:</td><td>${results.levels_achieved}</td></tr>
            <tr><td>Countries Visited:</td><td>${results.countries_visited}</td></tr>
            <tr><td>Total Distance:</td><td>${results.total_distance_km} km</td></tr>
            <tr><td>Total CO2:</td><td>${results.total_co2_kg} kg</td></tr>
            <tr><td>Status:</td><td>${results.game_status}</td></tr>
        </table>
    `;
}

// -----------------------------
// Event Handlers
// -----------------------------
function handleCO2Failure() {
  if (gameState.replayCount >= 3) {
    showGameModal("❌ You've used all 3 replay attempts. Game Over!", [
      {
        text: "OK",
        class: "btn-danger",
        onClick: () => endGameWithLose()
      }
    ]);
    return;
  }

  const remaining = 3 - gameState.replayCount;

  showGameModal(
    `❌ Your plane couldn't reach the destination.\nYou have ${remaining} replay attempts left.\nReplay this stage?`,
    [
      {
        text: "Replay",
        class: "btn-primary",
        onClick: () => replayStage()
      },
      {
        text: "Quit",
        class: "btn-danger",
        onClick: () => endGameWithLose()
      }
    ]
  );
}

async function handleCountrySubmit() {
  const btn = document.getElementById("btn-submit-country");
  btn.disabled = true;
  btn.textContent = "Checking...";

  const input = document
    .getElementById("country-input")
    .value.trim()
    .toUpperCase();
  if (!input) {
    document.getElementById("guess-feedback").textContent =
      "❌ Please enter a country code!";
    btn.disabled = false;
    btn.textContent = "Submit Guess";
    return;
  }

  const result = await submitGuess(input);

  btn.disabled = false;
  btn.textContent = "Submit Guess";

  if (!result) return;

  if (result.correct) {
    document.getElementById("guess-feedback").textContent = "✅ Correct!";
    gameState.selectedCountry = result.country_code;
    displayAirports(result.airports, result.country_name, result.country_code);
    document.getElementById("guess-section").style.display = "none";
    gameState.wrongAttempts = 0;
  } else {
    if (result.country_name) {
      gameState.correctCountryName = result.country_name;
    }

    gameState.wrongAttempts += 1;
    if (gameState.wrongAttempts === 3) {
      const correctCountryCode = gameState.countries[0];
      const countryNameDisplay = gameState.correctCountryName 
        ? ` (${gameState.correctCountryName})` 
        : "";

      gameState.currentStops += 1;

      document.getElementById("guess-feedback").innerHTML = `❌ Wrong! Tip: The correct country is ${correctCountryCode}${countryNameDisplay}.<br><br>
        ✈️ You get ${gameState.currentStops} additional layover${gameState.currentStops > 1 ? 's' : ''} as a penalty!`;
      document.getElementById("attempts-info").textContent =
        "You can now type it to continue.";
    } else if (gameState.wrongAttempts > 3) {
      const correctCountryCode = gameState.countries[0];
      const countryNameDisplay = gameState.correctCountryName 
        ? ` (${gameState.correctCountryName})` 
        : "";
      
      document.getElementById("guess-feedback").innerHTML = 
        `❌ Wrong! The correct country is ${correctCountryCode}${countryNameDisplay}.<br><br>
        Please type the correct country code to continue.`;
      document.getElementById("attempts-info").textContent = "";
    } else {
      document.getElementById(
        "guess-feedback"
      ).textContent = `❌ Wrong guess. Try again! (${gameState.wrongAttempts}/3)`;
      document.getElementById("attempts-info").textContent = "";
    }
  }
}

async function handleAirportSelect(airportCode, countryCode) {
  gameState.selectedAirport = airportCode;
  const routeData = await selectAirport(airportCode, countryCode);

  if (routeData) {
    displayRoute(routeData);
  }
}

async function handleConfirmFlight() {
  const routeData = await selectAirport(
    gameState.selectedAirport,
    gameState.selectedCountry
  );

  if (!routeData || !routeData.enough_co2) {
    showGameModal("❌ Not enough CO2 for this flight!", [
      {
        text: "OK",
        class: "btn-danger"
      }
    ]);
    return;
  }

  const result = await confirmFlight(
    gameState.selectedAirport,
    gameState.selectedCountry,
    routeData.distance,
    routeData.co2_required
  );

  if (!result) return;

  const info = getAirportInfo(gameState.selectedAirport);
  gameState.origin = gameState.selectedAirport;
  gameState.originName = info?.name || "";
  gameState.originCountry = info?.country || "";

  if (mapInitialized) {
    const { displayAirportMarkers } = await import("./mapScreen.js");
    displayAirportMarkers();
  }

  if (result.game_complete) {
    const finalResults = await getGameResults();
    showResults(finalResults);
  } else if (result.stage_complete) {
    showGameModal(`🎉 Stage ${gameState.stage} complete!\nMoving to Stage ${result.next_stage}`,
      [
        {
          text: "Continue",
          class: "btn-primary",
          onClick: () => {
            gameState.stage = result.next_stage;
            gameState.co2Available = result.co2_available;
            gameState.co2Initial = result.co2_available;
            gameState.countries = result.countries;
            gameState.tips = result.tips;
            gameState.replayCount = 0;
            gameState.currentStops = 0; 
            saveBackup();
            updateGameDisplay();
            document.getElementById("guess-section").style.display = "block";
          }
        }
      ]
    );
  } else {
    gameState.co2Available = result.co2_available;
    gameState.countries = result.countries_remaining;
    gameState.tips = result.tips;
    updateGameDisplay();
    document.getElementById("guess-section").style.display = "block";
  }
}

function handleCancelFlight() {
  document.getElementById("route-info").style.display = "none";
  document.getElementById("airport-selection").style.display = "block";
}

export {
  startNewGame,
  handleCountrySubmit,
  handleConfirmFlight,
  handleCancelFlight,
  gameState,
  restartGame,
  quitGame
};