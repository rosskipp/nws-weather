const API = 'https://api.weather.gov';

export async function fetchSunTimes(lat, lon, days = 4) {
  const times = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    try {
      const r = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0&date=${dateStr}`);
      const data = await r.json();
      if (data.status === 'OK') {
        times.push({
          date: dateStr,
          sunrise: new Date(data.results.sunrise),
          sunset: new Date(data.results.sunset)
        });
      }
    } catch (e) { /* skip */ }
  }
  return times;
}
const UA = { 'User-Agent': 'NWSWeatherApp/1.0 (ross@openclaw.dev)' };

async function nws(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`NWS API error: ${r.status}`);
  return r.json();
}

export function parseGridTimeSeries(series, hourlyPeriods) {
  if (!series || !series.values) return hourlyPeriods.map(() => null);
  const parsed = [];
  for (const entry of series.values) {
    const [timeStr, durStr] = entry.validTime.split('/');
    const start = new Date(timeStr);
    const hourMatch = durStr.match(/(\d+)H/);
    const durationHours = hourMatch ? parseInt(hourMatch[1]) : 1;
    for (let i = 0; i < durationHours; i++) {
      parsed.push({ time: new Date(start.getTime() + i * 3600000), value: entry.value });
    }
  }
  return hourlyPeriods.map(p => {
    const t = new Date(p.startTime).getTime();
    const match = parsed.find(g => Math.abs(g.time.getTime() - t) < 1800000);
    return match ? match.value : null;
  });
}

export async function fetchWeatherData(lat, lon) {
  const points = await nws(`${API}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const p = points.properties;
  const locName = `${p.relativeLocation.properties.city}, ${p.relativeLocation.properties.state}`;
  const [hourly, forecast, gridData] = await Promise.all([
    nws(p.forecastHourly),
    nws(p.forecast),
    nws(p.forecastGridData)
  ]);
  return {
    locName,
    hourly: hourly.properties.periods,
    forecast: forecast.properties.periods,
    gridProperties: gridData.properties
  };
}
