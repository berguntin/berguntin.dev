// Viento real en la ría de A Coruña y el Láser navegando el campo de regatas.

const RIA = { latitude: 43.39, longitude: -8.37 };
const CACHE_KEY = 'wind:ria-coruna';
const CACHE_MS = 10 * 60 * 1000;
const REFERENCE: Wind = { direction: 45, speed: 12, gusts: 17, time: null };

interface Wind {
  direction: number; // grados, de donde sopla
  speed: number; // nudos
  gusts: number; // nudos
  time: string | null; // hora local de la lectura, null si es el valor de referencia
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const BEAUFORT = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];

const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16];
const beaufort = (kn: number) => BEAUFORT.filter((limit) => kn >= limit).length;
const localName = (deg: number) => (deg >= 22.5 && deg < 67.5 ? 'nordés' : null);

async function fetchWind(): Promise<Wind> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.wind;
  } catch {}

  const params = new URLSearchParams({
    latitude: String(RIA.latitude),
    longitude: String(RIA.longitude),
    current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kn',
    timezone: 'Europe/Madrid',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Open Meteo ${response.status}`);
    const { current } = await response.json();
    const wind: Wind = {
      direction: current.wind_direction_10m,
      speed: Math.round(current.wind_speed_10m),
      gusts: Math.round(current.wind_gusts_10m),
      time: String(current.time).slice(11, 16),
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), wind }));
    } catch {}
    return wind;
  } finally {
    clearTimeout(timeout);
  }
}

function renderReadout(wind: Wind) {
  const set = (name: string, text: string) => {
    const el = document.querySelector(`[data-wind="${name}"]`);
    if (el) el.textContent = text;
  };
  const name = localName(wind.direction);
  set('dir', compass(wind.direction));
  set('speed', String(wind.speed));
  set('gusts', String(wind.gusts));
  set('force', `Fuerza ${beaufort(wind.speed)}${name ? ` · ${name}` : ''}`);
  set('source', wind.time ? `Open Meteo · ${wind.time}` : 'Sin conexión: valor de referencia');
}

// Barbas de viento: media barba = 5 kn, barba = 10 kn, banderín = 50 kn.
function renderBarb(wind: Wind) {
  const group = document.getElementById('wind-barb-feathers');
  if (!group) return;
  let knots = Math.round(wind.speed / 5) * 5;
  const parts: string[] = [];
  let offset = 0;
  while (knots >= 50) {
    parts.push(`<path class="wind-barb__pennant" d="M0,${offset} L16,${offset + 4} L0,${offset + 8}Z" />`);
    offset += 10;
    knots -= 50;
  }
  while (knots >= 10) {
    parts.push(`<line class="wind-barb__feather" x1="0" y1="${offset}" x2="16" y2="${offset - 6}" />`);
    offset += 6;
    knots -= 10;
  }
  if (knots >= 5) {
    if (offset === 0) offset = 6;
    parts.push(`<line class="wind-barb__feather" x1="0" y1="${offset}" x2="8" y2="${offset - 3}" />`);
  }
  group.innerHTML = parts.join('');
}

function applyWind(wind: Wind) {
  // Ángulo continuo para que el giro tome el camino corto.
  for (const id of ['course', 'wind-barb']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const current = parseFloat(el.style.getPropertyValue('--wind')) || 45;
    const delta = ((((wind.direction - current) % 360) + 540) % 360) - 180;
    el.style.setProperty('--wind', `${current + delta}deg`);
  }
  renderReadout(wind);
  renderBarb(wind);
}

// --- Láser ---

type Point = [number, number];

function sailBoat(svg: SVGSVGElement, getWind: () => Wind) {
  const boat = document.getElementById('boat');
  const boom = document.getElementById('boat-boom');
  if (!boat || !boom) return;
  const track: Point[] = JSON.parse(svg.dataset.track ?? '[]');
  const legs = track.slice(0, -1).map((from, i) => {
    const to = track[i + 1];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    // 0° = proa al viento (hacia arriba en el sistema local del campo).
    const heading = (Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180) / Math.PI;
    return { from, to, length, heading };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);

  const place = (distance: number) => {
    let d = distance % total;
    let index = 0;
    while (d > legs[index].length) d -= legs[index++].length;
    const leg = legs[index];
    const t = d / leg.length;
    const x = leg.from[0] + (leg.to[0] - leg.from[0]) * t;
    const y = leg.from[1] + (leg.to[1] - leg.from[1]) * t;

    // Virada suave en los últimos píxeles de cada bordo.
    const next = legs[(index + 1) % legs.length];
    const turn = Math.max(0, 1 - (leg.length - d) / 6);
    const delta = ((((next.heading - leg.heading) % 360) + 540) % 360) - 180;
    const heading = leg.heading + delta * turn * 0.5;

    // La botavara se abre a sotavento: cerrada en ceñida, abierta en popa.
    const offWind = Math.min(Math.abs(((heading + 540) % 360) - 180), 180);
    const open = 8 + (Math.max(0, offWind - 45) / 135) * 77;
    const side = ((heading % 360) + 360) % 360 < 180 ? -1 : 1;
    boat.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${heading.toFixed(1)}) scale(1.3)`);
    boom.setAttribute('transform', `rotate(${(side * open).toFixed(1)} 0 -4)`);
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let distance = 0;
  let last = 0;
  let frame = 0;
  let visible = true;

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    // Más viento, más velocidad, con un límite para que siga siendo legible.
    const speed = 6 + Math.min(getWind().speed, 25) * 0.8;
    distance += speed * dt;
    place(distance);
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (frame || reduced.matches || !visible || document.hidden) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  place(legs[0].length * 0.6);
  distance = legs[0].length * 0.6;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(svg);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduced.addEventListener('change', () => (reduced.matches ? stop() : start()));
  start();
}

const svg = document.querySelector<SVGSVGElement>('svg.chart');
if (svg) {
  let wind = REFERENCE;
  applyWind(wind);
  sailBoat(svg, () => wind);
  fetchWind()
    .then((live) => {
      wind = live;
      applyWind(live);
    })
    .catch(() => renderReadout(REFERENCE));
}

// Copiar el correo al portapapeles.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.querySelector('[data-copy-label]');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      if (label) label.textContent = 'Copiado';
    } catch {
      const target = document.getElementById(button.getAttribute('aria-controls') ?? '');
      if (target) getSelection()?.selectAllChildren(target);
      if (label) label.textContent = 'Selecciónalo y cópialo';
    }
    setTimeout(() => label && (label.textContent = 'Copiar'), 2400);
  });
}
