import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  Users,
  Target,
  Clock,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const OverviewDashboard: React.FC = () => {
  const { data: admData, isLoading: admLoading } = useQuery({
    queryKey: ['admissions-analytics'],
    queryFn: () => fetchApi('/api/admissions/analytics'),
  });

  const { data: acadData, isLoading: acadLoading } = useQuery({
    queryKey: ['academic-analytics'],
    queryFn: () => fetchApi('/api/academic/analytics'),
  });

  const admMetrics = admData?.metrics || {};
  const acadMetrics = acadData?.metrics || {};
  const isLiveDb = admData?.storage?.mode === 'postgresql-prisma' || acadData?.storage?.mode === 'postgresql-prisma';

  const scoreColors: Record<string, string> = {
    hot: '#f43f5e',
    warm: '#f59e0b',
    cold: '#38bdf8',
  };

  const scorePieData = admMetrics.scoreDistribution
    ? [
        { name: 'Hot Leads (>=70)', value: admMetrics.scoreDistribution.hot, color: scoreColors.hot },
        { name: 'Warm Leads (40-69)', value: admMetrics.scoreDistribution.warm, color: scoreColors.warm },
        { name: 'Cold Leads (<40)', value: admMetrics.scoreDistribution.cold, color: scoreColors.cold },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                ENTERPRISE SYSTEM
              </span>
              <Badge variant={isLiveDb ? 'success' : 'simulated'}>
                {isLiveDb ? 'LIVE DATABASE CONNECTED' : 'OFFLINE DEMO MODE'}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">Executive AI Automation Command Center</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Live operational intelligence reconciling Project 1 (Admissions Lead Routing & Follow-ups) and Project 2 (Attendance Analytics, At-Risk Gating & Parent Dispatch).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/enquire"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition flex items-center space-x-2"
            >
              <span>Test Public Form</span>
              <span className="text-[10px] bg-cyan-800 px-1.5 py-0.5 rounded">Live</span>
            </Link>
            <Link
              to="/import-attendance"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              Upload Attendance CSV
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enquiries</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-3">
            {admLoading ? '...' : admMetrics.totalEnquiries ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <span className="text-emerald-400 font-medium">New uncontacted:</span>
            <span>{admMetrics.newUncontacted ?? 0}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-3">
            {admLoading ? '...' : `${admMetrics.conversionRate ?? 0}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            Formula: {admMetrics.conversionFormula || 'Enrolled / Total'}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-400 mt-3">
            {acadLoading ? '...' : `${acadMetrics.overallAttendancePercent ?? 0}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            (present+excused)/(held-excused)*100
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">At-Risk Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-3">
            {acadLoading ? '...' : acadMetrics.activeFlagsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <span className="text-amber-400 font-medium">Pending tasks:</span>
            <span>{acadMetrics.openTasksCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Admissions Pipeline Funnel */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Admissions Pipeline Stage Distribution</h3>
              <p className="text-xs text-slate-400">Real-time candidate stages across sales funnel</p>
            </div>
            <Badge variant="info">Pipeline</Badge>
          </div>

          <div className="h-64">
            {admMetrics.stageDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={admMetrics.stageDistribution}>
                  <XAxis dataKey="stage" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading chart...</div>
            )}
          </div>
        </div>

        {/* Chart 2: Academic Class Attendance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Class-wise Attendance Metrics</h3>
              <p className="text-xs text-slate-400">Excused absence adjusted rate per active batch</p>
            </div>
            <Badge variant="success">Academic</Badge>
          </div>

          <div className="h-64">
            {acadMetrics.classWise ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acadMetrics.classWise}>
                  <XAxis dataKey="classCode" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="attendancePercentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading chart...</div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Highlights & Counsellor Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Counsellor Capacity */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">Admissions Counsellor Active Capacity</h3>
          <div className="space-y-3">
            {admMetrics.counsellorWorkloads?.map((c: any) => (
              <div key={c.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="font-semibold text-slate-200 flex items-center space-x-2">
                    <span>{c.name}</span>
                    {!c.isAvailable && <span className="text-[10px] text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded">Unavailable</span>}
                  </div>
                  <div className="text-slate-400 font-mono">
                    {c.currentWorkload} / {c.maxWorkload} leads ({c.capacityUtilizedPercent}%)
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.capacityUtilizedPercent >= 100
                        ? 'bg-rose-500'
                        : c.capacityUtilizedPercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, c.capacityUtilizedPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Quality Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Lead Quality Score Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Deterministic 0-100 scoring tier</p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="font-semibold text-rose-300">Hot Leads (&gt;= 70)</span>
              </div>
              <span className="font-bold text-white">{admMetrics.scoreDistribution?.hot ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/40">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-amber-300">Warm Leads (40-69)</span>
              </div>
              <span className="font-bold text-white">{admMetrics.scoreDistribution?.warm ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-900/40">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="font-semibold text-cyan-300">Cold Leads (&lt; 40)</span>
              </div>
              <span className="font-bold text-white">{admMetrics.scoreDistribution?.cold ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
