export function parseArgs(argv) {
    const positionals = [];
    const flags = {};
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (!arg?.startsWith('--')) {
            if (arg)
                positionals.push(arg);
            continue;
        }
        const eq = arg.indexOf('=');
        if (eq > 2) {
            flags[arg.slice(2, eq)] = arg.slice(eq + 1);
            continue;
        }
        const name = arg.slice(2);
        const next = argv[index + 1];
        if (next && !next.startsWith('--')) {
            flags[name] = next;
            index += 1;
        }
        else {
            flags[name] = true;
        }
    }
    return { positionals, flags };
}
export function boolFlag(flags, name) {
    return flags[name] === true || flags[name] === 'true' || flags[name] === '1';
}
export function stringFlag(flags, name) {
    const value = flags[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
