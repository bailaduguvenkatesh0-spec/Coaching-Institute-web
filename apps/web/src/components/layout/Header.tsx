import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, UserCheck, LogOut, Sparkles, AlertCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, quickLoginAs } = useAuth();

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Brand & Demo Indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            TB
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
              <span>TEAM B AUTOMATION PLATFORM</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Admissions Intelligence & Academic Engagement</p>
          </div>
        </div>

        {/* REQUIRED VISIBLE DEMO MODE BADGE */}
        <div className="ml-4 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-sm animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>DEMO MODE ACTIVE</span>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Switcher for Evaluators */}
        <div className="hidden lg:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 font-medium">Switch Role:</span>
          <button
            onClick={() => quickLoginAs('ADMIN')}
            className={`px-2 py-1 rounded transition ${
              user?.role === 'ADMIN'
                ? 'bg-cyan-500 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickLoginAs('COUNSELLOR')}
            className={`px-2 py-1 rounded transition ${
              user?.role === 'ADMISSIONS_COUNSELLOR'
                ? 'bg-cyan-500 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Counsellor
          </button>
          <button
            onClick={() => quickLoginAs('COORDINATOR')}
            className={`px-2 py-1 rounded transition ${
              user?.role === 'ACADEMIC_COORDINATOR'
                ? 'bg-cyan-500 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Coordinator
          </button>
          <button
            onClick={() => quickLoginAs('TEACHER')}
            className={`px-2 py-1 rounded transition ${
              user?.role === 'TEACHER'
                ? 'bg-cyan-500 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* User Badge */}
        {user ? (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
            <div className="text-right">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-cyan-400 font-mono">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
};
