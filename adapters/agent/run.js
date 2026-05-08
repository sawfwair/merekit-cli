#!/usr/bin/env node

// cli/agent.ts
import { readFile as readFile2 } from "node:fs/promises";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@opentelemetry+a_a24688588653a54cfd1beeb755d34927/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@opentelemetry+a_a24688588653a54cfd1beeb755d34927/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@opentelemetry+a_a24688588653a54cfd1beeb755d34927/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@opentelemetry+a_a24688588653a54cfd1beeb755d34927/node_modules/@mere/cli-auth/src/client.ts
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
      const requestUrl2 = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl2.pathname !== "/callback") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      const requestId = requestUrl2.searchParams.get(CLI_AUTH_REQUEST_QUERY_PARAM)?.trim();
      const code = requestUrl2.searchParams.get(CLI_AUTH_CODE_QUERY_PARAM)?.trim();
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
var APP_NAME = "mere-agent";
function sessionFilePath(env = process.env) {
  return resolveCliPaths(APP_NAME, env).sessionFile;
}
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
    productLabel: "mere-agent"
  });
  await saveSession(session, input.env);
  return session;
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

// cli/agent.ts
var DEFAULT_BASE_URL = process.env.MERE_AGENT_BASE_URL?.trim() || process.env.AGENT_BASE_URL?.trim() || "https://agent.mere.works";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "help",
  "json",
  "version",
  "yes"
]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["y", "yes"]
]);
var CliError = class extends Error {
  constructor(message, exitCode2 = 1) {
    super(message);
    this.exitCode = exitCode2;
    this.name = "CliError";
  }
  exitCode;
};
var HttpError = class extends CliError {
  constructor(message, status) {
    super(message, status === 401 || status === 403 ? 3 : 1);
    this.status = status;
    this.name = "HttpError";
  }
  status;
};
function normalizeBaseUrl2(raw) {
  const url = new URL(raw?.trim() || DEFAULT_BASE_URL);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function pushFlag(flags, name, value) {
  const current = flags[name];
  if (current === void 0) {
    flags[name] = value;
    return;
  }
  if (Array.isArray(current)) {
    current.push(String(value));
    return;
  }
  flags[name] = [String(current), String(value)];
}
function parseArgv(argv) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv.at(index) ?? "";
    if (token === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (token.startsWith("--")) {
      const raw = token.slice(2);
      const equalsIndex = raw.indexOf("=");
      const name = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
      const inlineValue = equalsIndex >= 0 ? raw.slice(equalsIndex + 1) : void 0;
      if (!name) throw new CliError("Flag name is required.", 2);
      if (BOOLEAN_FLAGS.has(name) && inlineValue === void 0) {
        flags[name] = true;
        continue;
      }
      const value = inlineValue ?? argv.at(index + 1);
      if (value === void 0 || inlineValue === void 0 && value.startsWith("-")) {
        throw new CliError(`Option --${name} requires a value.`, 2);
      }
      pushFlag(flags, name, value);
      if (inlineValue === void 0) index += 1;
      continue;
    }
    if (token.startsWith("-") && token.length === 2) {
      const mapped = SHORT_FLAGS.get(token.slice(1));
      if (!mapped) throw new CliError(`Unknown short option: ${token}`, 2);
      flags[mapped] = true;
      continue;
    }
    positionals.push(token);
  }
  return { flags, positionals };
}
function readFlag(parsed, ...names) {
  for (const name of names) {
    const value = parsed.flags[name];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.at(-1);
  }
  return void 0;
}
function readFlagValues(parsed, ...names) {
  const values = [];
  for (const name of names) {
    const value = parsed.flags[name];
    if (typeof value === "string") values.push(value);
    if (Array.isArray(value)) values.push(...value);
  }
  return values;
}
function readBooleanFlag(parsed, name) {
  return parsed.flags[name] === true;
}
function requireFlag(parsed, name) {
  const value = readFlag(parsed, name);
  if (!value?.trim()) throw new CliError(`Option --${name} is required.`, 2);
  return value.trim();
}
function firstPositional(values, label) {
  const value = values[0]?.trim();
  if (!value) throw new CliError(`${label} is required.`, 2);
  return value;
}
function objectValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}
function parseJsonOption(value, label) {
  if (value === void 0) return void 0;
  try {
    return JSON.parse(value);
  } catch {
    throw new CliError(`${label} must be valid JSON.`, 2);
  }
}
async function readJsonBody(parsed) {
  const inline = readFlag(parsed, "data");
  const file = readFlag(parsed, "data-file");
  if (inline && file) throw new CliError("Use either --data or --data-file, not both.", 2);
  if (inline) return objectValue(parseJsonOption(inline, "--data"));
  if (file) return objectValue(JSON.parse(await readFile2(file, "utf8")));
  return {};
}
function setIfDefined(target, key, value) {
  if (value !== void 0) target[key] = value;
}
function setStringFlag(target, key, parsed, ...names) {
  const value = readFlag(parsed, ...names);
  if (value !== void 0) target[key] = value;
}
function parseScope(value) {
  const [toolKey, accessLevel = "read", approval = "false"] = value.split(":");
  if (toolKey.trim().length === 0) {
    throw new CliError("--scope must be toolKey[:read|write][:true|false].", 2);
  }
  return {
    toolKey: toolKey.trim(),
    accessLevel: accessLevel.trim(),
    requiresApproval: ["1", "true", "yes"].includes(approval.trim().toLowerCase())
  };
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
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
    app: "mere-agent",
    namespace: "agent",
    aliases: ["mere-agent", "agent", "agents"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_AGENT_BASE_URL", "AGENT_BASE_URL"],
    sessionPath: "~/.local/state/mere-agent/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List available workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show the current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a default workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["template", "list"], "List agent templates.", { auditDefault: true }),
      manifestCommand(["agent", "list"], "List workspace agents.", { auditDefault: true }),
      manifestCommand(["agent", "get"], "Get an agent."),
      manifestCommand(["agent", "create"], "Create an agent.", { risk: "write", supportsData: true }),
      manifestCommand(["agent", "update"], "Update an agent.", { risk: "write", supportsData: true }),
      manifestCommand(["agent", "deploy"], "Deploy an agent.", { risk: "write" }),
      manifestCommand(["agent", "pause"], "Pause an agent.", { risk: "write" }),
      manifestCommand(["agent", "archive"], "Archive an agent.", { risk: "destructive", requiresYes: true }),
      manifestCommand(["agent", "delete"], "Permanently delete an agent.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["runtime", "mint"], "Mint an agent runtime session.", { risk: "write", supportsData: true }),
      manifestCommand(["share-link", "create"], "Create an external share link.", { risk: "write", supportsData: true }),
      manifestCommand(["share-link", "revoke"], "Revoke an external share link.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["tool", "list"], "List generated tools."),
      manifestCommand(["tool", "get"], "Get a generated tool."),
      manifestCommand(["tool", "upsert"], "Create or update a generated tool.", { risk: "write", supportsData: true }),
      manifestCommand(["tool", "run"], "Run a generated tool.", { risk: "external", supportsData: true }),
      manifestCommand(["tool", "retire"], "Retire a generated tool.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["tool", "reactivate"], "Reactivate a generated tool.", { risk: "write" }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
function printHelp(write) {
  write(`mere-agent CLI (aliases: agent, agents)

Usage:
  mere-agent auth login [--base-url https://agent.mere.works] [--workspace id|slug|host]
  mere-agent auth whoami [--json]
  mere-agent workspace list|current|use
  mere-agent completion [bash|zsh|fish]

  mere-agent [global flags] <resource> <action> [args] [flags]

Resources:
  template list
  agent list|get|create|update|deploy|pause|archive|delete
  runtime mint <agentId>
  share-link create|revoke
  tool list|get|upsert|run|retire|reactivate

Global flags:
  --base-url <url>        Base URL for auth login (default: MERE_AGENT_BASE_URL or production)
  --workspace <id|slug|host>
                          Target workspace for login or this command
  --json                  Print JSON output
  --data <json>           Structured mutation payload
  --data-file <path>      Read structured mutation payload from a file
  --yes                  Confirm destructive commands
  --confirm <id>          Exact destructive confirmation target
  --version               Print version
`);
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
function renderSessionSummary(session) {
  const workspace = session.workspace;
  return [
    `user: ${session.user.email}`,
    `base url: ${session.baseUrl}`,
    workspace ? `selected workspace: ${renderWorkspaceLabel(workspace)}` : "selected workspace: none",
    `available workspaces: ${String(session.workspaces.length)}`,
    `session file: ${sessionFilePath()}`
  ].join("\n");
}
function sessionOutput(session) {
  return {
    authenticated: true,
    user: session.user,
    baseUrl: session.baseUrl,
    workspace: session.workspace,
    defaultWorkspaceId: session.defaultWorkspaceId,
    workspaces: session.workspaces,
    expiresAt: session.expiresAt,
    sessionFile: sessionFilePath()
  };
}
async function ensureSession(parsed, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-agent auth login` first.", 3);
  }
  const selector = readFlag(parsed, "workspace") ?? current.defaultWorkspaceId ?? current.workspace?.id;
  const targetWorkspace = current.workspaces.length > 0 ? requireWorkspaceSelection(current.workspaces, selector) : current.workspace;
  if (!targetWorkspace) {
    throw new CliError("No workspace is available in this session.", 3);
  }
  if (!sessionNeedsRefresh(current, targetWorkspace.id)) {
    return current.workspace?.id === targetWorkspace.id ? current : { ...current, workspace: targetWorkspace };
  }
  const payload = await refreshRemoteSession({
    baseUrl: current.baseUrl,
    refreshToken: current.refreshToken,
    workspace: targetWorkspace.id,
    fetchImpl: io.fetchImpl
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl: current.baseUrl,
    persistDefaultWorkspace: false
  });
  await saveSession(session, io.env);
  return session;
}
async function switchWorkspace(selector, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-agent auth login` first.", 3);
  }
  const target = requireWorkspaceSelection(current.workspaces, selector);
  const payload = await refreshRemoteSession({
    baseUrl: current.baseUrl,
    refreshToken: current.refreshToken,
    workspace: target.id,
    fetchImpl: io.fetchImpl
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl: current.baseUrl,
    persistDefaultWorkspace: true
  });
  await saveSession(session, io.env);
  return session;
}
var COMPLETION_WORDS = [
  "auth",
  "workspace",
  "template",
  "agent",
  "runtime",
  "share-link",
  "tool",
  "completion"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-agent bash completion",
      "_mere_agent_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_agent_completion mere-agent agent agents",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-agent agent agents",
      "_mere_agent() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_agent "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-agent -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.", 2);
}
function workspaceSlug(session) {
  const slug = session.workspace?.slug;
  if (!slug) throw new CliError("No workspace is selected. Run `mere-agent workspace use WORKSPACE`.", 3);
  return slug;
}
function requestUrl(baseUrl, pathname, query) {
  const url = new URL(pathname, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== void 0 && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}
async function parseErrorResponse(response) {
  const text = await response.text().catch(() => "");
  if (!text) return `Request failed with status ${String(response.status)}.`;
  try {
    const payload = JSON.parse(text);
    const message = payload.error ?? payload.message;
    return typeof message === "string" ? message : text;
  } catch {
    return text;
  }
}
async function requestRaw(active, pathname, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${active.session.accessToken}`);
  if (options.body !== void 0) headers.set("content-type", "application/json");
  if ((options.method ?? "GET").toUpperCase() !== "GET" && !headers.has("origin")) {
    headers.set("origin", active.session.baseUrl);
  }
  const response = await active.fetchImpl(requestUrl(active.session.baseUrl, pathname, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== void 0 ? JSON.stringify(options.body) : void 0
  });
  if (!response.ok) {
    throw new HttpError(await parseErrorResponse(response), response.status);
  }
  return response;
}
async function requestJson(active, pathname, options = {}) {
  const response = await requestRaw(active, pathname, options);
  const payload = await response.json();
  return payload;
}
function requireDeleteConfirmation(parsed, noun, id) {
  if (!readBooleanFlag(parsed, "yes")) {
    throw new CliError(`Refusing to ${noun} ${id} without --yes.`, 2);
  }
  const confirm = readFlag(parsed, "confirm");
  if (confirm !== id) {
    throw new CliError(`Refusing to ${noun} ${id} without --confirm ${id}.`, 2);
  }
}
async function agentBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "templateKey", parsed, "template", "template-key");
  setStringFlag(body, "kind", parsed, "kind");
  setStringFlag(body, "name", parsed, "name");
  setStringFlag(body, "description", parsed, "description");
  setStringFlag(body, "instructions", parsed, "instructions");
  setStringFlag(body, "modelTier", parsed, "model-tier");
  const scopes = readFlagValues(parsed, "scope").map(parseScope);
  if (scopes.length > 0) body.scopes = scopes;
  return body;
}
async function runtimeBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "sessionId", parsed, "session", "session-id");
  setStringFlag(body, "seedFromTemplate", parsed, "seed-from-template", "template");
  return body;
}
async function shareLinkBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "label", parsed, "label");
  setStringFlag(body, "expiresAt", parsed, "expires-at");
  return body;
}
async function toolBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "toolId", parsed, "tool-id");
  setStringFlag(body, "name", parsed, "name");
  setStringFlag(body, "description", parsed, "description");
  setStringFlag(body, "backend", parsed, "backend");
  setIfDefined(body, "manifest", readFlag(parsed, "manifest"));
  setIfDefined(body, "code", readFlag(parsed, "code"));
  const manifestFile = readFlag(parsed, "manifest-file");
  if (manifestFile) body.manifest = await readFile2(manifestFile, "utf8");
  const codeFile = readFlag(parsed, "code-file");
  if (codeFile) body.code = await readFile2(codeFile, "utf8");
  setIfDefined(body, "policy", parseJsonOption(readFlag(parsed, "policy"), "--policy"));
  return body;
}
async function toolRunBody(parsed) {
  const body = await readJsonBody(parsed);
  setIfDefined(body, "input", parseJsonOption(readFlag(parsed, "input"), "--input"));
  setIfDefined(body, "context", parseJsonOption(readFlag(parsed, "context"), "--context"));
  return body;
}
function agentIdFrom(rest, parsed) {
  return rest[0]?.trim() || requireFlag(parsed, "agent");
}
function toolIdFrom(rest, parsed, index) {
  return rest[index]?.trim() || requireFlag(parsed, "tool");
}
async function handleTemplate(active) {
  const payload = objectValue(
    await requestJson(active, `/api/w/${encodeURIComponent(workspaceSlug(active.session))}/agents`)
  );
  return payload.templates ?? [];
}
async function handleAgent(active, action, rest, parsed) {
  const base = `/api/w/${encodeURIComponent(workspaceSlug(active.session))}/agents`;
  if (action === "list") return requestJson(active, base);
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "agent id"))}`);
  if (action === "create") return requestJson(active, base, { method: "POST", body: await agentBody(parsed) });
  if (action === "update") {
    const agentId = firstPositional(rest, "agent id");
    return requestJson(active, `${base}/${encodeURIComponent(agentId)}`, {
      method: "PATCH",
      body: await agentBody(parsed)
    });
  }
  if (action === "deploy" || action === "pause") {
    const agentId = firstPositional(rest, "agent id");
    return requestJson(active, `${base}/${encodeURIComponent(agentId)}/${action}`, { method: "POST" });
  }
  if (action === "archive") {
    const agentId = firstPositional(rest, "agent id");
    if (!readBooleanFlag(parsed, "yes")) {
      throw new CliError(`Refusing to archive agent ${agentId} without --yes.`, 2);
    }
    return requestJson(active, `${base}/${encodeURIComponent(agentId)}/archive`, { method: "POST" });
  }
  if (action === "delete") {
    const agentId = firstPositional(rest, "agent id");
    requireDeleteConfirmation(parsed, "delete agent", agentId);
    return requestJson(active, `${base}/${encodeURIComponent(agentId)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown agent action: ${action}`, 2);
}
async function handleRuntime(active, action, rest, parsed) {
  if (action !== "mint") throw new CliError(`Unknown runtime action: ${action}`, 2);
  const agentId = firstPositional(rest, "agent id");
  return requestJson(
    active,
    `/api/w/${encodeURIComponent(workspaceSlug(active.session))}/agents/${encodeURIComponent(agentId)}/runtime`,
    { method: "POST", body: await runtimeBody(parsed) }
  );
}
async function handleShareLink(active, action, rest, parsed) {
  const agentId = agentIdFrom(rest, parsed);
  const base = `/api/w/${encodeURIComponent(workspaceSlug(active.session))}/agents/${encodeURIComponent(agentId)}/share-links`;
  if (action === "create") {
    return requestJson(active, base, { method: "POST", body: await shareLinkBody(parsed) });
  }
  if (action === "revoke") {
    const linkId = rest.length >= 2 ? rest[1] : requireFlag(parsed, "link");
    requireDeleteConfirmation(parsed, "revoke share link", linkId);
    return requestJson(active, `${base}/${encodeURIComponent(linkId)}/revoke`, { method: "POST" });
  }
  throw new CliError(`Unknown share-link action: ${action}`, 2);
}
async function handleTool(active, action, rest, parsed) {
  const agentId = agentIdFrom(rest, parsed);
  const base = `/api/w/${encodeURIComponent(workspaceSlug(active.session))}/agents/${encodeURIComponent(agentId)}/generated-tools`;
  if (action === "list") return requestJson(active, base);
  if (action === "get") {
    const toolId = toolIdFrom(rest, parsed, rest.length >= 2 ? 1 : 0);
    return requestJson(active, `${base}/${encodeURIComponent(toolId)}`);
  }
  if (action === "upsert") {
    return requestJson(active, base, { method: "POST", body: await toolBody(parsed) });
  }
  if (action === "run") {
    const toolId = toolIdFrom(rest, parsed, rest.length >= 2 ? 1 : 0);
    return requestJson(active, `${base}/${encodeURIComponent(toolId)}/run`, {
      method: "POST",
      body: await toolRunBody(parsed)
    });
  }
  if (action === "retire") {
    const toolId = toolIdFrom(rest, parsed, rest.length >= 2 ? 1 : 0);
    requireDeleteConfirmation(parsed, "retire generated tool", toolId);
    return requestJson(active, `${base}/${encodeURIComponent(toolId)}/retire`, { method: "POST" });
  }
  if (action === "reactivate") {
    const toolId = toolIdFrom(rest, parsed, rest.length >= 2 ? 1 : 0);
    return requestJson(active, `${base}/${encodeURIComponent(toolId)}/reactivate`, { method: "POST" });
  }
  throw new CliError(`Unknown tool action: ${action}`, 2);
}
var AGENT_ACTIONS = /* @__PURE__ */ new Set(["list", "get", "create", "update", "deploy", "pause", "archive", "delete"]);
async function dispatch(parsed, active) {
  const [resource, action, ...rest] = parsed.positionals;
  if (!resource || !action) {
    if (resource && AGENT_ACTIONS.has(resource)) {
      return handleAgent(active, resource, [], parsed);
    }
    throw new CliError("A resource and action are required. Run `mere-agent --help`.", 2);
  }
  if (AGENT_ACTIONS.has(resource)) {
    return handleAgent(active, resource, [action, ...rest], parsed);
  }
  if (resource === "template" || resource === "templates") {
    if (action !== "list") throw new CliError(`Unknown template action: ${action}`, 2);
    return handleTemplate(active);
  }
  if (resource === "agent" || resource === "agents") return handleAgent(active, action, rest, parsed);
  if (resource === "runtime" || resource === "session") return handleRuntime(active, action, rest, parsed);
  if (resource === "share-link" || resource === "share-links") return handleShareLink(active, action, rest, parsed);
  if (resource === "tool" || resource === "tools" || resource === "generated-tool" || resource === "generated-tools") {
    return handleTool(active, action, rest, parsed);
  }
  throw new CliError(`Unknown resource: ${resource}`, 2);
}
function scalar(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function renderTable(rows) {
  if (rows.length === 0) return "No rows.";
  const columns = ["id", "slug", "name", "kind", "status", "modelTier", "sessionCount", "updatedAt"].filter((column) => rows.some((row) => row[column] !== void 0)).slice(0, 7);
  if (columns.length === 0) return JSON.stringify(rows, null, 2);
  const widths = columns.map(
    (column) => Math.min(
      40,
      Math.max(column.length, ...rows.map((row) => scalar(row[column]).length))
    )
  );
  const line = (values) => values.map((value, index) => value.slice(0, widths[index]).padEnd(widths[index])).join("  ");
  return [
    line(columns),
    line(columns.map((_, index) => "-".repeat(widths[index]))),
    ...rows.map((row) => line(columns.map((column) => scalar(row[column]))))
  ].join("\n");
}
function renderHuman(value) {
  if (Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return renderTable(value);
  }
  if (value && typeof value === "object") {
    const record = value;
    if (Array.isArray(record.agents)) return renderTable(record.agents);
    if (Array.isArray(record.tools)) return renderTable(record.tools);
    if (Array.isArray(record.templates)) return renderTable(record.templates);
    if (typeof record.shareUrl === "string") return `Share URL: ${record.shareUrl}`;
    if (typeof record.runtimeName === "string" && typeof record.token === "string") {
      return `Runtime: ${record.runtimeName}
Token expires: ${typeof record.expiresAt === "string" ? record.expiresAt : ""}`;
    }
  }
  return JSON.stringify(value, null, 2);
}
function writeResult(io, parsed, result) {
  if (result === void 0 || result === "") return;
  io.stdout(`${readBooleanFlag(parsed, "json") ? JSON.stringify(result, null, 2) : renderHuman(result)}
`);
}
async function handleAuth(parsed, io) {
  const action = parsed.positionals.at(1);
  if (action === "login") {
    const session = await loginWithBrowser2({
      baseUrl: normalizeBaseUrl2(readFlag(parsed, "base-url")),
      workspace: readFlag(parsed, "workspace"),
      fetchImpl: io.fetchImpl,
      notify: (message) => io.stderr(`${message}
`),
      env: io.env
    });
    return sessionOutput(session);
  }
  if (action === "logout") {
    return { loggedOut: await logoutRemote({ fetchImpl: io.fetchImpl, env: io.env }) };
  }
  if (action === "whoami") {
    return sessionOutput(await ensureSession(parsed, io));
  }
  throw new CliError(`Unknown auth action: ${action ?? "(missing)"}`, 2);
}
async function handleWorkspace(parsed, io) {
  const action = parsed.positionals.at(1);
  const session = await loadSession(io.env);
  if (!session) throw new CliError("No local session found. Run `mere-agent auth login` first.", 3);
  if (action === "list") return session.workspaces;
  if (action === "current") {
    return {
      current: session.workspace,
      defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
    };
  }
  if (action === "use") {
    return switchWorkspace(firstPositional(parsed.positionals.slice(2), "workspace"), io);
  }
  throw new CliError(`Unknown workspace action: ${action ?? "(missing)"}`, 2);
}
async function runCli(argv, io) {
  try {
    const parsed = parseArgv(argv);
    if (readBooleanFlag(parsed, "version")) {
      io.stdout(`${await cliVersion()}
`);
      return 0;
    }
    if (parsed.positionals.length === 0 || readBooleanFlag(parsed, "help")) {
      printHelp(io.stdout);
      return 0;
    }
    if (parsed.positionals[0] === "commands") {
      io.stdout(`${JSON.stringify(commandManifest(), null, 2)}
`);
      return 0;
    }
    if (parsed.positionals[0] === "auth") {
      const result2 = await handleAuth(parsed, io);
      if (readBooleanFlag(parsed, "json")) {
        writeResult(io, parsed, result2);
      } else if (parsed.positionals[1] === "logout") {
        io.stdout(`${result2.loggedOut ? "Logged out." : "No local session found."}
`);
      } else {
        const session2 = await loadSession(io.env);
        if (session2) io.stdout(`${renderSessionSummary(session2)}
`);
      }
      return 0;
    }
    if (parsed.positionals[0] === "workspace") {
      writeResult(io, parsed, await handleWorkspace(parsed, io));
      return 0;
    }
    if (parsed.positionals[0] === "completion") {
      io.stdout(completionScript(parsed.positionals[1]));
      return 0;
    }
    const session = await ensureSession(parsed, io);
    const result = await dispatch(parsed, { session, fetchImpl: io.fetchImpl ?? fetch });
    writeResult(io, parsed, result);
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}
`);
    return error instanceof CliError ? error.exitCode : 1;
  }
}

// cli/run.ts
var stdout = process.stdout.write.bind(process.stdout);
var stderr = process.stderr.write.bind(process.stderr);
var exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  fetchImpl: fetch,
  stdout: (text) => stdout(text),
  stderr: (text) => stderr(text)
});
process.exitCode = exitCode;
