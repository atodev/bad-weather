// Open-Meteo API integration for weather data
const Weather = {
    baseUrl: 'https://api.open-meteo.com/v1',

    // NZ major cities
    cities: [
        { name: 'Auckland', lat: -36.85, lng: 174.76 },
        { name: 'Wellington', lat: -41.29, lng: 174.78 },
        { name: 'Christchurch', lat: -43.53, lng: 172.64 },
        { name: 'Queenstown', lat: -45.03, lng: 168.66 }
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

    // Fetch weather for all cities
    async getAllCityWeather() {
        const weatherData = [];

        for (const city of this.cities) {
            try {
                const data = await this.getWeather(city.lat, city.lng);
                if (data) {
                    weatherData.push({
                        city: city.name,
                        lat: city.lat,
                        lng: city.lng,
                        ...data
                    });
                }
            } catch (error) {
                console.error(`Error fetching weather for ${city.name}:`, error);
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

            const response = await fetch(`${this.baseUrl}/forecast?${params}`);
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
                <div class="weather-card ${extremeClass}" onclick="MapManager.panTo(${data.lat}, ${data.lng}, 10)">
                    <div class="city">${data.city}</div>
                    <div class="temp">${temp}°C</div>
                    <div class="description" style="color: #aaa; font-size: 0.9rem;">${weatherDesc}</div>
                    <div class="conditions">
                        <div class="condition">
                            <span>💨</span>
                            <span>${windSpeed} km/h${windGusts > windSpeed + 10 ? ` (gusts ${windGusts})` : ''}</span>
                        </div>
                        <div class="condition">
                            <span>💧</span>
                            <span>${humidity}%</span>
                        </div>
                        ${precipitation > 0 ? `
                        <div class="condition">
                            <span>🌧️</span>
                            <span>${precipitation}mm</span>
                        </div>
                        ` : ''}
                    </div>
                    ${isExtreme ? '<div style="color: #ff6b6b; font-size: 0.75rem; margin-top: 0.5rem;">⚠️ Extreme conditions</div>' : ''}
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
