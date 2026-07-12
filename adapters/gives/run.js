#!/usr/bin/env node

// cli/zerodonate.ts
import { mkdir as mkdir4, readFile as readFile3, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, resolve as resolvePath2 } from "node:path";

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
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d58c11277d08e28fc88399d6fc968ff2/node_modules/@mere/cli-auth/src/session.ts
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

// cli/local-plane.ts
import { mkdir as mkdir3, readFile as readFile2, writeFile } from "node:fs/promises";
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
var GIVES_APP_ID = "mere-gives";
var GIVES_DONOR_LEDGER_SCHEMA = "mere.gives.donor-ledger.v1";
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function isRecord2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function readString2(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required for local mere.gives records.`);
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
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)).filter(Boolean) : [];
  } catch {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
}
function readStripeRefs(input) {
  const refs = isRecord2(input.stripeRefs) ? input.stripeRefs : input;
  return {
    checkoutSessionId: readOptionalString(refs.checkoutSessionId ?? refs.stripe_checkout_session_id),
    paymentIntentId: readOptionalString(refs.paymentIntentId ?? refs.stripe_payment_intent_id),
    subscriptionId: readOptionalString(refs.subscriptionId ?? refs.stripe_subscription_id),
    invoiceId: readOptionalString(refs.invoiceId ?? refs.stripe_invoice_id),
    chargeId: readOptionalString(refs.chargeId ?? refs.stripe_charge_id)
  };
}
function normalizeDonor(input, workspaceId, existing) {
  const now = isoNow3();
  const email = readString2(input.email, "email", existing?.email).toLowerCase();
  return {
    id: existing?.id ?? readOptionalString(input.id) ?? email,
    workspaceId,
    email,
    firstName: readOptionalString(input.firstName ?? input.first_name, existing?.firstName),
    lastName: readOptionalString(input.lastName ?? input.last_name, existing?.lastName),
    phone: readOptionalString(input.phone, existing?.phone),
    totalDonatedCents: readNumber(input.totalDonatedCents ?? input.total_donated_cents, existing?.totalDonatedCents ?? 0),
    donationCount: readNumber(input.donationCount ?? input.donation_count, existing?.donationCount ?? 0),
    tags: readTags(input.tags ?? input.tags_json ?? existing?.tags),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt ?? input.created_at) ?? now,
    updatedAt: readOptionalString(input.updatedAt ?? input.updated_at) ?? now
  };
}
function normalizeDonation(input, workspaceId, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? readString2(input.id, "id"),
    workspaceId,
    donorId: readOptionalString(input.donorId ?? input.donor_id, existing?.donorId),
    campaignId: readOptionalString(input.campaignId ?? input.campaign_id, existing?.campaignId),
    amountCents: readNumber(input.amountCents ?? input.amount_cents, existing?.amountCents ?? 0),
    currency: readOptionalString(input.currency, existing?.currency)?.toUpperCase() ?? "USD",
    donorName: readString2(input.donorName ?? input.donor_name, "donorName", existing?.donorName),
    donorEmail: readString2(input.donorEmail ?? input.donor_email, "donorEmail", existing?.donorEmail).toLowerCase(),
    status: readOptionalString(input.status, existing?.status) ?? "completed",
    source: readOptionalString(input.source, existing?.source) ?? "local",
    isRecurring: readBoolean(input.isRecurring ?? input.is_recurring, existing?.isRecurring ?? false),
    stripeRefs: readStripeRefs(input),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt ?? input.created_at) ?? now,
    updatedAt: readOptionalString(input.updatedAt ?? input.updated_at) ?? now
  };
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== GIVES_DONOR_LEDGER_SCHEMA || value.version !== 1) {
    throw new Error(`Gives transfer payload must be ${GIVES_DONOR_LEDGER_SCHEMA} version 1.`);
  }
  return {
    kind: GIVES_DONOR_LEDGER_SCHEMA,
    version: 1,
    donors: Array.isArray(value.donors) ? value.donors.map((entry) => normalizeDonor(isRecord2(entry) ? entry : {}, workspaceId)) : [],
    donations: Array.isArray(value.donations) ? value.donations.map((entry) => normalizeDonation(isRecord2(entry) ? entry : {}, workspaceId)) : []
  };
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
function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item)?.trim();
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
function stableDonorLedgerProjectionId(workspaceId) {
  const digest = createHash2("sha256").update([GIVES_APP_ID, workspaceId, "donor-ledger"].join("\n")).digest("hex").slice(0, 24);
  return `givpr_${digest}`;
}
var LocalGivesStore = class _LocalGivesStore {
  constructor(dbPath, db, config, workspace) {
    this.dbPath = dbPath;
    this.db = db;
    this.config = config;
    this.workspace = workspace;
  }
  static async open(input) {
    const opened = await openLocalPlaneDatabase(input.config);
    const db = opened.db;
    registerPlaneApp(opened.db, GIVES_APP_ID, "Mere Gives");
    registerPlaneTransferSchema(opened.db, GIVES_APP_ID, {
      payloadSchema: GIVES_DONOR_LEDGER_SCHEMA,
      displayName: "Gives donor ledger transfer",
      description: "Portable mere.gives donor and donation archive records; payment processing stays hosted."
    });
    upsertPlaneWorkspace(opened.db, GIVES_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalGivesStore(opened.dbPath, db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gives_local_donors (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        total_donated_cents INTEGER NOT NULL DEFAULT 0,
        donation_count INTEGER NOT NULL DEFAULT 0,
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_gives_local_donors_email
        ON gives_local_donors (workspace_id, email);

      CREATE TABLE IF NOT EXISTS gives_local_donations (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        donor_id TEXT,
        campaign_id TEXT,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        donor_name TEXT NOT NULL,
        donor_email TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        stripe_refs_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_gives_local_donations_created
        ON gives_local_donations (workspace_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS gives_local_projections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gives_local_projections_workspace_scope
        ON gives_local_projections (workspace_id, scope, updated_at DESC);
    `);
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: GIVES_APP_ID });
    const count = (table) => this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ?`).get(this.workspace.workspaceId)?.count ?? 0;
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      donorCount: count("gives_local_donors"),
      donationCount: count("gives_local_donations"),
      projectionCount: count("gives_local_projections"),
      localDonorLedger: "enabled",
      paymentProcessingLocal: false,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listDonors() {
    return this.db.prepare("SELECT * FROM gives_local_donors WHERE workspace_id = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId).map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      email: String(row.email),
      firstName: readOptionalString(row.first_name),
      lastName: readOptionalString(row.last_name),
      phone: readOptionalString(row.phone),
      totalDonatedCents: readNumber(row.total_donated_cents),
      donationCount: readNumber(row.donation_count),
      tags: parseJsonColumn(row.tags_json, []),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }
  getDonor(idOrEmail) {
    return this.listDonors().find((donor) => donor.id === idOrEmail || donor.email === idOrEmail.toLowerCase()) ?? null;
  }
  upsertDonor(input) {
    const idOrEmail = readOptionalString(input.id) ?? readOptionalString(input.email);
    const donor = normalizeDonor(input, this.workspace.workspaceId, idOrEmail ? this.getDonor(idOrEmail) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO gives_local_donors (id, workspace_id, email, first_name, last_name, phone, total_donated_cents, donation_count, tags_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(workspace_id, id) DO UPDATE SET
           email = excluded.email,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           phone = excluded.phone,
           total_donated_cents = excluded.total_donated_cents,
           donation_count = excluded.donation_count,
           tags_json = excluded.tags_json,
           updated_at = excluded.updated_at`
    ).run(
      donor.id,
      donor.workspaceId,
      donor.email,
      donor.firstName,
      donor.lastName,
      donor.phone,
      donor.totalDonatedCents,
      donor.donationCount,
      JSON.stringify(donor.tags),
      donor.createdAt,
      donor.updatedAt
    );
    return donor;
  }
  listDonations(limit = 50) {
    return this.db.prepare("SELECT * FROM gives_local_donations WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?").all(this.workspace.workspaceId, limit).map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      donorId: readOptionalString(row.donor_id),
      campaignId: readOptionalString(row.campaign_id),
      amountCents: readNumber(row.amount_cents),
      currency: String(row.currency),
      donorName: String(row.donor_name),
      donorEmail: String(row.donor_email),
      status: String(row.status),
      source: String(row.source),
      isRecurring: readBoolean(row.is_recurring),
      stripeRefs: parseJsonColumn(row.stripe_refs_json, {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }
  getDonation(id) {
    return this.listDonations(5e3).find((donation) => donation.id === id) ?? null;
  }
  upsertDonation(input) {
    const id = readOptionalString(input.id);
    const donation = normalizeDonation(input, this.workspace.workspaceId, id ? this.getDonation(id) ?? void 0 : void 0);
    this.db.prepare(
      `INSERT INTO gives_local_donations (id, workspace_id, donor_id, campaign_id, amount_cents, currency, donor_name, donor_email, status, source, is_recurring, stripe_refs_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(workspace_id, id) DO UPDATE SET
           donor_id = excluded.donor_id,
           campaign_id = excluded.campaign_id,
           amount_cents = excluded.amount_cents,
           currency = excluded.currency,
           donor_name = excluded.donor_name,
           donor_email = excluded.donor_email,
           status = excluded.status,
           source = excluded.source,
           is_recurring = excluded.is_recurring,
           stripe_refs_json = excluded.stripe_refs_json,
           updated_at = excluded.updated_at`
    ).run(
      donation.id,
      donation.workspaceId,
      donation.donorId,
      donation.campaignId,
      donation.amountCents,
      donation.currency,
      donation.donorName,
      donation.donorEmail,
      donation.status,
      donation.source,
      donation.isRecurring ? 1 : 0,
      JSON.stringify(donation.stripeRefs),
      donation.createdAt,
      donation.updatedAt
    );
    return donation;
  }
  getDonorLedgerProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM gives_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildDonorLedgerProjectionEnvelope(input) {
    const donations = this.listDonations(5e3);
    const projectionId = stableDonorLedgerProjectionId(this.workspace.workspaceId);
    const existing = this.getDonorLedgerProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    const currencyTotals = {};
    for (const donation of donations) {
      const currency = donation.currency || "USD";
      currencyTotals[currency] = (currencyTotals[currency] ?? 0) + donation.amountCents;
    }
    const campaignIds = new Set(donations.map((donation) => donation.campaignId).filter(Boolean));
    return {
      version: 1,
      appId: GIVES_APP_ID,
      event: {
        type: input.action === "publish" ? "gives.donor_ledger.projection.upserted" : "gives.donor_ledger.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "donor-ledger",
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          donorCount: this.listDonors().length,
          donationCount: donations.length,
          recurringDonationCount: donations.filter((donation) => donation.isRecurring).length,
          currencyTotals,
          statusCounts: countBy(donations, (donation) => donation.status),
          sourceCounts: countBy(donations, (donation) => donation.source),
          campaignCount: campaignIds.size
        },
        exclusions: [
          "donor names",
          "donor email addresses",
          "donor phone numbers",
          "donor tags",
          "individual donor ids",
          "individual donation ids",
          "campaign ids",
          "Stripe checkout, payment, subscription, invoice, and charge ids",
          "receipt records",
          "refund and dispute records",
          "exact donation timestamps",
          "raw local donor-ledger rows",
          "transfer bundle payloads",
          "hosted checkout and webhook payloads"
        ]
      }
    };
  }
  recordDonorLedgerProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO gives_local_projections (
          id, workspace_id, scope, published_at, revoked_at, payload_json, last_projected_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          scope = excluded.scope,
          published_at = excluded.published_at,
          revoked_at = excluded.revoked_at,
          payload_json = excluded.payload_json,
          last_projected_at = excluded.last_projected_at,
          updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: GIVES_DONOR_LEDGER_SCHEMA,
      version: 1,
      donors: this.listDonors(),
      donations: this.listDonations(5e3)
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: GIVES_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: GIVES_DONOR_LEDGER_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: GIVES_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: GIVES_DONOR_LEDGER_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: GIVES_APP_ID,
      payloadSchema: GIVES_DONOR_LEDGER_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? GIVES_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? GIVES_DONOR_LEDGER_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: GIVES_APP_ID,
      payloadSchema: GIVES_DONOR_LEDGER_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const donor of normalized.donors) this.upsertDonor({ ...donor });
      for (const donation of normalized.donations) this.upsertDonation({ ...donation });
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: GIVES_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? GIVES_DONOR_LEDGER_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        store: "local",
        workspaceId: this.workspace.workspaceId,
        donorCount: normalized.donors.length,
        donationCount: normalized.donations.length,
        transferId
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
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
function resolveGivesPlaneConfig(globalOptions, io) {
  return resolvePlaneConfigInspection({
    appId: GIVES_APP_ID,
    env: io.env,
    data: asString(globalOptions.store),
    ai: asString(globalOptions.ai),
    localDbPath: asString(globalOptions["local-db"])
  });
}
function isLocalDataRoute(globalOptions, io) {
  return resolveGivesPlaneConfig(globalOptions, io).data === "local";
}
function localWorkspace(options, io) {
  const workspaceId = trimOption(asString(options.tenant)) ?? trimOption(asString(options.workspace)) ?? trimOption(io.env.MERE_GIVES_WORKSPACE) ?? trimOption(io.env.ZERODONATE_WORKSPACE) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Giving" : workspaceId
  };
}
function projectionActor(options, io) {
  return {
    publishedByUserId: trimOption(asString(options["published-by-user-id"])) ?? trimOption(io.env.MERE_GIVES_USER_ID) ?? trimOption(io.env.ZERODONATE_USER_ID) ?? trimOption(io.env.USER) ?? "local-user",
    publishedByEmail: trimOption(asString(options["published-by-email"])) ?? trimOption(io.env.MERE_GIVES_USER_EMAIL) ?? trimOption(io.env.ZERODONATE_USER_EMAIL) ?? trimOption(io.env.EMAIL) ?? null
  };
}
async function openLocalStore(globalOptions, commandOptions, io) {
  const config = resolveGivesPlaneConfig(globalOptions, io);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so mere.gives local data stays explicit.");
  }
  return LocalGivesStore.open({
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
async function handleLocalStoreInfo(globalOptions, io) {
  const config = resolveGivesPlaneConfig(globalOptions, io);
  if (config.data === "local") {
    return withLocalStore(globalOptions, {}, io, (store) => ({
      ok: true,
      app: GIVES_APP_ID,
      store: config.data,
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
      app: GIVES_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localDonorLedger: "available",
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
  io.stdout("Hosted checkout, refunds, Stripe webhooks, receipts, and public donation pages remain Cloudflare-owned unless --store local is selected for donor-ledger archive commands.\n");
  return "";
}
async function handleLocalExport(globalOptions, options, io) {
  return withLocalStore(globalOptions, options, io, async (store) => {
    const bundle = store.exportBundle();
    const output = asString(options.output);
    if (!output) return bundle;
    const target = resolvePath(output);
    await mkdir3(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(bundle, null, 2));
    return {
      ok: true,
      path: target,
      appId: bundle.appId,
      workspaceId: bundle.workspaceId,
      payloadSchema: bundle.payloadSchema,
      payloadSha256: bundle.payloadSha256,
      donorCount: bundle.payload.donors.length,
      donationCount: bundle.payload.donations.length
    };
  });
}
async function handleLocalImport(globalOptions, options, io) {
  return withLocalStore(globalOptions, options, io, async (store) => {
    const value = JSON.parse(await readFile2(readRequired(options, "file"), "utf8"));
    return asBoolean(options["dry-run"]) ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalDonors(action, globalOptions, options, positionals, io) {
  return withLocalStore(globalOptions, options, io, (store) => {
    if (action === "list") return store.listDonors();
    if (action === "show") {
      const id = positionals[0];
      if (!id) throw new Error("donors show requires <id>.");
      return store.getDonor(id);
    }
    if (action === "update") {
      const id = positionals[0];
      if (!id) throw new Error("donors update requires <id>.");
      const data = JSON.parse(String(options.data ?? "{}"));
      return store.upsertDonor({ ...data, id });
    }
    throw new Error("Unknown local donors action: expected list, show, or update.");
  });
}
async function handleLocalDonations(action, globalOptions, options, positionals, io) {
  return withLocalStore(globalOptions, options, io, (store) => {
    if (action === "list") return store.listDonations(Number(asString(options.limit) ?? "50"));
    if (action === "export") return store.exportPayload().donations;
    if (action === "show") {
      const id = positionals[0];
      if (!id) throw new Error("donations show requires <id>.");
      return store.getDonation(id);
    }
    throw new Error("Unknown local donations action: expected list, export, or show.");
  });
}
async function handleLocalLedgerProjection(action, globalOptions, options, io) {
  if (action !== "publish" && action !== "revoke") {
    throw new Error("Unknown local ledger action: expected publish or revoke.");
  }
  return withLocalStore(globalOptions, options, io, async (store) => {
    const envelope = store.buildDonorLedgerProjectionEnvelope({
      action,
      ...projectionActor(options, io)
    });
    if (asBoolean(options["dry-run"])) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: GIVES_APP_ID,
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
        action,
        projectionId: envelope.event.projection.id,
        receiverUrl,
        event: envelope
      };
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: GIVES_APP_ID,
      env: io.env,
      receiverUrl: trimOption(asString(options["projection-url"])),
      bearerToken: trimOption(asString(options["projection-token"])),
      event: envelope,
      fetchImpl: async (input, init) => (io.fetchImpl ?? fetch)(input, init)
    });
    store.recordDonorLedgerProjection(envelope);
    return {
      ok: true,
      store: "local",
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

// cli/zerodonate.ts
var CliError = class extends Error {
};
var DEFAULT_BASE_URL = "https://mere.gives";
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  "business-base-url": "string",
  token: "string",
  workspace: "string",
  store: "string",
  ai: "string",
  "local-db": "string",
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
  --business-base-url URL Override Mere Business for browserless agent login
  --token TOKEN        Override MERE_GIVES_TOKEN
  --workspace ID       Preferred Mere workspace during auth login
  --store local|cloud  Choose supported local/cloud data-plane commands
  --ai local|cloud     Choose AI plane for local-plane inspection
  --local-db PATH      Override the shared Mere local-plane SQLite path
  --json               Write machine-readable JSON
  --version            Show the CLI version
  --no-interactive     Reserved for non-interactive automation
  --yes                Required for destructive automation
  --confirm ID         Exact target required with --yes for destructive commands
  --help               Show this help

Auth:
  completion [bash|zsh|fish]
  auth login
  auth agent-login --workspace WORKSPACE_ID [--business-base-url https://mere.business]
  auth whoami
  auth logout
  store info
  export --tenant TENANT_ID --output ./gives-donor-ledger.bundle.json
  import --tenant TENANT_ID --file ./gives-donor-ledger.bundle.json [--dry-run]
  ledger publish|revoke --tenant TENANT_ID --projection-url URL --projection-token TOKEN [--dry-run]

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

Mere:
  workspace provision --workspace-id ID --slug SLUG --name NAME [--webhook-url URL] [--callback-bearer-token TOKEN]

Environment:
  MERE_GIVES_BASE_URL  Worker URL, for example https://mere.gives or http://127.0.0.1:8787
  MERE_GIVES_TOKEN     Bearer token override for admin/session requests
  MERE_GIVES_WORKSPACE_ID  Default Mere workspace for browser auth login
  ZERODONATE_INTERNAL_TOKEN Internal token for workspace provisioning

Local plane:
  --store local currently supports donor/donation archive commands, donor-ledger projection, store info, export, and import.
  Hosted checkout, refunds, Stripe webhooks, receipts, public donation pages, and payouts remain Cloudflare/Stripe-owned.
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
    app: "mere-gives",
    namespace: "gives",
    aliases: ["mere-gives", "zerodonate"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_GIVES_BASE_URL"],
    sessionPath: "~/.local/state/mere-gives/session.json",
    globalFlags: ["base-url", "business-base-url", "workspace", "store", "ai", "local-db", "json", "yes", "confirm"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "agent-login"], "Create a Gives session from a Business agent session.", {
        auth: "none",
        risk: "write",
        flags: ["workspace", "business-base-url", "base-url"]
      }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write", positionals: ["id|slug|host"] }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["tenant", "yes", "confirm"] }),
      manifestCommand(["workspace", "provision"], "Provision workspace.", { auth: "token", risk: "write", flags: ["workspace-id", "slug", "name", "webhook-url", "callback-bearer-token"] }),
      manifestCommand(["store", "info"], "Show local/cloud data and AI plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export local donor-ledger transfer bundle.", { auth: "none", risk: "read", flags: ["tenant", "output"] }),
      manifestCommand(["import"], "Import local donor-ledger transfer bundle.", { auth: "none", risk: "write", flags: ["tenant", "file", "dry-run"] }),
      manifestCommand(["ledger", "publish"], "Publish selected local donor-ledger summary projection to Business.", { auth: "none", risk: "external", auditDefault: true, flags: ["tenant", "projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"] }),
      manifestCommand(["ledger", "revoke"], "Revoke selected local donor-ledger summary projection from Business.", { auth: "none", risk: "external", auditDefault: true, flags: ["tenant", "projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"] }),
      manifestCommand(["tenant", "show"], "Show tenant.", { auditDefault: true, flags: ["tenant"] }),
      manifestCommand(["tenant", "update"], "Update tenant.", { risk: "write", flags: ["tenant", "name", "description", "accent-color", "notify-emails", "donor-covers-fees-default", "platform-fee-percent"] }),
      manifestCommand(["campaigns", "list"], "List campaigns.", { auditDefault: true, flags: ["tenant"] }),
      manifestCommand(["campaigns", "show"], "Show campaign.", { flags: ["tenant"], positionals: ["id"] }),
      manifestCommand(["campaigns", "create"], "Create campaign.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"] }),
      manifestCommand(["campaigns", "update"], "Update campaign.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"], positionals: ["id"] }),
      manifestCommand(["campaigns", "delete"], "Delete campaign.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["tenant", "yes", "confirm"], positionals: ["id"] }),
      manifestCommand(["donations", "list"], "List donations.", { flags: ["tenant", "limit"] }),
      manifestCommand(["donations", "export"], "Export donations.", { flags: ["tenant"] }),
      manifestCommand(["donations", "show"], "Show donation.", { flags: ["tenant"], positionals: ["id"] }),
      manifestCommand(["donations", "refund"], "Refund donation.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["tenant", "full", "amount-cents", "reason", "yes", "confirm"], positionals: ["id"] }),
      manifestCommand(["donors", "list"], "List donors.", { flags: ["tenant"] }),
      manifestCommand(["donors", "show"], "Show donor.", { flags: ["tenant"], positionals: ["id"] }),
      manifestCommand(["donors", "update"], "Update donor.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"], positionals: ["id"] }),
      manifestCommand(["receipts", "list"], "List receipts.", { flags: ["tenant"] }),
      manifestCommand(["receipts", "show"], "Show receipt.", { flags: ["tenant"], positionals: ["id"] }),
      manifestCommand(["receipts", "download"], "Download receipt.", { flags: ["tenant", "output"], positionals: ["id"] }),
      manifestCommand(["receipts", "year-end"], "Generate year-end receipt bundle.", { risk: "write", flags: ["tenant", "tax-year"] }),
      manifestCommand(["widget", "snippet"], "Print widget snippet.", { flags: ["tenant"] }),
      manifestCommand(["settings", "get"], "Show settings.", { flags: ["tenant"] }),
      manifestCommand(["settings", "update"], "Update settings.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"] }),
      manifestCommand(["events", "list"], "List events.", { flags: ["tenant"] }),
      manifestCommand(["events", "show"], "Show event.", { flags: ["tenant"], positionals: ["id"] }),
      manifestCommand(["events", "create"], "Create event.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"] }),
      manifestCommand(["events", "update"], "Update event.", { risk: "write", supportsData: true, flags: ["tenant", "data", "data-file"], positionals: ["id"] }),
      manifestCommand(["events", "delete"], "Delete event.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["tenant", "yes", "confirm"], positionals: ["id"] }),
      manifestCommand(["stripe", "status"], "Show Stripe status.", { auditDefault: true, flags: ["tenant"] }),
      manifestCommand(["team", "list"], "List team.", { flags: ["tenant"] }),
      manifestCommand(["team", "add"], "Add team member.", { risk: "write", flags: ["tenant", "user", "role"] }),
      manifestCommand(["team", "remove"], "Remove team member.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["tenant", "membership", "yes", "confirm"] }),
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
  const value = trimOption2(asString2(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`);
  }
  return value;
}
function readOptionalStringOption(options, name) {
  return trimOption2(asString2(options[name]));
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
    text = await readFile3(file, "utf8");
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
  if (!asBoolean2(options.yes) && !asBoolean2(globalOptions.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`);
  }
  const confirm = readOptionalStringOption(options, "confirm") ?? readOptionalStringOption(globalOptions, "confirm");
  if (confirm !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`);
  }
}
async function cliVersion() {
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
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
  "export",
  "import",
  "ledger",
  "receipts",
  "settings",
  "store",
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
  return trimOption2(asString2(options["base-url"])) ?? trimOption2(env.MERE_GIVES_BASE_URL) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function resolveRequestedWorkspace(options, env) {
  return trimOption2(asString2(options.workspace)) ?? trimOption2(env.MERE_GIVES_WORKSPACE_ID);
}
function resolveTokenOverride(options, env) {
  return trimOption2(asString2(options.token)) ?? trimOption2(env.MERE_GIVES_TOKEN) ?? trimOption2(env.ZERODONATE_INTERNAL_TOKEN);
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
function normalizeBaseUrl2(value) {
  return value.trim().replace(/\/+$/, "");
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
  throw new CliError("Option --workspace is required when the Business session has multiple workspaces.");
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
    throw new CliError("Mere Business returned an invalid product session response.");
  }
  const record = payload;
  if (typeof record.baseUrl !== "string" || !record.baseUrl.trim()) {
    throw new CliError("Mere Business did not return a Gives base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new CliError("Mere Business did not return a Gives CLI session.");
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
async function loadRefreshedBusinessSession(globalOptions, io) {
  const current = await loadCliSession({ appName: "mere-business", env: io.env });
  if (!current) {
    throw new CliError(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first."
    );
  }
  const workspace = selectBusinessWorkspace(current, resolveRequestedWorkspace(globalOptions, io.env));
  const baseUrl = normalizeBaseUrl2(trimOption2(asString2(globalOptions["business-base-url"])) ?? current.baseUrl);
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
async function agentLogin(globalOptions, io) {
  const business = await loadRefreshedBusinessSession(globalOptions, io);
  const response = await (io.fetchImpl ?? fetch)(
    new URL("/api/cli/v1/auth/product-sessions", business.baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${business.session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        app: "gives",
        workspaceId: business.workspace.id
      })
    }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CliError(productSessionErrorMessage(payload, `Request failed (${response.status.toString()})`));
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession2(product.session, {
    baseUrl: normalizeBaseUrl2(trimOption2(asString2(globalOptions["base-url"])) ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveSession(session, io.env);
  return session;
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
  const tokenOverride = trimOption2(asString2(globalOptions.token)) ?? trimOption2(io.env.MERE_GIVES_TOKEN);
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
  const target = resolvePath2(outputPath);
  await mkdir4(dirname2(target), { recursive: true });
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
  if (action === "agent-login") {
    const session = await agentLogin(globalOptions, io);
    activeSession = session;
    return wantsJson ? {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspace: session.workspace,
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
  throw new CliError("Unknown auth action: expected login, agent-login, whoami, or logout.");
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
        full: asBoolean2(options.full),
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
    const path4 = await writeTextFile(output, receipt.text);
    return {
      receiptId: id,
      path: path4,
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
  const wantsJson = asBoolean2(globalOptions.json);
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
      path: "/api/admin/settings/mere",
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
    path: `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/provision`,
    body: {
      workspaceId,
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
    const wantsJson = asBoolean2(globalOptions.json);
    if (asBoolean2(globalOptions.version) || rest[0] === "-v" || rest[0] === "version") {
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
    if (asBoolean2(globalOptions.help) || rest.length === 0) {
      if (wantsJson) {
        writeJson(io, {
          name: "mere-gives",
          usage: "mere-gives [global flags] <group> <command> [args]",
          commands: {
            completion: ["bash", "zsh", "fish"],
            auth: ["login", "agent-login", "whoami", "logout"],
            store: ["info"],
            export: ["--output"],
            import: ["--file", "--dry-run"],
            ledger: ["publish", "revoke"],
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
    const localData = isLocalDataRoute(globalOptions, io);
    if (group === "store") {
      if (rest[1] !== "info") throw new CliError("Unknown store action: expected info.");
      result = await handleLocalStoreInfo(globalOptions, io);
    } else if (group === "export") {
      const { options } = parseFlags(rest.slice(1), {
        tenant: "string",
        output: "string"
      });
      result = await handleLocalExport(globalOptions, options, io);
    } else if (group === "import") {
      const { options } = parseFlags(rest.slice(1), {
        tenant: "string",
        file: "string",
        "dry-run": "boolean"
      });
      result = await handleLocalImport(globalOptions, options, io);
    } else if (localData && group === "ledger") {
      const { options } = parseFlags(rest.slice(2), {
        tenant: "string",
        "dry-run": "boolean",
        "projection-url": "string",
        "projection-token": "string",
        "published-by-user-id": "string",
        "published-by-email": "string"
      });
      result = await handleLocalLedgerProjection(rest[1], globalOptions, options, io);
    } else if (localData && group === "donors") {
      const { options, positionals } = parseFlags(rest.slice(2), {
        tenant: "string",
        data: "string",
        "data-file": "string"
      });
      const data = await readJsonBody(options);
      result = await handleLocalDonors(rest[1], globalOptions, { ...options, data: JSON.stringify(data) }, positionals, io);
    } else if (localData && group === "donations") {
      const { options, positionals } = parseFlags(rest.slice(2), {
        tenant: "string",
        limit: "string"
      });
      result = await handleLocalDonations(rest[1], globalOptions, options, positionals, io);
    } else if (localData) {
      throw new CliError(`--store local is not supported for ${group}. Supported local commands are donors, donations, ledger, store info, export, and import.`);
    } else if (group === "auth") {
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
