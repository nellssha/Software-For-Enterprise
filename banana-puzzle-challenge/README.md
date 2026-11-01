# Banana Puzzle Arena

**Banana Puzzle Arena** is a full-stack, enterprise-grade mathematical puzzle web application built with **HTML5**, **CSS3**, **JavaScript (ES6+)**, **PHP 8**, **MySQL**, and the **Banana API**.

The application centers around solving tropical visual math equations in real-time, featuring multiple game modes, dynamic countdown timers, lives, combo streak multipliers, player accounts, achievement badges, and a global hall of fame.

---

## Application Concept & Architecture

Imagine a player opens the application:
1. They register or log in (or play as a guest).
2. Enter the main dashboard, select a game mode (**Classic Arena**, **Time Challenge**, or **Practice Zen**) and difficulty setting (**Easy**, **Medium**, or **Hard**).
3. The application retrieves mathematical visual puzzles from the **Banana API**, displays them with zero latency, accepts player input via interactive on-screen keypad (0–9) or physical keyboard shortcuts, and verifies solutions against the server.
4. The player earns points with speed bonuses and consecutive streak combos, tracks lives, unlocks achievement badges, and competes for top positions on the global leaderboard.

---

## Key Features

### A. Core Puzzle Gameplay
- **Banana Puzzle Retrieval**:
  - Live fetching from Banana API (`https://marcconrad.com/uob/banana/api.php?out=json`).
  - Skeleton loading spinner with bouncing animation while fetching.
  - Resilient offline fallback with built-in SVG tropical math puzzles if the external server is ever unreachable.
  - Ability to skip or request new puzzles.
- **Answer Submission & Verification**:
  - Full numeric keypad (digits 0 to 9) and physical keyboard integration (press 0–9, Enter to submit, Backspace/Esc to clear).
  - Answers submitted to the PHP backend.
  - Solution securely verified server-side in PHP sessions / tokens without exposing the answer in client network tabs.
  - Immediate tactile feedback (green glow + fanfare on correct; shake + low buzz on wrong).
  - Resubmission lock preventing repeated answers to the same puzzle.
- **Difficulty Settings**:
  -**Easy**: 45s countdown timer per puzzle, 5 lives, 1 retry allowed on incorrect answers, 1.0x score multiplier.
  -**Medium**: 30s countdown timer per puzzle, 3 lives, standard rules, 1.5x score multiplier.
  -**Hard**: 15s countdown timer per puzzle, 2 lives, strict scoring, 2.0x score multiplier.
- **Scoring & Combo System**:
  - Base points according to difficulty (100 / 150 / 200 pts).
  - **Speed Bonus**: Answering quickly awards up to +100 bonus points.
  - **Streak Multipliers**: Consecutive correct answers scale points from 1.2x up to 2.0x!
  - **Attempt Multiplier**: First-attempt correct solutions earn maximum points.
- **Timer & Lives**:
  - Circular and linear animated countdown timers with pulsating red low-time warnings when under 5 seconds.
  - Visual lives system that shatters/dims upon mistakes or timeouts.
  - Game over triggers when time expires or all lives are spent.
- **Game Results Summary**:
  - Detailed summary modal displaying Total Score, Puzzles Solved vs Attempted, Accuracy %, Highest Streak, Completion Duration, and Global Rank.

### B. Multiple Game Modes
1. **Classic Arena**: Survive as long as possible round-by-round with limited lives and countdown timers per puzzle.
2. **Time Challenge**: High-octane 60-second speed challenge! Solve as many puzzles as possible before the clock hits zero. Fast answers add bonus seconds (+5s) and massive combo multipliers.
3. **Practice Zen**: Relaxed puzzle solving without timer or lives loss. Ideal for training mathematical intuition.

### C. Player Accounts & Performance Tracking
- User registration and login with secure password hashing (`password_hash()`, Bcrypt/Argon2).
- Session and JSON Web Token (JWT RFC 7519) authentication.
- Customizable tropical player avatars.
- Personal statistics dashboard: Total Games Played, Best Score, Total Puzzles Solved, Overall Accuracy %, Highest Streak, and Fastest Solve Time.
- Personal Match History table recording mode, difficulty, score, accuracy, duration, and date.

### D. Global Leaderboard & Achievements
- **Global Hall of Fame**:
  - Filterable by Game Mode (All, Classic, Time Challenge, Practice) and Difficulty (All, Easy, Medium, Hard).
  - Displays Rank, Player Avatar, Username, Score, Mode, Difficulty, Puzzles Solved, Accuracy, and Date.
- **Achievement Badges**:
  -**First Banana**: Solve your very first Banana API puzzle.
  -**Streak Master**: Answer 5 puzzles correctly in a row.
  -**Banana Collector**: Solve 10 total puzzles.
  -**Speed Demon**: Solve a puzzle correctly in under 5 seconds.
  -**Flawless Mind**: Complete a session with 100% accuracy.
  -**Tropical Champion**: Score 1,500+ points in a single session.
  -**Clock Stopper**: Complete a Time Challenge session.
  -**Banana Einstein**: Solve 50 puzzles across all sessions.
- In-game celebratory notifications and confetti bursts whenever a new achievement is unlocked.

---

## Database Architecture

Database name: `banana_memory_match`

### 1. `users` Table
Stores player accounts and profile configuration.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique player ID |
| `username` | VARCHAR(50) UNIQUE NOT NULL | Player username |
| `password_hash` | VARCHAR(255) NOT NULL | Securely hashed password |
| `avatar` | VARCHAR(50) DEFAULT '🍌' | Selected profile avatar |
| `created_at` | TIMESTAMP | Registration timestamp |

### 2. `game_sessions` Table
Stores each gameplay session, mode, difficulty, score, and duration.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Session ID |
| `user_id` | INT NULL | Player ID (NULL for guest) |
| `game_mode` | VARCHAR(30) DEFAULT 'classic' | Mode (`classic`, `time_challenge`, `practice`) |
| `difficulty` | VARCHAR(20) DEFAULT 'medium' | Difficulty (`easy`, `medium`, `hard`) |
| `score` | INT DEFAULT 0 | Final round score |
| `puzzles_solved` | INT DEFAULT 0 | Correctly solved puzzles count |
| `puzzles_attempted` | INT DEFAULT 0 | Total puzzles attempted |
| `highest_streak` | INT DEFAULT 0 | Highest combo streak |
| `duration_seconds` | INT DEFAULT 0 | Total round duration |
| `completed_at` | TIMESTAMP | Completion timestamp |

### 3. `puzzle_attempts` Table
Stores individual puzzle attempts, correctness, time taken, and points.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Attempt ID |
| `session_id` | INT NULL | Associated game session |
| `user_id` | INT NULL | Associated player |
| `user_answer` | INT NOT NULL | Player's submitted digit (0–9) |
| `correct_solution` | INT NOT NULL | Actual puzzle solution |
| `is_correct` | TINYINT(1) DEFAULT 0 | Correctness flag (1 or 0) |
| `time_taken_seconds` | DECIMAL(6,2) | Seconds taken to answer |
| `points_earned` | INT DEFAULT 0 | Points awarded |
| `attempted_at` | TIMESTAMP | Attempt timestamp |

### 4. `scores` Table
Stores final scores and rankings for the global leaderboard.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Score entry ID |
| `user_id` | INT NOT NULL | Associated user |
| `score` | INT NOT NULL | Total score |
| `game_mode` | VARCHAR(30) | Game mode |
| `difficulty` | VARCHAR(20) | Difficulty setting |
| `puzzles_solved` | INT | Puzzles solved |
| `accuracy` | DECIMAL(5,2) | Accuracy percentage |
| `completion_time` | INT | Duration in seconds |
| `played_at` | TIMESTAMP | Date played |

### 5. `achievements` Table
Stores available achievement definitions and point rewards.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Achievement ID |
| `code` | VARCHAR(50) UNIQUE | Unique achievement key |
| `title` | VARCHAR(100) | Badge title |
| `description` | VARCHAR(255) | How to unlock badge |
| `icon` | VARCHAR(20) | Visual emoji/icon |
| `requirement_type` | VARCHAR(50) | Rule category |
| `requirement_value` | INT | Requirement milestone threshold |
| `points_reward` | INT | Bonus prestige points |

### 6. `user_achievements` Table
Stores unlocked achievements for each player.
| Column | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Record ID |
| `user_id` | INT NOT NULL | User who unlocked badge |
| `achievement_id` | INT NOT NULL | Unlocked achievement ID |
| `unlocked_at` | TIMESTAMP | Unlock timestamp |

---

## 🔌 API Endpoints Reference

| Endpoint | Method | Parameters | Description |
|---|---|---|---|
| `api/puzzle.php?action=get` | GET | None | Fetches puzzle image URL and starts puzzle session |
| `api/puzzle.php?action=verify` | POST | `answer`, `puzzle_id`, `difficulty`, `game_mode`, `time_taken`, `current_streak` | Verifies submitted digit, calculates score/streak bonuses, records attempt, checks instant achievements |
| `api/puzzle.php?action=start_session` | POST | `game_mode`, `difficulty` | Initiates game session in database |
| `api/puzzle.php?action=end_session` | POST | `session_id`, `score`, `puzzles_solved`, `puzzles_attempted`, `highest_streak`, `duration_seconds` | Finalizes round, records score and evaluates achievements |
| `api/scores.php?action=leaderboard` | GET | `mode`, `difficulty`, `limit` | Returns top ranked players with avatars and filters |
| `api/scores.php?action=achievements` | GET | None | Returns all achievements and user unlock status |
| `api/scores.php?action=user_stats` | GET | None (Auth) | Returns comprehensive player profile, records, and history |
| `api/auth.php?action=status` | GET | None | Checks current user authentication status |
| `api/auth.php?action=register` | POST | `username`, `password`, `avatar` | Creates new user account |
| `api/auth.php?action=login` | POST | `username`, `password` | Authenticates user and returns JWT token |
| `api/auth.php?action=update_avatar` | POST | `avatar` | Updates player avatar |
| `api/auth.php?action=logout` | POST | None | Terminates session |

---

## Technical Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Modern, accessible semantic structure |
| **CSS3** | Glassmorphism, tropical theme, animations & responsive layout |
| **JavaScript (ES6+)** | Game engine, keypad interactions, Web Audio synthesizer, confetti system |
| **PHP 8** | Backend business logic, session/JWT authentication, scoring & API proxy |
| **MySQL** | Relational schema storing users, game sessions, attempts, scores & achievements |
| **Banana API** | Live mathematical visual puzzle provider |
| **XAMPP** | Local Apache & MySQL server environment |
| **Git / GitHub** | Version control & repository tracking |

---

## How to Run Locally

1. Start **Apache** and **MySQL** in **XAMPP Control Panel**.
2. Run database initialization script (or import schema):
   ```powershell
   php api/init_db.php
   ```
3. Open your browser and navigate to:
   ```
   http://localhost/Software-For-Enterprise/banana-puzzle-challenge/
   ```
4. Choose your mode and difficulty, or log in to track your personal achievements and leaderboard rank!
