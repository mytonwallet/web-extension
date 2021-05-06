import serve from 'rollup-plugin-serve';
import copy from 'rollup-plugin-copy';
import watchAssets from 'rollup-plugin-watch-assets';
import postcss from 'rollup-plugin-postcss';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import livereload from 'rollup-plugin-livereload';
import preprocess from 'svelte-preprocess';

const production = !process.env.ROLLUP_WATCH;

const config = [{
  input: 'src/popup.js',
  output: {
    file: 'dist/popup.js',
    name: 'popup',
    format: 'iife'
  },
  plugins: [
    svelte({
      emitCss: true,
      preprocess: preprocess()
    }),
    // add the postccs plugin
    postcss({
      extract: true,
      minimize: production,
      sourceMap: !production
    }),
    copy({
      targets: [
        { src: 'src/manifest.json', dest: 'dist/' },
        { src: 'src/*.html', dest: 'dist/' },
        { src: 'src/_locales', dest: 'dist/' },
        { src: 'src/assets', dest: 'dist/' },
        { src: './node_modules/webextension-polyfill/dist/browser-polyfill.js', dest: 'dist/' },
        { src: './node_modules/roboto-fontface/fonts/roboto', dest: 'dist/fonts' },
        { src: './node_modules/chota/dist/chota.min.css', dest: 'dist/' }
      ]
    }),
    commonjs(),
    json(),
    !production && watchAssets({ assets: ['src'] }),
    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    resolve({ browser: true }),
  ],
  watch: {
    clearScreen: false
  }
},{
  input: 'src/page.js',
  output: {
    file: 'dist/page.js',
    name: 'app',
    format: 'iife'
  },
  plugins: [
    svelte({
      emitCss: true,
      preprocess: preprocess()
    }),
    // add the postccs plugin
    postcss({
      extract: true,
      minimize: production,
      sourceMap: !production
    }),
    commonjs(),
    json(),
    !production && watchAssets({ assets: ['src'] }),
    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    resolve({ browser: true }),
  ],
  watch: {
    clearScreen: false
  }
},{
  input: 'src/content.js',
  output: {
    file: 'dist/content.js',
    name: 'content',
    format: 'iife'
  },
  plugins: [
    commonjs(),
    json(),
    !production && watchAssets({ assets: ['src'] }),
    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    resolve({ browser: true }),
  ],
  watch: {
    clearScreen: false
  }
},{
  input: 'src/background.js',
  output: {
    file: 'dist/background.js',
    name: 'background',
    format: 'iife'
  },
  plugins: [
    copy({targets: [{ src: './node_modules/@tonclient/lib-web/tonclient.wasm', dest: 'dist/' }]}),
    commonjs(),
    json(),
    !production && watchAssets({ assets: ['src'] }),
    !production && copy({targets: [{ src: 'tools/chromereload.js', dest: 'dist/' }]}),
    !production && copy({targets: [{ src: './node_modules/livereload-js/dist/livereload.js', dest: 'dist/' }]}),
    !production && serve('dist') && livereload({watch: 'dist', verbose: false}),
    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    resolve({ browser: true }),
  ],
  watch: {
    clearScreen: false
  }
}
];

export default config;
