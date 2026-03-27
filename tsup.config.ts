import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  skipNodeModulesBundle: true,
  minify: true,
  external: ['extreme-router']
});
