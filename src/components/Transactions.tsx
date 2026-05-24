import React, { useState } from 'react';
import type { Transaction, Category, TransactionType } from '../types';
import { CATEGORIES } from '../types';
import { dbConnector } from '../dbConnector';
import { evaluateExpression } from '../utils/math';
import { Search, Plus, Trash2, Calendar, DollarSign, Tag, Info } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  selectedMonthId: string;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, selectedMonthId, onNotify, onRefresh }) => {
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
        category,
        type,
        financialMonthId: selectedMonthId,
      });

      onNotify('Transaction created successfully!', 'success');
      
      // Reset form
      setDescription('');
      setAmountExpr('');
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

  return (
    <div className="content-grid">
      {/* Left: Transaction Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h3 className="chart-title" style={{ marginBottom: '1.5rem' }}>Filters</h3>
          
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

        {/* Transactions Table Grid */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="chart-title">Transactions List</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filteredTransactions.length} records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No matching transactions found.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Formula</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '60px' }}></th>
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
                        <button className="action-btn delete" onClick={() => handleDelete(tx.id)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Add Form */}
      <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
          Add Transaction
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Type Selector Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${type === 'EXPENSE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexGrow: 1, padding: '0.5rem' }}
              onClick={() => setType('EXPENSE')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${type === 'INCOME' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexGrow: 1, padding: '0.5rem' }}
              onClick={() => setType('INCOME')}
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

          {/* Category */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">
              <Tag size={12} style={{ marginRight: '0.35rem' }} /> Category
            </label>
            <select
              className="input-control select-control"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
};
