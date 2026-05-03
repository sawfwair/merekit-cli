import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbiddenPathPatterns = [
	/\.map$/u,
	/^adapters\/admin\//u,
	/^docs\/\.vitepress\//u,
	/(^|\/)\.env(?:\.|$)/u,
	/(^|\/)(src|test|tests|scripts|coverage|node_modules|\.git)(\/|$)/u,
	/\.(ts|tsx|svelte)$/u,
	/(^|\/)tsconfig[^/]*\.json$/u
];
const forbiddenContentPatterns = [
	{ label: 'source map reference', pattern: /\/\/# sourceMappingURL=/u },
	{ label: 'embedded source map content', pattern: /"sourcesContent"\s*:/u },
	{ label: 'local absolute user path', pattern: /\/Users\/[^"'\s]+/u },
	{ label: 'platform admin CLI marker', pattern: /MERE_ADMIN_TOKEN|mere-admin|\/api\/admin\/v1/u },
	{ label: 'Sawfwair Finance tenant default', pattern: /sawfwair\.mere\.finance/u },
	{ label: 'private key material', pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/u }
];

function runPackDryRun() {
	const result = spawnSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
		cwd: packageRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout || `npm pack --dry-run exited ${result.status}`);
	}
	return JSON.parse(result.stdout)[0].files.map((file) => file.path);
}

const files = runPackDryRun();
const pathFailures = files.filter((file) => forbiddenPathPatterns.some((pattern) => pattern.test(file)));
const contentFailures = [];

for (const file of files) {
	const absolute = path.join(packageRoot, file);
	let text;
	try {
		text = await readFile(absolute, 'utf8');
	} catch {
		continue;
	}
	for (const { label, pattern } of forbiddenContentPatterns) {
		if (pattern.test(text)) {
			contentFailures.push(`${file}: ${label}`);
		}
	}
}

if (pathFailures.length > 0 || contentFailures.length > 0) {
	console.error('Package content check failed.');
	for (const failure of pathFailures) console.error(`forbidden path: ${failure}`);
	for (const failure of contentFailures) console.error(`forbidden content: ${failure}`);
	process.exit(1);
}

console.log(`Package content check passed (${files.length} files).`);
