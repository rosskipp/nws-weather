import { fetchWeatherData } from './api.js';
import { drawChart } from './charts.js';

const DEFAULT_LAT = 39.9239, DEFAULT_LON = -105.0886;

async function loadWeather(lat, lon) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading forecast…</div>';
  try {
    const { locName, hourly, forecast } = await fetchWeatherData(lat, lon);
    render(locName, hourly, forecast);
    document.getElementById('updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    app.innerHTML = `<div class="error">⚠️ ${e.message}<br><small>Try again or search a different location</small></div>`;
  }
}

function render(location, hourly, periods) {
  const now = hourly[0];
  const h = hourly.slice(0, 72);
  const app = document.getElementById('app');
  const windDir = now.windDirection;

  app.innerHTML = `
    <div class="location-name">📍 ${location}</div>
    <div class="current">
      <div class="temp">${now.temperature}°F</div>
      <div class="desc">${now.shortForecast}</div>
      <div class="details">
        <span>💨 Wind <b>${now.windSpeed} ${windDir}</b></span>
        <span>💧 Humidity <b>${now.relativeHumidity?.value ?? '--'}%</b></span>
        <span>🌧 Precip <b>${now.probabilityOfPrecipitation?.value ?? 0}%</b></span>
      </div>
    </div>
    
    <div class="section-title"><span>📊</span> Hourly Charts</div>
    <div class="tabs" id="chartTabs">
      <div class="tab active" data-chart="temp">Temperature</div>
      <div class="tab" data-chart="precip">Precipitation</div>
      <div class="tab" data-chart="wind">Wind</div>
      <div class="tab" data-chart="humidity">Humidity</div>
    </div>
    <div class="chart-card">
      <canvas id="chart" height="200"></canvas>
    </div>
    
    <div class="section-title"><span>📋</span> Extended Forecast</div>
    <div class="forecast-cards" id="forecastCards"></div>
  `;

  const fc = document.getElementById('forecastCards');
  periods.slice(0, 14).forEach(p => {
    const isNight = !p.isDaytime;
    const cls = p.temperature > 80 ? 'hot' : p.temperature < 40 ? 'cold' : '';
    fc.innerHTML += `<div class="forecast-card">
      <div class="period-name">${isNight ? '🌙' : '☀️'} ${p.name}</div>
      <div class="period-temp ${cls}">${p.temperature}°</div>
      <div class="period-detail">${p.shortForecast} · Wind ${p.windSpeed} ${p.windDirection}</div>
    </div>`;
  });

  const labels = h.map(p => {
    const d = new Date(p.startTime);
    return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric' });
  });
  const datasets = {
    temp: { label: 'Temperature (°F)', data: h.map(p => p.temperature), color: '#4fc3f7', fill: true },
    precip: { label: 'Precipitation (%)', data: h.map(p => p.probabilityOfPrecipitation?.value ?? 0), color: '#66bb6a', fill: true },
    wind: { label: 'Wind Speed (mph)', data: h.map(p => parseInt(p.windSpeed)), color: '#ffa726', fill: false },
    humidity: { label: 'Humidity (%)', data: h.map(p => p.relativeHumidity?.value ?? 0), color: '#ab47bc', fill: true }
  };

  drawChart('temp', labels, datasets);

  document.getElementById('chartTabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    drawChart(tab.dataset.chart, labels, datasets);
  });
}

// Search
let searchTimeout;
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 3) { searchResults.classList.remove('active'); return; }
  searchTimeout = setTimeout(async () => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=us`);
      const data = await r.json();
      if (!data.length) { searchResults.classList.remove('active'); return; }
      searchResults.innerHTML = data.map(d => `<div data-lat="${d.lat}" data-lon="${d.lon}">${d.display_name}</div>`).join('');
      searchResults.classList.add('active');
    } catch (e) { }
  }, 400);
});

searchResults.addEventListener('click', e => {
  const el = e.target.closest('div[data-lat]');
  if (!el) return;
  searchResults.classList.remove('active');
  searchInput.value = '';
  loadWeather(parseFloat(el.dataset.lat), parseFloat(el.dataset.lon));
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) searchResults.classList.remove('active');
});

// Init
loadWeather(DEFAULT_LAT, DEFAULT_LON);

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
