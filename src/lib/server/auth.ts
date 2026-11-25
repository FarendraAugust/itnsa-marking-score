import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { db } from './db';

export interface User {
	id: string;
	username: string;
	full_name: string;
	role: 'admin' | 'participant';
	created_at: string;
}

export function initAuthTables() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			full_name TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'admin',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

	const sessionsTable = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'sessions'").get() as { sql: string } | undefined;
	if (sessionsTable && sessionsTable.sql.includes('user_id TEXT NOT NULL')) {
		db.exec(`DROP TABLE sessions;`);
	}

	db.exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			participant_id TEXT,
			role TEXT NOT NULL DEFAULT 'admin',
			expires_at DATETIME NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`);

	try {
		db.exec("ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';");
	} catch {}
	try {
		db.exec('ALTER TABLE sessions ADD COLUMN participant_id TEXT;');
	} catch {}
}

initAuthTables();

export function hasAdminUser(): boolean {
	const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number } | undefined;
	return Boolean(row && row.count > 0);
}

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	try {
		const [salt, key] = stored.split(':');
		if (!salt || !key) return false;
		const keyBuffer = Buffer.from(key, 'hex');
		const derivedKey = scryptSync(password, salt, 64);
		return timingSafeEqual(keyBuffer, derivedKey);
	} catch {
		return false;
	}
}

export function createFirstAdmin(username: string, password: string, fullName: string) {
	if (hasAdminUser()) {
		throw new Error('Admin sudah terdaftar. Setup awal hanya dapat dijalankan sekali.');
	}

	const cleanUser = username.trim().toLowerCase();
	if (cleanUser.length < 3) {
		throw new Error('Username minimal 3 karakter');
	}
	if (password.length < 6) {
		throw new Error('Password minimal 6 karakter');
	}

	const id = 'usr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	const pwdHash = hashPassword(password);
	const name = fullName.trim() || cleanUser;

	db.prepare('INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)').run(
		id,
		cleanUser,
		pwdHash,
		name,
		'admin'
	);

	return createSession({ userId: id, role: 'admin' });
}

export function authenticateAdmin(username: string, password: string) {
	const cleanUser = username.trim().toLowerCase();
	const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser) as (User & { password_hash: string }) | undefined;

	if (!user) {
		throw new Error('Username atau password admin salah');
	}

	if (!verifyPassword(password, user.password_hash)) {
		throw new Error('Username atau password admin salah');
	}

	return createSession({ userId: user.id, role: 'admin' });
}

export function loginParticipant(participantId: string) {
	const cleanId = participantId.trim();
	if (!cleanId) {
		throw new Error('ID Peserta wajib diisi');
	}

	// Look up participant in database, or register automatically
	let participant = db.prepare('SELECT * FROM participants WHERE identifier = ?').get(cleanId) as { id: string; identifier: string; name: string } | undefined;

	if (!participant) {
		const newPid = 'part-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		db.prepare('INSERT INTO participants (id, name, identifier, institution) VALUES (?, ?, ?, ?)').run(
			newPid,
			`Peserta ${cleanId}`,
			cleanId,
			'Peserta Mandiri'
		);
		participant = { id: newPid, identifier: cleanId, name: `Peserta ${cleanId}` };
	}

	return createSession({ participantId: participant.id, role: 'participant' });
}

export function createSession(options: {
	userId?: string | null;
	participantId?: string | null;
	role: 'admin' | 'participant';
}): { sessionId: string; expiresAt: Date } {
	const sessionId = randomUUID ? randomUUID() : 'sess-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	db.prepare('INSERT INTO sessions (id, user_id, participant_id, role, expires_at) VALUES (?, ?, ?, ?, ?)').run(
		sessionId,
		options.userId || null,
		options.participantId || null,
		options.role,
		expiresAt.toISOString()
	);

	return { sessionId, expiresAt };
}

export function validateSession(sessionId: string): {
	id: string;
	username: string;
	fullName: string;
	role: 'admin' | 'participant';
	participantId?: string;
} | null {
	if (!sessionId) return null;

	const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as {
		id: string;
		user_id: string | null;
		participant_id: string | null;
		role: string;
		expires_at: string;
	} | undefined;

	if (!session) return null;

	if (new Date() > new Date(session.expires_at)) {
		invalidateSession(sessionId);
		return null;
	}

	if (session.role === 'participant' && session.participant_id) {
		const p = db.prepare('SELECT * FROM participants WHERE id = ?').get(session.participant_id) as {
			id: string;
			name: string;
			identifier: string;
		} | undefined;

		if (!p) return null;

		return {
			id: p.id,
			username: p.identifier,
			fullName: p.name,
			role: 'participant',
			participantId: p.identifier
		};
	} else if (session.user_id) {
		const u = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as {
			id: string;
			username: string;
			full_name: string;
			role: string;
		} | undefined;

		if (!u) return null;

		return {
			id: u.id,
			username: u.username,
			fullName: u.full_name,
			role: 'admin'
		};
	}

	return null;
}

export function invalidateSession(sessionId: string) {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
