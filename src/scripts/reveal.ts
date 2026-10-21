// Aparición al entrar en pantalla. Solo se oculta lo que aún está por debajo del pliegue,
// así la página se ve completa aunque el script no llegue a ejecutarse.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
