let targetTime = 105; // seconds
let startTime = null; // timestamp in ms
let timeOutput = null;
let accumulatedMs = 0; // ms already elapsed when paused
const _listeners = new Set();
let rafId = null;
let warningPlayed = false; // ensure 15s warning plays once per run

function notifyState(running) {
  _listeners.forEach(cb => {
    try { cb(running); } catch (e) { /* ignore listener errors */ }
  });
}

const tickMatch = (now) => {
  if (!startTime) startTime = now;
  if (!timeOutput) timeOutput = document.querySelector('#output');

  const targetMs = targetTime * 1000;
  const elapsedMs = accumulatedMs + (now - startTime);
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  // update displayed time (in seconds)
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  if (timeOutput) timeOutput.textContent = formatTime(remainingSeconds);

  // smooth progress: percent remaining (100 -> 0)
  const percent = (remainingMs / targetMs) * 100;
  setProgressMatch(percent);

  // Play warning at 15 seconds remaining once per run
  if (!warningPlayed && remainingMs > 0 && remainingMs <= 15000) {
    try {
      const audio = new Audio('audio/warning.wav');
      audio.currentTime = 0;
      audio.play().catch(() => { /* ignore autoplay/other play issues */ });
    } catch (e) { /* ignore */ }
    warningPlayed = true;
  }

  if (remainingMs <= 0) {
    // complete
    accumulatedMs = targetMs;
    startTime = null;
    rafId = null;
    notifyState(false);
    return;
  }

  rafId = requestAnimationFrame(tickMatch);
};

export function toggleMatch() {
  if (isRunning()) {
    // pause: accumulate elapsed ms
    const now = performance.now();
    accumulatedMs += now - startTime;
    startTime = null;
    // cancel animation frame so tick doesn't restart
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // notify paused (not running) so nav re-enables
    notifyState(false);
  } else {
    // resume or start
    startMatch();
  }
}

function startMatch() {
  startTime = performance.now();
  // if starting fresh, ensure accumulated is 0
  if (accumulatedMs >= targetTime * 1000) accumulatedMs = 0;
  // Reset warning flag on fresh start
  if (accumulatedMs === 0) warningPlayed = false;
  notifyState(true);
  rafId = requestAnimationFrame(tickMatch);
}

export function prepMatch() {
  targetTime = 105; // seconds
  timeOutput = document.querySelector('#output');
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  // set progress to full
  setProgressMatch(100);
  startTime = null;
  accumulatedMs = 0;
  warningPlayed = false;
}

export function reset() {
  accumulatedMs = 0;
  startTime = null;
  warningPlayed = false;
  if (timeOutput) timeOutput.textContent = formatTime(targetTime);
  setProgressMatch(100);
  // ensure listeners know timer inactive
  notifyState(false);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function isRunning() {
  return startTime !== null;
}

export function isActive() {
  // active means running or paused but not completed
  const targetMs = targetTime * 1000;
  return (startTime !== null) || (accumulatedMs > 0 && accumulatedMs < targetMs);
}

export function isCompleted() {
  const targetMs = targetTime * 1000;
  return accumulatedMs >= targetMs;
}

export function onStateChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function setProgressMatch(percent) {
  percent = Math.max(0, Math.min(100, percent)); // Clamp 0-100
  const inner = document.getElementById('inner-ring');
  const middle = document.getElementById('middle-ring');
  const outer = document.getElementById('outer-ring');
  if (inner) inner.style.background = `conic-gradient(#c61d32 ${percent}%, transparent 0), radial-gradient(closest-side, #414042 86%, #763e43 86.2%)`;
  if (middle) middle.style.background = `conic-gradient(#b71c2d ${percent}%, #414042 0)`;
  if (outer) outer.style.background = `conic-gradient(#c61d32 ${percent}%, transparent 0), radial-gradient(closest-side, #763e43 96%, #414042 96.2%)`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
