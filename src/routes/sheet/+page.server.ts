import type { PageServerLoad } from './$types';
import { getSimulations, getSimulation, getSubmissions, getParticipantSubmission } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	const simulations = getSimulations();
	const urlSim = url.searchParams.get('sim');
	const cookieSim = cookies.get('active_simulation_id');

	let requestedSimId = (urlSim && simulations.some((s) => s.id === urlSim))
		? urlSim
		: (cookieSim && simulations.some((s) => s.id === cookieSim) ? cookieSim : null);

	if (!requestedSimId) {
		throw redirect(303, '/');
	}

	cookies.set('active_simulation_id', requestedSimId, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	let requestedParticipant = url.searchParams.get('participant') || undefined;

	// Access control: if user is a participant, restrict to themselves only!
	const isParticipant = locals.user?.role === 'participant';
	if (isParticipant) {
		requestedParticipant = locals.user?.participantId || locals.user?.username;
	}

	const simulation = requestedSimId ? getSimulation(requestedSimId) : null;
	const allSubmissions = requestedSimId ? getSubmissions(requestedSimId) : [];

	// Filter submissions list so participants don't receive other participants' data in props
	const submissions = isParticipant
		? allSubmissions.filter((s) => s.participant_identifier === requestedParticipant)
		: allSubmissions;

	let currentSubmission = null;
	if (requestedSimId && requestedParticipant) {
		currentSubmission = getParticipantSubmission(requestedSimId, requestedParticipant);
	}
	if (!currentSubmission && !isParticipant && submissions.length > 0) {
		currentSubmission = submissions[0];
	}

	return {
		simulations,
		simulation,
		submissions,
		currentSubmission,
		selectedSimId: requestedSimId,
		selectedParticipantId: requestedParticipant || (currentSubmission ? currentSubmission.participant_identifier : '')
	};
};
