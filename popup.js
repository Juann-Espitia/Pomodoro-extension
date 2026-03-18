const RING_CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.49

const PHASE_LABELS = {
  focus:      'Focus Time',
  shortBreak: 'Short Break',
  longBreak:  'Long Break'
};

// Durations are loaded from background state/settings
let currentDurations = {
  focus:      25 * 60,
  shortBreak: 5  * 60,
  longBreak:  15 * 60
};

let selectedSound = 'bell';

// DOM — timer view
const phaseLabel    = document.getElementById('phase-label');
const timeDisplay   = document.getElementById('time-display');
const sessionInfo   = document.getElementById('session-info');
const ringProgress  = document.getElementById('ring-progress');
const btnStartPause = document.getElementById('btn-start-pause');
const btnReset      = document.getElementById('btn-reset');
const btnSkip       = document.getElementById('btn-skip');
const btnResetAll   = document.getElementById('btn-reset-all');
const iconPlay      = document.getElementById('icon-play');
const iconPause     = document.getElementById('icon-pause');
const totalEl       = document.getElementById('total-pomodoros');
const cycleEl       = document.getElementById('cycle-progress');
const dots          = [0, 1, 2, 3].map(i => document.getElementById(`dot-${i}`));

// DOM — settings view
const btnSettings   = document.getElementById('btn-settings');
const btnBack       = document.getElementById('btn-back');
const btnSave       = document.getElementById('btn-save');
const inputFocus    = document.getElementById('input-focus');
const inputShort    = document.getElementById('input-short');
const inputLong     = document.getElementById('input-long');
const soundList     = document.getElementById('sound-list');
const viewTimer     = document.getElementById('view-timer');
const viewSettings  = document.getElementById('view-settings');

// ── Sound list UI ────────────────────────────────────

function buildSoundList() {
  SOUND_OPTIONS.forEach(({ id, label }) => {
    const row = document.createElement('div');
    row.className = 'sound-option' + (id === selectedSound ? ' selected' : '');
    row.dataset.sound = id;
    row.innerHTML = `
      <div class="sound-option-left">
        <div class="sound-dot"></div>
        <span class="sound-name">${label}</span>
      </div>
      <button class="btn-preview" data-sound="${id}">PLAY</button>
    `;

    // Select on row click (but not preview button)
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-preview')) return;
      selectSound(id);
    });

    // Preview button
    row.querySelector('.btn-preview').addEventListener('click', (e) => {
      e.stopPropagation();
      playSound(id);
    });

    soundList.appendChild(row);
  });
}

function selectSound(id) {
  selectedSound = id;
  soundList.querySelectorAll('.sound-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.sound === id);
  });
}

// ── Settings panel ───────────────────────────────────

btnSettings.addEventListener('click', () => {
  viewTimer.classList.add('hidden');
  viewSettings.classList.remove('hidden');
});

btnBack.addEventListener('click', () => {
  viewSettings.classList.add('hidden');
  viewTimer.classList.remove('hidden');
});

// Stepper buttons (+ / −)
document.querySelectorAll('.btn-stepper').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const dir   = parseInt(btn.dataset.dir, 10);
    const val   = parseInt(input.value, 10) || 1;
    const min   = parseInt(input.min, 10);
    const max   = parseInt(input.max, 10);
    input.value = Math.min(max, Math.max(min, val + dir));
  });
});

btnSave.addEventListener('click', () => {
  const newSettings = {
    focusMinutes:      Math.max(1, parseInt(inputFocus.value, 10) || 25),
    shortBreakMinutes: Math.max(1, parseInt(inputShort.value, 10) || 5),
    longBreakMinutes:  Math.max(1, parseInt(inputLong.value, 10) || 15),
    sound:             selectedSound
  };

  browser.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: newSettings })
    .then(() => {
      currentDurations = {
        focus:      newSettings.focusMinutes      * 60,
        shortBreak: newSettings.shortBreakMinutes * 60,
        longBreak:  newSettings.longBreakMinutes  * 60
      };
      viewSettings.classList.add('hidden');
      viewTimer.classList.remove('hidden');
    })
    .catch(console.error);
});

// ── Timer UI ─────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateUI(state) {
  const { phase, timeLeft, isRunning, pomodoroCount, totalPomodoros } = state;
  const total = currentDurations[phase];

  phaseLabel.textContent = PHASE_LABELS[phase];
  document.body.className = `phase-${phase}`;

  timeDisplay.textContent = formatTime(timeLeft);

  // Ring progress
  const progress = (total - timeLeft) / total;
  ringProgress.style.strokeDasharray  = `${RING_CIRCUMFERENCE}`;
  ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progress)}`;

  // Play/pause icon
  iconPlay.style.display  = isRunning ? 'none' : '';
  iconPause.style.display = isRunning ? ''     : 'none';

  // Session info
  if (phase === 'focus') {
    sessionInfo.textContent = `Session ${pomodoroCount + 1} of 4`;
  } else if (phase === 'shortBreak') {
    sessionInfo.textContent = 'Short break — relax!';
  } else {
    sessionInfo.textContent = 'Long break — great work!';
  }

  // Dots
  dots.forEach((dot, i) => {
    dot.classList.remove('filled', 'active');
    if (i < pomodoroCount) {
      dot.classList.add('filled');
    } else if (phase === 'focus' && i === pomodoroCount) {
      dot.classList.add('active');
    }
  });

  totalEl.textContent = totalPomodoros;
  cycleEl.textContent = `${pomodoroCount}/4`;
}

function applySettings(settings) {
  if (!settings) return;
  currentDurations = {
    focus:      settings.focusMinutes      * 60,
    shortBreak: settings.shortBreakMinutes * 60,
    longBreak:  settings.longBreakMinutes  * 60
  };
  inputFocus.value = settings.focusMinutes;
  inputShort.value = settings.shortBreakMinutes;
  inputLong.value  = settings.longBreakMinutes;
  selectedSound    = settings.sound || 'bell';
  selectSound(selectedSound);
}

// ── Button listeners ─────────────────────────────────

btnStartPause.addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'GET_STATE' }).then(({ state }) => {
    browser.runtime.sendMessage({ type: state.isRunning ? 'PAUSE' : 'START' });
  });
});

btnReset.addEventListener('click', () =>
  browser.runtime.sendMessage({ type: 'RESET' }));

btnSkip.addEventListener('click', () =>
  browser.runtime.sendMessage({ type: 'SKIP' }));

btnResetAll.addEventListener('click', () => {
  if (confirm('Reset all pomodoros and stats?')) {
    browser.runtime.sendMessage({ type: 'RESET_ALL' });
  }
});

// Listen for live state updates from background
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATE') {
    updateUI(message.state);
  }
});

// ── Init ─────────────────────────────────────────────

buildSoundList();

browser.runtime.sendMessage({ type: 'GET_STATE' })
  .then(({ state, settings }) => {
    applySettings(settings);
    updateUI(state);

    if (state.sessionJustCompleted) {
      const container = document.querySelector('.container');
      container.classList.add('session-complete-enter');
      container.addEventListener('animationend', () => {
        container.classList.remove('session-complete-enter');
      }, { once: true });
      browser.runtime.sendMessage({ type: 'CLEAR_SESSION_COMPLETE' });
    }
  })
  .catch(console.error);
