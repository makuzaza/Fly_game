// ---- get stored stage data ----
export function get_game_status() {
  return JSON.parse(sessionStorage.getItem("stage"));
}

//-------------------------------------------------------------
// Function to get 2-letter code if input is a name of country
//-------------------------------------------------------------
function normalizeCountryInput(input, places) {
  const guess = input.trim();

  // ISO-code
  if (/^[A-Za-z]{2}$/.test(guess)) {
    return guess.toUpperCase();
  }

  // Country name
  const match = Object.entries(places).find(
    ([code, data]) => data.name.toUpperCase() === guess.toUpperCase()
  );
  return match ? match[0] : null;
}

// -----------------------------------
// USER MSG INPUT VALIDATOR
// -----------------------------------
export function validateCountryInput(input, places, ident = 0) {
  if (!places) {
    return {valid: false, message: "Game data missing. Reload the game."};
  }

  const iso = normalizeCountryInput(input, places);

  if (!iso) {
    return { valid: false, message: "Type a valid country code or name." };
  }

  // ISO must be a key in places
  if (!Object.keys(places).includes(iso)) {
    return { valid: false, message: `❌ ${iso} is not one of the target countries for this stage.` };
  }

  const data = places[iso];
  const icao = ident && ident.length === 4 ? ident.toUpperCase() : data.icao;

  return {
    valid: true,
    iso,
    icao,
    name: data.name,
    message: `✅ Correct guess: ${iso} -> Airport ${icao}`
  };
}

// -----------------------------------
//  MESSAGES BASE MODEL
// -----------------------------------
export function addSystemMsg(outputEl, text) {
  const div = document.createElement("div");
  div.className = "msg system";
  div.textContent = text;
  outputEl.appendChild(div);
  outputEl.scrollTop = outputEl.scrollHeight;
}

export function addUserMsg(outputEl, text) {
  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = text;
  outputEl.appendChild(div);
  outputEl.scrollTop = outputEl.scrollHeight;
}

// -----------------------------------
//  FIRST STAGE INTRO MESSAGES
// -----------------------------------
export function introStage1(outputEl, playerName) {
  addSystemMsg(outputEl, `🛫 Hello ${playerName}, welcome to your central station. I'll be your assistant.`);
  addSystemMsg(outputEl, `⚠️ Important: the order of your guesses matters, and running out of CO₂ during a mission means failure.`);
  addSystemMsg(outputEl, `💡 You've got your clues - let's begin! Guess a country or select an airport from the map.`);
}

//------------------------------------
// FIRST INVALID GUESS
//------------------------------------
export function wrongGuess1(outputEl, validationMsg) {
  addSystemMsg(outputEl, `❌ Oh no! That's not correct.`);
  addSystemMsg(outputEl, validationMsg);
  addSystemMsg(outputEl, `⚠️ Be careful! One more mistake and penalties start applying.`);
  addSystemMsg(outputEl, `🔄 Try again!`);
}

//------------------------------------
// SECOND+ INVALID GUESS
//------------------------------------
export function wrongGuessPenalty(outputEl, validationMsg, penaltyStops) {
  addSystemMsg(outputEl, `❌ Incorrect again.`);
  addSystemMsg(outputEl, validationMsg);
  addSystemMsg(outputEl, `⚠️ Penalty accumulating: +${penaltyStops} layover(s) will apply on your next correct flight.`);
  addSystemMsg(outputEl, `🔄 Try again!`);
}

//------------------------------------
// FAIL (ORDER OR CO2)
//------------------------------------
export function failedGame(outputEl) {
  addSystemMsg(outputEl, `❌ Mission Failed!`);
  addSystemMsg(outputEl, `Your plane was unable to reach its destination due to insufficient CO₂ or wrong route order.`);
  addSystemMsg(outputEl, `Better planning next time will help you succeed!`);
  addSystemMsg(outputEl, `📊 Redirecting to results...`);
}

//------------------------------------
// VALID GUESS
//------------------------------------
export function correctGuess(outputEl, countryIso) {
  addSystemMsg(outputEl, `🎉 Congratulations! That is correct: ${countryIso}`);
}

//------------------------------------
// WIN GAME
//------------------------------------
export function winGame(outputEl) {
  addSystemMsg(outputEl, `🎉🎊 CONGRATULATIONS! 🎊🎉`);
  addSystemMsg(outputEl, `You completed the entire mission successfully!`);
  addSystemMsg(outputEl, `You optimized CO₂ and followed all clues correctly.`);
  addSystemMsg(outputEl, `✈️ You are a master pilot!`);
  addSystemMsg(outputEl, `📊 Redirecting to results...`);
}