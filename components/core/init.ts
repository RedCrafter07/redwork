import { write } from 'bun';
import { dirname, join, relative } from 'pathe';

const clientEntry = (
	routeMethodPath: string,
) => `import { hydrate } from 'svelte';
import { getRoute } from '${routeMethodPath}';
// @ts-ignore
import { routes } from '../routes.ts';

getRoute(window.location.pathname, routes)
	?.data.file()
	.then((f) => {
		hydrate(f, {
			target: document.getElementById('root')!,
		});
	});
`;

const serverEntry = (
	routeMethodPath: string,
) => `import { render } from 'svelte/server';
import { getRoute } from '${routeMethodPath}';
// @ts-ignore
import { routes } from '../routes.ts';

export default async function (
	path: string,
	template: string,
): Promise<404 | string> {
	const route = getRoute(path, routes);

	if (!route) return 404;

	const { body, head } = render((await route.data.file()).default);

	template = template
		.replace('</head>', \`\${head}</head>\`)
		.replace('</div>', \`\${body}</div>\`);

	return template;
}
	`;

const templateHtml = `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="./entry-client.ts"></script>
	</body>
</html>
`;

async function writeClientEntry(path: string) {
	const relativePath =
		relative(dirname(path), join(import.meta.dir, '..', 'router')) +
		'/getRoute.ts';
	await write(path, clientEntry(relativePath));
}

async function writeServerEntry(path: string) {
	const relativePath =
		relative(dirname(path), join(import.meta.dir, '..', 'router')) +
		'/getRoute.ts';
	await write(path, serverEntry(relativePath));
}

async function writeTemplateHtml(path: string) {
	await write(path, templateHtml);
}

export async function init(pwd: string) {
	const redworkPath = join(pwd, './.redwork');
	const clientPath = join(redworkPath, 'client');
	const serverPath = join(redworkPath, 'server');

	const templateName = 'index.html';
	const clientEntryName = 'entry-client.ts';
	const serverEntryName = 'entry-server.ts';

	writeClientEntry(join(clientPath, clientEntryName));
	writeServerEntry(join(serverPath, serverEntryName));
	writeTemplateHtml(join(clientPath, templateName));
}
