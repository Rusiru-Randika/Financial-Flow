import React from 'react';
import type { Transaction, Debt } from '../types';
import { ArrowDownRight, ArrowUpRight, Users, Wallet, Calendar, BarChart2, PieChart, TrendingUp } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, debts }) => {
  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const incomes  = transactions.filter(t => t.type === 'INCOME');

  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const totalIncomes  = incomes.reduce((acc, t)  => acc + t.amount, 0);

  const outstandingReceivables = debts
    .filter(d => d.type === 'RECEIVABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  const outstandingPayables = debts
    .filter(d => d.type === 'PAYABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  const netCashBalance = totalIncomes - totalExpenses;

  // Category summary
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const categories = Object.keys(categoryTotals);
  const totalCatExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const categoryColors: { [key: string]: string } = {
    'Food & Drinks':       '#f43f5e',
    'Transport':           '#06b6d4',
    'Utilities & Mobile':  '#eab308',
    'Education':           '#a855f7',
    'Shopping & Gifts':    '#ec4899',
    'Health & Fitness':    '#10b981',
    'Others':              '#64748b',
  };

  // Daily chart
  const dailyExpenses: { [date: string]: number } = {};
  expenses.forEach(t => {
    const day = t.date.substring(8, 10);
    dailyExpenses[day] = (dailyExpenses[day] || 0) + t.amount;
  });
  const sortedDays = Object.keys(dailyExpenses).sort((a, b) => Number(a) - Number(b));
  const maxDailyExpense = sortedDays.length > 0 ? Math.max(...Object.values(dailyExpenses)) : 1000;

  const barChartHeight = 100;
  const barChartWidth  = 500;
  const barWidth = sortedDays.length > 0
    ? Math.max(8, Math.floor((barChartWidth - 40) / sortedDays.length) - 6)
    : 22;

  // Donut
  let accumulatedAngle = 0;
  const donutData = categories.map(cat => {
    const value      = categoryTotals[cat];
    const percentage = totalCatExpenses > 0 ? (value / totalCatExpenses) * 100 : 0;
    const angle      = (percentage / 100) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return { category: cat, value, percentage, angle, startAngle, color: categoryColors[cat] || '#64748b' };
  });

  const fmtLKR = (n: number) =>
    n >= 100000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        {/* Net Cash Flow */}
        <div className="card stat-card balance">
          <div className="stat-label">
            <div className="stat-icon-wrap" style={{ background: 'rgba(6,182,212,0.15)' }}>
              <Wallet size={13} style={{ color: '#06b6d4' }} />
            </div>
            Net Cash Flow
          </div>
          <div className="stat-value" style={{ color: netCashBalance >= 0 ? '#34d399' : '#fb7185' }}>
            LKR {fmtLKR(Math.abs(netCashBalance))}
          </div>
          <div className="stat-notes">
            {netCashBalance >= 0 ? '▲ Surplus' : '▼ Deficit'} · Income minus Expenses
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card stat-card expense">
          <div className="stat-label">
            <div className="stat-icon-wrap" style={{ background: 'rgba(244,63,94,0.15)' }}>
              <ArrowDownRight size={13} style={{ color: '#f43f5e' }} />
            </div>
            Total Expenses
          </div>
          <div className="stat-value" style={{ color: '#fb7185' }}>
            LKR {fmtLKR(totalExpenses)}
          </div>
          <div className="stat-notes">{expenses.length} transactions</div>
        </div>

        {/* Receivables */}
        <div className="card stat-card receivables">
          <div className="stat-label">
            <div className="stat-icon-wrap" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <ArrowUpRight size={13} style={{ color: '#818cf8' }} />
            </div>
            Receivables
          </div>
          <div className="stat-value" style={{ color: '#a5b4fc' }}>
            LKR {fmtLKR(outstandingReceivables)}
          </div>
          <div className="stat-notes">Owed to you</div>
        </div>

        {/* Payables */}
        <div className="card stat-card payables">
          <div className="stat-label">
            <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Users size={13} style={{ color: '#f59e0b' }} />
            </div>
            Payables
          </div>
          <div className="stat-value" style={{ color: '#fcd34d' }}>
            LKR {fmtLKR(outstandingPayables)}
          </div>
          <div className="stat-notes">You owe others</div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="charts-grid" style={{ flex: '1 1 0', minHeight: 0 }}>
        {/* Bar Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BarChart2 size={14} style={{ color: '#6366f1' }} />
              <h3 className="chart-title">Daily Spending Trend</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Calendar size={12} />
              <span>Month View</span>
            </div>
          </div>

          <div className="chart-container" style={{ flex: '1 1 0', minHeight: 0 }}>
            {sortedDays.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <TrendingUp size={28} style={{ opacity: 0.25 }} />
                <span style={{ fontSize: '0.8rem' }}>No expense data yet</span>
              </div>
            ) : (
              <svg className="svg-chart" viewBox={`0 0 ${barChartWidth} ${barChartHeight + 30}`}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = 8 + ratio * barChartHeight;
                  return (
                    <g key={i}>
                      <line x1="30" y1={y} x2={barChartWidth - 10} y2={y}
                        stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="7" textAnchor="start">
                        {Math.round((1 - ratio) * maxDailyExpense)}
                      </text>
                    </g>
                  );
                })}
                {sortedDays.map((day, idx) => {
                  const val       = dailyExpenses[day];
                  const barH      = (val / maxDailyExpense) * barChartHeight;
                  const x         = 40 + idx * ((barChartWidth - 50) / sortedDays.length);
                  const y         = 8 + (barChartHeight - barH);
                  return (
                    <g key={day}>
                      {/* Background track */}
                      <rect x={x} y={8} width={barWidth} height={barChartHeight}
                        fill="rgba(255,255,255,0.02)" rx="3" />
                      {/* Value bar with gradient */}
                      <defs>
                        <linearGradient id={`bg${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <rect x={x} y={y} width={barWidth} height={Math.max(2, barH)}
                        fill={`url(#bg${idx})`} rx="3" className="svg-bar">
                        <title>{`Day ${day}: LKR ${val.toFixed(2)}`}</title>
                      </rect>
                      <text x={x + barWidth / 2} y={barChartHeight + 22}
                        fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                        {day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <PieChart size={14} style={{ color: '#06b6d4' }} />
              <h3 className="chart-title">Categories</h3>
            </div>
          </div>

          <div className="chart-container" style={{ flexDirection: 'column', flex: '1 1 0', minHeight: 0, height: 'auto', gap: '0.75rem', overflowY: 'auto' }}>
            {categories.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                <PieChart size={28} style={{ opacity: 0.25 }} />
                <span style={{ fontSize: '0.8rem' }}>No category data</span>
              </div>
            ) : (
              <>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  {donutData.map((slice, idx) => {
                    const radius = 35;
                    const sw     = 10;
                    const circ   = 2 * Math.PI * radius;
                    const dash   = `${(slice.percentage / 100) * circ} ${circ}`;
                    const rotate = slice.startAngle - 90;
                    return (
                      <circle key={idx} cx="50" cy="50" r={radius}
                        fill="transparent" stroke={slice.color}
                        strokeWidth={sw} strokeDasharray={dash}
                        transform={`rotate(${rotate} 50 50)`}
                        style={{ filter: `drop-shadow(0 0 4px ${slice.color}88)` }}>
                        <title>{`${slice.category}: LKR ${slice.value.toFixed(2)} (${slice.percentage.toFixed(1)}%)`}</title>
                      </circle>
                    );
                  })}
                  <text x="50" y="47" fill="var(--text-muted)" fontSize="7" textAnchor="middle">TOTAL</text>
                  <text x="50" y="57" fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {totalExpenses > 1000 ? `${(totalExpenses / 1000).toFixed(1)}k` : Math.round(totalExpenses)}
                  </text>
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
                  {donutData.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.category}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {s.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Expenses ── */}
      <div className="card" style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
          <TrendingUp size={14} style={{ color: '#f43f5e' }} />
          <h3 className="chart-title">Recent Expenses</h3>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          {expenses.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              color: 'var(--text-muted)',
              minHeight: '120px',
            }}>
              <ArrowDownRight size={32} style={{ opacity: 0.18 }} />
              <span style={{ fontSize: '0.85rem' }}>No transactions yet. Add one in the Expenses Ledger.</span>
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
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 4).map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{tx.date}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{tx.description}</td>
                    <td>
                      <span className={`tag ${tx.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-teal)', fontSize: '0.78rem' }}>
                      {tx.rawExpression !== String(tx.amount) ? tx.rawExpression : '—'}
                    </td>
                    <td className="amount-col expense" style={{ textAlign: 'right' }}>
                      − LKR {tx.amount.toFixed(2)}
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
