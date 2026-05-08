#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
const VERSION = 'mere-link 0.1.0';
const DEFAULT_CONFIG = 'mere.link.yaml';
const WRITES = ['create', 'update', 'delete', 'comment', 'message', 'bookmark', 'pin', 'topic', 'purpose', 'sync'];
const PLUGINS = {
    mere: { kinds: ['workspace', 'app', 'record', 'link'], writes: [] },
    'github-cli': { kinds: ['repo', 'issue-tracker', 'link'], writes: ['create', 'update', 'comment'] },
    slack: { kinds: ['channel'], writes: ['topic', 'purpose', 'message', 'bookmark', 'pin'] },
    linear: { kinds: ['team', 'project', 'issue-tracker'], writes: ['create', 'update', 'comment'] },
    jira: { kinds: ['project', 'issue-tracker'], writes: ['create', 'update', 'comment'] },
    url: { kinds: ['link', 'document'], writes: [] },
    local: { kinds: ['file', 'directory'], writes: ['create', 'update', 'delete'] },
    generic: { kinds: ['workspace', 'app', 'project', 'repo', 'channel', 'board', 'issue-tracker', 'document', 'link', 'file', 'directory'], writes: WRITES }
};
const MANIFEST_COMMANDS = [
    command(['commands'], 'Print the machine-readable mere.link command manifest.', { flags: ['json'] }),
    command(['completion'], 'Print shell completion for mere-link.', { supportsJson: false, positionals: ['shell'] }),
    command(['config', 'validate'], 'Validate a link YAML config.', { flags: ['config'] }),
    command(['config', 'inspect'], 'Summarize a link YAML config.', { flags: ['config'] }),
    command(['config', 'init'], 'Write a starter link YAML config.', { risk: 'write', flags: ['output', 'workspace', 'name', 'yes'] }),
    command(['generate', 'workspace'], 'Generate starter link YAML from a Mere workspace snapshot.', { risk: 'write', flags: ['workspace', 'snapshot-file', 'output', 'name', 'yes'] }),
    command(['entities', 'list'], 'List configured entities.', { flags: ['config'] }),
    command(['projects', 'list'], 'List configured projects for one entity or all entities.', { flags: ['config'], positionals: ['entity'] }),
    command(['surfaces', 'list'], 'List configured role surfaces.', { flags: ['config'], positionals: ['entity', 'project'] }),
    command(['links', 'list'], 'List explicit links between configured surfaces.', { flags: ['config'] }),
    command(['context', 'inspect'], 'Show one entity/project context and optional role surface.', { flags: ['config', 'role'], positionals: ['entity', 'project'] })
];
const HELP_TEXT = `mere-link

Usage:
  mere-link commands --json
  mere-link completion bash|zsh|fish
  mere-link config init [--workspace ID] [--name NAME] [--output FILE] [--yes] [--json]
  mere-link config validate [--config FILE] [--json]
  mere-link config inspect [--config FILE] [--json]
  mere-link generate workspace --workspace ID [--output FILE] [--yes] [--json]
  mere-link generate workspace --snapshot-file FILE [--output FILE] [--yes] [--json]
  mere-link entities list [--config FILE] [--json]
  mere-link projects list [entity] [--config FILE] [--json]
  mere-link surfaces list [entity] [project] [--config FILE] [--json]
  mere-link links list [--config FILE] [--json]
  mere-link context inspect <entity> [project] [--role ROLE] [--config FILE] [--json]

mere.link.yaml declares entities, projects, integrations, role surfaces, and links.
It can be used by itself, with a few Mere apps, or with a full Mere workspace.`;
function command(pathParts, summary, options = {}) {
    return {
        id: pathParts.join('.'),
        path: pathParts,
        summary,
        auth: 'none',
        risk: options.risk ?? 'read',
        supportsJson: options.supportsJson ?? true,
        supportsData: false,
        requiresYes: false,
        requiresConfirm: false,
        positionals: options.positionals ?? [],
        flags: options.flags ?? [],
        ...(options.auditDefault ? { auditDefault: true } : {})
    };
}
function manifest() {
    return {
        schemaVersion: 1,
        app: 'mere-link',
        namespace: 'link',
        aliases: ['link', 'links', 'mere-link', 'merekit-link'],
        auth: { kind: 'none' },
        baseUrlEnv: [],
        sessionPath: null,
        globalFlags: ['config', 'workspace', 'snapshot-file', 'output', 'name', 'role', 'json', 'yes'],
        commands: MANIFEST_COMMANDS
    };
}
function parseArgs(argv) {
    const positionals = [];
    const flags = {};
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (!arg?.startsWith('--')) {
            if (arg)
                positionals.push(arg);
            continue;
        }
        const eq = arg.indexOf('=');
        if (eq > 2) {
            flags[arg.slice(2, eq)] = arg.slice(eq + 1);
            continue;
        }
        const name = arg.slice(2);
        const next = argv[index + 1];
        if (next && !next.startsWith('--')) {
            flags[name] = next;
            index += 1;
        }
        else {
            flags[name] = true;
        }
    }
    return { positionals, flags };
}
function boolFlag(flags, name) {
    return flags[name] === true || flags[name] === 'true' || flags[name] === '1';
}
function stringFlag(flags, name) {
    const value = flags[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function writeJson(value) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
function writeText(value) {
    process.stdout.write(`${value}\n`);
}
function normalizeKey(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function asRecord(value, label) {
    if (!isRecord(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
function asArray(value, label) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new Error(`${label} must be an array.`);
    return value;
}
function stringArray(value, label) {
    return [...new Set(asArray(value, label).map((item) => String(item).trim()).filter(Boolean).map(normalizeKey))];
}
function readOptionalString(record, key) {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function readRequiredString(record, key, label) {
    const value = record[key];
    const text = String(value ?? '').trim();
    if (!text)
        throw new Error(`${label}.${key} is required.`);
    return text;
}
function configPath(flags) {
    return resolvePath(stringFlag(flags, 'config') ?? process.env.MERE_LINK_CONFIG ?? DEFAULT_CONFIG);
}
function resolvePath(value) {
    if (value === '~')
        return os.homedir();
    if (value.startsWith('~/'))
        return path.join(os.homedir(), value.slice(2));
    return path.resolve(value);
}
async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function loadConfig(flags) {
    const filePath = configPath(flags);
    let raw;
    try {
        raw = await readFile(filePath, 'utf8');
    }
    catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT')
            throw new Error(`Config not found: ${filePath}. Run "mere-link config init --output ${DEFAULT_CONFIG}".`);
        throw error;
    }
    const parsed = YAML.parse(raw);
    return { path: filePath, config: normalizeConfig(parsed, filePath) };
}
function normalizeConfig(input, label = 'config') {
    const config = asRecord(input ?? {}, label);
    const integrations = normalizeIntegrations(config.integrations ?? {});
    const entities = normalizeEntities(config.entities ?? {}, integrations);
    const links = normalizeLinks(config.links ?? [], entities);
    return {
        schemaVersion: 1,
        integrations,
        entities,
        links
    };
}
function normalizeIntegrations(input) {
    const source = asRecord(input, 'integrations');
    const entries = Object.entries(source);
    if (entries.length === 0) {
        return { generic: { plugin: 'generic' } };
    }
    return Object.fromEntries(entries.map(([key, raw]) => {
        const integration = asRecord(raw, `integrations.${key}`);
        const plugin = readRequiredString(integration, 'plugin', `integrations.${key}`);
        if (!PLUGINS[plugin])
            throw new Error(`Unknown integration plugin "${plugin}" at integrations.${key}.`);
        return [
            normalizeKey(key),
            {
                plugin,
                ...(readOptionalString(integration, 'workspace') ? { workspace: readOptionalString(integration, 'workspace') } : {}),
                ...(readOptionalString(integration, 'baseUrl') ? { baseUrl: readOptionalString(integration, 'baseUrl') } : {}),
                ...(readOptionalString(integration, 'tokenEnv') ? { tokenEnv: readOptionalString(integration, 'tokenEnv') } : {})
            }
        ];
    }));
}
function normalizeEntities(input, integrations) {
    const source = asRecord(input, 'entities');
    return Object.fromEntries(Object.entries(source).map(([entityKey, raw]) => {
        const entity = asRecord(raw, `entities.${entityKey}`);
        const key = normalizeKey(entityKey);
        return [
            key,
            {
                name: readOptionalString(entity, 'name') ?? key,
                aliases: stringArray(entity.aliases, `entities.${entityKey}.aliases`),
                projects: normalizeProjects(entity.projects ?? {}, integrations, key)
            }
        ];
    }));
}
function normalizeProjects(input, integrations, entityKey) {
    const source = asRecord(input, `entities.${entityKey}.projects`);
    return Object.fromEntries(Object.entries(source).map(([projectKey, raw]) => {
        const project = asRecord(raw, `entities.${entityKey}.projects.${projectKey}`);
        const key = normalizeKey(projectKey);
        return [
            key,
            {
                name: readOptionalString(project, 'name') ?? key,
                aliases: stringArray(project.aliases, `entities.${entityKey}.projects.${projectKey}.aliases`),
                surfaces: normalizeSurfaces(project.surfaces ?? {}, integrations, `${entityKey}/${projectKey}`)
            }
        ];
    }));
}
function normalizeSurfaces(input, integrations, location) {
    const source = asRecord(input, `surfaces at ${location}`);
    return Object.fromEntries(Object.entries(source).map(([roleKey, raw]) => {
        const surface = asRecord(raw, `surface ${location}:${roleKey}`);
        const role = normalizeKey(roleKey);
        const integrationKey = normalizeKey(readRequiredString(surface, 'integration', `surface ${location}:${roleKey}`));
        const integration = integrations[integrationKey];
        if (!integration)
            throw new Error(`Unknown integration "${String(surface.integration ?? '')}" at ${location}:${roleKey}.`);
        const kind = readRequiredString(surface, 'kind', `surface ${location}:${roleKey}`);
        const plugin = PLUGINS[integration.plugin];
        if (!plugin?.kinds.includes(kind))
            throw new Error(`Integration "${integrationKey}" (${integration.plugin}) does not support surface kind "${kind}".`);
        const id = readRequiredString(surface, 'id', `surface ${location}:${roleKey}`);
        const policy = surface.policy === undefined ? undefined : asRecord(surface.policy, `surface ${location}:${roleKey}.policy`);
        const writes = stringArray(policy?.writes, `surface ${location}:${roleKey}.policy.writes`);
        for (const write of writes) {
            if (!plugin.writes.includes(write))
                throw new Error(`Integration "${integrationKey}" (${integration.plugin}) does not support write "${write}".`);
        }
        return [
            role,
            {
                integration: integrationKey,
                plugin: integration.plugin,
                kind,
                id,
                ...(readOptionalString(surface, 'name') ? { name: readOptionalString(surface, 'name')?.replace(/^#/, '').trim() } : {}),
                ...(surface.optional === true ? { optional: true } : {}),
                ...(writes.length > 0 ? { policy: { writes } } : {})
            }
        ];
    }));
}
function normalizeLinks(input, entities) {
    return asArray(input, 'links').map((raw, index) => {
        const link = asRecord(raw, `links[${index}]`);
        const from = readRequiredString(link, 'from', `links[${index}]`);
        const to = readRequiredString(link, 'to', `links[${index}]`);
        resolveEndpoint(entities, from);
        resolveEndpoint(entities, to);
        return {
            from,
            to,
            ...(readOptionalString(link, 'label') ? { label: readOptionalString(link, 'label') } : {})
        };
    });
}
function endpointParts(endpoint) {
    const [scope, role] = endpoint.split(':');
    if (!scope || !role)
        throw new Error(`Invalid link endpoint "${endpoint}". Expected entity/project:role.`);
    const [entity, project] = scope.split('/');
    if (!entity || !project)
        throw new Error(`Invalid link endpoint "${endpoint}". Expected entity/project:role.`);
    return { entity: normalizeKey(entity), project: normalizeKey(project), role: normalizeKey(role) };
}
function resolveEndpoint(entities, endpoint) {
    const parts = endpointParts(endpoint);
    const entity = entities[parts.entity];
    if (!entity)
        throw new Error(`Unknown link entity "${parts.entity}" in ${endpoint}.`);
    const project = entity.projects[parts.project];
    if (!project)
        throw new Error(`Unknown link project "${parts.project}" in ${endpoint}.`);
    const surface = project.surfaces[parts.role];
    if (!surface)
        throw new Error(`Unknown link surface "${parts.role}" in ${endpoint}.`);
    return { entity, project, surface };
}
function resolveEntity(config, reference) {
    const key = normalizeKey(reference);
    const direct = config.entities[key];
    if (direct)
        return { key, entity: direct };
    const matches = Object.entries(config.entities).filter(([, entity]) => normalizeKey(entity.name) === key || entity.aliases.includes(key));
    if (matches.length === 1) {
        const [matchKey, entity] = matches[0];
        return { key: matchKey, entity };
    }
    if (matches.length > 1)
        throw new Error(`Entity "${reference}" is ambiguous: ${matches.map(([matchKey]) => matchKey).join(', ')}`);
    throw new Error(`Unknown entity "${reference}".`);
}
function resolveProject(entityKey, entity, reference) {
    const projects = Object.entries(entity.projects);
    if (!reference) {
        if (projects.length === 1) {
            const [projectKey, project] = projects[0];
            return { key: projectKey, project };
        }
        throw new Error(`Project is required for ${entityKey}. Known projects: ${projects.map(([key]) => key).join(', ')}`);
    }
    const key = normalizeKey(reference);
    const direct = entity.projects[key];
    if (direct)
        return { key, project: direct };
    const matches = projects.filter(([, project]) => normalizeKey(project.name) === key || project.aliases.includes(key));
    if (matches.length === 1) {
        const [projectKey, project] = matches[0];
        return { key: projectKey, project };
    }
    if (matches.length > 1)
        throw new Error(`Project "${reference}" is ambiguous for ${entityKey}: ${matches.map(([matchKey]) => matchKey).join(', ')}`);
    return missingProject(entityKey, reference, projects);
}
function missingProject(entityKey, reference, projects) {
    throw new Error(`Unknown project "${reference ?? ''}" for ${entityKey}. Known projects: ${projects.map(([key]) => key).join(', ')}`);
}
function buildContext(config, entityRef, projectRef, role) {
    const { key: entityKey, entity } = resolveEntity(config, entityRef);
    const { key: projectKey, project } = resolveProject(entityKey, entity, projectRef);
    const surface = role ? project.surfaces[normalizeKey(role)] : undefined;
    if (role && !surface)
        throw new Error(`Project ${entityKey}/${projectKey} has no "${role}" surface.`);
    return {
        entity: { key: entityKey, ...entity },
        project: { key: projectKey, ...project },
        surfaces: project.surfaces,
        integrations: config.integrations,
        ...(surface ? { surface } : {})
    };
}
function summarize(config) {
    const projects = Object.values(config.entities).flatMap((entity) => Object.values(entity.projects));
    const surfaces = projects.flatMap((project) => Object.entries(project.surfaces).map(([role, surface]) => ({ role, ...surface })));
    return {
        schemaVersion: config.schemaVersion,
        integrations: Object.keys(config.integrations).length,
        entities: Object.keys(config.entities).length,
        projects: projects.length,
        surfaces: surfaces.length,
        links: config.links.length,
        roles: [...new Set(surfaces.map((surface) => surface.role))].sort()
    };
}
function entityRows(config) {
    return Object.entries(config.entities).map(([key, entity]) => ({
        key,
        name: entity.name,
        aliases: entity.aliases.join(', '),
        projects: Object.keys(entity.projects).length
    }));
}
function projectRows(config, entityRef) {
    const entities = entityRef ? [resolveEntity(config, entityRef)] : Object.entries(config.entities).map(([key, entity]) => ({ key, entity }));
    return entities.flatMap(({ key: entityKey, entity }) => Object.entries(entity.projects).map(([projectKey, project]) => ({
        entity: entityKey,
        key: projectKey,
        name: project.name,
        aliases: project.aliases.join(', '),
        surfaces: Object.keys(project.surfaces).join(', ')
    })));
}
function surfaceRows(config, entityRef, projectRef) {
    const entityEntries = entityRef ? [resolveEntity(config, entityRef)] : Object.entries(config.entities).map(([key, entity]) => ({ key, entity }));
    return entityEntries.flatMap(({ key: entityKey, entity }) => {
        const projectEntries = projectRef ? [resolveProject(entityKey, entity, projectRef)] : Object.entries(entity.projects).map(([key, project]) => ({ key, project }));
        return projectEntries.flatMap(({ key: projectKey, project }) => Object.entries(project.surfaces).map(([role, surface]) => ({
            entity: entityKey,
            project: projectKey,
            role,
            integration: surface.integration,
            plugin: surface.plugin,
            kind: surface.kind,
            id: surface.id,
            name: surface.name ?? '',
            optional: surface.optional ? 'yes' : 'no',
            writes: surface.policy?.writes?.join(', ') ?? ''
        })));
    });
}
function printTable(rows, columns) {
    if (rows.length === 0) {
        writeText('No rows.');
        return;
    }
    const widths = Object.fromEntries(columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => String(row[column] ?? '').length))]));
    writeText(columns.map((column) => column.padEnd(widths[column] ?? column.length)).join('  '));
    writeText(columns.map((column) => '-'.repeat(widths[column] ?? column.length)).join('  '));
    for (const row of rows)
        writeText(columns.map((column) => String(row[column] ?? '').padEnd(widths[column] ?? column.length)).join('  '));
}
function starterConfig(input = {}) {
    const workspace = input.workspace ?? 'workspace-id';
    const name = input.name ?? 'Workspace';
    const entityKey = normalizeKey(name) || 'workspace';
    return {
        schemaVersion: 1,
        integrations: {
            mere: { plugin: 'mere', workspace },
            github: { plugin: 'github-cli' },
            url: { plugin: 'url' }
        },
        entities: {
            [entityKey]: {
                name,
                aliases: workspace && workspace !== 'workspace-id' ? [normalizeKey(workspace)] : [],
                projects: {
                    workspace: {
                        name: `${name} Workspace`,
                        aliases: [],
                        surfaces: {
                            work: { integration: 'mere', kind: 'workspace', id: workspace, name },
                            code: { integration: 'github', kind: 'repo', id: 'owner/repo', optional: true },
                            docs: { integration: 'url', kind: 'link', id: 'https://example.com/docs', optional: true }
                        }
                    }
                }
            }
        },
        links: [
            { from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:docs`, label: 'Documentation' },
            { from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:code`, label: 'Code' }
        ]
    };
}
function configFromWorkspaceSnapshot(snapshot, input = {}) {
    const snapshotRecord = isRecord(snapshot) ? snapshot : {};
    const workspace = input.workspace ?? (typeof snapshotRecord.workspace === 'string' ? snapshotRecord.workspace : 'workspace-id');
    const name = input.name ?? workspace;
    const entityKey = normalizeKey(name) || 'workspace';
    const apps = Array.isArray(snapshotRecord.apps) ? snapshotRecord.apps.filter(isRecord) : [];
    const surfaces = {
        work: { integration: 'mere', kind: 'workspace', id: workspace, name }
    };
    for (const app of apps) {
        const appName = normalizeKey(app.app ?? app.namespace);
        if (!appName || appName === 'link')
            continue;
        surfaces[appName] = {
            integration: 'mere',
            kind: 'app',
            id: appName,
            name: typeof app.namespace === 'string' ? app.namespace : appName,
            ...(app.ok === true ? {} : { optional: true })
        };
    }
    return {
        schemaVersion: 1,
        integrations: {
            mere: { plugin: 'mere', workspace },
            generic: { plugin: 'generic' }
        },
        entities: {
            [entityKey]: {
                name,
                aliases: workspace && normalizeKey(workspace) !== entityKey ? [normalizeKey(workspace)] : [],
                projects: {
                    workspace: {
                        name: `${name} Workspace`,
                        aliases: [],
                        surfaces
                    }
                }
            }
        },
        links: Object.keys(surfaces)
            .filter((role) => role !== 'work')
            .map((role) => ({ from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:${role}`, label: role }))
    };
}
async function writeConfigOutput(config, flags) {
    const output = stringFlag(flags, 'output');
    const yaml = YAML.stringify(config);
    if (!output)
        return { yaml, path: null, wrote: false };
    const filePath = resolvePath(output);
    if (await fileExists(filePath) && !boolFlag(flags, 'yes')) {
        throw new Error(`Refusing to overwrite ${filePath}. Pass --yes to replace it.`);
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, yaml, 'utf8');
    return { yaml, path: filePath, wrote: true };
}
async function readSnapshot(flags) {
    const filePath = stringFlag(flags, 'snapshot-file');
    if (filePath) {
        return JSON.parse(await readFile(resolvePath(filePath), 'utf8'));
    }
    const workspace = stringFlag(flags, 'workspace');
    if (!workspace)
        throw new Error('Usage: mere-link generate workspace --workspace ID [--output FILE]');
    const mereBin = process.env.MERE_BIN?.trim() || 'mere';
    const result = spawnSync(mereBin, ['ops', 'workspace-snapshot', '--workspace', workspace, '--json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        throw new Error(result.stderr || result.stdout || `mere ops workspace-snapshot exited ${result.status}`);
    return JSON.parse(result.stdout);
}
function renderCompletion(shell) {
    if (shell === 'bash') {
        return `# mere-link bash completion
_mere_link_completion() {
  COMPREPLY=($(compgen -W "commands completion config generate entities projects surfaces links context" -- "\${COMP_WORDS[COMP_CWORD]}"))
}
complete -F _mere_link_completion mere-link`;
    }
    if (shell === 'zsh')
        return '#compdef mere-link\n_arguments "1:command:(commands completion config generate entities projects surfaces links context)"';
    if (shell === 'fish')
        return 'complete -c mere-link -f -a "commands completion config generate entities projects surfaces links context"';
    return 'commands completion config generate entities projects surfaces links context';
}
async function main(argv) {
    const { positionals, flags } = parseArgs(argv);
    const [group, action, ...rest] = positionals;
    if (boolFlag(flags, 'version') || group === '--version' || group === 'version') {
        writeText(VERSION);
        return 0;
    }
    if (boolFlag(flags, 'help') || group === 'help' || !group) {
        writeText(HELP_TEXT);
        return 0;
    }
    if (group === 'commands') {
        writeJson(manifest());
        return 0;
    }
    if (group === 'completion') {
        writeText(renderCompletion(action ?? 'bash'));
        return 0;
    }
    if (group === 'config' && action === 'init') {
        const config = starterConfig({ workspace: stringFlag(flags, 'workspace'), name: stringFlag(flags, 'name') });
        const output = await writeConfigOutput(config, flags);
        if (boolFlag(flags, 'json'))
            writeJson({ ok: true, path: output.path, config });
        else
            writeText(output.wrote ? `Wrote ${output.path}` : output.yaml);
        return 0;
    }
    if (group === 'generate' && action === 'workspace') {
        const snapshot = await readSnapshot(flags);
        const config = configFromWorkspaceSnapshot(snapshot, { workspace: stringFlag(flags, 'workspace'), name: stringFlag(flags, 'name') });
        const output = await writeConfigOutput(config, flags);
        if (boolFlag(flags, 'json'))
            writeJson({ ok: true, path: output.path, config, source: stringFlag(flags, 'snapshot-file') ? 'snapshot-file' : 'mere-workspace-snapshot' });
        else
            writeText(output.wrote ? `Wrote ${output.path}` : output.yaml);
        return 0;
    }
    if (group === 'config' && action === 'validate') {
        const loaded = await loadConfig(flags);
        if (boolFlag(flags, 'json'))
            writeJson({ ok: true, path: loaded.path, summary: summarize(loaded.config) });
        else
            writeText(`Config OK: ${loaded.path}`);
        return 0;
    }
    if (group === 'config' && action === 'inspect') {
        const loaded = await loadConfig(flags);
        if (boolFlag(flags, 'json'))
            writeJson({ path: loaded.path, summary: summarize(loaded.config), config: loaded.config });
        else
            printTable([summarize(loaded.config)], ['integrations', 'entities', 'projects', 'surfaces', 'links', 'roles']);
        return 0;
    }
    if (group === 'entities' && action === 'list') {
        const { config } = await loadConfig(flags);
        const rows = entityRows(config);
        if (boolFlag(flags, 'json'))
            writeJson(rows);
        else
            printTable(rows, ['key', 'name', 'aliases', 'projects']);
        return 0;
    }
    if (group === 'projects' && action === 'list') {
        const { config } = await loadConfig(flags);
        const rows = projectRows(config, rest[0]);
        if (boolFlag(flags, 'json'))
            writeJson(rows);
        else
            printTable(rows, ['entity', 'key', 'name', 'aliases', 'surfaces']);
        return 0;
    }
    if (group === 'surfaces' && action === 'list') {
        const { config } = await loadConfig(flags);
        const rows = surfaceRows(config, rest[0], rest[1]);
        if (boolFlag(flags, 'json'))
            writeJson(rows);
        else
            printTable(rows, ['entity', 'project', 'role', 'integration', 'plugin', 'kind', 'id', 'optional']);
        return 0;
    }
    if (group === 'links' && action === 'list') {
        const { config } = await loadConfig(flags);
        if (boolFlag(flags, 'json'))
            writeJson(config.links);
        else
            printTable(config.links.map((link) => ({ label: link.label ?? '', from: link.from, to: link.to })), ['label', 'from', 'to']);
        return 0;
    }
    if (group === 'context' && action === 'inspect') {
        const entity = rest[0];
        if (!entity)
            throw new Error('Usage: mere-link context inspect <entity> [project] [--role ROLE]');
        const { config } = await loadConfig(flags);
        const context = buildContext(config, entity, rest[1], stringFlag(flags, 'role'));
        if (boolFlag(flags, 'json'))
            writeJson(context);
        else {
            writeText(`${context.entity.name} / ${context.project.name}`);
            printTable(surfaceRows({
                ...config,
                entities: { [context.entity.key]: { ...context.entity, projects: { [context.project.key]: context.project } } }
            }, context.entity.key, context.project.key), ['role', 'integration', 'plugin', 'kind', 'id', 'optional']);
        }
        return 0;
    }
    throw new Error('Unknown command. Run "mere-link --help".');
}
function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
export { buildContext, configFromWorkspaceSnapshot, main, manifest, normalizeConfig, starterConfig };
const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirectRun) {
    main(process.argv.slice(2)).then((code) => {
        process.exitCode = code;
    }).catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
