import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { AppKey, RegistryEntry, ResolvedCli } from './types.js';

export const PRODUCT_APP_KEYS: AppKey[] = [
	'business',
	'finance',
	'projects',
	'today',
	'zone',
	'video',
	'network',
	'email',
	'gives'
];

export const APP_KEYS: AppKey[] = [...PRODUCT_APP_KEYS];

function repo(mereRoot: string, name: string): string {
	return path.join(mereRoot, name);
}

function adapter(packageRoot: string, key: AppKey): string {
	return path.join(packageRoot, 'adapters', key, 'run.js');
}

type CliSourceMode = 'auto' | 'bundled' | 'local' | 'path';

function readCliSourceMode(env: NodeJS.ProcessEnv): CliSourceMode {
	const value = env.MERE_CLI_SOURCE?.trim().toLowerCase();
	if (!value) return 'auto';
	if (value === 'auto' || value === 'bundled' || value === 'local' || value === 'path') return value;
	throw new Error(`Invalid MERE_CLI_SOURCE: ${value}. Expected auto, bundled, local, or path.`);
}

export function createRegistry(mereRoot: string, packageRoot = repo(mereRoot, 'cli')): RegistryEntry[] {
	return [
		{
			key: 'business',
			label: 'Business',
			namespace: 'business',
			aliases: ['business', 'zerosmb', 'biz'],
			repoDir: repo(mereRoot, 'business'),
			envCliPath: 'MERE_BUSINESS_CLI',
			bundledCliPath: adapter(packageRoot, 'business'),
			localCliPath: path.join(repo(mereRoot, 'business'), 'packages', 'cli', 'dist', 'index.js'),
			pathBins: ['mere-business', 'zerosmb'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'finance',
			label: 'Finance',
			namespace: 'finance',
			aliases: ['finance', 'merefi', 'mere-fi'],
			repoDir: repo(mereRoot, 'finance'),
			envCliPath: 'MERE_FINANCE_CLI',
			bundledCliPath: adapter(packageRoot, 'finance'),
			localCliPath: path.join(repo(mereRoot, 'finance'), 'packages', 'cli', 'dist', 'cli', 'bin', 'merefi.js'),
			pathBins: ['merefi'],
			authKind: 'token',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'projects',
			label: 'Projects',
			namespace: 'projects',
			aliases: ['projects', 'project', 'pastperf', 'mere-projects'],
			repoDir: repo(mereRoot, 'projects'),
			envCliPath: 'MERE_PROJECTS_CLI',
			bundledCliPath: adapter(packageRoot, 'projects'),
			localCliPath: path.join(repo(mereRoot, 'projects'), 'dist', 'run.js'),
			pathBins: ['mere-projects', 'pastperf', 'projects'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'today',
			label: 'Today',
			namespace: 'today',
			aliases: ['today', 'yourtime', 'mere-today'],
			repoDir: repo(mereRoot, 'today'),
			envCliPath: 'MERE_TODAY_CLI',
			bundledCliPath: adapter(packageRoot, 'today'),
			localCliPath: path.join(repo(mereRoot, 'today'), 'dist', 'run.js'),
			pathBins: ['mere-today', 'yourtime'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'zone',
			label: 'Zone',
			namespace: 'zone',
			aliases: ['zone', 'merezone', 'mere-zone'],
			repoDir: repo(mereRoot, 'zone'),
			envCliPath: 'MERE_ZONE_CLI',
			bundledCliPath: adapter(packageRoot, 'zone'),
			localCliPath: path.join(repo(mereRoot, 'zone'), 'dist', 'run.js'),
			pathBins: ['mere-zone', 'merezone'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'video',
			label: 'Video',
			namespace: 'video',
			aliases: ['video', 'meets', 'mere-video'],
			repoDir: repo(mereRoot, 'video'),
			envCliPath: 'MERE_VIDEO_CLI',
			bundledCliPath: adapter(packageRoot, 'video'),
			localCliPath: path.join(repo(mereRoot, 'video'), 'dist', 'run.js'),
			pathBins: ['mere-video', 'meets'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'network',
			label: 'Network',
			namespace: 'network',
			aliases: ['network', 'voxbooth', 'mere-network'],
			repoDir: repo(mereRoot, 'network'),
			envCliPath: 'MERE_NETWORK_CLI',
			bundledCliPath: adapter(packageRoot, 'network'),
			localCliPath: path.join(repo(mereRoot, 'network'), 'dist', 'run.js'),
			pathBins: ['mere-network', 'voxbooth'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'email',
			label: 'Email',
			namespace: 'email',
			aliases: ['email', 'zerodispatch', 'mere-email'],
			repoDir: repo(mereRoot, 'email'),
			envCliPath: 'MERE_EMAIL_CLI',
			bundledCliPath: adapter(packageRoot, 'email'),
			localCliPath: path.join(repo(mereRoot, 'email'), 'dist', 'run.js'),
			pathBins: ['mere-email'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		},
		{
			key: 'gives',
			label: 'Gives',
			namespace: 'gives',
			aliases: ['gives', 'zerodonate', 'mere-gives'],
			repoDir: repo(mereRoot, 'gives'),
			envCliPath: 'MERE_GIVES_CLI',
			bundledCliPath: adapter(packageRoot, 'gives'),
			localCliPath: path.join(repo(mereRoot, 'gives'), 'dist', 'run.js'),
			pathBins: ['mere-gives', 'zerodonate'],
			authKind: 'browser',
			packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
		}
	];
}

export function findEntry(registry: RegistryEntry[], value: string | undefined): RegistryEntry | null {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return null;
	return registry.find((entry) => entry.aliases.includes(normalized) || entry.key === normalized) ?? null;
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function executableForPath(filePath: string, entry: RegistryEntry, source: ResolvedCli['source']): ResolvedCli {
	if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
		return {
			entry,
			source,
			command: process.execPath,
			args: [filePath],
			exists: false,
			displayPath: filePath
		};
	}
	return { entry, source, command: filePath, args: [], exists: false, displayPath: filePath };
}

export async function resolveCli(entry: RegistryEntry, env: NodeJS.ProcessEnv = process.env): Promise<ResolvedCli> {
	const override = env[entry.envCliPath]?.trim();
	if (override) {
		const resolved = executableForPath(path.resolve(override), entry, 'env');
		return { ...resolved, exists: await exists(resolved.displayPath) };
	}

	const sourceMode = readCliSourceMode(env);
	if (sourceMode === 'auto' || sourceMode === 'bundled') {
		const resolved = executableForPath(entry.bundledCliPath, entry, 'bundled');
		if (await exists(entry.bundledCliPath)) {
			return { ...resolved, exists: true };
		}
		if (sourceMode === 'bundled') return resolved;
	}

	if (sourceMode === 'auto' || sourceMode === 'local') {
		const resolved = executableForPath(entry.localCliPath, entry, 'local');
		if (await exists(entry.localCliPath)) {
			return { ...resolved, exists: true };
		}
		if (sourceMode === 'local') return resolved;
	}

	return {
		entry,
		source: 'path',
		command: entry.pathBins[0] ?? entry.key,
		args: [],
		exists: true,
		displayPath: entry.pathBins[0] ?? entry.key
	};
}

export function executionCwd(entry: RegistryEntry, resolved: ResolvedCli): string | undefined {
	if (resolved.source === 'local') return entry.repoDir;
	if (resolved.source === 'bundled' || resolved.source === 'env') return path.dirname(resolved.displayPath);
	return undefined;
}

export function findPnpm(env: NodeJS.ProcessEnv = process.env): string {
	if (env.PNPM_BIN?.trim()) return env.PNPM_BIN.trim();
	return 'pnpm';
}
