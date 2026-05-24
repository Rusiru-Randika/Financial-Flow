import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize AWS Amplify conditionally based on config presence
const bootstrap = async () => {
  try {
    // Dynamic import to prevent compiler crashes on local mode runs
    const config = (await import('../amplify_outputs.json')) as any;
    
    // Check if configuration matches a valid deployment
    if (config && config.auth && config.auth.user_pool_id) {
      const { Amplify } = await import('aws-amplify');
      Amplify.configure(config.default);
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
