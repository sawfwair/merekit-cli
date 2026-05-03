import { z } from 'zod';
import { appendAudit, redactOutput } from './audit.js';
import { loadManifest } from './manifest.js';
import { resolveMerePaths } from './paths.js';
import { runCapture } from './process.js';
import { createRegistry, executionCwd, resolveCli } from './registry.js';
import { isWriteLikeCommand } from './safety.js';
const toolInputSchema = z.object({
    args: z.array(z.string()).optional(),
    workspace: z.string().optional(),
    baseUrl: z.string().optional(),
    profile: z.string().optional(),
    json: z.boolean().optional(),
    data: z.unknown().optional(),
    dataFile: z.string().optional(),
    yes: z.boolean().optional(),
    confirm: z.string().optional()
});
function toolName(entry, command) {
    return `mere_${entry.namespace}_${command.path.join('_')}`.replace(/[^A-Za-z0-9_]/g, '_');
}
export async function listMcpTools(entries, allowWrites, env) {
    const tools = [];
    for (const entry of entries) {
        const manifest = await loadManifest(entry, env);
        if (!manifest.ok || !manifest.manifest)
            continue;
        for (const command of manifest.manifest.commands) {
            const writeLike = isWriteLikeCommand(command);
            if (writeLike && !allowWrites)
                continue;
            tools.push({
                name: toolName(entry, command),
                description: `${entry.label}: ${command.summary}`,
                entry,
                command
            });
        }
    }
    return tools;
}
function inputToArgs(input, command) {
    const args = [...command.path, ...(input.args ?? [])];
    if (input.workspace)
        args.push('--workspace', input.workspace);
    if (input.baseUrl)
        args.push('--base-url', input.baseUrl);
    if (input.profile)
        args.push('--profile', input.profile);
    if (input.json ?? command.supportsJson)
        args.push('--json');
    if (input.data !== undefined)
        args.push('--data', JSON.stringify(input.data));
    if (input.dataFile)
        args.push('--data-file', input.dataFile);
    if (input.yes)
        args.push('--yes');
    if (input.confirm)
        args.push('--confirm', input.confirm);
    return args;
}
async function invokeTool(io, spec, rawInput) {
    const input = toolInputSchema.parse(rawInput ?? {});
    if ((spec.command.requiresYes || spec.command.risk === 'destructive' || spec.command.risk === 'external') && input.yes !== true) {
        throw new Error(`${spec.name} requires yes: true.`);
    }
    if (spec.command.requiresConfirm && !input.confirm?.trim()) {
        throw new Error(`${spec.name} requires exact confirm.`);
    }
    const resolved = await resolveCli(spec.entry, io.env);
    const args = inputToArgs(input, spec.command);
    const cwd = executionCwd(spec.entry, resolved);
    const started = Date.now();
    const result = await runCapture(resolved.command, [...resolved.args, ...args], {
        cwd,
        env: io.env,
        timeoutMs: 120_000
    });
    await appendAudit(resolveMerePaths(io.env), {
        timestamp: new Date(started).toISOString(),
        kind: 'mcp',
        app: spec.entry.key,
        command: spec.command.path,
        argv: [...resolved.args, ...args],
        exitCode: result.code,
        durationMs: Date.now() - started,
        cwd
    }).catch(() => undefined);
    if (result.code !== 0) {
        throw new Error(result.stderr.trim() || `${spec.name} exited with code ${result.code}.`);
    }
    return redactOutput(result.stdout.trim()) || JSON.stringify({ ok: true });
}
function registerToolCompat(server, spec, handler) {
    const anyServer = server;
    const callback = async (input) => ({
        content: [{ type: 'text', text: await handler(input) }]
    });
    if (typeof anyServer.registerTool === 'function') {
        anyServer.registerTool(spec.name, { title: spec.name, description: spec.description, inputSchema: toolInputSchema }, callback);
        return;
    }
    if (typeof anyServer.tool === 'function') {
        anyServer.tool(spec.name, spec.description, toolInputSchema, callback);
        return;
    }
    throw new Error('Installed MCP SDK does not expose registerTool/tool.');
}
export async function runMcpServer(options) {
    const [{ McpServer }, { StdioServerTransport }] = await Promise.all([
        import('@modelcontextprotocol/sdk/server/mcp.js'),
        import('@modelcontextprotocol/sdk/server/stdio.js')
    ]);
    const paths = resolveMerePaths(options.io.env);
    const registry = createRegistry(paths.mereRoot, paths.packageRoot);
    const server = new McpServer({ name: 'mere', version: '0.1.0' });
    const tools = await listMcpTools(registry, options.allowWrites, options.io.env);
    for (const spec of tools) {
        registerToolCompat(server, spec, (input) => invokeTool(options.io, spec, input));
    }
    await server.connect(new StdioServerTransport());
}
