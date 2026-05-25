import React, { useState, useEffect } from 'react';
import { getDBMode, setDBMode } from '../dbConnector';
import type { DBMode } from '../dbConnector';
import { Cloud, AlertTriangle, LogOut, Loader } from 'lucide-react';
import { AuthGate } from './AuthGate';
import { signOut } from 'aws-amplify/auth';

interface AmplifyConnectorProps {
  user: any;
  isAmplifyConfigured: boolean;
  onUserChange: (user: any) => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AmplifyConnector: React.FC<AmplifyConnectorProps> = ({ 
  user, 
  isAmplifyConfigured, 
  onUserChange, 
  onNotify 
}) => {
  const [mode, setMode] = useState<DBMode>('local');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setMode(getDBMode());
    
    // Listen to mode updates
    const handleModeChange = () => {
      setMode(getDBMode());
    };
    window.addEventListener('db-mode-changed', handleModeChange);
    return () => window.removeEventListener('db-mode-changed', handleModeChange);
  }, []);

  const handleToggleMode = async () => {
    if (mode === 'local') {
      if (!isAmplifyConfigured) {
        onNotify('Amplify backend is not deployed. Please follow the instructions to connect.', 'error');
        return;
      }
      
      if (!user) {
        onNotify('Please sign in to AWS Amplify to enable cloud sync.', 'info');
        setDBMode('amplify'); // This will trigger the auth gate
      } else {
        setDBMode('amplify');
        onNotify('Switched to AWS Amplify Database Mode.', 'success');
      }
    } else {
      setDBMode('local');
      onNotify('Switched to Local Database Mode.', 'success');
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      onUserChange(null);
      setDBMode('local');
      onNotify('Signed out. Switched back to Local Database.', 'info');
    } catch (err: any) {
      onNotify(err.message || 'Failed to sign out.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="cloud-banner">
        <div className="cloud-info">
          <Cloud className="cloud-icon" size={32} />
          <div>
            <h3 className="cloud-title">AWS Amplify Cloud Integration</h3>
            <p className="cloud-description">
              {mode === 'amplify' && user
                ? `Connected to AWS cloud (Synced as: ${user.signInDetails?.loginId || user.username})`
                : 'Store data locally in browser or connect to AWS Amplify backend database.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`cloud-badge ${mode === 'amplify' && user ? 'connected' : 'local'}`}>
            {mode === 'amplify' && user ? 'Amplify Mode' : 'Local Mode'}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={handleToggleMode}
            disabled={mode === 'local' && !isAmplifyConfigured}
            style={{ opacity: mode === 'local' && !isAmplifyConfigured ? 0.6 : 1 }}
          >
            {mode === 'local' ? 'Switch to Cloud' : 'Disconnect Cloud'}
          </button>
        </div>
      </div>

      {!isAmplifyConfigured ? (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <AlertTriangle style={{ color: 'var(--status-pending)' }} />
            <h3 className="chart-title">Amplify Backend Not Connected Yet</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Your app is currently running in <strong>Local Storage Mode</strong>. All data you add is saved securely inside your browser's local sandbox.
          </p>
          
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
            To deploy and connect AWS Amplify database, follow these steps:
          </h4>
          
          <div className="cloud-panel-details">
            <div className="cloud-step-card">
              <div className="step-num">1</div>
              <div className="step-content">
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Initialize the Amplify Sandbox</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Open your terminal inside the project directory and run: <br />
                  <code>npx ampx sandbox</code>
                </p>
              </div>
            </div>
            
            <div className="cloud-step-card">
              <div className="step-num">2</div>
              <div className="step-content">
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>AWS Credentials configuration</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Sign in with your AWS Account when prompted. Amplify will dynamically create the AWS Cognito User Pool (auth) and AWS DynamoDB (database) tables.
                </p>
              </div>
            </div>

            <div className="cloud-step-card">
              <div className="step-num">3</div>
              <div className="step-content">
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Automatic Connection</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Once the backend deploy completes, copy <code>amplify_outputs.json</code> to <code>public/amplify_outputs.json</code>, then reload the page to log in.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : !user ? (
        <AuthGate 
          onSuccess={(currentUser) => {
            onUserChange(currentUser);
            setDBMode('amplify');
          }}
          onNotify={onNotify}
        />
      ) : (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="chart-title">Cloud Synchronization Active</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Your financial records are synced with AWS DynamoDB tables automatically.
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleSignOut} disabled={loading}>
            {loading ? <Loader className="animate-spin" size={18} /> : <LogOut size={18} />}
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
