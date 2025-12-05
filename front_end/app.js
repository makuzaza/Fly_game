// -----------------------------
// Map Screen Class (inline definition)
// -----------------------------
class MapScreen {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.map = null;
        this.airports = [];
        this.markers = [];
        this.routeLine = null;
        this.onAirportClick = null;
    }

    async init(containerId = "map-container") {
        this.map = L.map(containerId).setView([50, 10], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        await this.loadAirports();
        this.displayAirportMarkers();
    }

    async loadAirports() {
        try {
            const response = await fetch(`${this.apiUrl}/api/airports`);
            if (!response.ok) throw new Error("Failed to load airports");
            this.airports = await response.json();
            console.log(`Loaded ${this.airports.length} airports`);
        } catch (error) {
            console.error("Error loading airports:", error);
        }
    }

    displayAirportMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const marker = L.circleMarker([airport.lat, airport.lng], {
                radius: 5,
                fillColor: "#3388ff",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.6
            });

            marker.bindPopup(`
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
            `);

            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    highlightAirports(airportCodes) {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const isHighlighted = airportCodes.includes(airport.ident);
            
            const marker = L.circleMarker([airport.lat, airport.lng], {
                radius: isHighlighted ? 8 : 5,
                fillColor: isHighlighted ? "#ff0000" : "#3388ff",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: isHighlighted ? 0.9 : 0.6
            });

            marker.bindPopup(`
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
                ${isHighlighted ? '<br><em>Destination Available</em>' : ''}
            `);

            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    drawRoute(routeAirportCodes) {
        if (this.routeLine) {
            this.routeLine.remove();
        }

        const routeCoords = [];
        routeAirportCodes.forEach(code => {
            const airport = this.airports.find(a => a.ident === code);
            if (airport) {
                routeCoords.push([airport.lat, airport.lng]);
            }
        });

        if (routeCoords.length > 1) {
            this.routeLine = L.polyline(routeCoords, {
                color: '#ff0000',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(this.map);
            this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
        }
    }

    highlightRoute(routeData) {
        if (!routeData || !routeData.route) return;

        const routeCodes = routeData.route.map(stop => stop.ident);
        this.drawRoute(routeCodes);

        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const routeIndex = routeCodes.indexOf(airport.ident);
            const isInRoute = routeIndex !== -1;
            
            let color = "#3388ff";
            let radius = 5;
            
            if (isInRoute) {
                if (routeIndex === 0) {
                    color = "#00ff00";
                    radius = 10;
                } else if (routeIndex === routeCodes.length - 1) {
                    color = "#ff0000";
                    radius = 10;
                } else {
                    color = "#ffaa00";
                    radius = 8;
                }
            }
            
            const marker = L.circleMarker([airport.lat, airport.lng], {
                radius: radius,
                fillColor: color,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });

            let popupText = `
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
            `;
            
            if (isInRoute) {
                const stop = routeData.route[routeIndex];
                popupText += `<br><em>${stop.type}</em>`;
            }

            marker.bindPopup(popupText);
            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    clearRoute() {
        if (this.routeLine) {
            this.routeLine.remove();
            this.routeLine = null;
        }
        this.displayAirportMarkers();
    }

    focusAirport(airportCode) {
        const airport = this.airports.find(a => a.ident === airportCode);
        if (airport) {
            this.map.setView([airport.lat, airport.lng], 8);
        }
    }

    setOnAirportClick(callback) {
        this.onAirportClick = callback;
    }

    resize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
}

// -----------------------------
// Game State
// -----------------------------
let gameState = {
    playerName: "",
    stage: 0,
    co2Available: 0,
    countries: [],
    tips: [],
    origin: "",
    selectedCountry: null,
    selectedAirport: null,
    wrongAttempts: 0,
    replayCount: 0,
    backupSession: null,
    backupTotal: null
};

const API_URL = "http://localhost:5000";
let mapScreen = null;

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
    <img src="assets/logo.png" class="logo">
    <h1>Flight Game - Route Planner</h1>
    <input id="player-name" type="text" placeholder="Enter your name" />
    <button id="btn-start">Start Game</button>
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
        <p>📍 Current Location: <span id="current-origin">EFHK</span></p>
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
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    const screen = document.getElementById(id);
    if (screen) screen.style.display = "block";
}

// Show the start screen on first load
showScreen("screen-start");

// -----------------------------
// Initialize Map when game screen is shown
// -----------------------------
async function initializeMap() {
    if (!mapScreen) {
        mapScreen = new MapScreen(API_URL);
        await mapScreen.init("map-container");
        
        // Set callback for airport clicks on map
        mapScreen.setOnAirportClick((airport) => {
            // Only allow selection if airports are currently being shown
            if (document.getElementById("airport-selection").style.display === "block") {
                handleAirportSelect(airport.ident, gameState.selectedCountry);
            }
        });
    } else {
        // Map already exists, just resize it
        mapScreen.resize();
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
            body: JSON.stringify({ player_name: playerName })
        });
        
        if (!response.ok) throw new Error("Failed to start game");
        
        const data = await response.json();
        gameState.playerName = playerName;
        gameState.stage = data.stage;
        gameState.co2Available = data.co2_available;
        gameState.countries = data.countries;
        gameState.tips = data.tips;
        gameState.origin = data.origin;
        gameState.wrongAttempts = 0;
        gameState.replayCount = 0;
        
        // Save backup for potential replay
        await saveBackup();
        
        updateGameDisplay();
        showScreen("screen-game");

        // Initialize map
        setTimeout(async () => {
            await initializeMap();
        }, 100);
    } catch (error) {
        alert("Error starting game: " + error.message);
    }
}

async function submitGuess(guess) {
    try {
        const response = await fetch(`${API_URL}/api/game/guess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                player_name: gameState.playerName,
                guess: guess 
            })
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
                country_code: countryCode
            })
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
                co2: co2
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        alert("Error confirming flight: " + error.message);
        return null;
    }
}

async function getGameResults() {
    try {
        const response = await fetch(`${API_URL}/api/result/${gameState.playerName}`);
        const data = await response.json();
        return data;
    } catch (error) {
        alert("Error fetching results: " + error.message);
        return null;
    }
}

async function saveBackup() {
    try {
        const response = await fetch(`${API_URL}/api/game/state/${gameState.playerName}`);
        const data = await response.json();
        
        gameState.backupSession = {
            origin: data.origin,
            current_stage: data.stage,
            co2_available: data.co2_available,
            places: {}
        };
        
        // Store places as object
        data.countries.forEach(country => {
            gameState.backupSession.places[country] = country;
        });
        
        gameState.backupTotal = {
            total_distance: data.total_distance,
            total_co2: data.total_co2,
            flight_history: []
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
                backup_total: gameState.backupTotal
            })
        });
        
        const data = await response.json();
        
        if (data.replayed) {
            gameState.stage = data.stage;
            gameState.co2Available = data.co2_available;
            gameState.countries = data.countries;
            gameState.tips = data.tips;
            gameState.origin = data.origin;
            gameState.wrongAttempts = 0;
            gameState.replayCount++;
            
            updateGameDisplay();
            document.getElementById("guess-section").style.display = "block";
        }
    } catch (error) {
        alert("Error replaying stage: " + error.message);
    }
}

async function endGameWithLose() {
    try {
        const response = await fetch(`${API_URL}/api/game/end-lose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                player_name: gameState.playerName
            })
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
    document.getElementById("current-stage").textContent = gameState.stage;
    document.getElementById("co2-display").textContent = gameState.co2Available.toFixed(2);
    document.getElementById("current-origin").textContent = gameState.origin;
    
    // Display clues
    const cluesList = document.getElementById("clues-list");
    cluesList.innerHTML = "";
    gameState.tips.forEach((tip, index) => {
        const clueItem = document.createElement("p");
        clueItem.textContent = `${index + 1}. ${tip}`;
        cluesList.appendChild(clueItem);
    });
    
    // Reset guess section
    document.getElementById("country-input").value = "";
    document.getElementById("guess-feedback").textContent = "";
    document.getElementById("attempts-info").textContent = "";
    document.getElementById("airport-selection").style.display = "none";
    document.getElementById("route-info").style.display = "none";
    gameState.wrongAttempts = 0;
}

function displayAirports(airports, countryName, countryCode) {
    const airportsList = document.getElementById("airports-list");
    airportsList.innerHTML = `<p>Airports in ${countryName}:</p>`;
    
    airports.forEach((airport, index) => {
        const airportBtn = document.createElement("button");
        airportBtn.className = "airport-btn";
        airportBtn.textContent = `${index + 1}. ${airport.ident} - ${airport.name} (${airport.city})`;
        airportBtn.onclick = () => handleAirportSelect(airport.ident, countryCode);
        airportsList.appendChild(airportBtn);
    });
    
    document.getElementById("airport-selection").style.display = "block";
    
    // Highlight airports on map
    if (mapScreen) {
        const airportCodes = airports.map(a => a.ident);
        mapScreen.highlightAirports(airportCodes);
    }
}

function displayRoute(routeData) {
    const routeDetails = document.getElementById("route-details");
    routeDetails.innerHTML = `
        <p><strong>Distance:</strong> ${routeData.distance} km</p>
        <p><strong>CO2 Required:</strong> ${routeData.co2_required} kg</p>
        <p><strong>CO2 Available:</strong> ${routeData.co2_available} kg</p>
        <div class="route-path">
            ${routeData.route.map(stop => 
                `<p>${stop.type === "START" ? "🛫" : stop.type === "END" ? "🛬" : "🔄"} ${stop.type}: ${stop.ident} - ${stop.name}</p>`
            ).join("")}
        </div>
    `;
    
    if (!routeData.enough_co2) {
        routeDetails.innerHTML += `<p style="color: red;">❌ Not enough CO2 for this route!</p>`;
        document.getElementById("btn-confirm-flight").style.display = "none";
        
        // Add replay/quit buttons
        const replayBtn = document.createElement("button");
        replayBtn.id = "btn-ask-replay";
        replayBtn.textContent = "Options";
        replayBtn.onclick = handleCO2Failure;
        routeDetails.appendChild(replayBtn);
    } else {
        document.getElementById("btn-confirm-flight").style.display = "inline-block";
    }
    
    document.getElementById("route-info").style.display = "block";
}

function showResults(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = `
        <h3>Your Results:</h3>
        <table>
            <tr><td>Levels Passed:</td><td>${results.levels_passed}</td></tr>
            <tr><td>Countries Visited:</td><td>${results.countries_visited}</td></tr>
            <tr><td>Total Distance:</td><td>${results.total_distance_km} km</td></tr>
            <tr><td>Total CO2:</td><td>${results.total_co2_kg} kg</td></tr>
            <tr><td>Status:</td><td>${results.game_status}</td></tr>
        </table>
    `;
    showScreen("screen-results");
}

// -----------------------------
// Event Handlers
// -----------------------------
function handleCO2Failure() {
    if (gameState.replayCount >= 3) {
        alert("You've used all 3 replay attempts. Game Over!");
        endGameWithLose();
        return;
    }
    
    const remainingAttempts = 3 - gameState.replayCount;
    const replay = confirm(
        `❌ Your plane was unable to reach its destination.\n\n` +
        `You still have ${remainingAttempts} tries to replay.\n\n` +
        `Do you want to replay this stage?`
    );
    
    if (replay) {
        replayStage();
    } else {
        endGameWithLose();
    }
}
async function handleCountrySubmit() {
    const input = document.getElementById("country-input").value.trim().toUpperCase();
    if (!input) {
        document.getElementById("guess-feedback").textContent = "❌ Please enter a country code!";
        return;
    }
    
    const result = await submitGuess(input);
    if (!result) return;
    
    if (result.correct) {
        document.getElementById("guess-feedback").textContent = "✅ Correct!";
        gameState.selectedCountry = result.country_code;
        displayAirports(result.airports, result.country_name, result.country_code);
        document.getElementById("guess-section").style.display = "none";
    } else {
        gameState.wrongAttempts++;
        if (gameState.wrongAttempts >= 3) {
            document.getElementById("guess-feedback").textContent = 
                `❌ Wrong! Tip: The correct country is ${gameState.countries[0]}`;
            document.getElementById("attempts-info").textContent = "You can now type it to continue.";
            // Don't reset attempts here - keep it at 3 so user knows tip is active
        } else {
            document.getElementById("guess-feedback").textContent = 
                `❌ Wrong guess. Try again! (${gameState.wrongAttempts}/3)`;
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
    const routeData = await selectAirport(gameState.selectedAirport, gameState.selectedCountry);
    
    if (!routeData || !routeData.enough_co2) {
        alert("Not enough CO2 for this flight!");
        return;
    }
    
    const result = await confirmFlight(
        gameState.selectedAirport, 
        gameState.selectedCountry,
        routeData.distance,
        routeData.co2_required
    );
    
    if (!result) return;
    
    if (result.game_complete) {
        alert("🎉 Congratulations! You completed all stages!");
        const finalResults = await getGameResults();
        showResults(finalResults);
    } else if (result.stage_complete) {
        alert(`🎉 Stage ${gameState.stage} complete! Moving to Stage ${result.next_stage}`);
        gameState.stage = result.next_stage;
        gameState.co2Available = result.co2_available;
        gameState.countries = result.countries;
        gameState.tips = result.tips;
        gameState.replayCount = 0; // Reset replay count for new stage
        
        // Save new backup for next stage
        await saveBackup();
        
        updateGameDisplay();
        document.getElementById("guess-section").style.display = "block";
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
    
    // Clear route from map
    if (mapScreen) {
        // Re-highlight available airports
        const airportsList = document.getElementById("airports-list");
        if (airportsList && document.getElementById("airport-selection").style.display === "block") {
            // Get current airports being shown
            const buttons = airportsList.querySelectorAll('.airport-btn');
            if (buttons.length > 0) {
                // Extract airport codes and re-highlight
                mapScreen.displayAirportMarkers();
            }
        }
    }
}

// -----------------------------
// Button event listeners
// -----------------------------
document.addEventListener("click", (event) => {
    switch (event.target.id) {
        case "btn-start":
            const playerName = document.getElementById("player-name").value.trim();
            if (!playerName) {
                alert("Please enter your name!");
                return;
            }
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