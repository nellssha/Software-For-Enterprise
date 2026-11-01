<?php
require_once __DIR__ . '/db.php';

echo "Initializing Banana Puzzle Game database...\n";

// 1. Ensure users table has avatar column if missing
try {
    $res = $conn->query("SHOW COLUMNS FROM users LIKE 'avatar'");
    if ($res->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN avatar VARCHAR(50) DEFAULT '🍌' AFTER password_hash");
        echo "Added avatar column to users table.\n";
    }
} catch (Exception $e) {
    echo "Notice on users table: " . $e->getMessage() . "\n";
}

// 2. Expand scores table with game_mode, difficulty, puzzles_solved, accuracy if missing
$scoreColumnsToAdd = [
    'game_mode' => "ALTER TABLE scores ADD COLUMN game_mode VARCHAR(30) DEFAULT 'classic' AFTER score",
    'difficulty' => "ALTER TABLE scores ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium' AFTER game_mode",
    'puzzles_solved' => "ALTER TABLE scores ADD COLUMN puzzles_solved INT DEFAULT 0 AFTER difficulty",
    'accuracy' => "ALTER TABLE scores ADD COLUMN accuracy DECIMAL(5,2) DEFAULT 100.00 AFTER puzzles_solved"
];

foreach ($scoreColumnsToAdd as $col => $sql) {
    try {
        $res = $conn->query("SHOW COLUMNS FROM scores LIKE '{$col}'");
        if ($res->num_rows === 0) {
            $conn->query($sql);
            echo "Added {$col} column to scores table.\n";
        }
    } catch (Exception $e) {
        echo "Notice on scores.{$col}: " . $e->getMessage() . "\n";
    }
}

// 3. Create game_sessions table
$createGameSessions = "
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    game_mode VARCHAR(30) NOT NULL DEFAULT 'classic',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    score INT NOT NULL DEFAULT 0,
    puzzles_solved INT NOT NULL DEFAULT 0,
    puzzles_attempted INT NOT NULL DEFAULT 0,
    highest_streak INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_score (score),
    INDEX idx_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createGameSessions);
echo "game_sessions table ready.\n";

// 4. Create puzzle_attempts table
$createPuzzleAttempts = "
CREATE TABLE IF NOT EXISTS puzzle_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NULL,
    user_id INT NULL,
    user_answer INT NOT NULL,
    correct_solution INT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    time_taken_seconds DECIMAL(6, 2) NOT NULL DEFAULT 0,
    points_earned INT NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createPuzzleAttempts);
echo "puzzle_attempts table ready.\n";

// 5. Create achievements table
$createAchievements = "
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon VARCHAR(20) NOT NULL DEFAULT '🏆',
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT NOT NULL DEFAULT 1,
    points_reward INT NOT NULL DEFAULT 100
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createAchievements);
echo "achievements table ready.\n";

// 6. Create user_achievements table
$createUserAchievements = "
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_achievement_unique (user_id, achievement_id),
    INDEX idx_user (user_id),
    INDEX idx_achieve (achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createUserAchievements);
echo "user_achievements table ready.\n";

// 7. Seed achievements if empty
$seedAchievements = [
    [
        'code' => 'first_solve',
        'title' => 'First Banana',
        'description' => 'Solve your very first Banana API puzzle.',
        'icon' => '🍌',
        'requirement_type' => 'puzzles_solved',
        'requirement_value' => 1,
        'points_reward' => 50
    ],
    [
        'code' => 'streak_5',
        'title' => 'Streak Master',
        'description' => 'Answer 5 puzzles correctly in a row without missing.',
        'icon' => '🔥',
        'requirement_type' => 'streak',
        'requirement_value' => 5,
        'points_reward' => 150
    ],
    [
        'code' => 'solved_10',
        'title' => 'Banana Collector',
        'description' => 'Solve a total of 10 Banana puzzles correctly.',
        'icon' => '🌴',
        'requirement_type' => 'total_solved',
        'requirement_value' => 10,
        'points_reward' => 200
    ],
    [
        'code' => 'speed_demon',
        'title' => 'Speed Demon',
        'description' => 'Solve any puzzle correctly in under 5 seconds.',
        'icon' => '⚡',
        'requirement_type' => 'speed',
        'requirement_value' => 5,
        'points_reward' => 150
    ],
    [
        'code' => 'perfect_round',
        'title' => 'Flawless Mind',
        'description' => 'Complete a session with 100% accuracy (at least 5 puzzles).',
        'icon' => '✨',
        'requirement_type' => 'perfect_round',
        'requirement_value' => 5,
        'points_reward' => 250
    ],
    [
        'code' => 'high_scorer',
        'title' => 'Tropical Champion',
        'description' => 'Achieve a score of 1,500 points or higher in a single session.',
        'icon' => '👑',
        'requirement_type' => 'high_score',
        'requirement_value' => 1500,
        'points_reward' => 300
    ],
    [
        'code' => 'time_challenge_pro',
        'title' => 'Clock Stopper',
        'description' => 'Complete a Time Challenge session.',
        'icon' => '⏱️',
        'requirement_type' => 'time_challenge',
        'requirement_value' => 1,
        'points_reward' => 100
    ],
    [
        'code' => 'banana_einstein',
        'title' => 'Banana Einstein',
        'description' => 'Solve 50 puzzles across all your game sessions.',
        'icon' => '🧠',
        'requirement_type' => 'total_solved',
        'requirement_value' => 50,
        'points_reward' => 500
    ]
];

$stmt = $conn->prepare("INSERT IGNORE INTO achievements (code, title, description, icon, requirement_type, requirement_value, points_reward) VALUES (?, ?, ?, ?, ?, ?, ?)");
foreach ($seedAchievements as $ach) {
    $stmt->bind_param('sssssii', $ach['code'], $ach['title'], $ach['description'], $ach['icon'], $ach['requirement_type'], $ach['requirement_value'], $ach['points_reward']);
    $stmt->execute();
}
$stmt->close();
echo "Achievements seeded successfully.\n";

echo "Database initialization complete!\n";
