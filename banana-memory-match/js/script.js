/**
 * BANANA MEMORY MATCH
 * Complete Frontend Application Logic
 * Features: Authentication, Memory Game, Banana API Integration, Leaderboard, Web Audio
 */

'use strict';

// ===================================================================
// CONSTANTS & CONFIGURATION
// ===================================================================
const API_BASE = 'api';

const CARD_DATA = [
  { id: 'banana', name: 'Banana', emoji: '🍌' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵' },
  { id: 'palm', name: 'Palm Tree', emoji: '🌴' },
  { id: 'coconut', name: 'Coconut', emoji: '🥥' },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍' },
  { id: 'smoothie', name: 'Smoothie', emoji: '🍹' },
  { id: 'split', name: 'Banana Split', emoji: '🍨' },
  { id: 'bread', name: 'Banana Bread', emoji: '🍰' },
  { id: 'mango', name: 'Mango', emoji: '🥭' },
  { id: 'toucan', name: 'Toucan', emoji: '🦜' },
  { id: 'flower', name: 'Hibiscus', emoji: '🌺' },
  { id: 'island', name: 'Island', emoji: '🏖️' }
];

const DIFFICULTY_MAP = {
  easy: { pairs: 6, cols: 4, gridClass: 'grid-easy' },
  medium: { pairs: 8, cols: 4, gridClass: 'grid-medium' },
  hard: { pairs: 12, cols: 6, gridClass: 'grid-hard' }
};

// ===================================================================
// SOUND MANAGER (Web Audio API Synthesizer)
// ===================================================================
class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('banana_sound') !== 'false';
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
    localStorage.setItem('banana_sound', this.enabled ? 'true' : 'false');
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

  playFlip() {
    this.playTone(480, 'triangle', 0.08, 0.08);
  }

  playMatch() {
    // Cheerful arpeggio chord
    this.playTone(523.25, 'triangle', 0.25, 0.12, 0.00); // C5
    this.playTone(659.25, 'triangle', 0.25, 0.12, 0.08); // E5
    this.playTone(783.99, 'triangle', 0.30, 0.12, 0.16); // G5
    this.playTone(1046.50, 'triangle', 0.40, 0.14, 0.24); // C6
  }

  playMismatch() {
    this.playTone(320, 'sawtooth', 0.18, 0.06, 0.00);
    this.playTone(260, 'sawtooth', 0.22, 0.06, 0.10);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.4, 0.15, i * 0.12);
    });
    this.playTone(1318.51, 'triangle', 0.8, 0.18, 0.55);
  }

  playBonusCorrect() {
    this.playTone(880, 'triangle', 0.2, 0.15, 0.00);
    this.playTone(1174.66, 'triangle', 0.2, 0.15, 0.08);
    this.playTone(1760, 'triangle', 0.5, 0.18, 0.16);
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
    this.colors = ['#facc15', '#eab308', '#10b981', '#f43f5e', '#38bdf8', '#fb923c'];

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
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
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
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // air resistance
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
// APPLICATION STATE
// ===================================================================
const app = {
  sound: new SoundManager(),
  confetti: new ConfettiSystem('confettiCanvas'),
  currentUser: null,

  game: {
    status: 'idle', // 'idle' | 'playing' | 'won'
    difficulty: 'medium',
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 8,
    moves: 0,
    timerSeconds: 0,
    timerInterval: null,
    isLocked: false,
    baseScore: 1000,
    bonusEarned: 0,
    finalScore: 0,
    scoreSaved: false
  },

  puzzle: {
    selectedAnswer: null,
    activeQuestion: null,
    isLoading: false
  }
};

// ===================================================================
// AUTHENTICATION MODULE
// ===================================================================
const AuthManager = {
  async checkSession() {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=status`);
      const data = await res.json();
      if (data.success && data.loggedIn) {
        app.currentUser = data.user;
      } else {
        app.currentUser = null;
      }
      this.updateUI();
    } catch (err) {
      console.error('Session check failed:', err);
      app.currentUser = null;
      this.updateUI();
    }
  },

  async login(username, password) {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        app.currentUser = data.user;
        this.updateUI();
        UIManager.closeModal('authModal');
        showToast(data.message || 'Logged in successfully!', 'success');
        ScoreManager.loadLeaderboard();
        ScoreManager.loadUserHistory();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server communication error. Please try again.' };
    }
  },

  async register(username, password) {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        app.currentUser = data.user;
        this.updateUI();
        UIManager.closeModal('authModal');
        showToast(data.message || 'Account created successfully!', 'success');
        ScoreManager.loadLeaderboard();
        ScoreManager.loadUserHistory();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server communication error. Please try again.' };
    }
  },

  async logout() {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=logout`, { method: 'POST' });
      const data = await res.json();
      app.currentUser = null;
      this.updateUI();
      showToast('You have logged out.', 'info');
      ScoreManager.loadLeaderboard();
      ScoreManager.loadUserHistory();
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  updateUI() {
    const navContainer = document.getElementById('authNavContainer');
    const profileUsername = document.getElementById('profileUsername');
    const profileStatusText = document.getElementById('profileStatusText');
    const profileHeroActions = document.getElementById('profileHeroActions');

    if (app.currentUser) {
      // Header Nav
      navContainer.innerHTML = `
        <div class="user-badge" title="Logged in as ${escapeHtml(app.currentUser.username)}">
          <span class="user-avatar-icon">👤</span>
          <span>${escapeHtml(app.currentUser.username)}</span>
        </div>
        <button id="logoutBtn" class="btn btn-danger-outline btn-sm">Log Out</button>
      `;
      document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

      // Profile Page
      if (profileUsername) profileUsername.textContent = app.currentUser.username;
      if (profileStatusText) profileStatusText.textContent = 'Account active & verified. Track your stats below.';
      if (profileHeroActions) {
        profileHeroActions.innerHTML = `
          <button id="profileLogoutBtn" class="btn btn-secondary btn-sm">Log Out</button>
        `;
        document.getElementById('profileLogoutBtn')?.addEventListener('click', () => this.logout());
      }
    } else {
      // Header Nav
      navContainer.innerHTML = `
        <button id="openAuthModalBtn" class="btn btn-primary btn-sm">
          <span>🔑</span> Log In / Sign Up
        </button>
      `;
      document.getElementById('openAuthModalBtn')?.addEventListener('click', () => UIManager.openModal('authModal'));

      // Profile Page
      if (profileUsername) profileUsername.textContent = 'Guest Player';
      if (profileStatusText) profileStatusText.textContent = 'Log in or create an account to record your scores permanently.';
      if (profileHeroActions) {
        profileHeroActions.innerHTML = `
          <button id="profileLoginBtn" class="btn btn-primary btn-sm">Log In / Sign Up</button>
        `;
        document.getElementById('profileLoginBtn')?.addEventListener('click', () => UIManager.openModal('authModal'));
      }
    }
  }
};

// ===================================================================
// MEMORY GAME MODULE
// ===================================================================
const GameManager = {
  init() {
    const diffSelect = document.getElementById('difficultySelect');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        app.game.difficulty = e.target.value;
        this.startNewGame();
      });
    }

    const restartBtn = document.getElementById('restartGameBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        app.sound.init();
        this.startNewGame();
      });
    }

    this.startNewGame();
  },

  startNewGame() {
    this.stopTimer();

    const diffConfig = DIFFICULTY_MAP[app.game.difficulty] || DIFFICULTY_MAP.medium;
    app.game.totalPairs = diffConfig.pairs;
    app.game.matchedPairs = 0;
    app.game.moves = 0;
    app.game.timerSeconds = 0;
    app.game.status = 'idle';
    app.game.flippedCards = [];
    app.game.isLocked = false;
    app.game.bonusEarned = 0;
    app.game.scoreSaved = false;

    this.updateStatsUI();
    this.buildBoard(diffConfig);
  },

  buildBoard(diffConfig) {
    const board = document.getElementById('memoryBoard');
    if (!board) return;

    // Set grid class
    board.className = `memory-board ${diffConfig.gridClass}`;
    board.innerHTML = '';

    // Pick pairs from CARD_DATA
    const selectedPairs = CARD_DATA.slice(0, diffConfig.pairs);
    
    // Create card pair array (2 of each)
    let cardDeck = [];
    selectedPairs.forEach((item) => {
      cardDeck.push({ pairId: item.id, name: item.name, emoji: item.emoji, image: item.image });
      cardDeck.push({ pairId: item.id, name: item.name, emoji: item.emoji, image: item.image });
    });

    // Fisher-Yates Shuffle
    for (let i = cardDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardDeck[i], cardDeck[j]] = [cardDeck[j], cardDeck[i]];
    }

    app.game.cards = cardDeck.map((c, index) => ({
      ...c,
      index,
      flipped: false,
      matched: false
    }));

    // Render cards
    app.game.cards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'memory-card';
      cardEl.dataset.index = index;

      const visualHtml = card.image
        ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}" class="card-img">`
        : `<span class="card-emoji">${card.emoji || '🍌'}</span>`;

      cardEl.innerHTML = `
        <div class="card-face card-back">
          <div class="card-back-pattern"></div>
          <span class="card-back-icon">🍌</span>
        </div>
        <div class="card-face card-front">
          ${visualHtml}
          <span class="card-name">${escapeHtml(card.name)}</span>
        </div>
      `;

      cardEl.addEventListener('click', () => this.handleCardClick(index, cardEl));
      board.appendChild(cardEl);
    });
  },

  handleCardClick(index, cardEl) {
    app.sound.init();

    if (app.game.isLocked) return;

    const card = app.game.cards[index];
    if (!card || card.flipped || card.matched) return;

    // Start timer on first move
    if (app.game.status === 'idle') {
      app.game.status = 'playing';
      this.startTimer();
    }

    // Flip card
    card.flipped = true;
    cardEl.classList.add('flipped');
    app.sound.playFlip();

    app.game.flippedCards.push({ card, el: cardEl });

    if (app.game.flippedCards.length === 2) {
      app.game.moves++;
      this.updateStatsUI();
      this.checkPairMatch();
    }
  },

  checkPairMatch() {
    app.game.isLocked = true;
    const [first, second] = app.game.flippedCards;

    if (first.card.pairId === second.card.pairId) {
      // MATCH!
      setTimeout(() => {
        first.card.matched = true;
        second.card.matched = true;
        first.el.classList.add('matched');
        second.el.classList.add('matched');

        app.game.matchedPairs++;
        app.sound.playMatch();
        this.updateStatsUI();

        app.game.flippedCards = [];
        app.game.isLocked = false;

        // Check Win Condition
        if (app.game.matchedPairs === app.game.totalPairs) {
          this.handleGameWin();
        }
      }, 350);
    } else {
      // MISMATCH
      setTimeout(() => {
        first.el.classList.add('mismatch-shake');
        second.el.classList.add('mismatch-shake');
        app.sound.playMismatch();

        setTimeout(() => {
          first.card.flipped = false;
          second.card.flipped = false;
          first.el.classList.remove('flipped', 'mismatch-shake');
          second.el.classList.remove('flipped', 'mismatch-shake');

          app.game.flippedCards = [];
          app.game.isLocked = false;
        }, 700);
      }, 350);
    }
  },

  calculateScore() {
    const base = app.game.totalPairs * 150;
    const timePenalty = app.game.timerSeconds * 4;
    const movePenalty = app.game.moves * 10;
    const rawScore = base - timePenalty - movePenalty + app.game.bonusEarned;
    return Math.max(100, Math.round(rawScore));
  },

  startTimer() {
    this.stopTimer();
    app.game.timerInterval = setInterval(() => {
      app.game.timerSeconds++;
      this.updateStatsUI();
    }, 1000);
  },

  stopTimer() {
    if (app.game.timerInterval) {
      clearInterval(app.game.timerInterval);
      app.game.timerInterval = null;
    }
  },

  updateStatsUI() {
    const timerDisplay = document.getElementById('timerDisplay');
    const movesDisplay = document.getElementById('movesDisplay');
    const pairsDisplay = document.getElementById('pairsDisplay');
    const scoreDisplay = document.getElementById('scoreDisplay');

    if (timerDisplay) {
      const mins = String(Math.floor(app.game.timerSeconds / 60)).padStart(2, '0');
      const secs = String(app.game.timerSeconds % 60).padStart(2, '0');
      timerDisplay.textContent = `${mins}:${secs}`;
    }

    if (movesDisplay) {
      movesDisplay.textContent = app.game.moves;
    }

    if (pairsDisplay) {
      pairsDisplay.textContent = `${app.game.matchedPairs} / ${app.game.totalPairs}`;
    }

    if (scoreDisplay) {
      scoreDisplay.textContent = this.calculateScore().toLocaleString();
    }
  },

  handleGameWin() {
    this.stopTimer();
    app.game.status = 'won';
    app.game.finalScore = this.calculateScore();

    app.sound.playVictory();
    app.confetti.burst(120);

    // Update Victory Modal Elements
    const victoryTime = document.getElementById('victoryTime');
    const victoryMoves = document.getElementById('victoryMoves');
    const victoryScore = document.getElementById('victoryScore');
    const victorySaveStatus = document.getElementById('victorySaveStatus');
    const victorySaveBtn = document.getElementById('victorySaveBtn');
    const victoryBonusCallout = document.getElementById('victoryBonusCallout');

    const mins = String(Math.floor(app.game.timerSeconds / 60)).padStart(2, '0');
    const secs = String(app.game.timerSeconds % 60).padStart(2, '0');

    if (victoryTime) victoryTime.textContent = `${mins}:${secs}`;
    if (victoryMoves) victoryMoves.textContent = app.game.moves;
    if (victoryScore) victoryScore.textContent = app.game.finalScore.toLocaleString();

    if (victorySaveStatus) {
      if (app.currentUser) {
        victorySaveStatus.innerHTML = `👤 Logged in as <strong>${escapeHtml(app.currentUser.username)}</strong>. Click Save Score to record your ranking!`;
        if (victorySaveBtn) victorySaveBtn.style.display = 'inline-flex';
      } else {
        victorySaveStatus.innerHTML = `⚠️ Playing as Guest. <a href="#" id="victoryLoginPromptLink" style="color: var(--banana-yellow); font-weight: 700;">Log in or create an account</a> to save your score to the leaderboard!`;
        document.getElementById('victoryLoginPromptLink')?.addEventListener('click', (e) => {
          e.preventDefault();
          UIManager.openModal('authModal');
        });
      }
    }

    if (victoryBonusCallout) {
      victoryBonusCallout.style.display = app.game.bonusEarned > 0 ? 'none' : 'flex';
    }

    setTimeout(() => {
      UIManager.openModal('victoryModal');
    }, 450);
  }
};

// ===================================================================
// BANANA API PUZZLE MODULE
// ===================================================================
const PuzzleManager = {
  init() {
    // Keypad setup
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    keypadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        app.sound.init();
        keypadBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        app.puzzle.selectedAnswer = btn.dataset.val;
        document.getElementById('submitPuzzleBtn').disabled = false;
        app.sound.playTone(600, 'sine', 0.05, 0.05);
      });
    });

    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitAnswer());
    }

    const refreshBtn = document.getElementById('refreshPuzzleBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.fetchPuzzle());
    }

    // Modal Bonus Button
    const victoryBonusBtn = document.getElementById('victoryBonusBtn');
    if (victoryBonusBtn) {
      victoryBonusBtn.addEventListener('click', () => {
        UIManager.closeModal('victoryModal');
        UIManager.switchView('puzzle');
        this.fetchPuzzle();
      });
    }
  },

  async fetchPuzzle() {
    const loadingState = document.getElementById('puzzleLoadingState');
    const puzzleImg = document.getElementById('puzzleImg');
    const feedback = document.getElementById('puzzleFeedback');
    const submitBtn = document.getElementById('submitPuzzleBtn');

    if (feedback) feedback.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    // Deselect keypad
    document.querySelectorAll('.keypad-btn').forEach((b) => b.classList.remove('selected'));
    app.puzzle.selectedAnswer = null;

    if (loadingState) loadingState.style.display = 'flex';
    if (puzzleImg) puzzleImg.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=get`);
      const data = await res.json();

      if (data.success && data.question) {
        app.puzzle.activeQuestion = data.question;

        // Preload image
        const img = new Image();
        img.onload = () => {
          if (loadingState) loadingState.style.display = 'none';
          if (puzzleImg) {
            puzzleImg.src = data.question;
            puzzleImg.style.display = 'block';
          }
        };
        img.onerror = () => {
          if (loadingState) {
            loadingState.innerHTML = '<p style="color: #fb7185;">Failed to load puzzle image. Click "New" to try again.</p>';
          }
        };
        img.src = data.question;
      } else {
        throw new Error(data.message || 'Failed to retrieve puzzle');
      }
    } catch (err) {
      console.error('Puzzle fetch error:', err);
      if (loadingState) {
        loadingState.innerHTML = '<p style="color: #fb7185;">Network error connecting to Banana API. Please click "New" to retry.</p>';
      }
    }
  },

  async submitAnswer() {
    if (app.puzzle.selectedAnswer === null) {
      showToast('Please select a number from 0 to 9.', 'error');
      return;
    }

    const feedback = document.getElementById('puzzleFeedback');
    const submitBtn = document.getElementById('submitPuzzleBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/puzzle.php?action=verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: app.puzzle.selectedAnswer })
      });
      const data = await res.json();

      if (data.success) {
        feedback.className = `puzzle-feedback-card ${data.correct ? 'success' : 'error'}`;
        feedback.textContent = data.message;
        feedback.style.display = 'block';

        if (data.correct) {
          app.sound.playBonusCorrect();
          app.confetti.burst(80);

          // If game was completed, add bonus to game score!
          if (app.game.status === 'won') {
            app.game.bonusEarned = 500;
            app.game.finalScore = GameManager.calculateScore();
            showToast('🎉 +500 Bonus Points added to your match score!', 'success');

            const victoryScore = document.getElementById('victoryScore');
            if (victoryScore) victoryScore.textContent = app.game.finalScore.toLocaleString();
          } else {
            showToast('🎉 Correct! Banana Master!', 'success');
          }
        } else {
          app.sound.playMismatch();
        }
      } else {
        showToast(data.message || 'Submission failed.', 'error');
      }
    } catch (err) {
      console.error('Answer verification error:', err);
      showToast('Failed to verify answer. Please retry.', 'error');
    }
  }
};

// ===================================================================
// SCORE & LEADERBOARD MODULE
// ===================================================================
const ScoreManager = {
  init() {
    const refreshBtn = document.getElementById('refreshLeaderboardBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        app.sound.init();
        this.loadLeaderboard();
      });
    }

    const saveScoreBtn = document.getElementById('victorySaveBtn');
    if (saveScoreBtn) {
      saveScoreBtn.addEventListener('click', () => this.saveCurrentGameScore());
    }

    this.loadLeaderboard();
  },

  async saveCurrentGameScore() {
    if (!app.currentUser) {
      showToast('Please log in first to save your score!', 'error');
      UIManager.openModal('authModal');
      return;
    }

    if (app.game.scoreSaved) {
      showToast('This score has already been saved!', 'info');
      return;
    }

    const scoreToSave = app.game.finalScore || GameManager.calculateScore();
    const timeToSave = app.game.timerSeconds;

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: scoreToSave,
          completion_time: timeToSave
        })
      });
      const data = await res.json();

      if (data.success) {
        app.game.scoreSaved = true;
        showToast(`🏆 Score saved! Your current rank is #${data.rank}!`, 'success');

        const saveStatus = document.getElementById('victorySaveStatus');
        if (saveStatus) {
          saveStatus.innerHTML = `✅ <strong>Score Saved!</strong> You rank #${data.rank} on the Global Leaderboard.`;
        }

        const victorySaveBtn = document.getElementById('victorySaveBtn');
        if (victorySaveBtn) {
          victorySaveBtn.disabled = true;
          victorySaveBtn.innerHTML = '<span>✅</span> Saved';
        }

        this.loadLeaderboard();
        this.loadUserHistory();
      } else {
        showToast(data.message || 'Failed to save score.', 'error');
      }
    } catch (err) {
      console.error('Save score error:', err);
      showToast('Network error saving score.', 'error');
    }
  },

  async loadLeaderboard() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=leaderboard`);
      const data = await res.json();

      if (data.success && Array.isArray(data.leaderboard)) {
        if (data.leaderboard.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="empty-state">
                <div class="empty-state-icon">🍌</div>
                No scores recorded yet! Be the first to play and claim #1!
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = data.leaderboard.map((row) => {
          let rankBadge = `#${row.rank}`;
          if (row.rank === 1) rankBadge = '🥇 1st';
          else if (row.rank === 2) rankBadge = '🥈 2nd';
          else if (row.rank === 3) rankBadge = '🥉 3rd';

          const timeFormatted = formatSeconds(row.completion_time);
          const dateFormatted = formatDate(row.played_at);
          const isCurrentClass = row.is_current_user ? 'class="current-user-row"' : '';
          const userHighlight = row.is_current_user ? ' (You)' : '';

          return `
            <tr ${isCurrentClass}>
              <td class="rank-cell">${rankBadge}</td>
              <td><strong>${escapeHtml(row.username)}</strong>${userHighlight}</td>
              <td><span class="score-badge">${Number(row.score).toLocaleString()}</span></td>
              <td>${timeFormatted}</td>
              <td>${dateFormatted}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state" style="color: #fb7185;">
            Failed to load leaderboard. Please check database connection.
          </td>
        </tr>
      `;
    }
  },

  async loadUserHistory() {
    const totalGamesEl = document.getElementById('userTotalGames');
    const bestScoreEl = document.getElementById('userBestScore');
    const fastestTimeEl = document.getElementById('userFastestTime');
    const avgScoreEl = document.getElementById('userAvgScore');
    const historyTbody = document.getElementById('userHistoryTableBody');

    if (!app.currentUser) {
      if (totalGamesEl) totalGamesEl.textContent = '0';
      if (bestScoreEl) bestScoreEl.textContent = '0';
      if (fastestTimeEl) fastestTimeEl.textContent = '--:--';
      if (avgScoreEl) avgScoreEl.textContent = '0';
      if (historyTbody) {
        historyTbody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              Log in to see your games history and personal statistics.
            </td>
          </tr>
        `;
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/scores.php?action=user_scores`);
      const data = await res.json();

      if (data.success) {
        const stats = data.stats || {};
        if (totalGamesEl) totalGamesEl.textContent = stats.total_games || 0;
        if (bestScoreEl) bestScoreEl.textContent = (stats.best_score || 0).toLocaleString();
        if (fastestTimeEl) fastestTimeEl.textContent = stats.fastest_time ? formatSeconds(stats.fastest_time) : '--:--';
        if (avgScoreEl) avgScoreEl.textContent = (stats.average_score || 0).toLocaleString();

        if (historyTbody) {
          if (!data.history || data.history.length === 0) {
            historyTbody.innerHTML = `
              <tr>
                <td colspan="4" class="empty-state">
                  No games played yet. Play a match now to start your record!
                </td>
              </tr>
            `;
          } else {
            historyTbody.innerHTML = data.history.map((row, i) => `
              <tr>
                <td>#${i + 1}</td>
                <td><span class="score-badge">${Number(row.score).toLocaleString()}</span></td>
                <td>${formatSeconds(row.completion_time)}</td>
                <td>${formatDate(row.played_at)}</td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user history:', err);
    }
  }
};

// ===================================================================
// UI & NAVIGATION MANAGER
// ===================================================================
const UIManager = {
  init() {
    // Nav Tabs
    const navBtns = document.querySelectorAll('.nav-tab-btn');
    navBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        app.sound.init();
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // Brand Home Button
    document.getElementById('brandHomeBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('game');
    });

    // Sound Toggle Button
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.textContent = app.sound.enabled ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        const isEnabled = app.sound.toggle();
        soundBtn.textContent = isEnabled ? '🔊' : '🔇';
        showToast(isEnabled ? 'Sound effects turned ON' : 'Sound effects muted', 'info');
      });
    }

    // Modal Close Buttons
    document.getElementById('closeAuthModalBtn')?.addEventListener('click', () => this.closeModal('authModal'));
    document.getElementById('closeVictoryModalBtn')?.addEventListener('click', () => this.closeModal('victoryModal'));

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Victory Play Again Button
    document.getElementById('victoryPlayAgainBtn')?.addEventListener('click', () => {
      this.closeModal('victoryModal');
      this.switchView('game');
      GameManager.startNewGame();
    });

    // Auth Form Tabs (Login vs Register)
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');

    tabLoginBtn?.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      if (authAlert) authAlert.style.display = 'none';
    });

    tabRegisterBtn?.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      if (authAlert) authAlert.style.display = 'none';
    });

    // Login Form Submit
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      app.sound.init();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!username || !password) {
        this.showAuthAlert('Please enter both username and password.');
        return;
      }

      const res = await AuthManager.login(username, password);
      if (!res.success) {
        this.showAuthAlert(res.message);
      }
    });

    // Register Form Submit
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      app.sound.init();
      const username = document.getElementById('registerUsername').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirm = document.getElementById('registerConfirmPassword').value;

      if (password !== confirm) {
        this.showAuthAlert('Passwords do not match. Please verify.');
        return;
      }

      const res = await AuthManager.register(username, password);
      if (!res.success) {
        this.showAuthAlert(res.message);
      }
    });
  },

  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach((sec) => sec.classList.remove('active'));

    // Remove active from nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Show target view
    const targetSection = document.getElementById(`view${capitalize(viewName)}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Trigger on-view actions
    if (viewName === 'puzzle' && !app.puzzle.activeQuestion) {
      PuzzleManager.fetchPuzzle();
    } else if (viewName === 'leaderboard') {
      ScoreManager.loadLeaderboard();
    } else if (viewName === 'profile') {
      ScoreManager.loadUserHistory();
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  showAuthAlert(message) {
    const alert = document.getElementById('authAlert');
    if (alert) {
      alert.className = 'puzzle-feedback-card error';
      alert.textContent = message;
      alert.style.display = 'block';
    }
  }
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
function formatSeconds(totalSecs) {
  if (totalSecs === null || totalSecs === undefined) return '--:--';
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', async () => {
  UIManager.init();
  GameManager.init();
  PuzzleManager.init();
  ScoreManager.init();
  await AuthManager.checkSession();
});
