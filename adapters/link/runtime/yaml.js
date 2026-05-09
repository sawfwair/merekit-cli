import YAML from 'yaml';
export function parseYaml(raw, label) {
    try {
        return YAML.parse(raw);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${label} must be valid YAML: ${detail}`, { cause: error });
    }
}
export function stringifyYaml(value) {
    return YAML.stringify(value);
}
