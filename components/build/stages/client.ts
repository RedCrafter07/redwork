import { build } from 'vite';
import { sharedPlugins } from '..';

export async function buildClient() {
	await build({
		appType: 'spa',
		root: './.redwork/generated/client',
		plugins: [...sharedPlugins],
		build: {
			outDir: '../../dist/client',
			emptyOutDir: true,
		},
		logLevel: 'error',
	});
}
