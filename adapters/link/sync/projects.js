import { createHash } from 'node:crypto';
import { PLUGINS } from '../domain/plugins.js';
import { isRecord, normalizeKey } from '../domain/guards.js';
import { boolFlag, stringFlag } from '../runtime/args.js';
import { listMereProjects, upsertMereLink, writeMereProject } from '../runtime/mere.js';
import { selectSyncTargets } from '../config/normalize.js';
function findProjectsSyncSurface(config) {
    const candidates = [];
    for (const [entityKey, entity] of Object.entries(config.entities)) {
        for (const [projectKey, project] of Object.entries(entity.projects)) {
            for (const [role, surface] of Object.entries(project.surfaces)) {
                const integration = config.integrations[surface.integration];
                if (integration?.plugin === 'mere' && surface.kind === 'app' && normalizeKey(surface.id) === 'projects') {
                    candidates.push({ path: `${entityKey}/${projectKey}:${role}`, surface, integration });
                }
            }
        }
    }
    const allowed = candidates.find((candidate) => candidate.surface.policy?.writes.includes('sync'));
    if (allowed)
        return allowed;
    const hint = candidates[0]?.path ?? 'a mere app surface with id: projects';
    throw new Error(`Mere Projects sync denied. Add policy.writes: [sync] to ${hint} before applying or planning sync.`);
}
function syncWorkspace(config, flags, syncSurface) {
    const workspace = stringFlag(flags, 'workspace') ?? syncSurface.integration.workspace ?? config.integrations.mere?.workspace;
    if (!workspace)
        throw new Error('Mere Projects sync requires --workspace or a workspace on the target mere integration.');
    return workspace;
}
function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function syncRole(flags) {
    const role = stringFlag(flags, 'role') ?? 'subcontract';
    if (role !== 'prime' && role !== 'subcontract')
        throw new Error('--role must be prime or subcontract.');
    return role;
}
function stableId(prefix, value) {
    return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 20)}`;
}
function surfaceForAttributes(surface) {
    return {
        integration: surface.integration,
        plugin: surface.plugin,
        kind: surface.kind,
        id: surface.id,
        ...(surface.name ? { name: surface.name } : {}),
        ...(surface.optional ? { optional: true } : {})
    };
}
function projectPayload(target, flags, existing) {
    const surfaces = Object.fromEntries(Object.entries(target.project.surfaces).map(([role, surface]) => [role, surfaceForAttributes(surface)]));
    return {
        kind: 'project.default',
        schemaVersion: 1,
        attributes: {
            mereLinkKey: target.key,
            mereLinkEntity: target.entityKey,
            mereLinkProject: target.projectKey,
            mereLinkSource: 'mere.link.yaml',
            surfaces
        },
        title: target.project.name,
        client: target.entity.name,
        contractVehicle: null,
        role: syncRole(flags),
        dateStart: typeof existing?.dateStart === 'string' && existing.dateStart ? existing.dateStart : stringFlag(flags, 'date-start') ?? todayIsoDate(),
        dateEnd: null,
        isOngoing: true,
        description: [
            `Operational surface record synced from ${target.key} in mere.link.yaml.`,
            'This record connects Mere Projects to the configured systems of record for live delivery work.'
        ].join('\n\n'),
        outcomes: 'Keeps Mere Projects connected to the work, discussion, code, and operational surfaces declared in mere.link.yaml.',
        capabilities: ['Mere Link', ...new Set(Object.values(target.project.surfaces).map((surface) => surface.plugin ?? surface.integration))],
        tags: ['mere-link', normalizeKey(target.entity.name), normalizeKey(target.project.name), ...Object.keys(target.project.surfaces).map(normalizeKey)].filter(Boolean),
        status: 'active'
    };
}
function configuredMereProjectId(target) {
    const surface = Object.values(target.project.surfaces).find((candidate) => candidate.plugin === 'mere' && candidate.kind === 'record');
    return surface?.id ?? null;
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
function surfaceUrl(surface, integration) {
    const plugin = surface.plugin ?? integration.plugin;
    if (plugin === 'monday' && surface.kind === 'board') {
        const baseUrl = integration.baseUrl?.replace(/\/+$/u, '') || 'https://monday.com';
        return `${baseUrl}/boards/${encodeURIComponent(surface.id)}`;
    }
    if (plugin === 'github-cli' && surface.kind === 'repo')
        return `https://github.com/${surface.id}`;
    if (plugin === 'slack' && surface.kind === 'channel' && integration.workspace) {
        return `https://${integration.workspace}.slack.com/archives/${surface.id}`;
    }
    if (plugin === 'url')
        return httpUrl(surface.id);
    return null;
}
function linkPlansForTarget(config, target) {
    return Object.entries(target.project.surfaces).flatMap(([role, surface]) => {
        const integration = config.integrations[surface.integration];
        if (!integration)
            return [];
        const url = surfaceUrl(surface, integration);
        if (!url)
            return [];
        const plugin = surface.plugin ?? integration.plugin;
        if (!PLUGINS[plugin])
            return [];
        const kind = `${plugin}.${surface.kind}`;
        const label = `${target.project.name} ${role}`;
        const payload = {
            id: stableId('lnk_mlk', `${target.key}:${role}:${url}`),
            label,
            url,
            kind
        };
        return [{
                projectKey: target.key,
                role,
                label,
                url,
                kind,
                payload
            }];
    });
}
export function buildProjectsSyncPlan(config, flags, entityRef, projectRef) {
    const syncSurface = findProjectsSyncSurface(config);
    const workspace = syncWorkspace(config, flags, syncSurface);
    const targets = selectSyncTargets(config, entityRef, projectRef);
    const projects = targets.map((target) => {
        const existingId = configuredMereProjectId(target);
        return {
            key: target.key,
            entity: target.entityKey,
            project: target.projectKey,
            title: target.project.name,
            client: target.entity.name,
            action: 'upsert',
            existingId,
            payload: projectPayload(target, flags)
        };
    });
    const links = targets.flatMap((target) => linkPlansForTarget(config, target));
    return {
        apply: boolFlag(flags, 'apply'),
        workspace,
        policySurface: syncSurface.path,
        projectCount: projects.length,
        linkCount: links.length,
        projects,
        links
    };
}
function findExistingProject(existing, plan) {
    if (plan.existingId) {
        const byId = existing.find((project) => project.id === plan.existingId);
        if (!byId)
            throw new Error(`Configured Mere project ${plan.existingId} for ${plan.key} was not found in the target workspace.`);
        return byId;
    }
    return existing.find((project) => isRecord(project.attributes) && project.attributes.mereLinkKey === plan.key);
}
function requireProjectId(value) {
    if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
        throw new Error('Mere Projects did not return a project id.');
    }
    return value.id;
}
export function applyProjectsSyncPlan(plan, flags) {
    const existing = listMereProjects(flags, plan.workspace);
    const projectResults = [];
    const linkResults = [];
    const projectIds = new Map();
    for (const projectPlan of plan.projects) {
        const existingProject = findExistingProject(existing, projectPlan);
        if (existingProject?.id && typeof existingProject.id === 'string') {
            projectIds.set(projectPlan.key, existingProject.id);
            projectResults.push({ key: projectPlan.key, action: 'matched', id: existingProject.id });
            continue;
        }
        const result = writeMereProject(flags, plan.workspace, projectPlan.payload, undefined);
        const projectId = requireProjectId(result);
        projectIds.set(projectPlan.key, projectId);
        projectResults.push({ key: projectPlan.key, action: 'created', id: projectId });
    }
    for (const linkPlan of plan.links) {
        const projectId = projectIds.get(linkPlan.projectKey);
        if (!projectId)
            continue;
        const result = upsertMereLink(flags, plan.workspace, projectId, linkPlan.payload);
        linkResults.push({ projectKey: linkPlan.projectKey, role: linkPlan.role, result });
    }
    return {
        ok: true,
        workspace: plan.workspace,
        projects: projectResults,
        links: linkResults
    };
}
