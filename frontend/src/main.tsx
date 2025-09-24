import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Hide loading screen
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.style.opacity = '0';
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 500);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 