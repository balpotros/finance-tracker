import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function TransactionModal({ open, onClose, onSave, initial, type, currentUserId }) {
  const isExpense = type === 'expense';
  const EXPENSE_CATS = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift'];
  const INCOME_CATS  = ['Job','Tax Refund','Investments','Gift','Other','Bonus'];
  const cats = isExpense ? EXPENSE_CATS : INCOME_CATS;

  const empty = {
    date: new Date().toISOString().slice(0,10),
    [isExpense ? 'vendor' : 'source']: '',
    amount: '',
    category: cats[0],
    notes: '',
    hidden: false,
  };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial, amount: initial.amount } : empty);
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const nameField = isExpense ? 'vendor' : 'source';

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form[nameField] || !form.amount || !form.category) {
      setError('Please fill all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Edit' : 'New'} {isExpense ? 'Expense' : 'Income'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => set('date', e.target.value)} required />
            </div>
            <div>
              <label className="label">Amount ($) *</label>
              <input type="number" step="0.01" min="0" className="input" value={form.amount}
                onChange={e => set('amount', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">{isExpense ? 'Vendor' : 'Source'} *</label>
            <input type="text" className="input" value={form[nameField]}
              onChange={e => set(nameField, e.target.value)} required />
          </div>

          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" value={form.notes || ''}
              onChange={e => set('notes', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.hidden || false}
              onChange={e => set('hidden', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-600">Hidden (exclude from calculations)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
