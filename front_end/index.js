import { fetchAirportsByCountry, fetchStage, fetchLayoverRoute, fetchGameResults, fetchLeaderboard, resetGame } from "./api.js";
import { initMap } from "./mapScreen.js";
import { validateCountryInput } from "./chatHelpers.js";

("use strict");

function renderHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./img/logo.png" alt="EcoTrip" class="logo" />
  `;
  return header;
}

// ---- Load Stage data and store it in the sessionStorage ---- 
async function loadStage() {
  const stage = await fetchStage();
  sessionStorage.setItem("stage", JSON.stringify(stage));
  console.log("Loaded Stage:", stage);
  console.log('places: ', stage.places);
  return;
};
loadStage();

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
      <img src="./img/logo.png" style="width:300px;" alt="EcoTrip Logo" />
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
    <div>We recommend using the map to choose the most optimal route.</div><br/>
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
// TASK SCREEN
// ----------------------------------------------

// ----------------------------------------------
// GAME SCREEN
// ----------------------------------------------
function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // ---- get stored stage data ----
  const stage = JSON.parse(sessionStorage.getItem("stage"));

  // ---- Build UI ----
  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen game-screen";

  screen.innerHTML = `
    <!-- LEFT SIDE: MAP -->
    <div id="map-container"></div>

    <div class="side-panel">
      <!-- RIGHT SIDE: TRIP-UPDATE SECTION -->
      <div class="trip-update"> </div>

      <!-- RIGHT SIDE: INTERACTIVE-BOX SECTION -->
      <div class="interactive-box">
        <div id="chatMessages"></div>

        <div class="guess-section">
          <input id="countryInput" placeholder="Enter country" />
          <button id="btnSubmit">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </button>
          <button id="btnMoreOptions">+</button>
        </div>
      </div>

    </div>
  `;

  app.appendChild(screen);
  initMap("map-container", "http://localhost:5000");

  // ---- Submit btn logc ----
  document.getElementById("btnSubmit").onclick = async () => {
    const code = document
      .getElementById("countryInput")
      .value.trim()
      .toUpperCase();
    const output = document.getElementById("chatMessages");

    // --- Validate input ---
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
  screen.className = "result_container";

  const data = await fetchGameResults();

  if (!data) {
    screen.innerHTML = `
      <h2>Results</h2>
      <p>Error loading results. Please try again.</p>
      <div class="result_buttons">
            <button id="result_again">Play Again</button>
            <button id="result_best">Best results</button>
            <button id="result_quit">Quit</button>
      </div>
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
        <h1 id="result_status">${statusMessage}</h1> <!-- This should be Win/Lose/Quit -->
        <h2>Your game results:</h2>
        <div id="result_table">
            <table>
                <tr>
                    <td>Levels passed</td>
                    <td id="result_levels">${data.levels_passed || 0}</td>
                </tr>
                <tr>
                    <td>Total distance, km</td>
                    <td id="result_distance">${data.total_distance_km || 0}</td>
                </tr>
                <tr>
                    <td>Countries visited</td>
                    <td id="result_countries">${data.countries_visited || 0}</td>
                </tr>
                <tr>
                    <td>Total CO2, kg</td>
                    <td id="result_co2">${data.total_co2_kg || 0}</td>
                </tr>
                <tr>
                    <td>Game status</td>
                    <td id="game_status">${data.game_status}</td>
                </tr>
            </table>
        </div>
        <div class="result_buttons">
            <button id="result_again">Play Again</button>
            <button id="result_best">Best results</button>
            <button id="result_quit">Quit</button>
        </div>
        
        <!-- Modal window -->
        <div id="leaderboard" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Leaderboard</h2>
                <div id="leaderboard_table">
                    <table>
                        <thead>
                            <tr>
                                <th>Place</th>
                                <th>Name</th>
                                <th>Distance, km</th>
                                <th>CO2, kg</th>
                                <th>Efficiency, %</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="leaderboard-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
  `;

    app.appendChild(screen);

    document.getElementById("result_again").onclick = () => showGameScreen();
    const modal = document.getElementById("leaderboard");
    const btnLeaderboard = document.getElementById("result_best");
    const btnClose = modal.querySelector(".close");
    document.getElementById("result_quit").onclick = () => showByeScreen();

    btnLeaderboard.onclick = async () => {
      await loadLeaderboard();
      modal.style.display = "block";
    };
    btnClose.onclick = () => {
      modal.style.display = "none";
    };
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };

  }
}

// Leaderboard loading
async function loadLeaderboard() {
  const result = await fetchLeaderboard();
  if (!result) return;

  const tableBody = document.getElementById("leaderboard-body");
  tableBody.innerHTML = "";

  result.leaderboard.forEach(player => {
    const row = document.createElement("tr");
    if (player.name === result.current_name) {
      row.style.backgroundColor = "#ffeeba";
    }
    row.innerHTML = `
      <td>${player.place}</td>
      <td>${player.name}</td>
      <td>${player.km_amount}</td>
      <td>${player.co2_amount}</td>
      <td>${player.efficiency}%</td>
      <td>${player.status}</td>
    `;
    tableBody.appendChild(row);
  });
}

// ----------------------------------------------
// BYE SCREEN
// ----------------------------------------------

async function showByeScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "bye-container";

  screen.innerHTML = `
      <div class="bye-message">
        <h2>Session complete. Aircraft secured.</h2>
        <p>Thank you for your service, Pilot!</p>
        <p>The sky await your return!</p>
        <p>---------------</p>
        <p>Goodbye!</p>
      </div>
    `;

  app.appendChild(screen);
}

showStartScreen();
