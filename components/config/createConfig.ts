import { configSchema, type Config } from './schema';

export default function createConfig(input: Config) {
	return configSchema.parse(input);
}
