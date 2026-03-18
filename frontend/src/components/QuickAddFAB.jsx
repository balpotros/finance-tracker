import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { addExpense, addIncome, getCategories, getSuggestions } from '../api.js'
import AutocompleteInput from './AutocompleteInput.jsx'

export default function QuickAddFAB() {
  const { getAccessTokenSilently } = useAuth0()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [vendorSource, setVendorSource] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState({ expense: [], income: [] })
  const [suggestions, setSuggestions] = useState([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!open) return
    getAccessTokenSilently()
      .then(t => getCategories(t))
      .then(c => setCategories(c))
      .catch(() => {})
  }, [open, getAccessTokenSilently])

  useEffect(() => {
    if (!open) return
    getAccessTokenSilently()
      .then(t => getSuggestions(t, type))
      .then(data => setSuggestions(Array.isArray(data) ? data : (data.suggestions || [])))
      .catch(() => setSuggestions([]))
  }, [open, type, getAccessTokenSilently])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const reset = () => {
    setAmount('')
    setVendorSource('')
    setCategory('')
    setDate(new Date().toISOString().split('T')[0])
    setFlash(null)
    setType('expense')
  }

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!amount || !category || !vendorSource) return
    setSaving(true)
    try {
      const token = await getAccessTokenSilently()
      const data = type === 'expense'
        ? { date, vendor: vendorSource, amount: parseFloat(amount), category }
        : { date, source: vendorSource, amount: parseFloat(amount), category }
      if (type === 'expense') await addExpense(token, data)
      else await addIncome(token, data)
      setFlash({ ok: true, msg: type === 'expense' ? 'Expense added!' : 'Income added!' })
      reset()
      setTimeout(() => {
        setFlash(null)
        setOpen(false)
      }, 1200)
    } catch (err) {
      setFlash({ ok: false, msg: 'Error: ' + err.message })
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const cats = type === 'expense' ? categories.expense : categories.income

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed bottom-20 sm:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 active:scale-95 shadow-lg shadow-green-900/40 flex items-center justify-center transition-all duration-150"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-base">Quick Add</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Type Toggle */}
            <div className="flex gap-2 mb-5 bg-gray-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategory('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategory('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === 'income'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💰 Income
              </button>
            </div>

            {/* Flash message */}
            {flash && (
              <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${flash.ok ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>
                {flash.msg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">— select —</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Vendor / Source */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{type === 'expense' ? 'Vendor *' : 'Source *'}</label>
                <AutocompleteInput
                  value={vendorSource}
                  onChange={setVendorSource}
                  suggestions={suggestions}
                  placeholder={type === 'expense' ? 'e.g. Starbucks, Amazon...' : 'e.g. Salary, Freelance...'}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !amount || !category || !vendorSource}
                className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 ${
                  type === 'expense'
                    ? 'bg-red-500 hover:bg-red-400'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {saving ? 'Adding...' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
