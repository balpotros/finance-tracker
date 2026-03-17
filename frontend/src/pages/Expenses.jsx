import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getExpenses, addExpense, deleteExpense, getCategories } from '../api.js'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const DEFAULT_EXPENSE_CATEGORIES = ['Bills','Car','Clothes','Entertainment','Food','Other','Vacation','House','Subscription','Work','Health','Gift']

export default function Expenses() {
  const { getAccessTokenSilently } = useAuth0()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', notes: '' })
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessTokenSilently()
      const [data, cats] = await Promise.all([
        getExpenses(token, filterFrom || undefined, filterTo || undefined),
        getCategories(token).catch(() => null)
      ])
      setRows(data)
      if (cats?.expense?.length) setExpenseCategories(cats.expense)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [getAccessTokenSilently, filterFrom, filterTo])

  useEffect(() => { load() }, [load])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.date || !form.amount) return
    setSaving(true)
    try {
      const token = await getAccessTokenSilently()
      await addExpense(token, { ...form, amount: parseFloat(form.amount) })
      setForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', notes: '' })
      setShowForm(false)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this expense?')) return
    try {
      const token = await getAccessTokenSilently()
      await deleteExpense(token, id)
      setRows(r => r.filter(x => x.id !== id))
    } catch (e) { setError(e.message) }
  }

  const filtered = rows.filter(r =>
    !search || r.description?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.reduce((s, r) => s + parseFloat(r.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">Expenses</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error} <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button></div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-700">New Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Amount *</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <input type="text" placeholder="e.g. Grocery run" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select category</option>
                {expenseCategories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <input type="text" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-32" />
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={load} className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm transition-colors">Filter</button>
        {(filterFrom || filterTo) && <button onClick={() => { setFilterFrom(''); setFilterTo('') }} className="text-sm text-gray-400 hover:text-red-500">Clear</button>}
        <span className="ml-auto text-sm font-semibold text-red-600">{fmt(total)} total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">💸</div>
          <p>No expenses found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.description || '—'}{r.notes && <span className="block text-xs text-gray-400">{r.notes}</span>}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {r.category && <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">{r.category}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
