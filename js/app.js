// Main application controller
const App = {
    refreshIntervals: {
        earthquakes: 300000,   // 5 minutes
        volcanoes: 300000,     // 5 minutes
        weather: 300000,       // 5 minutes
        warnings: 300000,      // 5 minutes
        incidents: 300000,     // 5 minutes
        crime: 300000          // 5 minutes
    },

    timers: {},

    // Track the most recent event for initial display
    mostRecentEvent: null,

    // 24-hour time window (in milliseconds)
    timeWindowMs: 24 * 60 * 60 * 1000,

    // Check if a timestamp is within the last 24 hours
    isWithin24Hours(timestamp) {
        if (!timestamp) return false;
        const eventTime = new Date(timestamp).getTime();
        const now = Date.now();
        return (now - eventTime) <= this.timeWindowMs;
    },

    // Initialize the application
    async init() {
        console.log('Initializing NZ Extreme Weather Dashboard...');

        // Initialize the map
        MapManager.init();

        // Load all data
        await this.loadAllData();

        // Show most recent event in screen saver mode (no panel active)
        this.showScreenSaverMode();

        // Set up auto-refresh
        this.setupAutoRefresh();

        // Set up panel interactions for map filtering
        this.setupPanelMapFilters();

        console.log('Dashboard initialized successfully');
    },

    // Set up panel heading interactions to filter map layers
    setupPanelMapFilters() {
        const panelLayerMap = {
            'warnings-panel': 'warnings',
            'weather-panel': 'weather',
            'earthquake-panel': 'earthquakes',
            'volcano-panel': 'volcanoes',
            'incidents-panel': 'incidents',
            'crime-panel': 'crime'
        };

        Object.entries(panelLayerMap).forEach(([panelId, layerName]) => {
            const panel = document.getElementById(panelId);
            if (panel) {
                const heading = panel.querySelector('h3');
                if (heading) {
                    // Hover to temporarily show layer
                    heading.addEventListener('mouseenter', () => {
                        // Only show on hover if no panel is filter-active
                        const anyActive = document.querySelector('.panel.filter-active');
                        if (!anyActive) {
                            MapManager.showOnlyLayer(layerName);
                        }
                    });

                    heading.addEventListener('mouseleave', () => {
                        // Return to screen saver mode if no panel is filter-active
                        const anyActive = document.querySelector('.panel.filter-active');
                        if (!anyActive) {
                            this.showScreenSaverMode();
                        }
                    });

                    // Click to toggle - expand panel and show only this layer
                    heading.addEventListener('click', (e) => {
                        // Don't filter if clicking the collapse arrow area
                        if (e.target.classList.contains('count')) return;

                        // Toggle active state
                        const wasActive = panel.classList.contains('filter-active');

                        // Remove active from all panels and collapse them
                        document.querySelectorAll('.panel').forEach(p => {
                            p.classList.remove('filter-active');
                            p.classList.add('collapsed');
                        });

                        if (wasActive) {
                            // Was active, return to screen saver mode
                            this.showScreenSaverMode();
                        } else {
                            // Activate this filter, expand panel
                            panel.classList.add('filter-active');
                            panel.classList.remove('collapsed');
                            MapManager.showOnlyLayer(layerName);
                        }
                    });
                }
            }
        });
    },

    // Load all data sources
    async loadAllData() {
        this.updateLastUpdate();
        this.mostRecentEvent = null; // Reset to find fresh most recent

        // Load all data in parallel
        await Promise.all([
            this.loadWeatherWarnings(),
            this.loadEarthquakes(),
            this.loadVolcanoes(),
            this.loadWeather(),
            this.loadIncidents(),
            this.loadCrime()
        ]);
    },

    // Load weather warnings from MetService
    async loadWeatherWarnings() {
        try {
            const allWarnings = await Feeds.getWeatherWarnings();

            // Filter to only show warnings from the last 24 hours
            const warnings = Array.isArray(allWarnings)
                ? allWarnings.filter(w => this.isWithin24Hours(w.pubDate))
                : [];

            Feeds.renderWeatherWarnings(warnings, 'warnings-content');
            // Add warnings to map
            if (warnings.length > 0) {
                MapManager.addWarnings(warnings);
                // Track most recent warning
                const latest = warnings[0];
                const time = new Date(latest.pubDate || 0);
                this.updateMostRecent({ type: 'warning', data: latest, time });
            }
        } catch (error) {
            console.error('Error loading weather warnings:', error);
            document.getElementById('warnings-content').innerHTML =
                '<div class="error">Failed to load weather warnings</div>';
        }
    },

    // Load earthquake data
    async loadEarthquakes() {
        try {
            const response = await fetch('https://api.geonet.org.nz/quake?MMI=2');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const allQuakes = data.features || [];

            // Filter to only show earthquakes from the last 24 hours
            const quakes = allQuakes.filter(q =>
                this.isWithin24Hours(q.properties?.time)
            );

            GeoNet.renderEarthquakes(quakes, 'earthquake-content');
            MapManager.addEarthquakes(quakes);

            // Track most recent earthquake
            if (quakes.length > 0) {
                const latest = quakes[0]; // Already sorted by time
                const time = new Date(latest.properties?.time || 0);
                this.updateMostRecent({ type: 'earthquake', data: latest, time });
            }
        } catch (error) {
            console.error('Error loading earthquakes:', error);
            const container = document.getElementById('earthquake-content');
            if (container) {
                container.innerHTML = `
                    <div class="error">
                        Failed to load earthquake data<br>
                        <small style="color: #888">${error.message || 'Network error'}</small>
                        <br><a href="https://www.geonet.org.nz/earthquake" target="_blank" style="color: #4ecdc4; font-size: 0.8rem;">View on GeoNet →</a>
                    </div>`;
            }
        }
    },

    // Load volcanic alert data
    async loadVolcanoes() {
        try {
            // Use correct GeoNet endpoint for volcanoes
            const response = await fetch('https://api.geonet.org.nz/volcano/val');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const volcanoes = (data.features || []).map(f => f.properties);
            GeoNet.renderVolcanoes(volcanoes, 'volcano-content');
            MapManager.addVolcanoes(volcanoes);
        } catch (error) {
            console.error('Error loading volcanoes:', error);
            document.getElementById('volcano-content').innerHTML =
                '<div class="error">Failed to load volcanic data</div>';
        }
    },

    // Load weather data
    async loadWeather() {
        try {
            const weatherData = await Weather.getAllCityWeather();
            Weather.renderWeather(weatherData, 'weather-content');
        } catch (error) {
            console.error('Error loading weather:', error);
            document.getElementById('weather-content').innerHTML =
                '<div class="error">Failed to load weather data</div>';
        }
    },

    // Load incident feeds
    async loadIncidents() {
        try {
            const allIncidents = await Feeds.getAllIncidents();

            // Filter to only show incidents from the last 24 hours
            const incidents = Array.isArray(allIncidents)
                ? allIncidents.filter(i => this.isWithin24Hours(i.pubDate))
                : [];

            Feeds.renderIncidents(incidents, 'incidents-content');
            // Add incidents to map
            if (incidents.length > 0) {
                MapManager.addIncidents(incidents);
                // Track most recent incident
                const latest = incidents[0];
                const time = new Date(latest.pubDate || 0);
                this.updateMostRecent({ type: 'incident', data: latest, time });
            }
        } catch (error) {
            console.error('Error loading incidents:', error);
            document.getElementById('incidents-content').innerHTML =
                '<div class="error">Failed to load incident data</div>';
        }
    },

    // Load crime and civil unrest data
    async loadCrime() {
        try {
            const allCrimeItems = await Feeds.getAllCrimeItems();

            // Filter to only show crime from the last 24 hours
            const crimeItems = Array.isArray(allCrimeItems)
                ? allCrimeItems.filter(c => this.isWithin24Hours(c.pubDate))
                : [];

            Feeds.renderCrime(crimeItems, 'crime-content');
            // Add crime to map
            if (crimeItems.length > 0) {
                MapManager.addCrime(crimeItems);
                // Track most recent crime item
                const latest = crimeItems[0];
                const time = new Date(latest.pubDate || 0);
                this.updateMostRecent({ type: 'crime', data: latest, time });
            }
        } catch (error) {
            console.error('Error loading crime data:', error);
            document.getElementById('crime-content').innerHTML =
                '<div class="error">Failed to load crime data</div>';
        }
    },

    // Set up auto-refresh timers
    setupAutoRefresh() {
        // Wrapper to refresh data and update display
        const refreshAndUpdate = async (loadFn) => {
            await loadFn.call(this);
            this.updateLastUpdate();
            // Show screen saver mode (most recent event) if no panel is active
            this.showScreenSaverMode();
        };

        this.timers.warnings = setInterval(
            () => refreshAndUpdate(this.loadWeatherWarnings),
            this.refreshIntervals.warnings
        );

        this.timers.earthquakes = setInterval(
            () => refreshAndUpdate(this.loadEarthquakes),
            this.refreshIntervals.earthquakes
        );

        this.timers.volcanoes = setInterval(
            () => refreshAndUpdate(this.loadVolcanoes),
            this.refreshIntervals.volcanoes
        );

        this.timers.weather = setInterval(
            () => refreshAndUpdate(this.loadWeather),
            this.refreshIntervals.weather
        );

        this.timers.incidents = setInterval(
            () => refreshAndUpdate(this.loadIncidents),
            this.refreshIntervals.incidents
        );

        this.timers.crime = setInterval(
            () => refreshAndUpdate(this.loadCrime),
            this.refreshIntervals.crime
        );

        console.log('Auto-refresh set up: every 5 minutes');
    },

    // Update last update timestamp
    updateLastUpdate() {
        const el = document.getElementById('last-update');
        const now = new Date();
        el.textContent = `Last update: ${now.toLocaleTimeString('en-NZ')}`;
    },

    // Update most recent event if this one is newer
    updateMostRecent(event) {
        if (!this.mostRecentEvent || event.time > this.mostRecentEvent.time) {
            this.mostRecentEvent = event;
        }
    },

    // Show screen saver mode - display only the most recent event
    showScreenSaverMode() {
        const anyActive = document.querySelector('.panel.filter-active');
        if (!anyActive && this.mostRecentEvent) {
            MapManager.showMostRecentEvent(this.mostRecentEvent);
        } else if (!anyActive) {
            MapManager.hideAllLayers();
        }
    }
};

// Global refresh function for button
function refreshAll() {
    const btn = document.getElementById('refresh-btn');
    btn.textContent = 'Refreshing...';
    btn.disabled = true;

    App.loadAllData().then(() => {
        btn.textContent = 'Refresh';
        btn.disabled = false;
        // Show screen saver mode (most recent event) if no panel is active
        App.showScreenSaverMode();
    });
}

// Toggle panel collapse
function setupPanelToggles() {
    // Collapse all panels on init
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.add('collapsed');
    });

    document.querySelectorAll('.panel h3').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking on the count badge
            if (e.target.classList.contains('count')) return;
            const panel = header.closest('.panel');
            panel.classList.toggle('collapsed');
            // Save state to localStorage
            const panelId = panel.id;
            const collapsed = JSON.parse(localStorage.getItem('collapsedPanels') || '{}');
            collapsed[panelId] = panel.classList.contains('collapsed');
            localStorage.setItem('collapsedPanels', JSON.stringify(collapsed));
        });
    });
}

// Donate popup functions
function openDonatePopup() {
    const popup = document.getElementById('donate-popup');
    popup.classList.toggle('active');
}

function closeDonatePopup() {
    document.getElementById('donate-popup').classList.remove('active');
}

// Close popup with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDonatePopup();
    }
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    const popup = document.getElementById('donate-popup');
    const btn = document.getElementById('donate-btn');
    if (popup.classList.contains('active') &&
        !popup.contains(e.target) &&
        e.target !== btn) {
        closeDonatePopup();
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setupPanelToggles();
    App.init();
});
