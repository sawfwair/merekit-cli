// cli/local-plane.js
import { createHash as createHash2 } from "node:crypto";
import { mkdir as mkdir2, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

// ../mere-business/packages/local-plane/src/index.ts
import { mkdir } from "node:fs/promises";
import path2 from "node:path";

// ../mere-business/packages/local-plane/src/migration.ts
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

// ../mere-business/packages/local-plane/src/projection.ts
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

// ../mere-business/packages/local-plane/src/config.ts
import os from "node:os";
import path from "node:path";
function stateHome(env) {
  const home = env.HOME?.trim() || os.homedir();
  return env.XDG_DATA_HOME?.trim() || path.join(home, ".local", "share");
}
function expandHome(value, env) {
  const home = env.HOME?.trim() || os.homedir();
  if (value === "~") return home;
  if (value.startsWith("~/")) return path.join(home, value.slice(2));
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
  return path.join(stateHome(env), "mere", "local-plane.db");
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
      value: path.resolve(expandHome(input.argument, input.env)),
      source: "argument"
    };
  }
  const appValue = input.env[`${prefix}_LOCAL_DB`] ?? input.env[`${prefix}_LOCAL_PLANE_DB`];
  if (appValue?.trim()) {
    return {
      value: path.resolve(expandHome(appValue, input.env)),
      source: "app-env"
    };
  }
  const globalValue = input.env.MERE_LOCAL_DB ?? input.env.MERE_LOCAL_PLANE_DB;
  if (globalValue?.trim()) {
    return {
      value: path.resolve(expandHome(globalValue, input.env)),
      source: "global-env"
    };
  }
  return {
    value: path.resolve(defaultLocalPlaneDbPath(input.env)),
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

// ../mere-business/packages/local-plane/src/index.ts
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function loadNodeSqlite() {
  return import(["node", "sqlite"].join(":"));
}
async function openLocalPlaneDatabase(config) {
  await mkdir(path2.dirname(config.localDbPath), { recursive: true });
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

// cli/local-plane.js
var DELIVER_APP_ID = "mere-deliver";
var DELIVER_ARCHIVE_SCHEMA = "mere.deliver.archive.v1";
var HOSTED_BOUNDARY = "Deliver Worker serving, D1 password verification, signed sessions, rate limiting, static asset bytes, companion PDF bytes, public URLs, deploys, and the Business projection receiver remain Cloudflare-owned.";
var RECORD_TYPES = [
  "packages",
  "pages",
  "files",
  "recipients",
  "accessGrants",
  "loginAttempts",
  "auditEvents"
];
var RECORD_TYPE_LABELS = {
  packages: "delivery package",
  pages: "same-page content",
  files: "file reference",
  recipients: "recipient",
  accessGrants: "access grant",
  loginAttempts: "login attempt",
  auditEvents: "audit event"
};
var COUNT_FIELDS = {
  packages: "packageCount",
  pages: "pageCount",
  files: "fileReferenceCount",
  recipients: "recipientCount",
  accessGrants: "accessGrantCount",
  loginAttempts: "loginAttemptCount",
  auditEvents: "auditEventCount"
};
var PACKAGE_SCOPED_TYPES = /* @__PURE__ */ new Set(["pages", "files", "recipients", "accessGrants", "loginAttempts", "auditEvents"]);
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
    throw new Error(`${label} is required for local mere-deliver records.`);
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
    "slug",
    "packageSlug",
    "package_slug",
    "fileId",
    "file_id",
    "recipientId",
    "recipient_id",
    "grantId",
    "grant_id",
    "attemptId",
    "attempt_id",
    "eventId",
    "event_id"
  ]);
  return readString2(id, `${RECORD_TYPE_LABELS[type] ?? type} id`);
}
function normalizePayloadRecord(input, type, workspaceId, existing) {
  const id = readRecordId(input, type);
  const now = isoNow3();
  const createdAt = readOptionalString(input.createdAt ?? input.created_at) ?? readOptionalString(existing?.createdAt) ?? now;
  const updatedAt = readOptionalString(input.updatedAt ?? input.updated_at) ?? now;
  const packageSlug = (type === "packages" ? readFirstString(input, ["slug", "packageSlug", "package_slug"]) ?? id : readFirstString(input, ["packageSlug", "package_slug", "slug"])) ?? readOptionalString(existing?.packageSlug);
  if (PACKAGE_SCOPED_TYPES.has(type) && !packageSlug) {
    throw new Error(`${RECORD_TYPE_LABELS[type]} requires packageSlug.`);
  }
  return {
    id,
    packageSlug,
    createdAt,
    updatedAt,
    payload: {
      ...existing ?? {},
      ...input,
      id,
      workspaceId,
      recordType: type,
      packageSlug,
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
    packageSlug: readOptionalString(row.package_slug),
    createdAt: readString2(row.created_at, "created_at"),
    updatedAt: readString2(row.updated_at, "updated_at")
  };
}
function stablePackageProjectionId(input) {
  const digest = createHash2("sha256").update([DELIVER_APP_ID, input.workspaceId, input.packageSlug, "package-summary"].join("\n")).digest("hex").slice(0, 24);
  return `delpr_${digest}`;
}
function dateOnly(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 10) : null;
}
function optionalPayloadString(payload, key) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== DELIVER_ARCHIVE_SCHEMA || value.version !== 1) {
    throw new Error(`Deliver transfer payload must be ${DELIVER_ARCHIVE_SCHEMA} version 1.`);
  }
  const readList = (key) => Array.isArray(value[key]) ? value[key].filter(isRecord2).map((entry) => normalizePayloadRecord(entry, key, workspaceId).payload) : [];
  return {
    kind: DELIVER_ARCHIVE_SCHEMA,
    version: 1,
    packages: readList("packages"),
    pages: readList("pages"),
    files: readList("files"),
    recipients: readList("recipients"),
    accessGrants: readList("accessGrants"),
    loginAttempts: readList("loginAttempts"),
    auditEvents: readList("auditEvents")
  };
}
var LocalDeliverStore = class _LocalDeliverStore {
  /**
   * @param {string} dbPath
   * @param {DatabaseSync} db
   * @param {PlaneConfig} config
   * @param {DeliverWorkspace} workspace
   */
  constructor(dbPath, db, config, workspace) {
    this.dbPath = dbPath;
    this.db = db;
    this.config = config;
    this.workspace = workspace;
  }
  /**
   * @param {{ config: PlaneConfig; workspace: DeliverWorkspace }} input
   * @returns {Promise<LocalDeliverStore>}
   */
  static async open(input) {
    const opened = await openLocalPlaneDatabase(input.config);
    registerPlaneApp(opened.db, DELIVER_APP_ID, "Mere Deliver");
    registerPlaneTransferSchema(opened.db, DELIVER_APP_ID, {
      payloadSchema: DELIVER_ARCHIVE_SCHEMA,
      displayName: "Deliver archive transfer",
      description: "Portable delivery package, Same Page, file-reference, recipient, access, login-attempt, and audit metadata; Worker serving, password verification, session cookies, and static bytes stay hosted."
    });
    upsertPlaneWorkspace(opened.db, DELIVER_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalDeliverStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  /** @returns {void} */
  close() {
    this.db.close();
  }
  /** @returns {void} */
  ensureSchema() {
    this.db.exec(`
			CREATE TABLE IF NOT EXISTS deliver_local_records (
				record_type TEXT NOT NULL,
				record_id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				package_slug TEXT,
				payload_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, record_type, record_id)
			);

			CREATE INDEX IF NOT EXISTS idx_deliver_local_records_type
				ON deliver_local_records (workspace_id, record_type, updated_at DESC);

			CREATE INDEX IF NOT EXISTS idx_deliver_local_records_package
				ON deliver_local_records (workspace_id, package_slug, record_type, updated_at DESC);

			CREATE TABLE IF NOT EXISTS deliver_local_projections (
				id TEXT PRIMARY KEY,
				workspace_id TEXT NOT NULL,
				scope TEXT NOT NULL,
				package_slug TEXT NOT NULL,
				published_at TEXT NOT NULL,
				revoked_at TEXT,
				payload_json TEXT NOT NULL,
				last_projected_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_deliver_local_projections_workspace_scope
				ON deliver_local_projections (workspace_id, scope, updated_at DESC);
		`);
  }
  /**
   * @param {DeliverRecordType} type
   * @returns {number}
   */
  count(type) {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM deliver_local_records WHERE workspace_id = ? AND record_type = ?").get(this.workspace.workspaceId, type);
    return isRecord2(row) && typeof row.count === "number" ? row.count : 0;
  }
  /** @returns {Record<string, number>} */
  counts() {
    return Object.fromEntries(RECORD_TYPES.map((type) => [COUNT_FIELDS[type], this.count(type)]));
  }
  /** @returns {number} */
  projectionCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM deliver_local_projections WHERE workspace_id = ?").get(this.workspace.workspaceId);
    return isRecord2(row) && typeof row.count === "number" ? row.count : 0;
  }
  /** @returns {JsonRecord} */
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: DELIVER_APP_ID });
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      ...this.counts(),
      projectionCount: this.projectionCount(),
      localArchive: "enabled",
      workerServingLocal: false,
      passwordVerificationLocal: false,
      staticBytesLocal: false,
      sessionCookiesLocal: false,
      rateLimitingLocal: false,
      projectionPublisherLocal: true,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  /**
   * @param {DeliverRecordType} type
   * @param {string | null | undefined} [packageSlug]
   * @returns {JsonRecord[]}
   */
  listRecords(type, packageSlug) {
    const rows = (
      /** @type {JsonRecord[]} */
      packageSlug ? this.db.prepare(
        "SELECT * FROM deliver_local_records WHERE workspace_id = ? AND record_type = ? AND package_slug = ? ORDER BY updated_at DESC"
      ).all(this.workspace.workspaceId, type, packageSlug) : this.db.prepare("SELECT * FROM deliver_local_records WHERE workspace_id = ? AND record_type = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId, type)
    );
    return rows.map(rowPayload);
  }
  /**
   * @param {DeliverRecordType} type
   * @param {string} id
   * @returns {JsonRecord | null}
   */
  getRecord(type, id) {
    const row = this.db.prepare("SELECT * FROM deliver_local_records WHERE workspace_id = ? AND record_type = ? AND record_id = ? LIMIT 1").get(this.workspace.workspaceId, type, id);
    return isRecord2(row) ? rowPayload(row) : null;
  }
  /**
   * @param {DeliverRecordType} type
   * @param {JsonRecord} input
   * @returns {JsonRecord}
   */
  upsertRecord(type, input) {
    const id = readRecordId(input, type);
    const existing = this.getRecord(type, id) ?? void 0;
    const record = normalizePayloadRecord(input, type, this.workspace.workspaceId, existing);
    this.db.prepare(
      `INSERT INTO deliver_local_records (
					record_type, record_id, workspace_id, package_slug, payload_json, created_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
					package_slug = excluded.package_slug,
					payload_json = excluded.payload_json,
					updated_at = excluded.updated_at`
    ).run(
      type,
      record.id,
      this.workspace.workspaceId,
      record.packageSlug,
      JSON.stringify(record.payload),
      record.createdAt,
      record.updatedAt
    );
    return record.payload;
  }
  /**
   * @param {string} projectionId
   * @returns {ProjectionRow | null}
   */
  getPackageProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM deliver_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return isRecord2(row) ? {
      published_at: readOptionalString(row.published_at),
      revoked_at: readOptionalString(row.revoked_at)
    } : null;
  }
  /**
   * @param {{
   *   action: DeliverProjectionAction;
   *   packageSlug: string;
   *   publishedByUserId: string;
   *   publishedByEmail: string | null;
   * }} input
   * @returns {DeliverProjectionEnvelope}
   */
  buildPackageProjectionEnvelope(input) {
    const pkg = this.getRecord("packages", input.packageSlug);
    if (!pkg) throw new Error(`Local Deliver package archive record not found: ${input.packageSlug}`);
    const packageSlug = readString2(pkg.packageSlug ?? pkg.slug ?? input.packageSlug, "package slug");
    const projectionId = stablePackageProjectionId({
      workspaceId: this.workspace.workspaceId,
      packageSlug
    });
    const existing = this.getPackageProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    return {
      version: 1,
      appId: DELIVER_APP_ID,
      event: {
        type: input.action === "publish" ? "deliver.package.projection.upserted" : "deliver.package.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "package-summary",
          packageSlug,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        package: {
          slug: packageSlug,
          status: optionalPayloadString(pkg, "status"),
          createdOn: dateOnly(pkg.createdAt ?? pkg.created_at),
          updatedOn: dateOnly(pkg.updatedAt ?? pkg.updated_at)
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          packageSlug,
          pageCount: this.listRecords("pages", packageSlug).length,
          fileReferenceCount: this.listRecords("files", packageSlug).length,
          recipientCount: this.listRecords("recipients", packageSlug).length,
          accessGrantCount: this.listRecords("accessGrants", packageSlug).length,
          loginAttemptCount: this.listRecords("loginAttempts", packageSlug).length,
          auditEventCount: this.listRecords("auditEvents", packageSlug).length
        },
        exclusions: [
          "package titles and customer names",
          "password hashes and password verification state",
          "signed session cookies and rate-limit counters",
          "Same Page payloads and custom HTML",
          "file names, file paths, object keys, byte lengths, hashes, and static bytes",
          "companion PDF bytes and PDF metadata",
          "recipient names, email addresses, and access tokens",
          "access-grant details and role assignments",
          "login attempt IP addresses, user agents, reasons, and exact timestamps",
          "audit event bodies and actor identifiers",
          "signing URLs and mere.ink packet tokens",
          "public delivery URLs and deploy state",
          "raw local archive rows",
          "transfer bundle payloads"
        ]
      }
    };
  }
  /**
   * @param {DeliverProjectionEnvelope} envelope
   * @returns {void}
   */
  recordPackageProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO deliver_local_projections (
					id, workspace_id, scope, package_slug, published_at, revoked_at, payload_json, last_projected_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					workspace_id = excluded.workspace_id,
					scope = excluded.scope,
					package_slug = excluded.package_slug,
					published_at = excluded.published_at,
					revoked_at = excluded.revoked_at,
					payload_json = excluded.payload_json,
					last_projected_at = excluded.last_projected_at,
					updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.packageSlug,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  /** @returns {DeliverArchivePayload} */
  exportPayload() {
    return {
      kind: DELIVER_ARCHIVE_SCHEMA,
      version: 1,
      packages: this.listRecords("packages"),
      pages: this.listRecords("pages"),
      files: this.listRecords("files"),
      recipients: this.listRecords("recipients"),
      accessGrants: this.listRecords("accessGrants"),
      loginAttempts: this.listRecords("loginAttempts"),
      auditEvents: this.listRecords("auditEvents")
    };
  }
  /** @returns {DeliverTransferBundle} */
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: DELIVER_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: DELIVER_ARCHIVE_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: DELIVER_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: DELIVER_ARCHIVE_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  /**
   * @param {unknown} value
   * @returns {unknown}
   */
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: DELIVER_APP_ID,
      payloadSchema: DELIVER_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? DELIVER_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? DELIVER_ARCHIVE_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  /**
   * @param {unknown} value
   * @returns {JsonRecord}
   */
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: DELIVER_APP_ID,
      payloadSchema: DELIVER_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const type of RECORD_TYPES) {
        for (const record of normalized[type]) this.upsertRecord(type, record);
      }
      const transferId = recordPlaneTransfer(this.db, {
        appId: DELIVER_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source: bundle?.source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? DELIVER_ARCHIVE_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        ...this.counts(),
        transferId,
        workerServingLocal: false,
        staticBytesLocal: false,
        passwordVerificationLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};
function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asBoolean(value) {
  return value === true || value === "true" || value === "1";
}
function resolveDeliverPlaneConfig(flags) {
  return resolvePlaneConfigInspection({
    appId: DELIVER_APP_ID,
    env: process.env,
    data: asString(flags.store),
    ai: asString(flags.ai),
    localDbPath: asString(flags["local-db"])
  });
}
function isLocalDataRoute(flags) {
  return resolveDeliverPlaneConfig(flags).data === "local";
}
function hostedDeliverBoundary() {
  return HOSTED_BOUNDARY;
}
function localWorkspace(flags) {
  const workspaceId = asString(flags.workspace) ?? asString(process.env.MERE_DELIVER_WORKSPACE_ID) ?? asString(process.env.DELIVER_WORKSPACE_ID) ?? asString(process.env.MERE_WORKSPACE_ID) ?? asString(process.env.MERE_WORKSPACE) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Deliver Archive" : workspaceId
  };
}
async function openLocalStore(flags) {
  const config = resolveDeliverPlaneConfig(flags);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so mere-deliver local data stays explicit.");
  }
  return LocalDeliverStore.open({
    config,
    workspace: localWorkspace(flags)
  });
}
async function withLocalStore(flags, handler) {
  const store = await openLocalStore(flags);
  try {
    return await handler(store);
  } finally {
    store.close();
  }
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
  if (!isRecord2(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}
async function readJsonData(flags) {
  const file = asString(flags["data-file"]);
  const inline = asString(flags.data);
  if (file && inline !== void 0) {
    throw new Error("Use only one of --data or --data-file.");
  }
  const raw = file ? await readFile(file, "utf8") : inline ?? "{}";
  return readObject(parseJsonText(raw, file ? `--data-file ${file}` : "--data"), file ? "--data-file" : "--data");
}
function archiveCounts(payload) {
  return Object.fromEntries(RECORD_TYPES.map((key) => [COUNT_FIELDS[key], Array.isArray(payload[key]) ? payload[key].length : 0]));
}
async function handleLocalStoreInfo(flags) {
  const config = resolveDeliverPlaneConfig(flags);
  if (config.data === "local") {
    return withLocalStore(flags, (store) => ({
      ok: true,
      app: DELIVER_APP_ID,
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
  if (asBoolean(flags.json)) {
    return {
      ok: true,
      app: DELIVER_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localArchive: "available",
      workerServingLocal: false,
      passwordVerificationLocal: false,
      staticBytesLocal: false,
      sessionCookiesLocal: false,
      rateLimitingLocal: false,
      projectionPublisherLocal: true,
      localAiSupported: false,
      sources: config.sources
    };
  }
  process.stdout.write(
    formatPlaneConfigReport({
      kind: "mere.local-plane.config",
      configs: [config]
    })
  );
  process.stdout.write(
    `Delivery package archives can be stored locally with --store local. Package, Same Page, file-reference, recipient, access, login-attempt, and audit metadata are portable. ${HOSTED_BOUNDARY}
`
  );
  return "";
}
async function handleLocalExport(flags) {
  return withLocalStore(flags, async (store) => {
    const bundle = store.exportBundle();
    const output = asString(flags.output);
    if (!output) return bundle;
    const target = resolvePath(output);
    await mkdir2(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(bundle, null, 2));
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
async function handleLocalImport(flags) {
  return withLocalStore(flags, async (store) => {
    const file = asString(flags.file);
    if (!file) throw new Error("Missing required --file.");
    const value = parseJsonText(await readFile(file, "utf8"), "local Deliver archive transfer bundle");
    return asBoolean(flags["dry-run"]) ? store.importPlan(value) : store.importValue(value);
  });
}
async function handleLocalRecordGroup(type, action, args, flags) {
  return withLocalStore(flags, async (store) => {
    const recordType = (
      /** @type {DeliverRecordType} */
      type
    );
    const normalizedAction = action ?? "list";
    if (normalizedAction === "list") return { ok: true, records: store.listRecords(recordType, args[0]) };
    if (normalizedAction === "get" || normalizedAction === "show") {
      const id = args[0];
      if (!id) throw new Error(`${type} ${normalizedAction} requires <id>.`);
      return { ok: true, record: store.getRecord(recordType, id) };
    }
    if (normalizedAction === "upsert") return store.upsertRecord(recordType, await readJsonData(flags));
    if (recordType === "packages" && (normalizedAction === "publish" || normalizedAction === "revoke")) {
      const packageSlug = asString(args[0]);
      if (!packageSlug) throw new Error(`packages ${normalizedAction} requires <slug>.`);
      const envelope = store.buildPackageProjectionEnvelope({
        action: normalizedAction,
        packageSlug,
        ...projectionActor(flags)
      });
      if (asBoolean(flags["dry-run"])) {
        let receiverUrl;
        try {
          receiverUrl = resolveCloudProjectionTarget({
            appId: DELIVER_APP_ID,
            env: process.env,
            receiverUrl: asString(flags["projection-url"]),
            bearerToken: asString(flags["projection-token"])
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
        appId: DELIVER_APP_ID,
        env: process.env,
        receiverUrl: asString(flags["projection-url"]),
        bearerToken: asString(flags["projection-token"]),
        event: envelope
      });
      store.recordPackageProjection(envelope);
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
    throw new Error(`--store local supports ${type} list/get/show/upsert${recordType === "packages" ? "/publish/revoke" : ""} only. ${HOSTED_BOUNDARY}`);
  });
}
function projectionActor(flags) {
  return {
    publishedByUserId: asString(flags["published-by-user-id"]) ?? asString(process.env.MERE_DELIVER_USER_ID) ?? asString(process.env.DELIVER_USER_ID) ?? asString(process.env.USER) ?? "local-user",
    publishedByEmail: asString(flags["published-by-email"]) ?? asString(process.env.MERE_DELIVER_USER_EMAIL) ?? asString(process.env.DELIVER_USER_EMAIL) ?? asString(process.env.EMAIL) ?? null
  };
}
export {
  DELIVER_APP_ID,
  DELIVER_ARCHIVE_SCHEMA,
  handleLocalExport,
  handleLocalImport,
  handleLocalRecordGroup,
  handleLocalStoreInfo,
  hostedDeliverBoundary,
  isLocalDataRoute
};
