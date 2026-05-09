import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCli } from '../dist/root.js';
import { redactArgv, redactOutput } from '../dist/audit.js';
import { runFirstUseTui } from '../dist/tui.js';
import { createRegistry } from '../dist/registry.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
      { id: 'project.create', path: ['project', 'create'], summary: 'Create project.', auth: 'workspace', risk: 'write', supportsJson: true, supportsData: true, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] },
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

async function writeFakeSelectorCli(fake, app) {
  await mkdir(path.dirname(fake), { recursive: true });
  const commands = {
    today: [
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'session', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'tenant.resolve', path: ['tenant', 'resolve'], summary: 'Resolve tenant.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['workspace'], auditDefault: true },
    ],
    zone: [
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'session', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'store.list', path: ['store', 'list'], summary: 'List stores.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['workspace'], auditDefault: true },
      { id: 'stripe.status', path: ['stripe', 'status'], summary: 'Stripe status.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['store'], auditDefault: true },
    ],
    gives: [
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'session', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [], auditDefault: true },
      { id: 'campaigns.list', path: ['campaigns', 'list'], summary: 'List campaigns.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['tenant'], auditDefault: true },
    ],
  }[app];
  await writeFile(
    fake,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'commands') {
  console.log(JSON.stringify({
    schemaVersion: 1,
    app: 'mere-${app}',
    namespace: '${app}',
    aliases: ['${app}', 'mere-${app}'],
    auth: { kind: 'browser' },
    baseUrlEnv: [],
    sessionPath: null,
    globalFlags: ['workspace', 'json', 'tenant', 'store'],
    commands: ${JSON.stringify(commands)}
  }));
  process.exit(0);
}
if (args[0] === '--version') {
  console.log('fake-${app}');
  process.exit(0);
}
if (args[0] === 'completion') {
  console.log('complete');
  process.exit(0);
}
if (args[0] === 'tenant' && args[1] === 'resolve') {
  console.log(JSON.stringify({ tenant: { id: 'ten_1' }, args }));
  process.exit(0);
}
if (args[0] === 'store' && args[1] === 'list') {
  console.log(JSON.stringify({ current: { storeId: 'store_1' }, stores: [{ storeId: 'store_1' }], args }));
  process.exit(0);
}
console.log(JSON.stringify({ args }));
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

async function writeFakeSkill(root, repo = 'business', name = 'mere-onboarding-agent') {
  const skillDir = path.join(root, repo, 'skills', name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, 'SKILL.md'),
    `---
name: ${name}
description: Help a new Mere business owner redeem an invite and complete setup.
---

# ${name}

Use the Mere CLI to complete business onboarding.
`,
    'utf8',
  );
}

async function fakePackageRoot() {
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-package-'));
  await writeFakeProjectsCli(path.join(packageRoot, 'adapters', 'projects', 'run.js'));
  return packageRoot;
}

async function writeFakeSwift(binDir) {
  await mkdir(binDir, { recursive: true });
  const swift = path.join(binDir, 'swift');
  await writeFile(
    swift,
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const out = path.join(process.cwd(), '.build', 'release');
if (args.includes('--show-bin-path')) {
  console.log(out);
  process.exit(0);
}
if (args[0] === 'build') {
  fs.mkdirSync(out, { recursive: true });
  const bin = path.join(out, 'mere.run');
  fs.writeFileSync(bin, '#!/usr/bin/env node\\nif (process.argv.includes("--version")) { console.log("mere.run fake 1.0.0"); } else { console.log("mere.run fake help"); }\\n');
  fs.chmodSync(bin, 0o755);
  process.exit(0);
}
console.error('unexpected swift args ' + args.join(' '));
process.exit(1);
`,
    'utf8',
  );
  await chmod(swift, 0o755);
}

async function writeFakeMereRun(bin, stateFile) {
  await mkdir(path.dirname(bin), { recursive: true });
  await writeFile(
    bin,
    `#!/usr/bin/env node
const fs = require('node:fs');
const stateFile = ${JSON.stringify(stateFile)};
const args = process.argv.slice(2);
const installed = fs.existsSync(stateFile) ? new Set(JSON.parse(fs.readFileSync(stateFile, 'utf8'))) : new Set();
function save() { fs.mkdirSync(require('node:path').dirname(stateFile), { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify([...installed])); }
if (args.includes('--version')) {
  console.log('mere.run fake 1.0.0');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'list') {
  for (const id of ['speech-asr-parakeet', 'text-embed-qwen3-0.6b']) {
    console.log(id + ' text ' + (installed.has(id) ? 'installed' : 'missing') + ' —');
  }
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'pull') {
  installed.add(args[2]);
  save();
  console.log('pulled ' + args[2]);
  process.exit(0);
}
console.error('unexpected mere.run args ' + args.join(' '));
process.exit(1);
`,
    'utf8',
  );
  await chmod(bin, 0o755);
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
  assert.match(help.stdout, /Human first run:/);
  assert.match(help.stdout, /mere tui/);
  assert.match(help.stdout, /mere business waitlist join --email EMAIL/);
  assert.match(help.stdout, /Operator\/agent first run:/);
  assert.match(help.stdout, /mere help agent/);
  const agentHelp = await run(['help', 'agent']);
  assert.equal(agentHelp.code, 0);
  assert.match(agentHelp.stdout, /mere agent guide/);
  assert.match(agentHelp.stdout, /Human first-use:/);
  assert.match(agentHelp.stdout, /Operating loop:/);
  const completion = await run(['completion', 'bash']);
  assert.equal(completion.code, 0);
  assert.match(completion.stdout, /complete -F _mere_completion mere/);
  assert.match(completion.stdout, /agent/);
  assert.match(completion.stdout, /onboard/);
  assert.match(completion.stdout, /tui/);
  assert.match(completion.stdout, /--interactive/);
  assert.match(completion.stdout, /--invite-code/);
  assert.match(completion.stdout, /--waitlist-email/);
  assert.match(completion.stdout, /workspace-snapshot/);
  assert.match(completion.stdout, /finance profiles/);
  assert.match(help.stdout, /setup mere-run/);
  assert.match(completion.stdout, /mere-run/);
});

test('tui dry-run shows the onboarding command it will execute', async () => {
  const result = await run([
    'tui',
    '--dry-run',
    '--app',
    'projects',
    '--workspace',
    'ws_1',
    '--target',
    'claude',
    '--output',
    '/tmp/mere-onboarding',
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'mere onboard --app projects --workspace ws_1 --target claude --output /tmp/mere-onboarding --json');
});

test('tui dry-run opens the waitlist when an email is provided', async () => {
  const result = await run([
    'tui',
    '--dry-run',
    '--waitlist-email',
    'person@example.com',
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'mere business waitlist join --email person@example.com');
});

test('tui waitlist email flag delegates directly without prompting', async () => {
  let stdout = '';
  let stderr = '';
  const commands = [];
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
    runCommand: async (args) => {
      commands.push(args);
      return { code: 0, stdout: 'opened\n', stderr: '' };
    },
  });
  assert.equal(code, 0, stderr);
  assert.deepEqual(commands, [['business', 'waitlist', 'join', '--email', 'person@example.com']]);
  assert.match(stdout, /Opening waitlist/);
  assert.match(stdout, /opened/);
});

test('tui dry-run starts from an invite code when provided', async () => {
  const result = await run([
    'tui',
    '--dry-run',
    '--invite-code',
    'zcli_code_123',
    '--name',
    'Acme Plumbing',
    '--slug',
    'acme',
    '--business-mode',
    'existing',
    '--existing-website-url',
    'https://acme.example',
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    [
      'mere business onboard start zcli_code_123 --name "Acme Plumbing" --slug acme --business-mode existing --existing-website-url https://acme.example --json',
      'mere onboard --target codex --json',
    ].join('\n'),
  );
});

test('tui explains non-interactive terminal requirements', async () => {
  const result = await run(['tui']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /requires an interactive terminal/);
  assert.match(result.stderr, /mere business waitlist join --email EMAIL/);
  assert.match(result.stderr, /mere business onboard start INVITE_CODE --json/);
  assert.match(result.stderr, /mere onboard --workspace WORKSPACE_ID --json/);
});

test('onboard invite-code without interactive points to the bootstrap path', async () => {
  const result = await run(['onboard', '--invite-code', 'zcli_code_123', '--json']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invite codes require the TUI/);
  assert.match(result.stderr, /mere business onboard start INVITE_CODE --json/);
});

test('discovers local skills for registry publishing', async () => {
  const root = await fakeMereRoot();
  await writeFakeSkill(root);
  await writeFakeSkill(root, 'business', 'zerosmb-cli');
  await writeFakeSkill(root, 'works', 'works-cli');
  const result = await run(['skills', 'list', '--local', '--json'], { MERE_ROOT: root });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  const skill = payload.skills.find((entry) => entry.name === 'mere-onboarding-agent');
  assert.ok(skill);
  assert.equal(skill.repo, 'business');
  assert.match(skill.url, /https:\/\/merekit\.com\/skills\/mere-onboarding-agent\/SKILL\.md/);
  assert.equal(skill.files.length, 1);
  assert.match(skill.digest, /^sha256:/);
  assert.equal(payload.skills.some((entry) => entry.name === 'zerosmb-cli'), false);
  const worksSkill = payload.skills.find((entry) => entry.name === 'works-cli');
  assert.ok(worksSkill);
  assert.equal(worksSkill.repo, 'works');
});

test('renders a readable skills list for humans', async () => {
  const root = await fakeMereRoot();
  await writeFakeSkill(root);
  const result = await run(['skills', 'list', '--local'], { MERE_ROOT: root, COLUMNS: '86' });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Mere skills local preview \(1\)/);
  assert.match(result.stdout, /Name\s+Repo\s+Summary/);
  assert.match(result.stdout, /mere-onboarding-agent\s+business\s+Help a new Mere business owner/);
  assert.match(result.stdout, /mere skills show NAME/);
  assert.doesNotMatch(result.stdout, /\t/);
});

test('lists apps from the registry', async () => {
  const root = await fakeMereRoot();
  const result = await run(['apps', 'list', '--json'], { MERE_ROOT: root, MERE_CLI_SOURCE: 'local' });
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  const registryKeys = createRegistry(root).map((entry) => entry.key);
  assert.deepEqual(payload.apps.map((app) => app.app), registryKeys);
  assert.equal(payload.apps.length, registryKeys.length);
  assert.ok(payload.apps.some((app) => app.app === 'projects' && app.exists === true && app.source === 'local'));
  assert.ok(payload.apps.some((app) => app.app === 'works' && app.auth === 'browser'));
});

test('adapter registry is covered by bundle metadata and docs', async () => {
  const registryKeys = createRegistry(path.resolve(repoRoot, '..'), repoRoot).map((entry) => entry.key);
  assert.ok(registryKeys.length >= 1);

  const bundledManifest = JSON.parse(await readFile(path.join(repoRoot, 'adapters', 'manifest.json'), 'utf8'));
  assert.deepEqual(bundledManifest.adapters.map((adapter) => adapter.app), registryKeys);

  const readme = await readFile(path.join(repoRoot, 'README.md'), 'utf8');
  const commandsDoc = await readFile(path.join(repoRoot, 'docs', 'commands.md'), 'utf8');
  const installDoc = await readFile(path.join(repoRoot, 'docs', 'onboarding', 'install.md'), 'utf8');
  const adaptersReadme = await readFile(path.join(repoRoot, 'adapters', 'README.md'), 'utf8');

  for (const key of registryKeys) {
    assert.match(readme, new RegExp(`\\| \`${key}\` \\|`));
    assert.match(commandsDoc, new RegExp(`\\| \`${key}\` \\| \\d+ \\|`));
    assert.match(adaptersReadme, new RegExp(`- \`${key}\``));
  }
  for (const doc of [readme, commandsDoc, installDoc, adaptersReadme]) {
    assert.match(doc, /mere\.run/);
    assert.match(doc, /~\/mere\/run-public/);
    assert.match(doc, /mere setup mere-run/);
    assert.match(doc, /mere setup mere-run models --app media/);
  }
  for (const doc of [readme, commandsDoc, installDoc, adaptersReadme]) {
    assert.match(doc, /https:\/\/mere\.run\/releases\/mere-run\.dmg/);
  }
});

test('setup mere-run installs from local run-public source', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-mere-run-home-'));
  const sourceDir = path.join(home, 'run-public');
  const fakeBin = path.join(home, 'bin');
  const installBin = path.join(home, '.local', 'bin', 'mere.run');
  await mkdir(sourceDir, { recursive: true });
  await writeFile(path.join(sourceDir, 'Package.swift'), '// fake package\n', 'utf8');
  await writeFakeSwift(fakeBin);

  const result = await run(['setup', 'mere-run', '--source-dir', sourceDir, '--install-bin', installBin, '--force', '--json'], {
    HOME: home,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.installed, true);
  assert.equal(payload.source, 'source');
  assert.equal(payload.bin, installBin);
  assert.equal(payload.version, 'mere.run fake 1.0.0');
  assert.ok(payload.steps.some((step) => step.action === 'swift build' && step.ok === true));
});

test('setup mere-run models pulls app-requested media models', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-mere-run-models-'));
  const bin = path.join(home, 'bin', 'mere.run');
  const stateFile = path.join(home, 'state', 'models.json');
  await writeFakeMereRun(bin, stateFile);

  const result = await run(['setup', 'mere-run', 'models', '--app', 'media', '--bin', bin, '--json'], {
    HOME: home,
    PATH: `${path.dirname(bin)}${path.delimiter}${process.env.PATH ?? ''}`,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(
    payload.models.map((model) => [model.id, model.status]),
    [
      ['speech-asr-parakeet', 'installed'],
      ['text-embed-qwen3-0.6b', 'installed'],
    ],
  );
  assert.deepEqual(payload.pulls.map((pull) => pull.id), ['speech-asr-parakeet', 'text-embed-qwen3-0.6b']);
  assert.equal(payload.missing.length, 0);
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
  assert.deepEqual(payload.apps[0].coverage, {
    readCommands: 3,
    auditDefaultCommands: 2,
    executedCommands: 2,
    skippedReadCommands: [{ command: ['completion'], reason: 'Not marked auditDefault in the app manifest.' }],
  });
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

test('workspace snapshot includes selector hints for inferred selectors', async () => {
  const root = await fakeMereRoot();
  const todayCli = path.join(root, 'fake-today.js');
  const zoneCli = path.join(root, 'fake-zone.js');
  const givesCli = path.join(root, 'fake-gives.js');
  await writeFakeSelectorCli(todayCli, 'today');
  await writeFakeSelectorCli(zoneCli, 'zone');
  await writeFakeSelectorCli(givesCli, 'gives');

  const today = await run(['ops', 'workspace-snapshot', '--app', 'today', '--workspace', 'ws_1', '--json'], { MERE_ROOT: root, MERE_TODAY_CLI: todayCli });
  assert.equal(today.code, 0, today.stderr);
  assert.equal(JSON.parse(today.stdout).apps[0].selectorHints.inferredTenants[0].value, 'ten_1');

  const zone = await run(['ops', 'workspace-snapshot', '--app', 'zone', '--workspace', 'ws_1', '--json'], { MERE_ROOT: root, MERE_ZONE_CLI: zoneCli });
  assert.equal(zone.code, 0, zone.stderr);
  assert.equal(JSON.parse(zone.stdout).apps[0].selectorHints.inferredStores[0].value, 'store_1');

  const gives = await run(['ops', 'workspace-snapshot', '--app', 'gives', '--workspace', 'ws_1', '--json'], { MERE_ROOT: root, MERE_GIVES_CLI: givesCli });
  assert.equal(gives.code, 0, gives.stderr);
  assert.equal(JSON.parse(gives.stdout).apps[0].selectorHints.inferredTenants[0].value, 'ws_1');
});

test('onboard writes readiness report and onboarding artifacts', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-onboard-home-'));
  const output = path.join(home, 'onboard-pack');
  const result = await run(['onboard', '--app', 'projects', '--workspace', 'ws_1', '--target', 'codex', '--output', output, '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.workspace, 'ws_1');
  assert.equal(payload.outputDir, output);
  assert.equal(payload.artifacts.bootstrap, path.join(output, 'bootstrap.json'));
  assert.equal(payload.artifacts.onboardingReport, path.join(output, 'onboarding-report.json'));
  assert.equal(payload.artifacts.onboardingMarkdown, path.join(output, 'ONBOARDING.md'));
  assert.equal(payload.apps[0].app, 'projects');
  assert.equal(payload.apps[0].status, 'ready');
  assert.equal(payload.apps[0].readinessScore, 100);
  assert.ok(payload.apps[0].safeFirstCommands.some((command) => command.includes('mere projects project list')));
  assert.match(await readFile(path.join(output, 'ONBOARDING.md'), 'utf8'), /mere skills install mere-onboarding-agent --target codex/);
});

test('onboard reports missing workspace without crashing', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-onboard-missing-workspace-'));
  const result = await run(['onboard', '--app', 'projects', '--output', path.join(home, 'pack'), '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.apps[0].status, 'blocked');
  assert.ok(payload.remediation.some((item) => item.id === 'projects.workspace' && item.nextCommand === 'mere onboard --workspace WORKSPACE_ID --json'));
});

test('onboard reports missing adapter with setup remediation', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-onboard-missing-adapter-'));
  const result = await run(['onboard', '--app', 'business', '--workspace', 'ws_1', '--output', path.join(home, 'pack'), '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.apps[0].status, 'blocked');
  assert.ok(payload.remediation.some((item) => item.id === 'business.adapter' && item.nextCommand === 'mere setup build --app business'));
});

test('onboard recommends finance login with placeholder and concrete base URLs', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-onboard-finance-'));
  const placeholder = await run(['onboard', '--app', 'finance', '--workspace', 'ws_1', '--output', path.join(home, 'placeholder'), '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(placeholder.code, 0, placeholder.stderr);
  assert.ok(JSON.parse(placeholder.stdout).remediation.some((item) => item.nextCommand === 'mere finance profiles login default --base-url https://<tenant>.mere.finance --json'));

  const concrete = await run(['onboard', '--app', 'finance', '--workspace', 'ws_1', '--finance-profile', 'books', '--finance-base-url', 'https://finance.test', '--output', path.join(home, 'concrete'), '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(concrete.code, 0, concrete.stderr);
  assert.ok(JSON.parse(concrete.stdout).remediation.some((item) => item.nextCommand === 'mere finance profiles login books --base-url https://finance.test --json'));
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

  const context = JSON.parse(await readFile(path.join(output, 'context.json'), 'utf8'));
  assert.equal(context.state.defaultWorkspace, 'ws_1');
  assert.match(context.paths.configDir, /mere/);

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

test('finance profile login stores profile and delegates auth login', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-finance-login-'));
  const result = await run(['finance', 'profiles', 'login', 'books', '--base-url', 'https://finance.test', '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.currentProfile, 'books');
  assert.equal(payload.baseUrl, 'https://finance.test');
  assert.deepEqual(payload.stdout.args, ['auth', 'login', '--base-url', 'https://finance.test', '--profile', 'books', '--json']);
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

test('redacts structured data payloads in audit entries', async () => {
  const root = await fakeMereRoot();
  const home = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-home-'));
  const data = JSON.stringify({
    name: 'safe project',
    apiKey: 'super-sensitive-key',
    nested: { token: 'nested-token-value' },
  });
  const result = await run(['projects', 'project', 'create', '--data', data, '--json'], {
    MERE_ROOT: root,
    MERE_CLI_SOURCE: 'local',
    HOME: home,
  });
  assert.equal(result.code, 0);
  const audit = await readFile(path.join(home, '.local', 'state', 'mere', 'audit.ndjson'), 'utf8');
  assert.match(audit, /safe project/);
  assert.match(audit, /<redacted>/);
  assert.doesNotMatch(audit, /super-sensitive-key|nested-token-value/);
});

test('redacts secret flag values', () => {
  assert.deepEqual(redactArgv(['--token', 'abc', '--name', 'ok', '--api-key=xyz']), [
    '--token',
    '<redacted>',
    '--name',
    'ok',
    '--api-key=<redacted>',
  ]);
  assert.deepEqual(redactArgv(['--data', '{"name":"ok","apiKey":"abc","nested":{"token":"def"}}']), [
    '--data',
    '{"name":"ok","apiKey":"<redacted>","nested":{"token":"<redacted>"}}',
  ]);
  assert.deepEqual(redactArgv(['--data={"password":"pw","name":"inline"}', '--data', 'not-json']), [
    '--data={"password":"<redacted>","name":"inline"}',
    '--data',
    '<redacted>',
  ]);
  assert.equal(
    redactOutput(JSON.stringify({ accessToken: 'secret', nested: { refreshToken: 'secret' } })),
    JSON.stringify({ accessToken: '<redacted>', nested: { refreshToken: '<redacted>' } }, null, 2),
  );
});
