#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAdapterManifest } from './adapter-provenance-lib.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceConfig = JSON.parse(await readFile(path.join(packageRoot, 'scripts', 'adapter-sources.json'), 'utf8'));

try {
	await verifyAdapterManifest({
		packageRoot,
		sources: sourceConfig.sources,
		release: true
	});
	console.log(`Adapter release provenance passed for ${Object.keys(sourceConfig.sources).length} bundled adapters.`);
} catch (error) {
	console.error(`Adapter release provenance failed: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
