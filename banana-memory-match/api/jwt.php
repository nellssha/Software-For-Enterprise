<?php
/**
 * JSON Web Token (JWT) Helper Module (RFC 7519)
 * Provides HS256 token generation, signature verification, and bearer extraction.
 */

require_once __DIR__ . '/config.php';

// Base64Url encode helper
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Base64Url decode helper
function base64url_decode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Generate a signed JWT token
 */
function jwt_encode(array $payload, int $expiresIn = JWT_EXPIRY_SECONDS): string {
    $now = time();
    $header = [
        'alg' => 'HS256',
        'typ' => 'JWT'
    ];

    $claims = array_merge([
        'iss' => JWT_ISSUER,
        'iat' => $now,
        'exp' => $now + $expiresIn
    ], $payload);

    $encodedHeader = base64url_encode(json_encode($header));
    $encodedPayload = base64url_encode(json_encode($claims));

    $signature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", JWT_SECRET, true);
    $encodedSignature = base64url_encode($signature);

    return "$encodedHeader.$encodedPayload.$encodedSignature";
}

/**
 * Validate and decode a signed JWT token
 */
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    list($encodedHeader, $encodedPayload, $encodedSignature) = $parts;

    // Verify signature using constant-time comparison
    $expectedSignature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", JWT_SECRET, true);
    $providedSignature = base64url_decode($encodedSignature);

    if (!hash_equals($expectedSignature, $providedSignature)) {
        return null; // Invalid signature
    }

    $payloadJson = base64url_decode($encodedPayload);
    $payload = json_decode($payloadJson, true);

    if (!is_array($payload)) {
        return null;
    }

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null; // Token expired
    }

    return $payload;
}

/**
 * Extract Bearer token from incoming HTTP headers
 */
function get_bearer_token(): ?string {
    $header = null;

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $header = trim($headers['Authorization']);
        } elseif (isset($headers['authorization'])) {
            $header = trim($headers['authorization']);
        }
    }

    if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Authenticate current user via JWT (Primary) or PHP Session (Fallback)
 */
function get_authenticated_user(): ?array {
    // 1. Try JWT from Authorization header
    $token = get_bearer_token();
    if ($token) {
        $payload = jwt_decode($token);
        if ($payload && isset($payload['sub']) && isset($payload['username'])) {
            return [
                'id' => (int)$payload['sub'],
                'username' => $payload['username'],
                'auth_type' => 'jwt',
                'exp' => $payload['exp'] ?? null
            ];
        }
    }

    // 2. Fallback to PHP Session if available
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!empty($_SESSION['user_id']) && !empty($_SESSION['username'])) {
        return [
            'id' => (int)$_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'auth_type' => 'session'
        ];
    }

    return null;
}
