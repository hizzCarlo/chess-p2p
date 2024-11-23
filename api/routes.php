<?php

error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Cache-Control');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/modules/post.php';
require_once __DIR__ . '/modules/update.php';
require_once __DIR__ . '/modules/delete.php';
require_once __DIR__ . '/modules/get.php';

$post = new Post($conn);
$update = new Update($conn);
$delete = new Delete($conn);
$get = new Get($conn);

if (isset($_REQUEST['request'])) {
    $request = explode('/', $_REQUEST['request']);
} else {
    echo json_encode(["error" => "Request parameter not found"]);
    http_response_code(404);
    exit();
}

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            switch ($request[0]) {
                case 'player':
                    echo json_encode($post->createPlayer($data));
                    break;
                case 'match':
                    echo json_encode($post->createMatch($data));
                    break;
                default:
                    throw new Exception("Invalid endpoint");
            }
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            switch ($request[0]) {
                case 'match-move':
                    if (!isset($request[1])) throw new Exception("Match ID required");
                    echo json_encode($update->updateMatch($request[1], $data));
                    break;
                case 'match-end':
                    if (!isset($request[1])) throw new Exception("Match ID required");
                    try {
                        $matchId = $request[1];
                        echo json_encode($update->endMatch($matchId, $data));
                    } catch (Exception $e) {
                        http_response_code(500);
                        echo json_encode([
                            "status" => false,
                            "error" => $e->getMessage()
                        ]);
                    }
                    break;
                default:
                    throw new Exception("Invalid endpoint");
            }
            break;

        case 'DELETE':
            switch ($request[0]) {
                case 'match':
                    if (!isset($request[1])) throw new Exception("Match ID required");
                    echo json_encode($delete->deleteMatch($request[1]));
                    break;
                case 'player':
                    if (!isset($request[1])) throw new Exception("Player ID required");
                    echo json_encode($delete->deletePlayer($request[1]));
                    break;
                default:
                    throw new Exception("Invalid endpoint");
            }
            break;

        case 'GET':
            switch ($request[0]) {
                case 'players':
                    echo json_encode($get->getPlayers());
                    break;
                case 'match':
                    if (!isset($request[1])) throw new Exception("Match ID required");
                    echo json_encode($get->getMatch($request[1]));
                    break;
                case 'matches':
                    echo json_encode($get->getMatchHistory());
                    break;
                case 'leaderboard':
                    echo json_encode($get->getLeaderboard());
                    break;
                default:
                    throw new Exception("Invalid endpoint");
            }
            break;

        default:
            throw new Exception("Method not allowed");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => false,
        "error" => $e->getMessage()
    ]);
}
?>