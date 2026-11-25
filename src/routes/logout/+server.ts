import type { RequestHandler } from './$types';
import { invalidateSession } from '#lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		invalidateSession(sessionId);
		cookies.delete('session_id', { path: '/' });
	}
	throw redirect(303, '/login');
};
