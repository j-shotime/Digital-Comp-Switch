import { customHTML } from './pages/custom.js';
import { calculatorHTML } from './pages/calculator.js';
import { matchHTML } from './pages/match.js';
import { switchHTML } from './pages/switch.js';
import { skillsHTML } from './pages/skills.js';

// Simple contract:
// - Input: navigate(pageIndex:number)
// - Output: loads corresponding CSS and injects HTML into #content
// - Error modes: invalid page -> 404 markup

const pages = [
  { html: customHTML, css: 'pages/custom.css' },
  { html: skillsHTML, css: 'pages/skills.css' },
  { html: matchHTML, css: 'pages/match.css' },
  { html: switchHTML, css: 'pages/switch.css' },
  { html: calculatorHTML, css: 'pages/calculator.css' }
];

const loadedStyles = new Map();
const moduleCache = new Map();
let currentPageIndex = null;
let currentStateUnsubscribe = null;
// Web Serial pairing state
let isPaired = false;
let serialPort = null;
// cache last mode (0=driver/red, 1=autonomous/blue) for Skills to preserve mode when disabling
let skillsLastModeBit = 0;

// play short start sound on user-initiated start/resume clicks
function playStartSound() {
  try {
    const audio = new Audio('audio/start.wav');
    audio.currentTime = 0;
    // Fire and forget; browsers allow this on user gesture
    audio.play().catch(() => { /* ignore autoplay/other play issues */ });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('start sound failed', e);
  }
}

// play short pause sound on user-initiated pause clicks
function playPauseSound() {
  try {
    const audio = new Audio('audio/pause.wav');
    audio.currentTime = 0;
    audio.play().catch(() => { /* ignore autoplay/other play issues */ });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('pause sound failed', e);
  }
}

// play stop sound when a timer completes
function playStopSound() {
  try {
    const audio = new Audio('audio/stop.wav');
    audio.currentTime = 0;
    audio.play().catch(() => { /* ignore autoplay/other play issues */ });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('stop sound failed', e);
  }
}

function setPaired(val) {
  isPaired = !!val;
  updatePairingUI(currentPageIndex);
}

async function tryWebSerialPair() {
  if (!('serial' in navigator)) {
    alert('Web Serial is not supported in this browser. Use Chrome/Edge on localhost/https.');
    return;
  }
  try {
    const port = await navigator.serial.requestPort({});
    await port.open({ baudRate: 9600 });
    serialPort = port;
    setPaired(true);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Pair canceled or failed', e);
    setPaired(false);
  }
}

function initSerial() {
  if (!('serial' in navigator)) { setPaired(false); return; }
  try {
    navigator.serial.addEventListener('disconnect', async () => {
      try { if (serialPort) await serialPort.close(); } catch {}
      serialPort = null;
      setPaired(false);
    });
    navigator.serial.addEventListener('connect', () => {
      // Device connected; we still consider paired only after open
    });
    navigator.serial.getPorts().then(async ports => {
      if (ports && ports.length) {
        try {
          const port = ports[0];
          if (!port.readable) await port.open({ baudRate: 9600 });
          serialPort = port;
          setPaired(true);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Auto-open serial failed', e);
          setPaired(false);
        }
      } else {
        setPaired(false);
      }
    });
  } catch (e) {
    setPaired(false);
  }
}

// Compose and send a byte compatible with the Switch tab protocol:
// bit0 = enable (1=enabled), bit1 = mode (0=driver/red, 1=autonomous/blue)
async function sendSwitchState(enableBit, modeBit) {
  try {
    if (!serialPort || !serialPort.writable) return;
    const writer = serialPort.writable.getWriter();
    const byte = ((modeBit & 1) << 1) | (enableBit & 1);
    await writer.write(new Uint8Array([byte]));
    writer.releaseLock();
    // eslint-disable-next-line no-console
    console.log('Sent switch byte:', byte);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('sendSwitchState failed', e);
  }
}

function getSkillsModeBit() {
  const skillsView = document.querySelector('.skills-view');
  // blue theme -> autonomous
  return (skillsView && skillsView.classList.contains('blue-theme')) ? 1 : 0;
}

// Expose shared serial helpers to other modules/pages (e.g., Switch tab)
window.tryWebSerialPair = tryWebSerialPair;
window.sendSwitchState = sendSwitchState;
window.getSerialPort = () => serialPort;

function updatePairingUI(pageIndex) {
  if (pageIndex == null) return;
  const scope = (pageIndex === 1) ? document.querySelector('.skills-view')
              : (pageIndex === 2) ? document.querySelector('.match-view')
              : null;
  if (!scope) return;
  const output = scope.querySelector('#output');
  const pairBtn = scope.querySelector('#pair-button');
  const startBtn = scope.querySelector('#start-button');
  if (pairBtn) {
    pairBtn.style.display = isPaired ? 'none' : 'inline-block';
    // ensure click wires to Web Serial pairing when visible
    pairBtn.onclick = () => tryWebSerialPair();
  }
  if (output) output.style.display = isPaired ? 'block' : 'none';
  // Disable Start/Resume when not paired to prevent running without a device
  if (startBtn) {
    if (isPaired) {
      startBtn.disabled = false;
      startBtn.style.pointerEvents = 'auto';
      startBtn.removeAttribute('aria-disabled');
      startBtn.title = '';
    } else {
      startBtn.disabled = true;
      startBtn.style.pointerEvents = 'none';
      startBtn.setAttribute('aria-disabled', 'true');
      startBtn.title = 'Pair a device to start';
    }
  }
}

function setNavDisabled(disabled, ownerPageIndex) {
  const buttons = document.querySelectorAll('.bottom-nav button');
  buttons.forEach((btn, idx) => {
    if (idx === ownerPageIndex) return; // leave current page button alone
    if (disabled) {
      btn.classList.add('disabled');
      btn.setAttribute('aria-disabled', 'true');
      btn.disabled = true;
    } else {
      btn.classList.remove('disabled');
      btn.removeAttribute('aria-disabled');
      btn.disabled = false;
    }
  });
}

function loadCSS(href) {
  // If active already matches href, nothing to do
  const active = document.querySelector('link[data-active-style]');
  if (active && active.getAttribute('data-href') === href) return;

  // Disable current
  if (active) {
    active.disabled = true;
    active.removeAttribute('data-active-style');
  }

  // Reuse cached link if present
  if (loadedStyles.has(href)) {
    const link = loadedStyles.get(href);
    link.disabled = false;
    link.setAttribute('data-active-style', 'true');
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // store a simple marker for comparisons (href can be resolved to absolute URL by browser)
  link.setAttribute('data-href', href);
  link.setAttribute('data-active-style', 'true');
  document.head.appendChild(link);
  loadedStyles.set(href, link);
}

// Safe helper to wire page-specific startup without throwing if global functions aren't present
function safeInit(funcName, ...args) {
  try {
    const fn = window[funcName];
    if (typeof fn === 'function') fn(...args);
  } catch (err) {
    // swallow errors to keep navigation working; developer can open console
    // but still log a helpful message for debugging
    // eslint-disable-next-line no-console
    console.warn(`safeInit: ${funcName} failed:`, err);
  }
}

export function navigate(pageIndex) {
  // debug: navigation invoked
  // eslint-disable-next-line no-console
  console.log('navigate called', pageIndex);
  // If trying to navigate to the page we're already on, no-op
  if (pageIndex === currentPageIndex) return;

  // If there's a running timer on the current page, prevent navigation
  if (currentPageIndex !== null && currentPageIndex !== pageIndex) {
    const cached = moduleCache.get(currentPageIndex);
    if (cached && typeof cached.isRunning === 'function' && cached.isRunning()) {
      // simple user feedback; could be replaced with custom UI
      alert('Timer is running — stop the timer before switching pages.');
      return;
    }
  }

  const content = document.getElementById('content');
  const buttons = document.querySelectorAll('.bottom-nav button');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (buttons[pageIndex]) buttons[pageIndex].classList.add('active');

  const page = pages[pageIndex];
  if (!page) {
    content.innerHTML = '<h1>404</h1><p>Page not found.</p>';
    return;
  }

  loadCSS(page.css);

  requestAnimationFrame(() => {
    content.innerHTML = page.html;

    // Ensure Start is visible by default for timer pages (safety net)
    if (pageIndex === 1 || pageIndex === 2) {
      const sb = document.getElementById('start-button');
      const rb = document.getElementById('reset-button');
      if (sb) {
        sb.style.display = 'inline-block';
        sb.textContent = 'Start';
        sb.disabled = false;
        sb.style.pointerEvents = 'auto';
      }
      if (rb) {
        rb.style.display = 'none';
      }
    }

    // Quick pre-wiring: add lightweight click logs so clicks register even if dynamic import fails.
    // This helps detect whether clicks are being intercepted by a DOM overlay vs event wiring missing.
    try {
      if (pageIndex === 1) {
        const preStart = document.getElementById('start-button');
        const preReset = document.getElementById('reset-button');
        if (preStart) {
          preStart.addEventListener('click', () => { console.log('pre-start click (no module yet)'); });
          // fallback: if module never loads, call global fallback
          preStart.addEventListener('click', () => {
            if (!moduleCache.has(pageIndex)) {
              // eslint-disable-next-line no-console
              console.warn('Fallback: module not loaded yet, calling global toggleSkills');
              safeInit('toggleSkills');
            }
          });
        }
        if (preReset) preReset.addEventListener('click', () => { console.log('pre-reset click (no module yet)'); });
      }
    } catch (e) {
      // ignore DOM attachment errors
    }

    // If the dynamic import for the skills module didn't resolve for some reason,
    // try again after a short delay and log results. This helps recover from
    // transient loading issues on some servers.
    if (pageIndex === 1) {
      setTimeout(() => {
        if (!moduleCache.has(pageIndex)) {
          // eslint-disable-next-line no-console
          console.log('Attempting re-import of skills module...');
          import('./javascript/skills.js').then(mod => {
            // eslint-disable-next-line no-console
            console.log('Re-import succeeded', Object.keys(mod));
            moduleCache.set(pageIndex, mod);
            if (typeof mod.prepSkills === 'function') mod.prepSkills();
          }).catch(err => {
            // eslint-disable-next-line no-console
            console.error('Re-import of skills module failed', err);
          });
        }
      }, 500);
    }

    // initialize page-specific behavior using safeInit.
    // prepMatch/prepSkills and toggleMatch/toggleSkills are provided by legacy scripts
    // track current page
    currentPageIndex = pageIndex;

  // Apply pairing UI state to the freshly injected view
  updatePairingUI(pageIndex);

    if (pageIndex === 2) {
      // dynamically import match module and initialize
      import('./javascript/match.js').then(mod => {
        moduleCache.set(pageIndex, mod);
        if (typeof mod.prepMatch === 'function') mod.prepMatch();
        // safety enforcement after wiring: ensure completed state hides Start
        setTimeout(() => {
          try {
            if (typeof mod.isCompleted === 'function' && mod.isCompleted()) {
              const sb = document.getElementById('start-button');
              const rb = document.getElementById('reset-button');
              if (sb) { sb.style.display = 'none'; sb.disabled = true; sb.style.pointerEvents = 'none'; }
              if (rb) { rb.style.display = 'inline-block'; }
            }
          } catch (e) { /* ignore */ }
        }, 120);
  const startButton = document.getElementById('start-button');
  const resetButton = document.getElementById('reset-button');
  const matchControlsEl = document.querySelector('.match-view .controls');
  if (matchControlsEl) matchControlsEl.setAttribute('data-reset-hidden', 'true');
  // Also wire Pair button
  const pairBtn = document.getElementById('pair-button');
  if (pairBtn) pairBtn.onclick = () => tryWebSerialPair();

        if (startButton) {
          startButton.onclick = () => {
            const label = (startButton.textContent || '').toLowerCase();
            const isStarting = label.includes('start') || label.includes('resume');
            const isPausing = label.includes('pause');
            if (isStarting) playStartSound();
            else if (isPausing) playPauseSound();
            if (typeof mod.toggleMatch === 'function') mod.toggleMatch();
          };
          startButton.style.display = 'inline-block';
          startButton.textContent = (typeof mod.isRunning === 'function' && mod.isRunning()) ? 'Pause' : 'Start';
        }

        if (resetButton) {
          resetButton.onclick = () => {
            if (typeof mod.reset === 'function') mod.reset();
            if (startButton) {
              startButton.style.display = 'inline-block';
              startButton.textContent = 'Start';
              // Re-enable based on pairing state after reset
              startButton.disabled = !isPaired;
              startButton.style.pointerEvents = isPaired ? 'auto' : 'none';
            }
            resetButton.style.display = 'none';
            const ctrl = document.querySelector('.match-view .controls');
            if (ctrl) ctrl.classList.remove('completed-no-start');
            // Re-apply pairing UI to ensure Start state matches pairing
            updatePairingUI(pageIndex);
          };
        }

        // Subscribe to running state
        if (typeof mod.onStateChange === 'function') {
          // Track whether we've already played the stop sound for this session
          let hasPlayedStopSound = (typeof mod.isCompleted === 'function' && mod.isCompleted());
          if (currentStateUnsubscribe) currentStateUnsubscribe();
          currentStateUnsubscribe = mod.onStateChange(running => {
            setNavDisabled(running, pageIndex);
            const completed = (typeof mod.isCompleted === 'function' && mod.isCompleted());
            // Serial: for Skills only, but here is Match block so skip
            if (completed && !hasPlayedStopSound) { playStopSound(); hasPlayedStopSound = true; }
            if (!completed) { hasPlayedStopSound = false; }
            if (completed) {
              if (startButton) {
                startButton.style.display = 'none';
                startButton.disabled = true;
                startButton.style.pointerEvents = 'none';
                // ensure CSS-level hide so JS race can't bring it back
                if (matchControlsEl) matchControlsEl.classList.add('completed-no-start');
              }
              if (resetButton) {
                resetButton.style.display = 'inline-block';
                if (matchControlsEl) matchControlsEl.removeAttribute('data-reset-hidden');
              }
            } else if (running) {
              if (startButton) {
                startButton.style.display = 'inline-block';
                startButton.textContent = 'Pause';
                startButton.disabled = false; // running -> start shows as Pause; ensure enabled
                startButton.style.pointerEvents = 'auto';
                if (matchControlsEl) matchControlsEl.classList.remove('completed-no-start');
              }
              // while running, hide Reset
              if (resetButton) {
                resetButton.style.display = 'none';
                if (matchControlsEl) matchControlsEl.setAttribute('data-reset-hidden', 'true');
              }
            } else {
              if (startButton) {
                startButton.style.display = 'inline-block';
                const active = (typeof mod.isActive === 'function' && mod.isActive());
                startButton.textContent = active ? 'Resume' : 'Start';
                // paused & not completed: enable based on pairing
                startButton.disabled = !isPaired;
                startButton.style.pointerEvents = isPaired ? 'auto' : 'none';
                if (matchControlsEl) matchControlsEl.classList.remove('completed-no-start');
              }
              // paused: show Reset if the timer is active (was started)
              if (resetButton) {
                const show = mod.isActive();
                resetButton.style.display = show ? 'inline-block' : 'none';
                if (matchControlsEl) {
                  if (show) matchControlsEl.removeAttribute('data-reset-hidden'); else matchControlsEl.setAttribute('data-reset-hidden', 'true');
                }
              }
            }
            // enforce pairing gating on Start each state change
            updatePairingUI(pageIndex);
          });

          // apply initial state
          const running = (typeof mod.isRunning === 'function' && mod.isRunning());
          const completed = (typeof mod.isCompleted === 'function' && mod.isCompleted());
          setNavDisabled(running, pageIndex);
          if (completed) {
            if (startButton) {
              startButton.style.display = 'none';
              startButton.disabled = true;
              startButton.style.pointerEvents = 'none';
              if (matchControlsEl) matchControlsEl.classList.add('completed-no-start');
            }
            if (resetButton) resetButton.style.display = 'inline-block';
          } else {
            if (startButton) {
              startButton.style.display = 'inline-block';
              startButton.textContent = running ? 'Pause' : 'Start';
            }
            // Show Reset when paused (active but not running), otherwise hide
            if (resetButton) resetButton.style.display = ((mod.isActive() && !running) ? 'inline-block' : 'none');
          }
        }
      }).catch(err => {
        // fallback to global if dynamic import fails
        safeInit('prepMatch');
        const startButton = document.getElementById('start-button');
        if (startButton) startButton.addEventListener('click', () => safeInit('toggleMatch'));
      });
    } else if (pageIndex === 1) {
      // dynamically import skills module and initialize
      import('./javascript/skills.js').then(mod => {
        moduleCache.set(pageIndex, mod);
        if (typeof mod.prepSkills === 'function') mod.prepSkills();
        // safety enforcement after wiring: ensure completed state hides Start
        setTimeout(() => {
          try {
            if (typeof mod.isCompleted === 'function' && mod.isCompleted()) {
              const sb = document.getElementById('start-button');
              const rb = document.getElementById('reset-button');
              const ctrl = document.querySelector('.skills-view .controls');
              if (sb) { sb.style.display = 'none'; sb.disabled = true; sb.style.pointerEvents = 'none'; }
              if (rb) { rb.style.display = 'inline-block'; if (ctrl) ctrl.removeAttribute('data-reset-hidden'); }
            }
          } catch (e) { /* ignore */ }
        }, 120);
        // debug: confirm module exports and that wiring is happening
        // eslint-disable-next-line no-console
        console.log('navigate: skills module loaded', Object.keys(mod));
        // wire color switch enable/disable: only switchable in basic state
        const colorSwitch = document.getElementById('color-switch');
        if (colorSwitch) {
          const setSwitchState = () => {
            const active = (typeof mod.isActive === 'function' && mod.isActive());
            const completed = (typeof mod.isCompleted === 'function' && mod.isCompleted());
            const basic = !active && !completed;
            colorSwitch.disabled = !basic;
            if (basic) colorSwitch.removeAttribute('aria-disabled'); else colorSwitch.setAttribute('aria-disabled', 'true');
          };
          setSwitchState();
          // will be updated in onStateChange below
        }
        const startButton = document.getElementById('start-button');
        const resetButton = document.getElementById('reset-button');
        // ensure controls accept pointer events and start with Reset hidden
        const controlsEl = document.querySelector('.skills-view .controls');
        if (controlsEl) {
          controlsEl.style.pointerEvents = 'auto';
          controlsEl.setAttribute('data-reset-hidden', 'true');
        }
  // Also wire Pair button
  const pairBtn = document.getElementById('pair-button');
  if (pairBtn) pairBtn.onclick = () => tryWebSerialPair();
        if (startButton) {
          // safer wiring: log clicks and call module function if present
          startButton.addEventListener('click', (e) => {
            // eslint-disable-next-line no-console
            console.log('start-button clicked (skills)');
            // ensure button isn't disabled
            startButton.disabled = false;
            startButton.style.pointerEvents = 'auto';
            const label = (startButton.textContent || '').toLowerCase();
            const isStarting = label.includes('start') || label.includes('resume');
            const isPausing = label.includes('pause');
            if (isStarting) playStartSound();
            else if (isPausing) playPauseSound();
            if (typeof mod.toggleSkills === 'function') {
              try { mod.toggleSkills(); } catch (err) { console.error('toggleSkills failed', err); }
            } else {
              // eslint-disable-next-line no-console
              console.warn('toggleSkills not available on skills module');
            }
          });
          startButton.textContent = (typeof mod.isRunning === 'function' && mod.isRunning()) ? 'Pause' : 'Start';
        }
        if (resetButton) {
          resetButton.addEventListener('click', () => {
            // eslint-disable-next-line no-console
            console.log('reset-button clicked (skills)');
            resetButton.disabled = false;
            resetButton.style.pointerEvents = 'auto';
            if (typeof mod.reset === 'function') {
              try { mod.reset(); } catch (err) { console.error('reset failed', err); }
            }
            if (startButton) {
              startButton.style.display = 'inline-block';
              startButton.textContent = 'Start';
              // Re-enable based on pairing state after reset
              startButton.disabled = !isPaired;
              startButton.style.pointerEvents = isPaired ? 'auto' : 'none';
            }
            resetButton.style.display = 'none';
            if (controlsEl) controlsEl.classList.remove('completed-no-start');
            // Re-apply pairing UI to ensure Start state matches pairing
            updatePairingUI(pageIndex);
          });
        }
        // Subscribe to running state
        if (typeof mod.onStateChange === 'function') {
          // Track stop sound so it's only played once per completion
          let hasPlayedStopSound = (typeof mod.isCompleted === 'function' && mod.isCompleted());
          if (currentStateUnsubscribe) currentStateUnsubscribe();
          currentStateUnsubscribe = mod.onStateChange(running => {
            setNavDisabled(running, pageIndex);
            const completed = (typeof mod.isCompleted === 'function' && mod.isCompleted());
            // update switch enabled state when state changes
            if (colorSwitch) {
              const active = (typeof mod.isActive === 'function' && mod.isActive());
              const basic = !active && !completed;
              colorSwitch.disabled = !basic;
              if (basic) colorSwitch.removeAttribute('aria-disabled'); else colorSwitch.setAttribute('aria-disabled', 'true');
            }
            if (completed && !hasPlayedStopSound) { playStopSound(); hasPlayedStopSound = true; }
            if (!completed) { hasPlayedStopSound = false; }
            // Serial signaling for Skills timer based on theme
            try {
              if (running) {
                // Timer started/resumed -> send enable with mode based on theme
                skillsLastModeBit = getSkillsModeBit();
                sendSwitchState(1, skillsLastModeBit);
              } else {
                // Timer paused/stopped/completed -> send disable (preserve last mode)
                sendSwitchState(0, skillsLastModeBit);
              }
            } catch (e) { /* ignore serial errors */ }
            if (completed) {
              if (startButton) {
                startButton.style.display = 'none';
                startButton.disabled = true;
                startButton.style.pointerEvents = 'none';
                // ensure CSS-level hide so JS race can't bring it back
                if (controlsEl) controlsEl.classList.add('completed-no-start');
              }
              if (resetButton) {
                resetButton.style.display = 'inline-block';
                if (controlsEl) controlsEl.removeAttribute('data-reset-hidden');
              }
            } else if (running) {
              if (startButton) {
                startButton.style.display = 'inline-block';
                startButton.textContent = 'Pause';
                startButton.disabled = false; // running -> Pause
                startButton.style.pointerEvents = 'auto';
                if (controlsEl) controlsEl.classList.remove('completed-no-start');
              }
              // while running, hide Reset
              if (resetButton) {
                resetButton.style.display = 'none';
                if (controlsEl) controlsEl.setAttribute('data-reset-hidden', 'true');
              }
            } else {
              if (startButton) {
                startButton.style.display = 'inline-block';
                const active = (typeof mod.isActive === 'function' && mod.isActive());
                startButton.textContent = active ? 'Resume' : 'Start';
                // paused & not completed: enable based on pairing
                startButton.disabled = !isPaired;
                startButton.style.pointerEvents = isPaired ? 'auto' : 'none';
                if (controlsEl) controlsEl.classList.remove('completed-no-start');
              }
              // paused: show Reset if the timer is active (was started)
              if (resetButton) {
                const show = mod.isActive();
                resetButton.style.display = show ? 'inline-block' : 'none';
                if (controlsEl) {
                  if (show) controlsEl.removeAttribute('data-reset-hidden'); else controlsEl.setAttribute('data-reset-hidden', 'true');
                }
              }
            }
            // enforce pairing gating on Start each state change
            updatePairingUI(pageIndex);
          });
          const running = (typeof mod.isRunning === 'function' && mod.isRunning());
          const completed = (typeof mod.isCompleted === 'function' && mod.isCompleted());
          setNavDisabled(running, pageIndex);
          if (completed) {
            if (startButton) {
              startButton.style.display = 'none';
              startButton.disabled = true;
              startButton.style.pointerEvents = 'none';
              if (controlsEl) controlsEl.classList.add('completed-no-start');
            }
            if (resetButton) resetButton.style.display = 'inline-block';
          } else {
            if (startButton) {
              startButton.style.display = 'inline-block';
              startButton.textContent = running ? 'Pause' : 'Start';
            }
            // Hide Reset when Start/Resume is visible
            if (resetButton) resetButton.style.display = 'none';
          }
        }
      }).catch(err => {
        // debug: import failed — log error and fallback to global
        // eslint-disable-next-line no-console
        console.error('navigate: failed to import ./javascript/skills.js', err);
        // fallback to global if dynamic import fails
        safeInit('prepSkills');
        const startButton = document.getElementById('start-button');
        if (startButton) startButton.addEventListener('click', () => {
          // eslint-disable-next-line no-console
          console.warn('toggleSkills fallback (global) invoked');
          safeInit('toggleSkills');
        });
      });
    }
  });
}

// Initial load
window.addEventListener('DOMContentLoaded', () => { initSerial(); navigate(3); });
window.navigate = navigate;
// debug: confirm loader module is running
// eslint-disable-next-line no-console
console.log('script.js module loaded.');
