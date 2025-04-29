import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { type PluginOption } from 'vite';
import ora from 'ora';
import { init } from '../core/init';
import { buildRoutes } from './stages/routes';
import { buildClient } from './stages/client';
import { buildSSR } from './stages/ssr';
import { buildSSG } from './stages/ssg';
import { exists, rm } from 'node:fs/promises';
import { resolve } from 'pathe';

export const sharedPlugins: PluginOption[] = [
	svelte({ preprocess: vitePreprocess() }),
];

export default async function build(options: {
	ssg: boolean;
	ssr: boolean;
	routeDir: string;
}) {
	const { ssr, ssg, routeDir } = options;

	const spinner = ora({
		spinner: 'circleHalves',
		discardStdin: true,
		text: 'Building for production...',
		interval: 100,
	});

	spinner.start();

	spinner.text = 'Checking for previous dist directory...';

	const distDir = resolve('./.redwork/dist');

	console.log(distDir);

	if (await exists(distDir)) {
		spinner.text = 'Deleting previous dist directory...';
		await rm(distDir, { recursive: true });
	}

	spinner.text = 'Initializing...';

	await init('.');

	spinner.text = 'Generating routes...';

	const router = await buildRoutes(routeDir);

	spinner.text = 'Building client...';

	await buildClient();

	if (ssr) {
		spinner.text = 'Building SSR...';

		await buildSSR();
	} else spinner.text = 'Skipping SSR build...';

	spinner.text = 'Prerendering pages...';

	await buildSSG(router, ssg);

	spinner.succeed('Build successfully concluded!');
}

build({ ssr: true, ssg: true, routeDir: './routes' });
