// All sounds synthesized with Web Audio API — no external files needed.

const SOUND_OPTIONS = [
  { id: 'bell',       label: 'Bell' },
  { id: 'chime',      label: 'Chime' },
  { id: 'digital',    label: 'Digital Beep' },
  { id: 'softPing',   label: 'Soft Ping' },
  { id: 'gong',       label: 'Gong' },
  { id: 'marimba',    label: 'Marimba' }
];

let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new AudioContext();
    } catch (e) {
      return null;
    }
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function playSound(id) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  switch (id) {
    case 'bell':      playBell(ctx);      break;
    case 'chime':     playChime(ctx);     break;
    case 'digital':   playDigital(ctx);   break;
    case 'softPing':  playSoftPing(ctx);  break;
    case 'gong':      playGong(ctx);      break;
    case 'marimba':   playMarimba(ctx);   break;
    default:          playBell(ctx);
  }
}

// --- Individual sounds ---

function playBell(ctx) {
  // Classic bell: fundamental + harmonics with long decay
  [[440, 0.5], [880, 0.25], [1318, 0.15], [1760, 0.1]].forEach(([freq, amp]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    osc.start(t);
    osc.stop(t + 2.5);
  });
}

function playChime(ctx) {
  // Two-tone descending chime
  [[659, 0], [523, 0.35]].forEach(([freq, delay]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.start(t);
    osc.stop(t + 1.8);
  });
}

function playDigital(ctx) {
  // Two short square-wave beeps
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.value = 880;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.setValueAtTime(0,    t + 0.1);
  gain.gain.setValueAtTime(0.08, t + 0.18);
  gain.gain.setValueAtTime(0,    t + 0.28);
  osc.start(t);
  osc.stop(t + 0.3);
}

function playSoftPing(ctx) {
  // Gentle single sine ping
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = 660;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  osc.start(t);
  osc.stop(t + 1.2);
}

function playGong(ctx) {
  // Deep gong with inharmonic partials
  [[80, 0.6], [220, 0.3], [432, 0.15], [714, 0.08]].forEach(([freq, amp]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    osc.start(t);
    osc.stop(t + 3.5);
  });
}

function playMarimba(ctx) {
  // Ascending three-note marimba run
  [[523, 0], [659, 0.16], [784, 0.32]].forEach(([freq, delay]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.start(t);
    osc.stop(t + 0.7);
  });
}
