import type { PageServerLoad } from './$types';
import { getSimulations, getSubmissions } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const simulations = getSimulations();
	const urlSim = url.searchParams.get('sim');
	const cookieSim = cookies.get('active_simulation_id');

	let activeSimId = (urlSim && simulations.some((s) => s.id === urlSim))
		? urlSim
		: (cookieSim && simulations.some((s) => s.id === cookieSim) ? cookieSim : null);

	if (!activeSimId) {
		throw redirect(303, '/');
	}

	cookies.set('active_simulation_id', activeSimId, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 7
	});

	const submissions = getSubmissions(activeSimId);

	return {
		simulations,
		submissions,
		selectedSim: activeSimId
	};
};
