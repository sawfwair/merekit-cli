import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { constants } from 'node:fs';
import { access, chmod, copyFile, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { runCapture } from './process.js';
export const DEFAULT_MERE_RUN_DMG_URL = 'https://mere.run/releases/mere-run.dmg';
const GLOBAL_CANDIDATES = ['/usr/local/bin/mere.run', '/opt/homebrew/bin/mere.run'];
export const MERE_RUN_APP_MODEL_REQUESTS = {
    media: [
        {
            app: 'media',
            id: 'speech-asr-parakeet',
            reason: 'Media local processing uses `mere.run speech transcribe --backend auto` for transcript generation.',
            commands: ['mere media process ... --transcribe']
        },
        {
            app: 'media',
            id: 'text-embed-qwen3-0.6b',
            reason: 'Media local processing uses `mere.run text embed` for transcript segment search.',
            commands: ['mere media process ... --embed']
        }
    ]
};
export function appMereRunModelRequests(app) {
    if (app)
        return MERE_RUN_APP_MODEL_REQUESTS[app] ?? [];
    return Object.values(MERE_RUN_APP_MODEL_REQUESTS).flat();
}
function homeDir(env) {
    return env.HOME?.trim() || os.homedir();
}
function expandPath(value, env) {
    if (value === '~')
        return homeDir(env);
    if (value.startsWith('~/'))
        return path.join(homeDir(env), value.slice(2));
    return path.resolve(value);
}
export function defaultMereRunInstallBin(env, override) {
    const value = override?.trim() ||
        env.MERE_MEDIA_MERE_RUN_INSTALL_BIN?.trim() ||
        env.MERE_RUN_INSTALL_BIN?.trim() ||
        path.join(homeDir(env), '.local', 'bin', 'mere.run');
    return expandPath(value, env);
}
export function defaultMereRunSourceDir(mereRoot, env, override) {
    const value = override?.trim() || env.MERE_RUN_SOURCE_DIR?.trim() || env.MERE_MEDIA_MERE_RUN_SOURCE_DIR?.trim() || path.join(mereRoot, 'run-public');
    return expandPath(value, env);
}
function configuredBin(env, explicitBin) {
    const value = explicitBin?.trim() || env.MERE_MEDIA_MERE_RUN_BIN?.trim() || env.MERE_RUN_BIN?.trim();
    return value ? expandPath(value, env) : null;
}
function configuredDownloadUrl(env, override) {
    return override?.trim() || env.MERE_MEDIA_MERE_RUN_DOWNLOAD_URL?.trim() || env.MERE_RUN_DOWNLOAD_URL?.trim() || DEFAULT_MERE_RUN_DMG_URL;
}
function configuredSha256(env, override) {
    return override?.trim() || env.MERE_MEDIA_MERE_RUN_DOWNLOAD_SHA256?.trim() || env.MERE_RUN_DOWNLOAD_SHA256?.trim() || null;
}
async function isExecutable(filePath) {
    try {
        await access(filePath, constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
function which(binary, env) {
    const pathValue = env.PATH ?? process.env.PATH ?? '';
    for (const segment of pathValue.split(path.delimiter)) {
        if (!segment)
            continue;
        const candidate = path.join(segment, binary);
        if (existsSync(candidate))
            return candidate;
    }
    return null;
}
function appBundleCandidates(env) {
    const home = homeDir(env);
    return [
        path.join(home, 'Applications', 'MereRun.app', 'Contents', 'Resources', 'mere.run', 'mere.run'),
        path.join(home, 'Applications', 'MereRun.app', 'Contents', 'MacOS', 'mere.run'),
        '/Applications/MereRun.app/Contents/Resources/mere.run/mere.run',
        '/Applications/MereRun.app/Contents/MacOS/mere.run'
    ];
}
async function versionFor(bin, env) {
    const result = await runCapture(bin, ['--version'], { env, timeoutMs: 20_000 }).catch(() => null);
    if (!result || result.code !== 0)
        return null;
    return result.stdout.trim() || null;
}
async function usableCli(bin, env) {
    const result = await runCapture(bin, ['model', 'list'], { env, timeoutMs: 10_000 }).catch((error) => ({
        code: 124,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error)
    }));
    if (result.code === 0 && /\b(ID|Status|missing|installed)\b/u.test(result.stdout)) {
        return { ok: true };
    }
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n');
    return {
        ok: false,
        detail: detail || `model list exited with code ${result.code}`
    };
}
async function inspectCandidate(source, bin, env, installBin, sourceDir, steps) {
    if (!(await isExecutable(bin)))
        return null;
    const usable = await usableCli(bin, env);
    if (!usable.ok) {
        steps.push({
            action: `${source} unusable`,
            ok: false,
            detail: `${bin}: ${usable.detail ?? 'not a usable mere.run CLI'}`
        });
        return null;
    }
    return {
        ok: true,
        installed: false,
        source,
        bin,
        installBin,
        sourceDir,
        version: await versionFor(bin, env),
        steps
    };
}
function mergeModelRequests(requests) {
    const merged = new Map();
    for (const request of requests) {
        const existing = merged.get(request.id);
        if (existing) {
            if (!existing.requestedBy.includes(request.app))
                existing.requestedBy.push(request.app);
            if (!existing.reasons.includes(request.reason))
                existing.reasons.push(request.reason);
            for (const command of request.commands) {
                if (!existing.commands.includes(command))
                    existing.commands.push(command);
            }
            continue;
        }
        merged.set(request.id, {
            id: request.id,
            status: 'unknown',
            requestedBy: [request.app],
            reasons: [request.reason],
            commands: [...request.commands]
        });
    }
    return [...merged.values()];
}
function parseModelStatus(output, id) {
    for (const line of output.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith(id))
            continue;
        const rest = trimmed.slice(id.length).trim();
        const match = /\b(installed|missing)\b/u.exec(rest);
        if (match?.[1] === 'installed' || match?.[1] === 'missing')
            return match[1];
    }
    return 'unknown';
}
export async function inspectMereRun(options) {
    const env = options.env;
    const explicit = configuredBin(env, options.explicitBin);
    const installBin = defaultMereRunInstallBin(env, options.installBin);
    const sourceDir = defaultMereRunSourceDir(options.mereRoot, env, options.sourceDir);
    const steps = [];
    if (explicit) {
        if (!(await isExecutable(explicit))) {
            return {
                ok: false,
                installed: false,
                source: 'missing',
                bin: null,
                installBin,
                sourceDir,
                version: null,
                steps,
                error: `mere.run binary is not executable: ${explicit}`
            };
        }
        const inspected = await inspectCandidate('explicit', explicit, env, installBin, sourceDir, steps);
        return inspected ?? {
            ok: false,
            installed: false,
            source: 'missing',
            bin: null,
            installBin,
            sourceDir,
            version: null,
            steps,
            error: `mere.run binary is not a usable CLI: ${explicit}`
        };
    }
    const onPath = which('mere.run', env);
    if (onPath) {
        const inspected = await inspectCandidate('path', onPath, env, installBin, sourceDir, steps);
        if (inspected)
            return inspected;
    }
    for (const candidate of appBundleCandidates(env)) {
        const inspected = await inspectCandidate('app', candidate, env, installBin, sourceDir, steps);
        if (inspected)
            return inspected;
    }
    for (const candidate of GLOBAL_CANDIDATES) {
        const inspected = await inspectCandidate('global', candidate, env, installBin, sourceDir, steps);
        if (inspected)
            return inspected;
    }
    const inspected = await inspectCandidate('cached', installBin, env, installBin, sourceDir, steps);
    if (inspected)
        return inspected;
    return { ok: false, installed: false, source: 'missing', bin: null, installBin, sourceDir, version: null, steps };
}
async function sourcePackageExists(sourceDir) {
    try {
        await access(path.join(sourceDir, 'Package.swift'));
        return true;
    }
    catch {
        return false;
    }
}
async function findBuiltSourceBin(sourceDir, env) {
    const result = await runCapture('swift', ['build', '-c', 'release', '--show-bin-path'], { cwd: sourceDir, env, timeoutMs: 30_000 }).catch(() => null);
    const reported = result?.code === 0 ? result.stdout.trim().split(/\r?\n/u).at(-1) : null;
    const candidates = [
        reported ? path.join(reported, 'mere.run') : null,
        path.join(sourceDir, '.build', 'release', 'mere.run'),
        path.join(sourceDir, '.build', 'debug', 'mere.run')
    ].filter((candidate) => Boolean(candidate));
    for (const candidate of candidates) {
        if (await isExecutable(candidate))
            return candidate;
    }
    return null;
}
async function linkOrCopyBin(sourceBin, installBin) {
    if (path.resolve(sourceBin) === path.resolve(installBin))
        return 'same';
    await mkdir(path.dirname(installBin), { recursive: true });
    await rm(installBin, { force: true });
    try {
        await symlink(sourceBin, installBin);
        return 'linked';
    }
    catch {
        await copyFile(sourceBin, installBin);
        await chmod(installBin, 0o755);
        return 'copied';
    }
}
async function download(url, dest, redirects = 0) {
    await new Promise((resolve, reject) => {
        const file = createWriteStream(dest);
        https
            .get(url, (response) => {
            const location = response.headers.location;
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && location && redirects < 5) {
                file.close();
                void rm(dest, { force: true }).finally(() => {
                    download(new URL(location, url).toString(), dest, redirects + 1).then(resolve, reject);
                });
                return;
            }
            if (response.statusCode && response.statusCode >= 400) {
                file.close();
                reject(new Error(`Download failed with status ${response.statusCode.toString()}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        })
            .on('error', (error) => {
            file.close();
            reject(error);
        });
    });
}
async function sha256File(filePath) {
    const hash = createHash('sha256');
    await new Promise((resolve, reject) => {
        const stream = createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', resolve);
    });
    return hash.digest('hex');
}
async function installFromDmg(env, installBin, url, expectedSha256, steps) {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'mere-run-install-'));
    const dmg = path.join(tmp, 'mere-run.dmg');
    const mount = path.join(tmp, 'mount');
    await mkdir(mount);
    try {
        await download(url, dmg);
        const actualSha256 = await sha256File(dmg);
        if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
            throw new Error('Downloaded mere.run DMG failed SHA-256 verification.');
        }
        steps.push({ action: 'download', ok: true, detail: url });
        const attach = await runCapture('hdiutil', ['attach', dmg, '-mountpoint', mount, '-nobrowse', '-readonly', '-quiet'], { env, timeoutMs: 120_000 });
        steps.push({ action: 'hdiutil attach', ok: attach.code === 0, code: attach.code, detail: attach.stderr.trim() || attach.stdout.trim() });
        if (attach.code !== 0)
            throw new Error(attach.stderr.trim() || attach.stdout.trim() || 'Unable to mount mere.run DMG.');
        const installer = path.join(mount, 'install.sh');
        const install = await runCapture(installer, [], { env: { ...env, MERERUN_INSTALL_BIN_DEST: installBin }, timeoutMs: 120_000 });
        steps.push({ action: 'dmg install', ok: install.code === 0, code: install.code, detail: install.stderr.trim() || install.stdout.trim() });
        await runCapture('hdiutil', ['detach', mount, '-quiet'], { env, timeoutMs: 60_000 }).catch(() => null);
        if (install.code !== 0)
            throw new Error(install.stderr.trim() || install.stdout.trim() || 'mere.run installer failed.');
        return installBin;
    }
    finally {
        await rm(tmp, { recursive: true, force: true });
    }
}
export async function setupMereRun(options) {
    const existing = await inspectMereRun(options);
    const env = options.env;
    const installBin = existing.installBin;
    const sourceDir = existing.sourceDir;
    const steps = [...existing.steps];
    if (existing.ok && !options.force && existing.source !== 'app')
        return existing;
    if (existing.ok && (existing.source === 'explicit' || existing.source === 'app') && existing.bin) {
        const installMode = await linkOrCopyBin(existing.bin, installBin);
        steps.push({ action: installMode === 'same' ? `${existing.source} already install target` : `${existing.source} ${installMode}`, ok: true, detail: `${existing.bin} -> ${installBin}` });
        return {
            ok: true,
            installed: true,
            source: existing.source,
            bin: installBin,
            installBin,
            sourceDir,
            version: await versionFor(installBin, env),
            steps
        };
    }
    if (!options.noSource && (await sourcePackageExists(sourceDir))) {
        const build = await runCapture('swift', ['build', '-c', 'release', '--product', 'mere.run'], { cwd: sourceDir, env, timeoutMs: 20 * 60_000 });
        steps.push({ action: 'swift build', ok: build.code === 0, code: build.code, detail: build.stderr.trim() || build.stdout.trim() });
        if (build.code !== 0) {
            return { ok: false, installed: false, source: 'source', bin: null, installBin, sourceDir, version: null, steps, error: build.stderr.trim() || build.stdout.trim() || 'swift build failed.' };
        }
        const sourceBin = await findBuiltSourceBin(sourceDir, env);
        if (!sourceBin) {
            return { ok: false, installed: false, source: 'source', bin: null, installBin, sourceDir, version: null, steps, error: 'swift build completed, but .build/release/mere.run was not found.' };
        }
        const installMode = await linkOrCopyBin(sourceBin, installBin);
        steps.push({ action: installMode === 'same' ? 'source already install target' : `source ${installMode}`, ok: true, detail: `${sourceBin} -> ${installBin}` });
        return {
            ok: true,
            installed: true,
            source: 'source',
            bin: installBin,
            installBin,
            sourceDir,
            version: await versionFor(installBin, env),
            steps
        };
    }
    if (!options.noDownload) {
        const sha256 = configuredSha256(env, options.sha256);
        if (sha256) {
            const bin = await installFromDmg(env, installBin, configuredDownloadUrl(env, options.downloadUrl), sha256, steps);
            return { ok: true, installed: true, source: 'dmg', bin, installBin, sourceDir, version: await versionFor(bin, env), steps };
        }
    }
    return {
        ok: false,
        installed: false,
        source: 'missing',
        bin: null,
        installBin,
        sourceDir,
        version: null,
        steps,
        error: `mere.run is not installed. Install MereRun.app from https://mere.run, pass --source-dir ~/mere/run-public for a local build, pass --bin /path/to/mere.run to link an existing binary, or set MERE_MEDIA_MERE_RUN_DOWNLOAD_SHA256 to enable verified DMG installation from ${configuredDownloadUrl(env, options.downloadUrl)}.`
    };
}
export async function inspectMereRunModels(options, requests, runtimeOverride) {
    const runtime = runtimeOverride ?? (await inspectMereRun(options));
    const models = mergeModelRequests(requests);
    if (!runtime.ok || !runtime.bin) {
        return {
            ok: false,
            runtime,
            models,
            missing: models.map((model) => model.id),
            pulls: [],
            error: runtime.error ?? 'mere.run runtime is not available.'
        };
    }
    const list = await runCapture(runtime.bin, ['model', 'list'], { env: options.env, timeoutMs: 60_000 }).catch((error) => ({
        code: 1,
        signal: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error)
    }));
    if (list.code !== 0) {
        return {
            ok: false,
            runtime,
            models,
            missing: models.map((model) => model.id),
            pulls: [],
            error: list.stderr.trim() || list.stdout.trim() || 'mere.run model list failed.'
        };
    }
    for (const model of models) {
        model.status = parseModelStatus(list.stdout, model.id);
    }
    const missing = models.filter((model) => model.status !== 'installed').map((model) => model.id);
    return { ok: missing.length === 0, runtime, models, missing, pulls: [] };
}
export async function pullMereRunModels(options, requests) {
    const runtime = await setupMereRun(options);
    const before = await inspectMereRunModels(options, requests, runtime);
    if (!runtime.ok || !runtime.bin)
        return before;
    const pulls = [];
    for (const model of before.models) {
        if (model.status === 'installed' && !options.force) {
            pulls.push({ id: model.id, ok: true, skipped: true });
            continue;
        }
        const result = await runCapture(runtime.bin, ['model', 'pull', model.id, '--quiet', ...(options.force ? ['--force'] : [])], {
            env: options.env,
            timeoutMs: 60 * 60_000
        }).catch((error) => ({
            code: 1,
            signal: null,
            stdout: '',
            stderr: error instanceof Error ? error.message : String(error)
        }));
        pulls.push({
            id: model.id,
            ok: result.code === 0,
            skipped: false,
            code: result.code,
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim()
        });
    }
    const after = await inspectMereRunModels(options, requests, runtime);
    const afterById = new Map(after.models.map((model) => [model.id, model.status]));
    for (const pull of pulls) {
        if (pull.skipped || !pull.ok)
            continue;
        if (afterById.get(pull.id) !== 'installed') {
            pull.ok = false;
            pull.stderr = [pull.stderr, 'Pull command exited successfully, but the model is still not reported as installed by `mere.run model list`.'].filter(Boolean).join('\n');
        }
    }
    return {
        ...after,
        ok: pulls.every((pull) => pull.ok) && after.ok,
        pulls,
        ...(pulls.some((pull) => !pull.ok) ? { error: 'One or more mere.run model pulls failed.' } : {})
    };
}
