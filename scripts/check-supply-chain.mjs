import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lifecycleNames = ['preinstall', 'install', 'postinstall'];
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const externalProtocols = /^(?:file:|link:|workspace:|portal:|catalog:|git\+|https?:|github:)/u;
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

const errors = [];

function readJson(relativePath) {
	return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function recordError(message) {
	errors.push(message);
}

function isPinnedExternalSpec(spec) {
	if (externalProtocols.test(spec)) return true;
	if (spec.startsWith('npm:')) {
		const aliased = spec.slice(4);
		const versionIndex = aliased.lastIndexOf('@');
		return versionIndex > 0 && exactVersion.test(aliased.slice(versionIndex + 1));
	}
	return exactVersion.test(spec);
}

function sortedEntries(value) {
	return Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function scanPackageJsonFiles(directory) {
	const files = [];
	const stack = [directory];
	while (stack.length) {
		const current = stack.pop();
		if (!current) continue;
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const next = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(next);
			} else if (entry.isFile() && entry.name === 'package.json') {
				files.push(next);
			}
		}
	}
	return files;
}

function installLifecycleScripts() {
	const pnpmStore = path.join(root, 'node_modules', '.pnpm');
	if (!existsSync(pnpmStore)) {
		recordError('node_modules/.pnpm is missing; run pnpm install --frozen-lockfile before checking dependency lifecycle scripts.');
		return new Map();
	}
	const packages = new Map();
	for (const packagePath of scanPackageJsonFiles(pnpmStore)) {
		const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
		if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
		const scripts = Object.fromEntries(
			lifecycleNames
				.filter((name) => typeof pkg.scripts?.[name] === 'string')
				.map((name) => [name, pkg.scripts[name]])
		);
		if (Object.keys(scripts).length > 0) {
			packages.set(`${pkg.name}@${pkg.version}`, { package: pkg.name, version: pkg.version, scripts });
		}
	}
	return packages;
}

function readPnpmWorkspacePolicy() {
	const pnpmWorkspacePath = path.join(root, 'pnpm-workspace.yaml');
	if (!existsSync(pnpmWorkspacePath)) {
		recordError('pnpm-workspace.yaml is missing; build-script approvals must live there for pnpm 10 approve-builds.');
		return { onlyBuiltDependencies: new Set(), strictDepBuilds: false };
	}
	const text = readFileSync(pnpmWorkspacePath, 'utf8');
	const onlyBuiltDependencies = new Set();
	let inOnlyBuiltDependencies = false;
	let strictDepBuilds = false;
	for (const line of text.split('\n')) {
		if (/^strictDepBuilds:\s*true\s*$/u.test(line)) strictDepBuilds = true;
		if (/^onlyBuiltDependencies:\s*$/u.test(line)) {
			inOnlyBuiltDependencies = true;
			continue;
		}
		if (inOnlyBuiltDependencies) {
			const match = /^[ ]{2}- (.+?)\s*$/u.exec(line);
			if (match?.[1]) {
				onlyBuiltDependencies.add(match[1]);
				continue;
			}
			if (line.trim()) inOnlyBuiltDependencies = false;
		}
	}
	return { onlyBuiltDependencies, strictDepBuilds };
}

const pkg = readJson('package.json');
const allowedLifecycle = readJson('security/install-lifecycle-scripts.json');
const shrinkwrapPath = path.join(root, 'npm-shrinkwrap.json');
const packageLockPath = path.join(root, 'package-lock.json');

for (const section of dependencySections) {
	for (const [name, spec] of sortedEntries(pkg[section])) {
		if (typeof spec !== 'string' || !isPinnedExternalSpec(spec)) {
			recordError(`${section}.${name} must be pinned to an exact external version; found ${JSON.stringify(spec)}.`);
		}
	}
}

if (typeof pkg.packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+$/u.test(pkg.packageManager)) {
	recordError(`packageManager must pin an exact pnpm version; found ${JSON.stringify(pkg.packageManager)}.`);
}

if (!existsSync(shrinkwrapPath)) {
	recordError('npm-shrinkwrap.json is missing; publishable npm installs need a shrinkwrap for transitive dependency pinning.');
} else {
	const shrinkwrap = readJson('npm-shrinkwrap.json');
	const rootPackage = shrinkwrap.packages?.[''];
	if (!rootPackage) {
		recordError('npm-shrinkwrap.json is missing the root package entry.');
	} else {
		if (rootPackage.name !== pkg.name) recordError(`npm-shrinkwrap.json root package name is ${JSON.stringify(rootPackage.name)}, expected ${JSON.stringify(pkg.name)}.`);
		if (rootPackage.version !== pkg.version) recordError(`npm-shrinkwrap.json root package version is ${JSON.stringify(rootPackage.version)}, expected ${JSON.stringify(pkg.version)}.`);
		const shrinkDeps = rootPackage.dependencies ?? {};
		for (const [name, spec] of sortedEntries(pkg.dependencies)) {
			if (shrinkDeps[name] !== spec) {
				recordError(`npm-shrinkwrap.json root dependency ${name} is ${JSON.stringify(shrinkDeps[name])}, expected ${JSON.stringify(spec)}.`);
			}
		}
		for (const name of Object.keys(shrinkDeps)) {
			if (!pkg.dependencies?.[name]) recordError(`npm-shrinkwrap.json root dependency ${name} is not a runtime dependency in package.json.`);
		}
	}
}

if (existsSync(packageLockPath)) {
	recordError('package-lock.json should not be committed for this package; use npm-shrinkwrap.json plus pnpm-lock.yaml.');
}

const approvedBuilds = new Set(allowedLifecycle.installLifecycleScripts.map((entry) => entry.package));
const pnpmWorkspace = readPnpmWorkspacePolicy();
const pnpmBuilds = pnpmWorkspace.onlyBuiltDependencies;
if (!pnpmWorkspace.strictDepBuilds) {
	recordError('pnpm-workspace.yaml must set strictDepBuilds: true so unreviewed dependency build scripts fail installs.');
}
for (const name of approvedBuilds) {
	if (!pnpmBuilds.has(name)) recordError(`pnpm-workspace.yaml onlyBuiltDependencies is missing ${name}.`);
}
for (const name of pnpmBuilds) {
	if (!approvedBuilds.has(name)) recordError(`pnpm-workspace.yaml onlyBuiltDependencies includes ${name}, but security/install-lifecycle-scripts.json does not review it.`);
}

const expectedLifecycle = new Map(
	allowedLifecycle.installLifecycleScripts.map((entry) => [`${entry.package}@${entry.version}`, entry])
);
const actualLifecycle = installLifecycleScripts();
for (const [id, actual] of actualLifecycle) {
	const expected = expectedLifecycle.get(id);
	if (!expected) {
		recordError(`${id} declares install-time lifecycle scripts and needs explicit review in security/install-lifecycle-scripts.json.`);
		continue;
	}
	for (const name of lifecycleNames) {
		if ((actual.scripts[name] ?? undefined) !== (expected.scripts[name] ?? undefined)) {
			recordError(`${id} ${name} script changed from ${JSON.stringify(expected.scripts[name])} to ${JSON.stringify(actual.scripts[name])}.`);
		}
	}
}
for (const id of expectedLifecycle.keys()) {
	if (!actualLifecycle.has(id)) recordError(`${id} is reviewed for install-time lifecycle scripts but is not present in node_modules.`);
}

if (errors.length > 0) {
	console.error('Supply-chain checks failed:');
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log('Supply-chain checks passed.');
