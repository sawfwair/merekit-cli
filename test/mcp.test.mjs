import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createRegistry } from '../dist/registry.js';
import { listMcpTools, registerMcpToolSpecs } from '../dist/mcp.js';

async function writeFakeMcpProjects() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mere-mcp-test-'));
  const projects = path.join(root, 'projects');
  await mkdir(path.join(projects, 'dist'), { recursive: true });
  await writeFile(
    path.join(projects, 'dist', 'run.js'),
    `#!/usr/bin/env node
if (process.argv.includes('commands')) console.log(JSON.stringify({
  schemaVersion: 1, app: 'mere-projects', namespace: 'projects', aliases: [], auth: { kind: 'browser' },
  baseUrlEnv: [], sessionPath: null, globalFlags: ['json'],
  commands: [
    { id: 'project.list', path: ['project', 'list'], summary: 'List.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] },
    { id: 'db.query', path: ['db', 'query'], summary: 'Run a local D1 query.', auth: 'none', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['sql'] },
    { id: 'project.create', path: ['project', 'create'], summary: 'Create.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: true, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] },
    { id: 'project.delete', path: ['project', 'delete'], summary: 'Delete.', auth: 'workspace', risk: 'destructive', supportsJson: true, supportsData: false, requiresYes: true, requiresConfirm: true, positionals: [], flags: [] }
  ]
}));
else if (process.argv.includes('fail')) { console.error('boom'); process.exit(9); }
else console.log(JSON.stringify({ args: process.argv.slice(2), token: 'zcli_refresh_secret' }));
`,
  );
  return root;
}

test('MCP tools are read-only by default', async () => {
  const root = await writeFakeMcpProjects();
  const tools = await listMcpTools(createRegistry(root).filter((entry) => entry.key === 'projects'), false, {
    ...process.env,
    MERE_ROOT: root,
  });
  assert.deepEqual(tools.map((tool) => tool.name), ['mere_projects_project_list']);
});

test('MCP write tools require explicit guardrails and redact output', async () => {
  const root = await writeFakeMcpProjects();
  const env = {
    ...process.env,
    HOME: root,
    XDG_STATE_HOME: path.join(root, 'state'),
    MERE_ROOT: root,
  };
  const registry = createRegistry(root).filter((entry) => entry.key === 'projects');
  const tools = await listMcpTools(registry, true, env);
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ['mere_projects_project_list', 'mere_projects_db_query', 'mere_projects_project_create', 'mere_projects_project_delete'],
  );

  const callbacks = new Map();
  registerMcpToolSpecs(
    {
      registerTool(name, _config, callback) {
        callbacks.set(name, callback);
      },
    },
    { env, stdout() {}, stderr() {} },
    tools,
  );

  await assert.rejects(() => callbacks.get('mere_projects_project_delete')({}), /requires yes: true/);
  await assert.rejects(() => callbacks.get('mere_projects_project_delete')({ yes: true }), /requires exact confirm/);

  const response = await callbacks.get('mere_projects_project_delete')({
    yes: true,
    confirm: 'project_1',
    workspace: 'ws_1',
    data: { token: 'secret' },
  });
  assert.equal(response.content[0].type, 'text');
  assert.match(response.content[0].text, /<redacted>/);

  const audit = await readFile(path.join(root, 'state', 'mere', 'audit.ndjson'), 'utf8');
  const auditEntry = JSON.parse(audit.trim());
  assert.deepEqual(auditEntry.command, ['project', 'delete']);
  assert.doesNotMatch(audit, /secret/);

  await assert.rejects(() => callbacks.get('mere_projects_project_list')({ args: ['fail'] }), /boom/);
});
