import { addRoute, createRouter, findRoute } from 'rou3';

/**
 * @description Matches a given route to the provided routes. Intended for use in front/backend routers
 */
export function getRoute(
	route: string,
	routes: {
		method: string;
		path: string;
		file: () => any;
	}[],
	nodeEnv?: string,
) {
	const router = createRouter<{ file: () => Promise<any> }>();

	routes.forEach((r) => {
		addRoute(router, 'get', r.path, { file: r.file });
	});

	return findRoute(router, 'get', route);
}
