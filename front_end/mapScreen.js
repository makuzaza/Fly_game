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
let availableAirportCodes = []; // Track which airports can be selected

// Initialize the map
async function initMap(containerId = "map-container", apiBaseUrl = "") {
    apiUrl = apiBaseUrl;
    
    // Create map centered on Europe
    map = L.map(containerId).setView([50, 10], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Load airports from backend
    await loadAirports();
    displayAirportMarkers();
}

// Load all airports from backend
async function loadAirports() {
    try {
        const response = await fetch(`${apiUrl}/api/airports`);
        if (!response.ok) throw new Error("Failed to load airports");
        airports = await response.json();
        console.log(`Loaded ${airports.length} airports`);
    } catch (error) {
        console.error("Error loading airports:", error);
        alert("Failed to load airport data");
    }
}

// Display all airports as markers
function displayAirportMarkers() {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];
    availableAirportCodes = []; // Clear available airports

    airports.forEach(airport => {
        const marker = L.circleMarker([airport.lat, airport.lng], {
            radius: 5,
            fillColor: "#3388ff",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        });

        // Add popup with airport info (no button)
        marker.bindPopup(`
            <strong>${airport.name}</strong><br>
            ${airport.ident}<br>
            ${airport.city}, ${airport.country}
        `);

        marker.addTo(map);
        markers.push(marker);
    });
}

// Highlight specific airports
function highlightAirports(airportCodes) {
    markers.forEach(marker => marker.remove());
    markers = [];
    availableAirportCodes = airportCodes; // Store which airports are selectable

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

        // Only add "Choose" button for highlighted (red) airports
        const popupHTML = isHighlighted 
            ? `
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}<br>
                <button class="choose-airport-btn" data-ident="${airport.ident}">Choose</button>
              `
            : `
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
              `;

        marker.bindPopup(popupHTML);

        // Only add click handler for highlighted airports
        if (isHighlighted) {
            marker.on("popupopen", () => {
                const btn = document.querySelector(".choose-airport-btn");
                if (btn) {
                    btn.onclick = () => {
                        if (onAirportClickCallback) {
                            onAirportClickCallback(airport);
                        }
                    };
                }
            });
        }

        marker.addTo(map);
        markers.push(marker);
    });
}

// Draw route line between airports
function drawRoute(routeAirportCodes) {
    // Remove existing route lines
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

        // Fit map to show entire route
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
}

// Highlight route airports
function highlightRoute(routeData) {
    if (!routeData || !routeData.route) return;

    const routeCodes = routeData.route.map(stop => stop.ident);
    drawRoute(routeCodes);
    
    // Keep airports selectable when showing route (don't clear availableAirportCodes)

    // Highlight route airports differently
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
                color = "#00ff00"; // Start - green
                radius = 10;
            } else if (routeIndex === routeCodes.length - 1) {
                color = "#ff0000"; // End - red
                radius = 10;
            } else {
                color = "#ffaa00"; // Stop - orange
                radius = 8;
            }
        } else if (isAvailable) {
            // Keep available airports red
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
            ${airport.city}, ${airport.country}
        `;
        
        if (isInRoute) {
            const stop = routeData.route[routeIndex];
            popupText += `<br><em>${stop.type || 'Stop'}</em>`;
        }

        // Add "Choose" button for available airports
        if (isAvailable) {
            popupText += `<br><button class="choose-airport-btn" data-ident="${airport.ident}">Choose</button>`;
        }

        marker.bindPopup(popupText);
        
        // Add click handler for available airports
        if (isAvailable) {
            marker.on("popupopen", () => {
                const btn = document.querySelector(".choose-airport-btn");
                if (btn) {
                    btn.onclick = () => {
                        if (onAirportClickCallback) {
                            onAirportClickCallback(airport);
                        }
                    };
                }
            });
        }
        
        marker.addTo(map);
        markers.push(marker);
    });
}

// Clear route visualization
function clearRoute() {
    if (routeLine) {
        routeLine.remove();
        routeLine = null;
    }
    displayAirportMarkers();
}

// Focus map on specific airport
function focusAirport(airportCode) {
    const airport = airports.find(a => a.ident === airportCode);
    if (airport) {
        map.setView([airport.lat, airport.lng], 8);
    }
}

// Set callback for airport clicks
function setOnAirportClick(callback) {
    onAirportClickCallback = callback;
}

// Resize map (call after container resize)
function resizeMap() {
    if (map) {
        map.invalidateSize();
    }
}

// Get current map instance
function getMap() {
    return map;
}

// Get all loaded airports
function getAirports() {
    return airports;
}