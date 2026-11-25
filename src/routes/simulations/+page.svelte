<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let showNewFolderModal = $state(false);
	let showNewSimModal = $state(false);

	let selectedFolder = $state('all');
	$effect(() => {
		selectedFolder = data.selectedFolderId;
	});

	const bulkPlaceholder = `[A] Konfigurasi Dasar
A1 | Hostname & IP Static | 1.5
A2 | SSH Port & Root Login Disabled | 1.0

[B] Web & Database Server
B1 | Nginx web server active on port 80 | 1.5
B2 | SSL CA Certificate installed | 2.0
B3 | MariaDB database & user privilege | 1.5`;

	let activeSimulations = $derived(() => {
		if (selectedFolder === 'all') {
			return data.simulations;
		}
		return data.simulations.filter(s => s.folder_id === selectedFolder);
	});
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Manajemen Simulasi & Foldering</h1>
			<p class="text-sm text-slate-600 mt-1">
				Kelompokkan modul simulasi (Linux, Windows, Network) dan atur rubrik kriteria penilaian dinamis.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
				onclick={() => (showNewFolderModal = true)}
			>
				<Icon name="folder" size={15} />
				Tambah Folder
			</button>
			<button
				type="button"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-2xs"
				onclick={() => (showNewSimModal = true)}
			>
				<Icon name="plus" size={15} />
				Buat Simulasi Baru
			</button>
		</div>
	</div>

	<!-- Folder Navigation Bar -->
	<div class="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/simulations"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition"
				class:bg-blue-50={selectedFolder === 'all'}
				class:text-blue-700={selectedFolder === 'all'}
				class:border={selectedFolder === 'all'}
				class:border-blue-200={selectedFolder === 'all'}
				class:bg-slate-100={selectedFolder !== 'all'}
				class:text-slate-600={selectedFolder !== 'all'}
				class:hover:bg-slate-200={selectedFolder !== 'all'}
			>
				<Icon name="folder" size={14} />
				Semua Folder ({data.simulations.length})
			</a>

			{#each data.folders as folder}
				<div class="inline-flex items-center">
					<a
						href={`/simulations?folder=${folder.id}`}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-semibold transition"
						class:bg-blue-50={selectedFolder === folder.id}
						class:text-blue-700={selectedFolder === folder.id}
						class:border-y={selectedFolder === folder.id}
						class:border-l={selectedFolder === folder.id}
						class:border-blue-200={selectedFolder === folder.id}
						class:bg-slate-100={selectedFolder !== folder.id}
						class:text-slate-600={selectedFolder !== folder.id}
						class:hover:bg-slate-200={selectedFolder !== folder.id}
					>
						<Icon name="folder" size={14} />
						{folder.name} ({folder.simulation_count || 0})
					</a>
					<form action="?/deleteFolder" method="POST" use:enhance class="inline">
						<input type="hidden" name="id" value={folder.id} />
						<button
							type="submit"
							class="px-2 py-1.5 rounded-r-full text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-bold transition border-y border-r border-slate-200"
							title="Hapus folder ini"
							onclick={(e) => {
								if (!confirm(`Hapus folder "${folder.name}"? Modul di dalamnya tidak akan terhapus.`)) {
									e.preventDefault();
								}
							}}
						>
							<Icon name="x" size={12} />
						</button>
					</form>
				</div>
			{/each}
		</div>
	</div>

	<!-- Simulations List Grid -->
	{#if activeSimulations().length === 0}
		<div class="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
			<div class="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
				<Icon name="folder" size={24} />
			</div>
			<h3 class="text-base font-bold text-slate-800">Belum ada simulasi di folder ini</h3>
			<p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
				Buat simulasi baru untuk memulai rubrik penilaian atau pilih folder lainnya.
			</p>
			<button
				type="button"
				class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
				onclick={() => (showNewSimModal = true)}
			>
				<Icon name="plus" size={14} />
				Tambah Simulasi Baru
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each activeSimulations() as sim}
				<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
					<div>
						<div class="flex items-start justify-between gap-2 mb-2">
							<span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
								{sim.module_label}
							</span>
							<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
								Bobot {sim.max_weight}
							</span>
						</div>

						<h3 class="text-base font-bold text-slate-900 leading-snug">
							{sim.title}
						</h3>

						<p class="text-xs text-slate-600 line-clamp-2 mt-1.5 mb-3 leading-relaxed">
							{sim.description || 'Tidak ada deskripsi.'}
						</p>

						<div class="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600 mb-4">
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Folder:</span>
								<span class="font-semibold text-slate-800">{sim.folder_name || 'Tanpa Folder'}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Total Aspek:</span>
								<span class="font-semibold text-slate-800">{sim.item_count || 0} item</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Durasi:</span>
								<span class="font-semibold text-slate-800">{sim.duration_minutes || 120} Menit</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Mode Timer:</span>
								<span class="font-semibold text-slate-800">
									{sim.timer_mode === 'committee' ? 'Diatur Panitia' : 'Fleksibel'}
								</span>
							</div>
							<div class="flex items-center justify-between pt-1 border-t border-slate-200">
								<span class="text-slate-500">Token API:</span>
								<code class="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-bold">{sim.api_token}</code>
							</div>
						</div>
					</div>

					<div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
						<div class="flex items-center gap-1.5">
							<a href={`/sheet?sim=${sim.id}`} class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
								<Icon name="file-text" size={13} />
								Sheet
							</a>
							<a href={`/scoreboard?sim=${sim.id}`} class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
								<Icon name="chart" size={13} />
								Live
							</a>
						</div>

						<form action="?/deleteSimulation" method="POST" use:enhance class="inline">
							<input type="hidden" name="id" value={sim.id} />
							<button
								type="submit"
								class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
								title="Hapus simulasi ini"
								onclick={(e) => {
									if (!confirm(`Hapus simulasi "${sim.title}" dan seluruh data nilainya?`)) {
										e.preventDefault();
									}
								}}
							>
								<Icon name="trash" size={15} />
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal: Tambah Folder Baru -->
{#if showNewFolderModal}
	<div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup modal"
			onclick={() => (showNewFolderModal = false)}
		></button>
		<div class="relative z-10 bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
			<form
				action="?/createFolder"
				method="POST"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showNewFolderModal = false;
					};
				}}
			>
				<div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
					<h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
						<Icon name="folder" size={18} />
						Tambah Folder Baru
					</h3>
					<button type="button" class="text-slate-400 hover:text-slate-600 p-1" onclick={() => (showNewFolderModal = false)}>
						<Icon name="x" size={18} />
					</button>
				</div>

				<div class="p-5 space-y-3.5 text-xs">
					<div>
						<label for="folder-name" class="block font-semibold text-slate-700 mb-1">Nama Folder / Kategori:</label>
						<input
							id="folder-name"
							name="name"
							type="text"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="Misal: Modul Linux, Modul Windows, LKS ITNSA 2024"
							required
						/>
					</div>

					<div>
						<label for="folder-desc" class="block font-semibold text-slate-700 mb-1">Deskripsi (Opsional):</label>
						<textarea
							id="folder-desc"
							name="description"
							rows="2"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="Keterangan singkat kelompok simulasi"
						></textarea>
					</div>
				</div>

				<div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
					<button
						type="button"
						class="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
						onclick={() => (showNewFolderModal = false)}
					>
						Batal
					</button>
					<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
						Simpan Folder
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Buat Simulasi Baru -->
{#if showNewSimModal}
	<div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup modal"
			onclick={() => (showNewSimModal = false)}
		></button>
		<div class="relative z-10 bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
			<form
				action="?/createSimulation"
				method="POST"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showNewSimModal = false;
					};
				}}
			>
				<div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
					<h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
						<Icon name="plus" size={18} />
						Buat Simulasi Baru & Aspek Penilaian
					</h3>
					<button type="button" class="text-slate-400 hover:text-slate-600 p-1" onclick={() => (showNewSimModal = false)}>
						<Icon name="x" size={18} />
					</button>
				</div>

				<div class="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<label for="sim-title" class="block font-semibold text-slate-700 mb-1">Judul Simulasi:</label>
							<input
								id="sim-title"
								name="title"
								type="text"
								class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
								placeholder="Misal: Linux Gateway & Security System"
								required
							/>
						</div>

						<div>
							<label for="sim-module-label" class="block font-semibold text-slate-700 mb-1">Label Modul:</label>
							<input
								id="sim-module-label"
								name="module_label"
								type="text"
								class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
								placeholder="MODUL 1 · BOBOT 50%"
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="sim-folder" class="block font-semibold text-slate-700 mb-1">Kategori / Folder:</label>
							<select id="sim-folder" name="folder_id" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
								<option value="none">-- Tanpa Folder (Umum) --</option>
								{#each data.folders as f}
									<option value={f.id}>{f.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="sim-weight" class="block font-semibold text-slate-700 mb-1">Maksimal Bobot Nilai:</label>
							<input
								id="sim-weight"
								name="max_weight"
								type="number"
								step="0.5"
								class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
								value="100"
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="sim-timer-mode" class="block font-semibold text-slate-700 mb-1">Mode Timer:</label>
							<select
								id="sim-timer-mode"
								name="timer_mode"
								class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								<option value="flexible">Fleksibel (Peserta atur sendiri)</option>
								<option value="committee">Diatur Panitia (Serentak)</option>
							</select>
						</div>

						<div>
							<label for="sim-duration" class="block font-semibold text-slate-700 mb-1">Durasi (Menit):</label>
							<input
								id="sim-duration"
								name="duration_minutes"
								type="number"
								min="1"
								value="120"
								class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
								required
							/>
						</div>
					</div>

					<div>
						<label for="sim-description" class="block font-semibold text-slate-700 mb-1">Deskripsi Simulasi:</label>
						<textarea
							id="sim-description"
							name="description"
							rows="2"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="Ringkasan skenario dan tujuan pengujian"
						></textarea>
					</div>

					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="sim-bulk" class="block font-semibold text-slate-700">Input Cepat Rubrik & Aspek Penilaian:</label>
							<span class="text-[11px] text-slate-500">Format: [Huruf] Judul Seksi, lalu baris Kode | Deskripsi | Poin</span>
						</div>
						<textarea
							id="sim-bulk"
							name="bulk_text"
							rows="8"
							class="w-full p-3 font-mono border border-slate-300 rounded-lg text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
							placeholder={bulkPlaceholder}
						></textarea>
					</div>
				</div>

				<div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
					<button
						type="button"
						class="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
						onclick={() => (showNewSimModal = false)}
					>
						Batal
					</button>
					<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
						Simpan & Buat Simulasi
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
