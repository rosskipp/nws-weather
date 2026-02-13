let charts = {};

function buildSunAnnotations(labels, sunTimes) {
  if (!sunTimes || !sunTimes.length) return {};
  const annotations = {};
  const labelTimes = labels.map((_, i) => labels[i]._time); // we'll attach _time to labels

  sunTimes.forEach((st, si) => {
    [
      { time: st.sunrise, icon: '☀️', key: `sr${si}`, color: '#ffd54f' },
      { time: st.sunset, icon: '🌙', key: `ss${si}`, color: '#ff8a65' }
    ].forEach(({ time, icon, key, color }) => {
      const t = time.getTime();
      // Find the label index closest to this time
      let bestIdx = -1, bestDist = Infinity;
      for (let i = 0; i < labelTimes.length; i++) {
        const dist = Math.abs(labelTimes[i] - t);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      if (bestIdx >= 0 && bestDist < 3600000 * 1.5) {
        // Interpolate fractional position
        const frac = bestIdx + (t - labelTimes[bestIdx]) / 3600000;
        annotations[key + '_line'] = {
          type: 'line',
          xMin: frac, xMax: frac,
          borderColor: color + '60',
          borderWidth: 1,
          borderDash: [4, 4],
          label: {
            display: true,
            content: icon,
            position: 'end',
            backgroundColor: 'transparent',
            color: color,
            font: { size: labels.length > 72 ? 8 : 11, weight: 'normal' },
            padding: 0
          }
        };
      }
    });
  });

  // Shade nighttime periods
  // Before first sunrise
  if (sunTimes.length > 0) {
    const firstSunrise = sunTimes[0].sunrise.getTime();
    const firstIdx = labelTimes.findIndex(t => t >= firstSunrise);
    if (firstIdx > 0) {
      annotations['night_pre'] = {
        type: 'box', xMin: 0, xMax: firstIdx,
        backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 0
      };
    }
    // Between each sunset and next sunrise
    for (let i = 0; i < sunTimes.length; i++) {
      const ssTime = sunTimes[i].sunset.getTime();
      const nextSr = sunTimes[i + 1]?.sunrise?.getTime();
      let ssIdx = -1, srIdx = labelTimes.length;
      for (let j = 0; j < labelTimes.length; j++) {
        if (ssIdx < 0 && labelTimes[j] >= ssTime) ssIdx = j;
        if (nextSr && labelTimes[j] >= nextSr) { srIdx = j; break; }
      }
      if (ssIdx >= 0) {
        const end = nextSr ? Math.min(srIdx, labelTimes.length) : labelTimes.length;
        annotations[`night_${i}`] = {
          type: 'box', xMin: ssIdx, xMax: end,
          backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 0
        };
      }
    }
  }

  return annotations;
}

export function drawChart(key, labels, datasets, sunTimes) {
  const ds = datasets[key];
  if (charts.main) charts.main.destroy();
  const ctx = document.getElementById('chart').getContext('2d');

  const chartDatasets = [];

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, ds.color + '40');
  gradient.addColorStop(1, ds.color + '05');
  chartDatasets.push({
    label: ds.label, data: ds.data,
    borderColor: ds.color, backgroundColor: ds.fill ? gradient : 'transparent',
    borderWidth: 2, pointRadius: 0, pointHitRadius: 10,
    stepped: 'before', tension: 0, fill: ds.fill
  });

  if (ds.secondary) {
    const s = ds.secondary;
    chartDatasets.push({
      label: s.label, data: s.data,
      borderColor: s.color, backgroundColor: 'transparent',
      borderWidth: 2, pointRadius: 0, pointHitRadius: 10,
      stepped: 'before', tension: 0, fill: false,
      borderDash: [6, 3]
    });
  }

  // Extract unit from label e.g. "Temperature (°F)" → "°F"
  const match = ds.label.match(/\(([^)]+)\)/);
  const unit = match ? match[1] : '';

  const annotations = buildSunAnnotations(labels, sunTimes);

  charts.main = new Chart(ctx, {
    type: 'line',
    data: { labels: labels.map(l => l.text), datasets: chartDatasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: chartDatasets.length > 1, labels: { color: '#8899aa', boxWidth: 20, padding: 12 } },
        tooltip: {
          backgroundColor: '#1a2a3a', titleColor: '#8899aa', bodyColor: '#e0e6ed',
          borderColor: '#1e3347', borderWidth: 1, padding: 10,
          displayColors: chartDatasets.length > 1,
          callbacks: { label: i => ` ${i.dataset.label}: ${i.parsed.y}${unit}` }
        },
        annotation: { annotations }
      },
      scales: {
        x: { ticks: { color: '#556677', maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }, grid: { color: '#1e334730' } },
        y: {
          min: ['precip', 'humidity', 'skyCover'].includes(key) ? 0 : (() => { const vals = chartDatasets.flatMap(d => d.data.filter(v => v != null)); return Math.floor(Math.min(...vals) - 5); })(),
          max: ['precip', 'humidity', 'skyCover'].includes(key) ? 100 : (() => { const vals = chartDatasets.flatMap(d => d.data.filter(v => v != null)); return Math.ceil(Math.max(...vals) + 5); })(),
          ticks: { color: '#556677', font: { size: 11 } }, grid: { color: '#1e334730' }
        }
      }
    }
  });
}
