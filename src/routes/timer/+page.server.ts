import type { PageServerLoad, Actions } from './$types';
import {
	getSimulations,
	getSimulation,
	getParticipantSubmission,
	normalizeTimerMode,
	startParticipantTimer,
	pauseParticipantTimer,
	resumeParticipantTimer
} from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/timer');
	}

	// Timer is a participant-only feature. Admin monitors timers from the scoreboard.
	if (locals.user.role !== 'participant') {
		const simParam = url.searchParams.get('sim');
		throw redirect(303, simParam ? `/scoreboard?sim=${simParam}` : '/scoreboard');
	}

	const simulations = getSimulations();
	const cookieSim = cookies.get('active_simulation_id');
	const urlSim = url.searchParams.get('sim');

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
		maxAge: 60 * 60 * 24 * 7
	});

	const currentSimulation = getSimulation(activeSimId);
	if (!currentSimulation) {
		throw redirect(303, '/');
	}

	const targetParticipantId = locals.user.participantId || locals.user.username;
	const submission = getParticipantSubmission(activeSimId, targetParticipantId);

	return {
		simulations,
		currentSimulation,
		activeSimId,
		targetParticipantId,
		submission
	};
};

async function validateParticipantAction(locals: App.Locals, request: Request) {
	if (!locals.user) return { error: fail(401, { error: 'Autentikasi diperlukan' }) };
	if (locals.user.role !== 'participant') {
		return { error: fail(403, { error: 'Timer hanya dapat dikontrol oleh peserta.' }) };
	}

	const data = await request.formData();
	const simulationId = data.get('simulationId')?.toString();
	const participantId = locals.user.participantId || locals.user.username;

	if (!simulationId || !participantId) {
		return { error: fail(400, { error: 'Simulasi dan peserta diperlukan' }) };
	}

	const sim = getSimulation(simulationId);
	if (!sim) return { error: fail(404, { error: 'Simulasi tidak ditemukan' }) };

	if (normalizeTimerMode(sim.timer_mode) !== 'flexible') {
		return {
			error: fail(403, {
				error: 'Timer simulasi ini diatur oleh panitia. Peserta tidak dapat mengubah timer.'
			})
		};
	}

	return { simulationId, participantId };
}

export const actions: Actions = {
	start: async ({ request, locals }) => {
		const check = await validateParticipantAction(locals, request);
		if ('error' in check) return check.error;

		try {
			startParticipantTimer(check.simulationId, check.participantId);
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	},

	pause: async ({ request, locals }) => {
		const check = await validateParticipantAction(locals, request);
		if ('error' in check) return check.error;

		try {
			pauseParticipantTimer(check.simulationId, check.participantId);
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	},

	resume: async ({ request, locals }) => {
		const check = await validateParticipantAction(locals, request);
		if ('error' in check) return check.error;

		try {
			resumeParticipantTimer(check.simulationId, check.participantId);
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	}
};
