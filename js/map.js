// Map initialization and management
const MapManager = {
    map: null,
    layers: {
        earthquakes: null,
        volcanoes: null,
        weather: null,
        warnings: null,
        incidents: null,
        crime: null
    },
    baseTileLayer: null,

    // NZ bounds
    nzBounds: [
        [-47.5, 165.5], // SW
        [-34.0, 179.0]  // NE
    ],

    init() {
        // Initialize map centered on NZ
        this.map = L.map('map', {
            center: [-41.5, 174.0],
            zoom: 6,
            minZoom: 5,
            maxZoom: 15
        });

        // Add dark-themed tile layer
        this.baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        });
        this.baseTileLayer.addTo(this.map);

        // Initialize layer groups
        this.layers.earthquakes = L.layerGroup().addTo(this.map);
        this.layers.volcanoes = L.layerGroup().addTo(this.map);
        this.layers.weather = L.layerGroup().addTo(this.map);
        this.layers.warnings = L.layerGroup().addTo(this.map);
        this.layers.incidents = L.layerGroup().addTo(this.map);
        this.layers.crime = L.layerGroup().addTo(this.map);

        // Add major NZ cities as reference
        this.addCityMarkers();

        return this;
    },

    addCityMarkers() {
        const cities = [
            { name: 'Auckland', lat: -36.85, lng: 174.76 },
            { name: 'Wellington', lat: -41.29, lng: 174.78 },
            { name: 'Christchurch', lat: -43.53, lng: 172.64 },
            { name: 'Hamilton', lat: -37.79, lng: 175.28 },
            { name: 'Dunedin', lat: -45.87, lng: 170.50 }
        ];

        cities.forEach(city => {
            const marker = L.circleMarker([city.lat, city.lng], {
                radius: 4,
                fillColor: '#4ecdc4',
                color: '#4ecdc4',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            });
            marker.bindTooltip(city.name, { permanent: false, direction: 'top' });
            this.layers.weather.addLayer(marker);
        });
    },

    // Add earthquake markers
    addEarthquakes(quakes) {
        this.layers.earthquakes.clearLayers();

        quakes.forEach(quake => {
            const coords = quake.geometry?.coordinates || [0, 0, 0];
            const props = quake.properties || {};
            const magnitude = props.magnitude ?? 0;
            const depth = coords[2] ?? 0;

            // Size based on magnitude
            const radius = Math.max(5, (magnitude || 1) * 4);

            // Color based on depth
            let color = '#ff6b6b';
            if (depth > 100) color = '#9b59b6';
            else if (depth > 50) color = '#e74c3c';
            else if (depth > 20) color = '#ff6b6b';

            const marker = L.circleMarker([coords[1], coords[0]], {
                radius: radius,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.7
            });

            const magDisplay = typeof magnitude === 'number' ? magnitude.toFixed(1) : '?';
            const depthDisplay = typeof depth === 'number' ? depth.toFixed(1) : '?';
            const time = new Date(props.time).toLocaleString('en-NZ');
            marker.bindPopup(`
                <div class="popup-title">M${magDisplay} Earthquake</div>
                <div class="popup-meta">
                    <div>Depth: ${depthDisplay} km</div>
                    <div>Time: ${time}</div>
                    <div>Location: ${props.locality || 'Unknown'}</div>
                    <div>MMI: ${props.mmi || 'N/A'}</div>
                </div>
            `);

            this.layers.earthquakes.addLayer(marker);
        });
    },

    // Add volcano markers
    addVolcanoes(volcanoes) {
        this.layers.volcanoes.clearLayers();

        // Known volcano locations
        const volcanoLocations = {
            'ruapehu': { lat: -39.28, lng: 175.57 },
            'tongariro': { lat: -39.13, lng: 175.64 },
            'ngauruhoe': { lat: -39.16, lng: 175.63 },
            'whiteisland': { lat: -37.52, lng: 177.18 },
            'taranaki': { lat: -39.30, lng: 174.06 },
            'taupo': { lat: -38.82, lng: 175.90 },
            'okataina': { lat: -38.12, lng: 176.50 },
            'aucklandvolcanicfield': { lat: -36.90, lng: 174.87 }
        };

        volcanoes.forEach(volcano => {
            const id = volcano.volcanoID?.toLowerCase() || '';
            const location = volcanoLocations[id];

            if (location) {
                const level = volcano.level || 0;

                // Color based on alert level
                let color = '#6bcf63'; // Level 0
                if (level >= 3) color = '#ff6b6b';
                else if (level >= 2) color = '#ff9f43';
                else if (level >= 1) color = '#ffd93d';

                const marker = L.marker([location.lat, location.lng], {
                    icon: L.divIcon({
                        className: 'volcano-icon',
                        html: `<div style="
                            width: 20px;
                            height: 20px;
                            background: ${color};
                            border: 2px solid #fff;
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            box-shadow: 0 0 10px ${color};
                        "></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 20]
                    })
                });

                marker.bindPopup(`
                    <div class="popup-title">${volcano.volcanoTitle || 'Unknown Volcano'}</div>
                    <div class="popup-meta">
                        <div>Alert Level: ${level}</div>
                        <div>Activity: ${volcano.activity || 'No volcanic unrest'}</div>
                        <div>Hazards: ${volcano.hazards || 'Volcanic environment hazards'}</div>
                    </div>
                `);

                this.layers.volcanoes.addLayer(marker);
            }
        });
    },

    // NZ region coordinates for warning markers
    regionCoords: {
        'northland': { lat: -35.5, lng: 173.8 },
        'auckland': { lat: -36.85, lng: 174.76 },
        'waikato': { lat: -37.8, lng: 175.3 },
        'bay of plenty': { lat: -37.8, lng: 176.5 },
        'tauranga': { lat: -37.69, lng: 176.17 },
        'mount maunganui': { lat: -37.64, lng: 176.18 },
        'papamoa': { lat: -37.72, lng: 176.28 },
        'pāpāmoa': { lat: -37.72, lng: 176.28 },
        'welcome bay': { lat: -37.73, lng: 176.12 },
        'tairua': { lat: -36.99, lng: 175.85 },
        'rotorua': { lat: -38.14, lng: 176.25 },
        'gisborne': { lat: -38.66, lng: 178.02 },
        'east coast': { lat: -38.5, lng: 177.8 },
        'hawkes bay': { lat: -39.5, lng: 176.9 },
        "hawke's bay": { lat: -39.5, lng: 176.9 },
        'napier': { lat: -39.49, lng: 176.92 },
        'hastings': { lat: -39.64, lng: 176.85 },
        'taranaki': { lat: -39.3, lng: 174.0 },
        'new plymouth': { lat: -39.06, lng: 174.08 },
        'manawatu': { lat: -40.3, lng: 175.6 },
        'palmerston north': { lat: -40.35, lng: 175.61 },
        'whanganui': { lat: -39.9, lng: 175.0 },
        'wellington': { lat: -41.29, lng: 174.78 },
        'lower hutt': { lat: -41.21, lng: 174.91 },
        'upper hutt': { lat: -41.12, lng: 175.07 },
        'wairarapa': { lat: -41.2, lng: 175.5 },
        'masterton': { lat: -40.96, lng: 175.66 },
        'nelson': { lat: -41.27, lng: 173.28 },
        'marlborough': { lat: -41.5, lng: 173.9 },
        'blenheim': { lat: -41.51, lng: 173.95 },
        'west coast': { lat: -42.5, lng: 171.2 },
        'greymouth': { lat: -42.45, lng: 171.21 },
        'canterbury': { lat: -43.53, lng: 172.64 },
        'christchurch': { lat: -43.53, lng: 172.64 },
        'timaru': { lat: -44.40, lng: 171.25 },
        'otago': { lat: -45.0, lng: 169.5 },
        'dunedin': { lat: -45.87, lng: 170.50 },
        'queenstown': { lat: -45.03, lng: 168.66 },
        'southland': { lat: -46.1, lng: 168.3 },
        'invercargill': { lat: -46.41, lng: 168.35 },
        'fiordland': { lat: -45.4, lng: 167.7 },
        'central plateau': { lat: -39.2, lng: 175.5 },
        'coromandel': { lat: -36.8, lng: 175.5 },
        'taupo': { lat: -38.7, lng: 176.1 },
        'hamilton': { lat: -37.79, lng: 175.28 },
        'whangarei': { lat: -35.73, lng: 174.32 }
    },

    // Add weather warning markers
    addWarnings(warnings) {
        this.layers.warnings.clearLayers();

        if (!warnings || !Array.isArray(warnings)) return;

        warnings.forEach(warning => {
            // Try to extract location from title or description
            const text = ((warning.title || '') + ' ' + (warning.description || '')).toLowerCase();

            // Find matching regions
            const matchedRegions = [];
            Object.entries(this.regionCoords).forEach(([region, coords]) => {
                if (text.includes(region)) {
                    matchedRegions.push({ region, coords });
                }
            });

            // If no specific region found, check for general NZ indicators
            if (matchedRegions.length === 0) {
                // Default to central NZ for general warnings
                matchedRegions.push({ region: 'New Zealand', coords: { lat: -40.9, lng: 174.9 } });
            }

            // Create markers for each matched region
            matchedRegions.forEach(({ region, coords }) => {
                const severity = warning.severity || 'low';
                let color = '#ffd93d'; // default yellow
                if (severity === 'high') color = '#ff6b6b';
                else if (severity === 'medium') color = '#ff9f43';

                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 15,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.6
                });

                const title = warning.title || 'Weather Warning';
                marker.bindPopup(`
                    <div class="popup-title">${warning.eventType || 'Weather Warning'}</div>
                    <div class="popup-meta">
                        <div>${title}</div>
                        <div>Severity: ${severity}</div>
                        <div>Area: ${region}</div>
                    </div>
                `);

                this.layers.warnings.addLayer(marker);
            });
        });
    },

    // Add incident markers (from news feeds)
    addIncidents(incidents) {
        this.layers.incidents.clearLayers();

        if (!incidents || !Array.isArray(incidents)) return;

        incidents.forEach(incident => {
            const text = ((incident.title || '') + ' ' + (incident.description || '')).toLowerCase();

            // Find matching regions
            const matchedRegions = [];
            Object.entries(this.regionCoords).forEach(([region, coords]) => {
                if (text.includes(region)) {
                    matchedRegions.push({ region, coords });
                }
            });

            // Skip if no location found
            if (matchedRegions.length === 0) return;

            // Determine incident type and color
            let color = '#ff9f43'; // default orange
            let icon = '📰';
            if (text.includes('landslide') || text.includes('slip') || text.includes('landslip')) {
                color = '#9b59b6'; // purple for landslides
                icon = '⛰️';
            } else if (text.includes('crash') || text.includes('accident') || text.includes('fatal')) {
                color = '#e74c3c'; // red for crashes
                icon = '🚗';
            } else if (text.includes('fire')) {
                color = '#ff6b6b'; // red-orange for fire
                icon = '🔥';
            } else if (text.includes('flood') || text.includes('swept')) {
                color = '#3498db'; // blue for water-related
                icon = '🌊';
            } else if (text.includes('search') || text.includes('rescue') || text.includes('missing')) {
                color = '#f39c12'; // yellow-orange for search/rescue
                icon = '🔍';
            }

            matchedRegions.forEach(({ region, coords }) => {
                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 12,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.7
                });

                marker.bindPopup(`
                    <div class="popup-title">${icon} ${incident.title || 'Incident'}</div>
                    <div class="popup-meta">
                        <div>${incident.description ? incident.description.substring(0, 150) + '...' : ''}</div>
                        <div>Source: ${incident.source || 'News'}</div>
                        <div>Area: ${region}</div>
                    </div>
                `);

                this.layers.incidents.addLayer(marker);
            });
        });
    },

    // Add crime/civil unrest markers
    addCrime(crimeItems) {
        this.layers.crime.clearLayers();

        if (!crimeItems || !Array.isArray(crimeItems)) return;

        crimeItems.forEach(item => {
            const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();

            // Find matching regions
            const matchedRegions = [];
            Object.entries(this.regionCoords).forEach(([region, coords]) => {
                if (text.includes(region)) {
                    matchedRegions.push({ region, coords });
                }
            });

            // Skip if no location found
            if (matchedRegions.length === 0) return;

            // Determine crime type and icon
            let color = '#e74c3c'; // default red
            let icon = '🚨';
            if (text.includes('protest') || text.includes('demonstration') || text.includes('rally')) {
                color = '#f39c12'; // orange for protests
                icon = '✊';
            } else if (text.includes('robbery') || text.includes('burglary') || text.includes('theft') || text.includes('stolen')) {
                color = '#c0392b'; // dark red
                icon = '💰';
            } else if (text.includes('assault') || text.includes('attack') || text.includes('violent')) {
                color = '#8e44ad'; // purple
                icon = '⚠️';
            } else if (text.includes('homicide') || text.includes('murder') || text.includes('death') || text.includes('killed')) {
                color = '#2c3e50'; // dark
                icon = '💀';
            } else if (text.includes('drugs') || text.includes('meth') || text.includes('cannabis')) {
                color = '#27ae60'; // green
                icon = '💊';
            } else if (text.includes('fraud') || text.includes('scam')) {
                color = '#3498db'; // blue
                icon = '🎭';
            } else if (text.includes('arrest') || text.includes('charged') || text.includes('court')) {
                color = '#34495e'; // grey-blue
                icon = '👮';
            }

            matchedRegions.forEach(({ region, coords }) => {
                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 10,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.7
                });

                marker.bindPopup(`
                    <div class="popup-title">${icon} ${item.title || 'Crime Report'}</div>
                    <div class="popup-meta">
                        <div>${item.description ? item.description.substring(0, 150) + '...' : ''}</div>
                        <div>Source: ${item.source || 'Police'}</div>
                        <div>Area: ${region}</div>
                    </div>
                `);

                this.layers.crime.addLayer(marker);
            });
        });
    },

    // Show only specified layer, hide others
    showOnlyLayer(layerName) {
        Object.keys(this.layers).forEach(key => {
            const layer = this.layers[key];
            if (layer) {
                if (key === layerName) {
                    if (!this.map.hasLayer(layer)) {
                        this.map.addLayer(layer);
                    }
                } else {
                    this.map.removeLayer(layer);
                }
            }
        });
    },

    // Show all layers
    showAllLayers() {
        Object.keys(this.layers).forEach(key => {
            const layer = this.layers[key];
            if (layer && !this.map.hasLayer(layer)) {
                this.map.addLayer(layer);
            }
        });
    },

    // Pan to location
    panTo(lat, lng, zoom = 10) {
        this.map.setView([lat, lng], zoom);
    },

    // Fit to NZ bounds
    fitNZ() {
        this.map.fitBounds(this.nzBounds);
    }
};
