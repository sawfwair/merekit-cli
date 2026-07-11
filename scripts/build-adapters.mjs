import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, copyFile, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild, version as esbuildVersion } from 'esbuild';
import {
	ADAPTER_MANIFEST_SCHEMA_VERSION,
	canonicalJson,
	collectAdapterArtifacts,
	digestDirectory,
	inspectContract,
	inspectSourceRepository,
	sha256
} from './adapter-provenance-lib.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mereRoot = path.resolve(process.env.MERE_ROOT ?? path.join(packageRoot, '..'));
const adaptersDir = path.join(packageRoot, 'adapters');
const pnpm = process.env.PNPM_BIN?.trim() || 'pnpm';
const sourceConfig = JSON.parse(await readFile(path.join(packageRoot, 'scripts', 'adapter-sources.json'), 'utf8'));
const rootPackage = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));

function parseMode(argv) {
	let mode = process.env.ADAPTER_BUILD_MODE?.trim() || 'development';
	for (const argument of argv) {
		if (argument === '--release') mode = 'release';
		else if (argument === '--development') mode = 'development';
		else if (argument.startsWith('--mode=')) mode = argument.slice('--mode='.length);
		else throw new Error(`Unknown adapter build option: ${argument}`);
	}
	if (!['development', 'release'].includes(mode)) throw new Error(`Adapter build mode must be development or release, got ${mode}.`);
	return mode;
}

const mode = parseMode(process.argv.slice(2));
const release = mode === 'release';
if (sourceConfig.schemaVersion !== 1 || sourceConfig.defaultBranch !== 'main' || !sourceConfig.sources) {
	throw new Error('scripts/adapter-sources.json must be the reviewed schema v1 source map for main.');
}
if (release && !String(process.env.GH_TOKEN ?? '').trim()) {
	throw new Error('Release adapter builds require GH_TOKEN for exact merged-PR, approval, and CI evidence.');
}
if (release && String(process.env.PNPM_BIN ?? '').trim()) {
	throw new Error('Release adapter builds refuse PNPM_BIN overrides; use the reviewed packageManager toolchain.');
}
if (release && (!/^v24\.\d+\.\d+$/u.test(process.version) || esbuildVersion !== rootPackage.devDependencies?.esbuild)) {
	throw new Error(`Release adapter builds require the pinned Node 24 and esbuild ${rootPackage.devDependencies?.esbuild} toolchain.`);
}

function repo(name) {
	const direct = path.join(mereRoot, name);
	const prefixed = path.join(mereRoot, `mere-${name}`);
	const candidates = [prefixed, direct];
	const packageDirectory = candidates.find((candidate) => existsSync(path.join(candidate, 'package.json')));
	if (packageDirectory) return packageDirectory;
	const existing = candidates.find((candidate) => existsSync(candidate));
	if (existing) return existing;
	return direct;
}

const linkPackageRoot = path.join(mereRoot, 'merekit-link');

function createAdaptersReadme(adapterKeys) {
	return `# Generated Adapters

This directory contains generated public client artifacts for bundled Mere app CLIs.
They are committed so the \`@merekit/cli\` npm package works out of the box after a global install.

Bundled adapters in this build:

${adapterKeys.map((key) => `- \`${key}\``).join('\n')}

The \`link\` adapter is bundled from the public \`@merekit/link\` TypeScript package source. It provides standalone YAML-based cross-surface linking and can bootstrap configuration from a Mere workspace snapshot.

The \`media\` adapter is generated from the Mere media app, but local transcription and embedding commands delegate to the public \`mere.run\` runtime and local models. Run \`mere setup mere-run\` to orchestrate the runtime install from an existing binary, the local \`~/mere/run-public\` source checkout, or the verified DMG at \`https://mere.run/releases/mere-run.dmg\`. Run \`mere setup mere-run models --app media\` to pull Media-requested models. Set \`MERE_MEDIA_MERE_RUN_BIN\` or \`MERE_RUN_BIN\` only when you need an explicit runtime override.

The adapters intentionally expose command names, public API route shapes, environment variable names, and default service URLs. They do not contain credentials or grant access to Mere hosted services.

Access is enforced by the Mere services through browser sessions, bearer tokens, workspace membership, roles, destructive-operation confirmations, and server-side authorization checks.

Adapter manifests must mark command risk honestly as \`read\`, \`write\`, \`destructive\`, or \`external\`. Destructive commands must require explicit confirmation.

Maintainers can use \`pnpm build:adapters\` for a development snapshot. Public-release inputs must use \`pnpm build:adapters:release\`, which requires clean canonical default-branch sources, exact non-author review and green-CI evidence, and a byte-identical two-pass rebuild.
`;
}

const adapterDefinitions = [
	{
		key: 'business',
		sourceRepoPath: repo('business'),
		sourceArtifactPath: path.join(repo('business'), 'packages', 'cli', 'dist', 'index.js'),
		buildArgs: ['--filter', '@mere/cli', 'build']
	},
	{
		key: 'finance',
		sourceRepoPath: repo('finance'),
		sourceArtifactPath: path.join(repo('finance'), 'packages', 'cli', 'bin', 'merefi.ts'),
		buildArgs: ['build:cli'],
		packager: 'finance-esbuild'
	},
	{ key: 'dynasite', sourceRepoPath: repo('dynasite'), sourceArtifactPath: path.join(repo('dynasite'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'projects', sourceRepoPath: repo('projects'), sourceArtifactPath: path.join(repo('projects'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'agent', sourceRepoPath: repo('agent'), sourceArtifactPath: path.join(repo('agent'), 'cli-dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'today', sourceRepoPath: repo('today'), sourceArtifactPath: path.join(repo('today'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'zone', sourceRepoPath: repo('zone'), sourceArtifactPath: path.join(repo('zone'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'video', sourceRepoPath: repo('video'), sourceArtifactPath: path.join(repo('video'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'network', sourceRepoPath: repo('network'), sourceArtifactPath: path.join(repo('network'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'email', sourceRepoPath: repo('email'), sourceArtifactPath: path.join(repo('email'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'im', sourceRepoPath: repo('im'), sourceArtifactPath: path.join(repo('im'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'gives', sourceRepoPath: repo('gives'), sourceArtifactPath: path.join(repo('gives'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'works', sourceRepoPath: repo('works'), sourceArtifactPath: path.join(repo('works'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{ key: 'media', sourceRepoPath: repo('media'), sourceArtifactPath: path.join(repo('media'), 'dist', 'run.js'), buildArgs: ['build:cli'] },
	{
		key: 'deliver',
		sourceRepoPath: repo('deliver'),
		sourceArtifactPath: path.join(repo('deliver'), 'cli', 'run.js'),
		buildArgs: ['build:cli'],
		extraBundles: [{ source: path.join(repo('deliver'), 'cli', 'local-plane.js'), target: 'local-plane.js' }]
	},
	{
		key: 'link',
		sourceRepoPath: linkPackageRoot,
		sourceArtifactPath: path.join(linkPackageRoot, 'dist', 'run.js'),
		buildArgs: ['build'],
		copyDirectory: true
	}
];

const configuredKeys = Object.keys(sourceConfig.sources);
if (canonicalJson(adapterDefinitions.map((definition) => definition.key)) !== canonicalJson(configuredKeys)) {
	throw new Error('Adapter build definitions and scripts/adapter-sources.json must have identical ordered keys.');
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? packageRoot,
		env: options.env ?? process.env,
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

async function sourceLockfiles(repoPath) {
	const evidence = [];
	for (const filename of ['pnpm-lock.yaml', 'npm-shrinkwrap.json', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
		const absolute = path.join(repoPath, filename);
		if (!existsSync(absolute)) continue;
		const lockfileStat = await assertPathInsideSource(repoPath, absolute, `${path.basename(repoPath)} dependency lockfile`);
		if (!lockfileStat.isFile()) throw new Error(`${absolute} is not a regular dependency lockfile.`);
		const bytes = await readFile(absolute);
		evidence.push({ path: filename, sha256: sha256(bytes), size: bytes.byteLength });
	}
	if (evidence.length === 0) throw new Error(`${repoPath} has no supported dependency lockfile.`);
	return evidence;
}

async function packageManagerFor(repoPath) {
	const packageJsonPath = path.join(repoPath, 'package.json');
	const packageJsonStat = await assertPathInsideSource(repoPath, packageJsonPath, `${path.basename(repoPath)} package.json`);
	if (!packageJsonStat.isFile()) throw new Error(`${packageJsonPath} is not a regular package manifest.`);
	const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
	return packageJson.packageManager ?? null;
}

function buildCommands(definition, sourceEvidence) {
	const commands = [];
	if (!sourceEvidence.sourceArtifactTracked) {
		commands.push({
			executable: 'remove-generated-output',
			args: [path.relative(definition.sourceRepoPath, definition.copyDirectory ? path.dirname(definition.sourceArtifactPath) : definition.sourceArtifactPath).split(path.sep).join('/')],
			workingDirectory: 'source'
		});
	}
	commands.push({
		executable: 'pnpm',
		args: definition.buildArgs,
		workingDirectory: 'source'
	});
	if (definition.packager === 'finance-esbuild') {
		commands.push({
			executable: 'esbuild',
			args: ['packages/cli/bin/merefi.ts', '--bundle', '--platform=node', '--format=esm', '--target=node24', '--outfile=adapters/finance/run.js'],
			workingDirectory: 'source'
		});
	} else {
		const copySource = definition.copyDirectory ? path.dirname(definition.sourceArtifactPath) : definition.sourceArtifactPath;
		commands.push({
			executable: definition.copyDirectory ? 'copy-directory' : 'copy-file',
			args: [path.relative(definition.sourceRepoPath, copySource).split(path.sep).join('/'), `adapters/${definition.key}/`],
			workingDirectory: 'source'
		});
	}
	for (const bundle of definition.extraBundles ?? []) {
		commands.push({
			executable: 'esbuild',
			args: [path.relative(definition.sourceRepoPath, bundle.source).split(path.sep).join('/'), '--bundle', '--platform=node', '--format=esm', '--target=node24', `--outfile=adapters/${definition.key}/${bundle.target}`],
			workingDirectory: 'source'
		});
	}
	commands.push({
		executable: 'normalize-file-modes',
		args: [`adapters/${definition.key}/run.js=755`, `adapters/${definition.key}/**=644`],
		workingDirectory: 'source'
	});
	return commands;
}

function gitTracks(repoPath, absolutePath) {
	const relativePath = path.relative(repoPath, absolutePath);
	const result = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
		cwd: repoPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	if (result.error) throw result.error;
	if (result.status === 0) return true;
	if (result.status === 1) return false;
	throw new Error(`git ls-files failed with ${result.status} for ${relativePath}.`);
}

async function prepareGeneratedSourceOutput(definition, sourceEvidence) {
	if (sourceEvidence.sourceArtifactTracked) return;
	const generatedPath = definition.copyDirectory ? path.dirname(definition.sourceArtifactPath) : definition.sourceArtifactPath;
	await rm(generatedPath, { recursive: definition.copyDirectory === true, force: true });
}

async function assertPathInsideSource(repoPath, candidate, label) {
	const repositoryRealPath = await realpath(repoPath);
	const candidateRealPath = await realpath(candidate);
	if (!candidateRealPath.startsWith(`${repositoryRealPath}${path.sep}`)) {
		throw new Error(`${label} resolves outside its canonical source repository.`);
	}
	const candidateStat = await lstat(candidate);
	if (candidateStat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link.`);
	return candidateStat;
}

async function assertSourceArtifactsSafe(definition) {
	const artifactStat = await assertPathInsideSource(definition.sourceRepoPath, definition.sourceArtifactPath, `${definition.key} source artifact`);
	if (definition.copyDirectory) {
		const artifactDirectory = path.dirname(definition.sourceArtifactPath);
		const directoryStat = await assertPathInsideSource(definition.sourceRepoPath, artifactDirectory, `${definition.key} source artifact directory`);
		if (!directoryStat.isDirectory()) throw new Error(`${definition.key} source artifact directory is not a directory.`);
		await digestDirectory(artifactDirectory);
	} else if (!artifactStat.isFile()) {
		throw new Error(`${definition.key} source artifact is not a regular file.`);
	}
	for (const bundle of definition.extraBundles ?? []) {
		const bundleStat = await assertPathInsideSource(definition.sourceRepoPath, bundle.source, `${definition.key} extra bundle source`);
		if (!bundleStat.isFile()) throw new Error(`${definition.key} extra bundle source is not a regular file.`);
	}
}

async function removeDeclarationFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	await Promise.all(entries.map(async (entry) => {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await removeDeclarationFiles(entryPath);
			return;
		}
		if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.map')) await rm(entryPath);
	}));
}

async function stripSourceMapReference(filePath) {
	const raw = await readFile(filePath, 'utf8');
	const next = raw.replace(/\n?\/\/# sourceMappingURL=.*(?:\r?\n)?$/u, '\n');
	if (next !== raw) await writeFile(filePath, next, 'utf8');
}

async function normalizeAdapterModes(directory, executablePath) {
	await chmod(directory, 0o755);
	const entries = await readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			await normalizeAdapterModes(entryPath, executablePath);
			continue;
		}
		await chmod(entryPath, entryPath === executablePath ? 0o755 : 0o644);
	}
}

async function copyAdapter(definition, outputRoot) {
	const targetDir = path.join(outputRoot, definition.key);
	const target = path.join(targetDir, 'run.js');
	if (definition.copyDirectory) {
		await rm(targetDir, { recursive: true, force: true });
		await mkdir(targetDir, { recursive: true });
		await cp(path.dirname(definition.sourceArtifactPath), targetDir, { recursive: true });
		await removeDeclarationFiles(targetDir);
		await stripSourceMapReference(target);
		await chmod(target, 0o755);
		return target;
	}
	await mkdir(targetDir, { recursive: true });
	if (definition.packager === 'finance-esbuild') {
		await esbuild({
			entryPoints: [definition.sourceArtifactPath],
			bundle: true,
			platform: 'node',
			format: 'esm',
			target: ['node24'],
			outfile: target,
			banner: { js: 'import { createRequire as __mereCreateRequire } from "node:module";const require = __mereCreateRequire(import.meta.url);' },
			absWorkingDir: definition.sourceRepoPath,
			logLevel: 'silent'
		});
	} else {
		await copyFile(definition.sourceArtifactPath, target);
	}
	await stripSourceMapReference(target);
	for (const bundle of definition.extraBundles ?? []) {
		await esbuild({
			entryPoints: [bundle.source],
			bundle: true,
			platform: 'node',
			format: 'esm',
			target: ['node24'],
			outfile: path.join(targetDir, bundle.target),
			absWorkingDir: definition.sourceRepoPath,
			logLevel: 'silent'
		});
		await stripSourceMapReference(path.join(targetDir, bundle.target));
	}
	await chmod(target, 0o755);
	return target;
}

function validateAdapter(key, target, env) {
	const options = { capture: true, env };
	const version = run(process.execPath, [target, '--version'], options);
	if (!version.stdout.trim()) throw new Error(`${key} adapter did not print a version.`);
	run(process.execPath, [target, 'completion', 'bash'], options);
	const manifest = run(process.execPath, [target, 'commands', '--json'], options);
	try {
		JSON.parse(manifest.stdout);
	} catch (error) {
		throw new Error(`${key} adapter commands --json did not produce valid JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

async function inspectSources() {
	const evidence = new Map();
	const failures = [];
	for (const definition of adapterDefinitions) {
		try {
			const source = await inspectSourceRepository({
				app: definition.key,
				repoPath: definition.sourceRepoPath,
				canonicalRepository: sourceConfig.sources[definition.key],
				defaultBranch: sourceConfig.defaultBranch,
				release,
				githubToken: process.env.GH_TOKEN
			});
			evidence.set(definition.key, {
				source,
				contract: await inspectContract(definition.sourceRepoPath),
				packageManager: await packageManagerFor(definition.sourceRepoPath),
				lockfiles: await sourceLockfiles(definition.sourceRepoPath),
				sourceArtifactTracked: gitTracks(definition.sourceRepoPath, definition.sourceArtifactPath)
			});
		} catch (error) {
			failures.push(`${definition.key}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (failures.length > 0) throw new Error(`Adapter source preflight failed:\n- ${failures.join('\n- ')}`);
	return evidence;
}

async function assertSourcesUnchanged(evidence) {
	for (const definition of adapterDefinitions) {
		const before = evidence.get(definition.key).source;
		const after = await inspectSourceRepository({
			app: definition.key,
			repoPath: definition.sourceRepoPath,
			canonicalRepository: sourceConfig.sources[definition.key],
			defaultBranch: sourceConfig.defaultBranch,
			release: false
		});
		if (after.commit !== before.commit || after.tree !== before.tree || (release && (!after.clean || after.hasUnmergedFiles))) {
			throw new Error(`${definition.key} source changed or became dirty during the adapter build.`);
		}
	}
}

async function revalidateReleaseSources(evidence) {
	for (const definition of adapterDefinitions) {
		const expected = evidence.get(definition.key).source;
		const current = await inspectSourceRepository({
			app: definition.key,
			repoPath: definition.sourceRepoPath,
			canonicalRepository: sourceConfig.sources[definition.key],
			defaultBranch: sourceConfig.defaultBranch,
			release: true,
			githubToken: process.env.GH_TOKEN
		});
		if (current.commit !== expected.commit || current.tree !== expected.tree) {
			throw new Error(`${definition.key} source identity changed during the release rebuild.`);
		}
	}
}

async function assertNoLocalBuildMaterial(outputRoot, temporaryRoot) {
	const localPaths = [
		packageRoot,
		mereRoot,
		temporaryRoot,
		process.env.HOME,
		...adapterDefinitions.map((definition) => definition.sourceRepoPath)
	].filter((value) => typeof value === 'string' && value.length > 1);
	const secretValues = Object.entries(process.env)
		.filter(([key, value]) => /(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY)/u.test(key) && typeof value === 'string' && value.length >= 8)
		.map(([, value]) => value);
	const inventory = await digestDirectory(outputRoot);
	for (const entry of inventory.files) {
		const bytes = await readFile(path.join(outputRoot, entry.path));
		if (localPaths.some((value) => bytes.includes(Buffer.from(value)))) {
			throw new Error(`${entry.path} embeds a local build path; release adapters must be machine-independent.`);
		}
		if (secretValues.some((value) => bytes.includes(Buffer.from(value)))) {
			throw new Error(`${entry.path} embeds a credential-shaped build value.`);
		}
	}
}

async function buildPass(outputRoot, context) {
	await rm(outputRoot, { recursive: true, force: true });
	await mkdir(outputRoot, { recursive: true });
	for (const definition of adapterDefinitions) {
		await prepareGeneratedSourceOutput(definition, context.evidence.get(definition.key));
		run(pnpm, definition.buildArgs, { cwd: definition.sourceRepoPath, env: context.environment });
		await assertSourceArtifactsSafe(definition);
	}

	await writeFile(
		path.join(outputRoot, 'package.json'),
		`${JSON.stringify({ name: '@merekit/cli-adapters', private: true, version: rootPackage.version ?? '0.0.0', type: 'module' }, null, 2)}\n`,
		'utf8'
	);
	await writeFile(path.join(outputRoot, 'README.md'), createAdaptersReadme(adapterDefinitions.map((definition) => definition.key)), 'utf8');

	const manifest = {
		schemaVersion: ADAPTER_MANIFEST_SCHEMA_VERSION,
		mode,
		builtAt: context.builtAt,
		sourceDateEpoch: context.sourceDateEpoch,
		sourceMapSha256: sha256(canonicalJson(sourceConfig.sources)),
		reproducibility: {
			passes: release ? 2 : 1,
			byteIdentical: release,
			algorithm: 'sha256-file-inventory-v1',
			machinePathScan: release,
			credentialScan: release,
			canonicalSourcesRevalidated: release
		},
		adapters: []
	};

	for (const definition of adapterDefinitions) {
		const target = await copyAdapter(definition, outputRoot);
		await normalizeAdapterModes(path.join(outputRoot, definition.key), target);
		validateAdapter(definition.key, target, context.environment);
		const sourceEvidence = context.evidence.get(definition.key);
		manifest.adapters.push({
			app: definition.key,
			sourceRepoPath: path.basename(definition.sourceRepoPath),
			sourceArtifactPath: path.relative(definition.sourceRepoPath, definition.sourceArtifactPath).split(path.sep).join('/'),
			adapterPath: `adapters/${definition.key}/run.js`,
			builtAt: context.builtAt,
			source: {
				...sourceEvidence.source,
				artifactTracked: sourceEvidence.sourceArtifactTracked
			},
			build: {
				commands: buildCommands(definition, sourceEvidence),
				toolchain: {
					node: process.version,
					pnpm: context.pnpmVersion,
					esbuild: esbuildVersion,
					sourcePackageManager: sourceEvidence.packageManager,
					sourceLockfiles: sourceEvidence.lockfiles
				},
				deterministicEnvironment: {
					SOURCE_DATE_EPOCH: context.sourceDateEpoch,
					TZ: 'UTC',
					LC_ALL: 'C'
				}
			},
			contract: sourceEvidence.contract,
			artifacts: await collectAdapterArtifacts(outputRoot, definition.key)
		});
	}
	await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
	if (release) await assertNoLocalBuildMaterial(outputRoot, context.temporaryRoot);
	await assertSourcesUnchanged(context.evidence);
	return manifest;
}

const evidence = await inspectSources();
const sourceDateEpoch = release
	? String(Math.max(...[...evidence.values()].map((entry) => entry.source.commitTimestamp)))
	: String(Math.floor(Date.now() / 1000));
const builtAt = new Date(Number(sourceDateEpoch) * 1000).toISOString();
const pnpmVersion = run(pnpm, ['--version'], { capture: true }).stdout.trim();
if (release && pnpmVersion !== String(rootPackage.packageManager ?? '').replace(/^pnpm@/u, '')) {
	throw new Error(`Release adapter builds require pinned ${rootPackage.packageManager}, got pnpm ${pnpmVersion}.`);
}
const temporaryRoot = release ? await mkdtemp(path.join(tmpdir(), 'merekit-adapters-')) : null;
if (temporaryRoot) {
	await mkdir(path.join(temporaryRoot, 'home'), { recursive: true });
	await mkdir(path.join(temporaryRoot, 'tmp'), { recursive: true });
}
const environment = release
	? {
		PATH: process.env.PATH,
		HOME: path.join(temporaryRoot, 'home'),
		TMPDIR: path.join(temporaryRoot, 'tmp'),
		TMP: path.join(temporaryRoot, 'tmp'),
		TEMP: path.join(temporaryRoot, 'tmp'),
		USERPROFILE: path.join(temporaryRoot, 'home'),
		CI: '1',
		SOURCE_DATE_EPOCH: sourceDateEpoch,
		TZ: 'UTC',
		LC_ALL: 'C',
		LANG: 'C'
	}
	: {
		...process.env,
		SOURCE_DATE_EPOCH: sourceDateEpoch,
		TZ: 'UTC',
		LC_ALL: 'C',
		LANG: 'C'
	};
const context = { evidence, sourceDateEpoch, builtAt, pnpmVersion, environment, temporaryRoot };

if (release) {
	try {
		const first = path.join(temporaryRoot, 'first');
		const second = path.join(temporaryRoot, 'second');
		await buildPass(first, context);
		await buildPass(second, context);
		await revalidateReleaseSources(evidence);
		const firstDigest = await digestDirectory(first);
		const secondDigest = await digestDirectory(second);
		if (firstDigest.sha256 !== secondDigest.sha256 || canonicalJson(firstDigest.files) !== canonicalJson(secondDigest.files)) {
			throw new Error(`Release adapter rebuild was not byte-identical: first ${firstDigest.sha256}, second ${secondDigest.sha256}.`);
		}
		await rm(adaptersDir, { recursive: true, force: true });
		await cp(first, adaptersDir, { recursive: true });
	} finally {
		await rm(temporaryRoot, { recursive: true, force: true });
	}
} else {
	await buildPass(adaptersDir, context);
}

console.log(`Built ${adapterDefinitions.length} ${mode} adapters in ${path.relative(process.cwd(), adaptersDir) || adaptersDir}`);
