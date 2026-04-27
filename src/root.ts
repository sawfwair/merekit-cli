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
import type { ProcessResult, RegistryEntry } from './types.js';
import { CLI_VERSION } from './version.js';

export interface CliIO {
	stdout: (text: string) => void;
	stderr: (text: string) => void;
	env: NodeJS.ProcessEnv;
}

function writeJson(io: CliIO, value: unknown): void {
	io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(io: CliIO, value: string): void {
	io.stdout(`${value}\n`);
}

function helpText(): string {
	return `mere CLI

Usage:
  mere [--json] <command>
  mere <app> [app command...]

Agent first run:
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
  help [agent|safety|mcp]
  completion [bash|zsh|fish]
  apps list|manifest|doctor
  auth login|whoami|logout|status [--app APP|--all]
  context get|set-workspace|clear
  agent bootstrap [--workspace ID] [--app APP] [--target codex] [--output DIR]
  finance profiles list|current|use
  setup build|check|smoke [--app APP|--all]
  ops doctor|smoke|audit|workspace-snapshot
  mcp serve [--allow-writes]

App namespaces:
  business finance projects today zone video network email gives
`;
}

function helpTopicText(topic: string | undefined): string {
	if (!topic) return helpText();
	if (topic === 'agent') {
		return `mere agent guide

Goal:
  Learn the command plane from live manifests, inspect safely first, then delegate product-owned work.

First-use sequence:
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
	throw new Error(`Unknown help topic: ${topic}. Try: mere help agent, mere help safety, or mere help mcp.`);
}

function markdownCell(value: unknown): string {
	return String(value ?? '')
		.replaceAll('|', '\\|')
		.replaceAll('\n', ' ')
		.trim();
}

function resolveOutputDir(paths: ReturnType<typeof resolveMerePaths>, env: NodeJS.ProcessEnv, output: string | undefined): string {
	if (!output?.trim()) return path.join(paths.configDir, 'agents', 'default');
	const home = env.HOME?.trim() || path.dirname(path.dirname(paths.configDir));
	if (output === '~') return home;
	if (output.startsWith('~/')) return path.join(home, output.slice(2));
	return path.resolve(output);
}

function appSelectorArgs(flags: Record<string, string | boolean | string[]>): string[] {
	const app = readStringFlag(flags, 'app');
	return app ? ['--app', app] : [];
}

async function captureRootJson(
	io: CliIO,
	argv: string[]
): Promise<{ code: number; stdout: string; stderr: string; value: unknown | null }> {
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

function buildMcpConfig(target: string, allowWrites: boolean): Record<string, unknown> {
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

function commandRowsFromManifest(manifestPayload: unknown): string {
	if (!isRecord(manifestPayload) || !Array.isArray(manifestPayload.apps)) {
		return 'No command manifest was available.\n';
	}
	const rows = [
		'| App | Command | Risk | Auth | JSON | Data | Guardrails | Summary |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |'
	];
	for (const app of manifestPayload.apps) {
		if (!isRecord(app)) continue;
		const appName = typeof app.namespace === 'string' ? app.namespace : typeof app.app === 'string' ? app.app : 'unknown';
		if (!Array.isArray(app.commands)) {
			rows.push(`| ${markdownCell(appName)} | _manifest unavailable_ |  |  |  |  |  | ${markdownCell(app.error)} |`);
			continue;
		}
		for (const command of app.commands) {
			if (!isRecord(command)) continue;
			const pathParts = Array.isArray(command.path) ? command.path.filter((part): part is string => typeof part === 'string') : [];
			const guardrails = [
				command.requiresYes === true ? '--yes' : '',
				command.requiresConfirm === true ? '--confirm' : ''
			].filter(Boolean);
			rows.push(
				[
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
					.replace(/$/, ' |')
			);
		}
	}
	return `${rows.join('\n')}\n`;
}

function buildAgentGuide(input: {
	generatedAt: string;
	target: string;
	workspace: string | null;
	allowWrites: boolean;
	files: Record<string, string>;
}): string {
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
3. Read \`workspace-snapshot.json\` for the safest cross-stack operational view.
4. Use \`command-reference.md\` to find command paths, risk levels, JSON/data support, and guardrails.

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

function selectedEntries(
	registry: RegistryEntry[],
	flags: Record<string, string | boolean | string[]>,
	options: { defaultAll?: boolean } = {}
): RegistryEntry[] {
	const app = readStringFlag(flags, 'app');
	if (app) {
		const entry = findEntry(registry, app);
		if (!entry) throw new Error(`Unknown app: ${app}`);
		return [entry];
	}
	if (readBooleanFlag(flags, 'all') || options.defaultAll) {
		return registry.filter((entry) => PRODUCT_APP_KEYS.includes(entry.key));
	}
	throw new Error('Choose --app APP or --all.');
}

function rootCommandPath(positionals: string[]): string[] {
	return positionals.slice(0, 3).filter(Boolean);
}

function envWithPnpm(env: NodeJS.ProcessEnv, pnpm: string): NodeJS.ProcessEnv {
	if (!pnpm.includes('/')) return env;
	const pnpmDir = path.dirname(pnpm);
	const currentPath = env.PATH ?? '';
	return {
		...env,
		PNPM_BIN: pnpm,
		PATH: currentPath ? `${pnpmDir}:${currentPath}` : pnpmDir
	};
}

function splitPassthroughFlags(
	flags: Record<string, string | boolean | string[]>,
	supported: Set<string>
): { leading: Record<string, string | boolean | string[]>; trailing: Record<string, string | boolean | string[]> } {
	const leadingNames = new Set(['base-url', 'workspace', 'profile', 'json']);
	const leading: Record<string, string | boolean | string[]> = {};
	const trailing: Record<string, string | boolean | string[]> = {};
	for (const [name, value] of Object.entries(flags)) {
		if (!supported.has(name)) continue;
		if (leadingNames.has(name)) leading[name] = value;
		else trailing[name] = value;
	}
	return { leading, trailing };
}

function shouldRetryWithLeadingGlobals(result: ProcessResult): boolean {
	if (result.code === 0) return false;
	const text = `${result.stderr}\n${result.stdout}`;
	return /Unknown option: --(?:base-url|workspace|profile|json)\b/.test(text);
}

function pickFlags(
	flags: Record<string, string | boolean | string[]>,
	names: string[]
): Record<string, string | boolean | string[]> {
	const output: Record<string, string | boolean | string[]> = {};
	for (const name of names) {
		const value = flags[name];
		if (value !== undefined) output[name] = value;
	}
	return output;
}

async function audited<T extends ProcessResult>(
	io: CliIO,
	kind: 'root' | 'delegate' | 'mcp',
	app: string | undefined,
	command: string[],
	argv: string[],
	cwd: string | undefined,
	run: () => Promise<T>
): Promise<T> {
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

export async function delegateToApp(
	io: CliIO,
	entry: RegistryEntry,
	appArgs: string[],
	passthroughFlags: Record<string, string | boolean | string[]>,
	options: { capture?: boolean } = {}
): Promise<ProcessResult> {
	const resolved = await resolveCli(entry, io.env);
	if (!resolved.exists) throw new Error(`${entry.label} CLI not found at ${resolved.displayPath}. Run \`mere setup build --app ${entry.key}\`.`);
	const manifestResult = await loadManifest(entry, io.env);
	if (!manifestResult.ok) throw new Error(`${entry.label} command manifest unavailable: ${manifestResult.error}`);
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
		if (result.stdout) io.stdout(result.stdout);
		if (result.stderr) io.stderr(result.stderr);
	}
	return result;
}

async function runSetup(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	if (!['build', 'check', 'smoke'].includes(action ?? '')) throw new Error('Usage: mere setup build|check|smoke [--app APP|--all]');
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const entries = selectedEntries(registry, flags);
	const pnpm = findPnpm(io.env);
	const setupEnv = envWithPnpm(io.env, pnpm);
	const results = [];
	for (const entry of entries) {
		const script = entry.packageScripts[action as 'build' | 'check' | 'smoke'];
		if (!script) {
			results.push({ app: entry.key, skipped: true, reason: `No ${action} script.` });
			continue;
		}
		const result = await audited(io, 'root', entry.key, ['setup', action as string], [pnpm, script], entry.repoDir, () =>
			runCapture(pnpm, [script], { cwd: entry.repoDir, env: setupEnv })
		);
		results.push({ app: entry.key, ok: result.code === 0, code: result.code, stderr: result.stderr.trim() });
		if (!readBooleanFlag(flags, 'json')) {
			io.stdout(`${entry.key}: ${result.code === 0 ? 'ok' : `failed (${result.code})`}\n`);
			if (result.stderr.trim()) io.stderr(`${result.stderr.trim()}\n`);
		}
	}
	if (readBooleanFlag(flags, 'json')) writeJson(io, { action, results });
	return results.every((result) => result.ok || result.skipped) ? 0 : 1;
}

type FinanceProfile = {
	baseUrl: string;
	token?: string;
};

type FinanceConfig = {
	currentProfile: string;
	profiles: Record<string, FinanceProfile>;
};

function financeConfigPath(env: NodeJS.ProcessEnv): string {
	const configured = env.FINANCE_CONFIG_PATH?.trim();
	if (configured) return path.resolve(configured);
	const home = env.HOME?.trim() || process.env.HOME || '';
	return path.resolve(home, '.config', 'merefi', 'config.json');
}

function defaultFinanceConfig(env: NodeJS.ProcessEnv): FinanceConfig {
	return {
		currentProfile: 'default',
		profiles: {
			default: {
				baseUrl: env.FINANCE_BASE_URL?.trim() || ''
			}
		}
	};
}

async function loadFinanceConfig(env: NodeJS.ProcessEnv): Promise<FinanceConfig> {
	try {
		const raw = await readFile(financeConfigPath(env), 'utf8');
		const parsed = JSON.parse(raw) as Partial<FinanceConfig>;
		const fallback = defaultFinanceConfig(env);
		const profiles: Record<string, FinanceProfile> = {};
		if (parsed.profiles && typeof parsed.profiles === 'object') {
			for (const [name, profile] of Object.entries(parsed.profiles)) {
				if (!profile || typeof profile !== 'object') continue;
				const candidate = profile as Partial<FinanceProfile>;
				if (typeof candidate.baseUrl !== 'string' || candidate.baseUrl.trim().length === 0) continue;
				profiles[name] = {
					baseUrl: candidate.baseUrl,
					...(typeof candidate.token === 'string' ? { token: candidate.token } : {})
				};
			}
		}
		if (!profiles.default) profiles.default = fallback.profiles.default;
		const currentProfile =
			typeof parsed.currentProfile === 'string' && profiles[parsed.currentProfile]
				? parsed.currentProfile
				: fallback.currentProfile;
		return { currentProfile, profiles };
	} catch {
		return defaultFinanceConfig(env);
	}
}

async function saveFinanceConfig(env: NodeJS.ProcessEnv, config: FinanceConfig): Promise<void> {
	const configPath = financeConfigPath(env);
	await mkdir(path.dirname(configPath), { recursive: true });
	await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function financeProfileRows(config: FinanceConfig): Array<{ name: string; current: boolean; baseUrl: string; hasToken: boolean }> {
	return Object.entries(config.profiles)
		.map(([name, profile]) => ({
			name,
			current: name === config.currentProfile,
			baseUrl: profile.baseUrl,
			hasToken: typeof profile.token === 'string' && profile.token.length > 0
		}))
		.sort((a, b) => (a.current === b.current ? a.name.localeCompare(b.name) : a.current ? -1 : 1));
}

function parseJsonMaybe(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

async function financeAuthStatus(
	io: CliIO,
	entry: RegistryEntry,
	flags: Record<string, string | boolean | string[]>
): Promise<{
	app: 'finance';
	auth: 'token';
	configPath: string;
	currentProfile: string;
	selectedProfile: { name: string; baseUrl: string; hasToken: boolean };
	profiles: Array<{ name: string; current: boolean; baseUrl: string; hasToken: boolean }>;
	whoami: { ok: boolean; code: number; stdout: unknown; stderr: string };
}> {
	const config = await loadFinanceConfig(io.env);
	const profileName = readStringFlag(flags, 'profile') ?? config.currentProfile;
	const profile = config.profiles[profileName] ?? config.profiles.default ?? defaultFinanceConfig(io.env).profiles.default;
	const result = await delegateToApp(
		io,
		entry,
		['auth', 'whoami'],
		{ json: true, ...(profileName ? { profile: profileName } : {}) },
		{ capture: true }
	).catch((error: unknown): ProcessResult => ({
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

async function runFinanceProfiles(
	io: CliIO,
	action: string | undefined,
	args: string[],
	flags: Record<string, string | boolean | string[]>
): Promise<number> {
	const config = await loadFinanceConfig(io.env);
	if (!action || action === 'list') {
		const profiles = financeProfileRows(config);
		if (readBooleanFlag(flags, 'json')) writeJson(io, { configPath: financeConfigPath(io.env), currentProfile: config.currentProfile, profiles });
		else io.stdout(profiles.map((profile) => `${profile.current ? '*' : ' '} ${profile.name}\t${profile.hasToken ? 'token' : 'no-token'}\t${profile.baseUrl}`).join('\n') + '\n');
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
		if (readBooleanFlag(flags, 'json')) writeJson(io, payload);
		else io.stdout(`${payload.name}\t${payload.hasToken ? 'token' : 'no-token'}\t${payload.baseUrl}\n`);
		return 0;
	}
	if (action === 'use') {
		const name = args[0]?.trim();
		if (!name) throw new Error('Usage: mere finance profiles use NAME [--base-url URL] [--json]');
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
		if (readBooleanFlag(flags, 'json')) writeJson(io, payload);
		else io.stdout(`finance profile: ${name}\n`);
		return 0;
	}
	throw new Error('Usage: mere finance profiles list|current|use');
}

async function runAuth(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	if (!['login', 'whoami', 'logout', 'status'].includes(action ?? '')) throw new Error('Usage: mere auth login|whoami|logout|status [--app APP|--all]');
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
				if (result.whoami.stderr) io.stderr(`${result.whoami.stderr}\n`);
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
		const result = await delegateToApp(
			io,
			entry,
			['auth', action === 'status' ? 'whoami' : (action as string)],
			pickFlags(flags, ['base-url', 'workspace', 'profile', 'json']),
			{ capture: true }
		);
		results.push({ app: entry.key, ok: result.code === 0, code: result.code, stdout: redactOutput(result.stdout.trim()), stderr: redactOutput(result.stderr.trim()) });
		if (!readBooleanFlag(flags, 'json')) {
			io.stdout(`${entry.key}: ${result.code === 0 ? 'ok' : `failed (${result.code})`}\n`);
			if (result.stdout.trim()) io.stdout(`${redactOutput(result.stdout.trim())}\n`);
			if (result.stderr.trim()) io.stderr(`${redactOutput(result.stderr.trim())}\n`);
		}
	}
	if (readBooleanFlag(flags, 'json')) writeJson(io, { action, results });
	return action === 'whoami' || action === 'status' ? 0 : results.every((result) => 'ok' in result && result.ok) ? 0 : 1;
}

async function runContext(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	if (!action || action === 'get') {
		writeJson(io, { paths, state: await loadState(paths) });
		return 0;
	}
	if (action === 'set-workspace') {
		const workspace = readStringFlag(flags, 'workspace');
		if (!workspace) throw new Error('Usage: mere context set-workspace --workspace ID');
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

async function runAgent(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	if (!action || action === 'help') {
		writeText(io, helpTopicText('agent'));
		return 0;
	}
	if (action !== 'bootstrap') throw new Error('Usage: mere agent bootstrap [--workspace ID] [--app APP] [--target codex] [--output DIR] [--json]');

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
	await writeFile(files['apps-manifest.json'], `${JSON.stringify(manifest.value, null, 2)}\n`, 'utf8');
	await writeFile(files['workspace-snapshot.json'], `${JSON.stringify(snapshot.value, null, 2)}\n`, 'utf8');
	await writeFile(files['mcp.json'], `${JSON.stringify(buildMcpConfig(target, allowWrites), null, 2)}\n`, 'utf8');
	await writeFile(files['command-reference.md'], `# Mere Command Reference\n\nGenerated: ${generatedAt}\n\n${commandRowsFromManifest(manifest.value)}`, 'utf8');
	await writeFile(files['AGENT.md'], buildAgentGuide({ generatedAt, target, workspace, allowWrites, files }), 'utf8');
	await writeFile(files['bootstrap.json'], `${JSON.stringify(bootstrap, null, 2)}\n`, 'utf8');

	if (readBooleanFlag(flags, 'json')) {
		writeJson(io, bootstrap);
	} else {
		io.stdout(`agent context: ${outputDir}\n`);
		io.stdout(`workspace: ${workspace ?? 'not selected'}\n`);
		io.stdout(`mcp: ${allowWrites ? 'mere mcp serve --allow-writes' : 'mere mcp serve'}\n`);
		for (const [name, check] of Object.entries(checks)) {
			io.stdout(`${name}: ${check.ok ? 'ok' : `needs attention (${check.code})`}\n`);
		}
	}
	return 0;
}

async function appList(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const rows = [];
	for (const entry of registry) {
		const resolved = await resolveCli(entry, io.env);
		rows.push({ app: entry.key, label: entry.label, auth: entry.authKind, cli: resolved.displayPath, source: resolved.source, exists: resolved.exists });
	}
	if (readBooleanFlag(flags, 'json')) writeJson(io, { apps: rows });
	else io.stdout(rows.map((row) => `${row.app}\t${row.auth}\t${row.source}\t${row.exists ? 'ready' : 'missing'}\t${row.cli}`).join('\n') + '\n');
	return 0;
}

async function appManifest(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
	const results = await loadManifests(entries, io.env);
	writeJson(io, manifestForJson(results));
	return results.every((result) => result.ok) ? 0 : 1;
}

async function appDoctor(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
	const results = [];
	for (const entry of entries) {
		const resolved = await resolveCli(entry, io.env);
		const manifest = await loadManifest(entry, io.env);
		results.push({ app: entry.key, cli: resolved.displayPath, source: resolved.source, cliExists: resolved.exists, manifestOk: manifest.ok, error: manifest.error });
	}
	if (readBooleanFlag(flags, 'json')) writeJson(io, { results });
	else io.stdout(results.map((result) => `${result.app}: ${result.cliExists && result.manifestOk ? 'ok' : 'needs attention'} [${result.source}]${result.error ? ` (${result.error})` : ''}`).join('\n') + '\n');
	return results.every((result) => result.cliExists && result.manifestOk) ? 0 : 1;
}

async function runApps(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	if (action === 'list' || !action) return appList(io, flags);
	if (action === 'manifest') return appManifest(io, flags);
	if (action === 'doctor') return appDoctor(io, flags);
	throw new Error('Usage: mere apps list|manifest|doctor');
}

async function opsDoctor(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
	const node = process.version;
	const pnpm = await runCapture(findPnpm(io.env), ['--version'], { env: io.env }).catch((error: unknown) => ({
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
	if (readBooleanFlag(flags, 'json')) writeJson(io, payload);
	else io.stdout(apps.map((app) => `${app.app}: ${app.cliExists && app.completionOk && app.manifestOk ? 'ok' : 'needs attention'} (${app.authStatus})`).join('\n') + '\n');
	return apps.every((app) => app.cliExists && app.completionOk && app.manifestOk) ? 0 : 1;
}

async function opsSmoke(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const nextFlags = { ...flags };
	if (!readStringFlag(flags, 'app')) nextFlags.all = true;
	return runSetup(io, 'smoke', nextFlags);
}

type ReadOnlyAuditCommand = {
	app: string;
	command: string[];
	ok: boolean;
	code: number | null;
	stdout: string;
	stderr: string;
	error?: string;
};

type ReadOnlyAuditApp = {
	app: string;
	namespace: string;
	ok: boolean;
	manifestOk: boolean;
	error?: string;
	commands: ReadOnlyAuditCommand[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonObjectOrArray(text: string): unknown | null {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function delegateJson(
	io: CliIO,
	entry: RegistryEntry,
	command: string[],
	flags: Record<string, string | boolean | string[]>
): Promise<unknown | null> {
	const result = await delegateToApp(io, entry, command, { json: true, ...flags }, { capture: true });
	if (result.code !== 0) return null;
	return parseJsonObjectOrArray(result.stdout.trim());
}

async function inferTodayTenant(
	io: CliIO,
	entry: RegistryEntry,
	workspace: string | undefined
): Promise<string | null> {
	if (!workspace) return null;
	const payload = await delegateJson(io, entry, ['tenant', 'resolve'], { workspace });
	if (!isRecord(payload)) return null;
	const raw = isRecord(payload.raw) ? payload.raw : null;
	if (typeof raw?.id === 'string') return raw.id;
	const tenant = isRecord(payload.tenant) ? payload.tenant : null;
	return typeof tenant?.id === 'string' ? tenant.id : null;
}

async function inferZoneStore(
	io: CliIO,
	entry: RegistryEntry,
	workspace: string | undefined
): Promise<string | null> {
	const payload = await delegateJson(io, entry, ['store', 'list'], workspace ? { workspace } : {});
	if (!isRecord(payload)) return null;
	const current = isRecord(payload.current) ? payload.current : null;
	if (typeof current?.storeId === 'string') return current.storeId;
	const stores = Array.isArray(payload.stores) ? payload.stores : [];
	const first = stores.find(isRecord);
	return typeof first?.storeId === 'string' ? first.storeId : null;
}

async function auditFlagsForCommand(
	io: CliIO,
	entry: RegistryEntry,
	command: string[],
	workspace: string | undefined
): Promise<Record<string, string | boolean | string[]>> {
	const flagsForCommand: Record<string, string | boolean | string[]> = { json: true };
	if (workspace) flagsForCommand.workspace = workspace;

	if (entry.key === 'today') {
		if (command[0] === 'tenant' && command[1] === 'resolve' && workspace) {
			flagsForCommand.workspace = workspace;
		}
		if (['booking', 'time-entry'].includes(command[0] ?? '') && command[1] === 'list') {
			const tenant = await inferTodayTenant(io, entry, workspace);
			if (tenant) flagsForCommand.tenant = tenant;
		}
	}

	if (entry.key === 'zone' && command[0] === 'stripe' && command[1] === 'status') {
		const store = await inferZoneStore(io, entry, workspace);
		if (store) flagsForCommand.store = store;
	}

	if (entry.key === 'gives' && ['tenant', 'campaigns', 'stripe'].includes(command[0] ?? '') && workspace) {
		flagsForCommand.tenant = workspace;
	}

	return flagsForCommand;
}

async function collectReadOnlyAuditDefaults(
	io: CliIO,
	flags: Record<string, string | boolean | string[]>,
	workspace: string | undefined
): Promise<{ generatedAt: string; workspace: string | null; apps: ReadOnlyAuditApp[]; audits: ReadOnlyAuditCommand[] }> {
	const paths = resolveMerePaths(io.env);
	const registry = createRegistry(paths.mereRoot, paths.packageRoot);
	const entries = readStringFlag(flags, 'app') ? selectedEntries(registry, flags) : registry;
	const apps: ReadOnlyAuditApp[] = [];
	const audits: ReadOnlyAuditCommand[] = [];
	for (const entry of entries) {
		const manifest = await loadManifest(entry, io.env);
		const app: ReadOnlyAuditApp = {
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
		const commands = manifest.manifest.commands.filter((command) => command.auditDefault && command.risk === 'read');
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
			} catch (error) {
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
			}
		}
		app.ok = app.commands.every((command) => command.ok);
		apps.push(app);
	}
	return { generatedAt: new Date().toISOString(), workspace: workspace ?? null, apps, audits };
}

async function opsAudit(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const payload = await collectReadOnlyAuditDefaults(io, flags, readStringFlag(flags, 'workspace'));
	writeJson(io, { generatedAt: payload.generatedAt, workspace: payload.workspace, audits: payload.audits });
	return payload.audits.every((audit) => audit.ok) ? 0 : 1;
}

async function opsWorkspaceSnapshot(io: CliIO, flags: Record<string, string | boolean | string[]>): Promise<number> {
	const paths = resolveMerePaths(io.env);
	const state = await loadState(paths);
	const workspace = readStringFlag(flags, 'workspace') ?? state.defaultWorkspace;
	if (!workspace) throw new Error('Usage: mere ops workspace-snapshot --workspace ID [--app APP] [--json]');
	const payload = await collectReadOnlyAuditDefaults(io, flags, workspace);
	writeJson(io, {
		generatedAt: payload.generatedAt,
		workspace,
		apps: payload.apps
	});
	return payload.apps.every((app) => app.ok) ? 0 : 1;
}

async function runOps(io: CliIO, action: string | undefined, flags: Record<string, string | boolean | string[]>): Promise<number> {
	if (action === 'doctor' || !action) return opsDoctor(io, flags);
	if (action === 'smoke') return opsSmoke(io, flags);
	if (action === 'audit') return opsAudit(io, flags);
	if (action === 'workspace-snapshot') return opsWorkspaceSnapshot(io, flags);
	throw new Error('Usage: mere ops doctor|smoke|audit|workspace-snapshot');
}

async function maybeReadVersion(): Promise<string> {
	try {
		const raw = await readFile(new URL('../package.json', import.meta.url), 'utf8');
		return (JSON.parse(raw) as { version?: string }).version ?? CLI_VERSION;
	} catch {
		return CLI_VERSION;
	}
}

export async function runCli(argv: string[], io: CliIO): Promise<number> {
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
			writeText(io, renderCompletion(rest[1], registry));
			return 0;
		}
		if (rest[0] === 'setup') return await runSetup(io, rest[1], parsed.flags);
		if (rest[0] === 'auth') return await runAuth(io, rest[1], parsed.flags);
		if (rest[0] === 'context') return await runContext(io, rest[1], parsed.flags);
		if (rest[0] === 'agent') return await runAgent(io, rest[1], parsed.flags);
		if (rest[0] === 'apps') return await runApps(io, rest[1], parsed.flags);
		if (rest[0] === 'ops') return await runOps(io, rest[1], parsed.flags);
		if (rest[0] === 'finance' && rest[1] === 'profiles') return await runFinanceProfiles(io, rest[2], rest.slice(3), parsed.flags);
		if (rest[0] === 'mcp' && rest[1] === 'serve') {
			await runMcpServer({ io, allowWrites: readBooleanFlag(parsed.flags, 'allow-writes') || io.env.MERE_MCP_ALLOW_WRITES === '1' });
			return 0;
		}

		const entry = findEntry(registry, rest[0]);
		if (!entry) throw new Error(`Unknown command or app: ${rest[0] ?? '(missing)'}`);
		const result = await delegateToApp(io, entry, rest.slice(1), passthroughFlags);
		return result.code;
	} catch (error) {
		io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
		return 1;
	}
}

export function commandPathForTest(positionals: string[]): string[] {
	return rootCommandPath(positionals);
}
