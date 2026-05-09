function scalarText(value) {
    if (value === undefined || value === null)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
        return String(value);
    return '';
}
export function normalizeKey(value) {
    return scalarText(value)
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
export function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
export function asRecord(value, label) {
    if (!isRecord(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
export function asArray(value, label) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new Error(`${label} must be an array.`);
    return value;
}
export function stringArray(value, label) {
    return [...new Set(asArray(value, label).map((item) => String(item).trim()).filter(Boolean).map(normalizeKey))];
}
export function readOptionalString(record, key) {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
export function readRequiredString(record, key, label) {
    const value = record[key];
    const text = scalarText(value).trim();
    if (!text)
        throw new Error(`${label}.${key} is required.`);
    return text;
}
