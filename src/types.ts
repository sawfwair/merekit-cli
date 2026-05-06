export type AppKey =
	| 'business'
	| 'finance'
	| 'projects'
	| 'today'
	| 'zone'
	| 'video'
	| 'network'
	| 'email'
	| 'gives'
	| 'works';

export type AuthKind = 'browser' | 'token' | 'device' | 'none' | 'mixed';
export type CommandRisk = 'read' | 'write' | 'destructive' | 'external';

export type ManifestCommand = {
	id: string;
	path: string[];
	summary: string;
	auth: 'none' | 'session' | 'workspace' | 'token';
	risk: CommandRisk;
	supportsJson: boolean;
	supportsData: boolean;
	requiresYes: boolean;
	requiresConfirm: boolean;
	positionals: string[];
	flags: string[];
	auditDefault?: boolean;
};

export type AppCommandManifest = {
	schemaVersion: 1;
	app: string;
	namespace: string;
	aliases: string[];
	auth: { kind: AuthKind };
	baseUrlEnv: string[];
	sessionPath: string | null;
	globalFlags?: string[];
	commands: ManifestCommand[];
};

export type RegistryEntry = {
	key: AppKey;
	label: string;
	namespace: string;
	aliases: string[];
	repoDir: string;
	envCliPath: string;
	bundledCliPath: string;
	localCliPath: string;
	pathBins: string[];
	authKind: AuthKind;
	packageScripts: {
		build?: string;
		check?: string;
		smoke?: string;
	};
};

export type ResolvedCli = {
	entry: RegistryEntry;
	source: 'env' | 'bundled' | 'local' | 'path';
	command: string;
	args: string[];
	exists: boolean;
	displayPath: string;
};

export type ProcessResult = {
	code: number;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
};

export type JsonObject = Record<string, unknown>;
