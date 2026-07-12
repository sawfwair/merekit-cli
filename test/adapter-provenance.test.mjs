import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
	collectAdapterArtifacts,
	digestDirectory,
	inspectContract,
	inspectSourceRepository,
	normalizeRepositoryUrl,
	sha256,
	verifyAdapterManifest,
	verifyGitHubReviewEvidence
} from '../scripts/adapter-provenance-lib.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');

function git(cwd, ...args) {
	return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function jsonResponse(value) {
	return {
		ok: true,
		status: 200,
		headers: { get: () => null },
		json: async () => value
	};
}

function githubFixture(overrides = {}) {
	const commit = 'a'.repeat(40);
	const headCommit = 'b'.repeat(40);
	const pull = {
		number: 17,
		html_url: 'https://github.com/sawfwair/example/pull/17',
		merged_at: '2026-07-10T00:00:00Z',
		draft: false,
		base: { ref: 'main' },
		head: { sha: headCommit },
		user: { login: 'author' },
		merge_commit_sha: commit,
		...overrides.pull
	};
	const reviews = overrides.reviews ?? [{
		id: 1,
		state: 'APPROVED',
		submitted_at: '2026-07-09T23:00:00Z',
		commit_id: headCommit,
		user: { login: 'reviewer', type: 'User' }
	}];
	const checkRuns = overrides.checkRuns ?? [{
		id: 2,
		name: 'verify',
		status: 'completed',
		conclusion: 'success',
		started_at: '2026-07-09T23:30:00Z',
		app: { slug: 'github-actions' }
	}];
	const fetchImpl = async (url) => {
		if (url.includes('/pulls?')) return jsonResponse([pull]);
		if (url.includes('/reviews?')) return jsonResponse(reviews);
		if (url.includes('/check-runs?')) return jsonResponse({ check_runs: checkRuns });
		if (url.endsWith('/status')) return jsonResponse(overrides.status ?? { state: 'success', statuses: [] });
		throw new Error(`Unexpected URL ${url}`);
	};
	return { commit, headCommit, fetchImpl };
}

test('normalizes only canonical GitHub repository URL forms', () => {
	const expected = 'https://github.com/sawfwair/mere-email.git';
	assert.equal(normalizeRepositoryUrl('git@github.com:sawfwair/mere-email.git'), expected);
	assert.equal(normalizeRepositoryUrl('ssh://git@github.com/sawfwair/mere-email'), expected);
	assert.equal(normalizeRepositoryUrl('https://github.com/SAWFWair/Mere-Email.git/'), expected);
	assert.throws(() => normalizeRepositoryUrl('https://mirror.invalid/sawfwair/mere-email.git'), /Unsupported canonical repository URL/u);
});

test('directory and Contract fixture digests bind sorted paths and exact bytes', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-adapter-contract-'));
	const contractRoot = path.join(root, 'contracts', 'mere-console', 'v1');
	await mkdir(path.join(contractRoot, 'fixtures'), { recursive: true });
	await writeFile(path.join(contractRoot, 'mere-console-contract.v1.schema.json'), '{"type":"object"}\n');
	await writeFile(path.join(contractRoot, 'fixtures', 'z.json'), '{"z":1}\n');
	await writeFile(path.join(contractRoot, 'fixtures', 'a.json'), '{"a":1}\n');

	const first = await inspectContract(root);
	assert.equal(first.name, 'mere-console');
	assert.equal(first.version, 1);
	assert.equal(first.fixtures.files, 2);
	assert.match(first.fixtures.sha256, /^[a-f0-9]{64}$/u);
	assert.deepEqual((await digestDirectory(path.join(contractRoot, 'fixtures'))).files.map((entry) => entry.path), ['a.json', 'z.json']);

	await writeFile(path.join(contractRoot, 'fixtures', 'a.json'), '{"a":2}\n');
	const second = await inspectContract(root);
	assert.notEqual(second.fixtures.sha256, first.fixtures.sha256);
});

test('GitHub release evidence requires an exact merged PR, non-author head approval, and green checks', async (t) => {
	await t.test('accepts exact reviewed green evidence', async () => {
		const fixture = githubFixture();
		const evidence = await verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		});
		assert.equal(evidence.pullRequestNumber, 17);
		assert.deepEqual(evidence.approvedBy, ['reviewer']);
		assert.deepEqual(evidence.checks, [{ app: 'github-actions', name: 'verify', conclusion: 'success' }]);
		assert.match(evidence.checksSha256, /^[a-f0-9]{64}$/u);
	});

	await t.test('rejects draft or non-exact merge evidence', async () => {
		const fixture = githubFixture({ pull: { draft: true } });
		await assert.rejects(() => verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		}), /not the exact merge commit/u);
	});

	await t.test('rejects approval against an older head', async () => {
		const fixture = githubFixture({ reviews: [{
			id: 1,
			state: 'APPROVED',
			submitted_at: '2026-07-09T23:00:00Z',
			commit_id: 'c'.repeat(40),
			user: { login: 'reviewer', type: 'User' }
		}] });
		await assert.rejects(() => verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		}), /no non-author approval bound to its exact head/u);
	});

	await t.test('keeps an exact approval when the reviewer later leaves a non-decisive comment', async () => {
		const base = githubFixture();
		const fixture = githubFixture({ reviews: [
			{
				id: 1,
				state: 'APPROVED',
				submitted_at: '2026-07-09T23:00:00Z',
				commit_id: base.headCommit,
				user: { login: 'reviewer', type: 'User' }
			},
			{
				id: 2,
				state: 'COMMENTED',
				submitted_at: '2026-07-09T23:10:00Z',
				commit_id: base.headCommit,
				user: { login: 'reviewer', type: 'User' }
			}
		] });
		const evidence = await verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		});
		assert.deepEqual(evidence.approvedBy, ['reviewer']);
	});

	await t.test('rejects red checks even when review passed', async () => {
		const fixture = githubFixture({ checkRuns: [{
			id: 2,
			name: 'verify',
			status: 'completed',
			conclusion: 'failure',
			started_at: '2026-07-09T23:30:00Z',
			app: { slug: 'github-actions' }
		}] });
		await assert.rejects(() => verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		}), /pending or red CI checks/u);
	});

	await t.test('requires at least one successful check instead of only skipped checks', async () => {
		const fixture = githubFixture({ checkRuns: [{
			id: 2,
			name: 'verify',
			status: 'completed',
			conclusion: 'skipped',
			started_at: '2026-07-09T23:30:00Z',
			app: { slug: 'github-actions' }
		}] });
		await assert.rejects(() => verifyGitHubReviewEvidence({
			canonicalRepository: 'https://github.com/sawfwair/example.git',
			commit: fixture.commit,
			defaultBranch: 'main',
			token: 'test-token',
			fetchImpl: fixture.fetchImpl
		}), /no successful CI check/u);
	});
});

test('source inspection records exact Git commit, tree, cleanliness, and default-branch binding', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-adapter-source-'));
	git(root, 'init');
	git(root, 'config', 'user.email', 'test@example.com');
	git(root, 'config', 'user.name', 'Test');
	await writeFile(path.join(root, 'package.json'), '{"name":"fixture"}\n');
	git(root, 'add', 'package.json');
	git(root, 'commit', '-m', 'fixture');
	git(root, 'remote', 'add', 'origin', 'git@github.com:sawfwair/example.git');
	git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

	const evidence = await inspectSourceRepository({
		app: 'example',
		repoPath: root,
		canonicalRepository: 'https://github.com/sawfwair/example.git',
		defaultBranch: 'main',
		release: false
	});
	assert.equal(evidence.commit, git(root, 'rev-parse', 'HEAD'));
	assert.equal(evidence.tree, git(root, 'rev-parse', 'HEAD^{tree}'));
	assert.equal(evidence.clean, true);
	assert.equal(evidence.hasUnmergedFiles, false);
	assert.equal(evidence.mergedToDefaultBranch, null);
	assert.equal(evidence.actualRepository, 'https://github.com/sawfwair/example.git');
	assert.equal(evidence.canonicalRemote, true);
	assert.equal(evidence.localTrackingHead, evidence.commit);
	assert.equal(evidence.remoteHeadEvidence, 'local-tracking-ref');

	await writeFile(path.join(root, 'untracked.txt'), 'dirty\n');
	await assert.rejects(() => inspectSourceRepository({
		app: 'example',
		repoPath: root,
		canonicalRepository: 'https://github.com/sawfwair/example.git',
		defaultBranch: 'main',
		release: true,
		githubToken: 'test-token'
	}), /source is dirty/u);

	git(root, 'remote', 'set-url', 'origin', 'git@github.com:contributor/example.git');
	const forkEvidence = await inspectSourceRepository({
		app: 'example',
		repoPath: root,
		canonicalRepository: 'https://github.com/sawfwair/example.git',
		defaultBranch: 'main',
		release: false
	});
	assert.equal(forkEvidence.actualRepository, 'https://github.com/contributor/example.git');
	assert.equal(forkEvidence.canonicalRemote, false);
});

async function writeReleaseManifestFixture(root) {
	await writeFile(path.join(root, 'package.json'), JSON.stringify({
		packageManager: 'pnpm@10.8.1',
		devDependencies: { esbuild: '0.28.1' }
	}));
	const adapterRoot = path.join(root, 'adapters', 'example');
	await mkdir(adapterRoot, { recursive: true });
	const bytes = Buffer.from('#!/usr/bin/env node\n');
	await writeFile(path.join(adapterRoot, 'run.js'), bytes);
	const artifacts = await collectAdapterArtifacts(path.join(root, 'adapters'), 'example');
	const commit = 'a'.repeat(40);
	const sourceDateEpoch = '1783641600';
	const checks = [{ app: 'github-actions', name: 'verify', conclusion: 'success' }];
	const manifest = {
		schemaVersion: 2,
		mode: 'release',
		reviewPolicy: 'reviewed-merge',
		builtAt: new Date(Number(sourceDateEpoch) * 1000).toISOString(),
		sourceDateEpoch,
		sourceMapSha256: sha256('{"example":"https://github.com/sawfwair/example.git"}'),
		reproducibility: {
			passes: 2,
			byteIdentical: true,
			algorithm: 'sha256-file-inventory-v1',
			machinePathScan: true,
			credentialScan: true,
			canonicalSourcesRevalidated: true
		},
		adapters: [{
			app: 'example',
			sourceRepoPath: 'example',
			sourceArtifactPath: 'dist/run.js',
			adapterPath: 'adapters/example/run.js',
			builtAt: new Date(Number(sourceDateEpoch) * 1000).toISOString(),
			source: {
				canonicalRepository: 'https://github.com/sawfwair/example.git',
				commit,
				tree: 'b'.repeat(40),
				clean: true,
				hasUnmergedFiles: false,
				artifactTracked: false,
				actualRepository: 'https://github.com/sawfwair/example.git',
				canonicalRemote: true,
				defaultBranch: 'main',
				commitTimestamp: Number(sourceDateEpoch),
				remoteHead: commit,
				remoteHeadEvidence: 'live-ls-remote',
				mergedToDefaultBranch: true,
				review: {
					pullRequest: 'https://github.com/sawfwair/example/pull/17',
					pullRequestNumber: 17,
					pullRequestHeadCommit: 'c'.repeat(40),
					mergedAt: '2026-07-10T00:00:00Z',
					approvedBy: ['reviewer'],
					checks,
					checksSha256: sha256('[{"app":"github-actions","conclusion":"success","name":"verify"}]')
				}
			},
			build: {
				commands: [{ executable: 'pnpm', args: ['build:cli'], workingDirectory: 'source' }],
				toolchain: {
					node: 'v24.0.0',
					pnpm: '10.8.1',
					esbuild: '0.28.1',
					sourcePackageManager: 'pnpm@10.8.1',
					sourceLockfiles: [{ path: 'pnpm-lock.yaml', sha256: sha256('lockfile'), size: 8 }]
				},
				deterministicEnvironment: { SOURCE_DATE_EPOCH: sourceDateEpoch, TZ: 'UTC', LC_ALL: 'C' }
			},
			contract: {
				name: 'mere-console',
				version: 1,
				schema: {
					path: 'contracts/mere-console/v1/mere-console-contract.v1.schema.json',
					sha256: sha256('schema'),
					size: 6
				},
				fixtures: {
					path: 'contracts/mere-console/v1/fixtures',
					sha256: sha256('fixtures'),
					files: 2
				}
			},
			artifacts
		}]
	};
	await writeFile(path.join(root, 'adapters', 'manifest.json'), `${JSON.stringify(manifest)}\n`);
	return manifest;
}

test('release manifest gate binds canonical source evidence and every packaged byte', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-adapter-manifest-'));
	await writeReleaseManifestFixture(root);
	await verifyAdapterManifest({
		packageRoot: root,
		sources: { example: 'https://github.com/sawfwair/example.git' },
		release: true
	});

	await writeFile(path.join(root, 'adapters', 'example', 'run.js'), '#!/usr/bin/env node\n// changed\n');
	await assert.rejects(() => verifyAdapterManifest({
		packageRoot: root,
		sources: { example: 'https://github.com/sawfwair/example.git' },
		release: true
	}), /does not match its recorded SHA-256, size, and mode/u);
});

test('canonical-main release policy preserves source and byte gates without inventing review evidence', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-adapter-solo-manifest-'));
	const manifest = await writeReleaseManifestFixture(root);
	manifest.reviewPolicy = 'canonical-main';
	manifest.adapters[0].source.review = null;
	await writeFile(path.join(root, 'adapters', 'manifest.json'), `${JSON.stringify(manifest)}\n`);
	await verifyAdapterManifest({
		packageRoot: root,
		sources: { example: 'https://github.com/sawfwair/example.git' },
		release: true
	});
});

test('legacy adapter manifests cannot pass the publication gate', async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'mere-adapter-legacy-'));
	await mkdir(path.join(root, 'adapters'), { recursive: true });
	await writeFile(path.join(root, 'adapters', 'manifest.json'), '{"schemaVersion":1,"adapters":[]}\n');
	await assert.rejects(() => verifyAdapterManifest({
		packageRoot: root,
		sources: { example: 'https://github.com/sawfwair/example.git' },
		release: true
	}), /legacy and cannot be published/u);
});

test('reviewed source map stays aligned with the current bundled adapter registry', async () => {
	const sourceConfig = JSON.parse(await readFile(path.join(repoRoot, 'scripts', 'adapter-sources.json'), 'utf8'));
	const manifest = JSON.parse(await readFile(path.join(repoRoot, 'adapters', 'manifest.json'), 'utf8'));
	assert.deepEqual(Object.keys(sourceConfig.sources), manifest.adapters.map((entry) => entry.app));
	for (const repository of Object.values(sourceConfig.sources)) assert.equal(repository, normalizeRepositoryUrl(repository));
});
