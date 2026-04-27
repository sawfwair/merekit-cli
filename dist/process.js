import { spawn } from 'node:child_process';
import process from 'node:process';
export async function runCapture(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env ?? process.env,
            stdio: [options.stdin ?? 'ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        const timeout = options.timeoutMs === undefined
            ? null
            : setTimeout(() => {
                child.kill('SIGTERM');
            }, options.timeoutMs);
        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
        child.stdout?.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr?.on('data', (chunk) => {
            stderr += chunk;
        });
        child.once('error', (error) => {
            if (timeout)
                clearTimeout(timeout);
            reject(error);
        });
        child.once('exit', (code, signal) => {
            if (timeout)
                clearTimeout(timeout);
            resolve({ code: code ?? (signal ? 1 : 0), signal, stdout, stderr });
        });
    });
}
export async function runInherit(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env ?? process.env,
            stdio: ['ignore', 'inherit', 'inherit']
        });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            resolve({ code: code ?? (signal ? 1 : 0), signal, stdout: '', stderr: '' });
        });
    });
}
