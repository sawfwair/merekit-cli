import process from 'node:process';
import readline from 'node:readline/promises';
import { readBooleanFlag, readStringFlag } from './args.js';
const WIDTH = 78;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function color(io, code, value) {
    if (io.env.NO_COLOR || io.env.TERM === 'dumb')
        return value;
    return `\u001b[${code}m${value}\u001b[0m`;
}
function cyan(io, value) {
    return color(io, '36', value);
}
function dim(io, value) {
    return color(io, '2', value);
}
function green(io, value) {
    return color(io, '32', value);
}
function yellow(io, value) {
    return color(io, '33', value);
}
function red(io, value) {
    return color(io, '31', value);
}
function stripAnsi(value) {
    return value.replace(/\u001b\[[0-9;]*m/g, '');
}
function fit(value, width) {
    const cleanLength = stripAnsi(value).length;
    if (cleanLength <= width)
        return `${value}${' '.repeat(width - cleanLength)}`;
    return `${value.slice(0, Math.max(0, width - 1))}...`;
}
function panel(io, title, lines) {
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
function humanCommand(args) {
    return ['mere', ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
}
function isInteractive(io) {
    const stdin = io.stdin ?? process.stdin;
    return Boolean(stdin.isTTY && process.stdout.isTTY);
}
function withOptionalFlag(args, name, value) {
    if (value?.trim())
        args.push(`--${name}`, value.trim());
}
function buildOnboardArgs(choices) {
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
function buildBusinessOnboardArgs(choices) {
    if (!choices.inviteCode?.trim())
        return null;
    const args = ['business', 'onboard', 'start', choices.inviteCode.trim()];
    withOptionalFlag(args, 'name', choices.businessName);
    withOptionalFlag(args, 'slug', choices.workspaceSlug);
    withOptionalFlag(args, 'business-mode', choices.businessMode);
    withOptionalFlag(args, 'base-domain', choices.baseDomain);
    withOptionalFlag(args, 'existing-website-url', choices.existingWebsiteUrl);
    if (choices.noWait)
        args.push('--no-wait');
    args.push('--json');
    return args;
}
function buildWaitlistArgs(choices) {
    if (!choices.waitlistEmail?.trim())
        return null;
    return ['business', 'waitlist', 'join', '--email', choices.waitlistEmail.trim()];
}
async function runWaitlistCommand(io, runCommand, waitlistArgs) {
    io.stdout(`\n${dim(io, 'Opening waitlist:')} ${humanCommand(waitlistArgs)}\n\n`);
    const waitlistResult = await runCommand(waitlistArgs);
    if (waitlistResult.stderr.trim())
        io.stderr(waitlistResult.stderr);
    if (waitlistResult.stdout.trim())
        io.stdout(waitlistResult.stdout);
    if (waitlistResult.code !== 0) {
        io.stderr(`Waitlist handoff failed with exit code ${waitlistResult.code}.\n`);
    }
    return waitlistResult.code;
}
function choicesFromFlags(flags) {
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
function classifyFirstUseValue(value) {
    const trimmed = value?.trim();
    if (!trimmed)
        return {};
    if (/^(ws_|workspace_)/i.test(trimmed))
        return { workspace: trimmed };
    if (EMAIL_RE.test(trimmed))
        return { waitlistEmail: trimmed };
    return { inviteCode: trimmed };
}
function parseReport(stdout) {
    try {
        const value = JSON.parse(stdout);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    }
    catch {
        return null;
    }
}
function records(value) {
    return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function workspaceFromInvitePayload(payload) {
    if (!payload)
        return undefined;
    const workspace = isRecord(payload.workspace) ? payload.workspace : null;
    if (typeof workspace?.id === 'string' && workspace.id.trim())
        return workspace.id.trim();
    if (typeof workspace?.slug === 'string' && workspace.slug.trim())
        return workspace.slug.trim();
    return undefined;
}
function renderInviteSummary(io, payload) {
    if (!payload)
        return panel(io, 'Invite', [yellow(io, 'Invite command finished, but its output was not JSON.'), 'Continuing to the readiness report.']);
    const workspace = isRecord(payload.workspace) ? payload.workspace : null;
    const state = String(payload.state ?? 'unknown');
    const workspaceLabel = typeof workspace?.slug === 'string'
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
function renderSummary(io, report) {
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
        if (!command)
            return '';
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
async function ask(rl, label, fallback) {
    const suffix = fallback ? ` [${fallback}]` : '';
    const answer = (await rl.question(`${label}${suffix}: `)).trim();
    return answer || fallback;
}
async function askBusinessMode(rl, fallback) {
    const answer = (await ask(rl, 'Business mode (new or existing, optional)', fallback))?.toLowerCase();
    return answer === 'new' || answer === 'existing' ? answer : undefined;
}
async function askApp(rl, entries, fallback) {
    const options = ['all', ...entries.map((entry) => entry.key)];
    const defaultValue = fallback && options.includes(fallback) ? fallback : 'all';
    const answer = (await rl.question(`App scope (${options.map((option, index) => `${index + 1}=${option}`).join(', ')}) [${defaultValue}]: `)).trim();
    if (!answer)
        return defaultValue;
    const asIndex = Number(answer);
    if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= options.length)
        return options[asIndex - 1] ?? defaultValue;
    return options.includes(answer) ? answer : defaultValue;
}
async function collectChoices(io, entries, initial) {
    const rl = readline.createInterface({
        input: io.stdin ?? process.stdin,
        output: process.stdout,
        terminal: true
    });
    try {
        io.stdout(panel(io, 'Mere First Use', [
            'Have an invite? Redeem it here and run safe checks.',
            'No invite yet? Enter an email and the UI opens the protected waitlist.',
            'Workspace IDs are for operators or re-running checks on an existing workspace.'
        ]));
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
        }
        else {
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
    }
    finally {
        rl.close();
    }
}
export async function runFirstUseTui(input) {
    const initial = choicesFromFlags(input.flags);
    if (readBooleanFlag(input.flags, 'dry-run')) {
        const waitlistArgs = buildWaitlistArgs(initial);
        const commands = (waitlistArgs ? [waitlistArgs] : [buildBusinessOnboardArgs(initial), buildOnboardArgs(initial)])
            .filter((args) => Array.isArray(args))
            .map(humanCommand);
        input.io.stdout(`${commands.join('\n')}\n`);
        return 0;
    }
    const directWaitlistArgs = buildWaitlistArgs(initial);
    if (directWaitlistArgs) {
        return runWaitlistCommand(input.io, input.runCommand, directWaitlistArgs);
    }
    if (!isInteractive(input.io)) {
        throw new Error('The Mere first-use TUI requires an interactive terminal. Use `mere business waitlist join --email EMAIL`, `mere business onboard start INVITE_CODE --json`, or `mere onboard --workspace WORKSPACE_ID --json` for headless runs.');
    }
    const choices = await collectChoices(input.io, input.entries, initial);
    const waitlistArgs = buildWaitlistArgs(choices);
    if (waitlistArgs) {
        return runWaitlistCommand(input.io, input.runCommand, waitlistArgs);
    }
    const businessArgs = buildBusinessOnboardArgs(choices);
    if (businessArgs) {
        input.io.stdout(`\n${dim(input.io, 'Running invite:')} ${humanCommand(businessArgs)}\n\n`);
        const inviteResult = await input.runCommand(businessArgs);
        if (inviteResult.stderr.trim())
            input.io.stderr(inviteResult.stderr);
        if (inviteResult.code !== 0) {
            input.io.stderr(`Invite onboarding failed with exit code ${inviteResult.code}.\n`);
            if (inviteResult.stdout.trim())
                input.io.stdout(inviteResult.stdout);
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
    if (result.stderr.trim())
        input.io.stderr(result.stderr);
    if (result.code !== 0) {
        input.io.stderr(`Onboarding failed with exit code ${result.code}.\n`);
        if (result.stdout.trim())
            input.io.stdout(result.stdout);
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
