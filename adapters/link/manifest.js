export const VERSION = 'mere-link 0.1.0';
export const DEFAULT_CONFIG = 'mere.link.yaml';
export const HELP_TEXT = `mere-link

Usage:
  mere-link commands --json
  mere-link completion bash|zsh|fish
  mere-link config init [--workspace ID] [--name NAME] [--output FILE] [--yes] [--json]
  mere-link config validate [--config FILE] [--json]
  mere-link config inspect [--config FILE] [--json]
  mere-link generate workspace --workspace ID [--output FILE] [--yes] [--json]
  mere-link generate workspace --snapshot-file FILE [--output FILE] [--yes] [--json]
  mere-link entities list [--config FILE] [--json]
  mere-link projects list [entity] [--config FILE] [--json]
  mere-link surfaces list [entity] [project] [--config FILE] [--json]
  mere-link links list [--config FILE] [--json]
  mere-link context inspect <entity> [project] [--role ROLE] [--config FILE] [--json]
  mere-link sync projects [entity] [project] [--config FILE] [--workspace ID] [--apply] [--json]

mere.link.yaml declares entities, projects, integrations, role surfaces, and links.
It can be used by itself, with a few Mere apps, or with a full Mere workspace.`;
function command(pathParts, summary, options = {}) {
    return {
        id: pathParts.join('.'),
        path: pathParts,
        summary,
        auth: 'none',
        risk: options.risk ?? 'read',
        supportsJson: options.supportsJson ?? true,
        supportsData: false,
        requiresYes: false,
        requiresConfirm: false,
        positionals: options.positionals ?? [],
        flags: options.flags ?? [],
        ...(options.auditDefault ? { auditDefault: true } : {})
    };
}
export const MANIFEST_COMMANDS = [
    command(['commands'], 'Print the machine-readable mere.link command manifest.', { flags: ['json'] }),
    command(['completion'], 'Print shell completion for mere-link.', { supportsJson: false, positionals: ['shell'] }),
    command(['config', 'validate'], 'Validate a link YAML config.', { flags: ['config'] }),
    command(['config', 'inspect'], 'Summarize a link YAML config.', { flags: ['config'] }),
    command(['config', 'init'], 'Write a starter link YAML config.', { risk: 'write', flags: ['output', 'workspace', 'name', 'yes'] }),
    command(['generate', 'workspace'], 'Generate starter link YAML from a Mere workspace snapshot.', { risk: 'write', flags: ['workspace', 'snapshot-file', 'output', 'name', 'yes'] }),
    command(['entities', 'list'], 'List configured entities.', { flags: ['config'] }),
    command(['projects', 'list'], 'List configured projects for one entity or all entities.', { flags: ['config'], positionals: ['entity'] }),
    command(['surfaces', 'list'], 'List configured role surfaces.', { flags: ['config'], positionals: ['entity', 'project'] }),
    command(['links', 'list'], 'List explicit links between configured surfaces.', { flags: ['config'] }),
    command(['context', 'inspect'], 'Show one entity/project context and optional role surface.', { flags: ['config', 'role'], positionals: ['entity', 'project'] }),
    command(['sync', 'projects'], 'Plan or apply Mere Projects project/link materialization from this graph.', {
        risk: 'write',
        flags: ['config', 'workspace', 'apply', 'mere-bin', 'role', 'date-start', 'json'],
        positionals: ['entity', 'project']
    })
];
export function manifest() {
    return {
        schemaVersion: 1,
        app: 'mere-link',
        namespace: 'link',
        aliases: ['link', 'links', 'mere-link', 'merekit-link'],
        auth: { kind: 'none' },
        baseUrlEnv: [],
        sessionPath: null,
        globalFlags: ['config', 'workspace', 'snapshot-file', 'output', 'name', 'role', 'date-start', 'json', 'yes', 'apply', 'mere-bin'],
        commands: MANIFEST_COMMANDS
    };
}
export function renderCompletion(shell) {
    if (shell === 'bash') {
        return `# mere-link bash completion
_mere_link_completion() {
  COMPREPLY=($(compgen -W "commands completion config generate entities projects surfaces links context sync" -- "\${COMP_WORDS[COMP_CWORD]}"))
}
complete -F _mere_link_completion mere-link`;
    }
    if (shell === 'zsh')
        return '#compdef mere-link\n_arguments "1:command:(commands completion config generate entities projects surfaces links context sync)"';
    if (shell === 'fish')
        return 'complete -c mere-link -f -a "commands completion config generate entities projects surfaces links context sync"';
    return 'commands completion config generate entities projects surfaces links context sync';
}
