import type { Handle } from '@sveltejs/kit/hooks';
import { validateSession, hasAdminUser } from '#lib/server/auth';
import { redirect, json } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');
	event.locals.user = sessionId ? validateSession(sessionId) : null;

	const path = event.url.pathname;

	// Check if this is the first install needing initial admin setup
	const adminExists = hasAdminUser();
	if (!adminExists) {
		if (!path.startsWith('/setup') && !path.startsWith('/api/mark')) {
			throw redirect(303, '/setup');
		}
		return resolve(event);
	} else if (path.startsWith('/setup')) {
		throw redirect(303, '/login');
	}

	// Paths allowed without login: /login and /api/mark (marking scripts)
	const isPublic = path.startsWith('/login') || path.startsWith('/api/mark');

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/')) {
			return json({ error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' }, { status: 401 });
		}
		const redirectTo = path === '/' ? '' : `?redirectTo=${encodeURIComponent(path + event.url.search)}`;
		throw redirect(303, `/login${redirectTo}`);
	}

	// Protect admin-only pages
	if (path.startsWith('/simulations') || path.startsWith('/users') || path.startsWith('/script-docs')) {
		if (event.locals.user?.role !== 'admin') {
			throw redirect(303, '/');
		}
	}

	// Protect admin-only API modification endpoints
	if (path.startsWith('/api/simulations') && event.request.method !== 'GET') {
		if (event.locals.user?.role !== 'admin') {
			return json({ error: 'Akses ditolak: Hanya administrator yang diizinkan' }, { status: 403 });
		}
	}

	return resolve(event);
};
