import { spawnSync } from 'node:child_process';
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mereRoot = path.resolve(process.env.MERE_ROOT ?? path.join(packageRoot, '..'));
const adaptersDir = path.join(packageRoot, 'adapters');
const linkPackageRoot = path.join(mereRoot, 'merekit-link');
const pnpm = process.env.PNPM_BIN?.trim() || 'pnpm';
function createAdaptersReadme(adapterKeys) {
	return `# Generated Adapters

This directory contains generated public client artifacts for bundled Mere app CLIs.
They are committed so the \`@merekit/cli\` npm package works out of the box after a global install.

Bundled adapters in this build:

${adapterKeys.map((key) => `- \`${key}\``).join('\n')}

The \`link\` adapter is bundled from the public \`@merekit/link\` TypeScript package source. It provides standalone YAML-based cross-surface linking, can bootstrap configuration from a Mere workspace snapshot, and exposes optional Executor-backed commands when an Executor-compatible HTTP runtime is configured separately.

The \`media\` adapter is generated from the Mere media app, but local transcription and embedding commands delegate to the public \`mere.run\` runtime and local models. Run \`mere setup mere-run\` to orchestrate the runtime install from an existing binary, the local \`~/mere/run-public\` source checkout, or the verified DMG at \`https://mere.run/releases/mere-run.dmg\`. Run \`mere setup mere-run models --app media\` to pull Media-requested models. Set \`MERE_MEDIA_MERE_RUN_BIN\` or \`MERE_RUN_BIN\` only when you need an explicit runtime override.

The adapters intentionally expose command names, public API route shapes, environment variable names, and default service URLs. They do not contain credentials or grant access to Mere hosted services.

Access is enforced by the Mere services through browser sessions, bearer tokens, workspace membership, roles, destructive-operation confirmations, and server-side authorization checks.

Adapter manifests must mark command risk honestly as \`read\`, \`write\`, \`destructive\`, or \`external\`. Destructive commands must require explicit confirmation.

Maintainers regenerate these files from the Mere app repositories with \`pnpm build:adapters\`. That command expects the private app repositories to be available as sibling directories and is not required for normal public development of the root CLI. When the sibling \`merekit-link\` checkout exists, \`pnpm check:adapters\` compares the bundled Link manifest against the local standalone Link manifest to catch adapter drift.
`;
}

const appBuilds = [
	{ repo: 'business', args: ['--dir', path.join(mereRoot, 'business'), '--filter', '@zerosmb/cli', 'build'] },
	{ repo: 'finance', script: 'build:cli' },
	{ repo: 'projects', script: 'build:cli' },
	{ repo: 'agent', script: 'build:cli' },
	{ repo: 'today', script: 'build:cli' },
	{ repo: 'zone', script: 'build:cli' },
	{ repo: 'video', script: 'build:cli' },
	{ repo: 'network', script: 'build:cli' },
	{ repo: 'email', script: 'build:cli' },
	{ repo: 'gives', script: 'build:cli' },
	{ repo: 'works', script: 'build:cli' },
	{ repo: 'media', script: 'build:cli' },
	{ repo: 'deliver', script: 'build:cli' }
];

const adapters = [
	{
		key: 'business',
		sourceRepoPath: path.join(mereRoot, 'business'),
		sourceArtifactPath: path.join(mereRoot, 'business', 'packages', 'cli', 'dist', 'index.js')
	},
	{
		key: 'projects',
		sourceRepoPath: path.join(mereRoot, 'projects'),
		sourceArtifactPath: path.join(mereRoot, 'projects', 'dist', 'run.js')
	},
	{
		key: 'agent',
		sourceRepoPath: path.join(mereRoot, 'agent'),
		sourceArtifactPath: path.join(mereRoot, 'agent', 'cli-dist', 'run.js')
	},
	{
		key: 'today',
		sourceRepoPath: path.join(mereRoot, 'today'),
		sourceArtifactPath: path.join(mereRoot, 'today', 'dist', 'run.js')
	},
	{
		key: 'zone',
		sourceRepoPath: path.join(mereRoot, 'zone'),
		sourceArtifactPath: path.join(mereRoot, 'zone', 'dist', 'run.js')
	},
	{
		key: 'video',
		sourceRepoPath: path.join(mereRoot, 'video'),
		sourceArtifactPath: path.join(mereRoot, 'video', 'dist', 'run.js')
	},
	{
		key: 'network',
		sourceRepoPath: path.join(mereRoot, 'network'),
		sourceArtifactPath: path.join(mereRoot, 'network', 'dist', 'run.js')
	},
	{
		key: 'email',
		sourceRepoPath: path.join(mereRoot, 'email'),
		sourceArtifactPath: path.join(mereRoot, 'email', 'dist', 'run.js')
	},
	{
		key: 'gives',
		sourceRepoPath: path.join(mereRoot, 'gives'),
		sourceArtifactPath: path.join(mereRoot, 'gives', 'dist', 'run.js')
	},
	{
		key: 'works',
		sourceRepoPath: path.join(mereRoot, 'works'),
		sourceArtifactPath: path.join(mereRoot, 'works', 'dist', 'run.js')
	},
	{
		key: 'media',
		sourceRepoPath: path.join(mereRoot, 'media'),
		sourceArtifactPath: path.join(mereRoot, 'media', 'dist', 'run.js')
	},
	{
		key: 'deliver',
		sourceRepoPath: path.join(mereRoot, 'deliver'),
		sourceArtifactPath: path.join(mereRoot, 'deliver', 'cli', 'run.js')
	}
];

const staticAdapters = [
	{
		key: 'link',
		sourceRepoPath: linkPackageRoot,
		sourceArtifactPath: path.join(linkPackageRoot, 'dist', 'run.js'),
		buildArgs: ['--dir', linkPackageRoot, 'build'],
		copyDirectory: true
	}
];

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? packageRoot,
		env: process.env,
		stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		encoding: 'utf8'
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		const detail = options.capture ? `\n${result.stderr}${result.stdout}` : '';
		throw new Error(`${command} ${args.join(' ')} failed with ${result.status}.${detail}`);
	}
	return result;
}

async function copyAdapter(adapter) {
	const targetDir = path.join(adaptersDir, adapter.key);
	const target = path.join(targetDir, 'run.js');
	if (adapter.copyDirectory) {
		await rm(targetDir, { recursive: true, force: true });
		await mkdir(targetDir, { recursive: true });
		await cp(path.dirname(adapter.sourceArtifactPath), targetDir, { recursive: true });
		await removeDeclarationFiles(targetDir);
		await stripSourceMapReference(target);
		await chmod(target, 0o755);
		return target;
	}
	await mkdir(targetDir, { recursive: true });
	await copyFile(adapter.sourceArtifactPath, target);
	await stripSourceMapReference(target);
	await chmod(target, 0o755);
	return target;
}

async function removeDeclarationFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	await Promise.all(entries.map(async (entry) => {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await removeDeclarationFiles(entryPath);
			return;
		}
		if (entry.name.endsWith('.d.ts')) await rm(entryPath);
	}));
}

async function stripSourceMapReference(filePath) {
	const raw = await readFile(filePath, 'utf8');
	const next = raw.replace(/\n?\/\/# sourceMappingURL=.*(?:\r?\n)?$/u, '\n');
	if (next !== raw) {
		await writeFile(filePath, next, 'utf8');
	}
}

async function bundleFinanceAdapter() {
	const targetDir = path.join(adaptersDir, 'finance');
	const target = path.join(targetDir, 'run.js');
	await mkdir(targetDir, { recursive: true });
	await esbuild({
		entryPoints: [path.join(mereRoot, 'finance', 'packages', 'cli', 'bin', 'merefi.ts')],
		bundle: true,
		platform: 'node',
		format: 'esm',
		target: ['node24'],
		outfile: target,
		banner: { js: 'import { createRequire as __mereCreateRequire } from "node:module";const require = __mereCreateRequire(import.meta.url);' },
		absWorkingDir: path.join(mereRoot, 'finance'),
		logLevel: 'silent'
	});
	await stripSourceMapReference(target);
	await chmod(target, 0o755);
	return target;
}

function validateAdapter(key, target) {
	const version = run(process.execPath, [target, '--version'], { capture: true });
	if (!version.stdout.trim()) throw new Error(`${key} adapter did not print a version.`);

	run(process.execPath, [target, 'completion', 'bash'], { capture: true });
	const manifest = run(process.execPath, [target, 'commands', '--json'], { capture: true });
	try {
		JSON.parse(manifest.stdout);
	} catch (error) {
		throw new Error(`${key} adapter commands --json did not produce valid JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

for (const build of appBuilds) {
	run(pnpm, build.args ?? ['--dir', path.join(mereRoot, build.repo), build.script]);
}

for (const adapter of staticAdapters) {
	if (adapter.buildArgs) run(pnpm, adapter.buildArgs);
}

await rm(adaptersDir, { recursive: true, force: true });
await mkdir(adaptersDir, { recursive: true });
const rootPackage = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
await writeFile(
	path.join(adaptersDir, 'package.json'),
	`${JSON.stringify({ name: '@merekit/cli-adapters', private: true, version: rootPackage.version ?? '0.0.0', type: 'module' }, null, 2)}\n`,
	'utf8'
);
await writeFile(path.join(adaptersDir, 'README.md'), createAdaptersReadme([...appBuilds.map((build) => build.repo), ...staticAdapters.map((adapter) => adapter.key)]), 'utf8');

const builtAt = new Date().toISOString();
const manifest = {
	schemaVersion: 1,
	builtAt,
	adapters: []
};

for (const adapter of adapters) {
	const target = await copyAdapter(adapter);
	validateAdapter(adapter.key, target);
	manifest.adapters.push({
		app: adapter.key,
		sourceRepoPath: path.relative(mereRoot, adapter.sourceRepoPath),
		sourceArtifactPath: path.relative(mereRoot, adapter.sourceArtifactPath),
		adapterPath: path.relative(packageRoot, target),
		builtAt
	});
}

for (const adapter of staticAdapters) {
	const target = await copyAdapter(adapter);
	validateAdapter(adapter.key, target);
	manifest.adapters.push({
		app: adapter.key,
		sourceRepoPath: path.relative(mereRoot, adapter.sourceRepoPath),
		sourceArtifactPath: path.relative(mereRoot, adapter.sourceArtifactPath),
		adapterPath: path.relative(packageRoot, target),
		builtAt
	});
}

const financeTarget = await bundleFinanceAdapter();
validateAdapter('finance', financeTarget);
manifest.adapters.splice(1, 0, {
	app: 'finance',
	sourceRepoPath: 'finance',
	sourceArtifactPath: path.join('finance', 'packages', 'cli', 'bin', 'merefi.ts'),
	adapterPath: path.relative(packageRoot, financeTarget),
	builtAt
});

await writeFile(path.join(adaptersDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Built ${manifest.adapters.length} adapters in ${path.relative(process.cwd(), adaptersDir) || adaptersDir}`);
