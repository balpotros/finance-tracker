import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const navItems = [
  { to: '/',        label: 'Dashboard',   icon: '📊' },
  { to: '/expenses',label: 'Expenses',    icon: '💸' },
  { to: '/income',  label: 'Income',      icon: '💵' },
  { to: '/budget',  label: 'Budget',      icon: '🎯' },
  { to: '/history', label: 'History',     icon: '📈' },
  { to: '/import',  label: 'Import',      icon: '📂' },
];

export default function Navbar({ profile }) {
  const { logout, user } = useAuth0();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <span>💰</span>
            <span>Finance Tracker</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {user?.picture && (
                <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {profile?.user?.name || user?.name}
              </span>
              <span className="text-gray-400">▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {profile?.partner && (
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    Partner: {profile.partner.name}
                  </div>
                )}
                <button
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
              <span>{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
