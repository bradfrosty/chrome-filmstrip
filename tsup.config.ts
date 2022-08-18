import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./src/index.ts', './src/cli.ts'],
	format: ['esm'],
	target: 'node16',
	clean: true,
	dts: true,
	sourcemap: true,
	banner: {
		// fixes a CJS dependency using dynamic require
		js: `import { createRequire } from 'module'; const require=createRequire(import\.meta.url);`,
	},
});
