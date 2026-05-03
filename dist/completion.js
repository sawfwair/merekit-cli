export function renderCompletion(shell, registry, dynamicCommands = {}) {
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
        ...registry.flatMap((entry) => entry.aliases)
    ]
        .filter((word, index, list) => list.indexOf(word) === index)
        .sort()
        .join(' ');
    const subcommands = {
        agent: ['bootstrap', 'help'],
        apps: ['doctor', 'list', 'manifest'],
        auth: ['login', 'logout', 'status', 'whoami'],
        completion: ['bash', 'fish', 'zsh'],
        context: ['clear', 'get', 'set-workspace'],
        finance: ['profiles'],
        help: ['agent', 'mcp', 'safety', 'skills'],
        mcp: ['serve'],
        onboard: ['--app', '--finance-base-url', '--finance-profile', '--json', '--no-interactive', '--output', '--target', '--workspace'],
        ops: ['audit', 'doctor', 'smoke', 'workspace-snapshot'],
        setup: ['build', 'check', 'smoke'],
        skills: ['install', 'list', 'publish', 'show'],
        ...dynamicCommands
    };
    const thirdCommands = {
        'finance profiles': ['current', 'list', 'login', 'use']
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
