import { join, resolve } from 'pathe';
import type { Router } from '../../router';
import ssrRoute from '../../router/ssrRoute';
import { write } from 'bun';

export async function buildSSG(router: Router, ssg: boolean = true) {
	const routes = (
		await Promise.all(
			(
				await router.generateRoutes()
			).map(async (r) => {
				const route = await import(join(router.routeDir, r.file));

				return {
					...r,
					ssg: route.ssg !== undefined ? route.ssg : ssg,
				};
			}),
		)
	).filter((r) => r.ssg);

	const ssgPages: { path: string; data: string }[] = await Promise.all(
		routes.map(async ({ path, file }) => {
			const ssr = await ssrRoute(
				'prod',
				path,
				resolve('./.redwork/dist/client/index.html'),
				resolve('./.redwork/dist/ssr/entry-server.js'),
			);

			if (ssr !== 404) return { path: path, data: ssr };
			else throw new Error(`Route not found: ${path} (${file})`);
		}),
	);

	for await (const page of ssgPages) {
		let pageName = page.path.slice(1);

		if (pageName.trim().length === 0) pageName = 'index';

		await write(join('./.redwork/dist/ssg', `${pageName}.html`), page.data);
	}
}
