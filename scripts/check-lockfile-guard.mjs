import { execFileSync } from 'node:child_process';

const lockfiles = new Set([
	'npm-shrinkwrap.json',
	'package-lock.json',
	'pnpm-lock.yaml',
	'yarn.lock'
]);

function git(args) {
	try {
		return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
	} catch {
		return '';
	}
}

const allow = process.env.MERE_ALLOW_LOCKFILE_CHANGE === '1' || process.env.ALLOW_LOCKFILE_CHANGE === '1';
const changed = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
	.split('\n')
	.map((line) => line.trim())
	.filter(Boolean)
	.filter((file) => lockfiles.has(file));

if (changed.length > 0 && !allow) {
	console.error('Staged lockfile changes are blocked by default:');
	for (const file of changed) console.error(`- ${file}`);
	console.error('Re-run the commit with MERE_ALLOW_LOCKFILE_CHANGE=1 after reviewing dependency and lifecycle-script changes.');
	process.exit(1);
}

console.log(changed.length > 0 ? 'Lockfile changes explicitly allowed.' : 'No staged lockfile changes.');
