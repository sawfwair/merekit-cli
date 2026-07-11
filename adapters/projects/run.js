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
import { createHash, randomUUID as randomUUID2 } from "node:crypto";
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
var init_config = __esm({
  "node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/config.ts"() {
  }
});

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/index.ts
import { createHash as createHash2, randomUUID as randomUUID3 } from "node:crypto";
import { mkdir as mkdir2 } from "node:fs/promises";
import path3 from "node:path";
function isoNow2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function json(value) {
  return JSON.stringify(value ?? {});
}
function makePlaneId(prefix) {
  return `${prefix}_${randomUUID3().replaceAll("-", "").slice(0, 24)}`;
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
  const envelope = input.envelope;
  const event = nestedRecord(envelope, "event") ?? envelope;
  const eventType = stringField(envelope, "eventType") ?? stringField(event, "type") ?? stringField(event, "eventType");
  if (!eventType) throw new Error("Projection envelope eventType is required.");
  const workspaceId = stringField(envelope, "workspaceId") ?? stringField(event, "workspaceId") ?? stringField(event, "tenantId");
  if (!workspaceId) throw new Error("Projection envelope workspaceId is required.");
  const product = stringField(envelope, "product") ?? stringField(envelope, "appId") ?? stringField(event, "product") ?? defaultAppIdForProjection(null, eventType);
  const appId = input.appId?.trim() || stringField(envelope, "appId") || defaultAppIdForProjection(product, eventType);
  const sourceEventId = stringField(envelope, "eventId") ?? stringField(event, "eventId") ?? stringField(event, "id") ?? stringField(envelope, "dedupeKey") ?? `sha256:${hashJson(input.envelope).slice(0, 32)}`;
  const inferredExternal = inferExternalObject(event);
  const externalObjectType = stringField(envelope, "externalObjectType") ?? stringField(event, "externalObjectType") ?? inferredExternal.externalObjectType;
  const externalObjectId = stringField(envelope, "externalObjectId") ?? stringField(event, "externalObjectId") ?? inferredExternal.externalObjectId;
  const occurredAt = stringField(envelope, "occurredAt") ?? stringField(event, "occurredAt") ?? stringField(event, "updatedAt") ?? stringField(nestedRecord(event, "publication") ?? {}, "publishedAt") ?? stringField(nestedRecord(event, "projection") ?? {}, "publishedAt") ?? receivedAt;
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
    canonicalUrl: stringField(envelope, "canonicalUrl") ?? stringField(event, "canonicalUrl"),
    dedupeKey: stringField(envelope, "dedupeKey"),
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

// cli/local-store.ts
var local_store_exports = {};
__export(local_store_exports, {
  LocalProjectsStore: () => LocalProjectsStore,
  PROJECTS_APP_ID: () => PROJECTS_APP_ID,
  PROJECTS_PROJECTS_PAYLOAD_SCHEMA: () => PROJECTS_PROJECTS_PAYLOAD_SCHEMA
});
import { randomUUID as randomUUID4 } from "node:crypto";
function isoNow3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function makeId(prefix) {
  return `${prefix}_${randomUUID4().replaceAll("-", "").slice(0, 16)}`;
}
function parseJson2(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function jsonText(value) {
  return JSON.stringify(value ?? null);
}
function isRecord3(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function readString2(value, label, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required for local Projects records.`);
  }
  return raw.trim();
}
function readOptionalString(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
function readNumber(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function readBoolean(value, fallback) {
  if (value === void 0) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}
function readRecord(value, fallback) {
  return isRecord3(value) ? value : fallback;
}
function readStringList(value, fallback) {
  const raw = value === void 0 ? fallback : value;
  if (Array.isArray(raw)) {
    return [...new Set(raw.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  }
  if (typeof raw === "string") {
    return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))];
  }
  return fallback;
}
function readEnum(value, fallback, allowed, label) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  if (!allowed.has(raw)) {
    throw new Error(`${label} must be one of ${[...allowed].join(", ")}.`);
  }
  return raw;
}
function likeValue(value) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}
function rowToProject(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    schemaVersion: row.schema_version,
    attributes: parseJson2(row.attributes_json, {}),
    title: row.title,
    client: row.client,
    contractVehicle: row.contract_vehicle,
    role: row.role,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    isOngoing: row.is_ongoing === 1,
    description: row.description,
    outcomes: row.outcomes,
    capabilities: parseJson2(row.capabilities_json, []),
    tags: parseJson2(row.tags_json, []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToContact(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    name: row.name,
    title: row.title,
    organization: row.organization,
    location: row.location,
    email: row.email,
    phone: row.phone,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToKnowledgeEntry(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    entryType: row.entry_type,
    title: row.title,
    content: row.content,
    tags: parseJson2(row.tags_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToLink(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    label: row.label,
    url: row.url,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToProposal(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    schemaVersion: row.schema_version,
    sourceItemId: row.source_item_id,
    externalReference: row.external_reference,
    attributes: parseJson2(row.attributes_json, {}),
    title: row.title,
    client: row.client,
    solicitationNumber: row.solicitation_number,
    businessDealId: row.business_deal_id,
    dueDate: row.due_date,
    stage: row.stage,
    summary: row.summary,
    winThemes: row.win_themes,
    requirements: row.requirements,
    linkedProfileIds: parseJson2(row.linked_profile_ids_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToFile(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    proposalId: row.proposal_id,
    name: row.name,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    artifactKey: row.artifact_key,
    sha256: row.sha256,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToProfile(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    title: row.title,
    client: row.client,
    contractVehicle: row.contract_vehicle,
    role: row.role,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    isOngoing: row.is_ongoing === 1,
    summary: row.summary,
    relevance: row.relevance,
    differentiators: row.differentiators,
    capabilityTags: parseJson2(row.capability_tags_json, []),
    featuredOutcomes: parseJson2(row.featured_outcomes_json, []),
    referenceContactId: row.reference_contact_id,
    referenceName: row.reference_name,
    referenceTitle: row.reference_title,
    referenceOrganization: row.reference_organization,
    referenceLocation: row.reference_location,
    referenceEmail: row.reference_email,
    referencePhone: row.reference_phone,
    visibility: row.visibility,
    isFeatured: row.is_featured === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function toSummary(project, counts) {
  return {
    ...project,
    ...counts
  };
}
function normalizeProjectInput(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("prj")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    kind: readEnum(input.kind, existing?.kind ?? "project.default", PROJECT_KINDS, "kind"),
    schemaVersion: readNumber(input.schemaVersion, existing?.schemaVersion ?? 1),
    attributes: readRecord(input.attributes, existing?.attributes ?? {}),
    title: readString2(input.title, "title", existing?.title),
    client: readString2(input.client, "client", existing?.client),
    contractVehicle: readOptionalString(input.contractVehicle, existing?.contractVehicle),
    role: readEnum(input.role, existing?.role ?? "prime", PROJECT_ROLES, "role"),
    dateStart: readString2(input.dateStart, "dateStart", existing?.dateStart),
    dateEnd: readOptionalString(input.dateEnd, existing?.dateEnd),
    isOngoing: readBoolean(input.isOngoing, existing?.isOngoing ?? false),
    description: readString2(input.description, "description", existing?.description),
    outcomes: readOptionalString(input.outcomes, existing?.outcomes) ?? "",
    capabilities: readStringList(input.capabilities, existing?.capabilities ?? []),
    tags: readStringList(input.tags, existing?.tags ?? []),
    status: readEnum(input.status, existing?.status ?? "active", PROJECT_STATUSES, "status"),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeContactInput(projectId, input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("con")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    projectId: existing?.projectId ?? (typeof input.projectId === "string" && input.projectId.trim() ? input.projectId.trim() : projectId),
    name: readString2(input.name, "name", existing?.name),
    title: readOptionalString(input.title, existing?.title),
    organization: readOptionalString(input.organization, existing?.organization),
    location: readOptionalString(input.location, existing?.location),
    email: readOptionalString(input.email, existing?.email),
    phone: readOptionalString(input.phone, existing?.phone),
    kind: readEnum(input.kind, existing?.kind ?? "reference", PROJECT_CONTACT_KINDS, "kind"),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeKnowledgeInput(projectId, input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("kn")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    projectId: existing?.projectId ?? (typeof input.projectId === "string" && input.projectId.trim() ? input.projectId.trim() : projectId),
    entryType: readEnum(input.entryType, existing?.entryType ?? "note", PROJECT_KNOWLEDGE_ENTRY_TYPES, "entryType"),
    title: readString2(input.title, "title", existing?.title),
    content: readString2(input.content, "content", existing?.content),
    tags: readStringList(input.tags, existing?.tags ?? []),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeLinkInput(projectId, input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("lnk")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    projectId: existing?.projectId ?? (typeof input.projectId === "string" && input.projectId.trim() ? input.projectId.trim() : projectId),
    label: readString2(input.label, "label", existing?.label),
    url: readString2(input.url, "url", existing?.url),
    kind: readString2(input.kind, "kind", existing?.kind ?? "general"),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeProposalInput(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("prop")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    kind: readString2(input.kind, "kind", existing?.kind ?? "proposal.default"),
    schemaVersion: readNumber(input.schemaVersion, existing?.schemaVersion ?? 1),
    sourceItemId: readOptionalString(input.sourceItemId, existing?.sourceItemId),
    externalReference: readOptionalString(input.externalReference, existing?.externalReference),
    attributes: readRecord(input.attributes, existing?.attributes ?? {}),
    title: readString2(input.title, "title", existing?.title),
    client: readString2(input.client, "client", existing?.client),
    solicitationNumber: readOptionalString(input.solicitationNumber, existing?.solicitationNumber),
    businessDealId: readOptionalString(input.businessDealId, existing?.businessDealId),
    dueDate: readOptionalString(input.dueDate, existing?.dueDate),
    stage: readEnum(input.stage, existing?.stage ?? "tracking", PROPOSAL_STAGES, "stage"),
    summary: readOptionalString(input.summary, existing?.summary) ?? "",
    winThemes: readOptionalString(input.winThemes, existing?.winThemes) ?? "",
    requirements: readOptionalString(input.requirements, existing?.requirements) ?? "",
    linkedProfileIds: readStringList(input.linkedProfileIds, existing?.linkedProfileIds ?? []),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeFileInput(input, existing) {
  const now = isoNow3();
  const projectId = readOptionalString(input.projectId, existing?.projectId);
  const proposalId = readOptionalString(input.proposalId, existing?.proposalId);
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("file")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    projectId,
    proposalId,
    name: readString2(input.name, "name", existing?.name),
    kind: readString2(input.kind, "kind", existing?.kind ?? "general"),
    mimeType: readOptionalString(input.mimeType, existing?.mimeType),
    sizeBytes: input.sizeBytes === null ? null : input.sizeBytes === void 0 ? existing?.sizeBytes ?? null : readNumber(input.sizeBytes, existing?.sizeBytes ?? 0),
    artifactKey: readOptionalString(input.artifactKey, existing?.artifactKey),
    sha256: readOptionalString(input.sha256, existing?.sha256),
    notes: readOptionalString(input.notes, existing?.notes),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeProfileInput(input, existing) {
  const now = isoNow3();
  return {
    id: existing?.id ?? (typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("ppf")),
    workspaceId: existing?.workspaceId ?? (typeof input.workspaceId === "string" ? input.workspaceId : ""),
    projectId: readOptionalString(input.projectId, existing?.projectId),
    title: readString2(input.title, "title", existing?.title),
    client: readString2(input.client, "client", existing?.client),
    contractVehicle: readOptionalString(input.contractVehicle, existing?.contractVehicle),
    role: readEnum(input.role, existing?.role ?? "prime", PROJECT_ROLES, "role"),
    dateStart: readOptionalString(input.dateStart, existing?.dateStart),
    dateEnd: readOptionalString(input.dateEnd, existing?.dateEnd),
    isOngoing: readBoolean(input.isOngoing, existing?.isOngoing ?? false),
    summary: readOptionalString(input.summary, existing?.summary) ?? "",
    relevance: readOptionalString(input.relevance, existing?.relevance) ?? "",
    differentiators: readOptionalString(input.differentiators, existing?.differentiators) ?? "",
    capabilityTags: readStringList(input.capabilityTags, existing?.capabilityTags ?? []),
    featuredOutcomes: readStringList(input.featuredOutcomes, existing?.featuredOutcomes ?? []),
    referenceContactId: readOptionalString(input.referenceContactId, existing?.referenceContactId),
    referenceName: readOptionalString(input.referenceName, existing?.referenceName),
    referenceTitle: readOptionalString(input.referenceTitle, existing?.referenceTitle),
    referenceOrganization: readOptionalString(input.referenceOrganization, existing?.referenceOrganization),
    referenceLocation: readOptionalString(input.referenceLocation, existing?.referenceLocation),
    referenceEmail: readOptionalString(input.referenceEmail, existing?.referenceEmail),
    referencePhone: readOptionalString(input.referencePhone, existing?.referencePhone),
    visibility: readEnum(input.visibility, existing?.visibility ?? "private", PROFILE_VISIBILITIES, "visibility"),
    isFeatured: readBoolean(input.isFeatured, existing?.isFeatured ?? false),
    createdAt: existing?.createdAt ?? readOptionalString(input.createdAt) ?? now,
    updatedAt: readOptionalString(input.updatedAt) ?? now
  };
}
function normalizeTransferPayload(value) {
  if (!isRecord3(value) || value.kind !== PROJECTS_PROJECTS_PAYLOAD_SCHEMA || value.version !== 1) {
    throw new Error(`Projects transfer payload must be ${PROJECTS_PROJECTS_PAYLOAD_SCHEMA} version 1.`);
  }
  if (!Array.isArray(value.projects)) {
    throw new Error("Projects transfer payload projects must be an array.");
  }
  return {
    kind: PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
    version: 1,
    projects: value.projects.map((entry) => normalizeProjectInput(isRecord3(entry) ? entry : {})),
    contacts: Array.isArray(value.contacts) ? value.contacts.map((entry) => {
      const record = isRecord3(entry) ? entry : {};
      return normalizeContactInput(readString2(record.projectId, "projectId"), record);
    }) : [],
    knowledgeEntries: Array.isArray(value.knowledgeEntries) ? value.knowledgeEntries.map((entry) => {
      const record = isRecord3(entry) ? entry : {};
      return normalizeKnowledgeInput(readString2(record.projectId, "projectId"), record);
    }) : [],
    links: Array.isArray(value.links) ? value.links.map((entry) => {
      const record = isRecord3(entry) ? entry : {};
      return normalizeLinkInput(readString2(record.projectId, "projectId"), record);
    }) : [],
    proposals: Array.isArray(value.proposals) ? value.proposals.map((entry) => normalizeProposalInput(isRecord3(entry) ? entry : {})) : [],
    files: Array.isArray(value.files) ? value.files.map((entry) => normalizeFileInput(isRecord3(entry) ? entry : {})) : [],
    pastPerformanceProfiles: Array.isArray(value.pastPerformanceProfiles) ? value.pastPerformanceProfiles.map((entry) => normalizeProfileInput(isRecord3(entry) ? entry : {})) : []
  };
}
var PROJECTS_APP_ID, PROJECTS_PROJECTS_PAYLOAD_SCHEMA, PROJECT_KINDS, PROJECT_ROLES, PROJECT_STATUSES, PROJECT_CONTACT_KINDS, PROJECT_KNOWLEDGE_ENTRY_TYPES, PROPOSAL_STAGES, PROFILE_VISIBILITIES, LocalProjectsStore;
var init_local_store = __esm({
  "cli/local-store.ts"() {
    "use strict";
    init_src();
    PROJECTS_APP_ID = "mere-projects";
    PROJECTS_PROJECTS_PAYLOAD_SCHEMA = "mere.projects.projects.v1";
    PROJECT_KINDS = /* @__PURE__ */ new Set([
      "project.default",
      "project.client_delivery",
      "project.gov_contract",
      "project.internal_initiative",
      "project.partnership",
      "project.product_build",
      "project.research"
    ]);
    PROJECT_ROLES = /* @__PURE__ */ new Set(["prime", "subcontract"]);
    PROJECT_STATUSES = /* @__PURE__ */ new Set(["active", "completed", "archived"]);
    PROJECT_CONTACT_KINDS = /* @__PURE__ */ new Set(["reference", "team", "partner", "client"]);
    PROJECT_KNOWLEDGE_ENTRY_TYPES = /* @__PURE__ */ new Set([
      "note",
      "outcome",
      "lesson",
      "risk",
      "evidence",
      "proposal_note"
    ]);
    PROPOSAL_STAGES = /* @__PURE__ */ new Set(["tracking", "capture", "drafting", "submitted", "won", "lost", "archived"]);
    PROFILE_VISIBILITIES = /* @__PURE__ */ new Set(["private", "workspace", "public"]);
    LocalProjectsStore = class _LocalProjectsStore {
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
        registerPlaneApp(opened.db, PROJECTS_APP_ID, "Project Workspace");
        registerPlaneTransferSchema(opened.db, PROJECTS_APP_ID, {
          payloadSchema: PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
          displayName: "Project record transfer",
          description: "Portable Project Workspace project records for local/cloud migration."
        });
        upsertPlaneWorkspace(opened.db, PROJECTS_APP_ID, {
          workspaceId: input.workspace.workspaceId,
          slug: input.workspace.slug,
          name: input.workspace.name,
          dataPlane: input.config.data,
          aiPlane: input.config.ai
        });
        const store = new _LocalProjectsStore(opened.dbPath, opened.db, input.config, input.workspace);
        store.ensureSchema();
        return store;
      }
      close() {
        this.db.close();
      }
      ensureSchema() {
        this.db.exec(`
			CREATE TABLE IF NOT EXISTS projects_local_projects (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				kind TEXT NOT NULL,
				schema_version INTEGER NOT NULL,
				attributes_json TEXT NOT NULL,
				title TEXT NOT NULL,
				client TEXT NOT NULL,
				contract_vehicle TEXT,
				role TEXT NOT NULL,
				date_start TEXT NOT NULL,
				date_end TEXT,
				is_ongoing INTEGER NOT NULL,
				description TEXT NOT NULL,
				outcomes TEXT NOT NULL,
				capabilities_json TEXT NOT NULL,
				tags_json TEXT NOT NULL,
				status TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_projects_workspace_updated
				ON projects_local_projects (workspace_id, updated_at DESC);
			CREATE INDEX IF NOT EXISTS idx_projects_local_projects_workspace_status
				ON projects_local_projects (workspace_id, status);

			CREATE TABLE IF NOT EXISTS projects_local_contacts (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT NOT NULL,
				name TEXT NOT NULL,
				title TEXT,
				organization TEXT,
				location TEXT,
				email TEXT,
				phone TEXT,
				kind TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_contacts_project
				ON projects_local_contacts (workspace_id, project_id, updated_at DESC);

			CREATE TABLE IF NOT EXISTS projects_local_knowledge_entries (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT NOT NULL,
				entry_type TEXT NOT NULL,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				tags_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_knowledge_entries_project
				ON projects_local_knowledge_entries (workspace_id, project_id, updated_at DESC);

			CREATE TABLE IF NOT EXISTS projects_local_links (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT NOT NULL,
				label TEXT NOT NULL,
				url TEXT NOT NULL,
				kind TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_links_project
				ON projects_local_links (workspace_id, project_id, updated_at DESC);

			CREATE TABLE IF NOT EXISTS projects_local_proposals (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				kind TEXT NOT NULL,
				schema_version INTEGER NOT NULL,
				source_item_id TEXT,
				external_reference TEXT,
				attributes_json TEXT NOT NULL,
				title TEXT NOT NULL,
				client TEXT NOT NULL,
				solicitation_number TEXT,
				business_deal_id TEXT,
				due_date TEXT,
				stage TEXT NOT NULL,
				summary TEXT NOT NULL,
				win_themes TEXT NOT NULL,
				requirements TEXT NOT NULL,
				linked_profile_ids_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_proposals_workspace_updated
				ON projects_local_proposals (workspace_id, updated_at DESC);
			CREATE INDEX IF NOT EXISTS idx_projects_local_proposals_stage
				ON projects_local_proposals (workspace_id, stage);

			CREATE TABLE IF NOT EXISTS projects_local_files (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT,
				proposal_id TEXT,
				name TEXT NOT NULL,
				kind TEXT NOT NULL,
				mime_type TEXT,
				size_bytes INTEGER,
				artifact_key TEXT,
				sha256 TEXT,
				notes TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_files_project
				ON projects_local_files (workspace_id, project_id, updated_at DESC);
			CREATE INDEX IF NOT EXISTS idx_projects_local_files_proposal
				ON projects_local_files (workspace_id, proposal_id, updated_at DESC);

			CREATE TABLE IF NOT EXISTS projects_local_profiles (
				id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT,
				title TEXT NOT NULL,
				client TEXT NOT NULL,
				contract_vehicle TEXT,
				role TEXT NOT NULL,
				date_start TEXT,
				date_end TEXT,
				is_ongoing INTEGER NOT NULL,
				summary TEXT NOT NULL,
				relevance TEXT NOT NULL,
				differentiators TEXT NOT NULL,
				capability_tags_json TEXT NOT NULL,
				featured_outcomes_json TEXT NOT NULL,
				reference_contact_id TEXT,
				reference_name TEXT,
				reference_title TEXT,
				reference_organization TEXT,
				reference_location TEXT,
				reference_email TEXT,
				reference_phone TEXT,
				visibility TEXT NOT NULL,
				is_featured INTEGER NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (workspace_id, id)
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_profiles_project
				ON projects_local_profiles (workspace_id, project_id, updated_at DESC);
			CREATE INDEX IF NOT EXISTS idx_projects_local_profiles_visibility
				ON projects_local_profiles (workspace_id, visibility);

			CREATE TABLE IF NOT EXISTS projects_local_projections (
				id TEXT PRIMARY KEY,
				workspace_id TEXT NOT NULL,
				scope TEXT NOT NULL,
				object_type TEXT NOT NULL,
				object_id TEXT NOT NULL,
				published_at TEXT NOT NULL,
				revoked_at TEXT,
				payload_json TEXT NOT NULL,
				last_projected_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_projects_local_projections_workspace_scope
				ON projects_local_projections (workspace_id, scope, updated_at DESC);
		`);
      }
      info() {
        const inventory = getLocalPlaneInventory(this.db, { appId: PROJECTS_APP_ID });
        const projectCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_projects WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const contactCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_contacts WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const knowledgeCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_knowledge_entries WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const linkCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_links WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const proposalCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_proposals WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const fileCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_files WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const profileCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_profiles WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        const projectionCount = Number(
          this.db.prepare("SELECT COUNT(*) AS count FROM projects_local_projections WHERE workspace_id = ?").get(this.workspace.workspaceId)?.count ?? 0
        );
        return {
          dbPath: this.dbPath,
          workspaceId: this.workspace.workspaceId,
          projectCount,
          contactCount,
          knowledgeCount,
          linkCount,
          proposalCount,
          fileCount,
          profileCount,
          projectionCount,
          localProjectStore: "enabled",
          localProjectPersistenceSupported: true,
          localAiSupported: true,
          planeAppCount: inventory.counts.apps,
          planeWorkspaceCount: inventory.counts.workspaces,
          transferSchemaCount: inventory.counts.transferSchemas,
          transferCount: inventory.counts.transfers,
          aiJobCount: inventory.counts.aiJobs
        };
      }
      listProjectRecords(filters = {}) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (filters.search) {
          const term = likeValue(filters.search);
          clauses.push("(title LIKE ? ESCAPE '\\' OR client LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR outcomes LIKE ? ESCAPE '\\' OR capabilities_json LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')");
          params.push(term, term, term, term, term, term);
        }
        if (filters.role) {
          clauses.push("role = ?");
          params.push(filters.role);
        }
        if (filters.status) {
          clauses.push("status = ?");
          params.push(filters.status);
        }
        if (filters.client) {
          clauses.push("client = ?");
          params.push(filters.client);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_projects WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToProject);
      }
      projectChildCounts(projectIds) {
        const counts = new Map(
          projectIds.map((id) => [id, { contactCount: 0, knowledgeCount: 0, linkCount: 0, fileCount: 0, profileCount: 0 }])
        );
        if (projectIds.length === 0) return counts;
        const placeholders = projectIds.map(() => "?").join(", ");
        const params = [this.workspace.workspaceId, ...projectIds];
        const apply = (table, key) => {
          const rows = this.db.prepare(`SELECT project_id, COUNT(*) AS count FROM ${table} WHERE workspace_id = ? AND project_id IN (${placeholders}) GROUP BY project_id`).all(...params);
          for (const row of rows) {
            const entry = counts.get(row.project_id);
            if (entry) entry[key] = Number(row.count ?? 0);
          }
        };
        apply("projects_local_contacts", "contactCount");
        apply("projects_local_knowledge_entries", "knowledgeCount");
        apply("projects_local_links", "linkCount");
        apply("projects_local_files", "fileCount");
        apply("projects_local_profiles", "profileCount");
        return counts;
      }
      listProjects(filters = {}) {
        const projects = this.listProjectRecords(filters);
        const counts = this.projectChildCounts(projects.map((project) => project.id));
        return projects.map(
          (project) => toSummary(project, counts.get(project.id) ?? { contactCount: 0, knowledgeCount: 0, linkCount: 0, fileCount: 0, profileCount: 0 })
        );
      }
      getProject(projectId) {
        const row = this.db.prepare("SELECT * FROM projects_local_projects WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, projectId);
        return row ? rowToProject(row) : null;
      }
      requireProject(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
          throw new Error(`Local project not found: ${projectId}`);
        }
        return project;
      }
      contactRecords(projectId) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (projectId) {
          clauses.push("project_id = ?");
          params.push(projectId);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_contacts WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, name COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToContact);
      }
      listContacts(projectId) {
        this.requireProject(projectId);
        return this.contactRecords(projectId);
      }
      getContact(projectId, contactId) {
        const row = this.db.prepare("SELECT * FROM projects_local_contacts WHERE workspace_id = ? AND project_id = ? AND id = ?").get(this.workspace.workspaceId, projectId, contactId);
        return row ? rowToContact(row) : null;
      }
      upsertContact(projectId, input) {
        this.requireProject(projectId);
        const existingId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : void 0;
        const contact = {
          ...normalizeContactInput(projectId, input, existingId ? this.getContact(projectId, existingId) ?? void 0 : void 0),
          workspaceId: this.workspace.workspaceId,
          projectId
        };
        this.db.prepare(
          `INSERT INTO projects_local_contacts (
					id, workspace_id, project_id, name, title, organization, location, email, phone, kind, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					project_id = excluded.project_id,
					name = excluded.name,
					title = excluded.title,
					organization = excluded.organization,
					location = excluded.location,
					email = excluded.email,
					phone = excluded.phone,
					kind = excluded.kind,
					updated_at = excluded.updated_at`
        ).run(
          contact.id,
          contact.workspaceId,
          contact.projectId,
          contact.name,
          contact.title,
          contact.organization,
          contact.location,
          contact.email,
          contact.phone,
          contact.kind,
          contact.createdAt,
          contact.updatedAt
        );
        return contact;
      }
      deleteContact(projectId, contactId) {
        this.requireProject(projectId);
        const result = this.db.prepare("DELETE FROM projects_local_contacts WHERE workspace_id = ? AND project_id = ? AND id = ?").run(this.workspace.workspaceId, projectId, contactId);
        return result.changes > 0;
      }
      knowledgeRecords(projectId) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (projectId) {
          clauses.push("project_id = ?");
          params.push(projectId);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_knowledge_entries WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToKnowledgeEntry);
      }
      listKnowledgeEntries(projectId) {
        this.requireProject(projectId);
        return this.knowledgeRecords(projectId);
      }
      getKnowledgeEntry(projectId, entryId) {
        const row = this.db.prepare("SELECT * FROM projects_local_knowledge_entries WHERE workspace_id = ? AND project_id = ? AND id = ?").get(this.workspace.workspaceId, projectId, entryId);
        return row ? rowToKnowledgeEntry(row) : null;
      }
      upsertKnowledgeEntry(projectId, input) {
        this.requireProject(projectId);
        const existingId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : void 0;
        const entry = {
          ...normalizeKnowledgeInput(projectId, input, existingId ? this.getKnowledgeEntry(projectId, existingId) ?? void 0 : void 0),
          workspaceId: this.workspace.workspaceId,
          projectId
        };
        this.db.prepare(
          `INSERT INTO projects_local_knowledge_entries (
					id, workspace_id, project_id, entry_type, title, content, tags_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					project_id = excluded.project_id,
					entry_type = excluded.entry_type,
					title = excluded.title,
					content = excluded.content,
					tags_json = excluded.tags_json,
					updated_at = excluded.updated_at`
        ).run(
          entry.id,
          entry.workspaceId,
          entry.projectId,
          entry.entryType,
          entry.title,
          entry.content,
          jsonText(entry.tags),
          entry.createdAt,
          entry.updatedAt
        );
        return entry;
      }
      deleteKnowledgeEntry(projectId, entryId) {
        this.requireProject(projectId);
        const result = this.db.prepare("DELETE FROM projects_local_knowledge_entries WHERE workspace_id = ? AND project_id = ? AND id = ?").run(this.workspace.workspaceId, projectId, entryId);
        return result.changes > 0;
      }
      linkRecords(projectId) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (projectId) {
          clauses.push("project_id = ?");
          params.push(projectId);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_links WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, label COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToLink);
      }
      listLinks(projectId) {
        this.requireProject(projectId);
        return this.linkRecords(projectId);
      }
      getLink(projectId, linkId) {
        const row = this.db.prepare("SELECT * FROM projects_local_links WHERE workspace_id = ? AND project_id = ? AND id = ?").get(this.workspace.workspaceId, projectId, linkId);
        return row ? rowToLink(row) : null;
      }
      upsertLink(projectId, input) {
        this.requireProject(projectId);
        const existingId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : void 0;
        const link = {
          ...normalizeLinkInput(projectId, input, existingId ? this.getLink(projectId, existingId) ?? void 0 : void 0),
          workspaceId: this.workspace.workspaceId,
          projectId
        };
        this.db.prepare(
          `INSERT INTO projects_local_links (
					id, workspace_id, project_id, label, url, kind, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					project_id = excluded.project_id,
					label = excluded.label,
					url = excluded.url,
					kind = excluded.kind,
					updated_at = excluded.updated_at`
        ).run(
          link.id,
          link.workspaceId,
          link.projectId,
          link.label,
          link.url,
          link.kind,
          link.createdAt,
          link.updatedAt
        );
        return link;
      }
      deleteLink(projectId, linkId) {
        this.requireProject(projectId);
        const result = this.db.prepare("DELETE FROM projects_local_links WHERE workspace_id = ? AND project_id = ? AND id = ?").run(this.workspace.workspaceId, projectId, linkId);
        return result.changes > 0;
      }
      listProposals(filters = {}) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (filters.search) {
          const term = likeValue(filters.search);
          clauses.push("(title LIKE ? ESCAPE '\\' OR client LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR requirements LIKE ? ESCAPE '\\')");
          params.push(term, term, term, term);
        }
        if (filters.stage) {
          clauses.push("stage = ?");
          params.push(filters.stage);
        }
        if (filters.client) {
          clauses.push("client = ?");
          params.push(filters.client);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_proposals WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToProposal);
      }
      getProposal(id) {
        const row = this.db.prepare("SELECT * FROM projects_local_proposals WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, id);
        return row ? rowToProposal(row) : null;
      }
      upsertProposal(input, existing) {
        const proposal = {
          ...normalizeProposalInput(input, existing),
          workspaceId: this.workspace.workspaceId
        };
        this.db.prepare(
          `INSERT INTO projects_local_proposals (
					id, workspace_id, kind, schema_version, source_item_id, external_reference, attributes_json,
					title, client, solicitation_number, business_deal_id, due_date, stage, summary, win_themes,
					requirements, linked_profile_ids_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					kind = excluded.kind,
					schema_version = excluded.schema_version,
					source_item_id = excluded.source_item_id,
					external_reference = excluded.external_reference,
					attributes_json = excluded.attributes_json,
					title = excluded.title,
					client = excluded.client,
					solicitation_number = excluded.solicitation_number,
					business_deal_id = excluded.business_deal_id,
					due_date = excluded.due_date,
					stage = excluded.stage,
					summary = excluded.summary,
					win_themes = excluded.win_themes,
					requirements = excluded.requirements,
					linked_profile_ids_json = excluded.linked_profile_ids_json,
					updated_at = excluded.updated_at`
        ).run(
          proposal.id,
          proposal.workspaceId,
          proposal.kind,
          proposal.schemaVersion,
          proposal.sourceItemId,
          proposal.externalReference,
          jsonText(proposal.attributes),
          proposal.title,
          proposal.client,
          proposal.solicitationNumber,
          proposal.businessDealId,
          proposal.dueDate,
          proposal.stage,
          proposal.summary,
          proposal.winThemes,
          proposal.requirements,
          jsonText(proposal.linkedProfileIds),
          proposal.createdAt,
          proposal.updatedAt
        );
        return proposal;
      }
      updateProposal(id, input) {
        const existing = this.getProposal(id);
        if (!existing) return null;
        return this.upsertProposal(input, existing);
      }
      deleteProposal(id) {
        const result = this.db.prepare("DELETE FROM projects_local_proposals WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, id);
        return result.changes > 0;
      }
      listFiles(filters = {}) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (filters.projectId) {
          clauses.push("project_id = ?");
          params.push(filters.projectId);
        }
        if (filters.proposalId) {
          clauses.push("proposal_id = ?");
          params.push(filters.proposalId);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_files WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, name COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToFile);
      }
      getFile(id) {
        const row = this.db.prepare("SELECT * FROM projects_local_files WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, id);
        return row ? rowToFile(row) : null;
      }
      upsertFile(input, existing) {
        const file = {
          ...normalizeFileInput(input, existing),
          workspaceId: this.workspace.workspaceId
        };
        this.db.prepare(
          `INSERT INTO projects_local_files (
					id, workspace_id, project_id, proposal_id, name, kind, mime_type, size_bytes, artifact_key,
					sha256, notes, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					project_id = excluded.project_id,
					proposal_id = excluded.proposal_id,
					name = excluded.name,
					kind = excluded.kind,
					mime_type = excluded.mime_type,
					size_bytes = excluded.size_bytes,
					artifact_key = excluded.artifact_key,
					sha256 = excluded.sha256,
					notes = excluded.notes,
					updated_at = excluded.updated_at`
        ).run(
          file.id,
          file.workspaceId,
          file.projectId,
          file.proposalId,
          file.name,
          file.kind,
          file.mimeType,
          file.sizeBytes,
          file.artifactKey,
          file.sha256,
          file.notes,
          file.createdAt,
          file.updatedAt
        );
        return file;
      }
      deleteFile(id) {
        const result = this.db.prepare("DELETE FROM projects_local_files WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, id);
        return result.changes > 0;
      }
      listProfiles(filters = {}) {
        const clauses = ["workspace_id = ?"];
        const params = [this.workspace.workspaceId];
        if (filters.search) {
          const term = likeValue(filters.search);
          clauses.push("(title LIKE ? ESCAPE '\\' OR client LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR relevance LIKE ? ESCAPE '\\' OR capability_tags_json LIKE ? ESCAPE '\\')");
          params.push(term, term, term, term, term);
        }
        if (filters.role) {
          clauses.push("role = ?");
          params.push(filters.role);
        }
        if (filters.client) {
          clauses.push("client = ?");
          params.push(filters.client);
        }
        if (filters.visibility) {
          clauses.push("visibility = ?");
          params.push(filters.visibility);
        }
        const rows = this.db.prepare(`SELECT * FROM projects_local_profiles WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title COLLATE NOCASE ASC`).all(...params);
        return rows.map(rowToProfile);
      }
      getProfile(id) {
        const row = this.db.prepare("SELECT * FROM projects_local_profiles WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, id);
        return row ? rowToProfile(row) : null;
      }
      upsertProfile(input, existing) {
        const profile = {
          ...normalizeProfileInput(input, existing),
          workspaceId: this.workspace.workspaceId
        };
        this.db.prepare(
          `INSERT INTO projects_local_profiles (
					id, workspace_id, project_id, title, client, contract_vehicle, role, date_start, date_end,
					is_ongoing, summary, relevance, differentiators, capability_tags_json, featured_outcomes_json,
					reference_contact_id, reference_name, reference_title, reference_organization, reference_location,
					reference_email, reference_phone, visibility, is_featured, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					project_id = excluded.project_id,
					title = excluded.title,
					client = excluded.client,
					contract_vehicle = excluded.contract_vehicle,
					role = excluded.role,
					date_start = excluded.date_start,
					date_end = excluded.date_end,
					is_ongoing = excluded.is_ongoing,
					summary = excluded.summary,
					relevance = excluded.relevance,
					differentiators = excluded.differentiators,
					capability_tags_json = excluded.capability_tags_json,
					featured_outcomes_json = excluded.featured_outcomes_json,
					reference_contact_id = excluded.reference_contact_id,
					reference_name = excluded.reference_name,
					reference_title = excluded.reference_title,
					reference_organization = excluded.reference_organization,
					reference_location = excluded.reference_location,
					reference_email = excluded.reference_email,
					reference_phone = excluded.reference_phone,
					visibility = excluded.visibility,
					is_featured = excluded.is_featured,
					updated_at = excluded.updated_at`
        ).run(
          profile.id,
          profile.workspaceId,
          profile.projectId,
          profile.title,
          profile.client,
          profile.contractVehicle,
          profile.role,
          profile.dateStart,
          profile.dateEnd,
          profile.isOngoing ? 1 : 0,
          profile.summary,
          profile.relevance,
          profile.differentiators,
          jsonText(profile.capabilityTags),
          jsonText(profile.featuredOutcomes),
          profile.referenceContactId,
          profile.referenceName,
          profile.referenceTitle,
          profile.referenceOrganization,
          profile.referenceLocation,
          profile.referenceEmail,
          profile.referencePhone,
          profile.visibility,
          profile.isFeatured ? 1 : 0,
          profile.createdAt,
          profile.updatedAt
        );
        return profile;
      }
      updateProfile(id, input) {
        const existing = this.getProfile(id);
        if (!existing) return null;
        return this.upsertProfile(input, existing);
      }
      deleteProfile(id) {
        const result = this.db.prepare("DELETE FROM projects_local_profiles WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, id);
        return result.changes > 0;
      }
      recordProjection(input) {
        const now = isoNow3();
        const existing = this.db.prepare("SELECT published_at FROM projects_local_projections WHERE workspace_id = ? AND id = ?").get(this.workspace.workspaceId, input.id);
        this.db.prepare(
          `INSERT INTO projects_local_projections (
					id, workspace_id, scope, object_type, object_id, published_at, revoked_at, payload_json, last_projected_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					workspace_id = excluded.workspace_id,
					scope = excluded.scope,
					object_type = excluded.object_type,
					object_id = excluded.object_id,
					published_at = excluded.published_at,
					revoked_at = excluded.revoked_at,
					payload_json = excluded.payload_json,
					last_projected_at = excluded.last_projected_at,
					updated_at = excluded.updated_at`
        ).run(
          input.id,
          this.workspace.workspaceId,
          input.scope,
          input.objectType,
          input.objectId,
          existing?.published_at ?? now,
          input.revoked ? now : null,
          JSON.stringify(input.envelope),
          now,
          now
        );
        recordLocalProjectionEnvelope(this.db, {
          appId: PROJECTS_APP_ID,
          source: "local-publish",
          envelope: input.envelope
        });
      }
      getProjectBundle(projectId) {
        const project = this.getProject(projectId);
        if (!project) return null;
        return {
          project,
          contacts: this.contactRecords(projectId),
          knowledgeEntries: this.knowledgeRecords(projectId),
          links: this.linkRecords(projectId),
          files: this.listFiles({ projectId }),
          fileAnnotations: [],
          pastPerformanceProfiles: this.listProfiles().filter((profile) => profile.projectId === projectId)
        };
      }
      upsertProject(input, existing) {
        const project = {
          ...normalizeProjectInput(input, existing),
          workspaceId: this.workspace.workspaceId
        };
        this.db.prepare(
          `INSERT INTO projects_local_projects (
					id, workspace_id, kind, schema_version, attributes_json, title, client, contract_vehicle,
					role, date_start, date_end, is_ongoing, description, outcomes, capabilities_json, tags_json,
					status, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(workspace_id, id) DO UPDATE SET
					kind = excluded.kind,
					schema_version = excluded.schema_version,
					attributes_json = excluded.attributes_json,
					title = excluded.title,
					client = excluded.client,
					contract_vehicle = excluded.contract_vehicle,
					role = excluded.role,
					date_start = excluded.date_start,
					date_end = excluded.date_end,
					is_ongoing = excluded.is_ongoing,
					description = excluded.description,
					outcomes = excluded.outcomes,
					capabilities_json = excluded.capabilities_json,
					tags_json = excluded.tags_json,
					status = excluded.status,
					updated_at = excluded.updated_at`
        ).run(
          project.id,
          project.workspaceId,
          project.kind,
          project.schemaVersion,
          jsonText(project.attributes),
          project.title,
          project.client,
          project.contractVehicle,
          project.role,
          project.dateStart,
          project.dateEnd,
          project.isOngoing ? 1 : 0,
          project.description,
          project.outcomes,
          jsonText(project.capabilities),
          jsonText(project.tags),
          project.status,
          project.createdAt,
          project.updatedAt
        );
        return project;
      }
      updateProject(projectId, input) {
        const existing = this.getProject(projectId);
        if (!existing) return null;
        return this.upsertProject(input, existing);
      }
      archiveProject(projectId) {
        return this.updateProject(projectId, { status: "archived" });
      }
      deleteProject(projectId) {
        this.db.exec("BEGIN");
        try {
          this.db.prepare("DELETE FROM projects_local_contacts WHERE workspace_id = ? AND project_id = ?").run(this.workspace.workspaceId, projectId);
          this.db.prepare("DELETE FROM projects_local_knowledge_entries WHERE workspace_id = ? AND project_id = ?").run(this.workspace.workspaceId, projectId);
          this.db.prepare("DELETE FROM projects_local_links WHERE workspace_id = ? AND project_id = ?").run(this.workspace.workspaceId, projectId);
          this.db.prepare("DELETE FROM projects_local_files WHERE workspace_id = ? AND project_id = ?").run(this.workspace.workspaceId, projectId);
          this.db.prepare("DELETE FROM projects_local_profiles WHERE workspace_id = ? AND project_id = ?").run(this.workspace.workspaceId, projectId);
          const result = this.db.prepare("DELETE FROM projects_local_projects WHERE workspace_id = ? AND id = ?").run(this.workspace.workspaceId, projectId);
          this.db.exec("COMMIT");
          return result.changes > 0;
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
      exportPayload() {
        return {
          kind: PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
          version: 1,
          projects: this.listProjectRecords({}),
          contacts: this.contactRecords(),
          knowledgeEntries: this.knowledgeRecords(),
          links: this.linkRecords(),
          proposals: this.listProposals(),
          files: this.listFiles(),
          pastPerformanceProfiles: this.listProfiles()
        };
      }
      exportBundle() {
        const payload = this.exportPayload();
        const bundle = createPlaneTransferBundle({
          appId: PROJECTS_APP_ID,
          workspaceId: this.workspace.workspaceId,
          plane: this.config,
          payloadSchema: PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
          payload
        });
        recordPlaneTransfer(this.db, {
          appId: PROJECTS_APP_ID,
          workspaceId: this.workspace.workspaceId,
          direction: "export",
          source: { data: this.config.data, ai: this.config.ai },
          payloadSchema: PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
          payloadSha256: bundle.payloadSha256
        });
        return bundle;
      }
      importPlan(value) {
        const { payload, bundle } = unwrapPlaneTransferPayload(value, {
          appId: PROJECTS_APP_ID,
          payloadSchema: PROJECTS_PROJECTS_PAYLOAD_SCHEMA
        });
        const normalized = normalizeTransferPayload(payload);
        return createPlaneTransferImportPlan({
          appId: bundle?.appId ?? PROJECTS_APP_ID,
          workspaceId: bundle?.workspaceId ?? this.workspace.workspaceId,
          payloadSchema: bundle?.payloadSchema ?? PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
          payload: normalized,
          bundle,
          destination: { data: this.config.data, ai: this.config.ai }
        });
      }
      importValue(value) {
        const { payload, bundle } = unwrapPlaneTransferPayload(value, {
          appId: PROJECTS_APP_ID,
          payloadSchema: PROJECTS_PROJECTS_PAYLOAD_SCHEMA
        });
        const normalized = normalizeTransferPayload(payload);
        let imported = 0;
        let contactCount = 0;
        let knowledgeCount = 0;
        let linkCount = 0;
        let proposalCount = 0;
        let fileCount = 0;
        let profileCount = 0;
        this.db.exec("BEGIN");
        try {
          for (const project of normalized.projects) {
            this.upsertProject(project, this.getProject(project.id) ?? void 0);
            imported += 1;
          }
          for (const contact of normalized.contacts) {
            this.upsertContact(contact.projectId, contact);
            contactCount += 1;
          }
          for (const entry of normalized.knowledgeEntries) {
            this.upsertKnowledgeEntry(entry.projectId, entry);
            knowledgeCount += 1;
          }
          for (const link of normalized.links) {
            this.upsertLink(link.projectId, link);
            linkCount += 1;
          }
          for (const proposal of normalized.proposals) {
            this.upsertProposal(proposal, this.getProposal(proposal.id) ?? void 0);
            proposalCount += 1;
          }
          for (const file of normalized.files) {
            this.upsertFile(file, this.getFile(file.id) ?? void 0);
            fileCount += 1;
          }
          for (const profile of normalized.pastPerformanceProfiles) {
            this.upsertProfile(profile, this.getProfile(profile.id) ?? void 0);
            profileCount += 1;
          }
          const source = bundle?.source;
          const payloadSha256 = bundle?.payloadSha256 ?? hashPlanePayload(normalized);
          const transferId = recordPlaneTransfer(this.db, {
            appId: PROJECTS_APP_ID,
            workspaceId: this.workspace.workspaceId,
            direction: "import",
            source,
            destination: { data: this.config.data, ai: this.config.ai },
            payloadSchema: bundle?.payloadSchema ?? PROJECTS_PROJECTS_PAYLOAD_SCHEMA,
            payloadSha256
          });
          this.db.exec("COMMIT");
          return {
            ok: true,
            store: "local",
            workspaceId: this.workspace.workspaceId,
            imported,
            contactCount,
            knowledgeCount,
            linkCount,
            proposalCount,
            fileCount,
            profileCount,
            transferId
          };
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
    };
  }
});

// cli/projects.ts
import { createHash as createHash4 } from "node:crypto";
import { mkdir as mkdir3, readFile as readFile2, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";
var CLI_AUTH_ERROR_QUERY_PARAM = "error";
var CLI_AUTH_ERROR_DESCRIPTION_QUERY_PARAM = "error_description";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.57.1_@sveltejs+vite-p_4e3f892a742bb9c5a510ac2c0515d785/node_modules/@mere/cli-auth/src/client.ts
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
  return new Promise((resolve2, reject) => {
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
          resolve2(await postJson(input.fetchImpl, exchangeUrl, { requestId, code }));
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

// cli/projects.ts
init_src();
init_config();

// node_modules/.pnpm/@mere+local-plane@file+..+business+packages+local-plane/node_modules/@mere/local-plane/src/mere-run.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, chmod, mkdtemp, rm as rm2 } from "node:fs/promises";
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
  await new Promise((resolve2, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Download failed with status ${response.statusCode.toString()}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve2();
      });
    }).on("error", reject);
  });
}
async function sha256File(filePath) {
  const hash = createHash3("sha256");
  await new Promise((resolve2, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve2);
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
    await chmod(installBin, 493).catch(() => void 0);
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
  return new Promise((resolve2, reject) => {
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
        resolve2(stdout2.trim());
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

// cli/projects.ts
init_projection();

// cli/session.ts
var APP_NAME = "mere-projects";
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
    productLabel: "mere-projects"
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

// cli/projects.ts
var DEFAULT_BASE_URL = process.env.PROJECTS_BASE_URL?.trim() || process.env.PASTPERF_BASE_URL?.trim() || "https://projects.meresmb.com";
var DEFAULT_BUSINESS_BASE_URL = process.env.MERE_BUSINESS_BASE_URL?.trim() || process.env.BUSINESS_BASE_URL?.trim() || "https://mere.business";
var APP_ID = "mere-projects";
var BUSINESS_APP_ID = "mere-business";
var DEFAULT_LOCAL_SUMMARY_MODEL = "text-chat-q35-nano";
var LOCAL_PROJECT_SUMMARY_PROMPT_VERSION = "projects-local-summary-v1";
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
  "dry-run",
  "featured",
  "help",
  "json",
  "no-interactive",
  "not-ongoing",
  "ongoing",
  "override",
  "refresh-sources",
  "version",
  "yes"
]);
var SHORT_FLAGS = /* @__PURE__ */ new Map([
  ["h", "help"],
  ["v", "version"],
  ["y", "yes"]
]);
var MIME_BY_EXTENSION = /* @__PURE__ */ new Map([
  [".csv", "text/csv"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".txt", "text/plain"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
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
function normalizeExplicitBaseUrl(raw) {
  const url = new URL(raw.trim());
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
    const token = argv[index] ?? "";
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
      const value = inlineValue ?? argv[index + 1];
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
function hasFlag(parsed, name) {
  return parsed.flags[name] !== void 0;
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
function numberOption(value, label) {
  if (value === void 0) return void 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new CliError(`${label} must be a number.`, 2);
  return parsed;
}
function splitList(values) {
  const normalized = /* @__PURE__ */ new Set();
  for (const value of values) {
    for (const part of value.split(",")) {
      const item = part.trim();
      if (item) normalized.add(item);
    }
  }
  return [...normalized];
}
function setIfDefined(target, key, value) {
  if (value !== void 0) target[key] = value;
}
function setStringFlag(target, key, parsed, ...names) {
  const value = readFlag(parsed, ...names);
  if (value !== void 0) target[key] = value;
}
function setListFlag(target, key, parsed, ...names) {
  const values = splitList(readFlagValues(parsed, ...names));
  if (values.length > 0) target[key] = values;
}
function setBooleanPair(target, key, parsed, trueFlag, falseFlag) {
  if (readBooleanFlag(parsed, trueFlag)) target[key] = true;
  if (readBooleanFlag(parsed, falseFlag)) target[key] = false;
}
async function readJsonBody(parsed) {
  const inline = readFlag(parsed, "data");
  const file = readFlag(parsed, "data-file");
  if (inline && file) throw new CliError("Use either --data or --data-file, not both.", 2);
  if (inline) return objectValue(parseJsonOption(inline, "--data"));
  if (file) return objectValue(JSON.parse(await readFile2(file, "utf8")));
  return {};
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
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
  const projectBodyFlags = ["kind", "schema-version", "attributes", "title", "client", "contract-vehicle", "role", "date-start", "date-end", "ongoing", "not-ongoing", "description", "outcomes", "capability", "capabilities", "tag", "tags", "status"];
  const profileBodyFlags = ["project", "project-id", "title", "client", "contract-vehicle", "role", "date-start", "date-end", "ongoing", "not-ongoing", "summary", "relevance", "differentiators", "capability-tag", "capability", "featured-outcome", "outcome", "reference-contact-id", "reference-name", "reference-title", "reference-organization", "reference-location", "reference-email", "reference-phone", "visibility", "featured"];
  const proposalBodyFlags = ["kind", "schema-version", "source-item", "source-item-id", "external-reference", "attributes", "title", "client", "solicitation-number", "business-deal-id", "due-date", "stage", "summary", "win-themes", "requirements", "linked-profile-id", "profile"];
  const projectionFlags = ["dry-run", "projection-url", "projection-token", "canonical-url"];
  return {
    schemaVersion: 1,
    app: "mere-projects",
    namespace: "projects",
    aliases: ["mere-projects", "projects", "pastperf"],
    auth: { kind: "browser" },
    baseUrlEnv: ["PROJECTS_BASE_URL", "PASTPERF_BASE_URL"],
    sessionPath: "~/.local/state/mere-projects/session.json",
    globalFlags: ["base-url", "workspace", "store", "ai", "local-db", "json", "yes", "confirm"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "agent-login"], "Create a Projects session from a Business agent session.", { auth: "none", risk: "write", flags: ["workspace", "business-base-url", "base-url"] }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["store", "info"], "Inspect local/cloud data and AI plane configuration.", { auth: "none", auditDefault: true }),
      manifestCommand(["export"], "Export local project context as a local-plane transfer bundle.", { auth: "none", risk: "read", flags: ["output"] }),
      manifestCommand(["import"], "Import a local-plane project transfer bundle.", { auth: "none", risk: "write", flags: ["file", "dry-run"] }),
      manifestCommand(["workspace", "list"], "List available workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show the current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select a default workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["project", "list"], "Project list.", { auditDefault: true, flags: ["search", "role", "status", "client"] }),
      manifestCommand(["project", "get"], "Project get."),
      manifestCommand(["project", "create"], "Project create.", { risk: "write", supportsData: true, flags: projectBodyFlags }),
      manifestCommand(["project", "update"], "Project update.", { risk: "write", supportsData: true, flags: projectBodyFlags }),
      manifestCommand(["project", "summarize"], "Summarize project context with local mere.run.", { risk: "write", flags: ["model", "max-tokens"] }),
      manifestCommand(["project", "publish"], "Publish a selected local project projection to Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["project", "revoke"], "Revoke a selected local project projection from Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["project", "archive"], "Archive a project.", { risk: "destructive", requiresYes: true }),
      manifestCommand(["project", "delete"], "Permanently delete a project.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["contact", "list"], "List contact records.", { flags: ["project"] }),
      manifestCommand(["contact", "upsert"], "Upsert a contact record.", { risk: "write", supportsData: true, flags: ["project", "id", "name", "title", "organization", "location", "email", "phone", "kind"] }),
      manifestCommand(["contact", "delete"], "Delete a contact record.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["project", "id"] }),
      manifestCommand(["knowledge", "list"], "List knowledge records.", { flags: ["project"] }),
      manifestCommand(["knowledge", "upsert"], "Upsert a knowledge record.", { risk: "write", supportsData: true, flags: ["project", "id", "entry-type", "title", "content", "tag", "tags"] }),
      manifestCommand(["knowledge", "delete"], "Delete a knowledge record.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["project", "id"] }),
      manifestCommand(["link", "list"], "List link records.", { flags: ["project"] }),
      manifestCommand(["link", "upsert"], "Upsert a link record.", { risk: "write", supportsData: true, flags: ["project", "id", "label", "url", "kind"] }),
      manifestCommand(["link", "delete"], "Delete a link record.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["project", "id"] }),
      manifestCommand(["file", "list"], "List files.", { flags: ["project", "project-id", "proposal", "proposal-id"] }),
      manifestCommand(["file", "get"], "Get local file metadata."),
      manifestCommand(["file", "upsert"], "Upsert local file metadata.", { risk: "write", supportsData: true, flags: ["id", "project", "project-id", "proposal", "proposal-id", "name", "kind", "mime-type", "content-type", "size-bytes", "artifact-key", "sha256", "notes"] }),
      manifestCommand(["file", "publish"], "Publish selected local file metadata projection to Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["file", "revoke"], "Revoke selected local file metadata projection from Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["file", "upload"], "Upload file.", { risk: "write", flags: ["project", "path", "kind"] }),
      manifestCommand(["file", "download"], "Download file.", { flags: ["project", "output"] }),
      manifestCommand(["file", "delete"], "Delete file.", { risk: "destructive", requiresYes: true, requiresConfirm: true, flags: ["project"] }),
      manifestCommand(["profile", "list"], "List profile records.", { flags: ["search", "role", "client", "visibility", "capability-tag"] }),
      manifestCommand(["profile", "get"], "Get a profile record."),
      manifestCommand(["profile", "upsert"], "Upsert a local profile record.", { risk: "write", supportsData: true, flags: ["id", ...profileBodyFlags] }),
      manifestCommand(["profile", "publish"], "Publish selected local profile projection to Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["profile", "revoke"], "Revoke selected local profile projection from Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["profile", "create"], "Create a profile record.", { risk: "write", supportsData: true, flags: ["id", ...profileBodyFlags] }),
      manifestCommand(["profile", "update"], "Update a profile record.", { risk: "write", supportsData: true, flags: profileBodyFlags }),
      manifestCommand(["profile", "delete"], "Delete a profile record.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["proposal", "list"], "List proposal records.", { flags: ["search", "client", "stage", "business-deal-id"] }),
      manifestCommand(["proposal", "get"], "Get a proposal record."),
      manifestCommand(["proposal", "upsert"], "Upsert a local proposal record.", { risk: "write", supportsData: true, flags: ["id", ...proposalBodyFlags] }),
      manifestCommand(["proposal", "publish"], "Publish selected local proposal projection to Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["proposal", "revoke"], "Revoke selected local proposal projection from Business.", { risk: "external", flags: projectionFlags }),
      manifestCommand(["proposal", "create"], "Create a proposal record.", { risk: "write", supportsData: true, flags: ["id", ...proposalBodyFlags] }),
      manifestCommand(["proposal", "update"], "Update a proposal record.", { risk: "write", supportsData: true, flags: proposalBodyFlags }),
      manifestCommand(["proposal", "delete"], "Delete a proposal record.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["proposal", "draft"], "Draft proposal.", { risk: "write", flags: ["output", "format"] }),
      manifestCommand(["proposal", "generate-draft"], "Generate proposal draft.", { risk: "write", flags: ["section-key"] }),
      manifestCommand(["proposal", "analysis"], "Show proposal analysis."),
      manifestCommand(["proposal", "analyze"], "Analyze proposal.", { risk: "write", flags: ["refresh-sources"] }),
      manifestCommand(["proposal", "readiness"], "Show proposal submission readiness."),
      manifestCommand(["proposal", "review"], "Run proposal submission readiness review.", { risk: "write" }),
      manifestCommand(["proposal", "claims"], "List proposal claim ledger entries."),
      manifestCommand(["proposal", "findings"], "List proposal readiness findings."),
      manifestCommand(["proposal", "exports"], "List proposal export history."),
      manifestCommand(["proposal", "export"], "Export proposal artifact.", { risk: "write", flags: ["format", "output", "override"] }),
      manifestCommand(["proposal", "defaults"], "List proposal defaults."),
      manifestCommand(["proposal", "defaults", "upload"], "Upload proposal default file.", { risk: "write", flags: ["path", "kind"] }),
      manifestCommand(["proposal", "defaults", "download"], "Download proposal default file.", { flags: ["output"] }),
      manifestCommand(["proposal", "defaults", "delete"], "Delete proposal default file.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["proposal", "defaults", "extract"], "Refresh proposal default structured output.", { risk: "write" }),
      manifestCommand(["proposal", "defaults", "structured"], "List proposal default structured outputs."),
      manifestCommand(["source", "list"], "List sources.", { flags: ["status", "source-type"] }),
      manifestCommand(["source", "get"], "Get source."),
      manifestCommand(["source", "upsert"], "Upsert source.", { risk: "write", supportsData: true, flags: ["source-type", "external-id", "title", "organization", "url", "summary", "due-date", "status", "score", "raw", "normalized", "attributes"] }),
      manifestCommand(["source", "patch"], "Patch source.", { risk: "write", flags: ["status"] }),
      manifestCommand(["source", "capture"], "Capture source.", { risk: "write" }),
      manifestCommand(["sam", "search"], "Search SAM opportunities.", { auth: "none", flags: ["api-key-env", "keyword", "query", "naics", "naics-code", "set-aside", "procurement-type", "posted-days", "limit", "offset"] }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
function printHelp(write) {
  write(`mere-projects CLI (aliases: projects, pastperf)

Usage:
  mere-projects auth login [--base-url https://projects.meresmb.com] [--workspace id|slug|host]
  mere-projects auth agent-login --workspace id [--business-base-url https://mere.business]
  mere-projects auth whoami [--json]
  mere-projects workspace list|current|use
  mere-projects completion [bash|zsh|fish]

  mere-projects [global flags] <resource> <action> [args] [flags]

Global flags:
  --base-url <url>        Base URL for auth login (default: PROJECTS_BASE_URL or production)
  --business-base-url <url>
                          Mere Business URL for browserless agent login
  --workspace <id|slug|host>
                          Target workspace for login or this command
  --json                  Print JSON
  --store cloud|local     Select data plane for inspection (default: cloud)
  --ai cloud|local        Select AI plane for inspection (default: cloud)
  --local-db <path>       Local-plane SQLite path when local is selected
  --yes                   Confirm destructive commands
  --confirm <id>          Exact id required for permanent deletes
  --help, -h              Show help
  --version               Show CLI version

Resources:
  store info
  export [--output transfer.json]
  import --file transfer.json [--dry-run]
  project list|get|create|update|archive|delete|summarize|publish|revoke
  contact list|upsert|delete --project <projectId>
  knowledge list|upsert|delete --project <projectId>
  link list|upsert|delete --project <projectId>
  file list|get|upsert|publish|revoke|upload|download|delete --project <projectId>
  profile list|get|upsert|publish|revoke|create|update|delete
  proposal list|get|upsert|publish|revoke|create|update|delete|draft|generate-draft|analysis|analyze
  proposal readiness|review|claims|findings|exports|export <proposalId>
  proposal defaults [list|upload|download|delete|extract|structured]
  source list|get|upsert|patch|capture
  sam search [--api-key-env <name>] [--keyword <term>]

Input:
  Mutating JSON commands accept --data '<json>' or --data-file payload.json.
  Common project/profile/proposal fields also have flags such as --title, --client,
  --role, --date-start, --summary, --tag, --capability, and --linked-profile-id.
  project summarize requires --ai local and accepts --model and --max-tokens.
  project|proposal|file|profile publish|revoke requires --store local and accepts --dry-run,
  --projection-url, --projection-token, and --canonical-url.
`);
}
function planeConfig(parsed, env) {
  return resolvePlaneConfigInspection({
    appId: APP_ID,
    env,
    data: readFlag(parsed, "store", "data"),
    ai: readFlag(parsed, "ai"),
    localDbPath: readFlag(parsed, "local-db")
  });
}
function localWorkspace(parsed, env) {
  const workspaceId = (readFlag(parsed, "workspace") ?? env.MERE_PROJECTS_WORKSPACE_ID ?? env.PROJECTS_WORKSPACE_ID ?? env.MERE_WORKSPACE_ID ?? "personal").trim();
  return {
    workspaceId: workspaceId || "personal",
    slug: (env.MERE_PROJECTS_WORKSPACE_SLUG ?? workspaceId ?? "personal").trim() || "personal",
    name: (env.MERE_PROJECTS_WORKSPACE_NAME ?? workspaceId ?? "Personal").trim() || "Personal"
  };
}
async function openLocalProjectsStore(parsed, io) {
  const { LocalProjectsStore: LocalProjectsStore2 } = await Promise.resolve().then(() => (init_local_store(), local_store_exports));
  return LocalProjectsStore2.open({
    config: planeConfig(parsed, io.env),
    workspace: localWorkspace(parsed, io.env)
  });
}
async function storeInfo(parsed, io) {
  const config = planeConfig(parsed, io.env);
  if (config.data === "local") {
    const store = await openLocalProjectsStore(parsed, io);
    try {
      return {
        ok: true,
        app: APP_ID,
        store: config.data,
        ai: config.ai,
        cloudProjection: config.cloudProjection,
        blended: config.blended,
        ...store.info(),
        sources: config.sources
      };
    } finally {
      store.close();
    }
  }
  return {
    ok: true,
    app: APP_ID,
    store: config.data,
    ai: config.ai,
    cloudProjection: config.cloudProjection,
    blended: config.blended,
    dbPath: config.localDbPath,
    localProjectStore: "available",
    localProjectPersistenceSupported: false,
    localAiSupported: true,
    baseUrl: normalizeBaseUrl2(readFlag(parsed, "base-url")),
    sources: config.sources
  };
}
function localOnlyError(resource) {
  return new CliError(
    `Local Projects data currently supports project, proposal, file metadata, profile, contact, knowledge, link, export/import, local project summarize, and selected publish/revoke commands. ${resource} remains cloud-only; rerun with --store cloud.`,
    2
  );
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
function renderSessionSummary(session) {
  const workspace = session.workspace;
  return [
    `user: ${session.user.email}`,
    workspace ? `selected workspace: ${renderWorkspaceLabel(workspace)}` : "selected workspace: none",
    `available workspaces: ${session.workspaces.length}`,
    `session: ${sessionFilePath()}`
  ].join("\n");
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
function resolveBusinessBaseUrl(parsed, io, session) {
  return normalizeExplicitBaseUrl(
    readFlag(parsed, "business-base-url") ?? io.env.MERE_BUSINESS_BASE_URL ?? io.env.BUSINESS_BASE_URL ?? session.baseUrl ?? DEFAULT_BUSINESS_BASE_URL
  );
}
async function loadRefreshedBusinessSession(input) {
  const current = await loadCliSession({ appName: BUSINESS_APP_ID, env: input.io.env });
  if (!current) {
    throw new CliError(
      "No local Mere Business session found. Run `mere business onboard agent-start <invite> --name <business> --slug <slug> --json` first.",
      3
    );
  }
  const workspace = selectBusinessWorkspace(current, readFlag(input.parsed, "workspace"));
  const baseUrl = resolveBusinessBaseUrl(input.parsed, input.io, current);
  if (!sessionNeedsRefresh(current, workspace.id)) {
    return { session: current, workspace, baseUrl };
  }
  const payload = await refreshRemoteSession({
    baseUrl,
    refreshToken: current.refreshToken,
    workspace: workspace.id,
    fetchImpl: input.io.fetchImpl
  });
  const session = mergeSessionPayload(current, payload, {
    baseUrl,
    persistDefaultWorkspace: false
  });
  await saveCliSession({ appName: BUSINESS_APP_ID, session, env: input.io.env });
  return {
    session,
    workspace: session.workspace ?? workspace,
    baseUrl
  };
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
    throw new CliError("Mere Business did not return a Projects base URL.");
  }
  if (!record.session || typeof record.session !== "object" || Array.isArray(record.session)) {
    throw new CliError("Mere Business did not return a Projects CLI session.");
  }
  return {
    baseUrl: record.baseUrl,
    session: record.session
  };
}
async function agentLogin(parsed, io) {
  const business = await loadRefreshedBusinessSession({ parsed, io });
  const response = await (io.fetchImpl ?? fetch)(
    new URL("/api/cli/v1/auth/product-sessions", business.baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${business.session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        app: "projects",
        workspaceId: business.workspace.id
      })
    }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(
      productSessionErrorMessage(payload, `Request failed with status ${response.status}.`),
      response.status
    );
  }
  const product = readProductSessionPayload(payload);
  const session = createLocalSession(product.session, {
    baseUrl: normalizeBaseUrl2(readFlag(parsed, "base-url") ?? product.baseUrl),
    defaultWorkspaceId: product.session.workspace?.id ?? product.session.defaultWorkspaceId ?? business.workspace.id
  });
  await saveSession(session, io.env);
  return session;
}
async function ensureSession(parsed, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
  }
  const selector = readFlag(parsed, "workspace") ?? current.defaultWorkspaceId ?? current.workspace?.id;
  const targetWorkspace = current.workspaces.length > 0 ? requireWorkspaceSelection(current.workspaces, selector) : current.workspace;
  if (!targetWorkspace) {
    throw new CliError("No workspace is available in this session.", 3);
  }
  if (!sessionNeedsRefresh(current, targetWorkspace.id)) {
    return current;
  }
  const refreshed = await refreshRemoteSession({
    baseUrl: current.baseUrl,
    refreshToken: current.refreshToken,
    workspace: targetWorkspace.id,
    fetchImpl: io.fetchImpl
  });
  const session = mergeSessionPayload(current, refreshed, {
    baseUrl: current.baseUrl,
    persistDefaultWorkspace: false
  });
  await saveSession(session, io.env);
  return session;
}
async function switchWorkspace(selector, io) {
  const current = await loadSession(io.env);
  if (!current) {
    throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
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
  "auth",
  "workspace",
  "store",
  "export",
  "import",
  "project",
  "contact",
  "knowledge",
  "link",
  "file",
  "profile",
  "proposal",
  "source",
  "sam",
  "completion"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-projects bash completion",
      "_mere_projects_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_projects_completion mere-projects pastperf projects",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-projects pastperf projects",
      "_mere_projects() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_projects "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-projects -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.", 2);
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
  if (!text) return `Request failed with status ${response.status}.`;
  try {
    const payload = JSON.parse(text);
    const message = payload.error ?? payload.message;
    if (typeof message === "string") return message;
    if (message && typeof message === "object" && !Array.isArray(message)) {
      const nested = message;
      if (typeof nested.message === "string") return nested.message;
    }
    return text;
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
    body: options.body !== void 0 ? JSON.stringify(options.body) : options.rawBody
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
function queryFromFlags(parsed, mapping) {
  const query = {};
  for (const [flag, key] of mapping) {
    query[key] = readFlag(parsed, flag);
  }
  return query;
}
function requireDeleteConfirmation(parsed, noun, id) {
  if (!readBooleanFlag(parsed, "yes")) {
    throw new CliError(`Refusing to delete ${noun} ${id} without --yes.`, 2);
  }
  const confirm = readFlag(parsed, "confirm");
  if (confirm !== id) {
    throw new CliError(`Refusing to delete ${noun} ${id} without --confirm ${id}.`, 2);
  }
}
async function projectBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "kind", parsed, "kind");
  setIfDefined(body, "schemaVersion", numberOption(readFlag(parsed, "schema-version"), "Schema version"));
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "contractVehicle", parsed, "contract-vehicle");
  setStringFlag(body, "role", parsed, "role");
  setStringFlag(body, "dateStart", parsed, "date-start");
  setStringFlag(body, "dateEnd", parsed, "date-end");
  setBooleanPair(body, "isOngoing", parsed, "ongoing", "not-ongoing");
  setStringFlag(body, "description", parsed, "description");
  setStringFlag(body, "outcomes", parsed, "outcomes");
  setListFlag(body, "capabilities", parsed, "capability", "capabilities");
  setListFlag(body, "tags", parsed, "tag", "tags");
  setStringFlag(body, "status", parsed, "status");
  return body;
}
async function profileBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "projectId", parsed, "project", "project-id");
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "contractVehicle", parsed, "contract-vehicle");
  setStringFlag(body, "role", parsed, "role");
  setStringFlag(body, "dateStart", parsed, "date-start");
  setStringFlag(body, "dateEnd", parsed, "date-end");
  setBooleanPair(body, "isOngoing", parsed, "ongoing", "not-ongoing");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "relevance", parsed, "relevance");
  setStringFlag(body, "differentiators", parsed, "differentiators");
  setListFlag(body, "capabilityTags", parsed, "capability-tag", "capability");
  setListFlag(body, "featuredOutcomes", parsed, "featured-outcome", "outcome");
  setStringFlag(body, "referenceContactId", parsed, "reference-contact-id");
  setStringFlag(body, "referenceName", parsed, "reference-name");
  setStringFlag(body, "referenceTitle", parsed, "reference-title");
  setStringFlag(body, "referenceOrganization", parsed, "reference-organization");
  setStringFlag(body, "referenceLocation", parsed, "reference-location");
  setStringFlag(body, "referenceEmail", parsed, "reference-email");
  setStringFlag(body, "referencePhone", parsed, "reference-phone");
  setStringFlag(body, "visibility", parsed, "visibility");
  if (readBooleanFlag(parsed, "featured")) body.isFeatured = true;
  return body;
}
async function proposalBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "kind", parsed, "kind");
  setIfDefined(body, "schemaVersion", numberOption(readFlag(parsed, "schema-version"), "Schema version"));
  setStringFlag(body, "sourceItemId", parsed, "source-item", "source-item-id");
  setStringFlag(body, "externalReference", parsed, "external-reference");
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "client", parsed, "client");
  setStringFlag(body, "solicitationNumber", parsed, "solicitation-number");
  setStringFlag(body, "businessDealId", parsed, "business-deal-id");
  setStringFlag(body, "dueDate", parsed, "due-date");
  setStringFlag(body, "stage", parsed, "stage");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "winThemes", parsed, "win-themes");
  setStringFlag(body, "requirements", parsed, "requirements");
  setListFlag(body, "linkedProfileIds", parsed, "linked-profile-id", "profile");
  return body;
}
async function sourceBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "sourceType", parsed, "source-type");
  setStringFlag(body, "externalId", parsed, "external-id");
  setStringFlag(body, "title", parsed, "title");
  setStringFlag(body, "organization", parsed, "organization");
  setStringFlag(body, "url", parsed, "url");
  setStringFlag(body, "summary", parsed, "summary");
  setStringFlag(body, "dueDate", parsed, "due-date");
  setStringFlag(body, "status", parsed, "status");
  setIfDefined(body, "score", numberOption(readFlag(parsed, "score"), "Score"));
  setIfDefined(body, "raw", parseJsonOption(readFlag(parsed, "raw"), "--raw"));
  setIfDefined(body, "normalized", parseJsonOption(readFlag(parsed, "normalized"), "--normalized"));
  setIfDefined(body, "attributes", parseJsonOption(readFlag(parsed, "attributes"), "--attributes"));
  return body;
}
function samBody(parsed, env) {
  const body = objectValue(parseJsonOption(readFlag(parsed, "data"), "--data"));
  if (hasFlag(parsed, "api-key")) {
    throw new CliError("Do not pass SAM API keys in argv. Use SAM_API_KEY or --api-key-env.", 2);
  }
  if (typeof body.apiKey === "string") {
    throw new CliError("Do not pass SAM API keys in --data. Use SAM_API_KEY or --api-key-env.", 2);
  }
  const apiKeyEnvName = readFlag(parsed, "api-key-env") ?? "SAM_API_KEY";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnvName)) {
    throw new CliError("--api-key-env must be an environment variable name.", 2);
  }
  const apiKey = env[apiKeyEnvName]?.trim();
  if (!apiKey) {
    throw new CliError(`Set ${apiKeyEnvName} or choose another variable with --api-key-env.`, 2);
  }
  body.apiKey = apiKey;
  setStringFlag(body, "keyword", parsed, "keyword", "query");
  setListFlag(body, "naicsCodes", parsed, "naics", "naics-code");
  setStringFlag(body, "setAsideCode", parsed, "set-aside");
  setListFlag(body, "procurementTypes", parsed, "procurement-type");
  setIfDefined(body, "postedDays", numberOption(readFlag(parsed, "posted-days"), "Posted days"));
  setIfDefined(body, "limit", numberOption(readFlag(parsed, "limit"), "Limit"));
  setIfDefined(body, "offset", numberOption(readFlag(parsed, "offset"), "Offset"));
  return body;
}
function records(value) {
  return Array.isArray(value) ? value.map((entry) => objectValue(entry)).filter((entry) => Object.keys(entry).length > 0) : [];
}
function compact(value, max = 900) {
  const rendered = scalar(value).replace(/\s+/g, " ").trim();
  return rendered.length > max ? `${rendered.slice(0, max - 1)}...` : rendered;
}
function projectContextPrompt(bundle) {
  const project = objectValue(bundle.project);
  const contacts = records(bundle.contacts);
  const knowledgeEntries = records(bundle.knowledgeEntries);
  const links = records(bundle.links);
  const lines = [
    "Use only the project context below. Write a concise internal project brief.",
    "Return sections named Summary, Proof points, Risks or unknowns, People, and Follow-up.",
    "Keep it useful for a private workspace operator preparing project/proposal material.",
    "",
    "Project:",
    `- id: ${compact(project.id)}`,
    `- title: ${compact(project.title)}`,
    `- client: ${compact(project.client)}`,
    `- role: ${compact(project.role)}`,
    `- status: ${compact(project.status)}`,
    `- dates: ${compact(project.dateStart)} to ${compact(project.dateEnd ?? (project.isOngoing ? "ongoing" : "not specified"))}`,
    `- contract vehicle: ${compact(project.contractVehicle)}`,
    `- description: ${compact(project.description, 1400)}`,
    `- outcomes: ${compact(project.outcomes, 1400)}`,
    `- capabilities: ${compact(project.capabilities)}`,
    `- tags: ${compact(project.tags)}`,
    ""
  ];
  if (contacts.length > 0) {
    lines.push("Contacts:");
    for (const contact of contacts.slice(0, 12)) {
      lines.push(
        `- ${compact(contact.name)}; ${compact(contact.kind)}; ${compact(contact.title)}; ${compact(contact.organization)}; ${compact(contact.email)}`
      );
    }
    lines.push("");
  }
  if (knowledgeEntries.length > 0) {
    lines.push("Knowledge entries:");
    for (const entry of knowledgeEntries.slice(0, 16)) {
      lines.push(`- ${compact(entry.entryType)}: ${compact(entry.title)} - ${compact(entry.content, 1e3)}; tags=${compact(entry.tags)}`);
    }
    lines.push("");
  }
  if (links.length > 0) {
    lines.push("Links:");
    for (const link of links.slice(0, 12)) {
      lines.push(`- ${compact(link.kind)}: ${compact(link.label)} (${compact(link.url)})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function positiveNumberOption(value, label) {
  const parsed = numberOption(value, label);
  if (parsed !== void 0 && parsed <= 0) {
    throw new CliError(`${label} must be greater than 0.`, 2);
  }
  return parsed;
}
function stableId(prefix, parts) {
  const hash = createHash4("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}
function readCanonicalUrl(project, parsed) {
  return readFlag(parsed, "canonical-url") ?? (typeof project.canonicalUrl === "string" && project.canonicalUrl.trim() ? project.canonicalUrl.trim() : null);
}
function toProjectionStringList(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim().length > 0) : [];
}
function projectProjectionSnapshot(input) {
  const project = objectValue(input.bundle.project);
  const contacts = records(input.bundle.contacts).map((contact) => ({
    id: compact(contact.id, 120),
    name: compact(contact.name, 240) || "Unknown contact",
    title: readOptionalProjectionString(contact.title),
    organization: readOptionalProjectionString(contact.organization),
    location: readOptionalProjectionString(contact.location),
    email: readOptionalProjectionString(contact.email),
    phone: readOptionalProjectionString(contact.phone),
    kind: compact(contact.kind, 80) || "reference"
  }));
  const links = records(input.bundle.links).map((link) => ({
    id: compact(link.id, 120),
    label: compact(link.label, 240) || compact(link.url, 240),
    url: readOptionalProjectionString(link.url),
    kind: compact(link.kind, 80) || "general"
  })).filter((link) => link.url);
  const updatedAt = input.deletedAt ?? (typeof project.updatedAt === "string" && project.updatedAt.trim() ? project.updatedAt.trim() : (/* @__PURE__ */ new Date()).toISOString());
  return {
    id: compact(project.id, 160),
    workspaceId: input.workspaceId,
    kind: compact(project.kind, 160) || "project.default",
    schemaVersion: typeof project.schemaVersion === "number" ? project.schemaVersion : 1,
    attributes: objectValue(project.attributes),
    title: compact(project.title, 360) || "Untitled project",
    client: compact(project.client, 240),
    contractVehicle: readOptionalProjectionString(project.contractVehicle),
    role: compact(project.role, 80),
    status: input.deletedAt ? "archived" : compact(project.status, 80) || "active",
    dateStart: readOptionalProjectionString(project.dateStart),
    dateEnd: readOptionalProjectionString(project.dateEnd),
    isOngoing: project.isOngoing === true,
    description: compact(project.description, 2e3),
    outcomes: compact(project.outcomes, 2e3),
    capabilities: toProjectionStringList(project.capabilities),
    tags: toProjectionStringList(project.tags),
    contacts,
    links,
    canonicalUrl: input.canonicalUrl,
    createdAt: typeof project.createdAt === "string" && project.createdAt.trim() ? project.createdAt.trim() : updatedAt,
    updatedAt,
    ...input.deletedAt ? { deletedAt: input.deletedAt } : {}
  };
}
function readOptionalProjectionString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function buildProjectProjectionEnvelope(input) {
  const rawProject = objectValue(input.bundle.project);
  const projectId = readStringValue(rawProject.id, "project.id");
  const deletedAt = input.action === "revoke" ? (/* @__PURE__ */ new Date()).toISOString() : null;
  const project = projectProjectionSnapshot({
    bundle: input.bundle,
    canonicalUrl: readCanonicalUrl(rawProject, input.parsed),
    deletedAt,
    workspaceId: input.workspaceId
  });
  const eventType = input.action === "revoke" ? "project.deleted" : "project.upserted";
  const occurredAt = readStringValue(project.updatedAt, "project.updatedAt");
  const eventId = stableId("pevt", [APP_ID, input.workspaceId, eventType, projectId, occurredAt]);
  return {
    eventId,
    schemaVersion: "1",
    product: "pastperf",
    eventType,
    workspaceId: input.workspaceId,
    externalObjectType: "project",
    externalObjectId: projectId,
    occurredAt,
    canonicalUrl: project.canonicalUrl,
    payload: { project },
    dedupeKey: `pastperf:${input.workspaceId}:project:${projectId}:${eventType}:${occurredAt}`
  };
}
function readStringValue(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new CliError(`${label} is required.`, 2);
  }
  return value.trim();
}
async function deliverProjectProjection(input) {
  const event = buildProjectProjectionEnvelope({
    action: input.action,
    bundle: input.bundle,
    parsed: input.parsed,
    workspaceId: input.workspaceId
  });
  const projectionAuditId = stableId("pprj", [APP_ID, input.workspaceId, "project", input.projectId]);
  const projectionUrl = readFlag(input.parsed, "projection-url");
  const projectionToken = readFlag(input.parsed, "projection-token");
  if (readBooleanFlag(input.parsed, "dry-run")) {
    let receiverUrl;
    try {
      receiverUrl = resolveCloudProjectionTarget({
        appId: APP_ID,
        env: input.io.env,
        receiverUrl: projectionUrl,
        bearerToken: projectionToken
      }).receiverUrl;
    } catch {
      receiverUrl = void 0;
    }
    return {
      ok: true,
      dryRun: true,
      store: input.config.data,
      projection: input.config.cloudProjection,
      action: input.action,
      projectId: input.projectId,
      projectionAuditId,
      receiverUrl,
      event
    };
  }
  const delivery = await deliverCloudProjectionEvent({
    appId: APP_ID,
    env: input.io.env,
    receiverUrl: projectionUrl,
    bearerToken: projectionToken,
    event,
    fetchImpl: input.io.fetchImpl
  });
  return {
    ok: true,
    store: input.config.data,
    projection: input.config.cloudProjection,
    action: input.action,
    projectId: input.projectId,
    projectionAuditId,
    receiverUrl: delivery.receiverUrl,
    status: delivery.status,
    receiver: delivery.responseJson,
    event
  };
}
function localProjectionAuditId(entity, workspaceId, id) {
  return stableId("pprj", [APP_ID, workspaceId, entity, id]);
}
function sizeBand(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (value === 0) return "empty";
  if (value < 1e5) return "small";
  if (value < 1e7) return "medium";
  return "large";
}
function buildLocalEntityProjectionEnvelope(input) {
  const id = readStringValue(input.record.id, `${input.entity}.id`);
  const deletedAt = input.action === "revoke" ? (/* @__PURE__ */ new Date()).toISOString() : null;
  const updatedAt = deletedAt ?? readOptionalProjectionString(input.record.updatedAt) ?? (/* @__PURE__ */ new Date()).toISOString();
  const canonicalUrl = readFlag(input.parsed, "canonical-url") ?? readOptionalProjectionString(input.record.canonicalUrl);
  const eventType = `${input.entity}.${input.action === "revoke" ? "deleted" : "upserted"}`;
  const eventId = stableId("pevt", [APP_ID, input.workspaceId, eventType, id, updatedAt]);
  let externalObjectType = input.entity;
  let payload;
  if (input.entity === "proposal") {
    payload = {
      proposal: {
        id,
        workspaceId: input.workspaceId,
        kind: compact(input.record.kind, 160) || "proposal.default",
        schemaVersion: typeof input.record.schemaVersion === "number" ? input.record.schemaVersion : 1,
        stage: deletedAt ? "archived" : compact(input.record.stage, 80) || "tracking",
        dueDate: readOptionalProjectionString(input.record.dueDate),
        businessDealId: readOptionalProjectionString(input.record.businessDealId),
        linkedProfileCount: toProjectionStringList(input.record.linkedProfileIds).length,
        hasSourceItem: Boolean(readOptionalProjectionString(input.record.sourceItemId)),
        hasExternalReference: Boolean(readOptionalProjectionString(input.record.externalReference)),
        canonicalUrl,
        createdAt: readOptionalProjectionString(input.record.createdAt),
        updatedAt,
        ...deletedAt ? { deletedAt } : {}
      },
      exclusions: [
        "proposal titles and client names",
        "summaries, win themes, requirements, and draft text",
        "solicitation numbers and external references",
        "linked profile ids",
        "attributes and source payloads",
        "proposal files, exports, readiness findings, and claim ledgers",
        "raw local proposal rows and transfer payloads"
      ]
    };
  } else if (input.entity === "file") {
    externalObjectType = "project_file";
    payload = {
      file: {
        id,
        workspaceId: input.workspaceId,
        projectId: readOptionalProjectionString(input.record.projectId),
        proposalId: readOptionalProjectionString(input.record.proposalId),
        kind: compact(input.record.kind, 80) || "general",
        mimeType: readOptionalProjectionString(input.record.mimeType),
        sizeBand: sizeBand(input.record.sizeBytes),
        hasArtifactReference: Boolean(readOptionalProjectionString(input.record.artifactKey)),
        hasChecksum: Boolean(readOptionalProjectionString(input.record.sha256)),
        canonicalUrl,
        createdAt: readOptionalProjectionString(input.record.createdAt),
        updatedAt,
        ...deletedAt ? { deletedAt } : {}
      },
      exclusions: [
        "file names",
        "artifact keys and storage paths",
        "content hashes and exact byte lengths",
        "file notes and extracted text",
        "file bytes and generated artifacts",
        "raw local file rows and transfer payloads"
      ]
    };
  } else {
    externalObjectType = "past_performance_profile";
    payload = {
      profile: {
        id,
        workspaceId: input.workspaceId,
        projectId: readOptionalProjectionString(input.record.projectId),
        role: compact(input.record.role, 80) || "prime",
        visibility: compact(input.record.visibility, 80) || "private",
        isFeatured: input.record.isFeatured === true,
        dateStart: readOptionalProjectionString(input.record.dateStart),
        dateEnd: readOptionalProjectionString(input.record.dateEnd),
        isOngoing: input.record.isOngoing === true,
        capabilityTags: toProjectionStringList(input.record.capabilityTags),
        featuredOutcomeCount: toProjectionStringList(input.record.featuredOutcomes).length,
        hasReferenceContact: Boolean(
          readOptionalProjectionString(input.record.referenceContactId) ?? readOptionalProjectionString(input.record.referenceName) ?? readOptionalProjectionString(input.record.referenceEmail)
        ),
        canonicalUrl,
        createdAt: readOptionalProjectionString(input.record.createdAt),
        updatedAt,
        ...deletedAt ? { deletedAt } : {}
      },
      exclusions: [
        "profile titles, client names, summaries, relevance, and differentiators",
        "featured outcome text",
        "reference names, emails, phone numbers, titles, organizations, and locations",
        "raw local profile rows and transfer payloads"
      ]
    };
  }
  return {
    eventId,
    schemaVersion: "1",
    product: "pastperf",
    eventType,
    workspaceId: input.workspaceId,
    externalObjectType,
    externalObjectId: id,
    occurredAt: updatedAt,
    canonicalUrl,
    payload,
    dedupeKey: `pastperf:${input.workspaceId}:${input.entity}:${id}:${eventType}:${updatedAt}`
  };
}
async function deliverLocalEntityProjection(input) {
  const id = readStringValue(input.record.id, `${input.entity}.id`);
  const event = buildLocalEntityProjectionEnvelope({
    action: input.action,
    entity: input.entity,
    record: input.record,
    parsed: input.parsed,
    workspaceId: input.workspaceId
  });
  const projectionAuditId = localProjectionAuditId(input.entity, input.workspaceId, id);
  const projectionUrl = readFlag(input.parsed, "projection-url");
  const projectionToken = readFlag(input.parsed, "projection-token");
  if (readBooleanFlag(input.parsed, "dry-run")) {
    let receiverUrl;
    try {
      receiverUrl = resolveCloudProjectionTarget({
        appId: APP_ID,
        env: input.io.env,
        receiverUrl: projectionUrl,
        bearerToken: projectionToken
      }).receiverUrl;
    } catch {
      receiverUrl = void 0;
    }
    return {
      ok: true,
      dryRun: true,
      store: input.config.data,
      projection: input.config.cloudProjection,
      action: input.action,
      entity: input.entity,
      id,
      projectionAuditId,
      receiverUrl,
      event
    };
  }
  const delivery = await deliverCloudProjectionEvent({
    appId: APP_ID,
    env: input.io.env,
    receiverUrl: projectionUrl,
    bearerToken: projectionToken,
    event,
    fetchImpl: input.io.fetchImpl
  });
  return {
    ok: true,
    store: input.config.data,
    projection: input.config.cloudProjection,
    action: input.action,
    entity: input.entity,
    id,
    projectionAuditId,
    receiverUrl: delivery.receiverUrl,
    status: delivery.status,
    receiver: delivery.responseJson,
    event
  };
}
async function summarizeProjectContext(input) {
  if (input.config.ai !== "local") {
    throw new CliError("project summarize requires --ai local so the command can invoke local mere.run explicitly.", 2);
  }
  const model = readFlag(input.parsed, "model") ?? DEFAULT_LOCAL_SUMMARY_MODEL;
  const maxTokens = positiveNumberOption(readFlag(input.parsed, "max-tokens"), "--max-tokens");
  const prompt = projectContextPrompt(input.bundle);
  const plane = await openLocalPlaneDatabase({ localDbPath: input.config.localDbPath });
  let jobId = null;
  try {
    upsertPlaneWorkspace(plane.db, APP_ID, {
      workspaceId: input.workspace.workspaceId,
      slug: input.workspace.slug,
      name: input.workspace.name,
      dataPlane: input.config.data,
      aiPlane: input.config.ai
    });
    jobId = recordPlaneAiJob(plane.db, {
      appId: APP_ID,
      workspaceId: input.workspace.workspaceId,
      subjectType: "project",
      subjectId: input.projectId,
      mode: "local",
      model,
      status: "running",
      input: {
        dataPlane: input.config.data,
        promptVersion: LOCAL_PROJECT_SUMMARY_PROMPT_VERSION,
        projectId: input.projectId,
        prompt
      }
    });
    const summary = await generateText(prompt, {
      appId: APP_ID,
      env: input.env,
      model,
      maxTokens
    });
    updatePlaneAiJob(plane.db, {
      id: jobId,
      status: "done",
      model,
      outputText: summary
    });
    return {
      ok: true,
      app: APP_ID,
      store: input.config.data,
      ai: input.config.ai,
      model,
      jobId,
      dbPath: input.config.localDbPath,
      workspaceId: input.workspace.workspaceId,
      projectId: input.projectId,
      summary
    };
  } catch (error) {
    if (jobId) {
      updatePlaneAiJob(plane.db, {
        id: jobId,
        status: "failed",
        model,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    throw error;
  } finally {
    plane.close();
  }
}
async function handleProject(active, action, rest, parsed, env) {
  if (action === "list") {
    return requestJson(active, "/api/projects", {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["role", "role"],
        ["status", "status"],
        ["client", "client"]
      ])
    });
  }
  if (action === "get") {
    return requestJson(active, `/api/projects/${encodeURIComponent(firstPositional(rest, "project id"))}`);
  }
  if (action === "summarize" || action === "summary") {
    const id = firstPositional(rest, "project id");
    const bundle = objectValue(await requestJson(active, `/api/projects/${encodeURIComponent(id)}`));
    const workspace = active.session.workspace;
    return summarizeProjectContext({
      bundle,
      config: planeConfig(parsed, env),
      env,
      parsed,
      projectId: id,
      workspace: {
        workspaceId: workspace?.id ?? active.session.defaultWorkspaceId ?? "cloud",
        slug: workspace?.slug ?? active.session.defaultWorkspaceId ?? "cloud",
        name: workspace?.name ?? workspace?.slug ?? active.session.defaultWorkspaceId ?? "Cloud workspace"
      }
    });
  }
  if (action === "create") {
    return requestJson(active, "/api/projects", { method: "POST", body: await projectBody(parsed) });
  }
  if (action === "update") {
    const id = firstPositional(rest, "project id");
    const bundle = objectValue(
      await requestJson(active, `/api/projects/${encodeURIComponent(id)}`)
    );
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.project), ...await projectBody(parsed) }
    });
  }
  if (action === "archive") {
    const id = firstPositional(rest, "project id");
    const bundle = objectValue(
      await requestJson(active, `/api/projects/${encodeURIComponent(id)}`)
    );
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.project), status: "archived" }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "project id");
    requireDeleteConfirmation(parsed, "project", id);
    return requestJson(active, `/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown project action: ${action}`, 2);
}
async function handleLocalProject(action, rest, parsed, io) {
  if (action === "publish" || action === "revoke") {
    const id = firstPositional(rest, "project id");
    const store2 = await openLocalProjectsStore(parsed, io);
    try {
      const found = store2.getProjectBundle(id);
      if (!found) throw new CliError("Project not found.", 1);
      const result = await deliverProjectProjection({
        action,
        bundle: found,
        config: planeConfig(parsed, io.env),
        io,
        parsed,
        projectId: id,
        workspaceId: localWorkspace(parsed, io.env).workspaceId
      });
      if (!readBooleanFlag(parsed, "dry-run")) {
        store2.recordProjection({
          id: readStringValue(result.projectionAuditId, "projectionAuditId"),
          scope: "project",
          objectType: "project",
          objectId: id,
          envelope: objectValue(result.event),
          revoked: action === "revoke"
        });
      }
      return result;
    } finally {
      store2.close();
    }
  }
  if (action === "summarize" || action === "summary") {
    const id = firstPositional(rest, "project id");
    const store2 = await openLocalProjectsStore(parsed, io);
    let bundle;
    try {
      const found = store2.getProjectBundle(id);
      if (!found) throw new CliError("Project not found.", 1);
      bundle = found;
    } finally {
      store2.close();
    }
    return summarizeProjectContext({
      bundle,
      config: planeConfig(parsed, io.env),
      env: io.env,
      parsed,
      projectId: id,
      workspace: localWorkspace(parsed, io.env)
    });
  }
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (action === "list") {
      return store.listProjects(
        queryFromFlags(parsed, [
          ["search", "search"],
          ["role", "role"],
          ["status", "status"],
          ["client", "client"]
        ])
      );
    }
    if (action === "get") {
      const bundle = store.getProjectBundle(firstPositional(rest, "project id"));
      if (!bundle) throw new CliError("Project not found.", 1);
      return bundle;
    }
    if (action === "create") {
      return store.upsertProject(await projectBody(parsed));
    }
    if (action === "update") {
      const id = firstPositional(rest, "project id");
      const project = store.updateProject(id, await projectBody(parsed));
      if (!project) throw new CliError("Project not found.", 1);
      return project;
    }
    if (action === "archive") {
      const id = firstPositional(rest, "project id");
      const project = store.archiveProject(id);
      if (!project) throw new CliError("Project not found.", 1);
      return project;
    }
    if (action === "delete") {
      const id = firstPositional(rest, "project id");
      requireDeleteConfirmation(parsed, "project", id);
      return { ok: store.deleteProject(id) };
    }
    throw new CliError(`Unknown project action: ${action}`, 2);
  } finally {
    store.close();
  }
}
async function handleLocalExport(parsed, io) {
  const store = await openLocalProjectsStore(parsed, io);
  try {
    const bundle = store.exportBundle();
    const output = readFlag(parsed, "output");
    if (output) {
      const target = resolve(output);
      await mkdir3(dirname(target), { recursive: true });
      await writeFile(target, JSON.stringify(bundle, null, 2));
      return {
        ok: true,
        path: target,
        appId: bundle.appId,
        workspaceId: bundle.workspaceId,
        payloadSchema: bundle.payloadSchema,
        payloadSha256: bundle.payloadSha256,
        projectCount: bundle.payload.projects.length,
        contactCount: bundle.payload.contacts.length,
        knowledgeCount: bundle.payload.knowledgeEntries.length,
        linkCount: bundle.payload.links.length,
        proposalCount: bundle.payload.proposals.length,
        fileCount: bundle.payload.files.length,
        profileCount: bundle.payload.pastPerformanceProfiles.length
      };
    }
    return bundle;
  } finally {
    store.close();
  }
}
async function handleLocalImport(parsed, io) {
  const file = requireFlag(parsed, "file");
  const value = JSON.parse(await readFile2(file, "utf8"));
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (readBooleanFlag(parsed, "dry-run")) {
      return store.importPlan(value);
    }
    return store.importValue(value);
  } finally {
    store.close();
  }
}
async function projectChildBody(resource, parsed) {
  const body = await readJsonBody(parsed);
  if (resource === "contact") {
    setStringFlag(body, "id", parsed, "id");
    setStringFlag(body, "name", parsed, "name");
    setStringFlag(body, "title", parsed, "title");
    setStringFlag(body, "organization", parsed, "organization");
    setStringFlag(body, "location", parsed, "location");
    setStringFlag(body, "email", parsed, "email");
    setStringFlag(body, "phone", parsed, "phone");
    setStringFlag(body, "kind", parsed, "kind");
  } else if (resource === "knowledge") {
    setStringFlag(body, "id", parsed, "id");
    setStringFlag(body, "entryType", parsed, "entry-type");
    setStringFlag(body, "title", parsed, "title");
    setStringFlag(body, "content", parsed, "content");
    setListFlag(body, "tags", parsed, "tag", "tags");
  } else {
    setStringFlag(body, "id", parsed, "id");
    setStringFlag(body, "label", parsed, "label");
    setStringFlag(body, "url", parsed, "url");
    setStringFlag(body, "kind", parsed, "kind");
  }
  return body;
}
async function localFileBody(parsed) {
  const body = await readJsonBody(parsed);
  setStringFlag(body, "id", parsed, "id");
  setStringFlag(body, "projectId", parsed, "project", "project-id");
  setStringFlag(body, "proposalId", parsed, "proposal", "proposal-id");
  setStringFlag(body, "name", parsed, "name");
  setStringFlag(body, "kind", parsed, "kind");
  setStringFlag(body, "mimeType", parsed, "mime-type", "content-type");
  setIfDefined(body, "sizeBytes", numberOption(readFlag(parsed, "size-bytes"), "--size-bytes"));
  setStringFlag(body, "artifactKey", parsed, "artifact-key");
  setStringFlag(body, "sha256", parsed, "sha256");
  setStringFlag(body, "notes", parsed, "notes");
  return body;
}
async function handleLocalProjectChild(resource, action, parsed, io) {
  const projectId = requireFlag(parsed, "project");
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (action === "list") {
      if (resource === "contact") return store.listContacts(projectId);
      if (resource === "knowledge") return store.listKnowledgeEntries(projectId);
      return store.listLinks(projectId);
    }
    if (action === "upsert" || action === "save") {
      const body = await projectChildBody(resource, parsed);
      if (resource === "contact") return store.upsertContact(projectId, body);
      if (resource === "knowledge") return store.upsertKnowledgeEntry(projectId, body);
      return store.upsertLink(projectId, body);
    }
    if (action === "delete") {
      const id = requireFlag(parsed, "id");
      requireDeleteConfirmation(parsed, resource, id);
      if (resource === "contact") return { ok: store.deleteContact(projectId, id) };
      if (resource === "knowledge") return { ok: store.deleteKnowledgeEntry(projectId, id) };
      return { ok: store.deleteLink(projectId, id) };
    }
    throw new CliError(`Unknown ${resource} action: ${action}`, 2);
  } finally {
    store.close();
  }
}
async function handleLocalProposal(action, rest, parsed, io) {
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (action === "list") {
      return store.listProposals(queryFromFlags(parsed, [
        ["search", "search"],
        ["stage", "stage"],
        ["client", "client"]
      ]));
    }
    if (action === "get") {
      const proposal = store.getProposal(firstPositional(rest, "proposal id"));
      if (!proposal) throw new CliError("Proposal not found.", 1);
      return proposal;
    }
    if (action === "create" || action === "upsert") {
      const body = await proposalBody(parsed);
      setStringFlag(body, "id", parsed, "id");
      if (action === "upsert" && rest[0] && body.id === void 0) body.id = rest[0];
      return store.upsertProposal(body, typeof body.id === "string" ? store.getProposal(body.id) ?? void 0 : void 0);
    }
    if (action === "update") {
      const id = firstPositional(rest, "proposal id");
      const proposal = store.updateProposal(id, await proposalBody(parsed));
      if (!proposal) throw new CliError("Proposal not found.", 1);
      return proposal;
    }
    if (action === "delete") {
      const id = firstPositional(rest, "proposal id");
      requireDeleteConfirmation(parsed, "proposal", id);
      return { ok: store.deleteProposal(id) };
    }
    if (action === "publish" || action === "revoke") {
      const id = firstPositional(rest, "proposal id");
      const proposal = store.getProposal(id);
      if (!proposal) throw new CliError("Proposal not found.", 1);
      const result = await deliverLocalEntityProjection({
        action,
        config: planeConfig(parsed, io.env),
        entity: "proposal",
        io,
        parsed,
        record: proposal,
        workspaceId: localWorkspace(parsed, io.env).workspaceId
      });
      if (!readBooleanFlag(parsed, "dry-run")) {
        store.recordProjection({
          id: readStringValue(result.projectionAuditId, "projectionAuditId"),
          scope: "proposal",
          objectType: "proposal",
          objectId: id,
          envelope: objectValue(result.event),
          revoked: action === "revoke"
        });
      }
      return result;
    }
    throw new CliError(`Unknown proposal action: ${action}`, 2);
  } finally {
    store.close();
  }
}
async function handleLocalFile(action, rest, parsed, io) {
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (action === "list") {
      return store.listFiles({
        projectId: readFlag(parsed, "project", "project-id"),
        proposalId: readFlag(parsed, "proposal", "proposal-id")
      });
    }
    if (action === "get") {
      const file = store.getFile(firstPositional(rest, "file id"));
      if (!file) throw new CliError("File metadata not found.", 1);
      return file;
    }
    if (action === "upsert") {
      const body = await localFileBody(parsed);
      if (rest[0] && body.id === void 0) body.id = rest[0];
      return store.upsertFile(body, typeof body.id === "string" ? store.getFile(body.id) ?? void 0 : void 0);
    }
    if (action === "delete") {
      const id = firstPositional(rest, "file id");
      requireDeleteConfirmation(parsed, "file", id);
      return { ok: store.deleteFile(id) };
    }
    if (action === "publish" || action === "revoke") {
      const id = firstPositional(rest, "file id");
      const file = store.getFile(id);
      if (!file) throw new CliError("File metadata not found.", 1);
      const result = await deliverLocalEntityProjection({
        action,
        config: planeConfig(parsed, io.env),
        entity: "file",
        io,
        parsed,
        record: file,
        workspaceId: localWorkspace(parsed, io.env).workspaceId
      });
      if (!readBooleanFlag(parsed, "dry-run")) {
        store.recordProjection({
          id: readStringValue(result.projectionAuditId, "projectionAuditId"),
          scope: "file",
          objectType: "file",
          objectId: id,
          envelope: objectValue(result.event),
          revoked: action === "revoke"
        });
      }
      return result;
    }
    throw localOnlyError(`file ${action}`);
  } finally {
    store.close();
  }
}
async function handleLocalProfile(action, rest, parsed, io) {
  const store = await openLocalProjectsStore(parsed, io);
  try {
    if (action === "list") {
      return store.listProfiles(queryFromFlags(parsed, [
        ["search", "search"],
        ["role", "role"],
        ["client", "client"],
        ["visibility", "visibility"]
      ]));
    }
    if (action === "get") {
      const profile = store.getProfile(firstPositional(rest, "profile id"));
      if (!profile) throw new CliError("Profile not found.", 1);
      return profile;
    }
    if (action === "create" || action === "upsert") {
      const body = await profileBody(parsed);
      setStringFlag(body, "id", parsed, "id");
      if (action === "upsert" && rest[0] && body.id === void 0) body.id = rest[0];
      return store.upsertProfile(body, typeof body.id === "string" ? store.getProfile(body.id) ?? void 0 : void 0);
    }
    if (action === "update") {
      const id = firstPositional(rest, "profile id");
      const profile = store.updateProfile(id, await profileBody(parsed));
      if (!profile) throw new CliError("Profile not found.", 1);
      return profile;
    }
    if (action === "delete") {
      const id = firstPositional(rest, "profile id");
      requireDeleteConfirmation(parsed, "profile", id);
      return { ok: store.deleteProfile(id) };
    }
    if (action === "publish" || action === "revoke") {
      const id = firstPositional(rest, "profile id");
      const profile = store.getProfile(id);
      if (!profile) throw new CliError("Profile not found.", 1);
      const result = await deliverLocalEntityProjection({
        action,
        config: planeConfig(parsed, io.env),
        entity: "profile",
        io,
        parsed,
        record: profile,
        workspaceId: localWorkspace(parsed, io.env).workspaceId
      });
      if (!readBooleanFlag(parsed, "dry-run")) {
        store.recordProjection({
          id: readStringValue(result.projectionAuditId, "projectionAuditId"),
          scope: "profile",
          objectType: "past_performance_profile",
          objectId: id,
          envelope: objectValue(result.event),
          revoked: action === "revoke"
        });
      }
      return result;
    }
    throw new CliError(`Unknown profile action: ${action}`, 2);
  } finally {
    store.close();
  }
}
async function handleProjectChild(active, resource, action, parsed) {
  const projectId = requireFlag(parsed, "project");
  const route = resource === "contact" ? "contacts" : resource === "knowledge" ? "knowledge" : "links";
  const path5 = `/api/projects/${encodeURIComponent(projectId)}/${route}`;
  if (action === "list") return requestJson(active, path5);
  if (action === "upsert" || action === "save") {
    const body = await projectChildBody(resource, parsed);
    return requestJson(active, path5, { method: "POST", body });
  }
  if (action === "delete") {
    const id = requireFlag(parsed, "id");
    requireDeleteConfirmation(parsed, resource, id);
    return requestJson(active, path5, { method: "DELETE", body: { id } });
  }
  throw new CliError(`Unknown ${resource} action: ${action}`, 2);
}
function mimeTypeForPath(pathname) {
  const lower = pathname.toLowerCase();
  const extension = [...MIME_BY_EXTENSION.keys()].find((suffix) => lower.endsWith(suffix));
  return extension && MIME_BY_EXTENSION.get(extension) || "application/octet-stream";
}
function filenameFromDisposition(value) {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return value.match(/filename="([^"]+)"/i)?.[1] ?? value.match(/filename=([^;]+)/i)?.[1]?.trim() ?? null;
}
async function saveResponse(response, outputPath, fallbackFilename) {
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = basename(filenameFromDisposition(response.headers.get("content-disposition")) ?? fallbackFilename);
  const target = resolve(outputPath ?? filename);
  await mkdir3(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return {
    path: target,
    filename,
    size: bytes.byteLength,
    contentType: response.headers.get("content-type")
  };
}
async function handleFile(active, action, rest, parsed) {
  const projectId = requireFlag(parsed, "project");
  const basePath = `/api/projects/${encodeURIComponent(projectId)}/files`;
  if (action === "list") return requestJson(active, basePath);
  if (action === "upload") {
    const filePath = requireFlag(parsed, "path");
    const bytes = await readFile2(filePath);
    const form = new FormData();
    form.set("kind", readFlag(parsed, "kind") ?? "general");
    form.set("file", new File([bytes], basename(filePath), { type: mimeTypeForPath(filePath) }));
    return requestJson(active, basePath, { method: "POST", rawBody: form });
  }
  if (action === "download") {
    const fileId = firstPositional(rest, "file id");
    const response = await requestRaw(
      active,
      `${basePath}/${encodeURIComponent(fileId)}`
    );
    return saveResponse(response, readFlag(parsed, "output"), `${fileId}.bin`);
  }
  if (action === "delete") {
    const fileId = firstPositional(rest, "file id");
    requireDeleteConfirmation(parsed, "file", fileId);
    return requestJson(active, `${basePath}/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown file action: ${action}`, 2);
}
async function handleProfile(active, action, rest, parsed) {
  const base = "/api/past-performance";
  if (action === "list") {
    return requestJson(active, base, {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["role", "role"],
        ["client", "client"],
        ["visibility", "visibility"],
        ["capability-tag", "capability_tag"]
      ])
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "profile id"))}`);
  if (action === "create") return requestJson(active, base, { method: "POST", body: await profileBody(parsed) });
  if (action === "update") {
    const id = firstPositional(rest, "profile id");
    const bundle = objectValue(await requestJson(active, `${base}/${encodeURIComponent(id)}`));
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.profile), ...await profileBody(parsed) }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "profile id");
    requireDeleteConfirmation(parsed, "profile", id);
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  throw new CliError(`Unknown profile action: ${action}`, 2);
}
async function handleProposalDefaults(active, rest, parsed) {
  const subaction = rest[0] ?? "list";
  const base = "/api/proposals/defaults";
  if (subaction === "list") return requestJson(active, base);
  if (subaction === "structured") {
    const payload = objectValue(await requestJson(active, base));
    return payload.structuredOutputs ?? [];
  }
  if (subaction === "upload") {
    const filePath = requireFlag(parsed, "path");
    const kind = requireFlag(parsed, "kind");
    const bytes = await readFile2(filePath);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", new File([bytes], basename(filePath), { type: mimeTypeForPath(filePath) }));
    return requestJson(active, `${base}/files`, { method: "POST", rawBody: form });
  }
  if (subaction === "download") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    const response = await requestRaw(active, `${base}/files/${encodeURIComponent(fileId)}`);
    return saveResponse(response, readFlag(parsed, "output"), `${fileId}.bin`);
  }
  if (subaction === "delete") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    requireDeleteConfirmation(parsed, "proposal default file", fileId);
    return requestJson(active, `${base}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  }
  if (subaction === "extract" || subaction === "refresh-structured") {
    const fileId = firstPositional(rest.slice(1), "default file id");
    return requestJson(active, `${base}/files/${encodeURIComponent(fileId)}/structured-output`, {
      method: "POST"
    });
  }
  throw new CliError(`Unknown proposal defaults action: ${subaction}`, 2);
}
async function handleProposal(active, action, rest, parsed) {
  const base = "/api/proposals";
  if (action === "defaults" || action === "default") return handleProposalDefaults(active, rest, parsed);
  if (action === "list") {
    return requestJson(active, base, {
      query: queryFromFlags(parsed, [
        ["search", "search"],
        ["client", "client"],
        ["stage", "stage"],
        ["business-deal-id", "business_deal_id"]
      ])
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "proposal id"))}`);
  if (action === "create") return requestJson(active, base, { method: "POST", body: await proposalBody(parsed) });
  if (action === "update") {
    const id = firstPositional(rest, "proposal id");
    const bundle = objectValue(await requestJson(active, `${base}/${encodeURIComponent(id)}`));
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { ...objectValue(bundle.proposal), ...await proposalBody(parsed) }
    });
  }
  if (action === "delete") {
    const id = firstPositional(rest, "proposal id");
    requireDeleteConfirmation(parsed, "proposal", id);
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  if (action === "analysis") {
    return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "proposal id"))}/analysis`);
  }
  if (action === "analyze") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/analyze`, {
      method: "POST",
      query: { refreshSources: readBooleanFlag(parsed, "refresh-sources") ? "1" : void 0 }
    });
  }
  if (action === "readiness") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`);
  }
  if (action === "review") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`, { method: "POST" });
  }
  if (action === "claims" || action === "findings" || action === "exports") {
    const id = firstPositional(rest, "proposal id");
    const payload = objectValue(
      await requestJson(active, `${base}/${encodeURIComponent(id)}/readiness`)
    );
    if (action === "exports") return payload.exports ?? [];
    const review = objectValue(payload.latestReview);
    return review[action] ?? [];
  }
  if (action === "export") {
    const id = firstPositional(rest, "proposal id");
    const format = (readFlag(parsed, "format") ?? "docx").toLowerCase();
    if (!["docx", "markdown", "md"].includes(format)) {
      throw new CliError("--format must be docx, markdown, or md.", 2);
    }
    const normalizedFormat = format === "md" ? "markdown" : format;
    const response = await requestRaw(active, `${base}/${encodeURIComponent(id)}/export`, {
      query: {
        format: normalizedFormat,
        override: readBooleanFlag(parsed, "override") ? "1" : void 0
      }
    });
    return saveResponse(
      response,
      readFlag(parsed, "output"),
      `${id}-proposal.${normalizedFormat === "docx" ? "docx" : "md"}`
    );
  }
  if (action === "draft") {
    const id = firstPositional(rest, "proposal id");
    const output = readFlag(parsed, "output");
    const markdown = output || ["markdown", "md"].includes((readFlag(parsed, "format") ?? "").toLowerCase());
    if (markdown) {
      const response = await requestRaw(active, `${base}/${encodeURIComponent(id)}/draft`, {
        query: { format: "markdown" }
      });
      return saveResponse(response, output, `${id}-draft.md`);
    }
    return requestJson(active, `${base}/${encodeURIComponent(id)}/draft`);
  }
  if (action === "generate-draft") {
    const id = firstPositional(rest, "proposal id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/draft`, {
      method: "POST",
      body: { sectionKey: readFlag(parsed, "section-key") ?? null }
    });
  }
  throw new CliError(`Unknown proposal action: ${action}`, 2);
}
async function handleSource(active, action, rest, parsed) {
  const base = "/api/sources/items";
  if (action === "list") {
    return requestJson(active, base, {
      query: {
        status: readFlag(parsed, "status"),
        source_type: readFlag(parsed, "source-type")
      }
    });
  }
  if (action === "get") return requestJson(active, `${base}/${encodeURIComponent(firstPositional(rest, "source id"))}`);
  if (action === "upsert" || action === "save") {
    return requestJson(active, base, { method: "POST", body: await sourceBody(parsed) });
  }
  if (action === "patch") {
    const id = firstPositional(rest, "source id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status: requireFlag(parsed, "status") }
    });
  }
  if (action === "capture") {
    const id = firstPositional(rest, "source id");
    return requestJson(active, `${base}/${encodeURIComponent(id)}/capture`, { method: "POST" });
  }
  throw new CliError(`Unknown source action: ${action}`, 2);
}
async function dispatch(parsed, active, env) {
  const [resource, action, ...rest] = parsed.positionals;
  if (!resource || !action) {
    throw new CliError("A resource and action are required. Run `mere-projects --help`.", 2);
  }
  if (resource === "project" || resource === "projects") return handleProject(active, action, rest, parsed, env);
  if (resource === "contact" || resource === "contacts") return handleProjectChild(active, "contact", action, parsed);
  if (resource === "knowledge") return handleProjectChild(active, "knowledge", action, parsed);
  if (resource === "link" || resource === "links") return handleProjectChild(active, "link", action, parsed);
  if (resource === "file" || resource === "files") return handleFile(active, action, rest, parsed);
  if (resource === "profile" || resource === "profiles" || resource === "past-performance") {
    return handleProfile(active, action, rest, parsed);
  }
  if (resource === "proposal" || resource === "proposals") return handleProposal(active, action, rest, parsed);
  if (resource === "source" || resource === "sources") return handleSource(active, action, rest, parsed);
  if (resource === "sam" && action === "search") {
    return requestJson(active, "/api/sources/sam/opportunities", {
      method: "POST",
      body: samBody(parsed, env)
    });
  }
  throw new CliError(`Unknown resource: ${resource}`, 2);
}
async function dispatchLocal(parsed, io) {
  const [resource, action, ...rest] = parsed.positionals;
  if (!resource) {
    throw new CliError("A resource is required. Run `mere-projects --help`.", 2);
  }
  if (resource === "project" || resource === "projects") {
    if (!action) throw new CliError("A project action is required.", 2);
    return handleLocalProject(action, rest, parsed, io);
  }
  if (resource === "contact" || resource === "contacts") {
    if (!action) throw new CliError("A contact action is required.", 2);
    return handleLocalProjectChild("contact", action, parsed, io);
  }
  if (resource === "knowledge") {
    if (!action) throw new CliError("A knowledge action is required.", 2);
    return handleLocalProjectChild("knowledge", action, parsed, io);
  }
  if (resource === "link" || resource === "links") {
    if (!action) throw new CliError("A link action is required.", 2);
    return handleLocalProjectChild("link", action, parsed, io);
  }
  if (resource === "proposal" || resource === "proposals") {
    if (!action) throw new CliError("A proposal action is required.", 2);
    return handleLocalProposal(action, rest, parsed, io);
  }
  if (resource === "file" || resource === "files") {
    if (!action) throw new CliError("A file action is required.", 2);
    return handleLocalFile(action, rest, parsed, io);
  }
  if (resource === "profile" || resource === "profiles" || resource === "past-performance") {
    if (!action) throw new CliError("A profile action is required.", 2);
    return handleLocalProfile(action, rest, parsed, io);
  }
  if (resource === "export") {
    return handleLocalExport(parsed, io);
  }
  if (resource === "import") {
    return handleLocalImport(parsed, io);
  }
  throw localOnlyError(resource);
}
function scalar(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function renderTable(rows) {
  if (rows.length === 0) return "No rows.";
  const columns = ["id", "title", "name", "client", "organization", "status", "stage", "role", "updatedAt"].filter((column) => rows.some((row) => row[column] !== void 0)).slice(0, 6);
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
  if (value && typeof value === "object" && "summary" in value && "projectId" in value && "model" in value) {
    const summary = value;
    return [
      `project: ${summary.projectId ?? ""}`,
      `model: ${summary.model ?? ""}`,
      summary.jobId ? `job: ${summary.jobId}` : null,
      "",
      summary.summary ?? ""
    ].filter((line) => line !== null).join("\n");
  }
  if (value && typeof value === "object" && "path" in value && "filename" in value && "size" in value) {
    const saved = value;
    return `Saved ${saved.filename} (${saved.size} bytes) to ${saved.path}`;
  }
  return JSON.stringify(value, null, 2);
}
function writeResult(io, parsed, result) {
  if (result === void 0 || result === "") return;
  io.stdout(`${readBooleanFlag(parsed, "json") ? JSON.stringify(result, null, 2) : renderHuman(result)}
`);
}
async function handleAuth(parsed, io) {
  const action = parsed.positionals[1];
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
  if (action === "agent-login") {
    return sessionOutput(await agentLogin(parsed, io));
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
  const action = parsed.positionals[1];
  const session = await loadSession(io.env);
  if (!session) throw new CliError("No local session found. Run `mere-projects auth login` first.", 3);
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
    if (readBooleanFlag(parsed, "version") || parsed.positionals.length === 1 && parsed.positionals[0] === "version") {
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
    if (parsed.positionals[0] === "store") {
      const action = parsed.positionals[1] ?? "info";
      if (action !== "info") {
        throw new CliError(`Unknown store action: ${action}`, 2);
      }
      writeResult(io, parsed, await storeInfo(parsed, io));
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
    if (planeConfig(parsed, io.env).data === "local") {
      const result2 = await dispatchLocal(parsed, io);
      writeResult(io, parsed, result2);
      return 0;
    }
    const session = await ensureSession(parsed, io);
    const result = await dispatch(parsed, { session, fetchImpl: io.fetchImpl ?? fetch }, io.env);
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
