<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? 'leaderboard');

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

$input = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}
$params = array_merge($_POST, $input);
if (isset($params['action']) && !empty($params['action'])) {
    $action = $params['action'];
}

// Extract identity from JWT Bearer token or session
$authUser = get_authenticated_user();
$currentUserId = $authUser ? (int)$authUser['id'] : null;

switch ($action) {
    case 'save':
        if (!$currentUserId) {
            sendResponse(['success' => false, 'message' => 'You must be logged in to save your score.'], 401);
        }

        $score = isset($params['score']) ? (int)$params['score'] : 0;
        $completionTime = isset($params['completion_time']) ? (int)$params['completion_time'] : null;

        if ($score < 0) {
            sendResponse(['success' => false, 'message' => 'Invalid score value.'], 400);
        }

        if ($completionTime !== null && $completionTime < 0) {
            sendResponse(['success' => false, 'message' => 'Invalid completion time.'], 400);
        }

        $stmt = $conn->prepare('INSERT INTO scores (user_id, score, completion_time, played_at) VALUES (?, ?, ?, NOW())');
        $stmt->bind_param('iii', $currentUserId, $score, $completionTime);

        if ($stmt->execute()) {
            $scoreId = $stmt->insert_id;
            $stmt->close();

            // Find current rank for this score
            $rankStmt = $conn->prepare('SELECT COUNT(*) + 1 AS user_rank FROM scores WHERE score > ? OR (score = ? AND completion_time < ?)');
            $rankStmt->bind_param('iii', $score, $score, $completionTime);
            $rankStmt->execute();
            $rankResult = $rankStmt->get_result()->fetch_assoc();
            $userRank = $rankResult['user_rank'] ?? 1;
            $rankStmt->close();

            sendResponse([
                'success' => true,
                'message' => 'Score saved successfully!',
                'score_id' => $scoreId,
                'rank' => (int)$userRank,
                'score' => $score,
                'completion_time' => $completionTime,
                'auth_type' => $authUser['auth_type'] ?? 'jwt'
            ], 201);
        } else {
            $stmt->close();
            sendResponse(['success' => false, 'message' => 'Failed to save score.'], 500);
        }
        break;

    case 'leaderboard':
        $limit = isset($_GET['limit']) ? min(100, max(5, (int)$_GET['limit'])) : 25;

        // Query top scores
        $sql = "
            SELECT 
                s.id AS score_id,
                s.user_id,
                u.username,
                s.score,
                s.completion_time,
                s.played_at
            FROM scores s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.score DESC, s.completion_time ASC, s.played_at ASC
            LIMIT ?
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $limit);
        $stmt->execute();
        $result = $stmt->get_result();

        $leaderboard = [];
        $rank = 1;
        while ($row = $result->fetch_assoc()) {
            $row['rank'] = $rank++;
            $row['is_current_user'] = ($currentUserId !== null && (int)$row['user_id'] === (int)$currentUserId);
            $leaderboard[] = $row;
        }
        $stmt->close();

        sendResponse([
            'success' => true,
            'leaderboard' => $leaderboard,
            'total_entries' => count($leaderboard)
        ]);
        break;

    case 'user_scores':
        if (!$currentUserId) {
            sendResponse(['success' => false, 'message' => 'You must be logged in to view your scores.'], 401);
        }

        // Summary stats
        $statsStmt = $conn->prepare("
            SELECT 
                COUNT(*) AS total_games,
                MAX(score) AS best_score,
                MIN(completion_time) AS fastest_time,
                ROUND(AVG(score)) AS average_score
            FROM scores
            WHERE user_id = ?
        ");
        $statsStmt->bind_param('i', $currentUserId);
        $statsStmt->execute();
        $stats = $statsStmt->get_result()->fetch_assoc();
        $statsStmt->close();

        // Recent history
        $historyStmt = $conn->prepare("
            SELECT id, score, completion_time, played_at
            FROM scores
            WHERE user_id = ?
            ORDER BY played_at DESC
            LIMIT 15
        ");
        $historyStmt->bind_param('i', $currentUserId);
        $historyStmt->execute();
        $historyResult = $historyStmt->get_result();

        $history = [];
        while ($row = $historyResult->fetch_assoc()) {
            $history[] = $row;
        }
        $historyStmt->close();

        sendResponse([
            'success' => true,
            'stats' => [
                'total_games' => (int)($stats['total_games'] ?? 0),
                'best_score' => (int)($stats['best_score'] ?? 0),
                'fastest_time' => $stats['fastest_time'] !== null ? (int)$stats['fastest_time'] : null,
                'average_score' => (int)($stats['average_score'] ?? 0)
            ],
            'history' => $history
        ]);
        break;

    default:
        sendResponse(['success' => false, 'message' => 'Invalid action.'], 400);
        break;
}
