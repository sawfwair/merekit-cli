export const WRITES = ['create', 'update', 'delete', 'comment', 'message', 'bookmark', 'pin', 'topic', 'purpose', 'canvas', 'sync'];
export const PLUGINS = {
    mere: { kinds: ['workspace', 'app', 'record', 'link'], writes: ['sync'] },
    executor: { kinds: ['source', 'namespace', 'tool', 'board', 'site', 'list', 'repo', 'channel', 'record', 'link', 'document'], writes: WRITES },
    url: { kinds: ['link', 'document'], writes: [] },
    local: { kinds: ['file', 'directory'], writes: ['create', 'update', 'delete'] },
    generic: { kinds: ['workspace', 'app', 'project', 'repo', 'channel', 'board', 'issue-tracker', 'document', 'link', 'file', 'directory'], writes: WRITES }
};
