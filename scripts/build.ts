import { build } from 'tsup';
import { cp, exists, rm } from 'node:fs/promises';

if (await exists('./dist')) await rm('./dist', { recursive: true });

await build({
	outDir: './dist/src',
	external: ['vite', 'bun'],
	entry: [
		'./components/index.ts',
		'./components/config/index.ts',
		'./components/core/cli/index.ts',
		'./components/router/index.ts',
		'./components/server/index.ts',
	],
	keepNames: true,
	platform: 'node',
	sourcemap: true,
	format: ['esm'],
	bundle: true,
	dts: true,
	minify: 'terser',
	treeshake: 'recommended',
	shims: true,
});

await cp('./package.json', './dist/package.json');
await cp('./LICENSE', './dist/LICENSE');
await cp('./README.md', './dist/README.md');
