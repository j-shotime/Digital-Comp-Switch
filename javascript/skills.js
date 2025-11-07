// Skills timer module (pause/resume, smooth progress)
let targetTime = 60; // seconds
let startTime = null; // timestamp in ms
let timeOutput = null;
let accumulatedMs = 0; // ms already elapsed when paused
const _listeners = new Set();
let rafId = null;
let warningPlayed = false; // play 15s warning once per run
let fallbackIntervalId = null; // background fallback so timers progress when tab not visible
let warnTimeoutId = null; // precise scheduled warning
let endTimeoutId = null;  // precise scheduled completion tick

function notifyState(running) {
  _listeners.forEach(cb => {
    try { cb(running); } catch (e) { /* ignore listener errors */ }
  });
}

const tickSkills = (now) => {
  if (!startTime) startTime = now;
  if (!timeOutput) timeOutput = document.querySelector('#output');

  const targetMs = targetTime * 1000;
  const elapsedMs = accumulatedMs + (now - startTime);
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  if (timeOutput) timeOutput.textContent = formatTime(remainingSeconds);

  const percent = (remainingMs / targetMs) * 100;
  setProgressSkills(percent);

  // Play warning at 15 seconds remaining once per run
  if (!warningPlayed && remainingMs > 0 && remainingMs <= 15000) {
    try { window.playWarningSound ? window.playWarningSound() : null; } catch (e) { /* ignore */ }
    warningPlayed = true;
  }

  if (remainingMs <= 0) {
    accumulatedMs = targetMs;
    startTime = null;
    rafId = null;
    if (fallbackIntervalId) { clearInterval(fallbackIntervalId); fallbackIntervalId = null; }
    if (warnTimeoutId) { clearTimeout(warnTimeoutId); warnTimeoutId = null; }
    if (endTimeoutId) { clearTimeout(endTimeoutId); endTimeoutId = null; }
    notifyState(false);
    return;
  }

  rafId = requestAnimationFrame(tickSkills);
};

export function toggleSkills() {
  if (isRunning()) {
    const now = performance.now();
    accumulatedMs += now - startTime;
    startTime = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    notifyState(false);
  } else {
    startSkills();
  }
}

function startSkills() {
  startTime = performance.now();
  if (accumulatedMs >= targetTime * 1000) accumulatedMs = 0;
  // If this is a fresh start, reset warning flag
  if (accumulatedMs === 0) warningPlayed = false;
  notifyState(true);
  rafId = requestAnimationFrame(tickSkills);
  schedulePreciseTimers();
  ensureFallbackTimer();
}

export function prepSkills() {
  targetTime = 60; // seconds
  timeOutput = document.querySelector('#output');
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  setProgressSkills(100);
  startTime = null;
  accumulatedMs = 0;
  warningPlayed = false;
  // Wire color switch: toggle .blue-theme and repaint to trigger CSS transitions
  const switchEl = document.getElementById('color-switch');
  const skillsView = document.querySelector('.skills-view');
  function currentPercent() {
    const targetMs = targetTime * 1000;
    let elapsed = accumulatedMs;
    if (startTime) elapsed += (performance.now() - startTime);
    const remainingMs = Math.max(0, targetMs - elapsed);
    return (remainingMs / targetMs) * 100;
  }
  function applyTheme(checked) {
    if (!skillsView) return;
    if (checked) skillsView.classList.add('blue-theme'); else skillsView.classList.remove('blue-theme');
    // Repaint rings with current percent so CSS background transitions animate
    setProgressSkills(currentPercent());
  }
  if (switchEl) {
    applyTheme(switchEl.checked);
    switchEl.addEventListener('change', (e) => {
      try { applyTheme(e.target.checked); } catch (err) { /* ignore */ }
    });
  }
}

export function reset() {
  accumulatedMs = 0;
  startTime = null;
  warningPlayed = false;
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  setProgressSkills(100);
  notifyState(false);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (fallbackIntervalId) {
    clearInterval(fallbackIntervalId);
    fallbackIntervalId = null;
  }
  if (warnTimeoutId) { clearTimeout(warnTimeoutId); warnTimeoutId = null; }
  if (endTimeoutId) { clearTimeout(endTimeoutId); endTimeoutId = null; }
}

export function isRunning() {
  return startTime !== null;
}

export function onStateChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function isActive() {
  const targetMs = targetTime * 1000;
  return (startTime !== null) || (accumulatedMs > 0 && accumulatedMs < targetMs);
}

export function isCompleted() {
  const targetMs = targetTime * 1000;
  return accumulatedMs >= targetMs;
}

function setProgressSkills(percent) {
  percent = Math.max(0, Math.min(100, percent)); // Clamp 0-100
  const inner = document.getElementById('inner-ring');
  const middle = document.getElementById('middle-ring');
  const outer = document.getElementById('outer-ring');
  try {
    const p = `${percent}%`;
    if (inner) inner.style.setProperty('--p', p);
    if (middle) middle.style.setProperty('--p', p);
    if (outer) outer.style.setProperty('--p', p);
  } catch (e) {
    // Fallback inline painter if CSS vars unsupported
    const isBlue = !!document.querySelector('.skills-view.blue-theme');
    const primary = isBlue ? '#1e90ff' : '#c61d32';
    const middleColor = isBlue ? '#1777d6' : '#b71c2d';
    const ringAccent = isBlue ? '#125fa8' : '#763e43';
    const ringEdge = '#414042';
    if (inner) inner.style.background = `conic-gradient(${primary} ${percent}%, transparent 0), radial-gradient(closest-side, ${ringEdge} 86%, ${ringAccent} 86.2%)`;
    if (middle) middle.style.background = `conic-gradient(${middleColor} ${percent}%, ${ringEdge} 0)`;
    if (outer) outer.style.background = `conic-gradient(${primary} ${percent}%, transparent 0), radial-gradient(closest-side, ${ringAccent} 96%, ${ringEdge} 96.2%)`;
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function schedulePreciseTimers() {
  // Clear any existing timers
  if (warnTimeoutId) { clearTimeout(warnTimeoutId); warnTimeoutId = null; }
  if (endTimeoutId) { clearTimeout(endTimeoutId); endTimeoutId = null; }
  if (!isRunning()) return;
  const targetMs = targetTime * 1000;
  const now = performance.now();
  const elapsed = accumulatedMs + (now - startTime);
  const remainingMs = Math.max(0, targetMs - elapsed);
  const endIn = remainingMs;
  const warnIn = Math.max(0, remainingMs - 15000);
  // schedule warning if still ahead
  if (!warningPlayed && remainingMs > 15000) {
    warnTimeoutId = setTimeout(() => {
      try { window.playWarningSound ? window.playWarningSound() : null; } catch (e) { /* ignore */ }
      warningPlayed = true;
    }, warnIn);
  } else if (!warningPlayed && remainingMs > 0 && remainingMs <= 15000) {
    try { window.playWarningSound ? window.playWarningSound() : null; } catch (e) { /* ignore */ }
    warningPlayed = true;
  }
  // schedule a precise end tick to trigger completion exactly on time
  endTimeoutId = setTimeout(() => { tickSkills(now + endIn); }, endIn);
}

function ensureFallbackTimer() {
  // Only run interval when tab is hidden; rAF handles visible case
  if (document.hidden) {
    if (!fallbackIntervalId) {
      fallbackIntervalId = setInterval(() => { tickSkills(performance.now()); }, 250);
    }
  } else if (fallbackIntervalId) {
    clearInterval(fallbackIntervalId);
    fallbackIntervalId = null;
  }
}

// Keep fallback aligned with visibility changes
document.addEventListener('visibilitychange', () => {
  if (isRunning()) ensureFallbackTimer(); else if (fallbackIntervalId) { clearInterval(fallbackIntervalId); fallbackIntervalId = null; }
});

