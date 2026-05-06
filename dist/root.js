import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { appendAudit, redactOutput } from './audit.js';
import { parseArgs, extractPassthroughFlags, flagArgs, readBooleanFlag, readStringFlag } from './args.js';
import { renderCompletion } from './completion.js';
import { clearState, loadState, saveState } from './context.js';
import { loadManifest, loadManifests, manifestForJson, findManifestCommand, supportedFlagNames } from './manifest.js';
import { runMcpServer } from './mcp.js';
import { resolveMerePaths } from './paths.js';
import { runCapture } from './process.js';
import { PRODUCT_APP_KEYS, createRegistry, executionCwd, findEntry, findPnpm, resolveCli } from './registry.js';
import { runSkills } from './skills.js';
import { runFirstUseTui } from './tui.js';
import { CLI_VERSION } from './version.js';
function writeJson(io, value) {
    io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}
function writeText(io, value) {
    io.stdout(`${value}\n`);
}
function helpText() {
    return `mere CLI

Usage:
  mere [--json] <command>
  mere <app> [app command...]

Human first run:
  mere tui
  mere business waitlist join --email EMAIL
  mere onboard --interactive
  mere business onboard start INVITE_CODE --json

Operator/agent first run:
  mere onboard --workspace WORKSPACE_ID --target codex --json
  mere apps list --json
  mere ops doctor --json
  mere auth status --all --json
  mere context set-workspace --workspace WORKSPACE_ID
  mere ops workspace-snapshot --json
  mere apps manifest --app APP --json
  mere help agent

Global:
  --json                 Write JSON for root commands or pass JSON mode to app commands.
  --workspace ID         Default workspace selector for app commands.
  --base-url URL         Base URL override for app commands that support it.
  --profile NAME         Finance profile selector.
  --yes                  Passed only to commands that support destructive automation.
  --confirm ID           Exact destructive confirmation target.
  --data JSON            Structured mutation payload for app commands that support it.
  --data-file FILE       Structured mutation payload file for app commands that support it.
  --version              Show version.
  --help                 Show help.

Commands:
  help [agent|onboard|safety|skills|mcp]
  tui [--waitlist-email EMAIL|--invite-code CODE|--workspace ID for operators] [--app APP] [--target codex|claude] [--output DIR]
  completion [bash|zsh|fish]
  apps list|manifest|doctor
  auth login|whoami|logout|status [--app APP|--all]
  context get|set-workspace|clear
  onboard [--interactive] [--invite-code CODE|--workspace ID for operators] [--app APP] [--target codex|claude] [--output DIR]
  agent bootstrap [--workspace ID] [--app APP] [--target codex] [--output DIR]
  skills list|show|install|publish
  finance profiles list|current|use|login
  setup build|check|smoke [--app APP|--all]
  ops doctor|smoke|audit|workspace-snapshot
  mcp serve [--allow-writes]

App namespaces:
  business finance projects today zone video network email gives works
`;
}
function helpTopicText(topic) {
    if (!topic)
        return helpText();
    if (topic === 'agent') {
        return `mere agent guide

Goal:
  Learn the command plane from live manifests, inspect safely first, then delegate product-owned work.

Human first-use:
  mere tui
  mere business waitlist join --email EMAIL
  mere onboard --interactive
  mere business onboard start INVITE_CODE --json

Operator/agent workspace sequence:
  mere onboard --workspace WORKSPACE_ID --target codex --json
  mere agent bootstrap --workspace WORKSPACE_ID --target codex --json
  mere apps list --json
  mere ops doctor --json
  mere auth status --all --json
  mere finance profiles list --json
  mere context set-workspace --workspace WORKSPACE_ID
  mere ops workspace-snapshot --json
  mere apps manifest --app APP --json

Operating loop:
  1. Use workspace-snapshot for a read-only cross-stack view.
  2. Use apps manifest to find exact command paths, risk, flags, and JSON/data support.
  3. Delegate with mere <app> ... and explicit --workspace/--json when needed.
  4. Use --data or --data-file for structured mutations when the manifest supports data.
  5. Never invent destructive guardrails; app CLIs enforce --yes and exact --confirm.

Notes:
  Finance intentionally uses token/profile auth. Browser auth apps keep app-local sessions.
  Root audit logs are written to ~/.local/state/mere/audit.ndjson.
`;
    }
    if (topic === 'onboard') {
        return `mere onboard guide

Goal:
  Generate one readiness report for a fresh human invite flow or an agent entering an existing workspace.

Usage:
  mere tui
  mere business waitlist join --email EMAIL
  mere onboard --interactive
  mere business onboard start INVITE_CODE --json
  mere onboard --workspace WORKSPACE_ID --target codex --json
  mere onboard --app projects --workspace WORKSPACE_ID
  mere onboard --finance-profile default --finance-base-url https://<tenant>.mere.finance --json

Output:
  Writes the same context pack as agent bootstrap plus ONBOARDING.md and onboarding-report.json.
  The command does not perform browser login, Finance token login, destructive actions, or skill installation.
`;
    }
    if (topic === 'safety') {
        return `mere safety model

Read-first defaults:
  mere ops audit --workspace WORKSPACE_ID --json
  mere ops workspace-snapshot --workspace WORKSPACE_ID --json
  mere mcp serve

Guardrails:
  The root CLI never adds --yes or --confirm.
  Soft archives may require --yes.
  Permanent deletes, refunds, disconnects, releases, and expensive external actions require app-local guardrails.
  Destructive MCP tools are hidden unless the server starts with --allow-writes or MERE_MCP_ALLOW_WRITES=1.

Audit:
  Root commands, delegated commands, and MCP invocations append redacted metadata to ~/.local/state/mere/audit.ndjson.
`;
    }
    if (topic === 'mcp') {
        return `mere MCP guide

Start read-only tools:
  mere mcp serve

Start write-capable tools intentionally:
  mere mcp serve --allow-writes
  MERE_MCP_ALLOW_WRITES=1 mere mcp serve

Tool model:
  Tools are generated from app commands --json manifests.
  Names look like mere_projects_project_list or mere_zone_stripe_status.
  Inputs include args, workspace, baseUrl, profile, json, data, dataFile, yes, and confirm.
  Destructive tools still require yes: true and exact confirm when the app manifest requires them.
`;
    }
    if (topic === 'skills') {
        return `mere skills guide

Central registry:
  mere skills list
  mere skills show mere-onboarding-agent
  mere skills install mere-onboarding-agent --target codex
  mere skills install mere-onboarding-agent --target claude

Publisher:
  mere skills list --local --json
  mere skills publish --bucket merekit-skills --base-url https://merekit.com/skills

Notes:
  The public registry defaults to https://merekit.com/skills/index.json.
  Set MERE_SKILLS_REGISTRY_URL to test a different registry.
  Set WRANGLER_BIN="cfman personal wrangler" when publishing through cfman.
`;
    }
    throw new Error(`Unknown help topic: ${topic}. Try: mere help agent, mere help onboard, mere help safety, mere help skills, or mere help mcp.`);
}
function markdownCell(value) {
    return String(value ?? '')
        .replaceAll('|', '\\|')
        .replaceAll('\n', ' ')
        .trim();
}
function resolveOutputDir(paths, env, output) {
    if (!output?.trim())
        return path.join(paths.configDir, 'agents', 'default');
    const home = env.HOME?.trim() || path.dirname(path.dirname(paths.configDir));
    if (output === '~')
        return home;
    if (output.startsWith('~/'))
        return path.join(home, output.slice(2));
    return path.resolve(output);
}
function appSelectorArgs(flags) {
    const app = readStringFlag(flags, 'app');
    return app ? ['--app', app] : [];
}
async function captureRootJson(io, argv) {
    let stdout = '';
    let stderr = '';
    const code = await runCli(argv, {
        env: io.env,
        stdout: (text) => {
            stdout += text;
        },
        stderr: (text) => {
            stderr += text;
        }
    });
    return {
        code,
        stdout,
        stderr,
        value: stdout.trim() ? parseJsonObjectOrArray(stdout.trim()) : null
    };
}
function buildMcpConfig(target, allowWrites) {
    const args = ['mcp', 'serve', ...(allowWrites ? ['--allow-writes'] : [])];
    return {
        target,
        readOnly: !allowWrites,
        mcpServers: {
            mere: {
                command: 'mere',
                args
            }
        },
        notes: [
            'Default MCP mode is read-only.',
            'Write/destructive app tools still require app-local guardrails such as yes and confirm.'
        ]
    };
}
function commandRowsFromManifest(manifestPayload) {
    if (!isRecord(manifestPayload) || !Array.isArray(manifestPayload.apps)) {
        return 'No command manifest was available.\n';
    }
    const rows = [
        '| App | Command | Risk | Auth | JSON | Data | Guardrails | Summary |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |'
    ];
    for (const app of manifestPayload.apps) {
        if (!isRecord(app))
            continue;
        const appName = typeof app.namespace === 'string' ? app.namespace : typeof app.app === 'string' ? app.app : 'unknown';
        if (!Array.isArray(app.commands)) {
            rows.push(`| ${markdownCell(appName)} | _manifest unavailable_ |  |  |  |  |  | ${markdownCell(app.error)} |`);
            continue;
        }
        for (const command of app.commands) {
            if (!isRecord(command))
                continue;
            const pathParts = Array.isArray(command.path) ? command.path.filter((part) => typeof part === 'string') : [];
            const guardrails = [
                command.requiresYes === true ? '--yes' : '',
                command.requiresConfirm === true ? '--confirm' : ''
            ].filter(Boolean);
            rows.push([
                markdownCell(appName),
                markdownCell(pathParts.join(' ')),
                markdownCell(command.risk),
                markdownCell(command.auth),
                command.supportsJson === true ? 'yes' : 'no',
                command.supportsData === true ? 'yes' : 'no',
                markdownCell(guardrails.join(' ') || '-'),
                markdownCell(command.summary)
            ].join(' | ')
                .replace(/^/, '| ')
                .replace(/$/, ' |'));
        }
    }
    return `${rows.join('\n')}\n`;
}
function buildAgentGuide(input) {
    const workspaceLine = input.workspace
        ? `The active bootstrap workspace is \`${input.workspace}\`.`
        : 'No workspace was selected during bootstrap. Run `mere context set-workspace --workspace WORKSPACE_ID` before workspace-scoped operations.';
    const mcpCommand = input.allowWrites ? 'mere mcp serve --allow-writes' : 'mere mcp serve';
    return `# Mere Agent Context

Generated: ${input.generatedAt}
Target: ${input.target}

${workspaceLine}

## Start Here

1. Read \`apps-manifest.json\` for the exact command surface.
2. Read \`auth-status.json\` before assuming an app is authenticated.
3. Read \`context.json\` for root config/state paths and the stored default workspace.
4. Read \`workspace-snapshot.json\` for the safest cross-stack operational view.
5. Use \`command-reference.md\` to find command paths, risk levels, JSON/data support, and guardrails.

## MCP

Use this MCP command:

\`\`\`sh
${mcpCommand}
\`\`\`

The generated \`mcp.json\` file contains the same command in client-config shape.

## Safety

- Prefer read-only commands first.
- The root CLI never adds \`--yes\` or \`--confirm\`.
- Destructive product commands remain app-authoritative.
- Finance uses scoped token profiles instead of browser auth.
- Product tokens remain in app-local stores and are not copied into this context pack.

## Useful Commands

\`\`\`sh
mere help agent
mere apps list --json
mere auth status --all --json
mere ops workspace-snapshot${input.workspace ? ` --workspace ${input.workspace}` : ''} --json
mere apps manifest --json
${mcpCommand}
\`\`\`

## Files

${Object.entries(input.files)
        .map(([name, filePath]) => `- \`${name}\`: \`${filePath}\``)
        .join('\n')}
`;
}
async function collectBootstrapArtifacts(io, flags) {
    const paths = resolveMerePaths(io.env);
    const state = await loadState(paths);
    const target = readStringFlag(flags, 'target') ?? 'codex';
    const workspace = readStringFlag(flags, 'workspace') ?? state.defaultWorkspace ?? null;
    const outputDir = resolveOutputDir(paths, io.env, readStringFlag(flags, 'output'));
    const allowWrites = readBooleanFlag(flags, 'allow-writes');
    const selector = appSelectorArgs(flags);
    const generatedAt = new Date().toISOString();
    if (workspace) {
        await saveState(paths, { ...state, defaultWorkspace: workspace });
    }
    const appsList = await captureRootJson(io, ['apps', 'list', '--json']);
    const doctor = await captureRootJson(io, ['ops', 'doctor', ...selector, '--json']);
    const authStatus = await captureRootJson(io, ['auth', 'status', ...selector, '--json']);
    const financeProfiles = await captureRootJson(io, ['finance', 'profiles', 'list', '--json']);
    const context = await captureRootJson(io, ['context', 'get']);
    const manifest = await captureRootJson(io, ['apps', 'manifest', ...selector, '--json']);
    const snapshot = workspace
        ? await captureRootJson(io, ['ops', 'workspace-snapshot', ...selector, '--workspace', workspace, '--json'])
        : {
            code: 0,
            stdout: '',
            stderr: '',
            value: {
                skipped: true,
                reason: 'No workspace selected. Pass --workspace WORKSPACE_ID or run mere context set-workspace --workspace WORKSPACE_ID.'
            }
        };
    await mkdir(outputDir, { recursive: true });
    const files = {
        'AGENT.md': path.join(outputDir, 'AGENT.md'),
        'bootstrap.json': path.join(outputDir, 'bootstrap.json'),
        'apps-list.json': path.join(outputDir, 'apps-list.json'),
        'doctor.json': path.join(outputDir, 'doctor.json'),
        'auth-status.json': path.join(outputDir, 'auth-status.json'),
        'finance-profiles.json': path.join(outputDir, 'finance-profiles.json'),
        'context.json': path.join(outputDir, 'context.json'),
        'apps-manifest.json': path.join(outputDir, 'apps-manifest.json'),
        'workspace-snapshot.json': path.join(outputDir, 'workspace-snapshot.json'),
        'mcp.json': path.join(outputDir, 'mcp.json'),
        'command-reference.md': path.join(outputDir, 'command-reference.md')
    };
    const checks = {
        appsList: { code: appsList.code, ok: appsList.code === 0, stderr: redactOutput(appsList.stderr.trim()) },
        doctor: { code: doctor.code, ok: doctor.code === 0, stderr: redactOutput(doctor.stderr.trim()) },
        authStatus: { code: authStatus.code, ok: authStatus.code === 0, stderr: redactOutput(authStatus.stderr.trim()) },
        financeProfiles: { code: financeProfiles.code, ok: financeProfiles.code === 0, stderr: redactOutput(financeProfiles.stderr.trim()) },
        context: { code: context.code, ok: context.code === 0, stderr: redactOutput(context.stderr.trim()) },
        manifest: { code: manifest.code, ok: manifest.code === 0, stderr: redactOutput(manifest.stderr.trim()) },
        workspaceSnapshot: { code: snapshot.code, ok: snapshot.code === 0, stderr: redactOutput(snapshot.stderr.trim()) }
    };
    const ok = Object.values(checks).every((check) => check.ok);
    const bootstrap = {
        schemaVersion: 1,
        generatedAt,
        ok,
        target,
        workspace,
        app: readStringFlag(flags, 'app') ?? null,
        outputDir,
        allowWrites,
        checks,
        files
    };
    await writeFile(files['apps-list.json'], `${JSON.stringify(appsList.value, null, 2)}\n`, 'utf8');
    await writeFile(files['doctor.json'], `${JSON.stringify(doctor.value, null, 2)}\n`, 'utf8');
    await writeFile(files['auth-status.json'], `${JSON.stringify(authStatus.value, null, 2)}\n`, 'utf8');
    await writeFile(files['finance-profiles.json'], `${JSON.stringify(financeProfiles.value, null, 2)}\n`, 'utf8');
    await writeFile(files['context.json'], `${JSON.stringify(context.value, null, 2)}\n`, 'utf8');
    await writeFile(files['apps-manifest.json'], `${JSON.stringify(manifest.value, null, 2)}\n`, 'utf8');
    await writeFile(files['workspace-snapshot.json'], `${JSON.stringify(snapshot.value, null, 2)}\n`, 'utf8');
    await writeFile(files['mcp.json'], `${JSON.stringify(buildMcpConfig(target, allowWrites), null, 2)}\n`, 'utf8');
    await writeFile(files['command-reference.md'], `# Mere Command Reference\n\nGenerated: ${generatedAt}\n\n${commandRowsFromManifest(manifest.value)}`, 'utf8');
    await writeFile(files['AGENT.md'], buildAgentGuide({ generatedAt, target, workspace, allowWrites, files }), 'utf8');
    await writeFile(files['bootstrap.json'], `${JSON.stringify(bootstrap, null, 2)}\n`, 'utf8');
    return {
        generatedAt,
        target,
        workspace,
        outputDir,
        files,
        bootstrap,
        checks,
        appsList,
        doctor,
        authStatus,
        financeProfiles,
        context,
        manifest,
        snapshot
    };
}
function selectedEntries(registry, flags, options = {}) {
    const app = readStringFlag(flags, 'app');
    if (app) {
        const entry = findEntry(registry, app);
        if (!entry)
            throw new Error(`Unknown app: ${app}`);
        return [entry];
    }
    if (readBooleanFlag(flags, 'all') || options.defaultAll) {
        return registry.filter((entry) => PRODUCT_APP_KEYS.includes(entry.key));
    }
    throw new Error('Choose --app APP or --all.');
}
function rootCommandPath(positionals) {
    return positionals.slice(0, 3).filter(Boolean);
}
function envWithPnpm(env, pnpm) {
    if (!pnpm.includes('/'))
        return env;
    const pnpmDir = path.dirname(pnpm);
    const currentPath = env.PATH ?? '';
    return {
        ...env,
        PNPM_BIN: pnpm,
        PATH: currentPath ? `${pnpmDir}:${currentPath}` : pnpmDir
    };
}
function splitPassthroughFlags(flags, supported) {
    const leadingNames = new Set(['base-url', 'workspace', 'profile', 'json']);
    const leading = {};
    const trailing = {};
    for (const [name, value] of Object.entries(flags)) {
        if (!supported.has(name))
            continue;
        if (leadingNames.has(name))
            leading[name] = value;
        else
            trailing[name] = value;
    }
    return { leading, trailing };
}
function shouldRetryWithLeadingGlobals(result) {
    if (result.code === 0)
        return false;
    const text = `${result.stderr}\n${result.stdout}`;
    return /Unknown option: --(?:base-url|workspace|profile|json)\b/.test(text);
}
function pickFlags(flags, names) {
    const output = {};
    for (const name of names) {
        const value = flags[name];
        if (value !== undefined)
            output[name] = value;
    }
    return output;
}
async function audited(io, kind, app, command, argv, cwd, run) {
    const paths = resolveMerePaths(io.env);
    const started = Date.now();
    const result = await run();
    await appendAudit(paths, {
        timestamp: new Date(started).toISOString(),
        kind,
        app,
        command,
        argv,
        exitCode: result.code,
        durationMs: Date.now() - started,
        cwd
    }).catch(() => undefined);
    return result;
}
export async function delegateToApp(io, entry, appArgs, passthroughFlags, options = {}) {
    const resolved = await resolveCli(entry, io.env);
    if (!resolved.exists)
        throw new Error(`${entry.label} CLI not found at ${resolved.displayPath}. Run \`mere setup build --app ${entry.key}\`.`);
    const manifestResult = await loadManifest(entry, io.env);
    if (!manifestResult.ok)
        throw new Error(`${entry.label} command manifest unavailable: ${manifestResult.error}`);
    const command = findManifestCommand(manifestResult.manifest, appArgs);
    const supported = supportedFlagNames(manifestResult.manifest, command);
    const { leading, trailing } = splitPassthroughFlags(passthroughFlags, supported);
    const trailingArgs = [...resolved.args, ...appArgs, ...flagArgs(passthroughFlags, supported)];
    const leadingArgs = [...resolved.args, ...flagArgs(leading, supported), ...appArgs, ...flagArgs(trailing, supported)];
    const cwd = executionCwd(entry, resolved);
    const started = Date.now();
    let finalArgs = trailingArgs;
    let result = await runCapture(resolved.command, finalArgs, { cwd, env: io.env });
    if (shouldRetryWithLeadingGlobals(result) && leadingArgs.join('\0') !== trailingArgs.join('\0')) {
        finalArgs = leadingArgs;
        result = await runCapture(resolved.command, finalArgs, { cwd, env: io.env });
    }
    await appendAudit(resolveMerePaths(io.env), {
        timestamp: new Date(started).toISOString(),
        kind: 'delegate',
        app: entry.key,
        command: appArgs,
        argv: finalArgs,
        exitCode: result.code,
        durationMs: Date.now() - started,
        cwd
    }).catch(() => undefined);
    if (!options.capture) {
        if (result.stdout)
            io.stdout(result.stdout);
        if (result.stderr)
            io.stderr(result.stderr);
    }
    return result;
}
async function runSetup(io, action, flags) {
    if (!['build', 'check', 'smoke'].includes(action ?? ''))
        throw new Error('Usage: mere setup build|check|smoke [--app APP|--all]');
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = selectedEntries(registry, flags);
    const pnpm = findPnpm(io.env);
    const setupEnv = envWithPnpm(io.env, pnpm);
    const results = [];
    for (const entry of entries) {
        const script = entry.packageScripts[action];
        if (!script) {
            results.push({ app: entry.key, skipped: true, reason: `No ${action} script.` });
            continue;
        }
        const result = await audited(io, 'root', entry.key, ['setup', action], [pnpm, script], entry.repoDir, () => runCapture(pnpm, [script], { cwd: entry.repoDir, env: setupEnv }));
        results.push({ app: entry.key, ok: result.code === 0, code: result.code, stderr: result.stderr.trim() });
        if (!readBooleanFlag(flags, 'json')) {
            io.stdout(`${entry.key}: ${result.code === 0 ? 'ok' : `failed (${result.code})`}\n`);
            if (result.stderr.trim())
                io.stderr(`${result.stderr.trim()}\n`);
        }
    }
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, { action, results });
    return results.every((result) => result.ok || result.skipped) ? 0 : 1;
}
function financeConfigPath(env) {
    const configured = env.FINANCE_CONFIG_PATH?.trim();
    if (configured)
        return path.resolve(configured);
    const home = env.HOME?.trim() || process.env.HOME || '';
    return path.resolve(home, '.config', 'merefi', 'config.json');
}
function defaultFinanceConfig(env) {
    return {
        currentProfile: 'default',
        profiles: {
            default: {
                baseUrl: env.FINANCE_BASE_URL?.trim() || ''
            }
        }
    };
}
async function loadFinanceConfig(env) {
    try {
        const raw = await readFile(financeConfigPath(env), 'utf8');
        const parsed = JSON.parse(raw);
        const fallback = defaultFinanceConfig(env);
        const profiles = {};
        if (parsed.profiles && typeof parsed.profiles === 'object') {
            for (const [name, profile] of Object.entries(parsed.profiles)) {
                if (!profile || typeof profile !== 'object')
                    continue;
                const candidate = profile;
                if (typeof candidate.baseUrl !== 'string' || candidate.baseUrl.trim().length === 0)
                    continue;
                profiles[name] = {
                    baseUrl: candidate.baseUrl,
                    ...(typeof candidate.token === 'string' ? { token: candidate.token } : {})
                };
            }
        }
        if (!profiles.default)
            profiles.default = fallback.profiles.default;
        const currentProfile = typeof parsed.currentProfile === 'string' && profiles[parsed.currentProfile]
            ? parsed.currentProfile
            : fallback.currentProfile;
        return { currentProfile, profiles };
    }
    catch {
        return defaultFinanceConfig(env);
    }
}
async function saveFinanceConfig(env, config) {
    const configPath = financeConfigPath(env);
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
function financeProfileRows(config) {
    return Object.entries(config.profiles)
        .map(([name, profile]) => ({
        name,
        current: name === config.currentProfile,
        baseUrl: profile.baseUrl,
        hasToken: typeof profile.token === 'string' && profile.token.length > 0
    }))
        .sort((a, b) => (a.current === b.current ? a.name.localeCompare(b.name) : a.current ? -1 : 1));
}
function parseJsonMaybe(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
async function financeAuthStatus(io, entry, flags) {
    const config = await loadFinanceConfig(io.env);
    const profileName = readStringFlag(flags, 'profile') ?? config.currentProfile;
    const profile = config.profiles[profileName] ?? config.profiles.default ?? defaultFinanceConfig(io.env).profiles.default;
    const result = await delegateToApp(io, entry, ['auth', 'whoami'], { json: true, ...(profileName ? { profile: profileName } : {}) }, { capture: true }).catch((error) => ({
        code: 1,
        signal: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error)
    }));
    return {
        app: 'finance',
        auth: 'token',
        configPath: financeConfigPath(io.env),
        currentProfile: config.currentProfile,
        selectedProfile: {
            name: profileName,
            baseUrl: profile.baseUrl,
            hasToken: typeof profile.token === 'string' && profile.token.length > 0
        },
        profiles: financeProfileRows(config),
        whoami: {
            ok: result.code === 0,
            code: result.code,
            stdout: result.stdout.trim() ? parseJsonMaybe(result.stdout.trim()) : null,
            stderr: result.stderr.trim()
        }
    };
}
async function runFinanceProfiles(io, action, args, flags) {
    const config = await loadFinanceConfig(io.env);
    if (!action || action === 'list') {
        const profiles = financeProfileRows(config);
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, { configPath: financeConfigPath(io.env), currentProfile: config.currentProfile, profiles });
        else
            io.stdout(profiles.map((profile) => `${profile.current ? '*' : ' '} ${profile.name}\t${profile.hasToken ? 'token' : 'no-token'}\t${profile.baseUrl}`).join('\n') + '\n');
        return 0;
    }
    if (action === 'current') {
        const profile = config.profiles[config.currentProfile] ?? config.profiles.default ?? defaultFinanceConfig(io.env).profiles.default;
        const payload = {
            configPath: financeConfigPath(io.env),
            name: config.currentProfile,
            baseUrl: profile.baseUrl,
            hasToken: typeof profile.token === 'string' && profile.token.length > 0
        };
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, payload);
        else
            io.stdout(`${payload.name}\t${payload.hasToken ? 'token' : 'no-token'}\t${payload.baseUrl}\n`);
        return 0;
    }
    if (action === 'use') {
        const name = args[0]?.trim();
        if (!name)
            throw new Error('Usage: mere finance profiles use NAME [--base-url URL] [--json]');
        const baseUrl = readStringFlag(flags, 'base-url');
        const existing = config.profiles[name];
        const nextBaseUrl = baseUrl ?? existing?.baseUrl;
        if (!nextBaseUrl?.trim()) {
            throw new Error(`Finance profile '${name}' needs a tenant base URL. Pass --base-url https://<tenant>.mere.finance.`);
        }
        config.profiles[name] = {
            baseUrl: nextBaseUrl,
            ...(existing?.token ? { token: existing.token } : {})
        };
        config.currentProfile = name;
        await saveFinanceConfig(io.env, config);
        const payload = {
            ok: true,
            configPath: financeConfigPath(io.env),
            currentProfile: name,
            baseUrl: config.profiles[name].baseUrl,
            hasToken: typeof config.profiles[name].token === 'string'
        };
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, payload);
        else
            io.stdout(`finance profile: ${name}\n`);
        return 0;
    }
    if (action === 'login') {
        const name = args[0]?.trim();
        if (!name)
            throw new Error('Usage: mere finance profiles login NAME [--base-url URL] [--json]');
        const baseUrl = readStringFlag(flags, 'base-url');
        const existing = config.profiles[name];
        const nextBaseUrl = baseUrl ?? existing?.baseUrl;
        if (!nextBaseUrl?.trim()) {
            throw new Error(`Finance profile '${name}' needs a tenant base URL. Pass --base-url https://<tenant>.mere.finance.`);
        }
        config.profiles[name] = {
            baseUrl: nextBaseUrl,
            ...(existing?.token ? { token: existing.token } : {})
        };
        config.currentProfile = name;
        await saveFinanceConfig(io.env, config);
        const paths = resolveMerePaths(io.env);
        const entry = findEntry(createRegistry(paths.mereRoot, paths.packageRoot), 'finance');
        if (!entry)
            throw new Error('Finance app is not registered.');
        const result = await delegateToApp(io, entry, ['auth', 'login'], { 'base-url': nextBaseUrl, profile: name, json: readBooleanFlag(flags, 'json') }, { capture: true });
        const payload = {
            ok: result.code === 0,
            code: result.code,
            configPath: financeConfigPath(io.env),
            currentProfile: name,
            baseUrl: nextBaseUrl,
            stdout: result.stdout.trim() ? parseJsonMaybe(redactOutput(result.stdout.trim())) : null,
            stderr: redactOutput(result.stderr.trim())
        };
        if (readBooleanFlag(flags, 'json'))
            writeJson(io, payload);
        else {
            io.stdout(`finance profile: ${name}\n`);
            if (result.stdout.trim())
                io.stdout(`${redactOutput(result.stdout.trim())}\n`);
            if (result.stderr.trim())
                io.stderr(`${redactOutput(result.stderr.trim())}\n`);
        }
        return result.code;
    }
    throw new Error('Usage: mere finance profiles list|current|use|login');
}
async function runAuth(io, action, flags) {
    if (!['login', 'whoami', 'logout', 'status'].includes(action ?? ''))
        throw new Error('Usage: mere auth login|whoami|logout|status [--app APP|--all]');
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = selectedEntries(registry, flags, { defaultAll: action === 'whoami' || action === 'status' });
    const results = [];
    for (const entry of entries) {
        if (entry.key === 'finance' && action === 'status') {
            const result = await financeAuthStatus(io, entry, flags);
            results.push(result);
            if (!readBooleanFlag(flags, 'json')) {
                io.stdout(`${entry.key}: ${result.whoami.ok ? 'authenticated' : 'unauthenticated'} (${result.selectedProfile.name}, ${result.selectedProfile.hasToken ? 'token' : 'no-token'})\n`);
                if (result.whoami.stderr)
                    io.stderr(`${result.whoami.stderr}\n`);
            }
            continue;
        }
        if (entry.authKind === 'token' && action === 'login' && readBooleanFlag(flags, 'all')) {
            results.push({
                app: entry.key,
                ok: true,
                skipped: true,
                reason: `Token auth is managed by \`mere ${entry.key} auth login\` so profile-specific flags pass through.`
            });
            if (!readBooleanFlag(flags, 'json')) {
                io.stdout(`${entry.key}: skipped token auth helper; use \`mere ${entry.key} auth login\`.\n`);
            }
            continue;
        }
        const result = await delegateToApp(io, entry, ['auth', action === 'status' ? 'whoami' : action], pickFlags(flags, ['base-url', 'workspace', 'profile', 'json']), { capture: true });
        results.push({ app: entry.key, ok: result.code === 0, code: result.code, stdout: redactOutput(result.stdout.trim()), stderr: redactOutput(result.stderr.trim()) });
        if (!readBooleanFlag(flags, 'json')) {
            io.stdout(`${entry.key}: ${result.code === 0 ? 'ok' : `failed (${result.code})`}\n`);
            if (result.stdout.trim())
                io.stdout(`${redactOutput(result.stdout.trim())}\n`);
            if (result.stderr.trim())
                io.stderr(`${redactOutput(result.stderr.trim())}\n`);
        }
    }
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, { action, results });
    return action === 'whoami' || action === 'status' ? 0 : results.every((result) => 'ok' in result && result.ok) ? 0 : 1;
}
async function runContext(io, action, flags) {
    const paths = resolveMerePaths(io.env);
    if (!action || action === 'get') {
        writeJson(io, { paths, state: await loadState(paths) });
        return 0;
    }
    if (action === 'set-workspace') {
        const workspace = readStringFlag(flags, 'workspace');
        if (!workspace)
            throw new Error('Usage: mere context set-workspace --workspace ID');
        await saveState(paths, { ...(await loadState(paths)), defaultWorkspace: workspace });
        writeJson(io, { ok: true, defaultWorkspace: workspace });
        return 0;
    }
    if (action === 'clear') {
        await clearState(paths);
        writeJson(io, { ok: true });
        return 0;
    }
    throw new Error('Usage: mere context get|set-workspace|clear');
}
async function runAgent(io, action, flags) {
    if (!action || action === 'help') {
        writeText(io, helpTopicText('agent'));
        return 0;
    }
    if (action !== 'bootstrap')
        throw new Error('Usage: mere agent bootstrap [--workspace ID] [--app APP] [--target codex] [--output DIR] [--json]');
    const artifacts = await collectBootstrapArtifacts(io, flags);
    if (readBooleanFlag(flags, 'json')) {
        writeJson(io, artifacts.bootstrap);
    }
    else {
        io.stdout(`agent context: ${artifacts.outputDir}\n`);
        io.stdout(`workspace: ${artifacts.workspace ?? 'not selected'}\n`);
        io.stdout(`mcp: ${readBooleanFlag(flags, 'allow-writes') ? 'mere mcp serve --allow-writes' : 'mere mcp serve'}\n`);
        for (const [name, check] of Object.entries(artifacts.checks)) {
            io.stdout(`${name}: ${check.ok ? 'ok' : `needs attention (${check.code})`}\n`);
        }
    }
    return 0;
}
async function appList(io, flags) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const rows = [];
    for (const entry of registry) {
        const resolved = await resolveCli(entry, io.env);
        rows.push({ app: entry.key, label: entry.label, auth: entry.authKind, cli: resolved.displayPath, source: resolved.source, exists: resolved.exists });
    }
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, { apps: rows });
    else
        io.stdout(rows.map((row) => `${row.app}\t${row.auth}\t${row.source}\t${row.exists ? 'ready' : 'missing'}\t${row.cli}`).join('\n') + '\n');
    return 0;
}
async function appManifest(io, flags) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
    const results = await loadManifests(entries, io.env);
    writeJson(io, manifestForJson(results));
    return results.every((result) => result.ok) ? 0 : 1;
}
async function appDoctor(io, flags) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
    const results = [];
    for (const entry of entries) {
        const resolved = await resolveCli(entry, io.env);
        const manifest = await loadManifest(entry, io.env);
        results.push({ app: entry.key, cli: resolved.displayPath, source: resolved.source, cliExists: resolved.exists, manifestOk: manifest.ok, error: manifest.error });
    }
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, { results });
    else
        io.stdout(results.map((result) => `${result.app}: ${result.cliExists && result.manifestOk ? 'ok' : 'needs attention'} [${result.source}]${result.error ? ` (${result.error})` : ''}`).join('\n') + '\n');
    return results.every((result) => result.cliExists && result.manifestOk) ? 0 : 1;
}
async function runApps(io, action, flags) {
    if (action === 'list' || !action)
        return appList(io, flags);
    if (action === 'manifest')
        return appManifest(io, flags);
    if (action === 'doctor')
        return appDoctor(io, flags);
    throw new Error('Usage: mere apps list|manifest|doctor');
}
async function opsDoctor(io, flags) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
    const node = process.version;
    const pnpm = await runCapture(findPnpm(io.env), ['--version'], { env: io.env }).catch((error) => ({
        code: 1,
        signal: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error)
    }));
    const apps = [];
    for (const entry of entries) {
        const resolved = await resolveCli(entry, io.env);
        const cwd = executionCwd(entry, resolved);
        const version = resolved.exists ? await runCapture(resolved.command, [...resolved.args, '--version'], { cwd, env: io.env, timeoutMs: 10_000 }).catch(() => null) : null;
        const completion = resolved.exists ? await runCapture(resolved.command, [...resolved.args, 'completion', 'bash'], { cwd, env: io.env, timeoutMs: 10_000 }).catch(() => null) : null;
        const manifest = await loadManifest(entry, io.env);
        const whoami = resolved.exists ? await runCapture(resolved.command, [...resolved.args, 'auth', 'whoami', '--json'], { cwd, env: io.env, timeoutMs: 10_000 }).catch(() => null) : null;
        apps.push({
            app: entry.key,
            cli: resolved.displayPath,
            source: resolved.source,
            cliExists: resolved.exists,
            versionOk: version?.code === 0,
            version: version?.stdout.trim() ?? null,
            completionOk: completion?.code === 0,
            manifestOk: manifest.ok,
            authOk: whoami?.code === 0,
            authStatus: whoami?.code === 0 ? 'authenticated' : 'unauthenticated'
        });
    }
    const payload = { node, pnpm: { ok: pnpm.code === 0, version: pnpm.stdout.trim(), error: pnpm.stderr.trim() }, apps };
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, payload);
    else
        io.stdout(apps.map((app) => `${app.app}: ${app.cliExists && app.completionOk && app.manifestOk ? 'ok' : 'needs attention'} (${app.authStatus})`).join('\n') + '\n');
    return apps.every((app) => app.cliExists && app.completionOk && app.manifestOk) ? 0 : 1;
}
async function opsSmoke(io, flags) {
    const nextFlags = { ...flags };
    if (!readStringFlag(flags, 'app'))
        nextFlags.all = true;
    return runSetup(io, 'smoke', nextFlags);
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseJsonObjectOrArray(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
async function delegateJson(io, entry, command, flags) {
    const result = await delegateToApp(io, entry, command, { json: true, ...flags }, { capture: true });
    if (result.code !== 0)
        return null;
    return parseJsonObjectOrArray(result.stdout.trim());
}
async function inferTodayTenant(io, entry, workspace) {
    if (!workspace)
        return null;
    const payload = await delegateJson(io, entry, ['tenant', 'resolve'], { workspace });
    if (!isRecord(payload))
        return null;
    const raw = isRecord(payload.raw) ? payload.raw : null;
    if (typeof raw?.id === 'string')
        return raw.id;
    const tenant = isRecord(payload.tenant) ? payload.tenant : null;
    return typeof tenant?.id === 'string' ? tenant.id : null;
}
async function inferZoneStore(io, entry, workspace) {
    const payload = await delegateJson(io, entry, ['store', 'list'], workspace ? { workspace } : {});
    if (!isRecord(payload))
        return null;
    const current = isRecord(payload.current) ? payload.current : null;
    if (typeof current?.storeId === 'string')
        return current.storeId;
    const stores = Array.isArray(payload.stores) ? payload.stores : [];
    const first = stores.find(isRecord);
    return typeof first?.storeId === 'string' ? first.storeId : null;
}
async function auditFlagsForCommand(io, entry, command, workspace) {
    const flagsForCommand = { json: true };
    if (workspace)
        flagsForCommand.workspace = workspace;
    if (entry.key === 'today') {
        if (command[0] === 'tenant' && command[1] === 'resolve' && workspace) {
            flagsForCommand.workspace = workspace;
        }
        if (['booking', 'time-entry'].includes(command[0] ?? '') && command[1] === 'list') {
            const tenant = await inferTodayTenant(io, entry, workspace);
            if (tenant)
                flagsForCommand.tenant = tenant;
        }
    }
    if (entry.key === 'zone' && command[0] === 'stripe' && command[1] === 'status') {
        const store = await inferZoneStore(io, entry, workspace);
        if (store)
            flagsForCommand.store = store;
    }
    if (entry.key === 'gives' && ['tenant', 'campaigns', 'stripe'].includes(command[0] ?? '') && workspace) {
        flagsForCommand.tenant = workspace;
    }
    return flagsForCommand;
}
async function selectorHintsForEntry(io, entry, workspace) {
    const hints = {
        workspace: workspace ?? null,
        inferredTenants: [],
        inferredStores: [],
        missing: []
    };
    if (!workspace) {
        hints.missing.push({
            app: entry.key,
            selector: 'workspace',
            discoveryCommand: ['context', 'set-workspace'],
            reason: 'No workspace was provided or stored in root context.'
        });
        return hints;
    }
    if (entry.key === 'today') {
        const tenant = await inferTodayTenant(io, entry, workspace);
        if (tenant) {
            hints.inferredTenants.push({ app: entry.key, value: tenant, sourceCommand: ['tenant', 'resolve'] });
        }
        else {
            hints.missing.push({
                app: entry.key,
                selector: 'tenant',
                discoveryCommand: ['tenant', 'resolve'],
                reason: 'Could not resolve the workspace to a Today tenant.'
            });
        }
    }
    if (entry.key === 'zone') {
        const store = await inferZoneStore(io, entry, workspace);
        if (store) {
            hints.inferredStores.push({ app: entry.key, value: store, sourceCommand: ['store', 'list'] });
        }
        else {
            hints.missing.push({
                app: entry.key,
                selector: 'store',
                discoveryCommand: ['store', 'list'],
                reason: 'Could not infer a Zone store for this workspace.'
            });
        }
    }
    if (entry.key === 'gives') {
        hints.inferredTenants.push({ app: entry.key, value: workspace, sourceCommand: ['tenant', 'campaigns', 'stripe'] });
    }
    return hints;
}
async function collectReadOnlyAuditDefaults(io, flags, workspace) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
    const apps = [];
    const audits = [];
    for (const entry of entries) {
        const manifest = await loadManifest(entry, io.env);
        const app = {
            app: entry.key,
            namespace: entry.namespace,
            ok: false,
            manifestOk: manifest.ok,
            commands: []
        };
        if (!manifest.ok || !manifest.manifest) {
            app.error = manifest.error;
            apps.push(app);
            continue;
        }
        app.selectorHints = await selectorHintsForEntry(io, entry, workspace);
        const readCommands = manifest.manifest.commands.filter((command) => command.risk === 'read');
        const commands = readCommands.filter((command) => command.auditDefault);
        app.coverage = {
            readCommands: readCommands.length,
            auditDefaultCommands: commands.length,
            executedCommands: 0,
            skippedReadCommands: readCommands
                .filter((command) => !command.auditDefault)
                .map((command) => ({
                command: command.path,
                reason: 'Not marked auditDefault in the app manifest.'
            }))
        };
        for (const command of commands) {
            const flagsForCommand = await auditFlagsForCommand(io, entry, command.path, workspace);
            try {
                const result = await delegateToApp(io, entry, command.path, flagsForCommand, { capture: true });
                const row = {
                    app: entry.key,
                    command: command.path,
                    ok: result.code === 0,
                    code: result.code,
                    stdout: redactOutput(result.stdout.trim()),
                    stderr: redactOutput(result.stderr.trim())
                };
                app.commands.push(row);
                audits.push(row);
                app.coverage.executedCommands += 1;
            }
            catch (error) {
                const row = {
                    app: entry.key,
                    command: command.path,
                    ok: false,
                    code: null,
                    stdout: '',
                    stderr: '',
                    error: error instanceof Error ? error.message : String(error)
                };
                app.commands.push(row);
                audits.push(row);
                app.coverage.executedCommands += 1;
            }
        }
        app.ok = app.commands.every((command) => command.ok);
        apps.push(app);
    }
    return { generatedAt: new Date().toISOString(), workspace: workspace ?? null, apps, audits };
}
async function opsAudit(io, flags) {
    const payload = await collectReadOnlyAuditDefaults(io, flags, readStringFlag(flags, 'workspace'));
    writeJson(io, { generatedAt: payload.generatedAt, workspace: payload.workspace, audits: payload.audits });
    return payload.audits.every((audit) => audit.ok) ? 0 : 1;
}
async function opsWorkspaceSnapshot(io, flags) {
    const paths = resolveMerePaths(io.env);
    const state = await loadState(paths);
    const workspace = readStringFlag(flags, 'workspace') ?? state.defaultWorkspace;
    if (!workspace)
        throw new Error('Usage: mere ops workspace-snapshot --workspace ID [--app APP] [--json]');
    const payload = await collectReadOnlyAuditDefaults(io, flags, workspace);
    writeJson(io, {
        generatedAt: payload.generatedAt,
        workspace,
        apps: payload.apps
    });
    return payload.apps.every((app) => app.ok) ? 0 : 1;
}
function recordsFrom(value, key) {
    if (!isRecord(value) || !Array.isArray(value[key]))
        return [];
    return value[key].filter(isRecord);
}
function appRecord(records, app) {
    return records.find((record) => record.app === app || record.namespace === app) ?? null;
}
function commandString(parts) {
    return parts.filter(Boolean).join(' ');
}
function manifestCommands(manifest) {
    if (!manifest || !Array.isArray(manifest.commands))
        return [];
    return manifest.commands.filter(isRecord);
}
function globalFlags(manifest) {
    return manifest && Array.isArray(manifest.globalFlags) ? manifest.globalFlags.filter((flag) => typeof flag === 'string') : [];
}
function safeCommand(entry, manifest, command, workspace) {
    const parts = ['mere', entry.key, ...command.path];
    const flags = globalFlags(manifest);
    if (workspace && flags.includes('workspace'))
        parts.push('--workspace', workspace);
    if (command.supportsJson)
        parts.push('--json');
    return commandString(parts);
}
function authOkFor(entry, auth) {
    if (!auth)
        return false;
    if (entry.key === 'finance') {
        const whoami = isRecord(auth.whoami) ? auth.whoami : null;
        const selectedProfile = isRecord(auth.selectedProfile) ? auth.selectedProfile : null;
        return whoami?.ok === true && selectedProfile?.hasToken === true;
    }
    return auth.ok === true;
}
function financeLoginCommand(flags) {
    const profile = readStringFlag(flags, 'finance-profile') ?? 'default';
    const baseUrl = readStringFlag(flags, 'finance-base-url') ?? 'https://<tenant>.mere.finance';
    return `mere finance profiles login ${profile} --base-url ${baseUrl} --json`;
}
function browserLoginCommand(entry, workspace) {
    return commandString(['mere', 'auth', 'login', '--app', entry.key, ...(workspace ? ['--workspace', workspace] : []), '--json']);
}
function buildOnboardingMarkdown(report) {
    const apps = Array.isArray(report.apps) ? report.apps.filter(isRecord) : [];
    const remediation = Array.isArray(report.remediation) ? report.remediation.filter(isRecord) : [];
    const readiness = typeof report.readinessScore === 'number' ? report.readinessScore : 0;
    const title = readiness >= 90 ? 'Ready' : remediation.some((item) => item.blocking === true) ? 'Blocked' : 'Needs attention';
    const rows = apps.map((app) => [
        markdownCell(app.app),
        markdownCell(app.status),
        markdownCell(app.readinessScore),
        markdownCell(Array.isArray(app.nextCommands) ? app.nextCommands[0] ?? '-' : '-')
    ].join(' | '));
    const nextSteps = remediation
        .map((item) => (typeof item.nextCommand === 'string' ? `- \`${item.nextCommand}\`: ${String(item.reason ?? '')}` : ''))
        .filter(Boolean);
    return `# Mere Onboarding

Status: ${title}
Readiness: ${readiness}
Workspace: ${String(report.workspace ?? 'not selected')}

| App | Status | Readiness | Next Command |
| --- | --- | ---: | --- |
${rows.map((row) => `| ${row} |`).join('\n')}

## Next Steps

${nextSteps.length ? nextSteps.join('\n') : '- No blocking next steps.'}

## Skills

- \`mere skills list\`
- \`mere skills show mere-onboarding-agent\`
- \`mere skills install mere-onboarding-agent --target ${String(report.target ?? 'codex')}\`
`;
}
function renderOnboardingText(report) {
    const apps = Array.isArray(report.apps) ? report.apps.filter(isRecord) : [];
    const remediation = Array.isArray(report.remediation) ? report.remediation.filter(isRecord) : [];
    const blocked = remediation.some((item) => item.blocking === true);
    const score = typeof report.readinessScore === 'number' ? report.readinessScore : 0;
    const header = score >= 90 ? 'Ready' : blocked ? 'Blocked' : 'Needs attention';
    const lines = [`${header} (${score}/100)`, `workspace: ${String(report.workspace ?? 'not selected')}`, '', 'App\tStatus\tScore\tNext command'];
    for (const app of apps) {
        const next = Array.isArray(app.nextCommands) ? app.nextCommands[0] ?? '-' : '-';
        lines.push(`${String(app.app)}\t${String(app.status)}\t${String(app.readinessScore)}\t${next}`);
    }
    lines.push('', 'Next steps:');
    if (remediation.length === 0) {
        lines.push('- none');
    }
    else {
        for (const item of remediation) {
            if (typeof item.nextCommand === 'string')
                lines.push(`- ${item.nextCommand}`);
        }
    }
    return `${lines.join('\n')}\n`;
}
function buildOnboardingReport(entries, artifacts, flags) {
    const appRows = recordsFrom(artifacts.appsList.value, 'apps');
    const doctorRows = recordsFrom(artifacts.doctor.value, 'apps');
    const manifestRows = recordsFrom(artifacts.manifest.value, 'apps');
    const authRows = recordsFrom(artifacts.authStatus.value, 'results');
    const snapshotRows = recordsFrom(artifacts.snapshot.value, 'apps');
    const workspace = artifacts.workspace;
    const remediation = [];
    const apps = [];
    const selectors = { workspace, inferredTenants: [], inferredStores: [], missing: [] };
    for (const entry of entries) {
        const appList = appRecord(appRows, entry.key);
        const doctor = appRecord(doctorRows, entry.key);
        const manifest = appRecord(manifestRows, entry.key);
        const auth = appRecord(authRows, entry.key);
        const snapshot = appRecord(snapshotRows, entry.key);
        const blockers = [];
        const warnings = [];
        const nextCommands = [];
        const safeFirstCommands = manifestCommands(manifest)
            .filter((command) => command.auditDefault && command.risk === 'read')
            .map((command) => safeCommand(entry, manifest, command, workspace));
        if (appList?.exists !== true) {
            blockers.push('CLI adapter is not available.');
            const nextCommand = `mere setup build --app ${entry.key}`;
            nextCommands.push(nextCommand);
            remediation.push({
                id: `${entry.key}.adapter`,
                severity: 'error',
                app: entry.key,
                reason: `${entry.label} adapter is missing.`,
                nextCommand,
                blocking: true
            });
        }
        if (!manifest || !Array.isArray(manifest.commands)) {
            blockers.push('Command manifest is unavailable.');
            const nextCommand = `mere apps doctor --app ${entry.key} --json`;
            nextCommands.push(nextCommand);
            remediation.push({
                id: `${entry.key}.manifest`,
                severity: 'error',
                app: entry.key,
                reason: `${entry.label} command manifest could not be loaded.`,
                nextCommand,
                blocking: true
            });
        }
        if (!workspace) {
            blockers.push('Workspace is not selected.');
            const nextCommand = 'mere onboard --workspace WORKSPACE_ID --json';
            nextCommands.push(nextCommand);
            remediation.push({
                id: `${entry.key}.workspace`,
                severity: 'error',
                app: entry.key,
                reason: `${entry.label} needs a workspace to produce a complete onboarding snapshot.`,
                nextCommand,
                blocking: true
            });
        }
        if (entry.authKind === 'browser' && !authOkFor(entry, auth)) {
            warnings.push('Browser auth is not confirmed.');
            const nextCommand = browserLoginCommand(entry, workspace);
            nextCommands.push(nextCommand);
            remediation.push({
                id: `${entry.key}.auth`,
                severity: 'warning',
                app: entry.key,
                reason: `${entry.label} browser session is not authenticated.`,
                nextCommand,
                blocking: false
            });
        }
        if (entry.key === 'finance' && !authOkFor(entry, auth)) {
            warnings.push('Finance token/profile auth is not confirmed.');
            const nextCommand = financeLoginCommand(flags);
            nextCommands.push(nextCommand);
            remediation.push({
                id: 'finance.auth',
                severity: 'warning',
                app: 'finance',
                reason: 'Finance profile needs token authentication.',
                nextCommand,
                blocking: false
            });
        }
        if (doctor?.manifestOk === false || doctor?.cliExists === false) {
            warnings.push('Doctor reported setup needs attention.');
        }
        if (snapshot && Array.isArray(snapshot.commands)) {
            const failed = snapshot.commands.filter((command) => isRecord(command) && command.ok !== true);
            if (failed.length > 0)
                warnings.push(`${failed.length} safe read command failed.`);
        }
        if (snapshot && isRecord(snapshot.selectorHints)) {
            const hints = snapshot.selectorHints;
            selectors.inferredTenants.push(...(Array.isArray(hints.inferredTenants) ? hints.inferredTenants : []));
            selectors.inferredStores.push(...(Array.isArray(hints.inferredStores) ? hints.inferredStores : []));
            selectors.missing.push(...(Array.isArray(hints.missing) ? hints.missing : []));
            if (Array.isArray(hints.missing) && hints.missing.length > 0)
                warnings.push('Some selectors could not be inferred.');
        }
        const readinessScore = Math.max(0, 100 - blockers.length * 35 - warnings.length * 15);
        const status = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'needs_attention' : 'ready';
        apps.push({
            app: entry.key,
            label: entry.label,
            status,
            readinessScore,
            blockers,
            warnings,
            nextCommands: nextCommands.filter((command, index, list) => list.indexOf(command) === index),
            safeFirstCommands
        });
    }
    const summary = {
        ready: apps.filter((app) => app.status === 'ready').length,
        blocked: apps.filter((app) => app.status === 'blocked').length,
        needsAuth: remediation.filter((item) => item.id.endsWith('.auth')).length,
        needsSelector: remediation.filter((item) => item.id.endsWith('.workspace')).length + selectors.missing.length,
        needsInstall: remediation.filter((item) => item.id.endsWith('.adapter')).length,
        optional: selectors.missing.length
    };
    const readinessScore = apps.length ? Math.round(apps.reduce((sum, app) => sum + app.readinessScore, 0) / apps.length) : 0;
    const reportFiles = {
        ...artifacts.files,
        'onboarding-report.json': path.join(artifacts.outputDir, 'onboarding-report.json'),
        'ONBOARDING.md': path.join(artifacts.outputDir, 'ONBOARDING.md')
    };
    return {
        schemaVersion: 1,
        generatedAt: artifacts.generatedAt,
        ok: true,
        readinessScore,
        workspace,
        target: artifacts.target,
        outputDir: artifacts.outputDir,
        summary,
        apps,
        selectors,
        remediation,
        artifacts: {
            bootstrap: artifacts.files['bootstrap.json'],
            onboardingReport: reportFiles['onboarding-report.json'],
            onboardingMarkdown: reportFiles['ONBOARDING.md']
        },
        files: reportFiles
    };
}
async function runOnboard(io, action, flags) {
    if (action && action !== 'help')
        throw new Error('Usage: mere onboard [--interactive] [--invite-code CODE|--workspace ID] [--app APP] [--target codex|claude] [--output DIR] [--json]');
    if (action === 'help') {
        writeText(io, helpTopicText('onboard'));
        return 0;
    }
    const inviteCode = readStringFlag(flags, 'invite-code');
    if (inviteCode) {
        throw new Error('Invite codes require the TUI (`mere tui` or `mere onboard --interactive --invite-code CODE`) or the headless bootstrap command: `mere business onboard start INVITE_CODE --json`.');
    }
    const target = readStringFlag(flags, 'target') ?? 'codex';
    if (target !== 'codex' && target !== 'claude')
        throw new Error('Onboard target must be codex or claude.');
    const paths = resolveMerePaths(io.env);
    const entries = selectedEntries(createRegistry(paths.mereRoot, paths.packageRoot), flags, { defaultAll: true });
    const artifacts = await collectBootstrapArtifacts(io, flags);
    const report = buildOnboardingReport(entries, artifacts, flags);
    const files = isRecord(report.files) ? report.files : {};
    const onboardingReport = typeof files['onboarding-report.json'] === 'string' ? files['onboarding-report.json'] : path.join(artifacts.outputDir, 'onboarding-report.json');
    const onboardingMarkdown = typeof files['ONBOARDING.md'] === 'string' ? files['ONBOARDING.md'] : path.join(artifacts.outputDir, 'ONBOARDING.md');
    await writeFile(onboardingReport, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(onboardingMarkdown, buildOnboardingMarkdown(report), 'utf8');
    if (readBooleanFlag(flags, 'json'))
        writeJson(io, report);
    else
        io.stdout(renderOnboardingText(report));
    return 0;
}
async function runTui(io, flags) {
    const paths = resolveMerePaths(io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const entries = registry.filter((entry) => PRODUCT_APP_KEYS.includes(entry.key));
    return runFirstUseTui({
        io,
        entries,
        flags,
        runCommand: async (args) => {
            let stdout = '';
            let stderr = '';
            const code = await runCli(args, {
                env: io.env,
                stdin: io.stdin,
                stdout: (text) => {
                    stdout += text;
                },
                stderr: (text) => {
                    stderr += text;
                }
            });
            return { code, stdout, stderr };
        }
    });
}
async function runOps(io, action, flags) {
    if (action === 'doctor' || !action)
        return opsDoctor(io, flags);
    if (action === 'smoke')
        return opsSmoke(io, flags);
    if (action === 'audit')
        return opsAudit(io, flags);
    if (action === 'workspace-snapshot')
        return opsWorkspaceSnapshot(io, flags);
    throw new Error('Usage: mere ops doctor|smoke|audit|workspace-snapshot');
}
async function maybeReadVersion() {
    try {
        const raw = await readFile(new URL('../package.json', import.meta.url), 'utf8');
        return JSON.parse(raw).version ?? CLI_VERSION;
    }
    catch {
        return CLI_VERSION;
    }
}
async function completionCommandMap(registry, env) {
    const output = {};
    const manifests = await loadManifests(registry, env).catch(() => []);
    for (const result of manifests) {
        if (!result.ok || !result.manifest)
            continue;
        const firstSegments = result.manifest.commands
            .map((command) => command.path[0])
            .filter((part) => typeof part === 'string' && part.length > 0)
            .filter((part, index, list) => list.indexOf(part) === index)
            .sort();
        for (const alias of result.entry.aliases)
            output[alias] = firstSegments;
        output[result.entry.key] = firstSegments;
    }
    return output;
}
export async function runCli(argv, io) {
    try {
        const paths = resolveMerePaths(io.env);
        const registry = createRegistry(paths.mereRoot, paths.packageRoot);
        const { flags: passthroughFlags, rest } = extractPassthroughFlags(argv);
        const parsed = parseArgs(argv);
        if (readBooleanFlag(parsed.flags, 'version') || argv[0] === 'version') {
            writeText(io, await maybeReadVersion());
            return 0;
        }
        if (argv.length === 0 || readBooleanFlag(parsed.flags, 'help')) {
            writeText(io, helpText());
            return 0;
        }
        if (argv[0] === 'help') {
            writeText(io, helpTopicText(argv[1]));
            return 0;
        }
        if (rest[0] === 'completion') {
            writeText(io, renderCompletion(rest[1], registry, await completionCommandMap(registry, io.env)));
            return 0;
        }
        if (rest[0] === 'setup')
            return await runSetup(io, rest[1], parsed.flags);
        if (rest[0] === 'auth')
            return await runAuth(io, rest[1], parsed.flags);
        if (rest[0] === 'context')
            return await runContext(io, rest[1], parsed.flags);
        if (rest[0] === 'agent')
            return await runAgent(io, rest[1], parsed.flags);
        if (rest[0] === 'tui')
            return await runTui(io, parsed.flags);
        if (rest[0] === 'onboard' && readBooleanFlag(parsed.flags, 'interactive'))
            return await runTui(io, parsed.flags);
        if (rest[0] === 'onboard')
            return await runOnboard(io, rest[1]?.startsWith('--') ? undefined : rest[1], parsed.flags);
        if (rest[0] === 'skills')
            return await runSkills(io, rest[1], rest.slice(2), parsed.flags);
        if (rest[0] === 'apps')
            return await runApps(io, rest[1], parsed.flags);
        if (rest[0] === 'ops')
            return await runOps(io, rest[1], parsed.flags);
        if (rest[0] === 'finance' && rest[1] === 'profiles')
            return await runFinanceProfiles(io, rest[2], rest.slice(3), parsed.flags);
        if (rest[0] === 'mcp' && rest[1] === 'serve') {
            await runMcpServer({ io, allowWrites: readBooleanFlag(parsed.flags, 'allow-writes') || io.env.MERE_MCP_ALLOW_WRITES === '1' });
            return 0;
        }
        const entry = findEntry(registry, rest[0]);
        if (!entry)
            throw new Error(`Unknown command or app: ${rest[0] ?? '(missing)'}`);
        const result = await delegateToApp(io, entry, rest.slice(1), passthroughFlags);
        return result.code;
    }
    catch (error) {
        io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
    }
}
export function commandPathForTest(positionals) {
    return rootCommandPath(positionals);
}
