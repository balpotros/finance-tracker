import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { format, parseISO } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { getExpenses, addExpense, deleteExpense, getCategories } from '../api.js'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const DEFAULT_CATEGORIES = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift']

function fmtDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T00:00:00')
    return format(d, 'MMM d, yyyy')
  } catch { return dateStr }
}

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  category: '',
  notes: '',
})

export default function Expenses() {
  const { getAccessTokenSilently } = useAuth0()
  const now = new Date()
  const [filterFrom, setFilterFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [filterTo, setFilterTo]     = useState(now.toISOString().split('T')[0])
  const [search, setSearch]         = useState('')
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(emptyForm())
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessTokenSilently()
      const [data, cats] = await Promise.all([
        getExpenses(token, filterFrom || undefined, filterTo || undefined),
        getCategories(token).catch(() => null),
      ])
      setRows(data)
      if (cats?.expense?.length) setCategories(cats.expense)
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
      setForm(emptyForm())
      setShowForm(false)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    try {
      const token = await getAccessTokenSilently()
      await deleteExpense(token, id)
      setDeleteId(null)
      setRows(r => r.filter(x => x.id !== id))
    } catch (e) { setError(e.message) }
  }

  const filtered = rows.filter(r =>
    !search || r.description?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.reduce((s, r) => s + parseFloat(r.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Expenses</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Expense
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Amount ($) *</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input type="text" className="input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input type="text" className="input" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label">Search</label>
            <input type="text" className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={() => setSearch('')}>Clear</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} entries</p>
        <p className="font-semibold text-gray-900">Total: <span className="text-red-500">{fmt(total)}</span></p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Date</th>
              <th className="table-th">Description</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Category</th>
              <th className="table-th">Notes</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No expenses found.</td></tr>
            ) : filtered.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="table-td font-medium">{row.description || '---'}</td>
                <td className="table-td text-right font-semibold text-red-500 whitespace-nowrap">{fmt(row.amount)}</td>
                <td className="table-td">
                  {row.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{row.category}</span>}
                </td>
                <td className="table-td text-gray-500 max-w-[180px] truncate">{row.notes}</td>
                <td className="table-td">
                  <button className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                    onClick={() => setDeleteId(row.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Delete expense?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
