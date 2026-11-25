import type { PageServerLoad, Actions } from './$types';
import { getFolders, getSimulations, createFolder, deleteFolder, createSimulation, deleteSimulation } from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(303, '/login?redirectTo=/simulations');
	}

	const folderId = url.searchParams.get('folder') || undefined;
	const folders = getFolders();
	const simulations = getSimulations(folderId);

	return {
		folders,
		simulations,
		selectedFolderId: folderId || 'all'
	};
};

export const actions: Actions = {
	createFolder: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401, { error: 'Hanya administrator yang diizinkan' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;

		if (!name) {
			return fail(400, { error: 'Nama folder harus diisi' });
		}

		createFolder(name, description);
		return { success: true };
	},

	deleteFolder: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401, { error: 'Hanya administrator yang diizinkan' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (id) {
			deleteFolder(id);
		}
		return { success: true };
	},

	createSimulation: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401, { error: 'Hanya administrator yang diizinkan' });
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const module_label = data.get('module_label')?.toString().trim();
		const max_weight = parseFloat(data.get('max_weight')?.toString() || '100');
		const folder_id = data.get('folder_id')?.toString() || null;
		const description = data.get('description')?.toString() || null;
		const duration_minutes = parseInt(data.get('duration_minutes')?.toString() || '120', 10);
		const timer_mode = (data.get('timer_mode')?.toString() || 'flexible') as 'flexible' | 'committee';
		const bulk_text = data.get('bulk_text')?.toString().trim();

		if (!title || !module_label) {
			return fail(400, { error: 'Judul dan label modul wajib diisi' });
		}

		// Parse bulk text if provided, format:
		// [A] Konfigurasi Dasar
		// A1 | Hostname sesuai | 1.0
		// A2 | IP static terkonfigurasi | 1.5
		// [B] Layanan DNS
		// B1 | Bind9 active | 2.0
		const sections: Array<{
			code: string;
			title: string;
			items: Array<{ code: string; description: string; points: number }>;
		}> = [];

		if (bulk_text) {
			const lines = bulk_text.split('\n').map(l => l.trim()).filter(Boolean);
			let currentSection: {
				code: string;
				title: string;
				items: Array<{ code: string; description: string; points: number }>;
			} | null = null;

			for (const line of lines) {
				const secMatch = line.match(/^\[([A-Z0-9]+)\]\s*(.+)$/i);
				if (secMatch) {
					currentSection = {
						code: secMatch[1].toUpperCase(),
						title: secMatch[2].trim(),
						items: []
					};
					sections.push(currentSection);
					continue;
				}

				if (currentSection && line.includes('|')) {
					const parts = line.split('|').map(p => p.trim());
					if (parts.length >= 2) {
						const code = parts[0];
						const desc = parts[1];
						const pts = parts[2] ? parseFloat(parts[2]) || 1.0 : 1.0;
						currentSection.items.push({
							code,
							description: desc,
							points: pts
						});
					}
				}
			}
		}

		// If no sections parsed, add default template section
		if (sections.length === 0) {
			sections.push({
				code: 'A',
				title: 'Konfigurasi Utama',
				items: [
					{ code: 'A1', description: 'Konfigurasi hostname dan IP address', points: 1.0 },
					{ code: 'A2', description: 'Konektivitas dan akses remote', points: 1.5 }
				]
			});
		}

		createSimulation({
			title,
			module_label,
			max_weight,
			folder_id: folder_id === 'none' ? null : folder_id,
			description,
			duration_minutes: Number.isFinite(duration_minutes) && duration_minutes > 0 ? duration_minutes : 120,
			timer_mode: timer_mode === 'committee' ? 'committee' : 'flexible',
			sections
		});

		return { success: true };
	},

	deleteSimulation: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401, { error: 'Hanya administrator yang diizinkan' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (id) {
			deleteSimulation(id);
		}
		return { success: true };
	}
};
