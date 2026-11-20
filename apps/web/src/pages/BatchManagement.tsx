import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import {
  Layers,
  Plus,
  Search,
  Users,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const BatchManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newBatch, setNewBatch] = useState({
    classCode: '',
    name: '',
    courseId: 'course-java-fs',
    schedule: 'Mon-Fri 09:00 - 12:30',
    maxCapacity: '40',
    status: 'ACTIVE',
  });

  const { data: batchesData, isLoading, refetch } = useQuery({
    queryKey: ['batches'],
    queryFn: () => fetchApi('/api/batches'),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchApi('/api/courses'),
  });

  const createBatchMutation = useMutation({
    mutationFn: (batchData: any) =>
      fetchApi('/api/batches', {
        method: 'POST',
        body: JSON.stringify(batchData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setIsAddOpen(false);
      setFormError(null);
      setNewBatch({
        classCode: '',
        name: '',
        courseId: coursesData?.courses?.[0]?.id || 'course-java-fs',
        schedule: 'Mon-Fri 09:00 - 12:30',
        maxCapacity: '40',
        status: 'ACTIVE',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create batch');
    },
  });

  const batches = (batchesData?.batches || []).filter((b: any) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.classCode.toLowerCase().includes(search.toLowerCase()) ||
    (b.courseName && b.courseName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Academic Batches & Timetable</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              {batchesData?.count || batches.length} Active Batches
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organize student cohorts, capacity limits, daily classroom timings, and faculty allocations
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batches by name, code, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Batches Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Batch Code & Name</th>
                <th className="py-3.5 px-4">Course Track</th>
                <th className="py-3.5 px-4">Daily Schedule</th>
                <th className="py-3.5 px-4">Capacity & Occupancy</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs">Loading academic batches...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="w-8 h-8 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-300">No batches found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch: any) => {
                  const capacity = batch.maxCapacity || 40;
                  const enrolled = batch.enrolledCount || 0;
                  const percent = Math.min(100, Math.round((enrolled / capacity) * 100));

                  return (
                    <tr key={batch.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{batch.name}</div>
                        <div className="text-[11px] font-mono text-cyan-400 mt-0.5">{batch.classCode}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{batch.courseName || 'General'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{batch.schedule || '09:00 - 12:30'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-white">{enrolled} / {capacity}</span>
                            <span className="text-slate-400">{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            batch.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {batch.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedBatch(batch)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                        >
                          View Roster
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Batch Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Create New Batch</span>
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBatchMutation.mutate(newBatch);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Batch Code *</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-JA-02"
                  required
                  value={newBatch.classCode}
                  onChange={(e) => setNewBatch({ ...newBatch, classCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Batch Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Java Full Stack Evening Cohort"
                  required
                  value={newBatch.name}
                  onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Associated Course Track *</label>
                <select
                  value={newBatch.courseId}
                  onChange={(e) => setNewBatch({ ...newBatch, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {(coursesData?.courses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.courseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Timing Schedule</label>
                  <input
                    type="text"
                    placeholder="Mon-Fri 09:00 - 12:30"
                    value={newBatch.schedule}
                    onChange={(e) => setNewBatch({ ...newBatch, schedule: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    placeholder="40"
                    value={newBatch.maxCapacity}
                    onChange={(e) => setNewBatch({ ...newBatch, maxCapacity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow"
                >
                  {createBatchMutation.isPending ? 'Saving...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Batch Roster Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">{selectedBatch.name}</h2>
                <p className="text-xs text-cyan-400 font-mono">{selectedBatch.classCode} • {selectedBatch.courseName}</p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-300">
                Enrolled Students ({selectedBatch.students?.length || selectedBatch.enrolledCount || 0}):
              </p>
              {(selectedBatch.students && selectedBatch.students.length > 0) ? (
                selectedBatch.students.map((st: any) => (
                  <div key={st.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{st.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{st.studentIdNumber || st.id}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {st.studentStatus || 'ACTIVE'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Students enrolled in this course track will automatically populate here.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagement;
