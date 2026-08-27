import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// iOS Safari treats the first tap on any element with a CSS :hover rule as a
// hover-simulation instead of a click, requiring a second tap to actually
// fire it - this app's buttons all use Tailwind `hover:` classes. Registering
// any touchstart listener disables that behavior, so buttons like "새 시행"
// work on the first tap on students' phones.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
