export const WRITES = ['create', 'update', 'delete', 'comment', 'message', 'bookmark', 'pin', 'topic', 'purpose', 'sync'];
export const PLUGINS = {
    mere: { kinds: ['workspace', 'app', 'record', 'link'], writes: ['sync'] },
    monday: { kinds: ['board', 'workspace', 'folder', 'item'], writes: ['create', 'update', 'comment'] },
    'github-cli': { kinds: ['repo', 'issue-tracker', 'link'], writes: ['create', 'update', 'comment'] },
    slack: { kinds: ['channel'], writes: ['topic', 'purpose', 'canvas', 'message', 'bookmark', 'pin'] },
    linear: { kinds: ['team', 'project', 'issue-tracker'], writes: ['create', 'update', 'comment'] },
    jira: { kinds: ['project', 'issue-tracker'], writes: ['create', 'update', 'comment'] },
    url: { kinds: ['link', 'document'], writes: [] },
    local: { kinds: ['file', 'directory'], writes: ['create', 'update', 'delete'] },
    generic: { kinds: ['workspace', 'app', 'project', 'repo', 'channel', 'board', 'issue-tracker', 'document', 'link', 'file', 'directory'], writes: WRITES }
};
