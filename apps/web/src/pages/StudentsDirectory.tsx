import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { GraduationCap, Search, Phone, Mail, AlertTriangle } from 'lucide-react';

export const StudentsDirectory: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return fetchApi(`/api/students?${params.toString()}`);
    },
  });

  const students = data?.students || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Student Academic Directory</span>
            <Badge variant="info">{students.length} Enrolled</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active batch rosters, calculated attendance percentage, guardian links, and at-risk monitoring
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Student & ID</th>
                <th className="py-3 px-4">Enrolled Class / Batch</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4">At-Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching students found.
                  </td>
                </tr>
              ) : (
                students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                        <span className="text-cyan-400">{s.studentIdNumber}</span>
                        <span>•</span>
                        <span>{s.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {s.class?.name || 'Unassigned Batch'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-bold text-sm ${
                            s.attendancePercentage < 75 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                        {s.attendancePercentage < 75 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-900/40">
                            Below 75%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {s.guardian ? (
                        <div>
                          <div className="font-medium text-slate-200">{s.guardian.name} ({s.guardian.relationship})</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.guardian.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No Guardian Profile</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.activeFlagsCount > 0 ? (
                        <Badge variant="danger">{s.activeFlagsCount} Active Alert(s)</Badge>
                      ) : (
                        <Badge variant="success">Good Standing</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
