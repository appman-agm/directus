import { defineOperationApi, toArray } from '@directus/utils';
import { isBuiltin } from 'node:module';
import { createContext, runInContext } from 'node:vm';

type Options = {
	code: string;
};

export default defineOperationApi<Options>({
	id: 'exec',
	handler: async ({ code }, { data, env }) => {
		const allowedModules = env['FLOWS_EXEC_ALLOWED_MODULES'] ? toArray(env['FLOWS_EXEC_ALLOWED_MODULES']) : [];
		const allowedEnv = data['$env'] ?? {};

		// Create a secure context with limited global access
		const context = createContext({
			data,
			env: allowedEnv,
			console: {
				log: console.log,
				error: console.error,
				warn: console.warn,
			},
			// Add allowed modules to context
			require: allowedModules.length > 0 ? createSecureRequire(allowedModules) : undefined,
		});

		try {
			// Execute the code in the secure context
			const result = runInContext(`(async function(data) { ${code} })`, context, {
				timeout: 30000, // 30 second timeout
				displayErrors: false,
			});

			return await result(data);
		} catch (error) {
			throw new Error(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	},
});

// Helper function to create a secure require function
function createSecureRequire(allowedModules: string[]) {
	return (moduleName: string) => {
		if (!allowedModules.includes(moduleName)) {
			throw new Error(`Module '${moduleName}' is not allowed`);
		}
		
		// Only allow built-in modules for security
		if (!isBuiltin(moduleName)) {
			throw new Error(`Only built-in modules are allowed`);
		}
		
		return require(moduleName);
	};
}
