import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { UserCheck, Clock, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';

export const Counsellors: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['counsellors'],
    queryFn: () => fetchApi('/api/counsellors'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      fetchApi(`/api/counsellors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counsellors'] });
      queryClient.invalidateQueries({ queryKey: ['admissions-analytics'] });
    },
  });

  const counsellors = data?.counsellors || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Admissions Counsellors & Workload Routing</span>
          <Badge variant="info">{counsellors.length} Staff</Badge>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Autonomous routing criteria: course compatibility, shift schedule, max capacity limit, tie-break
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400 text-xs">Loading counsellors...</div>
        ) : (
          counsellors.map((c: any) => {
            const capacityPercent = Math.round((c.currentWorkload / c.maxWorkload) * 100);
            return (
              <div
                key={c.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{c.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMutation.mutate({ id: c.id, isAvailable: !c.isAvailable })}
                      className="p-1 text-slate-400 hover:text-white transition"
                      title={c.isAvailable ? 'Set Unavailable' : 'Set Available'}
                    >
                      {c.isAvailable ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/40">
                          On Leave
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Workload Progress */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Current Workload:</span>
                      <span className="font-mono font-bold text-white">
                        {c.currentWorkload} / {c.maxWorkload} leads ({capacityPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          capacityPercent >= 100
                            ? 'bg-rose-500'
                            : capacityPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, capacityPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Schedule & Courses */}
                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Shift: {c.workingHoursStart} - {c.workingHoursEnd}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                        <BookOpen className="w-3 h-3" />
                        <span>Supported Courses:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.supportedCourses?.map((crs: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700"
                          >
                            {crs}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono pt-3 border-t border-slate-800/60">
                  Counsellor ID: {c.id}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
