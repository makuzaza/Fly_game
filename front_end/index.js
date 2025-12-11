
import { fetchAirportsByCountry, fetchStage, fetchStageReplay, fetchLayoverRoute, fetchGameResults, fetchLeaderboard, resetGame } from "./api.js";
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

  // If tips are not shuffled
  if (!session.shuffledCountries) {
    const countries = [...session.orderCountries];
    for (let i = countries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [countries[i], countries[j]] = [countries[j], countries[i]];
    }
    session.shuffledCountries = countries;
  }

  // Use shuffled order
  session.shuffledCountries.forEach((code, index) => {
    const tipDiv = document.createElement("div");
    tipDiv.className = "tip";
    tipDiv.id = `tip${index + 1}`;

    if (session.clueGuesses.includes(code)) {
      tipDiv.classList.add("highlighted");
    }

    const clue = session.places?.[code]?.clue || "No clue for this country";

    tipDiv.innerHTML = `<span class="tip-label">Tip ${index+1}:</span> ${clue}`;
    footer.appendChild(tipDiv);
  });
}

// --- Update trip info display ---
function updateTripInfo(session) {
  const tripUpdate = document.querySelector(".trip-update");
  if (!tripUpdate) return;

  const currentAirport = session.origin || "EFHK";
  const co2Available = session.co2Available || 0;
  const initialCo2 = session.initialCo2 || 0;
  const co2Percentage = initialCo2 > 0 ? (co2Available / initialCo2) * 100 : 0;
  
  // Get country code from places if available
  let countryInfo = "";
  if (session.places) {
    for (const [code, data] of Object.entries(session.places)) {
      if (data.icao === currentAirport) {
        countryInfo = ` (${code} - ${data.name})`;
        break;
      }
    }
  }

  // Determine CO2 bar color class
  let co2BarClass = "high";
  if (co2Percentage < 30) {
    co2BarClass = "critical";
  } else if (co2Percentage < 50) {
    co2BarClass = "low";
  }

  tripUpdate.innerHTML = `
    <div class="trip-info-card">
      <div class="trip-info-item location">
        <span class="info-icon">📍</span>
        <div class="info-content">
          <span class="info-label">Current Location: ${currentAirport}${countryInfo}</span>
        </div>
      </div>
      
      <div class="trip-info-item co2">
        <span class="info-icon">💨</span>
        <div class="info-content">
          <div class="co2-header">
            <span class="info-label">CO₂ Available</span>
            <span class="co2-values">${co2Available.toFixed(2)} / ${initialCo2.toFixed(2)} kg</span>
          </div>
          <div class="co2-progress-bar">
            <div class="co2-progress-fill ${co2BarClass}" style="width: ${co2Percentage}%"></div>
          </div>
        </div>
      </div>
      
      <div class="trip-info-item stages">
        <span class="info-icon">🎯</span>
        <div class="info-content stages">
          <span class="info-label">Stage Progress</span>
          <div class="stage-circles">
            ${[1, 2, 3].map(stageNum => {
              let stageClass = '';
              if (stageNum < session.currentStage) {
                stageClass = 'completed';
              } else if (stageNum === session.currentStage) {
                stageClass = 'current';
              }
              return `<div class="stage-circle ${stageClass}">${stageNum}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
      
      <div class="trip-info-item countries">
        <span class="info-icon">🌍</span>
        <div class="info-content">
          <span class="info-label">Countries Visited: ${session.clueGuesses?.length || 0} / 3</span>
        </div>
      </div>
    </div>
  `;
}

// --- Load Stage data and store it in the sessionStorage ---
async function loadStage(isReplay = false, stageNum = null) {
  let stage;
  
  if (isReplay && stageNum !== null) {
    // Import the new function at the top of the file if not already
    const { fetchStageReplay } = await import("./api.js");
    stage = await fetchStageReplay(stageNum);
  } else {
    stage = await fetchStage();
  }

  if (!stage) {
    console.error("Couldn't load stage from API");
    return null;
  }

  sessionStorage.setItem("stage", JSON.stringify(stage));
  console.log("Loaded Stage:", stage);

  if (stage.places) {
    Object.entries(stage.places).forEach(([code, data]) => {
      console.log(`${code} (${data.name}): ${data.clue}`);
    });
  } else {
    console.warn("Stage has no places field");
  }

  return stage;
}

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
function resetHandler(delay = 6000, finalScreenFn = showResultsScreen) {
  setTimeout(() => {
      const session = getSession();
      const total = JSON.parse(sessionStorage.getItem("total")) || {};

      const resultRow = buildResultRow(session, total);
      fetch("http://localhost:5000/api/saveResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultRow)
    });
    resetGame();
    sessionStorage.removeItem("gameSession");
    sessionStorage.removeItem("stage");
    finalScreenFn();
  }, delay);
}

function buildResultRow(session, totals) {
  // totals = { optimal_co2, total_co2, flight_history, km_amount }

  let efficiency;
  if (session.game_status === "Win") {
    efficiency = 250 * totals.optimal_co2/ (9 * totals.total_co2);
  } else {
    efficiency = (totals.flight_history.length * 100) / 9;
  }

  return {
    name: session.playerName,
    date: new Date().toISOString(),
    levels: session.currentStage,
    cities: totals.flight_history.length,
    km_amount: totals.total_distance,
    co2_amount: totals.total_co2,
    efficiency: efficiency,
    status: session.game_status
  };
}

// ----------------------------------------------
// ANIMATION SCREEN
// ----------------------------------------------
function showIntroVideo() {
  showStartScreen();
  
  const intro = document.createElement("div");
  intro.id = "intro-screen";

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const source = document.createElement("source");
  source.src = "./video/airplane.mp4";
  source.type = "video/mp4";

  video.appendChild(source);
  intro.appendChild(video);
  document.body.appendChild(intro);

  // skip intro on click
  intro.onclick = () => {
    intro.classList.add("fade-to-transparent");
    setTimeout(() => intro.remove(), 1200);
  };

  video.onended = () => {
    intro.classList.add("fade-to-transparent");
    setTimeout(() => intro.remove(), 1200);
  };
}

// --- Save session backup before attempting stage ---
function backupSession(session) {
  const backup = {
    clueGuesses: [...session.clueGuesses],
    origin: session.origin,
    co2Available: session.co2Available,
    wrongGuessCount: session.wrongGuessCount
  };
  sessionStorage.setItem("sessionBackup", JSON.stringify(backup));
  return backup;
}

// --- Restore session from backup ---
function restoreSession() {
  const backup = JSON.parse(sessionStorage.getItem("sessionBackup"));
  if (backup) {
    let session = getSession();
    session.clueGuesses = backup.clueGuesses;
    session.origin = backup.origin;
    session.co2Available = backup.co2Available;
    session.wrongGuessCount = backup.wrongGuessCount;
    setSession(session);
    return session;
  }
  return null;
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
  app.innerHTML = "";

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
  drawQuestionBox(
    "Do you want to read the rules?",
    showRulesScreen,
    showTaskScreen,
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
    <div>Of course, it is important to keep the environment in mind – so plan your route carefully to reduce CO₂ emissions.</div>
    <p>Here's how it works:</p>
    <div>You'll start Level 1 from Helsinki, and always progress from previous destination.</div>
    <div>Your task is to visit 3 countries by guessing their names.</div>
    <div>Don't worry - plenty of hints will guide you along the way.</div>
    <div>Each level has a CO₂ budget, so plan your flights wisely!</div>
    <div>We recommend using the map to choose the most optimal route.</div><br/>
    <div>Each country may have several airports, so choose wisely, always considering the environmental impact.</div>
    <div>If you don't succeed, each level can be replayed up to 3 times.</div>
    <div>You can also exit the game at any time by clicking the exit button.</div>
    <div>At the end of the game, you'll see your results, which will also be automatically saved to the database for future viewing.</div>
    <p>Good luck! 🌍✈️</p>
    <button id="btnContinue">Continue</button>
  `;

  app.appendChild(screen);

  document.getElementById("btnContinue").onclick = () => showTaskScreen();
}

// ----------------------------------------------
// GAME SCREEN
// ----------------------------------------------
async function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // --- Load Stage + Session ---
  let stage = JSON.parse(sessionStorage.getItem("stage"));
  let session = getSession();
  console.log("Current session:", session);

  // --- fresh start ---
  if (!session || !stage) {
    sessionStorage.removeItem("gameSession");
    sessionStorage.removeItem("stage");
    stage = await loadStage();
    session = {};
    if (!stage) {
      console.error("Couldn't load the stage. Please reload the page!");
      return;
    }
    console.log("No session or stage found. Starting fresh.");
  }

  // --- Initialize session fields ---
  session.playerName ??= sessionStorage.getItem("playerName");
  session.currentStage ??= stage.current_stage;
  session.orderCountries ??= stage.order_countries;
  session.clueGuesses ??= [];
  session.origin ??= stage.origin;
  session.startOrigin ??= stage.origin;
  session.wrongGuessCount ??= 0;
  session.initialCo2 ??= stage.co2_available;
  session.co2Available ??= stage.co2_available;
  session.places ??= stage.places;
  session.replayCount ??= 0; // Track replays per stage
  session.totalFlights ??= 0; // Track total flights

  setSession(session);
  console.log('Initialized session: ', session);

  // --- Initialize totals ---
  let total = JSON.parse(sessionStorage.getItem("total")) || {
    total_distance: 0.0,
    total_co2: 0.0,
    optimal_co2: 0.0,
    total_flights: 0,
    flight_history: []
  };

  sessionStorage.setItem("total", JSON.stringify(total));

  // Backup session at stage start (only if no guesses yet)
  if (session.clueGuesses.length === 0) {
    backupSession(session);
  }

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
      <div class="trip-update"></div>

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

  // Update trip info display
  updateTripInfo(session);

  session.shuffledCountries = null;
  renderTips(session);

  const quitModal = document.getElementById("quit-modal");

  document.getElementById("quit-yes").onclick = () => {
    quitModal.style.display = "none";
    session.game_status = "Quit";
    setSession(session);
    resetHandler();
    showResultsScreen();
  };

  document.getElementById("quit-no").onclick = () => {
    quitModal.style.display = "none";
  };

  quitModal.onclick = (event) => {
    if (event.target === quitModal) quitModal.style.display = "none";
  };

  // --- Initialize map ---
  initMap("map-container", "http://localhost:5000");
  const output = document.getElementById("chatMessages");
  
  // --- Stage introduction messages ---
  if (session.currentStage === 1 && session.clueGuesses.length === 0 && session.replayCount === 0) {
    introStage1(output, session.playerName);
    console.log("IntroStage1 triggered for player:", session.playerName);
  } else if (session.currentStage >= 2 && session.clueGuesses.length === 0 && session.replayCount === 0) {
    addSystemMsg(output, `Welcome to level ${session.currentStage}, ${session.playerName}!`);
    addSystemMsg(output, `What will you guess?`);
  } else if (session.replayCount > 0 && session.clueGuesses.length === 0) {
    addSystemMsg(output, "This is replay attempt " + session.replayCount + " of 3 for Stage " + session.currentStage + ".");
    addSystemMsg(output, `You have fresh clues. Let's try again!`);
  }

  // ---- WRONG GUESS HANDLER ----
  async function handleWrongGuess(output, validation) {
    let session = getSession();

    // Ensure that the game is incomplete
    if (session.game_status === "Win" || session.game_status === "Lose" || session.game_status === "Quit") {
      return;
    }

    session.wrongGuessCount += 1;
    setSession(session);

    const n = session.wrongGuessCount;

    if (n === 1) {
      return wrongGuess1(output, validation.message);
    }
    
    // After 3 wrong guesses, show a hint with correct country
    if (n >= 3) {
      const remainingCountries = session.orderCountries.filter(
        code => !session.clueGuesses.includes(code)
      );
      
      if (remainingCountries.length > 0) {
        const correctCountry = remainingCountries[0]; // Next country in order
        const countryName = session.places[correctCountry]?.name || correctCountry;
        addSystemMsg(output, `❌ Incorrect again.`);
        addSystemMsg(output, validation.message);
        addSystemMsg(output, `🤖 Hint: The correct country is ${correctCountry} (${countryName})`);
        
        // Reset wrong guess count after showing hint
        session.wrongGuessCount = 0;
        setSession(session);
        return;
      }
    }
    
    const penaltyStops = n - 1;
    return wrongGuessPenalty(output, validation.message, penaltyStops);
  }

  // ---- CORRECT GUESS HANDLER ----
  async function handleCorrectGuess(output, validation) {
    let session = getSession();
    console.log('Processing correct guess for:', validation.iso);

    // Ensure user does not guess the same clue twice
    if (session.clueGuesses.includes(validation.iso)) {
      return addSystemMsg(output, `${validation.name} was already guessed, try again!`);
    }

    const destICAO = validation.icao;
    const origin = session.origin;

    let route;

    if (session.wrongGuessCount > 1) {
      const penaltyStops = session.wrongGuessCount - 1;
      addSystemMsg(output, `You made mistakes earlier, applying ${penaltyStops} extra stops.`);
      route = await fetchLayoverRoute(origin, destICAO, penaltyStops);
    } else {
      route = await fetchLayoverRoute(origin, destICAO, 0);
    }

    if (!route) {
      addSystemMsg(output, "❌ Unable to calculate route. Please try again.");
      return;
    }

    // Check CO₂ BEFORE deducting
    if (route.co2_needed > session.co2Available) {
      addSystemMsg(output, `❌ Not enough CO₂! Required: ${route.co2_needed.toFixed(2)} kg, Available: ${session.co2Available.toFixed(2)} kg`);
      addSystemMsg(output, `Your plane was unable to reach its destination.`);
      
      // Offer replay (max 3 times per stage)
      if (session.replayCount < 3) {
        const remaining = 3 - session.replayCount;
        addSystemMsg(output, `You still have ${remaining} ${remaining === 1 ? 'try' : 'tries'} to replay this stage.`);
        
        setTimeout(async () => {
          const retry = confirm(`Do you want to replay Stage ${session.currentStage}? (${remaining} tries remaining)`);
          if (retry) {
            // Increment replay count FIRST
            const newReplayCount = session.replayCount + 1;
            
            // Fetch NEW stage with NEW clues
            const newStage = await loadStage(true, session.currentStage); 
            if (!newStage) {
              console.error("Couldn't reload stage");
              addSystemMsg(output, "Error loading new stage.");
              resetHandler();
              return;
            }
            
            // Restore to stage start but with NEW clues
            // Reset session fully for replay
            session = {
              playerName: sessionStorage.getItem("playerName"),
              currentStage: session.currentStage,
              orderCountries: newStage.order_countries,
              places: newStage.places,
              clueGuesses: [],
              wrongGuessCount: 0,
              origin: newStage.origin,
              startOrigin: newStage.origin,
              co2Available: newStage.co2_available,
              initialCo2: newStage.co2_available,
              replayCount: newReplayCount,
              totalFlights: session.totalFlights ?? 0
            };
            
            setSession(session);
            backupSession(session);
            showGameScreen();

          } else {
            addSystemMsg(output, "You chose not to replay. Next time might be your chance!");
            session.game_status = "Lose";
            setSession(session);
            resetHandler();
          }
        }, 1000);
      } else {
        addSystemMsg(output, "No more replay attempts available.");
        failedGame(output);
        session.game_status = "Lose";
        setSession(session);
        resetHandler();
      }
      return;
    }

    // Deduct CO₂
    session.co2Available -= route.co2_needed;
    session.totalFlights += 1;

    // Add this guess to the stage
    session.clueGuesses.push(validation.iso);
    session.origin = destICAO;
    session.wrongGuessCount = 0;

    correctGuess(output, validation.iso, validation.name);
    addSystemMsg(output, `✈️ Flight completed! CO₂ used: ${route.co2_needed.toFixed(2)} kg`);
    addSystemMsg(output, `Remaining CO₂: ${session.co2Available.toFixed(2)} kg`);
    
    setSession(session);
    updateTripInfo(session); // Update display
    session.shuffledCountries = null;
    renderTips(session);

     // --- Update totals ---
    let total = JSON.parse(sessionStorage.getItem("total")) || {};
    total.total_distance += route.distance_km;
    total.total_co2 += route.co2_needed;
    total.optimal_co2 += stage.co2_available;
    total.total_flights += (route.layover_route.length - 1);
    total.flight_history.push({
      route: route.layover_route.map(a => a.ident),
      distance: route.distance_km,
      co2: route.co2_needed
    });
    sessionStorage.setItem("total", JSON.stringify(total));


    // ---- Stage Completed? ----
    if (session.clueGuesses.length === 3) {
      // WIN if last stage
      if (session.currentStage === 3) {
        winGame(output);
        session.game_status = "Win";
        setSession(session);
        resetHandler();
        return;
      }

      // Otherwise, PASS STAGE → load new stage
      addSystemMsg(output, "🎉 Stage complete! Loading next stage...");
      
      setTimeout(async () => {
        const newStage = await loadStage();
        if (!newStage) {
          console.error("Couldn't load the stage. Start again.");
          return;
        }
        
        // Clear old stage data before loading new one
        sessionStorage.removeItem("stage");
        sessionStorage.setItem("stage", JSON.stringify(newStage));
        
        session.currentStage = newStage.current_stage;
        session.orderCountries = newStage.order_countries;
        session.places = newStage.places;
        session.origin = newStage.origin;
        session.clueGuesses = [];
        session.wrongGuessCount = 0;
        session.co2Available = newStage.co2_available;
        session.initialCo2 = newStage.co2_available;
        session.replayCount = 0; // Reset replay count for new stage
        session.shuffledCountries = null; // Reset shuffled countries
        sessionStorage.removeItem("replayCount");

        setSession(session);
        backupSession(session); // Backup new stage
        console.log("New stage loaded:", session);

        showTaskScreen();
      }, 2000);
    }
  }

  // --- Listen for airport selection from map ---
  window.addEventListener("airport-selected", async (event) => {
    const airport = event.detail;
    const isoDest = airport.country;
    const identDest = airport.ident;
    const session = getSession();

    console.log("Airport chosen on map:", identDest, isoDest);

    const validation = validateCountryInput(isoDest, session.places, identDest);
    addUserMsg(output, `Selected: ${identDest} (${isoDest})`);

    if (!validation.valid) {
      return handleWrongGuess(output, validation);
    }

    await handleCorrectGuess(output, validation);
  });

  // ---- USER INPUT LOGIC ----
  document.getElementById("btnSubmit").onclick = async () => {
    const inputEl = document.getElementById("countryInput");
    const code = inputEl.value.trim();
    
    if (!code) return;
    
    addUserMsg(output, code);

    const validation = validateCountryInput(code, session.places);
    console.log("User input validation:", validation);

    if (!validation.valid) {
      inputEl.value = "";
      return handleWrongGuess(output, validation);
    }
    
    await handleCorrectGuess(output, validation);
    inputEl.value = "";
  };

  // Allow Enter key to submit
  document.getElementById("countryInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("btnSubmit").click();
    }
  });

  // ---- Toggle btn logic ----
  const btnMore = document.getElementById("btnMoreOptions");
  const menu = document.getElementById("moreMenu");

  btnMore.onclick = (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  };

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btnMore) {
      menu.classList.add("hidden");
    }
  });

  document.getElementById("btnResults").onclick = () => {
    console.log("Results clicked");
    showResultsScreen();
  };

  document.getElementById("btnRules").onclick = () => {
    console.log("Rules clicked");
    showRulesScreen();
  };
}

//------------------
//   TASK SCREEN
//------------------
async function showTaskScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  
  let stage = JSON.parse(sessionStorage.getItem("stage"));
  let session = getSession();
  console.log("Task screen session:", session);

  if (!session || !stage) {
    sessionStorage.removeItem("gameSession");
    sessionStorage.removeItem("stage");
    stage = await loadStage();
    session = {};
    if (!stage) {
      console.error("Couldn't load the stage. Please reload the page!");
      return;
    }
    console.log("No session or stage found. Starting fresh.");
  }
  
  app.appendChild(renderHeader());
  const screen = document.createElement("div");
  screen.className = "screen tasks-screen";
  const round = stage.current_stage;
  const budget = stage.co2_available;
  const visitCount = stage.order_countries?.length;

  screen.innerHTML = `
  <div class="task_container">
    <h2 class="task-item" id="round">Stage ${round}</h2>
    <p class="task-item" id="budget">CO₂ Budget: ${budget.toFixed(2)} kg</p>
    <p class="task-item" id="countries">Countries to visit: ${visitCount}</p>
    <button class="task-btn" id="Start-btn">Start</button>
  </div>
  `;
  
  app.appendChild(screen);
  document.getElementById("Start-btn").onclick = () => showGameScreen();
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
      <h1 id="result_status">${statusMessage}</h1>
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
            <td>Total CO₂, kg</td>
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
                  <th>CO₂, kg</th>
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
  }

  app.appendChild(screen);

  document.getElementById("result_again").onclick = async () => {
    await resetGame();
    sessionStorage.clear();
    showStartScreen();
  };
  
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
      <p>The sky awaits your return!</p>
      <p>---------------</p>
      <p>Goodbye!</p>
    </div>
  `;

  app.appendChild(screen);
}

// showStartScreen();
showIntroVideo();
