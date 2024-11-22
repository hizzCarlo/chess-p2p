<script lang="ts">
    import { page } from '$app/stores';
    import Chessboard from '$lib/components/Chessboard.svelte';
    
    const matchId = $page.params.id;
</script>

<div class="min-h-screen bg-gray-100 py-8">
    <div class="container mx-auto px-4">
        <h1 class="text-4xl font-bold mb-8 text-center">Chess Game</h1>
        
        <div class="bg-white rounded-lg shadow-lg p-6">
            <Chessboard {matchId} />
        </div>
    </div>
</div>