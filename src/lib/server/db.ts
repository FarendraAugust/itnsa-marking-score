import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const DB_DIR = resolve(process.cwd(), 'data');
mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = resolve(DB_DIR, 'itnsa.sqlite');

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export interface Folder {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	simulation_count?: number;
}

export interface Item {
	id: string;
	section_id: string;
	simulation_id: string;
	code: string;
	description: string;
	points: number;
	sort_order: number;
}

export interface Section {
	id: string;
	simulation_id: string;
	code: string;
	title: string;
	sort_order: number;
	items?: Item[];
}

export interface Simulation {
	id: string;
	folder_id: string | null;
	folder_name?: string | null;
	title: string;
	module_label: string;
	max_weight: number;
	description: string | null;
	api_token: string;
	schedule_start: string | null;
	schedule_end: string | null;
	duration_minutes: number;
	timer_mode: 'flexible' | 'committee';
	status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
	created_at: string;
	sections?: Section[];
	item_count?: number;
	total_points?: number;
	participant_count?: number;
}

export interface Participant {
	id: string;
	name: string;
	identifier: string;
	institution: string | null;
	created_at: string;
}

export interface Submission {
	id: string;
	simulation_id: string;
	participant_id: string;
	participant_name?: string;
	participant_identifier?: string;
	institution?: string;
	total_score: number;
	max_score: number;
	passed_items: number;
	total_items: number;
	raw_results: string;
	logs: string | null;
	first_submitted_at: string | null;
	submitted_at: string | null;
	deadline_at: string | null;
	is_overdue: number;
	timer_status: 'not_started' | 'running' | 'paused' | 'stopped';
	remaining_seconds: number | null;
	paused_at: string | null;
	has_submitted?: number;
}

export function normalizeTimerMode(mode: string | null | undefined): 'flexible' | 'committee' {
	return mode === 'committee' || mode === 'admin' ? 'committee' : 'flexible';
}

export function initDatabase() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS folders (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS simulations (
			id TEXT PRIMARY KEY,
			folder_id TEXT,
			title TEXT NOT NULL,
			module_label TEXT NOT NULL,
			max_weight REAL NOT NULL DEFAULT 100.0,
			description TEXT,
			api_token TEXT NOT NULL,
			schedule_start DATETIME,
			schedule_end DATETIME,
			duration_minutes INTEGER NOT NULL DEFAULT 120,
			timer_mode TEXT NOT NULL DEFAULT 'flexible',
			status TEXT NOT NULL DEFAULT 'active',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS sections (
			id TEXT PRIMARY KEY,
			simulation_id TEXT NOT NULL,
			code TEXT NOT NULL,
			title TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS items (
			id TEXT PRIMARY KEY,
			section_id TEXT NOT NULL,
			simulation_id TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT NOT NULL,
			points REAL NOT NULL DEFAULT 1.0,
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
			FOREIGN KEY(simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS participants (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			identifier TEXT NOT NULL UNIQUE,
			institution TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS submissions (
			id TEXT PRIMARY KEY,
			simulation_id TEXT NOT NULL,
			participant_id TEXT NOT NULL,
			total_score REAL NOT NULL DEFAULT 0,
			max_score REAL NOT NULL DEFAULT 0,
			passed_items INTEGER NOT NULL DEFAULT 0,
			total_items INTEGER NOT NULL DEFAULT 0,
			raw_results TEXT,
			logs TEXT,
			first_submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			deadline_at DATETIME,
			is_overdue INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
			FOREIGN KEY(participant_id) REFERENCES participants(id) ON DELETE CASCADE
		);
	`);

	// Safe migrations for newly added columns if table previously existed
	try {
		db.exec('ALTER TABLE simulations ADD COLUMN schedule_start DATETIME;');
	} catch {}
	try {
		db.exec('ALTER TABLE simulations ADD COLUMN schedule_end DATETIME;');
	} catch {}
	try {
		db.exec('ALTER TABLE simulations ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 120;');
	} catch {}
	try {
		db.exec("ALTER TABLE simulations ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'flexible';");
	} catch {}

	// Migrate legacy timer mode values
	db.exec("UPDATE simulations SET timer_mode = 'flexible' WHERE timer_mode = 'participant' OR timer_mode IS NULL;");
	db.exec("UPDATE simulations SET timer_mode = 'committee' WHERE timer_mode = 'admin';");
	try {
		db.exec("ALTER TABLE simulations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
	} catch {}
	try {
		db.exec('ALTER TABLE submissions ADD COLUMN first_submitted_at DATETIME;');
	} catch {}
	try {
		db.exec('ALTER TABLE submissions ADD COLUMN deadline_at DATETIME;');
	} catch {}
	try {
		db.exec('ALTER TABLE submissions ADD COLUMN is_overdue INTEGER NOT NULL DEFAULT 0;');
	} catch {}
	try {
		db.exec("ALTER TABLE submissions ADD COLUMN timer_status TEXT NOT NULL DEFAULT 'running';");
	} catch {}
	try {
		db.exec('ALTER TABLE submissions ADD COLUMN remaining_seconds INTEGER;');
	} catch {}
	try {
		db.exec('ALTER TABLE submissions ADD COLUMN paused_at DATETIME;');
	} catch {}

	seedDefaultData();
}

function seedDefaultData() {
	const countRow = db.prepare('SELECT COUNT(*) as count FROM simulations').get() as { count: number };
	if (countRow && countRow.count > 0) return;

	db.prepare('INSERT INTO folders (id, name, description) VALUES (?, ?, ?)').run(
		'folder-lks-itnsa',
		'LKS IT Network Systems Administration',
		'Koleksi simulasi penilaian ITNSA (Linux, Windows, Networking)'
	);
	db.prepare('INSERT INTO folders (id, name, description) VALUES (?, ?, ?)').run(
		'folder-linux',
		'Simulasi Linux Server',
		'Konfigurasi Linux Server, Gateway, DNS, Mail, Ansible'
	);
	db.prepare('INSERT INTO folders (id, name, description) VALUES (?, ?, ?)').run(
		'folder-windows',
		'Simulasi Windows Server',
		'Active Directory, GPO, DNS, IIS, File Server'
	);

	const simId = 'modul-2-client-server';
	db.prepare(`
		INSERT INTO simulations (id, folder_id, title, module_label, max_weight, description, api_token, duration_minutes, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		simId,
		'folder-lks-itnsa',
		'Client-Server Environment',
		'MODUL 2 · BOBOT 70%',
		70.0,
		'Penilaian measurement aspek Client-Server Environment ITNSA: DHCP, DNS, GPO, AD, Firewall, CA, OpenVPN, Web, Mail, Ansible',
		'token-modul-2',
		120,
		'active'
	);

	const sectionsData = [
		{
			code: 'A',
			title: 'Konfigurasi dasar',
			items: [
				{ code: 'A2', description: 'Hostname & IP server Linux (fw-gw, lnxsrv, web-srv, lnx-client)', points: 1.5 },
				{ code: 'A3', description: 'Computer name & IP dc01', points: 0.5 }
			]
		},
		{
			code: 'B',
			title: 'Firewall / gateway (fw-gw)',
			items: [
				{ code: 'B1', description: 'IPv4 forwarding aktif (tetap setelah reboot)', points: 1.0 },
				{ code: 'B2', description: 'Forward default deny + established/related', points: 1.5 },
				{ code: 'B3', description: 'Masquerade (sumber di WAN terlihat 203.0.113.1)', points: 1.5 },
				{ code: 'B4', description: 'Port forwarding HTTP/HTTPS', points: 1.5 },
				{ code: 'B5', description: 'Port forwarding DNS', points: 1.0 },
				{ code: 'B6', description: 'WAN ke INT diblokir (tanpa VPN)', points: 1.0 },
				{ code: 'B7', description: 'Ruleset firewall persisten', points: 0.5 }
			]
		},
		{
			code: 'C',
			title: 'DHCP',
			items: [
				{ code: 'C1', description: 'client01 mendapat alamat dari range DHCP', points: 1.5 },
				{ code: 'C2', description: 'Option gateway & DNS', points: 1.5 },
				{ code: 'C3', description: 'Option domain name', points: 1.0 }
			]
		},
		{
			code: 'D',
			title: 'Certificate Authority',
			items: [
				{ code: 'D1', description: 'Root CA', points: 1.5 },
				{ code: 'D2', description: 'Sertifikat web', points: 2.0 },
				{ code: 'D3', description: 'Sertifikat mail & VPN', points: 2.0 },
				{ code: 'D4', description: 'Sertifikat client', points: 1.5 }
			]
		},
		{
			code: 'E',
			title: 'OpenVPN',
			items: [
				{ code: 'E1', description: 'Server OpenVPN berjalan', points: 1.5 },
				{ code: 'E2', description: 'Sertifikat server vpn.pem dari Arema Root CA', points: 1.0 },
				{ code: 'E3', description: 'remote01 berhasil terhubung', points: 2.0 },
				{ code: 'E4', description: 'Route di-push ke client', points: 1.5 },
				{ code: 'E5', description: 'Akses jaringan INT lewat VPN', points: 1.0 }
			]
		},
		{
			code: 'F',
			title: 'Active Directory',
			items: [
				{ code: 'F1', description: 'Domain', points: 1.0 },
				{ code: 'F2', description: 'Organizational Unit (OU)', points: 0.5 },
				{ code: 'F3', description: 'User di OU yang benar, password never expires', points: 1.0 },
				{ code: 'F4', description: 'Group & anggota', points: 1.0 },
				{ code: 'F5', description: 'Domain join (computer account)', points: 0.5 },
				{ code: 'F6', description: 'Login domain (budi)', points: 1.0 }
			]
		},
		{
			code: 'G',
			title: 'DNS',
			items: [
				{ code: 'G1', description: 'Reverse zone & PTR', points: 1.0 },
				{ code: 'G2', description: 'Record intranet', points: 0.5 },
				{ code: 'G3', description: 'Conditional forwarder', points: 1.0 },
				{ code: 'G4', description: 'Record A di Bind9', points: 1.0 },
				{ code: 'G5', description: 'Record mail & MX di Bind9', points: 2.0 },
				{ code: 'G6', description: 'Resolusi lewat dc01 (DNS client01)', points: 1.0 }
			]
		},
		{
			code: 'H',
			title: 'Group Policy (GPO)',
			items: [
				{ code: 'H1', description: 'Panjang password minimal', points: 1.0 },
				{ code: 'H2', description: 'Drive map S:', points: 2.0 },
				{ code: 'H3', description: 'Pembatasan Control Panel', points: 2.0 }
			]
		},
		{
			code: 'I',
			title: 'Shared folder',
			items: [
				{ code: 'I1', description: 'Share', points: 1.0 },
				{ code: 'I2', description: 'Akses departemen sendiri (sari bisa menulis Marketing)', points: 1.5 },
				{ code: 'I3', description: 'Akses departemen lain (sari tidak bisa akses IT)', points: 1.5 }
			]
		},
		{
			code: 'J',
			title: 'Web',
			items: [
				{ code: 'J1', description: 'Intranet IIS', points: 1.0 },
				{ code: 'J2', description: 'Situs HTTPS publik (tanpa -k, tanpa VPN)', points: 1.5 },
				{ code: 'J3', description: 'Redirect HTTP ke HTTPS', points: 1.5 },
				{ code: 'J4', description: 'Sertifikat web dari Arema Root CA', points: 1.0 }
			]
		},
		{
			code: 'K',
			title: 'Mail',
			items: [
				{ code: 'K1', description: 'Cakupan Postfix', points: 1.0 },
				{ code: 'K2', description: 'User & Maildir', points: 1.0 },
				{ code: 'K3', description: 'Login IMAPS dengan sertifikat terverifikasi CA', points: 2.0 },
				{ code: 'K4', description: 'Roundcube HTTPS', points: 1.0 },
				{ code: 'K5', description: 'Login Roundcube (budi) & kirim email', points: 2.0 },
				{ code: 'K6', description: 'Login Roundcube (sari) & baca email', points: 1.0 }
			]
		},
		{
			code: 'L',
			title: 'Ansible',
			items: [
				{ code: 'L1', description: 'Inventory & SSH key', points: 1.5 },
				{ code: 'L2', description: '100 user dibuat lewat playbook', points: 1.5 },
				{ code: 'L3', description: 'Folder & file lewat playbook', points: 1.5 },
				{ code: 'L4', description: 'Aman dijalankan ulang (idempotent)', points: 1.5 }
			]
		}
	];

	for (let i = 0; i < sectionsData.length; i++) {
		const sec = sectionsData[i];
		const secId = `sec-${simId}-${sec.code.toLowerCase()}`;
		db.prepare('INSERT INTO sections (id, simulation_id, code, title, sort_order) VALUES (?, ?, ?, ?, ?)').run(
			secId,
			simId,
			sec.code,
			sec.title,
			i
		);

		for (let j = 0; j < sec.items.length; j++) {
			const itm = sec.items[j];
			const itemId = `itm-${simId}-${itm.code.toLowerCase()}`;
			db.prepare(`
				INSERT INTO items (id, section_id, simulation_id, code, description, points, sort_order)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`).run(
				itemId,
				secId,
				simId,
				itm.code,
				itm.description,
				itm.points,
				j
			);
		}
	}

	const participantId = 'peserta-01';
	db.prepare('INSERT INTO participants (id, name, identifier, institution) VALUES (?, ?, ?, ?)').run(
		participantId,
		'Budi Santoso',
		'peserta-01',
		'SMK Negeri 1 Surabaya'
	);

	const initialResults: Record<string, boolean> = {
		A2: false, A3: true,
		B1: true, B2: true, B3: false, B4: false, B5: false, B6: false, B7: true,
		C1: true, C2: true, C3: true,
		D1: true, D2: false, D3: false, D4: false,
		E1: false, E2: false, E3: false, E4: false, E5: false,
		F1: true, F2: true, F3: true, F4: false, F5: true, F6: true,
		G1: true, G2: true, G3: true, G4: true, G5: true, G6: true,
		H1: true, H2: true, H3: true,
		I1: false, I2: false, I3: true,
		J1: true, J2: false, J3: false, J4: false,
		K1: false, K2: true, K3: false, K4: false, K5: false, K6: false,
		L1: false, L2: false, L3: false, L4: false
	};

	const initialLogs: Record<string, string> = {
		A2: 'Ping ke fw-gw gagal timeout. Interface eth1 belum UP.',
		A3: 'Host dc01 resolvable dan IP sesuai konfigurasi.',
		B1: 'sysctl net.ipv4.ip_forward = 1 ditemukan di /etc/sysctl.conf.',
		B2: 'Default policy DROP dan rule ESTABLISHED,RELATED aktif.',
		B3: 'Masquerade tidak aktif pada outgoing WAN interface.',
		C1: 'client01 berhasil bind lease DHCP di range 192.168.10.50-100.',
		C2: 'Gateway 192.168.10.1 dan DNS 192.168.10.2 terdistribusi dengan benar.',
		C3: 'Domain option set ke lks.lan.',
		G1: 'PTR record 10.168.192.in-addr.arpa resolves correctly.',
		H1: 'GPO Minimum password length = 8 terpenuhi.'
	};

	let passedCount = 0;
	let totalEarned = 0;
	for (const sec of sectionsData) {
		for (const itm of sec.items) {
			if (initialResults[itm.code]) {
				passedCount++;
				totalEarned += itm.points;
			}
		}
	}

	const nowIso = new Date().toISOString();
	const deadlineIso = new Date(Date.now() + 120 * 60 * 1000).toISOString();

	db.prepare(`
		INSERT INTO submissions (
			id, simulation_id, participant_id, total_score, max_score, passed_items, total_items, raw_results, logs, first_submitted_at, deadline_at, is_overdue
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
	`).run(
		'sub-01',
		simId,
		participantId,
		totalEarned,
		70.0,
		passedCount,
		53,
		JSON.stringify(initialResults),
		JSON.stringify(initialLogs),
		nowIso,
		deadlineIso
	);
}

// Data Queries and Operations

export function getFolders(): Folder[] {
	return db.prepare(`
		SELECT f.*, COUNT(s.id) as simulation_count
		FROM folders f
		LEFT JOIN simulations s ON s.folder_id = f.id
		GROUP BY f.id
		ORDER BY f.created_at ASC
	`).all() as Folder[];
}

export function createFolder(name: string, description: string | null = null): Folder {
	const id = 'folder-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	db.prepare('INSERT INTO folders (id, name, description) VALUES (?, ?, ?)').run(id, name, description);
	return db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as Folder;
}

export function deleteFolder(id: string) {
	db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

export function getSimulations(folderId?: string): Simulation[] {
	let query = `
		SELECT s.*, f.name as folder_name,
		       COUNT(DISTINCT i.id) as item_count,
		       COALESCE(SUM(i.points), 0) as total_points,
		       COUNT(DISTINCT sub.id) as participant_count
		FROM simulations s
		LEFT JOIN folders f ON f.id = s.folder_id
		LEFT JOIN items i ON i.simulation_id = s.id
		LEFT JOIN submissions sub ON sub.simulation_id = s.id
	`;
	const params: unknown[] = [];
	if (folderId && folderId !== 'all') {
		query += ' WHERE s.folder_id = ?';
		params.push(folderId);
	}
	query += ' GROUP BY s.id ORDER BY s.created_at DESC';

	return db.prepare(query).all(...params) as Simulation[];
}

export function getSimulation(id: string): Simulation | null {
	const sim = db.prepare(`
		SELECT s.*, f.name as folder_name,
		       COUNT(DISTINCT sub.id) as participant_count
		FROM simulations s
		LEFT JOIN folders f ON f.id = s.folder_id
		LEFT JOIN submissions sub ON sub.simulation_id = s.id
		WHERE s.id = ?
		GROUP BY s.id
	`).get(id) as Simulation | undefined;

	if (!sim) return null;

	const sections = db.prepare(`
		SELECT * FROM sections WHERE simulation_id = ? ORDER BY sort_order ASC, code ASC
	`).all(id) as Section[];

	const items = db.prepare(`
		SELECT * FROM items WHERE simulation_id = ? ORDER BY sort_order ASC, code ASC
	`).all(id) as Item[];

	for (const sec of sections) {
		sec.items = items.filter(it => it.section_id === sec.id);
	}

	sim.sections = sections;
	sim.item_count = items.length;
	sim.total_points = items.reduce((acc, it) => acc + it.points, 0);

	return sim;
}

export function getSimulationItems(simulationId: string): Item[] {
	return db.prepare(`
		SELECT * FROM items WHERE simulation_id = ? ORDER BY sort_order ASC, code ASC
	`).all(simulationId) as Item[];
}

export function createSimulation(data: {
	title: string;
	module_label: string;
	max_weight: number;
	folder_id?: string | null;
	description?: string | null;
	api_token?: string;
	duration_minutes?: number;
	timer_mode?: 'flexible' | 'committee';
	schedule_start?: string | null;
	schedule_end?: string | null;
	status?: 'draft' | 'scheduled' | 'active' | 'completed';
	sections?: Array<{
		code: string;
		title: string;
		items: Array<{ code: string; description: string; points: number }>;
	}>;
}): string {
	const simId = 'sim-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	const token = data.api_token || 'tok-' + Math.random().toString(36).slice(2, 10);

	db.prepare(`
		INSERT INTO simulations (
			id, folder_id, title, module_label, max_weight, description, api_token,
			duration_minutes, timer_mode, schedule_start, schedule_end, status
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		simId,
		data.folder_id || null,
		data.title,
		data.module_label,
		data.max_weight,
		data.description || null,
		token,
		data.duration_minutes || 120,
		data.timer_mode || 'flexible',
		data.schedule_start || null,
		data.schedule_end || null,
		data.status || 'active'
	);

	if (data.sections && data.sections.length > 0) {
		for (let sIdx = 0; sIdx < data.sections.length; sIdx++) {
			const sec = data.sections[sIdx];
			const secId = `sec-${simId}-${sIdx + 1}`;
			db.prepare(`
				INSERT INTO sections (id, simulation_id, code, title, sort_order)
				VALUES (?, ?, ?, ?, ?)
			`).run(secId, simId, sec.code, sec.title, sIdx);

			for (let iIdx = 0; iIdx < (sec.items || []).length; iIdx++) {
				const itm = sec.items[iIdx];
				const itmId = `itm-${simId}-${sIdx + 1}-${iIdx + 1}`;
				db.prepare(`
					INSERT INTO items (id, section_id, simulation_id, code, description, points, sort_order)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`).run(itmId, secId, simId, itm.code, itm.description, itm.points, iIdx);
			}
		}
	}

	return simId;
}

export function updateSimulationTimerSettings(id: string, data: {
	duration_minutes?: number;
	timer_mode?: 'flexible' | 'committee';
}) {
	db.prepare(`
		UPDATE simulations
		SET duration_minutes = COALESCE(?, duration_minutes), timer_mode = COALESCE(?, timer_mode)
		WHERE id = ?
	`).run(data.duration_minutes ?? null, data.timer_mode ?? null, id);
}

export function updateSimulationSchedule(id: string, data: {
	duration_minutes: number;
	timer_mode?: 'flexible' | 'committee';
	schedule_start: string | null;
	schedule_end: string | null;
	status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
}) {
	db.prepare(`
		UPDATE simulations
		SET duration_minutes = ?, timer_mode = COALESCE(?, timer_mode), schedule_start = ?, schedule_end = ?, status = ?
		WHERE id = ?
	`).run(
		data.duration_minutes,
		data.timer_mode || null,
		data.schedule_start,
		data.schedule_end,
		data.status,
		id
	);
}

export function deleteSimulation(id: string) {
	db.prepare('DELETE FROM simulations WHERE id = ?').run(id);
}

export function getSubmissions(simulationId?: string): Submission[] {
	if (!simulationId) {
		const query = `
			SELECT sub.*, p.name as participant_name, p.identifier as participant_identifier, p.institution,
			       1 as has_submitted
			FROM submissions sub
			JOIN participants p ON p.id = sub.participant_id
			ORDER BY sub.total_score DESC, sub.submitted_at DESC
		`;
		return db.prepare(query).all() as Submission[];
	}

	const sim = getSimulation(simulationId);
	const maxWeight = sim ? sim.max_weight : 70;
	const allItems = getSimulationItems(simulationId);
	const totalItems = allItems.length;

	const query = `
		SELECT
			COALESCE(sub.id, 'temp-' || p.id) as id,
			COALESCE(sub.simulation_id, ?) as simulation_id,
			p.id as participant_id,
			p.name as participant_name,
			p.identifier as participant_identifier,
			p.institution,
			COALESCE(sub.total_score, 0) as total_score,
			COALESCE(sub.max_score, ?) as max_score,
			COALESCE(sub.passed_items, 0) as passed_items,
			COALESCE(sub.total_items, ?) as total_items,
			sub.raw_results,
			sub.logs,
			sub.first_submitted_at,
			sub.submitted_at,
			sub.deadline_at,
			COALESCE(sub.is_overdue, 0) as is_overdue,
			COALESCE(sub.timer_status, 'not_started') as timer_status,
			sub.remaining_seconds,
			sub.paused_at,
			CASE WHEN sub.id IS NOT NULL AND sub.submitted_at IS NOT NULL AND sub.raw_results != '[]' THEN 1 ELSE 0 END as has_submitted
		FROM participants p
		LEFT JOIN submissions sub ON sub.participant_id = p.id AND sub.simulation_id = ?
		ORDER BY (sub.id IS NOT NULL AND sub.submitted_at IS NOT NULL AND sub.raw_results != '[]') DESC,
		         sub.total_score DESC, sub.submitted_at DESC, p.identifier ASC
	`;

	return db.prepare(query).all(simulationId, maxWeight, totalItems, simulationId) as Submission[];
}

export function getSubmission(id: string): Submission | null {
	const sub = db.prepare(`
		SELECT sub.*, p.name as participant_name, p.identifier as participant_identifier, p.institution
		FROM submissions sub
		JOIN participants p ON p.id = sub.participant_id
		WHERE sub.id = ?
	`).get(id) as Submission | undefined;

	return sub || null;
}

export function getParticipantSubmission(simulationId: string, participantIdentifier: string): Submission | null {
	const sub = db.prepare(`
		SELECT sub.*, p.name as participant_name, p.identifier as participant_identifier, p.institution
		FROM submissions sub
		JOIN participants p ON p.id = sub.participant_id
		WHERE sub.simulation_id = ? AND p.identifier = ?
		ORDER BY sub.submitted_at DESC
		LIMIT 1
	`).get(simulationId, participantIdentifier) as Submission | undefined;

	return sub || null;
}

export interface SubmitMarkingInput {
	simulation_id?: string;
	simulation_title?: string;
	token?: string;
	participant_id?: string;
	participant_name?: string;
	institution?: string;
	results: Record<string, boolean | number>;
	logs?: Record<string, string>;
}

export function submitMarking(input: SubmitMarkingInput) {
	// Find simulation
	let sim: Simulation | undefined;
	if (input.simulation_id) {
		sim = db.prepare('SELECT * FROM simulations WHERE id = ?').get(input.simulation_id) as Simulation | undefined;
	}
	if (!sim && input.token) {
		sim = db.prepare('SELECT * FROM simulations WHERE api_token = ?').get(input.token) as Simulation | undefined;
	}
	if (!sim && input.simulation_title) {
		sim = db.prepare('SELECT * FROM simulations WHERE title LIKE ?').get(`%${input.simulation_title}%`) as Simulation | undefined;
	}
	if (!sim) {
		sim = db.prepare('SELECT * FROM simulations ORDER BY created_at ASC LIMIT 1').get() as Simulation | undefined;
	}
	if (!sim) {
		throw new Error('Simulation not found');
	}

	// Identify participant by ID
	const participantIdentifier = (input.participant_id || 'peserta-01').trim();
	const name = input.participant_name || `Peserta ${participantIdentifier}`;
	const institution = input.institution || 'Peserta Mandiri';

	let participant = db.prepare('SELECT * FROM participants WHERE identifier = ?').get(participantIdentifier) as Participant | undefined;
	if (!participant) {
		const newPid = 'part-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		db.prepare('INSERT INTO participants (id, name, identifier, institution) VALUES (?, ?, ?, ?)').run(
			newPid,
			name,
			participantIdentifier,
			institution
		);
		participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(newPid) as Participant;
	} else if (input.participant_name || input.institution) {
		db.prepare('UPDATE participants SET name = COALESCE(?, name), institution = COALESCE(?, institution) WHERE id = ?').run(
			input.participant_name || null,
			input.institution || null,
			participant.id
		);
	}

	const allItems = db.prepare('SELECT * FROM items WHERE simulation_id = ? ORDER BY sort_order ASC').all(sim.id) as Item[];

	const normalizedResults: Record<string, boolean> = {};
	for (const [key, val] of Object.entries(input.results)) {
		const cleanKey = key.trim().toUpperCase();
		normalizedResults[cleanKey] = Boolean(val);
	}

	let passedCount = 0;
	let totalEarned = 0;
	let maxPossible = 0;

	for (const itm of allItems) {
		maxPossible += itm.points;
		const cleanCode = itm.code.trim().toUpperCase();
		if (normalizedResults[cleanCode]) {
			passedCount++;
			totalEarned += itm.points;
		}
	}

	// Check simulation overall status if committee mode
	const timerMode = normalizeTimerMode(sim.timer_mode);
	if (timerMode === 'committee') {
		if (sim.status === 'paused') {
			throw new Error(`Simulasi "${sim.title}" sedang dijeda (Pause) oleh Admin. Pengiriman skor ditangguhkan.`);
		}
		if (sim.status !== 'active') {
			throw new Error(`Simulasi "${sim.title}" belum diaktifkan oleh Admin.`);
		}
	}

	const durationMinutes = sim.duration_minutes || 120;
	const now = new Date();

	// Check existing submission for participant
	let existingSub = db.prepare('SELECT * FROM submissions WHERE simulation_id = ? AND participant_id = ?').get(
		sim.id,
		participant.id
	) as Submission | undefined;

	if (timerMode === 'flexible') {
		if (!existingSub || existingSub.timer_status === 'not_started') {
			throw new Error(
				`Timer simulasi "${sim.title}" belum dimulai! Peserta wajib menekan Start Stopwatch di menu Timer sebelum script marking dapat mengirim skor.`
			);
		}

		if (existingSub.timer_status === 'paused') {
			throw new Error(
				`Timer simulasi "${sim.title}" sedang dijeda (Paused). Lanjutkan stopwatch di menu Timer untuk dapat memperbarui skor.`
			);
		}
	} else {
		// Committee mode: if participant submission doesn't exist yet, auto-create it using the session schedule
		if (!existingSub) {
			const subId = 'sub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
			const deadline = sim.schedule_end || new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
			db.prepare(`
				INSERT INTO submissions (
					id, simulation_id, participant_id, total_score, max_score, passed_items, total_items,
					raw_results, logs, first_submitted_at, submitted_at, deadline_at, is_overdue,
					timer_status, remaining_seconds, paused_at
				) VALUES (?, ?, ?, 0, ?, 0, ?, '[]', NULL, ?, ?, ?, 0, 'running', ?, NULL)
			`).run(
				subId,
				sim.id,
				participant.id,
				sim.max_weight || maxPossible,
				allItems.length,
				now.toISOString(),
				now.toISOString(),
				deadline,
				durationMinutes * 60
			);
			existingSub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(subId) as Submission;
		} else if (existingSub.timer_status === 'paused') {
			throw new Error(`Timer peserta untuk "${sim.title}" sedang dijeda.`);
		}
	}

	const firstSubmittedAt = existingSub.first_submitted_at || now.toISOString();
	let deadlineAt = existingSub.deadline_at || new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

	if (now > new Date(deadlineAt)) {
		db.prepare('UPDATE submissions SET is_overdue = 1 WHERE id = ?').run(existingSub.id);
		throw new Error(
			`Waktu pengerjaan simulasi "${sim.title}" telah habis.`
		);
	}

	db.prepare(`
		UPDATE submissions
		SET total_score = ?, max_score = ?, passed_items = ?, total_items = ?,
		    raw_results = ?, logs = ?, submitted_at = CURRENT_TIMESTAMP, is_overdue = 0, deadline_at = ?
		WHERE id = ?
	`).run(
		totalEarned,
		sim.max_weight || maxPossible,
		passedCount,
		allItems.length,
		JSON.stringify(normalizedResults),
		JSON.stringify(input.logs || {}),
		deadlineAt,
		existingSub.id
	);

	const elapsedMinutes = Math.floor((now.getTime() - new Date(firstSubmittedAt).getTime()) / (60 * 1000));
	const remainingMinutes = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now.getTime()) / (60 * 1000)));

	return {
		submission_id: existingSub.id,
		simulation_id: sim.id,
		simulation_title: sim.title,
		participant_id: participant.identifier,
		participant_name: participant.name,
		institution: participant.institution,
		total_score: totalEarned,
		max_score: sim.max_weight || maxPossible,
		passed_items: passedCount,
		total_items: allItems.length,
		percentage: maxPossible > 0 ? (totalEarned / maxPossible) * 100 : 0,
		is_first_hit: false,
		first_submitted_at: firstSubmittedAt,
		deadline_at: deadlineAt,
		elapsed_minutes: elapsedMinutes,
		remaining_minutes: remainingMinutes,
		is_overdue: false
	};
}

export function getParticipants(): Array<Participant & { submission_count: number; latest_score?: number }> {
	return db.prepare(`
		SELECT p.*, COUNT(sub.id) as submission_count, MAX(sub.total_score) as latest_score
		FROM participants p
		LEFT JOIN submissions sub ON sub.participant_id = p.id
		GROUP BY p.id
		ORDER BY p.identifier ASC
	`).all() as any[];
}

export function getNextParticipantIdentifier(): string {
	const all = db.prepare('SELECT identifier FROM participants').all() as Array<{ identifier: string }>;
	let maxNum = 0;
	for (const p of all) {
		const match = p.identifier.match(/^peserta-(\d+)$/i);
		if (match) {
			const n = parseInt(match[1], 10);
			if (n > maxNum) maxNum = n;
		}
	}
	const nextNum = maxNum > 0 ? maxNum + 1 : (all.length > 0 ? all.length + 1 : 1);
	return `peserta-${String(nextNum).padStart(2, '0')}`;
}

export function createParticipant(data: { identifier?: string; name?: string; institution?: string }) {
	let cleanId = data.identifier?.trim() || '';
	if (!cleanId) {
		cleanId = getNextParticipantIdentifier();
	}
	const id = 'part-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	const name = (data.name && data.name.trim()) || `Peserta ${cleanId.replace(/^peserta-/i, '')}`;
	const inst = data.institution?.trim() || null;

	db.prepare('INSERT INTO participants (id, name, identifier, institution) VALUES (?, ?, ?, ?)').run(
		id,
		name,
		cleanId,
		inst
	);
	return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant;
}

export function updateParticipant(id: string, data: { identifier: string; name: string; institution?: string }) {
	db.prepare('UPDATE participants SET identifier = ?, name = ?, institution = ? WHERE id = ?').run(
		data.identifier.trim(),
		data.name.trim(),
		data.institution?.trim() || null,
		id
	);
}

export function deleteParticipant(id: string) {
	db.prepare('DELETE FROM participants WHERE id = ?').run(id);
}

export function startParticipantTimer(simulationId: string, participantId: string, customDurationMinutes?: number) {
	const sim = getSimulation(simulationId);
	if (!sim) throw new Error('Simulasi tidak ditemukan');

	const participant = db.prepare('SELECT * FROM participants WHERE id = ? OR identifier = ?').get(
		participantId,
		participantId
	) as Participant | undefined;
	if (!participant) throw new Error('Peserta tidak ditemukan');

	const existingSub = db.prepare('SELECT * FROM submissions WHERE simulation_id = ? AND participant_id = ?').get(
		sim.id,
		participant.id
	) as Submission | undefined;

	const durationMinutes = customDurationMinutes || sim.duration_minutes || 120;
	const now = new Date();

	if (existingSub) {
		if (existingSub.timer_status === 'paused') {
			const rem = existingSub.remaining_seconds && existingSub.remaining_seconds > 0
				? existingSub.remaining_seconds
				: durationMinutes * 60;
			const newDeadline = new Date(now.getTime() + rem * 1000).toISOString();
			db.prepare(`
				UPDATE submissions
				SET timer_status = 'running', deadline_at = ?, paused_at = NULL, is_overdue = 0
				WHERE id = ?
			`).run(newDeadline, existingSub.id);
		} else {
			const deadline = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
			db.prepare(`
				UPDATE submissions
				SET timer_status = 'running', first_submitted_at = ?, deadline_at = ?, paused_at = NULL,
				    remaining_seconds = ?, is_overdue = 0
				WHERE id = ?
			`).run(now.toISOString(), deadline, durationMinutes * 60, existingSub.id);
		}
	} else {
		const subId = 'sub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		const deadline = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
		const allItems = getSimulationItems(sim.id);

		db.prepare(`
			INSERT INTO submissions (
				id, simulation_id, participant_id, total_score, max_score, passed_items, total_items,
				raw_results, logs, first_submitted_at, submitted_at, deadline_at, is_overdue,
				timer_status, remaining_seconds, paused_at
			) VALUES (?, ?, ?, 0, ?, 0, ?, '[]', NULL, ?, ?, ?, 0, 'running', ?, NULL)
		`).run(
			subId,
			sim.id,
			participant.id,
			sim.max_weight || 70,
			allItems.length,
			now.toISOString(),
			now.toISOString(),
			deadline,
			durationMinutes * 60
		);
	}
}

export function pauseParticipantTimer(simulationId: string, participantId: string) {
	const participant = db.prepare('SELECT * FROM participants WHERE id = ? OR identifier = ?').get(
		participantId,
		participantId
	) as Participant | undefined;
	if (!participant) return;

	const existingSub = db.prepare('SELECT * FROM submissions WHERE simulation_id = ? AND participant_id = ?').get(
		simulationId,
		participant.id
	) as Submission | undefined;

	if (!existingSub) {
		const sim = getSimulation(simulationId);
		if (!sim) return;
		const subId = 'sub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		const durationMinutes = sim.duration_minutes || 120;
		const allItems = getSimulationItems(sim.id);
		const now = new Date().toISOString();

		db.prepare(`
			INSERT INTO submissions (
				id, simulation_id, participant_id, total_score, max_score, passed_items, total_items,
				raw_results, logs, first_submitted_at, submitted_at, deadline_at, is_overdue,
				timer_status, remaining_seconds, paused_at
			) VALUES (?, ?, ?, 0, ?, 0, ?, '[]', NULL, ?, ?, ?, 0, 'paused', ?, ?)
		`).run(
			subId,
			sim.id,
			participant.id,
			sim.max_weight || 70,
			allItems.length,
			now,
			now,
			now,
			durationMinutes * 60,
			now
		);
		return;
	}

	if (existingSub.timer_status === 'running') {
		const now = Date.now();
		const deadline = existingSub.deadline_at ? new Date(existingSub.deadline_at).getTime() : now;
		const remaining = Math.max(0, Math.floor((deadline - now) / 1000));

		db.prepare(`
			UPDATE submissions
			SET timer_status = 'paused', remaining_seconds = ?, paused_at = ?
			WHERE id = ?
		`).run(remaining, new Date().toISOString(), existingSub.id);
	}
}

export function resumeParticipantTimer(simulationId: string, participantId: string) {
	startParticipantTimer(simulationId, participantId);
}

export function startAllTimers(simulationId: string) {
	const participants = db.prepare('SELECT id FROM participants').all() as Array<{ id: string }>;
	for (const p of participants) {
		startParticipantTimer(simulationId, p.id);
	}
}

export function pauseAllTimers(simulationId: string) {
	const participants = db.prepare('SELECT id FROM participants').all() as Array<{ id: string }>;
	for (const p of participants) {
		pauseParticipantTimer(simulationId, p.id);
	}
}

export function resumeAllTimers(simulationId: string) {
	const participants = db.prepare('SELECT id FROM participants').all() as Array<{ id: string }>;
	for (const p of participants) {
		resumeParticipantTimer(simulationId, p.id);
	}
}

export function startSimulationTimer(simulationId: string, durationMinutes?: number) {
	const sim = getSimulation(simulationId);
	if (!sim) throw new Error('Simulasi tidak ditemukan');

	const now = new Date();
	const dur = durationMinutes || sim.duration_minutes || 120;
	const scheduleEnd = new Date(now.getTime() + dur * 60 * 1000).toISOString();
	const timerMode = normalizeTimerMode(sim.timer_mode);

	if (sim.status === 'paused') {
		db.prepare(`
			UPDATE simulations
			SET status = 'active'
			WHERE id = ?
		`).run(simulationId);
		if (timerMode === 'committee') {
			resumeAllTimers(simulationId);
		}
	} else {
		db.prepare(`
			UPDATE simulations
			SET status = 'active', schedule_start = COALESCE(schedule_start, ?), schedule_end = ?, duration_minutes = ?
			WHERE id = ?
		`).run(now.toISOString(), scheduleEnd, dur, simulationId);
		if (timerMode === 'committee') {
			startAllTimers(simulationId);
		}
	}
}

export function pauseSimulationTimer(simulationId: string) {
	const sim = getSimulation(simulationId);
	if (!sim) throw new Error('Simulasi tidak ditemukan');

	db.prepare(`
		UPDATE simulations
		SET status = 'paused'
		WHERE id = ?
	`).run(simulationId);

	if (normalizeTimerMode(sim.timer_mode) === 'committee') {
		pauseAllTimers(simulationId);
	}
}

initDatabase();
