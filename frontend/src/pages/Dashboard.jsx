import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Percent } from 'lucide-react';
import { getDashboard } from '../api';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a855f7'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T00:00:00');
    return format(d, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, valueColor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-0.5">{label}</p>
          <p className={`text-2xl font-bold truncate ${valueColor}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#111" fontSize={14} fontWeight={600}>
        {payload.category}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#555" fontSize={13}>
        {fmt(value)}
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="#999" fontSize={11}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

export default function Dashboard() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    getDashboard({ start_date: startDate, end_date: endDate })
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const presets = [
    { label: 'This Month', start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') },
    { label: 'Last Month', start: format(startOfMonth(subMonths(now,1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(now,1)), 'yyyy-MM-dd') },
    { label: 'Last 3M',    start: format(startOfMonth(subMonths(now,2)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') },
    { label: 'Last 6M',    start: format(startOfMonth(subMonths(now,5)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') },
    { label: 'This Year',  start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` },
  ];

  const savingsRate = data?.summary?.savingsRate ?? 0;
  const savingsRateColor = savingsRate >= 20 ? 'text-green-600' : savingsRate >= 0 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                startDate === p.start && endDate === p.end
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" />
          <span className="text-gray-400">–</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" />
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Loading...</div>}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Income"
              value={fmt(data.summary.totalIncome)}
              icon={TrendingUp}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              valueColor="text-green-600"
            />
            <StatCard
              label="Total Expenses"
              value={fmt(data.summary.totalExpenses)}
              icon={TrendingDown}
              iconBg="bg-red-50"
              iconColor="text-red-500"
              valueColor="text-red-500"
            />
            <StatCard
              label="Total Savings"
              value={fmt(data.summary.totalSavings)}
              icon={PiggyBank}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              valueColor={data.summary.totalSavings >= 0 ? 'text-blue-600' : 'text-red-600'}
            />
            <StatCard
              label="Savings Rate"
              value={`${data.summary.savingsRate.toFixed(1)}%`}
              icon={Percent}
              iconBg={savingsRate >= 20 ? 'bg-green-50' : savingsRate >= 0 ? 'bg-yellow-50' : 'bg-red-50'}
              iconColor={savingsRate >= 20 ? 'text-green-600' : savingsRate >= 0 ? 'text-yellow-600' : 'text-red-500'}
              valueColor={savingsRateColor}
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Overview</h2>
              {data.monthly.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data for selected period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthly} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="income"   name="Income"   fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="savings"  name="Savings"  fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Expenses by Category</h2>
              {data.expensesByCategory.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No expenses for selected period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={data.expensesByCategory}
                      dataKey="total"
                      nameKey="category"
                      cx="50%" cy="50%"
                      innerRadius={70} outerRadius={100}
                      onMouseEnter={(_, i) => setActiveIndex(i)}
                    >
                      {data.expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            {data.recentTransactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No transactions for selected period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Date</th>
                      <th className="table-th">Description</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Type</th>
                      <th className="table-th">By</th>
                      <th className="table-th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentTransactions.map((t) => (
                      <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="table-td font-medium">{t.vendor}</td>
                        <td className="table-td">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{t.category}</span>
                        </td>
                        <td className="table-td">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{t.type}</span>
                        </td>
                        <td className="table-td text-gray-500">{t.user_name}</td>
                        <td className={`table-td text-right font-semibold whitespace-nowrap ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
