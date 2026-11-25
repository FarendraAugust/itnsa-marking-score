import type { PageServerLoad, Actions } from './$types';
import { getParticipants, createParticipant, updateParticipant, deleteParticipant, getNextParticipantIdentifier } from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(303, '/login?redirectTo=/users');
	}

	const participants = getParticipants();
	const nextIdentifier = getNextParticipantIdentifier();
	return {
		participants,
		nextIdentifier
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Hanya administrator yang diizinkan' });
		}

		const data = await request.formData();
		const identifier = data.get('identifier')?.toString().trim() || undefined;
		const name = data.get('name')?.toString().trim() || undefined;
		const institution = data.get('institution')?.toString().trim() || undefined;

		try {
			createParticipant({ identifier, name, institution });
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Gagal menambahkan peserta' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Hanya administrator yang diizinkan' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const identifier = data.get('identifier')?.toString().trim() || '';
		const name = data.get('name')?.toString().trim() || '';
		const institution = data.get('institution')?.toString().trim() || '';

		if (!id || !identifier || !name) {
			return fail(400, { error: 'ID, Identifier, dan Nama wajib diisi' });
		}

		try {
			updateParticipant(id, { identifier, name, institution });
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Hanya administrator yang diizinkan' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (id) {
			deleteParticipant(id);
		}
		return { success: true };
	}
};
