# 🍌 Banana Memory Match

Banana Memory Match is a full-stack, tropical-themed web-based memory matching game built with **PHP**, **MySQL**, **JavaScript (ES6+)**, **HTML5/CSS3**, and the external **Banana API**.

---

## 🌟 Features Overview

### 1. User Authentication
- **User Registration**: Create accounts with username and secure password validation.
- **User Login**: Session-based login with hashed password verification (`password_verify()`).
- **Security**: Industry-standard `password_hash()` (Bcrypt/Argon2) encryption and SQL injection prevention via parameterized prepared statements (`mysqli`).
- **Session Persistence**: Maintains user login status with secure session handling and cookie management.
- **Logout**: Seamlessly terminates sessions and clears state.

### 2. Interactive Memory Matching Game
- **Tropical Theme**: Cards featuring Bananas (🍌), Monkeys (🐵), Palm Trees (🌴), Coconuts (🥥), Pineapples (🍍), Smoothies (🍹), Banana Splits (🍨), Banana Bread (🍰), and more.
- **Difficulty Modes**:
  - **Easy**: 6 Pairs (12 Cards, 3×4 grid)
  - **Medium**: 8 Pairs (16 Cards, 4×4 grid - default)
  - **Hard**: 12 Pairs (24 Cards, 6×4 grid)
- **3D Card Flipping**: Smooth CSS 3D transforms (`rotateY`) and perspective.
- **Card Shuffling**: Fisher-Yates shuffle algorithm on every new game.
- **Real-Time Game Tracking**:
  - ⏱️ Completion timer (MM:SS)
  - 🔄 Move counter
  - 🍌 Matched pairs counter
  - ⭐ Dynamic score estimator
- **Interactive Audio**: Custom synthesized sound effects via Web Audio API (flip, match chord, mismatch thud, victory fanfare, bonus chime) with Mute/Unmute toggle.
- **Victory Celebration**: Canvas confetti burst animation and a victory summary modal.

### 3. Banana API Puzzle Integration
- Fetches external visual math puzzles from `https://marcconrad.com/uob/banana/api.php?out=json`.
- **Backend Security Proxy**: The PHP backend proxies the external API and caches the solution securely in the server session so players cannot inspect DevTools to see the answer.
- **Resilient Fallback**: Built-in SVG banana math puzzle generator if the external API is ever offline or unreachable.
- **Bonus Rewards**: Solving the puzzle awards **+500 points** to the player's round score.

### 4. Score Management & Personal Stats
- Automatically records game completion time, moves, and total score.
- Associates each score with the logged-in user via `user_id` foreign key.
- Displays personal stats: Total Games Played, Best Score, Fastest Completion Time, and Average Score.
- Shows recent match history with dates and scores.

### 5. Global Leaderboard
- Displays top players ranked by highest score and fastest completion time.
- 🥇 🥈 🥉 Medals for top 3 champions.
- Highlights the currently logged-in user with "(You)" and row badge.
- One-click instant refresh.

---

## 🗄️ Database Architecture

Database name: `banana_memory_match`

### `users` Table
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Player display name |
| `password_hash` | VARCHAR(255) | NOT NULL | Securely hashed password |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation date |

### `scores` Table
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique score identifier |
| `user_id` | INT | FOREIGN KEY (`users.id`) | References the player account |
| `score` | INT | NOT NULL, DEFAULT 0 | Points achieved in match |
| `completion_time` | INT | NULL | Time in seconds taken to win |
| `played_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time score was recorded |

---

## 🔌 API Endpoints Reference

| Endpoint | Method | Action | Description |
|---|---|---|---|
| `api/auth.php?action=status` | GET | `status` | Returns current session login status |
| `api/auth.php?action=register` | POST | `register` | Creates a new user account |
| `api/auth.php?action=login` | POST | `login` | Authenticates existing user |
| `api/auth.php?action=logout` | POST | `logout` | Ends user session |
| `api/puzzle.php?action=get` | GET | `get` | Fetches Banana puzzle image URL |
| `api/puzzle.php?action=verify` | POST | `verify` | Validates answer (0-9) and awards bonus |
| `api/scores.php?action=leaderboard` | GET | `leaderboard` | Retrieves top ranked scores |
| `api/scores.php?action=user_scores` | GET | `user_scores` | Retrieves logged-in user's history & stats |
| `api/scores.php?action=save` | POST | `save` | Saves player score and completion time |

---

## 🚀 How to Run Locally

1. Start **Apache** and **MySQL** in the **XAMPP Control Panel**.
2. Ensure database `banana_memory_match` exists with credentials configured in `api/config.php`.
3. Open your browser and navigate to:
   ```
   http://localhost/Software-For-Enterprise/banana-memory-match/
   ```
4. Create an account or log in, choose your difficulty, flip cards to find matches, and solve the Banana API puzzle for bonus points!
