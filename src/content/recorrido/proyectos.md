---
order: 5
mark: baliza
badge: '2'
label: Baliza 2 · sotavento
title: Proyectos propios
role: Lo que navego por mi cuenta
waypoint: sotavento
zoom: 1.8
period: 2024 → hoy
conditions: Ideas propias para probar arquitecturas, IA aplicada y herramientas que yo mismo quería usar.
course: Llevo cada proyecto de la idea a un MVP desplegado, con tests y con la IA integrada vía API cuando aporta algo.
rig: [Nuxt, Vue 3, TypeScript, Vitest, Playwright]
projects:
  - title: Find Your Pet
    tag: Hackathon solidaria · DANA 2024
    conditions: Tras la DANA de Valencia hacía falta un tablón de mascotas perdidas y encontradas.
    course: Búsqueda semántica y por foto con embeddings multimodales de Gemini en Postgres con pgvector, moderación automática de anuncios con OpenAI y formulario que se rellena a partir de la foto. Nuxt fullstack con arquitectura hexagonal en un monolito modular, contratos con zod, outbox de eventos y jobs programados.
    rig: [Nuxt, TypeScript, Postgres, pgvector, Supabase, Upstash Redis, Cloudinary, Vercel, OpenAI, Gemini]
    links:
      - label: Código en GitHub
        href: https://github.com/berguntin/find-your-pet
  - title: Sail Trim Simulator
    tag: Vela
    conditions: Entender cómo cambia la vela al tocar escotas, carro, backstay o barber sin tener que salir al agua.
    course: Simulador interactivo que muestra la forma de la vela en 2D y 3D y su efecto en velocidad, escora y VMG. Usa un modelo físico basado en los coeficientes de fuerza de Marchaj y el modelo aerodinámico del VPP de ORC, y carga las polares reales de tu barco por número de vela con la API de ORC.
    rig: [Vue 3, TypeScript, Pinia, Three.js, Vitest, API de ORC]
    links:
      - label: Probar el simulador
        href: https://sail-trim-simulator.vercel.app
      - label: Código en GitHub
        href: https://github.com/berguntin/sail-trim-simulator
  - title: Affiliates Manager
    tag: MVP desplegado
    conditions: Gestionar canales de ofertas de Amazon con enlaces de afiliado en Telegram y WhatsApp sin hacerlo todo a mano.
    course: Back office mobile first que detecta ofertas por temática con filtros de precio, valoración y descuento, avisa de descuentos poco fiables y tiene cola de revisión para editar, programar y publicar. Redacta los textos con Claude, los valida antes de publicar y usa una plantilla de respaldo si la IA falla.
    rig: [Nuxt 4, Nuxt UI, Cloudflare Workers, D1, Drizzle ORM, Cron Triggers, Vitest, Anthropic API]
    links:
      - label: Código en GitHub
        href: https://github.com/berguntin/affiliates-manager
  - title: Bill Splitter
    tag: MVP desplegado
    conditions: Repartir la cuenta de una cena cuadrando al céntimo.
    course: Haces una foto al ticket, marcas quién tomó qué y cada comensal ve lo que debe. Lee el ticket con Claude Haiku para contener el coste por escaneo y reintenta con Claude Sonnet si el resultado no es fiable, con structured outputs para obtener siempre el mismo JSON. Monorepo con un motor de reparto independiente del framework y tests E2E con Playwright.
    rig: [Vue 3, TypeScript, Tailwind, Node, Express, MongoDB, Playwright, Railway, Claude API]
    links:
      - label: Código en GitHub
        href: https://github.com/berguntin/bill-splitter
  - title: Apotheke
    tag: En desarrollo
    conditions: Encontrar la farmacia de guardia más cercana con datos fiables.
    course: Buscador de farmacias de guardia por cercanía, con datos actualizados a diario desde los colegios oficiales de farmacéuticos de cada provincia.
---

Los entrenamientos de entre semana. Aquí pruebo lo que luego llevo a producción, y uno de ellos es, cómo no, de vela.
