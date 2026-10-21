import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { WAYPOINTS } from './scripts/regatta-course';

const result = z.object({
  value: z.string().optional(),
  label: z.string(),
});

const leg = {
  conditions: z.string(),
  course: z.string(),
  rig: z.array(z.string()).default([]),
  arrival: z.array(result).default([]),
  links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
};

// Cada tramo del recorrido es una parada del campo de regatas.
const recorrido = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/recorrido' }),
  schema: z.object({
    order: z.number(),
    mark: z.enum(['salida', 'virada', 'baliza', 'meta']),
    badge: z.string().max(2),
    label: z.string(),
    title: z.string(),
    role: z.string().optional(),
    place: z.string().optional(),
    period: z.string(),
    status: z.enum(['en-curso', 'proximamente']).optional(),
    // Punto de la regata (src/scripts/regatta-course.ts) al que va la cámara en este tramo, y su zoom.
    waypoint: z.enum(WAYPOINTS),
    zoom: z.number().positive().default(1.5),
    ...leg,
    projects: z
      .array(z.object({ title: z.string(), tag: z.string().optional(), ...leg }))
      .default([]),
  }),
});

export const collections = { recorrido };
