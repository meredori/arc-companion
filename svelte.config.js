import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');

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
      base: dev ? '' : process.env.BASE_PATH ?? ''
    }
  }
};

export default config;
