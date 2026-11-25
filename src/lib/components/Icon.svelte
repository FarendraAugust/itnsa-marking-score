<script lang="ts">
	let {
		name,
		size = 18,
		class: className = '',
		strokeWidth = 2
	}: {
		name: string;
		size?: number;
		class?: string;
		strokeWidth?: number;
	} = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
>
	{#if name === 'chart' || name === 'dashboard'}
		<line x1="18" y1="20" x2="18" y2="10" />
		<line x1="12" y1="20" x2="12" y2="4" />
		<line x1="6" y1="20" x2="6" y2="14" />
	{:else if name === 'file-text'}
		<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
		<path d="M14 2v4a2 2 0 0 0 2 2h4" />
		<path d="M10 9H8" />
		<path d="M16 13H8" />
		<path d="M16 17H8" />
	{:else if name === 'folder'}
		<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
	{:else if name === 'clock'}
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	{:else if name === 'calendar'}
		<path d="M8 2v4" />
		<path d="M16 2v4" />
		<rect width="18" height="18" x="3" y="4" rx="2" />
		<path d="M3 10h18" />
	{:else if name === 'check'}
		<polyline points="20 6 9 17 4 12" />
	{:else if name === 'x'}
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	{:else if name === 'help'}
		<circle cx="12" cy="12" r="10" />
		<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	{:else if name === 'play'}
		<polygon points="6 3 20 12 6 21 6 3" />
	{:else if name === 'pause'}
		<rect x="6" y="4" width="4" height="16" />
		<rect x="14" y="4" width="4" height="16" />
	{:else if name === 'trophy'}
		<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
		<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
		<path d="M4 22h16" />
		<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
		<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
		<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
	{:else if name === 'users'}
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	{:else if name === 'server'}
		<rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
		<rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
		<line x1="6" y1="6" x2="6.01" y2="6" />
		<line x1="6" y1="18" x2="6.01" y2="18" />
	{:else if name === 'printer'}
		<polyline points="6 9 6 2 18 2 18 9" />
		<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
		<rect width="12" height="8" x="6" y="14" />
	{:else if name === 'terminal'}
		<polyline points="4 17 10 11 4 5" />
		<line x1="12" y1="19" x2="20" y2="19" />
	{:else if name === 'plus'}
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	{:else if name === 'trash'}
		<path d="M3 6h18" />
		<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
		<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
	{:else if name === 'copy'}
		<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
		<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
	{:else if name === 'settings'}
		<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
		<circle cx="12" cy="12" r="3" />
	{:else if name === 'arrow-right'}
		<line x1="5" y1="12" x2="19" y2="12" />
		<polyline points="12 5 19 12 12 19" />
	{:else if name === 'edit'}
		<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
		<path d="m15 5 4 4" />
	{:else if name === 'reset' || name === 'rotate-ccw'}
		<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
	{:else if name === 'alert'}
		<circle cx="12" cy="12" r="10" />
		<line x1="12" y1="8" x2="12" y2="12" />
		<line x1="12" y1="16" x2="12.01" y2="16" />
	{:else}
		<circle cx="12" cy="12" r="10" />
	{/if}
</svg>
