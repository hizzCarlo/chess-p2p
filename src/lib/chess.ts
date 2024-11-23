export type Piece = {
    type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
    color: 'white' | 'black';
};

export type Position = {
    row: number;
    col: number;
};

export const PIECE_SYMBOLS = {
    white: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

export function getPieceFromNotation(notation: string): Piece | null {
    if (!notation) return null;
    
    const isWhite = notation === notation.toUpperCase();
    const letter = notation.toLowerCase();
    
    const pieceTypes = {
        'k': 'king',
        'q': 'queen',
        'r': 'rook',
        'b': 'bishop',
        'n': 'knight',
        'p': 'pawn'
    } as const;
    
    return {
        type: pieceTypes[letter as keyof typeof pieceTypes],
        color: isWhite ? 'white' : 'black'
    };
}

export interface GameState {
    board: string[][];
    moveHistory: string[];
    currentTurn: 'white' | 'black';
    castlingRights: {
        white: { kingSide: boolean; queenSide: boolean; };
        black: { kingSide: boolean; queenSide: boolean; };
    };
    enPassantTarget: Position | null;
    lastMove: { 
        from: Position; 
        to: Position; 
        piece: string;
        isEnPassant?: boolean;
        isCastling?: boolean;
        isPromotion?: boolean;
    } | null;
}

export function isValidMove(
    piece: Piece,
    from: Position,
    to: Position,
    board: string[][],
    gameState: GameState
): boolean {
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const targetPiece = getPieceFromNotation(board[to.row][to.col]);
    
    if (targetPiece?.color === piece.color) return false;
    
    // Check basic move validity first
    let isBasicallyValid = false;
    switch (piece.type) {
        case 'pawn':
            isBasicallyValid = isValidPawnMove(piece.color, from, to, dx, dy, board, gameState);
            break;
        case 'rook':
            isBasicallyValid = isValidRookMove(from, to, dx, dy, board);
            break;
        case 'knight':
            isBasicallyValid = isValidKnightMove(dx, dy);
            break;
        case 'bishop':
            isBasicallyValid = isValidBishopMove(from, to, dx, dy, board);
            break;
        case 'queen':
            isBasicallyValid = isValidRookMove(from, to, dx, dy, board) || 
                              isValidBishopMove(from, to, dx, dy, board);
            break;
        case 'king':
            isBasicallyValid = isValidKingMove(piece.color, from, to, dx, dy, board, gameState);
            break;
        default:
            return false;
    }

    if (!isBasicallyValid) return false;

    // Simulate the move and check if it would leave/put the king in check
    const newBoard = board.map(row => [...row]);
    newBoard[to.row][to.col] = board[from.row][from.col];
    newBoard[from.row][from.col] = '';

    // Find king position after the move
    let kingPosition: Position | null = null;
    if (piece.type === 'king') {
        kingPosition = to;
    } else {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = getPieceFromNotation(newBoard[row][col]);
                if (p?.type === 'king' && p.color === piece.color) {
                    kingPosition = { row, col };
                    break;
                }
            }
            if (kingPosition) break;
        }
    }

    // If king position wasn't found or the move would leave king in check
    if (!kingPosition || isKingInCheck(newBoard, kingPosition, piece.color, gameState)) {
        return false;
    }

    return true;
}

function isValidPawnMove(
    color: 'white' | 'black',
    from: Position,
    to: Position,
    dx: number,
    dy: number,
    board: string[][],
    gameState: GameState
): boolean {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const hasTarget = !!board[to.row][to.col];
    
    // Basic pawn moves
    if (dx === 0 && !hasTarget) {
        if (dy === direction) return true;
        if (dy === 2 * direction && from.row === startRow) {
            const intermediateRow = from.row + direction;
            return !board[intermediateRow][from.col];
        }
    }
    
    // Captures (including en passant)
    if (Math.abs(dx) === 1 && dy === direction) {
        // Regular capture
        if (hasTarget) return true;
        
        // En passant
        const lastMove = gameState.lastMove;
        if (lastMove) {
            const targetPiece = getPieceFromNotation(board[lastMove.to.row][lastMove.to.col]);
            const isLastMoveDoublePawnPush = targetPiece?.type === 'pawn' && 
                                           Math.abs(lastMove.from.row - lastMove.to.row) === 2;
            
            if (isLastMoveDoublePawnPush &&
                lastMove.to.col === to.col && // Same column as the pawn that just moved
                lastMove.to.row === from.row && // Adjacent to our pawn
                to.row === (color === 'white' ? lastMove.to.row - 1 : lastMove.to.row + 1)) {
                return true;
            }
        }
    }
    
    return false;
}

function isValidRookMove(
    from: Position,
    to: Position,
    dx: number,
    dy: number,
    board: string[][]
): boolean {
    if (dx !== 0 && dy !== 0) return false;
    
    const direction = {
        row: Math.sign(dy),
        col: Math.sign(dx)
    };
    
    let current = {
        row: from.row + direction.row,
        col: from.col + direction.col
    };
    
    while (current.row !== to.row || current.col !== to.col) {
        if (board[current.row][current.col]) return false;
        current.row += direction.row;
        current.col += direction.col;
    }
    
    return true;
}

function isValidKnightMove(dx: number, dy: number): boolean {
    return (Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
           (Math.abs(dx) === 1 && Math.abs(dy) === 2);
}

function isValidBishopMove(
    from: Position,
    to: Position,
    dx: number,
    dy: number,
    board: string[][]
): boolean {
    if (Math.abs(dx) !== Math.abs(dy)) return false;
    
    const direction = {
        row: Math.sign(dy),
        col: Math.sign(dx)
    };
    
    let current = {
        row: from.row + direction.row,
        col: from.col + direction.col
    };
    
    while (current.row !== to.row || current.col !== to.col) {
        if (board[current.row][current.col]) return false;
        current.row += direction.row;
        current.col += direction.col;
    }
    
    return true;
}

function isValidKingMove(
    color: 'white' | 'black',
    from: Position,
    to: Position,
    dx: number,
    dy: number,
    board: string[][],
    gameState: GameState
): boolean {
    // Regular king move
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
    
    // Castling
    if (dy === 0 && Math.abs(dx) === 2) {
        const row = color === 'white' ? 7 : 0;
        const castlingRights = gameState.castlingRights[color];
        
        // Cannot castle while in check
        if (isKingInCheck(board, from, color, gameState)) return false;
        
        if (dx === 2 && castlingRights.kingSide) {
            // King-side castling
            if (!board[row][5] && !board[row][6] && board[row][7]?.toLowerCase() === 'r') {
                // Check if squares are under attack
                return !isSquareUnderAttack(board, {row, col: 5}, color, gameState) &&
                       !isSquareUnderAttack(board, {row, col: 6}, color, gameState);
            }
        } else if (dx === -2 && castlingRights.queenSide) {
            // Queen-side castling
            if (!board[row][1] && !board[row][2] && !board[row][3] && board[row][0]?.toLowerCase() === 'r') {
                return !isSquareUnderAttack(board, {row, col: 2}, color, gameState) &&
                       !isSquareUnderAttack(board, {row, col: 3}, color, gameState);
            }
        }
    }
    
    return false;
}


export function isCheckmate(board: string[][], color: 'white' | 'black', gameState: GameState): boolean {
    let kingPosition: Position | null = null;
    
    // Find king position
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece?.type === 'king' && piece.color === color) {
                kingPosition = { row, col };
                break;
            }
        }
        if (kingPosition) break;
    }
    
    if (!kingPosition) return false;
    
    // Check if king is in check
    if (!isKingInCheck(board, kingPosition, color, gameState)) return false;
    
    // Check if any move can get the king out of check
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece?.color === color) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(piece, { row, col }, { row: toRow, col: toCol }, board, gameState)) {
                            const newBoard = board.map(r => [...r]);
                            newBoard[toRow][toCol] = board[row][col];
                            newBoard[row][col] = '';
                            
                            const newKingPos = piece.type === 'king' 
                                ? { row: toRow, col: toCol }
                                : kingPosition;
                                
                            if (!isKingInCheck(newBoard, newKingPos, color, gameState)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return true;
}

function isKingInCheck(
    board: string[][], 
    kingPosition: Position, 
    kingColor: 'white' | 'black', 
    gameState: GameState
): boolean {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece && piece.color !== kingColor) {
                if (isValidMove(piece, { row, col }, kingPosition, board, gameState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function handlePawnPromotion(
    board: string[][],
    to: Position,
    color: 'white' | 'black'
): Promise<string> {
    return new Promise((resolve) => {
        const promotionPieces = color === 'white' 
            ? ['Q', 'R', 'B', 'N'] 
            : ['q', 'r', 'b', 'n'];
            
        // Create modal dialog for piece selection
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const content = document.createElement('div');
        content.className = 'bg-white p-4 rounded-lg shadow-xl z-50';
        content.innerHTML = `
            <h3 class="text-lg mb-4 font-bold">Choose promotion piece:</h3>
            <div class="grid grid-cols-4 gap-4">
                ${promotionPieces.map(piece => `
                    <button class="text-3xl p-2 hover:bg-gray-100 rounded transition-colors duration-200">
                        ${PIECE_SYMBOLS[color][getPieceFromNotation(piece)!.type]}
                    </button>
                `).join('')}
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Ensure modal is on top of everything
        modal.style.zIndex = '9999';
        content.style.zIndex = '10000';
        
        // Handle piece selection
        const buttons = content.querySelectorAll('button');
        buttons.forEach((button, index) => {
            button.addEventListener('click', () => {
                const selectedPiece = promotionPieces[index];
                document.body.removeChild(modal);
                resolve(selectedPiece);
            });
        });
    });
}

export function getPossibleMoves(
    piece: Piece,
    position: Position,
    board: string[][],
    gameState: GameState
): Position[] {
    const possibleMoves: Position[] = [];
    
    // Check all possible positions on the board
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const targetPos = { row, col };
            if (isValidMove(piece, position, targetPos, board, gameState)) {
                possibleMoves.push(targetPos);
            }
        }
    }
    
    return possibleMoves;
}

function isSquareUnderAttack(
    board: string[][],
    position: Position,
    defendingColor: 'white' | 'black',
    gameState: GameState
): boolean {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece && piece.color !== defendingColor) {
                if (isValidMove(piece, {row, col}, position, board, gameState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function isStalemate(board: string[][], color: 'white' | 'black', gameState: GameState): boolean {
    // If king is in check, it's not stalemate
    let kingPosition: Position | null = null;
    
    // Find king position
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece?.type === 'king' && piece.color === color) {
                kingPosition = { row, col };
                break;
            }
        }
        if (kingPosition) break;
    }
    
    if (!kingPosition || isKingInCheck(board, kingPosition, color, gameState)) {
        return false;
    }
    
    // Check if any legal moves exist
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece?.color === color) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(piece, { row, col }, { row: toRow, col: toCol }, board, gameState)) {
                            // Test if move would put king in check
                            const newBoard = board.map(r => [...r]);
                            newBoard[toRow][toCol] = board[row][col];
                            newBoard[row][col] = '';
                            
                            const newKingPos = piece.type === 'king' 
                                ? { row: toRow, col: toCol }
                                : kingPosition;
                                
                            if (!isKingInCheck(newBoard, newKingPos, color, gameState)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return true;
}

export function hasInsufficientMaterial(board: string[][]): boolean {
    const pieces = {
        white: { bishops: 0, knights: 0, others: 0 },
        black: { bishops: 0, knights: 0, others: 0 }
    };
    
    // Count pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece) {
                switch (piece.type) {
                    case 'bishop':
                        pieces[piece.color].bishops++;
                        break;
                    case 'knight':
                        pieces[piece.color].knights++;
                        break;
                    case 'pawn':
                    case 'rook':
                    case 'queen':
                        pieces[piece.color].others++;
                        break;
                }
            }
        }
    }
    
    // Check insufficient material conditions
    const white = pieces.white;
    const black = pieces.black;
    
    // King vs King
    if (white.bishops === 0 && white.knights === 0 && white.others === 0 &&
        black.bishops === 0 && black.knights === 0 && black.others === 0) {
        return true;
    }
    
    // King and Bishop vs King
    if ((white.bishops === 1 && white.knights === 0 && white.others === 0 &&
         black.bishops === 0 && black.knights === 0 && black.others === 0) ||
        (black.bishops === 1 && black.knights === 0 && black.others === 0 &&
         white.bishops === 0 && white.knights === 0 && white.others === 0)) {
        return true;
    }
    
    // King and Knight vs King
    if ((white.knights === 1 && white.bishops === 0 && white.others === 0 &&
         black.knights === 0 && black.bishops === 0 && black.others === 0) ||
        (black.knights === 1 && black.bishops === 0 && black.others === 0 &&
         white.knights === 0 && white.bishops === 0 && white.others === 0)) {
        return true;
    }
    
    return false;
}

export function isThreefoldRepetition(moveHistory: string[]): boolean {
    // Create a map to store board positions and their count
    const positions = new Map<string, number>();
    
    // Count each position
    for (const move of moveHistory) {
        const position = move; // You'll need to implement a way to get FEN notation
        const count = (positions.get(position) || 0) + 1;
        positions.set(position, count);
        
        if (count >= 3) return true;
    }
    
    return false;
}

export function isFiftyMoveRule(moveHistory: string[]): boolean {
    let movesSinceCapture = 0;
    
    for (let i = moveHistory.length - 1; i >= 0; i--) {
        const move = moveHistory[i];
        if (move.includes('x') || move.toLowerCase().includes('p')) {
            // Reset counter if capture or pawn move
            movesSinceCapture = 0;
        } else {
            movesSinceCapture++;
        }
        
        if (movesSinceCapture >= 100) { // 50 moves by each player = 100 half-moves
            return true;
        }
    }
    
    return false;
}