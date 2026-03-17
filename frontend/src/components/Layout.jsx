import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { getMe } from '../api';

export const UserContext = React.createContext(null);

export default function Layout() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={profile}>
      <div className="min-h-screen flex flex-col">
        <Navbar profile={profile} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet context={profile} />
        </main>
      </div>
    </UserContext.Provider>
  );
}
