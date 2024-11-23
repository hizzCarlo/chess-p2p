<?php
class Get {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    public function getPlayers() {
        $stmt = $this->conn->query("SELECT * FROM players ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getMatch($matchId) {
        $stmt = $this->conn->prepare("
            SELECT m.*, 
                   w.name as white_player_name,
                   b.name as black_player_name,
                   CASE 
                       WHEN m.status = 'draw' THEN 'Draw'
                       WHEN win.name IS NULL THEN ''
                       ELSE win.name 
                   END as winner_name
            FROM matches m
            LEFT JOIN players w ON m.white_player_id = w.id
            LEFT JOIN players b ON m.black_player_id = b.id
            LEFT JOIN players win ON m.winner_id = win.id
            WHERE m.id = ?
        ");
        $stmt->execute([$matchId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getMatchHistory() {
        try {
            $stmt = $this->conn->query("
                SELECT 
                    m.id,
                    m.status,
                    DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    w.name as white_player_name,
                    b.name as black_player_name,
                    CASE 
                        WHEN m.status = 'draw' THEN 'Draw'
                        WHEN win.name IS NULL THEN ''
                        ELSE win.name 
                    END as winner_name
                FROM matches m
                LEFT JOIN players w ON m.white_player_id = w.id
                LEFT JOIN players b ON m.black_player_id = b.id
                LEFT JOIN players win ON m.winner_id = win.id
                ORDER BY m.created_at DESC
            ");
            
            if (!$stmt) {
                throw new Exception("Failed to execute query");
            }
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Ensure proper JSON encoding by cleaning the data
            foreach ($results as &$row) {
                foreach ($row as $key => $value) {
                    if ($value === null) {
                        $row[$key] = '';
                    }
                }
            }
            
            return $results;
            
        } catch (PDOException $e) {
            error_log("Database error: " . $e->getMessage());
            throw new Exception("Database error occurred");
        }
    }
    
    public function getLeaderboard() {
        try {
            $stmt = $this->conn->query("
                SELECT 
                    id,
                    name, 
                    points,
                    (
                        SELECT COUNT(*) 
                        FROM matches 
                        WHERE (white_player_id = p.id OR black_player_id = p.id)
                            AND status != 'ongoing'
                    ) as games_played,
                    (
                        SELECT COUNT(*) 
                        FROM matches 
                        WHERE winner_id = p.id
                    ) as wins,
                    (
                        SELECT COUNT(*) 
                        FROM matches 
                        WHERE (white_player_id = p.id OR black_player_id = p.id)
                            AND status = 'draw'
                    ) as draws
                FROM players p
                ORDER BY points DESC, wins DESC
            ");
            
            if (!$stmt) {
                throw new Exception("Failed to execute query");
            }
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("Database error: " . $e->getMessage());
            throw new Exception("Database error occurred");
        }
    }
}
?>
