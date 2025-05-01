import { configSchema, type Config, type ConfigInput } from './schema';

export default function createConfig(input: ConfigInput): Config {
	return configSchema.parse(input);
}
