#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import { readFileSync } from "node:fs";
import path2 from "node:path";
import { stdout as output2, stderr } from "node:process";
import { fileURLToPath } from "node:url";

// ../cli-core/src/errors.ts
var CommandError = class extends Error {
  exitCode;
  code;
  status;
  details;
  constructor(message, options = {}) {
    super(message);
    this.name = "CommandError";
    this.exitCode = options.exitCode ?? 1;
    this.code = options.code ?? "command_error";
    this.status = options.status;
    this.details = options.details;
  }
};
function usageError(message, details) {
  return new CommandError(message, {
    exitCode: 2,
    code: "usage_error",
    details
  });
}
function authError(message, details) {
  return new CommandError(message, {
    exitCode: 3,
    code: "auth_error",
    details
  });
}

// ../cli-core/src/terminal.ts
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
function printJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}
`);
}
function errorPayload(error) {
  if (error instanceof CommandError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details
    };
  }
  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Unexpected error."
  };
}
async function confirmIfNeeded(message, options) {
  if (options.yes) return;
  if (options.noInteractive) {
    throw usageError(`${message} Pass --yes to continue without a prompt.`);
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    const normalized = answer.trim().toLowerCase();
    if (normalized !== "y" && normalized !== "yes") {
      throw usageError("Command cancelled.");
    }
  } finally {
    rl.close();
  }
}
async function confirmExactTextIfNeeded(message, expected, options) {
  if (options.yes && options.confirm?.trim() === expected) {
    return;
  }
  if (options.noInteractive) {
    throw usageError(`${message} Pass --yes --confirm ${expected} to continue without a prompt.`);
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} Type ${expected} to continue: `);
    if (answer.trim() !== expected) {
      throw usageError("Command cancelled.");
    }
  } finally {
    rl.close();
  }
}

// ../cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// ../cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// ../cli-auth/src/session.ts
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
function workspaceBaseUrl(workspace) {
  if (/^https?:\/\//i.test(workspace.host)) {
    return workspace.host.replace(/\/$/, "");
  }
  return `https://${workspace.host.replace(/\/$/, "")}`;
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

// ../cli-auth/src/client.ts
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
async function fetchJson(fetchImpl, input2) {
  return parseJson(await fetchImpl(input2));
}
async function postJson(fetchImpl, input2, body) {
  return parseJson(
    await fetchImpl(input2, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}
async function waitForCallback(input2) {
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
        `<!doctype html><html><body><h1>${input2.productLabel} login complete.</h1><p>You can close this window.</p></body></html>`
      );
      void (async () => {
        clearTimeout(timeout);
        server.close();
        try {
          const exchangeUrl = new URL(CLI_AUTH_EXCHANGE_PATH, input2.baseUrl);
          resolve(await postJson(input2.fetchImpl, exchangeUrl, { requestId, code }));
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
          const startUrl = new URL(CLI_AUTH_START_PATH, input2.baseUrl);
          startUrl.searchParams.set(CLI_AUTH_CALLBACK_URL_QUERY_PARAM, callbackUrl.toString());
          if (input2.workspace?.trim()) {
            startUrl.searchParams.set("workspace", input2.workspace.trim());
          }
          const started = await fetchJson(input2.fetchImpl, startUrl);
          const opened = maybeOpenBrowser(started.authorizeUrl);
          input2.notify(
            opened ? `Opened your browser to complete ${input2.productLabel} login.` : `Open this URL to complete ${input2.productLabel} login:`
          );
          input2.notify(started.authorizeUrl);
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
async function loginWithBrowser(input2) {
  const baseUrl = normalizeBaseUrl(input2.baseUrl);
  const payload = await waitForCallback({
    baseUrl,
    fetchImpl: input2.fetchImpl ?? fetch,
    notify: input2.notify,
    workspace: input2.workspace,
    productLabel: input2.productLabel
  });
  return createLocalSession(payload, {
    baseUrl,
    defaultWorkspaceId: payload.workspace?.id ?? payload.defaultWorkspaceId
  });
}
async function refreshRemoteSession(input2) {
  const refreshUrl = new URL(CLI_AUTH_REFRESH_PATH, normalizeBaseUrl(input2.baseUrl));
  return postJson(input2.fetchImpl ?? fetch, refreshUrl, {
    refreshToken: input2.refreshToken,
    workspace: input2.workspace ?? null
  });
}
async function logoutRemoteSession(input2) {
  const logoutUrl = new URL(CLI_AUTH_LOGOUT_PATH, normalizeBaseUrl(input2.baseUrl));
  await postJson(input2.fetchImpl ?? fetch, logoutUrl, {
    refreshToken: input2.refreshToken
  });
}

// src/store.ts
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
var DEFAULT_CONSOLE_URL = process.env.MERE_BUSINESS_BASE_URL?.trim() || process.env.ZEROSMB_CONSOLE_URL?.trim() || "https://mere.business";
var PRIMARY_APP_NAME = "mere-business";
var LEGACY_APP_NAME = "zerosmb";
function normalizeConsoleUrl(raw = DEFAULT_CONSOLE_URL) {
  let value = raw.trim();
  if (!value) value = DEFAULT_CONSOLE_URL;
  const url = new URL(value);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function resolveCliPaths2(env = process.env) {
  const paths = resolveCliPaths(PRIMARY_APP_NAME, env);
  return {
    configDir: paths.stateDir,
    ...paths
  };
}
function resolveLegacyCliPaths(env = process.env) {
  const paths = resolveCliPaths(LEGACY_APP_NAME, env);
  return {
    configDir: paths.stateDir,
    ...paths
  };
}
function coerceLocalSession(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const parsed = value;
  if (parsed.version !== 1 || typeof parsed.refreshToken !== "string" || typeof parsed.accessToken !== "string" || parsed.workspace === void 0 || !Array.isArray(parsed.workspaces) || !parsed.user || !parsed.accessTokenClaims) {
    return null;
  }
  const exp = parsed.accessTokenClaims.exp;
  const expiresAt = typeof parsed.expiresAt === "string" && parsed.expiresAt.length > 0 ? parsed.expiresAt : typeof exp === "number" ? new Date(exp * 1e3).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...parsed,
    version: 1,
    baseUrl: normalizeConsoleUrl(parsed.baseUrl ?? parsed.consoleUrl ?? DEFAULT_CONSOLE_URL),
    defaultWorkspaceId: parsed.defaultWorkspaceId ?? parsed.workspace?.id ?? null,
    expiresAt,
    lastRefreshAt: parsed.lastRefreshAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function readSessionFile(sessionFile) {
  try {
    const raw = await readFile(sessionFile, "utf8");
    return coerceLocalSession(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function loadSession(paths = resolveCliPaths2()) {
  const current = await readSessionFile(paths.sessionFile);
  if (current) {
    return current;
  }
  const legacyPaths = resolveLegacyCliPaths();
  if (legacyPaths.sessionFile === paths.sessionFile) {
    return null;
  }
  return readSessionFile(legacyPaths.sessionFile);
}
async function saveSession(session, paths = resolveCliPaths2()) {
  await mkdir(paths.stateDir, { recursive: true });
  await writeFile(paths.sessionFile, `${JSON.stringify(session, null, 2)}
`, "utf8");
  await chmod(paths.sessionFile, 384).catch(() => void 0);
}
async function clearSession(paths = resolveCliPaths2()) {
  await rm(paths.sessionFile, { force: true });
}
function workspaceBaseUrl2(workspace) {
  return workspaceBaseUrl(workspace);
}
function requireWorkspaceSelection2(workspaces, selector) {
  return requireWorkspaceSelection(workspaces, selector);
}
function sessionNeedsRefresh2(session, targetWorkspaceId, now = Date.now()) {
  return sessionNeedsRefresh(session, targetWorkspaceId, now);
}
function mergeSessionPayload2(current, payload, options = {}) {
  return mergeSessionPayload(current, payload, {
    baseUrl: normalizeConsoleUrl(options.consoleUrl ?? current.baseUrl),
    persistDefaultWorkspace: options.persistDefaultWorkspace
  });
}

// src/auth.ts
async function loginWithBrowser2(options, notify) {
  const consoleUrl = normalizeConsoleUrl(options.consoleUrl);
  return await loginWithBrowser({
    baseUrl: consoleUrl,
    productLabel: "mere-business",
    workspace: options.workspace,
    notify
  });
}
async function logoutRemote(session) {
  await logoutRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken
  });
}
async function refreshRemoteSession2(session, options = {}) {
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace: options.workspace ?? null
  });
  return mergeSessionPayload2(session, payload, {
    persistDefaultWorkspace: options.persistDefaultWorkspace
  });
}

// src/http.ts
import { mkdir as mkdir2, stat, writeFile as writeFile2 } from "node:fs/promises";
import { basename, dirname, join, resolve as resolvePath, sep as pathSeparator } from "node:path";

// ../shared/contracts/cli.ts
var CLI_OPERATION_NAMES = [
  "auth.whoami",
  "ops.list",
  "ops.get",
  "ops.actors",
  "ops.assign",
  "ops.observe",
  "ops.snooze",
  "ops.move",
  "ops.restore",
  "ops.resolve",
  "ops.reopen",
  "mail.list",
  "mail.get",
  "mail.mailboxes",
  "mail.star",
  "mail.archive",
  "mail.send",
  "mail.reply",
  "messages.list",
  "messages.get",
  "messages.create",
  "messages.reply",
  "messages.read",
  "messages.close",
  "messages.reopen",
  "contacts.list",
  "contacts.get",
  "contacts.create",
  "contacts.update",
  "companies.list",
  "companies.get",
  "companies.create",
  "deals.list",
  "deals.get",
  "deals.pipelines",
  "deals.create",
  "deals.move-stage",
  "tasks.list",
  "tasks.get",
  "tasks.create",
  "tasks.status",
  "campaigns.list",
  "campaigns.get",
  "campaigns.create",
  "campaigns.update",
  "campaigns.delete",
  "campaigns.prepare",
  "campaigns.send",
  "segments.list",
  "segments.create",
  "segments.delete",
  "reach.dashboard",
  "calendar.list",
  "calendar.event.create",
  "calendar.event.update",
  "calendar.event.cancel",
  "calendar.subscriptions.list",
  "calendar.subscriptions.create",
  "calendar.subscriptions.delete",
  "calendar.subscriptions.sync",
  "calendar.feed.get",
  "calendar.feed.generate",
  "calendar.feed.revoke",
  "site.current",
  "site.get",
  "site.create",
  "site.save-draft",
  "site.approve",
  "site.regenerate",
  "voice.status",
  "voice.calls.list",
  "voice.calls.get",
  "voice.calls.refresh",
  "voice.calls.close",
  "voice.calls.archive",
  "voice.calls.reanalyze",
  "voice.sms.list",
  "voice.sms.get",
  "voice.sms.read",
  "voice.sms.close",
  "voice.locations.list",
  "voice.locations.create",
  "voice.locations.update",
  "voice.locations.delete",
  "voice.scripts.list",
  "voice.scripts.get",
  "voice.scripts.create",
  "voice.scripts.update",
  "voice.scripts.delete",
  "voice.scripts.stages.create",
  "voice.scripts.stages.update",
  "voice.scripts.stages.delete",
  "voice.scripts.stages.reorder",
  "voice.numbers.list",
  "voice.numbers.get",
  "voice.numbers.search",
  "voice.numbers.buy",
  "voice.numbers.update",
  "voice.numbers.delete",
  "voice.numbers.pause",
  "voice.numbers.resume",
  "voice.numbers.route",
  "voice.provider-accounts.list",
  "voice.provider-accounts.create",
  "voice.provider-accounts.update",
  "voice.provider-accounts.delete",
  "voice.provider-accounts.sync",
  "voice.telco-calls.list",
  "voice.default-booth",
  "settings.profile.get",
  "settings.profile.set",
  "settings.ai.get",
  "settings.ai.set",
  "settings.slack.get",
  "settings.slack.set",
  "settings.slack.bindings.replace",
  "settings.slack.bootstrap",
  "settings.team.get",
  "settings.team.invite",
  "settings.team.resend",
  "settings.team.revoke",
  "settings.team.role",
  "settings.team.remove",
  "onboarding.snapshot",
  "onboarding.tool.run"
];
var CLI_ROUTE_PATH = "/api/cli/v2";
var CLI_OPERATION_SET = new Set(CLI_OPERATION_NAMES);

// ../cli-core/src/http.ts
async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
async function fetchJson2(input2, init) {
  let response;
  try {
    response = await fetch(input2, init);
  } catch (error) {
    throw new CommandError(
      error instanceof Error ? error.message : "The request failed before a response was received.",
      { exitCode: 1, code: "network_error" }
    );
  }
  const body = await parseResponseBody(response);
  if (!response.ok) {
    const payload = body;
    const message = typeof payload === "string" ? payload : payload?.error ?? payload?.message ?? `Request failed with status ${response.status}.`;
    throw new CommandError(message, {
      exitCode: response.status === 401 || response.status === 403 ? 3 : 1,
      code: "http_error",
      status: response.status,
      details: typeof payload === "object" ? payload?.details : void 0
    });
  }
  return body;
}
async function postJson2(input2, body, init = {}) {
  return fetchJson2(input2, {
    ...init,
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...init.headers ?? {}
    },
    body: JSON.stringify(body)
  });
}

// src/http.ts
async function getWorkspaceProfile(workspace, accessToken) {
  const url = new URL(CLI_ROUTE_PATH, workspaceBaseUrl2(workspace));
  const body = await fetchJson2(url, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  if (!body.ok) {
    throw new CommandError(body.error.message, {
      exitCode: body.error.code === "unauthorized" ? 3 : 1,
      code: body.error.code,
      details: body.error.details
    });
  }
  return body.data;
}
async function redeemConsoleInvite(input2) {
  const url = new URL("/api/cli/v1/invites/redeem", input2.baseUrl);
  return postJson2(
    url,
    { code: input2.code, refreshToken: input2.refreshToken },
    {
      headers: {
        authorization: `Bearer ${input2.accessToken}`
      }
    }
  ).then((payload) => payload);
}
async function bootstrapConsoleOnboarding(input2) {
  const url = new URL("/api/cli/v1/onboarding/bootstrap", input2.baseUrl);
  return postJson2(
    url,
    { code: input2.code, refreshToken: input2.refreshToken, values: input2.values ?? {} },
    {
      headers: {
        authorization: `Bearer ${input2.accessToken}`
      }
    }
  ).then((payload) => payload);
}
async function getConsoleOnboardingStatus(input2) {
  const url = new URL("/api/cli/v1/onboarding/status", input2.baseUrl);
  return postJson2(
    url,
    { workspaceId: input2.workspaceId, refreshToken: input2.refreshToken },
    {
      headers: {
        authorization: `Bearer ${input2.accessToken}`
      }
    }
  ).then((payload) => payload);
}
async function postWorkspaceOperation(workspace, accessToken, op, input2) {
  const url = new URL(CLI_ROUTE_PATH, workspaceBaseUrl2(workspace));
  const body = await postJson2(
    url,
    { op, input: input2 },
    {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    }
  );
  if (!body.ok) {
    throw new CommandError(body.error.message, {
      exitCode: body.error.code === "unauthorized" ? 3 : 1,
      code: body.error.code,
      details: body.error.details
    });
  }
  return body.data;
}
async function fetchWorkspaceResource(workspace, accessToken, pathname, init = {}) {
  const url = new URL(pathname, workspaceBaseUrl2(workspace));
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  let response;
  try {
    response = await fetch(url, {
      ...init,
      headers
    });
  } catch (error) {
    throw new CommandError(
      error instanceof Error ? error.message : "The request failed before a response was received.",
      { exitCode: 1, code: "network_error" }
    );
  }
  if (!response.ok) {
    const payload = await response.clone().text().then((text) => {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    });
    const message = typeof payload === "string" ? payload : payload?.error ?? payload?.message ?? `Request failed with status ${response.status}.`;
    throw new CommandError(message, {
      exitCode: response.status === 401 || response.status === 403 ? 3 : 1,
      code: "http_error",
      status: response.status,
      details: typeof payload === "object" ? payload?.details : void 0
    });
  }
  return response;
}
function filenameFromContentDisposition(header) {
  if (!header) return null;
  const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }
  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }
  const plainMatch = header.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() ?? null;
}
function sanitizeDownloadFilename(filename, fallback) {
  const safe = basename((filename ?? "").trim()).replace(/[\\/]/g, "_");
  return safe || fallback;
}
async function resolveDownloadTarget(outputPath, filename) {
  if (!outputPath) {
    return resolvePath(process.cwd(), filename);
  }
  const resolved = resolvePath(outputPath);
  if (outputPath.endsWith("/") || outputPath.endsWith(pathSeparator)) {
    return join(resolved, filename);
  }
  try {
    const entry = await stat(resolved);
    if (entry.isDirectory()) {
      return join(resolved, filename);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return resolved;
}
async function downloadWorkspaceResource(workspace, accessToken, pathname, options) {
  const response = await fetchWorkspaceResource(workspace, accessToken, pathname);
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = sanitizeDownloadFilename(
    filenameFromContentDisposition(response.headers.get("content-disposition")),
    options.fallbackFilename
  );
  const targetPath = await resolveDownloadTarget(options.outputPath, filename);
  await mkdir2(dirname(targetPath), { recursive: true });
  await writeFile2(targetPath, bytes);
  return {
    path: targetPath,
    filename,
    contentType: response.headers.get("content-type"),
    size: bytes.byteLength
  };
}

// src/output.ts
import util from "node:util";
function isPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function formatScalar(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function pad(value, width) {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}
function renderObjectLines(record) {
  const entries = Object.entries(record);
  if (entries.length === 0) return "{}";
  return entries.map(([key, value]) => `${key}: ${formatScalar(value)}`).join("\n");
}
function renderTable(rows) {
  if (rows.length === 0) return "No results.";
  const preferredColumns = ["id", "name", "title", "subject", "status", "role", "email", "slug", "host"];
  const primitiveKeys = Object.keys(rows[0] ?? {}).filter(
    (key) => rows.every((row) => isPrimitive(row[key]))
  );
  const orderedKeys = [
    ...preferredColumns.filter((key) => primitiveKeys.includes(key)),
    ...primitiveKeys.filter((key) => !preferredColumns.includes(key))
  ].slice(0, 8);
  if (orderedKeys.length === 0) {
    return JSON.stringify(rows, null, 2);
  }
  const widths = orderedKeys.map(
    (key) => Math.max(key.length, ...rows.map((row) => formatScalar(row[key]).length))
  );
  const header = orderedKeys.map((key, index) => pad(key, widths[index] ?? key.length)).join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");
  const lines = rows.map(
    (row) => orderedKeys.map((key, index) => pad(formatScalar(row[key]), widths[index] ?? key.length)).join("  ")
  );
  return [header, separator, ...lines].join("\n");
}
function renderHuman(value) {
  if (value === null || value === void 0) return "OK";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "No results.";
    if (value.every((entry) => isPrimitive(entry))) {
      return value.map((entry) => formatScalar(entry)).join("\n");
    }
    if (value.every((entry) => isPlainObject(entry))) {
      return renderTable(value);
    }
    return JSON.stringify(value, null, 2);
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.every(([, entry]) => isPrimitive(entry))) {
      return renderObjectLines(value);
    }
  }
  return util.inspect(value, { depth: 6, colors: false, compact: false });
}

// src/commands.ts
import { parseArgs } from "node:util";

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util2,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util2;
(function(util3) {
  util3.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util3.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util3.assertNever = assertNever;
  util3.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util3.getValidEnumValues = (obj) => {
    const validKeys = util3.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util3.objectValues(filtered);
  };
  util3.objectValues = (obj) => {
    return util3.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util3.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util3.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util3.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util3.joinValues = joinValues;
  util3.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util2 || (util2 = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util2.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util2.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util2.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util2.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util2.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util2.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util2.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util2.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util2.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path3, errorMaps, issueData } = params;
  const fullPath = [...path3, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path3, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path3;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input2) {
    return getParsedType(input2.data);
  }
  _getOrReturnCtx(input2, ctx) {
    return ctx || {
      common: input2.parent.common,
      data: input2.data,
      parsedType: getParsedType(input2.data),
      schemaErrorMap: this._def.errorMap,
      path: input2.path,
      parent: input2.parent
    };
  }
  _processInputParams(input2) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input2.parent.common,
        data: input2.data,
        parsedType: getParsedType(input2.data),
        schemaErrorMap: this._def.errorMap,
        path: input2.path,
        parent: input2.parent
      }
    };
  }
  _parseSync(input2) {
    const result = this._parse(input2);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input2) {
    const result = this._parse(input2);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input2) {
    if (this._def.coerce) {
      input2.data = String(input2.data);
    }
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input2);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input2.data.length < check.value) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input2.data.length > check.value) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input2.data.length > check.value;
        const tooSmall = input2.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input2, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input2.data);
        } catch {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input2.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input2.data = input2.data.trim();
      } else if (check.kind === "includes") {
        if (!input2.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input2.data = input2.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input2.data = input2.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input2.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input2.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input2.data, check.version)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input2.data, check.alg)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input2.data, check.version)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input2.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input2) {
    if (this._def.coerce) {
      input2.data = Number(input2.data);
    }
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input2);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util2.isInteger(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input2.data < check.value : input2.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input2.data > check.value : input2.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input2.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input2.data)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input2.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util2.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input2) {
    if (this._def.coerce) {
      try {
        input2.data = BigInt(input2.data);
      } catch {
        return this._getInvalidInput(input2);
      }
    }
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input2);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input2.data < check.value : input2.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input2.data > check.value : input2.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input2.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input2.data };
  }
  _getInvalidInput(input2) {
    const ctx = this._getOrReturnCtx(input2);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input2) {
    if (this._def.coerce) {
      input2.data = Boolean(input2.data);
    }
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input2.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input2) {
    if (this._def.coerce) {
      input2.data = new Date(input2.data);
    }
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input2);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input2.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input2);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input2.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input2.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input2, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input2.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input2.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input2.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input2.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input2) {
    return OK(input2.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input2) {
    return OK(input2.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input2) {
    const ctx = this._getOrReturnCtx(input2);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input2.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input2) {
    const { ctx, status } = this._processInputParams(input2);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util2.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input2);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input2);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util2.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util2.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util2.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util2.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util2.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util2.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util2.objectKeys(b);
    const sharedKeys = util2.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input2) {
    if (input2.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input2.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input2) {
    if (typeof input2.data !== "string") {
      const ctx = this._getOrReturnCtx(input2);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util2.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input2.data)) {
      const ctx = this._getOrReturnCtx(input2);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input2.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input2) {
    const nativeEnumValues = util2.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input2);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util2.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util2.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util2.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input2.data)) {
      const expectedValues = util2.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input2.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util2.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input2);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input2);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input2) {
    const parsedType = this._getType(input2);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input2);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input2.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input2) {
    const { ctx } = this._processInputParams(input2);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input2) {
    const { status, ctx } = this._processInputParams(input2);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input2) {
    const result = this._def.innerType._parse(input2);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/commands.ts
var requiredString = external_exports.string().min(1);
var optionalString = external_exports.string().optional();
var stringList = external_exports.array(external_exports.string()).optional().default([]);
var optionalPositiveNumber = external_exports.preprocess(
  (value) => value === void 0 ? void 0 : Number(value),
  external_exports.number().positive().optional()
);
function stringOption(name, key, summary, options = {}) {
  return {
    name,
    key,
    summary,
    type: "string",
    ...options
  };
}
function booleanOption(name, key, summary, short) {
  return {
    name,
    key,
    summary,
    type: "boolean",
    short
  };
}
function rpcCommand(definition) {
  return {
    path: definition.path,
    summary: definition.summary,
    positionals: definition.positionals,
    options: definition.options,
    schema: definition.schema,
    auth: "workspace",
    destructive: definition.destructive,
    confirmationTarget: definition.confirmationTarget ? (input2) => definition.confirmationTarget?.(input2) ?? null : void 0,
    execute: (runtime, input2) => runtime.invoke(definition.op, definition.buildInput(input2)),
    format: definition.format
  };
}
function downloadCommand(definition) {
  return {
    path: definition.path,
    summary: definition.summary,
    positionals: definition.positionals,
    options: definition.options,
    schema: definition.schema,
    auth: "workspace",
    destructive: definition.destructive,
    execute: (runtime, input2) => {
      const download = definition.buildDownload(input2);
      return runtime.download(download.pathname, {
        outputPath: download.outputPath,
        fallbackFilename: download.fallbackFilename
      });
    },
    format: definition.format ?? ((data) => {
      const download = data;
      return `Saved ${download.filename} (${download.size} bytes) to ${download.path}`;
    })
  };
}
var globalOptions = [
  booleanOption("json", "json", "Print JSON output."),
  stringOption("workspace", "workspace", "Override the workspace for this command."),
  booleanOption("no-interactive", "noInteractive", "Disable interactive prompts."),
  booleanOption("yes", "yes", "Confirm destructive actions without prompting.", "y"),
  stringOption("confirm", "confirm", "Exact confirmation target for high-impact destructive actions."),
  booleanOption("help", "help", "Show help for this command.", "h")
];
function parseBooleanText(value, optionName) {
  if (value === void 0) return void 0;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  throw usageError(`Option --${optionName} must be true or false.`);
}
function parseNumberText(value, optionName) {
  if (value === void 0) return void 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw usageError(`Option --${optionName} must be a valid number.`);
  }
  return parsed;
}
function parseJsonText(value, optionName) {
  if (value === void 0) return void 0;
  try {
    return JSON.parse(value);
  } catch {
    throw usageError(`Option --${optionName} must be valid JSON.`);
  }
}
function defaultVoiceScheduleWindows() {
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    start_minute: 0,
    end_minute: 1440
  }));
}
function parseScheduleJson(value) {
  if (value === void 0) return defaultVoiceScheduleWindows();
  const parsed = parseJsonText(value, "schedule-json");
  if (!Array.isArray(parsed)) {
    throw usageError("Option --schedule-json must be a JSON array.");
  }
  return parsed;
}
function workspaceListFormat(data) {
  const session = data;
  return session.workspaces.map((workspace) => {
    const markers = [
      workspace.id === session.defaultWorkspaceId ? "default" : null,
      workspace.id === session.currentWorkspaceId ? "current" : null
    ].filter(Boolean);
    return `${workspace.slug} (${workspace.host})${markers.length > 0 ? ` [${markers.join(", ")}]` : ""}`;
  }).join("\n");
}
function workspaceCurrentFormat(data) {
  const payload = data;
  const lines = [
    payload.current ? `current: ${payload.current.slug} (${payload.current.host})` : "current: none"
  ];
  if (payload.defaultWorkspace) {
    lines.push(`default: ${payload.defaultWorkspace.slug} (${payload.defaultWorkspace.host})`);
  }
  return lines.join("\n");
}
function onboardingFormat(data) {
  const payload = data;
  const workspace = payload.workspace;
  if (payload.state === "active") {
    return `Workspace ${workspace?.slug ?? "workspace"} is active.${payload.nextUrl ? `
open: ${payload.nextUrl}` : ""}`;
  }
  if (payload.state === "provisioning") {
    const step = payload.provisioning?.activeStep ? `
step: ${payload.provisioning.activeStep}` : "";
    return `Workspace ${workspace?.slug ?? "workspace"} is provisioning.${step}${payload.nextUrl ? `
status: ${payload.nextUrl}` : ""}`;
  }
  if (payload.state === "needs_attention") {
    const detail = payload.provisioning?.activeOutput ?? payload.error ?? "Provisioning needs attention.";
    return `Workspace ${workspace?.slug ?? "workspace"} needs attention.
${detail}`;
  }
  if (payload.error) {
    return payload.error;
  }
  return `Onboarding state: ${payload.state ?? "unknown"}`;
}
var commands = [
  {
    path: ["auth", "login"],
    summary: "Log in through the mere browser flow.",
    options: [stringOption("console-url", "consoleUrl", "Override the mere console URL.")],
    schema: external_exports.object({
      consoleUrl: optionalString
    }),
    auth: "none",
    execute: async (runtime, input2) => runtime.login({
      consoleUrl: input2.consoleUrl,
      workspace: runtime.global.workspace
    }),
    format: (data) => {
      const session = data;
      const workspace = session.workspace ? `workspace: ${session.workspace.slug} (${session.workspace.host})` : "workspace: none yet";
      return `Logged in as ${session.user.email}
${workspace}`;
    }
  },
  {
    path: ["auth", "logout"],
    summary: "Log out and clear the local CLI session.",
    schema: external_exports.object({}),
    auth: "none",
    execute: async (runtime) => ({ loggedOut: await runtime.logout() }),
    format: (data) => data.loggedOut ? "Logged out." : "No local session found."
  },
  {
    path: ["auth", "whoami"],
    summary: "Show the authenticated user and workspace.",
    schema: external_exports.object({}),
    auth: "workspace",
    execute: (runtime) => runtime.getProfile()
  },
  {
    path: ["workspace", "current"],
    summary: "Show the current and default workspace.",
    schema: external_exports.object({}),
    auth: "session",
    execute: async (runtime) => {
      const session = await runtime.getLocalSession();
      if (!session) {
        throw usageError("No local session found. Run `mere-business auth login` first.");
      }
      return {
        current: session.workspace,
        defaultWorkspace: session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null
      };
    },
    format: workspaceCurrentFormat
  },
  {
    path: ["workspace", "list"],
    summary: "List workspaces in the current CLI session.",
    schema: external_exports.object({}),
    auth: "session",
    execute: async (runtime) => {
      const session = await runtime.getLocalSession();
      if (!session) {
        throw usageError("No local session found. Run `mere-business auth login` first.");
      }
      return {
        currentWorkspaceId: session.workspace?.id ?? null,
        defaultWorkspaceId: session.defaultWorkspaceId,
        workspaces: session.workspaces
      };
    },
    format: workspaceListFormat
  },
  {
    path: ["workspace", "use"],
    summary: "Change the default workspace for subsequent commands.",
    positionals: ["workspace"],
    schema: external_exports.object({ workspace: requiredString }),
    auth: "session",
    execute: (runtime, input2) => runtime.switchWorkspace(input2.workspace),
    format: (data) => {
      const session = data;
      if (!session.workspace) return "Default workspace is not set.";
      return `Default workspace set to ${session.workspace.slug} (${session.workspace.host})`;
    }
  },
  {
    path: ["invite", "redeem"],
    summary: "Redeem a Mere platform invite code.",
    positionals: ["code"],
    schema: external_exports.object({ code: requiredString }),
    auth: "session",
    execute: (runtime, input2) => runtime.redeemInvite(input2.code),
    format: (data) => {
      const payload = data;
      if (payload.state === "create_workspace") {
        const invite = payload.onboardingInvite;
        return `Invite accepted. Create workspace from invite${invite?.name ? ` for ${invite.name}` : ""}${invite?.slug ? ` (${invite.slug})` : ""}.`;
      }
      if (payload.state === "claimed_workspace") {
        const workspace = payload.workspace;
        return `Invite redeemed for ${workspace?.slug ?? "workspace"}${payload.nextUrl ? `
next: ${payload.nextUrl}` : ""}`;
      }
      if (payload.state === "claimed_organization_invite") {
        return `Invite redeemed.${payload.nextUrl ? `
next: ${payload.nextUrl}` : ""}`;
      }
      return `Invite state: ${payload.state ?? "unknown"}`;
    }
  },
  {
    path: ["onboard", "start"],
    summary: "Create and provision a workspace from a Mere invite code.",
    positionals: ["code"],
    options: [
      stringOption("name", "name", "Business name override."),
      stringOption("slug", "slug", "Workspace subdomain override."),
      stringOption("business-mode", "businessMode", "Business mode: new or existing."),
      stringOption("base-domain", "baseDomain", "Workspace base domain."),
      stringOption("existing-website-url", "existingWebsiteUrl", "Existing business website URL."),
      stringOption("existing-city", "existingCity", "Existing business city."),
      stringOption("existing-state", "existingState", "Existing business state/province."),
      stringOption("existing-industry", "existingIndustry", "Existing business industry."),
      stringOption("existing-phone", "existingPhone", "Existing business phone."),
      stringOption("existing-description", "existingDescription", "Existing business description."),
      booleanOption("no-wait", "noWait", "Return after provisioning starts."),
      stringOption("timeout-seconds", "timeoutSeconds", "Maximum seconds to wait for provisioning."),
      stringOption("poll-seconds", "pollSeconds", "Seconds between provisioning status checks.")
    ],
    schema: external_exports.object({
      code: requiredString,
      name: optionalString,
      slug: optionalString,
      businessMode: external_exports.enum(["new", "existing"]).optional(),
      baseDomain: optionalString,
      existingWebsiteUrl: optionalString,
      existingCity: optionalString,
      existingState: optionalString,
      existingIndustry: optionalString,
      existingPhone: optionalString,
      existingDescription: optionalString,
      noWait: external_exports.boolean().optional(),
      timeoutSeconds: optionalPositiveNumber,
      pollSeconds: optionalPositiveNumber
    }),
    auth: "session",
    execute: (runtime, input2) => runtime.startOnboarding(input2),
    format: onboardingFormat
  },
  rpcCommand({
    path: ["onboard", "snapshot"],
    summary: "Show onboarding setup state for the current workspace.",
    schema: external_exports.object({}),
    op: "onboarding.snapshot",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["onboard", "tool"],
    summary: "Run an onboarding agent tool by key.",
    positionals: ["toolKey"],
    options: [stringOption("input-json", "inputJson", "Tool input JSON object.")],
    schema: external_exports.object({
      toolKey: requiredString,
      inputJson: optionalString
    }),
    op: "onboarding.tool.run",
    buildInput: (input2) => ({
      toolKey: input2.toolKey,
      input: parseJsonText(input2.inputJson, "input-json") ?? {}
    })
  }),
  rpcCommand({
    path: ["ops", "list"],
    summary: "List ops items.",
    options: [booleanOption("include-inactive", "includeInactive", "Include inactive ops items.")],
    schema: external_exports.object({ includeInactive: external_exports.boolean().optional() }),
    op: "ops.list",
    buildInput: (input2) => ({ includeInactive: Boolean(input2.includeInactive) })
  }),
  rpcCommand({
    path: ["ops", "get"],
    summary: "Show one ops item.",
    positionals: ["itemId"],
    schema: external_exports.object({ itemId: requiredString }),
    op: "ops.get",
    buildInput: (input2) => ({ itemId: input2.itemId })
  }),
  rpcCommand({
    path: ["ops", "actors"],
    summary: "List assignable ops actors.",
    schema: external_exports.object({}),
    op: "ops.actors",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["ops", "assign"],
    summary: "Assign an ops item owner.",
    positionals: ["itemId"],
    options: [
      stringOption("owner-type", "ownerType", "Owner type: user, agent, or system."),
      stringOption("owner-id", "ownerId", "Owner identifier.")
    ],
    schema: external_exports.object({
      itemId: requiredString,
      ownerType: requiredString,
      ownerId: optionalString
    }),
    op: "ops.assign",
    buildInput: (input2) => ({
      itemId: input2.itemId,
      ownerType: input2.ownerType,
      ownerId: input2.ownerId
    })
  }),
  rpcCommand({
    path: ["ops", "observe"],
    summary: "Set the expected observer for an ops item.",
    positionals: ["itemId"],
    options: [
      stringOption("observer-type", "observerType", "Observer type: user, agent, or system."),
      stringOption("observer-id", "observerId", "Observer identifier.")
    ],
    schema: external_exports.object({
      itemId: requiredString,
      observerType: requiredString,
      observerId: optionalString
    }),
    op: "ops.observe",
    buildInput: (input2) => ({
      itemId: input2.itemId,
      observerType: input2.observerType,
      observerId: input2.observerId
    })
  }),
  rpcCommand({
    path: ["ops", "snooze"],
    summary: "Snooze an ops item.",
    positionals: ["itemId"],
    options: [stringOption("until", "snoozedUntil", "ISO datetime to snooze until.")],
    schema: external_exports.object({
      itemId: requiredString,
      snoozedUntil: optionalString
    }),
    op: "ops.snooze",
    buildInput: (input2) => ({
      itemId: input2.itemId,
      snoozedUntil: input2.snoozedUntil
    })
  }),
  rpcCommand({
    path: ["ops", "move"],
    summary: "Move an ops item to a quadrant.",
    positionals: ["itemId"],
    options: [stringOption("quadrant", "quadrant", "Quadrant name.")],
    schema: external_exports.object({
      itemId: requiredString,
      quadrant: requiredString
    }),
    op: "ops.move",
    buildInput: (input2) => ({
      itemId: input2.itemId,
      quadrant: input2.quadrant
    })
  }),
  rpcCommand({
    path: ["ops", "restore"],
    summary: "Restore automatic routing for an ops item.",
    positionals: ["itemId"],
    schema: external_exports.object({ itemId: requiredString }),
    op: "ops.restore",
    buildInput: (input2) => ({ itemId: input2.itemId })
  }),
  rpcCommand({
    path: ["ops", "resolve"],
    summary: "Resolve an ops item.",
    positionals: ["itemId"],
    options: [stringOption("reason", "reason", "Resolution reason.")],
    schema: external_exports.object({
      itemId: requiredString,
      reason: optionalString
    }),
    op: "ops.resolve",
    buildInput: (input2) => ({
      itemId: input2.itemId,
      reason: input2.reason
    })
  }),
  rpcCommand({
    path: ["ops", "reopen"],
    summary: "Reopen a resolved ops item.",
    positionals: ["itemId"],
    schema: external_exports.object({ itemId: requiredString }),
    op: "ops.reopen",
    buildInput: (input2) => ({ itemId: input2.itemId })
  }),
  rpcCommand({
    path: ["mail", "list"],
    summary: "List email threads.",
    options: [
      stringOption("mailbox-id", "mailboxId", "Mailbox identifier."),
      booleanOption("include-archived", "includeArchived", "Include archived threads.")
    ],
    schema: external_exports.object({
      mailboxId: optionalString,
      includeArchived: external_exports.boolean().optional()
    }),
    op: "mail.list",
    buildInput: (input2) => ({
      mailboxId: input2.mailboxId,
      includeArchived: Boolean(input2.includeArchived)
    })
  }),
  rpcCommand({
    path: ["mail", "get"],
    summary: "Show one email thread.",
    positionals: ["threadId"],
    options: [booleanOption("include-bodies", "includeBodies", "Include message bodies.")],
    schema: external_exports.object({
      threadId: requiredString,
      includeBodies: external_exports.boolean().optional()
    }),
    op: "mail.get",
    buildInput: (input2) => ({
      threadId: input2.threadId,
      includeBodies: Boolean(input2.includeBodies)
    })
  }),
  rpcCommand({
    path: ["mail", "mailboxes"],
    summary: "List configured mailboxes.",
    schema: external_exports.object({}),
    op: "mail.mailboxes",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["mail", "star"],
    summary: "Toggle a thread star.",
    positionals: ["threadId"],
    schema: external_exports.object({ threadId: requiredString }),
    op: "mail.star",
    buildInput: (input2) => ({ threadId: input2.threadId })
  }),
  rpcCommand({
    path: ["mail", "archive"],
    summary: "Archive an email thread.",
    positionals: ["threadId"],
    schema: external_exports.object({ threadId: requiredString }),
    op: "mail.archive",
    buildInput: (input2) => ({ threadId: input2.threadId }),
    destructive: true
  }),
  rpcCommand({
    path: ["mail", "send"],
    summary: "Send a new outbound email.",
    options: [
      stringOption("mailbox-id", "mailboxId", "Mailbox identifier."),
      stringOption("to", "to", "Recipient email.", { multiple: true }),
      stringOption("cc", "cc", "CC recipient email.", { multiple: true }),
      stringOption("bcc", "bcc", "BCC recipient email.", { multiple: true }),
      stringOption("subject", "subject", "Email subject."),
      stringOption("body", "bodyText", "Plain-text body.")
    ],
    schema: external_exports.object({
      mailboxId: requiredString,
      to: stringList,
      cc: stringList,
      bcc: stringList,
      subject: requiredString,
      bodyText: requiredString
    }),
    op: "mail.send",
    buildInput: (input2) => ({
      mailboxId: input2.mailboxId,
      to: input2.to,
      cc: input2.cc,
      bcc: input2.bcc,
      subject: input2.subject,
      bodyText: input2.bodyText
    })
  }),
  rpcCommand({
    path: ["mail", "reply"],
    summary: "Reply to an existing thread.",
    positionals: ["threadId"],
    options: [
      stringOption("mailbox-id", "mailboxId", "Mailbox identifier."),
      stringOption("to", "to", "Recipient email.", { multiple: true }),
      stringOption("cc", "cc", "CC recipient email.", { multiple: true }),
      stringOption("bcc", "bcc", "BCC recipient email.", { multiple: true }),
      stringOption("subject", "subject", "Email subject."),
      stringOption("body", "bodyText", "Plain-text body.")
    ],
    schema: external_exports.object({
      threadId: requiredString,
      mailboxId: requiredString,
      to: stringList,
      cc: stringList,
      bcc: stringList,
      subject: requiredString,
      bodyText: requiredString
    }),
    op: "mail.reply",
    buildInput: (input2) => ({
      replyThreadId: input2.threadId,
      mailboxId: input2.mailboxId,
      to: input2.to,
      cc: input2.cc,
      bcc: input2.bcc,
      subject: input2.subject,
      bodyText: input2.bodyText
    })
  }),
  rpcCommand({
    path: ["messages", "list"],
    summary: "List internal conversations.",
    schema: external_exports.object({}),
    op: "messages.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["messages", "get"],
    summary: "Show one conversation.",
    positionals: ["conversationId"],
    schema: external_exports.object({ conversationId: requiredString }),
    op: "messages.get",
    buildInput: (input2) => ({ conversationId: input2.conversationId })
  }),
  rpcCommand({
    path: ["messages", "create"],
    summary: "Create a direct or discussion conversation.",
    options: [
      stringOption("mode", "mode", "Mode: discussion or direct."),
      stringOption("subject", "subject", "Discussion subject."),
      stringOption("message", "initialMessage", "Initial message body."),
      stringOption("participant-user-id", "participantUserId", "Direct-message target user id."),
      stringOption(
        "participant-user-ids",
        "participantUserIds",
        "Participant user id for a discussion.",
        { multiple: true }
      ),
      stringOption("signal-type", "signalType", "Signal type."),
      stringOption("priority", "priority", "Priority."),
      stringOption("linked-entity-type", "linkedEntityType", "Linked entity type."),
      stringOption("linked-entity-id", "linkedEntityId", "Linked entity id."),
      stringOption("expected-observer-type", "expectedObserverType", "Expected observer type."),
      stringOption("expected-observer-id", "expectedObserverId", "Expected observer id.")
    ],
    schema: external_exports.object({
      mode: optionalString,
      subject: optionalString,
      initialMessage: requiredString,
      participantUserId: optionalString,
      participantUserIds: stringList,
      signalType: optionalString,
      priority: optionalString,
      linkedEntityType: optionalString,
      linkedEntityId: optionalString,
      expectedObserverType: optionalString,
      expectedObserverId: optionalString
    }),
    op: "messages.create",
    buildInput: (input2) => ({
      mode: input2.mode,
      subject: input2.subject,
      initialMessage: input2.initialMessage,
      participantUserId: input2.participantUserId,
      participantUserIds: input2.participantUserIds,
      signalType: input2.signalType,
      priority: input2.priority,
      linkedEntityType: input2.linkedEntityType,
      linkedEntityId: input2.linkedEntityId,
      expectedObserverType: input2.expectedObserverType,
      expectedObserverId: input2.expectedObserverId
    })
  }),
  rpcCommand({
    path: ["messages", "reply"],
    summary: "Reply to a conversation.",
    positionals: ["conversationId"],
    options: [stringOption("body", "bodyText", "Reply body.")],
    schema: external_exports.object({
      conversationId: requiredString,
      bodyText: requiredString
    }),
    op: "messages.reply",
    buildInput: (input2) => ({
      conversationId: input2.conversationId,
      bodyText: input2.bodyText
    })
  }),
  rpcCommand({
    path: ["messages", "read"],
    summary: "Mark a conversation as read.",
    positionals: ["conversationId"],
    schema: external_exports.object({ conversationId: requiredString }),
    op: "messages.read",
    buildInput: (input2) => ({ conversationId: input2.conversationId })
  }),
  rpcCommand({
    path: ["messages", "close"],
    summary: "Close a conversation.",
    positionals: ["conversationId"],
    schema: external_exports.object({ conversationId: requiredString }),
    op: "messages.close",
    buildInput: (input2) => ({ conversationId: input2.conversationId }),
    destructive: true
  }),
  rpcCommand({
    path: ["messages", "reopen"],
    summary: "Reopen a conversation.",
    positionals: ["conversationId"],
    schema: external_exports.object({ conversationId: requiredString }),
    op: "messages.reopen",
    buildInput: (input2) => ({ conversationId: input2.conversationId })
  }),
  rpcCommand({
    path: ["contacts", "list"],
    summary: "List contacts.",
    schema: external_exports.object({}),
    op: "contacts.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["contacts", "get"],
    summary: "Show one contact.",
    positionals: ["contactId"],
    schema: external_exports.object({ contactId: requiredString }),
    op: "contacts.get",
    buildInput: (input2) => ({ contactId: input2.contactId })
  }),
  rpcCommand({
    path: ["contacts", "create"],
    summary: "Create a contact.",
    options: [
      stringOption("first-name", "firstName", "First name."),
      stringOption("last-name", "lastName", "Last name."),
      stringOption("email", "email", "Email address."),
      stringOption("phone", "phone", "Phone number."),
      stringOption("company-id", "companyId", "Company identifier."),
      stringOption("title", "title", "Job title."),
      stringOption("source", "source", "Lead source.")
    ],
    schema: external_exports.object({
      firstName: requiredString,
      lastName: requiredString,
      email: requiredString,
      phone: optionalString,
      companyId: optionalString,
      title: optionalString,
      source: optionalString
    }),
    op: "contacts.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["contacts", "update"],
    summary: "Update a contact.",
    positionals: ["contactId"],
    options: [
      stringOption("first-name", "firstName", "First name."),
      stringOption("last-name", "lastName", "Last name."),
      stringOption("email", "email", "Email address."),
      stringOption("phone", "phone", "Phone number."),
      stringOption("company-id", "companyId", "Company identifier."),
      stringOption("title", "title", "Job title.")
    ],
    schema: external_exports.object({
      contactId: requiredString,
      firstName: requiredString,
      lastName: requiredString,
      email: requiredString,
      phone: optionalString,
      companyId: optionalString,
      title: optionalString
    }),
    op: "contacts.update",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["companies", "list"],
    summary: "List companies.",
    schema: external_exports.object({}),
    op: "companies.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["companies", "get"],
    summary: "Show one company.",
    positionals: ["companyId"],
    schema: external_exports.object({ companyId: requiredString }),
    op: "companies.get",
    buildInput: (input2) => ({ companyId: input2.companyId })
  }),
  rpcCommand({
    path: ["companies", "create"],
    summary: "Create a company.",
    options: [
      stringOption("name", "name", "Company name."),
      stringOption("domain", "domain", "Primary domain."),
      stringOption("website", "website", "Website URL."),
      stringOption("phone", "phone", "Phone number."),
      stringOption("description", "description", "Description.")
    ],
    schema: external_exports.object({
      name: requiredString,
      domain: optionalString,
      website: optionalString,
      phone: optionalString,
      description: optionalString
    }),
    op: "companies.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["deals", "list"],
    summary: "List deals.",
    options: [
      stringOption("pipeline-id", "pipelineId", "Pipeline identifier."),
      stringOption("contact-id", "contactId", "Contact identifier."),
      stringOption("company-id", "companyId", "Company identifier.")
    ],
    schema: external_exports.object({
      pipelineId: optionalString,
      contactId: optionalString,
      companyId: optionalString
    }),
    op: "deals.list",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["deals", "get"],
    summary: "Show one deal.",
    positionals: ["dealId"],
    schema: external_exports.object({ dealId: requiredString }),
    op: "deals.get",
    buildInput: (input2) => ({ dealId: input2.dealId })
  }),
  rpcCommand({
    path: ["deals", "pipelines"],
    summary: "List pipelines and stages.",
    schema: external_exports.object({}),
    op: "deals.pipelines",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["deals", "create"],
    summary: "Create a deal.",
    options: [
      stringOption("title", "title", "Deal title."),
      stringOption("pipeline-id", "pipelineId", "Pipeline identifier."),
      stringOption("stage-id", "stageId", "Stage identifier."),
      stringOption("contact-id", "contactId", "Contact identifier."),
      stringOption("company-id", "companyId", "Company identifier."),
      stringOption("value-amount", "valueAmount", "Expected value amount."),
      stringOption("probability", "probability", "Win probability."),
      stringOption("expected-close-date", "expectedCloseDate", "Expected close date."),
      stringOption("first-touch-source", "firstTouchSource", "First-touch source."),
      stringOption(
        "first-touch-campaign-id",
        "firstTouchCampaignId",
        "First-touch campaign identifier."
      )
    ],
    schema: external_exports.object({
      title: requiredString,
      pipelineId: requiredString,
      stageId: requiredString,
      contactId: optionalString,
      companyId: optionalString,
      valueAmount: optionalString,
      probability: optionalString,
      expectedCloseDate: optionalString,
      firstTouchSource: optionalString,
      firstTouchCampaignId: optionalString
    }),
    op: "deals.create",
    buildInput: (input2) => ({
      ...input2,
      valueAmount: parseNumberText(input2.valueAmount, "value-amount"),
      probability: parseNumberText(input2.probability, "probability")
    })
  }),
  rpcCommand({
    path: ["deals", "move-stage"],
    summary: "Move a deal to a stage.",
    positionals: ["dealId"],
    options: [stringOption("stage-id", "stageId", "Stage identifier.")],
    schema: external_exports.object({
      dealId: requiredString,
      stageId: requiredString
    }),
    op: "deals.move-stage",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["tasks", "list"],
    summary: "List tasks.",
    options: [
      stringOption("entity-type", "entityType", "Linked entity type."),
      stringOption("entity-id", "entityId", "Linked entity id."),
      stringOption("status", "status", "Task status.")
    ],
    schema: external_exports.object({
      entityType: optionalString,
      entityId: optionalString,
      status: optionalString
    }),
    op: "tasks.list",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["tasks", "get"],
    summary: "Show one task.",
    positionals: ["taskId"],
    schema: external_exports.object({ taskId: requiredString }),
    op: "tasks.get",
    buildInput: (input2) => ({ taskId: input2.taskId })
  }),
  rpcCommand({
    path: ["tasks", "create"],
    summary: "Create a task.",
    options: [
      stringOption("title", "title", "Task title."),
      stringOption("description", "description", "Description."),
      stringOption("priority", "priority", "Priority."),
      stringOption("assignee-id", "assigneeId", "Assignee user id."),
      stringOption("entity-type", "entityType", "Linked entity type."),
      stringOption("entity-id", "entityId", "Linked entity id."),
      stringOption("due-date", "dueDate", "Due date."),
      stringOption("recurrence", "recurrence", "Recurrence rule.")
    ],
    schema: external_exports.object({
      title: requiredString,
      description: optionalString,
      priority: optionalString,
      assigneeId: optionalString,
      entityType: optionalString,
      entityId: optionalString,
      dueDate: optionalString,
      recurrence: optionalString
    }),
    op: "tasks.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["tasks", "status"],
    summary: "Update task status.",
    positionals: ["taskId"],
    options: [stringOption("status", "status", "Status value.")],
    schema: external_exports.object({
      taskId: requiredString,
      status: requiredString
    }),
    op: "tasks.status",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["campaigns", "list"],
    summary: "List campaigns.",
    schema: external_exports.object({}),
    op: "campaigns.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["campaigns", "get"],
    summary: "Show one campaign.",
    positionals: ["campaignId"],
    schema: external_exports.object({ campaignId: requiredString }),
    op: "campaigns.get",
    buildInput: (input2) => ({ campaignId: input2.campaignId })
  }),
  rpcCommand({
    path: ["campaigns", "create"],
    summary: "Create a campaign.",
    options: [
      stringOption("name", "name", "Campaign name."),
      stringOption("subject", "subject", "Campaign subject."),
      stringOption("segment-id", "segmentId", "Segment identifier."),
      stringOption("mailbox-id", "mailboxId", "Mailbox identifier.")
    ],
    schema: external_exports.object({
      name: requiredString,
      subject: optionalString,
      segmentId: optionalString,
      mailboxId: optionalString
    }),
    op: "campaigns.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["campaigns", "update"],
    summary: "Update a campaign.",
    positionals: ["campaignId"],
    options: [
      stringOption("name", "name", "Campaign name."),
      stringOption("subject", "subject", "Campaign subject."),
      stringOption("body-text", "bodyText", "Body text."),
      stringOption("body-html", "bodyHtml", "Body HTML."),
      stringOption("segment-id", "segmentId", "Segment identifier."),
      stringOption("mailbox-id", "mailboxId", "Mailbox identifier.")
    ],
    schema: external_exports.object({
      campaignId: requiredString,
      name: optionalString,
      subject: optionalString,
      bodyText: optionalString,
      bodyHtml: optionalString,
      segmentId: optionalString,
      mailboxId: optionalString
    }),
    op: "campaigns.update",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["campaigns", "delete"],
    summary: "Delete a campaign.",
    positionals: ["campaignId"],
    schema: external_exports.object({ campaignId: requiredString }),
    op: "campaigns.delete",
    buildInput: (input2) => ({ campaignId: input2.campaignId }),
    destructive: true,
    confirmationTarget: (input2) => input2.campaignId
  }),
  rpcCommand({
    path: ["campaigns", "prepare"],
    summary: "Prepare campaign recipients.",
    positionals: ["campaignId"],
    schema: external_exports.object({ campaignId: requiredString }),
    op: "campaigns.prepare",
    buildInput: (input2) => ({ campaignId: input2.campaignId })
  }),
  rpcCommand({
    path: ["campaigns", "send"],
    summary: "Send a campaign batch.",
    positionals: ["campaignId"],
    options: [stringOption("mailbox-id", "mailboxId", "Mailbox identifier override.")],
    schema: external_exports.object({
      campaignId: requiredString,
      mailboxId: optionalString
    }),
    op: "campaigns.send",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["campaigns", "segment-list"],
    summary: "List campaign segments.",
    schema: external_exports.object({}),
    op: "segments.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["campaigns", "segment-create"],
    summary: "Create a campaign segment.",
    options: [
      stringOption("name", "name", "Segment name."),
      stringOption("description", "description", "Description."),
      stringOption("filter-json", "filterJson", "Segment filter JSON.")
    ],
    schema: external_exports.object({
      name: requiredString,
      description: optionalString,
      filterJson: optionalString
    }),
    op: "segments.create",
    buildInput: (input2) => ({
      name: input2.name,
      description: input2.description,
      filterJson: parseJsonText(input2.filterJson, "filter-json") ?? {}
    })
  }),
  rpcCommand({
    path: ["campaigns", "segment-delete"],
    summary: "Delete a campaign segment.",
    positionals: ["segmentId"],
    schema: external_exports.object({ segmentId: requiredString }),
    op: "segments.delete",
    buildInput: (input2) => ({ segmentId: input2.segmentId }),
    destructive: true,
    confirmationTarget: (input2) => input2.segmentId
  }),
  rpcCommand({
    path: ["voice", "status"],
    summary: "Show voice workspace status.",
    schema: external_exports.object({}),
    op: "voice.status",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "call-list"],
    summary: "List voice calls.",
    options: [
      stringOption("location-id", "locationId", "Filter by location id."),
      stringOption("updated-since", "updatedSince", "Filter to calls updated since this ISO timestamp."),
      booleanOption("recorded-only", "recordedOnly", "Only include calls with recordings.")
    ],
    schema: external_exports.object({
      locationId: optionalString,
      updatedSince: optionalString,
      recordedOnly: external_exports.boolean().optional()
    }),
    op: "voice.calls.list",
    buildInput: (input2) => ({
      locationId: input2.locationId,
      updatedSince: input2.updatedSince,
      recordedOnly: Boolean(input2.recordedOnly)
    })
  }),
  rpcCommand({
    path: ["voice", "call-get"],
    summary: "Show one voice call.",
    positionals: ["callId"],
    schema: external_exports.object({ callId: requiredString }),
    op: "voice.calls.get",
    buildInput: (input2) => ({ callId: input2.callId })
  }),
  rpcCommand({
    path: ["voice", "call-refresh"],
    summary: "Refresh imported voice calls.",
    schema: external_exports.object({}),
    op: "voice.calls.refresh",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "call-close"],
    summary: "Close a voice call.",
    positionals: ["callId"],
    options: [
      stringOption("status", "status", "Final call status."),
      stringOption("ended-at", "endedAt", "Override the call end time as an ISO timestamp.")
    ],
    schema: external_exports.object({
      callId: requiredString,
      status: optionalString,
      endedAt: optionalString
    }),
    op: "voice.calls.close",
    buildInput: (input2) => ({
      callId: input2.callId,
      status: input2.status,
      endedAt: input2.endedAt
    })
  }),
  rpcCommand({
    path: ["voice", "call-archive"],
    summary: "Archive one or more completed voice calls.",
    options: [stringOption("call-id", "callIds", "Call identifier to archive.", { multiple: true })],
    schema: external_exports.object({
      callIds: external_exports.array(requiredString).min(1)
    }),
    op: "voice.calls.archive",
    buildInput: (input2) => ({ callIds: input2.callIds }),
    destructive: true,
    confirmationTarget: (input2) => input2.callIds.join(",")
  }),
  rpcCommand({
    path: ["voice", "call-reanalyze"],
    summary: "Re-run analysis for a voice call.",
    positionals: ["callId"],
    schema: external_exports.object({ callId: requiredString }),
    op: "voice.calls.reanalyze",
    buildInput: (input2) => ({ callId: input2.callId })
  }),
  rpcCommand({
    path: ["voice", "sms-list"],
    summary: "List SMS threads.",
    options: [
      stringOption("status", "status", "Filter by thread status."),
      stringOption("updated-since", "updatedSince", "Filter to threads updated since this ISO timestamp."),
      stringOption("limit", "limit", "Maximum results.")
    ],
    schema: external_exports.object({
      status: optionalString,
      updatedSince: optionalString,
      limit: optionalString
    }),
    op: "voice.sms.list",
    buildInput: (input2) => ({
      status: input2.status,
      updatedSince: input2.updatedSince,
      limit: parseNumberText(input2.limit, "limit")
    })
  }),
  rpcCommand({
    path: ["voice", "sms-get"],
    summary: "Show one SMS thread.",
    positionals: ["threadId"],
    schema: external_exports.object({ threadId: requiredString }),
    op: "voice.sms.get",
    buildInput: (input2) => ({ threadId: input2.threadId })
  }),
  rpcCommand({
    path: ["voice", "sms-read"],
    summary: "Mark an SMS thread as read.",
    positionals: ["threadId"],
    schema: external_exports.object({ threadId: requiredString }),
    op: "voice.sms.read",
    buildInput: (input2) => ({ threadId: input2.threadId })
  }),
  rpcCommand({
    path: ["voice", "sms-close"],
    summary: "Close an SMS thread.",
    positionals: ["threadId"],
    schema: external_exports.object({ threadId: requiredString }),
    op: "voice.sms.close",
    buildInput: (input2) => ({ threadId: input2.threadId })
  }),
  downloadCommand({
    path: ["voice", "call-audio"],
    summary: "Download the audio recording for a voice call.",
    positionals: ["callId"],
    options: [stringOption("output", "outputPath", "Write to this file path or directory.")],
    schema: external_exports.object({
      callId: requiredString,
      outputPath: optionalString
    }),
    buildDownload: (input2) => ({
      pathname: `/voice/calls/${encodeURIComponent(input2.callId)}/audio`,
      outputPath: input2.outputPath,
      fallbackFilename: `call-${input2.callId}.webm`
    })
  }),
  downloadCommand({
    path: ["voice", "call-export"],
    summary: "Download the transcript export for a voice call.",
    positionals: ["callId"],
    options: [stringOption("output", "outputPath", "Write to this file path or directory.")],
    schema: external_exports.object({
      callId: requiredString,
      outputPath: optionalString
    }),
    buildDownload: (input2) => ({
      pathname: `/voice/calls/${encodeURIComponent(input2.callId)}/export`,
      outputPath: input2.outputPath,
      fallbackFilename: `transcript-${input2.callId}.md`
    })
  }),
  rpcCommand({
    path: ["voice", "location-list"],
    summary: "List booth locations.",
    schema: external_exports.object({}),
    op: "voice.locations.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "location-create"],
    summary: "Create a booth location.",
    options: [
      stringOption("name", "name", "Location name."),
      stringOption("address", "address", "Street address."),
      stringOption("script-id", "scriptId", "Assigned script id."),
      stringOption("voice-id", "voiceId", "Optional ElevenLabs voice id override."),
      stringOption("twilio-phone-number", "twilioPhoneNumber", "Linked Twilio phone number in E.164 format."),
      stringOption("booth-password", "boothPassword", "Optional booth password."),
      stringOption("active", "active", "Boolean active state.")
    ],
    schema: external_exports.object({
      name: requiredString,
      address: requiredString,
      scriptId: optionalString,
      voiceId: optionalString,
      twilioPhoneNumber: optionalString,
      boothPassword: optionalString,
      active: optionalString
    }),
    op: "voice.locations.create",
    buildInput: (input2) => ({
      ...input2,
      active: input2.active === void 0 ? void 0 : parseBooleanText(input2.active, "active") ? 1 : 0
    })
  }),
  rpcCommand({
    path: ["voice", "location-update"],
    summary: "Update a booth location.",
    positionals: ["locationId"],
    options: [
      stringOption("name", "name", "Location name."),
      stringOption("address", "address", "Street address."),
      stringOption("script-id", "scriptId", "Assigned script id."),
      stringOption("voice-id", "voiceId", "Optional ElevenLabs voice id override."),
      stringOption("twilio-phone-number", "twilioPhoneNumber", "Linked Twilio phone number in E.164 format."),
      stringOption("booth-password", "boothPassword", "Optional booth password."),
      stringOption("active", "active", "Boolean active state.")
    ],
    schema: external_exports.object({
      locationId: requiredString,
      name: optionalString,
      address: optionalString,
      scriptId: optionalString,
      voiceId: optionalString,
      twilioPhoneNumber: optionalString,
      boothPassword: optionalString,
      active: optionalString
    }),
    op: "voice.locations.update",
    buildInput: (input2) => ({
      ...input2,
      active: input2.active === void 0 ? void 0 : parseBooleanText(input2.active, "active") ? 1 : 0
    })
  }),
  rpcCommand({
    path: ["voice", "location-delete"],
    summary: "Delete a booth location.",
    positionals: ["locationId"],
    schema: external_exports.object({ locationId: requiredString }),
    op: "voice.locations.delete",
    buildInput: (input2) => ({ locationId: input2.locationId }),
    destructive: true,
    confirmationTarget: (input2) => input2.locationId
  }),
  rpcCommand({
    path: ["voice", "script-list"],
    summary: "List voice scripts.",
    schema: external_exports.object({}),
    op: "voice.scripts.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "script-get"],
    summary: "Show one voice script.",
    positionals: ["scriptId"],
    schema: external_exports.object({ scriptId: requiredString }),
    op: "voice.scripts.get",
    buildInput: (input2) => ({ scriptId: input2.scriptId })
  }),
  rpcCommand({
    path: ["voice", "script-create"],
    summary: "Create a voice script.",
    options: [
      stringOption("name", "name", "Script name."),
      stringOption("description", "description", "Description."),
      stringOption("system-prompt", "systemPrompt", "System prompt."),
      stringOption("voice-id", "voiceId", "Optional ElevenLabs voice id override.")
    ],
    schema: external_exports.object({
      name: requiredString,
      description: optionalString,
      systemPrompt: requiredString,
      voiceId: optionalString
    }),
    op: "voice.scripts.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["voice", "script-update"],
    summary: "Update a voice script.",
    positionals: ["scriptId"],
    options: [
      stringOption("name", "name", "Script name."),
      stringOption("description", "description", "Description."),
      stringOption("system-prompt", "systemPrompt", "System prompt."),
      stringOption("voice-id", "voiceId", "Optional ElevenLabs voice id override."),
      stringOption("active", "active", "Boolean active state.")
    ],
    schema: external_exports.object({
      scriptId: requiredString,
      name: optionalString,
      description: optionalString,
      systemPrompt: optionalString,
      voiceId: optionalString,
      active: optionalString
    }),
    op: "voice.scripts.update",
    buildInput: (input2) => ({
      scriptId: input2.scriptId,
      name: input2.name,
      description: input2.description,
      systemPrompt: input2.systemPrompt,
      voiceId: input2.voiceId,
      active: input2.active === void 0 ? void 0 : parseBooleanText(input2.active, "active") ? 1 : 0
    })
  }),
  rpcCommand({
    path: ["voice", "script-delete"],
    summary: "Delete a voice script.",
    positionals: ["scriptId"],
    schema: external_exports.object({ scriptId: requiredString }),
    op: "voice.scripts.delete",
    buildInput: (input2) => ({ scriptId: input2.scriptId }),
    destructive: true,
    confirmationTarget: (input2) => input2.scriptId
  }),
  rpcCommand({
    path: ["voice", "stage-create"],
    summary: "Create a script stage.",
    positionals: ["scriptId"],
    options: [
      stringOption("name", "name", "Stage name."),
      stringOption("goal", "goal", "Stage goal."),
      stringOption("prompt-direction", "promptDirection", "Prompt direction."),
      stringOption("max-turns", "maxTurns", "Maximum turns.")
    ],
    schema: external_exports.object({
      scriptId: requiredString,
      name: requiredString,
      goal: requiredString,
      promptDirection: requiredString,
      maxTurns: optionalString
    }),
    op: "voice.scripts.stages.create",
    buildInput: (input2) => ({
      ...input2,
      maxTurns: parseNumberText(input2.maxTurns, "max-turns")
    })
  }),
  rpcCommand({
    path: ["voice", "stage-update"],
    summary: "Update a script stage.",
    positionals: ["scriptId", "stageId"],
    options: [
      stringOption("name", "name", "Stage name."),
      stringOption("goal", "goal", "Stage goal."),
      stringOption("prompt-direction", "promptDirection", "Prompt direction."),
      stringOption("max-turns", "maxTurns", "Maximum turns.")
    ],
    schema: external_exports.object({
      scriptId: requiredString,
      stageId: requiredString,
      name: optionalString,
      goal: optionalString,
      promptDirection: optionalString,
      maxTurns: optionalString
    }),
    op: "voice.scripts.stages.update",
    buildInput: (input2) => ({
      ...input2,
      maxTurns: parseNumberText(input2.maxTurns, "max-turns")
    })
  }),
  rpcCommand({
    path: ["voice", "stage-delete"],
    summary: "Delete a script stage.",
    positionals: ["scriptId", "stageId"],
    schema: external_exports.object({
      scriptId: requiredString,
      stageId: requiredString
    }),
    op: "voice.scripts.stages.delete",
    buildInput: (input2) => input2,
    destructive: true,
    confirmationTarget: (input2) => input2.stageId
  }),
  rpcCommand({
    path: ["voice", "stage-reorder"],
    summary: "Replace the stage order for a script.",
    positionals: ["scriptId"],
    options: [stringOption("stage-id", "stageIds", "Stage id in the desired order.", { multiple: true })],
    schema: external_exports.object({
      scriptId: requiredString,
      stageIds: external_exports.array(requiredString).min(1)
    }),
    op: "voice.scripts.stages.reorder",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["voice", "number-list"],
    summary: "List provisioned phone numbers.",
    schema: external_exports.object({}),
    op: "voice.numbers.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "number-get"],
    summary: "Show one phone number and its routing.",
    positionals: ["numberId"],
    schema: external_exports.object({ numberId: requiredString }),
    op: "voice.numbers.get",
    buildInput: (input2) => ({ numberId: input2.numberId })
  }),
  rpcCommand({
    path: ["voice", "number-search"],
    summary: "Search available phone numbers to purchase.",
    options: [
      stringOption("provider-account-id", "providerAccountId", "Provider account id."),
      stringOption("country-code", "countryCode", "Two-letter country code."),
      stringOption("area-code", "areaCode", "Area code filter."),
      stringOption("contains", "contains", "Digits the number should contain."),
      stringOption("limit", "limit", "Maximum results.")
    ],
    schema: external_exports.object({
      providerAccountId: optionalString,
      countryCode: optionalString,
      areaCode: optionalString,
      contains: optionalString,
      limit: optionalString
    }),
    op: "voice.numbers.search",
    buildInput: (input2) => ({
      providerAccountId: input2.providerAccountId,
      countryCode: input2.countryCode,
      areaCode: input2.areaCode,
      contains: input2.contains,
      limit: parseNumberText(input2.limit, "limit")
    })
  }),
  rpcCommand({
    path: ["voice", "number-buy"],
    summary: "Purchase a phone number.",
    options: [
      stringOption("phone-number", "phoneNumber", "The number to purchase."),
      stringOption("friendly-name", "friendlyName", "Friendly display name."),
      stringOption("provider-account-id", "providerAccountId", "Provider account id.")
    ],
    schema: external_exports.object({
      phoneNumber: requiredString,
      friendlyName: optionalString,
      providerAccountId: optionalString
    }),
    op: "voice.numbers.buy",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["voice", "number-update"],
    summary: "Update a phone number.",
    positionals: ["numberId"],
    options: [
      stringOption("friendly-name", "friendlyName", "Friendly display name."),
      stringOption("status", "status", "Phone number status."),
      stringOption("sms-enabled", "smsEnabled", "Boolean SMS enabled state.")
    ],
    schema: external_exports.object({
      numberId: requiredString,
      friendlyName: optionalString,
      status: optionalString,
      smsEnabled: optionalString
    }),
    op: "voice.numbers.update",
    buildInput: (input2) => ({
      numberId: input2.numberId,
      friendlyName: input2.friendlyName,
      status: input2.status,
      smsEnabled: input2.smsEnabled === void 0 ? void 0 : parseBooleanText(input2.smsEnabled, "sms-enabled")
    })
  }),
  rpcCommand({
    path: ["voice", "number-delete"],
    summary: "Release a phone number.",
    positionals: ["numberId"],
    schema: external_exports.object({ numberId: requiredString }),
    op: "voice.numbers.delete",
    buildInput: (input2) => ({ numberId: input2.numberId }),
    destructive: true,
    confirmationTarget: (input2) => input2.numberId
  }),
  rpcCommand({
    path: ["voice", "number-pause"],
    summary: "Pause a phone number.",
    positionals: ["numberId"],
    schema: external_exports.object({ numberId: requiredString }),
    op: "voice.numbers.pause",
    buildInput: (input2) => ({ numberId: input2.numberId })
  }),
  rpcCommand({
    path: ["voice", "number-resume"],
    summary: "Resume a paused phone number.",
    positionals: ["numberId"],
    schema: external_exports.object({ numberId: requiredString }),
    op: "voice.numbers.resume",
    buildInput: (input2) => ({ numberId: input2.numberId })
  }),
  rpcCommand({
    path: ["voice", "number-route"],
    summary: "Replace a phone number routing policy.",
    positionals: ["numberId"],
    options: [
      stringOption("timezone", "timezone", "IANA timezone."),
      stringOption("schedule-json", "scheduleJson", "Routing schedule JSON array."),
      stringOption("primary-target-type", "primaryTargetType", "Primary target type: voxbooth or forward."),
      stringOption("primary-location-id", "primaryLocationId", "Primary booth location id."),
      stringOption("primary-forward-number", "primaryForwardNumber", "Primary forward number in E.164 format."),
      stringOption("fallback-target-type", "fallbackTargetType", "Fallback target type."),
      stringOption("fallback-location-id", "fallbackLocationId", "Fallback booth location id."),
      stringOption("fallback-forward-number", "fallbackForwardNumber", "Fallback forward number in E.164 format."),
      stringOption("fallback-message", "fallbackMessage", "Fallback caller message.")
    ],
    schema: external_exports.object({
      numberId: requiredString,
      timezone: optionalString,
      scheduleJson: optionalString,
      primaryTargetType: requiredString,
      primaryLocationId: optionalString,
      primaryForwardNumber: optionalString,
      fallbackTargetType: optionalString,
      fallbackLocationId: optionalString,
      fallbackForwardNumber: optionalString,
      fallbackMessage: optionalString
    }),
    op: "voice.numbers.route",
    buildInput: (input2) => ({
      numberId: input2.numberId,
      timezone: input2.timezone ?? "UTC",
      scheduleWindows: parseScheduleJson(input2.scheduleJson),
      primaryTargetType: input2.primaryTargetType,
      primaryLocationId: input2.primaryLocationId,
      primaryForwardNumber: input2.primaryForwardNumber,
      fallbackTargetType: input2.fallbackTargetType ?? "message",
      fallbackLocationId: input2.fallbackLocationId,
      fallbackForwardNumber: input2.fallbackForwardNumber,
      fallbackMessage: input2.fallbackMessage ?? ((input2.fallbackTargetType ?? "message") === "message" ? "This phone line is not available right now." : void 0)
    })
  }),
  rpcCommand({
    path: ["voice", "provider-account-list"],
    summary: "List connected telco provider accounts.",
    schema: external_exports.object({}),
    op: "voice.provider-accounts.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["voice", "provider-account-create"],
    summary: "Connect a customer-managed telco provider account.",
    options: [
      stringOption("account-sid", "accountSid", "Provider account SID."),
      stringOption("auth-token", "authToken", "Provider auth token."),
      stringOption("account-label", "accountLabel", "Display label.")
    ],
    schema: external_exports.object({
      accountSid: requiredString,
      authToken: requiredString,
      accountLabel: optionalString
    }),
    op: "voice.provider-accounts.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["voice", "provider-account-update"],
    summary: "Update a telco provider account.",
    positionals: ["providerAccountId"],
    options: [
      stringOption("account-label", "accountLabel", "Display label."),
      stringOption("account-status", "accountStatus", "Provider account status.")
    ],
    schema: external_exports.object({
      providerAccountId: requiredString,
      accountLabel: optionalString,
      accountStatus: optionalString
    }),
    op: "voice.provider-accounts.update",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["voice", "provider-account-delete"],
    summary: "Disconnect a customer-managed telco provider account.",
    positionals: ["providerAccountId"],
    schema: external_exports.object({ providerAccountId: requiredString }),
    op: "voice.provider-accounts.delete",
    buildInput: (input2) => ({ providerAccountId: input2.providerAccountId }),
    destructive: true,
    confirmationTarget: (input2) => input2.providerAccountId
  }),
  rpcCommand({
    path: ["voice", "provider-account-sync"],
    summary: "Import numbers from a telco provider account.",
    positionals: ["providerAccountId"],
    schema: external_exports.object({ providerAccountId: requiredString }),
    op: "voice.provider-accounts.sync",
    buildInput: (input2) => ({ providerAccountId: input2.providerAccountId })
  }),
  rpcCommand({
    path: ["voice", "telco-call-list"],
    summary: "List recent telco call logs.",
    options: [stringOption("limit", "limit", "Maximum results.")],
    schema: external_exports.object({
      limit: optionalString
    }),
    op: "voice.telco-calls.list",
    buildInput: (input2) => ({
      limit: parseNumberText(input2.limit, "limit")
    })
  }),
  rpcCommand({
    path: ["voice", "default-booth"],
    summary: "Set the default voice booth configuration.",
    options: [
      stringOption("script-id", "scriptId", "Default script identifier."),
      stringOption("active", "active", "Boolean active state.")
    ],
    schema: external_exports.object({
      scriptId: optionalString,
      active: optionalString
    }),
    op: "voice.default-booth",
    buildInput: (input2) => ({
      scriptId: input2.scriptId,
      active: input2.active === void 0 ? void 0 : parseBooleanText(input2.active, "active")
    })
  }),
  rpcCommand({
    path: ["site", "current"],
    summary: "Show the current website request.",
    schema: external_exports.object({}),
    op: "site.current",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["site", "status"],
    summary: "Alias for site current.",
    schema: external_exports.object({}),
    op: "site.current",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["site", "get"],
    summary: "Show one website request.",
    positionals: ["requestId"],
    schema: external_exports.object({ requestId: requiredString }),
    op: "site.get",
    buildInput: (input2) => ({ requestId: input2.requestId })
  }),
  rpcCommand({
    path: ["site", "create"],
    summary: "Create a website request.",
    options: [
      stringOption("business-name", "businessName", "Business name."),
      stringOption("current-website-url", "currentWebsiteUrl", "Existing website URL."),
      stringOption("raw-intake-text", "rawIntakeText", "Raw intake text."),
      stringOption("prompt-hint", "promptHints", "Prompt hint.", { multiple: true }),
      stringOption("reference-link", "referenceLinks", "Reference link.", { multiple: true })
    ],
    schema: external_exports.object({
      businessName: optionalString,
      currentWebsiteUrl: optionalString,
      rawIntakeText: requiredString,
      promptHints: stringList,
      referenceLinks: stringList
    }),
    op: "site.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["site", "save-draft"],
    summary: "Save a website request draft.",
    options: [
      stringOption("business-name", "businessName", "Business name."),
      stringOption("current-website-url", "currentWebsiteUrl", "Existing website URL."),
      stringOption("raw-intake-text", "rawIntakeText", "Raw intake text."),
      stringOption("prompt-hint", "promptHints", "Prompt hint.", { multiple: true }),
      stringOption("reference-link", "referenceLinks", "Reference link.", { multiple: true }),
      stringOption("draft-brief-json", "draftBriefJson", "Draft brief JSON.")
    ],
    schema: external_exports.object({
      businessName: requiredString,
      currentWebsiteUrl: optionalString,
      rawIntakeText: requiredString,
      promptHints: stringList,
      referenceLinks: stringList,
      draftBriefJson: optionalString
    }),
    op: "site.save-draft",
    buildInput: (input2) => ({
      businessName: input2.businessName,
      currentWebsiteUrl: input2.currentWebsiteUrl,
      rawIntakeText: input2.rawIntakeText,
      promptHints: input2.promptHints,
      referenceLinks: input2.referenceLinks,
      draftBrief: parseJsonText(input2.draftBriefJson, "draft-brief-json")
    })
  }),
  rpcCommand({
    path: ["site", "approve"],
    summary: "Approve a website request draft.",
    options: [
      stringOption("business-name", "businessName", "Business name."),
      stringOption("current-website-url", "currentWebsiteUrl", "Existing website URL."),
      stringOption("raw-intake-text", "rawIntakeText", "Raw intake text."),
      stringOption("prompt-hint", "promptHints", "Prompt hint.", { multiple: true }),
      stringOption("reference-link", "referenceLinks", "Reference link.", { multiple: true }),
      stringOption("draft-brief-json", "draftBriefJson", "Draft brief JSON.")
    ],
    schema: external_exports.object({
      businessName: requiredString,
      currentWebsiteUrl: optionalString,
      rawIntakeText: requiredString,
      promptHints: stringList,
      referenceLinks: stringList,
      draftBriefJson: optionalString
    }),
    op: "site.approve",
    buildInput: (input2) => ({
      businessName: input2.businessName,
      currentWebsiteUrl: input2.currentWebsiteUrl,
      rawIntakeText: input2.rawIntakeText,
      promptHints: input2.promptHints,
      referenceLinks: input2.referenceLinks,
      draftBrief: parseJsonText(input2.draftBriefJson, "draft-brief-json")
    })
  }),
  rpcCommand({
    path: ["site", "regenerate"],
    summary: "Regenerate a website brief.",
    options: [
      stringOption("business-name", "businessName", "Business name."),
      stringOption("current-website-url", "currentWebsiteUrl", "Existing website URL."),
      stringOption("raw-intake-text", "rawIntakeText", "Raw intake text."),
      stringOption("prompt-hint", "promptHints", "Prompt hint.", { multiple: true }),
      stringOption("reference-link", "referenceLinks", "Reference link.", { multiple: true })
    ],
    schema: external_exports.object({
      businessName: requiredString,
      currentWebsiteUrl: optionalString,
      rawIntakeText: requiredString,
      promptHints: stringList,
      referenceLinks: stringList
    }),
    op: "site.regenerate",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["reach", "dashboard"],
    summary: "Show reach dashboard data.",
    schema: external_exports.object({}),
    op: "reach.dashboard",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["calendar", "list"],
    summary: "List calendar items in a date range.",
    options: [
      stringOption("from", "from", "Range start date."),
      stringOption("to", "to", "Range end date.")
    ],
    schema: external_exports.object({
      from: requiredString,
      to: requiredString
    }),
    op: "calendar.list",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["calendar", "event-create"],
    summary: "Create a calendar event.",
    options: [
      stringOption("title", "title", "Event title."),
      stringOption("description", "description", "Description."),
      stringOption("start-date", "startDate", "Start date."),
      stringOption("start-time", "startTime", "Start time."),
      stringOption("end-date", "endDate", "End date."),
      stringOption("end-time", "endTime", "End time."),
      stringOption("location", "location", "Location."),
      stringOption("event-type", "eventType", "Event type."),
      stringOption("color", "color", "Event color."),
      stringOption("recurrence-rule", "recurrenceRule", "Recurrence rule."),
      stringOption("attendee-json", "attendees", "Attendee JSON.", { multiple: true })
    ],
    schema: external_exports.object({
      title: requiredString,
      description: optionalString,
      startDate: requiredString,
      startTime: optionalString,
      endDate: optionalString,
      endTime: optionalString,
      location: optionalString,
      eventType: optionalString,
      color: optionalString,
      recurrenceRule: optionalString,
      attendees: stringList
    }),
    op: "calendar.event.create",
    buildInput: (input2) => ({
      ...input2,
      attendees: (input2.attendees ?? []).map((entry) => parseJsonText(entry, "attendee-json"))
    })
  }),
  rpcCommand({
    path: ["calendar", "event-update"],
    summary: "Update a calendar event.",
    positionals: ["eventId"],
    options: [
      stringOption("title", "title", "Event title."),
      stringOption("description", "description", "Description."),
      stringOption("start-date", "startDate", "Start date."),
      stringOption("start-time", "startTime", "Start time."),
      stringOption("end-date", "endDate", "End date."),
      stringOption("end-time", "endTime", "End time."),
      stringOption("location", "location", "Location."),
      stringOption("event-type", "eventType", "Event type."),
      stringOption("color", "color", "Event color."),
      stringOption("recurrence-rule", "recurrenceRule", "Recurrence rule."),
      stringOption("attendee-json", "attendees", "Attendee JSON.", { multiple: true })
    ],
    schema: external_exports.object({
      eventId: requiredString,
      title: requiredString,
      description: optionalString,
      startDate: requiredString,
      startTime: optionalString,
      endDate: optionalString,
      endTime: optionalString,
      location: optionalString,
      eventType: optionalString,
      color: optionalString,
      recurrenceRule: optionalString,
      attendees: stringList
    }),
    op: "calendar.event.update",
    buildInput: (input2) => ({
      ...input2,
      attendees: (input2.attendees ?? []).map((entry) => parseJsonText(entry, "attendee-json"))
    })
  }),
  rpcCommand({
    path: ["calendar", "event-cancel"],
    summary: "Cancel a calendar event.",
    positionals: ["eventId"],
    schema: external_exports.object({ eventId: requiredString }),
    op: "calendar.event.cancel",
    buildInput: (input2) => ({ eventId: input2.eventId }),
    destructive: true,
    confirmationTarget: (input2) => input2.eventId
  }),
  rpcCommand({
    path: ["calendar", "subscription-list"],
    summary: "List calendar subscriptions.",
    schema: external_exports.object({}),
    op: "calendar.subscriptions.list",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["calendar", "subscription-create"],
    summary: "Create a calendar subscription.",
    options: [
      stringOption("name", "name", "Subscription name."),
      stringOption("url", "url", "Subscription URL."),
      stringOption("color", "color", "Color.")
    ],
    schema: external_exports.object({
      name: requiredString,
      url: requiredString,
      color: optionalString
    }),
    op: "calendar.subscriptions.create",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["calendar", "subscription-delete"],
    summary: "Delete a calendar subscription.",
    positionals: ["subscriptionId"],
    schema: external_exports.object({ subscriptionId: requiredString }),
    op: "calendar.subscriptions.delete",
    buildInput: (input2) => ({ subscriptionId: input2.subscriptionId }),
    destructive: true,
    confirmationTarget: (input2) => input2.subscriptionId
  }),
  rpcCommand({
    path: ["calendar", "subscription-sync"],
    summary: "Sync a calendar subscription.",
    positionals: ["subscriptionId"],
    schema: external_exports.object({ subscriptionId: requiredString }),
    op: "calendar.subscriptions.sync",
    buildInput: (input2) => ({ subscriptionId: input2.subscriptionId })
  }),
  rpcCommand({
    path: ["calendar", "feed-get"],
    summary: "Show the calendar feed URL.",
    schema: external_exports.object({}),
    op: "calendar.feed.get",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["calendar", "feed-generate"],
    summary: "Generate a new calendar feed URL.",
    schema: external_exports.object({}),
    op: "calendar.feed.generate",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["calendar", "feed-revoke"],
    summary: "Revoke the calendar feed URL.",
    schema: external_exports.object({}),
    op: "calendar.feed.revoke",
    buildInput: () => ({}),
    destructive: true,
    confirmationTarget: () => "calendar-feed"
  }),
  rpcCommand({
    path: ["settings", "profile", "get"],
    summary: "Show the business profile.",
    schema: external_exports.object({}),
    op: "settings.profile.get",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["settings", "profile", "set"],
    summary: "Replace the business profile from JSON.",
    options: [stringOption("profile-json", "profileJson", "Business profile JSON.")],
    schema: external_exports.object({
      profileJson: requiredString
    }),
    op: "settings.profile.set",
    buildInput: (input2) => ({
      profile: parseJsonText(input2.profileJson, "profile-json")
    })
  }),
  rpcCommand({
    path: ["settings", "ai", "get"],
    summary: "Show AI configuration.",
    schema: external_exports.object({}),
    op: "settings.ai.get",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["settings", "ai", "set"],
    summary: "Update AI settings.",
    options: [
      stringOption("mode", "mode", "AI mode."),
      stringOption("api-key", "apiKey", "API key."),
      stringOption("frontier-model", "frontierModel", "Frontier model name."),
      stringOption("fast-model", "fastModel", "Fast model name.")
    ],
    schema: external_exports.object({
      mode: optionalString,
      apiKey: optionalString,
      frontierModel: optionalString,
      fastModel: optionalString
    }),
    op: "settings.ai.set",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["settings", "slack", "get"],
    summary: "Show Slack settings.",
    schema: external_exports.object({}),
    op: "settings.slack.get",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["settings", "slack", "set"],
    summary: "Update Slack preferences.",
    options: [
      stringOption("daily-digest-enabled", "dailyDigestEnabled", "Boolean daily digest enabled."),
      stringOption("daily-digest-hour", "dailyDigestHour", "Digest hour (0-23)."),
      stringOption("work-objects-enabled", "workObjectsEnabled", "Boolean work object posting enabled."),
      stringOption("auto-post-enabled", "autoPostEnabled", "Boolean auto-post enabled.")
    ],
    schema: external_exports.object({
      dailyDigestEnabled: optionalString,
      dailyDigestHour: optionalString,
      workObjectsEnabled: optionalString,
      autoPostEnabled: optionalString
    }),
    op: "settings.slack.set",
    buildInput: (input2) => ({
      dailyDigestEnabled: parseBooleanText(input2.dailyDigestEnabled, "daily-digest-enabled") ?? false,
      dailyDigestHour: parseNumberText(input2.dailyDigestHour, "daily-digest-hour"),
      workObjectsEnabled: parseBooleanText(input2.workObjectsEnabled, "work-objects-enabled") ?? false,
      autoPostEnabled: parseBooleanText(input2.autoPostEnabled, "auto-post-enabled") ?? false
    })
  }),
  rpcCommand({
    path: ["settings", "slack", "bindings-replace"],
    summary: "Replace Slack channel bindings from JSON.",
    options: [stringOption("bindings-json", "bindingsJson", "Slack bindings JSON.")],
    schema: external_exports.object({
      bindingsJson: requiredString
    }),
    op: "settings.slack.bindings.replace",
    buildInput: (input2) => ({
      bindings: parseJsonText(input2.bindingsJson, "bindings-json")
    })
  }),
  rpcCommand({
    path: ["settings", "slack", "bootstrap"],
    summary: "Bootstrap the Slack workspace.",
    schema: external_exports.object({}),
    op: "settings.slack.bootstrap",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["settings", "team", "get"],
    summary: "Show team state.",
    schema: external_exports.object({}),
    op: "settings.team.get",
    buildInput: () => ({})
  }),
  rpcCommand({
    path: ["settings", "team", "invite"],
    summary: "Invite a team member.",
    options: [
      stringOption("email", "email", "Invitee email."),
      stringOption("role", "role", "Workspace role.")
    ],
    schema: external_exports.object({
      email: requiredString,
      role: requiredString
    }),
    op: "settings.team.invite",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["settings", "team", "resend"],
    summary: "Resend a team invitation.",
    positionals: ["invitationId"],
    schema: external_exports.object({ invitationId: requiredString }),
    op: "settings.team.resend",
    buildInput: (input2) => ({ invitationId: input2.invitationId })
  }),
  rpcCommand({
    path: ["settings", "team", "revoke"],
    summary: "Revoke a team invitation.",
    positionals: ["invitationId"],
    schema: external_exports.object({ invitationId: requiredString }),
    op: "settings.team.revoke",
    buildInput: (input2) => ({ invitationId: input2.invitationId }),
    destructive: true,
    confirmationTarget: (input2) => input2.invitationId
  }),
  rpcCommand({
    path: ["settings", "team", "role"],
    summary: "Change a team member role.",
    options: [
      stringOption("user-id", "userId", "Workspace user id."),
      stringOption("role", "role", "New role.")
    ],
    schema: external_exports.object({
      userId: requiredString,
      role: requiredString
    }),
    op: "settings.team.role",
    buildInput: (input2) => input2
  }),
  rpcCommand({
    path: ["settings", "team", "remove"],
    summary: "Remove a team member.",
    options: [stringOption("user-id", "userId", "Workspace user id.")],
    schema: external_exports.object({
      userId: requiredString
    }),
    op: "settings.team.remove",
    buildInput: (input2) => input2,
    destructive: true,
    confirmationTarget: (input2) => input2.userId
  })
];
var sortedCommands = [...commands].sort((left, right) => right.path.length - left.path.length);
function startsWithPath(argv, path3) {
  return path3.every((segment, index) => argv[index] === segment);
}
function findCommand(argv) {
  return sortedCommands.find((command) => startsWithPath(argv, command.path)) ?? null;
}
function parseCommand(argv) {
  const command = findCommand(argv);
  if (!command) {
    throw usageError("Unknown command.");
  }
  const optionSpecs = [...globalOptions, ...command.options ?? []];
  const parsed = parseArgs({
    args: argv.slice(command.path.length),
    allowPositionals: true,
    strict: true,
    options: Object.fromEntries(
      optionSpecs.map((option) => [
        option.name,
        {
          type: option.type,
          ...option.short ? { short: option.short } : {},
          ...option.multiple ? { multiple: true } : {}
        }
      ])
    )
  });
  const values = {};
  for (const option of optionSpecs) {
    values[option.key] = parsed.values[option.name];
  }
  const positionals = command.positionals ?? [];
  if (parsed.positionals.length > positionals.length) {
    throw usageError(`Too many arguments for ${command.path.join(" ")}.`);
  }
  if (parsed.positionals.length < positionals.length && !values.help) {
    throw usageError(`Missing required arguments for ${command.path.join(" ")}.`);
  }
  for (const [index, key] of positionals.entries()) {
    values[key] = parsed.positionals[index];
  }
  const global = {
    json: parsed.values.json === true,
    workspace: typeof parsed.values.workspace === "string" ? parsed.values.workspace : void 0,
    noInteractive: parsed.values["no-interactive"] === true,
    yes: parsed.values.yes === true,
    confirm: typeof parsed.values.confirm === "string" ? parsed.values.confirm : void 0,
    help: parsed.values.help === true
  };
  const inputValues = {};
  for (const option of command.options ?? []) {
    inputValues[option.key] = values[option.key];
  }
  for (const key of positionals) {
    inputValues[key] = values[key];
  }
  const parsedInput = command.schema.safeParse(inputValues);
  if (!parsedInput.success) {
    throw usageError(parsedInput.error.issues[0]?.message ?? "Invalid command arguments.");
  }
  return {
    command,
    global,
    input: parsedInput.data
  };
}
function renderHelp(path3 = []) {
  if (path3.length === 0) {
    const groups = [.../* @__PURE__ */ new Set([...commands.map((command) => command.path[0]), "completion"])].sort();
    return [
      "Usage: mere-business <group> <command> [options]",
      "",
      "Groups:",
      ...groups.map((group) => `  ${group}`),
      "",
      "Alias: `zerosmb`",
      "Run `mere-business help <group>` for group commands."
    ].join("\n");
  }
  if (path3.length === 1 && path3[0] === "completion") {
    return [
      "Generate shell completion.",
      "",
      "Usage: mere-business completion [bash|zsh|fish]"
    ].join("\n");
  }
  const exact = commands.find((command) => command.path.join(" ") === path3.join(" "));
  if (exact) {
    const usage = ["mere-business", ...exact.path, ...(exact.positionals ?? []).map((item) => `<${item}>`)].join(" ");
    const optionLines = [...globalOptions, ...exact.options ?? []].map(
      (option) => `  --${option.name}${option.short ? `, -${option.short}` : ""}  ${option.summary}`
    );
    return [exact.summary, "", `Usage: ${usage}`, "", "Options:", ...optionLines].join("\n");
  }
  const subgroup = commands.filter((command) => startsWithPath(command.path, path3));
  if (subgroup.length === 0) {
    throw usageError(`Unknown help topic: ${path3.join(" ")}`);
  }
  return [
    `Commands under ${path3.join(" ")}:`,
    "",
    ...subgroup.map((command) => `  ${command.path.slice(path3.length).join(" ")}  ${command.summary}`)
  ].join("\n");
}
function renderCompletion(shell) {
  const words = [...new Set(commands.flatMap((command) => command.path))].sort();
  const commandList = words.join(" ");
  switch (shell) {
    case void 0:
    case "bash":
      return [
        "_mere_business_completion() {",
        '  local cur="${COMP_WORDS[COMP_CWORD]}"',
        `  COMPREPLY=( $(compgen -W "${commandList}" -- "$cur") )`,
        "}",
        "complete -F _mere_business_completion mere-business zerosmb"
      ].join("\n");
    case "zsh":
      return `#compdef mere-business zerosmb
_arguments '*:command:(${commandList})'`;
    case "fish":
      return `complete -c mere-business -f -a "${commandList}"
complete -c zerosmb -f -a "${commandList}"`;
    default:
      throw usageError("Completion shell must be one of bash, zsh, or fish.");
  }
}
function renderCommandManifest() {
  return JSON.stringify(
    {
      schemaVersion: 1,
      app: "mere-business",
      namespace: "business",
      aliases: ["mere-business", "zerosmb"],
      auth: { kind: "browser" },
      baseUrlEnv: ["MERE_BUSINESS_BASE_URL"],
      sessionPath: "~/.local/state/zerosmb-cli/session.json",
      globalFlags: ["workspace", "json", "no-interactive", "yes", "confirm"],
      commands: [
        ...commands.map((command) => ({
          id: command.path.join("."),
          path: command.path,
          summary: command.summary,
          auth: command.auth ?? "workspace",
          risk: command.destructive ? "destructive" : command.auth === "none" ? "read" : "read",
          supportsJson: true,
          supportsData: Boolean(command.options?.some((option) => option.name.includes("json"))),
          requiresYes: Boolean(command.destructive),
          requiresConfirm: Boolean(command.confirmationTarget),
          positionals: command.positionals ?? [],
          flags: [...globalOptions, ...command.options ?? []].map((option) => option.name),
          ...command.path.join(".") === "auth.whoami" || command.path.join(".") === "workspace.current" ? { auditDefault: true } : {}
        })),
        {
          id: "completion",
          path: ["completion"],
          summary: "Generate shell completion.",
          auth: "none",
          risk: "read",
          supportsJson: false,
          supportsData: false,
          requiresYes: false,
          requiresConfirm: false,
          positionals: [],
          flags: []
        },
        {
          id: "commands",
          path: ["commands"],
          summary: "Print command manifest.",
          auth: "none",
          risk: "read",
          supportsJson: true,
          supportsData: false,
          requiresYes: false,
          requiresConfirm: false,
          positionals: [],
          flags: ["json"]
        }
      ]
    },
    null,
    2
  );
}

// src/index.ts
function readPackageVersion() {
  const packageJsonPath = path2.resolve(
    path2.dirname(fileURLToPath(import.meta.url)),
    "../package.json"
  );
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version?.trim() || "0.0.0";
}
var CLI_VERSION = readPackageVersion();
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function compactObject(input2) {
  return Object.fromEntries(
    Object.entries(input2).filter(([, value]) => value !== void 0 && value !== null)
  );
}
function stripSessionPayload(result) {
  if (!result || typeof result !== "object" || !("session" in result)) return result;
  const next = { ...result };
  delete next.session;
  return next;
}
function writeProgress(globalFlags, message) {
  if (!globalFlags.json) {
    stderr.write(`${message}
`);
  }
}
async function createRuntime(globalFlags) {
  const paths = resolveCliPaths2();
  let sessionCache;
  async function getLocalSession() {
    if (sessionCache !== void 0) return sessionCache;
    sessionCache = await loadSession(paths);
    return sessionCache;
  }
  async function writeSession(session) {
    sessionCache = session;
    await saveSession(session, paths);
    return session;
  }
  async function requireSession() {
    const session = await getLocalSession();
    if (!session) {
      throw authError("No local session found. Run `mere-business auth login` first.");
    }
    return session;
  }
  async function ensureConsoleSession() {
    const session = await requireSession();
    const workspace = session.defaultWorkspaceId ?? session.workspace?.id ?? void 0;
    if (!workspace || sessionNeedsRefresh2(session, workspace)) {
      return writeSession(await refreshRemoteSession2(session, { workspace }));
    }
    return session;
  }
  async function ensureWorkspaceSession(options = {}) {
    const session = await requireSession();
    const selector = options.workspace ?? globalFlags.workspace ?? session.defaultWorkspaceId;
    const targetWorkspace = requireWorkspaceSelection2(session.workspaces, selector);
    if (!sessionNeedsRefresh2(session, targetWorkspace.id)) {
      return session;
    }
    return await writeSession(
      await refreshRemoteSession2(session, {
        workspace: targetWorkspace.id,
        persistDefaultWorkspace: options.persistDefaultWorkspace
      })
    );
  }
  async function withRetry(request, workspaceOverride) {
    let session = await ensureWorkspaceSession({ workspace: workspaceOverride });
    try {
      return await request(session);
    } catch (error) {
      if (error instanceof CommandError && error.exitCode === 3) {
        session = await writeSession(
          await refreshRemoteSession2(session, {
            workspace: workspaceOverride ?? globalFlags.workspace ?? session.defaultWorkspaceId
          })
        );
        return request(session);
      }
      throw error;
    }
  }
  return {
    global: globalFlags,
    login: async (options) => writeSession(await loginWithBrowser2(options, (message) => stderr.write(`${message}
`))),
    logout: async () => {
      const session = await getLocalSession();
      if (!session) return false;
      await logoutRemote(session).catch(() => void 0);
      await clearSession(paths);
      sessionCache = null;
      return true;
    },
    getLocalSession,
    switchWorkspace: async (selector) => {
      await requireSession();
      return await writeSession(
        await ensureWorkspaceSession({
          workspace: selector,
          persistDefaultWorkspace: true
        })
      );
    },
    redeemInvite: async (code) => {
      const session = await ensureConsoleSession();
      const result = await redeemConsoleInvite({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        code
      });
      if (result.session) {
        await writeSession({
          ...result.session,
          version: 1,
          baseUrl: session.baseUrl,
          lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return stripSessionPayload(result);
    },
    startOnboarding: async (input2) => {
      const session = await ensureConsoleSession();
      const code = String(input2.code ?? "").trim();
      if (!code) throw usageError("Invite code is required.");
      const values = compactObject({
        name: input2.name,
        slug: input2.slug,
        businessMode: input2.businessMode,
        baseDomain: input2.baseDomain,
        existingWebsiteUrl: input2.existingWebsiteUrl,
        existingCity: input2.existingCity,
        existingState: input2.existingState,
        existingIndustry: input2.existingIndustry,
        existingPhone: input2.existingPhone,
        existingDescription: input2.existingDescription
      });
      writeProgress(globalFlags, `Starting onboarding for invite ${code}...`);
      let result = await bootstrapConsoleOnboarding({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        code,
        values
      });
      if (result.session) {
        await writeSession({
          ...result.session,
          version: 1,
          baseUrl: session.baseUrl,
          lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const workspaceId = result.workspace?.id;
      if (!workspaceId || input2.noWait === true || result.state === "active" || result.state === "needs_attention") {
        return stripSessionPayload(result);
      }
      const timeoutMs = Math.round(Number(input2.timeoutSeconds ?? 900) * 1e3);
      const pollMs = Math.max(1e3, Math.round(Number(input2.pollSeconds ?? 5) * 1e3));
      const deadline = Date.now() + timeoutMs;
      let lastLine = "";
      writeProgress(
        globalFlags,
        `Workspace ${result.workspace?.slug ?? workspaceId} created. Waiting for provisioning...`
      );
      while (Date.now() < deadline) {
        await sleep(pollMs);
        const latestSession = await getLocalSession() ?? session;
        result = await getConsoleOnboardingStatus({
          baseUrl: latestSession.baseUrl,
          accessToken: latestSession.accessToken,
          refreshToken: latestSession.refreshToken,
          workspaceId
        });
        if (result.session) {
          await writeSession({
            ...result.session,
            version: 1,
            baseUrl: latestSession.baseUrl,
            lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        if (result.state === "active" || result.state === "needs_attention") {
          return stripSessionPayload(result);
        }
        const line = [
          result.provisioning?.activeStep ?? "provisioning",
          result.provisioning?.activeOutput
        ].filter(Boolean).join(": ");
        if (line && line !== lastLine) {
          writeProgress(globalFlags, line);
          lastLine = line;
        }
      }
      return {
        ...stripSessionPayload(result),
        state: result.state ?? "provisioning",
        timedOut: true,
        message: `Provisioning is still running after ${Math.round(timeoutMs / 1e3)} seconds.`
      };
    },
    getProfile: async () => withRetry((session) => getWorkspaceProfile(session.workspace, session.accessToken), globalFlags.workspace),
    download: async (pathname, options) => withRetry(
      (session) => downloadWorkspaceResource(session.workspace, session.accessToken, pathname, {
        outputPath: options.outputPath,
        fallbackFilename: options.fallbackFilename
      }),
      globalFlags.workspace
    ),
    invoke: async (op, input2 = {}) => withRetry(
      (session) => postWorkspaceOperation(session.workspace, session.accessToken, op, input2),
      globalFlags.workspace
    ),
    confirm: (message) => confirmIfNeeded(message, {
      yes: globalFlags.yes,
      noInteractive: globalFlags.noInteractive
    })
  };
}
async function run(argv) {
  if (argv.length === 0) {
    output2.write(`${renderHelp()}
`);
    return 0;
  }
  if (argv[0] === "--version" || argv[0] === "-v" || argv[0] === "version") {
    output2.write(`${CLI_VERSION}
`);
    return 0;
  }
  if (argv[0] === "help") {
    output2.write(`${renderHelp(argv.slice(1))}
`);
    return 0;
  }
  if (argv[0] === "completion") {
    output2.write(`${renderCompletion(argv[1])}
`);
    return 0;
  }
  if (argv[0] === "commands") {
    output2.write(`${renderCommandManifest()}
`);
    return 0;
  }
  const command = findCommand(argv);
  if (!command) {
    throw usageError(`Unknown command: ${argv.join(" ")}`);
  }
  const parsed = parseCommand(argv);
  if (parsed.global.help) {
    output2.write(`${renderHelp(command.path)}
`);
    return 0;
  }
  const runtime = await createRuntime(parsed.global);
  if (command.destructive) {
    const target = command.confirmationTarget?.(parsed.input);
    if (target) {
      await confirmExactTextIfNeeded(`This will run ${command.path.join(" ")} against ${target}.`, target, {
        yes: parsed.global.yes,
        noInteractive: parsed.global.noInteractive,
        confirm: parsed.global.confirm
      });
    } else {
      await runtime.confirm(`This will run ${command.path.join(" ")}.`);
    }
  }
  const result = await command.execute(runtime, parsed.input);
  if (parsed.global.json) {
    printJson(output2, result);
    return 0;
  }
  const text = command.format ? command.format(result, parsed.input) : renderHuman(result);
  if (text.trim().length > 0) {
    output2.write(`${text}
`);
  }
  return 0;
}
run(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  const parsed = process.argv.includes("--json");
  if (parsed) {
    printJson(stderr, { ok: false, error: errorPayload(error) });
  } else {
    stderr.write(`${error instanceof Error ? error.message : "Unexpected error."}
`);
  }
  process.exitCode = error instanceof CommandError ? error.exitCode : 1;
});
