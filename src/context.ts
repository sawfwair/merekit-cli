import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import type { AppKey } from './types.js';
import type { MerePaths } from './paths.js';

export type MereConfig = {
	version: 1;
	repoPaths?: Partial<Record<AppKey, string>>;
};

export type MereState = {
	version: 1;
	defaultWorkspace?: string | null;
	defaultProfile?: string | null;
	appWorkspaces?: Partial<Record<AppKey, string>>;
	updatedAt: string;
};

export const emptyConfig = (): MereConfig => ({ version: 1, repoPaths: {} });
export const emptyState = (): MereState => ({ version: 1, updatedAt: new Date(0).toISOString() });

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await readFile(filePath, 'utf8')) as T;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
		throw error;
	}
}

export async function loadConfig(paths: MerePaths): Promise<MereConfig> {
	const config = await readJson(paths.configFile, emptyConfig());
	return config.version === 1 ? config : emptyConfig();
}

export async function loadState(paths: MerePaths): Promise<MereState> {
	const state = await readJson(paths.stateFile, emptyState());
	return state.version === 1 ? state : emptyState();
}

export async function saveConfig(paths: MerePaths, config: MereConfig): Promise<void> {
	await mkdir(paths.configDir, { recursive: true });
	await writeFile(paths.configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function saveState(paths: MerePaths, state: MereState): Promise<void> {
	await mkdir(paths.stateDir, { recursive: true });
	await writeFile(paths.stateFile, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

export async function clearState(paths: MerePaths): Promise<void> {
	await rm(paths.stateFile, { force: true });
}
