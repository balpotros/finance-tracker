import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getSummary, getTrend, addExpense, addIncome, getCategories } from '../api.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function StatCard({ label, value, color, sub }) {
  return (
    <div className={`bg-white rounded-xl p-5 border-l-4 shadow-sm ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function QuickAdd({ onAdded }) {
  const { getAccessTokenSilently } = useAuth0()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState({ expense: [], income: [] })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    getAccessTokenSilently()
      .then(t => getCategories(t))
      .then(c => setCategories(c))
      .catch(() => {})
  }, [getAccessTokenSilently])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    try {
      const token = await getAccessTokenSilently()
      const data = { date: new Date().toISOString().split('T')[0], description, amount: parseFloat(amount), category }
      if (type === 'expense') await addExpense(token, data)
      else await addIncome(token, data)
      setAmount('')
      setDescription('')
      setCategory('')
      setFlash(type === 'expense' ? '💸 Expense added!' : '💰 Income added!')
      setTimeout(() => setFlash(null), 2500)
      if (onAdded) onAdded()
    } catch (e) {
      setFlash('Error: ' + e.message)
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const cats = type === 'expense' ? categories.expense : categories.income

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 text-sm">Quick Add</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setType('expense')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${type === 'expense' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >💸 Expense</button>
          <button
            onClick={() => setType('income')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${type === 'income' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >💰 Income</button>
        </div>
      </div>
      {flash && (
        <div className={`text-xs px-3 py-1.5 rounded-lg mb-2 ${flash.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{flash}</div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-24">
          <label className="text-xs text-gray-400 block mb-1">Amount *</label>
          <input
            type="number" step="0.01" min="0" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-28">
          <label className="text-xs text-gray-400 block mb-1">Description</label>
          <input
            type="text" placeholder="e.g. Coffee"
            value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-28">
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">— none —</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button
          type="submit" disabled={saving || !amount}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {saving ? '...' : 'Add'}
        </button>
      </form>
    </div>
  )
}

export default function Dashboard() {
  const { getAccessTokenSilently } = useAuth0()
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const [s, t] = await Promise.all([getSummary(token, from, to), getTrend(token, 12)])
      setSummary(s)
      setTrend(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently, from, to])

  useEffect(() => { load() }, [load])

  // Merge trend data
  const trendData = (() => {
    if (!trend) return []
    const map = {}
    trend.expenses.forEach(r => { map[r.month] = { month: r.month, Expenses: parseFloat(r.total) } })
    trend.income.forEach(r => { if (map[r.month]) map[r.month].Income = parseFloat(r.total); else map[r.month] = { month: r.month, Income: parseFloat(r.total) } })
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month))
  })()

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>

  return (
    <div className="space-y-6">
      {/* Quick Add */}
      <QuickAdd onAdded={load} />

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm">
        <span className="text-sm font-medium text-gray-600">Period:</span>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-gray-400">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={load} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Apply</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Income" value={fmt(summary.total_income)} color="border-green-500" sub={`${summary.income_count} transactions`} />
        <StatCard label="Total Expenses" value={fmt(summary.total_expenses)} color="border-red-400" sub={`${summary.expense_count} transactions`} />
        <StatCard
          label="Balance"
          value={fmt(summary.balance)}
          color={summary.balance >= 0 ? 'border-blue-500' : 'border-orange-400'}
          sub={summary.balance >= 0 ? 'In the green' : 'Deficit'}
        />
      </div>

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Monthly Trend (12 months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#f87171" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.expenses_by_category.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={summary.expenses_by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name || 'Other'} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {summary.expenses_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {summary.income_by_category.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Income by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={summary.income_by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name || 'Other'} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {summary.income_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[['Recent Expenses', summary.recent_expenses, 'text-red-500'], ['Recent Income', summary.recent_income, 'text-green-600']].map(([title, rows, cls]) => (
          <div key={title} className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">{title}</h2>
            {rows.length === 0 ? <p className="text-gray-400 text-sm">No entries yet</p> : (
              <div className="space-y-2">
                {rows.map(r => (
                  <div key={r.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{r.description || '—'}</span>
                      {r.category && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.category}</span>}
                      <span className="block text-xs text-gray-400">{r.date}</span>
                    </div>
                    <span className={`font-semibold ${cls}`}>{fmt(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
