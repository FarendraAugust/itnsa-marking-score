import { json, type RequestHandler } from '@sveltejs/kit';
import { getSubmissions, getSimulation } from '#lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const simId = url.searchParams.get('sim_id') || undefined;
	const submissions = getSubmissions(simId);
	let sim = null;
	if (simId) {
		sim = getSimulation(simId);
	}

	return json({
		simulation: sim,
		submissions,
		updated_at: new Date().toISOString()
	});
};
