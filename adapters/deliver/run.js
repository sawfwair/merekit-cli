#!/usr/bin/env node
// @ts-check
import { spawnSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const VERSION = 'mere-deliver 0.1.0';
const DEFAULT_DATABASE = 'mere-deliver';
const DEFAULT_BASE_URL = 'https://share.mere.ink';
const PASSWORD_HASH_SCHEME = 'pbkdf2-sha256';
const PASSWORD_HASH_ITERATIONS = 100_000;
const STATUSES = new Set(['active', 'disabled', 'archived']);
const MODES = new Set(['structured', 'custom_html']);

/**
 * @typedef {string | boolean | undefined} FlagValue
 * @typedef {Record<string, FlagValue>} Flags
 * @typedef {{ positionals: string[]; flags: Flags }} ParsedArgs
 * @typedef {Record<string, unknown>} JsonObject
 * @typedef {Record<string, unknown>} Row
 * @typedef {{ code: number; stdout: string; stderr: string }} WranglerResult
 * @typedef {{
 *   auth?: string;
 *   risk?: string;
 *   supportsJson?: boolean;
 *   supportsData?: boolean;
 *   requiresYes?: boolean;
 *   requiresConfirm?: boolean;
 *   positionals?: string[];
 *   flags?: string[];
 *   auditDefault?: boolean;
 * }} CommandOptions
 * @typedef {ReturnType<typeof command>} CommandDescriptor
 */

class CliError extends Error {
	/**
	 * @param {string} message
	 * @param {number} [code]
	 */
	constructor(message, code = 1) {
		super(message);
		this.code = code;
	}
}

const HELP_TEXT = `mere-deliver

Usage:
  mere-deliver commands --json
  mere-deliver completion bash|zsh|fish
  mere-deliver db info [--database NAME] [--local|--remote] [--json]
  mere-deliver auth login|whoami|logout [--json]
  mere-deliver hash-password [password] [--json]
  mere-deliver packages list [--status active|disabled|archived|all] [--workspace ID] [--limit N] [--json]
  mere-deliver packages get <slug> [--json]
  mere-deliver packages upsert <slug> --title TITLE --password PASSWORD [--customer-name NAME] [--workspace ID] [--sign-url URL] [--json]
  mere-deliver packages set-status <slug> --status active|disabled|archived [--json]
  mere-deliver packages set-sign-url <slug> --sign-url URL [--json]
  mere-deliver packages delete <slug> --yes --confirm <slug> [--json]
  mere-deliver same-page get <slug> [--json]
  mere-deliver same-page upsert <slug> --mode structured --payload-json JSON [--json]
  mere-deliver same-page upsert <slug> --mode custom_html --custom-html-file FILE [--json]
  mere-deliver same-page delete <slug> --yes --confirm <slug> [--json]
  mere-deliver url <slug> [--base-url URL] [--json]

Wrangler:
  Set WRANGLER_BIN="cfman personal wrangler" to run through cfman.
  Set MERE_DELIVER_WRANGLER_CONFIG to point at wrangler.jsonc when running outside ~/mere/deliver.`;

/**
 * @param {string[]} pathParts
 * @param {string} summary
 * @param {CommandOptions} [options]
 */
function command(pathParts, summary, options = {}) {
	return {
		id: pathParts.join('.'),
		path: pathParts,
		summary,
		auth: options.auth ?? 'none',
		risk: options.risk ?? 'read',
		supportsJson: options.supportsJson ?? true,
		supportsData: options.supportsData ?? false,
		requiresYes: options.requiresYes ?? false,
		requiresConfirm: options.requiresConfirm ?? false,
		positionals: options.positionals ?? [],
		flags: options.flags ?? [],
		...(options.auditDefault ? { auditDefault: true } : {})
	};
}

const WRANGLER_FLAGS = ['database', 'remote', 'local', 'config', 'cwd', 'json'];
const MANIFEST_COMMANDS = [
	command(['commands'], 'Print the machine-readable mere-deliver command manifest.', { flags: ['json'] }),
	command(['completion'], 'Print shell completion for mere-deliver.', { supportsJson: false, positionals: ['shell'] }),
	command(['db', 'info'], 'Show the configured Cloudflare D1 target for delivery packages.', { flags: WRANGLER_FLAGS, auditDefault: true }),
	command(['auth', 'login'], 'Start Wrangler Cloudflare login for delivery package administration.', { risk: 'external', flags: ['config', 'cwd', 'json'] }),
	command(['auth', 'whoami'], 'Show the Cloudflare account visible to Wrangler.', { flags: ['config', 'cwd', 'json'], auditDefault: true }),
	command(['auth', 'logout'], 'Clear the active Wrangler Cloudflare login.', { risk: 'write', flags: ['config', 'cwd', 'json'] }),
	command(['hash-password'], 'Hash one delivery package password using the Worker-compatible PBKDF2 format.', { positionals: ['password'], flags: ['json'] }),
	command(['packages', 'list'], 'List delivery packages from D1.', {
		flags: [...WRANGLER_FLAGS, 'status', 'workspace', 'limit'],
		positionals: [],
		auditDefault: true
	}),
	command(['packages', 'get'], 'Show one delivery package by slug.', { flags: WRANGLER_FLAGS, positionals: ['slug'] }),
	command(['packages', 'upsert'], 'Create or replace a delivery package row.', {
		risk: 'write',
		supportsData: true,
		flags: [...WRANGLER_FLAGS, 'title', 'customer-name', 'workspace', 'status', 'password', 'password-hash', 'sign-url', 'document-id', 'data', 'data-file'],
		positionals: ['slug']
	}),
	command(['packages', 'set-status'], 'Set a delivery package status.', {
		risk: 'write',
		flags: [...WRANGLER_FLAGS, 'status'],
		positionals: ['slug']
	}),
	command(['packages', 'set-sign-url'], 'Set or clear a delivery package signing URL.', {
		risk: 'write',
		flags: [...WRANGLER_FLAGS, 'sign-url'],
		positionals: ['slug']
	}),
	command(['packages', 'delete'], 'Delete a delivery package row and cascading Same Page content.', {
		risk: 'destructive',
		requiresYes: true,
		requiresConfirm: true,
		flags: [...WRANGLER_FLAGS, 'yes', 'confirm'],
		positionals: ['slug']
	}),
	command(['same-page', 'get'], 'Show Same Page content for one delivery package.', { flags: WRANGLER_FLAGS, positionals: ['slug'] }),
	command(['same-page', 'upsert'], 'Create or replace Same Page content for one delivery package.', {
		risk: 'write',
		supportsData: true,
		flags: [...WRANGLER_FLAGS, 'mode', 'payload-json', 'payload-file', 'custom-html', 'custom-html-file', 'data', 'data-file'],
		positionals: ['slug']
	}),
	command(['same-page', 'delete'], 'Delete Same Page content for one delivery package.', {
		risk: 'destructive',
		requiresYes: true,
		requiresConfirm: true,
		flags: [...WRANGLER_FLAGS, 'yes', 'confirm'],
		positionals: ['slug']
	}),
	command(['url'], 'Print the share URL for one delivery package slug.', { flags: ['base-url', 'json'], positionals: ['slug'] })
];

/** @returns {JsonObject} */
function manifest() {
	return {
		schemaVersion: 1,
		app: 'mere-deliver',
		namespace: 'deliver',
		aliases: ['deliver', 'mere-deliver', 'share'],
		auth: { kind: 'none' },
		baseUrlEnv: ['MERE_DELIVER_BASE_URL'],
		sessionPath: null,
		globalFlags: ['database', 'remote', 'local', 'config', 'cwd', 'json'],
		commands: MANIFEST_COMMANDS
	};
}

/**
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
function parseArgs(argv) {
	const positionals = [];
	/** @type {Flags} */
	const flags = {};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg?.startsWith('--')) {
			if (arg) positionals.push(arg);
			continue;
		}
		const eq = arg.indexOf('=');
		if (eq > 2) {
			flags[arg.slice(2, eq)] = arg.slice(eq + 1);
			continue;
		}
		const name = arg.slice(2);
		const next = argv[index + 1];
		if (next && !next.startsWith('--')) {
			flags[name] = next;
			index += 1;
		} else {
			flags[name] = true;
		}
	}
	return { positionals, flags };
}

/**
 * @param {Flags} flags
 * @param {string} name
 * @returns {boolean}
 */
function boolFlag(flags, name) {
	return flags[name] === true || flags[name] === 'true' || flags[name] === '1';
}

/**
 * @param {Flags} flags
 * @param {string} name
 * @returns {string | undefined}
 */
function stringFlag(flags, name) {
	const value = flags[name];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * @param {Flags} flags
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
function intFlag(flags, name, fallback) {
	const value = Number(stringFlag(flags, name) ?? fallback);
	if (!Number.isSafeInteger(value) || value <= 0) throw new CliError(`--${name} must be a positive integer.`);
	return value;
}

/** @param {unknown} value */
function writeJson(value) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/** @param {string} value */
function writeText(value) {
	process.stdout.write(`${value}\n`);
}

/**
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function base64Url(buffer) {
	return Buffer.from(buffer)
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

/**
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
	const salt = randomBytes(16);
	const hash = pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, 32, 'sha256');
	return `${PASSWORD_HASH_SCHEME}$${PASSWORD_HASH_ITERATIONS}$${base64Url(salt)}$${base64Url(hash)}`;
}

/** @returns {Promise<string | undefined>} */
async function readStdinPassword() {
	if (process.stdin.isTTY) return undefined;
	process.stdin.setEncoding('utf8');
	let value = '';
	for await (const chunk of process.stdin) value += chunk;
	return value.replace(/\r?\n$/, '');
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function splitCommand(value) {
	const parts = [];
	const pattern = /"([^"]*)"|'([^']*)'|[^\s]+/gu;
	for (const match of value.matchAll(pattern)) parts.push(match[1] ?? match[2] ?? match[0]);
	return parts;
}

/**
 * @param {string} value
 * @returns {string}
 */
function homePath(value) {
	if (value === '~') return os.homedir();
	if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
	return value;
}

/** @returns {string | undefined} */
function defaultWranglerConfig() {
	const configured = process.env.MERE_DELIVER_WRANGLER_CONFIG?.trim();
	if (configured) return homePath(configured);
	const candidate = path.join(os.homedir(), 'mere', 'deliver', 'wrangler.jsonc');
	return existsSync(candidate) ? candidate : undefined;
}

/** @returns {string[]} */
function wranglerPrefix() {
	return splitCommand(process.env.WRANGLER_BIN?.trim() || 'wrangler');
}

/**
 * @param {Flags} flags
 * @returns {string[]}
 */
function wranglerGlobalArgs(flags) {
	/** @type {string[]} */
	const args = [];
	const config = stringFlag(flags, 'config') ?? defaultWranglerConfig();
	const cwd = stringFlag(flags, 'cwd') ?? process.env.MERE_DELIVER_CWD?.trim();
	if (config) args.push('--config', homePath(config));
	if (cwd) args.push('--cwd', homePath(cwd));
	return args;
}

/**
 * @param {string[]} args
 * @param {Flags} flags
 * @returns {WranglerResult}
 */
function runWrangler(args, flags) {
	const [commandName, ...prefixArgs] = wranglerPrefix();
	if (!commandName) throw new CliError('WRANGLER_BIN did not resolve to a command.');
	const result = spawnSync(commandName, [...prefixArgs, ...wranglerGlobalArgs(flags), ...args], {
		encoding: 'utf8',
		env: process.env
	});
	if (result.error) throw result.error;
	return {
		code: result.status ?? 1,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? ''
	};
}

/**
 * @param {Flags} flags
 * @returns {string}
 */
function databaseName(flags) {
	return stringFlag(flags, 'database') ?? process.env.MERE_DELIVER_DATABASE?.trim() ?? process.env.MERE_DELIVER_D1_DATABASE?.trim() ?? DEFAULT_DATABASE;
}

/**
 * @param {Flags} flags
 * @returns {string[]}
 */
function d1ScopeArgs(flags) {
	if (boolFlag(flags, 'local') || process.env.MERE_DELIVER_D1_MODE === 'local') return ['--local'];
	return ['--remote'];
}

/**
 * @param {string} sql
 * @param {Flags} flags
 * @returns {{ raw: unknown; rows: Row[]; meta: unknown }}
 */
function runD1(sql, flags) {
	const result = runWrangler(['d1', 'execute', databaseName(flags), ...d1ScopeArgs(flags), '--command', sql, '--json'], flags);
	if (result.code !== 0) throw new CliError(result.stderr.trim() || result.stdout.trim() || `wrangler d1 execute failed with ${result.code}`, result.code);
	try {
		const parsed = JSON.parse(result.stdout);
		const entry = Array.isArray(parsed) ? parsed[0] : parsed;
		if (entry?.success === false) throw new CliError(JSON.stringify(entry.error ?? entry, null, 2));
		return {
			raw: parsed,
			rows: Array.isArray(entry?.results) ? entry.results : [],
			meta: entry?.meta ?? null
		};
	} catch (error) {
		if (error instanceof CliError) throw error;
		throw new CliError(`Unable to parse wrangler D1 JSON output: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function sqlString(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function sqlNullable(value) {
	if (value === undefined || value === null || value === '') return 'NULL';
	return sqlString(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateSlug(value) {
	const slug = String(value ?? '').trim();
	if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) throw new CliError('Slug must be lowercase letters, numbers, and hyphens, up to 64 characters.');
	return slug;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateStatus(value) {
	const status = String(value ?? 'active').trim();
	if (!STATUSES.has(status)) throw new CliError(`Status must be one of: ${[...STATUSES].join(', ')}.`);
	return status;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateMode(value) {
	const mode = String(value ?? 'structured').trim();
	if (!MODES.has(mode)) throw new CliError('Mode must be structured or custom_html.');
	return mode;
}

/**
 * @param {string} text
 * @param {string} label
 * @returns {JsonObject}
 */
function parseJsonObject(text, label) {
	try {
		const value = JSON.parse(text);
		if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected object');
		return value;
	} catch (error) {
		throw new CliError(`${label} must be a JSON object: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * @param {Flags} flags
 * @returns {JsonObject}
 */
function readJsonData(flags) {
	const inline = stringFlag(flags, 'data');
	const file = stringFlag(flags, 'data-file');
	if (inline && file) throw new CliError('Use either --data or --data-file, not both.');
	if (inline) return parseJsonObject(inline, '--data');
	if (file) return parseJsonObject(readFileSync(homePath(file), 'utf8'), '--data-file');
	return {};
}

/**
 * @param {JsonObject} data
 * @param {...string} names
 * @returns {unknown}
 */
function pick(data, ...names) {
	for (const name of names) {
		if (data[name] !== undefined) return data[name];
	}
	return undefined;
}

/**
 * @param {Row[]} rows
 * @param {Flags} flags
 * @param {string} label
 */
function outputRows(rows, flags, label) {
	if (boolFlag(flags, 'json')) {
		writeJson({ [label]: rows });
	} else if (rows.length === 0) {
		writeText(`No ${label.replaceAll('_', ' ')}.`);
	} else {
		writeText(rows.map((row) => Object.values(row).map((value) => String(value ?? '')).join('\t')).join('\n'));
	}
}

/** @returns {string} */
function packageSelect() {
	return 'slug, title, customer_name, workspace_id, status, sign_url, mereink_document_id, created_at, updated_at';
}

/**
 * @param {Flags} flags
 * @param {JsonObject} data
 * @returns {string}
 */
function readPayloadText(flags, data) {
	const payloadValue = pick(data, 'payloadJson', 'payload_json');
	const payloadFile = pick(data, 'payloadFile', 'payload_file');
	const inline = stringFlag(flags, 'payload-json') ?? (typeof payloadValue === 'string' ? payloadValue : undefined);
	const file = stringFlag(flags, 'payload-file') ?? (typeof payloadFile === 'string' ? payloadFile : undefined);
	if (inline && file) throw new CliError('Use either --payload-json or --payload-file, not both.');
	const text = file ? readFileSync(homePath(String(file)), 'utf8') : inline;
	if (!text && data.payload !== undefined) return JSON.stringify(data.payload);
	if (!text) return '{}';
	parseJsonObject(text, 'Same Page payload');
	return text;
}

/**
 * @param {Flags} flags
 * @param {JsonObject} data
 * @returns {string | undefined}
 */
function readCustomHtml(flags, data) {
	const customHtmlValue = pick(data, 'customHtml', 'custom_html');
	const customHtmlFile = pick(data, 'customHtmlFile', 'custom_html_file');
	const inline = stringFlag(flags, 'custom-html') ?? (typeof customHtmlValue === 'string' ? customHtmlValue : undefined);
	const file = stringFlag(flags, 'custom-html-file') ?? (typeof customHtmlFile === 'string' ? customHtmlFile : undefined);
	if (inline && file) throw new CliError('Use either --custom-html or --custom-html-file, not both.');
	if (file) return readFileSync(homePath(String(file)), 'utf8');
	return inline;
}

/**
 * @param {string} slug
 * @param {Flags} flags
 */
function requireDestructive(slug, flags) {
	if (!boolFlag(flags, 'yes')) throw new CliError('Destructive commands require --yes.');
	const confirm = stringFlag(flags, 'confirm');
	if (confirm !== slug) throw new CliError(`Destructive commands require --confirm ${slug}.`);
}

/**
 * @param {string[]} positionals
 * @param {Flags} flags
 */
async function runHashPassword(positionals, flags) {
	const password = positionals[1] ?? stringFlag(flags, 'password') ?? (await readStdinPassword());
	if (!password) throw new CliError('Usage: mere-deliver hash-password [password]');
	const passwordHash = hashPassword(password);
	if (boolFlag(flags, 'json')) writeJson({ passwordHash });
	else writeText(passwordHash);
}

/** @param {Flags} flags */
function runDbInfo(flags) {
	const payload = {
		database: databaseName(flags),
		mode: d1ScopeArgs(flags).includes('--local') ? 'local' : 'remote',
		wrangler: wranglerPrefix().join(' '),
		config: stringFlag(flags, 'config') ?? defaultWranglerConfig() ?? null,
		baseUrl: process.env.MERE_DELIVER_BASE_URL?.trim() || DEFAULT_BASE_URL
	};
	if (boolFlag(flags, 'json')) writeJson(payload);
	else writeText(Object.entries(payload).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n'));
}

/**
 * @param {string | undefined} action
 * @param {Flags} flags
 */
function runAuth(action, flags) {
	if (action === 'whoami') {
		const result = runWrangler(['whoami', '--json'], flags);
		if (result.code !== 0) throw new CliError(result.stderr.trim() || result.stdout.trim() || 'Not authenticated with Wrangler.', result.code);
		if (boolFlag(flags, 'json')) process.stdout.write(result.stdout);
		else writeText(result.stdout.trim());
		return;
	}
	if (action === 'login' || action === 'logout') {
		const result = runWrangler([action], flags);
		if (boolFlag(flags, 'json')) {
			writeJson({ ok: result.code === 0, code: result.code, stdout: result.stdout.trim(), stderr: result.stderr.trim() });
		} else {
			if (result.stdout) process.stdout.write(result.stdout);
			if (result.stderr) process.stderr.write(result.stderr);
		}
		if (result.code !== 0) throw new CliError(`${action} failed.`, result.code);
		return;
	}
	throw new CliError('Usage: mere-deliver auth login|whoami|logout');
}

/**
 * @param {string | undefined} action
 * @param {string[]} positionals
 * @param {Flags} flags
 */
function runPackages(action, positionals, flags) {
	if (action === 'list') {
		const status = stringFlag(flags, 'status') ?? 'active';
		const workspace = stringFlag(flags, 'workspace');
		const limit = intFlag(flags, 'limit', 100);
		const where = [];
		if (status !== 'all') where.push(`status = ${sqlString(validateStatus(status))}`);
		if (workspace) where.push(`workspace_id = ${sqlString(workspace)}`);
		const sql = `SELECT ${packageSelect()} FROM delivery_packages ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC, slug ASC LIMIT ${limit}`;
		outputRows(runD1(sql, flags).rows, flags, 'packages');
		return;
	}

	const slug = validateSlug(positionals[2]);
	if (action === 'get') {
		const rows = runD1(`SELECT ${packageSelect()} FROM delivery_packages WHERE slug = ${sqlString(slug)} LIMIT 1`, flags).rows;
		if (boolFlag(flags, 'json')) writeJson({ package: rows[0] ?? null });
		else if (rows[0]) writeText(Object.entries(rows[0]).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n'));
		else throw new CliError(`Package not found: ${slug}`, 2);
		return;
	}

	if (action === 'upsert') {
		const data = readJsonData(flags);
		const title = stringFlag(flags, 'title') ?? pick(data, 'title');
		if (!title) throw new CliError('packages upsert requires --title or data.title.');
		const password = stringFlag(flags, 'password') ?? pick(data, 'password');
		const passwordHash = stringFlag(flags, 'password-hash') ?? pick(data, 'passwordHash', 'password_hash') ?? (password ? hashPassword(String(password)) : undefined);
		if (!passwordHash) throw new CliError('packages upsert requires --password, --password-hash, data.password, or data.passwordHash.');
		const customerName = stringFlag(flags, 'customer-name') ?? pick(data, 'customerName', 'customer_name');
		const workspaceId = stringFlag(flags, 'workspace') ?? pick(data, 'workspaceId', 'workspace_id');
		const status = validateStatus(stringFlag(flags, 'status') ?? pick(data, 'status') ?? 'active');
		const signUrl = stringFlag(flags, 'sign-url') ?? pick(data, 'signUrl', 'sign_url');
		const documentId = stringFlag(flags, 'document-id') ?? pick(data, 'documentId', 'mereinkDocumentId', 'mereink_document_id');
		const sql = `
			INSERT INTO delivery_packages (slug, title, customer_name, workspace_id, status, password_hash, sign_url, mereink_document_id, created_at, updated_at)
			VALUES (${sqlString(slug)}, ${sqlString(title)}, ${sqlNullable(customerName)}, ${sqlNullable(workspaceId)}, ${sqlString(status)}, ${sqlString(passwordHash)}, ${sqlNullable(signUrl)}, ${sqlNullable(documentId)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(slug) DO UPDATE SET
				title = excluded.title,
				customer_name = excluded.customer_name,
				workspace_id = excluded.workspace_id,
				status = excluded.status,
				password_hash = excluded.password_hash,
				sign_url = excluded.sign_url,
				mereink_document_id = excluded.mereink_document_id,
				updated_at = CURRENT_TIMESTAMP
			RETURNING ${packageSelect()}
		`;
		const row = runD1(sql, flags).rows[0] ?? null;
		if (boolFlag(flags, 'json')) writeJson({ package: row });
		else writeText(`upserted package: ${row?.slug ?? slug}`);
		return;
	}

	if (action === 'set-status') {
		const status = validateStatus(stringFlag(flags, 'status'));
		const rows = runD1(`UPDATE delivery_packages SET status = ${sqlString(status)}, updated_at = CURRENT_TIMESTAMP WHERE slug = ${sqlString(slug)} RETURNING ${packageSelect()}`, flags).rows;
		if (!rows[0]) throw new CliError(`Package not found: ${slug}`, 2);
		if (boolFlag(flags, 'json')) writeJson({ package: rows[0] });
		else writeText(`status set: ${slug} -> ${status}`);
		return;
	}

	if (action === 'set-sign-url') {
		const signUrl = stringFlag(flags, 'sign-url') ?? '';
		const rows = runD1(`UPDATE delivery_packages SET sign_url = ${sqlNullable(signUrl)}, updated_at = CURRENT_TIMESTAMP WHERE slug = ${sqlString(slug)} RETURNING ${packageSelect()}`, flags).rows;
		if (!rows[0]) throw new CliError(`Package not found: ${slug}`, 2);
		if (boolFlag(flags, 'json')) writeJson({ package: rows[0] });
		else writeText(`sign url set: ${slug}`);
		return;
	}

	if (action === 'delete') {
		requireDestructive(slug, flags);
		const rows = runD1(`DELETE FROM delivery_packages WHERE slug = ${sqlString(slug)} RETURNING slug`, flags).rows;
		if (!rows[0]) throw new CliError(`Package not found: ${slug}`, 2);
		if (boolFlag(flags, 'json')) writeJson({ deleted: rows[0] });
		else writeText(`deleted package: ${slug}`);
		return;
	}

	throw new CliError('Usage: mere-deliver packages list|get|upsert|set-status|set-sign-url|delete');
}

/**
 * @param {string | undefined} action
 * @param {string[]} positionals
 * @param {Flags} flags
 */
function runSamePage(action, positionals, flags) {
	const slug = validateSlug(positionals[2]);
	if (action === 'get') {
		const rows = runD1(`SELECT package_slug, mode, payload_json, custom_html, created_at, updated_at FROM delivery_package_pages WHERE package_slug = ${sqlString(slug)} LIMIT 1`, flags).rows;
		if (boolFlag(flags, 'json')) writeJson({ samePage: rows[0] ?? null });
		else if (rows[0]) writeText(Object.entries(rows[0]).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n'));
		else throw new CliError(`Same Page content not found: ${slug}`, 2);
		return;
	}

	if (action === 'upsert') {
		const data = readJsonData(flags);
		const mode = validateMode(stringFlag(flags, 'mode') ?? pick(data, 'mode') ?? 'structured');
		const payloadJson = readPayloadText(flags, data);
		const customHtml = mode === 'custom_html' ? readCustomHtml(flags, data) : null;
		if (mode === 'custom_html' && !customHtml) throw new CliError('custom_html mode requires --custom-html, --custom-html-file, or data.customHtml.');
		const sql = `
			INSERT INTO delivery_package_pages (package_slug, mode, payload_json, custom_html, created_at, updated_at)
			VALUES (${sqlString(slug)}, ${sqlString(mode)}, ${sqlString(payloadJson)}, ${sqlNullable(customHtml)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(package_slug) DO UPDATE SET
				mode = excluded.mode,
				payload_json = excluded.payload_json,
				custom_html = excluded.custom_html,
				updated_at = CURRENT_TIMESTAMP
			RETURNING package_slug, mode, payload_json, custom_html, created_at, updated_at
		`;
		const row = runD1(sql, flags).rows[0] ?? null;
		if (boolFlag(flags, 'json')) writeJson({ samePage: row });
		else writeText(`upserted same-page: ${slug}`);
		return;
	}

	if (action === 'delete') {
		requireDestructive(slug, flags);
		const rows = runD1(`DELETE FROM delivery_package_pages WHERE package_slug = ${sqlString(slug)} RETURNING package_slug`, flags).rows;
		if (!rows[0]) throw new CliError(`Same Page content not found: ${slug}`, 2);
		if (boolFlag(flags, 'json')) writeJson({ deleted: rows[0] });
		else writeText(`deleted same-page: ${slug}`);
		return;
	}

	throw new CliError('Usage: mere-deliver same-page get|upsert|delete');
}

/**
 * @param {string[]} positionals
 * @param {Flags} flags
 */
function runUrl(positionals, flags) {
	const slug = validateSlug(positionals[1]);
	const baseUrl = (stringFlag(flags, 'base-url') ?? process.env.MERE_DELIVER_BASE_URL?.trim() ?? DEFAULT_BASE_URL).replace(/\/+$/u, '');
	const url = `${baseUrl}/${slug}/`;
	if (boolFlag(flags, 'json')) writeJson({ slug, url });
	else writeText(url);
}

/**
 * @param {string | undefined} shell
 * @returns {string}
 */
function renderCompletion(shell) {
	const top = ['auth', 'commands', 'completion', 'db', 'hash-password', 'packages', 'same-page', 'url'];
	const second = {
		auth: ['login', 'logout', 'whoami'],
		db: ['info'],
		packages: ['delete', 'get', 'list', 'set-sign-url', 'set-status', 'upsert'],
		'same-page': ['delete', 'get', 'upsert'],
		completion: ['bash', 'fish', 'zsh']
	};
	switch ((shell ?? 'bash').trim()) {
		case 'bash':
			return [
				'# mere-deliver bash completion',
				'_mere_deliver_completion() {',
				'  local cur="${COMP_WORDS[COMP_CWORD]}"',
				'  local words',
				'  if [[ "$COMP_CWORD" -eq 1 ]]; then',
				`    words="${top.join(' ')}"`,
				'  elif [[ "$COMP_CWORD" -eq 2 ]]; then',
				'    case "${COMP_WORDS[1]}" in',
				...Object.entries(second).map(([cmd, words]) => `      ${cmd}) words="${words.join(' ')}" ;;`),
				'      *) words="" ;;',
				'    esac',
				'  fi',
				'  COMPREPLY=( $(compgen -W "$words" -- "$cur") )',
				'}',
				'complete -F _mere_deliver_completion mere-deliver',
				''
			].join('\n');
		case 'zsh':
			return `#compdef mere-deliver\n_arguments '1:command:(${top.join(' ')})' '2:subcommand:->sub'\ncase "$words[2]" in\n${Object.entries(second).map(([cmd, words]) => `  ${cmd}) _values '${cmd} commands' ${words.join(' ')} ;;`).join('\n')}\nesac`;
		case 'fish':
			return [
				`complete -c mere-deliver -f -n '__fish_use_subcommand' -a "${top.join(' ')}"`,
				...Object.entries(second).map(([cmd, words]) => `complete -c mere-deliver -f -n '__fish_seen_subcommand_from ${cmd}' -a "${words.join(' ')}"`)
			].join('\n');
		default:
			throw new CliError('Completion shell must be one of bash, zsh, or fish.');
	}
}

/** @param {string[]} argv */
async function main(argv) {
	const { positionals, flags } = parseArgs(argv);
	if (boolFlag(flags, 'version') || positionals[0] === 'version') {
		writeText(VERSION);
		return;
	}
	if (positionals.length === 0 || boolFlag(flags, 'help')) {
		writeText(HELP_TEXT);
		return;
	}
	if (positionals[0] === 'commands') {
		if (boolFlag(flags, 'json')) writeJson(manifest());
		else writeText(MANIFEST_COMMANDS.map((entry) => entry.path.join(' ')).join('\n'));
		return;
	}
	if (positionals[0] === 'completion') {
		writeText(renderCompletion(positionals[1]));
		return;
	}
	if (positionals[0] === 'db' && positionals[1] === 'info') return runDbInfo(flags);
	if (positionals[0] === 'auth') return runAuth(positionals[1], flags);
	if (positionals[0] === 'hash-password') return await runHashPassword(positionals, flags);
	if (positionals[0] === 'packages') return runPackages(positionals[1], positionals, flags);
	if (positionals[0] === 'same-page') return runSamePage(positionals[1], positionals, flags);
	if (positionals[0] === 'url') return runUrl(positionals, flags);
	throw new CliError(`Unknown command: ${positionals[0]}`);
}

main(process.argv.slice(2)).catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exit(error instanceof CliError ? error.code : 1);
});
