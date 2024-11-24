<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import type { Position, Piece } from '$lib/chess';
    import { isValidMove, getPieceFromNotation, PIECE_SYMBOLS, handlePawnPromotion, isCheckmate, getPossibleMoves, isStalemate, hasInsufficientMaterial, isThreefoldRepetition, isFiftyMoveRule } from '$lib/chess';
    
    const dispatch = createEventDispatcher();
    
    export let matchId: string;
    export let whitePlayerId: string;
    export let blackPlayerId: string;
    
    export let board: string[][] = Array(8).fill(null).map(() => Array(8).fill(''));
    export let gameState: GameState;
    let selectedSquare: Position | null = null;
    let moveHistory: string[] = [];
    let currentTurn: 'white' | 'black' = 'white';
    let isGameOver = false;
    let winner: string | null = null;
    let possibleMoves: Position[] = [];
    let gameEndReason: 'checkmate' | 'stalemate' | 'insufficient material' | 
                       'threefold repetition' | 'fifty-move rule' | null = null;

    // Watch for matchId changes to reset the board
    $: if (matchId) {
        resetGame();
    }

    function resetGame() {
        // Reset all game state
        selectedSquare = null;
        moveHistory = [];
        currentTurn = 'white';
        isGameOver = false;
        winner = null;
        possibleMoves = [];
        gameEndReason = null;
        
        // Initialize new game state
        gameState = {
            board,
            moveHistory: [],
            currentTurn: 'white',
            castlingRights: {
                white: { kingSide: true, queenSide: true },
                black: { kingSide: true, queenSide: true }
            },
            enPassantTarget: null,
            lastMove: null,
            promotedPawns: []
        };

        // Initialize new board
        initializeBoard();
    }

    // Initialize game state properly
    gameState = {
        board,
        moveHistory: [],
        currentTurn: 'white',
        castlingRights: {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        },
        enPassantTarget: null,
        lastMove: null,
        promotedPawns: []
    };

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

        // Update gameState board reference
        gameState.board = board;
    }

    async function handleSquareClick(row: number, col: number) {
        if (isGameOver) return;
        
        const clickedSquare: Position = { row, col };
        const piece = getPieceFromNotation(board[row][col]);
        
        if (!selectedSquare && piece?.color === currentTurn) {
            selectedSquare = clickedSquare;
            possibleMoves = getPossibleMoves(piece, clickedSquare, board, gameState);
            return;
        }
        
        if (selectedSquare) {
            const selectedPiece = getPieceFromNotation(board[selectedSquare.row][selectedSquare.col]);
            
            if (selectedPiece && isValidMove(selectedPiece, selectedSquare, clickedSquare, board, gameState)) {
                await makeMove(selectedSquare, clickedSquare);
            }
            
            selectedSquare = null;
            possibleMoves = [];
        }
    }

    function checkGameEnd() {
        // Check for checkmate first
        if (isCheckmate(board, currentTurn, gameState)) {
            isGameOver = true;
            // Set winner to the opposite of current turn
            winner = currentTurn === 'white' ? 'black' : 'white';
            gameEndReason = 'checkmate';
            console.log('Checkmate detected. Winner:', winner); // Debug log
            updateMatchStatus();
            return;
        }

        // Check for stalemate
        if (isStalemate(board, currentTurn, gameState)) {
            isGameOver = true;
            winner = 'draw';
            gameEndReason = 'stalemate';
            updateMatchStatus();
            return;
        }

        // Check for insufficient material
        if (hasInsufficientMaterial(board)) {
            isGameOver = true;
            winner = 'draw';
            gameEndReason = 'insufficient material';
            updateMatchStatus();
            return;
        }

        // Check for threefold repetition
        if (isThreefoldRepetition(moveHistory)) {
            isGameOver = true;
            winner = 'draw';
            gameEndReason = 'threefold repetition';
            updateMatchStatus();
            return;
        }

        // Check for fifty-move rule
        if (isFiftyMoveRule(moveHistory)) {
            isGameOver = true;
            winner = 'draw';
            gameEndReason = 'fifty-move rule';
            updateMatchStatus();
            return;
        }
    }

    async function makeMove(from: Position, to: Position) {
        const piece = board[from.row][from.col];
        const pieceObj = getPieceFromNotation(piece);
        let isEnPassant = false;
        let isCastling = false;
        let isPromotion = false;
        let promotedPiece = '';
        
        // Handle castling
        if (pieceObj?.type === 'king' && Math.abs(to.col - from.col) === 2) {
            const row = pieceObj.color === 'white' ? 7 : 0;
            const isKingSide = to.col > from.col;
            
            // Move rook
            if (isKingSide) {
                board[row][5] = board[row][7];
                board[row][7] = '';
            } else {
                board[row][3] = board[row][0];
                board[row][0] = '';
            }
            isCastling = true;
        }
        
        // Handle en passant capture
        if (pieceObj?.type === 'pawn' && 
            Math.abs(to.col - from.col) === 1 && 
            board[to.row][to.col] === '') {
            
            const lastMove = gameState.lastMove;
            if (lastMove) {
                const targetPiece = getPieceFromNotation(board[lastMove.to.row][lastMove.to.col]);
                const isLastMoveDoublePawnPush = targetPiece?.type === 'pawn' && 
                                               Math.abs(lastMove.from.row - lastMove.to.row) === 2;
                
                if (isLastMoveDoublePawnPush &&
                    lastMove.to.col === to.col &&
                    lastMove.to.row === from.row) {
                    // Remove the captured pawn
                    board[lastMove.to.row][lastMove.to.col] = '';
                    isEnPassant = true;
                }
            }
        }
        
        // Check if a piece was captured
        const capturedPiece = board[to.row][to.col];
        if (capturedPiece) {
            // Check if the captured piece was a promoted pawn
            const promotedPawn = gameState.promotedPawns.find(p => 
                p.position.row === to.row && 
                p.position.col === to.col
            );
            
            if (promotedPawn) {
                promotedPawn.captured = true;
                promotedPawn.capturedBy = currentTurn;
            }
        }
        
        // Handle pawn promotion
        if (isPawnPromotion(to, piece)) {
            promotedPiece = await handlePawnPromotion(board, to, currentTurn);
            isPromotion = true;
            board[to.row][to.col] = promotedPiece;
            
            gameState.promotedPawns.push({
                position: to,
                promotedTo: promotedPiece,
                captured: false
            });
        } else {
            board[to.row][to.col] = piece;
        }
        
        // Clear the original square
        board[from.row][from.col] = '';
        
        // Update last move with promotion information
        gameState.lastMove = { 
            from, 
            to, 
            piece: isPromotion ? promotedPiece : piece,
            isEnPassant,
            isCastling,
            isPromotion,
            promotedTo: isPromotion ? promotedPiece : undefined
        };
        
        // Update en passant target
        if (pieceObj?.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
            gameState.enPassantTarget = {
                row: (from.row + to.row) / 2, // Middle square
                col: from.col
            };
        } else {
            gameState.enPassantTarget = null;
        }
        
        // Update castling rights
        updateCastlingRights(from, piece);
        
        // Switch turns and check for game end
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        checkGameEnd();
        
        // Add move to history with the correct piece information
        const moveNotation = generateMoveNotation(
            from, 
            to, 
            isPromotion ? promotedPiece : piece,  // Use promoted piece if applicable
            isEnPassant, 
            isCastling, 
            isPromotion
        );
        moveHistory = [...moveHistory, moveNotation];
    }

    function updateCastlingRights(from: Position, piece: string) {
        const pieceObj = getPieceFromNotation(piece);
        if (!pieceObj) return;
        
        if (pieceObj.type === 'king') {
            gameState.castlingRights[pieceObj.color] = {
                kingSide: false,
                queenSide: false
            };
        } else if (pieceObj.type === 'rook') {
            const color = pieceObj.color;
            const baseRow = color === 'white' ? 7 : 0;
            if (from.row === baseRow) {
                if (from.col === 0) {
                    gameState.castlingRights[color].queenSide = false;
                } else if (from.col === 7) {
                    gameState.castlingRights[color].kingSide = false;
                }
            }
        }
    }

    function isPawnPromotion(to: Position, piece: string): boolean {
        return (piece.toLowerCase() === 'p' && (to.row === 0 || to.row === 7));
    }

    function generateMoveNotation(from: Position, to: Position, piece: string, isEnPassant: boolean, isCastling: boolean, isPromotion: boolean): string {
        const pieceObj = getPieceFromNotation(piece);
        
        // Special notation for castling
        if (isCastling) {
            return to.col > from.col ? 'O-O' : 'O-O-O';
        }
        
        // Convert coordinates to chess notation
        const files = 'abcdefgh';
        const ranks = '87654321';
        const fromSquare = `${files[from.col]}${ranks[from.row]}`;
        const toSquare = `${files[to.col]}${ranks[to.row]}`;
        
        // Determine if it's a capture move
        const isCapture = board[to.row][to.col] !== '' || isEnPassant;
        const separator = isCapture ? 'x' : '-';  // Fixed separator logic
        
        // Build basic move notation
        let notation = '';
        
        // Add piece symbol for non-pawns
        if (pieceObj && pieceObj.type !== 'pawn') {
            notation += piece.toUpperCase();
        }
        
        // Add from square
        notation += fromSquare;
        
        // Add separator and to square
        notation += ` ${separator} ${toSquare}`;
        
        // Add promotion notation if applicable
        if (isPromotion) {
            const promotedPiece = board[to.row][to.col];
            notation += `=${promotedPiece.toUpperCase()}`;
        }
        
        // Add en passant notation
        if (isEnPassant) {
            notation += ' e.p.';
        }
        
        return notation;
    }

    async function updateMatchStatus() {
        if (isGameOver && winner) {  // Check both isGameOver and winner
            try {
                console.log('Game Over. Winner:', winner); // Debug log
                console.log('Player IDs - White:', whitePlayerId, 'Black:', blackPlayerId); // Debug log

                let payload;
                
                if (winner === 'draw') {
                    payload = {
                        is_draw: true,
                        game_state: {
                            board,
                            moveHistory,
                            currentTurn,
                            castlingRights: gameState.castlingRights,
                            enPassantTarget: gameState.enPassantTarget,
                            lastMove: gameState.lastMove,
                            gameEndReason
                        }
                    };
                } else {
                    // Ensure winner is either 'white' or 'black'
                    if (winner !== 'white' && winner !== 'black') {
                        console.error('Invalid winner value:', winner);
                        throw new Error(`Invalid winner state: ${winner}`);
                    }

                    // Get the correct player ID based on winner
                    const winnerId = winner === 'white' ? parseInt(whitePlayerId) : parseInt(blackPlayerId);
                    
                    if (!winnerId || isNaN(winnerId)) {
                        console.error('Invalid winner ID:', winnerId);
                        throw new Error('Invalid winner ID');
                    }

                    payload = {
                        winner_id: winnerId,
                        game_state: {
                            board,
                            moveHistory,
                            currentTurn,
                            castlingRights: gameState.castlingRights,
                            enPassantTarget: gameState.enPassantTarget,
                            lastMove: gameState.lastMove,
                            gameEndReason
                        }
                    };
                }

                console.log('Sending payload:', payload); // Debug log

                const response = await fetch(`http://localhost/api/match-end/${matchId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update match status');
                }

                dispatch('gameOver', {
                    winner,
                    reason: gameEndReason
                });

            } catch (error) {
                console.error('Error updating match status:', error);
                dispatch('error', {
                    message: error.message
                });
            }
        }
    }

    onMount(() => {
        resetGame();
    });
</script>
<div class="flex gap-8 items-start chessboard-container">
    <div class="flex-1">
        <!-- Chessboard -->
        <div class="w-[680px] mx-auto">
            <!-- Files (a-h) labels top -->
            <div class="grid grid-cols-[40px_repeat(8,75px)] mb-1">
                <div></div>
                {#each 'abcdefgh' as file}
                    <div class="text-center font-semibold">{file}</div>
                {/each}
            </div>
            
            <div class="flex">
                <!-- Ranks (1-8) labels left -->
                <div class="flex flex-col justify-around w-[40px] mr-1">
                    {#each '87654321' as rank}
                        <div class="h-[75px] flex items-center justify-center font-semibold">
                            {rank}
                        </div>
                    {/each}
                </div>

                <!-- Board -->
                <div class="grid grid-cols-8 border border-gray-400">
                    {#each board as row, i}
                        {#each row as square, j}
                            <div
                                class="w-[75px] h-[75px] flex items-center justify-center text-4xl cursor-pointer relative
                                    {((i + j) % 2 === 0) ? 'bg-[#116223]' : 'bg-[#d3d2b7]'}
                                    {selectedSquare?.row === i && selectedSquare?.col === j ? 'selected-square' : ''}"
                                on:click={() => handleSquareClick(i, j)}
                            >
                                <!-- Selected piece highlight -->
                                {#if selectedSquare?.row === i && selectedSquare?.col === j}
                                    <div class="absolute inset-0 bg-blue-400 bg-opacity-40"></div>
                                {/if}

                                <!-- Chess piece -->
                                {#if square}
                                    <div class="chess-piece {getPieceFromNotation(square)?.color || 'white'}-piece relative z-10">
                                        {PIECE_SYMBOLS[getPieceFromNotation(square)?.color || 'white'][getPieceFromNotation(square)?.type || 'pawn']}
                                    </div>
                                {/if}
                                
                                <!-- Possible move indicators -->
                                {#if possibleMoves.some(move => move.row === i && move.col === j)}
                                    {#if square}
                                        <!-- Capture opportunity indicator -->
                                        <div class="absolute inset-0 capture-indicator">
                                            <div class="absolute inset-2 border-2 border-red-500 rounded-full opacity-75"></div>
                                        </div>
                                    {:else}
                                        <!-- Regular move indicator -->
                                        <div class="absolute inset-0 flex items-center justify-center">
                                            <div class="w-3 h-3 rounded-full bg-blue-400 bg-opacity-70 
                                                     hover:w-4 hover:h-4 transition-all duration-200"></div>
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        {/each}
                    {/each}
                </div>

                <!-- Ranks (1-8) labels right -->
                <div class="flex flex-col justify-around w-[40px] ml-1">
                    {#each '87654321' as rank}
                        <div class="h-[75px] flex items-center justify-center font-semibold">
                            {rank}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Files (a-h) labels bottom -->
            <div class="grid grid-cols-[40px_repeat(8,75px)] mt-1">
                <div></div>
                {#each 'abcdefgh' as file}
                    <div class="text-center font-semibold">{file}</div>
                {/each}
            </div>
        </div>

        <!-- Game Status -->
        <div class="mt-8 text-center">
            {#if isGameOver}
                <div class="text-2xl font-bold text-red-600">
                    Game Over! 
                    {#if winner === 'draw'}
                        Draw by {gameEndReason}
                    {:else}
                        {winner === 'white' ? 'White' : 'Black'} wins by {gameEndReason}!
                    {/if}
                </div>
            {:else}
                <div class="text-2xl font-semibold">
                    Current Turn: {currentTurn === 'white' ? 'White' : 'Black'}
                </div>
            {/if}
        </div>
    </div>

    <!-- Move History -->
    <div class="w-64 bg-white p-4 rounded-lg shadow">
        <h2 class="text-xl font-bold mb-4">Move History</h2>
        {#if moveHistory.length === 0}
            <p class="text-gray-500">No moves yet</p>
        {:else}
            <div class="space-y-2 move-history">
                {#each moveHistory as move, i}
                    <div class="flex items-center">
                        <span class="w-8 text-gray-500">{Math.floor(i/2 + 1)}.</span>
                        <span class="flex-1 font-mono">{move}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Chess&display=swap');
  /* or download and use a specialized chess font like "Chess7" */

  .chess-piece {
    font-family: 'Noto Chess', sans-serif;
    font-size: 2.5rem;
    /* Ensure crisp rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .white-piece {
    color: #fff;
    text-shadow: 0 0 5px #000;
  }

  .black-piece {
    color: #000;
  }

  /* Add smooth transitions for the indicators */
  .absolute {
    transition: all 0.2s ease-in-out;
  }

  .selected-square {
    position: relative;
    overflow: hidden;
  }

  .selected-square::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 3px solid #60a5fa;
    animation: pulse 2s infinite;
  }

  .capture-indicator {
    animation: rotate 4s linear infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Make pieces stand out more */
  .chess-piece {
    transform: scale(1.1);
    transition: transform 0.2s ease-in-out;
  }

  .chess-piece:hover {
    transform: scale(1.2);
  }

  /* Improve piece shadows */
  .white-piece {
    color: #fff;
    text-shadow: 
        0 0 3px #000,
        0 0 5px #000,
        0 0 7px #000;
  }

  .black-piece {
    color: #000;
    text-shadow: 
        0 0 3px #555,
        0 0 5px #555;
  }

  /* Add any additional styling you need */
  .move-history {
    max-height: 400px;
    overflow-y: auto;
    font-family: monospace;
  }

  /* Add smooth scrolling for move history */
  .move-history {
    scroll-behavior: smooth;
  }

  /* Style for move entries */
  .move-history div {
    padding: 2px 4px;
  }

  .move-history div:hover {
    background-color: #f3f4f6;
    border-radius: 4px;
  }

  /* Add these new styles */
  :global(.promotion-modal) {
    z-index: 9999 !important;
  }

  .chessboard-container {
    position: relative;
    z-index: 1;
  }

  /* Make pieces stand out more but stay below modal */
  .chess-piece {
    z-index: 2;
    transform: scale(1.1);
    transition: transform 0.2s ease-in-out;
  }

  /* Ensure move indicators stay below modal */
  .capture-indicator,
  .selected-square::before {
    z-index: 3;
  }
</style>
