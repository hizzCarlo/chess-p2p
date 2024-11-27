<script>
    import { onMount } from 'svelte';
    import Chessboard from '$lib/components/Chessboard.svelte';
    import PlayerForm from '$lib/components/PlayerForm.svelte';
    import MatchHistory from '$lib/components/MatchHistory.svelte';
    import Leaderboard from '$lib/components/Leaderboard.svelte';
    import '$lib/styles/animated-bg.css';
    
    let currentMatch = null;
    let players = [];
    let leaderboardComponent;
    
    onMount(async () => {
        const response = await fetch('https://www.formalytics.me/api-chess/players');
        players = await response.json();
    });
    
    async function handleMatchStart(event) {
        const { white, black } = event.detail;
        try {
            const response = await fetch('https://www.formalytics.me/api-chess/match', {
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
    function handlePlayerAdded() {
        // Refresh the leaderboard when a new player is added
        if (leaderboardComponent) {
            leaderboardComponent.fetchLeaderboard();
        }
    }
</script>

<div class="area">
    <ul class="circles">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
    </ul>
</div>

<main class="relative z-10 container mx-auto p-4">
    <div class="header-container mb-8 p-4 rounded-lg">
        <h1 class="text-4xl font-bold text-center text-white">Chess Game</h1>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
            {#if !currentMatch}
                <PlayerForm {players} onPlayerAdded={handlePlayerAdded} />
            {:else}
                <Chessboard matchId={currentMatch.match_id} />
            {/if}
        </div>
        
        <div>
            <Leaderboard bind:this={leaderboardComponent} />
        </div>
    </div>
    <MatchHistory />
</main>

<style>
    main {
        position: relative;
        z-index: 2;
    }
    
    .header-container {
        background-color: rgba(0, 0, 0, 0.8);
        position: relative;
        z-index: 1;
    }
</style>
