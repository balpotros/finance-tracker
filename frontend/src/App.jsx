import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from './api';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import BudgetTargets from './pages/BudgetTargets';
import HistoricalComparison from './pages/HistoricalComparison';
import Import from './pages/Import';
import HouseholdSetup from './pages/HouseholdSetup';

function LoginScreen() {
  const { loginWithRedirect } = useAuth0();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="card max-w-md w-full text-center space-y-6">
        <div className="text-5xl">💰</div>
        <h1 className="text-3xl font-bold text-gray-900">Finance Tracker</h1>
        <p className="text-gray-500">Track your household finances together.</p>
        <button className="btn-primary w-full justify-center text-base py-3" onClick={() => loginWithRedirect()}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(() =>
        getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        })
      );
      setReady(true);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="budget" element={<BudgetTargets />} />
          <Route path="history" element={<HistoricalComparison />} />
          <Route path="import" element={<Import />} />
          <Route path="setup" element={<HouseholdSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
