import path from 'path';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const components = [
  'dialog',
  'drawer',
  'dropdown',
  'menu',
  'menu-item',
  'checkbox',
  'divider',
  'menu-label',
  'option',
  'select',
  'tooltip',
  'card',
  'icon-button',
  'button',
  'icon',
  'alert',
  'input',
  'spinner',
  'avatar',
  'skeleton',
];
const exclude = components.map(
  c => `@shoelace-style/shoelace/dist/components/${c}/${c}.js`
);
export default defineConfig({
  optimizeDeps: {
    exclude: [
      ...exclude,
      '@holochain-open-dev/elements/dist/elements/display-error.js',
    ],
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint --ext .ts,.html src',
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(
            __dirname,
            '../../node_modules/@shoelace-style/shoelace/dist/themes/light.css'
          ),
          dest: path.resolve(__dirname, 'dist'),
          rename: 'styles.css',
        },
        {
          src: path.resolve(__dirname, './icon.png'),
          dest: path.resolve(__dirname, 'dist'),
        },
      ],
    }),
  ],
  build: {
    target: 'es2020',
    lib: {
      formats: ['es'],
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'index',
      fileName: () => 'index.js',
    },
  },
});
