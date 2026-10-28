import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/app.css';
import './styles/crew.css';
import './styles/theme.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* Parent download UI reports offline availability. */ }); });
}
