import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readBooleanFlag, readStringFlag } from './args.js';
import { resolveMerePaths } from './paths.js';
import { runCapture } from './process.js';
const DEFAULT_SKILLS_BASE_URL = 'https://merekit.com/skills';
const DEFAULT_REGISTRY_URL = `${DEFAULT_SKILLS_BASE_URL}/index.json`;
const DEFAULT_R2_BUCKET = 'merekit-skills';
const SKILL_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const PUBLIC_REGISTRY_SKILLS = new Set([
    'business-cli',
    'email-cli',
    'finance-cli',
    'gives-cli',
    'mere-cli',
    'mere-onboarding-agent',
    'network-cli',
    'projects-cli',
    'today-cli',
    'video-cli',
    'works-cli',
    'zone-cli'
]);
function writeJson(io, value) {
    io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}
function terminalColumns(env) {
    const parsed = Number.parseInt(env.COLUMNS ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 72)
        return Math.min(parsed, 140);
    return 100;
}
function pad(value, width) {
    if (value.length >= width)
        return value;
    return `${value}${' '.repeat(width - value.length)}`;
}
function wrapText(value, width) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized)
        return [''];
    const lines = [];
    let current = '';
    for (const word of normalized.split(' ')) {
        if (!current) {
            current = word;
            continue;
        }
        if (`${current} ${word}`.length > width) {
            lines.push(current);
            current = word;
        }
        else {
            current = `${current} ${word}`;
        }
    }
    if (current)
        lines.push(current);
    return lines;
}
function sentenceCase(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return trimmed;
    return `${trimmed[0]?.toUpperCase() ?? ''}${trimmed.slice(1)}`;
}
function listSummary(description) {
    return sentenceCase(description
        .replace(/^Use this skill to\s+/i, '')
        .replace(/^Use this skill when\s+/i, '')
        .replace(/^Use this skill for\s+/i, '')
        .trim());
}
function formatSkillList(skills, env, source) {
    if (skills.length === 0)
        return 'No skills found.\n';
    const columns = terminalColumns(env);
    const nameWidth = Math.min(Math.max('Name'.length, ...skills.map((skill) => skill.name.length)), 24);
    const repoWidth = Math.min(Math.max('Repo'.length, ...skills.map((skill) => skill.repo.length)), 12);
    const gutter = 3;
    const summaryWidth = Math.max(32, columns - nameWidth - repoWidth - gutter * 2);
    const title = source === 'local' ? `Mere skills local preview (${skills.length})` : `Mere skills (${skills.length})`;
    const lines = [
        title,
        `${pad('Name', nameWidth)}${' '.repeat(gutter)}${pad('Repo', repoWidth)}${' '.repeat(gutter)}Summary`,
        `${'-'.repeat(nameWidth)}${' '.repeat(gutter)}${'-'.repeat(repoWidth)}${' '.repeat(gutter)}${'-'.repeat(Math.min(summaryWidth, 48))}`
    ];
    for (const skill of skills) {
        const wrapped = wrapText(listSummary(skill.description), summaryWidth);
        for (let index = 0; index < wrapped.length; index += 1) {
            const name = index === 0 ? skill.name : '';
            const repo = index === 0 ? skill.repo : '';
            lines.push(`${pad(name, nameWidth)}${' '.repeat(gutter)}${pad(repo, repoWidth)}${' '.repeat(gutter)}${wrapped[index]}`);
        }
    }
    lines.push('', 'Use `mere skills show NAME` or `mere skills install NAME --target codex`.');
    return `${lines.join('\n')}\n`;
}
function sha256(buffer) {
    return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}
function expandHome(env, value) {
    const home = env.HOME?.trim() || os.homedir();
    if (value === '~')
        return home;
    if (value.startsWith('~/'))
        return path.join(home, value.slice(2));
    return value;
}
function safeInstallPath(root, relativePath) {
    if (path.isAbsolute(relativePath) || relativePath.includes('\0')) {
        throw new Error(`Unsafe skill file path: ${relativePath}`);
    }
    const destination = path.resolve(root, relativePath);
    const normalizedRoot = path.resolve(root);
    if (destination !== normalizedRoot && !destination.startsWith(`${normalizedRoot}${path.sep}`)) {
        throw new Error(`Unsafe skill file path: ${relativePath}`);
    }
    return destination;
}
function remoteRegistryUrl(env) {
    return env.MERE_SKILLS_REGISTRY_URL?.trim() || DEFAULT_REGISTRY_URL;
}
function parseSkillMeta(markdown, fallbackName) {
    const meta = {};
    if (markdown.startsWith('---\n')) {
        const end = markdown.indexOf('\n---', 4);
        if (end > 0) {
            for (const line of markdown.slice(4, end).split('\n')) {
                const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
                if (match)
                    meta[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
            }
        }
    }
    return {
        name: meta.name || fallbackName,
        description: meta.description ||
            markdown
                .split('\n')
                .map((line) => line.trim())
                .find((line) => line && !line.startsWith('---') && !line.startsWith('#')) ||
            fallbackName
    };
}
async function exists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function listDirectories(parent) {
    try {
        const entries = await readdir(parent, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    }
    catch {
        return [];
    }
}
async function collectSkillFiles(dir, relative = '') {
    const entries = await readdir(path.join(dir, relative), { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name === '.DS_Store')
            continue;
        const childRelative = relative ? path.posix.join(relative, entry.name) : entry.name;
        if (entry.isDirectory()) {
            files.push(...(await collectSkillFiles(dir, childRelative)));
        }
        else if (entry.isFile()) {
            files.push(childRelative);
        }
    }
    return files;
}
async function maybeAddSkill(found, repo, dir, priority) {
    const skillMd = path.join(dir, 'SKILL.md');
    if (!(await exists(skillMd)))
        return;
    const markdown = await readFile(skillMd, 'utf8');
    const meta = parseSkillMeta(markdown, path.basename(dir));
    if (!PUBLIC_REGISTRY_SKILLS.has(meta.name))
        return;
    const current = found.get(meta.name);
    if (current && current.priority <= priority)
        return;
    const stats = await stat(skillMd);
    found.set(meta.name, {
        name: meta.name,
        description: meta.description,
        repo,
        dir,
        priority,
        updatedAt: stats.mtime.toISOString()
    });
}
async function discoverLocalSkills(env) {
    const paths = resolveMerePaths(env);
    const found = new Map();
    const repos = await listDirectories(paths.mereRoot);
    for (const repo of repos) {
        if (repo.startsWith('.') || repo === 'node_modules')
            continue;
        const repoDir = path.join(paths.mereRoot, repo);
        for (const [subdir, priority] of [
            ['skills', 0],
            [path.join('.agents', 'skills'), 1],
            [path.join('.claude', 'skills'), 2]
        ]) {
            const skillsDir = path.join(repoDir, subdir);
            for (const skillName of await listDirectories(skillsDir)) {
                await maybeAddSkill(found, repo, path.join(skillsDir, skillName), priority);
            }
        }
    }
    return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name));
}
async function buildRegistry(skills, baseUrl, env) {
    const generatedAt = new Date().toISOString();
    const entries = [];
    const paths = resolveMerePaths(env);
    for (const skill of skills) {
        const files = [];
        for (const relativePath of await collectSkillFiles(skill.dir)) {
            const bytes = await readFile(path.join(skill.dir, relativePath));
            files.push({
                path: relativePath,
                url: `${baseUrl}/${encodeURIComponent(skill.name)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`,
                digest: sha256(bytes),
                size: bytes.byteLength
            });
        }
        const skillMd = files.find((file) => file.path === 'SKILL.md');
        if (!skillMd)
            continue;
        entries.push({
            name: skill.name,
            type: 'skill-md',
            description: skill.description,
            repo: skill.repo,
            sourcePath: path.relative(paths.mereRoot, skill.dir),
            url: skillMd.url,
            digest: skillMd.digest,
            files,
            install: {
                codex: `mere skills install ${skill.name} --target codex`,
                claude: `mere skills install ${skill.name} --target claude`
            },
            updatedAt: skill.updatedAt
        });
    }
    return {
        $schema: SKILL_SCHEMA,
        schemaVersion: 1,
        generatedAt,
        baseUrl,
        skills: entries
    };
}
async function fetchJson(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok)
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    return (await response.json());
}
async function fetchText(url) {
    const response = await fetch(url, { headers: { accept: 'text/markdown, text/plain;q=0.8' } });
    if (!response.ok)
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    return await response.text();
}
async function fetchBytes(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}
async function loadRemoteRegistry(env) {
    const registry = await fetchJson(remoteRegistryUrl(env));
    if (!Array.isArray(registry.skills))
        throw new Error('Remote skill registry did not include a skills array.');
    return registry;
}
function findSkill(registry, name) {
    if (!name)
        throw new Error('Usage: mere skills show NAME');
    const entry = registry.skills.find((skill) => skill.name === name);
    if (!entry)
        throw new Error(`Skill not found: ${name}`);
    return entry;
}
function wranglerCommand(env) {
    const raw = env.WRANGLER_BIN?.trim() || 'wrangler';
    const parts = raw.split(/\s+/).filter(Boolean);
    return { command: parts[0] ?? 'wrangler', args: parts.slice(1) };
}
async function writeSkillSnapshot(skill, tempDir) {
    const uploads = [];
    for (const relativePath of await collectSkillFiles(skill.dir)) {
        const source = path.join(skill.dir, relativePath);
        const destination = path.join(tempDir, 'skills', skill.name, relativePath);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, await readFile(source));
        uploads.push({ key: `${encodeURIComponent(skill.name)}/${relativePath}`, file: destination });
    }
    return uploads;
}
async function uploadR2Object(io, bucket, key, file, remote) {
    const wrangler = wranglerCommand(io.env);
    const result = await runCapture(wrangler.command, [...wrangler.args, 'r2', 'object', 'put', `${bucket}/${key}`, '--file', file, ...(remote ? ['--remote'] : [])], { env: io.env, timeoutMs: 120_000 });
    if (result.code !== 0) {
        throw new Error(`R2 upload failed for ${key}: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`}`);
    }
}
async function runPublish(io, flags) {
    const baseUrl = readStringFlag(flags, 'base-url') ?? DEFAULT_SKILLS_BASE_URL;
    const bucket = readStringFlag(flags, 'bucket') ?? DEFAULT_R2_BUCKET;
    const dryRun = readBooleanFlag(flags, 'dry-run');
    const remote = !readBooleanFlag(flags, 'local');
    const skills = await discoverLocalSkills(io.env);
    const registry = await buildRegistry(skills, baseUrl, io.env);
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mere-skills-'));
    try {
        const registryFile = path.join(tempDir, 'index.json');
        await writeFile(registryFile, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
        const uploads = [{ key: 'index.json', file: registryFile }];
        for (const skill of skills)
            uploads.push(...(await writeSkillSnapshot(skill, tempDir)));
        if (!dryRun) {
            for (const upload of uploads)
                await uploadR2Object(io, bucket, upload.key, upload.file, remote);
        }
        const payload = {
            ok: true,
            dryRun,
            remote,
            bucket,
            baseUrl,
            skillCount: registry.skills.length,
            uploadCount: uploads.length,
            registry
        };
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, payload);
        else {
            io.stdout(`${dryRun ? 'planned' : 'published'} ${registry.skills.length} skills to ${remote ? 'remote' : 'local'} ${bucket}\n`);
            for (const skill of registry.skills)
                io.stdout(`${skill.name}\t${skill.repo}\t${skill.url}\n`);
        }
        return 0;
    }
    finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}
async function runInstall(io, name, flags) {
    const registry = await loadRemoteRegistry(io.env);
    const skill = findSkill(registry, name);
    const target = readStringFlag(flags, 'target') ?? 'codex';
    if (target !== 'codex' && target !== 'claude')
        throw new Error('Skill target must be codex or claude.');
    const home = io.env.HOME?.trim() || os.homedir();
    const defaultDir = target === 'codex' ? path.join(home, '.codex', 'skills', skill.name) : path.join(home, '.claude', 'skills', skill.name);
    const outputDir = path.resolve(expandHome(io.env, readStringFlag(flags, 'dir') ?? defaultDir));
    if ((await exists(outputDir)) && !readBooleanFlag(flags, 'yes')) {
        throw new Error(`Refusing to overwrite ${outputDir}. Re-run with --yes to replace it.`);
    }
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
    for (const file of skill.files) {
        const body = await fetchBytes(file.url);
        if (sha256(body) !== file.digest)
            throw new Error(`Digest mismatch for ${file.url}`);
        const destination = safeInstallPath(outputDir, file.path);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, body);
    }
    const payload = { ok: true, target, name: skill.name, dir: outputDir, files: skill.files.length };
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, payload);
    else
        io.stdout(`installed ${skill.name} to ${outputDir}\n`);
    return 0;
}
export async function runSkills(io, action, args, flags) {
    if (!action || action === 'list') {
        if (readBooleanFlag(flags, 'local')) {
            const registry = await buildRegistry(await discoverLocalSkills(io.env), readStringFlag(flags, 'base-url') ?? DEFAULT_SKILLS_BASE_URL, io.env);
            if (readBooleanFlag(flags, 'json'))
                writeJson(io, registry);
            else
                io.stdout(formatSkillList(registry.skills, io.env, 'local'));
            return 0;
        }
        const registry = await loadRemoteRegistry(io.env);
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, registry);
        else
            io.stdout(formatSkillList(registry.skills, io.env, 'remote'));
        return 0;
    }
    if (action === 'show') {
        const registry = await loadRemoteRegistry(io.env);
        const skill = findSkill(registry, args[0]);
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, skill);
        else
            io.stdout(await fetchText(skill.url));
        return 0;
    }
    if (action === 'install')
        return await runInstall(io, args[0], flags);
    if (action === 'publish')
        return await runPublish(io, flags);
    throw new Error('Usage: mere skills list|show|install|publish');
}
