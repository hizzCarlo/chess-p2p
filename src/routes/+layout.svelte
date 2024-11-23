<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div>
	{@render children()}
</div>

<style>
	:global(body) {
		@apply antialiased text-secondary-800;
		margin: 0;
		padding: 0;
		min-height: 100vh;
		overflow-x: hidden;
	}
	
	:global(.btn) {
		@apply px-4 py-2 rounded-lg font-medium transition-colors duration-200;
	}
	
	:global(.btn-primary) {
		@apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
	}
	
	:global(.btn-secondary) {
		@apply bg-secondary-200 text-secondary-800 hover:bg-secondary-300 focus:ring-2 focus:ring-secondary-300 focus:ring-offset-2;
	}
	
	:global(.card) {
		@apply bg-white rounded-xl shadow-md p-6;
	}
</style>
