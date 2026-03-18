const PHASES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};

const POMODOROS_PER_CYCLE = 4;

const DEFAULT_SETTINGS = {
  focusMinutes:      25,
  shortBreakMinutes: 5,
  longBreakMinutes:  15,
  sound:             'bell'
};

let settings = { ...DEFAULT_SETTINGS };

let durations = {
  focus:      settings.focusMinutes      * 60,
  shortBreak: settings.shortBreakMinutes * 60,
  longBreak:  settings.longBreakMinutes  * 60
};

let state = {
  phase:                PHASES.FOCUS,
  timeLeft:             durations.focus,
  isRunning:            false,
  pomodoroCount:        0,
  totalPomodoros:       0,
  sessionJustCompleted: false
};

// Load saved settings from storage on startup
browser.storage.local.get('settings').then(result => {
  if (result.settings) {
    settings = { ...DEFAULT_SETTINGS, ...result.settings };
    durations = {
      focus:      settings.focusMinutes      * 60,
      shortBreak: settings.shortBreakMinutes * 60,
      longBreak:  settings.longBreakMinutes  * 60
    };
    state.timeLeft = durations[state.phase];
  }
});

function tick() {
  if (!state.isRunning) return;

  state.timeLeft--;

  if (state.timeLeft <= 0) {
    handlePhaseEnd();
  }

  broadcastState();
}

function handlePhaseEnd() {
  state.isRunning = false;
  state.sessionJustCompleted = true;
  playSound(settings.sound);
  browser.browserAction.openPopup().catch(() => {});

  if (state.phase === PHASES.FOCUS) {
    state.totalPomodoros++;
    state.pomodoroCount++;

    if (state.pomodoroCount >= POMODOROS_PER_CYCLE) {
      state.pomodoroCount = 0;
      state.phase    = PHASES.LONG_BREAK;
      state.timeLeft = durations.longBreak;
      showNotification(
        'Cycle Complete!',
        `You finished 4 pomodoros. Take a well-earned ${settings.longBreakMinutes}-minute long break!`
      );
    } else {
      state.phase    = PHASES.SHORT_BREAK;
      state.timeLeft = durations.shortBreak;
      showNotification(
        'Focus Session Done!',
        `Pomodoro ${state.pomodoroCount}/${POMODOROS_PER_CYCLE} complete. Take a ${settings.shortBreakMinutes}-minute break!`
      );
    }
  } else {
    state.phase    = PHASES.FOCUS;
    state.timeLeft = durations.focus;
    showNotification(
      'Break Over!',
      'Time to focus. Start your next pomodoro!'
    );
  }
}

function showNotification(title, message) {
  browser.notifications.create({ type: 'basic', iconUrl: 'icons/icon.svg', title, message });
}

function broadcastState() {
  browser.runtime.sendMessage({ type: 'STATE_UPDATE', state: { ...state } })
    .catch(() => {});
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'GET_STATE':
      sendResponse({ state: { ...state }, settings: { ...settings } });
      break;

    case 'START':
      state.isRunning = true;
      broadcastState();
      break;

    case 'PAUSE':
      state.isRunning = false;
      broadcastState();
      break;

    case 'RESET':
      state.isRunning = false;
      state.timeLeft  = durations[state.phase];
      broadcastState();
      break;

    case 'SKIP':
      handlePhaseEnd();
      broadcastState();
      break;

    case 'CLEAR_SESSION_COMPLETE':
      state.sessionJustCompleted = false;
      break;

    case 'RESET_ALL':
      state = {
        phase:          PHASES.FOCUS,
        timeLeft:       durations.focus,
        isRunning:      false,
        pomodoroCount:  0,
        totalPomodoros: 0
      };
      broadcastState();
      break;

    case 'SAVE_SETTINGS':
      settings = { ...DEFAULT_SETTINGS, ...message.settings };
      durations = {
        focus:      settings.focusMinutes      * 60,
        shortBreak: settings.shortBreakMinutes * 60,
        longBreak:  settings.longBreakMinutes  * 60
      };
      browser.storage.local.set({ settings });
      // Update timeLeft if timer is idle so the new duration shows immediately
      if (!state.isRunning) {
        state.timeLeft = durations[state.phase];
      }
      broadcastState();
      sendResponse({ ok: true });
      break;
  }

  return true;
});

setInterval(tick, 1000);
