<?php
class Delete {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    public function deleteMatch($matchId) {
        try {
            $stmt = $this->conn->prepare("DELETE FROM matches WHERE id = ?");
            $stmt->execute([$matchId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Match not found");
            }
            
            return [
                "status" => true,
                "message" => "Match deleted successfully"
            ];
        } catch (PDOException $e) {
            throw new Exception("Failed to delete match: " . $e->getMessage());
        }
    }
    
    public function deletePlayer($playerId) {
        try {
            // Check if player is referenced in any matches
            $checkStmt = $this->conn->prepare("
                SELECT COUNT(*) FROM matches 
                WHERE white_player_id = ? 
                OR black_player_id = ? 
                OR winner_id = ?
            ");
            $checkStmt->execute([$playerId, $playerId, $playerId]);
            
            if ($checkStmt->fetchColumn() > 0) {
                throw new Exception("Cannot delete player: Player is referenced in matches");
            }
            
            $stmt = $this->conn->prepare("DELETE FROM players WHERE id = ?");
            $stmt->execute([$playerId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Player not found");
            }
            
            return [
                "status" => true,
                "message" => "Player deleted successfully"
            ];
        } catch (PDOException $e) {
            throw new Exception("Failed to delete player: " . $e->getMessage());
        }
    }
}
?>
