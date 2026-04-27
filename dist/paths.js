import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function resolvePackageRoot(env = process.env) {
    if (env.MERE_CLI_PACKAGE_ROOT?.trim())
        return path.resolve(env.MERE_CLI_PACKAGE_ROOT.trim());
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}
export function resolveMereRoot(env = process.env) {
    if (env.MERE_ROOT?.trim())
        return path.resolve(env.MERE_ROOT.trim());
    return path.resolve(resolvePackageRoot(env), '..');
}
export function resolveMerePaths(env = process.env) {
    const home = env.HOME?.trim() || os.homedir();
    const configHome = env.XDG_CONFIG_HOME?.trim() || path.join(home, '.config');
    const stateHome = env.XDG_STATE_HOME?.trim() || path.join(home, '.local', 'state');
    const configDir = path.join(configHome, 'mere');
    const stateDir = path.join(stateHome, 'mere');
    return {
        packageRoot: resolvePackageRoot(env),
        mereRoot: resolveMereRoot(env),
        configDir,
        stateDir,
        configFile: path.join(configDir, 'config.json'),
        stateFile: path.join(stateDir, 'state.json'),
        auditFile: path.join(stateDir, 'audit.ndjson')
    };
}
export function shellQuote(value) {
    if (/^[A-Za-z0-9_./:@-]+$/.test(value))
        return value;
    return `'${value.replaceAll("'", "'\\''")}'`;
}
