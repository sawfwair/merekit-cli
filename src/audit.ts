import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { MerePaths } from './paths.js';

const SECRET_FLAG_NAMES = new Set([
	'token',
	'api-key',
	'authorization',
	'password',
	'secret',
	'callback-bearer-token',
	'webhook-bearer-token'
]);

const SECRET_PROPERTY_PARTS = [
	'token',
	'secret',
	'password',
	'authorization',
	'apiKey',
	'api_key'
];

export type AuditRecord = {
	timestamp: string;
	kind: 'delegate' | 'root' | 'mcp';
	app?: string | undefined;
	command: string[];
	argv: string[];
	exitCode: number;
	durationMs: number;
	cwd?: string | undefined;
};

export function redactArgv(argv: string[]): string[] {
	const redacted: string[] = [];
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index] ?? '';
		if (!token.startsWith('--')) {
			redacted.push(token);
			continue;
		}
			const flagName = token.slice(2).split('=', 1)[0] ?? '';
			const normalized = flagName.toLowerCase();
		if (normalized === 'data') {
			if (token.includes('=')) {
				redacted.push(`--${flagName}=${redactDataValue(token.slice(token.indexOf('=') + 1))}`);
				continue;
			}
			redacted.push(token);
				const nextArg = argv[index + 1];
				if (nextArg && !nextArg.startsWith('--')) {
					redacted.push(redactDataValue(nextArg));
					index += 1;
				}
			continue;
		}
		const shouldRedact = [...SECRET_FLAG_NAMES].some((name) => normalized.includes(name));
		if (!shouldRedact) {
			redacted.push(token);
			continue;
		}
		if (token.includes('=')) {
			redacted.push(`--${flagName}=<redacted>`);
			continue;
		}
		redacted.push(token);
			const nextArg = argv[index + 1];
			if (nextArg && !nextArg.startsWith('--')) {
				redacted.push('<redacted>');
				index += 1;
			}
	}
	return redacted;
}

function redactDataValue(value: string): string {
	try {
		return JSON.stringify(redactJsonValue(JSON.parse(value)));
	} catch {
		return '<redacted>';
	}
}

function shouldRedactProperty(name: string): boolean {
	const normalized = name.toLowerCase();
	return SECRET_PROPERTY_PARTS.some((part) => normalized.includes(part.toLowerCase()));
}

function redactJsonValue(value: unknown, key = ''): unknown {
	if (shouldRedactProperty(key)) return '<redacted>';
	if (Array.isArray(value)) return value.map((item) => redactJsonValue(item));
	if (value && typeof value === 'object') {
		const output: Record<string, unknown> = {};
		for (const [childKey, childValue] of Object.entries(value)) {
			output[childKey] = redactJsonValue(childValue, childKey);
		}
		return output;
	}
	return value;
}

export function redactOutput(text: string): string {
	const trimmed = text.trim();
	if (!trimmed) return text;
	try {
		return JSON.stringify(redactJsonValue(JSON.parse(trimmed)), null, 2);
	} catch {
		return text
			.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gu, 'Bearer <redacted>')
			.replace(/\bzcli_(?:refresh|code)_[A-Za-z0-9._~-]+/gu, '<redacted>')
			.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '<redacted.jwt>');
	}
}

export async function appendAudit(paths: MerePaths, record: AuditRecord): Promise<void> {
	await mkdir(path.dirname(paths.auditFile), { recursive: true });
	await appendFile(paths.auditFile, `${JSON.stringify({ ...record, command: redactArgv(record.command), argv: redactArgv(record.argv) })}\n`, 'utf8');
}
