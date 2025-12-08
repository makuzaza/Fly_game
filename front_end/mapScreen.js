import { fetchAirports } from "./api.js";
export { initMap };

let map = null;
let airports = [];
let markers = [];

async function initMap(containerId = "map-container", apiBaseUrl = "") {
    map = L.map(containerId).setView([50, 10], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    airports = await fetchAirports(apiBaseUrl);
    displayAirportMarkers();
}

function displayAirportMarkers() {
    markers.forEach(m => m.remove());
    markers = [];

    airports.forEach(airport => {
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: 6,
            fillColor: "#3388ff",
            color: "#fff",
            weight: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <strong>${airport.name}</strong><br>
            ${airport.ident}<br>
            ${airport.city}, ${airport.country}<br><br>
            <button class="choose-airport-btn" data-ident="${airport.ident}">
                Choose
            </button>
        `);

        marker.on("popupopen", () => {
            const popupEl = marker.getPopup().getElement();
            if (!popupEl) return;
            
            const btn = popupEl.querySelector(".choose-airport-btn");
            if (!btn) return;

            btn.onclick = () => {
                console.log("Chosen airport:", airport);
                
                btn.textContent = "Chosen";
                btn.disabled = true;
                btn.style.backgroundColor = "#4CAF50";
            };
        });

        marker.addTo(map);
        markers.push(marker);
    });
}
