#!/usr/bin/env node

import process from 'node:process';
import { runCli } from './root.js';

const code = await runCli(process.argv.slice(2), {
	env: process.env,
	stdin: process.stdin,
	stdout: (text) => process.stdout.write(text),
	stderr: (text) => process.stderr.write(text)
});

process.exitCode = code;
