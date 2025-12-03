'use strict';

// === Task page ===

function setBackground(backgroundPath) {
  const app = document.getElementById("app");
  app.style.backgroundImage = `url(${backgroundPath})`;
}

// logo in the navigation bar not needed?

/*function navigationBar(logoPath){
    const header = document.getElementById("logo");
    header.innerHTML = "";

    const img = document.createElement("img");
    img.src = logoPath;
    img.alt = "Logo";
    img.id = "headerLogo";

    header.appendChild(img);


}*/

function drawQuestionBox(questionText, yesCallback, noCallback) {
  const app = document.getElementById("app");
  app.innerHTML = ""; // clear previous screen

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



//navigationBar("logo2.png")
drawQuestionBox("Do you want read the background story?", "YES", "NO")
setBackground("./img/background.jpg");





// === Results page ===
async function loadResults() {
  try {
    const res = await fetch("/api/results"); // Flask request
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();

    if (data.game_status === "Win") {
      document.getElementById("result_status").textContent = "Mission complete!";
    } else if (data.game_status === "Lose") {
      document.getElementById("result_status").textContent = "Next time might be your chance!";
    } else if (data.game_status === "Quit") {
      document.getElementById("result_status").textContent = "Let's play another time again!";
    }

    document.getElementById("result_levels").textContent = data.levels_passed;
    document.getElementById("result_distance").textContent = data.total_distance_km;
    document.getElementById("result_countries").textContent = data.countries_visited;
    document.getElementById("result_co2").textContent = data.total_co2_kg;
  } catch (err) {
    console.error("Response error:", err);
  }
}

loadResults();
/*
const resultAgain = document.querySelector('#result_again');
const resultBest = document.querySelector('#result_best');
const resultQuit = document.querySelector('#result_quit');

resultAgain.addEventListener('click', () => {
  alert("Run game from beginning.");
});

resultBest.addEventListener('click', () => {
  alert("Output best results.");
});

resultQuit.addEventListener('click', () => {
  alert("Go to the end-page.");
});*/
