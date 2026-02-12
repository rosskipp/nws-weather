const API = 'https://api.weather.gov';
const UA = { 'User-Agent': 'NWSWeatherApp/1.0 (ross@openclaw.dev)' };

async function nws(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`NWS API error: ${r.status}`);
  return r.json();
}

export async function fetchWeatherData(lat, lon) {
  const points = await nws(`${API}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const p = points.properties;
  const locName = `${p.relativeLocation.properties.city}, ${p.relativeLocation.properties.state}`;
  const [hourly, forecast] = await Promise.all([
    nws(p.forecastHourly),
    nws(p.forecast)
  ]);
  return { locName, hourly: hourly.properties.periods, forecast: forecast.properties.periods };
}
