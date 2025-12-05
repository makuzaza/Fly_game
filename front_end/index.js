import {
    startNewGame,
    handleCountrySubmit,
    handleConfirmFlight,
    handleCancelFlight,
    gameState
} from "./app.js";

// -----------------------------
// Helper to create screens
// -----------------------------
function createScreen(id, contentHTML) {
    const section = document.createElement("section");
    section.id = id;
    section.className = "screen";
    section.innerHTML = contentHTML;
    section.style.display = "none";
    return section;
}

// -----------------------------
// Create screens dynamically
// -----------------------------
const app = document.getElementById("app");

// START SCREEN
const startScreen = createScreen("screen-start", `
    <div><img src="assets/logo.png" class="logo"></div>
    <input id="player-name" type="text" placeholder="Enter your name" />
    <div><button id="btn-start">Start Game</button></div>
`);

// RULES CHOICE SCREEN
const rulesChoiceScreen = createScreen("screen-rules-choice", `
    <h2>Would you like to read the background story?</h2>
    <button id="btn-yes-rules">Yes</button>
    <button id="btn-no-rules">No</button>
`);

// RULES SCREEN
const rulesScreen = createScreen("screen-rules", `
    <h2>Background Story</h2>
    <p>Plan your flights wisely to stay within CO2 and flight limits!</p>
    <p>You will visit different countries based on clues, manage your CO2 budget, and complete 5 stages.</p>
    <button id="btn-rules-continue">Continue</button>
`);

// MAIN GAME SCREEN
const gameScreen = createScreen("screen-game", `
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
            <h3>📍 Route Summary:</h3>
            <div id="route-details"></div>
            <button id="btn-confirm-flight">Confirm Flight</button>
            <button id="btn-cancel-flight">Choose Different Airport</button>
        </div>
    </div>
`);

// RESULTS SCREEN
const resultsScreen = createScreen("screen-results", `
    <h2>Game Over!</h2>
    <div id="results-container"></div>
    <button id="btn-start-again">Play Again</button>
`);

// Append all screens to the root
app.append(startScreen, rulesChoiceScreen, rulesScreen, gameScreen, resultsScreen);

// -----------------------------
// Navigation logic
// -----------------------------
export function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    const screen = document.getElementById(id);
    if (screen) screen.style.display = "block";
}

// Show the start screen on first load
showScreen("screen-start");

// -----------------------------
// Button event listeners
// -----------------------------
document.addEventListener("click", (event) => {
    switch (event.target.id) {
        case "btn-start":
            const playerName = document.getElementById("player-name").value.trim();
            gameState.playerName = playerName;
            showScreen("screen-rules-choice");
            break;

        case "btn-yes-rules":
            showScreen("screen-rules");
            break;

        case "btn-no-rules":
            startNewGame(gameState.playerName);
            break;

        case "btn-rules-continue":
            startNewGame(gameState.playerName);
            break;

        case "btn-submit-country":
            handleCountrySubmit();
            break;

        case "btn-confirm-flight":
            handleConfirmFlight();
            break;

        case "btn-cancel-flight":
            handleCancelFlight();
            break;

        case "btn-start-again":
            location.reload();
            break;
    }
});

// Allow Enter key for country input
document.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && event.target.id === "country-input") {
        handleCountrySubmit();
    }
});
