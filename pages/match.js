export const matchHTML = `
  <div class="match-view">
    <h1>Match</h1>
    <div class="container">
      <div id="border" class="circle"></div>
      <div id="inner-ring" class="progress-bar inner"></div>
      <div id="middle-ring" class="progress-bar middle"></div>
      <div id="outer-ring" class="progress-bar outer"></div>
      <div class="center-stack">
        <p id="output">1:45</p>
        <button id="pair-button" class="pair-btn" style="display:none;">Pair Device</button>
      </div>
    </div>
    <div class="controls">
      <button id="start-button">Start</button>
      <button id="reset-button" style="display:none;">Reset</button>
    </div>
  </div>
`;