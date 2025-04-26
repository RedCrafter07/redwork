import type { Serve } from 'bun';
import { getPort } from 'get-port-please';
import { toWebHandler, type App } from 'h3';

export async function useBun(app: App) {
	const port = await getPort({
		port: 3000,
		portRange: [3000, 3007],
		random: true,
	});

	const handler = toWebHandler(app);

	return {
		port,
		fetch: (request) => handler(request),
	} satisfies Serve;
}
