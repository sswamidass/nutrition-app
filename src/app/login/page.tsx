'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: 'Login failed' }));
      setError(data.error || 'Login failed');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mfp-gray px-4">
      <div className="mfp-card w-full max-w-sm overflow-hidden">
        <div className="mfp-section-header justify-center">
          <span>NutriTrack</span>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <label className="block text-sm font-semibold text-mfp-text">
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="mt-1 w-full border border-mfp-border rounded px-3 py-2 text-sm font-normal focus:outline-none focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue"
            />
          </label>
          {error && <p className="text-sm text-mfp-red">{error}</p>}
          <button type="submit" disabled={busy} className="mfp-btn-primary w-full disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
