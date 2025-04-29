import { configSchema, type ConfigInput } from './schema';

export default function createConfig(input: ConfigInput) {
	return configSchema.parse(input);
}
