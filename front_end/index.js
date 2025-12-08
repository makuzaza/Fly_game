import { fetchAirportsByCountry, fetchStage, fetchLayoverRoute, fetchGameResults, fetchLeaderboard, resetGame } from "./api.js";
import { initMap } from "./mapScreen.js";
import { get_game_status, introStage1, addSystemMsg } from "./chatHelpers.js";

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

// =============================
// Game Session State Manager
// =============================
function getSession() {
  return JSON.parse(sessionStorage.getItem("gameSession")) || {};
}
function setSession(updates) {
  const current = getSession();
  const updated = { ...current, ...updates };
  sessionStorage.setItem("gameSession", JSON.stringify(updated));
  return updated;
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
async function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // ------------------------------------
  // Load Stage + Session
  // ------------------------------------
  let stage = get_game_status();  
  let session = getSession() || {};
    console.log(session);

    // if no session or stage exists, or user wants fresh start
    if (!session || !stage) {
      sessionStorage.removeItem("session");
      sessionStorage.removeItem("stage");
      stage = await loadStage();   // create new stage
      session = {};
    }
    console.log("No session or stage found. Starting fresh.");

    // Initialize session fields
    session.playerName      ??= sessionStorage.getItem("playerName");
    session.currentStage    ??= stage.current_stage;    // 1–3
    session.orderCountries  ??= stage.order_countries;  // [ISO1, ISO2, ISO3]
    session.clueGuesses     ??= [];                     // per stage guesses
    session.origin          ??= stage.origin;
    session.startOrigin     ??= stage.origin;
    session.wrongGuessCount ??= 0;
    session.initialCo2      ??= stage.co2_available;
    session.co2Available    ??= stage.co2_available;
    session.places          ??= stage.places;

    setSession(session);
    console.log('session: ', session);

  // ---- Build UI ----
  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen game-screen";

  screen.innerHTML = `
    <!-- LEFT SIDE: MAP -->
    <div id="map-container">
        <!-- FOOTER: 3 tips -->
        <footer id="tips-footer" aria-label="Tips">
            <div class="tip" id="tip1"><span class="tip-label">Tip 1:</span> unguessed</div>
            <div class="tip highlighted" id="tip2"><span class="tip-label">Tip 2:</span> guessed</div>
            <div class="tip" id="tip3"><span class="tip-label">Tip 3:</span> unguessed</div>
        </footer>
    </div>

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
        <!-- MINI MODAL / POPUP MENU -->
        <div id="moreMenu" class="more-menu hidden">
          <button id="btnResults">Results</button>
          <button id="btnRules">Rules</button>
        </div>

      </div>

    </div>
  `;

  app.appendChild(screen);
  initMap("map-container", "http://localhost:5000");

  // ---- Submit btn logc ----
  const output = document.getElementById("chatMessages");
  // ------------------------------------
  // Intro for Stage 1
  // ------------------------------------
  if (session.currentStage === 1 && session.clueGuesses.length === 0) {
      introStage1(output, session.playerName);
      console.log("IntroStage1 triggered for player:", session.playerName);
  }

  // ---- Toggle btn logic ----
  const btnMore = document.getElementById("btnMoreOptions");
  const menu = document.getElementById("moreMenu");

  btnMore.onclick = (e) => {
    e.stopPropagation();  
    menu.classList.toggle("hidden");
  };

  // Close popup when clicking outside
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btnMore) {
      menu.classList.add("hidden");
    }
  });

  // Button actions
  document.getElementById("btnResults").onclick = () => {
    console.log("Results clicked");
    showResultsScreen(); 
  };

  document.getElementById("btnRules").onclick = () => {
    console.log("Rules clicked");
  };
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
    if (data.status === "Win") {
      statusMessage = "Mission complete!";
    } else if (data.status === "Lose") {
      statusMessage = "Next time might be your chance!";
    } else if (data.status === "Quit") {
      statusMessage = "Let's play another time again!";
    }

    screen.innerHTML = `
        <h1 id="result_status">${statusMessage}</h1> <!-- This should be Win/Lose/Quit -->
        <h2>Your game results:</h2>
        <div id="result_table">
            <table>
                <tr>
                    <td>Levels passed</td>
                    <td id="result_levels">${data.levels || 0}</td>
                </tr>
                <tr>
                    <td>Total distance, km</td>
                    <td id="result_distance">${data.km_amount || 0}</td>
                </tr>
                <tr>
                    <td>Countries visited</td>
                    <td id="result_countries">${data.cities || 0}</td>
                </tr>
                <tr>
                    <td>Total CO2, kg</td>
                    <td id="result_co2">${data.co2_amount || 0}</td>
                </tr>
                <tr>
                    <td>Efficiency, %</td>
                    <td id="efficiency">${data.efficiency || 0}</td>
                </tr>
                <tr>
                    <td>Game status</td>
                    <td id="game_status">${data.status}</td>
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
                                <th>Efficiency</th>
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

    row.innerHTML = `
      <td>${player.display_place || player.place}</td>
      <td>${player.name}</td>
      <td>${player.km_amount}</td>
      <td>${player.co2_amount}</td>
      <td>${player.efficiency}%</td>
      <td>${player.status}</td>
    `;

    if (player.id === result.current_id) {
      row.style.backgroundColor = "midnightblue";
      row.style.color = "whitesmoke";
    }
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
