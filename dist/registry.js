import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
export const PRODUCT_APP_KEYS = [
    'business',
    'finance',
    'projects',
    'agent',
    'today',
    'zone',
    'video',
    'network',
    'email',
    'gives',
    'works',
    'media',
    'deliver',
    'link'
];
export const APP_KEYS = [...PRODUCT_APP_KEYS];
function repo(mereRoot, name) {
    return path.join(mereRoot, name);
}
function adapter(packageRoot, key) {
    return path.join(packageRoot, 'adapters', key, 'run.js');
}
function readCliSourceMode(env) {
    const value = env.MERE_CLI_SOURCE?.trim().toLowerCase();
    if (!value)
        return 'auto';
    if (value === 'auto' || value === 'bundled' || value === 'local' || value === 'path')
        return value;
    throw new Error(`Invalid MERE_CLI_SOURCE: ${value}. Expected auto, bundled, local, or path.`);
}
export function createRegistry(mereRoot, packageRoot = repo(mereRoot, 'cli')) {
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
            key: 'agent',
            label: 'Agent',
            namespace: 'agent',
            aliases: ['agent', 'agents', 'mere-agent'],
            repoDir: repo(mereRoot, 'agent'),
            envCliPath: 'MERE_AGENT_CLI',
            bundledCliPath: adapter(packageRoot, 'agent'),
            localCliPath: path.join(repo(mereRoot, 'agent'), 'cli-dist', 'run.js'),
            pathBins: ['mere-agent'],
            authKind: 'browser',
            packageScripts: { build: 'build:cli', check: 'check:cli' }
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
        },
        {
            key: 'works',
            label: 'Works',
            namespace: 'works',
            aliases: ['works', 'mere-works'],
            repoDir: repo(mereRoot, 'works'),
            envCliPath: 'MERE_WORKS_CLI',
            bundledCliPath: adapter(packageRoot, 'works'),
            localCliPath: path.join(repo(mereRoot, 'works'), 'dist', 'run.js'),
            pathBins: ['mere-works'],
            authKind: 'browser',
            packageScripts: { build: 'build:cli', check: 'check' }
        },
        {
            key: 'media',
            label: 'Media',
            namespace: 'media',
            aliases: ['media', 'mere-media', 'meremedia'],
            repoDir: repo(mereRoot, 'media'),
            envCliPath: 'MERE_MEDIA_CLI',
            bundledCliPath: adapter(packageRoot, 'media'),
            localCliPath: path.join(repo(mereRoot, 'media'), 'dist', 'run.js'),
            pathBins: ['mere-media'],
            authKind: 'browser',
            packageScripts: { build: 'build:cli', check: 'check' }
        },
        {
            key: 'deliver',
            label: 'Deliver',
            namespace: 'deliver',
            aliases: ['deliver', 'mere-deliver', 'share'],
            repoDir: repo(mereRoot, 'deliver'),
            envCliPath: 'MERE_DELIVER_CLI',
            bundledCliPath: adapter(packageRoot, 'deliver'),
            localCliPath: path.join(repo(mereRoot, 'deliver'), 'cli', 'run.js'),
            pathBins: ['mere-deliver'],
            authKind: 'none',
            packageScripts: { build: 'build:cli', check: 'check:cli', smoke: 'smoke:cli' }
        },
        {
            key: 'link',
            label: 'Link',
            namespace: 'link',
            aliases: ['link', 'links', 'mere-link', 'merekit-link'],
            repoDir: repo(mereRoot, 'merekit-link'),
            envCliPath: 'MERE_LINK_CLI',
            bundledCliPath: adapter(packageRoot, 'link'),
            localCliPath: path.join(repo(mereRoot, 'merekit-link'), 'dist', 'run.js'),
            pathBins: ['mere-link'],
            authKind: 'none',
            packageScripts: { build: 'build', check: 'check', smoke: 'smoke' }
        }
    ];
}
export function findEntry(registry, value) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized)
        return null;
    return registry.find((entry) => entry.aliases.includes(normalized) || entry.key === normalized) ?? null;
}
async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function executableForPath(filePath, entry, source) {
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
export async function resolveCli(entry, env = process.env) {
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
        if (sourceMode === 'bundled')
            return resolved;
    }
    if (sourceMode === 'auto' || sourceMode === 'local') {
        const resolved = executableForPath(entry.localCliPath, entry, 'local');
        if (await exists(entry.localCliPath)) {
            return { ...resolved, exists: true };
        }
        if (sourceMode === 'local')
            return resolved;
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
export function executionCwd(entry, resolved) {
    if (resolved.source === 'local')
        return entry.repoDir;
    if (resolved.source === 'bundled' || resolved.source === 'env')
        return path.dirname(resolved.displayPath);
    return undefined;
}
export function findPnpm(env = process.env) {
    if (env.PNPM_BIN?.trim())
        return env.PNPM_BIN.trim();
    return 'pnpm';
}
