import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({
    appTimezone: 'Asia/Kolkata',
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
    slaInitialContactMinutes: 15,
    maxFollowUpAttempts: 3,
    attendanceWarningThresholdPercent: 75,
    consecutiveAbsenceLimit: 3,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchApi('/api/settings'),
  });

  useEffect(() => {
    if (data?.settings) {
      setFormData(data.settings);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updated: any) =>
      fetchApi('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updated),
      }),
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['admissions-analytics'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Platform Business Rules & Timings</span>
          <Badge variant="info">Admin Configured</Badge>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure initial contact SLA, quiet hour windows, at-risk absence limits, and automated follow-up cadences
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>System configuration updated and logged to audit trail successfully.</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        {/* Section 1: Timings & SLA */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            1. Timings, Timezone & Quiet Hours
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Timezone</label>
              <input
                type="text"
                value={formData.appTimezone}
                onChange={(e) => setFormData({ ...formData, appTimezone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Quiet Hours Start</label>
              <input
                type="text"
                value={formData.quietHoursStart}
                onChange={(e) => setFormData({ ...formData, quietHoursStart: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Quiet Hours End</label>
              <input
                type="text"
                value={formData.quietHoursEnd}
                onChange={(e) => setFormData({ ...formData, quietHoursEnd: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Admissions Rules */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            2. Admissions SLA & Cadence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Initial Contact SLA (Minutes)
              </label>
              <input
                type="number"
                value={formData.slaInitialContactMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, slaInitialContactMinutes: parseInt(e.target.value, 10) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Max Follow-up Outreach Attempts
              </label>
              <input
                type="number"
                value={formData.maxFollowUpAttempts}
                onChange={(e) =>
                  setFormData({ ...formData, maxFollowUpAttempts: parseInt(e.target.value, 10) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Academic & At-Risk Thresholds */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            3. Academic & At-Risk Engagement Triggers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Attendance Warning Threshold (%)
              </label>
              <input
                type="number"
                value={formData.attendanceWarningThresholdPercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    attendanceWarningThresholdPercent: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Consecutive Unexcused Absence Trigger Limit
              </label>
              <input
                type="number"
                value={formData.consecutiveAbsenceLimit}
                onChange={(e) =>
                  setFormData({ ...formData, consecutiveAbsenceLimit: parseInt(e.target.value, 10) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/30 flex items-center space-x-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Configuration Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
