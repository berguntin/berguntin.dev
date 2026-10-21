# berguntin.dev

Portafolio personal de Hugo Bermúdez. La carta de la ría de A Coruña es el fondo de la página: al hacer scroll, un Láser navega por ella y un compás marca su rumbo.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run check    # comprobación de tipos
```

## Stack

- [Astro](https://astro.build) como base, sin JavaScript por defecto. Vue queda configurado para las islas interactivas que lo necesiten.
- La carta es SVG generado a partir de la costa de OpenStreetMap (`scripts/build-chart.py` → `src/data/ria-coruna.json`).
- El recorrido está en `src/content/recorrido/*.md`. Cada tramo indica su punto de la derrota (`waypoint`) y el zoom de la cámara.
- Viento en directo de [Open-Meteo](https://open-meteo.com), con un valor de referencia si falla la petición.
- Geist y Geist Mono autoalojadas, iconos de Phosphor.

Costa © colaboradores de OpenStreetMap (ODbL).
