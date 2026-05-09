import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCli } from '../dist/root.js';

async function run(args, env = {}) {
  let stdout = '';
  let stderr = '';
  const code = await runCli(args, {
    env: { ...process.env, ...env },
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function withSkillRegistry(skillText, digest, callback) {
  let baseUrl = '';
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/index.json') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({
        $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
        schemaVersion: 1,
        generatedAt: '2026-05-09T00:00:00.000Z',
        baseUrl,
        skills: [
          {
            name: 'demo-skill',
            type: 'skill-md',
            description: 'Use this skill to exercise remote installation.',
            repo: 'demo',
            sourcePath: 'skills/demo-skill',
            url: `${baseUrl}/demo-skill/SKILL.md`,
            digest,
            files: [
              {
                path: 'SKILL.md',
                url: `${baseUrl}/demo-skill/SKILL.md`,
                digest,
                size: Buffer.byteLength(skillText),
              },
            ],
            install: {
              codex: 'mere skills install demo-skill --target codex',
              claude: 'mere skills install demo-skill --target claude',
            },
            updatedAt: '2026-05-09T00:00:00.000Z',
          },
        ],
      }));
      return;
    }
    if (url.pathname === '/demo-skill/SKILL.md') {
      response.setHeader('content-type', 'text/markdown');
      response.end(skillText);
      return;
    }
    response.statusCode = 404;
    response.end('not found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await callback(`${baseUrl}/index.json`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

test('remote skills can be listed, shown, and installed with digest verification', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-skills-remote-'));
  const skillText = `---
name: demo-skill
description: Exercise remote skill installation.
---

# Demo Skill

Use this test skill for remote install verification.
`;

  await withSkillRegistry(skillText, sha256(skillText), async (registryUrl) => {
    const env = { HOME: home, MERE_SKILLS_REGISTRY_URL: registryUrl };
    const listed = await run(['skills', 'list'], env);
    assert.equal(listed.code, 0, listed.stderr);
    assert.match(listed.stdout, /Mere skills \(1\)/);
    assert.match(listed.stdout, /demo-skill\s+demo\s+Exercise remote installation/);

    const shown = await run(['skills', 'show', 'demo-skill'], env);
    assert.equal(shown.code, 0, shown.stderr);
    assert.equal(shown.stdout, skillText);

    const installed = await run(['skills', 'install', 'demo-skill', '--target', 'codex', '--json'], env);
    assert.equal(installed.code, 0, installed.stderr);
    const payload = JSON.parse(installed.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.files, 1);

    const installedText = await readFile(path.join(home, '.codex', 'skills', 'demo-skill', 'SKILL.md'), 'utf8');
    assert.equal(installedText, skillText);
  });
});

test('remote skill install fails when a registry digest does not match', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-skills-digest-'));
  const skillText = '# Demo Skill\n';
  await withSkillRegistry(skillText, `sha256:${'0'.repeat(64)}`, async (registryUrl) => {
    const result = await run(['skills', 'install', 'demo-skill', '--target', 'codex'], {
      HOME: home,
      MERE_SKILLS_REGISTRY_URL: registryUrl,
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Digest mismatch/);
  });
});
