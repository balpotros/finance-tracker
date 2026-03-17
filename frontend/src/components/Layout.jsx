import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { getMe } from '../api';

export const UserContext = React.createContext(null);

export default function Layout() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((data) => {
        setProfile(data);
        if (!data.user.household_id) navigate('/setup', { replace: true });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={profile}>
      <div className="min-h-screen bg-[#F1F5F9] flex">
        {/* Sidebar */}
        <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
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
            <Outlet context={profile} />
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
