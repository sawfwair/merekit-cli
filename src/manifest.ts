import { z } from 'zod';
import type { AppCommandManifest, ManifestCommand, RegistryEntry, ResolvedCli } from './types.js';
import { executionCwd, resolveCli } from './registry.js';
import { runCapture } from './process.js';
import { parseJson } from './json.js';

export type ManifestLoadResult = {
	entry: RegistryEntry;
	resolved: ResolvedCli;
	ok: boolean;
	manifest?: AppCommandManifest;
	error?: string;
};

const manifestCommandSchema = z.object({
	id: z.string().min(1),
	path: z.array(z.string().min(1)).min(1),
	summary: z.string().min(1),
	auth: z.enum(['none', 'session', 'workspace', 'token']),
	risk: z.enum(['read', 'write', 'destructive', 'external']),
	supportsJson: z.boolean(),
	supportsData: z.boolean(),
	requiresYes: z.boolean(),
	requiresConfirm: z.boolean(),
	positionals: z.array(z.string()).default([]),
	flags: z.array(z.string()).default([]),
	auditDefault: z.boolean().optional()
});

const appCommandManifestSchema = z.object({
	schemaVersion: z.literal(1),
	app: z.string().min(1),
	namespace: z.string().min(1),
	aliases: z.array(z.string()).default([]),
	auth: z.object({ kind: z.enum(['browser', 'token', 'device', 'none', 'mixed']) }),
	baseUrlEnv: z.array(z.string()),
	sessionPath: z.string().nullable(),
	globalFlags: z.array(z.string()).optional(),
	commands: z.array(manifestCommandSchema)
});

export function validateManifest(value: unknown): AppCommandManifest {
	return appCommandManifestSchema.parse(value);
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
			manifest: validateManifest(parseJson(result.stdout))
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

function surfaceName(command: ManifestCommand): string {
	return command.path[0] ?? 'root';
}

function commandCounts(commands: ManifestCommand[]): Record<string, number> {
	return {
		total: commands.length,
		read: commands.filter((command) => command.risk === 'read').length,
		write: commands.filter((command) => command.risk === 'write').length,
		destructive: commands.filter((command) => command.risk === 'destructive').length,
		external: commands.filter((command) => command.risk === 'external').length
	};
}

function surfacesForManifest(manifest: AppCommandManifest): Array<Record<string, unknown>> {
	const bySurface = new Map<string, ManifestCommand[]>();
	for (const command of manifest.commands) {
		const name = surfaceName(command);
		bySurface.set(name, [...(bySurface.get(name) ?? []), command]);
	}
	return Array.from(bySurface.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, commands]) => ({
			name,
			counts: commandCounts(commands),
			commands: commands.slice().sort((left, right) => left.path.join(' ').localeCompare(right.path.join(' ')))
		}));
}

function manifestWithSurfaces(manifest: AppCommandManifest): Record<string, unknown> {
	return {
		...manifest,
		counts: commandCounts(manifest.commands),
		surfaces: surfacesForManifest(manifest)
	};
}

export function manifestForJson(results: ManifestLoadResult[]): unknown {
	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		apps: results.map((result) =>
			result.ok && result.manifest
				? manifestWithSurfaces(result.manifest)
				: {
						app: result.entry.key,
						namespace: result.entry.namespace,
						error: result.error,
						cli: result.resolved.displayPath,
						counts: commandCounts([]),
						surfaces: []
					}
		)
	};
}
