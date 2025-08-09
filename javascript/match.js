targetTime = 105;
time = 0;

const tick = () => {
  if(timeOutput === null) 
  {
    startTime = Date.now();
    timeOutput = document.querySelector('#output');
  }
  time = Math.floor((Date.now() - startTime) / 1000);
  timeOutput.textContent = formatTime(targetTime - time);
  setProgress(((targetTime - (Date.now() - startTime) / 1000) / targetTime) * 100);
  // Loop us around
  requestAnimationFrame(tick);
}

window.toggleMatch = function() 
{
  start();
};

function start()
{
  startTime = Date.now();
  tick();
}

function prepMatch() {
  targetTime = 105; // seconds
  time = 0;
  timeOutput = document.querySelector('#output');
  timeOutput.textContent = formatTime(targetTime - time);
  startTime = null;
}

function setProgress(percent) {
  percent = Math.max(0, Math.min(100, percent)); // Clamp 0-100

  const inner = document.getElementById('inner-ring');
  const middle = document.getElementById('middle-ring');
  const outer = document.getElementById('outer-ring');
  const text = document.getElementById('progress-text');

  // Update conic gradients
  inner.style.background = `conic-gradient(#c61d32 ${percent}%, transparent 0), radial-gradient(closest-side, #414042 86%, #763e43 86.2%)`;
  middle.style.background = `conic-gradient(#b71c2d ${percent}%, #414042 0)`;
  outer.style.background = `conic-gradient(#c61d32 ${percent}%, transparent 0), radial-gradient(closest-side, #763e43 96%, #414042 96.2%)`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
