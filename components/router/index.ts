import { write } from 'bun';
import chalk from 'chalk';
import { watch } from 'chokidar';
import { glob } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'pathe';
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

	watch(
		callback: (routes: Awaited<ReturnType<typeof this.generateRoutes>>) => void,
		signal?: AbortSignal,
	) {
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
					callback(await this.generateRoutes());
					break;
				case 'delete':
					console.log(
						chalk.white(
							`${chalk.red('[-]')} Deleted route for ${chalk.magenta(
								this.parser(filePath).path,
							)} ${chalk.gray(join(this.routeDir, filePath))}`,
						),
					);
					callback(await this.generateRoutes());
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
				file: z.string(),
				path: z.string().min(1).startsWith('/'),
				method: methods,
			})
			.array();

		let generatedRoutes = files.map((f) => {
			const { method, path } = this.parser(f);

			return {
				path,
				method,
				file: f.replaceAll('\\', '/'),
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
		locationOverride?: string,
	) {
		await write(
			path,
			`export const routes = [${input
				.map(({ method, path: routePath, file }) => {
					const routeFile = join(locationOverride ?? this.routeDir, file);
					let importPath = relative(dirname(resolve(path)), routeFile);

					if (!importPath.startsWith('.')) {
						importPath = './' + importPath;
					}

					return `{method:${JSON.stringify(method)},path:${JSON.stringify(
						routePath,
					)},file: () => import(${JSON.stringify(importPath)})}`;
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
