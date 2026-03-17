import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import {
  LayoutDashboard, CreditCard, TrendingUp, Upload,
  Settings as SettingsIcon, LogOut, Wallet, Menu, X,
} from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Income from './pages/Income.jsx'
import Import from './pages/Import.jsx'
import Settings from './pages/Settings.jsx'
import { getMe } from './api.js'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses',  label: 'Expenses',  icon: CreditCard },
  { id: 'income',    label: 'Income',    icon: TrendingUp },
  { id: 'import',    label: 'Import',    icon: Upload },
  { id: 'settings',  label: 'Settings',  icon: SettingsIcon },
]

const PAGES = { dashboard: Dashboard, expenses: Expenses, income: Income, import: Import, settings: Settings }

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0()
  const [page, setPage] = useState('dashboard')
  const [dbUserName, setDbUserName] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Finance Tracker</h1>
          <p className="text-gray-500 mb-8">Track your income and expenses in one place.</p>
          <button
            onClick={() => loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-md mb-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            Continue with Google
          </button>
          <button
            onClick={() => loginWithRedirect()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Sign in with Email
          </button>
        </div>
      </div>
    )
  }

  const PageComponent = PAGES[page]

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base">Finance Tracker</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setPage(id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                page === id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* User profile */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-2 px-2">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-600">
                  {(displayName || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 h-16 flex items-center gap-4 sticky top-0 z-20 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900">Finance Tracker</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageComponent onNameUpdate={name => setDbUserName(name)} onNavigate={setPage} />
        </main>
      </div>
    </div>
  )
}
