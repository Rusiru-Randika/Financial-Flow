import React, { useState } from 'react';
import { LogIn, UserPlus, CheckCircle, Loader, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { signIn, signUp, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';

interface AuthGateProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, onCancel, onNotify }) => {
  const [authStep, setAuthStep] = useState<'signin' | 'signup' | 'confirm'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signIn({ username: email, password });
      
      if (result.isSignedIn) {
        const currentUser = await getCurrentUser();
        onSuccess(currentUser);
        onNotify('Signed in successfully! AWS Cloud Sync enabled.', 'success');
      } else if (
        (result.nextStep?.signInStep as any) === 'CONFIRM_SIGN_UP' || 
        (result.nextStep?.signInStep as any) === 'CONFIRM_SIGN_UP_STEP'
      ) {
        setAuthStep('confirm');
        onNotify('Please confirm your registration code sent to your email.', 'info');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please verify your credentials.');
      onNotify(err.message || 'Failed to sign in.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      setAuthStep('confirm');
      onNotify('Verification code sent to your email. Please verify.', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register account.');
      onNotify(err.message || 'Failed to register account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !confirmCode) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmCode,
      });
      
      onNotify('Account verified! Signing you in...', 'success');
      // Sign in automatically after registration is verified
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        const currentUser = await getCurrentUser();
        onSuccess(currentUser);
        onNotify('Signed in and synced with AWS cloud.', 'success');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify code.');
      onNotify(err.message || 'Failed to verify code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '2rem 1.5rem',
      width: '100%'
    }}>
      <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo-icon" style={{ margin: '0 auto 1.5rem', width: '52px', height: '52px' }}>
            {authStep === 'confirm' ? <KeyRound size={26} fill="white" /> : <Sparkles size={26} fill="white" />}
          </div>
          <h2 className="wizard-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {authStep === 'signin' && 'Sign In to Cloud'}
            {authStep === 'signup' && 'Create Cloud Account'}
            {authStep === 'confirm' && 'Verify Email Address'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {authStep === 'signin' && 'Access your expenses securely from the AWS cloud.'}
            {authStep === 'signup' && 'Register your email for cloud-synced storage.'}
            {authStep === 'confirm' && `Enter the verification code sent to ${email}`}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#fecdd3',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--status-expense)' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {authStep === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-control"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} disabled={loading}>
              {loading ? <Loader className="animate-spin" size={18} /> : <LogIn size={18} />}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => { setAuthStep('signup'); setErrorMsg(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Register
                </button>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', width: '100%', paddingTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ← Back to Local Storage
                </button>
              </div>
            </div>
          </form>
        )}

        {authStep === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-control"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} disabled={loading}>
              {loading ? <Loader className="animate-spin" size={18} /> : <UserPlus size={18} />}
              {loading ? 'Creating Account...' : 'Register'}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setAuthStep('signin'); setErrorMsg(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign In
                </button>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', width: '100%', paddingTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ← Back to Local Storage
                </button>
              </div>
            </div>
          </form>
        )}

        {authStep === 'confirm' && (
          <form onSubmit={handleConfirmCode}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="input-control"
                placeholder="123456"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                required
              />
              <span className="input-feedback">We sent a verification code to your email inbox.</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} disabled={loading}>
              {loading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              {loading ? 'Verifying...' : 'Confirm & Sign In'}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => { setAuthStep('signup'); setErrorMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Back to Registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
