import React, { useMemo, useState } from 'react';
import type { Transaction, Debt } from '../types';
import { ArrowDownRight, ArrowUpRight, Users, Wallet, Calendar, BarChart2, PieChart, TrendingUp, Shield, Zap } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, debts }) => {
  const [showAllRecentExpenses, setShowAllRecentExpenses] = useState(false);

  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const incomes  = transactions.filter(t => t.type === 'INCOME');

  const RECENT_EXPENSES_DEFAULT_COUNT = 3;
  const canExpandRecentExpenses = expenses.length > RECENT_EXPENSES_DEFAULT_COUNT;
  const visibleRecentExpenses = useMemo(
    () => (showAllRecentExpenses ? expenses : expenses.slice(0, RECENT_EXPENSES_DEFAULT_COUNT)),
    [expenses, showAllRecentExpenses]
  );

  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const totalIncomes  = incomes.reduce((acc, t)  => acc + t.amount, 0);

  const outstandingReceivables = debts
    .filter(d => d.type === 'RECEIVABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  const outstandingPayables = debts
    .filter(d => d.type === 'PAYABLE' && !d.settled)
    .reduce((acc, d) => acc + d.amount, 0);

  const netCashBalance = totalIncomes - totalExpenses;

  // Daily series (selected month)
  const dailyExpense: Record<string, number> = {};
  const dailyIncome: Record<string, number> = {};
  transactions.forEach((t) => {
    const day = t.date.substring(8, 10);
    if (t.type === 'EXPENSE') dailyExpense[day] = (dailyExpense[day] || 0) + t.amount;
    if (t.type === 'INCOME') dailyIncome[day] = (dailyIncome[day] || 0) + t.amount;
  });
  const dayKeys = Array.from(
    new Set([...Object.keys(dailyExpense), ...Object.keys(dailyIncome)])
  ).sort((a, b) => Number(a) - Number(b));

  // Category summary
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const categories = Object.keys(categoryTotals);
  const totalCatExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, value]) => ({ category, value }));

  const categoryColors: { [key: string]: string } = {
    'Food & Drinks':       '#f43f5e',
    'Transport':           '#06b6d4',
    'Utilities & Mobile':  '#eab308',
    'Education':           '#a855f7',
    'Shopping & Gifts':    '#ec4899',
    'Health & Fitness':    '#10b981',
    'Others':              '#64748b',
  };



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

  const largestExpense = expenses.reduce((max, t) => (t.amount > max ? t.amount : max), 0);
  const expenseDays = Object.keys(dailyExpense).length;
  const avgExpensePerDay = expenseDays > 0 ? totalExpenses / expenseDays : 0;

  // Savings rate
  const savingsRate = totalIncomes > 0 ? ((totalIncomes - totalExpenses) / totalIncomes) * 100 : 0;

  // Top 5 biggest expenses
  const topExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [expenses]
  );

  // Debt summary: per-person net balance
  const debtByPerson = useMemo(() => {
    const map: Record<string, { receivable: number; payable: number }> = {};
    debts.filter(d => !d.settled).forEach(d => {
      if (!map[d.person]) map[d.person] = { receivable: 0, payable: 0 };
      if (d.type === 'RECEIVABLE') map[d.person].receivable += d.amount;
      else map[d.person].payable += d.amount;
    });
    return Object.entries(map)
      .map(([person, { receivable, payable }]) => ({ person, receivable, payable, net: receivable - payable }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [debts]);

  // Days elapsed in current month & days remaining
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const projectedMonthExpense = expenseDays > 0 ? (totalExpenses / dayOfMonth) * daysInMonth : 0;

  // Expense ratio (expense / income)
  const expenseRatio = totalIncomes > 0 ? (totalExpenses / totalIncomes) * 100 : (totalExpenses > 0 ? 100 : 0);

  const chartMinH = 120;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

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
      <div className="charts-grid">
        {/* Left: 2-column sub-grid (replaces the single big chart) */}
        <div className="dashboard-left-grid">
          {/* Income vs Expense */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BarChart2 size={14} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="chart-title">Income vs Expenses</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <Calendar size={12} />
                <span>Selected Month</span>
              </div>
            </div>
            <div
              className="chart-container"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                gap: '0.7rem',
                flex: '1 1 0',
                minHeight: chartMinH,
              }}
            >
              {totalIncomes === 0 && totalExpenses === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <TrendingUp size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No transactions yet</span>
                </div>
              ) : (
                <>
                  {(() => {
                    const maxVal = Math.max(totalIncomes, totalExpenses, 1);
                    const incomePct = (totalIncomes / maxVal) * 100;
                    const expensePct = (totalExpenses / maxVal) * 100;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>Income</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontWeight: 700 }}>LKR {fmtLKR(totalIncomes)}</span>
                        </div>
                        <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${incomePct}%`, height: '100%', background: 'var(--status-income)' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          <span>Expenses</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontWeight: 700 }}>LKR {fmtLKR(totalExpenses)}</span>
                        </div>
                        <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${expensePct}%`, height: '100%', background: 'var(--status-expense)' }} />
                        </div>

                        <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>Net</span>
                          <span style={{ fontWeight: 800, color: netCashBalance >= 0 ? 'var(--status-income)' : 'var(--status-expense)', fontVariantNumeric: 'tabular-nums' }}>
                            {netCashBalance >= 0 ? '+' : '−'} LKR {fmtLKR(Math.abs(netCashBalance))}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Savings & Spending Pace */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Shield size={14} style={{ color: savingsRate >= 20 ? 'var(--status-income)' : savingsRate >= 0 ? '#eab308' : 'var(--status-expense)' }} />
                <h3 className="chart-title">Savings Rate</h3>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              {totalIncomes === 0 && totalExpenses === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Shield size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No data yet</span>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 120 70" style={{ width: '100%', maxWidth: '180px' }}>
                    <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none"
                      stroke={savingsRate >= 20 ? 'var(--status-income)' : savingsRate >= 0 ? '#eab308' : 'var(--status-expense)'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, Math.min(100, savingsRate)) / 100 * 141.37} 141.37`}
                    />
                    <text x="60" y="52" fill="var(--text-primary)" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-display)">
                      {savingsRate.toFixed(0)}%
                    </text>
                    <text x="60" y="65" fill="var(--text-muted)" fontSize="7" textAnchor="middle">saved</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Avg / day</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>LKR {fmtLKR(avgExpensePerDay)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Projected month</span>
                      <span style={{ fontWeight: 700, color: projectedMonthExpense > totalIncomes ? 'var(--status-expense)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>LKR {fmtLKR(projectedMonthExpense)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top Expenses */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Zap size={14} style={{ color: '#f59e0b' }} />
                <h3 className="chart-title">Top Expenses</h3>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH, flexDirection: 'column', justifyContent: 'flex-start', gap: '0.1rem', alignItems: 'stretch', overflowY: 'auto', paddingRight: '0.6rem' }}>
              {topExpenses.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Zap size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No expenses yet</span>
                </div>
              ) : (
                topExpenses.map((tx, i) => {
                  const pct = largestExpense > 0 ? (tx.amount / largestExpense) * 100 : 0;
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', marginBottom: '0.2rem', borderBottom: i < topExpenses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ width: '18px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-expense)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontFamily: 'var(--font-display)' }}>LKR {tx.amount.toFixed(2)}</span>
                        </div>
                        <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', marginTop: '0.3rem', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--status-expense)', borderRadius: '999px', opacity: 0.7 }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Debt Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={14} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="chart-title">Debt Summary</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--status-income)' }}>● Owed to you</span>
                <span style={{ color: 'var(--status-expense)' }}>● You owe</span>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH, flexDirection: 'column', justifyContent: 'flex-start', gap: '0.1rem', alignItems: 'stretch', overflowY: 'auto', paddingRight: '0.6rem' }}>
              {debtByPerson.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Users size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No outstanding debts</span>
                </div>
              ) : (
                debtByPerson.map((d, i) => (
                  <div key={d.person} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.45rem 0', borderBottom: i < debtByPerson.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{d.person}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: d.net >= 0 ? 'var(--status-income)' : 'var(--status-expense)' }}>
                      {d.net >= 0 ? '+' : '−'} LKR {Math.abs(d.net).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: stacked cards */}
        <div className="dashboard-right-stack">
          {/* Categories (donut + top list) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <PieChart size={14} style={{ color: 'var(--accent-teal)' }} />
                <h3 className="chart-title">Categories</h3>
              </div>
            </div>

            <div
              className="chart-container"
              style={{
                flexDirection: 'column',
                flex: '0 0 auto',
                minHeight: 'unset',
                height: 'auto',
                gap: '0.75rem',
                overflowY: 'auto',
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingBottom: '0.25rem',
              }}
            >
              {categories.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                  <PieChart size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No category data</span>
                </div>
              ) : (
                <>
                  <svg className="category-donut" viewBox="0 0 100 100" aria-label="Expense category breakdown">
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
                          >
                          <title>{`${slice.category}: LKR ${slice.value.toFixed(2)} (${slice.percentage.toFixed(1)}%)`}</title>
                        </circle>
                      );
                    })}
                    <text x="50" y="47" fill="var(--text-muted)" fontSize="7" textAnchor="middle">TOTAL</text>
                    <text x="50" y="57" fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {totalExpenses > 1000 ? `${(totalExpenses / 1000).toFixed(1)}k` : Math.round(totalExpenses)}
                    </text>
                  </svg>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                    {topCategories.map((c) => {
                      const pct = totalCatExpenses > 0 ? (c.value / totalCatExpenses) * 100 : 0;
                      const color = categoryColors[c.category] || 'var(--text-muted)';
                      return (
                        <div key={c.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color }} />
                              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                            </div>
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Financial Health */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <TrendingUp size={14} style={{ color: 'var(--accent-violet)' }} />
                <h3 className="chart-title">Financial Health</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: '1 1 0' }}>
              {/* Expense Ratio */}
              <div style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Expense Ratio</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: expenseRatio > 90 ? 'var(--status-expense)' : expenseRatio > 70 ? '#eab308' : 'var(--status-income)', fontFamily: 'var(--font-display)' }}>
                    {expenseRatio.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, expenseRatio)}%`, height: '100%', borderRadius: '999px', background: expenseRatio > 90 ? 'var(--status-expense)' : expenseRatio > 70 ? '#eab308' : 'var(--status-income)', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Transactions</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{transactions.length}</div>
                </div>
                <div style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Largest Expense</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--status-expense)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>LKR {fmtLKR(largestExpense)}</div>
                </div>
                <div style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Active Days</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{dayKeys.length}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}> / {daysInMonth}</span></div>
                </div>
                <div style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Net Debt</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: outstandingReceivables - outstandingPayables >= 0 ? 'var(--status-income)' : 'var(--status-expense)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                    {outstandingReceivables - outstandingPayables >= 0 ? '+' : '−'} LKR {fmtLKR(Math.abs(outstandingReceivables - outstandingPayables))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Expenses ── */}
      <div className="card recent-transactions-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <TrendingUp size={14} style={{ color: '#f43f5e' }} />
            <h3 className="chart-title">Recent Expenses</h3>
          </div>
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
            <>
              {/* Desktop / tablet table */}
              <div className="recent-expenses-desktop">
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
                    {visibleRecentExpenses.map(tx => (
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
              </div>

              {/* Mobile list: Description + Amount primary */}
              <div className="recent-expenses-mobile">
                {visibleRecentExpenses.map((tx) => (
                  <div key={tx.id} className="recent-expense-item">
                    <div className="recent-expense-main">
                      <div className="recent-expense-desc">{tx.description}</div>
                      <div className="recent-expense-amt">− LKR {tx.amount.toFixed(2)}</div>
                    </div>
                    <div className="recent-expense-sub">
                      <span className={`tag ${tx.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                        {tx.category}
                      </span>
                      <span className="recent-expense-date">{tx.date}</span>
                      <span className="recent-expense-formula">
                        {tx.rawExpression !== String(tx.amount) ? tx.rawExpression : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {canExpandRecentExpenses && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
              onClick={() => setShowAllRecentExpenses((v) => !v)}
            >
              {showAllRecentExpenses ? 'View less' : 'View more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
