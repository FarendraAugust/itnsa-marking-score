<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'participant' | 'admin'>('participant');
	let isSubmitting = $state(false);

	$effect(() => {
		if (form?.tab) {
			activeTab = form.tab as 'participant' | 'admin';
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 sm:p-8 space-y-6">
		<!-- Brand & Title -->
		<div class="text-center space-y-2">
			<div class="w-12 h-12 bg-slate-900 text-sky-400 rounded-xl mx-auto flex items-center justify-center">
				<Icon name="server" size={24} />
			</div>
			<h1 class="text-xl font-extrabold text-slate-900 tracking-tight">ITNSA Marking & Scoring</h1>
			<p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
				Silakan masuk menggunakan ID Peserta Anda atau login sebagai Administrator.
			</p>
		</div>

		<!-- Role Tab Switcher -->
		<div class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
			<button
				type="button"
				class="py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5"
				class:bg-white={activeTab === 'participant'}
				class:text-slate-900={activeTab === 'participant'}
				class:shadow-2xs={activeTab === 'participant'}
				class:text-slate-500={activeTab !== 'participant'}
				onclick={() => (activeTab = 'participant')}
			>
				<Icon name="users" size={14} />
				<span>Peserta</span>
			</button>

			<button
				type="button"
				class="py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5"
				class:bg-white={activeTab === 'admin'}
				class:text-slate-900={activeTab === 'admin'}
				class:shadow-2xs={activeTab === 'admin'}
				class:text-slate-500={activeTab !== 'admin'}
				onclick={() => (activeTab = 'admin')}
			>
				<Icon name="settings" size={14} />
				<span>Administrator</span>
			</button>
		</div>

		{#if form?.error}
			<div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
				<Icon name="alert" size={15} />
				<span>{form.error}</span>
			</div>
		{/if}

		<!-- Tab 1: Peserta Login -->
		{#if activeTab === 'participant'}
			<form
				action="?/loginParticipant"
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
				class="space-y-4 text-xs"
			>
				<div>
					<label for="participant_id" class="block font-semibold text-slate-700 mb-1">
						ID Peserta:
					</label>
					<input
						id="participant_id"
						name="participant_id"
						type="text"
						class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="Misal: peserta-01, PC-05"
						required
					/>
					<p class="text-[11px] text-slate-500 mt-1 leading-normal">
						Masukkan ID yang sama dengan variabel lingkungan (<code>PARTICIPANT_ID</code>) pada script pengujian Anda.
					</p>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2"
				>
					<Icon name="play" size={14} />
					<span>{isSubmitting ? 'Memproses...' : 'Masuk sebagai Peserta'}</span>
				</button>
			</form>
		{/if}

		<!-- Tab 2: Administrator Login -->
		{#if activeTab === 'admin'}
			<form
				action="?/loginAdmin"
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
				class="space-y-4 text-xs"
			>
				<div>
					<label for="username" class="block font-semibold text-slate-700 mb-1">Username Admin:</label>
					<input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="admin"
						required
					/>
				</div>

				<div>
					<label for="password" class="block font-semibold text-slate-700 mb-1">Password:</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="Masukkan password admin"
						required
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2"
				>
					<Icon name="check" size={14} />
					<span>{isSubmitting ? 'Memeriksa...' : 'Masuk Administrator'}</span>
				</button>
			</form>
		{/if}

		<div class="text-center pt-2 border-t border-slate-100">
			<a href="/" class="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1">
				<Icon name="arrow-right" size={13} />
				Kembali ke Beranda Tanpa Login
			</a>
		</div>
	</div>
</div>
