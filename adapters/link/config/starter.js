import { isRecord, normalizeKey } from '../domain/guards.js';
export function starterConfig(input = {}) {
    const workspace = input.workspace ?? 'workspace-id';
    const name = input.name ?? 'Workspace';
    const entityKey = normalizeKey(name) || 'workspace';
    return {
        schemaVersion: 1,
        integrations: {
            mere: { plugin: 'mere', workspace },
            github: { plugin: 'github-cli' },
            url: { plugin: 'url' }
        },
        entities: {
            [entityKey]: {
                name,
                aliases: workspace && workspace !== 'workspace-id' ? [normalizeKey(workspace)] : [],
                projects: {
                    workspace: {
                        name: `${name} Workspace`,
                        aliases: [],
                        surfaces: {
                            work: { integration: 'mere', kind: 'workspace', id: workspace, name },
                            code: { integration: 'github', kind: 'repo', id: 'owner/repo', optional: true },
                            docs: { integration: 'url', kind: 'link', id: 'https://example.com/docs', optional: true }
                        }
                    }
                }
            }
        },
        links: [
            { from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:docs`, label: 'Documentation' },
            { from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:code`, label: 'Code' }
        ]
    };
}
export function normalizeWorkspaceSnapshot(snapshot) {
    const snapshotRecord = isRecord(snapshot) ? snapshot : {};
    const apps = Array.isArray(snapshotRecord.apps) ? snapshotRecord.apps.filter(isWorkspaceSnapshotApp) : [];
    return {
        ...(typeof snapshotRecord.workspace === 'string' ? { workspace: snapshotRecord.workspace } : {}),
        apps
    };
}
function isWorkspaceSnapshotApp(value) {
    return isRecord(value);
}
export function configFromWorkspaceSnapshot(snapshot, input = {}) {
    const normalizedSnapshot = normalizeWorkspaceSnapshot(snapshot);
    const workspace = input.workspace ?? normalizedSnapshot.workspace ?? 'workspace-id';
    const name = input.name ?? workspace;
    const entityKey = normalizeKey(name) || 'workspace';
    const surfaces = {
        work: { integration: 'mere', kind: 'workspace', id: workspace, name }
    };
    for (const app of normalizedSnapshot.apps) {
        const appName = normalizeKey(app.app ?? app.namespace);
        if (!appName || appName === 'link')
            continue;
        surfaces[appName] = {
            integration: 'mere',
            kind: 'app',
            id: appName,
            name: typeof app.namespace === 'string' ? app.namespace : appName,
            ...(app.ok === true ? {} : { optional: true })
        };
    }
    return {
        schemaVersion: 1,
        integrations: {
            mere: { plugin: 'mere', workspace },
            generic: { plugin: 'generic' }
        },
        entities: {
            [entityKey]: {
                name,
                aliases: workspace && normalizeKey(workspace) !== entityKey ? [normalizeKey(workspace)] : [],
                projects: {
                    workspace: {
                        name: `${name} Workspace`,
                        aliases: [],
                        surfaces
                    }
                }
            }
        },
        links: Object.keys(surfaces)
            .filter((role) => role !== 'work')
            .map((role) => ({ from: `${entityKey}/workspace:work`, to: `${entityKey}/workspace:${role}`, label: role }))
    };
}
