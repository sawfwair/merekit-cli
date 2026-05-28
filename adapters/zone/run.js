#!/usr/bin/env node

// cli/mere-zone.ts
import { readFile as readFile3 } from "node:fs/promises";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3010e55f7f1bc76b1ba4a1cb874e4024/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3010e55f7f1bc76b1ba4a1cb874e4024/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3010e55f7f1bc76b1ba4a1cb874e4024/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3010e55f7f1bc76b1ba4a1cb874e4024/node_modules/@mere/cli-auth/src/client.ts
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

// cli/local-store.ts
import { createHash as createHash2 } from "node:crypto";

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
var ZONE_APP_ID = "mere-zone";
var ZONE_CATALOG_SCHEMA = "mere.zone.catalog.v1";
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readString2(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required for local mere.zone records.`);
  }
  return raw.trim();
}
function readOptionalString(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
function readNumber(value, fallback = 0) {
  const raw = value === void 0 || value === null || value === "" ? fallback : Number(value);
  return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
}
function readBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
function readTags(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => typeof entry === "string" && entry.trim() ? [entry.trim()] : []);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return readTags(parsed);
  } catch {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
}
function parseJson2(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function parseJsonColumn(value, fallback) {
  return typeof value === "string" ? parseJson2(value, fallback) : fallback;
}
function rowString(row, key) {
  return readString2(row[key], key);
}
function stableCatalogProjectionId(input) {
  const digest = createHash2("sha256").update([ZONE_APP_ID, input.workspaceId, input.storeId, "catalog-summary"].join("\n")).digest("hex").slice(0, 24);
  return `zonpr_${digest}`;
}
function normalizeStore(input, workspaceId, existing) {
  const now = isoNow3();
  const slug = readString2(input.slug, "slug", existing?.slug);
  return {
    id: existing?.id ?? readOptionalString(input.id) ?? slug,
    workspaceId,
    slug,
    name: readString2(input.name, "name", existing?.name),
    description: readOptionalString(input.description, existing?.description),
    accentColor: readOptionalString(input.accentColor ?? input.accent_color, existing?.accentColor),
    currency: (readOptionalString(input.currency, existing?.currency) ?? "CAD").toUpperCase(),
    timezone: readOptionalString(input.timezone, existing?.timezone) ?? "America/Halifax",
    status: readOptionalString(input.status, existing?.status) ?? "draft",
    supportEmail: readOptionalString(input.supportEmail ?? input.support_email, existing?.supportEmail),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt ?? input.created_at) ?? now,
    updatedAt: readOptionalString(input.updatedAt ?? input.updated_at) ?? now
  };
}
function normalizeVariant(input, workspaceId, storeId, productId, existing) {
  const now = isoNow3();
  const stockOnHand = readNumber(input.stockOnHand ?? input.stock_on_hand, existing?.stockOnHand ?? 0);
  const reservedStock = readNumber(input.reservedStock ?? input.reserved_stock, existing?.reservedStock ?? 0);
  return {
    id: existing?.id ?? readOptionalString(input.id) ?? readString2(input.sku, "sku"),
    workspaceId,
    storeId,
    productId,
    sku: readString2(input.sku, "sku", existing?.sku),
    title: readString2(input.title, "title", existing?.title),
    optionSummary: readOptionalString(input.optionSummary ?? input.option_summary, existing?.optionSummary),
    priceCents: readNumber(input.priceCents ?? input.price_cents, existing?.priceCents ?? 0),
    compareAtPriceCents: readOptionalNullableNumber(
      input.compareAtPriceCents ?? input.compare_at_price_cents,
      existing?.compareAtPriceCents
    ),
    stockOnHand,
    reservedStock,
    availableStock: Math.max(0, stockOnHand - reservedStock),
    lowStockThreshold: readNumber(input.lowStockThreshold ?? input.low_stock_threshold, existing?.lowStockThreshold ?? 2),
    isActive: readBoolean(input.isActive ?? input.is_active, existing?.isActive ?? true),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt ?? input.created_at) ?? now,
    updatedAt: readOptionalString(input.updatedAt ?? input.updated_at) ?? now
  };
}
function readOptionalNullableNumber(value, fallback = null) {
  if (value === void 0) return fallback;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}
function normalizeProduct(input, workspaceId, existing) {
  const now = isoNow3();
  const storeId = readString2(input.storeId ?? input.store_id, "storeId", existing?.storeId);
  const slug = readString2(input.slug, "slug", existing?.slug);
  const productId = existing?.id ?? readOptionalString(input.id) ?? slug;
  const product = {
    id: productId,
    workspaceId,
    storeId,
    slug,
    title: readString2(input.title, "title", existing?.title),
    description: readOptionalString(input.description, existing?.description),
    collection: readOptionalString(input.collection, existing?.collection),
    tags: readTags(input.tags ?? input.tags_json ?? existing?.tags),
    featuredImageUrl: readOptionalString(input.featuredImageUrl ?? input.featured_image_url, existing?.featuredImageUrl),
    isActive: readBoolean(input.isActive ?? input.is_active, existing?.isActive ?? true),
    isPublished: readBoolean(input.isPublished ?? input.is_published, existing?.isPublished ?? false),
    sortOrder: readNumber(input.sortOrder ?? input.sort_order, existing?.sortOrder ?? 0),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt ?? input.created_at) ?? now,
    updatedAt: readOptionalString(input.updatedAt ?? input.updated_at) ?? now,
    variants: []
  };
  product.variants = Array.isArray(input.variants) ? input.variants.map(
    (entry) => normalizeVariant(isRecord2(entry) ? entry : {}, workspaceId, storeId, productId)
  ) : existing?.variants ?? [];
  return product;
}
function normalizeLedgerEntry(input, workspaceId, fallbackStoreId) {
  const now = isoNow3();
  const variantId = readString2(input.variantId ?? input.variant_id, "variantId");
  const storeId = readString2(input.storeId ?? input.store_id, "storeId", fallbackStoreId);
  return {
    id: readOptionalString(input.id) ?? `ivl_${variantId}_${now}`,
    workspaceId,
    storeId,
    variantId,
    quantityDelta: readNumber(input.quantityDelta ?? input.quantity_delta),
    reason: readOptionalString(input.reason) ?? "manual_adjustment",
    note: readOptionalString(input.note),
    createdAt: readOptionalString(input.createdAt ?? input.created_at) ?? now
  };
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== ZONE_CATALOG_SCHEMA || value.version !== 1) {
    throw new Error(`Zone transfer payload must be ${ZONE_CATALOG_SCHEMA} version 1.`);
  }
  return {
    kind: ZONE_CATALOG_SCHEMA,
    version: 1,
    stores: Array.isArray(value.stores) ? value.stores.map((entry) => normalizeStore(isRecord2(entry) ? entry : {}, workspaceId)) : [],
    products: Array.isArray(value.products) ? value.products.map((entry) => normalizeProduct(isRecord2(entry) ? entry : {}, workspaceId)) : [],
    inventoryLedger: Array.isArray(value.inventoryLedger) ? value.inventoryLedger.map((entry) => normalizeLedgerEntry(isRecord2(entry) ? entry : {}, workspaceId)) : []
  };
}
var LocalZoneStore = class _LocalZoneStore {
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
    registerPlaneApp(opened.db, ZONE_APP_ID, "Mere Zone");
    registerPlaneTransferSchema(opened.db, ZONE_APP_ID, {
      payloadSchema: ZONE_CATALOG_SCHEMA,
      displayName: "Zone catalog transfer",
      description: "Portable mere.zone store catalog and inventory snapshot records; checkout and payments stay hosted."
    });
    upsertPlaneWorkspace(opened.db, ZONE_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalZoneStore(opened.dbPath, db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
			CREATE TABLE IF NOT EXISTS zone_local_stores (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				slug TEXT NOT NULL,
				name TEXT NOT NULL,
				description TEXT,
				accent_color TEXT,
				currency TEXT NOT NULL,
				timezone TEXT NOT NULL,
				status TEXT NOT NULL,
				support_email TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_local_stores_slug
				ON zone_local_stores (workspace_id, slug);

			CREATE TABLE IF NOT EXISTS zone_local_products (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				store_id TEXT NOT NULL,
				slug TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT,
				collection TEXT,
				tags_json TEXT NOT NULL DEFAULT '[]',
				featured_image_url TEXT,
				is_active INTEGER NOT NULL DEFAULT 1,
				is_published INTEGER NOT NULL DEFAULT 0,
				sort_order INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_local_products_slug
				ON zone_local_products (workspace_id, store_id, slug);

			CREATE TABLE IF NOT EXISTS zone_local_variants (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				store_id TEXT NOT NULL,
				product_id TEXT NOT NULL,
				sku TEXT NOT NULL,
				title TEXT NOT NULL,
				option_summary TEXT,
				price_cents INTEGER NOT NULL,
				compare_at_price_cents INTEGER,
				stock_on_hand INTEGER NOT NULL DEFAULT 0,
				reserved_stock INTEGER NOT NULL DEFAULT 0,
				low_stock_threshold INTEGER NOT NULL DEFAULT 2,
				is_active INTEGER NOT NULL DEFAULT 1,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_local_variants_sku
				ON zone_local_variants (workspace_id, store_id, sku);

			CREATE TABLE IF NOT EXISTS zone_local_inventory_ledger (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				store_id TEXT NOT NULL,
				variant_id TEXT NOT NULL,
				quantity_delta INTEGER NOT NULL,
				reason TEXT NOT NULL,
				note TEXT,
				created_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_zone_local_inventory_ledger_variant
				ON zone_local_inventory_ledger (workspace_id, variant_id, created_at DESC);

			CREATE TABLE IF NOT EXISTS zone_local_projections (
				id TEXT PRIMARY KEY,
				workspace_id TEXT NOT NULL,
				scope TEXT NOT NULL,
				store_id TEXT NOT NULL,
				published_at TEXT NOT NULL,
				revoked_at TEXT,
				payload_json TEXT NOT NULL,
				last_projected_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_zone_local_projections_workspace_scope
				ON zone_local_projections (workspace_id, scope, updated_at DESC);
		`);
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: ZONE_APP_ID });
    const count = (table) => this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ?`).get(this.workspace.workspaceId)?.count ?? 0;
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      storeCount: count("zone_local_stores"),
      productCount: count("zone_local_products"),
      variantCount: count("zone_local_variants"),
      inventoryLedgerCount: count("zone_local_inventory_ledger"),
      projectionCount: count("zone_local_projections"),
      localCatalog: "enabled",
      checkoutLocal: false,
      paymentProcessingLocal: false,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listStores() {
    return this.db.prepare("SELECT * FROM zone_local_stores WHERE workspace_id = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId).map((row) => ({
      id: rowString(row, "id"),
      workspaceId: rowString(row, "workspace_id"),
      slug: rowString(row, "slug"),
      name: rowString(row, "name"),
      description: readOptionalString(row.description),
      accentColor: readOptionalString(row.accent_color),
      currency: rowString(row, "currency"),
      timezone: rowString(row, "timezone"),
      status: rowString(row, "status"),
      supportEmail: readOptionalString(row.support_email),
      createdAt: rowString(row, "created_at"),
      updatedAt: rowString(row, "updated_at")
    }));
  }
  getStore(idOrSlug) {
    return this.listStores().find((store) => store.id === idOrSlug || store.slug === idOrSlug) ?? null;
  }
  upsertStore(input) {
    const idOrSlug = readOptionalString(input.id) ?? readOptionalString(input.slug);
    const store = normalizeStore(input, this.workspace.workspaceId, idOrSlug ? this.getStore(idOrSlug) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO zone_local_stores (id, workspace_id, slug, name, description, accent_color, currency, timezone, status, support_email, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(workspace_id, id) DO UPDATE SET
					 slug = excluded.slug,
					 name = excluded.name,
					 description = excluded.description,
					 accent_color = excluded.accent_color,
					 currency = excluded.currency,
					 timezone = excluded.timezone,
					 status = excluded.status,
					 support_email = excluded.support_email,
					 updated_at = excluded.updated_at`
    ).run(
      store.id,
      store.workspaceId,
      store.slug,
      store.name,
      store.description,
      store.accentColor,
      store.currency,
      store.timezone,
      store.status,
      store.supportEmail,
      store.createdAt,
      store.updatedAt
    );
    return store;
  }
  listProducts(storeId) {
    const rows = storeId ? this.db.prepare("SELECT * FROM zone_local_products WHERE workspace_id = ? AND store_id = ? ORDER BY sort_order ASC, updated_at DESC").all(this.workspace.workspaceId, storeId) : this.db.prepare("SELECT * FROM zone_local_products WHERE workspace_id = ? ORDER BY sort_order ASC, updated_at DESC").all(this.workspace.workspaceId);
    return rows.map((row) => this.productFromRow(row));
  }
  getProduct(storeId, slugOrId) {
    return this.listProducts(storeId).find((product) => product.id === slugOrId || product.slug === slugOrId) ?? null;
  }
  upsertProduct(input) {
    const storeId = readString2(input.storeId ?? input.store_id, "storeId");
    if (!this.getStore(storeId)) {
      throw new Error(`Local store ${storeId} does not exist. Import or upsert the store before adding products.`);
    }
    const idOrSlug = readOptionalString(input.id) ?? readOptionalString(input.slug);
    const product = normalizeProduct(input, this.workspace.workspaceId, idOrSlug ? this.getProduct(storeId, idOrSlug) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO zone_local_products (id, workspace_id, store_id, slug, title, description, collection, tags_json, featured_image_url, is_active, is_published, sort_order, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(workspace_id, id) DO UPDATE SET
					 store_id = excluded.store_id,
					 slug = excluded.slug,
					 title = excluded.title,
					 description = excluded.description,
					 collection = excluded.collection,
					 tags_json = excluded.tags_json,
					 featured_image_url = excluded.featured_image_url,
					 is_active = excluded.is_active,
					 is_published = excluded.is_published,
					 sort_order = excluded.sort_order,
					 updated_at = excluded.updated_at`
    ).run(
      product.id,
      product.workspaceId,
      product.storeId,
      product.slug,
      product.title,
      product.description,
      product.collection,
      JSON.stringify(product.tags),
      product.featuredImageUrl,
      product.isActive ? 1 : 0,
      product.isPublished ? 1 : 0,
      product.sortOrder,
      product.createdAt,
      product.updatedAt
    );
    for (const variant of product.variants) this.upsertVariant(variant);
    return this.getProduct(product.storeId, product.id) ?? product;
  }
  listCollections(storeId) {
    return [
      ...new Set(
        this.listProducts(storeId).map((product) => product.collection).filter((collection) => typeof collection === "string" && collection.length > 0)
      )
    ].sort((a, b) => a.localeCompare(b));
  }
  adjustInventory(input) {
    const storeId = readString2(input.storeId ?? input.store_id, "storeId");
    const variantId = readString2(input.variantId ?? input.variant_id, "variantId");
    const quantityDelta = readNumber(input.quantityDelta ?? input.quantity_delta);
    const variant = this.getVariant(storeId, variantId);
    if (!variant) throw new Error(`Local variant ${variantId} does not exist.`);
    const nextStock = Math.max(0, variant.stockOnHand + quantityDelta);
    const now = isoNow3();
    this.db.prepare(
      `UPDATE zone_local_variants
				 SET stock_on_hand = ?, updated_at = ?
				 WHERE workspace_id = ? AND store_id = ? AND id = ?`
    ).run(nextStock, now, this.workspace.workspaceId, storeId, variantId);
    const entry = normalizeLedgerEntry(
      {
        storeId,
        variantId,
        quantityDelta,
        reason: input.reason ?? "manual_adjustment",
        note: input.note,
        createdAt: now
      },
      this.workspace.workspaceId,
      storeId
    );
    this.insertLedgerEntry(entry);
    return {
      ok: true,
      storeId,
      variantId,
      quantityDelta,
      stockOnHand: nextStock,
      checkoutLocal: false
    };
  }
  getCatalogProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM zone_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildCatalogProjectionEnvelope(input) {
    const store = this.getStore(input.storeId);
    if (!store) throw new Error(`Local Zone store not found: ${input.storeId}`);
    const products = this.listProducts(store.id);
    const variants = products.flatMap((product) => product.variants);
    const collections = new Set(
      products.map((product) => product.collection).filter((collection) => Boolean(collection))
    );
    const ledger = this.listInventoryLedger().filter((entry) => entry.storeId === store.id);
    const projectionId = stableCatalogProjectionId({
      workspaceId: this.workspace.workspaceId,
      storeId: store.id
    });
    const existing = this.getCatalogProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    return {
      version: 1,
      appId: ZONE_APP_ID,
      event: {
        type: input.action === "publish" ? "zone.catalog.projection.upserted" : "zone.catalog.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "catalog-summary",
          storeId: store.id,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        store: {
          id: store.id,
          slug: store.slug,
          name: store.name,
          status: store.status,
          currency: store.currency,
          timezone: store.timezone,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          storeId: store.id,
          productCount: products.length,
          publishedProductCount: products.filter((product) => product.isPublished).length,
          activeProductCount: products.filter((product) => product.isActive).length,
          variantCount: variants.length,
          activeVariantCount: variants.filter((variant) => variant.isActive).length,
          totalStockOnHand: variants.reduce((total, variant) => total + variant.stockOnHand, 0),
          totalReservedStock: variants.reduce((total, variant) => total + variant.reservedStock, 0),
          totalAvailableStock: variants.reduce((total, variant) => total + variant.availableStock, 0),
          lowStockVariantCount: variants.filter((variant) => variant.availableStock <= variant.lowStockThreshold).length,
          collectionCount: collections.size,
          inventoryLedgerCount: ledger.length
        },
        exclusions: [
          "product titles",
          "product descriptions",
          "product slugs",
          "product tags",
          "collection names",
          "featured image URLs",
          "variant SKUs",
          "variant titles",
          "variant option summaries",
          "variant prices",
          "support email addresses",
          "inventory adjustment notes",
          "raw inventory ledger rows",
          "transfer bundle payloads",
          "orders and customer records",
          "checkout sessions",
          "Stripe identifiers and webhook payloads",
          "public storefront delivery state"
        ]
      }
    };
  }
  recordCatalogProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO zone_local_projections (
					id, workspace_id, scope, store_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					workspace_id = excluded.workspace_id,
					scope = excluded.scope,
					store_id = excluded.store_id,
					published_at = excluded.published_at,
					revoked_at = excluded.revoked_at,
					payload_json = excluded.payload_json,
					last_projected_at = excluded.last_projected_at,
					updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.storeId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: ZONE_CATALOG_SCHEMA,
      version: 1,
      stores: this.listStores(),
      products: this.listProducts(),
      inventoryLedger: this.listInventoryLedger()
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: ZONE_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: ZONE_CATALOG_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: ZONE_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: ZONE_CATALOG_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: ZONE_APP_ID,
      payloadSchema: ZONE_CATALOG_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? ZONE_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? ZONE_CATALOG_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: ZONE_APP_ID,
      payloadSchema: ZONE_CATALOG_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const store of normalized.stores) this.upsertStore({ ...store });
      for (const product of normalized.products) this.upsertProduct({ ...product });
      for (const entry of normalized.inventoryLedger) this.insertLedgerEntry(entry);
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: ZONE_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? ZONE_CATALOG_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        storeCount: normalized.stores.length,
        productCount: normalized.products.length,
        variantCount: normalized.products.reduce((count, product) => count + product.variants.length, 0),
        transferId,
        checkoutLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  productFromRow(row) {
    const product = {
      id: rowString(row, "id"),
      workspaceId: rowString(row, "workspace_id"),
      storeId: rowString(row, "store_id"),
      slug: rowString(row, "slug"),
      title: rowString(row, "title"),
      description: readOptionalString(row.description),
      collection: readOptionalString(row.collection),
      tags: parseJsonColumn(row.tags_json, []),
      featuredImageUrl: readOptionalString(row.featured_image_url),
      isActive: readBoolean(row.is_active, true),
      isPublished: readBoolean(row.is_published),
      sortOrder: readNumber(row.sort_order),
      createdAt: rowString(row, "created_at"),
      updatedAt: rowString(row, "updated_at"),
      variants: []
    };
    product.variants = this.listVariants(product.storeId, product.id);
    return product;
  }
  listVariants(storeId, productId) {
    return this.db.prepare(
      "SELECT * FROM zone_local_variants WHERE workspace_id = ? AND store_id = ? AND product_id = ? ORDER BY created_at ASC"
    ).all(this.workspace.workspaceId, storeId, productId).map((row) => {
      const stockOnHand = readNumber(row.stock_on_hand);
      const reservedStock = readNumber(row.reserved_stock);
      return {
        id: rowString(row, "id"),
        workspaceId: rowString(row, "workspace_id"),
        storeId: rowString(row, "store_id"),
        productId: rowString(row, "product_id"),
        sku: rowString(row, "sku"),
        title: rowString(row, "title"),
        optionSummary: readOptionalString(row.option_summary),
        priceCents: readNumber(row.price_cents),
        compareAtPriceCents: readOptionalNullableNumber(row.compare_at_price_cents),
        stockOnHand,
        reservedStock,
        availableStock: Math.max(0, stockOnHand - reservedStock),
        lowStockThreshold: readNumber(row.low_stock_threshold),
        isActive: readBoolean(row.is_active, true),
        createdAt: rowString(row, "created_at"),
        updatedAt: rowString(row, "updated_at")
      };
    });
  }
  getVariant(storeId, variantId) {
    const row = this.db.prepare("SELECT * FROM zone_local_variants WHERE workspace_id = ? AND store_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, storeId, variantId);
    if (!row) return null;
    return this.listVariants(storeId, rowString(row, "product_id")).find((variant) => variant.id === variantId) ?? null;
  }
  upsertVariant(variant) {
    this.db.prepare(
      `INSERT INTO zone_local_variants (id, workspace_id, store_id, product_id, sku, title, option_summary, price_cents, compare_at_price_cents, stock_on_hand, reserved_stock, low_stock_threshold, is_active, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(workspace_id, id) DO UPDATE SET
					 store_id = excluded.store_id,
					 product_id = excluded.product_id,
					 sku = excluded.sku,
					 title = excluded.title,
					 option_summary = excluded.option_summary,
					 price_cents = excluded.price_cents,
					 compare_at_price_cents = excluded.compare_at_price_cents,
					 stock_on_hand = excluded.stock_on_hand,
					 reserved_stock = excluded.reserved_stock,
					 low_stock_threshold = excluded.low_stock_threshold,
					 is_active = excluded.is_active,
					 updated_at = excluded.updated_at`
    ).run(
      variant.id,
      variant.workspaceId,
      variant.storeId,
      variant.productId,
      variant.sku,
      variant.title,
      variant.optionSummary,
      variant.priceCents,
      variant.compareAtPriceCents,
      variant.stockOnHand,
      variant.reservedStock,
      variant.lowStockThreshold,
      variant.isActive ? 1 : 0,
      variant.createdAt,
      variant.updatedAt
    );
  }
  insertLedgerEntry(entry) {
    this.db.prepare(
      `INSERT OR REPLACE INTO zone_local_inventory_ledger (id, workspace_id, store_id, variant_id, quantity_delta, reason, note, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.id,
      entry.workspaceId,
      entry.storeId,
      entry.variantId,
      entry.quantityDelta,
      entry.reason,
      entry.note,
      entry.createdAt
    );
  }
  listInventoryLedger() {
    return this.db.prepare("SELECT * FROM zone_local_inventory_ledger WHERE workspace_id = ? ORDER BY created_at DESC").all(this.workspace.workspaceId).map((row) => ({
      id: rowString(row, "id"),
      workspaceId: rowString(row, "workspace_id"),
      storeId: rowString(row, "store_id"),
      variantId: rowString(row, "variant_id"),
      quantityDelta: readNumber(row.quantity_delta),
      reason: rowString(row, "reason"),
      note: readOptionalString(row.note),
      createdAt: rowString(row, "created_at")
    }));
  }
};

// cli/local-plane.ts
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean(value) {
  return value === true;
}
function trimOption(value) {
  const trimmed = value?.trim();
  if (!trimmed) return void 0;
  return trimmed;
}
function resolveZonePlaneConfig(globalOptions, io) {
  return resolvePlaneConfigInspection({
    appId: ZONE_APP_ID,
    env: io.env,
    data: asString(globalOptions["data-plane"]) ?? asString(globalOptions.plane),
    ai: asString(globalOptions.ai),
    localDbPath: asString(globalOptions["local-db"])
  });
}
function isLocalDataRoute(globalOptions, io) {
  return resolveZonePlaneConfig(globalOptions, io).data === "local";
}
function localWorkspace(options, io) {
  const workspaceId = trimOption(asString(options.workspace)) ?? trimOption(io.env.MERE_ZONE_WORKSPACE_ID) ?? trimOption(io.env.MEREZONE_WORKSPACE_ID) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Storefront" : workspaceId
  };
}
function projectionActor(options, io) {
  return {
    publishedByUserId: trimOption(asString(options["published-by-user-id"])) ?? trimOption(io.env.MERE_ZONE_USER_ID) ?? trimOption(io.env.MEREZONE_USER_ID) ?? trimOption(io.env.USER) ?? "local-user",
    publishedByEmail: trimOption(asString(options["published-by-email"])) ?? trimOption(io.env.MERE_ZONE_USER_EMAIL) ?? trimOption(io.env.MEREZONE_USER_EMAIL) ?? trimOption(io.env.EMAIL) ?? null
  };
}
async function openLocalStore(globalOptions, commandOptions, io) {
  const config = resolveZonePlaneConfig(globalOptions, io);
  if (config.data !== "local") {
    throw new Error("This command requires --data-plane local so mere.zone local data stays explicit.");
  }
  return LocalZoneStore.open({
    config,
    workspace: localWorkspace({ ...globalOptions, ...commandOptions }, io)
  });
}
async function withLocalStore(globalOptions, commandOptions, io, handler) {
  const store = await openLocalStore(globalOptions, commandOptions, io);
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
async function handleLocalPlaneInfo(globalOptions, io) {
  const config = resolveZonePlaneConfig(globalOptions, io);
  if (config.data === "local") {
    return withLocalStore(globalOptions, {}, io, (store) => ({
      ok: true,
      app: ZONE_APP_ID,
      dataPlane: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      ...store.info(),
      localAiSupported: false,
      sources: config.sources
    }));
  }
  if (asBoolean(globalOptions.json)) {
    return {
      ok: true,
      app: ZONE_APP_ID,
      dataPlane: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localCatalog: "available",
      checkoutLocal: false,
      paymentProcessingLocal: false,
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
  io.stdout("Hosted checkout, Stripe webhooks, refunds, fulfillment effects, and public storefront delivery remain Cloudflare-owned unless --data-plane local is selected for catalog archive commands.\n");
  return "";
}
async function handleLocalExport(globalOptions, options, io) {
  return withLocalStore(globalOptions, options, io, async (store) => {
    const bundle = store.exportBundle();
    const output = asString(options.output);
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
      storeCount: bundle.payload.stores.length,
      productCount: bundle.payload.products.length,
      variantCount: bundle.payload.products.reduce((count, product) => count + product.variants.length, 0)
    };
  });
}
async function handleLocalImport(globalOptions, options, io) {
  return withLocalStore(globalOptions, options, io, async (store) => {
    const value = JSON.parse(await readFile2(readRequired(options, "file"), "utf8"));
    return asBoolean(options["dry-run"]) ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalStoreCommand(action, globalOptions, options, positionals, io) {
  return withLocalStore(globalOptions, options, io, (store) => {
    if (action === "list") return store.listStores();
    if (action === "show") {
      const id = positionals[0];
      if (!id) throw new Error("store show requires <id|slug>.");
      return store.getStore(id);
    }
    if (action === "upsert") {
      const data = JSON.parse(asString(options.data) ?? "{}");
      return store.upsertStore(data);
    }
    throw new Error("Unknown local store action: expected list, show, or upsert.");
  });
}
async function handleLocalProductsCommand(action, globalOptions, options, positionals, io) {
  return withLocalStore(globalOptions, options, io, (store) => {
    const storeId = readRequired(options, "store");
    if (action === "list") return store.listProducts(storeId);
    if (action === "show") {
      const slugOrId = positionals[0];
      if (!slugOrId) throw new Error("products show requires <id|slug>.");
      return store.getProduct(storeId, slugOrId);
    }
    throw new Error("Unknown local products action: expected list or show.");
  });
}
async function handleLocalProductCommand(action, globalOptions, options, io) {
  if (action !== "upsert") throw new Error("Unknown local product action: expected upsert.");
  return withLocalStore(globalOptions, options, io, (store) => {
    const data = JSON.parse(asString(options.data) ?? "{}");
    return store.upsertProduct({
      ...data,
      storeId: readRequired(options, "store")
    });
  });
}
async function handleLocalCatalogProjection(action, globalOptions, options, io) {
  if (action !== "publish" && action !== "revoke") {
    throw new Error("Unknown local catalog action: expected publish or revoke.");
  }
  return withLocalStore(globalOptions, options, io, async (store) => {
    const envelope = store.buildCatalogProjectionEnvelope({
      action,
      storeId: readRequired(options, "store"),
      ...projectionActor(options, io)
    });
    if (asBoolean(options["dry-run"])) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: ZONE_APP_ID,
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
        dataPlane: "local",
        projection: "cloudflare",
        action,
        projectionId: envelope.event.projection.id,
        receiverUrl,
        event: envelope
      };
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: ZONE_APP_ID,
      env: io.env,
      receiverUrl: trimOption(asString(options["projection-url"])),
      bearerToken: trimOption(asString(options["projection-token"])),
      event: envelope,
      fetchImpl: async (input, init) => (io.fetchImpl ?? fetch)(input, init)
    });
    store.recordCatalogProjection(envelope);
    return {
      ok: true,
      dataPlane: "local",
      projection: "cloudflare",
      action,
      projectionId: envelope.event.projection.id,
      receiverUrl: delivery.receiverUrl,
      status: delivery.status,
      receiver: delivery.responseJson,
      summary: envelope.event.summary
    };
  });
}
async function handleLocalCollectionsCommand(action, globalOptions, options, io) {
  if (action !== "list") throw new Error("Unknown local collections action: expected list.");
  return withLocalStore(globalOptions, options, io, (store) => store.listCollections(readRequired(options, "store")));
}
async function handleLocalInventoryCommand(action, globalOptions, options, io) {
  if (action !== "adjust") throw new Error("Unknown local inventory action: expected adjust.");
  return withLocalStore(
    globalOptions,
    options,
    io,
    (store) => store.adjustInventory({
      storeId: readRequired(options, "store"),
      variantId: readRequired(options, "variant"),
      quantityDelta: readRequired(options, "quantity-delta"),
      note: asString(options.note)
    })
  );
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
  "data-plane": "string",
  plane: "string",
  ai: "string",
  "local-db": "string",
  "projection-url": "string",
  "projection-token": "string",
  "published-by-user-id": "string",
  "published-by-email": "string",
  "dry-run": "boolean",
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
  --data-plane local|cloud
                      Choose supported local/cloud data-plane commands
  --ai local|cloud     Choose AI plane for local-plane inspection
  --local-db PATH      Override the shared Mere local-plane SQLite path
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
  plane info
  export --workspace WORKSPACE_ID --output ./zone-catalog.bundle.json
  import --workspace WORKSPACE_ID --file ./zone-catalog.bundle.json [--dry-run]
  catalog publish --store STORE_ID --projection-url URL --projection-token TOKEN [--dry-run]
  catalog revoke --store STORE_ID --projection-url URL --projection-token TOKEN [--dry-run]

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

Local plane:
  --data-plane local currently supports store/product/catalog/inventory archive commands, selected catalog projection, plane info, export, and import.
  Hosted checkout, Stripe webhooks, refunds, fulfillment effects, order/customer records, and public storefront delivery remain Cloudflare/Stripe-owned.
`;
var activeSession = null;
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
    app: "mere-zone",
    namespace: "zone",
    aliases: ["mere-zone", "merezone"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_ZONE_BASE_URL", "MEREZONE_BASE_URL"],
    sessionPath: "~/.local/state/mere-zone/session.json",
    globalFlags: [
      "base-url",
      "workspace",
      "data-plane",
      "plane",
      "ai",
      "local-db",
      "json",
      "yes",
      "confirm",
      "projection-url",
      "projection-token",
      "published-by-user-id",
      "published-by-email",
      "dry-run"
    ],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a workspace.", {
        auth: "session",
        risk: "write",
        positionals: ["workspace"]
      }),
      manifestCommand(["plane", "info"], "Show local/cloud data and AI plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export local catalog transfer bundle.", { auth: "none", risk: "read", flags: ["workspace", "output"] }),
      manifestCommand(["import"], "Import local catalog transfer bundle.", { auth: "none", risk: "write", flags: ["workspace", "file", "dry-run"] }),
      manifestCommand(["catalog", "publish"], "Publish selected local catalog summary to the Business projection receiver.", {
        auth: "none",
        risk: "external",
        flags: ["store"],
        auditDefault: true
      }),
      manifestCommand(["catalog", "revoke"], "Revoke selected local catalog summary from the Business projection receiver.", {
        auth: "none",
        risk: "external",
        flags: ["store"],
        auditDefault: true
      }),
      manifestCommand(["store", "list"], "List stores.", { auditDefault: true }),
      manifestCommand(["store", "show"], "Show a store.", { positionals: ["store"] }),
      manifestCommand(["store", "upsert"], "Upsert a local store.", { risk: "write", supportsData: true, flags: ["data", "data-file"] }),
      manifestCommand(["products", "list"], "List products.", { flags: ["store", "collection", "published"] }),
      manifestCommand(["products", "show"], "Show a product.", { positionals: ["productSlug"], flags: ["store"] }),
      manifestCommand(["product", "upsert"], "Upsert a product.", {
        risk: "write",
        supportsData: true,
        flags: ["store", "data", "data-file"]
      }),
      manifestCommand(["collections", "list"], "List collections.", { flags: ["store"] }),
      manifestCommand(["settings", "update"], "Update store settings.", {
        risk: "write",
        flags: ["store", "name", "description", "accent-color", "support-email", "stripe-account-id"]
      }),
      manifestCommand(["inventory", "adjust"], "Adjust inventory.", {
        risk: "external",
        requiresYes: true,
        flags: ["store", "variant", "quantity-delta", "note"]
      }),
      manifestCommand(["orders", "list"], "List orders.", { flags: ["store"] }),
      manifestCommand(["orders", "show"], "Show an order.", { positionals: ["orderNumber"], flags: ["store"] }),
      manifestCommand(["order", "fulfill"], "Fulfill an order.", {
        risk: "external",
        requiresYes: true,
        positionals: ["orderId"],
        flags: ["tracking-number", "tracking-url"]
      }),
      manifestCommand(["order", "refund"], "Refund an order.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        positionals: ["orderId"],
        flags: ["order-item", "restock"]
      }),
      manifestCommand(["customers", "list"], "List customers.", { flags: ["store"] }),
      manifestCommand(["stripe", "status"], "Show Stripe status.", { auditDefault: true, flags: ["store"] }),
      manifestCommand(["checkout", "create"], "Create checkout.", { risk: "write", supportsData: true, flags: ["slug", "data", "data-file"] }),
      manifestCommand(["workspace", "provision"], "Provision workspace connection.", {
        auth: "token",
        risk: "write",
        flags: ["workspace", "slug", "name", "webhook-url", "webhook-bearer-token"]
      }),
      manifestCommand(["workspace", "sync"], "Sync workspace connection.", {
        auth: "token",
        risk: "write",
        flags: ["workspace", "slug", "name", "webhook-url", "webhook-bearer-token"]
      }),
      manifestCommand(["workspace", "bootstrap"], "Bootstrap workspace connection.", {
        auth: "token",
        risk: "write",
        flags: ["workspace", "slug", "name", "webhook-url", "webhook-bearer-token"]
      }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", {
        auth: "token",
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        flags: ["workspace"]
      }),
      manifestCommand(["workspace", "command"], "Run workspace command.", {
        auth: "token",
        risk: "external",
        supportsData: true,
        positionals: ["command"],
        flags: ["workspace", "data", "data-file"]
      }),
      manifestCommand(["workspace", "order"], "Lookup workspace order.", {
        auth: "token",
        positionals: ["orderNumber"],
        flags: ["workspace"]
      }),
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
function asString2(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean2(value) {
  return value === true;
}
function trimOption2(value) {
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
  const value = trimOption2(asString2(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`, 2);
  }
  return value;
}
function optionalString(options, name) {
  return trimOption2(asString2(options[name]));
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
    return parseJsonObject(await readFile3(file, "utf8"), "--data-file");
  }
  return {};
}
function requireYes(options, label, target) {
  if (!asBoolean2(options.yes)) {
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
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
function resolveBaseUrl(options, env) {
  return trimOption2(asString2(options["base-url"])) ?? trimOption2(env.MERE_ZONE_BASE_URL) ?? trimOption2(env.MEREZONE_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveRequestedWorkspace(options, env) {
  return trimOption2(asString2(options.workspace)) ?? trimOption2(env.MERE_ZONE_WORKSPACE_ID) ?? trimOption2(env.MEREZONE_WORKSPACE_ID);
}
function resolveInternalToken(options, env) {
  const token = trimOption2(asString2(options.token)) ?? trimOption2(env.MERE_ZONE_INTERNAL_TOKEN) ?? trimOption2(env.MEREZONE_INTERNAL_TOKEN) ?? trimOption2(env.INTERNAL_SERVICE_TOKEN);
  if (!token) {
    throw new CliError("This command requires --token or MERE_ZONE_INTERNAL_TOKEN.", 3);
  }
  return token;
}
async function resolveAdminToken(options, io) {
  const baseUrl = resolveBaseUrl(options, io.env);
  const overrideToken = trimOption2(asString2(options.token)) ?? trimOption2(io.env.MERE_ZONE_TOKEN) ?? trimOption2(io.env.MEREZONE_TOKEN);
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
  "plane",
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
  "catalog",
  "export",
  "import",
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
        published: asBoolean2(options.published) ? "true" : void 0
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
        restock: asBoolean2(options.restock)
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
    return asBoolean2(options.json) ? session.workspaces : session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available.";
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
    return asBoolean2(options.json) ? result : [
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
    return asBoolean2(options.json) ? nextSession : renderSessionSummary(nextSession);
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
  if (asBoolean2(options.json)) {
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
    const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
    if (normalizedArgv.includes("--version") || normalizedArgv.includes("-v") || normalizedArgv[0] === "version") {
      writeText(io, await cliVersion());
      return 0;
    }
    activeSession = await loadSession(io.env);
    const { options: globalOptions, rest } = splitGlobalFlags(normalizedArgv);
    if (asBoolean2(globalOptions.version)) {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest.length === 0 || asBoolean2(globalOptions.help)) {
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
      if (asBoolean2(globalOptions.json)) {
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
        output: "string",
        file: "string",
        "dry-run": "boolean",
        "projection-url": "string",
        "projection-token": "string",
        "published-by-user-id": "string",
        "published-by-email": "string",
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
    const localData = isLocalDataRoute(globalOptions, io);
    let result;
    if (group === "plane" && action === "info") {
      result = await handleLocalPlaneInfo(globalOptions, io);
    } else if (group === "export") {
      const parsed = parseFlags(rest.slice(1), {
        workspace: "string",
        output: "string"
      });
      result = await handleLocalExport(globalOptions, { ...globalOptions, ...parsed.options }, io);
    } else if (group === "import") {
      const parsed = parseFlags(rest.slice(1), {
        workspace: "string",
        file: "string",
        "dry-run": "boolean"
      });
      result = await handleLocalImport(globalOptions, { ...globalOptions, ...parsed.options }, io);
    } else if (localData && group === "store") {
      if (action === "upsert") {
        const data = await readJsonBody(options);
        result = await handleLocalStoreCommand(action, globalOptions, { ...options, data: JSON.stringify(data) }, commandOptions.positionals, io);
      } else {
        result = await handleLocalStoreCommand(action, globalOptions, options, commandOptions.positionals, io);
      }
    } else if (localData && group === "products") {
      result = await handleLocalProductsCommand(action, globalOptions, options, commandOptions.positionals, io);
    } else if (localData && group === "collections" && action === "list") {
      result = await handleLocalCollectionsCommand(action, globalOptions, options, io);
    } else if (localData && group === "product" && action === "upsert") {
      const data = await readJsonBody(options);
      result = await handleLocalProductCommand(action, globalOptions, { ...options, data: JSON.stringify(data) }, io);
    } else if (localData && group === "catalog") {
      const parsed = parseFlags(rest.slice(2), {
        store: "string",
        "projection-url": "string",
        "projection-token": "string",
        "published-by-user-id": "string",
        "published-by-email": "string",
        "dry-run": "boolean"
      });
      result = await handleLocalCatalogProjection(action, globalOptions, { ...options, ...parsed.options }, io);
    } else if (localData && group === "inventory" && action === "adjust") {
      if (optionalNumber(options, "quantity-delta") !== void 0 && Number(optionalString(options, "quantity-delta")) < 0) {
        requireYes(options, "adjust local inventory", requiredString(options, "variant"));
      }
      result = await handleLocalInventoryCommand(action, globalOptions, options, io);
    } else if (localData) {
      throw new CliError(`--data-plane local is not supported for ${group}. Supported local commands are plane info, store, products, product upsert, catalog publish/revoke, collections list, inventory adjust, export, and import.`, 2);
    } else if (group === "store") {
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
