import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getMe, manageHousehold } from '../api.js'

// Household name stored in localStorage, keyed by household_id
function getLocalHouseholdName(householdId) {
  return localStorage.getItem(`hh_name_${householdId}`) || ''
}
function setLocalHouseholdName(householdId, name) {
  localStorage.setItem(`hh_name_${householdId}`, name)
}

export default function HouseholdSettings() {
  const { getAccessTokenSilently, user: auth0User } = useAuth0()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(null)

  // Household name
  const [hhName, setHhName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [idCopied, setIdCopied] = useState(false)

  // Household management
  const [hhAction, setHhAction] = useState('create')
  const [joinId, setJoinId] = useState('')
  const [hhSaving, setHhSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const me = await getMe(token)
      setProfile(me)
      if (me.user?.household_id) {
        const saved = getLocalHouseholdName(me.user.household_id)
        setHhName(saved || 'My Household')
        setNameInput(saved || 'My Household')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently])

  useEffect(() => { load() }, [load])

  const showFlash = (msg, ok = true) => {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleSaveName = () => {
    if (!nameInput.trim()) return
    setLocalHouseholdName(profile.user.household_id, nameInput.trim())
    setHhName(nameInput.trim())
    setEditingName(false)
    showFlash('Household name updated!')
  }

  const handleCopyId = () => {
    if (!profile?.user?.household_id) return
    navigator.clipboard.writeText(profile.user.household_id)
    setIdCopied(true)
    setTimeout(() => setIdCopied(false), 2000)
  }

  const handleCopyInvite = () => {
    const id = profile?.user?.household_id
    if (!id) return
    const inviteText = inviteEmail.trim()
      ? `Hey${inviteEmail ? ` ${inviteEmail.split('@')[0]}` : ''}! I'd like to add you to my household on Finance Tracker. Here's the Household ID to join:\n\n${id}\n\nGo to Settings → Household → Join Existing and enter this ID.`
      : `Join my household on Finance Tracker! Household ID:\n\n${id}\n\nGo to Settings → Household → Join Existing and enter this ID.`
    navigator.clipboard.writeText(inviteText)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 3000)
    showFlash('Invite message copied to clipboard!')
  }

  const handleHousehold = async (action, id = null) => {
    setHhSaving(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      if (action === 'leave') {
        await manageHousehold(token, { action: 'leave' })
        showFlash('Left household.')
      } else if (action === 'join') {
        if (!joinId.trim()) return
        await manageHousehold(token, { action: 'join', household_id: joinId.trim() })
        showFlash('Joined household!')
      } else {
        await manageHousehold(token, { action: 'create' })
        showFlash('Household created!')
      }
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setHhSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const hh = profile?.user
  const partner = profile?.partner
  const isInHousehold = !!hh?.household_id

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🏠</span>
        <h1 className="text-xl font-bold text-gray-800">Household Settings</h1>
      </div>

      {/* Flash / Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-2 text-red-400 hover:text-red-700">✕</button>
        </div>
      )}
      {flash && (
        <div className={`p-3 rounded-xl text-sm border ${flash.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {flash.msg}
        </div>
      )}

      {isInHousehold ? (
        <>
          {/* ── Household Name ── */}
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">1</span>
                Household Name
              </h2>
              {!editingName && (
                <button
                  onClick={() => { setEditingName(true); setNameInput(hhName) }}
                  className="text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. The Smith Family"
                />
                <button
                  onClick={handleSaveName}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-lg text-sm transition-colors border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">🏠</div>
                <div>
                  <p className="font-semibold text-gray-800">{hhName}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{hh.household_id.slice(0, 8)}…</p>
                </div>
              </div>
            )}

            {/* Household ID */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5">Household ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-600 flex-1 break-all">{hh.household_id}</code>
                <button
                  onClick={handleCopyId}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    idCopied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {idCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Members ── */}
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">2</span>
              Members
              <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {partner ? '2 / 2' : '1 / 2'}
              </span>
            </h2>

            <div className="space-y-3">
              {/* Current user */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                {hh.picture
                  ? <img src={hh.picture} alt="" className="w-10 h-10 rounded-full border-2 border-green-200 shrink-0" />
                  : (
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                      {(hh.name || hh.email || '?')[0].toUpperCase()}
                    </div>
                  )
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{hh.name || hh.email}</p>
                  <p className="text-xs text-gray-400 truncate">{hh.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">Admin</span>
                  <span className="text-xs text-gray-400">You</span>
                </div>
              </div>

              {/* Partner */}
              {partner ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                    {(partner.name || partner.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{partner.name || partner.email}</p>
                    <p className="text-xs text-gray-400 truncate">{partner.email}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">Member</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-xl shrink-0">+</div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Waiting for partner to join</p>
                    <p className="text-xs text-gray-300">Share your Household ID below</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Invite ── */}
          {!partner && (
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">3</span>
                Invite a Member
              </h2>
              <p className="text-xs text-gray-500">Enter your partner's email to personalize the invite message, then copy and send it to them.</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Partner's email <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="email"
                    placeholder="partner@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-xs text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {inviteEmail.trim()
                    ? `Hey ${inviteEmail.split('@')[0]}! I'd like to add you to my household on Finance Tracker. Here's the Household ID to join:\n\n${hh.household_id}\n\nGo to Settings → Household → Join Existing and enter this ID.`
                    : `Join my household on Finance Tracker! Household ID:\n\n${hh.household_id}\n\nGo to Settings → Household → Join Existing and enter this ID.`
                  }
                </div>

                <button
                  onClick={handleCopyInvite}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    inviteCopied
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {inviteCopied ? '✓ Copied to clipboard!' : '📋 Copy invite message'}
                </button>
              </div>
            </div>
          )}

          {/* Leave household */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-700 mb-3">Danger Zone</h2>
            <p className="text-xs text-gray-400 mb-3">Leaving will disconnect you from your household. Your partner and all shared data will remain.</p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to leave this household?')) handleHousehold('leave')
              }}
              disabled={hhSaving}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {hhSaving ? 'Leaving...' : 'Leave Household'}
            </button>
          </div>
        </>
      ) : (
        /* No household — create or join */
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-5 border border-gray-100">
          <div className="text-center py-4">
            <div className="text-5xl mb-3">🏠</div>
            <h2 className="font-semibold text-gray-800 mb-1">No household yet</h2>
            <p className="text-sm text-gray-500">Create a household or join your partner's to share your finances.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setHhAction('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                hhAction === 'create' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setHhAction('join')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                hhAction === 'join' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          )}

          <button
            onClick={() => handleHousehold(hhAction)}
            disabled={hhSaving || (hhAction === 'join' && !joinId.trim())}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {hhSaving ? 'Processing...' : hhAction === 'create' ? '✦ Create Household' : 'Join Household'}
          </button>
        </div>
      )}
    </div>
  )
}
