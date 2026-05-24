import React, { useMemo, useState } from 'react';
import type { Transaction, Debt } from '../types';
import { ArrowDownRight, ArrowUpRight, Users, Wallet, Calendar, BarChart2, PieChart, TrendingUp } from 'lucide-react';

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

  const dailyNetSeries = dayKeys.map((day) => {
    const expenseVal = dailyExpense[day] || 0;
    const incomeVal = dailyIncome[day] || 0;
    return { day, expense: expenseVal, income: incomeVal, net: incomeVal - expenseVal };
  });

  let running = 0;
  const cumulativeSeries = dailyNetSeries.map((d) => {
    running += d.net;
    return { ...d, cumulative: running };
  });

  const netMin = dailyNetSeries.length ? Math.min(...dailyNetSeries.map((d) => d.net), 0) : 0;
  const netMax = dailyNetSeries.length ? Math.max(...dailyNetSeries.map((d) => d.net), 0) : 1;
  const cumMin = cumulativeSeries.length ? Math.min(...cumulativeSeries.map((d) => d.cumulative), 0) : 0;
  const cumMax = cumulativeSeries.length ? Math.max(...cumulativeSeries.map((d) => d.cumulative), 0) : 1;

  const makeLinePoints = (
    values: number[],
    chartWidth: number,
    chartHeight: number,
    minVal: number,
    maxVal: number,
    padX = 26,
    padY = 12
  ) => {
    const w = chartWidth - padX * 2;
    const h = chartHeight - padY * 2;
    const span = Math.max(1e-9, maxVal - minVal);
    return values.map((v, i) => {
      const x = padX + (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
      const y = padY + (1 - (v - minVal) / span) * h;
      return { x, y };
    });
  };

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

  // Debt activity (by day)
  const dailyReceivable: Record<string, number> = {};
  const dailyPayable: Record<string, number> = {};
  debts.forEach((d) => {
    const day = d.date.substring(8, 10);
    if (d.type === 'RECEIVABLE') dailyReceivable[day] = (dailyReceivable[day] || 0) + d.amount;
    if (d.type === 'PAYABLE') dailyPayable[day] = (dailyPayable[day] || 0) + d.amount;
  });
  const debtDays = Array.from(
    new Set([...Object.keys(dailyReceivable), ...Object.keys(dailyPayable)])
  ).sort((a, b) => Number(a) - Number(b));
  const debtSeries = debtDays.map((day) => ({
    day,
    receivable: dailyReceivable[day] || 0,
    payable: dailyPayable[day] || 0,
  }));

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

          {/* Daily Net Cashflow */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <TrendingUp size={14} style={{ color: 'var(--accent-teal)' }} />
                <h3 className="chart-title">Daily Net Cashflow</h3>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH }}>
              {dailyNetSeries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <TrendingUp size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No daily data</span>
                </div>
              ) : (
                (() => {
                  const w = 520;
                  const h = 140;
                  const padX = 28;
                  const padY = 14;
                  const points = makeLinePoints(dailyNetSeries.map((d) => d.net), w, h, netMin, netMax, padX, padY);
                  const baselineY = makeLinePoints([0], w, h, netMin, netMax, padX, padY)[0].y;
                  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const area = `${path} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

                  return (
                    <svg className="svg-chart" viewBox={`0 0 ${w} ${h}`}>
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padY + ratio * (h - padY * 2);
                        return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} className="svg-grid-line" />;
                      })}
                      <line x1={padX} y1={baselineY} x2={w - padX} y2={baselineY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                      <defs>
                        <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path d={area} fill="url(#netArea)" />
                      <path d={path} fill="none" stroke="var(--accent-teal)" strokeWidth="2" />
                      {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill={dailyNetSeries[idx].net >= 0 ? 'var(--status-income)' : 'var(--status-expense)'} />
                      ))}
                    </svg>
                  );
                })()
              )}
            </div>
          </div>

          {/* Cumulative Balance */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Wallet size={14} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="chart-title">Cumulative Balance</h3>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH }}>
              {cumulativeSeries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Wallet size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No data</span>
                </div>
              ) : (
                (() => {
                  const w = 520;
                  const h = 140;
                  const padX = 28;
                  const padY = 14;
                  const points = makeLinePoints(cumulativeSeries.map((d) => d.cumulative), w, h, cumMin, cumMax, padX, padY);
                  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const last = cumulativeSeries[cumulativeSeries.length - 1].cumulative;
                  return (
                    <svg className="svg-chart" viewBox={`0 0 ${w} ${h}`}>
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padY + ratio * (h - padY * 2);
                        return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} className="svg-grid-line" />;
                      })}
                      <path d={path} fill="none" stroke={last >= 0 ? 'var(--status-income)' : 'var(--status-expense)'} strokeWidth="2.25" />
                      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={last >= 0 ? 'var(--status-income)' : 'var(--status-expense)'} />
                    </svg>
                  );
                })()
              )}
            </div>
          </div>

          {/* Receivables vs Payables trend */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={14} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="chart-title">Receivables vs Payables</h3>
              </div>
            </div>
            <div className="chart-container" style={{ flex: '1 1 0', minHeight: chartMinH, paddingBottom: '1.6rem' }}>
              {debtSeries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Users size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.8rem' }}>No debt activity</span>
                </div>
              ) : (
                (() => {
                  const w = 360;
                  const h = 140;
                  const padX = 28;
                  const padY = 14;
                  const maxVal = Math.max(
                    ...debtSeries.map((d) => Math.max(d.receivable, d.payable)),
                    1
                  );
                  const rPts = makeLinePoints(debtSeries.map((d) => d.receivable), w, h, 0, maxVal, padX, padY);
                  const pPts = makeLinePoints(debtSeries.map((d) => d.payable), w, h, 0, maxVal, padX, padY);
                  const rPath = rPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const pPath = pPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <svg className="svg-chart" viewBox={`0 0 ${w} ${h}`}>
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padY + ratio * (h - padY * 2);
                        return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} className="svg-grid-line" />;
                      })}
                      <path d={rPath} fill="none" stroke="var(--status-income)" strokeWidth="2" />
                      <path d={pPath} fill="none" stroke="var(--status-expense)" strokeWidth="2" />
                    </svg>
                  );
                })()
              )}

              {debtSeries.length > 0 && (
                <div
                  className="chart-legend"
                  style={{
                    position: 'absolute',
                    bottom: '0.55rem',
                    left: 0,
                    right: 0,
                    marginTop: 0,
                    fontSize: '0.75rem',
                    gap: '1.25rem',
                  }}
                >
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--status-income)' }} />
                    Receivable
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--status-expense)' }} />
                    Payable
                  </div>
                </div>
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

          {/* KPI Chips */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={14} style={{ color: 'var(--accent-violet)' }} />
                <h3 className="chart-title">Quick Insights</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignContent: 'flex-start', flex: '1 1 0' }}>
              <span className="tag" style={{ backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.22)', color: 'var(--text-primary)' }}>
                {incomes.length} incomes
              </span>
              <span className="tag" style={{ backgroundColor: 'rgba(244,63,94,0.12)', borderColor: 'rgba(244,63,94,0.22)', color: 'var(--text-primary)' }}>
                {expenses.length} expenses
              </span>
              <span className="tag" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
                Avg expense/day: LKR {fmtLKR(avgExpensePerDay)}
              </span>
              <span className="tag" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
                Largest expense: LKR {fmtLKR(largestExpense)}
              </span>
              <span className="tag" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
                Active days: {dayKeys.length}
              </span>
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
