// mapScreen.js - Interactive Map Module

class MapScreen {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.map = null;
        this.airports = [];
        this.markers = [];
        this.onAirportClick = null;
    }

    // Initialize the map
    async init(containerId = "map-container") {
        // Create map centered on Europe
        this.map = L.map(containerId).setView([50, 10], 4);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Load airports from backend
        await this.loadAirports();
        this.displayAirportMarkers();
    }

    // Load all airports from backend
    async loadAirports() {
        try {
            const response = await fetch(`${this.apiUrl}/api/airports`);
            if (!response.ok) throw new Error("Failed to load airports");
            this.airports = await response.json();
            console.log(`Loaded ${this.airports.length} airports`);
        } catch (error) {
            console.error("Error loading airports:", error);
            alert("Failed to load airport data");
        }
    }

    // Display all airports as markers
    displayAirportMarkers() {
        // Clear existing markers
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const marker = L.circleMarker([airport.lat, airport.lng], {
                radius: 5,
                fillColor: "#3388ff",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.6
            });

            // Add popup with airport info
            marker.bindPopup(`
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
            `);

            // Make marker clickable
            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    // Highlight specific airports
    highlightAirports(airportCodes) {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const isHighlighted = airportCodes.includes(airport.ident);
            
            const marker = L.circleMarker([airport.lat, airport.lng], {
                radius: isHighlighted ? 8 : 5,
                fillColor: isHighlighted ? "#ff0000" : "#3388ff",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: isHighlighted ? 0.9 : 0.6
            });

            marker.bindPopup(`
                <strong>${airport.name}</strong><br>
                ${airport.ident}<br>
                ${airport.city}, ${airport.country}
                ${isHighlighted ? '<br><em>Destination Available</em>' : ''}
            `);

            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    // Draw route line between airports
    drawRoute(routeAirportCodes) {
        // Remove existing route lines
        if (this.routeLine) {
            this.routeLine.remove();
        }

        const routeCoords = [];
        routeAirportCodes.forEach(code => {
            const airport = this.airports.find(a => a.ident === code);
            if (airport) {
                routeCoords.push([airport.lat, airport.lng]);
            }
        });

        if (routeCoords.length > 1) {
            this.routeLine = L.polyline(routeCoords, {
                color: '#ff0000',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(this.map);

            // Fit map to show entire route
            this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
        }
    }

    // Highlight route airports
    highlightRoute(routeData) {
        if (!routeData || !routeData.route) return;

        const routeCodes = routeData.route.map(stop => stop.ident);
        this.drawRoute(routeCodes);

        // Highlight route airports differently
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        this.airports.forEach(airport => {
            const routeIndex = routeCodes.indexOf(airport.ident);
            const isInRoute = routeIndex !== -1;
            
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
                popupText += `<br><em>${stop.type}</em>`;
            }

            marker.bindPopup(popupText);

            marker.on('click', () => {
                if (this.onAirportClick) {
                    this.onAirportClick(airport);
                }
            });

            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }

    // Clear route visualization
    clearRoute() {
        if (this.routeLine) {
            this.routeLine.remove();
            this.routeLine = null;
        }
        this.displayAirportMarkers();
    }

    // Focus map on specific airport
    focusAirport(airportCode) {
        const airport = this.airports.find(a => a.ident === airportCode);
        if (airport) {
            this.map.setView([airport.lat, airport.lng], 8);
        }
    }

    // Set callback for airport clicks
    setOnAirportClick(callback) {
        this.onAirportClick = callback;
    }

    // Resize map (call after container resize)
    resize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapScreen;
}