import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { PhoneCall, CheckCircle, Clock, AlertTriangle, Calendar, Send } from 'lucide-react';

export const FollowUpTasks: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['follow-ups', statusFilter],
    queryFn: () => fetchApi(`/api/follow-ups?status=${statusFilter}`),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      fetchApi(`/api/follow-ups/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    onSuccess: () => {
      setSelectedTask(null);
      setCompletionNotes('');
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['admissions-analytics'] });
    },
  });

  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Admissions Follow-up Task Queue</span>
            <Badge variant="info">{tasks.length} Tasks</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Initial contact 15-minute SLA • Follow-up cadence (+1, +3, +7 days) • Quiet hours (21:00-08:00) protection
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {['OPEN', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading follow-up tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="glass-panel py-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-800">
            No {statusFilter.toLowerCase()} follow-up tasks.
          </div>
        ) : (
          tasks.map((task: any) => (
            <div
              key={task.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Attempt #{task.attemptNumber}</span>
                  <Badge variant={task.status === 'COMPLETED' ? 'success' : task.isOverdue ? 'danger' : 'info'}>
                    {task.status === 'OPEN' && task.isOverdue ? 'OVERDUE' : task.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">Lead ID: {task.leadId.slice(0, 12)}</span>
                </div>

                <div className="text-xs text-slate-300 font-medium">{task.notes}</div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Due: {new Date(task.dueAt).toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span>Assigned: {task.counsellorId}</span>
                </div>
              </div>

              {task.status === 'OPEN' && (
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setCompletionNotes('');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Log Outreach</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Complete Task Dialog */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Log Follow-up Outreach Attempt</h3>
            <p className="text-xs text-slate-400">
              Record candidate interaction outcome. If attempt is below maximum (3), the engine will automatically schedule the next cadence delay (+1, +3, or +7 days).
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Outreach Notes / Candidate Response *
              </label>
              <textarea
                rows={3}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Candidate confirmed demo class booking for Saturday 11am; sent syllabus PDF on WhatsApp..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  completeMutation.mutate({
                    id: selectedTask.id,
                    notes: completionNotes,
                  })
                }
                disabled={completionNotes.trim().length < 3 || completeMutation.isPending}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
              >
                {completeMutation.isPending ? 'Logging...' : 'Confirm Outreach (Simulated)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
