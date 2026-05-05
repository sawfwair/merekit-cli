#!/usr/bin/env node

// cli/run.ts
import { spawn as spawn2 } from "node:child_process";
import { readFile as readFile2 } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_221c0030a2ec2a854d90979ee5b3cc68/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_221c0030a2ec2a854d90979ee5b3cc68/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_221c0030a2ec2a854d90979ee5b3cc68/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_221c0030a2ec2a854d90979ee5b3cc68/node_modules/@mere/cli-auth/src/client.ts
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
var APP_NAME = "mere-works";
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
    productLabel: "Mere Works"
  });
  await saveSession(session, input.env);
  return session;
}
async function ensureActiveSession(session, input = {}) {
  const workspace = input.workspace ?? session.defaultWorkspaceId ?? session.workspace?.id ?? null;
  if (!sessionNeedsRefresh(session, workspace)) {
    return session;
  }
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace,
    fetchImpl: input.fetchImpl
  });
  const next = mergeSessionPayload(session, payload, { persistDefaultWorkspace: true });
  await saveSession(next, input.env);
  return next;
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

// cli/run.ts
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["help", "json", "no-interactive", "version", "yes"]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["y", "yes"]
]);
var CliError = class extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
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
function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const raw = arg.slice(2);
      const equalsIndex = raw.indexOf("=");
      const key = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
      if (!key) throw new CliError("Flag name is required.", 2);
      const inlineValue = equalsIndex >= 0 ? raw.slice(equalsIndex + 1) : void 0;
      if (BOOLEAN_FLAGS.has(key) && inlineValue === void 0) {
        flags[key] = true;
        continue;
      }
      const value = inlineValue ?? argv[index + 1];
      if (value === void 0 || inlineValue === void 0 && value.startsWith("-")) {
        throw new CliError(`Option --${key} requires a value.`, 2);
      }
      pushFlag(flags, key, value);
      if (inlineValue === void 0) index += 1;
      continue;
    }
    if (arg.startsWith("-") && arg.length === 2) {
      const mapped = SHORT_FLAGS.get(arg.slice(1));
      if (!mapped) throw new CliError(`Unknown short option: ${arg}`, 2);
      flags[mapped] = true;
      continue;
    }
    positionals.push(arg);
  }
  return { positionals, flags };
}
function pushFlag(flags, key, value) {
  const current = flags[key];
  if (current === void 0) {
    flags[key] = value;
    return;
  }
  if (Array.isArray(current)) {
    current.push(value);
    return;
  }
  flags[key] = [String(current), value];
}
function flag(parsed, name) {
  const value = parsed.flags[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.at(-1);
  return void 0;
}
function boolFlag(parsed, name) {
  return parsed.flags[name] === true;
}
function defaultBaseUrl(env) {
  return env.WORKS_BASE_URL?.trim() || env.MERE_WORKS_BASE_URL?.trim() || "https://mere.works";
}
function requestBaseUrl(parsed, io, session) {
  return flag(parsed, "base-url")?.trim() || session?.baseUrl || defaultBaseUrl(io.env);
}
function normalizeBaseUrl2(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function internalToken(parsed, io) {
  const token = flag(parsed, "token")?.trim() || io.env.WORKS_INTERNAL_TOKEN?.trim() || io.env.WORKS_INTERNAL_TOKEN_FALLBACK?.trim() || io.env.AUTH_INTERNAL_TOKEN?.trim() || io.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new CliError(
      "Internal token required. Use --token or set WORKS_INTERNAL_TOKEN, AUTH_INTERNAL_TOKEN, or INTERNAL_SERVICE_TOKEN.",
      2
    );
  }
  return token;
}
function printHelp(io) {
  io.stdout(`Mere Works CLI

Usage:
  mere-works [global flags] <group> <command> [args]

Global flags:
  --base-url URL       Override the Works origin.
  --workspace ID       Target workspace for login/session commands or internal automation.
  --json               Print machine-readable JSON.
  --data JSON          JSON payload for create/update/command operations.
  --data-file FILE     Read JSON payload from a file.
  --token TOKEN        Internal bearer token for workspace automation.
  --yes --confirm ID   Confirm destructive commands.
  --help, -h           Show help.

Auth:
  auth login [--workspace ID_OR_SLUG]
  auth whoami|status
  auth logout

Workspace:
  workspace list|current|use <id|slug|host>
  workspace provision|bootstrap|sync --workspace WORKSPACE_ID [--data JSON]
  workspace disconnect --workspace WORKSPACE_ID --yes --confirm WORKSPACE_ID
  workspace command --workspace WORKSPACE_ID <command> [--data JSON] --yes

Works:
  work list
  work get WORK_ID | work get --slug SLUG
  work create --data-file work.json
  work update WORK_ID --data '{"displayName":"Ops"}'
  work delete WORK_ID --yes --confirm WORK_ID
  work open [SLUG]

Data:
  data get WORK_ID
  data update WORK_ID --data JSON
  data initialize WORK_ID --data JSON
  data append WORK_ID --collection NAME --data JSON

Release:
  release list WORK_ID
  release create WORK_ID [--name NAME] [--notes TEXT] [--source-version ID]
  release approval WORK_ID RELEASE_ID <request|approve|reject> [--note TEXT]
  release publish WORK_ID RELEASE_ID [--environment staging|production]
  release unpublish WORK_ID [--environment staging|production]
  release rollback WORK_ID [--environment staging|production]

Share, Capability, Surface, Version:
  share list|create|revoke
  capability list|grant|revoke
  surface get|set
  version list|restore|compare

Discovery:
  commands
  completion [bash|zsh|fish]

Environment:
  WORKS_BASE_URL       Override the Works origin.
`);
}
function commandManifest() {
  const command = (path2, summary, options = {}) => ({
    id: path2.join("."),
    path: path2,
    summary,
    auth: options.auth ?? "session",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false
  });
  return {
    schemaVersion: 1,
    app: "mere-works",
    namespace: "works",
    auth: { kind: "browser" },
    baseUrlEnv: ["WORKS_BASE_URL", "MERE_WORKS_BASE_URL"],
    internalTokenEnv: [
      "WORKS_INTERNAL_TOKEN",
      "WORKS_INTERNAL_TOKEN_FALLBACK",
      "AUTH_INTERNAL_TOKEN",
      "INTERNAL_SERVICE_TOKEN"
    ],
    sessionPath: "~/.local/state/mere-works/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file", "token"],
    commands: [
      command(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      command(["auth", "whoami"], "Show current user and workspace."),
      command(["auth", "logout"], "Clear the local session.", { risk: "write" }),
      command(["workspace", "list"], "List available workspaces."),
      command(["workspace", "current"], "Show active workspace."),
      command(["workspace", "use"], "Select a default workspace.", { risk: "write" }),
      command(["workspace", "provision"], "Provision Works for a Mere workspace.", {
        auth: "token",
        risk: "write",
        supportsData: true
      }),
      command(["workspace", "bootstrap"], "Bootstrap Works for a Mere workspace.", {
        auth: "token",
        risk: "write",
        supportsData: true
      }),
      command(["workspace", "sync"], "Sync Works connection state.", {
        auth: "token",
        risk: "write",
        supportsData: true
      }),
      command(["workspace", "disconnect"], "Disconnect Works from a Mere workspace.", {
        auth: "token",
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true
      }),
      command(["workspace", "command"], "Run an internal Works workspace command.", {
        auth: "token",
        risk: "external",
        supportsData: true,
        requiresYes: true
      }),
      ...["list", "get"].map((action) => command(["work", action], `${action} works.`)),
      command(["work", "create"], "Create a work from JSON.", { risk: "write", supportsData: true }),
      command(["work", "update"], "Update work metadata/code/schema.", { risk: "write", supportsData: true }),
      command(["work", "delete"], "Delete a work.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true
      }),
      command(["work", "open"], "Open Works in the browser.", { auth: "none" }),
      ...["get", "update", "initialize", "append"].map(
        (action) => command(["data", action], `${action} work data.`, {
          risk: action === "get" ? "read" : "write",
          supportsData: action !== "get"
        })
      ),
      ...["list", "create"].map(
        (action) => command(["release", action], `${action} releases.`, {
          risk: action === "create" ? "write" : "read",
          supportsData: action === "create"
        })
      ),
      command(["release", "approval"], "Request, approve, or reject a release.", { risk: "write" }),
      command(["release", "publish"], "Promote a release to an environment.", { risk: "write" }),
      command(["release", "unpublish"], "Unpublish an environment.", { risk: "write" }),
      command(["release", "rollback"], "Roll back an environment.", { risk: "write" }),
      command(["share", "list"], "List share links."),
      command(["share", "create"], "Create a share link.", { risk: "write" }),
      command(["share", "revoke"], "Revoke a share link.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true
      }),
      command(["capability", "list"], "List requested and approved capabilities."),
      command(["capability", "grant"], "Approve a capability grant.", {
        risk: "write",
        supportsData: true
      }),
      command(["capability", "revoke"], "Revoke a capability grant.", {
        risk: "destructive",
        requiresYes: true
      }),
      command(["surface", "get"], "Get release surface settings."),
      command(["surface", "set"], "Update release surface settings.", { risk: "write", supportsData: true }),
      command(["version", "list"], "List work versions."),
      command(["version", "restore"], "Restore a version.", { risk: "write" }),
      command(["version", "compare"], "Compare versions."),
      command(["commands"], "Print command manifest.", { auth: "none" }),
      command(["completion"], "Generate shell completion.", { auth: "none" })
    ]
  };
}
function printCompletion(io, shell) {
  const words = [
    "auth",
    "workspace",
    "work",
    "works",
    "data",
    "release",
    "share",
    "capability",
    "surface",
    "version",
    "commands",
    "completion"
  ];
  if (shell === "fish") {
    io.stdout(`complete -c mere-works -f -a "${words.join(" ")}"
`);
    return;
  }
  if (shell === "zsh") {
    io.stdout(`#compdef mere-works
_arguments '1:command:(${words.join(" ")})'
`);
    return;
  }
  io.stdout(`complete -W "${words.join(" ")}" mere-works
`);
}
function openUrl(url) {
  try {
    const child = spawn2(process.platform === "darwin" ? "open" : "xdg-open", [url], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
async function readJsonInput(parsed, options = {}) {
  const inline = flag(parsed, "data");
  const file = flag(parsed, "data-file");
  if (inline !== void 0 && file !== void 0) {
    throw new CliError("Use only one of --data or --data-file.", 2);
  }
  if (inline !== void 0) return parseJson2(inline, "--data");
  if (file !== void 0) return parseJson2(await readFile2(file, "utf8"), `--data-file ${file}`);
  if (options.required) {
    throw new CliError("JSON payload required. Use --data or --data-file.", 2);
  }
  return void 0;
}
function parseJson2(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new CliError(`${label} must be valid JSON.`, 2);
  }
}
function objectValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}
function requireArg(values, index, label) {
  const value = values[index]?.trim();
  if (!value) throw new CliError(`${label} is required.`, 2);
  return value;
}
function requireFlag(parsed, name) {
  const value = flag(parsed, name)?.trim();
  if (!value) throw new CliError(`Option --${name} is required.`, 2);
  return value;
}
function ensureConfirmed(parsed, id, action) {
  if (!boolFlag(parsed, "yes") || flag(parsed, "confirm") !== id) {
    throw new CliError(`Refusing to ${action}. Re-run with --yes --confirm ${id}.`, 2);
  }
}
async function fetchJson2(io, baseUrl, path2, options = {}) {
  const url = new URL(path2, normalizeBaseUrl2(baseUrl));
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== void 0 && value !== null) url.searchParams.set(key, String(value));
  }
  const token = options.token ?? options.session?.accessToken;
  const response = await io.fetchImpl(url, {
    method: options.method ?? (options.body === void 0 ? "GET" : "POST"),
    headers: {
      ...token ? { authorization: `Bearer ${token}` } : {},
      ...options.body === void 0 ? {} : { "content-type": "application/json" }
    },
    body: options.body === void 0 ? void 0 : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message = payload?.error ?? payload?.message ?? `Request failed (${response.status})`;
    throw new HttpError(message, response.status);
  }
  return payload;
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeMaybeJson(io, parsed, value, renderText) {
  if (boolFlag(parsed, "json")) {
    writeJson(io, value);
  } else {
    io.stdout(renderText());
  }
}
function renderSession(session) {
  const workspace = session.workspace ? `${session.workspace.name} (${session.workspace.slug})` : "No active workspace";
  return `Signed in as ${session.user.email}
Workspace: ${workspace}
Session: ${sessionFilePath()}`;
}
async function requireSession(parsed, io) {
  const stored = await loadSession(io.env);
  if (!stored) {
    throw new CliError("Not signed in. Run: mere-works auth login", 3);
  }
  const session = await ensureActiveSession(stored, {
    workspace: flag(parsed, "workspace") ?? null,
    fetchImpl: io.fetchImpl,
    env: io.env
  });
  return { session };
}
function renderWorkspaceList(session) {
  if (session.workspaces.length === 0) return "No workspaces available.\n";
  return session.workspaces.map((workspace) => {
    const marker = workspace.id === session.workspace?.id ? "*" : " ";
    return `${marker} ${workspace.id}	${workspace.role}	${workspace.slug}	${workspace.name}`;
  }).join("\n").concat("\n");
}
function renderWorks(payload) {
  const works = payload.works ?? [];
  if (works.length === 0) return "No works found.\n";
  return works.map(
    (work) => [
      String(work.slug ?? work.id ?? ""),
      String(work.status ?? ""),
      String(work.trustState ?? ""),
      String(work.displayName ?? "")
    ].join("	")
  ).join("\n").concat("\n");
}
function renderWork(payload) {
  const work = payload.work;
  if (!work) return "Work not found.\n";
  const lines = [
    `ID: ${String(work.id ?? "")}`,
    `Slug: ${String(work.slug ?? "")}`,
    `Name: ${String(work.displayName ?? "")}`,
    `Status: ${String(work.status ?? "")}`,
    `Trust: ${String(work.trustState ?? "")}`,
    `Visibility: ${String(work.visibility ?? "")}`,
    work.publishedReleaseId ? `Published release: ${String(work.publishedReleaseId)}` : null
  ].filter((line) => Boolean(line));
  if (payload.data !== void 0) lines.push(`Data: ${JSON.stringify(payload.data)}`);
  return `${lines.join("\n")}
`;
}
function renderReleases(payload) {
  const releases = payload.releases ?? [];
  if (releases.length === 0) return "No releases found.\n";
  return releases.map(
    (release) => [
      String(release.id ?? ""),
      String(release.approvalStatus ?? ""),
      Array.isArray(release.publishedEnvironments) ? release.publishedEnvironments.join(",") : "",
      String(release.name ?? ""),
      String(release.createdAt ?? "")
    ].join("	")
  ).join("\n").concat("\n");
}
function renderShareLinks(payload, baseUrl) {
  const links = payload.shareLinks ?? [];
  if (links.length === 0) return "No share links found.\n";
  return links.map((link) => {
    const token = String(link.token ?? "");
    const kind = String(link.kind ?? "");
    const path2 = kind === "popup" ? `/embed/${token}.js` : kind === "embed" ? `/embed/${token}` : `/share/${token}`;
    return [
      String(link.id ?? ""),
      kind,
      String(link.accessMode ?? ""),
      link.revokedAt ? "revoked" : "active",
      new URL(path2, normalizeBaseUrl2(baseUrl)).toString()
    ].join("	");
  }).join("\n").concat("\n");
}
async function resolveWorkId(active, parsed, io, positional) {
  const explicitSlug = flag(parsed, "slug");
  if (explicitSlug) {
    const payload = await fetchJson2(
      io,
      requestBaseUrl(parsed, io, active.session),
      `/api/works/by-slug/${encodeURIComponent(explicitSlug)}`,
      { session: active.session }
    );
    if (!payload.work?.id) throw new CliError(`Work not found for slug ${explicitSlug}.`, 1);
    return payload.work.id;
  }
  const value = positional?.trim();
  if (!value) throw new CliError("Work id is required.", 2);
  return value;
}
async function handleAuth(command, parsed, io) {
  if (command === "login") {
    const session = await loginWithBrowser2({
      baseUrl: flag(parsed, "base-url") ?? defaultBaseUrl(io.env),
      workspace: flag(parsed, "workspace"),
      fetchImpl: io.fetchImpl,
      notify: (message) => io.stdout(`${message}
`),
      env: io.env
    });
    writeMaybeJson(io, parsed, session, () => `${renderSession(session)}
`);
    return 0;
  }
  if (command === "logout") {
    const loggedOut = await logoutRemote({ fetchImpl: io.fetchImpl, env: io.env });
    io.stdout(`${loggedOut ? "Logged out." : "No local session found."}
`);
    return 0;
  }
  if (command === "whoami" || command === "status") {
    const active = await requireSession(parsed, io);
    writeMaybeJson(io, parsed, active.session, () => `${renderSession(active.session)}
`);
    return 0;
  }
  throw new CliError(`Unknown auth command: ${command ?? "(missing)"}`, 2);
}
async function handleWorkspace(args, parsed, io) {
  const command = args[0];
  if (command === "list") {
    const active = await requireSession(parsed, io);
    writeMaybeJson(io, parsed, active.session.workspaces, () => renderWorkspaceList(active.session));
    return 0;
  }
  if (command === "current") {
    const active = await requireSession(parsed, io);
    writeMaybeJson(
      io,
      parsed,
      active.session.workspace,
      () => active.session.workspace ? `${active.session.workspace.id}	${active.session.workspace.role}	${active.session.workspace.slug}	${active.session.workspace.name}
` : "No active workspace.\n"
    );
    return 0;
  }
  if (command === "use") {
    const selector = requireArg(args, 1, "Workspace id, slug, or host");
    const stored = await loadSession(io.env);
    if (!stored) throw new CliError("Not signed in. Run: mere-works auth login", 3);
    const selected = requireWorkspaceSelection(stored.workspaces, selector);
    const refreshed = await ensureActiveSession(stored, {
      workspace: selected.id,
      fetchImpl: io.fetchImpl,
      env: io.env
    });
    const next = { ...refreshed, defaultWorkspaceId: selected.id };
    await saveSession(next, io.env);
    writeMaybeJson(
      io,
      parsed,
      next.workspace,
      () => next.workspace ? `Using ${next.workspace.name} (${next.workspace.slug}).
` : `Using ${selected.name} (${selected.slug}).
`
    );
    return 0;
  }
  if (command === "provision" || command === "bootstrap" || command === "sync") {
    const workspaceId = requireFlag(parsed, "workspace");
    const payload = objectValue(await readJsonInput(parsed));
    const result = await fetchJson2(
      io,
      requestBaseUrl(parsed, io),
      `/api/internal/zerosmb/workspaces/${encodeURIComponent(workspaceId)}/${command}`,
      { method: "POST", token: internalToken(parsed, io), body: payload }
    );
    writeMaybeJson(io, parsed, result, () => `${JSON.stringify(result, null, 2)}
`);
    return 0;
  }
  if (command === "disconnect") {
    const workspaceId = requireFlag(parsed, "workspace");
    ensureConfirmed(parsed, workspaceId, "disconnect workspace");
    const result = await fetchJson2(
      io,
      requestBaseUrl(parsed, io),
      `/api/internal/zerosmb/workspaces/${encodeURIComponent(workspaceId)}/connection`,
      { method: "DELETE", token: internalToken(parsed, io) }
    );
    writeMaybeJson(io, parsed, result, () => `${JSON.stringify(result, null, 2)}
`);
    return 0;
  }
  if (command === "command") {
    const workspaceId = requireFlag(parsed, "workspace");
    const remoteCommand = requireArg(args, 1, "Workspace command");
    if (!boolFlag(parsed, "yes")) {
      throw new CliError(`Refusing to run workspace command ${remoteCommand}. Re-run with --yes.`, 2);
    }
    const body = {
      ...objectValue(await readJsonInput(parsed)),
      ...commandBodyFlags(parsed)
    };
    const result = await fetchJson2(
      io,
      requestBaseUrl(parsed, io),
      `/api/internal/zerosmb/workspaces/${encodeURIComponent(workspaceId)}/commands/${encodeURIComponent(remoteCommand)}`,
      { method: "POST", token: internalToken(parsed, io), body }
    );
    writeMaybeJson(io, parsed, result, () => `${JSON.stringify(result, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown workspace command: ${command ?? "(missing)"}`, 2);
}
function commandBodyFlags(parsed) {
  const pairs = [
    ["prompt", "prompt"],
    ["user-context", "userContext"],
    ["actor-user", "actorUserId"],
    ["actor-label", "actorLabel"],
    ["actor-role", "actorRole"],
    ["work", "workId"],
    ["work-id", "workId"],
    ["release", "releaseId"],
    ["release-id", "releaseId"],
    ["name", "name"],
    ["notes", "notes"],
    ["note", "note"],
    ["environment", "environment"],
    ["kind", "kind"]
  ];
  const body = {};
  for (const [flagName, bodyName] of pairs) {
    const value = flag(parsed, flagName);
    if (value !== void 0) body[bodyName] = value;
  }
  return body;
}
async function handleWork(args, parsed, io) {
  const command = args[0] ?? "list";
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  if (command === "list") {
    const payload = await fetchJson2(io, baseUrl, "/api/works", {
      session: active.session
    });
    writeMaybeJson(io, parsed, payload, () => renderWorks(payload));
    return 0;
  }
  if (command === "get") {
    const workId = await resolveWorkId(active, parsed, io, args[1]);
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}`,
      { session: active.session }
    );
    writeMaybeJson(io, parsed, payload, () => renderWork(payload));
    return 0;
  }
  if (command === "create") {
    const body = await readJsonInput(parsed, { required: true });
    const payload = await fetchJson2(io, baseUrl, "/api/works", {
      method: "POST",
      session: active.session,
      body
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "update") {
    const workId = await resolveWorkId(active, parsed, io, args[1]);
    const updates = await readJsonInput(parsed, { required: true });
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}`, {
      method: "POST",
      session: active.session,
      body: { intent: "updateWork", updates }
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "delete") {
    const workId = await resolveWorkId(active, parsed, io, args[1]);
    ensureConfirmed(parsed, workId, "delete work");
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}`, {
      method: "DELETE",
      session: active.session
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "open") {
    const slug = args[1] ?? flag(parsed, "slug");
    const target = new URL(slug ? `/my/${encodeURIComponent(slug)}` : "/my", baseUrl).toString();
    if (openUrl(target)) io.stdout(`Opened ${target}
`);
    else io.stdout(`${target}
`);
    return 0;
  }
  throw new CliError(`Unknown work command: ${command}`, 2);
}
async function handleData(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  if (command === "get") {
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}`, {
      session: active.session
    });
    writeMaybeJson(io, parsed, payload.data, () => `${JSON.stringify(payload.data ?? {}, null, 2)}
`);
    return 0;
  }
  if (command === "update" || command === "initialize") {
    const body = await readJsonInput(parsed, { required: true });
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}`, {
      method: "POST",
      session: active.session,
      body: command === "update" ? { intent: "update", patch: body } : { intent: "initialize", schema: body }
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "append") {
    const collection = requireFlag(parsed, "collection");
    const item = await readJsonInput(parsed, { required: true });
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}`, {
      method: "POST",
      session: active.session,
      body: { intent: "append", collection, item }
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown data command: ${command ?? "(missing)"}`, 2);
}
async function handleRelease(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  if (command === "list") {
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/releases`,
      { session: active.session }
    );
    writeMaybeJson(io, parsed, payload, () => renderReleases(payload));
    return 0;
  }
  if (command === "create") {
    const body = {
      ...objectValue(await readJsonInput(parsed)),
      ...flag(parsed, "name") ? { name: flag(parsed, "name") } : {},
      ...flag(parsed, "notes") ? { notes: flag(parsed, "notes") } : {},
      ...flag(parsed, "source-version") ? { sourceVersionId: flag(parsed, "source-version") } : {}
    };
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}/releases`, {
      method: "POST",
      session: active.session,
      body
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "approval") {
    const releaseId = requireArg(args, 2, "Release id");
    const action = requireArg(args, 3, "Approval action");
    if (!["request", "approve", "reject"].includes(action)) {
      throw new CliError("Approval action must be request, approve, or reject.", 2);
    }
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/releases/${encodeURIComponent(releaseId)}/approval`,
      {
        method: "POST",
        session: active.session,
        body: { action, note: flag(parsed, "note") }
      }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "publish") {
    const releaseId = requireArg(args, 2, "Release id");
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/releases/${encodeURIComponent(releaseId)}/publish`,
      {
        method: "POST",
        session: active.session,
        body: { environment: flag(parsed, "environment") ?? "production" }
      }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "unpublish") {
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/releases/unpublish`,
      {
        method: "POST",
        session: active.session,
        body: { environment: flag(parsed, "environment") ?? "production" }
      }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "rollback") {
    const environment = flag(parsed, "environment") ?? "production";
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/environments/${encodeURIComponent(environment)}/rollback`,
      { method: "POST", session: active.session, body: {} }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown release command: ${command ?? "(missing)"}`, 2);
}
async function handleShare(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  if (command === "list") {
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/share-links`,
      { session: active.session }
    );
    writeMaybeJson(io, parsed, payload, () => renderShareLinks(payload, baseUrl));
    return 0;
  }
  if (command === "create") {
    const releaseId = flag(parsed, "release") ?? flag(parsed, "release-id") ?? args[2];
    if (!releaseId) throw new CliError("Release id is required via --release or positional arg.", 2);
    const body = {
      releaseId,
      kind: flag(parsed, "kind") ?? "hosted",
      ...flag(parsed, "access-mode") ? { accessMode: flag(parsed, "access-mode") } : {}
    };
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/share-links`,
      { method: "POST", session: active.session, body }
    );
    writeMaybeJson(io, parsed, payload, () => renderShareLinks(payload, baseUrl));
    return 0;
  }
  if (command === "revoke") {
    const linkId = requireArg(args, 2, "Share link id");
    ensureConfirmed(parsed, linkId, "revoke share link");
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/share-links/${encodeURIComponent(linkId)}/revoke`,
      { method: "POST", session: active.session, body: {} }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown share command: ${command ?? "(missing)"}`, 2);
}
async function handleCapability(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  if (command === "list") {
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}/capabilities`, {
      session: active.session
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "grant") {
    const capability = flag(parsed, "capability") ?? args[2];
    if (!capability) throw new CliError("Capability is required.", 2);
    const bindingConfig = await readJsonInput(parsed);
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/capabilities`,
      {
        method: "POST",
        session: active.session,
        body: { capability, ...bindingConfig === void 0 ? {} : { bindingConfig } }
      }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "revoke") {
    const capability = flag(parsed, "capability") ?? args[2];
    if (!capability) throw new CliError("Capability is required.", 2);
    ensureConfirmed(parsed, capability, "revoke capability");
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/capabilities/${encodeURIComponent(capability)}/revoke`,
      { method: "POST", session: active.session, body: {} }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown capability command: ${command ?? "(missing)"}`, 2);
}
async function handleSurface(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  const releaseId = flag(parsed, "release") ?? flag(parsed, "release-id") ?? args[2];
  if (!releaseId) throw new CliError("Release id is required via --release or positional arg.", 2);
  if (command === "get") {
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}/surface`, {
      session: active.session,
      query: { releaseId }
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "set") {
    const body = { releaseId, ...objectValue(await readJsonInput(parsed, { required: true })) };
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}/surface`, {
      method: "POST",
      session: active.session,
      body
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown surface command: ${command ?? "(missing)"}`, 2);
}
async function handleVersion(args, parsed, io) {
  const command = args[0];
  const active = await requireSession(parsed, io);
  const baseUrl = requestBaseUrl(parsed, io, active.session);
  const workId = await resolveWorkId(active, parsed, io, args[1]);
  if (command === "list") {
    const payload = await fetchJson2(io, baseUrl, `/api/works/${encodeURIComponent(workId)}/versions`, {
      session: active.session
    });
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "restore") {
    const versionId = requireArg(args, 2, "Version id");
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/versions/${encodeURIComponent(versionId)}/restore`,
      { method: "POST", session: active.session, body: {} }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  if (command === "compare") {
    const base = flag(parsed, "base") ?? args[2];
    if (!base) throw new CliError("Base version id is required.", 2);
    const payload = await fetchJson2(
      io,
      baseUrl,
      `/api/works/${encodeURIComponent(workId)}/versions/compare`,
      { session: active.session, query: { base, target: flag(parsed, "target") ?? args[3] ?? "current" } }
    );
    writeMaybeJson(io, parsed, payload, () => `${JSON.stringify(payload, null, 2)}
`);
    return 0;
  }
  throw new CliError(`Unknown version command: ${command ?? "(missing)"}`, 2);
}
async function runCli(argv, io) {
  try {
    const parsed = parseArgs(argv);
    const [group, command, ...rest] = parsed.positionals;
    if (!group || boolFlag(parsed, "help")) {
      printHelp(io);
      return 0;
    }
    if (boolFlag(parsed, "version")) {
      io.stdout("mere-works 1.0.0\n");
      return 0;
    }
    if (group === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    if (group === "completion") {
      printCompletion(io, command ?? "bash");
      return 0;
    }
    if (group === "auth") return await handleAuth(command, parsed, io);
    if (group === "workspace") return await handleWorkspace([command ?? "", ...rest], parsed, io);
    if (group === "work" || group === "works") return await handleWork([command ?? "list", ...rest], parsed, io);
    if (group === "list") return await handleWork(["list"], parsed, io);
    if (group === "open") return await handleWork(["open", command ?? ""], parsed, io);
    if (group === "whoami") return await handleAuth("whoami", parsed, io);
    if (group === "data") return await handleData([command ?? "", ...rest], parsed, io);
    if (group === "release") return await handleRelease([command ?? "", ...rest], parsed, io);
    if (group === "share") return await handleShare([command ?? "", ...rest], parsed, io);
    if (group === "capability") return await handleCapability([command ?? "", ...rest], parsed, io);
    if (group === "surface") return await handleSurface([command ?? "", ...rest], parsed, io);
    if (group === "version") return await handleVersion([command ?? "", ...rest], parsed, io);
    throw new CliError(`Unknown command: ${parsed.positionals.join(" ")}`, 2);
  } catch (error) {
    const exitCode = error instanceof CliError ? error.exitCode : 1;
    io.stderr(`${error instanceof Error ? error.message : String(error)}
`);
    return exitCode;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  const exitCode = await runCli(process.argv.slice(2), {
    env: process.env,
    fetchImpl: fetch,
    stdout: (text) => stdout(text),
    stderr: (text) => stderr(text)
  });
  process.exitCode = exitCode;
}
export {
  runCli
};
