const API = 'https://api.weather.gov';
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
