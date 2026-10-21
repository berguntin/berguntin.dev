// La carta de fondo sigue al lector: cada sección marca un punto de la derrota y un zoom,
// y el Láser, la estela y el compás se interpolan entre ellos según el scroll.
import { buildLegs, locate, placeBoat, type Point } from './laser';
import { compassPoint, fetchWind, REFERENCE_WIND, type Wind } from './wind';

const svg = document.getElementById('sea') as SVGSVGElement | null;
const camera = document.getElementById('sea-camera');
const boat = document.getElementById('sea-boat');
const boom = document.getElementById('sea-boom');
const wake = document.getElementById('sea-wake');
const card = document.getElementById('compass-card');
const windArrow = document.getElementById('compass-wind');
const headingEl = document.getElementById('compass-heading');
const positionEl = document.getElementById('compass-position');
const logEl = document.getElementById('compass-log');
const windEl = document.getElementById('compass-wind-text');

if (svg && camera && boat && boom && wake) {
  const route = JSON.parse(svg.dataset.route ?? '[]') as Point[];
  const [S, W, N, E] = JSON.parse(svg.dataset.bbox ?? '[0,0,0,0]') as number[];
  const [chartW, chartH] = JSON.parse(svg.dataset.size ?? '[1,1]') as number[];
  const legs = buildLegs(route);
  const cumulative = [0];
  for (const leg of legs) cumulative.push(cumulative[cumulative.length - 1] + leg.length);
  // Unidades de carta por milla náutica (1′ de latitud).
  const unitsPerMile = chartH / ((N - S) * 60);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...document.querySelectorAll<HTMLElement>('[data-waypoint]')];
  let stops: { y: number; distance: number; zoom: number }[] = [];
  let width = 0;
  let height = 0;
  let mobile = false;
  let wind: Wind = REFERENCE_WIND;

  const measure = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    mobile = width < 768;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    stops = sections.map((section) => ({
      y: Math.max(0, section.getBoundingClientRect().top + window.scrollY - height * 0.35),
      distance: cumulative[Math.min(Number(section.dataset.waypoint), cumulative.length - 1)],
      zoom: Number(section.dataset.zoom ?? 1.4),
    }));
    if (stops[0]) stops[0].y = 0;
  };

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const dm = (value: number, positive: string, negative: string) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg}°${min.toFixed(1).padStart(4, '0')}′${value >= 0 ? positive : negative}`;
  };

  const draw = () => {
    ticking = false;
    if (!stops.length) return;
    const y = reduced.matches ? 0 : window.scrollY;
    let i = 0;
    while (i < stops.length - 1 && y > stops[i + 1].y) i++;
    const from = stops[i];
    const to = stops[i + 1] ?? from;
    const t = to === from ? 0 : smooth(Math.min(1, (y - from.y) / (to.y - from.y)));
    const distance = from.distance + (to.distance - from.distance) * t;
    const zoom = from.zoom + (to.zoom - from.zoom) * t;

    const { x, y: py, heading } = locate(legs, distance, { loop: false, turnRadius: 10 });
    const scale = (zoom * Math.min(width, height)) / 560;
    const anchorX = mobile ? width * 0.5 : width * 0.7;
    const anchorY = mobile ? height * 0.62 : height * 0.5;
    camera.setAttribute('transform', `translate(${anchorX} ${anchorY}) scale(${scale}) translate(${-x} ${-py})`);
    // El barco mantiene su tamaño en pantalla aunque la carta haga zoom.
    placeBoat(boat, boom, x, py, heading, 1.3 / scale, wind.direction);
    // Estela: la derrota hasta el punto donde está el barco.
    let passed = 0;
    while (passed < cumulative.length - 1 && cumulative[passed + 1] <= distance) passed++;
    const wakePoints = [...route.slice(0, passed + 1), [x, py]];
    wake.setAttribute('d', 'M' + wakePoints.map(([wx, wy]) => `${wx.toFixed(1)},${wy.toFixed(1)}`).join('L'));

    const bearing = ((heading % 360) + 360) % 360;
    card?.setAttribute('transform', `rotate(${-bearing})`);
    if (headingEl) headingEl.textContent = `${String(Math.round(bearing) % 360).padStart(3, '0')}°`;
    if (positionEl) {
      const lon = W + (x / chartW) * (E - W);
      const lat = N - (py / chartH) * (N - S);
      positionEl.textContent = `${dm(lat, 'N', 'S')} ${dm(lon, 'E', 'W')}`;
    }
    if (logEl) logEl.textContent = (distance / unitsPerMile).toFixed(1);
  };

  let ticking = false;
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(draw);
  };

  const applyWind = (next: Wind) => {
    wind = next;
    windArrow?.setAttribute('transform', `rotate(${next.direction})`);
    if (windEl) windEl.textContent = next.time ? `${compassPoint(next.direction)} ${next.speed} kn` : `${compassPoint(next.direction)} (referencia)`;
    request();
  };

  measure();
  applyWind(REFERENCE_WIND);
  draw();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    request();
  });
  // Las fuentes y las imágenes cambian la altura de las secciones: volvemos a medir.
  new ResizeObserver(() => {
    measure();
    request();
  }).observe(document.body);
  reduced.addEventListener('change', request);
  fetchWind().then(applyWind, () => applyWind(REFERENCE_WIND));
}
