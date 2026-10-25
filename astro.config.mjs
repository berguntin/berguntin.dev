// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://berguntin.dev',
  integrations: [vue()],
  build: {
    // Página ligera: el CSS va inline para evitar peticiones que bloqueen el render.
    inlineStylesheets: 'always',
  },
});
