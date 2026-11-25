<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Hide navbar on login and setup pages
	let isAuthPage = $derived(page.url.pathname === '/login' || page.url.pathname === '/setup');
</script>

<svelte:head>
	<title>ITNSA Live Scoring & Marking System</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
	{#if !isAuthPage}
		<header class="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 sticky top-0 z-50 shadow-2xs no-print">
			<div class="max-w-7xl mx-auto flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<a href="/" class="flex items-center gap-2">
						<span class="bg-slate-900 text-sky-400 font-extrabold text-xs px-2 py-1 rounded tracking-wider flex items-center gap-1.5">
							<Icon name="server" size={14} />
							ITNSA
						</span>
					</a>

					<!-- Single Red 'Ganti Simulasi' Button on the left beside ITNSA -->
					{#if data.activeSimulation}
						<a
							href="/"
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-2xs transition"
							title="Klik untuk mengganti modul simulasi"
						>
							<Icon name="folder" size={13} />
							<span>Ganti Simulasi</span>
							<span class="hidden sm:inline font-normal text-red-100 text-[11px]">({data.activeSimulation.title})</span>
						</a>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					<nav class="flex items-center gap-1 text-xs sm:text-sm overflow-x-auto">
						{#if !data.activeSimId}
							<!-- When no simulation selected yet -->
							<a
								href="/"
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium bg-blue-50 text-blue-600"
							>
								<Icon name="folder" size={15} />
								<span>Pilih Tes</span>
							</a>
						{:else}
							<!-- When simulation IS selected -->
							{#if data.user?.role === 'participant'}
								<a
									href={`/timer?sim=${data.activeSimId}`}
									class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
									class:bg-blue-50={page.url.pathname.startsWith('/timer')}
									class:text-blue-600={page.url.pathname.startsWith('/timer')}
									class:text-slate-600={!page.url.pathname.startsWith('/timer')}
									class:hover:text-blue-600={!page.url.pathname.startsWith('/timer')}
									class:hover:bg-slate-100={!page.url.pathname.startsWith('/timer')}
								>
									<Icon name="clock" size={15} />
									<span>Timer</span>
								</a>
							{/if}

							<a
								href={`/scoreboard?sim=${data.activeSimId}`}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
								class:bg-blue-50={page.url.pathname.startsWith('/scoreboard')}
								class:text-blue-600={page.url.pathname.startsWith('/scoreboard')}
								class:text-slate-600={!page.url.pathname.startsWith('/scoreboard')}
								class:hover:text-blue-600={!page.url.pathname.startsWith('/scoreboard')}
								class:hover:bg-slate-100={!page.url.pathname.startsWith('/scoreboard')}
							>
								<Icon name="chart" size={15} />
								<span>Scoreboard</span>
							</a>

							<a
								href={data.user?.role === 'participant' ? `/sheet?participant=${data.user.username}&sim=${data.activeSimId}` : `/sheet?sim=${data.activeSimId}`}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
								class:bg-blue-50={page.url.pathname.startsWith('/sheet')}
								class:text-blue-600={page.url.pathname.startsWith('/sheet')}
								class:text-slate-600={!page.url.pathname.startsWith('/sheet')}
								class:hover:text-blue-600={!page.url.pathname.startsWith('/sheet')}
								class:hover:bg-slate-100={!page.url.pathname.startsWith('/sheet')}
							>
								<Icon name="file-text" size={15} />
								<span>Lembar Nilai</span>
							</a>
						{/if}

						<!-- Admin Only Links -->
						{#if data.user && data.user.role === 'admin'}
							<a
								href="/simulations"
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
								class:bg-blue-50={page.url.pathname.startsWith('/simulations')}
								class:text-blue-600={page.url.pathname.startsWith('/simulations')}
								class:text-slate-600={!page.url.pathname.startsWith('/simulations')}
								class:hover:text-blue-600={!page.url.pathname.startsWith('/simulations')}
								class:hover:bg-slate-100={!page.url.pathname.startsWith('/simulations')}
							>
								<Icon name="settings" size={15} />
								<span>Modul</span>
							</a>

							<a
								href="/users"
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
								class:bg-blue-50={page.url.pathname.startsWith('/users')}
								class:text-blue-600={page.url.pathname.startsWith('/users')}
								class:text-slate-600={!page.url.pathname.startsWith('/users')}
								class:hover:text-blue-600={!page.url.pathname.startsWith('/users')}
								class:hover:bg-slate-100={!page.url.pathname.startsWith('/users')}
							>
								<Icon name="users" size={15} />
								<span>Peserta</span>
							</a>

							<a
								href="/script-docs"
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors"
								class:bg-blue-50={page.url.pathname.startsWith('/script-docs')}
								class:text-blue-600={page.url.pathname.startsWith('/script-docs')}
								class:text-slate-600={!page.url.pathname.startsWith('/script-docs')}
								class:hover:text-blue-600={!page.url.pathname.startsWith('/script-docs')}
								class:hover:bg-slate-100={!page.url.pathname.startsWith('/script-docs')}
							>
								<Icon name="terminal" size={15} />
								<span>Script</span>
							</a>
						{/if}
					</nav>

					<div class="pl-2 border-l border-slate-200">
						{#if data.user}
							<div class="flex items-center gap-2">
								{#if data.user.role === 'admin'}
									<span class="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 border border-slate-200">
										<Icon name="users" size={13} />
										<span class="hidden sm:inline">{data.user.fullName}</span>
										<span class="text-[10px] bg-blue-100 text-blue-700 px-1 rounded uppercase font-bold">Admin</span>
									</span>
								{:else}
									<span class="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 border border-emerald-200">
										<Icon name="users" size={13} />
										<span class="hidden sm:inline">{data.user.fullName}</span>
										<span class="text-[10px] font-mono text-emerald-600 font-bold">({data.user.username})</span>
									</span>
								{/if}

								<form action="/logout" method="POST" class="inline">
									<button
										type="submit"
										class="text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
										title="Logout"
									>
										Logout
									</button>
								</form>
							</div>
						{:else}
							<a
								href="/login"
								class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
							>
								<Icon name="users" size={13} />
								<span>Login</span>
							</a>
						{/if}
					</div>
				</div>
			</div>
		</header>
	{/if}

	<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 main-content">
		{@render children()}
	</main>
</div>
