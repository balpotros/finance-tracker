import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, PiggyBank, Percent } from 'lucide-react'
import { getSummary, getTrend } from '../api.js'
import { format, parseISO } from 'date-fns'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a855f7']

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function fmtDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T00:00:00')
    return format(d, 'MMM d, yyyy')
  } catch { return dateStr }
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
  )
}

export default function Dashboard({ onNavigate }) {
  const { getAccessTokenSilently } = useAuth0()
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [from, setFrom] = useState(thisMonthStart)
  const [to, setTo]     = useState(today)
  const [summary, setSummary] = useState(null)
  const [trend, setTrend]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const [s, t] = await Promise.all([getSummary(token, from, to), getTrend(token, 12)])
      setSummary({
        total_income: s.summary?.totalIncome || 0,
        total_expenses: s.summary?.totalExpenses || 0,
        balance: s.summary?.totalSavings || 0,
        expenses_by_category: (s.expensesByCategory || []).map(r => ({ ...r, total: parseFloat(r.total) })),
        recent_expenses: (s.recentTransactions || []).filter(r => r.type === 'expense').map(r => ({ ...r, description: r.vendor })),
        recent_income: (s.recentTransactions || []).filter(r => r.type === 'income').map(r => ({ ...r, description: r.vendor })),
      })
      setTrend({
        income: (t.monthly || []).map(m => ({ month: m.month, total: parseFloat(m.income) })),
        expenses: (t.monthly || []).map(m => ({ month: m.month, total: parseFloat(m.expenses) })),
      })
    } catch (e) {
      if (e.message?.toLowerCase().includes('household')) {
        onNavigate?.('settings')
        return
      }
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently, from, to, onNavigate])

  useEffect(() => { load() }, [load])

  const trendData = (() => {
    if (!trend) return []
    const map = {}
    trend.expenses.forEach(r => { map[r.month] = { month: r.month, expenses: parseFloat(r.total) } })
    trend.income.forEach(r => {
      if (map[r.month]) map[r.month].income = parseFloat(r.total)
      else map[r.month] = { month: r.month, income: parseFloat(r.total) }
    })
    Object.values(map).forEach(m => { m.savings = (m.income || 0) - (m.expenses || 0) })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  })()

  const recentTransactions = (() => {
    if (!summary) return []
    const expenses = (summary.recent_expenses || []).map(r => ({ ...r, type: 'expense' }))
    const income   = (summary.recent_income   || []).map(r => ({ ...r, type: 'income' }))
    return [...expenses, ...income].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)
  })()

  const savingsRate = summary && summary.total_income > 0
    ? (summary.balance / summary.total_income) * 100
    : 0
  const savingsRateColor = savingsRate >= 20 ? 'text-green-600' : savingsRate >= 0 ? 'text-yellow-600' : 'text-red-600'

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const presets = [
    { label: 'This Month', from: thisMonthStart, to: today },
    { label: 'Last Month', from: lastMonthStart, to: lastMonthEnd },
    { label: 'This Year',  from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                from === p.from && to === p.to
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>{p.label}</button>
          ))}
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-36" />
          <span className="text-gray-400">--</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-36" />
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Loading...</div>}
      {error   && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

      {summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Income"   value={fmt(summary.total_income)}   icon={TrendingUp}
              iconBg="bg-green-50" iconColor="text-green-600" valueColor="text-green-600" />
            <StatCard label="Total Expenses" value={fmt(summary.total_expenses)} icon={TrendingDown}
              iconBg="bg-red-50"   iconColor="text-red-500"   valueColor="text-red-500" />
            <StatCard label="Balance"        value={fmt(summary.balance)}        icon={PiggyBank}
              iconBg="bg-blue-50"  iconColor="text-blue-600"
              valueColor={summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'} />
            <StatCard label="Savings Rate"   value={`${savingsRate.toFixed(1)}%`} icon={Percent}
              iconBg={savingsRate >= 20 ? 'bg-green-50' : savingsRate >= 0 ? 'bg-yellow-50' : 'bg-red-50'}
              iconColor={savingsRate >= 20 ? 'text-green-600' : savingsRate >= 0 ? 'text-yellow-600' : 'text-red-500'}
              valueColor={savingsRateColor} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Overview (12 months)</h2>
              {trendData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend />
                    <Bar dataKey="income"   name="Income"   fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="savings"  name="Savings"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Expenses by Category</h2>
              {!summary.expenses_by_category?.length ? (
                <p className="text-gray-400 text-sm text-center py-8">No expenses for selected period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={summary.expenses_by_category} dataKey="total" nameKey="category"
                      cx="50%" cy="45%" outerRadius={90} innerRadius={45}>
                      {summary.expenses_by_category.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [fmt(v), name]} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            {recentTransactions.length === 0 ? (
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
                      <th className="table-th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTransactions.map(t => (
                      <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="table-td font-medium">{t.description || '---'}</td>
                        <td className="table-td">
                          {t.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{t.category}</span>}
                        </td>
                        <td className="table-td">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{t.type}</span>
                        </td>
                        <td className={`table-td text-right font-semibold whitespace-nowrap ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
