import process from 'node:process';
import { asArray, asRecord } from '../domain/guards.js';
import { stringFlag } from './args.js';
import { parseJson } from './json.js';
function normalizeBaseUrl(value) {
    return value.replace(/\/+$/u, '');
}
function localExecutorUrl(value) {
    try {
        const url = new URL(value);
        return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
    }
    catch {
        return false;
    }
}
function firstExecutorIntegration(config) {
    if (!config)
        return undefined;
    return config.integrations.executor ?? Object.values(config.integrations).find((integration) => integration.plugin === 'executor' && Boolean(integration.baseUrl));
}
function executorBaseUrl(flags, integration) {
    const flagValue = stringFlag(flags, 'executor-base-url');
    if (flagValue)
        return { value: flagValue, source: 'flag' };
    if (integration?.baseUrl)
        return { value: integration.baseUrl, source: 'config' };
    const envValue = process.env.MERE_LINK_EXECUTOR_BASE_URL?.trim();
    if (envValue)
        return { value: envValue, source: 'env' };
    return { value: 'http://localhost:4788', source: 'default' };
}
function executorToken(flags, integration, baseUrl, baseUrlSource) {
    const tokenEnv = stringFlag(flags, 'executor-token-env') ?? integration?.tokenEnv;
    if (tokenEnv)
        return process.env[tokenEnv]?.trim() || undefined;
    const token = process.env.MERE_LINK_EXECUTOR_TOKEN?.trim();
    if (!token)
        return undefined;
    if (baseUrlSource === 'config' && !localExecutorUrl(baseUrl)) {
        throw new Error('Refusing to send MERE_LINK_EXECUTOR_TOKEN to a non-local Executor baseUrl from config. Declare tokenEnv on the Executor integration or pass --executor-token-env for that runtime.');
    }
    return token;
}
export function executorRuntime(flags, config) {
    const integration = firstExecutorIntegration(config);
    const baseUrl = executorBaseUrl(flags, integration);
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl.value);
    const token = executorToken(flags, integration, normalizedBaseUrl, baseUrl.source);
    return {
        baseUrl: normalizedBaseUrl,
        ...(token ? { token } : {}),
        ...(stringFlag(flags, 'executor-scope') ? { scopeId: stringFlag(flags, 'executor-scope') } : {})
    };
}
async function requestJson(runtime, path, options = {}) {
    const headers = { accept: 'application/json' };
    if (options.body)
        headers['content-type'] = 'application/json';
    if (runtime.token)
        headers.authorization = `Bearer ${runtime.token}`;
    const response = await fetch(`${runtime.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const body = await response.text();
    if (!response.ok) {
        const detail = body.trim() ? body.trim() : `${response.status} ${response.statusText}`;
        throw new Error(`Executor ${options.method ?? 'GET'} ${path} failed: ${detail}`);
    }
    if (!body.trim())
        return null;
    return parseJson(body, `Executor ${path}`);
}
function scopeIdFromInfo(value) {
    const record = asRecord(value, 'Executor scope response');
    const id = record.id;
    if (typeof id !== 'string' || !id.trim())
        throw new Error('Executor scope response did not include an id.');
    return id;
}
export async function executorScopeId(flags, config) {
    const runtime = executorRuntime(flags, config);
    if (runtime.scopeId)
        return runtime.scopeId;
    return scopeIdFromInfo(await requestJson(runtime, '/api/scope'));
}
async function runtimeWithScope(flags, config) {
    const runtime = executorRuntime(flags, config);
    if (runtime.scopeId)
        return { ...runtime, scopeId: runtime.scopeId };
    return { ...runtime, scopeId: scopeIdFromInfo(await requestJson(runtime, '/api/scope')) };
}
function scopedPath(scopeId, suffix) {
    return `/api/scopes/${encodeURIComponent(scopeId)}${suffix}`;
}
function readRequiredResponseString(record, key, label) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`${label}.${key} is required.`);
    return value.trim();
}
function readOptionalResponseString(record, key, label) {
    const value = record[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string')
        throw new Error(`${label}.${key} must be a string.`);
    return value.trim() ? value.trim() : undefined;
}
function decodeResponseArray(value, label, decode) {
    return asArray(value, label).map((item, index) => decode(item, `${label}[${index}]`));
}
function decodeExecutorSource(value, label) {
    const record = asRecord(value, label);
    const name = readOptionalResponseString(record, 'name', label);
    const kind = readOptionalResponseString(record, 'kind', label);
    const url = readOptionalResponseString(record, 'url', label);
    return {
        ...record,
        id: readRequiredResponseString(record, 'id', label),
        ...(name ? { name } : {}),
        ...(kind ? { kind } : {}),
        ...(url ? { url } : {})
    };
}
function decodeExecutorTool(value, label) {
    const record = asRecord(value, label);
    const pluginId = readOptionalResponseString(record, 'pluginId', label);
    const sourceId = readOptionalResponseString(record, 'sourceId', label);
    const name = readOptionalResponseString(record, 'name', label);
    const description = readOptionalResponseString(record, 'description', label);
    return {
        ...record,
        id: readRequiredResponseString(record, 'id', label),
        ...(pluginId ? { pluginId } : {}),
        ...(sourceId ? { sourceId } : {}),
        ...(name ? { name } : {}),
        ...(description ? { description } : {})
    };
}
function decodeExecutorToolDescription(value, label) {
    const record = asRecord(value, label);
    if (record.id !== undefined && record.id !== null)
        readOptionalResponseString(record, 'id', label);
    return record;
}
function decodeExecutorPolicy(value, label) {
    const record = asRecord(value, label);
    const id = readOptionalResponseString(record, 'id', label);
    const scopeId = readOptionalResponseString(record, 'scopeId', label);
    return {
        ...record,
        ...(id ? { id } : {}),
        ...(scopeId ? { scopeId } : {}),
        pattern: readRequiredResponseString(record, 'pattern', label),
        action: readRequiredResponseString(record, 'action', label)
    };
}
export async function listExecutorSources(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return decodeResponseArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/sources')), 'Executor sources', decodeExecutorSource);
}
export async function listExecutorTools(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return decodeResponseArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/tools')), 'Executor tools', decodeExecutorTool);
}
function text(value) {
    return typeof value === 'string' ? value : '';
}
export async function searchExecutorTools(flags, query, config) {
    const normalized = query.trim().toLowerCase();
    const terms = normalized.split(/\s+/u).filter(Boolean);
    const tools = await listExecutorTools(flags, config);
    const matches = tools.filter((tool) => {
        const haystack = [tool.id, tool.pluginId, tool.sourceId, tool.name, tool.description].map(text).join(' ').toLowerCase();
        return terms.every((term) => haystack.includes(term));
    });
    return {
        query,
        count: matches.length,
        tools: matches
    };
}
export async function describeExecutorTool(flags, toolId, config) {
    const runtime = await runtimeWithScope(flags, config);
    const schema = decodeExecutorToolDescription(await requestJson(runtime, scopedPath(runtime.scopeId, `/tools/${encodeURIComponent(toolId)}/schema`)), 'Executor tool schema');
    const metadata = (await listExecutorTools(flags, config)).find((tool) => tool.id === toolId);
    return {
        tool: metadata ?? { id: toolId },
        schema
    };
}
export async function listExecutorPolicies(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return decodeResponseArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/policies')), 'Executor policies', decodeExecutorPolicy);
}
function policyIdentity(policy) {
    return `${typeof policy.pattern === 'string' ? policy.pattern : ''}:${typeof policy.action === 'string' ? policy.action : ''}`;
}
function executorPolicyRules(plan) {
    return plan.rules.filter((rule) => rule.enforcement === 'executor' || rule.enforcement === 'executor-and-link');
}
function conflictingPolicies(existing, plan) {
    const plannedActions = new Map();
    for (const rule of executorPolicyRules(plan)) {
        const actions = plannedActions.get(rule.pattern) ?? new Set();
        actions.add(rule.action);
        plannedActions.set(rule.pattern, actions);
    }
    return existing.filter((policy) => {
        if (typeof policy.pattern !== 'string' || typeof policy.action !== 'string')
            return false;
        const actions = plannedActions.get(policy.pattern);
        return Boolean(actions) && !actions?.has(policy.action);
    });
}
export async function applyExecutorPolicy(flags, config, plan) {
    const runtime = await runtimeWithScope(flags, config);
    const existing = await listExecutorPolicies(flags, config);
    const conflicts = conflictingPolicies(existing, plan);
    if (conflicts.length > 0) {
        const detail = conflicts
            .map((policy) => `${String(policy.pattern)} currently ${String(policy.action)}`)
            .join('; ');
        throw new Error(`Executor policy apply refused because existing runtime policies conflict with compiled Link policy: ${detail}. Remove stale runtime policies and re-run apply.`);
    }
    const existingIdentities = new Set(existing.map(policyIdentity));
    const created = [];
    const skipped = [];
    for (const rule of executorPolicyRules(plan)) {
        const identity = `${rule.pattern}:${rule.action}`;
        if (existingIdentities.has(identity)) {
            skipped.push({ pattern: rule.pattern, action: rule.action, reason: 'already-exists' });
            continue;
        }
        const result = decodeExecutorPolicy(await requestJson(runtime, scopedPath(runtime.scopeId, '/policies'), {
            method: 'POST',
            body: {
                targetScope: runtime.scopeId,
                pattern: rule.pattern,
                action: rule.action
            }
        }), 'Executor policy create response');
        created.push(result);
        existingIdentities.add(identity);
    }
    return {
        ok: true,
        scopeId: runtime.scopeId,
        created,
        skipped,
        planned: executorPolicyRules(plan).length
    };
}
function toolAccess(toolId) {
    const segments = toolId.split('.').filter(Boolean);
    if (segments.length === 0)
        throw new Error('Executor tool id is required.');
    return segments.map((segment) => `[${JSON.stringify(segment)}]`).join('');
}
export async function invokeExecutorTool(flags, config, toolId, args) {
    const runtime = executorRuntime(flags, config);
    const access = toolAccess(toolId);
    const code = [
        'async () => {',
        `  const __tool = tools${access};`,
        `  if (typeof __tool !== "function") throw new Error("Tool not found: " + ${JSON.stringify(toolId)});`,
        `  return await __tool(${JSON.stringify(args)});`,
        '}'
    ].join('\n');
    return asRecord(await requestJson(runtime, '/api/executions', {
        method: 'POST',
        body: { code }
    }), 'Executor execution response');
}
