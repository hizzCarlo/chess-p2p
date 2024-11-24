<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import Chessboard from '$lib/components/Chessboard.svelte';
    import { onMount } from 'svelte';
    import { PIECE_SYMBOLS } from '$lib/chess';
    
    const matchId = $page.params.id;
    let whitePlayerId: string;
    let blackPlayerId: string;
    let whitePlayerName: string;
    let blackPlayerName: string;
    let loading = true;
    let error: string | null = null;
    let gameEnded = false;
    let rematchLoading = false;
    let board: string[][] | null = null;

    async function loadMatchData() {
        try {
            const response = await fetch(`https://www.formalytics.me/api-chess/match/${matchId}`);
            if (!response.ok) throw new Error('Failed to load match data');
            
            const matchData = await response.json();
            whitePlayerId = matchData.white_player_id;
            blackPlayerId = matchData.black_player_id;
            whitePlayerName = matchData.white_player_name;
            blackPlayerName = matchData.black_player_name;
            gameEnded = matchData.status !== 'ongoing';
            loading = false;
        } catch (e) {
            error = e.message;
            loading = false;
        }
    }

    async function handleRematch() {
        if (rematchLoading) return; // Prevent double clicks
        
        try {
            rematchLoading = true;
            error = null;
            
            // First navigate back to root
            const basePath = import.meta.env.PROD ? '/chess-p2p' : '';
            await goto(`${basePath}/`);

            // Then create new match with swapped colors
            const response = await fetch('https://www.formalytics.me/api-chess/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    white_player_id: blackPlayerId, // Swap colors
                    black_player_id: whitePlayerId
                })
            });

            if (!response.ok) throw new Error('Failed to create rematch');
            
            const result = await response.json();
            if (result.status && result.match_id) {
                // Navigate to the new match
                await goto(`${basePath}/game/${result.match_id}`);
            } else {
                throw new Error('Failed to start rematch');
            }
        } catch (e) {
            error = e.message;
            rematchLoading = false;
        }
    }

    async function handleBack() {
        if (!gameEnded) {  // Only try to end the match if it's not already ended
            try {
                const response = await fetch(`https://www.formalytics.me/api-chess/match-end/${matchId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        is_draw: true,
                        game_state: { resigned: true }
                    })
                });

                if (!response.ok) {
                    console.error('Failed to end match:', await response.text());
                }
            } catch (e) {
                console.error('Error ending match:', e);
            }
        }

        // Use import.meta.env instead of process.env
        const basePath = import.meta.env.PROD ? '/chess-p2p' : '';
        await goto(`${basePath}/`);
    }

    function handleGameOver(event: CustomEvent) {
        const { winner, reason } = event.detail;
        gameEnded = true;
        loadMatchData();
    }

    function handleMoveError(event: CustomEvent) {
        const { message } = event.detail;
        error = message;
    }

    function getCapturedPieces(color: 'white' | 'black', currentBoard: string[][] | null): ('pawn' | 'rook' | 'knight' | 'bishop' | 'queen')[] {
        if (!currentBoard) return [];
        
        const initialPieces = {
            pawn: 8,
            rook: 2,
            knight: 2,
            bishop: 2,
            queen: 1
        };
        
        const currentPieces = {
            pawn: 0,
            rook: 0,
            knight: 0,
            bishop: 0,
            queen: 0
        };
        
        // Count current pieces on the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = currentBoard[row][col];
                if (!piece) continue;
                
                const isCurrentColor = (color === 'white' && piece === piece.toUpperCase()) ||
                                     (color === 'black' && piece === piece.toLowerCase());
                
                if (isCurrentColor) {
                    const pieceType = piece.toLowerCase();
                    switch (pieceType) {
                        case 'p': currentPieces.pawn++; break;
                        case 'r': currentPieces.rook++; break;
                        case 'n': currentPieces.knight++; break;
                        case 'b': currentPieces.bishop++; break;
                        case 'q': currentPieces.queen++; break;
                    }
                }
            }
        }
        
        // Calculate captured pieces
        const capturedPieces: ('pawn' | 'rook' | 'knight' | 'bishop' | 'queen')[] = [];
        for (const [piece, count] of Object.entries(initialPieces)) {
            const captured = count - currentPieces[piece as keyof typeof currentPieces];
            for (let i = 0; i < captured; i++) {
                capturedPieces.push(piece as 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen');
            }
        }
        
        return capturedPieces;
    }

    onMount(loadMatchData);
</script>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Chess&display=swap');

    .captured-pieces {
        min-height: 2rem;
        display: flex;
        gap: clamp(0.25rem, 1vw, 0.5rem);
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: clamp(0.25rem, 1vw, 0.5rem);
    }

    .captured-piece {
        font-family: 'Noto Chess', sans-serif;
        font-size: clamp(1rem, 3vw, 2rem);
        transform: scale(1.1);
        transition: transform 0.2s ease-in-out;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    .captured-piece.white {
        color: #fff;
        text-shadow: 
            0 0 2px #000,
            0 0 4px #000,
            0 0 6px #000;
    }

    .captured-piece.black {
        color: #000;
        text-shadow: 
            0 0 2px #555,
            0 0 4px #555;
    }

    .captured-piece:hover {
        transform: scale(1.15);
        opacity: 0.8;
    }

    /* Add responsive container adjustments */
    @media (max-width: 768px) {
        :global(.container) {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
    }
</style>

<div class="min-h-screen bg-gray-100 py-4 md:py-8">
    <div class="container mx-auto px-2 md:px-4">
        <div class="flex justify-between items-center mb-8">
            <button 
                on:click={handleBack}
                class="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back to Home
            </button>
            <h1 class="text-4xl font-bold text-center text-gray-800">Chess Game</h1>
            {#if gameEnded}
                <button 
                    on:click={handleRematch}
                    disabled={rematchLoading}
                    class="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:bg-emerald-400 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-md"
                >
                    {#if rematchLoading}
                        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Starting Rematch...</span>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                        </svg>
                        <span>Rematch</span>
                    {/if}
                </button>
            {:else}
                <div class="w-[132px]"></div> <!-- Adjusted spacer width to match button width -->
            {/if}
        </div>
        
        {#if error}
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm">
                <div class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    {error}
                </div>
            </div>
        {:else if loading}
            <div class="flex justify-center items-center space-x-2">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span class="text-gray-600">Loading game data...</span>
            </div>
        {:else}
            <div class="bg-white rounded-lg shadow-lg p-2 md:p-6">
                <div class="mb-4 text-center">
                    <div class="flex flex-col md:flex-row justify-between items-center px-2 md:px-8 gap-4">
                        <!-- White Player Info -->
                        <div class="flex flex-col items-center space-y-2 w-full md:w-auto">
                            <div class="text-base md:text-lg font-semibold bg-white shadow-md rounded-lg p-2 md:p-3 border border-gray-200 w-full md:w-auto">
                                <span class="flex items-center gap-2 justify-center md:justify-start">
                                    <span class="text-xl md:text-2xl">♔</span>
                                    <span>{whitePlayerName}</span>
                                </span>
                            </div>
                            <div class="captured-pieces">
                                {#if board}
                                    {#each getCapturedPieces('black', board) as piece}
                                        <span class="captured-piece black">{PIECE_SYMBOLS.black[piece]}</span>
                                    {/each}
                                {/if}
                            </div>
                        </div>

                        <!-- VS Divider -->
                        <div class="flex md:flex-col items-center">
                            <span class="text-lg md:text-xl font-bold text-gray-400">VS</span>
                            <div class="h-0.5 w-12 md:h-12 md:w-0.5 bg-gray-300 mx-2 md:my-2"></div>
                        </div>

                        <!-- Black Player Info -->
                        <div class="flex flex-col items-center space-y-2 w-full md:w-auto">
                            <div class="text-base md:text-lg font-semibold bg-black text-white shadow-md rounded-lg p-2 md:p-3 w-full md:w-auto">
                                <span class="flex items-center gap-2 justify-center md:justify-start">
                                    <span class="text-xl md:text-2xl">♔</span>
                                    <span>{blackPlayerName}</span>
                                </span>
                            </div>
                            <div class="captured-pieces">
                                {#if board}
                                    {#each getCapturedPieces('white', board) as piece}
                                        <span class="captured-piece white">{PIECE_SYMBOLS.white[piece]}</span>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
                
                <Chessboard 
                    {matchId}
                    {whitePlayerId}
                    {blackPlayerId}
                    on:error={handleMoveError}
                    on:gameOver={handleGameOver}
                    bind:board
                />
            </div>
        {/if}
    </div>
</div>