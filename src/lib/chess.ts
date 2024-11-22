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
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
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
    lastMove: { from: Position; to: Position; piece: string; } | null;
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
    
    switch (piece.type) {
        case 'pawn':
            return isValidPawnMove(piece.color, from, to, dx, dy, board, gameState);
            
        case 'rook':
            return isValidRookMove(from, to, dx, dy, board);
            
        case 'knight':
            return isValidKnightMove(dx, dy);
            
        case 'bishop':
            return isValidBishopMove(from, to, dx, dy, board);
            
        case 'queen':
            return isValidRookMove(from, to, dx, dy, board) || 
                   isValidBishopMove(from, to, dx, dy, board);
            
        case 'king':
            return isValidKingMove(piece.color, from, to, dx, dy, board, gameState);
            
        default:
            return false;
    }
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
    if (dx === 0 && dy === direction && !hasTarget) return true;
    if (dx === 0 && dy === 2 * direction && from.row === startRow && !hasTarget) {
        const intermediateRow = from.row + direction;
        return !board[intermediateRow][from.col];
    }
    
    // Regular capture
    if (Math.abs(dx) === 1 && dy === direction && hasTarget) return true;
    
    // En passant
    if (gameState.enPassantTarget && 
        to.row === gameState.enPassantTarget.row && 
        to.col === gameState.enPassantTarget.col) {
        return Math.abs(dx) === 1 && dy === direction;
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
        const castlingRights = gameState.castlingRights[color];
        const row = color === 'white' ? 7 : 0;
        
        // King-side castling
        if (dx === 2 && castlingRights.kingSide) {
            return canCastle(board, row, 'king');
        }
        
        // Queen-side castling
        if (dx === -2 && castlingRights.queenSide) {
            return canCastle(board, row, 'queen');
        }
    }
    
    return false;
}

function canCastle(board: string[][], row: number, side: 'king' | 'queen'): boolean {
    if (side === 'king') {
        return !board[row][5] && !board[row][6];
    } else {
        return !board[row][1] && !board[row][2] && !board[row][3];
    }
}

export function isCheckmate(board: string[][], color: 'white' | 'black'): boolean {
    // First, find the king
    let kingPosition: Position | null = null;
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
    if (!isKingInCheck(board, kingPosition, color)) return false;
    
    // Check if any move can get the king out of check
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece?.color === color) {
                // Try all possible moves for this piece
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(piece, { row, col }, { row: toRow, col: toCol }, board)) {
                            // Make the move temporarily
                            const newBoard = board.map(r => [...r]);
                            newBoard[toRow][toCol] = board[row][col];
                            newBoard[row][col] = '';
                            
                            // Check if king is still in check
                            const newKingPos = piece.type === 'king' 
                                ? { row: toRow, col: toCol }
                                : kingPosition;
                                
                            if (!isKingInCheck(newBoard, newKingPos, color)) {
                                return false; // Found a valid move that prevents checkmate
                            }
                        }
                    }
                }
            }
        }
    }
    
    return true; // No valid moves found to prevent checkmate
}

function isKingInCheck(board: string[][], kingPosition: Position, kingColor: 'white' | 'black'): boolean {
    // Check if any opponent's piece can capture the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceFromNotation(board[row][col]);
            if (piece && piece.color !== kingColor) {
                if (isValidMove(piece, { row, col }, kingPosition, board)) {
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
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
        
        const content = document.createElement('div');
        content.className = 'bg-white p-4 rounded-lg';
        content.innerHTML = `
            <h3 class="text-lg mb-4">Choose promotion piece:</h3>
            <div class="grid grid-cols-4 gap-4">
                ${promotionPieces.map(piece => `
                    <button class="text-3xl p-2 hover:bg-gray-100 rounded">
                        ${PIECE_SYMBOLS[color][getPieceFromNotation(piece)!.type]}
                    </button>
                `).join('')}
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
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