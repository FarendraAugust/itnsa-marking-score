import { json, type RequestHandler } from '@sveltejs/kit';
import { getSimulations, getFolders, createSimulation, createFolder } from '#lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const folderId = url.searchParams.get('folder_id') || undefined;
	const simulations = getSimulations(folderId);
	const folders = getFolders();
	return json({ simulations, folders });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		if (body.type === 'folder') {
			if (!body.name) return json({ error: 'Folder name is required' }, { status: 400 });
			const folder = createFolder(body.name, body.description);
			return json({ status: 'success', folder });
		}

		if (!body.title || !body.module_label) {
			return json({ error: 'title and module_label are required' }, { status: 400 });
		}

		const id = createSimulation({
			title: body.title,
			module_label: body.module_label,
			max_weight: Number(body.max_weight) || 100,
			folder_id: body.folder_id || null,
			description: body.description || null,
			api_token: body.api_token,
			sections: body.sections || []
		});

		return json({ status: 'success', id });
	} catch (err: any) {
		return json({ error: err.message }, { status: 500 });
	}
};
