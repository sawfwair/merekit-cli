import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
export const emptyConfig = () => ({ version: 1, repoPaths: {} });
export const emptyState = () => ({ version: 1, updatedAt: new Date(0).toISOString() });
async function readJson(filePath, fallback) {
    try {
        return JSON.parse(await readFile(filePath, 'utf8'));
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return fallback;
        throw error;
    }
}
export async function loadConfig(paths) {
    const config = await readJson(paths.configFile, emptyConfig());
    return config.version === 1 ? config : emptyConfig();
}
export async function loadState(paths) {
    const state = await readJson(paths.stateFile, emptyState());
    return state.version === 1 ? state : emptyState();
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
