export function parseJson(text: string): unknown {
	const value: unknown = JSON.parse(text);
	return value;
}

export function parseJsonOrNull(text: string): unknown | null {
	try {
		return parseJson(text);
	} catch {
		return null;
	}
}
