import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');
const basePath = dev ? '' : process.env.BASE_PATH ?? '/arc-companion';

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
    paths: {
      base: basePath,
      assets: basePath
    },
    prerender: {
      handleHttpError: ({ status, path, referrer }) => {
        if (status === 404 && path === '/admin') {
          return;
        }

        throw new Error(`${status} ${path}${referrer ? ` (linked from ${referrer})` : ''}`);
      }
    }
  }
};

export default config;
