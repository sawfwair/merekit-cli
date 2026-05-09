import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { loadConfig, loadState, saveConfig, saveState, clearState } from '../dist/context.js';
import { parseJson, parseJsonOrNull } from '../dist/json.js';
import { validateManifest } from '../dist/manifest.js';
import { resolveMerePaths } from '../dist/paths.js';
import { hasWriteLikeShape, isWriteLikeCommand, manifestCommandSafetyErrors } from '../dist/safety.js';

function command(overrides = {}) {
	return {
		id: 'project.list',
		path: ['project', 'list'],
		summary: 'List projects.',
		auth: 'workspace',
		risk: 'read',
		supportsJson: true,
		supportsData: false,
		requiresYes: false,
		requiresConfirm: false,
		positionals: [],
		flags: [],
		...overrides
	};
}

function manifest(overrides = {}) {
	return {
		schemaVersion: 1,
		app: 'mere-projects',
		namespace: 'projects',
		aliases: ['projects'],
		auth: { kind: 'browser' },
		baseUrlEnv: [],
		sessionPath: null,
		commands: [command()],
		...overrides
	};
}

test('manifest validation enforces command contracts', () => {
	const parsed = validateManifest(manifest());
	assert.equal(parsed.commands[0].risk, 'read');
	assert.throws(() => validateManifest(manifest({ commands: [command({ path: [] })] })));
	assert.throws(() => validateManifest(manifest({ commands: [command({ risk: 'maybe' })] })));
});

test('config and state loading validate persisted JSON boundaries', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-boundaries-'));
	const env = {
		HOME: root,
		XDG_CONFIG_HOME: path.join(root, 'config'),
		XDG_STATE_HOME: path.join(root, 'state'),
		MERE_CLI_PACKAGE_ROOT: root,
		MERE_ROOT: root
	};
	const paths = resolveMerePaths(env);
	await mkdir(paths.configDir, { recursive: true });
	await mkdir(paths.stateDir, { recursive: true });

	await writeFile(paths.configFile, JSON.stringify({ version: 1, repoPaths: { projects: '/tmp/projects' } }), 'utf8');
	assert.equal((await loadConfig(paths)).repoPaths?.projects, '/tmp/projects');

	await writeFile(paths.configFile, JSON.stringify({ version: 2, repoPaths: { projects: '/tmp/old' } }), 'utf8');
	assert.deepEqual(await loadConfig(paths), { version: 1, repoPaths: {} });

	await saveState(paths, { version: 1, defaultWorkspace: 'ws_1', updatedAt: 'old' });
	assert.equal((await loadState(paths)).defaultWorkspace, 'ws_1');
	await clearState(paths);
	assert.equal((await loadState(paths)).updatedAt, new Date(0).toISOString());

	await saveConfig(paths, { version: 1, repoPaths: { finance: '/tmp/finance' } });
	assert.equal((await loadConfig(paths)).repoPaths?.finance, '/tmp/finance');
});

test('json helpers return unknown data or null without leaking casts', () => {
	assert.deepEqual(parseJson('{"ok":true}'), { ok: true });
	assert.equal(parseJsonOrNull('{'), null);
});

test('safety heuristics reject write-shaped read commands and unguarded destructive commands', () => {
	assert.equal(hasWriteLikeShape(command({ path: ['project', 'create'], summary: 'Create project.' })), true);
	assert.equal(isWriteLikeCommand(command({ risk: 'write' })), true);
	assert.deepEqual(
		manifestCommandSafetyErrors(command({ path: ['project', 'create'], summary: 'Create project.' })),
		['write-shaped command is marked read']
	);
	assert.deepEqual(
		manifestCommandSafetyErrors(command({ risk: 'destructive', requiresYes: false })),
		['destructive commands must require yes']
	);
});
