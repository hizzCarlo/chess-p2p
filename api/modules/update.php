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
        if (!isset($data['winner_id'])) {
            throw new Exception("Winner ID is required");
        }
        
        $stmt = $this->conn->prepare("UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?");
        $stmt->execute([$data['winner_id'], $matchId]);
        
        return [
            "status" => true,
            "message" => "Match completed successfully"
        ];
    }
}
?>
