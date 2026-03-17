import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Income from './pages/Income.jsx'
import Import from './pages/Import.jsx'
import Settings from './pages/Settings.jsx'
import HouseholdSettings from './pages/HouseholdSettings.jsx'
import { getMe } from './api.js'
import QuickAddFAB from './components/QuickAddFAB.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'expenses', label: 'Expenses', icon: '💸' },
  { id: 'income', label: 'Income', icon: '💰' },
  { id: 'import', label: 'Import', icon: '📂' },
  { id: 'household', label: 'Household', icon: '🏠' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0()
  const [page, setPage] = useState('dashboard')
  const [dbUserName, setDbUserName] = useState(null)

  // Fetch real display name from backend after login
  useEffect(() => {
    if (!isAuthenticated) return
    getAccessTokenSilently()
      .then(token => getMe(token))
      .then(data => setDbUserName(data.user?.name || null))
      .catch(() => {})
  }, [isAuthenticated, getAccessTokenSilently])

  const displayName = dbUserName || user?.name || user?.email

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <div className="text-5xl mb-4">💼</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Finance Tracker</h1>
          <p className="text-gray-500 mb-8">Track your income and expenses in one place.</p>
          <button
            onClick={() => loginWithRedirect({ connection: 'google-oauth2' })}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-md mb-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            Continue with Google
          </button>
          <button
            onClick={() => loginWithRedirect()}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Sign in with Email
          </button>
        </div>
      </div>
    )
  }

  const PageComponent = { dashboard: Dashboard, expenses: Expenses, income: Income, import: Import, household: HouseholdSettings, settings: Settings }[page]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-green-600 text-lg">💼 Finance</span>
            <nav className="hidden sm:flex gap-1">
              {NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    page === n.id
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user?.picture && <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />}
            <span className="text-sm text-gray-600 hidden sm:inline">{displayName}</span>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex border-t border-gray-100 overflow-x-auto">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex-shrink-0 flex-1 min-w-12 py-2 text-xs font-medium transition-colors ${
                page === n.id ? 'text-green-600 bg-green-50' : 'text-gray-500'
              }`}
            >
              <div>{n.icon}</div>
              <div>{n.label}</div>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <PageComponent onNameUpdate={name => setDbUserName(name)} />
      </main>

      <QuickAddFAB />
    </div>
  )
}
