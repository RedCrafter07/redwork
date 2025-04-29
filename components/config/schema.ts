import * as z from 'zod';
import { methods } from '../router';

export const configSchema = z.object({
	frontend: z
		.object({
			path: z.string(),
		})
		.default({
			path: './routes',
		}),

	api: z.union([
		z.object({
			enabled: z.literal(false),
		}),
		z.object({
			enabled: z.literal(true),
			path: z.string().default('./api'),
		}),
	]),

	public: z
		.object({
			path: z.string(),
		})
		.default({
			path: './public',
		}),

	routeParser: z
		.function(
			z.tuple([z.string({ description: 'The file path' })]),
			z.object({
				path: z.string(),
				method: methods,
			}),
		)
		.default((file) => {
			return {
				method: 'get',
				path: `/${file
					.replace(/\\/g, '/')
					.replace(/(\/?)\.svelte$/g, '')
					.replace('$', ':')
					.replace(/index$/g, '')
					.replace(/\/$/g, '')}`,
			};
		})
		.optional(),

	build: z
		.object({
			prerender: z
				.boolean()
				.describe(
					'If true, static html pages will be generated during build time. This can be turned off for routes individually. True by default.',
				),
			ssr: z
				.boolean()
				.describe(
					'Global SSR switch. This will disable SSR entirely if false.',
				),
		})
		.default({ prerender: true, ssr: true }),
});

export type Config = z.infer<typeof configSchema>;
