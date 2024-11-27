<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import type { Position, Piece } from '$lib/chess';
    import { isValidMove, getPieceFromNotation, PIECE_SYMBOLS, handlePawnPromotion, isCheckmate, getPossibleMoves, isStalemate, hasInsufficientMaterial, isThreefoldRepetition, isFiftyMoveRule, isKingInCheckPosition } from '$lib/chess';
    
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
    let isMoveHistoryCollapsed = false;
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

                const response = await fetch(`https://www.formalytics.me/api-chess/match-end/${matchId}`, {
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
        initializeBoard();
    });
    // Initialize kingInCheck array
    let kingInCheck = Array(8).fill(null).map(() => Array(8).fill(false));

    // Update the reactive statement
    $: {
        if (board) {
            kingInCheck = board.map((row, i) => 
                row.map((square, j) => {
                    const piece = getPieceFromNotation(square);
                    if (piece?.type === 'king') {
                        return isKingInCheckPosition(board, {row: i, col: j}, piece.color, gameState);
                    }
                    return false;
                })
            );
        }
    }
</script>

<div class="flex flex-col md:flex-row gap-8 items-center md:items-start chessboard-container {isMoveHistoryCollapsed ? 'history-collapsed' : ''}">
    <div class="flex-1 transition-all duration-300 ease-in-out max-w-full md:max-w-none">
        <!-- Chessboard -->
        <div class="w-full mx-auto transition-all duration-300 ease-in-out max-w-full" 
             style="aspect-ratio: 1;">
            <!-- Files (a-h) labels top -->
            <div class="grid-coordinates mb-1">
                <div></div>
                {#each 'abcdefgh' as file}
                    <div class="text-center font-semibold text-sm md:text-base">{file}</div>
                {/each}
                <div></div>
            </div>
            
            <div class="flex">
                <!-- Ranks (1-8) labels left -->
                <div class="w-8 flex flex-col justify-around">
                    {#each '87654321' as rank}
                        <div class="h-full flex items-center justify-center font-semibold text-sm md:text-base">
                            {rank}
                        </div>
                    {/each}
                </div>

                <!-- Board -->
                <div class="grid grid-cols-8 border border-gray-400 flex-1">
                    {#each board as row, i}
                        {#each row as square, j}
                            <div
                                class="aspect-square flex items-center justify-center cursor-pointer relative
                                    {((i + j) % 2 === 0) ? 'bg-[#116223]' : 'bg-[#d3d2b7]'}
                                    {selectedSquare?.row === i && selectedSquare?.col === j ? 'selected-square' : ''}"
                                on:click={() => handleSquareClick(i, j)}
                            >
                                <!-- Selected piece highlight -->
                                {#if selectedSquare?.row === i && selectedSquare?.col === j}
                                    <div class="absolute inset-0 bg-blue-400 bg-opacity-40"></div>
                                {/if}

                                <!-- Chess piece with check effect -->
                                {#if square}
                                    <div class="chess-piece-container">
                                        <div class="chess-piece {getPieceFromNotation(square)?.color || 'white'}-piece
                                                  {kingInCheck[i][j] ? 'king-in-check' : ''}">
                                            {PIECE_SYMBOLS[getPieceFromNotation(square)?.color || 'white'][getPieceFromNotation(square)?.type || 'pawn']}
                                        </div>
                                    </div>
                                {/if}
                                
                                <!-- Possible move indicators with responsive sizing -->
                                {#if possibleMoves.some(move => move.row === i && move.col === j)}
                                    {#if square}
                                        <!-- Capture opportunity indicator -->
                                        <div class="absolute inset-0 capture-indicator">
                                            <div class="absolute inset-[10%] border-2 border-red-500 rounded-full opacity-75"></div>
                                        </div>
                                    {:else}
                                        <!-- Regular move indicator -->
                                        <div class="absolute inset-0 flex items-center justify-center">
                                            <div class="w-[15%] h-[15%] rounded-full bg-blue-400 bg-opacity-70 
                                                     hover:w-[20%] hover:h-[20%] transition-all duration-200"></div>
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        {/each}
                    {/each}
                </div>

                <!-- Ranks (1-8) labels right -->
                <div class="w-8 flex flex-col justify-around">
                    {#each '87654321' as rank}
                        <div class="h-full flex items-center justify-center font-semibold text-sm md:text-base">
                            {rank}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Files (a-h) labels bottom -->
            <div class="grid-coordinates mt-1">
                <div></div>
                {#each 'abcdefgh' as file}
                    <div class="text-center font-semibold text-sm md:text-base">{file}</div>
                {/each}
                <div></div>
            </div>
        </div>

       
    </div>

    <!-- Move History with Turn Indicator at Top -->
    <div class="w-full md:w-64 lg:w-80 bg-white p-4 rounded-lg shadow mt-4 md:mt-0 transition-all duration-300 flex-shrink-0">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold">Move History</h2>
            <button 
                class="text-gray-500 hover:text-gray-700 hidden"
                on:click={() => {
                    isMoveHistoryCollapsed = !isMoveHistoryCollapsed;
                    const history = document.querySelector('.move-history');
                    history?.classList.toggle('h-0');
                    history?.classList.toggle('h-[200px]');
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform transition-transform duration-300 {isMoveHistoryCollapsed ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>

        <!-- Turn Indicator -->
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

        {#if moveHistory.length === 0}
            <p class="text-gray-500">No moves yet</p>
        {:else}
            <div class="space-y-2 move-history h-[200px] transition-all duration-300 ease-in-out overflow-y-auto">
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

  /* Add container for better piece positioning */
  .chess-piece-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
  }

  .chess-piece {
      font-family: 'Noto Chess', sans-serif;
      font-size: clamp(2rem, 3.01vw, 3.5rem); /* Default size */
      line-height: 1;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-in-out;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      user-select: none;
      pointer-events: none;
  }

  /* Add specific media query for the target screen size */
  @media (min-width: 800px) and (max-width: 1000px) {
      .chess-piece {
          font-size: clamp(1.8rem, 3vw, 2.8rem); /* Adjusted size for medium screens */
      }
  }

  /* Keep existing mobile styles */
  @media (max-width: 768px) {
      .chess-piece {
          font-size: clamp(1.5rem, 5vmin, 3rem);
      }
  }

  .white-piece {
      color: #fff;
      text-shadow: 
          0 0 2px #000,
          0 0 3px #000,
          0 0 4px #000;
  }

  .black-piece {
      color: #000;
      text-shadow: 
          0 0 2px #555,
          0 0 3px #555;
  }

  /* Update hover effect to be on the container instead */
  .chess-piece-container:hover .chess-piece {
      transform: scale(1.1);
  }

  /* Ensure squares are perfectly square */
  .aspect-square {
      aspect-ratio: 1/1;
      overflow: hidden;
  }

  /* Rest of your styles... */

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
      transition: height 0.3s ease-in-out;
  }

  /* Adjust the container on mobile */
  @media (max-width: 768px) {
      .chessboard-container {
          padding: 0.5rem;
          width: 100%;
      }

      .move-history {
          max-height: 200px;
          border-top: 1px solid #e5e7eb;
          opacity: 1 !important; /* Force visibility */
          height: auto !important; /* Prevent collapse */
          pointer-events: auto !important; /* Ensure interaction */
      }

      /* Keep the board centered */
      .flex-1 {
          width: 100%;
          max-width: min(100vw - 2rem, 100vh - 2rem);
          margin: 0 auto;
      }

      /* Ensure the move history doesn't affect board centering */
      .history-collapsed .flex-1 {
          margin: 0 auto;
      }
  }

  /* Make the move history more compact on mobile */
  @media (max-width: 768px) {
      .move-history div {
          padding: 4px 2px;
          font-size: 0.875rem;
      }
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
      padding: 1rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
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

  /* Ensure the board stays proportional on different screens */
  @media (max-width: 768px) {
      .chessboard-container {
          padding: 0.5rem;
      }
      
      .chess-piece {
          font-size: clamp(2rem, min(4.5vw, 4.5vh), 3.5rem);
      }
  }

  /* Add these new styles */
  .chessboard-container {
      transition: all 0.3s ease-in-out;
  }

  .history-collapsed .chess-piece {
      font-size: clamp(2.5rem, 6vmin, 4.5rem); /* Larger pieces when history is collapsed */
  }

  @media (max-width: 768px) {
      .history-collapsed .chess-piece {
          font-size: clamp(2.5rem, min(5.5vw, 5.5vh), 4rem);
      }

      .move-history {
          transition: height 0.3s ease-in-out, opacity 0.3s ease-in-out;
      }

      .history-collapsed .move-history {
          opacity: 0;
          pointer-events: none;
      }

      /* Center the board when history is collapsed */
      .history-collapsed .flex-1 {
          margin: 0 auto;
          max-width: 100%;
      }
  }

  /* Add responsive container styles */
  .chessboard-container {
      height: calc(100vh - 200px);
      min-height: 400px;
  }

  /* Make the board expand in collapsed state */
  .history-collapsed .chess-piece {
      font-size: clamp(2.5rem, 6vmin, 4.5rem);
  }

  @media (max-width: 768px) {
      .chessboard-container {
          height: auto;
          min-height: 300px;
      }

      .chess-piece {
          font-size: clamp(1.8rem, 8vmin, 3.5rem);
      }
  }
    /* Improve responsive design */
    @media (max-width: 768px) {
      .chessboard-container {
          padding: 0.5rem;
      }

      .chess-piece {
          font-size: clamp(1.5rem, 8vmin, 3rem);
      }
  }

  /* Add glass effect to the board */
  .grid {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(5px);
      border-radius: 8px;
      overflow: hidden;
  }

  /* Improve square colors */
  :global([class*="bg-[#116223]"]) {
      background-color: rgba(17, 98, 35, 0.9) !important;
  }

  :global([class*="bg-[#d3d2b7]"]) {
      background-color: rgba(211, 210, 183, 0.9) !important;
  }

  /* Add these new styles for the check effect */
  .king-in-check {
      animation: check-pulse 1.5s ease-in-out infinite;
      text-shadow: 
          0 0 5px #ff0000,
          0 0 10px #ff0000,
          0 0 15px #ff0000 !important;
  }

  @keyframes check-pulse {
      0% {
          transform: scale(1);
          filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.7));
      }
      50% {
          transform: scale(1.1);
          filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.9));
      }
      100% {
          transform: scale(1);
          filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.7));
      }
  }

  /* Update existing piece styles to work with the check effect */
  .chess-piece {
      transform: scale(1.1);
      transition: transform 0.2s ease-in-out;
      will-change: transform, filter;
  }

  .white-piece.king-in-check {
      color: #fff;
      text-shadow: 
          0 0 5px #ff0000,
          0 0 10px #ff0000,
          0 0 15px #ff0000 !important;
  }

  .black-piece.king-in-check {
      color: #000;
      text-shadow: 
          0 0 5px #ff0000,
          0 0 10px #ff0000,
          0 0 15px #ff0000 !important;
  }

  /* Add these new styles for better coordinate alignment */
  .grid-coordinates {
      display: grid;
      grid-template-columns: 2rem repeat(8, 1fr) 2rem;
  }

  /* Ensure rank numbers are properly centered */
  .w-8 {
      width: 2rem;
  }

  .h-full {
      height: 100%;
  }

  /* Make the move history section more compact */
  .move-history {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
  }

  /* Update container styles */
  .chessboard-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      min-height: 400px;
  }

  /* Update move history styles */
  .move-history {
      max-height: 400px;
      overflow-y: auto;
      font-family: monospace;
  }

  /* Mobile-specific styles */
  @media (max-width: 768px) {
      .move-history {
          transition: height 0.3s ease-in-out;
          max-height: 200px;
      }

      .history-collapsed .move-history {
          height: 0;
          overflow: hidden;
      }
  }

  /* Remove desktop collapse styles */
  @media (min-width: 769px) {
      .history-collapsed .chess-piece {
          font-size: inherit;
      }

      .history-collapsed .move-history {
          opacity: 1;
          pointer-events: auto;
      }
  }
</style>