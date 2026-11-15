import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, User } from 'lucide-react';

export const CoordinatorTasks: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-tasks', statusFilter],
    queryFn: () => fetchApi(`/api/intervention-tasks?status=${statusFilter}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      fetchApi(`/api/intervention-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes, resolutionReason: notes }),
      }),
    onSuccess: () => {
      setSelectedTask(null);
      setResolutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['coordinator-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['academic-analytics'] });
    },
  });

  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Academic Coordinator Intervention Tasks</span>
            <Badge variant="info">{tasks.length} Tasks</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured workflow tasks linked to at-risk student engagement flags with 48h resolution SLA
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'].map((st) => (
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

      {/* Task Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading intervention tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="glass-panel py-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-800">
            No {statusFilter.toLowerCase()} tasks found.
          </div>
        ) : (
          tasks.map((task: any) => (
            <div
              key={task.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      task.severity === 'HIGH' || task.severity === 'CRITICAL'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center space-x-2">
                      <span>{task.studentName}</span>
                      <Badge variant={task.severity === 'HIGH' ? 'danger' : 'warning'}>
                        {task.severity} SEVERITY
                      </Badge>
                      <Badge variant={task.status === 'RESOLVED' ? 'success' : task.isOverdue ? 'danger' : 'info'}>
                        {task.status === 'OPEN' && task.isOverdue ? 'OVERDUE' : task.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Coordinator: {task.coordinatorName || 'Rahul Nair'}
                    </div>
                  </div>
                </div>

                {task.status === 'OPEN' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateMutation.mutate({ id: task.id, status: 'IN_PROGRESS' })
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      Start Work
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setResolutionNotes('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve Task</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Recommended Action:</span>{' '}
                  <span className="text-cyan-300 font-medium">{task.recommendedAction}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Trigger Evidence:</span>{' '}
                  <span className="text-slate-300">{task.evidence}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-3 pt-1 border-t border-slate-800/50">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Due Date: {new Date(task.dueDate).toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {task.resolutionReason && (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300">
                  <span className="font-semibold">Resolution Notes:</span> {task.resolutionReason}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Resolve Coordinator Intervention Task</h3>
            <p className="text-xs text-slate-400">
              Student: <span className="font-semibold text-white">{selectedTask.studentName}</span>
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Document Intervention Actions Taken *
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Called parent Suresh Verma; agreed on catch-up tutorial batch on Saturday..."
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
                  updateMutation.mutate({
                    id: selectedTask.id,
                    status: 'RESOLVED',
                    notes: resolutionNotes,
                  })
                }
                disabled={resolutionNotes.trim().length < 3 || updateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
