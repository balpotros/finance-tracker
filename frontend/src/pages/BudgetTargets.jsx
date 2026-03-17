import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getBudget, getBudgetActuals, upsertBudget } from '../api';

const CATEGORIES = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function ProgressBar({ actual, target }) {
  if (!target) return null;
  const pct = Math.min((actual / target) * 100, 100);
  const over = actual > target;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : 'bg-green-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BudgetTargets() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const [targets, setTargets]   = useState({});
  const [actuals, setActuals]   = useState([]);
  const [editing, setEditing]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState('');
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        getBudget(),
        getBudgetActuals({ start_date: startDate, end_date: endDate }),
      ]);
      const tmap = {};
      for (const row of t) tmap[row.category] = row.monthly_amount;
      setTargets(tmap);

      const amap = {};
      for (const row of a) amap[row.category] = row.actual;
      setActuals(amap);
    } catch {
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [startDate, endDate]);

  function startEdit(cat) {
    setEditing(e => ({ ...e, [cat]: String(targets[cat] || '') }));
  }

  async function saveTarget(cat) {
    const val = parseFloat(editing[cat]);
    if (isNaN(val) || val < 0) return;
    setSaving(cat);
    try {
      await upsertBudget(cat, { monthly_amount: val });
      setTargets(t => ({ ...t, [cat]: val }));
      setEditing(e => { const n = { ...e }; delete n[cat]; return n; });
    } catch {
      setError('Failed to save target');
    } finally {
      setSaving('');
    }
  }

  const totalTarget = Object.values(targets).reduce((s, v) => s + parseFloat(v || 0), 0);
  const totalActual  = CATEGORIES.reduce((s, c) => s + (parseFloat(actuals[c]) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Budget Targets</h1>
        <div className="flex gap-2 items-center">
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-gray-400">–</span>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalTarget)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className={`text-xl font-bold ${totalActual > totalTarget ? 'text-red-500' : 'text-gray-900'}`}>{fmt(totalActual)}</p>
        </div>
        <div className="card col-span-2 sm:col-span-1">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className={`text-xl font-bold ${totalTarget - totalActual < 0 ? 'text-red-500' : 'text-green-600'}`}>
            {fmt(totalTarget - totalActual)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th text-right">Monthly Target</th>
                <th className="table-th text-right">Actual</th>
                <th className="table-th text-right">Remaining</th>
                <th className="table-th w-48">Progress</th>
                <th className="table-th">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {CATEGORIES.map(cat => {
                const target = parseFloat(targets[cat] || 0);
                const actual  = parseFloat(actuals[cat] || 0);
                const rem     = target - actual;
                const over    = actual > target && target > 0;
                const isEditing = editing[cat] !== undefined;

                return (
                  <tr key={cat} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{cat}</td>
                    <td className="table-td text-right">
                      {isEditing ? (
                        <input type="number" min="0" step="10"
                          className="input w-28 text-right"
                          value={editing[cat]}
                          onChange={e => setEditing(ed => ({ ...ed, [cat]: e.target.value }))}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveTarget(cat); if (e.key === 'Escape') setEditing(ed => { const n={...ed}; delete n[cat]; return n; }); }}
                        />
                      ) : (
                        <span className={target ? '' : 'text-gray-300'}>{target ? fmt(target) : '—'}</span>
                      )}
                    </td>
                    <td className={`table-td text-right font-semibold ${over ? 'text-red-500' : 'text-gray-700'}`}>
                      {actual ? fmt(actual) : '—'}
                    </td>
                    <td className={`table-td text-right ${rem < 0 ? 'text-red-500 font-semibold' : rem > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {target ? fmt(rem) : '—'}
                    </td>
                    <td className="table-td">
                      {target > 0 && <ProgressBar actual={actual} target={target} />}
                    </td>
                    <td className="table-td">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button className="text-blue-600 text-xs font-medium" onClick={() => saveTarget(cat)}
                            disabled={saving === cat}>{saving === cat ? '…' : 'Save'}</button>
                          <button className="text-gray-400 text-xs"
                            onClick={() => setEditing(e => { const n={...e}; delete n[cat]; return n; })}>Cancel</button>
                        </div>
                      ) : (
                        <button className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                          onClick={() => startEdit(cat)}>
                          {target ? 'Edit' : 'Set target'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
