<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

// Built-in fallback puzzles if external API is unreachable
function getFallbackPuzzle() {
    $fallbackPuzzles = [
        [
            'question' => 'data:image/svg+xml;utf8,' . rawurlencode('
                <svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
                    <rect width="100%" height="100%" fill="#fff9db" rx="16" />
                    <rect x="10" y="10" width="580" height="260" fill="none" stroke="#f59f00" stroke-width="3" stroke-dasharray="8 6" rx="12"/>
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#7950f2" text-anchor="middle" font-family="sans-serif">🍌 BANANA BONUS MATH PUZZLE 🍌</text>
                    
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <!-- Line 1: 🍌 + 🍌 = 6 (🍌 = 3) -->
                        <text x="80" y="95">🍌  +  🍌  =  6</text>
                        <!-- Line 2: 🍌 + 🌴 = 8 (🌴 = 5) -->
                        <text x="80" y="145">🍌  +  🌴  =  8</text>
                        <!-- Line 3: 🌴 + 🥥 = 7 (🥥 = 2) -->
                        <text x="80" y="195">🌴  +  🥥  =  7</text>
                        <!-- Question Line: 🍌 + 🥥 = ? -->
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
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#0284c7" text-anchor="middle" font-family="sans-serif">🍌 BANANA BONUS MATH PUZZLE 🍌</text>
                    
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <!-- Line 1: 🐵 + 🐵 = 8 (🐵 = 4) -->
                        <text x="80" y="95">🐵  +  🐵  =  8</text>
                        <!-- Line 2: 🐵 + 🍌 = 7 (🍌 = 3) -->
                        <text x="80" y="145">🐵  +  🍌  =  7</text>
                        <!-- Line 3: 🍌 + 🍍 = 9 (🍍 = 6) -->
                        <text x="80" y="195">🍌  +  🍍  =  9</text>
                        <!-- Question Line: 🍍 - 🍌 = ? (6 - 3 = 3) -->
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
                    <text x="300" y="45" font-size="22" font-weight="bold" fill="#15803d" text-anchor="middle" font-family="sans-serif">🍌 BANANA BONUS MATH PUZZLE 🍌</text>
                    
                    <g font-size="26" font-family="sans-serif" font-weight="bold" fill="#333">
                        <!-- Line 1: 🍌 * 2 = 8 (🍌 = 4) -->
                        <text x="80" y="95">🍌  ×  2  =  8</text>
                        <!-- Line 2: 🍌 + 🍹 = 9 (🍹 = 5) -->
                        <text x="80" y="145">🍌  +  🍹  =  9</text>
                        <!-- Line 3: 🍹 - 🥥 = 3 (🥥 = 2) -->
                        <text x="80" y="195">🍹  -  🥥  =  3</text>
                        <!-- Question Line: 🥥 * 3 = ? (2 * 3 = 6) -->
                        <rect x="60" y="215" width="480" height="45" fill="#fef08a" rx="8"/>
                        <text x="80" y="247" fill="#1e293b" font-size="26">🥥  ×  3  =  <tspan fill="#b91c1c" font-size="30">?</tspan></text>
                    </g>
                </svg>
            '),
            'solution' => 6
        ]
    ];

    return $fallbackPuzzles[array_rand($fallbackPuzzles)];
}

switch ($action) {
    case 'get':
        $apiUrl = 'https://marcconrad.com/uob/banana/api.php?out=json';
        $fetched = false;
        $puzzleData = null;

        // Try cURL first
        if (function_exists('curl_init')) {
            $ch = curl_init($apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'BananaMemoryMatch/1.0');
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

        // Try file_get_contents as secondary attempt if curl didn't succeed
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

        // Use fallback if external API is unreachable or returned invalid response
        $isFallback = false;
        if (!$fetched || !$puzzleData) {
            $puzzleData = getFallbackPuzzle();
            $isFallback = true;
        }

        // Store solution securely in session so user cannot see it in client inspector
        $_SESSION['puzzle_solution'] = (int)$puzzleData['solution'];
        $_SESSION['puzzle_active'] = true;

        sendResponse([
            'success' => true,
            'question' => $puzzleData['question'],
            'is_fallback' => $isFallback,
            'message' => $isFallback 
                ? 'Bonus challenge loaded (Offline mode)!' 
                : 'Bonus challenge loaded from Banana API!'
        ]);
        break;

    case 'verify':
        if (!isset($_SESSION['puzzle_solution']) || empty($_SESSION['puzzle_active'])) {
            sendResponse([
                'success' => false,
                'message' => 'No active puzzle found. Please request a new puzzle first.'
            ], 400);
        }

        $correctSolution = (int)$_SESSION['puzzle_solution'];
        if (!isset($params['answer']) || $params['answer'] === '') {
            sendResponse([
                'success' => false,
                'message' => 'Please provide an answer.'
            ], 400);
        }

        $userAnswer = (int)$params['answer'];
        $isCorrect = ($userAnswer === $correctSolution);

        // Deactivate active puzzle to prevent resubmission
        $_SESSION['puzzle_active'] = false;
        unset($_SESSION['puzzle_solution']);

        $bonusPoints = $isCorrect ? 500 : 0;

        sendResponse([
            'success' => true,
            'correct' => $isCorrect,
            'user_answer' => $userAnswer,
            'correct_solution' => $correctSolution,
            'bonus' => $bonusPoints,
            'message' => $isCorrect 
                ? '🍌 Correct! You earned +500 bonus points!' 
                : '❌ Incorrect. The correct number was ' . $correctSolution . '.'
        ]);
        break;

    default:
        sendResponse(['success' => false, 'message' => 'Invalid action.'], 400);
        break;
}
