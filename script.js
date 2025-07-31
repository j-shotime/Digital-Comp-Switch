import { customHTML } from './pages/custom.js';
import { calculatorHTML } from './pages/calculator.js';
import { matchHTML } from './pages/match.js';
import { switchHTML } from './pages/switch.js';
import { skillsHTML } from './pages/skills.js';

function loadCSS(href) {
  const link = document.getElementById('dynamic-css');
  if (link) {
    link.href = href;
  } else {
    const newLink = document.createElement('link');
    newLink.id = 'dynamic-css';
    newLink.rel = 'stylesheet';
    newLink.href = href;
    document.head.appendChild(newLink);
  }
}

export function navigate(page) {
  const content = document.getElementById('content');
  const buttons = document.querySelectorAll('.bottom-nav button');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (buttons[page]) buttons[page].classList.add('active');

  switch (page) {
    case 0:
      content.innerHTML = customHTML;
      loadCSS('pages/custom.css');
      break;
    case 1:
      content.innerHTML = skillsHTML;
      loadCSS('pages/skills.css');
      break;
    case 2:
      content.innerHTML = matchHTML;
      loadCSS('pages/match.css');
      prepMatch();
      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.addEventListener('click', () => {
          toggleMatch(); // global function from javascript/match.js
        });
      }
      break;
    case 3:
      content.innerHTML = switchHTML;
      loadCSS('pages/switch.css');
      break;
    case 4:
      content.innerHTML = calculatorHTML;
      loadCSS('pages/calculator.css');
      break;
    default:
      content.innerHTML = "<h1>404</h1><p>Page not found.</p>";
  }
}

window.addEventListener('DOMContentLoaded', () => navigate(3));
window.navigate = navigate;
