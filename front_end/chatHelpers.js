// ---- get stored stage data ----
  const stage = JSON.parse(sessionStorage.getItem("stage"));

// -----------------------------------
// USER MSG INPUT VALIDATOR
// -----------------------------------
export function validateCountryInput(code) {
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

    // Check if the ISO code exists in the stage's 'places'
    if (!stage.places || !stage.places[code]) {
      return { valid: false, message: `X ${code} is not one of the target countries for this stage.` };
    }

    // Lookup ICAO code for this country
    const icao = stage.places[code];

    return {
        valid: true,
        iso: code,
        icao: icao,
        message: `Correct guess: ${code} -> Airport ${icao}`
    };
  }

// -----------------------------------
//  FIRST STAGE INTRO MESSAGES
// -----------------------------------

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


