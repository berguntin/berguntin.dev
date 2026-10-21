// Campo de regatas tipo bastón con desmarque, fondeado según el viento real.
// Recorrido: salida → ceñida → baliza 1 (barlovento) → 1a (desmarque) → popa → baliza 2 (sotavento)
// → ceñida → llegada. Todas las balizas se dejan por babor.
// Módulo puro, sin DOM: se prueba en Node con `pnpm check:course` (scripts/check-course.mjs).

export type Point = [number, number];

/** Puntos de la derrota a los que se puede anclar una sección de la página. */
export const WAYPOINTS = [
  'aproximacion',
  'presalida',
  'salida',
  'virada',
  'baliza-1',
  'desmarque',
  'sotavento',
  'llegada',
  'fin',
] as const;
export type Waypoint = (typeof WAYPOINTS)[number];

export interface Course {
  route: Point[];
  stops: Record<Waypoint, number>; // índice en `route`
  marks: { m1: Point; m1a: Point; m2: Point };
  start: { committee: Point; pin: Point };
  finish: { committee: Point; pin: Point };
  windFrom: number;
  lengthMiles: number;
}

interface Options {
  windFrom: number; // grados, de donde sopla
  windSpeed: number; // nudos
  centers: Point[]; // candidatos para el centro del campo, por orden de preferencia
  harbour: Point; // de donde sale el barco si no cabe una aproximación cerca del campo
  unitsPerMile: number;
  isWater: (p: Point) => boolean;
}

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** El comité alarga el campo con más viento: 0,8 mn con calma, hasta 1,3 mn con viento fuerte. */
export const courseLengthMiles = (knots: number) => Math.min(1.3, Math.max(0.8, 0.7 + knots * 0.03));

function layout(center: Point, windFrom: number, length: number, approach: Point | null): Course {
  const rad = (windFrom * Math.PI) / 180;
  // u apunta hacia barlovento (de donde viene el viento); r, a estribor mirando a barlovento. Norte arriba, y hacia abajo.
  const u: Point = [Math.sin(rad), -Math.cos(rad)];
  const r: Point = [Math.cos(rad), Math.sin(rad)];
  const at = (along: number, across: number) => add(center, add(mul(u, along * length), mul(r, across * length)));

  const startMid = at(-0.5, 0);
  const m1 = at(0.5, 0);
  const m1a = at(0.47, -0.1);
  const m2 = at(-0.42, 0);
  // La llegada queda a la izquierda del eje para que la popa no la cruce.
  const finishMid = at(0.05, -0.25);
  const lineHalf = 0.12;
  // Las balizas se dejan por babor: el barco pasa por fuera, a su derecha.
  const round = 0.035;

  // Ceñida en tres bordos a 45°: sale amurado a estribor y llega a la 1 por la layline de estribor.
  const route: Point[] = [
    approach ?? at(-0.95, 0.3), // el barco llega desde sotavento del campo
    at(-0.62, 0.16), // presalida, por detrás de la línea junto al comité
    startMid,
    at(-0.3, -0.2), // primera virada
    at(0.2175, 0.3175), // segunda virada, ya en la layline
    at(0.5, round), // baliza 1
    at(0.47 + round, -0.1), // desmarque
    at(0.02, -0.02), // trasluchada a media popa
    at(-0.44, -round), // baliza 2
    at(-0.305, 0.105), // virada de la última ceñida
    finishMid,
    at(0.11, -0.31), // tras cruzar la llegada
  ];
  const stops: Record<Waypoint, number> = {
    aproximacion: 0,
    presalida: 1,
    salida: 2,
    virada: 3,
    'baliza-1': 5,
    desmarque: 6,
    sotavento: 8,
    llegada: 10,
    fin: 11,
  };
  return {
    route,
    stops,
    marks: { m1, m1a, m2 },
    start: { committee: at(-0.5, lineHalf), pin: at(-0.5, -lineHalf) },
    finish: { committee: at(0.05, -0.25 + lineHalf * 0.7), pin: at(0.05, -0.25 - lineHalf * 0.7) },
    windFrom,
    lengthMiles: 0,
  };
}

function clear(course: Course, isWater: (p: Point) => boolean, margin: number) {
  const around = (p: Point) =>
    isWater(p) &&
    Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).every((a) =>
      isWater([p[0] + Math.cos(a) * margin, p[1] + Math.sin(a) * margin]),
    );
  const points = [
    course.marks.m1,
    course.marks.m1a,
    course.marks.m2,
    course.start.committee,
    course.start.pin,
    course.finish.committee,
    course.finish.pin,
  ];
  if (!points.every(around)) return false;
  // Todos los tramos de la derrota, muestreados cada 3 unidades. El de aproximación solo necesita agua.
  for (let i = 0; i < course.route.length - 1; i++) {
    const a = course.route[i];
    const b = course.route[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let s = 0; s <= steps; s++) {
      const p = lerp(a, b, s / steps);
      if (i === 0 ? !isWater(p) : !around(p)) return false;
    }
  }
  return true;
}

/**
 * Fondea el campo: orienta el eje al viento, prueba los centros candidatos y acorta el campo
 * hasta que todas las balizas y todos los tramos quedan en agua con margen.
 */
export function buildCourse({ windFrom, windSpeed, centers, harbour, unitsPerMile, isWater }: Options): Course | null {
  const ideal = courseLengthMiles(windSpeed);
  const margin = unitsPerMile * 0.06;
  for (let miles = ideal; miles >= 0.4; miles -= 0.05) {
    for (const center of centers) {
      for (const approach of [null, harbour]) {
        const course = layout(center, windFrom, miles * unitsPerMile, approach);
        if (clear(course, isWater, margin)) return { ...course, lengthMiles: miles };
      }
    }
  }
  return null;
}

// --- Agua y tierra a partir del trazado de la costa ---

interface Ring {
  points: Point[];
  box: [number, number, number, number];
}

/** Convierte el `d` de la costa (M x,y L x,y … Z) en anillos con su caja para descartar rápido. */
export function parseRings(d: string): Ring[] {
  return d
    .split('M')
    .filter(Boolean)
    .map((chunk) => {
      const points = chunk
        .replace(/Z/g, '')
        .split('L')
        .map((pair) => pair.split(',').map(Number) as Point);
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      return { points, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as Ring['box'] };
    })
    .filter((ring) => ring.points.length >= 3);
}

/**
 * Rasteriza la tierra una sola vez (una celda por unidad de carta, regla par-impar por filas)
 * y devuelve una consulta instantánea de agua. Los huecos de la tierra cuentan como agua.
 */
export function makeWaterTest(rings: Ring[], size: [number, number]) {
  const width = Math.ceil(size[0]);
  const height = Math.ceil(size[1]);
  const land = new Uint8Array(width * height);
  const crossings: number[] = [];
  for (let row = 0; row < height; row++) {
    const y = row + 0.5;
    crossings.length = 0;
    for (const { points, box } of rings) {
      if (y < box[1] || y > box[3]) continue;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y) crossings.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil(crossings[k] - 0.5));
      const to = Math.min(width - 1, Math.floor(crossings[k + 1] - 0.5));
      land.fill(1, row * width + from, row * width + to + 1);
    }
  }
  return ([x, y]: Point) => {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col < 0 || row < 0 || col >= width || row >= height) return false;
    return land[row * width + col] === 0;
  };
}
