'use strict';






// === Results page ===
async function loadResults() {
  try {
    const res = await fetch("/api/results"); // Flask request
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();

    if (data.game_status === "Win"){
      document.getElementById("result_status").textContent = "Mission complete!";
    } else if (data.game_status === "Lose"){
      document.getElementById("result_status").textContent = "Next time might be your chance!";
    } else if (data.game_status === "Quit"){
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
});