import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCli } from '../dist/root.js';

test('real Business adapter honors root context and never prints workspace-use credentials', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mere-business-context-'));
  let baseUrl;
  const memberships = ['one', 'two'].map((slug) => ({ id: `ws_${slug}`, slug, name: slug, role: 'admin', host: '' }));
  const session = (id) => ({
    version: 1, accessToken: `access-secret-${id}`, refreshToken: 'refresh-secret',
    user: { userId: 'user', email: 'test@example.com', primaryEmail: 'test@example.com', emailVerified: true, displayName: 'Test', orgId: null, orgRole: null },
    workspace: memberships.find((entry) => entry.id === id), workspaces: memberships,
    defaultWorkspaceId: 'ws_one', baseUrl,
    accessTokenClaims: { sub: 'user', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), workspaceId: id, typ: 'mere-cli-access' },
    expiresAt: new Date(Date.now() + 3600000).toISOString(), lastRefreshAt: new Date().toISOString()
  });
  const server = createServer(async (request, response) => {
    let text = ''; for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : {};
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/cli/v1/auth/refresh') {
      response.end(JSON.stringify(session(body.workspace ?? 'ws_one')));
    } else if (body.op === 'onboarding.snapshot') {
      response.end(JSON.stringify({ ok: true, data: { workspaceId: request.headers.authorization?.replace('Bearer access-secret-', '') } }));
    } else {
      response.statusCode = 400; response.end(JSON.stringify({ error: 'Unexpected test request' }));
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const membership of memberships) membership.host = baseUrl;
  const stateDir = path.join(root, 'state');
  const sessionDir = path.join(stateDir, 'mere-business');
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(sessionDir, 'session.json'), JSON.stringify(session('ws_one')), { mode: 0o600 });
  const env = { ...process.env, XDG_CONFIG_HOME: path.join(root, 'config'), XDG_STATE_HOME: stateDir, MERE_CLI_SOURCE: 'bundled', MERE_BUSINESS_CLI: process.env.MERE_TEST_BUSINESS_CLI ?? '', MERE_BUSINESS_BASE_URL: baseUrl };
  const run = async (args) => {
    let stdout = ''; let stderr = '';
    const code = await runCli(args, { env, stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } });
    assert.equal(code, 0, stderr);
    assert.doesNotMatch(stdout + stderr, /access-secret|refresh-secret|accessToken|refreshToken/);
    return JSON.parse(stdout);
  };
  try {
    await run(['context', 'set-workspace', '--workspace', 'ws_two', '--json']);
    const inherited = await run(['business', 'onboard', 'snapshot', '--json']);
    assert.equal((inherited.data ?? inherited).workspaceId, 'ws_two');
    const explicit = await run(['business', 'onboard', 'snapshot', '--workspace', 'ws_one', '--json']);
    assert.equal((explicit.data ?? explicit).workspaceId, 'ws_one');
    await run(['business', 'workspace', 'use', 'ws_two', '--json']);
    // Test candidate adapter output too when validating a Business source change.
    if (process.env.MERE_TEST_BUSINESS_CLI) {
      await run(['business', 'workspace', 'use', 'ws_one', '--json']);
      const current = await run(['business', 'workspace', 'current', '--json']);
      assert.equal((current.data ?? current).current.id, 'ws_two');
    }
  } finally {
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
