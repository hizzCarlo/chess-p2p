<?php
class Post {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    public function createPlayer($data) {
        if (!isset($data['name'])) {
            throw new Exception("Player name is required");
        }
        
        $stmt = $this->conn->prepare("INSERT INTO players (name) VALUES (?)");
        $stmt->execute([$data['name']]);
        
        return [
            "status" => true,
            "player_id" => $this->conn->lastInsertId(),
            "message" => "Player created successfully"
        ];
    }
    
    public function createMatch($data) {
        if (!isset($data['white_player_id']) || !isset($data['black_player_id'])) {
            throw new Exception("Both players are required");
        }
        
        $stmt = $this->conn->prepare("INSERT INTO matches (white_player_id, black_player_id, game_state) VALUES (?, ?, ?)");
        $initialState = json_encode(['board' => 'initial']); // You'll need to define the initial board state
        $stmt->execute([$data['white_player_id'], $data['black_player_id'], $initialState]);
        
        return [
            "status" => true,
            "match_id" => $this->conn->lastInsertId(),
            "message" => "Match created successfully"
        ];
    }
}
?>
