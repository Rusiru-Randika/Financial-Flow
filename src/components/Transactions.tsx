import React, { useEffect, useState } from 'react';
import type { Transaction, Category, TransactionType } from '../types';
import { CATEGORIES } from '../types';
import { dbConnector } from '../dbConnector';
import { evaluateExpression } from '../utils/math';
import { Search, Plus, Trash2, Calendar, DollarSign, Tag, Info, Pencil, X, ChevronDown } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  selectedMonthId: string;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
  openEntryForm?: boolean;
  onCloseEntryForm?: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  transactions,
  selectedMonthId,
  onNotify,
  onRefresh,
  openEntryForm,
  onCloseEntryForm,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileEntry, setShowMobileEntry] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(mql.matches);
    update();

    if ('addEventListener' in mql) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }

    // Safari/old fallback
    // @ts-expect-error legacy API
    mql.addListener(update);
    return () => {
      // @ts-expect-error legacy API
      mql.removeListener(update);
    };
  }, []);

  useEffect(() => {
    if (openEntryForm && isMobile) {
      setShowMobileEntry(true);
    }
  }, [openEntryForm, isMobile]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); // Default today
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amountExpr, setAmountExpr] = useState('');
  const [category, setCategory] = useState<Category>('Food & Drinks');

  // Math evaluation preview
  const previewAmount = amountExpr ? evaluateExpression(amountExpr) : 0;

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editDescription, setEditDescription] = useState('');
  const [editAmountExpr, setEditAmountExpr] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('Food & Drinks');
  const editPreviewAmount = editAmountExpr ? evaluateExpression(editAmountExpr) : 0;

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDate(tx.date);
    setEditType(tx.type);
    setEditDescription(tx.description);
    setEditAmountExpr(tx.rawExpression || String(tx.amount));
    setEditCategory(tx.type === 'INCOME' ? 'Others' : ((tx.category as Category) || 'Food & Drinks'));
  };

  const closeEdit = () => {
    setEditingTx(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!editDescription || !editAmountExpr) {
      onNotify('Please fill in all required fields.', 'error');
      return;
    }

    const finalAmount = evaluateExpression(editAmountExpr);
    if (finalAmount <= 0) {
      onNotify('Invalid amount. Evaluation result must be greater than 0.', 'error');
      return;
    }

    try {
      await dbConnector.updateTransaction(editingTx.id, {
        date: editDate,
        type: editType,
        description: editDescription,
        amount: finalAmount,
        rawExpression: editAmountExpr,
        category: editType === 'INCOME' ? 'Others' : editCategory,
        // Preserve month; if legacy record is missing a month, attach to the currently selected month.
        financialMonthId: editingTx.financialMonthId || selectedMonthId,
      });

      onNotify('Transaction updated successfully!', 'success');
      closeEdit();
      onRefresh();
    } catch (err) {
      onNotify('Failed to update transaction.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amountExpr) {
      onNotify('Please fill in all required fields.', 'error');
      return;
    }

    const finalAmount = evaluateExpression(amountExpr);
    if (finalAmount <= 0) {
      onNotify('Invalid amount. Evaluation result must be greater than 0.', 'error');
      return;
    }

    try {
      await dbConnector.createTransaction({
        date,
        description,
        amount: finalAmount,
        rawExpression: amountExpr,
        category: type === 'INCOME' ? 'Others' : category,
        type,
        financialMonthId: selectedMonthId,
      });

      onNotify('Transaction created successfully!', 'success');
      
      // Reset form
      setDescription('');
      setAmountExpr('');
      if (isMobile) {
        setShowMobileEntry(false);
        onCloseEntryForm?.();
      }
      onRefresh();
    } catch (err) {
      onNotify('Failed to save transaction.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await dbConnector.deleteTransaction(id);
      onNotify('Transaction deleted.', 'info');
      onRefresh();
    } catch (err) {
      onNotify('Failed to delete transaction.', 'error');
    }
  };

  // Filter transactions list
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || tx.category === filterCategory;
    const matchesStartDate = !startDate || tx.date >= startDate;
    const matchesEndDate = !endDate || tx.date <= endDate;

    return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate;
  });

  const entryFormBody = (
    <form onSubmit={handleSubmit}>
        {/* Type Selector Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn ${type === 'EXPENSE' ? 'btn-expense' : 'btn-secondary'}`}
            style={{ flexGrow: 1, padding: '0.5rem' }}
            onClick={() => setType('EXPENSE')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`btn ${type === 'INCOME' ? 'btn-income' : 'btn-secondary'}`}
            style={{ flexGrow: 1, padding: '0.5rem' }}
            onClick={() => {
              setType('INCOME');
              setCategory('Others');
            }}
          >
            Income
          </button>
        </div>

        {/* Date Picker */}
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

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            type="text"
            className="input-control"
            placeholder="e.g. Petrol, Dinner, Clothes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Amount / Formula */}
        <div className="form-group">
          <label className="form-label">
            <DollarSign size={12} style={{ marginRight: '0.35rem' }} /> Amount (Math supported)
          </label>
          <input
            type="text"
            className="input-control"
            placeholder="e.g. 1500 or 1000 + 400 + 400"
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

        {/* Category (Expense only) */}
        {type === 'EXPENSE' && (
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">
              <Tag size={12} style={{ marginRight: '0.35rem' }} /> Category
            </label>
            <select
              className="input-control select-control"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Add Transaction
        </button>
    </form>
  );

  return (
    <div className="content-grid" style={{ height: '100%', alignItems: 'stretch' }}>
      {/* Left: Transaction Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0, overflow: 'hidden' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.0rem' }}>
            {isMobile ? (
              <button
                className={`btn btn-secondary mobile-filters-toggle ${showMobileFilters ? 'open' : ''}`}
                onClick={() => setShowMobileFilters((prev) => !prev)}
                type="button"
              >
                Filters <ChevronDown size={16} />
              </button>
            ) : (
              <h3 className="chart-title">Filters</h3>
            )}
            {isMobile && (
              <button className="btn btn-primary" style={{ padding: '0.45rem 0.8rem' }} onClick={() => setShowMobileEntry(true)} type="button">
                <Plus size={16} /> New Entry
              </button>
            )}
          </div>
          
          <div className={`filters-panel ${isMobile && !showMobileFilters ? 'filters-panel-hidden' : ''}`}>
            <div className="filters-bar">
              {/* Search Bar */}
              <div className="search-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  className="input-control search-input"
                  placeholder="Search description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <select
                className="input-control select-control filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="EXPENSE">Expenses Only</option>
                <option value="INCOME">Income Only</option>
              </select>

              {/* Category Filter */}
              <select
                className="input-control select-control filter-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start:</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: '0.4rem' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>End:</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: '0.4rem' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate || filterCategory !== 'ALL' || filterType !== 'ALL' || searchTerm) && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('ALL');
                    setFilterCategory('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table Grid */}
        <div className="card" style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <h3 className="chart-title">Transactions List</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {filteredTransactions.length} records
            </span>
          </div>
          <div className="transactions-list-scroll" style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No matching transactions found.</p>
              </div>
            ) : (
              <>
                <div className="ledger-table-desktop">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Formula</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ width: '96px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ color: 'var(--text-secondary)' }}>{tx.date}</td>
                          <td style={{ fontWeight: 500 }}>{tx.description}</td>
                          <td>
                            <span className={`tag ${tx.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                              {tx.category}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {tx.rawExpression !== String(tx.amount) ? tx.rawExpression : '-'}
                          </td>
                          <td className={`amount-col ${tx.type.toLowerCase()}`} style={{ textAlign: 'right' }}>
                            {tx.type === 'EXPENSE' ? '- ' : '+ '}LKR {tx.amount.toFixed(2)}
                          </td>
                          <td>
                            <div className="action-btns">
                              <button className="action-btn" onClick={() => openEdit(tx)} title="Edit">
                                <Pencil size={15} />
                              </button>
                              <button className="action-btn delete" onClick={() => handleDelete(tx.id)} title="Delete">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ledger-list-mobile">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className={`ledger-item ${tx.type.toLowerCase()}`}>
                      <div className="ledger-item-main">
                        <div className="ledger-item-desc">{tx.description}</div>
                        <div className={`ledger-item-amount ${tx.type.toLowerCase()}`}>
                          {tx.type === 'EXPENSE' ? '- ' : '+ '}LKR {tx.amount.toFixed(2)}
                        </div>
                      </div>

                      <div className="ledger-item-sub">
                        <span className={`tag ${tx.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                          {tx.category}
                        </span>
                        <span className="ledger-item-date">{tx.date}</span>
                        <span className="ledger-item-formula">
                          {tx.rawExpression !== String(tx.amount) ? tx.rawExpression : '-'}
                        </span>
                      </div>

                      <div className="ledger-item-actions">
                        <button className="action-btn" onClick={() => openEdit(tx)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(tx.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Add Form (desktop/tablet) */}
      {!isMobile && (
        <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
          <h3 className="chart-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            Add Transaction
          </h3>
          {entryFormBody}
        </div>
      )}

      {/* Mobile: Entry modal */}
      {isMobile && showMobileEntry && (
        <div className="modal-overlay" onClick={() => {
          setShowMobileEntry(false);
          onCloseEntryForm?.();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button className="modal-close" onClick={() => {
                setShowMobileEntry(false);
                onCloseEntryForm?.();
              }} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {entryFormBody}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '0.6rem' }}
              onClick={() => {
                setShowMobileEntry(false);
                onCloseEntryForm?.();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Transaction</h2>
              <button className="modal-close" onClick={closeEdit} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${editType === 'EXPENSE' ? 'btn-expense' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.5rem' }}
                  onClick={() => setEditType('EXPENSE')}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={`btn ${editType === 'INCOME' ? 'btn-income' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.5rem' }}
                  onClick={() => {
                    setEditType('INCOME');
                    setEditCategory('Others');
                  }}
                >
                  Income
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
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="input-control"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={12} style={{ marginRight: '0.35rem' }} /> Amount (Math supported)
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

              {editType === 'EXPENSE' && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">
                    <Tag size={12} style={{ marginRight: '0.35rem' }} /> Category
                  </label>
                  <select
                    className="input-control select-control"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as Category)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
