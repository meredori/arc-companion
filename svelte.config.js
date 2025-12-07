import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      strict: true
    }),
    alias: {
      $lib: 'src/lib'
    },
    prerender: {
      handleHttpError: ({ status, path, referrer }) => {
        const allowlisted404 = ['/admin', '/favicon.svg'];

        if (status === 404 && allowlisted404.includes(path)) {
          return;
        }

        throw new Error(`${status} ${path}${referrer ? ` (linked from ${referrer})` : ''}`);
      }
    }
  }
};

export default config;
