import { customHTML } from './pages/custom.js';
import { calculatorHTML } from './pages/calculator.js';
import { matchHTML } from './pages/match.js';
import { switchHTML } from './pages/switch.js';
import { skillsHTML } from './pages/skills.js';

const loadedStyles = {}; // Cache of loaded <link> elements

function loadCSS(href) {
  // If the active stylesheet is already the requested one, do nothing
  const activeLink = document.querySelector('link[data-active-style]');
  if (activeLink && activeLink.href.includes(href)) return;

  // Disable current active style
  if (activeLink) {
    activeLink.disabled = true;
    activeLink.removeAttribute('data-active-style');
  }

  // Re-enable cached style if it exists
  if (loadedStyles[href]) {
    loadedStyles[href].disabled = false;
    loadedStyles[href].setAttribute('data-active-style', 'true');
    return;
  }

  // Otherwise, create a new <link> and cache it
  const newLink = document.createElement('link');
  newLink.rel = 'stylesheet';
  newLink.href = href;
  newLink.setAttribute('data-active-style', 'true');
  document.head.appendChild(newLink);
  loadedStyles[href] = newLink;
}

export function navigate(page) {
  const content = document.getElementById('content');
  const buttons = document.querySelectorAll('.bottom-nav button');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (buttons[page]) buttons[page].classList.add('active');

  let html = '';
  let cssPath = '';

  switch (page) {
    case 0:
      html = customHTML;
      cssPath = 'pages/custom.css';
      break;
    case 1:
      html = skillsHTML;
      cssPath = 'pages/skills.css';
      break;
    case 2:
      html = matchHTML;
      cssPath = 'pages/match.css';
      break;
    case 3:
      html = switchHTML;
      cssPath = 'pages/switch.css';
      break;
    case 4:
      html = calculatorHTML;
      cssPath = 'pages/calculator.css';
      break;
    default:
      content.innerHTML = "<h1>404</h1><p>Page not found.</p>";
      return;
  }

  // Load the CSS first
  loadCSS(cssPath);

  // Then inject the content
  requestAnimationFrame(() => {
    content.innerHTML = html;

    // Match page-specific behavior
    if (page === 2) {
      prepMatch();
      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.addEventListener('click', () => {
          toggleMatch(); // from javascript/match.js
        });
      }
    }
  });
}

// Initial load
window.addEventListener('DOMContentLoaded', () => navigate(3));
window.navigate = navigate;
