import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { type PluginOption } from 'vite';
import ora from 'ora';
import { init } from '../core/init';
import { buildRoutes } from './stages/routes';
import { buildClient } from './stages/client';
import { buildSSR } from './stages/ssr';
import { buildSSG } from './stages/ssg';
import { exists, rm } from 'node:fs/promises';
import { join, resolve } from 'pathe';
import { createConsola } from 'consola';
import { file } from 'bun';

export const sharedPlugins: PluginOption[] = [
	svelte({ preprocess: vitePreprocess() }),
];

export default async function build(options: {
	ssg: boolean;
	routeDir: string;
}) {
	const consola = createConsola();

	const { ssg, routeDir } = options;

	const spinner = ora({
		spinner: 'circleHalves',
		discardStdin: true,
		interval: 100,
	});

	spinner.start('Checking for previous dist directory...');
	const distDir = resolve('./.redwork/dist');
	spinner.succeed();

	if (await exists(distDir)) {
		spinner.start('Deleting previous dist directory...');
		await rm(distDir, { recursive: true });
		spinner.succeed();
	}

	spinner.start('Initializing...');
	await init('.');
	spinner.succeed();

	spinner.start('Generating routes...');
	const router = await buildRoutes(routeDir);
	spinner.succeed();

	spinner.start('Building client...');
	await buildClient();
	spinner.succeed();

	spinner.start('Building SSR...');
	await buildSSR();
	spinner.succeed();

	spinner.start('Reading SSR manifest...');
	const manifest = JSON.parse(
		await file(join(distDir, 'ssr', '.vite', 'ssr-manifest.json')).text(),
	);
	spinner.succeed();

	spinner.start('Prerendering pages...');
	await buildSSG(router, manifest, ssg, distDir);
	spinner.succeed();

	consola.success('Build completed successfully!');
}

build({ ssg: true, routeDir: './routes' });
