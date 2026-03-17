import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getMe, updateMe, manageHousehold, getCategories, addCategory, deleteCategory } from '../api.js'

export default function Settings({ onNameUpdate }) {
  const { getAccessTokenSilently } = useAuth0()
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState({ expense: [], income: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Profile edit
  const [editName, setEditName] = useState('')

  // Household
  const [hhAction, setHhAction] = useState('create')
  const [joinId, setJoinId] = useState('')
  const [hhSaving, setHhSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  // Categories
  const [newCatType, setNewCatType] = useState('expense')
  const [newCatName, setNewCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  const DEFAULT_EXPENSE = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift']
  const DEFAULT_INCOME  = ['Job','Tax Refund','Investments','Gift','Other','Bonus']

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const [me, cats] = await Promise.all([getMe(token), getCategories(token)])
      setProfile(me)
      setEditName(me.user.name || '')
      setCategories(cats)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently])

  useEffect(() => { load() }, [load])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  const handleSaveName = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const token = await getAccessTokenSilently()
      const res = await updateMe(token, { name: editName.trim() })
      setProfile(p => ({ ...p, user: res.user }))
      if (onNameUpdate) onNameUpdate(res.user.name)
      flash('Name updated!')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleHousehold = async () => {
    setHhSaving(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      if (hhAction === 'leave') {
        await manageHousehold(token, { action: 'leave' })
        flash('Left household.')
      } else if (hhAction === 'join') {
        if (!joinId.trim()) return
        await manageHousehold(token, { action: 'join', household_id: joinId.trim() })
        flash('Joined household!')
      } else {
        await manageHousehold(token, { action: 'create' })
        flash('Household created!')
      }
      load()
    } catch (e) { setError(e.message) }
    finally { setHhSaving(false) }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setCatSaving(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      await addCategory(token, { type: newCatType, name: newCatName.trim() })
      setNewCatName('')
      load()
      flash(`Category "${newCatName.trim()}" added!`)
    } catch (e) { setError(e.message) }
    finally { setCatSaving(false) }
  }

  const handleDeleteCategory = async (type, name) => {
    if (!confirm(`Delete category "${name}"?`)) return
    try {
      const token = await getAccessTokenSilently()
      await deleteCategory(token, { type, name })
      load()
    } catch (e) { setError(e.message) }
  }

  const copyHhId = () => {
    if (!profile?.user?.household_id) return
    navigator.clipboard.writeText(profile.user.household_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const isDefaultExpense = (name) => DEFAULT_EXPENSE.includes(name)
  const isDefaultIncome  = (name) => DEFAULT_INCOME.includes(name)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{success}</div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Profile</h2>
        {profile?.user?.picture && (
          <img src={profile.user.picture} alt="" className="w-14 h-14 rounded-full border" />
        )}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Email</label>
          <p className="text-sm text-gray-700">{profile?.user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Your name"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Household */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Household</h2>
        <p className="text-xs text-gray-500">Link your account with a partner to share income & expense tracking.</p>

        {profile?.user?.household_id ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Your Household ID (share this with your partner)</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-green-700 flex-1 break-all">{profile.user.household_id}</code>
                <button
                  onClick={copyHhId}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                >
                  {copiedId ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {profile?.partner && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                  {profile.partner.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{profile.partner.name}</p>
                  <p className="text-xs text-gray-400">{profile.partner.email}</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Partner</span>
              </div>
            )}
            {!profile?.partner && (
              <p className="text-sm text-gray-400 italic">No partner linked yet. Share your Household ID above.</p>
            )}

            <button
              onClick={() => { setHhAction('leave'); handleHousehold() }}
              disabled={hhSaving}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Leave household
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setHhAction('create')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${hhAction === 'create' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Create New
              </button>
              <button
                onClick={() => setHhAction('join')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${hhAction === 'join' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Join Existing
              </button>
            </div>

            {hhAction === 'join' && (
              <input
                type="text"
                placeholder="Paste your partner's Household ID"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            )}

            <button
              onClick={handleHousehold}
              disabled={hhSaving || (hhAction === 'join' && !joinId.trim())}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {hhSaving ? 'Processing...' : hhAction === 'create' ? 'Create Household' : 'Join Household'}
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Categories</h2>
        {!profile?.user?.household_id && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm">
            Create or join a household to manage custom categories.
          </div>
        )}

        {/* Add new */}
        {profile?.user?.household_id && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={newCatType}
              onChange={e => setNewCatType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              type="text"
              placeholder="New category name"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 min-w-32 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddCategory}
              disabled={catSaving || !newCatName.trim()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        )}

        {/* Expense categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Expense Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.expense?.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full"
              >
                {cat}
                {profile?.user?.household_id && !isDefaultExpense(cat) && (
                  <button
                    onClick={() => handleDeleteCategory('expense', cat)}
                    className="text-red-400 hover:text-red-700 leading-none ml-0.5"
                  >✕</button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Income categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Income Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.income?.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full"
              >
                {cat}
                {profile?.user?.household_id && !isDefaultIncome(cat) && (
                  <button
                    onClick={() => handleDeleteCategory('income', cat)}
                    className="text-green-500 hover:text-green-800 leading-none ml-0.5"
                  >✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
