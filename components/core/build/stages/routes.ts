import { Router } from '../../../router';

export async function buildRoutes(routeDir: string) {
	const router = new Router({ routeDir });

	await router.writeRoutes(
		await router.generateRoutes(),
		'.redwork/generated/routes.ts',
	);

	return router;
}
