import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadAmplifyOutputs } from './amplifyOutputs';

// Initialize AWS Amplify conditionally based on config presence
const bootstrap = async () => {
  try {
    const outputs = await loadAmplifyOutputs();

    // Check if configuration matches a valid deployment
    if (outputs) {
      const { Amplify } = await import('aws-amplify');
      Amplify.configure(outputs);
      console.log('AWS Amplify initialized successfully.');
    } else {
      console.log('AWS Amplify configuration not detected. Defaulting to Local Storage Mode.');
    }
  } catch (e) {
    console.log('AWS Amplify config load failed. Running in Local Storage Mode.');
  }
};

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if ('serviceWorker' in navigator && !isLocalhost) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
});
