import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch has both getter and setter across all iframe / browser environments
try {
  let _currentFetch = window.fetch;
  let proto: any = window;
  while (proto) {
    const d = Object.getOwnPropertyDescriptor(proto, 'fetch');
    if (d) {
      if (!d.set || !d.writable) {
        try {
          Object.defineProperty(proto, 'fetch', {
            get: () => _currentFetch,
            set: (fn) => { _currentFetch = fn; },
            configurable: true,
            enumerable: true,
          });
        } catch {}
      }
      break;
    }
    proto = Object.getPrototypeOf(proto);
  }
  try {
    Object.defineProperty(window, 'fetch', {
      get: () => _currentFetch,
      set: (fn) => { _currentFetch = fn; },
      configurable: true,
      enumerable: true,
    });
  } catch {}
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
