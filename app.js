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
// SIMULACIÓN DE DATOS (si no hay conexión a ThingSpeak)
// =====================
function generarDatoAleatorio(min, max, dec=1) {
  return +(Math.random() * (max - min) + min).toFixed(dec);
}

function simularDatos() {
  // Simula un feed similar al de ThingSpeak
  const ahora = new Date();
  return {
    [`field${CONFIG.fieldTemp}`]: generarDatoAleatorio(18, 32),
    [`field${CONFIG.fieldHum}`]: generarDatoAleatorio(30, 80),
    [`field${CONFIG.fieldAir}`]: generarDatoAleatorio(10, 250, 0),
    created_at: ahora.toISOString()
  };
}

// =====================
// ANIMACIÓN DE VALORES
// =====================
function animarConteo(element, valorFinal, sufijo = '', decimales = 1, duracion = 800) {
  const valorInicial = parseFloat(element.textContent) || 0;
  const inicio = performance.now();
  function animar(now) {
    const progreso = Math.min((now - inicio) / duracion, 1);
    const valor = valorInicial + (valorFinal - valorInicial) * progreso;
    element.textContent = isNaN(valorFinal) ? '--' + sufijo : valor.toFixed(decimales) + ' ' + sufijo;
    if (progreso < 1) requestAnimationFrame(animar);
    else element.textContent = isNaN(valorFinal) ? '--' + sufijo : valorFinal.toFixed(decimales) + ' ' + sufijo;
  }
  requestAnimationFrame(animar);
}

// =====================
// RECOMENDACIONES DINÁMICAS
// =====================
const recomendaciones = {
  green: 'Disfruta el aire libre, la calidad es buena.',
  yellow: 'Personas sensibles deben limitar actividades al aire libre.',
  orange: 'Evita actividades físicas intensas al aire libre.',
  red: 'Permanece en interiores y usa mascarilla si sales.',
  purple: 'Evita salir, la calidad del aire es muy dañina.'
};
let recomendacionesVisibles = false;

function mostrarRecomendacion(color) {
  let texto = recomendaciones[color] || 'Sin datos.';
  let div = document.getElementById('recomBox');
  if (!div) {
    div = document.createElement('div');
    div.id = 'recomBox';
    div.style.position = 'fixed';
    div.style.bottom = '32px';
    div.style.right = '32px';
    div.style.background = '#fff';
    div.style.border = '2px solid #0097a7';
    div.style.borderRadius = '18px';
    div.style.padding = '18px 28px';
    div.style.boxShadow = '0 4px 24px #0002';
    div.style.zIndex = '9999';
    div.style.fontSize = '1.1em';
    div.style.color = '#0097a7';
    div.style.maxWidth = '320px';
    div.style.transition = 'opacity 0.3s';
    document.body.appendChild(div);
  }
  div.textContent = texto;
  div.style.opacity = '1';
  recomendacionesVisibles = true;
  setTimeout(() => {
    if (recomendacionesVisibles) div.style.opacity = '0';
    recomendacionesVisibles = false;
  }, 6000);
}

// =====================
// MODIFICAR updateCards Y updateSemaforo PARA ANIMACIÓN Y RECOMENDACIONES
// =====================
function updateCards(feed) {
  // Temperatura
  const temp = parseFloat(feed[`field${CONFIG.fieldTemp}`]);
  animarConteo(tempValue, temp, '°C', 1);
  tempCard.className = 'card big-card' + (temp > 30 ? ' alert' : temp > 37 ? ' danger' : '');

  // Humedad
  const hum = parseFloat(feed[`field${CONFIG.fieldHum}`]);
  animarConteo(humValue, hum, '%', 1);
  humCard.className = 'card big-card' + (hum < 30 ? ' alert' : hum < 15 ? ' danger' : '');

  // Calidad de aire
  const air = parseFloat(feed[`field${CONFIG.fieldAir}`]);
  animarConteo(airValue, air, 'PM', 0);
  airCard.className = 'card big-card' + (air > 100 ? ' alert' : air > 200 ? ' danger' : '');

  updateSemaforo(air);
}

function updateSemaforo(air) {
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
  document.querySelectorAll('.semaforo-color').forEach(el => el.style.opacity = '0.3');
  const colorIndex = {green:0, yellow:1, orange:2, red:3, purple:4}[color];
  if (colorIndex !== undefined) {
    document.querySelectorAll('.semaforo-color')[colorIndex].style.opacity = '1';
  }
  // Mostrar recomendación dinámica
  if (recomendacionesVisibles) return;
  mostrarRecomendacion(color);
}

// =====================
// BOTÓN DE RECOMENDACIONES
// =====================
const recomBtn = document.querySelector('.recom-btn');
if (recomBtn) {
  recomBtn.onclick = () => {
    // Busca el color actual del semáforo
    let air = parseFloat(airValue.textContent);
    let color = 'green';
    if (isNaN(air)) color = 'green';
    else if (air <= 50) color = 'green';
    else if (air <= 100) color = 'yellow';
    else if (air <= 150) color = 'orange';
    else if (air <= 200) color = 'red';
    else color = 'purple';
    mostrarRecomendacion(color);
  };
}

// =====================
// ACTUALIZACIÓN DE UI
// =====================
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
// INICIALIZACIÓN Y REFRESCO (MODIFICADO)
// =====================
async function refreshDashboard() {
  let feeds = await fetchData();
  if (!feeds) {
    // Si no hay datos, simula
    feeds = Array.from({length: 20}, simularDatos);
  }
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