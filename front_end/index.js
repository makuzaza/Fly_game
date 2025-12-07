import {
  startNewGame,
  handleCountrySubmit,
  handleConfirmFlight,
  handleCancelFlight,
  gameState,
} from "./app.js";

// -----------------------------
// Show Start Screen
// -----------------------------
function showStartScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen start-screen";
  screen.innerHTML = `
    <div><img src="assets/logo.png" class="logo" alt="EcoTrip Logo" /></div>
    <input id="player-name" type="text" placeholder="Enter your name" />
    <div><button id="btn-start">Start Game</button></div>
  `;
  app.appendChild(screen);

  document.getElementById("btn-start").onclick = () => {
    const playerName = document.getElementById("player-name").value.trim();
    if (!playerName) {
      alert("Please enter your name!");
      return;
    }
    gameState.playerName = playerName;
    showRulesChoiceScreen();
  };
}

// -----------------------------
// Show Rules Choice Screen
// -----------------------------
function showRulesChoiceScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen rules-choice-screen";
  screen.innerHTML = `
    <h2>Would you like to read the background story?</h2>
    <button id="btn-yes-rules">Yes</button>
    <button id="btn-no-rules">No</button>
  `;
  app.appendChild(screen);

  document.getElementById("btn-yes-rules").onclick = () => showRulesScreen();
  document.getElementById("btn-no-rules").onclick = () =>
    startNewGame(gameState.playerName);
}

// -----------------------------
// Show Rules Screen
// -----------------------------
function showRulesScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen rules-screen";
  screen.innerHTML = `
    <h2>Background Story</h2>
    <p>Plan your flights wisely to stay within CO2 and flight limits!</p>
    <p>You will visit different countries based on clues, manage your CO2 budget, and complete 5 stages.</p>
    <button id="btn-rules-continue">Continue</button>
  `;
  app.appendChild(screen);

  document.getElementById("btn-rules-continue").onclick = () =>
    startNewGame(gameState.playerName);
}

// -----------------------------
// Show Game Screen
// -----------------------------
export function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen game-screen";
  screen.innerHTML = `
    <h2>EcoTrip Mission</h2>
    
    <div id="game-info">
        <h3>Stage <span id="current-stage">1</span>/5</h3>
        <p>💨 CO2 Available: <span id="co2-display">0</span> kg</p>
        <p>📍 Current Location: <span id="current-origin"></span></p>
    </div>

    <div id="map-container" style="height: 400px; width: 100%; margin: 20px 0; border: 2px solid #ccc;"></div>

    <div id="mission-container">
        <h3>🕵️ Country Clues:</h3>
        <div id="clues-list"></div>
        
        <div id="guess-section">
            <input id="country-input" placeholder="Enter country code (e.g., US, FI)" maxlength="2"/>
            <button id="btn-submit-country">Submit Guess</button>
            <p id="guess-feedback"></p>
            <p id="attempts-info"></p>
        </div>
        
        <div id="airport-selection" style="display: none;">
            <h3>🛬 Select Destination Airport:</h3>
            <div id="airports-list"></div>
        </div>
        
        <div id="route-info" style="display: none;">
            <h3>📋 Route Summary:</h3>
            <div id="route-details"></div>
            <button id="btn-confirm-flight">Confirm Flight</button>
            <button id="btn-cancel-flight">Choose Different Airport</button>
        </div>
    </div>
  `;
  app.appendChild(screen);

  // Setup event listeners for game screen
  document.getElementById("btn-submit-country").onclick = () =>
    handleCountrySubmit();
  document.getElementById("btn-confirm-flight").onclick = () =>
    handleConfirmFlight();
  document.getElementById("btn-cancel-flight").onclick = () =>
    handleCancelFlight();

  // Allow Enter key for country input
  document.getElementById("country-input").onkeypress = (event) => {
    if (event.key === "Enter") {
      handleCountrySubmit();
    }
  };
}

// -----------------------------
// Show Results Screen
// -----------------------------
export function showResultsScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen results-screen";
  screen.innerHTML = `
    <h2>Game Over!</h2>
    <div id="results-container"></div>
    <button id="btn-start-again">Play Again</button>
  `;
  app.appendChild(screen);

  document.getElementById("btn-start-again").onclick = () => {
    location.reload();
  };
}

// Start the app by showing the start screen
showStartScreen();