export const matchHTML = `
  <div class="match-view">
    <h1>Match</h1>
    <div class="container">
      <svg id="track-svg" class="track-svg" width="300" height="300" viewBox="0 0 300 300">
        <circle cx="150" cy="150" r="137.5" stroke="#59595c" stroke-width="17.5" fill="none" />
        <circle class="rails" cx="150" cy="150" r="142.5" stroke="#763e43" stroke-width="2" fill="none" />
        <circle class="rails" cx="150" cy="150" r="132.5" stroke="#763e43" stroke-width="2" fill="none" />
      </svg>
      <div id="inner-ring" class="progress-bar inner"></div>
      <div id="middle-ring" class="progress-bar middle"></div>
      <div id="outer-ring" class="progress-bar outer"></div>
      <p id="output">0%</p>
    </div>
    <button id="start-button">Start</button>
  </div>
`;
