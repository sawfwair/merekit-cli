import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createRegistry } from '../dist/registry.js';
import { listMcpTools } from '../dist/mcp.js';

test('MCP tools are read-only by default', async () => {
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
`,
  );
  const tools = await listMcpTools(createRegistry(root).filter((entry) => entry.key === 'projects'), false, {
    ...process.env,
    MERE_ROOT: root,
  });
  assert.deepEqual(tools.map((tool) => tool.name), ['mere_projects_project_list']);
});
