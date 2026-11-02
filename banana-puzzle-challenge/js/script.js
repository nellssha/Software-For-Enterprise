/**
 * BANANA PUZZLE ARENA
 * Complete Application Logic
 * Multiple Game Modes, Live Banana API, Difficulty Tuning,
 * Scoring & Streak Multipliers, Achievements, Player Accounts & Leaderboards.
 */

'use strict';

// ===================================================================
// CONSTANTS & CONFIGURATION
// ===================================================================
const API_BASE = 'api';

const DIFFICULTY_RULES = {
  easy: {
    name: 'Easy',
    timerSeconds: 45,
    lives: 5,
    basePoints: 100,
    multiplier: 1.0,
    allowRetry: true
  },
  medium: {
    name: 'Medium',
    timerSeconds: 30,
    lives: 3,
    basePoints: 150,
    multiplier: 1.5,
    allowRetry: false
  },
  hard: {
    name: 'Hard',
    timerSeconds: 15,
    lives: 2,
    basePoints: 200,
    multiplier: 2.0,
    allowRetry: false
  }
};

const MODE_CONFIG = {
  classic: {
    name: 'Classic Arena',
    icon: '🎮',
    hasTimer: true,
    hasLives: true
  },
  time_challenge: {
    name: 'Time Challenge',
    icon: '⏱️',
    hasTimer: true,
    hasLives: false,
    durationSeconds: 60
  },
  practice: {
    name: 'Practice Zen',
    icon: '🧘',
    hasTimer: false,
    hasLives: false
  }
};

// ===================================================================
// SOUND MANAGER (Web Audio API Synthesizer)
// ===================================================================
class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('banana_arena_sound') !== 'false';
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('banana_arena_sound', this.enabled ? 'true' : 'false');
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio policy or inactive context
      }
    }, delay * 1000);
  }

  playKey() {
    this.playTone(520, 'sine', 0.05, 0.06);
  }

  playCorrect() {
    // Joyful upward arpeggio
    this.playTone(523.25, 'triangle', 0.22, 0.12, 0.00); // C5
    this.playTone(659.25, 'triangle', 0.22, 0.12, 0.07); // E5
    this.playTone(783.99, 'triangle', 0.26, 0.12, 0.14); // G5
    this.playTone(1046.50, 'triangle', 0.35, 0.15, 0.21); // C6
  }

  playIncorrect() {
    this.playTone(310, 'sawtooth', 0.16, 0.08, 0.00);
    this.playTone(220, 'sawtooth', 0.22, 0.08, 0.09);
  }

  playTick() {
    this.playTone(850, 'sine', 0.03, 0.04);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.35, 0.14, i * 0.11);
    });
    this.playTone(1318.51, 'triangle', 0.7, 0.16, 0.50);
  }
}

// ===================================================================
// CONFETTI CELEBRATION SYSTEM
// ===================================================================
class ConfettiSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.colors = ['#facc15', '#eab308', '#10b981', '#f43f5e', '#38bdf8', '#fb923c', '#a855f7'];

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 90) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width * (0.3 + Math.random() * 0.4),
        y: this.canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.75) * 20,
        size: Math.random() * 8 + 6,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (!this.animId) {
      this.render();
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.009;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.2);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.render());
    } else {
      this.animId = null;
    }
  }
}

// ===================================================================
// TOAST NOTIFICATIONS
// ===================================================================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '🍌' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===================================================================
// AUTHENTICATION & SESSION MANAGER
// ===================================================================
const AuthManager = {
  getToken() {
    return localStorage.getItem('banana_jwt_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('banana_jwt_token', token);
    } else {
      localStorage.removeItem('banana_jwt_token');
    }
  },

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async checkStatus() {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=status`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.loggedIn) {
        app.currentUser = data.user;
        this.renderUserUI();
      } else {
        app.currentUser = null;
        this.renderUserUI();
      }
    } catch (e) {
      console.warn('Status check failed:', e);
      app.currentUser = null;
      this.renderUserUI();
    }
  },

  renderUserUI() {
    const container = document.getElementById('authNavContainer');
    const heroBtn = document.getElementById('profileAuthBtn');
    const usernameEl = document.getElementById('profileUsername');
    const avatarEl = document.getElementById('profileAvatarIcon');
    const statusTextEl = document.getElementById('profileStatusText');

    if (!container) return;

    if (app.currentUser) {
      const avatar = app.currentUser.avatar || '🍌';
      container.innerHTML = `
        <div class="user-badge" id="headerUserBadge" title="View Profile">
          <span class="user-avatar-icon">${avatar}</span>
          <span>${app.currentUser.username}</span>
        </div>
        <button id="logoutBtn" class="btn btn-danger btn-sm" title="Sign Out">
          Log Out
        </button>
      `;

      const headerBadge = document.getElementById('headerUserBadge');
      if (headerBadge) {
        headerBadge.addEventListener('click', () => app.switchView('profile'));
      }
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }

      if (usernameEl) usernameEl.textContent = app.currentUser.username;
      if (avatarEl) avatarEl.textContent = avatar;
      if (statusTextEl) statusTextEl.textContent = 'Account active & sync enabled!';
      if (heroBtn) {
        heroBtn.textContent = 'Switch Avatar';
        heroBtn.onclick = () => {
          const panel = document.getElementById('avatarPickerPanel');
          if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
      }
    } else {
      container.innerHTML = `
        <button id="openAuthModalBtn" class="btn btn-primary btn-sm">
          <span>🔑</span> Login / Register
        </button>
      `;
      const openBtn = document.getElementById('openAuthModalBtn');
      if (openBtn) {
        openBtn.addEventListener('click', () => AuthManager.openModal());
      }

      if (usernameEl) usernameEl.textContent = 'Guest Player';
      if (avatarEl) avatarEl.textContent = '🍌';
      if (statusTextEl) statusTextEl.textContent = 'Log in to track your personal records, accuracy & achievements.';
      if (heroBtn) {
        heroBtn.textContent = 'Log In / Sign Up';
        heroBtn.onclick = () => AuthManager.openModal();
      }
    }
  },

  openModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.add('active');
    this.switchTab(tab);
  },

  closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
    const alertBox = document.getElementById('authAlert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'puzzle-feedback-card';
    }
  },

  switchTab(tab) {
    const loginBtn = document.getElementById('tabLoginBtn');
    const regBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('authModalTitle');

    if (tab === 'login') {
      loginBtn.classList.add('active');
      regBtn.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      title.textContent = 'Log In to Banana Arena';
    } else {
      regBtn.classList.add('active');
      loginBtn.classList.remove('active');
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      title.textContent = 'Create Banana Arena Account';
    }
  },

  async login(username, password) {
    const alertBox = document.getElementById('authAlert');
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        this.setToken(data.token);
        app.currentUser = data.user;
        this.renderUserUI();
        this.closeModal();
        showToast(data.message || 'Login successful!', 'success');
        ProfileManager.loadProfile();
        LeaderboardManager.loadLeaderboard();
        AchievementsManager.loadAchievements();
      } else {
        alertBox.textContent = data.message || 'Login failed.';
        alertBox.className = 'puzzle-feedback-card incorrect';
        alertBox.style.display = 'block';
      }
    } catch (e) {
      alertBox.textContent = 'Network or server error during login.';
      alertBox.className = 'puzzle-feedback-card incorrect';
      alertBox.style.display = 'block';
    }
  },

  async register(username, password, avatar) {
    const alertBox = document.getElementById('authAlert');
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, avatar })
      });
      const data = await res.json();
      if (data.success) {
        this.setToken(data.token);
        app.currentUser = data.user;
        this.renderUserUI();
        this.closeModal();
        showToast(data.message || 'Account created!', 'success');
        ProfileManager.loadProfile();
        LeaderboardManager.loadLeaderboard();
        AchievementsManager.loadAchievements();
      } else {
        alertBox.textContent = data.message || 'Registration failed.';
        alertBox.className = 'puzzle-feedback-card incorrect';
        alertBox.style.display = 'block';
      }
    } catch (e) {
      alertBox.textContent = 'Network or server error during registration.';
      alertBox.className = 'puzzle-feedback-card incorrect';
      alertBox.style.display = 'block';
    }
  },

  async updateAvatar(avatar) {
    if (!app.currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=update_avatar`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ avatar })
      });
      const data = await res.json();
      if (data.success) {
        app.currentUser.avatar = avatar;
        this.renderUserUI();
        showToast('Avatar updated!', 'success');
        const panel = document.getElementById('avatarPickerPanel');
        if (panel) panel.style.display = 'none';
      }
    } catch (e) {
      showToast('Could not update avatar.', 'error');
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth.php?action=logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
    } catch (e) {}
    this.setToken(null);
    app.currentUser = null;
    this.renderUserUI();
    showToast('Logged out successfully.', 'info');
    ProfileManager.loadProfile();
  }
};

// ===================================================================
// BANANA PUZZLE ARENA GAME ENGINE
// ===================================================================
const BananaGame = {
  mode: 'classic', // 'classic' | 'time_challenge' | 'practice'
  difficulty: 'medium', // 'easy' | 'medium' | 'hard'
  status: 'idle', // 'idle' | 'playing' | 'ended'

  sessionId: null,
  score: 0,
  lives: 3,
  maxLives: 3,
  puzzlesSolved: 0,
  puzzlesAttempted: 0,
  currentStreak: 0,
  highestStreak: 0,

  puzzleSecondsLeft: 30,
  overallSecondsLeft: 60,
  timerInterval: null,
  puzzleStartTime: 0,
  roundStartTime: 0,

  currentPuzzle: null,
  selectedAnswer: null,
  isSubmitting: false,
  canRetry: false,

  init() {
    this.bindLobbyControls();
    this.bindKeypad();
    this.bindGameplayActions();
  },

  bindLobbyControls() {
    // Mode Card Selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode') || 'classic';
        this.selectMode(mode);
      });
    });

    // Difficulty Radios
    const diffInputs = document.querySelectorAll('input[name="difficultySelect"]');
    diffInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.difficulty = e.target.value;
      });
    });

    // Start Button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startRound(this.mode, this.difficulty);
      });
    }
  },

  selectMode(mode) {
    this.mode = mode;
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      if (card.getAttribute('data-mode') === mode) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      const mConfig = MODE_CONFIG[mode] || MODE_CONFIG.classic;
      startBtn.innerHTML = `<span>🚀</span> Start ${mConfig.name}`;
    }
  },

  bindKeypad() {
    const keys = document.querySelectorAll('.keypad-btn');
    keys.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.status !== 'playing' || this.isSubmitting) return;
        const val = parseInt(btn.getAttribute('data-val'), 10);
        this.selectDigit(val);
      });
    });

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => {
      if (this.status !== 'playing' || this.isSubmitting) return;

      // Ignore if user is typing inside an input element (like modal)
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        const val = parseInt(e.key, 10);
        this.selectDigit(val);
      } else if (e.key === 'Enter') {
        if (this.selectedAnswer !== null) {
          e.preventDefault();
          this.submitAnswer();
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        this.clearSelection();
      }
    });

    // Clear Button
    const clearBtn = document.getElementById('clearAnswerBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }
  },

  bindGameplayActions() {
    // Submit Button
    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitAnswer());
    }

    // Skip Button
    const skipBtn = document.getElementById('skipPuzzleBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipPuzzle());
    }

    // Exit to Lobby Button
    const exitBtn = document.getElementById('exitToLobbyBtn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        if (this.status === 'playing') {
          if (this.score > 0 || this.puzzlesAttempted > 0) {
            if (confirm('Exit current game and return to lobby? Your progress so far will be saved.')) {
              this.endRound('exit');
            }
          } else {
            this.exitGame(false);
          }
        } else {
          this.showLobby();
        }
      });
    }

    // Forfeit / End Round Button
    const forfeitBtn = document.getElementById('forfeitRoundBtn');
    if (forfeitBtn) {
      forfeitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to end this game round? Your current score will be saved.')) {
          this.endRound('forfeit');
        }
      });
    }

    // Results Modal Buttons
    const againBtn = document.getElementById('resultsPlayAgainBtn');
    if (againBtn) {
      againBtn.addEventListener('click', () => {
        const modal = document.getElementById('resultsModal');
        if (modal) modal.classList.remove('active');
        this.startRound(this.mode, this.difficulty);
      });
    }

    const leadBtn = document.getElementById('resultsLeaderboardBtn');
    if (leadBtn) {
      leadBtn.addEventListener('click', () => {
        const modal = document.getElementById('resultsModal');
        if (modal) modal.classList.remove('active');
        app.switchView('leaderboard');
      });
    }

    const closeResBtn = document.getElementById('closeResultsModalBtn');
    if (closeResBtn) {
      closeResBtn.addEventListener('click', () => {
        const modal = document.getElementById('resultsModal');
        if (modal) modal.classList.remove('active');
        this.showLobby();
      });
    }
  },

  selectDigit(val) {
    this.selectedAnswer = val;
    app.sound.playKey();

    // Update keypad button styling
    const keys = document.querySelectorAll('.keypad-btn');
    keys.forEach(k => {
      if (parseInt(k.getAttribute('data-val'), 10) === val) {
        k.classList.add('active');
      } else {
        k.classList.remove('active');
      }
    });

    // Update preview number
    const preview = document.getElementById('selectedDigitPreview');
    if (preview) preview.textContent = val;

    // Enable submit button
    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) submitBtn.disabled = false;
  },

  clearSelection() {
    this.selectedAnswer = null;
    const keys = document.querySelectorAll('.keypad-btn');
    keys.forEach(k => k.classList.remove('active'));

    const preview = document.getElementById('selectedDigitPreview');
    if (preview) preview.textContent = '?';

    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) submitBtn.disabled = true;
  },

  async startRound(mode = 'classic', difficulty = 'medium') {
    this.mode = mode;
    this.difficulty = difficulty;
    this.status = 'playing';

    const diffConfig = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.medium;
    this.maxLives = diffConfig.lives;
    this.lives = this.maxLives;
    this.score = 0;
    this.puzzlesSolved = 0;
    this.puzzlesAttempted = 0;
    this.currentStreak = 0;
    this.highestStreak = 0;
    this.isSubmitting = false;
    this.canRetry = false;
    this.clearSelection();

    this.roundStartTime = Date.now();
    this.overallSecondsLeft = MODE_CONFIG.time_challenge.durationSeconds;
    this.puzzleSecondsLeft = diffConfig.timerSeconds;

    // Ensure viewArena section is active
    const arenaView = document.getElementById('viewArena');
    if (arenaView && !arenaView.classList.contains('active')) {
      document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
      arenaView.classList.add('active');
    }

    // Hide lobby, show active gameplay stage
    const lobby = document.getElementById('arenaLobby');
    const stage = document.getElementById('arenaGameplay');
    if (lobby) lobby.style.display = 'none';
    if (stage) stage.style.display = 'block';

    // Update HUD display
    this.updateHUD();

    // Call start_session API if authenticated
    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=start_session`, {
        method: 'POST',
        headers: AuthManager.getAuthHeaders(),
        body: JSON.stringify({
          game_mode: this.mode,
          difficulty: this.difficulty
        })
      });
      const data = await res.json();
      if (data.success && data.session_id) {
        this.sessionId = data.session_id;
      } else {
        this.sessionId = null;
      }
    } catch (e) {
      this.sessionId = null;
    }

    // Load first puzzle
    await this.loadPuzzle();

    // Start timer loop
    this.startTimer();
  },

  exitGame(saveCurrent = false) {
    clearInterval(this.timerInterval);
    this.status = 'idle';
    this.isSubmitting = false;

    if (saveCurrent && (this.score > 0 || this.puzzlesAttempted > 0)) {
      this.endRound('exit');
      return;
    }

    this.showLobby();
  },

  showLobby() {
    this.status = 'idle';
    clearInterval(this.timerInterval);
    const lobby = document.getElementById('arenaLobby');
    const stage = document.getElementById('arenaGameplay');
    if (lobby) lobby.style.display = 'block';
    if (stage) stage.style.display = 'none';

    // Reset timer visuals
    const progressBar = document.getElementById('timerProgressBar');
    if (progressBar) progressBar.style.width = '100%';
    const timerDisplay = document.getElementById('hudTimerDisplay');
    if (timerDisplay) timerDisplay.classList.remove('hud-danger');
  },

  updateHUD() {
    // Mode & Difficulty Pill
    const modeIconEl = document.getElementById('hudModeIcon');
    const modeNameEl = document.getElementById('hudModeName');
    const diffNameEl = document.getElementById('hudDifficultyName');

    const mConfig = MODE_CONFIG[this.mode] || MODE_CONFIG.classic;
    const dConfig = DIFFICULTY_RULES[this.difficulty] || DIFFICULTY_RULES.medium;

    if (modeIconEl) modeIconEl.textContent = mConfig.icon;
    if (modeNameEl) modeNameEl.textContent = mConfig.name;
    if (diffNameEl) diffNameEl.textContent = dConfig.name;

    // Score
    const scoreEl = document.getElementById('hudScoreDisplay');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

    // Solved
    const solvedEl = document.getElementById('hudSolvedDisplay');
    if (solvedEl) solvedEl.textContent = this.puzzlesSolved;

    // Streak
    const streakEl = document.getElementById('hudStreakDisplay');
    if (streakEl) {
      streakEl.textContent = `${this.currentStreak}x`;
      streakEl.style.color = this.currentStreak >= 3 ? '#facc15' : '#f97316';
    }

    // Lives
    const livesContainer = document.getElementById('hudLivesContainer');
    const livesIcons = document.getElementById('hudLivesIcons');
    if (mConfig.hasLives) {
      if (livesContainer) livesContainer.style.display = 'flex';
      if (livesIcons) {
        let heartsHtml = '';
        for (let i = 0; i < this.maxLives; i++) {
          if (i < this.lives) {
            heartsHtml += '<span class="heart-icon active">❤️</span>';
          } else {
            heartsHtml += '<span class="heart-icon lost">🖤</span>';
          }
        }
        livesIcons.innerHTML = heartsHtml;
      }
    } else {
      if (livesContainer) livesContainer.style.display = 'none';
    }

    // Timer display & label
    const timerContainer = document.getElementById('hudTimerContainer');
    const timerLabel = document.getElementById('hudTimerLabel');
    const timerDisplay = document.getElementById('hudTimerDisplay');

    if (mConfig.hasTimer) {
      if (timerContainer) timerContainer.style.display = 'flex';
      if (this.mode === 'time_challenge') {
        if (timerLabel) timerLabel.textContent = 'Challenge Clock';
        if (timerDisplay) timerDisplay.textContent = `${this.overallSecondsLeft}s`;
      } else {
        if (timerLabel) timerLabel.textContent = 'Puzzle Time';
        if (timerDisplay) timerDisplay.textContent = `${this.puzzleSecondsLeft}s`;
      }
    } else {
      if (timerContainer) timerContainer.style.display = 'none';
    }
  },

  startTimer() {
    clearInterval(this.timerInterval);

    const mConfig = MODE_CONFIG[this.mode] || MODE_CONFIG.classic;
    if (!mConfig.hasTimer) {
      const track = document.getElementById('timerProgressTrack');
      if (track) track.style.display = 'none';
      return;
    }

    const track = document.getElementById('timerProgressTrack');
    if (track) track.style.display = 'block';

    this.timerInterval = setInterval(() => {
      if (this.status !== 'playing' || this.isSubmitting) return;

      if (this.mode === 'time_challenge') {
        this.overallSecondsLeft--;
        this.updateTimerDisplay(this.overallSecondsLeft, MODE_CONFIG.time_challenge.durationSeconds);

        if (this.overallSecondsLeft <= 5 && this.overallSecondsLeft > 0) {
          app.sound.playTick();
        }

        if (this.overallSecondsLeft <= 0) {
          clearInterval(this.timerInterval);
          this.endRound('time_expired');
        }
      } else {
        // Classic mode countdown per puzzle
        const diffConfig = DIFFICULTY_RULES[this.difficulty] || DIFFICULTY_RULES.medium;
        this.puzzleSecondsLeft--;
        this.updateTimerDisplay(this.puzzleSecondsLeft, diffConfig.timerSeconds);

        if (this.puzzleSecondsLeft <= 5 && this.puzzleSecondsLeft > 0) {
          app.sound.playTick();
        }

        if (this.puzzleSecondsLeft <= 0) {
          this.handleTimeout();
        }
      }
    }, 1000);
  },

  updateTimerDisplay(current, max) {
    const timerDisplay = document.getElementById('hudTimerDisplay');
    const progressBar = document.getElementById('timerProgressBar');

    if (timerDisplay) {
      timerDisplay.textContent = `${current}s`;
      if (current <= 5) {
        timerDisplay.classList.add('hud-danger');
      } else {
        timerDisplay.classList.remove('hud-danger');
      }
    }

    if (progressBar) {
      const pct = Math.max(0, Math.min(100, (current / max) * 100));
      progressBar.style.width = `${pct}%`;
      if (current <= 5) {
        progressBar.style.background = '#ef4444';
      } else if (current <= 15) {
        progressBar.style.background = 'linear-gradient(90deg, #facc15 0%, #ef4444 100%)';
      } else {
        progressBar.style.background = 'linear-gradient(90deg, #10b981 0%, #facc15 60%, #ef4444 100%)';
      }
    }
  },

  async handleTimeout() {
    this.isSubmitting = true;
    app.sound.playIncorrect();
    this.currentStreak = 0;
    this.puzzlesAttempted++;

    const feedback = document.getElementById('puzzleFeedback');
    if (feedback) {
      feedback.textContent = `⏰ Time's up! You took too long on this puzzle.`;
      feedback.className = 'puzzle-feedback-card incorrect';
    }

    const mConfig = MODE_CONFIG[this.mode] || MODE_CONFIG.classic;
    if (mConfig.hasLives) {
      this.lives--;
      this.updateHUD();

      if (this.lives <= 0) {
        setTimeout(() => this.endRound('lives_exhausted'), 1200);
        return;
      }
    }

    setTimeout(() => {
      this.loadPuzzle();
    }, 1400);
  },

  async loadPuzzle() {
    const loadingState = document.getElementById('puzzleLoadingState');
    const puzzleImg = document.getElementById('puzzleImg');
    const feedback = document.getElementById('puzzleFeedback');
    const counterPill = document.getElementById('puzzleCounterPill');
    const sourcePill = document.getElementById('puzzleSourcePill');

    this.clearSelection();
    this.isSubmitting = false;

    if (feedback) {
      feedback.style.display = 'none';
      feedback.className = 'puzzle-feedback-card';
    }

    if (counterPill) {
      counterPill.textContent = `Puzzle #${this.puzzlesAttempted + 1}`;
    }

    if (loadingState) loadingState.style.display = 'flex';
    if (puzzleImg) puzzleImg.style.display = 'none';

    // Reset puzzle countdown for Classic
    const diffConfig = DIFFICULTY_RULES[this.difficulty] || DIFFICULTY_RULES.medium;
    this.puzzleSecondsLeft = diffConfig.timerSeconds;
    this.updateHUD();

    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=get`, {
        headers: AuthManager.getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.question) {
        this.currentPuzzle = data;
        this.puzzleStartTime = Date.now();

        // Render puzzle image directly on element with fallback
        if (puzzleImg) {
          let resolved = false;
          const showImg = () => {
            if (resolved) return;
            resolved = true;
            puzzleImg.style.display = 'block';
            if (loadingState) loadingState.style.display = 'none';
          };

          puzzleImg.onload = showImg;
          puzzleImg.onerror = showImg;
          puzzleImg.src = data.question;

          if (puzzleImg.complete) {
            showImg();
          }
          setTimeout(showImg, 3000);
        }

        if (sourcePill) {
          sourcePill.innerHTML = data.is_fallback 
            ? '<span>🛡️</span> Offline Challenge' 
            : '<span>🌐</span> Banana API Connected';
        }
      } else {
        throw new Error('Failed to load puzzle');
      }
    } catch (e) {
      showToast('Could not fetch puzzle. Retrying...', 'error');
      setTimeout(() => this.loadPuzzle(), 2000);
    }
  },

  async submitAnswer() {
    if (this.selectedAnswer === null || this.isSubmitting || !this.currentPuzzle) return;

    this.isSubmitting = true;
    const timeTaken = Math.max(0.2, (Date.now() - this.puzzleStartTime) / 1000);
    const feedback = document.getElementById('puzzleFeedback');
    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=verify`, {
        method: 'POST',
        headers: AuthManager.getAuthHeaders(),
        body: JSON.stringify({
          answer: this.selectedAnswer,
          puzzle_id: this.currentPuzzle.puzzle_id,
          session_id: this.sessionId,
          difficulty: this.difficulty,
          game_mode: this.mode,
          time_taken: timeTaken,
          current_streak: this.currentStreak
        })
      });
      const data = await res.json();

      if (data.success) {
        this.puzzlesAttempted++;

        if (data.correct) {
          app.sound.playCorrect();
          this.puzzlesSolved++;
          this.score += data.points_earned;
          this.currentStreak = data.new_streak;
          if (this.currentStreak > this.highestStreak) {
            this.highestStreak = this.currentStreak;
          }

          // Streak fanfare
          if (this.currentStreak >= 3) {
            app.confetti.burst(35);
          }

          // Time bonus for Time Challenge mode
          if (this.mode === 'time_challenge') {
            this.overallSecondsLeft = Math.min(120, this.overallSecondsLeft + 5);
            showToast('+5 Seconds Added! ⚡', 'success', 2000);
          }

          if (feedback) {
            feedback.innerHTML = `🍌 <strong>Correct!</strong> +${data.points_earned} points! ` +
              (data.speed_bonus > 0 ? `<small>(⚡ Speed Bonus: +${data.speed_bonus} pts)</small> ` : '') +
              (this.currentStreak > 1 ? `<span style="color:#fde047">🔥 ${this.currentStreak}x Combo!</span>` : '');
            feedback.className = 'puzzle-feedback-card correct';
            feedback.style.display = 'block';
          }

          // Awarded in-game achievements celebration
          if (data.new_achievements && data.new_achievements.length > 0) {
            data.new_achievements.forEach(ach => {
              showToast(`🏆 Achievement Unlocked: ${ach.title}!`, 'success', 4000);
              app.confetti.burst(60);
            });
          }

          this.updateHUD();

          setTimeout(() => {
            this.loadPuzzle();
          }, 1100);

        } else {
          app.sound.playIncorrect();
          this.currentStreak = 0;

          if (data.can_retry) {
            this.isSubmitting = false;
            if (submitBtn) submitBtn.disabled = false;
            if (feedback) {
              feedback.innerHTML = `❌ <strong>Not quite!</strong> ${data.message}`;
              feedback.className = 'puzzle-feedback-card incorrect';
              feedback.style.display = 'block';
            }
            this.updateHUD();
            return;
          }

          // Incorrect and no retry
          const mConfig = MODE_CONFIG[this.mode] || MODE_CONFIG.classic;
          if (mConfig.hasLives) {
            this.lives--;
          }

          if (feedback) {
            feedback.innerHTML = `❌ <strong>Incorrect!</strong> The correct digit was <strong>${data.correct_solution}</strong>.`;
            feedback.className = 'puzzle-feedback-card incorrect';
            feedback.style.display = 'block';
          }

          this.updateHUD();

          if (mConfig.hasLives && this.lives <= 0) {
            setTimeout(() => {
              this.endRound('lives_exhausted');
            }, 1400);
            return;
          }

          setTimeout(() => {
            this.loadPuzzle();
          }, 1400);
        }
      } else {
        showToast(data.message || 'Verification error.', 'error');
        this.isSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    } catch (e) {
      showToast('Network error verifying answer.', 'error');
      this.isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  skipPuzzle() {
    if (this.status !== 'playing' || this.isSubmitting) return;

    if (this.mode === 'practice') {
      showToast('Skipping puzzle...', 'info');
      this.loadPuzzle();
      return;
    }

    if (confirm('Skipping this puzzle will reset your streak and count as an incorrect attempt. Continue?')) {
      this.currentStreak = 0;
      this.puzzlesAttempted++;

      const mConfig = MODE_CONFIG[this.mode] || MODE_CONFIG.classic;
      if (mConfig.hasLives) {
        this.lives--;
        this.updateHUD();
        if (this.lives <= 0) {
          this.endRound('lives_exhausted');
          return;
        }
      }
      this.loadPuzzle();
    }
  },

  async endRound(reason = 'completed') {
    this.status = 'ended';
    clearInterval(this.timerInterval);

    const durationSeconds = Math.max(1, Math.round((Date.now() - this.roundStartTime) / 1000));
    const accuracy = this.puzzlesAttempted > 0 
      ? Math.round((this.puzzlesSolved / this.puzzlesAttempted) * 100) 
      : 0;

    let finalRank = 1;
    let unlockedAchievements = [];

    // Save final stats to backend
    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=end_session`, {
        method: 'POST',
        headers: AuthManager.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.sessionId,
          score: this.score,
          puzzles_solved: this.puzzlesSolved,
          puzzles_attempted: this.puzzlesAttempted,
          highest_streak: this.highestStreak,
          duration_seconds: durationSeconds,
          game_mode: this.mode,
          difficulty: this.difficulty
        })
      });
      const data = await res.json();
      if (data.success) {
        finalRank = data.rank || 1;
        unlockedAchievements = data.new_achievements || [];
      }
    } catch (e) {
      console.warn('Failed to finalize session on server:', e);
    }

    // Play victory sound & confetti if score > 300
    if (this.score > 0) {
      app.sound.playVictory();
      app.confetti.burst(100);
    }

    // Show Results Modal
    this.showResultsModal({
      reason,
      score: this.score,
      solved: this.puzzlesSolved,
      attempted: this.puzzlesAttempted,
      accuracy,
      streak: this.highestStreak,
      duration: durationSeconds,
      rank: finalRank,
      achievements: unlockedAchievements
    });

    // Refresh leaderboard & profile in background
    LeaderboardManager.loadLeaderboard();
    if (app.currentUser) {
      ProfileManager.loadProfile();
      AchievementsManager.loadAchievements();
    }
  },

  showResultsModal(results) {
    const modal = document.getElementById('resultsModal');
    if (!modal) return;

    const heroIcon = document.getElementById('resultsHeroIcon');
    const title = document.getElementById('resultsTitle');
    const subtitle = document.getElementById('resultsSubtitle');

    if (results.reason === 'lives_exhausted') {
      if (heroIcon) heroIcon.textContent = '💔';
      if (title) title.textContent = 'Lives Exhausted!';
      if (subtitle) subtitle.textContent = 'You fought well, but ran out of attempts.';
    } else if (results.reason === 'time_expired') {
      if (heroIcon) heroIcon.textContent = '⏱️';
      if (title) title.textContent = 'Time Challenge Complete!';
      if (subtitle) subtitle.textContent = `You solved ${results.solved} puzzles in 60 frantic seconds!`;
    } else if (results.reason === 'exit' || results.reason === 'forfeit') {
      if (heroIcon) heroIcon.textContent = '🏁';
      if (title) title.textContent = 'Round Finished!';
      if (subtitle) subtitle.textContent = `You finished with ${results.solved} solved puzzles and ${results.score.toLocaleString()} points.`;
    } else {
      if (heroIcon) heroIcon.textContent = '🏆';
      if (title) title.textContent = 'Round Completed!';
      if (subtitle) subtitle.textContent = 'Great mental agility and math skills!';
    }

    const scoreEl = document.getElementById('resultsScore');
    const solvedEl = document.getElementById('resultsSolved');
    const accuracyEl = document.getElementById('resultsAccuracy');
    const streakEl = document.getElementById('resultsStreak');
    const timeEl = document.getElementById('resultsTime');
    const rankEl = document.getElementById('resultsRank');

    if (scoreEl) scoreEl.textContent = results.score.toLocaleString();
    if (solvedEl) solvedEl.textContent = `${results.solved} / ${results.attempted}`;
    if (accuracyEl) accuracyEl.textContent = `${results.accuracy}%`;
    if (streakEl) streakEl.textContent = `${results.streak}x`;
    
    const minutes = Math.floor(results.duration / 60).toString().padStart(2, '0');
    const seconds = (results.duration % 60).toString().padStart(2, '0');
    if (timeEl) timeEl.textContent = `${minutes}:${seconds}`;

    if (rankEl) rankEl.textContent = `#${results.rank}`;

    // Show newly unlocked achievements
    const achSection = document.getElementById('resultsAchievementsSection');
    const achList = document.getElementById('resultsAchievementsList');
    if (achSection && achList) {
      if (results.achievements && results.achievements.length > 0) {
        achSection.style.display = 'block';
        achList.innerHTML = results.achievements.map(a => `
          <div class="results-achieve-item">
            <span>${a.icon}</span>
            <span><strong>${a.title}</strong> &bull; +${a.points_reward} pts</span>
          </div>
        `).join('');
      } else {
        achSection.style.display = 'none';
      }
    }

    const saveStatus = document.getElementById('resultsSaveStatus');
    if (saveStatus) {
      if (app.currentUser) {
        saveStatus.innerHTML = `✅ Saved to player account <strong>${app.currentUser.username}</strong>!`;
      } else {
        saveStatus.innerHTML = `💡 Want to keep your scores & unlock badges? <a href="#" id="saveScorePromptLink" style="color:var(--banana-yellow); font-weight:700;">Create a free account!</a>`;
        const link = document.getElementById('saveScorePromptLink');
        if (link) {
          link.onclick = (e) => {
            e.preventDefault();
            AuthManager.openModal('register');
          };
        }
      }
    }

    modal.classList.add('active');
  }
};

// ===================================================================
// LEADERBOARD MANAGER
// ===================================================================
const LeaderboardManager = {
  init() {
    const refreshBtn = document.getElementById('refreshLeaderboardBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadLeaderboard());
    }

    const modeSelect = document.getElementById('filterModeSelect');
    if (modeSelect) {
      modeSelect.addEventListener('change', () => this.loadLeaderboard());
    }

    const diffSelect = document.getElementById('filterDifficultySelect');
    if (diffSelect) {
      diffSelect.addEventListener('change', () => this.loadLeaderboard());
    }
  },

  async loadLeaderboard() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;

    const modeSelect = document.getElementById('filterModeSelect');
    const diffSelect = document.getElementById('filterDifficultySelect');
    const mode = modeSelect ? modeSelect.value : 'all';
    const diff = diffSelect ? diffSelect.value : 'all';

    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="spinner" style="margin: 0 auto 12px;"></div>
          Loading rankings...
        </td>
      </tr>
    `;

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=leaderboard&mode=${encodeURIComponent(mode)}&difficulty=${encodeURIComponent(diff)}`, {
        headers: AuthManager.getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.leaderboard && data.leaderboard.length > 0) {
        tbody.innerHTML = data.leaderboard.map(row => {
          const rankBadge = row.rank <= 3 
            ? `<span class="rank-badge rank-${row.rank}">${row.rank}</span>` 
            : `<span style="font-weight:700; color:#94a3b8;">#${row.rank}</span>`;

          const isUser = row.is_current_user ? 'current-user-row' : '';
          const userTag = row.is_current_user ? '<span class="current-user-tag">You</span>' : '';
          const minutes = Math.floor(row.completion_time / 60).toString().padStart(2, '0');
          const seconds = (row.completion_time % 60).toString().padStart(2, '0');
          const formattedDate = row.played_at ? row.played_at.substring(0, 10) : '';

          return `
            <tr class="${isUser}">
              <td>${rankBadge}</td>
              <td>
                <div class="player-cell">
                  <span style="font-size:1.3rem;">${row.avatar || '🍌'}</span>
                  <span>${row.username}</span>
                  ${userTag}
                </div>
              </td>
              <td class="score-cell">${parseInt(row.score, 10).toLocaleString()}</td>
              <td style="text-transform: capitalize;">${row.game_mode.replace('_', ' ')}</td>
              <td style="text-transform: capitalize;">${row.difficulty}</td>
              <td><strong>${row.puzzles_solved}</strong></td>
              <td>${parseFloat(row.accuracy).toFixed(0)}%</td>
              <td>${minutes}:${seconds}</td>
              <td style="color:#94a3b8; font-size:0.85rem;">${formattedDate}</td>
            </tr>
          `;
        }).join('');
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:30px; color:#94a3b8;">
              🍌 No scores recorded yet for these filters. Be the first to place on the leaderboard!
            </td>
          </tr>
        `;
      }
    } catch (e) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:20px; color:#f87171;">
            Failed to load leaderboard. Please check your connection.
          </td>
        </tr>
      `;
    }
  }
};

// ===================================================================
// ACHIEVEMENTS MANAGER
// ===================================================================
const AchievementsManager = {
  async loadAchievements() {
    const grid = document.getElementById('achievementsGrid');
    const pill = document.getElementById('achievementsProgressPill');
    if (!grid) return;

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=achievements`, {
        headers: AuthManager.getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.achievements) {
        let unlockedCount = 0;
        grid.innerHTML = data.achievements.map(ach => {
          if (ach.is_unlocked) unlockedCount++;
          const statusClass = ach.is_unlocked ? 'unlocked' : 'locked';
          const statusLabel = ach.is_unlocked 
            ? `<span class="achievement-status-tag">✨ Unlocked</span>` 
            : `<span style="font-size:0.75rem; color:#64748b;">🔒 Locked</span>`;

          return `
            <div class="achievement-card ${statusClass}">
              <div class="achievement-icon">${ach.icon || '🏆'}</div>
              <div class="achievement-body">
                <h4>${ach.title}</h4>
                <p>${ach.description}</p>
                <div>
                  <span class="achievement-badge-pts">+${ach.points_reward} pts</span>
                  ${statusLabel}
                </div>
              </div>
            </div>
          `;
        }).join('');

        if (pill) {
          pill.textContent = `Unlocked: ${unlockedCount} / ${data.achievements.length}`;
        }
      }
    } catch (e) {
      grid.innerHTML = `<div class="empty-state" style="color:#f87171;">Failed to load achievements.</div>`;
    }
  }
};

// ===================================================================
// PROFILE & STATS MANAGER
// ===================================================================
const ProfileManager = {
  init() {
    // Avatar options click
    const optButtons = document.querySelectorAll('.avatar-opt-btn');
    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const avatar = btn.getAttribute('data-avatar');
        if (btn.closest('#regAvatarGrid')) {
          // In register form
          document.querySelectorAll('#regAvatarGrid .avatar-opt-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const hiddenInput = document.getElementById('registerAvatar');
          if (hiddenInput) hiddenInput.value = avatar;
        } else {
          // Direct user profile update
          optButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          AuthManager.updateAvatar(avatar);
        }
      });
    });

    const heroAvatar = document.getElementById('profileAvatarIcon');
    if (heroAvatar) {
      heroAvatar.addEventListener('click', () => {
        const panel = document.getElementById('avatarPickerPanel');
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }
  },

  async loadProfile() {
    if (!app.currentUser) {
      const historyTbody = document.getElementById('userHistoryTableBody');
      if (historyTbody) {
        historyTbody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-state">
              Log in to see your personal match history and records!
            </td>
          </tr>
        `;
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=user_stats`, {
        headers: AuthManager.getAuthHeaders()
      });
      const data = await res.json();

      if (data.success) {
        // Summary stats
        const totalGamesEl = document.getElementById('userTotalGames');
        const bestScoreEl = document.getElementById('userBestScore');
        const totalSolvedEl = document.getElementById('userTotalSolved');
        const accuracyEl = document.getElementById('userAccuracy');
        const bestStreakEl = document.getElementById('userBestStreak');
        const fastestEl = document.getElementById('userFastestTime');
        const rankBadge = document.getElementById('profileRankBadge');

        if (totalGamesEl) totalGamesEl.textContent = data.stats.total_games;
        if (bestScoreEl) bestScoreEl.textContent = data.stats.best_score.toLocaleString();
        if (totalSolvedEl) totalSolvedEl.textContent = data.stats.total_puzzles_solved;
        if (accuracyEl) accuracyEl.textContent = `${data.stats.overall_accuracy}%`;
        if (bestStreakEl) bestStreakEl.textContent = `${data.stats.best_streak}x`;

        if (fastestEl) {
          if (data.stats.fastest_time !== null) {
            const m = Math.floor(data.stats.fastest_time / 60).toString().padStart(2, '0');
            const s = (data.stats.fastest_time % 60).toString().padStart(2, '0');
            fastestEl.textContent = `${m}:${s}`;
          } else {
            fastestEl.textContent = '--:--';
          }
        }

        // Rank Title based on total solved
        if (rankBadge) {
          const solved = data.stats.total_puzzles_solved;
          if (solved >= 50) rankBadge.textContent = '🍌 Banana Einstein';
          else if (solved >= 25) rankBadge.textContent = '👑 Tropical Grandmaster';
          else if (solved >= 10) rankBadge.textContent = '🌴 Math Adventurer';
          else if (solved >= 1) rankBadge.textContent = '🐵 Banana Apprentice';
          else rankBadge.textContent = '🌱 Banana Novice';
        }

        // Render Match History Table
        const historyTbody = document.getElementById('userHistoryTableBody');
        if (historyTbody) {
          if (data.history && data.history.length > 0) {
            historyTbody.innerHTML = data.history.map((row, idx) => {
              const minutes = Math.floor(row.completion_time / 60).toString().padStart(2, '0');
              const seconds = (row.completion_time % 60).toString().padStart(2, '0');
              const dateStr = row.played_at ? row.played_at.substring(0, 10) : '';

              return `
                <tr>
                  <td>#${data.history.length - idx}</td>
                  <td style="text-transform: capitalize;">${row.game_mode.replace('_', ' ')}</td>
                  <td style="text-transform: capitalize;">${row.difficulty}</td>
                  <td class="score-cell">${parseInt(row.score, 10).toLocaleString()}</td>
                  <td><strong>${row.puzzles_solved}</strong></td>
                  <td>${parseFloat(row.accuracy).toFixed(0)}%</td>
                  <td>${minutes}:${seconds}</td>
                  <td style="color:#94a3b8; font-size:0.85rem;">${dateStr}</td>
                </tr>
              `;
            }).join('');
          } else {
            historyTbody.innerHTML = `
              <tr>
                <td colspan="8" class="empty-state">
                  No games played yet. Jump into the Banana Arena and start solving!
                </td>
              </tr>
            `;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load user profile stats:', e);
    }
  }
};

// ===================================================================
// ROOT APPLICATION CONTROLLER
// ===================================================================
const app = {
  sound: new SoundManager(),
  confetti: new ConfettiSystem('confettiCanvas'),
  currentUser: null,

  init() {
    this.bindNavigation();
    this.bindSoundToggle();
    this.bindAuthModals();

    BananaGame.init();
    LeaderboardManager.init();
    ProfileManager.init();

    // Check user authentication
    AuthManager.checkStatus().then(() => {
      LeaderboardManager.loadLeaderboard();
      AchievementsManager.loadAchievements();
      ProfileManager.loadProfile();
    });
  },

  switchView(viewName) {
    // Stop and exit any running game timer when switching views or navigating away
    if (BananaGame.status === 'playing') {
      BananaGame.exitGame(false);
    }

    const sections = document.querySelectorAll('.view-section');
    sections.forEach(s => s.classList.remove('active'));

    const navTabs = document.querySelectorAll('.nav-tab-btn');
    navTabs.forEach(t => t.classList.remove('active'));

    const activeTab = document.querySelector(`.nav-tab-btn[data-view="${viewName}"]`);
    if (activeTab) activeTab.classList.add('active');

    if (viewName === 'arena') {
      const target = document.getElementById('viewArena');
      if (target) target.classList.add('active');
      BananaGame.showLobby();
    } else if (viewName === 'time_challenge') {
      const target = document.getElementById('viewArena');
      if (target) target.classList.add('active');
      // Select Time Challenge in lobby, do NOT automatically start - let player click Play!
      BananaGame.selectMode('time_challenge');
      BananaGame.showLobby();
      const timeCard = document.querySelector('.mode-card[data-mode="time_challenge"]');
      if (timeCard) timeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (viewName === 'leaderboard') {
      const target = document.getElementById('viewLeaderboard');
      if (target) target.classList.add('active');
      LeaderboardManager.loadLeaderboard();
    } else if (viewName === 'achievements') {
      const target = document.getElementById('viewAchievements');
      if (target) target.classList.add('active');
      AchievementsManager.loadAchievements();
    } else if (viewName === 'profile') {
      const target = document.getElementById('viewProfile');
      if (target) target.classList.add('active');
      ProfileManager.loadProfile();
    }
  },

  bindNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab-btn');
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.switchView(view);
      });
    });

    const brandHome = document.getElementById('brandHomeBtn');
    if (brandHome) {
      brandHome.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView('arena');
      });
    }
  },

  bindSoundToggle() {
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.textContent = this.sound.enabled ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        const isEnabled = this.sound.toggle();
        soundBtn.textContent = isEnabled ? '🔊' : '🔇';
        showToast(isEnabled ? 'Sound effects turned ON' : 'Sound effects muted', 'info', 1800);
      });
    }
  },

  bindAuthModals() {
    const closeBtn = document.getElementById('closeAuthModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => AuthManager.closeModal());
    }

    const modalBackdrop = document.getElementById('authModal');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) AuthManager.closeModal();
      });
    }

    const tabLogin = document.getElementById('tabLoginBtn');
    const tabReg = document.getElementById('tabRegisterBtn');
    if (tabLogin) tabLogin.addEventListener('click', () => AuthManager.switchTab('login'));
    if (tabReg) tabReg.addEventListener('click', () => AuthManager.switchTab('register'));

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        AuthManager.login(username, password);
      });
    }

    // Register Form Submit
    const regForm = document.getElementById('registerForm');
    if (regForm) {
      regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirmPassword').value;
        const avatar = document.getElementById('registerAvatar').value || '🍌';

        if (password !== confirm) {
          const alertBox = document.getElementById('authAlert');
          alertBox.textContent = 'Passwords do not match.';
          alertBox.className = 'puzzle-feedback-card incorrect';
          alertBox.style.display = 'block';
          return;
        }

        AuthManager.register(username, password, avatar);
      });
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
