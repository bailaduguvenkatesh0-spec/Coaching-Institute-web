import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/common/Badge.js';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@teamb.edu');
  const [password, setPassword] = useState('AdminPass123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('fetch') || err.message?.includes('Failed') || !err?.status) {
        setError('Backend API is currently offline. Click any of the Instant Evaluator buttons below to access the demo dashboard.');
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'COUNSELLOR' | 'COORDINATOR' | 'TEACHER') => {
    setLoading(true);
    try {
      await quickLoginAs(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 mx-auto">
            TB
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">TEAM B AUTOMATION</h1>
          <p className="text-xs text-slate-400">Institutional Admissions & Academic Engagement Platform</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Sign In to Dashboard</h2>
            <Badge variant="simulated">DEMO MODE</Badge>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Evaluator */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 text-center font-mono uppercase">
              Instant Evaluator 1-Click Access
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-400 font-semibold transition"
              >
                Admin (Full Access)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('COUNSELLOR')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-indigo-400 font-semibold transition"
              >
                Counsellor (Admissions)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('COORDINATOR')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-amber-400 font-semibold transition"
              >
                Coordinator (Academic)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('TEACHER')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-400 font-semibold transition"
              >
                Teacher (Roster)
              </button>
            </div>
          </div>
          {/* Public Portal Link */}
          <div className="pt-2 text-center text-xs">
            <Link
              to="/enquire"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              Looking for student admissions? Open Public Enquiry Form &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
