import { fetchAirports, fetchWeather } from "./api.js";
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

    for (const airport of airports) {
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: 6,
            fillColor: "#3388ff",
            color: "#fff",
            weight: 1,
            fillOpacity: 0.8
        });

        // Initial popup without weather
        marker.bindPopup(`
            <strong>${airport.name}</strong><br>
            ${airport.ident}<br>
            ${airport.city}, ${airport.country}<br>
            <div class="weather-container">Loading weather...</div>
            <button class="choose-airport-btn" data-ident="${airport.ident}">
                Choose
            </button>
        `);

        // Load weather when popup opens
        marker.on("popupopen", async () => {
            const popupEl = marker.getPopup().getElement();
            if (!popupEl) return;

            const weatherContainer = popupEl.querySelector(".weather-container");
            const btn = popupEl.querySelector(".choose-airport-btn");

            // Fetch weather data
            const weather = await fetchWeather(airport.ident);

            let weatherHTML = "<em>Weather unavailable</em>";
            if (weather) {
                weatherHTML = `
                <div class="weather-info">
                    <div class="weather-description"><img style="width: 30px; height: 30px;" src="${weather.icon}" alt="${weather.description}">${weather.weather}</div>
                    🌡️ Temp: ${weather.temperature}°C<br>
                    💨 Wind: ${weather.wind} m/s<br>
                </div>
                `;
            }

            weatherContainer.innerHTML = weatherHTML;
            if (btn) {
                btn.onclick = () => {
                    console.log("Chosen airport:", airport);
                    console.log("Weather", weather);
                    
                    btn.textContent = "Chosen";
                    btn.disabled = true;
                    btn.style.backgroundColor = "#4CAF50";

                    window.dispatchEvent(new CustomEvent("airport-selected", { detail: airport }));
                };
            }
        });

        marker.addTo(map);
        markers.push(marker);
    }
}