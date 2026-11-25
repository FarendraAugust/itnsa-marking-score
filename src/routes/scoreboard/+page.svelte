<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let selectedSim = $state('');
	let submissions = $state<any[]>([]);
	let autoRefresh = $state(true);
	let lastUpdated = $state(new Date().toLocaleTimeString('id-ID'));
	let nowTimestamp = $state(Date.now());
	let refreshInterval: any = null;
	let clockInterval: any = null;

	$effect(() => {
		selectedSim = data.selectedSim;
		submissions = data.submissions;
	});

	async function fetchLiveUpdates() {
		if (!selectedSim) return;
		try {
			const res = await fetch(`/api/live?sim_id=${selectedSim}`);
			if (res.ok) {
				const json = await res.json();
				submissions = json.submissions;
				lastUpdated = new Date().toLocaleTimeString('id-ID');
			}
		} catch (e) {
			console.error('Failed to poll live scores:', e);
		}
	}

	function handleSimChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedSim = target.value;
		if (selectedSim) {
			window.location.href = `/scoreboard?sim=${selectedSim}`;
		} else {
			window.location.href = `/scoreboard`;
		}
	}

	$effect(() => {
		// Update current timestamp every second for smooth ticking
		clockInterval = setInterval(() => {
			nowTimestamp = Date.now();
		}, 1000);

		if (autoRefresh && selectedSim) {
			refreshInterval = setInterval(fetchLiveUpdates, 3000);
		} else if (refreshInterval) {
			clearInterval(refreshInterval);
		}

		return () => {
			if (clockInterval) clearInterval(clockInterval);
			if (refreshInterval) clearInterval(refreshInterval);
		};
	});

	let isAdmin = $derived(data.user?.role === 'admin');
	let currentSimulation = $derived(data.simulations.find((s) => s.id === selectedSim));
	let totalParticipants = $derived(submissions.length);
	let submittedCount = $derived(submissions.filter((s) => s.has_submitted).length);
	let highestScore = $derived(
		submissions.length > 0 ? Math.max(...submissions.map((s) => s.total_score)).toFixed(2) : '0.00'
	);
	let averageScore = $derived(
		submittedCount > 0
			? (
					submissions.filter((s) => s.has_submitted).reduce((acc, s) => acc + s.total_score, 0) /
					submittedCount
				).toFixed(2)
			: '0.00'
	);

	function getRemainingTimeStr(sub: any) {
		if (sub.timer_status === 'paused') {
			const remSec = sub.remaining_seconds ?? 0;
			const m = Math.floor(remSec / 60);
			const s = remSec % 60;
			return {
				text: `Dijeda (${m}m ${s}s)`,
				status: 'paused',
				isOverdue: false
			};
		}

		if (sub.timer_status === 'not_started' || !sub.deadline_at) {
			return {
				text: 'Belum Mulai',
				status: 'not_started',
				isOverdue: false
			};
		}

		const deadline = new Date(sub.deadline_at).getTime();
		const diff = deadline - nowTimestamp;

		if (diff <= 0 || sub.is_overdue) {
			return {
				text: 'Waktu Habis',
				status: 'overdue',
				isOverdue: true
			};
		}

		const totalSec = Math.floor(diff / 1000);
		const hours = Math.floor(totalSec / 3600);
		const minutes = Math.floor((totalSec % 3600) / 60);
		const seconds = totalSec % 60;

		if (hours > 0) {
			return {
				text: `${hours}j ${minutes}m ${seconds}s`,
				status: 'running',
				isOverdue: false
			};
		}
		return {
			text: `${minutes}m ${seconds}s`,
			status: 'running',
			isOverdue: false
		};
	}
</script>

<div class="space-y-6">
	<!-- Top Bar Controls -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-bold text-slate-900 flex items-center gap-2">
				<Icon name="chart" size={20} />
				Scoreboard Live
			</h1>
			{#if currentSimulation}
				<div class="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
					<span class="font-semibold text-slate-700">{currentSimulation.title}</span>
					<span>·</span>
					<span>{currentSimulation.module_label}</span>
				</div>
			{/if}
		</div>
	</div>

	{#if !selectedSim}
		<!-- Simulation Selector Grid View -->
		<div class="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
			<div class="max-w-xl mx-auto text-center mb-8">
				<div class="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
					<Icon name="chart" size={24} />
				</div>
				<h2 class="text-xl font-bold text-slate-900">Pilih Modul Simulasi Terlebih Dahulu</h2>
				<p class="text-sm text-slate-600 mt-1">
					Silakan pilih salah satu modul simulasi di bawah ini untuk melihat live scoreboard, peringkat peserta, dan countdown pengerjaan.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each data.simulations as sim}
					<div class="p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between bg-slate-50/50">
						<div>
							<div class="flex items-center justify-between gap-2 mb-2">
								<span class="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
									{sim.module_label}
								</span>
								<span
									class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
									class:bg-emerald-50={sim.status === 'active'}
									class:text-emerald-700={sim.status === 'active'}
									class:border={sim.status === 'active'}
									class:border-emerald-200={sim.status === 'active'}
									class:bg-amber-50={sim.status === 'paused'}
									class:text-amber-800={sim.status === 'paused'}
									class:border-amber-200={sim.status === 'paused'}
									class:bg-slate-100={sim.status !== 'active' && sim.status !== 'paused'}
									class:text-slate-600={sim.status !== 'active' && sim.status !== 'paused'}
								>
									{sim.status === 'active' ? 'Sedang Berjalan' : sim.status === 'paused' ? 'Dijeda' : (sim.status || 'Draft')}
								</span>
							</div>

							<h3 class="text-base font-bold text-slate-900 mb-1">{sim.title}</h3>
							<p class="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
								<Icon name="folder" size={13} />
								<span>{sim.folder_name || 'Umum'}</span>
							</p>

							<div class="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1.5 text-xs text-slate-600 mb-4">
								<div class="flex items-center justify-between">
									<span class="text-slate-500">Durasi Sesi:</span>
									<span class="font-bold text-slate-800">{sim.duration_minutes || 120} Menit</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-slate-500">Mode Timer:</span>
									<span class="font-semibold text-[11px] {sim.timer_mode === 'committee' ? 'text-amber-700' : 'text-blue-700'}">
										{sim.timer_mode === 'committee' ? 'Diatur Panitia' : 'Fleksibel (Peserta)'}
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-slate-500">Bobot Maksimal:</span>
									<span class="font-bold text-slate-800">{sim.max_weight} Poin</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-slate-500">Peserta Terdaftar:</span>
									<span class="font-bold text-blue-600">{sim.participant_count || 0} Peserta</span>
								</div>
							</div>
						</div>

						<a
							href={`/scoreboard?sim=${sim.id}`}
							class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-2xs"
						>
							<Icon name="chart" size={14} />
							Buka Live Scoreboard
						</a>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Statistics Cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
			<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
					<Icon name="users" size={20} />
				</div>
				<div>
					<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Peserta</div>
					<div class="text-xl font-extrabold text-slate-900">{totalParticipants}</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
					<Icon name="trophy" size={20} />
				</div>
				<div>
					<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Tertinggi</div>
					<div class="text-xl font-extrabold text-slate-900">
						{highestScore} <span class="text-xs text-slate-500 font-semibold">/ {currentSimulation?.max_weight || 70}</span>
					</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
					<Icon name="chart" size={20} />
				</div>
				<div>
					<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata Skor</div>
					<div class="text-xl font-extrabold text-slate-900">{averageScore}</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
					<Icon name="clock" size={20} />
				</div>
				<div>
					<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Update Terakhir</div>
					<div class="text-base font-bold text-slate-900">{lastUpdated}</div>
				</div>
			</div>
		</div>

		<!-- Leaderboard Table Card -->
		<div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
				<div>
					<h2 class="text-base font-bold text-slate-900">
						Peringkat Peserta: {currentSimulation?.title || 'Semua Simulasi'}
					</h2>
					<p class="text-xs text-slate-500">
						Timer peserta mengikuti mode simulasi: fleksibel (diatur peserta) atau diatur panitia saat sesi dimulai.
					</p>
				</div>

				<div class="flex items-center gap-2">
					<a
						href={data.user?.role === 'participant'
							? `/sheet?sim=${selectedSim}&participant=${data.user.participantId}`
							: `/sheet?sim=${selectedSim}`}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
					>
						<Icon name="file-text" size={14} />
						{data.user?.role === 'participant' ? 'Lembar Nilai Saya' : 'Format Lembar Nilai'}
					</a>
					{#if isAdmin}
						<a
							href="/script-docs"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-2xs"
						>
							<Icon name="terminal" size={14} />
							Script Tester
						</a>
					{/if}
				</div>
			</div>

			{#if submissions.length === 0}
				<div class="py-16 px-4 text-center">
					<div class="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
						<Icon name="clock" size={24} />
					</div>
					<h3 class="text-base font-bold text-slate-800">Belum ada peserta terdaftar</h3>
					<p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
						Tambahkan peserta di menu Manajemen Peserta atau jalankan script marking dengan variable PARTICIPANT_ID.
					</p>
					{#if isAdmin}
						<a
							href="/users"
							class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
						>
							<Icon name="users" size={14} />
							Buka Manajemen Peserta
						</a>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
								<th class="py-3 px-4 text-center w-16">Peringkat</th>
								<th class="py-3 px-4">Identitas Peserta</th>
								<th class="py-3 px-4">Timer Peserta</th>
								<th class="py-3 px-4">Aspek Sesuai</th>
								<th class="py-3 px-4 w-56">Total Skor</th>
								<th class="py-3 px-4">Waktu Submit</th>
								<th class="py-3 px-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 text-slate-800">
							{#each submissions as sub, i}
								{@const pct = (sub.total_score / (sub.max_score || 70)) * 100}
								{@const timer = getRemainingTimeStr(sub)}
								<tr class="hover:bg-slate-50/80 transition">
									<td class="py-3 px-4 text-center font-bold">
										{#if !sub.has_submitted}
											<span class="text-slate-400 font-normal">-</span>
										{:else if i === 0}
											<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold border border-amber-300">
												1
											</span>
										{:else if i === 1}
											<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold border border-slate-300">
												2
											</span>
										{:else if i === 2}
											<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200">
												3
											</span>
										{:else}
											<span class="text-slate-500 font-medium">{i + 1}</span>
										{/if}
									</td>

									<td class="py-3 px-4">
										<div class="font-bold text-slate-900">{sub.participant_name}</div>
										<div class="text-[11px] text-slate-500 font-mono mt-0.5">
											ID: <span class="text-blue-600 font-bold">{sub.participant_identifier}</span> · {sub.institution || 'Mandiri'}
										</div>
									</td>

									<td class="py-3 px-4">
										<div class="space-y-1.5">
											<div class="flex items-center gap-1.5">
												<span
													class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
													class:bg-amber-50={timer.status === 'paused'}
													class:text-amber-800={timer.status === 'paused'}
													class:border={timer.status === 'paused'}
													class:border-amber-300={timer.status === 'paused'}
													class:bg-emerald-50={timer.status === 'running'}
													class:text-emerald-700={timer.status === 'running'}
													class:border-emerald-200={timer.status === 'running'}
													class:bg-red-50={timer.status === 'overdue'}
													class:text-red-700={timer.status === 'overdue'}
													class:border-red-200={timer.status === 'overdue'}
													class:bg-slate-100={timer.status === 'not_started'}
													class:text-slate-600={timer.status === 'not_started'}
													class:border-slate-200={timer.status === 'not_started'}
												>
													{#if timer.status === 'paused'}
														<Icon name="pause" size={11} />
													{:else if timer.status === 'running'}
														<Icon name="clock" size={11} />
													{:else if timer.status === 'overdue'}
														<Icon name="alert" size={11} />
													{:else}
														<Icon name="clock" size={11} />
													{/if}
													{timer.text}
												</span>
											</div>

										</div>
									</td>

									<td class="py-3 px-4">
										{#if sub.has_submitted}
											<span class="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold text-xs">
												{sub.passed_items} / {sub.total_items}
											</span>
										{:else}
											<span class="text-slate-400 text-xs italic">Belum submit</span>
										{/if}
									</td>

									<td class="py-3 px-4">
										{#if sub.has_submitted}
											<div class="space-y-1">
												<div class="flex items-baseline justify-between text-xs">
													<span class="font-extrabold text-slate-900 text-sm">
														{sub.total_score.toFixed(2).replace('.', ',')}
														<span class="text-slate-400 font-normal text-xs">/ {sub.max_score.toFixed(0)}</span>
													</span>
													<span class="text-xs font-bold text-blue-600">{pct.toFixed(1)}%</span>
												</div>
												<div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
													<div class="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full" style={`width: ${Math.min(pct, 100)}%`}></div>
												</div>
											</div>
										{:else}
											<span class="text-slate-400 text-xs">-</span>
										{/if}
									</td>

									<td class="py-3 px-4 text-slate-500 text-[11px]">
										{#if sub.has_submitted && sub.submitted_at}
											{new Date(sub.submitted_at).toLocaleTimeString('id-ID')}
										{:else}
											<span class="text-slate-400">-</span>
										{/if}
									</td>

									<td class="py-3 px-4 text-right">
										{#if sub.has_submitted}
											{#if data.user?.role === 'admin' || data.user?.participantId === sub.participant_identifier}
												<a
													href={`/sheet?sim=${sub.simulation_id}&participant=${sub.participant_identifier}`}
													class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition"
													class:bg-blue-600={data.user?.participantId === sub.participant_identifier}
													class:text-white={data.user?.participantId === sub.participant_identifier}
													class:bg-slate-100={data.user?.participantId !== sub.participant_identifier}
													class:hover:bg-slate-200={data.user?.participantId !== sub.participant_identifier}
													class:text-slate-700={data.user?.participantId !== sub.participant_identifier}
												>
													<Icon name="file-text" size={12} />
													{data.user?.participantId === sub.participant_identifier ? 'Sheet Saya' : 'Sheet'}
												</a>
											{:else}
												<span class="text-slate-300 text-xs select-none" title="Hanya dapat melihat sheet sendiri">-</span>
											{/if}
										{:else}
											<span class="text-slate-400 text-xs">-</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

