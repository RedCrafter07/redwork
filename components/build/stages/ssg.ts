import { join, resolve } from 'pathe';
import type { Router } from '../../router';
import ssrRoute from '../../router/ssrRoute';
import { write } from 'bun';
import { compile } from 'svelte/compiler';

async function getSSGFromModule(path: string): Promise<boolean | undefined> {
	try {
		const code = await Bun.file(path).text();
		const result = compile(code, {
			generate: 'server',
		});

		const ssgMatch = result.js.code.match(
			/export\s+const\s+ssg\s*=\s*(true|false)/,
		);

		if (!ssgMatch) return undefined;
		return ssgMatch[1] === 'true';
	} catch (error) {
		console.error(`Error processing ${path}:`, error);
		return undefined;
	}
}

export async function buildSSG(router: Router, ssg: boolean = true) {
	const routes = (
		await Promise.all(
			(
				await router.generateRoutes()
			).map(async (r) => {
				const useSSG = await getSSGFromModule(join(router.routeDir, r.file));

				return {
					...r,
					ssg: useSSG ?? ssg,
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
