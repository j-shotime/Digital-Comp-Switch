async function navigate(page) {
  const content = document.getElementById('content');
  const buttons = document.querySelectorAll('.bottom-nav button');

  // Remove all active classes
  buttons.forEach(btn => btn.classList.remove('active'));
  buttons[page].classList.add('active');

  switch (page) {
    case 0:
      // Load from control subfolder
      const res = await fetch('control/control.html');
      const html = await res.text();
      content.innerHTML = html;

      // Dynamically load the JS
      const script = document.createElement('script');
      script.src = 'control/control.js';
      document.body.appendChild(script);
      break;

    case 1:
      content.innerHTML = "<h1>Search</h1><p>Search for something...</p>";
      break;

    case 2:
      content.innerHTML = "<h1>Profile</h1><p>This is your profile.</p>";
      break;

    default:
      content.innerHTML = "<h1>404 Not Found</h1><p>The page you are looking for does not exist.</p>";
      break;
  }
}
