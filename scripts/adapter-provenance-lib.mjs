import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export const ADAPTER_MANIFEST_SCHEMA_VERSION = 2;
export const CONTRACT_ROOT = 'contracts/mere-console/v1';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const ACCEPTED_CHECK_CONCLUSIONS = new Set(['neutral', 'skipped', 'success']);

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		env: options.env ?? process.env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		const detail = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
		throw new Error(`${command} ${args.join(' ')} failed with ${result.status}${detail ? `: ${detail}` : ''}`);
	}
	return result.stdout.trim();
}

export function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

export function canonicalJson(value) {
	if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
		return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
	}
	return JSON.stringify(value);
}

export function normalizeRepositoryUrl(value) {
	const raw = String(value ?? '').trim().replace(/\/+$/u, '');
	const scpMatch = /^git@github\.com:([^/]+)\/(.+)$/u.exec(raw);
	const sshMatch = /^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/u.exec(raw);
	const httpsMatch = /^https:\/\/github\.com\/([^/]+)\/(.+)$/u.exec(raw);
	const match = scpMatch ?? sshMatch ?? httpsMatch;
	if (!match) throw new Error(`Unsupported canonical repository URL: ${raw || '<empty>'}`);
	const owner = match[1].toLowerCase();
	const repository = match[2].replace(/\.git$/u, '').toLowerCase();
	if (!/^[a-z0-9_.-]+$/u.test(owner) || !/^[a-z0-9_.-]+$/u.test(repository) || owner.includes('..') || repository.includes('..')) {
		throw new Error(`Unsupported canonical repository URL: ${raw || '<empty>'}`);
	}
	return `https://github.com/${owner}/${repository}.git`;
}

export function parseGitHubRepository(value) {
	const canonical = normalizeRepositoryUrl(value);
	const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\.git$/u.exec(canonical);
	if (!match) throw new Error(`Unable to parse GitHub repository URL: ${canonical}`);
	return { owner: match[1], repository: match[2], canonical };
}

async function listRegularFiles(root, current = root) {
	const entries = await readdir(current, { withFileTypes: true });
	const files = [];
	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
		const absolute = path.join(current, entry.name);
		if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in adapter evidence: ${absolute}`);
		if (entry.isDirectory()) {
			files.push(...await listRegularFiles(root, absolute));
			continue;
		}
		if (!entry.isFile()) throw new Error(`Unsupported adapter evidence entry: ${absolute}`);
		files.push(path.relative(root, absolute).split(path.sep).join('/'));
	}
	return files;
}

export async function digestDirectory(root) {
	const rootStat = await lstat(root);
	if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`Evidence root must be a regular directory: ${root}`);
	const files = await listRegularFiles(root);
	const hash = createHash('sha256');
	const entries = [];
	for (const relativePath of files) {
		const absolute = path.join(root, relativePath);
		const bytes = await readFile(absolute);
		const entry = { path: relativePath, sha256: sha256(bytes), size: bytes.byteLength };
		entries.push(entry);
		hash.update(`${Buffer.byteLength(relativePath)}:${relativePath}:${bytes.byteLength}:`);
		hash.update(bytes);
	}
	return { sha256: hash.digest('hex'), files: entries };
}

export async function collectAdapterArtifacts(outputRoot, app) {
	const adapterRoot = path.join(outputRoot, app);
	const digest = await digestDirectory(adapterRoot);
	return Promise.all(digest.files.map(async (entry) => {
		const fileStat = await lstat(path.join(adapterRoot, entry.path));
		return {
			path: `adapters/${app}/${entry.path}`,
			sha256: entry.sha256,
			size: entry.size,
			mode: (fileStat.mode & 0o777).toString(8).padStart(3, '0')
		};
	}));
}

export async function inspectContract(repoPath) {
	const contractRoot = path.join(repoPath, CONTRACT_ROOT);
	if (!existsSync(contractRoot)) return null;
	const schemaRelativePath = `${CONTRACT_ROOT}/mere-console-contract.v1.schema.json`;
	const fixturesRelativePath = `${CONTRACT_ROOT}/fixtures`;
	const schemaPath = path.join(repoPath, schemaRelativePath);
	const fixturesPath = path.join(repoPath, fixturesRelativePath);
	if (!existsSync(schemaPath) || !existsSync(fixturesPath)) {
		throw new Error(`${CONTRACT_ROOT} must contain the canonical schema and fixtures directory.`);
	}
	const repositoryRealPath = await realpath(repoPath);
	for (const candidate of [contractRoot, schemaPath, fixturesPath]) {
		const candidateRealPath = await realpath(candidate);
		const candidateStat = await lstat(candidate);
		if (!candidateRealPath.startsWith(`${repositoryRealPath}${path.sep}`) || candidateStat.isSymbolicLink()) {
			throw new Error(`${path.relative(repoPath, candidate)} must be a non-symlinked path inside its source repository.`);
		}
	}
	const schema = await readFile(schemaPath);
	const fixtures = await digestDirectory(fixturesPath);
	if (fixtures.files.length === 0) throw new Error(`${fixturesRelativePath} must not be empty.`);
	return {
		name: 'mere-console',
		version: 1,
		schema: {
			path: schemaRelativePath,
			sha256: sha256(schema),
			size: schema.byteLength
		},
		fixtures: {
			path: fixturesRelativePath,
			sha256: fixtures.sha256,
			files: fixtures.files.length
		}
	};
}

function header(response, name) {
	if (!response?.headers) return null;
	if (typeof response.headers.get === 'function') return response.headers.get(name);
	const match = Object.entries(response.headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
	return match?.[1] ?? null;
}

async function githubJson(fetchImpl, url, token) {
	const response = await fetchImpl(url, {
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${token}`,
			'x-github-api-version': '2022-11-28'
		}
	});
	if (!response.ok) throw new Error(`GitHub evidence request failed with HTTP ${response.status} for ${url}.`);
	return { value: await response.json(), link: header(response, 'link') };
}

function latestBy(values, keyFor) {
	const latest = new Map();
	for (const value of values) {
		const key = keyFor(value);
		const previous = latest.get(key);
		const previousTime = Date.parse(previous?.submitted_at ?? previous?.started_at ?? previous?.created_at ?? 0);
		const valueTime = Date.parse(value?.submitted_at ?? value?.started_at ?? value?.created_at ?? 0);
		if (!previous || valueTime > previousTime || (valueTime === previousTime && Number(value.id ?? 0) > Number(previous.id ?? 0))) {
			latest.set(key, value);
		}
	}
	return [...latest.values()];
}

export async function verifyGitHubReviewEvidence(options) {
	const { owner, repository, canonical } = parseGitHubRepository(options.canonicalRepository);
	const token = String(options.token ?? '').trim();
	if (!token) throw new Error(`Release provenance for ${canonical} requires GH_TOKEN to verify review and checks.`);
	const fetchImpl = options.fetchImpl ?? globalThis.fetch;
	if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required for GitHub evidence verification.');
	const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
	const pullsResponse = await githubJson(fetchImpl, `${apiRoot}/commits/${options.commit}/pulls?per_page=100`, token);
	if (pullsResponse.link?.includes('rel="next"')) throw new Error(`Associated pull-request evidence for ${canonical} is unexpectedly paginated.`);
	const pulls = Array.isArray(pullsResponse.value) ? pullsResponse.value : [];
	const pull = pulls.find((candidate) =>
		candidate?.merged_at
		&& candidate?.draft === false
		&& candidate?.base?.ref === options.defaultBranch
		&& candidate?.merge_commit_sha === options.commit
	);
	if (!pull) {
		throw new Error(`${canonical}@${options.commit} is not the exact merge commit of a merged, non-draft pull request into ${options.defaultBranch}.`);
	}

	const reviewsResponse = await githubJson(fetchImpl, `${apiRoot}/pulls/${pull.number}/reviews?per_page=100`, token);
	if (reviewsResponse.link?.includes('rel="next"')) throw new Error(`Review evidence for ${pull.html_url} is unexpectedly paginated.`);
	const decisiveReviews = (Array.isArray(reviewsResponse.value) ? reviewsResponse.value : [])
		.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review?.state));
	const latestReviews = latestBy(decisiveReviews, (review) => review?.user?.login ?? `unknown-${review?.id}`);
	const approvedBy = latestReviews
		.filter((review) => review?.state === 'APPROVED')
		.filter((review) => review?.user?.login && review.user.login !== pull?.user?.login)
		.filter((review) => review?.user?.type === 'User')
		.filter((review) => review?.commit_id === pull?.head?.sha)
		.map((review) => review.user.login)
		.sort();
	if (approvedBy.length === 0) {
		throw new Error(`${pull.html_url} has no non-author approval bound to its exact head commit ${pull?.head?.sha ?? '<missing>'}.`);
	}

	const checksResponse = await githubJson(fetchImpl, `${apiRoot}/commits/${options.commit}/check-runs?per_page=100`, token);
	if (checksResponse.link?.includes('rel="next"')) throw new Error(`Check-run evidence for ${canonical}@${options.commit} is unexpectedly paginated.`);
	const checkRuns = latestBy(Array.isArray(checksResponse.value?.check_runs) ? checksResponse.value.check_runs : [], (check) => `${check?.app?.slug ?? 'unknown'}:${check?.name ?? 'unknown'}`)
		.sort((left, right) => `${left?.app?.slug}:${left?.name}`.localeCompare(`${right?.app?.slug}:${right?.name}`));
	if (checkRuns.length === 0) throw new Error(`${canonical}@${options.commit} has no completed CI check evidence.`);
	const unacceptable = checkRuns.filter((check) => check?.status !== 'completed' || !ACCEPTED_CHECK_CONCLUSIONS.has(check?.conclusion));
	if (unacceptable.length > 0) {
		const summary = unacceptable.map((check) => `${check?.name ?? '<unnamed>'}:${check?.status ?? '<missing>'}/${check?.conclusion ?? '<missing>'}`).join(', ');
		throw new Error(`${canonical}@${options.commit} has pending or red CI checks: ${summary}.`);
	}
	if (!checkRuns.some((check) => check.conclusion === 'success')) {
		throw new Error(`${canonical}@${options.commit} has no successful CI check.`);
	}

	const statusResponse = await githubJson(fetchImpl, `${apiRoot}/commits/${options.commit}/status`, token);
	const statuses = Array.isArray(statusResponse.value?.statuses) ? statusResponse.value.statuses : [];
	if (statuses.length > 0 && statusResponse.value?.state !== 'success') {
		throw new Error(`${canonical}@${options.commit} has non-success commit status ${statusResponse.value?.state ?? '<missing>'}.`);
	}

	const normalizedChecks = checkRuns.map((check) => ({
		app: check?.app?.slug ?? 'unknown',
		name: check?.name ?? 'unknown',
		conclusion: check.conclusion
	}));
	return {
		pullRequest: pull.html_url,
		pullRequestNumber: pull.number,
		pullRequestHeadCommit: pull.head.sha,
		mergedAt: pull.merged_at,
		approvedBy,
		checks: normalizedChecks,
		checksSha256: sha256(canonicalJson(normalizedChecks))
	};
}

export async function inspectSourceRepository(options) {
	const canonicalRepository = normalizeRepositoryUrl(options.canonicalRepository);
	let actualRepository = null;
	try {
		const actualRepositoryRaw = run('git', ['remote', 'get-url', 'origin'], { cwd: options.repoPath });
		try {
			actualRepository = normalizeRepositoryUrl(actualRepositoryRaw);
		} catch {
			actualRepository = actualRepositoryRaw;
		}
	} catch (error) {
		if (options.release) throw error;
	}
	if (options.release && actualRepository !== canonicalRepository) {
		throw new Error(`${options.app} origin mismatch: expected ${canonicalRepository}, got ${actualRepository}.`);
	}
	const commit = run('git', ['rev-parse', 'HEAD'], { cwd: options.repoPath });
	const tree = run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: options.repoPath });
	const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: options.repoPath });
	const unmergedFiles = run('git', ['ls-files', '--unmerged'], { cwd: options.repoPath });
	const clean = status.length === 0;
	const hasUnmergedFiles = unmergedFiles.length > 0;
	const trackedRemoteRef = `refs/remotes/origin/${options.defaultBranch}`;
	let trackedRemoteHead = null;
	try {
		trackedRemoteHead = run('git', ['rev-parse', '--verify', trackedRemoteRef], { cwd: options.repoPath });
	} catch {
		// Development builds record missing local tracking state; releases verify the live remote below.
	}

	let remoteHead = trackedRemoteHead;
	let review = null;
	if (options.release) {
		if (hasUnmergedFiles) throw new Error(`${options.app} source has unmerged paths.`);
		if (!clean) throw new Error(`${options.app} source is dirty; release adapter builds require a clean source tree.`);
		const liveRemote = run('git', ['ls-remote', '--exit-code', 'origin', `refs/heads/${options.defaultBranch}`], { cwd: options.repoPath });
		remoteHead = liveRemote.split(/\s+/u)[0] ?? null;
		if (!COMMIT_PATTERN.test(remoteHead ?? '')) throw new Error(`${options.app} canonical ${options.defaultBranch} head was not resolved.`);
		if (commit !== remoteHead) {
			throw new Error(`${options.app} source ${commit} is not the live canonical ${options.defaultBranch} head ${remoteHead}; draft, unmerged, ahead, and stale inputs are refused.`);
		}
		review = await verifyGitHubReviewEvidence({
			canonicalRepository,
			commit,
			defaultBranch: options.defaultBranch,
			token: options.githubToken,
			fetchImpl: options.fetchImpl
		});
	}

	const commitTimestamp = Number(run('git', ['show', '-s', '--format=%ct', commit], { cwd: options.repoPath }));
	return {
		canonicalRepository,
		actualRepository,
		canonicalRemote: actualRepository === canonicalRepository,
		commit,
		tree,
		clean,
		hasUnmergedFiles,
		defaultBranch: options.defaultBranch,
		remoteHead,
		localTrackingHead: trackedRemoteHead,
		remoteHeadEvidence: options.release ? 'live-ls-remote' : 'local-tracking-ref',
		mergedToDefaultBranch: options.release ? remoteHead === commit : null,
		commitTimestamp,
		review
	};
}

function assertObject(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertHash(value, label) {
	if (!HASH_PATTERN.test(value ?? '')) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
}

export async function verifyAdapterManifest(options) {
	const manifestPath = path.join(options.packageRoot, 'adapters', 'manifest.json');
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	if (manifest.schemaVersion !== ADAPTER_MANIFEST_SCHEMA_VERSION) {
		throw new Error(`adapters/manifest.json schemaVersion must be ${ADAPTER_MANIFEST_SCHEMA_VERSION}; current schema ${manifest.schemaVersion ?? '<missing>'} is legacy and cannot be published.`);
	}
	const packageJson = JSON.parse(await readFile(path.join(options.packageRoot, 'package.json'), 'utf8'));
	const expectedPnpm = String(packageJson.packageManager ?? '').replace(/^pnpm@/u, '');
	const expectedEsbuild = packageJson.devDependencies?.esbuild;
	if (!Array.isArray(manifest.adapters) || manifest.adapters.length === 0) throw new Error('Adapter provenance manifest must contain adapters.');
	if (!/^\d+$/u.test(manifest.sourceDateEpoch ?? '') || new Date(Number(manifest.sourceDateEpoch) * 1000).toISOString() !== manifest.builtAt) {
		throw new Error('Adapter provenance builtAt must be the exact UTC rendering of sourceDateEpoch.');
	}
	if (manifest.sourceMapSha256 !== sha256(canonicalJson(options.sources))) {
		throw new Error('Adapter provenance source map digest does not match the reviewed canonical source map.');
	}
	const expectedApps = Object.keys(options.sources);
	const actualApps = manifest.adapters.map((entry) => entry?.app);
	if (canonicalJson(actualApps) !== canonicalJson(expectedApps)) {
		throw new Error(`Adapter provenance order mismatch: expected ${expectedApps.join(', ')}, got ${actualApps.join(', ')}.`);
	}
	if (options.release) {
		if (manifest.mode !== 'release') throw new Error('Adapter provenance manifest must come from release mode.');
		if (manifest.reproducibility?.passes !== 2 || manifest.reproducibility?.byteIdentical !== true
			|| manifest.reproducibility?.algorithm !== 'sha256-file-inventory-v1'
			|| manifest.reproducibility?.machinePathScan !== true || manifest.reproducibility?.credentialScan !== true
			|| manifest.reproducibility?.canonicalSourcesRevalidated !== true) {
			throw new Error('Adapter provenance manifest lacks a successful two-pass byte comparison.');
		}
	}

	const commitTimestamps = [];
	for (const entry of manifest.adapters) {
		assertObject(entry, `${entry?.app ?? '<unknown>'} entry`);
		const expectedRepository = normalizeRepositoryUrl(options.sources[entry.app]);
		const { repository: expectedRepoName } = parseGitHubRepository(expectedRepository);
		if (entry.sourceRepoPath !== expectedRepoName || entry.adapterPath !== `adapters/${entry.app}/run.js` || entry.builtAt !== manifest.builtAt) {
			throw new Error(`${entry.app} canonical source, adapter path, or build time is invalid.`);
		}
		assertObject(entry.source, `${entry.app}.source`);
		if (normalizeRepositoryUrl(entry.source.canonicalRepository) !== expectedRepository) {
			throw new Error(`${entry.app} canonical repository does not match the reviewed source map.`);
		}
		if (!COMMIT_PATTERN.test(entry.source.commit ?? '') || !COMMIT_PATTERN.test(entry.source.tree ?? '')) {
			throw new Error(`${entry.app} source commit and tree must be exact Git object IDs.`);
		}
		if (typeof entry.source.clean !== 'boolean' || typeof entry.source.hasUnmergedFiles !== 'boolean') {
			throw new Error(`${entry.app} source cleanliness evidence is missing.`);
		}
		if (typeof entry.source.artifactTracked !== 'boolean') throw new Error(`${entry.app} source artifact tracking evidence is missing.`);
		if (entry.source.defaultBranch !== 'main' || !Number.isSafeInteger(entry.source.commitTimestamp) || entry.source.commitTimestamp < 1) {
			throw new Error(`${entry.app} default branch or source commit timestamp is invalid.`);
		}
		commitTimestamps.push(entry.source.commitTimestamp);
		if (typeof entry.sourceArtifactPath !== 'string' || path.isAbsolute(entry.sourceArtifactPath)
			|| entry.sourceArtifactPath.includes('..') || entry.sourceArtifactPath.includes('\\')
			|| path.posix.normalize(entry.sourceArtifactPath) !== entry.sourceArtifactPath) {
			throw new Error(`${entry.app} source artifact path is not canonical and repository-relative.`);
		}
		if (options.release) {
			if (!entry.source.clean || entry.source.hasUnmergedFiles || !entry.source.mergedToDefaultBranch || entry.source.remoteHead !== entry.source.commit
				|| entry.source.actualRepository !== expectedRepository || entry.source.canonicalRemote !== true) {
				throw new Error(`${entry.app} source is not clean and bound to its canonical default branch head.`);
			}
			if (entry.source.remoteHeadEvidence !== 'live-ls-remote') throw new Error(`${entry.app} source lacks live canonical remote evidence.`);
			assertObject(entry.source.review, `${entry.app}.source.review`);
			if (!Array.isArray(entry.source.review.approvedBy) || entry.source.review.approvedBy.length === 0) {
				throw new Error(`${entry.app} source review approval evidence is missing.`);
			}
			if (!Number.isSafeInteger(entry.source.review.pullRequestNumber) || entry.source.review.pullRequestNumber < 1
				|| !COMMIT_PATTERN.test(entry.source.review.pullRequestHeadCommit ?? '')
				|| typeof entry.source.review.pullRequest !== 'string'
				|| !entry.source.review.pullRequest.startsWith(expectedRepository.replace(/\.git$/u, '/pull/'))) {
				throw new Error(`${entry.app} source pull-request evidence is invalid.`);
			}
			if (!entry.source.review.pullRequest.endsWith(`/pull/${entry.source.review.pullRequestNumber}`)
				|| !Number.isFinite(Date.parse(entry.source.review.mergedAt ?? ''))
				|| entry.source.review.approvedBy.some((reviewer) => typeof reviewer !== 'string' || !reviewer)
				|| canonicalJson(entry.source.review.approvedBy) !== canonicalJson([...new Set(entry.source.review.approvedBy)].sort())) {
				throw new Error(`${entry.app} source pull-request review details are invalid or non-canonical.`);
			}
			if (!Array.isArray(entry.source.review.checks) || entry.source.review.checks.length === 0
				|| entry.source.review.checks.some((check) => check?.conclusion !== 'success' && check?.conclusion !== 'neutral' && check?.conclusion !== 'skipped')
				|| !entry.source.review.checks.some((check) => check?.conclusion === 'success')) {
				throw new Error(`${entry.app} source green-check evidence is invalid.`);
			}
			assertHash(entry.source.review.checksSha256, `${entry.app}.source.review.checksSha256`);
			if (entry.source.review.checksSha256 !== sha256(canonicalJson(entry.source.review.checks))) {
				throw new Error(`${entry.app} source check digest does not match its check inventory.`);
			}
		}
		assertObject(entry.build, `${entry.app}.build`);
		if (!Array.isArray(entry.build.commands) || entry.build.commands.length === 0
			|| entry.build.commands.some((command) => typeof command?.executable !== 'string' || !command.executable
				|| !Array.isArray(command.args) || command.args.some((argument) => typeof argument !== 'string' || path.isAbsolute(argument))
				|| command.workingDirectory !== 'source')) {
			throw new Error(`${entry.app} deterministic build commands are missing or machine-dependent.`);
		}
		assertObject(entry.build.toolchain, `${entry.app}.build.toolchain`);
		for (const key of ['node', 'pnpm', 'esbuild']) {
			if (typeof entry.build.toolchain[key] !== 'string' || !entry.build.toolchain[key]) throw new Error(`${entry.app} build toolchain ${key} is missing.`);
		}
		if (!/^v24\.\d+\.\d+$/u.test(entry.build.toolchain.node)
			|| entry.build.toolchain.pnpm !== expectedPnpm
			|| entry.build.toolchain.esbuild !== expectedEsbuild
			|| (entry.build.toolchain.sourcePackageManager !== null && entry.build.toolchain.sourcePackageManager !== `pnpm@${expectedPnpm}`)) {
			throw new Error(`${entry.app} build toolchain does not match the pinned release toolchain.`);
		}
		if (!Array.isArray(entry.build.toolchain.sourceLockfiles) || entry.build.toolchain.sourceLockfiles.length === 0) {
			throw new Error(`${entry.app} source dependency lockfile evidence is missing.`);
		}
		for (const lockfile of entry.build.toolchain.sourceLockfiles) {
			assertHash(lockfile?.sha256, `${entry.app} source lockfile`);
			if (typeof lockfile?.path !== 'string' || path.isAbsolute(lockfile.path) || lockfile.path.includes('..')
				|| !Number.isSafeInteger(lockfile?.size) || lockfile.size < 0) {
				throw new Error(`${entry.app} source lockfile evidence is invalid.`);
			}
		}
		if (entry.build.deterministicEnvironment?.SOURCE_DATE_EPOCH !== manifest.sourceDateEpoch
			|| entry.build.deterministicEnvironment?.TZ !== 'UTC'
			|| entry.build.deterministicEnvironment?.LC_ALL !== 'C') {
			throw new Error(`${entry.app} deterministic build environment is invalid.`);
		}
		if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) throw new Error(`${entry.app} artifact evidence is missing.`);
		const expectedPrefix = `adapters/${entry.app}/`;
		const actualArtifacts = [];
		for (const artifact of entry.artifacts) {
			if (typeof artifact.path !== 'string' || !artifact.path.startsWith(expectedPrefix) || artifact.path.includes('..')
				|| artifact.path.includes('\\') || path.posix.normalize(artifact.path) !== artifact.path) {
				throw new Error(`${entry.app} artifact path is outside its bundle.`);
			}
			assertHash(artifact.sha256, `${entry.app} ${artifact.path}`);
			if (!Number.isSafeInteger(artifact.size) || artifact.size < 0) throw new Error(`${entry.app} ${artifact.path} has an invalid size.`);
			if (!/^[0-7]{3}$/u.test(artifact.mode ?? '')) throw new Error(`${entry.app} ${artifact.path} has an invalid file mode.`);
			const absolute = path.join(options.packageRoot, artifact.path);
			const fileStat = await lstat(absolute);
			if (!fileStat.isFile() || fileStat.isSymbolicLink()) throw new Error(`${artifact.path} must be a regular file.`);
			const bytes = await readFile(absolute);
			const actualMode = (fileStat.mode & 0o777).toString(8).padStart(3, '0');
			if (bytes.byteLength !== artifact.size || sha256(bytes) !== artifact.sha256 || actualMode !== artifact.mode) {
				throw new Error(`${artifact.path} does not match its recorded SHA-256, size, and mode.`);
			}
			actualArtifacts.push({ path: artifact.path, sha256: artifact.sha256, size: artifact.size, mode: artifact.mode });
		}
		const onDiskArtifacts = await collectAdapterArtifacts(path.join(options.packageRoot, 'adapters'), entry.app);
		if (canonicalJson(actualArtifacts) !== canonicalJson(onDiskArtifacts)) {
			throw new Error(`${entry.app} artifact inventory does not exactly cover the bundled directory.`);
		}
		if (!Object.hasOwn(entry, 'contract')) throw new Error(`${entry.app} Contract evidence must be explicit.`);
		if (entry.contract !== null) {
			assertObject(entry.contract, `${entry.app}.contract`);
			if (entry.contract.name !== 'mere-console' || entry.contract.version !== 1) throw new Error(`${entry.app} Contract identity is invalid.`);
			if (entry.contract.schema?.path !== `${CONTRACT_ROOT}/mere-console-contract.v1.schema.json`
				|| entry.contract.fixtures?.path !== `${CONTRACT_ROOT}/fixtures`) {
				throw new Error(`${entry.app} Contract paths are not canonical.`);
			}
			assertHash(entry.contract.schema?.sha256, `${entry.app}.contract.schema.sha256`);
			assertHash(entry.contract.fixtures?.sha256, `${entry.app}.contract.fixtures.sha256`);
			if (!Number.isSafeInteger(entry.contract.schema?.size) || entry.contract.schema.size < 1) throw new Error(`${entry.app} Contract schema size is invalid.`);
			if (!Number.isSafeInteger(entry.contract.fixtures?.files) || entry.contract.fixtures.files < 1) throw new Error(`${entry.app} Contract fixture count is invalid.`);
		}
	}
	if (String(Math.max(...commitTimestamps)) !== manifest.sourceDateEpoch) {
		throw new Error('Adapter provenance sourceDateEpoch is not the newest exact source commit timestamp.');
	}
	return manifest;
}
