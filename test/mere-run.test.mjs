import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  appMereRunModelRequests,
  defaultMereRunInstallBin,
  defaultMereRunSourceDir,
  inspectMereRun,
  inspectMereRunModels,
  pullMereRunModels,
  setupMereRun,
} from '../dist/mere-run.js';

async function tempHome(prefix = 'mere-run-unit-') {
  return await mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeExecutable(filePath, body) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, 'utf8');
  await chmod(filePath, 0o755);
}

test('mere.run path defaults expand environment overrides', async () => {
  const home = await tempHome();
  const mereRoot = path.join(home, 'mere');
  assert.equal(defaultMereRunInstallBin({ HOME: home, MERE_RUN_INSTALL_BIN: '~/bin/mere.run' }), path.join(home, 'bin', 'mere.run'));
  assert.equal(defaultMereRunSourceDir(mereRoot, { HOME: home, MERE_RUN_SOURCE_DIR: '~/src/run-public' }), path.join(home, 'src', 'run-public'));
});

test('mere.run setup reports a non-executable explicit binary as unavailable', async () => {
  const home = await tempHome();
  const bin = path.join(home, 'bin', 'mere.run');
  await mkdir(path.dirname(bin), { recursive: true });
  await writeFile(bin, '#!/usr/bin/env node\n', 'utf8');

  const env = { HOME: home, PATH: '' };
  const inspected = await inspectMereRun({ env, mereRoot: home, explicitBin: bin });
  assert.equal(inspected.ok, false);
  assert.equal(inspected.source, 'missing');
  assert.match(inspected.error, /not executable/);

  const setup = await setupMereRun({ env, mereRoot: home, explicitBin: bin, noSource: true, noDownload: true });
  assert.equal(setup.ok, false);
  assert.equal(setup.source, 'missing');
  assert.match(setup.error, /mere\.run is not installed/);
});

test('mere.run setup links an installed app bundle CLI payload', async () => {
  const home = await tempHome();
  const appBin = path.join(home, 'Applications', 'MereRun.app', 'Contents', 'Resources', 'mere.run', 'mere.run');
  const installBin = path.join(home, '.local', 'bin', 'mere.run');
  await writeExecutable(
    appBin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'model' && args[1] === 'list') {
  console.log('ID Category Status Size');
  process.exit(0);
}
console.log('mere.run fake app payload');
`,
  );

  const env = { HOME: home, PATH: path.dirname(process.execPath) };
  const setup = await setupMereRun({ env, mereRoot: path.join(home, 'mere') });
  assert.equal(setup.ok, true);
  assert.equal(setup.source, 'app');
  assert.equal(setup.bin, installBin);
  assert.ok(setup.steps.some((step) => step.action === 'app linked' || step.action === 'app copied'));
});

test('mere.run setup repairs a PATH entry that is not the CLI payload', async () => {
  const home = await tempHome();
  const pathBin = path.join(home, 'bin', 'mere.run');
  const appBin = path.join(home, 'Applications', 'MereRun.app', 'Contents', 'Resources', 'mere.run', 'mere.run');
  const installBin = path.join(home, '.local', 'bin', 'mere.run');
  await writeExecutable(
    pathBin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'model' && args[1] === 'list') {
  console.error('GUI launcher, not CLI');
  process.exit(2);
}
process.exit(0);
`,
  );
  await writeExecutable(
    appBin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'model' && args[1] === 'list') {
  console.log('ID Category Status Size');
  process.exit(0);
}
console.log('mere.run fake app payload');
`,
  );

  const env = { HOME: home, PATH: `${path.dirname(pathBin)}${path.delimiter}${path.dirname(process.execPath)}` };
  const setup = await setupMereRun({ env, mereRoot: path.join(home, 'mere') });
  assert.equal(setup.ok, true);
  assert.equal(setup.source, 'app');
  assert.equal(setup.bin, installBin);
  assert.ok(setup.steps.some((step) => step.action === 'path unusable'));
  assert.ok(setup.steps.some((step) => step.action === 'app linked' || step.action === 'app copied'));
});

test('mere.run model inspection surfaces model list failures', async () => {
  const home = await tempHome();
  const bin = path.join(home, 'bin', 'mere.run');
  await writeExecutable(
    bin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('mere.run fake 1.0.0');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'list') {
  console.error('model api offline');
  process.exit(8);
}
process.exit(0);
`,
  );

  const runtime = {
    ok: true,
    installed: false,
    source: 'explicit',
    bin,
    installBin: bin,
    sourceDir: home,
    version: 'mere.run fake 1.0.0',
    steps: [],
  };
  const env = { HOME: home, PATH: path.dirname(process.execPath) };
  const result = await inspectMereRunModels({ env, mereRoot: home }, appMereRunModelRequests('media'), runtime);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['speech-asr-parakeet', 'text-embed-qwen3-0.6b']);
  assert.match(result.error, /model api offline/);
});

test('mere.run model pulls skip installed models and report failed pulls', async () => {
  const home = await tempHome();
  const bin = path.join(home, 'bin', 'mere.run');
  await writeExecutable(
    bin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('mere.run fake 1.0.0');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'list') {
  console.log('speech-asr-parakeet text installed —');
  console.log('text-embed-qwen3-0.6b text missing —');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'pull') {
  console.error('pull failed ' + args[2]);
  process.exit(6);
}
console.error('unexpected ' + args.join(' '));
process.exit(1);
`,
  );

  const env = { HOME: home, PATH: path.dirname(process.execPath) };
  const result = await pullMereRunModels({ env, mereRoot: home, explicitBin: bin }, appMereRunModelRequests('media'));
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.pulls.map((pull) => [pull.id, pull.skipped, pull.ok]),
    [
      ['speech-asr-parakeet', true, true],
      ['text-embed-qwen3-0.6b', false, false],
    ],
  );
  assert.match(result.pulls[1].stderr, /pull failed text-embed-qwen3-0\.6b/);
  assert.match(result.error, /pulls failed/);
});

test('mere.run model pulls fail when the model remains missing after a zero exit pull', async () => {
  const home = await tempHome();
  const bin = path.join(home, 'bin', 'mere.run');
  await writeExecutable(
    bin,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('mere.run fake 1.0.0');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'list') {
  console.log('speech-asr-parakeet text missing —');
  process.exit(0);
}
if (args[0] === 'model' && args[1] === 'pull') {
  process.exit(0);
}
process.exit(1);
`,
  );

  const env = { HOME: home, PATH: path.dirname(process.execPath) };
  const result = await pullMereRunModels({ env, mereRoot: home, explicitBin: bin }, appMereRunModelRequests('media').slice(0, 1));
  assert.equal(result.ok, false);
  assert.equal(result.pulls[0].ok, false);
  assert.match(result.pulls[0].stderr, /still not reported as installed/);
});
