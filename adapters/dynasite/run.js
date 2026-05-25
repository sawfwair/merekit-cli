#!/usr/bin/env node

// cli/mere-dynasite.ts
var DEFAULT_BASE_URL = "https://sites.merekit.com";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["discover", "e2e", "help", "json", "version"]);
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "action",
  "alt",
  "base-url",
  "bundle-id",
  "cookie",
  "e2e-token",
  "edit-json",
  "entry-path",
  "environment",
  "file",
  "item-json",
  "limit",
  "role",
  "site-id",
  "source",
  "source-dir",
  "status",
  "target-index",
  "title",
  "token",
  "workspace",
  "zip"
]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["v", "version"]
]);
var CliError = class extends Error {
  constructor(message, exitCode2 = 1) {
    super(message);
    this.exitCode = exitCode2;
    this.name = "CliError";
  }
};
var HttpError = class extends CliError {
  constructor(message, status) {
    super(message, status === 401 || status === 403 ? 3 : 1);
    this.status = status;
    this.name = "HttpError";
  }
};
function manifestCommand(path, summary, options = {}) {
  return {
    id: path.join("."),
    path,
    summary,
    auth: options.auth ?? "session",
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
var AUTH_FLAGS = ["base-url", "workspace", "json", "token", "cookie", "e2e-token", "e2e"];
var COMMAND_MANIFEST = {
  schemaVersion: 1,
  app: "mere-dynasite",
  namespace: "dynasite",
  aliases: ["dynasite", "mere-dynasite", "sites"],
  auth: { kind: "mixed" },
  baseUrlEnv: ["DYNASITE_BASE_URL", "MERE_DYNASITE_BASE_URL"],
  sessionPath: null,
  globalFlags: ["base-url", "workspace", "json", "token", "cookie", "e2e-token", "e2e"],
  commands: [
    manifestCommand(["commands"], "Print the machine-readable Dynasite command manifest.", {
      auth: "none",
      flags: ["json"]
    }),
    manifestCommand(["completion"], "Print shell completion for mere-dynasite.", {
      auth: "none",
      supportsJson: false,
      positionals: ["shell"]
    }),
    manifestCommand(["about"], "Show Dynasite CLI and service metadata.", {
      auth: "none",
      flags: ["base-url", "json", "workspace"],
      auditDefault: true
    }),
    manifestCommand(["status"], "Show Dynasite app and session status.", {
      auth: "none",
      flags: AUTH_FLAGS,
      auditDefault: true
    }),
    manifestCommand(["auth", "whoami"], "Show the current Dynasite session user.", {
      flags: AUTH_FLAGS
    }),
    manifestCommand(["businesses", "list"], "List researched business requests.", {
      flags: [...AUTH_FLAGS, "status", "limit"],
      auditDefault: false
    }),
    manifestCommand(["sites", "list"], "List generated Dynasite sites.", {
      flags: [...AUTH_FLAGS, "status", "limit"],
      auditDefault: false
    }),
    manifestCommand(["sites", "get"], "Show one generated Dynasite site.", {
      flags: [...AUTH_FLAGS, "site-id"],
      positionals: ["siteId"],
      auditDefault: false
    }),
    manifestCommand(["sites", "cms", "get"], "Show one site CMS draft and generation payload.", {
      flags: [...AUTH_FLAGS, "site-id"],
      positionals: ["siteId"],
      auditDefault: false
    }),
    manifestCommand(["sites", "cms", "edit"], "Apply a JSON CMS edit to a site draft.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id", "edit-json", "source"],
      supportsData: true
    }),
    manifestCommand(["sites", "cms", "assist"], "Ask Dynasite for a CMS assist patch.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id", "action", "target-index"]
    }),
    manifestCommand(["sites", "media", "import"], "Import source-site or explicit media URLs.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id", "discover", "item-json"],
      supportsData: true
    }),
    manifestCommand(["sites", "media", "upload"], "Upload one local image or video to a site draft.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id", "file", "alt", "role"]
    }),
    manifestCommand(["sites", "revisions", "list"], "List site CMS revisions.", {
      flags: [...AUTH_FLAGS, "site-id"]
    }),
    manifestCommand(["sites", "revisions", "revert"], "Revert a site CMS revision.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id"],
      positionals: ["revisionId"]
    }),
    manifestCommand(["sites", "publish"], "Publish a site preview or live URL.", {
      risk: "external",
      requiresYes: true,
      flags: [...AUTH_FLAGS, "site-id", "environment"]
    }),
    manifestCommand(["sites", "bundle", "upload"], "Upload a static site bundle from a directory or zip.", {
      risk: "write",
      flags: [...AUTH_FLAGS, "site-id", "source-dir", "zip", "title", "entry-path"]
    }),
    manifestCommand(["sites", "bundle", "status"], "List static site bundles for a site.", {
      flags: [...AUTH_FLAGS, "site-id"]
    }),
    manifestCommand(["sites", "bundle", "publish"], "Publish a static site bundle to preview or live.", {
      risk: "external",
      requiresYes: true,
      flags: [...AUTH_FLAGS, "site-id", "bundle-id", "environment"]
    }),
    manifestCommand(["sites", "bundle", "rollback"], "Roll back to a previous static site bundle.", {
      risk: "external",
      requiresYes: true,
      flags: [...AUTH_FLAGS, "site-id", "bundle-id", "environment"]
    }),
    manifestCommand(["outreach", "list"], "List outreach records.", {
      flags: [...AUTH_FLAGS, "status", "limit"],
      auditDefault: false
    })
  ]
};
async function cliVersion() {
  const { readFile } = await import("fs/promises");
  const raw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version?.trim() || "0.0.0";
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
      if (!VALUE_FLAGS.has(key)) {
        throw new CliError(`Unknown option: --${key}`, 2);
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
function flag(parsed, name) {
  const value = parsed.flags[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.at(-1);
  return void 0;
}
function flagList(parsed, name) {
  const value = parsed.flags[name];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}
function boolFlag(parsed, name) {
  return parsed.flags[name] === true;
}
function envValue(env, names) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return void 0;
}
function baseUrl(parsed, ctx) {
  return flag(parsed, "base-url")?.trim() ?? envValue(ctx.env, ["DYNASITE_BASE_URL", "MERE_DYNASITE_BASE_URL"]) ?? DEFAULT_BASE_URL;
}
function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function authToken(parsed, ctx) {
  return flag(parsed, "token")?.trim() || envValue(ctx.env, ["DYNASITE_SESSION_TOKEN", "MERE_DYNASITE_SESSION_TOKEN"]);
}
function cookieHeader(parsed, ctx) {
  return flag(parsed, "cookie")?.trim() || envValue(ctx.env, ["DYNASITE_COOKIE", "MERE_DYNASITE_COOKIE"]);
}
function e2eToken(parsed, ctx) {
  if (boolFlag(parsed, "e2e")) return "dynasite-local-e2e";
  return flag(parsed, "e2e-token")?.trim() || envValue(ctx.env, ["DYNASITE_E2E_ACCESS_TOKEN"]);
}
function workspace(parsed, ctx) {
  return flag(parsed, "workspace")?.trim() || envValue(ctx.env, ["MERE_WORKSPACE", "MERE_WORKSPACE_ID"]);
}
function fetchImpl(ctx) {
  return ctx.fetchImpl ?? fetch;
}
async function fetchJson(parsed, ctx, path, options = {}) {
  const url = new URL(path, normalizeBaseUrl(baseUrl(parsed, ctx)));
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  const headers = {
    accept: "application/json"
  };
  if (options.body !== void 0) headers["content-type"] = "application/json";
  const token = authToken(parsed, ctx);
  const cookie = cookieHeader(parsed, ctx);
  const e2e = e2eToken(parsed, ctx);
  const workspaceId = workspace(parsed, ctx);
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  if (e2e) headers["x-dynasite-e2e"] = e2e;
  if (workspaceId) headers["x-mere-workspace"] = workspaceId;
  if (options.requireAuth && !token && !cookie && !e2e) {
    throw new CliError(
      "Dynasite session required. Pass --token, --cookie, --e2e-token, or set DYNASITE_SESSION_TOKEN/DYNASITE_COOKIE.",
      2
    );
  }
  const response = await fetchImpl(ctx)(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === void 0 ? void 0 : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : typeof data === "string" ? data : response.statusText;
    throw new HttpError(`HTTP ${response.status}: ${detail}`, response.status);
  }
  return data;
}
function commandKey(positionals) {
  if (positionals.length === 0) return "status";
  if (positionals[0] === "completion") return "completion";
  if (positionals[0] === "commands") return "commands";
  if (positionals[0] === "businesses" && positionals.length === 1) return "businesses list";
  if (positionals[0] === "sites" && positionals.length === 1) return "sites list";
  if (positionals[0] === "sites" && positionals[1] === "get") return "sites get";
  if (positionals[0] === "sites" && positionals[1] === "cms") return `sites cms ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "media") return `sites media ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "revisions") return `sites revisions ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "publish") return "sites publish";
  if (positionals[0] === "sites" && positionals[1] === "bundle") return `sites bundle ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "outreach" && positionals.length === 1) return "outreach list";
  return positionals.slice(0, 2).join(" ");
}
function listOptions(parsed) {
  return {
    status: flag(parsed, "status"),
    limit: flag(parsed, "limit")
  };
}
function printJson(ctx, data) {
  ctx.stdout(JSON.stringify(data, null, 2) + "\n");
  return 0;
}
function formatDate(value) {
  if (typeof value !== "string") return "";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(parsed));
}
function valueText(value) {
  if (value === null || value === void 0 || value === "") return "-";
  return String(value);
}
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArrayField(value, field) {
  const record = asObject(value);
  const rows = record[field];
  return Array.isArray(rows) ? rows.filter((row) => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : [];
}
function requiredSiteId(parsed) {
  const key = commandKey(parsed.positionals);
  const positional = key === "sites get" ? parsed.positionals[2] : key === "sites cms get" ? parsed.positionals[3] : void 0;
  const siteId = flag(parsed, "site-id") ?? positional;
  if (!siteId?.trim()) throw new CliError("Site id is required. Pass --site-id <id>.", 2);
  return siteId.trim();
}
function parseJsonFlag(value, label) {
  if (!value?.trim()) return void 0;
  try {
    return JSON.parse(value);
  } catch {
    throw new CliError(`${label} must be valid JSON.`, 2);
  }
}
function parseJsonArrayFlags(values, label) {
  if (values.length === 0) return void 0;
  return values.map((value) => parseJsonFlag(value, label));
}
function environmentFlag(parsed) {
  return flag(parsed, "environment") === "live" ? "live" : "preview";
}
function inferContentType(filename) {
  const extension = filename.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  if (extension === ".html" || extension === ".htm") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".avif") return "image/avif";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".ogg" || extension === ".ogv") return "video/ogg";
  if (extension === ".woff") return "font/woff";
  if (extension === ".woff2") return "font/woff2";
  return "application/octet-stream";
}
function safeBundlePath(pathname) {
  const normalized = pathname.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === "." || part === "..")) {
    throw new CliError(`Invalid bundle path: ${pathname}`, 2);
  }
  return parts.join("/");
}
async function packStaticBundle(parsed) {
  const { join, relative, resolve } = await import("path");
  const { readdir, readFile, stat } = await import("fs/promises");
  const title = flag(parsed, "title") ?? null;
  const entryPath = flag(parsed, "entry-path") ?? "index.html";
  const zip = flag(parsed, "zip");
  const sourceDir = flag(parsed, "source-dir");
  if (zip && sourceDir) throw new CliError("Use either --source-dir or --zip, not both.", 2);
  if (zip) {
    const data = await readFile(zip);
    return {
      title,
      entryPath,
      sourceName: zip,
      zipBase64: data.toString("base64")
    };
  }
  if (!sourceDir) throw new CliError("Pass --source-dir <dir> or --zip <file>.", 2);
  const root = resolve(sourceDir);
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new CliError("--source-dir must point at a directory.", 2);
  const files = [];
  const skipDirectories = /* @__PURE__ */ new Set([".git", ".hg", ".svn", "node_modules"]);
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name)) await walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const absolute = join(dir, entry.name);
      const path = safeBundlePath(relative(root, absolute));
      const data = await readFile(absolute);
      files.push({
        path,
        contentType: inferContentType(path),
        dataBase64: data.toString("base64"),
        sizeBytes: data.byteLength
      });
    }
  }
  await walk(root);
  return {
    title,
    entryPath,
    sourceName: sourceDir,
    files
  };
}
async function postFormJson(parsed, ctx, path, formData, options = {}) {
  const url = new URL(path, normalizeBaseUrl(baseUrl(parsed, ctx)));
  const headers = { accept: "application/json" };
  const token = authToken(parsed, ctx);
  const cookie = cookieHeader(parsed, ctx);
  const e2e = e2eToken(parsed, ctx);
  const workspaceId = workspace(parsed, ctx);
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  if (e2e) headers["x-dynasite-e2e"] = e2e;
  if (workspaceId) headers["x-mere-workspace"] = workspaceId;
  if (options.requireAuth && !token && !cookie && !e2e) {
    throw new CliError(
      "Dynasite session required. Pass --token, --cookie, --e2e-token, or set DYNASITE_SESSION_TOKEN/DYNASITE_COOKIE.",
      2
    );
  }
  const response = await fetchImpl(ctx)(url, { method: "POST", headers, body: formData });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(`HTTP ${response.status}: ${valueText(asObject(data).error ?? response.statusText)}`, response.status);
  }
  return data;
}
function printRows(ctx, title, rows, columns) {
  ctx.stdout(`
  ${title} (${rows.length})
`);
  if (rows.length === 0) {
    ctx.stdout("  No records found.\n\n");
    return 0;
  }
  const header = columns.map((column) => column.label.padEnd(column.width)).join("  ");
  ctx.stdout(`  ${header}
`);
  ctx.stdout(`  ${columns.map((column) => "-".repeat(column.width)).join("  ")}
`);
  for (const row of rows) {
    const line = columns.map((column) => {
      const raw = column.key.endsWith("_at") ? formatDate(row[column.key]) : valueText(row[column.key]);
      return raw.length > column.width ? `${raw.slice(0, column.width - 1)}...` : raw.padEnd(column.width);
    }).join("  ");
    ctx.stdout(`  ${line}
`);
  }
  ctx.stdout("\n");
  return 0;
}
function printHelp(ctx) {
  ctx.stdout(`
  mere-dynasite - CLI for Dynasite (${DEFAULT_BASE_URL})

  Usage: mere-dynasite [global flags] <command> [flags]

  Commands:
    about                    Show CLI and service metadata
    status                   Show app and session status
    auth whoami              Show current session user
    businesses list          List business research records
    sites list               List generated sites
    sites get --site-id ID    Show one generated site payload
    sites cms get/edit/assist Manage editable CMS drafts
    sites media import/upload Import URLs or upload local media
    sites revisions list/revert
    sites publish             Publish preview or live
    sites bundle upload       Upload static HTML/CSS/JS/assets from R2-backed bundle
    sites bundle status|publish|rollback
    outreach list            List outreach records
    commands --json          Print command manifest JSON
    completion [bash|zsh|fish]

  Flags:
    --base-url <url>         Override API base
    --workspace <id>         Forward workspace context as x-mere-workspace
    --json                   Machine-readable JSON output
    --token <token>          App session bearer token
    --cookie <cookie>        Cookie header from an authenticated browser session
    --e2e-token <token>      Local/E2E access token for loopback dev
    --e2e                    Use the built-in local loopback E2E token
    --status <status>        Filter list commands by status
    --limit <count>          Limit list commands (server caps at 200)
    --site-id <id>           Target site id for site operations
    --source-dir <dir>       Static bundle directory containing index.html
    --zip <file>             Static bundle zip containing index.html
    --help, -h               Show this help
    --version, -v            Print package version

  Environment:
    DYNASITE_BASE_URL, MERE_DYNASITE_BASE_URL
    DYNASITE_SESSION_TOKEN, MERE_DYNASITE_SESSION_TOKEN
    DYNASITE_COOKIE, MERE_DYNASITE_COOKIE
    DYNASITE_E2E_ACCESS_TOKEN

`);
  return 0;
}
function printManifest(ctx) {
  ctx.stdout(JSON.stringify(COMMAND_MANIFEST, null, 2) + "\n");
  return 0;
}
function printCompletion(shell, ctx) {
  const topWords = ["about", "auth", "businesses", "commands", "completion", "help", "outreach", "sites", "status"].sort().join(" ");
  const subcommands = {
    auth: ["whoami"],
    businesses: ["list"],
    completion: ["bash", "fish", "zsh"],
    outreach: ["list"],
    sites: ["bundle", "cms", "get", "list", "media", "publish", "revisions"]
  };
  switch ((shell ?? "bash").trim().toLowerCase()) {
    case "zsh":
      ctx.stdout(`#compdef mere-dynasite
_arguments '1:command:(${topWords})'
`);
      return 0;
    case "fish":
      ctx.stdout(`complete -c mere-dynasite -f -n '__fish_use_subcommand' -a "${topWords}"
`);
      return 0;
    case "bash":
    default: {
      const cases = Object.entries(subcommands).map(([command, words]) => `    ${command}) words="${words.join(" ")}" ;;`).join("\n");
      ctx.stdout(`# mere-dynasite bash completion
_mere_dynasite_completion() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local words
  if [[ "$COMP_CWORD" -eq 1 ]]; then
    words="${topWords}"
  elif [[ "$COMP_CWORD" -eq 2 ]]; then
    case "\${COMP_WORDS[1]}" in
${cases}
      *) words="" ;;
    esac
  else
    words=""
  fi
  COMPREPLY=( $(compgen -W "$words" -- "$cur") )
}
complete -F _mere_dynasite_completion mere-dynasite
`);
      return 0;
    }
  }
}
function aboutPayload(parsed, ctx) {
  return {
    app: "mere-dynasite",
    namespace: "dynasite",
    baseUrl: normalizeBaseUrl(baseUrl(parsed, ctx)),
    workspace: workspace(parsed, ctx) ?? null,
    service: {
      defaultBaseUrl: DEFAULT_BASE_URL,
      publicHost: "sites.merekit.com",
      localDevUrl: "http://127.0.0.1:4414"
    },
    reads: ["status", "businesses list", "sites list", "outreach list"],
    writes: ["sites cms edit", "sites media import", "sites publish", "sites bundle upload"]
  };
}
function printAbout(parsed, ctx) {
  if (boolFlag(parsed, "json")) return printJson(ctx, aboutPayload(parsed, ctx));
  const payload = aboutPayload(parsed, ctx);
  ctx.stdout(`
  Dynasite
`);
  ctx.stdout(`  Base URL:  ${payload.baseUrl}
`);
  ctx.stdout(`  Workspace: ${payload.workspace ?? "-"}
`);
  ctx.stdout(`  Reads:     status, businesses list, sites list, sites get, outreach list
`);
  ctx.stdout(`  Writes:    sites cms/media/publish/bundle

`);
  return 0;
}
async function cmdStatus(parsed, ctx) {
  const data = await fetchJson(parsed, ctx, "/api/auth/session");
  const payload = {
    ok: true,
    baseUrl: normalizeBaseUrl(baseUrl(parsed, ctx)),
    workspace: workspace(parsed, ctx) ?? null,
    session: data
  };
  if (boolFlag(parsed, "json")) return printJson(ctx, payload);
  const session = asObject(data);
  const user = asObject(session.user);
  ctx.stdout(`
  Dynasite status
`);
  ctx.stdout(`  Base URL:      ${payload.baseUrl}
`);
  ctx.stdout(`  Workspace:     ${payload.workspace ?? "-"}
`);
  ctx.stdout(`  Authenticated: ${session.authenticated === true ? "yes" : "no"}
`);
  ctx.stdout(`  Access ready:  ${session.appAccessReady === true ? "yes" : "no"}
`);
  if (session.authenticated) {
    ctx.stdout(`  User:          ${valueText(user.primaryEmail ?? user.email ?? user.userId)}
`);
  }
  ctx.stdout("\n");
  return 0;
}
async function cmdWhoami(parsed, ctx) {
  const data = await fetchJson(parsed, ctx, "/api/auth/session");
  const session = asObject(data);
  if (boolFlag(parsed, "json")) {
    ctx.stdout(JSON.stringify(data, null, 2) + "\n");
    return session.authenticated === true ? 0 : 3;
  }
  if (session.authenticated !== true) {
    ctx.stdout("Not authenticated.\n");
    return 3;
  }
  const user = asObject(session.user);
  ctx.stdout(`User: ${valueText(user.primaryEmail ?? user.email ?? user.userId)}
`);
  return 0;
}
async function cmdBusinesses(parsed, ctx) {
  const filters = listOptions(parsed);
  const data = await fetchJson(parsed, ctx, "/api/research", {
    requireAuth: true,
    query: filters
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  return printRows(ctx, "Businesses", asArrayField(data, "businesses"), [
    { key: "id", label: "id", width: 18 },
    { key: "name", label: "name", width: 28 },
    { key: "status", label: "status", width: 12 },
    { key: "city", label: "city", width: 18 },
    { key: "created_at", label: "created", width: 22 }
  ]);
}
async function cmdSites(parsed, ctx) {
  const filters = listOptions(parsed);
  const data = await fetchJson(parsed, ctx, "/api/sites", {
    requireAuth: true,
    query: filters
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  return printRows(ctx, "Sites", asArrayField(data, "sites"), [
    { key: "id", label: "id", width: 18 },
    { key: "business_name", label: "business", width: 26 },
    { key: "status", label: "status", width: 16 },
    { key: "slug", label: "slug", width: 22 },
    { key: "created_at", label: "created", width: 22 }
  ]);
}
async function cmdSiteGet(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const data = await fetchJson(parsed, ctx, `/api/generate-v2/${encodeURIComponent(siteId)}`, {
    requireAuth: true
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const site = asObject(data);
  ctx.stdout(`
  Site ${valueText(site.id ?? siteId)}
`);
  ctx.stdout(`  Status:      ${valueText(site.status ?? site.publish_status)}
`);
  ctx.stdout(`  Slug:        ${valueText(site.slug)}
`);
  ctx.stdout(`  Preview URL: ${valueText(site.preview_url ?? site.previewUrl)}
`);
  ctx.stdout(`  External:    ${valueText(site.external_url ?? site.externalUrl)}

`);
  return 0;
}
async function cmdSiteCmsEdit(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const edit = parseJsonFlag(flag(parsed, "edit-json"), "--edit-json");
  if (!edit || typeof edit !== "object" || Array.isArray(edit)) {
    throw new CliError("--edit-json must be a JSON object.", 2);
  }
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/cms`, {
    requireAuth: true,
    method: "PATCH",
    body: {
      edit,
      source: flag(parsed, "source") ?? "manual_edit"
    }
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  ctx.stdout(`Updated CMS draft for ${siteId}.
`);
  return 0;
}
async function cmdSiteCmsAssist(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const action = flag(parsed, "action")?.trim();
  if (!action) throw new CliError("--action is required.", 2);
  const targetIndexText = flag(parsed, "target-index");
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/assist`, {
    requireAuth: true,
    method: "POST",
    body: {
      action,
      targetIndex: targetIndexText ? Number(targetIndexText) : null
    }
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  ctx.stdout(`Assist result for ${siteId}: ${valueText(result.note ?? "ready")}
`);
  return 0;
}
async function cmdSiteMediaImport(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const items = parseJsonArrayFlags(flagList(parsed, "item-json"), "--item-json");
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/media/import`, {
    requireAuth: true,
    method: "POST",
    body: {
      discover: boolFlag(parsed, "discover"),
      ...items ? { items } : {}
    }
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  ctx.stdout(`Imported ${valueText(result.importedCount ?? result.imported?.length ?? 0)} media item(s).
`);
  return 0;
}
async function cmdSiteMediaUpload(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const file = flag(parsed, "file")?.trim();
  if (!file) throw new CliError("--file is required.", 2);
  const { basename } = await import("path");
  const { readFile } = await import("fs/promises");
  const data = await readFile(file);
  const form = new FormData();
  form.set("file", new Blob([data], { type: inferContentType(file) }), basename(file));
  form.set("alt", flag(parsed, "alt") ?? basename(file));
  form.set("role", flag(parsed, "role") ?? "gallery");
  const result = await postFormJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/media`, form, {
    requireAuth: true
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, result);
  ctx.stdout(`Uploaded media to ${siteId}.
`);
  return 0;
}
async function cmdSiteRevisions(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/revisions`, {
    requireAuth: true
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  return printRows(ctx, "Revisions", asArrayField(data, "revisions"), [
    { key: "id", label: "id", width: 18 },
    { key: "revisionNumber", label: "rev", width: 8 },
    { key: "source", label: "source", width: 16 },
    { key: "publishStatus", label: "status", width: 16 },
    { key: "createdAt", label: "created", width: 22 }
  ]);
}
async function cmdSiteRevisionRevert(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const revisionId = parsed.positionals[3]?.trim();
  if (!revisionId) throw new CliError("Revision id is required.", 2);
  const data = await fetchJson(
    parsed,
    ctx,
    `/api/sites/${encodeURIComponent(siteId)}/revisions/${encodeURIComponent(revisionId)}/revert`,
    { requireAuth: true, method: "POST", body: {} }
  );
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  ctx.stdout(`Reverted ${siteId} to revision ${revisionId}.
`);
  return 0;
}
async function cmdSitePublish(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/publish`, {
    requireAuth: true,
    method: "POST",
    body: { environment: environmentFlag(parsed) }
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  ctx.stdout(`Published ${siteId}: ${valueText(result.externalUrl ?? result.liveUrl ?? result.previewUrl)}
`);
  return 0;
}
async function cmdSiteBundleUpload(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const body = await packStaticBundle(parsed);
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/static-bundles`, {
    requireAuth: true,
    method: "POST",
    body
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  const bundle = asObject(result.bundle);
  ctx.stdout(`Uploaded static bundle ${valueText(bundle.bundleId)} for ${siteId}.
`);
  if (result.previewUrl) ctx.stdout(`Preview: ${String(result.previewUrl)}
`);
  return 0;
}
async function cmdSiteBundleStatus(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/static-bundles`, {
    requireAuth: true
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  return printRows(ctx, "Static Bundles", asArrayField(data, "bundles"), [
    { key: "id", label: "id", width: 18 },
    { key: "version", label: "version", width: 10 },
    { key: "status", label: "status", width: 14 },
    { key: "fileCount", label: "files", width: 8 },
    { key: "createdAt", label: "created", width: 22 }
  ]);
}
async function cmdSiteBundlePublish(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const bundleId = flag(parsed, "bundle-id")?.trim();
  if (!bundleId) throw new CliError("--bundle-id is required.", 2);
  const data = await fetchJson(
    parsed,
    ctx,
    `/api/sites/${encodeURIComponent(siteId)}/static-bundles/${encodeURIComponent(bundleId)}/publish`,
    {
      requireAuth: true,
      method: "POST",
      body: { environment: environmentFlag(parsed) }
    }
  );
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  ctx.stdout(`Published static bundle ${bundleId}: ${valueText(result.externalUrl ?? result.liveUrl ?? result.previewUrl)}
`);
  return 0;
}
async function cmdSiteBundleRollback(parsed, ctx) {
  const siteId = requiredSiteId(parsed);
  const data = await fetchJson(parsed, ctx, `/api/sites/${encodeURIComponent(siteId)}/static-bundles/rollback`, {
    requireAuth: true,
    method: "POST",
    body: {
      bundleId: flag(parsed, "bundle-id") ?? null,
      environment: environmentFlag(parsed)
    }
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  const result = asObject(data);
  const bundle = asObject(result.bundle);
  ctx.stdout(`Rolled back ${siteId} to bundle ${valueText(bundle.bundleId)}.
`);
  return 0;
}
async function cmdOutreach(parsed, ctx) {
  const filters = listOptions(parsed);
  const data = await fetchJson(parsed, ctx, "/api/outreach", {
    requireAuth: true,
    query: filters
  });
  if (boolFlag(parsed, "json")) return printJson(ctx, data);
  return printRows(ctx, "Outreach", asArrayField(data, "outreach"), [
    { key: "id", label: "id", width: 18 },
    { key: "business_name", label: "business", width: 26 },
    { key: "channel", label: "channel", width: 10 },
    { key: "status", label: "status", width: 14 },
    { key: "created_at", label: "created", width: 22 }
  ]);
}
async function runCli(rawArgs, ctx) {
  let parsed;
  try {
    parsed = parseArgs(rawArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`Error: ${message}
`);
    return error instanceof CliError ? error.exitCode : 1;
  }
  if (boolFlag(parsed, "version") || parsed.positionals[0] === "version") {
    ctx.stdout(`${await cliVersion()}
`);
    return 0;
  }
  const key = commandKey(parsed.positionals);
  if (key === "commands") {
    if (!boolFlag(parsed, "json")) {
      ctx.stderr("Usage: mere-dynasite commands --json\n");
      return 1;
    }
    return printManifest(ctx);
  }
  if (key === "completion") {
    return printCompletion(parsed.positionals[1], ctx);
  }
  if (boolFlag(parsed, "help") || parsed.positionals[0] === "help") {
    return printHelp(ctx);
  }
  try {
    switch (key) {
      case "about":
        return printAbout(parsed, ctx);
      case "status":
        return await cmdStatus(parsed, ctx);
      case "auth whoami":
        return await cmdWhoami(parsed, ctx);
      case "businesses list":
        return await cmdBusinesses(parsed, ctx);
      case "sites list":
        return await cmdSites(parsed, ctx);
      case "sites get":
      case "sites cms get":
        return await cmdSiteGet(parsed, ctx);
      case "sites cms edit":
        return await cmdSiteCmsEdit(parsed, ctx);
      case "sites cms assist":
        return await cmdSiteCmsAssist(parsed, ctx);
      case "sites media import":
        return await cmdSiteMediaImport(parsed, ctx);
      case "sites media upload":
        return await cmdSiteMediaUpload(parsed, ctx);
      case "sites revisions list":
        return await cmdSiteRevisions(parsed, ctx);
      case "sites revisions revert":
        return await cmdSiteRevisionRevert(parsed, ctx);
      case "sites publish":
        return await cmdSitePublish(parsed, ctx);
      case "sites bundle upload":
        return await cmdSiteBundleUpload(parsed, ctx);
      case "sites bundle status":
        return await cmdSiteBundleStatus(parsed, ctx);
      case "sites bundle publish":
        return await cmdSiteBundlePublish(parsed, ctx);
      case "sites bundle rollback":
        return await cmdSiteBundleRollback(parsed, ctx);
      case "outreach list":
        return await cmdOutreach(parsed, ctx);
      default:
        ctx.stderr(`Unknown command: ${parsed.positionals.join(" ") || "(empty)"}
`);
        return printHelp(ctx);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`Error: ${message}
`);
    return error instanceof CliError ? error.exitCode : 1;
  }
}

// cli/run.ts
var exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
});
process.exitCode = exitCode;
