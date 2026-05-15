#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, writeConfigOutput } from './config/file.js';
import { buildContext, entityRows, normalizeConfig, projectRows, summarize, surfaceRows } from './config/normalize.js';
import { configFromWorkspaceSnapshot, starterConfig } from './config/starter.js';
import { HELP_TEXT, VERSION, manifest, renderCompletion } from './manifest.js';
import { capabilitiesFromFlag, evaluateOperatorPolicy, formatOperator, policyBootstrapGuidance, policyOverrideRequested, policyTaxonomy, resolveOperatorIdentity } from './policy.js';
import { boolFlag, parseArgs, stringFlag } from './runtime/args.js';
import { applyExecutorPolicy, describeExecutorTool, invokeExecutorTool, listExecutorSources, searchExecutorTools } from './runtime/executor.js';
import { parseJsonRecord } from './runtime/json.js';
import { readSnapshot } from './runtime/mere.js';
import { printTable, writeJson, writeText } from './runtime/output.js';
import { assertExecutorInvocationAllowed, compileExecutorPolicy } from './sync/executor-policy.js';
import { applyProjectsSyncPlan, buildProjectsSyncPlan } from './sync/projects.js';
async function handleConfigInit(flags) {
    const config = starterConfig({ workspace: stringFlag(flags, 'workspace'), name: stringFlag(flags, 'name') });
    const output = await writeConfigOutput(config, flags);
    if (boolFlag(flags, 'json'))
        writeJson({ ok: true, path: output.path, config });
    else
        writeText(output.wrote ? `Wrote ${output.path}` : output.yaml);
    return 0;
}
async function handleGenerateWorkspace(flags) {
    const snapshot = await readSnapshot(flags);
    const config = configFromWorkspaceSnapshot(snapshot, { workspace: stringFlag(flags, 'workspace'), name: stringFlag(flags, 'name') });
    const output = await writeConfigOutput(config, flags);
    if (boolFlag(flags, 'json'))
        writeJson({ ok: true, path: output.path, config, source: stringFlag(flags, 'snapshot-file') ? 'snapshot-file' : 'mere-workspace-snapshot' });
    else
        writeText(output.wrote ? `Wrote ${output.path}` : output.yaml);
    return 0;
}
async function handleConfigRead(action, flags) {
    if (action === 'validate') {
        const loaded = await loadConfig(flags);
        if (boolFlag(flags, 'json'))
            writeJson({ ok: true, path: loaded.path, summary: summarize(loaded.config) });
        else
            writeText(`Config OK: ${loaded.path}`);
        return 0;
    }
    if (action === 'inspect') {
        const loaded = await loadConfig(flags);
        if (boolFlag(flags, 'json'))
            writeJson({ path: loaded.path, summary: summarize(loaded.config), config: loaded.config });
        else
            printTable([summarize(loaded.config)], ['integrations', 'entities', 'projects', 'surfaces', 'links', 'roles']);
        return 0;
    }
    return null;
}
async function handleListCommands(group, action, rest, flags) {
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
    return null;
}
async function handleContextInspect(rest, flags) {
    const entity = rest[0];
    if (!entity)
        throw new Error('Usage: mere-link context inspect <entity> [project] [--role ROLE]');
    const { config } = await loadConfig(flags);
    const context = buildContext(config, entity, rest[1], stringFlag(flags, 'role'));
    if (boolFlag(flags, 'json')) {
        writeJson(context);
    }
    else {
        writeText(`${context.entity.name} / ${context.project.name}`);
        printTable(surfaceRows({
            ...config,
            entities: { [context.entity.key]: { ...context.entity, projects: { [context.project.key]: context.project } } }
        }, context.entity.key, context.project.key), ['role', 'integration', 'plugin', 'kind', 'id', 'optional']);
    }
    return 0;
}
async function handleSyncProjects(rest, flags) {
    const { config } = await loadConfig(flags);
    const plan = buildProjectsSyncPlan(config, flags, rest[0], rest[1]);
    if (plan.apply) {
        const result = applyProjectsSyncPlan(plan, flags);
        if (boolFlag(flags, 'json'))
            writeJson({ plan, result });
        else {
            writeText(`Applied Mere Projects sync to ${plan.workspace}.`);
            printTable(result.projects ?? [], ['key', 'action', 'id']);
        }
    }
    else if (boolFlag(flags, 'json')) {
        writeJson(plan);
    }
    else {
        writeText(`Mere Projects sync plan for ${plan.workspace}`);
        writeText(`Policy surface: ${plan.policySurface}`);
        writeText(`Projects: ${plan.projectCount}`);
        writeText(`Links: ${plan.linkCount}`);
        writeText('Dry run only. Re-run with --apply to write project/link records.');
        printTable(plan.projects.map((project) => ({ key: project.key, title: project.title, client: project.client, action: project.action })), ['key', 'title', 'client', 'action']);
    }
    return 0;
}
async function handlePolicyCommands(action, rest, flags) {
    if (action === 'taxonomy') {
        const taxonomy = policyTaxonomy();
        if (boolFlag(flags, 'json'))
            writeJson(taxonomy);
        else {
            writeText('Operator Policy Taxonomy');
            writeText(`Sources: ${taxonomy.sources.join('; ')}`);
            writeText(`Operator attributes: ${taxonomy.operatorAttributes.join(', ')}`);
            writeText('');
            writeText('Capabilities');
            for (const capability of taxonomy.capabilities)
                writeText(`- ${capability}`);
        }
        return 0;
    }
    if (action === 'guidance') {
        const guidance = policyBootstrapGuidance();
        if (boolFlag(flags, 'json'))
            writeJson(guidance);
        else {
            writeText('Operator Policy Bootstrap');
            for (const step of guidance.steps)
                writeText(`- ${step}`);
            writeText('');
            writeText(`Identity environment variables: ${guidance.identityEnv.join(', ')}`);
        }
        return 0;
    }
    if (action === 'evaluate') {
        const entity = rest[0];
        if (!entity)
            throw new Error('Usage: mere-link policy evaluate <entity> [project] [--capability NAME[,NAME]] [--operator KEY] [--json]');
        const { config } = await loadConfig(flags);
        const operator = resolveOperatorIdentity(config, flags);
        const preliminary = evaluateOperatorPolicy({
            config,
            entityRef: entity,
            projectRef: rest[1],
            operator,
            capabilities: capabilitiesFromFlag(stringFlag(flags, 'capability')),
            environment: stringFlag(flags, 'operator-environment'),
            override: policyOverrideRequested(flags)
        });
        const capabilities = capabilitiesFromFlag(stringFlag(flags, 'capability'), preliminary.policy);
        const { policy, decision } = evaluateOperatorPolicy({
            config,
            entityRef: entity,
            projectRef: rest[1],
            operator,
            capabilities,
            environment: stringFlag(flags, 'operator-environment'),
            override: policyOverrideRequested(flags)
        });
        if (boolFlag(flags, 'json'))
            writeJson({ policy, decision });
        else {
            writeText(`${decision.entity} / ${decision.project} operator policy`);
            writeText(`Operator: ${formatOperator(operator)}`);
            writeText(`Policy source: ${policy.source}`);
            writeText(`Default effect: ${policy.defaultEffect}`);
            writeText(`Decision: ${decision.allowed ? 'allowed' : 'denied'}`);
            if (policy.notes.length > 0) {
                writeText('');
                writeText('Notes');
                for (const note of policy.notes)
                    writeText(`- ${note}`);
            }
            writeText('');
            printTable(decision.capabilityDecisions.map((capabilityDecision) => ({
                capability: capabilityDecision.capability,
                effect: capabilityDecision.effect,
                rule: capabilityDecision.matchedRule ?? '',
                reason: capabilityDecision.reason
            })), ['capability', 'effect', 'rule', 'reason']);
        }
        return decision.allowed ? 0 : 2;
    }
    return null;
}
function dataFlag(flags) {
    const raw = stringFlag(flags, 'data');
    return raw ? parseJsonRecord(raw, '--data') : {};
}
async function handleExecutorCommands(action, rest, flags) {
    if (action === 'sources') {
        const sources = await listExecutorSources(flags);
        if (boolFlag(flags, 'json'))
            writeJson(sources);
        else
            printTable(sources, ['id', 'name', 'kind', 'url']);
        return 0;
    }
    if (action === 'tools' && rest[0] === 'search') {
        const query = rest.slice(1).join(' ');
        if (!query)
            throw new Error('Usage: mere-link executor tools search <query>');
        const result = await searchExecutorTools(flags, query);
        if (boolFlag(flags, 'json'))
            writeJson(result);
        else
            printTable(result.tools ?? [], ['id', 'pluginId', 'sourceId', 'name', 'description']);
        return 0;
    }
    if (action === 'tools' && rest[0] === 'describe') {
        const toolId = rest[1];
        if (!toolId)
            throw new Error('Usage: mere-link executor tools describe <tool-id>');
        const result = await describeExecutorTool(flags, toolId);
        writeJson(result);
        return 0;
    }
    if (action === 'policy' && rest[0] === 'compile') {
        const { config } = await loadConfig(flags);
        const plan = compileExecutorPolicy(config, stringFlag(flags, 'executor-scope') ?? null);
        if (boolFlag(flags, 'json'))
            writeJson(plan);
        else
            printTable(plan.rules.map((rule) => ({
                pattern: rule.pattern,
                action: rule.action,
                enforcement: rule.enforcement,
                surfaces: rule.surfaces.join(', ')
            })), ['pattern', 'action', 'enforcement', 'surfaces']);
        return 0;
    }
    if (action === 'policy' && rest[0] === 'apply') {
        if (!boolFlag(flags, 'yes'))
            throw new Error('Executor policy apply requires --yes after reviewing compile output.');
        const { config } = await loadConfig(flags);
        const plan = compileExecutorPolicy(config, stringFlag(flags, 'executor-scope') ?? null);
        const result = await applyExecutorPolicy(flags, config, plan);
        if (boolFlag(flags, 'json'))
            writeJson({ plan, result });
        else {
            const scopeId = typeof result.scopeId === 'string' ? result.scopeId : 'default';
            writeText(`Applied Executor policy to scope ${scopeId}.`);
            printTable(result.created ?? [], ['id', 'pattern', 'action']);
        }
        return 0;
    }
    if (action === 'invoke') {
        const mode = rest[0];
        const toolId = rest[1];
        if (mode !== 'read' && mode !== 'write')
            throw new Error('Usage: mere-link executor invoke read|write <tool-id> [--data JSON]');
        if (!toolId)
            throw new Error('Usage: mere-link executor invoke read|write <tool-id> [--data JSON]');
        const { config } = await loadConfig(flags);
        const args = dataFlag(flags);
        assertExecutorInvocationAllowed(config, mode, toolId, args, boolFlag(flags, 'apply'));
        const result = await invokeExecutorTool(flags, config, toolId, args);
        writeJson(result);
        return 0;
    }
    return null;
}
export async function main(argv) {
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
    if (group === 'config' && action === 'init')
        return handleConfigInit(flags);
    if (group === 'generate' && action === 'workspace')
        return handleGenerateWorkspace(flags);
    if (group === 'config') {
        const handled = await handleConfigRead(action, flags);
        if (handled !== null)
            return handled;
    }
    const listResult = await handleListCommands(group, action, rest, flags);
    if (listResult !== null)
        return listResult;
    if (group === 'context' && action === 'inspect')
        return handleContextInspect(rest, flags);
    if (group === 'policy') {
        const handled = await handlePolicyCommands(action, rest, flags);
        if (handled !== null)
            return handled;
    }
    if (group === 'sync' && action === 'projects')
        return handleSyncProjects(rest, flags);
    if (group === 'executor') {
        const handled = await handleExecutorCommands(action, rest, flags);
        if (handled !== null)
            return handled;
    }
    throw new Error('Unknown command. Run "mere-link --help".');
}
export { buildContext, compileExecutorPolicy, configFromWorkspaceSnapshot, evaluateOperatorPolicy, manifest, normalizeConfig, resolveOperatorIdentity, starterConfig };
function isDirectCliRun() {
    const entrypoint = process.argv[1];
    if (!entrypoint)
        return false;
    try {
        return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entrypoint);
    }
    catch {
        return import.meta.url === pathToFileURL(entrypoint).href;
    }
}
if (isDirectCliRun()) {
    main(process.argv.slice(2)).then((code) => {
        process.exitCode = code;
    }).catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
