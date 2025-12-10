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
    return { valid: false, message: "Type a country code." };
  }

  // ISO must be a key in places
  if (!Object.keys(places).includes(iso)) {
    return { valid: false, message: `X ${iso} is not one of the target countries for this stage.` };
  }

  const data = places[iso];
  const icao = ident && ident.length === 4 ? ident.toUpperCase() : data.icao;

  return {
    valid: true,
    iso,
    icao,
    name: data.name,
    message: `Correct guess: ${iso} -> Airport ${icao}`
  };
}

// -----------------------------------
//  MESSAGES BASE MODEL
// -----------------------------------
export function addSystemMsg(outputEl, text) {
  const div = document.createElement("div");
  div.className = "msg system";
  div.textContent = text; // safer than innerHTML
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
  addSystemMsg(outputEl, `Hello ${playerName}, welcome to your central station. I'll be your assistant.`);
  addSystemMsg(outputEl, `Important: the order of your guesses matters, and running out of CO₂ during a mission means failure.`);
  addSystemMsg(outputEl, `You've got your clues—let’s begin! Guess a country or select an airport from the map in your starting country.`);
  //    VIDEO EXAMPLE - USER CAN PLAY OR NOT - EXPAND/CONTRACT OR NOT
}
//------------------------------------
// FIRST INVALID GUESS
//------------------------------------
export function wrongGuess1(outputEl, validationMsg) {
  addSystemMsg(outputEl, `Oh no! That’s not correct.`);
  addSystemMsg(outputEl, validationMsg);
  addSystemMsg(outputEl, `Be careful! One more mistake and penalties start applying.`);
  addSystemMsg(outputEl, `Try again!`);
}
//------------------------------------
// SECOND+ INVALID GUESS
//------------------------------------
export function wrongGuessPenalty(outputEl, validationMsg, penaltyStops) {
  addSystemMsg(outputEl, `Incorrect again.`);
  addSystemMsg(outputEl, validationMsg);
  addSystemMsg(outputEl, `Penalty accumulating: +${penaltyStops} layovers will apply on your next correct flight.`);
}
//------------------------------------
// LIMIT OF INVALID GUESS 
// (runned out of co2)
//------------------------------------

//------------------------------------
// FAIL (ORDER OR CO2)
//------------------------------------
export function failedGame(outputEl) {
  // ANNIMATION STOPS IN THE MEEDLE OF THE PLANE FLIGHT
  addSystemMsg(outputEl, `You did not choose the most optimal route .`);
  addSystemMsg(outputEl, `That is why you runned out of CO2.`);
  addSystemMsg(outputEl, `To get to your final destination this would be the most ideal route:`);
  console.log('Working on how to show the most ideal rout in a nice way.');
  // SHOW MOST IDEAL ROUTE IN A NICE WAY
}

//------------------------------------
// VALID GUESS
//------------------------------------
export function correctGuess(outputEl, nextCountry) {
  addSystemMsg(outputEl, `🎉 Congratulations! That is correct.`);
  addSystemMsg(outputEl, `Next, we travel to ${nextCountry}.`);
  //    FLIGH ANNIMATION
  addSystemMsg(outputEl, `What is your next guess?`);
}

//------------------------------------
// WIN GAME
//------------------------------------
export function winGame(outputEl ) {
  addSystemMsg(outputEl, `🎉 Congratulations!`);
  addSystemMsg(outputEl, `You completed the entire mission successfully!`);
  addSystemMsg(outputEl, `You optimized CO₂ and followed all clues correctly.`);  
  //    WIN GAME CELEBRATION/ANIMATION
}

