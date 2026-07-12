#!/usr/bin/env node

// scripts/cli/yourtime.ts
import { readFile as readFile3 } from "node:fs/promises";
import process3 from "node:process";

// scripts/cli/args.ts
import { readFileSync } from "node:fs";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "active",
  "archive",
  "clear-end",
  "clear-project",
  "dry-run",
  "force",
  "help",
  "include-archived",
  "inactive",
  "json",
  "local",
  "remote",
  "unarchive",
  "version",
  "yes"
]);
function isBooleanLiteral(value) {
  return value === "true" || value === "false" || value === "1" || value === "0" || value === "yes" || value === "no";
}
function pushFlagValue(flags, key, value) {
  const existing = flags[key];
  if (existing === void 0) {
    flags[key] = value;
    return;
  }
  if (Array.isArray(existing)) {
    existing.push(String(value));
    return;
  }
  flags[key] = [String(existing), String(value)];
}
function parseArgv(argv) {
  const parsed = { positionals: [], flags: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      parsed.positionals.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    if (!withoutPrefix) {
      continue;
    }
    if (withoutPrefix.startsWith("no-")) {
      pushFlagValue(parsed.flags, withoutPrefix.slice(3), false);
      continue;
    }
    const separatorIndex = withoutPrefix.indexOf("=");
    if (separatorIndex >= 0) {
      const rawKey2 = withoutPrefix.slice(0, separatorIndex);
      const inlineValue = withoutPrefix.slice(separatorIndex + 1);
      if (!rawKey2) {
        continue;
      }
      pushFlagValue(parsed.flags, rawKey2, inlineValue);
      continue;
    }
    const rawKey = withoutPrefix;
    const next = argv[index + 1];
    if (BOOLEAN_FLAGS.has(rawKey) && !isBooleanLiteral(next)) {
      pushFlagValue(parsed.flags, rawKey, true);
      continue;
    }
    if (!next || next.startsWith("--")) {
      pushFlagValue(parsed.flags, rawKey, true);
      continue;
    }
    pushFlagValue(parsed.flags, rawKey, next);
    index += 1;
  }
  return applyStructuredData(parsed);
}
function toKebabKey(key) {
  return key.replace(/_/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
function stringifyStructuredValue(value) {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function parseStructuredJson(value, label) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`--${label} must be valid JSON`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`--${label} must be a JSON object`);
  }
  return parsed;
}
function structuredPayload(parsed) {
  const payloads = [];
  const file = readStringFlag(parsed, "data-file") ?? readStringFlag(parsed, "json-file");
  if (file) {
    payloads.push(parseStructuredJson(readFileSync(file, "utf8"), "data-file"));
  }
  const inline = readStringFlag(parsed, "data") ?? readStringFlag(parsed, "json-input");
  if (inline) {
    payloads.push(parseStructuredJson(inline, "data"));
  }
  return Object.assign({}, ...payloads);
}
function applyStructuredData(parsed) {
  const payload = structuredPayload(parsed);
  for (const [rawKey, rawValue] of Object.entries(payload)) {
    const value = stringifyStructuredValue(rawValue);
    const keys = [rawKey, toKebabKey(rawKey)];
    for (const key of keys) {
      parsed.flags[key] ??= value;
    }
  }
  return parsed;
}
function readFlagValue(parsed, key) {
  return parsed.flags[key];
}
function hasFlag(parsed, key) {
  return readFlagValue(parsed, key) !== void 0;
}
function readBooleanFlag(parsed, key, defaultValue = false) {
  const value = readFlagValue(parsed, key);
  if (value === void 0) {
    return defaultValue;
  }
  if (Array.isArray(value)) {
    return readBooleanFlag({ ...parsed, flags: { [key]: value[value.length - 1] } }, key, defaultValue);
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  return defaultValue;
}
function readStringFlag(parsed, key) {
  const value = readFlagValue(parsed, key);
  if (value === void 0) {
    return void 0;
  }
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return value;
}
function readRequiredStringFlag(parsed, key) {
  const value = readStringFlag(parsed, key);
  if (!value) {
    throw new Error(`--${key} is required`);
  }
  return value;
}
function readNumberFlag(parsed, key) {
  const value = readStringFlag(parsed, key);
  if (value === void 0) {
    return void 0;
  }
  const parsedNumber = Number(value);
  if (!Number.isFinite(parsedNumber)) {
    throw new Error(`--${key} must be a number`);
  }
  return parsedNumber;
}
function readStringListFlag(parsed, key) {
  const value = readFlagValue(parsed, key);
  if (value === void 0) {
    return [];
  }
  const values = Array.isArray(value) ? value : [String(value)];
  return values.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_a16694d82befbc5a365d1bd249c9e389/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_a16694d82befbc5a365d1bd249c9e389/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_a16694d82befbc5a365d1bd249c9e389/node_modules/@mere/cli-auth/src/session.ts
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
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
  await writeCliSessionFile(paths.sessionFile, input.session);
}
async function writeCliSessionFile(sessionFile, session) {
  const stateDir = path.dirname(sessionFile);
  const tempFile = path.join(
    stateDir,
    `.${path.basename(sessionFile)}.${process.pid}.${randomUUID()}.tmp`
  );
  let handle;
  await mkdir(stateDir, { recursive: true });
  try {
    handle = await open(tempFile, "wx", 384);
    await handle.writeFile(`${JSON.stringify(session, null, 2)}
`, "utf8");
    await handle.sync();
    await handle.close();
    handle = void 0;
    await rename(tempFile, sessionFile);
  } catch (error) {
    await handle?.close().catch(() => void 0);
    await rm(tempFile, { force: true }).catch(() => void 0);
    throw error;
  }
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_a16694d82befbc5a365d1bd249c9e389/node_modules/@mere/cli-auth/src/client.ts
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
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname !== "/callback") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      const requestId = requestUrl.searchParams.get(CLI_AUTH_REQUEST_QUERY_PARAM)?.trim();
      const authError = requestUrl.searchParams.get(CLI_AUTH_ERROR_QUERY_PARAM)?.trim();
      const errorDescription = requestUrl.searchParams.get(CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM)?.trim();
      if (authError) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(
          `<!doctype html><html><body><h1>${input.productLabel} login could not complete.</h1><p>You can close this window and return to the terminal.</p></body></html>`
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(errorDescription ? `${authError}: ${errorDescription}` : authError));
        return;
      }
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
var APP_NAME = "mere-today";
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
    productLabel: "mere-today"
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

// scripts/cli/auth-command.ts
var activeSession = null;
async function hydrateActiveSession(env) {
  activeSession = await loadSession(env);
  return activeSession;
}
function getActiveSession() {
  return activeSession;
}
function resolveAuthBaseUrl(parsed, io) {
  return readStringFlag(parsed, "base-url") ?? io.env.YOURTIME_BASE_URL ?? activeSession?.baseUrl ?? "https://mere.today";
}
function normalizeBaseUrl2(value) {
  return value.trim().replace(/\/+$/, "");
}
function resolveRequestedWorkspace(parsed) {
  return readStringFlag(parsed, "workspace");
}
function renderSessionSummary(session) {
  const workspaceLabel = session.workspaces.length > 0 ? session.workspaces.map(
    (workspace) => workspace.id === session.defaultWorkspaceId ? `${workspace.slug} (default)` : workspace.slug
  ).join(", ") : "none";
  return [
    `user: ${session.user.displayName || session.user.primaryEmail}`,
    `email: ${session.user.primaryEmail}`,
    `base url: ${session.baseUrl}`,
    `expires: ${session.expiresAt}`,
    `workspaces: ${workspaceLabel}`
  ].join("\n");
}
function pickWorkspaceSession(session, requestedWorkspace) {
  if (!requestedWorkspace?.trim()) {
    return session;
  }
  const normalized = requestedWorkspace.trim().toLowerCase();
  const match = session.workspaces.find(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  );
  if (!match) {
    return session;
  }
  return {
    ...session,
    defaultWorkspaceId: match.id
  };
}
function selectBusinessWorkspace(session, selector) {
  if (selector) {
    return requireWorkspaceSelection(session.workspaces, selector);
  }
  if (session.workspace) {
    return session.workspace;
  }
  if (session.defaultWorkspaceId) {
    return requireWorkspaceSelection(session.workspaces, session.defaultWorkspaceId);
  }
  if (session.workspaces.length === 1) {
    return session.workspaces[0];
  }
  throw new Error("Option --workspace is required when the Business session has multiple workspaces.");
}
function productSessionErrorMessage(payload, fallback) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fallback;
  const record = payload;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  if (record.error && typeof record.error === "object" && !Array.isArray(record.error)) {
    return productSessionErrorMessage(record.error, fallback);
  }
  return fallback;
}
function readProductSessionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Mere Business returned an invalid product session response.");
  }
  const record = payload;
  if (typeof record.baseUrl !== "string" || !record.baseUrl.trim()) {
    throw new Error("Mere Business did not return a Today base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new Error("Mere Business did not return a Today CLI session.");
  }
  return {
    baseUrl: record.baseUrl,
    session: record.session
  };
}
function createLocalSession2(payload, options) {
  return {
    ...payload,
    version: 1,
    baseUrl: options.baseUrl,
    defaultWorkspaceId: options.defaultWorkspaceId,
    lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function loadRefreshedBusinessSession(parsed, io) {
  const current = await loadCliSession({ appName: "mere-business", env: io.env });
  if (!current) {
    throw new Error(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first."
    );
  }
  const workspace = selectBusinessWorkspace(current, resolveRequestedWorkspace(parsed));
  const baseUrl = normalizeBaseUrl2(
    readStringFlag(parsed, "business-base-url") ?? current.baseUrl
  );
  if (!sessionNeedsRefresh(current, workspace.id)) {
    return { session: current, workspace, baseUrl };
  }
  const payload = await refreshRemoteSession({
    baseUrl,
    refreshToken: current.refreshToken,
    workspace: workspace.id,
    fetchImpl: io.fetchImpl
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl,
    persistDefaultWorkspace: false
  });
  await saveCliSession({ appName: "mere-business", session, env: io.env });
  return {
    session,
    workspace: session.workspace ?? workspace,
    baseUrl
  };
}
async function agentLogin(parsed, io) {
  const business = await loadRefreshedBusinessSession(parsed, io);
  const response = await (io.fetchImpl ?? fetch)(
    new URL("/api/cli/v1/auth/product-sessions", business.baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${business.session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        app: "today",
        workspaceId: business.workspace.id
      })
    }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(productSessionErrorMessage(payload, `Request failed (${response.status.toString()})`));
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession2(product.session, {
    baseUrl: normalizeBaseUrl2(readStringFlag(parsed, "base-url") ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveSession(session, io.env);
  return session;
}
async function handleAuthCommand(parsed, io) {
  const action = parsed.positionals[1];
  if (action === "login") {
    const session = pickWorkspaceSession(
      await loginWithBrowser2({
        baseUrl: resolveAuthBaseUrl(parsed, io),
        workspace: resolveRequestedWorkspace(parsed),
        fetchImpl: io.fetchImpl,
        notify: (message) => {
          io.stderr(`${message}
`);
        },
        env: io.env
      }),
      resolveRequestedWorkspace(parsed)
    );
    await saveSession(session, io.env);
    activeSession = session;
    return {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    };
  }
  if (action === "agent-login") {
    const session = await agentLogin(parsed, io);
    activeSession = session;
    return {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspace: session.workspace,
      workspaces: session.workspaces
    };
  }
  if (action === "whoami") {
    const session = activeSession ?? await loadSession(io.env);
    if (!session) {
      throw new Error("No local session found. Run `mere-today auth login` first.");
    }
    activeSession = session;
    return {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    };
  }
  if (action === "logout") {
    const loggedOut = await logoutRemote({
      fetchImpl: io.fetchImpl,
      env: io.env
    });
    activeSession = null;
    return { loggedOut };
  }
  throw new Error("Unknown auth action: expected login, agent-login, whoami, or logout");
}
async function resolveAuthenticatedSession(parsed, io) {
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new Error("No local session found. Run `mere-today auth login` first.");
  }
  const refreshed = await ensureActiveSession(session, {
    workspace: resolveRequestedWorkspace(parsed),
    fetchImpl: io.fetchImpl
  });
  await saveSession(refreshed, io.env);
  activeSession = refreshed;
  return refreshed;
}

// src/lib/datetime.ts
function pad(value) {
  return String(value).padStart(2, "0");
}
function toLocalIso(date, time) {
  return `${date}T${time}:00`;
}
function splitLocalIso(value) {
  const [date, rest = "00:00:00"] = value.split("T");
  return {
    date,
    time: rest.slice(0, 5)
  };
}
function addMinutesToLocalIso(value, minutes) {
  const [datePart, timePart = "00:00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0, 0));
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return [
    next.getUTCFullYear(),
    pad(next.getUTCMonth() + 1),
    pad(next.getUTCDate())
  ].join("-") + `T${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`;
}
function startOfLocalDay(date) {
  return `${date}T00:00:00`;
}
function endOfLocalDayExclusive(date) {
  return addMinutesToLocalIso(startOfLocalDay(date), 24 * 60);
}
function formatUtcIsoInTimeZone(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date(value)).reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
function localIsoToMinutes(value) {
  const { time } = splitLocalIso(value);
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
function overlapsRange(startAt, endAt, rangeStart, rangeEndExclusive) {
  return endAt > rangeStart && startAt < rangeEndExclusive;
}
function clampRangeToDate(startAt, endAt, date) {
  const dayStart = startOfLocalDay(date);
  const dayEnd = endOfLocalDayExclusive(date);
  if (!overlapsRange(startAt, endAt, dayStart, dayEnd)) {
    return null;
  }
  const clampedStart = startAt > dayStart ? startAt : dayStart;
  const clampedEnd = endAt < dayEnd ? endAt : dayEnd;
  return {
    start: localIsoToMinutes(clampedStart),
    end: clampedEnd === dayEnd ? 24 * 60 : localIsoToMinutes(clampedEnd)
  };
}
function toDisplayDate(value) {
  return splitLocalIso(value).date;
}

// src/lib/object.ts
function isObjectRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/lib/server/db.ts
function makeId() {
  return crypto.randomUUID();
}
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/lib/server/bookings.ts
var INACTIVE_STATUSES = ["cancelled", "canceled", "declined", "no_show", "noshow", "archived", "spam"];
var RESERVATION_SLOT_MS = 60 * 1e3;
function parseLocalIsoMinute(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}
function formatReservationSlot(value) {
  const date = new Date(value);
  return {
    reserved_date: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
    reserved_time: `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
  };
}
function buildBookingReservationSlots(startsAt, endsAt) {
  const start = parseLocalIsoMinute(startsAt);
  const end = parseLocalIsoMinute(endsAt);
  if (start === null || end === null || end <= start) {
    return [];
  }
  const slots = [];
  for (let cursor = start; cursor < end; cursor += RESERVATION_SLOT_MS) {
    slots.push(formatReservationSlot(cursor));
  }
  return slots;
}
async function runBookingStatements(db, statements) {
  const batch = db.batch;
  if (batch) {
    return batch.call(db, statements);
  }
  const results = [];
  for (const statement of statements) {
    results.push(await statement.run());
  }
  return results;
}
function deleteBookingReservationsStatement(db, tenantId, bookingId) {
  return db.prepare("DELETE FROM booking_slot_reservations WHERE tenant_id = ? AND booking_id = ?").bind(tenantId, bookingId);
}
function insertBookingReservationStatements(db, tenantId, bookingId, startsAt, endsAt, createdAt) {
  return buildBookingReservationSlots(startsAt, endsAt).map(
    (slot) => db.prepare(
      `INSERT INTO booking_slot_reservations (
           id, booking_id, tenant_id, reserved_date, reserved_time, created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      makeId(),
      bookingId,
      tenantId,
      slot.reserved_date,
      slot.reserved_time,
      createdAt
    )
  );
}
async function storeBooking(db, tenantId, data, options) {
  const id = makeId();
  const createdAt = isoNow();
  await runBookingStatements(db, [
    db.prepare(
      `INSERT INTO bookings (
         id,
         tenant_id,
         service_id,
         calendar_event_id,
         created_at,
         starts_at,
         ends_at,
         name,
         email,
         phone,
         company,
         preferred_date,
         preferred_time,
         timezone,
         details,
         source
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      tenantId,
      options.serviceId,
      options.calendarEventId ?? null,
      createdAt,
      options.startsAt,
      options.endsAt,
      data.name,
      data.email,
      data.phone || null,
      data.company || null,
      data.preferredDate,
      data.preferredTime,
      data.timezone,
      data.details || null,
      options.source ?? "website"
    ),
    ...insertBookingReservationStatements(
      db,
      tenantId,
      id,
      options.startsAt,
      options.endsAt,
      createdAt
    )
  ]);
  return { id, createdAt };
}
async function linkBookingCalendarEvent(db, tenantId, bookingId, calendarEventId) {
  await db.prepare("UPDATE bookings SET calendar_event_id = ? WHERE tenant_id = ? AND id = ?").bind(calendarEventId, tenantId, bookingId).run();
}
async function listBookings(db, tenantId, options = {}) {
  const { status, limit = 50, offset = 0 } = options;
  let sql = "SELECT * FROM bookings WHERE tenant_id = ?";
  const binds = [tenantId];
  if (status) {
    sql += " AND status = ?";
    binds.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);
  const result = await db.prepare(sql).bind(...binds).all();
  return result.results ?? [];
}
async function getBookingById(db, tenantId, bookingId) {
  return db.prepare("SELECT * FROM bookings WHERE tenant_id = ? AND id = ? LIMIT 1").bind(tenantId, bookingId).first();
}
async function updateBookingStatus(db, tenantId, bookingId, status, cancelReason) {
  const now = isoNow();
  let sql;
  let binds;
  if (status === "cancelled") {
    sql = `UPDATE bookings SET status = ?, cancelled_at = COALESCE(cancelled_at, ?), cancel_reason = ? WHERE id = ? AND tenant_id = ?`;
    binds = [status, now, cancelReason ?? null, bookingId, tenantId];
  } else if (status === "confirmed") {
    sql = `UPDATE bookings SET status = ?, confirmed_at = COALESCE(confirmed_at, ?) WHERE id = ? AND tenant_id = ?`;
    binds = [status, now, bookingId, tenantId];
  } else if (status === "completed") {
    sql = `UPDATE bookings SET status = ?, completed_at = COALESCE(completed_at, ?) WHERE id = ? AND tenant_id = ?`;
    binds = [status, now, bookingId, tenantId];
  } else if (status === "no_show") {
    sql = `UPDATE bookings SET status = ?, no_show_at = COALESCE(no_show_at, ?) WHERE id = ? AND tenant_id = ?`;
    binds = [status, now, bookingId, tenantId];
  } else {
    sql = `UPDATE bookings SET status = ? WHERE id = ? AND tenant_id = ?`;
    binds = [status, bookingId, tenantId];
  }
  const result = await db.prepare(sql).bind(...binds).run();
  const changed = (result.meta?.changes ?? 0) > 0;
  if (changed && INACTIVE_STATUSES.includes(status.toLowerCase())) {
    await deleteBookingReservationsStatement(db, tenantId, bookingId).run();
  }
  return changed;
}
async function rescheduleBooking(db, tenantId, bookingId, fields) {
  const result = await db.prepare(
    `UPDATE bookings
       SET service_id = ?, preferred_date = ?, preferred_time = ?, starts_at = ?, ends_at = ?
       WHERE tenant_id = ? AND id = ?`
  ).bind(
    fields.serviceId,
    fields.preferredDate,
    fields.preferredTime,
    fields.startsAt,
    fields.endsAt,
    tenantId,
    bookingId
  ).run();
  const changed = (result.meta?.changes ?? 0) > 0;
  if (changed) {
    await runBookingStatements(db, [
      deleteBookingReservationsStatement(db, tenantId, bookingId),
      ...insertBookingReservationStatements(
        db,
        tenantId,
        bookingId,
        fields.startsAt,
        fields.endsAt,
        isoNow()
      )
    ]);
  }
  return changed;
}

// src/lib/server/calendar.ts
function pad2(value) {
  return String(value).padStart(2, "0");
}
function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  next.setUTCDate(next.getUTCDate() + days);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}
function compareDates(a, b) {
  return a.localeCompare(b);
}
function dateUtc(value) {
  return (/* @__PURE__ */ new Date(`${value}T00:00:00Z`)).getTime();
}
function daysBetween(later, earlier) {
  return Math.round((dateUtc(later) - dateUtc(earlier)) / 864e5);
}
function startOfWeek(date) {
  const weekday = (/* @__PURE__ */ new Date(`${date}T00:00:00Z`)).getUTCDay();
  return addDays(date, -weekday);
}
function monthDiff(a, b) {
  const [aYear, aMonth] = a.split("-").map(Number);
  const [bYear, bMonth] = b.split("-").map(Number);
  return (aYear - bYear) * 12 + (aMonth - bMonth);
}
function addMonthsKeepingDay(anchorDate, monthOffset) {
  const [year, month, day] = anchorDate.split("-").map(Number);
  const targetMonthIndex = month - 1 + monthOffset;
  const date = new Date(Date.UTC(year, targetMonthIndex, day, 0, 0, 0, 0));
  const normalizedMonth = (targetMonthIndex % 12 + 12) % 12;
  if (date.getUTCMonth() !== normalizedMonth) {
    return null;
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function minutesBetween(startAt, endAt) {
  const start = /* @__PURE__ */ new Date(startAt.replace("T", "T") + "Z");
  const end = /* @__PURE__ */ new Date(endAt.replace("T", "T") + "Z");
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 6e4));
}
function parseWeekdays(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "number" && item >= 0 && item <= 6);
    }
  } catch {
    return [];
  }
  return [];
}
function matchesSeriesOnDate(series, occurrenceDate) {
  const anchorDate = splitLocalIso(series.start_at).date;
  if (compareDates(occurrenceDate, anchorDate) < 0) return false;
  if (series.until_date && compareDates(occurrenceDate, series.until_date) > 0) return false;
  const interval = Math.max(series.interval_count || 1, 1);
  const occurrenceWeekdays = parseWeekdays(series.by_weekday_json);
  const anchorWeekday = (/* @__PURE__ */ new Date(`${anchorDate}T00:00:00Z`)).getUTCDay();
  const targetWeekday = (/* @__PURE__ */ new Date(`${occurrenceDate}T00:00:00Z`)).getUTCDay();
  if (series.frequency === "daily") {
    const start = /* @__PURE__ */ new Date(`${anchorDate}T00:00:00Z`);
    const target = /* @__PURE__ */ new Date(`${occurrenceDate}T00:00:00Z`);
    const diff = Math.round((target.getTime() - start.getTime()) / 864e5);
    return diff % interval === 0;
  }
  if (series.frequency === "weekly") {
    const weeks = Math.floor(
      ((/* @__PURE__ */ new Date(`${startOfWeek(occurrenceDate)}T00:00:00Z`)).getTime() - (/* @__PURE__ */ new Date(`${startOfWeek(anchorDate)}T00:00:00Z`)).getTime()) / (7 * 864e5)
    );
    if (weeks < 0 || weeks % interval !== 0) return false;
    const validWeekdays = occurrenceWeekdays.length > 0 ? occurrenceWeekdays : [anchorWeekday];
    return validWeekdays.includes(targetWeekday);
  }
  if (series.frequency === "monthly") {
    const diff = monthDiff(occurrenceDate, anchorDate);
    if (diff < 0 || diff % interval !== 0) return false;
    return occurrenceDate.slice(8, 10) === anchorDate.slice(8, 10);
  }
  return false;
}
function countOccurrencesThroughDate(series, throughDate) {
  const anchorDate = splitLocalIso(series.start_at).date;
  const cappedThroughDate = series.until_date && compareDates(series.until_date, throughDate) < 0 ? series.until_date : throughDate;
  if (compareDates(cappedThroughDate, anchorDate) < 0) return 0;
  const interval = Math.max(series.interval_count || 1, 1);
  if (series.frequency === "daily") {
    return Math.floor(daysBetween(cappedThroughDate, anchorDate) / interval) + 1;
  }
  if (series.frequency === "weekly") {
    const anchorWeekday = (/* @__PURE__ */ new Date(`${anchorDate}T00:00:00Z`)).getUTCDay();
    const validWeekdays = parseWeekdays(series.by_weekday_json);
    const occurrenceWeekdays = validWeekdays.length > 0 ? validWeekdays : [anchorWeekday];
    const anchorWeekStart = startOfWeek(anchorDate);
    const throughWeekStart = startOfWeek(cappedThroughDate);
    const weekSpan = Math.floor(daysBetween(throughWeekStart, anchorWeekStart) / 7);
    let count = 0;
    for (let weeks = 0; weeks <= weekSpan; weeks += interval) {
      const weekStart = addDays(anchorWeekStart, weeks * 7);
      for (const weekday of occurrenceWeekdays) {
        const occurrenceDate = addDays(weekStart, weekday);
        if (compareDates(occurrenceDate, anchorDate) >= 0 && compareDates(occurrenceDate, cappedThroughDate) <= 0) {
          count += 1;
        }
      }
    }
    return count;
  }
  if (series.frequency === "monthly") {
    const monthSpan = monthDiff(cappedThroughDate, anchorDate);
    let count = 0;
    for (let offset = 0; offset <= monthSpan; offset += interval) {
      const occurrenceDate = addMonthsKeepingDay(anchorDate, offset);
      if (occurrenceDate && compareDates(occurrenceDate, cappedThroughDate) <= 0) {
        count += 1;
      }
    }
    return count;
  }
  return 0;
}
function createOccurrence(base) {
  return {
    id: base.id,
    tenantId: base.tenantId,
    serviceId: base.serviceId,
    bookingId: base.bookingId,
    seriesId: base.seriesId,
    source: base.source,
    title: base.title,
    description: base.description ?? "",
    startAt: base.startAt,
    endAt: base.endAt,
    date: toDisplayDate(base.startAt),
    timezone: base.timezone,
    isAllDay: base.isAllDay,
    status: base.status,
    color: base.color,
    serviceName: base.serviceName,
    readOnly: base.readOnly
  };
}
async function listCalendarOccurrences(db, tenantId, fromDate, toDate) {
  const rangeStart = startOfLocalDay(fromDate);
  const rangeEnd = endOfLocalDayExclusive(toDate);
  const [eventsResult, legacyBookingsResult, busyResult, seriesResult, exceptionsResult] = await Promise.all([
    db.prepare(
      `SELECT calendar_events.*, services.name AS service_name
         FROM calendar_events
         LEFT JOIN services ON services.id = calendar_events.service_id
         WHERE calendar_events.tenant_id = ?
           AND calendar_events.end_at > ?
           AND calendar_events.start_at < ?
         ORDER BY calendar_events.start_at ASC`
    ).bind(tenantId, rangeStart, rangeEnd).all(),
    db.prepare(
      `SELECT
           bookings.id,
           bookings.tenant_id,
           bookings.service_id,
           bookings.created_at,
           COALESCE(bookings.starts_at, bookings.preferred_date || 'T' || bookings.preferred_time || ':00') AS starts_at,
           COALESCE(
             bookings.ends_at,
             REPLACE(
               DATETIME(
                 bookings.preferred_date || ' ' || bookings.preferred_time || ':00',
                 '+' || COALESCE(services.duration_minutes, tenants.slot_duration_minutes) || ' minutes'
               ),
               ' ',
               'T'
             )
           ) AS ends_at,
           bookings.status,
           bookings.details,
           bookings.timezone,
           services.name AS service_name,
           services.color AS service_color,
           tenants.event_title
         FROM bookings
         JOIN tenants ON tenants.id = bookings.tenant_id
         LEFT JOIN services ON services.id = bookings.service_id
         WHERE bookings.tenant_id = ?
           AND bookings.calendar_event_id IS NULL
           AND COALESCE(bookings.ends_at, REPLACE(
             DATETIME(
               bookings.preferred_date || ' ' || bookings.preferred_time || ':00',
               '+' || COALESCE(services.duration_minutes, tenants.slot_duration_minutes) || ' minutes'
             ),
             ' ',
             'T'
           )) > ?
           AND COALESCE(bookings.starts_at, bookings.preferred_date || 'T' || bookings.preferred_time || ':00') < ?
         ORDER BY starts_at ASC`
    ).bind(tenantId, rangeStart, rangeEnd).all(),
    db.prepare(
      `SELECT * FROM external_busy_ranges
         WHERE tenant_id = ?
           AND end_at > ?
           AND start_at < ?
         ORDER BY start_at ASC`
    ).bind(tenantId, rangeStart, rangeEnd).all(),
    db.prepare(
      `SELECT calendar_event_series.*, services.name AS service_name
         FROM calendar_event_series
         LEFT JOIN services ON services.id = calendar_event_series.service_id
         WHERE calendar_event_series.tenant_id = ?
           AND calendar_event_series.status = 'confirmed'
           AND (calendar_event_series.until_date IS NULL OR calendar_event_series.until_date >= ?)
         ORDER BY calendar_event_series.start_at ASC`
    ).bind(tenantId, fromDate).all(),
    db.prepare(
      `SELECT * FROM calendar_event_exceptions
         WHERE tenant_id = ?
           AND occurrence_date >= ?
           AND occurrence_date <= ?`
    ).bind(tenantId, fromDate, toDate).all()
  ]);
  const exceptionsBySeries = /* @__PURE__ */ new Map();
  for (const row of exceptionsResult.results ?? []) {
    const seriesMap = exceptionsBySeries.get(row.series_id) ?? /* @__PURE__ */ new Map();
    seriesMap.set(row.occurrence_date, row);
    exceptionsBySeries.set(row.series_id, seriesMap);
  }
  const occurrences = [];
  for (const row of eventsResult.results ?? []) {
    occurrences.push(
      createOccurrence({
        id: row.id,
        tenantId: row.tenant_id,
        serviceId: row.service_id,
        bookingId: row.booking_id,
        seriesId: null,
        source: row.source,
        title: row.title,
        description: row.description,
        startAt: row.start_at,
        endAt: row.end_at,
        timezone: row.timezone,
        isAllDay: Boolean(row.is_all_day),
        status: row.status,
        color: row.color,
        serviceName: row.service_name,
        readOnly: row.source !== "manual"
      })
    );
  }
  for (const row of legacyBookingsResult.results ?? []) {
    occurrences.push(
      createOccurrence({
        id: row.id,
        tenantId: row.tenant_id,
        serviceId: row.service_id,
        bookingId: row.id,
        seriesId: null,
        source: "booking",
        title: row.service_name ?? row.event_title,
        description: row.details,
        startAt: row.starts_at,
        endAt: row.ends_at,
        timezone: row.timezone,
        isAllDay: false,
        status: row.status === "cancelled" || row.status === "canceled" ? "cancelled" : "confirmed",
        color: row.service_color ?? "#00d4aa",
        serviceName: row.service_name,
        readOnly: true
      })
    );
  }
  for (const row of busyResult.results ?? []) {
    occurrences.push(
      createOccurrence({
        id: row.id,
        tenantId: row.tenant_id,
        serviceId: null,
        bookingId: null,
        seriesId: null,
        source: "external_busy",
        title: "Google busy",
        description: "",
        startAt: row.start_at,
        endAt: row.end_at,
        timezone: "local",
        isAllDay: false,
        status: "confirmed",
        color: "#7f8ea3",
        serviceName: null,
        readOnly: true
      })
    );
  }
  for (const series of seriesResult.results ?? []) {
    const anchor = splitLocalIso(series.start_at);
    const durationMinutes = Math.max(30, minutesBetween(series.start_at, series.end_at));
    const seriesExceptions = exceptionsBySeries.get(series.id) ?? /* @__PURE__ */ new Map();
    let cursor = compareDates(anchor.date, fromDate) > 0 ? anchor.date : fromDate;
    while (compareDates(cursor, toDate) <= 0) {
      if (matchesSeriesOnDate(series, cursor)) {
        const occurrenceIndex = series.occurrence_count !== null ? countOccurrencesThroughDate(series, cursor) : null;
        if (series.occurrence_count === null || occurrenceIndex !== null && occurrenceIndex <= series.occurrence_count) {
          const exception = seriesExceptions.get(cursor);
          if (!exception?.is_cancelled) {
            const startAt = exception?.override_start_at ?? `${cursor}T${anchor.time}:00`;
            const endAt = exception?.override_end_at ?? addMinutesToLocalIso(startAt, durationMinutes);
            occurrences.push(
              createOccurrence({
                id: `${series.id}:${cursor}`,
                tenantId: series.tenant_id,
                serviceId: series.service_id,
                bookingId: null,
                seriesId: series.id,
                source: "manual",
                title: exception?.override_title ?? series.title,
                description: exception?.override_description ?? series.description,
                startAt,
                endAt,
                timezone: series.timezone,
                isAllDay: Boolean(exception?.override_is_all_day ?? series.is_all_day),
                status: series.status,
                color: exception?.override_color ?? series.color,
                serviceName: series.service_name,
                readOnly: false
              })
            );
          }
        }
      }
      cursor = addDays(cursor, 1);
    }
  }
  return occurrences.sort((left, right) => left.startAt.localeCompare(right.startAt));
}
async function listBlockingRangesForDate(db, tenantId, date) {
  const occurrences = await listCalendarOccurrences(db, tenantId, date, date);
  const result = [];
  for (const occurrence of occurrences) {
    if (occurrence.status !== "confirmed") continue;
    const range = clampRangeToDate(occurrence.startAt, occurrence.endAt, date);
    if (range) {
      result.push(range);
    }
  }
  return result;
}
async function createManualCalendarEntry(db, input, userId) {
  const now = isoNow();
  if (input.recurrence) {
    const id2 = makeId();
    await db.prepare(
      `INSERT INTO calendar_event_series (
          id,
          tenant_id,
          service_id,
          title,
          description,
          start_at,
          end_at,
          timezone,
          is_all_day,
          frequency,
          interval_count,
          by_weekday_json,
          until_date,
          occurrence_count,
          color,
          created_by_user_id,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`
    ).bind(
      id2,
      input.tenantId,
      input.serviceId ?? null,
      input.title,
      input.description ?? null,
      input.startAt,
      input.endAt,
      input.timezone,
      input.isAllDay ? 1 : 0,
      input.recurrence.frequency,
      Math.max(input.recurrence.intervalCount ?? 1, 1),
      input.recurrence.byWeekdays ? JSON.stringify(input.recurrence.byWeekdays) : null,
      input.recurrence.untilDate ?? null,
      input.recurrence.occurrenceCount ?? null,
      input.color ?? null,
      userId,
      now,
      now
    ).run();
    return { id: id2, type: "series" };
  }
  const id = makeId();
  await db.prepare(
    `INSERT INTO calendar_events (
        id,
        tenant_id,
        service_id,
        booking_id,
        source,
        title,
        description,
        start_at,
        end_at,
        timezone,
        is_all_day,
        status,
        color,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, NULL, 'manual', ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`
  ).bind(
    id,
    input.tenantId,
    input.serviceId ?? null,
    input.title,
    input.description ?? null,
    input.startAt,
    input.endAt,
    input.timezone,
    input.isAllDay ? 1 : 0,
    input.color ?? null,
    userId,
    now,
    now
  ).run();
  return { id, type: "event" };
}
async function updateManualCalendarEvent(db, tenantId, eventId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return false;
  const result = await db.prepare(
    `UPDATE calendar_events
       SET ${entries.map(([key]) => `${key} = ?`).join(", ")}, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND source = 'manual'`
  ).bind(...entries.map(([, value]) => value), isoNow(), tenantId, eventId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function updateCalendarSeries(db, tenantId, seriesId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return false;
  const result = await db.prepare(
    `UPDATE calendar_event_series
       SET ${entries.map(([key]) => `${key} = ?`).join(", ")}, updated_at = ?
       WHERE tenant_id = ? AND id = ?`
  ).bind(...entries.map(([, value]) => value), isoNow(), tenantId, seriesId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function deleteManualCalendarEvent(db, tenantId, eventId) {
  const result = await db.prepare(`DELETE FROM calendar_events WHERE tenant_id = ? AND id = ? AND source = 'manual'`).bind(tenantId, eventId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function deleteCalendarSeries(db, tenantId, seriesId) {
  await db.prepare("DELETE FROM calendar_event_exceptions WHERE tenant_id = ? AND series_id = ?").bind(tenantId, seriesId).run();
  const result = await db.prepare("DELETE FROM calendar_event_series WHERE tenant_id = ? AND id = ?").bind(tenantId, seriesId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function upsertCalendarSeriesException(db, tenantId, seriesId, occurrenceDate, fields) {
  const existing = await db.prepare(
    "SELECT * FROM calendar_event_exceptions WHERE tenant_id = ? AND series_id = ? AND occurrence_date = ? LIMIT 1"
  ).bind(tenantId, seriesId, occurrenceDate).first();
  const now = isoNow();
  if (existing) {
    await db.prepare(
      `UPDATE calendar_event_exceptions
         SET is_cancelled = ?, override_title = ?, override_description = ?, override_start_at = ?, override_end_at = ?, override_is_all_day = ?, override_color = ?, updated_at = ?
         WHERE id = ?`
    ).bind(
      fields.isCancelled ? 1 : 0,
      fields.overrideTitle ?? null,
      fields.overrideDescription ?? null,
      fields.overrideStartAt ?? null,
      fields.overrideEndAt ?? null,
      fields.overrideIsAllDay === null || fields.overrideIsAllDay === void 0 ? null : fields.overrideIsAllDay ? 1 : 0,
      fields.overrideColor ?? null,
      now,
      existing.id
    ).run();
    return;
  }
  await db.prepare(
    `INSERT INTO calendar_event_exceptions (
        id,
        series_id,
        tenant_id,
        occurrence_date,
        is_cancelled,
        override_title,
        override_description,
        override_start_at,
        override_end_at,
        override_is_all_day,
        override_color,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    makeId(),
    seriesId,
    tenantId,
    occurrenceDate,
    fields.isCancelled ? 1 : 0,
    fields.overrideTitle ?? null,
    fields.overrideDescription ?? null,
    fields.overrideStartAt ?? null,
    fields.overrideEndAt ?? null,
    fields.overrideIsAllDay === null || fields.overrideIsAllDay === void 0 ? null : fields.overrideIsAllDay ? 1 : 0,
    fields.overrideColor ?? null,
    now,
    now
  ).run();
}
async function createBookingCalendarEvent(db, input) {
  await db.prepare(
    `INSERT INTO calendar_events (
        id,
        tenant_id,
        service_id,
        booking_id,
        source,
        title,
        description,
        start_at,
        end_at,
        timezone,
        is_all_day,
        status,
        color,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'booking', ?, ?, ?, ?, ?, 0, 'confirmed', ?, NULL, ?, ?)`
  ).bind(
    input.eventId,
    input.tenantId,
    input.service.id,
    input.bookingId,
    input.service.name,
    input.details || null,
    input.startAt,
    input.endAt,
    input.timezone,
    input.service.color ?? null,
    input.createdAt,
    input.createdAt
  ).run();
}
async function updateBookingCalendarEvent(db, tenantId, bookingId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return;
  await db.prepare(
    `UPDATE calendar_events
       SET ${entries.map(([key]) => `${key} = ?`).join(", ")}, updated_at = ?
       WHERE tenant_id = ? AND booking_id = ?`
  ).bind(...entries.map(([, value]) => value), isoNow(), tenantId, bookingId).run();
}

// src/lib/server/google-calendar.ts
function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - normalized.length % 4);
  const decoded = atob(normalized + padding);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}
async function resolveSecret(binding) {
  if (!binding) return "";
  if (typeof binding === "string") return binding;
  return binding.get();
}
async function deriveAesKey(secret) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function deriveHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
async function decryptSecret(value, secret) {
  const payload = base64UrlDecode(value);
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);
  const key = await deriveAesKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
function readGoogleTokenResponse(value) {
  if (!isObjectRecord(value) || typeof value.access_token !== "string") {
    throw new Error("Google token response was invalid");
  }
  return {
    access_token: value.access_token,
    expires_in: typeof value.expires_in === "number" ? value.expires_in : void 0,
    refresh_token: typeof value.refresh_token === "string" ? value.refresh_token : void 0,
    scope: typeof value.scope === "string" ? value.scope : void 0,
    id_token: typeof value.id_token === "string" ? value.id_token : void 0
  };
}
function readGoogleBusyRanges(value) {
  if (!isObjectRecord(value)) {
    return [];
  }
  const calendars = value.calendars;
  if (!isObjectRecord(calendars)) {
    return [];
  }
  const primary = calendars.primary;
  if (!isObjectRecord(primary) || !Array.isArray(primary.busy)) {
    return [];
  }
  return primary.busy.flatMap((entry) => {
    if (!isObjectRecord(entry)) {
      return [];
    }
    return typeof entry.start === "string" && typeof entry.end === "string" ? [{ start: entry.start, end: entry.end }] : [];
  });
}
async function signState(secret, payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const key = await deriveHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoded);
  return `${base64UrlEncode(encoded)}.${base64UrlEncode(new Uint8Array(signature))}`;
}
async function buildGoogleConnectUrl(input) {
  const clientId = input.env.GOOGLE_CLIENT_ID;
  const stateSecret = await resolveSecret(input.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  if (!clientId || !stateSecret) {
    throw new Error("Google OAuth is not configured");
  }
  const redirectUri = `${input.origin}/api/admin/google/callback`;
  const state = await signState(stateSecret, {
    tenantId: input.tenantId,
    userId: input.userId,
    redirectUri
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.readonly email",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
async function refreshAccessToken(input) {
  const clientId = input.env.GOOGLE_CLIENT_ID;
  const clientSecret = input.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`);
  }
  return readGoogleTokenResponse(await response.json());
}
async function fetchGoogleBusy(accessToken, windowStart, windowEnd) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      timeMin: windowStart,
      timeMax: windowEnd,
      timeZone: "UTC",
      items: [{ id: "primary" }]
    })
  });
  if (!response.ok) {
    throw new Error(`Google freeBusy request failed (${response.status})`);
  }
  return readGoogleBusyRanges(await response.json());
}
async function getGoogleConnection(db, tenantId) {
  return db.prepare("SELECT * FROM google_calendar_connections WHERE tenant_id = ? LIMIT 1").bind(tenantId).first();
}
async function getGoogleConnectionStatus(db, tenantId) {
  const connection = await getGoogleConnection(db, tenantId);
  if (!connection) {
    return {
      connected: false,
      provider: "google",
      externalCalendarId: null,
      externalAccountEmail: null,
      lastSyncedAt: null,
      syncWindowStartAt: null,
      syncWindowEndAt: null
    };
  }
  return {
    connected: true,
    provider: "google",
    externalCalendarId: connection.external_calendar_id,
    externalAccountEmail: connection.external_account_email,
    lastSyncedAt: connection.last_synced_at,
    syncWindowStartAt: connection.sync_window_start_at,
    syncWindowEndAt: connection.sync_window_end_at
  };
}
async function disconnectGoogleCalendar(db, tenantId) {
  const connection = await getGoogleConnection(db, tenantId);
  if (!connection) return;
  await db.prepare("DELETE FROM external_busy_ranges WHERE connection_id = ?").bind(connection.id).run();
  await db.prepare("DELETE FROM google_calendar_connections WHERE id = ?").bind(connection.id).run();
}
async function refreshGoogleBusyCache(db, env, tenant, options = {}) {
  const connection = await getGoogleConnection(db, tenant.id);
  if (!connection) return;
  const now = Date.now();
  const isFresh = connection.last_synced_at && now - new Date(connection.last_synced_at).getTime() < 5 * 60 * 1e3 && !options.force;
  if (isFresh) {
    return;
  }
  const secret = await resolveSecret(env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  if (!secret) {
    throw new Error("Google token encryption is not configured");
  }
  const refreshToken = await decryptSecret(connection.encrypted_refresh_token, secret);
  const tokens = await refreshAccessToken({ env, refreshToken });
  const windowStartUtc = (/* @__PURE__ */ new Date()).toISOString();
  const windowEndUtc = new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3).toISOString();
  const busyRanges = await fetchGoogleBusy(tokens.access_token, windowStartUtc, windowEndUtc);
  const syncedAt = isoNow();
  const nowIso = syncedAt;
  await db.prepare("DELETE FROM external_busy_ranges WHERE connection_id = ?").bind(connection.id).run();
  for (const range of busyRanges) {
    const startAt = formatUtcIsoInTimeZone(range.start, tenant.timezone);
    const endAt = formatUtcIsoInTimeZone(range.end, tenant.timezone);
    await db.prepare(
      `INSERT INTO external_busy_ranges (
          id,
          connection_id,
          tenant_id,
          provider,
          external_calendar_id,
          start_at,
          end_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'google', 'primary', ?, ?, ?, ?)`
    ).bind(makeId(), connection.id, tenant.id, startAt, endAt, nowIso, nowIso).run();
  }
  await db.prepare(
    `UPDATE google_calendar_connections
       SET token_expires_at = ?, last_synced_at = ?, sync_window_start_at = ?, sync_window_end_at = ?, updated_at = ?
       WHERE id = ?`
  ).bind(
    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1e3).toISOString() : null,
    syncedAt,
    formatUtcIsoInTimeZone(windowStartUtc, tenant.timezone),
    formatUtcIsoInTimeZone(windowEndUtc, tenant.timezone),
    syncedAt,
    connection.id
  ).run();
}

// scripts/cli/guardrails.ts
function requireExactConfirmation(parsed, label, target) {
  if (!readBooleanFlag(parsed, "yes", false)) {
    throw new Error(`Refusing to ${label} ${target} without --yes.`);
  }
  if (readStringFlag(parsed, "confirm") !== target) {
    throw new Error(`Refusing to ${label} ${target} without --confirm ${target}.`);
  }
}

// src/lib/server/services.ts
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "service";
}
async function listServicesByTenant(db, tenantId, options = {}) {
  const activeOnly = options.activeOnly ?? false;
  const sql = activeOnly ? "SELECT * FROM services WHERE tenant_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC" : "SELECT * FROM services WHERE tenant_id = ? ORDER BY is_active DESC, sort_order ASC, created_at ASC";
  const result = await db.prepare(sql).bind(tenantId).all();
  return result.results ?? [];
}
async function getServiceById(db, tenantId, serviceId) {
  return db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ? LIMIT 1").bind(tenantId, serviceId).first();
}
async function createService(db, tenantId, input) {
  const now = isoNow();
  const id = makeId();
  const slug = slugify(input.name);
  await db.prepare(
    `INSERT INTO services (
        id,
        tenant_id,
        slug,
        name,
        description,
        duration_minutes,
        meeting_type,
        color,
        is_active,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    tenantId,
    slug,
    input.name,
    input.description ?? null,
    input.durationMinutes,
    input.meetingType,
    input.color ?? "#00d4aa",
    input.isActive === false ? 0 : 1,
    input.sortOrder ?? 0,
    now,
    now
  ).run();
  const created = await getServiceById(db, tenantId, id);
  if (!created) {
    throw new Error("Service creation failed");
  }
  return created;
}
async function updateService(db, tenantId, serviceId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return false;
  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  const result = await db.prepare(`UPDATE services SET ${sets}, updated_at = ? WHERE tenant_id = ? AND id = ?`).bind(...values, isoNow(), tenantId, serviceId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function deleteService(db, tenantId, serviceId) {
  const result = await db.prepare("DELETE FROM services WHERE tenant_id = ? AND id = ?").bind(tenantId, serviceId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function ensureDefaultServiceForTenant(db, tenant) {
  const existing = await listServicesByTenant(db, tenant.id);
  if (existing.length > 0) {
    return existing[0];
  }
  return createService(db, tenant.id, {
    name: tenant.event_title,
    description: tenant.description ?? "",
    durationMinutes: tenant.slot_duration_minutes,
    meetingType: tenant.meeting_type,
    color: tenant.accent_color ?? "#00d4aa",
    sortOrder: 0
  });
}

// src/lib/server/tenant.ts
function tenantRowToConfig(row) {
  let coverItems = [];
  if (row.cover_items_json) {
    try {
      const parsed = JSON.parse(row.cover_items_json);
      if (Array.isArray(parsed)) {
        coverItems = parsed.filter((item) => typeof item === "string");
      }
    } catch {
      coverItems = [];
    }
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandInitials: row.brand_initials ?? row.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    description: row.description ?? "",
    coverItems,
    timezone: row.timezone,
    accentColor: row.accent_color ?? "#00d4aa",
    logoUrl: row.logo_url
  };
}
async function getTenantBySlug(db, slug) {
  return db.prepare("SELECT * FROM tenants WHERE slug = ? AND status = ?").bind(slug, "active").first();
}
async function getTenantById(db, id) {
  return db.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first();
}
async function updateTenant(db, id, fields) {
  const entries = Object.entries(fields).filter(([, v]) => v !== void 0);
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`UPDATE tenants SET ${sets}, updated_at = ? WHERE id = ?`).bind(...values, now, id).run();
}
async function createTenant(db, row) {
  await db.prepare(
    `INSERT INTO tenants (id, slug, name, organization_id, organization_slug, brand_initials, event_title, description, cover_items_json, slot_duration_minutes, meeting_type, timezone, accent_color, logo_url, notify_emails, from_email, webhook_url, webhook_signing_secret, zerosmb_tenant_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    row.id,
    row.slug,
    row.name,
    row.organization_id,
    row.organization_slug,
    row.brand_initials,
    row.event_title,
    row.description,
    row.cover_items_json,
    row.slot_duration_minutes,
    row.meeting_type,
    row.timezone,
    row.accent_color,
    row.logo_url,
    row.notify_emails,
    row.from_email,
    row.webhook_url,
    row.webhook_signing_secret,
    row.zerosmb_tenant_id,
    row.status,
    row.created_at,
    row.updated_at
  ).run();
}

// src/lib/server/time-projects.ts
async function listTimeProjectsByTenant(db, tenantId, options = {}) {
  const includeArchived = options.includeArchived ?? false;
  const sql = includeArchived ? "SELECT * FROM time_projects WHERE tenant_id = ? ORDER BY is_archived ASC, sort_order ASC, created_at ASC" : "SELECT * FROM time_projects WHERE tenant_id = ? AND is_archived = 0 ORDER BY sort_order ASC, created_at ASC";
  const result = await db.prepare(sql).bind(tenantId).all();
  return result.results ?? [];
}
async function getTimeProjectById(db, tenantId, projectId) {
  return db.prepare("SELECT * FROM time_projects WHERE tenant_id = ? AND id = ? LIMIT 1").bind(tenantId, projectId).first();
}
async function createTimeProject(db, tenantId, input) {
  const now = isoNow();
  const id = makeId();
  await db.prepare(
    `INSERT INTO time_projects (
	        id,
	        tenant_id,
	        name,
	        color,
	        is_archived,
	        sort_order,
	        managed_by_workspace,
	        is_local,
	        created_at,
	        updated_at
	      ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
  ).bind(
    id,
    tenantId,
    input.name,
    input.color ?? "#00d4aa",
    0,
    input.sortOrder ?? 0,
    now,
    now
  ).run();
  const created = await getTimeProjectById(db, tenantId, id);
  if (!created) {
    throw new Error("Time project creation failed");
  }
  return created;
}
async function updateTimeProject(db, tenantId, projectId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return false;
  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  const result = await db.prepare(`UPDATE time_projects SET ${sets}, updated_at = ? WHERE tenant_id = ? AND id = ?`).bind(...values, isoNow(), tenantId, projectId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function deleteTimeProject(db, tenantId, projectId) {
  await db.prepare("UPDATE time_entries SET project_id = NULL, updated_at = ? WHERE tenant_id = ? AND project_id = ?").bind(isoNow(), tenantId, projectId).run();
  const result = await db.prepare("DELETE FROM time_projects WHERE tenant_id = ? AND id = ?").bind(tenantId, projectId).run();
  return (result.meta?.changes ?? 0) > 0;
}

// scripts/cli/shared.ts
function deriveInitials(name) {
  return name.split(/\s+/u).map((part) => part.slice(0, 1)).join("").slice(0, 2).toUpperCase();
}
function readNullableStringFlag(parsed, key) {
  if (readBooleanFlag(parsed, `clear-${key}`, false)) {
    return null;
  }
  return readStringFlag(parsed, key);
}
function readTenantSelector(parsed) {
  return readRequiredStringFlag(parsed, "tenant");
}
function readMembershipRole(parsed, key, fallback) {
  const role = readStringFlag(parsed, key);
  if (!role) {
    return fallback;
  }
  if (role === "owner" || role === "admin") {
    return role;
  }
  throw new Error(`--${key} must be owner or admin`);
}
async function resolveTenant(db, selector) {
  const byId = await getTenantById(db, selector);
  if (byId) {
    return byId;
  }
  const bySlug = await getTenantBySlug(db, selector);
  if (bySlug) {
    return bySlug;
  }
  throw new Error(`Tenant not found: ${selector}`);
}
async function resolveService(db, tenantId, selector) {
  const byId = await getServiceById(db, tenantId, selector);
  if (byId) {
    return byId;
  }
  const services = await listServicesByTenant(db, tenantId);
  const bySlug = services.find((service) => service.slug === selector);
  if (!bySlug) {
    throw new Error(`Service not found: ${selector}`);
  }
  return bySlug;
}
async function resolveTimeProject(db, tenantId, selector) {
  const byId = await getTimeProjectById(db, tenantId, selector);
  if (byId) {
    return byId;
  }
  const projects = await listTimeProjectsByTenant(db, tenantId, { includeArchived: true });
  const normalized = selector.trim().toLowerCase();
  const byName = projects.find((project) => project.name.trim().toLowerCase() === normalized);
  if (!byName) {
    throw new Error(`Time project not found: ${selector}`);
  }
  return byName;
}
function readFrequencyFlag(parsed) {
  const frequency = readStringFlag(parsed, "frequency");
  if (!frequency) {
    return void 0;
  }
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") {
    return frequency;
  }
  throw new Error("--frequency must be daily, weekly, or monthly");
}
function readWeekdays(parsed) {
  const values = readStringListFlag(parsed, "weekday");
  if (values.length === 0) {
    return void 0;
  }
  const weekdays = values.map((value) => Number(value));
  if (weekdays.some((value) => !Number.isInteger(value) || value < 0 || value > 6)) {
    throw new Error("--weekday values must be integers between 0 and 6");
  }
  return weekdays;
}
function requireDuration(parsed, service) {
  if (service) {
    return service.duration_minutes;
  }
  const duration = readNumberFlag(parsed, "duration");
  if (duration === void 0) {
    throw new Error("Provide --service or --duration");
  }
  return duration;
}

// scripts/cli/booking-command.ts
function buildBookingPayload(parsed, serviceId) {
  return {
    serviceId,
    name: readRequiredStringFlag(parsed, "name"),
    email: readRequiredStringFlag(parsed, "email"),
    phone: readStringFlag(parsed, "phone") ?? "",
    company: readStringFlag(parsed, "company") ?? "",
    preferredDate: readRequiredStringFlag(parsed, "date"),
    preferredTime: readRequiredStringFlag(parsed, "time"),
    timezone: readRequiredStringFlag(parsed, "timezone"),
    details: readStringFlag(parsed, "details") ?? ""
  };
}
async function handleBookingCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "list") {
    return listBookings(context.db, tenant.id, {
      status: readStringFlag(parsed, "status"),
      limit: readNumberFlag(parsed, "limit") ?? 50,
      offset: readNumberFlag(parsed, "offset") ?? 0
    });
  }
  if (action === "get") {
    return getBookingById(context.db, tenant.id, readRequiredStringFlag(parsed, "booking"));
  }
  if (action === "create") {
    const service = await resolveService(context.db, tenant.id, readRequiredStringFlag(parsed, "service"));
    const payload = buildBookingPayload(parsed, service.id);
    const startsAt = toLocalIso(payload.preferredDate, payload.preferredTime);
    const endsAt = addMinutesToLocalIso(startsAt, service.duration_minutes);
    const { id, createdAt } = await storeBooking(context.db, tenant.id, payload, {
      serviceId: service.id,
      startsAt,
      endsAt,
      source: readStringFlag(parsed, "source") ?? "cli"
    });
    const eventId = makeId();
    await createBookingCalendarEvent(context.db, {
      eventId,
      bookingId: id,
      tenantId: tenant.id,
      service,
      details: payload.details,
      startAt: startsAt,
      endAt: endsAt,
      timezone: tenant.timezone,
      createdAt
    });
    await linkBookingCalendarEvent(context.db, tenant.id, id, eventId);
    return getBookingById(context.db, tenant.id, id);
  }
  const bookingId = readRequiredStringFlag(parsed, "booking");
  const booking = await getBookingById(context.db, tenant.id, bookingId);
  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }
  if (action === "confirm") {
    const ok = await updateBookingStatus(context.db, tenant.id, bookingId, "confirmed");
    await updateBookingCalendarEvent(context.db, tenant.id, bookingId, { status: "confirmed" });
    return { ok };
  }
  if (action === "cancel") {
    const ok = await updateBookingStatus(context.db, tenant.id, bookingId, "cancelled", readStringFlag(parsed, "reason"));
    await updateBookingCalendarEvent(context.db, tenant.id, bookingId, { status: "cancelled" });
    return { ok };
  }
  if (action === "reschedule") {
    const serviceSelector = readStringFlag(parsed, "service") ?? booking.service_id;
    if (!serviceSelector) {
      throw new Error("Provide --service because this booking does not have a service_id yet");
    }
    const service = await resolveService(context.db, tenant.id, serviceSelector);
    const preferredDate = readRequiredStringFlag(parsed, "date");
    const preferredTime = readRequiredStringFlag(parsed, "time");
    const startsAt = toLocalIso(preferredDate, preferredTime);
    const endsAt = addMinutesToLocalIso(startsAt, service.duration_minutes);
    const ok = await rescheduleBooking(context.db, tenant.id, bookingId, {
      serviceId: service.id,
      preferredDate,
      preferredTime,
      startsAt,
      endsAt
    });
    await updateBookingCalendarEvent(context.db, tenant.id, bookingId, {
      service_id: service.id,
      title: service.name,
      description: booking.details,
      start_at: startsAt,
      end_at: endsAt,
      color: service.color,
      status: booking.status === "cancelled" ? "cancelled" : "confirmed"
    });
    return { ok };
  }
  throw new Error(`Unknown booking action: ${action}`);
}
async function handleGoogleCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "status") {
    return getGoogleConnectionStatus(context.db, tenant.id);
  }
  if (action === "connect-url") {
    return {
      url: await buildGoogleConnectUrl({
        env: context.env,
        origin: readRequiredStringFlag(parsed, "origin"),
        tenantId: tenant.id,
        userId: readRequiredStringFlag(parsed, "user")
      })
    };
  }
  if (action === "refresh") {
    await refreshGoogleBusyCache(context.db, context.env, tenant, {
      force: readBooleanFlag(parsed, "force", false)
    });
    return getGoogleConnectionStatus(context.db, tenant.id);
  }
  if (action === "disconnect") {
    requireExactConfirmation(parsed, "disconnect Google calendar for tenant", tenant.id);
    await disconnectGoogleCalendar(context.db, tenant.id);
    return { ok: true };
  }
  throw new Error(`Unknown google action: ${action}`);
}

// scripts/cli/db-command.ts
import { readdir } from "node:fs/promises";
import path2 from "node:path";
import process2 from "node:process";

// scripts/cli/d1.ts
import { spawn as spawn2 } from "node:child_process";
function quoteSqlValue(value) {
  if (value === null || value === void 0) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot bind non-finite number: ${String(value)}`);
    }
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}
function interpolateSql(sql, values) {
  const segments = sql.split("?");
  const placeholderCount = segments.length - 1;
  if (placeholderCount !== values.length) {
    throw new Error(
      `Expected ${String(placeholderCount)} SQL bindings but received ${String(values.length)}`
    );
  }
  let output = segments[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    output += `${quoteSqlValue(values[index])}${segments[index + 1] ?? ""}`;
  }
  return output;
}
async function runWrangler(options, extraArgs) {
  const env = { ...process.env };
  delete env.NO_COLOR;
  const args = [
    "exec",
    "wrangler",
    "d1",
    "execute",
    options.databaseName,
    options.mode === "remote" ? "--remote" : "--local",
    "--json",
    ...options.persistTo ? ["--persist-to", options.persistTo] : [],
    ...extraArgs
  ];
  return new Promise((resolve2, reject) => {
    const child = spawn2("pnpm", args, {
      cwd: options.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout2 = "";
    let stderr2 = "";
    child.stdout.on("data", (chunk) => {
      stdout2 += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr2 += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve2(stdout2);
        return;
      }
      const message = stderr2.trim() || stdout2.trim() || `wrangler exited with code ${String(code)}`;
      reject(new Error(message));
    });
  });
}
async function runCommand(options, sql) {
  return runWrangler(options, ["--command", sql]);
}
async function executeStatements(options, sql) {
  const rawOutput = await runCommand(options, sql);
  const parsed = JSON.parse(rawOutput);
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected wrangler JSON response");
  }
  const results = parsed;
  const failed = results.find((entry) => !entry.success);
  if (failed) {
    throw new Error(failed.error ?? "D1 statement failed");
  }
  return results;
}
var CliD1PreparedStatement = class _CliD1PreparedStatement {
  constructor(options, sql, values = []) {
    this.options = options;
    this.sql = sql;
    this.values = values;
  }
  options;
  sql;
  values;
  bind(...values) {
    return new _CliD1PreparedStatement(this.options, this.sql, values);
  }
  async first(columnName) {
    const rendered = interpolateSql(this.sql, this.values);
    const results = await executeStatements(this.options, rendered);
    const result = results[0];
    const firstRow = result.results?.[0] ?? null;
    if (!firstRow) {
      return null;
    }
    if (columnName) {
      return firstRow[columnName] ?? null;
    }
    return firstRow;
  }
  async all() {
    const rendered = interpolateSql(this.sql, this.values);
    const results = await executeStatements(this.options, rendered);
    const result = results[0];
    return {
      success: true,
      results: result.results ?? [],
      meta: result.meta ?? {}
    };
  }
  async run() {
    const rendered = interpolateSql(this.sql, this.values).replace(/;+\s*$/u, "");
    const results = await executeStatements(
      this.options,
      `${rendered}; SELECT changes() AS __changes, last_insert_rowid() AS __lastRowId`
    );
    const changesProbe = results[results.length - 1];
    const probeRow = changesProbe.results?.[0] ?? {};
    return {
      success: true,
      results: [],
      meta: {
        ...changesProbe.meta ?? {},
        changes: probeRow.__changes ?? 0,
        last_row_id: probeRow.__lastRowId ?? 0
      }
    };
  }
};
function createCliD1Database(options) {
  const database = {
    prepare: (sql) => new CliD1PreparedStatement(options, sql),
    batch: async (statements) => {
      const results = [];
      for (const statement of statements) {
        const runnable = statement;
        results.push(await runnable.run());
      }
      return results;
    },
    exec: async (sql) => {
      const results = await executeStatements(options, sql);
      return {
        count: results.length,
        duration: results.reduce((sum, result) => sum + (result.meta?.duration ?? 0), 0)
      };
    }
  };
  return database;
}
async function runSql(options, sql) {
  const results = await executeStatements(options, sql);
  const result = results[0];
  return result.results ?? [];
}
async function runSqlFile(options, filePath) {
  await runWrangler(options, ["--file", filePath]);
}

// scripts/cli/db-command.ts
async function handleDbCommand(context, action, parsed) {
  if (action === "query") {
    const sql = readRequiredStringFlag(parsed, "sql");
    return runSql(context.d1, sql);
  }
  if (action === "migrate") {
    const explicitFile = readStringFlag(parsed, "file");
    const migrationDir = path2.resolve(process2.cwd(), readStringFlag(parsed, "dir") ?? "migrations");
    const files = explicitFile ? [path2.resolve(process2.cwd(), explicitFile)] : (await readdir(migrationDir)).filter((entry) => entry.endsWith(".sql")).sort().map((entry) => path2.join(migrationDir, entry));
    const applied = [];
    for (const file of files) {
      await runSqlFile(context.d1, file);
      applied.push(path2.relative(process2.cwd(), file));
    }
    return {
      ok: true,
      mode: context.d1.mode,
      database: context.d1.databaseName,
      applied
    };
  }
  throw new Error(`Unknown db action: ${action}`);
}

// scripts/cli/local-plane-command.ts
import { mkdir as mkdir3, readFile as readFile2, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
import os2 from "node:os";
import path3 from "node:path";
function stateHome2(env) {
  const home = env.HOME?.trim() || os2.homedir();
  return env.XDG_DATA_HOME?.trim() || path3.join(home, ".local", "share");
}
function expandHome(value, env) {
  const home = env.HOME?.trim() || os2.homedir();
  if (value === "~") return home;
  if (value.startsWith("~/")) return path3.join(home, value.slice(2));
  return value;
}
function envPrefix(appId) {
  return appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}
function normalizeMode(value, label) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return void 0;
  if (normalized === "cloud" || normalized === "local") return normalized;
  throw new Error(`${label} must be cloud or local.`);
}
function defaultLocalPlaneDbPath(env) {
  return path3.join(stateHome2(env), "mere", "local-plane.db");
}
function readMode(input) {
  const argument = normalizeMode(input.argument, input.label);
  if (argument) return { value: argument, source: "argument" };
  for (const [name, value] of input.appEnv) {
    const mode = normalizeMode(value, name);
    if (mode) return { value: mode, source: "app-env" };
  }
  for (const [name, value] of input.globalEnv) {
    const mode = normalizeMode(value, name);
    if (mode) return { value: mode, source: "global-env" };
  }
  return { value: "cloud", source: "default" };
}
function readLocalDbPath(input) {
  const prefix = envPrefix(input.appId);
  if (input.argument?.trim()) {
    return {
      value: path3.resolve(expandHome(input.argument, input.env)),
      source: "argument"
    };
  }
  const appValue = input.env[`${prefix}_LOCAL_DB`] ?? input.env[`${prefix}_LOCAL_PLANE_DB`];
  if (appValue?.trim()) {
    return {
      value: path3.resolve(expandHome(appValue, input.env)),
      source: "app-env"
    };
  }
  const globalValue = input.env.MERE_LOCAL_DB ?? input.env.MERE_LOCAL_PLANE_DB;
  if (globalValue?.trim()) {
    return {
      value: path3.resolve(expandHome(globalValue, input.env)),
      source: "global-env"
    };
  }
  return {
    value: path3.resolve(defaultLocalPlaneDbPath(input.env)),
    source: "default"
  };
}
function resolvePlaneConfigInspection(input) {
  const env = input.env ?? process.env;
  const prefix = envPrefix(input.appId);
  const data = readMode({
    argument: input.data,
    appEnv: [
      [`${prefix}_DATA_PLANE`, env[`${prefix}_DATA_PLANE`]],
      [`${prefix}_STORE`, env[`${prefix}_STORE`]]
    ],
    globalEnv: [["MERE_DATA_PLANE", env.MERE_DATA_PLANE]],
    label: "data plane"
  });
  const ai = readMode({
    argument: input.ai,
    appEnv: [
      [`${prefix}_AI_PLANE`, env[`${prefix}_AI_PLANE`]],
      [`${prefix}_AI`, env[`${prefix}_AI`]]
    ],
    globalEnv: [["MERE_AI_PLANE", env.MERE_AI_PLANE]],
    label: "AI plane"
  });
  const localDbPath = readLocalDbPath({
    argument: input.localDbPath,
    appId: input.appId,
    env
  });
  return {
    appId: input.appId,
    data: data.value,
    ai: ai.value,
    localDbPath: localDbPath.value,
    cloudProjection: "cloudflare",
    blended: data.value !== ai.value,
    localData: data.value === "local",
    localAi: ai.value === "local",
    sources: {
      data: data.source,
      ai: ai.source,
      localDbPath: localDbPath.source
    }
  };
}
function formatPlaneConfigReport(report) {
  const lines = ["Local plane config:"];
  for (const config of report.configs) {
    lines.push(
      `  - ${config.appId}: data=${config.data}(${config.sources.data}) ai=${config.ai}(${config.sources.ai}) db=${config.localDbPath}(${config.sources.localDbPath}) projection=${config.cloudProjection}${config.blended ? " blended" : ""}`
    );
  }
  return `${lines.join("\n")}
`;
}

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/projection.ts
var CloudProjectionDeliveryError = class extends Error {
  constructor(message, status = null, responseText = null) {
    super(message);
    this.status = status;
    this.responseText = responseText;
    this.name = "CloudProjectionDeliveryError";
  }
  status;
  responseText;
};
function envPrefix2(appId) {
  return appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}
function readTargetValue(input) {
  const argument = input.argument?.trim();
  if (argument) return { value: argument, source: "argument" };
  for (const value of input.appValues) {
    const trimmed = value?.trim();
    if (trimmed) return { value: trimmed, source: "app-env" };
  }
  for (const value of input.globalValues) {
    const trimmed = value?.trim();
    if (trimmed) return { value: trimmed, source: "global-env" };
  }
  return null;
}
function parseResponseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
function resolveCloudProjectionTarget(input) {
  const env = input.env ?? process.env;
  const prefix = envPrefix2(input.appId);
  const receiverUrl = readTargetValue({
    argument: input.receiverUrl,
    appValues: [
      env[`${prefix}_PROJECTION_URL`],
      env[`${prefix}_BUSINESS_PROJECTION_URL`],
      env[`${prefix}_WEBHOOK_URL`]
    ],
    globalValues: [
      env.MERE_BUSINESS_PROJECTION_URL,
      env.MERE_CLOUD_PROJECTION_URL,
      env.MERE_PROJECTION_URL
    ]
  });
  const bearerToken = readTargetValue({
    argument: input.bearerToken,
    appValues: [
      env[`${prefix}_PROJECTION_TOKEN`],
      env[`${prefix}_BUSINESS_PROJECTION_TOKEN`],
      env[`${prefix}_WEBHOOK_TOKEN`]
    ],
    globalValues: [
      env.MERE_BUSINESS_PROJECTION_TOKEN,
      env.MERE_CLOUD_PROJECTION_TOKEN,
      env.MERE_PROJECTION_TOKEN
    ]
  });
  if (!receiverUrl) {
    throw new Error(
      `Missing Cloudflare projection receiver URL. Pass a receiver URL or set ${prefix}_PROJECTION_URL.`
    );
  }
  if (!bearerToken) {
    throw new Error(
      `Missing Cloudflare projection bearer token. Pass a bearer token or set ${prefix}_PROJECTION_TOKEN.`
    );
  }
  return {
    receiverUrl: new URL(receiverUrl.value).toString(),
    bearerToken: bearerToken.value,
    sources: {
      receiverUrl: receiverUrl.source,
      bearerToken: bearerToken.source
    }
  };
}
async function deliverCloudProjectionEvent(input) {
  const target = resolveCloudProjectionTarget(input);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(target.receiverUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${target.bearerToken}`
    },
    body: JSON.stringify(input.event)
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new CloudProjectionDeliveryError(
      `Cloudflare projection receiver returned ${response.status}.`,
      response.status,
      responseText
    );
  }
  return {
    ok: true,
    status: response.status,
    receiverUrl: target.receiverUrl,
    responseText,
    responseJson: parseResponseJson(responseText)
  };
}

// scripts/cli/local-store.ts
import { createHash as createHash2, randomUUID as randomUUID3 } from "node:crypto";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { mkdir as mkdir2 } from "node:fs/promises";
import path4 from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/migration.ts
import { createHash, randomUUID as randomUUID2 } from "node:crypto";
var PLANE_TRANSFER_KIND = "mere.local-plane.transfer";
var PLANE_TRANSFER_VERSION = 1;
function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function readString(record, key, label) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}.${key} is required.`);
  }
  return value;
}
function readPlaneMode(record, key, label) {
  const value = readString(record, key, label);
  if (value !== "cloud" && value !== "local") {
    throw new Error(`${label}.${key} must be cloud or local.`);
  }
  return value;
}
function stringifyPayload(payload) {
  const text = JSON.stringify(payload);
  if (text === void 0) {
    throw new Error("Transfer payload must be JSON serializable.");
  }
  return text;
}
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function hashPlanePayload(payload) {
  return createHash("sha256").update(stringifyPayload(payload)).digest("hex");
}
function createPlaneTransferBundle(input) {
  return {
    kind: PLANE_TRANSFER_KIND,
    version: PLANE_TRANSFER_VERSION,
    appId: input.appId,
    workspaceId: input.workspaceId,
    exportedAt: input.exportedAt ?? isoNow2(),
    source: {
      data: input.plane.data,
      ai: input.plane.ai
    },
    cloudProjection: input.plane.cloudProjection,
    payloadSchema: input.payloadSchema,
    payloadSha256: hashPlanePayload(input.payload),
    payload: input.payload
  };
}
function isPlaneTransferBundle(value) {
  return isRecord(value) && value.kind === PLANE_TRANSFER_KIND;
}
function parsePlaneTransferBundle(value, options = {}) {
  if (!isRecord(value) || value.kind !== PLANE_TRANSFER_KIND) {
    throw new Error("Transfer bundle kind is invalid.");
  }
  if (value.version !== PLANE_TRANSFER_VERSION) {
    throw new Error(`Transfer bundle version must be ${PLANE_TRANSFER_VERSION.toString()}.`);
  }
  const appId = readString(value, "appId", "transfer bundle");
  const workspaceId = readString(value, "workspaceId", "transfer bundle");
  const exportedAt = readString(value, "exportedAt", "transfer bundle");
  const payloadSchema = readString(value, "payloadSchema", "transfer bundle");
  const payloadSha256 = readString(value, "payloadSha256", "transfer bundle");
  const cloudProjection = value.cloudProjection;
  if (cloudProjection !== "cloudflare") {
    throw new Error("Transfer bundle cloudProjection must be cloudflare.");
  }
  if (options.appId && appId !== options.appId) {
    throw new Error(`Transfer bundle appId ${appId} does not match ${options.appId}.`);
  }
  if (options.payloadSchema && payloadSchema !== options.payloadSchema) {
    throw new Error(`Transfer bundle payloadSchema ${payloadSchema} does not match ${options.payloadSchema}.`);
  }
  if (!isRecord(value.source)) {
    throw new Error("Transfer bundle source is required.");
  }
  const source = {
    data: readPlaneMode(value.source, "data", "transfer bundle source"),
    ai: readPlaneMode(value.source, "ai", "transfer bundle source")
  };
  const payload = value.payload;
  const actualHash = hashPlanePayload(payload);
  if (actualHash !== payloadSha256) {
    throw new Error("Transfer bundle payload checksum does not match.");
  }
  return {
    kind: PLANE_TRANSFER_KIND,
    version: PLANE_TRANSFER_VERSION,
    appId,
    workspaceId,
    exportedAt,
    source,
    cloudProjection,
    payloadSchema,
    payloadSha256,
    payload
  };
}
function unwrapPlaneTransferPayload(value, options = {}) {
  if (!isPlaneTransferBundle(value)) {
    return { payload: value, bundle: null };
  }
  const bundle = parsePlaneTransferBundle(value, options);
  return {
    payload: bundle.payload,
    bundle
  };
}
function createPlaneTransferImportPlan(input) {
  const payloadSha256 = input.bundle?.payloadSha256 ?? hashPlanePayload(input.payload);
  const source = input.bundle?.source ?? null;
  const destination = input.destination;
  const warnings = [];
  if (!input.bundle) {
    warnings.push("Input is a raw app payload without a local-plane transfer envelope.");
  }
  if (source && source.data === destination.data && source.ai === destination.ai) {
    warnings.push("Source and destination planes are identical.");
  }
  return {
    kind: "mere.local-plane.transfer-plan",
    action: "import",
    appId: input.bundle?.appId ?? input.appId,
    workspaceId: input.bundle?.workspaceId ?? input.workspaceId,
    payloadSchema: input.bundle?.payloadSchema ?? input.payloadSchema,
    payloadSha256,
    source,
    destination,
    cloudProjection: input.bundle?.cloudProjection ?? "cloudflare",
    wrapped: Boolean(input.bundle),
    warnings
  };
}
function recordPlaneTransfer(db, input) {
  const id = `xfer_${randomUUID2().replaceAll("-", "").slice(0, 24)}`;
  db.prepare(
    `INSERT INTO mere_plane_transfers (
         id, app_id, workspace_id, direction,
         source_data_plane, source_ai_plane, destination_data_plane, destination_ai_plane,
         payload_schema, payload_sha256, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.appId,
    input.workspaceId,
    input.direction,
    input.source?.data ?? null,
    input.source?.ai ?? null,
    input.destination?.data ?? null,
    input.destination?.ai ?? null,
    input.payloadSchema,
    input.payloadSha256,
    isoNow2()
  );
  return id;
}

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function loadNodeSqlite() {
  return import(["node", "sqlite"].join(":"));
}
async function openLocalPlaneDatabase(config) {
  await mkdir2(path4.dirname(config.localDbPath), { recursive: true });
  const { DatabaseSync } = await loadNodeSqlite();
  const db = new DatabaseSync(config.localDbPath);
  ensureLocalPlaneSchema(db);
  return {
    dbPath: config.localDbPath,
    db,
    close: () => db.close()
  };
}
function ensureLocalPlaneSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS mere_plane_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mere_plane_apps (
      app_id TEXT PRIMARY KEY,
      display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mere_plane_workspaces (
      workspace_id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mere_plane_app_workspaces (
      app_id TEXT NOT NULL REFERENCES mere_plane_apps(app_id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES mere_plane_workspaces(workspace_id) ON DELETE CASCADE,
      data_plane TEXT NOT NULL CHECK (data_plane IN ('cloud', 'local')),
      ai_plane TEXT NOT NULL CHECK (ai_plane IN ('cloud', 'local')),
      cloud_projection TEXT NOT NULL DEFAULT 'cloudflare',
      last_imported_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (app_id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS mere_plane_transfer_schemas (
      app_id TEXT NOT NULL REFERENCES mere_plane_apps(app_id) ON DELETE CASCADE,
      payload_schema TEXT NOT NULL,
      display_name TEXT,
      description TEXT,
      import_supported INTEGER NOT NULL DEFAULT 1 CHECK (import_supported IN (0, 1)),
      export_supported INTEGER NOT NULL DEFAULT 1 CHECK (export_supported IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (app_id, payload_schema)
    );

    CREATE TABLE IF NOT EXISTS mere_plane_ai_jobs (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      workspace_id TEXT,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('cloud', 'local')),
      model TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
      input_json TEXT NOT NULL DEFAULT '{}',
      output_text TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mere_plane_ai_jobs_subject
      ON mere_plane_ai_jobs(app_id, workspace_id, subject_type, subject_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS mere_plane_transfers (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES mere_plane_apps(app_id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('export', 'import')),
      source_data_plane TEXT CHECK (source_data_plane IN ('cloud', 'local')),
      source_ai_plane TEXT CHECK (source_ai_plane IN ('cloud', 'local')),
      destination_data_plane TEXT CHECK (destination_data_plane IN ('cloud', 'local')),
      destination_ai_plane TEXT CHECK (destination_ai_plane IN ('cloud', 'local')),
      payload_schema TEXT NOT NULL,
      payload_sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mere_plane_transfers_workspace
      ON mere_plane_transfers(app_id, workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS mere_plane_projection_events (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES mere_plane_apps(app_id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL,
      product TEXT NOT NULL,
      source_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      external_object_type TEXT,
      external_object_id TEXT,
      occurred_at TEXT,
      canonical_url TEXT,
      dedupe_key TEXT,
      source TEXT NOT NULL CHECK (source IN ('local-publish', 'cloud-delivery', 'file-import', 'dry-run', 'manual')),
      envelope_sha256 TEXT NOT NULL,
      envelope_json TEXT NOT NULL,
      received_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(app_id, workspace_id, source_event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mere_plane_projection_events_workspace
      ON mere_plane_projection_events(workspace_id, received_at DESC);

    CREATE INDEX IF NOT EXISTS idx_mere_plane_projection_events_product
      ON mere_plane_projection_events(app_id, product, event_type, received_at DESC);
  `);
}
function registerPlaneApp(db, appId, displayName) {
  const now = isoNow3();
  db.prepare(
    `INSERT INTO mere_plane_apps (app_id, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(app_id) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`
  ).run(appId, displayName ?? appId, now, now);
}
function registerPlaneTransferSchema(db, appId, input) {
  const now = isoNow3();
  registerPlaneApp(db, appId);
  db.prepare(
    `INSERT INTO mere_plane_transfer_schemas (
         app_id, payload_schema, display_name, description,
         import_supported, export_supported, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(app_id, payload_schema) DO UPDATE SET
         display_name = excluded.display_name,
         description = excluded.description,
         import_supported = excluded.import_supported,
         export_supported = excluded.export_supported,
         updated_at = excluded.updated_at`
  ).run(
    appId,
    input.payloadSchema,
    input.displayName ?? input.payloadSchema,
    input.description ?? null,
    input.importSupported === false ? 0 : 1,
    input.exportSupported === false ? 0 : 1,
    now,
    now
  );
}
function upsertPlaneWorkspace(db, appId, input) {
  const now = isoNow3();
  registerPlaneApp(db, appId);
  db.prepare(
    `INSERT INTO mere_plane_workspaces (workspace_id, slug, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id) DO UPDATE SET
         slug = excluded.slug,
         name = excluded.name,
         updated_at = excluded.updated_at`
  ).run(input.workspaceId, input.slug, input.name ?? null, now, now);
  db.prepare(
    `INSERT INTO mere_plane_app_workspaces (
         app_id, workspace_id, data_plane, ai_plane, cloud_projection, last_imported_at, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, 'cloudflare', ?, ?, ?)
       ON CONFLICT(app_id, workspace_id) DO UPDATE SET
         data_plane = excluded.data_plane,
         ai_plane = excluded.ai_plane,
         cloud_projection = excluded.cloud_projection,
         last_imported_at = excluded.last_imported_at,
         updated_at = excluded.updated_at`
  ).run(appId, input.workspaceId, input.dataPlane, input.aiPlane, now, now, now);
}
function countRows(db, sql, ...params) {
  return Number(db.prepare(sql).get(...params)?.count ?? 0);
}
function appFilterClause(appId, tableAlias) {
  return appId ? ` WHERE ${tableAlias}.app_id = ?` : "";
}
function planeModeOrNull(value) {
  return value === "cloud" || value === "local" ? value : null;
}
function getLocalPlaneInventory(db, options = {}) {
  ensureLocalPlaneSchema(db);
  const appParams = options.appId ? [options.appId] : [];
  const transferLimit = Math.max(1, Math.min(options.transferLimit ?? 10, 100));
  const apps = db.prepare(
    `SELECT
         a.app_id,
         a.display_name,
         a.updated_at,
         COUNT(DISTINCT aw.workspace_id) AS workspace_count,
         COUNT(DISTINCT s.payload_schema) AS transfer_schema_count,
         COUNT(DISTINCT t.id) AS transfer_count
       FROM mere_plane_apps AS a
       LEFT JOIN mere_plane_app_workspaces AS aw ON aw.app_id = a.app_id
       LEFT JOIN mere_plane_transfer_schemas AS s ON s.app_id = a.app_id
       LEFT JOIN mere_plane_transfers AS t ON t.app_id = a.app_id
       ${appFilterClause(options.appId, "a")}
       GROUP BY a.app_id
       ORDER BY a.app_id ASC`
  ).all(...appParams);
  const transferSchemas = db.prepare(
    `SELECT *
       FROM mere_plane_transfer_schemas AS s
       ${appFilterClause(options.appId, "s")}
       ORDER BY s.app_id ASC, s.payload_schema ASC`
  ).all(...appParams);
  const workspaces = db.prepare(
    `SELECT
         w.workspace_id,
         w.slug,
         w.name,
         w.updated_at,
         COUNT(DISTINCT aw.app_id) AS app_count
       FROM mere_plane_workspaces AS w
       JOIN mere_plane_app_workspaces AS aw ON aw.workspace_id = w.workspace_id
       ${appFilterClause(options.appId, "aw")}
       GROUP BY w.workspace_id
       ORDER BY w.updated_at DESC, w.workspace_id ASC`
  ).all(...appParams);
  const appWorkspaces = db.prepare(
    `SELECT
         aw.app_id,
         aw.workspace_id,
         w.slug,
         w.name,
         aw.data_plane,
         aw.ai_plane,
         aw.cloud_projection,
         aw.updated_at
       FROM mere_plane_app_workspaces AS aw
       JOIN mere_plane_workspaces AS w ON w.workspace_id = aw.workspace_id
       ${appFilterClause(options.appId, "aw")}
       ORDER BY aw.app_id ASC, w.slug ASC, aw.workspace_id ASC`
  ).all(...appParams);
  const transfers = db.prepare(
    `SELECT *
       FROM mere_plane_transfers AS t
       ${appFilterClause(options.appId, "t")}
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ?`
  ).all(...appParams, transferLimit);
  const scopedCount = (table) => options.appId ? countRows(db, `SELECT COUNT(*) AS count FROM ${table} WHERE app_id = ?`, options.appId) : countRows(db, `SELECT COUNT(*) AS count FROM ${table}`);
  return {
    apps: apps.map((app) => ({
      appId: app.app_id,
      displayName: app.display_name,
      workspaceCount: Number(app.workspace_count),
      transferSchemaCount: Number(app.transfer_schema_count),
      transferCount: Number(app.transfer_count),
      updatedAt: app.updated_at
    })),
    transferSchemas: transferSchemas.map((schema) => ({
      appId: schema.app_id,
      payloadSchema: schema.payload_schema,
      displayName: schema.display_name,
      description: schema.description,
      importSupported: schema.import_supported === 1,
      exportSupported: schema.export_supported === 1,
      updatedAt: schema.updated_at
    })),
    workspaces: workspaces.map((workspace) => ({
      workspaceId: workspace.workspace_id,
      slug: workspace.slug,
      name: workspace.name,
      appCount: Number(workspace.app_count),
      updatedAt: workspace.updated_at
    })),
    appWorkspaces: appWorkspaces.map((workspace) => ({
      appId: workspace.app_id,
      workspaceId: workspace.workspace_id,
      slug: workspace.slug,
      name: workspace.name,
      dataPlane: workspace.data_plane,
      aiPlane: workspace.ai_plane,
      cloudProjection: workspace.cloud_projection,
      updatedAt: workspace.updated_at
    })),
    transfers: transfers.map((transfer) => ({
      id: transfer.id,
      appId: transfer.app_id,
      workspaceId: transfer.workspace_id,
      direction: transfer.direction,
      sourceDataPlane: planeModeOrNull(transfer.source_data_plane),
      sourceAiPlane: planeModeOrNull(transfer.source_ai_plane),
      destinationDataPlane: planeModeOrNull(transfer.destination_data_plane),
      destinationAiPlane: planeModeOrNull(transfer.destination_ai_plane),
      payloadSchema: transfer.payload_schema,
      payloadSha256: transfer.payload_sha256,
      createdAt: transfer.created_at
    })),
    counts: {
      apps: options.appId ? apps.length : countRows(db, "SELECT COUNT(*) AS count FROM mere_plane_apps"),
      workspaces: workspaces.length,
      transferSchemas: options.appId ? transferSchemas.length : countRows(db, "SELECT COUNT(*) AS count FROM mere_plane_transfer_schemas"),
      transfers: scopedCount("mere_plane_transfers"),
      aiJobs: scopedCount("mere_plane_ai_jobs")
    }
  };
}

// scripts/cli/local-store.ts
var TODAY_APP_ID = "mere-today";
var TODAY_TIME_PAYLOAD_SCHEMA = "mere.today.time.v1";
function isoNow4() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function makeId2(prefix) {
  return `${prefix}_${randomUUID3().replaceAll("-", "").slice(0, 16)}`;
}
function stableTimeReportProjectionId(input) {
  const digest = createHash2("sha256").update(TODAY_APP_ID).update("\0").update(input.workspaceId).update("\0").update(input.from).update("\0").update(input.to).update("\0").update(input.projectId ?? "").digest("hex").slice(0, 24);
  return `tdpr_${digest}`;
}
function isRecord2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function readString2(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required for local mere.today records.`);
  }
  return raw.trim();
}
function readOptionalString(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
function readNumber(value, fallback) {
  const raw = value === void 0 || value === null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.trunc(raw);
}
function readOptionalNumber(value, fallback) {
  if (value === void 0 || value === null || value === "") return fallback;
  const raw = Number(value);
  return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
}
function readBooleanInt(value, fallback = 0) {
  if (value === void 0) return fallback;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value === 0 ? 0 : 1;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" ? 1 : 0;
}
function readDescription(value, fallback) {
  if (value === void 0) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}
function durationSeconds(startAt, endAt) {
  if (!endAt) return null;
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.trunc((end - start) / 1e3);
}
function normalizeProject(input, workspaceId, existing) {
  const now = isoNow4();
  return {
    id: existing?.id ?? readOptionalString(input.id) ?? makeId2("time_project"),
    tenant_id: workspaceId,
    name: readString2(input.name, "name", existing?.name),
    color: readOptionalString(input.color, existing?.color) ?? "#00d4aa",
    is_archived: readBooleanInt(input.is_archived ?? input.archive, existing?.is_archived ?? 0),
    sort_order: readNumber(input.sort_order ?? input.sortOrder ?? input.sort, existing?.sort_order ?? 0),
    source_product: readOptionalString(input.source_product, existing?.source_product),
    external_project_id: readOptionalString(input.external_project_id, existing?.external_project_id),
    workspace_project_id: readOptionalString(input.workspace_project_id, existing?.workspace_project_id),
    canonical_url: readOptionalString(input.canonical_url, existing?.canonical_url),
    last_projected_event_id: readOptionalString(input.last_projected_event_id, existing?.last_projected_event_id),
    managed_by_workspace: readBooleanInt(input.managed_by_workspace, existing?.managed_by_workspace ?? 0),
    is_local: readBooleanInt(input.is_local, existing?.is_local ?? 1),
    created_at: existing?.created_at ?? readOptionalString(input.created_at) ?? now,
    updated_at: readOptionalString(input.updated_at) ?? now
  };
}
function normalizeEntry(input, workspaceId, existing) {
  const now = isoNow4();
  const startAt = readString2(input.start_at ?? input.startAt ?? input.start, "start_at", existing?.start_at);
  const endAt = readOptionalString(input.end_at ?? input.endAt ?? input.end, existing?.end_at);
  const description = readDescription(input.description, existing?.description ?? "");
  return {
    id: existing?.id ?? readOptionalString(input.id) ?? makeId2("time_entry"),
    tenant_id: workspaceId,
    project_id: readOptionalString(input.project_id ?? input.projectId ?? input.project, existing?.project_id),
    description,
    start_at: startAt,
    end_at: endAt,
    timezone: readOptionalString(input.timezone, existing?.timezone) ?? "UTC",
    duration_seconds: readOptionalNumber(input.duration_seconds ?? input.durationSeconds, durationSeconds(startAt, endAt)),
    created_by_user_id: readOptionalString(input.created_by_user_id ?? input.user ?? input.createdByUserId, existing?.created_by_user_id),
    created_at: existing?.created_at ?? readOptionalString(input.created_at) ?? now,
    updated_at: readOptionalString(input.updated_at) ?? now
  };
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== TODAY_TIME_PAYLOAD_SCHEMA || value.version !== 1) {
    throw new Error(`Today transfer payload must be ${TODAY_TIME_PAYLOAD_SCHEMA} version 1.`);
  }
  return {
    kind: TODAY_TIME_PAYLOAD_SCHEMA,
    version: 1,
    projects: Array.isArray(value.projects) ? value.projects.map((entry) => normalizeProject(isRecord2(entry) ? entry : {}, workspaceId)) : [],
    entries: Array.isArray(value.entries) ? value.entries.map((entry) => normalizeEntry(isRecord2(entry) ? entry : {}, workspaceId)) : []
  };
}
var LocalTodayStore = class _LocalTodayStore {
  constructor(dbPath, db, config, workspace) {
    this.dbPath = dbPath;
    this.db = db;
    this.config = config;
    this.workspace = workspace;
  }
  dbPath;
  db;
  config;
  workspace;
  static async open(input) {
    const opened = await openLocalPlaneDatabase(input.config);
    const db = opened.db;
    registerPlaneApp(opened.db, TODAY_APP_ID, "Mere Today");
    registerPlaneTransferSchema(opened.db, TODAY_APP_ID, {
      payloadSchema: TODAY_TIME_PAYLOAD_SCHEMA,
      displayName: "Today time transfer",
      description: "Portable mere.today time projects and time entries."
    });
    upsertPlaneWorkspace(opened.db, TODAY_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalTodayStore(opened.dbPath, db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS today_local_time_projects (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        source_product TEXT,
        external_project_id TEXT,
        workspace_project_id TEXT,
        canonical_url TEXT,
        last_projected_event_id TEXT,
        managed_by_workspace INTEGER NOT NULL DEFAULT 0,
        is_local INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_today_local_time_projects_name
        ON today_local_time_projects (workspace_id, name);

      CREATE TABLE IF NOT EXISTS today_local_time_entries (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        project_id TEXT,
        description TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT,
        timezone TEXT NOT NULL,
        duration_seconds INTEGER,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_today_local_time_entries_range
        ON today_local_time_entries (workspace_id, start_at DESC);

      CREATE TABLE IF NOT EXISTS today_local_projections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        from_date TEXT NOT NULL,
        to_date TEXT NOT NULL,
        project_id TEXT,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_today_local_projections_scope
        ON today_local_projections (workspace_id, scope, updated_at DESC);
    `);
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: TODAY_APP_ID });
    const count = (table) => this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ?`).get(this.workspace.workspaceId)?.count ?? 0;
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      timeProjectCount: count("today_local_time_projects"),
      timeEntryCount: count("today_local_time_entries"),
      projectionCount: count("today_local_projections"),
      localTimeStore: "enabled",
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listProjects(options = {}) {
    const rows = this.db.prepare(
      `SELECT id, workspace_id AS tenant_id, name, color, is_archived, sort_order, source_product, external_project_id,
                workspace_project_id, canonical_url, last_projected_event_id, managed_by_workspace, is_local, created_at, updated_at
           FROM today_local_time_projects
          WHERE workspace_id = ? ${options.includeArchived ? "" : "AND is_archived = 0"}
          ORDER BY sort_order, name`
    ).all(this.workspace.workspaceId);
    return rows;
  }
  getProject(projectIdOrName) {
    const row = this.db.prepare(
      `SELECT id, workspace_id AS tenant_id, name, color, is_archived, sort_order, source_product, external_project_id,
                workspace_project_id, canonical_url, last_projected_event_id, managed_by_workspace, is_local, created_at, updated_at
           FROM today_local_time_projects
          WHERE workspace_id = ? AND (id = ? OR lower(name) = lower(?))
          LIMIT 1`
    ).get(this.workspace.workspaceId, projectIdOrName, projectIdOrName);
    return row ?? null;
  }
  upsertProject(input) {
    const idOrName = readOptionalString(input.id) ?? readOptionalString(input.name);
    const project = normalizeProject(input, this.workspace.workspaceId, idOrName ? this.getProject(idOrName) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO today_local_time_projects (
          id, workspace_id, name, color, is_archived, sort_order, source_product, external_project_id,
          workspace_project_id, canonical_url, last_projected_event_id, managed_by_workspace, is_local, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          name = excluded.name,
          color = excluded.color,
          is_archived = excluded.is_archived,
          sort_order = excluded.sort_order,
          updated_at = excluded.updated_at`
    ).run(
      project.id,
      project.tenant_id,
      project.name,
      project.color,
      project.is_archived,
      project.sort_order,
      project.source_product,
      project.external_project_id,
      project.workspace_project_id,
      project.canonical_url,
      project.last_projected_event_id,
      project.managed_by_workspace,
      project.is_local,
      project.created_at,
      project.updated_at
    );
    return project;
  }
  deleteProject(projectIdOrName) {
    const project = this.getProject(projectIdOrName);
    if (!project) return false;
    const result = this.db.prepare("DELETE FROM today_local_time_projects WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, project.id);
    return Number(result.changes) > 0;
  }
  listEntries(options = {}) {
    const clauses = ["workspace_id = ?"];
    const params = [this.workspace.workspaceId];
    if (options.from) {
      clauses.push("start_at >= ?");
      params.push(options.from);
    }
    if (options.to) {
      clauses.push("start_at <= ?");
      params.push(options.to);
    }
    if (options.projectId) {
      clauses.push("project_id = ?");
      params.push(options.projectId);
    }
    params.push(options.limit ?? 50, options.offset ?? 0);
    return this.db.prepare(
      `SELECT id, workspace_id AS tenant_id, project_id, description, start_at, end_at, timezone, duration_seconds,
                created_by_user_id, created_at, updated_at
           FROM today_local_time_entries
          WHERE ${clauses.join(" AND ")}
          ORDER BY start_at DESC
          LIMIT ? OFFSET ?`
    ).all(...params);
  }
  getEntry(entryId) {
    const row = this.db.prepare(
      `SELECT id, workspace_id AS tenant_id, project_id, description, start_at, end_at, timezone, duration_seconds,
                created_by_user_id, created_at, updated_at
           FROM today_local_time_entries
          WHERE workspace_id = ? AND id = ?
          LIMIT 1`
    ).get(this.workspace.workspaceId, entryId);
    return row ?? null;
  }
  currentEntry() {
    const row = this.db.prepare(
      `SELECT id, workspace_id AS tenant_id, project_id, description, start_at, end_at, timezone, duration_seconds,
                created_by_user_id, created_at, updated_at
           FROM today_local_time_entries
          WHERE workspace_id = ? AND end_at IS NULL
          ORDER BY start_at DESC
          LIMIT 1`
    ).get(this.workspace.workspaceId);
    return row ?? null;
  }
  upsertEntry(input) {
    const id = readOptionalString(input.id);
    const entry = normalizeEntry(input, this.workspace.workspaceId, id ? this.getEntry(id) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO today_local_time_entries (
          id, workspace_id, project_id, description, start_at, end_at, timezone, duration_seconds,
          created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          project_id = excluded.project_id,
          description = excluded.description,
          start_at = excluded.start_at,
          end_at = excluded.end_at,
          timezone = excluded.timezone,
          duration_seconds = excluded.duration_seconds,
          updated_at = excluded.updated_at`
    ).run(
      entry.id,
      entry.tenant_id,
      entry.project_id,
      entry.description,
      entry.start_at,
      entry.end_at,
      entry.timezone,
      entry.duration_seconds,
      entry.created_by_user_id,
      entry.created_at,
      entry.updated_at
    );
    return entry;
  }
  deleteEntry(entryId) {
    const result = this.db.prepare("DELETE FROM today_local_time_entries WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, entryId);
    return Number(result.changes) > 0;
  }
  getTimeReportProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM today_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildTimeReportProjectionEnvelope(input) {
    const entries = this.listEntries({
      from: input.from,
      to: input.to,
      projectId: input.projectId,
      limit: 5e3,
      offset: 0
    }).filter((entry) => entry.end_at !== null);
    const projectMap = new Map(this.listProjects({ includeArchived: true }).map((project) => [project.id, project]));
    const rollups = /* @__PURE__ */ new Map();
    let noProjectTotalSeconds = 0;
    let noProjectEntryCount = 0;
    for (const entry of entries) {
      if (!entry.project_id) {
        noProjectTotalSeconds += entry.duration_seconds ?? 0;
        noProjectEntryCount += 1;
        continue;
      }
      const current = rollups.get(entry.project_id) ?? { totalSeconds: 0, entryCount: 0 };
      current.totalSeconds += entry.duration_seconds ?? 0;
      current.entryCount += 1;
      rollups.set(entry.project_id, current);
    }
    const projects = [...rollups.entries()].map(([projectId, rollup]) => {
      const project = projectMap.get(projectId);
      return {
        id: projectId,
        name: project?.name ?? projectId,
        color: project?.color ?? "#777777",
        isArchived: project?.is_archived === 1,
        totalSeconds: rollup.totalSeconds,
        entryCount: rollup.entryCount
      };
    });
    if (noProjectEntryCount > 0) {
      projects.push({
        id: "unassigned",
        name: "Unassigned",
        color: "#777777",
        isArchived: false,
        totalSeconds: noProjectTotalSeconds,
        entryCount: noProjectEntryCount
      });
    }
    const projectionId = stableTimeReportProjectionId({
      workspaceId: this.workspace.workspaceId,
      from: input.from,
      to: input.to,
      projectId: input.projectId
    });
    const existing = this.getTimeReportProjection(projectionId);
    const now = isoNow4();
    const publishedAt = input.action === "revoke" ? existing?.published_at ?? now : now;
    const revokedAt = input.action === "revoke" ? now : null;
    return {
      version: 1,
      event: {
        type: input.action === "revoke" ? "today.time-report.projection.revoked" : "today.time-report.projection.upserted",
        appId: TODAY_APP_ID,
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "time-report",
          from: input.from,
          to: input.to,
          projectId: input.projectId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        report: {
          workspaceId: this.workspace.workspaceId,
          from: input.from,
          to: input.to,
          projectId: input.projectId,
          totalSeconds: entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0),
          entryCount: entries.length,
          projectCount: projects.length
        },
        projects,
        exclusions: [
          "time entry descriptions",
          "exact start/end timestamps",
          "booking records",
          "calendar events",
          "availability rules",
          "Google busy ranges",
          "tenant admin records",
          "raw local time rows"
        ]
      }
    };
  }
  recordTimeReportProjection(envelope) {
    const now = isoNow4();
    this.db.prepare(
      `INSERT INTO today_local_projections (
          id, workspace_id, scope, from_date, to_date, project_id, published_at, revoked_at,
          payload_json, last_projected_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          scope = excluded.scope,
          from_date = excluded.from_date,
          to_date = excluded.to_date,
          project_id = excluded.project_id,
          published_at = excluded.published_at,
          revoked_at = excluded.revoked_at,
          payload_json = excluded.payload_json,
          last_projected_at = excluded.last_projected_at,
          updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      envelope.event.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.from,
      envelope.event.projection.to,
      envelope.event.projection.projectId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: TODAY_TIME_PAYLOAD_SCHEMA,
      version: 1,
      projects: this.listProjects({ includeArchived: true }),
      entries: this.listEntries({ limit: 5e3, offset: 0 })
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: TODAY_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: TODAY_TIME_PAYLOAD_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: TODAY_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: TODAY_TIME_PAYLOAD_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: TODAY_APP_ID,
      payloadSchema: TODAY_TIME_PAYLOAD_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? TODAY_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? TODAY_TIME_PAYLOAD_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: TODAY_APP_ID,
      payloadSchema: TODAY_TIME_PAYLOAD_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const project of normalized.projects) this.upsertProject({ ...project });
      for (const entry of normalized.entries) this.upsertEntry({ ...entry });
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: TODAY_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? TODAY_TIME_PAYLOAD_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        store: "local",
        workspaceId: this.workspace.workspaceId,
        timeProjectCount: normalized.projects.length,
        timeEntryCount: normalized.entries.length,
        transferId
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};

// scripts/cli/local-plane-command.ts
function resolveTodayPlaneConfig(parsed, env) {
  return resolvePlaneConfigInspection({
    appId: TODAY_APP_ID,
    env,
    data: readStringFlag(parsed, "store"),
    ai: readStringFlag(parsed, "ai"),
    localDbPath: readStringFlag(parsed, "local-db")
  });
}
function isLocalDataRoute(parsed, env) {
  return resolveTodayPlaneConfig(parsed, env).data === "local";
}
function localWorkspace(parsed, env) {
  const workspaceId = readStringFlag(parsed, "workspace") ?? readStringFlag(parsed, "tenant") ?? env.MERE_TODAY_WORKSPACE ?? env.YOURTIME_WORKSPACE ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Today" : workspaceId
  };
}
async function openLocalTodayStore(parsed, env) {
  const config = resolveTodayPlaneConfig(parsed, env);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so mere.today local data stays explicit.");
  }
  return LocalTodayStore.open({
    config,
    workspace: localWorkspace(parsed, env)
  });
}
async function withLocalStore(parsed, env, handler) {
  const store = await openLocalTodayStore(parsed, env);
  try {
    return await handler(store);
  } finally {
    store.close();
  }
}
function projectIdFromFlag(parsed) {
  return readStringFlag(parsed, "project") ?? null;
}
function resolveProjectId(store, selector) {
  if (!selector) return null;
  return store.getProject(selector)?.id ?? selector;
}
function publishedByUserId(parsed, env) {
  return readStringFlag(parsed, "published-by-user-id") ?? env.MERE_TODAY_USER_ID ?? env.MERE_USER_ID ?? "local-cli";
}
function publishedByEmail(parsed, env) {
  return readStringFlag(parsed, "published-by-email") ?? env.MERE_TODAY_USER_EMAIL ?? env.MERE_USER_EMAIL ?? null;
}
function csvEscape(value) {
  if (!value.includes(",") && !value.includes('"') && !value.includes("\n")) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
async function handleLocalPlaneCommand(parsed, env, writers) {
  const [resource, action] = parsed.positionals;
  if (resource === "store" && action === "info") {
    const config = resolveTodayPlaneConfig(parsed, env);
    if (config.data === "local") {
      return withLocalStore(parsed, env, (store) => ({
        ok: true,
        app: TODAY_APP_ID,
        store: config.data,
        ai: config.ai,
        cloudProjection: config.cloudProjection,
        blended: config.blended,
        ...store.info(),
        localAiSupported: false,
        sources: config.sources
      }));
    }
    if (readBooleanFlag(parsed, "json", false)) {
      return {
        ok: true,
        app: TODAY_APP_ID,
        store: config.data,
        ai: config.ai,
        cloudProjection: config.cloudProjection,
        blended: config.blended,
        dbPath: config.localDbPath,
        localTimeStore: "available",
        localAiSupported: false,
        sources: config.sources
      };
    }
    writers.stdout(
      formatPlaneConfigReport({
        kind: "mere.local-plane.config",
        configs: [config]
      })
    );
    writers.stdout("Hosted booking, calendar, and time APIs remain Cloudflare-owned unless --store local is selected for supported time commands.\n");
    return "";
  }
  if (resource === "export") {
    return withLocalStore(parsed, env, async (store) => {
      const bundle = store.exportBundle();
      const output = readStringFlag(parsed, "output");
      if (!output) return bundle;
      const target = resolve(output);
      await mkdir3(dirname(target), { recursive: true });
      await writeFile(target, JSON.stringify(bundle, null, 2));
      return {
        ok: true,
        path: target,
        appId: bundle.appId,
        workspaceId: bundle.workspaceId,
        payloadSchema: bundle.payloadSchema,
        payloadSha256: bundle.payloadSha256,
        timeProjectCount: bundle.payload.projects.length,
        timeEntryCount: bundle.payload.entries.length
      };
    });
  }
  if (resource === "import") {
    return withLocalStore(parsed, env, async (store) => {
      const value = JSON.parse(await readFile2(readRequiredStringFlag(parsed, "file"), "utf8"));
      return readBooleanFlag(parsed, "dry-run", false) ? store.importPlan(value) : store.importValue(value);
    });
  }
  if (resource === "time-project") {
    return withLocalStore(parsed, env, (store) => {
      if (action === "list") return store.listProjects({ includeArchived: readBooleanFlag(parsed, "include-archived", false) });
      if (action === "get") return store.getProject(readRequiredStringFlag(parsed, "project"));
      if (action === "create") {
        return store.upsertProject({
          name: readRequiredStringFlag(parsed, "name"),
          color: readStringFlag(parsed, "color"),
          sort: readNumberFlag(parsed, "sort") ?? 0
        });
      }
      if (action === "update") {
        return store.upsertProject({
          id: readRequiredStringFlag(parsed, "project"),
          name: readStringFlag(parsed, "name"),
          color: readStringFlag(parsed, "color"),
          sort: readNumberFlag(parsed, "sort"),
          is_archived: readBooleanFlag(parsed, "archive", false) ? 1 : readBooleanFlag(parsed, "unarchive", false) ? 0 : void 0
        });
      }
      if (action === "delete") {
        const project = readRequiredStringFlag(parsed, "project");
        requireExactConfirmation(parsed, "delete time project", project);
        return { ok: store.deleteProject(project) };
      }
      throw new Error(`Unknown local time-project action: ${action}`);
    });
  }
  if (resource === "time-entry") {
    return withLocalStore(parsed, env, (store) => {
      if (action === "current") return store.currentEntry();
      if (action === "list") {
        return store.listEntries({
          from: readStringFlag(parsed, "from"),
          to: readStringFlag(parsed, "to"),
          projectId: resolveProjectId(store, projectIdFromFlag(parsed)),
          limit: readNumberFlag(parsed, "limit") ?? 50,
          offset: readNumberFlag(parsed, "offset") ?? 0
        });
      }
      if (action === "get") return store.getEntry(readRequiredStringFlag(parsed, "entry"));
      if (action === "start") {
        return store.upsertEntry({
          description: readStringFlag(parsed, "description") ?? "",
          project_id: resolveProjectId(store, projectIdFromFlag(parsed)),
          start_at: (/* @__PURE__ */ new Date()).toISOString(),
          timezone: readStringFlag(parsed, "timezone") ?? "UTC",
          created_by_user_id: readStringFlag(parsed, "user") ?? "cli"
        });
      }
      if (action === "stop") {
        const entryId = readStringFlag(parsed, "entry") ?? store.currentEntry()?.id;
        if (!entryId) throw new Error("Provide --entry or start a running timer first");
        const entry = store.getEntry(entryId);
        if (!entry) throw new Error(`Running time entry not found: ${entryId}`);
        return store.upsertEntry({ ...entry, end_at: (/* @__PURE__ */ new Date()).toISOString() });
      }
      if (action === "create") {
        return store.upsertEntry({
          description: readStringFlag(parsed, "description") ?? "",
          project_id: resolveProjectId(store, projectIdFromFlag(parsed)),
          start_at: readRequiredStringFlag(parsed, "start"),
          end_at: readRequiredStringFlag(parsed, "end"),
          timezone: readStringFlag(parsed, "timezone") ?? "UTC",
          created_by_user_id: readStringFlag(parsed, "user") ?? "cli"
        });
      }
      if (action === "update") {
        const entry = store.getEntry(readRequiredStringFlag(parsed, "entry"));
        if (!entry) throw new Error(`Time entry not found: ${readRequiredStringFlag(parsed, "entry")}`);
        return store.upsertEntry({
          ...entry,
          description: readStringFlag(parsed, "description") ?? entry.description,
          project_id: readBooleanFlag(parsed, "clear-project", false) ? null : resolveProjectId(store, projectIdFromFlag(parsed)) ?? entry.project_id,
          start_at: readStringFlag(parsed, "start") ?? entry.start_at,
          end_at: readBooleanFlag(parsed, "clear-end", false) ? null : readStringFlag(parsed, "end") ?? entry.end_at,
          timezone: readStringFlag(parsed, "timezone") ?? entry.timezone
        });
      }
      if (action === "delete") {
        const entryId = readRequiredStringFlag(parsed, "entry");
        requireExactConfirmation(parsed, "delete time entry", entryId);
        return { ok: store.deleteEntry(entryId) };
      }
      throw new Error(`Unknown local time-entry action: ${action}`);
    });
  }
  if (resource === "time-report" && action === "summary") {
    return withLocalStore(parsed, env, (store) => {
      const from = readRequiredStringFlag(parsed, "from");
      const to = readRequiredStringFlag(parsed, "to");
      const entries = store.listEntries({ from, to, limit: 5e3, offset: 0 });
      const completedEntries = entries.filter((entry) => entry.end_at !== null);
      return {
        workspaceId: localWorkspace(parsed, env).workspaceId,
        from,
        to,
        totalSeconds: completedEntries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0),
        entryCount: completedEntries.length
      };
    });
  }
  if (resource === "time-report" && (action === "publish" || action === "revoke")) {
    return withLocalStore(parsed, env, async (store) => {
      const from = readRequiredStringFlag(parsed, "from");
      const to = readRequiredStringFlag(parsed, "to");
      const projectId = resolveProjectId(store, projectIdFromFlag(parsed));
      const envelope = store.buildTimeReportProjectionEnvelope({
        action,
        from,
        to,
        projectId,
        publishedByUserId: publishedByUserId(parsed, env),
        publishedByEmail: publishedByEmail(parsed, env)
      });
      if (readBooleanFlag(parsed, "dry-run", false)) {
        let receiverUrl;
        try {
          receiverUrl = resolveCloudProjectionTarget({
            appId: TODAY_APP_ID,
            env,
            receiverUrl: readStringFlag(parsed, "projection-url"),
            bearerToken: readStringFlag(parsed, "projection-token")
          }).receiverUrl;
        } catch {
          receiverUrl = void 0;
        }
        return {
          ok: true,
          dryRun: true,
          app: TODAY_APP_ID,
          action,
          store: "local",
          projection: "cloudflare",
          projectionId: envelope.event.projection.id,
          receiverUrl,
          event: envelope
        };
      }
      const delivery = await deliverCloudProjectionEvent({
        appId: TODAY_APP_ID,
        env,
        receiverUrl: readStringFlag(parsed, "projection-url"),
        bearerToken: readStringFlag(parsed, "projection-token"),
        event: envelope
      });
      store.recordTimeReportProjection(envelope);
      return {
        ok: true,
        app: TODAY_APP_ID,
        action,
        store: "local",
        projection: "cloudflare",
        projectionId: envelope.event.projection.id,
        receiverUrl: delivery.receiverUrl,
        status: delivery.status,
        receiver: delivery.responseJson,
        bookingDeliveryLocal: false,
        calendarDeliveryLocal: false,
        cloudProjectionLocal: false
      };
    });
  }
  if (resource === "time-report" && action === "export-csv") {
    return withLocalStore(parsed, env, (store) => {
      const entries = store.listEntries({
        from: readRequiredStringFlag(parsed, "from"),
        to: readRequiredStringFlag(parsed, "to"),
        limit: 5e3,
        offset: 0
      });
      const projects = new Map(store.listProjects({ includeArchived: true }).map((project) => [project.id, project]));
      return [
        ["Date", "Start", "End", "Duration (h)", "Project", "Description"].join(","),
        ...entries.filter((entry) => entry.end_at !== null).map(
          (entry) => [
            entry.start_at.slice(0, 10),
            entry.start_at.slice(11, 16),
            entry.end_at ? entry.end_at.slice(11, 16) : "",
            ((entry.duration_seconds ?? 0) / 3600).toFixed(2),
            entry.project_id ? projects.get(entry.project_id)?.name ?? entry.project_id : "No project",
            entry.description
          ].map((value) => csvEscape(value)).join(",")
        )
      ].join("\n");
    });
  }
  throw new Error(`Unsupported local mere.today command: ${resource} ${action}`.trim());
}

// scripts/cli/output.ts
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function writeOutput(value, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}
`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      process.stdout.write("No results.\n");
      return;
    }
    if (value.every((entry) => isPlainRecord(entry))) {
      console.table(value);
      return;
    }
    for (const entry of value) {
      process.stdout.write(`${String(entry)}
`);
    }
    return;
  }
  if (isPlainRecord(value)) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}
`);
    return;
  }
  process.stdout.write(`${String(value)}
`);
}

// src/lib/server/availability.ts
function getDayOfWeekForDate(date) {
  return (/* @__PURE__ */ new Date(`${date}T00:00:00Z`)).getUTCDay();
}
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function subtractRanges(ranges, blocks) {
  let result = [...ranges];
  for (const block of blocks) {
    const next = [];
    for (const range of result) {
      if (block.end <= range.start || block.start >= range.end) {
        next.push(range);
      } else {
        if (block.start > range.start) {
          next.push({ start: range.start, end: block.start });
        }
        if (block.end < range.end) {
          next.push({ start: block.end, end: range.end });
        }
      }
    }
    result = next;
  }
  return result;
}
function generateSlots(ranges, durationMinutes) {
  const slots = [];
  for (const range of ranges) {
    let cursor = range.start;
    while (cursor + durationMinutes <= range.end) {
      slots.push(minutesToTime(cursor));
      cursor += durationMinutes;
    }
  }
  return slots;
}
async function getAvailableSlotsForDate(db, tenantId, date, slotDurationMinutes) {
  const dayOfWeek = getDayOfWeekForDate(date);
  const rules = await db.prepare(
    `SELECT * FROM availability_rules
       WHERE tenant_id = ?
       AND (
         (rule_type = 'weekly' AND day_of_week = ?)
         OR (rule_type IN ('date_override', 'block') AND specific_date = ?)
       )
       ORDER BY priority ASC`
  ).bind(tenantId, dayOfWeek, date).all();
  const rows = rules.results ?? [];
  const hasDateOverride = rows.some((r) => r.rule_type === "date_override");
  let openRanges = [];
  if (hasDateOverride) {
    for (const r of rows) {
      if (r.rule_type === "date_override" && r.is_available) {
        openRanges.push({ start: timeToMinutes(r.start_time), end: timeToMinutes(r.end_time) });
      }
    }
  } else {
    for (const r of rows) {
      if (r.rule_type === "weekly" && r.is_available) {
        openRanges.push({ start: timeToMinutes(r.start_time), end: timeToMinutes(r.end_time) });
      }
    }
  }
  const blocks = [];
  for (const r of rows) {
    if (r.rule_type === "block" || r.rule_type === "date_override" && !r.is_available) {
      blocks.push({ start: timeToMinutes(r.start_time), end: timeToMinutes(r.end_time) });
    }
  }
  const eventBlocks = await listBlockingRangesForDate(db, tenantId, date);
  blocks.push(...eventBlocks);
  if (blocks.length > 0) {
    openRanges = subtractRanges(openRanges, blocks);
  }
  return generateSlots(openRanges, slotDurationMinutes);
}
async function getAvailableSlotsBatch(db, tenantId, fromDate, toDate, slotDurationMinutes) {
  const from = /* @__PURE__ */ new Date(`${fromDate}T00:00:00Z`);
  const to = /* @__PURE__ */ new Date(`${toDate}T00:00:00Z`);
  const result = {};
  const cursor = new Date(from);
  while (cursor <= to) {
    const iso = cursor.toISOString().slice(0, 10);
    const slots = await getAvailableSlotsForDate(db, tenantId, iso, slotDurationMinutes);
    if (slots.length > 0) {
      result[iso] = slots;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

// scripts/cli/scheduling-command.ts
async function listAvailabilityRules(db, tenantId) {
  const result = await db.prepare(
    "SELECT * FROM availability_rules WHERE tenant_id = ? ORDER BY rule_type, day_of_week, specific_date, start_time"
  ).bind(tenantId).all();
  return result.results;
}
function readAvailabilityRuleType(parsed) {
  const ruleType = readRequiredStringFlag(parsed, "type");
  if (ruleType === "weekly" || ruleType === "date_override" || ruleType === "block") {
    return ruleType;
  }
  throw new Error("--type must be weekly, date_override, or block");
}
function readAvailabilityPayload(parsed) {
  const ruleType = readAvailabilityRuleType(parsed);
  const startTime = readRequiredStringFlag(parsed, "start");
  const endTime = readRequiredStringFlag(parsed, "end");
  if (startTime >= endTime) {
    throw new Error("--end must be later than --start");
  }
  const priority = readNumberFlag(parsed, "priority") ?? 0;
  const label = readNullableStringFlag(parsed, "label") ?? null;
  const requestedAvailable = readBooleanFlag(parsed, "available", ruleType !== "block");
  const unavailable = readBooleanFlag(parsed, "unavailable", false);
  if (ruleType === "weekly") {
    const dayOfWeek = readNumberFlag(parsed, "day");
    if (dayOfWeek === void 0 || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("--day must be between 0 and 6 for weekly rules");
    }
    return {
      ruleType,
      dayOfWeek,
      specificDate: null,
      startTime,
      endTime,
      isAvailable: unavailable ? false : requestedAvailable,
      label,
      priority
    };
  }
  const specificDate = readRequiredStringFlag(parsed, "date");
  return {
    ruleType,
    dayOfWeek: null,
    specificDate,
    startTime,
    endTime,
    isAvailable: ruleType === "block" ? false : unavailable ? false : requestedAvailable,
    label,
    priority
  };
}
async function createAvailabilityRule(db, tenantId, parsed) {
  const payload = readAvailabilityPayload(parsed);
  const id = makeId();
  const now = isoNow();
  await db.prepare(
    `INSERT INTO availability_rules (
        id,
        tenant_id,
        rule_type,
        day_of_week,
        specific_date,
        start_time,
        end_time,
        is_available,
        label,
        priority,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    tenantId,
    payload.ruleType,
    payload.dayOfWeek,
    payload.specificDate,
    payload.startTime,
    payload.endTime,
    payload.isAvailable ? 1 : 0,
    payload.label,
    payload.priority,
    now,
    now
  ).run();
  return { id };
}
async function updateAvailabilityRule(db, tenantId, ruleId, parsed) {
  const payload = readAvailabilityPayload(parsed);
  const result = await db.prepare(
    `UPDATE availability_rules
       SET rule_type = ?, day_of_week = ?, specific_date = ?, start_time = ?, end_time = ?, is_available = ?, label = ?, priority = ?, updated_at = ?
       WHERE tenant_id = ? AND id = ?`
  ).bind(
    payload.ruleType,
    payload.dayOfWeek,
    payload.specificDate,
    payload.startTime,
    payload.endTime,
    payload.isAvailable ? 1 : 0,
    payload.label,
    payload.priority,
    isoNow(),
    tenantId,
    ruleId
  ).run();
  return { ok: result.meta.changes > 0 };
}
async function deleteAvailabilityRule(db, tenantId, ruleId) {
  const result = await db.prepare("DELETE FROM availability_rules WHERE tenant_id = ? AND id = ?").bind(tenantId, ruleId).run();
  return { ok: result.meta.changes > 0 };
}
async function handleServiceCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "list") {
    return listServicesByTenant(context.db, tenant.id, { activeOnly: readBooleanFlag(parsed, "active-only", false) });
  }
  if (action === "get") {
    return resolveService(context.db, tenant.id, readRequiredStringFlag(parsed, "service"));
  }
  if (action === "create") {
    return createService(context.db, tenant.id, {
      name: readRequiredStringFlag(parsed, "name"),
      description: readStringFlag(parsed, "description"),
      durationMinutes: readNumberFlag(parsed, "duration") ?? 30,
      meetingType: readRequiredStringFlag(parsed, "meeting-type"),
      color: readStringFlag(parsed, "color") ?? void 0,
      isActive: !readBooleanFlag(parsed, "inactive", false),
      sortOrder: readNumberFlag(parsed, "sort") ?? 0
    });
  }
  if (action === "update") {
    const service = await resolveService(context.db, tenant.id, readRequiredStringFlag(parsed, "service"));
    const ok = await updateService(context.db, tenant.id, service.id, {
      name: readStringFlag(parsed, "name"),
      description: readNullableStringFlag(parsed, "description"),
      duration_minutes: readNumberFlag(parsed, "duration"),
      meeting_type: readStringFlag(parsed, "meeting-type"),
      color: readNullableStringFlag(parsed, "color"),
      is_active: hasFlag(parsed, "inactive") ? 0 : hasFlag(parsed, "active") ? 1 : void 0,
      sort_order: readNumberFlag(parsed, "sort"),
      slug: readStringFlag(parsed, "slug")
    });
    return { ok };
  }
  if (action === "delete") {
    const selector = readRequiredStringFlag(parsed, "service");
    requireExactConfirmation(parsed, "delete service", selector);
    const service = await resolveService(context.db, tenant.id, selector);
    return { ok: await deleteService(context.db, tenant.id, service.id) };
  }
  throw new Error(`Unknown service action: ${action}`);
}
async function handleAvailabilityCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "list") {
    return listAvailabilityRules(context.db, tenant.id);
  }
  if (action === "add") {
    return createAvailabilityRule(context.db, tenant.id, parsed);
  }
  if (action === "update") {
    return updateAvailabilityRule(context.db, tenant.id, readRequiredStringFlag(parsed, "rule"), parsed);
  }
  if (action === "delete") {
    const ruleId = readRequiredStringFlag(parsed, "rule");
    requireExactConfirmation(parsed, "delete availability rule", ruleId);
    return deleteAvailabilityRule(context.db, tenant.id, ruleId);
  }
  if (action === "slots") {
    const serviceSelector = readStringFlag(parsed, "service");
    const service = serviceSelector ? await resolveService(context.db, tenant.id, serviceSelector) : null;
    const duration = requireDuration(parsed, service);
    const date = readStringFlag(parsed, "date");
    const from = readStringFlag(parsed, "from");
    const to = readStringFlag(parsed, "to");
    if (date) {
      return {
        tenantId: tenant.id,
        date,
        duration,
        slots: await getAvailableSlotsForDate(context.db, tenant.id, date, duration)
      };
    }
    if (!from || !to) {
      throw new Error("Provide --date or both --from and --to");
    }
    return {
      tenantId: tenant.id,
      from,
      to,
      duration,
      slots: await getAvailableSlotsBatch(context.db, tenant.id, from, to, duration)
    };
  }
  throw new Error(`Unknown availability action: ${action}`);
}
async function handleCalendarCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "list") {
    const from = readRequiredStringFlag(parsed, "from");
    const to = readRequiredStringFlag(parsed, "to");
    return listCalendarOccurrences(context.db, tenant.id, from, to);
  }
  if (action === "create") {
    const recurrence = (() => {
      const frequency = readFrequencyFlag(parsed);
      if (!frequency) {
        return null;
      }
      return {
        frequency,
        intervalCount: readNumberFlag(parsed, "interval") ?? 1,
        byWeekdays: readWeekdays(parsed),
        untilDate: readStringFlag(parsed, "until") ?? null,
        occurrenceCount: readNumberFlag(parsed, "count") ?? null
      };
    })();
    return createManualCalendarEntry(
      context.db,
      {
        tenantId: tenant.id,
        title: readRequiredStringFlag(parsed, "title"),
        description: readStringFlag(parsed, "description"),
        startAt: readRequiredStringFlag(parsed, "start"),
        endAt: readRequiredStringFlag(parsed, "end"),
        timezone: readStringFlag(parsed, "timezone") ?? tenant.timezone,
        isAllDay: readBooleanFlag(parsed, "all-day", false),
        color: readStringFlag(parsed, "color") ?? void 0,
        serviceId: readStringFlag(parsed, "service") ?? void 0,
        recurrence
      },
      readStringFlag(parsed, "user") ?? "cli"
    );
  }
  if (action === "update-event") {
    const eventId = readRequiredStringFlag(parsed, "event");
    return {
      ok: await updateManualCalendarEvent(context.db, tenant.id, eventId, {
        title: readStringFlag(parsed, "title"),
        description: readNullableStringFlag(parsed, "description"),
        start_at: readStringFlag(parsed, "start"),
        end_at: readStringFlag(parsed, "end"),
        timezone: readStringFlag(parsed, "timezone"),
        is_all_day: hasFlag(parsed, "all-day") ? readBooleanFlag(parsed, "all-day", false) ? 1 : 0 : void 0,
        color: readNullableStringFlag(parsed, "color"),
        service_id: hasFlag(parsed, "clear-service") ? null : readStringFlag(parsed, "service")
      })
    };
  }
  if (action === "update-series") {
    const seriesId = readRequiredStringFlag(parsed, "series");
    const frequency = readFrequencyFlag(parsed);
    return {
      ok: await updateCalendarSeries(context.db, tenant.id, seriesId, {
        title: readStringFlag(parsed, "title"),
        description: readNullableStringFlag(parsed, "description"),
        start_at: readStringFlag(parsed, "start"),
        end_at: readStringFlag(parsed, "end"),
        timezone: readStringFlag(parsed, "timezone"),
        is_all_day: hasFlag(parsed, "all-day") ? readBooleanFlag(parsed, "all-day", false) ? 1 : 0 : void 0,
        frequency,
        interval_count: readNumberFlag(parsed, "interval"),
        by_weekday_json: hasFlag(parsed, "weekday") ? JSON.stringify(readWeekdays(parsed) ?? []) : void 0,
        until_date: readNullableStringFlag(parsed, "until"),
        occurrence_count: readNumberFlag(parsed, "count") ?? void 0,
        color: readNullableStringFlag(parsed, "color"),
        service_id: hasFlag(parsed, "clear-service") ? null : readStringFlag(parsed, "service")
      })
    };
  }
  if (action === "override-occurrence") {
    await upsertCalendarSeriesException(
      context.db,
      tenant.id,
      readRequiredStringFlag(parsed, "series"),
      readRequiredStringFlag(parsed, "date"),
      {
        isCancelled: false,
        overrideTitle: readNullableStringFlag(parsed, "title"),
        overrideDescription: readNullableStringFlag(parsed, "description"),
        overrideStartAt: readNullableStringFlag(parsed, "start"),
        overrideEndAt: readNullableStringFlag(parsed, "end"),
        overrideIsAllDay: hasFlag(parsed, "all-day") ? readBooleanFlag(parsed, "all-day", false) : null,
        overrideColor: readNullableStringFlag(parsed, "color")
      }
    );
    return { ok: true };
  }
  if (action === "cancel-occurrence") {
    await upsertCalendarSeriesException(
      context.db,
      tenant.id,
      readRequiredStringFlag(parsed, "series"),
      readRequiredStringFlag(parsed, "date"),
      { isCancelled: true }
    );
    return { ok: true };
  }
  if (action === "delete-event") {
    const eventId = readRequiredStringFlag(parsed, "event");
    requireExactConfirmation(parsed, "delete calendar event", eventId);
    return {
      ok: await deleteManualCalendarEvent(context.db, tenant.id, eventId)
    };
  }
  if (action === "delete-series") {
    const seriesId = readRequiredStringFlag(parsed, "series");
    requireExactConfirmation(parsed, "delete calendar series", seriesId);
    return {
      ok: await deleteCalendarSeries(context.db, tenant.id, seriesId)
    };
  }
  throw new Error(`Unknown calendar action: ${action}`);
}

// src/lib/server/memberships.ts
async function listTenantMembershipsByUser(db, userId) {
  const result = await db.prepare(
    `SELECT
         tenant_memberships.*,
         tenants.name AS tenant_name,
         tenants.slug AS tenant_slug,
         tenants.status AS tenant_status
       FROM tenant_memberships
       JOIN tenants ON tenants.id = tenant_memberships.tenant_id
       WHERE tenant_memberships.user_id = ?
       ORDER BY tenants.created_at ASC`
  ).bind(userId).all();
  return (result.results ?? []).filter((row) => row.tenant_status === "active").map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
    role: row.role
  }));
}
async function createTenantMembership(db, input) {
  const now = isoNow();
  const id = makeId();
  const role = input.role ?? "owner";
  await db.prepare(
    `INSERT INTO tenant_memberships (
        id,
        tenant_id,
        user_id,
        role,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, input.tenantId, input.userId, role, now, now).run();
  const created = await db.prepare("SELECT * FROM tenant_memberships WHERE id = ?").bind(id).first();
  if (!created) {
    throw new Error("Tenant membership creation failed");
  }
  return created;
}

// scripts/cli/tenant-command.ts
async function listMembershipsByTenant(db, tenantId) {
  const result = await db.prepare(
    `SELECT tenant_memberships.*, tenants.name AS tenant_name, tenants.slug AS tenant_slug
       FROM tenant_memberships
       JOIN tenants ON tenants.id = tenant_memberships.tenant_id
       WHERE tenant_memberships.tenant_id = ?
       ORDER BY tenant_memberships.created_at ASC`
  ).bind(tenantId).all();
  return result.results;
}
async function handleTenantCommand(context, action, parsed) {
  if (action === "list") {
    return runSql(
      context.d1,
      "SELECT id, slug, name, timezone, status, created_at, updated_at FROM tenants ORDER BY created_at ASC"
    );
  }
  if (action === "get") {
    const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
    const services = await listServicesByTenant(context.db, tenant.id);
    return {
      tenant,
      config: tenantRowToConfig(tenant),
      services
    };
  }
  if (action === "create") {
    const name = readRequiredStringFlag(parsed, "name");
    const slug = readRequiredStringFlag(parsed, "slug");
    const now = isoNow();
    const tenant = {
      id: readStringFlag(parsed, "id") ?? makeId(),
      slug,
      name,
      organization_id: readStringFlag(parsed, "organization-id") ?? null,
      organization_slug: readStringFlag(parsed, "organization-slug") ?? slug,
      brand_initials: readStringFlag(parsed, "brand-initials") ?? deriveInitials(name),
      event_title: readStringFlag(parsed, "event-title") ?? "General booking",
      description: readStringFlag(parsed, "description") ?? null,
      cover_items_json: (() => {
        const items = readStringListFlag(parsed, "cover-item");
        return items.length > 0 ? JSON.stringify(items) : null;
      })(),
      slot_duration_minutes: readNumberFlag(parsed, "duration") ?? 30,
      meeting_type: readStringFlag(parsed, "meeting-type") ?? "Google Meet",
      timezone: readStringFlag(parsed, "timezone") ?? "UTC",
      accent_color: readStringFlag(parsed, "accent-color") ?? "#00d4aa",
      logo_url: readStringFlag(parsed, "logo-url") ?? null,
      notify_emails: (() => {
        const emails = readStringListFlag(parsed, "notify-email");
        return emails.length > 0 ? emails.join(",") : null;
      })(),
      from_email: readStringFlag(parsed, "from-email") ?? null,
      webhook_url: readStringFlag(parsed, "webhook-url") ?? null,
      webhook_signing_secret: null,
      zerosmb_tenant_id: readStringFlag(parsed, "tenant-id") ?? readStringFlag(parsed, "zerosmb-tenant-id") ?? null,
      status: readStringFlag(parsed, "status") ?? "active",
      created_at: now,
      updated_at: now
    };
    await createTenant(context.db, tenant);
    const defaultService = await ensureDefaultServiceForTenant(context.db, tenant);
    const ownerUserId = readStringFlag(parsed, "owner-user");
    const membership = ownerUserId ? await createTenantMembership(context.db, {
      tenantId: tenant.id,
      userId: ownerUserId,
      role: readMembershipRole(parsed, "owner-role", "owner")
    }) : null;
    return {
      tenant,
      defaultService,
      membership
    };
  }
  if (action === "update") {
    const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
    await updateTenant(context.db, tenant.id, {
      slug: readStringFlag(parsed, "slug"),
      organization_id: readNullableStringFlag(parsed, "organization-id"),
      organization_slug: readNullableStringFlag(parsed, "organization-slug"),
      name: readStringFlag(parsed, "name"),
      brand_initials: readNullableStringFlag(parsed, "brand-initials"),
      event_title: readStringFlag(parsed, "event-title"),
      description: readNullableStringFlag(parsed, "description"),
      cover_items_json: hasFlag(parsed, "cover-item") ? JSON.stringify(readStringListFlag(parsed, "cover-item")) : void 0,
      slot_duration_minutes: readNumberFlag(parsed, "duration"),
      meeting_type: readStringFlag(parsed, "meeting-type"),
      timezone: readStringFlag(parsed, "timezone"),
      accent_color: readNullableStringFlag(parsed, "accent-color"),
      logo_url: readNullableStringFlag(parsed, "logo-url"),
      notify_emails: hasFlag(parsed, "notify-email") ? readStringListFlag(parsed, "notify-email").join(",") : void 0,
      from_email: readNullableStringFlag(parsed, "from-email"),
      webhook_url: readNullableStringFlag(parsed, "webhook-url")
    });
    return resolveTenant(context.db, tenant.id);
  }
  throw new Error(`Unknown tenant action: ${action}`);
}
async function handleMembershipCommand(context, action, parsed) {
  if (action === "list") {
    const userId = readStringFlag(parsed, "user");
    const tenantSelector = readStringFlag(parsed, "tenant");
    if (userId) {
      return listTenantMembershipsByUser(context.db, userId);
    }
    if (tenantSelector) {
      const tenant = await resolveTenant(context.db, tenantSelector);
      return listMembershipsByTenant(context.db, tenant.id);
    }
    throw new Error("Provide --user or --tenant");
  }
  if (action === "add") {
    const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
    const membership = await createTenantMembership(context.db, {
      tenantId: tenant.id,
      userId: readRequiredStringFlag(parsed, "user"),
      role: readMembershipRole(parsed, "role", "admin")
    });
    return membership;
  }
  if (action === "remove") {
    const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
    const userId = readRequiredStringFlag(parsed, "user");
    const result = await context.db.prepare("DELETE FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?").bind(tenant.id, userId).run();
    return { ok: result.meta.changes > 0 };
  }
  throw new Error(`Unknown membership action: ${action}`);
}

// src/lib/server/time-entries.ts
function normalizeLocalDateTime(value) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
function parseLocalDateTime(value) {
  const normalized = normalizeLocalDateTime(value);
  if (!normalized) {
    return Number.NaN;
  }
  const [datePart, timePart] = normalized.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second);
}
function computeDurationSeconds(startAt, endAt) {
  const startMs = parseLocalDateTime(startAt);
  const endMs = parseLocalDateTime(endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((endMs - startMs) / 1e3));
}
function addDays2(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  next.setUTCDate(next.getUTCDate() + days);
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
function nowInTimeZone(timezone) {
  return formatUtcIsoInTimeZone(isoNow(), timezone);
}
async function stopRunningEntryIfNeeded(db, tenantId) {
  const running = await getRunningTimeEntry(db, tenantId);
  if (!running) {
    return;
  }
  const endAt = nowInTimeZone(running.timezone);
  const durationSeconds2 = computeDurationSeconds(running.start_at, endAt);
  await db.prepare(
    `UPDATE time_entries
       SET end_at = ?, duration_seconds = ?, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND end_at IS NULL`
  ).bind(endAt, durationSeconds2, isoNow(), tenantId, running.id).run();
}
async function getRunningTimeEntry(db, tenantId) {
  return db.prepare("SELECT * FROM time_entries WHERE tenant_id = ? AND end_at IS NULL ORDER BY start_at DESC LIMIT 1").bind(tenantId).first();
}
async function startTimeEntry(db, tenantId, input) {
  await stopRunningEntryIfNeeded(db, tenantId);
  const now = isoNow();
  const id = makeId();
  const startAt = nowInTimeZone(input.timezone);
  await db.prepare(
    `INSERT INTO time_entries (
        id,
        tenant_id,
        project_id,
        description,
        start_at,
        end_at,
        timezone,
        duration_seconds,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    tenantId,
    input.projectId ?? null,
    input.description ?? "",
    startAt,
    null,
    input.timezone,
    null,
    input.userId ?? null,
    now,
    now
  ).run();
  const created = await getTimeEntryById(db, tenantId, id);
  if (!created) {
    throw new Error("Time entry start failed");
  }
  return created;
}
async function stopTimeEntry(db, tenantId, entryId) {
  const existing = await getTimeEntryById(db, tenantId, entryId);
  if (!existing || existing.end_at) {
    return null;
  }
  const endAt = nowInTimeZone(existing.timezone);
  const durationSeconds2 = computeDurationSeconds(existing.start_at, endAt);
  await db.prepare(
    `UPDATE time_entries
       SET end_at = ?, duration_seconds = ?, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND end_at IS NULL`
  ).bind(endAt, durationSeconds2, isoNow(), tenantId, entryId).run();
  return getTimeEntryById(db, tenantId, entryId);
}
async function createTimeEntry(db, tenantId, input) {
  const startAt = normalizeLocalDateTime(input.startAt);
  const endAt = normalizeLocalDateTime(input.endAt);
  if (!startAt || !endAt) {
    throw new Error("startAt and endAt must be ISO local datetimes");
  }
  const now = isoNow();
  const id = makeId();
  const durationSeconds2 = computeDurationSeconds(startAt, endAt);
  await db.prepare(
    `INSERT INTO time_entries (
        id,
        tenant_id,
        project_id,
        description,
        start_at,
        end_at,
        timezone,
        duration_seconds,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    tenantId,
    input.projectId ?? null,
    input.description ?? "",
    startAt,
    endAt,
    input.timezone,
    durationSeconds2,
    input.userId ?? null,
    now,
    now
  ).run();
  const created = await getTimeEntryById(db, tenantId, id);
  if (!created) {
    throw new Error("Time entry creation failed");
  }
  return created;
}
async function listTimeEntries(db, tenantId, options = {}) {
  const clauses = ["tenant_id = ?"];
  const values = [tenantId];
  if (options.projectId) {
    clauses.push("project_id = ?");
    values.push(options.projectId);
  }
  if (options.from) {
    clauses.push("start_at >= ?");
    values.push(`${options.from}T00:00:00`);
  }
  if (options.to) {
    clauses.push("start_at < ?");
    values.push(`${addDays2(options.to, 1)}T00:00:00`);
  }
  const limit = Math.max(1, Math.min(options.limit ?? 100, 5e3));
  const offset = Math.max(0, options.offset ?? 0);
  values.push(limit, offset);
  const sql = `SELECT * FROM time_entries WHERE ${clauses.join(" AND ")} ORDER BY start_at DESC LIMIT ? OFFSET ?`;
  const result = await db.prepare(sql).bind(...values).all();
  return result.results ?? [];
}
async function getTimeEntryById(db, tenantId, entryId) {
  return db.prepare("SELECT * FROM time_entries WHERE tenant_id = ? AND id = ? LIMIT 1").bind(tenantId, entryId).first();
}
async function updateTimeEntry(db, tenantId, entryId, fields) {
  const existing = await getTimeEntryById(db, tenantId, entryId);
  if (!existing) {
    return false;
  }
  const normalizedFields = { ...fields };
  if (normalizedFields.start_at !== void 0 && normalizedFields.start_at !== null) {
    const nextStartAt = normalizeLocalDateTime(normalizedFields.start_at);
    if (!nextStartAt) {
      throw new Error("start_at must be an ISO local datetime");
    }
    normalizedFields.start_at = nextStartAt;
  }
  if (normalizedFields.end_at !== void 0 && normalizedFields.end_at !== null) {
    const nextEndAt = normalizeLocalDateTime(normalizedFields.end_at);
    if (!nextEndAt) {
      throw new Error("end_at must be an ISO local datetime");
    }
    normalizedFields.end_at = nextEndAt;
  }
  const mergedStartAt = normalizedFields.start_at ?? existing.start_at;
  const mergedEndAt = normalizedFields.end_at === void 0 ? existing.end_at : normalizedFields.end_at;
  if (normalizedFields.duration_seconds === void 0 && (normalizedFields.start_at !== void 0 || normalizedFields.end_at !== void 0 || normalizedFields.timezone !== void 0)) {
    normalizedFields.duration_seconds = mergedEndAt ? computeDurationSeconds(mergedStartAt, mergedEndAt) : null;
  }
  const entries = Object.entries(normalizedFields).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return false;
  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  const result = await db.prepare(`UPDATE time_entries SET ${sets}, updated_at = ? WHERE tenant_id = ? AND id = ?`).bind(...values, isoNow(), tenantId, entryId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function deleteTimeEntry(db, tenantId, entryId) {
  const result = await db.prepare("DELETE FROM time_entries WHERE tenant_id = ? AND id = ?").bind(tenantId, entryId).run();
  return (result.meta?.changes ?? 0) > 0;
}
async function aggregateTimeByProject(db, tenantId, from, to) {
  const result = await db.prepare(
    `SELECT
         time_entries.project_id,
         COALESCE(time_projects.name, 'No project') AS project_name,
         COALESCE(time_projects.color, '#7d8492') AS project_color,
         COALESCE(SUM(time_entries.duration_seconds), 0) AS total_seconds,
         COUNT(time_entries.id) AS entry_count
       FROM time_entries
       LEFT JOIN time_projects
         ON time_projects.id = time_entries.project_id
        AND time_projects.tenant_id = time_entries.tenant_id
       WHERE time_entries.tenant_id = ?
         AND time_entries.end_at IS NOT NULL
         AND time_entries.start_at >= ?
         AND time_entries.start_at < ?
       GROUP BY time_entries.project_id, time_projects.name, time_projects.color
       ORDER BY total_seconds DESC, project_name ASC`
  ).bind(tenantId, `${from}T00:00:00`, `${addDays2(to, 1)}T00:00:00`).all();
  return result.results ?? [];
}

// scripts/cli/time-command.ts
async function handleTimeProjectCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "list") {
    return listTimeProjectsByTenant(context.db, tenant.id, {
      includeArchived: readBooleanFlag(parsed, "include-archived", false)
    });
  }
  if (action === "get") {
    return resolveTimeProject(context.db, tenant.id, readRequiredStringFlag(parsed, "project"));
  }
  if (action === "create") {
    return createTimeProject(context.db, tenant.id, {
      name: readRequiredStringFlag(parsed, "name"),
      color: readStringFlag(parsed, "color") ?? void 0,
      sortOrder: readNumberFlag(parsed, "sort") ?? 0
    });
  }
  if (action === "update") {
    const project = await resolveTimeProject(context.db, tenant.id, readRequiredStringFlag(parsed, "project"));
    const ok = await updateTimeProject(context.db, tenant.id, project.id, {
      name: readStringFlag(parsed, "name"),
      color: readStringFlag(parsed, "color"),
      is_archived: hasFlag(parsed, "archive") ? 1 : hasFlag(parsed, "unarchive") ? 0 : void 0,
      sort_order: readNumberFlag(parsed, "sort")
    });
    return { ok };
  }
  if (action === "delete") {
    const selector = readRequiredStringFlag(parsed, "project");
    requireExactConfirmation(parsed, "delete time project", selector);
    const project = await resolveTimeProject(context.db, tenant.id, selector);
    return { ok: await deleteTimeProject(context.db, tenant.id, project.id) };
  }
  throw new Error(`Unknown time-project action: ${action}`);
}
async function handleTimeEntryCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  if (action === "current") {
    return getRunningTimeEntry(context.db, tenant.id);
  }
  if (action === "list") {
    const projectSelector = readStringFlag(parsed, "project");
    const project = projectSelector ? await resolveTimeProject(context.db, tenant.id, projectSelector) : null;
    return listTimeEntries(context.db, tenant.id, {
      from: readStringFlag(parsed, "from") ?? void 0,
      to: readStringFlag(parsed, "to") ?? void 0,
      projectId: project?.id,
      limit: readNumberFlag(parsed, "limit") ?? 50,
      offset: readNumberFlag(parsed, "offset") ?? 0
    });
  }
  if (action === "get") {
    return getTimeEntryById(context.db, tenant.id, readRequiredStringFlag(parsed, "entry"));
  }
  if (action === "start") {
    const projectSelector = readStringFlag(parsed, "project");
    const project = projectSelector ? await resolveTimeProject(context.db, tenant.id, projectSelector) : null;
    return startTimeEntry(context.db, tenant.id, {
      description: readStringFlag(parsed, "description") ?? void 0,
      projectId: project?.id ?? null,
      timezone: readStringFlag(parsed, "timezone") ?? tenant.timezone,
      userId: readStringFlag(parsed, "user") ?? "cli"
    });
  }
  if (action === "stop") {
    const entryId = readStringFlag(parsed, "entry") ?? (await getRunningTimeEntry(context.db, tenant.id))?.id;
    if (!entryId) {
      throw new Error("Provide --entry or start a running timer first");
    }
    const entry = await stopTimeEntry(context.db, tenant.id, entryId);
    if (!entry) {
      throw new Error(`Running time entry not found: ${entryId}`);
    }
    return entry;
  }
  if (action === "create") {
    const projectSelector = readStringFlag(parsed, "project");
    const project = projectSelector ? await resolveTimeProject(context.db, tenant.id, projectSelector) : null;
    return createTimeEntry(context.db, tenant.id, {
      description: readStringFlag(parsed, "description") ?? void 0,
      projectId: project?.id ?? null,
      startAt: readRequiredStringFlag(parsed, "start"),
      endAt: readRequiredStringFlag(parsed, "end"),
      timezone: readStringFlag(parsed, "timezone") ?? tenant.timezone,
      userId: readStringFlag(parsed, "user") ?? "cli"
    });
  }
  if (action === "update") {
    const entryId = readRequiredStringFlag(parsed, "entry");
    const projectSelector = readStringFlag(parsed, "project");
    const project = projectSelector ? await resolveTimeProject(context.db, tenant.id, projectSelector) : null;
    const ok = await updateTimeEntry(context.db, tenant.id, entryId, {
      description: readStringFlag(parsed, "description"),
      start_at: readStringFlag(parsed, "start"),
      end_at: hasFlag(parsed, "clear-end") ? null : readStringFlag(parsed, "end"),
      timezone: readStringFlag(parsed, "timezone"),
      project_id: hasFlag(parsed, "clear-project") ? null : project ? project.id : void 0
    });
    return { ok };
  }
  if (action === "delete") {
    const entryId = readRequiredStringFlag(parsed, "entry");
    requireExactConfirmation(parsed, "delete time entry", entryId);
    return {
      ok: await deleteTimeEntry(context.db, tenant.id, entryId)
    };
  }
  throw new Error(`Unknown time-entry action: ${action}`);
}
function escapeCsvValue(value) {
  if (!value.includes(",") && !value.includes('"') && !value.includes("\n")) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
async function handleTimeReportCommand(context, action, parsed) {
  const tenant = await resolveTenant(context.db, readTenantSelector(parsed));
  const from = readRequiredStringFlag(parsed, "from");
  const to = readRequiredStringFlag(parsed, "to");
  if (action === "summary") {
    const entries = await listTimeEntries(context.db, tenant.id, {
      from,
      to,
      limit: 5e3,
      offset: 0
    });
    const byProject = await aggregateTimeByProject(context.db, tenant.id, from, to);
    const completedEntries = entries.filter((entry) => entry.end_at !== null);
    return {
      tenantId: tenant.id,
      from,
      to,
      totalSeconds: completedEntries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0),
      entryCount: completedEntries.length,
      byProject
    };
  }
  if (action === "export-csv") {
    const entries = await listTimeEntries(context.db, tenant.id, {
      from,
      to,
      limit: 5e3,
      offset: 0
    });
    const projects = await listTimeProjectsByTenant(context.db, tenant.id, {
      includeArchived: true
    });
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const lines = [["Date", "Start", "End", "Duration (h)", "Project", "Description"].join(",")];
    for (const entry of entries.filter((row) => row.end_at !== null)) {
      const project = entry.project_id ? projectMap.get(entry.project_id) : null;
      lines.push(
        [
          entry.start_at.slice(0, 10),
          entry.start_at.slice(11, 16),
          entry.end_at ? entry.end_at.slice(11, 16) : "",
          ((entry.duration_seconds ?? 0) / 3600).toFixed(2),
          project?.name ?? "No project",
          entry.description
        ].map((value) => escapeCsvValue(value)).join(",")
      );
    }
    return lines.join("\n");
  }
  throw new Error(`Unknown time-report action: ${action}`);
}

// scripts/cli/yourtime.ts
function printHelp(write = (text) => process3.stdout.write(text)) {
  write(`mere-today CLI (alias: yourtime)

Usage:
  mere-today auth login [--base-url https://mere.today] [--workspace ID] [--json]
  mere-today auth agent-login --workspace WORKSPACE_ID [--business-base-url https://mere.business] [--json]
  mere-today auth whoami [--json]
  mere-today auth logout [--json]
  mere-today completion [bash|zsh|fish]

  mere-today [global flags] [--local|--remote] [--db yourtime] [--persist-to .wrangler/state] <resource> <action> [flags]

Global flags:
  --base-url <url>        Override YOURTIME_BASE_URL for browser auth
  --business-base-url <url> Override Mere Business for browserless agent login
  --workspace <id>        Preferred workspace for browser auth
  --store <local|cloud>   Choose supported local/cloud data-plane commands
  --ai <local|cloud>      Choose AI plane for local-plane inspection
  --local-db <path>       Override the shared Mere local-plane SQLite path
  --projection-url <url>  Cloudflare Business projection receiver URL
  --projection-token <token> Cloudflare Business projection bearer token
  --json                  Write machine-readable JSON
  --version               Show the CLI version
  --no-interactive        Reserved for non-interactive automation
  --yes                   Required for destructive automation
  --confirm <id>          Exact target id required with --yes for destructive commands
  --data <json>           Structured JSON object for mutations
  --data-file <path>      Read mutation JSON from a file
  --help                  Show this help

Resources:
  db query --sql "SELECT * FROM tenants"
  db migrate [--dir migrations]
  db migrate --file migrations/0005_vnext_calendar.sql
  store info
  export --output ./today-time.bundle.json
  import --file ./today-time.bundle.json [--dry-run]
  completion [bash|zsh|fish]

  tenant list
  tenant resolve --workspace <workspaceId|slug|host>
  tenant get --tenant <id|slug>
  tenant create --slug <slug> --name <name> [--timezone UTC] [--owner-user <userId>]
  tenant update --tenant <id|slug> [branding and notification flags]

  membership list --user <userId>
  membership list --tenant <tenantId>
  membership add --tenant <tenantId> --user <userId> [--role owner|admin]
  membership remove --tenant <tenantId> --user <userId>

  service list --tenant <tenantId>
  service get --tenant <tenantId> --service <id>
  service create --tenant <tenantId> --name <name> --duration <minutes> --meeting-type <type>
  service update --tenant <tenantId> --service <id> [--name ... --duration ... --meeting-type ...]
  service delete --tenant <tenantId> --service <id>

  availability list --tenant <tenantId>
  availability add --tenant <tenantId> --type weekly|date_override|block --start 09:00 --end 17:00 [...]
  availability update --tenant <tenantId> --rule <id> --type ... --start ... --end ...
  availability delete --tenant <tenantId> --rule <id>
  availability slots --tenant <tenantId> [--service <id> | --duration <minutes>] --date <YYYY-MM-DD>
  availability slots --tenant <tenantId> [--service <id> | --duration <minutes>] --from <YYYY-MM-DD> --to <YYYY-MM-DD>

  calendar list --tenant <tenantId> --from <YYYY-MM-DD> --to <YYYY-MM-DD>
  calendar create --tenant <tenantId> --title <title> --start <local-iso> --end <local-iso> [--frequency daily|weekly|monthly]
  calendar update-event --tenant <tenantId> --event <id> [...]
  calendar update-series --tenant <tenantId> --series <id> [...]
  calendar override-occurrence --tenant <tenantId> --series <id> --date <YYYY-MM-DD> [...]
  calendar cancel-occurrence --tenant <tenantId> --series <id> --date <YYYY-MM-DD>
  calendar delete-event --tenant <tenantId> --event <id>
  calendar delete-series --tenant <tenantId> --series <id>

  booking list --tenant <tenantId> [--status new] [--limit 50] [--offset 0]
  booking get --tenant <tenantId> --booking <id>
  booking create --tenant <tenantId> --service <id> --name <name> --email <email> --date <YYYY-MM-DD> --time <HH:MM> --timezone <IANA>
  booking confirm --tenant <tenantId> --booking <id>
  booking cancel --tenant <tenantId> --booking <id> [--reason <text>]
  booking reschedule --tenant <tenantId> --booking <id> [--service <id>] --date <YYYY-MM-DD> --time <HH:MM>

  google status --tenant <tenantId>
  google connect-url --tenant <tenantId> --user <userId> --origin <https://app.example.com>
  google refresh --tenant <tenantId> [--force]
  google disconnect --tenant <tenantId>

  time-project list --tenant <tenantId>
  time-project get --tenant <tenantId> --project <id>
  time-project create --tenant <tenantId> --name <name> [--color #00d4aa]
  time-project update --tenant <tenantId> --project <id> [--name ... --color ... --archive]
  time-project delete --tenant <tenantId> --project <id>

  time-entry current --tenant <tenantId>
  time-entry list --tenant <tenantId> [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--project <id>] [--limit 50]
  time-entry get --tenant <tenantId> --entry <id>
  time-entry start --tenant <tenantId> [--description <text>] [--project <id>] [--timezone <IANA>]
  time-entry stop --tenant <tenantId> [--entry <id>]
  time-entry create --tenant <tenantId> --start <local-iso> --end <local-iso> [--description <text>]
  time-entry update --tenant <tenantId> --entry <id> [--description ... --start ... --end ... --project ...]
  time-entry delete --tenant <tenantId> --entry <id>

  time-report summary --tenant <tenantId> --from <YYYY-MM-DD> --to <YYYY-MM-DD>
  time-report publish --tenant <tenantId> --from <YYYY-MM-DD> --to <YYYY-MM-DD>
  time-report revoke --tenant <tenantId> --from <YYYY-MM-DD> --to <YYYY-MM-DD>
  time-report export-csv --tenant <tenantId> --from <YYYY-MM-DD> --to <YYYY-MM-DD>

Local plane:
  --store local currently supports time-project, time-entry, time-report, store info, export, import, and selected time-report publish/revoke.
  Hosted booking, shared calendar, tenant admin, Google busy import, and D1 operations remain Cloudflare/D1-owned.
`);
}
var COMPLETION_WORDS = [
  "auth",
  "booking",
  "calendar",
  "completion",
  "availability",
  "db",
  "export",
  "google",
  "import",
  "membership",
  "service",
  "store",
  "tenant",
  "time-entry",
  "time-project",
  "time-report"
];
function manifestCommand(path5, summary, options = {}) {
  return {
    id: path5.join("."),
    path: path5,
    summary,
    auth: options.auth ?? "workspace",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: options.positionals ?? [],
    flags: options.flags ?? [],
    ...options.auditDefault ? { auditDefault: true } : {}
  };
}
function commandManifest() {
  return {
    schemaVersion: 1,
    app: "mere-today",
    namespace: "today",
    aliases: ["mere-today", "yourtime"],
    auth: { kind: "browser" },
    baseUrlEnv: ["YOURTIME_BASE_URL"],
    sessionPath: "~/.local/state/mere-today/session.json",
    globalFlags: [
      "base-url",
      "business-base-url",
      "workspace",
      "json",
      "yes",
      "confirm",
      "data",
      "data-file",
      "tenant",
      "remote",
      "local",
      "db",
      "store",
      "ai",
      "local-db",
      "projection-url",
      "projection-token",
      "persist-to"
    ],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "agent-login"], "Create a Today session from a Business agent session.", {
        auth: "none",
        risk: "write",
        flags: ["workspace", "business-base-url", "base-url"]
      }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["db", "query"], "Run a local D1 query.", { auth: "none", risk: "write", flags: ["sql"] }),
      manifestCommand(["db", "migrate"], "Run local migrations.", { auth: "none", risk: "write", flags: ["file", "dir"] }),
      manifestCommand(["store", "info"], "Show local/cloud data and AI plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export local mere.today time transfer bundle.", { auth: "none", risk: "read", flags: ["output"] }),
      manifestCommand(["import"], "Import local mere.today time transfer bundle.", { auth: "none", risk: "write", flags: ["file", "dry-run"] }),
      manifestCommand(["tenant", "resolve"], "Resolve workspace to tenant.", { auditDefault: true }),
      manifestCommand(["tenant", "list"], "List tenants."),
      manifestCommand(["tenant", "get"], "Get tenant."),
      manifestCommand(["tenant", "create"], "Create tenant.", {
        risk: "write",
        supportsData: true,
        flags: [
          "name",
          "slug",
          "id",
          "organization-id",
          "organization-slug",
          "brand-initials",
          "event-title",
          "description",
          "cover-item",
          "duration",
          "meeting-type",
          "timezone",
          "accent-color",
          "logo-url",
          "notify-email",
          "from-email",
          "webhook-url",
          "tenant-id",
          "zerosmb-tenant-id",
          "status",
          "owner-user",
          "owner-role"
        ]
      }),
      manifestCommand(["tenant", "update"], "Update tenant.", {
        risk: "write",
        supportsData: true,
        flags: [
          "slug",
          "name",
          "organization-id",
          "organization-slug",
          "brand-initials",
          "event-title",
          "description",
          "cover-item",
          "duration",
          "meeting-type",
          "timezone",
          "accent-color",
          "logo-url",
          "notify-email",
          "from-email",
          "webhook-url"
        ]
      }),
      manifestCommand(["membership", "list"], "List memberships.", { flags: ["user"] }),
      manifestCommand(["membership", "add"], "Add membership.", { risk: "write", supportsData: true, flags: ["user", "role"] }),
      manifestCommand(["membership", "remove"], "Remove membership.", { risk: "destructive", requiresYes: true, flags: ["user"] }),
      manifestCommand(["service", "list"], "List service records.", { flags: ["active-only"] }),
      manifestCommand(["service", "get"], "Get a service record.", { flags: ["service"] }),
      manifestCommand(["service", "create"], "Create a service record.", {
        risk: "write",
        supportsData: true,
        flags: ["name", "description", "duration", "meeting-type", "color", "inactive", "sort"]
      }),
      manifestCommand(["service", "update"], "Update a service record.", {
        risk: "write",
        supportsData: true,
        flags: ["service", "name", "description", "duration", "meeting-type", "color", "inactive", "active", "sort", "slug"]
      }),
      manifestCommand(["availability", "list"], "List availability."),
      manifestCommand(["availability", "add"], "Add availability.", {
        risk: "write",
        supportsData: true,
        flags: ["type", "start", "end", "day", "date", "priority", "label", "available", "unavailable"]
      }),
      manifestCommand(["availability", "update"], "Update availability.", {
        risk: "write",
        supportsData: true,
        flags: ["rule", "type", "start", "end", "day", "date", "priority", "label", "available", "unavailable"]
      }),
      manifestCommand(["availability", "slots"], "List available slots.", { flags: ["service", "duration", "date", "from", "to"] }),
      manifestCommand(["calendar", "list"], "List calendar events.", { flags: ["from", "to"] }),
      manifestCommand(["calendar", "create"], "Create calendar event.", {
        risk: "write",
        supportsData: true,
        flags: ["title", "description", "start", "end", "timezone", "all-day", "color", "service", "user", "frequency", "interval", "weekday", "until", "count"]
      }),
      manifestCommand(["calendar", "update-event"], "Update calendar event.", {
        risk: "write",
        supportsData: true,
        flags: ["event", "title", "description", "start", "end", "timezone", "all-day", "color", "service", "clear-service"]
      }),
      manifestCommand(["calendar", "update-series"], "Update calendar series.", {
        risk: "write",
        supportsData: true,
        flags: ["series", "title", "description", "start", "end", "timezone", "all-day", "color", "service", "clear-service", "frequency", "interval", "weekday", "until", "count"]
      }),
      manifestCommand(["calendar", "override-occurrence"], "Override calendar occurrence.", {
        risk: "write",
        supportsData: true,
        flags: ["series", "date", "title", "description", "start", "end", "all-day", "color"]
      }),
      manifestCommand(["calendar", "cancel-occurrence"], "Cancel calendar occurrence.", {
        risk: "destructive",
        requiresYes: true,
        flags: ["series", "date"]
      }),
      manifestCommand(["booking", "list"], "List bookings.", { flags: ["status", "limit", "offset"] }),
      manifestCommand(["booking", "get"], "Get booking.", { flags: ["booking"] }),
      manifestCommand(["booking", "create"], "Create booking.", {
        risk: "write",
        supportsData: true,
        flags: ["service", "name", "email", "phone", "company", "date", "time", "timezone", "details", "source"]
      }),
      manifestCommand(["booking", "confirm"], "Confirm booking.", { risk: "write", flags: ["booking"] }),
      manifestCommand(["booking", "cancel"], "Cancel booking.", { risk: "destructive", requiresYes: true, flags: ["booking", "reason"] }),
      manifestCommand(["booking", "reschedule"], "Reschedule booking.", {
        risk: "write",
        supportsData: true,
        flags: ["booking", "service", "date", "time"]
      }),
      manifestCommand(["google", "status"], "Show Google status."),
      manifestCommand(["google", "connect-url"], "Create Google connect URL.", { risk: "write", flags: ["origin", "user"] }),
      manifestCommand(["google", "refresh"], "Refresh Google connection.", { risk: "external", requiresYes: true, flags: ["force"] }),
      manifestCommand(["time-project", "list"], "List time-project records.", { flags: ["include-archived"] }),
      manifestCommand(["time-project", "get"], "Get a time-project record.", { flags: ["project"] }),
      manifestCommand(["time-project", "create"], "Create a time-project record.", {
        risk: "write",
        supportsData: true,
        flags: ["name", "color", "sort"]
      }),
      manifestCommand(["time-project", "update"], "Update a time-project record.", {
        risk: "write",
        supportsData: true,
        flags: ["project", "name", "color", "archive", "unarchive", "sort"]
      }),
      manifestCommand(["time-entry", "current"], "Show current time entry."),
      manifestCommand(["time-entry", "list"], "List time-entry records.", { flags: ["from", "to", "project", "limit", "offset"] }),
      manifestCommand(["time-entry", "get"], "Get a time-entry record.", { flags: ["entry"] }),
      manifestCommand(["time-entry", "start"], "Start timer.", {
        risk: "write",
        supportsData: true,
        flags: ["description", "project", "timezone", "user"]
      }),
      manifestCommand(["time-entry", "stop"], "Stop timer.", { risk: "write", flags: ["entry"] }),
      manifestCommand(["time-entry", "create"], "Create a time-entry record.", {
        risk: "write",
        supportsData: true,
        flags: ["start", "end", "description", "project", "timezone", "user"]
      }),
      manifestCommand(["time-entry", "update"], "Update a time-entry record.", {
        risk: "write",
        supportsData: true,
        flags: ["entry", "description", "start", "end", "clear-end", "project", "clear-project", "timezone"]
      }),
      manifestCommand(["time-report", "summary"], "Summarize time.", { flags: ["from", "to"] }),
      manifestCommand(["time-report", "publish"], "Publish selected local time-report totals to Business.", {
        auth: "none",
        risk: "external",
        auditDefault: true,
        flags: ["from", "to", "project", "dry-run", "published-by-user-id", "published-by-email"]
      }),
      manifestCommand(["time-report", "revoke"], "Revoke selected local time-report projection from Business.", {
        auth: "none",
        risk: "external",
        auditDefault: true,
        flags: ["from", "to", "project", "dry-run", "published-by-user-id", "published-by-email"]
      }),
      manifestCommand(["time-report", "export-csv"], "Export time CSV.", { flags: ["from", "to"] }),
      manifestCommand(["service", "delete"], "service delete.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["service"] }),
      manifestCommand(["availability", "delete"], "availability delete.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["rule"] }),
      manifestCommand(["calendar", "delete-event"], "calendar delete-event.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["event"] }),
      manifestCommand(["calendar", "delete-series"], "calendar delete-series.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["series"] }),
      manifestCommand(["google", "disconnect"], "google disconnect.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["time-project", "delete"], "time-project delete.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["project"] }),
      manifestCommand(["time-entry", "delete"], "time-entry delete.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["entry"] }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-today bash completion",
      "_mere_today_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_today_completion mere-today yourtime",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-today yourtime",
      "_mere_today() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_today "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-today -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new Error("Unknown shell. Expected bash, zsh, or fish.");
}
function isRecord3(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
async function parseJsonResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = isRecord3(payload) && typeof payload.error === "string" ? payload.error : `Request failed with ${String(response.status)}`;
    throw new Error(message);
  }
  return payload;
}
function renderTenantResolveSummary(payload) {
  if (!isRecord3(payload)) return payload === null || payload === void 0 ? "" : JSON.stringify(payload);
  const raw = isRecord3(payload.raw) ? payload.raw : {};
  const workspace = isRecord3(payload.workspace) ? payload.workspace : {};
  const id = typeof raw.id === "string" ? raw.id : "(unknown)";
  const slug = typeof raw.slug === "string" ? raw.slug : "(unknown)";
  const name = typeof raw.name === "string" ? raw.name : "(unknown)";
  const workspaceId = typeof workspace.id === "string" ? workspace.id : null;
  return [
    `tenant: ${id}`,
    `slug: ${slug}`,
    `name: ${name}`,
    ...workspaceId ? [`workspace: ${workspaceId}`] : []
  ].join("\n");
}
async function handleTenantResolveCommand(parsed, io) {
  const session = await resolveAuthenticatedSession(parsed, io);
  const workspace = readStringFlag(parsed, "workspace") ?? readStringFlag(parsed, "tenant") ?? session.defaultWorkspaceId ?? session.workspace?.id;
  if (!workspace) {
    throw new Error("tenant resolve requires --workspace or a session default workspace.");
  }
  const url = new URL("/api/admin/tenant/resolve", session.baseUrl);
  url.searchParams.set("workspace", workspace);
  const response = await (io.fetchImpl ?? fetch)(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`
    }
  });
  return parseJsonResponse(response);
}
async function cliVersion() {
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
function createCliEnv(db) {
  return {
    DB: db,
    ASSETS: null,
    GOOGLE_CLIENT_ID: process3.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process3.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_TOKEN_ENCRYPTION_KEY: process3.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  };
}
function createContext(parsed) {
  const mode = readBooleanFlag(parsed, "remote", false) ? "remote" : "local";
  const d1 = {
    cwd: process3.cwd(),
    databaseName: readStringFlag(parsed, "db") ?? "yourtime",
    mode,
    persistTo: readStringFlag(parsed, "persist-to")
  };
  const db = createCliD1Database(d1);
  return {
    db,
    d1,
    env: createCliEnv(db),
    json: readBooleanFlag(parsed, "json", false)
  };
}
function emitCliResult(result, json, io) {
  if (result === "") return;
  const originalStdout = process3.stdout.write.bind(process3.stdout);
  const originalStderr = process3.stderr.write.bind(process3.stderr);
  process3.stdout.write = ((chunk) => {
    io.stdout(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  });
  process3.stderr.write = ((chunk) => {
    io.stderr(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  });
  try {
    writeOutput(result, { json });
  } finally {
    process3.stdout.write = originalStdout;
    process3.stderr.write = originalStderr;
  }
}
async function dispatch(context, parsed) {
  const [resource, action] = parsed.positionals;
  if (!resource || !action) {
    printHelp();
    return "";
  }
  if (resource === "db") {
    return handleDbCommand(context, action, parsed);
  }
  if (resource === "tenant") {
    return handleTenantCommand(context, action, parsed);
  }
  if (resource === "membership") {
    return handleMembershipCommand(context, action, parsed);
  }
  if (resource === "service") {
    return handleServiceCommand(context, action, parsed);
  }
  if (resource === "availability") {
    return handleAvailabilityCommand(context, action, parsed);
  }
  if (resource === "calendar") {
    return handleCalendarCommand(context, action, parsed);
  }
  if (resource === "booking") {
    return handleBookingCommand(context, action, parsed);
  }
  if (resource === "google") {
    return handleGoogleCommand(context, action, parsed);
  }
  if (resource === "time-project") {
    return handleTimeProjectCommand(context, action, parsed);
  }
  if (resource === "time-entry") {
    return handleTimeEntryCommand(context, action, parsed);
  }
  if (resource === "time-report") {
    return handleTimeReportCommand(context, action, parsed);
  }
  throw new Error(`Unknown resource: ${resource}`);
}
async function runCli(argv, io) {
  try {
    const parsed = parseArgv(argv);
    if (readBooleanFlag(parsed, "version", false) || parsed.positionals.length === 1 && (parsed.positionals[0] === "-v" || parsed.positionals[0] === "version")) {
      io.stdout(`${await cliVersion()}
`);
      return 0;
    }
    if (parsed.positionals.length === 0 || readBooleanFlag(parsed, "help", false)) {
      printHelp(io.stdout);
      return 0;
    }
    if (parsed.positionals[0] === "completion") {
      io.stdout(completionScript(parsed.positionals[1]));
      return 0;
    }
    if (parsed.positionals[0] === "commands") {
      io.stdout(`${JSON.stringify(commandManifest(), null, 2)}
`);
      return 0;
    }
    const resource = parsed.positionals[0];
    const localCapableResources = /* @__PURE__ */ new Set(["time-project", "time-entry", "time-report"]);
    const localPlaneResource = resource === "store" || resource === "export" || resource === "import";
    const requestedLocalData = readStringFlag(parsed, "store") !== void 0 && isLocalDataRoute(parsed, io.env);
    if (localPlaneResource || requestedLocalData && localCapableResources.has(resource)) {
      const result2 = await handleLocalPlaneCommand(parsed, io.env, { stdout: io.stdout });
      emitCliResult(result2, readBooleanFlag(parsed, "json", false), io);
      return 0;
    }
    if (requestedLocalData) {
      throw new Error(`--store local is not supported for ${resource}. Supported local commands are time-project, time-entry, time-report, store info, export, and import.`);
    }
    await hydrateActiveSession(io.env);
    if (parsed.positionals[0] === "auth") {
      const result2 = await handleAuthCommand(parsed, io);
      if (readBooleanFlag(parsed, "json", false)) {
        io.stdout(`${JSON.stringify(result2, null, 2)}
`);
      } else if (parsed.positionals[1] === "logout") {
        io.stdout(`${result2.loggedOut ? "Logged out." : "No local session found."}
`);
      } else {
        const session = getActiveSession();
        if (session) {
          io.stdout(`${renderSessionSummary(session)}
`);
        }
      }
      return 0;
    }
    if (parsed.positionals[0] === "tenant" && parsed.positionals[1] === "resolve") {
      const result2 = await handleTenantResolveCommand(parsed, io);
      if (readBooleanFlag(parsed, "json", false)) {
        io.stdout(`${JSON.stringify(result2, null, 2)}
`);
      } else {
        io.stdout(`${renderTenantResolveSummary(result2)}
`);
      }
      return 0;
    }
    const context = createContext(parsed);
    const result = await dispatch(context, parsed);
    emitCliResult(result, context.json, io);
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}
`);
    return 1;
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
