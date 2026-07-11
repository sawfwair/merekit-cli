#!/usr/bin/env node

// cli/local-plane.ts
import { mkdir as mkdir2, readFile, writeFile } from "fs/promises";
import { dirname, resolve as resolvePath } from "path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
import os from "os";
import path from "path";
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
  const prefix = envPrefix(input.appId);
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
  const fetchImpl2 = input.fetchImpl ?? fetch;
  const response = await fetchImpl2(target.receiverUrl, {
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
import { createHash as createHash2, randomUUID as randomUUID2 } from "crypto";
import { mkdir } from "fs/promises";
import os2 from "os";
import path2 from "path";

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
    workspaces: workspaces.map((workspace2) => ({
      workspaceId: workspace2.workspace_id,
      slug: workspace2.slug,
      name: workspace2.name,
      appCount: Number(workspace2.app_count),
      updatedAt: workspace2.updated_at
    })),
    appWorkspaces: appWorkspaces.map((workspace2) => ({
      appId: workspace2.app_id,
      workspaceId: workspace2.workspace_id,
      slug: workspace2.slug,
      name: workspace2.name,
      dataPlane: workspace2.data_plane,
      aiPlane: workspace2.ai_plane,
      cloudProjection: workspace2.cloud_projection,
      updatedAt: workspace2.updated_at
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
import { createHash as createHash3 } from "crypto";
var DYNASITE_APP_ID = "mere-dynasite";
var DYNASITE_ARCHIVE_SCHEMA = "mere.dynasite.archive.v1";
var RECORD_TYPES = [
  "businesses",
  "sites",
  "intelPackages",
  "sourceSites",
  "cmsDrafts",
  "revisions",
  "publications",
  "media",
  "staticBundles",
  "leads",
  "outreach"
];
var RECORD_TYPE_LABELS = {
  businesses: "business",
  sites: "site",
  intelPackages: "intel package",
  sourceSites: "source site snapshot",
  cmsDrafts: "CMS draft",
  revisions: "site revision",
  publications: "site publication",
  media: "site media item",
  staticBundles: "static bundle",
  leads: "lead",
  outreach: "outreach record"
};
var COUNT_FIELDS = {
  businesses: "businessCount",
  sites: "siteCount",
  intelPackages: "intelPackageCount",
  sourceSites: "sourceSiteCount",
  cmsDrafts: "cmsDraftCount",
  revisions: "revisionCount",
  publications: "publicationCount",
  media: "mediaCount",
  staticBundles: "staticBundleCount",
  leads: "leadCount",
  outreach: "outreachCount"
};
var BUSINESS_SCOPED_TYPES = /* @__PURE__ */ new Set(["intelPackages", "sourceSites", "outreach"]);
var SITE_SCOPED_TYPES = /* @__PURE__ */ new Set([
  "cmsDrafts",
  "revisions",
  "publications",
  "media",
  "staticBundles",
  "leads"
]);
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
    throw new Error(`${label} is required for local Dynasite records.`);
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
    "bundleId",
    "bundle_id",
    "leadId",
    "lead_id",
    "inquiryId",
    "inquiry_id",
    "revisionId",
    "revision_id",
    "publicationId",
    "publication_id"
  ]);
  return readString2(id, `${RECORD_TYPE_LABELS[type]} id`);
}
function readBusinessId(input, type, id) {
  if (type === "businesses") return id;
  return readFirstString(input, ["businessId", "business_id"]);
}
function readSiteId(input, type, id) {
  if (type === "sites") return id;
  return readFirstString(input, ["siteId", "site_id"]);
}
function normalizePayloadRecord(input, type, workspaceId, existing) {
  const id = readRecordId(input, type);
  const now = isoNow3();
  const createdAt = readOptionalString(input.createdAt ?? input.created_at) ?? readOptionalString(existing?.createdAt) ?? now;
  const updatedAt = readOptionalString(input.updatedAt ?? input.updated_at) ?? now;
  const businessId = readBusinessId(input, type, id) ?? readOptionalString(existing?.businessId);
  const siteId = readSiteId(input, type, id) ?? readOptionalString(existing?.siteId);
  if (BUSINESS_SCOPED_TYPES.has(type) && !businessId) {
    throw new Error(`${RECORD_TYPE_LABELS[type]} requires businessId.`);
  }
  if (SITE_SCOPED_TYPES.has(type) && !siteId) {
    throw new Error(`${RECORD_TYPE_LABELS[type]} requires siteId.`);
  }
  return {
    id,
    businessId,
    siteId,
    createdAt,
    updatedAt,
    payload: {
      ...existing ?? {},
      ...input,
      id,
      workspaceId,
      recordType: type,
      businessId,
      siteId,
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
    businessId: readOptionalString(row.business_id),
    siteId: readOptionalString(row.site_id),
    createdAt: readString2(row.created_at, "created_at"),
    updatedAt: readString2(row.updated_at, "updated_at")
  };
}
function stableSiteProjectionId(input) {
  const digest = createHash3("sha256").update([DYNASITE_APP_ID, input.workspaceId, input.siteId, "site-summary"].join("\n")).digest("hex").slice(0, 24);
  return `dynpr_${digest}`;
}
function dateOnly(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 10) : null;
}
function optionalPayloadString(payload, key) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function normalizePayload(value, workspaceId) {
  if (!isRecord2(value) || value.kind !== DYNASITE_ARCHIVE_SCHEMA || value.version !== 1) {
    throw new Error(`Dynasite transfer payload must be ${DYNASITE_ARCHIVE_SCHEMA} version 1.`);
  }
  const readList = (key) => Array.isArray(value[key]) ? value[key].filter(isRecord2).map((entry) => normalizePayloadRecord(entry, key, workspaceId).payload) : [];
  return {
    kind: DYNASITE_ARCHIVE_SCHEMA,
    version: 1,
    businesses: readList("businesses"),
    sites: readList("sites"),
    intelPackages: readList("intelPackages"),
    sourceSites: readList("sourceSites"),
    cmsDrafts: readList("cmsDrafts"),
    revisions: readList("revisions"),
    publications: readList("publications"),
    media: readList("media"),
    staticBundles: readList("staticBundles"),
    leads: readList("leads"),
    outreach: readList("outreach")
  };
}
var LocalDynasiteStore = class _LocalDynasiteStore {
  constructor(dbPath, db, config, workspace2) {
    this.dbPath = dbPath;
    this.db = db;
    this.config = config;
    this.workspace = workspace2;
  }
  static async open(input) {
    const opened = await openLocalPlaneDatabase(input.config);
    registerPlaneApp(opened.db, DYNASITE_APP_ID, "Dynasite");
    registerPlaneTransferSchema(opened.db, DYNASITE_APP_ID, {
      payloadSchema: DYNASITE_ARCHIVE_SCHEMA,
      displayName: "Dynasite archive transfer",
      description: "Portable prospect, site, CMS, media metadata, static bundle metadata, lead, and outreach archive records; research jobs, generation, previews, publishing, and bridge delivery stay hosted."
    });
    upsertPlaneWorkspace(opened.db, DYNASITE_APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    const store = new _LocalDynasiteStore(opened.dbPath, opened.db, input.config, input.workspace);
    store.ensureSchema();
    return store;
  }
  close() {
    this.db.close();
  }
  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dynasite_local_records (
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        business_id TEXT,
        site_id TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, record_type, record_id)
      );

      CREATE INDEX IF NOT EXISTS idx_dynasite_local_records_business
        ON dynasite_local_records (workspace_id, business_id, record_type, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_dynasite_local_records_site
        ON dynasite_local_records (workspace_id, site_id, record_type, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_dynasite_local_records_type
        ON dynasite_local_records (workspace_id, record_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS dynasite_local_projections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        site_id TEXT NOT NULL,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dynasite_local_projections_workspace_scope
        ON dynasite_local_projections (workspace_id, scope, updated_at DESC);
    `);
  }
  count(type) {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM dynasite_local_records WHERE workspace_id = ? AND record_type = ?").get(this.workspace.workspaceId, type);
    return row?.count ?? 0;
  }
  counts() {
    return Object.fromEntries(RECORD_TYPES.map((type) => [COUNT_FIELDS[type], this.count(type)]));
  }
  projectionCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM dynasite_local_projections WHERE workspace_id = ?").get(this.workspace.workspaceId);
    return row?.count ?? 0;
  }
  info() {
    const inventory = getLocalPlaneInventory(this.db, { appId: DYNASITE_APP_ID });
    return {
      dbPath: this.dbPath,
      workspaceId: this.workspace.workspaceId,
      ...this.counts(),
      projectionCount: this.projectionCount(),
      localArchive: "enabled",
      researchJobsLocal: false,
      sourceCrawlingLocal: false,
      generationLocal: false,
      previewHostingLocal: false,
      publishingLocal: false,
      staticBundleBytesLocal: false,
      emdashProvisioningLocal: false,
      leadForwardingLocal: false,
      bridgeDeliveryLocal: false,
      planeAppCount: inventory.counts.apps,
      planeWorkspaceCount: inventory.counts.workspaces,
      transferSchemaCount: inventory.counts.transferSchemas,
      transferCount: inventory.counts.transfers,
      aiJobCount: inventory.counts.aiJobs
    };
  }
  listRecords(type, filterId) {
    let rows;
    if (filterId && (BUSINESS_SCOPED_TYPES.has(type) || type === "sites")) {
      rows = this.db.prepare(
        "SELECT * FROM dynasite_local_records WHERE workspace_id = ? AND record_type = ? AND business_id = ? ORDER BY updated_at DESC"
      ).all(this.workspace.workspaceId, type, filterId);
    } else if (filterId && SITE_SCOPED_TYPES.has(type)) {
      rows = this.db.prepare(
        "SELECT * FROM dynasite_local_records WHERE workspace_id = ? AND record_type = ? AND site_id = ? ORDER BY updated_at DESC"
      ).all(this.workspace.workspaceId, type, filterId);
    } else {
      rows = this.db.prepare("SELECT * FROM dynasite_local_records WHERE workspace_id = ? AND record_type = ? ORDER BY updated_at DESC").all(this.workspace.workspaceId, type);
    }
    return rows.map(rowPayload);
  }
  getRecord(type, id) {
    const row = this.db.prepare(
      "SELECT * FROM dynasite_local_records WHERE workspace_id = ? AND record_type = ? AND record_id = ? LIMIT 1"
    ).get(this.workspace.workspaceId, type, id);
    return row ? rowPayload(row) : null;
  }
  upsertRecord(type, input) {
    const id = readRecordId(input, type);
    const existing = this.getRecord(type, id) ?? void 0;
    const record = normalizePayloadRecord(input, type, this.workspace.workspaceId, existing);
    this.db.prepare(
      `INSERT INTO dynasite_local_records (
          record_type, record_id, workspace_id, business_id, site_id, payload_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
          business_id = excluded.business_id,
          site_id = excluded.site_id,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at`
    ).run(
      type,
      record.id,
      this.workspace.workspaceId,
      record.businessId,
      record.siteId,
      JSON.stringify(record.payload),
      record.createdAt,
      record.updatedAt
    );
    return record.payload;
  }
  getSiteProjection(projectionId) {
    const row = this.db.prepare("SELECT published_at, revoked_at FROM dynasite_local_projections WHERE workspace_id = ? AND id = ? LIMIT 1").get(this.workspace.workspaceId, projectionId);
    return row ?? null;
  }
  buildSiteProjectionEnvelope(input) {
    const site = this.getRecord("sites", input.siteId);
    if (!site) throw new Error(`Local Dynasite site archive record not found: ${input.siteId}`);
    const businessId = readOptionalString(site.businessId ?? site.business_id);
    const projectionId = stableSiteProjectionId({
      workspaceId: this.workspace.workspaceId,
      siteId: input.siteId
    });
    const existing = this.getSiteProjection(projectionId);
    const now = isoNow3();
    const publishedAt = existing?.published_at ?? now;
    const revokedAt = input.action === "revoke" ? now : null;
    const business = businessId ? this.getRecord("businesses", businessId) : null;
    return {
      version: 1,
      appId: DYNASITE_APP_ID,
      event: {
        type: input.action === "publish" ? "dynasite.site.projection.upserted" : "dynasite.site.projection.revoked",
        workspaceId: this.workspace.workspaceId,
        projection: {
          id: projectionId,
          scope: "site-summary",
          siteId: input.siteId,
          publishedByUserId: input.publishedByUserId,
          publishedByEmail: input.publishedByEmail,
          publishedAt,
          revokedAt
        },
        site: {
          id: input.siteId,
          status: optionalPayloadString(site, "status"),
          publishStatus: optionalPayloadString(site, "publishStatus") ?? optionalPayloadString(site, "publish_status"),
          createdOn: dateOnly(site.createdAt ?? site.created_at),
          updatedOn: dateOnly(site.updatedAt ?? site.updated_at)
        },
        summary: {
          workspaceId: this.workspace.workspaceId,
          siteId: input.siteId,
          hasBusinessRecord: Boolean(business),
          intelPackageCount: businessId ? this.listRecords("intelPackages", businessId).length : 0,
          sourceSiteCount: businessId ? this.listRecords("sourceSites", businessId).length : 0,
          cmsDraftCount: this.listRecords("cmsDrafts", input.siteId).length,
          revisionCount: this.listRecords("revisions", input.siteId).length,
          publicationCount: this.listRecords("publications", input.siteId).length,
          mediaItemCount: this.listRecords("media", input.siteId).length,
          staticBundleCount: this.listRecords("staticBundles", input.siteId).length,
          leadCount: this.listRecords("leads", input.siteId).length,
          outreachCount: businessId ? this.listRecords("outreach", businessId).length : 0
        },
        exclusions: [
          "business names and prospect contact details",
          "business URLs, addresses, phone numbers, and email addresses",
          "research notes and intel package bodies",
          "source-site URLs and scraped/source text",
          "generated CMS copy and structured page content",
          "site slugs, preview URLs, live URLs, and public route paths",
          "media URLs, media metadata, and media bytes",
          "static bundle paths, file names, byte payloads, and hashes",
          "lead names, email addresses, messages, and exact submission times",
          "outreach message bodies and delivery state details",
          "Emdash provisioning state and Cloudflare resource identifiers",
          "Mere bridge payloads and callback tokens",
          "raw local archive rows",
          "transfer bundle payloads"
        ]
      }
    };
  }
  recordSiteProjection(envelope) {
    const now = isoNow3();
    this.db.prepare(
      `INSERT INTO dynasite_local_projections (
          id, workspace_id, scope, site_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          scope = excluded.scope,
          site_id = excluded.site_id,
          published_at = excluded.published_at,
          revoked_at = excluded.revoked_at,
          payload_json = excluded.payload_json,
          last_projected_at = excluded.last_projected_at,
          updated_at = excluded.updated_at`
    ).run(
      envelope.event.projection.id,
      this.workspace.workspaceId,
      envelope.event.projection.scope,
      envelope.event.projection.siteId,
      envelope.event.projection.publishedAt,
      envelope.event.projection.revokedAt,
      JSON.stringify(envelope),
      now,
      now
    );
  }
  exportPayload() {
    return {
      kind: DYNASITE_ARCHIVE_SCHEMA,
      version: 1,
      businesses: this.listRecords("businesses"),
      sites: this.listRecords("sites"),
      intelPackages: this.listRecords("intelPackages"),
      sourceSites: this.listRecords("sourceSites"),
      cmsDrafts: this.listRecords("cmsDrafts"),
      revisions: this.listRecords("revisions"),
      publications: this.listRecords("publications"),
      media: this.listRecords("media"),
      staticBundles: this.listRecords("staticBundles"),
      leads: this.listRecords("leads"),
      outreach: this.listRecords("outreach")
    };
  }
  exportBundle() {
    const payload = this.exportPayload();
    const bundle = createPlaneTransferBundle({
      appId: DYNASITE_APP_ID,
      workspaceId: this.workspace.workspaceId,
      plane: this.config,
      payloadSchema: DYNASITE_ARCHIVE_SCHEMA,
      payload
    });
    recordPlaneTransfer(this.db, {
      appId: DYNASITE_APP_ID,
      workspaceId: this.workspace.workspaceId,
      direction: "export",
      source: { data: this.config.data, ai: this.config.ai },
      payloadSchema: DYNASITE_ARCHIVE_SCHEMA,
      payloadSha256: bundle.payloadSha256
    });
    return bundle;
  }
  importPlan(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: DYNASITE_APP_ID,
      payloadSchema: DYNASITE_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    return createPlaneTransferImportPlan({
      appId: bundle?.appId ?? DYNASITE_APP_ID,
      workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
      payloadSchema: bundle?.payloadSchema ?? DYNASITE_ARCHIVE_SCHEMA,
      payload: normalized,
      bundle,
      destination: { data: this.config.data, ai: this.config.ai }
    });
  }
  importValue(value) {
    const { payload, bundle } = unwrapPlaneTransferPayload(value, {
      appId: DYNASITE_APP_ID,
      payloadSchema: DYNASITE_ARCHIVE_SCHEMA
    });
    const normalized = normalizePayload(payload, this.workspace.workspaceId);
    this.db.exec("BEGIN");
    try {
      for (const type of RECORD_TYPES) {
        for (const record of normalized[type]) this.upsertRecord(type, record);
      }
      const source = bundle?.source;
      const transferId = recordPlaneTransfer(this.db, {
        appId: DYNASITE_APP_ID,
        workspaceId: this.workspace.workspaceId,
        direction: "import",
        source,
        destination: { data: this.config.data, ai: this.config.ai },
        payloadSchema: bundle?.payloadSchema ?? DYNASITE_ARCHIVE_SCHEMA,
        payloadSha256: bundle?.payloadSha256 ?? hashPlanePayload(normalized)
      });
      this.db.exec("COMMIT");
      return {
        ok: true,
        dataPlane: "local",
        workspaceId: this.workspace.workspaceId,
        ...this.counts(),
        transferId,
        researchJobsLocal: false,
        generationLocal: false,
        previewHostingLocal: false,
        publishingLocal: false
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
};

// cli/local-plane.ts
var HOSTED_BOUNDARY = "Dynasite research jobs, source crawling, OpenRouter/Dunes generation, Emdash provisioning, preview hosting, public publishing, static bundle bytes, lead forwarding, Mere bridge delivery, and the Business projection receiver remain Cloudflare-owned.";
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
function resolveDynasitePlaneConfig(options, io) {
  return resolvePlaneConfigInspection({
    appId: DYNASITE_APP_ID,
    env: io.env,
    data: asString(options.store),
    ai: asString(options.ai),
    localDbPath: asString(options["local-db"])
  });
}
function isLocalDataRoute(options, io) {
  return resolveDynasitePlaneConfig(options, io).data === "local";
}
function hostedDynasiteBoundary() {
  return HOSTED_BOUNDARY;
}
function localWorkspace(options, io) {
  const workspaceId = trimOption(asString(options.workspace)) ?? trimOption(io.env.MERE_DYNASITE_WORKSPACE_ID) ?? trimOption(io.env.DYNASITE_WORKSPACE_ID) ?? trimOption(io.env.MERE_WORKSPACE_ID) ?? trimOption(io.env.MERE_WORKSPACE) ?? "personal";
  return {
    workspaceId,
    slug: workspaceId,
    name: workspaceId === "personal" ? "Personal Dynasite Archive" : workspaceId
  };
}
function projectionActor(options, io) {
  return {
    publishedByUserId: trimOption(asString(options["published-by-user-id"])) ?? trimOption(io.env.MERE_DYNASITE_USER_ID) ?? trimOption(io.env.DYNASITE_USER_ID) ?? trimOption(io.env.USER) ?? "local-user",
    publishedByEmail: trimOption(asString(options["published-by-email"])) ?? trimOption(io.env.MERE_DYNASITE_USER_EMAIL) ?? trimOption(io.env.DYNASITE_USER_EMAIL) ?? trimOption(io.env.EMAIL) ?? null
  };
}
async function openLocalStore(options, io) {
  const config = resolveDynasitePlaneConfig(options, io);
  if (config.data !== "local") {
    throw new Error("This command requires --store local so Dynasite local data stays explicit.");
  }
  return LocalDynasiteStore.open({
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
  const raw = file ? await readFile(file, "utf8") : inline ?? "{}";
  return readObject(parseJsonText(raw, file ? `--data-file ${file}` : "--data"), file ? "--data-file" : "--data");
}
function archiveCounts(payload) {
  return Object.fromEntries(
    [
      ["businesses", "businessCount"],
      ["sites", "siteCount"],
      ["intelPackages", "intelPackageCount"],
      ["sourceSites", "sourceSiteCount"],
      ["cmsDrafts", "cmsDraftCount"],
      ["revisions", "revisionCount"],
      ["publications", "publicationCount"],
      ["media", "mediaCount"],
      ["staticBundles", "staticBundleCount"],
      ["leads", "leadCount"],
      ["outreach", "outreachCount"]
    ].map(([key, label]) => [label, Array.isArray(payload[key]) ? payload[key].length : 0])
  );
}
async function handleLocalStoreInfo(options, io) {
  const config = resolveDynasitePlaneConfig(options, io);
  if (config.data === "local") {
    return withLocalStore(options, io, (store) => ({
      ok: true,
      app: DYNASITE_APP_ID,
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
      app: DYNASITE_APP_ID,
      store: config.data,
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      blended: config.blended,
      dbPath: config.localDbPath,
      localArchive: "available",
      researchJobsLocal: false,
      sourceCrawlingLocal: false,
      generationLocal: false,
      previewHostingLocal: false,
      publishingLocal: false,
      staticBundleBytesLocal: false,
      emdashProvisioningLocal: false,
      leadForwardingLocal: false,
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
    `Dynasite archives can be stored locally with --store local. Prospect records, generated-site metadata, CMS drafts, static bundle metadata, leads, and outreach records are portable. ${HOSTED_BOUNDARY}
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
async function handleLocalImport(options, io) {
  return withLocalStore(options, io, async (store) => {
    const value = parseJsonText(await readFile(readRequired(options, "file"), "utf8"), "local Dynasite archive transfer bundle");
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
    if (type === "sites" && (normalizedAction === "publish" || normalizedAction === "revoke")) {
      const siteId = trimOption(args[0]) ?? trimOption(asString(options["site-id"]));
      if (!siteId) throw new Error(`sites ${normalizedAction} requires <site-id> or --site-id <id>.`);
      const envelope = store.buildSiteProjectionEnvelope({
        action: normalizedAction,
        siteId,
        ...projectionActor(options, io)
      });
      if (asBoolean(options["dry-run"])) {
        let receiverUrl;
        try {
          receiverUrl = resolveCloudProjectionTarget({
            appId: DYNASITE_APP_ID,
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
        appId: DYNASITE_APP_ID,
        env: io.env,
        receiverUrl: trimOption(asString(options["projection-url"])),
        bearerToken: trimOption(asString(options["projection-token"])),
        event: envelope,
        fetchImpl: async (input, init) => (io.fetchImpl ?? fetch)(input, init)
      });
      store.recordSiteProjection(envelope);
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
    throw new Error(`--store local supports ${type} list/get/show/upsert${type === "sites" ? "/publish/revoke" : ""} only. ${HOSTED_BOUNDARY}`);
  });
}

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d8a7e4e697715c4418477c3ed91e9ced/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "child_process";
import { createServer } from "http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d8a7e4e697715c4418477c3ed91e9ced/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d8a7e4e697715c4418477c3ed91e9ced/node_modules/@mere/cli-auth/src/session.ts
import { chmod, mkdir as mkdir3, readFile as readFile2, rm, writeFile as writeFile2 } from "fs/promises";
import os3 from "os";
import path3 from "path";
function stateHome2(env) {
  const homeDir = env.HOME?.trim() || os3.homedir();
  return env.XDG_STATE_HOME?.trim() || path3.join(homeDir, ".local", "state");
}
function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function resolveCliPaths(appName, env = process.env) {
  const stateDir = path3.join(stateHome2(env), appName);
  return {
    stateDir,
    sessionFile: path3.join(stateDir, "session.json")
  };
}
async function loadCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    try {
      const raw = await readFile2(paths.sessionFile, "utf8");
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
  await mkdir3(paths.stateDir, { recursive: true });
  await writeFile2(paths.sessionFile, `${JSON.stringify(input.session, null, 2)}
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
    (workspace2) => workspace2.id.toLowerCase() === normalized || workspace2.slug.toLowerCase() === normalized || workspace2.host.toLowerCase() === normalized
  ) ?? null;
}
function requireWorkspaceSelection(workspaces, selector) {
  const workspace2 = resolveWorkspaceSelection(workspaces, selector);
  if (!workspace2) {
    throw new Error(`Workspace ${selector ?? "(missing)"} is not available in this session.`);
  }
  return workspace2;
}
function sessionNeedsRefresh(session, targetWorkspaceId, now = Date.now()) {
  const currentWorkspaceId = session.workspace?.id ?? null;
  if ((targetWorkspaceId ?? null) !== currentWorkspaceId) {
    return true;
  }
  const expiresAtMs = session.accessTokenClaims.exp * 1e3 || Date.parse(session.expiresAt);
  return !Number.isFinite(expiresAtMs) || expiresAtMs - now <= 6e4;
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_d8a7e4e697715c4418477c3ed91e9ced/node_modules/@mere/cli-auth/src/client.ts
async function parseJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message = payload && typeof payload === "object" ? payload.error ?? payload.message ?? `Request failed (${response.status}).` : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}
async function postJson(fetchImpl2, input, body) {
  return parseJson(
    await fetchImpl2(input, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}
async function refreshRemoteSession(input) {
  const refreshUrl = new URL(CLI_AUTH_REFRESH_PATH, normalizeBaseUrl(input.baseUrl));
  return postJson(input.fetchImpl ?? fetch, refreshUrl, {
    refreshToken: input.refreshToken,
    workspace: input.workspace ?? null
  });
}

// cli/mere-dynasite.ts
var DEFAULT_BASE_URL = "https://sites.merekit.com";
var APP_NAME = "mere-dynasite";
var activeSession = null;
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set(["discover", "dry-run", "e2e", "help", "json", "version", "yes"]);
var VALUE_FLAGS = /* @__PURE__ */ new Set([
  "action",
  "alt",
  "ai",
  "base-url",
  "business-base-url",
  "bundle-id",
  "confirm",
  "cookie",
  "data",
  "data-file",
  "e2e-token",
  "edit-json",
  "entry-path",
  "environment",
  "file",
  "item-json",
  "limit",
  "local-db",
  "output",
  "projection-token",
  "projection-url",
  "published-by-email",
  "published-by-user-id",
  "role",
  "site-id",
  "source",
  "source-dir",
  "status",
  "store",
  "target-index",
  "title",
  "token",
  "workspace",
  "zip"
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
};
var HttpError = class extends CliError {
  constructor(message, status) {
    super(message, status === 401 || status === 403 ? 3 : 1);
    this.status = status;
    this.name = "HttpError";
  }
};
function manifestCommand(path4, summary, options = {}) {
  return {
    id: path4.join("."),
    path: path4,
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
var COMMAND_MANIFEST = {
  schemaVersion: 1,
  app: "mere-dynasite",
  namespace: "dynasite",
  aliases: ["dynasite", "mere-dynasite", "sites"],
  auth: { kind: "mixed" },
  baseUrlEnv: ["DYNASITE_BASE_URL", "MERE_DYNASITE_BASE_URL"],
  sessionPath: "~/.local/state/mere-dynasite/session.json",
  globalFlags: [
    "base-url",
    "business-base-url",
    "workspace",
    "json",
    "token",
    "cookie",
    "e2e-token",
    "e2e",
    "store",
    "ai",
    "local-db"
  ],
  commands: [
    manifestCommand(["commands"], "Print the machine-readable Dynasite command manifest.", {
      auth: "none",
      flags: []
    }),
    manifestCommand(["completion"], "Print shell completion for mere-dynasite.", {
      auth: "none",
      supportsJson: false,
      positionals: ["shell"]
    }),
    manifestCommand(["about"], "Show Dynasite CLI and service metadata.", {
      auth: "none",
      flags: [],
      auditDefault: true
    }),
    manifestCommand(["status"], "Show Dynasite app and session status.", {
      auth: "none",
      flags: [],
      auditDefault: true
    }),
    manifestCommand(["store", "info"], "Inspect Dynasite local/cloud data and AI plane selection.", {
      auth: "none",
      flags: [],
      auditDefault: true
    }),
    manifestCommand(["export"], "Export local Dynasite archive records as a portable transfer bundle.", {
      auth: "workspace",
      risk: "read",
      flags: ["output"]
    }),
    manifestCommand(["import"], "Import a local Dynasite archive transfer bundle.", {
      auth: "workspace",
      risk: "write",
      flags: ["file", "dry-run"]
    }),
    manifestCommand(["businesses", "upsert"], "Upsert a local business research record.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["sites", "upsert"], "Upsert a local generated-site record.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["source-sites", "upsert"], "Upsert a local source-site snapshot record.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["cms", "upsert"], "Upsert a local CMS draft record.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["bundles", "upsert"], "Upsert local static bundle metadata.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["leads", "upsert"], "Upsert a local lead or inquiry record.", {
      auth: "workspace",
      risk: "write",
      supportsData: true,
      flags: []
    }),
    manifestCommand(["auth", "whoami"], "Show the current Dynasite session user.", {
      flags: []
    }),
    manifestCommand(["auth", "agent-login"], "Create a Dynasite session from a Business agent session.", {
      auth: "none",
      risk: "write",
      flags: ["workspace", "business-base-url", "base-url"]
    }),
    manifestCommand(["auth", "logout"], "Clear the local Dynasite CLI session.", {
      risk: "write",
      flags: []
    }),
    manifestCommand(["businesses", "list"], "List researched business requests.", {
      flags: ["status", "limit"],
      auditDefault: false
    }),
    manifestCommand(["sites", "list"], "List generated Dynasite sites.", {
      flags: ["status", "limit"],
      auditDefault: false
    }),
    manifestCommand(["sites", "get"], "Show one generated Dynasite site.", {
      flags: ["site-id"],
      positionals: ["siteId"],
      auditDefault: false
    }),
    manifestCommand(["sites", "cms", "get"], "Show one site CMS draft and generation payload.", {
      flags: ["site-id"],
      positionals: ["siteId"],
      auditDefault: false
    }),
    manifestCommand(["sites", "cms", "edit"], "Apply a JSON CMS edit to a site draft.", {
      risk: "write",
      flags: ["site-id", "edit-json", "source"],
      supportsData: false
    }),
    manifestCommand(["sites", "cms", "assist"], "Ask Dynasite for a CMS assist patch.", {
      risk: "write",
      flags: ["site-id", "action", "target-index"]
    }),
    manifestCommand(["sites", "media", "import"], "Import source-site or explicit media URLs.", {
      risk: "write",
      flags: ["site-id", "discover", "item-json"],
      supportsData: false
    }),
    manifestCommand(["sites", "media", "upload"], "Upload one local image or video to a site draft.", {
      risk: "write",
      flags: ["site-id", "file", "alt", "role"]
    }),
    manifestCommand(["sites", "revisions", "list"], "List site CMS revisions.", {
      flags: ["site-id"]
    }),
    manifestCommand(["sites", "revisions", "revert"], "Revert a site CMS revision.", {
      risk: "write",
      flags: ["site-id"],
      positionals: ["revisionId"]
    }),
    manifestCommand(["sites", "publish"], "Publish a hosted site URL, or with --store local project a selected site summary to Business.", {
      risk: "external",
      requiresYes: true,
      flags: ["site-id", "environment", "projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"]
    }),
    manifestCommand(["sites", "revoke"], "Revoke a selected local Dynasite site summary from Business.", {
      auth: "workspace",
      risk: "external",
      flags: ["site-id", "projection-url", "projection-token", "published-by-user-id", "published-by-email", "dry-run"],
      positionals: ["siteId"]
    }),
    manifestCommand(["sites", "bundle", "upload"], "Upload a static site bundle from a directory or zip.", {
      risk: "write",
      flags: ["site-id", "source-dir", "zip", "title", "entry-path"]
    }),
    manifestCommand(["sites", "bundle", "status"], "List static site bundles for a site.", {
      flags: ["site-id"]
    }),
    manifestCommand(["sites", "bundle", "publish"], "Publish a static site bundle to preview or live.", {
      risk: "external",
      requiresYes: true,
      flags: ["site-id", "bundle-id", "environment"]
    }),
    manifestCommand(["sites", "bundle", "rollback"], "Roll back to a previous static site bundle.", {
      risk: "external",
      requiresYes: true,
      flags: ["site-id", "bundle-id", "environment"]
    }),
    manifestCommand(["outreach", "list"], "List outreach records.", {
      flags: ["status", "limit"],
      auditDefault: false
    })
  ]
};
async function cliVersion() {
  const { readFile: readFile3 } = await import("fs/promises");
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
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
  return flag(parsed, "base-url")?.trim() ?? envValue(ctx.env, ["DYNASITE_BASE_URL", "MERE_DYNASITE_BASE_URL"]) ?? activeSession?.baseUrl ?? DEFAULT_BASE_URL;
}
function normalizeBaseUrl2(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function authToken(parsed, ctx) {
  return flag(parsed, "token")?.trim() || envValue(ctx.env, ["DYNASITE_SESSION_TOKEN", "MERE_DYNASITE_SESSION_TOKEN"]) || activeSession?.accessToken;
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
function sessionEnv(ctx) {
  return ctx.env;
}
async function loadStoredSession(ctx) {
  activeSession = await loadCliSession({ appName: APP_NAME, env: sessionEnv(ctx) });
  return activeSession;
}
async function saveStoredSession(ctx, session) {
  await saveCliSession({ appName: APP_NAME, session, env: sessionEnv(ctx) });
  activeSession = session;
}
async function clearStoredSession(ctx) {
  await clearCliSession({ appName: APP_NAME, env: sessionEnv(ctx) });
  activeSession = null;
}
function sessionFilePath(ctx) {
  return resolveCliPaths(APP_NAME, sessionEnv(ctx)).sessionFile;
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
    throw new CliError("Mere Business did not return a Dynasite base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new CliError("Mere Business did not return a Dynasite CLI session.");
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
async function loadRefreshedBusinessSession(parsed, ctx) {
  const current = await loadCliSession({ appName: "mere-business", env: sessionEnv(ctx) });
  if (!current) {
    throw new CliError(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first.",
      2
    );
  }
  const selectedWorkspace = selectBusinessWorkspace(current, workspace(parsed, ctx));
  const businessBaseUrl = normalizeBaseUrl2(flag(parsed, "business-base-url") ?? current.baseUrl);
  if (!sessionNeedsRefresh(current, selectedWorkspace.id)) {
    return { session: current, workspace: selectedWorkspace, baseUrl: businessBaseUrl };
  }
  const payload = await refreshRemoteSession({
    baseUrl: businessBaseUrl,
    refreshToken: current.refreshToken,
    workspace: selectedWorkspace.id,
    fetchImpl: fetchImpl(ctx)
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl: businessBaseUrl,
    persistDefaultWorkspace: false
  });
  await saveCliSession({ appName: "mere-business", session, env: sessionEnv(ctx) });
  return {
    session,
    workspace: session.workspace ?? selectedWorkspace,
    baseUrl: businessBaseUrl
  };
}
function renderCliSession(session, ctx) {
  const selectedWorkspace = session.workspace ?? session.workspaces.find((candidate) => candidate.id === session.defaultWorkspaceId) ?? null;
  return [
    `Signed in as ${session.user.displayName || session.user.primaryEmail || session.user.email}`,
    `Base URL: ${session.baseUrl}`,
    `Workspace: ${selectedWorkspace ? selectedWorkspace.slug : "none"}`,
    `Workspaces: ${session.workspaces.length}`,
    `Session file: ${sessionFilePath(ctx)}`,
    `Expires: ${session.expiresAt}`
  ].join("\n");
}
async function fetchJson(parsed, ctx, path4, options = {}) {
  const url = new URL(path4, normalizeBaseUrl2(baseUrl(parsed, ctx)));
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
  if (positionals[0] === "store" && positionals[1] === "info") return "store info";
  if (positionals[0] === "export") return "export";
  if (positionals[0] === "import") return "import";
  if (positionals[0] === "businesses" && positionals.length === 1) return "businesses list";
  if (positionals[0] === "sites" && positionals.length === 1) return "sites list";
  if (positionals[0] === "sites" && positionals[1] === "get") return "sites get";
  if (positionals[0] === "sites" && positionals[1] === "cms") return `sites cms ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "media") return `sites media ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "revisions") return `sites revisions ${positionals[2] ?? ""}`.trim();
  if (positionals[0] === "sites" && positionals[1] === "publish") return "sites publish";
  if (positionals[0] === "sites" && positionals[1] === "revoke") return "sites revoke";
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
function printJsonError(ctx, message, exitCode2 = 1) {
  ctx.stdout(JSON.stringify({
    ok: false,
    error: {
      code: message.includes("No local Mere Business session") ? "auth_error" : "cli_error",
      message
    }
  }, null, 2) + "\n");
  return exitCode2;
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
  const { readdir, readFile: readFile3, stat } = await import("fs/promises");
  const title = flag(parsed, "title") ?? null;
  const entryPath = flag(parsed, "entry-path") ?? "index.html";
  const zip = flag(parsed, "zip");
  const sourceDir = flag(parsed, "source-dir");
  if (zip && sourceDir) throw new CliError("Use either --source-dir or --zip, not both.", 2);
  if (zip) {
    const data = await readFile3(zip);
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
      const path4 = safeBundlePath(relative(root, absolute));
      const data = await readFile3(absolute);
      files.push({
        path: path4,
        contentType: inferContentType(path4),
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
async function postFormJson(parsed, ctx, path4, formData, options = {}) {
  const url = new URL(path4, normalizeBaseUrl2(baseUrl(parsed, ctx)));
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
    auth agent-login          Create CLI session from Mere Business agent session
    auth logout               Clear local CLI session
    businesses list          List business research records
    sites list               List generated sites
    sites get --site-id ID    Show one generated site payload
    sites cms get/edit/assist Manage editable CMS drafts
    sites media import/upload Import URLs or upload local media
    sites revisions list/revert
    sites publish             Publish preview/live, or local site summary projection
    sites revoke              Revoke local site summary projection from Business
    sites bundle upload       Upload static HTML/CSS/JS/assets from R2-backed bundle
    sites bundle status|publish|rollback
    outreach list            List outreach records
    store info               Inspect local/cloud data and AI plane selection
    export --output FILE      Export local Dynasite archive transfer bundle
    import --file FILE        Import local Dynasite archive transfer bundle
    businesses/sites/... upsert --data JSON
                             Upsert local archive records with --store local
    commands --json          Print command manifest JSON
    completion [bash|zsh|fish]

  Flags:
    --base-url <url>         Override API base
    --business-base-url <url> Override Mere Business for browserless agent login
    --workspace <id>         Forward workspace context as x-mere-workspace
    --store local|cloud      Choose supported local/cloud data-plane commands
    --ai local|cloud         Choose AI plane for local-plane inspection
    --local-db <path>        Override shared Mere local-plane SQLite path
    --json                   Machine-readable JSON output
    --data <json>            JSON payload for local archive upsert
    --data-file <file>       Read JSON payload for local archive upsert
    --output <file>          Write local archive export bundle
    --projection-url <url>    Business projection receiver for local publish/revoke
    --projection-token <tok>  Business projection bearer token
    --published-by-user-id <id>
                             Publisher id for local projection audit envelopes
    --published-by-email <email>
                             Publisher email for local projection audit envelopes
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

  Local plane:
    --store local currently supports archive metadata commands:
    businesses/sites/intel/source-sites/cms/revisions/publications/media/
    bundles/leads/outreach list|get|show|upsert, sites publish/revoke,
    plus store info, export, and import. Research jobs, source crawling, generation, Emdash
    provisioning, preview hosting, public publishing, static bundle bytes,
    lead forwarding, bridge delivery, and Business projection receiving remain hosted.

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
    auth: ["agent-login", "logout", "whoami"],
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
    baseUrl: normalizeBaseUrl2(baseUrl(parsed, ctx)),
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
    baseUrl: normalizeBaseUrl2(baseUrl(parsed, ctx)),
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
async function cmdAgentLogin(parsed, ctx) {
  const business = await loadRefreshedBusinessSession(parsed, ctx);
  const response = await fetchImpl(ctx)(
    new URL("/api/cli/v1/auth/product-sessions", business.baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${business.session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        app: "dynasite",
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
    baseUrl: normalizeBaseUrl2(flag(parsed, "base-url") ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveStoredSession(ctx, session);
  if (boolFlag(parsed, "json")) {
    return printJson(ctx, {
      ok: true,
      user: session.user,
      baseUrl: session.baseUrl,
      workspace: session.workspace,
      workspaces: session.workspaces
    });
  }
  ctx.stdout(`${renderCliSession(session, ctx)}
`);
  return 0;
}
async function cmdAuthLogout(parsed, ctx) {
  const hadSession = Boolean(activeSession ?? await loadStoredSession(ctx));
  await clearStoredSession(ctx);
  if (boolFlag(parsed, "json")) {
    return printJson(ctx, { ok: true, loggedOut: hadSession });
  }
  ctx.stdout(hadSession ? "Logged out.\n" : "No local session found.\n");
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
  const { readFile: readFile3 } = await import("fs/promises");
  const data = await readFile3(file);
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
function localPlaneIo(ctx) {
  return {
    env: ctx.env,
    fetchImpl: ctx.fetchImpl,
    stdout: (text) => {
      ctx.stdout(text);
    }
  };
}
function writeLocalResult(ctx, parsed, result) {
  if (result === "" || result === void 0) return;
  if (boolFlag(parsed, "json")) {
    ctx.stdout(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  if (typeof result === "string") {
    ctx.stdout(result);
    return;
  }
  ctx.stdout(JSON.stringify(result, null, 2) + "\n");
}
function localRecordType(group) {
  switch (group) {
    case "business":
    case "businesses":
      return "businesses";
    case "site":
    case "sites":
      return "sites";
    case "intel":
    case "intel-packages":
      return "intelPackages";
    case "source-site":
    case "source-sites":
      return "sourceSites";
    case "cms":
    case "draft":
    case "drafts":
      return "cmsDrafts";
    case "revision":
    case "revisions":
      return "revisions";
    case "publication":
    case "publications":
      return "publications";
    case "media":
      return "media";
    case "bundle":
    case "bundles":
    case "static-bundle":
    case "static-bundles":
      return "staticBundles";
    case "lead":
    case "leads":
    case "inquiry":
    case "inquiries":
      return "leads";
    case "outreach":
      return "outreach";
    default:
      return null;
  }
}
async function handleLocalDataCommand(parsed, ctx) {
  const [group, command, ...rest] = parsed.positionals;
  const io = localPlaneIo(ctx);
  const localData = isLocalDataRoute(parsed.flags, io);
  let result;
  if (group === "store") {
    if (command !== "info") throw new CliError("Unknown store command: expected info.", 2);
    result = await handleLocalStoreInfo(parsed.flags, io);
  } else if (group === "export") {
    result = await handleLocalExport(parsed.flags, io);
  } else if (group === "import") {
    result = await handleLocalImport(parsed.flags, io);
  } else if (localData) {
    if (group === "sites" && command === "bundle") {
      throw new CliError(
        `--store local is not supported for sites bundle commands. ${hostedDynasiteBoundary()}`,
        1
      );
    }
    const type = localRecordType(group);
    if (!type) {
      throw new CliError(
        `--store local is not supported for ${group ?? "(missing)"}. Supported local commands are store info, businesses, sites list/get/show/upsert/publish/revoke, intel, source-sites, cms, revisions, publications, media, bundles, leads, outreach, export, and import. ${hostedDynasiteBoundary()}`,
        1
      );
    }
    result = await handleLocalRecordGroup(type, command ?? "list", rest, parsed.flags, io);
  } else {
    return false;
  }
  writeLocalResult(ctx, parsed, result);
  return true;
}
async function runCli(rawArgs, ctx) {
  let parsed;
  try {
    parsed = parseArgs(rawArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (rawArgs.includes("--json")) {
      return printJsonError(ctx, message, error instanceof CliError ? error.exitCode : 1);
    }
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
    await loadStoredSession(ctx);
    if (await handleLocalDataCommand(parsed, ctx)) return 0;
    switch (key) {
      case "about":
        return printAbout(parsed, ctx);
      case "status":
        return await cmdStatus(parsed, ctx);
      case "auth whoami":
        return await cmdWhoami(parsed, ctx);
      case "auth agent-login":
        return await cmdAgentLogin(parsed, ctx);
      case "auth logout":
        return await cmdAuthLogout(parsed, ctx);
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
    if (boolFlag(parsed, "json") && key === "auth agent-login") {
      return printJsonError(ctx, message, error instanceof CliError ? error.exitCode : 1);
    }
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
