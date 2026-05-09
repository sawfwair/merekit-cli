function cellText(value) {
    if (value === undefined || value === null)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
        return String(value);
    return JSON.stringify(value);
}
export function writeJson(value) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
export function writeText(value) {
    process.stdout.write(`${value}\n`);
}
export function printTable(rows, columns) {
    if (rows.length === 0) {
        writeText('No rows.');
        return;
    }
    const widths = Object.fromEntries(columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => cellText(row[column]).length))]));
    writeText(columns.map((column) => column.padEnd(widths[column] ?? column.length)).join('  '));
    writeText(columns.map((column) => '-'.repeat(widths[column] ?? column.length)).join('  '));
    for (const row of rows)
        writeText(columns.map((column) => cellText(row[column]).padEnd(widths[column] ?? column.length)).join('  '));
}
