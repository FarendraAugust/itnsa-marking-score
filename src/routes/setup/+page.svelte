<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';

	let { form }: { form: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<div class="min-h-[75vh] flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 sm:p-8 space-y-6">
		<div class="text-center space-y-2">
			<div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl mx-auto flex items-center justify-center">
				<Icon name="server" size={24} />
			</div>
			<h1 class="text-xl font-extrabold text-slate-900 tracking-tight">Setup Akun Administrator</h1>
			<p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
				Instalasi baru terdeteksi. Silakan buat akun administrator pertama untuk mengelola simulasi, jadwal, dan sistem live scoring ITNSA.
			</p>
		</div>

		{#if form?.error}
			<div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
				<Icon name="alert" size={15} />
				<span>{form.error}</span>
			</div>
		{/if}

		<form
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
				<label for="full_name" class="block font-semibold text-slate-700 mb-1">Nama Lengkap:</label>
				<input
					id="full_name"
					name="full_name"
					type="text"
					class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Misal: Panitia Juri ITNSA"
					required
				/>
			</div>

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
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Minimal 6 karakter"
					required
				/>
			</div>

			<div>
				<label for="confirm_password" class="block font-semibold text-slate-700 mb-1">Konfirmasi Password:</label>
				<input
					id="confirm_password"
					name="confirm_password"
					type="password"
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Ulangi password"
					required
				/>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2"
			>
				<Icon name="check" size={15} />
				<span>{isSubmitting ? 'Memproses Akun...' : 'Simpan & Masuk Administrator'}</span>
			</button>
		</form>
	</div>
</div>
