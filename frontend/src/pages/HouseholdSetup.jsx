import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postHousehold } from '../api';

export default function HouseholdSetup() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await postHousehold({ action: 'create' });
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create household');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinId.trim()) return;
    setLoading(true);
    try {
      await postHousehold({ action: 'join', household_id: joinId.trim() });
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to join household');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="card max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Household</h1>
          <p className="text-gray-500 mt-2">You and your partner share one household. Create a new one or join an existing one.</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Create a new household</h2>
            <p className="text-sm text-gray-500">Start fresh. Share the household ID with your partner so they can join.</p>
            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              Create Household
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-4 text-sm text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <div className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Join an existing household</h2>
            <p className="text-sm text-gray-500">Enter the household ID your partner shared with you.</p>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Household ID (UUID)"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
              />
              <button className="btn-primary" type="submit" disabled={loading}>Join</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
