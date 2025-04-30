import { join, relative } from 'pathe';
import type { Router } from '../../router';
import ssrRoute from '../../router/ssrRoute';
import { write } from 'bun';
import * as z from 'zod';

async function parseManifest(
	router: Router,
	ssrManifest: Record<string, [string]>,
	distDir: string,
) {
	const routes = await router.generateRoutes();

	const paths = routes.map((r) => ({
		...r,
		file: join(
			distDir,
			'ssr',
			ssrManifest[
				`${relative(join(distDir, 'ssr'), router.routeDir)}/${r.file}`
			]![0],
		),
	}));

	return paths;
}

const ssgReturn = z.boolean().or(z.undefined());

export async function buildSSG(
	router: Router,
	ssrManifest: Record<string, [string]>,
	ssg: boolean = true,
	distDir: string,
) {
	const manifest = await parseManifest(router, ssrManifest, distDir);

	const routes = (
		await Promise.all(
			manifest.map(async (r) => {
				const module = await import(r.file);

				const moduleSSG = ssgReturn.parse(module.ssg);

				return {
					...r,
					ssg: moduleSSG ?? ssg,
				};
			}),
		)
	).filter((r) => r.ssg);

	const ssgPages: { path: string; data: string }[] = await Promise.all(
		routes.map(async ({ path, file }) => {
			const ssr = await ssrRoute(
				'prod',
				path,
				join(distDir, './client/index.html'),
				join(distDir, './ssr/entry-server.js'),
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
