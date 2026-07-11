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
  const bearerToken2 = readTargetValue({
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
  if (!bearerToken2) {
    throw new Error(
      `Missing Cloudflare projection bearer token. Pass a bearer token or set ${prefix}_PROJECTION_TOKEN.`
    );
  }
  return {
    receiverUrl: new URL(receiverUrl.value).toString(),
    bearerToken: bearerToken2.value,
    sources: {
      receiverUrl: receiverUrl.source,
      bearerToken: bearerToken2.source
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
var CloudProjectionDeliveryError;
var init_projection = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/projection.ts"() {
    CloudProjectionDeliveryError = class extends Error {
      constructor(message, status = null, responseText = null) {
        super(message);
        this.status = status;
        this.responseText = responseText;
        this.name = "CloudProjectionDeliveryError";
      }
      status;
      responseText;
    };
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts
var init_config = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts"() {
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { mkdir } from "node:fs/promises";
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
function defaultLocalPlaneDbPath(env = process.env) {
  return path.join(stateHome(env), "mere", "local-plane.db");
}
function resolveLocalPlaneDbPath(input = {}) {
  const env = input.env ?? process.env;
  const prefix = input.appId ? envPrefix2(input.appId) : "";
  const configured = input.localDbPath ?? (prefix ? env[`${prefix}_LOCAL_DB`] : void 0) ?? (prefix ? env[`${prefix}_LOCAL_PLANE_DB`] : void 0) ?? env.MERE_LOCAL_DB ?? env.MERE_LOCAL_PLANE_DB;
  return path.resolve(configured?.trim() ? expandHome(configured, env) : defaultLocalPlaneDbPath(env));
}
function resolvePlaneConfig(input) {
  const env = input.env ?? process.env;
  const prefix = envPrefix2(input.appId);
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
function makePlaneId(prefix) {
  return `${prefix}_${randomUUID2().replaceAll("-", "").slice(0, 24)}`;
}
async function loadNodeSqlite() {
  return import(["node", "sqlite"].join(":"));
}
async function openLocalPlaneDatabase(config) {
  await mkdir(path.dirname(config.localDbPath), { recursive: true });
  const { DatabaseSync: DatabaseSync2 } = await loadNodeSqlite();
  const db = new DatabaseSync2(config.localDbPath);
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
function isRecord2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function stringField(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function nestedRecord(record, key) {
  const value = record[key];
  return isRecord2(value) ? value : null;
}
function hashJson(value) {
  const text = JSON.stringify(value);
  if (text === void 0) {
    throw new Error("Projection envelope must be JSON serializable.");
  }
  return createHash2("sha256").update(text).digest("hex");
}
function defaultAppIdForProjection(product, eventType) {
  if (product?.trim()) return product.trim();
  if (eventType.startsWith("mail.")) return "mere-email";
  if (eventType.startsWith("network.")) return "mere-network";
  if (eventType.startsWith("project.") || eventType.startsWith("proposal.") || eventType.startsWith("file.") || eventType.startsWith("profile.")) {
    return "mere-projects";
  }
  return "mere-business";
}
function inferExternalObject(event) {
  const projection = nestedRecord(event, "projection");
  const publication = nestedRecord(event, "publication");
  const thread = nestedRecord(event, "thread");
  const call = nestedRecord(event, "call");
  if (projection && stringField(projection, "callId")) {
    return { externalObjectType: "network_call", externalObjectId: stringField(projection, "callId") };
  }
  if (publication && stringField(publication, "id")) {
    return { externalObjectType: "mail_publication", externalObjectId: stringField(publication, "id") };
  }
  if (thread && stringField(thread, "id")) {
    return { externalObjectType: "mail_thread", externalObjectId: stringField(thread, "id") };
  }
  if (call && stringField(call, "id")) {
    return { externalObjectType: "network_call", externalObjectId: stringField(call, "id") };
  }
  return { externalObjectType: null, externalObjectId: null };
}
function normalizeProjectionEnvelope(input) {
  if (!isRecord2(input.envelope)) {
    throw new Error("Projection envelope must be a JSON object.");
  }
  const receivedAt = input.receivedAt ?? isoNow2();
  const envelope2 = input.envelope;
  const event = nestedRecord(envelope2, "event") ?? envelope2;
  const eventType = stringField(envelope2, "eventType") ?? stringField(event, "type") ?? stringField(event, "eventType");
  if (!eventType) throw new Error("Projection envelope eventType is required.");
  const workspaceId = stringField(envelope2, "workspaceId") ?? stringField(event, "workspaceId") ?? stringField(event, "tenantId");
  if (!workspaceId) throw new Error("Projection envelope workspaceId is required.");
  const product = stringField(envelope2, "product") ?? stringField(envelope2, "appId") ?? stringField(event, "product") ?? defaultAppIdForProjection(null, eventType);
  const appId = input.appId?.trim() || stringField(envelope2, "appId") || defaultAppIdForProjection(product, eventType);
  const sourceEventId = stringField(envelope2, "eventId") ?? stringField(event, "eventId") ?? stringField(event, "id") ?? stringField(envelope2, "dedupeKey") ?? `sha256:${hashJson(input.envelope).slice(0, 32)}`;
  const inferredExternal = inferExternalObject(event);
  const externalObjectType = stringField(envelope2, "externalObjectType") ?? stringField(event, "externalObjectType") ?? inferredExternal.externalObjectType;
  const externalObjectId = stringField(envelope2, "externalObjectId") ?? stringField(event, "externalObjectId") ?? inferredExternal.externalObjectId;
  const occurredAt = stringField(envelope2, "occurredAt") ?? stringField(event, "occurredAt") ?? stringField(event, "updatedAt") ?? stringField(nestedRecord(event, "publication") ?? {}, "publishedAt") ?? stringField(nestedRecord(event, "projection") ?? {}, "publishedAt") ?? receivedAt;
  const envelopeJson = json(input.envelope);
  return {
    appId,
    workspaceId,
    product,
    sourceEventId,
    eventType,
    externalObjectType,
    externalObjectId,
    occurredAt,
    canonicalUrl: stringField(envelope2, "canonicalUrl") ?? stringField(event, "canonicalUrl"),
    dedupeKey: stringField(envelope2, "dedupeKey"),
    source: input.source ?? "manual",
    receivedAt,
    envelopeSha256: createHash2("sha256").update(envelopeJson).digest("hex"),
    envelopeJson
  };
}
function toLocalProjectionEvent(row) {
  return {
    id: row.id,
    appId: row.app_id,
    workspaceId: row.workspace_id,
    product: row.product,
    sourceEventId: row.source_event_id,
    eventType: row.event_type,
    externalObjectType: row.external_object_type,
    externalObjectId: row.external_object_id,
    occurredAt: row.occurred_at,
    canonicalUrl: row.canonical_url,
    dedupeKey: row.dedupe_key,
    source: row.source,
    envelopeSha256: row.envelope_sha256,
    envelope: JSON.parse(row.envelope_json),
    receivedAt: row.received_at,
    createdAt: row.created_at
  };
}
function recordLocalProjectionEnvelope(db, input) {
  ensureLocalPlaneSchema(db);
  const normalized = normalizeProjectionEnvelope(input);
  registerPlaneApp(db, normalized.appId);
  upsertPlaneWorkspace(db, normalized.appId, {
    workspaceId: normalized.workspaceId,
    slug: normalized.workspaceId,
    name: null,
    dataPlane: "local",
    aiPlane: "cloud"
  });
  const existing = db.prepare(
    `SELECT id
       FROM mere_plane_projection_events
       WHERE app_id = ? AND workspace_id = ? AND source_event_id = ?
       LIMIT 1`
  ).get(normalized.appId, normalized.workspaceId, normalized.sourceEventId);
  const id = existing?.id ?? makePlaneId("lpe");
  const createdAt = existing ? null : normalized.receivedAt;
  db.prepare(
    `INSERT INTO mere_plane_projection_events (
         id, app_id, workspace_id, product, source_event_id, event_type,
         external_object_type, external_object_id, occurred_at, canonical_url,
         dedupe_key, source, envelope_sha256, envelope_json, received_at, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(app_id, workspace_id, source_event_id) DO UPDATE SET
         product = excluded.product,
         event_type = excluded.event_type,
         external_object_type = excluded.external_object_type,
         external_object_id = excluded.external_object_id,
         occurred_at = excluded.occurred_at,
         canonical_url = excluded.canonical_url,
         dedupe_key = excluded.dedupe_key,
         source = excluded.source,
         envelope_sha256 = excluded.envelope_sha256,
         envelope_json = excluded.envelope_json,
         received_at = excluded.received_at`
  ).run(
    id,
    normalized.appId,
    normalized.workspaceId,
    normalized.product,
    normalized.sourceEventId,
    normalized.eventType,
    normalized.externalObjectType,
    normalized.externalObjectId,
    normalized.occurredAt,
    normalized.canonicalUrl,
    normalized.dedupeKey,
    normalized.source,
    normalized.envelopeSha256,
    normalized.envelopeJson,
    normalized.receivedAt,
    createdAt ?? normalized.receivedAt
  );
  const event = getLocalProjectionEvent(db, id);
  if (!event) throw new Error(`Local projection event ${id} was not recorded.`);
  return { inserted: !existing, event };
}
function getLocalProjectionEvent(db, idOrSourceEventId) {
  ensureLocalPlaneSchema(db);
  const row = db.prepare(
    `SELECT *
       FROM mere_plane_projection_events
       WHERE id = ? OR source_event_id = ? OR dedupe_key = ?
       ORDER BY received_at DESC
       LIMIT 1`
  ).get(idOrSourceEventId, idOrSourceEventId, idOrSourceEventId);
  return row ? toLocalProjectionEvent(row) : null;
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

// packages/core/email-product.ts
var EMAIL_PRODUCT_EVENT_VERSION, EMAIL_WORKSPACE_BASE_DOMAINS, DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN, EMAIL_BRIDGE_STATUSES, EMAIL_BRIDGE_HEALTH_STATES, EMAIL_WORKSPACE_LIFECYCLE_STATES;
var init_email_product = __esm({
  "packages/core/email-product.ts"() {
    "use strict";
    EMAIL_PRODUCT_EVENT_VERSION = "2026-03-21";
    EMAIL_WORKSPACE_BASE_DOMAINS = [
      "meresmb.com",
      "mere.email",
      "bizpei.com",
      "mailpei.com",
      "peihub.com"
    ];
    DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN = EMAIL_WORKSPACE_BASE_DOMAINS[0];
    EMAIL_BRIDGE_STATUSES = ["connected", "disconnected"];
    EMAIL_BRIDGE_HEALTH_STATES = ["healthy", "degraded", "disconnected"];
    EMAIL_WORKSPACE_LIFECYCLE_STATES = [
      "trialing",
      "active",
      "grace",
      "deleted"
    ];
  }
});

// packages/core/json.ts
function defaultInvalidBodyMessage(options) {
  return options.invalidBodyMessage ?? "Invalid JSON body";
}
function parseJsonText(text, options = {}) {
  try {
    return JSON.parse(text);
  } catch {
    throw new JsonBoundaryError(options.invalidJsonMessage ?? "Invalid JSON", options.status ?? 400);
  }
}
function parseJsonWithSchema(schema, value, options = {}) {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  throw new JsonBoundaryError(
    result.error.issues[0]?.message ?? defaultInvalidBodyMessage(options),
    options.status ?? 400
  );
}
var JsonBoundaryError;
var init_json = __esm({
  "packages/core/json.ts"() {
    "use strict";
    JsonBoundaryError = class extends Error {
      status;
      constructor(message, status = 400) {
        super(message);
        this.name = "JsonBoundaryError";
        this.status = status;
      }
    };
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/curator.ts
function estimateTokens(text) {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}
function stripQuotedReplies(text) {
  if (!text) return text;
  let out = text;
  const onWroteRe = /^[ \t]*On[ \t][^\n]{0,400}\bwrote:\s*$/m;
  const onWrote = onWroteRe.exec(out);
  if (onWrote) out = out.slice(0, onWrote.index).trimEnd();
  const origRe = /^[-=]{3,}\s*(Original Message|Forwarded message)\s*[-=]{3,}\s*$/im;
  const orig = origRe.exec(out);
  if (orig) out = out.slice(0, orig.index).trimEnd();
  const sigRe = /^-- ?\s*$/m;
  const sig = sigRe.exec(out);
  if (sig) out = out.slice(0, sig.index).trimEnd();
  const kept = out.split("\n").filter((line) => !/^\s*>/.test(line));
  return kept.join("\n").trim();
}
function stripImageReferences(text) {
  if (!text) return text;
  return text.replace(/\[image:[^\]]*\]/gi, "").replace(/\[cid:[^\]]*\]/gi, "").replace(/\[Inline image[^\]]*\]/gi, "");
}
function stripUrlBoilerplate(text) {
  if (!text) return text;
  return text.replace(/\s+<(?:https?|ftp):\/\/?[^>\s]*>/gi, "").replace(/\s+<mailto:[^>\s]*>/gi, "");
}
function normalizeWhitespace(text) {
  if (!text) return "";
  return text.split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function clipToTokens(text, maxTokens) {
  if (!text) return "";
  if (maxTokens <= 0) return "";
  if (estimateTokens(text) <= maxTokens) return text;
  const targetChars = Math.max(20, maxTokens * 4);
  if (text.length <= targetChars) return text;
  let cut = text.lastIndexOf(" ", targetChars);
  if (cut < targetChars / 2) cut = targetChars;
  return `${text.slice(0, cut).trimEnd()} \u2026`;
}
function curateText(text, options = {}) {
  if (!text) return "";
  const stripQuoted = options.stripQuoted ?? true;
  const stripImages = options.stripImages ?? true;
  const stripUrls = options.stripUrls ?? true;
  const normalizeWs = options.normalizeWs ?? true;
  let out = text;
  if (stripImages) out = stripImageReferences(out);
  if (stripQuoted) out = stripQuotedReplies(out);
  if (stripUrls) out = stripUrlBoilerplate(out);
  if (normalizeWs) out = normalizeWhitespace(out);
  if (options.maxTokens != null) out = clipToTokens(out, options.maxTokens);
  return out;
}
function curateEmailThread(thread, options = {}) {
  const maxMessages = options.maxMessages ?? 12;
  const maxTokens = options.maxTokens ?? 1500;
  const perMessageCap = options.perMessageMaxTokens ?? Math.max(120, Math.floor(maxTokens / 3));
  const headerStyle = options.headerStyle ?? "minimal";
  const stripOpts = {
    stripQuoted: options.stripQuoted,
    stripImages: options.stripImages,
    stripUrls: options.stripUrls,
    normalizeWs: options.normalizeWs
  };
  const subjectLine = thread.subject ? `Subject: ${thread.subject}` : "Subject: (no subject)";
  const headerOverhead = estimateTokens(subjectLine) + 6;
  let remaining = Math.max(0, maxTokens - headerOverhead);
  const candidates = thread.messages.slice(-maxMessages);
  let truncated = candidates.length < thread.messages.length;
  const segments = [];
  let fitted = 0;
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const message = candidates[i];
    if (!message) continue;
    const cleanedBody = curateText(message.bodyText ?? "", {
      ...stripOpts,
      maxTokens: perMessageCap
    });
    const head = headerStyle === "full" ? [
      `[${(message.direction ?? "").toUpperCase()}] ${message.sentAt ?? ""}`,
      `From: ${formatFrom2(message)}`,
      `To: ${(message.toAddresses ?? []).join(", ")}`,
      message.subject ? `Subject: ${message.subject}` : null
    ].filter(Boolean).join("\n") : `[${(message.direction ?? "").toUpperCase()}] ${message.sentAt ?? ""} \u2014 ${formatFrom2(message)}`;
    const block = cleanedBody ? `${head}
${cleanedBody}` : head;
    const blockTokens = estimateTokens(block);
    if (blockTokens > remaining && segments.length > 0) {
      truncated = true;
      break;
    }
    segments.unshift(block);
    remaining -= blockTokens;
    fitted += 1;
  }
  const prompt = [subjectLine, "", segments.join("\n\n---\n\n")].join("\n");
  return {
    prompt,
    fittedMessages: fitted,
    estimatedTokens: estimateTokens(prompt),
    truncated
  };
}
function formatFrom2(message) {
  if (message.fromName && message.fromAddress) {
    return `${message.fromName} <${message.fromAddress}>`;
  }
  return message.fromAddress ?? message.fromName ?? "(unknown sender)";
}
var init_curator = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/curator.ts"() {
  }
});

// cli/local-store.ts
var local_store_exports = {};
__export(local_store_exports, {
  LocalEmailStore: () => LocalEmailStore
});
import { randomUUID as randomUUID4 } from "node:crypto";
function parseStringArray(value) {
  const parsed = parseJsonText(value);
  return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
}
function bool(value) {
  return value === 1;
}
function int(value) {
  return value ? 1 : 0;
}
function likeValue(value) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}
function compactSnippet(value, max = 240) {
  const compacted = (value ?? "").replace(/\s+/g, " ").trim();
  if (compacted.length <= max) return compacted;
  return `${compacted.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}
function makeId(prefix) {
  return `${prefix}_${randomUUID4().replaceAll("-", "").slice(0, 24)}`;
}
function mapMailbox(row) {
  return {
    id: row.id,
    address: row.address,
    displayName: row.display_name,
    type: row.type,
    visibility: row.visibility,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email
  };
}
function mapThread(row) {
  return {
    id: row.id,
    mailboxId: row.mailbox_id,
    subject: row.subject,
    participants: parseStringArray(row.participants_json),
    lastMessageAt: row.last_message_at,
    messageCount: row.message_count,
    isArchived: bool(row.is_archived),
    isStarred: bool(row.is_starred),
    isRead: bool(row.is_read),
    labels: parseStringArray(row.labels_json),
    snippet: row.snippet,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapAttachment(row) {
  return {
    id: row.id,
    messageId: row.message_id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    r2Key: row.r2_key,
    createdAt: row.created_at
  };
}
function mapExportAttachment(row) {
  return {
    ...mapAttachment(row),
    contentBase64: row.content_base64
  };
}
function mapMessage(row, attachments) {
  return {
    id: row.id,
    threadId: row.thread_id,
    mailboxId: row.mailbox_id,
    messageIdHeader: row.message_id_header,
    inReplyTo: row.in_reply_to,
    referencesHeader: row.references_header,
    fromAddress: row.from_address,
    fromName: row.from_name,
    toAddresses: parseStringArray(row.to_addresses_json),
    ccAddresses: parseStringArray(row.cc_addresses_json),
    bccAddresses: parseStringArray(row.bcc_addresses_json),
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    bodyR2Key: row.body_r2_key,
    direction: row.direction,
    isRead: bool(row.is_read),
    isStarred: bool(row.is_starred),
    sentAt: row.sent_at,
    providerMessageId: row.provider_message_id,
    attachmentCount: row.attachment_count,
    createdAt: row.created_at,
    attachments
  };
}
function mapPublication(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    mailboxId: row.mailbox_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    scope: row.scope,
    includeFutureMessages: bool(row.include_future_messages),
    publishedByUserId: row.published_by_user_id,
    publishedByEmail: row.published_by_email,
    publishedAt: row.published_at,
    revokedAt: row.revoked_at
  };
}
function buildSummaryPrompt(state) {
  const curated = curateEmailThread(
    {
      subject: state.thread.subject,
      messages: state.messages.map((message) => ({
        direction: message.direction,
        sentAt: message.sentAt,
        fromName: message.fromName,
        fromAddress: message.fromAddress,
        toAddresses: message.toAddresses,
        subject: message.subject,
        bodyText: message.bodyText
      }))
    },
    { maxTokens: 1500, maxMessages: 12, headerStyle: "minimal" }
  );
  return [
    "Summarize this email thread for the mailbox owner.",
    "Use concise bullets. Include open questions, promised follow-ups, deadlines, and who owes the next action.",
    "Do not invent facts that are not present in the messages.",
    "",
    curated.prompt
  ].join("\n");
}
var EMAIL_WORKSPACE_PAYLOAD_SCHEMA, LocalEmailStore;
var init_local_store = __esm({
  "cli/local-store.ts"() {
    "use strict";
    init_src();
    init_curator();
    init_email_product();
    init_json();
    EMAIL_WORKSPACE_PAYLOAD_SCHEMA = "mere.email.workspace-import.v1";
    LocalEmailStore = class _LocalEmailStore {
      constructor(config, dbPath, db) {
        this.config = config;
        this.dbPath = dbPath;
        this.db = db;
      }
      config;
      dbPath;
      db;
      static async open(config) {
        const plane = await openLocalPlaneDatabase(config);
        registerPlaneApp(plane.db, config.appId, "mere.email");
        registerPlaneTransferSchema(plane.db, config.appId, {
          payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA,
          displayName: "Email workspace transfer",
          description: "Portable mailbox, thread, message, and attachment metadata for local/cloud migration."
        });
        const store = new _LocalEmailStore(config, plane.dbPath, plane.db);
        store.ensureEmailSchema();
        return store;
      }
      close() {
        this.db.close();
      }
      info() {
        this.ensureEmailSchema();
        const count = (sql) => Number(this.db.prepare(sql).get().count);
        const inventory = getLocalPlaneInventory(this.db);
        return {
          ok: true,
          store: "local",
          ai: this.config.ai,
          cloudProjection: this.config.cloudProjection,
          dbPath: this.dbPath,
          workspaceCount: count("SELECT COUNT(*) AS count FROM email_local_workspaces"),
          planeAppCount: inventory.counts.apps,
          planeWorkspaceCount: inventory.counts.workspaces,
          transferCount: inventory.counts.transfers,
          aiJobCount: inventory.counts.aiJobs,
          mailboxCount: count("SELECT COUNT(*) AS count FROM email_local_mailboxes"),
          threadCount: count("SELECT COUNT(*) AS count FROM email_local_threads"),
          messageCount: count("SELECT COUNT(*) AS count FROM email_local_messages")
        };
      }
      getSetting(key) {
        this.ensureEmailSchema();
        const row = this.db.prepare("SELECT value FROM email_local_settings WHERE key = ?").get(key);
        return row?.value ?? null;
      }
      setSetting(key, value) {
        this.ensureEmailSchema();
        this.db.prepare(
          `INSERT INTO email_local_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).run(key, value, (/* @__PURE__ */ new Date()).toISOString());
      }
      countSealedEnvelopes(keyId) {
        this.ensureEmailSchema();
        const row = this.db.prepare("SELECT COUNT(*) AS count FROM email_local_sealed_envelopes WHERE key_id = ?").get(keyId);
        return Number(row.count);
      }
      countMirroredSealedEnvelopes(keyId) {
        this.ensureEmailSchema();
        const row = this.db.prepare(
          `SELECT COUNT(*) AS count
         FROM email_local_sealed_envelopes
         WHERE key_id = ? AND pushed_at IS NOT NULL AND deleted_at IS NULL`
        ).get(keyId);
        return Number(row.count);
      }
      countMessagesToSeal(keyId) {
        this.ensureEmailSchema();
        const row = this.db.prepare(
          `SELECT COUNT(*) AS count
         FROM email_local_messages m
         LEFT JOIN email_local_sealed_envelopes s
           ON s.message_id = m.id AND s.key_id = ?
         WHERE s.message_id IS NULL`
        ).get(keyId);
        return Number(row.count);
      }
      listMessagesToSeal(keyId, limit) {
        this.ensureEmailSchema();
        return this.db.prepare(
          `SELECT m.id, m.workspace_id, m.thread_id, m.mailbox_id, m.message_id_header,
                m.from_address, m.from_name, m.to_addresses_json, m.cc_addresses_json,
                m.bcc_addresses_json, m.subject, m.body_text, m.body_html, m.direction,
                m.sent_at, m.attachment_count
         FROM email_local_messages m
         LEFT JOIN email_local_sealed_envelopes s
           ON s.message_id = m.id AND s.key_id = ?
         WHERE s.message_id IS NULL
         ORDER BY m.sent_at ASC
         LIMIT ?`
        ).all(keyId, limit);
      }
      insertSealedEnvelope(input) {
        this.ensureEmailSchema();
        this.db.prepare(
          `INSERT INTO email_local_sealed_envelopes
           (message_id, key_id, workspace_id, thread_id, envelope_json, sealed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(message_id, key_id) DO UPDATE SET
           envelope_json = excluded.envelope_json,
           sealed_at = excluded.sealed_at`
        ).run(input.messageId, input.keyId, input.workspaceId, input.threadId, input.envelopeJson, (/* @__PURE__ */ new Date()).toISOString());
      }
      sampleSealedEnvelopes(keyId, limit) {
        this.ensureEmailSchema();
        return this.db.prepare(
          "SELECT message_id, envelope_json FROM email_local_sealed_envelopes WHERE key_id = ? ORDER BY sealed_at DESC LIMIT ?"
        ).all(keyId, limit).map((row) => ({
          messageId: row.message_id,
          envelopeJson: row.envelope_json
        }));
      }
      listSealedEnvelopes(input) {
        this.ensureEmailSchema();
        const clauses = ["key_id = ?", "deleted_at IS NULL"];
        const values = [input.keyId];
        if (input.workspaceId) {
          clauses.push("workspace_id = ?");
          values.push(input.workspaceId);
        }
        if (input.threadId) {
          clauses.push("thread_id = ?");
          values.push(input.threadId);
        }
        if (input.messageId) {
          clauses.push("message_id = ?");
          values.push(input.messageId);
        }
        values.push(input.limit);
        return this.db.prepare(
          `SELECT message_id, key_id, workspace_id, thread_id, envelope_json, remote_etag, sealed_at
         FROM email_local_sealed_envelopes
         WHERE ${clauses.join(" AND ")}
         ORDER BY sealed_at DESC
         LIMIT ?`
        ).all(...values).map((row) => ({
          messageId: row.message_id,
          keyId: row.key_id,
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          envelopeJson: row.envelope_json,
          remoteEtag: row.remote_etag,
          sealedAt: row.sealed_at
        }));
      }
      listSealedEnvelopesToPush(keyId, limit) {
        this.ensureEmailSchema();
        return this.db.prepare(
          `SELECT message_id, key_id, workspace_id, thread_id, envelope_json, remote_etag
         FROM email_local_sealed_envelopes
         WHERE key_id = ? AND pushed_at IS NULL
         ORDER BY sealed_at ASC
         LIMIT ?`
        ).all(keyId, limit).map((row) => ({
          messageId: row.message_id,
          keyId: row.key_id,
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          envelopeJson: row.envelope_json,
          remoteEtag: row.remote_etag
        }));
      }
      listMirroredSealedEnvelopes(keyId) {
        this.ensureEmailSchema();
        return this.db.prepare(
          `SELECT message_id, key_id, workspace_id, thread_id, envelope_json, remote_etag
         FROM email_local_sealed_envelopes
         WHERE key_id = ? AND pushed_at IS NOT NULL AND deleted_at IS NULL
         ORDER BY pushed_at ASC`
        ).all(keyId).map((row) => ({
          messageId: row.message_id,
          keyId: row.key_id,
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          envelopeJson: row.envelope_json,
          remoteEtag: row.remote_etag
        }));
      }
      markSealedEnvelopePushed(input) {
        this.ensureEmailSchema();
        this.db.prepare(
          `UPDATE email_local_sealed_envelopes
         SET pushed_at = ?, deleted_at = NULL, remote_etag = ?
         WHERE message_id = ? AND key_id = ?`
        ).run((/* @__PURE__ */ new Date()).toISOString(), input.remoteEtag ?? null, input.messageId, input.keyId);
      }
      markSealedEnvelopeUnmirrored(input) {
        this.ensureEmailSchema();
        this.db.prepare(
          `UPDATE email_local_sealed_envelopes
         SET pushed_at = NULL, deleted_at = ?, remote_etag = NULL
         WHERE message_id = ? AND key_id = ?`
        ).run((/* @__PURE__ */ new Date()).toISOString(), input.messageId, input.keyId);
      }
      listMailboxes(workspaceId) {
        this.ensureEmailSchema();
        const rows = this.db.prepare("SELECT * FROM email_local_mailboxes WHERE workspace_id = ? ORDER BY address ASC").all(workspaceId);
        return rows.map(mapMailbox);
      }
      exportWorkspace(workspaceId) {
        this.ensureEmailSchema();
        const workspace = this.db.prepare("SELECT * FROM email_local_workspaces WHERE workspace_id = ?").get(workspaceId);
        if (!workspace) {
          throw new Error(`Local workspace not found: ${workspaceId}`);
        }
        const mailboxes = this.db.prepare("SELECT * FROM email_local_mailboxes WHERE workspace_id = ? ORDER BY address ASC").all(workspaceId).map((mailbox) => ({
          id: mailbox.id,
          address: mailbox.address,
          displayName: mailbox.display_name,
          type: mailbox.type,
          visibility: mailbox.visibility,
          ownerUserId: mailbox.owner_user_id,
          ownerEmail: mailbox.owner_email
        }));
        const threadRows = this.db.prepare("SELECT * FROM email_local_threads WHERE workspace_id = ? ORDER BY last_message_at DESC").all(workspaceId);
        const threads = threadRows.map((threadRow) => {
          const messages = this.db.prepare("SELECT * FROM email_local_messages WHERE workspace_id = ? AND thread_id = ? ORDER BY sent_at ASC").all(workspaceId, threadRow.id).map(
            (message) => mapMessage(message, this.getExportAttachments(workspaceId, message.id))
          );
          return {
            thread: mapThread(threadRow),
            messages
          };
        });
        const payload = {
          tenantId: workspace.workspace_id,
          slug: workspace.slug,
          baseDomain: workspace.base_domain ?? DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN,
          mailboxes,
          threads
        };
        recordPlaneTransfer(this.db, {
          appId: this.config.appId,
          workspaceId,
          direction: "export",
          source: { data: this.config.data, ai: this.config.ai },
          payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA,
          payloadSha256: hashPlanePayload(payload)
        });
        return payload;
      }
      importWorkspace(payload, transfer = {}) {
        this.ensureEmailSchema();
        const now = isoNow2();
        const workspaceName = payload.slug;
        this.db.exec("BEGIN");
        try {
          upsertPlaneWorkspace(this.db, this.config.appId, {
            workspaceId: payload.tenantId,
            slug: payload.slug,
            name: workspaceName,
            dataPlane: this.config.data,
            aiPlane: this.config.ai
          });
          this.db.prepare(
            `INSERT INTO email_local_workspaces (workspace_id, slug, base_domain, imported_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(workspace_id) DO UPDATE SET
             slug = excluded.slug,
             base_domain = excluded.base_domain,
             imported_at = excluded.imported_at,
             updated_at = excluded.updated_at`
          ).run(payload.tenantId, payload.slug, payload.baseDomain ?? null, now, now);
          const upsertMailbox = this.db.prepare(
            `INSERT INTO email_local_mailboxes (
           id, workspace_id, address, display_name, type, visibility, owner_user_id, owner_email, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           address = excluded.address,
           display_name = excluded.display_name,
           type = excluded.type,
           visibility = excluded.visibility,
           owner_user_id = excluded.owner_user_id,
           owner_email = excluded.owner_email,
           updated_at = excluded.updated_at`
          );
          for (const mailbox of payload.mailboxes) {
            upsertMailbox.run(
              mailbox.id,
              payload.tenantId,
              mailbox.address,
              mailbox.displayName,
              mailbox.type,
              mailbox.visibility ?? "shared",
              mailbox.ownerUserId ?? null,
              mailbox.ownerEmail ?? null,
              now
            );
          }
          const upsertThread = this.db.prepare(
            `INSERT INTO email_local_threads (
           id, workspace_id, mailbox_id, subject, participants_json, last_message_at, message_count,
           is_archived, is_starred, is_read, labels_json, snippet, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           mailbox_id = excluded.mailbox_id,
           subject = excluded.subject,
           participants_json = excluded.participants_json,
           last_message_at = excluded.last_message_at,
           message_count = excluded.message_count,
           is_archived = excluded.is_archived,
           is_starred = excluded.is_starred,
           is_read = excluded.is_read,
           labels_json = excluded.labels_json,
           snippet = excluded.snippet,
           updated_at = excluded.updated_at`
          );
          const upsertMessage = this.db.prepare(
            `INSERT INTO email_local_messages (
           id, workspace_id, thread_id, mailbox_id, message_id_header, in_reply_to, references_header,
           from_address, from_name, to_addresses_json, cc_addresses_json, bcc_addresses_json, subject,
           body_text, body_html, body_r2_key, direction, is_read, is_starred, sent_at,
           provider_message_id, attachment_count, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           thread_id = excluded.thread_id,
           mailbox_id = excluded.mailbox_id,
           message_id_header = excluded.message_id_header,
           in_reply_to = excluded.in_reply_to,
           references_header = excluded.references_header,
           from_address = excluded.from_address,
           from_name = excluded.from_name,
           to_addresses_json = excluded.to_addresses_json,
           cc_addresses_json = excluded.cc_addresses_json,
           bcc_addresses_json = excluded.bcc_addresses_json,
           subject = excluded.subject,
           body_text = excluded.body_text,
           body_html = excluded.body_html,
           body_r2_key = excluded.body_r2_key,
           direction = excluded.direction,
           is_read = excluded.is_read,
           is_starred = excluded.is_starred,
           sent_at = excluded.sent_at,
           provider_message_id = excluded.provider_message_id,
           attachment_count = excluded.attachment_count`
          );
          const upsertAttachment = this.db.prepare(
            `INSERT INTO email_local_attachments (
           id, workspace_id, message_id, filename, mime_type, size_bytes, r2_key, content_base64, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           message_id = excluded.message_id,
           filename = excluded.filename,
           mime_type = excluded.mime_type,
           size_bytes = excluded.size_bytes,
           r2_key = excluded.r2_key,
           content_base64 = excluded.content_base64,
           created_at = excluded.created_at`
          );
          let messageCount = 0;
          for (const item of payload.threads) {
            upsertThread.run(
              item.thread.id,
              payload.tenantId,
              item.thread.mailboxId,
              item.thread.subject,
              json(item.thread.participants),
              item.thread.lastMessageAt,
              item.thread.messageCount,
              int(item.thread.isArchived),
              int(item.thread.isStarred),
              int(item.thread.isRead),
              json(item.thread.labels),
              item.thread.snippet,
              item.thread.createdAt,
              item.thread.updatedAt
            );
            for (const message of item.messages) {
              messageCount += 1;
              upsertMessage.run(
                message.id,
                payload.tenantId,
                message.threadId,
                message.mailboxId,
                message.messageIdHeader,
                message.inReplyTo,
                message.referencesHeader,
                message.fromAddress,
                message.fromName,
                json(message.toAddresses),
                json(message.ccAddresses),
                json(message.bccAddresses),
                message.subject,
                message.bodyText,
                message.bodyHtml,
                message.bodyR2Key,
                message.direction,
                int(message.isRead),
                int(message.isStarred),
                message.sentAt,
                message.providerMessageId,
                message.attachmentCount,
                message.createdAt
              );
              this.db.prepare("DELETE FROM email_local_attachments WHERE workspace_id = ? AND message_id = ?").run(payload.tenantId, message.id);
              for (const attachment of message.attachments) {
                upsertAttachment.run(
                  attachment.id,
                  payload.tenantId,
                  message.id,
                  attachment.filename,
                  attachment.mimeType,
                  attachment.sizeBytes,
                  attachment.r2Key,
                  attachment.contentBase64 ?? null,
                  attachment.createdAt
                );
              }
            }
          }
          recordPlaneTransfer(this.db, {
            appId: this.config.appId,
            workspaceId: payload.tenantId,
            direction: "import",
            source: transfer.source,
            destination: { data: this.config.data, ai: this.config.ai },
            payloadSchema: transfer.payloadSchema ?? EMAIL_WORKSPACE_PAYLOAD_SCHEMA,
            payloadSha256: transfer.payloadSha256 ?? hashPlanePayload(payload)
          });
          this.db.exec("COMMIT");
          return {
            ok: true,
            store: "local",
            workspaceId: payload.tenantId,
            slug: payload.slug,
            mailboxCount: payload.mailboxes.length,
            threadCount: payload.threads.length,
            messageCount
          };
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
      search(workspaceId, query, limit = 10) {
        this.ensureEmailSchema();
        const trimmed = query.trim();
        if (!trimmed) return [];
        const needle = likeValue(trimmed.toLowerCase());
        const threadRows = this.db.prepare(
          `SELECT DISTINCT t.*
         FROM email_local_threads AS t
         LEFT JOIN email_local_messages AS m
           ON m.thread_id = t.id AND m.workspace_id = t.workspace_id
         WHERE t.workspace_id = ?
           AND (
             LOWER(t.subject) LIKE ? ESCAPE '\\'
             OR LOWER(t.snippet) LIKE ? ESCAPE '\\'
             OR LOWER(m.subject) LIKE ? ESCAPE '\\'
             OR LOWER(COALESCE(m.body_text, '')) LIKE ? ESCAPE '\\'
             OR LOWER(m.from_address) LIKE ? ESCAPE '\\'
             OR LOWER(m.to_addresses_json) LIKE ? ESCAPE '\\'
           )
         ORDER BY t.last_message_at DESC
         LIMIT ?`
        ).all(workspaceId, needle, needle, needle, needle, needle, needle, limit);
        return threadRows.map((threadRow) => {
          const matches = this.db.prepare(
            `SELECT *
           FROM email_local_messages
           WHERE workspace_id = ?
             AND thread_id = ?
             AND (
               LOWER(subject) LIKE ? ESCAPE '\\'
               OR LOWER(COALESCE(body_text, '')) LIKE ? ESCAPE '\\'
               OR LOWER(from_address) LIKE ? ESCAPE '\\'
               OR LOWER(to_addresses_json) LIKE ? ESCAPE '\\'
             )
           ORDER BY sent_at DESC
           LIMIT 3`
          ).all(workspaceId, threadRow.id, needle, needle, needle, needle);
          return {
            thread: mapThread(threadRow),
            mailboxId: threadRow.mailbox_id,
            matches: matches.map((message) => ({
              messageId: message.id,
              fromAddress: message.from_address,
              subject: message.subject,
              sentAt: message.sent_at,
              snippet: compactSnippet(message.body_text ?? message.subject)
            }))
          };
        });
      }
      listLatestThreads(workspaceId, options = {}) {
        this.ensureEmailSchema();
        const limit = options.limit ?? 1;
        const rows = options.mailboxId ? this.db.prepare(
          `SELECT *
             FROM email_local_threads
             WHERE workspace_id = ?
               AND mailbox_id = ?
               AND (? = 1 OR is_archived = 0)
             ORDER BY last_message_at DESC
             LIMIT ?`
        ).all(workspaceId, options.mailboxId, options.includeArchived ? 1 : 0, limit) : this.db.prepare(
          `SELECT *
             FROM email_local_threads
             WHERE workspace_id = ?
               AND (? = 1 OR is_archived = 0)
             ORDER BY last_message_at DESC
             LIMIT ?`
        ).all(workspaceId, options.includeArchived ? 1 : 0, limit);
        return rows.map((row) => this.getThread(workspaceId, row.id));
      }
      listThreads(workspaceId, options = {}) {
        this.ensureEmailSchema();
        const limit = options.limit ?? 25;
        const offset = options.offset ?? 0;
        const rows = options.mailboxId ? this.db.prepare(
          `SELECT *
             FROM email_local_threads
             WHERE workspace_id = ?
               AND mailbox_id = ?
               AND (? = 1 OR is_archived = 0)
             ORDER BY last_message_at DESC
             LIMIT ? OFFSET ?`
        ).all(workspaceId, options.mailboxId, options.includeArchived ? 1 : 0, limit, offset) : this.db.prepare(
          `SELECT *
             FROM email_local_threads
             WHERE workspace_id = ?
               AND (? = 1 OR is_archived = 0)
             ORDER BY last_message_at DESC
             LIMIT ? OFFSET ?`
        ).all(workspaceId, options.includeArchived ? 1 : 0, limit, offset);
        return rows.map(mapThread);
      }
      getThread(workspaceId, threadId) {
        this.ensureEmailSchema();
        const thread = this.db.prepare("SELECT * FROM email_local_threads WHERE workspace_id = ? AND id = ?").get(workspaceId, threadId);
        if (!thread) {
          throw new Error(`Local thread not found: ${threadId}`);
        }
        const mailbox = this.db.prepare("SELECT * FROM email_local_mailboxes WHERE workspace_id = ? AND id = ?").get(workspaceId, thread.mailbox_id);
        if (!mailbox) {
          throw new Error(`Local mailbox not found: ${thread.mailbox_id}`);
        }
        const messages = this.db.prepare("SELECT * FROM email_local_messages WHERE workspace_id = ? AND thread_id = ? ORDER BY sent_at ASC").all(workspaceId, threadId);
        return {
          mailbox: mapMailbox(mailbox),
          thread: mapThread(thread),
          messages: messages.map((message) => mapMessage(message, this.getAttachments(workspaceId, message.id)))
        };
      }
      async summarizeThread(workspaceId, threadId, generate) {
        if (this.config.ai !== "local") {
          throw new Error("Local thread summaries require --ai local.");
        }
        const state = this.getThread(workspaceId, threadId);
        const prompt = buildSummaryPrompt(state);
        const jobId = makeId("aij");
        const now = isoNow2();
        this.db.prepare(
          `INSERT INTO mere_plane_ai_jobs (
           id, app_id, workspace_id, subject_type, subject_id, mode, model, status, input_json, created_at, updated_at
         )
         VALUES (?, ?, ?, 'email_thread', ?, 'local', NULL, 'running', ?, ?, ?)`
        ).run(jobId, this.config.appId, workspaceId, threadId, json({ prompt }), now, now);
        try {
          const output = await generate(prompt);
          this.db.prepare(
            `UPDATE mere_plane_ai_jobs
           SET status = 'done', model = ?, output_text = ?, updated_at = ?
           WHERE id = ?`
          ).run(output.model, output.text, isoNow2(), jobId);
          return {
            ok: true,
            store: "local",
            ai: "local",
            model: output.model,
            jobId,
            threadId,
            summary: output.text
          };
        } catch (error) {
          this.db.prepare(
            `UPDATE mere_plane_ai_jobs
           SET status = 'failed', error = ?, updated_at = ?
           WHERE id = ?`
          ).run(error instanceof Error ? error.message : String(error), isoNow2(), jobId);
          throw error;
        }
      }
      getPublication(workspaceId, publicationId) {
        this.ensureEmailSchema();
        const row = this.db.prepare("SELECT * FROM email_local_publications WHERE workspace_id = ? AND id = ?").get(workspaceId, publicationId);
        return row ? mapPublication(row) : null;
      }
      findPublicationForSelection(workspaceId, selection) {
        this.ensureEmailSchema();
        const messageId = selection.messageId ?? null;
        const scope = messageId ? "message" : "thread";
        const row = this.db.prepare(
          `SELECT *
         FROM email_local_publications
         WHERE workspace_id = ?
           AND thread_id = ?
           AND scope = ?
           AND ((? IS NULL AND message_id IS NULL) OR message_id = ?)
           AND include_future_messages = ?
         ORDER BY
           CASE WHEN revoked_at IS NULL THEN 0 ELSE 1 END ASC,
           updated_at DESC
         LIMIT 1`
        ).get(
          workspaceId,
          selection.threadId,
          scope,
          messageId,
          messageId,
          int(selection.includeFutureMessages)
        );
        return row ? mapPublication(row) : null;
      }
      recordPublicationProjection(workspaceId, publication, envelope2) {
        this.ensureEmailSchema();
        const now = isoNow2();
        this.db.prepare(
          `INSERT INTO email_local_publications (
           id, workspace_id, mailbox_id, thread_id, message_id, scope, include_future_messages,
           published_by_user_id, published_by_email, published_at, revoked_at, last_projected_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           mailbox_id = excluded.mailbox_id,
           thread_id = excluded.thread_id,
           message_id = excluded.message_id,
           scope = excluded.scope,
           include_future_messages = excluded.include_future_messages,
           published_by_user_id = excluded.published_by_user_id,
           published_by_email = excluded.published_by_email,
           published_at = excluded.published_at,
           revoked_at = excluded.revoked_at,
           last_projected_at = excluded.last_projected_at,
           updated_at = excluded.updated_at`
        ).run(
          publication.id,
          workspaceId,
          publication.mailboxId,
          publication.threadId,
          publication.messageId ?? null,
          publication.scope,
          int(publication.includeFutureMessages),
          publication.publishedByUserId,
          publication.publishedByEmail ?? null,
          publication.publishedAt,
          publication.revokedAt ?? null,
          now,
          now
        );
        recordLocalProjectionEnvelope(this.db, {
          appId: this.config.appId,
          source: "local-publish",
          envelope: envelope2
        });
      }
      getAttachments(workspaceId, messageId) {
        return this.db.prepare("SELECT * FROM email_local_attachments WHERE workspace_id = ? AND message_id = ? ORDER BY created_at ASC").all(workspaceId, messageId).map(mapAttachment);
      }
      getExportAttachments(workspaceId, messageId) {
        return this.db.prepare("SELECT * FROM email_local_attachments WHERE workspace_id = ? AND message_id = ? ORDER BY created_at ASC").all(workspaceId, messageId).map(mapExportAttachment);
      }
      ensureEmailSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_local_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_sealed_envelopes (
        message_id TEXT NOT NULL,
        key_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        envelope_json TEXT NOT NULL,
        sealed_at TEXT NOT NULL,
        pushed_at TEXT,
        deleted_at TEXT,
        remote_etag TEXT,
        PRIMARY KEY (message_id, key_id)
      );

      CREATE TABLE IF NOT EXISTS email_local_workspaces (
        workspace_id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        base_domain TEXT,
        imported_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_mailboxes (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        address TEXT NOT NULL,
        display_name TEXT,
        type TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'shared',
        owner_user_id TEXT,
        owner_email TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_threads (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        mailbox_id TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        participants_json TEXT NOT NULL DEFAULT '[]',
        last_message_at TEXT NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        is_starred INTEGER NOT NULL DEFAULT 0,
        is_read INTEGER NOT NULL DEFAULT 0,
        labels_json TEXT NOT NULL DEFAULT '[]',
        snippet TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_messages (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        mailbox_id TEXT NOT NULL,
        message_id_header TEXT,
        in_reply_to TEXT,
        references_header TEXT,
        from_address TEXT NOT NULL,
        from_name TEXT,
        to_addresses_json TEXT NOT NULL DEFAULT '[]',
        cc_addresses_json TEXT NOT NULL DEFAULT '[]',
        bcc_addresses_json TEXT NOT NULL DEFAULT '[]',
        subject TEXT NOT NULL DEFAULT '',
        body_text TEXT,
        body_html TEXT,
        body_r2_key TEXT,
        direction TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        is_starred INTEGER NOT NULL DEFAULT 0,
        sent_at TEXT NOT NULL,
        provider_message_id TEXT,
        attachment_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_attachments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        r2_key TEXT NOT NULL,
        content_base64 TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_local_publications (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        mailbox_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        message_id TEXT,
        scope TEXT NOT NULL CHECK (scope IN ('message', 'thread')),
        include_future_messages INTEGER NOT NULL DEFAULT 0,
        published_by_user_id TEXT NOT NULL,
        published_by_email TEXT,
        published_at TEXT NOT NULL,
        revoked_at TEXT,
        last_projected_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_email_local_threads_workspace
        ON email_local_threads(workspace_id, last_message_at DESC);
      CREATE INDEX IF NOT EXISTS idx_email_local_messages_thread
        ON email_local_messages(workspace_id, thread_id, sent_at ASC);
      CREATE INDEX IF NOT EXISTS idx_email_local_attachments_message
        ON email_local_attachments(workspace_id, message_id);
      CREATE INDEX IF NOT EXISTS idx_email_local_publications_thread
        ON email_local_publications(workspace_id, thread_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_email_local_sealed_push
        ON email_local_sealed_envelopes(key_id, pushed_at, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_email_local_sealed_thread
        ON email_local_sealed_envelopes(workspace_id, thread_id, key_id);
    `);
        const sealedColumns = this.db.prepare("PRAGMA table_info(email_local_sealed_envelopes)").all();
        const existingSealedColumns = new Set(sealedColumns.map((column) => column.name));
        if (!existingSealedColumns.has("pushed_at")) {
          this.db.prepare("ALTER TABLE email_local_sealed_envelopes ADD COLUMN pushed_at TEXT").run();
        }
        if (!existingSealedColumns.has("deleted_at")) {
          this.db.prepare("ALTER TABLE email_local_sealed_envelopes ADD COLUMN deleted_at TEXT").run();
        }
        if (!existingSealedColumns.has("remote_etag")) {
          this.db.prepare("ALTER TABLE email_local_sealed_envelopes ADD COLUMN remote_etag TEXT").run();
        }
      }
    };
  }
});

// cli/mere-email.ts
init_src();
init_projection();
import { createHash as createHash7, randomBytes as nodeRandomBytes } from "node:crypto";
import { chmod as chmod4, mkdir as mkdir4, readFile as readFile4, writeFile as writeFile3 } from "node:fs/promises";
import { dirname, resolve as resolvePath2 } from "node:path";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/mere-run.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, chmod, mkdtemp, rm } from "node:fs/promises";
import { createHash as createHash3 } from "node:crypto";
import https from "node:https";
import os2 from "node:os";
import path2 from "node:path";
import { spawn, spawnSync } from "node:child_process";
var DEFAULT_DMG_URL = "https://mere.run/releases/mere-run.dmg";
var DEFAULT_INSTALL_BIN = path2.join(os2.homedir(), ".local", "bin", "mere.run");
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
  for (const segment of pathValue.split(path2.delimiter)) {
    if (!segment) continue;
    const candidate = path2.join(segment, binary);
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
  mkdirSync(path2.dirname(installBin), { recursive: true });
  const tmp = await mkdtemp(path2.join(os2.tmpdir(), "mere-local-plane-run-"));
  const dmg = path2.join(tmp, "mere-run.dmg");
  const mount = path2.join(tmp, "mount");
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
    const installer = path2.join(mount, "install.sh");
    const install = spawnSync(installer, {
      encoding: "utf8",
      env: { ...process.env, ...env, MERERUN_INSTALL_BIN_DEST: installBin }
    });
    spawnSync("hdiutil", ["detach", mount, "-quiet"], { encoding: "utf8" });
    if (install.status !== 0) {
      throw new Error(install.stderr || install.stdout || "mere.run installer failed.");
    }
    await chmod(installBin, 493).catch(() => void 0);
    return installBin;
  } finally {
    await rm(tmp, { recursive: true, force: true });
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
    const child = spawn(bin, args, {
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

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
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
  util: () => util,
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
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
var ZodParsedType = util.arrayToEnum([
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

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
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
  const json2 = JSON.stringify(obj, null, 2);
  return json2.replace(/"([^"]+)":/g, "$1:");
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
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
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

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
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
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
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
          util.assertNever(issue.validation);
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
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path7, errorMaps, issueData } = params;
  const fullPath = [...path7, ...issueData.path || []];
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

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path7, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path7;
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
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
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
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
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
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
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
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
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
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
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
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
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
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
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
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
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
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
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
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
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
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
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
  _parse(input) {
    return OK(input.data);
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
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
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
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
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
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
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
    for (const key of util.objectKeys(mask)) {
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
    for (const key of util.objectKeys(this.shape)) {
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
    for (const key of util.objectKeys(this.shape)) {
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
    for (const key of util.objectKeys(this.shape)) {
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
    return createZodEnum(util.objectKeys(this.shape));
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
    return util.objectValues(type.enum);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
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
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
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
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
    util.assertNever(effect);
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
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
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
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
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
  _parse(input) {
    const { ctx } = this._processInputParams(input);
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
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
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
  _parse(input) {
    const result = this._def.innerType._parse(input);
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

// packages/core/contracts/internal.ts
init_email_product();
var nonEmptyString = (label) => external_exports.string().trim().min(1, `${label} is required.`);
var optionalNullableString = external_exports.string().trim().nullable().optional();
var mailboxLocalPartSchema = external_exports.string().trim().min(1, "mailboxLocalPart is required.").max(64, "mailboxLocalPart must be 64 characters or fewer.").regex(
  /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/i,
  "mailboxLocalPart may only contain letters, numbers, dots, underscores, plus, and hyphen."
).transform((value) => value.toLowerCase());
var EmailRoutingStatusSchema = external_exports.enum(["pending", "ready", "failed"]);
var EmailBridgeStatusSchema = external_exports.enum(EMAIL_BRIDGE_STATUSES);
var EmailBridgeHealthSchema = external_exports.enum(EMAIL_BRIDGE_HEALTH_STATES);
var EmailWorkspaceBaseDomainSchema = external_exports.enum(EMAIL_WORKSPACE_BASE_DOMAINS);
var EmailWorkspaceLifecycleStateSchema = external_exports.enum(
  EMAIL_WORKSPACE_LIFECYCLE_STATES
);
var EmailWorkspaceProvisionInputBaseSchema = external_exports.object({
  tenantId: nonEmptyString("tenantId"),
  slug: nonEmptyString("slug"),
  baseDomain: external_exports.string().trim().default(DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN),
  name: nonEmptyString("name"),
  organizationId: nonEmptyString("organizationId"),
  callbackUrl: nonEmptyString("callbackUrl"),
  callbackBearerToken: nonEmptyString("callbackBearerToken"),
  mailboxAddress: external_exports.string().trim().optional(),
  lifecycleState: EmailWorkspaceLifecycleStateSchema.optional(),
  trialEndsAt: optionalNullableString,
  graceEndsAt: optionalNullableString,
  activatedAt: optionalNullableString,
  deletionScheduledAt: optionalNullableString
});
var EmailWorkspaceLifecycleResponseSchema = external_exports.object({
  externalAccountId: nonEmptyString("externalAccountId"),
  externalWorkspaceId: nonEmptyString("externalWorkspaceId"),
  canonicalUrl: nonEmptyString("canonicalUrl"),
  status: EmailBridgeStatusSchema,
  health: EmailBridgeHealthSchema,
  lastError: external_exports.string().trim().nullable()
});
var EmailWorkspaceSyncRequestBaseSchema = external_exports.object({
  tenantId: nonEmptyString("tenantId"),
  callbackUrl: optionalNullableString,
  callbackBearerToken: optionalNullableString,
  lifecycleState: EmailWorkspaceLifecycleStateSchema.optional(),
  trialEndsAt: optionalNullableString,
  graceEndsAt: optionalNullableString,
  activatedAt: optionalNullableString,
  deletionScheduledAt: optionalNullableString
});
var EmailWorkspaceDeleteResultSchema = external_exports.object({
  deleted: external_exports.boolean()
});
var EmailImportMailboxSchema = external_exports.object({
  id: nonEmptyString("id"),
  address: nonEmptyString("address"),
  displayName: external_exports.string().trim().nullable(),
  type: nonEmptyString("type"),
  visibility: external_exports.enum(["shared", "personal"]).default("shared"),
  ownerUserId: external_exports.string().trim().nullable().optional(),
  ownerEmail: external_exports.string().trim().nullable().optional()
});
var EmailImportThreadSchema = external_exports.object({
  id: nonEmptyString("id"),
  mailboxId: nonEmptyString("mailboxId"),
  subject: external_exports.string(),
  participants: external_exports.array(nonEmptyString("participants")),
  lastMessageAt: nonEmptyString("lastMessageAt"),
  messageCount: external_exports.number().int().nonnegative(),
  isArchived: external_exports.boolean(),
  isStarred: external_exports.boolean(),
  isRead: external_exports.boolean(),
  labels: external_exports.array(external_exports.string()),
  snippet: external_exports.string(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt")
});
var EmailImportAttachmentSchema = external_exports.object({
  id: nonEmptyString("id"),
  messageId: nonEmptyString("messageId"),
  filename: nonEmptyString("filename"),
  mimeType: external_exports.string().trim().nullable(),
  sizeBytes: external_exports.number().int().nonnegative(),
  r2Key: nonEmptyString("r2Key"),
  createdAt: nonEmptyString("createdAt"),
  contentBase64: external_exports.string().trim().nullable().optional()
});
var EmailImportMessageSchema = external_exports.object({
  id: nonEmptyString("id"),
  threadId: nonEmptyString("threadId"),
  mailboxId: nonEmptyString("mailboxId"),
  messageIdHeader: external_exports.string().trim().nullable(),
  inReplyTo: external_exports.string().trim().nullable(),
  referencesHeader: external_exports.string().trim().nullable(),
  fromAddress: nonEmptyString("fromAddress"),
  fromName: external_exports.string().trim().nullable(),
  toAddresses: external_exports.array(nonEmptyString("toAddresses")),
  ccAddresses: external_exports.array(external_exports.string()),
  bccAddresses: external_exports.array(external_exports.string()),
  subject: external_exports.string(),
  bodyText: external_exports.string().nullable(),
  bodyHtml: external_exports.string().nullable(),
  bodyR2Key: external_exports.string().trim().nullable(),
  direction: external_exports.enum(["inbound", "outbound"]),
  isRead: external_exports.boolean(),
  isStarred: external_exports.boolean(),
  sentAt: nonEmptyString("sentAt"),
  providerMessageId: external_exports.string().trim().nullable(),
  attachmentCount: external_exports.number().int().nonnegative(),
  createdAt: nonEmptyString("createdAt"),
  attachments: external_exports.array(EmailImportAttachmentSchema).default([])
});
var EmailImportThreadExportSchema = external_exports.object({
  thread: EmailImportThreadSchema,
  messages: external_exports.array(EmailImportMessageSchema).default([])
});
var EmailWorkspaceImportRequestBaseSchema = external_exports.object({
  tenantId: nonEmptyString("tenantId"),
  slug: nonEmptyString("slug"),
  baseDomain: nonEmptyString("baseDomain").default(DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN),
  mailboxes: external_exports.array(EmailImportMailboxSchema).default([]),
  threads: external_exports.array(EmailImportThreadExportSchema).default([])
});
var EmailWorkspaceImportRequestSchema = EmailWorkspaceImportRequestBaseSchema;
var EmailWorkspaceImportRunStatusSchema = external_exports.enum([
  "queued",
  "staging",
  "finalizing",
  "completed",
  "failed"
]);
var DomainRegistrationStateSchema = external_exports.enum([
  "pending",
  "registered",
  "zone_pending",
  "zone_active",
  "provisioned",
  "failed"
]);
var DomainContactSchema = external_exports.object({
  firstName: nonEmptyString("firstName"),
  lastName: nonEmptyString("lastName"),
  email: external_exports.string().trim().email("email must be valid."),
  phone: nonEmptyString("phone"),
  address1: nonEmptyString("address1"),
  city: nonEmptyString("city"),
  state: nonEmptyString("state"),
  postalCode: nonEmptyString("postalCode"),
  country: external_exports.string().trim().length(2, "country must be a 2-letter country code.").transform((value) => value.toUpperCase())
});
var DomainPriceSchema = external_exports.object({
  amount: nonEmptyString("amount"),
  currency: nonEmptyString("currency")
});
var DomainRegistrarProviderSchema = external_exports.enum(["opensrs", "cloudflare"]);
var DomainSearchResultSchema = external_exports.object({
  domain: nonEmptyString("domain"),
  available: external_exports.boolean(),
  registrar: DomainRegistrarProviderSchema,
  price: DomainPriceSchema.optional(),
  reason: external_exports.string().trim().optional(),
  tier: external_exports.string().trim().optional(),
  responseCode: external_exports.string().trim().optional(),
  responseText: external_exports.string().trim().optional()
});
var DomainRegisterInputSchema = external_exports.object({
  organizationId: nonEmptyString("organizationId"),
  workspaceId: nonEmptyString("workspaceId"),
  domain: nonEmptyString("domain"),
  mailboxLocalPart: mailboxLocalPartSchema,
  period: external_exports.number().int().min(1).max(10).default(1),
  contact: DomainContactSchema
});
var DomainRegistrationStatusSchema = external_exports.object({
  id: nonEmptyString("id"),
  workspaceId: external_exports.string().trim().nullable(),
  organizationId: nonEmptyString("organizationId"),
  domain: nonEmptyString("domain"),
  registrar: DomainRegistrarProviderSchema,
  status: DomainRegistrationStateSchema,
  opensrsOrderId: external_exports.string().trim().nullable(),
  cfZoneId: external_exports.string().trim().nullable(),
  cfNameservers: external_exports.array(nonEmptyString("cfNameservers")).default([]),
  contact: DomainContactSchema,
  registrationPeriod: external_exports.number().int().min(1),
  priceAmount: external_exports.string().trim().nullable(),
  priceCurrency: external_exports.string().trim().nullable(),
  requestedMailboxAddress: external_exports.string().trim().nullable(),
  error: external_exports.string().trim().nullable(),
  lastStep: external_exports.string().trim().nullable(),
  registeredAt: external_exports.string().trim().nullable(),
  zoneCreatedAt: external_exports.string().trim().nullable(),
  zoneActivatedAt: external_exports.string().trim().nullable(),
  provisionedAt: external_exports.string().trim().nullable(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt")
});
var DomainTransferRequestStatusSchema = external_exports.enum([
  "requested",
  "in_progress",
  "completed",
  "rejected",
  "cancelled"
]);
var DomainTransferRequestSchema = external_exports.object({
  id: nonEmptyString("id"),
  workspaceId: nonEmptyString("workspaceId"),
  domainRegistrationId: nonEmptyString("domainRegistrationId"),
  organizationId: nonEmptyString("organizationId"),
  domain: nonEmptyString("domain"),
  registrarProvider: DomainRegistrarProviderSchema,
  status: DomainTransferRequestStatusSchema,
  requestedByUserId: nonEmptyString("requestedByUserId"),
  requestedByEmail: external_exports.string().trim().email("requestedByEmail must be valid."),
  requestedByName: external_exports.string().trim().nullable(),
  requestNote: external_exports.string().trim().nullable(),
  resolutionNote: external_exports.string().trim().nullable(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt"),
  startedAt: external_exports.string().trim().nullable(),
  completedAt: external_exports.string().trim().nullable(),
  rejectedAt: external_exports.string().trim().nullable(),
  cancelledAt: external_exports.string().trim().nullable()
});
var DomainContactPrefillResponseSchema = external_exports.object({
  contact: DomainContactSchema.partial(),
  source: external_exports.object({
    workspaceName: external_exports.string().trim().nullable().optional(),
    organizationName: external_exports.string().trim().nullable().optional(),
    ownerEmail: external_exports.string().trim().nullable().optional(),
    ownerName: external_exports.string().trim().nullable().optional()
  }).optional()
});
var EmailWorkspaceImportStatusSchema = external_exports.object({
  runId: nonEmptyString("runId"),
  workspaceId: nonEmptyString("workspaceId"),
  tenantId: nonEmptyString("tenantId"),
  status: EmailWorkspaceImportRunStatusSchema,
  error: external_exports.string().trim().nullable(),
  requestedMailboxes: external_exports.number().int().nonnegative(),
  requestedThreads: external_exports.number().int().nonnegative(),
  requestedMessages: external_exports.number().int().nonnegative(),
  requestedAttachments: external_exports.number().int().nonnegative(),
  importedMailboxes: external_exports.number().int().nonnegative(),
  importedThreads: external_exports.number().int().nonnegative(),
  importedMessages: external_exports.number().int().nonnegative(),
  importedAttachments: external_exports.number().int().nonnegative(),
  stagedBlobCount: external_exports.number().int().nonnegative(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt"),
  startedAt: external_exports.string().trim().nullable(),
  completedAt: external_exports.string().trim().nullable()
});

// cli/mere-email.ts
init_email_product();
init_json();

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/client.ts
import { spawn as spawn2 } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/session.ts
import { chmod as chmod2, mkdir as mkdir2, readFile, rm as rm2, writeFile } from "node:fs/promises";
import os3 from "node:os";
import path3 from "node:path";
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
  await mkdir2(paths.stateDir, { recursive: true });
  await writeFile(paths.sessionFile, `${JSON.stringify(input.session, null, 2)}
`, "utf8");
  await chmod2(paths.sessionFile, 384).catch(() => void 0);
}
async function clearCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    await rm2(paths.sessionFile, { force: true });
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/client.ts
function maybeOpenBrowser(url) {
  try {
    if (process.platform === "darwin") {
      const child2 = spawn2("open", [url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    if (process.platform === "win32") {
      const child2 = spawn2("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    const child = spawn2("xdg-open", [url], { detached: true, stdio: "ignore" });
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

// cli/client.ts
init_email_product();
init_json();

// packages/core/internal-rpc.ts
init_json();
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function buildBearerHeaders(token, headers = {}) {
  const next = new Headers(headers);
  next.set("authorization", `Bearer ${token}`);
  return next;
}
function parseRpcErrorPayload(value) {
  if (!isRecord3(value)) return null;
  if (!isRecord3(value.error)) return null;
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") {
    return null;
  }
  return {
    code: value.error.code,
    message: value.error.message,
    ...Object.prototype.hasOwnProperty.call(value.error, "details") ? { details: value.error.details } : {}
  };
}

// cli/client.ts
var CliError = class extends Error {
  exitCode;
  constructor(message, exitCode2 = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode2;
  }
};
function normalizeBaseUrl2(baseUrl) {
  const url = new URL(baseUrl);
  return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function expectRecord(value, label) {
  if (!isRecord4(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}
function expectString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
function expectNullableString(value, label) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
  return value;
}
function expectBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}
function expectNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
}
function expectArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}
function expectStringArray(value, label) {
  return expectArray(value, label).map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(`${label} must be an array of strings`);
    }
    return entry;
  });
}
function parseLifecycleState(value, label) {
  const state = expectString(value, label);
  if (!EMAIL_WORKSPACE_LIFECYCLE_STATES.includes(state)) {
    throw new Error(
      `${label} must be one of ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}`
    );
  }
  return state;
}
function parseMailbox(value) {
  const record = expectRecord(value, "mailbox");
  return {
    id: expectString(record.id, "mailbox.id"),
    address: expectString(record.address, "mailbox.address"),
    displayName: expectNullableString(record.displayName, "mailbox.displayName"),
    type: expectString(record.type, "mailbox.type"),
    visibility: record.visibility === "personal" ? "personal" : "shared",
    ownerUserId: expectNullableString(record.ownerUserId, "mailbox.ownerUserId"),
    ownerEmail: expectNullableString(record.ownerEmail, "mailbox.ownerEmail")
  };
}
function parseThread(value) {
  const record = expectRecord(value, "thread");
  return {
    id: expectString(record.id, "thread.id"),
    mailboxId: expectString(record.mailboxId, "thread.mailboxId"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    participants: expectStringArray(record.participants, "thread.participants"),
    lastMessageAt: expectString(record.lastMessageAt, "thread.lastMessageAt"),
    messageCount: expectNumber(record.messageCount, "thread.messageCount"),
    isArchived: expectBoolean(record.isArchived, "thread.isArchived"),
    isStarred: expectBoolean(record.isStarred, "thread.isStarred"),
    isRead: expectBoolean(record.isRead, "thread.isRead"),
    labels: expectStringArray(record.labels, "thread.labels"),
    snippet: typeof record.snippet === "string" ? record.snippet : "",
    createdAt: expectString(record.createdAt, "thread.createdAt"),
    updatedAt: expectString(record.updatedAt, "thread.updatedAt")
  };
}
function parseAttachment(value) {
  const record = expectRecord(value, "attachment");
  return {
    id: expectString(record.id, "attachment.id"),
    messageId: expectString(record.messageId, "attachment.messageId"),
    filename: expectString(record.filename, "attachment.filename"),
    mimeType: expectNullableString(record.mimeType, "attachment.mimeType"),
    sizeBytes: expectNumber(record.sizeBytes, "attachment.sizeBytes"),
    r2Key: expectString(record.r2Key, "attachment.r2Key"),
    createdAt: expectString(record.createdAt, "attachment.createdAt")
  };
}
function parseMessage(value) {
  const record = expectRecord(value, "message");
  const direction = expectString(record.direction, "message.direction");
  if (direction !== "inbound" && direction !== "outbound") {
    throw new Error("message.direction must be inbound or outbound");
  }
  return {
    id: expectString(record.id, "message.id"),
    threadId: expectString(record.threadId, "message.threadId"),
    mailboxId: expectString(record.mailboxId, "message.mailboxId"),
    messageIdHeader: expectNullableString(record.messageIdHeader, "message.messageIdHeader"),
    inReplyTo: expectNullableString(record.inReplyTo, "message.inReplyTo"),
    referencesHeader: expectNullableString(
      record.referencesHeader,
      "message.referencesHeader"
    ),
    fromAddress: expectString(record.fromAddress, "message.fromAddress"),
    fromName: expectNullableString(record.fromName, "message.fromName"),
    toAddresses: expectStringArray(record.toAddresses, "message.toAddresses"),
    ccAddresses: expectStringArray(record.ccAddresses, "message.ccAddresses"),
    bccAddresses: expectStringArray(record.bccAddresses, "message.bccAddresses"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    bodyText: expectNullableString(record.bodyText, "message.bodyText"),
    bodyHtml: expectNullableString(record.bodyHtml, "message.bodyHtml"),
    bodyR2Key: expectNullableString(record.bodyR2Key, "message.bodyR2Key"),
    direction,
    isRead: expectBoolean(record.isRead, "message.isRead"),
    isStarred: expectBoolean(record.isStarred, "message.isStarred"),
    sentAt: expectString(record.sentAt, "message.sentAt"),
    providerMessageId: expectNullableString(record.providerMessageId, "message.providerMessageId"),
    attachmentCount: expectNumber(record.attachmentCount, "message.attachmentCount"),
    createdAt: expectString(record.createdAt, "message.createdAt"),
    attachments: expectArray(record.attachments ?? [], "message.attachments").map(parseAttachment)
  };
}
function parseBootstrapPayload(value) {
  const record = expectRecord(value, "bootstrap payload");
  return {
    lifecycleState: parseLifecycleState(record.lifecycleState, "lifecycleState"),
    trialEndsAt: expectNullableString(record.trialEndsAt, "trialEndsAt"),
    graceEndsAt: expectNullableString(record.graceEndsAt, "graceEndsAt"),
    activatedAt: expectNullableString(record.activatedAt, "activatedAt"),
    deletionScheduledAt: expectNullableString(
      record.deletionScheduledAt,
      "deletionScheduledAt"
    ),
    readonlyReason: expectNullableString(record.readonlyReason, "readonlyReason"),
    mailboxes: expectArray(record.mailboxes, "mailboxes").map(parseMailbox),
    defaultMailboxId: expectNullableString(record.defaultMailboxId, "defaultMailboxId"),
    defaultMailboxAddress: expectNullableString(
      record.defaultMailboxAddress,
      "defaultMailboxAddress"
    ),
    unreadCount: expectNumber(record.unreadCount, "unreadCount"),
    canRunAgentMail: expectBoolean(record.canRunAgentMail, "canRunAgentMail")
  };
}
function parseMailboxesPayload(value) {
  const record = expectRecord(value, "mailboxes payload");
  return expectArray(record.mailboxes, "mailboxes").map(parseMailbox);
}
function parseSearchMatch(value) {
  const record = expectRecord(value, "search match");
  return {
    messageId: expectString(record.messageId, "match.messageId"),
    fromAddress: expectString(record.fromAddress, "match.fromAddress"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    sentAt: expectString(record.sentAt, "match.sentAt"),
    snippet: typeof record.snippet === "string" ? record.snippet : ""
  };
}
function parseSearchResult(value) {
  const record = expectRecord(value, "search result");
  return {
    thread: parseThread(record.thread),
    mailboxId: expectString(record.mailboxId, "result.mailboxId"),
    matches: expectArray(record.matches, "result.matches").map(parseSearchMatch)
  };
}
function parseSearchResultsPayload(value) {
  const record = expectRecord(value, "search payload");
  return expectArray(record.results, "results").map(parseSearchResult);
}
function parseThreadState(value) {
  const record = expectRecord(value, "thread payload");
  return {
    mailbox: parseMailbox(record.mailbox),
    thread: parseThread(record.thread),
    messages: expectArray(record.messages, "messages").map(parseMessage)
  };
}
function parseThreadList(value) {
  const record = expectRecord(value, "thread list payload");
  return {
    mailboxId: expectString(record.mailboxId, "thread list mailboxId"),
    threads: expectArray(record.threads, "threads").map(parseThread),
    latestThreadAt: expectNullableString(record.latestThreadAt, "latestThreadAt")
  };
}
function parseThreadActionResult(value) {
  const record = expectRecord(value, "thread action payload");
  return {
    thread: parseThread(record.thread),
    envelope: record.envelope,
    productEvent: record.productEvent,
    delivery: record.delivery
  };
}
function parseSendResult(value) {
  const record = expectRecord(value, "send payload");
  return {
    threadId: expectString(record.threadId, "threadId"),
    messageId: expectString(record.messageId, "messageId"),
    providerMessageId: expectNullableString(record.providerMessageId, "providerMessageId"),
    envelope: record.envelope,
    productEvent: record.productEvent,
    delivery: record.delivery
  };
}
function parseDisconnectResult(value) {
  const record = expectRecord(value, "disconnect payload");
  return {
    disconnected: expectBoolean(record.disconnected, "disconnected")
  };
}
function parseWorkspaceExportPayload(value) {
  parseJsonWithSchema(EmailWorkspaceImportRequestSchema, value, {
    invalidBodyMessage: "Email workspace export payload is invalid."
  });
  return value;
}
function parseInboundResult(value) {
  const record = expectRecord(value, "inbound payload");
  const externalObjectType = record.externalObjectType;
  if (externalObjectType !== null && externalObjectType !== void 0 && externalObjectType !== "mailbox" && externalObjectType !== "thread" && externalObjectType !== "message") {
    throw new Error(
      "externalObjectType must be mailbox, thread, message, or null"
    );
  }
  const normalizedExternalObjectType = externalObjectType === void 0 ? null : externalObjectType;
  return {
    accepted: expectBoolean(record.accepted, "accepted"),
    scenarioId: expectNullableString(record.scenarioId, "scenarioId"),
    sourceEventId: expectNullableString(record.sourceEventId, "sourceEventId"),
    externalObjectType: normalizedExternalObjectType,
    externalObjectId: expectNullableString(record.externalObjectId, "externalObjectId"),
    canonicalUrl: expectNullableString(record.canonicalUrl, "canonicalUrl"),
    workspaceResponse: record.workspaceResponse
  };
}
function parseSealedEnvelopePushResult(value) {
  const record = expectRecord(value, "sealed envelope push payload");
  return {
    ok: true,
    messageId: expectString(record.messageId, "messageId"),
    keyId: expectString(record.keyId, "keyId"),
    etag: expectString(record.etag, "etag")
  };
}
function parseSealedEnvelopeDeleteResult(value) {
  const record = expectRecord(value, "sealed envelope delete payload");
  return {
    ok: true,
    deleted: expectNumber(record.deleted, "deleted")
  };
}
function parseCustodyKeyGrant(value) {
  const record = expectRecord(value, "custody key grant response");
  const grant = expectRecord(record.grant, "custody key grant");
  const alg = expectString(grant.alg, "alg");
  if (alg !== "ECDH-P256-HKDF-SHA256-A256GCM") {
    throw new Error("custody key grant uses an unsupported algorithm");
  }
  const status = expectString(grant.status, "status");
  if (!["pending", "approved", "claimed", "expired", "revoked"].includes(status)) {
    throw new Error("custody key grant status is invalid");
  }
  const grantStatus = status;
  return {
    id: expectString(grant.id, "id"),
    workspaceId: expectString(grant.workspaceId, "workspaceId"),
    tenantId: expectString(grant.tenantId, "tenantId"),
    userId: expectString(grant.userId, "userId"),
    deviceCode: expectString(grant.deviceCode, "deviceCode"),
    alg,
    publicKeyJwk: expectRecord(grant.publicKeyJwk, "publicKeyJwk"),
    keyId: expectNullableString(grant.keyId, "keyId"),
    status: grantStatus,
    expiresAt: expectString(grant.expiresAt, "expiresAt"),
    createdAt: expectString(grant.createdAt, "createdAt"),
    updatedAt: expectString(grant.updatedAt, "updatedAt"),
    approvedAt: expectNullableString(grant.approvedAt, "approvedAt"),
    claimedAt: expectNullableString(grant.claimedAt, "claimedAt")
  };
}
function passthroughJson(value) {
  return value;
}
async function parseErrorMessage(response) {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`.trim();
  }
  try {
    const payload = parseJsonText(text, { invalidJsonMessage: "Invalid error response JSON." });
    const rpcError = parseRpcErrorPayload(payload);
    if (rpcError) {
      return rpcError.message;
    }
    if (isRecord4(payload) && typeof payload.error === "string") {
      return payload.error;
    }
    return text;
  } catch {
    return text;
  }
}
function filenameFromContentDisposition(value) {
  if (!value) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const quotedMatch = /filename="([^"]+)"/i.exec(value);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = /filename=([^;]+)/i.exec(value);
  return plainMatch?.[1]?.trim() ?? null;
}
var EmailCliClient = class {
  baseUrl;
  token;
  fetchImpl;
  constructor(options) {
    this.baseUrl = normalizeBaseUrl2(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }
  async workspaceBootstrap(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/bootstrap"),
      {},
      { parser: parseBootstrapPayload }
    );
  }
  async provisionWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "provision"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceLifecycleResponseSchema, value, {
          invalidBodyMessage: "Workspace lifecycle response is invalid."
        })
      }
    );
  }
  async syncWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "sync"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceLifecycleResponseSchema, value, {
          invalidBodyMessage: "Workspace lifecycle response is invalid."
        })
      }
    );
  }
  async disconnectWorkspace(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "connection"),
      { method: "DELETE" },
      { parser: parseDisconnectResult }
    );
  }
  async pushSealedEnvelope(workspaceId, envelope2) {
    return this.request(
      this.workspacePath(workspaceId, "projections/email/sealed"),
      {
        method: "POST",
        body: JSON.stringify({
          type: "email.sealed_envelope.v1",
          envelope: envelope2
        })
      },
      { parser: parseSealedEnvelopePushResult }
    );
  }
  async deleteSealedEnvelopeMirror(workspaceId, input) {
    const params = new URLSearchParams({ keyId: input.keyId });
    const suffix = input.messageId ? `projections/email/sealed/${encodeURIComponent(input.messageId)}?${params.toString()}` : `projections/email/sealed?${params.toString()}`;
    return this.request(
      this.workspacePath(workspaceId, suffix),
      { method: "DELETE" },
      { parser: parseSealedEnvelopeDeleteResult }
    );
  }
  async readCustodyKeyGrant(deviceCode) {
    return this.request(
      `/api/cli/v1/custody/grants/${encodeURIComponent(deviceCode)}`,
      {},
      { parser: parseCustodyKeyGrant, useRpcEnvelope: false }
    );
  }
  async approveCustodyKeyGrant(deviceCode, input) {
    return this.request(
      `/api/cli/v1/custody/grants/${encodeURIComponent(deviceCode)}`,
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: parseCustodyKeyGrant, useRpcEnvelope: false }
    );
  }
  async listMailboxes(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/mailboxes"),
      {},
      { parser: parseMailboxesPayload }
    );
  }
  async searchThreads(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/search"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: parseSearchResultsPayload }
    );
  }
  async listThreads(workspaceId, input = {}) {
    const params = new URLSearchParams();
    if (input.mailboxId) params.set("mailboxId", input.mailboxId);
    if (input.limit != null) params.set("limit", input.limit.toString());
    if (input.offset != null) params.set("offset", input.offset.toString());
    if (input.archived) params.set("archived", "true");
    const suffix = params.toString() ? `agent-mail/threads?${params.toString()}` : "agent-mail/threads";
    return this.request(
      this.workspacePath(workspaceId, suffix),
      {},
      { parser: parseThreadList }
    );
  }
  async showThread(workspaceId, threadId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/threads/${encodeURIComponent(threadId)}`
      ),
      {},
      { parser: parseThreadState }
    );
  }
  async downloadAttachment(workspaceId, attachmentId) {
    if (!this.token) {
      throw new CliError("This command requires `mere-email auth login` or MERE_EMAIL_TOKEN.");
    }
    const headers = buildBearerHeaders(this.token);
    headers.set("accept", "*/*");
    const agentHeaders = this.agentHeaders();
    for (const [key, value] of agentHeaders.entries()) {
      headers.set(key, value);
    }
    const response = await this.fetchImpl(
      new URL(
        this.workspacePath(
          workspaceId,
          `agent-mail/attachments/${encodeURIComponent(attachmentId)}/download`
        ),
        this.baseUrl
      ),
      { headers }
    );
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`
      );
    }
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
      contentType: response.headers.get("content-type")
    };
  }
  async createDraft(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/drafts"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: passthroughJson }
    );
  }
  async showDraft(workspaceId, draftId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/drafts/${encodeURIComponent(draftId)}`
      ),
      {},
      { parser: passthroughJson }
    );
  }
  async discardDraft(workspaceId, draftId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/drafts/${encodeURIComponent(draftId)}/discard`
      ),
      { method: "POST" },
      { parser: passthroughJson }
    );
  }
  async actOnThread(workspaceId, threadId, action) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/threads/${encodeURIComponent(threadId)}/actions`
      ),
      {
        method: "POST",
        body: JSON.stringify({ action })
      },
      { parser: parseThreadActionResult }
    );
  }
  async send(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/send"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: parseSendResult }
    );
  }
  async searchDomain(domain) {
    return this.request(
      `/api/internal/mere/domains/search?domain=${encodeURIComponent(domain)}`,
      {},
      { parser: passthroughJson }
    );
  }
  async registerDomain(input) {
    return this.request(
      "/api/internal/mere/domains/register",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: passthroughJson }
    );
  }
  async showDomainRegistration(registrationId) {
    return this.request(
      `/api/internal/mere/domains/${encodeURIComponent(registrationId)}`,
      {},
      { parser: passthroughJson }
    );
  }
  async exportWorkspace(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/export"),
      {},
      { parser: parseWorkspaceExportPayload }
    );
  }
  async importWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "import"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceImportStatusSchema, value, {
          invalidBodyMessage: "Import status payload is invalid."
        })
      }
    );
  }
  async importStatus(workspaceId, runId) {
    const params = new URLSearchParams();
    if (runId) {
      params.set("runId", runId);
    }
    const suffix = params.size > 0 ? `import?${params.toString()}` : "import";
    return this.request(
      this.workspacePath(workspaceId, suffix),
      {},
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceImportStatusSchema, value, {
          invalidBodyMessage: "Import status payload is invalid."
        })
      }
    );
  }
  async simulateInbound(input) {
    return this.request(
      "/api/internal/e2e/ingress/mail",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: parseInboundResult,
        useRpcEnvelope: false
      }
    );
  }
  workspacePath(workspaceId, suffix) {
    return `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/${suffix}`;
  }
  isAgentMailPath(path7) {
    return path7.includes("/agent-mail/");
  }
  agentHeaders() {
    return new Headers({
      "x-mere-agent-id": "mere-email-cli",
      "x-mere-session-id": "cli-session",
      "x-mere-actor-type": "cli",
      "x-mere-actor-label": "mere-email CLI",
      "x-mere-tool-key": "mere-email-cli"
    });
  }
  async request(path7, init, options) {
    const requiresToken = options.requiresToken ?? true;
    if (requiresToken && !this.token) {
      throw new CliError("This command requires `mere-email auth login` or MERE_EMAIL_TOKEN.");
    }
    const headers = this.token ? buildBearerHeaders(this.token, init.headers) : new Headers(init.headers);
    headers.set("accept", "application/json");
    if (this.isAgentMailPath(path7)) {
      const agentHeaders = this.agentHeaders();
      for (const [key, value] of agentHeaders.entries()) {
        headers.set(key, value);
      }
    }
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await this.fetchImpl(new URL(path7, this.baseUrl), {
      ...init,
      headers
    });
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`
      );
    }
    const text = await response.text();
    const payload = text ? parseJsonText(text, { invalidJsonMessage: "Invalid JSON response." }) : {};
    if (options.useRpcEnvelope === false) {
      return options.parser(payload);
    }
    if (!isRecord4(payload)) {
      throw new CliError("RPC response envelope is invalid.");
    }
    if (payload.ok !== true || !Object.prototype.hasOwnProperty.call(payload, "data")) {
      const rpcError = parseRpcErrorPayload(payload);
      if (rpcError) {
        throw new CliError(rpcError.message);
      }
      throw new CliError("RPC response envelope is invalid.");
    }
    return options.parser(payload.data);
  }
};

// cli/sealed.ts
init_json();
import { createCipheriv, createDecipheriv, createHash as createHash4, randomBytes } from "node:crypto";
import { chmod as chmod3, mkdir as mkdir3, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import os4 from "node:os";
import path4 from "node:path";
var SEALED_ENVELOPE_VERSION = 1;
var SEALED_ENVELOPE_ALG = "A256GCM";
function sealedKeyPath(env) {
  const stateHome4 = env.XDG_STATE_HOME?.trim() ? env.XDG_STATE_HOME.trim() : path4.join(env.HOME?.trim() ? env.HOME.trim() : os4.homedir(), ".local", "state");
  return path4.join(stateHome4, "mere-email", "sealed.key");
}
function keyFingerprint(key) {
  return createHash4("sha256").update(key).digest("hex").slice(0, 16);
}
async function loadSealedKey(env, options = {}) {
  const filePath = sealedKeyPath(env);
  try {
    const raw = await readFile2(filePath);
    if (raw.length !== 32) {
      throw new Error(`Sealed key at ${filePath} is corrupt (expected 32 bytes, found ${raw.length}).`);
    }
    return { key: raw, keyId: keyFingerprint(raw), filePath };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!options.create) return null;
  const key = randomBytes(32);
  await mkdir3(path4.dirname(filePath), { recursive: true });
  await writeFile2(filePath, key, { mode: 384 });
  await chmod3(filePath, 384);
  return { key, keyId: keyFingerprint(key), filePath };
}
function envelopeAad(header) {
  return Buffer.from(
    JSON.stringify([
      header.v,
      header.alg,
      header.keyId,
      header.workspaceId,
      header.threadId,
      header.messageId,
      header.sentAt
    ]),
    "utf8"
  );
}
function sealMessage(sealedKey, input) {
  const header = {
    v: SEALED_ENVELOPE_VERSION,
    alg: SEALED_ENVELOPE_ALG,
    keyId: sealedKey.keyId,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    messageId: input.messageId,
    sentAt: input.sentAt
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealedKey.key, iv);
  cipher.setAAD(envelopeAad(header));
  const plaintext = Buffer.from(JSON.stringify(input.payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  return {
    ...header,
    iv: iv.toString("base64"),
    ct: ciphertext.toString("base64")
  };
}
function unsealEnvelope(sealedKey, envelope2) {
  if (envelope2.v !== SEALED_ENVELOPE_VERSION || envelope2.alg !== SEALED_ENVELOPE_ALG) {
    throw new Error(`Unsupported sealed envelope format (v${envelope2.v}, ${envelope2.alg}).`);
  }
  if (envelope2.keyId !== sealedKey.keyId) {
    throw new Error(`Envelope was sealed with key ${envelope2.keyId}, not the local key ${sealedKey.keyId}.`);
  }
  const raw = Buffer.from(envelope2.ct, "base64");
  if (raw.length < 17) {
    throw new Error("Sealed envelope ciphertext is truncated.");
  }
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(0, raw.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", sealedKey.key, Buffer.from(envelope2.iv, "base64"));
  decipher.setAAD(envelopeAad(envelope2));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return parseJsonText(plaintext.toString("utf8"), { invalidJsonMessage: "Sealed envelope payload is not valid JSON." });
}
function parseSealedEnvelope(text) {
  return parseJsonText(text, { invalidJsonMessage: "Stored sealed envelope is not valid JSON." });
}

// cli/tunnel.ts
import { spawn as spawn3 } from "node:child_process";
import { createHash as createHash5, timingSafeEqual } from "node:crypto";
import { createServer as createServer2 } from "node:http";
import os5 from "node:os";
import path5 from "node:path";
function custodyTunnelTokenPath(env) {
  const stateHome4 = env.XDG_STATE_HOME?.trim() ? env.XDG_STATE_HOME.trim() : path5.join(env.HOME?.trim() ? env.HOME.trim() : os5.homedir(), ".local", "state");
  return path5.join(stateHome4, "mere-email", "tunnel.token");
}
function bearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match ? match[1].trim() : null;
}
function tokenMatches(expected, presented) {
  if (!presented) return false;
  const a = createHash5("sha256").update(expected).digest();
  const b = createHash5("sha256").update(presented).digest();
  return timingSafeEqual(a, b);
}
function buildCloudflaredArgs(input) {
  if (input.tunnelName) {
    return ["tunnel", "run", "--url", input.localUrl, input.tunnelName];
  }
  return ["tunnel", "--url", input.localUrl];
}
function startCloudflaredTunnel(input) {
  return spawn3("cloudflared", buildCloudflaredArgs(input), {
    stdio: ["ignore", "pipe", "pipe"]
  });
}
function jsonHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...extra
  };
}
function writeJson(response, status, body, headOnly = false) {
  const text = JSON.stringify(body);
  response.writeHead(status, jsonHeaders({ "content-length": String(Buffer.byteLength(text)) }));
  if (!headOnly) response.end(text);
  else response.end();
}
function parseLimit(value, fallback, max) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
function mapEnvelope(row) {
  const envelope2 = parseSealedEnvelope(row.envelopeJson);
  if (envelope2.keyId !== row.keyId || envelope2.workspaceId !== row.workspaceId || envelope2.threadId !== row.threadId || envelope2.messageId !== row.messageId) {
    throw new Error(`Sealed envelope row/header mismatch for ${row.messageId}.`);
  }
  return {
    type: "email.sealed_envelope.v1",
    keyId: row.keyId,
    workspaceId: row.workspaceId,
    threadId: row.threadId,
    messageId: row.messageId,
    sealedAt: row.sealedAt,
    remoteEtag: row.remoteEtag,
    envelope: envelope2
  };
}
async function startCustodyTunnelServer(input) {
  if (!input.token || input.token.length < 32) {
    throw new Error("Custody tunnel token must be at least 32 characters.");
  }
  const host = input.host ?? "127.0.0.1";
  const port = input.port ?? 0;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  let url = "";
  let lastSeenAt = null;
  const markSeen = () => {
    lastSeenAt = (/* @__PURE__ */ new Date()).toISOString();
    input.onSeen?.(lastSeenAt);
  };
  const snapshot = () => ({
    ok: true,
    custody: "live-tunnel",
    mode: "sealed-envelope-loopback",
    exposure: "loopback",
    localDataPolicy: "plaintext-allowed",
    remoteDataPolicy: "sealed-required",
    payloadClass: "sealed-envelope",
    state: "live",
    keyId: input.key.keyId,
    url,
    startedAt,
    lastSeenAt,
    sealedEnvelopes: input.store.countSealedEnvelopes(input.key.keyId),
    pendingSealableMessages: input.store.countMessagesToSeal(input.key.keyId)
  });
  const server = createServer2((request, response) => {
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, jsonHeaders({ "content-length": "0" }));
        response.end();
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        writeJson(response, 405, { ok: false, error: "Method not allowed." }, request.method === "HEAD");
        return;
      }
      const authorized = tokenMatches(input.token, bearerToken(request));
      if (authorized) markSeen();
      const requestUrl = new URL(request.url ?? "/", url || `http://${host}:${port}`);
      const headOnly = request.method === "HEAD";
      if (requestUrl.pathname === "/" || requestUrl.pathname === "/health") {
        if (!authorized) {
          writeJson(response, 200, { ok: true, state: "live", requiresAuth: true }, headOnly);
          return;
        }
        writeJson(response, 200, snapshot(), headOnly);
        return;
      }
      if (requestUrl.pathname === "/v1/envelopes") {
        if (!authorized) {
          writeJson(response, 401, { ok: false, error: "Custody tunnel token required." }, headOnly);
          return;
        }
        const rows = input.store.listSealedEnvelopes({
          keyId: input.key.keyId,
          limit: parseLimit(requestUrl.searchParams.get("limit"), 100, 500),
          workspaceId: requestUrl.searchParams.get("workspaceId") ?? void 0,
          threadId: requestUrl.searchParams.get("threadId") ?? void 0,
          messageId: requestUrl.searchParams.get("messageId") ?? void 0
        });
        writeJson(
          response,
          200,
          {
            ok: true,
            custody: "live-tunnel",
            exposure: "loopback",
            localDataPolicy: "plaintext-allowed",
            remoteDataPolicy: "sealed-required",
            payloadClass: "sealed-envelope",
            keyId: input.key.keyId,
            count: rows.length,
            envelopes: rows.map(mapEnvelope)
          },
          headOnly
        );
        return;
      }
      writeJson(response, 404, { ok: false, error: "Not found." }, headOnly);
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Custody tunnel failed."
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      url = `http://${address.address}:${address.port}`;
      input.onHeartbeat?.(startedAt);
      resolve();
    });
  });
  const heartbeatIntervalMs = input.heartbeatIntervalMs ?? 15e3;
  const heartbeat = heartbeatIntervalMs > 0 ? setInterval(() => {
    input.onHeartbeat?.((/* @__PURE__ */ new Date()).toISOString());
  }, heartbeatIntervalMs) : null;
  heartbeat?.unref();
  return {
    url,
    startedAt,
    close: async () => {
      if (heartbeat) clearInterval(heartbeat);
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  };
}

// src/lib/custody/browser-sealed.ts
init_json();

// src/lib/custody/device-grant.ts
var DEVICE_GRANT_WRAP_ALG = "ECDH-P256-HKDF-SHA256-A256GCM";
function subtleCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is not available.");
  }
  return subtle;
}
function randomBytes2(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
function arrayBufferFromBytes(bytes) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
function cloneBytes(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return bytes.slice();
}
function base64FromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
function assertPublicKeyJwk(value) {
  if (value.kty !== "EC" || value.crv !== "P-256" || typeof value.x !== "string" || typeof value.y !== "string") {
    throw new Error("Custody grant public key must be an ECDH P-256 public JWK.");
  }
  if ("d" in value) {
    throw new Error("Custody grant public key must not include private key material.");
  }
  return value;
}
function publicKeyJwkFromExport(value) {
  const { d: _privateKeyMaterial, ...publicOnly } = value;
  return assertPublicKeyJwk(publicOnly);
}
function grantAad(input) {
  return new TextEncoder().encode(
    JSON.stringify(["mere.email.custody.grant.v1", input.alg, input.grantId, input.workspaceId, input.keyId])
  );
}
async function createDeviceGrantKeyPair() {
  const pair = await subtleCrypto().generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );
  if (!("privateKey" in pair) || !("publicKey" in pair)) {
    throw new Error("WebCrypto did not return an ECDH key pair.");
  }
  const publicKeyJwk = publicKeyJwkFromExport(await subtleCrypto().exportKey("jwk", pair.publicKey));
  return { privateKey: pair.privateKey, publicKeyJwk };
}
async function importPublicKey(publicKeyJwk) {
  return subtleCrypto().importKey(
    "jwk",
    publicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}
async function deriveGrantAesKey(privateKey, publicKeyJwk, usage) {
  const sharedBits = await subtleCrypto().deriveBits(
    {
      name: "ECDH",
      public: await importPublicKey(publicKeyJwk)
    },
    privateKey,
    256
  );
  const hkdfKey = await subtleCrypto().importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
  return subtleCrypto().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new ArrayBuffer(32),
      info: new TextEncoder().encode(`mere.email.custody.grant.hkdf.v1:${DEVICE_GRANT_WRAP_ALG}`)
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}
async function wrapRawSealingKeyForDeviceGrant(input) {
  if (input.grant.alg !== DEVICE_GRANT_WRAP_ALG) {
    throw new Error(`Unsupported custody grant algorithm: ${input.grant.alg}.`);
  }
  const rawKey = cloneBytes(input.rawKey);
  if (rawKey.byteLength !== 32) {
    throw new Error(`Sealing key must be 32 bytes; received ${rawKey.byteLength}.`);
  }
  const wrappingPair = await createDeviceGrantKeyPair();
  const wrappingKey = await deriveGrantAesKey(wrappingPair.privateKey, input.grant.publicKeyJwk, "encrypt");
  const iv = randomBytes2(12);
  const ciphertext = await subtleCrypto().encrypt(
    {
      name: "AES-GCM",
      iv: arrayBufferFromBytes(iv),
      additionalData: arrayBufferFromBytes(
        grantAad({
          grantId: input.grant.id,
          workspaceId: input.grant.workspaceId,
          keyId: input.keyId,
          alg: input.grant.alg
        })
      ),
      tagLength: 128
    },
    wrappingKey,
    arrayBufferFromBytes(rawKey)
  );
  return {
    alg: DEVICE_GRANT_WRAP_ALG,
    keyId: input.keyId,
    wrappingPublicKeyJwk: wrappingPair.publicKeyJwk,
    iv: base64FromBytes(iv),
    ct: base64FromBytes(new Uint8Array(ciphertext))
  };
}

// cli/format.ts
function formatTable(headers, rows) {
  const widths = headers.map(
    (header, index) => Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );
  const renderRow = (row) => row.map((cell, index) => cell.padEnd(widths[index], " ")).join("  ");
  return [renderRow(headers), renderRow(widths.map((width) => "-".repeat(width))), ...rows.map(renderRow)].join("\n");
}
function formatKeyValue(entries) {
  const width = Math.max(...entries.map(([key]) => key.length));
  return entries.map(([key, value]) => `${key.padEnd(width, " ")}  ${value}`).join("\n");
}
function formatBoolean(value) {
  return value ? "yes" : "no";
}
function formatNullable(value) {
  return value && value.length > 0 ? value : "\u2014";
}
function formatTimestamp(value) {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const deltaMs = date.getTime() - Date.now();
  const absMs = Math.abs(deltaMs);
  const formatter = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
  const units = [
    ["year", 1e3 * 60 * 60 * 24 * 365],
    ["month", 1e3 * 60 * 60 * 24 * 30],
    ["day", 1e3 * 60 * 60 * 24],
    ["hour", 1e3 * 60 * 60],
    ["minute", 1e3 * 60],
    ["second", 1e3]
  ];
  const [unit, unitMs] = units.find(([, candidateMs]) => absMs >= candidateMs) ?? ["second", 1e3];
  const relative = formatter.format(Math.round(deltaMs / unitMs), unit);
  const absolute = new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
  return `${absolute} (${relative})`;
}
function truncate(value, limit) {
  if (value.length <= limit) return value;
  if (limit <= 3) return value.slice(0, limit);
  return `${value.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
function formatStringList(values) {
  return values.length > 0 ? values.join(", ") : "\u2014";
}
function formatThreadFlags(thread) {
  const flags = [];
  if (!thread.isRead) flags.push("unread");
  if (thread.isStarred) flags.push("starred");
  if (thread.isArchived) flags.push("archived");
  return flags.length > 0 ? flags.join(", ") : "\u2014";
}
function formatMailboxName(mailbox) {
  return mailbox.displayName ? `${mailbox.displayName} <${mailbox.address}>` : mailbox.address;
}
function formatFrom(message) {
  return message.fromName ? `${message.fromName} <${message.fromAddress}>` : message.fromAddress;
}
function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function renderMailboxTable(mailboxes) {
  if (mailboxes.length === 0) {
    return "No mailboxes found.";
  }
  return formatTable(
    ["ID", "ADDRESS", "NAME", "TYPE"],
    mailboxes.map((mailbox) => [
      mailbox.id,
      mailbox.address,
      formatNullable(mailbox.displayName),
      mailbox.type
    ])
  );
}
function renderWorkspaceLifecycle(response) {
  return formatKeyValue([
    ["external account", response.externalAccountId],
    ["external workspace", response.externalWorkspaceId],
    ["canonical url", response.canonicalUrl],
    ["status", response.status],
    ["health", response.health],
    ["last error", formatNullable(response.lastError)]
  ]);
}
function renderBootstrap(payload) {
  const sections = [
    formatKeyValue([
      ["lifecycle", payload.lifecycleState],
      ["agent mail", formatBoolean(payload.canRunAgentMail)],
      ["readonly reason", formatNullable(payload.readonlyReason)],
      ["default mailbox", formatNullable(payload.defaultMailboxAddress)],
      ["unread threads", String(payload.unreadCount)],
      ["trial ends", formatTimestamp(payload.trialEndsAt)],
      ["grace ends", formatTimestamp(payload.graceEndsAt)],
      ["activated", formatTimestamp(payload.activatedAt)],
      ["deletion scheduled", formatTimestamp(payload.deletionScheduledAt)]
    ]),
    "Mailboxes",
    renderMailboxTable(payload.mailboxes)
  ];
  return sections.join("\n\n");
}
function renderMailboxes(mailboxes) {
  return renderMailboxTable(mailboxes);
}
function renderSearchResults(results) {
  if (results.length === 0) {
    return "No threads matched.";
  }
  return formatTable(
    ["THREAD", "SUBJECT", "LAST MESSAGE", "COUNT", "FLAGS", "TOP MATCH"],
    results.map((result) => [
      result.thread.id,
      truncate(result.thread.subject || "(no subject)", 32),
      formatTimestamp(result.thread.lastMessageAt),
      String(result.thread.messageCount),
      formatThreadFlags(result.thread),
      truncate(result.matches[0]?.snippet || result.thread.snippet || "\u2014", 48)
    ])
  );
}
function renderThreadList(threads) {
  if (threads.length === 0) {
    return "No threads found.";
  }
  return formatTable(
    ["THREAD", "SUBJECT", "LAST MESSAGE", "COUNT", "FLAGS", "SNIPPET"],
    threads.map((thread) => [
      thread.id,
      truncate(thread.subject || "(no subject)", 36),
      formatTimestamp(thread.lastMessageAt),
      String(thread.messageCount),
      formatThreadFlags(thread),
      truncate(thread.snippet || "\u2014", 48)
    ])
  );
}
function renderThreadSummary(thread, mailbox) {
  return formatKeyValue([
    ["id", thread.id],
    ["subject", thread.subject || "(no subject)"],
    ["mailbox", formatMailboxName(mailbox)],
    ["participants", formatStringList(thread.participants)],
    ["messages", String(thread.messageCount)],
    ["last message", formatTimestamp(thread.lastMessageAt)],
    ["created", formatTimestamp(thread.createdAt)],
    ["updated", formatTimestamp(thread.updatedAt)],
    ["read", formatBoolean(thread.isRead)],
    ["starred", formatBoolean(thread.isStarred)],
    ["archived", formatBoolean(thread.isArchived)],
    ["labels", formatStringList(thread.labels)],
    ["snippet", formatNullable(thread.snippet)]
  ]);
}
function renderMessage(message) {
  const sections = [
    formatKeyValue([
      ["id", message.id],
      ["direction", message.direction],
      ["from", formatFrom(message)],
      ["to", formatStringList(message.toAddresses)],
      ["cc", formatStringList(message.ccAddresses)],
      ["bcc", formatStringList(message.bccAddresses)],
      ["subject", message.subject || "(no subject)"],
      ["sent", formatTimestamp(message.sentAt)],
      ["created", formatTimestamp(message.createdAt)],
      ["read", formatBoolean(message.isRead)],
      ["starred", formatBoolean(message.isStarred)],
      ["message id", formatNullable(message.messageIdHeader)],
      ["in reply to", formatNullable(message.inReplyTo)],
      ["references", formatNullable(message.referencesHeader)],
      ["provider message id", formatNullable(message.providerMessageId)]
    ]),
    `Body
${message.bodyText?.trim() || "\u2014"}`
  ];
  if (message.attachments.length > 0) {
    sections.push(
      `Attachments
${formatTable(
        ["ID", "FILENAME", "TYPE", "SIZE"],
        message.attachments.map((attachment) => [
          attachment.id,
          attachment.filename,
          formatNullable(attachment.mimeType),
          formatBytes(attachment.sizeBytes)
        ])
      )}`
    );
  }
  return sections.join("\n\n");
}
function renderThread(state) {
  const messageBlocks = state.messages.map(
    (message, index) => [`Message ${index + 1}`, renderMessage(message)].join("\n\n")
  );
  return [
    "Thread",
    renderThreadSummary(state.thread, state.mailbox),
    "Messages",
    messageBlocks.join("\n\n")
  ].join("\n\n");
}
function renderThreadAction(action, result) {
  const label = action === "mark_read" ? "mark read" : action === "star" ? "toggle star" : "archive";
  return formatKeyValue([
    ["action", label],
    ["thread id", result.thread.id],
    ["subject", result.thread.subject || "(no subject)"],
    ["read", formatBoolean(result.thread.isRead)],
    ["starred", formatBoolean(result.thread.isStarred)],
    ["archived", formatBoolean(result.thread.isArchived)],
    ["updated", formatTimestamp(result.thread.updatedAt)]
  ]);
}
function renderSendResult(result) {
  return formatKeyValue([
    ["thread id", result.threadId],
    ["message id", result.messageId],
    ["provider message id", formatNullable(result.providerMessageId)]
  ]);
}
function formatProgress(imported, requested) {
  return `${imported}/${requested}`;
}
function renderImportStatus(status) {
  return formatKeyValue([
    ["run id", status.runId],
    ["workspace", status.workspaceId],
    ["tenant", status.tenantId],
    ["status", status.status],
    ["error", formatNullable(status.error)],
    ["mailboxes", formatProgress(status.importedMailboxes, status.requestedMailboxes)],
    ["threads", formatProgress(status.importedThreads, status.requestedThreads)],
    ["messages", formatProgress(status.importedMessages, status.requestedMessages)],
    ["attachments", formatProgress(status.importedAttachments, status.requestedAttachments)],
    ["staged blobs", String(status.stagedBlobCount)],
    ["created", formatTimestamp(status.createdAt)],
    ["updated", formatTimestamp(status.updatedAt)],
    ["started", formatTimestamp(status.startedAt)],
    ["completed", formatTimestamp(status.completedAt)]
  ]);
}
function renderDisconnectResult(result) {
  return formatKeyValue([["disconnected", formatBoolean(result.disconnected)]]);
}
function renderInboundResult(result) {
  const sections = [
    formatKeyValue([
      ["accepted", formatBoolean(result.accepted)],
      ["scenario", formatNullable(result.scenarioId)],
      ["source event", formatNullable(result.sourceEventId)],
      ["object type", formatNullable(result.externalObjectType)],
      ["object id", formatNullable(result.externalObjectId)],
      ["canonical url", formatNullable(result.canonicalUrl)]
    ])
  ];
  if (result.workspaceResponse !== void 0) {
    sections.push(`Workspace Response
${JSON.stringify(result.workspaceResponse, null, 2)}`);
  }
  return sections.join("\n\n");
}

// cli/send-command.ts
import { readFile as readFile3 } from "node:fs/promises";
import { basename, resolve as resolvePath } from "node:path";
async function readAttachmentFiles(filePaths) {
  const attachments = [];
  for (const filePath of filePaths) {
    const absolutePath = resolvePath(filePath);
    let buffer;
    try {
      buffer = await readFile3(absolutePath);
    } catch (error) {
      throw new CliError(
        `Failed to read attachment ${absolutePath}: ${error instanceof Error ? error.message : "Unknown error."}`
      );
    }
    attachments.push({
      filename: basename(absolutePath),
      mimeType: null,
      contentBase64: buffer.toString("base64")
    });
  }
  return attachments;
}
async function buildSendInputFromCliOptions(options) {
  const attachments = await readAttachmentFiles(options.attachPaths);
  if (!options.bodyText.trim() && attachments.length === 0) {
    throw new CliError("send requires --body or at least one --attach path.");
  }
  return {
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    bodyText: options.bodyText,
    ...attachments.length > 0 ? { attachments } : {},
    ...options.mailboxId ? { mailboxId: options.mailboxId } : {},
    ...options.fromName ? { fromName: options.fromName } : {},
    ...options.replyThreadId ? { replyThreadId: options.replyThreadId } : {}
  };
}

// cli/session.ts
var APP_NAME = "mere-email";
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
    productLabel: "mere-email"
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

// cli/console-contract.ts
import { createHash as createHash6, randomUUID as randomUUID3 } from "node:crypto";
import { existsSync as existsSync3 } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/status.ts
import { existsSync as existsSync2 } from "node:fs";
import os6 from "node:os";
import path6 from "node:path";
var requiredPlaneTables = [
  "mere_plane_apps",
  "mere_plane_workspaces",
  "mere_plane_app_workspaces",
  "mere_plane_transfer_schemas",
  "mere_plane_transfers",
  "mere_plane_ai_jobs"
];
async function loadNodeSqlite2() {
  return import(["node", "sqlite"].join(":"));
}
function stateHome3(env) {
  const home = env.HOME?.trim() || os6.homedir();
  return env.XDG_DATA_HOME?.trim() || path6.join(home, ".local", "share");
}
function expandHome2(value, env) {
  const home = env.HOME?.trim() || os6.homedir();
  if (value === "~") return home;
  if (value.startsWith("~/")) return path6.join(home, value.slice(2));
  return value;
}
function envPrefix4(appId) {
  return appId.trim().toUpperCase().replace(/^@/, "").replace(/[^A-Z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}
function resolveLocalPlaneStatusDbPath(input = {}) {
  const env = input.env ?? process.env;
  const prefix = input.appId ? envPrefix4(input.appId) : "";
  const configured = input.localDbPath ?? (prefix ? env[`${prefix}_LOCAL_DB`] : void 0) ?? (prefix ? env[`${prefix}_LOCAL_PLANE_DB`] : void 0) ?? env.MERE_LOCAL_DB ?? env.MERE_LOCAL_PLANE_DB;
  return path6.resolve(configured?.trim() ? expandHome2(configured, env) : path6.join(stateHome3(env), "mere", "local-plane.db"));
}
function emptyLocalPlaneInventory() {
  return {
    apps: [],
    transferSchemas: [],
    workspaces: [],
    appWorkspaces: [],
    transfers: [],
    counts: {
      apps: 0,
      workspaces: 0,
      transferSchemas: 0,
      transfers: 0,
      aiJobs: 0
    }
  };
}
function countRows2(db, sql, ...params) {
  return Number(db.prepare(sql).get(...params)?.count ?? 0);
}
function tableExists(db, tableName) {
  return db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName)?.count === 1;
}
function appFilterClause2(appId, tableAlias) {
  return appId ? ` WHERE ${tableAlias}.app_id = ?` : "";
}
function planeModeOrNull2(value) {
  return value === "cloud" || value === "local" ? value : null;
}
function scopedWhere(appId, tableAlias, prefix = "WHERE") {
  return appId ? ` ${prefix} ${tableAlias}.app_id = ?` : "";
}
function pushIssue(issues, issue) {
  issues.push(issue);
}
function readInventory(db, options) {
  const appId = options.appId ?? void 0;
  if (!tableExists(db, "mere_plane_apps") || !tableExists(db, "mere_plane_workspaces") || !tableExists(db, "mere_plane_app_workspaces")) {
    return emptyLocalPlaneInventory();
  }
  const appParams = appId ? [appId] : [];
  const transferLimit = Math.max(1, Math.min(options.transferLimit ?? 10, 100));
  const hasTransfers = tableExists(db, "mere_plane_transfers");
  const hasAiJobs = tableExists(db, "mere_plane_ai_jobs");
  const hasTransferSchemas = tableExists(db, "mere_plane_transfer_schemas");
  const apps = db.prepare(
    `SELECT
         a.app_id,
         a.display_name,
         a.updated_at,
         COUNT(DISTINCT aw.workspace_id) AS workspace_count,
         ${hasTransferSchemas ? "COUNT(DISTINCT s.payload_schema)" : "0"} AS transfer_schema_count,
         ${hasTransfers ? "COUNT(DISTINCT t.id)" : "0"} AS transfer_count
       FROM mere_plane_apps AS a
       LEFT JOIN mere_plane_app_workspaces AS aw ON aw.app_id = a.app_id
       ${hasTransferSchemas ? "LEFT JOIN mere_plane_transfer_schemas AS s ON s.app_id = a.app_id" : ""}
       ${hasTransfers ? "LEFT JOIN mere_plane_transfers AS t ON t.app_id = a.app_id" : ""}
       ${appFilterClause2(appId, "a")}
       GROUP BY a.app_id
       ORDER BY a.app_id ASC`
  ).all(...appParams);
  const transferSchemas = hasTransferSchemas ? db.prepare(
    `SELECT *
           FROM mere_plane_transfer_schemas AS s
           ${appFilterClause2(appId, "s")}
           ORDER BY s.app_id ASC, s.payload_schema ASC`
  ).all(...appParams) : [];
  const workspaces = db.prepare(
    `SELECT
         w.workspace_id,
         w.slug,
         w.name,
         w.updated_at,
         COUNT(DISTINCT aw.app_id) AS app_count
       FROM mere_plane_workspaces AS w
       JOIN mere_plane_app_workspaces AS aw ON aw.workspace_id = w.workspace_id
       ${appFilterClause2(appId, "aw")}
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
       ${appFilterClause2(appId, "aw")}
       ORDER BY aw.app_id ASC, w.slug ASC, aw.workspace_id ASC`
  ).all(...appParams);
  const transfers = hasTransfers ? db.prepare(
    `SELECT *
           FROM mere_plane_transfers AS t
           ${appFilterClause2(appId, "t")}
           ORDER BY t.created_at DESC, t.id DESC
           LIMIT ?`
  ).all(...appParams, transferLimit) : [];
  const scopedCount = (table) => appId ? countRows2(db, `SELECT COUNT(*) AS count FROM ${table} WHERE app_id = ?`, appId) : countRows2(db, `SELECT COUNT(*) AS count FROM ${table}`);
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
      sourceDataPlane: planeModeOrNull2(transfer.source_data_plane),
      sourceAiPlane: planeModeOrNull2(transfer.source_ai_plane),
      destinationDataPlane: planeModeOrNull2(transfer.destination_data_plane),
      destinationAiPlane: planeModeOrNull2(transfer.destination_ai_plane),
      payloadSchema: transfer.payload_schema,
      payloadSha256: transfer.payload_sha256,
      createdAt: transfer.created_at
    })),
    counts: {
      apps: appId ? apps.length : countRows2(db, "SELECT COUNT(*) AS count FROM mere_plane_apps"),
      workspaces: workspaces.length,
      transferSchemas: hasTransferSchemas ? appId ? transferSchemas.length : countRows2(db, "SELECT COUNT(*) AS count FROM mere_plane_transfer_schemas") : 0,
      transfers: hasTransfers ? scopedCount("mere_plane_transfers") : 0,
      aiJobs: hasAiJobs ? scopedCount("mere_plane_ai_jobs") : 0
    }
  };
}
async function readLocalPlaneStatusSnapshot(options = {}) {
  const appId = options.appId ?? null;
  const dbPath = resolveLocalPlaneStatusDbPath(options);
  const exists = existsSync2(dbPath);
  if (!exists) {
    return {
      kind: "mere.local-plane.status",
      dbPath,
      exists,
      appId,
      inventory: emptyLocalPlaneInventory()
    };
  }
  const { DatabaseSync: DatabaseSync2 } = await loadNodeSqlite2();
  const db = new DatabaseSync2(dbPath, { readOnly: true });
  try {
    return {
      kind: "mere.local-plane.status",
      dbPath,
      exists,
      appId,
      inventory: readInventory(db, options)
    };
  } finally {
    db.close();
  }
}
function validateLocalPlaneDatabase(db, options) {
  const appId = options.appId ?? void 0;
  const issues = [];
  const missingTables = requiredPlaneTables.filter((tableName) => !tableExists(db, tableName));
  for (const tableName of missingTables) {
    pushIssue(issues, {
      severity: "error",
      code: "missing_plane_table",
      message: `Missing local-plane metadata table: ${tableName}`
    });
  }
  if (missingTables.length > 0) {
    return {
      inventory: emptyLocalPlaneInventory(),
      issues
    };
  }
  const appParams = appId ? [appId] : [];
  const appWorkspaceAppRows = db.prepare(
    `SELECT aw.app_id, aw.workspace_id
       FROM mere_plane_app_workspaces AS aw
       LEFT JOIN mere_plane_apps AS a ON a.app_id = aw.app_id
       ${scopedWhere(appId, "aw")}
       ${appId ? "AND" : "WHERE"} a.app_id IS NULL`
  ).all(...appParams);
  for (const row of appWorkspaceAppRows) {
    pushIssue(issues, {
      severity: "error",
      code: "workspace_link_missing_app",
      message: `Workspace link references unregistered app ${row.app_id}.`,
      appId: row.app_id,
      workspaceId: row.workspace_id
    });
  }
  const appWorkspaceWorkspaceRows = db.prepare(
    `SELECT aw.app_id, aw.workspace_id
       FROM mere_plane_app_workspaces AS aw
       LEFT JOIN mere_plane_workspaces AS w ON w.workspace_id = aw.workspace_id
       ${scopedWhere(appId, "aw")}
       ${appId ? "AND" : "WHERE"} w.workspace_id IS NULL`
  ).all(...appParams);
  for (const row of appWorkspaceWorkspaceRows) {
    pushIssue(issues, {
      severity: "error",
      code: "workspace_link_missing_workspace",
      message: `Workspace link references unregistered workspace ${row.workspace_id}.`,
      appId: row.app_id,
      workspaceId: row.workspace_id
    });
  }
  const projectionRows = db.prepare(
    `SELECT aw.app_id, aw.workspace_id, aw.cloud_projection
       FROM mere_plane_app_workspaces AS aw
       ${scopedWhere(appId, "aw")}
       ${appId ? "AND" : "WHERE"} aw.cloud_projection != 'cloudflare'`
  ).all(...appParams);
  for (const row of projectionRows) {
    pushIssue(issues, {
      severity: "error",
      code: "invalid_cloud_projection",
      message: `Workspace ${row.workspace_id} for ${row.app_id} uses unsupported projection ${row.cloud_projection}.`,
      appId: row.app_id,
      workspaceId: row.workspace_id
    });
  }
  const transferSchemaRows = db.prepare(
    `SELECT t.id, t.app_id, t.workspace_id, t.payload_schema
       FROM mere_plane_transfers AS t
       LEFT JOIN mere_plane_transfer_schemas AS s
         ON s.app_id = t.app_id AND s.payload_schema = t.payload_schema
       ${scopedWhere(appId, "t")}
       ${appId ? "AND" : "WHERE"} s.payload_schema IS NULL`
  ).all(...appParams);
  for (const row of transferSchemaRows) {
    pushIssue(issues, {
      severity: "error",
      code: "transfer_schema_unregistered",
      message: `Transfer ${row.id} references unregistered payload schema ${row.payload_schema}.`,
      appId: row.app_id,
      workspaceId: row.workspace_id,
      payloadSchema: row.payload_schema,
      transferId: row.id
    });
  }
  const unsupportedTransferRows = db.prepare(
    `SELECT t.id, t.app_id, t.workspace_id, t.direction, t.payload_schema
       FROM mere_plane_transfers AS t
       JOIN mere_plane_transfer_schemas AS s
         ON s.app_id = t.app_id AND s.payload_schema = t.payload_schema
       ${scopedWhere(appId, "t")}
       ${appId ? "AND" : "WHERE"} (
         (t.direction = 'import' AND s.import_supported = 0)
         OR (t.direction = 'export' AND s.export_supported = 0)
       )`
  ).all(...appParams);
  for (const row of unsupportedTransferRows) {
    pushIssue(issues, {
      severity: "error",
      code: "transfer_direction_unsupported",
      message: `Transfer ${row.id} records ${row.direction} for schema ${row.payload_schema}, but that direction is not registered as supported.`,
      appId: row.app_id,
      workspaceId: row.workspace_id,
      payloadSchema: row.payload_schema,
      transferId: row.id
    });
  }
  const transferWorkspaceRows = db.prepare(
    `SELECT t.id, t.app_id, t.workspace_id
       FROM mere_plane_transfers AS t
       LEFT JOIN mere_plane_workspaces AS w ON w.workspace_id = t.workspace_id
       ${scopedWhere(appId, "t")}
       ${appId ? "AND" : "WHERE"} w.workspace_id IS NULL`
  ).all(...appParams);
  for (const row of transferWorkspaceRows) {
    pushIssue(issues, {
      severity: "warning",
      code: "transfer_workspace_unregistered",
      message: `Transfer ${row.id} references workspace ${row.workspace_id}, which is not registered in the shared workspace table.`,
      appId: row.app_id,
      workspaceId: row.workspace_id,
      transferId: row.id
    });
  }
  const transferWorkspaceLinkRows = db.prepare(
    `SELECT t.id, t.app_id, t.workspace_id
       FROM mere_plane_transfers AS t
       LEFT JOIN mere_plane_app_workspaces AS aw
         ON aw.app_id = t.app_id AND aw.workspace_id = t.workspace_id
       ${scopedWhere(appId, "t")}
       ${appId ? "AND" : "WHERE"} aw.app_id IS NULL`
  ).all(...appParams);
  for (const row of transferWorkspaceLinkRows) {
    pushIssue(issues, {
      severity: "warning",
      code: "transfer_workspace_link_missing",
      message: `Transfer ${row.id} references ${row.app_id}/${row.workspace_id}, but that app/workspace link is not registered.`,
      appId: row.app_id,
      workspaceId: row.workspace_id,
      transferId: row.id
    });
  }
  const aiJobAppRows = db.prepare(
    `SELECT j.id, j.app_id, j.workspace_id
       FROM mere_plane_ai_jobs AS j
       LEFT JOIN mere_plane_apps AS a ON a.app_id = j.app_id
       ${scopedWhere(appId, "j")}
       ${appId ? "AND" : "WHERE"} a.app_id IS NULL`
  ).all(...appParams);
  for (const row of aiJobAppRows) {
    pushIssue(issues, {
      severity: "error",
      code: "ai_job_missing_app",
      message: `AI job ${row.id} references unregistered app ${row.app_id}.`,
      appId: row.app_id,
      workspaceId: row.workspace_id ?? void 0,
      jobId: row.id
    });
  }
  const aiJobWorkspaceRows = db.prepare(
    `SELECT j.id, j.app_id, j.workspace_id
       FROM mere_plane_ai_jobs AS j
       LEFT JOIN mere_plane_app_workspaces AS aw
         ON aw.app_id = j.app_id AND aw.workspace_id = j.workspace_id
       WHERE j.workspace_id IS NOT NULL
       ${appId ? "AND j.app_id = ?" : ""}
       AND aw.app_id IS NULL`
  ).all(...appParams);
  for (const row of aiJobWorkspaceRows) {
    pushIssue(issues, {
      severity: "warning",
      code: "ai_job_workspace_link_missing",
      message: `AI job ${row.id} references ${row.app_id}/${row.workspace_id}, but that app/workspace link is not registered.`,
      appId: row.app_id,
      workspaceId: row.workspace_id,
      jobId: row.id
    });
  }
  return {
    inventory: readInventory(db, options),
    issues
  };
}
async function readLocalPlaneDoctorReport(options = {}) {
  const appId = options.appId ?? null;
  const dbPath = resolveLocalPlaneStatusDbPath(options);
  const exists = existsSync2(dbPath);
  if (!exists) {
    const issues = [
      {
        severity: "warning",
        code: "local_plane_not_created",
        message: "Local plane database has not been created yet; local data remains optional."
      }
    ];
    return {
      kind: "mere.local-plane.doctor",
      dbPath,
      exists,
      appId,
      ok: true,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      inventory: emptyLocalPlaneInventory(),
      issues
    };
  }
  const { DatabaseSync: DatabaseSync2 } = await loadNodeSqlite2();
  const db = new DatabaseSync2(dbPath, { readOnly: true });
  try {
    const { inventory, issues } = validateLocalPlaneDatabase(db, options);
    return {
      kind: "mere.local-plane.doctor",
      dbPath,
      exists,
      appId,
      ok: !issues.some((issue) => issue.severity === "error"),
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      inventory,
      issues
    };
  } finally {
    db.close();
  }
}

// cli/console-contract.ts
var CONTRACT_SCHEMA = "mere.console.contract";
var CONTRACT_VERSION = 1;
var ADAPTER_ID = "mere-email";
var APP_ID = "email";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "cloudflared",
  "dry-run",
  "help",
  "include-archived",
  "include-future",
  "no-interactive",
  "once",
  "yes"
]);
var TRANSPORT_FLAGS = /* @__PURE__ */ new Map([
  ["confirm", "string"],
  ["json", "boolean"],
  ["no-interactive", "boolean"],
  ["yes", "boolean"]
]);
var LOCAL_OFFLINE_COMMANDS = /* @__PURE__ */ new Set([
  "custody.status",
  "custody.verify",
  "export",
  "import.status",
  "mailboxes.list",
  "store.info",
  "threads.latest",
  "threads.list",
  "threads.search",
  "threads.show"
]);
var DRY_RUN_COMMANDS = /* @__PURE__ */ new Set([
  "custody.push",
  "custody.seal",
  "custody.unmirror",
  "import",
  "threads.publish",
  "threads.revoke"
]);
var TARGET_RULES = {
  "custody.grant": { type: "email-custody-grant", source: "device" },
  "custody.set": { type: "email-custody-tier", source: "first-positional" },
  "drafts.discard": { type: "email-draft", source: "first-positional" },
  "threads.archive": { type: "email-thread", source: "first-positional" },
  "threads.publish": { type: "email-thread", source: "first-positional" },
  "threads.revoke": { type: "email-thread", source: "first-positional" },
  "workspace.disconnect": { type: "email-workspace", source: "workspace" }
};
function eventId(kind) {
  return `evt_email_${kind.replaceAll(".", "_")}_${randomUUID3()}`;
}
function contractSource(operation, adapterVersion) {
  return {
    owner: "adapter",
    producer: ADAPTER_ID,
    operation,
    instanceId: null,
    producerVersion: adapterVersion
  };
}
function accountSubject(session) {
  return session?.user.userId?.trim() || session?.accessTokenClaims.sub?.trim() || null;
}
function selectedWorkspace(session, requestedWorkspaceId) {
  return requestedWorkspaceId?.trim() || session?.workspace?.id?.trim() || session?.defaultWorkspaceId?.trim() || null;
}
function contractScope(session, requestedWorkspaceId, target) {
  const subject = accountSubject(session);
  return {
    accountSubject: subject,
    workspaceId: subject ? selectedWorkspace(session, requestedWorkspaceId) : null,
    appId: APP_ID,
    target
  };
}
function envelope(kind, scope, operation, adapterVersion, payload, observedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  return {
    schema: CONTRACT_SCHEMA,
    version: CONTRACT_VERSION,
    kind,
    id: eventId(kind),
    scope,
    observedAt,
    source: contractSource(operation, adapterVersion),
    payload
  };
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function canonicalInvocationArguments(tokens) {
  const canonical = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      canonical.push(token);
      continue;
    }
    const equalsIndex = token.indexOf("=");
    const name = token.slice(2, equalsIndex === -1 ? void 0 : equalsIndex);
    const transportKind = TRANSPORT_FLAGS.get(name);
    if (transportKind === void 0) {
      canonical.push(token);
      continue;
    }
    if (transportKind === "string" && equalsIndex === -1) {
      const next = tokens[index + 1];
      if (next !== void 0 && !next.startsWith("--")) index += 1;
    }
  }
  return canonical;
}
function argumentsDigest(commandName, commandArguments) {
  const canonical = stableJson({
    arguments: canonicalInvocationArguments(commandArguments),
    commandName
  });
  return `sha256:${createHash6("sha256").update(canonical).digest("hex")}`;
}
function addOption(options, name, value) {
  const current = options[name];
  if (current === void 0) {
    options[name] = value;
  } else if (Array.isArray(current)) {
    current.push(String(value));
  } else {
    options[name] = [String(current), String(value)];
  }
}
function normalizeInvocationArguments(tokens) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const equalsIndex = token.indexOf("=");
    const name = token.slice(2, equalsIndex === -1 ? void 0 : equalsIndex);
    const inlineValue = equalsIndex === -1 ? void 0 : token.slice(equalsIndex + 1);
    const isBoolean = BOOLEAN_FLAGS.has(name);
    const consumesNext = !isBoolean && inlineValue === void 0;
    const candidateNext = consumesNext ? tokens[index + 1] : void 0;
    const nextValue = candidateNext && !candidateNext.startsWith("--") ? candidateNext : void 0;
    const value = isBoolean ? inlineValue === void 0 ? true : inlineValue === "true" : inlineValue ?? nextValue ?? "";
    if (consumesNext && nextValue !== void 0) index += 1;
    if (TRANSPORT_FLAGS.has(name)) continue;
    addOption(flags, name, value);
  }
  return {
    flags,
    positionals
  };
}
function booleanFlagEnabled(tokens, flag) {
  return tokens.some((token) => token === `--${flag}` || token === `--${flag}=true`);
}
function hasFlag(tokens, flag) {
  return tokens.some((token) => token === `--${flag}` || token.startsWith(`--${flag}=`));
}
function flagValue(tokens, flag) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith(`--${flag}=`)) return token.slice(flag.length + 3).trim() || null;
    if (token === `--${flag}`) {
      const value = tokens[index + 1];
      return value && !value.startsWith("--") ? value.trim() || null : null;
    }
  }
  return null;
}
function isSessionExpired(session, now = Date.now()) {
  const expiresAt = Date.parse(session.expiresAt);
  const claimExpiry = session.accessTokenClaims.exp * 1e3;
  return Number.isFinite(expiresAt) && expiresAt <= now || claimExpiry <= now;
}
function workspaceIsAllowed(session, workspaceId) {
  const normalized = workspaceId.trim().toLowerCase();
  return session.workspaces.some(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  );
}
function requiresHostedAuth(command, commandArguments, plane) {
  if (command.auth === "none") return false;
  if (plane.data === "local" && DRY_RUN_COMMANDS.has(command.id) && hasFlag(commandArguments, "dry-run")) return false;
  return plane.data !== "local" || !LOCAL_OFFLINE_COMMANDS.has(command.id);
}
function errorCategory(code) {
  if (code.startsWith("AUTH_")) return "auth";
  if (code === "VALIDATION_FAILED") return "validation";
  return "internal";
}
function errorAuthCode(code) {
  if (code === "AUTH_REQUIRED") return "required";
  if (code === "AUTH_SESSION_EXPIRED") return "session-expired";
  if (code === "AUTH_WORKSPACE_FORBIDDEN") return "workspace-forbidden";
  return null;
}
function errorResult(input) {
  return {
    exitCode: input.code === "INTERNAL_ERROR" ? 1 : 2,
    envelope: envelope(
      "error",
      contractScope(input.session, input.workspaceId, null),
      input.operation,
      input.adapterVersion,
      {
        code: input.code,
        category: errorCategory(input.code),
        message: input.message,
        retryable: input.retryable ?? false,
        authCode: errorAuthCode(input.code),
        details: input.details ?? null
      }
    )
  };
}
function tableExists2(db, tableName) {
  const row = db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  return row?.present === 1;
}
function readEmailStoreEvidence(dbPath) {
  if (!existsSync3(dbPath)) {
    return {
      exists: false,
      emailSchemaExists: false,
      custodyTier: null,
      sealedEnvelopes: 0,
      mirroredEnvelopes: 0,
      tunnelLastSeenAt: null
    };
  }
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const emailSchemaExists = tableExists2(db, "email_local_settings") && tableExists2(db, "email_local_messages");
    if (!emailSchemaExists) {
      return {
        exists: true,
        emailSchemaExists: false,
        custodyTier: null,
        sealedEnvelopes: 0,
        mirroredEnvelopes: 0,
        tunnelLastSeenAt: null
      };
    }
    const setting = (key) => {
      const row = db.prepare("SELECT value FROM email_local_settings WHERE key = ?").get(key);
      return row?.value ?? null;
    };
    const sealedTableExists = tableExists2(db, "email_local_sealed_envelopes");
    const sealed = sealedTableExists ? db.prepare("SELECT COUNT(*) AS count FROM email_local_sealed_envelopes").get() : { count: 0 };
    const mirrored = sealedTableExists ? db.prepare("SELECT COUNT(*) AS count FROM email_local_sealed_envelopes WHERE pushed_at IS NOT NULL AND deleted_at IS NULL").get() : { count: 0 };
    return {
      exists: true,
      emailSchemaExists: true,
      custodyTier: setting("custody.tier"),
      sealedEnvelopes: Number(sealed.count),
      mirroredEnvelopes: Number(mirrored.count),
      tunnelLastSeenAt: setting("custody.tunnel.lastSeenAt")
    };
  } finally {
    db.close();
  }
}
function evidence(state, observedAt, operation, reasonCode, detail) {
  return {
    state,
    observedAt,
    source: {
      owner: "adapter",
      producer: ADAPTER_ID,
      operation,
      evidenceId: null
    },
    reasonCode,
    detail
  };
}
function custodyEvidence(store, observedAt) {
  const operation = "console snapshot custody";
  if (!store.exists || !store.emailSchemaExists) {
    return evidence("unknown", observedAt, operation, "CUSTODY_UNAVAILABLE", "The local Email custody store is not initialized.");
  }
  if (!store.custodyTier) {
    return evidence("unknown", observedAt, operation, "CUSTODY_UNDECLARED", "No custody tier has been recorded by the Email adapter.");
  }
  if (store.custodyTier === "plaintext-cloud") {
    return evidence("provider-managed", observedAt, operation, null, "The recorded Email custody tier is plaintext cloud.");
  }
  if (store.custodyTier === "sealed-mirror") {
    if (store.sealedEnvelopes > 0 && store.mirroredEnvelopes > 0) {
      return evidence("mixed", observedAt, operation, null, "Local sealed envelopes have been mirrored to the opaque custody receiver.");
    }
    return evidence("unknown", observedAt, operation, "CUSTODY_POLICY_NOT_MATERIALIZED", "Sealed-mirror is recorded, but no mirrored envelope is present.");
  }
  if (store.custodyTier === "live-tunnel") {
    const lastSeen = store.tunnelLastSeenAt ? Date.parse(store.tunnelLastSeenAt) : Number.NaN;
    const recent = Number.isFinite(lastSeen) && Date.now() - lastSeen <= 9e4;
    if (recent && store.sealedEnvelopes > 0) {
      return evidence("mixed", observedAt, operation, null, "A recently observed sealed-envelope tunnel is backed by local sealed envelopes.");
    }
    return evidence("unknown", observedAt, operation, "CUSTODY_TUNNEL_NOT_CURRENT", "Live-tunnel is recorded without current sealed-envelope evidence.");
  }
  if (store.custodyTier === "local-only") {
    return evidence("unknown", observedAt, operation, "CUSTODY_POLICY_NOT_ENFORCED", "Local-only is recorded as policy, but exclusive custody is not proven by this read-only probe.");
  }
  return evidence("unknown", observedAt, operation, "CUSTODY_TIER_UNKNOWN", "The recorded custody tier is not recognized by this contract version.");
}
async function snapshotResult(input, session) {
  const observedAt = (/* @__PURE__ */ new Date()).toISOString();
  const status = await readLocalPlaneStatusSnapshot({
    appId: ADAPTER_ID,
    env: input.env,
    localDbPath: input.plane.localDbPath
  });
  const doctor = await readLocalPlaneDoctorReport({
    appId: ADAPTER_ID,
    env: input.env,
    localDbPath: input.plane.localDbPath
  });
  const store = readEmailStoreEvidence(input.plane.localDbPath);
  const appRegistered = status.inventory.apps.some((app) => app.appId === ADAPTER_ID);
  const requestedWorkspace = input.workspaceId?.trim();
  const sessionWorkspaceMismatch = Boolean(
    session && requestedWorkspace && !workspaceIsAllowed(session, requestedWorkspace)
  );
  const locality = input.plane.data === "cloud" ? evidence("workspace-cloud", observedAt, "console snapshot store", null, "The adapter-selected Email data plane is workspace cloud.") : !status.exists ? evidence("unknown", observedAt, "console snapshot store", "LOCAL_STORE_NOT_CREATED", "The selected local Email store does not exist yet.") : !appRegistered || !store.emailSchemaExists ? evidence("unknown", observedAt, "console snapshot store", "EMAIL_STORE_UNINITIALIZED", "The local plane exists, but the Email store is not initialized.") : evidence("local-device", observedAt, "console snapshot store", null, "The Email adapter found its registered store in the local plane database.");
  let health;
  if (sessionWorkspaceMismatch) {
    health = evidence("degraded", observedAt, "console snapshot auth", "AUTH_WORKSPACE_FORBIDDEN", "The requested workspace is not present in the saved Email session.");
  } else if (input.plane.data === "cloud" && !session) {
    health = evidence("unknown", observedAt, "console snapshot auth", "AUTH_REQUIRED", "Hosted Email health was not probed because no saved account session is available.");
  } else if (input.plane.data === "cloud" && session && isSessionExpired(session)) {
    health = evidence("degraded", observedAt, "console snapshot auth", "AUTH_SESSION_EXPIRED", "The saved hosted Email access session is expired; no refresh was attempted.");
  } else if (input.plane.data === "cloud") {
    health = evidence("unknown", observedAt, "console snapshot health", "NOT_PROBED_OFFLINE", "The read-only contract probe did not contact the hosted Email service.");
  } else if (!doctor.exists) {
    health = evidence("unknown", observedAt, "console snapshot doctor", "LOCAL_STORE_NOT_CREATED", "The selected local Email store does not exist yet.");
  } else if (!doctor.ok) {
    health = evidence("unhealthy", observedAt, "console snapshot doctor", "LOCAL_STORE_INVALID", "The local-plane doctor reported structural errors.");
  } else if (!store.emailSchemaExists || !appRegistered) {
    health = evidence("degraded", observedAt, "console snapshot doctor", "EMAIL_STORE_UNINITIALIZED", "The local-plane database is readable, but Email is not fully initialized.");
  } else {
    health = evidence("healthy", observedAt, "console snapshot doctor", null, "The read-only local-plane and Email schema checks passed.");
  }
  const payload = {
    adapterId: ADAPTER_ID,
    adapterVersion: input.adapterVersion,
    availability: evidence("available", observedAt, "console snapshot process", null, "The Email adapter is executing this producer-owned probe."),
    locality,
    health,
    custody: custodyEvidence(store, observedAt),
    capabilities: [
      "email.command-descriptor",
      "email.custody-status",
      "email.local-read",
      "email.store-status",
      "email.structured-error"
    ]
  };
  return {
    exitCode: 0,
    envelope: envelope(
      "adapter.snapshot",
      contractScope(session, input.workspaceId, null),
      "console snapshot",
      input.adapterVersion,
      payload,
      observedAt
    )
  };
}
function matchCommand(invocation, commands) {
  const matches = commands.filter((command2) => command2.path.every((part, index) => invocation[index] === part)).sort((left, right) => right.path.length - left.path.length);
  const command = matches[0];
  return command ? { command, arguments: invocation.slice(command.path.length) } : null;
}
function safetyForInvocation(command, commandArguments) {
  if (hasFlag(commandArguments, "help") || DRY_RUN_COMMANDS.has(command.id) && hasFlag(commandArguments, "dry-run")) {
    return {
      risk: "read",
      mutatesState: false,
      crossesTrustBoundary: false,
      requiresYes: false,
      requiresConfirm: false,
      confirmationValue: null
    };
  }
  return {
    risk: command.risk,
    mutatesState: command.mutatesState,
    crossesTrustBoundary: command.crossesTrustBoundary,
    requiresYes: command.requiresYes,
    requiresConfirm: command.requiresConfirm,
    confirmationValue: command.confirmationValue
  };
}
function consoleInvocationConfirmation(invocation, commands, workspaceId) {
  const match = matchCommand(invocation, commands);
  if (!match) return null;
  const { command, arguments: commandArguments } = match;
  const safety = safetyForInvocation(command, commandArguments);
  const commandName = `email ${command.path.join(" ")}`;
  const target = safety.confirmationValue === "target.id" ? targetForInvocation(command, commandArguments, workspaceId) : null;
  const expectedConfirmation = safety.confirmationValue === "argumentsDigest" ? argumentsDigest(commandName, commandArguments) : target?.id ?? null;
  return {
    commandName,
    requiresYes: safety.requiresYes,
    requiresConfirm: safety.requiresConfirm,
    confirmationValue: safety.confirmationValue,
    expectedConfirmation,
    providedYes: booleanFlagEnabled(commandArguments, "yes"),
    providedConfirmation: flagValue(commandArguments, "confirm")
  };
}
function targetForInvocation(command, commandArguments, workspaceId) {
  const rule = TARGET_RULES[command.id];
  if (!rule) return null;
  const normalized = normalizeInvocationArguments(commandArguments);
  let id = null;
  if (rule.source === "first-positional") id = normalized.positionals[0]?.trim() || null;
  if (rule.source === "device") id = flagValue(commandArguments, "device");
  if (rule.source === "workspace") id = workspaceId;
  return id ? { type: rule.type, id, revision: null } : null;
}
function describeResult(input, session) {
  const invocation = input.argv[0] === "--" ? input.argv.slice(1) : input.argv;
  const match = matchCommand(invocation, input.commands);
  if (!match) {
    return errorResult({
      code: "VALIDATION_FAILED",
      message: "The requested Email command is missing or is not present in the adapter manifest.",
      operation: "console describe",
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: { reason: "unknown-command" }
    });
  }
  const { command, arguments: commandArguments } = match;
  const operation = `console describe ${command.id}`;
  const hostedAuth = requiresHostedAuth(command, commandArguments, input.plane);
  if (hostedAuth && !session) {
    return errorResult({
      code: "AUTH_REQUIRED",
      message: "A saved Email account session is required for this hosted command.",
      operation,
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: { commandName: `email ${command.path.join(" ")}`, reauthenticationRequired: true }
    });
  }
  if (hostedAuth && session && isSessionExpired(session)) {
    return errorResult({
      code: "AUTH_SESSION_EXPIRED",
      message: "The saved hosted Email access session is expired; no refresh was attempted.",
      operation,
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      retryable: true,
      details: { commandName: `email ${command.path.join(" ")}`, reauthenticationRequired: true }
    });
  }
  const workspaceId = selectedWorkspace(session, input.workspaceId);
  if (hostedAuth && session && workspaceId && !workspaceIsAllowed(session, workspaceId)) {
    return errorResult({
      code: "AUTH_WORKSPACE_FORBIDDEN",
      message: "The requested workspace is not present in the saved Email session.",
      operation,
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: { commandName: `email ${command.path.join(" ")}` }
    });
  }
  const safety = safetyForInvocation(command, commandArguments);
  if ((safety.risk === "destructive" || safety.risk === "external") && (!safety.requiresConfirm || safety.confirmationValue === null)) {
    return errorResult({
      code: "VALIDATION_FAILED",
      message: "This Email command is not available through Console until the adapter enforces exact confirmation.",
      operation,
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: {
        commandName: `email ${command.path.join(" ")}`,
        reason: "exact-confirmation-not-enforced"
      }
    });
  }
  const target = safety.confirmationValue === "target.id" ? targetForInvocation(command, commandArguments, workspaceId) : null;
  if (safety.confirmationValue === "target.id" && !target) {
    return errorResult({
      code: "VALIDATION_FAILED",
      message: "This Email command requires an exact target before it can be described safely.",
      operation,
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: { commandName: `email ${command.path.join(" ")}`, targetRequired: true }
    });
  }
  const commandName = `email ${command.path.join(" ")}`;
  return {
    exitCode: 0,
    envelope: envelope(
      "command.descriptor",
      contractScope(session, input.workspaceId, target),
      operation,
      input.adapterVersion,
      {
        name: commandName,
        argumentsDigest: argumentsDigest(commandName, commandArguments),
        safety
      }
    )
  };
}
async function runConsoleContractCommand(input) {
  const [action, ...remaining] = input.argv;
  let session = null;
  try {
    session = await loadSession(input.env);
    if (action === "snapshot") return await snapshotResult(input, session);
    if (action === "describe") return describeResult({ ...input, argv: remaining }, session);
    return errorResult({
      code: "VALIDATION_FAILED",
      message: "Unknown Email console contract command. Expected snapshot or describe.",
      operation: "console",
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId,
      details: { reason: "unknown-contract-action" }
    });
  } catch {
    return errorResult({
      code: "INTERNAL_ERROR",
      message: "The Email adapter could not produce a safe Console Contract envelope.",
      operation: action === "snapshot" ? "console snapshot" : "console describe",
      adapterVersion: input.adapterVersion,
      session,
      workspaceId: input.workspaceId
    });
  }
}

// cli/mere-email.ts
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  "business-base-url": "string",
  token: "string",
  workspace: "string",
  store: "string",
  ai: "string",
  "local-db": "string",
  "projection-url": "string",
  "projection-token": "string",
  json: "boolean",
  help: "boolean",
  version: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string"
};
var activeSession = null;
var EMAIL_WORKSPACE_PAYLOAD_SCHEMA2 = "mere.email.workspace-import.v1";
var HELP_TEXT = `mere-email CLI

Usage:
  mere-email [global flags] <command> [args]

Global flags:
  --base-url URL       Override MERE_EMAIL_BASE_URL
  --business-base-url URL Override Mere Business for browserless agent login
  --token TOKEN        Override MERE_EMAIL_TOKEN
  --workspace ID       Override MERE_EMAIL_WORKSPACE_ID
  --store local|cloud  Choose local or cloud data plane
  --ai local|cloud     Choose local or cloud AI plane
  --local-db PATH      Override the centralized local Mere SQLite database
  --projection-url URL Business projection receiver URL for explicit publish/revoke
  --projection-token T Business projection bearer token for explicit publish/revoke
  --json               Write machine-readable JSON
  --version            Show the CLI version
  -v                   Show the CLI version
  --no-interactive     Do not attempt interactive prompts
  --yes                Required for destructive automation
  --confirm VALUE      Exact target id or arguments digest from console describe
  --help               Show this help

Commands:
  completion [bash|zsh|fish]
  store info
  custody status
  custody set <plaintext-cloud|sealed-mirror|live-tunnel|local-only>
  custody keygen
  custody seal [--limit N] [--dry-run]
  custody push [--limit N] [--dry-run]
  custody unmirror [--dry-run]
  custody grant --device CODE
  custody tunnel serve [--host HOST] [--port PORT] [--once]
  custody tunnel up [--host HOST] [--port PORT] [--cloudflared] [--tunnel-name NAME] [--once]
  custody verify [--limit N]

  auth login
  auth agent-login --workspace WORKSPACE_ID [--business-base-url https://mere.business]
  auth whoami
  auth logout

  workspace list
  workspace current
  workspace use <id|slug|host>
  workspace bootstrap
  workspace provision --slug SLUG --name NAME --organization-id ID --callback-url URL --callback-bearer-token TOKEN [--base-domain DOMAIN] [--mailbox-address ADDRESS] [--lifecycle-state STATE] [--trial-ends-at ISO|null] [--grace-ends-at ISO|null] [--activated-at ISO|null] [--deletion-scheduled-at ISO|null]
  workspace sync [--lifecycle-state STATE] [--trial-ends-at ISO|null] [--grace-ends-at ISO|null] [--activated-at ISO|null] [--deletion-scheduled-at ISO|null]
  workspace disconnect

  sync pull [--limit N] [--mailbox-id ID] [--include-archived]

  mailboxes list

  threads list [--limit N] [--offset N] [--mailbox-id ID] [--include-archived]
  threads latest [--limit N] [--mailbox-id ID] [--include-archived]
  threads search <query> [--limit N]
  threads show <thread-id>
  threads summarize <thread-id>
  threads publish <thread-id> [--message-id ID] [--include-future] [--dry-run]
  threads revoke <thread-id> [--message-id ID] [--include-future] [--dry-run]
  threads read <thread-id>
  threads star <thread-id>
  threads archive <thread-id>

  drafts create --data JSON|--data-file FILE
  drafts show <draft-id>
  drafts discard <draft-id>

  attachments list <thread-id>
  attachments download <attachment-id> --output FILE

  domains search <domain>
  domains register --data JSON|--data-file FILE [--domain DOMAIN] [--organization-id ID]
  domains show <registration-id>

  send --to addr --subject "..." [--body "..."] [--attach /path/to/file] [--to addr2] [--cc addr] [--bcc addr] [--mailbox-id ID] [--from-name NAME] [--reply-thread-id ID]

  export
  import --file transfer-or-payload.json [--dry-run]
  import status [--run-id ID]

  inbound --file payload.json

  console snapshot
  console describe -- <command> [args]

Environment:
  MERE_EMAIL_BASE_URL      Worker URL, for example https://mere.email or http://localhost:8787
  MERE_EMAIL_TOKEN         Bearer token override for internal/service access
  MERE_EMAIL_WORKSPACE_ID  Default Mere workspace / tenant id
  MERE_EMAIL_STORE         Default data plane: cloud or local
  MERE_EMAIL_AI_PLANE      Default AI plane: cloud or local
  MERE_EMAIL_LOCAL_DB      App-specific local database path override
  MERE_LOCAL_DB            Shared local database path override
  MERE_EMAIL_PROJECTION_URL    Business projection receiver URL
  MERE_EMAIL_PROJECTION_TOKEN  Business projection bearer token
  MERE_BUSINESS_PROJECTION_URL Shared Business projection receiver URL
  MERE_BUSINESS_PROJECTION_TOKEN Shared Business projection bearer token

Notes:
  Console contract commands are read-only, always emit JSON, and never refresh or probe the network.
  Base domains: ${EMAIL_WORKSPACE_BASE_DOMAINS.join(", ")}
  Lifecycle states: ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}
  Nullable lifecycle flags accept the literal value "null" to clear a value.
`;
function helpJson() {
  return {
    name: "mere-email",
    usage: "mere-email [global flags] <command> [args]",
    globalFlags: {
      "--base-url": "Override MERE_EMAIL_BASE_URL",
      "--business-base-url": "Override Mere Business for browserless agent login",
      "--token": "Override MERE_EMAIL_TOKEN",
      "--workspace": "Override MERE_EMAIL_WORKSPACE_ID",
      "--store": "Choose local or cloud data plane",
      "--ai": "Choose local or cloud AI plane",
      "--local-db": "Override local Mere SQLite database",
      "--projection-url": "Business projection receiver URL for explicit publish/revoke",
      "--projection-token": "Business projection bearer token for explicit publish/revoke",
      "--json": "Write machine-readable JSON",
      "--version": "Show the CLI version",
      "--no-interactive": "Do not attempt interactive prompts",
      "--yes": "Required for destructive automation",
      "--confirm": "Exact target id or arguments digest from console describe",
      "--help": "Show help"
    },
    commands: {
      completion: ["bash", "zsh", "fish"],
      store: ["info"],
      auth: ["login", "agent-login", "whoami", "logout"],
      workspace: [
        "list",
        "current",
        "use",
        "bootstrap",
        "provision",
        "sync",
        "disconnect"
      ],
      sync: ["pull"],
      custody: ["status", "set", "keygen", "seal", "push", "unmirror", "grant", "tunnel", "verify"],
      mailboxes: ["list"],
      threads: ["list", "latest", "search", "show", "summarize", "publish", "revoke", "read", "star", "archive"],
      drafts: ["create", "show", "discard"],
      attachments: ["list", "download"],
      domains: ["search", "register", "show"],
      send: "send outbound email, optionally with attachments",
      export: "export workspace data as a local-plane transfer bundle",
      import: ["start import from transfer bundle or raw payload file", "dry-run import plan", "status"],
      inbound: "simulate inbound mail ingress from file",
      console: ["snapshot", "describe -- <command> [args]"]
    },
    environment: {
      MERE_EMAIL_BASE_URL: "Base worker URL",
      MERE_EMAIL_TOKEN: "Bearer token override for internal/service access",
      MERE_EMAIL_WORKSPACE_ID: "Default Mere tenant / workspace id",
      MERE_EMAIL_STORE: "Default data plane",
      MERE_EMAIL_AI_PLANE: "Default AI plane",
      MERE_EMAIL_LOCAL_DB: "App-specific local database path",
      MERE_LOCAL_DB: "Shared local database path",
      MERE_EMAIL_PROJECTION_URL: "Business projection receiver URL",
      MERE_EMAIL_PROJECTION_TOKEN: "Business projection bearer token",
      MERE_BUSINESS_PROJECTION_URL: "Shared Business projection receiver URL",
      MERE_BUSINESS_PROJECTION_TOKEN: "Shared Business projection bearer token"
    },
    baseDomains: EMAIL_WORKSPACE_BASE_DOMAINS,
    lifecycleStates: EMAIL_WORKSPACE_LIFECYCLE_STATES
  };
}
function manifestCommand(path7, summary, options = {}) {
  const risk = options.risk ?? "read";
  const mutatesState = options.mutatesState ?? risk !== "read";
  const crossesTrustBoundary = options.crossesTrustBoundary ?? risk === "external";
  const requiresYes = options.requiresYes ?? risk === "destructive";
  const requiresConfirm = options.requiresConfirm ?? false;
  const confirmationValue = requiresConfirm ? options.confirmationValue ?? (risk === "destructive" ? "target.id" : "argumentsDigest") : null;
  return {
    id: path7.join("."),
    path: path7,
    summary,
    auth: options.auth ?? "workspace",
    risk,
    mutatesState,
    crossesTrustBoundary,
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes,
    requiresConfirm,
    confirmationValue,
    positionals: options.positionals ?? [],
    flags: options.flags ?? [],
    ...options.auditDefault ? { auditDefault: true } : {}
  };
}
function commandManifest() {
  return {
    schemaVersion: 1,
    app: "mere-email",
    namespace: "email",
    aliases: ["mere-email", "zerodispatch"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_EMAIL_BASE_URL"],
    sessionPath: "~/.local/state/mere-email/session.json",
    globalFlags: ["base-url", "business-base-url", "workspace", "store", "ai", "local-db", "projection-url", "projection-token", "json", "yes", "confirm"],
    commands: [
      manifestCommand(["store", "info"], "Show local/cloud plane selection.", { auth: "none", auditDefault: true }),
      manifestCommand(["custody", "status"], "Show who holds mail: plaintext cloud, sealed mirror, live tunnel, or local only.", {
        auth: "none",
        auditDefault: true
      }),
      manifestCommand(["custody", "set"], "Record the Email custody tier for this local plane.", {
        auth: "none",
        risk: "write",
        requiresConfirm: true,
        confirmationValue: "target.id"
      }),
      manifestCommand(["custody", "keygen"], "Generate the local sealing key (never leaves this machine).", { auth: "none", risk: "write" }),
      manifestCommand(["custody", "seal"], "Seal local mail into AES-256-GCM envelopes the cloud cannot open.", {
        auth: "none",
        risk: "write",
        requiresConfirm: true,
        confirmationValue: "argumentsDigest",
        flags: ["limit", "dry-run"]
      }),
      manifestCommand(["custody", "push"], "Upload unsent sealed envelopes to the opaque custody receiver.", {
        risk: "external",
        requiresConfirm: true,
        confirmationValue: "argumentsDigest",
        flags: ["limit", "dry-run"]
      }),
      manifestCommand(["custody", "unmirror"], "Delete mirrored sealed envelopes from the custody receiver.", {
        risk: "destructive",
        crossesTrustBoundary: true,
        flags: ["dry-run", "yes", "confirm"]
      }),
      manifestCommand(["custody", "grant"], "Approve a browser device-link request by wrapping the local sealing key.", {
        risk: "external",
        flags: ["device"]
      }),
      manifestCommand(["custody", "tunnel"], "Serve the Email custody capability over loopback; fronted web access uses sealed envelopes.", { auth: "none", risk: "external", flags: ["host", "port", "cloudflared", "tunnel-name", "once"], positionals: ["serve", "up"] }),
      manifestCommand(["custody", "verify"], "Unseal a sample of envelopes to prove round-trip integrity.", { auth: "none", flags: ["limit"] }),
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "agent-login"], "Create an Email session from a Business agent session.", {
        auth: "none",
        risk: "write",
        flags: ["workspace", "business-base-url", "base-url"]
      }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "bootstrap"], "Bootstrap workspace.", { risk: "write" }),
      manifestCommand(["workspace", "provision"], "Provision workspace.", { risk: "write", flags: ["slug", "base-domain", "mailbox-address", "name", "organization-id", "callback-url", "callback-bearer-token", "lifecycle-state", "trial-ends-at", "grace-ends-at", "activated-at", "deletion-scheduled-at"] }),
      manifestCommand(["workspace", "sync"], "Sync workspace.", { risk: "external", flags: ["lifecycle-state", "trial-ends-at", "grace-ends-at", "activated-at", "deletion-scheduled-at"] }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["sync", "pull"], "Pull remote mail into the local-plane store.", {
        risk: "external",
        requiresConfirm: true,
        confirmationValue: "argumentsDigest",
        flags: ["limit", "mailbox-id", "include-archived"]
      }),
      manifestCommand(["mailboxes", "list"], "List mailboxes.", { auditDefault: true }),
      manifestCommand(["threads", "list"], "List threads with pagination.", { flags: ["limit", "offset", "mailbox-id", "include-archived"] }),
      manifestCommand(["threads", "latest"], "Show latest threads.", { flags: ["limit", "mailbox-id", "include-archived"] }),
      manifestCommand(["threads", "search"], "Search threads.", { flags: ["limit"] }),
      manifestCommand(["threads", "show"], "Show thread."),
      manifestCommand(["threads", "summarize"], "Summarize a local thread with mere.run.", { risk: "write", flags: ["model"] }),
      manifestCommand(["threads", "publish"], "Publish a selected local thread/message projection to Business.", { risk: "external", requiresConfirm: true, confirmationValue: "target.id", flags: ["message-id", "include-future", "dry-run", "published-by-user-id", "published-by-email"] }),
      manifestCommand(["threads", "revoke"], "Revoke a selected local thread/message projection from Business.", { risk: "external", requiresConfirm: true, confirmationValue: "target.id", flags: ["message-id", "include-future", "dry-run", "published-by-user-id", "published-by-email"] }),
      manifestCommand(["threads", "read"], "Mark thread read.", { risk: "write" }),
      manifestCommand(["threads", "star"], "Star thread.", { risk: "write" }),
      manifestCommand(["threads", "archive"], "Archive thread.", { risk: "destructive", crossesTrustBoundary: true, requiresConfirm: true }),
      manifestCommand(["drafts", "create"], "Create draft.", { risk: "write", supportsData: true }),
      manifestCommand(["drafts", "show"], "Show draft."),
      manifestCommand(["drafts", "discard"], "Discard draft.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["attachments", "list"], "List attachments."),
      manifestCommand(["attachments", "download"], "Download attachment.", { flags: ["output"] }),
      manifestCommand(["domains", "search"], "Search domains."),
      manifestCommand(["domains", "register"], "Register domain.", { risk: "external", supportsData: true, flags: ["domain", "organization-id", "period"] }),
      manifestCommand(["domains", "show"], "Show domain registration."),
      manifestCommand(["send"], "Send email.", { risk: "external", requiresYes: true, requiresConfirm: true, confirmationValue: "argumentsDigest", flags: ["to", "cc", "bcc", "attach", "mailbox-id", "from-name", "reply-thread-id", "subject", "body"] }),
      manifestCommand(["export"], "Export workspace data as a local-plane transfer bundle."),
      manifestCommand(["import"], "Import workspace data from a transfer bundle or raw payload file via --file; pass --dry-run to plan only.", { risk: "write", flags: ["file", "dry-run"] }),
      manifestCommand(["import", "status"], "Show import status.", { flags: ["run-id"] }),
      manifestCommand(["inbound"], "Simulate inbound mail ingress from --file.", { risk: "write", flags: ["file"] }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" }),
      manifestCommand(["console", "snapshot"], "Emit the adapter-owned Mere Console Contract v1 snapshot without network access.", { auth: "none", auditDefault: true }),
      manifestCommand(["console", "describe"], "Describe one exact Email invocation with Mere Console Contract v1 safety metadata.", { auth: "none" })
    ]
  };
}
async function cliVersion() {
  const raw = await readFile4(new URL("../package.json", import.meta.url), "utf8");
  const parsed = parseJsonText(raw);
  return parsed.version ?? "0.0.0";
}
var COMPLETION_WORDS = [
  "attachments",
  "auth",
  "completion",
  "console",
  "domains",
  "drafts",
  "export",
  "import",
  "inbound",
  "mailboxes",
  "send",
  "store",
  "custody",
  "sync",
  "threads",
  "workspace"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-email bash completion",
      "_mere_email_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_email_completion mere-email",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-email",
      "_mere_email() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_email "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-email -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.");
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
    const equalsIndex = token.indexOf("=");
    const rawName = token.slice(2, equalsIndex === -1 ? void 0 : equalsIndex);
    const inlineValue = equalsIndex === -1 ? void 0 : token.slice(equalsIndex + 1);
    const expectedKind = spec[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown option: --${rawName}`);
    }
    if (expectedKind === "boolean") {
      if (inlineValue != null) {
        options[rawName] = inlineValue === "true";
      } else {
        options[rawName] = true;
      }
      continue;
    }
    const resolvedValue = inlineValue ?? (() => {
      const next = args[index + 1];
      if (!next || next.startsWith("--")) {
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
function parseCommandFlags(args, spec) {
  return parseFlags(args, { ...spec, help: "boolean" });
}
function splitGlobalFlags(argv) {
  const globalTokens = [];
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (token === "-v") {
      globalTokens.push("--version");
      index += 1;
      continue;
    }
    if (!token.startsWith("--")) {
      break;
    }
    const equalsIndex = token.indexOf("=");
    const rawName = token.slice(2, equalsIndex === -1 ? void 0 : equalsIndex);
    const inlineValue = equalsIndex === -1 ? void 0 : token.slice(equalsIndex + 1);
    const expectedKind = GLOBAL_FLAG_SPEC[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown global option: --${rawName}`);
    }
    globalTokens.push(token);
    if (expectedKind !== "boolean" && inlineValue == null) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
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
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function asBoolean(value) {
  return value === true;
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function hasOption(options, name) {
  return Object.prototype.hasOwnProperty.call(options, name);
}
function readRequiredStringOption(options, name, label = `--${name}`) {
  const value = trimOption(asString(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`);
  }
  return value;
}
function readOptionalStringOption(options, name) {
  return trimOption(asString(options[name]));
}
function requireDestructiveConfirmation(globalOptions, options, label, target) {
  if (!asBoolean(options.yes) && !asBoolean(globalOptions.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`, 2);
  }
  const confirm = readOptionalStringOption(options, "confirm") ?? readOptionalStringOption(globalOptions, "confirm");
  if (confirm !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`, 2);
  }
}
function requireConsoleManifestConfirmation(globalOptions, invocation, commands, workspaceId) {
  const confirmation = consoleInvocationConfirmation(
    invocation,
    commands,
    workspaceId ?? null
  );
  if (!confirmation) return;
  if (!confirmation.requiresConfirm) return;
  const providedYes = asBoolean(globalOptions.yes) || confirmation.providedYes;
  if (confirmation.requiresYes && !providedYes) {
    throw new CliError(
      `Refusing to run ${confirmation.commandName} without --yes.`,
      2
    );
  }
  if (confirmation.expectedConfirmation === null) {
    throw new CliError(
      `Refusing to run ${confirmation.commandName} because its exact confirmation target is unavailable.`,
      2
    );
  }
  const providedConfirmation = readOptionalStringOption(globalOptions, "confirm") ?? confirmation.providedConfirmation;
  if (providedConfirmation !== confirmation.expectedConfirmation) {
    throw new CliError(
      `Refusing to run ${confirmation.commandName} without the exact --confirm value from console describe.`,
      2
    );
  }
}
function readOptionalNullableStringOption(options, name) {
  if (!hasOption(options, name)) {
    return void 0;
  }
  const value = asString(options[name]);
  if (value == null) {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  return trimmed.toLowerCase() === "null" ? null : trimmed;
}
function parseIntegerOption(value, label, options = {}) {
  if (value == null) {
    return void 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new CliError(`${label} must be an integer.`);
  }
  if (options.min != null && parsed < options.min) {
    throw new CliError(`${label} must be >= ${options.min}.`);
  }
  if (options.max != null && parsed > options.max) {
    throw new CliError(`${label} must be <= ${options.max}.`);
  }
  return parsed;
}
function parseBaseDomain(value) {
  const normalized = value?.trim().toLowerCase() ?? DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN;
  if (!normalized || !normalized.includes(".")) {
    throw new CliError("--base-domain must be a valid domain (e.g., meresmb.com or sawfwair.com).");
  }
  return normalized;
}
function parseLifecycleState2(value) {
  if (!value) return void 0;
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_WORKSPACE_LIFECYCLE_STATES.includes(normalized)) {
    throw new CliError(
      `--lifecycle-state must be one of ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}.`
    );
  }
  return normalized;
}
function ensureUrl(value, label) {
  try {
    return new URL(value).toString();
  } catch {
    throw new CliError(`${label} must be a valid URL.`);
  }
}
function requireNoPositionals(positionals) {
  if (positionals.length > 0) {
    throw new CliError(`Unexpected arguments: ${positionals.join(" ")}`);
  }
}
function requireSinglePositional(positionals, label) {
  if (positionals.length !== 1) {
    throw new CliError(`Expected ${label}.`);
  }
  return positionals[0];
}
function resolveBaseUrl(options, env) {
  const baseUrl = trimOption(asString(options["base-url"])) ?? trimOption(env.MERE_EMAIL_BASE_URL) ?? activeSession?.baseUrl ?? "https://mere.email";
  if (!baseUrl) {
    throw new CliError("Missing base URL. Set MERE_EMAIL_BASE_URL or pass --base-url.");
  }
  return baseUrl;
}
function normalizeBaseUrl3(value) {
  return value.trim().replace(/\/+$/, "");
}
function resolveBusinessWorkspaceSelector(options, env) {
  return trimOption(asString(options.workspace)) ?? trimOption(env.MERE_EMAIL_WORKSPACE_ID);
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
    throw new CliError("Mere Business did not return an Email base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new CliError("Mere Business did not return an Email CLI session.");
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
  const workspace = selectBusinessWorkspace(
    current,
    resolveBusinessWorkspaceSelector(globalOptions, io.env)
  );
  const baseUrl = normalizeBaseUrl3(trimOption(asString(globalOptions["business-base-url"])) ?? current.baseUrl);
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
        app: "email",
        workspaceId: business.workspace.id
      })
    }
  );
  const payload = await response.text().then((text) => text.trim().length > 0 ? parseJsonText(text) : null).catch(() => null);
  if (!response.ok) {
    throw new CliError(productSessionErrorMessage(payload, `Request failed (${response.status.toString()})`));
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession2(product.session, {
    baseUrl: normalizeBaseUrl3(trimOption(asString(globalOptions["base-url"])) ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveSession(session, io.env);
  return session;
}
function resolveToken(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_EMAIL_TOKEN) ?? activeSession?.accessToken;
}
function resolveExternalToken(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_EMAIL_TOKEN);
}
function resolveWorkspaceOptional(options, env) {
  const workspaceId = trimOption(asString(options.workspace)) ?? trimOption(env.MERE_EMAIL_WORKSPACE_ID) ?? activeSession?.defaultWorkspaceId ?? void 0;
  if (!workspaceId) return void 0;
  const sessionWorkspace = activeSession?.workspaces.find(
    (candidate) => candidate.id === workspaceId || candidate.slug === workspaceId || candidate.host === workspaceId
  );
  return sessionWorkspace?.id ?? workspaceId;
}
function resolveWorkspace(options, env) {
  const workspaceId = resolveWorkspaceOptional(options, env);
  if (!workspaceId) {
    throw new CliError(
      "Missing workspace ID. Set MERE_EMAIL_WORKSPACE_ID or pass --workspace."
    );
  }
  return workspaceId;
}
function createClient(io, options) {
  return new EmailCliClient({
    baseUrl: resolveBaseUrl(options, io.env),
    token: resolveToken(options, io.env),
    fetchImpl: io.fetchImpl
  });
}
function resolveEmailPlaneConfig(options, env) {
  return resolvePlaneConfig({
    appId: "mere-email",
    env,
    data: readOptionalStringOption(options, "store"),
    ai: readOptionalStringOption(options, "ai"),
    localDbPath: readOptionalStringOption(options, "local-db")
  });
}
function resolveDataMode(options, env) {
  return resolveEmailPlaneConfig(options, env).data;
}
function wrapEmailWorkspaceTransfer(payload, config) {
  return createPlaneTransferBundle({
    appId: config.appId,
    workspaceId: payload.tenantId,
    plane: config,
    payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA2,
    payload
  });
}
function parseEmailWorkspaceTransfer(value) {
  const unwrapped = unwrapPlaneTransferPayload(value, {
    appId: "mere-email",
    payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA2
  });
  const payload = parseJsonWithSchema(
    EmailWorkspaceImportRequestSchema,
    unwrapped.payload,
    { invalidBodyMessage: "Import payload is invalid." }
  );
  return {
    payload,
    bundle: unwrapped.bundle
  };
}
function countImportMessages(payload) {
  return payload.threads.reduce((count, item) => count + item.messages.length, 0);
}
function planEmailWorkspaceImport(payload, bundle, config) {
  return {
    ok: true,
    dryRun: true,
    store: config.data,
    ai: config.ai,
    cloudProjection: config.cloudProjection,
    transferPlan: createPlaneTransferImportPlan({
      appId: config.appId,
      workspaceId: payload.tenantId,
      payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA2,
      payload,
      bundle,
      destination: { data: config.data, ai: config.ai }
    }),
    counts: {
      mailboxes: payload.mailboxes.length,
      threads: payload.threads.length,
      messages: countImportMessages(payload)
    }
  };
}
function resolveWorkspaceSlug(workspaceId) {
  const workspace = activeSession?.workspaces.find(
    (candidate) => candidate.id === workspaceId || candidate.slug === workspaceId || candidate.host === workspaceId
  );
  return workspace?.slug ?? workspaceId;
}
function inferBaseDomain(mailboxes) {
  const address = mailboxes.find((mailbox) => mailbox.address.includes("@"))?.address;
  const domain = address?.slice(address.lastIndexOf("@") + 1).trim().toLowerCase();
  return domain && domain.includes(".") ? domain : DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN;
}
function countSyncedMessages(threads) {
  return threads.reduce((count, state) => count + state.messages.length, 0);
}
async function listRemoteThreadsForTraversal(client, workspaceId, input) {
  if (!input.includeArchived) {
    return (await client.listThreads(workspaceId, {
      mailboxId: input.mailboxId,
      limit: input.limit,
      offset: input.offset
    })).threads;
  }
  const desired = input.limit + input.offset;
  const listOneArchiveState = async (archived) => {
    const threads = [];
    let offset = 0;
    while (threads.length < desired) {
      const pageLimit = Math.min(100, desired - threads.length);
      const page = await client.listThreads(workspaceId, {
        mailboxId: input.mailboxId,
        limit: pageLimit,
        offset,
        archived
      });
      threads.push(...page.threads);
      if (page.threads.length < pageLimit) break;
      offset += page.threads.length;
    }
    return threads;
  };
  const [activeThreads, archivedThreads] = await Promise.all([
    listOneArchiveState(false),
    listOneArchiveState(true)
  ]);
  const threadById = new Map(
    [...activeThreads, ...archivedThreads].map((thread) => [thread.id, thread])
  );
  return [...threadById.values()].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt)).slice(input.offset, input.offset + input.limit);
}
function buildWorkspacePullPayload(workspaceId, mailboxes, threads) {
  const mailboxById = new Map(mailboxes.map((mailbox) => [mailbox.id, mailbox]));
  for (const state of threads) {
    mailboxById.set(state.mailbox.id, state.mailbox);
  }
  const normalizedMailboxes = [...mailboxById.values()].map((mailbox) => ({
    id: mailbox.id,
    address: mailbox.address,
    displayName: mailbox.displayName,
    type: mailbox.type,
    visibility: mailbox.visibility ?? "shared",
    ownerUserId: mailbox.ownerUserId ?? null,
    ownerEmail: mailbox.ownerEmail ?? null
  }));
  return {
    tenantId: workspaceId,
    slug: resolveWorkspaceSlug(workspaceId),
    baseDomain: inferBaseDomain(normalizedMailboxes),
    mailboxes: normalizedMailboxes,
    threads: threads.map((state) => ({
      thread: state.thread,
      messages: state.messages
    }))
  };
}
async function openLocalEmailStore(options, io) {
  const { LocalEmailStore: LocalEmailStore2 } = await Promise.resolve().then(() => (init_local_store(), local_store_exports));
  return LocalEmailStore2.open(resolveEmailPlaneConfig(options, io.env));
}
function renderStoreInfo(info) {
  return [
    `data: ${info.store}`,
    `ai: ${info.ai}`,
    `cloud projection: ${info.cloudProjection}`,
    info.baseUrl ? `base url: ${info.baseUrl}` : null,
    info.dbPath ? `local db: ${info.dbPath}` : null,
    info.workspaceCount != null ? `workspaces: ${info.workspaceCount.toString()}` : null,
    info.planeAppCount != null ? `plane apps: ${info.planeAppCount.toString()}` : null,
    info.planeWorkspaceCount != null ? `plane workspaces: ${info.planeWorkspaceCount.toString()}` : null,
    info.transferCount != null ? `transfers: ${info.transferCount.toString()}` : null,
    info.aiJobCount != null ? `ai jobs: ${info.aiJobCount.toString()}` : null,
    info.mailboxCount != null ? `mailboxes: ${info.mailboxCount.toString()}` : null,
    info.threadCount != null ? `threads: ${info.threadCount.toString()}` : null,
    info.messageCount != null ? `messages: ${info.messageCount.toString()}` : null
  ].filter((line) => Boolean(line)).join("\n");
}
function renderLocalImport(result) {
  return formatKeyValue([
    ["workspace", result.workspaceId],
    ["slug", result.slug],
    ["mailboxes", result.mailboxCount.toString()],
    ["threads", result.threadCount.toString()],
    ["messages", result.messageCount.toString()]
  ]);
}
function renderRemoteToLocalSync(result) {
  return formatKeyValue([
    ["source", result.source],
    ["store", result.store],
    ["workspace", result.workspaceId],
    ["slug", result.slug],
    ["local db", result.dbPath],
    ["mailboxes pulled", result.mailboxCount.toString()],
    ["threads pulled", result.threadCount.toString()],
    ["messages pulled", result.messageCount.toString()],
    ["local mailboxes", result.planeMailboxCount.toString()],
    ["local threads", result.planeThreadCount.toString()],
    ["local messages", result.planeMessageCount.toString()],
    ["limit", result.limit.toString()],
    ["archived", result.includeArchived ? "included" : "active only"]
  ]);
}
function renderLocalSummary(result) {
  return [`thread: ${result.threadId}`, `model: ${result.model}`, "", result.summary].join("\n");
}
function renderLatestThreads(states) {
  if (states.length === 0) {
    return "No threads found.";
  }
  if (states.length === 1) {
    return renderThread(states[0]);
  }
  return states.map((state, index) => [
    `Thread ${index + 1}`,
    formatKeyValue([
      ["id", state.thread.id],
      ["subject", state.thread.subject || "(no subject)"],
      ["last message", state.thread.lastMessageAt],
      ["messages", state.thread.messageCount.toString()],
      ["snippet", state.thread.snippet || "\u2014"]
    ])
  ].join("\n")).join("\n\n");
}
function renderLocalPublication(result) {
  return formatKeyValue([
    ["action", result.action ?? "publish"],
    ["thread", result.threadId],
    ["publication", result.publicationId],
    ["messages", result.messageCount.toString()],
    ["dry run", result.dryRun ? "yes" : "no"],
    ...result.receiverUrl ? [["receiver", result.receiverUrl]] : [],
    ...result.status != null ? [["status", result.status.toString()]] : []
  ]);
}
function mergedOptions(globalOptions, options) {
  return { ...globalOptions, ...options };
}
function stablePublicationId(input) {
  const hash = createHash7("sha256").update(input.workspaceId).update("\0").update(input.threadId).update("\0").update(input.messageIds.join("\0")).update("\0").update(input.includeFutureMessages ? "future" : "current").digest("hex").slice(0, 24);
  return `pub_${hash}`;
}
function selectedPublicationMessages(state, messageId) {
  if (!messageId) {
    return state.messages;
  }
  const message = state.messages.find((entry) => entry.id === messageId);
  if (!message) {
    throw new CliError(`Local message not found: ${messageId}`);
  }
  return [message];
}
function buildLocalPublicationPayload(input) {
  const messages = selectedPublicationMessages(input.state, input.messageId);
  if (messages.length === 0) {
    throw new CliError("Cannot publish a thread with no messages.");
  }
  const messageIds = messages.map((message) => message.id);
  const publication = {
    id: input.publicationId ?? stablePublicationId({
      workspaceId: input.workspaceId,
      threadId: input.state.thread.id,
      messageIds: input.messageId || !input.includeFutureMessages ? messageIds : [],
      includeFutureMessages: input.includeFutureMessages
    }),
    scope: input.messageId ? "message" : "thread",
    mailboxId: input.state.mailbox.id,
    threadId: input.state.thread.id,
    messageId: input.messageId ?? null,
    includeFutureMessages: input.includeFutureMessages,
    publishedByUserId: input.publishedByUserId,
    publishedByEmail: input.publishedByEmail,
    publishedAt: input.publishedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    revokedAt: input.revokedAt ?? null
  };
  return {
    publication,
    messageCount: messages.length,
    envelope: {
      version: EMAIL_PRODUCT_EVENT_VERSION,
      event: {
        type: "mail.publication.upserted",
        tenantId: input.workspaceId,
        mailbox: input.state.mailbox,
        thread: input.state.thread,
        publication,
        messages
      }
    }
  };
}
function buildLocalPublicationEnvelope(input) {
  return buildLocalPublicationPayload({ ...input, revokedAt: null });
}
function buildLocalPublicationRevocationEnvelope(input) {
  const revokedAt = input.revokedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  const built = buildLocalPublicationPayload({
    workspaceId: input.workspaceId,
    state: input.state,
    publicationId: input.existingPublication?.id,
    messageId: input.messageId,
    includeFutureMessages: input.includeFutureMessages,
    publishedByUserId: input.existingPublication?.publishedByUserId ?? input.publishedByUserId,
    publishedByEmail: input.existingPublication?.publishedByEmail ?? input.publishedByEmail,
    publishedAt: input.existingPublication?.publishedAt ?? revokedAt,
    revokedAt
  });
  return {
    publication: built.publication,
    messageCount: built.messageCount,
    envelope: {
      version: EMAIL_PRODUCT_EVENT_VERSION,
      event: {
        type: "mail.publication.revoked",
        tenantId: input.workspaceId,
        mailbox: input.state.mailbox,
        thread: input.state.thread,
        publication: built.publication
      }
    }
  };
}
function renderSessionSummary(session) {
  const workspaceLabel = session.workspaces.length > 0 ? session.workspaces.map(
    (workspace) => workspace.id === session.defaultWorkspaceId ? `${workspace.slug} (default)` : workspace.slug
  ).join(", ") : "none";
  return [
    `user: ${session.user.displayName || session.user.primaryEmail}`,
    `email: ${session.user.primaryEmail}`,
    `base url: ${session.baseUrl}`,
    `expires: ${session.expiresAt}`,
    `workspaces: ${workspaceLabel}`
  ].join("\n");
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
function writeAuthSession(io, globalOptions, session) {
  if (asBoolean(globalOptions.json)) {
    writeJson2(io, {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    });
    return;
  }
  writeText(io, renderSessionSummary(session));
}
function writeJson2(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function stableCliErrorCode(message) {
  switch (message) {
    case "CLI refresh session has expired.":
      return "AUTH_SESSION_EXPIRED";
    case "CLI refresh session has been revoked.":
      return "AUTH_SESSION_REVOKED";
    case "CLI refresh session is invalid.":
      return "AUTH_SESSION_INVALID";
    default:
      return message.includes("No local Mere Business session") ? "auth_error" : "cli_error";
  }
}
function writeJsonError(io, message) {
  writeJson2(io, {
    ok: false,
    error: {
      code: stableCliErrorCode(message),
      message
    }
  });
}
function writeText(io, value) {
  io.stdout(`${value}
`);
}
function writeHelp(io, json2) {
  if (json2) {
    writeJson2(io, helpJson());
    return;
  }
  writeText(io, HELP_TEXT);
}
function writeResult(io, globalOptions, value, render) {
  if (asBoolean(globalOptions.json)) {
    writeJson2(io, value);
    return;
  }
  writeText(io, render(value));
}
async function writeBytesFile(outputPath, bytes) {
  const target = resolvePath2(outputPath);
  await mkdir4(dirname(target), { recursive: true });
  await writeFile3(target, bytes);
  return target;
}
function pickWorkspaceSession(session, requestedWorkspace) {
  if (!requestedWorkspace?.trim()) {
    return session;
  }
  const normalized = requestedWorkspace.trim().toLowerCase();
  const match = session.workspaces.find(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  );
  if (!match) {
    return session;
  }
  return {
    ...session,
    defaultWorkspaceId: match.id
  };
}
async function readJsonFile(filePath) {
  const absolutePath = resolvePath2(filePath);
  let text;
  try {
    text = await readFile4(absolutePath, "utf8");
  } catch (error) {
    throw new CliError(
      `Failed to read ${absolutePath}: ${error instanceof Error ? error.message : "Unknown error."}`
    );
  }
  try {
    return parseJsonText(text, {
      invalidJsonMessage: `Invalid JSON in ${absolutePath}.`
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(error instanceof Error ? error.message : `Invalid JSON in ${absolutePath}.`);
  }
}
async function readStructuredInput(options, label) {
  const inline = readOptionalStringOption(options, "data");
  const file = readOptionalStringOption(options, "data-file");
  if (inline && file) {
    throw new CliError(`Pass either --data or --data-file for ${label}, not both.`);
  }
  if (inline) {
    return ensureRecord(
      parseJsonText(inline, { invalidJsonMessage: `Invalid JSON in --data for ${label}.` }),
      label
    );
  }
  if (file) {
    return ensureRecord(await readJsonFile(file), label);
  }
  return {};
}
function ensureRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError(`${label} must be a JSON object.`);
  }
  return value;
}
function readOptionalTrimmedString(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeInboundRequest(value, defaultWorkspaceId) {
  const record = ensureRecord(value, "Inbound payload");
  if (Object.prototype.hasOwnProperty.call(record, "payload")) {
    const payload = ensureRecord(record.payload, "Inbound payload.payload");
    const workspaceId = readOptionalTrimmedString(record.workspaceId) ?? defaultWorkspaceId;
    if (!workspaceId) {
      throw new CliError(
        "Inbound payload requires a workspace ID. Pass --workspace or include workspaceId in the file."
      );
    }
    const optionsValue = record.options;
    let normalizedOptions;
    if (optionsValue !== void 0) {
      const optionsRecord = ensureRecord(optionsValue, "Inbound payload.options");
      normalizedOptions = {
        webhookUrl: readOptionalTrimmedString(optionsRecord.webhookUrl),
        internalToken: readOptionalTrimmedString(optionsRecord.internalToken)
      };
    }
    return {
      scenarioId: readOptionalTrimmedString(record.scenarioId),
      workspaceId,
      fixtureId: readOptionalTrimmedString(record.fixtureId),
      payload,
      ...normalizedOptions ? { options: normalizedOptions } : {}
    };
  }
  if (!defaultWorkspaceId) {
    throw new CliError(
      "Inbound payload requires a workspace ID. Pass --workspace or use a wrapper file with workspaceId and payload."
    );
  }
  return {
    workspaceId: defaultWorkspaceId,
    payload: record
  };
}
async function handleWorkspaceBootstrap(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).workspaceBootstrap(workspaceId);
  writeResult(io, globalOptions, result, renderBootstrap);
}
async function handleWorkspaceProvision(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    slug: "string",
    "base-domain": "string",
    "mailbox-address": "string",
    name: "string",
    "organization-id": "string",
    "callback-url": "string",
    "callback-bearer-token": "string",
    "lifecycle-state": "string",
    "trial-ends-at": "string",
    "grace-ends-at": "string",
    "activated-at": "string",
    "deletion-scheduled-at": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const lifecycleState = parseLifecycleState2(readOptionalStringOption(options, "lifecycle-state"));
  const mailboxAddress = readOptionalStringOption(options, "mailbox-address");
  const input = {
    tenantId: workspaceId,
    slug: readRequiredStringOption(options, "slug"),
    baseDomain: parseBaseDomain(readOptionalStringOption(options, "base-domain")),
    name: readRequiredStringOption(options, "name"),
    organizationId: readRequiredStringOption(options, "organization-id"),
    callbackUrl: ensureUrl(readRequiredStringOption(options, "callback-url"), "--callback-url"),
    callbackBearerToken: readRequiredStringOption(
      options,
      "callback-bearer-token",
      "--callback-bearer-token"
    ),
    ...mailboxAddress ? { mailboxAddress } : {},
    ...lifecycleState ? { lifecycleState } : {},
    ...readOptionalNullableStringOption(options, "trial-ends-at") !== void 0 ? { trialEndsAt: readOptionalNullableStringOption(options, "trial-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "grace-ends-at") !== void 0 ? { graceEndsAt: readOptionalNullableStringOption(options, "grace-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "activated-at") !== void 0 ? { activatedAt: readOptionalNullableStringOption(options, "activated-at") } : {},
    ...readOptionalNullableStringOption(options, "deletion-scheduled-at") !== void 0 ? {
      deletionScheduledAt: readOptionalNullableStringOption(
        options,
        "deletion-scheduled-at"
      )
    } : {}
  };
  const result = await createClient(io, globalOptions).provisionWorkspace(workspaceId, input);
  writeResult(io, globalOptions, result, renderWorkspaceLifecycle);
}
async function handleWorkspaceSync(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "lifecycle-state": "string",
    "trial-ends-at": "string",
    "grace-ends-at": "string",
    "activated-at": "string",
    "deletion-scheduled-at": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const lifecycleState = parseLifecycleState2(readOptionalStringOption(options, "lifecycle-state"));
  const input = {
    tenantId: workspaceId,
    ...lifecycleState ? { lifecycleState } : {},
    ...readOptionalNullableStringOption(options, "trial-ends-at") !== void 0 ? { trialEndsAt: readOptionalNullableStringOption(options, "trial-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "grace-ends-at") !== void 0 ? { graceEndsAt: readOptionalNullableStringOption(options, "grace-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "activated-at") !== void 0 ? { activatedAt: readOptionalNullableStringOption(options, "activated-at") } : {},
    ...readOptionalNullableStringOption(options, "deletion-scheduled-at") !== void 0 ? {
      deletionScheduledAt: readOptionalNullableStringOption(
        options,
        "deletion-scheduled-at"
      )
    } : {}
  };
  const result = await createClient(io, globalOptions).syncWorkspace(workspaceId, input);
  writeResult(io, globalOptions, result, renderWorkspaceLifecycle);
}
async function handleWorkspaceDisconnect(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  requireDestructiveConfirmation(globalOptions, options, "disconnect workspace", workspaceId);
  const result = await createClient(io, globalOptions).disconnectWorkspace(workspaceId);
  writeResult(io, globalOptions, result, renderDisconnectResult);
}
async function handleWorkspaceCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing workspace command. Expected list, current, use, bootstrap, provision, sync, or disconnect.");
  }
  switch (action) {
    case "list": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      requireNoPositionals(positionals);
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      writeResult(
        io,
        globalOptions,
        session.workspaces,
        (workspaces) => workspaces.length > 0 ? workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available."
      );
      return;
    }
    case "current": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      requireNoPositionals(positionals);
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      const defaultWorkspace = session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null;
      writeResult(io, globalOptions, { current: session.workspace, defaultWorkspace }, (value) => {
        const current = value.current ? renderWorkspaceLabel(value.current) : "none";
        const defaultLabel = value.defaultWorkspace ? renderWorkspaceLabel(value.defaultWorkspace) : "none";
        return [`current: ${current}`, `default: ${defaultLabel}`].join("\n");
      });
      return;
    }
    case "use": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      const selector = requireSinglePositional(positionals, "<id|slug|host>");
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      const target = requireWorkspaceSelection(session.workspaces, selector);
      const refreshed = await refreshRemoteSession2(session, {
        workspace: target.id,
        fetchImpl: io.fetchImpl,
        persistDefaultWorkspace: true
      });
      await saveSession(refreshed, io.env);
      activeSession = refreshed;
      writeAuthSession(io, globalOptions, refreshed);
      return;
    }
    case "bootstrap":
      await handleWorkspaceBootstrap(io, globalOptions, args);
      return;
    case "provision":
      await handleWorkspaceProvision(io, globalOptions, args);
      return;
    case "sync":
      await handleWorkspaceSync(io, globalOptions, args);
      return;
    case "disconnect":
      await handleWorkspaceDisconnect(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown workspace command. Expected list, current, use, bootstrap, provision, sync, or disconnect.");
  }
}
async function handleAuthLogin(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const session = pickWorkspaceSession(
    await loginWithBrowser2({
      baseUrl: resolveBaseUrl(globalOptions, io.env),
      workspace: resolveWorkspaceOptional(globalOptions, io.env),
      fetchImpl: io.fetchImpl,
      notify: (message) => {
        io.stderr(`${message}
`);
      },
      env: io.env
    }),
    resolveWorkspaceOptional(globalOptions, io.env)
  );
  await saveSession(session, io.env);
  activeSession = session;
  writeAuthSession(io, globalOptions, session);
}
async function handleAuthWhoami(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new CliError("No local session found. Run `mere-email auth login` first.");
  }
  activeSession = session;
  writeAuthSession(io, globalOptions, session);
}
async function handleAuthAgentLogin(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const session = await agentLogin(globalOptions, io);
  activeSession = session;
  writeAuthSession(io, globalOptions, session);
}
async function handleAuthLogout(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const loggedOut = await logoutRemote({
    fetchImpl: io.fetchImpl,
    env: io.env
  });
  activeSession = null;
  if (asBoolean(globalOptions.json)) {
    writeJson2(io, { loggedOut });
    return;
  }
  writeText(io, loggedOut ? "Logged out." : "No local session found.");
}
async function handleAuthCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Unknown auth command. Expected login, agent-login, whoami, or logout.");
  }
  switch (action) {
    case "login":
      await handleAuthLogin(io, globalOptions, args);
      return;
    case "agent-login":
      await handleAuthAgentLogin(io, globalOptions, args);
      return;
    case "whoami":
      await handleAuthWhoami(io, globalOptions, args);
      return;
    case "logout":
      await handleAuthLogout(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown auth command. Expected login, agent-login, whoami, or logout.");
  }
}
async function handleStoreCommand(io, globalOptions, action, args) {
  if (action !== "info") {
    throw new CliError("Unknown store command. Expected info.");
  }
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const config = resolveEmailPlaneConfig(globalOptions, io.env);
  if (config.data === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      writeResult(io, globalOptions, store.info(), renderStoreInfo);
    } finally {
      store.close();
    }
    return;
  }
  writeResult(
    io,
    globalOptions,
    {
      ok: true,
      store: "cloud",
      ai: config.ai,
      cloudProjection: config.cloudProjection,
      baseUrl: resolveBaseUrl(globalOptions, io.env)
    },
    renderStoreInfo
  );
}
var EMAIL_CUSTODY_TIERS = ["plaintext-cloud", "sealed-mirror", "live-tunnel", "local-only"];
var CUSTODY_SETTING_KEY = "custody.tier";
var CUSTODY_TUNNEL_URL_KEY = "custody.tunnel.url";
var CUSTODY_TUNNEL_STARTED_AT_KEY = "custody.tunnel.startedAt";
var CUSTODY_TUNNEL_LAST_SEEN_AT_KEY = "custody.tunnel.lastSeenAt";
var CUSTODY_TUNNEL_RECENT_MS = 9e4;
var CUSTODY_WEB_ACCESS = {
  "plaintext-cloud": "hosted",
  "sealed-mirror": "sealed",
  "live-tunnel": "tunnel",
  "local-only": "off"
};
function isEmailCustodyTier(value) {
  return Boolean(value) && EMAIL_CUSTODY_TIERS.includes(value);
}
function custodyTunnelStatus(store) {
  const url = store.getSetting(CUSTODY_TUNNEL_URL_KEY);
  if (!url) return "unprovisioned";
  const lastStartedAt = store.getSetting(CUSTODY_TUNNEL_STARTED_AT_KEY) || null;
  const lastSeenAt = store.getSetting(CUSTODY_TUNNEL_LAST_SEEN_AT_KEY) || null;
  const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : Number.NaN;
  const lastSeenSecondsAgo = Number.isFinite(lastSeenMs) ? Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1e3)) : null;
  return {
    state: lastSeenSecondsAgo !== null && lastSeenSecondsAgo * 1e3 <= CUSTODY_TUNNEL_RECENT_MS ? "recent" : "stale",
    url,
    lastStartedAt,
    lastSeenAt,
    lastSeenSecondsAgo
  };
}
async function custodyStatusPayload(io, store, tier) {
  const key = await loadSealedKey(io.env);
  const sealedEnvelopes = key ? store.countSealedEnvelopes(key.keyId) : null;
  const mirroredEnvelopes = key ? store.countMirroredSealedEnvelopes(key.keyId) : null;
  const mirror = sealedEnvelopes !== null && mirroredEnvelopes !== null && mirroredEnvelopes > 0 ? mirroredEnvelopes >= sealedEnvelopes ? "pushed" : "partial" : "pending-receiver";
  return {
    ok: true,
    tier,
    webAccess: CUSTODY_WEB_ACCESS[tier],
    sealingKeyId: key?.keyId ?? null,
    sealedEnvelopes,
    pendingSealableMessages: key ? store.countMessagesToSeal(key.keyId) : null,
    mirroredEnvelopes,
    // The tier is the recorded policy for this local plane. Plaintext cloud
    // is what the platform enforces today; local sealing is real (custody
    // seal/verify/push) while enforcement and the tunnel leg remain separate.
    enforcement: tier === "plaintext-cloud" ? "active" : "pending",
    mirror,
    tunnel: custodyTunnelStatus(store)
  };
}
function renderCustody(payload) {
  const lines = [
    `custody: ${payload.tier}`,
    `web access: ${payload.webAccess}`,
    `enforcement: ${payload.enforcement}`
  ];
  if (payload.sealingKeyId) {
    lines.push(`sealing key: ${payload.sealingKeyId}`);
    lines.push(`sealed envelopes: ${payload.sealedEnvelopes ?? 0}`);
    lines.push(`mirrored envelopes: ${payload.mirroredEnvelopes ?? 0}`);
    lines.push(`pending seal: ${payload.pendingSealableMessages ?? 0}`);
  }
  if (payload.tunnel !== "unprovisioned") {
    lines.push(`tunnel: ${payload.tunnel.url}`);
    lines.push(
      `last seen: ${payload.tunnel.lastSeenSecondsAgo === null ? "unknown" : `${payload.tunnel.lastSeenSecondsAgo}s ago`}`
    );
  }
  return lines.join("\n");
}
function readPositiveIntegerOption(options, name, fallback) {
  const raw = readOptionalStringOption(options, name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new CliError(`--${name} must be a positive integer.`);
  }
  return value;
}
function waitForShutdownSignal() {
  return new Promise((resolve) => {
    const done = () => {
      process.off("SIGINT", done);
      process.off("SIGTERM", done);
      resolve();
    };
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
  });
}
async function handleCustodyCommand(io, globalOptions, action, args) {
  const actions = ["status", "set", "keygen", "seal", "push", "unmirror", "grant", "tunnel", "verify"];
  if (!action || !actions.includes(action)) {
    throw new CliError(`Unknown custody command. Expected ${actions.join(", ")}.`);
  }
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string",
    "dry-run": "boolean",
    device: "string",
    host: "string",
    port: "string",
    cloudflared: "boolean",
    "tunnel-name": "string",
    once: "boolean",
    yes: "boolean"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  if (action === "keygen") {
    requireNoPositionals(positionals);
    const existing = await loadSealedKey(io.env);
    const key = existing ?? await loadSealedKey(io.env, { create: true });
    if (!key) throw new CliError("Could not create the sealing key.");
    writeResult(
      io,
      globalOptions,
      { ok: true, keyId: key.keyId, path: key.filePath, created: !existing },
      (payload) => `sealing key: ${payload.keyId}${payload.created ? " (created)" : ""}
${payload.path}`
    );
    return;
  }
  if (action === "grant") {
    requireNoPositionals(positionals);
    const deviceCode = readRequiredStringOption(options, "device", "--device");
    const key = await loadSealedKey(io.env);
    if (!key) {
      throw new CliError("No sealing key on this machine. Run custody keygen first.");
    }
    const client = createClient(io, globalOptions);
    const grant = await client.readCustodyKeyGrant(deviceCode);
    if (grant.status !== "pending") {
      throw new CliError(`Custody grant ${grant.deviceCode} is ${grant.status}, not pending.`);
    }
    const wrappedKey = await wrapRawSealingKeyForDeviceGrant({
      rawKey: key.key,
      keyId: key.keyId,
      grant: {
        id: grant.id,
        workspaceId: grant.workspaceId,
        alg: grant.alg,
        publicKeyJwk: grant.publicKeyJwk
      }
    });
    const approved = await client.approveCustodyKeyGrant(grant.deviceCode, {
      wrappedKey
    });
    writeResult(
      io,
      globalOptions,
      { ok: true, grantId: approved.id, deviceCode: approved.deviceCode, keyId: approved.keyId, status: approved.status },
      (payload) => `granted browser custody access for ${payload.deviceCode} with key ${payload.keyId}`
    );
    return;
  }
  const store = await openLocalEmailStore(globalOptions, io);
  try {
    if (action === "set") {
      const tier2 = positionals[0];
      if (positionals.length !== 1 || !isEmailCustodyTier(tier2)) {
        throw new CliError(`Custody tier must be one of: ${EMAIL_CUSTODY_TIERS.join(", ")}.`);
      }
      store.setSetting(CUSTODY_SETTING_KEY, tier2);
      writeResult(io, globalOptions, await custodyStatusPayload(io, store, tier2), renderCustody);
      return;
    }
    if (action === "tunnel") {
      const tunnelAction = requireSinglePositional(positionals, "custody tunnel command: serve or up");
      if (tunnelAction !== "serve" && tunnelAction !== "up") {
        throw new CliError("Unknown custody tunnel command. Expected serve or up.");
      }
      if (tunnelAction === "serve" && (asBoolean(options.cloudflared) || readOptionalStringOption(options, "tunnel-name"))) {
        throw new CliError("custody tunnel serve is loopback-only. Let the console front it.");
      }
      const key = await loadSealedKey(io.env);
      if (!key) {
        throw new CliError("No sealing key on this machine. Run custody keygen first.");
      }
      const host = readOptionalStringOption(options, "host") ?? "127.0.0.1";
      const port = parseIntegerOption(readOptionalStringOption(options, "port"), "--port", { min: 0, max: 65535 }) ?? 0;
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      const tunnelToken = io.env.MERE_EMAIL_TUNNEL_TOKEN?.trim() || nodeRandomBytes(32).toString("hex");
      const tokenPath = custodyTunnelTokenPath(io.env);
      await mkdir4(dirname(tokenPath), { recursive: true });
      await writeFile3(tokenPath, `${tunnelToken}
`, { mode: 384 });
      await chmod4(tokenPath, 384);
      const server = await startCustodyTunnelServer({
        store,
        key,
        token: tunnelToken,
        host,
        port,
        onSeen: (seenAt) => {
          store.setSetting(CUSTODY_TUNNEL_LAST_SEEN_AT_KEY, seenAt);
        }
      });
      store.setSetting(CUSTODY_SETTING_KEY, "live-tunnel");
      store.setSetting(CUSTODY_TUNNEL_URL_KEY, server.url);
      store.setSetting(CUSTODY_TUNNEL_STARTED_AT_KEY, startedAt);
      store.setSetting(CUSTODY_TUNNEL_LAST_SEEN_AT_KEY, "");
      const tunnelName = readOptionalStringOption(options, "tunnel-name");
      const cloudflaredArgs = buildCloudflaredArgs({ localUrl: server.url, tunnelName });
      const cloudflared = tunnelAction === "up" && asBoolean(options.cloudflared) ? startCloudflaredTunnel({ localUrl: server.url, tunnelName }) : null;
      cloudflared?.stdout?.on("data", (chunk) => {
        io.stderr(`[cloudflared] ${String(chunk)}`);
      });
      cloudflared?.stderr?.on("data", (chunk) => {
        io.stderr(`[cloudflared] ${String(chunk)}`);
      });
      cloudflared?.once("error", (error) => {
        io.stderr(`[cloudflared] ${error.message}
`);
      });
      const payload = {
        ok: true,
        capabilityId: "email.sealed-envelope.v1",
        owner: tunnelAction === "serve" ? "adapter" : "legacy-up",
        tunnel: "live",
        mode: "sealed-envelope-loopback",
        exposure: "loopback",
        localDataPolicy: "plaintext-allowed",
        remoteDataPolicy: "sealed-required",
        payloadClass: "sealed-envelope",
        url: server.url,
        auth: "bearer",
        tokenPath,
        keyId: key.keyId,
        sealedEnvelopes: store.countSealedEnvelopes(key.keyId),
        pendingSealableMessages: store.countMessagesToSeal(key.keyId),
        startedAt,
        cloudflared: {
          enabled: Boolean(cloudflared),
          mode: tunnelName ? "named" : "quick",
          command: `cloudflared ${cloudflaredArgs.join(" ")}`
        }
      };
      writeResult(
        io,
        globalOptions,
        payload,
        (value) => [
          `live tunnel: ${value.url}`,
          `sealing key: ${value.keyId}`,
          `sealed envelopes: ${value.sealedEnvelopes}`,
          value.cloudflared.enabled ? `cloudflared: started (${value.cloudflared.mode})` : `cloudflared: ${value.cloudflared.command}`
        ].join("\n")
      );
      if (asBoolean(options.once)) {
        cloudflared?.kill("SIGTERM");
        await server.close();
        return;
      }
      try {
        await waitForShutdownSignal();
      } finally {
        cloudflared?.kill("SIGTERM");
        await server.close();
      }
      return;
    }
    if (action === "seal") {
      requireNoPositionals(positionals);
      const key = await loadSealedKey(io.env);
      if (!key) {
        throw new CliError("No sealing key on this machine. Run custody keygen first.");
      }
      const limit = readPositiveIntegerOption(options, "limit", 500);
      const pendingRows = store.listMessagesToSeal(key.keyId, limit);
      if (asBoolean(options["dry-run"])) {
        writeResult(
          io,
          globalOptions,
          { ok: true, dryRun: true, keyId: key.keyId, wouldSeal: pendingRows.length },
          (payload) => `would seal ${payload.wouldSeal} messages with key ${payload.keyId}`
        );
        return;
      }
      for (const row of pendingRows) {
        const envelope2 = sealMessage(key, {
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          messageId: row.id,
          sentAt: row.sent_at,
          payload: row
        });
        store.insertSealedEnvelope({
          messageId: row.id,
          keyId: key.keyId,
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          envelopeJson: JSON.stringify(envelope2)
        });
      }
      writeResult(
        io,
        globalOptions,
        {
          ok: true,
          keyId: key.keyId,
          sealed: pendingRows.length,
          sealedEnvelopes: store.countSealedEnvelopes(key.keyId)
        },
        (payload) => `sealed ${payload.sealed} messages; ${payload.sealedEnvelopes} envelopes total (key ${payload.keyId})`
      );
      return;
    }
    if (action === "push") {
      requireNoPositionals(positionals);
      const key = await loadSealedKey(io.env);
      if (!key) {
        throw new CliError("No sealing key on this machine. Run custody keygen first.");
      }
      const limit = readPositiveIntegerOption(options, "limit", 500);
      const pendingRows = store.listSealedEnvelopesToPush(key.keyId, limit);
      if (asBoolean(options["dry-run"])) {
        writeResult(
          io,
          globalOptions,
          { ok: true, dryRun: true, keyId: key.keyId, wouldPush: pendingRows.length },
          (payload) => `would push ${payload.wouldPush} sealed envelopes with key ${payload.keyId}`
        );
        return;
      }
      const client = createClient(io, globalOptions);
      let pushed = 0;
      for (const row of pendingRows) {
        const envelope2 = parseSealedEnvelope(row.envelopeJson);
        const receipt = await client.pushSealedEnvelope(row.workspaceId, { ...envelope2 });
        store.markSealedEnvelopePushed({
          messageId: row.messageId,
          keyId: key.keyId,
          remoteEtag: receipt.etag
        });
        pushed += 1;
      }
      writeResult(
        io,
        globalOptions,
        {
          ok: true,
          keyId: key.keyId,
          pushed,
          mirroredEnvelopes: store.countMirroredSealedEnvelopes(key.keyId)
        },
        (payload) => `pushed ${payload.pushed} sealed envelopes; ${payload.mirroredEnvelopes} mirrored (key ${payload.keyId})`
      );
      return;
    }
    if (action === "unmirror") {
      requireNoPositionals(positionals);
      const key = await loadSealedKey(io.env);
      if (!key) {
        throw new CliError("No sealing key on this machine. Run custody keygen first.");
      }
      const mirroredRows = store.listMirroredSealedEnvelopes(key.keyId);
      const byWorkspace = /* @__PURE__ */ new Map();
      for (const row of mirroredRows) {
        const rows = byWorkspace.get(row.workspaceId) ?? [];
        rows.push(row);
        byWorkspace.set(row.workspaceId, rows);
      }
      if (asBoolean(options["dry-run"])) {
        writeResult(
          io,
          globalOptions,
          {
            ok: true,
            dryRun: true,
            keyId: key.keyId,
            wouldUnmirror: mirroredRows.length,
            workspaces: byWorkspace.size
          },
          (payload) => `would unmirror ${payload.wouldUnmirror} sealed envelopes across ${payload.workspaces} workspaces`
        );
        return;
      }
      if (!asBoolean(options.yes) && !asBoolean(globalOptions.yes)) {
        throw new CliError("Refusing to unmirror sealed envelopes without --yes.", 2);
      }
      const client = createClient(io, globalOptions);
      let remoteDeleted = 0;
      for (const [workspaceId, rows] of byWorkspace.entries()) {
        const result = await client.deleteSealedEnvelopeMirror(workspaceId, { keyId: key.keyId });
        remoteDeleted += result.deleted;
        for (const row of rows) {
          store.markSealedEnvelopeUnmirrored({ messageId: row.messageId, keyId: key.keyId });
        }
      }
      writeResult(
        io,
        globalOptions,
        {
          ok: true,
          keyId: key.keyId,
          unmirrored: mirroredRows.length,
          remoteDeleted
        },
        (payload) => `unmirrored ${payload.unmirrored} sealed envelopes; receiver deleted ${payload.remoteDeleted}`
      );
      return;
    }
    if (action === "verify") {
      requireNoPositionals(positionals);
      const key = await loadSealedKey(io.env);
      if (!key) {
        throw new CliError("No sealing key on this machine. Run custody keygen first.");
      }
      const limit = readPositiveIntegerOption(options, "limit", 10);
      const sample = store.sampleSealedEnvelopes(key.keyId, limit);
      let verified = 0;
      for (const item of sample) {
        const envelope2 = parseSealedEnvelope(item.envelopeJson);
        const payload = unsealEnvelope(key, envelope2);
        if (envelope2.messageId !== item.messageId || payload.id !== item.messageId) {
          throw new CliError(`Envelope for ${item.messageId} failed verification.`);
        }
        verified += 1;
      }
      writeResult(
        io,
        globalOptions,
        { ok: true, keyId: key.keyId, verified, sampled: sample.length },
        (payload) => `verified ${payload.verified} of ${payload.sampled} sampled envelopes (key ${payload.keyId})`
      );
      return;
    }
    requireNoPositionals(positionals);
    const recorded = store.getSetting(CUSTODY_SETTING_KEY);
    const tier = isEmailCustodyTier(recorded) ? recorded : "plaintext-cloud";
    writeResult(io, globalOptions, await custodyStatusPayload(io, store, tier), renderCustody);
  } finally {
    store.close();
  }
}
async function handleSyncPull(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string",
    "mailbox-id": "string",
    "include-archived": "boolean"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  if (resolveDataMode(globalOptions, io.env) !== "local") {
    throw new CliError("sync pull writes remote mail into local-plane; pass --store local.", 2);
  }
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const limit = parseIntegerOption(readOptionalStringOption(options, "limit"), "--limit", {
    min: 1,
    max: 500
  }) ?? 50;
  const includeArchived = asBoolean(options["include-archived"]);
  const mailboxId = readOptionalStringOption(options, "mailbox-id");
  const client = createClient(io, globalOptions);
  const remoteMailboxes = await client.listMailboxes(workspaceId);
  const selectedMailboxes = mailboxId ? remoteMailboxes.filter((mailbox) => mailbox.id === mailboxId) : remoteMailboxes;
  if (mailboxId && selectedMailboxes.length === 0) {
    throw new CliError(`Remote mailbox not found: ${mailboxId}`);
  }
  const pulledThreads = [];
  const seenThreadIds = /* @__PURE__ */ new Set();
  for (const mailbox of selectedMailboxes) {
    let pulledForMailbox = 0;
    for (const archived of includeArchived ? [false, true] : [false]) {
      let offset = 0;
      while (pulledForMailbox < limit) {
        const pageLimit = Math.min(100, limit - pulledForMailbox);
        const page = await client.listThreads(workspaceId, {
          mailboxId: mailbox.id,
          limit: pageLimit,
          offset,
          archived
        });
        for (const thread of page.threads) {
          if (seenThreadIds.has(thread.id)) continue;
          const state = await client.showThread(workspaceId, thread.id);
          pulledThreads.push(state);
          seenThreadIds.add(thread.id);
          pulledForMailbox += 1;
        }
        if (page.threads.length < pageLimit || page.threads.length === 0) break;
        offset += page.threads.length;
      }
    }
  }
  const payload = buildWorkspacePullPayload(workspaceId, selectedMailboxes, pulledThreads);
  const store = await openLocalEmailStore(globalOptions, io);
  try {
    const importResult = store.importWorkspace(payload, {
      source: { data: "cloud", ai: "cloud" },
      payloadSchema: EMAIL_WORKSPACE_PAYLOAD_SCHEMA2
    });
    const info = store.info();
    writeResult(
      io,
      globalOptions,
      {
        ok: true,
        source: "cloud",
        store: "local",
        workspaceId: importResult.workspaceId,
        slug: importResult.slug,
        dbPath: info.dbPath,
        limit,
        includeArchived,
        mailboxCount: selectedMailboxes.length,
        threadCount: pulledThreads.length,
        messageCount: countSyncedMessages(pulledThreads),
        planeMailboxCount: info.mailboxCount,
        planeThreadCount: info.threadCount,
        planeMessageCount: info.messageCount
      },
      renderRemoteToLocalSync
    );
  } finally {
    store.close();
  }
}
async function handleSyncCommand(io, globalOptions, action, args) {
  if (action !== "pull") {
    throw new CliError("Unknown sync command. Expected pull.");
  }
  await handleSyncPull(io, globalOptions, args);
}
async function handleMailboxesList(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.listMailboxes(workspaceId);
      writeResult(io, globalOptions, result2, renderMailboxes);
    } finally {
      store.close();
    }
    return;
  }
  const result = await createClient(io, globalOptions).listMailboxes(workspaceId);
  writeResult(io, globalOptions, result, renderMailboxes);
}
async function handleMailboxesCommand(io, globalOptions, action, args) {
  if (action !== "list") {
    throw new CliError("Unknown mailboxes command. Expected list.");
  }
  await handleMailboxesList(io, globalOptions, args);
}
async function handleThreadsList(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string",
    offset: "string",
    "mailbox-id": "string",
    "include-archived": "boolean"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const limit = parseIntegerOption(readOptionalStringOption(options, "limit"), "--limit", {
    min: 1,
    max: 100
  }) ?? 25;
  const offset = parseIntegerOption(readOptionalStringOption(options, "offset"), "--offset", {
    min: 0
  }) ?? 0;
  const mailboxId = readOptionalStringOption(options, "mailbox-id");
  const includeArchived = asBoolean(options["include-archived"]);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.listThreads(workspaceId, {
        limit,
        offset,
        mailboxId,
        includeArchived
      });
      writeResult(io, globalOptions, result2, renderThreadList);
    } finally {
      store.close();
    }
    return;
  }
  const result = await listRemoteThreadsForTraversal(createClient(io, globalOptions), workspaceId, {
    limit,
    offset,
    mailboxId,
    includeArchived
  });
  writeResult(io, globalOptions, result, renderThreadList);
}
async function handleThreadsSearch(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const query = positionals.join(" ").trim();
  if (!query) {
    throw new CliError("threads search requires a query.");
  }
  const limit = parseIntegerOption(readOptionalStringOption(options, "limit"), "--limit", {
    min: 1,
    max: 25
  });
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.search(workspaceId, query, limit ?? 10);
      writeResult(io, globalOptions, result2, renderSearchResults);
    } finally {
      store.close();
    }
    return;
  }
  const result = await createClient(io, globalOptions).searchThreads(workspaceId, {
    query,
    ...limit != null ? { limit } : {}
  });
  writeResult(io, globalOptions, result, renderSearchResults);
}
async function handleThreadsLatest(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string",
    "mailbox-id": "string",
    "include-archived": "boolean"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const limit = parseIntegerOption(readOptionalStringOption(options, "limit"), "--limit", {
    min: 1,
    max: 25
  }) ?? 1;
  const mailboxId = readOptionalStringOption(options, "mailbox-id");
  const includeArchived = asBoolean(options["include-archived"]);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.listLatestThreads(workspaceId, {
        limit,
        mailboxId,
        includeArchived
      });
      writeResult(io, globalOptions, result2, renderLatestThreads);
    } finally {
      store.close();
    }
    return;
  }
  const client = createClient(io, globalOptions);
  const pages = await Promise.all(
    (includeArchived ? [false, true] : [false]).map(
      (archived) => client.listThreads(workspaceId, {
        mailboxId,
        limit,
        archived
      })
    )
  );
  const threadById = new Map(
    pages.flatMap((page) => page.threads).map((thread) => [thread.id, thread])
  );
  const threads = [...threadById.values()].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt)).slice(0, limit);
  const result = await Promise.all(
    threads.map((thread) => client.showThread(workspaceId, thread.id))
  );
  writeResult(io, globalOptions, result, renderLatestThreads);
}
async function handleThreadsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.getThread(workspaceId, threadId);
      writeResult(io, globalOptions, result2, renderThread);
    } finally {
      store.close();
    }
    return;
  }
  const result = await createClient(io, globalOptions).showThread(workspaceId, threadId);
  writeResult(io, globalOptions, result, renderThread);
}
async function handleThreadsSummarize(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    model: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const config = resolveEmailPlaneConfig(globalOptions, io.env);
  if (config.data !== "local") {
    throw new CliError("threads summarize currently requires --store local.");
  }
  if (config.ai !== "local") {
    throw new CliError("threads summarize requires --ai local.");
  }
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const model = readOptionalStringOption(options, "model") ?? "text-chat-q35-nano";
  const store = await openLocalEmailStore(globalOptions, io);
  try {
    const result = await store.summarizeThread(workspaceId, threadId, async (prompt) => ({
      model,
      text: await generateText(prompt, {
        env: io.env,
        appId: config.appId,
        model,
        maxTokens: 512
      })
    }));
    writeResult(io, globalOptions, result, renderLocalSummary);
  } finally {
    store.close();
  }
}
async function handleThreadsPublish(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "message-id": "string",
    "include-future": "boolean",
    "dry-run": "boolean",
    "projection-url": "string",
    "projection-token": "string",
    "published-by-user-id": "string",
    "published-by-email": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const commandOptions = mergedOptions(globalOptions, options);
  const config = resolveEmailPlaneConfig(commandOptions, io.env);
  if (config.data !== "local") {
    throw new CliError("threads publish requires --store local so private mail stays local unless explicitly projected.");
  }
  const messageId = readOptionalStringOption(options, "message-id");
  const includeFutureMessages = asBoolean(options["include-future"]);
  if (messageId && includeFutureMessages) {
    throw new CliError("--include-future is only valid when publishing a whole thread.");
  }
  const workspaceId = resolveWorkspace(commandOptions, io.env);
  const store = await openLocalEmailStore(commandOptions, io);
  try {
    const state = store.getThread(workspaceId, threadId);
    const publishedByUserId = readOptionalStringOption(options, "published-by-user-id") ?? activeSession?.user.userId ?? io.env.MERE_USER_ID?.trim() ?? "local-cli";
    const publishedByEmail = readOptionalStringOption(options, "published-by-email") ?? activeSession?.user.primaryEmail ?? io.env.MERE_USER_EMAIL?.trim() ?? null;
    const publication = buildLocalPublicationEnvelope({
      workspaceId,
      state,
      messageId,
      includeFutureMessages,
      publishedByUserId,
      publishedByEmail
    });
    if (asBoolean(options["dry-run"])) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: config.appId,
          env: io.env,
          receiverUrl: readOptionalStringOption(commandOptions, "projection-url"),
          bearerToken: readOptionalStringOption(commandOptions, "projection-token")
        }).receiverUrl;
      } catch {
        receiverUrl = void 0;
      }
      writeResult(
        io,
        globalOptions,
        {
          ok: true,
          dryRun: true,
          store: "local",
          projection: config.cloudProjection,
          threadId,
          publicationId: publication.publication.id,
          messageCount: publication.messageCount,
          receiverUrl,
          event: publication.envelope
        },
        renderLocalPublication
      );
      return;
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: config.appId,
      env: io.env,
      receiverUrl: readOptionalStringOption(commandOptions, "projection-url"),
      bearerToken: readOptionalStringOption(commandOptions, "projection-token"),
      event: publication.envelope,
      fetchImpl: io.fetchImpl
    });
    store.recordPublicationProjection(workspaceId, publication.publication, publication.envelope);
    writeResult(
      io,
      globalOptions,
      {
        ok: true,
        store: "local",
        projection: config.cloudProjection,
        action: "publish",
        threadId,
        publicationId: publication.publication.id,
        messageCount: publication.messageCount,
        receiverUrl: delivery.receiverUrl,
        status: delivery.status,
        receiver: delivery.responseJson
      },
      renderLocalPublication
    );
  } finally {
    store.close();
  }
}
async function handleThreadsRevoke(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "message-id": "string",
    "include-future": "boolean",
    "dry-run": "boolean",
    "projection-url": "string",
    "projection-token": "string",
    "published-by-user-id": "string",
    "published-by-email": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const commandOptions = mergedOptions(globalOptions, options);
  const config = resolveEmailPlaneConfig(commandOptions, io.env);
  if (config.data !== "local") {
    throw new CliError("threads revoke requires --store local so private mail stays local unless explicitly projected.");
  }
  const messageId = readOptionalStringOption(options, "message-id");
  const includeFutureMessages = asBoolean(options["include-future"]);
  if (messageId && includeFutureMessages) {
    throw new CliError("--include-future is only valid when revoking a whole thread publication.");
  }
  const workspaceId = resolveWorkspace(commandOptions, io.env);
  const store = await openLocalEmailStore(commandOptions, io);
  try {
    const state = store.getThread(workspaceId, threadId);
    const publishedByUserId = readOptionalStringOption(options, "published-by-user-id") ?? activeSession?.user.userId ?? io.env.MERE_USER_ID?.trim() ?? "local-cli";
    const publishedByEmail = readOptionalStringOption(options, "published-by-email") ?? activeSession?.user.primaryEmail ?? io.env.MERE_USER_EMAIL?.trim() ?? null;
    const existingPublication = store.findPublicationForSelection(workspaceId, {
      threadId: state.thread.id,
      messageId,
      includeFutureMessages
    });
    const publication = buildLocalPublicationRevocationEnvelope({
      workspaceId,
      state,
      messageId,
      includeFutureMessages,
      publishedByUserId,
      publishedByEmail,
      existingPublication
    });
    if (asBoolean(options["dry-run"])) {
      let receiverUrl;
      try {
        receiverUrl = resolveCloudProjectionTarget({
          appId: config.appId,
          env: io.env,
          receiverUrl: readOptionalStringOption(commandOptions, "projection-url"),
          bearerToken: readOptionalStringOption(commandOptions, "projection-token")
        }).receiverUrl;
      } catch {
        receiverUrl = void 0;
      }
      writeResult(
        io,
        globalOptions,
        {
          ok: true,
          dryRun: true,
          store: "local",
          projection: config.cloudProjection,
          action: "revoke",
          threadId,
          publicationId: publication.publication.id,
          messageCount: publication.messageCount,
          receiverUrl,
          event: publication.envelope
        },
        renderLocalPublication
      );
      return;
    }
    const delivery = await deliverCloudProjectionEvent({
      appId: config.appId,
      env: io.env,
      receiverUrl: readOptionalStringOption(commandOptions, "projection-url"),
      bearerToken: readOptionalStringOption(commandOptions, "projection-token"),
      event: publication.envelope,
      fetchImpl: io.fetchImpl
    });
    store.recordPublicationProjection(workspaceId, publication.publication, publication.envelope);
    writeResult(
      io,
      globalOptions,
      {
        ok: true,
        store: "local",
        projection: config.cloudProjection,
        action: "revoke",
        threadId,
        publicationId: publication.publication.id,
        messageCount: publication.messageCount,
        receiverUrl: delivery.receiverUrl,
        status: delivery.status,
        receiver: delivery.responseJson
      },
      renderLocalPublication
    );
  } finally {
    store.close();
  }
}
async function handleThreadsAction(io, globalOptions, args, action) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  if (action === "archive") {
    requireDestructiveConfirmation(globalOptions, options, "archive thread", threadId);
  }
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).actOnThread(workspaceId, threadId, action);
  writeResult(io, globalOptions, result, (value) => renderThreadAction(action, value));
}
async function handleThreadsCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing threads command. Expected list, latest, search, show, summarize, publish, revoke, read, star, or archive.");
  }
  switch (action) {
    case "list":
      await handleThreadsList(io, globalOptions, args);
      return;
    case "latest":
      await handleThreadsLatest(io, globalOptions, args);
      return;
    case "search":
      await handleThreadsSearch(io, globalOptions, args);
      return;
    case "show":
      await handleThreadsShow(io, globalOptions, args);
      return;
    case "summarize":
      await handleThreadsSummarize(io, globalOptions, args);
      return;
    case "publish":
      await handleThreadsPublish(io, globalOptions, args);
      return;
    case "revoke":
      await handleThreadsRevoke(io, globalOptions, args);
      return;
    case "read":
      await handleThreadsAction(io, globalOptions, args, "mark_read");
      return;
    case "star":
      await handleThreadsAction(io, globalOptions, args, "star");
      return;
    case "archive":
      await handleThreadsAction(io, globalOptions, args, "archive");
      return;
    default:
      throw new CliError("Unknown threads command. Expected list, latest, search, show, summarize, publish, revoke, read, star, or archive.");
  }
}
async function handleAttachmentsList(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const thread = await createClient(io, globalOptions).showThread(workspaceId, threadId);
  const attachments = thread.messages.flatMap(
    (message) => message.attachments.map((attachment) => ({
      ...attachment,
      threadId,
      messageId: message.id
    }))
  );
  writeResult(
    io,
    globalOptions,
    { threadId, attachments },
    (value) => {
      if (value.attachments.length === 0) return "No attachments.";
      return value.attachments.map((attachment) => `${attachment.id}	${attachment.filename}	${attachment.sizeBytes} bytes`).join("\n");
    }
  );
}
async function handleAttachmentsDownload(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    output: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const attachmentId = requireSinglePositional(positionals, "<attachment-id>");
  const outputPath = readRequiredStringOption(options, "output");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const download2 = await createClient(io, globalOptions).downloadAttachment(workspaceId, attachmentId);
  const path7 = await writeBytesFile(outputPath, download2.bytes);
  writeResult(
    io,
    globalOptions,
    {
      attachmentId,
      path: path7,
      filename: download2.filename,
      contentType: download2.contentType,
      bytes: download2.bytes.byteLength
    },
    (value) => `Saved ${value.filename ?? attachmentId} (${value.bytes} bytes) to ${value.path}`
  );
}
async function handleAttachmentsCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing attachments command. Expected list or download.");
  }
  switch (action) {
    case "list":
      await handleAttachmentsList(io, globalOptions, args);
      return;
    case "download":
      await handleAttachmentsDownload(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown attachments command. Expected list or download.");
  }
}
async function handleDraftsCreate(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    data: "string",
    "data-file": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const input = await readStructuredInput(options, "draft payload");
  const result = await createClient(io, globalOptions).createDraft(workspaceId, input);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const draftId = requireSinglePositional(positionals, "<draft-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).showDraft(workspaceId, draftId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsDiscard(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const draftId = requireSinglePositional(positionals, "<draft-id>");
  requireDestructiveConfirmation(globalOptions, options, "discard draft", draftId);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).discardDraft(workspaceId, draftId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsCommand(io, globalOptions, action, args) {
  switch (action) {
    case "create":
      await handleDraftsCreate(io, globalOptions, args);
      return;
    case "show":
      await handleDraftsShow(io, globalOptions, args);
      return;
    case "discard":
      await handleDraftsDiscard(io, globalOptions, args);
      return;
    case void 0:
    default:
      throw new CliError("Unknown drafts command. Expected create, show, or discard.");
  }
}
async function handleDomainsSearch(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const domain = requireSinglePositional(positionals, "<domain>");
  const result = await createClient(io, globalOptions).searchDomain(domain);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsRegister(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    data: "string",
    "data-file": "string",
    domain: "string",
    "organization-id": "string",
    period: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const payload = await readStructuredInput(options, "domain registration payload");
  const domain = readOptionalStringOption(options, "domain");
  const organizationId = readOptionalStringOption(options, "organization-id");
  const period = parseIntegerOption(readOptionalStringOption(options, "period"), "--period", {
    min: 1,
    max: 10
  });
  const result = await createClient(io, globalOptions).registerDomain({
    ...payload,
    workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : workspaceId,
    ...domain ? { domain } : {},
    ...organizationId ? { organizationId } : {},
    ...period != null ? { period } : {}
  });
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const registrationId = requireSinglePositional(positionals, "<registration-id>");
  const result = await createClient(io, globalOptions).showDomainRegistration(registrationId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsCommand(io, globalOptions, action, args) {
  switch (action) {
    case "search":
      await handleDomainsSearch(io, globalOptions, args);
      return;
    case "register":
      await handleDomainsRegister(io, globalOptions, args);
      return;
    case "show":
      await handleDomainsShow(io, globalOptions, args);
      return;
    case void 0:
    default:
      throw new CliError("Unknown domains command. Expected search, register, or show.");
  }
}
async function handleSend(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    to: "string[]",
    cc: "string[]",
    bcc: "string[]",
    attach: "string[]",
    "mailbox-id": "string",
    "from-name": "string",
    "reply-thread-id": "string",
    subject: "string",
    body: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const to = asStringArray(options.to).map((entry) => entry.trim()).filter(Boolean);
  if (to.length === 0) {
    throw new CliError("send requires at least one --to address.");
  }
  const input = await buildSendInputFromCliOptions({
    to,
    cc: asStringArray(options.cc).map((entry) => entry.trim()).filter(Boolean),
    bcc: asStringArray(options.bcc).map((entry) => entry.trim()).filter(Boolean),
    subject: readRequiredStringOption(options, "subject"),
    bodyText: readOptionalStringOption(options, "body") ?? "",
    attachPaths: asStringArray(options.attach).map((entry) => entry.trim()).filter(Boolean),
    mailboxId: readOptionalStringOption(options, "mailbox-id"),
    fromName: readOptionalStringOption(options, "from-name"),
    replyThreadId: readOptionalStringOption(options, "reply-thread-id")
  });
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).send(workspaceId, input);
  writeResult(io, globalOptions, result, renderSendResult);
}
async function handleExport(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const config = resolveEmailPlaneConfig(globalOptions, io.env);
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      writeJson2(io, wrapEmailWorkspaceTransfer(store.exportWorkspace(workspaceId), config));
    } finally {
      store.close();
    }
    return;
  }
  const result = await createClient(io, globalOptions).exportWorkspace(workspaceId);
  writeJson2(io, wrapEmailWorkspaceTransfer(result, config));
}
async function handleImport(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    file: "string",
    "dry-run": "boolean"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspaceOptional(globalOptions, io.env);
  const { payload, bundle } = parseEmailWorkspaceTransfer(
    await readJsonFile(readRequiredStringOption(options, "file"))
  );
  if (workspaceId && payload.tenantId !== workspaceId) {
    throw new CliError(
      `Import payload tenant ${payload.tenantId} does not match workspace ${workspaceId}.`
    );
  }
  const config = resolveEmailPlaneConfig(globalOptions, io.env);
  if (asBoolean(options["dry-run"])) {
    writeJson2(io, planEmailWorkspaceImport(payload, bundle, config));
    return;
  }
  if (resolveDataMode(globalOptions, io.env) === "local") {
    const store = await openLocalEmailStore(globalOptions, io);
    try {
      const result2 = store.importWorkspace(payload, {
        source: bundle?.source,
        payloadSchema: bundle?.payloadSchema,
        payloadSha256: bundle?.payloadSha256
      });
      writeResult(io, globalOptions, result2, renderLocalImport);
    } finally {
      store.close();
    }
    return;
  }
  const remoteWorkspaceId = workspaceId ?? resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).importWorkspace(
    remoteWorkspaceId,
    payload
  );
  writeResult(io, globalOptions, result, renderImportStatus);
}
async function handleImportStatus(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "run-id": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).importStatus(
    workspaceId,
    readOptionalStringOption(options, "run-id")
  );
  writeResult(io, globalOptions, result, renderImportStatus);
}
async function handleImportCommand(io, globalOptions, action, args) {
  if (action === "status") {
    await handleImportStatus(io, globalOptions, args);
    return;
  }
  const commandArgs = action == null ? args : [action, ...args];
  await handleImport(io, globalOptions, commandArgs);
}
async function handleInbound(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    file: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const rawPayload = await readJsonFile(readRequiredStringOption(options, "file"));
  const payload = normalizeInboundRequest(
    rawPayload,
    resolveWorkspaceOptional(globalOptions, io.env)
  );
  const result = await createClient(io, globalOptions).simulateInbound(payload);
  writeResult(io, globalOptions, result, renderInboundResult);
}
async function runCli(argv, io) {
  try {
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    if (asBoolean(globalOptions.version)) {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest[0] === "version") {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest[0] === "completion") {
      writeText(io, completionScript(rest[1]));
      return 0;
    }
    if (rest[0] === "commands") {
      writeJson2(io, commandManifest());
      return 0;
    }
    if (rest[0] === "console" && !asBoolean(globalOptions.help)) {
      const manifest2 = commandManifest();
      const result = await runConsoleContractCommand({
        argv: rest.slice(1),
        env: io.env,
        plane: resolveEmailPlaneConfig(globalOptions, io.env),
        workspaceId: resolveWorkspaceOptional(globalOptions, io.env),
        adapterVersion: await cliVersion(),
        commands: manifest2.commands
      });
      writeJson2(io, result.envelope);
      return result.exitCode;
    }
    if (asBoolean(globalOptions.help) || rest.length === 0 || rest[0] === "help") {
      writeHelp(io, asBoolean(globalOptions.json));
      return 0;
    }
    activeSession = await loadSession(io.env);
    const manifest = commandManifest();
    requireConsoleManifestConfirmation(
      globalOptions,
      rest,
      manifest.commands,
      resolveWorkspaceOptional(globalOptions, io.env)
    );
    const [group, action, ...remaining] = rest;
    const localDataMode = resolveDataMode(globalOptions, io.env) === "local";
    const isWorkspaceMetadataCommand = group === "workspace" && ["list", "current", "use"].includes(action ?? "");
    const isSyncPullCommand = group === "sync" && action === "pull";
    const isCustodySessionCommand = group === "custody" && action === "grant";
    if (group !== "auth" && group !== "store" && (group !== "custody" || isCustodySessionCommand) && !isWorkspaceMetadataCommand && activeSession && (!localDataMode || isSyncPullCommand) && !resolveExternalToken(globalOptions, io.env)) {
      activeSession = await ensureWorkspaceSession(activeSession, {
        workspace: resolveWorkspaceOptional(globalOptions, io.env),
        fetchImpl: io.fetchImpl
      });
      await saveSession(activeSession, io.env);
    }
    switch (group) {
      case "auth":
        await handleAuthCommand(io, globalOptions, action, remaining);
        break;
      case "store":
        await handleStoreCommand(io, globalOptions, action, remaining);
        break;
      case "custody":
        await handleCustodyCommand(io, globalOptions, action, remaining);
        break;
      case "sync":
        await handleSyncCommand(io, globalOptions, action, remaining);
        break;
      case "workspace":
        await handleWorkspaceCommand(io, globalOptions, action, remaining);
        break;
      case "mailboxes":
        await handleMailboxesCommand(io, globalOptions, action, remaining);
        break;
      case "threads":
        await handleThreadsCommand(io, globalOptions, action, remaining);
        break;
      case "attachments":
        await handleAttachmentsCommand(io, globalOptions, action, remaining);
        break;
      case "drafts":
        await handleDraftsCommand(io, globalOptions, action, remaining);
        break;
      case "domains":
        await handleDomainsCommand(io, globalOptions, action, remaining);
        break;
      case "send":
        await handleSend(io, globalOptions, rest.slice(1));
        break;
      case "export":
        await handleExport(io, globalOptions, rest.slice(1));
        break;
      case "import":
        await handleImportCommand(io, globalOptions, action, remaining);
        break;
      case "inbound":
        await handleInbound(io, globalOptions, rest.slice(1));
        break;
      default:
        throw new CliError(`Unknown command: ${group}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected CLI error.";
    if (argv.includes("--json")) {
      writeJsonError(io, message);
      return error instanceof CliError ? error.exitCode : 1;
    }
    if (error instanceof CliError) {
      io.stderr(`${error.message}
`);
      return error.exitCode;
    }
    io.stderr(`${message}
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
