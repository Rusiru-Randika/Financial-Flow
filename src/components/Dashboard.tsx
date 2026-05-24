import React from 'react';
import type { Transaction, Debt } from '../types';
import { ArrowDownRight, Users, Wallet, Calendar } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, debts }) => {
  // Calculations
  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const incomes = transactions.filter(t => t.type === 'INCOME');

  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const totalIncomes = incomes.reduce((acc, t) => acc + t.amount, 0);
  
  const outstandingReceivables = debts
    .filter(d => d.type === 'RECEIVABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  const outstandingPayables = debts
    .filter(d => d.type === 'PAYABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  // Net Cash Balance = Incomes - Expenses (ignoring unsettled debts for direct cash flow, or we can customize)
  // Let's assume a default starting balance or simply calculate Incomes - Expenses
  const netCashBalance = totalIncomes - totalExpenses;

  // Category summary for Donut Chart
  const categoryTotals: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'EXPENSE')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const categories = Object.keys(categoryTotals);
  const totalCatExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Category Colors Map
  const categoryColors: { [key: string]: string } = {
    'Food & Drinks': '#f43f5e',
    'Transport': '#0ea5e9',
    'Utilities & Mobile': '#eab308',
    'Education': '#a855f7',
    'Shopping & Gifts': '#ec4899',
    'Health & Fitness': '#10b981',
    'Others': '#64748b',
  };

  // Group transactions by date for daily chart (in March 2026)
  const dailyExpenses: { [date: string]: number } = {};
  transactions
    .filter(t => t.type === 'EXPENSE')
    .forEach(t => {
      // Get day portion (e.g. "10" from "2026-03-10")
      const day = t.date.substring(8, 10);
      dailyExpenses[day] = (dailyExpenses[day] || 0) + t.amount;
    });

  // Sort daily expenses by date
  const sortedDays = Object.keys(dailyExpenses).sort((a, b) => Number(a) - Number(b));
  const maxDailyExpense = sortedDays.length > 0 ? Math.max(...Object.values(dailyExpenses)) : 1000;

  // SVG Chart sizing
  const barChartHeight = 200;
  const barChartWidth = 500;
  const barWidth = sortedDays.length > 0 ? Math.max(10, Math.floor((barChartWidth - 40) / sortedDays.length) - 8) : 25;

  // Donut chart calculations
  let accumulatedAngle = 0;
  const donutData = categories.map(cat => {
    const value = categoryTotals[cat];
    const percentage = totalCatExpenses > 0 ? (value / totalCatExpenses) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      category: cat,
      value,
      percentage,
      angle,
      startAngle,
      color: categoryColors[cat] || '#64748b',
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 4 Cards Summary */}
      <div className="stats-grid">
        <div className="card stat-card balance">
          <div className="stat-label">
            <Wallet size={16} style={{ color: 'var(--accent-teal)' }} />
            Net Cash Flow
          </div>
          <div className="stat-value" style={{ color: netCashBalance >= 0 ? '#10b981' : '#f43f5e' }}>
            LKR {netCashBalance.toFixed(2)}
          </div>
          <div className="stat-notes">Income minus Expenses</div>
        </div>

        <div className="card stat-card expense">
          <div className="stat-label">
            <ArrowDownRight size={16} style={{ color: 'var(--status-expense)' }} />
            Total Expenses
          </div>
          <div className="stat-value">LKR {totalExpenses.toFixed(2)}</div>
          <div className="stat-notes">All logged expenses</div>
        </div>

        <div className="card stat-card receivables">
          <div className="stat-label">
            <Users size={16} style={{ color: 'var(--accent-primary)' }} />
            Receivables (ගන්න)
          </div>
          <div className="stat-value" style={{ color: '#6ee7b7' }}>
            LKR {outstandingReceivables.toFixed(2)}
          </div>
          <div className="stat-notes">Unsettled debts owed to you</div>
        </div>

        <div className="card stat-card payables">
          <div className="stat-label">
            <Users size={16} style={{ color: 'var(--status-pending)' }} />
            Payables (දෙන්න)
          </div>
          <div className="stat-value" style={{ color: '#fbcfe8' }}>
            LKR {outstandingPayables.toFixed(2)}
          </div>
          <div className="stat-notes">Unsettled debts you owe others</div>
        </div>
      </div>

      {/* Charts Panel */}
      <div className="charts-grid">
        {/* Daily expense Bar Chart */}
        <div className="card">
          <div className="chart-card-header">
            <h3 className="chart-title">Daily Spending Trend (March 2026)</h3>
            <div className="legend-item" style={{ fontSize: '0.8rem' }}>
              <Calendar size={14} /> Month View
            </div>
          </div>
          <div className="chart-container">
            {sortedDays.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No expense data available. Paste records in Importer.</p>
            ) : (
              <svg className="svg-chart" viewBox={`0 0 ${barChartWidth} ${barChartHeight + 40}`}>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 10 + ratio * barChartHeight;
                  return (
                    <g key={index}>
                      <line x1="30" y1={y} x2={barChartWidth - 10} y2={y} className="svg-grid-line" />
                      <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="8" textAnchor="start">
                        {Math.round((1 - ratio) * maxDailyExpense)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {sortedDays.map((day, idx) => {
                  const val = dailyExpenses[day];
                  const barHeight = (val / maxDailyExpense) * barChartHeight;
                  const x = 40 + idx * ((barChartWidth - 50) / sortedDays.length);
                  const y = 10 + (barChartHeight - barHeight);

                  return (
                    <g key={day}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(1, barHeight)}
                        className="svg-bar"
                      >
                        <title>{`Day ${day}: LKR ${val.toFixed(2)}`}</title>
                      </rect>
                      <text
                        x={x + barWidth / 2}
                        y={barChartHeight + 25}
                        fill="var(--text-secondary)"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Category breakdown Donut Chart */}
        <div className="card">
          <div className="chart-card-header">
            <h3 className="chart-title">Expense Categories</h3>
          </div>
          <div className="chart-container" style={{ flexDirection: 'column', height: 'auto', gap: '1.5rem' }}>
            {categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', height: '180px', display: 'flex', alignItems: 'center' }}>No category data</p>
            ) : (
              <>
                <svg width="150" height="150" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-main)" strokeWidth="10" />
                  {donutData.map((slice, idx) => {
                    const radius = 35;
                    const strokeWidth = 10;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                    
                    // Rotate the segment
                    const rotate = slice.startAngle - 90;

                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        transform={`rotate(${rotate} 50 50)`}
                      >
                        <title>{`${slice.category}: LKR ${slice.value.toFixed(2)} (${slice.percentage.toFixed(1)}%)`}</title>
                      </circle>
                    );
                  })}
                  {/* Text in center */}
                  <text x="50" y="47" fill="var(--text-muted)" fontSize="8" textAnchor="middle">TOTAL</text>
                  <text x="50" y="58" fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {totalExpenses > 1000 ? `${(totalExpenses/1000).toFixed(1)}k` : Math.round(totalExpenses)}
                  </text>
                </svg>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                  {donutData.map((slice, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }}></div>
                        <span>{slice.category}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {slice.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="card">
        <h3 className="chart-title" style={{ marginBottom: '1.25rem' }}>Recent Expenses</h3>
        <div style={{ overflowX: 'auto' }}>
          {expenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No logged transactions yet. Use the Importer or Transactions page to add some.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Calculated Formula</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 5).map(tx => (
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
                    <td className="amount-col expense" style={{ textAlign: 'right' }}>
                      - LKR {tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
