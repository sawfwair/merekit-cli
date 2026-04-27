import type { RegistryEntry } from './types.js';

export function renderCompletion(shell: string | undefined, registry: RegistryEntry[]): string {
	const words = [
		'agent',
		'apps',
		'auth',
		'completion',
		'context',
		'mcp',
		'ops',
		'setup',
		...registry.flatMap((entry) => entry.aliases)
	]
		.filter((word, index, list) => list.indexOf(word) === index)
		.sort()
		.join(' ');

	switch ((shell ?? 'bash').trim().toLowerCase()) {
		case 'bash':
			return [
				'# mere bash completion',
				'_mere_completion() {',
				'  local cur="${COMP_WORDS[COMP_CWORD]}"',
				`  COMPREPLY=( $(compgen -W "${words}" -- "$cur") )`,
				'}',
				'complete -F _mere_completion mere',
				''
			].join('\n');
		case 'zsh':
			return `#compdef mere\n_arguments '*:command:(${words})'`;
		case 'fish':
			return `complete -c mere -f -a "${words}"`;
		default:
			throw new Error('Completion shell must be one of bash, zsh, or fish.');
	}
}
