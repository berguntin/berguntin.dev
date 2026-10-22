// Partículas de viento sobre la carta, al estilo de Windy: trazos cortos que avanzan hacia donde sopla
// el viento real, más rápido cuanto más fuerte. Viven en coordenadas de carta, así que se mueven con la
// cámara. Con movimiento reducido se pinta una rejilla de flechas fijas.

export interface View {
  scale: number; // píxeles por unidad de carta
  anchorX: number; // punto de pantalla donde cae el centro de la cámara
  anchorY: number;
  x: number; // centro de la cámara en coordenadas de carta
  y: number;
  width: number;
  height: number;
}

export interface WindNow {
  direction: number; // de donde sopla, en grados
  speed: number; // nudos
}

interface Particle {
  x: number;
  y: number;
  age: number;
  life: number;
}

const toScreen = (v: View, x: number, y: number): [number, number] => [
  v.anchorX + (x - v.x) * v.scale,
  v.anchorY + (y - v.y) * v.scale,
];
const toChart = (v: View, sx: number, sy: number): [number, number] => [
  v.x + (sx - v.anchorX) / v.scale,
  v.y + (sy - v.anchorY) / v.scale,
];

export function startWindField(
  canvas: HTMLCanvasElement,
  getView: () => View | null,
  getWind: () => WindNow,
  reduced: MediaQueryList,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { redraw: () => {} };

  let particles: Particle[] = [];
  let frame = 0;
  let last = 0;
  let lastView = '';
  let color = '';
  let dpr = 1;

  // El color sale del token del tema; se relee al cambiar de tema.
  const readColor = () => {
    color = getComputedStyle(canvas).getPropertyValue('--wind-streak').trim() || 'rgba(128,128,128,0.3)';
  };

  const resize = (v: View) => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(v.width * dpr);
    const h = Math.round(v.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const spawn = (v: View): Particle => {
    const [x, y] = toChart(v, Math.random() * v.width, Math.random() * v.height);
    return { x, y, age: 0, life: 1.5 + Math.random() * 2.5 };
  };

  // Hacia donde va el aire: la dirección de la que sopla más 180°. Norte arriba, y hacia abajo.
  const flow = (wind: WindNow): [number, number] => {
    const to = ((wind.direction + 180) * Math.PI) / 180;
    return [Math.sin(to), -Math.cos(to)];
  };

  // Rejilla de flechas fijas para quien prefiere movimiento reducido.
  const drawStatic = (v: View) => {
    resize(v);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, v.width, v.height);
    const [dx, dy] = flow(getWind());
    const step = 96;
    const half = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let row = 0, sy = step / 2; sy < v.height; row++, sy += step) {
      for (let sx = step / 2 + (row % 2) * (step / 2); sx < v.width; sx += step) {
        const tipX = sx + dx * half;
        const tipY = sy + dy * half;
        ctx.moveTo(sx - dx * half, sy - dy * half);
        ctx.lineTo(tipX, tipY);
        // Punta de flecha a 30° a cada lado.
        for (const side of [-1, 1]) {
          const angle = Math.atan2(dy, dx) + Math.PI + side * (Math.PI / 6);
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + Math.cos(angle) * 4, tipY + Math.sin(angle) * 4);
        }
      }
    }
    ctx.stroke();
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const v = getView();
    if (!v) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    resize(v);

    // Si la cámara se ha movido, se borran las estelas para que no se emborronen.
    const key = `${v.scale.toFixed(4)}|${v.x.toFixed(2)}|${v.y.toFixed(2)}|${v.width}|${v.height}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (key !== lastView) {
      ctx.clearRect(0, 0, v.width, v.height);
      lastView = key;
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, 0, v.width, v.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    const target = Math.round((v.width * v.height) / 11000);
    while (particles.length < target) particles.push({ ...spawn(v), age: Math.random() * 2 });
    if (particles.length > target) particles.length = target;

    const wind = getWind();
    const [dx, dy] = flow(wind);
    // Velocidad en pantalla: visible con calma y más viva con viento fuerte.
    const pixelsPerSecond = 14 + Math.min(wind.speed, 30) * 1.8;
    const step = (pixelsPerSecond * dt) / v.scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const [x0, y0] = toScreen(v, p.x, p.y);
      p.x += dx * step;
      p.y += dy * step;
      p.age += dt;
      const [x1, y1] = toScreen(v, p.x, p.y);
      const outside = x1 < -20 || y1 < -20 || x1 > v.width + 20 || y1 > v.height + 20;
      if (p.age > p.life || outside) {
        particles[i] = spawn(v);
        continue;
      }
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  };

  const start = () => {
    if (frame || reduced.matches || document.hidden) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const redraw = () => {
    if (!reduced.matches) return;
    const v = getView();
    if (v) drawStatic(v);
  };

  readColor();
  new MutationObserver(() => {
    readColor();
    redraw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readColor();
    redraw();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduced.addEventListener('change', () => {
    particles = [];
    if (reduced.matches) {
      stop();
      redraw();
    } else start();
  });
  start();
  redraw();
  return { redraw };
}
