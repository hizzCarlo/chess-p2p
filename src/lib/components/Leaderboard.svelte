<script>
    import { onMount } from 'svelte';
    
    let players = [];
    let loading = true;
    let error = null;

    async function fetchLeaderboard() {
        try {
            const response = await fetch('http://localhos/api/leaderboard');
            if (!response.ok) throw new Error('Failed to load leaderboard');
            
            players = await response.json();
            loading = false;
        } catch (e) {
            error = e.message;
            loading = false;
        }
    }

    onMount(fetchLeaderboard);

    // Export the fetchLeaderboard function to be called from outside
    export { fetchLeaderboard };
</script>

<div class="mt-8">
    <h2 class="text-2xl font-bold mb-4">Leaderboard</h2>
    
    {#if loading}
        <div class="text-gray-600">Loading leaderboard...</div>
    {:else if error}
        <div class="text-red-500">{error}</div>
    {:else}
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="max-h-[400px] overflow-y-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Games</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">W/D/L</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        {#each players as player, i}
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">{i + 1}</td>
                                <td class="px-6 py-4 whitespace-nowrap font-medium">{player.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap">{player.points}</td>
                                <td class="px-6 py-4 whitespace-nowrap">{player.games_played}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    {player.wins}/{player.draws}/{player.games_played - player.wins - player.draws}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Add smooth scrolling */
    .overflow-y-auto {
        scroll-behavior: smooth;
    }

    /* Style the scrollbar */
    .overflow-y-auto::-webkit-scrollbar {
        width: 8px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
</style>