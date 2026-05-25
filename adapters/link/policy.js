import { buildContext, resolveEntity, resolveProject } from './config/normalize.js';
import { normalizeKey } from './domain/guards.js';
import { boolFlag, stringFlag } from './runtime/args.js';
export const OPERATOR_CAPABILITIES = {
    PROJECT_CONTEXT_EXPORT: 'project.context.export',
    SYNC_PLAN: 'sync.plan',
    SYNC_APPLY: 'sync.apply',
    EXECUTOR_TOOL_READ: 'executor.tool.read',
    EXECUTOR_TOOL_WRITE: 'executor.tool.write',
    REPO_READ: 'repo.read',
    REPO_CODE_REVIEW: 'repo.code.review',
    REPO_DOCUMENTATION_WRITE: 'repo.documentation.write',
    REPO_CODE_WRITE: 'repo.code.write',
    SURFACE_WRITE: 'surface.write'
};
export const DEFAULT_OPERATOR_ENVIRONMENT = 'local-cli';
export function capabilitiesFromFlag(value, policy) {
    if (value?.trim())
        return uniqueCapabilities(value.split(','));
    const configured = policy?.rules.flatMap((rule) => rule.capabilities).filter((capability) => capability !== '*') ?? [];
    return uniqueCapabilities([...Object.values(OPERATOR_CAPABILITIES), ...configured]);
}
export function resolveOperatorIdentity(config, flags = {}) {
    const operatorKey = normalizeKey(stringFlag(flags, 'operator') ?? process.env.MERE_LINK_OPERATOR ?? '');
    if (operatorKey) {
        const configured = config.operators?.[operatorKey];
        if (!configured)
            throw new Error(`Unknown operator "${operatorKey}". Add it to operators in mere.link.yaml or pass inline operator attributes.`);
        return buildConfiguredOperator(operatorKey, configured, flags);
    }
    return buildInlineOperator(flags);
}
export function resolvePolicyForProject(config, entity, project) {
    const root = config.policy ? resolvePolicy(config.policy, undefined, 'root') : resolvePolicy(undefined, undefined, 'default');
    const entityPolicy = entity.policy ? resolvePolicy(entity.policy, root, 'entity') : root;
    return project.policy ? resolvePolicy(project.policy, entityPolicy, 'project') : entityPolicy;
}
export function evaluateOperatorPolicy(input) {
    const resolvedEntity = resolveEntity(input.config, input.entityRef);
    const resolvedProject = resolveProject(resolvedEntity.key, resolvedEntity.entity, input.projectRef);
    const context = buildContext(input.config, resolvedEntity.key, resolvedProject.key, undefined);
    const policy = resolvePolicyForProject(input.config, context.entity, context.project);
    const capabilities = uniqueCapabilities(input.capabilities);
    const environment = normalizeKey(input.environment ?? input.operator.environment ?? DEFAULT_OPERATOR_ENVIRONMENT);
    if (input.override) {
        return {
            policy,
            decision: {
                allowed: true,
                entity: context.entity.key,
                project: context.project.key,
                operator: input.operator,
                capabilities,
                environment,
                policySource: policy.source,
                override: true,
                capabilityDecisions: capabilities.map((capability) => ({
                    capability,
                    allowed: true,
                    effect: 'allow',
                    matchedRule: 'operator-override',
                    reason: 'Allowed by one-operation operator override after human approval.'
                }))
            }
        };
    }
    const capabilityDecisions = input.operator.trustTier === 'blocked'
        ? capabilities.map((capability) => ({
            capability,
            allowed: false,
            effect: 'deny',
            reason: `Operator "${input.operator.key}" has blocked trust tier.`
        }))
        : capabilities.map((capability) => evaluateCapability(policy, input.operator, capability, environment));
    return {
        policy,
        decision: {
            allowed: capabilityDecisions.every((decision) => decision.allowed),
            entity: context.entity.key,
            project: context.project.key,
            operator: input.operator,
            capabilities,
            environment,
            policySource: policy.source,
            override: false,
            capabilityDecisions
        }
    };
}
export function formatOperator(operator) {
    const account = operator.accountId ? `:${operator.accountId}` : '';
    return `${operator.name} (${operator.key}; ${operator.type}/${operator.provider}/${operator.client}/${operator.accountClass}${account}/${operator.trustTier}/${operator.environment})`;
}
function resolvePolicy(policy, inherited, source) {
    const shouldInherit = policy?.inherit !== false;
    return {
        defaultEffect: policy?.defaultEffect ?? inherited?.defaultEffect ?? 'deny',
        notes: [...(shouldInherit ? inherited?.notes ?? [] : []), ...(policy?.notes ?? [])],
        rules: [...(shouldInherit ? inherited?.rules ?? [] : []), ...(policy?.rules ?? [])],
        source
    };
}
function buildConfiguredOperator(key, configured, flags) {
    return {
        key,
        name: configured.name ?? key,
        type: normalizeKey(stringFlag(flags, 'operator-type') ?? configured.type ?? 'unknown'),
        provider: normalizeKey(stringFlag(flags, 'operator-provider') ?? configured.provider ?? 'unknown'),
        client: normalizeKey(stringFlag(flags, 'operator-client') ?? configured.client ?? 'unknown'),
        accountClass: normalizeKey(stringFlag(flags, 'operator-account-class') ?? configured.accountClass ?? 'unknown'),
        ...(stringFlag(flags, 'operator-account-id') ?? configured.accountId ? { accountId: stringFlag(flags, 'operator-account-id') ?? configured.accountId } : {}),
        trustTier: normalizeKey(stringFlag(flags, 'operator-trust-tier') ?? configured.trustTier ?? 'unknown'),
        environment: normalizeKey(stringFlag(flags, 'operator-environment') ?? configured.environment ?? DEFAULT_OPERATOR_ENVIRONMENT)
    };
}
function buildInlineOperator(flags) {
    return {
        key: 'inline',
        name: 'Inline operator',
        type: normalizeKey(stringFlag(flags, 'operator-type') ?? process.env.MERE_LINK_OPERATOR_TYPE ?? 'unknown'),
        provider: normalizeKey(stringFlag(flags, 'operator-provider') ?? process.env.MERE_LINK_OPERATOR_PROVIDER ?? 'unknown'),
        client: normalizeKey(stringFlag(flags, 'operator-client') ?? process.env.MERE_LINK_OPERATOR_CLIENT ?? 'unknown'),
        accountClass: normalizeKey(stringFlag(flags, 'operator-account-class') ?? process.env.MERE_LINK_OPERATOR_ACCOUNT_CLASS ?? 'unknown'),
        ...(stringFlag(flags, 'operator-account-id') ?? process.env.MERE_LINK_OPERATOR_ACCOUNT_ID ? { accountId: stringFlag(flags, 'operator-account-id') ?? process.env.MERE_LINK_OPERATOR_ACCOUNT_ID } : {}),
        trustTier: normalizeKey(stringFlag(flags, 'operator-trust-tier') ?? process.env.MERE_LINK_OPERATOR_TRUST_TIER ?? 'unknown'),
        environment: normalizeKey(stringFlag(flags, 'operator-environment') ?? process.env.MERE_LINK_OPERATOR_ENVIRONMENT ?? DEFAULT_OPERATOR_ENVIRONMENT)
    };
}
function evaluateCapability(policy, operator, capability, environment) {
    const matchingRules = policy.rules
        .map((rule, index) => ({ rule, id: rule.id ?? `${rule.effect}-rule-${index + 1}` }))
        .filter(({ rule }) => ruleMatches(rule, operator, capability, environment));
    const denyRule = matchingRules.find(({ rule }) => rule.effect === 'deny');
    if (denyRule) {
        return {
            capability,
            allowed: false,
            effect: 'deny',
            matchedRule: denyRule.id,
            reason: denyRule.rule.reason ?? 'Denied by operator policy rule.'
        };
    }
    const allowRule = matchingRules.find(({ rule }) => rule.effect === 'allow');
    if (allowRule) {
        return {
            capability,
            allowed: true,
            effect: 'allow',
            matchedRule: allowRule.id,
            reason: allowRule.rule.reason ?? 'Allowed by operator policy rule.'
        };
    }
    if (policy.defaultEffect === 'allow') {
        return {
            capability,
            allowed: true,
            effect: 'allow',
            reason: 'Allowed by default operator policy effect.'
        };
    }
    return {
        capability,
        allowed: false,
        effect: 'deny',
        reason: 'No allow rule matched and defaultEffect is deny.'
    };
}
function ruleMatches(rule, operator, capability, environment) {
    return (matchesList(rule.capabilities, capability) &&
        matchesOptionalList(rule.operators, operator.key) &&
        matchesOptionalList(rule.operatorTypes, operator.type) &&
        matchesOptionalList(rule.providers, operator.provider) &&
        matchesOptionalList(rule.clients, operator.client) &&
        matchesOptionalList(rule.accountClasses, operator.accountClass) &&
        matchesOptionalList(rule.accountIds, operator.accountId) &&
        matchesOptionalList(rule.trustTiers, operator.trustTier) &&
        matchesOptionalList(rule.environments, environment));
}
function matchesList(values, actual) {
    return values.includes('*') || values.includes(actual);
}
function matchesOptionalList(values, actual) {
    return !values || values.length === 0 || values.includes('*') || (actual !== undefined && values.includes(actual));
}
function uniqueCapabilities(values) {
    return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}
export function policyBootstrapGuidance() {
    return {
        steps: [
            'Identify the operator with --operator or MERE_LINK_OPERATOR before exporting context or invoking tools.',
            'Run policy evaluate with the intended capability before the operation.',
            'Stop when the decision is denied; do not route around a Link policy boundary.',
            'Use --override only after explicit human approval for one operation.',
            'Treat generated payloads and writes as untrusted until the target command verifies them.'
        ],
        identityEnv: [
            'MERE_LINK_OPERATOR',
            'MERE_LINK_OPERATOR_PROVIDER',
            'MERE_LINK_OPERATOR_CLIENT',
            'MERE_LINK_OPERATOR_TYPE',
            'MERE_LINK_OPERATOR_ACCOUNT_CLASS',
            'MERE_LINK_OPERATOR_ACCOUNT_ID',
            'MERE_LINK_OPERATOR_TRUST_TIER',
            'MERE_LINK_OPERATOR_ENVIRONMENT'
        ]
    };
}
export function policyTaxonomy() {
    return {
        sources: [
            'NIST SP 800-162 ABAC: operator, resource, action, and environment attributes',
            'NIST AI RMF: govern, map, measure, and manage AI risk',
            'OWASP LLM Top 10: sensitive information disclosure and excessive agency'
        ],
        operatorAttributes: ['operator', 'operatorType', 'provider', 'client', 'accountClass', 'accountId', 'trustTier', 'environment'],
        capabilities: Object.values(OPERATOR_CAPABILITIES)
    };
}
export function policyOverrideRequested(flags) {
    return boolFlag(flags, 'override');
}
