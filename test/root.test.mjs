import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCli } from '../dist/root.js';
import { redactArgv, redactOutput } from '../dist/audit.js';

async function writeFakeProjectsCli(fake) {
  await mkdir(path.dirname(fake), { recursive: true });
  await writeFile(
    fake,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'commands') {
  console.log(JSON.stringify({
    schemaVersion: 1,
    app: 'mere-projects',
    namespace: 'projects',
    aliases: ['mere-projects'],
    auth: { kind: 'browser' },
    baseUrlEnv: ['PROJECTS_BASE_URL'],
    sessionPath: null,
    globalFlags: ['workspace', 'json', 'yes', 'confirm'],
    commands: [
      { id: 'project.list', path: ['project', 'list'], summary: 'List projects.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'project.delete', path: ['project', 'delete'], summary: 'Delete project.', auth: 'workspace', risk: 'destructive', supportsJson: true, supportsData: false, requiresYes: true, requiresConfirm: true, positionals: [], flags: [] },
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'session', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'completion', path: ['completion'], summary: 'Completion.', auth: 'none', risk: 'read', supportsJson: false, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] }
    ]
  }));
  process.exit(0);
}
if (args[0] === '--version') {
  console.log('fake-projects');
  process.exit(0);
}
if (args[0] === 'completion') {
  console.log('complete');
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'whoami') {
  console.log(JSON.stringify({ args, accessToken: 'eyJabc.def.ghi', refreshToken: 'zcli_refresh_secret' }));
  process.exit(0);
}
console.log(JSON.stringify({ args, marker: process.env.FAKE_CLI_MARKER ?? null }));
`,
    'utf8',
  );
}

async function fakeMereRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-test-'));
  const projects = path.join(root, 'projects');
  const fake = path.join(projects, 'dist', 'run.js');
  await writeFakeProjectsCli(fake);
  const finance = path.join(root, 'finance', 'packages', 'cli', 'dist', 'cli', 'bin');
  await mkdir(finance, { recursive: true });
  await writeFile(
    path.join(finance, 'merefi.js'),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'commands') {
  console.log(JSON.stringify({
    schemaVersion: 1,
    app: 'merefi',
    namespace: 'finance',
    aliases: ['merefi'],
    auth: { kind: 'token' },
    baseUrlEnv: ['FINANCE_BASE_URL'],
    sessionPath: '~/.config/merefi/config.json',
    globalFlags: ['profile', 'base-url', 'json'],
    commands: [
      { id: 'auth.login', path: ['auth', 'login'], summary: 'Login.', auth: 'none', risk: 'write', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['workspace'] },
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'token', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'auth.logout', path: ['auth', 'logout'], summary: 'Logout.', auth: 'token', risk: 'write', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] },
      { id: 'completion', path: ['completion'], summary: 'Completion.', auth: 'none', risk: 'read', supportsJson: false, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] }
    ]
  }));
  process.exit(0);
}
if (args[0] === '--version') {
  console.log('fake-finance');
  process.exit(0);
}
console.log(JSON.stringify({ args }));
`,
    'utf8',
  );
  return root;
}

async function fakePackageRoot() {
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-package-'));
  await writeFakeProjectsCli(path.join(packageRoot, 'adapters', 'projects', 'run.js'));
  return packageRoot;
}

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

test('renders help and completion', async () => {
  const help = await run(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Agent first run:/);
  assert.match(help.stdout, /mere help agent/);
  const agentHelp = await run(['help', 'agent']);
  assert.equal(agentHelp.code, 0);
  assert.match(agentHelp.stdout, /mere agent guide/);
  assert.match(agentHelp.stdout, /Operating loop:/);
  const completion = await run(['completion', 'bash']);
  assert.equal(completion.code, 0);
  assert.match(completion.stdout, /complete -F _mere_completion mere/);
  assert.match(completion.stdout, /agent/);
});

test('lists apps from the registry', async () => {
  const root = await fakeMereRoot();
  const result = await run(['apps', 'list', '--json'], { MERE_ROOT: root, MERE_CLI_SOURCE: 'local' });
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.apps.some((app) => app.app === 'projects' && app.exists === true && app.source === 'local'));
});

test('resolves bundled adapters before local CLIs by default', async () => {
  const root = await fakeMereRoot();
  const packageRoot = await fakePackageRoot();
  const result = await run(['apps', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  const projects = payload.apps.find((app) => app.app === 'projects');
  assert.equal(projects.source, 'bundled');
  assert.equal(projects.exists, true);
});

test('env overrides beat bundled adapters', async () => {
  const root = await fakeMereRoot();
  const packageRoot = await fakePackageRoot();
  const envRoot = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-env-'));
  const override = path.join(envRoot, 'override.js');
  await writeFakeProjectsCli(override);
  const listed = await run(['apps', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
    MERE_PROJECTS_CLI: override,
  });
  assert.equal(listed.code, 0, listed.stderr);
  const projects = JSON.parse(listed.stdout).apps.find((app) => app.app === 'projects');
  assert.equal(projects.source, 'env');
  assert.equal(projects.cli, override);

  const result = await run(['projects', 'project', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
    MERE_PROJECTS_CLI: override,
    FAKE_CLI_MARKER: 'env-override',
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.marker, 'env-override');
});

test('MERE_CLI_SOURCE can force bundled or local resolution', async () => {
  const root = await fakeMereRoot();
  const packageRoot = await fakePackageRoot();
  const bundled = await run(['apps', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
    MERE_CLI_SOURCE: 'bundled',
  });
  assert.equal(bundled.code, 0, bundled.stderr);
  assert.equal(JSON.parse(bundled.stdout).apps.find((app) => app.app === 'projects').source, 'bundled');

  const local = await run(['apps', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
    MERE_CLI_SOURCE: 'local',
  });
  assert.equal(local.code, 0, local.stderr);
  assert.equal(JSON.parse(local.stdout).apps.find((app) => app.app === 'projects').source, 'local');
});

test('missing forced bundled adapters return actionable errors', async () => {
  const root = await fakeMereRoot();
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-empty-package-'));
  const result = await run(['projects', 'project', 'list', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_PACKAGE_ROOT: packageRoot,
    MERE_CLI_SOURCE: 'bundled',
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Projects CLI not found/);
  assert.match(result.stderr, /mere setup build --app projects/);
});

test('delegates supported pass-through flags only', async () => {
  const root = await fakeMereRoot();
  const result = await run(['projects', 'project', 'list', '--json', '--workspace', 'ws_1', '--data', '{"ignored":true}'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.args, ['project', 'list', '--json', '--workspace', 'ws_1']);
});

test('workspace snapshot runs read-only audit defaults for a workspace', async () => {
  const root = await fakeMereRoot();
  const result = await run(['ops', 'workspace-snapshot', '--app', 'projects', '--workspace', 'ws_1', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.workspace, 'ws_1');
  assert.equal(payload.apps.length, 1);
  assert.equal(payload.apps[0].app, 'projects');
  assert.deepEqual(
    payload.apps[0].commands.map((command) => command.command.join(' ')),
    ['project list', 'auth whoami'],
  );
  for (const command of payload.apps[0].commands) {
    const commandPayload = JSON.parse(command.stdout);
    if (command.command.join(' ') === 'auth whoami') {
      assert.equal(commandPayload.accessToken, '<redacted>');
      assert.equal(commandPayload.refreshToken, '<redacted>');
    }
    assert.ok(commandPayload.args.includes('--workspace'));
    assert.ok(commandPayload.args.includes('ws_1'));
  }
});

test('agent bootstrap writes a secret-free context pack', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-agent-home-'));
  const output = path.join(home, 'agent-pack');
  const result = await run(['agent', 'bootstrap', '--app', 'projects', '--workspace', 'ws_1', '--target', 'codex', '--output', output, '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.target, 'codex');
  assert.equal(payload.workspace, 'ws_1');
  assert.equal(payload.outputDir, output);
  assert.equal(payload.files['AGENT.md'], path.join(output, 'AGENT.md'));

  const agent = await readFile(path.join(output, 'AGENT.md'), 'utf8');
  assert.match(agent, /Mere Agent Context/);
  assert.match(agent, /mere mcp serve/);

  const manifest = JSON.parse(await readFile(path.join(output, 'apps-manifest.json'), 'utf8'));
  assert.equal(manifest.apps[0].namespace, 'projects');

  const snapshot = await readFile(path.join(output, 'workspace-snapshot.json'), 'utf8');
  assert.match(snapshot, /<redacted>/);
  assert.doesNotMatch(snapshot, /zcli_refresh_secret/);

  const commandReference = await readFile(path.join(output, 'command-reference.md'), 'utf8');
  assert.match(commandReference, /project list/);
  assert.match(commandReference, /--confirm/);
});

test('finance auth login delegates when explicitly selected', async () => {
  const root = await fakeMereRoot();
  const result = await run(['auth', 'login', '--app', 'finance', '--profile', 'books', '--base-url', 'https://finance.test', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.results[0].app, 'finance');
  assert.equal(payload.results[0].ok, true);
  const stdout = JSON.parse(payload.results[0].stdout);
  assert.deepEqual(stdout.args, ['auth', 'login', '--base-url', 'https://finance.test', '--profile', 'books', '--json']);
});

test('finance profile wrappers read and update local config', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-finance-home-'));
  const env = { MERE_ROOT: root, HOME: home };

  const created = await run(['finance', 'profiles', 'use', 'books', '--base-url', 'https://finance.test', '--json'], env);
  assert.equal(created.code, 0, created.stderr);
  assert.equal(JSON.parse(created.stdout).currentProfile, 'books');

  const listed = await run(['finance', 'profiles', 'list', '--json'], env);
  assert.equal(listed.code, 0, listed.stderr);
  const payload = JSON.parse(listed.stdout);
  assert.equal(payload.currentProfile, 'books');
  assert.deepEqual(payload.profiles.map((profile) => profile.name), ['books', 'default']);
  assert.equal(payload.profiles[0].hasToken, false);
});

test('finance profile wrappers require a tenant base URL for new profiles', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-finance-missing-base-'));
  const result = await run(['finance', 'profiles', 'use', 'books', '--json'], { MERE_ROOT: root, HOME: home });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /needs a tenant base URL/);
  assert.doesNotMatch(result.stderr, /at runFinanceProfiles/);
});

test('finance auth status summarizes token profile state', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-finance-status-'));
  const configDir = path.join(home, '.config', 'merefi');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    path.join(configDir, 'config.json'),
    JSON.stringify({
      currentProfile: 'books',
      profiles: {
        default: { baseUrl: 'https://default.finance.test' },
        books: { baseUrl: 'https://finance.test', token: 'secret-token' },
      },
    }),
  );
  const result = await run(['auth', 'status', '--app', 'finance', '--profile', 'books', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  const status = payload.results[0];
  assert.equal(status.app, 'finance');
  assert.equal(status.selectedProfile.name, 'books');
  assert.equal(status.selectedProfile.hasToken, true);
  assert.equal(status.whoami.ok, true);
});

test('writes redacted audit entries', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-home-'));
  const result = await run(['projects', 'project', 'list', '--json', '--token', 'secret'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0);
  const audit = await readFile(path.join(home, '.local', 'state', 'mere', 'audit.ndjson'), 'utf8');
  assert.match(audit, /project/);
  assert.doesNotMatch(audit, /secret/);
});

test('redacts secret flag values', () => {
  assert.deepEqual(redactArgv(['--token', 'abc', '--name', 'ok', '--api-key=xyz']), [
    '--token',
    '<redacted>',
    '--name',
    'ok',
    '--api-key=<redacted>',
  ]);
  assert.equal(
    redactOutput(JSON.stringify({ accessToken: 'secret', nested: { refreshToken: 'secret' } })),
    JSON.stringify({ accessToken: '<redacted>', nested: { refreshToken: '<redacted>' } }, null, 2),
  );
});
