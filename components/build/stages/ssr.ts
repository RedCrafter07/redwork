import { build } from 'vite';
import { sharedPlugins } from '..';

export async function buildSSR() {
	await build({
		appType: 'custom',
		root: './.redwork/generated/server',
		plugins: [...sharedPlugins],
		build: {
			outDir: '../../dist/ssr',
			ssr: true,
			ssrManifest: false,
			rollupOptions: {
				input: ['./.redwork/generated/server/entry-server.ts'],
			},
			emptyOutDir: true,
		},
		logLevel: 'error',
	});
}
