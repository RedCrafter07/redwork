import * as z from 'zod';
import { methods } from '../router/router';

const Disabled = z.object({ enabled: z.literal(false) });
const EnabledWithPath = (defaultPath: string) =>
	z.object({ enabled: z.literal(true), path: z.string().default(defaultPath) });

export const configSchema = z.object({
	routes: z
		.object({
			path: z.string().describe('Path to the routes directory.'),
		})
		.default({ path: './routes' }),

	api: z
		.union([Disabled, EnabledWithPath('./api')])
		.default({ enabled: false }),

	public: z
		.union([Disabled, EnabledWithPath('./public')])
		.default({ enabled: false }),

	routeParser: z
		.function(
			z.tuple([z.string({ description: 'The file path' })]),
			z.object({
				path: z.string(),
				method: methods,
			}),
		)
		.default((file) => ({
			method: 'get',
			path: `/${file
				.replace(/\\/g, '/')
				.replace(/(\/?)\.svelte$/g, '')
				.replace('$', ':')
				.replace(/index$/g, '')
				.replace(/\/$/g, '')}`,
		})),

	build: z
		.object({
			prerender: z
				.boolean()
				.describe(
					'If true, static html pages will be generated during build time. This can be turned off for routes individually. True by default.',
				)
				.default(true),
			ssr: z
				.boolean()
				.describe('Global SSR switch. This will disable SSR entirely if false.')
				.default(true),
		})
		.default({ prerender: true, ssr: true }),

	viteConf: z.string().optional().describe('The path for the Vite Config'),
});

export type Config = z.infer<typeof configSchema>;
export type ConfigInput = z.input<typeof configSchema>;
