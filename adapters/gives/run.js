#!/usr/bin/env node

// cli/zerodonate.ts
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d58c11277d08e28fc88399d6fc968ff2/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d58c11277d08e28fc88399d6fc968ff2/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d58c11277d08e28fc88399d6fc968ff2/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d58c11277d08e28fc88399d6fc968ff2/node_modules/@mere/cli-auth/src/client.ts
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
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
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
          if (input.inviteCode?.trim()) {
            startUrl.searchParams.set("invite_code", input.inviteCode.trim());
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
    inviteCode: input.inviteCode,
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
var APP_NAME = "mere-gives";
async function loadSession(env = process.env) {
  return loadCliSession({ appName: APP_NAME, env, legacyAppNames: ["zerodonate"] });
}
async function saveSession(session, env = process.env) {
  await saveCliSession({ appName: APP_NAME, session, env });
}
async function clearSession(env = process.env) {
  await clearCliSession({ appName: APP_NAME, env, legacyAppNames: ["zerodonate"] });
}

// cli/auth.ts
async function loginWithBrowser2(input) {
  const session = await loginWithBrowser({
    baseUrl: input.baseUrl,
    workspace: input.workspace,
    fetchImpl: input.fetchImpl,
    notify: input.notify,
    productLabel: "mere-gives"
  });
  await saveSession(session, input.env);
  return session;
}
async function ensureActiveSession(session, input = {}) {
  const workspace = input.workspace ?? session.defaultWorkspaceId ?? null;
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
    persistDefaultWorkspace: true
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

// cli/zerodonate.ts
var CliError = class extends Error {
};
var DEFAULT_BASE_URL = "https://mere.gives";
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  token: "string",
  workspace: "string",
  json: "boolean",
  help: "boolean",
  version: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string"
};
var HELP_TEXT = `mere-gives CLI (alias: zerodonate)

Usage:
  mere-gives [global flags] <group> <command> [args]

Global flags:
  --base-url URL       Override MERE_GIVES_BASE_URL
  --token TOKEN        Override MERE_GIVES_TOKEN
  --workspace ID       Preferred ZeroSMB workspace during auth login
  --json               Write machine-readable JSON
  --version            Show the CLI version
  --no-interactive     Reserved for non-interactive automation
  --yes                Required for destructive automation
  --confirm ID         Exact target required with --yes for destructive commands
  --help               Show this help

Auth:
  completion [bash|zsh|fish]
  auth login
  auth whoami
  auth logout

Workspace:
  workspace list
  workspace current
  workspace use <id|slug|host>
  workspace disconnect --tenant TENANT_ID --yes --confirm TENANT_ID

Tenant admin:
  tenant show --tenant TENANT_ID
  tenant update --tenant TENANT_ID [--name NAME] [--description TEXT] [--accent-color COLOR] [--notify-emails EMAILS] [--donor-covers-fees-default true|false] [--platform-fee-percent NUMBER]
  campaigns list|show|create|update|delete --tenant TENANT_ID [--data JSON|--data-file FILE] [--yes]
  donations list|export --tenant TENANT_ID [--limit N]
  donations show <id> --tenant TENANT_ID
  donations refund <id> --tenant TENANT_ID (--full|--amount-cents N) [--reason TEXT] --yes --confirm ID
  donors list|show|update --tenant TENANT_ID [--data JSON|--data-file FILE]
  receipts list|show --tenant TENANT_ID
  receipts download <id> --tenant TENANT_ID --output FILE
  receipts year-end --tenant TENANT_ID --tax-year YYYY
  widget snippet --tenant TENANT_ID
  settings get|update --tenant TENANT_ID [--data JSON|--data-file FILE]
  events list|show|create|update|delete --tenant TENANT_ID [--data JSON|--data-file FILE] [--yes]
  stripe status --tenant TENANT_ID

Team admin:
  team list --tenant TENANT_ID
  team add --tenant TENANT_ID --user USER_ID [--role owner|admin]
  team remove --tenant TENANT_ID --membership MEMBERSHIP_ID

ZeroSMB:
  workspace provision --workspace-id ID --slug SLUG --name NAME [--webhook-url URL] [--callback-bearer-token TOKEN]

Environment:
  MERE_GIVES_BASE_URL  Worker URL, for example https://mere.gives or http://127.0.0.1:8787
  MERE_GIVES_TOKEN     Bearer token override for admin/session requests
  MERE_GIVES_WORKSPACE_ID  Default ZeroSMB workspace for browser auth login
  ZERODONATE_INTERNAL_TOKEN Internal token for workspace provisioning
`;
var activeSession = null;
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
    app: "mere-gives",
    namespace: "gives",
    aliases: ["mere-gives", "zerodonate"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_GIVES_BASE_URL"],
    sessionPath: "~/.local/state/mere-gives/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file", "tenant"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["workspace", "provision"], "Provision workspace.", { auth: "token", risk: "write", supportsData: true }),
      manifestCommand(["tenant", "show"], "Show tenant.", { auditDefault: true }),
      manifestCommand(["tenant", "update"], "Update tenant.", { risk: "write", supportsData: true }),
      manifestCommand(["campaigns", "list"], "List campaigns.", { auditDefault: true }),
      manifestCommand(["campaigns", "show"], "Show campaign."),
      manifestCommand(["campaigns", "create"], "Create campaign.", { risk: "write", supportsData: true }),
      manifestCommand(["campaigns", "update"], "Update campaign.", { risk: "write", supportsData: true }),
      manifestCommand(["campaigns", "delete"], "Delete campaign.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["donations", "list"], "List donations."),
      manifestCommand(["donations", "export"], "Export donations."),
      manifestCommand(["donations", "show"], "Show donation."),
      manifestCommand(["donations", "refund"], "Refund donation.", { risk: "destructive", supportsData: true, requiresYes: true, requiresConfirm: true }),
      manifestCommand(["donors", "list"], "List donors."),
      manifestCommand(["donors", "show"], "Show donor."),
      manifestCommand(["donors", "update"], "Update donor.", { risk: "write", supportsData: true }),
      manifestCommand(["receipts", "list"], "List receipts."),
      manifestCommand(["receipts", "show"], "Show receipt."),
      manifestCommand(["receipts", "download"], "Download receipt."),
      manifestCommand(["receipts", "year-end"], "Generate year-end receipt bundle.", { risk: "write" }),
      manifestCommand(["widget", "snippet"], "Print widget snippet."),
      manifestCommand(["settings", "get"], "Show settings."),
      manifestCommand(["settings", "update"], "Update settings.", { risk: "write", supportsData: true }),
      manifestCommand(["events", "list"], "List events."),
      manifestCommand(["events", "show"], "Show event."),
      manifestCommand(["events", "create"], "Create event.", { risk: "write", supportsData: true }),
      manifestCommand(["events", "update"], "Update event.", { risk: "write", supportsData: true }),
      manifestCommand(["events", "delete"], "Delete event.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["stripe", "status"], "Show Stripe status.", { auditDefault: true }),
      manifestCommand(["team", "list"], "List team."),
      manifestCommand(["team", "add"], "Add team member.", { risk: "write", supportsData: true }),
      manifestCommand(["team", "remove"], "Remove team member.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeText(io, value) {
  io.stdout(`${value}
`);
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean(value) {
  return value === true;
}
function trimOption(value) {
  const trimmed = value?.trim();
  if (trimmed === void 0 || trimmed === "") {
    return void 0;
  }
  return trimmed;
}
function parseFlagToken(token) {
  const separatorIndex = token.indexOf("=");
  if (separatorIndex < 0) {
    return {
      name: token.slice(2),
      value: void 0
    };
  }
  return {
    name: token.slice(2, separatorIndex),
    value: token.slice(separatorIndex + 1)
  };
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
    const { name: rawName, value: inlineValue } = parseFlagToken(token);
    const expectedKind = spec[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown option: --${rawName}`);
    }
    if (expectedKind === "boolean") {
      options[rawName] = inlineValue == null ? true : inlineValue === "true";
      continue;
    }
    const resolvedValue = inlineValue ?? (() => {
      const next = args.at(index + 1);
      if (next === void 0) {
        throw new CliError(`Missing value for --${rawName}.`);
      }
      if (next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`);
      }
      index += 1;
      return next;
    })();
    if (expectedKind === "string[]") {
      const current = Array.isArray(options[rawName]) ? options[rawName] : [];
      options[rawName] = [...current, resolvedValue];
      continue;
    }
    options[rawName] = resolvedValue;
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
    const { name: rawName, value: inlineValue } = parseFlagToken(token);
    const expectedKind = GLOBAL_FLAG_SPEC[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown global option: --${rawName}`);
    }
    globalTokens.push(token);
    if (expectedKind !== "boolean" && inlineValue == null) {
      const next = argv.at(index + 1);
      if (next === void 0) {
        throw new CliError(`Missing value for --${rawName}.`);
      }
      if (next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`);
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
function readRequiredStringOption(options, name, label = `--${name}`) {
  const value = trimOption(asString(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`);
  }
  return value;
}
function readOptionalStringOption(options, name) {
  return trimOption(asString(options[name]));
}
function readOptionalBooleanOption(options, name) {
  const value = readOptionalStringOption(options, name);
  if (value == null) {
    return void 0;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new CliError(`--${name} must be true or false.`);
}
function readOptionalNumberOption(options, name) {
  const value = readOptionalStringOption(options, name);
  if (value == null) {
    return void 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliError(`--${name} must be a valid number.`);
  }
  return parsed;
}
async function readJsonBody(options) {
  const inline = readOptionalStringOption(options, "data");
  const file = readOptionalStringOption(options, "data-file");
  if (inline && file) {
    throw new CliError("Use either --data or --data-file, not both.");
  }
  let text;
  if (inline !== void 0) {
    text = inline;
  } else if (file !== void 0) {
    text = await readFile2(file, "utf8");
  } else {
    return {};
  }
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError("JSON payload must be an object.");
  }
  return parsed;
}
function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== "") {
      search.set(key, value);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
function requireDestructiveConfirmation(globalOptions, options, label, target) {
  if (!asBoolean(options.yes) && !asBoolean(globalOptions.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`);
  }
  const confirm = readOptionalStringOption(options, "confirm") ?? readOptionalStringOption(globalOptions, "confirm");
  if (confirm !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`);
  }
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
var COMPLETION_WORDS = [
  "auth",
  "campaigns",
  "completion",
  "donations",
  "donors",
  "events",
  "receipts",
  "settings",
  "stripe",
  "team",
  "tenant",
  "widget",
  "workspace"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-gives bash completion",
      "_mere_gives_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_gives_completion mere-gives zerodonate",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-gives zerodonate",
      "_mere_gives() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_gives "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-gives -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.");
}
function resolveBaseUrl(options, env) {
  return trimOption(asString(options["base-url"])) ?? trimOption(env.MERE_GIVES_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveRequestedWorkspace(options, env) {
  return trimOption(asString(options.workspace)) ?? trimOption(env.MERE_GIVES_WORKSPACE_ID);
}
function resolveTokenOverride(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_GIVES_TOKEN) ?? trimOption(env.ZERODONATE_INTERNAL_TOKEN);
}
function renderSessionSummary(session) {
  const selectedWorkspace = session.workspace ?? session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null;
  const workspaceLabel = session.workspaces.length > 0 ? session.workspaces.map(
    (workspace) => workspace.id === session.defaultWorkspaceId ? `${workspace.slug} (default)` : workspace.slug
  ).join(", ") : "none";
  return [
    `user: ${session.user.displayName || session.user.primaryEmail}`,
    `email: ${session.user.primaryEmail}`,
    selectedWorkspace ? `selected workspace: ${renderWorkspaceLabel(selectedWorkspace)}` : "selected workspace: none",
    `available workspaces: ${String(session.workspaces.length)}`,
    `base url: ${session.baseUrl}`,
    `expires: ${session.expiresAt}`,
    `workspaces: ${workspaceLabel}`
  ].join("\n");
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
async function readResponsePayload(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return response.text();
}
function extractErrorMessage(payload, status) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const error = "error" in payload && typeof payload.error === "string" ? payload.error : "message" in payload && typeof payload.message === "string" ? payload.message : null;
    if (error) {
      return error;
    }
  }
  return `Request failed (${status.toString()}).`;
}
async function resolveSessionToken(io, globalOptions) {
  const tokenOverride = trimOption(asString(globalOptions.token)) ?? trimOption(io.env.MERE_GIVES_TOKEN);
  if (tokenOverride) {
    return tokenOverride;
  }
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new CliError("This command requires `mere-gives auth login` or MERE_GIVES_TOKEN.");
  }
  const nextSession = await ensureActiveSession(session, {
    workspace: resolveRequestedWorkspace(globalOptions, io.env) ?? session.defaultWorkspaceId,
    fetchImpl: io.fetchImpl
  });
  if (nextSession !== session) {
    await saveSession(nextSession, io.env);
  }
  activeSession = nextSession;
  return nextSession.accessToken;
}
function resolveInternalToken(io, globalOptions) {
  const token = resolveTokenOverride(globalOptions, io.env);
  if (!token) {
    throw new CliError(
      "This command requires --token, MERE_GIVES_TOKEN, or ZERODONATE_INTERNAL_TOKEN."
    );
  }
  return token;
}
async function requestJson(io, globalOptions, input) {
  const baseUrl = resolveBaseUrl(globalOptions, io.env);
  const token = input.auth === "internal" ? resolveInternalToken(io, globalOptions) : await resolveSessionToken(io, globalOptions);
  const url = new URL(input.path, baseUrl);
  for (const [key, value] of (input.query ?? new URLSearchParams()).entries()) {
    url.searchParams.append(key, value);
  }
  const response = await (io.fetchImpl ?? fetch)(url, {
    method: input.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...input.body === void 0 ? {} : { "content-type": "application/json" }
    },
    body: input.body === void 0 ? void 0 : JSON.stringify(input.body)
  });
  const payload = await readResponsePayload(response);
  if (!response.ok) {
    throw new CliError(extractErrorMessage(payload, response.status));
  }
  return payload;
}
async function requestText(io, globalOptions, input) {
  const baseUrl = resolveBaseUrl(globalOptions, io.env);
  const token = input.auth === "internal" ? resolveInternalToken(io, globalOptions) : await resolveSessionToken(io, globalOptions);
  const response = await (io.fetchImpl ?? fetch)(new URL(input.path, baseUrl), {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "*/*"
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new CliError(extractErrorMessage(text, response.status));
  }
  return { text, contentType: response.headers.get("content-type") };
}
async function writeTextFile(outputPath, text) {
  const target = resolvePath(outputPath);
  await mkdir2(dirname(target), { recursive: true });
  await writeFile2(target, text, "utf8");
  return target;
}
async function handleAuthCommand(positionals, globalOptions, io, wantsJson) {
  const action = positionals[1];
  if (action === "login") {
    const session = await loginWithBrowser2({
      baseUrl: resolveBaseUrl(globalOptions, io.env),
      workspace: resolveRequestedWorkspace(globalOptions, io.env),
      fetchImpl: io.fetchImpl,
      notify: (message) => {
        io.stderr(`${message}
`);
      },
      env: io.env
    });
    activeSession = session;
    return wantsJson ? {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    } : renderSessionSummary(session);
  }
  if (action === "whoami") {
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-gives auth login` first.");
    }
    activeSession = session;
    return wantsJson ? {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    } : renderSessionSummary(session);
  }
  if (action === "logout") {
    const loggedOut = await logoutRemote({
      fetchImpl: io.fetchImpl,
      env: io.env
    });
    activeSession = null;
    return wantsJson ? { loggedOut } : loggedOut ? "Logged out of mere-gives." : "No local session found.";
  }
  throw new CliError("Unknown auth action: expected login, whoami, or logout.");
}
async function handleTenantCommand(argv, globalOptions, io) {
  const action = argv[1];
  if (action === "show") {
    const { options } = parseFlags(argv.slice(2), {
      tenant: "string"
    });
    return requestJson(io, globalOptions, {
      auth: "session",
      path: "/api/admin/settings/tenant",
      query: new URLSearchParams({
        tenantId: readRequiredStringOption(options, "tenant")
      })
    });
  }
  if (action === "update") {
    const { options } = parseFlags(argv.slice(2), {
      tenant: "string",
      name: "string",
      description: "string",
      "accent-color": "string",
      "notify-emails": "string",
      "donor-covers-fees-default": "string",
      "platform-fee-percent": "string"
    });
    const body = {
      tenantId: readRequiredStringOption(options, "tenant")
    };
    const name = readOptionalStringOption(options, "name");
    const description = readOptionalStringOption(options, "description");
    const accentColor = readOptionalStringOption(options, "accent-color");
    const notifyEmails = readOptionalStringOption(options, "notify-emails");
    const donorCoversFeesDefault = readOptionalBooleanOption(options, "donor-covers-fees-default");
    const platformFeePercent = readOptionalNumberOption(options, "platform-fee-percent");
    if (name !== void 0) {
      body.name = name;
    }
    if (description !== void 0) {
      body.description = description;
    }
    if (accentColor !== void 0) {
      body.accentColor = accentColor;
    }
    if (notifyEmails !== void 0) {
      body.notifyEmails = notifyEmails;
    }
    if (donorCoversFeesDefault !== void 0) {
      body.donorCoversFeesDefault = donorCoversFeesDefault;
    }
    if (platformFeePercent !== void 0) {
      body.platformFeePercent = platformFeePercent;
    }
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "PUT",
      path: "/api/admin/settings/tenant",
      body
    });
  }
  throw new CliError("Unknown tenant action: expected show or update.");
}
async function handleTeamCommand(argv, globalOptions, io) {
  const action = argv[1];
  if (action === "list") {
    const { options } = parseFlags(argv.slice(2), {
      tenant: "string"
    });
    return requestJson(io, globalOptions, {
      auth: "session",
      path: "/api/admin/settings/team",
      query: new URLSearchParams({
        tenantId: readRequiredStringOption(options, "tenant")
      })
    });
  }
  if (action === "add") {
    const { options } = parseFlags(argv.slice(2), {
      tenant: "string",
      user: "string",
      role: "string"
    });
    const role = readOptionalStringOption(options, "role");
    if (role && role !== "admin" && role !== "owner") {
      throw new CliError("--role must be admin or owner.");
    }
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "POST",
      path: "/api/admin/settings/team",
      body: {
        tenantId: readRequiredStringOption(options, "tenant"),
        userId: readRequiredStringOption(options, "user"),
        role: role ?? "admin"
      }
    });
  }
  if (action === "remove") {
    const { options } = parseFlags(argv.slice(2), {
      tenant: "string",
      membership: "string",
      yes: "boolean",
      confirm: "string"
    });
    const membershipId = readRequiredStringOption(options, "membership");
    requireDestructiveConfirmation(globalOptions, options, "remove team membership", membershipId);
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "DELETE",
      path: "/api/admin/settings/team",
      body: {
        tenantId: readRequiredStringOption(options, "tenant"),
        membershipId
      }
    });
  }
  throw new CliError("Unknown team action: expected list, add, or remove.");
}
async function handleCampaignsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options, positionals } = parseFlags(argv.slice(2), {
    tenant: "string",
    data: "string",
    "data-file": "string",
    yes: "boolean",
    confirm: "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action === "list") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/campaigns${queryString({ tenantId })}`
    });
  }
  if (action === "show") {
    const id = positionals[0];
    if (!id) throw new CliError("campaigns show requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/campaigns/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  if (action === "create") {
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "POST",
      path: "/api/admin/campaigns",
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  if (action === "update") {
    const id = positionals[0];
    if (!id) throw new CliError("campaigns update requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "PUT",
      path: `/api/admin/campaigns/${encodeURIComponent(id)}`,
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  if (action === "delete") {
    const id = positionals[0];
    if (!id) throw new CliError("campaigns delete requires <id>.");
    requireDestructiveConfirmation(globalOptions, options, "delete campaign", id);
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "DELETE",
      path: `/api/admin/campaigns/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  throw new CliError("Unknown campaigns action: expected list, show, create, update, or delete.");
}
async function handleDonationsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options, positionals } = parseFlags(argv.slice(2), {
    tenant: "string",
    limit: "string",
    full: "boolean",
    "amount-cents": "string",
    reason: "string",
    yes: "boolean",
    confirm: "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  const limit = readOptionalStringOption(options, "limit");
  if (action === "list") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/donations${queryString({ tenantId, limit })}`
    });
  }
  if (action === "export") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/donations/export${queryString({ tenantId })}`
    });
  }
  if (action === "show") {
    const id = positionals[0];
    if (!id) throw new CliError("donations show requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/donations/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  if (action === "refund") {
    const id = positionals[0];
    if (!id) throw new CliError("donations refund requires <id>.");
    requireDestructiveConfirmation(globalOptions, options, "refund donation", id);
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "POST",
      path: `/api/admin/donations/${encodeURIComponent(id)}/refund`,
      body: {
        tenantId,
        full: asBoolean(options.full),
        amountCents: readOptionalNumberOption(options, "amount-cents"),
        reason: readOptionalStringOption(options, "reason")
      }
    });
  }
  throw new CliError("Unknown donations action: expected list, export, show, or refund.");
}
async function handleDonorsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options, positionals } = parseFlags(argv.slice(2), {
    tenant: "string",
    data: "string",
    "data-file": "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action === "list") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/donors${queryString({ tenantId })}`
    });
  }
  if (action === "show") {
    const id = positionals[0];
    if (!id) throw new CliError("donors show requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/donors/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  if (action === "update") {
    const id = positionals[0];
    if (!id) throw new CliError("donors update requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "PUT",
      path: `/api/admin/donors/${encodeURIComponent(id)}`,
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  throw new CliError("Unknown donors action: expected list, show, or update.");
}
async function handleReceiptsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options, positionals } = parseFlags(argv.slice(2), {
    tenant: "string",
    output: "string",
    "tax-year": "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action === "list") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/receipts${queryString({ tenantId })}`
    });
  }
  if (action === "show") {
    const id = positionals[0];
    if (!id) throw new CliError("receipts show requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/receipts/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  if (action === "download") {
    const id = positionals[0];
    if (!id) throw new CliError("receipts download requires <id>.");
    const output = readRequiredStringOption(options, "output");
    const receipt = await requestText(io, globalOptions, {
      auth: "session",
      path: `/api/admin/receipts/${encodeURIComponent(id)}/pdf${queryString({ tenantId })}`
    });
    const path2 = await writeTextFile(output, receipt.text);
    return {
      receiptId: id,
      path: path2,
      bytes: Buffer.byteLength(receipt.text),
      contentType: receipt.contentType
    };
  }
  if (action === "year-end") {
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "POST",
      path: "/api/admin/receipts/year-end",
      body: {
        tenantId,
        taxYear: readOptionalNumberOption(options, "tax-year")
      }
    });
  }
  throw new CliError("Unknown receipts action: expected list, show, download, or year-end.");
}
async function handleWidgetCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options } = parseFlags(argv.slice(2), {
    tenant: "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action !== "snippet") {
    throw new CliError("Unknown widget action: expected snippet.");
  }
  return requestJson(io, globalOptions, {
    auth: "session",
    path: `/api/admin/settings/embed${queryString({ tenantId })}`
  });
}
async function handleSettingsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options } = parseFlags(argv.slice(2), {
    tenant: "string",
    data: "string",
    "data-file": "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action === "get") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/settings/tenant${queryString({ tenantId })}`
    });
  }
  if (action === "update") {
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "PUT",
      path: "/api/admin/settings/tenant",
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  throw new CliError("Unknown settings action: expected get or update.");
}
async function handleEventsCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options, positionals } = parseFlags(argv.slice(2), {
    tenant: "string",
    data: "string",
    "data-file": "string",
    yes: "boolean",
    confirm: "string"
  });
  const tenantId = readRequiredStringOption(options, "tenant");
  if (action === "list") {
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/events${queryString({ tenantId })}`
    });
  }
  if (action === "show") {
    const id = positionals[0];
    if (!id) throw new CliError("events show requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      path: `/api/admin/events/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  if (action === "create") {
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "POST",
      path: "/api/admin/events",
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  if (action === "update") {
    const id = positionals[0];
    if (!id) throw new CliError("events update requires <id>.");
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "PUT",
      path: `/api/admin/events/${encodeURIComponent(id)}`,
      body: { ...await readJsonBody(options), tenantId }
    });
  }
  if (action === "delete") {
    const id = positionals[0];
    if (!id) throw new CliError("events delete requires <id>.");
    requireDestructiveConfirmation(globalOptions, options, "delete event", id);
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "DELETE",
      path: `/api/admin/events/${encodeURIComponent(id)}${queryString({ tenantId })}`
    });
  }
  throw new CliError("Unknown events action: expected list, show, create, update, or delete.");
}
async function handleStripeCommand(argv, globalOptions, io) {
  const action = argv[1];
  const { options } = parseFlags(argv.slice(2), {
    tenant: "string"
  });
  if (action !== "status") {
    throw new CliError("Unknown stripe action: expected status.");
  }
  return requestJson(io, globalOptions, {
    auth: "session",
    path: `/api/admin/settings/stripe/status${queryString({
      tenantId: readRequiredStringOption(options, "tenant")
    })}`
  });
}
async function handleWorkspaceCommand(argv, globalOptions, io) {
  const action = argv[1];
  const wantsJson = asBoolean(globalOptions.json);
  if (action === "list") {
    const { positionals } = parseFlags(argv.slice(2), {});
    if (positionals.length > 0) {
      throw new CliError("workspace list does not accept positional arguments.");
    }
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-gives auth login` first.");
    }
    return wantsJson ? session.workspaces : session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available.";
  }
  if (action === "current") {
    const { positionals } = parseFlags(argv.slice(2), {});
    if (positionals.length > 0) {
      throw new CliError("workspace current does not accept positional arguments.");
    }
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-gives auth login` first.");
    }
    const result = {
      current: session.workspace,
      defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
    };
    return wantsJson ? result : [
      `current: ${result.current ? renderWorkspaceLabel(result.current) : "none"}`,
      `default: ${result.defaultWorkspace ? renderWorkspaceLabel(result.defaultWorkspace) : "none"}`
    ].join("\n");
  }
  if (action === "use") {
    const { positionals } = parseFlags(argv.slice(2), {});
    if (positionals.length !== 1) {
      throw new CliError("workspace use requires exactly one <id|slug|host>.");
    }
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-gives auth login` first.");
    }
    const target = requireWorkspaceSelection(session.workspaces, positionals[0]);
    const nextSession = await ensureActiveSession(session, {
      workspace: target.id,
      fetchImpl: io.fetchImpl
    });
    await saveSession(nextSession, io.env);
    activeSession = nextSession;
    return wantsJson ? nextSession : renderSessionSummary(nextSession);
  }
  if (action === "disconnect") {
    const { options: options2, positionals } = parseFlags(argv.slice(2), {
      tenant: "string",
      yes: "boolean",
      confirm: "string"
    });
    if (positionals.length > 0) {
      throw new CliError("workspace disconnect does not accept positional arguments.");
    }
    const tenantId = readRequiredStringOption(options2, "tenant");
    requireDestructiveConfirmation(globalOptions, options2, "disconnect workspace", tenantId);
    return requestJson(io, globalOptions, {
      auth: "session",
      method: "DELETE",
      path: "/api/admin/settings/zerosmb",
      body: { tenantId }
    });
  }
  if (action !== "provision") {
    throw new CliError("Unknown workspace action: expected list, current, use, disconnect, or provision.");
  }
  const { options } = parseFlags(argv.slice(2), {
    "workspace-id": "string",
    slug: "string",
    name: "string",
    "webhook-url": "string",
    "callback-bearer-token": "string"
  });
  const workspaceId = readRequiredStringOption(options, "workspace-id");
  return requestJson(io, globalOptions, {
    auth: "internal",
    method: "POST",
    path: `/api/internal/zerosmb/workspaces/${encodeURIComponent(workspaceId)}/provision`,
    body: {
      zerosmbWorkspaceId: workspaceId,
      slug: readRequiredStringOption(options, "slug"),
      name: readRequiredStringOption(options, "name"),
      webhookUrl: readOptionalStringOption(options, "webhook-url"),
      callbackBearerToken: readOptionalStringOption(options, "callback-bearer-token")
    }
  });
}
async function runCli(argv, io) {
  try {
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    const wantsJson = asBoolean(globalOptions.json);
    if (asBoolean(globalOptions.version) || rest[0] === "-v" || rest[0] === "version") {
      const version = await cliVersion();
      writeText(io, version);
      return 0;
    }
    if (rest[0] === "completion") {
      writeText(io, completionScript(rest[1]));
      return 0;
    }
    if (rest[0] === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    if (asBoolean(globalOptions.help) || rest.length === 0) {
      if (wantsJson) {
        writeJson(io, {
          name: "mere-gives",
          usage: "mere-gives [global flags] <group> <command> [args]",
          commands: {
            completion: ["bash", "zsh", "fish"],
            auth: ["login", "whoami", "logout"],
            tenant: ["show", "update"],
            campaigns: ["list", "show", "create", "update", "delete"],
            donations: ["list", "export", "show", "refund"],
            donors: ["list", "show", "update"],
            receipts: ["list", "show", "download", "year-end"],
            widget: ["snippet"],
            settings: ["get", "update"],
            events: ["list", "show", "create", "update", "delete"],
            stripe: ["status"],
            team: ["list", "add", "remove"],
            workspace: ["list", "current", "use", "disconnect", "provision"]
          }
        });
      } else {
        writeText(io, HELP_TEXT);
      }
      return 0;
    }
    const [group] = rest;
    let result;
    if (group === "auth") {
      result = await handleAuthCommand(rest, globalOptions, io, wantsJson);
    } else if (group === "tenant") {
      result = await handleTenantCommand(rest, globalOptions, io);
    } else if (group === "campaigns") {
      result = await handleCampaignsCommand(rest, globalOptions, io);
    } else if (group === "donations") {
      result = await handleDonationsCommand(rest, globalOptions, io);
    } else if (group === "donors") {
      result = await handleDonorsCommand(rest, globalOptions, io);
    } else if (group === "receipts") {
      result = await handleReceiptsCommand(rest, globalOptions, io);
    } else if (group === "widget") {
      result = await handleWidgetCommand(rest, globalOptions, io);
    } else if (group === "settings") {
      result = await handleSettingsCommand(rest, globalOptions, io);
    } else if (group === "events") {
      result = await handleEventsCommand(rest, globalOptions, io);
    } else if (group === "stripe") {
      result = await handleStripeCommand(rest, globalOptions, io);
    } else if (group === "team") {
      result = await handleTeamCommand(rest, globalOptions, io);
    } else if (group === "workspace") {
      result = await handleWorkspaceCommand(rest, globalOptions, io);
    } else if (group === "provision") {
      result = await handleWorkspaceCommand(["workspace", "provision", ...rest.slice(1)], globalOptions, io);
    } else {
      throw new CliError(`Unknown command group: ${group}`);
    }
    if (typeof result === "string") {
      writeText(io, result);
    } else {
      writeJson(io, result);
    }
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}
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
