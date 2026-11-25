import type { LayoutServerLoad } from './$types';
import { getSimulations, getSimulation } from '#lib/server/db';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const simulations = getSimulations();

	// Check if sim passed in url param
	const urlSim = url.searchParams.get('sim');
	if (urlSim && simulations.some((s) => s.id === urlSim)) {
		cookies.set('active_simulation_id', urlSim, {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7
		});
	}

	const cookieSim = cookies.get('active_simulation_id');
	const activeSimId = (urlSim && simulations.some((s) => s.id === urlSim))
		? urlSim
		: (cookieSim && simulations.some((s) => s.id === cookieSim) ? cookieSim : null);

	const activeSimulation = activeSimId ? getSimulation(activeSimId) : null;

	return {
		user: locals.user,
		simulations,
		activeSimId,
		activeSimulation
	};
};
