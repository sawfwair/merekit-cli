#!/usr/bin/env node

// cli/mere-network.ts
import { readFile as readFile3 } from "node:fs/promises";
import { resolve as resolvePath2 } from "node:path";

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
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

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

// cli/local-plane.ts
import { mkdir as mkdir3, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
import os2 from "node:os";
import path2 from "node:path";
function stateHome2(env) {
  const home = env.HOME?.trim() || os2.homedir();
  return env.XDG_DATA_HOME?.trim() || path2.join(home, ".local", "share");
}
function expandHome(value, env) {
  const home = env.HOME?.trim() || os2.homedir();
  if (value === "~") return home;
  if (value.startsWith("~/")) return path2.join(home, value.slice(2));
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
  return path2.join(stateHome2(env), "mere", "local-plane.db");
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
      value: path2.resolve(expandHome(input.argument, input.env)),
      source: "argument"
    };
  }
  const appValue = input.env[`${prefix}_LOCAL_DB`] ?? input.env[`${prefix}_LOCAL_PLANE_DB`];
  if (appValue?.trim()) {
    return {
      value: path2.resolve(expandHome(appValue, input.env)),
      source: "app-env"
    };
  }
  const globalValue = input.env.MERE_LOCAL_DB ?? input.env.MERE_LOCAL_PLANE_DB;
  if (globalValue?.trim()) {
    return {
      value: path2.resolve(expandHome(globalValue, input.env)),
      source: "global-env"
    };
  }
  return {
    value: path2.resolve(defaultLocalPlaneDbPath(input.env)),
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

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { mkdir as mkdir2 } from "node:fs/promises";
import path3 from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/migration.ts
import { createHash, randomUUID } from "node:crypto";
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
function isoNow() {
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
    exportedAt: input.exportedAt ?? isoNow(),
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
  const id = `xfer_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
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
    isoNow()
  );
  return id;
}

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function loadNodeSqlite() {
  return import(["node", "sqlite"].join(":"));
}
async function openLocalPlaneDatabase(config) {
  await mkdir2(path3.dirname(config.localDbPath), { recursive: true });
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
  const now = isoNow2();
  db.prepare(
    `INSERT INTO mere_plane_apps (app_id, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(app_id) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`
  ).run(appId, displayName ?? appId, now, now);
}
function registerPlaneTransferSchema(db, appId, input) {
  const now = isoNow2();
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
  const now = isoNow2();
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

// cli/local-store.ts
import { createHash as createHash2 } from "node:crypto";
var NETWORK_APP_ID = "mere-network";
var NETWORK_ARCHIVE_SCHEMA = "mere.network.archive.v1";
var RECORD_TYPES = [
  "customers",
  "deployments",
  "locations",
  "scripts",
  "scriptStages",
  "numbers",
  "providerAccounts",
  "routingPolicies",
  "calls",
  "callTurns",
  "interactions",
  "messages",
  "recordings",
  "transcripts"
];
var RECORD_TYPE_LABELS = {
  customers: "customer",
  deployments: "deployment",
  locations: "location",
  scripts: "script",
  scriptStages: "script stage",
  numbers: "number",
  providerAccounts: "provider account",
  routingPolicies: "routing policy",
  calls: "call",
  callTurns: "call turn",
  interactions: "interaction",
  messages: "message",
  recordings: "recording reference",
  transcripts: "transcript export"
};
var COUNT_FIELDS = {
  customers: "customerCount",
  deployments: "deploymentCount",
  locations: "locationCount",
  scripts: "scriptCount",
  scriptStages: "scriptStageCount",
  numbers: "numberCount",
  providerAccounts: "providerAccountCount",
  routingPolicies: "routingPolicyCount",
  calls: "callCount",
  callTurns: "callTurnCount",
  interactions: "interactionCount",
  messages: "messageCount",
  recordings: "recordingCount",
  transcripts: "transcriptCount"
};
var CALL_SCOPED_TYPES = /* @__PURE__ */ new Set(["callTurns", "recordings", "transcripts"]);
var INTERACTION_SCOPED_TYPES = /* @__PURE__ */ new Set(["messages"]);
var SCRIPT_SCOPED_TYPES = /* @__PURE__ */ new Set(["scriptStages"]);
var CUSTOMER_SCOPED_TYPES = /* @__PURE__ */ new Set(["deployments"]);
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseJsonObject(value) {
  if (isRecord2(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = JSON.parse(value);
    return isRecord2(parsed) ? parsed : {};
  }
  return {};
}
function readString2(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required for local mere.network records.`);
  }
  return value.trim();
}
function readOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function readFirstString(input, keys) {
  for (const key of keys) {
    const value = readOptionalString(input[key]);
    if (value) return value;
  }
  return null;
}
function readRecordId(input, type) {
  const id = readFirstString(input, [
    "id",
    "recordId",
    "record_id",
    "customerId",
    "customer_id",
    "deploymentId",
    "deployment_id",
    "locationId",
    "location_id",
    "scriptId",
    "script_id",
    "stageId",
    "stage_id",
    "numberId",
    "number_id",
    "providerAccountId",
    "provider_account_id",
    "callId",
    "call_id",
    "turnId",
    "turn_id",
    "interactionId",
    "interaction_id",
    "messageId",
    "message_id",
    "recordingId",
    "recording_id",
    "transcriptId",
    "transcript_id"
  ]);
  return readString2(id, `${RECORD_TYPE_LABELS[type]} id`);
}
function normalizePayloadRecord(input, type, workspaceId, existing) {
  const id = readRecordId(input, type);
  const now = isoNow3();
  const createdAt = readOptionalString(input.createdAt ?? input.created_at) ?? readOptionalString(existing?.createdAt) ?? now;
  const updatedAt = readOptionalString(input.updatedAt ?? input.updated_at) ?? now;
  const customerId = (type === "customers" ? id : readFirstString(input, ["customerId", "customer_id"])) ?? readOptionalString(existing?.customerId);
  const locationId = (type === "locations" ? id : readFirstString(input, ["locationId", "location_id"])) ?? readOptionalString(existing?.locationId);
  const scriptId = (type === "scripts" ? id : readFirstString(input, ["scriptId", "script_id"])) ?? readOptionalString(existing?.scriptId);
  const callId = (type === "calls" ? id : readFirstString(input, ["callId", "call_id"])) ?? readOptionalString(existing?.callId);
  const interactionId = (type === "interactions" ? id : readFirstString(input, ["interactionId", "interaction_id"])) ?? readOptionalString(existing?.interactionId);
  if (CUSTOMER_SCOPED_TYPES.has(type) && !customerId) throw new Error(`${RECORD_TYPE_LABELS[type]} requires customerId.`);
  if (SCRIPT_SCOPED_TYPES.has(type) && !scriptId) throw new Error(`${RECORD_TYPE_LABELS[type]} requires scriptId.`);
  if (CALL_SCOPED_TYPES.has(type) && !callId) throw new Error(`${RECORD_TYPE_LABELS[type]} requires callId.`);
  if (INTERACTION_SCOPED_TYPES.has(type) && !interactionId) throw new Error(`${RECORD_TYPE_LABELS[type]} requires interactionId.`);
  return {
    id,
    customerId,
    locationId,
    scriptId,
    callId,
    interactionId,
    createdAt,
    updatedAt,
    payload: {
      ...existing ?? {},
      ...input,
      id,
      workspaceId,
      recordType: type,
      customerId,
      locationId,
      scriptId,
      callId,
      interactionId,
      createdAt,
      updatedAt
    }
  };
}
function rowPayload(row) {
  const payload = parseJsonObject(row.payload_json);
  return {
    ...payload,
    id: readString2(row.record_id, "record_id"),
    workspaceId: readString2(row.workspace_id, "workspace_id"),
    recordType: readString2(row.record_type, "record_type"),
    customerId: readOptionalString(row.customer_id),
    locationId: readOptionalString(row.location_id),
    scriptId: readOptionalString(row.script_id),
    callId: readOptionalString(row.call_id),
    interactionId: readOptionalString(row.interaction_id),
    createdAt: readString2(row.created_at, "created_at"),
    updatedAt: readString2(row.updated_at, "updated_at")
  };
}
function stableCallProjectionId(input) {
  const digest = createHash2("sha256").update([NETWORK_APP_ID, input.workspaceId, input.callId, "call-summary"].join("\n")).digest("hex").slice(0, 24);
  return `netpr_${digest}`;
}
function dateOnly(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 10) : null;
}
function optionalPayloadString(payload, key) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== NETWORK_ARCHIVE_SCHEMA || value.version !== 1) {
    throw new Error(`Network transfer payload must be ${NETWORK_ARCHIVE_SCHEMA} version 1.`);
  }
  const readList = (key) => Array.isArray(value[key]) ? value[key].filter(isRecord2).map((entry) => normalizePayloadRecord(entry, key, workspaceId).payload) : [];
  return {
    kind: NETWORK_ARCHIVE_SCHEMA,
    version: 1,
    customers: readList("customers"),
    deployments: readList("deployments"),
    locations: readList("locations"),
    scripts: readList("scripts"),
    scriptStages: readList("scriptStages"),
    numbers: readList("numbers"),
    providerAccounts: readList("providerAccounts"),
    routingPolicies: readList("routingPolicies"),
    calls: readList("calls"),
    callTurns: readList("callTurns"),
    interactions: readList("interactions"),
    messages: readList("messages"),
    recordings: readList("recordings"),
    transcripts: readList("transcripts")
  };
}
var LocalNetworkStore = class _LocalNetworkStore {
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
    registerPlaneApp(opened.db, NETWORK_APP_ID, "Mere Network");
    registerPlaneTransferSchema(opened.db, NETWORK_APP_ID, {
      payloadSchema: NETWORK_ARCHIVE_SCHEMA,
      displayName: "Network archive transfer",
      description: "Portable mere.network voice, transcript, interaction, routing, and control-plane archive metadata; realtime voice, provider effects, recording bytes, delivery, and bridge sync stay hosted."
    });
    upsertPlaneWorkspace(opened.db, NETWORK_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalNetworkStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
			CREATE TABLE IF NOT EXISTS network_local_records (
				record_type TEXT NOT NULL,
				record_id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				customer_id TEXT,
				location_id TEXT,
				script_id TEXT,
				call_id TEXT,
				interaction_id TEXT,
				payload_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, record_type, record_id)
			);

			CREATE INDEX IF NOT EXISTS idx_network_local_records_type
				ON network_local_records (workspace_id, record_type, updated_at DESC);

			CREATE INDEX IF NOT EXISTS idx_network_local_records_call
				ON network_local_records (workspace_id, call_id, record_type, updated_at DESC);

			CREATE INDEX IF NOT EXISTS idx_network_local_records_interaction
				ON network_local_records (workspace_id, interaction_id, record_type, updated_at DESC);

			CREATE TABLE IF NOT EXISTS network_local_projections (
				id TEXT PRIMARY KEY,
				workspace_id TEXT NOT NULL,
				scope TEXT NOT NULL,
				call_id TEXT NOT NULL,
				published_at TEXT NOT NULL,
				revoked_at TEXT,
				payload_json TEXT NOT NULL,
				last_projected_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_network_local_projections_workspace_scope
				ON network_local_projections (workspace_id, scope, updated_at DESC);
		`);
  }
  count(type) {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM network_local_records WHERE workspace_id = ? AND record_type = ?").get(this.workspace.workspaceId, type);
    return row?.count ?? 0;
  }
  counts() {
    return Object.fromEntries(RECORD_TYPES.map((type) => [COUNT_FIELDS[type], this.count(type)]));
  }
  projectionCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM network_local_projections WHERE workspace_id = ?").get(this.workspace.workspaceId);
    return row?.count ?? 0;
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: NETWORK_APP_ID });
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      ...this.counts(),
      projectionCount: this.projectionCount(),
      localArchive: "enabled",
      realtimeVoiceLocal: false,
      sttLocal: false,
      llmLocal: false,
      ttsLocal: false,
      telephonyLocal: false,
      recordingBytesLocal: false,
      bridgeDeliveryLocal: false,
      projectionPublisherLocal: true,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listRecords(type, filterId) {
    let rows;
    if (filterId && CALL_SCOPED_TYPES.has(type)) {
      rows = this.db.prepare(
        "SELECT * FROM network_local_records WHERE workspace_id = ? AND record_type = ? AND call_id = ? ORDER BY updated_at DESC"
      ).all(this.workspace.workspaceId, type, filterId);
    } else if (filterId && INTERACTION_SCOPED_TYPES.has(type)) {
      rows = this.db.prepare(
        "SELECT * FROM network_local_records WHERE workspace_id = ? AND record_type = ? AND interaction_id = ? ORDER BY updated_at DESC"
      ).all(this.workspace.workspaceId, type, filterId);
    } else {
      rows = this.db.prepare("SELECT * FROM network_local_records WHERE workspace_id = ? AND record_type = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId, type);
    }
    return rows.map(rowPayload);
  }
  getRecord(type, id) {
    const row = this.db.prepare("SELECT * FROM network_local_records WHERE workspace_id = ? AND record_type = ? AND record_id = ? LIMIT 1").get(this.workspace.workspaceId, type, id);
    return row ? rowPayload(row) : null;
  }
  upsertRecord(type, input) {
    const id = readRecordId(input, type);
    const existing = this.getRecord(type, id) ?? void 0;
    const record = normalizePayloadRecord(input, type, this.workspace.workspaceId, existing);
    this.db.prepare(
      `INSERT INTO network_local_records (
					record_type, record_id, workspace_id, customer_id, location_id, script_id, call_id,
					interaction_id, payload_json, created_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
					customer_id = excluded.customer_id,
					location_id = excluded.location_id,
					script_id = excluded.script_id,
					call_id = excluded.call_id,
					interaction_id = excluded.interaction_id,
					payload_json = excluded.payload_json,
					updated_at = excluded.updated_at`
    ).run(
      type,
      record.id,
      this.workspace.workspaceId,
      record.customerId,
      record.locationId,
      record.scriptId,
      record.callId,
      record.interactionId,
      JSON.stringify(record.payload),
      record.createdAt,
      record.updatedAt
    );
    return record.payload;
  }
  getCallProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM network_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildCallProjectionEnvelope(input) {
    const call = this.getRecord("calls", input.callId);
    if (!call) throw new Error(`Local Network call archive record not found: ${input.callId}`);
    const projectionId = stableCallProjectionId({
      workspaceId: this.workspace.workspaceId,
      callId: input.callId
    });
    const existing = this.getCallProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    const locationId = readOptionalString(call.locationId ?? call.location_id);
    const scriptId = readOptionalString(call.scriptId ?? call.script_id);
    const location = locationId ? this.getRecord("locations", locationId) : null;
    const script = scriptId ? this.getRecord("scripts", scriptId) : null;
    return {
      version: 1,
      appId: NETWORK_APP_ID,
      event: {
        type: input.action === "publish" ? "network.call.projection.upserted" : "network.call.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "call-summary",
          callId: input.callId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        call: {
          id: input.callId,
          status: optionalPayloadString(call, "status"),
          createdOn: dateOnly(call.createdAt ?? call.created_at),
          updatedOn: dateOnly(call.updatedAt ?? call.updated_at)
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          callId: input.callId,
          hasLocationRecord: Boolean(location),
          hasScriptRecord: Boolean(script),
          callTurnCount: this.listRecords("callTurns", input.callId).length,
          recordingReferenceCount: this.listRecords("recordings", input.callId).length,
          transcriptExportCount: this.listRecords("transcripts", input.callId).length
        },
        exclusions: [
          "customer names and contact details",
          "phone numbers and caller identifiers",
          "location names, addresses, and routing metadata",
          "script names, prompts, goals, and stage text",
          "call transcript text and turn content",
          "interaction contact fields and message bodies",
          "recording object keys, source URLs, local paths, bytes, MIME types, and hashes",
          "provider account identifiers and provider payloads",
          "LiveKit rooms, Twilio SIDs, and vendor delivery state",
          "LLM/STT/TTS prompts, responses, and diagnostics",
          "deployment run state and tenant artifacts",
          "workspace bridge payloads",
          "raw local archive rows",
          "transfer bundle payloads"
        ]
      }
    };
  }
  recordCallProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO network_local_projections (
					id, workspace_id, scope, call_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					workspace_id = excluded.workspace_id,
					scope = excluded.scope,
					call_id = excluded.call_id,
					published_at = excluded.published_at,
					revoked_at = excluded.revoked_at,
					payload_json = excluded.payload_json,
					last_projected_at = excluded.last_projected_at,
					updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.callId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: NETWORK_ARCHIVE_SCHEMA,
      version: 1,
      customers: this.listRecords("customers"),
      deployments: this.listRecords("deployments"),
      locations: this.listRecords("locations"),
      scripts: this.listRecords("scripts"),
      scriptStages: this.listRecords("scriptStages"),
      numbers: this.listRecords("numbers"),
      providerAccounts: this.listRecords("providerAccounts"),
      routingPolicies: this.listRecords("routingPolicies"),
      calls: this.listRecords("calls"),
      callTurns: this.listRecords("callTurns"),
      interactions: this.listRecords("interactions"),
      messages: this.listRecords("messages"),
      recordings: this.listRecords("recordings"),
      transcripts: this.listRecords("transcripts")
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: NETWORK_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: NETWORK_ARCHIVE_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: NETWORK_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: NETWORK_ARCHIVE_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: NETWORK_APP_ID,
      payloadSchema: NETWORK_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? NETWORK_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? NETWORK_ARCHIVE_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: NETWORK_APP_ID,
      payloadSchema: NETWORK_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const type of RECORD_TYPES) {
        for (const record of normalized[type]) this.upsertRecord(type, record);
      }
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: NETWORK_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? NETWORK_ARCHIVE_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        ...this.counts(),
        transferId,
        realtimeVoiceLocal: false,
        telephonyLocal: false,
        recordingBytesLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};

// cli/local-plane.ts
var HOSTED_BOUNDARY = "Network realtime voice Durable Objects, STT, LLM, TTS, LiveKit, Twilio/provider effects, recording bytes, deployment runs, bridge delivery, and the Business projection receiver remain Cloudflare-owned.";
function asString(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.at(-1);
  return void 0;
}
function asBoolean(value) {
  return value === true;
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function parseJsonText(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`, { cause: error });
  }
}
function readObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}
function resolveNetworkPlaneConfig(options, io) {
  return resolvePlaneConfigInspection({
    appId: NETWORK_APP_ID,
    env: io.env,
    data: asString(options.store),
    ai: asString(options.ai),
    localDbPath: asString(options["local-db"])
  });
}
function isLocalDataRoute(options, io) {
  return resolveNetworkPlaneConfig(options, io).data === "local";
}
function hostedNetworkBoundary() {
  return HOSTED_BOUNDARY;
}
function localWorkspace(options, io) {
  const workspaceId = trimOption(asString(options.workspace)) ?? trimOption(io.env.MERE_NETWORK_WORKSPACE_ID) ?? trimOption(io.env.VOXBOOTH_WORKSPACE_ID) ?? trimOption(io.env.MERE_WORKSPACE_ID) ?? trimOption(io.env.MERE_WORKSPACE) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Network Archive" : workspaceId
  };
}
function projectionActor(options, io) {
  return {
    publishedByUserId: trimOption(asString(options["published-by-user-id"])) ?? trimOption(io.env.MERE_NETWORK_USER_ID) ?? trimOption(io.env.VOXBOOTH_USER_ID) ?? trimOption(io.env.USER) ?? "local-user",
    publishedByEmail: trimOption(asString(options["published-by-email"])) ?? trimOption(io.env.MERE_NETWORK_USER_EMAIL) ?? trimOption(io.env.VOXBOOTH_USER_EMAIL) ?? trimOption(io.env.EMAIL) ?? null
  };
}
async function openLocalStore(options, io) {
  const config = resolveNetworkPlaneConfig(options, io);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so mere.network local data stays explicit.");
  }
  return LocalNetworkStore.open({
    config,
    workspace: localWorkspace(options, io)
  });
}
async function withLocalStore(options, io, handler) {
  const store = await openLocalStore(options, io);
  try {
    return await handler(store);
  } finally {
    store.close();
  }
}
function readRequired(options, key) {
  const value = trimOption(asString(options[key]));
  if (!value) throw new Error(`Missing required --${key}.`);
  return value;
}
async function readJsonData(options) {
  const file = trimOption(asString(options["data-file"])) ?? trimOption(asString(options["json-file"]));
  const inline = asString(options.data) ?? asString(options["json-input"]);
  if (file && inline !== void 0) {
    throw new Error("Use only one of --data/--json-input or --data-file/--json-file.");
  }
  const raw = file ? await readFile2(file, "utf8") : inline ?? "{}";
  return readObject(parseJsonText(raw, file ? `--data-file ${file}` : "--data"), file ? "--data-file" : "--data");
}
function archiveCounts(payload) {
  return Object.fromEntries(
    [
      ["customers", "customerCount"],
      ["deployments", "deploymentCount"],
      ["locations", "locationCount"],
      ["scripts", "scriptCount"],
      ["scriptStages", "scriptStageCount"],
      ["numbers", "numberCount"],
      ["providerAccounts", "providerAccountCount"],
      ["routingPolicies", "routingPolicyCount"],
      ["calls", "callCount"],
      ["callTurns", "callTurnCount"],
      ["interactions", "interactionCount"],
      ["messages", "messageCount"],
      ["recordings", "recordingCount"],
      ["transcripts", "transcriptCount"]
    ].map(([key, label]) => [label, Array.isArray(payload[key]) ? payload[key].length : 0])
  );
}
async function handleLocalStoreInfo(options, io) {
  const config = resolveNetworkPlaneConfig(options, io);
  if (config.data === "local") {
    return withLocalStore(options, io, (store) => ({
      ok: true,
      app: NETWORK_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      ...store.info(),
      projectionPublisherLocal: true,
      localAiSupported: false,
      sources: config.sources
    }));
  }
  if (asBoolean(options.json)) {
    return {
      ok: true,
      app: NETWORK_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localArchive: "available",
      realtimeVoiceLocal: false,
      sttLocal: false,
      llmLocal: false,
      ttsLocal: false,
      telephonyLocal: false,
      recordingBytesLocal: false,
      bridgeDeliveryLocal: false,
      projectionPublisherLocal: true,
      localAiSupported: false,
      sources: config.sources
    };
  }
  io.stdout(
    formatPlaneConfigReport({
      kind: "mere.local-plane.config",
      configs: [config]
    })
  );
  io.stdout(
    `Network archives can be stored locally with --store local. Calls, turns, interactions, scripts, locations, routing metadata, and recording references are portable. ${HOSTED_BOUNDARY}
`
  );
  return "";
}
async function handleLocalExport(options, io) {
  return withLocalStore(options, io, async (store) => {
    const bundle = store.exportBundle();
    const output = trimOption(asString(options.output));
    if (!output) return bundle;
    const target = resolvePath(output);
    await mkdir3(dirname(target), { recursive: true });
    await writeFile2(target, JSON.stringify(bundle, null, 2));
    return {
      ok: true,
      path: target,
      appId: bundle.appId,
      workspaceId: bundle.workspaceId,
      payloadSchema: bundle.payloadSchema,
      payloadSha256: bundle.payloadSha256,
      ...archiveCounts(bundle.payload)
    };
  });
}
async function handleLocalImport(options, io) {
  return withLocalStore(options, io, async (store) => {
    const value = parseJsonText(await readFile2(readRequired(options, "file"), "utf8"), "local network archive transfer bundle");
    return asBoolean(options["dry-run"]) ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalRecordGroup(type, action, args, options, io) {
  return withLocalStore(options, io, async (store) => {
    const normalizedAction = action ?? "list";
    if (normalizedAction === "list") return { ok: true, records: store.listRecords(type, args[0]) };
    if (normalizedAction === "get" || normalizedAction === "show") {
      const id = args[0];
      if (!id) throw new Error(`${type} ${normalizedAction} requires <id>.`);
      return { ok: true, record: store.getRecord(type, id) };
    }
    if (normalizedAction === "upsert") return store.upsertRecord(type, await readJsonData(options));
    if (type === "calls" && (normalizedAction === "publish" || normalizedAction === "revoke")) {
      const callId = trimOption(args[0]);
      if (!callId) throw new Error(`calls ${normalizedAction} requires <call-id>.`);
      const envelope = store.buildCallProjectionEnvelope({
        action: normalizedAction,
        callId,
        ...projectionActor(options, io)
      });
      if (asBoolean(options["dry-run"])) {
        let receiverUrl;
        try {
          receiverUrl = resolveCloudProjectionTarget({
            appId: NETWORK_APP_ID,
            env: io.env,
            receiverUrl: trimOption(asString(options["projection-url"])),
            bearerToken: trimOption(asString(options["projection-token"]))
          }).receiverUrl;
        } catch {
          receiverUrl = void 0;
        }
        return {
          ok: true,
          dryRun: true,
          store: "local",
          projection: "cloudflare",
          action: normalizedAction,
          projectionId: envelope.event.projection.id,
          receiverUrl,
          event: envelope
        };
      }
      const delivery = await deliverCloudProjectionEvent({
        appId: NETWORK_APP_ID,
        env: io.env,
        receiverUrl: trimOption(asString(options["projection-url"])),
        bearerToken: trimOption(asString(options["projection-token"])),
        event: envelope,
        fetchImpl: async (input, init) => (io.fetchImpl ?? fetch)(input, init)
      });
      store.recordCallProjection(envelope);
      return {
        ok: true,
        store: "local",
        projection: "cloudflare",
        action: normalizedAction,
        projectionId: envelope.event.projection.id,
        receiverUrl: delivery.receiverUrl,
        status: delivery.status,
        receiver: delivery.responseJson,
        summary: envelope.event.summary
      };
    }
    throw new Error(`--store local supports ${type} list/get/show/upsert${type === "calls" ? "/publish/revoke" : ""} only. ${HOSTED_BOUNDARY}`);
  });
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
  --store local|cloud  Choose supported local/cloud data-plane commands
  --ai local|cloud     Choose AI plane for local-plane inspection
  --local-db PATH      Override the shared Mere local-plane SQLite path
  --token TOKEN        Override MERE_NETWORK_TOKEN
  --projection-url URL Cloudflare Business projection receiver for local publish/revoke
  --projection-token TOKEN Cloudflare Business projection bearer token
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
  store info
  export --output ./network.bundle.json
  import --file ./network.bundle.json [--dry-run]

Workspace groups:
  calls list|show|sync|archive|close|analysis|export|audio
  interactions list|show|sync|close|read
  sms list|show|sync|close|read
  conversations list|show|close|read
  recordings audio <call-id>
  transcripts turns|export <call-id>
  elevenlabs backfill
  diagnostics metrics|delivery-log|provider-sync
  locations list|create|update|delete
  locations pool list|add|update|remove <location-id>
  scripts list|create|show|update|delete
  scripts stages list|create|update|reorder|delete <script-id>
  numbers list|search|show|create|update|delete|pause|resume|route
  routing default-location|number
  provider-accounts list|create|update|delete|sync

Local archive:
  --store local supports customers/deployments/locations/scripts/stages/
  numbers/provider-accounts/routing/calls/turns/interactions/messages/
  recordings/transcripts list|get|show|upsert, calls publish/revoke, plus store info, export, and
  import. Realtime voice Durable Objects, STT, LLM, TTS, LiveKit, Twilio,
  provider effects, recording bytes, deployment runs, bridge delivery, and
  Business projection receiving remain hosted.

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
  store: "string",
  ai: "string",
  "local-db": "string",
  token: "string",
  "projection-url": "string",
  "projection-token": "string",
  "published-by-user-id": "string",
  "published-by-email": "string",
  json: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string",
  output: "string",
  file: "string",
  "dry-run": "boolean",
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
  "elevenlabs",
  "export",
  "import",
  "interactions",
  "locations",
  "numbers",
  "provider-accounts",
  "recordings",
  "routing",
  "scripts",
  "sms",
  "store",
  "transcripts",
  "workspace"
];
var JSON_INPUT_FLAG_SPEC = {
  "json-file": "string",
  "json-input": "string",
  data: "string",
  "data-file": "string"
};
function manifestCommand(path4, summary, options = {}) {
  return {
    id: path4.join("."),
    path: path4,
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
    app: "mere-network",
    namespace: "network",
    aliases: ["mere-network", "voxbooth"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_NETWORK_BASE_URL"],
    sessionPath: "~/.local/state/mere-network/session.json",
    globalFlags: [
      "base-url",
      "workspace",
      "store",
      "ai",
      "local-db",
      "json",
      "yes",
      "confirm",
      "projection-url",
      "projection-token"
    ],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["store", "info"], "Inspect local/cloud data and AI plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export local network archive records as a portable transfer bundle.", { risk: "read", flags: ["output"] }),
      manifestCommand(["import"], "Import a local network archive transfer bundle.", { risk: "write", flags: ["file", "dry-run"] }),
      manifestCommand(["customers", "list"], "List customers.", { auditDefault: true }),
      manifestCommand(["customers", "upsert"], "Upsert a local customer archive record.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["customers", "create"], "Create customer.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["customers", "update"], "Update customer.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["customers", "archive"], "Archive customer.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["customers", "redeploy"], "Redeploy customer.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["customers", "redeploy-all"], "Redeploy customers.", { risk: "external", requiresYes: true, requiresConfirm: true, flags: ["scope"] }),
      manifestCommand(["deployments", "run"], "Run deployment.", { risk: "external", requiresYes: true, flags: ["customer"] }),
      ...["calls", "interactions", "sms", "conversations"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource}.`, {
          auditDefault: resource === "calls",
          flags: resource === "calls" || resource === "interactions" || resource === "sms" || resource === "conversations" ? ["query"] : []
        }),
        manifestCommand([resource, "show"], `Show ${resource}.`),
        ...resource === "calls" ? [
          manifestCommand([resource, "publish"], "Publish selected local call summary to Business.", {
            risk: "external",
            flags: ["published-by-user-id", "published-by-email", "dry-run"]
          }),
          manifestCommand([resource, "revoke"], "Revoke selected local call summary from Business.", {
            risk: "external",
            flags: ["published-by-user-id", "published-by-email", "dry-run"]
          })
        ] : [],
        manifestCommand([resource, "close"], `Close ${resource}.`, { risk: "write" }),
        manifestCommand([resource, "archive"], `Archive ${resource}.`, {
          risk: "destructive",
          requiresYes: true,
          requiresConfirm: true,
          ...resource === "calls" ? { supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] } : {}
        })
      ]),
      manifestCommand(["calls", "sync"], "Sync calls.", { flags: ["query"] }),
      manifestCommand(["calls", "analysis"], "Run call analysis.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["calls", "export"], "Export call data."),
      manifestCommand(["calls", "audio"], "Download call audio."),
      manifestCommand(["interactions", "sync"], "Sync interactions.", { flags: ["query"] }),
      manifestCommand(["interactions", "read"], "Mark interaction read.", { risk: "write" }),
      manifestCommand(["sms", "sync"], "Sync SMS interactions.", { flags: ["query"] }),
      manifestCommand(["sms", "read"], "Mark SMS interaction read.", { risk: "write" }),
      manifestCommand(["conversations", "read"], "Mark conversation read.", { risk: "write" }),
      manifestCommand(["recordings", "audio"], "Download call audio."),
      manifestCommand(["transcripts", "turns"], "List transcript turns."),
      manifestCommand(["transcripts", "export"], "Export transcript."),
      manifestCommand(["elevenlabs", "backfill"], "Backfill missed ElevenLabs transcripts and summaries.", {
        risk: "external",
        supportsData: true,
        requiresYes: true,
        requiresConfirm: true,
        flags: ["data", "data-file", "json-file", "json-input"]
      }),
      manifestCommand(["diagnostics", "metrics"], "Show diagnostics metrics.", { auditDefault: true }),
      manifestCommand(["diagnostics", "delivery-log"], "Show delivery log."),
      manifestCommand(["diagnostics", "provider-sync"], "Show provider sync diagnostics."),
      ...["locations", "scripts", "numbers", "provider-accounts"].flatMap((resource) => [
        manifestCommand([resource, "list"], `List ${resource}.`),
        manifestCommand([resource, "show"], resource === "scripts" ? "Show script with its stages." : `Show ${resource}.`),
        manifestCommand(
          [resource, "create"],
          resource === "scripts" ? "Create script. Add phases with `scripts stages create <script-id>`." : `Create ${resource}.`,
          { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }
        ),
        manifestCommand([resource, "update"], `Update ${resource}.`, { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
        manifestCommand([resource, "delete"], `Delete ${resource}.`, { risk: "destructive", requiresYes: true, requiresConfirm: true })
      ]),
      manifestCommand(["numbers", "search"], "Search numbers.", { flags: ["query"] }),
      manifestCommand(["locations", "pool", "list"], "List scripts in a location pool."),
      manifestCommand(["locations", "pool", "add"], "Add or update a script in a location pool.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["locations", "pool", "update"], "Update a script pool entry.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["locations", "pool", "remove"], "Remove a script from a location pool.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        supportsData: true,
        flags: ["data", "data-file", "json-file", "json-input"]
      }),
      manifestCommand(["scripts", "stages", "list"], "List stages for a script."),
      manifestCommand(["scripts", "stages", "create"], "Add a stage to a script.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["scripts", "stages", "update"], "Update a stage on a script.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["scripts", "stages", "reorder"], "Reorder stages on a script.", { risk: "write", supportsData: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["scripts", "stages", "delete"], "Delete a stage from a script.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        supportsData: true,
        flags: ["data", "data-file", "json-file", "json-input"]
      }),
      manifestCommand(["numbers", "pause"], "Pause number.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["numbers", "resume"], "Resume number.", { risk: "external", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["numbers", "route"], "Route number.", { risk: "external", supportsData: true, requiresYes: true, requiresConfirm: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["routing", "default-location"], "Set default location.", { risk: "external", supportsData: true, requiresYes: true, requiresConfirm: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["routing", "number"], "Set number route.", { risk: "external", supportsData: true, requiresYes: true, requiresConfirm: true, flags: ["data", "data-file", "json-file", "json-input"] }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
var GUARD_FLAG_SPEC = {
  yes: "boolean",
  confirm: "string"
};
function asString2(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean2(value) {
  return value === true;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function trimOption2(value) {
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
  return trimOption2(asString2(options.workspace)) ?? trimOption2(env.MERE_NETWORK_WORKSPACE_ID) ?? activeSession?.defaultWorkspaceId ?? activeSession?.workspace?.id ?? void 0;
}
function requireWorkspace(options, env) {
  const workspace = resolveWorkspaceOptional(options, env);
  if (!workspace) {
    throw new Error("Missing workspace ID. Set MERE_NETWORK_WORKSPACE_ID or pass --workspace.");
  }
  return workspace;
}
function resolveBaseUrl(options, env) {
  return trimOption2(asString2(options["base-url"])) ?? trimOption2(env.MERE_NETWORK_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveToken(options, env) {
  return trimOption2(asString2(options.token)) ?? trimOption2(env.MERE_NETWORK_TOKEN) ?? activeSession?.accessToken;
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
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
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
  const inline = trimOption2(asString2(options["json-input"])) ?? trimOption2(asString2(options.data));
  if (inline) {
    return JSON.parse(inline);
  }
  const file = trimOption2(asString2(options["json-file"])) ?? trimOption2(asString2(options["data-file"]));
  if (!file) {
    throw new Error("Provide --json-file, --json-input, --data-file, or --data.");
  }
  const raw = await readFile3(resolvePath2(file), "utf8");
  return JSON.parse(raw);
}
function hasJsonInput(options) {
  return Boolean(
    trimOption2(asString2(options["json-input"])) ?? trimOption2(asString2(options.data)) ?? trimOption2(asString2(options["json-file"])) ?? trimOption2(asString2(options["data-file"]))
  );
}
function requireDestructiveConfirmation(globalOptions, options, label, target) {
  if (!asBoolean2(options.yes) && !asBoolean2(globalOptions.yes)) {
    throw new Error(`Refusing to ${label} ${target} without --yes.`);
  }
  const confirm = trimOption2(asString2(options.confirm)) ?? trimOption2(asString2(globalOptions.confirm));
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
      return asBoolean2(globalOptions.json) ? session.workspaces : session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available.";
    case "current": {
      if (positionals.length > 0) {
        throw new Error("workspace current does not accept positional arguments.");
      }
      const result = {
        current: session.workspace,
        defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
      };
      return asBoolean2(globalOptions.json) ? result : [
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
      return asBoolean2(globalOptions.json) ? nextSession : renderSessionSummary(nextSession);
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
          scope: trimOption2(asString2(options.scope)) ?? "all"
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
  const customerId = trimOption2(asString2(options.customer));
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
async function handleElevenLabs(io, globalOptions, action, args) {
  const { options, positionals } = parseFlags(args, {
    ...JSON_INPUT_FLAG_SPEC,
    ...GUARD_FLAG_SPEC
  });
  if (action !== "backfill") {
    throw new Error("Unknown elevenlabs command. Expected backfill.");
  }
  if (positionals.length > 0) {
    throw new Error("elevenlabs backfill does not accept positional arguments.");
  }
  const workspaceId = requireWorkspace(globalOptions, io.env);
  const body = hasJsonInput(options) ? await readJsonInput(options) : {};
  const dryRun = body && typeof body === "object" && !Array.isArray(body) ? body.dry_run === true : false;
  if (!dryRun) {
    requireDestructiveConfirmation(
      globalOptions,
      options,
      "backfill ElevenLabs transcripts",
      "elevenlabs-backfill"
    );
  }
  return request(io, globalOptions, {
    method: "POST",
    path: `${workspaceBasePath(workspaceId)}/elevenlabs/backfill`,
    body
  });
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
var LOCAL_FLAG_SPEC = {
  ...JSON_INPUT_FLAG_SPEC,
  customer: "string",
  output: "string",
  file: "string",
  "projection-url": "string",
  "projection-token": "string",
  "published-by-user-id": "string",
  "published-by-email": "string",
  "dry-run": "boolean"
};
function localPlaneIo(io) {
  return {
    env: io.env,
    fetchImpl: io.fetchImpl,
    stdout: (text) => io.stdout(text)
  };
}
function writeLocalResult(io, globalOptions, result) {
  if (result === "" || result === void 0) return;
  if (asBoolean2(globalOptions.json)) {
    writeJson(io, result);
    return;
  }
  if (typeof result === "string") {
    writeText(io, result);
    return;
  }
  writeJson(io, result);
}
function localRecordType(group) {
  switch (group) {
    case "customer":
    case "customers":
      return "customers";
    case "deployment":
    case "deployments":
      return "deployments";
    case "location":
    case "locations":
      return "locations";
    case "script":
    case "scripts":
      return "scripts";
    case "stage":
    case "stages":
    case "script-stage":
    case "script-stages":
      return "scriptStages";
    case "number":
    case "numbers":
      return "numbers";
    case "provider-account":
    case "provider-accounts":
      return "providerAccounts";
    case "routing":
    case "routing-policy":
    case "routing-policies":
      return "routingPolicies";
    case "call":
    case "calls":
      return "calls";
    case "turn":
    case "turns":
    case "call-turn":
    case "call-turns":
      return "callTurns";
    case "interaction":
    case "interactions":
    case "conversation":
    case "conversations":
    case "sms":
      return "interactions";
    case "message":
    case "messages":
      return "messages";
    case "recording":
    case "recordings":
      return "recordings";
    case "transcript":
    case "transcripts":
      return "transcripts";
    default:
      return null;
  }
}
async function handleLocalDataCommand(rest, globalOptions, io) {
  const group = rest[0];
  const action = rest[1]?.startsWith("--") ? void 0 : rest[1];
  const rawArgs = rest.slice(action ? 2 : 1);
  const localIo = localPlaneIo(io);
  const localData = isLocalDataRoute(globalOptions, localIo);
  let result;
  if (group === "store") {
    const parsed = parseFlags(rawArgs, LOCAL_FLAG_SPEC);
    const options = { ...globalOptions, ...parsed.options };
    if (action !== "info") throw new Error("Unknown store command: expected info.");
    result = await handleLocalStoreInfo(options, localIo);
  } else if (group === "export") {
    const parsed = parseFlags(rawArgs, LOCAL_FLAG_SPEC);
    const options = { ...globalOptions, ...parsed.options };
    result = await handleLocalExport(options, localIo);
  } else if (group === "import") {
    const parsed = parseFlags(rawArgs, LOCAL_FLAG_SPEC);
    const options = { ...globalOptions, ...parsed.options };
    result = await handleLocalImport(options, localIo);
  } else if (localData) {
    const parsed = parseFlags(rawArgs, LOCAL_FLAG_SPEC);
    const options = { ...globalOptions, ...parsed.options };
    if (group === "scripts" && action === "stages") {
      result = await handleLocalRecordGroup("scriptStages", parsed.positionals[0], parsed.positionals.slice(1), options, localIo);
    } else {
      const type = localRecordType(group);
      if (!type) {
        throw new Error(
          `--store local is not supported for ${group ?? "(missing)"}. Supported local commands are store info, customers, deployments, locations, scripts, stages, numbers, provider-accounts, routing, calls list/get/show/upsert/publish/revoke, turns, interactions, messages, recordings, transcripts, export, and import. ${hostedNetworkBoundary()}`
        );
      }
      result = await handleLocalRecordGroup(type, action ?? "list", parsed.positionals, options, localIo);
    }
  } else {
    return false;
  }
  writeLocalResult(io, globalOptions, result);
  return true;
}
async function runCli(argv, io) {
  try {
    if (argv.length === 1 && (argv[0] === "-v" || argv[0] === "version")) {
      writeText(io, await cliVersion());
      return 0;
    }
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    const [group, action, ...args] = rest;
    if (asBoolean2(globalOptions.version)) {
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
    if (asBoolean2(globalOptions.help) || rest.length === 0 || rest[0] === "help") {
      writeText(io, HELP_TEXT);
      return 0;
    }
    if (await handleLocalDataCommand(rest, globalOptions, io)) return 0;
    activeSession = await loadSession(io.env);
    const isWorkspaceMetadataCommand = group === "workspace" && ["list", "current", "use"].includes(action ?? "");
    if (group !== "auth" && !isWorkspaceMetadataCommand && activeSession && !trimOption2(asString2(globalOptions.token)) && !trimOption2(io.env.MERE_NETWORK_TOKEN)) {
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
      case "elevenlabs":
        result = await handleElevenLabs(io, globalOptions, action, args);
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
      if (asBoolean2(globalOptions.json)) {
        writeJson(io, result);
      } else {
        writeText(io, renderSessionSummary(result));
      }
      return 0;
    }
    if (group === "auth" && action === "logout" && !asBoolean2(globalOptions.json)) {
      writeText(io, result.loggedOut ? "Logged out." : "No local session found.");
      return 0;
    }
    if (asBoolean2(globalOptions.json) || typeof result !== "string") {
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
