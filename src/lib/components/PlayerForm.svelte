<script>
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    
    export let players = [];
    export let onPlayerAdded = () => {};
    const dispatch = createEventDispatcher();
    
    let newPlayerName = '';
    let selectedWhite = '';
    let selectedBlack = '';
    
    async function addPlayer() {
        if (!newPlayerName.trim()) return;
        
        const response = await fetch('http://localhost/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newPlayerName })
        });
        
        const result = await response.json();
        if (result.status) {
            players = [...players, { id: result.player_id, name: newPlayerName }];
            newPlayerName = '';
            onPlayerAdded();
        }
    }
    
    async function startMatch() {
        if (selectedWhite && selectedBlack && selectedWhite !== selectedBlack) {
            try {
                // Create new match
                const response = await fetch('http://localhost/api/match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        white_player_id: selectedWhite,
                        black_player_id: selectedBlack
                    })
                });
                
                const result = await response.json();
                
                if (result.status && result.match_id) {
                    // Use base path from environment
                    const basePath = process.env.NODE_ENV === 'production' ? '/chess-p2p' : '';
                    // Navigate to the game page with the new match ID
                    goto(`${basePath}/game/${result.match_id}`);
                } else {
                    throw new Error('Failed to create match');
                }
            } catch (error) {
                console.error('Error creating match:', error);
                alert('Failed to create match. Please try again.');
            }
        }
    }
</script>

<div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md min-h-[480px]">
    <h2 class="text-2xl mb-4">Player Selection</h2>
    
    <!-- Add New Player -->
    <div class="mb-6">
        <input
            type="text"
            bind:value={newPlayerName}
            placeholder="Enter player name"
            class="w-full p-2 border rounded"
        />
        <button
            on:click={addPlayer}
            class="mt-2 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors"
        >
            Add Player
        </button>
    </div>
    
    <!-- Player Selection -->
    <div class="space-y-4">
        <div>
            <label class="block mb-2">White Player:</label>
            <select
                bind:value={selectedWhite}
                class="w-full p-2 border rounded"
            >
                <option value="">Select player...</option>
                {#each players as player}
                    <option value={player.id}>{player.name}</option>
                {/each}
            </select>
        </div>
        
        <div>
            <label class="block mb-2">Black Player:</label>
            <select
                bind:value={selectedBlack}
                class="w-full p-2 border rounded"
            >
                <option value="">Select player...</option>
                {#each players as player}
                    <option value={player.id}>{player.name}</option>
                {/each}
            </select>
        </div>
        
        <button
            on:click={startMatch}
            disabled={!selectedWhite || !selectedBlack || selectedWhite === selectedBlack}
            class="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:bg-secondary-300 transition-colors"
        >
            Start Match
        </button>
    </div>
</div>