<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? 'get');

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

// Built-in offline fallback puzzles (10 diverse mathematical puzzles)
function getFallbackPuzzle() {
    $fallbackPuzzles = [
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#fff9db" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#f59f00" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#7950f2" text-anchor="middle" font-family="sans-serif">🍌 BANANA MATH PUZZLE 🍌</text>
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <text x="80" y="95">🍌  +  🍌  =  6</text>
                        <text x="80" y="145">🍌  +  🌴  =  8</text>
                        <text x="80" y="195">🌴  +  🥥  =  7</text>
                        <rect x="60" y="215" width="480" height="45" fill="#ffd43b" rx="8"/>
                        <text x="80" y="247" fill="#1e293b" font-size="26">🍌  +  🥥  =  <tspan fill="#d9480f" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 5
        ],
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#f8fafc" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#eab308" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#0284c7" text-anchor="middle" font-family="sans-serif">🍌 BANANA MATH PUZZLE 🍌</text>
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <text x="80" y="95">🐵  +  🐵  =  8</text>
                        <text x="80" y="145">🐵  +  🍌  =  7</text>
                        <text x="80" y="195">🍌  +  🍍  =  9</text>
                        <rect x="60" y="215" width="480" height="45" fill="#fde047" rx="8"/>
                        <text x="80" y="247" fill="#1e293b" font-size="26">🍍  -  🍌  =  <tspan fill="#dc2626" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 3
        ],
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#fffbeb" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#15803d" text-anchor="middle" font-family="sans-serif">🍌 BANANA MATH PUZZLE 🍌</text>
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <text x="80" y="95">🍌  ×  2  =  8</text>
                        <text x="80" y="145">🍌  +  🍹  =  9</text>
                        <text x="80" y="195">🍹  -  🥥  =  3</text>
                        <rect x="60" y="215" width="480" height="45" fill="#fef08a" rx="8"/>
                        <text x="80" y="247" fill="#1e293b" font-size="26">🥥  ×  3  =  <tspan fill="#b91c1c" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 6
        ],
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#f0fdf4" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#15803d" text-anchor="middle" font-family="sans-serif">🍌 TROPICAL MATH ARENA 🍌</text>
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <text x="80" y="95">🍍  +  🍍  =  14</text>
                        <text x="80" y="145">🍍  -  🍌  =  5</text>
                        <text x="80" y="195">🍌  ×  🥥  =  8</text>
                        <rect x="60" y="215" width="480" height="45" fill="#bbf7d0" rx="8"/>
                        <text x="80" y="247" fill="#14532d" font-size="26">🥥  ×  2  =  <tspan fill="#b91c1c" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 8
        ],
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#fef2f2" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#b91c1c" text-anchor="middle" font-family="sans-serif">🍌 BANANA SPEED PUZZLE 🍌</text>
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <text x="80" y="95">🍌  +  🍌  +  🍌  =  9</text>
                        <text x="80" y="145">🍉  -  🍌  =  4</text>
                        <text x="80" y="195">🍉  -  🥥  =  5</text>
                        <rect x="60" y="215" width="480" height="45" fill="#fecaca" rx="8"/>
                        <text x="80" y="247" fill="#7f1d1d" font-size="26">🥥  =  <tspan fill="#b91c1c" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 2
        ]
    ];

    return $fallbackPuzzles[array_rand($fallbackPuzzles)];
}

// Function to award achievements safely
function checkAndAwardAchievements($conn, $userId, $context = []) {
    if (!$userId) return [];
    
    $awarded = [];
    
    // Fetch user stats
    $statsQuery = "
        SELECT 
            COUNT(*) as total_sessions,
            COALESCE(MAX(score), 0) as max_score,
            COALESCE(SUM(puzzles_solved), 0) as total_solved,
            COALESCE(MAX(highest_streak), 0) as max_streak
        FROM game_sessions
        WHERE user_id = ?
    ";
    $stmt = $conn->prepare($statsQuery);
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stats = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $achievementsStmt = $conn->query("SELECT id, code, title, icon, requirement_type, requirement_value, points_reward FROM achievements");
    $achievements = [];
    while ($row = $achievementsStmt->fetch_assoc()) {
        $achievements[] = $row;
    }

    // Get already unlocked achievement IDs
    $unlockedStmt = $conn->prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?");
    $unlockedStmt->bind_param('i', $userId);
    $unlockedStmt->execute();
    $unlockedRes = $unlockedStmt->get_result();
    $unlockedIds = [];
    while ($r = $unlockedRes->fetch_assoc()) {
        $unlockedIds[(int)$r['achievement_id']] = true;
    }
    $unlockedStmt->close();

    foreach ($achievements as $ach) {
        $achId = (int)$ach['id'];
        if (isset($unlockedIds[$achId])) {
            continue; // Already earned
        }

        $qualified = false;
        $reqType = $ach['requirement_type'];
        $reqVal = (int)$ach['requirement_value'];

        switch ($reqType) {
            case 'puzzles_solved':
                if ((int)$stats['total_solved'] >= $reqVal || (!empty($context['is_correct']) && $reqVal === 1)) {
                    $qualified = true;
                }
                break;
            case 'streak':
                $currentStreak = $context['streak'] ?? 0;
                if ($currentStreak >= $reqVal || (int)$stats['max_streak'] >= $reqVal) {
                    $qualified = true;
                }
                break;
            case 'total_solved':
                if ((int)$stats['total_solved'] >= $reqVal) {
                    $qualified = true;
                }
                break;
            case 'speed':
                if (!empty($context['time_taken']) && !empty($context['is_correct']) && (float)$context['time_taken'] <= (float)$reqVal) {
                    $qualified = true;
                }
                break;
            case 'high_score':
                $currentScore = $context['score'] ?? 0;
                if ($currentScore >= $reqVal || (int)$stats['max_score'] >= $reqVal) {
                    $qualified = true;
                }
                break;
            case 'perfect_round':
                if (!empty($context['puzzles_attempted']) && $context['puzzles_attempted'] >= $reqVal) {
                    if (!empty($context['puzzles_solved']) && $context['puzzles_solved'] === $context['puzzles_attempted']) {
                        $qualified = true;
                    }
                }
                break;
            case 'time_challenge':
                if (!empty($context['game_mode']) && $context['game_mode'] === 'time_challenge') {
                    $qualified = true;
                }
                break;
        }

        if ($qualified) {
            $insertAch = $conn->prepare("INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)");
            $insertAch->bind_param('ii', $userId, $achId);
            if ($insertAch->execute() && $insertAch->affected_rows > 0) {
                $awarded[] = [
                    'id' => $achId,
                    'code' => $ach['code'],
                    'title' => $ach['title'],
                    'icon' => $ach['icon'],
                    'points_reward' => (int)$ach['points_reward']
                ];
            }
            $insertAch->close();
        }
    }

    return $awarded;
}

switch ($action) {
    case 'get':
        $apiUrl = 'https://marcconrad.com/uob/banana/api.php?out=json';
        $fetched = false;
        $puzzleData = null;

        // Fetch via cURL
        if (function_exists('curl_init')) {
            $ch = curl_init($apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'BananaPuzzleGame/2.0');
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && !empty($response)) {
                $decoded = json_decode($response, true);
                if (is_array($decoded) && isset($decoded['question']) && isset($decoded['solution'])) {
                    $puzzleData = $decoded;
                    $fetched = true;
                }
            }
        }

        // Secondary fallback via stream
        if (!$fetched && ini_get('allow_url_fopen')) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 5],
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
            ]);
            $response = @file_get_contents($apiUrl, false, $ctx);
            if ($response !== false) {
                $decoded = json_decode($response, true);
                if (is_array($decoded) && isset($decoded['question']) && isset($decoded['solution'])) {
                    $puzzleData = $decoded;
                    $fetched = true;
                }
            }
        }

        $isFallback = false;
        if (!$fetched || !$puzzleData) {
            $puzzleData = getFallbackPuzzle();
            $isFallback = true;
        }

        $puzzleId = bin2hex(random_bytes(8));
        $_SESSION['current_puzzle'] = [
            'id' => $puzzleId,
            'solution' => (int)$puzzleData['solution'],
            'created_at' => microtime(true),
            'question' => $puzzleData['question'],
            'attempts' => 0,
            'is_fallback' => $isFallback,
            'active' => true
        ];

        sendResponse([
            'success' => true,
            'puzzle_id' => $puzzleId,
            'question' => $puzzleData['question'],
            'is_fallback' => $isFallback,
            'message' => $isFallback ? 'Offline challenge loaded!' : 'Puzzle retrieved from Banana API!'
        ]);
        break;

    case 'verify':
        $currentPuzzle = null;
        $correctSolution = null;

        if (isset($_SESSION['current_puzzle']) && !empty($_SESSION['current_puzzle']['active'])) {
            $currentPuzzle = &$_SESSION['current_puzzle'];
            $correctSolution = (int)$currentPuzzle['solution'];
        } elseif (isset($params['fallback_solution']) && is_numeric($params['fallback_solution'])) {
            $correctSolution = (int)$params['fallback_solution'];
            $currentPuzzle = [
                'id' => $params['puzzle_id'] ?? 'client_fallback',
                'solution' => $correctSolution,
                'attempts' => 0,
                'active' => true
            ];
        } else {
            sendResponse([
                'success' => false,
                'message' => 'No active puzzle found. Request a new puzzle first.'
            ], 400);
        }

        if (!isset($params['answer']) || $params['answer'] === '') {
            sendResponse(['success' => false, 'message' => 'Please provide your answer.'], 400);
        }

        $userAnswer = (int)$params['answer'];
        $difficulty = strtolower($params['difficulty'] ?? 'medium');
        $gameMode = strtolower($params['game_mode'] ?? 'classic');
        $timeTaken = isset($params['time_taken']) ? max(0.1, (float)$params['time_taken']) : 5.0;
        $currentStreak = isset($params['current_streak']) ? max(0, (int)$params['current_streak']) : 0;
        $sessionId = isset($params['session_id']) ? (int)$params['session_id'] : null;

        $currentPuzzle['attempts']++;
        $isCorrect = ($userAnswer === $correctSolution);

        // Scoring setup based on difficulty
        // Easy: base 100, standard time 45s, allows 1 retry
        // Medium: base 150, standard time 30s, no retry
        // Hard: base 200, standard time 15s, strict, no retry
        $basePoints = 150;
        $timeTarget = 30;
        $difficultyMultiplier = 1.5;
        $canRetry = false;

        if ($difficulty === 'easy') {
            $basePoints = 100;
            $timeTarget = 45;
            $difficultyMultiplier = 1.0;
            if (!$isCorrect && $currentPuzzle['attempts'] < 2) {
                $canRetry = true; // allow 1 retry on easy
            }
        } elseif ($difficulty === 'hard') {
            $basePoints = 200;
            $timeTarget = 15;
            $difficultyMultiplier = 2.0;
        }

        // Streak multiplier: 1x, 1.2x, 1.4x, 1.6x, up to 2.0x for 5+
        $streakMultiplier = 1.0;
        $newStreak = 0;
        $pointsEarned = 0;
        $speedBonus = 0;

        if ($isCorrect) {
            $newStreak = $currentStreak + 1;
            if ($newStreak >= 5) {
                $streakMultiplier = 2.0;
            } elseif ($newStreak === 4) {
                $streakMultiplier = 1.6;
            } elseif ($newStreak === 3) {
                $streakMultiplier = 1.4;
            } elseif ($newStreak === 2) {
                $streakMultiplier = 1.2;
            }

            // Speed bonus: up to 100 extra points for fast answers
            if ($timeTaken < $timeTarget) {
                $speedRatio = max(0, ($timeTarget - $timeTaken) / $timeTarget);
                $speedBonus = (int)round($speedRatio * 80 * ($difficultyMultiplier / 1.5));
            }

            // If solved on retry on easy mode, award 50% points
            $attemptMultiplier = ($currentPuzzle['attempts'] > 1) ? 0.6 : 1.0;

            $pointsEarned = (int)round(($basePoints + $speedBonus) * $streakMultiplier * $attemptMultiplier);
            $currentPuzzle['active'] = false; // Puzzle solved, deactivate
        } else {
            $newStreak = 0;
            if (!$canRetry) {
                $currentPuzzle['active'] = false; // All attempts used
            }
        }

        // Record puzzle attempt in database
        try {
            $recordStmt = $conn->prepare("
                INSERT INTO puzzle_attempts 
                (session_id, user_id, user_answer, correct_solution, is_correct, time_taken_seconds, points_earned, attempted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $isCorrectInt = $isCorrect ? 1 : 0;
            $recordStmt->bind_param('iiiiddi', $sessionId, $currentUserId, $userAnswer, $correctSolution, $isCorrectInt, $timeTaken, $pointsEarned);
            $recordStmt->execute();
            $recordStmt->close();
        } catch (Exception $e) {
            error_log('Error saving attempt: ' . $e->getMessage());
        }

        // Check for instant achievements
        $newAchievements = [];
        if ($currentUserId) {
            $context = [
                'is_correct' => $isCorrect,
                'time_taken' => $timeTaken,
                'streak' => $newStreak,
                'difficulty' => $difficulty,
                'game_mode' => $gameMode
            ];
            $newAchievements = checkAndAwardAchievements($conn, $currentUserId, $context);
        }

        sendResponse([
            'success' => true,
            'correct' => $isCorrect,
            'user_answer' => $userAnswer,
            'correct_solution' => $correctSolution,
            'points_earned' => $pointsEarned,
            'speed_bonus' => $speedBonus,
            'streak_multiplier' => $streakMultiplier,
            'new_streak' => $newStreak,
            'can_retry' => $canRetry,
            'new_achievements' => $newAchievements,
            'message' => $isCorrect 
                ? "🍌 Correct! +{$pointsEarned} pts! " . ($newStreak > 1 ? "🔥 {$newStreak}x Streak!" : "")
                : ($canRetry 
                    ? "❌ Not quite right! You have 1 retry remaining on Easy mode." 
                    : "❌ Incorrect. The solution was {$correctSolution}.")
        ]);
        break;

    case 'start_session':
        $gameMode = strtolower($params['game_mode'] ?? 'classic');
        $difficulty = strtolower($params['difficulty'] ?? 'medium');

        if (!in_array($gameMode, ['classic', 'time_challenge', 'practice'])) {
            $gameMode = 'classic';
        }
        if (!in_array($difficulty, ['easy', 'medium', 'hard'])) {
            $difficulty = 'medium';
        }

        $sessionId = null;
        if ($currentUserId) {
            $stmt = $conn->prepare("
                INSERT INTO game_sessions 
                (user_id, game_mode, difficulty, score, puzzles_solved, puzzles_attempted, highest_streak, duration_seconds)
                VALUES (?, ?, ?, 0, 0, 0, 0, 0)
            ");
            $stmt->bind_param('iss', $currentUserId, $gameMode, $difficulty);
            if ($stmt->execute()) {
                $sessionId = $stmt->insert_id;
            }
            $stmt->close();
        }

        $_SESSION['game_session'] = [
            'id' => $sessionId,
            'game_mode' => $gameMode,
            'difficulty' => $difficulty,
            'started_at' => microtime(true)
        ];

        sendResponse([
            'success' => true,
            'session_id' => $sessionId,
            'game_mode' => $gameMode,
            'difficulty' => $difficulty,
            'message' => 'Game session initiated.'
        ]);
        break;

    case 'end_session':
        $sessionId = isset($params['session_id']) ? (int)$params['session_id'] : null;
        $score = max(0, (int)($params['score'] ?? 0));
        $puzzlesSolved = max(0, (int)($params['puzzles_solved'] ?? 0));
        $puzzlesAttempted = max(0, (int)($params['puzzles_attempted'] ?? 0));
        $highestStreak = max(0, (int)($params['highest_streak'] ?? 0));
        $durationSeconds = max(0, (int)($params['duration_seconds'] ?? 0));
        $gameMode = strtolower($params['game_mode'] ?? 'classic');
        $difficulty = strtolower($params['difficulty'] ?? 'medium');

        $accuracy = ($puzzlesAttempted > 0) ? round(($puzzlesSolved / $puzzlesAttempted) * 100, 2) : 0.0;
        $userRank = 1;
        $newAchievements = [];

        if ($currentUserId) {
            // Update game session
            if ($sessionId) {
                $stmt = $conn->prepare("
                    UPDATE game_sessions 
                    SET score = ?, puzzles_solved = ?, puzzles_attempted = ?, highest_streak = ?, duration_seconds = ?, completed_at = NOW()
                    WHERE id = ? AND user_id = ?
                ");
                $stmt->bind_param('iiiiiii', $score, $puzzlesSolved, $puzzlesAttempted, $highestStreak, $durationSeconds, $sessionId, $currentUserId);
                $stmt->execute();
                $stmt->close();
            } else {
                // If sessionId wasn't created at start, insert now
                $stmt = $conn->prepare("
                    INSERT INTO game_sessions 
                    (user_id, game_mode, difficulty, score, puzzles_solved, puzzles_attempted, highest_streak, duration_seconds, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ");
                $stmt->bind_param('issiiii', $currentUserId, $gameMode, $difficulty, $score, $puzzlesSolved, $puzzlesAttempted, $highestStreak, $durationSeconds);
                $stmt->execute();
                $sessionId = $stmt->insert_id;
                $stmt->close();
            }

            // Record in scores table
            $scoreStmt = $conn->prepare("
                INSERT INTO scores 
                (user_id, score, game_mode, difficulty, puzzles_solved, accuracy, completion_time, played_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $scoreStmt->bind_param('iissidi', $currentUserId, $score, $gameMode, $difficulty, $puzzlesSolved, $accuracy, $durationSeconds);
            $scoreStmt->execute();
            $scoreStmt->close();

            // Calculate user rank
            $rankStmt = $conn->prepare("
                SELECT COUNT(*) + 1 AS user_rank 
                FROM scores 
                WHERE score > ? OR (score = ? AND completion_time < ?)
            ");
            $rankStmt->bind_param('iii', $score, $score, $durationSeconds);
            $rankStmt->execute();
            $rankResult = $rankStmt->get_result()->fetch_assoc();
            $userRank = (int)($rankResult['user_rank'] ?? 1);
            $rankStmt->close();

            // Evaluate achievements
            $context = [
                'score' => $score,
                'puzzles_solved' => $puzzlesSolved,
                'puzzles_attempted' => $puzzlesAttempted,
                'highest_streak' => $highestStreak,
                'duration_seconds' => $durationSeconds,
                'game_mode' => $gameMode,
                'difficulty' => $difficulty
            ];
            $newAchievements = checkAndAwardAchievements($conn, $currentUserId, $context);
        }

        unset($_SESSION['game_session']);

        sendResponse([
            'success' => true,
            'session_id' => $sessionId,
            'score' => $score,
            'puzzles_solved' => $puzzlesSolved,
            'puzzles_attempted' => $puzzlesAttempted,
            'accuracy' => $accuracy,
            'highest_streak' => $highestStreak,
            'duration_seconds' => $durationSeconds,
            'rank' => $userRank,
            'new_achievements' => $newAchievements,
            'message' => 'Game round finalized.'
        ]);
        break;

    default:
        sendResponse(['success' => false, 'message' => 'Invalid action.'], 400);
        break;
}
