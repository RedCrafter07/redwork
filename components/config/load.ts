import { resolve } from 'pathe';
import { type Config } from './schema';

export async function loadConfig() {
	const { default: config } = await import(resolve('.', 'redwork.config.ts'));

	return config as Config;
}
