import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Fix: Changed import from './App.tsx' to './App' to conform to standard module resolution and fix "not a module" error.
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);