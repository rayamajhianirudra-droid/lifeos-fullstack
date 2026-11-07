import React from 'react';
import ReactDOM from 'react-dom/client';
// Inter is served from our own site (no Google Fonts request, so visitors' IPs are not
// shared with Google). Each weight covers Latin, Cyrillic, Greek and Vietnamese; the
// browser only downloads the scripts a page actually uses.
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade out the loading screen from index.html as soon as the app has drawn its first
// frame (it used to wait for every image plus 0.8 s). Kept out of index.html so the
// Content-Security-Policy needs no inline scripts.
requestAnimationFrame(() => {
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.style.transition = 'opacity 0.3s ease';
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 300);
});

// REGISTER SERVICE WORKER FOR PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('Service worker registration failed:', err));
  });
}