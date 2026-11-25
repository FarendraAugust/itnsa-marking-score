import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const body = await request.json().catch(() => ({}));
	const simId = body.simulationId;

	if (simId) {
		cookies.set('active_simulation_id', simId, {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 7
		});
	}

	return json({ success: true, simulationId: simId });
};
