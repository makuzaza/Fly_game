/** valid numbers
 * 0: Welcome screen
 * 1: game phase 
 * 2: results
 * 3: leaderboard
 */
function PhaseBtn(number, text = "Next") {
  let button = document.createElement("button");
  button.onclick = () => MoveToPhase(number);
  button.innerText = text;
  return button;
}
/** not an enum, because JS has no useful enum support
 * 0: Welcome screen
 * 1: game phase 
 * 2: results
 * 3: leaderboard
 */
function MoveToPhase(number) {
  switch (number) {
    case 0:
      //load the Welcome screen
      console.log("Welcome Screen Loaded!");
      break;
    case 1:
      //load the game screen
      console.log("Game Started!");
      break;
    case 2:
      //load game results AND post results if levels passed >= 1
      console.log("Results Page Loaded!");
      break;
    case 3:
      //fetch leaderboard and open leaderboard screen
      console.log("Leaderboard Script Loaded!");
      break;
  }
}
/** ADDS a button. This does NOT change a button.*/
function AddPhaseBtn(id, number) {
  document.getElementById(id).appendChild(PhaseBtn(number));
}
AddPhaseBtn("phaseBtn", 1); // tested with div of class phaseBtn
