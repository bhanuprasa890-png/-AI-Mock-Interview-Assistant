import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InterviewProvider } from './context/InterviewContext';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <InterviewProvider>
          <App />
        </InterviewProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
