import { showTask } from "../task.js";

function createGamePageUI(){
    // create some dummy UI for test to see how the modal will look like when overlapping it
    const div = document.createElement("div");
    div.innerHTML = "<h1>Game Page</h1>";
    return div;
}

export function GamePage(rootElement) {
     // Mock data (replace with real data later)
    let gameStates = {
        round: 1,
        location: 'FI',
        countries: ["FI", "SE", "NO"],
        clues: ["Cold climate", "Northern lights", "Sauna culture"],
        co2_budget: 600
    }; 

    // Mock task rendering (on initial render)
    // Here we just show the mock data and task information for round 1
    showTask(gameStates)
    
    const ui = createGamePageUI();
    rootElement.appendChild(ui);

    // ======== NOTES for Later Interactive Logic ======== Where I believe task will be inserted.
    // 1. **User Input Handler**: You need to add logic here to handle the user's input (guessing countries).
    // 2. **Guess Validatior**: Check the user's input against the list of countries (e.g., "FI", "SE", "NO").
    // 3. **Round Update**: After the user correctly guesses all countries, the round should be updated, and TaskController should be called again to show the next task.
    // 4. **Interactive UI Element**: Add an input field and a submit button (or use the Enter key) for the player to guess a country.
    // 5. **Check CO2 Budget**: Ensure the CO2 budget is still valid before allowing the round to continue (if CO2 budget reaches 0, prevent round update).
    // 6. **Clear Input**: Once a guess is submitted, clear the input field and show feedback (correct/incorrect).

}