/* global NOUNS_ROYIN, NOUNS_WIKTIONARY, NOUNS_LST20, NOUNS_LST20_PROPER, NOUNS_INTERSECT, ACTIVE_DATASET */

// ─── State ───────────────────────────────────────────────
const TIMER_SECONDS = 3;
const CIRCUMFERENCE = 2 * Math.PI * 52; // r=52

let currentWord = '';
let timerInterval = null;
let timeLeft = TIMER_SECONDS;
let roundActive = false;

// ─── DOM refs ────────────────────────────────────────────
const screenSplash = document.getElementById('screen-splash');
const screenGame = document.getElementById('screen-game');
const screenResult = document.getElementById('screen-result');

const currentWordEl = document.getElementById('current-word');
const timerNumEl = document.getElementById('timer-num');
const timerArcEl = document.getElementById('timer-arc');

const resultIconEl = document.getElementById('result-icon');
const resultLabelEl = document.getElementById('result-label');
const resultWordEl = document.getElementById('result-word');
const btnAnswer = document.getElementById('btn-answer');

// ─── Inject SVG gradient (can't use CSS url() on <circle stroke>) ───
const svgEl = document.getElementById('timer-svg');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#7c3aed" />
    <stop offset="100%" stop-color="#06b6d4" />
  </linearGradient>`;
svgEl.prepend(defs);
timerArcEl.style.stroke = 'url(#timerGrad)';
timerArcEl.style.strokeDasharray = CIRCUMFERENCE;
timerArcEl.style.strokeDashoffset = 0;

// ─── Screen helpers ──────────────────────────────────────
function showScreen(screen) {
    [screenSplash, screenGame, screenResult].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ─── Game flow ───────────────────────────────────────────
function startGame() {
    startRound();
}

function startRound() {
    currentWord = pickWord();
    roundActive = true;

    // Display word with auto-resize to fit exactly 1 line
    renderFittedText(currentWordEl, currentWord);

    // Reset button state
    btnAnswer.disabled = false;
    btnAnswer.style.opacity = '1';

    // Show game screen
    showScreen(screenGame);

    // Start timer
    clearTimerUI();
    startTimer();
}

function getActiveNouns() {
    if (typeof ACTIVE_DATASET !== 'undefined') {
        if (ACTIVE_DATASET === 'intersect') return NOUNS_INTERSECT;
        if (ACTIVE_DATASET === 'lst20') return NOUNS_LST20;
        if (ACTIVE_DATASET === 'lst20_proper') return NOUNS_LST20_PROPER;
        if (ACTIVE_DATASET === 'wiktionary') return NOUNS_WIKTIONARY;
    }
    return NOUNS_ROYIN; // default: royin
}

function pickWord() {
    // Check for explicit word in URL for testing (e.g., ?word=ทดสอบ)
    const params = new URLSearchParams(window.location.search);
    if (params.has('word')) {
        return params.get('word');
    }

    // Choose list based on config
    const list = getActiveNouns();
    return list[Math.floor(Math.random() * list.length)];
}

// ─── Timer ───────────────────────────────────────────────
function startTimer() {
    timeLeft = TIMER_SECONDS;
    updateTimerUI(timeLeft);

    timerInterval = setInterval(() => {
        timeLeft -= 0.05;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timeLeft = 0;
            updateTimerUI(0);
            onTimeout();
            return;
        }

        updateTimerUI(timeLeft);
    }, 50);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerUI(t) {
    const ratio = t / TIMER_SECONDS;
    const offset = CIRCUMFERENCE * (1 - ratio);
    timerArcEl.style.strokeDashoffset = offset;

    // Display whole number
    timerNumEl.textContent = Math.ceil(t);

    // Color shift: green → yellow → red
    if (ratio > 0.55) {
        timerArcEl.style.stroke = 'url(#timerGrad)';
        timerNumEl.style.color = 'var(--text)';
    } else if (ratio > 0.28) {
        timerArcEl.style.stroke = 'var(--warning)';
        timerNumEl.style.color = 'var(--warning)';
    } else {
        timerArcEl.style.stroke = 'var(--danger)';
        timerNumEl.style.color = 'var(--danger)';
    }
}

function clearTimerUI() {
    timerArcEl.style.strokeDashoffset = 0;
    timerArcEl.style.stroke = 'url(#timerGrad)';
    timerNumEl.textContent = TIMER_SECONDS;
    timerNumEl.style.color = 'var(--text)';
}

// ─── Answer ──────────────────────────────────────────────
function onAnswer() {
    if (!roundActive) return;
    roundActive = false;
    stopTimer();
    btnAnswer.disabled = true;
    btnAnswer.style.opacity = '0.5';
    showResult(true);
}

function onTimeout() {
    if (!roundActive) return;
    roundActive = false;
    showResult(false);
}

// ─── Result ──────────────────────────────────────────────
function showResult(win) {
    resultIconEl.textContent = win ? '✅' : '❌';
    resultLabelEl.textContent = win ? 'ผ่านแล้ว!' : 'หมดเวลา!';
    resultLabelEl.className = 'result-label ' + (win ? 'win' : 'lose');
    resultWordEl.className = 'result-word ' + (win ? 'win' : 'lose');
    renderFittedText(resultWordEl, currentWord);

    // Trigger icon animation
    resultIconEl.style.animation = 'none';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            resultIconEl.style.animation = '';
        });
    });

    showScreen(screenResult);
}

function nextRound() {
    startRound();
}

function renderFittedText(element, text) {
    element.textContent = text;
    element.style.fontSize = ''; // Reset to default clamp() size

    requestAnimationFrame(() => {
        const padX = 10; // Extra safety padding to prevent exact boundary touch
        const cw = element.clientWidth - padX;
        const sw = element.scrollWidth;

        if (sw > cw && cw > 0) {
            // Shrink font-size proportionally
            const currentSize = parseFloat(window.getComputedStyle(element).fontSize);
            const newSize = Math.floor(currentSize * (cw / sw));
            element.style.fontSize = newSize + 'px';
        }
    });
}
