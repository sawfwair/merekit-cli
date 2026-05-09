import { PLUGINS } from '../domain/plugins.js';
import { asArray, asRecord, normalizeKey, readOptionalString, readRequiredString, stringArray } from '../domain/guards.js';
export function normalizeConfig(input, label = 'config') {
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
        if (!integration) {
            const sourceIntegration = typeof surface.integration === 'string' ? surface.integration : '';
            throw new Error(`Unknown integration "${sourceIntegration}" at ${location}:${roleKey}.`);
        }
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
export function resolveEntity(config, reference) {
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
export function resolveProject(entityKey, entity, reference) {
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
export function buildContext(config, entityRef, projectRef, role) {
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
export function summarize(config) {
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
export function entityRows(config) {
    return Object.entries(config.entities).map(([key, entity]) => ({
        key,
        name: entity.name,
        aliases: entity.aliases.join(', '),
        projects: Object.keys(entity.projects).length
    }));
}
export function projectRows(config, entityRef) {
    const entities = entityRef ? [resolveEntity(config, entityRef)] : Object.entries(config.entities).map(([key, entity]) => ({ key, entity }));
    return entities.flatMap(({ key: entityKey, entity }) => Object.entries(entity.projects).map(([projectKey, project]) => ({
        entity: entityKey,
        key: projectKey,
        name: project.name,
        aliases: project.aliases.join(', '),
        surfaces: Object.keys(project.surfaces).join(', ')
    })));
}
export function surfaceRows(config, entityRef, projectRef) {
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
export function selectSyncTargets(config, entityRef, projectRef) {
    if (projectRef && !entityRef)
        throw new Error('Project filter requires an entity filter for sync projects.');
    const entityEntries = entityRef ? [resolveEntity(config, entityRef)] : Object.entries(config.entities).map(([key, entity]) => ({ key, entity }));
    return entityEntries.flatMap(({ key: entityKey, entity }) => {
        const projects = projectRef ? [resolveProject(entityKey, entity, projectRef)] : Object.entries(entity.projects).map(([key, project]) => ({ key, project }));
        return projects
            .filter(({ project }) => Boolean(project.surfaces.work))
            .map(({ key: projectKey, project }) => ({
            key: `${entityKey}/${projectKey}`,
            entityKey,
            projectKey,
            entity,
            project
        }));
    });
}
