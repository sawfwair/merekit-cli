import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootCli = path.join(repoRoot, 'dist', 'run.js');

function sessionPayload(requestId) {
  const now = Math.floor(Date.now() / 1000);
  const displayName = requestId === 'large' ? 'L'.repeat(4_000_000) : 'S';
  return {
    refreshToken: `fake-refresh-${requestId}`,
    accessToken: `fake-access-${requestId}`,
    workspace: {
      id: 'ws_atomic',
      slug: 'atomic',
      name: 'Atomic Test',
      host: 'atomic.example.test',
      role: 'owner',
    },
    workspaces: [
      {
        id: 'ws_atomic',
        slug: 'atomic',
        name: 'Atomic Test',
        host: 'atomic.example.test',
        role: 'owner',
      },
    ],
    user: {
      userId: 'user_atomic',
      primaryEmail: 'owner@example.test',
      emailVerified: true,
      displayName,
      email: 'owner@example.test',
      orgId: 'ws_atomic',
      orgRole: 'org:admin',
    },
    accessTokenClaims: {
      sub: 'user_atomic',
      email: 'owner@example.test',
      workspaceId: 'ws_atomic',
      workspaceSlug: 'atomic',
      workspaceHost: 'atomic.example.test',
      role: 'owner',
      iat: now,
      exp: now + 3_600,
      typ: 'mere-cli-access',
    },
    defaultWorkspaceId: 'ws_atomic',
    expiresAt: new Date((now + 3_600) * 1_000).toISOString(),
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

test('bundled Business adapter atomically replaces a shared session under concurrent root CLI writes', async (t) => {
  const stateHome = await mkdtemp(path.join(os.tmpdir(), 'mere-business-bundled-race-'));
  t.after(() => rm(stateHome, { recursive: true, force: true }));

  const waiting = new Map();
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/cli/v1/auth/device/exchange') {
      response.writeHead(404).end();
      return;
    }

    const body = JSON.parse(await readBody(request));
    waiting.set(body.requestId, response);
    if (waiting.size !== 2) return;

    for (const requestId of ['large', 'small']) {
      const pending = waiting.get(requestId);
      pending.writeHead(200, { 'content-type': 'application/json' });
      pending.end(JSON.stringify(sessionPayload(requestId)));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const consoleUrl = `http://127.0.0.1:${address.port}`;
  const env = {
    ...process.env,
    HOME: stateHome,
    XDG_STATE_HOME: stateHome,
    MERE_ROOT: path.join(stateHome, 'missing-mere-root'),
    MERE_CLI_SOURCE: 'bundled',
  };
  const invoke = (requestId) =>
    execFileAsync(
      process.execPath,
      [
        rootCli,
        'business',
        'auth',
        'device',
        'poll',
        '--request-id',
        requestId,
        '--console-url',
        consoleUrl,
        '--json',
      ],
      { cwd: repoRoot, env, maxBuffer: 10 * 1024 * 1024 },
    );

  const results = await Promise.all([invoke('large'), invoke('small')]);
  for (const result of results) {
    assert.equal(result.stderr, '');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
  }

  const stateDir = path.join(stateHome, 'mere-business');
  const sessionFile = path.join(stateDir, 'session.json');
  const saved = JSON.parse(await readFile(sessionFile, 'utf8'));
  assert.ok([1, 4_000_000].includes(saved.user.displayName.length));
  assert.equal((await stat(sessionFile)).mode & 0o777, 0o600);
  assert.deepEqual((await readdir(stateDir)).filter((entry) => entry.endsWith('.tmp')), []);
});
