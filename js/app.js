// Main application controller
const App = {
    refreshIntervals: {
        earthquakes: 60000,    // 1 minute
        volcanoes: 300000,     // 5 minutes
        weather: 900000,       // 15 minutes
        warnings: 300000,      // 5 minutes
        incidents: 300000,     // 5 minutes
        crime: 300000          // 5 minutes
    },

    timers: {},

    // Initialize the application
    async init() {
        console.log('Initializing NZ Extreme Weather Dashboard...');

        // Initialize the map
        MapManager.init();

        // Load all data
        await this.loadAllData();

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
                    // Click to toggle - show only this layer
                    heading.addEventListener('click', (e) => {
                        // Don't filter if clicking the collapse arrow area
                        if (e.target.classList.contains('count')) return;

                        // Toggle active state
                        const wasActive = panel.classList.contains('filter-active');

                        // Remove active from all panels
                        document.querySelectorAll('.panel').forEach(p => p.classList.remove('filter-active'));

                        if (wasActive) {
                            // Was active, show all layers
                            MapManager.showAllLayers();
                        } else {
                            // Activate this filter
                            panel.classList.add('filter-active');
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
            const warnings = await Feeds.getWeatherWarnings();
            Feeds.renderWeatherWarnings(warnings, 'warnings-content');
            // Add warnings to map
            if (Array.isArray(warnings)) {
                MapManager.addWarnings(warnings);
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
            const quakes = data.features || [];
            GeoNet.renderEarthquakes(quakes, 'earthquake-content');
            MapManager.addEarthquakes(quakes);
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
            const incidents = await Feeds.getAllIncidents();
            Feeds.renderIncidents(incidents, 'incidents-content');
            // Add incidents to map
            if (Array.isArray(incidents)) {
                MapManager.addIncidents(incidents);
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
            const crimeItems = await Feeds.getAllCrimeItems();
            Feeds.renderCrime(crimeItems, 'crime-content');
            // Add crime to map
            if (Array.isArray(crimeItems)) {
                MapManager.addCrime(crimeItems);
            }
        } catch (error) {
            console.error('Error loading crime data:', error);
            document.getElementById('crime-content').innerHTML =
                '<div class="error">Failed to load crime data</div>';
        }
    },

    // Set up auto-refresh timers
    setupAutoRefresh() {
        this.timers.warnings = setInterval(
            () => this.loadWeatherWarnings(),
            this.refreshIntervals.warnings
        );

        this.timers.earthquakes = setInterval(
            () => this.loadEarthquakes(),
            this.refreshIntervals.earthquakes
        );

        this.timers.volcanoes = setInterval(
            () => this.loadVolcanoes(),
            this.refreshIntervals.volcanoes
        );

        this.timers.weather = setInterval(
            () => this.loadWeather(),
            this.refreshIntervals.weather
        );

        this.timers.incidents = setInterval(
            () => this.loadIncidents(),
            this.refreshIntervals.incidents
        );

        this.timers.crime = setInterval(
            () => this.loadCrime(),
            this.refreshIntervals.crime
        );
    },

    // Update last update timestamp
    updateLastUpdate() {
        const el = document.getElementById('last-update');
        const now = new Date();
        el.textContent = `Last update: ${now.toLocaleTimeString('en-NZ')}`;
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
    });
}

// Toggle panel collapse
function setupPanelToggles() {
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

    // Restore collapsed state from localStorage
    const collapsed = JSON.parse(localStorage.getItem('collapsedPanels') || '{}');
    Object.entries(collapsed).forEach(([panelId, isCollapsed]) => {
        if (isCollapsed) {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('collapsed');
        }
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setupPanelToggles();
    App.init();
});
