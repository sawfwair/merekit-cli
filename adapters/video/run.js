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

// src/lib/shared/json.ts
function parseJsonText(text, context) {
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    throw new Error(`Invalid ${context} JSON.`);
  }
}
var init_json = __esm({
  "src/lib/shared/json.ts"() {
    "use strict";
  }
});

// src/lib/shared/validation.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function expectRecord(value, context) {
  if (!isRecord(value)) {
    throw new Error(`Expected ${context} to be an object.`);
  }
  return value;
}
function expectArray(record, key, context) {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${context}.${key} to be an array.`);
  }
  return value;
}
function expectString(record, key, context) {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${context}.${key} to be a string.`);
  }
  return value;
}
function assertMaxStringLength(value, maxLength, context) {
  if (value.length > maxLength) {
    throw new Error(`Expected ${context} to be at most ${maxLength} characters.`);
  }
}
function expectBoundedString(record, key, context, maxLength) {
  const value = expectString(record, key, context);
  assertMaxStringLength(value, maxLength, `${context}.${key}`);
  return value;
}
function expectOptionalString(record, key, context) {
  const value = record[key];
  if (value == null) {
    return void 0;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${context}.${key} to be a string when provided.`);
  }
  return value;
}
function expectOptionalBoundedString(record, key, context, maxLength) {
  const value = expectOptionalString(record, key, context);
  if (value !== void 0) {
    assertMaxStringLength(value, maxLength, `${context}.${key}`);
  }
  return value;
}
function expectBoolean(record, key, context) {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${context}.${key} to be a boolean.`);
  }
  return value;
}
function expectOptionalBoolean(record, key, context) {
  const value = record[key];
  if (value == null) {
    return void 0;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${context}.${key} to be a boolean when provided.`);
  }
  return value;
}
function expectNumber(record, key, context) {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error(`Expected ${context}.${key} to be a number.`);
  }
  return value;
}
function expectOptionalNumber(record, key, context) {
  const value = record[key];
  if (value == null) {
    return void 0;
  }
  if (typeof value !== "number") {
    throw new Error(`Expected ${context}.${key} to be a number when provided.`);
  }
  return value;
}
function expectObject(record, key, context) {
  return expectRecord(record[key], `${context}.${key}`);
}
var init_validation = __esm({
  "src/lib/shared/validation.ts"() {
    "use strict";
  }
});

// src/lib/shared/internal-api-contract.ts
function nullableString(value, context) {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${context} to be a string or null.`);
  }
  return value;
}
function parseRoomSummary(value, context) {
  const record = expectRecord(value, context);
  return {
    id: expectString(record, "id", context),
    slug: expectString(record, "slug", context),
    name: nullableString(record.name, `${context}.name`),
    isPersistent: expectBoolean(record, "isPersistent", context),
    createdAt: expectString(record, "createdAt", context),
    updatedAt: nullableString(record.updatedAt, `${context}.updatedAt`),
    archivedAt: nullableString(record.archivedAt, `${context}.archivedAt`)
  };
}
function parseMeetingSummary(value, context) {
  const record = expectRecord(value, context);
  return {
    id: expectString(record, "id", context),
    room_id: expectString(record, "room_id", context),
    peak_participants: expectNumber(record, "peak_participants", context),
    started_at: expectString(record, "started_at", context),
    ended_at: nullableString(record.ended_at, `${context}.ended_at`),
    duration_seconds: expectOptionalNumber(record, "duration_seconds", context) ?? null,
    room_slug: expectString(record, "room_slug", context),
    room_name: nullableString(record.room_name, `${context}.room_name`)
  };
}
function parseCreateInternalRoomResponse(value) {
  const record = expectRecord(value, "create room response");
  return {
    ok: expectBoolean(record, "ok", "create room response"),
    roomId: expectString(record, "roomId", "create room response"),
    slug: expectString(record, "slug", "create room response")
  };
}
function parseRoomEnvelope(value) {
  const record = expectRecord(value, "room response");
  const room = record.room;
  return {
    ok: expectBoolean(record, "ok", "room response"),
    room: room == null ? null : parseRoomSummary(room, "room response.room")
  };
}
function parseRoomsEnvelope(value) {
  const record = expectRecord(value, "rooms response");
  return {
    ok: expectBoolean(record, "ok", "rooms response"),
    rooms: expectArray(record, "rooms", "rooms response").map(
      (room, index) => parseRoomSummary(room, `rooms response.rooms[${index}]`)
    )
  };
}
function parseMeetingsEnvelope(value) {
  const record = expectRecord(value, "meetings response");
  return {
    ok: expectBoolean(record, "ok", "meetings response"),
    meetings: expectArray(record, "meetings", "meetings response").map(
      (meeting, index) => parseMeetingSummary(meeting, `meetings response.meetings[${index}]`)
    )
  };
}
function parseInternalHealthResponse(value) {
  const record = expectRecord(value, "health response");
  const checks = expectObject(record, "checks", "health response");
  return {
    ok: expectBoolean(record, "ok", "health response"),
    timestamp: expectString(record, "timestamp", "health response"),
    checks: {
      db: expectBoolean(checks, "db", "health response.checks"),
      roomWorker: expectBoolean(checks, "roomWorker", "health response.checks")
    }
  };
}
function parseOkEnvelope(value) {
  const record = expectRecord(value, "ok response");
  return {
    ok: expectBoolean(record, "ok", "ok response")
  };
}
function parseAgentWakeMode(value, context) {
  if (value === "addressed" || value === "manual" || value === "always-on") {
    return value;
  }
  throw new Error(`Expected ${context} to be one of "addressed", "manual", or "always-on".`);
}
function nullableOrTrimmedString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function normalizeAgentBootstrapRequest(value) {
  const displayName = value.displayName.trim();
  const agentId = nullableOrTrimmedString(value.agentId);
  return {
    displayName,
    agentId,
    wakeMode: value.wakeMode
  };
}
function parseAgentBootstrapResponse(value) {
  const record = expectRecord(value, "agent bootstrap response");
  const meeting = expectObject(record, "meeting", "agent bootstrap response");
  const agent = expectObject(record, "agent", "agent bootstrap response");
  const auth = expectObject(record, "auth", "agent bootstrap response");
  const transport = expectObject(record, "transport", "agent bootstrap response");
  const policy = expectObject(record, "policy", "agent bootstrap response");
  return {
    ok: expectBoolean(record, "ok", "agent bootstrap response"),
    meeting: {
      roomId: expectString(meeting, "roomId", "agent bootstrap response.meeting"),
      roomSlug: expectString(meeting, "roomSlug", "agent bootstrap response.meeting"),
      roomName: nullableString(meeting.roomName, "agent bootstrap response.meeting.roomName")
    },
    agent: {
      agentId: expectString(agent, "agentId", "agent bootstrap response.agent"),
      displayName: expectString(agent, "displayName", "agent bootstrap response.agent")
    },
    auth: {
      roomAccessToken: expectString(auth, "roomAccessToken", "agent bootstrap response.auth")
    },
    transport: {
      websocketUrl: expectString(transport, "websocketUrl", "agent bootstrap response.transport"),
      callsBasePath: expectString(transport, "callsBasePath", "agent bootstrap response.transport")
    },
    policy: {
      wakeMode: parseAgentWakeMode(policy.wakeMode, "agent bootstrap response.policy.wakeMode")
    }
  };
}
function normalizeCreateInternalRoomRequest(value) {
  const zerosmbWorkspaceId = value.zerosmbWorkspaceId.trim();
  const slug = value.slug?.trim() || void 0;
  const name = value.name?.trim() || void 0;
  return {
    zerosmbWorkspaceId,
    slug,
    name,
    isPersistent: value.isPersistent
  };
}
function normalizeUpdateInternalRoomRequest(value) {
  const slug = value.slug?.trim() || void 0;
  const name = value.name?.trim() || void 0;
  return {
    slug,
    name
  };
}
var init_internal_api_contract = __esm({
  "src/lib/shared/internal-api-contract.ts"() {
    "use strict";
    init_validation();
  }
});

// src/lib/recorder/browser-runtime-payload.ts
function encodeBase64Url(input) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}
function encodeBrowserRecordingRuntimePayload(payload) {
  return encodeBase64Url(JSON.stringify(payload));
}
function buildBrowserRecordingRuntimeHash(payload) {
  return `#payload=${encodeBrowserRecordingRuntimePayload(payload)}`;
}
var init_browser_runtime_payload = __esm({
  "src/lib/recorder/browser-runtime-payload.ts"() {
    "use strict";
    init_internal_api_contract();
    init_json();
    init_validation();
  }
});

// cli/browser-recording-host.ts
var browser_recording_host_exports = {};
__export(browser_recording_host_exports, {
  BrowserRecordingHost: () => BrowserRecordingHost
});
async function loadChromium() {
  try {
    return (await import("@playwright/test")).chromium;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("@playwright/test")) {
      throw new Error("Video browser recording commands require Playwright. Install @playwright/test in the same npm prefix as @mere/cli, or run this command from the local video repo.");
    }
    throw error;
  }
}
var BrowserRecordingHost;
var init_browser_recording_host = __esm({
  "cli/browser-recording-host.ts"() {
    "use strict";
    init_browser_runtime_payload();
    BrowserRecordingHost = class {
      baseUrl;
      payload;
      onLog;
      browser = null;
      context = null;
      page = null;
      completionPromise = null;
      resolveCompletion = null;
      constructor(options) {
        this.baseUrl = options.baseUrl;
        this.payload = options.payload;
        this.onLog = options.onLog ?? (() => void 0);
      }
      async connect() {
        if (this.browser) {
          return;
        }
        const chromium = await loadChromium();
        this.browser = await chromium.launch({
          headless: true,
          args: ["--autoplay-policy=no-user-gesture-required"]
        });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
        this.completionPromise = new Promise((resolve) => {
          this.resolveCompletion = resolve;
        });
        await this.page.exposeBinding(
          "meetingRecorderBridgeLog",
          (_source, level, message) => {
            this.onLog(`[recorder:${level}] ${message}`);
          }
        );
        await this.page.exposeBinding(
          "meetingRecorderBridgeDone",
          (_source, result) => {
            this.resolveCompletion?.(result);
            this.resolveCompletion = null;
          }
        );
        this.page.on("console", (message) => {
          const text = message.text().trim();
          if (text) {
            this.onLog(`[console:${message.type()}] ${text}`);
          }
        });
        this.page.on("pageerror", (error) => {
          this.resolveCompletion?.({
            ok: false,
            recordingId: this.payload.recording.id,
            error: error.message
          });
          this.resolveCompletion = null;
        });
        this.page.on("close", () => {
          this.resolveCompletion?.({
            ok: false,
            recordingId: this.payload.recording.id,
            error: "Recorder page closed before completion."
          });
          this.resolveCompletion = null;
          this.page = null;
          this.context = null;
          this.browser = null;
        });
        const runtimeUrl = new URL("/recorder/runtime", this.baseUrl);
        runtimeUrl.hash = buildBrowserRecordingRuntimeHash(this.payload).slice(1);
        await this.page.goto(runtimeUrl.toString(), {
          waitUntil: "domcontentloaded"
        });
      }
      async waitForCompletion() {
        if (!this.completionPromise) {
          throw new Error("Recorder has not been started.");
        }
        const result = await this.completionPromise;
        await this.stop();
        return result;
      }
      async stop(reason = "operator-stopped") {
        if (this.page) {
          await this.page.evaluate(async (stopReason) => {
            const runtime = window.__meetingRecorderRuntime;
            if (runtime) {
              await runtime.stop(stopReason);
            }
          }, reason).catch(() => void 0);
        }
        await this.page?.close().catch(() => void 0);
        await this.context?.close().catch(() => void 0);
        await this.browser?.close().catch(() => void 0);
        this.page = null;
        this.context = null;
        this.browser = null;
      }
    };
  }
});

// src/lib/agent/browser-runtime-payload.ts
function encodeBase64Url2(input) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}
function normalizeAliases(value) {
  return (value ?? []).map((alias) => alias.trim()).filter((alias, index, all) => alias.length > 0 && all.indexOf(alias) === index);
}
function encodeBrowserAgentRuntimePayload(payload) {
  return encodeBase64Url2(JSON.stringify({
    ...payload,
    aliases: normalizeAliases(payload.aliases)
  }));
}
function buildBrowserAgentRuntimeHash(payload) {
  return `#payload=${encodeBrowserAgentRuntimePayload(payload)}`;
}
var init_browser_runtime_payload2 = __esm({
  "src/lib/agent/browser-runtime-payload.ts"() {
    "use strict";
    init_internal_api_contract();
    init_validation();
    init_json();
  }
});

// cli/browser-meeting-host.ts
var browser_meeting_host_exports = {};
__export(browser_meeting_host_exports, {
  BrowserMeetingHost: () => BrowserMeetingHost
});
function buildCallsResponse(body) {
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  return {
    sessionDescription: {
      type: "answer",
      sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=ZeroMeets Agent Host\r\n"
    },
    tracks: tracks.map((track, index) => {
      const record = track;
      return {
        trackName: typeof record.trackName === "string" && record.trackName.length > 0 ? record.trackName : `track-${index + 1}`,
        mid: typeof record.mid === "string" && record.mid.length > 0 ? record.mid : `mid-${index + 1}`
      };
    }),
    requiresImmediateRenegotiation: false
  };
}
async function loadChromium2() {
  try {
    return (await import("@playwright/test")).chromium;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("@playwright/test")) {
      throw new Error("Video browser host commands require Playwright. Install @playwright/test in the same npm prefix as @mere/cli, or run this command from the local video repo.");
    }
    throw error;
  }
}
var BrowserMeetingHost;
var init_browser_meeting_host = __esm({
  "cli/browser-meeting-host.ts"() {
    "use strict";
    init_browser_runtime_payload2();
    BrowserMeetingHost = class {
      baseUrl;
      payload;
      onEvent;
      onLog;
      browser = null;
      context = null;
      page = null;
      closePromise = null;
      resolveClose = null;
      stopped = false;
      constructor(options) {
        this.baseUrl = options.baseUrl;
        this.onEvent = options.onEvent ?? (() => void 0);
        this.onLog = options.onLog ?? (() => void 0);
        this.payload = {
          version: "meeting-agent-runtime/v1",
          bootstrap: options.bootstrap,
          speech: {
            sttLanguage: options.speechConfig.sttLanguage,
            ttsVoice: options.speechConfig.ttsVoice
          },
          aliases: options.aliases ?? [],
          testMode: options.testMode ?? false,
          testTranscript: options.testTranscript,
          testSpeakerName: options.testSpeakerName
        };
      }
      async installTestMediaEnvironment() {
        if (!this.context) {
          return;
        }
        await this.context.addInitScript({
          content: `
        (() => {
          class FakeRTCPeerConnection {
            constructor() {
              this.localDescription = null;
              this.remoteDescription = null;
              this.iceConnectionState = 'new';
              this.oniceconnectionstatechange = null;
              this.ontrack = null;
              this._transceiverCount = 0;
            }

            addTransceiver(_trackOrKind, init) {
              this._transceiverCount += 1;
              return {
                direction: init?.direction ?? 'sendrecv',
                mid: 'mid-' + this._transceiverCount,
              };
            }

            async createOffer() {
              return {
                type: 'offer',
                sdp: 'v=0\\r\\no=- 0 0 IN IP4 127.0.0.1\\r\\ns=ZeroMeets Agent Host\\r\\n',
              };
            }

            async setLocalDescription(description) {
              this.localDescription = description;
              this.iceConnectionState = 'checking';
              if (typeof this.oniceconnectionstatechange === 'function') {
                this.oniceconnectionstatechange();
              }
            }

            async setRemoteDescription(description) {
              this.remoteDescription = description;
              this.iceConnectionState = 'connected';
              if (typeof this.oniceconnectionstatechange === 'function') {
                this.oniceconnectionstatechange();
              }
            }

            close() {
              this.iceConnectionState = 'closed';
            }
          }

          class FakeRTCSessionDescription {
            constructor(init) {
              this.type = init.type;
              this.sdp = init.sdp;
            }
          }

          Object.defineProperty(window, 'RTCPeerConnection', {
            configurable: true,
            writable: true,
            value: FakeRTCPeerConnection,
          });
          Object.defineProperty(window, 'RTCSessionDescription', {
            configurable: true,
            writable: true,
            value: FakeRTCSessionDescription,
          });
        })();
      `
        });
        let sessionCounter = 0;
        await this.context.route("**/api/ice-servers", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }]
            })
          });
        });
        await this.context.route("**/api/calls/**", async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          if (request.method() === "POST" && url.pathname.endsWith("/sessions/new")) {
            sessionCounter += 1;
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ sessionId: `agent-session-${sessionCounter}` })
            });
            return;
          }
          if (request.method() === "POST" && url.pathname.includes("/tracks/new")) {
            const body = request.postDataJSON();
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(buildCallsResponse(body))
            });
            return;
          }
          if (request.method() === "PUT" && url.pathname.includes("/renegotiate")) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                sessionDescription: {
                  type: "answer",
                  sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=ZeroMeets Agent Host\r\n"
                }
              })
            });
            return;
          }
          await route.fallback();
        });
      }
      async connect() {
        if (this.browser) {
          return;
        }
        const chromium = await loadChromium2();
        this.browser = await chromium.launch({
          headless: true,
          args: ["--autoplay-policy=no-user-gesture-required"]
        });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
        this.closePromise = new Promise((resolve) => {
          this.resolveClose = resolve;
        });
        await this.page.exposeBinding("meetingAgentBridgeEmit", (_source, event) => {
          this.onEvent(event);
        });
        await this.page.exposeBinding(
          "meetingAgentBridgeLog",
          (_source, level, message) => {
            this.onLog(`[browser:${level}] ${message}`);
          }
        );
        this.page.on("console", (message) => {
          const text = message.text().trim();
          if (text) {
            this.onLog(`[console:${message.type()}] ${text}`);
          }
        });
        this.page.on("pageerror", (error) => {
          this.onLog(`[pageerror] ${error.message}`);
        });
        this.page.on("close", () => {
          this.resolveClose?.();
          this.resolveClose = null;
          this.page = null;
          this.context = null;
          this.browser = null;
        });
        if (this.payload.testMode) {
          await this.installTestMediaEnvironment();
        }
        const runtimeUrl = new URL("/agent/runtime", this.baseUrl);
        runtimeUrl.hash = buildBrowserAgentRuntimeHash(this.payload).slice(1);
        await this.page.goto(runtimeUrl.toString(), {
          waitUntil: "domcontentloaded"
        });
      }
      async waitForClose() {
        await this.closePromise;
      }
      async handleAgentAction(action) {
        if (!this.page) {
          return;
        }
        if (action.type === "agent.say") {
          this.onEvent({
            type: "agent.speech.requested",
            text: action.text
          });
        }
        await this.page.evaluate(async (nextAction) => {
          const runtime = window.__meetingAgentRuntime;
          if (!runtime) {
            throw new Error("meeting agent runtime bridge unavailable");
          }
          await runtime.applyAction(nextAction);
        }, action);
      }
      async stop() {
        this.stopped = true;
        await this.page?.close().catch(() => void 0);
        await this.context?.close().catch(() => void 0);
        await this.browser?.close().catch(() => void 0);
        this.resolveClose?.();
        this.resolveClose = null;
        this.page = null;
        this.context = null;
        this.browser = null;
      }
    };
  }
});

// cli/audio-pipeline.ts
var AgentAudioPipeline = class {
  stt;
  tts;
  onTranscriptFinal;
  onSpeechReady;
  onError;
  constructor(options) {
    this.stt = options.stt ?? null;
    this.tts = options.tts ?? null;
    this.onTranscriptFinal = options.onTranscriptFinal;
    this.onSpeechReady = options.onSpeechReady;
    this.onError = options.onError ?? (() => void 0);
  }
  async start() {
    try {
      await this.stt?.start();
    } catch (error) {
      this.onError(error instanceof Error ? error.message : "Failed to start speech-to-text adapter.");
    }
  }
  publishTranscriptFinal(input) {
    this.onTranscriptFinal({
      speakerId: input.speakerId,
      displayName: input.displayName,
      text: input.text,
      timestamp: input.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async synthesizeSpeech(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (!this.tts) {
      this.onSpeechReady({ text: trimmed });
      return;
    }
    try {
      const result = await this.tts.synthesize({ text: trimmed });
      this.onSpeechReady(result);
    } catch (error) {
      this.onError(error instanceof Error ? error.message : "Failed to synthesize speech.");
    }
  }
  async stop() {
    await Promise.allSettled([this.stt?.stop(), this.tts?.stop()]);
  }
};
function resolveDeepgramSpeechConfig(env) {
  return {
    sttModel: env.MEETS_AGENT_STT_MODEL?.trim() || "@cf/deepgram/nova-3",
    sttLanguage: env.MEETS_AGENT_STT_LANGUAGE?.trim() || "en-US",
    ttsModel: env.MEETS_AGENT_TTS_MODEL?.trim() || "@cf/deepgram/aura-2-en",
    ttsVoice: env.MEETS_AGENT_TTS_VOICE?.trim() || "luna"
  };
}

// cli/meets.ts
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

// cli/meeting-host.ts
init_json();

// src/lib/shared/meeting-protocol.ts
init_validation();
var MAX_PARTICIPANT_DISPLAY_NAME_LENGTH = 80;
var MAX_TRACK_ID_LENGTH = 256;
function parseTracks(value, context) {
  const record = expectRecord(value, context);
  return {
    audio: expectOptionalBoundedString(record, "audio", context, MAX_TRACK_ID_LENGTH),
    audioEnabled: expectOptionalBoolean(record, "audioEnabled", context),
    video: expectOptionalBoundedString(record, "video", context, MAX_TRACK_ID_LENGTH),
    videoEnabled: expectOptionalBoolean(record, "videoEnabled", context),
    screenshare: expectOptionalBoundedString(record, "screenshare", context, MAX_TRACK_ID_LENGTH),
    screenshareEnabled: expectOptionalBoolean(record, "screenshareEnabled", context)
  };
}
function parseParticipantUpdate(value, context) {
  const record = expectRecord(value, context);
  return {
    displayName: expectBoundedString(record, "displayName", context, MAX_PARTICIPANT_DISPLAY_NAME_LENGTH),
    joined: expectBoolean(record, "joined", context),
    speaking: expectBoolean(record, "speaking", context),
    raisedHand: expectBoolean(record, "raisedHand", context),
    tracks: parseTracks(expectObject(record, "tracks", context), `${context}.tracks`)
  };
}
function parseParticipant(value, context) {
  const record = expectRecord(value, context);
  return {
    connId: expectString(record, "connId", context),
    ...parseParticipantUpdate(record, context)
  };
}
function parseRoomState(value, context) {
  const record = expectRecord(value, context);
  const participants = expectArray(record, "participants", context).map(
    (participant, index) => parseParticipant(participant, `${context}.participants[${index}]`)
  );
  const meetingId = record.meetingId;
  if (meetingId !== null && typeof meetingId !== "string") {
    throw new Error(`Expected ${context}.meetingId to be a string or null.`);
  }
  return {
    roomSlug: expectString(record, "roomSlug", context),
    participants,
    meetingId
  };
}
function parseServerMessage(value) {
  const record = expectRecord(value, "server message");
  const type = expectString(record, "type", "server message");
  switch (type) {
    case "identity":
      return {
        type,
        connId: expectString(record, "connId", "server message")
      };
    case "roomState":
      return {
        type,
        state: parseRoomState(expectObject(record, "state", "server message"), "server message.state")
      };
    case "userLeftNotification":
      return {
        type,
        connId: expectString(record, "connId", "server message"),
        displayName: expectString(record, "displayName", "server message")
      };
    case "error":
      return {
        type,
        message: expectString(record, "message", "server message")
      };
    default:
      throw new Error(`Unsupported server message type: ${type}`);
  }
}

// cli/meeting-host.ts
var MeetingHost = class {
  bootstrap;
  onEvent;
  onLog;
  onSpeechRequested;
  socketFactory;
  socket = null;
  connId = null;
  roomState = null;
  knownParticipants = /* @__PURE__ */ new Map();
  presence = {
    speaking: false,
    raisedHand: false
  };
  closePromise = null;
  resolveClose = null;
  stopped = false;
  constructor(options) {
    this.bootstrap = options.bootstrap;
    this.onEvent = options.onEvent ?? (() => void 0);
    this.onLog = options.onLog ?? (() => void 0);
    this.onSpeechRequested = options.onSpeechRequested ?? (() => void 0);
    this.socketFactory = options.socketFactory ?? ((url) => new WebSocket(url));
  }
  async connect() {
    if (this.socket) {
      return;
    }
    const socketUrl = new URL(this.bootstrap.transport.websocketUrl);
    socketUrl.searchParams.set("roomAccessToken", this.bootstrap.auth.roomAccessToken);
    const socket = this.socketFactory(socketUrl.toString());
    this.socket = socket;
    this.closePromise = new Promise((resolve) => {
      this.resolveClose = resolve;
    });
    socket.addEventListener("open", () => {
      this.onLog(`Connected to ${this.bootstrap.meeting.roomSlug} as ${this.bootstrap.agent.displayName}.`);
      this.sendPresence();
    });
    socket.addEventListener("message", (event) => {
      this.handleServerMessage(parseServerMessage(parseJsonText(String(event.data), "server message")));
    });
    socket.addEventListener("close", () => {
      this.onEvent({ type: "session.ended", reason: this.stopped ? "client-stopped" : "socket-closed" });
      this.resolveClose?.();
      this.resolveClose = null;
      this.socket = null;
    });
    socket.addEventListener("error", () => {
      this.onEvent({ type: "host.error", message: "Meeting socket error." });
    });
  }
  async waitForClose() {
    await this.closePromise;
  }
  handleAgentAction(action) {
    switch (action.type) {
      case "agent.noop":
        return;
      case "agent.state":
        this.presence.speaking = action.state === "speaking";
        this.sendPresence();
        return;
      case "agent.raise_hand":
        this.presence.raisedHand = true;
        this.sendPresence();
        return;
      case "agent.say":
        this.onEvent({
          type: "agent.speech.requested",
          text: action.text
        });
        void this.onSpeechRequested(action.text);
        return;
    }
  }
  publishTranscriptFinal(input) {
    const event = {
      type: "transcript.final",
      speaker: {
        id: input.speakerId,
        displayName: input.displayName
      },
      text: input.text,
      timestamp: input.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
    };
    this.onEvent(event);
  }
  stop() {
    this.stopped = true;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: "userLeft" });
    }
    this.socket?.close(1e3, "client-stopped");
  }
  handleServerMessage(message) {
    switch (message.type) {
      case "identity":
        this.connId = message.connId;
        this.onEvent({
          type: "session.started",
          meeting: {
            id: this.roomState?.meetingId ?? null,
            roomSlug: this.bootstrap.meeting.roomSlug
          },
          agent: {
            agentId: this.bootstrap.agent.agentId,
            displayName: this.bootstrap.agent.displayName
          }
        });
        break;
      case "roomState":
        this.handleRoomState(message.state);
        break;
      case "userLeftNotification":
        this.onEvent({
          type: "participant.left",
          participant: {
            id: message.connId,
            displayName: message.displayName,
            kind: "human"
          }
        });
        break;
      case "error":
        this.onEvent({
          type: "host.error",
          message: message.message
        });
        break;
    }
  }
  handleRoomState(nextRoomState) {
    const nextParticipants = new Map(nextRoomState.participants.map((participant) => [participant.connId, participant]));
    for (const participant of nextRoomState.participants) {
      if (!this.knownParticipants.has(participant.connId)) {
        this.onEvent({
          type: "participant.joined",
          participant: {
            id: participant.connId,
            displayName: participant.displayName,
            kind: participant.connId === this.connId ? "agent" : "human"
          }
        });
      }
    }
    for (const [connId, participant] of this.knownParticipants) {
      if (!nextParticipants.has(connId)) {
        this.onEvent({
          type: "participant.left",
          participant: {
            id: participant.connId,
            displayName: participant.displayName,
            kind: participant.connId === this.connId ? "agent" : "human"
          }
        });
      }
    }
    this.roomState = nextRoomState;
    this.knownParticipants = nextParticipants;
    this.onEvent({
      type: "room.state",
      meetingId: nextRoomState.meetingId,
      participantCount: nextRoomState.participants.length
    });
  }
  sendPresence() {
    this.send({
      type: "userUpdate",
      data: {
        displayName: this.bootstrap.agent.displayName,
        joined: true,
        speaking: this.presence.speaking,
        raisedHand: this.presence.raisedHand,
        tracks: {
          audioEnabled: false,
          videoEnabled: false,
          screenshareEnabled: false
        }
      }
    });
  }
  send(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }
};

// cli/stdio-agent.ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// cli/agent-protocol.ts
init_json();
init_validation();
function stringifyHostEvent(event) {
  return JSON.stringify(event);
}
function parseAgentAction(value) {
  const record = expectRecord(value, "agent action");
  const type = expectString(record, "type", "agent action");
  switch (type) {
    case "agent.noop":
      return { type };
    case "agent.state": {
      const state = expectString(record, "state", "agent action");
      if (state !== "idle" && state !== "listening" && state !== "thinking" && state !== "speaking") {
        throw new Error("Expected agent action.state to be idle, listening, thinking, or speaking.");
      }
      return { type, state };
    }
    case "agent.say":
      return {
        type,
        text: expectString(record, "text", "agent action")
      };
    case "agent.raise_hand":
      return {
        type,
        reason: expectOptionalString(record, "reason", "agent action")
      };
    default:
      throw new Error(`Unsupported agent action type: ${type}`);
  }
}
function parseAgentActionText(text) {
  return parseAgentAction(parseJsonText(text, "agent action"));
}

// cli/stdio-agent.ts
function splitCommandLine(input) {
  const parts = [];
  let current = "";
  let quote = null;
  let escaping = false;
  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/u.test(char) && !quote) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (escaping) current += "\\";
  if (quote) throw new Error("Unterminated quote in agent command.");
  if (current) parts.push(current);
  if (parts.length === 0) throw new Error("Agent command cannot be empty.");
  return parts;
}
var StdioAgent = class {
  command;
  onAction;
  onError;
  spawnImpl;
  child = null;
  stdoutReader = null;
  constructor(options) {
    this.command = options.command;
    this.onAction = options.onAction;
    this.onError = options.onError ?? (() => void 0);
    this.spawnImpl = options.spawnImpl ?? spawn;
  }
  start() {
    if (this.child) {
      return;
    }
    const [command, ...args] = splitCommandLine(this.command);
    const child = this.spawnImpl(command, args, {
      shell: false,
      stdio: "pipe"
    });
    this.child = child;
    child.stderr.on("data", (chunk) => {
      const message = String(chunk).trim();
      if (message) {
        this.onError(message);
      }
    });
    this.stdoutReader = createInterface({ input: child.stdout });
    this.stdoutReader.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      try {
        void this.onAction(parseAgentActionText(trimmed));
      } catch (error) {
        this.onError(error instanceof Error ? error.message : "Invalid agent action.");
      }
    });
    child.on("exit", (code, signal) => {
      this.onError(`Agent process exited (${signal ?? code ?? "unknown"}).`);
      this.stop();
    });
  }
  send(event) {
    if (!this.child?.stdin.writable) {
      return;
    }
    this.child.stdin.write(`${stringifyHostEvent(event)}
`);
  }
  stop() {
    this.stdoutReader?.close();
    this.stdoutReader = null;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
};

// cli/meets.ts
init_json();

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_7aa3aaab13578c3c596ccc406619ca6b/node_modules/@mere/cli-auth/src/session.ts
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

// cli/client.ts
init_json();
init_internal_api_contract();
init_validation();
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
function normalizeBootstrapResponse(response, baseUrl) {
  const apiBaseUrl = new URL(baseUrl);
  const websocketUrl = new URL(response.transport.websocketUrl);
  if (apiBaseUrl.host !== websocketUrl.host) {
    websocketUrl.host = apiBaseUrl.host;
    websocketUrl.protocol = apiBaseUrl.protocol === "https:" ? "wss:" : "ws:";
  }
  return {
    ...response,
    transport: {
      ...response.transport,
      websocketUrl: websocketUrl.toString()
    }
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
    const record = expectRecord(parseJsonText(text, "error response"), "error response");
    const error = expectOptionalString(record, "error", "error response");
    return error ?? text;
  } catch {
    return text;
  }
}
var MeetsCliClient = class {
  baseUrl;
  token;
  fetchImpl;
  constructor(options) {
    this.baseUrl = normalizeBaseUrl2(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }
  buildRoomUrl(slug) {
    return new URL(`/${slug}`, this.baseUrl).toString();
  }
  async health() {
    return this.request("/api/internal/mere/health", {}, parseInternalHealthResponse, true);
  }
  async listRooms(workspaceId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(`/api/internal/mere/rooms?${params.toString()}`, {}, parseRoomsEnvelope, true);
  }
  async getRoom(roomId) {
    return this.request(`/api/internal/mere/rooms/${encodeURIComponent(roomId)}`, {}, parseRoomEnvelope, true);
  }
  async createRoom(input) {
    return this.request(
      "/api/internal/mere/rooms",
      {
        method: "POST",
        body: JSON.stringify(normalizeCreateInternalRoomRequest(input))
      },
      parseCreateInternalRoomResponse,
      true
    );
  }
  async updateRoom(roomId, input) {
    return this.request(
      `/api/internal/mere/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(normalizeUpdateInternalRoomRequest(input))
      },
      parseRoomEnvelope,
      true
    );
  }
  async archiveRoom(roomId) {
    return this.request(
      `/api/internal/mere/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "DELETE"
      },
      parseOkEnvelope,
      true
    );
  }
  async listMeetings(workspaceId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(`/api/internal/mere/meetings?${params.toString()}`, {}, parseMeetingsEnvelope, true);
  }
  async getMeeting(workspaceId, meetingId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(
      `/api/internal/mere/meetings/${encodeURIComponent(meetingId)}?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async listTranscriptSegments(workspaceId, meetingId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(
      `/api/internal/mere/meetings/${encodeURIComponent(meetingId)}/transcripts?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async listRecordings(workspaceId, options = {}) {
    const params = new URLSearchParams({ workspaceId });
    if (options.meetingId) params.set("meetingId", options.meetingId);
    if (options.limit) params.set("limit", String(options.limit));
    return this.request(
      `/api/internal/mere/recordings?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async getRecording(workspaceId, recordingId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(
      `/api/internal/mere/recordings/${encodeURIComponent(recordingId)}?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async downloadRecording(workspaceId, recordingId) {
    if (!this.token) {
      throw new CliError("This command requires `mere-video auth login` or MEETS_INTERNAL_TOKEN.", 1);
    }
    const params = new URLSearchParams({ workspaceId });
    const headers = new Headers({
      accept: "application/octet-stream",
      authorization: `Bearer ${this.token}`
    });
    const response = await this.fetchImpl(
      new URL(
        `/api/internal/mere/recordings/${encodeURIComponent(recordingId)}/download?${params.toString()}`,
        this.baseUrl
      ),
      { headers }
    );
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`,
        1
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  async startRecording(workspaceId, meetingId, options = {}) {
    return this.request(
      "/api/internal/mere/recordings/start",
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          meetingId,
          displayName: options.displayName
        })
      },
      (value) => passthroughJson(value),
      true
    );
  }
  async stopRecording(workspaceId, input) {
    return this.request(
      "/api/internal/mere/recordings/stop",
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          meetingId: input.meetingId,
          recordingId: input.recordingId
        })
      },
      passthroughJson,
      true
    );
  }
  async getActiveRecording(workspaceId, meetingId) {
    const params = new URLSearchParams({ workspaceId, meetingId });
    return this.request(
      `/api/internal/mere/recordings/active?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async listClientErrors(workspaceId, options = {}) {
    const params = new URLSearchParams({ workspaceId });
    if (options.limit) params.set("limit", String(options.limit));
    return this.request(
      `/api/internal/mere/client-errors?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async getClientError(workspaceId, errorId) {
    const params = new URLSearchParams({ workspaceId });
    return this.request(
      `/api/internal/mere/client-errors/${encodeURIComponent(errorId)}?${params.toString()}`,
      {},
      passthroughJson,
      true
    );
  }
  async bootstrapAgent(roomSlug, input) {
    const path2 = this.token ? `/api/internal/mere/rooms/by-slug/${encodeURIComponent(roomSlug)}/agent-bootstrap` : `/api/room/${encodeURIComponent(roomSlug)}/agent-bootstrap`;
    const response = await this.request(
      path2,
      {
        method: "POST",
        body: JSON.stringify(normalizeAgentBootstrapRequest(input))
      },
      parseAgentBootstrapResponse,
      Boolean(this.token)
    );
    return normalizeBootstrapResponse(response, this.baseUrl);
  }
  async request(path2, init, parser, requiresToken) {
    if (requiresToken && !this.token) {
      throw new CliError("This command requires `mere-video auth login` or MEETS_INTERNAL_TOKEN.", 1);
    }
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) {
      headers.set("content-type", "application/json");
    }
    if (this.token) {
      headers.set("authorization", `Bearer ${this.token}`);
    }
    const response = await this.fetchImpl(new URL(path2, this.baseUrl), {
      ...init,
      headers
    });
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`,
        1
      );
    }
    const text = await response.text();
    const payload = text ? parseJsonText(text, "response") : {};
    return parser(payload);
  }
};

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_7aa3aaab13578c3c596ccc406619ca6b/node_modules/@mere/cli-auth/src/client.ts
import { spawn as spawn2 } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_7aa3aaab13578c3c596ccc406619ca6b/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.59.1_@sveltejs+vite-p_7aa3aaab13578c3c596ccc406619ca6b/node_modules/@mere/cli-auth/src/client.ts
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

// cli/session.ts
var APP_NAME = "mere-video";
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
    productLabel: "mere-video"
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
function formatDuration(seconds) {
  if (seconds == null) return "ongoing";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) {
    return remainderSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainderSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes === 0 ? `${hours}h` : `${hours}h ${remainderMinutes}m`;
}

// cli/meets.ts
var activeSession = null;
var HELP_TEXT = `mere-video CLI (alias: meets)

Usage:
  mere-video [global flags] <command> [args]

Global flags:
  --base-url URL        Override MEETS_BASE_URL
  --workspace ID        Override MEETS_DEFAULT_WORKSPACE_ID
  --token TOKEN         Override MEETS_INTERNAL_TOKEN
  --json                Write machine-readable JSON
  --version             Show the CLI version
  --no-interactive      Reserved for non-interactive automation
  --yes                 Required for destructive automation
  --confirm ID          Exact target required with --yes for destructive commands
  --help                Show this help

Commands:
  mere-video auth login [--base-url URL] [--workspace WORKSPACE_ID] [--json]
  mere-video auth whoami [--json]
  mere-video auth logout [--json]
  mere-video completion [bash|zsh|fish]

  mere-video workspace list [--json]
  mere-video workspace current [--json]
  mere-video workspace use <id|slug|host> [--json]
  mere-video health [--base-url URL] [--token TOKEN] [--json]
  mere-video rooms list [--workspace WORKSPACE_ID] [--base-url URL] [--token TOKEN] [--json]
  mere-video rooms show <room-id> [--base-url URL] [--token TOKEN] [--json]
  mere-video rooms create [--workspace WORKSPACE_ID] [--name NAME] [--slug SLUG] [--persistent] [--base-url URL] [--token TOKEN] [--json]
  mere-video rooms update <room-id> [--name NAME] [--slug SLUG] [--base-url URL] [--token TOKEN] [--json]
  mere-video rooms archive <room-id> [--base-url URL] [--token TOKEN] [--yes] [--json]
  mere-video rooms invite <slug> [--base-url URL] [--json]
  mere-video meetings list [--workspace WORKSPACE_ID] [--base-url URL] [--token TOKEN] [--json]
  mere-video meetings show <meeting-id> [--workspace WORKSPACE_ID] [--json]
  mere-video participants list <meeting-id> [--workspace WORKSPACE_ID] [--json]
  mere-video recordings start <meeting-id> [--workspace WORKSPACE_ID] [--name NAME] [--no-run] [--max-seconds N] [--json]
  mere-video recordings stop <meeting-id> [--workspace WORKSPACE_ID] [--json]
  mere-video recordings status <meeting-id> [--workspace WORKSPACE_ID] [--json]
  mere-video recordings list [--workspace WORKSPACE_ID] [--meeting MEETING_ID] [--limit N] [--json]
  mere-video recordings show <recording-id> [--workspace WORKSPACE_ID] [--json]
  mere-video recordings download <recording-id> --output FILE [--workspace WORKSPACE_ID]
  mere-video transcripts list <meeting-id> [--workspace WORKSPACE_ID] [--json]
  mere-video transcripts export <meeting-id> [--format json|txt] [--output FILE] [--workspace WORKSPACE_ID]
  mere-video access-links room <slug> [--base-url URL] [--json]
  mere-video diagnostics health|room-worker|client-errors [--limit N] [--json]
  mere-video diagnostics client-error <error-id> [--json]
  mere-video agent voice-config [--json]
  mere-video agent join <room-slug> --name NAME [--agent-id AGENT_ID] [--wake-mode addressed|manual|always-on] [--runtime presence|browser] [--connect] [--agent-command COMMAND] [--base-url URL] [--token TOKEN] [--json]

Environment:
  MEETS_BASE_URL            Base app URL, for example https://mere.video
  MEETS_INTERNAL_TOKEN      Bearer token override for internal/service access
  MEETS_DEFAULT_WORKSPACE_ID Default workspace for list/create commands
  MEETS_WORKSPACE_ID        Alias for MEETS_DEFAULT_WORKSPACE_ID
`;
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  workspace: "string",
  token: "string",
  json: "boolean",
  help: "boolean",
  version: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string"
};
var COMPLETION_WORDS = [
  "access-links",
  "agent",
  "auth",
  "completion",
  "diagnostics",
  "health",
  "meetings",
  "participants",
  "recordings",
  "rooms",
  "transcripts",
  "workspace"
];
function manifestCommand(path2, summary, options = {}) {
  return {
    id: path2.join("."),
    path: path2,
    summary,
    auth: options.auth ?? "workspace",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: [],
    flags: [],
    ...options.auditDefault ? { auditDefault: true } : {}
  };
}
function commandManifest() {
  return {
    schemaVersion: 1,
    app: "mere-video",
    namespace: "video",
    aliases: ["mere-video", "meets"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MEETS_BASE_URL"],
    sessionPath: "~/.local/state/mere-video/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["health"], "Show app health.", { auditDefault: true }),
      manifestCommand(["rooms", "list"], "List rooms.", { auditDefault: true }),
      manifestCommand(["rooms", "show"], "Show room."),
      manifestCommand(["rooms", "create"], "Create room.", { risk: "write", supportsData: true }),
      manifestCommand(["rooms", "update"], "Update room.", { risk: "write", supportsData: true }),
      manifestCommand(["rooms", "archive"], "Archive room.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["rooms", "invite"], "Create room invite link.", { risk: "write" }),
      manifestCommand(["meetings", "list"], "List meetings.", { auditDefault: true }),
      manifestCommand(["meetings", "show"], "Show meeting."),
      manifestCommand(["participants", "list"], "List meeting participants."),
      manifestCommand(["recordings", "start"], "Start recording lifecycle.", { risk: "external", supportsData: true, requiresYes: true }),
      manifestCommand(["recordings", "stop"], "Stop recording lifecycle.", { risk: "external", requiresYes: true }),
      manifestCommand(["recordings", "status"], "Show recording status."),
      manifestCommand(["recordings", "list"], "List recordings."),
      manifestCommand(["recordings", "show"], "Show recording."),
      manifestCommand(["recordings", "download"], "Download recording artifact."),
      manifestCommand(["transcripts", "list"], "List transcript turns."),
      manifestCommand(["transcripts", "export"], "Export transcript artifact."),
      manifestCommand(["access-links", "room"], "Create room access link.", { risk: "write" }),
      manifestCommand(["diagnostics", "health"], "Show diagnostics health.", { auditDefault: true }),
      manifestCommand(["diagnostics", "room-worker"], "Show room worker diagnostics."),
      manifestCommand(["diagnostics", "client-errors"], "List client errors."),
      manifestCommand(["diagnostics", "client-error"], "Show client error."),
      manifestCommand(["agent", "voice-config"], "Show agent voice config."),
      manifestCommand(["agent", "join"], "Join room as agent.", { risk: "external", requiresYes: true }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
async function cliVersion() {
  const raw = await readFile2(new URL("../package.json", import.meta.url), "utf8");
  const parsed = parseJsonText(raw, "package metadata");
  return parsed.version ?? "0.0.0";
}
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-video bash completion",
      "_mere_video_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_video_completion mere-video meets",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-video meets",
      "_mere_video() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_video "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-video -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.", 2);
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
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
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
    if (inlineValue != null) {
      options[rawName] = inlineValue;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      throw new CliError(`Missing value for --${rawName}.`);
    }
    options[rawName] = next;
    index += 1;
  }
  return { options, positionals };
}
function splitGlobalFlags(argv) {
  const globalTokens = [];
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      break;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const expectedKind = GLOBAL_FLAG_SPEC[rawName];
    if (!expectedKind) {
      break;
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
function mergeOptions(globalOptions, localOptions) {
  return {
    ...globalOptions,
    ...localOptions
  };
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asBoolean(value) {
  return value === true;
}
function requireDestructiveConfirmation(options, label, target) {
  if (!asBoolean(options.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`, 2);
  }
  if (asString(options.confirm) !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`, 2);
  }
}
function resolveBaseUrl(options, env) {
  const baseUrl = asString(options["base-url"]) ?? env.MEETS_BASE_URL ?? activeSession?.baseUrl ?? "https://mere.video";
  if (!baseUrl) {
    throw new CliError("Missing base URL. Set MEETS_BASE_URL or pass --base-url.");
  }
  return baseUrl;
}
function resolveToken(options, env) {
  return asString(options.token) ?? env.MEETS_INTERNAL_TOKEN ?? activeSession?.accessToken;
}
function resolveExternalToken(options, env) {
  return asString(options.token) ?? env.MEETS_INTERNAL_TOKEN;
}
function resolveWorkspace(options, env) {
  const workspaceId = asString(options.workspace) ?? env.MEETS_DEFAULT_WORKSPACE_ID ?? env.MEETS_WORKSPACE_ID ?? activeSession?.defaultWorkspaceId ?? void 0;
  if (!workspaceId) {
    throw new CliError(
      "Missing workspace ID. Set MEETS_DEFAULT_WORKSPACE_ID or pass --workspace."
    );
  }
  return workspaceId;
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function renderUnknownCell(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function parsePositiveInt(value, label) {
  if (!value) return void 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(`${label} must be a positive integer.`);
  }
  return parsed;
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeText(io, value) {
  io.stdout(`${value}
`);
}
async function writeBytesFile(pathname, bytes) {
  const target = resolvePath(pathname);
  await mkdir2(dirname(target), { recursive: true });
  await writeFile2(target, bytes);
  return target;
}
async function writeTextFile(pathname, text) {
  return writeBytesFile(pathname, Buffer.from(text, "utf8"));
}
function renderHealth(health) {
  return formatKeyValue([
    ["status", health.ok ? "ok" : "degraded"],
    ["database", formatBoolean(health.checks.db)],
    ["room worker", formatBoolean(health.checks.roomWorker)],
    ["timestamp", health.timestamp]
  ]);
}
function renderRooms(rooms) {
  return formatTable(
    ["ID", "SLUG", "NAME", "PERSISTENT", "ARCHIVED", "UPDATED"],
    rooms.map((room) => [
      room.id,
      room.slug,
      formatNullable(room.name),
      formatBoolean(room.isPersistent),
      formatNullable(room.archivedAt),
      formatNullable(room.updatedAt)
    ])
  );
}
function renderRoom(room) {
  return formatKeyValue([
    ["id", room.id],
    ["slug", room.slug],
    ["name", formatNullable(room.name)],
    ["persistent", formatBoolean(room.isPersistent)],
    ["created", room.createdAt],
    ["updated", formatNullable(room.updatedAt)],
    ["archived", formatNullable(room.archivedAt)]
  ]);
}
function renderMeetings(meetings) {
  return formatTable(
    ["ID", "ROOM", "STARTED", "ENDED", "DURATION", "PEAK"],
    meetings.map((meeting) => [
      meeting.id,
      meeting.room_name ?? meeting.room_slug,
      meeting.started_at,
      formatNullable(meeting.ended_at),
      formatDuration(meeting.duration_seconds),
      String(meeting.peak_participants)
    ])
  );
}
function renderAgentBootstrap(bootstrap) {
  return formatKeyValue([
    ["room", bootstrap.meeting.roomName ?? bootstrap.meeting.roomSlug],
    ["room slug", bootstrap.meeting.roomSlug],
    ["agent", bootstrap.agent.displayName],
    ["agent id", bootstrap.agent.agentId],
    ["wake mode", bootstrap.policy.wakeMode],
    ["websocket", bootstrap.transport.websocketUrl],
    ["calls path", bootstrap.transport.callsBasePath],
    ["room access token", bootstrap.auth.roomAccessToken]
  ]);
}
function createClient(io, options) {
  return new MeetsCliClient({
    baseUrl: resolveBaseUrl(options, io.env),
    token: resolveToken(options, io.env),
    fetchImpl: io.fetchImpl
  });
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
function invitePayload(client, slug) {
  return {
    slug,
    url: client.buildRoomUrl(slug)
  };
}
async function handleHealth(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    "base-url": "string",
    token: "string",
    json: "boolean",
    help: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (asBoolean(options.help)) {
    writeText(io, HELP_TEXT);
    return;
  }
  if (positionals.length > 0) {
    throw new CliError("health does not accept positional arguments.");
  }
  const client = createClient(io, options);
  const health = await client.health();
  if (asBoolean(options.json)) {
    writeJson(io, health);
    return;
  }
  writeText(io, renderHealth(health));
}
async function handleRoomList(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (positionals.length > 0) {
    throw new CliError("rooms list does not accept positional arguments.");
  }
  const client = createClient(io, options);
  const rooms = await client.listRooms(resolveWorkspace(options, io.env));
  if (asBoolean(options.json)) {
    writeJson(io, rooms);
    return;
  }
  writeText(io, rooms.rooms.length > 0 ? renderRooms(rooms.rooms) : "No rooms found.");
}
async function handleRoomShow(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const roomId = positionals[0];
  if (!roomId || positionals.length !== 1) {
    throw new CliError("rooms show requires exactly one <room-id>.");
  }
  const client = createClient(io, options);
  const room = await client.getRoom(roomId);
  if (!room.room) {
    throw new CliError(`Room ${roomId} was not found.`);
  }
  if (asBoolean(options.json)) {
    writeJson(io, room);
    return;
  }
  writeText(io, renderRoom(room.room));
}
async function handleRoomCreate(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    name: "string",
    slug: "string",
    persistent: "boolean",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (positionals.length > 0) {
    throw new CliError("rooms create does not accept positional arguments.");
  }
  const client = createClient(io, options);
  const payload = {
    zerosmbWorkspaceId: resolveWorkspace(options, io.env),
    name: trimOption(asString(options.name)),
    slug: trimOption(asString(options.slug)),
    isPersistent: asBoolean(options.persistent)
  };
  const created = await client.createRoom(payload);
  const invite = invitePayload(client, created.slug);
  if (asBoolean(options.json)) {
    writeJson(io, { ...created, inviteUrl: invite.url });
    return;
  }
  writeText(
    io,
    formatKeyValue([
      ["room id", created.roomId],
      ["slug", created.slug],
      ["invite", invite.url]
    ])
  );
}
async function handleRoomUpdate(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    name: "string",
    slug: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const roomId = positionals[0];
  if (!roomId || positionals.length !== 1) {
    throw new CliError("rooms update requires exactly one <room-id>.");
  }
  const payload = {
    name: trimOption(asString(options.name)),
    slug: trimOption(asString(options.slug))
  };
  if (!payload.name && !payload.slug) {
    throw new CliError("rooms update requires at least one of --name or --slug.");
  }
  const client = createClient(io, options);
  const updated = await client.updateRoom(roomId, payload);
  if (!updated.room) {
    throw new CliError(`Room ${roomId} was not found.`);
  }
  if (asBoolean(options.json)) {
    writeJson(io, updated);
    return;
  }
  writeText(io, renderRoom(updated.room));
}
async function handleRoomArchive(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    "base-url": "string",
    token: "string",
    json: "boolean",
    yes: "boolean",
    confirm: "string"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const roomId = positionals[0];
  if (!roomId || positionals.length !== 1) {
    throw new CliError("rooms archive requires exactly one <room-id>.");
  }
  requireDestructiveConfirmation(options, "archive room", roomId);
  const client = createClient(io, options);
  const archived = await client.archiveRoom(roomId);
  if (asBoolean(options.json)) {
    writeJson(io, { ...archived, roomId });
    return;
  }
  writeText(io, `Archived room ${roomId}.`);
}
async function handleRoomInvite(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    "base-url": "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const slug = trimOption(positionals[0]);
  if (!slug || positionals.length !== 1) {
    throw new CliError("rooms invite requires exactly one <slug>.");
  }
  const client = createClient(io, options);
  const invite = invitePayload(client, slug);
  if (asBoolean(options.json)) {
    writeJson(io, invite);
    return;
  }
  writeText(io, invite.url);
}
async function handleMeetingsList(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (positionals.length > 0) {
    throw new CliError("meetings list does not accept positional arguments.");
  }
  const client = createClient(io, options);
  const meetings = await client.listMeetings(resolveWorkspace(options, io.env));
  if (asBoolean(options.json)) {
    writeJson(io, meetings);
    return;
  }
  writeText(io, meetings.meetings.length > 0 ? renderMeetings(meetings.meetings) : "No meetings found.");
}
async function handleMeetingsShow(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const meetingId = trimOption(positionals[0]);
  if (!meetingId || positionals.length !== 1) {
    throw new CliError("meetings show requires exactly one <meeting-id>.");
  }
  const client = createClient(io, options);
  const meeting = await client.getMeeting(resolveWorkspace(options, io.env), meetingId);
  writeText(io, JSON.stringify(meeting, null, 2));
}
async function handleParticipantsList(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const meetingId = trimOption(positionals[0]);
  if (!meetingId || positionals.length !== 1) {
    throw new CliError("participants list requires exactly one <meeting-id>.");
  }
  const client = createClient(io, options);
  const detail = await client.getMeeting(resolveWorkspace(options, io.env), meetingId);
  if (asBoolean(options.json)) {
    writeJson(io, detail);
    return;
  }
  const participants = detail && typeof detail === "object" && Array.isArray(detail.participants) ? detail.participants : [];
  writeText(
    io,
    participants.length > 0 ? formatTable(
      ["ID", "NAME", "JOINED", "LEFT", "DURATION"],
      participants.map((participant) => [
        renderUnknownCell(participant.id),
        renderUnknownCell(participant.display_name),
        renderUnknownCell(participant.joined_at),
        formatNullable(participant.left_at == null ? null : renderUnknownCell(participant.left_at)),
        formatDuration(
          typeof participant.duration_seconds === "number" ? participant.duration_seconds : null
        )
      ])
    ) : "No participants found."
  );
}
async function handleRecordings(io, globalOptions, action, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    meeting: "string",
    recording: "string",
    name: "string",
    "no-run": "boolean",
    "max-seconds": "string",
    limit: "string",
    output: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const client = createClient(io, options);
  const workspaceId = resolveWorkspace(options, io.env);
  if (!action) {
    throw new CliError("Unknown recordings command: (missing).");
  }
  switch (action) {
    case "start": {
      const meetingId = trimOption(positionals[0]);
      if (!meetingId || positionals.length !== 1) {
        throw new CliError("recordings start requires exactly one <meeting-id>.");
      }
      const result = await client.startRecording(workspaceId, meetingId, {
        displayName: trimOption(asString(options.name))
      });
      if (asBoolean(options.json) || asBoolean(options["no-run"])) {
        writeJson(io, result);
        return;
      }
      const { BrowserRecordingHost: BrowserRecordingHost2 } = await Promise.resolve().then(() => (init_browser_recording_host(), browser_recording_host_exports));
      const host = new BrowserRecordingHost2({
        baseUrl: resolveBaseUrl(options, io.env),
        payload: {
          version: "meeting-recorder-runtime/v1",
          bootstrap: result.bootstrap,
          recording: {
            id: result.recording.id,
            meetingId: result.recording.meetingId
          },
          completePath: result.completePath,
          controlPath: result.controlPath,
          testMode: false,
          maxSeconds: parsePositiveInt(asString(options["max-seconds"]), "--max-seconds")
        },
        onLog: (message) => io.stderr(`${message}
`)
      });
      const stop = () => {
        void client.stopRecording(workspaceId, { recordingId: result.recording.id }).catch(() => void 0);
        void host.stop("signal");
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      writeText(io, `Recording ${meetingId} as ${result.recording.id}. Press Ctrl-C or run recordings stop.`);
      await host.connect();
      const completion = await host.waitForCompletion();
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      if (!completion.ok) {
        throw new CliError(completion.error ?? "Recording failed.");
      }
      writeText(io, `Recording ${completion.recordingId} uploaded.`);
      return;
    }
    case "stop": {
      const target = trimOption(positionals[0]);
      if (!target || positionals.length !== 1) {
        throw new CliError("recordings stop requires exactly one <meeting-id>.");
      }
      writeText(io, JSON.stringify(await client.stopRecording(workspaceId, { meetingId: target }), null, 2));
      return;
    }
    case "status": {
      const meetingId = trimOption(positionals[0]);
      if (!meetingId || positionals.length !== 1) {
        throw new CliError("recordings status requires exactly one <meeting-id>.");
      }
      writeText(io, JSON.stringify(await client.getActiveRecording(workspaceId, meetingId), null, 2));
      return;
    }
    case "list": {
      if (positionals.length > 0) {
        throw new CliError("recordings list does not accept positional arguments.");
      }
      const result = await client.listRecordings(workspaceId, {
        meetingId: trimOption(asString(options.meeting)),
        limit: parsePositiveInt(asString(options.limit), "--limit")
      });
      writeText(io, JSON.stringify(result, null, 2));
      return;
    }
    case "show": {
      const recordingId = trimOption(positionals[0]);
      if (!recordingId || positionals.length !== 1) {
        throw new CliError("recordings show requires exactly one <recording-id>.");
      }
      writeText(io, JSON.stringify(await client.getRecording(workspaceId, recordingId), null, 2));
      return;
    }
    case "download": {
      const recordingId = trimOption(positionals[0]);
      const output = trimOption(asString(options.output));
      if (!recordingId || positionals.length !== 1) {
        throw new CliError("recordings download requires exactly one <recording-id>.");
      }
      if (!output) {
        throw new CliError("recordings download requires --output FILE.");
      }
      const path2 = await writeBytesFile(output, await client.downloadRecording(workspaceId, recordingId));
      if (asBoolean(options.json)) {
        writeJson(io, { recordingId, output: path2 });
      } else {
        writeText(io, `Downloaded recording ${recordingId} to ${path2}.`);
      }
      return;
    }
    default:
      throw new CliError(`Unknown recordings command: ${action ?? "(missing)"}.`);
  }
}
function transcriptTextFromSegments(detail) {
  const segments = detail && typeof detail === "object" && Array.isArray(detail.segments) ? detail.segments : [];
  return segments.map((segment) => {
    const speaker = typeof segment.speakerName === "string" ? segment.speakerName : "Speaker";
    const text = typeof segment.text === "string" ? segment.text : "";
    return text ? `${speaker}: ${text}` : "";
  }).filter(Boolean).join("\n");
}
async function handleTranscripts(io, globalOptions, action, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    format: "string",
    output: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (!action) {
    throw new CliError("Unknown transcripts command: (missing).");
  }
  const meetingId = trimOption(positionals[0]);
  if (!meetingId || positionals.length !== 1) {
    throw new CliError(`transcripts ${action} requires exactly one <meeting-id>.`);
  }
  const client = createClient(io, options);
  const detail = await client.listTranscriptSegments(resolveWorkspace(options, io.env), meetingId);
  switch (action) {
    case "list":
      writeText(io, JSON.stringify(detail, null, 2));
      return;
    case "export": {
      const format = trimOption(asString(options.format)) ?? (asBoolean(options.json) ? "json" : "txt");
      const output = trimOption(asString(options.output));
      if (format === "json") {
        const text2 = JSON.stringify(detail, null, 2);
        if (output) {
          const path2 = await writeTextFile(output, text2);
          if (asBoolean(options.json)) writeJson(io, { meetingId, output: path2, format });
          else writeText(io, `Exported transcript ${meetingId} to ${path2}.`);
          return;
        }
        writeText(io, text2);
        return;
      }
      if (format !== "txt") {
        throw new CliError("transcripts export --format must be json or txt.");
      }
      const text = transcriptTextFromSegments(detail);
      if (output) {
        const path2 = await writeTextFile(output, text);
        if (asBoolean(options.json)) writeJson(io, { meetingId, output: path2, format });
        else writeText(io, `Exported transcript ${meetingId} to ${path2}.`);
        return;
      }
      writeText(io, text);
      return;
    }
    default:
      throw new CliError(`Unknown transcripts command: ${action ?? "(missing)"}.`);
  }
}
async function handleAccessLinks(io, globalOptions, action, args) {
  if (action !== "room") {
    throw new CliError("Unknown access-links command. Expected room.");
  }
  await handleRoomInvite(io, globalOptions, args);
}
async function handleDiagnostics(io, globalOptions, action, args) {
  if (action === "health" || action === "room-worker") {
    await handleHealth(io, globalOptions, args);
    return;
  }
  const { options: localOptions, positionals } = parseFlags(args, {
    workspace: "string",
    limit: "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const client = createClient(io, options);
  const workspaceId = resolveWorkspace(options, io.env);
  if (action === "client-errors") {
    if (positionals.length > 0) {
      throw new CliError("diagnostics client-errors does not accept positional arguments.");
    }
    writeText(
      io,
      JSON.stringify(
        await client.listClientErrors(workspaceId, {
          limit: parsePositiveInt(asString(options.limit), "--limit")
        }),
        null,
        2
      )
    );
    return;
  }
  if (action === "client-error") {
    const errorId = trimOption(positionals[0]);
    if (!errorId || positionals.length !== 1) {
      throw new CliError("diagnostics client-error requires exactly one <error-id>.");
    }
    writeText(io, JSON.stringify(await client.getClientError(workspaceId, errorId), null, 2));
    return;
  }
  throw new CliError(`Unknown diagnostics command: ${action ?? "(missing)"}.`);
}
async function handleAgentVoiceConfig(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    json: "boolean",
    help: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (asBoolean(options.help)) {
    writeText(io, HELP_TEXT);
    return;
  }
  if (positionals.length > 0) {
    throw new CliError("agent voice-config does not accept positional arguments.");
  }
  const config = resolveDeepgramSpeechConfig(io.env);
  if (asBoolean(options.json)) {
    writeJson(io, config);
  } else {
    writeText(
      io,
      formatKeyValue([
        ["stt model", config.sttModel],
        ["stt language", config.sttLanguage],
        ["tts model", config.ttsModel],
        ["tts voice", config.ttsVoice]
      ])
    );
  }
}
async function handleAgentJoin(io, globalOptions, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    name: "string",
    "agent-id": "string",
    "wake-mode": "string",
    runtime: "string",
    connect: "boolean",
    "agent-command": "string",
    "test-transcript": "string",
    "test-speaker": "string",
    "base-url": "string",
    token: "string",
    json: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  const roomSlug = trimOption(positionals[0]);
  if (!roomSlug || positionals.length !== 1) {
    throw new CliError("agent join requires exactly one <room-slug>.");
  }
  const displayName = trimOption(asString(options.name));
  if (!displayName) {
    throw new CliError("agent join requires --name.");
  }
  const wakeMode = trimOption(asString(options["wake-mode"]));
  if (wakeMode && wakeMode !== "addressed" && wakeMode !== "manual" && wakeMode !== "always-on") {
    throw new CliError("agent join --wake-mode must be one of addressed, manual, or always-on.");
  }
  const runtime = trimOption(asString(options.runtime)) ?? "presence";
  if (runtime !== "presence" && runtime !== "browser") {
    throw new CliError("agent join --runtime must be one of presence or browser.");
  }
  const client = createClient(io, options);
  const bootstrap = await client.bootstrapAgent(roomSlug, {
    displayName,
    agentId: trimOption(asString(options["agent-id"])),
    wakeMode
  });
  if (asBoolean(options.connect)) {
    if (asBoolean(options.json)) {
      throw new CliError("agent join --connect cannot be combined with --json.");
    }
    const agentCommand = trimOption(asString(options["agent-command"]));
    const testTranscript = trimOption(asString(options["test-transcript"]));
    const testSpeaker = trimOption(asString(options["test-speaker"])) ?? "Test Speaker";
    const speechConfig = resolveDeepgramSpeechConfig(io.env);
    if (runtime === "browser") {
      const baseUrl = resolveBaseUrl(options, io.env);
      const { BrowserMeetingHost: BrowserMeetingHost2 } = await Promise.resolve().then(() => (init_browser_meeting_host(), browser_meeting_host_exports));
      const host2 = new BrowserMeetingHost2({
        baseUrl,
        bootstrap,
        speechConfig,
        onEvent: (event) => {
          io.stdout(`${JSON.stringify(event)}
`);
          agent2?.send(event);
        },
        onLog: (message) => io.stderr(`${message}
`),
        testMode: Boolean(testTranscript) || io.env.MEETS_AGENT_BROWSER_TEST_MODE === "1",
        testTranscript,
        testSpeakerName: testSpeaker
      });
      const agent2 = agentCommand ? new StdioAgent({
        command: agentCommand,
        onAction: async (action) => {
          await host2.handleAgentAction(action);
        },
        onError: (message) => io.stderr(`${message}
`)
      }) : null;
      agent2?.start();
      await host2.connect();
      const stop2 = () => {
        void host2.stop();
        agent2?.stop();
      };
      process.once("SIGINT", stop2);
      process.once("SIGTERM", stop2);
      await host2.waitForClose();
      process.removeListener("SIGINT", stop2);
      process.removeListener("SIGTERM", stop2);
      agent2?.stop();
      return;
    }
    const host = new MeetingHost({
      bootstrap,
      onEvent: (event) => {
        io.stdout(`${JSON.stringify(event)}
`);
        agent?.send(event);
      },
      onLog: (message) => io.stderr(`${message}
`),
      onSpeechRequested: async (text) => {
        await audioPipeline.synthesizeSpeech(text);
      }
    });
    const audioPipeline = new AgentAudioPipeline({
      onTranscriptFinal: (event) => {
        host.publishTranscriptFinal(event);
      },
      onSpeechReady: (result) => {
        io.stderr(
          `speech ready via ${speechConfig.ttsModel} (${speechConfig.ttsVoice}): ${result.text}
`
        );
      },
      onError: (message) => io.stderr(`${message}
`)
    });
    const agent = agentCommand ? new StdioAgent({
      command: agentCommand,
      onAction: (action) => {
        host.handleAgentAction(action);
      },
      onError: (message) => io.stderr(`${message}
`)
    }) : null;
    let testTranscriptTimer = null;
    await audioPipeline.start();
    agent?.start();
    await host.connect();
    if (testTranscript) {
      testTranscriptTimer = setTimeout(() => {
        audioPipeline.publishTranscriptFinal({
          speakerId: "test-speaker",
          displayName: testSpeaker,
          text: testTranscript
        });
      }, 250);
    }
    const stop = () => {
      if (testTranscriptTimer) {
        clearTimeout(testTranscriptTimer);
        testTranscriptTimer = null;
      }
      host.stop();
      agent?.stop();
      void audioPipeline.stop();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await host.waitForClose();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    if (testTranscriptTimer) {
      clearTimeout(testTranscriptTimer);
      testTranscriptTimer = null;
    }
    await audioPipeline.stop();
    return;
  }
  if (asBoolean(options.json)) {
    writeJson(io, bootstrap);
    return;
  }
  writeText(io, renderAgentBootstrap(bootstrap));
}
async function handleWorkspaceCommand(io, globalOptions, action, args) {
  const { options: localOptions, positionals } = parseFlags(args, {
    json: "boolean",
    help: "boolean"
  });
  const options = mergeOptions(globalOptions, localOptions);
  if (asBoolean(options.help)) {
    writeText(io, HELP_TEXT);
    return;
  }
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new CliError("No local session found. Run `mere-video auth login` first.");
  }
  if (action === "list") {
    if (positionals.length > 0) {
      throw new CliError("workspace list does not accept positional arguments.");
    }
    if (asBoolean(options.json)) {
      writeJson(io, session.workspaces);
    } else {
      writeText(
        io,
        session.workspaces.length > 0 ? session.workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available."
      );
    }
    return;
  }
  if (action === "current") {
    if (positionals.length > 0) {
      throw new CliError("workspace current does not accept positional arguments.");
    }
    const defaultWorkspace = session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null;
    const result = { current: session.workspace, defaultWorkspace };
    if (asBoolean(options.json)) {
      writeJson(io, result);
    } else {
      writeText(
        io,
        [
          `current: ${result.current ? renderWorkspaceLabel(result.current) : "none"}`,
          `default: ${result.defaultWorkspace ? renderWorkspaceLabel(result.defaultWorkspace) : "none"}`
        ].join("\n")
      );
    }
    return;
  }
  if (action === "use") {
    const selector = trimOption(positionals[0]);
    if (!selector || positionals.length !== 1) {
      throw new CliError("workspace use requires exactly one <id|slug|host>.");
    }
    const target = requireWorkspaceSelection(session.workspaces, selector);
    const refreshed = await refreshRemoteSession2(session, {
      workspace: target.id,
      fetchImpl: io.fetchImpl,
      persistDefaultWorkspace: true
    });
    await saveSession(refreshed, io.env);
    activeSession = refreshed;
    if (asBoolean(options.json)) {
      writeJson(io, refreshed);
    } else {
      writeText(io, renderSessionSummary(refreshed));
    }
    return;
  }
  throw new CliError(`Unknown workspace command: ${action ?? "(missing)"}.`);
}
async function runCli(argv, io) {
  try {
    const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
    if (normalizedArgv.includes("--version") || normalizedArgv.includes("-v")) {
      writeText(io, await cliVersion());
      return 0;
    }
    const { options: globalOptions, rest } = splitGlobalFlags(normalizedArgv);
    const [group, action, ...args] = rest;
    if (group === "completion") {
      writeText(io, completionScript(action));
      return 0;
    }
    if (group === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    activeSession = await loadSession(io.env);
    const isWorkspaceMetadataCommand = group === "workspace" && ["list", "current", "use"].includes(action ?? "");
    if (group !== "auth" && !isWorkspaceMetadataCommand && activeSession && !resolveExternalToken(globalOptions, io.env)) {
      activeSession = await ensureWorkspaceSession(activeSession, {
        workspace: asString(globalOptions.workspace) ?? io.env.MEETS_DEFAULT_WORKSPACE_ID ?? io.env.MEETS_WORKSPACE_ID ?? void 0,
        fetchImpl: io.fetchImpl
      });
      await saveSession(activeSession, io.env);
    }
    if (asBoolean(globalOptions.help) || !group || group === "help" || group === "--help") {
      writeText(io, HELP_TEXT);
      return 0;
    }
    if (group === "auth") {
      switch (action) {
        case "login": {
          const { options: localOptions, positionals } = parseFlags(args, {
            workspace: "string",
            "base-url": "string",
            json: "boolean",
            help: "boolean"
          });
          const options = mergeOptions(globalOptions, localOptions);
          if (asBoolean(options.help)) {
            writeText(io, HELP_TEXT);
            return 0;
          }
          if (positionals.length > 0) {
            throw new CliError("auth login does not accept positional arguments.");
          }
          const session = pickWorkspaceSession(
            await loginWithBrowser2({
              baseUrl: resolveBaseUrl(options, io.env),
              workspace: asString(options.workspace),
              fetchImpl: io.fetchImpl,
              notify: (message) => io.stderr(`${message}
`),
              env: io.env
            }),
            asString(options.workspace)
          );
          await saveSession(session, io.env);
          activeSession = session;
          if (asBoolean(options.json)) {
            writeJson(io, session);
          } else {
            writeText(io, renderSessionSummary(session));
          }
          return 0;
        }
        case "whoami": {
          const { options: localOptions, positionals } = parseFlags(args, {
            json: "boolean",
            help: "boolean"
          });
          const options = mergeOptions(globalOptions, localOptions);
          if (asBoolean(options.help)) {
            writeText(io, HELP_TEXT);
            return 0;
          }
          if (positionals.length > 0) {
            throw new CliError("auth whoami does not accept positional arguments.");
          }
          if (!activeSession) {
            throw new CliError("No local session found. Run `mere-video auth login` first.");
          }
          if (asBoolean(options.json)) {
            writeJson(io, activeSession);
          } else {
            writeText(io, renderSessionSummary(activeSession));
          }
          return 0;
        }
        case "logout": {
          const { options: localOptions, positionals } = parseFlags(args, {
            json: "boolean",
            help: "boolean"
          });
          const options = mergeOptions(globalOptions, localOptions);
          if (asBoolean(options.help)) {
            writeText(io, HELP_TEXT);
            return 0;
          }
          if (positionals.length > 0) {
            throw new CliError("auth logout does not accept positional arguments.");
          }
          const loggedOut = await logoutRemote({
            fetchImpl: io.fetchImpl,
            env: io.env
          });
          activeSession = null;
          if (asBoolean(options.json)) {
            writeJson(io, { loggedOut });
          } else {
            writeText(io, loggedOut ? "Logged out." : "No local session found.");
          }
          return 0;
        }
        default:
          throw new CliError(`Unknown auth command: ${action ?? "(missing)"}.`);
      }
    }
    if (group === "workspace") {
      await handleWorkspaceCommand(io, globalOptions, action, args);
      return 0;
    }
    if (group === "health") {
      await handleHealth(
        io,
        globalOptions,
        [action, ...args].filter((token) => token != null)
      );
      return 0;
    }
    if (group === "rooms") {
      switch (action) {
        case "list":
          await handleRoomList(io, globalOptions, args);
          return 0;
        case "show":
          await handleRoomShow(io, globalOptions, args);
          return 0;
        case "create":
          await handleRoomCreate(io, globalOptions, args);
          return 0;
        case "update":
          await handleRoomUpdate(io, globalOptions, args);
          return 0;
        case "archive":
          await handleRoomArchive(io, globalOptions, args);
          return 0;
        case "invite":
          await handleRoomInvite(io, globalOptions, args);
          return 0;
        default:
          throw new CliError(`Unknown rooms command: ${action ?? "(missing)"}.`);
      }
    }
    if (group === "meetings") {
      switch (action) {
        case "list":
          await handleMeetingsList(io, globalOptions, args);
          return 0;
        case "show":
          await handleMeetingsShow(io, globalOptions, args);
          return 0;
        default:
          throw new CliError(`Unknown meetings command: ${action ?? "(missing)"}.`);
      }
    }
    if (group === "participants") {
      switch (action) {
        case "list":
          await handleParticipantsList(io, globalOptions, args);
          return 0;
        default:
          throw new CliError(`Unknown participants command: ${action ?? "(missing)"}.`);
      }
    }
    if (group === "recordings") {
      await handleRecordings(io, globalOptions, action, args);
      return 0;
    }
    if (group === "transcripts") {
      await handleTranscripts(io, globalOptions, action, args);
      return 0;
    }
    if (group === "access-links") {
      await handleAccessLinks(io, globalOptions, action, args);
      return 0;
    }
    if (group === "diagnostics") {
      await handleDiagnostics(io, globalOptions, action, args);
      return 0;
    }
    if (group === "agent") {
      switch (action) {
        case "voice-config":
          await handleAgentVoiceConfig(io, globalOptions, args);
          return 0;
        case "join":
          await handleAgentJoin(io, globalOptions, args);
          return 0;
        default:
          throw new CliError(`Unknown agent command: ${action ?? "(missing)"}.`);
      }
    }
    throw new CliError(`Unknown command: ${group}.`);
  } catch (error) {
    const message = error instanceof CliError ? error.message : error instanceof Error ? error.message : "Unknown CLI failure.";
    io.stderr(`${message}
`);
    return error instanceof CliError ? error.exitCode : 1;
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
