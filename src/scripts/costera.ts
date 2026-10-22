// Cómo navega el Láser la costera con el viento del día. Los puntos de paso son fijos
// (src/data/costera.json); lo que depende del viento es la salida y los tramos de ceñida.
// Módulo puro, sin DOM ni imports: lo usan sea.ts en el navegador y scripts/check-route.mjs en Node.

export type Point = [number, number];

export interface FixedPoint {
  name: string | null;
  at: Point; // coordenadas de carta
}

export interface SailedCourse {
  route: Point[];
  stops: Record<string, number>; // nombre del punto → índice en `route`
  start: { committee: Point; pin: Point };
}

/** Ángulo de ceñida del Láser respecto al viento real, en grados. */
export const CLOSE_HAULED = 42;

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Vector unitario de un rumbo (norte arriba, y hacia abajo). */
const unit = (bearing: number): Point => [Math.sin(rad(bearing)), -Math.cos(rad(bearing))];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const bearingOf = (a: Point, b: Point) => ((Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI + 360) % 360;
const turn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

/**
 * Bordos para remontar de A a B cuando B queda dentro del ángulo muerto.
 * Empieza en la amura más parecida al rumbo que traía el barco y alterna bordos iguales,
 * los suficientes para no separarse de la línea A→B más de `maxLateral`.
 */
function beat(a: Point, b: Point, windFrom: number, maxLateral: number, heading: number): Point[] {
  const tacks = [windFrom - CLOSE_HAULED, windFrom + CLOSE_HAULED]; // estribor, babor
  const [first, second] =
    Math.abs(turn(heading, tacks[0])) <= Math.abs(turn(heading, tacks[1])) ? tacks : [tacks[1], tacks[0]];
  const [u1, u2] = [unit(first), unit(second)];
  // Descompone A→B en los dos rumbos de ceñida: v = k1·u1 + k2·u2.
  const v: Point = [b[0] - a[0], b[1] - a[1]];
  const det = u1[0] * u2[1] - u1[1] * u2[0];
  const k1 = (v[0] * u2[1] - v[1] * u2[0]) / det;
  const k2 = (u1[0] * v[1] - u1[1] * v[0]) / det;
  const lateral = Math.abs(k1 * Math.sin(rad(turn(bearingOf(a, b), first))));
  const boards = Math.max(1, Math.ceil(lateral / maxLateral));
  const points: Point[] = [];
  let at = a;
  for (let i = 0; i < boards; i++) {
    at = add(at, mul(u1, k1 / boards));
    points.push(at);
    at = i === boards - 1 ? b : add(at, mul(u2, k2 / boards));
    points.push(at);
  }
  return points;
}

export function sailCostera(fixed: FixedPoint[], windFrom: number, unitsPerMile: number): SailedCourse {
  const miles = (n: number) => n * unitsPerMile;
  const startIndex = fixed.findIndex((p) => p.name === 'salida');
  const start = fixed[startIndex].at;

  // Línea de salida perpendicular al viento, con el comité en el extremo de estribor.
  const across = unit(windFrom + 90);
  const committee = add(start, mul(across, miles(0.06)));
  const pin = add(start, mul(across, -miles(0.06)));

  // Rumbo al cruzar la línea. Si el primer tramo es de ceñida o de través, en ceñida y con la amura
  // que apunta más hacia él; si es de popa, ya con el rumbo del tramo. Antes, la aproximación es
  // un través que llega desde sotavento.
  const firstLeg = bearingOf(start, fixed[startIndex + 1].at);
  const offWind = turn(windFrom, firstLeg);
  const upwindStart = Math.abs(offWind) < 90;
  const side = offWind < 0 ? -1 : 1; // -1: amurado a estribor, 1: a babor
  const crossing = upwindStart ? windFrom + side * CLOSE_HAULED : firstLeg;
  const approach = upwindStart ? windFrom + side * 100 : firstLeg;
  const presalida = add(start, mul(unit(crossing), -miles(0.15)));
  const aproximacion = add(presalida, mul(unit(approach), -miles(0.25)));

  const route: Point[] = [aproximacion, presalida, start];
  const stops: Record<string, number> = { aproximacion: 0, presalida: 1, salida: 2 };
  let firstTack: number | null = null;
  const maxLateral = miles(0.1);

  for (let i = startIndex + 1; i < fixed.length; i++) {
    const from = route[route.length - 1];
    const { name, at } = fixed[i];
    // Tramo contra el viento: si el destino queda dentro del ángulo muerto, se remonta en bordos.
    if (Math.abs(turn(windFrom, bearingOf(from, at))) < CLOSE_HAULED) {
      const previous = route[route.length - 2];
      const boards = beat(from, at, windFrom, maxLateral, bearingOf(previous, from));
      if (firstTack === null && boards.length > 1) firstTack = route.length;
      route.push(...boards);
    } else {
      route.push(at);
    }
    if (name) stops[name] = route.length - 1;
  }
  // La sección de la primera virada sigue al barco en su primera virada real, si la hay antes de la baliza 1.
  if (firstTack !== null && firstTack < (stops['baliza-1'] ?? Infinity)) stops.virada = firstTack;
  return { route, stops, start: { committee, pin } };
}
