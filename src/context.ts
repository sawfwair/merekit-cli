import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { AppKey } from './types.js';
import type { MerePaths } from './paths.js';
import { parseJson } from './json.js';

export type MereConfig = {
	version: 1;
	repoPaths?: Partial<Record<AppKey, string>> | undefined;
};

export type MereState = {
	version: 1;
	defaultWorkspace?: string | null | undefined;
	defaultProfile?: string | null | undefined;
	appWorkspaces?: Partial<Record<AppKey, string>> | undefined;
	updatedAt: string;
};

export const emptyConfig = (): MereConfig => ({ version: 1, repoPaths: {} });
export const emptyState = (): MereState => ({ version: 1, updatedAt: new Date(0).toISOString() });

const mereConfigSchema = z.object({
	version: z.literal(1),
	repoPaths: z.record(z.string(), z.string()).optional()
});

const mereStateSchema = z.object({
	version: z.literal(1),
	defaultWorkspace: z.string().nullable().optional(),
	defaultProfile: z.string().nullable().optional(),
	appWorkspaces: z.record(z.string(), z.string()).optional(),
	updatedAt: z.string()
});

async function readJsonFile(filePath: string, fallback: unknown): Promise<unknown> {
	try {
		return parseJson(await readFile(filePath, 'utf8'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
		throw error;
	}
}

export async function loadConfig(paths: MerePaths): Promise<MereConfig> {
	const parsed = mereConfigSchema.safeParse(await readJsonFile(paths.configFile, emptyConfig()));
	return parsed.success ? parsed.data : emptyConfig();
}

export async function loadState(paths: MerePaths): Promise<MereState> {
	const parsed = mereStateSchema.safeParse(await readJsonFile(paths.stateFile, emptyState()));
	return parsed.success ? parsed.data : emptyState();
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
