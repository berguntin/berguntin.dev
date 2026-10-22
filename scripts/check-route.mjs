// Comprueba la costera de src/data/costera.json contra la costa de la carta:
// derrota, balizas y líneas de salida y llegada en agua con margen, y nombres de los puntos
// iguales a los que usa el contenido. Uso: pnpm check:route
import { readFileSync } from 'node:fs';

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
const ROUTE_MARGIN = 0.08; // mn
const MARK_MARGIN = 0.05; // mn

const route = costera.route.map((p) => project(p.lon, p.lat));
for (let i = 0; i < route.length - 1; i++) {
  const [a, b] = [route[i], route[i + 1]];
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let s = 0; s <= steps; s++) {
    const p = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
    if (!clear(p, ROUTE_MARGIN)) {
      errors.push(`El tramo ${i} → ${i + 1} pasa a menos de ${ROUTE_MARGIN} mn de tierra`);
      break;
    }
  }
}
const fixed = [
  ...costera.marks.map((m) => [`baliza ${m.label}`, m.lon, m.lat]),
  ['comité de salida', ...costera.start.committee],
  ['boya de salida', ...costera.start.pin],
  ['comité de llegada', ...costera.finish.committee],
  ['boya de llegada', ...costera.finish.pin],
];
for (const [name, lon, lat] of fixed) if (!clear(project(lon, lat), MARK_MARGIN)) errors.push(`${name} está en tierra o pegada a ella`);

const declared = [...config.matchAll(/^\s+'([a-z0-9-]+)',$/gm)].map((m) => m[1]);
const inRoute = costera.route.map((p) => p.name).filter(Boolean);
for (const name of declared) if (!inRoute.includes(name)) errors.push(`El punto "${name}" de WAYPOINTS no está en costera.json`);
for (const name of inRoute) if (!declared.includes(name)) errors.push(`El punto "${name}" de costera.json no está en WAYPOINTS`);

const miles = route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0) / unitsPerMile;
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Costera correcta: ${route.length} puntos, ${fixed.length} objetos fondeados y ${miles.toFixed(1)} mn en agua.`);
