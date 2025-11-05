export const skillsHTML = `
  <div class="skills-view">
    <h1>Skills</h1>
    <div class="container">
      <div id="border" class="circle"></div>
      <div id="inner-ring" class="progress-bar inner"></div>
      <div id="middle-ring" class="progress-bar middle"></div>
      <div id="outer-ring" class="progress-bar outer"></div>
      <div class="center-stack">
        <p id="output">1:00</p>
        <button id="pair-button" class="pair-btn" style="display:none;">Pair Device</button>
      </div>
    </div>
      <!-- Switch centered under the timer text -->
      <div class="timer-switch">
        <label class="switch" aria-label="Color switch">
          <input id="color-switch" type="checkbox">
          <span class="slider"></span>
        </label>
      </div>
      <div class="controls">
        <button id="start-button">Start</button>
        <button id="reset-button" style="display:none;">Reset</button>
      </div>
  </div>
`;
