
const API_KEY = 'b95ef9df142393e41e4769208f56bddb'; 
// Global Settings
let settings = {
    darkMode: false,
    autoRefresh: false,
    soundEffects: false,
    temperatureUnit: 'C', // C or F
    notifications: true
};

let favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
let comparisonMode = false;
let comparisonData = [];
let autoRefreshInterval;
let recognition;

// Enhanced demo data with extended information


const CITY_SUGGESTIONS = [
    "New York, US", "London, GB", "Tokyo, JP", "Paris, FR", "Sydney, AU",
    "Mumbai, IN", "Cairo, EG", "Rio de Janeiro, BR", "Moscow, RU", "Dubai, AE",
    "Singapore, SG", "Los Angeles, US", "Berlin, DE", "Bangkok, TH", "Toronto, CA"
];

// Initialize app
window.addEventListener('load', function() {
    createDefaultParticles();
    updateCurrentTime();
    loadFavorites();
    setupVoiceRecognition();
    setupAutoComplete();
    setInterval(updateCurrentTime, 1000);
    
    document.getElementById('locationInput').focus();
    
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('weatherSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        applySettings();
    }
});

// Settings Management
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

function toggleDarkMode() {
settings.darkMode = !settings.darkMode;
document.body.classList.toggle('dark-mode');
updateToggleSwitch();
saveSettings();
}

function toggleAutoRefresh() {
settings.autoRefresh = !settings.autoRefresh;
if (settings.autoRefresh) {
autoRefreshInterval = setInterval(() => {
    if (document.getElementById('locationInput').value) {
        getWeather();
    }
}, 300000); // 5 minutes
showNotification('Auto refresh enabled (5min intervals)', 'success');
} else {
clearInterval(autoRefreshInterval);
showNotification('Auto refresh disabled', 'warning');
}
updateToggleSwitch();
saveSettings();
}

function toggleSoundEffects() {
settings.soundEffects = !settings.soundEffects;
updateToggleSwitch();
saveSettings();
if (settings.soundEffects) {
playSound('click');
}
}

function toggleTemperatureUnit() {
settings.temperatureUnit = settings.temperatureUnit === 'C' ? 'F' : 'C';
updateToggleSwitch();
saveSettings();

const weatherResult = document.getElementById('mainResult');
if (weatherResult.innerHTML) {
const currentLocation = document.querySelector('.location-info h3').innerText.split(',')[0];
if(currentLocation) {
        document.getElementById('locationInput').value = currentLocation;
        getWeather();
}
}
}

function toggleNotifications() {
settings.notifications = !settings.notifications;
updateToggleSwitch();
saveSettings();
}

function updateToggleSwitch() {
const switches = document.querySelectorAll('.settings-panel .toggle-switch');
const settingsKeys = Object.keys(settings);

switches.forEach((sw, index) => {
const key = settingsKeys[index];
let isActive;

if (key === 'temperatureUnit') {
    isActive = settings.temperatureUnit === 'F';
} else {
    isActive = settings[key];
}

sw.classList.toggle('active', isActive);
});
}

function saveSettings() {
    localStorage.setItem('weatherSettings', JSON.stringify(settings));
}

function applySettings() {
    if (settings.darkMode) document.body.classList.add('dark-mode');
    updateToggleSwitch();
}

// Time and Date
function updateCurrentTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentTime').textContent = now.toLocaleDateString('en-US', options);
}

// Voice Recognition
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            document.getElementById('voiceBtn').classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('locationInput').value = transcript;
            getWeather();
        };

        recognition.onend = () => {
            document.getElementById('voiceBtn').classList.remove('listening');
        };

        recognition.onerror = () => {
            showNotification('Voice recognition error. Please try again.', 'error');
        };

        document.getElementById('voiceBtn').addEventListener('click', () => {
            recognition.start();
        });
    } else {
        document.getElementById('voiceBtn').style.display = 'none';
    }
}

// Auto-complete functionality
function setupAutoComplete() {
    const input = document.getElementById('locationInput');
    const suggestionList = document.getElementById('suggestionList');

    input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        if (value.length < 2) {
            suggestionList.style.display = 'none';
            return;
        }

        const matches = CITY_SUGGESTIONS.filter(city => 
            city.toLowerCase().includes(value)
        ).slice(0, 5);

        if (matches.length > 0) {
            suggestionList.innerHTML = matches.map(city => 
                `<div class="suggestion-item" onclick="selectSuggestion('${city}')">${city}</div>`
            ).join('');
            suggestionList.style.display = 'block';
        } else {
            suggestionList.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionList.style.display = 'none';
        }
    });
}

function selectSuggestion(city) {
    document.getElementById('locationInput').value = city;
    document.getElementById('suggestionList').style.display = 'none';
    getWeather();
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('locationInput').value = `${lat}, ${lon}`;
                getWeather();
            },
            (error) => {
                showNotification('Location access denied. Please enter manually.', 'error');
            }
        );
    } else {
        showNotification('Geolocation not supported by this browser.', 'error');
    }
}

// Favorites Management
function loadFavorites() {
    const container = document.getElementById('favoriteCities');
    container.innerHTML = favorites.map(city => 
        `<div class="favorite-city" onclick="loadFavorite('${city}')">
            ${city}
            <span class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${city}')">×</span>
        </div>`
    ).join('');
}

function addToFavorites(cityName) {
    if (!favorites.includes(cityName) && favorites.length < 10) {
        favorites.push(cityName);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        loadFavorites();
        showNotification(`${cityName} added to favorites!`, 'success');
    }
}

function removeFavorite(cityName) {
    favorites = favorites.filter(city => city !== cityName);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();
    showNotification(`${cityName} removed from favorites`, 'warning');
}

function loadFavorite(cityName) {
    document.getElementById('locationInput').value = cityName;
    getWeather();
}

// Comparison Mode
function toggleComparison() {
    comparisonMode = !comparisonMode;
    const mainResult = document.getElementById('mainResult');
    const comparisonResult = document.getElementById('comparisonResult');
    
    if (comparisonMode) {
        mainResult.style.display = 'none';
        comparisonResult.classList.add('active');
        showNotification('Comparison mode enabled. Search for cities to compare!', 'success');
    } else {
        mainResult.style.display = 'grid';
        comparisonResult.classList.remove('active');
        comparisonData = [];
        showNotification('Comparison mode disabled', 'warning');
    }
}

// Export and Share
function exportData(format) {
    const weatherData = getCurrentWeatherData();
    if (!weatherData) {
        showNotification('No weather data to export', 'error');
        return;
    }

    if (format === 'json') {
        const dataStr = JSON.stringify(weatherData, null, 2);
        downloadFile(`weather-data-${weatherData.name}.json`, dataStr, 'application/json');
    } else if (format === 'csv') {
        const csvData = convertToCSV(weatherData);
        downloadFile(`weather-data-${weatherData.name}.csv`, csvData, 'text/csv');
    }
}

function shareWeather() {
    const weatherData = getCurrentWeatherData();
    if (!weatherData) {
        showNotification('No weather data to share', 'error');
        return;
    }

    const shareText = `🌤️ Weather in ${weatherData.name}: ${Math.round(weatherData.main.temp)}°${settings.temperatureUnit} - ${weatherData.weather[0].description}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Weather Update',
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Weather info copied to clipboard!', 'success');
        });
    }
}

// Utility Functions
function convertTemperature(celsius) {
    if (settings.temperatureUnit === 'F') {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`${filename} downloaded successfully!`, 'success');
}

function convertToCSV(data) {
    const headers = ['Location', 'Temperature', 'Feels Like', 'Humidity', 'Pressure', 'Wind Speed', 'Visibility'];
    const row = [
        `${data.name}, ${data.country}`,
        `${convertTemperature(data.main.temp)}°${settings.temperatureUnit}`,
        `${convertTemperature(data.main.feels_like)}°${settings.temperatureUnit}`,
        `${data.main.humidity}%`,
        `${data.main.pressure} hPa`,
        `${data.wind.speed} m/s`,
        `${(data.visibility / 1000).toFixed(1)} km`
    ];
    
    return [headers.join(','), row.join(',')].join('\n');
}

function getCurrentWeatherData() {
    // Return current weather data from display
    return window.currentWeatherData || null;
}

function playSound(type) {
    if (!settings.soundEffects) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = {
        click: 800,
        success: 600,
        error: 300,
        notification: 1000
    };
    
    oscillator.frequency.value = frequencies[type] || 500;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function showNotification(message, type = 'success') {
    if (!settings.notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
    
    playSound(type);
}

// Weather Background Functions
function getWeatherBackground(condition, isDay = true) {
    const backgrounds = {
        'clear': {
            // day: 'linear-gradient(135deg, #87CEEB 0%, #98D8E8 30%, #F0E68C 70%, #FFD700 100%)',
            day: 'linear-gradient(135deg, #87CEEB, #00BFFF)',
            night: 'linear-gradient(135deg, #0F0F23 0%, #1a1a2e 30%, #16213e 70%, #0f3460 100%)'
        },
        'clouds': {
            day: 'linear-gradient(135deg, #BDC3C7 0%, #2C3E50 100%)',
            night: 'linear-gradient(135deg, #2C3E50 0%, #34495E 30%, #566573 100%)'
        },
        'rain': {
            day: 'linear-gradient(135deg, #4A90E2 0%, #7B68EE 30%, #5F9EA0 70%, #4682B4 100%)',
            night: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)'
        },
        'snow': {
            day: 'linear-gradient(135deg, #E6E6FA 0%, #B0C4DE 30%, #F0F8FF 70%, #FFFFFF 100%)',
            night: 'linear-gradient(135deg, #2C3E50 0%, #4A6572 30%, #B0BEC5 70%, #ECEFF1 100%)'
        },
        'thunderstorm': {
            day: 'linear-gradient(135deg, #373B44 0%, #4286f4 30%, #373B44 70%, #000000 100%)',
            night: 'linear-gradient(135deg, #000000 0%, #2C1810 30%, #8B4513 70%, #000000 100%)'
        },
        'mist': {
            day: 'linear-gradient(135deg, #D3CCE3 0%, #E9EBF0 30%, #F5F7FA 70%, #C3CFE2 100%)',
            night: 'linear-gradient(135deg, #2C3E50 0%, #34495E 30%, #566573 70%, #7F8C8D 100%)'
        }
    };
    
    const weatherType = condition.toLowerCase();
    return backgrounds[weatherType] || backgrounds['clear'];
}

function updateWeatherBackground(weatherCondition) {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour <= 18;
    const backgroundData = getWeatherBackground(weatherCondition, isDay);
    const background = isDay ? backgroundData.day : backgroundData.night;
    
    document.body.style.background = background;
    updateParticleEffects(weatherCondition);
}

function updateParticleEffects(condition) {
    const particles = document.getElementById('particles');
    particles.innerHTML = '';
    
    switch(condition.toLowerCase()) {
        case 'rain':
        case 'drizzle':
            createRainDrops();
            break;
        case 'snow':
            createSnowflakes();
            break;
        case 'clear':
            createSunBeams();
            break;
        case 'thunderstorm':
            createLightning();
            break;
        default:
            createDefaultParticles();
    }
}

function createRainDrops() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            width: 2px;
            height: ${Math.random() * 20 + 10}px;
            background: linear-gradient(transparent, #4A90E2);
            border-radius: 0 0 50% 50%;
            animation: rainFall ${Math.random() * 0.5 + 0.5}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        particles.appendChild(drop);
    }
}

function createSnowflakes() {
    const particles = document.getElementById('particles');
    const snowflakeSymbols = ['❄', '❅', '❆'];
    for (let i = 0; i < 50; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.innerHTML = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
        flake.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            color: white;
            font-size: ${Math.random() * 10 + 10}px;
            animation: snowFall ${Math.random() * 3 + 3}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        particles.appendChild(flake);
    }
}

function createSunBeams() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 20; i++) {
        const beam = document.createElement('div');
        beam.className = 'sunbeam';
        beam.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: 2px;
            height: ${Math.random() * 50 + 20}px;
            background: linear-gradient(transparent, rgba(255, 215, 0, 0.5), transparent);
            transform: rotate(${Math.random() * 360}deg);
            animation: sunbeamFloat ${Math.random() * 4 + 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        particles.appendChild(beam);
    }
}

function createLightning() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 5; i++) {
        const lightning = document.createElement('div');
        lightning.className = 'lightning';
        lightning.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: 0;
            width: 3px;
            height: 100vh;
            background: linear-gradient(to bottom, transparent, #FFFF00, #FFFFFF, transparent);
            animation: lightningFlash ${Math.random() * 2 + 1}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        particles.appendChild(lightning);
    }
}

function createDefaultParticles() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            width: ${Math.random() * 5 + 2}px;
            height: ${Math.random() * 5 + 2}px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            animation: floatParticle ${Math.random() * 10 + 10}s infinite linear;
            animation-delay: ${Math.random() * 15}s;
        `;
        particles.appendChild(particle);
    }
}

// Main Weather Function
// Main Weather Function (MODIFIED TO HANDLE COORDINATES)
async function getWeather() {
const location = document.getElementById('locationInput').value.trim();
const resultDiv = comparisonMode ? document.getElementById('comparisonResult') : document.getElementById('mainResult');
const loadingDiv = document.getElementById('loading');
const fetchBtn = document.getElementById('fetchBtn');

if (!location) {
    showNotification('Please enter a location to discover the weather', 'error');
    return;
}

loadingDiv.style.display = 'block';
fetchBtn.disabled = true;
if (!comparisonMode) {
    resultDiv.innerHTML = '';
}

try {
    let apiUrl = '';
    // NEW: Check if the input looks like coordinates (e.g., "31.3, 75.5")
    if (/^-?[\d.]+, ?-?[\d.]+$/.test(location)) {
        const [lat, lon] = location.split(',');
        apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.trim()}&lon=${lon.trim()}&appid=${API_KEY}&units=metric`;
    } else {
        // This is the original logic for city names
        apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric`;
    }

    // 1. Fetch current weather using the correct URL
    const currentResponse = await fetch(apiUrl);
    if (!currentResponse.ok) {
        throw new Error(`Could not find location: ${location}`);
    }
    const currentData = await currentResponse.json();
    
    const { lat, lon } = currentData.coord;

    // 2. Fetch forecast and air quality data (this part remains the same)
    const [forecastResponse, airQualityResponse] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    ]);

    const forecastData = await forecastResponse.json();
    const airQualityData = await airQualityResponse.json();

    // 3. Transform and display data (this part remains the same)
    const weatherData = transformApiData(currentData, forecastData, airQualityData);
    
    window.currentWeatherData = weatherData;

    if (comparisonMode) {
        if (comparisonData.length < 2) {
            comparisonData.push(weatherData);
            displayComparison();
        } else {
            showNotification('Maximum 2 cities for comparison.', 'warning');
        }
    } else {
        displayWeather(weatherData);
        updateWeatherBackground(weatherData.weather[0].main);
    }
    playSound('success');

} catch (error) {
    console.error('Weather API Error:', error);
    showError(error.message); 
    playSound('error');
} finally {
    loadingDiv.style.display = 'none';
    fetchBtn.disabled = false;
}
}
function transformApiData(current, forecast, air) {
// Helper to get the next 3 unique forecast days
const dailyForecasts = [];
const forecastDays = new Set();
for (const item of forecast.list) {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
    if (!forecastDays.has(day) && forecastDays.size < 3) {
        forecastDays.add(day);
        dailyForecasts.push({
            day: day,
            icon: getWeatherIcon(item.weather[0].id),
            temp_max: item.main.temp_max,
            temp_min: item.main.temp_min,
            desc: item.weather[0].description
        });
    }
}

// Helper to map AQI index to a level string
const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
const airQuality = {
    aqi: air.list[0].main.aqi,
    level: aqiLevels[air.list[0].main.aqi - 1] || 'Unknown',
    pm25: air.list[0].components.pm2_5,
    pm10: air.list[0].components.pm10,
    no2: air.list[0].components.no2,
    o3: air.list[0].components.o3,
};

// Return the final, combined data object
return {
    name: current.name,
    country: current.sys.country,
    coord: current.coord,
    weather: [{
        main: current.weather[0].main,
        description: current.weather[0].description,
        icon: getWeatherIcon(current.weather[0].id)
    }],
    main: current.main,
    wind: current.wind,
    clouds: current.clouds,
    visibility: current.visibility,
    dt: current.dt,
    forecast: dailyForecasts,
    airQuality: airQuality
};
}

function getWeatherIcon(weatherId) {
if (weatherId >= 200 && weatherId <= 232) return '⛈️';
if (weatherId >= 300 && weatherId <= 321) return '🌦️';
if (weatherId >= 500 && weatherId <= 531) return '🌧️';
if (weatherId >= 600 && weatherId <= 622) return '❄️';
if (weatherId >= 701 && weatherId <= 781) return '🌫️';
if (weatherId === 800) return '☀️';
if (weatherId === 801) return '🌤️';
if (weatherId >= 802 && weatherId <= 804) return '☁️';
return '🌍'; // Default
}

function getWeatherAnimation(condition) {
    switch(condition.toLowerCase()) {
        case 'clear': return 'sunny';
        case 'clouds': return 'cloudy';
        case 'rain': return 'rainy';
        default: return 'cloudy';
    }
}

function displayWeather(data) {
    const resultDiv = document.getElementById('mainResult');
    const animationClass = getWeatherAnimation(data.weather[0].main);
    
    const weatherHtml = `
        <div class="main-weather">
            <div class="weather-header">
                <div class="location-info">
                    <h3>${data.name}, ${data.country}</h3>
                    <p>📍 ${data.coord.lat}°, ${data.coord.lon}°</p>
                    <div class="weather-icon ${animationClass}">${data.weather[0].icon}</div>
                    <p>🌤️ ${data.weather[0].description}</p>
                </div>
                <div class="temperature">
                    ${convertTemperature(data.main.temp)}°${settings.temperatureUnit}
                </div>
            </div>
            
            <div class="weather-details">
                <div class="detail-card">
                    <h4>🌡️ Feels Like</h4>
                    <div class="value">${convertTemperature(data.main.feels_like)}°${settings.temperatureUnit}</div>
                </div>
                <div class="detail-card">
                    <h4>📊 Min/Max</h4>
                    <div class="value">${convertTemperature(data.main.temp_min)}° / ${convertTemperature(data.main.temp_max)}°</div>
                </div>
                <div class="detail-card">
                    <h4>💧 Humidity</h4>
                    <div class="value">${data.main.humidity}%</div>
                </div>
                <div class="detail-card">
                    <h4>🌪️ Pressure</h4>
                    <div class="value">${data.main.pressure} hPa</div>
                </div>
                <div class="detail-card">
                    <h4>💨 Wind Speed</h4>
                    <div class="value">${data.wind.speed} m/s</div>
                </div>
                <div class="detail-card">
                    <h4>🧭 Wind Direction</h4>
                    <div class="value">${data.wind.deg}°</div>
                </div>
                <div class="detail-card">
                    <h4>☁️ Clouds</h4>
                    <div class="value">${data.clouds.all}%</div>
                </div>
                <div class="detail-card">
                    <h4>👁️ Visibility</h4>
                    <div class="value">${(data.visibility / 1000).toFixed(1)} km</div>
                </div>
            </div>
        </div>
        
        <div class="side-panel">
            <div class="weather-summary">
                <h3 style="color: white; margin-bottom: 15px;">📈 Weather Summary</h3>
                <div class="air-quality-indicator">
                    <span>Overall Condition:</span>
                    <span class="aqi-level aqi-${data.airQuality.level.toLowerCase()}">${data.weather[0].main}</span>
                </div>
                <div class="air-quality-indicator">
                    <span>UV Index:</span>
                    <span style="color: #FFA500;">Moderate (${Math.floor(Math.random() * 5 + 3)})</span>
                </div>
                <div class="air-quality-indicator">
                    <span>Sunrise:</span>
                    <span style="color: #FFD700;">06:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}</span>
                </div>
                <div class="air-quality-indicator">
                    <span>Sunset:</span>
                    <span style="color: #FF6347;">19:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}</span>
                </div>
            </div>
            
            <div class="air-quality">
                <h3 style="color: white; margin-bottom: 15px;">🌬️ Air Quality</h3>
                <div class="air-quality-indicator">
                    <span>AQI Level:</span>
                    <span class="aqi-level aqi-${data.airQuality.level.toLowerCase()}">${data.airQuality.level}</span>
                </div>
                <div class="air-quality-indicator">
                    <span>PM2.5:</span>
                    <span style="color: white;">${data.airQuality.pm25} μg/m³</span>
                </div>
                <div class="air-quality-indicator">
                    <span>PM10:</span>
                    <span style="color: white;">${data.airQuality.pm10} μg/m³</span>
                </div>
                <div class="air-quality-indicator">
                    <span>NO₂:</span>
                    <span style="color: white;">${data.airQuality.no2} μg/m³</span>
                </div>
                <div class="air-quality-indicator">
                    <span>O₃:</span>
                    <span style="color: white;">${data.airQuality.o3} μg/m³</span>
                </div>
            </div>
            
            <div class="forecast-scroll">
                <h3 style="color: white; margin-bottom: 15px;">📅 3-Day Forecast</h3>
                ${data.forecast.map(day => `
                    <div class="forecast-item">
                        <div>
                            <div style="font-weight: 600;">${day.day}</div>
                            <div style="font-size: 0.9em; opacity: 0.8;">${day.desc}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5em;">${day.icon}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600;">${convertTemperature(day.temp_max)}°/${convertTemperature(day.temp_min)}°</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = weatherHtml;
    showNotification(`Weather data loaded for ${data.name}!`, 'success');
}

function displayComparison() {
    const resultDiv = document.getElementById('comparisonResult');
    
    if (comparisonData.length === 0) {
        resultDiv.innerHTML = '<p style="color: white; text-align: center; padding: 40px;">No cities to compare. Search for locations to add them.</p>';
        return;
    }
    
    const comparisonHtml = comparisonData.map((data, index) => `
        <div class="main-weather">
            <div style="position: absolute; top: 10px; right: 10px;">
                <button class="btn btn-secondary" onclick="removeFromComparison(${index})" style="padding: 8px 12px; font-size: 12px;">✕</button>
            </div>
            <div class="weather-header">
                <div class="location-info">
                    <h3>${data.name}, ${data.country}</h3>
                    <p>📍 ${data.coord.lat}°, ${data.coord.lon}°</p>
                    <div class="weather-icon ${getWeatherAnimation(data.weather[0].main)}">${data.weather[0].icon}</div>
                    <p>🌤️ ${data.weather[0].description}</p>
                </div>
                <div class="temperature">
                    ${convertTemperature(data.main.temp)}°${settings.temperatureUnit}
                </div>
            </div>
            
            <div class="weather-details">
                <div class="detail-card">
                    <h4>🌡️ Feels Like</h4>
                    <div class="value">${convertTemperature(data.main.feels_like)}°${settings.temperatureUnit}</div>
                </div>
                <div class="detail-card">
                    <h4>💧 Humidity</h4>
                    <div class="value">${data.main.humidity}%</div>
                </div>
                <div class="detail-card">
                    <h4>💨 Wind</h4>
                    <div class="value">${data.wind.speed} m/s</div>
                </div>
                <div class="detail-card">
                    <h4>☁️ Clouds</h4>
                    <div class="value">${data.clouds.all}%</div>
                </div>
                <div class="detail-card">
                    <h4>🌬️ AQI</h4>
                    <div class="value">${data.airQuality.level}</div>
                </div>
                <div class="detail-card">
                    <h4>👁️ Visibility</h4>
                    <div class="value">${(data.visibility / 1000).toFixed(1)} km</div>
                </div>
            </div>
        </div>
    `).join('');
    
    resultDiv.innerHTML = comparisonHtml;
    
    if (comparisonData.length === 2) {
        showNotification('Comparison complete! You can now see the difference between cities.', 'success');
    }
}

function removeFromComparison(index) {
    comparisonData.splice(index, 1);
    displayComparison();
    showNotification('City removed from comparison', 'warning');
}

function showError(message) {
    const resultDiv = comparisonMode ? document.getElementById('comparisonResult') : document.getElementById('mainResult');
    resultDiv.innerHTML = `<div class="error">❌ ${message}</div>`;
    showNotification(message, 'error');
}

// Enhanced event listeners
document.getElementById('locationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeather();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('locationInput').focus();
    } else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (document.getElementById('locationInput').value) {
            getWeather();
        }
    } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        toggleComparison();
    } else if (e.key === 'Escape') {
        document.getElementById('suggestionList').style.display = 'none';
        document.getElementById('settingsPanel').classList.remove('active');
    }
});

// Auto-save location on successful search
let lastSearchedLocation = '';
function saveLastLocation(location) {
    lastSearchedLocation = location;
    localStorage.setItem('lastWeatherLocation', location);
}

// Load last location on startup
window.addEventListener('load', function() {
    const lastLocation = localStorage.getItem('lastWeatherLocation');
    if (lastLocation) {
        document.getElementById('locationInput').value = lastLocation;
    }
});

// Weather alerts simulation
function checkWeatherAlerts(data) {
    const alerts = [];
    
    if (data.main.temp > 35) {
        alerts.push('🔥 Heat Warning: Extremely high temperature detected!');
    } else if (data.main.temp < -10) {
        alerts.push('🥶 Freeze Warning: Extremely low temperature detected!');
    }
    
    if (data.wind.speed > 15) {
        alerts.push('💨 High Wind Warning: Strong winds detected!');
    }
    
    if (data.main.humidity < 20) {
        alerts.push('🏜️ Dry Air Advisory: Very low humidity levels!');
    }
    
    if (data.airQuality.aqi > 3) {
        alerts.push('⚠️ Air Quality Alert: Unhealthy air quality levels!');
    }
    
    alerts.forEach(alert => {
        setTimeout(() => showNotification(alert, 'warning'), Math.random() * 3000 + 2000);
    });
}

// Add weather alerts to the main weather function
const originalDisplayWeather = displayWeather;
displayWeather = function(data) {
    originalDisplayWeather(data);
    checkWeatherAlerts(data);
    saveLastLocation(data.name);
};

// Progressive Web App features
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;
    showNotification('This app can be installed on your device!', 'success');
});

// Service Worker registration (for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('SW registered'))
            .catch(() => console.log('SW registration failed'));
    });
}

// Analytics and usage tracking (privacy-friendly)
function trackUsage(action, details = {}) {
    const usage = JSON.parse(localStorage.getItem('weatherAppUsage') || '{}');
    const today = new Date().toDateString();
    
    if (!usage[today]) usage[today] = {};
    if (!usage[today][action]) usage[today][action] = 0;
    
    usage[today][action]++;
    localStorage.setItem('weatherAppUsage', JSON.stringify(usage));
}

// Enhanced weather function with tracking
const originalGetWeather = getWeather;
getWeather = function() {
    trackUsage('weather_search');
    return originalGetWeather();
};

// Initialize enhanced features
function initializeEnhancedFeatures() {
    // Add keyboard shortcut hints
    const helpText = document.createElement('div');
    helpText.innerHTML = `
        <div style="position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 10px; font-size: 12px; z-index: 1000; display: none;" id="helpText">
            <strong>Keyboard Shortcuts:</strong><br>
            Ctrl+F: Focus search<br>
            Ctrl+R: Refresh weather<br>
            Ctrl+C: Toggle comparison<br>
            Esc: Close panels
        </div>
    `;
    document.body.appendChild(helpText);

    // Show help on long press
    let helpTimer;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            document.getElementById('helpText').style.display = 'block';
            setTimeout(() => {
                document.getElementById('helpText').style.display = 'none';
            }, 5000);
        }
    });
}

// Call initialization
window.addEventListener('load', initializeEnhancedFeatures);

// Network status monitoring
window.addEventListener('online', () => {
    showNotification('Internet connection restored!', 'success');
});

window.addEventListener('offline', () => {
    showNotification('You are now offline. Some features may not work.', 'warning');
});

// Performance monitoring
window.addEventListener('load', () => {
    if (window.performance) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`App loaded in ${loadTime}ms`);
        
        if (loadTime > 3000) {
            showNotification('App took longer to load. Check your connection.', 'warning');
        }
    }
});

// Memory cleanup
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});

// Additional utility functions
function clearAllData() {
    if (confirm('Are you sure you want to clear all app data?')) {
        localStorage.clear();
        location.reload();
    }
}

function showAppInfo() {
    const info = `
        🌤️ Advanced Weather API v2.0
        
        Features:
        • Real-time weather data
        • Voice search capability
        • City comparison tools
        • Air quality monitoring
        • 3-day forecasting
        • Export functionality
        • Dark mode support
        • Auto-refresh options
        • Favorite locations
        • Weather alerts
        • Keyboard shortcuts
        • Progressive Web App
        
        Made with ❤️ using modern web technologies
    `;
    
    alert(info);
}

// Easter egg - Konami code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.code);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        showNotification('🎉 Easter egg activated! Enjoy the rainbow mode!', 'success');
        document.body.style.animation = 'rainbow 2s infinite';
        
        setTimeout(() => {
            document.body.style.animation = '';
        }, 10000);
    }
});

// Add rainbow animation for easter egg
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(style);