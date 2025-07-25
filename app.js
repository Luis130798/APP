// =====================
// CONFIGURACIÓN INICIAL
// =====================
// Puedes cambiar estos valores por los de tu canal de ThingSpeak
const CONFIG = {
  channelId: 'TU_CHANNEL_ID', // <-- Cambia esto por tu Channel ID
  apiKey: '', // Si tu canal es privado, pon aquí tu API Key de lectura
  fieldTemp: 1, // Número de campo para temperatura
  fieldHum: 2,  // Número de campo para humedad
  fieldAir: 3,  // Número de campo para calidad de aire
  location: 'AREQUIPA-PERU',
  sensorName: 'JACOBO HUNTER',
  mapAddress: 'Av. Independencia Arequipa-Peru',
  mapIframe: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.011964073634!2d-71.5374516855376!3d-16.39880358868759!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91424a511e2b7e2b%3A0x7e6e2e2e2e2e2e2e!2sAv.%20Independencia%2C%20Arequipa%2C%20Peru!5e0!3m2!1ses!2spe!4v1680000000000!5m2!1ses!2spe'
};

// =====================
// ELEMENTOS DEL DOM
// =====================
const tempValue = document.getElementById('tempValue');
const humValue = document.getElementById('humValue');
const airValue = document.getElementById('airValue');
const tempCard = document.getElementById('tempCard');
const humCard = document.getElementById('humCard');
const airCard = document.getElementById('airCard');
const semaforoText = document.getElementById('semaforoText');
const mapAddress = document.querySelector('.map-address');
const mapFrame = document.querySelector('.map-frame iframe');
const cardLocations = document.querySelectorAll('.card-location');
const cardSensors = document.querySelectorAll('.card-sensor');
const refreshBtn = document.getElementById('refreshBtn'); // Si agregas un botón de refresco

// =====================
// FUNCIONES DE API
// =====================
function getApiUrl() {
  let url = `https://api.thingspeak.com/channels/${CONFIG.channelId}/feeds.json?results=20`;
  if (CONFIG.apiKey) url += `&api_key=${CONFIG.apiKey}`;
  return url;
}

async function fetchData() {
  try {
    const res = await fetch(getApiUrl());
    if (!res.ok) throw new Error('No se pudo conectar a ThingSpeak');
    const data = await res.json();
    if (!data.feeds || !data.feeds.length) throw new Error('Sin datos en el canal.');
    return data.feeds; // devolvemos array completo (últimas lecturas)
  } catch (e) {
    showError('Error al obtener datos: ' + e.message);
    return null;
  }
}

// =====================
// GRÁFICO DE HISTÓRICO
// =====================
let sensorChart;

function initChart() {
  const ctx = document.getElementById('sensorChart');
  if (!ctx) return; // si el canvas no existe (por tamaño pantalla)

  sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: [],
          borderColor: '#ff7043',
          backgroundColor: 'rgba(255,112,67,0.1)',
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'Humedad (%)',
          data: [],
          borderColor: '#42a5f5',
          backgroundColor: 'rgba(66,165,245,0.1)',
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'Calidad Aire (PM)',
          data: [],
          borderColor: '#8e24aa',
          backgroundColor: 'rgba(142,36,170,0.1)',
          tension: 0.3,
          pointRadius: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Hora'
          }
        }
      }
    }
  });
}

function updateChart(feeds) {
  if (!sensorChart) return;
  const labels = feeds.map(f => {
    const d = new Date(f.created_at);
    return d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
  });
  sensorChart.data.labels = labels;

  const tempData = feeds.map(f => parseFloat(f[`field${CONFIG.fieldTemp}`] ?? NaN));
  const humData = feeds.map(f => parseFloat(f[`field${CONFIG.fieldHum}`] ?? NaN));
  const airData = feeds.map(f => parseFloat(f[`field${CONFIG.fieldAir}`] ?? NaN));

  sensorChart.data.datasets[0].data = tempData;
  sensorChart.data.datasets[1].data = humData;
  sensorChart.data.datasets[2].data = airData;

  sensorChart.update();
}

// =====================
// ACTUALIZACIÓN DE UI
// =====================
function updateCards(feed) {
  // Temperatura
  const temp = parseFloat(feed[`field${CONFIG.fieldTemp}`]);
  tempValue.textContent = isNaN(temp) ? '-- °C' : `${temp.toFixed(1)} °C`;
  tempCard.className = 'card big-card' + (temp > 30 ? ' alert' : temp > 37 ? ' danger' : '');

  // Humedad
  const hum = parseFloat(feed[`field${CONFIG.fieldHum}`]);
  humValue.textContent = isNaN(hum) ? '-- %' : `${hum.toFixed(1)} %`;
  humCard.className = 'card big-card' + (hum < 30 ? ' alert' : hum < 15 ? ' danger' : '');

  // Calidad de aire
  const air = parseFloat(feed[`field${CONFIG.fieldAir}`]);
  airValue.textContent = isNaN(air) ? '-- PM' : `${air.toFixed(0)} PM`;
  airCard.className = 'card big-card' + (air > 100 ? ' alert' : air > 200 ? ' danger' : '');

  updateSemaforo(air);
}

function updateSemaforo(air) {
  // Cambia el texto y el color del semáforo según el valor de calidad de aire
  let text = 'Sin datos';
  let color = 'green';
  if (isNaN(air)) {
    text = 'Sin datos';
    color = 'green';
  } else if (air <= 50) {
    text = 'Buena';
    color = 'green';
  } else if (air <= 100) {
    text = 'Moderada';
    color = 'yellow';
  } else if (air <= 150) {
    text = 'Dañina a grupos sensibles';
    color = 'orange';
  } else if (air <= 200) {
    text = 'Dañina';
    color = 'red';
  } else {
    text = 'Muy dañina';
    color = 'purple';
  }
  semaforoText.textContent = text;
  // Resalta el color correspondiente
  document.querySelectorAll('.semaforo-color').forEach(el => el.style.opacity = '0.3');
  const colorIndex = {green:0, yellow:1, orange:2, red:3, purple:4}[color];
  if (colorIndex !== undefined) {
    document.querySelectorAll('.semaforo-color')[colorIndex].style.opacity = '1';
  }
}

function updateStaticInfo() {
  // Ubicación y sensor en tarjetas
  cardLocations.forEach(el => el.textContent = CONFIG.location);
  cardSensors.forEach(el => el.textContent = CONFIG.sensorName);
  // Mapa
  if (mapAddress) mapAddress.innerHTML = CONFIG.mapAddress.replace(/\n/g, '<br>');
  if (mapFrame) mapFrame.src = CONFIG.mapIframe;
}

function showError(msg) {
  alert(msg); // Puedes mejorar esto con un banner o modal si lo prefieres
}

// =====================
// INICIALIZACIÓN Y REFRESCO
// =====================
async function refreshDashboard() {
  const feeds = await fetchData();
  if (!feeds) return;
  const latest = feeds[feeds.length - 1];
  updateCards(latest);
  updateChart(feeds);
}

window.addEventListener('DOMContentLoaded', () => {
  updateStaticInfo();
  initChart();
  refreshDashboard();
  // Si tienes un botón de refresco manual, actívalo aquí
  if (refreshBtn) refreshBtn.onclick = refreshDashboard;
  // Auto-refresh cada 60 segundos (opcional)
  setInterval(refreshDashboard, 60000);
});

// =====================
// PREPARADO PARA MÚLTIPLES SENSORES (FUTURO)
// =====================
// Puedes crear un array de objetos CONFIG y un selector para cambiar de sensor
// y reutilizar las funciones anteriores para cada uno. 