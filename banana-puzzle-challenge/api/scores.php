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

$authUser = get_authenticated_user();
$currentUserId = $authUser ? (int)$authUser['id'] : null;

switch ($action) {
    case 'leaderboard':
        $limit = isset($_GET['limit']) ? min(100, max(5, (int)$_GET['limit'])) : 25;
        $modeFilter = strtolower($_GET['mode'] ?? 'all');
        $difficultyFilter = strtolower($_GET['difficulty'] ?? 'all');

        $whereClauses = [];
        $types = '';
        $bindParams = [];

        if ($modeFilter !== 'all' && in_array($modeFilter, ['classic', 'time_challenge', 'practice'])) {
            $whereClauses[] = 's.game_mode = ?';
            $types .= 's';
            $bindParams[] = $modeFilter;
        }

        if ($difficultyFilter !== 'all' && in_array($difficultyFilter, ['easy', 'medium', 'hard'])) {
            $whereClauses[] = 's.difficulty = ?';
            $types .= 's';
            $bindParams[] = $difficultyFilter;
        }

        $whereSql = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

        $sql = "
            SELECT 
                s.id AS score_id,
                s.user_id,
                u.username,
                u.avatar,
                s.score,
                COALESCE(s.game_mode, 'classic') AS game_mode,
                COALESCE(s.difficulty, 'medium') AS difficulty,
                COALESCE(s.puzzles_solved, 0) AS puzzles_solved,
                COALESCE(s.accuracy, 100.0) AS accuracy,
                s.completion_time,
                s.played_at
            FROM scores s
            JOIN users u ON s.user_id = u.id
            {$whereSql}
            ORDER BY s.score DESC, s.completion_time ASC, s.played_at ASC
            LIMIT ?
        ";

        $types .= 'i';
        $bindParams[] = $limit;

        $stmt = $conn->prepare($sql);
        if (!empty($types)) {
            $stmt->bind_param($types, ...$bindParams);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $leaderboard = [];
        $rank = 1;
        while ($row = $result->fetch_assoc()) {
            $row['rank'] = $rank++;
            $row['is_current_user'] = ($currentUserId !== null && (int)$row['user_id'] === (int)$currentUserId);
            $row['avatar'] = !empty($row['avatar']) ? $row['avatar'] : '🍌';
            $leaderboard[] = $row;
        }
        $stmt->close();

        sendResponse([
            'success' => true,
            'leaderboard' => $leaderboard,
            'total_entries' => count($leaderboard),
            'filters' => [
                'mode' => $modeFilter,
                'difficulty' => $difficultyFilter
            ]
        ]);
        break;

    case 'user_scores':
    case 'user_stats':
        if (!$currentUserId) {
            sendResponse(['success' => false, 'message' => 'You must be logged in to view your profile and stats.'], 401);
        }

        // Profile info
        $userStmt = $conn->prepare('SELECT id, username, avatar, created_at FROM users WHERE id = ? LIMIT 1');
        $userStmt->bind_param('i', $currentUserId);
        $userStmt->execute();
        $userProfile = $userStmt->get_result()->fetch_assoc();
        $userStmt->close();

        // High-level scores stats
        $statsStmt = $conn->prepare("
            SELECT 
                COUNT(*) AS total_games,
                COALESCE(MAX(score), 0) AS best_score,
                MIN(completion_time) AS fastest_time,
                ROUND(AVG(score)) AS average_score,
                COALESCE(SUM(puzzles_solved), 0) AS total_puzzles_solved
            FROM scores
            WHERE user_id = ?
        ");
        $statsStmt->bind_param('i', $currentUserId);
        $statsStmt->execute();
        $stats = $statsStmt->get_result()->fetch_assoc();
        $statsStmt->close();

        // Aggregate session stats: total attempted, overall accuracy, highest streak
        $sessionStatsStmt = $conn->prepare("
            SELECT 
                COALESCE(SUM(puzzles_attempted), 0) AS total_attempted,
                COALESCE(SUM(puzzles_solved), 0) AS session_solved,
                COALESCE(MAX(highest_streak), 0) AS best_streak
            FROM game_sessions
            WHERE user_id = ?
        ");
        $sessionStatsStmt->bind_param('i', $currentUserId);
        $sessionStatsStmt->execute();
        $sessionStats = $sessionStatsStmt->get_result()->fetch_assoc();
        $sessionStatsStmt->close();

        $totalAttempted = (int)($sessionStats['total_attempted'] ?? 0);
        $totalSolved = max((int)($stats['total_puzzles_solved'] ?? 0), (int)($sessionStats['session_solved'] ?? 0));
        $overallAccuracy = ($totalAttempted > 0) ? round(($totalSolved / $totalAttempted) * 100, 1) : 0.0;

        // Fetch user achievements
        $achStmt = $conn->prepare("
            SELECT 
                a.id,
                a.code,
                a.title,
                a.description,
                a.icon,
                a.points_reward,
                ua.unlocked_at,
                (ua.id IS NOT NULL) AS is_unlocked
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            ORDER BY is_unlocked DESC, a.id ASC
        ");
        $achStmt->bind_param('i', $currentUserId);
        $achStmt->execute();
        $achRes = $achStmt->get_result();
        $achievements = [];
        $unlockedCount = 0;
        while ($row = $achRes->fetch_assoc()) {
            $row['is_unlocked'] = (bool)$row['is_unlocked'];
            if ($row['is_unlocked']) $unlockedCount++;
            $achievements[] = $row;
        }
        $achStmt->close();

        // Recent game history
        $historyStmt = $conn->prepare("
            SELECT 
                id, 
                score, 
                COALESCE(game_mode, 'classic') AS game_mode,
                COALESCE(difficulty, 'medium') AS difficulty,
                COALESCE(puzzles_solved, 0) AS puzzles_solved,
                COALESCE(accuracy, 100.0) AS accuracy,
                completion_time, 
                played_at
            FROM scores
            WHERE user_id = ?
            ORDER BY played_at DESC
            LIMIT 20
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
            'user' => [
                'id' => (int)$userProfile['id'],
                'username' => $userProfile['username'],
                'avatar' => $userProfile['avatar'] ?? '🍌',
                'created_at' => $userProfile['created_at']
            ],
            'stats' => [
                'total_games' => (int)($stats['total_games'] ?? 0),
                'best_score' => (int)($stats['best_score'] ?? 0),
                'fastest_time' => $stats['fastest_time'] !== null ? (int)$stats['fastest_time'] : null,
                'average_score' => (int)($stats['average_score'] ?? 0),
                'total_puzzles_solved' => $totalSolved,
                'total_puzzles_attempted' => $totalAttempted,
                'overall_accuracy' => $overallAccuracy,
                'best_streak' => (int)($sessionStats['best_streak'] ?? 0),
                'achievements_count' => $unlockedCount,
                'total_achievements' => count($achievements)
            ],
            'achievements' => $achievements,
            'history' => $history
        ]);
        break;

    case 'achievements':
        $achStmt = $conn->prepare("
            SELECT 
                a.id,
                a.code,
                a.title,
                a.description,
                a.icon,
                a.points_reward,
                ua.unlocked_at,
                (ua.id IS NOT NULL) AS is_unlocked
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            ORDER BY is_unlocked DESC, a.id ASC
        ");
        $targetUserId = $currentUserId ?? 0;
        $achStmt->bind_param('i', $targetUserId);
        $achStmt->execute();
        $achRes = $achStmt->get_result();
        $achievements = [];
        while ($row = $achRes->fetch_assoc()) {
            $row['is_unlocked'] = (bool)$row['is_unlocked'];
            $achievements[] = $row;
        }
        $achStmt->close();

        sendResponse([
            'success' => true,
            'achievements' => $achievements
        ]);
        break;

    default:
        sendResponse(['success' => false, 'message' => 'Invalid action.'], 400);
        break;
}
