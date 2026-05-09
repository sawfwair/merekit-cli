import { asArray, asRecord } from '../domain/guards.js';
export function parseJson(raw, label) {
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${label} must be valid JSON: ${detail}`, { cause: error });
    }
}
export function parseJsonRecord(raw, label) {
    return asRecord(parseJson(raw, label), label);
}
export function parseJsonArray(raw, label) {
    return asArray(parseJson(raw, label), label);
}
