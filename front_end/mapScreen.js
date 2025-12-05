// screens/mapScreen.js

export function createMapScreen(onAirportSelected, onShowResults) {
    const container = document.createElement("div");
    container.classList.add("screen");

    // Map wrapper
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";
    mapDiv.style.height = "100vh";
    mapDiv.style.width = "100%";

    container.appendChild(mapDiv);

    // --- Button: Go to Results ---
    const resultsBtn = document.createElement("button");
    resultsBtn.innerText = "Results";
    resultsBtn.classList.add("map-results-btn");
    resultsBtn.onclick = () => onShowResults();
    container.appendChild(resultsBtn);

    // --- Initialize Leaflet Map ---
    const map = L.map("map").setView([60.192059, 24.945831], 5); // Start centered on Finland

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
    }).addTo(map);

    // --- Load airports from backend ---
    fetch("http://localhost:5000/api/airports")
        .then(res => res.json())
        .then(airports => {
            airports.forEach(ap => {
                const marker = L.marker([ap.lat, ap.lng]).addTo(map);

                marker.bindPopup(
                    `<b>${ap.ident}</b><br>${ap.name}<br>${ap.city}, ${ap.country}`
                );

                marker.on("click", () => {
                    console.log("Selected airport:", ap.ident);

                    // pass selected airport back to the game
                    onAirportSelected(ap);
                });
            });
        })
        .catch(err => {
            console.error("Error loading airports:", err);
        });

    return container;
}
