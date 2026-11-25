import { json, type RequestHandler } from '@sveltejs/kit';
import { submitMarking } from '#lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body || typeof body !== 'object') {
			return json({ error: 'Request body must be a JSON object' }, { status: 400 });
		}

		if (!body.results || typeof body.results !== 'object') {
			return json({ error: 'Missing or invalid "results" object mapping item codes to boolean' }, { status: 400 });
		}

		const result = submitMarking({
			simulation_id: body.simulation_id,
			simulation_title: body.simulation_title,
			token: body.token,
			participant_id: body.participant_id || body.username || body.nim || body.id,
			participant_name: body.participant_name || body.name || body.nama,
			institution: body.institution || body.school || body.sekolah || body.team,
			results: body.results,
			logs: body.logs
		});

		return json({
			status: 'success',
			message: 'Score successfully recorded',
			data: result
		});
	} catch (err: any) {
		return json({ error: err.message || 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async () => {
	return json({
		endpoint: '/api/mark',
		method: 'POST',
		description: 'Endpoint for automated ITNSA marking scripts to submit evaluation results.',
		example_payload: {
			participant_id: 'peserta-01',
			participant_name: 'Budi Santoso',
			institution: 'SMK Negeri 1 Surabaya',
			simulation_id: 'modul-2-client-server',
			results: {
				A2: false,
				A3: true,
				B1: true,
				B2: true,
				B3: false,
				C1: true,
				C2: true
			},
			logs: {
				A2: 'Ping ke fw-gw timeout',
				A3: 'dc01 computer name matched'
			}
		}
	});
};
