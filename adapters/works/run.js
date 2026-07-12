#!/usr/bin/env node

// cli/run.ts
import { spawn as spawn2 } from "node:child_process";
import { readFile as readFile3 } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_221c0030a2ec2a854d90979ee5b3cc68/node_modules/@mere/cli-auth/src/session.ts
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
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

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
import { createHash as createHash2 } from "node:crypto";
var WORKS_APP_ID = "mere-works";
var WORKS_ARCHIVE_SCHEMA = "mere.works.archive.v1";
var RECORD_TYPES = [
  "works",
  "dataRows",
  "collections",
  "versions",
  "releases",
  "shareLinks",
  "capabilities"
];
var RECORD_TYPE_LABELS = {
  works: "work",
  dataRows: "data row",
  collections: "collection item",
  versions: "version",
  releases: "release",
  shareLinks: "share link",
  capabilities: "capability grant"
};
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
    throw new Error(`${label} is required for local mere.works records.`);
  }
  return value.trim();
}
function readOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function readRecordId(input, type) {
  return readString2(input.id ?? input.recordId ?? input.record_id, `${RECORD_TYPE_LABELS[type]} id`);
}
function readWorkId(input, type, id) {
  if (type === "works") return id;
  return readOptionalString(input.workId ?? input.work_id);
}
function normalizePayloadRecord(input, type, workspaceId, existing) {
  const id = readRecordId(input, type);
  const now = isoNow3();
  const createdAt = readOptionalString(input.createdAt ?? input.created_at) ?? readOptionalString(existing?.createdAt) ?? now;
  const updatedAt = readOptionalString(input.updatedAt ?? input.updated_at) ?? now;
  const workId = readWorkId(input, type, id) ?? readOptionalString(existing?.workId);
  if (type !== "works" && !workId) {
    throw new Error(`${RECORD_TYPE_LABELS[type]} requires workId.`);
  }
  return {
    id,
    workId,
    createdAt,
    updatedAt,
    payload: {
      ...existing ?? {},
      ...input,
      id,
      workspaceId,
      workId,
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
    workId: readOptionalString(row.work_id),
    createdAt: readString2(row.created_at, "created_at"),
    updatedAt: readString2(row.updated_at, "updated_at")
  };
}
function stableWorkProjectionId(input) {
  const digest = createHash2("sha256").update([WORKS_APP_ID, input.workspaceId, input.workId, "work-summary"].join("\n")).digest("hex").slice(0, 24);
  return `wkspr_${digest}`;
}
function dateOnly(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 10) : null;
}
function optionalPayloadString(payload, key) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function isRevoked(record) {
  return Boolean(readOptionalString(record.revokedAt ?? record.revoked_at));
}
function isCapabilityActive(record) {
  if (isRevoked(record)) return false;
  const status = readOptionalString(record.status);
  return status == null || ["active", "approved", "granted", "enabled"].includes(status.toLowerCase());
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== WORKS_ARCHIVE_SCHEMA || value.version !== 1) {
    throw new Error(`Works transfer payload must be ${WORKS_ARCHIVE_SCHEMA} version 1.`);
  }
  const readList = (key) => Array.isArray(value[key]) ? value[key].filter(isRecord2).map((entry) => normalizePayloadRecord(entry, key, workspaceId).payload) : [];
  return {
    kind: WORKS_ARCHIVE_SCHEMA,
    version: 1,
    works: readList("works"),
    dataRows: readList("dataRows"),
    collections: readList("collections"),
    versions: readList("versions"),
    releases: readList("releases"),
    shareLinks: readList("shareLinks"),
    capabilities: readList("capabilities")
  };
}
var LocalWorksStore = class _LocalWorksStore {
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
    registerPlaneApp(opened.db, WORKS_APP_ID, "Mere Works");
    registerPlaneTransferSchema(opened.db, WORKS_APP_ID, {
      payloadSchema: WORKS_ARCHIVE_SCHEMA,
      displayName: "Works archive transfer",
      description: "Portable mere.works micro-app archive records; generation, runtime execution, publishing, approvals, and bridge delivery stay hosted."
    });
    upsertPlaneWorkspace(opened.db, WORKS_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalWorksStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
			CREATE TABLE IF NOT EXISTS works_local_records (
				record_type TEXT NOT NULL,
				record_id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				work_id TEXT,
				payload_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, record_type, record_id)
			);

			CREATE INDEX IF NOT EXISTS idx_works_local_records_work
				ON works_local_records (workspace_id, work_id, record_type, updated_at DESC);

			CREATE INDEX IF NOT EXISTS idx_works_local_records_type
				ON works_local_records (workspace_id, record_type, updated_at DESC);

			CREATE TABLE IF NOT EXISTS works_local_projections (
				id TEXT PRIMARY KEY,
				workspace_id TEXT NOT NULL,
				scope TEXT NOT NULL,
				work_id TEXT NOT NULL,
				published_at TEXT NOT NULL,
				revoked_at TEXT,
				payload_json TEXT NOT NULL,
				last_projected_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_works_local_projections_workspace_scope
				ON works_local_projections (workspace_id, scope, updated_at DESC);
		`);
  }
  count(type) {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM works_local_records WHERE workspace_id = ? AND record_type = ?").get(this.workspace.workspaceId, type);
    return row?.count ?? 0;
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: WORKS_APP_ID });
    const projectionCount = this.db.prepare("SELECT COUNT(*) AS count FROM works_local_projections WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0;
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      workCount: this.count("works"),
      dataRowCount: this.count("dataRows"),
      collectionItemCount: this.count("collections"),
      versionCount: this.count("versions"),
      releaseCount: this.count("releases"),
      shareLinkCount: this.count("shareLinks"),
      capabilityGrantCount: this.count("capabilities"),
      projectionCount,
      localArchive: "enabled",
      generationLocal: false,
      runtimeExecutionLocal: false,
      publishingLocal: false,
      workspaceProjectionLocal: false,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listRecords(type, workId) {
    const rows = workId ? this.db.prepare(
      "SELECT * FROM works_local_records WHERE workspace_id = ? AND record_type = ? AND work_id = ? ORDER BY updated_at DESC"
    ).all(this.workspace.workspaceId, type, workId) : this.db.prepare(
      "SELECT * FROM works_local_records WHERE workspace_id = ? AND record_type = ? ORDER BY updated_at DESC"
    ).all(this.workspace.workspaceId, type);
    return rows.map(rowPayload);
  }
  getRecord(type, id) {
    const row = this.db.prepare(
      "SELECT * FROM works_local_records WHERE workspace_id = ? AND record_type = ? AND record_id = ? LIMIT 1"
    ).get(this.workspace.workspaceId, type, id);
    return row ? rowPayload(row) : null;
  }
  upsertRecord(type, input) {
    const id = readRecordId(input, type);
    const existing = this.getRecord(type, id) ?? void 0;
    const record = normalizePayloadRecord(input, type, this.workspace.workspaceId, existing);
    this.db.prepare(
      `INSERT INTO works_local_records (
					record_type, record_id, workspace_id, work_id, payload_json, created_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
					work_id = excluded.work_id,
					payload_json = excluded.payload_json,
					updated_at = excluded.updated_at`
    ).run(
      type,
      record.id,
      this.workspace.workspaceId,
      record.workId,
      JSON.stringify(record.payload),
      record.createdAt,
      record.updatedAt
    );
    return record.payload;
  }
  getWorkProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM works_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildWorkProjectionEnvelope(input) {
    const work = this.getRecord("works", input.workId);
    if (!work) throw new Error(`Local Works archive record not found: ${input.workId}`);
    const releases = this.listRecords("releases", input.workId);
    const shareLinks = this.listRecords("shareLinks", input.workId);
    const capabilities = this.listRecords("capabilities", input.workId);
    const projectionId = stableWorkProjectionId({
      workspaceId: this.workspace.workspaceId,
      workId: input.workId
    });
    const existing = this.getWorkProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    const publishedReleaseCount = releases.filter(
      (release) => Array.isArray(release.publishedEnvironments) ? release.publishedEnvironments.length > 0 : Boolean(release.publishedAt ?? release.published_at)
    ).length;
    return {
      version: 1,
      appId: WORKS_APP_ID,
      event: {
        type: input.action === "publish" ? "works.work.projection.upserted" : "works.work.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "work-summary",
          workId: input.workId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        work: {
          id: input.workId,
          status: optionalPayloadString(work, "status"),
          trustState: optionalPayloadString(work, "trustState") ?? optionalPayloadString(work, "trust_state"),
          visibility: optionalPayloadString(work, "visibility"),
          createdOn: dateOnly(work.createdAt ?? work.created_at),
          updatedOn: dateOnly(work.updatedAt ?? work.updated_at)
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          workId: input.workId,
          dataRowCount: this.listRecords("dataRows", input.workId).length,
          collectionItemCount: this.listRecords("collections", input.workId).length,
          versionCount: this.listRecords("versions", input.workId).length,
          releaseCount: releases.length,
          approvedReleaseCount: releases.filter((release) => optionalPayloadString(release, "approvalStatus") === "approved").length,
          publishedReleaseCount,
          shareLinkCount: shareLinks.length,
          activeShareLinkCount: shareLinks.filter((link) => !isRevoked(link)).length,
          capabilityGrantCount: capabilities.length,
          activeCapabilityGrantCount: capabilities.filter(isCapabilityActive).length
        },
        exclusions: [
          "work slugs and display names",
          "generated component code",
          "work schemas and surface definitions",
          "prompt and user context",
          "local data rows",
          "collection item payloads",
          "version snapshots and diffs",
          "release names and notes",
          "source version identifiers",
          "share link tokens and URLs",
          "capability binding config",
          "connector secrets and calls",
          "runtime execution state",
          "approval workflow notes",
          "workspace bridge payloads",
          "raw local archive rows",
          "transfer bundle payloads"
        ]
      }
    };
  }
  recordWorkProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO works_local_projections (
					id, workspace_id, scope, work_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					workspace_id = excluded.workspace_id,
					scope = excluded.scope,
					work_id = excluded.work_id,
					published_at = excluded.published_at,
					revoked_at = excluded.revoked_at,
					payload_json = excluded.payload_json,
					last_projected_at = excluded.last_projected_at,
					updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.workId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: WORKS_ARCHIVE_SCHEMA,
      version: 1,
      works: this.listRecords("works"),
      dataRows: this.listRecords("dataRows"),
      collections: this.listRecords("collections"),
      versions: this.listRecords("versions"),
      releases: this.listRecords("releases"),
      shareLinks: this.listRecords("shareLinks"),
      capabilities: this.listRecords("capabilities")
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: WORKS_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: WORKS_ARCHIVE_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: WORKS_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: WORKS_ARCHIVE_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: WORKS_APP_ID,
      payloadSchema: WORKS_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? WORKS_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? WORKS_ARCHIVE_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: WORKS_APP_ID,
      payloadSchema: WORKS_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const type of RECORD_TYPES) {
        for (const record of normalized[type]) this.upsertRecord(type, record);
      }
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: WORKS_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? WORKS_ARCHIVE_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        workCount: normalized.works.length,
        dataRowCount: normalized.dataRows.length,
        collectionItemCount: normalized.collections.length,
        versionCount: normalized.versions.length,
        releaseCount: normalized.releases.length,
        shareLinkCount: normalized.shareLinks.length,
        capabilityGrantCount: normalized.capabilities.length,
        transferId,
        generationLocal: false,
        runtimeExecutionLocal: false,
        publishingLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};

// cli/local-plane.ts
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
function resolveWorksPlaneConfig(options, io) {
  return resolvePlaneConfigInspection({
    appId: WORKS_APP_ID,
    env: io.env,
    data: asString(options.store),
    ai: asString(options.ai),
    localDbPath: asString(options["local-db"])
  });
}
function isLocalDataRoute(options, io) {
  return resolveWorksPlaneConfig(options, io).data === "local";
}
function localWorkspace(options, io) {
  const workspaceId = trimOption(asString(options.workspace)) ?? trimOption(io.env.MERE_WORKS_WORKSPACE_ID) ?? trimOption(io.env.WORKS_WORKSPACE_ID) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Works Archive" : workspaceId
  };
}
function projectionActor(options, io) {
  return {
    publishedByUserId: trimOption(asString(options["published-by-user-id"])) ?? trimOption(io.env.MERE_WORKS_USER_ID) ?? trimOption(io.env.WORKS_USER_ID) ?? trimOption(io.env.USER) ?? "local-user",
    publishedByEmail: trimOption(asString(options["published-by-email"])) ?? trimOption(io.env.MERE_WORKS_USER_EMAIL) ?? trimOption(io.env.WORKS_USER_EMAIL) ?? trimOption(io.env.EMAIL) ?? null
  };
}
async function openLocalStore(options, io) {
  const config = resolveWorksPlaneConfig(options, io);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so mere.works local data stays explicit.");
  }
  return LocalWorksStore.open({
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
  const file = trimOption(asString(options["data-file"]));
  const inline = asString(options.data);
  if (file && inline !== void 0) {
    throw new Error("Use only one of --data or --data-file.");
  }
  const raw = file ? await readFile2(file, "utf8") : inline ?? "{}";
  return readObject(parseJsonText(raw, file ? `--data-file ${file}` : "--data"), file ? "--data-file" : "--data");
}
async function handleLocalStoreInfo(options, io) {
  const config = resolveWorksPlaneConfig(options, io);
  if (config.data === "local") {
    return withLocalStore(options, io, (store) => ({
      ok: true,
      app: WORKS_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      ...store.info(),
      localAiSupported: false,
      sources: config.sources
    }));
  }
  if (asBoolean(options.json)) {
    return {
      ok: true,
      app: WORKS_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localArchive: "available",
      generationLocal: false,
      runtimeExecutionLocal: false,
      publishingLocal: false,
      workspaceProjectionLocal: false,
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
    "Work archives can be stored locally with --store local. OpenRouter generation, runtime execution, approval workflow, public publishing, connector calls, and workspace bridge delivery remain Cloudflare-owned.\n"
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
    await writeFile(target, JSON.stringify(bundle, null, 2));
    return {
      ok: true,
      path: target,
      appId: bundle.appId,
      workspaceId: bundle.workspaceId,
      payloadSchema: bundle.payloadSchema,
      payloadSha256: bundle.payloadSha256,
      workCount: bundle.payload.works.length,
      dataRowCount: bundle.payload.dataRows.length,
      collectionItemCount: bundle.payload.collections.length,
      versionCount: bundle.payload.versions.length,
      releaseCount: bundle.payload.releases.length,
      shareLinkCount: bundle.payload.shareLinks.length,
      capabilityGrantCount: bundle.payload.capabilities.length
    };
  });
}
async function handleLocalImport(options, io) {
  return withLocalStore(options, io, async (store) => {
    const value = parseJsonText(await readFile2(readRequired(options, "file"), "utf8"), "local works archive transfer bundle");
    return asBoolean(options["dry-run"]) ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalRecordGroup(type, action, args, options, io) {
  return withLocalStore(options, io, async (store) => {
    if (action === "list") return { ok: true, records: store.listRecords(type, args[0]) };
    if (action === "get" || action === "show") {
      const id = args[0];
      if (!id) throw new Error(`${type} ${action} requires <id>.`);
      return { ok: true, record: store.getRecord(type, id) };
    }
    if (action === "upsert") return store.upsertRecord(type, await readJsonData(options));
    if (type === "works" && (action === "publish" || action === "revoke")) {
      const workId = args[0];
      if (!workId) throw new Error(`work ${action} requires <work-id>.`);
      const envelope = store.buildWorkProjectionEnvelope({
        action,
        workId,
        ...projectionActor(options, io)
      });
      if (asBoolean(options["dry-run"])) {
        let receiverUrl;
        try {
          receiverUrl = resolveCloudProjectionTarget({
            appId: WORKS_APP_ID,
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
        appId: WORKS_APP_ID,
        env: io.env,
        receiverUrl: trimOption(asString(options["projection-url"])),
        bearerToken: trimOption(asString(options["projection-token"])),
        event: envelope,
        fetchImpl: async (input, init) => (io.fetchImpl ?? fetch)(input, init)
      });
      store.recordWorkProjection(envelope);
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
    }
    throw new Error(`Unknown local ${type} action: expected list, get, show, upsert${type === "works" ? ", publish, or revoke" : ""}.`);
  });
}

// cli/run.ts
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["dry-run", "help", "json", "no-interactive", "version", "yes"]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["v", "version"],
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
function defaultBusinessBaseUrl(env) {
  return env.MERE_BUSINESS_BASE_URL?.trim() || env.BUSINESS_BASE_URL?.trim() || "https://mere.business";
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
  --store local|cloud  Choose supported local/cloud data-plane commands.
  --ai local|cloud     Choose AI plane for local-plane inspection.
  --local-db PATH      Override the shared Mere local-plane SQLite path.
  --json               Print machine-readable JSON.
  --data JSON          JSON payload for create/update/command operations.
  --data-file FILE     Read JSON payload from a file.
  --token TOKEN        Internal bearer token for workspace automation.
  --projection-url URL Cloudflare Business projection receiver for local publish/revoke.
  --projection-token TOKEN Cloudflare Business projection bearer token.
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
  workspace command --workspace WORKSPACE_ID <command> [--data JSON]

Works:
  work list
  work get WORK_ID | work get --slug SLUG
  work create --data-file work.json
  work update WORK_ID --data '{"displayName":"Ops"}'
  work publish WORK_ID --projection-url URL --projection-token TOKEN [--dry-run]
  work revoke WORK_ID --projection-url URL --projection-token TOKEN [--dry-run]
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
  store info
  export --output ./works.bundle.json
  import --file ./works.bundle.json [--dry-run]
  commands
  completion [bash|zsh|fish]

Environment:
  WORKS_BASE_URL       Override the Works origin.

Local plane:
  --store local currently supports archive metadata commands: work/data/
  collection/version/release/share/capability list|get|show|upsert, selected
  work publish/revoke, plus store info, export, and import. OpenRouter generation, runtime execution,
  release approval, public publishing, connector calls, workspace bridge
  delivery, Business projection receiving, and operations remain Cloudflare-owned.
`);
}
async function cliVersion() {
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
function commandManifest() {
  const command = (path4, summary, options = {}) => ({
    id: path4.join("."),
    path: path4,
    summary,
    auth: options.auth ?? "session",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: options.positionals ?? [],
    flags: options.flags ?? []
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
    globalFlags: [
      "base-url",
      "business-base-url",
      "workspace",
      "store",
      "ai",
      "local-db",
      "json",
      "yes",
      "confirm",
      "token"
    ],
    commands: [
      command(["auth", "login"], "Start browser login.", { auth: "none", risk: "write", flags: ["workspace"] }),
      command(["auth", "agent-login"], "Create a Works session from a Business agent session.", { auth: "none", risk: "write", flags: ["workspace", "business-base-url", "base-url"] }),
      command(["auth", "whoami"], "Show current user and workspace."),
      command(["auth", "logout"], "Clear the local session.", { risk: "write" }),
      command(["workspace", "list"], "List available workspaces."),
      command(["workspace", "current"], "Show active workspace."),
      command(["workspace", "use"], "Select a default workspace.", {
        risk: "write",
        positionals: ["selector"]
      }),
      command(["workspace", "provision"], "Provision Works for a Mere workspace.", {
        auth: "token",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["workspace", "bootstrap"], "Bootstrap Works for a Mere workspace.", {
        auth: "token",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["workspace", "sync"], "Sync Works connection state.", {
        auth: "token",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
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
        positionals: ["command"],
        flags: ["data", "data-file", "prompt", "user-context", "actor-user", "actor-label", "actor-role", "work", "work-id", "release", "release-id", "name", "notes", "note", "environment", "kind"]
      }),
      command(["store", "info"], "Show local/cloud data and AI plane selection.", { auth: "none" }),
      command(["export"], "Export local work archive transfer bundle.", { auth: "none", flags: ["output"] }),
      command(["import"], "Import local work archive transfer bundle or emit a dry-run plan.", {
        auth: "none",
        risk: "write",
        flags: ["file", "dry-run"]
      }),
      command(["work", "list"], "List works."),
      command(["work", "get"], "Get a work.", {
        positionals: ["workId"],
        flags: ["slug"]
      }),
      command(["work", "upsert"], "Upsert local work archive metadata.", {
        auth: "none",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["work", "publish"], "Publish selected local work summary to Business.", {
        auth: "none",
        risk: "external",
        positionals: ["workId"],
        flags: ["projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"]
      }),
      command(["work", "revoke"], "Revoke selected local work summary from Business.", {
        auth: "none",
        risk: "external",
        positionals: ["workId"],
        flags: ["projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"]
      }),
      command(["work", "create"], "Create a work from JSON.", {
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["work", "update"], "Update work metadata/code/schema.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["slug", "data", "data-file"]
      }),
      command(["work", "delete"], "Delete a work.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        positionals: ["workId"],
        flags: ["slug"]
      }),
      command(["work", "open"], "Open Works in the browser.", {
        auth: "none",
        positionals: ["slug"],
        flags: ["slug"]
      }),
      command(["data", "get"], "Get work data.", {
        positionals: ["workId"]
      }),
      command(["data", "update"], "Update work data.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["data", "data-file"]
      }),
      command(["data", "initialize"], "Initialize work data schema.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["data", "data-file"]
      }),
      command(["data", "append"], "Append item to a work collection.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["collection", "data", "data-file"]
      }),
      command(["data", "upsert"], "Upsert local work data snapshot.", {
        auth: "none",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["collection", "upsert"], "Upsert local work collection item.", {
        auth: "none",
        risk: "write",
        supportsData: true,
        flags: ["data", "data-file"]
      }),
      command(["release", "list"], "List releases.", {
        positionals: ["workId"]
      }),
      command(["release", "create"], "Create a release.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["name", "notes", "source-version", "data", "data-file"]
      }),
      command(["release", "approval"], "Request, approve, or reject a release.", {
        risk: "write",
        positionals: ["workId", "releaseId", "action"],
        flags: ["note"]
      }),
      command(["release", "publish"], "Promote a release to an environment.", {
        risk: "write",
        positionals: ["workId", "releaseId"],
        flags: ["environment"]
      }),
      command(["release", "unpublish"], "Unpublish an environment.", {
        risk: "write",
        positionals: ["workId"],
        flags: ["environment"]
      }),
      command(["release", "rollback"], "Roll back an environment.", {
        risk: "write",
        positionals: ["workId"],
        flags: ["environment"]
      }),
      command(["share", "list"], "List share links.", {
        positionals: ["workId"]
      }),
      command(["share", "create"], "Create a share link.", {
        risk: "write",
        positionals: ["workId"],
        flags: ["release", "release-id", "kind", "access-mode"]
      }),
      command(["share", "revoke"], "Revoke a share link.", {
        risk: "destructive",
        requiresYes: true,
        requiresConfirm: true,
        positionals: ["workId", "linkId"]
      }),
      command(["capability", "list"], "List requested and approved capabilities.", {
        positionals: ["workId"]
      }),
      command(["capability", "grant"], "Approve a capability grant.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["capability", "data", "data-file"]
      }),
      command(["capability", "revoke"], "Revoke a capability grant.", {
        risk: "destructive",
        requiresYes: true,
        positionals: ["workId"],
        flags: ["capability"]
      }),
      command(["surface", "get"], "Get release surface settings.", {
        positionals: ["workId"],
        flags: ["release", "release-id"]
      }),
      command(["surface", "set"], "Update release surface settings.", {
        risk: "write",
        supportsData: true,
        positionals: ["workId"],
        flags: ["release", "release-id", "data", "data-file"]
      }),
      command(["version", "list"], "List work versions.", {
        positionals: ["workId"]
      }),
      command(["version", "restore"], "Restore a version.", {
        risk: "write",
        positionals: ["workId", "versionId"]
      }),
      command(["version", "compare"], "Compare versions.", {
        positionals: ["workId"],
        flags: ["base", "target"]
      }),
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
  if (file !== void 0) return parseJson2(await readFile3(file, "utf8"), `--data-file ${file}`);
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
async function fetchJson2(io, baseUrl, path4, options = {}) {
  const url = new URL(path4, normalizeBaseUrl2(baseUrl));
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
function writeLocalResult(io, parsed, value) {
  if (value === "") return;
  if (boolFlag(parsed, "json")) {
    writeJson(io, value);
    return;
  }
  if (typeof value === "string") {
    io.stdout(value.endsWith("\n") ? value : `${value}
`);
    return;
  }
  writeJson(io, value);
}
function renderSession(session) {
  const workspace = session.workspace ? `${session.workspace.name} (${session.workspace.slug})` : "No active workspace";
  return `Signed in as ${session.user.email}
Workspace: ${workspace}
Session: ${sessionFilePath()}`;
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
  throw new CliError("Option --workspace is required when the Business session has multiple workspaces.", 2);
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
    throw new CliError("Mere Business did not return a Works base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new CliError("Mere Business did not return a Works CLI session.");
  }
  return {
    baseUrl: record.baseUrl,
    session: record.session
  };
}
async function loadRefreshedBusinessSession(parsed, io) {
  const current = await loadCliSession({ appName: "mere-business", env: io.env });
  if (!current) {
    throw new CliError(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first.",
      3
    );
  }
  const workspace = selectBusinessWorkspace(current, flag(parsed, "workspace"));
  const baseUrl = normalizeBaseUrl2(
    flag(parsed, "business-base-url") ?? current.baseUrl ?? defaultBusinessBaseUrl(io.env)
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
  const response = await io.fetchImpl(new URL("/api/cli/v1/auth/product-sessions", business.baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${business.session.accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      app: "works",
      workspaceId: business.workspace.id
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(
      productSessionErrorMessage(payload, `Request failed (${response.status})`),
      response.status
    );
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession(product.session, {
    baseUrl: normalizeBaseUrl2(flag(parsed, "base-url") ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveSession(session, io.env);
  return session;
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
    const path4 = kind === "popup" ? `/embed/${token}.js` : kind === "embed" ? `/embed/${token}` : `/share/${token}`;
    return [
      String(link.id ?? ""),
      kind,
      String(link.accessMode ?? ""),
      link.revokedAt ? "revoked" : "active",
      new URL(path4, normalizeBaseUrl2(baseUrl)).toString()
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
  if (command === "agent-login") {
    const session = await agentLogin(parsed, io);
    writeMaybeJson(io, parsed, sessionOutput(session), () => `${renderSession(session)}
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
      `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/${command}`,
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
      `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/connection`,
      { method: "DELETE", token: internalToken(parsed, io) }
    );
    writeMaybeJson(io, parsed, result, () => `${JSON.stringify(result, null, 2)}
`);
    return 0;
  }
  if (command === "command") {
    const workspaceId = requireFlag(parsed, "workspace");
    const remoteCommand = requireArg(args, 1, "Workspace command");
    const body = {
      ...objectValue(await readJsonInput(parsed)),
      ...commandBodyFlags(parsed)
    };
    const result = await fetchJson2(
      io,
      requestBaseUrl(parsed, io),
      `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/commands/${encodeURIComponent(remoteCommand)}`,
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
async function handleLocalDataCommand(group, command, rest, parsed, io) {
  let result;
  const localData = isLocalDataRoute(parsed.flags, io);
  if (group === "store") {
    if (command !== "info") throw new CliError("Unknown store command: expected info.", 2);
    result = await handleLocalStoreInfo(parsed.flags, io);
  } else if (group === "export") {
    result = await handleLocalExport(parsed.flags, io);
  } else if (group === "import") {
    result = await handleLocalImport(parsed.flags, io);
  } else if (localData && (group === "work" || group === "works")) {
    result = await handleLocalRecordGroup("works", command ?? "list", rest, parsed.flags, io);
  } else if (localData && group === "data") {
    result = await handleLocalRecordGroup("dataRows", command, rest, parsed.flags, io);
  } else if (localData && (group === "collection" || group === "collections")) {
    result = await handleLocalRecordGroup("collections", command, rest, parsed.flags, io);
  } else if (localData && group === "version") {
    result = await handleLocalRecordGroup("versions", command, rest, parsed.flags, io);
  } else if (localData && group === "release") {
    result = await handleLocalRecordGroup("releases", command, rest, parsed.flags, io);
  } else if (localData && group === "share") {
    result = await handleLocalRecordGroup("shareLinks", command, rest, parsed.flags, io);
  } else if (localData && group === "capability") {
    result = await handleLocalRecordGroup("capabilities", command, rest, parsed.flags, io);
  } else if (localData) {
    throw new CliError(
      `--store local is not supported for ${group ?? "(missing)"}. Supported local commands are store info, work publish/revoke, work, data, collection, version, release, share, capability, export, and import. Generation, runtime execution, approval workflow, publishing, connector calls, bridge delivery, Business projection receiving, and operations remain hosted.`
    );
  } else {
    return false;
  }
  writeLocalResult(io, parsed, result);
  return true;
}
async function runCli(argv, io) {
  try {
    const parsed = parseArgs(argv);
    const [group, command, ...rest] = parsed.positionals;
    if (boolFlag(parsed, "version") || group === "version" && command === void 0) {
      io.stdout(`${await cliVersion()}
`);
      return 0;
    }
    if (!group || boolFlag(parsed, "help")) {
      printHelp(io);
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
    if (await handleLocalDataCommand(group, command, rest, parsed, io)) return 0;
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
