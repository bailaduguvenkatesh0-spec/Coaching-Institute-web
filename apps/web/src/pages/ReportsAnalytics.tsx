import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Target, Award, BookOpen, Clock } from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Consolidated Analytics & Institutional Reporting</span>
          <Badge variant="info">Verified Records Only</Badge>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audited conversion rates, source efficacy, SLA adherence, and batch-wise attendance distribution
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase">Conversion Efficiency</div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {admMetrics.conversionRate ?? 0}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Enrolled ({admMetrics.enrolled}) / Total Enquiries ({admMetrics.totalEnquiries}) * 100
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase">15-Minute SLA Adherence</div>
          <div className="text-2xl font-black text-cyan-400 mt-2">
            {admMetrics.slaCompliancePercent ?? 100}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Follow-ups completed on or before SLA deadline
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase">Institutional Attendance Rate</div>
          <div className="text-2xl font-black text-indigo-400 mt-2">
            {acadMetrics.overallAttendancePercent ?? 0}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Formula: (present + excused) / (held - excused) * 100
          </div>
        </div>
      </div>

      {/* Source-wise conversion analysis */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white">Lead Ingestion Channel Performance & Conversion Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Lead Source</th>
                <th className="py-2.5 px-3">Total Ingested (Denominator)</th>
                <th className="py-2.5 px-3">Enrolled (Numerator)</th>
                <th className="py-2.5 px-3">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admMetrics.sourceWise?.map((src: any) => (
                <tr key={src.source} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{src.source}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{src.total}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">{src.enrolled}</td>
                  <td className="py-2.5 px-3 font-bold font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        src.conversionRate > 0
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {src.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Drop-off */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Admissions Funnel Progression</h3>
          <p className="text-xs text-slate-400 mb-4">Volume distribution across pipeline milestones</p>
          <div className="h-64">
            {admMetrics.stageDistribution && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={admMetrics.stageDistribution}>
                  <XAxis dataKey="stage" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Batch Attendance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Batch Attendance Adherence</h3>
          <p className="text-xs text-slate-400 mb-4">Percentage vs. 75% institutional threshold</p>
          <div className="h-64">
            {acadMetrics.classWise && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acadMetrics.classWise}>
                  <XAxis dataKey="classCode" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="attendancePercentage" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
