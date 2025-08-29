import { test, expect } from 'vitest';

import config from './index.js';

test('Rejects when modules are used without modules being allowed', async () => {
	const testCode = `
		const test = require('test');
		return test;
	`;

	await expect(
		config.handler({ code: testCode }, {
			data: {},
			env: {
				FLOWS_EXEC_ALLOWED_MODULES: '',
			},
		} as any)
	).rejects.toThrow("Execution error:");
});

test('Rejects when code contains syntax errors', async () => {
	const testCode = `
		~~
	`;

	await expect(
		config.handler({ code: testCode }, {
			data: {},
			env: {
				FLOWS_EXEC_ALLOWED_MODULES: '',
			},
		} as any)
	).rejects.toThrow('Execution error:');
});

test('Rejects when returned function does something illegal', async () => {
	const testCode = `
		return a + b;
	`;

	await expect(
		config.handler({ code: testCode }, {
			data: {},
			env: {
				FLOWS_EXEC_ALLOWED_MODULES: '',
			},
		} as any)
	).rejects.toThrow('Execution error:');
});

test('Executes function when valid', () => {
	const testCode = `
		return { result: data.input + ' test' };
	`;

	expect(
		config.handler({ code: testCode }, {
			data: {
				input: 'start',
			},
			env: {
				FLOWS_EXEC_ALLOWED_MODULES: '',
			},
		} as any)
	).resolves.toEqual({ result: 'start test' });
});

test('Allows built-in modules that are whitelisted', () => {
	const testCode = `
		const crypto = require('crypto');
		return {
			result: crypto.createHash('sha256').update('directus').digest('hex'),
		};
	`;

	expect(
		config.handler({ code: testCode }, {
			data: {},
			env: {
				FLOWS_EXEC_ALLOWED_MODULES: 'crypto',
			},
		} as any)
	).resolves.toEqual({ result: '943e891bf6042f2db8926493c0f94e45b72cb58a21145fdfa3c23b5c057e4b2d' });
});
