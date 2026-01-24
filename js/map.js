// Map initialization and management
const MapManager = {
    map: null,
    layers: {
        earthquakes: null,
        volcanoes: null,
        weather: null,
        warnings: null,
        incidents: null,
        crime: null,
        mostRecent: null,
        districts: null
    },
    baseTileLayer: null,

    // District colors (more vibrant for light background)
    districtColors: {
        'Northland': '#d69e2e',
        'Auckland': '#c53030',
        'Hauraki Gulf': '#0987a0',
        'Waikato': '#38a169',
        'Bay of Plenty': '#dd6b20',
        'Gisborne': '#805ad5',
        'Hawkes Bay': '#c05621',
        'Taranaki': '#e53e3e',
        'Manawatu-Whanganui': '#319795',
        'Wellington': '#2c7a7b',
        'Tasman': '#4a5568',
        'Nelson': '#3182ce',
        'Marlborough': '#5a67d8',
        'West Coast': '#6b46c1',
        'Canterbury': '#2b6cb0',
        'Otago': '#00a3c4',
        'Southland': '#3182ce'
    },

    // Simplified district boundaries (approximate polygons)
    districtBoundaries: {
        'Northland': [[-34.4, 172.5], [-34.4, 174.5], [-35.8, 174.8], [-36.2, 174.2], [-35.5, 173.0]],
        'Auckland': [[-36.2, 174.2], [-36.4, 175.2], [-37.2, 175.4], [-37.4, 174.4], [-36.8, 174.0]],
        'Hauraki Gulf': [[-36.2, 174.8], [-36.0, 175.5], [-36.3, 176.2], [-37.1, 175.9], [-37.2, 175.3], [-36.8, 174.9]],
        'Waikato': [[-37.2, 174.4], [-37.0, 176.2], [-38.8, 176.5], [-39.0, 175.0], [-38.0, 174.2]],
        'Bay of Plenty': [[-37.0, 176.2], [-37.4, 178.0], [-38.2, 178.2], [-38.8, 176.5]],
        'Gisborne': [[-37.4, 177.5], [-37.8, 178.6], [-38.8, 178.4], [-38.6, 177.2]],
        'Hawkes Bay': [[-38.6, 176.5], [-38.8, 178.0], [-40.2, 177.5], [-40.0, 176.0]],
        'Taranaki': [[-38.6, 173.5], [-38.6, 174.8], [-39.8, 174.5], [-39.8, 173.6]],
        'Manawatu-Whanganui': [[-38.8, 174.8], [-39.0, 176.5], [-40.5, 176.2], [-40.5, 175.0]],
        'Wellington': [[-40.5, 174.8], [-40.5, 176.2], [-41.6, 175.8], [-41.6, 174.5]],
        'Tasman': [[-40.5, 172.0], [-40.8, 173.5], [-42.0, 172.8], [-41.8, 171.5]],
        'Nelson': [[-41.0, 173.0], [-41.0, 173.6], [-41.4, 173.6], [-41.4, 173.0]],
        'Marlborough': [[-41.0, 173.5], [-41.2, 174.5], [-42.5, 174.2], [-42.2, 173.2]],
        'West Coast': [[-41.8, 171.0], [-42.0, 172.0], [-44.0, 171.0], [-43.8, 168.5]],
        'Canterbury': [[-42.2, 171.5], [-42.5, 174.0], [-44.8, 172.5], [-44.5, 169.5]],
        'Otago': [[-44.5, 168.5], [-44.8, 171.5], [-46.5, 170.5], [-46.2, 168.0]],
        'Southland': [[-45.5, 166.5], [-46.0, 168.5], [-46.8, 168.8], [-46.8, 166.2]]
    },

    // Track the most recent event
    mostRecentEvent: null,

    // NZ bounds
    nzBounds: [
        [-47.5, 165.5], // SW
        [-34.0, 179.0]  // NE
    ],

    init() {
        // Initialize map centered on NZ, constrained to NZ bounds
        this.map = L.map('map', {
            center: [-41.5, 174.0],
            zoom: 6,
            minZoom: 5,
            maxZoom: 15,
            maxBounds: [
                [-48.5, 164.0], // SW corner (with padding)
                [-33.0, 180.0]  // NE corner (with padding)
            ],
            maxBoundsViscosity: 1.0 // Prevent dragging outside bounds completely
        });

        // Add OpenTopoMap tile layer (terrain detail without prominent coastlines)
        this.baseTileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxZoom: 17
        });
        this.baseTileLayer.addTo(this.map);

        // Initialize layer groups (not added to map by default)
        this.layers.earthquakes = L.layerGroup();
        this.layers.volcanoes = L.layerGroup();
        this.layers.weather = L.layerGroup();
        this.layers.warnings = L.layerGroup();
        this.layers.incidents = L.layerGroup();
        this.layers.crime = L.layerGroup();
        this.layers.mostRecent = L.layerGroup();
        this.layers.districts = L.layerGroup();

        // Add district overlays (always visible)
        this.addDistrictOverlays();

        // Add major NZ cities as reference
        this.addCityMarkers();

        return this;
    },

    addDistrictOverlays() {
        Object.entries(this.districtBoundaries).forEach(([name, coords]) => {
            const color = this.districtColors[name] || '#4a5568';
            const polygon = L.polygon(coords, {
                fillColor: color,
                fillOpacity: 0.15,
                color: color,
                weight: 0,
                opacity: 0
            });
            polygon.bindTooltip(name, {
                permanent: false,
                direction: 'center',
                className: 'district-tooltip'
            });
            this.layers.districts.addLayer(polygon);
        });
        // Districts always visible
        this.layers.districts.addTo(this.map);
    },

    addCityMarkers() {
        const cities = [
            { name: 'Auckland', lat: -36.85, lng: 174.76 },
            { name: 'Wellington', lat: -41.29, lng: 174.78 },
            { name: 'Christchurch', lat: -43.53, lng: 172.64 },
            { name: 'Hamilton', lat: -37.79, lng: 175.28 },
            { name: 'Dunedin', lat: -45.87, lng: 170.50 },
            { name: 'Tauranga', lat: -37.69, lng: 176.17 },
            { name: 'Napier', lat: -39.49, lng: 176.92 },
            { name: 'Palmerston North', lat: -40.35, lng: 175.61 },
            { name: 'Nelson', lat: -41.27, lng: 173.28 },
            { name: 'Queenstown', lat: -45.03, lng: 168.66 },
            { name: 'Invercargill', lat: -46.41, lng: 168.35 },
            { name: 'New Plymouth', lat: -39.06, lng: 174.08 },
            { name: 'Whangarei', lat: -35.73, lng: 174.32 },
            { name: 'Rotorua', lat: -38.14, lng: 176.25 },
            { name: 'Gisborne', lat: -38.66, lng: 178.02 },
            { name: 'Greymouth', lat: -42.45, lng: 171.21 }
        ];

        cities.forEach(city => {
            const marker = L.circleMarker([city.lat, city.lng], {
                radius: 6,
                fillColor: '#2c7a7b',
                color: '#234e52',
                weight: 0.5,
                opacity: 0.4,
                fillOpacity: 0.8
            });
            marker.bindTooltip(city.name, {
                permanent: false,
                direction: 'top',
                className: 'city-tooltip'
            });
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

            // Color based on depth - more vibrant for light background
            let color = '#e53e3e';
            if (depth > 100) color = '#805ad5';
            else if (depth > 50) color = '#c53030';
            else if (depth > 20) color = '#e53e3e';

            const marker = L.circleMarker([coords[1], coords[0]], {
                radius: radius,
                fillColor: color,
                color: '#1a202c',
                weight: 0.5,
                opacity: 0.4,
                fillOpacity: 0.85
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

                // Color based on alert level - more vibrant for light background
                let color = '#38a169'; // Level 0 - green
                if (level >= 3) color = '#e53e3e'; // red
                else if (level >= 2) color = '#dd6b20'; // orange
                else if (level >= 1) color = '#d69e2e'; // yellow

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
        'hauraki gulf': { lat: -36.5, lng: 175.4 },
        'hauraki': { lat: -36.5, lng: 175.4 },
        'waiheke': { lat: -36.8, lng: 175.1 },
        'great barrier': { lat: -36.2, lng: 175.4 },
        'rangitoto': { lat: -36.78, lng: 174.86 },
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
                let color = '#d69e2e'; // default yellow
                if (severity === 'high') color = '#e53e3e';
                else if (severity === 'medium') color = '#dd6b20';

                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 16,
                    fillColor: color,
                    color: '#1a202c',
                    weight: 0.5,
                    opacity: 0.4,
                    fillOpacity: 0.8
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

            // Determine incident type and color - vibrant for light background
            let color = '#dd6b20'; // default orange
            let icon = '📰';
            if (text.includes('landslide') || text.includes('slip') || text.includes('landslip')) {
                color = '#805ad5'; // purple for landslides
                icon = '⛰️';
            } else if (text.includes('crash') || text.includes('accident') || text.includes('fatal')) {
                color = '#c53030'; // red for crashes
                icon = '🚗';
            } else if (text.includes('fire')) {
                color = '#e53e3e'; // red for fire
                icon = '🔥';
            } else if (text.includes('flood') || text.includes('swept')) {
                color = '#2b6cb0'; // blue for water-related
                icon = '🌊';
            } else if (text.includes('search') || text.includes('rescue') || text.includes('missing')) {
                color = '#b7791f'; // amber for search/rescue
                icon = '🔍';
            }

            matchedRegions.forEach(({ region, coords }) => {
                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 13,
                    fillColor: color,
                    color: '#1a202c',
                    weight: 0.5,
                    opacity: 0.4,
                    fillOpacity: 0.85
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

            // Determine crime type and icon - vibrant for light background
            let color = '#c53030'; // default red
            let icon = '🚨';
            if (text.includes('protest') || text.includes('demonstration') || text.includes('rally')) {
                color = '#b7791f'; // amber for protests
                icon = '✊';
            } else if (text.includes('robbery') || text.includes('burglary') || text.includes('theft') || text.includes('stolen')) {
                color = '#9b2c2c'; // dark red
                icon = '💰';
            } else if (text.includes('assault') || text.includes('attack') || text.includes('violent')) {
                color = '#6b46c1'; // purple
                icon = '⚠️';
            } else if (text.includes('homicide') || text.includes('murder') || text.includes('death') || text.includes('killed')) {
                color = '#1a202c'; // dark
                icon = '💀';
            } else if (text.includes('drugs') || text.includes('meth') || text.includes('cannabis')) {
                color = '#276749'; // green
                icon = '💊';
            } else if (text.includes('fraud') || text.includes('scam')) {
                color = '#2b6cb0'; // blue
                icon = '🎭';
            } else if (text.includes('arrest') || text.includes('charged') || text.includes('court')) {
                color = '#4a5568'; // grey-blue
                icon = '👮';
            }

            matchedRegions.forEach(({ region, coords }) => {
                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: 11,
                    fillColor: color,
                    color: '#1a202c',
                    weight: 0.5,
                    opacity: 0.4,
                    fillOpacity: 0.85
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

    // Show only specified layer, hide others (excludes mostRecent and districts)
    showOnlyLayer(layerName) {
        Object.keys(this.layers).forEach(key => {
            if (key === 'mostRecent' || key === 'districts') return; // Skip special layers
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
        // Always hide mostRecent when showing specific layers
        if (this.layers.mostRecent && this.map.hasLayer(this.layers.mostRecent)) {
            this.map.removeLayer(this.layers.mostRecent);
        }
    },

    // Show all layers (excludes mostRecent and districts)
    showAllLayers() {
        Object.keys(this.layers).forEach(key => {
            if (key === 'mostRecent' || key === 'districts') return; // Skip special layers
            const layer = this.layers[key];
            if (layer && !this.map.hasLayer(layer)) {
                this.map.addLayer(layer);
            }
        });
        // Hide mostRecent when showing all
        if (this.layers.mostRecent && this.map.hasLayer(this.layers.mostRecent)) {
            this.map.removeLayer(this.layers.mostRecent);
        }
    },

    // Hide all layers (excludes districts - they always stay visible)
    hideAllLayers() {
        Object.keys(this.layers).forEach(key => {
            if (key === 'districts') return; // Districts always visible
            const layer = this.layers[key];
            if (layer && this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
    },

    // Show only the most recent event marker
    showMostRecentEvent(event) {
        this.layers.mostRecent.clearLayers();
        this.hideAllLayers();

        if (!event) return;

        let marker;
        const { type, data } = event;

        if (type === 'earthquake') {
            const coords = data.geometry?.coordinates || [0, 0, 0];
            const props = data.properties || {};
            const magnitude = props.magnitude ?? 0;
            const depth = coords[2] ?? 0;
            const radius = Math.max(8, (magnitude || 1) * 5);
            let color = '#e53e3e';
            if (depth > 100) color = '#805ad5';
            else if (depth > 50) color = '#c53030';

            marker = L.circleMarker([coords[1], coords[0]], {
                radius: radius,
                fillColor: color,
                color: '#1a202c',
                weight: 0.5,
                opacity: 0.4,
                fillOpacity: 0.9
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
                </div>
            `).openPopup();

        } else if (type === 'warning') {
            const text = ((data.title || '') + ' ' + (data.description || '')).toLowerCase();
            let coords = { lat: -40.9, lng: 174.9 };
            Object.entries(this.regionCoords).forEach(([region, c]) => {
                if (text.includes(region)) coords = c;
            });

            const severity = data.severity || 'low';
            let color = '#d69e2e';
            if (severity === 'high') color = '#e53e3e';
            else if (severity === 'medium') color = '#dd6b20';

            marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 18,
                fillColor: color,
                color: '#1a202c',
                weight: 0.5,
                opacity: 0.4,
                fillOpacity: 0.85
            });

            marker.bindPopup(`
                <div class="popup-title">${data.eventType || 'Weather Warning'}</div>
                <div class="popup-meta">
                    <div>${data.title}</div>
                    <div>Severity: ${severity}</div>
                </div>
            `).openPopup();

        } else if (type === 'incident' || type === 'crime') {
            const text = ((data.title || '') + ' ' + (data.description || '')).toLowerCase();
            let coords = null;
            Object.entries(this.regionCoords).forEach(([region, c]) => {
                if (text.includes(region) && !coords) coords = c;
            });

            if (!coords) return;

            const color = type === 'crime' ? '#c53030' : '#805ad5';
            marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 15,
                fillColor: color,
                color: '#1a202c',
                weight: 0.5,
                opacity: 0.4,
                fillOpacity: 0.85
            });

            marker.bindPopup(`
                <div class="popup-title">${data.title || 'Event'}</div>
                <div class="popup-meta">
                    <div>${data.description ? data.description.substring(0, 150) + '...' : ''}</div>
                    <div>Source: ${data.source || 'News'}</div>
                </div>
            `).openPopup();
        }

        if (marker) {
            this.layers.mostRecent.addLayer(marker);
            this.map.addLayer(this.layers.mostRecent);
        }
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
