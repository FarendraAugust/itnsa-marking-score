<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let searchQuery = $state('');
	let showAddModal = $state(false);
	let addIdentifier = $state('');
	$effect(() => {
		if (data.nextIdentifier) {
			addIdentifier = data.nextIdentifier;
		}
	});

	let editParticipant = $state<{
		id: string;
		identifier: string;
		name: string;
		institution: string | null;
	} | null>(null);

	let filteredParticipants = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return data.participants;
		return data.participants.filter(
			(p) =>
				p.identifier.toLowerCase().includes(q) ||
				p.name.toLowerCase().includes(q) ||
				(p.institution && p.institution.toLowerCase().includes(q))
		);
	});

	const activeCount = $derived.by(() => {
		return data.participants.filter((p) => p.submission_count > 0).length;
	});
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Manajemen Peserta</h1>
			<p class="text-sm text-slate-600 mt-1">
				Kelola identitas peserta kompetisi. ID Peserta digunakan untuk env <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs">PARTICIPANT_ID</code> pada script otomatis dan login peserta.
			</p>
		</div>

		<div>
			<button
				type="button"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-2xs"
				onclick={() => (showAddModal = true)}
			>
				<Icon name="plus" size={15} />
				Tambah Peserta
			</button>
		</div>
	</div>

	{#if form?.error}
		<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
			<Icon name="alert" size={16} />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Peserta Terdaftar</span>
				<div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
					<Icon name="users" size={18} />
				</div>
			</div>
			<p class="text-2xl font-bold text-slate-900 mt-2">{data.participants.length}</p>
		</div>

		<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Telah Mengirim Skor</span>
				<div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
					<Icon name="check" size={18} />
				</div>
			</div>
			<p class="text-2xl font-bold text-slate-900 mt-2">{activeCount}</p>
		</div>

		<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Belum Mengirim Skor</span>
				<div class="p-2 bg-slate-50 text-slate-600 rounded-lg">
					<Icon name="clock" size={18} />
				</div>
			</div>
			<p class="text-2xl font-bold text-slate-900 mt-2">{data.participants.length - activeCount}</p>
		</div>
	</div>

	<!-- Table Controls -->
	<div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
		<div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div class="w-full sm:w-72">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari ID, nama, atau institusi..."
					class="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<span class="text-xs text-slate-500 font-medium">
				Menampilkan {filteredParticipants.length} dari {data.participants.length} peserta
			</span>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse text-sm">
				<thead>
					<tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
						<th class="py-3 px-4">ID Peserta</th>
						<th class="py-3 px-4">Nama Lengkap</th>
						<th class="py-3 px-4">Asal Institusi / Sekolah</th>
						<th class="py-3 px-4 text-center">Submisi</th>
						<th class="py-3 px-4 text-right">Skor Tertinggi</th>
						<th class="py-3 px-4 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if filteredParticipants.length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-slate-500 text-sm">
								{#if searchQuery}
									Tidak ditemukan peserta yang cocok dengan kata kunci "{searchQuery}".
								{:else}
									Belum ada peserta terdaftar. Silakan klik "Tambah Peserta" di atas.
								{/if}
							</td>
						</tr>
					{:else}
						{#each filteredParticipants as p (p.id)}
							<tr class="hover:bg-slate-50/75 transition-colors">
								<td class="py-3 px-4 font-mono font-medium text-slate-900">
									<span class="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
										{p.identifier}
									</span>
								</td>
								<td class="py-3 px-4 font-medium text-slate-900">
									{p.name}
								</td>
								<td class="py-3 px-4 text-slate-600">
									{p.institution || '-'}
								</td>
								<td class="py-3 px-4 text-center">
									{#if p.submission_count > 0}
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
											{p.submission_count}x
										</span>
									{:else}
										<span class="text-xs text-slate-400">0</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-right font-medium">
									{#if p.latest_score !== null && p.latest_score !== undefined}
										<span class="text-blue-600 font-semibold">{p.latest_score.toFixed(1)}</span>
									{:else}
										<span class="text-slate-400">-</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-center">
									<div class="inline-flex items-center gap-1">
										<button
											type="button"
											class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
											title="Edit Peserta"
											onclick={() => {
												editParticipant = {
													id: p.id,
													identifier: p.identifier,
													name: p.name,
													institution: p.institution || ''
												};
											}}
										>
											<Icon name="edit" size={15} />
										</button>
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
												};
											}}
											onsubmit={(e) => {
												if (!confirm(`Hapus peserta "${p.name}" (${p.identifier})? Riwayat penilaian terkait akan terhapus.`)) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={p.id} />
											<button
												type="submit"
												class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
												title="Hapus Peserta"
											>
												<Icon name="trash" size={15} />
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Tambah Peserta -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup modal"
			onclick={() => (showAddModal = false)}
		></button>
		<div
			class="relative z-10 bg-white rounded-xl max-w-md w-full p-6 shadow-xl text-left border border-slate-200"
			role="dialog"
		>
			<div class="flex items-center justify-between pb-4 border-b border-slate-100">
				<h3 class="text-base font-bold text-slate-900">Tambah Peserta Baru</h3>
				<button
					type="button"
					class="p-1 text-slate-400 hover:text-slate-600 rounded"
					onclick={() => (showAddModal = false)}
				>
					<Icon name="x" size={16} />
				</button>
			</div>

			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							showAddModal = false;
						}
					};
				}}
				class="mt-4 space-y-4"
			>
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="create_id" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
							ID Peserta (Identifier)
						</label>
						<span class="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
							Otomatis Dibuat
						</span>
					</div>
					<input
						id="create_id"
						type="text"
						name="identifier"
						bind:value={addIdentifier}
						placeholder={data.nextIdentifier}
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
					/>
					<p class="text-xs text-slate-500 mt-1">
						ID terisi otomatis (<span class="font-mono text-blue-600">{data.nextIdentifier}</span>). Bisa dikustomisasi jika diperlukan.
					</p>
				</div>

				<div>
					<label for="create_name" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						Nama Lengkap Peserta
					</label>
					<input
						id="create_name"
						type="text"
						name="name"
						placeholder={`Peserta ${data.nextIdentifier?.replace('peserta-', '') || ''}`}
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<p class="text-xs text-slate-500 mt-1">
						Jika dikosongkan, otomatis menggunakan "Peserta {data.nextIdentifier?.replace('peserta-', '') || ''}".
					</p>
				</div>

				<div>
					<label for="create_inst" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						Asal Institusi / Sekolah
					</label>
					<input
						id="create_inst"
						type="text"
						name="institution"
						placeholder="contoh: SMKN 1 Jakarta"
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
					<button
						type="button"
						class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
						onclick={() => (showAddModal = false)}
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
					>
						Simpan Peserta
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Edit Peserta -->
{#if editParticipant}
	<div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup modal"
			onclick={() => (editParticipant = null)}
		></button>
		<div
			class="relative z-10 bg-white rounded-xl max-w-md w-full p-6 shadow-xl text-left border border-slate-200"
			role="dialog"
		>
			<div class="flex items-center justify-between pb-4 border-b border-slate-100">
				<h3 class="text-base font-bold text-slate-900">Edit Data Peserta</h3>
				<button
					type="button"
					class="p-1 text-slate-400 hover:text-slate-600 rounded"
					onclick={() => (editParticipant = null)}
				>
					<Icon name="x" size={16} />
				</button>
			</div>

			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							editParticipant = null;
						}
					};
				}}
				class="mt-4 space-y-4"
			>
				<input type="hidden" name="id" value={editParticipant.id} />

				<div>
					<label for="edit_id" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						ID Peserta (Identifier) *
					</label>
					<input
						id="edit_id"
						type="text"
						name="identifier"
						required
						bind:value={editParticipant.identifier}
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
					/>
				</div>

				<div>
					<label for="edit_name" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						Nama Lengkap Peserta *
					</label>
					<input
						id="edit_name"
						type="text"
						name="name"
						required
						bind:value={editParticipant.name}
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="edit_inst" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						Asal Institusi / Sekolah
					</label>
					<input
						id="edit_inst"
						type="text"
						name="institution"
						bind:value={editParticipant.institution}
						placeholder="contoh: SMKN 1 Jakarta"
						class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
					<button
						type="button"
						class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
						onclick={() => (editParticipant = null)}
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
					>
						Simpan Perubahan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
