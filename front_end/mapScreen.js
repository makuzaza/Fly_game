export {
    initMap,
    loadAirports,
    displayAirportMarkers,
    highlightAirports,
    highlightRoute,
    clearRoute,
    focusAirport,
    setOnAirportClick,
    resizeMap,
    getMap,
    getAirports
};

let map = null;
let airports = [];
let markers = [];
let routeLine = null;
let onAirportClickCallback = null;
let apiUrl = "";
let availableAirportCodes = [];

async function initMap(containerId = "map-container", apiBaseUrl = "") {
    apiUrl = apiBaseUrl;
    
    map = L.map(containerId).setView([50, 10], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    await loadAirports();
    displayAirportMarkers();
}

async function loadAirports() {
    try {
        const response = await fetch(`${apiUrl}/api/airports`);
        if (!response.ok) throw new Error("Failed to load airports");
        airports = await response.json();
    } catch (error) {
        console.error("Error loading airports:", error);
        alert("Failed to load airport data");
    }
}

async function fetchWeather(airportIdent) {
    try {
        const response = await fetch(`${apiUrl}/api/weather/${airportIdent}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error fetching weather:", error);
        return null;
    }
}

function displayAirportMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
    availableAirportCodes = [];

    airports.forEach(airport => {
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: 5,
            fillColor: "#3388ff",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        });

        marker.bindPopup(`
            <strong>${airport.name}</strong><br>
            ${airport.ident}<br>
            ${airport.city}, ${airport.country}<br><br>
            <div class="weather-container">Loading weather...</div>
        `);

        marker.on("popupopen", async () => {
            const popupEl = marker.getPopup().getElement();
            if (!popupEl) return;

            const weatherContainer = popupEl.querySelector(".weather-container");
            if (!weatherContainer) return;

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
        });

        marker.addTo(map);
        markers.push(marker);
    });
}

function highlightAirports(airportCodes) {
    markers.forEach(marker => marker.remove());
    markers = [];
    availableAirportCodes = airportCodes;

    airports.forEach(airport => {
        const isHighlighted = airportCodes.includes(airport.ident);
        
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: isHighlighted ? 8 : 5,
            fillColor: isHighlighted ? "#ff0000" : "#3388ff",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: isHighlighted ? 0.9 : 0.6
        });

        const popupHTML = isHighlighted 
            ? `
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}<br><br>
                <div class="weather-container">Loading weather...</div>
                <button class="choose-airport-btn" data-ident="${airport.ident}">Choose</button>
              `
            : `
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}<br><br>
                <div class="weather-container">Loading weather...</div>
              `;

        marker.bindPopup(popupHTML);

        marker.on("popupopen", async () => {
            const popupEl = marker.getPopup().getElement();
            if (!popupEl) return;

            const weatherContainer = popupEl.querySelector(".weather-container");
            const btn = popupEl.querySelector(".choose-airport-btn");

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

            if (weatherContainer) {
                weatherContainer.innerHTML = weatherHTML;
            }

            if (btn && isHighlighted) {
                btn.onclick = () => {
                    if (onAirportClickCallback) {
                        onAirportClickCallback(airport);
                    }
                };
            }
        });

        marker.addTo(map);
        markers.push(marker);
    });
}

function drawRoute(routeAirportCodes) {
    if (routeLine) {
        routeLine.remove();
    }

    const routeCoords = [];
    routeAirportCodes.forEach(code => {
        const airport = airports.find(a => a.ident === code);
        if (airport) {
            routeCoords.push([airport.lat, airport.lng]);
        }
    });

    if (routeCoords.length > 1) {
        routeLine = L.polyline(routeCoords, {
            color: '#ff0000',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
}

function highlightRoute(routeData) {
    if (!routeData || !routeData.route) return;

    const routeCodes = routeData.route.map(stop => stop.ident);
    drawRoute(routeCodes);
    
    markers.forEach(marker => marker.remove());
    markers = [];

    airports.forEach(airport => {
        const routeIndex = routeCodes.indexOf(airport.ident);
        const isInRoute = routeIndex !== -1;
        const isAvailable = availableAirportCodes.includes(airport.ident);
        
        let color = "#3388ff";
        let radius = 5;
        
        if (isInRoute) {
            if (routeIndex === 0) {
                color = "#00ff00";
                radius = 10;
            } else if (routeIndex === routeCodes.length - 1) {
                color = "#ff0000";
                radius = 10;
            } else {
                color = "#ffaa00";
                radius = 8;
            }
        } else if (isAvailable) {
            color = "#ff0000";
            radius = 8;
        }
        
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: radius,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        });

        let popupText = `
            <strong>${airport.name}</strong><br>
            ${airport.ident}<br>
            ${airport.city}, ${airport.country}<br><br>
        `;
        
        if (isInRoute) {
            const stop = routeData.route[routeIndex];
            popupText += `<em>${stop.type || 'Stop'}</em><br>`;
        }

        popupText += `<div class="weather-container">Loading weather...</div>`;

        if (isAvailable) {
            popupText += `<button class="choose-airport-btn" data-ident="${airport.ident}">Choose</button>`;
        }

        marker.bindPopup(popupText);
        
        marker.on("popupopen", async () => {
            const popupEl = marker.getPopup().getElement();
            if (!popupEl) return;

            const weatherContainer = popupEl.querySelector(".weather-container");
            const btn = popupEl.querySelector(".choose-airport-btn");

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

            if (weatherContainer) {
                weatherContainer.innerHTML = weatherHTML;
            }

            if (btn && isAvailable) {
                btn.onclick = () => {
                    if (onAirportClickCallback) {
                        onAirportClickCallback(airport);
                    }
                };
            }
        });
        
        marker.addTo(map);
        markers.push(marker);
    });
}

function clearRoute() {
    if (routeLine) {
        routeLine.remove();
        routeLine = null;
    }
    displayAirportMarkers();
}

function focusAirport(airportCode) {
    const airport = airports.find(a => a.ident === airportCode);
    if (airport) {
        map.setView([airport.lat, airport.lng], 8);
    }
}

function setOnAirportClick(callback) {
    onAirportClickCallback = callback;
}

function resizeMap() {
    if (map) {
        map.invalidateSize();
    }
}

function getMap() {
    return map;
}

function getAirports() {
    return airports;
}