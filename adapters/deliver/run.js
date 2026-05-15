#!/usr/bin/env node
// @ts-check
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const VERSION = '0.1.0';
const DEFAULT_BASE_URL = 'https://share.mere.ink';
const API_PREFIX = '/api/cli/v1';
const SESSION_PATH = '~/.local/state/mere-deliver/session.json';
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
 * @typedef {'GET' | 'PUT' | 'PATCH' | 'DELETE'} HttpMethod
 * @typedef {{ baseUrl: string; token: string; createdAt?: string }} Session
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
  mere-deliver db info [--base-url URL] [--json]
  mere-deliver auth login --token TOKEN [--base-url URL] [--json]
  mere-deliver auth whoami [--base-url URL] [--token TOKEN] [--json]
  mere-deliver auth logout [--json]
  mere-deliver hash-password [password] [--json]
  mere-deliver packages list [--status active|disabled|archived|all] [--workspace ID] [--limit N] [--base-url URL] [--token TOKEN] [--json]
  mere-deliver packages get <slug> [--base-url URL] [--token TOKEN] [--json]
  mere-deliver packages upsert <slug> --title TITLE --password PASSWORD [--customer-name NAME] [--workspace ID] [--sign-url URL] [--base-url URL] [--token TOKEN] [--json]
  mere-deliver packages set-status <slug> --status active|disabled|archived [--base-url URL] [--token TOKEN] [--json]
  mere-deliver packages set-sign-url <slug> [--sign-url URL] [--base-url URL] [--token TOKEN] [--json]
  mere-deliver packages delete <slug> --yes --confirm <slug> [--base-url URL] [--token TOKEN] [--json]
  mere-deliver same-page get <slug> [--base-url URL] [--token TOKEN] [--json]
  mere-deliver same-page upsert <slug> --mode structured --payload-json JSON [--base-url URL] [--token TOKEN] [--json]
  mere-deliver same-page upsert <slug> --mode custom_html --custom-html-file FILE [--base-url URL] [--token TOKEN] [--json]
  mere-deliver same-page delete <slug> --yes --confirm <slug> [--base-url URL] [--token TOKEN] [--json]
  mere-deliver url <slug> [--base-url URL] [--json]

Auth:
  Set MERE_DELIVER_API_TOKEN or run auth login --token TOKEN.
  Set MERE_DELIVER_BASE_URL to target a non-production hosted Deliver API.`;

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
		auth: options.auth ?? 'token',
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

const API_FLAGS = ['base-url', 'token', 'json'];
const MANIFEST_COMMANDS = [
	command(['commands'], 'Print the machine-readable mere-deliver command manifest.', { auth: 'none', flags: ['json'] }),
	command(['completion'], 'Print shell completion for mere-deliver.', { auth: 'none', supportsJson: false, positionals: ['shell'] }),
	command(['db', 'info'], 'Show the hosted Deliver API target and local auth state.', { auth: 'none', flags: ['base-url', 'json'], auditDefault: true }),
	command(['auth', 'login'], 'Store a Deliver API token for hosted package administration.', { auth: 'none', risk: 'external', flags: API_FLAGS }),
	command(['auth', 'whoami'], 'Show the hosted Deliver API identity for the active token.', { flags: API_FLAGS, auditDefault: true }),
	command(['auth', 'logout'], 'Clear the stored Deliver API token.', { auth: 'none', risk: 'write', flags: ['json'] }),
	command(['hash-password'], 'Hash one delivery package password using the Worker-compatible PBKDF2 format.', { auth: 'none', positionals: ['password'], flags: ['json'] }),
	command(['packages', 'list'], 'List delivery packages from the hosted Deliver API.', {
		flags: [...API_FLAGS, 'status', 'workspace', 'limit'],
		auditDefault: true
	}),
	command(['packages', 'get'], 'Show one delivery package by slug.', { flags: API_FLAGS, positionals: ['slug'] }),
	command(['packages', 'upsert'], 'Create or replace a delivery package row.', {
		risk: 'write',
		supportsData: true,
		flags: [...API_FLAGS, 'title', 'customer-name', 'workspace', 'status', 'password', 'password-hash', 'sign-url', 'document-id', 'data', 'data-file'],
		positionals: ['slug']
	}),
	command(['packages', 'set-status'], 'Set a delivery package status.', {
		risk: 'write',
		flags: [...API_FLAGS, 'status'],
		positionals: ['slug']
	}),
	command(['packages', 'set-sign-url'], 'Set or clear a delivery package signing URL.', {
		risk: 'write',
		flags: [...API_FLAGS, 'sign-url'],
		positionals: ['slug']
	}),
	command(['packages', 'delete'], 'Delete a delivery package row and cascading Same Page content.', {
		risk: 'destructive',
		requiresYes: true,
		requiresConfirm: true,
		flags: [...API_FLAGS, 'yes', 'confirm'],
		positionals: ['slug']
	}),
	command(['same-page', 'get'], 'Show Same Page content for one delivery package.', { flags: API_FLAGS, positionals: ['slug'] }),
	command(['same-page', 'upsert'], 'Create or replace Same Page content for one delivery package.', {
		risk: 'write',
		supportsData: true,
		flags: [...API_FLAGS, 'mode', 'payload-json', 'payload-file', 'custom-html', 'custom-html-file', 'data', 'data-file'],
		positionals: ['slug']
	}),
	command(['same-page', 'delete'], 'Delete Same Page content for one delivery package.', {
		risk: 'destructive',
		requiresYes: true,
		requiresConfirm: true,
		flags: [...API_FLAGS, 'yes', 'confirm'],
		positionals: ['slug']
	}),
	command(['url'], 'Print the share URL for one delivery package slug.', { auth: 'none', flags: ['base-url', 'json'], positionals: ['slug'] })
];

/** @returns {JsonObject} */
function manifest() {
	return {
		schemaVersion: 1,
		app: 'mere-deliver',
		namespace: 'deliver',
		aliases: ['deliver', 'mere-deliver', 'share'],
		auth: { kind: 'token' },
		baseUrlEnv: ['MERE_DELIVER_BASE_URL'],
		tokenEnv: ['MERE_DELIVER_API_TOKEN'],
		sessionPath: SESSION_PATH,
		globalFlags: API_FLAGS,
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
		if (arg === '-v') {
			flags.version = true;
			continue;
		}
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
	return value.replace(/\r?\n$/u, '');
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

/** @returns {string} */
function deliverSessionPath() {
	return homePath(process.env.MERE_DELIVER_SESSION_PATH?.trim() || SESSION_PATH);
}

/** @returns {Session | null} */
function readSession() {
	try {
		const parsed = JSON.parse(readFileSync(deliverSessionPath(), 'utf8'));
		if (!isRecord(parsed)) return null;
		const baseUrl = textValue(parsed.baseUrl);
		const token = textValue(parsed.token);
		const createdAt = textValue(parsed.createdAt);
		return baseUrl && token ? { baseUrl, token, ...(createdAt ? { createdAt } : {}) } : null;
	} catch {
		return null;
	}
}

/** @param {Session} session */
function writeSession(session) {
	const target = deliverSessionPath();
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
}

function clearSession() {
	rmSync(deliverSessionPath(), { force: true });
}

/**
 * @param {Flags} flags
 * @param {Session | null} session
 * @returns {string}
 */
function serviceBaseUrl(flags, session) {
	return (stringFlag(flags, 'base-url')
		?? process.env.MERE_DELIVER_BASE_URL?.trim()
		?? session?.baseUrl
		?? DEFAULT_BASE_URL).replace(/\/+$/u, '');
}

/**
 * @param {Flags} flags
 * @param {Session | null} session
 * @returns {string | undefined}
 */
function authToken(flags, session) {
	return stringFlag(flags, 'token')
		?? process.env.MERE_DELIVER_API_TOKEN?.trim()
		?? session?.token;
}

/**
 * @template T
 * @param {Flags} flags
 * @param {HttpMethod} method
 * @param {string} requestPath
 * @param {JsonObject} [body]
 * @returns {Promise<T>}
 */
async function apiRequest(flags, method, requestPath, body) {
	const session = readSession();
	const baseUrl = serviceBaseUrl(flags, session);
	const token = authToken(flags, session);
	if (!token) {
		throw new CliError('Deliver API token is required. Run `mere-deliver auth login --token TOKEN` or set MERE_DELIVER_API_TOKEN.');
	}

	const response = await globalThis.fetch(`${baseUrl}${API_PREFIX}${requestPath}`, {
		method,
		headers: {
			authorization: `Bearer ${token}`,
			accept: 'application/json',
			...(body ? { 'content-type': 'application/json' } : {})
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	const text = await response.text();
	const parsed = text ? parseJson(text, 'API response') : {};
	if (!response.ok) {
		throw new CliError((errorMessage(parsed) ?? text.trim()) || `Deliver API request failed with HTTP ${response.status}.`, response.status === 404 ? 2 : 1);
	}
	return /** @type {T} */ (parsed);
}

/**
 * @param {string} text
 * @param {string} label
 * @returns {unknown}
 */
function parseJson(text, label) {
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new CliError(`${label} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function errorMessage(value) {
	if (!isRecord(value)) return undefined;
	const error = value.error;
	if (typeof error === 'string') return error;
	if (isRecord(error) && typeof error.message === 'string') return error.message;
	return undefined;
}

/**
 * @param {unknown} value
 * @returns {value is JsonObject}
 */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function textValue(value) {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateSlug(value) {
	const slug = String(value ?? '').trim();
	if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(slug)) throw new CliError('Slug must be lowercase letters, numbers, and hyphens, up to 64 characters.');
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
 * @param {unknown} value
 * @returns {string | undefined}
 */
function validateSignUrl(value) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) return undefined;
	try {
		const url = new URL(text);
		if (url.protocol === 'https:' && url.hostname === 'mere.ink' && url.pathname.startsWith('/packet/')) {
			return url.toString();
		}
	} catch {
		// Fall through to the uniform validation error below.
	}
	throw new CliError('--sign-url must be an https://mere.ink/packet/... URL.');
}

/**
 * @param {string} text
 * @param {string} label
 * @returns {JsonObject}
 */
function parseJsonObject(text, label) {
	const parsed = parseJson(text, label);
	if (!isRecord(parsed)) throw new CliError(`${label} must be a JSON object.`);
	return parsed;
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
 * @param {JsonObject} data
 * @param {...string} names
 * @returns {string | undefined}
 */
function pickText(data, ...names) {
	for (const name of names) {
		const value = textValue(data[name]);
		if (value) return value;
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

/**
 * @param {Row | null | undefined} row
 * @param {Flags} flags
 * @param {string} label
 */
function outputRow(row, flags, label) {
	if (boolFlag(flags, 'json')) {
		writeJson({ [label]: row ?? null });
	} else if (row) {
		writeText(Object.entries(row).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n'));
	} else {
		writeText(`${label}: null`);
	}
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
	const session = readSession();
	const baseUrl = serviceBaseUrl(flags, session);
	const payload = {
		service: 'mere-deliver',
		baseUrl,
		apiUrl: `${baseUrl}${API_PREFIX}`,
		auth: 'token',
		sessionPath: deliverSessionPath(),
		hasSession: Boolean(session?.token),
		tokenEnv: Boolean(process.env.MERE_DELIVER_API_TOKEN?.trim())
	};
	if (boolFlag(flags, 'json')) writeJson(payload);
	else writeText(Object.entries(payload).map(([key, value]) => `${key}: ${value}`).join('\n'));
}

/**
 * @param {string | undefined} action
 * @param {Flags} flags
 */
async function runAuth(action, flags) {
	if (action === 'login') {
		const token = stringFlag(flags, 'token') ?? process.env.MERE_DELIVER_API_TOKEN?.trim();
		if (!token) throw new CliError('Usage: mere-deliver auth login --token TOKEN');
		const baseUrl = serviceBaseUrl(flags, null);
		const requestFlags = { ...flags, token, 'base-url': baseUrl };
		const whoami = await apiRequest(requestFlags, 'GET', '/whoami');
		writeSession({ baseUrl, token, createdAt: new Date().toISOString() });
		if (boolFlag(flags, 'json')) writeJson({ ok: true, baseUrl, sessionPath: deliverSessionPath(), whoami });
		else writeText(`Logged in to ${baseUrl}.`);
		return;
	}
	if (action === 'whoami') {
		const whoami = await apiRequest(flags, 'GET', '/whoami');
		if (boolFlag(flags, 'json')) writeJson(whoami);
		else writeText(Object.entries(/** @type {JsonObject} */ (whoami)).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n'));
		return;
	}
	if (action === 'logout') {
		clearSession();
		if (boolFlag(flags, 'json')) writeJson({ ok: true, sessionPath: deliverSessionPath() });
		else writeText('Logged out of mere-deliver.');
		return;
	}
	throw new CliError('Usage: mere-deliver auth login|whoami|logout');
}

/**
 * @param {string | undefined} action
 * @param {string[]} positionals
 * @param {Flags} flags
 */
async function runPackages(action, positionals, flags) {
	if (action === 'list') {
		const query = new globalThis.URLSearchParams();
		query.set('status', stringFlag(flags, 'status') ?? 'active');
		const workspace = stringFlag(flags, 'workspace');
		if (workspace) query.set('workspace', workspace);
		query.set('limit', String(intFlag(flags, 'limit', 100)));
		const result = await apiRequest(flags, 'GET', `/packages?${query.toString()}`);
		const rows = Array.isArray(/** @type {JsonObject} */ (result).packages) ? /** @type {Row[]} */ (/** @type {JsonObject} */ (result).packages) : [];
		outputRows(rows, flags, 'packages');
		return;
	}

	const slug = validateSlug(positionals[2]);
	if (action === 'get') {
		const result = await apiRequest(flags, 'GET', `/packages/${encodeURIComponent(slug)}`);
		outputRow(/** @type {Row | null | undefined} */ (/** @type {JsonObject} */ (result).package), flags, 'package');
		return;
	}

	if (action === 'upsert') {
		const data = readJsonData(flags);
		const title = stringFlag(flags, 'title') ?? pickText(data, 'title');
		if (!title) throw new CliError('packages upsert requires --title or data.title.');
		const password = stringFlag(flags, 'password') ?? pickText(data, 'password');
		const passwordHash = stringFlag(flags, 'password-hash') ?? pickText(data, 'passwordHash', 'password_hash') ?? (password ? hashPassword(password) : undefined);
		if (!passwordHash) throw new CliError('packages upsert requires --password, --password-hash, data.password, or data.passwordHash.');
		const customerName = stringFlag(flags, 'customer-name') ?? pickText(data, 'customerName', 'customer_name');
		const workspaceId = stringFlag(flags, 'workspace') ?? pickText(data, 'workspaceId', 'workspace_id');
		const status = validateStatus(stringFlag(flags, 'status') ?? pick(data, 'status') ?? 'active');
		const signUrl = validateSignUrl(stringFlag(flags, 'sign-url') ?? pick(data, 'signUrl', 'sign_url'));
		const documentId = stringFlag(flags, 'document-id') ?? pickText(data, 'documentId', 'mereinkDocumentId', 'mereink_document_id');
		const result = await apiRequest(flags, 'PUT', `/packages/${encodeURIComponent(slug)}`, {
			title,
			customerName: customerName ?? null,
			workspaceId: workspaceId ?? null,
			status,
			passwordHash,
			signUrl: signUrl ?? null,
			documentId: documentId ?? null
		});
		if (boolFlag(flags, 'json')) writeJson(result);
		else writeText(`upserted package: ${slug}`);
		return;
	}

	if (action === 'set-status') {
		const status = validateStatus(stringFlag(flags, 'status'));
		const result = await apiRequest(flags, 'PATCH', `/packages/${encodeURIComponent(slug)}/status`, { status });
		if (boolFlag(flags, 'json')) writeJson(result);
		else writeText(`status set: ${slug} -> ${status}`);
		return;
	}

	if (action === 'set-sign-url') {
		const signUrl = validateSignUrl(stringFlag(flags, 'sign-url') ?? '');
		const result = await apiRequest(flags, 'PATCH', `/packages/${encodeURIComponent(slug)}/sign-url`, { signUrl: signUrl ?? null });
		if (boolFlag(flags, 'json')) writeJson(result);
		else writeText(`sign url set: ${slug}`);
		return;
	}

	if (action === 'delete') {
		requireDestructive(slug, flags);
		const result = await apiRequest(flags, 'DELETE', `/packages/${encodeURIComponent(slug)}?confirm=${encodeURIComponent(slug)}`);
		if (boolFlag(flags, 'json')) writeJson(result);
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
async function runSamePage(action, positionals, flags) {
	const slug = validateSlug(positionals[2]);
	if (action === 'get') {
		const result = await apiRequest(flags, 'GET', `/same-page/${encodeURIComponent(slug)}`);
		outputRow(/** @type {Row | null | undefined} */ (/** @type {JsonObject} */ (result).samePage), flags, 'samePage');
		return;
	}

	if (action === 'upsert') {
		const data = readJsonData(flags);
		const mode = validateMode(stringFlag(flags, 'mode') ?? pick(data, 'mode') ?? 'structured');
		const payloadJson = readPayloadText(flags, data);
		const customHtml = mode === 'custom_html' ? readCustomHtml(flags, data) : null;
		if (mode === 'custom_html' && !customHtml) throw new CliError('custom_html mode requires --custom-html, --custom-html-file, or data.customHtml.');
		const result = await apiRequest(flags, 'PUT', `/same-page/${encodeURIComponent(slug)}`, {
			mode,
			payloadJson,
			customHtml: customHtml ?? null
		});
		if (boolFlag(flags, 'json')) writeJson(result);
		else writeText(`upserted same-page: ${slug}`);
		return;
	}

	if (action === 'delete') {
		requireDestructive(slug, flags);
		const result = await apiRequest(flags, 'DELETE', `/same-page/${encodeURIComponent(slug)}?confirm=${encodeURIComponent(slug)}`);
		if (boolFlag(flags, 'json')) writeJson(result);
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
	const baseUrl = serviceBaseUrl(flags, null);
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
	if (positionals[0] === 'auth') return await runAuth(positionals[1], flags);
	if (positionals[0] === 'hash-password') return await runHashPassword(positionals, flags);
	if (positionals[0] === 'packages') return await runPackages(positionals[1], positionals, flags);
	if (positionals[0] === 'same-page') return await runSamePage(positionals[1], positionals, flags);
	if (positionals[0] === 'url') return runUrl(positionals, flags);
	throw new CliError(`Unknown command: ${positionals[0]}`);
}

main(process.argv.slice(2)).catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exit(error instanceof CliError ? error.code : 1);
});
