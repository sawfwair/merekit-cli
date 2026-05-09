import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runCapture, runInherit } from '../dist/process.js';

test('runCapture returns stdout, stderr, and exit code', async () => {
  const result = await runCapture(process.execPath, ['-e', "console.log('out'); console.error('err'); process.exit(7);"], {
    env: process.env,
  });
  assert.equal(result.code, 7);
  assert.equal(result.signal, null);
  assert.equal(result.stdout.trim(), 'out');
  assert.equal(result.stderr.trim(), 'err');
});

test('runCapture terminates timed-out commands', async () => {
  const result = await runCapture(process.execPath, ['-e', 'setTimeout(() => {}, 1000);'], {
    env: process.env,
    timeoutMs: 10,
  });
  assert.equal(result.code, 1);
  assert.equal(result.signal, 'SIGTERM');
});

test('runInherit resolves command exit status without captured output', async () => {
  const result = await runInherit(process.execPath, ['-e', 'process.exit(3);'], {
    env: process.env,
  });
  assert.equal(result.code, 3);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});
