import type { CommandRisk, ManifestCommand } from './types.js';

export const ALLOWED_COMMAND_RISKS: ReadonlySet<CommandRisk> = new Set([
	'read',
	'write',
	'destructive',
	'external'
]);

export const WRITE_LIKE_COMMAND_SEGMENTS = new Set([
	'add',
	'approve',
	'archive',
	'assign',
	'bootstrap',
	'buy',
	'cancel',
	'change',
	'close',
	'confirm',
	'connect',
	'create',
	'delete',
	'disconnect',
	'discard',
	'fulfill',
	'generate',
	'import',
	'inbound',
	'invite',
	'login',
	'logout',
	'migrate',
	'move',
	'observe',
	'pause',
	'prepare',
	'provision',
	'read',
	'redeem',
	'reanalyze',
	'refresh',
	'refund',
	'regenerate',
	'register',
	'remove',
	'reorder',
	'reopen',
	'replace',
	'reply',
	'resend',
	'resume',
	'resolve',
	'restore',
	'revoke',
	'route',
	'send',
	'set',
	'snooze',
	'star',
	'start',
	'stop',
	'sync',
	'update',
	'upsert',
	'use'
]);

export const READ_ONLY_EXACT_COMMANDS = new Set([
	'commands',
	'completion',
	'diagnostics.provider-sync',
	'import.status',
	'tenant.resolve'
]);

export const WRITE_LIKE_EXACT_COMMANDS = new Set([
	'db.query'
]);

export function commandId(command: ManifestCommand): string {
	return command.path.join('.');
}

export function commandSegments(command: ManifestCommand): string[] {
	return [...command.path, command.summary]
		.flatMap((part) => part.toLowerCase().split(/[^a-z0-9]+/u))
		.filter(Boolean);
}

export function hasWriteLikeShape(command: ManifestCommand): boolean {
	if (WRITE_LIKE_EXACT_COMMANDS.has(commandId(command))) return true;
	if (READ_ONLY_EXACT_COMMANDS.has(commandId(command))) return false;
	if (command.supportsData) return true;
	return commandSegments(command).some((segment) => WRITE_LIKE_COMMAND_SEGMENTS.has(segment));
}

export function isWriteLikeCommand(command: ManifestCommand): boolean {
	if (WRITE_LIKE_EXACT_COMMANDS.has(commandId(command))) return true;
	if (READ_ONLY_EXACT_COMMANDS.has(commandId(command))) return false;
	if (command.risk !== 'read') return true;
	return hasWriteLikeShape(command);
}

export function manifestCommandSafetyErrors(command: ManifestCommand): string[] {
	const errors: string[] = [];
	const risk = command.risk;
	if (!ALLOWED_COMMAND_RISKS.has(risk)) {
		errors.push(`risk must be one of ${[...ALLOWED_COMMAND_RISKS].join(', ')}`);
	}
	if (risk === 'read' && command.supportsData) {
		errors.push('read commands must not support structured mutation data');
	}
	if (risk === 'read' && hasWriteLikeShape(command)) {
		errors.push('write-shaped command is marked read');
	}
	if (risk === 'destructive' && command.requiresYes !== true) {
		errors.push('destructive commands must require yes');
	}
	return errors;
}
