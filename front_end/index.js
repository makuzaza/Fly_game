'use strict';

// === Task page ===

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
      <input id="playerName" placeholder="Enter your name" />
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
  screen.className = "screen";

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
    <p>(Add your rules here)</p>
    <button id="btnContinue">Continue</button>
  `;

  app.appendChild(screen);

  document.getElementById("btnContinue").onclick = () => showGameScreen();
}

// ----------------------------------------------
// GAME SCREEN
// ----------------------------------------------
function showGameScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen game-screen";

  screen.innerHTML = `
    <h2>Game Screen</h2>

    <div class="map-box">
        <iframe src="map.html" width="100%" height="300"></iframe>
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

  document.getElementById("btnSubmit").onclick = () => {
    const country = document.getElementById("countryInput").value.trim();
    const result = document.getElementById("guessResult");

    if (!country) {
      result.innerHTML = "<p>Please type a country.</p>";
    } else {
      result.innerHTML = `<p>You guessed: <b>${country}</b></p>`;
    }
  };

  document.getElementById("btnResults").onclick = () => showResultsScreen();
}

// ----------------------------------------------
// RESULTS SCREEN
// ----------------------------------------------
function showResultsScreen() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderHeader());

  const screen = document.createElement("div");
  screen.className = "screen results-screen";

  screen.innerHTML = `
    <h2>Results</h2>
    <p>Levels passed: 0</p>
    <p>Total distance: 0 km</p>
    <p>Visited countries: 0</p>
    <p>Total CO₂: 0 kg</p>

    <button id="btnRestart">Play Again</button>
  `;

  app.appendChild(screen);

  document.getElementById("btnRestart").onclick = () => showGameScreen();
}

setBackground("./img/background.jpg");

// Start the app at the game page
showStartScreen();

