// La carta de fondo sigue al lector por la costera de la Torre de Hércules a Sada. Cada sección de la
// página es un punto con nombre de la derrota: el Láser, la estela, la cámara y el compás se interpolan
// entre ellos según el scroll. El viento real orienta la línea de salida, decide los bordos de ceñida,
// trima la vela y mueve la flecha del compás.
import { sailCostera, type FixedPoint } from './costera';
import { buildLegs, locate, placeBoat, type Point } from './laser';
import { compassPoint, fetchWind, REFERENCE_WIND, type Wind } from './wind';

const byId = (id: string) => document.getElementById(id);
const svg = byId('sea') as SVGSVGElement | null;
const camera = byId('sea-camera');
const boat = byId('sea-boat');
const boom = byId('sea-boom');
const wake = byId('sea-wake');

if (svg && camera && boat && boom && wake) {
  const fixed = JSON.parse(svg.dataset.fixed ?? '[]') as FixedPoint[];
  const [S, W, N, E] = JSON.parse(svg.dataset.bbox ?? '[0,0,0,0]') as number[];
  const [chartW, chartH] = JSON.parse(svg.dataset.size ?? '[1,1]') as [number, number];
  // Unidades de carta por milla náutica (1′ de latitud).
  const unitsPerMile = chartH / ((N - S) * 60);
  let route: Point[] = [];
  let named: Record<string, number> = {};
  let legs = buildLegs([[0, 0], [0, 0]]);
  let cumulative = [0, 0];

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...document.querySelectorAll<HTMLElement>('[data-waypoint]')];
  const markers = [...svg.querySelectorAll<SVGGElement>('[data-at]')].map((el) => ({
    id: el.id,
    el,
    at: JSON.parse(el.dataset.at ?? '[0,0]') as Point,
  }));

  let wind: Wind = REFERENCE_WIND;
  let stops: { y: number; distance: number; zoom: number }[] = [];
  let width = 0;
  let height = 0;
  let mobile = false;

  const decimal = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dm = (value: number, positive: string, negative: string) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    return `${deg}°${decimal((abs - deg) * 60).padStart(4, '0')}′${value >= 0 ? positive : negative}`;
  };
  const setText = (id: string, text: string) => {
    const el = byId(id);
    if (el) el.textContent = text;
  };

  const measure = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    mobile = width < 768;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    stops = sections.map((section) => ({
      y: Math.max(0, section.getBoundingClientRect().top + window.scrollY - height * 0.35),
      distance: cumulative[named[section.dataset.waypoint ?? ''] ?? 0],
      zoom: Number(section.dataset.zoom ?? 1.4),
    }));
    if (stops[0]) stops[0].y = 0;
  };

  const smooth = (t: number) => t * t * (3 - 2 * t);

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

    const { x, y: py, heading } = locate(legs, distance, { loop: false, turnRadius: 8 });
    const scale = (zoom * Math.min(width, height)) / 560;
    const anchorX = mobile ? width * 0.5 : width * 0.7;
    const anchorY = mobile ? height * 0.62 : height * 0.5;
    camera.setAttribute('transform', `translate(${anchorX} ${anchorY}) scale(${scale}) translate(${-x} ${-py})`);

    // Barco y balizas mantienen su tamaño en pantalla aunque la carta haga zoom.
    placeBoat(boat, boom, x, py, heading, 1.3 / scale, wind.direction);
    for (const { el, at } of markers) el.setAttribute('transform', `translate(${at[0]} ${at[1]}) scale(${1 / scale})`);

    // Estela: la derrota hasta el punto donde está el barco.
    let passed = 0;
    while (passed < cumulative.length - 1 && cumulative[passed + 1] <= distance) passed++;
    const wakePoints = [...route.slice(0, passed + 1), [x, py]];
    wake.setAttribute('d', 'M' + wakePoints.map(([wx, wy]) => `${wx.toFixed(1)},${wy.toFixed(1)}`).join('L'));

    const bearing = ((heading % 360) + 360) % 360;
    byId('compass-card')?.setAttribute('transform', `rotate(${-bearing})`);
    setText('compass-heading', `${String(Math.round(bearing) % 360).padStart(3, '0')}°`);
    const lon = W + (x / chartW) * (E - W);
    const lat = N - (py / chartH) * (N - S);
    setText('compass-position', `${dm(lat, 'N', 'S')} ${dm(lon, 'E', 'W')}`);
    setText('compass-log', decimal(distance / unitsPerMile));
  };

  let ticking = false;
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(draw);
  };

  // Navega la costera con un viento: salida perpendicular a él y bordos en los tramos de ceñida.
  const sail = (windFrom: number) => {
    const sailed = sailCostera(fixed, windFrom, unitsPerMile);
    route = sailed.route;
    named = sailed.stops;
    legs = buildLegs(route);
    cumulative = [0];
    for (const leg of legs) cumulative.push(cumulative[cumulative.length - 1] + leg.length);
    byId('sea-route')?.setAttribute('d', 'M' + route.map(([rx, ry]) => `${rx.toFixed(1)},${ry.toFixed(1)}`).join('L'));
    const startLine = byId('sea-start-line');
    startLine?.setAttribute('x1', String(sailed.start.pin[0]));
    startLine?.setAttribute('y1', String(sailed.start.pin[1]));
    startLine?.setAttribute('x2', String(sailed.start.committee[0]));
    startLine?.setAttribute('y2', String(sailed.start.committee[1]));
    for (const marker of markers) {
      if (marker.id === 'sea-start-committee') marker.at = sailed.start.committee;
      if (marker.id === 'sea-start-pin') marker.at = sailed.start.pin;
    }
    setText('compass-course', `Costera a Sada · ${decimal(cumulative[cumulative.length - 1] / unitsPerMile)} mn`);
    measure();
  };

  const applyWind = (next: Wind) => {
    wind = next;
    sail(next.direction);
    byId('compass-wind')?.setAttribute('transform', `rotate(${next.direction})`);
    setText(
      'compass-wind-text',
      next.time ? `${compassPoint(next.direction)} ${next.speed} kn` : `${compassPoint(next.direction)} (referencia)`,
    );
    request();
  };

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
