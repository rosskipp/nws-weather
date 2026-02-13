import { fetchWeatherData, parseGridTimeSeries, fetchSunTimes } from './api.js';
import { drawChart } from './charts.js';

const DEFAULT_LAT = 39.9239, DEFAULT_LON = -105.0886;

async function loadWeather(lat, lon) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading forecast…</div>';
  try {
    const [{ locName, hourly, forecast, gridProperties }, sunTimes] = await Promise.all([
      fetchWeatherData(lat, lon),
      fetchSunTimes(lat, lon, 4)
    ]);
    render(locName, hourly, forecast, gridProperties, sunTimes);
    document.getElementById('updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    app.innerHTML = `<div class="error">⚠️ ${e.message}<br><small>Try again or search a different location</small></div>`;
  }
}

function render(location, hourly, periods, gridProps, sunTimes) {
  const now = hourly[0];
  const allHours = hourly.slice(0, 156); // up to ~6.5 days
  let windowStart = 0;
  const WINDOW_SIZE = 48;
  const h = allHours; // keep full set, we'll slice in chart rendering
  const app = document.getElementById('app');
  const windDir = now.windDirection;

  const todaySun = sunTimes?.[0];
  const sunSummary = todaySun ? `
    <div class="sun-times">
      <span>🌅 ${todaySun.sunrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      <span>🌇 ${todaySun.sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
    </div>` : '';

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
      ${sunSummary}
    </div>
    
    <div class="section-title"><span>📊</span> Hourly Charts</div>
    <div class="time-nav" id="timeNav">
      <button id="prevDay" class="time-btn" disabled>◀ Prev</button>
      <span id="timeRange" class="time-range"></span>
      <button id="nextDay" class="time-btn">Next ▶</button>
    </div>
    <div class="tabs" id="chartTabs">
      <div class="tab active" data-chart="temp">Temp</div>
      <div class="tab" data-chart="precip">Precip</div>
      <div class="tab" data-chart="wind">Wind</div>
      <div class="tab" data-chart="humidity">Humid</div>
      <div class="tab" data-chart="skyCover">Sky</div>
    </div>
    <div class="chart-card">
      <div style="position:relative;height:220px;touch-action:pan-x"><canvas id="chart"></canvas></div>
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

  const allLabels = h.map(p => {
    const d = new Date(p.startTime);
    return {
      text: d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric' }),
      _time: d.getTime()
    };
  });
  const allSkyCover = parseGridTimeSeries(gridProps?.skyCover, h);
  const allWindGustsKmh = parseGridTimeSeries(gridProps?.windGust, h);
  const allWindGusts = allWindGustsKmh.map(v => v != null ? Math.round(v * 0.621371) : null);

  const allDatasets = {
    temp: { label: 'Temperature (°F)', data: h.map(p => p.temperature), color: '#4fc3f7', fill: true },
    precip: { label: 'Precipitation (%)', data: h.map(p => p.probabilityOfPrecipitation?.value ?? 0), color: '#66bb6a', fill: true },
    wind: {
      label: 'Wind Speed (mph)', data: h.map(p => parseInt(p.windSpeed)), color: '#ffa726', fill: false,
      secondary: { label: 'Wind Gusts (mph)', data: allWindGusts, color: '#ef5350' }
    },
    humidity: { label: 'Humidity (%)', data: h.map(p => p.relativeHumidity?.value ?? 0), color: '#ab47bc', fill: true },
    skyCover: { label: 'Sky Cover (%)', data: allSkyCover, color: '#78909c', fill: true }
  };

  let activeChart = 'temp';

  function sliceDatasets(start, size) {
    const sliced = {};
    for (const [key, ds] of Object.entries(allDatasets)) {
      sliced[key] = { ...ds, data: ds.data.slice(start, start + size) };
      if (ds.secondary) {
        sliced[key].secondary = { ...ds.secondary, data: ds.secondary.data.slice(start, start + size) };
      }
    }
    return sliced;
  }

  function updateTimeRange() {
    const startDate = new Date(h[windowStart]?.startTime);
    const endIdx = Math.min(windowStart + WINDOW_SIZE - 1, h.length - 1);
    const endDate = new Date(h[endIdx]?.startTime);
    const fmt = { weekday: 'short', month: 'short', day: 'numeric' };
    document.getElementById('timeRange').textContent = 
      `${startDate.toLocaleDateString('en-US', fmt)} – ${endDate.toLocaleDateString('en-US', fmt)}`;
    document.getElementById('prevDay').disabled = windowStart === 0;
    document.getElementById('nextDay').disabled = windowStart + WINDOW_SIZE >= h.length;
  }

  function renderChart() {
    const labels = allLabels.slice(windowStart, windowStart + WINDOW_SIZE);
    const datasets = sliceDatasets(windowStart, WINDOW_SIZE);
    drawChart(activeChart, labels, datasets, sunTimes);
    updateTimeRange();
  }

  renderChart();

  document.getElementById('prevDay').addEventListener('click', () => {
    windowStart = Math.max(0, windowStart - 24);
    renderChart();
  });

  document.getElementById('nextDay').addEventListener('click', () => {
    windowStart = Math.min(h.length - WINDOW_SIZE, windowStart + 24);
    renderChart();
  });

  document.getElementById('chartTabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeChart = tab.dataset.chart;
    renderChart();
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
