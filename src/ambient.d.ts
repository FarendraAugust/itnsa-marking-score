declare module 'node:sqlite' {
	export class StatementSync {
		run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
		get(...params: any[]): any;
		all(...params: any[]): any[];
	}

	export class DatabaseSync {
		constructor(location: string, options?: { open?: boolean });
		close(): void;
		exec(sql: string): void;
		prepare(sql: string): StatementSync;
	}
}

declare module 'node:path' {
	export function resolve(...paths: string[]): string;
	export function join(...paths: string[]): string;
}

declare module 'node:fs' {
	export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
	export function existsSync(path: string): boolean;
}

declare module 'node:crypto' {
	export function scryptSync(password: string | Buffer, salt: string | Buffer, keylen: number): Buffer;
	export function randomBytes(size: number): Buffer;
	export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
	export function randomUUID(): string;
}

declare interface Buffer extends Uint8Array {
	toString(encoding?: string): string;
}

declare const Buffer: {
	from(data: string | Uint8Array, encoding?: string): Buffer;
};

declare namespace NodeJS {
	interface Process {
		cwd(): string;
	}
}

declare const process: NodeJS.Process;
