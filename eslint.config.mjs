import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
	AbortController: 'readonly',
	Blob: 'readonly',
	Buffer: 'readonly',
	URL: 'readonly',
	URLSearchParams: 'readonly',
	clearTimeout: 'readonly',
	console: 'readonly',
	fetch: 'readonly',
	globalThis: 'readonly',
	process: 'readonly',
	setTimeout: 'readonly'
};

export default tseslint.config(
	{
		ignores: [
			'adapters/**',
			'dist/**',
			'docs/.vitepress/**',
			'coverage/**',
			'node_modules/**',
			'*.tgz'
		]
	},
	js.configs.recommended,
	{
		files: ['**/*.{js,mjs,ts}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: nodeGlobals
		},
		rules: {
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'preserve-caught-error': 'off',
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'TSAsExpression > CallExpression[callee.object.name="JSON"][callee.property.name="parse"], TSTypeAssertion > CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
					message: 'Parse JSON through a schema or a typed boundary helper instead of casting JSON.parse directly.'
				}
			]
		}
	},
	{
		files: ['scripts/**/*.mjs', 'test/**/*.mjs'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		files: ['src/**/*.ts'],
		extends: [
			tseslint.configs.recommendedTypeChecked,
			tseslint.configs.strictTypeChecked
		],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/array-type': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'node:child_process',
							message: 'Use src/process.ts so command execution has one audited path.'
						}
					]
				}
			]
		}
	},
	{
		files: ['src/process.ts'],
		rules: {
			'no-restricted-imports': 'off'
		}
	}
);
