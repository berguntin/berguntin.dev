# AGENTS.md

Guía para cualquier agente de IA que trabaje en este repositorio. Léela entera antes de tocar nada.

Orden de precedencia: **lo que diga Hugo en la conversación** > este archivo > `.claude/skills/landing-page-design/SKILL.md` > las convenciones por defecto del agente.

## Reglas que no se saltan

1. **No instales, actualices ni elimines dependencias sin autorización explícita de Hugo.** Esto incluye `pnpm add`, `pnpm remove`, `pnpm update`, `pnpm dlx`, `npx` con paquetes que no estén ya instalados y cualquier cambio en `package.json` o `pnpm-lock.yaml` que añada o mueva versiones. Si crees que hace falta una dependencia, propónla primero con el motivo, el tamaño que añade y la alternativa sin ella. `pnpm install` para reproducir el lockfile existente sí está permitido.
2. **Solo pnpm.** No generes `package-lock.json` ni `yarn.lock`. La versión está fijada en `packageManager` de `package.json`.
3. **No bajes ni esquives `minimumReleaseAge`** (`pnpm-workspace.yaml`, 7 días). Es una defensa contra paquetes comprometidos recién publicados. Si una versión concreta es imprescindible antes de ese plazo, lo decide Hugo.
4. **No inventes datos de Hugo.** Todo el contenido biográfico sale de su CV de 2026 (*Hugo_Bermudez_CV_2026_Frontend_ES*). Nada de cifras, fechas, clientes ni resultados que no aparezcan ahí. Si falta un dato, pregunta.
5. **No hagas push a `main` ni abras PRs sin que Hugo lo pida.** Trabaja en ramas.
6. **Antes de dar algo por terminado**, ejecuta `pnpm check` y `pnpm build` y que ambos salgan sin errores ni avisos.

## El proyecto

Portafolio personal de **Hugo Bermúdez Guntín**, Frontend Engineer (Vue 3, Nuxt, TypeScript, IA aplicada). Se publicará en `https://berguntin.dev`. El público son personas que contratan o buscan perfiles frontend.

**Concepto:** Hugo es gallego, se crió en el mar y navega en **Láser**. La web es una travesía por la **ría de A Coruña**: la carta náutica es el fondo fijo de la página y, al hacer scroll, un Láser navega por ella. Su trayectoria se presenta como un recorrido de regata (salida, virada, balizas, equipo de tierra).

**Principio rector:** la web tiene que decir "soy developer" antes que parecer una app de mapas. Lo náutico es la personalidad, no el contenido. El texto siempre gana a la carta.

## Comandos

```sh
pnpm install   # reproduce el lockfile
pnpm dev       # http://localhost:4321
pnpm check     # comprobación de tipos (astro check)
pnpm build     # genera dist/
pnpm preview   # sirve dist/
```

Requiere Node ≥ 22.12 (lo exige Astro 7) y pnpm ≥ 10.16.

## Stack y decisiones técnicas

- **Astro 7 como base**, no Nuxt ni Next. Motivo: rendimiento y HTML estático sin JavaScript por defecto.
- **Vue** está integrado (`@astrojs/vue`) solo para islas interactivas que lo necesiten de verdad. Hoy no hay ninguna; no conviertas componentes a Vue sin motivo.
- **Sin librerías de animación** (nada de GSAP ni similares). Las animaciones son CSS y scripts propios pequeños.
- **CSS propio con tokens**, sin Tailwind. El CSS se inyecta inline (`build.inlineStylesheets: 'always'`).
- **Fuentes autoalojadas**: Geist y Geist Mono desde `@fontsource-variable`, solo el subconjunto latino.
- **Iconos**: Phosphor (`@phosphor-icons/core`), importados como SVG en crudo (`?raw`).
- **Peso objetivo**: la página ronda los 30 KB comprimida. Si un cambio lo dispara, justifícalo.
- **Contenido en Markdown** con Content Collections (`src/content.config.ts`).

## Estructura

```
src/
  pages/index.astro           Página única: carta, navegación, hero, recorrido, contacto, pie y compás
  layouts/Base.astro          <head>, metadatos, precarga de fuente, tema guardado, enlace de salto
  components/
    SeaChart.astro            Carta fija de fondo (costa, isobatas, Torre, derrota, estela, barco)
    Compass.astro             Compás fijo: rosa que gira con el rumbo, posición, corredera, viento
    SiteNav.astro             Navegación y botón de modo noche (icono de faro)
    Hero.astro                Hero minimalista
    Course.astro              Sección del recorrido: introducción, índice de tramos y paradas
    CourseStop.astro          Una parada del recorrido
    CourseLog.astro           Tabla "cuaderno de regata": condiciones, rumbo, aparejo, llegada, enlaces
    Contact.astro             Contacto con copia del correo
    SignalFlags.astro         Palabras escritas con banderas del Código Internacional de Señales
  content/recorrido/*.md      Un archivo por tramo del recorrido
  scripts/
    sea.ts                    Cámara de la carta, barco, estela y compás según el scroll
    laser.ts                  Geometría compartida del Láser (derrota, viradas, trimado de la vela)
    wind.ts                   Viento real de Open-Meteo con valor de referencia
    reveal.ts                 Aparición de bloques al entrar en pantalla
  data/ria-coruna.json        Costa e isobatas proyectadas (generado, no se edita a mano)
  styles/global.css           Tokens, temas, reset y estilos compartidos
scripts/build-chart.py        Genera src/data/ria-coruna.json desde OpenStreetMap
```

## Contenido del recorrido

Cada tramo es un `.md` en `src/content/recorrido/`. El nombre del archivo es el ancla (`#navertia`), así que usa nombres cortos sin números delante. Campos principales (esquema completo en `src/content.config.ts`):

- `order`, `mark` (`salida` | `virada` | `baliza` | `meta`), `badge` (S, V, 1, 2, 3, M), `label`, `title`, `role`, `place`, `period`, `status`.
- `waypoint` y `zoom`: índice del punto de la derrota de `SeaChart.astro` al que va la cámara en ese tramo y su zoom.
- `conditions` (el reto), `course` (qué hizo), `rig` (stack), `arrival` (resultados), `links`.
- `projects`: proyectos anidados con los mismos campos de tramo.
- El cuerpo Markdown es una frase de entrada corta con tono marinero.

Orden actual: salida (marketing 2013 → 2021), virada (DAW 2022), Navertia (mar 2022 → nov 2025), Saluzen (freelance desde nov 2025), proyectos propios, GDG Valencia.

**Cifras retiradas:** el CV de 2026 ya no recoge "1000+ usuarios concurrentes", "+20% de rendimiento", "menos de 4 semanas", "6 h" ni "~40 mascotas". No las vuelvas a poner.

## La carta y la navegación

- La costa es real: OpenStreetMap, procesada con `scripts/build-chart.py` (necesita `shapely`). La atribución "© colaboradores de OpenStreetMap" (ODbL) tiene que seguir visible en el pie.
- La derrota (`route` en `SeaChart.astro`) está **comprobada contra la costa**: todos los tramos van por agua. Si la cambias, verifica cada punto y cada segmento contra el polígono de tierra antes de darlo por bueno.
- Cada sección con `data-waypoint` y `data-zoom` es una parada de la cámara. `sea.ts` interpola entre ellas con un único listener de scroll pasivo limitado con `requestAnimationFrame`, y solo cambia atributos `transform` y el trazado de la estela. No añadas más listeners de scroll; para apariciones usa `IntersectionObserver`.
- El barco se dibuja a tamaño constante en pantalla aunque la carta haga zoom.
- Con `prefers-reduced-motion: reduce` la carta queda quieta y no hay animaciones.
- **Torre de Hércules:** su característica real es GpD(4)B 20s 23M, grupo de 4 destellos blancos cada 20 s y 23 millas de alcance (fuente: coruna.gal). La animación del faro reproduce ese patrón; no lo cambies.
- **Viento:** Open-Meteo, coordenadas de la ría, caché de 10 minutos en `sessionStorage` y valor de referencia (NE 12 kn) si falla, siempre indicado como "referencia". El viento orienta la flecha del compás y el trimado de la vela. "Nordés" solo se usa para viento del NE.

## Diseño

El sistema visual sigue `.claude/skills/landing-page-design/SKILL.md`. Lo más importante:

- **Tokens** en `src/styles/global.css`. Ningún color literal en componentes: todo sale de un token.
- **Temas:** claro en `:root`, oscuro redefinido en `@media (prefers-color-scheme: dark)` con `:root:not([data-theme='light'])` y otra vez en `:root[data-theme='dark']`. El botón del faro guarda la elección en `localStorage`. Mantén siempre los tres bloques.
- **Paleta de carta náutica:** fondo de mar casi blanco (de noche `#131209`), tinta casi negra, **magenta para luces, rumbos y acentos**, **naranja para balizas**. Las banderas de señales tienen colores fijos en ambos temas.
- **Tipografía:** solo Geist y Geist Mono (Mono para datos, coordenadas y etiquetas). Sin cursivas y sin pesos por encima de 600. Tamaños de la escala de Tailwind. `text-wrap: balance` en titulares y `pretty` en texto.
- **Espaciado** solo con la escala `--s-*`. Radios de la escala de Tailwind.
- **Sin gradientes de fondo.** El único gradiente es el del texto del titular del hero.
- **Movimiento:** curva `--ease-fluid` (`cubic-bezier(0.32, 0.72, 0, 1)`), nunca las transiciones por defecto.
- **Móvil:** la carta baja mucho de intensidad y el compás se reduce a la rosa. Nada debe provocar scroll horizontal.

## Textos

- Español de España, en primera persona y con tono cercano y directo.
- Mayúscula solo al principio en los titulares (no "Title Case").
- Sin guiones dentro de las frases, sin rayas para incisos y sin signos de exclamación.
- Evita los clichés de IA: "elevar", "sin fisuras", "potenciar", "next gen", "game changer"…
- El guiño marinero va en las etiquetas y en las frases de entrada; la información técnica tiene que entenderse sin saber de vela.

## Accesibilidad

- HTML semántico (`nav`, `main`, `section`, `article`, `footer`), un solo `h1` y jerarquía de encabezados correcta.
- Enlace "Saltar al contenido", foco siempre visible y estados hover, active y focus en todo lo interactivo.
- Los SVG decorativos llevan `aria-hidden="true"`; los que transmiten información, `role="img"` y una etiqueta.
- Los enlaces que abren otra pestaña lo anuncian con texto para lectores de pantalla.

## Historial de decisiones

1. Se descartó un concepto de metro de Valencia: no representa a Hugo. Se eligió vela y regata.
2. Astro en lugar de Nuxt, con Vue solo para islas.
3. Primer hero: carta protagonista con cartela, rosa y panel de viento. Se descartó por denso.
4. Mockup minimalista y después **carta como fondo que se recorre con el scroll y compás que gira con el rumbo**: es la dirección actual.
5. El tracker lateral del recorrido se eliminó porque la carta de fondo cumple esa función.
6. Se cambió de npm a pnpm con `minimumReleaseAge` de 7 días.

## Pendiente

- Texto de contacto: Hugo tiene que decidir si busca empleo, clientes freelance o ambos.
- Punto verde de disponibilidad en el hero: por confirmar.
- URL de la demo de Bill Splitter (el CV dice "Demo" sin enlace).
- Si Apotheke (en desarrollo) se muestra o se oculta.
- Sección "plano de vela": habilidades como partes del Láser.
- Versión en inglés con i18n.
- Imagen `og:image`, 404 temática ("Fuera de carta") y despliegue.
