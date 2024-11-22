<script>
    import { createEventDispatcher } from 'svelte';
    
    export let players = [];
    const dispatch = createEventDispatcher();
    
    let newPlayerName = '';
    let selectedWhite = '';
    let selectedBlack = '';
    
    async function addPlayer() {
        if (!newPlayerName.trim()) return;
        
        const response = await fetch('http://localhost/frontend-final-project/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newPlayerName })
        });
        
        const result = await response.json();
        if (result.status) {
            players = [...players, { id: result.player_id, name: newPlayerName }];
            newPlayerName = '';
        }
    }
    
    function startMatch() {
        if (selectedWhite && selectedBlack && selectedWhite !== selectedBlack) {
            dispatch('startMatch', {
                white: selectedWhite,
                black: selectedBlack
            });
        }
    }
</script>

<div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
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
            class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
            class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
        >
            Start Match
        </button>
    </div>
</div>