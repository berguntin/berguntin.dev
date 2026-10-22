// Geometría compartida del Láser: recorrer una derrota y trimar la vela según el rumbo.
// Convención: 0° = proa al viento (hacia arriba), ángulos en sentido horario como en SVG.

export type Point = [number, number];

export interface Leg {
  from: Point;
  to: Point;
  length: number;
  heading: number;
}

export function buildLegs(track: Point[]): Leg[] {
  return track.slice(0, -1).map((from, i) => {
    const to = track[i + 1];
    return {
      from,
      to,
      length: Math.hypot(to[0] - from[0], to[1] - from[1]),
      heading: (Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180) / Math.PI,
    };
  });
}

export const shortestTurn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

/** Posición y rumbo a una distancia dada de la salida, con la virada suavizada al final de cada bordo. */
export function locate(legs: Leg[], distance: number, { loop = true, turnRadius = 6 } = {}) {
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let d = loop ? ((distance % total) + total) % total : Math.min(Math.max(distance, 0), total);
  let index = 0;
  while (index < legs.length - 1 && d > legs[index].length) d -= legs[index++].length;
  const leg = legs[index];
  const t = leg.length ? d / leg.length : 0;
  const next = legs[index + 1] ?? (loop ? legs[0] : leg);
  const turn = Math.max(0, 1 - (leg.length - d) / turnRadius);
  return {
    x: leg.from[0] + (leg.to[0] - leg.from[0]) * t,
    y: leg.from[1] + (leg.to[1] - leg.from[1]) * t,
    heading: leg.heading + shortestTurn(leg.heading, next.heading) * turn * 0.5,
  };
}

/** La botavara se abre a sotavento: cerrada en ceñida, abierta en popa. */
export function boomAngle(heading: number) {
  const offWind = Math.min(Math.abs(((heading + 540) % 360) - 180), 180);
  const open = 8 + (Math.max(0, offWind - 45) / 135) * 77;
  const side = ((heading % 360) + 360) % 360 < 180 ? -1 : 1;
  return side * open;
}

/** `windFrom` es la dirección de la que sopla el viento, en el mismo sistema de ángulos que `heading`. */
export function placeBoat(boat: Element, boom: Element, x: number, y: number, heading: number, scale = 1, windFrom = 0) {
  boat.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${heading.toFixed(1)}) scale(${scale.toFixed(3)})`);
  // La vela se dibuja con la bolsa hacia estribor; cuando la botavara se abre a babor se refleja
  // para que la bolsa quede siempre a sotavento.
  const angle = boomAngle(heading - windFrom);
  boom.setAttribute('transform', `rotate(${angle.toFixed(1)} 0 -4)${angle > 0 ? ' scale(-1 1)' : ''}`);
}
