// Comprueba la costera contra la costa de la carta para cualquier viento: navega la derrota de
// src/data/costera.json con src/scripts/costera.ts cada 2° de dirección y verifica que la salida,
// la presalida, los bordos de ceñida, las balizas y la llegada quedan en agua con margen, y que los
// nombres de los puntos coinciden con los que usa el contenido. Uso: pnpm check:route
import { readFileSync } from 'node:fs';

const { sailCostera } = await import('../src/scripts/costera.ts');

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const chart = JSON.parse(read('../src/data/golfo-artabro.json'));
const costera = JSON.parse(read('../src/data/costera.json'));
const config = read('../src/content.config.ts');

const [S, W, N, E] = chart.bbox;
const unitsPerMile = chart.height / ((N - S) * 60);
const project = (lon, lat) => [((lon - W) / (E - W)) * chart.width, ((N - lat) / (N - S)) * chart.height];

// Rasteriza la tierra (una celda por unidad de carta, regla par-impar por filas).
const width = Math.ceil(chart.width);
const height = Math.ceil(chart.height);
const land = new Uint8Array(width * height);
const rings = chart.land
  .split('M')
  .filter(Boolean)
  .map((chunk) => chunk.replace(/Z/g, '').split('L').map((pair) => pair.split(',').map(Number)));
for (let row = 0; row < height; row++) {
  const y = row + 0.5;
  const xs = [];
  for (const points of rings) {
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
  }
  xs.sort((a, b) => a - b);
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const from = Math.max(0, Math.ceil(xs[k] - 0.5));
    const to = Math.min(width - 1, Math.floor(xs[k + 1] - 0.5));
    land.fill(1, row * width + from, row * width + to + 1);
  }
}
const isWater = ([x, y]) => {
  const col = Math.floor(x);
  const row = Math.floor(y);
  return col >= 0 && row >= 0 && col < width && row < height && land[row * width + col] === 0;
};
// Agua en el punto y en un círculo de radio `miles` a su alrededor.
const clear = (p, miles) =>
  isWater(p) &&
  Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8).every((a) =>
    isWater([p[0] + Math.cos(a) * miles * unitsPerMile, p[1] + Math.sin(a) * miles * unitsPerMile]),
  );

const errors = [];
const ROUTE_MARGIN = 0.06; // mn, los bordos se separan algo de la línea directa
const MARK_MARGIN = 0.05; // mn

const legClear = (a, b) => {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let s = 0; s <= steps; s++) {
    const p = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
    if (!clear(p, ROUTE_MARGIN)) return false;
  }
  return true;
};

const fixedRoute = costera.route.map((p) => ({ name: p.name, at: project(p.lon, p.lat) }));
let longest = 0;
let mostTacks = 0;
for (let wind = 0; wind < 360; wind += 2) {
  const sailed = sailCostera(fixedRoute, wind, unitsPerMile);
  const bad = sailed.route.findIndex((p, i) => i > 0 && !legClear(sailed.route[i - 1], p));
  if (bad > 0) errors.push(`Con viento de ${wind}° el tramo ${bad - 1} → ${bad} pasa a menos de ${ROUTE_MARGIN} mn de tierra`);
  for (const [name, p] of Object.entries(sailed.start)) {
    if (!clear(p, MARK_MARGIN)) errors.push(`Con viento de ${wind}° el extremo ${name} de la línea de salida toca tierra`);
  }
  const miles = sailed.route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - sailed.route[i][0], p[1] - sailed.route[i][1]), 0) / unitsPerMile;
  longest = Math.max(longest, miles);
  mostTacks = Math.max(mostTacks, sailed.route.length - fixedRoute.length - 2);
}

const fixed = [
  ...costera.marks.map((m) => [`baliza ${m.label}`, m.lon, m.lat]),
  ['comité de llegada', ...costera.finish.committee],
  ['boya de llegada', ...costera.finish.pin],
];
for (const [name, lon, lat] of fixed) if (!clear(project(lon, lat), MARK_MARGIN)) errors.push(`${name} está en tierra o pegada a ella`);

const declared = [...config.matchAll(/^\s+'([a-z0-9-]+)',$/gm)].map((m) => m[1]);
const inRoute = ['aproximacion', 'presalida', ...costera.route.map((p) => p.name).filter(Boolean)];
for (const name of declared) if (!inRoute.includes(name)) errors.push(`El punto "${name}" de WAYPOINTS no está en costera.json`);
for (const name of inRoute) if (!declared.includes(name)) errors.push(`El punto "${name}" de costera.json no está en WAYPOINTS`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Costera correcta con viento de cualquier dirección (180 casos): hasta ${longest.toFixed(1)} mn navegadas y ${mostTacks} puntos de virada, todo en agua.`,
);
