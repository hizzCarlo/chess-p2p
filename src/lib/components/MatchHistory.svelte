<script>
    import { onMount } from 'svelte';
    
    let matches = [];
    let error = null;
    let loading = true;
    
    async function fetchMatches() {
        try {
            const response = await fetch('http://localhost/frontend-final-project/api/matches', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format - not JSON');
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format - expected array');
            }
            
            matches = data;
            error = null;
            
        } catch (e) {
            console.error('Error:', e);
            error = e.message;
            matches = [];
        } finally {
            loading = false;
        }
    }
    
    async function deleteMatch(matchId) {
        if (!confirm('Are you sure you want to delete this match?')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost/frontend-final-project/api/match/${matchId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Refresh the match list after successful deletion
            await fetchMatches();
            
        } catch (e) {
            console.error('Error deleting match:', e);
            error = e.message;
        }
    }
    
    onMount(() => {
        fetchMatches();
    });
</script>

<div class="mt-8">
    <h2 class="text-2xl mb-4">Match History</h2>
    
    {#if loading}
        <div class="text-gray-600">Loading match history...</div>
    {:else if error}
        <div class="text-red-500 mb-4">Error loading matches: {error}</div>
    {:else if !matches || matches.length === 0}
        <div class="text-gray-600 p-4 bg-gray-100">No matches found</div>
    {:else}
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead>
                    <tr>
                        <th class="px-4 py-2">White Player</th>
                        <th class="px-4 py-2">Black Player</th>
                        <th class="px-4 py-2">Winner</th>
                        <th class="px-4 py-2">Date</th>
                        <th class="px-4 py-2">Status</th>
                        <th class="px-4 py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each matches as match}
                        <tr class="border-t">
                            <td class="px-4 py-2">{match.white_player_name || 'Unknown'}</td>
                            <td class="px-4 py-2">{match.black_player_name || 'Unknown'}</td>
                            <td class="px-4 py-2">{match.winner_name || '-'}</td>
                            <td class="px-4 py-2">{new Date(match.created_at).toLocaleDateString()}</td>
                            <td class="px-4 py-2">{match.status}</td>
                            <td class="px-4 py-2">
                                <button
                                    class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                                    on:click={() => deleteMatch(match.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>