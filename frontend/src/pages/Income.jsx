import React, { useState, useEffect, useCallback, useContext } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { getIncome, createIncome, updateIncome, deleteIncome } from '../api';
import { UserContext } from '../components/Layout';
import TransactionModal from '../components/TransactionModal';

const CATEGORIES = ['Job','Tax Refund','Investments','Gift','Other','Bonus'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
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

export default function Income() {
  const profile = useContext(UserContext);
  const myId    = profile?.user?.id;

  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [category, setCategory]   = useState('');
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('date');
  const [sortDir, setSortDir]     = useState('desc');

  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteId, setDeleteId]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getIncome({ start_date: startDate, end_date: endDate, category: category || undefined, search: search || undefined, sort_by: sortBy, sort_dir: sortDir })
      .then(setRows)
      .catch(() => setError('Failed to load income'))
      .finally(() => setLoading(false));
  }, [startDate, endDate, category, search, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  async function handleSave(form) {
    if (editing) await updateIncome(editing.id, form);
    else await createIncome(form);
    load();
  }

  async function handleDelete(id) {
    await deleteIncome(id);
    setDeleteId(null);
    load();
  }

  const total = rows.filter(r => !r.hidden).reduce((s, r) => s + parseFloat(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Income</h1>
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" />
          New Income
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label">Search source</label>
            <input type="text" className="input" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={() => { setCategory(''); setSearch(''); }}>Clear</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{rows.length} entries</p>
        <p className="font-semibold text-gray-900">Total: <span className="text-green-600">{fmt(total)}</span></p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th cursor-pointer hover:text-gray-900" onClick={() => toggleSort('date')}>
                Date <SortIcon col="date" />
              </th>
              <th className="table-th cursor-pointer hover:text-gray-900" onClick={() => toggleSort('source')}>
                Source <SortIcon col="source" />
              </th>
              <th className="table-th cursor-pointer hover:text-gray-900 text-right" onClick={() => toggleSort('amount')}>
                Amount <SortIcon col="amount" />
              </th>
              <th className="table-th cursor-pointer hover:text-gray-900" onClick={() => toggleSort('category')}>
                Category <SortIcon col="category" />
              </th>
              <th className="table-th">Notes</th>
              <th className="table-th">By</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No income found.</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.hidden ? 'opacity-50' : ''}`}>
                <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="table-td font-medium">{row.source}</td>
                <td className="table-td text-right font-semibold text-green-600 whitespace-nowrap">{fmt(row.amount)}</td>
                <td className="table-td">
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{row.category}</span>
                  {row.hidden && <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">hidden</span>}
                </td>
                <td className="table-td text-gray-500 max-w-[180px] truncate">{row.notes}</td>
                <td className="table-td text-gray-500">{row.user_name}</td>
                <td className="table-td">
                  {row.user_id === myId ? (
                    <div className="flex gap-2">
                      <button className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                        onClick={() => { setEditing(row); setModalOpen(true); }}>Edit</button>
                      <button className="text-red-500 hover:text-red-700 text-xs font-medium"
                        onClick={() => setDeleteId(row.id)}>Delete</button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        type="income"
        currentUserId={myId}
      />

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Delete income entry?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
