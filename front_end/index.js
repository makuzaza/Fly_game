import {
  startNewGame,
  handleCountrySubmit,
  handleConfirmFlight,
  handleCancelFlight,
  getGameResults,
  showResults,
  gameState,
} from "./app.js";

function renderHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./assets/logo.png" alt="EcoTrip" class="logo" />
  `;
  return header;
}

function renderHeaderWithQuit() {
  const header = document.createElement("header");
  header.innerHTML = `
      <img src="./assets/logo.png" alt="EcoTrip" class="logo" />
      <div class="quit-icon">
      <img src="./assets/exit.png" alt="Exit" class="exit" /></div>
  `;
  header.querySelector(".exit").onclick = () => {
    document.getElementById("quit-modal").style.display = "flex";
  };
  return header;
}

// -----------------------------
// UNIVERSAL GAME MODAL
// -----------------------------
function createGameModal() {
  if (document.getElementById("generic-modal")) return;

  const modal = document.createElement("div");
  modal.id = "generic-modal";
  modal.className = "modal hidden";

  modal.innerHTML = `
    <div class="modal-content-generic">
      <p id="generic-modal-message"></p>
      <div id="generic-modal-buttons"></div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close when clicking outside content
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
}

createGameModal();

export function showGameModal(message, buttons) {
  const modal = document.getElementById("generic-modal");
  const msg = document.getElementById("generic-modal-message");
  const btnBox = document.getElementById("generic-modal-buttons");

  msg.textContent = message;
  btnBox.innerHTML = "";

  buttons.forEach(btn => {
    const b = document.createElement("button");
    b.textContent = btn.text;
    b.className = btn.class || "";
    b.onclick = () => {
      modal.classList.add("hidden");
      btn.onClick && btn.onClick();
    };
    btnBox.appendChild(b);
  });

  modal.classList.remove("hidden");
}

// -----------------------------
// Show Start Screen
// -----------------------------
function showStartScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const screen = document.createElement("div");
  screen.className = "screen start-screen";
  screen.innerHTML = `
    <img src="assets/logo.png" class="logo_main" alt="EcoTrip Logo" />
        <input id="player-name" type="text" placeholder="Enter your name" />
        <div id="name-error" class="error-message"></div>
    <button id="btn-start">Start Game</button>
  `;
  app.appendChild(screen);

  const input = document.getElementById("player-name");
  const errorBox = document.getElementById("name-error");

  function validateName() {
    const playerName = input.value.trim();

    if (!playerName) {
      errorBox.textContent = "Please enter your name!";
      input.classList.add("input-error");
      return false;
    }

    errorBox.textContent = "";
    input.classList.remove("input-error");
    return true;
  }

  document.getElementById("btn-start").onclick = () => {
    if (!validateName()) return;

    gameState.playerName = input.value.trim();
    showRulesChoiceScreen();
  };

  // ENTER key
  input.onkeypress = (event) => {
    if (event.key === "Enter") {
      document.getElementById("btn-start").onclick();
    }
  };
}

// -----------------------------
// Show Rules Choice Screen
// -----------------------------
function showRulesChoiceScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderHeader());
  const screen = document.createElement("div");
  screen.className = "screen rules-choice-screen";
  screen.innerHTML = `
    <h2>Would you like to read the rules?</h2>
    <div><button id="btn-yes-rules">Yes</button>
    <button id="btn-no-rules">No</button></div>
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
  app.appendChild(renderHeader());
  const screen = document.createElement("div");
  screen.className = "screen rules-screen";
  screen.innerHTML = `
    <h2>Rules:</h2>
    <p>Plan your flights wisely to stay within CO2 and flight limits!</p>
    <p>You will visit different countries based on clues, manage your CO2 budget, and complete 5 stages.</p>
    <button id="btn-rules-continue">Continue</button>
  `;
  app.appendChild(screen);

  document.getElementById("btn-rules-continue").onclick = () =>
    startNewGame(gameState.playerName);
}

function showIntroVideo() {
  showStartScreen();
  
  const intro = document.createElement("div");
  intro.id = "intro-screen";

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const source = document.createElement("source");
  source.src = "./assets/airplane.mp4";
  source.type = "video/mp4";

  video.appendChild(source);
  intro.appendChild(video);
  document.body.appendChild(intro);

  // close by click
  intro.onclick = () => {
    intro.classList.add("fade-to-transparent");
    setTimeout(() => intro.remove(), 1200);
  };
  
  video.onended = () => {
    intro.classList.add("fade-to-transparent");
    setTimeout(() => intro.remove(), 1200);
  };
}

// -----------------------------
// Show Game Screen
// -----------------------------
export function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderHeaderWithQuit());
  const screen = document.createElement("div");
  screen.className = "screen game-screen";
  screen.innerHTML = `
    <div id="map-container">
      <div class="clues-overlay">
        <h3>🕵️ Guess the country in the correct order:</h3>
        <div id="clues-list"></div>
      </div>
    </div>

    <div class="game-info-container">
    
    <div id="game-info">
      <div class="stage-progress">
        <div class="stage-circle completed">1</div>
        <div class="stage-circle current">2</div>
        <div class="stage-circle">3</div>
        <div class="stage-circle">4</div>
        <div class="stage-circle">5</div>
      </div>

      <div class="co2-bar-container">
        <p>
          <span>💨 CO2 Budget</span>
          <span><span id="co2-display">0</span> kg</span>
        </p>
        <div class="co2-progress-bar">
          <div class="co2-progress-fill" id="co2-progress" style="width: 100%;"></div>
        </div>
      </div>
      <p>📍 Current Location: <span id="current-origin"></span></p>
    </div>

    <div id="mission-container">
        <div id="guess-section">
            <input id="country-input" placeholder="Enter country code (e.g., US, FI)" maxlength="2"/>
            <button id="btn-submit-country">Submit Guess</button>
            <p id="guess-feedback"></p>
            <p id="attempts-info"></p>
        </div>

        <div id="route-info" style="display: none;">
            <h3>📋 Route Summary:</h3>
            <div id="route-details"></div>
            <div class="flight-buttons">
              <button id="btn-confirm-flight">Confirm Flight</button>
              <button id="btn-cancel-flight">Choose Different Airport</button>
            </div>
        </div>

        <div id="airport-selection" style="display: none;">
            <h3>🛬 Select Destination Airport:</h3>
            <div id="airports-list"></div>
        </div>
           
    </div></div>
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

  const quitModal = document.getElementById("quit-modal");

  document.getElementById("quit-yes").onclick = async () => {
    quitModal.style.display = "none";
    const results = await getGameResults();
    showResults(results); 
  };

  document.getElementById("quit-no").onclick = () => {
    quitModal.style.display = "none";
  };

  // Close by clicking outside modal
  quitModal.onclick = (event) => {
    if (event.target === quitModal) quitModal.style.display = "none";
  };

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
  app.appendChild(renderHeader());
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

// showStartScreen();
showIntroVideo();