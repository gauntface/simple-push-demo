import js from '@eslint/js';
import globals from 'globals';

export default [
	{
		ignores: ['.tmp/**', 'build/**', 'test/output/**'],
	},
	js.configs.recommended,
	{
		languageOptions: {
			sourceType: 'module',
			ecmaVersion: 2021,
			globals: {
				...globals.node,
			},
		},
		rules: {
			indent: ['error', 'tab'],
			'no-tabs': 'off',
		},
	},
	{
		files: ['test/**/*.js'],
		languageOptions: {
			globals: {
				...globals.mocha,
			},
		},
		rules: {
			'no-unused-vars': 'off',
		},
	},
	{
		files: ['test/browser-tests/**/*.js', 'test/TODO/**/*.js', 'frontend/**/*.js'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},
	{
		files: ['frontend/service-worker.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.serviceworker,
			},
		},
	},
];
