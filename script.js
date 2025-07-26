import { controlHTML } from './pages/control.js';
import { searchHTML } from './pages/search.js';
import { profileHTML } from './pages/profile.js';

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
      content.innerHTML = controlHTML;
      loadCSS('pages/control.css');
      break;
    case 1:
      content.innerHTML = searchHTML;
      loadCSS('pages/search.css');
      break;
    case 2:
      content.innerHTML = profileHTML;
      loadCSS('pages/profile.css');
      break;
    default:
      content.innerHTML = "<h1>404</h1><p>Page not found.</p>";
  }
}

window.addEventListener('DOMContentLoaded', () => navigate(0));
window.navigate = navigate; // So it works on button onclick
