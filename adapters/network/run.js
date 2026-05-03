#!/usr/bin/env node

// cli/mere-network.ts
import { readFile as readFile2 } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.53.4_@sveltejs+vite-p_4f1e0b08fdcce373366f22b39b7c03c8/node_modules/@mere/cli-auth/src/session.ts
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
function stateHome(env) {
  const homeDir = env.HOME?.trim() || os.homedir();
  return env.XDG_STATE_HOME?.trim() || path.join(homeDir, ".local", "state");
}
function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function resolveCliPaths(appName, env = process.env) {
  const stateDir = path.join(stateHome(env), appName);
  return {
    stateDir,
    sessionFile: path.join(stateDir, "session.json")
  };
}
async function loadCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    try {
      const raw = await readFile(paths.sessionFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) {
        return parsed;
      }
      return null;
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }
  return null;
}
async function saveCliSession(input) {
  const paths = resolveCliPaths(input.appName, input.env ?? process.env);
  await mkdir(paths.stateDir, { recursive: true });
  await writeFile(paths.sessionFile, `${JSON.stringify(input.session, null, 2)}
`, "utf8");
  await chmod(paths.sessionFile, 384).catch(() => void 0);
}
async function clearCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    await rm(paths.sessionFile, { force: true });
  }
}
function resolveWorkspaceSelection(workspaces, selector) {
  const normalized = selector?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return workspaces.find(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  ) ?? null;
}
function requireWorkspaceSelection(workspaces, selector) {
  const workspace = resolveWorkspaceSelection(workspaces, selector);
  if (!workspace) {
    throw new Error(`Workspace ${selector ?? "(missing)"} is not available in this session.`);
  }
  return workspace;
}
function sessionNeedsRefresh(session, targetWorkspaceId, now = Date.now()) {
  const currentWorkspaceId = session.workspace?.id ?? null;
  if ((targetWorkspaceId ?? null) !== currentWorkspaceId) {
    return true;
  }
  const expiresAtMs = session.accessTokenClaims.exp * 1e3 || Date.parse(session.expiresAt);
  return !Number.isFinite(expiresAtMs) || expiresAtMs - now <= 6e4;
}
function createLocalSession(payload, options) {
  return {
    ...payload,
    version: 1,
    baseUrl: normalizeBaseUrl(options.baseUrl),
    defaultWorkspaceId: options.defaultWorkspaceId ?? payload.defaultWorkspaceId,
    lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mergeSessionPayload(current, payload, options = {}) {
  const nextDefaultWorkspaceId = options.persistDefaultWorkspace ? payload.workspace?.id ?? payload.defaultWorkspaceId : current.defaultWorkspaceId ?? payload.defaultWorkspaceId;
  return {
    ...current,
    ...payload,
    baseUrl: normalizeBaseUrl(options.baseUrl ?? current.baseUrl),
    defaultWorkspaceId: nextDefaultWorkspaceId ?? null,
    lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.53.4_@sveltejs+vite-p_4f1e0b08fdcce373366f22b39b7c03c8/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.53.4_@sveltejs+vite-p_4f1e0b08fdcce373366f22b39b7c03c8/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.53.4_@sveltejs+vite-p_4f1e0b08fdcce373366f22b39b7c03c8/node_modules/@mere/cli-auth/src/client.ts
function maybeOpenBrowser(url) {
  try {
    if (process.platform === "darwin") {
      const child2 = spawn("open", [url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    if (process.platform === "win32") {
      const child2 = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
async function parseJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message = payload && typeof payload === "object" ? payload.error ?? payload.message ?? `Request failed (${response.status}).` : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}
async function fetchJson(fetchImpl, input) {
  return parseJson(await fetchImpl(input));
}
async function postJson(fetchImpl, input, body) {
  return parseJson(
    await fetchImpl(input, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}
async function waitForCallback(input) {
  return new Promise((resolve, reject) => {
    const server = createServer((request2, response) => {
      const requestUrl = new URL(request2.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname !== "/callback") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      const requestId = requestUrl.searchParams.get(CLI_AUTH_REQUEST_QUERY_PARAM)?.trim();
      const code = requestUrl.searchParams.get(CLI_AUTH_CODE_QUERY_PARAM)?.trim();
      if (!requestId || !code) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("Missing request or code.");
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><html><body><h1>${input.productLabel} login complete.</h1><p>You can close this window.</p></body></html>`
      );
      void (async () => {
        clearTimeout(timeout);
        server.close();
        try {
          const exchangeUrl = new URL(CLI_AUTH_EXCHANGE_PATH, input.baseUrl);
          resolve(await postJson(input.fetchImpl, exchangeUrl, { requestId, code }));
        } catch (error) {
          reject(error);
        }
      })();
    });
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.listen(0, "127.0.0.1", () => {
      void (async () => {
        try {
          const address = server.address();
          if (!address) {
            throw new Error("Local login callback server could not bind to a port.");
          }
          const callbackUrl = new URL(`http://127.0.0.1:${address.port}/callback`);
          const startUrl = new URL(CLI_AUTH_START_PATH, input.baseUrl);
          startUrl.searchParams.set(CLI_AUTH_CALLBACK_URL_QUERY_PARAM, callbackUrl.toString());
          if (input.workspace?.trim()) {
            startUrl.searchParams.set("workspace", input.workspace.trim());
          }
          const started = await fetchJson(input.fetchImpl, startUrl);
          const opened = maybeOpenBrowser(started.authorizeUrl);
          input.notify(
            opened ? `Opened your browser to complete ${input.productLabel} login.` : `Open this URL to complete ${input.productLabel} login:`
          );
          input.notify(started.authorizeUrl);
        } catch (error) {
          clearTimeout(timeout);
          server.close();
          reject(error);
        }
      })();
    });
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the browser login callback."));
    }, 12e4);
  });
}
async function loginWithBrowser(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const payload = await waitForCallback({
    baseUrl,
    fetchImpl: input.fetchImpl ?? fetch,
    notify: input.notify,
    workspace: input.workspace,
    productLabel: input.productLabel
  });
  return createLocalSession(payload, {
    baseUrl,
    defaultWorkspaceId: payload.workspace?.id ?? payload.defaultWorkspaceId
  });
}
async function refreshRemoteSession(input) {
  const refreshUrl = new URL(CLI_AUTH_REFRESH_PATH, normalizeBaseUrl(input.baseUrl));
  return postJson(input.fetchImpl ?? fetch, refreshUrl, {
    refreshToken: input.refreshToken,
    workspace: input.workspace ?? null
  });
}
async function logoutRemoteSession(input) {
  const logoutUrl = new URL(CLI_AUTH_LOGOUT_PATH, normalizeBaseUrl(input.baseUrl));
  await postJson(input.fetchImpl ?? fetch, logoutUrl, {
    refreshToken: input.refreshToken
  });
}

// cli/session.ts
var APP_NAME = "mere-network";
async function loadSession(env = process.env) {
  return loadCliSession({ appName: APP_NAME, env });
}
async function saveSession(session, env = process.env) {
  await saveCliSession({ appName: APP_NAME, session, env });
}
async function clearSession(env = process.env) {
  await clearCliSession({ appName: APP_NAME, env });
}

// cli/auth.ts
async function loginWithBrowser2(input) {
  const session = await loginWithBrowser({
    baseUrl: input.baseUrl,
    workspace: input.workspace,
    fetchImpl: input.fetchImpl,
    notify: input.notify,
    productLabel: "mere-network"
  });
  await saveSession(session, input.env);
  return session;
}
async function ensureActiveSession(session, input = {}) {
  const targetWorkspace = input.workspace?.trim() ? requireWorkspaceSelection(session.workspaces, input.workspace) : session.defaultWorkspaceId ? requireWorkspaceSelection(session.workspaces, session.defaultWorkspaceId) : session.workspace;
  const workspace = targetWorkspace?.id ?? null;
  if (!sessionNeedsRefresh(session, workspace)) {
    return session;
  }
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace,
    fetchImpl: input.fetchImpl
  });
  return mergeSessionPayload(session, payload, {
    persistDefaultWorkspace: input.persistDefaultWorkspace
  });
}
async function logoutRemote(input = {}) {
  const session = await loadSession(input.env);
  if (!session) {
    return false;
  }
  await logoutRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    fetchImpl: input.fetchImpl
  }).catch(() => void 0);
  await clearSession(input.env);
  return true;
}

// cli/mere-network.ts
var DEFAULT_BASE_URL = "https://admin.mere.network";
var activeSession = null;
var HELP_TEXT = `mere-network CLI

Usage:
  mere-network [global flags] <group> <command> [args]

Global flags:
  --base-url URL       Override MERE_NETWORK_BASE_URL
  --workspace ID       Override MERE_NETWORK_WORKSPACE_ID
  --token TOKEN        Override MERE_NETWORK_TOKEN
  --json               Write machine-readable JSON
  --version            Show the CLI version
  --no-interactive     Reserved for non-interactive automation
  --yes                Required for destructive automation
  --confirm ID         Exact target required with --yes for destructive commands
  --help               Show this help
  completion [bash|zsh|fish]

Auth:
  auth login
  auth whoami
  auth logout

Workspace:
  workspace list
  workspace current
  workspace use <id|slug|host>

Customers:
  customers list
  customers create --json-file payload.json
  customers update <customer-id> --json-file payload.json
  customers archive <customer-id>
  customers redeploy <customer-id>
  customers redeploy-all [--scope all|active|outdated]

Deployments:
  deployments run --customer <customer-id>

Workspace groups:
  calls list|show|sync|archive|close|analysis|export|audio
  interactions list|show|sync|close|read
  sms list|show|sync|close|read
  conversations list|show|close|read
  recordings audio <call-id>
  transcripts turns|export <call-id>
  diagnostics metrics|delivery-log|provider-sync
  locations list|create|update|delete
  locations pool list|add|update|remove <location-id>
  scripts list|create|show|update|delete
  scripts stages list|create|update|reorder|delete <script-id>
  numbers list|search|show|create|update|delete|pause|resume|route
  routing default-location|number
  provider-accounts list|create|update|delete|sync

Phased scripts:
  Scripts are made of ordered stages (script_stages). Each stage has a name, goal,
  prompt_direction, and optional max_turns. The conversation engine progresses
  through stages using [ADVANCE_STAGE]/[CONVERSATION_COMPLETE] markers.
  - scripts show <id>            \u2192 returns the script with its stages bundled
  - scripts stages list <id>     \u2192 just the stages
  - scripts stages create <id>   \u2192 --data '{"name":"Open","goal":"...","prompt_direction":"...","max_turns":1}'
  - scripts stages update <id>   \u2192 --data '{"id":"<stage-id>","name":"...","max_turns":2}'
  - scripts stages reorder <id>  \u2192 --data '{"stage_ids":["stg_a","stg_b","stg_c"]}'
  - scripts stages delete <id>   \u2192 --data '{"id":"<stage-id>"}' --yes --confirm <stage-id>

Script pool:
  Locations can rotate through weighted active scripts on new calls.
  - locations pool list <id>     \u2192 list scripts in the location pool
  - locations pool add <id>      \u2192 --data '{"script_id":"script_1","weight":1,"active":1}'
  - locations pool update <id>   \u2192 --data '{"script_id":"script_1","weight":3}'
  - locations pool remove <id>   \u2192 --data '{"script_id":"script_1"}' --yes --confirm script_1

Mutation commands accept either:
  --json-file payload.json
  --json-input '{"key":"value"}'
  --data '{"key":"value"}'
  --data-file payload.json

List/search/sync commands may add repeated query parameters via:
  --query key=value
`;
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  workspace: "string",
  token: "string",
  json: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string",
  help: "boolean",
  version: "boolean"
};
var COMPLETION_WORDS = [
  "auth",
  "calls",
  "completion",
  "conversations",
  "customers",
  "deployments",
  "diagnostics",
  "interactions",
  "locations",
  "numbers",
  "provider-accounts",
  "recordings",
  "routing",
  "scripts",
  "sms",
  "transcripts",
  "workspace"
];
var JSON_INPUT_FLAG_SPEC = {
  "json-file": "string",
  "json-input": "string",
  data: "string",
  "data-file": "string"
};
function manifestCommand(path2, summary, options = {}) {
  return {
    id: path2.join("."),
    path: path2,
    summary,
    auth: options.auth ?? "workspace",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: [],
    flags: [],
    ...options.auditDefault ? { auditDefault: true } : {}
  };
}
function commandManifest() {
  return {
    schemaVersion: 1,
    app: "mere-network",
    namespace: "network",
    aliases: ["mere-network", "voxbooth"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_NETWORK_BASE_URL"],
    sessionPath: "~/.local/state/mere-network/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["customers", "list"], "List customers.", { auditDefault: true }),
      manifestCommand(["customers", "create"], "Create customer.", { risk: "write", supportsData: true }),
      manifestCommand(["customers", "update"], "Update customer.", { risk: "write", supportsData: true }),
      manifestCommand(["customers", "archive"], "Archive customer.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["customers", "redeploy"], "Redeploy customer.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["customers", "redeploy-all"], "Redeploy customers.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["deployments", "run"], "Run deployment.", { risk: "external", requiresYes: true }),
      ...["calls", "interactions", "sms", "conversations"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource}.`, { auditDefault: resource === "calls" }),
        manifestCommand([resource, "show"], `Show ${resource}.`),
        manifestCommand([resource, "close"], `Close ${resource}.`, { risk: "write" }),
        manifestCommand([resource, "archive"], `Archive ${resource}.`, { risk: "destructive", requiresYes: true, requiresConfirm: true })
      ]),
      manifestCommand(["recordings", "audio"], "Download call audio."),
      manifestCommand(["transcripts", "turns"], "List transcript turns."),
      manifestCommand(["transcripts", "export"], "Export transcript."),
      manifestCommand(["diagnostics", "metrics"], "Show diagnostics metrics.", { auditDefault: true }),
      manifestCommand(["diagnostics", "delivery-log"], "Show delivery log."),
      manifestCommand(["diagnostics", "provider-sync"], "Show provider sync diagnostics."),
      ...["locations", "scripts", "numbers", "provider-accounts"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource}.`),
        manifestCommand([resource, "show"], resource === "scripts" ? "Show script with its stages." : `Show ${resource}.`),
        manifestCommand(
          [resource, "create"],
          resource === "scripts" ? "Create script. Add phases with `scripts stages create <script-id>`." : `Create ${resource}.`,
          { risk: "write", supportsData: true }
        ),
        manifestCommand([resource, "update"], `Update ${resource}.`, { risk: "write", supportsData: true }),
        manifestCommand([resource, "delete"], `Delete ${resource}.`, { risk: "destructive", requiresYes: true, requiresConfirm: true })
      ]),
      manifestCommand(["locations", "pool", "list"], "List scripts in a location pool."),
      manifestCommand(["locations", "pool", "add"], "Add or update a script in a location pool.", { risk: "write", supportsData: true }),
      manifestCommand(["locations", "pool", "update"], "Update a script pool entry.", { risk: "write", supportsData: true }),
      manifestCommand(["locations", "pool", "remove"], "Remove a script from a location pool.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        supportsData: true
      }),
      manifestCommand(["scripts", "stages", "list"], "List stages for a script."),
      manifestCommand(["scripts", "stages", "create"], "Add a stage to a script.", { risk: "write", supportsData: true }),
      manifestCommand(["scripts", "stages", "update"], "Update a stage on a script.", { risk: "write", supportsData: true }),
      manifestCommand(["scripts", "stages", "reorder"], "Reorder stages on a script.", { risk: "write", supportsData: true }),
      manifestCommand(["scripts", "stages", "delete"], "Delete a stage from a script.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        supportsData: true
      }),
      manifestCommand(["numbers", "pause"], "Pause number.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["numbers", "resume"], "Resume number.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["numbers", "route"], "Route number.", { risk: "external", supportsData: true, requiresYes: true, requiresConfirm: true }),
      manifestCommand(["routing", "default-location"], "Set default location.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["routing", "number"], "Set number route.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
var GUARD_FLAG_SPEC = {
  yes: "boolean",
  confirm: "string"
};
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean(value) {
  return value === true;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function parseFlags(args, spec) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const kind = spec[rawName];
    if (!kind) {
      throw new Error(`Unknown option: --${rawName}`);
    }
    if (kind === "boolean") {
      options[rawName] = inlineValue == null ? true : inlineValue === "true";
      continue;
    }
    const value = inlineValue ?? (() => {
      const next = args[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for --${rawName}.`);
      }
      index += 1;
      return next;
    })();
    if (kind === "string[]") {
      const existing = Array.isArray(options[rawName]) ? options[rawName] : [];
      options[rawName] = [...existing, value];
      continue;
    }
    options[rawName] = value;
  }
  return { options, positionals };
}
function splitGlobalFlags(argv) {
  const globalTokens = [];
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      break;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const kind = GLOBAL_FLAG_SPEC[rawName];
    if (!kind) {
      break;
    }
    globalTokens.push(token);
    if (kind !== "boolean" && inlineValue == null) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for --${rawName}.`);
      }
      globalTokens.push(next);
      index += 1;
    }
    index += 1;
  }
  return {
    options: parseFlags(globalTokens, GLOBAL_FLAG_SPEC).options,
    rest: argv.slice(index)
  };
}
function resolveWorkspaceOptional(options, env) {
  return trimOption(asString(options.workspace)) ?? trimOption(env.MERE_NETWORK_WORKSPACE_ID) ?? activeSession?.defaultWorkspaceId ?? activeSession?.workspace?.id ?? void 0;
}
function requireWorkspace(options, env) {
  const workspace = resolveWorkspaceOptional(options, env);
  if (!workspace) {
    throw new Error("Missing workspace ID. Set MERE_NETWORK_WORKSPACE_ID or pass --workspace.");
  }
  return workspace;
}
function resolveBaseUrl(options, env) {
  return trimOption(asString(options["base-url"])) ?? trimOption(env.MERE_NETWORK_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveToken(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_NETWORK_TOKEN) ?? activeSession?.accessToken;
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeText(io, value) {
  io.stdout(`${value}
`);
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-network bash completion",
      "_mere_network_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_network_completion mere-network",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-network",
      "_mere_network() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_network "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-network -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new Error("Unknown shell. Expected bash, zsh, or fish.");
}
function renderSessionSummary(session) {
  const selectedWorkspace = session.workspace ?? session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null;
  return [
    `user: ${session.user.displayName || session.user.primaryEmail}`,
    `email: ${session.user.primaryEmail}`,
    selectedWorkspace ? `selected workspace: ${renderWorkspaceLabel(selectedWorkspace)}` : "selected workspace: none",
    `available workspaces: ${session.workspaces.length}`,
    `base url: ${session.baseUrl}`,
    `expires: ${session.expiresAt}`
  ].join("\n");
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text();
}
async function request(io, globalOptions, input) {
  const baseUrl = resolveBaseUrl(globalOptions, io.env);
  const token = resolveToken(globalOptions, io.env);
  if (!token) {
    throw new Error("This command requires `mere-network auth login` or MERE_NETWORK_TOKEN.");
  }
  const url = new URL(input.path, baseUrl);
  for (const [key, value] of (input.query ?? new URLSearchParams()).entries()) {
    url.searchParams.append(key, value);
  }
  const headers = new Headers({ accept: "application/json", authorization: `Bearer ${token}` });
  let body;
  if (input.body !== void 0) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(input.body);
  }
  const response = await (io.fetchImpl ?? fetch)(url, {
    method: input.method ?? "GET",
    headers,
    ...body ? { body } : {}
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}
function requireSinglePositional(positionals, label) {
  if (positionals.length !== 1) {
    throw new Error(`Expected ${label}.`);
  }
  return positionals[0];
}
async function readJsonInput(options) {
  const inline = trimOption(asString(options["json-input"])) ?? trimOption(asString(options.data));
  if (inline) {
    return JSON.parse(inline);
  }
  const file = trimOption(asString(options["json-file"])) ?? trimOption(asString(options["data-file"]));
  if (!file) {
    throw new Error("Provide --json-file, --json-input, --data-file, or --data.");
  }
  const raw = await readFile2(resolvePath(file), "utf8");
  return JSON.parse(raw);
}
function requireDestructiveConfirmation(globalOptions, options, label, target) {
  if (!asBoolean(options.yes) && !asBoolean(globalOptions.yes)) {
    throw new Error(`Refusing to ${label} ${target} without --yes.`);
  }
  const confirm = trimOption(asString(options.confirm)) ?? trimOption(asString(globalOptions.confirm));
  if (confirm !== target) {
    throw new Error(`Refusing to ${label} ${target} without --confirm ${target}.`);
  }
}
function queryFromOptions(options) {
  const params = new URLSearchParams();
  for (const entry of asStringArray(options.query)) {
    const [key, value] = entry.split("=", 2);
    if (!key || value == null) {
      throw new Error(`Invalid --query entry: ${entry}`);
    }
    params.append(key, value);
  }
  return params;
}
function workspaceBasePath(workspaceId) {
  return `/api/internal/zerosmb/workspaces/${encodeURIComponent(workspaceId)}`;
}
async function handleAuth(io, globalOptions, action) {
  switch (action) {
    case "login": {
      const session = await loginWithBrowser2({
        baseUrl: resolveBaseUrl(globalOptions, io.env),
        workspace: resolveWorkspaceOptional(globalOptions, io.env),
        fetchImpl: io.fetchImpl,
        notify: (message) => io.stderr(`${message}
`),
        env: io.env
      });
      await saveSession(session, io.env);
      activeSession = session;
      return session;
    }
    case "whoami": {
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new Error("No local session found. Run `mere-network auth login` first.");
      }
      activeSession = session;
      return session;
    }
    case "logout": {
      const loggedOut = await logoutRemote({
        fetchImpl: io.fetchImpl,
        env: io.env
      });
      activeSession = null;
      return { loggedOut };
    }
    default:
      throw new Error("Unknown auth command. Expected login, whoami, or logout.");
  }
}
async function handleWorkspace(io, globalOptions, action, args) {
  const { positionals } = parseFlags(args, {});
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new Error("No local session found. Run `mere-network auth login` first.");
  }
  switch (action) {
    case "list":
      if (positionals.length > 0) {
        throw new Error("workspace list does not accept positional arguments.");
      }
      return asBoolean(globalOptions.json) ? session.workspaces : session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available.";
    case "current": {
      if (positionals.length > 0) {
        throw new Error("workspace current does not accept positional arguments.");
      }
      const result = {
        current: session.workspace,
        defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
      };
      return asBoolean(globalOptions.json) ? result : [
        `current: ${result.current ? renderWorkspaceLabel(result.current) : "none"}`,
        `default: ${result.defaultWorkspace ? renderWorkspaceLabel(result.defaultWorkspace) : "none"}`
      ].join("\n");
    }
    case "use": {
      if (positionals.length !== 1) {
        throw new Error("workspace use requires exactly one <id|slug|host>.");
      }
      const target = requireWorkspaceSelection(session.workspaces, positionals[0]);
      const nextSession = await ensureActiveSession(session, {
        workspace: target.id,
        fetchImpl: io.fetchImpl,
        persistDefaultWorkspace: true
      });
      activeSession = nextSession;
      await saveSession(nextSession, io.env);
      return asBoolean(globalOptions.json) ? nextSession : renderSessionSummary(nextSession);
    }
    default:
      throw new Error("Unknown workspace command. Expected list, current, or use.");
  }
}
async function handleCustomers(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    ...JSON_INPUT_FLAG_SPEC,
    ...GUARD_FLAG_SPEC,
    scope: "string"
  });
  switch (action) {
    case "list":
      return request(io, globalOptions, { path: "/api/customers" });
    case "create":
      return request(io, globalOptions, {
        method: "POST",
        path: "/api/customers",
        body: await readJsonInput(options)
      });
    case "update":
      return request(io, globalOptions, {
        method: "PATCH",
        path: `/api/customers/${encodeURIComponent(requireSinglePositional(positionals, "<customer-id>"))}`,
        body: await readJsonInput(options)
      });
    case "archive":
      requireDestructiveConfirmation(globalOptions, options, "archive customer", requireSinglePositional(positionals, "<customer-id>"));
      return request(io, globalOptions, {
        method: "DELETE",
        path: `/api/customers/${encodeURIComponent(requireSinglePositional(positionals, "<customer-id>"))}`
      });
    case "redeploy":
      requireDestructiveConfirmation(globalOptions, options, "redeploy customer", requireSinglePositional(positionals, "<customer-id>"));
      return request(io, globalOptions, {
        method: "POST",
        path: `/api/customers/${encodeURIComponent(requireSinglePositional(positionals, "<customer-id>"))}/redeploy`
      });
    case "redeploy-all":
      requireDestructiveConfirmation(globalOptions, options, "redeploy customers", "redeploy-all");
      return request(io, globalOptions, {
        method: "POST",
        path: "/api/customers/redeploy",
        body: {
          scope: trimOption(asString(options.scope)) ?? "all"
        }
      });
    default:
      throw new Error("Unknown customers command.");
  }
}
async function handleDeployments(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    customer: "string"
  });
  if (action !== "run") {
    throw new Error("Unknown deployments command.");
  }
  if (positionals.length > 0) {
    throw new Error("deployments run does not accept positional arguments.");
  }
  const customerId = trimOption(asString(options.customer));
  if (!customerId) {
    throw new Error("Provide --customer.");
  }
  return request(io, globalOptions, {
    method: "POST",
    path: "/api/internal/deployments/run",
    body: { customerId }
  });
}
async function handleWorkspaceRequest(io, globalOptions, input) {
  const { options, positionals } = parseFlags(input.args, {
    ...JSON_INPUT_FLAG_SPEC,
    ...GUARD_FLAG_SPEC,
    query: "string[]"
  });
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const basePath = workspaceBasePath(workspaceId);
  const groupPath = {
    calls: "calls",
    interactions: "interactions",
    locations: "locations",
    scripts: "scripts",
    numbers: "numbers",
    "provider-accounts": "provider-accounts"
  };
  const resourcePath = `${basePath}/${groupPath[input.group]}`;
  const queries = queryFromOptions(options);
  switch (input.group) {
    case "calls":
      switch (input.action) {
        case "list":
          return request(io, globalOptions, { path: resourcePath, query: queries });
        case "show":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<call-id>"))}` });
        case "sync":
          return request(io, globalOptions, { path: `${resourcePath}/sync`, query: queries });
        case "archive":
          requireDestructiveConfirmation(globalOptions, options, "archive calls", "calls");
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/archive`, body: await readJsonInput(options) });
        case "close":
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<call-id>"))}/close` });
        case "analysis":
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<call-id>"))}/analysis`, body: await readJsonInput(options) });
        case "export":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<call-id>"))}/export` });
        case "audio":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<call-id>"))}/audio` });
        default:
          throw new Error("Unknown calls command.");
      }
    case "interactions":
      switch (input.action) {
        case "list":
          return request(io, globalOptions, { path: resourcePath, query: queries });
        case "show":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}` });
        case "sync":
          return request(io, globalOptions, { path: `${resourcePath}/sync`, query: queries });
        case "close":
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/close` });
        case "read":
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/read` });
        default:
          throw new Error("Unknown interactions command.");
      }
    case "locations":
    case "scripts":
    case "provider-accounts":
      if (input.group === "locations" && input.action === "pool") {
        const subAction = positionals.shift();
        const locationId = requireSinglePositional(positionals, "<location-id>");
        const poolPath = `${resourcePath}/${encodeURIComponent(locationId)}/pool`;
        switch (subAction) {
          case "list":
            return request(io, globalOptions, { path: poolPath });
          case "add":
            return request(io, globalOptions, { method: "POST", path: poolPath, body: await readJsonInput(options) });
          case "update": {
            const body = await readJsonInput(options);
            if (!body || typeof body !== "object" || Array.isArray(body) || !("script_id" in body)) {
              throw new Error("locations pool update requires --data with script_id.");
            }
            const { script_id: scriptId, ...patchBody } = body;
            const normalizedScriptId = String(scriptId ?? "").trim();
            if (!normalizedScriptId) {
              throw new Error("locations pool update requires a non-empty script_id.");
            }
            return request(io, globalOptions, {
              method: "PATCH",
              path: `${poolPath}/${encodeURIComponent(normalizedScriptId)}`,
              body: patchBody
            });
          }
          case "remove": {
            const body = await readJsonInput(options);
            if (!body || typeof body !== "object" || Array.isArray(body) || !("script_id" in body)) {
              throw new Error("locations pool remove requires --data with script_id.");
            }
            const scriptId = String(body.script_id ?? "").trim();
            if (!scriptId) {
              throw new Error("locations pool remove requires a non-empty script_id.");
            }
            requireDestructiveConfirmation(globalOptions, options, "remove script from location pool", scriptId);
            return request(io, globalOptions, {
              method: "DELETE",
              path: `${poolPath}/${encodeURIComponent(scriptId)}`
            });
          }
          default:
            throw new Error("Unknown locations pool command. Expected list, add, update, or remove.");
        }
      }
      if (input.group === "scripts" && input.action === "stages") {
        const subAction = positionals.shift();
        const scriptId = requireSinglePositional(positionals, "<script-id>");
        const stagesPath = `${resourcePath}/${encodeURIComponent(scriptId)}/stages`;
        switch (subAction) {
          case "list":
            return request(io, globalOptions, { path: stagesPath });
          case "create":
            return request(io, globalOptions, { method: "POST", path: stagesPath, body: await readJsonInput(options) });
          case "update":
            return request(io, globalOptions, { method: "PATCH", path: stagesPath, body: await readJsonInput(options) });
          case "reorder": {
            const body = await readJsonInput(options);
            const merged = body && typeof body === "object" && !Array.isArray(body) ? { ...body, script_id: scriptId } : { script_id: scriptId };
            return request(io, globalOptions, { method: "PATCH", path: stagesPath, body: merged });
          }
          case "delete": {
            const body = await readJsonInput(options);
            const stageId = body && typeof body === "object" && "id" in body ? String(body.id ?? "") : "";
            requireDestructiveConfirmation(
              globalOptions,
              options,
              "delete script stage",
              stageId || scriptId
            );
            return request(io, globalOptions, { method: "DELETE", path: stagesPath, body });
          }
          default:
            throw new Error("Unknown scripts stages command. Expected list, create, update, reorder, or delete.");
        }
      }
      switch (input.action) {
        case "list":
          return request(io, globalOptions, { path: resourcePath });
        case "create":
          return request(io, globalOptions, { method: "POST", path: resourcePath, body: await readJsonInput(options) });
        case "show":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<id>"))}` });
        case "update":
          return request(io, globalOptions, { method: "PATCH", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<id>"))}`, body: await readJsonInput(options) });
        case "delete":
          requireDestructiveConfirmation(globalOptions, options, `delete ${input.group}`, requireSinglePositional(positionals, "<id>"));
          return request(io, globalOptions, { method: "DELETE", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<id>"))}` });
        case "sync":
          if (input.group !== "provider-accounts") {
            throw new Error(`Unknown ${input.group} command.`);
          }
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<id>"))}/sync` });
        default:
          throw new Error(`Unknown ${input.group} command.`);
      }
    case "numbers":
      switch (input.action) {
        case "list":
          return request(io, globalOptions, { path: resourcePath });
        case "search":
          return request(io, globalOptions, { path: `${resourcePath}/search`, query: queries });
        case "show":
          return request(io, globalOptions, { path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}` });
        case "create":
          return request(io, globalOptions, { method: "POST", path: resourcePath, body: await readJsonInput(options) });
        case "update":
          return request(io, globalOptions, { method: "PATCH", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}`, body: await readJsonInput(options) });
        case "delete":
          requireDestructiveConfirmation(globalOptions, options, "delete number", requireSinglePositional(positionals, "<number-id>"));
          return request(io, globalOptions, { method: "DELETE", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}` });
        case "pause":
          requireDestructiveConfirmation(globalOptions, options, "pause number", requireSinglePositional(positionals, "<number-id>"));
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}/pause` });
        case "resume":
          requireDestructiveConfirmation(globalOptions, options, "resume number", requireSinglePositional(positionals, "<number-id>"));
          return request(io, globalOptions, { method: "POST", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}/resume` });
        case "route":
          requireDestructiveConfirmation(globalOptions, options, "route number", requireSinglePositional(positionals, "<number-id>"));
          return request(io, globalOptions, { method: "PATCH", path: `${resourcePath}/${encodeURIComponent(requireSinglePositional(positionals, "<number-id>"))}/route`, body: await readJsonInput(options) });
        default:
          throw new Error("Unknown numbers command.");
      }
    default:
      throw new Error("Unknown workspace group.");
  }
}
async function handleRouting(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    ...JSON_INPUT_FLAG_SPEC,
    ...GUARD_FLAG_SPEC
  });
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const basePath = workspaceBasePath(workspaceId);
  switch (action) {
    case "default-location": {
      const locationId = positionals[0];
      requireDestructiveConfirmation(globalOptions, options, "change default location", locationId ?? "default-location");
      const body = locationId ? { locationId } : await readJsonInput(options);
      return request(io, globalOptions, {
        method: "PATCH",
        path: `${basePath}/default-location`,
        body
      });
    }
    case "number": {
      const numberId = requireSinglePositional(positionals, "<number-id>");
      requireDestructiveConfirmation(globalOptions, options, "route number", numberId);
      return request(io, globalOptions, {
        method: "PATCH",
        path: `${basePath}/numbers/${encodeURIComponent(numberId)}/route`,
        body: await readJsonInput(options)
      });
    }
    default:
      throw new Error("Unknown routing command.");
  }
}
async function handleSms(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    query: "string[]"
  });
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const basePath = `${workspaceBasePath(workspaceId)}/interactions`;
  const queries = queryFromOptions(options);
  if (action === "list" || action === "sync") {
    queries.set("channel", "sms");
  }
  switch (action) {
    case "list":
      return request(io, globalOptions, { path: basePath, query: queries });
    case "sync":
      return request(io, globalOptions, { path: `${basePath}/sync`, query: queries });
    case "show":
      return request(io, globalOptions, {
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}`
      });
    case "close":
      return request(io, globalOptions, {
        method: "POST",
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/close`
      });
    case "read":
      return request(io, globalOptions, {
        method: "POST",
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/read`
      });
    default:
      throw new Error("Unknown sms command.");
  }
}
async function handleConversations(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    query: "string[]"
  });
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const basePath = `${workspaceBasePath(workspaceId)}/interactions`;
  const queries = queryFromOptions(options);
  switch (action) {
    case "list":
      return request(io, globalOptions, { path: basePath, query: queries });
    case "show":
      return request(io, globalOptions, {
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}`
      });
    case "close":
      return request(io, globalOptions, {
        method: "POST",
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/close`
      });
    case "read":
      return request(io, globalOptions, {
        method: "POST",
        path: `${basePath}/${encodeURIComponent(requireSinglePositional(positionals, "<interaction-id>"))}/read`
      });
    default:
      throw new Error("Unknown conversations command.");
  }
}
async function handleRecordings(io, globalOptions, action, args) {
  const { positionals } = parseFlags(args, {});
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const callId = requireSinglePositional(positionals, "<call-id>");
  if (action !== "audio") {
    throw new Error("Unknown recordings command. Expected audio.");
  }
  return request(io, globalOptions, {
    path: `${workspaceBasePath(workspaceId)}/calls/${encodeURIComponent(callId)}/audio`
  });
}
async function handleTranscripts(io, globalOptions, action, args) {
  const { positionals } = parseFlags(args, {});
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const callId = requireSinglePositional(positionals, "<call-id>");
  const callPath = `${workspaceBasePath(workspaceId)}/calls/${encodeURIComponent(callId)}`;
  switch (action) {
    case "turns":
      return request(io, globalOptions, { path: `${callPath}/turns` });
    case "export":
      return request(io, globalOptions, { path: `${callPath}/export` });
    default:
      throw new Error("Unknown transcripts command. Expected turns or export.");
  }
}
async function handleDiagnostics(io, globalOptions, action, args) {
  const { positionals } = parseFlags(args, {});
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const basePath = workspaceBasePath(workspaceId);
  switch (action) {
    case "metrics":
      return request(io, globalOptions, { path: `${basePath}/interactions/metrics` });
    case "delivery-log":
      return request(io, globalOptions, { path: `${basePath}/delivery-log` });
    case "provider-sync":
      return request(io, globalOptions, {
        method: "POST",
        path: `${basePath}/provider-accounts/${encodeURIComponent(requireSinglePositional(positionals, "<provider-account-id>"))}/sync`
      });
    default:
      throw new Error("Unknown diagnostics command.");
  }
}
async function runCli(argv, io) {
  try {
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    const [group, action, ...args] = rest;
    if (asBoolean(globalOptions.version)) {
      writeText(io, await cliVersion());
      return 0;
    }
    if (group === "completion") {
      writeText(io, completionScript(action));
      return 0;
    }
    if (group === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    if (asBoolean(globalOptions.help) || rest.length === 0 || rest[0] === "help") {
      writeText(io, HELP_TEXT);
      return 0;
    }
    activeSession = await loadSession(io.env);
    const isWorkspaceMetadataCommand = group === "workspace" && ["list", "current", "use"].includes(action ?? "");
    if (group !== "auth" && !isWorkspaceMetadataCommand && activeSession && !trimOption(asString(globalOptions.token)) && !trimOption(io.env.MERE_NETWORK_TOKEN)) {
      activeSession = await ensureActiveSession(activeSession, {
        workspace: resolveWorkspaceOptional(globalOptions, io.env),
        fetchImpl: io.fetchImpl
      });
      await saveSession(activeSession, io.env);
    }
    let result;
    switch (group) {
      case "auth":
        result = await handleAuth(io, globalOptions, action);
        break;
      case "workspace":
        result = await handleWorkspace(io, globalOptions, action, args);
        break;
      case "customers":
        result = await handleCustomers(io, globalOptions, action, args);
        break;
      case "deployments":
        result = await handleDeployments(io, globalOptions, action, args);
        break;
      case "calls":
      case "interactions":
      case "locations":
      case "scripts":
      case "numbers":
      case "provider-accounts":
        result = await handleWorkspaceRequest(io, globalOptions, { group, action, args });
        break;
      case "sms":
        result = await handleSms(io, globalOptions, action, args);
        break;
      case "conversations":
        result = await handleConversations(io, globalOptions, action, args);
        break;
      case "recordings":
        result = await handleRecordings(io, globalOptions, action, args);
        break;
      case "transcripts":
        result = await handleTranscripts(io, globalOptions, action, args);
        break;
      case "diagnostics":
        result = await handleDiagnostics(io, globalOptions, action, args);
        break;
      case "routing":
        result = await handleRouting(io, globalOptions, action, args);
        break;
      default:
        throw new Error(`Unknown command group: ${group}`);
    }
    if (group === "auth" && action !== "logout" && result && typeof result === "object" && "user" in result) {
      if (asBoolean(globalOptions.json)) {
        writeJson(io, result);
      } else {
        writeText(io, renderSessionSummary(result));
      }
      return 0;
    }
    if (group === "auth" && action === "logout" && !asBoolean(globalOptions.json)) {
      writeText(io, result.loggedOut ? "Logged out." : "No local session found.");
      return 0;
    }
    if (asBoolean(globalOptions.json) || typeof result !== "string") {
      writeJson(io, result);
    } else {
      writeText(io, result);
    }
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : "Unexpected CLI error."}
`);
    return 1;
  }
}

// cli/run.ts
var exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  fetchImpl: fetch,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
});
process.exitCode = exitCode;
