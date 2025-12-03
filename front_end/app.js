// -----------------------------
// Helper to create screens
// -----------------------------
function createScreen(id, contentHTML) {
    const section = document.createElement("section");
    section.id = id;
    section.className = "screen";
    section.innerHTML = contentHTML;
    section.style.display = "none"; // hidden by default
    return section;
}

// -----------------------------
// Create screens dynamically
// -----------------------------
const app = document.getElementById("app");

// START SCREEN
const startScreen = createScreen("screen-start", `
    <img src="assets/logo.png" class="logo">
    <button id="btn-start">Start Game</button>
`);

// RULES CHOICE SCREEN
const rulesChoiceScreen = createScreen("screen-rules-choice", `
    <h2>Would you like to read the rules?</h2>
    <button id="btn-yes-rules">Yes</button>
    <button id="btn-no-rules">No</button>
`);

// RULES SCREEN
const rulesScreen = createScreen("screen-rules", `
    <h2>Game Rules</h2>
    <p>(You will insert your rule text here later.)</p>
    <button id="btn-rules-continue">Continue</button>
`);

// MAIN GAME SCREEN
const gameScreen = createScreen("screen-game", `
    <h2>EcoTrip Mission</h2>
    
    <!-- Reuse your map -->
    <iframe src="map.html" class="map-frame"></iframe>

    <div id="mission-info">
        <h3>Flight Information</h3>
        <p id="mission-text">Loading mission...</p>

        <input id="country-input" placeholder="Write country code"/>
        <button id="btn-submit-country">Submit</button>
    </div>
`);

// RESULTS SCREEN
const resultsScreen = createScreen("screen-results", `
    <h2>Game Over</h2>

    <div id="results-container"></div>

    <button id="btn-best">Best results</button>
    <button id="btn-start-again">Start Again</button>
    <button id="btn-quit">Quit</button>
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
// Button event listeners
// -----------------------------
document.addEventListener("click", (event) => {
    switch (event.target.id) {
        case "btn-start":
            showScreen("screen-rules-choice");
            break;

        case "btn-yes-rules":
            showScreen("screen-rules");
            break;

        case "btn-no-rules":
            showScreen("screen-game");
            break;

        case "btn-rules-continue":
            showScreen("screen-game");
            break;

        case "btn-start-again":
            showScreen("screen-game");
            break;

        case "btn-submit-country":
            handleCountrySubmit();
            break;

        case "btn-next-mission":
            showScreen("screen-results");
            break;

        case "btn-best":
            alert("Best results coming soon");
            break;

        case "btn-quit":
            alert("Quitting game");
            break;
    }
});

// -----------------------------
// Example backend interaction placeholder
// -----------------------------
async function handleCountrySubmit() {
    const input = document.getElementById("country-input").value.trim().toUpperCase();
    if (!input) {
        alert("Enter a country code!");
        return;
    }

    console.log("User entered:", input);

    // Example: You can later call your Flask backend using fetch()
    // const res = await fetch("http://127.0.0.1:5000/api/guess?country=" + input);
    // const data = await res.json();

    // For now just show placeholder
    document.getElementById("mission-text").innerText = "You selected: " + input;
    // appear button next to submit for next mission or end game

    const nextButton = document.createElement("button");
    nextButton.innerText = "Results Page";
    nextButton.id = "btn-next-mission";
    document.getElementById("mission-info").appendChild(nextButton);

}

// -----------------------------
// End game example
// -----------------------------
function endGame(resultData) {
    document.getElementById("results-container").innerHTML = `
        <p>Total distance: ${resultData.distance} km</p>
        <p>Total CO2 used: ${resultData.co2} kg</p>
        <p>Flights taken: ${resultData.flights}</p>
    `;
    showScreen("screen-results");
}
