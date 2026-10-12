# berguntin.dev

Portafolio personal de Hugo Bermúdez. Una carta náutica de la ría de A Coruña con un Láser navegando un campo de regatas orientado por el viento real.

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
- Viento en directo de [Open-Meteo](https://open-meteo.com), con un valor de referencia si falla la petición.
- Geist y Geist Mono autoalojadas, iconos de Phosphor.

Costa © colaboradores de OpenStreetMap (ODbL).
