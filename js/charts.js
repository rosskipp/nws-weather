let charts = {};

export function drawChart(key, labels, datasets) {
  const ds = datasets[key];
  if (charts.main) charts.main.destroy();
  const ctx = document.getElementById('chart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, ds.color + '40');
  gradient.addColorStop(1, ds.color + '05');
  charts.main = new Chart(ctx, {
    type: 'line',
    data: {
      labels, datasets: [{
        label: ds.label, data: ds.data,
        borderColor: ds.color, backgroundColor: ds.fill ? gradient : 'transparent',
        borderWidth: 2, pointRadius: 0, pointHitRadius: 10,
        tension: .4, fill: ds.fill
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false }, tooltip: {
          backgroundColor: '#1a2a3a', titleColor: '#8899aa', bodyColor: '#e0e6ed',
          borderColor: '#1e3347', borderWidth: 1, padding: 10,
          displayColors: false,
          callbacks: { label: i => ` ${i.parsed.y} ${key === 'temp' ? '°F' : key === 'wind' ? 'mph' : '%'}` }
        }
      },
      scales: {
        x: { ticks: { color: '#556677', maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }, grid: { color: '#1e334730' } },
        y: { ticks: { color: '#556677', font: { size: 11 } }, grid: { color: '#1e334730' } }
      }
    }
  });
}
