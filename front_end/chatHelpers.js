// ---- get stored stage data ----
export function get_game_status() {
  return JSON.parse(sessionStorage.getItem("stage"));
}
// ---- store stage data ----
export function save_game_status(stage) {
  sessionStorage.setItem("stage", JSON.stringify(stage));
}
// -----------------------------------
// USER MSG INPUT VALIDATOR
// -----------------------------------
export function validateCountryInput(code, places) {
    //const stage = get_game_status();
    if (!places) {
      return { valid: false, message: "Game data missing. Reload the game." };
    }
    //Must not be empty
    if (!code) {
      return{ valid: false, message: "Type a country code." };
    }
    // Must be exactly 2 characters (ISO country code)
    if (code.length !== 2) {
      return { valid: false, message: "Country code must be 2 letters (e.g. FI, US, JP)." };
    }

    // Must be alphabetic
    if (!/^[A-Z]{2}$/.test(code)) {
      return { valid: false, message: "Country code must contain only letters." };
    }
    
    console.log('places[code]: ', places[code]);
    if (!Object.keys(places).includes(code)) { //   GET THE KEY       
        return { valid: false, message: `X ${code} is not one of the target countries for this stage.` };
    }

    // Lookup ICAO code for this country
    const icao = places[code];
    console.log('icao: ', icao);

    return {
        valid: true,
        iso: code,
        icao: icao,
        message: `Correct guess: ${code} -> Airport ${icao}`
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
  addSystemMsg(outputEl, `Hello ${playerName},`);
  addSystemMsg(outputEl, `Welcome to your central station!`);
  addSystemMsg(outputEl, `I am your personal assistant and will guide you through the missions.`);
  addSystemMsg(outputEl, `Before we start remember: the order of country guesses is VERY important.`);
  addSystemMsg(outputEl, `If you run out of CO₂, in the meedle of a mission, you fail.`);
  addSystemMsg(outputEl, `You already received your clues, so let's begin!`);
  addSystemMsg(outputEl, `Please guess a country.`);
  addSystemMsg(outputEl, `You may input the cuntry name or just select any airport in the country where you plan to go first.`);
  //    VIDEO EXAMPLE - USER CAN PLAY OR NOT - EXPAND/CONTRACT OR NOT
}
//------------------------------------
// FIRST INVALID GUESS
//------------------------------------

//------------------------------------
// SECOND INVALID GUESS
//------------------------------------

//------------------------------------
// THIRD INVALID GUESS
//------------------------------------

//------------------------------------
// FAIL
//------------------------------------

//------------------------------------
// RETRY
//------------------------------------

//------------------------------------
// VALID GUESS
//------------------------------------


