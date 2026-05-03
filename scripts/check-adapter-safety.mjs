#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRegistry } from '../dist/registry.js';
import { loadManifest } from '../dist/manifest.js';
import { manifestCommandSafetyErrors } from '../dist/safety.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = createRegistry(path.resolve(packageRoot, '..'), packageRoot);
const failures = [];

for (const entry of registry) {
	const result = await loadManifest(entry, process.env);
	if (!result.ok || !result.manifest) {
		failures.push(`${entry.key}: manifest unavailable: ${result.error ?? 'unknown error'}`);
		continue;
	}
	for (const command of result.manifest.commands) {
		const errors = manifestCommandSafetyErrors(command);
		if (errors.length > 0) {
			failures.push(`${entry.key}:${command.path.join(' ')}: ${errors.join('; ')}`);
		}
	}
}

if (failures.length > 0) {
	console.error('Adapter safety check failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Adapter safety check passed for ${registry.length} bundled adapters.`);
