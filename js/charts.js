let charts = {};

export function drawChart(key, labels, datasets) {
  const ds = datasets[key];
  if (charts.main) charts.main.destroy();
  const ctx = document.getElementById('chart').getContext('2d');

  const chartDatasets = [];

  // Primary dataset
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, ds.color + '40');
  gradient.addColorStop(1, ds.color + '05');
  chartDatasets.push({
    label: ds.label, data: ds.data,
    borderColor: ds.color, backgroundColor: ds.fill ? gradient : 'transparent',
    borderWidth: 2, pointRadius: 0, pointHitRadius: 10,
    tension: .4, fill: ds.fill
  });

  // Secondary dataset (e.g., wind gusts)
  if (ds.secondary) {
    const s = ds.secondary;
    chartDatasets.push({
      label: s.label, data: s.data,
      borderColor: s.color, backgroundColor: 'transparent',
      borderWidth: 2, pointRadius: 0, pointHitRadius: 10,
      tension: .4, fill: false,
      borderDash: [6, 3]
    });
  }

  const unitMap = { temp: '°F', wind: 'mph', precip: '%', humidity: '%', skyCover: '%' };
  const unit = unitMap[key] || '';

  charts.main = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: chartDatasets },
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
        }
      },
      scales: {
        x: { ticks: { color: '#556677', maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }, grid: { color: '#1e334730' } },
        y: { ticks: { color: '#556677', font: { size: 11 } }, grid: { color: '#1e334730' } }
      }
    }
  });
}
