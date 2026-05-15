import process from 'node:process';
import { asArray, asRecord, isRecord } from '../domain/guards.js';
import { stringFlag } from './args.js';
import { parseJson } from './json.js';
function normalizeBaseUrl(value) {
    return value.replace(/\/+$/u, '');
}
function firstExecutorIntegration(config) {
    if (!config)
        return undefined;
    return config.integrations.executor ?? Object.values(config.integrations).find((integration) => integration.plugin === 'executor' && Boolean(integration.baseUrl));
}
export function executorRuntime(flags, config) {
    const integration = firstExecutorIntegration(config);
    const baseUrl = stringFlag(flags, 'executor-base-url')
        ?? integration?.baseUrl
        ?? process.env.MERE_LINK_EXECUTOR_BASE_URL?.trim()
        ?? 'http://localhost:4788';
    const tokenEnv = stringFlag(flags, 'executor-token-env') ?? integration?.tokenEnv;
    const token = tokenEnv ? process.env[tokenEnv]?.trim() : process.env.MERE_LINK_EXECUTOR_TOKEN?.trim();
    return {
        baseUrl: normalizeBaseUrl(baseUrl),
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
export async function listExecutorSources(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return asArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/sources')), 'Executor sources').filter(isRecord);
}
export async function listExecutorTools(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return asArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/tools')), 'Executor tools').filter(isRecord);
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
    const schema = asRecord(await requestJson(runtime, scopedPath(runtime.scopeId, `/tools/${encodeURIComponent(toolId)}/schema`)), 'Executor tool schema');
    const metadata = (await listExecutorTools(flags, config)).find((tool) => tool.id === toolId);
    return {
        tool: metadata ?? { id: toolId },
        schema
    };
}
export async function listExecutorPolicies(flags, config) {
    const runtime = await runtimeWithScope(flags, config);
    return asArray(await requestJson(runtime, scopedPath(runtime.scopeId, '/policies')), 'Executor policies').filter(isRecord);
}
function policyIdentity(policy) {
    return `${typeof policy.pattern === 'string' ? policy.pattern : ''}:${typeof policy.action === 'string' ? policy.action : ''}`;
}
function executorPolicyRules(plan) {
    return plan.rules.filter((rule) => rule.enforcement === 'executor' || rule.enforcement === 'executor-and-link');
}
export async function applyExecutorPolicy(flags, config, plan) {
    const runtime = await runtimeWithScope(flags, config);
    const existing = await listExecutorPolicies(flags, config);
    const existingIdentities = new Set(existing.map(policyIdentity));
    const created = [];
    const skipped = [];
    for (const rule of executorPolicyRules(plan)) {
        const identity = `${rule.pattern}:${rule.action}`;
        if (existingIdentities.has(identity)) {
            skipped.push({ pattern: rule.pattern, action: rule.action, reason: 'already-exists' });
            continue;
        }
        const result = asRecord(await requestJson(runtime, scopedPath(runtime.scopeId, '/policies'), {
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
