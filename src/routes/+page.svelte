<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let scheduleModalSim = $state<any>(null);

	async function selectAndGo(simId: string, targetPath: string = '/timer') {
		await fetch('/api/select-sim', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ simulationId: simId })
		});
		goto(`${targetPath}?sim=${simId}`);
	}
</script>

<div class="space-y-6 max-w-5xl mx-auto">
	<!-- Hero / Header -->
	<div class="text-center py-4">
		<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
			Pilih Simulasi Tes
		</h1>
		<p class="text-sm text-slate-600 mt-1 max-w-md mx-auto">
			Pilih modul yang akan dikerjakan atau dipantau. Pilihan akan tersimpan otomatis.
		</p>
	</div>

	<!-- Simulation Cards -->
	{#if data.simulations.length === 0}
		<div class="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
			<Icon name="folder" size={32} class="mx-auto text-slate-400 mb-2" />
			<h3 class="text-base font-bold text-slate-800">Belum ada simulasi aktif</h3>
			{#if data.user?.role === 'admin'}
				<a
					href="/simulations"
					class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
				>
					<Icon name="plus" size={14} />
					Buat Simulasi
				</a>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each data.simulations as sim}
				<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition">
					<div>
						<!-- Top badges -->
						<div class="flex items-center justify-between gap-2 mb-3">
							<span class="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded uppercase">
								{sim.module_label}
							</span>
							<span
								class="text-[11px] font-semibold px-2 py-0.5 rounded-full border {sim.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sim.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}"
							>
								{sim.status === 'active' ? 'Aktif' : sim.status === 'paused' ? 'Dijeda' : sim.status}
							</span>
						</div>

						<!-- Title -->
						<h2 class="text-base font-bold text-slate-900 leading-snug mb-1">
							{sim.title}
						</h2>
						{#if sim.folder_name}
							<div class="flex items-center gap-1 text-xs text-slate-500 mb-3">
								<Icon name="folder" size={12} />
								<span>{sim.folder_name}</span>
							</div>
						{/if}

						<!-- Info snippet -->
						<div class="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600 my-3">
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Durasi:</span>
								<span class="font-bold text-slate-800">{sim.duration_minutes || 120} Menit</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Mode Timer:</span>
								<span class="font-semibold {sim.timer_mode === 'committee' ? 'text-amber-700' : 'text-blue-700'}">
									{sim.timer_mode === 'committee' ? 'Diatur Panitia' : 'Fleksibel (Peserta)'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-slate-500">Bobot Nilai:</span>
								<span class="font-bold text-slate-800">{sim.max_weight} Poin</span>
							</div>
						</div>
					</div>

					<!-- Primary Action Button -->
					<div class="pt-3 border-t border-slate-100 space-y-2">
						<button
							type="button"
							class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
							onclick={() => selectAndGo(sim.id, data.user?.role === 'participant' ? '/timer' : '/scoreboard')}
						>
							<Icon name="play" size={15} />
							<span>Pilih Simulasi Ini</span>
						</button>

						<div class="grid grid-cols-2 gap-2 text-center text-xs">
							{#if data.user?.role === 'participant'}
								<button
									type="button"
									class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
									onclick={() => selectAndGo(sim.id, '/timer')}
								>
									Timer
								</button>
							{/if}
							<button
								type="button"
								class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
								class:col-span-2={data.user?.role !== 'participant'}
								onclick={() => selectAndGo(sim.id, '/scoreboard')}
							>
								Scoreboard
							</button>
						</div>

						{#if data.user?.role === 'admin'}
							<button
								type="button"
								class="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 pt-1"
								onclick={() =>
									(scheduleModalSim = { ...sim, timer_mode: sim.timer_mode || 'flexible' })}
							>
								Atur Sesi & Timer
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Atur Jadwal (Admin) -->
{#if scheduleModalSim}
	<div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup"
			onclick={() => (scheduleModalSim = null)}
		></button>

		<div class="relative z-10 bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
			<form
				id="sched-form"
				action="?/updateSchedule"
				method="POST"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						scheduleModalSim = null;
					};
				}}
			>
				<input type="hidden" name="id" value={scheduleModalSim.id} />
				<div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
					<h3 class="font-bold text-sm text-slate-800">Atur Sesi & Timer</h3>
					<button
						type="button"
						class="text-slate-400 hover:text-slate-600"
						onclick={() => (scheduleModalSim = null)}
					>
						<Icon name="x" size={16} />
					</button>
				</div>

				<div class="p-5 space-y-3 text-xs">
					<div>
						<label for="sched-status" class="block font-semibold text-slate-700 mb-1">Status:</label>
						<select
							id="sched-status"
							name="status"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
							value={scheduleModalSim.status || 'active'}
						>
							<option value="active">Aktif</option>
							<option value="paused">Dijeda (Pause)</option>
							<option value="completed">Selesai</option>
						</select>
					</div>

					<div>
						<label for="sched-mode" class="block font-semibold text-slate-700 mb-1">Mode Timer:</label>
						<select
							id="sched-mode"
							name="timer_mode"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
							bind:value={scheduleModalSim.timer_mode}
						>
							<option value="flexible">Fleksibel (Peserta atur sendiri)</option>
							<option value="committee">Diatur Panitia (Serentak)</option>
						</select>
						<p class="text-[11px] text-slate-500 mt-1">
							{#if scheduleModalSim.timer_mode === 'committee'}
								Peserta tidak dapat mengatur timer. Panitia memulai sesi untuk seluruh peserta.
							{:else}
								Peserta memulai, menjeda, dan melanjutkan timer masing-masing.
							{/if}
						</p>
					</div>

					<div>
						<label for="sched-dur" class="block font-semibold text-slate-700 mb-1">Durasi (Menit):</label>
						<input
							id="sched-dur"
							name="duration_minutes"
							type="number"
							min="1"
							class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
							value={scheduleModalSim.duration_minutes || 120}
							required
						/>
					</div>
				</div>
			</form>

			{#if scheduleModalSim.timer_mode === 'committee'}
				<div class="px-5 pb-4 space-y-2">
					<div class="pt-3 border-t border-slate-100">
						<span class="block font-semibold text-slate-700 mb-1">Kontrol Sesi Panitia:</span>
						<p class="text-[11px] text-slate-500 mb-2">
							Mulai sesi akan menjalankan timer seluruh peserta. Jeda sesi menghentikan sementara timer mereka.
						</p>
						<div class="grid grid-cols-2 gap-2">
							<form
								method="POST"
								action="?/startSimulation"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										scheduleModalSim = null;
									};
								}}
								onsubmit={(e) => {
									if (!confirm('Mulai sesi dan jalankan timer untuk semua peserta?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="simulationId" value={scheduleModalSim.id} />
								<input type="hidden" name="timer_mode" value={scheduleModalSim.timer_mode} />
								<input type="hidden" name="duration_minutes" value={scheduleModalSim.duration_minutes || 120} />
								<button
									type="submit"
									class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
								>
									<Icon name="play" size={13} />
									Mulai Sesi
								</button>
							</form>
							<form
								method="POST"
								action="?/pauseSimulation"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										scheduleModalSim = null;
									};
								}}
								onsubmit={(e) => {
									if (!confirm('Jeda sesi dan hentikan sementara timer semua peserta?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="simulationId" value={scheduleModalSim.id} />
								<input type="hidden" name="timer_mode" value={scheduleModalSim.timer_mode} />
								<input type="hidden" name="duration_minutes" value={scheduleModalSim.duration_minutes || 120} />
								<button
									type="submit"
									class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
								>
									<Icon name="pause" size={13} />
									Jeda Sesi
								</button>
							</form>
						</div>
					</div>
				</div>
			{/if}

			<div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
					onclick={() => (scheduleModalSim = null)}
				>
					Batal
				</button>
				<button
					type="submit"
					form="sched-form"
					class="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
				>
					Simpan
				</button>
			</div>
		</div>
	</div>
{/if}
