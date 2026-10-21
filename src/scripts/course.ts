// Recorrido de boyas: marca la parada que se está leyendo y lleva el Láser del tracker hasta ella.
import { buildLegs, locate, placeBoat, type Point } from './laser';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function trackCourse() {
  const stops = [...document.querySelectorAll<HTMLElement>('[data-stop]')];
  const svg = document.querySelector<SVGSVGElement>('.tracker svg');
  const boat = document.getElementById('tracker-boat');
  const boom = document.getElementById('tracker-boom');
  const wake = document.getElementById('tracker-wake');
  if (!stops.length || !svg || !boat || !boom || !wake) return;

  const legs = buildLegs(JSON.parse(svg.dataset.track ?? '[]') as Point[]);
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  const badges = new Map(
    [...svg.querySelectorAll<SVGGElement>('[data-stop-badge]')].map((el) => [el.dataset.stopBadge!, el]),
  );
  const links = new Map(
    [...document.querySelectorAll<HTMLAnchorElement>('[data-stop-link]')].map((el) => [el.dataset.stopLink!, el]),
  );

  let distance = 0;
  let frame = 0;
  const draw = (d: number) => {
    const { x, y, heading } = locate(legs, d, { loop: false, turnRadius: 10 });
    placeBoat(boat, boom, x, y, heading, 1.2);
    wake.style.setProperty('--wake', String(1 - d / total));
  };

  // Navegación con inercia hacia la parada: rápido al salir, suave al llegar.
  const sailTo = (target: number) => {
    cancelAnimationFrame(frame);
    if (reduced.matches) {
      distance = target;
      draw(distance);
      return;
    }
    const from = distance;
    const duration = Math.min(1600, 500 + Math.abs(target - from) * 4);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      distance = from + (target - from) * (1 - Math.pow(1 - t, 4));
      draw(distance);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  const activate = (id: string) => {
    const index = stops.findIndex((stop) => stop.id === id);
    stops.forEach((stop, i) => {
      badges.get(stop.id)?.classList.toggle('is-rounded', i <= index);
      const link = links.get(stop.id);
      if (i === index) link?.setAttribute('aria-current', 'step');
      else link?.removeAttribute('aria-current');
    });
    sailTo(Number(badges.get(id)?.dataset.distance ?? 0));
  };

  draw(0);
  // La parada activa es la que cruza una franja estrecha a media pantalla.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) activate(entry.target.id);
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  stops.forEach((stop) => observer.observe(stop));
}

// Aparición al entrar en pantalla. Solo se oculta lo que aún está por debajo del pliegue,
// así la página se ve completa aunque el script no llegue a ejecutarse.
function reveal() {
  if (reduced.matches) return;
  const pending = [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
    (el) => el.getBoundingClientRect().top > window.innerHeight,
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 },
  );
  for (const el of pending) {
    el.classList.add('is-pending');
    observer.observe(el);
  }
}

trackCourse();
reveal();
