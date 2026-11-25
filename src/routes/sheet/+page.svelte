<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let selectedSimId = $state('');
	let selectedParticipantId = $state('');
	let selectedLogItem = $state<{ code: string; desc: string; passed: boolean; log?: string } | null>(null);

	$effect(() => {
		selectedSimId = data.selectedSimId || '';
		selectedParticipantId = data.selectedParticipantId || '';
	});

	// Parse submission results & logs
	let resultsMap = $derived.by<Record<string, boolean>>(() => {
		if (!data.currentSubmission?.raw_results) return {};
		try {
			return JSON.parse(data.currentSubmission.raw_results);
		} catch {
			return {};
		}
	});

	let logsMap = $derived.by<Record<string, string>>(() => {
		if (!data.currentSubmission?.logs) return {};
		try {
			return JSON.parse(data.currentSubmission.logs);
		} catch {
			return {};
		}
	});

	function formatScore(val: number): string {
		return val.toFixed(2).replace('.', ',');
	}

	function handleSelectionChange() {
		goto(`/sheet?sim=${selectedSimId}&participant=${selectedParticipantId}`);
	}

	function openItemLog(code: string, desc: string, passed: boolean) {
		const cleanCode = code.trim().toUpperCase();
		const log = logsMap[cleanCode] || 'Tidak ada catatan log / bukti command untuk aspek ini.';
		selectedLogItem = { code, desc, passed, log };
	}

	// Calculate section and summary stats
	let sectionsWithStats = $derived.by(() => {
		if (!data.simulation?.sections) return [];
		const res = resultsMap;

		return data.simulation.sections.map((sec) => {
			const items = sec.items || [];
			let earned = 0;
			let total = 0;
			let passedCount = 0;

			const evaluatedItems = items.map((itm) => {
				const codeClean = itm.code.trim().toUpperCase();
				const isTested = codeClean in res;
				const passed = isTested ? Boolean(res[codeClean]) : null;
				const itemEarned = passed === true ? itm.points : 0;

				total += itm.points;
				if (passed === true) {
					earned += itm.points;
					passedCount++;
				}

				return {
					...itm,
					isTested,
					passed,
					earned: itemEarned
				};
			});

			let badgeType: 'lengkap' | 'belum_ada' | 'partial' = 'partial';
			if (items.length > 0 && passedCount === items.length) {
				badgeType = 'lengkap';
			} else if (items.length > 0 && passedCount === 0) {
				badgeType = 'belum_ada';
			}

			return {
				...sec,
				items: evaluatedItems,
				earned,
				total,
				passedCount,
				totalItems: items.length,
				badgeType
			};
		});
	});

	// Split sections into 2 columns (e.g. A-F and G-L)
	let col1Sections = $derived.by(() => {
		const secs = sectionsWithStats;
		const half = Math.ceil(secs.length / 2);
		return secs.slice(0, half);
	});

	let col2Sections = $derived.by(() => {
		const secs = sectionsWithStats;
		const half = Math.ceil(secs.length / 2);
		return secs.slice(half);
	});

	// Summary sentence logic
	let summaryText = $derived.by(() => {
		const secs = sectionsWithStats;
		let totalPassed = 0;
		let totalAspects = 0;
		const lengkapList: string[] = [];
		const belumAdaList: string[] = [];

		for (const s of secs) {
			totalPassed += s.passedCount;
			totalAspects += s.totalItems;
			if (s.badgeType === 'lengkap') {
				lengkapList.push(s.title);
			} else if (s.badgeType === 'belum_ada') {
				belumAdaList.push(s.title);
			}
		}

		let text = `${totalPassed} dari ${totalAspects} aspek sesuai. Penilaian measurement: aspek sesuai = nilai penuh, tidak sesuai = 0.`;
		if (lengkapList.length > 0) {
			text += ` Lengkap: ${lengkapList.join(', ')}.`;
		}
		if (belumAdaList.length > 0) {
			text += ` Belum ada nilai: ${belumAdaList.join(', ')}.`;
		}
		return text;
	});

	let totalEarnedScore = $derived.by(() => {
		const secs = sectionsWithStats;
		return secs.reduce((acc, s) => acc + s.earned, 0);
	});

	let maxWeight = $derived(data.simulation?.max_weight || 70);
</script>

<div class="space-y-5">
	<!-- Control Bar (hidden when printing) -->
	<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
		<div class="flex flex-wrap items-center gap-3">
			{#if data.user?.role === 'participant'}
				<div class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
					<Icon name="users" size={14} />
					<span>Lembar Saya: {data.user.fullName} ({data.user.participantId})</span>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<label for="select-part" class="text-xs font-semibold text-slate-600">Peserta:</label>
					<select
						id="select-part"
						class="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 min-w-[220px]"
						bind:value={selectedParticipantId}
						onchange={handleSelectionChange}
					>
						{#if data.submissions.length === 0}
							<option value="">(Belum ada peserta)</option>
						{:else}
							{#each data.submissions as sub}
								<option value={sub.participant_identifier}>
									{sub.participant_name} ({sub.participant_identifier}) - {sub.institution || 'Umum'}
								</option>
							{/each}
						{/if}
					</select>
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2.5">
			{#if data.currentSubmission}
				<div class="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
					<span class="font-semibold text-slate-900">{data.currentSubmission.participant_name}</span>
					<span class="text-slate-400 mx-1">|</span>
					<span class="font-mono text-blue-600 font-bold">{data.currentSubmission.participant_identifier}</span>
				</div>
			{/if}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
				onclick={() => window.print()}
			>
				<Icon name="printer" size={14} />
				<span>Cetak / Simpan PDF</span>
			</button>
		</div>
	</div>

	{#if !data.currentSubmission && data.user?.role === 'participant'}
		<div class="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2 max-w-[1100px] mx-auto w-full no-print">
			<Icon name="clock" size={16} />
			<span>Anda belum mengirimkan hasil penilaian untuk simulasi ini. Lembar di bawah ini menampilkan rubrik kriteria aspek yang akan dinilai.</span>
		</div>
	{/if}

	<!-- Printable Sheet Container (Exact match to the competition standard) -->
	<div class="evaluation-sheet bg-white p-6 sm:p-10 rounded-lg border border-slate-300 shadow-sm max-w-[1100px] mx-auto w-full text-slate-800">
		<!-- Header -->
		<div class="flex justify-between items-end pb-2">
			<div>
				<div class="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
					{data.simulation?.module_label || 'MODUL 2 · BOBOT 70%'}
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
					{data.simulation?.title || 'Client-Server Environment'}
				</h1>
			</div>

			<div class="flex items-baseline gap-1 text-right">
				<span class="text-3xl sm:text-4xl font-extrabold text-sky-800 tracking-tight">
					{formatScore(totalEarnedScore)}
				</span>
				<span class="text-xl text-slate-400 font-semibold mx-0.5">/</span>
				<span class="text-2xl font-bold text-slate-500">{maxWeight}</span>
			</div>
		</div>

		<!-- Summary line with bottom rule -->
		<div class="text-[13px] text-slate-600 leading-relaxed pt-2 pb-3.5 border-b border-slate-200 mb-5">
			{summaryText}
		</div>

		<!-- 2-Column Sections Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
			<!-- Column 1 -->
			<div class="flex flex-col gap-4">
				{#each col1Sections as sec}
					<div class="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs section-card">
						<div class="flex items-center justify-between px-3 py-2 bg-white border-b border-dashed border-slate-200">
							<span class="text-[13px] font-bold text-slate-900">{sec.code}. {sec.title}</span>
							{#if sec.badgeType === 'lengkap'}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
									Lengkap
								</span>
							{:else if sec.badgeType === 'belum_ada'}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
									Belum ada
								</span>
							{:else}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
									{formatScore(sec.earned)}/{formatScore(sec.total)}
								</span>
							{/if}
						</div>

						<div class="divide-y divide-dotted divide-slate-100">
							{#each sec.items as itm}
								<button
									type="button"
									class="w-full flex items-baseline px-3 py-1.5 text-left hover:bg-slate-50 transition text-[12px] leading-snug cursor-pointer group"
									onclick={() => openItemLog(itm.code, itm.description, itm.passed === true)}
									title="Klik untuk melihat bukti log marking aspek ini"
								>
									<span class="w-5 shrink-0 font-bold text-sm">
										{#if itm.passed === true}
											<span class="text-emerald-600">✓</span>
										{:else if itm.passed === false}
											<span class="text-red-600">✗</span>
										{:else}
											<span class="text-slate-400">?</span>
										{/if}
									</span>
									<span class="w-7 shrink-0 font-bold font-mono text-slate-700">{itm.code}</span>
									<span class="flex-1 text-slate-800 pr-2 group-hover:text-blue-600 transition-colors">{itm.description}</span>
									<span class="shrink-0 font-semibold font-mono text-slate-500 text-right min-w-[55px]">
										{formatScore(itm.earned)}/{formatScore(itm.points)}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Column 2 -->
			<div class="flex flex-col gap-4">
				{#each col2Sections as sec}
					<div class="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs section-card">
						<div class="flex items-center justify-between px-3 py-2 bg-white border-b border-dashed border-slate-200">
							<span class="text-[13px] font-bold text-slate-900">{sec.code}. {sec.title}</span>
							{#if sec.badgeType === 'lengkap'}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
									Lengkap
								</span>
							{:else if sec.badgeType === 'belum_ada'}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
									Belum ada
								</span>
							{:else}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
									{formatScore(sec.earned)}/{formatScore(sec.total)}
								</span>
							{/if}
						</div>

						<div class="divide-y divide-dotted divide-slate-100">
							{#each sec.items as itm}
								<button
									type="button"
									class="w-full flex items-baseline px-3 py-1.5 text-left hover:bg-slate-50 transition text-[12px] leading-snug cursor-pointer group"
									onclick={() => openItemLog(itm.code, itm.description, itm.passed === true)}
									title="Klik untuk melihat bukti log marking aspek ini"
								>
									<span class="w-5 shrink-0 font-bold text-sm">
										{#if itm.passed === true}
											<span class="text-emerald-600">✓</span>
										{:else if itm.passed === false}
											<span class="text-red-600">✗</span>
										{:else}
											<span class="text-slate-400">?</span>
										{/if}
									</span>
									<span class="w-7 shrink-0 font-bold font-mono text-slate-700">{itm.code}</span>
									<span class="flex-1 text-slate-800 pr-2 group-hover:text-blue-600 transition-colors">{itm.description}</span>
									<span class="shrink-0 font-semibold font-mono text-slate-500 text-right min-w-[55px]">
										{formatScore(itm.earned)}/{formatScore(itm.points)}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer & Signatures -->
		<div class="mt-8 pt-4 border-t border-slate-200">
			<div class="text-[11px] text-slate-500 mb-10">
				✓ sesuai · ✗ belum sesuai · ? belum diisi. Bukti tiap aspek tersimpan di log marking peserta.
			</div>

			<div class="flex justify-around items-center pt-2">
				<div class="w-52 text-center">
					<div class="h-14 border-b border-slate-300 mb-2"></div>
					<div class="text-xs font-bold text-slate-700 uppercase tracking-wider">Juri 1</div>
				</div>

				<div class="w-52 text-center">
					<div class="h-14 border-b border-slate-300 mb-2"></div>
					<div class="text-xs font-bold text-slate-700 uppercase tracking-wider">Juri 2</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Log / Evidence Modal -->
{#if selectedLogItem}
	<div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
		<button
			type="button"
			class="absolute inset-0 bg-transparent border-none cursor-pointer"
			aria-label="Tutup modal"
			onclick={() => (selectedLogItem = null)}
		></button>
		<div class="relative z-10 bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
			<div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
				<div class="flex items-center gap-2.5">
					<span
						class="text-xs font-bold px-2 py-0.5 rounded"
						class:bg-emerald-100={selectedLogItem.passed}
						class:text-emerald-800={selectedLogItem.passed}
						class:bg-red-100={!selectedLogItem.passed}
						class:text-red-800={!selectedLogItem.passed}
					>
						{selectedLogItem.passed ? '✓ SESUAI' : '✗ BELUM SESUAI'}
					</span>
					<h3 class="text-sm font-bold text-slate-900">{selectedLogItem.code} - {selectedLogItem.desc}</h3>
				</div>
				<button type="button" class="text-slate-400 hover:text-slate-600 p-1" onclick={() => (selectedLogItem = null)}>
					<Icon name="x" size={18} />
				</button>
			</div>

			<div class="p-5">
				<div class="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
					<Icon name="terminal" size={14} />
					Bukti Log Output dari Script Marking Peserta:
				</div>
				<pre class="bg-slate-900 text-sky-400 p-3.5 rounded-lg font-mono text-xs whitespace-pre-wrap break-all max-h-60 overflow-y-auto leading-relaxed">{selectedLogItem.log}</pre>
			</div>

			<div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
				<button
					type="button"
					class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
					onclick={() => (selectedLogItem = null)}
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
