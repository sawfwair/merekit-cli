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

// src/lib/shared/validation.ts
var init_validation = __esm({
  "src/lib/shared/validation.ts"() {
    "use strict";
  }
});

// src/lib/shared/media.ts
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
    id: String(row.id),
    sourceId: row.source_id == null ? null : String(row.source_id),
    title: String(row.title),
    sourceType: normalizeSourceType(String(row.source_type)),
    mimeType: row.mime_type == null ? null : String(row.mime_type),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    fileSizeBytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    storageKey: row.storage_key == null ? null : String(row.storage_key),
    originalPath: row.original_path == null ? null : String(row.original_path),
    transcriptStatus: String(row.transcript_status ?? "missing"),
    segmentCount: Number(row.segment_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
function toTranscriptSegment(row) {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    startSeconds: Number(row.start_seconds),
    endSeconds: Number(row.end_seconds),
    text: String(row.text),
    speakerId: row.speaker_id == null ? null : String(row.speaker_id)
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

// cli/local-store.ts
var local_store_exports = {};
__export(local_store_exports, {
  LocalMediaStore: () => LocalMediaStore,
  defaultLocalDbPath: () => defaultLocalDbPath,
  resolveLocalDbPath: () => resolveLocalDbPath
});
import { mkdir as mkdir2 } from "node:fs/promises";
import os3 from "node:os";
import path4 from "node:path";
import { randomUUID } from "node:crypto";
import * as sqliteVec from "sqlite-vec";
function stateHome2(env) {
  const home = env.HOME?.trim() || os3.homedir();
  return env.XDG_DATA_HOME?.trim() || path4.join(home, ".local", "share");
}
function defaultLocalDbPath(env = process.env) {
  return path4.join(stateHome2(env), "mere-media", "media.db");
}
function expandHome(value, env) {
  const home = env.HOME?.trim() || os3.homedir();
  if (value === "~") return home;
  if (value.startsWith("~/")) return path4.join(home, value.slice(2));
  return value;
}
function resolveLocalDbPath(options = {}) {
  const env = options.env ?? process.env;
  const configured = options.dbPath ?? env.MERE_MEDIA_LOCAL_DB;
  return path4.resolve(configured?.trim() ? expandHome(configured, env) : defaultLocalDbPath(env));
}
function makeId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
}
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function json(value) {
  return JSON.stringify(value ?? {});
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
    speakerId: row.speaker_id == null ? null : String(row.speaker_id),
    score
  };
}
async function openSqlite(dbPath) {
  await mkdir2(path4.dirname(dbPath), { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { allowExtension: true });
  sqliteVec.load(db);
  db.enableLoadExtension(false);
  return db;
}
var LocalMediaStore;
var init_local_store = __esm({
  "cli/local-store.ts"() {
    "use strict";
    init_segments();
    init_media();
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
        return {
          dbPath: this.dbPath,
          embeddingDimensions: dimensions?.value ? Number(dimensions.value) : null,
          sqliteVecVersion: version.version
        };
      }
      importMedia(input) {
        this.ensureSchema();
        const sourceId = makeId("src");
        const itemId = makeId("med");
        const jobId = makeId("job");
        const now = isoNow();
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
        const now = isoNow();
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
        const now = isoNow();
        this.db.exec("BEGIN");
        try {
          const insertMap = this.db.prepare("INSERT INTO segment_vector_map (segment_id) VALUES (?)");
          const selectMap = this.db.prepare("SELECT vector_rowid FROM segment_vector_map WHERE segment_id = ?");
          const deleteVector = this.db.prepare("DELETE FROM segment_vectors WHERE rowid = ?");
          const insertVector = this.db.prepare("INSERT INTO segment_vectors(rowid, embedding) VALUES (?, ?)");
          for (const [index, embedding] of input.embeddings.entries()) {
            const segmentId = String(segments[index]?.id);
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
import { mkdtemp as mkdtemp2, rm as rm3 } from "node:fs/promises";
import os4 from "node:os";
import path5 from "node:path";
import { spawnSync as spawnSync2 } from "node:child_process";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_77f59e2f89d80dafdba28e846e401d30/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_77f59e2f89d80dafdba28e846e401d30/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_77f59e2f89d80dafdba28e846e401d30/node_modules/@mere/cli-auth/src/session.ts
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

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_77f59e2f89d80dafdba28e846e401d30/node_modules/@mere/cli-auth/src/client.ts
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
    throw new Error(`Invalid ${label}: ${message}`);
  }
}

// cli/client.ts
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
  async request(path6, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (this.token) {
      headers.set("authorization", `Bearer ${this.token}`);
    }
    const response = await this.fetchImpl(new URL(path6, this.baseUrl), { ...init, headers });
    const payload = await parseResponse(response);
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : `Request failed with status ${response.status.toString()}`;
      throw new MediaCliError(message, response.status);
    }
    return payload;
  }
  importMedia(input) {
    return this.request("/api/media/imports", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  listItems(query) {
    const params = query ? `?query=${encodeURIComponent(query)}` : "";
    return this.request(`/api/media/items${params}`);
  }
  getItem(itemId) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}`);
  }
  getTranscript(itemId) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/transcript`);
  }
  saveTranscript(itemId, input) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/transcript`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  saveEmbeddings(itemId, input) {
    return this.request(`/api/media/items/${encodeURIComponent(itemId)}/embeddings`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  search(query, embedding) {
    if (embedding) {
      return this.request("/api/media/search", {
        method: "POST",
        body: JSON.stringify({ query, embedding })
      });
    }
    return this.request(`/api/media/search?q=${encodeURIComponent(query)}`);
  }
};

// cli/importers.ts
import { readdir, stat } from "node:fs/promises";
import path2 from "node:path";
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([".m4b", ".mp3", ".m4a", ".wav", ".flac", ".aac", ".ogg", ".opus"]);
function isAudioPath(filePath) {
  return AUDIO_EXTENSIONS.has(path2.extname(filePath).toLowerCase());
}
function titleFromPath(filePath) {
  const parsed = path2.parse(filePath);
  return parsed.name.replaceAll(/[_-]+/gu, " ").replaceAll(/\s+/gu, " ").trim() || parsed.base;
}
function mimeTypeFromPath(filePath) {
  switch (path2.extname(filePath).toLowerCase()) {
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
  const absolutePath = path2.resolve(filePath);
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
      extension: path2.extname(absolutePath).toLowerCase()
    }
  };
}
async function listAudioFiles(dirPath) {
  const root = path2.resolve(dirPath);
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const current = path2.join(root, entry.name);
      if (entry.isDirectory()) {
        return listAudioFiles(current);
      }
      return entry.isFile() && isAudioPath(current) ? [current] : [];
    })
  );
  return nested.flat().sort();
}

// cli/mere-run.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, chmod as chmod2, mkdtemp, rm as rm2 } from "node:fs/promises";
import { createHash } from "node:crypto";
import https from "node:https";
import os2 from "node:os";
import path3 from "node:path";
import { spawn as spawn2, spawnSync } from "node:child_process";
var DEFAULT_DMG_URL = "https://public.stereovoid.com/mere-run-releases/mere-run.dmg";
var DEFAULT_INSTALL_BIN = path3.join(os2.homedir(), ".local", "bin", "mere.run");
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
  for (const segment of pathValue.split(path3.delimiter)) {
    if (!segment) continue;
    const candidate = path3.join(segment, binary);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
function configuredBin(env) {
  return env.MERE_MEDIA_MERE_RUN_BIN ?? env.MERE_RUN_BIN ?? null;
}
function configuredInstallBin(env) {
  return env.MERE_MEDIA_MERE_RUN_INSTALL_BIN ?? env.MERE_RUN_INSTALL_BIN ?? DEFAULT_INSTALL_BIN;
}
function configuredDmgUrl(env) {
  return env.MERE_MEDIA_MERE_RUN_DOWNLOAD_URL ?? env.MERE_RUN_DOWNLOAD_URL ?? DEFAULT_DMG_URL;
}
function configuredDmgSha256(env) {
  return env.MERE_MEDIA_MERE_RUN_DOWNLOAD_SHA256 ?? env.MERE_RUN_DOWNLOAD_SHA256 ?? null;
}
function requireDmgSha256(env) {
  const expectedSha256 = configuredDmgSha256(env);
  if (!expectedSha256) {
    throw new Error("Auto-installing mere.run requires MERE_MEDIA_MERE_RUN_DOWNLOAD_SHA256.");
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
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}
async function installFromDmg(env) {
  const installBin = configuredInstallBin(env);
  const expectedSha256 = requireDmgSha256(env);
  mkdirSync(path3.dirname(installBin), { recursive: true });
  const tmp = await mkdtemp(path3.join(os2.tmpdir(), "mere-media-run-"));
  const dmg = path3.join(tmp, "mere-run.dmg");
  const mount = path3.join(tmp, "mount");
  mkdirSync(mount);
  try {
    await download(configuredDmgUrl(env), dmg);
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
    const installer = path3.join(mount, "install.sh");
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
async function resolveMereRunBin(env = process.env) {
  const explicit = configuredBin(env);
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
  const cached = configuredInstallBin(env);
  if (await isExecutable(cached)) return cached;
  return installFromDmg(env);
}
async function runMere(args, options = {}) {
  const bin = await resolveMereRunBin(options.env ?? process.env);
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
async function transcribeAudio(audioPath, env = process.env) {
  return runMere(["speech", "transcribe", audioPath, "--backend", "auto", "--task", "transcribe", "--quiet"], {
    env,
    timeoutMs: 3e5
  });
}
async function embedTexts(texts, env = process.env) {
  if (texts.length === 0) return [];
  const output = await runMere(["text", "embed", "--model", DEFAULT_EMBED_MODEL, "--", ...texts], {
    env,
    timeoutMs: 3e5
  });
  const payload = JSON.parse(output);
  return (payload.data ?? []).map((row) => row.embedding ?? []);
}

// cli/media.ts
init_segments();
var CLI_VERSION = "0.1.0";
var HELP_TEXT = `mere-media CLI

Usage:
  mere-media [global flags] <command> [args]

Global flags:
  --base-url URL        Override MERE_MEDIA_BASE_URL
  --store MODE          cloud (default) or local
  --local-db PATH       Override local SQLite database path
  --workspace ID        Workspace for auth refresh
  --token TOKEN         Internal bearer token override
  --json                Write machine-readable JSON
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
  mere-media import file <path> [--json]
  mere-media import folder <path> [--json]
  mere-media import youtube <url> [--title TITLE] [--json]
  mere-media import audiobook <dir> [--json]
  mere-media process <item-id|path> [--audio PATH] [--transcribe] [--embed] [--json]
  mere-media search <query> [--json]
`;
var GLOBAL_FLAGS = {
  "base-url": "string",
  store: "string",
  "local-db": "string",
  workspace: "string",
  token: "string",
  json: "boolean",
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
    flags: ["store", "local-db"],
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
    flags: ["store", "local-db", "workspace"],
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
    flags: ["store", "local-db", "workspace"]
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
    flags: ["store", "local-db", "workspace"]
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
    flags: ["store", "local-db", "workspace"]
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
    flags: ["store", "local-db", "workspace"]
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
    flags: ["store", "local-db", "workspace", "title"]
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
    flags: ["store", "local-db", "workspace"]
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
    flags: ["store", "local-db", "workspace", "audio", "transcribe", "embed"]
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
    flags: ["store", "local-db", "workspace"]
  }
];
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
function storeMode(options, env) {
  const value = String(options.store ?? env.MERE_MEDIA_STORE ?? "cloud").trim().toLowerCase();
  if (value === "cloud" || value === "local") {
    return value;
  }
  throw new Error(`Unsupported store mode: ${value}. Use cloud or local.`);
}
function localDbPath(options) {
  return typeof options["local-db"] === "string" ? options["local-db"] : void 0;
}
function token(options, env, sessionToken) {
  return String(options.token ?? env.MERE_MEDIA_INTERNAL_TOKEN ?? env.MERE_MEDIA_TOKEN ?? sessionToken ?? "") || void 0;
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
function commandManifest(env) {
  return {
    schemaVersion: 1,
    app: "mere-media",
    namespace: "media",
    aliases: ["media", "mere-media", "meremedia"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_MEDIA_BASE_URL"],
    sessionPath: sessionFilePath(env),
    globalFlags: ["base-url", "store", "local-db", "workspace", "token", "json"],
    commands: MANIFEST_COMMANDS
  };
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
function renderCompletion(shell) {
  const topWords = ["auth", "commands", "completion", "import", "items", "process", "search", "store", "transcript"].sort().join(" ");
  const subcommands = {
    auth: ["login", "logout", "whoami"],
    completion: ["bash", "fish", "zsh"],
    import: ["audiobook", "file", "folder", "youtube"],
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
        { ok: true, store: mode, ...store.info() },
        `local	${resolveLocalDbPath2({ dbPath: localDbPath(args.options), env: io.env })}`
      );
    } finally {
      store.close();
    }
    return 0;
  }
  writeResult(io, Boolean(args.options.json), { ok: true, store: mode, baseUrl: baseUrl(args.options, io.env) }, `cloud	${baseUrl(args.options, io.env)}`);
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
  if (!kind || !target) throw new Error("Usage: mere-media import file|folder|youtube|audiobook <target>");
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
  const tmp = await mkdtemp2(path5.join(os4.tmpdir(), "mere-media-audio-"));
  const wav = path5.join(tmp, "audio.wav");
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
    return { itemId: target, audioPath: path5.resolve(audioOverride) };
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
        transcriptText = await transcribeAudio(wav.path, io.env);
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
      const embeddings = await embedTexts(segments.map((segment) => segment.text), io.env);
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
    [embedding] = await embedTexts([query], io.env);
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
    if (args.options.version) {
      io.stdout(`mere-media ${CLI_VERSION}
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
        return runStore(subcommand, args, io);
      case "auth":
        return runAuth(subcommand, args, io);
      case "items":
        return runItems(subcommand, args, io);
      case "transcript":
        return runTranscript(subcommand, args, io);
      case "import":
        return runImport(subcommand, args, io);
      case "process":
        return runProcess(args, io);
      case "search":
        return runSearch(args, io);
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
