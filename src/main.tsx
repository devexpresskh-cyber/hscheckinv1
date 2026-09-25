import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch has both getter and setter across all iframe / browser environments
try {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch') ||
               Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window) || {}, 'fetch');
  if (desc && !desc.writable && !desc.set) {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get: () => currentFetch,
      set: (fn) => { currentFetch = fn; },
      configurable: true,
      enumerable: true,
    });
  }
} catch (e) {
  // Ignore in environments where window is strictly sealed
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
