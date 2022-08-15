import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./src/index.ts', './src/cli.ts'],
	format: ['esm'],
	target: 'node16',
	clean: true,
	sourcemap: true,
});
