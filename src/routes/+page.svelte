<script>
    import { onMount } from 'svelte';
    import Chessboard from '$lib/components/Chessboard.svelte';
    import PlayerForm from '$lib/components/PlayerForm.svelte';
    import MatchHistory from '$lib/components/MatchHistory.svelte';
    
    let currentMatch = null;
    let players = [];
    
    onMount(async () => {
        const response = await fetch('http://localhost/frontend-final-project/api/players');
        players = await response.json();
    });
    
    async function handleMatchStart(event) {
        const { white, black } = event.detail;
        try {
            const response = await fetch('http://localhost/frontend-final-project/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    white_player_id: white,
                    black_player_id: black
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create match');
            }

            const result = await response.json();
            if (result.status && result.match_id) {
                currentMatch = result;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error starting match:', error);
        }
    }
</script>

<main class="container mx-auto p-4">
    <h1 class="text-4xl font-bold mb-8 text-center">Chess Game</h1>
    
    {#if !currentMatch}
        <PlayerForm {players} on:startMatch={handleMatchStart} />
    {:else}
        <Chessboard matchId={currentMatch.match_id} />
    {/if}
    
    <MatchHistory />
</main>
