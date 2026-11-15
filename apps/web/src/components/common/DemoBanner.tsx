// ─────────────────────────────────────────────────────────────────────────────
// DemoBanner — shown at the top of the app when backend is unreachable
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { isBackendUnreachable } from '../../lib/api.js';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeMsg, setWakeMsg] = useState('');

  // Re-check every 5 s so the banner hides itself once backend recovers
  useEffect(() => {
    const check = () => setVisible(isBackendUnreachable());
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const wakeUpBackend = async () => {
    setWaking(true);
    setWakeMsg('Sending wake-up ping…');
    try {
      const apiBase = ((import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
      const url = apiBase ? `${apiBase}/api/health` : '/api/health';
      await fetch(url, { signal: AbortSignal.timeout(25000) });
      setWakeMsg('Backend is responding! Reloading…');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setWakeMsg('Still warming up — please wait ~30 s and try again.');
    } finally {
      setWaking(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex flex-col sm:flex-row items-center gap-2 text-xs text-amber-300 z-50">
      <div className="flex items-center gap-2 flex-1">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        <span>
          <strong>Demo Mode</strong> — Backend is temporarily offline (Render free tier sleeps after
          15 min of inactivity). Data shown is sample data.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {wakeMsg && <span className="text-amber-400 text-[11px]">{wakeMsg}</span>}
        <button
          onClick={wakeUpBackend}
          disabled={waking}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${waking ? 'animate-spin' : ''}`} />
          Wake Up Backend
        </button>
      </div>
    </div>
  );
};

