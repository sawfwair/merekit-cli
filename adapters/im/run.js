#!/usr/bin/env node

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_e97ac852f63439d5e35d9f7d6b58d5fb/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "child_process";
import { createServer } from "http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_e97ac852f63439d5e35d9f7d6b58d5fb/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_e97ac852f63439d5e35d9f7d6b58d5fb/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_e97ac852f63439d5e35d9f7d6b58d5fb/node_modules/@mere/cli-auth/src/client.ts
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

// cli/mere-im.ts
var DEFAULT_BASE_URL = "https://mere.im";
var APP_NAME = "mere-im";
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "base-url",
  "workspace",
  "workspace-id",
  "cookie",
  "session-cookie",
  "bearer",
  "token",
  "internal-token",
  "confirm",
  "data",
  "data-file",
  "handle",
  "participant",
  "participant-user",
  "kind",
  "title",
  "disappearing-seconds",
  "linked-entity-type",
  "linked-entity-id",
  "message-id",
  "sender-device-id",
  "client-message-id",
  "expires-in",
  "attachment",
  "content-type",
  "size-bytes",
  "encrypted-metadata",
  "upload-token",
  "file",
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
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["json", "help", "yes", "no-interactive"]);
var activeSession = null;
function manifestCommand(path2, summary, options = {}) {
  return {
    id: path2.join("."),
    path: path2,
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
    "workspace",
    "json",
    "cookie",
    "session-cookie",
    "bearer",
    "token",
    "internal-token",
    "data",
    "data-file",
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
    manifestCommand(["auth", "login"], "Start browser login and store a dedicated CLI session.", {
      auth: "none",
      risk: "write",
      flags: ["base-url", "workspace", "json"]
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
      flags: SESSION_FLAGS
    }),
    manifestCommand(["conversations", "get"], "Show one conversation and its message metadata.", {
      auth: "session",
      positionals: ["conversationId"],
      flags: SESSION_FLAGS
    }),
    manifestCommand(["conversations", "create"], "Create a direct or group conversation.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "kind", "participant", "title", "workspace"]
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
      flags: SESSION_FLAGS
    }),
    manifestCommand(["messages", "send"], "Send an encrypted message payload.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      positionals: ["conversationId"],
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "sender-device-id", "client-message-id", "attachment", "expires-in"]
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
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, "content-type", "size-bytes", "encrypted-metadata"]
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
      flags: SESSION_FLAGS
    }),
    manifestCommand(["devices", "register"], "Register a local device key bundle.", {
      auth: "session",
      risk: "write",
      supportsData: true,
      flags: [...SESSION_FLAGS, ...DATA_FLAGS, ...DEVICE_KEY_FLAGS]
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
  const { readFile: readFile2 } = await import("fs/promises");
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
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
    const { readFile: readFile2 } = await import("fs/promises");
    return readFile2(file, "utf8");
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
  if (json) return writeJson(ctx, session);
  ctx.stdout(`${renderSessionSummary(session, ctx)}
`);
  return 0;
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
    internalHealth = await fetchJson2(baseUrl, "/api/internal/zerosmb/health", args, ctx, { internal: true });
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
  ctx.stdout(`Profile: ${String(data.displayName ?? data.handle ?? data.userId ?? "unknown")}
`);
  if (data.userId) ctx.stdout(`User ID: ${String(data.userId)}
`);
  if (data.handle) ctx.stdout(`Handle: ${String(data.handle)}
`);
  if (data.primaryEmail) ctx.stdout(`Email: ${String(data.primaryEmail)}
`);
  return 0;
}
async function cmdHandleLookup(baseUrl, handle, json, ctx) {
  const target = requireTarget(handle, "Usage: mere-im handles lookup <handle>");
  const data = await fetchJson2(baseUrl, `/api/handles/${encodeURIComponent(target)}`, [], ctx);
  if (json) return writeJson(ctx, data);
  const profile = data;
  ctx.stdout(`Handle: ${String(profile.handle ?? target)}
`);
  if (profile.userId) ctx.stdout(`User ID: ${String(profile.userId)}
`);
  if (profile.displayName) ctx.stdout(`Display name: ${String(profile.displayName)}
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
  ctx.stdout(`Handle: ${String(profile.handle ?? target)}
`);
  if (profile.userId) ctx.stdout(`User ID: ${String(profile.userId)}
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
  ctx.stdout(`Attachment: ${String(ticket.attachmentId ?? "created")}
`);
  if (ticket.uploadUrl) ctx.stdout(`Upload URL: ${String(ticket.uploadUrl)}
`);
  if (ticket.expiresAt) ctx.stdout(`Expires: ${formatDate(String(ticket.expiresAt))}
`);
  return 0;
}
async function cmdAttachmentUpload(baseUrl, args, attachmentId, json, ctx) {
  const target = requireTarget(attachmentId, "Usage: mere-im attachments upload <attachmentId> --upload-token <token> --file <path>");
  const uploadToken = requireTarget(readFlag(args, "upload-token"), "Missing --upload-token.");
  const file = requireTarget(readFlag(args, "file"), "Missing --file.");
  const { readFile: readFile2 } = await import("fs/promises");
  const bytes = await readFile2(file);
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
  ctx.stdout(`Pairing code: ${String(result.pairingCode ?? "created")}
`);
  if (result.expiresAt) ctx.stdout(`Expires: ${formatDate(String(result.expiresAt))}
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
  const data = await fetchJson2(baseUrl, "/api/internal/zerosmb/health", args, ctx, { internal: true });
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
    `/api/internal/zerosmb/workspaces/${encodeURIComponent(target)}/${action}`,
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
  if (result.status) ctx.stdout(`Status: ${String(result.status)}
`);
  if (result.health) ctx.stdout(`Health: ${String(result.health)}
`);
  return 0;
}
async function cmdWorkspaceDisconnect(baseUrl, args, workspaceId, json, ctx) {
  requireInternalToken(args, ctx, "workspace disconnect");
  const target = workspaceIdArg(args, workspaceId, "Usage: mere-im workspace disconnect <workspaceId> --yes --confirm <workspaceId>");
  requireDestructiveConfirmation(args, "disconnect workspace", target);
  const data = await requestJson(
    baseUrl,
    `/api/internal/zerosmb/workspaces/${encodeURIComponent(target)}/connection`,
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
    `/api/internal/zerosmb/workspaces/${encodeURIComponent(target)}/share-card`,
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
    `/api/internal/zerosmb/workspaces/${encodeURIComponent(target)}/video-handoff`,
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
    auth login                       Start browser login and store CLI session
    auth whoami                      Show current broker-authenticated user
    auth logout                      Clear local CLI session
    session status                   Show raw current session
    workspace list|current|use       Manage local CLI workspace selection
    profile show                     Show signed-in profile
    handles lookup <handle>          Look up a public profile by handle
    handles claim <handle>           Claim or update your handle
    conversations list               List conversations
    conversations get <id>           Show one conversation
    conversations create             Create a conversation (--participant USER)
    conversations read <id>          Mark a conversation read
    messages list <conversationId>   List encrypted message metadata
    messages send <conversationId>   Send an encrypted payload from --data
    share-card send <conversationId> Send a share-card message
    attachments ticket               Create an attachment upload ticket
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
    --workspace <id>         Workspace filter or local session workspace
    --json                   Machine-readable JSON output
    --data <json>            JSON object body for write commands
    --data-file <path>       Read JSON object body from file
    --yes --confirm <id>     Required for destructive commands
    --cookie <header>        Raw Cookie header for browser-session reads
    --session-cookie <value> Raw Cookie header for browser-session reads
    --bearer <token>         Bearer token for session reads
    --token <token>          Alias for --bearer
    --internal-token <token> Internal token for workspace bridge health
    --help                   Show this help

  Environment:
    MERE_IM_BASE_URL          API base URL override
    MERE_IM_SESSION_COOKIE    Raw Cookie header for browser-session reads
    MERE_IM_BEARER_TOKEN      Bearer token for session reads
    MERE_IM_TOKEN             Alias for MERE_IM_BEARER_TOKEN
    MERE_IM_INTERNAL_TOKEN    Internal workspace bridge token
    MERE_IM_WORKSPACE         Default workspace filter

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
    const skipsSessionRefresh = rawArgs.includes("--help") || rawArgs.includes("-h") || group === "" || group === "help" || group === "about" || group === "auth" && (action === "login" || action === "logout");
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
    if (group === "auth" && action === "login") {
      return await cmdAuthLogin(baseUrl, rawArgs, json, ctx);
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
      return await cmdConversationsList(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "get" || action === "show")) {
      return await cmdConversationGet(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "create" || action === "new")) {
      return await cmdConversationCreate(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "conversations" || group === "conversation") && (action === "read" || action === "mark-read")) {
      return await cmdConversationRead(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "messages" && (action === "list" || action === "")) {
      return await cmdMessagesList(baseUrl, rawArgs, action === "list" ? args[2] : args[1], json, ctx);
    }
    if (group === "messages" && (action === "send" || action === "create")) {
      return await cmdMessagesSend(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "share-card" || group === "sharecard") && (action === "send" || action === "create")) {
      return await cmdShareCardSend(baseUrl, rawArgs, args[2], json, ctx);
    }
    if ((group === "attachments" || group === "attachment") && (action === "ticket" || action === "upload-ticket")) {
      return await cmdAttachmentTicket(baseUrl, rawArgs, json, ctx);
    }
    if ((group === "attachments" || group === "attachment") && action === "upload") {
      return await cmdAttachmentUpload(baseUrl, rawArgs, args[2], json, ctx);
    }
    if (group === "devices" && (action === "list" || action === "")) {
      return await cmdDevicesList(baseUrl, rawArgs, action === "list" ? args[2] : args[1], json, ctx);
    }
    if (group === "devices" && action === "register") {
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
