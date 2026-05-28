#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/migration.ts
import { createHash, randomUUID } from "node:crypto";
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
var PLANE_TRANSFER_KIND, PLANE_TRANSFER_VERSION;
var init_migration = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/migration.ts"() {
    PLANE_TRANSFER_KIND = "mere.local-plane.transfer";
    PLANE_TRANSFER_VERSION = 1;
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/projection.ts
var init_projection = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/projection.ts"() {
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
var init_config = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts"() {
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
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
function envPrefix(appId) {
  return appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}
function normalizeMode(value, label) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return void 0;
  if (normalized === "cloud" || normalized === "local") return normalized;
  throw new Error(`${label} must be cloud or local.`);
}
function defaultLocalPlaneDbPath(env = process.env) {
  return path.join(stateHome(env), "mere", "local-plane.db");
}
function resolveLocalPlaneDbPath(input = {}) {
  const env = input.env ?? process.env;
  const prefix = input.appId ? envPrefix(input.appId) : "";
  const configured = input.localDbPath ?? (prefix ? env[`${prefix}_LOCAL_DB`] : void 0) ?? (prefix ? env[`${prefix}_LOCAL_PLANE_DB`] : void 0) ?? env.MERE_LOCAL_DB ?? env.MERE_LOCAL_PLANE_DB;
  return path.resolve(configured?.trim() ? expandHome(configured, env) : defaultLocalPlaneDbPath(env));
}
function resolvePlaneConfig(input) {
  const env = input.env ?? process.env;
  const prefix = envPrefix(input.appId);
  const data = normalizeMode(input.data, "data plane") ?? normalizeMode(env[`${prefix}_DATA_PLANE`], `${prefix}_DATA_PLANE`) ?? normalizeMode(env[`${prefix}_STORE`], `${prefix}_STORE`) ?? normalizeMode(env.MERE_DATA_PLANE, "MERE_DATA_PLANE") ?? "cloud";
  const ai = normalizeMode(input.ai, "AI plane") ?? normalizeMode(env[`${prefix}_AI_PLANE`], `${prefix}_AI_PLANE`) ?? normalizeMode(env[`${prefix}_AI`], `${prefix}_AI`) ?? normalizeMode(env.MERE_AI_PLANE, "MERE_AI_PLANE") ?? "cloud";
  return {
    appId: input.appId,
    data,
    ai,
    localDbPath: resolveLocalPlaneDbPath({
      appId: input.appId,
      env,
      localDbPath: input.localDbPath
    }),
    cloudProjection: "cloudflare"
  };
}
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function json(value) {
  return JSON.stringify(value ?? {});
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
var init_src = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts"() {
    init_migration();
    init_projection();
    init_config();
  }
});

// src/lib/shared/validation.ts
function expectRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }
  return value;
}
function expectString(record, key, label) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected ${label}.${key} to be a non-empty string.`);
  }
  return value.trim();
}
function optionalString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function optionalNumber(record, key) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
var init_validation = __esm({
  "src/lib/shared/validation.ts"() {
    "use strict";
  }
});

// src/lib/shared/media.ts
function scalarString(value, label) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  throw new Error(`${label} must be a scalar value.`);
}
function optionalScalarString(value, label) {
  return value == null ? null : scalarString(value, label);
}
function isSourceType(value) {
  return SOURCE_TYPES.includes(value);
}
function normalizeSourceType(value) {
  const normalized = value.trim().toLowerCase();
  if (!isSourceType(normalized)) {
    throw new Error(`Unsupported source type: ${value}`);
  }
  return normalized;
}
function toMediaItemSummary(row) {
  return {
    id: scalarString(row.id, "media_items.id"),
    sourceId: optionalScalarString(row.source_id, "media_items.source_id"),
    title: scalarString(row.title, "media_items.title"),
    sourceType: normalizeSourceType(scalarString(row.source_type, "media_items.source_type")),
    mimeType: optionalScalarString(row.mime_type, "media_items.mime_type"),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    fileSizeBytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    storageKey: optionalScalarString(row.storage_key, "media_items.storage_key"),
    originalPath: optionalScalarString(row.original_path, "media_items.original_path"),
    transcriptStatus: scalarString(row.transcript_status ?? "missing", "media_items.transcript_status"),
    segmentCount: Number(row.segment_count ?? 0),
    createdAt: scalarString(row.created_at, "media_items.created_at"),
    updatedAt: scalarString(row.updated_at, "media_items.updated_at")
  };
}
function toTranscriptSegment(row) {
  return {
    id: scalarString(row.id, "segments.id"),
    itemId: scalarString(row.item_id, "segments.item_id"),
    startSeconds: Number(row.start_seconds),
    endSeconds: Number(row.end_seconds),
    text: scalarString(row.text, "segments.text"),
    speakerId: optionalScalarString(row.speaker_id, "segments.speaker_id")
  };
}
var SOURCE_TYPES;
var init_media = __esm({
  "src/lib/shared/media.ts"() {
    "use strict";
    init_validation();
    SOURCE_TYPES = ["file", "folder", "youtube", "audiobook", "manual-upload"];
  }
});

// src/lib/shared/api.ts
function expectBoolean(record, key, label) {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`${label}.${key} must be a boolean.`);
  }
  return value;
}
function expectNumber(record, key, label) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${key} must be a finite number.`);
  }
  return value;
}
function expectArray(record, key, label) {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`${label}.${key} must be an array.`);
  }
  return value;
}
function normalizeMediaItemSummaryResponse(value, label = "media item") {
  const record = expectRecord(value, label);
  return {
    id: expectString(record, "id", label),
    sourceId: optionalString(record, "sourceId"),
    title: expectString(record, "title", label),
    sourceType: normalizeSourceType(expectString(record, "sourceType", label)),
    mimeType: optionalString(record, "mimeType"),
    durationSeconds: optionalNumber(record, "durationSeconds"),
    fileSizeBytes: optionalNumber(record, "fileSizeBytes"),
    storageKey: optionalString(record, "storageKey"),
    originalPath: optionalString(record, "originalPath"),
    transcriptStatus: expectString(record, "transcriptStatus", label),
    segmentCount: expectNumber(record, "segmentCount", label),
    createdAt: expectString(record, "createdAt", label),
    updatedAt: expectString(record, "updatedAt", label)
  };
}
function normalizeTranscriptSegmentResponse(value, label = "transcript segment") {
  const record = expectRecord(value, label);
  return {
    id: expectString(record, "id", label),
    itemId: expectString(record, "itemId", label),
    startSeconds: expectNumber(record, "startSeconds", label),
    endSeconds: expectNumber(record, "endSeconds", label),
    text: expectString(record, "text", label),
    speakerId: optionalString(record, "speakerId")
  };
}
function normalizeSearchResultResponse(value, label = "search result") {
  const record = expectRecord(value, label);
  return {
    itemId: expectString(record, "itemId", label),
    segmentId: expectString(record, "segmentId", label),
    title: expectString(record, "title", label),
    text: expectString(record, "text", label),
    startSeconds: expectNumber(record, "startSeconds", label),
    endSeconds: expectNumber(record, "endSeconds", label),
    score: expectNumber(record, "score", label),
    speakerId: optionalString(record, "speakerId")
  };
}
function normalizeImportMediaResponse(value) {
  const record = expectRecord(value, "import response");
  return {
    ok: expectBoolean(record, "ok", "import response"),
    itemId: optionalString(record, "itemId") ?? void 0,
    jobId: optionalString(record, "jobId") ?? void 0,
    error: optionalString(record, "error") ?? void 0
  };
}
function normalizeListItemsResponse(value) {
  const record = expectRecord(value, "items response");
  return {
    ok: expectBoolean(record, "ok", "items response"),
    items: expectArray(record, "items", "items response").map(
      (item, index) => normalizeMediaItemSummaryResponse(item, `items response.items[${index.toString()}]`)
    )
  };
}
function normalizeGetItemResponse(value) {
  const record = expectRecord(value, "item response");
  return {
    ok: expectBoolean(record, "ok", "item response"),
    item: normalizeMediaItemSummaryResponse(record.item, "item response.item")
  };
}
function normalizeGetTranscriptResponse(value) {
  const record = expectRecord(value, "transcript response");
  return {
    ok: expectBoolean(record, "ok", "transcript response"),
    itemId: expectString(record, "itemId", "transcript response"),
    text: expectString(record, "text", "transcript response"),
    segments: expectArray(record, "segments", "transcript response").map(
      (segment, index) => normalizeTranscriptSegmentResponse(segment, `transcript response.segments[${index.toString()}]`)
    )
  };
}
function normalizeSaveTranscriptResponse(value) {
  const record = expectRecord(value, "save transcript response");
  return {
    ok: expectBoolean(record, "ok", "save transcript response"),
    itemId: expectString(record, "itemId", "save transcript response"),
    transcriptId: expectString(record, "transcriptId", "save transcript response"),
    segmentCount: expectNumber(record, "segmentCount", "save transcript response")
  };
}
function normalizeSaveEmbeddingsResponse(value) {
  const record = expectRecord(value, "save embeddings response");
  return {
    ok: expectBoolean(record, "ok", "save embeddings response"),
    itemId: expectString(record, "itemId", "save embeddings response"),
    jobId: expectString(record, "jobId", "save embeddings response"),
    vectorCount: expectNumber(record, "vectorCount", "save embeddings response"),
    vectorizeReady: expectBoolean(record, "vectorizeReady", "save embeddings response")
  };
}
function normalizeSearchResponse(value) {
  const record = expectRecord(value, "search response");
  return {
    ok: expectBoolean(record, "ok", "search response"),
    mode: optionalString(record, "mode") ?? void 0,
    results: expectArray(record, "results", "search response").map(
      (result, index) => normalizeSearchResultResponse(result, `search response.results[${index.toString()}]`)
    )
  };
}
var init_api = __esm({
  "src/lib/shared/api.ts"() {
    "use strict";
    init_media();
    init_validation();
  }
});

// src/lib/shared/segments.ts
function parseTimestamp(hours, minutes, seconds) {
  return (hours ? Number(hours) * 3600 : 0) + Number(minutes) * 60 + Number(seconds);
}
function parseTimestampedTranscript(itemId, transcript) {
  const parsed = [];
  for (const line of transcript.split(/\r?\n/u)) {
    const match = TIMESTAMP_RE.exec(line.trim());
    if (!match) {
      continue;
    }
    const text = match[7]?.trim() ?? "";
    if (!text) {
      continue;
    }
    parsed.push({
      itemId,
      startSeconds: parseTimestamp(match[1], match[2] ?? "0", match[3] ?? "0"),
      endSeconds: parseTimestamp(match[4], match[5] ?? "0", match[6] ?? "0"),
      text,
      speakerId: null
    });
  }
  if (parsed.length > 0) {
    return parsed;
  }
  const fallbackText = transcript.trim();
  return fallbackText ? [{ itemId, startSeconds: 0, endSeconds: 0, text: fallbackText, speakerId: null }] : [];
}
function scoreSegment(query, text) {
  const terms = query.toLowerCase().split(/\W+/u).filter((term) => term.length > 1);
  if (terms.length === 0) {
    return 0;
  }
  const haystack = text.toLowerCase();
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}
var TIMESTAMP_RE;
var init_segments = __esm({
  "src/lib/shared/segments.ts"() {
    "use strict";
    TIMESTAMP_RE = /^\[(?:(\d+):)?(\d{1,2}):(\d{2}(?:\.\d+)?)\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2}(?:\.\d+)?)\]\s*(.*)$/u;
  }
});

// cli/transfer.ts
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function expectArray2(record, key, label) {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`${label}.${key} must be an array.`);
  }
  return value;
}
function normalizeTranscript(value, label) {
  if (value == null) {
    return null;
  }
  const record = expectRecord(value, label);
  return {
    text: expectString(record, "text", label),
    model: optionalString(record, "model"),
    segments: expectArray2(record, "segments", label).map(
      (segment, index) => normalizeTranscriptSegmentResponse(segment, `${label}.segments[${index.toString()}]`)
    )
  };
}
function normalizeMediaLibraryTransferPayload(value) {
  const record = expectRecord(value, "media library transfer payload");
  if (record.version !== 1) {
    throw new Error("media library transfer payload.version must be 1.");
  }
  const exportedAt = expectString(record, "exportedAt", "media library transfer payload");
  const omitted = expectRecord(record.omitted, "media library transfer payload.omitted");
  if (omitted.embeddings !== "not-included") {
    throw new Error("media library transfer payload.omitted.embeddings must be not-included.");
  }
  return {
    version: 1,
    exportedAt,
    omitted: { embeddings: "not-included" },
    items: expectArray2(record, "items", "media library transfer payload").map((entry, index) => {
      const itemRecord = expectRecord(entry, `media library transfer payload.items[${index.toString()}]`);
      return {
        item: normalizeMediaItemSummaryResponse(
          itemRecord.item,
          `media library transfer payload.items[${index.toString()}].item`
        ),
        transcript: normalizeTranscript(
          itemRecord.transcript,
          `media library transfer payload.items[${index.toString()}].transcript`
        )
      };
    })
  };
}
async function exportMediaLibraryPayload(store) {
  const listed = await store.listItems();
  const items = [];
  for (const item of listed.items) {
    let transcript = null;
    if (item.transcriptStatus === "ready") {
      const exported = await store.getTranscript(item.id);
      transcript = {
        text: exported.text,
        model: null,
        segments: exported.segments
      };
    }
    items.push({ item, transcript });
  }
  return {
    version: 1,
    exportedAt: isoNow3(),
    omitted: { embeddings: "not-included" },
    items
  };
}
async function importMediaLibraryPayload(store, payload) {
  const items = [];
  let transcriptCount = 0;
  for (const entry of payload.items) {
    const imported = await store.importMedia({
      sourceType: entry.item.sourceType,
      title: entry.item.title,
      originalPath: entry.item.originalPath,
      mimeType: entry.item.mimeType,
      durationSeconds: entry.item.durationSeconds,
      fileSizeBytes: entry.item.fileSizeBytes,
      metadata: {
        migratedFromItemId: entry.item.id,
        migratedAt: isoNow3()
      }
    });
    if (!imported.ok || !imported.itemId) {
      throw new Error(imported.error ?? `Import failed for media item ${entry.item.id}.`);
    }
    items.push({ sourceItemId: entry.item.id, itemId: imported.itemId });
    if (entry.transcript) {
      await store.saveTranscript(imported.itemId, {
        transcriptText: entry.transcript.text,
        model: entry.transcript.model,
        segments: entry.transcript.segments.map((segment) => ({
          startSeconds: segment.startSeconds,
          endSeconds: segment.endSeconds,
          text: segment.text,
          speakerId: segment.speakerId
        }))
      });
      transcriptCount += 1;
    }
  }
  return {
    ok: true,
    itemCount: items.length,
    transcriptCount,
    items
  };
}
var MEDIA_LIBRARY_PAYLOAD_SCHEMA;
var init_transfer = __esm({
  "cli/transfer.ts"() {
    "use strict";
    init_api();
    init_validation();
    MEDIA_LIBRARY_PAYLOAD_SCHEMA = "mere.media.library.v1";
  }
});

// cli/local-store.ts
var local_store_exports = {};
__export(local_store_exports, {
  LocalMediaStore: () => LocalMediaStore,
  defaultLocalDbPath: () => defaultLocalDbPath,
  resolveLocalDbPath: () => resolveLocalDbPath
});
import { mkdir as mkdir2 } from "node:fs/promises";
import path5 from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";
import * as sqliteVec from "sqlite-vec";
function defaultLocalDbPath(env = process.env) {
  return defaultLocalPlaneDbPath(env);
}
function resolveLocalDbPath(options = {}) {
  return resolveLocalPlaneDbPath({
    appId: "mere-media",
    env: options.env,
    localDbPath: options.dbPath
  });
}
function makeId(prefix) {
  return `${prefix}_${randomUUID2().replaceAll("-", "").slice(0, 24)}`;
}
function isoNow4() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function likeValue(value) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}
function vectorJson(values) {
  return JSON.stringify(values);
}
function rowToRecord(row) {
  return row;
}
function mapSearchRow(row, score) {
  return {
    itemId: String(row.item_id),
    segmentId: String(row.id),
    title: String(row.title),
    text: String(row.text),
    startSeconds: Number(row.start_seconds),
    endSeconds: Number(row.end_seconds),
    speakerId: optionalScalarString(row.speaker_id, "segments.speaker_id"),
    score
  };
}
async function openSqlite(dbPath) {
  await mkdir2(path5.dirname(dbPath), { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { allowExtension: true });
  sqliteVec.load(db);
  db.enableLoadExtension(false);
  ensureLocalPlaneSchema(db);
  registerPlaneApp(db, "mere-media", "mere.media");
  registerPlaneTransferSchema(db, "mere-media", {
    payloadSchema: MEDIA_LIBRARY_PAYLOAD_SCHEMA,
    displayName: "Media library transfer",
    description: "Portable media item metadata and transcripts for local/cloud migration."
  });
  return db;
}
var LocalMediaStore;
var init_local_store = __esm({
  "cli/local-store.ts"() {
    "use strict";
    init_src();
    init_segments();
    init_media();
    init_transfer();
    LocalMediaStore = class _LocalMediaStore {
      constructor(dbPath, db) {
        this.dbPath = dbPath;
        this.db = db;
      }
      static async open(options = {}) {
        const dbPath = resolveLocalDbPath(options);
        const store = new _LocalMediaStore(dbPath, await openSqlite(dbPath));
        store.ensureSchema();
        return store;
      }
      close() {
        this.db.close();
      }
      info() {
        this.ensureSchema();
        const dimensions = this.db.prepare("SELECT value FROM local_meta WHERE key = 'embedding_dimensions'").get();
        const version = this.db.prepare("SELECT vec_version() AS version").get();
        const inventory = getLocalPlaneInventory(this.db);
        return {
          dbPath: this.dbPath,
          embeddingDimensions: dimensions?.value ? Number(dimensions.value) : null,
          sqliteVecVersion: version.version,
          planeAppCount: inventory.counts.apps,
          planeWorkspaceCount: inventory.counts.workspaces,
          transferCount: inventory.counts.transfers,
          aiJobCount: inventory.counts.aiJobs
        };
      }
      recordTransfer(input) {
        const mode = input.destination ?? input.source ?? { data: "local", ai: "local" };
        upsertPlaneWorkspace(this.db, "mere-media", {
          workspaceId: input.workspaceId,
          slug: input.workspaceId,
          name: input.workspaceId,
          dataPlane: mode.data,
          aiPlane: mode.ai
        });
        return recordPlaneTransfer(this.db, {
          appId: "mere-media",
          workspaceId: input.workspaceId,
          direction: input.direction,
          source: input.source,
          destination: input.destination,
          payloadSchema: input.payloadSchema,
          payloadSha256: input.payloadSha256
        });
      }
      importMedia(input) {
        this.ensureSchema();
        const sourceId = makeId("src");
        const itemId = makeId("med");
        const jobId = makeId("job");
        const now = isoNow4();
        const metadata = json(input.metadata);
        this.db.exec("BEGIN");
        try {
          this.db.prepare(
            `INSERT INTO sources (id, type, label, original_uri, metadata_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(sourceId, input.sourceType, input.title, input.originalPath, metadata, now, now);
          this.db.prepare(
            `INSERT INTO media_items (
            id, source_id, source_type, title, mime_type, duration_seconds, file_size_bytes,
            original_path, metadata_json, transcript_status, segment_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'missing', 0, ?, ?)`
          ).run(
            itemId,
            sourceId,
            input.sourceType,
            input.title,
            input.mimeType,
            input.durationSeconds,
            input.fileSizeBytes,
            input.originalPath,
            metadata,
            now,
            now
          );
          this.db.prepare(
            `INSERT INTO jobs (id, item_id, type, status, metadata_json, created_at, updated_at)
           VALUES (?, ?, 'import', 'done', ?, ?, ?)`
          ).run(jobId, itemId, metadata, now, now);
          this.db.exec("COMMIT");
          return Promise.resolve({ ok: true, itemId, jobId });
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
      listItems(query) {
        this.ensureSchema();
        const trimmed = query?.trim();
        const rows = trimmed ? this.db.prepare(
          `SELECT * FROM media_items
             WHERE title LIKE ? ESCAPE '\\' OR original_path LIKE ? ESCAPE '\\'
             ORDER BY updated_at DESC
             LIMIT 100`
        ).all(likeValue(trimmed), likeValue(trimmed)) : this.db.prepare("SELECT * FROM media_items ORDER BY updated_at DESC LIMIT 100").all();
        return Promise.resolve({
          ok: true,
          items: rows.map((row) => toMediaItemSummary(rowToRecord(row)))
        });
      }
      getItem(itemId) {
        this.ensureSchema();
        const row = this.db.prepare("SELECT * FROM media_items WHERE id = ?").get(itemId);
        if (!row) {
          throw new Error(`Media item not found: ${itemId}`);
        }
        return Promise.resolve({ ok: true, item: toMediaItemSummary(rowToRecord(row)) });
      }
      getTranscript(itemId) {
        this.ensureSchema();
        const transcript = this.db.prepare("SELECT text FROM transcripts WHERE item_id = ? ORDER BY updated_at DESC LIMIT 1").get(itemId);
        if (!transcript) {
          throw new Error(`Transcript not found: ${itemId}`);
        }
        const segments = this.db.prepare("SELECT * FROM segments WHERE item_id = ? ORDER BY start_seconds ASC").all(itemId).map((row) => toTranscriptSegment(rowToRecord(row)));
        return Promise.resolve({ ok: true, itemId, text: String(transcript.text ?? ""), segments });
      }
      saveTranscript(itemId, input) {
        this.ensureSchema();
        this.requireItem(itemId);
        const transcriptId = makeId("trn");
        const now = isoNow4();
        this.db.exec("BEGIN");
        try {
          this.deleteVectorsForItem(itemId);
          this.db.prepare("DELETE FROM transcripts WHERE item_id = ?").run(itemId);
          this.db.prepare("DELETE FROM segments WHERE item_id = ?").run(itemId);
          this.db.prepare(
            `INSERT INTO transcripts (id, item_id, text, model, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
          ).run(transcriptId, itemId, input.transcriptText, input.model, now, now);
          const insertSegment = this.db.prepare(
            `INSERT INTO segments (id, item_id, start_seconds, end_seconds, text, speaker_id, vector_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          );
          for (const [index, segment] of input.segments.entries()) {
            const segmentId = makeId("seg");
            insertSegment.run(
              segmentId,
              itemId,
              segment.startSeconds,
              segment.endSeconds,
              segment.text,
              segment.speakerId ?? null,
              `mere-media:${itemId}:${index.toString().padStart(6, "0")}`,
              now
            );
          }
          this.db.prepare(
            `UPDATE media_items
           SET transcript_status = 'ready', segment_count = ?, updated_at = ?
           WHERE id = ?`
          ).run(input.segments.length, now, itemId);
          this.db.prepare(
            `INSERT INTO jobs (id, item_id, type, status, metadata_json, created_at, updated_at)
           VALUES (?, ?, 'transcribe', 'done', ?, ?, ?)`
          ).run(makeId("job"), itemId, json({ model: input.model }), now, now);
          this.db.exec("COMMIT");
          return Promise.resolve({ ok: true, itemId, transcriptId, segmentCount: input.segments.length });
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
      saveEmbeddings(itemId, input) {
        this.ensureSchema();
        this.requireItem(itemId);
        const segments = this.db.prepare("SELECT * FROM segments WHERE item_id = ? ORDER BY start_seconds ASC").all(itemId).map(rowToRecord);
        if (segments.length === 0) {
          throw new Error("No transcript segments are available to embed.");
        }
        if (segments.length !== input.embeddings.length) {
          throw new Error(
            `Embedding count ${input.embeddings.length.toString()} does not match segment count ${segments.length.toString()}.`
          );
        }
        const dimensions = input.embeddings[0]?.length ?? 0;
        if (dimensions <= 0) {
          throw new Error("Embeddings must contain at least one dimension.");
        }
        for (const [index, embedding] of input.embeddings.entries()) {
          if (embedding.length !== dimensions) {
            throw new Error(
              `Embedding ${index.toString()} has ${embedding.length.toString()} dimensions; expected ${dimensions.toString()}.`
            );
          }
          if (embedding.some((value) => !Number.isFinite(value))) {
            throw new Error(`Embedding ${index.toString()} contains a non-finite value.`);
          }
        }
        this.ensureVectorTable(dimensions);
        const jobId = makeId("job");
        const now = isoNow4();
        this.db.exec("BEGIN");
        try {
          const insertMap = this.db.prepare("INSERT INTO segment_vector_map (segment_id) VALUES (?)");
          const selectMap = this.db.prepare("SELECT vector_rowid FROM segment_vector_map WHERE segment_id = ?");
          const deleteVector = this.db.prepare("DELETE FROM segment_vectors WHERE rowid = ?");
          const insertVector = this.db.prepare("INSERT INTO segment_vectors(rowid, embedding) VALUES (?, ?)");
          for (const [index, embedding] of input.embeddings.entries()) {
            const segmentId = scalarString(segments[index]?.id, "segments.id");
            let map = selectMap.get(segmentId);
            if (!map) {
              insertMap.run(segmentId);
              map = selectMap.get(segmentId);
            }
            const rowid = Number(map?.vector_rowid);
            if (!Number.isInteger(rowid)) {
              throw new Error(`Unable to allocate vector row for segment ${segmentId}.`);
            }
            deleteVector.run(BigInt(rowid));
            insertVector.run(BigInt(rowid), vectorJson(embedding));
          }
          this.db.prepare(
            `INSERT INTO jobs (id, item_id, type, status, metadata_json, created_at, updated_at)
           VALUES (?, ?, 'embed', 'done', ?, ?, ?)`
          ).run(jobId, itemId, json({ model: input.model, vectorCount: input.embeddings.length, localVectorReady: true }), now, now);
          this.db.exec("COMMIT");
          return Promise.resolve({
            ok: true,
            itemId,
            jobId,
            vectorCount: input.embeddings.length,
            vectorizeReady: true
          });
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
      search(query, embedding) {
        this.ensureSchema();
        const semanticResults = embedding?.length ? this.semanticSearch(embedding, 20) : [];
        if (semanticResults.length > 0) {
          return Promise.resolve({ ok: true, mode: "local-vector", results: semanticResults });
        }
        return Promise.resolve({ ok: true, mode: "local-keyword", results: this.keywordSearch(query, 20) });
      }
      ensureSchema() {
        this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS local_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('file', 'folder', 'youtube', 'audiobook', 'manual-upload')),
        label TEXT NOT NULL,
        original_uri TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_by_user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
        source_type TEXT NOT NULL CHECK (source_type IN ('file', 'folder', 'youtube', 'audiobook', 'manual-upload')),
        title TEXT NOT NULL,
        mime_type TEXT,
        duration_seconds REAL,
        file_size_bytes INTEGER,
        storage_key TEXT,
        original_path TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        transcript_status TEXT NOT NULL DEFAULT 'missing' CHECK (transcript_status IN ('missing', 'ready', 'failed')),
        segment_count INTEGER NOT NULL DEFAULT 0,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        model TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
        start_seconds REAL NOT NULL,
        end_seconds REAL NOT NULL,
        text TEXT NOT NULL,
        speaker_id TEXT,
        vector_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS speakers (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        display_name TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        item_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('import', 'transcribe', 'diarize', 'embed')),
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
        error TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS segment_vector_map (
        vector_rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        segment_id TEXT NOT NULL UNIQUE REFERENCES segments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_media_items_updated ON media_items(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_media_items_source_type ON media_items(source_type, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transcripts_item ON transcripts(item_id);
      CREATE INDEX IF NOT EXISTS idx_segments_item_start ON segments(item_id, start_seconds);
      CREATE INDEX IF NOT EXISTS idx_jobs_item_updated ON jobs(item_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_status_updated ON jobs(status, updated_at DESC);
    `);
      }
      ensureVectorTable(dimensions) {
        const existing = this.db.prepare("SELECT value FROM local_meta WHERE key = 'embedding_dimensions'").get();
        if (existing?.value && Number(existing.value) !== dimensions) {
          throw new Error(
            `Local vector store is configured for ${existing.value} dimensions, but received ${dimensions.toString()}.`
          );
        }
        if (!existing?.value) {
          this.db.prepare("INSERT INTO local_meta (key, value) VALUES ('embedding_dimensions', ?)").run(String(dimensions));
        }
        this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS segment_vectors USING vec0(embedding float[${dimensions.toString()}]);`);
      }
      vectorTableReady(dimensions) {
        const table = this.db.prepare("SELECT name FROM sqlite_master WHERE name = 'segment_vectors'").get();
        if (!table) {
          return false;
        }
        if (!dimensions) {
          return true;
        }
        const existing = this.db.prepare("SELECT value FROM local_meta WHERE key = 'embedding_dimensions'").get();
        return Number(existing?.value) === dimensions;
      }
      requireItem(itemId) {
        const item = this.db.prepare("SELECT id FROM media_items WHERE id = ?").get(itemId);
        if (!item) {
          throw new Error(`Media item not found: ${itemId}`);
        }
      }
      deleteVectorsForItem(itemId) {
        if (!this.vectorTableReady()) {
          this.db.prepare(
            `DELETE FROM segment_vector_map
           WHERE segment_id IN (SELECT id FROM segments WHERE item_id = ?)`
          ).run(itemId);
          return;
        }
        const rows = this.db.prepare(
          `SELECT vector_rowid
         FROM segment_vector_map
         WHERE segment_id IN (SELECT id FROM segments WHERE item_id = ?)`
        ).all(itemId);
        const deleteVector = this.db.prepare("DELETE FROM segment_vectors WHERE rowid = ?");
        for (const row of rows) {
          deleteVector.run(BigInt(row.vector_rowid));
        }
        this.db.prepare(
          `DELETE FROM segment_vector_map
         WHERE segment_id IN (SELECT id FROM segments WHERE item_id = ?)`
        ).run(itemId);
      }
      semanticSearch(embedding, limit) {
        if (!this.vectorTableReady(embedding.length)) {
          return [];
        }
        const matches = this.db.prepare(
          `SELECT rowid, distance
         FROM segment_vectors
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`
        ).all(vectorJson(embedding), limit * 3);
        if (matches.length === 0) {
          return [];
        }
        const byRowid = new Map(matches.map((match) => [Number(match.rowid), Number(match.distance)]));
        const placeholders = matches.map(() => "?").join(", ");
        const rows = this.db.prepare(
          `SELECT svm.vector_rowid, s.*, m.title
         FROM segment_vector_map svm
         JOIN segments s ON s.id = svm.segment_id
         JOIN media_items m ON m.id = s.item_id
         WHERE svm.vector_rowid IN (${placeholders})`
        ).all(...matches.map((match) => Number(match.rowid)));
        return rows.map((row) => {
          const distance = byRowid.get(Number(row.vector_rowid)) ?? Number.POSITIVE_INFINITY;
          return mapSearchRow(row, Number.isFinite(distance) ? 1 / (1 + distance) : 0);
        }).sort((a, b) => b.score - a.score).slice(0, limit);
      }
      keywordSearch(query, limit) {
        const trimmed = query.trim();
        if (!trimmed) {
          return [];
        }
        const rows = this.db.prepare(
          `SELECT s.*, m.title
         FROM segments s JOIN media_items m ON m.id = s.item_id
         WHERE s.text LIKE ? ESCAPE '\\' OR m.title LIKE ? ESCAPE '\\'
         ORDER BY m.updated_at DESC, s.start_seconds ASC
         LIMIT ?`
        ).all(likeValue(trimmed), likeValue(trimmed), limit * 3);
        return rows.map((row) => mapSearchRow(row, scoreSegment(trimmed, String(row.text)))).filter((row) => row.score > 0).sort((a, b) => b.score - a.score || a.startSeconds - b.startSeconds).slice(0, limit);
      }
    };
  }
});

// cli/media.ts
init_src();
import { mkdtemp as mkdtemp2, readFile as readFile2, rm as rm3 } from "node:fs/promises";
import os4 from "node:os";
import path6 from "node:path";
import { spawnSync as spawnSync2 } from "node:child_process";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3e33aa21815955fd111aa71f2a8f3f47/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3e33aa21815955fd111aa71f2a8f3f47/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3e33aa21815955fd111aa71f2a8f3f47/node_modules/@mere/cli-auth/src/session.ts
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os2 from "node:os";
import path2 from "node:path";
function stateHome2(env) {
  const homeDir = env.HOME?.trim() || os2.homedir();
  return env.XDG_STATE_HOME?.trim() || path2.join(homeDir, ".local", "state");
}
function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function resolveCliPaths(appName, env = process.env) {
  const stateDir = path2.join(stateHome2(env), appName);
  return {
    stateDir,
    sessionFile: path2.join(stateDir, "session.json")
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_3e33aa21815955fd111aa71f2a8f3f47/node_modules/@mere/cli-auth/src/client.ts
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
  const baseUrl2 = normalizeBaseUrl(input.baseUrl);
  const payload = await waitForCallback({
    baseUrl: baseUrl2,
    fetchImpl: input.fetchImpl ?? fetch,
    notify: input.notify,
    workspace: input.workspace,
    inviteCode: input.inviteCode,
    productLabel: input.productLabel
  });
  return createLocalSession(payload, {
    baseUrl: baseUrl2,
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
var APP_NAME = "mere-media";
function sessionFilePath(env = process.env) {
  return resolveCliPaths(APP_NAME, env).sessionFile;
}
function loadSession(env = process.env) {
  return loadCliSession({ appName: APP_NAME, env });
}
function saveSession(session, env = process.env) {
  return saveCliSession({ appName: APP_NAME, session, env });
}
function clearSession(env = process.env) {
  return clearCliSession({ appName: APP_NAME, env });
}

// cli/auth.ts
async function loginWithBrowser2(input) {
  const session = await loginWithBrowser({
    baseUrl: input.baseUrl,
    workspace: input.workspace,
    fetchImpl: input.fetchImpl,
    notify: input.notify,
    productLabel: "mere-media"
  });
  await saveSession(session, input.env);
  return session;
}
async function refreshRemoteSession2(session, input = {}) {
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace: input.workspace ?? null,
    fetchImpl: input.fetchImpl
  });
  return mergeSessionPayload(session, payload, {
    persistDefaultWorkspace: input.persistDefaultWorkspace
  });
}
async function ensureWorkspaceSession(session, input = {}) {
  const targetWorkspace = input.workspace?.trim() ? requireWorkspaceSelection(session.workspaces, input.workspace) : requireWorkspaceSelection(session.workspaces, session.defaultWorkspaceId);
  if (!sessionNeedsRefresh(session, targetWorkspace.id)) {
    return session;
  }
  return refreshRemoteSession2(session, {
    workspace: targetWorkspace.id,
    fetchImpl: input.fetchImpl
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

// src/lib/shared/json.ts
var MAX_JSON_REQUEST_BYTES = 5 * 1024 * 1024;
function parseJsonText(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Invalid ${label}: ${message}`, { cause: error });
  }
}

// cli/client.ts
init_api();
var MediaCliError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
function normalizeBaseUrl2(value) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}
async function parseResponse(response) {
  const text = await response.text();
  return text ? parseJsonText(text, "API response") : {};
}
var MediaCliClient = class {
  baseUrl;
  token;
  fetchImpl;
  constructor(options) {
    this.baseUrl = normalizeBaseUrl2(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }
  async request(path7, parse, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (this.token) {
      headers.set("authorization", `Bearer ${this.token}`);
    }
    const response = await this.fetchImpl(new URL(path7, this.baseUrl), { ...init, headers });
    const payload = await parseResponse(response);
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : `Request failed with status ${response.status.toString()}`;
      throw new MediaCliError(message, response.status);
    }
    return parse(payload);
  }
  importMedia(input) {
    return this.request("/api/media/imports", normalizeImportMediaResponse, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listItems(query) {
    const params = query ? `?query=${encodeURIComponent(query)}` : "";
    return this.request(`/api/media/items${params}`, normalizeListItemsResponse);
  }
  getItem(itemId) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}`, normalizeGetItemResponse);
  }
  getTranscript(itemId) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/transcript`, normalizeGetTranscriptResponse);
  }
  saveTranscript(itemId, input) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/transcript`, normalizeSaveTranscriptResponse, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  saveEmbeddings(itemId, input) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/embeddings`, normalizeSaveEmbeddingsResponse, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  search(query, embedding) {
    if (embedding) {
      return this.request("/api/media/search", normalizeSearchResponse, {
        method: "POST",
        body: JSON.stringify({ query, embedding })
      });
    }
    return this.request(`/api/media/search?q=${encodeURIComponent(query)}`, normalizeSearchResponse);
  }
};

// cli/importers.ts
import { readdir, stat } from "node:fs/promises";
import path3 from "node:path";
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([".m4b", ".mp3", ".m4a", ".wav", ".flac", ".aac", ".ogg", ".opus"]);
function isAudioPath(filePath) {
  return AUDIO_EXTENSIONS.has(path3.extname(filePath).toLowerCase());
}
function titleFromPath(filePath) {
  const parsed = path3.parse(filePath);
  return parsed.name.replaceAll(/[_-]+/gu, " ").replaceAll(/\s+/gu, " ").trim() || parsed.base;
}
function mimeTypeFromPath(filePath) {
  switch (path3.extname(filePath).toLowerCase()) {
    case ".m4b":
    case ".m4a":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".flac":
      return "audio/flac";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    default:
      return null;
  }
}
async function buildFileImport(filePath, sourceType = "file") {
  const absolutePath = path3.resolve(filePath);
  const fileStat = await stat(absolutePath);
  if (!fileStat.isFile()) {
    throw new Error(`${absolutePath} is not a file.`);
  }
  if (!isAudioPath(absolutePath)) {
    throw new Error(`${absolutePath} is not a supported audio file.`);
  }
  return {
    sourceType,
    title: titleFromPath(absolutePath),
    originalPath: absolutePath,
    mimeType: mimeTypeFromPath(absolutePath),
    durationSeconds: null,
    fileSizeBytes: fileStat.size,
    metadata: {
      importedFrom: "mere-media-cli",
      extension: path3.extname(absolutePath).toLowerCase()
    }
  };
}
async function listAudioFiles(dirPath) {
  const root = path3.resolve(dirPath);
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const current = path3.join(root, entry.name);
      if (entry.isDirectory()) {
        return listAudioFiles(current);
      }
      return entry.isFile() && isAudioPath(current) ? [current] : [];
    })
  );
  return nested.flat().sort();
}

// cli/manifest.ts
var CLI_VERSION = "0.1.0";
var HELP_TEXT = `mere-media CLI

Usage:
  mere-media [global flags] <command> [args]

Global flags:
  --base-url URL        Override MERE_MEDIA_BASE_URL
  --store MODE          cloud (default) or local
  --ai MODE             local (default) or cloud
  --local-db PATH       Override local SQLite database path
  --workspace ID        Workspace for auth refresh
  --token TOKEN         Internal bearer token override
  --json                Write machine-readable JSON
  --dry-run             Validate an import bundle without writing
  --version             Show version
  --help                Show this help

Commands:
  mere-media commands [--json]
  mere-media completion [bash|zsh|fish]
  mere-media store info [--store local|cloud] [--json]
  mere-media auth login [--base-url URL] [--workspace WORKSPACE_ID]
  mere-media auth whoami [--json]
  mere-media auth logout [--json]
  mere-media items list [query] [--json]
  mere-media items get <item-id> [--json]
  mere-media transcript get <item-id> [--json]
  mere-media export [--json]
  mere-media import file <path> [--json]
  mere-media import folder <path> [--json]
  mere-media import youtube <url> [--title TITLE] [--json]
  mere-media import audiobook <dir> [--json]
  mere-media import bundle <path> [--dry-run] [--json]
  mere-media process <item-id|path> [--audio PATH] [--transcribe] [--embed] [--json]
  mere-media search <query> [--json]
`;
var GLOBAL_FLAGS = {
  "base-url": "string",
  store: "string",
  ai: "string",
  "local-db": "string",
  workspace: "string",
  token: "string",
  json: "boolean",
  "dry-run": "boolean",
  version: "boolean",
  help: "boolean"
};
var MANIFEST_COMMANDS = [
  {
    id: "commands",
    path: ["commands"],
    summary: "Print the machine-readable mere.media command manifest.",
    auth: "none",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: []
  },
  {
    id: "completion",
    path: ["completion"],
    summary: "Print shell completion for mere-media.",
    auth: "none",
    risk: "read",
    supportsJson: false,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["shell"],
    flags: []
  },
  {
    id: "store.info",
    path: ["store", "info"],
    summary: "Show the active mere.media storage backend.",
    auth: "none",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: ["store", "ai", "local-db"],
    auditDefault: true
  },
  {
    id: "auth.login",
    path: ["auth", "login"],
    summary: "Sign in through the browser and save a local mere.media session.",
    auth: "none",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: ["base-url", "workspace"]
  },
  {
    id: "auth.whoami",
    path: ["auth", "whoami"],
    summary: "Show the saved mere.media browser session.",
    auth: "session",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: [],
    auditDefault: true
  },
  {
    id: "auth.logout",
    path: ["auth", "logout"],
    summary: "Clear the saved mere.media session and revoke it remotely when possible.",
    auth: "session",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: []
  },
  {
    id: "items.list",
    path: ["items", "list"],
    summary: "List media items visible to the current account.",
    auth: "workspace",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["query"],
    flags: ["store", "ai", "local-db", "workspace"],
    auditDefault: true
  },
  {
    id: "items.get",
    path: ["items", "get"],
    summary: "Show one media item by id.",
    auth: "workspace",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["item-id"],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "transcript.get",
    path: ["transcript", "get"],
    summary: "Show a saved transcript and its segments for one media item.",
    auth: "workspace",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["item-id"],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "export",
    path: ["export"],
    summary: "Export visible media items and transcripts as a local-plane transfer bundle.",
    auth: "workspace",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: [],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "import.file",
    path: ["import", "file"],
    summary: "Import one local audio file into mere.media.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["path"],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "import.folder",
    path: ["import", "folder"],
    summary: "Import supported audio files from a local folder.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["path"],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "import.youtube",
    path: ["import", "youtube"],
    summary: "Register a YouTube URL as a media source.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["url"],
    flags: ["store", "ai", "local-db", "workspace", "title"]
  },
  {
    id: "import.audiobook",
    path: ["import", "audiobook"],
    summary: "Import supported audiobook files from a local directory.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["dir"],
    flags: ["store", "ai", "local-db", "workspace"]
  },
  {
    id: "import.bundle",
    path: ["import", "bundle"],
    summary: "Import or dry-run a local-plane transfer bundle into the selected media store.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["path"],
    flags: ["store", "ai", "local-db", "workspace", "dry-run"]
  },
  {
    id: "process",
    path: ["process"],
    summary: "Transcribe and optionally embed a media item or local audio path.",
    auth: "workspace",
    risk: "write",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["item-id|path"],
    flags: ["store", "ai", "local-db", "workspace", "audio", "transcribe", "embed"]
  },
  {
    id: "search",
    path: ["search"],
    summary: "Search transcript segments visible to the current account.",
    auth: "workspace",
    risk: "read",
    supportsJson: true,
    supportsData: false,
    requiresYes: false,
    requiresConfirm: false,
    positionals: ["query"],
    flags: ["store", "ai", "local-db", "workspace"]
  }
];
function commandManifest(env) {
  return {
    schemaVersion: 1,
    app: "mere-media",
    namespace: "media",
    aliases: ["media", "mere-media", "meremedia"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_MEDIA_BASE_URL"],
    sessionPath: sessionFilePath(env),
    globalFlags: ["base-url", "store", "ai", "local-db", "workspace", "token", "json"],
    commands: MANIFEST_COMMANDS
  };
}
function renderCompletion(shell) {
  const topWords = ["auth", "commands", "completion", "export", "import", "items", "process", "search", "store", "transcript"].sort().join(" ");
  const subcommands = {
    auth: ["login", "logout", "whoami"],
    completion: ["bash", "fish", "zsh"],
    import: ["audiobook", "bundle", "file", "folder", "youtube"],
    items: ["get", "list"],
    store: ["info"],
    transcript: ["get"]
  };
  const bashCases = Object.entries(subcommands).map(([command, words]) => `    ${command}) words="${words.join(" ")}" ;;`).join("\n");
  switch ((shell ?? "bash").trim().toLowerCase()) {
    case "bash":
      return [
        "# mere-media bash completion",
        "_mere_media_completion() {",
        '  local cur="${COMP_WORDS[COMP_CWORD]}"',
        "  local words",
        '  if [[ "$COMP_CWORD" -eq 1 ]]; then',
        `    words="${topWords}"`,
        '  elif [[ "$COMP_CWORD" -eq 2 ]]; then',
        '    case "${COMP_WORDS[1]}" in',
        bashCases,
        '      *) words="" ;;',
        "    esac",
        "  else",
        '    words=""',
        "  fi",
        '  COMPREPLY=( $(compgen -W "$words" -- "$cur") )',
        "}",
        "complete -F _mere_media_completion mere-media",
        ""
      ].join("\n");
    case "zsh":
      return `#compdef mere-media
_arguments '1:command:(${topWords})' '2:subcommand:->sub'
case "$words[2]" in
${Object.entries(
        subcommands
      ).map(([command, words]) => `  ${command}) _values '${command} commands' ${words.join(" ")} ;;`).join("\n")}
esac
`;
    case "fish":
      return [
        `complete -c mere-media -f -n '__fish_use_subcommand' -a "${topWords}"`,
        ...Object.entries(subcommands).map(
          ([command, words]) => `complete -c mere-media -f -n '__fish_seen_subcommand_from ${command}' -a "${words.join(" ")}"`
        ),
        ""
      ].join("\n");
    default:
      throw new Error("Completion shell must be one of bash, zsh, or fish.");
  }
}

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/mere-run.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, chmod as chmod2, mkdtemp, rm as rm2 } from "node:fs/promises";
import { createHash as createHash2 } from "node:crypto";
import https from "node:https";
import os3 from "node:os";
import path4 from "node:path";
import { spawn as spawn2, spawnSync } from "node:child_process";
var DEFAULT_DMG_URL = "https://mere.run/releases/mere-run.dmg";
var DEFAULT_INSTALL_BIN = path4.join(os3.homedir(), ".local", "bin", "mere.run");
var DEFAULT_EMBED_MODEL = "text-embed-qwen3-0.6b";
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
function envPrefix2(appId) {
  if (!appId) return null;
  const prefix = appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return prefix || null;
}
function configuredBin(env, appId) {
  const prefix = envPrefix2(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_BIN`] : void 0) ?? env.MERE_RUN_BIN ?? env.MERE_LOCAL_PLANE_MERE_RUN_BIN ?? null;
}
function configuredInstallBin(env, appId) {
  const prefix = envPrefix2(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_INSTALL_BIN`] : void 0) ?? env.MERE_RUN_INSTALL_BIN ?? env.MERE_LOCAL_PLANE_MERE_RUN_INSTALL_BIN ?? DEFAULT_INSTALL_BIN;
}
function configuredDmgUrl(env, appId) {
  const prefix = envPrefix2(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_DOWNLOAD_URL`] : void 0) ?? env.MERE_RUN_DOWNLOAD_URL ?? env.MERE_LOCAL_PLANE_MERE_RUN_DOWNLOAD_URL ?? DEFAULT_DMG_URL;
}
function configuredDmgSha256(env, appId) {
  const prefix = envPrefix2(appId);
  return (prefix ? env[`${prefix}_MERE_RUN_DOWNLOAD_SHA256`] : void 0) ?? env.MERE_RUN_DOWNLOAD_SHA256 ?? env.MERE_LOCAL_PLANE_MERE_RUN_DOWNLOAD_SHA256 ?? null;
}
function requireDmgSha256(env, appId) {
  const expectedSha256 = configuredDmgSha256(env, appId);
  if (!expectedSha256) {
    const prefix = envPrefix2(appId);
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
  const hash = createHash2("sha256");
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
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`mere.run timed out after ${String(options.timeoutMs ?? 24e4)}ms`));
    }, options.timeoutMs ?? 24e4);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `mere.run exited with ${String(code)}`));
      }
    });
  });
}
function expectEmbeddingPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("mere.run embedding response must be an object.");
  }
  const data = value.data;
  if (!Array.isArray(data)) {
    throw new Error("mere.run embedding response.data must be an array.");
  }
  return data.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`mere.run embedding response.data[${index.toString()}] must be an object.`);
    }
    return row;
  });
}
function normalizeMereRunEmbeddingResponse(value) {
  return expectEmbeddingPayload(value).map((row, index) => {
    if (!Array.isArray(row.embedding)) {
      throw new Error(`mere.run embedding response.data[${index.toString()}].embedding must be an array.`);
    }
    return row.embedding.map((entry, entryIndex) => {
      if (typeof entry !== "number" || !Number.isFinite(entry)) {
        throw new Error(
          `mere.run embedding response.data[${index.toString()}].embedding[${entryIndex.toString()}] must be a finite number.`
        );
      }
      return entry;
    });
  });
}
async function embedTexts(texts, options = {}) {
  if (texts.length === 0) return [];
  const output = await runMereRun(["text", "embed", "--model", options.model ?? DEFAULT_EMBED_MODEL, "--", ...texts], {
    env: options.env,
    appId: options.appId,
    timeoutMs: options.timeoutMs ?? 3e5
  });
  return normalizeMereRunEmbeddingResponse(JSON.parse(output));
}
async function transcribeAudio(audioPath, options = {}) {
  return runMereRun(["speech", "transcribe", audioPath, "--backend", "auto", "--task", "transcribe", "--quiet"], {
    env: options.env,
    appId: options.appId,
    timeoutMs: options.timeoutMs ?? 3e5
  });
}

// cli/mere-run.ts
var APP_ID = "mere-media";
async function transcribeAudio2(audioPath, env = process.env) {
  return transcribeAudio(audioPath, {
    env,
    appId: APP_ID
  });
}
async function embedTexts2(texts, env = process.env) {
  return embedTexts(texts, {
    env,
    appId: APP_ID
  });
}

// cli/media.ts
init_segments();
init_transfer();
function parseArgs(argv, flagSpec) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    const kind = flagSpec[rawName];
    if (!kind) {
      throw new Error(`Unknown flag --${rawName}`);
    }
    if (kind === "boolean") {
      options[rawName] = true;
    } else {
      const value = inlineValue ?? argv[++index];
      if (!value) throw new Error(`--${rawName} requires a value`);
      options[rawName] = value;
    }
  }
  return { options, positionals };
}
function baseUrl(options, env) {
  return String(options["base-url"] ?? env.MERE_MEDIA_BASE_URL ?? "https://mere.media");
}
function localDbPath(options) {
  return typeof options["local-db"] === "string" ? options["local-db"] : void 0;
}
function resolveMediaPlaneConfig(options, env) {
  return resolvePlaneConfig({
    appId: "mere-media",
    env,
    data: typeof options.store === "string" ? options.store : void 0,
    ai: typeof options.ai === "string" ? options.ai : env.MERE_MEDIA_AI_PLANE ?? env.MERE_MEDIA_AI ?? env.MERE_AI_PLANE ?? "local",
    localDbPath: localDbPath(options)
  });
}
function storeMode(options, env) {
  return resolveMediaPlaneConfig(options, env).data;
}
function token(options, env, sessionToken) {
  return String(options.token ?? env.MERE_MEDIA_INTERNAL_TOKEN ?? env.MERE_MEDIA_TOKEN ?? sessionToken ?? "") || void 0;
}
function transferWorkspaceId(options, env) {
  const value = options.workspace ?? env.MERE_MEDIA_WORKSPACE_ID ?? env.MERE_WORKSPACE_ID ?? "personal";
  return String(value).trim() || "personal";
}
function bundleImportWorkspaceId(options, env, bundleWorkspaceId) {
  return typeof options.workspace === "string" ? transferWorkspaceId(options, env) : bundleWorkspaceId ?? transferWorkspaceId(options, env);
}
async function readJsonFile(filePath) {
  const absolutePath = path6.resolve(filePath);
  try {
    return parseJsonText(await readFile2(absolutePath, "utf8"), absolutePath);
  } catch (error) {
    throw new Error(`Failed to read ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
async function clientFromContext(options, io) {
  const explicitToken = token(options, io.env);
  if (explicitToken) {
    return new MediaCliClient({ baseUrl: baseUrl(options, io.env), token: explicitToken, fetchImpl: io.fetchImpl });
  }
  const session = await loadSession(io.env);
  if (!session) {
    throw new Error("Not authenticated. Run `mere-media auth login` or set MERE_MEDIA_INTERNAL_TOKEN.");
  }
  const refreshed = await ensureWorkspaceSession(session, {
    workspace: typeof options.workspace === "string" ? options.workspace : void 0,
    fetchImpl: io.fetchImpl
  });
  await saveSession(refreshed, io.env);
  return new MediaCliClient({
    baseUrl: refreshed.baseUrl,
    token: refreshed.accessToken,
    fetchImpl: io.fetchImpl
  });
}
async function storeFromContext(options, io) {
  if (storeMode(options, io.env) === "local") {
    const { LocalMediaStore: LocalMediaStore2 } = await Promise.resolve().then(() => (init_local_store(), local_store_exports));
    return LocalMediaStore2.open({
      dbPath: localDbPath(options),
      env: io.env
    });
  }
  return clientFromContext(options, io);
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeResult(io, json2, value, fallback) {
  if (json2) {
    writeJson(io, value);
  } else {
    io.stdout(`${fallback}
`);
  }
}
function renderCommands(io, json2) {
  const manifest = commandManifest(io.env);
  if (json2) {
    writeJson(io, manifest);
    return;
  }
  for (const command of manifest.commands) {
    io.stdout(`${command.path.join(" ")}	${command.risk}	${command.summary}
`);
  }
}
async function runAuth(command, args, io) {
  if (command === "login") {
    const session = await loginWithBrowser2({
      baseUrl: baseUrl(args.options, io.env),
      workspace: typeof args.options.workspace === "string" ? args.options.workspace : void 0,
      fetchImpl: io.fetchImpl,
      env: io.env,
      notify: (message) => io.stderr(`${message}
`)
    });
    writeJson(io, { ok: true, user: session.user, workspaces: session.workspaces });
    return 0;
  }
  if (command === "whoami") {
    const session = await loadSession(io.env);
    writeJson(io, { ok: true, authenticated: Boolean(session), user: session?.user ?? null, workspace: session?.workspace ?? null });
    return 0;
  }
  if (command === "logout") {
    writeJson(io, { ok: await logoutRemote({ fetchImpl: io.fetchImpl, env: io.env }) });
    return 0;
  }
  throw new Error("Usage: mere-media auth login|whoami|logout");
}
async function runStore(command, args, io) {
  if (command !== "info") {
    throw new Error("Usage: mere-media store info");
  }
  const mode = storeMode(args.options, io.env);
  const plane = resolveMediaPlaneConfig(args.options, io.env);
  if (mode === "local") {
    const { LocalMediaStore: LocalMediaStore2, resolveLocalDbPath: resolveLocalDbPath2 } = await Promise.resolve().then(() => (init_local_store(), local_store_exports));
    const store = await LocalMediaStore2.open({
      dbPath: localDbPath(args.options),
      env: io.env
    });
    try {
      writeResult(
        io,
        Boolean(args.options.json),
        { ok: true, store: mode, ai: plane.ai, cloudProjection: plane.cloudProjection, ...store.info() },
        `local	${resolveLocalDbPath2({ dbPath: localDbPath(args.options), env: io.env })}`
      );
    } finally {
      store.close();
    }
    return 0;
  }
  writeResult(
    io,
    Boolean(args.options.json),
    { ok: true, store: mode, ai: plane.ai, cloudProjection: plane.cloudProjection, baseUrl: baseUrl(args.options, io.env) },
    `cloud	${baseUrl(args.options, io.env)}`
  );
  return 0;
}
async function runItems(command, args, io) {
  const store = await storeFromContext(args.options, io);
  try {
    if (command === "list") {
      const query = args.positionals.slice(2).join(" ").trim() || void 0;
      const result = await store.listItems(query);
      if (args.options.json) {
        writeJson(io, result);
      } else {
        for (const item of result.items) {
          io.stdout(`${item.id}	${item.sourceType}	${item.transcriptStatus}	${item.title}
`);
        }
      }
      return 0;
    }
    if (command === "get") {
      const itemId = args.positionals[2];
      if (!itemId) throw new Error("Usage: mere-media items get <item-id>");
      const result = await store.getItem(itemId);
      if (args.options.json) {
        writeJson(io, result);
      } else {
        io.stdout(`${result.item.id}	${result.item.sourceType}	${result.item.transcriptStatus}	${result.item.title}
`);
      }
      return 0;
    }
    throw new Error("Usage: mere-media items list|get");
  } finally {
    store.close?.();
  }
}
async function runTranscript(command, args, io) {
  if (command !== "get") {
    throw new Error("Usage: mere-media transcript get <item-id>");
  }
  const itemId = args.positionals[2];
  if (!itemId) throw new Error("Usage: mere-media transcript get <item-id>");
  const store = await storeFromContext(args.options, io);
  try {
    const result = await store.getTranscript(itemId);
    if (args.options.json) {
      writeJson(io, result);
    } else {
      io.stdout(`${result.text}
`);
    }
    return 0;
  } finally {
    store.close?.();
  }
}
async function runExport(args, io) {
  const plane = resolveMediaPlaneConfig(args.options, io.env);
  const workspaceId = transferWorkspaceId(args.options, io.env);
  const store = await storeFromContext(args.options, io);
  try {
    const payload = await exportMediaLibraryPayload(store);
    const bundle = createPlaneTransferBundle({
      appId: plane.appId,
      workspaceId,
      plane,
      payloadSchema: MEDIA_LIBRARY_PAYLOAD_SCHEMA,
      payload
    });
    store.recordTransfer?.({
      workspaceId,
      direction: "export",
      source: bundle.source,
      payloadSchema: bundle.payloadSchema,
      payloadSha256: bundle.payloadSha256
    });
    writeJson(io, bundle);
    return 0;
  } finally {
    store.close?.();
  }
}
async function importBundle(filePath, args, io) {
  const plane = resolveMediaPlaneConfig(args.options, io.env);
  const unwrapped = unwrapPlaneTransferPayload(await readJsonFile(filePath), {
    appId: "mere-media",
    payloadSchema: MEDIA_LIBRARY_PAYLOAD_SCHEMA
  });
  const payload = normalizeMediaLibraryTransferPayload(unwrapped.payload);
  const workspaceId = bundleImportWorkspaceId(args.options, io.env, unwrapped.bundle?.workspaceId);
  const transferPlan = createPlaneTransferImportPlan({
    appId: plane.appId,
    workspaceId,
    payloadSchema: MEDIA_LIBRARY_PAYLOAD_SCHEMA,
    payload,
    bundle: unwrapped.bundle,
    destination: { data: plane.data, ai: plane.ai }
  });
  if (args.options["dry-run"]) {
    writeJson(io, {
      ok: true,
      dryRun: true,
      store: plane.data,
      ai: plane.ai,
      cloudProjection: plane.cloudProjection,
      transferPlan,
      counts: {
        items: payload.items.length,
        transcripts: payload.items.filter((item) => item.transcript != null).length
      }
    });
    return;
  }
  const store = await storeFromContext(args.options, io);
  try {
    const result = await importMediaLibraryPayload(store, payload);
    store.recordTransfer?.({
      workspaceId,
      direction: "import",
      source: unwrapped.bundle?.source,
      destination: { data: plane.data, ai: plane.ai },
      payloadSchema: transferPlan.payloadSchema,
      payloadSha256: transferPlan.payloadSha256
    });
    writeJson(io, {
      ...result,
      store: plane.data,
      ai: plane.ai,
      cloudProjection: plane.cloudProjection
    });
  } finally {
    store.close?.();
  }
}
async function importOne(input, args, io) {
  const store = await storeFromContext(args.options, io);
  try {
    const result = await store.importMedia(input);
    writeJson(io, result);
  } finally {
    store.close?.();
  }
}
async function runImport(kind, args, io) {
  const target = args.positionals[2];
  if (!kind || !target) throw new Error("Usage: mere-media import file|folder|youtube|audiobook|bundle <target>");
  if (kind === "bundle") {
    await importBundle(target, args, io);
    return 0;
  }
  if (kind === "file") {
    await importOne(await buildFileImport(target), args, io);
    return 0;
  }
  if (kind === "audiobook") {
    const files = await listAudioFiles(target);
    const imports = await Promise.all(files.map((file) => buildFileImport(file, "audiobook")));
    const store = await storeFromContext(args.options, io);
    try {
      const results = [];
      for (const input of imports) {
        results.push(await store.importMedia(input));
      }
      writeJson(io, { ok: true, count: results.length, results });
    } finally {
      store.close?.();
    }
    return 0;
  }
  if (kind === "folder") {
    const files = await listAudioFiles(target);
    const imports = await Promise.all(files.map((file) => buildFileImport(file, "folder")));
    const store = await storeFromContext(args.options, io);
    try {
      const results = [];
      for (const input of imports) {
        results.push(await store.importMedia(input));
      }
      writeJson(io, { ok: true, count: results.length, results });
    } finally {
      store.close?.();
    }
    return 0;
  }
  if (kind === "youtube") {
    const title = typeof args.options.title === "string" ? args.options.title : target;
    await importOne(
      {
        sourceType: "youtube",
        title,
        originalPath: target,
        mimeType: null,
        durationSeconds: null,
        fileSizeBytes: null,
        metadata: { importedFrom: "mere-media-cli" }
      },
      args,
      io
    );
    return 0;
  }
  throw new Error(`Unsupported import kind: ${kind}`);
}
async function toWav(audioPath) {
  const tmp = await mkdtemp2(path6.join(os4.tmpdir(), "mere-media-audio-"));
  const wav = path6.join(tmp, "audio.wav");
  const result = spawnSync2("ffmpeg", ["-y", "-i", audioPath, "-ac", "1", "-ar", "16000", wav], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    await rm3(tmp, { recursive: true, force: true });
    throw new Error(result.stderr || "ffmpeg failed to prepare audio.");
  }
  return {
    path: wav,
    cleanup: () => rm3(tmp, { recursive: true, force: true })
  };
}
async function resolveProcessTarget(target, args, store) {
  const audioOverride = typeof args.options.audio === "string" ? args.options.audio : null;
  if (audioOverride) {
    return { itemId: target, audioPath: path6.resolve(audioOverride) };
  }
  if (target.startsWith("med_")) {
    const item = await store.getItem(target);
    if (!item.item.originalPath) {
      throw new Error("Item has no original local path. Pass --audio PATH.");
    }
    return { itemId: target, audioPath: item.item.originalPath };
  }
  const input = await buildFileImport(target);
  const imported = await store.importMedia(input);
  if (!imported.itemId) {
    throw new Error(imported.error ?? "Import did not return an itemId.");
  }
  return { itemId: imported.itemId, audioPath: input.originalPath ?? target };
}
async function runProcess(args, io) {
  const target = args.positionals[1];
  if (!target) throw new Error("Usage: mere-media process <item-id|path> [--transcribe] [--embed]");
  const shouldTranscribe = Boolean(args.options.transcribe) || !args.options.embed;
  const shouldEmbed = Boolean(args.options.embed);
  const store = await storeFromContext(args.options, io);
  try {
    const resolved = await resolveProcessTarget(target, args, store);
    let transcriptText = "";
    let segmentCount = 0;
    let vectorCount = 0;
    let vectorizeReady = false;
    let segments = [];
    if (shouldTranscribe) {
      const wav = await toWav(resolved.audioPath);
      try {
        transcriptText = await transcribeAudio2(wav.path, io.env);
      } finally {
        await wav.cleanup();
      }
      segments = parseTimestampedTranscript(resolved.itemId, transcriptText).map((segment) => ({
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
        speakerId: segment.speakerId
      }));
      segmentCount = segments.length;
      await store.saveTranscript(resolved.itemId, {
        transcriptText,
        model: "mere.run speech transcribe",
        segments
      });
    } else if (shouldEmbed) {
      const transcript = await store.getTranscript(resolved.itemId);
      transcriptText = transcript.text;
      segments = transcript.segments.map((segment) => ({
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
        speakerId: segment.speakerId
      }));
      segmentCount = segments.length;
    }
    if (shouldEmbed) {
      const embeddings = await embedTexts2(segments.map((segment) => segment.text), io.env);
      const embedResult = await store.saveEmbeddings(resolved.itemId, {
        model: "mere.run text embed",
        embeddings
      });
      vectorCount = embedResult.vectorCount;
      vectorizeReady = embedResult.vectorizeReady;
    }
    writeJson(io, {
      ok: true,
      itemId: resolved.itemId,
      transcribed: shouldTranscribe,
      embedded: shouldEmbed,
      segmentCount,
      vectorCount,
      vectorizeReady
    });
    return 0;
  } finally {
    store.close?.();
  }
}
async function runSearch(args, io) {
  const query = args.positionals.slice(1).join(" ").trim();
  if (!query) throw new Error("Usage: mere-media search <query>");
  const mode = storeMode(args.options, io.env);
  let embedding;
  try {
    [embedding] = await embedTexts2([query], io.env);
  } catch (error) {
    if (mode !== "local") {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`Embedding unavailable; using local keyword search. ${message}
`);
  }
  const store = await storeFromContext(args.options, io);
  try {
    const result = await store.search(query, embedding);
    if (args.options.json) {
      writeJson(io, result);
    } else {
      for (const row of result.results) {
        io.stdout(`${row.title} @ ${Math.round(row.startSeconds).toString()}s  ${row.text}
`);
      }
    }
    return 0;
  } finally {
    store.close?.();
  }
}
async function runCli(argv, io) {
  try {
    const args = parseArgs(argv, {
      ...GLOBAL_FLAGS,
      title: "string",
      audio: "string",
      transcribe: "boolean",
      diarize: "boolean",
      embed: "boolean"
    });
    if (args.options.version || args.positionals[0] === "-v" || args.positionals[0] === "version") {
      io.stdout(`${CLI_VERSION}
`);
      return 0;
    }
    if (args.options.help || args.positionals.length === 0) {
      io.stdout(HELP_TEXT);
      return 0;
    }
    const [command, subcommand] = args.positionals;
    switch (command) {
      case "commands":
        renderCommands(io, Boolean(args.options.json));
        return 0;
      case "completion":
        io.stdout(renderCompletion(subcommand));
        return 0;
      case "store":
        return await runStore(subcommand, args, io);
      case "auth":
        return await runAuth(subcommand, args, io);
      case "items":
        return await runItems(subcommand, args, io);
      case "transcript":
        return await runTranscript(subcommand, args, io);
      case "export":
        return await runExport(args, io);
      case "import":
        return await runImport(subcommand, args, io);
      case "process":
        return await runProcess(args, io);
      case "search":
        return await runSearch(args, io);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (argv.includes("--json")) {
      writeJson(io, { ok: false, error: message });
    } else {
      io.stderr(`${message}
`);
    }
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
