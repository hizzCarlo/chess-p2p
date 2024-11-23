<?php
class Update {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    public function updateMatch($matchId, $data) {
        if (!isset($data['game_state'])) {
            throw new Exception("Game state is required");
        }
        
        $stmt = $this->conn->prepare("UPDATE matches SET game_state = ? WHERE id = ?");
        $stmt->execute([json_encode($data['game_state']), $matchId]);
        
        return [
            "status" => true,
            "message" => "Match updated successfully"
        ];
    }
    
    public function endMatch($matchId, $data) {
        try {
            // Start transaction
            $this->conn->beginTransaction();
            
            // Get match details
            $matchStmt = $this->conn->prepare("
                SELECT white_player_id, black_player_id, status
                FROM matches 
                WHERE id = ?
            ");
            $matchStmt->execute([$matchId]);
            $match = $matchStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$match) {
                throw new Exception("Match not found");
            }
            
            if ($match['status'] !== 'ongoing') {
                throw new Exception("Match is already completed");
            }

            // Update points based on match result
            if (isset($data['is_draw']) && $data['is_draw'] === true) {
                // Draw - no points change
                $stmt = $this->conn->prepare("
                    UPDATE matches 
                    SET winner_id = NULL, 
                        status = 'draw',
                        game_state = ?
                    WHERE id = ?
                ");
                $result = $stmt->execute([
                    json_encode($data['game_state'] ?? null),
                    $matchId
                ]);
            } else if (isset($data['winner_id'])) {
                // Update winner and loser points
                $winnerId = $data['winner_id'];
                $loserId = $winnerId == $match['white_player_id'] 
                    ? $match['black_player_id'] 
                    : $match['white_player_id'];
                
                // Add points to winner
                $this->conn->prepare("
                    UPDATE players 
                    SET points = points + 100 
                    WHERE id = ?
                ")->execute([$winnerId]);
                
                // Subtract points from loser
                $this->conn->prepare("
                    UPDATE players 
                    SET points = GREATEST(0, points - 50) 
                    WHERE id = ?
                ")->execute([$loserId]);
                
                // Update match status
                $stmt = $this->conn->prepare("
                    UPDATE matches 
                    SET winner_id = ?, 
                        status = 'completed',
                        game_state = ?
                    WHERE id = ?
                ");
                $result = $stmt->execute([
                    $winnerId,
                    json_encode($data['game_state'] ?? null),
                    $matchId
                ]);
            }

            if (!$result) {
                throw new Exception("Failed to update match");
            }

            $this->conn->commit();
            
            return [
                "status" => true,
                "message" => isset($data['is_draw']) ? "Match ended in draw" : "Match completed successfully"
            ];
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw new Exception($e->getMessage());
        }
    }
}
?>
