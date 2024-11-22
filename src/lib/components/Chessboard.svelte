<script lang="ts">
    import { onMount } from 'svelte';
    import type { Position, Piece } from '$lib/chess';
    import { isValidMove, getPieceFromNotation, PIECE_SYMBOLS, handlePawnPromotion, isCheckmate } from '$lib/chess';
    
    export let matchId: string;
    
    let board: string[][] = Array(8).fill(null).map(() => Array(8).fill(''));
    let selectedSquare: Position | null = null;
    let moveHistory: string[] = [];
    let currentTurn: 'white' | 'black' = 'white';
    let isGameOver = false;
    let winner: string | null = null;

    // Initialize the chess board
    function initializeBoard() {
        // Back rank pieces
        const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        
        // Set up the initial board state
        board = Array(8).fill(null).map(() => Array(8).fill(''));
        
        // Place pieces
        for (let i = 0; i < 8; i++) {
            // Black pieces
            board[0][i] = backRank[i].toLowerCase();
            board[1][i] = 'p';
            
            // White pieces
            board[6][i] = 'P';
            board[7][i] = backRank[i];
        }
    }

    async function handleSquareClick(row: number, col: number) {
        if (isGameOver) return;
        
        const clickedSquare: Position = { row, col };
        const piece = getPieceFromNotation(board[row][col]);
        
        // If no square is selected and clicked square has a piece of current player's color
        if (!selectedSquare && piece?.color === currentTurn) {
            selectedSquare = clickedSquare;
            return;
        }
        
        // If a square is already selected
        if (selectedSquare) {
            const selectedPiece = getPieceFromNotation(board[selectedSquare.row][selectedSquare.col]);
            
            if (selectedPiece && isValidMove(selectedPiece, selectedSquare, clickedSquare, board)) {
                // Make the move
                await makeMove(selectedSquare, clickedSquare);
            }
            
            selectedSquare = null;
        }
    }

    async function makeMove(from: Position, to: Position) {
        const piece = board[from.row][from.col];
        const moveNotation = generateMoveNotation(from, to, piece);
        
        // Update board
        board[to.row][to.col] = piece;
        board[from.row][from.col] = '';
        
        // Handle pawn promotion
        if (isPawnPromotion(to, piece)) {
            const promotedPiece = await handlePawnPromotion(board, to, currentTurn);
            board[to.row][to.col] = promotedPiece;
        }
        
        // Update move history
        moveHistory = [...moveHistory, moveNotation];
        
        // Switch turns
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        
        // Check for checkmate
        if (isCheckmate(board, currentTurn)) {
            isGameOver = true;
            winner = currentTurn === 'white' ? 'black' : 'white';
            
            // Update match status in database
            await updateMatchStatus();
        }
        
        // Save game state
        await saveGameState();
    }

    function isPawnPromotion(to: Position, piece: string): boolean {
        return (piece.toLowerCase() === 'p' && (to.row === 0 || to.row === 7));
    }

    function generateMoveNotation(from: Position, to: Position, piece: string): string {
        const files = 'abcdefgh';
        const ranks = '87654321';
        return `${piece}${files[from.col]}${ranks[from.row]} → ${files[to.col]}${ranks[to.row]}`;
    }

    async function saveGameState() {
        try {
            await fetch(`http://localhost/frontend-final-project/api/match-move/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_state: {
                        board,
                        moveHistory,
                        currentTurn,
                        isGameOver,
                        winner
                    }
                })
            });
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    async function updateMatchStatus() {
        if (winner) {
            try {
                await fetch(`http://localhost/frontend-final-project/api/match-end/${matchId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        winner_id: winner === 'white' ? whitePlayerId : blackPlayerId
                    })
                });
            } catch (error) {
                console.error('Error updating match status:', error);
            }
        }
    }

    onMount(() => {
        initializeBoard();
    });
</script>

<div class="flex flex-col lg:flex-row gap-8">
    <div class="flex-1">
        <!-- Chessboard -->
        <div class="w-[600px] mx-auto">
            <div class="grid grid-cols-8 border border-gray-400">
                {#each board as row, i}
                    {#each row as square, j}
                        <div
                            class="w-[75px] h-[75px] flex items-center justify-center text-4xl cursor-pointer
                                {((i + j) % 2 === 0) ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                                {selectedSquare?.row === i && selectedSquare?.col === j ? 'ring-2 ring-blue-400' : ''}"
                            on:click={() => handleSquareClick(i, j)}
                        >
                            {#if square}
                                {PIECE_SYMBOLS[getPieceFromNotation(square)?.color || 'white'][getPieceFromNotation(square)?.type || 'pawn']}
                            {/if}
                        </div>
                    {/each}
                {/each}
            </div>
        </div>

        <!-- Game Status -->
        <div class="mt-8 text-center">
            {#if isGameOver}
                <div class="text-2xl font-bold text-red-600">
                    Game Over! {winner === 'white' ? 'White' : 'Black'} wins!
                </div>
            {:else}
                <div class="text-2xl font-semibold">
                    Current Turn: {currentTurn === 'white' ? 'White' : 'Black'}
                </div>
            {/if}
        </div>
    </div>

    <!-- Move History -->
    <div class="w-full lg:w-80">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-2xl font-semibold mb-4">Move History</h3>
            <div class="max-h-[600px] overflow-y-auto">
                {#each moveHistory as move, i}
                    <div class="mb-2 p-2 bg-gray-50 rounded">
                        <span class="font-semibold">{Math.floor(i/2 + 1)}.</span> {move}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    /* Add any additional styling here */
</style>