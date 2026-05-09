import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { parseJson } from './json.js';
export const emptyConfig = () => ({ version: 1, repoPaths: {} });
export const emptyState = () => ({ version: 1, updatedAt: new Date(0).toISOString() });
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
async function readJsonFile(filePath, fallback) {
    try {
        return parseJson(await readFile(filePath, 'utf8'));
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return fallback;
        throw error;
    }
}
export async function loadConfig(paths) {
    const parsed = mereConfigSchema.safeParse(await readJsonFile(paths.configFile, emptyConfig()));
    return parsed.success ? parsed.data : emptyConfig();
}
export async function loadState(paths) {
    const parsed = mereStateSchema.safeParse(await readJsonFile(paths.stateFile, emptyState()));
    return parsed.success ? parsed.data : emptyState();
}
export async function saveConfig(paths, config) {
    await mkdir(paths.configDir, { recursive: true });
    await writeFile(paths.configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
export async function saveState(paths, state) {
    await mkdir(paths.stateDir, { recursive: true });
    await writeFile(paths.stateFile, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}
export async function clearState(paths) {
    await rm(paths.stateFile, { force: true });
}
