export function parseJson(text) {
    const value = JSON.parse(text);
    return value;
}
export function parseJsonOrNull(text) {
    try {
        return parseJson(text);
    }
    catch {
        return null;
    }
}
