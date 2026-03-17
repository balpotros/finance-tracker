import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCompare } from '../api';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a855f7'];
const ALL_CATS = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function SummaryTable({ label, data, color }) {
  return (
    <div className="card flex-1">
      <h3 className={`font-semibold mb-3 ${color}`}>{label}</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between py-1 border-b border-gray-50">
          <span className="text-gray-500">Income</span>
          <span className="font-medium text-green-600">{fmt(data.totalIncome)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-50">
          <span className="text-gray-500">Expenses</span>
          <span className="font-medium text-red-500">{fmt(data.totalExpenses)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-500">Savings</span>
          <span className={`font-bold ${data.totalSavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {fmt(data.totalSavings)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HistoricalComparison() {
  const now = new Date();

  const [p1Start, setP1Start] = useState(format(startOfMonth(subMonths(now,1)), 'yyyy-MM-dd'));
  const [p1End,   setP1End]   = useState(format(endOfMonth(subMonths(now,1)), 'yyyy-MM-dd'));
  const [p2Start, setP2Start] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [p2End,   setP2End]   = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function compare() {
    setLoading(true);
    setError('');
    try {
      const result = await getCompare({
        period1_start: p1Start, period1_end: p1End,
        period2_start: p2Start, period2_end: p2End,
      });
      setData(result);
    } catch {
      setError('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }

  // Build per-category bar chart data
  const catChartData = data ? ALL_CATS.map(cat => {
    const p1 = data.period1.expensesByCategory.find(r => r.category === cat);
    const p2 = data.period2.expensesByCategory.find(r => r.category === cat);
    const v1 = p1 ? parseFloat(p1.total) : 0;
    const v2 = p2 ? parseFloat(p2.total) : 0;
    if (v1 === 0 && v2 === 0) return null;
    return { category: cat, Period1: v1, Period2: v2 };
  }).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Historical Comparison</h1>

      {/* Period selectors */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h3 className="font-semibold text-blue-700">Period 1</h3>
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" className="input flex-1" value={p1Start} onChange={e => setP1Start(e.target.value)} />
            <span className="text-gray-400">–</span>
            <input type="date" className="input flex-1" value={p1End} onChange={e => setP1End(e.target.value)} />
          </div>
        </div>
        <div className="card space-y-3">
          <h3 className="font-semibold text-purple-700">Period 2</h3>
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" className="input flex-1" value={p2Start} onChange={e => setP2Start(e.target.value)} />
            <span className="text-gray-400">–</span>
            <input type="date" className="input flex-1" value={p2End} onChange={e => setP2End(e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={compare} disabled={loading}>
        {loading ? 'Comparing…' : 'Compare Periods'}
      </button>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      {data && (
        <>
          {/* Summary side by side */}
          <div className="flex flex-col sm:flex-row gap-4">
            <SummaryTable label={`Period 1: ${p1Start} → ${p1End}`} data={data.period1} color="text-blue-700" />
            <SummaryTable label={`Period 2: ${p2Start} → ${p2End}`} data={data.period2} color="text-purple-700" />
          </div>

          {/* Overview bar chart */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Income / Expenses / Savings</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Income',   Period1: data.period1.totalIncome,   Period2: data.period2.totalIncome },
                { name: 'Expenses', Period1: data.period1.totalExpenses, Period2: data.period2.totalExpenses },
                { name: 'Savings',  Period1: data.period1.totalSavings,  Period2: data.period2.totalSavings },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="Period1" name={`P1: ${p1Start}`} fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Period2" name={`P2: ${p2Start}`} fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-category breakdown */}
          {catChartData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Expense Breakdown by Category</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={catChartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(1)}k`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Period1" name={`P1`} fill="#3b82f6" radius={[0,4,4,0]} />
                  <Bar dataKey="Period2" name={`P2`} fill="#a855f7" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Numeric table */}
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Category</th>
                      <th className="table-th text-right text-blue-700">Period 1</th>
                      <th className="table-th text-right text-purple-700">Period 2</th>
                      <th className="table-th text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catChartData.map(row => {
                      const diff = row.Period2 - row.Period1;
                      return (
                        <tr key={row.category} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{row.category}</td>
                          <td className="table-td text-right">{fmt(row.Period1)}</td>
                          <td className="table-td text-right">{fmt(row.Period2)}</td>
                          <td className={`table-td text-right font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {diff > 0 ? '+' : ''}{fmt(diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
