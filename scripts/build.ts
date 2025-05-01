import { build } from 'tsup';
import { cp, exists, rm } from 'node:fs/promises';
import { Glob } from 'bun';

if (await exists('./dist')) await rm('./dist', { recursive: true });

await build({
	outDir: './dist/src',
	external: ['vite', 'bun'],
	entry: [
		'./components/index.ts',
		'./components/config/index.ts',
		'./components/core/cli/index.ts',
	],
	keepNames: true,
	platform: 'node',
	sourcemap: true,
	format: ['cjs', 'esm'],
	bundle: true,
	dts: true,
	minify: 'terser',
	treeshake: 'recommended',
	shims: true,
	outExtension({ format }) {
		return {
			js: format === 'cjs' ? '.cjs' : '.mjs',
		};
	},
});

const glob = new Glob('**/*.*');

const files = await Array.fromAsync(
	await glob.scanSync({ cwd: './dist/src', onlyFiles: true }),
);

await cp('./package.json', './dist/package.json');
