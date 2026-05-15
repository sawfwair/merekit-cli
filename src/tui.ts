import { openSync } from 'node:fs';
import process from 'node:process';
import readline from 'node:readline/promises';
import type { Interface } from 'node:readline/promises';
import { ReadStream, WriteStream } from 'node:tty';
import { Box, Text, renderToString } from 'ink';
import type { BoxProps, TextProps } from 'ink';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { readBooleanFlag, readStringFlag } from './args.js';
import type { FlagValue } from './args.js';
import { parseJson } from './json.js';
import type { RegistryEntry } from './types.js';

type TuiIO = {
	stdout: (text: string) => void;
	stderr: (text: string) => void;
	env: NodeJS.ProcessEnv;
	stdin?: ReadStream | undefined;
	promptOutput?: NodeJS.WritableStream | undefined;
};

type CapturedCommand = {
	code: number;
	stdout: string;
	stderr: string;
};

type FirstUseChoices = {
	inviteCode?: string | undefined;
	waitlistEmail?: string | undefined;
	workspace?: string | undefined;
	app?: string | undefined;
	target: 'codex' | 'claude';
	output?: string | undefined;
	businessName?: string | undefined;
	workspaceSlug?: string | undefined;
	businessMode?: 'new' | 'existing' | undefined;
	baseDomain?: string | undefined;
	existingWebsiteUrl?: string | undefined;
	noWait?: boolean | undefined;
	financeProfile?: string | undefined;
	financeBaseUrl?: string | undefined;
};

type PromptStreams = {
	input: ReadStream;
	output: NodeJS.WritableStream;
	close: () => void;
};

const WIDTH = 78;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const h = createElement;

type InkTone = 'blue' | 'cyan' | 'green' | 'magenta' | 'red' | 'yellow';

function canUseColor(io: TuiIO): boolean {
	return !io.env.NO_COLOR && io.env.TERM !== 'dumb';
}

function inkColor(useColor: boolean, tone: InkTone): InkTone | undefined {
	return useColor ? tone : undefined;
}

function textProps(input: { useColor: boolean; tone?: InkTone | undefined; bold?: boolean | undefined; dim?: boolean | undefined }): TextProps {
	return {
		...(input.useColor && input.tone ? { color: input.tone } : {}),
		...(input.useColor && input.bold ? { bold: true } : {}),
		...(input.useColor && input.dim ? { dimColor: true } : {})
	};
}

function renderInk(node: ReactNode): string {
	return `${renderToString(node, { columns: WIDTH })}\n`;
}

function line(content: string, useColor: boolean, tone?: InkTone): ReactNode {
	return h(Text, textProps({ useColor, tone }), content || ' ');
}

function rows(items: ReactNode[]): ReactNode[] {
	return items.map((item, index) => h(Box, { key: index }, item));
}

function Shell(input: {
	title: string;
	eyebrow?: string | undefined;
	tone: InkTone;
	useColor: boolean;
	children?: ReactNode;
	footer?: string | undefined;
}): ReactNode {
	const accent = inkColor(input.useColor, input.tone);
	const boxProps: BoxProps = {
		borderStyle: 'round',
		flexDirection: 'column',
		paddingX: 1,
		width: WIDTH,
		...(accent ? { borderColor: accent } : {})
	};
	return h(
		Box,
		boxProps,
		h(
			Box,
			{ justifyContent: 'space-between' },
			h(Text, textProps({ useColor: input.useColor, tone: input.tone, bold: true }), input.title),
			input.eyebrow ? h(Text, textProps({ useColor: input.useColor, dim: true }), input.eyebrow) : null
		),
		h(Box, { flexDirection: 'column', marginTop: 1 }, input.children),
		input.footer ? h(Box, { marginTop: 1 }, h(Text, textProps({ useColor: input.useColor, dim: true }), input.footer)) : null
	);
}

function KeyValue(input: { label: string; value: string; tone?: InkTone | undefined; useColor: boolean }): ReactNode {
	return h(
		Box,
		null,
		h(Box, { width: 16 }, h(Text, textProps({ useColor: input.useColor, dim: true }), input.label)),
		h(Text, textProps({ useColor: input.useColor, tone: input.tone }), input.value)
	);
}

function Lane(input: { label: string; value: string; command: string; tone: InkTone; useColor: boolean }): ReactNode {
	return h(
		Box,
		{ flexDirection: 'column', marginBottom: 1 },
		h(Box, null, h(Box, { width: 15 }, h(Text, textProps({ useColor: input.useColor, tone: input.tone, bold: true }), input.label)), h(Text, null, input.value)),
		h(Box, { marginLeft: 15 }, h(Text, textProps({ useColor: input.useColor, dim: true }), input.command))
	);
}

function IntroView(input: { entries: RegistryEntry[]; useColor: boolean }): ReactNode {
	const appNames = input.entries
		.map((entry) => entry.key)
		.filter((key) => key !== 'business')
		.slice(0, 6)
		.join(', ');
	return h(
		Shell,
		{
			title: 'Mere First Use',
			eyebrow: 'invite -> workspace -> agent-ready',
			tone: 'cyan',
			useColor: input.useColor,
			footer: appNames ? `App scopes include all, ${appNames}${input.entries.length > 6 ? ', ...' : ''}` : undefined
		},
		...rows([
			line('Start with whatever you have. The prompts turn it into the safest next command.', input.useColor),
			h(
				Box,
				{ flexDirection: 'column', marginTop: 1 },
				h(Lane, {
					label: 'Invite code',
					value: 'Redeem the business invite, then run workspace readiness.',
					command: 'mere business onboard start INVITE_CODE --json',
					tone: 'green',
					useColor: input.useColor
				}),
				h(Lane, {
					label: 'Email',
					value: 'Open the protected waitlist handoff with your email filled in.',
					command: 'mere business waitlist join --email EMAIL',
					tone: 'yellow',
					useColor: input.useColor
				}),
				h(Lane, {
					label: 'Workspace',
					value: 'Operator path for re-running checks on an existing workspace.',
					command: 'mere onboard --workspace WORKSPACE_ID --json',
					tone: 'magenta',
					useColor: input.useColor
				})
			)
		])
	);
}

function CommandBanner(input: { title: string; command: string; tone: InkTone; useColor: boolean }): ReactNode {
	return h(
		Shell,
		{ title: input.title, eyebrow: 'command handoff', tone: input.tone, useColor: input.useColor },
		h(Text, textProps({ useColor: input.useColor, tone: input.tone }), input.command)
	);
}

function humanCommand(args: string[]): string {
	return ['mere', ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
}

function openDevTty(): PromptStreams | null {
	try {
		const input = new ReadStream(openSync('/dev/tty', 'r'));
		const output = new WriteStream(openSync('/dev/tty', 'w'));
		return {
			input,
			output,
			close: () => {
				input.destroy();
				output.end();
			}
		};
	} catch {
		return null;
	}
}

function promptStreams(io: TuiIO): PromptStreams | null {
	const stdin = io.stdin ?? process.stdin;
	if (stdin.isTTY) {
		return {
			input: stdin,
			output: io.promptOutput ?? process.stdout,
			close: () => undefined
		};
	}
	if (io.env.CI === 'true' || io.env.MERE_INTERACTIVE === '0') return null;
	if (io.env.MERE_INTERACTIVE !== '1' && !process.stdout.isTTY && !process.stderr.isTTY) return null;
	return openDevTty();
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

function buildWaitlistArgs(choices: FirstUseChoices): string[] | null {
	if (!choices.waitlistEmail?.trim()) return null;
	return ['business', 'waitlist', 'join', '--email', choices.waitlistEmail.trim()];
}

async function runWaitlistCommand(
	io: TuiIO,
	runCommand: (args: string[]) => Promise<CapturedCommand>,
	waitlistArgs: string[]
): Promise<number> {
	io.stdout(`\n${renderCommandBanner(io, 'Opening waitlist:', waitlistArgs, 'yellow')}\n`);
	const waitlistResult = await runCommand(waitlistArgs);
	if (waitlistResult.stderr.trim()) io.stderr(waitlistResult.stderr);
	if (waitlistResult.stdout.trim()) io.stdout(waitlistResult.stdout);
	if (waitlistResult.code !== 0) {
		io.stderr(`Waitlist handoff failed with exit code ${waitlistResult.code}.\n`);
	}
	return waitlistResult.code;
}

function choicesFromFlags(flags: Record<string, FlagValue>): FirstUseChoices {
	const target = readStringFlag(flags, 'target') === 'claude' ? 'claude' : 'codex';
	const businessMode = readStringFlag(flags, 'business-mode');
	return {
		inviteCode: readStringFlag(flags, 'invite-code'),
		waitlistEmail: readStringFlag(flags, 'waitlist-email'),
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

function classifyFirstUseValue(value: string | undefined): Pick<FirstUseChoices, 'inviteCode' | 'waitlistEmail' | 'workspace'> {
	const trimmed = value?.trim();
	if (!trimmed) return {};
	if (/^(ws_|workspace_)/i.test(trimmed)) return { workspace: trimmed };
	if (EMAIL_RE.test(trimmed)) return { waitlistEmail: trimmed };
	return { inviteCode: trimmed };
}

function parseReport(stdout: string): Record<string, unknown> | null {
	try {
		const value = parseJson(stdout);
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
	const useColor = canUseColor(io);
	if (!payload) {
		return renderInk(
			h(
				Shell,
				{ title: 'Invite', eyebrow: 'handoff complete', tone: 'yellow', useColor },
				...rows([
					line('Invite command finished, but its output was not JSON.', useColor, 'yellow'),
					line('Continuing to the readiness report.', useColor)
				])
			)
		);
	}
	const workspace = isRecord(payload.workspace) ? payload.workspace : null;
	const state = String(payload.state ?? 'unknown');
	const workspaceLabel =
		typeof workspace?.slug === 'string'
			? `${workspace.slug}${typeof workspace.host === 'string' ? ` (${workspace.host})` : ''}`
			: typeof workspace?.id === 'string'
				? workspace.id
				: 'not returned yet';
	const nextUrl = typeof payload.nextUrl === 'string' ? payload.nextUrl : undefined;
	return renderInk(
		h(
			Shell,
			{ title: 'Invite Redeemed', eyebrow: 'workspace seed ready', tone: 'green', useColor },
			...rows([
				h(KeyValue, { label: 'state', value: state, tone: state === 'ready' ? 'green' : 'yellow', useColor }),
				h(KeyValue, { label: 'workspace', value: workspaceLabel, tone: 'cyan', useColor }),
				...(nextUrl ? [h(KeyValue, { label: 'next', value: nextUrl, tone: 'magenta', useColor })] : [])
			])
		)
	);
}

function renderSummary(io: TuiIO, report: Record<string, unknown>): string {
	const useColor = canUseColor(io);
	const score = typeof report.readinessScore === 'number' ? report.readinessScore : 0;
	const workspace = String(report.workspace ?? 'not selected');
	const apps = records(report.apps);
	const remediation = records(report.remediation);
	const blocked = remediation.some((item) => item.blocking === true);
	const status = score >= 90 ? 'Ready' : blocked ? 'Blocked' : 'Needs attention';
	const tone: InkTone = score >= 90 ? 'green' : blocked ? 'red' : 'yellow';
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
	return renderInk(
		h(
			Shell,
			{ title: 'Mere First Use', eyebrow: 'readiness report', tone, useColor },
			h(
				Box,
				{ flexDirection: 'column' },
				h(Text, textProps({ useColor, tone, bold: true }), `${status} (${score}/100)`),
				h(KeyValue, { label: 'workspace', value: workspace, tone: 'cyan', useColor }),
				h(KeyValue, { label: 'artifacts', value: String(report.outputDir ?? 'not written'), tone: 'magenta', useColor }),
				h(Box, { marginTop: 1, flexDirection: 'column' }, h(Text, textProps({ useColor, bold: true }), 'Apps'), ...(appLines.length ? appLines.map((item) => line(item, useColor)) : [line('No apps reported.', useColor, 'yellow')])),
				h(
					Box,
					{ marginTop: 1, flexDirection: 'column' },
					h(Text, textProps({ useColor, bold: true }), 'Next commands'),
					...(nextLines.length ? nextLines.map((item) => line(item, useColor, 'cyan')) : [line('none', useColor)])
				)
			)
		)
	);
}

function renderCommandBanner(io: TuiIO, title: string, args: string[], tone: InkTone): string {
	return renderInk(h(CommandBanner, { title, command: humanCommand(args), tone, useColor: canUseColor(io) }));
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

async function collectChoices(io: TuiIO, entries: RegistryEntry[], initial: FirstUseChoices, streams: PromptStreams): Promise<FirstUseChoices> {
	const rl = readline.createInterface({
		input: streams.input,
		output: streams.output,
		terminal: true
	});
	try {
		io.stdout(renderInk(h(IntroView, { entries, useColor: canUseColor(io) })));
		const firstUseValue = await ask(rl, 'Invite code, waitlist email, or operator workspace ID', initial.waitlistEmail ?? initial.inviteCode ?? initial.workspace);
		const firstUse = classifyFirstUseValue(firstUseValue);
		const inviteCode = firstUse.inviteCode;
		const waitlistEmail = firstUse.waitlistEmail;
		let workspace = firstUse.workspace;
		let businessName = initial.businessName;
		let workspaceSlug = initial.workspaceSlug;
		let businessMode = initial.businessMode;
		let baseDomain = initial.baseDomain;
		let existingWebsiteUrl = initial.existingWebsiteUrl;
		if (waitlistEmail) {
			return {
				waitlistEmail,
				app: initial.app ?? 'all',
				target: initial.target,
				noWait: initial.noWait
			};
		}
		if (inviteCode) {
			businessName = await ask(rl, 'Business name override (optional)', initial.businessName);
			workspaceSlug = await ask(rl, 'Workspace slug override (optional)', initial.workspaceSlug);
			businessMode = await askBusinessMode(rl, initial.businessMode);
			baseDomain = await ask(rl, 'Workspace base domain (optional)', initial.baseDomain);
			if (businessMode === 'existing') {
				existingWebsiteUrl = await ask(rl, 'Existing website URL (optional)', initial.existingWebsiteUrl);
			}
		} else if (!workspace) {
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
		const waitlistArgs = buildWaitlistArgs(initial);
		const commands = (waitlistArgs ? [waitlistArgs] : [buildBusinessOnboardArgs(initial), buildOnboardArgs(initial)])
			.filter((args): args is string[] => Array.isArray(args))
			.map(humanCommand);
		input.io.stdout(`${commands.join('\n')}\n`);
		return 0;
	}
	const directWaitlistArgs = buildWaitlistArgs(initial);
	if (directWaitlistArgs) {
		return runWaitlistCommand(input.io, input.runCommand, directWaitlistArgs);
	}
	const streams = promptStreams(input.io);
	if (!streams) {
		throw new Error('Mere interactive onboarding requires an interactive terminal. Use `mere business waitlist join --email EMAIL`, `mere business onboard start INVITE_CODE --json`, or `mere onboard --workspace WORKSPACE_ID --json` for headless runs. If your shell wrapper pipes stdin but you are at a terminal, set MERE_INTERACTIVE=1 to use /dev/tty for prompts.');
	}
	let choices: FirstUseChoices;
	try {
		choices = await collectChoices(input.io, input.entries, initial, streams);
	} finally {
		streams.close();
	}
	const waitlistArgs = buildWaitlistArgs(choices);
	if (waitlistArgs) {
		return runWaitlistCommand(input.io, input.runCommand, waitlistArgs);
	}
	const businessArgs = buildBusinessOnboardArgs(choices);
	if (businessArgs) {
		input.io.stdout(`\n${renderCommandBanner(input.io, 'Running invite', businessArgs, 'magenta')}\n`);
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
			input.io.stdout(
				renderInk(
					h(
						Shell,
						{ title: 'Workspace pending', eyebrow: 'continuing readiness checks', tone: 'yellow', useColor: canUseColor(input.io) },
						line('No workspace id was returned yet; the readiness report will show workspace-scoped blockers if provisioning is still pending.', canUseColor(input.io), 'yellow')
					)
				)
			);
		}
	}
	const args = buildOnboardArgs(choices);
	input.io.stdout(`\n${renderCommandBanner(input.io, 'Running readiness', args, 'cyan')}\n`);
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
