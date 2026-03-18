import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  LayoutDashboard, CreditCard, TrendingUp, Target,
  BarChart2, Upload, LogOut, X,
} from 'lucide-react';

const navItems = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses',  icon: CreditCard },
  { to: '/income',   label: 'Income',    icon: TrendingUp },
  { to: '/budget',   label: 'Budget',    icon: Target },
  { to: '/history',  label: 'History',   icon: BarChart2 },
  { to: '/import',   label: 'Import',    icon: Upload },
];

export default function Sidebar({ profile, open, onClose }) {
  const { logout, user } = useAuth0();

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-gray-900 text-base">Kashboard</span>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-100 p-4 shrink-0">
        {profile?.partner && (
          <p className="text-xs text-gray-400 mb-3 px-2 truncate">
            Partner: {profile.partner.name}
          </p>
        )}
        <div className="flex items-center gap-3 mb-2 px-2">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-600">
                {(profile?.user?.name || user?.name || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile?.user?.name || user?.name}
          </p>
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
  );
}
