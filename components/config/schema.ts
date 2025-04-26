import * as z from 'zod';

export const configSchema = z.object({
	frontend: z.object({
		path: z.string().default('./src'),
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

	dirs: z
		.object({
			redworkFolder: z.string(),
		})
		.default({
			redworkFolder: './.redwork/',
		}),
});

export type Config = z.infer<typeof configSchema>;
