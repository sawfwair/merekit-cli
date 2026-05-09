import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
export function resolvePath(value) {
    if (value === '~')
        return os.homedir();
    if (value.startsWith('~/'))
        return path.join(os.homedir(), value.slice(2));
    if (path.isAbsolute(value))
        return value;
    const callerCwd = process.env.PWD?.trim();
    const base = callerCwd ? path.resolve(callerCwd) : process.cwd();
    return path.resolve(base, value);
}
export async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
