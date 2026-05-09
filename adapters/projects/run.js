#!/usr/bin/env node

// cli/projects.ts
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/client.ts
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
  return new Promise((resolve2, reject) => {
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
          resolve2(await postJson(input.fetchImpl, exchangeUrl, { requestId, code }));
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
var APP_NAME = "mere-projects";
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
    productLabel: "mere-projects"
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

// cli/projects.ts
var DEFAULT_BASE_URL = process.env.PROJECTS_BASE_URL?.trim() || process.env.PASTPERF_BASE_URL?.trim() || "https://projects.meresmb.com";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "featured",
  "help",
  "json",
  "no-interactive",
  "not-ongoing",
  "ongoing",
  "override",
  "refresh-sources",
  "version",
  "yes"
]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["y", "yes"]
]);
var MIME_BY_EXTENSION = /* @__PURE__ */ new Map([
  [".csv", "text/csv"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".txt", "text/plain"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
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
    const token = argv[index] ?? "";
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
      const value = inlineValue ?? argv[index + 1];
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
function hasFlag(parsed, name) {
  return parsed.flags[name] !== void 0;
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
function numberOption(value, label) {
  if (value === void 0) return void 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new CliError(`${label} must be a number.`, 2);
  return parsed;
}
function splitList(values) {
  const normalized = /* @__PURE__ */ new Set();
  for (const value of values) {
    for (const part of value.split(",")) {
      const item = part.trim();
      if (item) normalized.add(item);
    }
  }
  return [...normalized];
}
function setIfDefined(target, key, value) {
  if (value !== void 0) target[key] = value;
}
function setStringFlag(target, key, parsed, ...names) {
  const value = readFlag(parsed, ...names);
  if (value !== void 0) target[key] = value;
}
function setListFlag(target, key, parsed, ...names) {
  const values = splitList(readFlagValues(parsed, ...names));
  if (values.length > 0) target[key] = values;
}
function setBooleanPair(target, key, parsed, trueFlag, falseFlag) {
  if (readBooleanFlag(parsed, trueFlag)) target[key] = true;
  if (readBooleanFlag(parsed, falseFlag)) target[key] = false;
}
async function readJsonBody(parsed) {
  const inline = readFlag(parsed, "data");
  const file = readFlag(parsed, "data-file");
  if (inline && file) throw new CliError("Use either --data or --data-file, not both.", 2);
  if (inline) return objectValue(parseJsonOption(inline, "--data"));
  if (file) return objectValue(JSON.parse(await readFile2(file, "utf8")));
  return {};
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
    app: "mere-projects",
    namespace: "projects",
    aliases: ["mere-projects", "projects", "pastperf"],
    auth: { kind: "browser" },
    baseUrlEnv: ["PROJECTS_BASE_URL", "PASTPERF_BASE_URL"],
    sessionPath: "~/.local/state/mere-projects/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List available workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show the current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a default workspace.", { auth: "session", risk: "write" }),
      ...["list", "get"].map((action) => manifestCommand(["project", action], `Project ${action}.`, { auditDefault: action === "list" })),
      ...["create", "update"].map((action) => manifestCommand(["project", action], `Project ${action}.`, { risk: "write", supportsData: true })),
      manifestCommand(["project", "archive"], "Archive a project.", { risk: "destructive", requiresYes: true }),
      manifestCommand(["project", "delete"], "Permanently delete a project.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      ...["contact", "knowledge", "link"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource} records.`),
        manifestCommand([resource, "upsert"], `Upsert a ${resource} record.`, { risk: "write", supportsData: true }),
        manifestCommand([resource, "delete"], `Delete a ${resource} record.`, { risk: "destructive", requiresYes: true, requiresConfirm: true })
      ]),
      manifestCommand(["file", "list"], "List files."),
      manifestCommand(["file", "upload"], "Upload file.", { risk: "write" }),
      manifestCommand(["file", "download"], "Download file."),
      manifestCommand(["file", "delete"], "Delete file.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      ...["profile", "proposal"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource} records.`),
        manifestCommand([resource, "get"], `Get a ${resource} record.`),
        manifestCommand([resource, "create"], `Create a ${resource} record.`, { risk: "write", supportsData: true }),
        manifestCommand([resource, "update"], `Update a ${resource} record.`, { risk: "write", supportsData: true }),
        manifestCommand([resource, "delete"], `Delete a ${resource} record.`, { risk: "destructive", requiresYes: true, requiresConfirm: true })
      ]),
      manifestCommand(["proposal", "draft"], "Draft proposal.", { risk: "write", supportsData: true }),
      manifestCommand(["proposal", "generate-draft"], "Generate proposal draft.", { risk: "write", supportsData: true }),
      manifestCommand(["proposal", "analysis"], "Show proposal analysis."),
      manifestCommand(["proposal", "analyze"], "Analyze proposal.", { risk: "write", supportsData: true }),
      manifestCommand(["proposal", "readiness"], "Show proposal submission readiness."),
      manifestCommand(["proposal", "review"], "Run proposal submission readiness review.", { risk: "write" }),
      manifestCommand(["proposal", "claims"], "List proposal claim ledger entries."),
      manifestCommand(["proposal", "findings"], "List proposal readiness findings."),
      manifestCommand(["proposal", "exports"], "List proposal export history."),
      manifestCommand(["proposal", "export"], "Export proposal artifact.", { risk: "write" }),
      manifestCommand(["proposal", "defaults"], "List proposal defaults."),
      manifestCommand(["proposal", "defaults", "upload"], "Upload proposal default file.", { risk: "write" }),
      manifestCommand(["proposal", "defaults", "download"], "Download proposal default file."),
      manifestCommand(["proposal", "defaults", "delete"], "Delete proposal default file.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["proposal", "defaults", "extract"], "Refresh proposal default structured output.", { risk: "write" }),
      manifestCommand(["proposal", "defaults", "structured"], "List proposal default structured outputs."),
      manifestCommand(["source", "list"], "List sources."),
      manifestCommand(["source", "get"], "Get source."),
      manifestCommand(["source", "upsert"], "Upsert source.", { risk: "write", supportsData: true }),
      manifestCommand(["source", "patch"], "Patch source.", { risk: "write", supportsData: true }),
      manifestCommand(["source", "capture"], "Capture source.", { risk: "write", supportsData: true }),
      manifestCommand(["sam", "search"], "Search SAM opportunities.", { auth: "none" }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
function printHelp(write) {
  write(`mere-projects CLI (aliases: projects, pastperf)

Usage:
  mere-projects auth login [--base-url https://projects.meresmb.com] [--workspace id|slug|host]
  mere-projects auth whoami [--json]
  mere-projects workspace list|current|use
  mere-projects completion [bash|zsh|fish]

  mere-projects [global flags] <resource> <action> [args] [flags]

Global flags:
  --base-url <url>        Base URL for auth login (default: PROJECTS_BASE_URL or production)
  --workspace <id|slug|host>
                          Target workspace for login or this command
  --json                  Print JSON
  --yes                   Confirm destructive commands
  --confirm <id>          Exact id required for permanent deletes
  --help, -h              Show help
  --version               Show CLI version

Resources:
  project list|get|create|update|archive|delete
  contact list|upsert|delete --project <projectId>
  knowledge list|upsert|delete --project <projectId>
  link list|upsert|delete --project <projectId>
  file list|upload|download|delete --project <projectId>
  profile list|get|create|update|delete
  proposal list|get|create|update|delete|draft|generate-draft|analysis|analyze
  proposal readiness|review|claims|findings|exports|export <proposalId>
  proposal defaults [list|upload|download|delete|extract|structured]
  source list|get|upsert|patch|capture
  sam search [--api-key-env <name>] [--keyword <term>]

Input:
  Mutating JSON commands accept --data '<json>' or --data-file payload.json.
  Common project/profile/proposal fields also have flags such as --title, --client,
  --role, --date-start, --summary, --tag, --capability, and --linked-profile-id.
`);
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
function renderSessionSummary(session) {
  const workspace = session.workspace;
  return [
    `user: ${session.user.email}`,
    workspace ? `selected workspace: ${renderWorkspaceLabel(workspace)}` : "selected workspace: none",
    `available workspaces: ${session.workspaces.length}`,
    `session: ${sessionFilePath()}`
  ].join("\n");
}
function sessionOutput(session) {
  return {
    authenticated: true,
    version: session.version,
    user: session.user,
    workspace: session.workspace,
    defaultWorkspaceId: session.defaultWorkspaceId,
    workspaces: session.workspaces,
    baseUrl: session.baseUrl,
    expiresAt: session.expiresAt,
    sessionPath: sessionFilePath()
  };
}
async function ensureSession(parsed, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
  }
  const selector = readFlag(parsed, "workspace") ?? current.defaultWorkspaceId ?? current.workspace?.id;
  const targetWorkspace = current.workspaces.length > 0 ? requireWorkspaceSelection(current.workspaces, selector) : current.workspace;
  if (!targetWorkspace) {
    throw new CliError("No workspace is available in this session.", 3);
  }
  if (!sessionNeedsRefresh(current, targetWorkspace.id)) {
    return current;
  }
  const refreshed = await refreshRemoteSession({
    baseUrl: current.baseUrl,
    refreshToken: current.refreshToken,
    workspace: targetWorkspace.id,
    fetchImpl: io.fetchImpl
  });
  const session = mergeSessionPayload(current, refreshed, {
    baseUrl: current.baseUrl,
    persistDefaultWorkspace: false
  });
  await saveSession(session, io.env);
  return session;
}
async function switchWorkspace(selector, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
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
  "project",
  "contact",
  "knowledge",
  "link",
  "file",
  "profile",
  "proposal",
  "source",
  "sam",
  "completion"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-projects bash completion",
      "_mere_projects_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_projects_completion mere-projects pastperf projects",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-projects pastperf projects",
      "_mere_projects() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_projects "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-projects -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.", 2);
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
  if (!text) return `Request failed with status ${response.status}.`;
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
    body: options.body !== void 0 ? JSON.stringify(options.body) : options.rawBody
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
function queryFromFlags(parsed, mapping) {
  const query = {};
  for (const [flag, key] of mapping) {
    query[key] = readFlag(parsed, flag);
  }
  return query;
}
function requireDeleteConfirmation(parsed, noun, id) {
  if (!readBooleanFlag(parsed, "yes")) {
    throw new CliError(`Refusing to delete ${noun} ${id} without --yes.`, 2);
  }
  const confirm = readFlag(parsed, "confirm");
  if (confirm !== id) {
    throw new CliError(`Refusing to delete ${noun} ${id} without --confirm ${id}.`, 2);
  }
}
async function projectBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "kind", parsed, "kind");
  setIfDefined(body, "schemaVersion", numberOption(readFlag(parsed, "schema-version"), "Schema version"));
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "contractVehicle", parsed, "contract-vehicle");
  setStringFlag(body, "role", parsed, "role");
  setStringFlag(body, "dateStart", parsed, "date-start");
  setStringFlag(body, "dateEnd", parsed, "date-end");
  setBooleanPair(body, "isOngoing", parsed, "ongoing", "not-ongoing");
  setStringFlag(body, "description", parsed, "description");
  setStringFlag(body, "outcomes", parsed, "outcomes");
  setListFlag(body, "capabilities", parsed, "capability", "capabilities");
  setListFlag(body, "tags", parsed, "tag", "tags");
  setStringFlag(body, "status", parsed, "status");
  return body;
}
async function profileBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "projectId", parsed, "project", "project-id");
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "contractVehicle", parsed, "contract-vehicle");
  setStringFlag(body, "role", parsed, "role");
  setStringFlag(body, "dateStart", parsed, "date-start");
  setStringFlag(body, "dateEnd", parsed, "date-end");
  setBooleanPair(body, "isOngoing", parsed, "ongoing", "not-ongoing");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "relevance", parsed, "relevance");
  setStringFlag(body, "differentiators", parsed, "differentiators");
  setListFlag(body, "capabilityTags", parsed, "capability-tag", "capability");
  setListFlag(body, "featuredOutcomes", parsed, "featured-outcome", "outcome");
  setStringFlag(body, "referenceContactId", parsed, "reference-contact-id");
  setStringFlag(body, "referenceName", parsed, "reference-name");
  setStringFlag(body, "referenceTitle", parsed, "reference-title");
  setStringFlag(body, "referenceOrganization", parsed, "reference-organization");
  setStringFlag(body, "referenceLocation", parsed, "reference-location");
  setStringFlag(body, "referenceEmail", parsed, "reference-email");
  setStringFlag(body, "referencePhone", parsed, "reference-phone");
  setStringFlag(body, "visibility", parsed, "visibility");
  if (readBooleanFlag(parsed, "featured")) body.isFeatured = true;
  return body;
}
async function proposalBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "kind", parsed, "kind");
  setIfDefined(body, "schemaVersion", numberOption(readFlag(parsed, "schema-version"), "Schema version"));
  setStringFlag(body, "sourceItemId", parsed, "source-item", "source-item-id");
  setStringFlag(body, "externalReference", parsed, "external-reference");
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "solicitationNumber", parsed, "solicitation-number");
  setStringFlag(body, "businessDealId", parsed, "business-deal-id");
  setStringFlag(body, "dueDate", parsed, "due-date");
  setStringFlag(body, "stage", parsed, "stage");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "winThemes", parsed, "win-themes");
  setStringFlag(body, "requirements", parsed, "requirements");
  setListFlag(body, "linkedProfileIds", parsed, "linked-profile-id", "profile");
  return body;
}
async function sourceBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "sourceType", parsed, "source-type");
  setStringFlag(body, "externalId", parsed, "external-id");
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "organization", parsed, "organization");
  setStringFlag(body, "url", parsed, "url");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "dueDate", parsed, "due-date");
  setStringFlag(body, "status", parsed, "status");
  setIfDefined(body, "score", numberOption(readFlag(parsed, "score"), "Score"));
  setIfDefined(body, "raw", parseJsonOption(readFlag(parsed, "raw"), "--raw"));
  setIfDefined(body, "normalized", parseJsonOption(readFlag(parsed, "normalized"), "--normalized"));
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  return body;
}
function samBody(parsed, env) {
  const body = objectValue(parseJsonOption(readFlag(parsed, "data"), "--data"));
  if (hasFlag(parsed, "api-key")) {
    throw new CliError("Do not pass SAM API keys in argv. Use SAM_API_KEY or --api-key-env.", 2);
  }
  if (typeof body.apiKey === "string") {
    throw new CliError("Do not pass SAM API keys in --data. Use SAM_API_KEY or --api-key-env.", 2);
  }
  const apiKeyEnvName = readFlag(parsed, "api-key-env") ?? "SAM_API_KEY";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnvName)) {
    throw new CliError("--api-key-env must be an environment variable name.", 2);
  }
  const apiKey = env[apiKeyEnvName]?.trim();
  if (!apiKey) {
    throw new CliError(`Set ${apiKeyEnvName} or choose another variable with --api-key-env.`, 2);
  }
  body.apiKey = apiKey;
  setStringFlag(body, "keyword", parsed, "keyword", "query");
  setListFlag(body, "naicsCodes", parsed, "naics", "naics-code");
  setStringFlag(body, "setAsideCode", parsed, "set-aside");
  setListFlag(body, "procurementTypes", parsed, "procurement-type");
  setIfDefined(body, "postedDays", numberOption(readFlag(parsed, "posted-days"), "Posted days"));
  setIfDefined(body, "limit", numberOption(readFlag(parsed, "limit"), "Limit"));
  setIfDefined(body, "offset", numberOption(readFlag(parsed, "offset"), "Offset"));
  return body;
}
async function handleProject(active, action, rest, parsed) {
  if (action === "list") {
    return requestJson(active, "/api/projects", {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["role", "role"],
        ["status", "status"],
        ["client", "client"]
      ])
    });
  }
  if (action === "get") {
    return requestJson(active, `/api/projects/${encodeURIComponent(firstPositional(rest, "project id"))}`);
  }
  if (action === "create") {
    return requestJson(active, "/api/projects", { method: "POST", body: await projectBody(parsed) });
  }
  if (action === "update") {
    const id = firstPositional(rest, "project id");
    const bundle = objectValue(
      await requestJson(active, `/api/projects/${encodeURIComponent(id)}`)
    );
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.project), ...await projectBody(parsed) }
    });
  }
  if (action === "archive") {
    const id = firstPositional(rest, "project id");
    const bundle = objectValue(
      await requestJson(active, `/api/projects/${encodeURIComponent(id)}`)
    );
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.project), status: "archived" }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "project id");
    requireDeleteConfirmation(parsed, "project", id);
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown project action: ${action}`, 2);
}
async function handleProjectChild(active, resource, action, parsed) {
  const projectId = requireFlag(parsed, "project");
  const route = resource === "contact" ? "contacts" : resource === "knowledge" ? "knowledge" : "links";
  const path2 = `/api/projects/${encodeURIComponent(projectId)}/${route}`;
  if (action === "list") return requestJson(active, path2);
  if (action === "upsert" || action === "save") {
    const body = await readJsonBody(parsed);
    if (resource === "contact") {
      setStringFlag(body, "id", parsed, "id");
      setStringFlag(body, "name", parsed, "name");
      setStringFlag(body, "title", parsed, "title");
      setStringFlag(body, "organization", parsed, "organization");
      setStringFlag(body, "location", parsed, "location");
      setStringFlag(body, "email", parsed, "email");
      setStringFlag(body, "phone", parsed, "phone");
      setStringFlag(body, "kind", parsed, "kind");
    } else if (resource === "knowledge") {
      setStringFlag(body, "id", parsed, "id");
      setStringFlag(body, "entryType", parsed, "entry-type");
      setStringFlag(body, "title", parsed, "title");
      setStringFlag(body, "content", parsed, "content");
      setListFlag(body, "tags", parsed, "tag", "tags");
    } else {
      setStringFlag(body, "id", parsed, "id");
      setStringFlag(body, "label", parsed, "label");
      setStringFlag(body, "url", parsed, "url");
      setStringFlag(body, "kind", parsed, "kind");
    }
    return requestJson(active, path2, { method: "POST", body });
  }
  if (action === "delete") {
    const id = requireFlag(parsed, "id");
    requireDeleteConfirmation(parsed, resource, id);
    return requestJson(active, path2, { method: "DELETE", body: { id } });
  }
  throw new CliError(`Unknown ${resource} action: ${action}`, 2);
}
function mimeTypeForPath(pathname) {
  const lower = pathname.toLowerCase();
  const extension = [...MIME_BY_EXTENSION.keys()].find((suffix) => lower.endsWith(suffix));
  return extension && MIME_BY_EXTENSION.get(extension) || "application/octet-stream";
}
function filenameFromDisposition(value) {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return value.match(/filename="([^"]+)"/i)?.[1] ?? value.match(/filename=([^;]+)/i)?.[1]?.trim() ?? null;
}
async function saveResponse(response, outputPath, fallbackFilename) {
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = basename(filenameFromDisposition(response.headers.get("content-disposition")) ?? fallbackFilename);
  const target = resolve(outputPath ?? filename);
  await mkdir2(dirname(target), { recursive: true });
  await writeFile2(target, bytes);
  return {
    path: target,
    filename,
    size: bytes.byteLength,
    contentType: response.headers.get("content-type")
  };
}
async function handleFile(active, action, rest, parsed) {
  const projectId = requireFlag(parsed, "project");
  const basePath = `/api/projects/${encodeURIComponent(projectId)}/files`;
  if (action === "list") return requestJson(active, basePath);
  if (action === "upload") {
    const filePath = requireFlag(parsed, "path");
    const bytes = await readFile2(filePath);
    const form = new FormData();
    form.set("kind", readFlag(parsed, "kind") ?? "general");
    form.set("file", new File([bytes], basename(filePath), { type: mimeTypeForPath(filePath) }));
    return requestJson(active, basePath, { method: "POST", rawBody: form });
  }
  if (action === "download") {
    const fileId = firstPositional(rest, "file id");
    const response = await requestRaw(
      active,
      `${basePath}/${encodeURIComponent(fileId)}`
    );
    return saveResponse(response, readFlag(parsed, "output"), `${fileId}.bin`);
  }
  if (action === "delete") {
    const fileId = firstPositional(rest, "file id");
    requireDeleteConfirmation(parsed, "file", fileId);
    return requestJson(active, `${basePath}/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown file action: ${action}`, 2);
}
async function handleProfile(active, action, rest, parsed) {
  const base = "/api/past-performance";
  if (action === "list") {
    return requestJson(active, base, {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["role", "role"],
        ["client", "client"],
        ["visibility", "visibility"],
        ["capability-tag", "capability_tag"]
      ])
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "profile id"))}`);
  if (action === "create") return requestJson(active, base, { method: "POST", body: await profileBody(parsed) });
  if (action === "update") {
    const id = firstPositional(rest, "profile id");
    const bundle = objectValue(await requestJson(active, `${base}/${encodeURIComponent(id)}`));
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.profile), ...await profileBody(parsed) }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "profile id");
    requireDeleteConfirmation(parsed, "profile", id);
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown profile action: ${action}`, 2);
}
async function handleProposalDefaults(active, rest, parsed) {
  const subaction = rest[0] ?? "list";
  const base = "/api/proposals/defaults";
  if (subaction === "list") return requestJson(active, base);
  if (subaction === "structured") {
    const payload = objectValue(await requestJson(active, base));
    return payload.structuredOutputs ?? [];
  }
  if (subaction === "upload") {
    const filePath = requireFlag(parsed, "path");
    const kind = requireFlag(parsed, "kind");
    const bytes = await readFile2(filePath);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", new File([bytes], basename(filePath), { type: mimeTypeForPath(filePath) }));
    return requestJson(active, `${base}/files`, { method: "POST", rawBody: form });
  }
  if (subaction === "download") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    const response = await requestRaw(active, `${base}/files/${encodeURIComponent(fileId)}`);
    return saveResponse(response, readFlag(parsed, "output"), `${fileId}.bin`);
  }
  if (subaction === "delete") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    requireDeleteConfirmation(parsed, "proposal default file", fileId);
    return requestJson(active, `${base}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  }
  if (subaction === "extract" || subaction === "refresh-structured") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    return requestJson(active, `${base}/files/${encodeURIComponent(fileId)}/structured-output`, {
      method: "POST"
    });
  }
  throw new CliError(`Unknown proposal defaults action: ${subaction}`, 2);
}
async function handleProposal(active, action, rest, parsed) {
  const base = "/api/proposals";
  if (action === "defaults" || action === "default") return handleProposalDefaults(active, rest, parsed);
  if (action === "list") {
    return requestJson(active, base, {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["client", "client"],
        ["stage", "stage"],
        ["business-deal-id", "business_deal_id"]
      ])
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "proposal id"))}`);
  if (action === "create") return requestJson(active, base, { method: "POST", body: await proposalBody(parsed) });
  if (action === "update") {
    const id = firstPositional(rest, "proposal id");
    const bundle = objectValue(await requestJson(active, `${base}/${encodeURIComponent(id)}`));
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.proposal), ...await proposalBody(parsed) }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "proposal id");
    requireDeleteConfirmation(parsed, "proposal", id);
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  if (action === "analysis") {
    return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "proposal id"))}/analysis`);
  }
  if (action === "analyze") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/analyze`, {
      method: "POST",
      query: { refreshSources: readBooleanFlag(parsed, "refresh-sources") ? "1" : void 0 }
    });
  }
  if (action === "readiness") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`);
  }
  if (action === "review") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`, { method: "POST" });
  }
  if (action === "claims" || action === "findings" || action === "exports") {
    const id = firstPositional(rest, "proposal id");
    const payload = objectValue(
      await requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`)
    );
    if (action === "exports") return payload.exports ?? [];
    const review = objectValue(payload.latestReview);
    return review[action] ?? [];
  }
  if (action === "export") {
    const id = firstPositional(rest, "proposal id");
    const format = (readFlag(parsed, "format") ?? "docx").toLowerCase();
    if (!["docx", "markdown", "md"].includes(format)) {
      throw new CliError("--format must be docx, markdown, or md.", 2);
    }
    const normalizedFormat = format === "md" ? "markdown" : format;
    const response = await requestRaw(active, `${base}/${encodeURIComponent(id)}/export`, {
      query: {
        format: normalizedFormat,
        override: readBooleanFlag(parsed, "override") ? "1" : void 0
      }
    });
    return saveResponse(
      response,
      readFlag(parsed, "output"),
      `${id}-proposal.${normalizedFormat === "docx" ? "docx" : "md"}`
    );
  }
  if (action === "draft") {
    const id = firstPositional(rest, "proposal id");
    const output = readFlag(parsed, "output");
    const markdown = output || ["markdown", "md"].includes((readFlag(parsed, "format") ?? "").toLowerCase());
    if (markdown) {
      const response = await requestRaw(active, `${base}/${encodeURIComponent(id)}/draft`, {
        query: { format: "markdown" }
      });
      return saveResponse(response, output, `${id}-draft.md`);
    }
    return requestJson(active, `${base}/${encodeURIComponent(id)}/draft`);
  }
  if (action === "generate-draft") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/draft`, {
      method: "POST",
      body: { sectionKey: readFlag(parsed, "section-key") ?? null }
    });
  }
  throw new CliError(`Unknown proposal action: ${action}`, 2);
}
async function handleSource(active, action, rest, parsed) {
  const base = "/api/sources/items";
  if (action === "list") {
    return requestJson(active, base, {
      query: {
        status: readFlag(parsed, "status"),
        source_type: readFlag(parsed, "source-type")
      }
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "source id"))}`);
  if (action === "upsert" || action === "save") {
    return requestJson(active, base, { method: "POST", body: await sourceBody(parsed) });
  }
  if (action === "patch") {
    const id = firstPositional(rest, "source id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status: requireFlag(parsed, "status") }
    });
  }
  if (action === "capture") {
    const id = firstPositional(rest, "source id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/capture`, { method: "POST" });
  }
  throw new CliError(`Unknown source action: ${action}`, 2);
}
async function dispatch(parsed, active, env) {
  const [resource, action, ...rest] = parsed.positionals;
  if (!resource || !action) {
    throw new CliError("A resource and action are required. Run `mere-projects --help`.", 2);
  }
  if (resource === "project" || resource === "projects") return handleProject(active, action, rest, parsed);
  if (resource === "contact" || resource === "contacts") return handleProjectChild(active, "contact", action, parsed);
  if (resource === "knowledge") return handleProjectChild(active, "knowledge", action, parsed);
  if (resource === "link" || resource === "links") return handleProjectChild(active, "link", action, parsed);
  if (resource === "file" || resource === "files") return handleFile(active, action, rest, parsed);
  if (resource === "profile" || resource === "profiles" || resource === "past-performance") {
    return handleProfile(active, action, rest, parsed);
  }
  if (resource === "proposal" || resource === "proposals") return handleProposal(active, action, rest, parsed);
  if (resource === "source" || resource === "sources") return handleSource(active, action, rest, parsed);
  if (resource === "sam" && action === "search") {
    return requestJson(active, "/api/sources/sam/opportunities", {
      method: "POST",
      body: samBody(parsed, env)
    });
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
  const columns = ["id", "title", "name", "client", "organization", "status", "stage", "role", "updatedAt"].filter((column) => rows.some((row) => row[column] !== void 0)).slice(0, 6);
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
  if (value && typeof value === "object" && "path" in value && "filename" in value && "size" in value) {
    const saved = value;
    return `Saved ${saved.filename} (${saved.size} bytes) to ${saved.path}`;
  }
  return JSON.stringify(value, null, 2);
}
function writeResult(io, parsed, result) {
  if (result === void 0 || result === "") return;
  io.stdout(`${readBooleanFlag(parsed, "json") ? JSON.stringify(result, null, 2) : renderHuman(result)}
`);
}
async function handleAuth(parsed, io) {
  const action = parsed.positionals[1];
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
  const action = parsed.positionals[1];
  const session = await loadSession(io.env);
  if (!session) throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
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
    const result = await dispatch(parsed, { session, fetchImpl: io.fetchImpl ?? fetch }, io.env);
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
