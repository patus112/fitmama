import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import { App } from './App';
import { captureFastFlag } from './config';
import { AppProvider } from './state/AppState';
import './styles.css';

captureFastFlag();

const root = document.getElementById('root');
if (!root) throw new Error('Missing root');

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
