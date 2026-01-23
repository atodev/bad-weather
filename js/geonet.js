// GeoNet API integration for earthquakes and volcanic alerts
const GeoNet = {
    baseUrl: 'https://api.geonet.org.nz',

    // Fetch recent earthquakes
    async getEarthquakes(mmi = 2) {
        try {
            const url = `${this.baseUrl}/quake?MMI=${mmi}`;
            console.log('Fetching earthquakes from:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('Earthquake data received:', data.features?.length || 0, 'quakes');
            return data.features || [];
        } catch (error) {
            console.error('Error fetching earthquakes:', error.message);
            throw error; // Re-throw so caller knows it failed
        }
    },

    // Fetch volcanic alert levels
    async getVolcanicAlerts() {
        try {
            const response = await fetch(`${this.baseUrl}/volcano/val`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.features || [];
        } catch (error) {
            console.error('Error fetching volcanic alerts:', error);
            return [];
        }
    },

    // Fetch quakes near a specific volcano
    async getVolcanoQuakes(volcanoId) {
        try {
            const response = await fetch(`${this.baseUrl}/volcano/quake/${volcanoId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.features || [];
        } catch (error) {
            console.error(`Error fetching quakes for ${volcanoId}:`, error);
            return [];
        }
    },

    // Render earthquakes to sidebar
    renderEarthquakes(quakes, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('quake-count');

        if (!quakes || quakes.length === 0) {
            container.innerHTML = '<div class="error">No recent earthquakes found</div>';
            countEl.textContent = '0';
            return;
        }

        // Sort by time (most recent first)
        quakes.sort((a, b) => new Date(b.properties.time) - new Date(a.properties.time));

        countEl.textContent = quakes.length;

        container.innerHTML = quakes.slice(0, 20).map(quake => {
            const props = quake.properties || {};
            const coords = quake.geometry?.coordinates || [0, 0, 0];
            const magnitude = props.magnitude ?? 0;
            const depth = coords[2] ?? 0;
            const time = this.formatTime(props.time);

            // Determine severity
            let severity = 'low';
            if (magnitude >= 5) severity = 'high';
            else if (magnitude >= 4) severity = 'medium';

            const magDisplay = typeof magnitude === 'number' ? magnitude.toFixed(1) : '?';
            const depthDisplay = typeof depth === 'number' ? depth.toFixed(0) : '?';

            return `
                <div class="alert-item severity-${severity}"
                     onclick="MapManager.panTo(${coords[1]}, ${coords[0]}, 10)">
                    <div class="title">M${magDisplay} - ${props.locality || 'New Zealand'}</div>
                    <div class="meta">
                        <span>Depth: ${depthDisplay} km</span>
                        <span>${time}</span>
                    </div>
                    ${props.mmi ? `<div class="description">Felt intensity: MMI ${props.mmi}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    // Render volcanic alerts to sidebar
    renderVolcanoes(volcanoes, containerId) {
        const container = document.getElementById(containerId);

        if (!volcanoes || volcanoes.length === 0) {
            container.innerHTML = '<div class="error">No volcanic data available</div>';
            return;
        }

        // Sort by alert level (highest first)
        volcanoes.sort((a, b) => b.level - a.level);

        container.innerHTML = volcanoes.map(volcano => {
            const level = volcano.level;
            const levelText = this.getVolcanicLevelText(level);

            return `
                <div class="volcano-card">
                    <div class="name">${volcano.volcanoTitle}</div>
                    <div class="level level-${level}" title="${levelText}">
                        Level ${level}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Get volcanic alert level description
    getVolcanicLevelText(level) {
        const levels = {
            0: 'No volcanic unrest',
            1: 'Minor volcanic unrest',
            2: 'Moderate to heightened volcanic unrest',
            3: 'Minor volcanic eruption',
            4: 'Moderate volcanic eruption',
            5: 'Major volcanic eruption'
        };
        return levels[level] || 'Unknown';
    },

    // Format time relative
    formatTime(isoTime) {
        const date = new Date(isoTime);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'short'
        });
    }
};
