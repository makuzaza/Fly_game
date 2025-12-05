import { fetchAirportsByCountry, fetchStage, fetchLayoverRoute, fetchGameResults, resetGame } from "./api.js";

("use strict");
function setBackground(backgroundPath) {
  const app = document.getElementById("app");
  app.style.backgroundImage = `url(${backgroundPath})`;
}

function renderHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./img/logo.png" alt="EcoTrip" class="logo" />
  `;
  return header;
}

let gameResults = null;
// this functions needs to be moved in api.js
async function loadResults() {
  try {
    const res = await fetch("http://localhost:5000/api/result"); // Flask request
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    gameResults = data;
    return data;
  } catch (err) {
    console.error("Response error:", err);
    return null;
  }
}

// ----------------------------------------------
// START SCREEN
// ----------------------------------------------
function showStartScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const screen = document.createElement("div");
  screen.className = "screen start-screen";

  screen.innerHTML = `
      <img src="./img/logo.png" style="width:300px;" alt="EcoTrip Logo" /><br/>
      <input id="playerName" placeholder="Enter your name" /><br/>
      <button id="btnStart">Start Game</button>
  `;

  app.appendChild(screen);

  document.getElementById("btnStart").onclick = () => {
    const name = document.getElementById("playerName").value.trim();
    if (!name) {
      alert("Please enter your name!");
      return;
    }
    sessionStorage.setItem("playerName", name);
    showRulesQuestion();
  };
}

// ----------------------------------------------
// SECOND SCREEN
// ----------------------------------------------
function drawQuestionBox(questionText, yesCallback, noCallback) {
  const app = document.getElementById("app");
  app.innerHTML = ""; // clear previous screen

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen question-screen";

  const box = document.createElement("div");
  box.className = "question-box";

  const question = document.createElement("h3");
  question.textContent = questionText;

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "question-buttons";

  const yesBtn = document.createElement("button");
  yesBtn.className = "question-button";
  yesBtn.textContent = "YES";
  yesBtn.onclick = yesCallback;

  const noBtn = document.createElement("button");
  noBtn.className = "question-button";
  noBtn.textContent = "NO";
  noBtn.onclick = noCallback;

  buttonContainer.appendChild(yesBtn);
  buttonContainer.appendChild(noBtn);

  box.appendChild(question);
  box.appendChild(buttonContainer);

  screen.appendChild(box);
  app.appendChild(screen);
}

function showRulesQuestion() {
  app.appendChild(renderHeader());
  drawQuestionBox(
    "Do you want to read the rules?",
    showRulesScreen,
    showGameScreen
  );
}

// ----------------------------------------------
// RULES SCREEN
// ----------------------------------------------
function showRulesScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen rules-screen";

  screen.innerHTML = `
    <h2>Game Rules</h2>
    <p>Hello, my friend!</p>
    <p>Welcome to the exciting world of global travel!</p>
    <div>In this game, you will embark on flights to distant countries, solve intriguing puzzles, and experience unforgettable adventures.</div>
    <div>Of course, it is important to keep the environment in mind — so plan your route carefully to reduce CO₂ emissions.</div>
    <p>Here’s how it works:</p>
    <div>You’ll start Level 1 from Helsinki, and always progress from previous destination.</div>
    <div>Your task is to visit 3 countries by guessing their names.</div>
    <div>Don’t worry - plenty of hints will guide you along the way.</div>
    <div>Each level has a CO₂ budget, so plan your flights wisely!</div>
    <div>We recommend using the map to choose the most optimal route.</div>
    <div>Each country may have several airports, so choose wisely, always considering the environmental impact.</div>
    <div>If you don’t succeed, each level can be replayed up to 3 times.</div>
    <div>You can also exit the game at any time by typing “quit” or “X” on your keyboard.</div>
    <div>At the end of the game, you’ll see your results, which will also be automatically saved to the database for future viewing.</div>
    <p>Good luck! 🌍✈️</p>
    <button id="btnContinue">Continue</button>
  `;

  app.appendChild(screen);

  document.getElementById("btnContinue").onclick = () => showGameScreen();
}

// ----------------------------------------------
// GAME SCREEN
// ----------------------------------------------
async function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // ---- Load Stage data ----
  const stage = await fetchStage();
  console.log("Loaded Stage:", stage);
  console.log('places: ', stage.places)

  function validateCountryInput(code) {
    // Must be exactly 2 characters (ISO country code)
    if (code.length !== 2) {
      return { valid: false, message: "Country code must be 2 letters (e.g. FI, US, JP)." };
    }

    // Must be alphabetic
    if (!/^[A-Z]{2}$/.test(code)) {
      return { valid: false, message: "Country code must contain only letters." };
    }

    // 2. Check if the ISO code exists in the stage's 'places'
    if (!stage.places || !stage.places[code]) {
      return { valid: false, message: `X ${code} is not one of the target countries for this stage.` };
    }

    // 3. Lookup ICAO code for this country
    const icao = stage.places[code];

    return {
        valid: true,
        iso: code,
        icao: icao,
        message: `Correct guess: ${code} -> Airport ${icao}`
    };
  }

  // ---- Build UI ----
  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen game-screen";

  screen.innerHTML = `
    <h2>Game Screen</h2>

    <div class="map-box">
        <iframe src="map.html" style="min-width:800px; height:300px;"></iframe>
    </div>

    <div class="guess-section">
      <label>Guess the country:</label>
      <input id="countryInput" placeholder="Enter country" />
      <button id="btnSubmit">Submit</button>
    </div>

    <div id="guessResult"></div>

    <button id="btnResults">Results</button>
  `;

  app.appendChild(screen);

  // ---- Submit btn logc ----
  document.getElementById("btnSubmit").onclick = async () => {
    const code = document
      .getElementById("countryInput")
      .value.trim()
      .toUpperCase();
    const output = document.getElementById("guessResult");

    // --- Validate input ---
    if (!code) {
      output.innerHTML = "<p>Type a country code.</p>";
      return;
    }
    const validation = validateCountryInput(code);
    if (!validation.valid) {
        output.innerHTML = `<p>${validation.message}</p>`;
        return; // Stop everything
    } else {
      console.log(`<p>${validation.message}</p>`);
    }

    const destination = validation.icao;
    const origin = stage["origin"]; // use returned stage origin

    // --- Load layover route (only when valid guess) ---
    console.log("Fetching layover from", origin, "to", destination);

    const layover_route = await fetchLayoverRoute(origin, destination);

    console.log("Loaded layover_route:", layover_route);

    const result = await fetchAirportsByCountry(code);

    if (!result || result.airports.length === 0) {
      output.innerHTML = `<p>No airports found for <b>${code}</b></p>`;
      return;
    }

    output.innerHTML = `
        <h3>Airports in ${code}</h3>
        <ul>
            ${result.airports
              .map((a) => `<li>${a.ident} — ${a.name} (${a.city})</li>`)
              .join("")}
        </ul>
    `;    
  };

  document.getElementById("btnResults").onclick = () => showResultsScreen();
}

// ----------------------------------------------
// RESULTS SCREEN
// ----------------------------------------------
async function showResultsScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen results-screen";

  const data = await fetchGameResults();

  if (!data) {
    screen.innerHTML = `
      <h2>Results</h2>
      <p>Error loading results. Please try again.</p>
      <button id="btnRestart">Play Again</button>
    `;
  } else {
    let statusMessage = "Game Over";
    if (data.game_status === "Win") {
      statusMessage = "Mission complete!";
    } else if (data.game_status === "Lose") {
      statusMessage = "Next time might be your chance!";
    } else if (data.game_status === "Quit") {
      statusMessage = "Let's play another time again!";
    }

    screen.innerHTML = `
      <h2>Results</h2>
      <h3>${statusMessage}</h3>
      <p><strong>Levels passed:</strong> ${data.levels_passed || 0}</p>
      <p><strong>Total distance:</strong> ${data.total_distance_km || 0} km</p>
      <p><strong>Visited countries:</strong> ${data.countries_visited || 0}</p>
      <p><strong>Total CO₂:</strong> ${data.total_co2_kg || 0} kg</p>

    <button id="btnRestart">Play Again</button>
  `;

    app.appendChild(screen);

    document.getElementById("btnRestart").onclick = () => showGameScreen();
  }
}

setBackground("./img/background.jpg");
showStartScreen();
