import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

function parseJsonCommand(bin, args, env) {
	const result = run(bin, args, { capture: true, env });
	return JSON.parse(result.stdout);
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'mere-cli-pack-'));
try {
	run('pnpm', ['build']);
	const pack = run('npm', ['pack', '--silent', '--ignore-scripts'], { capture: true });
	const tarballName = pack.stdout.trim().split(/\r?\n/).at(-1);
	if (!tarballName) throw new Error('npm pack did not return a tarball name.');
	const tarball = path.resolve(packageRoot, tarballName);
	const prefix = path.join(tmp, 'prefix');
	run('npm', ['install', '-g', '--prefix', prefix, tarball], { capture: true });

	const bin = path.join(prefix, 'bin', 'mere');
	const env = {
		...process.env,
		MERE_CLI_SOURCE: 'bundled',
		MERE_ROOT: path.join(tmp, 'missing-mere-root'),
		MERE_CLI_BIN: bin
	};

	run(bin, ['--version'], { capture: true, env });
	run(bin, ['help', 'agent'], { capture: true, env });
	const apps = parseJsonCommand(bin, ['apps', 'list', '--json'], env);
	if (!apps.apps?.every((app) => app.source === 'bundled' && app.exists === true)) {
		throw new Error('Installed apps list did not resolve every adapter from bundled source.');
	}
	parseJsonCommand(bin, ['apps', 'manifest', '--app', 'projects', '--json'], env);
	run(bin, ['completion', 'bash'], { capture: true, env });
	run(process.execPath, ['scripts/mcp-tools-smoke.mjs'], { cwd: packageRoot, env });
	console.log(JSON.stringify({ ok: true, tarball: tarballName, prefix }));
} finally {
	await rm(tmp, { recursive: true, force: true });
}
