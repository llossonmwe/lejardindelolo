// 🌤️ Module Météo — Open-Meteo API (gratuit, sans clé)
(() => {
  'use strict';

  const STORAGE_KEY = 'jardin-weather-loc';
  let weatherData = null;
  let locationData = null;

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        locationData = JSON.parse(saved);
        fetchAndRender();
      } catch (_) { showSetup(); }
    } else {
      showSetup();
    }
    wireEvents();
  }

  function wireEvents() {
    document.getElementById('weather-geolocate').addEventListener('click', geolocate);
    document.getElementById('weather-city-go').addEventListener('click', () => {
      const city = document.getElementById('weather-city').value.trim();
      if (city) searchCity(city);
    });
    document.getElementById('weather-city').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const city = e.target.value.trim();
        if (city) searchCity(city);
      }
    });
    document.getElementById('weather-change-loc').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      locationData = null;
      weatherData = null;
      showSetup();
    });
  }

  function showSetup() {
    document.getElementById('weather-setup').classList.remove('hidden');
    document.getElementById('weather-content').classList.add('hidden');
  }

  function showContent() {
    document.getElementById('weather-setup').classList.add('hidden');
    document.getElementById('weather-content').classList.remove('hidden');
  }

  async function geolocate() {
    if (!navigator.geolocation) {
      APP.toast('Géolocalisation non supportée par ce navigateur');
      return;
    }
    APP.toast('Localisation en cours...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        locationData = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Ma position' };
        // Reverse geocode to get city name
        try {
          const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${locationData.lat}&longitude=${locationData.lng}&count=1&language=fr`);
          // Fallback: use coordinates
        } catch (_) {}
        localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData));
        fetchAndRender();
      },
      (err) => {
        APP.toast('Impossible d\'obtenir la position : ' + err.message);
      },
      { timeout: 10000 }
    );
  }

  async function searchCity(cityName) {
    try {
      APP.toast('Recherche de la ville...');
      const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=fr`);
      const data = await resp.json();
      if (!data.results || data.results.length === 0) {
        APP.toast('Ville non trouvée');
        return;
      }
      const city = data.results[0];
      locationData = { lat: city.latitude, lng: city.longitude, name: city.name + (city.admin1 ? ', ' + city.admin1 : '') };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData));
      fetchAndRender();
    } catch (err) {
      APP.toast('Erreur de recherche : ' + err.message);
    }
  }

  async function fetchAndRender() {
    if (!locationData) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${locationData.lat}&longitude=${locationData.lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('API indisponible');
      weatherData = await resp.json();
      showContent();
      renderWeather();
    } catch (err) {
      document.getElementById('weather-current').innerHTML = `<p class="empty">Météo indisponible (${APP.esc(err.message)})</p>`;
      showContent();
    }
  }

  function wmoToFrench(code) {
    const map = {
      0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux', 3: 'Couvert',
      45: 'Brouillard', 48: 'Brouillard givrant',
      51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
      56: 'Bruine verglaçante', 57: 'Bruine verglaçante forte',
      61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
      66: 'Pluie verglaçante', 67: 'Pluie verglaçante forte',
      71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
      77: 'Grains de neige',
      80: 'Averses légères', 81: 'Averses modérées', 82: 'Averses violentes',
      85: 'Averses de neige légères', 86: 'Averses de neige fortes',
      95: 'Orage', 96: 'Orage avec grêle légère', 99: 'Orage avec grêle forte'
    };
    return map[code] || 'Inconnu';
  }

  function wmoToEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '⛅';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌦️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    return '⛈️';
  }

  function generateAdvice() {
    if (!weatherData || !weatherData.daily) return [];
    const tips = [];
    const daily = weatherData.daily;
    const current = weatherData.current;

    const rainTomorrow = daily.precipitation_sum[1] || 0;
    const rainDay2 = daily.precipitation_sum[2] || 0;
    const rainToday = daily.precipitation_sum[0] || 0;
    const maxTempToday = daily.temperature_2m_max[0] || 0;
    const probRainTomorrow = daily.precipitation_probability_max[1] || 0;

    // Rain-based advice
    if (rainTomorrow > 5) {
      tips.push({ icon: '🌧️', text: `Pluie prévue demain (${rainTomorrow.toFixed(1)} mm) — pas besoin d'arroser ce soir.`, type: 'good' });
    } else if (rainDay2 > 10) {
      tips.push({ icon: '🌦️', text: `Pluie prévue dans 2 jours (${rainDay2.toFixed(1)} mm) — arrosage léger suffisant.`, type: 'info' });
    }

    // Heat-based advice
    if (maxTempToday > 30) {
      tips.push({ icon: '🌡️', text: `Forte chaleur (${maxTempToday.toFixed(0)}°C) — arrosez abondamment le soir et paillez.`, type: 'warn' });
    } else if (maxTempToday > 25 && rainToday < 1 && rainTomorrow < 2) {
      tips.push({ icon: '☀️', text: `Temps chaud et sec — arrosez régulièrement, de préférence le matin.`, type: 'info' });
    }

    // Frost warning
    const minTempTomorrow = daily.temperature_2m_min[1] || 0;
    if (minTempTomorrow <= 2) {
      tips.push({ icon: '🥶', text: `Risque de gel demain (${minTempTomorrow.toFixed(0)}°C) — protégez les plantes sensibles !`, type: 'danger' });
    }

    // Soil moisture estimate
    const recentRain = (daily.precipitation_sum[0] || 0) + (rainTomorrow * 0.3);
    const evapEstimate = maxTempToday > 25 ? 3 : maxTempToday > 15 ? 2 : 1;
    const soilBalance = recentRain - evapEstimate;
    let soilState;
    if (soilBalance > 3) soilState = { label: 'Sol humide', cls: 'good' };
    else if (soilBalance > 0) soilState = { label: 'Sol correct', cls: 'info' };
    else soilState = { label: 'Sol sec', cls: 'warn' };
    tips.push({ icon: '🌍', text: `Estimation : ${soilState.label}`, type: soilState.cls });

    // Moon phase tip
    if (window.MOON) {
      const phase = MOON.getPhase(new Date());
      tips.push({ icon: MOON.getPhaseEmoji(phase), text: MOON.getGardeningTip(phase), type: 'info' });
    }

    if (tips.length === 0) {
      tips.push({ icon: '✅', text: 'Conditions normales pour le jardinage.', type: 'good' });
    }
    return tips;
  }

  function renderWeather() {
    if (!weatherData) return;
    const current = weatherData.current;
    const daily = weatherData.daily;

    // Current weather
    const currentEl = document.getElementById('weather-current');
    currentEl.innerHTML = `
      <div class="weather-now">
        <span class="weather-emoji">${wmoToEmoji(current.weather_code)}</span>
        <div class="weather-now-info">
          <div class="weather-temp">${current.temperature_2m.toFixed(1)}°C</div>
          <div class="weather-desc">${wmoToFrench(current.weather_code)}</div>
          <div class="weather-meta">💧 ${current.relative_humidity_2m}% · 💨 ${current.wind_speed_10m.toFixed(0)} km/h${locationData.name ? ' · 📍 ' + APP.esc(locationData.name) : ''}</div>
        </div>
      </div>
    `;

    // Advice
    const adviceEl = document.getElementById('weather-advice');
    const tips = generateAdvice();
    adviceEl.innerHTML = tips.map(t => `
      <div class="advice-item advice-${t.type}">
        <span class="advice-icon">${t.icon}</span>
        <span>${APP.esc(t.text)}</span>
      </div>
    `).join('');

    // 7-day forecast
    const forecastEl = document.getElementById('weather-forecast');
    const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    forecastEl.innerHTML = daily.time.map((date, i) => {
      const d = new Date(date + 'T12:00:00');
      const dayName = i === 0 ? "Auj." : DAYS_FR[d.getDay()];
      return `
        <div class="forecast-day${i === 0 ? ' today' : ''}">
          <div class="fd-name">${dayName}</div>
          <div class="fd-emoji">${wmoToEmoji(daily.weather_code[i])}</div>
          <div class="fd-temps">
            <span class="fd-max">${daily.temperature_2m_max[i].toFixed(0)}°</span>
            <span class="fd-min">${daily.temperature_2m_min[i].toFixed(0)}°</span>
          </div>
          <div class="fd-rain">${daily.precipitation_probability_max[i]}% 🌧️</div>
          <div class="fd-precip">${daily.precipitation_sum[i].toFixed(1)} mm</div>
        </div>
      `;
    }).join('');
  }

  // Wait for APP to be ready then init
  const waitForApp = setInterval(() => {
    if (window.APP) {
      clearInterval(waitForApp);
      init();
      window.APP._extraRenders.weather = () => {
        if (weatherData && document.getElementById('meteo').classList.contains('active')) {
          renderWeather();
        }
      };
    }
  }, 50);
})();
