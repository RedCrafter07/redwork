import type { ViteDevServer } from 'vite';

export default async function ssrRoute(
	mode: 'dev' | 'prod',
	path: string,
	htmlPath: string,
	modulePath: string,
	devServer?: ViteDevServer,
) {
	if (mode === 'dev' && devServer) {
		const viteHtml = await devServer.transformIndexHtml(
			path,
			await Bun.file(htmlPath).text(),
		);

		const { default: render } = (await devServer.ssrLoadModule(modulePath)) as {
			default: (path: string, template: string) => Promise<404 | string>;
		};

		return await render(path, viteHtml);
	} else {
		const { default: render } = await import(modulePath);

		return (await render(path, await Bun.file(htmlPath).text())) as
			| 404
			| string;
	}
}
