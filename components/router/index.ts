import { write } from 'bun';
import chalk from 'chalk';
import { watch } from 'chokidar';
import { glob } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { addRoute, createRouter, findRoute } from 'rou3';
import * as z from 'zod';

const defaultParser: RouteParser = (file) => {
	return {
		method: 'get',
		path: `/${file
			.replace(/\\/g, '/')
			.replace(/(\/?)\.svelte$/g, '')
			.replace('$', ':')
			.replace(/index$/g, '')
			.replace(/\/$/g, '')}`,
	};
};

export const methods = z.enum([
	'get',
	'post',
	'put',
	'patch',
	'delete',
	'connect',
	'options',
	'trace',
	'head',
]);

export class Router {
	routeDir: string;
	parser: RouteParser = defaultParser;
	glob: string = '**/*.svelte';

	/**
	 * @typedef {Object} RouterConfig
	 * @property {string} routeDir - The directory containing route files.
	 * @property {string} [glob] - Optional glob pattern for file matching.
	 * @property {typeof Router.prototype.parser} [parser] - Optional custom parser function.
	 */

	/**
	 * @param {RouterConfig} config - Configuration object.
	 * routeDir: The directory containing route files.
	 * glob: The pattern for file matching.
	 * parser: The route parser, transforming file paths to the proper routes of the site. The output should start with a "/". Consider looking into the rou3 documentation for details: https://github.com/h3js/rou3
	 */
	constructor(config: {
		routeDir: string;
		glob?: string;
		parser?: typeof Router.prototype.parser;
	}) {
		this.routeDir = resolve(config.routeDir);
		if (config.parser) this.parser = config.parser;
		if (config.glob) this.glob = config.glob;
	}

	watch(signal?: AbortSignal) {
		const watcher = watch('.', {
			cwd: this.routeDir,
			ignoreInitial: true,
		});

		const handleChange = async (event: 'add' | 'delete', filePath: string) => {
			switch (event) {
				case 'add':
					console.log(
						chalk.white(
							`${chalk.green('[+]')} Added route for ${chalk.magenta(
								this.parser(filePath).path,
							)} ${chalk.gray(join(this.routeDir, filePath))}`,
						),
					);
					break;
				case 'delete':
					console.log(
						chalk.white(
							`${chalk.red('[-]')} Deleted route for ${chalk.magenta(
								this.parser(filePath).path,
							)} ${chalk.gray(join(this.routeDir, filePath))}`,
						),
					);
					break;
			}
		};

		console.log(chalk.white(`${chalk.yellow('[/]')} Watcher started!`));

		watcher.on('add', (path) => handleChange('add', path));
		watcher.on('unlink', (path) => handleChange('delete', path));

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
				route: z.string(),
				path: z.string().min(1).startsWith('/'),
				method: methods,
			})
			.array();

		const generatedRoutes = files.map((f) => {
			const { method, path } = this.parser(f);

			return {
				path,
				method,
				route: f,
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
		await write(
			path,
			`export const routes = [${input
				.map(({ method, path, route }) => {
					return `{method:${JSON.stringify(method)},path:${JSON.stringify(
						path,
					)},route: () => import(${JSON.stringify(
						join(this.routeDir, route),
					)})}`;
				})
				.join(',')} ]`,
		);
	}
}

export type Methods = z.infer<typeof methods>;

export type RouteParser = (input: string) => {
	path: string;
	method: Methods;
};
