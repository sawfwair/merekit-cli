import { normalizeKey } from '../domain/guards.js';
const EXECUTOR_WRITE_PATTERNS = {
    github: ['github.issues.create', 'github.issues.update', 'github.issues.comment', 'github.pulls.create', 'github.pulls.update'],
    monday: ['monday.items.create', 'monday.items.update', 'monday.items.delete', 'monday.updates.create', 'monday.boards.create', 'monday.boards.update'],
    sharepoint: [
        'sharepoint.files.upload',
        'sharepoint.files.update',
        'sharepoint.files.delete',
        'sharepoint.pages.create',
        'sharepoint.pages.update',
        'sharepoint.pages.delete',
        'sharepoint.lists.items.create',
        'sharepoint.lists.items.update',
        'sharepoint.lists.items.delete'
    ],
    slack: [
        'slack.messages.send',
        'slack.bookmarks.create',
        'slack.bookmarks.update',
        'slack.channels.setTopic',
        'slack.channels.setPurpose',
        'slack.conversations.canvases.create',
        'slack.canvases.edit',
        'slack.pins.add'
    ]
};
const EXECUTOR_WRITE_PATTERNS_BY_WRITE = {
    github: {
        create: ['github.issues.create', 'github.pulls.create'],
        update: ['github.issues.update', 'github.pulls.update'],
        comment: ['github.issues.comment'],
        sync: EXECUTOR_WRITE_PATTERNS.github
    },
    monday: {
        create: ['monday.items.create', 'monday.boards.create', 'monday.updates.create'],
        update: ['monday.items.update', 'monday.boards.update'],
        delete: ['monday.items.delete'],
        comment: ['monday.updates.create'],
        sync: EXECUTOR_WRITE_PATTERNS.monday
    },
    sharepoint: {
        create: ['sharepoint.files.upload', 'sharepoint.pages.create', 'sharepoint.lists.items.create'],
        update: ['sharepoint.files.update', 'sharepoint.pages.update', 'sharepoint.lists.items.update'],
        delete: ['sharepoint.files.delete', 'sharepoint.pages.delete', 'sharepoint.lists.items.delete'],
        sync: EXECUTOR_WRITE_PATTERNS.sharepoint
    },
    slack: {
        topic: ['slack.channels.setTopic'],
        purpose: ['slack.channels.setPurpose'],
        canvas: ['slack.conversations.canvases.create', 'slack.canvases.edit'],
        bookmark: ['slack.bookmarks.create', 'slack.bookmarks.update'],
        message: ['slack.messages.send'],
        pin: ['slack.pins.add'],
        sync: EXECUTOR_WRITE_PATTERNS.slack
    }
};
export function executorNamespaceForIntegration(key, integration) {
    if (integration.plugin === 'executor')
        return integration.namespace ?? normalizeKey(key);
    return null;
}
export function executorNamespaceForSurface(config, surface) {
    const integration = config.integrations[surface.integration];
    if (!integration)
        return null;
    return executorNamespaceForIntegration(surface.integration, integration);
}
export function executorWritePatternsForSurface(config, surface) {
    const namespace = executorNamespaceForSurface(config, surface);
    if (!namespace)
        return [];
    if (surface.kind === 'tool')
        return [surface.id];
    return executorWritePatternsForSurfacePolicy(namespace, surface);
}
export function executorSurfaceUrl(config, surface) {
    const integration = config.integrations[surface.integration];
    if (!integration)
        return null;
    const namespace = executorNamespaceForIntegration(surface.integration, integration);
    if (!namespace)
        return null;
    if (namespace === 'monday' && surface.kind === 'board')
        return `https://monday.com/boards/${encodeURIComponent(surface.id)}`;
    if (namespace === 'github' && surface.kind === 'repo')
        return `https://github.com/${surface.id}`;
    if (namespace === 'slack' && surface.kind === 'channel' && integration.workspace)
        return `https://${integration.workspace}.slack.com/archives/${surface.id}`;
    if (namespace === 'sharepoint' && ['site', 'document', 'list'].includes(surface.kind))
        return sharePointUrl(surface.id);
    if (['link', 'document'].includes(surface.kind))
        return httpUrl(surface.id);
    return null;
}
function httpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    }
    catch {
        return null;
    }
}
function sharePointUrl(value) {
    const direct = httpUrl(value);
    if (direct)
        return direct;
    const trimmed = value.trim().replace(/^\/+/u, '');
    if (!trimmed)
        return null;
    if (!trimmed.includes('.sharepoint.com'))
        return null;
    return `https://${trimmed}`;
}
function executorSurfaceEntries(config) {
    const entries = [];
    for (const [entityKey, entity] of Object.entries(config.entities)) {
        for (const [projectKey, project] of Object.entries(entity.projects)) {
            for (const [role, surface] of Object.entries(project.surfaces)) {
                const integration = config.integrations[surface.integration];
                if (!integration)
                    continue;
                const namespace = executorNamespaceForIntegration(surface.integration, integration);
                if (!namespace)
                    continue;
                entries.push({ path: `${entityKey}/${projectKey}:${role}`, role, integration, surface, namespace });
            }
        }
    }
    return entries;
}
function argumentEquals(path, value) {
    return { path, operator: 'equals', value };
}
function resourceGuard(entry) {
    const id = entry.surface.id;
    if (entry.namespace === 'monday' && entry.surface.kind === 'board') {
        return {
            label: `${entry.path} board`,
            anyOf: [
                argumentEquals('boardId', id),
                argumentEquals('board_id', id),
                argumentEquals('board.id', id),
                argumentEquals('board.id.value', id)
            ]
        };
    }
    if (entry.namespace === 'sharepoint' && entry.surface.kind === 'site') {
        return {
            label: `${entry.path} site`,
            anyOf: [
                argumentEquals('siteId', id),
                argumentEquals('site_id', id),
                argumentEquals('site', id),
                argumentEquals('siteUrl', id),
                argumentEquals('site_url', id)
            ]
        };
    }
    if (entry.namespace === 'sharepoint' && entry.surface.kind === 'list') {
        return {
            label: `${entry.path} list`,
            anyOf: [argumentEquals('listId', id), argumentEquals('list_id', id), argumentEquals('list', id)]
        };
    }
    if (entry.namespace === 'github' && entry.surface.kind === 'repo') {
        return {
            label: `${entry.path} repo`,
            anyOf: [
                argumentEquals('repo', id),
                argumentEquals('repository', id),
                argumentEquals('repositoryId', id),
                argumentEquals('repository_id', id)
            ]
        };
    }
    if (entry.namespace === 'slack' && entry.surface.kind === 'channel') {
        return {
            label: `${entry.path} channel`,
            anyOf: [argumentEquals('channel', id), argumentEquals('channelId', id), argumentEquals('channel_id', id)]
        };
    }
    return null;
}
function executorWritePatternsForSurfacePolicy(namespace, surface) {
    const writes = surface.policy?.writes ?? [];
    if (writes.length === 0)
        return [];
    if (surface.kind === 'tool')
        return [surface.id];
    const byWrite = EXECUTOR_WRITE_PATTERNS_BY_WRITE[namespace] ?? {};
    return [...new Set(writes.flatMap((write) => byWrite[write] ?? []))];
}
function allExecutorWritePatternsForEntry(entry) {
    if (entry.surface.kind === 'tool')
        return [entry.surface.id];
    return EXECUTOR_WRITE_PATTERNS[entry.namespace] ?? [];
}
export function compileExecutorPolicy(config, scopeId = null) {
    const entries = executorSurfaceEntries(config);
    const rules = new Map();
    const entriesByNamespace = new Map();
    for (const entry of entries) {
        const namespaceEntries = entriesByNamespace.get(entry.namespace) ?? [];
        namespaceEntries.push(entry);
        entriesByNamespace.set(entry.namespace, namespaceEntries);
    }
    for (const [namespace, namespaceEntries] of entriesByNamespace.entries()) {
        const readPattern = `${namespace}.*`;
        rules.set(`approve:${readPattern}`, {
            pattern: readPattern,
            action: 'approve',
            reason: `Allow reads for declared ${namespace} surfaces.`,
            enforcement: 'executor',
            surfaces: namespaceEntries.map((entry) => entry.path),
            resourceGuards: []
        });
        const writePatterns = [...new Set(namespaceEntries.flatMap(allExecutorWritePatternsForEntry))];
        for (const pattern of writePatterns) {
            const writableEntries = namespaceEntries.filter((entry) => executorWritePatternsForSurfacePolicy(namespace, entry.surface).includes(pattern));
            const resourceGuards = writableEntries.map(resourceGuard).filter((guard) => Boolean(guard));
            const allowed = writableEntries.length > 0;
            rules.set(`${allowed ? 'require_approval' : 'block'}:${pattern}`, {
                pattern,
                action: allowed ? 'require_approval' : 'block',
                reason: allowed
                    ? `Require approval for ${namespace} writes granted by Link surface policy.`
                    : `Block ${namespace} writes because no declared surface grants a matching write policy.`,
                enforcement: allowed && resourceGuards.length > 0 ? 'executor-and-link' : 'executor',
                surfaces: (allowed ? writableEntries : namespaceEntries).map((entry) => entry.path),
                resourceGuards
            });
        }
    }
    return {
        schemaVersion: 1,
        source: 'mere.link.yaml',
        scopeId,
        rules: [...rules.values()].sort((a, b) => a.pattern.localeCompare(b.pattern) || a.action.localeCompare(b.action))
    };
}
export function toolPatternMatches(pattern, toolId) {
    if (pattern === '*')
        return true;
    if (pattern === toolId)
        return true;
    if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        return toolId === prefix || toolId.startsWith(`${prefix}.`);
    }
    return false;
}
function valueAtPath(record, path) {
    let current = record;
    for (const segment of path.split('.')) {
        if (!current || typeof current !== 'object' || Array.isArray(current))
            return undefined;
        current = current[segment];
    }
    return current;
}
function scalarValue(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return null;
}
function argumentPredicateMatches(args, predicate) {
    const actual = scalarValue(valueAtPath(args, predicate.path));
    if (actual === null)
        return false;
    if (predicate.operator === 'equals')
        return actual === predicate.value;
    if (predicate.operator === 'notEquals')
        return actual !== predicate.value;
    if (predicate.operator === 'contains')
        return actual.includes(predicate.value);
    if (predicate.operator === 'startsWith')
        return actual.startsWith(predicate.value);
    return false;
}
function resourceGuardMatches(args, guard) {
    return guard.anyOf.some((predicate) => argumentPredicateMatches(args, predicate));
}
function ruleResourceMatches(args, rule) {
    if (rule.resourceGuards.length === 0)
        return true;
    return rule.resourceGuards.some((guard) => resourceGuardMatches(args, guard));
}
function namespaceDeclared(config, toolId) {
    const namespace = toolId.split('.')[0] ?? '';
    return executorSurfaceEntries(config).some((entry) => entry.namespace === namespace || (entry.surface.kind === 'tool' && entry.surface.id === toolId));
}
export function assertExecutorInvocationAllowed(config, mode, toolId, args, apply) {
    if (mode === 'read') {
        if (!namespaceDeclared(config, toolId))
            throw new Error(`Executor read denied. No declared Link surface grants namespace for ${toolId}.`);
        return;
    }
    if (!apply)
        throw new Error('Executor write denied. Re-run with --apply after reviewing the plan.');
    const plan = compileExecutorPolicy(config);
    const matches = plan.rules.filter((rule) => toolPatternMatches(rule.pattern, toolId));
    if (matches.some((rule) => rule.action === 'block'))
        throw new Error(`Executor write denied by compiled Link policy for ${toolId}.`);
    const allowed = matches.filter((rule) => rule.action === 'require_approval');
    if (allowed.length === 0)
        throw new Error(`Executor write denied. No compiled Link policy grants ${toolId}.`);
    if (!allowed.some((rule) => ruleResourceMatches(args, rule))) {
        throw new Error(`Executor write denied. Arguments for ${toolId} do not match any declared writable Link surface.`);
    }
}
