#!/usr/bin/env node

// cli/mere-im.ts
import { mkdir as mkdir3, readFile as readFile2, writeFile as writeFile2 } from "fs/promises";
import { dirname, resolve } from "path";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.69.1_@sveltejs+vite-p_b69e0278aad5418e80ddd2c3260fb2fd/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "child_process";
import { createServer } from "http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.69.1_@sveltejs+vite-p_b69e0278aad5418e80ddd2c3260fb2fd/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.69.1_@sveltejs+vite-p_b69e0278aad5418e80ddd2c3260fb2fd/node_modules/@mere/cli-auth/src/session.ts
import { chmod, mkdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.69.1_@sveltejs+vite-p_b69e0278aad5418e80ddd2c3260fb2fd/node_modules/@mere/cli-auth/src/client.ts
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

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
import os2 from "os";
import path2 from "path";
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

// cli/local-store.ts
import { createHash as createHash3, randomUUID as randomUUID3 } from "crypto";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { createHash as createHash2, randomUUID as randomUUID2 } from "crypto";
import { mkdir as mkdir2 } from "fs/promises";
import os3 from "os";
import path3 from "path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/migration.ts
import { createHash, randomUUID } from "crypto";
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
var IM_APP_ID = "mere-im";
var IM_ARCHIVE_PAYLOAD_SCHEMA = "mere.im.encrypted-archive.v1";
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function makeId(prefix) {
  return `${prefix}_${randomUUID3().replaceAll("-", "").slice(0, 16)}`;
}
function stableConversationProjectionId(workspaceId, conversationId) {
  const digest = createHash3("sha256").update(IM_APP_ID).update("\0").update(workspaceId).update("\0").update(conversationId).digest("hex").slice(0, 24);
  return `impr_${digest}`;
}
function isRecord2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function jsonText(value) {
  return JSON.stringify(value ?? null);
}
function parseJson2(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function readString2(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required for local IM records.`);
  }
  return raw.trim();
}
function readOptionalString(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
function readNumber(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function readOptionalNumber(value, fallback) {
  if (value === void 0) return fallback ?? null;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback ?? null;
}
function readBoolean(value, fallback) {
  if (value === void 0) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1" || value === "yes";
  return fallback;
}
function readRecord(value, fallback) {
  return isRecord2(value) ? value : fallback;
}
function readRequiredRecord(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (!isRecord2(raw)) {
    throw new Error(`${label} is required for local IM records.`);
  }
  return raw;
}
function readRecordOrNull(value, fallback) {
  if (value === void 0) return fallback ?? null;
  if (value === null) return null;
  return isRecord2(value) ? value : fallback ?? null;
}
function readRecordArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  return value.filter(isRecord2);
}
function readStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
}
function readKind(value, fallback) {
  return value === "direct" || value === "group" ? value : fallback;
}
function readMessageKind(value, fallback) {
  return value === "ciphertext" || value === "share_card" || value === "system" ? value : fallback;
}
function readDeviceKind(value, fallback) {
  return value === "browser" || value === "desktop" || value === "mobile" ? value : fallback;
}
function participantRecords(input, existing) {
  if (Array.isArray(input.participants)) {
    return input.participants.filter(isRecord2);
  }
  const participantUserIds = readStringArray(input.participantUserIds);
  if (participantUserIds.length > 0) {
    const now = isoNow3();
    return participantUserIds.map((userId) => ({
      userId,
      role: "member",
      joinedAt: now,
      lastReadAt: null
    }));
  }
  return existing?.participants ?? [];
}
function rowToConversation(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    title: row.title,
    participants: parseJson2(row.participants_json, []),
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
    disappearingSeconds: row.disappearing_seconds,
    archivedAt: row.archived_at,
    extra: parseJson2(row.extra_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToMessage(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    senderDeviceId: row.sender_device_id,
    clientMessageId: row.client_message_id,
    kind: row.kind,
    ciphertext: parseJson2(row.ciphertext_json, null),
    shareCard: parseJson2(row.share_card_json, null),
    attachmentIds: parseJson2(row.attachment_ids_json, []),
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}
function rowToAttachment(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerUserId: row.owner_user_id,
    objectKey: row.object_key,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    encryptedMetadata: row.encrypted_metadata,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at
  };
}
function rowToDevice(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    label: row.label,
    kind: row.kind,
    protocolDeviceId: Number(row.protocol_device_id ?? 1),
    registrationId: Number(row.registration_id ?? 0),
    identityKey: row.identity_key,
    signedPreKey: parseJson2(row.signed_prekey_json, {}),
    kyberPreKey: parseJson2(row.kyber_prekey_json, {}),
    oneTimePreKeys: parseJson2(row.one_time_prekeys_json, []),
    isPrimary: row.is_primary === 1,
    linkedFromDeviceId: row.linked_from_device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function normalizeConversation(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? readOptionalString(input.id, readOptionalString(input.conversationId)) ?? makeId("conv"),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    kind: readKind(input.kind, existing?.kind ?? "group"),
    title: readOptionalString(input.title, existing?.title),
    participants: participantRecords(input, existing),
    linkedEntityType: readOptionalString(input.linkedEntityType, existing?.linkedEntityType),
    linkedEntityId: readOptionalString(input.linkedEntityId, existing?.linkedEntityId),
    disappearingSeconds: readOptionalNumber(input.disappearingSeconds, existing?.disappearingSeconds),
    archivedAt: readOptionalString(input.archivedAt, existing?.archivedAt),
    extra: readRecord(input.extra, existing?.extra ?? {}),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeMessage(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? readOptionalString(input.id, readOptionalString(input.messageId, readOptionalString(input.clientMessageId))) ?? makeId("msg"),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    conversationId: readString2(input.conversationId, "conversationId", existing?.conversationId),
    senderUserId: readString2(input.senderUserId ?? input.actorUserId, "senderUserId", existing?.senderUserId ?? "local-user"),
    senderDeviceId: readOptionalString(input.senderDeviceId, existing?.senderDeviceId),
    clientMessageId: readOptionalString(input.clientMessageId, existing?.clientMessageId),
    kind: readMessageKind(input.kind, existing?.kind ?? (input.shareCard ? "share_card" : "ciphertext")),
    ciphertext: readRecordOrNull(input.ciphertext, existing?.ciphertext),
    shareCard: readRecordOrNull(input.shareCard, existing?.shareCard),
    attachmentIds: readStringArray(input.attachmentIds, existing?.attachmentIds ?? []),
    expiresAt: readOptionalString(input.expiresAt, existing?.expiresAt),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now
  };
}
function normalizeAttachment(input, existing) {
  const now = isoNow3();
  const id = existing?.id ?? readOptionalString(input.id, readOptionalString(input.attachmentId)) ?? makeId("att");
  return {
    id,
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    ownerUserId: readString2(input.ownerUserId ?? input.actorUserId, "ownerUserId", existing?.ownerUserId ?? "local-user"),
    objectKey: readString2(input.objectKey, "objectKey", existing?.objectKey ?? `local/${id}`),
    contentType: readString2(input.contentType, "contentType", existing?.contentType ?? "application/octet-stream"),
    sizeBytes: readNumber(input.sizeBytes, existing?.sizeBytes ?? 0),
    encryptedMetadata: readOptionalString(input.encryptedMetadata, existing?.encryptedMetadata),
    uploadedAt: readOptionalString(input.uploadedAt, existing?.uploadedAt),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now
  };
}
function normalizeDevice(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? readOptionalString(input.id, readOptionalString(input.deviceId)) ?? makeId("dev"),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    userId: readString2(input.userId ?? input.actorUserId, "userId", existing?.userId ?? "local-user"),
    label: readString2(input.label, "label", existing?.label ?? "Local device"),
    kind: readDeviceKind(input.kind, existing?.kind ?? "browser"),
    protocolDeviceId: readNumber(input.protocolDeviceId, existing?.protocolDeviceId ?? 1),
    registrationId: readNumber(input.registrationId, existing?.registrationId ?? 0),
    identityKey: readString2(input.identityKey, "identityKey", existing?.identityKey),
    signedPreKey: readRequiredRecord(input.signedPreKey, "signedPreKey", existing?.signedPreKey),
    kyberPreKey: readRequiredRecord(input.kyberPreKey, "kyberPreKey", existing?.kyberPreKey),
    oneTimePreKeys: readRecordArray(input.oneTimePreKeys, existing?.oneTimePreKeys ?? []),
    isPrimary: readBoolean(input.isPrimary, existing?.isPrimary ?? false),
    linkedFromDeviceId: readOptionalString(input.linkedFromDeviceId, existing?.linkedFromDeviceId),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeTransferPayload(value) {
  if (!isRecord2(value) || value.kind !== IM_ARCHIVE_PAYLOAD_SCHEMA || value.version !== 1) {
    throw new Error(`IM transfer payload must be ${IM_ARCHIVE_PAYLOAD_SCHEMA} version 1.`);
  }
  return {
    kind: IM_ARCHIVE_PAYLOAD_SCHEMA,
    version: 1,
    conversations: Array.isArray(value.conversations) ? value.conversations.map((entry) => normalizeConversation(isRecord2(entry) ? entry : {})) : [],
    messages: Array.isArray(value.messages) ? value.messages.map((entry) => normalizeMessage(isRecord2(entry) ? entry : {})) : [],
    attachments: Array.isArray(value.attachments) ? value.attachments.map((entry) => normalizeAttachment(isRecord2(entry) ? entry : {})) : [],
    devices: Array.isArray(value.devices) ? value.devices.map((entry) => normalizeDevice(isRecord2(entry) ? entry : {})) : []
  };
}
var LocalImStore = class _LocalImStore {
  constructor(dbPath, db, config, workspace) {
    this.dbPath = dbPath;
    this.db = db;
    this.config = config;
    this.workspace = workspace;
  }
  static async open(input) {
    const opened = await openLocalPlaneDatabase(input.config);
    registerPlaneApp(opened.db, IM_APP_ID, "Mere IM");
    registerPlaneTransferSchema(opened.db, IM_APP_ID, {
      payloadSchema: IM_ARCHIVE_PAYLOAD_SCHEMA,
      displayName: "IM encrypted archive transfer",
      description: "Portable Mere IM encrypted message envelopes, attachment metadata, and device key bundles."
    });
    upsertPlaneWorkspace(opened.db, IM_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalImStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS im_local_conversations (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT,
        participants_json TEXT NOT NULL,
        linked_entity_type TEXT,
        linked_entity_id TEXT,
        disappearing_seconds INTEGER,
        archived_at TEXT,
        extra_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE IF NOT EXISTS im_local_messages (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        sender_user_id TEXT NOT NULL,
        sender_device_id TEXT,
        client_message_id TEXT,
        kind TEXT NOT NULL,
        ciphertext_json TEXT,
        share_card_json TEXT,
        attachment_ids_json TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_im_local_messages_conversation
        ON im_local_messages (workspace_id, conversation_id, created_at);

      CREATE TABLE IF NOT EXISTS im_local_attachments (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        object_key TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        encrypted_metadata TEXT,
        uploaded_at TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE IF NOT EXISTS im_local_devices (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        kind TEXT NOT NULL,
        protocol_device_id INTEGER NOT NULL DEFAULT 1,
        registration_id INTEGER NOT NULL DEFAULT 0,
        identity_key TEXT NOT NULL,
        signed_prekey_json TEXT NOT NULL,
        kyber_prekey_json TEXT NOT NULL,
        one_time_prekeys_json TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        linked_from_device_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE IF NOT EXISTS im_local_projections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_im_local_projections_conversation
        ON im_local_projections (workspace_id, conversation_id, updated_at DESC);
    `);
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: IM_APP_ID });
    const count = (table) => Number(
      this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ?`).get(this.workspace.workspaceId)?.count ?? 0
    );
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      conversationCount: count("im_local_conversations"),
      messageCount: count("im_local_messages"),
      attachmentCount: count("im_local_attachments"),
      deviceCount: count("im_local_devices"),
      projectionCount: count("im_local_projections"),
      localMessageStore: "enabled",
      localMessagePersistenceSupported: true,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listConversations() {
    const rows = this.db.prepare("SELECT * FROM im_local_conversations WHERE workspace_id = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId);
    return rows.map(rowToConversation);
  }
  getConversation(conversationId) {
    const row = this.db.prepare("SELECT * FROM im_local_conversations WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, conversationId);
    return row ? rowToConversation(row) : null;
  }
  upsertConversation(input) {
    const existingId = readOptionalString(input.id, readOptionalString(input.conversationId));
    const conversation = {
      ...normalizeConversation(input, existingId ? this.getConversation(existingId) ?? void 0 : void 0),
      workspaceId: this.workspace.workspaceId
    };
    this.db.prepare(
      `INSERT INTO im_local_conversations (
          id, workspace_id, kind, title, participants_json, linked_entity_type, linked_entity_id,
          disappearing_seconds, archived_at, extra_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          kind = excluded.kind,
          title = excluded.title,
          participants_json = excluded.participants_json,
          linked_entity_type = excluded.linked_entity_type,
          linked_entity_id = excluded.linked_entity_id,
          disappearing_seconds = excluded.disappearing_seconds,
          archived_at = excluded.archived_at,
          extra_json = excluded.extra_json,
          updated_at = excluded.updated_at`
    ).run(
      conversation.id,
      conversation.workspaceId,
      conversation.kind,
      conversation.title,
      jsonText(conversation.participants),
      conversation.linkedEntityType,
      conversation.linkedEntityId,
      conversation.disappearingSeconds,
      conversation.archivedAt,
      jsonText(conversation.extra),
      conversation.createdAt,
      conversation.updatedAt
    );
    return conversation;
  }
  listMessages(conversationId) {
    const params = [this.workspace.workspaceId];
    const clause = conversationId ? "workspace_id = ? AND conversation_id = ?" : "workspace_id = ?";
    if (conversationId) params.push(conversationId);
    const rows = this.db.prepare(`SELECT * FROM im_local_messages WHERE ${clause} ORDER BY created_at ASC`).all(...params);
    return rows.map(rowToMessage);
  }
  getMessage(messageId) {
    const row = this.db.prepare("SELECT * FROM im_local_messages WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, messageId);
    return row ? rowToMessage(row) : null;
  }
  upsertMessage(input) {
    const existingId = readOptionalString(input.id, readOptionalString(input.messageId));
    const message = {
      ...normalizeMessage(input, existingId ? this.getMessage(existingId) ?? void 0 : void 0),
      workspaceId: this.workspace.workspaceId
    };
    this.db.prepare(
      `INSERT INTO im_local_messages (
          id, workspace_id, conversation_id, sender_user_id, sender_device_id, client_message_id,
          kind, ciphertext_json, share_card_json, attachment_ids_json, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          conversation_id = excluded.conversation_id,
          sender_user_id = excluded.sender_user_id,
          sender_device_id = excluded.sender_device_id,
          client_message_id = excluded.client_message_id,
          kind = excluded.kind,
          ciphertext_json = excluded.ciphertext_json,
          share_card_json = excluded.share_card_json,
          attachment_ids_json = excluded.attachment_ids_json,
          expires_at = excluded.expires_at,
          created_at = excluded.created_at`
    ).run(
      message.id,
      message.workspaceId,
      message.conversationId,
      message.senderUserId,
      message.senderDeviceId,
      message.clientMessageId,
      message.kind,
      message.ciphertext ? jsonText(message.ciphertext) : null,
      message.shareCard ? jsonText(message.shareCard) : null,
      jsonText(message.attachmentIds),
      message.expiresAt,
      message.createdAt
    );
    return message;
  }
  getConversationProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM im_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  countConversationAttachments(messages) {
    const attachmentIds = /* @__PURE__ */ new Set();
    for (const message of messages) {
      for (const attachmentId of message.attachmentIds) attachmentIds.add(attachmentId);
    }
    return attachmentIds.size;
  }
  countConversationSenderDevices(messages) {
    return new Set(messages.map((message) => message.senderDeviceId).filter(Boolean)).size;
  }
  buildConversationProjectionEnvelope(input) {
    const conversation = this.getConversation(input.conversationId);
    if (!conversation) throw new Error(`Local IM conversation not found: ${input.conversationId}`);
    const messages = this.listMessages(input.conversationId);
    const projectionId = stableConversationProjectionId(this.workspace.workspaceId, input.conversationId);
    const existing = this.getConversationProjection(projectionId);
    const now = isoNow3();
    const publishedAt = input.action === "revoke" ? existing?.published_at ?? now : now;
    const revokedAt = input.action === "revoke" ? now : null;
    const lastMessageAt = messages.at(-1)?.createdAt ?? null;
    return {
      version: 1,
      event: {
        type: input.action === "revoke" ? "im.conversation.projection.revoked" : "im.conversation.projection.upserted",
        appId: IM_APP_ID,
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "conversation",
          conversationId: input.conversationId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        conversation: {
          id: conversation.id,
          workspaceId: conversation.workspaceId,
          kind: conversation.kind,
          title: conversation.title,
          participantCount: conversation.participants.length,
          linkedEntityType: conversation.linkedEntityType,
          linkedEntityId: conversation.linkedEntityId,
          disappearingSeconds: conversation.disappearingSeconds,
          archivedAt: conversation.archivedAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        },
        counts: {
          messages: messages.length,
          attachments: this.countConversationAttachments(messages),
          senderDevices: this.countConversationSenderDevices(messages)
        },
        lastMessageAt,
        exclusions: [
          "participant lists",
          "message ciphertext",
          "share-card bodies",
          "attachment metadata",
          "attachment bytes",
          "device keys",
          "raw local archive rows"
        ]
      }
    };
  }
  recordConversationProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO im_local_projections (
          id, workspace_id, conversation_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          conversation_id = excluded.conversation_id,
          published_at = excluded.published_at,
          revoked_at = excluded.revoked_at,
          payload_json = excluded.payload_json,
          last_projected_at = excluded.last_projected_at,
          updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      envelope.event.workspaceId,
      envelope.event.projection.conversationId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      jsonText(envelope),
      now,
      now
    );
  }
  listAttachments() {
    const rows = this.db.prepare("SELECT * FROM im_local_attachments WHERE workspace_id = ? ORDER BY created_at DESC").all(this.workspace.workspaceId);
    return rows.map(rowToAttachment);
  }
  getAttachment(attachmentId) {
    const row = this.db.prepare("SELECT * FROM im_local_attachments WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, attachmentId);
    return row ? rowToAttachment(row) : null;
  }
  upsertAttachment(input) {
    const existingId = readOptionalString(input.id, readOptionalString(input.attachmentId));
    const attachment = {
      ...normalizeAttachment(input, existingId ? this.getAttachment(existingId) ?? void 0 : void 0),
      workspaceId: this.workspace.workspaceId
    };
    this.db.prepare(
      `INSERT INTO im_local_attachments (
          id, workspace_id, owner_user_id, object_key, content_type, size_bytes,
          encrypted_metadata, uploaded_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          owner_user_id = excluded.owner_user_id,
          object_key = excluded.object_key,
          content_type = excluded.content_type,
          size_bytes = excluded.size_bytes,
          encrypted_metadata = excluded.encrypted_metadata,
          uploaded_at = excluded.uploaded_at,
          created_at = excluded.created_at`
    ).run(
      attachment.id,
      attachment.workspaceId,
      attachment.ownerUserId,
      attachment.objectKey,
      attachment.contentType,
      attachment.sizeBytes,
      attachment.encryptedMetadata,
      attachment.uploadedAt,
      attachment.createdAt
    );
    return attachment;
  }
  listDevices(userId) {
    const params = [this.workspace.workspaceId];
    const clause = userId ? "workspace_id = ? AND user_id = ?" : "workspace_id = ?";
    if (userId) params.push(userId);
    const rows = this.db.prepare(`SELECT * FROM im_local_devices WHERE ${clause} ORDER BY updated_at DESC`).all(...params);
    return rows.map(rowToDevice);
  }
  getDevice(deviceId) {
    const row = this.db.prepare("SELECT * FROM im_local_devices WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, deviceId);
    return row ? rowToDevice(row) : null;
  }
  upsertDevice(input) {
    const existingId = readOptionalString(input.id, readOptionalString(input.deviceId));
    const device = {
      ...normalizeDevice(input, existingId ? this.getDevice(existingId) ?? void 0 : void 0),
      workspaceId: this.workspace.workspaceId
    };
    this.db.prepare(
      `INSERT INTO im_local_devices (
          id, workspace_id, user_id, label, kind, protocol_device_id, registration_id,
          identity_key, signed_prekey_json, kyber_prekey_json, one_time_prekeys_json,
          is_primary, linked_from_device_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          user_id = excluded.user_id,
          label = excluded.label,
          kind = excluded.kind,
          protocol_device_id = excluded.protocol_device_id,
          registration_id = excluded.registration_id,
          identity_key = excluded.identity_key,
          signed_prekey_json = excluded.signed_prekey_json,
          kyber_prekey_json = excluded.kyber_prekey_json,
          one_time_prekeys_json = excluded.one_time_prekeys_json,
          is_primary = excluded.is_primary,
          linked_from_device_id = excluded.linked_from_device_id,
          updated_at = excluded.updated_at`
    ).run(
      device.id,
      device.workspaceId,
      device.userId,
      device.label,
      device.kind,
      device.protocolDeviceId,
      device.registrationId,
      device.identityKey,
      jsonText(device.signedPreKey),
      jsonText(device.kyberPreKey),
      jsonText(device.oneTimePreKeys),
      device.isPrimary ? 1 : 0,
      device.linkedFromDeviceId,
      device.createdAt,
      device.updatedAt
    );
    return device;
  }
  exportPayload() {
    return {
      kind: IM_ARCHIVE_PAYLOAD_SCHEMA,
      version: 1,
      conversations: this.listConversations(),
      messages: this.listMessages(),
      attachments: this.listAttachments(),
      devices: this.listDevices()
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: IM_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: IM_ARCHIVE_PAYLOAD_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: IM_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: IM_ARCHIVE_PAYLOAD_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: IM_APP_ID,
      payloadSchema: IM_ARCHIVE_PAYLOAD_SCHEMA
    });
    const normalized = normalizeTransferPayload(payload);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? IM_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? IM_ARCHIVE_PAYLOAD_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: IM_APP_ID,
      payloadSchema: IM_ARCHIVE_PAYLOAD_SCHEMA
    });
    const normalized = normalizeTransferPayload(payload);
    this.db.exec("BEGIN");
    try {
      for (const conversation of normalized.conversations) this.upsertConversation(conversation);
      for (const attachment of normalized.attachments) this.upsertAttachment(attachment);
      for (const device of normalized.devices) this.upsertDevice(device);
      for (const message of normalized.messages) this.upsertMessage(message);
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: IM_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? IM_ARCHIVE_PAYLOAD_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        store: "local",
        workspaceId: this.workspace.workspaceId,
        conversationCount: normalized.conversations.length,
        messageCount: normalized.messages.length,
        attachmentCount: normalized.attachments.length,
        deviceCount: normalized.devices.length,
        transferId
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};

// cli/mere-im.ts
var DEFAULT_BASE_URL = "https://mere.im";
var APP_NAME = "mere-im";
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "base-url",
  "business-base-url",
  "workspace",
  "workspace-id",
  "cookie",
  "session-cookie",
  "bearer",
  "token",
  "internal-token",
  "store",
  "ai",
  "local-db",
  "confirm",
  "data",
  "data-file",
  "output",
  "handle",
  "participant",
  "participant-user",
  "kind",
  "title",
  "disappearing-seconds",
  "linked-entity-type",
  "linked-entity-id",
  "message-id",
  "attachment-id",
  "sender-device-id",
  "client-message-id",
  "expires-in",
  "attachment",
  "content-type",
  "size-bytes",
  "encrypted-metadata",
  "upload-token",
  "file",
  "projection-url",
  "projection-token",
  "published-by-user-id",
  "published-by-email",
  "sender-user-id",
  "owner-user-id",
  "user-id",
  "object-key",
  "uploaded-at",
  "created-at",
  "source-device-id",
  "pairing-token",
  "label",
  "device-id",
  "device-kind",
  "registration-id",
  "identity-key",
  "signed-pre-key-id",
  "signed-pre-key",
  "signed-pre-key-signature",
  "kyber-pre-key-id",
  "kyber-pre-key",
  "kyber-pre-key-signature",
  "one-time-pre-key",
  "target-user-id",
  "reason",
  "slug",
  "name",
  "webhook-url",
  "webhook-bearer-token",
  "conversation-id",
  "actor-user-id",
  "actor-device-id",
  "room-name",
  "canonical-url",
  "url",
  "product-key",
  "object-id",
  "preview"
]);
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["dry-run", "json", "help", "yes", "no-interactive"]);
var activeSession = null;
function manifestCommand(path4, summary, options = {}) {
  return {
    id: path4.join("."),
    path: path4,
    summary,
    auth: options.auth ?? "none",
    risk: options.risk ?? "read",
    supportsJson: options.supportsJson ?? true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: options.positionals ?? [],
    flags: options.flags ?? [],
    ...options.auditDefault === void 0 ? {} : { auditDefault: options.auditDefault }
  };
}
var SESSION_FLAGS = ["base-url", "workspace", "cookie", "session-cookie", "bearer", "token"];
var DATA_FLAGS = ["data", "data-file"];
var PLANE_FLAGS = ["store", "ai", "local-db"];
var CONFIRM_FLAGS = ["yes", "confirm"];
var DEVICE_KEY_FLAGS = [
  "label",
  "device-kind",
  "registration-id",
  "identity-key",
  "signed-pre-key-id",
  "signed-pre-key",
  "signed-pre-key-signature",
  "kyber-pre-key-id",
  "kyber-pre-key",
  "kyber-pre-key-signature",
  "one-time-pre-key"
];
var COMMAND_MANIFEST = {
  schemaVersion: 1,
  app: "mereim",
  namespace: "im",
  aliases: ["im", "mere-im", "mereim"],
  auth: { kind: "mixed" },
  baseUrlEnv: ["MERE_IM_BASE_URL"],
  sessionPath: "~/.local/state/mere-im/session.json",
  globalFlags: [
    "base-url",
    "business-base-url",
    "workspace",
    "json",
    "cookie",
    "session-cookie",
    "bearer",
    "token",
    "internal-token",
    "store",
    "ai",
    "local-db",
    "data",
    "data-file",
    "output",
    "file",
    "projection-url",
    "projection-token",
    "published-by-user-id",
    "published-by-email",
    "dry-run",
    "yes",
    "confirm"
  ],
  commands: [
    manifestCommand(["commands"], "Print the machine-readable mere-im command manifest.", {
      auth: "none",
      flags: ["json"]
    }),
    manifestCommand(["completion"], "Print shell completion for mere-im.", {
      auth: "none",
      supportsJson: false,
      positionals: ["shell"]
    }),
    manifestCommand(["about"], "Show local Mere IM CLI and app metadata.", {
      auth: "none",
      auditDefault: true
    }),
    manifestCommand(["status"], "Show API reachability and the current session, if provided.", {
      auth: "none",
      flags: ["base-url", "cookie", "session-cookie", "bearer", "token", "internal-token"]
    }),
    manifestCommand(["store", "info"], "Show the IM local/cloud data and AI plane selection.", {
      auth: "none",
      flags: [...PLANE_FLAGS, "json"],
      auditDefault: true
    }),
    manifestCommand(["export"], "Export local encrypted IM archive data as a local-plane transfer bundle.", {
      auth: "none",
      risk: "read",
      flags: [...PLANE_FLAGS, "workspace", "output", "json"]
    }),
    manifestCommand(["import"], "Import a local-plane encrypted IM archive transfer bundle.", {
      auth: "none",
      risk: "write",
      flags: [...PLANE_FLAGS, "workspace", "file", "dry-run", "json"]
    }),
    manifestCommand(["auth", "login"], "Start browser login and store a dedicated CLI session.", {
      auth: "none",
      risk: "write",
      flags: ["base-url", "workspace", "json"]
    }),
    manifestCommand(["auth", "agent-login"], "Create an IM session from a Business agent session.", {
      auth: "none",
      risk: "write",
      flags: ["workspace", "business-base-url", "base-url", "json"]
    }),
    manifestCommand(["auth", "whoami"], "Show the current broker-authenticated IM user.", {
      auth: "session",
      flags: SESSION_FLAGS
    }),
    manifestCommand(["auth", "logout"], "Clear the local CLI session and revoke its refresh token.", {
      auth: "session",
      risk: "write",
      flags: ["json"]
    }),
    manifestCommand(["session", "status"], "Show the raw current IM session response.", {
      auth: "session",
      flags: SESSION_FLAGS
    }),
    manifestCommand(["workspace", "list"], "List workspaces available in the local CLI session.", {
      auth: "session",
      flags: ["json"],
      auditDefault: true
    }),
    manifestCommand(["workspace", "current"], "Show the current local CLI workspace selection.", {
      auth: "session",
      flags: ["json"],
      auditDefault: true
    }),
    manifestCommand(["workspace", "use"], "Select a workspace for the local CLI session.", {
      auth: "session",
      risk: "write",
      positionals: ["workspace"],
      flags: ["json"]
    }),
    manifestCommand(["profile", "show"], "Show the signed-in IM profile.", {
      auth: "session",
      flags: SESSION_FLAGS
    }),
    manifestCommand(["handles", "lookup"], "Look up a public IM handle.", {
      auth: "none",
      positionals: ["handle"],
      flags: ["base-url", "json"]
    }),
    manifestCommand(["handles", "claim"], "Claim or update the signed-in IM handle.", {
      auth: "session",
      risk: "write",
      positionals: ["handle"],
      flags: SESSION_FLAGS
    }),
    manifestCommand(["conversations", "list"], "List signed-in user conversations.", {
      auth: "session",
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS]
    }),
    manifestCommand(["conversations", "get"], "Show one conversation and its message metadata.", {
      auth: "session",
      positionals: ["conversationId"],
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS]
    }),
    manifestCommand(["conversations", "create"], "Create a direct or group conversation.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS, ...DATA_FLAGS, "kind", "participant", "title", "workspace"]
    }),
    manifestCommand(["conversations", "publish"], "Publish selected local conversation metadata to the Business projection receiver.", {
      auth: "none",
      risk: "external",
      positionals: ["conversationId"],
      flags: [
        ...PLANE_FLAGS,
        "workspace",
        "conversation-id",
        "projection-url",
        "projection-token",
        "published-by-user-id",
        "published-by-email",
        "dry-run",
        "json"
      ],
      auditDefault: true
    }),
    manifestCommand(["conversations", "revoke"], "Revoke a selected local conversation projection from Business.", {
      auth: "none",
      risk: "external",
      positionals: ["conversationId"],
      flags: [
        ...PLANE_FLAGS,
        "workspace",
        "conversation-id",
        "projection-url",
        "projection-token",
        "published-by-user-id",
        "published-by-email",
        "dry-run",
        "json"
      ],
      auditDefault: true
    }),
    manifestCommand(["conversations", "read"], "Mark a conversation read.", {
      auth: "session",
      risk: "write",
      positionals: ["conversationId"],
      flags: [...SESSION_FLAGS, "message-id"]
    }),
    manifestCommand(["messages", "list"], "List encrypted message metadata for one conversation.", {
      auth: "session",
      positionals: ["conversationId"],
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS]
    }),
    manifestCommand(["messages", "send"], "Send an encrypted message payload.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      positionals: ["conversationId"],
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS, ...DATA_FLAGS, "sender-user-id", "sender-device-id", "client-message-id", "attachment", "expires-in"]
    }),
    manifestCommand(["share-card", "send"], "Send a share card message.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      positionals: ["conversationId"],
      flags: [
        ...SESSION_FLAGS,
        ...DATA_FLAGS,
        "sender-device-id",
        "title",
        "canonical-url",
        "url",
        "product-key",
        "object-id",
        "preview"
      ]
    }),
    manifestCommand(["attachments", "ticket"], "Create an encrypted attachment upload ticket.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS, ...DATA_FLAGS, "owner-user-id", "content-type", "size-bytes", "encrypted-metadata"]
    }),
    manifestCommand(["attachments", "upload"], "Upload bytes using an attachment upload token.", {
      auth: "none",
      risk: "write",
      positionals: ["attachmentId"],
      flags: ["base-url", "upload-token", "file", "content-type"]
    }),
    manifestCommand(["devices", "list"], "List public key bundles/devices without consuming one-time prekeys.", {
      auth: "session",
      positionals: ["userId"],
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS]
    }),
    manifestCommand(["devices", "register"], "Register a local device key bundle.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...PLANE_FLAGS, ...DATA_FLAGS, "user-id", ...DEVICE_KEY_FLAGS]
    }),
    manifestCommand(["devices", "link-start"], "Create a device-link pairing token.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "source-device-id"]
    }),
    manifestCommand(["devices", "link-complete"], "Complete device linking with a new key bundle.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "pairing-token", ...DEVICE_KEY_FLAGS]
    }),
    manifestCommand(["keys", "upload"], "Upload replacement prekeys for a device.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "device-id", ...DEVICE_KEY_FLAGS]
    }),
    manifestCommand(["relationships", "block"], "Block another IM user.", {
      auth: "session",
      risk: "destructive",
      requiresYes: true,
      requiresConfirm: true,
      positionals: ["userId"],
      flags: [...SESSION_FLAGS, ...CONFIRM_FLAGS, "reason"]
    }),
    manifestCommand(["workspace", "health"], "Check internal Mere workspace bridge health.", {
      auth: "token",
      flags: ["base-url", "internal-token"]
    }),
    manifestCommand(["workspace", "provision"], "Provision the internal Mere workspace bridge.", {
      auth: "token",
      risk: "write",
      supportsData: true,
      positionals: ["workspaceId"],
      flags: ["base-url", "internal-token", ...DATA_FLAGS, "slug", "name", "webhook-url", "webhook-bearer-token"]
    }),
    manifestCommand(["workspace", "bootstrap"], "Bootstrap the internal Mere workspace bridge.", {
      auth: "token",
      risk: "write",
      supportsData: true,
      positionals: ["workspaceId"],
      flags: ["base-url", "internal-token", ...DATA_FLAGS, "slug", "name", "webhook-url", "webhook-bearer-token"]
    }),
    manifestCommand(["workspace", "sync"], "Sync the internal Mere workspace bridge.", {
      auth: "token",
      risk: "write",
      supportsData: true,
      positionals: ["workspaceId"],
      flags: ["base-url", "internal-token", ...DATA_FLAGS, "slug", "name", "webhook-url", "webhook-bearer-token"]
    }),
    manifestCommand(["workspace", "disconnect"], "Disconnect the internal Mere workspace bridge.", {
      auth: "token",
      risk: "destructive",
      requiresYes: true,
      requiresConfirm: true,
      positionals: ["workspaceId"],
      flags: ["base-url", "internal-token", ...CONFIRM_FLAGS]
    }),
    manifestCommand(["workspace", "share-card"], "Post an internal workspace share card.", {
      auth: "token",
      risk: "write",
      supportsData: true,
      positionals: ["workspaceId"],
      flags: [
        "base-url",
        "internal-token",
        ...DATA_FLAGS,
        "conversation-id",
        "actor-user-id",
        "sender-device-id",
        "title",
        "canonical-url",
        "url",
        "product-key",
        "object-id",
        "preview"
      ]
    }),
    manifestCommand(["workspace", "video-handoff"], "Create an internal workspace video handoff.", {
      auth: "token",
      risk: "external",
      supportsData: true,
      positionals: ["workspaceId"],
      flags: [
        "base-url",
        "internal-token",
        ...DATA_FLAGS,
        "conversation-id",
        "actor-user-id",
        "actor-device-id",
        "room-name"
      ]
    })
  ]
};
async function cliVersion() {
  const { readFile: readFile3 } = await import("fs/promises");
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version?.trim() || "0.0.0";
}
function isVersionCommand(args) {
  return args.length === 1 && (args[0] === "--version" || args[0] === "-v" || args[0] === "version");
}
function readFlag(args, name) {
  const prefix = `--${name}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === `--${name}`) {
      return args[index + 1];
    }
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return void 0;
}
function readFlagValues(args, name) {
  const values = [];
  const prefix = `--${name}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === `--${name}`) {
      const value = args[index + 1];
      if (value !== void 0 && !value.startsWith("--")) {
        values.push(value);
      }
      continue;
    }
    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
    }
  }
  return values;
}
function isJson(args) {
  return args.includes("--json");
}
function stripFlags(args) {
  const out = [];
  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (arg === "-h") {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      const name = arg.slice(2).split("=", 1)[0];
      if (BOOLEAN_FLAGS.has(name)) {
        index += 1;
        continue;
      }
      if (VALUE_FLAGS.has(name)) {
        index += arg.includes("=") ? 1 : 2;
        continue;
      }
    }
    out.push(arg);
    index += 1;
  }
  return out;
}
function baseUrlFromArgs(args, ctx) {
  const baseUrl = readFlag(args, "base-url") ?? ctx.env.MERE_IM_BASE_URL ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}
function workspaceFromArgs(args, ctx) {
  return readFlag(args, "workspace") ?? readFlag(args, "workspace-id") ?? ctx.env.MERE_IM_WORKSPACE ?? ctx.env.MERE_IM_WORKSPACE_ID ?? ctx.env.MERE_WORKSPACE ?? activeSession?.defaultWorkspaceId ?? activeSession?.workspace?.id ?? void 0;
}
function sessionCookieFromArgs(args, ctx) {
  return readFlag(args, "session-cookie") ?? readFlag(args, "cookie") ?? ctx.env.MERE_IM_SESSION_COOKIE ?? ctx.env.MERE_IM_COOKIE;
}
function bearerFromArgs(args, ctx) {
  const value = readFlag(args, "bearer") ?? readFlag(args, "token") ?? ctx.env.MERE_IM_BEARER_TOKEN ?? ctx.env.MERE_IM_TOKEN ?? ctx.env.MERE_IM_AUTHORIZATION ?? activeSession?.accessToken;
  if (!value?.trim()) return void 0;
  const trimmed = value.trim();
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed : `Bearer ${trimmed}`;
}
function internalTokenFromArgs(args, ctx) {
  return readFlag(args, "internal-token") ?? ctx.env.MERE_IM_INTERNAL_TOKEN ?? ctx.env.MEREIM_INTERNAL_TOKEN;
}
function requestHeaders(args, ctx, options = {}) {
  const headers = {
    accept: "application/json"
  };
  const workspace = workspaceFromArgs(args, ctx);
  if (workspace?.trim()) {
    headers["x-mere-workspace-id"] = workspace.trim();
  }
  if (options.internal) {
    const internalToken = internalTokenFromArgs(args, ctx);
    if (internalToken?.trim()) {
      headers.authorization = `Bearer ${internalToken.trim()}`;
    }
    return headers;
  }
  const cookie = sessionCookieFromArgs(args, ctx);
  if (cookie?.trim()) {
    headers.cookie = cookie.trim();
  }
  const bearer = bearerFromArgs(args, ctx);
  if (bearer) {
    headers.authorization = bearer;
  }
  return headers;
}
function apiUrl(baseUrl, pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}
function errorSummary(status, body) {
  if (body && typeof body === "object" && "error" in body) {
    const value = body.error;
    if (typeof value === "string" && value.trim()) return `HTTP ${status}: ${value}`;
  }
  if (typeof body === "string" && body.trim()) return `HTTP ${status}: ${body}`;
  return `HTTP ${status}`;
}
async function requestJson(baseUrl, pathname, args, ctx, options = {}) {
  const headers = requestHeaders(args, ctx, options);
  let requestBody;
  if (options.body !== void 0) {
    headers["content-type"] = "application/json";
    requestBody = JSON.stringify(options.body);
  }
  const res = await fetch(apiUrl(baseUrl, pathname), {
    method: options.method ?? "GET",
    headers,
    body: requestBody
  });
  const text = await res.text();
  let responseBody = null;
  if (text.trim()) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }
  if (!res.ok) {
    throw new Error(errorSummary(res.status, responseBody));
  }
  return responseBody;
}
async function fetchJson2(baseUrl, pathname, args, ctx, options = {}) {
  return requestJson(baseUrl, pathname, args, ctx, options);
}
function writeJson(ctx, value) {
  ctx.stdout(JSON.stringify(value, null, 2) + "\n");
  return 0;
}
function writeJsonError(ctx, message) {
  return writeJson(ctx, {
    ok: false,
    error: {
      code: message.includes("No local Mere Business session") ? "auth_error" : "cli_error",
      message
    }
  });
}
function displayValue(value, fallback = "unknown") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}
function hasDisplayValue(value) {
  return displayValue(value, "").length > 0;
}
function resolveImPlaneConfig(args, ctx) {
  return resolvePlaneConfigInspection({
    appId: APP_NAME,
    env: ctx.env,
    data: readFlag(args, "store"),
    ai: readFlag(args, "ai"),
    localDbPath: readFlag(args, "local-db")
  });
}
function imStoreReadiness(config) {
  return config.data === "local" ? "enabled" : "cloud";
}
function isLocalDataRoute(args, ctx) {
  return resolveImPlaneConfig(args, ctx).data === "local";
}
function localWorkspace(args, ctx) {
  const workspaceId = workspaceFromArgs(args, ctx)?.trim() || "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal IM" : workspaceId
  };
}
async function openLocalImStore(args, ctx) {
  const config = resolveImPlaneConfig(args, ctx);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so IM local data stays explicit.");
  }
  return LocalImStore.open({
    config,
    workspace: localWorkspace(args, ctx)
  });
}
function sessionEnv(ctx) {
  return ctx.env;
}
function sessionFilePath(ctx) {
  return resolveCliPaths(APP_NAME, sessionEnv(ctx)).sessionFile;
}
async function loadStoredSession(ctx) {
  activeSession = await loadCliSession({
    appName: APP_NAME,
    env: sessionEnv(ctx),
    legacyAppNames: ["mereim"]
  });
  return activeSession;
}
async function saveStoredSession(ctx, session) {
  await saveCliSession({ appName: APP_NAME, session, env: sessionEnv(ctx) });
  activeSession = session;
}
async function clearStoredSession(ctx) {
  await clearCliSession({ appName: APP_NAME, env: sessionEnv(ctx), legacyAppNames: ["mereim"] });
  activeSession = null;
}
function normalizeBaseUrl2(value) {
  return value.trim().replace(/\/+$/, "");
}
function businessWorkspaceSelector(args, ctx) {
  return readFlag(args, "workspace") ?? readFlag(args, "workspace-id") ?? ctx.env.MERE_IM_WORKSPACE ?? ctx.env.MERE_IM_WORKSPACE_ID ?? ctx.env.MERE_WORKSPACE ?? void 0;
}
function selectBusinessWorkspace(session, selector) {
  if (selector) {
    const workspace = resolveWorkspaceSelection(session.workspaces, selector);
    if (!workspace) {
      throw new Error(`Workspace ${selector} is not available in the Mere Business session.`);
    }
    return workspace;
  }
  if (session.workspace) {
    return session.workspace;
  }
  if (session.defaultWorkspaceId) {
    const workspace = resolveWorkspaceSelection(session.workspaces, session.defaultWorkspaceId);
    if (workspace) return workspace;
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
    throw new Error("Mere Business did not return an IM base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new Error("Mere Business did not return an IM CLI session.");
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
async function loadRefreshedBusinessSession(args, ctx) {
  const current = await loadCliSession({ appName: "mere-business", env: sessionEnv(ctx) });
  if (!current) {
    throw new Error(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first."
    );
  }
  const workspace = selectBusinessWorkspace(current, businessWorkspaceSelector(args, ctx));
  const baseUrl = normalizeBaseUrl2(readFlag(args, "business-base-url") ?? current.baseUrl);
  if (!sessionNeedsRefresh(current, workspace.id)) {
    return { session: current, workspace, baseUrl };
  }
  const payload = await refreshRemoteSession({
    baseUrl,
    refreshToken: current.refreshToken,
    workspace: workspace.id
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl,
    persistDefaultWorkspace: false
  });
  await saveCliSession({ appName: "mere-business", session, env: sessionEnv(ctx) });
  return {
    session,
    workspace: session.workspace ?? workspace,
    baseUrl
  };
}
async function cmdAuthAgentLogin(args, json, ctx) {
  const business = await loadRefreshedBusinessSession(args, ctx);
  const response = await fetch(new URL("/api/cli/v1/auth/product-sessions", business.baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${business.session.accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      app: "im",
      workspaceId: business.workspace.id
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(productSessionErrorMessage(payload, `Request failed (${response.status.toString()})`));
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession2(product.session, {
    baseUrl: normalizeBaseUrl2(readFlag(args, "base-url") ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveStoredSession(ctx, session);
  if (json) return writeJson(ctx, redactedSessionPayload(session, ctx));
  ctx.stdout(`${renderSessionSummary(session, ctx)}
`);
  return 0;
}
function hasExplicitSessionAuth(args, ctx) {
  return Boolean(
    readFlag(args, "bearer") ?? readFlag(args, "token") ?? readFlag(args, "cookie") ?? readFlag(args, "session-cookie") ?? ctx.env.MERE_IM_BEARER_TOKEN ?? ctx.env.MERE_IM_TOKEN ?? ctx.env.MERE_IM_AUTHORIZATION ?? ctx.env.MERE_IM_SESSION_COOKIE ?? ctx.env.MERE_IM_COOKIE
  );
}
async function refreshStoredSessionIfNeeded(args, ctx) {
  if (!activeSession || hasExplicitSessionAuth(args, ctx)) {
    return;
  }
  const targetWorkspaceId = readFlag(args, "workspace") ?? readFlag(args, "workspace-id") ?? ctx.env.MERE_IM_WORKSPACE_ID ?? ctx.env.MERE_IM_WORKSPACE ?? activeSession.defaultWorkspaceId ?? activeSession.workspace?.id ?? null;
  if (!sessionNeedsRefresh(activeSession, targetWorkspaceId)) {
    return;
  }
  const payload = await refreshRemoteSession({
    baseUrl: activeSession.baseUrl,
    refreshToken: activeSession.refreshToken,
    workspace: targetWorkspaceId
  });
  await saveStoredSession(
    ctx,
    mergeSessionPayload(activeSession, payload, {
      persistDefaultWorkspace: true
    })
  );
}
function renderWorkspace(workspace) {
  if (!workspace) return "none";
  return `${workspace.name} (${workspace.slug}, ${workspace.id}, ${workspace.role})`;
}
function renderSessionSummary(session, ctx) {
  return [
    `Signed in as ${session.user.displayName || session.user.primaryEmail || session.user.email}`,
    `User ID: ${session.user.userId}`,
    `Base URL: ${session.baseUrl}`,
    `Workspace: ${renderWorkspace(session.workspace)}`,
    `Workspaces: ${session.workspaces.length}`,
    `Session file: ${sessionFilePath(ctx)}`,
    `Expires: ${formatDate(session.expiresAt)}`
  ].join("\n");
}
function redactedSessionPayload(session, ctx) {
  return {
    ok: true,
    authenticated: true,
    appAccessReady: true,
    user: session.user,
    baseUrl: session.baseUrl,
    workspace: session.workspace ?? null,
    workspaces: session.workspaces,
    defaultWorkspaceId: session.defaultWorkspaceId ?? null,
    expiresAt: session.expiresAt,
    sessionFile: sessionFilePath(ctx)
  };
}
async function readJsonObjectFromArgs(args) {
  const inline = readFlag(args, "data");
  const file = readFlag(args, "data-file");
  if (inline !== void 0 && file !== void 0) {
    throw new Error("Use either --data or --data-file, not both.");
  }
  if (inline === void 0 && file === void 0) {
    return {};
  }
  const text = inline ?? await (async () => {
    const { readFile: readFile3 } = await import("fs/promises");
    return readFile3(file, "utf8");
  })();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON payload must be an object.");
  }
  return parsed;
}
function readNumberFlag(args, name) {
  const value = readFlag(args, name);
  if (value === void 0 || value.trim() === "") {
    return void 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be a valid number.`);
  }
  return parsed;
}
function readJsonFlag(args, name) {
  const value = readFlag(args, name);
  if (value === void 0) {
    return void 0;
  }
  return JSON.parse(value);
}
function readStringListFlag(args, name) {
  const values = readFlagValues(args, name).map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : void 0;
}
function readLocalActorUserId(args, ctx) {
  return readFlag(args, "sender-user-id") ?? readFlag(args, "actor-user-id") ?? readFlag(args, "owner-user-id") ?? readFlag(args, "user-id") ?? ctx.env.MERE_IM_USER_ID;
}
function expiresAtFromArgs(args) {
  const expiresIn = readNumberFlag(args, "expires-in");
  if (expiresIn === void 0) return void 0;
  return new Date(Date.now() + expiresIn * 1e3).toISOString();
}
function mergeDefined(body, values) {
  const merged = { ...body };
  for (const [key, value] of Object.entries(values)) {
    if (value !== void 0) {
      merged[key] = value;
    }
  }
  return merged;
}
async function bodyWithFlags(args, values) {
  return mergeDefined(await readJsonObjectFromArgs(args), values);
}
function requireTarget(value, usage) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(usage);
  }
  return trimmed;
}
function requireDestructiveConfirmation(args, action, target) {
  if (!args.includes("--yes")) {
    throw new Error(`Refusing to ${action} ${target} without --yes.`);
  }
  const confirm = readFlag(args, "confirm");
  if (confirm !== target) {
    throw new Error(`Refusing to ${action} ${target} without --confirm ${target}.`);
  }
}
function formatDate(value) {
  if (!value) return "never";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(parsed));
}
function participantLabel(participant) {
  return participant.displayName ?? participant.handle ?? participant.userId;
}
function conversationTitle(conversation) {
  if (conversation.title?.trim()) return conversation.title.trim();
  return conversation.participants.map(participantLabel).join(", ") || conversation.id;
}
function extractUserId(session) {
  return session.user?.userId ?? session.user?.id;
}
function filterConversationsForWorkspace(conversations, workspace) {
  if (!workspace?.trim()) return conversations;
  return conversations.filter((conversation) => conversation.workspaceId === workspace.trim());
}
async function cmdAuthLogin(baseUrl, args, json, ctx) {
  const session = await loginWithBrowser({
    baseUrl,
    workspace: workspaceFromArgs(args, ctx),
    productLabel: "mere-im",
    notify: (message) => ctx.stderr(`${message}
`)
  });
  await saveStoredSession(ctx, session);
  if (json) return writeJson(ctx, redactedSessionPayload(session, ctx));
  ctx.stdout(`${renderSessionSummary(session, ctx)}
`);
  return 0;
}
async function cmdStoreInfo(baseUrl, args, json, ctx) {
  const config = resolveImPlaneConfig(args, ctx);
  if (config.data === "local") {
    const store = await openLocalImStore(args, ctx);
    try {
      const localInfo = store.info();
      const info2 = {
        ok: true,
        app: APP_NAME,
        store: config.data,
        ai: config.ai,
        cloudProjection: config.cloudProjection,
        blended: config.blended,
        ...localInfo,
        baseUrl,
        localAiSupported: false,
        sources: config.sources
      };
      if (json) return writeJson(ctx, info2);
      ctx.stdout(
        formatPlaneConfigReport({
          kind: "mere.local-plane.config",
          configs: [config]
        })
      );
      ctx.stdout(
        [
          `IM message store: ${localInfo.localMessageStore}`,
          `Local conversations: ${localInfo.conversationCount}`,
          `Local messages: ${localInfo.messageCount}`,
          `Local attachments: ${localInfo.attachmentCount}`,
          `Local devices: ${localInfo.deviceCount}`,
          "Hosted realtime fanout, attachment bytes, and public delivery still run on Cloudflare.",
          `Cloud API: ${baseUrl}`,
          ""
        ].join("\n")
      );
      return 0;
    } finally {
      store.close();
    }
  }
  const info = {
    ok: true,
    app: APP_NAME,
    store: config.data,
    ai: config.ai,
    cloudProjection: config.cloudProjection,
    blended: config.blended,
    dbPath: config.localDbPath,
    baseUrl,
    localMessageStore: imStoreReadiness(config),
    localMessagePersistenceSupported: false,
    localAiSupported: false,
    sources: config.sources
  };
  if (json) return writeJson(ctx, info);
  ctx.stdout(
    formatPlaneConfigReport({
      kind: "mere.local-plane.config",
      configs: [config]
    })
  );
  ctx.stdout(
    [
      `IM message store: ${info.localMessageStore}`,
      "Encrypted envelopes remain on the hosted IM API unless --store local is selected for local archive commands.",
      `Cloud API: ${baseUrl}`,
      ""
    ].join("\n")
  );
  return 0;
}
async function localConversationBody(args, ctx) {
  return bodyWithFlags(args, {
    id: readFlag(args, "conversation-id"),
    kind: readFlag(args, "kind"),
    title: readFlag(args, "title"),
    participantUserIds: readStringListFlag(args, "participant") ?? readStringListFlag(args, "participant-user"),
    disappearingSeconds: readNumberFlag(args, "disappearing-seconds"),
    workspaceId: workspaceFromArgs(args, ctx),
    linkedEntityType: readFlag(args, "linked-entity-type"),
    linkedEntityId: readFlag(args, "linked-entity-id")
  });
}
async function localMessageBody(args, ctx, conversationId) {
  const attachmentIds = readStringListFlag(args, "attachment");
  return bodyWithFlags(args, {
    id: readFlag(args, "message-id"),
    conversationId,
    senderUserId: readLocalActorUserId(args, ctx),
    senderDeviceId: readFlag(args, "sender-device-id"),
    clientMessageId: readFlag(args, "client-message-id"),
    kind: readFlag(args, "kind"),
    attachmentIds,
    expiresAt: expiresAtFromArgs(args)
  });
}
async function localAttachmentBody(args, ctx) {
  return bodyWithFlags(args, {
    id: readFlag(args, "attachment-id"),
    ownerUserId: readLocalActorUserId(args, ctx),
    objectKey: readFlag(args, "object-key"),
    contentType: readFlag(args, "content-type"),
    sizeBytes: readNumberFlag(args, "size-bytes"),
    encryptedMetadata: readFlag(args, "encrypted-metadata"),
    uploadedAt: readFlag(args, "uploaded-at"),
    createdAt: readFlag(args, "created-at")
  });
}
async function cmdLocalConversations(args, json, ctx) {
  const command = stripFlags(args)[1] ?? "list";
  const store = await openLocalImStore(args, ctx);
  try {
    if (command === "list" || command === "") {
      const conversations = store.listConversations();
      if (json) return writeJson(ctx, { conversations });
      for (const conversation of conversations) {
        ctx.stdout(`${conversation.id}  ${conversation.kind}  ${conversation.title ?? "untitled"}
`);
      }
      if (conversations.length === 0) ctx.stdout("No local conversations found.\n");
      return 0;
    }
    if (command === "get" || command === "show") {
      const target = requireTarget(stripFlags(args)[2], "Usage: mere-im --store local conversations get <conversationId>");
      const conversation = store.getConversation(target);
      return writeJson(ctx, {
        conversation,
        messages: conversation ? store.listMessages(target) : []
      });
    }
    if (command === "create" || command === "new" || command === "upsert" || command === "save") {
      const body = await localConversationBody(args, ctx);
      if ((command === "upsert" || command === "save") && stripFlags(args)[2]) {
        body.id = stripFlags(args)[2];
      }
      const conversation = store.upsertConversation(body);
      if (json) return writeJson(ctx, { conversation });
      ctx.stdout(`${conversation.id}  ${conversation.kind}  ${conversation.title ?? "untitled"}
`);
      return 0;
    }
    throw new Error(`Unknown local conversations command: ${command}`);
  } finally {
    store.close();
  }
}
async function cmdLocalMessages(args, json, ctx) {
  const command = stripFlags(args)[1] ?? "list";
  const store = await openLocalImStore(args, ctx);
  try {
    if (command === "list" || command === "") {
      const conversationId = command === "list" ? stripFlags(args)[2] : stripFlags(args)[1];
      const messages = store.listMessages(conversationId);
      if (json) return writeJson(ctx, { messages });
      for (const message of messages) {
        ctx.stdout(`${message.id}  ${message.kind}  ${formatDate(message.createdAt)}
`);
      }
      if (messages.length === 0) ctx.stdout("No local messages found.\n");
      return 0;
    }
    if (command === "send" || command === "create" || command === "upsert" || command === "save") {
      const body = await localMessageBody(args, ctx, stripFlags(args)[2]);
      if ((command === "upsert" || command === "save") && stripFlags(args)[3]) {
        body.id = stripFlags(args)[3];
      }
      const message = store.upsertMessage(body);
      if (json) return writeJson(ctx, { message });
      ctx.stdout(`Saved local message ${message.id}.
`);
      return 0;
    }
    throw new Error(`Unknown local messages command: ${command}`);
  } finally {
    store.close();
  }
}
async function cmdLocalConversationProjection(args, json, ctx, action) {
  const conversationId = stripFlags(args)[2]?.trim() || readFlag(args, "conversation-id")?.trim();
  if (!conversationId) throw new Error(`conversations ${action} requires <conversationId>.`);
  const store = await openLocalImStore(args, ctx);
  try {
    const envelope = store.buildConversationProjectionEnvelope({
      action,
      conversationId,
      publishedByUserId: readFlag(args, "published-by-user-id") ?? ctx.env.MERE_IM_USER_ID ?? ctx.env.MERE_USER_ID ?? "local-cli",
      publishedByEmail: readFlag(args, "published-by-email") ?? ctx.env.MERE_IM_USER_EMAIL ?? ctx.env.MERE_USER_EMAIL ?? null
    });
    if (args.includes("--dry-run")) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: APP_NAME,
          env: ctx.env,
          receiverUrl: readFlag(args, "projection-url"),
          bearerToken: readFlag(args, "projection-token")
        }).receiverUrl;
      } catch {
        receiverUrl = void 0;
      }
      return writeJson(ctx, {
        ok: true,
        dryRun: true,
        app: APP_NAME,
        action,
        store: "local",
        projection: "cloudflare",
        conversationId,
        projectionId: envelope.event.projection.id,
        receiverUrl,
        event: envelope
      });
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: APP_NAME,
      env: ctx.env,
      receiverUrl: readFlag(args, "projection-url"),
      bearerToken: readFlag(args, "projection-token"),
      event: envelope
    });
    store.recordConversationProjection(envelope);
    const result = {
      ok: true,
      app: APP_NAME,
      action,
      store: "local",
      projection: "cloudflare",
      conversationId,
      projectionId: envelope.event.projection.id,
      receiverUrl: delivery.receiverUrl,
      status: delivery.status,
      receiver: delivery.responseJson,
      hostedDeliveryLocal: false,
      attachmentBytesLocal: false,
      cloudProjectionLocal: false
    };
    if (json) return writeJson(ctx, result);
    ctx.stdout(`${action === "publish" ? "Published" : "Revoked"} local conversation projection ${result.projectionId}.
`);
    return 0;
  } finally {
    store.close();
  }
}
async function cmdLocalAttachments(args, json, ctx) {
  const command = stripFlags(args)[1] ?? "list";
  const store = await openLocalImStore(args, ctx);
  try {
    if (command === "list" || command === "") {
      const attachments = store.listAttachments();
      return writeJson(ctx, { attachments });
    }
    if (command === "ticket" || command === "upload-ticket" || command === "upsert" || command === "save") {
      const attachment = store.upsertAttachment(await localAttachmentBody(args, ctx));
      if (json) return writeJson(ctx, { attachment });
      ctx.stdout(`Saved local attachment ${attachment.id}.
`);
      return 0;
    }
    throw new Error(`Unknown local attachments command: ${command}`);
  } finally {
    store.close();
  }
}
async function cmdLocalDevices(args, json, ctx) {
  const command = stripFlags(args)[1] ?? "list";
  const store = await openLocalImStore(args, ctx);
  try {
    if (command === "list" || command === "") {
      const userId = command === "list" ? stripFlags(args)[2] : stripFlags(args)[1];
      const devices = store.listDevices(userId);
      return writeJson(ctx, { devices });
    }
    if (command === "register" || command === "upsert" || command === "save") {
      const device = store.upsertDevice(await deviceBodyWithFlags(args, {
        id: readFlag(args, "device-id"),
        userId: readLocalActorUserId(args, ctx)
      }));
      if (json) return writeJson(ctx, { device });
      ctx.stdout(`Saved local device ${device.id} (${device.label}).
`);
      return 0;
    }
    throw new Error(`Unknown local devices command: ${command}`);
  } finally {
    store.close();
  }
}
async function cmdLocalExport(args, _json, ctx) {
  const store = await openLocalImStore(args, ctx);
  try {
    const bundle = store.exportBundle();
    const output = readFlag(args, "output")?.trim();
    if (output) {
      const target = resolve(output);
      await mkdir3(dirname(target), { recursive: true });
      await writeFile2(target, JSON.stringify(bundle, null, 2));
      return writeJson(ctx, {
        ok: true,
        path: target,
        appId: bundle.appId,
        workspaceId: bundle.workspaceId,
        payloadSchema: bundle.payloadSchema,
        payloadSha256: bundle.payloadSha256,
        conversationCount: bundle.payload.conversations.length,
        messageCount: bundle.payload.messages.length,
        attachmentCount: bundle.payload.attachments.length,
        deviceCount: bundle.payload.devices.length
      });
    }
    return writeJson(ctx, bundle);
  } finally {
    store.close();
  }
}
async function cmdLocalImport(args, json, ctx) {
  const file = requireTarget(readFlag(args, "file"), "Usage: mere-im --store local import --file <bundle.json>");
  const value = JSON.parse(await readFile2(file, "utf8"));
  const store = await openLocalImStore(args, ctx);
  try {
    const result = args.includes("--dry-run") ? store.importPlan(value) : store.importValue(value);
    if (json || args.includes("--dry-run")) return writeJson(ctx, result);
    const record = result;
    ctx.stdout(`Imported ${record.conversationCount ?? 0} conversations and ${record.messageCount ?? 0} messages.
`);
    return 0;
  } finally {
    store.close();
  }
}
async function cmdAuthLogout(json, ctx) {
  const session = activeSession ?? await loadStoredSession(ctx);
  if (!session) {
    if (json) return writeJson(ctx, { ok: true, hadSession: false });
    ctx.stdout("No local CLI session was configured.\n");
    return 0;
  }
  await logoutRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken
  }).catch(() => void 0);
  await clearStoredSession(ctx);
  if (json) return writeJson(ctx, { ok: true, hadSession: true });
  ctx.stdout("Signed out of mere-im CLI.\n");
  return 0;
}
async function cmdWorkspaceList(json, ctx) {
  const session = activeSession ?? await loadStoredSession(ctx);
  if (!session) {
    throw new Error("Run `mere-im auth login` first, or pass --bearer/--cookie for API-only commands.");
  }
  if (json) return writeJson(ctx, { workspaces: session.workspaces, current: session.workspace });
  if (session.workspaces.length === 0) {
    ctx.stdout("No workspaces are available in this CLI session.\n");
    return 0;
  }
  for (const workspace of session.workspaces) {
    const marker = workspace.id === session.defaultWorkspaceId ? "*" : " ";
    ctx.stdout(`${marker} ${renderWorkspace(workspace)}
`);
  }
  return 0;
}
async function cmdWorkspaceCurrent(json, ctx) {
  const session = activeSession ?? await loadStoredSession(ctx);
  if (!session) {
    throw new Error("Run `mere-im auth login` first.");
  }
  const current = session.workspace ?? null;
  if (json) return writeJson(ctx, { workspace: current, defaultWorkspaceId: session.defaultWorkspaceId });
  ctx.stdout(`Workspace: ${renderWorkspace(current)}
`);
  return 0;
}
async function cmdWorkspaceUse(selector, json, ctx) {
  const session = activeSession ?? await loadStoredSession(ctx);
  if (!session) {
    throw new Error("Run `mere-im auth login` first.");
  }
  const target = requireTarget(selector, "Usage: mere-im workspace use <id|slug|host>");
  const workspace = resolveWorkspaceSelection(session.workspaces, target);
  if (!workspace) {
    throw new Error(`Workspace ${target} is not available in this CLI session.`);
  }
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace: workspace.id
  });
  const next = mergeSessionPayload(session, payload, {
    persistDefaultWorkspace: true
  });
  await saveStoredSession(ctx, next);
  if (json) return writeJson(ctx, next);
  ctx.stdout(`Workspace: ${renderWorkspace(next.workspace)}
`);
  return 0;
}
async function cmdAbout(json, ctx) {
  const data = {
    app: "mereim",
    namespace: "im",
    binary: "mere-im",
    version: await cliVersion(),
    defaultBaseUrl: DEFAULT_BASE_URL,
    sessionPath: sessionFilePath(ctx),
    capabilities: [
      "browser login with stored CLI sessions",
      "session status",
      "profile read",
      "handle lookup and claim",
      "conversation reads and writes",
      "message metadata reads and encrypted message writes",
      "share card messages",
      "attachment upload tickets and uploads",
      "device public key bundle reads and key/device writes",
      "relationship blocks",
      "internal workspace bridge lifecycle operations"
    ]
  };
  if (json) return writeJson(ctx, data);
  ctx.stdout(`mere-im ${data.version}
`);
  ctx.stdout(`Namespace: ${data.namespace}
`);
  ctx.stdout(`Default API: ${data.defaultBaseUrl}
`);
  ctx.stdout(`Session: ${data.sessionPath}
`);
  return 0;
}
async function cmdSession(baseUrl, args, json, ctx) {
  const data = await fetchJson2(baseUrl, "/api/auth/session", args, ctx);
  if (json) return writeJson(ctx, data);
  if (!data.authenticated) {
    ctx.stdout("Not signed in.\n");
    return 0;
  }
  const user = data.user;
  ctx.stdout(`Signed in as ${user?.displayName ?? user?.handle ?? user?.email ?? user?.primaryEmail ?? extractUserId(data) ?? "unknown"}
`);
  if (extractUserId(data)) ctx.stdout(`User ID: ${extractUserId(data)}
`);
  ctx.stdout(`App access: ${data.appAccessReady ? "ready" : "not ready"}
`);
  return 0;
}
async function cmdStatus(baseUrl, args, json, ctx) {
  const session = await fetchJson2(baseUrl, "/api/auth/session", args, ctx);
  let internalHealth = null;
  if (internalTokenFromArgs(args, ctx)?.trim()) {
    internalHealth = await fetchJson2(baseUrl, "/api/internal/mere/health", args, ctx, { internal: true });
  }
  const data = {
    ok: true,
    app: "mereim",
    namespace: "im",
    baseUrl,
    authenticated: Boolean(session.authenticated),
    appAccessReady: Boolean(session.appAccessReady),
    userId: extractUserId(session) ?? null,
    internalHealth
  };
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Mere IM API: ${baseUrl}
`);
  ctx.stdout(`Authenticated: ${data.authenticated ? "yes" : "no"}
`);
  if (data.userId) ctx.stdout(`User ID: ${data.userId}
`);
  if (internalHealth) ctx.stdout("Workspace bridge health: ok\n");
  return 0;
}
async function cmdProfile(baseUrl, args, json, ctx) {
  const data = await fetchJson2(baseUrl, "/api/profile", args, ctx);
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Profile: ${displayValue(data.displayName ?? data.handle ?? data.userId)}
`);
  if (hasDisplayValue(data.userId)) ctx.stdout(`User ID: ${displayValue(data.userId)}
`);
  if (hasDisplayValue(data.handle)) ctx.stdout(`Handle: ${displayValue(data.handle)}
`);
  if (hasDisplayValue(data.primaryEmail)) ctx.stdout(`Email: ${displayValue(data.primaryEmail)}
`);
  return 0;
}
async function cmdHandleLookup(baseUrl, handle, json, ctx) {
  const target = requireTarget(handle, "Usage: mere-im handles lookup <handle>");
  const data = await fetchJson2(baseUrl, `/api/handles/${encodeURIComponent(target)}`, [], ctx);
  if (json) return writeJson(ctx, data);
  const profile = data;
  ctx.stdout(`Handle: ${displayValue(profile.handle, target)}
`);
  if (hasDisplayValue(profile.userId)) ctx.stdout(`User ID: ${displayValue(profile.userId)}
`);
  if (hasDisplayValue(profile.displayName)) ctx.stdout(`Display name: ${displayValue(profile.displayName)}
`);
  return 0;
}
async function cmdHandleClaim(baseUrl, args, handle, json, ctx) {
  const target = requireTarget(handle ?? readFlag(args, "handle"), "Usage: mere-im handles claim <handle>");
  const data = await requestJson(baseUrl, "/api/handles/claim", args, ctx, {
    method: "POST",
    body: { handle: target }
  });
  if (json) return writeJson(ctx, data);
  const profile = data;
  ctx.stdout(`Handle: ${displayValue(profile.handle, target)}
`);
  if (hasDisplayValue(profile.userId)) ctx.stdout(`User ID: ${displayValue(profile.userId)}
`);
  return 0;
}
async function cmdConversationsList(baseUrl, args, json, ctx) {
  const data = await fetchJson2(baseUrl, "/api/conversations", args, ctx);
  const workspace = workspaceFromArgs(args, ctx);
  const conversations = filterConversationsForWorkspace(data.conversations ?? [], workspace);
  const output = workspace?.trim() ? { ...data, workspace: workspace.trim(), conversations } : { ...data, conversations };
  if (json) return writeJson(ctx, output);
  if (conversations.length === 0) {
    ctx.stdout(workspace ? `No conversations found for workspace ${workspace}.
` : "No conversations found.\n");
    return 0;
  }
  for (const conversation of conversations) {
    const last = conversation.lastMessageAt ? formatDate(conversation.lastMessageAt) : "no messages";
    ctx.stdout(`${conversation.id}  ${conversation.kind}  ${conversationTitle(conversation)}
`);
    ctx.stdout(`  participants: ${conversation.participantCount}; last: ${last}; workspace: ${conversation.workspaceId ?? "none"}
`);
  }
  return 0;
}
async function cmdConversationGet(baseUrl, args, conversationId, json, ctx) {
  if (!conversationId?.trim()) {
    ctx.stderr("Usage: mere-im conversations get <conversationId>\n");
    return 1;
  }
  const data = await fetchJson2(baseUrl, `/api/conversations/${encodeURIComponent(conversationId)}`, args, ctx);
  if (json) return writeJson(ctx, data);
  const conversation = data.conversation;
  if (!conversation) {
    ctx.stdout("Conversation not found.\n");
    return 0;
  }
  ctx.stdout(`${conversationTitle(conversation)}
`);
  ctx.stdout(`ID: ${conversation.id}
`);
  ctx.stdout(`Kind: ${conversation.kind}
`);
  ctx.stdout(`Workspace: ${conversation.workspaceId ?? "none"}
`);
  ctx.stdout(`Participants: ${conversation.participants.map(participantLabel).join(", ")}
`);
  ctx.stdout(`Messages: ${data.messages?.length ?? 0}
`);
  return 0;
}
async function cmdConversationCreate(baseUrl, args, json, ctx) {
  const participants = [
    ...readFlagValues(args, "participant"),
    ...readFlagValues(args, "participant-user")
  ].map((value) => value.trim()).filter(Boolean);
  const body = await bodyWithFlags(args, {
    kind: readFlag(args, "kind") ?? (participants.length === 1 ? "direct" : void 0),
    participantUserIds: participants.length > 0 ? participants : void 0,
    title: readFlag(args, "title"),
    disappearingSeconds: readNumberFlag(args, "disappearing-seconds"),
    workspaceId: workspaceFromArgs(args, ctx),
    linkedEntityType: readFlag(args, "linked-entity-type"),
    linkedEntityId: readFlag(args, "linked-entity-id")
  });
  const data = await requestJson(baseUrl, "/api/conversations", args, ctx, {
    method: "POST",
    body
  });
  if (json) return writeJson(ctx, data);
  const conversation = data.conversation;
  if (!conversation) {
    ctx.stdout("Conversation created.\n");
    return 0;
  }
  ctx.stdout(`${conversation.id}  ${conversation.kind}  ${conversationTitle(conversation)}
`);
  ctx.stdout(`  participants: ${conversation.participantCount}; workspace: ${conversation.workspaceId ?? "none"}
`);
  return 0;
}
async function cmdConversationRead(baseUrl, args, conversationId, json, ctx) {
  const target = requireTarget(conversationId, "Usage: mere-im conversations read <conversationId>");
  const data = await requestJson(baseUrl, `/api/conversations/${encodeURIComponent(target)}`, args, ctx, {
    method: "POST",
    body: { messageId: readFlag(args, "message-id") ?? null }
  });
  if (json) return writeJson(ctx, data);
  const read = data;
  ctx.stdout(read.messageId ? `Marked read through ${read.messageId}.
` : "Conversation has no messages to mark read.\n");
  return 0;
}
async function cmdMessagesList(baseUrl, args, conversationId, json, ctx) {
  if (!conversationId?.trim()) {
    ctx.stderr("Usage: mere-im messages list <conversationId>\n");
    return 1;
  }
  const data = await fetchJson2(baseUrl, `/api/conversations/${encodeURIComponent(conversationId)}/messages`, args, ctx);
  if (json) return writeJson(ctx, data);
  const messages = data.messages ?? [];
  if (messages.length === 0) {
    ctx.stdout("No messages found.\n");
    return 0;
  }
  for (const message of messages) {
    const attachmentCount = message.attachmentIds?.length ?? 0;
    ctx.stdout(`${message.id}  ${message.kind}  ${formatDate(message.createdAt)}
`);
    ctx.stdout(`  sender: ${message.senderUserId}; device: ${message.senderDeviceId ?? "none"}; attachments: ${attachmentCount}
`);
  }
  return 0;
}
async function cmdMessagesSend(baseUrl, args, conversationId, json, ctx) {
  const target = requireTarget(conversationId, "Usage: mere-im messages send <conversationId> --data <json>");
  const attachments = readFlagValues(args, "attachment").map((value) => value.trim()).filter(Boolean);
  const body = await bodyWithFlags(args, {
    kind: readFlag(args, "kind"),
    senderDeviceId: readFlag(args, "sender-device-id"),
    clientMessageId: readFlag(args, "client-message-id"),
    attachmentIds: attachments.length > 0 ? attachments : void 0,
    expiresInSeconds: readNumberFlag(args, "expires-in")
  });
  const data = await requestJson(
    baseUrl,
    `/api/conversations/${encodeURIComponent(target)}/messages`,
    args,
    ctx,
    {
      method: "POST",
      body
    }
  );
  if (json) return writeJson(ctx, data);
  const message = data.message;
  ctx.stdout(message ? `Sent ${message.id} at ${formatDate(message.createdAt)}.
` : "Message sent.\n");
  return 0;
}
function shareCardBody(args, conversationId) {
  const card = mergeDefined({}, {
    title: readFlag(args, "title"),
    canonicalUrl: readFlag(args, "canonical-url") ?? readFlag(args, "url"),
    productKey: readFlag(args, "product-key"),
    objectId: readFlag(args, "object-id"),
    preview: readJsonFlag(args, "preview")
  });
  return mergeDefined({}, {
    conversationId,
    senderDeviceId: readFlag(args, "sender-device-id"),
    card: Object.keys(card).length > 0 ? card : void 0
  });
}
async function cmdShareCardSend(baseUrl, args, conversationId, json, ctx) {
  const body = mergeDefined(await readJsonObjectFromArgs(args), shareCardBody(args, conversationId));
  if (!body.conversationId) {
    throw new Error("Usage: mere-im share-card send <conversationId> --title <title> --url <url> --product-key <key> --object-id <id>");
  }
  const data = await requestJson(baseUrl, "/api/share-card", args, ctx, {
    method: "POST",
    body
  });
  if (json) return writeJson(ctx, data);
  ctx.stdout(data.message ? `Sent share card ${data.message.id}.
` : "Share card sent.\n");
  return 0;
}
async function cmdAttachmentTicket(baseUrl, args, json, ctx) {
  const body = await bodyWithFlags(args, {
    contentType: readFlag(args, "content-type"),
    sizeBytes: readNumberFlag(args, "size-bytes"),
    encryptedMetadata: readFlag(args, "encrypted-metadata")
  });
  const data = await requestJson(baseUrl, "/api/attachments/upload-ticket", args, ctx, {
    method: "POST",
    body
  });
  if (json) return writeJson(ctx, data);
  const ticket = data;
  ctx.stdout(`Attachment: ${displayValue(ticket.attachmentId, "created")}
`);
  if (hasDisplayValue(ticket.uploadUrl)) ctx.stdout(`Upload URL: ${displayValue(ticket.uploadUrl)}
`);
  if (hasDisplayValue(ticket.expiresAt)) ctx.stdout(`Expires: ${formatDate(displayValue(ticket.expiresAt))}
`);
  return 0;
}
async function cmdAttachmentUpload(baseUrl, args, attachmentId, json, ctx) {
  const target = requireTarget(attachmentId, "Usage: mere-im attachments upload <attachmentId> --upload-token <token> --file <path>");
  const uploadToken = requireTarget(readFlag(args, "upload-token"), "Missing --upload-token.");
  const file = requireTarget(readFlag(args, "file"), "Missing --file.");
  const { readFile: readFile3 } = await import("fs/promises");
  const bytes = await readFile3(file);
  const contentType = readFlag(args, "content-type") ?? "application/octet-stream";
  const url = new URL(apiUrl(baseUrl, `/api/attachments/${encodeURIComponent(target)}`));
  url.searchParams.set("token", uploadToken);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": contentType
    },
    body: bytes
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(errorSummary(res.status, data));
  }
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Uploaded ${target} (${bytes.byteLength} bytes).
`);
  return 0;
}
async function cmdDevicesList(baseUrl, args, userIdArg, json, ctx) {
  let userId = userIdArg?.trim();
  if (!userId) {
    const session = await fetchJson2(baseUrl, "/api/auth/session", args, ctx);
    userId = extractUserId(session);
  }
  if (!userId) {
    ctx.stderr("Usage: mere-im devices list <userId> (or provide a signed-in session)\n");
    return 1;
  }
  const data = await fetchJson2(baseUrl, `/api/keys/${encodeURIComponent(userId)}`, args, ctx);
  if (json) return writeJson(ctx, data);
  const user = data.user;
  ctx.stdout(`Devices for ${user?.displayName ?? user?.handle ?? user?.primaryEmail ?? userId}
`);
  const devices = data.devices ?? [];
  if (devices.length === 0) {
    ctx.stdout("No devices registered.\n");
    return 0;
  }
  for (const device of devices) {
    ctx.stdout(`${device.deviceId}  ${device.label}  ${device.kind}${device.isPrimary ? "  primary" : ""}
`);
    ctx.stdout(`  protocol device: ${device.protocolDeviceId}; one-time prekeys: ${device.oneTimePreKeys?.length ?? 0}
`);
  }
  return 0;
}
function signedPreKeyFromFlags(args, prefix) {
  const idFlag = prefix === "signed" ? "signed-pre-key-id" : "kyber-pre-key-id";
  const keyFlag = prefix === "signed" ? "signed-pre-key" : "kyber-pre-key";
  const signatureFlag = prefix === "signed" ? "signed-pre-key-signature" : "kyber-pre-key-signature";
  const keyId = readNumberFlag(args, idFlag);
  const publicKey = readFlag(args, keyFlag);
  const signature = readFlag(args, signatureFlag);
  if (keyId === void 0 && publicKey === void 0 && signature === void 0) {
    return void 0;
  }
  return { keyId: keyId ?? 1, publicKey, signature };
}
function oneTimePreKeysFromFlags(args) {
  const values = readFlagValues(args, "one-time-pre-key");
  if (values.length === 0) {
    return void 0;
  }
  return values.map((value, index) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
    }
    return { keyId: index + 1, publicKey: value };
  });
}
async function deviceBodyWithFlags(args, values = {}) {
  return bodyWithFlags(args, {
    label: readFlag(args, "label"),
    kind: readFlag(args, "device-kind"),
    registrationId: readNumberFlag(args, "registration-id"),
    identityKey: readFlag(args, "identity-key"),
    signedPreKey: signedPreKeyFromFlags(args, "signed"),
    kyberPreKey: signedPreKeyFromFlags(args, "kyber"),
    oneTimePreKeys: oneTimePreKeysFromFlags(args),
    ...values
  });
}
async function cmdDeviceRegister(baseUrl, args, json, ctx) {
  const data = await requestJson(baseUrl, "/api/devices/register", args, ctx, {
    method: "POST",
    body: await deviceBodyWithFlags(args)
  });
  if (json) return writeJson(ctx, data);
  const device = data.device;
  ctx.stdout(device ? `Registered ${device.deviceId} (${device.label}).
` : "Device registered.\n");
  return 0;
}
async function cmdDeviceLinkStart(baseUrl, args, json, ctx) {
  const body = await bodyWithFlags(args, {
    sourceDeviceId: readFlag(args, "source-device-id")
  });
  const data = await requestJson(baseUrl, "/api/devices/link/start", args, ctx, {
    method: "POST",
    body
  });
  if (json) return writeJson(ctx, data);
  const result = data;
  ctx.stdout(`Pairing code: ${displayValue(result.pairingCode, "created")}
`);
  if (hasDisplayValue(result.expiresAt)) ctx.stdout(`Expires: ${formatDate(displayValue(result.expiresAt))}
`);
  return 0;
}
async function cmdDeviceLinkComplete(baseUrl, args, json, ctx) {
  const data = await requestJson(baseUrl, "/api/devices/link/complete", args, ctx, {
    method: "POST",
    body: await deviceBodyWithFlags(args, {
      pairingToken: readFlag(args, "pairing-token")
    })
  });
  if (json) return writeJson(ctx, data);
  const device = data.device;
  ctx.stdout(device ? `Linked ${device.deviceId} (${device.label}).
` : "Device linked.\n");
  return 0;
}
async function cmdKeysUpload(baseUrl, args, json, ctx) {
  const data = await requestJson(baseUrl, "/api/keys/upload", args, ctx, {
    method: "POST",
    body: await deviceBodyWithFlags(args, {
      deviceId: readFlag(args, "device-id")
    })
  });
  if (json) return writeJson(ctx, data);
  const device = data.device;
  ctx.stdout(device ? `Uploaded keys for ${device.deviceId}.
` : "Keys uploaded.\n");
  return 0;
}
async function cmdRelationshipBlock(baseUrl, args, userId, json, ctx) {
  const target = requireTarget(
    userId ?? readFlag(args, "target-user-id"),
    "Usage: mere-im relationships block <userId> --yes --confirm <userId>"
  );
  requireDestructiveConfirmation(args, "block user", target);
  const data = await requestJson(baseUrl, "/api/relationships/block", args, ctx, {
    method: "POST",
    body: {
      targetUserId: target,
      reason: readFlag(args, "reason") ?? null
    }
  });
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Blocked ${target}.
`);
  return 0;
}
async function cmdWorkspaceHealth(baseUrl, args, json, ctx) {
  if (!internalTokenFromArgs(args, ctx)?.trim()) {
    ctx.stderr("Missing --internal-token or MERE_IM_INTERNAL_TOKEN for workspace health.\n");
    return 1;
  }
  const data = await fetchJson2(baseUrl, "/api/internal/mere/health", args, ctx, { internal: true });
  if (json) return writeJson(ctx, data);
  ctx.stdout("Workspace bridge health: ok\n");
  return 0;
}
function requireInternalToken(args, ctx, command) {
  if (!internalTokenFromArgs(args, ctx)?.trim()) {
    throw new Error(`Missing --internal-token or MERE_IM_INTERNAL_TOKEN for ${command}.`);
  }
}
function workspaceIdArg(args, value, usage) {
  return requireTarget(value ?? readFlag(args, "workspace-id") ?? readFlag(args, "workspace"), usage);
}
async function workspaceProvisionBody(args) {
  return bodyWithFlags(args, {
    slug: readFlag(args, "slug"),
    name: readFlag(args, "name"),
    webhookUrl: readFlag(args, "webhook-url"),
    webhookBearerToken: readFlag(args, "webhook-bearer-token") ?? null
  });
}
async function cmdWorkspaceLifecycle(baseUrl, args, action, workspaceId, json, ctx) {
  requireInternalToken(args, ctx, `workspace ${action}`);
  const target = workspaceIdArg(args, workspaceId, `Usage: mere-im workspace ${action} <workspaceId>`);
  const data = await requestJson(
    baseUrl,
    `/api/internal/mere/workspaces/${encodeURIComponent(target)}/${action}`,
    args,
    ctx,
    {
      internal: true,
      method: "POST",
      body: await workspaceProvisionBody(args)
    }
  );
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Workspace ${action}: ${target}
`);
  const result = data;
  if (hasDisplayValue(result.status)) ctx.stdout(`Status: ${displayValue(result.status)}
`);
  if (hasDisplayValue(result.health)) ctx.stdout(`Health: ${displayValue(result.health)}
`);
  return 0;
}
async function cmdWorkspaceDisconnect(baseUrl, args, workspaceId, json, ctx) {
  requireInternalToken(args, ctx, "workspace disconnect");
  const target = workspaceIdArg(args, workspaceId, "Usage: mere-im workspace disconnect <workspaceId> --yes --confirm <workspaceId>");
  requireDestructiveConfirmation(args, "disconnect workspace", target);
  const data = await requestJson(
    baseUrl,
    `/api/internal/mere/workspaces/${encodeURIComponent(target)}/connection`,
    args,
    ctx,
    {
      internal: true,
      method: "DELETE"
    }
  );
  if (json) return writeJson(ctx, data);
  ctx.stdout(`Disconnected workspace ${target}.
`);
  return 0;
}
async function cmdWorkspaceShareCard(baseUrl, args, workspaceId, json, ctx) {
  requireInternalToken(args, ctx, "workspace share-card");
  const target = workspaceIdArg(args, workspaceId, "Usage: mere-im workspace share-card <workspaceId> --data <json>");
  const body = mergeDefined(await readJsonObjectFromArgs(args), {
    conversationId: readFlag(args, "conversation-id"),
    actorUserId: readFlag(args, "actor-user-id"),
    senderDeviceId: readFlag(args, "sender-device-id"),
    card: shareCardBody(args, void 0).card
  });
  const data = await requestJson(
    baseUrl,
    `/api/internal/mere/workspaces/${encodeURIComponent(target)}/share-card`,
    args,
    ctx,
    {
      internal: true,
      method: "POST",
      body
    }
  );
  if (json) return writeJson(ctx, data);
  const message = data.message;
  ctx.stdout(message ? `Posted workspace share card ${message.id}.
` : "Workspace share card posted.\n");
  return 0;
}
async function cmdWorkspaceVideoHandoff(baseUrl, args, workspaceId, json, ctx) {
  requireInternalToken(args, ctx, "workspace video-handoff");
  const target = workspaceIdArg(args, workspaceId, "Usage: mere-im workspace video-handoff <workspaceId> --data <json>");
  const body = await bodyWithFlags(args, {
    conversationId: readFlag(args, "conversation-id"),
    actorUserId: readFlag(args, "actor-user-id"),
    actorDeviceId: readFlag(args, "actor-device-id"),
    roomName: readFlag(args, "room-name")
  });
  const data = await requestJson(
    baseUrl,
    `/api/internal/mere/workspaces/${encodeURIComponent(target)}/video-handoff`,
    args,
    ctx,
    {
      internal: true,
      method: "POST",
      body
    }
  );
  if (json) return writeJson(ctx, data);
  ctx.stdout("Workspace video handoff created.\n");
  return 0;
}
function printHelp(ctx) {
  ctx.stdout(`
  mere-im - CLI for Mere IM (mere.im)

  Usage: mere-im <command> [flags]

  Commands:
    commands --json                  Print command manifest JSON
    completion [bash|zsh|fish]       Print shell completion
    about                            Show local CLI/app metadata
    status                           Show API reachability and current session
    store info                       Show local/cloud data and AI plane selection
    export                           Export local encrypted archive bundle
    import                           Import local encrypted archive bundle
    auth login                       Start browser login and store CLI session
    auth agent-login                 Create CLI session from Mere Business agent session
    auth whoami                      Show current broker-authenticated user
    auth logout                      Clear local CLI session
    session status                   Show raw current session
    workspace list|current|use       Manage local CLI workspace selection
    profile show                     Show signed-in profile
    handles lookup <handle>          Look up a public profile by handle
    handles claim <handle>           Claim or update your handle
    conversations list               List conversations (hosted or --store local)
    conversations get <id>           Show one conversation (hosted or --store local)
    conversations create             Create a conversation (--participant USER)
    conversations publish|revoke     Project/revoke selected local metadata to Business
    conversations read <id>          Mark a conversation read
    messages list <conversationId>   List encrypted message metadata
    messages send <conversationId>   Send or save an encrypted payload from --data
    share-card send <conversationId> Send a share-card message
    attachments ticket               Create an attachment upload ticket or local metadata row
    attachments upload <id>          Upload bytes with --upload-token --file
    devices list [userId]            List public key bundles/devices
    devices register                 Register a device from --data
    devices link-start               Start device linking
    devices link-complete            Complete device linking from --data
    keys upload                      Upload replacement device keys
    relationships block <userId>     Block a user (--yes --confirm USER)
    workspace health                 Check internal workspace bridge health
    workspace provision <id>         Provision workspace bridge from flags/data
    workspace bootstrap <id>         Bootstrap workspace bridge from flags/data
    workspace sync <id>              Sync workspace bridge from flags/data
    workspace disconnect <id>        Disconnect bridge (--yes --confirm ID)
    workspace share-card <id>        Post internal workspace share card
    workspace video-handoff <id>     Create internal video handoff

  Flags:
    --base-url <url>         Override API base (default: https://mere.im)
    --business-base-url <url> Override Mere Business for browserless agent login
    --workspace <id>         Workspace filter or local session workspace
    --json                   Machine-readable JSON output
    --data <json>            JSON object body for write commands
    --data-file <path>       Read JSON object body from file
    --output <path>          Write exported local transfer bundle
    --file <path>            Read imported transfer bundle or upload bytes
    --dry-run                Preview local import without writing
    --yes --confirm <id>     Required for destructive commands
    --cookie <header>        Raw Cookie header for browser-session reads
    --session-cookie <value> Raw Cookie header for browser-session reads
    --bearer <token>         Bearer token for session reads
    --token <token>          Alias for --bearer
    --internal-token <token> Internal token for workspace bridge health
    --store local|cloud      Choose local or cloud data plane config
    --ai local|cloud         Choose local or cloud AI plane config
    --local-db <path>        Override centralized local Mere SQLite path
    --projection-url <url>   Business projection receiver URL
    --projection-token <tok> Business projection bearer token
    --help                   Show this help

  Environment:
    MERE_IM_BASE_URL          API base URL override
    MERE_IM_SESSION_COOKIE    Raw Cookie header for browser-session reads
    MERE_IM_BEARER_TOKEN      Bearer token for session reads
    MERE_IM_TOKEN             Alias for MERE_IM_BEARER_TOKEN
    MERE_IM_INTERNAL_TOKEN    Internal workspace bridge token
    MERE_IM_WORKSPACE         Default workspace filter
    MERE_IM_STORE             Default IM data plane
    MERE_IM_AI_PLANE          Default IM AI plane
    MERE_IM_LOCAL_DB          IM-local override for the shared local DB
    MERE_IM_USER_ID           Default local sender/owner/user id
    MERE_IM_PROJECTION_URL    IM Business projection receiver URL
    MERE_IM_PROJECTION_TOKEN  IM Business projection bearer token
    MERE_BUSINESS_PROJECTION_URL Platform-wide Business projection URL
    MERE_BUSINESS_PROJECTION_TOKEN Platform-wide Business projection token
    MERE_DATA_PLANE           Platform-wide default data plane
    MERE_AI_PLANE             Platform-wide default AI plane
    MERE_LOCAL_DB             Platform-wide shared local DB path

`);
  return 0;
}
function printManifest(ctx) {
  ctx.stdout(JSON.stringify(COMMAND_MANIFEST, null, 2) + "\n");
  return 0;
}
function printCompletion(shell, ctx) {
  const commands = [
    "commands",
    "completion",
    "about",
    "status",
    "store",
    "export",
    "import",
    "auth",
    "session",
    "workspace",
    "profile",
    "handles",
    "conversations",
    "messages",
    "share-card",
    "attachments",
    "devices",
    "keys",
    "relationships",
    "help"
  ];
  if (shell === "zsh") {
    ctx.stdout(`#compdef mere-im
_arguments '1:command:(${commands.join(" ")})'
`);
    return 0;
  }
  if (shell === "fish") {
    ctx.stdout(`complete -c mere-im -f -n '__fish_use_subcommand' -a "${commands.join(" ")}"
`);
    return 0;
  }
  ctx.stdout(`# mere-im bash completion
_mere_im_completion() { COMPREPLY=( $(compgen -W "${commands.join(" ")}" -- "\${COMP_WORDS[COMP_CWORD]}") ); }
complete -F _mere_im_completion mere-im
`);
  return 0;
}
async function runCli(rawArgs, ctx) {
  if (isVersionCommand(rawArgs)) {
    ctx.stdout(`${await cliVersion()}
`);
    return 0;
  }
  if (rawArgs[0] === "commands") {
    if (!rawArgs.includes("--json")) {
      ctx.stderr("Usage: mere-im commands --json\n");
      return 1;
    }
    return printManifest(ctx);
  }
  if (rawArgs[0] === "completion") {
    return printCompletion(rawArgs[1], ctx);
  }
  try {
    await loadStoredSession(ctx);
    const args = stripFlags(rawArgs);
    const group = args[0] ?? "";
    const action = args[1] ?? "";
    const skipsSessionRefresh = rawArgs.includes("--help") || rawArgs.includes("-h") || group === "" || group === "help" || group === "about" || group === "store" || group === "export" || group === "import" || isLocalDataRoute(rawArgs, ctx) || (group === "conversations" || group === "conversation") && (action === "publish" || action === "revoke") || group === "auth" && (action === "login" || action === "agent-login" || action === "logout");
    if (!skipsSessionRefresh) {
      await refreshStoredSessionIfNeeded(rawArgs, ctx);
    }
    const json = isJson(rawArgs);
    const baseUrl = baseUrlFromArgs(rawArgs, ctx);
    if (rawArgs.includes("--help") || rawArgs.includes("-h") || group === "help") {
      return printHelp(ctx);
    }
    if (group === "" || group === "about") {
      return await cmdAbout(json, ctx);
    }
    if (group === "status") {
      return await cmdStatus(baseUrl, rawArgs, json, ctx);
    }
    if (group === "store" && (action === "" || action === "info" || action === "status")) {
      return await cmdStoreInfo(baseUrl, rawArgs, json, ctx);
    }
    if (group === "export") {
      return await cmdLocalExport(rawArgs, json, ctx);
    }
    if (group === "import") {
      return await cmdLocalImport(rawArgs, json, ctx);
    }
    if (group === "auth" && action === "login") {
      return await cmdAuthLogin(baseUrl, rawArgs, json, ctx);
    }
    if (group === "auth" && action === "agent-login") {
      return await cmdAuthAgentLogin(rawArgs, json, ctx);
    }
    if (group === "auth" && action === "logout") {
      return await cmdAuthLogout(json, ctx);
    }
    if (group === "auth" && (action === "whoami" || action === "status")) {
      return await cmdSession(baseUrl, rawArgs, json, ctx);
    }
    if (group === "session" && (action === "" || action === "status" || action === "whoami")) {
      return await cmdSession(baseUrl, rawArgs, json, ctx);
    }
    if (group === "workspace" && action === "list") {
      return await cmdWorkspaceList(json, ctx);
    }
    if (group === "workspace" && (action === "current" || action === "status")) {
      return await cmdWorkspaceCurrent(json, ctx);
    }
    if (group === "workspace" && action === "use") {
      return await cmdWorkspaceUse(args[2], json, ctx);
    }
    if (group === "profile" && (action === "" || action === "show")) {
      return await cmdProfile(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "handles" || group === "handle") && (action === "lookup" || action === "show" || action === "get")) {
      return await cmdHandleLookup(baseUrl, args[2] ?? args[1], json, ctx);
    }
    if ((group === "handles" || group === "handle") && (action === "claim" || action === "set")) {
      return await cmdHandleClaim(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "" || action === "list")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalConversations(rawArgs, json, ctx);
      return await cmdConversationsList(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "get" || action === "show")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalConversations(rawArgs, json, ctx);
      return await cmdConversationGet(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "create" || action === "new")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalConversations(rawArgs, json, ctx);
      return await cmdConversationCreate(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "publish" || action === "revoke")) {
      return await cmdLocalConversationProjection(rawArgs, json, ctx, action);
    }
    if ((group === "conversations" || group === "conversation") && (action === "read" || action === "mark-read")) {
      return await cmdConversationRead(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "messages" && (action === "list" || action === "")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalMessages(rawArgs, json, ctx);
      return await cmdMessagesList(baseUrl, rawArgs, action === "list" ? args[2] : args[1], json, ctx);
    }
    if (group === "messages" && (action === "send" || action === "create")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalMessages(rawArgs, json, ctx);
      return await cmdMessagesSend(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "share-card" || group === "sharecard") && (action === "send" || action === "create")) {
      return await cmdShareCardSend(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "attachments" || group === "attachment") && (action === "ticket" || action === "upload-ticket")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalAttachments(rawArgs, json, ctx);
      return await cmdAttachmentTicket(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "attachments" || group === "attachment") && (action === "list" || action === "upsert" || action === "save")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalAttachments(rawArgs, json, ctx);
    }
    if ((group === "attachments" || group === "attachment") && action === "upload") {
      return await cmdAttachmentUpload(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "devices" && (action === "list" || action === "")) {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalDevices(rawArgs, json, ctx);
      return await cmdDevicesList(baseUrl, rawArgs, action === "list" ? args[2] : args[1], json, ctx);
    }
    if (group === "devices" && action === "register") {
      if (isLocalDataRoute(rawArgs, ctx)) return await cmdLocalDevices(rawArgs, json, ctx);
      return await cmdDeviceRegister(baseUrl, rawArgs, json, ctx);
    }
    if (group === "devices" && (action === "link-start" || action === "link-token")) {
      return await cmdDeviceLinkStart(baseUrl, rawArgs, json, ctx);
    }
    if (group === "devices" && (action === "link-complete" || action === "link")) {
      return await cmdDeviceLinkComplete(baseUrl, rawArgs, json, ctx);
    }
    if (group === "keys" && (action === "upload" || action === "rotate")) {
      return await cmdKeysUpload(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "relationships" || group === "relationship") && action === "block") {
      return await cmdRelationshipBlock(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "workspace" && action === "health") {
      return await cmdWorkspaceHealth(baseUrl, rawArgs, json, ctx);
    }
    if (group === "workspace" && (action === "provision" || action === "bootstrap" || action === "sync")) {
      return await cmdWorkspaceLifecycle(baseUrl, rawArgs, action, args[2], json, ctx);
    }
    if (group === "workspace" && (action === "disconnect" || action === "delete")) {
      return await cmdWorkspaceDisconnect(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "workspace" && action === "share-card") {
      return await cmdWorkspaceShareCard(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "workspace" && action === "video-handoff") {
      return await cmdWorkspaceVideoHandoff(baseUrl, rawArgs, args[2], json, ctx);
    }
    ctx.stderr(`Unknown command: ${args.join(" ") || group}
`);
    return printHelp(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isJson(rawArgs)) {
      writeJsonError(ctx, message);
      return 1;
    }
    ctx.stderr(`Error: ${message}
`);
    return 1;
  }
}

// cli/run.ts
var exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
});
process.exitCode = exitCode;
