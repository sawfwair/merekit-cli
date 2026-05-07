#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRegistry } from '../dist/registry.js';
import { loadManifest } from '../dist/manifest.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mereRoot = path.resolve(packageRoot, '..');
const registry = createRegistry(mereRoot, packageRoot);
const registryKeys = registry.map((entry) => entry.key);
const failures = [];

function sameList(label, actual, expected) {
	if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
		failures.push(`${label} expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
	}
}

function riskSummary(commands) {
	const risks = [
		['read', 0],
		['write', 0],
		['destructive', 0],
		['external', 0]
	];
	for (const command of commands) {
		const risk = risks.find(([name]) => name === command.risk);
		if (risk) risk[1] += 1;
	}
	return risks
		.filter(([, count]) => count > 0)
		.map(([name, count]) => `${count} ${name}`)
		.join(', ');
}

function flagsSummary(flags) {
	return (flags ?? []).map((flag) => `\`${flag}\``).join(', ');
}

async function readText(relativePath) {
	return readFile(path.join(packageRoot, relativePath), 'utf8');
}

const manifest = JSON.parse(await readText('adapters/manifest.json'));
const manifestKeys = manifest.adapters?.map((adapter) => adapter.app) ?? [];
sameList('adapters/manifest.json', manifestKeys, registryKeys);

for (const entry of registry) {
	const manifestEntry = manifest.adapters?.find((adapter) => adapter.app === entry.key);
	const expectedPath = `adapters/${entry.key}/run.js`;
	if (manifestEntry?.adapterPath !== expectedPath) {
		failures.push(`${entry.key}: manifest adapterPath expected ${expectedPath}, got ${manifestEntry?.adapterPath ?? '<missing>'}`);
	}
	try {
		await access(path.join(packageRoot, expectedPath));
	} catch {
		failures.push(`${entry.key}: missing bundled adapter file ${expectedPath}`);
	}
}

const readme = await readText('README.md');
const commandsDoc = await readText('docs/commands.md');
const adaptersReadme = await readText('adapters/README.md');
const installDoc = await readText('docs/onboarding/install.md');

for (const key of registryKeys) {
	if (!readme.includes(`| \`${key}\` |`)) {
		failures.push(`${key}: missing registered namespace row in README.md`);
	}
	if (!adaptersReadme.includes(`- \`${key}\``)) {
		failures.push(`${key}: missing generated adapter list item in adapters/README.md`);
	}
}

for (const [label, text] of [
	['README.md', readme],
	['docs/commands.md', commandsDoc],
	['docs/onboarding/install.md', installDoc],
	['adapters/README.md', adaptersReadme]
]) {
	if (!text.includes('mere.run') || !text.includes('~/mere/run-public') || !text.includes('mere setup mere-run') || !text.includes('mere setup mere-run models --app media') || !text.includes('https://public.stereovoid.com/mere-run-releases/mere-run.dmg')) {
		failures.push(`media: ${label} must document the mere.run runtime dependency, app model pulls, ~/mere/run-public source path, mere setup mere-run installer, and public DMG URL`);
	}
}

for (const entry of registry) {
	const result = await loadManifest(entry, { ...process.env, MERE_CLI_SOURCE: 'bundled' });
	if (!result.ok || !result.manifest) {
		failures.push(`${entry.key}: unable to load bundled command manifest: ${result.error ?? 'unknown error'}`);
		continue;
	}
	const commands = result.manifest.commands;
	const auditDefaults = commands.filter((command) => command.auditDefault).length;
	const expectedRow = `| \`${entry.key}\` | ${commands.length} | ${auditDefaults} | ${riskSummary(commands)} | ${flagsSummary(result.manifest.globalFlags)} |`;
	if (!commandsDoc.includes(expectedRow)) {
		failures.push(`${entry.key}: docs/commands.md current app surface row is stale or missing`);
	}
}

if (failures.length > 0) {
	console.error('Adapter coverage check failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Adapter coverage check passed for ${registryKeys.length} bundled adapters.`);
