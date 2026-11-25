import type { PageServerLoad, Actions } from './$types';
import {
	getSimulations,
	getSimulation,
	getFolders,
	updateSimulationSchedule,
	updateSimulationTimerSettings,
	startSimulationTimer,
	pauseSimulationTimer
} from '#lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const folderId = url.searchParams.get('folder') || undefined;
	const folders = getFolders();
	const simulations = getSimulations(folderId);

	return {
		folders,
		simulations,
		selectedFolder: folderId || 'all'
	};
};

export const actions: Actions = {
	startSimulation: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Hanya administrator yang diizinkan mengontrol timer simulasi' });
		}
		const data = await request.formData();
		const simulationId = data.get('simulationId')?.toString();
		if (!simulationId) return fail(400, { error: 'ID Simulasi diperlukan' });

		const timerModeRaw = data.get('timer_mode')?.toString();
		const durationRaw = data.get('duration_minutes')?.toString();
		const durationMinutes = durationRaw ? parseInt(durationRaw, 10) : undefined;

		try {
			updateSimulationTimerSettings(simulationId, {
				timer_mode: timerModeRaw === 'committee' ? 'committee' : timerModeRaw === 'flexible' ? 'flexible' : undefined,
				duration_minutes: durationMinutes && durationMinutes > 0 ? durationMinutes : undefined
			});
			startSimulationTimer(simulationId, durationMinutes && durationMinutes > 0 ? durationMinutes : undefined);
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	},

	pauseSimulation: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Hanya administrator yang diizinkan mengontrol timer simulasi' });
		}
		const data = await request.formData();
		const simulationId = data.get('simulationId')?.toString();
		if (!simulationId) return fail(400, { error: 'ID Simulasi diperlukan' });

		try {
			pauseSimulationTimer(simulationId);
			return { success: true };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	},

	updateSchedule: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { error: 'Akses ditolak: Hanya administrator yang berhak mengubah jadwal' });
		}
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const duration_minutes = parseInt(data.get('duration_minutes')?.toString() || '120', 10);
		const timer_mode = (data.get('timer_mode')?.toString() || 'flexible') as 'flexible' | 'committee';
		const schedule_start = data.get('schedule_start')?.toString() || null;
		const schedule_end = data.get('schedule_end')?.toString() || null;
		const status = (data.get('status')?.toString() || 'active') as 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';

		if (!id) {
			return fail(400, { error: 'ID Simulasi diperlukan' });
		}

		const previous = getSimulation(id);
		if (!previous) {
			return fail(404, { error: 'Simulasi tidak ditemukan' });
		}

		const nextScheduleStart = data.has('schedule_start') ? schedule_start : previous.schedule_start;
		const nextScheduleEnd = data.has('schedule_end') ? schedule_end : previous.schedule_end;

		updateSimulationSchedule(id, {
			duration_minutes,
			timer_mode,
			schedule_start: nextScheduleStart,
			schedule_end: nextScheduleEnd,
			status
		});

		// Keep session status and participant timers consistent when status changes.
		if (previous.status !== status) {
			if (status === 'active') {
				startSimulationTimer(id, duration_minutes);
			} else if (status === 'paused') {
				pauseSimulationTimer(id);
			} else if (status === 'completed') {
				pauseSimulationTimer(id);
				updateSimulationSchedule(id, {
					duration_minutes,
					timer_mode,
					schedule_start: nextScheduleStart,
					schedule_end: nextScheduleEnd,
					status: 'completed'
				});
			}
		}

		return { success: true };
	}
};
