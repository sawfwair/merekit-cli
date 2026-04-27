#!/usr/bin/env node

// cli/mere-zone.ts
import { readFile as readFile2 } from "node:fs/promises";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.0_@sveltejs+vite-p_fc52d62c8b0bb19754074949eb0967be/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.0_@sveltejs+vite-p_fc52d62c8b0bb19754074949eb0967be/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.0_@sveltejs+vite-p_fc52d62c8b0bb19754074949eb0967be/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.0_@sveltejs+vite-p_fc52d62c8b0bb19754074949eb0967be/node_modules/@mere/cli-auth/src/client.ts
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
var APP_NAME = "mere-zone";
function sessionFilePath(env = process.env) {
  return resolveCliPaths(APP_NAME, env).sessionFile;
}
async function loadSession(env = process.env) {
  return loadCliSession({ appName: APP_NAME, env, legacyAppNames: ["merezone"] });
}
async function saveSession(session, env = process.env) {
  await saveCliSession({ appName: APP_NAME, session, env });
}
async function clearSession(env = process.env) {
  await clearCliSession({ appName: APP_NAME, env, legacyAppNames: ["merezone"] });
}

// cli/auth.ts
async function loginWithBrowser2(input) {
  const session = await loginWithBrowser({
    baseUrl: input.baseUrl,
    workspace: input.workspace,
    fetchImpl: input.fetchImpl,
    notify: input.notify,
    productLabel: "mere-zone"
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

// cli/mere-zone.ts
var CliError = class extends Error {
  constructor(message, exitCode2 = 1) {
    super(message);
    this.exitCode = exitCode2;
    this.name = "CliError";
  }
  exitCode;
};
var DEFAULT_BASE_URL = "https://mere.zone";
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
var DATA_FLAG_SPEC = {
  data: "string",
  "data-file": "string"
};
var HELP_TEXT = `mere-zone CLI (alias: merezone)

Usage:
  mere-zone [global flags] <group> <command> [args]

Global flags:
  --base-url URL       Override MERE_ZONE_BASE_URL
  --token TOKEN        Override MERE_ZONE_TOKEN or MERE_ZONE_INTERNAL_TOKEN
  --workspace ID       Preferred workspace during auth login or internal workspace target
  --json               Write machine-readable JSON
  --version            Show the CLI version
  --no-interactive     Reserved for non-interactive automation
  --yes                Required for destructive automation
  --confirm ID         Exact target required with --yes for irreversible commands
  --help               Show this help

Auth:
  auth login
  auth whoami
  auth logout
  completion [bash|zsh|fish]

Admin:
  store list
  store show STORE_ID
  products list --store STORE_ID [--collection NAME] [--published]
  products show PRODUCT_SLUG --store STORE_ID
  product upsert --store STORE_ID --data-file product.json
  collections list --store STORE_ID
  settings update --store STORE_ID [--name NAME] [--description TEXT] [--accent-color HEX] [--support-email EMAIL] [--stripe-account-id ID]
  inventory adjust --store STORE_ID --variant VARIANT_ID --quantity-delta N [--note TEXT]
  orders list --store STORE_ID
  orders show ORDER_NUMBER --store STORE_ID
  order fulfill ORDER_ID [--tracking-number TEXT] [--tracking-url URL]
  order refund ORDER_ID [--order-item ITEM_ID] [--restock]
  customers list --store STORE_ID
  stripe status --store STORE_ID
  checkout create --slug STORE_SLUG --data JSON|--data-file FILE

Workspace automation:
  workspace list
  workspace current
  workspace use <id|slug|host>
  workspace provision --workspace WORKSPACE_ID --slug SLUG --name NAME --webhook-url URL [--webhook-bearer-token TOKEN]
  workspace sync --workspace WORKSPACE_ID --slug SLUG --name NAME --webhook-url URL [--webhook-bearer-token TOKEN]
  workspace bootstrap --workspace WORKSPACE_ID --slug SLUG --name NAME --webhook-url URL [--webhook-bearer-token TOKEN]
  workspace disconnect --workspace WORKSPACE_ID
  workspace command --workspace WORKSPACE_ID <catalog-sync|catalog-repair|publish-storefront|unpublish-storefront|sync-order-status|order-lookup|adjust-stock|fulfill-order|refund-order> [--data JSON|--data-file FILE]
  workspace order --workspace WORKSPACE_ID ORDER_NUMBER

Environment:
  MERE_ZONE_BASE_URL       Worker URL, for example https://mere.zone or http://127.0.0.1:4422
  MERE_ZONE_TOKEN          Bearer token override for admin/session requests
  MERE_ZONE_INTERNAL_TOKEN Internal service token for workspace automation
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
    app: "mere-zone",
    namespace: "zone",
    aliases: ["mere-zone", "merezone"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_ZONE_BASE_URL", "MEREZONE_BASE_URL"],
    sessionPath: "~/.local/state/mere-zone/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file", "store"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["store", "list"], "List stores.", { auditDefault: true }),
      manifestCommand(["store", "show"], "Show a store."),
      manifestCommand(["products", "list"], "List products."),
      manifestCommand(["products", "show"], "Show a product."),
      manifestCommand(["product", "upsert"], "Upsert a product.", { risk: "write", supportsData: true }),
      manifestCommand(["collections", "list"], "List collections."),
      manifestCommand(["settings", "update"], "Update store settings.", { risk: "write", supportsData: true }),
      manifestCommand(["inventory", "adjust"], "Adjust inventory.", { risk: "external", supportsData: true, requiresYes: true }),
      manifestCommand(["orders", "list"], "List orders."),
      manifestCommand(["orders", "show"], "Show an order."),
      manifestCommand(["order", "fulfill"], "Fulfill an order.", { risk: "external", supportsData: true, requiresYes: true }),
      manifestCommand(["order", "refund"], "Refund an order.", { risk: "destructive", supportsData: true, requiresYes: true, requiresConfirm: true }),
      manifestCommand(["customers", "list"], "List customers."),
      manifestCommand(["stripe", "status"], "Show Stripe status.", { auditDefault: true }),
      manifestCommand(["checkout", "create"], "Create checkout.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "provision"], "Provision workspace connection.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "sync"], "Sync workspace connection.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "bootstrap"], "Bootstrap workspace connection.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["workspace", "command"], "Run workspace command.", { risk: "external", supportsData: true }),
      manifestCommand(["workspace", "order"], "Lookup workspace order."),
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
  return trimmed ? trimmed : void 0;
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
      throw new CliError(`Unknown option: --${rawName}`, 2);
    }
    if (expectedKind === "boolean") {
      options[rawName] = inlineValue == null ? true : inlineValue === "true";
      continue;
    }
    const resolvedValue = inlineValue ?? (() => {
      const next = args.at(index + 1);
      if (next === void 0 || next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`, 2);
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
      throw new CliError(`Unknown global option: --${rawName}`, 2);
    }
    globalTokens.push(token);
    if (expectedKind !== "boolean" && inlineValue == null) {
      const next = argv.at(index + 1);
      if (next === void 0 || next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`, 2);
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
function mergeFlagSpecs(...specs) {
  return Object.assign({}, ...specs);
}
function requiredString(options, name, label = `--${name}`) {
  const value = trimOption(asString(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`, 2);
  }
  return value;
}
function optionalString(options, name) {
  return trimOption(asString(options[name]));
}
function optionalNumber(options, name) {
  const value = optionalString(options, name);
  if (value === void 0) {
    return void 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliError(`--${name} must be a valid number.`, 2);
  }
  return parsed;
}
function parseJsonObject(value, label) {
  if (!value) {
    return {};
  }
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError(`${label} must be a JSON object.`, 2);
  }
  return parsed;
}
async function readJsonBody(options) {
  const inline = optionalString(options, "data");
  const file = optionalString(options, "data-file");
  if (inline && file) {
    throw new CliError("Use either --data or --data-file, not both.", 2);
  }
  if (inline) {
    return parseJsonObject(inline, "--data");
  }
  if (file) {
    return parseJsonObject(await readFile2(file, "utf8"), "--data-file");
  }
  return {};
}
function requireYes(options, label, target) {
  if (!asBoolean(options.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`, 2);
  }
}
function requireExactConfirmation(options, label, target) {
  requireYes(options, label, target);
  if (optionalString(options, "confirm") !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`, 2);
  }
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
function resolveBaseUrl(options, env) {
  return trimOption(asString(options["base-url"])) ?? trimOption(env.MERE_ZONE_BASE_URL) ?? trimOption(env.MEREZONE_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveRequestedWorkspace(options, env) {
  return trimOption(asString(options.workspace)) ?? trimOption(env.MERE_ZONE_WORKSPACE_ID) ?? trimOption(env.MEREZONE_WORKSPACE_ID);
}
function resolveInternalToken(options, env) {
  const token = trimOption(asString(options.token)) ?? trimOption(env.MERE_ZONE_INTERNAL_TOKEN) ?? trimOption(env.MEREZONE_INTERNAL_TOKEN) ?? trimOption(env.INTERNAL_SERVICE_TOKEN);
  if (!token) {
    throw new CliError("This command requires --token or MERE_ZONE_INTERNAL_TOKEN.", 3);
  }
  return token;
}
async function resolveAdminToken(options, io) {
  const baseUrl = resolveBaseUrl(options, io.env);
  const overrideToken = trimOption(asString(options.token)) ?? trimOption(io.env.MERE_ZONE_TOKEN) ?? trimOption(io.env.MEREZONE_TOKEN);
  if (overrideToken) {
    return { baseUrl, token: overrideToken };
  }
  if (!activeSession) {
    throw new CliError("This command requires `mere-zone auth login` or MERE_ZONE_TOKEN.", 3);
  }
  const session = await ensureActiveSession(activeSession, {
    workspace: resolveRequestedWorkspace(options, io.env),
    fetchImpl: io.fetchImpl
  });
  activeSession = session;
  await saveSession(session, io.env);
  return { baseUrl: session.baseUrl, token: session.accessToken };
}
function buildUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl);
}
async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}
async function requestJson(input) {
  const headers = new Headers({
    authorization: `Bearer ${input.token}`
  });
  if (input.body !== void 0) {
    headers.set("content-type", "application/json");
  }
  const response = await input.fetchImpl(buildUrl(input.baseUrl, input.pathname), {
    method: input.method ?? "GET",
    headers,
    body: input.body === void 0 ? void 0 : JSON.stringify(input.body)
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}.`;
    throw new CliError(message, response.status === 401 || response.status === 403 ? 3 : 1);
  }
  return payload;
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
function renderSessionSummary(session) {
  const workspace = session.workspace;
  return [
    `user: ${session.user.email}`,
    workspace ? `selected workspace: ${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})` : "selected workspace: none",
    `available workspaces: ${session.workspaces.length}`,
    `session: ${sessionFilePath()}`
  ].join("\n");
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
var COMPLETION_WORDS = [
  "auth",
  "workspace",
  "store",
  "product",
  "products",
  "variant",
  "variants",
  "inventory",
  "order",
  "orders",
  "customer",
  "customers",
  "settings",
  "stripe",
  "checkout",
  "media",
  "completion"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-zone bash completion",
      "_mere_zone_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_zone_completion mere-zone merezone",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-zone merezone",
      "_mere_zone() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_zone "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-zone -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.", 2);
}
async function handleAuth(action, globalOptions, io) {
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
    return session;
  }
  if (action === "logout") {
    const loggedOut = await logoutRemote({
      fetchImpl: io.fetchImpl,
      env: io.env
    });
    activeSession = null;
    return { loggedOut };
  }
  if (action === "whoami") {
    if (!activeSession) {
      throw new CliError("No local session found. Run `mere-zone auth login` first.", 3);
    }
    return activeSession;
  }
  throw new CliError(`Unknown auth action: ${action ?? "(missing)"}.`, 2);
}
async function handleProduct(options, io) {
  const body = await readJsonBody(options);
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    method: "POST",
    pathname: "/api/admin/products",
    body: { ...body, storeId }
  });
}
async function handleStore(action, rest, options, io) {
  const { baseUrl, token } = await resolveAdminToken(options, io);
  if (action === "list") {
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: "/api/admin/stores"
    });
  }
  if (action === "show") {
    const storeId = rest.at(0)?.trim();
    if (!storeId) {
      throw new CliError("Missing store id.", 2);
    }
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: `/api/admin/stores/${encodeURIComponent(storeId)}`
    });
  }
  throw new CliError(`Unknown store action: ${action ?? "(missing)"}.`, 2);
}
async function handleProducts(action, rest, options, io) {
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  if (action === "list") {
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: `/api/admin/products${queryString({
        store: storeId,
        collection: optionalString(options, "collection"),
        published: asBoolean(options.published) ? "true" : void 0
      })}`
    });
  }
  if (action === "show") {
    const productSlug = rest.at(0)?.trim();
    if (!productSlug) {
      throw new CliError("Missing product slug.", 2);
    }
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: `/api/admin/products/${encodeURIComponent(productSlug)}${queryString({ store: storeId })}`
    });
  }
  throw new CliError(`Unknown products action: ${action ?? "(missing)"}.`, 2);
}
async function handleCollections(options, io) {
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    pathname: `/api/admin/collections${queryString({ store: storeId })}`
  });
}
async function handleSettings(options, io) {
  const body = {
    storeId: requiredString(options, "store")
  };
  for (const [flag, field] of [
    ["name", "name"],
    ["description", "description"],
    ["accent-color", "accentColor"],
    ["support-email", "supportEmail"],
    ["stripe-account-id", "stripeAccountId"]
  ]) {
    const value = optionalString(options, flag);
    if (value !== void 0) {
      body[field] = value;
    }
  }
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    method: "POST",
    pathname: "/api/admin/settings",
    body
  });
}
async function handleInventory(options, io) {
  const quantityDelta = optionalNumber(options, "quantity-delta");
  if (quantityDelta === void 0) {
    throw new CliError("Missing required --quantity-delta.", 2);
  }
  const variantId = requiredString(options, "variant");
  if (quantityDelta < 0) {
    requireYes(options, "adjust inventory", variantId);
  }
  const body = {
    storeId: requiredString(options, "store"),
    variantId,
    quantityDelta
  };
  const note = optionalString(options, "note");
  if (note !== void 0) {
    body.note = note;
  }
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    method: "POST",
    pathname: "/api/admin/inventory/adjust",
    body
  });
}
async function handleOrder(action, rest, options, io) {
  const orderId = rest.at(0)?.trim();
  if (!orderId) {
    throw new CliError("Missing order id.", 2);
  }
  const { baseUrl, token } = await resolveAdminToken(options, io);
  if (action === "fulfill") {
    requireYes(options, "fulfill order", orderId);
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      method: "POST",
      pathname: `/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`,
      body: {
        trackingNumber: optionalString(options, "tracking-number") ?? null,
        trackingUrl: optionalString(options, "tracking-url") ?? null
      }
    });
  }
  if (action === "refund") {
    requireExactConfirmation(options, "refund order", orderId);
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      method: "POST",
      pathname: `/api/admin/orders/${encodeURIComponent(orderId)}/refund`,
      body: {
        orderItemId: optionalString(options, "order-item") ?? null,
        restock: asBoolean(options.restock)
      }
    });
  }
  throw new CliError(`Unknown order action: ${action ?? "(missing)"}.`, 2);
}
async function handleOrders(action, rest, options, io) {
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  if (action === "list") {
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: `/api/admin/orders${queryString({ store: storeId })}`
    });
  }
  if (action === "show") {
    const orderNumber = rest.at(0)?.trim();
    if (!orderNumber) {
      throw new CliError("Missing order number.", 2);
    }
    return requestJson({
      baseUrl,
      token,
      fetchImpl: io.fetchImpl ?? fetch,
      pathname: `/api/admin/orders/by-number/${encodeURIComponent(orderNumber)}${queryString({ store: storeId })}`
    });
  }
  throw new CliError(`Unknown orders action: ${action ?? "(missing)"}.`, 2);
}
async function handleCustomers(action, options, io) {
  if (action !== "list") {
    throw new CliError(`Unknown customers action: ${action ?? "(missing)"}.`, 2);
  }
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    pathname: `/api/admin/customers${queryString({ store: storeId })}`
  });
}
async function handleStripe(action, options, io) {
  if (action !== "status") {
    throw new CliError(`Unknown stripe action: ${action ?? "(missing)"}.`, 2);
  }
  const storeId = requiredString(options, "store");
  const { baseUrl, token } = await resolveAdminToken(options, io);
  return requestJson({
    baseUrl,
    token,
    fetchImpl: io.fetchImpl ?? fetch,
    pathname: `/api/admin/stripe/status${queryString({ store: storeId })}`
  });
}
async function handleCheckout(action, options, io) {
  if (action !== "create") {
    throw new CliError(`Unknown checkout action: ${action ?? "(missing)"}.`, 2);
  }
  const slug = requiredString(options, "slug");
  return requestJson({
    baseUrl: resolveBaseUrl(options, io.env),
    token: optionalString(options, "token") ?? "public-checkout",
    fetchImpl: io.fetchImpl ?? fetch,
    method: "POST",
    pathname: `/api/checkout/${encodeURIComponent(slug)}`,
    body: await readJsonBody(options)
  });
}
function workspaceProvisionBody(options, workspaceId) {
  const body = {
    workspaceId,
    slug: requiredString(options, "slug"),
    name: requiredString(options, "name"),
    webhookUrl: requiredString(options, "webhook-url")
  };
  for (const [flag, field] of [
    ["webhook-bearer-token", "webhookBearerToken"],
    ["timezone", "timezone"],
    ["currency", "currency"]
  ]) {
    const value = optionalString(options, flag);
    if (value !== void 0) {
      body[field] = value;
    }
  }
  return body;
}
async function handleWorkspace(action, rest, options, io) {
  const baseUrl = resolveBaseUrl(options, io.env);
  const fetchImpl = io.fetchImpl ?? fetch;
  if (action === "list") {
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-zone auth login` first.", 3);
    }
    return asBoolean(options.json) ? session.workspaces : session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available.";
  }
  if (action === "current") {
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-zone auth login` first.", 3);
    }
    const result = {
      current: session.workspace,
      defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
    };
    return asBoolean(options.json) ? result : [
      `current: ${result.current ? renderWorkspaceLabel(result.current) : "none"}`,
      `default: ${result.defaultWorkspace ? renderWorkspaceLabel(result.defaultWorkspace) : "none"}`
    ].join("\n");
  }
  if (action === "use") {
    const selector = rest.at(0)?.trim();
    if (!selector || rest.length !== 1) {
      throw new CliError("workspace use requires exactly one <id|slug|host>.", 2);
    }
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new CliError("No local session found. Run `mere-zone auth login` first.", 3);
    }
    const target = requireWorkspaceSelection(session.workspaces, selector);
    const nextSession = await ensureActiveSession(session, {
      workspace: target.id,
      fetchImpl
    });
    await saveSession(nextSession, io.env);
    activeSession = nextSession;
    return asBoolean(options.json) ? nextSession : renderSessionSummary(nextSession);
  }
  const workspaceId = requiredString(options, "workspace");
  const token = resolveInternalToken(options, io.env);
  if (action === "provision" || action === "sync" || action === "bootstrap") {
    return requestJson({
      baseUrl,
      token,
      fetchImpl,
      method: "POST",
      pathname: `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/${action}`,
      body: workspaceProvisionBody(options, workspaceId)
    });
  }
  if (action === "disconnect") {
    requireExactConfirmation(options, "disconnect workspace", workspaceId);
    return requestJson({
      baseUrl,
      token,
      fetchImpl,
      method: "DELETE",
      pathname: `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/connection`
    });
  }
  if (action === "command") {
    const command = rest.at(0)?.trim();
    if (!command) {
      throw new CliError("Missing workspace command.", 2);
    }
    const body = await readJsonBody(options);
    const orderTarget = typeof body.orderId === "string" ? body.orderId : typeof body.orderNumber === "string" ? body.orderNumber : command;
    if (command === "refund-order") {
      requireExactConfirmation(options, "refund order", orderTarget);
    }
    if (command === "fulfill-order") {
      requireYes(options, "fulfill order", orderTarget);
    }
    if (command === "adjust-stock" && typeof body.quantityDelta === "number" && body.quantityDelta < 0) {
      const target = typeof body.variantId === "string" ? body.variantId : command;
      requireYes(options, "adjust stock", target);
    }
    return requestJson({
      baseUrl,
      token,
      fetchImpl,
      method: "POST",
      pathname: `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/commands/${encodeURIComponent(command)}`,
      body
    });
  }
  if (action === "order") {
    const orderNumber = rest.at(0)?.trim();
    if (!orderNumber) {
      throw new CliError("Missing order number.", 2);
    }
    return requestJson({
      baseUrl,
      token,
      fetchImpl,
      pathname: `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/orders/${encodeURIComponent(orderNumber)}`
    });
  }
  throw new CliError(`Unknown workspace action: ${action ?? "(missing)"}.`, 2);
}
function writeResult(io, options, result) {
  if (asBoolean(options.json)) {
    writeJson(io, result);
    return;
  }
  if (typeof result === "string") {
    writeText(io, result);
    return;
  }
  writeJson(io, result);
}
async function runCli(argv, io) {
  try {
    activeSession = await loadSession(io.env);
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    if (asBoolean(globalOptions.version)) {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest.length === 0 || asBoolean(globalOptions.help)) {
      writeText(io, HELP_TEXT);
      return 0;
    }
    const [group, action, ...remaining] = rest;
    if (group === "completion") {
      writeText(io, completionScript(action));
      return 0;
    }
    if (group === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    if (group === "auth") {
      const result2 = await handleAuth(action, globalOptions, io);
      if (asBoolean(globalOptions.json)) {
        writeJson(io, result2);
      } else if (action === "logout") {
        writeText(io, result2.loggedOut ? "Logged out." : "No local session found.");
      } else if (activeSession) {
        writeText(io, renderSessionSummary(activeSession));
      }
      return 0;
    }
    const commandOptions = parseFlags(
      remaining,
      mergeFlagSpecs(DATA_FLAG_SPEC, {
        store: "string",
        name: "string",
        description: "string",
        "accent-color": "string",
        "support-email": "string",
        "stripe-account-id": "string",
        collection: "string",
        published: "boolean",
        variant: "string",
        "quantity-delta": "string",
        note: "string",
        "tracking-number": "string",
        "tracking-url": "string",
        "order-item": "string",
        restock: "boolean",
        workspace: "string",
        slug: "string",
        "webhook-url": "string",
        "webhook-bearer-token": "string",
        timezone: "string",
        currency: "string",
        yes: "boolean",
        confirm: "string"
      })
    );
    const options = { ...globalOptions, ...commandOptions.options };
    let result;
    if (group === "store") {
      result = await handleStore(action, commandOptions.positionals, options, io);
    } else if (group === "products") {
      result = await handleProducts(action, commandOptions.positionals, options, io);
    } else if (group === "collections" && action === "list") {
      result = await handleCollections(options, io);
    } else if (group === "product" && action === "upsert") {
      result = await handleProduct(options, io);
    } else if (group === "settings" && action === "update") {
      result = await handleSettings(options, io);
    } else if (group === "inventory" && action === "adjust") {
      result = await handleInventory(options, io);
    } else if (group === "orders") {
      result = await handleOrders(action, commandOptions.positionals, options, io);
    } else if (group === "order") {
      result = await handleOrder(action, commandOptions.positionals, options, io);
    } else if (group === "customers") {
      result = await handleCustomers(action, options, io);
    } else if (group === "stripe") {
      result = await handleStripe(action, options, io);
    } else if (group === "checkout") {
      result = await handleCheckout(action, options, io);
    } else if (group === "workspace") {
      result = await handleWorkspace(action, commandOptions.positionals, options, io);
    } else {
      throw new CliError(`Unknown command: ${[group, action].filter(Boolean).join(" ")}`, 2);
    }
    writeResult(io, options, result);
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
