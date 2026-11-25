import type { PageServerLoad, Actions } from './$types';
import { authenticateAdmin, loginParticipant } from '#lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, url.searchParams.get('redirectTo') || '/');
	}
	return {
		redirectTo: url.searchParams.get('redirectTo') || '/'
	};
};

export const actions: Actions = {
	loginAdmin: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';
		const password = data.get('password')?.toString() || '';
		const redirectTo = url.searchParams.get('redirectTo') || '/';

		if (!username || !password) {
			return fail(400, { error: 'Username dan password admin wajib diisi', tab: 'admin' });
		}

		try {
			const session = authenticateAdmin(username, password);
			cookies.set('session_id', session.sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				// SvelteKit defaults this to true in production, which breaks HTTP-only hosts.
				secure: url.protocol === 'https:',
				expires: session.expiresAt
			});
		} catch (err: any) {
			return fail(400, { error: err.message || 'Login admin gagal', tab: 'admin' });
		}

		throw redirect(303, redirectTo);
	},

	loginParticipant: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const participantId = data.get('participant_id')?.toString().trim() || '';

		if (!participantId) {
			return fail(400, { error: 'ID Peserta wajib diisi', tab: 'participant' });
		}

		try {
			const session = loginParticipant(participantId);
			cookies.set('session_id', session.sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: url.protocol === 'https:',
				expires: session.expiresAt
			});
		} catch (err: any) {
			return fail(400, { error: err.message || 'Login peserta gagal', tab: 'participant' });
		}

		const redirectTo = url.searchParams.get('redirectTo') || `/sheet?participant=${encodeURIComponent(participantId)}`;
		throw redirect(303, redirectTo);
	}
};
