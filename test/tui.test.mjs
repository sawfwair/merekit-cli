import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { test } from 'node:test';
import { runFirstUseTui } from '../dist/tui.js';

function ttyInput(answers) {
  const input = new PassThrough();
  input.isTTY = true;
  answers.forEach((answer, index) => {
    setTimeout(() => {
      input.write(`${answer}\n`);
    }, 10 * (index + 1));
  });
  setTimeout(() => {
    input.end();
  }, 10 * (answers.length + 2));
  return input;
}

function quietOutput() {
  return new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
}

async function withInteractiveStdout(callback) {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  try {
    return await callback();
  } finally {
    if (descriptor) Object.defineProperty(process.stdout, 'isTTY', descriptor);
    else delete process.stdout.isTTY;
  }
}

async function runInteractiveTui({ answers, entries = [{ key: 'finance' }, { key: 'projects' }], flags = {}, runCommand }) {
  let stdout = '';
  let stderr = '';
  const commands = [];
  const code = await withInteractiveStdout(async () =>
    await runFirstUseTui({
      io: {
        env: { NO_COLOR: '1' },
        stdin: ttyInput(answers),
        promptOutput: quietOutput(),
        stdout: (text) => {
          stdout += text;
        },
        stderr: (text) => {
          stderr += text;
        },
      },
      entries,
      flags,
      runCommand: async (args) => {
        commands.push(args);
        return await runCommand(args);
      },
    }),
  );
  return { code, stdout, stderr, commands };
}

test('tui waitlist failures surface command output and preserve exit code', async () => {
  let stdout = '';
  let stderr = '';
  const code = await runFirstUseTui({
    io: {
      env: { NO_COLOR: '1' },
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
    },
    entries: [],
    flags: { 'waitlist-email': 'person@example.com' },
    runCommand: async () => ({
      code: 42,
      stdout: 'waitlist unavailable\n',
      stderr: 'service unavailable\n',
    }),
  });

  assert.equal(code, 42);
  assert.match(stdout, /Opening waitlist/);
  assert.match(stdout, /waitlist unavailable/);
  assert.match(stderr, /service unavailable/);
  assert.match(stderr, /Waitlist handoff failed with exit code 42/);
});

test('tui invite flow redeems an invite and runs a workspace readiness report', async () => {
  const result = await runInteractiveTui({
    answers: [
      'INVITE-1',
      'Acme Labs',
      'acme',
      'existing',
      'acme.example',
      'https://acme.example',
      '2',
      'claude',
      '/tmp/mere-pack',
      'ops',
      'https://finance.example',
    ],
    runCommand: async (args) => {
      if (args[0] === 'business') {
        return {
          code: 0,
          stdout: JSON.stringify({
            state: 'ready',
            workspace: { id: 'ws_123', slug: 'acme', host: 'acme.example' },
            nextUrl: 'https://business.example/onboard',
          }),
          stderr: '',
        };
      }
      return {
        code: 0,
        stdout: JSON.stringify({
          readinessScore: 92,
          workspace: 'ws_123',
          apps: [{ app: 'finance', status: 'ready', readinessScore: 94 }],
          remediation: [],
          outputDir: '/tmp/mere-pack',
        }),
        stderr: '',
      };
    },
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(result.commands, [
    [
      'business',
      'onboard',
      'start',
      'INVITE-1',
      '--name',
      'Acme Labs',
      '--slug',
      'acme',
      '--business-mode',
      'existing',
      '--base-domain',
      'acme.example',
      '--existing-website-url',
      'https://acme.example',
      '--json',
    ],
    [
      'onboard',
      '--app',
      'finance',
      '--workspace',
      'ws_123',
      '--target',
      'claude',
      '--output',
      '/tmp/mere-pack',
      '--finance-profile',
      'ops',
      '--finance-base-url',
      'https://finance.example',
      '--json',
    ],
  ]);
  assert.match(result.stdout, /Invite Redeemed/);
  assert.match(result.stdout, /Ready \(92\/100\)/);
  assert.match(result.stdout, /finance\s+ready\s+94\/100/);
});

test('tui interactive email handoff uses the waitlist path', async () => {
  const result = await runInteractiveTui({
    answers: ['person@example.com'],
    runCommand: async () => ({
      code: 0,
      stdout: 'opened\n',
      stderr: '',
    }),
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(result.commands, [['business', 'waitlist', 'join', '--email', 'person@example.com']]);
  assert.match(result.stdout, /opened/);
});

test('tui operator workspace flow passes through non-json onboarding output', async () => {
  const result = await runInteractiveTui({
    answers: ['ws_777', '3', '', ''],
    runCommand: async () => ({
      code: 0,
      stdout: 'plain onboarding report\n',
      stderr: '',
    }),
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(result.commands, [['onboard', '--app', 'projects', '--workspace', 'ws_777', '--target', 'codex', '--json']]);
  assert.match(result.stdout, /plain onboarding report/);
});

test('tui stops when invite onboarding fails', async () => {
  const result = await runInteractiveTui({
    answers: ['INVITE-FAIL', '', '', '', '', '3', '', ''],
    runCommand: async () => ({
      code: 5,
      stdout: 'invite partial\n',
      stderr: 'invite failed\n',
    }),
  });

  assert.equal(result.code, 5);
  assert.equal(result.commands.length, 1);
  assert.match(result.stderr, /invite failed/);
  assert.match(result.stderr, /Invite onboarding failed with exit code 5/);
  assert.match(result.stdout, /invite partial/);
});

test('tui stops when onboarding fails after workspace selection', async () => {
  const result = await runInteractiveTui({
    answers: ['ws_999', '3', '', ''],
    runCommand: async () => ({
      code: 9,
      stdout: 'readiness partial\n',
      stderr: 'readiness failed\n',
    }),
  });

  assert.equal(result.code, 9);
  assert.deepEqual(result.commands, [['onboard', '--app', 'projects', '--workspace', 'ws_999', '--target', 'codex', '--json']]);
  assert.match(result.stderr, /readiness failed/);
  assert.match(result.stderr, /Onboarding failed with exit code 9/);
  assert.match(result.stdout, /readiness partial/);
});
