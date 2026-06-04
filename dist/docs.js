import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseJson } from './json.js';
import { resolveMerePaths } from './paths.js';
import { readBooleanFlag, readStringFlag } from './args.js';
import { runCapture } from './process.js';
const DEFAULT_DOCS_BASE_URL = 'https://mere-docs.mere.world';
function docsBaseUrl(env, flags) {
    const configured = readStringFlag(flags, 'base-url') ?? env.MERE_DOCS_BASE_URL ?? DEFAULT_DOCS_BASE_URL;
    return new URL(configured).origin;
}
function docsSessionPath(paths) {
    return path.join(paths.stateDir, 'docs-session.json');
}
async function loadDocsSession(paths) {
    try {
        const parsed = parseJson(await readFile(docsSessionPath(paths), 'utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            return null;
        const candidate = parsed;
        if (typeof candidate.token !== 'string' || typeof candidate.baseUrl !== 'string')
            return null;
        return {
            baseUrl: candidate.baseUrl,
            token: candidate.token,
            expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : null,
            email: typeof candidate.email === 'string' ? candidate.email : null,
            createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
        };
    }
    catch {
        return null;
    }
}
async function saveDocsSession(paths, session) {
    await mkdir(paths.stateDir, { recursive: true });
    await writeFile(docsSessionPath(paths), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}
async function currentDocsSession(io, flags) {
    const token = io.env.MERE_DOCS_TOKEN?.trim();
    const baseUrl = docsBaseUrl(io.env, flags);
    if (token) {
        return {
            baseUrl,
            token,
            expiresAt: null,
            email: null,
            createdAt: new Date().toISOString()
        };
    }
    const stored = await loadDocsSession(resolveMerePaths(io.env));
    if (!stored)
        return null;
    if (new URL(stored.baseUrl).origin !== baseUrl)
        return { ...stored, baseUrl };
    return stored;
}
function asError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
async function maybeOpenBrowser(url, env) {
    if (env.MERE_DOCS_NO_BROWSER === '1')
        return false;
    try {
        if (process.platform === 'darwin') {
            await runCapture('open', [url], { env, timeoutMs: 10_000 });
            return true;
        }
        if (process.platform === 'win32') {
            await runCapture('cmd', ['/c', 'start', '', url], { env, timeoutMs: 10_000 });
            return true;
        }
        await runCapture('xdg-open', [url], { env, timeoutMs: 10_000 });
        return true;
    }
    catch {
        return false;
    }
}
async function requestJson(url, token) {
    const init = token ? { headers: { authorization: `Bearer ${token}` } } : {};
    const response = await fetch(url, { ...init, redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
        throw new Error('Mere Docs session is missing or expired. Run `mere docs login` or set MERE_DOCS_TOKEN.');
    }
    const payload = (await response.json().catch(() => null));
    if (!response.ok || !payload) {
        throw new Error(payload?.error ?? payload?.message ?? `Docs request failed (${response.status}).`);
    }
    return payload;
}
async function waitForDocsLogin(input) {
    const state = randomUUID();
    return new Promise((resolve, reject) => {
        const server = createServer((request, response) => {
            const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
            if (requestUrl.pathname !== '/callback') {
                response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                response.end('Not found.');
                return;
            }
            if (requestUrl.searchParams.get('state') !== state) {
                response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
                response.end('Invalid state.');
                return;
            }
            const error = requestUrl.searchParams.get('error');
            if (error) {
                clearTimeout(timeout);
                server.close();
                response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
                response.end('<!doctype html><html><body><h1>Mere Docs login failed.</h1><p>You can close this window.</p></body></html>');
                reject(new Error(error));
                return;
            }
            const token = requestUrl.searchParams.get('token')?.trim();
            if (!token) {
                response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
                response.end('Missing token.');
                return;
            }
            clearTimeout(timeout);
            server.close();
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            response.end('<!doctype html><html><body><h1>Mere Docs login complete.</h1><p>You can close this window.</p></body></html>');
            resolve({
                baseUrl: input.baseUrl,
                token,
                expiresAt: requestUrl.searchParams.get('expires_at'),
                email: requestUrl.searchParams.get('email'),
                createdAt: new Date().toISOString()
            });
        });
        server.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        server.listen(0, '127.0.0.1', () => {
            void (async () => {
                try {
                    const address = server.address();
                    if (!address)
                        throw new Error('Local docs login callback server could not bind to a port.');
                    const callbackUrl = `http://127.0.0.1:${address.port}/callback`;
                    const startUrl = new URL('/api/docs/cli/start', input.baseUrl);
                    startUrl.searchParams.set('callback_url', callbackUrl);
                    startUrl.searchParams.set('state', state);
                    const started = await requestJson(startUrl);
                    const opened = input.noBrowser ? false : await maybeOpenBrowser(started.authorizeUrl, input.io.env);
                    input.io.stderr(opened
                        ? 'Opened your browser to complete Mere Docs login.\n'
                        : `Open this URL to complete Mere Docs login:\n${started.authorizeUrl}\n`);
                }
                catch (error) {
                    clearTimeout(timeout);
                    server.close();
                    reject(asError(error));
                }
            })();
        });
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error('Timed out waiting for the Mere Docs login callback.'));
        }, 120_000);
    });
}
function requireDocsSession(session) {
    if (!session)
        throw new Error('No Mere Docs session found. Run `mere docs login` first.');
    return session;
}
async function runDocsLogin(io, flags) {
    const paths = resolveMerePaths(io.env);
    const session = await waitForDocsLogin({
        baseUrl: docsBaseUrl(io.env, flags),
        io,
        noBrowser: readBooleanFlag(flags, 'no-browser')
    });
    await saveDocsSession(paths, session);
    const payload = {
        ok: true,
        baseUrl: session.baseUrl,
        email: session.email,
        expiresAt: session.expiresAt,
        sessionPath: docsSessionPath(paths)
    };
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    else
        io.stdout(`Mere Docs authenticated${session.email ? ` as ${session.email}` : ''}.\n`);
    return 0;
}
async function runDocsStatus(io, flags) {
    const paths = resolveMerePaths(io.env);
    const session = await currentDocsSession(io, flags);
    const payload = {
        authenticated: Boolean(session),
        baseUrl: docsBaseUrl(io.env, flags),
        email: session?.email ?? null,
        expiresAt: session?.expiresAt ?? null,
        sessionPath: docsSessionPath(paths),
        envToken: Boolean(io.env.MERE_DOCS_TOKEN?.trim())
    };
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    else
        io.stdout(`docs: ${payload.authenticated ? 'authenticated' : 'unauthenticated'} (${payload.baseUrl})\n`);
    return 0;
}
async function runDocsLogout(io, flags) {
    const paths = resolveMerePaths(io.env);
    await rm(docsSessionPath(paths), { force: true });
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify({ ok: true, sessionPath: docsSessionPath(paths) }, null, 2)}\n`);
    else
        io.stdout('Mere Docs session removed.\n');
    return 0;
}
async function runDocsIndex(io, flags) {
    const session = requireDocsSession(await currentDocsSession(io, flags));
    const url = new URL('/api/docs/index', session.baseUrl);
    addDocsFilters(url, flags);
    const payload = await requestJson(url, session.token);
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    else {
        io.stdout(`Mere Docs (${payload.count ?? payload.docs?.length ?? 0})\n`);
        for (const doc of payload.docs?.slice(0, 40) ?? [])
            io.stdout(`${formatDocLabel(doc)}\n`);
    }
    return 0;
}
function addDocsFilters(url, flags) {
    const app = readStringFlag(flags, 'app');
    const source = readStringFlag(flags, 'source');
    if (app)
        url.searchParams.set('app', app);
    if (source)
        url.searchParams.set('source', source);
}
function formatDocLabel(doc) {
    const owner = doc.app ?? doc.source;
    return `${doc.path}\t${owner}\t${doc.title}`;
}
async function runDocsRead(io, pathArg, flags) {
    const docPath = pathArg?.trim();
    if (!docPath)
        throw new Error('Usage: mere docs read DOC_ID [--app APP] [--source SOURCE] [--json]');
    const session = requireDocsSession(await currentDocsSession(io, flags));
    const url = new URL('/api/docs/read', session.baseUrl);
    url.searchParams.set('id', docPath);
    addDocsFilters(url, flags);
    const payload = await requestJson(url, session.token);
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    else
        io.stdout(payload.content.endsWith('\n') ? payload.content : `${payload.content}\n`);
    return 0;
}
async function runDocsSearch(io, args, flags) {
    const query = args.join(' ').trim();
    if (!query)
        throw new Error('Usage: mere docs search QUERY [--app APP] [--source SOURCE] [--limit N] [--json]');
    const session = requireDocsSession(await currentDocsSession(io, flags));
    const url = new URL('/api/docs/search', session.baseUrl);
    url.searchParams.set('q', query);
    addDocsFilters(url, flags);
    const limit = readStringFlag(flags, 'limit');
    if (limit)
        url.searchParams.set('limit', limit);
    const payload = await requestJson(url, session.token);
    if (readBooleanFlag(flags, 'json'))
        io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    else {
        for (const result of payload.results) {
            io.stdout(`${formatDocLabel({
                path: result.path,
                title: result.title,
                source: result.source ?? 'platform',
                app: result.app ?? null
            })}\n`);
            if (result.excerpt)
                io.stdout(`${result.excerpt}\n`);
        }
        if (payload.results.length === 0)
            io.stdout('No docs matched.\n');
    }
    return 0;
}
export async function runDocs(io, action, args, flags) {
    if (!action || action === 'index' || action === 'list')
        return runDocsIndex(io, flags);
    if (action === 'login')
        return runDocsLogin(io, flags);
    if (action === 'status')
        return runDocsStatus(io, flags);
    if (action === 'logout')
        return runDocsLogout(io, flags);
    if (action === 'read')
        return runDocsRead(io, args[0], flags);
    if (action === 'search')
        return runDocsSearch(io, args, flags);
    throw new Error('Usage: mere docs login|status|index|read|search|logout');
}
