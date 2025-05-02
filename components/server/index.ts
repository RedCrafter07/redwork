import 'dotenv';
import { createServer, type ViteDevServer } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { loadConfig } from '../config/load';
import ssrRoute from '../router/ssrRoute';
import { defineEventHandler, fromNodeMiddleware, type EventHandler } from 'h3';
import { init } from '../core/init';
import { Router } from '../router/router';
import { resolve } from 'path';

const config = await loadConfig();

function generateSSR(dev: boolean, vite?: ViteDevServer) {
	return defineEventHandler(async (event) => {
		const data = await ssrRoute(
			dev ? 'dev' : 'prod',
			event.path,
			'./.redwork/generated/client/index.html',
			'./.redwork/generated/server/entry-server.ts',
			vite,
		);

		if (data !== 404) {
			return data;
		}
	});
}

export async function createMiddleware() {
	/**
	 * An instance of vite's dev server in middleware mode. Only provided in dev.
	 */

	const isDev = process.env.NODE_ENV !== 'production';

	let vite: ViteDevServer | undefined = undefined;
	let clientAssets: EventHandler | undefined = undefined;

	const router = new Router({
		routeDir: config.routes.path,
		parser: config.routeParser,
	});

	await init('.');

	if (isDev) {
		vite = await createServer({
			plugins: [svelte({ preprocess: vitePreprocess() })],
			root: resolve('.redwork/generated/client'),
			server: {
				middlewareMode: true,
			},
			appType: 'custom',
			mode: isDev ? 'development' : 'production',
		});

		clientAssets = fromNodeMiddleware(vite.middlewares);

		await router.watch(async (routes) => {
			await router.writeRoutes(routes, './.redwork/generated/routes.ts');
		});
	}

	const client = generateSSR(isDev, vite);
	const server = undefined;

	return { clientAssets, client, server, vite };
}
