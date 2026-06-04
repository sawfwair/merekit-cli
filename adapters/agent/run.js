#!/usr/bin/env node

// cli/agent.ts
import { readFile as readFile3 } from "node:fs/promises";

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
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

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
      const authError = requestUrl2.searchParams.get(CLI_AUTH_ERROR_QUERY_PARAM)?.trim();
      const errorDescription = requestUrl2.searchParams.get(CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM)?.trim();
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

// cli/local-plane.ts
import { createHash as createHash4 } from "node:crypto";
import { mkdir as mkdir3, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
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
function envPrefix(appId) {
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
  const prefix = envPrefix(input.appId);
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
function envPrefix2(appId) {
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
  const prefix = envPrefix2(input.appId);
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
  const prefix = envPrefix2(input.appId);
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

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function json(value) {
  return JSON.stringify(value ?? {});
}
function makePlaneId(prefix) {
  return `${prefix}_${randomUUID2().replaceAll("-", "").slice(0, 24)}`;
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
function recordPlaneAiJob(db, input) {
  const now = isoNow2();
  const id = input.id?.trim() || makePlaneId("aij");
  registerPlaneApp(db, input.appId);
  db.prepare(
    `INSERT INTO mere_plane_ai_jobs (
         id, app_id, workspace_id, subject_type, subject_id, mode, model, status,
         input_json, output_text, error, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.appId,
    input.workspaceId ?? null,
    input.subjectType,
    input.subjectId,
    input.mode,
    input.model ?? null,
    input.status ?? "running",
    json(input.input ?? {}),
    input.outputText ?? null,
    input.error ?? null,
    now,
    now
  );
  return id;
}
function updatePlaneAiJob(db, input) {
  const updates = ["status = ?", "updated_at = ?"];
  const params = [input.status, isoNow2()];
  if ("model" in input) {
    updates.push("model = ?");
    params.push(input.model ?? null);
  }
  if ("outputText" in input) {
    updates.push("output_text = ?");
    params.push(input.outputText ?? null);
  }
  if ("error" in input) {
    updates.push("error = ?");
    params.push(input.error ?? null);
  }
  params.push(input.id);
  db.prepare(`UPDATE mere_plane_ai_jobs SET ${updates.join(", ")} WHERE id = ?`).run(...params);
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

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/mere-run.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, chmod as chmod2, mkdtemp, rm as rm2 } from "node:fs/promises";
import { createHash as createHash3 } from "node:crypto";
import https from "node:https";
import os3 from "node:os";
import path4 from "node:path";
import { spawn as spawn2, spawnSync } from "node:child_process";
var DEFAULT_DMG_URL = "https://mere.run/releases/mere-run.dmg";
var DEFAULT_INSTALL_BIN = path4.join(os3.homedir(), ".local", "bin", "mere.run");
var DEFAULT_CHAT_MODEL = "text-chat-q35-nano";
var GLOBAL_CANDIDATES = ["/usr/local/bin/mere.run", "/opt/homebrew/bin/mere.run"];
async function isExecutable(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
function which(binary, env) {
  const pathValue = env.PATH ?? process.env.PATH ?? "";
  for (const segment of pathValue.split(path4.delimiter)) {
    if (!segment) continue;
    const candidate = path4.join(segment, binary);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
function envPrefix3(appId) {
  if (!appId) return null;
  const prefix = appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return prefix || null;
}
function configuredBin(env, appId) {
  const prefix = envPrefix3(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_BIN`] : void 0) ?? env.MERE_RUN_BIN ?? env.MERE_LOCAL_PLANE_MERE_RUN_BIN ?? null;
}
function configuredInstallBin(env, appId) {
  const prefix = envPrefix3(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_INSTALL_BIN`] : void 0) ?? env.MERE_RUN_INSTALL_BIN ?? env.MERE_LOCAL_PLANE_MERE_RUN_INSTALL_BIN ?? DEFAULT_INSTALL_BIN;
}
function configuredDmgUrl(env, appId) {
  const prefix = envPrefix3(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_DOWNLOAD_URL`] : void 0) ?? env.MERE_RUN_DOWNLOAD_URL ?? env.MERE_LOCAL_PLANE_MERE_RUN_DOWNLOAD_URL ?? DEFAULT_DMG_URL;
}
function configuredDmgSha256(env, appId) {
  const prefix = envPrefix3(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_DOWNLOAD_SHA256`] : void 0) ?? env.MERE_RUN_DOWNLOAD_SHA256 ?? env.MERE_LOCAL_PLANE_MERE_RUN_DOWNLOAD_SHA256 ?? null;
}
function requireDmgSha256(env, appId) {
  const expectedSha256 = configuredDmgSha256(env, appId);
  if (!expectedSha256) {
    const prefix = envPrefix3(appId);
    const label = prefix ? `${prefix}_MERE_RUN_DOWNLOAD_SHA256` : "MERE_RUN_DOWNLOAD_SHA256";
    throw new Error(`Auto-installing mere.run requires ${label}.`);
  }
  return expectedSha256;
}
async function download(url, dest) {
  await new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Download failed with status ${response.statusCode.toString()}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", reject);
  });
}
async function sha256File(filePath) {
  const hash = createHash3("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}
async function installFromDmg(env, appId) {
  const installBin = configuredInstallBin(env, appId);
  const expectedSha256 = requireDmgSha256(env, appId);
  mkdirSync(path4.dirname(installBin), { recursive: true });
  const tmp = await mkdtemp(path4.join(os3.tmpdir(), "mere-local-plane-run-"));
  const dmg = path4.join(tmp, "mere-run.dmg");
  const mount = path4.join(tmp, "mount");
  mkdirSync(mount);
  try {
    await download(configuredDmgUrl(env, appId), dmg);
    const actualSha256 = await sha256File(dmg);
    if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error("Downloaded mere.run DMG failed SHA-256 verification.");
    }
    const attach = spawnSync("hdiutil", ["attach", dmg, "-mountpoint", mount, "-nobrowse", "-readonly", "-quiet"], {
      encoding: "utf8"
    });
    if (attach.status !== 0) {
      throw new Error(attach.stderr || attach.stdout || "Unable to mount mere.run DMG.");
    }
    const installer = path4.join(mount, "install.sh");
    const install = spawnSync(installer, {
      encoding: "utf8",
      env: { ...process.env, ...env, MERERUN_INSTALL_BIN_DEST: installBin }
    });
    spawnSync("hdiutil", ["detach", mount, "-quiet"], { encoding: "utf8" });
    if (install.status !== 0) {
      throw new Error(install.stderr || install.stdout || "mere.run installer failed.");
    }
    await chmod2(installBin, 493).catch(() => void 0);
    return installBin;
  } finally {
    await rm2(tmp, { recursive: true, force: true });
  }
}
async function resolveMereRunBin(env = process.env, appId) {
  const explicit = configuredBin(env, appId);
  if (explicit) {
    if (!await isExecutable(explicit)) {
      throw new Error(`mere.run binary is not executable: ${explicit}`);
    }
    return explicit;
  }
  const onPath = which("mere.run", env);
  if (onPath) return onPath;
  for (const candidate of GLOBAL_CANDIDATES) {
    if (await isExecutable(candidate)) return candidate;
  }
  const cached = configuredInstallBin(env, appId);
  if (await isExecutable(cached)) return cached;
  return installFromDmg(env, appId);
}
async function runMereRun(args, options = {}) {
  const bin = await resolveMereRunBin(options.env ?? process.env, options.appId);
  return new Promise((resolve, reject) => {
    const child = spawn2(bin, args, {
      env: { ...process.env, ...options.env ?? {} },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout2 = "";
    let stderr2 = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`mere.run timed out after ${String(options.timeoutMs ?? 24e4)}ms`));
    }, options.timeoutMs ?? 24e4);
    child.stdout.on("data", (chunk) => {
      stdout2 += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr2 += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout2.trim());
      } else {
        reject(new Error(stderr2.trim() || stdout2.trim() || `mere.run exited with ${String(code)}`));
      }
    });
  });
}
async function generateText(prompt, options = {}) {
  return runMereRun(
    [
      "text",
      "chat",
      "--model",
      options.model ?? DEFAULT_CHAT_MODEL,
      "--prompt",
      prompt,
      "--max-tokens",
      String(options.maxTokens ?? 384),
      "--temperature",
      "0",
      "--top-p",
      "1",
      "--quiet"
    ],
    {
      env: options.env,
      appId: options.appId,
      timeoutMs: options.timeoutMs ?? 3e5
    }
  );
}

// cli/local-plane.ts
var AGENT_APP_ID = "mere-agent";
var AGENT_ARCHIVE_SCHEMA = "mere.agent.archive.v1";
var HOSTED_BOUNDARY = "Agent Worker delivery, D1 agent source of truth, Durable Object chat runtime, generated-tool execution, sandbox egress, voice/realtime sessions, share-link serving, auth/session, deploys, and Business projection remain Cloudflare-owned.";
var RECORD_TYPES = [
  "agents",
  "bindings",
  "sessions",
  "shareLinks",
  "generatedTools",
  "generatedToolVersions"
];
var RECORD_TYPE_LABELS = {
  agents: "agent",
  bindings: "binding",
  sessions: "session",
  shareLinks: "share link",
  generatedTools: "generated tool",
  generatedToolVersions: "generated tool version"
};
var COUNT_FIELDS = {
  agents: "agentCount",
  bindings: "bindingCount",
  sessions: "sessionCount",
  shareLinks: "shareLinkCount",
  generatedTools: "generatedToolCount",
  generatedToolVersions: "generatedToolVersionCount"
};
var AGENT_SCOPED_TYPES = /* @__PURE__ */ new Set([
  "bindings",
  "sessions",
  "shareLinks",
  "generatedTools",
  "generatedToolVersions"
]);
var AGENT_PROJECTION_FIELDS = [
  "id",
  "agentId",
  "workspaceId",
  "slug",
  "name",
  "description",
  "kind",
  "status",
  "templateKey",
  "modelTier",
  "createdAt",
  "updatedAt"
];
var BINDING_PROJECTION_FIELDS = [
  "id",
  "agentId",
  "workspaceId",
  "workspaceSlug",
  "workspaceHost",
  "workspaceName",
  "bundleKey",
  "status",
  "createdAt",
  "updatedAt"
];
var SHARE_LINK_PROJECTION_FIELDS = [
  "id",
  "agentId",
  "label",
  "status",
  "expiresAt",
  "createdAt",
  "updatedAt"
];
var GENERATED_TOOL_PROJECTION_FIELDS = [
  "id",
  "agentId",
  "toolKey",
  "key",
  "name",
  "description",
  "backend",
  "status",
  "createdAt",
  "updatedAt"
];
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseJsonText(text, label) {
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`, { cause: error });
  }
}
function readObject(value, label) {
  if (!isRecord2(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}
function asString(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.at(-1);
  return void 0;
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function option(args, key) {
  return trimOption(asString(args.flags[key]));
}
function asBoolean(args, key) {
  return args.flags[key] === true;
}
function readRequired(args, key) {
  const value = option(args, key);
  if (!value) throw new Error(`Option --${key} is required.`);
  return value;
}
function readOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function pickProjectionFields(record, fields) {
  return Object.fromEntries(
    fields.filter((field) => record[field] !== void 0 && record[field] !== null).map((field) => [field, record[field]])
  );
}
function readString2(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required for local mere-agent records.`);
  }
  return value.trim();
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
    "agentId",
    "agent_id",
    "bindingId",
    "binding_id",
    "sessionId",
    "session_id",
    "shareLinkId",
    "share_link_id",
    "linkId",
    "link_id",
    "toolId",
    "tool_id",
    "versionId",
    "version_id"
  ]);
  return readString2(id, `${RECORD_TYPE_LABELS[type]} id`);
}
function normalizePayloadRecord(input, type, workspaceId, existing) {
  const id = readRecordId(input, type);
  const now = isoNow3();
  const createdAt = readOptionalString(input.createdAt ?? input.created_at) ?? readOptionalString(existing?.createdAt) ?? now;
  const updatedAt = readOptionalString(input.updatedAt ?? input.updated_at) ?? now;
  const agentId = (type === "agents" ? id : readFirstString(input, ["agentId", "agent_id"])) ?? readOptionalString(existing?.agentId);
  if (AGENT_SCOPED_TYPES.has(type) && !agentId) {
    throw new Error(`${RECORD_TYPE_LABELS[type]} requires agentId.`);
  }
  return {
    id,
    agentId,
    createdAt,
    updatedAt,
    payload: {
      ...input,
      id,
      workspaceId,
      agentId,
      createdAt,
      updatedAt
    }
  };
}
function rowPayload(row) {
  const raw = typeof row.payload_json === "string" ? row.payload_json : "{}";
  const parsed = parseJsonText(raw, "stored Agent record");
  return isRecord2(parsed) ? parsed : {};
}
async function readJsonData(args) {
  const inline = option(args, "data");
  const file = option(args, "data-file");
  if (inline && file) throw new Error("Use either --data or --data-file, not both.");
  if (inline) return readObject(parseJsonText(inline, "--data"), "--data");
  if (file) return readObject(parseJsonText(await readFile2(file, "utf8"), `--data-file ${file}`), "--data-file");
  return {};
}
function archiveCounts(payload) {
  return Object.fromEntries(RECORD_TYPES.map((type) => [COUNT_FIELDS[type], payload[type].length]));
}
function stableProjectionId(workspaceId, agentId) {
  const digest = createHash4("sha256").update(AGENT_APP_ID).update("\0").update(workspaceId).update("\0").update(agentId).digest("hex").slice(0, 24);
  return `agp_${digest}`;
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value)) throw new Error("Agent archive payload must be a JSON object.");
  const readList = (type) => Array.isArray(value[type]) ? value[type].filter(isRecord2).map((entry) => normalizePayloadRecord(entry, type, workspaceId).payload) : [];
  return {
    kind: AGENT_ARCHIVE_SCHEMA,
    version: 1,
    agents: readList("agents"),
    bindings: readList("bindings"),
    sessions: readList("sessions"),
    shareLinks: readList("shareLinks"),
    generatedTools: readList("generatedTools"),
    generatedToolVersions: readList("generatedToolVersions")
  };
}
function hostedAgentBoundary() {
  return HOSTED_BOUNDARY;
}
function resolveLocalAgentRecordType(group) {
  switch (group) {
    case "agent":
    case "agents":
      return "agents";
    case "binding":
    case "bindings":
      return "bindings";
    case "session":
    case "sessions":
    case "runtime":
      return "sessions";
    case "share-link":
    case "share-links":
      return "shareLinks";
    case "tool":
    case "tools":
    case "generated-tool":
    case "generated-tools":
      return "generatedTools";
    case "tool-version":
    case "tool-versions":
    case "generated-tool-version":
    case "generated-tool-versions":
      return "generatedToolVersions";
    default:
      return null;
  }
}
function resolveAgentPlaneConfig(args, io) {
  return resolvePlaneConfigInspection({
    appId: AGENT_APP_ID,
    env: io.env,
    data: option(args, "store") ?? option(args, "data-plane"),
    ai: option(args, "ai") ?? option(args, "ai-plane"),
    localDbPath: option(args, "local-db")
  });
}
function isLocalDataRoute(args, io) {
  return resolveAgentPlaneConfig(args, io).data === "local";
}
function localWorkspace(args, io) {
  const workspaceId = option(args, "workspace") ?? trimOption(io.env.MERE_AGENT_WORKSPACE_ID) ?? trimOption(io.env.MERE_AGENT_WORKSPACE) ?? trimOption(io.env.MERE_WORKSPACE_ID) ?? trimOption(io.env.MERE_WORKSPACE) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Agent Archive" : workspaceId
  };
}
async function openLocalStore(args, io) {
  return LocalAgentStore.open({
    config: resolveAgentPlaneConfig(args, io),
    workspace: localWorkspace(args, io)
  });
}
async function withLocalStore(args, io, handler) {
  const store = await openLocalStore(args, io);
  try {
    return await handler(store);
  } finally {
    store.close();
  }
}
function requireLocalData(args, io) {
  if (!isLocalDataRoute(args, io)) {
    throw new Error("This command requires --store local so mere-agent local data stays explicit.");
  }
}
async function handleLocalStoreInfo(args, io) {
  const config = resolveAgentPlaneConfig(args, io);
  if (config.data === "local") {
    return withLocalStore(args, io, (store) => ({
      ok: true,
      app: AGENT_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      ...store.info(),
      sources: config.sources
    }));
  }
  if (asBoolean(args, "json")) {
    return {
      ok: true,
      app: AGENT_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localArchive: "available",
      localAiSupported: true,
      hostedRuntimeLocal: false,
      durableChatLocal: false,
      generatedToolExecutionLocal: false,
      voiceRuntimeLocal: false,
      cloudProjectionLocal: false,
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
    `Agent definitions, bindings, sessions, share links, and generated tool metadata can be archived locally with --store local. Local prompt runs require --ai local and use mere.run. ${HOSTED_BOUNDARY}
`
  );
  return "";
}
async function handleLocalExport(args, io) {
  requireLocalData(args, io);
  return withLocalStore(args, io, async (store) => {
    const bundle = store.exportBundle();
    const output = option(args, "output");
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
async function handleLocalImport(args, io) {
  requireLocalData(args, io);
  return withLocalStore(args, io, async (store) => {
    const value = parseJsonText(
      await readFile2(readRequired(args, "file"), "utf8"),
      "local Agent archive transfer bundle"
    );
    return asBoolean(args, "dry-run") ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalRecordGroup(type, action, rest, args, io) {
  requireLocalData(args, io);
  return withLocalStore(args, io, async (store) => {
    const normalizedAction = action ?? "list";
    if (normalizedAction === "list") return { ok: true, records: store.listRecords(type, rest[0]) };
    if (normalizedAction === "get" || normalizedAction === "show") {
      const id = rest[0];
      if (!id) throw new Error(`${type} ${normalizedAction} requires <id>.`);
      return { ok: true, record: store.getRecord(type, id) };
    }
    if (normalizedAction === "upsert") return store.upsertRecord(type, await readJsonData(args));
    throw new Error(`--store local supports ${type} list/get/show/upsert only. ${HOSTED_BOUNDARY}`);
  });
}
async function handleLocalAgentProjection(action, rest, args, io) {
  requireLocalData(args, io);
  const agentId = rest[0]?.trim() || option(args, "agent");
  if (!agentId) throw new Error(`agent ${action} requires <agent-id> or --agent.`);
  return withLocalStore(args, io, async (store) => {
    const envelope = store.buildProjectionEnvelope({
      action,
      agentId,
      publishedByUserId: option(args, "published-by-user-id") ?? trimOption(io.env.MERE_AGENT_USER_ID) ?? trimOption(io.env.MERE_USER_ID) ?? "local-cli",
      publishedByEmail: option(args, "published-by-email") ?? trimOption(io.env.MERE_AGENT_USER_EMAIL) ?? trimOption(io.env.MERE_USER_EMAIL) ?? null
    });
    if (asBoolean(args, "dry-run")) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: AGENT_APP_ID,
          env: io.env,
          receiverUrl: option(args, "projection-url"),
          bearerToken: option(args, "projection-token")
        }).receiverUrl;
      } catch {
        receiverUrl = void 0;
      }
      return {
        ok: true,
        dryRun: true,
        app: AGENT_APP_ID,
        action,
        store: "local",
        projection: "cloudflare",
        agentId,
        projectionId: envelope.event.projection.id,
        receiverUrl,
        event: envelope
      };
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: AGENT_APP_ID,
      env: io.env,
      receiverUrl: option(args, "projection-url"),
      bearerToken: option(args, "projection-token"),
      event: envelope,
      fetchImpl: io.fetchImpl
    });
    store.recordProjectionEnvelope(envelope);
    return {
      ok: true,
      app: AGENT_APP_ID,
      action,
      store: "local",
      projection: "cloudflare",
      agentId,
      projectionId: envelope.event.projection.id,
      receiverUrl: delivery.receiverUrl,
      status: delivery.status,
      receiver: delivery.responseJson,
      hostedRuntimeLocal: false,
      cloudProjectionLocal: false
    };
  });
}
function localPromptInput(args, store) {
  const agentId = args.positionals[2]?.trim() || option(args, "agent") || "adhoc";
  const prompt = option(args, "prompt") ?? args.positionals.slice(agentId === "adhoc" ? 2 : 3).join(" ").trim();
  if (!prompt) {
    throw new Error("ai prompt requires --prompt <text> or trailing prompt text.");
  }
  const localAgent = agentId === "adhoc" ? null : store.getRecord("agents", agentId);
  const instructions = option(args, "instructions") ?? readOptionalString(localAgent?.instructions);
  const name = option(args, "name") ?? readOptionalString(localAgent?.name) ?? agentId;
  const fullPrompt = [
    `You are running as local mere-agent "${name}".`,
    instructions ? `Agent instructions:
${instructions}` : null,
    `User prompt:
${prompt}`
  ].filter((line) => Boolean(line)).join("\n\n");
  return {
    agentId,
    subjectId: agentId === "adhoc" ? `prompt:${Date.now().toString()}` : agentId,
    prompt: fullPrompt,
    model: option(args, "model") ?? null
  };
}
async function handleLocalAiPrompt(args, io) {
  const config = resolveAgentPlaneConfig(args, io);
  if (config.ai !== "local") {
    throw new Error("ai prompt requires --ai local so the command can invoke local mere.run explicitly.");
  }
  return withLocalStore(args, io, async (store) => {
    const input = localPromptInput(args, store);
    const jobId = store.recordAiJob({
      subjectType: "agent.prompt",
      subjectId: input.subjectId,
      input: {
        agentId: input.agentId,
        prompt: input.prompt
      },
      model: input.model
    });
    try {
      const outputText = await generateText(input.prompt, {
        appId: AGENT_APP_ID,
        env: io.env,
        model: input.model ?? void 0,
        timeoutMs: Number(option(args, "timeout-ms") ?? 24e4)
      });
      store.finishAiJob(jobId, { outputText, model: input.model });
      return {
        ok: true,
        app: AGENT_APP_ID,
        agentId: input.agentId,
        jobId,
        ai: "local",
        model: input.model,
        outputText,
        hostedRuntimeLocal: false,
        cloudProjectionLocal: false
      };
    } catch (error) {
      store.failAiJob(jobId, error instanceof Error ? error.message : String(error), input.model);
      throw error;
    }
  });
}
var LocalAgentStore = class _LocalAgentStore {
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
    registerPlaneApp(opened.db, AGENT_APP_ID, "Mere Agent");
    registerPlaneTransferSchema(opened.db, AGENT_APP_ID, {
      payloadSchema: AGENT_ARCHIVE_SCHEMA,
      displayName: "Agent metadata archive transfer",
      description: "Portable mere-agent agent definition, binding, session, share-link, and generated-tool metadata; hosted runtime, tool execution, voice, auth, and delivery stay on Cloudflare."
    });
    upsertPlaneWorkspace(opened.db, AGENT_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalAgentStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_local_records (
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        agent_id TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, record_type, record_id)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_local_records_type
        ON agent_local_records (workspace_id, record_type, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_agent_local_records_agent
        ON agent_local_records (workspace_id, agent_id, record_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS agent_local_projections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_agent_local_projections_agent
        ON agent_local_projections (workspace_id, agent_id, updated_at DESC);
    `);
  }
  count(type) {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS count FROM agent_local_records WHERE workspace_id = ? AND record_type = ?"
    ).get(this.workspace.workspaceId, type);
    return row.count ?? 0;
  }
  counts() {
    return Object.fromEntries(RECORD_TYPES.map((type) => [COUNT_FIELDS[type], this.count(type)]));
  }
  projectionCount() {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS count FROM agent_local_projections WHERE workspace_id = ?"
    ).get(this.workspace.workspaceId);
    return row.count ?? 0;
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: AGENT_APP_ID });
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      ...this.counts(),
      projectionCount: this.projectionCount(),
      localArchive: "enabled",
      localAiSupported: true,
      hostedRuntimeLocal: false,
      durableChatLocal: false,
      generatedToolExecutionLocal: false,
      voiceRuntimeLocal: false,
      shareLinkServingLocal: false,
      cloudProjectionLocal: false,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listRecords(type, agentId) {
    const rows = agentId ? this.db.prepare(
      "SELECT * FROM agent_local_records WHERE workspace_id = ? AND record_type = ? AND agent_id = ? ORDER BY updated_at DESC"
    ).all(this.workspace.workspaceId, type, agentId) : this.db.prepare(
      "SELECT * FROM agent_local_records WHERE workspace_id = ? AND record_type = ? ORDER BY updated_at DESC"
    ).all(this.workspace.workspaceId, type);
    return rows.map(rowPayload);
  }
  getRecord(type, id) {
    const row = this.db.prepare(
      "SELECT * FROM agent_local_records WHERE workspace_id = ? AND record_type = ? AND record_id = ? LIMIT 1"
    ).get(this.workspace.workspaceId, type, id);
    return row ? rowPayload(row) : null;
  }
  upsertRecord(type, input) {
    const id = readRecordId(input, type);
    const existing = this.getRecord(type, id) ?? void 0;
    const record = normalizePayloadRecord(input, type, this.workspace.workspaceId, existing);
    this.db.prepare(
      `INSERT INTO agent_local_records (
          record_type, record_id, workspace_id, agent_id, payload_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
          agent_id = excluded.agent_id,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at`
    ).run(
      type,
      record.id,
      this.workspace.workspaceId,
      record.agentId,
      JSON.stringify(record.payload),
      record.createdAt,
      record.updatedAt
    );
    return record.payload;
  }
  getProjection(id) {
    const row = this.db.prepare(
      "SELECT id, agent_id, published_at, revoked_at FROM agent_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1"
    ).get(this.workspace.workspaceId, id);
    return row ? {
      id: row.id,
      agentId: row.agent_id,
      publishedAt: row.published_at,
      revokedAt: row.revoked_at
    } : null;
  }
  buildProjectionEnvelope(input) {
    const agent = this.getRecord("agents", input.agentId);
    if (!agent) throw new Error(`Local agent not found: ${input.agentId}`);
    const projectionId = stableProjectionId(this.workspace.workspaceId, input.agentId);
    const existingProjection = this.getProjection(projectionId);
    const now = isoNow3();
    const publishedAt = input.action === "revoke" ? existingProjection?.publishedAt ?? now : now;
    const revokedAt = input.action === "revoke" ? now : null;
    return {
      version: 1,
      event: {
        type: input.action === "publish" ? "agent.projection.upserted" : "agent.projection.revoked",
        appId: AGENT_APP_ID,
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "agent",
          agentId: input.agentId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        agent: pickProjectionFields(agent, AGENT_PROJECTION_FIELDS),
        bindings: this.listRecords("bindings", input.agentId).map(
          (record) => pickProjectionFields(record, BINDING_PROJECTION_FIELDS)
        ),
        shareLinks: this.listRecords("shareLinks", input.agentId).map(
          (record) => pickProjectionFields(record, SHARE_LINK_PROJECTION_FIELDS)
        ),
        generatedTools: this.listRecords("generatedTools", input.agentId).map(
          (record) => pickProjectionFields(record, GENERATED_TOOL_PROJECTION_FIELDS)
        )
      }
    };
  }
  recordProjectionEnvelope(envelope) {
    const projection = envelope.event.projection;
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO agent_local_projections (
          id, workspace_id, agent_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          agent_id = excluded.agent_id,
          published_at = excluded.published_at,
          revoked_at = excluded.revoked_at,
          payload_json = excluded.payload_json,
          last_projected_at = excluded.last_projected_at,
          updated_at = excluded.updated_at`
    ).run(
      projection.id,
      envelope.event.workspaceId,
      projection.agentId,
      projection.publishedAt,
      projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: AGENT_ARCHIVE_SCHEMA,
      version: 1,
      agents: this.listRecords("agents"),
      bindings: this.listRecords("bindings"),
      sessions: this.listRecords("sessions"),
      shareLinks: this.listRecords("shareLinks"),
      generatedTools: this.listRecords("generatedTools"),
      generatedToolVersions: this.listRecords("generatedToolVersions")
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: AGENT_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: AGENT_ARCHIVE_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: AGENT_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: AGENT_ARCHIVE_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: AGENT_APP_ID,
      payloadSchema: AGENT_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? AGENT_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? AGENT_ARCHIVE_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: AGENT_APP_ID,
      payloadSchema: AGENT_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const type of RECORD_TYPES) {
        for (const record of normalized[type]) this.upsertRecord(type, record);
      }
      const transferId = recordPlaneTransfer(this.db, {
        appId: AGENT_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        ...bundle?.source ? { source: bundle.source } : {},
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? AGENT_ARCHIVE_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        ...this.counts(),
        transferId,
        hostedRuntimeLocal: false,
        cloudProjectionLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  recordAiJob(input) {
    return recordPlaneAiJob(this.db, {
      appId: AGENT_APP_ID,
      workspaceId: this.workspace.workspaceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      mode: "local",
      model: input.model ?? null,
      status: "running",
      input: input.input
    });
  }
  finishAiJob(id, input) {
    updatePlaneAiJob(this.db, {
      id,
      status: "done",
      model: input.model ?? null,
      outputText: input.outputText
    });
  }
  failAiJob(id, error, model) {
    updatePlaneAiJob(this.db, {
      id,
      status: "failed",
      model: model ?? null,
      error
    });
  }
};

// cli/agent.ts
var DEFAULT_BASE_URL = process.env.MERE_AGENT_BASE_URL?.trim() || process.env.AGENT_BASE_URL?.trim() || "https://agent.mere.works";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "dry-run",
  "help",
  "json",
  "version",
  "yes"
]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["v", "version"],
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
  if (file) return objectValue(JSON.parse(await readFile3(file, "utf8")));
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
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version ?? "0.0.0";
}
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
    app: "mere-agent",
    namespace: "agent",
    aliases: ["mere-agent", "agent", "agents"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_AGENT_BASE_URL", "AGENT_BASE_URL"],
    sessionPath: "~/.local/state/mere-agent/session.json",
    globalFlags: [
      "base-url",
      "workspace",
      "store",
      "data-plane",
      "ai",
      "ai-plane",
      "local-db",
      "projection-url",
      "projection-token",
      "json",
      "yes",
      "confirm"
    ],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write", flags: ["base-url"] }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List available workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show the current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a default workspace.", { auth: "session", risk: "write", positionals: ["workspace"] }),
      manifestCommand(["template", "list"], "List agent templates.", { auditDefault: true }),
      manifestCommand(["agent", "list"], "List workspace agents.", { auditDefault: true }),
      manifestCommand(["agent", "get"], "Get an agent.", { positionals: ["agentId"] }),
      manifestCommand(["agent", "create"], "Create an agent.", { risk: "write", supportsData: true, flags: ["template", "template-key", "kind", "name", "description", "instructions", "model-tier", "scope"] }),
      manifestCommand(["agent", "update"], "Update an agent.", { risk: "write", supportsData: true, positionals: ["agentId"], flags: ["template", "template-key", "kind", "name", "description", "instructions", "model-tier", "scope"] }),
      manifestCommand(["agent", "deploy"], "Deploy an agent.", { risk: "write", positionals: ["agentId"] }),
      manifestCommand(["agent", "pause"], "Pause an agent.", { risk: "write", positionals: ["agentId"] }),
      manifestCommand(["agent", "publish"], "Publish selected local agent metadata to the Business projection receiver.", { auth: "none", risk: "external", positionals: ["agentId"], flags: ["dry-run", "published-by-user-id", "published-by-email"] }),
      manifestCommand(["agent", "revoke"], "Revoke selected local agent metadata from the Business projection receiver.", { auth: "none", risk: "external", positionals: ["agentId"], flags: ["dry-run", "published-by-user-id", "published-by-email"] }),
      manifestCommand(["agent", "archive"], "Archive an agent.", { risk: "destructive", requiresYes: true, positionals: ["agentId"] }),
      manifestCommand(["agent", "delete"], "Permanently delete an agent.", { risk: "destructive", requiresYes: true, requiresConfirm: true, positionals: ["agentId"] }),
      manifestCommand(["runtime", "mint"], "Mint an agent runtime session.", { risk: "write", supportsData: true, positionals: ["agentId"], flags: ["session", "session-id", "seed-from-template", "template"] }),
      manifestCommand(["share-link", "create"], "Create an external share link.", { risk: "write", supportsData: true, positionals: ["agentId"], flags: ["agent", "label", "expires-at"] }),
      manifestCommand(["share-link", "revoke"], "Revoke an external share link.", { risk: "destructive", requiresYes: true, requiresConfirm: true, positionals: ["agentId", "linkId"], flags: ["agent", "link"] }),
      manifestCommand(["tool", "list"], "List generated tools.", { positionals: ["agentId"], flags: ["agent"] }),
      manifestCommand(["tool", "get"], "Get a generated tool.", { positionals: ["agentId", "toolId"], flags: ["agent", "tool"] }),
      manifestCommand(["tool", "upsert"], "Create or update a generated tool.", { risk: "write", supportsData: true, positionals: ["agentId"], flags: ["agent", "tool-id", "name", "description", "backend", "manifest", "code", "manifest-file", "code-file", "policy"] }),
      manifestCommand(["tool", "run"], "Run a generated tool.", { risk: "external", supportsData: true, positionals: ["agentId", "toolId"], flags: ["agent", "tool", "input", "context"] }),
      manifestCommand(["tool", "retire"], "Retire a generated tool.", { risk: "destructive", requiresYes: true, requiresConfirm: true, positionals: ["agentId", "toolId"], flags: ["agent", "tool"] }),
      manifestCommand(["tool", "reactivate"], "Reactivate a generated tool.", { risk: "write", positionals: ["agentId", "toolId"], flags: ["agent", "tool"] }),
      manifestCommand(["store", "info"], "Inspect local/cloud data and AI plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export a local agent metadata transfer bundle.", { auth: "none", auditDefault: true, flags: ["output"] }),
      manifestCommand(["import"], "Import a local agent metadata transfer bundle.", { auth: "none", risk: "write", requiresConfirm: true, flags: ["file", "dry-run"] }),
      manifestCommand(["ai", "prompt"], "Run a local prompt through mere.run and record the AI job.", { auth: "none", risk: "write", positionals: ["agentId"], flags: ["agent", "prompt", "instructions", "name", "model", "timeout-ms"] }),
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
  agent publish|revoke <agentId> --store local [--dry-run]
  runtime mint <agentId>
  share-link create|revoke
  tool list|get|upsert|run|retire|reactivate
  store info
  export --store local --output <file>
  import --store local --file <file> [--dry-run]
  ai prompt [agentId] --ai local --prompt <text>

Global flags:
  --base-url <url>        Base URL for auth login (default: MERE_AGENT_BASE_URL or production)
  --workspace <id|slug|host>
                          Target workspace for login or this command
  --store <cloud|local>   Data plane for local archive commands (default: cloud)
  --ai <cloud|local>      AI plane for prompt commands (default: cloud)
  --local-db <path>       Shared local-plane SQLite database path
  --model <name>          Local mere.run model override
  --timeout-ms <ms>       Local mere.run timeout
  --projection-url <url>  Cloudflare Business projection receiver URL
  --projection-token <t>  Cloudflare Business projection bearer token
  --json                  Print JSON output
  --data <json>           Structured mutation payload
  --data-file <path>      Read structured mutation payload from a file
  --output <path>         Write local export bundle
  --file <path>           Read local import bundle
  --dry-run               Build an import plan without writing records
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
  "ai",
  "auth",
  "agent",
  "completion",
  "export",
  "import",
  "runtime",
  "share-link",
  "store",
  "template",
  "tool",
  "workspace"
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
  if (manifestFile) body.manifest = await readFile3(manifestFile, "utf8");
  const codeFile = readFlag(parsed, "code-file");
  if (codeFile) body.code = await readFile3(codeFile, "utf8");
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
function localPlaneIo(io) {
  return {
    env: io.env,
    fetchImpl: io.fetchImpl,
    stdout: io.stdout
  };
}
async function handleLocalDataCommand(parsed, io) {
  const [resource, action, ...rest] = parsed.positionals;
  const localIo = localPlaneIo(io);
  const localData = isLocalDataRoute(parsed, localIo);
  let result;
  if (resource === "store") {
    if (action !== "info") throw new CliError("Unknown store command: expected info.", 2);
    result = await handleLocalStoreInfo(parsed, localIo);
  } else if (resource === "export") {
    result = await handleLocalExport(parsed, localIo);
  } else if (resource === "import") {
    result = await handleLocalImport(parsed, localIo);
  } else if (resource === "ai" && action === "prompt") {
    result = await handleLocalAiPrompt(parsed, localIo);
  } else if (localData) {
    const type = resolveLocalAgentRecordType(resource);
    if (!type) {
      throw new CliError(
        `--store local is not supported for ${resource}. Supported local commands are store info, agent publish/revoke, agents, bindings, sessions, share-links, tools, tool-versions, export, import, and ai prompt. ${hostedAgentBoundary()}`,
        1
      );
    }
    if (type === "agents" && (action === "publish" || action === "revoke")) {
      result = await handleLocalAgentProjection(action, rest, parsed, localIo);
    } else {
      result = await handleLocalRecordGroup(type, action || "list", rest, parsed, localIo);
    }
  } else {
    return false;
  }
  writeResult(io, parsed, result);
  return true;
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
    if (readBooleanFlag(parsed, "version") || parsed.positionals[0] === "version") {
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
    if (await handleLocalDataCommand(parsed, io)) {
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
