import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['cjs', 'esm'],
  onSuccess: 'pnpm start',
  clean: true,
  minify: true,
  sourcemap: true,

})