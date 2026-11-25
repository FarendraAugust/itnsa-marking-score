<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let nowTimestamp = $state(Date.now());
	let clockInterval: any = null;

	$effect(() => {
		clockInterval = setInterval(() => {
			nowTimestamp = Date.now();
		}, 1000);
		return () => {
			if (clockInterval) clearInterval(clockInterval);
		};
	});

	const durationMinutes = $derived(data.currentSimulation?.duration_minutes || 120);
	const totalDurationSec = $derived(durationMinutes * 60);

	let timerState = $derived.by(() => {
		const sub = data.submission;
		if (!sub || sub.timer_status === 'not_started' || !sub.deadline_at) {
			return {
				status: 'not_started',
				label: 'Belum Dimulai',
				elapsedSec: 0,
				remainingSec: totalDurationSec,
				isOverdue: false
			};
		}

		if (sub.timer_status === 'paused') {
			const rem = sub.remaining_seconds != null ? sub.remaining_seconds : totalDurationSec;
			const elapsed = Math.max(0, totalDurationSec - rem);
			return {
				status: 'paused',
				label: 'Dijeda (Paused)',
				elapsedSec: elapsed,
				remainingSec: rem,
				isOverdue: false
			};
		}

		// Running
		const deadline = new Date(sub.deadline_at).getTime();
		const diffSec = Math.floor((deadline - nowTimestamp) / 1000);

		if (diffSec <= 0 || sub.is_overdue) {
			return {
				status: 'overdue',
				label: 'Waktu Habis',
				elapsedSec: totalDurationSec,
				remainingSec: 0,
				isOverdue: true
			};
		}

		const elapsed = Math.max(0, totalDurationSec - diffSec);
		return {
			status: 'running',
			label: 'Sedang Berjalan',
			elapsedSec: elapsed,
			remainingSec: diffSec,
			isOverdue: false
		};
	});

	function formatTime(totalSec: number): { h: string; m: string; s: string } {
		const clamped = Math.max(0, Math.floor(totalSec));
		const h = String(Math.floor(clamped / 3600)).padStart(2, '0');
		const m = String(Math.floor((clamped % 3600) / 60)).padStart(2, '0');
		const s = String(clamped % 60).padStart(2, '0');
		return { h, m, s };
	}

	let elapsedParts = $derived(formatTime(timerState.elapsedSec));
	let remainingParts = $derived(formatTime(timerState.remainingSec));
</script>

<div class="space-y-6 max-w-3xl mx-auto">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-bold text-slate-900 flex items-center gap-2">
				<Icon name="clock" size={20} />
				Timer Pengerjaan
			</h1>
			{#if data.currentSimulation}
				<div class="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
					<span class="font-semibold text-slate-700">{data.currentSimulation.title}</span>
					<span>·</span>
					<span>Durasi {durationMinutes} Menit</span>
				</div>
			{/if}
		</div>

	</div>

	{#if data.currentSimulation}
		<!-- Main Timer Display Card -->
		<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
			<!-- Header inside card -->
			<div class="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
				<div class="text-xs">
					<span class="text-slate-500">ID Peserta: </span>
					<span class="font-mono font-bold text-blue-600">{data.targetParticipantId}</span>
				</div>

				<span
					class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
					class:bg-emerald-50={timerState.status === 'running'}
					class:text-emerald-700={timerState.status === 'running'}
					class:border-emerald-200={timerState.status === 'running'}
					class:bg-amber-50={timerState.status === 'paused'}
					class:text-amber-800={timerState.status === 'paused'}
					class:border-amber-300={timerState.status === 'paused'}
					class:bg-red-50={timerState.status === 'overdue'}
					class:text-red-700={timerState.status === 'overdue'}
					class:border-red-200={timerState.status === 'overdue'}
					class:bg-slate-100={timerState.status === 'not_started'}
					class:text-slate-600={timerState.status === 'not_started'}
					class:border-slate-200={timerState.status === 'not_started'}
				>
					{#if timerState.status === 'running'}
						<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
					{/if}
					{timerState.label}
				</span>
			</div>

			<!-- Large Digital Stopwatch Display -->
			<div class="p-8 sm:p-10 text-center">
				<div class="inline-block mx-auto mb-4">
					<span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
						Waktu Berjalan
					</span>
					<div class="text-5xl sm:text-7xl font-mono font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
						<span class="bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-xl">{elapsedParts.h}</span>
						<span class="text-slate-400">:</span>
						<span class="bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-xl">{elapsedParts.m}</span>
						<span class="text-slate-400">:</span>
						<span class="bg-slate-900 text-sky-400 px-3 sm:px-4 py-2 rounded-xl">{elapsedParts.s}</span>
					</div>
				</div>

				<div class="text-xs text-slate-500 mb-6 font-medium">
					Sisa Waktu: <strong class="text-slate-800 font-mono text-sm">{remainingParts.h}:{remainingParts.m}:{remainingParts.s}</strong>
				</div>

				<!-- Controls -->
				<div class="flex flex-wrap items-center justify-center gap-3">
					{#if data.currentSimulation.timer_mode === 'committee'}
						<div class="px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium text-center">
							{#if timerState.status === 'not_started'}
								Menunggu panitia memulai sesi.
							{:else if timerState.status === 'paused'}
								Sesi dijeda oleh panitia. Timer tidak dapat diubah peserta.
							{:else}
								Timer diatur oleh panitia. Peserta tidak dapat mengubah timer.
							{/if}
						</div>
					{:else}
						{#if timerState.status === 'not_started'}
							<form method="POST" action="?/start" use:enhance>
								<input type="hidden" name="simulationId" value={data.activeSimId} />
								<button
									type="submit"
									class="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-xs"
								>
									<Icon name="play" size={18} />
									Mulai
								</button>
							</form>
						{:else if timerState.status === 'running'}
							<form method="POST" action="?/pause" use:enhance>
								<input type="hidden" name="simulationId" value={data.activeSimId} />
								<button
									type="submit"
									class="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition shadow-xs"
								>
									<Icon name="pause" size={18} />
									Jeda (Pause)
								</button>
							</form>
						{:else if timerState.status === 'paused'}
							<form method="POST" action="?/resume" use:enhance>
								<input type="hidden" name="simulationId" value={data.activeSimId} />
								<button
									type="submit"
									class="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs"
								>
									<Icon name="play" size={18} />
									Lanjutkan
								</button>
							</form>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Footer Score & Navigation Links -->
			<div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
				<div class="flex items-center gap-4">
					<div>
						<span class="text-slate-500">Skor: </span>
						<strong class="text-slate-900 font-mono text-sm">
							{data.submission ? data.submission.total_score.toFixed(2).replace('.', ',') : '0,00'}
						</strong>
					</div>
					<div>
						<span class="text-slate-500">Aspek Sesuai: </span>
						<strong class="text-slate-900">{data.submission ? data.submission.passed_items : 0}</strong>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<a
						href={`/scoreboard?sim=${data.currentSimulation.id}`}
						class="text-blue-600 hover:text-blue-800 font-semibold"
					>
						Scoreboard →
					</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
			<p class="text-sm text-slate-600 mb-3">Silakan pilih simulasi terlebih dahulu.</p>
			<a href="/" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Pilih Simulasi</a>
		</div>
	{/if}
</div>
