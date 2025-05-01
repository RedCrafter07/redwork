import { write } from 'bun';
import { join } from 'pathe';

const clientEntry = `import { hydrate } from 'svelte';
import { getRoute } from 'redwork/router';
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

const serverEntry = `import { render } from 'svelte/server';
import { getRoute } from 'redwork/router';
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
	await write(path, clientEntry);
}

async function writeServerEntry(path: string) {
	await write(path, serverEntry);
}

async function writeTemplateHtml(path: string) {
	await write(path, templateHtml);
}

export async function init(pwd: string) {
	const assetsPath = join(pwd, './.redwork', 'generated');
	const clientPath = join(assetsPath, 'client');
	const serverPath = join(assetsPath, 'server');

	const templateName = 'index.html';
	const clientEntryName = 'entry-client.ts';
	const serverEntryName = 'entry-server.ts';

	writeClientEntry(join(clientPath, clientEntryName));
	writeServerEntry(join(serverPath, serverEntryName));
	writeTemplateHtml(join(clientPath, templateName));
}
