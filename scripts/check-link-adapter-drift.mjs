#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRegistry } from '../dist/registry.js';
import { loadManifest } from '../dist/manifest.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mereRoot = path.resolve(packageRoot, '..');
const linkRun = path.join(mereRoot, 'merekit-link', 'dist', 'run.js');
const registry = createRegistry(mereRoot, packageRoot);
const linkEntry = registry.find((entry) => entry.key === 'link');

async function exists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function commandKey(command) {
	return command.path.join(' ');
}

function stableManifest(manifest) {
	return {
		schemaVersion: manifest.schemaVersion,
		app: manifest.app,
		namespace: manifest.namespace,
		aliases: manifest.aliases,
		auth: manifest.auth,
		baseUrlEnv: manifest.baseUrlEnv,
		sessionPath: manifest.sessionPath,
		globalFlags: manifest.globalFlags,
		commands: manifest.commands.map((command) => ({
			id: command.id,
			path: command.path,
			summary: command.summary,
			auth: command.auth,
			risk: command.risk,
			supportsJson: command.supportsJson,
			supportsData: command.supportsData,
			requiresYes: command.requiresYes,
			requiresConfirm: command.requiresConfirm,
			positionals: command.positionals,
			flags: command.flags,
			auditDefault: command.auditDefault
		}))
	};
}

function manifestDiff(left, right) {
	const bundledCommands = new Set(left.commands.map(commandKey));
	const localCommands = new Set(right.commands.map(commandKey));
	const missing = [...localCommands].filter((command) => !bundledCommands.has(command));
	const extra = [...bundledCommands].filter((command) => !localCommands.has(command));
	const globalFlagChanges =
		JSON.stringify(left.globalFlags ?? []) === JSON.stringify(right.globalFlags ?? [])
			? []
			: [`globalFlags bundled=[${(left.globalFlags ?? []).join(', ')}] local=[${(right.globalFlags ?? []).join(', ')}]`];
	return [...missing.map((command) => `missing from bundled: ${command}`), ...extra.map((command) => `extra in bundled: ${command}`), ...globalFlagChanges];
}

if (!linkEntry) {
	console.error('Link registry entry is missing.');
	process.exit(1);
}

if (!(await exists(linkRun))) {
	console.log('Link adapter drift check skipped: sibling merekit-link/dist/run.js was not found.');
	process.exit(0);
}

const [bundled, local] = await Promise.all([
	loadManifest(linkEntry, { ...process.env, MERE_CLI_SOURCE: 'bundled' }),
	loadManifest(linkEntry, { ...process.env, MERE_CLI_SOURCE: 'local' })
]);

const failures = [];
if (!bundled.ok || !bundled.manifest) failures.push(`bundled Link manifest unavailable: ${bundled.error ?? 'unknown error'}`);
if (!local.ok || !local.manifest) failures.push(`local Link manifest unavailable: ${local.error ?? 'unknown error'}`);

if (failures.length === 0) {
	const bundledStable = stableManifest(bundled.manifest);
	const localStable = stableManifest(local.manifest);
	if (JSON.stringify(bundledStable) !== JSON.stringify(localStable)) {
		failures.push('bundled Link adapter manifest differs from sibling @merekit/link manifest');
		failures.push(...manifestDiff(bundledStable, localStable));
	}
}

if (failures.length > 0) {
	console.error('Link adapter drift check failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	console.error('Run `pnpm build:adapters` after building the sibling merekit-link package.');
	process.exit(1);
}

console.log('Link adapter drift check passed.');
