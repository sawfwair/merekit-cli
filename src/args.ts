export type FlagValue = string | boolean | string[];

export type ParsedArgs = {
	flags: Record<string, FlagValue>;
	positionals: string[];
};

const BOOLEAN_FLAGS = new Set([
	'all',
	'allow-writes',
	'apply',
	'dry-run',
	'force',
	'help',
	'interactive',
	'json',
	'local',
	'no-download',
	'ndjson',
	'no-interactive',
	'no-source',
	'no-wait',
	'override',
	'remote',
	'version',
	'yes'
]);

export const ROOT_PASSTHROUGH_FLAGS = new Set([
	'base-url',
	'workspace',
	'profile',
	'json',
	'local',
	'yes',
	'confirm',
	'data',
	'data-file',
	'bucket',
	'tenant',
	'store',
	'local-db',
	'remote',
	'db',
	'persist-to'
]);

function addFlag(flags: Record<string, FlagValue>, name: string, value: string | boolean): void {
	const current = flags[name];
	if (current === undefined) {
		flags[name] = value;
		return;
	}
	if (Array.isArray(current)) {
		current.push(String(value));
		return;
	}
	flags[name] = [String(current), String(value)];
}

export function parseArgs(argv: string[]): ParsedArgs {
	const flags: Record<string, FlagValue> = {};
	const positionals: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index] ?? '';
		if (token === '--') {
			positionals.push(...argv.slice(index + 1));
			break;
		}
		if (!token.startsWith('--')) {
			positionals.push(token);
			continue;
		}
		const raw = token.slice(2);
		const equalsIndex = raw.indexOf('=');
		const name = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
		const inlineValue = equalsIndex >= 0 ? raw.slice(equalsIndex + 1) : undefined;
		if (BOOLEAN_FLAGS.has(name) && inlineValue === undefined) {
			addFlag(flags, name, true);
			continue;
		}
		const value = inlineValue ?? argv[index + 1];
		if (value === undefined || (inlineValue === undefined && value.startsWith('--'))) {
			throw new Error(`Option --${name} requires a value.`);
		}
		addFlag(flags, name, value);
		if (inlineValue === undefined) index += 1;
	}

	return { flags, positionals };
}

export function extractPassthroughFlags(argv: string[]): { flags: Record<string, FlagValue>; rest: string[] } {
	const flags: Record<string, FlagValue> = {};
	const rest: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index] ?? '';
		if (token === '--') {
			rest.push(...argv.slice(index));
			break;
		}
		if (!token.startsWith('--')) {
			rest.push(token);
			continue;
		}
		const raw = token.slice(2);
		const equalsIndex = raw.indexOf('=');
		const name = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
		if (!ROOT_PASSTHROUGH_FLAGS.has(name)) {
			rest.push(token);
			continue;
		}
		const inlineValue = equalsIndex >= 0 ? raw.slice(equalsIndex + 1) : undefined;
		if (BOOLEAN_FLAGS.has(name) && inlineValue === undefined) {
			addFlag(flags, name, true);
			continue;
		}
		const value = inlineValue ?? argv[index + 1];
		if (value === undefined || (inlineValue === undefined && value.startsWith('--'))) {
			throw new Error(`Option --${name} requires a value.`);
		}
		addFlag(flags, name, value);
		if (inlineValue === undefined) index += 1;
	}

	return { flags, rest };
}

export function readStringFlag(flags: Record<string, FlagValue>, name: string): string | undefined {
	const value = flags[name];
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.at(-1);
	return undefined;
}

export function readBooleanFlag(flags: Record<string, FlagValue>, name: string): boolean {
	return flags[name] === true;
}

export function flagArgs(flags: Record<string, FlagValue>, names: Set<string>): string[] {
	const output: string[] = [];
	for (const [name, value] of Object.entries(flags)) {
		if (!names.has(name)) continue;
		if (value === true) {
			output.push(`--${name}`);
		} else if (Array.isArray(value)) {
			for (const item of value) output.push(`--${name}`, item);
		} else if (typeof value === 'string') {
			output.push(`--${name}`, value);
		}
	}
	return output;
}
