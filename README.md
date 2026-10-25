# berguntin.dev

Portafolio personal de Hugo Bermúdez. La carta del golfo Ártabro es el fondo de la página: al hacer scroll, un Láser navega una costera de la Torre de Hércules a Sada y un compás marca su rumbo.

## Desarrollo

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # genera dist/
pnpm check      # comprobación de tipos
```

Requiere Node ≥ 22.12 y pnpm ≥ 10.16. Las normas para trabajar en el proyecto, también para agentes de IA, están en [AGENTS.md](AGENTS.md).

## Stack

- [Astro](https://astro.build) como base, sin JavaScript por defecto. Vue queda configurado para las islas interactivas que lo necesiten.
- La carta es SVG generado a partir de la costa de OpenStreetMap (`scripts/build-chart.py` → `src/data/golfo-artabro.json`).
- La costera está en `src/data/costera.json` y se valida con `pnpm check:route`.
- El recorrido está en `src/content/recorrido/*.md`. Cada tramo indica su punto de la costera (`waypoint`) y el zoom de la cámara.
- Viento en directo de [Open-Meteo](https://open-meteo.com), con un valor de referencia si falla la petición.
- Geist y Geist Mono autoalojadas, iconos de Phosphor.

Costa © colaboradores de OpenStreetMap (ODbL).
