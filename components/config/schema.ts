import * as z from 'zod';

export const configSchema = z.object({
	version: z
		.string()
		.default('0.1')
		.describe('The config version, may be used for migration later on'),

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
});

export type Config = z.infer<typeof configSchema>;
