// Open-Meteo API integration for weather data
const Weather = {
    baseUrl: 'https://api.open-meteo.com/v1',

    // NZ regions (based on district boundaries)
    regions: [
        { name: 'Northland', lat: -35.3, lng: 173.8 },
        { name: 'Auckland', lat: -36.8, lng: 174.6 },
        { name: 'Hauraki Gulf', lat: -36.6, lng: 175.4 },
        { name: 'Waikato', lat: -38.0, lng: 175.3 },
        { name: 'Bay of Plenty', lat: -37.85, lng: 177.2 },
        { name: 'Gisborne', lat: -38.15, lng: 177.9 },
        { name: 'Hawkes Bay', lat: -39.4, lng: 177.0 },
        { name: 'Taranaki', lat: -39.2, lng: 174.1 },
        { name: 'Manawatu-Whanganui', lat: -39.7, lng: 175.6 },
        { name: 'Wellington', lat: -41.05, lng: 175.3 },
        { name: 'Tasman', lat: -41.3, lng: 172.5 },
        { name: 'Nelson', lat: -41.2, lng: 173.3 },
        { name: 'Marlborough', lat: -41.7, lng: 173.9 },
        { name: 'West Coast', lat: -42.9, lng: 170.6 },
        { name: 'Canterbury', lat: -43.5, lng: 171.9 },
        { name: 'Otago', lat: -45.5, lng: 169.6 },
        { name: 'Southland', lat: -46.3, lng: 167.5 }
    ],

    // Weather code descriptions
    weatherCodes: {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm + slight hail',
        99: 'Thunderstorm + heavy hail'
    },

    // Fetch weather for all regions
    async getAllCityWeather() {
        const weatherData = [];

        for (const region of this.regions) {
            try {
                const data = await this.getWeather(region.lat, region.lng);
                if (data) {
                    weatherData.push({
                        region: region.name,
                        lat: region.lat,
                        lng: region.lng,
                        ...data
                    });
                }
            } catch (error) {
                console.error(`Error fetching weather for ${region.name}:`, error);
            }
        }

        return weatherData;
    },

    // Fetch weather for a specific location
    async getWeather(lat, lng) {
        try {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lng,
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code',
                timezone: 'Pacific/Auckland',
                forecast_days: 3
            });

            const target = `${this.baseUrl}/forecast?${params}`;
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(target)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            return {
                current: data.current,
                daily: data.daily
            };
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    },

    // Render weather to sidebar
    renderWeather(weatherData, containerId) {
        const container = document.getElementById(containerId);

        if (!weatherData || weatherData.length === 0) {
            container.innerHTML = '<div class="error">Unable to load weather data</div>';
            return;
        }

        container.innerHTML = weatherData.map(data => {
            const current = data.current;
            const daily = data.daily;

            if (!current) return '';

            const temp = Math.round(current.temperature_2m);
            const feelsLike = Math.round(current.apparent_temperature);
            const weatherCode = current.weather_code;
            const weatherDesc = this.weatherCodes[weatherCode] || 'Unknown';
            const windSpeed = Math.round(current.wind_speed_10m);
            const windGusts = Math.round(current.wind_gusts_10m || 0);
            const humidity = current.relative_humidity_2m;
            const precipitation = current.precipitation;

            // Check for extreme conditions
            const isExtreme = windGusts > 80 || temp > 30 || temp < 0 || precipitation > 10 || weatherCode >= 95;
            const extremeClass = isExtreme ? 'severity-high' : '';

            return `
                <div class="weather-card ${extremeClass}" onclick="MapManager.panTo(${data.lat}, ${data.lng}, 9)">
                    <div class="region">${data.region}</div>
                    <div class="temp">${temp}°C</div>
                    <div class="description">${this.getWeatherIcon(weatherCode)} ${weatherDesc}</div>
                    <div class="conditions">
                        <span>💨${windSpeed}</span>
                        <span>💧${humidity}%</span>
                        ${precipitation > 0 ? `<span>🌧️${precipitation}mm</span>` : ''}
                        ${isExtreme ? '<span style="color: #e53e3e;">⚠️</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Get weather icon based on code
    getWeatherIcon(code) {
        if (code === 0) return '☀️';
        if (code <= 3) return '⛅';
        if (code <= 48) return '🌫️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '🌨️';
        if (code <= 82) return '🌧️';
        if (code <= 86) return '🌨️';
        return '⛈️';
    }
};
