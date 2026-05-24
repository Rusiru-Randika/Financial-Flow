import { useState, useEffect } from 'react';
import { dbConnector, getDBMode, setDBMode } from './dbConnector';
import type { Transaction, Debt, FinancialMonth } from './types';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { DebtsManager } from './components/DebtsManager';
import { AmplifyConnector } from './components/AmplifyConnector';
import { AuthGate } from './components/AuthGate';
import { getCurrentUser, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { 
  TrendingUp, 
  List, 
  Coins, 
  Cloud, 
  Plus, 
  Loader, 
  Sparkles,
  Calendar,
  X,
  Play,
  Square,
  LogOut,
  User
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'cloud'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [financialMonths, setFinancialMonths] = useState<FinancialMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dbMode, setDbMode] = useState<'local' | 'amplify'>('local');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AWS Amplify Authentication States
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAmplifyConfigured, setIsAmplifyConfigured] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Month manager states
  const [showMonthManager, setShowMonthManager] = useState(false);
  const [newMonthName, setNewMonthName] = useState('');
  const [newMonthStart, setNewMonthStart] = useState(new Date().toISOString().substring(0, 10));

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3.5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const loadData = async () => {
    const currentMode = getDBMode();
    setDbMode(currentMode);

    if (currentMode === 'amplify' && !user) {
      setTransactions([]);
      setDebts([]);
      setFinancialMonths([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch financial months
      const months = await dbConnector.fetchFinancialMonths();
      setFinancialMonths(months);

      // Determine active / default month
      const activeMonth = months.find(m => m.active);
      let selectedId = selectedMonthId;

      if (!selectedId) {
        if (activeMonth) {
          selectedId = activeMonth.id;
        } else if (months.length > 0) {
          selectedId = months[0].id;
        }
        setSelectedMonthId(selectedId);
      } else {
        // If the selected ID is no longer present in the updated months array
        if (!months.some(m => m.id === selectedId)) {
          if (activeMonth) {
            selectedId = activeMonth.id;
          } else if (months.length > 0) {
            selectedId = months[0].id;
          } else {
            selectedId = '';
          }
          setSelectedMonthId(selectedId);
        }
      }

      // 2. Fetch transactions and debts
      const txs = await dbConnector.fetchTransactions();
      const dbDebts = await dbConnector.fetchDebts();
      setTransactions(txs);
      setDebts(dbDebts);
    } catch (e: any) {
      addToast(e.message || 'Error loading records. Defaulting to local sandbox.', 'error');
      // Fallback: force local mode fetch if Cloud mode errored
      try {
        const months = await dbConnector.fetchFinancialMonths();
        setFinancialMonths(months);
        if (months.length > 0 && !selectedMonthId) {
          setSelectedMonthId(months.find(m => m.active)?.id || months[0].id);
        }
        const txs = await dbConnector.fetchTransactions();
        const dbDebts = await dbConnector.fetchDebts();
        setTransactions(txs);
        setDebts(dbDebts);
      } catch (errFallback) {
        console.error('Total fallback failure', errFallback);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check Amplify config and user session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setAuthLoading(true);
      try {
        const config = (await import('../amplify_outputs.json')) as any;
        if (config && config.auth && config.auth.user_pool_id) {
          setIsAmplifyConfigured(true);
          
          // Auto-enable Amplify mode on first boot if Amplify is configured
          if (!localStorage.getItem('budget_tracker_db_mode')) {
            setDBMode('amplify');
          }

          const currentUser = await getCurrentUser();
          setUser(currentUser);
          
          try {
            const attrs = await fetchUserAttributes();
            if (attrs.email) {
              setUserEmail(attrs.email);
            } else {
              setUserEmail(currentUser.signInDetails?.loginId || currentUser.username);
            }
          } catch (attrsErr) {
            setUserEmail(currentUser.signInDetails?.loginId || currentUser.username);
          }
        } else {
          setIsAmplifyConfigured(false);
        }
      } catch (err) {
        setIsAmplifyConfigured(false);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen for database mode switch events
    const handleDbChange = () => {
      setDbMode(getDBMode());
    };
    window.addEventListener('db-mode-changed', handleDbChange);
    return () => window.removeEventListener('db-mode-changed', handleDbChange);
  }, []);

  // Reload data when dbMode or user authentication state changes
  useEffect(() => {
    loadData();
  }, [dbMode, user]);

  const handleStartMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName.trim() || !newMonthStart) {
      addToast('Please enter a month name and start date.', 'error');
      return;
    }

    try {
      setLoading(true);
      // 1. Deactivate current active month if exists
      const activeMonth = financialMonths.find(m => m.active);
      if (activeMonth) {
        await dbConnector.updateFinancialMonth(activeMonth.id, {
          active: false,
          endDate: newMonthStart, // Close current month on start of next month
        });
      }

      // 2. Create new active month
      const created = await dbConnector.createFinancialMonth({
        name: newMonthName.trim(),
        startDate: newMonthStart,
        active: true,
      });

      addToast(`Financial month "${created.name}" started!`, 'success');
      setNewMonthName('');
      setShowMonthManager(false);
      setSelectedMonthId(created.id);
      await loadData();
    } catch (err) {
      addToast('Failed to start new financial month.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonth = async (monthId: string) => {
    if (!window.confirm('Are you sure you want to stop this financial month? This will close the billing cycle.')) {
      return;
    }

    try {
      setLoading(true);
      const todayStr = new Date().toISOString().substring(0, 10);
      await dbConnector.updateFinancialMonth(monthId, {
        active: false,
        endDate: todayStr,
      });

      addToast('Financial month stopped successfully.', 'info');
      await loadData();
    } catch (err) {
      addToast('Failed to stop financial month.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter items by selected month
  const oldestMonth = financialMonths[financialMonths.length - 1];

  const filteredTransactions = transactions.filter(t => {
    if (t.financialMonthId) {
      return t.financialMonthId === selectedMonthId;
    }
    // Fallback: legacy records mapped to the oldest month
    return oldestMonth && oldestMonth.id === selectedMonthId;
  });

  const filteredDebts = debts.filter(d => {
    if (d.financialMonthId) {
      return d.financialMonthId === selectedMonthId;
    }
    // Fallback: legacy records mapped to the oldest month
    return oldestMonth && oldestMonth.id === selectedMonthId;
  });

  // Auth and loading states
  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <Loader className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p>Loading application state...</p>
      </div>
    );
  }

  if (dbMode === 'amplify' && !user) {
    return (
      <div className="app-container">
        <AuthGate 
          onSuccess={async (currentUser) => {
            setUser(currentUser);
            setDBMode('amplify');
            try {
              const attrs = await fetchUserAttributes();
              if (attrs.email) {
                setUserEmail(attrs.email);
              } else {
                setUserEmail(currentUser.signInDetails?.loginId || currentUser.username);
              }
            } catch (e) {
              setUserEmail(currentUser.signInDetails?.loginId || currentUser.username);
            }
          }}
          onCancel={() => {
            setDBMode('local');
          }}
          onNotify={addToast}
        />
      </div>
    );
  }

  // Setup Wizard if no cycles exist
  if (!loading && financialMonths.length === 0) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="setup-wizard-container">
          <div className="card wizard-card">
            <div className="logo-icon" style={{ margin: '0 auto 1.5rem', width: '50px', height: '50px' }}>
              <Sparkles size={28} fill="white" />
            </div>
            <h2 className="wizard-title">Welcome to Financial Flow</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              To get started, let's initialize your first <strong>Financial Month</strong>. 
              Financial Flow lets you customize your cycles and start/stop months manually, adapting to your personal billing intervals.
            </p>
            <form onSubmit={handleStartMonth} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">Month Name</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. March 2026"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  required
                />
                <span className="input-feedback">Name this cycle (e.g., March 2026).</span>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="input-control"
                  value={newMonthStart}
                  onChange={(e) => setNewMonthStart(e.target.value)}
                  required
                />
                <span className="input-feedback">When did this cycle's transactions begin?</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                <Play size={16} /> Start Financial Month
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={22} fill="white" />
          </div>
          <span className="logo-text">Financial Flow</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
              >
                <TrendingUp /> Dashboard
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('transactions'); setMobileMenuOpen(false); }}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
              >
                <List /> Expenses Ledger
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activeTab === 'debts' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('debts'); setMobileMenuOpen(false); }}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
              >
                <Coins /> Payables & Receivables
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activeTab === 'cloud' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('cloud'); setMobileMenuOpen(false); }}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
              >
                <Cloud /> AWS Cloud Settings
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {dbMode === 'amplify' && user && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <User size={14} style={{ color: 'var(--accent-teal)' }} />
                <span style={{
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }} title={userEmail}>
                  {userEmail}
                </span>
              </div>
              <button 
                className="btn btn-danger" 
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await signOut();
                    setUser(null);
                    setUserEmail('');
                    setDBMode('local');
                    addToast('Signed out of AWS Cloud Sync.', 'info');
                  } catch (err: any) {
                    addToast(err.message || 'Failed to sign out.', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: dbMode === 'amplify' && user ? '#10b981' : '#64748b'
              }}></span>
              <span>Cloud Sync: <strong>{dbMode === 'amplify' && user ? 'ON' : 'OFF'}</strong></span>
            </div>
            
            {dbMode === 'local' && isAmplifyConfigured && (
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-teal)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
                onClick={() => {
                  setDBMode('amplify');
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-title-area">
            <h1>
              {activeTab === 'dashboard' && 'Financial Overview'}
              {activeTab === 'transactions' && 'Expenses Ledger'}
              {activeTab === 'debts' && 'Payables & Receivables'}
              {activeTab === 'cloud' && 'AWS Cloud Integration'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Monitor balances, spending charts, and trends.'}
              {activeTab === 'transactions' && 'Add, edit, filter, and track transactions with math formulas.'}
              {activeTab === 'debts' && 'Track payables and receivables across your financial cycles.'}
              {activeTab === 'cloud' && 'Configure AWS Amplify hosting and data sync configurations.'}
            </p>
          </div>

          <div className="header-actions">
            {/* Month Cycle Selector */}
            {financialMonths.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  className="input-control select-control"
                  style={{ minWidth: '180px', padding: '0.5rem 2.25rem 0.5rem 1rem', fontSize: '0.9rem' }}
                  value={selectedMonthId}
                  onChange={(e) => setSelectedMonthId(e.target.value)}
                >
                  {financialMonths.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.active ? '🟢' : '🔴'}
                    </option>
                  ))}
                </select>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem' }} 
                  onClick={() => setShowMonthManager(true)}
                  title="Manage Cycles"
                >
                  <Calendar size={18} />
                </button>
              </div>
            )}

            {activeTab !== 'cloud' && (
              <button className="btn btn-secondary" onClick={() => loadData()} disabled={loading}>
                {loading ? <Loader className="animate-spin" size={14} /> : 'Sync UI'}
              </button>
            )}
            
            {activeTab === 'dashboard' && (
              <button className="btn btn-primary" onClick={() => setActiveTab('transactions')}>
                <Plus size={16} /> New Entry
              </button>
            )}
          </div>
        </header>

        {/* Dynamic page switcher */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
            <Loader className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
            <p>Loading database entries...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard transactions={filteredTransactions} debts={filteredDebts} />
            )}
            {activeTab === 'transactions' && (
              <Transactions transactions={filteredTransactions} selectedMonthId={selectedMonthId} onNotify={addToast} onRefresh={loadData} />
            )}
            {activeTab === 'debts' && (
              <DebtsManager debts={filteredDebts} selectedMonthId={selectedMonthId} onNotify={addToast} onRefresh={loadData} />
            )}
            {activeTab === 'cloud' && (
              <AmplifyConnector 
                user={user}
                isAmplifyConfigured={isAmplifyConfigured}
                onUserChange={setUser}
                onNotify={addToast} 
              />
            )}
          </>
        )}
      </main>

      {/* Toast Alert Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Cycle Manager Modal */}
      {showMonthManager && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Financial Cycles Manager</h2>
              <button className="modal-close" onClick={() => setShowMonthManager(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Active Cycle Status */}
            {financialMonths.find(m => m.active) ? (
              <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="month-badge active">Active Cycle</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Started: {financialMonths.find(m => m.active)?.startDate}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  {financialMonths.find(m => m.active)?.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  This month has been active for {Math.max(1, Math.ceil((new Date().getTime() - new Date(financialMonths.find(m => m.active)!.startDate).getTime()) / (1000 * 60 * 60 * 24)))} day(s).
                </p>
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%' }}
                  onClick={() => handleStopMonth(financialMonths.find(m => m.active)!.id)}
                >
                  <Square size={14} fill="currentColor" /> Stop Current Month
                </button>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.03)', textAlign: 'center' }}>
                <p style={{ color: 'var(--status-expense)', fontWeight: '600', marginBottom: '0.5rem' }}>No Active Financial Month</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Start a new financial month below to begin logging transactions.
                </p>
              </div>
            )}

            {/* Start New Cycle Form */}
            <form onSubmit={handleStartMonth} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Start New Financial Cycle</h3>
              {financialMonths.some(m => m.active) && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  ⚠️ Starting a new cycle will automatically stop the current active cycle.
                </p>
              )}
              <div className="form-group">
                <label className="form-label">Month Name</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. April 2026"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="input-control"
                  value={newMonthStart}
                  onChange={(e) => setNewMonthStart(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Play size={14} /> Start New Month
              </button>
            </form>

            {/* History List */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>History</h4>
              <div className="month-history-list">
                {financialMonths.map(m => (
                  <div key={m.id} className="month-history-item">
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.startDate} {m.endDate ? `to ${m.endDate}` : '(active)'}
                      </div>
                    </div>
                    <span className={`month-badge ${m.active ? 'active' : 'stopped'}`}>
                      {m.active ? 'active' : 'stopped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
