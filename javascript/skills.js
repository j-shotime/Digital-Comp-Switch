// Skills timer module (pause/resume, smooth progress)
let targetTime = 60; // seconds
let startTime = null; // timestamp in ms
let timeOutput = null;
let accumulatedMs = 0; // ms already elapsed when paused
const _listeners = new Set();
let rafId = null;

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

  if (remainingMs <= 0) {
    accumulatedMs = targetMs;
    startTime = null;
    rafId = null;
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
  notifyState(true);
  rafId = requestAnimationFrame(tickSkills);
}

export function prepSkills() {
  targetTime = 60; // seconds
  timeOutput = document.querySelector('#output');
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  setProgressSkills(100);
  startTime = null;
  accumulatedMs = 0;
  // Wire color switch: toggle .blue-theme on the skills view and repaint
  // Previously we allowed the color switch to change a blue-theme which
  // affected progress colors. That behavior has been reverted: the
  // progress painter now uses fixed colors. Keep the switch present in the
  // DOM for UI parity but do not wire it to change progress colors.
  // eslint-disable-next-line no-console
  console.log('prepSkills: initialized (color switch no longer repaints progress)');
}

export function reset() {
  accumulatedMs = 0;
  startTime = null;
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  setProgressSkills(100);
  notifyState(false);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
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
  // Use fixed palette for progress rings (pre-palette implementation)
  const primary = '#c61d32';
  const middleColor = '#b71c2d';
  const ringAccent = '#763e43';
  const ringEdge = '#414042';
  // Update conic gradients if elements exist using fixed colors
  if (inner) inner.style.background = `conic-gradient(${primary} ${percent}%, transparent 0), radial-gradient(closest-side, ${ringEdge} 86%, ${ringAccent} 86.2%)`;
  if (middle) middle.style.background = `conic-gradient(${middleColor} ${percent}%, ${ringEdge} 0)`;
  if (outer) outer.style.background = `conic-gradient(${primary} ${percent}%, transparent 0), radial-gradient(closest-side, ${ringAccent} 96%, ${ringEdge} 96.2%)`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

