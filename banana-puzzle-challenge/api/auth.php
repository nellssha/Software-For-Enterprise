<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

// Helper to respond JSON and exit
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Read JSON input if sent as application/json
$input = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}
// Merge POST variables if any
$params = array_merge($_POST, $input);
if (empty($action) && isset($params['action'])) {
    $action = $params['action'];
}

switch ($action) {
    case 'status':
        $authUser = get_authenticated_user();
        if ($authUser) {
            $userId = (int)$authUser['id'];
            $stmt = $conn->prepare('SELECT id, username, avatar, created_at FROM users WHERE id = ? LIMIT 1');
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $userRow = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($userRow) {
                sendResponse([
                    'success' => true,
                    'loggedIn' => true,
                    'auth_type' => $authUser['auth_type'] ?? 'jwt',
                    'user' => [
                        'id' => (int)$userRow['id'],
                        'username' => $userRow['username'],
                        'avatar' => $userRow['avatar'] ?? '🍌',
                        'created_at' => $userRow['created_at']
                    ]
                ]);
            }
        }
        sendResponse([
            'success' => true,
            'loggedIn' => false,
            'user' => null
        ]);
        break;

    case 'register':
        $username = trim($params['username'] ?? '');
        $password = $params['password'] ?? '';
        $avatar = trim($params['avatar'] ?? '🍌');
        if (empty($avatar) || mb_strlen($avatar) > 10) {
            $avatar = '🍌';
        }

        if (strlen($username) < 3 || strlen($username) > 30) {
            sendResponse(['success' => false, 'message' => 'Username must be between 3 and 30 characters.'], 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            sendResponse(['success' => false, 'message' => 'Username can only contain letters, numbers, and underscores.'], 400);
        }

        if (strlen($password) < 6) {
            sendResponse(['success' => false, 'message' => 'Password must be at least 6 characters long.'], 400);
        }

        // Check if username already exists
        $stmt = $conn->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $stmt->close();
            sendResponse(['success' => false, 'message' => 'Username is already taken. Please choose another one.'], 409);
        }
        $stmt->close();

        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // Insert new user
        $insertStmt = $conn->prepare('INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?)');
        $insertStmt->bind_param('sss', $username, $passwordHash, $avatar);
        
        if ($insertStmt->execute()) {
            $userId = $insertStmt->insert_id;
            $insertStmt->close();

            // Set session for legacy fallback
            session_regenerate_id(true);
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $username;

            // Generate JWT Token
            $jwtToken = jwt_encode([
                'sub' => $userId,
                'username' => $username
            ]);

            sendResponse([
                'success' => true,
                'message' => 'Registration successful! Welcome to Banana Puzzle Arena, ' . $username . '!',
                'token' => $jwtToken,
                'user' => [
                    'id' => $userId,
                    'username' => $username,
                    'avatar' => $avatar
                ]
            ], 201);
        } else {
            $insertStmt->close();
            sendResponse(['success' => false, 'message' => 'Registration failed due to a server error.'], 500);
        }
        break;

    case 'login':
        $username = trim($params['username'] ?? '');
        $password = $params['password'] ?? '';

        if (empty($username) || empty($password)) {
            sendResponse(['success' => false, 'message' => 'Username and password are required.'], 400);
        }

        $stmt = $conn->prepare('SELECT id, username, password_hash, avatar FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            $stmt->close();
            if (password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                // Generate JWT Token
                $jwtToken = jwt_encode([
                    'sub' => (int)$user['id'],
                    'username' => $user['username']
                ]);

                sendResponse([
                    'success' => true,
                    'message' => 'Welcome back, ' . $user['username'] . '!',
                    'token' => $jwtToken,
                    'user' => [
                        'id' => (int)$user['id'],
                        'username' => $user['username'],
                        'avatar' => $user['avatar'] ?? '🍌'
                    ]
                ]);
            } else {
                sendResponse(['success' => false, 'message' => 'Invalid username or password.'], 401);
            }
        } else {
            $stmt->close();
            sendResponse(['success' => false, 'message' => 'Invalid username or password.'], 401);
        }
        break;

    case 'update_avatar':
        $authUser = get_authenticated_user();
        if (!$authUser) {
            sendResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $avatar = trim($params['avatar'] ?? '🍌');
        if (empty($avatar) || mb_strlen($avatar) > 10) {
            $avatar = '🍌';
        }

        $stmt = $conn->prepare('UPDATE users SET avatar = ? WHERE id = ?');
        $userId = (int)$authUser['id'];
        $stmt->bind_param('si', $avatar, $userId);
        $stmt->execute();
        $stmt->close();

        sendResponse(['success' => true, 'avatar' => $avatar, 'message' => 'Avatar updated successfully!']);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $paramsCookie = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $paramsCookie['path'], $paramsCookie['domain'],
                $paramsCookie['secure'], $paramsCookie['httponly']
            );
        }
        session_destroy();
        sendResponse(['success' => true, 'message' => 'Logged out successfully.']);
        break;

    default:
        sendResponse(['success' => false, 'message' => 'Invalid action.'], 400);
        break;
}
