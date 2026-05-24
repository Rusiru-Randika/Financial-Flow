import React, { useState } from 'react';
import type { Debt, DebtType } from '../types';
import { dbConnector } from '../dbConnector';
import { evaluateExpression } from '../utils/math';
import { Plus, CheckCircle, Trash2, Calendar, User, DollarSign, HelpCircle, Pencil, X } from 'lucide-react';

interface DebtsManagerProps {
  debts: Debt[];
  selectedMonthId: string;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export const DebtsManager: React.FC<DebtsManagerProps> = ({ debts, selectedMonthId, onNotify, onRefresh }) => {
  // Form State
  const [person, setPerson] = useState('');
  const [type, setType] = useState<DebtType>('RECEIVABLE');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amountExpr, setAmountExpr] = useState('');
  const [notes, setNotes] = useState('');

  const previewAmount = amountExpr ? evaluateExpression(amountExpr) : 0;

  // Edit state
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editPerson, setEditPerson] = useState('');
  const [editType, setEditType] = useState<DebtType>('RECEIVABLE');
  const [editDate, setEditDate] = useState('');
  const [editAmountExpr, setEditAmountExpr] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const editPreviewAmount = editAmountExpr ? evaluateExpression(editAmountExpr) : 0;

  const openEdit = (d: Debt) => {
    setEditingDebt(d);
    setEditPerson(d.person);
    setEditType(d.type);
    setEditDate(d.date);
    setEditAmountExpr(d.rawExpression || String(d.amount));
    setEditNotes(d.notes || '');
  };

  const closeEdit = () => setEditingDebt(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    if (!editPerson || !editAmountExpr) {
      onNotify('Please fill in Name and Amount.', 'error');
      return;
    }

    const finalAmount = evaluateExpression(editAmountExpr);
    if (finalAmount <= 0) {
      onNotify('Invalid amount expression.', 'error');
      return;
    }

    try {
      await dbConnector.updateDebt(editingDebt.id, {
        date: editDate,
        person: editPerson,
        type: editType,
        amount: finalAmount,
        rawExpression: editAmountExpr,
        notes: editNotes || undefined,
        // Preserve month; if legacy record is missing a month, attach to the currently selected month.
        financialMonthId: editingDebt.financialMonthId || selectedMonthId,
      });

      onNotify('Debt entry updated successfully!', 'success');
      closeEdit();
      onRefresh();
    } catch (err) {
      onNotify('Failed to update debt entry.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !amountExpr) {
      onNotify('Please fill in Name and Amount.', 'error');
      return;
    }

    const finalAmount = evaluateExpression(amountExpr);
    if (finalAmount <= 0) {
      onNotify('Invalid amount expression.', 'error');
      return;
    }

    try {
      await dbConnector.createDebt({
        date,
        person,
        type,
        amount: finalAmount,
        rawExpression: amountExpr,
        settled: false,
        notes: notes || 'Logged manually',
        financialMonthId: selectedMonthId,
      });

      onNotify('Debt entry logged successfully!', 'success');
      
      // Reset Form
      setPerson('');
      setAmountExpr('');
      setNotes('');
      onRefresh();
    } catch (e) {
      onNotify('Failed to save debt entry.', 'error');
    }
  };

  const handleSettle = async (id: string, currentSettled: boolean) => {
    try {
      await dbConnector.updateDebt(id, { settled: !currentSettled });
      onNotify(currentSettled ? 'Marked as outstanding.' : 'Marked as settled successfully!', 'success');
      onRefresh();
    } catch (e) {
      onNotify('Failed to update settlement status.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this debt log permanently?')) return;
    try {
      await dbConnector.deleteDebt(id);
      onNotify('Debt log deleted.', 'info');
      onRefresh();
    } catch (e) {
      onNotify('Failed to delete debt entry.', 'error');
    }
  };

  const receivables = debts.filter(d => d.type === 'RECEIVABLE');
  const payables = debts.filter(d => d.type === 'PAYABLE');

  return (
    <div className="content-grid debts-content-grid" style={{ height: '100%', alignItems: 'stretch' }}>
      {/* Left Columns: Split Receivables and Payables Lists */}
      <div className="debts-list-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0, overflow: 'hidden' }}>
        <div className="debts-grid" style={{ flex: '1 1 0', minHeight: 0 }}>
          
          {/* RECEIVABLES */}
          <div className="card">
            <div className="debt-header-row">
              <h3 className="chart-title" style={{ color: 'var(--status-income)' }}>
                Receivables
              </h3>
              <span className="tag" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                Owed to You
              </span>
            </div>

            <div className="debt-card-list">
              {receivables.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 1rem' }}>
                  No outstanding receivables.
                </p>
              ) : (
                receivables.map(d => (
                  <div key={d.id} className={`debt-item ${d.settled ? 'settled' : ''}`}>
                    <div className="debt-details">
                      <span className="debt-person">{d.person}</span>
                      <div className="debt-meta">
                        <span>{d.date}</span>
                        {d.rawExpression !== String(d.amount) && (
                          <>
                            <span>•</span>
                            <span className="debt-expr">{d.rawExpression}</span>
                          </>
                        )}
                      </div>
                      {d.notes && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{d.notes}</span>}
                    </div>

                    <div className="debt-amount-area">
                      <span className="debt-amount receivable">LKR {d.amount.toFixed(2)}</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="action-btn" onClick={() => openEdit(d)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button
                          className="action-btn"
                          style={{ color: d.settled ? 'var(--status-income)' : 'var(--text-muted)' }}
                          onClick={() => handleSettle(d.id, d.settled)}
                          title={d.settled ? 'Mark Outstanding' : 'Mark Settled'}
                        >
                          <CheckCircle size={18} fill={d.settled ? 'rgba(16,185,129,0.2)' : 'transparent'} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(d.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PAYABLES */}
          <div className="card">
            <div className="debt-header-row">
              <h3 className="chart-title" style={{ color: 'var(--status-expense)' }}>
                Payables
              </h3>
              <span className="tag" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fda4af' }}>
                You Owe
              </span>
            </div>

            <div className="debt-card-list">
              {payables.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 1rem' }}>
                  No outstanding payables.
                </p>
              ) : (
                payables.map(d => (
                  <div key={d.id} className={`debt-item ${d.settled ? 'settled' : ''}`}>
                    <div className="debt-details">
                      <span className="debt-person">{d.person}</span>
                      <div className="debt-meta">
                        <span>{d.date}</span>
                        {d.rawExpression !== String(d.amount) && (
                          <>
                            <span>•</span>
                            <span className="debt-expr" style={{ color: '#fda4af' }}>{d.rawExpression}</span>
                          </>
                        )}
                      </div>
                      {d.notes && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{d.notes}</span>}
                    </div>

                    <div className="debt-amount-area">
                      <span className="debt-amount payable">LKR {d.amount.toFixed(2)}</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="action-btn" onClick={() => openEdit(d)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button
                          className="action-btn"
                          style={{ color: d.settled ? 'var(--status-income)' : 'var(--text-muted)' }}
                          onClick={() => handleSettle(d.id, d.settled)}
                          title={d.settled ? 'Mark Outstanding' : 'Mark Settled'}
                        >
                          <CheckCircle size={18} fill={d.settled ? 'rgba(16,185,129,0.2)' : 'transparent'} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(d.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Right Column: Add Debt Form */}
      <div className="card debt-form-card" style={{ position: 'sticky', top: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
          Log Debt Item
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Toggle Receivable / Payable */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${type === 'RECEIVABLE' ? 'btn-income' : 'btn-secondary'}`}
              style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}
              onClick={() => setType('RECEIVABLE')}
            >
              Receivable
            </button>
            <button
              type="button"
              className={`btn ${type === 'PAYABLE' ? 'btn-expense' : 'btn-secondary'}`}
              style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}
              onClick={() => setType('PAYABLE')}
            >
              Payable
            </button>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={12} style={{ marginRight: '0.35rem' }} /> Date
            </label>
            <input
              type="date"
              className="input-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Person */}
          <div className="form-group">
            <label className="form-label">
              <User size={12} style={{ marginRight: '0.35rem' }} /> Person Name
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Jhon"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              required
            />
          </div>

          {/* Amount Formula */}
          <div className="form-group">
            <label className="form-label">
              <DollarSign size={12} style={{ marginRight: '0.35rem' }} /> Amount / Expression
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. 15000 + 1000 + 1000"
              value={amountExpr}
              onChange={(e) => setAmountExpr(e.target.value)}
              required
            />
            {amountExpr && (
              <span className={`input-feedback ${previewAmount > 0 ? 'success' : 'error'}`}>
                {previewAmount > 0 ? `Calculated: LKR ${previewAmount.toFixed(2)}` : 'Invalid math expression'}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">
              <HelpCircle size={12} style={{ marginRight: '0.35rem' }} /> Notes
            </label>
            <textarea
              className="input-control"
              style={{ height: '80px', resize: 'none' }}
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Add Entry
          </button>
        </form>
      </div>

      {/* Edit Debt Modal */}
      {editingDebt && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Debt Item</h2>
              <button className="modal-close" onClick={closeEdit} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${editType === 'RECEIVABLE' ? 'btn-income' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => setEditType('RECEIVABLE')}
                >
                  Receivable
                </button>
                <button
                  type="button"
                  className={`btn ${editType === 'PAYABLE' ? 'btn-expense' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => setEditType('PAYABLE')}
                >
                  Payable
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={12} style={{ marginRight: '0.35rem' }} /> Date
                </label>
                <input
                  type="date"
                  className="input-control"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <User size={12} style={{ marginRight: '0.35rem' }} /> Person Name
                </label>
                <input
                  type="text"
                  className="input-control"
                  value={editPerson}
                  onChange={(e) => setEditPerson(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={12} style={{ marginRight: '0.35rem' }} /> Amount / Expression
                </label>
                <input
                  type="text"
                  className="input-control"
                  value={editAmountExpr}
                  onChange={(e) => setEditAmountExpr(e.target.value)}
                  required
                />
                {editAmountExpr && (
                  <span className={`input-feedback ${editPreviewAmount > 0 ? 'success' : 'error'}`}>
                    {editPreviewAmount > 0 ? `Calculated: LKR ${editPreviewAmount.toFixed(2)}` : 'Invalid math expression'}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">
                  <HelpCircle size={12} style={{ marginRight: '0.35rem' }} /> Notes
                </label>
                <textarea
                  className="input-control"
                  style={{ height: '80px', resize: 'none' }}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
