<script lang="ts">
    import { page } from '$app/stores';
    import Chessboard from '$lib/components/Chessboard.svelte';
    import { createEventDispatcher } from 'svelte';
    
    const matchId = $page.params.id;
    const dispatch = createEventDispatcher();
    
    const whitePlayerId = '1';
    const blackPlayerId = '2';

    function handleMoveError(error: any) {
        console.error('Move validation error:', error);
        dispatch('error', {
            message: error.message || 'Invalid move',
            type: 'move'
        });
    }
</script>

<div class="min-h-screen bg-gray-100 py-8">
    <div class="container mx-auto px-4">
        <h1 class="text-4xl font-bold mb-8 text-center">Chess Game</h1>
        
        <div class="bg-white rounded-lg shadow-lg p-6">
            <Chessboard 
                {matchId}
                {whitePlayerId}
                {blackPlayerId}
                on:error={handleMoveError}
            />
        </div>
    </div>
</div>