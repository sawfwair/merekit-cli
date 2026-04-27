import type { AppCommandManifest, ManifestCommand, RegistryEntry, ResolvedCli } from './types.js';
import { executionCwd, resolveCli } from './registry.js';
import { runCapture } from './process.js';

export type ManifestLoadResult = {
	entry: RegistryEntry;
	resolved: ResolvedCli;
	ok: boolean;
	manifest?: AppCommandManifest;
	error?: string;
};

export function validateManifest(value: unknown): AppCommandManifest {
	if (!value || typeof value !== 'object') throw new Error('Manifest must be an object.');
	const manifest = value as Partial<AppCommandManifest>;
	if (manifest.schemaVersion !== 1) throw new Error('Manifest schemaVersion must be 1.');
	if (!manifest.app || !manifest.namespace) throw new Error('Manifest app and namespace are required.');
	if (!Array.isArray(manifest.commands)) throw new Error('Manifest commands must be an array.');
	for (const command of manifest.commands) {
		if (!command.id || !Array.isArray(command.path) || !command.summary) {
			throw new Error(`Invalid command entry in ${manifest.app}.`);
		}
	}
	return manifest as AppCommandManifest;
}

export async function loadManifest(
	entry: RegistryEntry,
	env: NodeJS.ProcessEnv = process.env
): Promise<ManifestLoadResult> {
	const resolved = await resolveCli(entry, env);
	if (!resolved.exists) {
		return { entry, resolved, ok: false, error: `CLI not found at ${resolved.displayPath}` };
	}
	const result = await runCapture(resolved.command, [...resolved.args, 'commands', '--json'], {
		cwd: executionCwd(entry, resolved),
		env,
		timeoutMs: 15_000
	}).catch((error: unknown) => ({
		code: 1,
		signal: null,
		stdout: '',
		stderr: error instanceof Error ? error.message : String(error)
	}));
	if (result.code !== 0) {
		return { entry, resolved, ok: false, error: result.stderr.trim() || `commands --json exited ${result.code}` };
	}
	try {
		return {
			entry,
			resolved,
			ok: true,
			manifest: validateManifest(JSON.parse(result.stdout) as unknown)
		};
	} catch (error) {
		return {
			entry,
			resolved,
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

export async function loadManifests(
	entries: RegistryEntry[],
	env: NodeJS.ProcessEnv = process.env
): Promise<ManifestLoadResult[]> {
	return Promise.all(entries.map((entry) => loadManifest(entry, env)));
}

export function findManifestCommand(
	manifest: AppCommandManifest | undefined,
	args: string[]
): ManifestCommand | null {
	if (!manifest) return null;
	let best: ManifestCommand | null = null;
	for (const command of manifest.commands) {
		if (command.path.every((part, index) => args[index] === part)) {
			if (!best || command.path.length > best.path.length) best = command;
		}
	}
	return best;
}

export function supportedFlagNames(
	manifest: AppCommandManifest | undefined,
	command: ManifestCommand | null
): Set<string> {
	const names = new Set<string>(manifest?.globalFlags ?? []);
	for (const flag of command?.flags ?? []) names.add(flag);
	if (command?.supportsJson) names.add('json');
	if (command?.supportsData) {
		names.add('data');
		names.add('data-file');
	}
	if (command?.requiresYes || command?.risk === 'destructive' || command?.risk === 'external') names.add('yes');
	if (command?.requiresConfirm) names.add('confirm');
	return names;
}

export function manifestForJson(results: ManifestLoadResult[]): unknown {
	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		apps: results.map((result) =>
			result.ok
				? result.manifest
				: {
						app: result.entry.key,
						namespace: result.entry.namespace,
						error: result.error,
						cli: result.resolved.displayPath
					}
		)
	};
}
