import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
		HOME: path.join(tmp, 'home'),
		XDG_STATE_HOME: path.join(tmp, 'state'),
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
	parseJsonCommand(bin, ['apps', 'manifest', '--app', 'business', '--json'], env);
	for (const args of [
		['business', 'workspace', 'list', '--json'],
		['business', '--json', 'workspace', 'list']
	]) {
		const businessNoSession = spawnSync(bin, args, {
			cwd: packageRoot,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
			encoding: 'utf8'
		});
		if (businessNoSession.error) throw businessNoSession.error;
		if (businessNoSession.status !== 2) {
			throw new Error(`Packed Business adapter returned ${businessNoSession.status}; expected the no-session exit status.\n${businessNoSession.stderr}${businessNoSession.stdout}`);
		}
		const businessError = JSON.parse(businessNoSession.stderr);
		if (businessError.error?.code !== 'usage_error' || !businessError.error?.message?.includes('No local session found')) {
			throw new Error(`Packed Business adapter did not preserve global flag placement: ${businessNoSession.stderr}`);
		}
	}

	const fakeLogin = path.join(tmp, 'fake-login.js');
	await writeFile(
		fakeLogin,
		`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'commands') {
  console.log(JSON.stringify({
    schemaVersion: 1,
    app: 'fake-projects',
    namespace: 'projects',
    aliases: ['projects'],
    auth: { kind: 'browser' },
    authProbe: ['auth', 'whoami'],
    baseUrlEnv: [],
    sessionPath: null,
    globalFlags: ['workspace', 'json'],
    commands: [
      { id: 'auth.login', path: ['auth', 'login'], summary: 'Login.', auth: 'none', risk: 'write', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['workspace'] },
      { id: 'auth.whoami', path: ['auth', 'whoami'], summary: 'Whoami.', auth: 'session', risk: 'read', supportsJson: true, supportsData: false, requiresYes: false, requiresConfirm: false, positionals: [], flags: ['workspace'] }
    ]
  }));
  process.exit(0);
}
console.error(JSON.stringify({ code: 'delegated_login_timeout', message: 'Timed out waiting for login.' }));
process.exit(7);
`,
		'utf8'
	);
	await chmod(fakeLogin, 0o755);
	const failedLogin = spawnSync(bin, ['auth', 'login', '--app', 'projects', '--json'], {
		cwd: packageRoot,
		env: { ...env, MERE_PROJECTS_CLI: fakeLogin },
		stdio: ['ignore', 'pipe', 'pipe'],
		encoding: 'utf8',
		timeout: 10_000
	});
	if (failedLogin.error) throw failedLogin.error;
	if (failedLogin.status === 0) {
		throw new Error(`Packed mere process swallowed the delegated login failure.\n${failedLogin.stderr}${failedLogin.stdout}`);
	}
	const failedLoginPayload = JSON.parse(failedLogin.stdout);
	if (failedLoginPayload.results?.[0]?.ok !== false || failedLoginPayload.results?.[0]?.code !== 7) {
		throw new Error(`Packed mere process did not preserve delegated login failure state: ${failedLogin.stdout}`);
	}

	const deliverAuxiliaryModule = path.join(
		prefix,
		'lib',
		'node_modules',
		'@merekit',
		'cli',
		'adapters',
		'deliver',
		'local-plane.js'
	);
	await import(pathToFileURL(deliverAuxiliaryModule).href);
	run(bin, ['completion', 'bash'], { capture: true, env });
	run(process.execPath, ['scripts/mcp-tools-smoke.mjs'], { cwd: packageRoot, env });
	console.log(JSON.stringify({ ok: true, tarball: tarballName, prefix }));
} finally {
	await rm(tmp, { recursive: true, force: true });
}
