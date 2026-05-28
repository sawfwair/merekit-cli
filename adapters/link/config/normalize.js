import { PLUGINS } from '../domain/plugins.js';
import { asArray, asRecord, normalizeKey, readOptionalString, readRequiredString, stringArray } from '../domain/guards.js';
export function normalizeConfig(input, label = 'config') {
    const config = asRecord(input ?? {}, label);
    const operators = normalizeOperators(config.operators);
    const policy = config.policy === undefined ? undefined : normalizeOperatorPolicy(config.policy, 'policy');
    const integrations = normalizeIntegrations(config.integrations ?? {});
    const entities = normalizeEntities(config.entities ?? {}, integrations);
    const links = normalizeLinks(config.links ?? [], entities);
    return {
        schemaVersion: 1,
        ...(Object.keys(operators).length > 0 ? { operators } : {}),
        ...(policy ? { policy } : {}),
        integrations,
        entities,
        links
    };
}
function textArray(value, label) {
    return [...new Set(asArray(value, label).map((item) => String(item).trim()).filter(Boolean))];
}
function keyArray(value, label) {
    return [...new Set(textArray(value, label).map(normalizeKey).filter(Boolean))];
}
function capabilityArray(value, label) {
    return [...new Set(textArray(value, label).map((item) => item.toLowerCase()).filter(Boolean))];
}
function readOptionalBoolean(record, key, label) {
    const value = record[key];
    if (value === undefined)
        return undefined;
    if (typeof value === 'boolean')
        return value;
    throw new Error(`${label}.${key} must be a boolean.`);
}
function parsePolicyEffect(value, label, fallback) {
    if (value === undefined)
        return fallback;
    const effect = normalizeKey(value);
    if (effect === 'allow' || effect === 'deny')
        return effect;
    throw new Error(`${label} must be "allow" or "deny".`);
}
function optionalKeyArray(record, key, label) {
    return record[key] === undefined ? undefined : keyArray(record[key], `${label}.${key}`);
}
function normalizeOperators(input) {
    if (input === undefined)
        return {};
    const source = asRecord(input, 'operators');
    return Object.fromEntries(Object.entries(source).map(([operatorKey, raw]) => {
        const operator = asRecord(raw, `operators.${operatorKey}`);
        const key = normalizeKey(operatorKey);
        if (!key)
            throw new Error(`Operator key "${operatorKey}" is invalid.`);
        return [
            key,
            {
                ...(readOptionalString(operator, 'name') ? { name: readOptionalString(operator, 'name') } : {}),
                ...(readOptionalString(operator, 'type') ? { type: normalizeKey(readOptionalString(operator, 'type')) } : {}),
                ...(readOptionalString(operator, 'provider') ? { provider: normalizeKey(readOptionalString(operator, 'provider')) } : {}),
                ...(readOptionalString(operator, 'client') ? { client: normalizeKey(readOptionalString(operator, 'client')) } : {}),
                ...(readOptionalString(operator, 'accountClass') ? { accountClass: normalizeKey(readOptionalString(operator, 'accountClass')) } : {}),
                ...(readOptionalString(operator, 'accountId') ? { accountId: readOptionalString(operator, 'accountId') } : {}),
                ...(readOptionalString(operator, 'trustTier') ? { trustTier: normalizeKey(readOptionalString(operator, 'trustTier')) } : {}),
                ...(readOptionalString(operator, 'environment') ? { environment: normalizeKey(readOptionalString(operator, 'environment')) } : {}),
                notes: textArray(operator.notes, `operators.${operatorKey}.notes`)
            }
        ];
    }));
}
function normalizeOperatorPolicy(input, label) {
    const policy = asRecord(input, label);
    const rules = asArray(policy.rules, `${label}.rules`).map((raw, index) => normalizeOperatorPolicyRule(raw, `${label}.rules[${index}]`));
    return {
        ...(readOptionalBoolean(policy, 'inherit', label) === undefined ? {} : { inherit: readOptionalBoolean(policy, 'inherit', label) }),
        defaultEffect: parsePolicyEffect(policy.defaultEffect, `${label}.defaultEffect`, 'deny'),
        notes: textArray(policy.notes, `${label}.notes`),
        rules
    };
}
function normalizeOperatorPolicyRule(input, label) {
    const rule = asRecord(input, label);
    const capabilities = capabilityArray(rule.capabilities, `${label}.capabilities`);
    if (capabilities.length === 0)
        throw new Error(`${label}.capabilities must include at least one capability.`);
    return {
        ...(readOptionalString(rule, 'id') ? { id: normalizeKey(readOptionalString(rule, 'id')) } : {}),
        effect: parsePolicyEffect(rule.effect, `${label}.effect`, 'deny'),
        capabilities,
        ...(optionalKeyArray(rule, 'operators', label) ? { operators: optionalKeyArray(rule, 'operators', label) } : {}),
        ...(optionalKeyArray(rule, 'operatorTypes', label) ? { operatorTypes: optionalKeyArray(rule, 'operatorTypes', label) } : {}),
        ...(optionalKeyArray(rule, 'providers', label) ? { providers: optionalKeyArray(rule, 'providers', label) } : {}),
        ...(optionalKeyArray(rule, 'clients', label) ? { clients: optionalKeyArray(rule, 'clients', label) } : {}),
        ...(optionalKeyArray(rule, 'accountClasses', label) ? { accountClasses: optionalKeyArray(rule, 'accountClasses', label) } : {}),
        ...(textArray(rule.accountIds, `${label}.accountIds`).length > 0 ? { accountIds: textArray(rule.accountIds, `${label}.accountIds`) } : {}),
        ...(optionalKeyArray(rule, 'trustTiers', label) ? { trustTiers: optionalKeyArray(rule, 'trustTiers', label) } : {}),
        ...(optionalKeyArray(rule, 'environments', label) ? { environments: optionalKeyArray(rule, 'environments', label) } : {}),
        ...(readOptionalString(rule, 'reason') ? { reason: readOptionalString(rule, 'reason') } : {})
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
                ...(readOptionalString(integration, 'tokenEnv') ? { tokenEnv: readOptionalString(integration, 'tokenEnv') } : {}),
                ...(readOptionalString(integration, 'runtime') ? { runtime: readOptionalString(integration, 'runtime') } : {}),
                ...(readOptionalString(integration, 'namespace') ? { namespace: readOptionalString(integration, 'namespace') } : {})
            }
        ];
    }));
}
function normalizeEntities(input, integrations) {
    const source = asRecord(input, 'entities');
    return Object.fromEntries(Object.entries(source).map(([entityKey, raw]) => {
        const entity = asRecord(raw, `entities.${entityKey}`);
        const key = normalizeKey(entityKey);
        const policy = entity.policy === undefined ? undefined : normalizeOperatorPolicy(entity.policy, `entities.${entityKey}.policy`);
        return [
            key,
            {
                name: readOptionalString(entity, 'name') ?? key,
                aliases: stringArray(entity.aliases, `entities.${entityKey}.aliases`),
                ...(policy ? { policy } : {}),
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
        const policy = project.policy === undefined ? undefined : normalizeOperatorPolicy(project.policy, `entities.${entityKey}.projects.${projectKey}.policy`);
        return [
            key,
            {
                name: readOptionalString(project, 'name') ?? key,
                aliases: stringArray(project.aliases, `entities.${entityKey}.projects.${projectKey}.aliases`),
                ...(policy ? { policy } : {}),
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
