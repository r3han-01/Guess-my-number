'use strict';

// ----------------------------------------------------
// GAME STATE & CONSTANTS
// ----------------------------------------------------
const INITIAL_SCORE = 10;
const MIN_NUM = 1;
const MAX_NUM = 20;

let secretNumber = Math.trunc(Math.random() * MAX_NUM) + MIN_NUM;
let score = INITIAL_SCORE;
let highscore = Number(localStorage.getItem('guess_my_number_highscore')) || 0;
let isGameOver = false;
let currentMin = MIN_NUM;
let currentMax = MAX_NUM;
let guessHistory = [];

// DOM Elements
const numberEl = document.querySelector('.number');
const scoreEl = document.querySelector('.score');
const highscoreEl = document.querySelector('.highscore');
const messageEl = document.querySelector('.message');
const messageBoxEl = document.getElementById('message-box');
const guessInputEl = document.querySelector('.guess');
const checkBtn = document.querySelector('.check');
const againBtn = document.querySelector('.again');
const rangeMinEl = document.getElementById('range-min');
const rangeMaxEl = document.getElementById('range-max');
const rangeTrackerFill = document.getElementById('range-tracker-fill');
const rangeTrackerHint = document.getElementById('range-tracker-hint');
const historyChipsEl = document.getElementById('history-chips');
const soundBtn = document.getElementById('sound-btn');
const soundIconEl = soundBtn.querySelector('.sound-icon');
const btnIncrement = document.getElementById('btn-increment');
const btnDecrement = document.getElementById('btn-decrement');

// ----------------------------------------------------
// RETRO 8-BIT AUDIO SYNTHESIZER (Web Audio API)
// ----------------------------------------------------
let audioCtx = null;
let soundEnabled = localStorage.getItem('guess_sound_enabled') !== 'false'; // default true

const updateSoundIcon = () => {
  soundIconEl.textContent = soundEnabled ? '🔊' : '🔇';
  soundBtn.title = soundEnabled ? 'Mute Sound (M)' : 'Unmute Sound (M)';
};
updateSoundIcon();

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playTone = (freq, type, duration, startTime = 0, gainLevel = 0.15) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(gainLevel, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  } catch (e) {
    // Ignore audio errors gracefully
  }
};

const playSound = {
  click: () => {
    playTone(600, 'sine', 0.05, 0, 0.1);
  },
  high: () => {
    // Descending tone for "Too High"
    playTone(550, 'triangle', 0.12, 0, 0.15);
    playTone(330, 'triangle', 0.18, 0.08, 0.15);
  },
  low: () => {
    // Ascending tone for "Too Low"
    playTone(280, 'triangle', 0.12, 0, 0.15);
    playTone(480, 'triangle', 0.18, 0.08, 0.15);
  },
  invalid: () => {
    // Quick warning buzz
    playTone(180, 'sawtooth', 0.08, 0, 0.15);
    playTone(140, 'sawtooth', 0.12, 0.06, 0.15);
  },
  win: () => {
    // 8-bit victory arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      playTone(freq, 'square', 0.14, index * 0.07, 0.12);
    });
  },
  gameOver: () => {
    // Sad game-over slide
    const notes = [330, 311, 293, 277, 246];
    notes.forEach((freq, index) => {
      playTone(freq, 'sawtooth', 0.22, index * 0.14, 0.18);
    });
  }
};

// ----------------------------------------------------
// CANVAS CONFETTI ENGINE (Pure Vanilla JS)
// ----------------------------------------------------
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimationId = null;

const resizeCanvas = () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
};
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const createConfetti = () => {
  const colors = ['#00f2fe', '#9d4edd', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];
  confettiParticles = [];

  for (let i = 0; i < 110; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.35,
      w: Math.random() * 9 + 5,
      h: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 18,
      vy: Math.random() * -14 - 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.38,
      opacity: 1
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  renderConfetti();
};

const renderConfetti = () => {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let hasLivingParticles = false;

  confettiParticles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.98; // Air resistance
    p.rotation += p.rotSpeed;

    if (p.y > window.innerHeight * 0.6) {
      p.opacity -= 0.018;
    }

    if (p.opacity > 0 && p.y < window.innerHeight + 20) {
      hasLivingParticles = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  });

  if (hasLivingParticles) {
    confettiAnimationId = requestAnimationFrame(renderConfetti);
  } else {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
};

// ----------------------------------------------------
// UI HELPERS & VISUAL FEEDBACK
// ----------------------------------------------------
const displayMessage = (message) => {
  messageEl.textContent = message;
};

const triggerShake = (element) => {
  element.classList.remove('shake', 'flash-red');
  void element.offsetWidth; // Force reflow
  element.classList.add('shake', 'flash-red');
  setTimeout(() => {
    element.classList.remove('shake', 'flash-red');
  }, 500);
};

const triggerScorePop = () => {
  scoreEl.classList.remove('pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('pop');
};

const updateRangeTracker = () => {
  rangeMinEl.textContent = currentMin;
  rangeMaxEl.textContent = currentMax;

  const leftPercent = ((currentMin - 1) / MAX_NUM) * 100;
  const widthPercent = ((currentMax - currentMin + 1) / MAX_NUM) * 100;

  rangeTrackerFill.style.left = `${leftPercent}%`;
  rangeTrackerFill.style.width = `${widthPercent}%`;

  const remainingPossibilities = currentMax - currentMin + 1;
  rangeTrackerHint.textContent = `${remainingPossibilities} ${remainingPossibilities === 1 ? 'possibility left!' : 'possibilities'}`;
};

const addHistoryChip = (guess, type) => {
  if (guessHistory.length === 0) {
    historyChipsEl.innerHTML = '';
  }
  guessHistory.push({ guess, type });

  const chip = document.createElement('span');
  chip.classList.add('chip', `chip-${type}`);

  let icon = '⚡';
  if (type === 'high') icon = '⬇️';
  if (type === 'low') icon = '⬆️';
  if (type === 'correct') icon = '🎉';

  chip.innerHTML = `${icon} ${guess}`;
  historyChipsEl.appendChild(chip);
};

// Initialize highscore from storage
highscoreEl.textContent = highscore;

// ----------------------------------------------------
// GAME ACTIONS
// ----------------------------------------------------
const handleCheck = () => {
  if (isGameOver) return;

  const guess = Number(guessInputEl.value);

  // When no input or out of bounds
  if (!guessInputEl.value.trim() || isNaN(guess) || guess < MIN_NUM || guess > MAX_NUM) {
    displayMessage(`⚠️ Enter between ${MIN_NUM} & ${MAX_NUM}!`);
    triggerShake(guessInputEl);
    triggerShake(messageBoxEl);
    playSound.invalid();
    guessInputEl.focus();
    return;
  }

  // When already guessed
  const alreadyGuessed = guessHistory.some((item) => item.guess === guess);
  if (alreadyGuessed) {
    displayMessage(`⚠️ You already tried ${guess}!`);
    triggerShake(guessInputEl);
    triggerShake(messageBoxEl);
    playSound.invalid();
    guessInputEl.select();
    return;
  }

  // When player wins!
  if (guess === secretNumber) {
    isGameOver = true;
    displayMessage('🎉 Correct Number! You Win!');
    numberEl.textContent = secretNumber;
    numberEl.classList.add('revealed');
    document.body.classList.add('win-state');

    addHistoryChip(guess, 'correct');
    createConfetti();
    playSound.win();

    if (score > highscore) {
      highscore = score;
      highscoreEl.textContent = highscore;
      localStorage.setItem('guess_my_number_highscore', highscore);
      triggerScorePop();
    }
    return;
  }

  // When guess is wrong
  score--;
  scoreEl.textContent = Math.max(0, score);
  triggerScorePop();
  triggerShake(guessInputEl);
  triggerShake(messageBoxEl);

  if (score > 0) {
    if (guess > secretNumber) {
      displayMessage('📈 Too High! Guess lower ⬇️');
      playSound.high();
      addHistoryChip(guess, 'high');
      if (guess <= currentMax) {
        currentMax = guess - 1;
      }
    } else {
      displayMessage('📉 Too Low! Guess higher ⬆️');
      playSound.low();
      addHistoryChip(guess, 'low');
      if (guess >= currentMin) {
        currentMin = guess + 1;
      }
    }
    currentMin = Math.min(currentMin, currentMax);
    updateRangeTracker();
  } else {
    // When Player Loses
    isGameOver = true;
    displayMessage('☠️ Game Over! You ran out of points!');
    scoreEl.textContent = 0;
    numberEl.textContent = secretNumber;
    document.body.classList.add('game-over-state');
    playSound.gameOver();
  }

  guessInputEl.select();
};

const handleReset = () => {
  playSound.click();
  score = INITIAL_SCORE;
  secretNumber = Math.trunc(Math.random() * MAX_NUM) + MIN_NUM;
  isGameOver = false;
  currentMin = MIN_NUM;
  currentMax = MAX_NUM;
  guessHistory = [];

  displayMessage('Start guessing...');
  scoreEl.textContent = score;
  numberEl.textContent = '?';
  numberEl.classList.remove('revealed');
  guessInputEl.value = '';

  document.body.classList.remove('win-state', 'game-over-state');
  updateRangeTracker();

  // Clear history chips
  historyChipsEl.innerHTML = '<span class="chip chip-empty">No guesses yet</span>';

  // Clear any active confetti
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  guessInputEl.focus();
};

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------
checkBtn.addEventListener('click', handleCheck);
againBtn.addEventListener('click', handleReset);

// Stepper buttons
btnIncrement.addEventListener('click', () => {
  playSound.click();
  const currentVal = Number(guessInputEl.value);
  if (!guessInputEl.value.trim() || isNaN(currentVal)) {
    guessInputEl.value = currentMin;
  } else if (currentVal < MAX_NUM) {
    guessInputEl.value = Math.min(MAX_NUM, currentVal + 1);
  }
  guessInputEl.focus();
});

btnDecrement.addEventListener('click', () => {
  playSound.click();
  const currentVal = Number(guessInputEl.value);
  if (!guessInputEl.value.trim() || isNaN(currentVal)) {
    guessInputEl.value = currentMax;
  } else if (currentVal > MIN_NUM) {
    guessInputEl.value = Math.max(MIN_NUM, currentVal - 1);
  }
  guessInputEl.focus();
});

// Arrow key navigation inside input
guessInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    btnIncrement.click();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    btnDecrement.click();
  }
});

// Sound toggle button
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('guess_sound_enabled', soundEnabled);
  updateSoundIcon();
  if (soundEnabled) {
    playSound.click();
  }
});

// Global Keyboard navigation
window.addEventListener('keydown', (e) => {
  // Allow typing numbers naturally in the input
  if (e.key === 'Enter') {
    handleCheck();
  } else if (e.key === 'r' || e.key === 'R') {
    if (document.activeElement !== guessInputEl) {
      handleReset();
    }
  } else if (e.key === 'm' || e.key === 'M') {
    if (document.activeElement !== guessInputEl) {
      soundBtn.click();
    }
  }
});

// Initial focus on input
window.addEventListener('load', () => {
  guessInputEl.focus();
  updateRangeTracker();
});