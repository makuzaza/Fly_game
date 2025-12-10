import { fetchAirportsByCountry, fetchStage, fetchLayoverRoute, fetchGameResults, fetchLeaderboard, resetGame } from "./api.js";
import { initMap } from "./mapScreen.js";
import { get_game_status, validateCountryInput, introStage1, correctGuess, failedGame, winGame, addUserMsg, addSystemMsg, wrongGuess1, wrongGuessPenalty } from "./chatHelpers.js";

("use strict");

function renderHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./img/logo.png" alt="EcoTrip" class="logo" />
  `;
  return header;
}

function renderHeaderWithQuit() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./img/logo.png" alt="EcoTrip" class="logo" />
      <div class="quit-icon">
      <img src="./img/logout.png" alt="Exit" class="exit" /></div>
  `;
  header.querySelector(".exit").onclick = () => {
    document.getElementById("quit-modal").style.display = "flex";
  };
  return header;
}

// --- Render tips to the game screen---
function renderTips(session) {
  const footer = document.getElementById("tips-footer");
  footer.innerHTML = "";

  if (!Array.isArray(session.orderCountries)) {
    console.error("session.orderCountries is missing or not an array", session);
    return;
  }

  // Create array's copy for shuffling
  const shuffledCountries = [...session.orderCountries];
  for (let i = shuffledCountries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCountries[i], shuffledCountries[j]] = [shuffledCountries[j], shuffledCountries[i]];
  }

  shuffledCountries.forEach((code, index) => {
    const tipDiv = document.createElement("div");
    tipDiv.className = "tip";
    tipDiv.id = `tip${index+1}`;

    if (session.clueGuesses.includes(code)) {
      tipDiv.classList.add("highlighted");
    }

    tipDiv.innerHTML = `<span class="tip-label">Tip ${index+1}:</span> ${session.clues?.[code] || "No clue for this country"}`;
    footer.appendChild(tipDiv);
  });
}

// --- Load Stage data and store it in the sessionStorage ---
async function loadStage() {
  const stage = await fetchStage();
  sessionStorage.setItem("stage", JSON.stringify(stage));
  console.log("Loaded Stage:", stage);
  console.log('places: ', stage.places);
  return stage;
};

// --- Game Session State Manager ---
function getSession() {
  return JSON.parse(sessionStorage.getItem("gameSession")) || {};
}
function setSession(updates) {
  const current = getSession();
  const updated = { ...current, ...updates };
  sessionStorage.setItem("gameSession", JSON.stringify(updated));
  return updated;
}
// --- reset handler ---
function resetHandler(delay = 6000, finalScreenFn = showResultsScreen)  {
  setTimeout(() => {
    resetGame();
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("stage");
    finalScreenFn();
  }, delay);
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
// GAME SCREEN
// ----------------------------------------------
async function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // --- Load Stage + Session ---
  let stage = get_game_status();  
  let session = getSession();
  console.log(session);

  // --- fresh start ---
  if (!session || !stage) {
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("stage");
    stage = await loadStage(); // create new stage
    console.log(stage)
    console.log(stage.places)
    session = {};
    if (!stage) {
      console.error("Couldn't load the stage. Please reload te page!");
      return; // stop execution
    }
    console.log("No session or stage found. Starting fresh.");
  }

  // --- Initialize session fields ---
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
  session.clues           ??= stage.clues;

  setSession(session);
  console.log('session: ', session);

  // ---- Build UI ----
  app.appendChild(renderHeaderWithQuit());

  const screen = document.createElement("div");
  screen.className = "screen game-screen";

  screen.innerHTML = `
    <!-- LEFT SIDE: MAP -->
    <div id="map-container">
        <!-- FOOTER: 3 tips -->
        <footer id="tips-footer" aria-label="Tips"></footer>
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

    screen.innerHTML += `
    <div id="quit-modal">
        <div class="modal-content-quit">
            <h3>Are you sure you want to quit the game?</h3>
            <div class="modal-buttons">
                <button id="quit-yes">Yes, quit</button>
                <button id="quit-no">No, continue</button>
            </div>
        </div>
    </div>
  `;

  app.appendChild(screen);

  renderTips(session);

  const quitModal = document.getElementById("quit-modal");

  document.getElementById("quit-yes").onclick = () => {
    quitModal.style.display = "none";
    showResultsScreen();
  };

  document.getElementById("quit-no").onclick = () => {
    quitModal.style.display = "none";
  };

  // --- Close by clicking outside modal ---
  quitModal.onclick = (event) => {
    if (event.target === quitModal) quitModal.style.display = "none";
  };

  // --- Initialize map ---
  initMap("map-container", "http://localhost:5000");
  const output = document.getElementById("chatMessages");
  // --- Stage introduction messages ---
  if (session.currentStage === 1 && session.clueGuesses.length === 0) {
    introStage1(output, session.playerName);
    console.log("IntroStage1 triggered for player:", session.playerName);
  }
  if (session.currentStage >= 2 && session.clueGuesses.length === 0) {
    addSystemMsg(output, `Welcome to ${session.currentStage} level, ${session.playerName}!!,`);
    addSystemMsg(output, `What is your guess now?`);
  }

  // ---- WRONG GUESS HANDLER ----
  async function handleWrongGuess(output, validation) {
    let session = getSession();
  
    session.wrongGuessCount += 1;
    setSession(session);
  
    const n = session.wrongGuessCount;
    
    // 1st wrong guess -> no penalty yet
    if (n === 1) {
      return wrongGuess1(output, validation.message);
    }
    // From 2nd wrong guess onwards -> penalty count shows
    const penaltyStops = n - 1;

    return wrongGuessPenalty(output, validation.message, penaltyStops);
  }

  // ---- CORRECT GUESS HANDLER ----
  async function handleCorrectGuess(output, validation) {
    let session = getSession();
    console.log('session: ', session);
          
    // Ensure user does not guess the same clue twice
    if (session.clueGuesses.includes(validation.iso)) {
      return addSystemMsg(output, `${validation.iso} was already guessed, try again!`);
    }
    const destICAO = validation.icao;
    console.log('destICAO: ', destICAO);
    const origin   = session.origin;

    let route;
    
    if (session.wrongGuessCount > 1) {
      // Apply penalty route only
      const penaltyStops = session.wrongGuessCount - 1;
      addSystemMsg(output, `You made mistakes earlier, applying ${penaltyStops} extra stops.`);
      route = await fetchLayoverRoute(origin, destICAO, penaltyStops);
    
    } else {
      // No mistakes -> normal route
      route = await fetchLayoverRoute(origin, destICAO, 0);
    }
    
    // Deduct CO₂ once
    session.co2Available -= route.co2_needed;
    console.log('route: ', route)
  
    if (session.co2Available < 0) {
      failedGame(output);
      resetHandler();
      return;
    }
  
    // Add this guess to the stage
    session.clueGuesses.push(validation.iso);
    session.origin = destICAO;
    session.wrongGuessCount = 0;
  
    correctGuess(output, validation.iso);
    setSession(session);
    renderTips(session); // rewrite tips with the highlight
    console.log('session in winhandler: ', session)
  
    // ---- Stage Completed? ----
    if (session.clueGuesses.length === 3) {
      const success = JSON.stringify(session.clueGuesses) === JSON.stringify(session.orderCountries);
      console.log('Clues success: ', success)
  
      if (!success) {
        failedGame(output);
        resetHandler();
        return;
      }
  
      // WIN if last stage
      if (session.currentStage === 3) { 
        winGame(output);
        resetHandler();
        return;
      }
  
      // Otherwise, PASS STAGE → load new stage
      addSystemMsg(output, "Great job! Loading the next stage...")
      const newStage = await loadStage();  // fetch from API and replace old stage
      console.log('newStage: ', newStage)
      if (!newStage) {
        console.error("Couldnt load the stage. Start again.");
      }         
      session.currentStage    = newStage.current_stage;
      session.orderCountries  = newStage.order_countries;
      session.places          = newStage.places;
      session.clues           = newStage.clues;
      session.origin          = newStage.origin;
      session.clueGuesses     = [];
      session.wrongGuessCount = 0;
      session.co2Available    = newStage.co2_available;
      session.penaltyApplied  = false;
  
      setSession(session);
      console.log("New stage loaded:", session);
  
      //  SHOW TASKPAGE
      showGameScreen();  // reload UI with new stage
      renderTips(session); // rewrite tips with the highlight
      console.log(`Stage ${session.currentStage} begins with countries: ${session.orderCountries}`);
    }
  }

  // --- Listen for airport selection from map ---
  window.addEventListener("airport-selected", async (event) => {
    const airport = event.detail;
    console.log('airport: ', airport);
    const isoDest = airport.country;   
    const identDest = airport.ident; 
    const session = getSession();

    console.log("Airport chosen on map:", identDest, isoDest);

    // Validate the airport -> finds the country ISO from places
    const validation = validateCountryInput(isoDest, session.places, identDest);

    addUserMsg(output, isoDest);

    if (!validation.valid) {
        return handleWrongGuess(output, validation);
    }

    await handleCorrectGuess(output, validation);
  });

  // ---- USER INPUT LOGIC ----
  document.getElementById("btnSubmit").onclick = async () => {
    const inputEl = document.getElementById("countryInput");
    const code = inputEl.value.trim().toUpperCase();
    addUserMsg(output, code);
  
    const validation = validateCountryInput(code, session.places);
    console.log('code: ', code);
    console.log("validation:", validation);
  
    if (!validation.valid) {
      return handleWrongGuess(output, validation);
    }
    await handleCorrectGuess(output, validation);
    inputEl.value = "";
  };

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
