// La carta de fondo sigue al lector. El campo de regatas se fondea con el viento real del día
// (regatta-course.ts) y cada sección de la página es un punto de esa regata: el Láser, la estela,
// la cámara y el compás se interpolan entre ellos según el scroll.
import { buildLegs, locate, placeBoat, type Point } from './laser';
import { buildCourse, makeWaterTest, parseRings, type Course, type Waypoint } from './regatta-course';
import { compassPoint, fetchWind, REFERENCE_WIND, type Wind } from './wind';

const byId = (id: string) => document.getElementById(id);
const svg = byId('sea') as SVGSVGElement | null;
const camera = byId('sea-camera');
const coast = document.querySelector<SVGPathElement>('#sea .coast');
const boat = byId('sea-boat');
const boom = byId('sea-boom');
const wake = byId('sea-wake');
const routeEl = byId('sea-route');
const courseEl = byId('sea-course');

if (svg && camera && coast && boat && boom && wake && routeEl && courseEl) {
  const [S, W, N, E] = JSON.parse(svg.dataset.bbox ?? '[0,0,0,0]') as number[];
  const [chartW, chartH] = JSON.parse(svg.dataset.size ?? '[1,1]') as [number, number];
  const harbour = JSON.parse(svg.dataset.harbour ?? '[0,0]') as Point;
  const centers = JSON.parse(svg.dataset.centers ?? '[]') as Point[];
  // Unidades de carta por milla náutica (1′ de latitud).
  const unitsPerMile = chartH / ((N - S) * 60);
  const isWater = makeWaterTest(parseRings(coast.getAttribute('d') ?? ''), [chartW, chartH]);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...document.querySelectorAll<HTMLElement>('[data-waypoint]')];
  const markers = (['start-committee', 'start-pin', 'finish-committee', 'finish-pin', 'm1', 'm1a', 'm2'] as const).map(
    (name) => ({ name, el: byId(`sea-${name}`) }),
  );

  let wind: Wind = REFERENCE_WIND;
  let course: Course | null = null;
  let route: Point[] = [harbour, harbour];
  let legs = buildLegs(route);
  let cumulative = [0, 0];
  let stops: { y: number; distance: number; zoom: number }[] = [];
  let width = 0;
  let height = 0;
  let mobile = false;

  const decimal = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dm = (value: number, positive: string, negative: string) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg}°${decimal(min).padStart(4, '0')}′${value >= 0 ? positive : negative}`;
  };
  const setText = (id: string, text: string) => {
    const el = byId(id);
    if (el) el.textContent = text;
  };

  const markerPoint = (name: (typeof markers)[number]['name']): Point | null => {
    if (!course) return null;
    if (name === 'start-committee') return course.start.committee;
    if (name === 'start-pin') return course.start.pin;
    if (name === 'finish-committee') return course.finish.committee;
    if (name === 'finish-pin') return course.finish.pin;
    return course.marks[name];
  };

  const measure = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    mobile = width < 768;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    stops = sections.map((section) => {
      const index = course?.stops[section.dataset.waypoint as Waypoint] ?? 0;
      return {
        y: Math.max(0, section.getBoundingClientRect().top + window.scrollY - height * 0.35),
        distance: cumulative[Math.min(index, cumulative.length - 1)],
        zoom: Number(section.dataset.zoom ?? 1.4),
      };
    });
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
    for (const { name, el } of markers) {
      const p = markerPoint(name);
      if (el && p) el.setAttribute('transform', `translate(${p[0]} ${p[1]}) scale(${1 / scale})`);
    }

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

  // El comité fondea el campo: eje al viento, longitud según la intensidad y todo en agua.
  const anchorCourse = (next: Wind) => {
    const built = buildCourse({
      windFrom: next.direction,
      windSpeed: next.speed,
      centers,
      harbour,
      unitsPerMile,
      isWater,
    });
    if (!built) return false;
    course = built;
    route = built.route;
    legs = buildLegs(route);
    cumulative = [0];
    for (const leg of legs) cumulative.push(cumulative[cumulative.length - 1] + leg.length);
    routeEl.setAttribute('d', 'M' + route.slice(1).map(([rx, ry]) => `${rx.toFixed(1)},${ry.toFixed(1)}`).join('L'));
    const line = (id: string, a: Point, b: Point) => {
      const el = byId(id);
      el?.setAttribute('x1', String(a[0]));
      el?.setAttribute('y1', String(a[1]));
      el?.setAttribute('x2', String(b[0]));
      el?.setAttribute('y2', String(b[1]));
    };
    line('sea-start-line', built.start.pin, built.start.committee);
    line('sea-finish-line', built.finish.pin, built.finish.committee);
    setText('compass-course', `Campo a ${String(Math.round(built.windFrom) % 360).padStart(3, '0')}° · ${decimal(built.lengthMiles)} mn`);
    measure();
    return true;
  };

  const applyWind = (next: Wind) => {
    if (anchorCourse(next)) wind = next;
    else anchorCourse(wind);
    byId('compass-wind')?.setAttribute('transform', `rotate(${wind.direction})`);
    setText(
      'compass-wind-text',
      wind.time ? `${compassPoint(wind.direction)} ${wind.speed} kn` : `${compassPoint(wind.direction)} (referencia)`,
    );
    courseEl.classList.add('is-set');
    request();
  };

  // Primero el campo de referencia, para que la página funcione al instante; luego el del viento real.
  anchorCourse(REFERENCE_WIND);
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
