import type { PageServerLoad } from './$types';
import { getSimulations, getSimulation } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(303, '/');
	}

	const simulations = getSimulations();
	const selectedSimId = url.searchParams.get('sim') || (simulations.length > 0 ? simulations[0].id : '');
	const simulation = selectedSimId ? getSimulation(selectedSimId) : null;

	return {
		simulations,
		simulation,
		selectedSimId
	};
};
