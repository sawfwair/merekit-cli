import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function fileExists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function createFakeMereRoot() {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-mcp-smoke-'));
	const dist = path.join(root, 'projects', 'dist');
	await mkdir(dist, { recursive: true });
	await writeFile(
		path.join(dist, 'run.js'),
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
    globalFlags: ['json'],
    commands: [
      { id: 'project.list', path: ['project', 'list'], summary: 'List projects.', auth: 'workspace', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: [] }
    ]
  }));
  process.exit(0);
}
console.log(JSON.stringify({ ok: true, args }));
`,
		'utf8'
	);
	return root;
}

const packageRoot = new URL('..', import.meta.url).pathname;
const defaultProjectsCli = path.resolve(packageRoot, '..', 'projects', 'dist', 'run.js');
const env = { ...process.env };
if (!env.MERE_ROOT && !(await fileExists(defaultProjectsCli))) {
	env.MERE_ROOT = await createFakeMereRoot();
}

const cliBin = env.MERE_CLI_BIN?.trim();
const transport = new StdioClientTransport({
	command: cliBin || process.execPath,
	args: cliBin ? ['mcp', 'serve'] : ['dist/run.js', 'mcp', 'serve'],
	cwd: packageRoot,
	env
});

const client = new Client({ name: 'mere-mcp-smoke', version: '0.0.1' });

try {
	await client.connect(transport);
	const result = await client.listTools();
	if (result.tools.length === 0) {
		throw new Error('MCP tools/list returned zero tools.');
	}
	console.log(JSON.stringify({ ok: true, tools: result.tools.length }));
} finally {
	await client.close();
}
