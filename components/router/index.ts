import { write } from 'bun';
import { watch } from 'chokidar';
import type { RouterMethod } from 'h3';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { addRoute, createRouter, findRoute } from 'rou3';
import * as z from 'zod';

const defaultParser: RouteParser = (file) => {
	return {
		method: 'get',
		route: `/${file
			.replace(/\\/g, '/')
			.replace(/(\/?)\.svelte$/g, '')
			.replace('$', ':')
			.replace(/index$/g, '')
			.replace(/\/$/g, '')}`,
	};
};

export const methods = z.enum(['get', 'post', 'put', 'patch', 'delete']);

class Router {
	routeDir: string;
	parser: RouteParser;

	/**
	 * @param {string} routeDir The directory the routes are placed in
	 * @param {RouteParser} [parser] - The route parser, transforming file paths to the proper routes of the site. The output should start with a "/". Consider looking into the rou3 documentation for details: https://github.com/h3js/rou3
	 */
	constructor(routeDir: string, parser?: typeof this.parser) {
		this.routeDir = path.resolve(routeDir);
		this.parser = parser ?? defaultParser;
	}

	watch(signal?: AbortSignal) {
		const watcher = watch('.', {
			cwd: this.routeDir,
			ignoreInitial: true,
		});

		const handleChange = async () => {
			console.log(await this.generateRoutes());
		};

		watcher.on('add', handleChange);
		watcher.on('unlink', handleChange);

		signal?.addEventListener('abort', () => {
			watcher.close();
		});
	}

	/**
	 * @description Compiles folder contents to a route array
	 */
	async generateRoutes() {
		const data = glob('**/*.svelte', {
			cwd: this.routeDir,
		});

		const files = await Array.fromAsync(data); // yeah, array, duh

		const schema = z
			.object({
				path: z.string(),
				route: z.string().min(1).startsWith('/'),
				method: methods,
			})
			.array();

		const generatedRoutes = files.map((f) => {
			const { method, route } = this.parser(f);

			return {
				path: f,
				method,
				route,
			};
		});

		// validate data, in case parser hasn't been implemented properly
		return schema.parse(generatedRoutes);
	}

	/**
	 * @description Write the routes to a file, later to be used by the proper front/backend routers
	 * @param input The input from the generateRoutes function
	 */
	async writeRoutes(
		input: Awaited<ReturnType<typeof this.generateRoutes>>,
		path: string,
	) {
		await write(path, `const routes = ${JSON.stringify(input)}`);
	}

	/**
	 * @description Matches a given route to the provided routes. Intended for use in front/backend routers
	 */
	static getRoute(
		route: string,
		routes: Awaited<ReturnType<typeof this.prototype.generateRoutes>>,
	) {
		const router = createRouter<{ file: string }>();

		routes.forEach((r) => {
			addRoute(router, 'get', r.route, { file: r.path });
		});

		return findRoute(router, 'get', route);
	}
}

type RouteParser = (input: string) => {
	route: string;
	method: z.infer<typeof methods>;
};

export type { RouteParser };
export { Router };
