<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

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
        if (!empty($_SESSION['user_id'])) {
            sendResponse([
                'success' => true,
                'loggedIn' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username']
                ]
            ]);
        } else {
            sendResponse([
                'success' => true,
                'loggedIn' => false,
                'user' => null
            ]);
        }
        break;

    case 'register':
        $username = trim($params['username'] ?? '');
        $password = $params['password'] ?? '';

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
        $insertStmt = $conn->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        $insertStmt->bind_param('ss', $username, $passwordHash);
        
        if ($insertStmt->execute()) {
            $userId = $insertStmt->insert_id;
            $insertStmt->close();

            // Log user in
            session_regenerate_id(true);
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $username;

            sendResponse([
                'success' => true,
                'message' => 'Registration successful! Welcome, ' . $username . '.',
                'user' => [
                    'id' => $userId,
                    'username' => $username
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

        $stmt = $conn->prepare('SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            $stmt->close();
            if (password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                sendResponse([
                    'success' => true,
                    'message' => 'Login successful! Welcome back, ' . $user['username'] . '.',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username']
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
