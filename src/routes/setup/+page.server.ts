import type { PageServerLoad, Actions } from './$types';
import { hasAdminUser, createFirstAdmin } from '#lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	if (hasAdminUser()) {
		throw redirect(303, '/login');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (hasAdminUser()) {
			return fail(400, { error: 'Administrator sudah dibuat sebelumnya.' });
		}

		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';
		const password = data.get('password')?.toString() || '';
		const confirmPassword = data.get('confirm_password')?.toString() || '';
		const fullName = data.get('full_name')?.toString().trim() || '';

		if (!username || username.length < 3) {
			return fail(400, { error: 'Username minimal 3 karakter' });
		}
		if (!password || password.length < 6) {
			return fail(400, { error: 'Password minimal 6 karakter' });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: 'Konfirmasi password tidak cocok' });
		}

		try {
			const session = createFirstAdmin(username, password, fullName);
			cookies.set('session_id', session.sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				expires: session.expiresAt
			});
		} catch (err: any) {
			return fail(400, { error: err.message });
		}

		throw redirect(303, '/');
	}
};
