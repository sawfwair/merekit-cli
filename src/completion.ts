import type { RegistryEntry } from './types.js';

export function renderCompletion(shell: string | undefined, registry: RegistryEntry[], dynamicCommands: Record<string, string[]> = {}): string {
	const topWords = [
		'agent',
		'apps',
		'auth',
		'completion',
		'context',
		'finance',
		'help',
		'mcp',
		'onboard',
		'ops',
		'setup',
		'skills',
		'tui',
		...registry.flatMap((entry) => entry.aliases)
	]
		.filter((word, index, list) => list.indexOf(word) === index)
		.sort()
		.join(' ');
	const subcommands: Record<string, string[]> = {
		agent: ['bootstrap', 'help'],
		apps: ['doctor', 'list', 'manifest'],
		auth: ['login', 'logout', 'status', 'whoami'],
		completion: ['bash', 'fish', 'zsh'],
		context: ['clear', 'get', 'set-workspace'],
		finance: ['profiles'],
		help: ['agent', 'mcp', 'onboard', 'safety', 'skills'],
		mcp: ['serve'],
		onboard: ['--app', '--base-domain', '--business-mode', '--existing-website-url', '--finance-base-url', '--finance-profile', '--interactive', '--invite-code', '--json', '--name', '--no-interactive', '--no-wait', '--output', '--slug', '--target', '--workspace'],
		ops: ['audit', 'doctor', 'smoke', 'workspace-snapshot'],
		setup: ['build', 'check', 'mere-run', 'smoke'],
		skills: ['install', 'list', 'publish', 'show'],
		tui: ['--app', '--base-domain', '--business-mode', '--dry-run', '--existing-website-url', '--finance-base-url', '--finance-profile', '--invite-code', '--name', '--no-wait', '--output', '--slug', '--target', '--waitlist-email', '--workspace'],
		...dynamicCommands
	};
	const thirdCommands: Record<string, string[]> = {
		'finance profiles': ['current', 'list', 'login', 'use'],
		'setup mere-run': ['model', 'models']
	};
	const bashCases = Object.entries(subcommands)
		.map(([command, words]) => `    ${command}) words="${words.join(' ')}" ;;`)
		.join('\n');
	const bashThirdCases = Object.entries(thirdCommands)
		.map(([command, words]) => `    ${command}) words="${words.join(' ')}" ;;`)
		.join('\n');
	const fishLines = [
		`complete -c mere -f -n '__fish_use_subcommand' -a "${topWords}"`,
		...Object.entries(subcommands).map(([command, words]) => `complete -c mere -f -n '__fish_seen_subcommand_from ${command}' -a "${words.join(' ')}"`),
		`complete -c mere -f -n '__fish_seen_subcommand_from finance; and __fish_seen_subcommand_from profiles' -a "${thirdCommands['finance profiles'].join(' ')}"`
	].join('\n');

	switch ((shell ?? 'bash').trim().toLowerCase()) {
		case 'bash':
			return [
				'# mere bash completion',
				'_mere_completion() {',
				'  local cur="${COMP_WORDS[COMP_CWORD]}"',
				'  local words',
				'  if [[ "$COMP_CWORD" -eq 1 ]]; then',
				`    words="${topWords}"`,
				'  elif [[ "$COMP_CWORD" -eq 2 ]]; then',
				'    case "${COMP_WORDS[1]}" in',
				bashCases,
				'      *) words="" ;;',
				'    esac',
				'  elif [[ "$COMP_CWORD" -eq 3 ]]; then',
				'    case "${COMP_WORDS[1]} ${COMP_WORDS[2]}" in',
				bashThirdCases,
				'      *) words="" ;;',
				'    esac',
				'  else',
				'    words=""',
				'  fi',
				'  COMPREPLY=( $(compgen -W "$words" -- "$cur") )',
				'}',
				'complete -F _mere_completion mere',
				''
			].join('\n');
		case 'zsh':
			return `#compdef mere\n_arguments '1:command:(${topWords})' '2:subcommand:->sub' '3:action:->action'\ncase "$words[2]" in\n${Object.entries(subcommands)
				.map(([command, words]) => `  ${command}) _values '${command} commands' ${words.join(' ')} ;;`)
				.join('\n')}\nesac\ncase "$words[2] $words[3]" in\n${Object.entries(thirdCommands)
				.map(([command, words]) => `  "${command}") _values '${command} commands' ${words.join(' ')} ;;`)
				.join('\n')}\nesac`;
		case 'fish':
			return fishLines;
		default:
			throw new Error('Completion shell must be one of bash, zsh, or fish.');
	}
}
