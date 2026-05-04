import process from 'node:process';
import readline from 'node:readline/promises';
import type { Interface } from 'node:readline/promises';
import type { ReadStream } from 'node:tty';
import { readBooleanFlag, readStringFlag } from './args.js';
import type { FlagValue } from './args.js';
import type { RegistryEntry } from './types.js';

type TuiIO = {
	stdout: (text: string) => void;
	stderr: (text: string) => void;
	env: NodeJS.ProcessEnv;
	stdin?: ReadStream;
};

type CapturedCommand = {
	code: number;
	stdout: string;
	stderr: string;
};

type FirstUseChoices = {
	inviteCode?: string;
	workspace?: string;
	app?: string;
	target: 'codex' | 'claude';
	output?: string;
	businessName?: string;
	workspaceSlug?: string;
	businessMode?: 'new' | 'existing';
	baseDomain?: string;
	existingWebsiteUrl?: string;
	noWait?: boolean;
	financeProfile?: string;
	financeBaseUrl?: string;
};

const WIDTH = 78;

function color(io: TuiIO, code: string, value: string): string {
	if (io.env.NO_COLOR || io.env.TERM === 'dumb') return value;
	return `\u001b[${code}m${value}\u001b[0m`;
}

function cyan(io: TuiIO, value: string): string {
	return color(io, '36', value);
}

function dim(io: TuiIO, value: string): string {
	return color(io, '2', value);
}

function green(io: TuiIO, value: string): string {
	return color(io, '32', value);
}

function yellow(io: TuiIO, value: string): string {
	return color(io, '33', value);
}

function red(io: TuiIO, value: string): string {
	return color(io, '31', value);
}

function stripAnsi(value: string): string {
	return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function fit(value: string, width: number): string {
	const cleanLength = stripAnsi(value).length;
	if (cleanLength <= width) return `${value}${' '.repeat(width - cleanLength)}`;
	return `${value.slice(0, Math.max(0, width - 1))}...`;
}

function panel(io: TuiIO, title: string, lines: string[]): string {
	const inner = WIDTH - 4;
	const output = [
		`+${'-'.repeat(WIDTH - 2)}+`,
		`| ${fit(cyan(io, title), inner)} |`,
		`+${'-'.repeat(WIDTH - 2)}+`,
		...lines.map((line) => `| ${fit(line, inner)} |`),
		`+${'-'.repeat(WIDTH - 2)}+`
	];
	return `${output.join('\n')}\n`;
}

function humanCommand(args: string[]): string {
	return ['mere', ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
}

function isInteractive(io: TuiIO): boolean {
	const stdin = io.stdin ?? process.stdin;
	return Boolean(stdin.isTTY && process.stdout.isTTY);
}

function withOptionalFlag(args: string[], name: string, value: string | undefined): void {
	if (value?.trim()) args.push(`--${name}`, value.trim());
}

function buildOnboardArgs(choices: FirstUseChoices): string[] {
	const args = ['onboard'];
	withOptionalFlag(args, 'app', choices.app === 'all' ? undefined : choices.app);
	withOptionalFlag(args, 'workspace', choices.workspace);
	withOptionalFlag(args, 'target', choices.target);
	withOptionalFlag(args, 'output', choices.output);
	withOptionalFlag(args, 'finance-profile', choices.financeProfile);
	withOptionalFlag(args, 'finance-base-url', choices.financeBaseUrl);
	args.push('--json');
	return args;
}

function buildBusinessOnboardArgs(choices: FirstUseChoices): string[] | null {
	if (!choices.inviteCode?.trim()) return null;
	const args = ['business', 'onboard', 'start', choices.inviteCode.trim()];
	withOptionalFlag(args, 'name', choices.businessName);
	withOptionalFlag(args, 'slug', choices.workspaceSlug);
	withOptionalFlag(args, 'business-mode', choices.businessMode);
	withOptionalFlag(args, 'base-domain', choices.baseDomain);
	withOptionalFlag(args, 'existing-website-url', choices.existingWebsiteUrl);
	if (choices.noWait) args.push('--no-wait');
	args.push('--json');
	return args;
}

function choicesFromFlags(flags: Record<string, FlagValue>): FirstUseChoices {
	const target = readStringFlag(flags, 'target') === 'claude' ? 'claude' : 'codex';
	const businessMode = readStringFlag(flags, 'business-mode');
	return {
		inviteCode: readStringFlag(flags, 'invite-code'),
		workspace: readStringFlag(flags, 'workspace'),
		app: readStringFlag(flags, 'app') ?? 'all',
		target,
		output: readStringFlag(flags, 'output'),
		businessName: readStringFlag(flags, 'name'),
		workspaceSlug: readStringFlag(flags, 'slug'),
		businessMode: businessMode === 'new' || businessMode === 'existing' ? businessMode : undefined,
		baseDomain: readStringFlag(flags, 'base-domain'),
		existingWebsiteUrl: readStringFlag(flags, 'existing-website-url'),
		noWait: readBooleanFlag(flags, 'no-wait'),
		financeProfile: readStringFlag(flags, 'finance-profile'),
		financeBaseUrl: readStringFlag(flags, 'finance-base-url')
	};
}

function classifyFirstUseValue(value: string | undefined): Pick<FirstUseChoices, 'inviteCode' | 'workspace'> {
	const trimmed = value?.trim();
	if (!trimmed) return {};
	if (/^(ws_|workspace_)/i.test(trimmed)) return { workspace: trimmed };
	return { inviteCode: trimmed };
}

function parseReport(stdout: string): Record<string, unknown> | null {
	try {
		const value = JSON.parse(stdout) as unknown;
		return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function records(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function workspaceFromInvitePayload(payload: Record<string, unknown> | null): string | undefined {
	if (!payload) return undefined;
	const workspace = isRecord(payload.workspace) ? payload.workspace : null;
	if (typeof workspace?.id === 'string' && workspace.id.trim()) return workspace.id.trim();
	if (typeof workspace?.slug === 'string' && workspace.slug.trim()) return workspace.slug.trim();
	return undefined;
}

function renderInviteSummary(io: TuiIO, payload: Record<string, unknown> | null): string {
	if (!payload) return panel(io, 'Invite', [yellow(io, 'Invite command finished, but its output was not JSON.'), 'Continuing to the readiness report.']);
	const workspace = isRecord(payload.workspace) ? payload.workspace : null;
	const state = String(payload.state ?? 'unknown');
	const workspaceLabel =
		typeof workspace?.slug === 'string'
			? `${workspace.slug}${typeof workspace.host === 'string' ? ` (${workspace.host})` : ''}`
			: typeof workspace?.id === 'string'
				? workspace.id
				: 'not returned yet';
	const nextUrl = typeof payload.nextUrl === 'string' ? payload.nextUrl : undefined;
	return panel(io, 'Invite Redeemed', [
		`state: ${state}`,
		`workspace: ${workspaceLabel}`,
		...(nextUrl ? [`next: ${nextUrl}`] : [])
	]);
}

function renderSummary(io: TuiIO, report: Record<string, unknown>): string {
	const score = typeof report.readinessScore === 'number' ? report.readinessScore : 0;
	const workspace = String(report.workspace ?? 'not selected');
	const apps = records(report.apps);
	const remediation = records(report.remediation);
	const blocked = remediation.some((item) => item.blocking === true);
	const status = score >= 90 ? green(io, 'Ready') : blocked ? red(io, 'Blocked') : yellow(io, 'Needs attention');
	const appLines = apps.slice(0, 8).map((app) => {
		const appName = String(app.app ?? 'app');
		const appStatus = String(app.status ?? 'unknown');
		const appScore = String(app.readinessScore ?? '-');
		return `${appName.padEnd(10)} ${appStatus.padEnd(16)} ${appScore.padStart(3)}/100`;
	});
	const nextLines = remediation
		.map((item, index) => {
			const command = typeof item.nextCommand === 'string' ? item.nextCommand : '';
			if (!command) return '';
			return `${String(index + 1).padStart(2)}. ${command}`;
		})
		.filter(Boolean)
		.slice(0, 8);
	return panel(io, 'Mere First Use', [
		`${status} (${score}/100)`,
		`workspace: ${workspace}`,
		'',
		...(appLines.length ? appLines : ['No apps reported.']),
		'',
		...(nextLines.length ? ['Next commands:', ...nextLines] : ['Next commands: none']),
		'',
		`Artifacts: ${String(report.outputDir ?? 'not written')}`
	]);
}

async function ask(rl: Interface, label: string, fallback?: string): Promise<string | undefined> {
	const suffix = fallback ? ` [${fallback}]` : '';
	const answer = (await rl.question(`${label}${suffix}: `)).trim();
	return answer || fallback;
}

async function askBusinessMode(rl: Interface, fallback: 'new' | 'existing' | undefined): Promise<'new' | 'existing' | undefined> {
	const answer = (await ask(rl, 'Business mode (new or existing, optional)', fallback))?.toLowerCase();
	return answer === 'new' || answer === 'existing' ? answer : undefined;
}

async function askApp(rl: Interface, entries: RegistryEntry[], fallback: string | undefined): Promise<string> {
	const options = ['all', ...entries.map((entry) => entry.key)];
	const defaultValue = fallback && options.includes(fallback) ? fallback : 'all';
	const answer = (await rl.question(`App scope (${options.map((option, index) => `${index + 1}=${option}`).join(', ')}) [${defaultValue}]: `)).trim();
	if (!answer) return defaultValue;
	const asIndex = Number(answer);
	if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= options.length) return options[asIndex - 1] ?? defaultValue;
	return options.includes(answer) ? answer : defaultValue;
}

async function collectChoices(io: TuiIO, entries: RegistryEntry[], initial: FirstUseChoices): Promise<FirstUseChoices> {
	const rl = readline.createInterface({
		input: io.stdin ?? process.stdin,
		output: process.stdout,
		terminal: true
	});
	try {
		io.stdout(panel(io, 'Mere First Use', [
			'Most users start with a Mere invite code.',
			'The UI can redeem the invite, bootstrap the workspace, then run safe checks.',
			'Workspace IDs are for operators or re-running checks on an existing workspace.'
		]));
		const firstUseValue = await ask(rl, 'Invite code (or operator workspace ID)', initial.inviteCode ?? initial.workspace);
		const firstUse = classifyFirstUseValue(firstUseValue);
		const inviteCode = firstUse.inviteCode;
		let workspace = firstUse.workspace;
		let businessName = initial.businessName;
		let workspaceSlug = initial.workspaceSlug;
		let businessMode = initial.businessMode;
		let baseDomain = initial.baseDomain;
		let existingWebsiteUrl = initial.existingWebsiteUrl;
		if (inviteCode) {
			businessName = await ask(rl, 'Business name override (optional)', initial.businessName);
			workspaceSlug = await ask(rl, 'Workspace slug override (optional)', initial.workspaceSlug);
			businessMode = await askBusinessMode(rl, initial.businessMode);
			baseDomain = await ask(rl, 'Workspace base domain (optional)', initial.baseDomain);
			if (businessMode === 'existing') {
				existingWebsiteUrl = await ask(rl, 'Existing website URL (optional)', initial.existingWebsiteUrl);
			}
		} else {
			workspace = await ask(rl, 'Operator workspace ID', initial.workspace);
		}
		const app = await askApp(rl, entries, initial.app);
		const targetAnswer = await ask(rl, 'Agent target (codex or claude)', initial.target);
		const target = targetAnswer === 'claude' ? 'claude' : 'codex';
		const output = await ask(rl, 'Output directory', initial.output);
		let financeProfile = initial.financeProfile;
		let financeBaseUrl = initial.financeBaseUrl;
		if (app === 'all' || app === 'finance') {
			financeProfile = await ask(rl, 'Finance profile for remediation', initial.financeProfile ?? 'default');
			financeBaseUrl = await ask(rl, 'Finance base URL for remediation (optional)', initial.financeBaseUrl);
		}
		return {
			inviteCode,
			workspace,
			app,
			target,
			output,
			businessName,
			workspaceSlug,
			businessMode,
			baseDomain,
			existingWebsiteUrl,
			noWait: initial.noWait,
			financeProfile,
			financeBaseUrl
		};
	} finally {
		rl.close();
	}
}

export async function runFirstUseTui(input: {
	io: TuiIO;
	entries: RegistryEntry[];
	flags: Record<string, FlagValue>;
	runCommand: (args: string[]) => Promise<CapturedCommand>;
}): Promise<number> {
	const initial = choicesFromFlags(input.flags);
	if (readBooleanFlag(input.flags, 'dry-run')) {
		const commands = [buildBusinessOnboardArgs(initial), buildOnboardArgs(initial)]
			.filter((args): args is string[] => Array.isArray(args))
			.map(humanCommand);
		input.io.stdout(`${commands.join('\n')}\n`);
		return 0;
	}
	if (!isInteractive(input.io)) {
		throw new Error('The Mere first-use TUI requires an interactive terminal. Use `mere business onboard start INVITE_CODE --json` or `mere onboard --workspace WORKSPACE_ID --json` for headless runs.');
	}
	const choices = await collectChoices(input.io, input.entries, initial);
	const businessArgs = buildBusinessOnboardArgs(choices);
	if (businessArgs) {
		input.io.stdout(`\n${dim(input.io, 'Running invite:')} ${humanCommand(businessArgs)}\n\n`);
		const inviteResult = await input.runCommand(businessArgs);
		if (inviteResult.stderr.trim()) input.io.stderr(inviteResult.stderr);
		if (inviteResult.code !== 0) {
			input.io.stderr(`Invite onboarding failed with exit code ${inviteResult.code}.\n`);
			if (inviteResult.stdout.trim()) input.io.stdout(inviteResult.stdout);
			return inviteResult.code;
		}
		const invitePayload = parseReport(inviteResult.stdout);
		input.io.stdout(renderInviteSummary(input.io, invitePayload));
		choices.workspace = choices.workspace ?? workspaceFromInvitePayload(invitePayload);
		if (!choices.workspace) {
			input.io.stdout(`${yellow(input.io, 'No workspace id was returned yet; the readiness report will show workspace-scoped blockers if provisioning is still pending.')}\n\n`);
		}
	}
	const args = buildOnboardArgs(choices);
	input.io.stdout(`\n${dim(input.io, 'Running:')} ${humanCommand(args)}\n\n`);
	const result = await input.runCommand(args);
	if (result.stderr.trim()) input.io.stderr(result.stderr);
	if (result.code !== 0) {
		input.io.stderr(`Onboarding failed with exit code ${result.code}.\n`);
		if (result.stdout.trim()) input.io.stdout(result.stdout);
		return result.code;
	}
	const report = parseReport(result.stdout);
	if (!report) {
		input.io.stdout(result.stdout);
		return result.code;
	}
	input.io.stdout(renderSummary(input.io, report));
	return 0;
}
