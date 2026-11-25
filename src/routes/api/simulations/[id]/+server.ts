import { json, type RequestHandler } from '@sveltejs/kit';
import { getSimulation, deleteSimulation, getSubmissions } from '#lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	if (!params.id) {
		return json({ error: 'Simulation ID is required' }, { status: 400 });
	}
	const sim = getSimulation(params.id);
	if (!sim) {
		return json({ error: 'Simulation not found' }, { status: 404 });
	}
	const submissions = getSubmissions(params.id);
	return json({ simulation: sim, submissions });
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!params.id) {
		return json({ error: 'Simulation ID is required' }, { status: 400 });
	}
	deleteSimulation(params.id);
	return json({ status: 'success' });
};
