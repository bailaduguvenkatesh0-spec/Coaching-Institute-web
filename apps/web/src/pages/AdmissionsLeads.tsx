import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  Search,
  Filter,
  Kanban,
  Table as TableIcon,
  Sparkles,
  Phone,
  Mail,
  User,
  Calendar,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
} from 'lucide-react';

const STAGES = [
  'New',
  'Contacted',
  'Counselling Booked',
  'Attended',
  'Application Started',
  'Enrolled',
  'Lost',
  'Nurture',
];

export const AdmissionsLeads: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    studentName: '',
    email: '',
    phone: '',
    courseInterest: 'JEE Advanced FastTrack',
  });

  // Fetch Leads
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', search, stageFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (stageFilter) params.append('stage', stageFilter);
      if (categoryFilter) params.append('scoreCategory', categoryFilter);
      return fetchApi(`/api/leads?${params.toString()}`);
    },
    retry: 2,
  });

  // Add Lead Mutation
  const addLeadMutation = useMutation({
    mutationFn: (leadData: any) =>
      fetchApi('/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['admissions-analytics'] });
      setIsAddLeadOpen(false);
      setAddLeadError(null);
      setNewLead({
        studentName: '',
        email: '',
        phone: '',
        courseInterest: 'JEE Advanced FastTrack',
      });
    },
    onError: (err: any) => {
      setAddLeadError(err.message || 'Failed to submit new lead');
    },
  });

  // Fetch Selected Lead Detail
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => fetchApi(`/api/leads/${selectedLeadId}`),
    enabled: !!selectedLeadId,
  });

  // Stage Update Mutation
  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lossReason }: { id: string; stage: string; lossReason?: string }) =>
      fetchApi(`/api/leads/${id}/stage`, {
        method: 'POST',
        body: JSON.stringify({ stage, lossReason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['admissions-analytics'] });
    },
  });

  // AI Draft Mutation
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);
  const aiDraftMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/leads/${id}/ai-draft`, { method: 'POST' }),
    onSuccess: (data) => setAiDraftResult(data),
  });

  const leads = data?.leads || [];
  const selectedLead = detailData?.lead;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Admissions Leads Intelligence</span>
            <Badge variant="info">{leads.length} Leads</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic scoring, automated counsellor routing, SLA follow-ups & AI drafts
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition shadow-sm"
            title="Refresh Leads"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'table' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'kanban' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddLeadOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-rose-200">Unable to load leads from database</p>
              <p className="text-[11px] text-rose-300/80">{(error as any)?.message || 'Network or server error'}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, email, phone, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Scores</option>
          <option value="HOT">Hot Leads (&gt;=70)</option>
          <option value="WARM">Warm Leads (40-69)</option>
          <option value="COLD">Cold Leads (&lt;40)</option>
        </select>
      </div>

      {/* Main Views */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student & Contact</th>
                  <th className="py-3 px-4">Course Interest</th>
                  <th className="py-3 px-4">Score & Tier</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Assigned Counsellor</th>
                  <th className="py-3 px-4">Consent / Opt-Out</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-xs">Loading admissions leads intelligence...</span>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <div className="text-sm font-semibold text-rose-200">Failed to load leads</div>
                        <p className="text-xs text-slate-400 max-w-md">
                          {(error as any)?.message || 'Server connection or network error'}
                        </p>
                        <button
                          onClick={() => refetch()}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg flex items-center space-x-2 border border-slate-700 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Loading Leads</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <User className="w-8 h-8 text-slate-600" />
                        <div className="text-sm font-semibold text-slate-300">No leads found. Add your first lead.</div>
                        <p className="text-xs text-slate-500">Capture inquiries from the public portal or create an internal lead entry.</p>
                        <button
                          onClick={() => setIsAddLeadOpen(true)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition shadow"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Lead</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{lead.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                          <span>{lead.email}</span>
                          <span>•</span>
                          <span>{lead.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {lead.courseInterest}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white font-mono">{lead.score}</span>
                          <Badge
                            variant={
                              lead.scoreCategory === 'HOT'
                                ? 'hot'
                                : lead.scoreCategory === 'WARM'
                                ? 'warm'
                                : 'cold'
                            }
                          >
                            {lead.scoreCategory}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {lead.assignedCounsellorId ? (
                          <span className="text-cyan-400 font-medium">Assigned</span>
                        ) : (
                          <span className="text-amber-400 text-[11px]">Unassigned Queue</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {lead.optedOut ? (
                          <Badge variant="danger">OPTED OUT</Badge>
                        ) : lead.communicationConsent ? (
                          <Badge variant="success">CONSENTED</Badge>
                        ) : (
                          <Badge variant="neutral">NO CONSENT</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((st) => {
            const stageLeads = leads.filter((l: any) => l.stage === st);
            return (
              <div
                key={st}
                className="w-72 shrink-0 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col max-h-[70vh]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 px-1">
                  <span className="text-xs font-bold text-slate-200">{st}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1">
                  {stageLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-white text-xs truncate max-w-[150px]">
                          {lead.studentName}
                        </span>
                        <Badge
                          variant={
                            lead.scoreCategory === 'HOT'
                              ? 'hot'
                              : lead.scoreCategory === 'WARM'
                              ? 'warm'
                              : 'cold'
                          }
                        >
                          {lead.score}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{lead.courseInterest}</div>
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                        <span>{lead.source}</span>
                        {lead.optedOut && <span className="text-rose-400 font-bold">OPT-OUT</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Lead Detail Drawer / Modal */}
      {selectedLeadId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-cyan-400">LEAD INSPECTOR</div>
                <h3 className="text-lg font-bold text-white">
                  {detailLoading ? 'Loading...' : selectedLead?.studentName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedLeadId(null);
                  setAiDraftResult(null);
                }}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedLead && (
              <>
                {/* Score Breakdown Section */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Deterministic Score:</span>
                      <div className="text-2xl font-black text-white font-mono flex items-center space-x-2">
                        <span>{selectedLead.score} / 100</span>
                        <Badge
                          variant={
                            selectedLead.scoreCategory === 'HOT'
                              ? 'hot'
                              : selectedLead.scoreCategory === 'WARM'
                              ? 'warm'
                              : 'cold'
                          }
                        >
                          {selectedLead.scoreCategory}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => aiDraftMutation.mutate(selectedLead.id)}
                      disabled={aiDraftMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                      <span>{aiDraftMutation.isPending ? 'Generating...' : 'AI Draft Reply'}</span>
                    </button>
                  </div>

                  {/* Factor details */}
                  {selectedLead.scoreDetails?.factors && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                      {selectedLead.scoreDetails.factors.map((f: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-slate-300">
                          <span>{f.factor}</span>
                          <span className="font-mono text-cyan-400 font-semibold">
                            {f.score} / {f.maxScore} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Draft Drawer */}
                {aiDraftResult && (
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-200">
                          AI DRAFT ASSISTANT (DEMO FALLBACK)
                        </span>
                      </div>
                      <Badge variant="warning">REQUIRES STAFF APPROVAL</Badge>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-slate-300 mb-1">
                        Counsellor Outbound Draft:
                      </div>
                      <textarea
                        readOnly
                        rows={3}
                        value={aiDraftResult.replyDraft}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Pipeline Stage Transition */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300">Advance Pipeline Stage</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STAGES.map((st) => (
                      <button
                        key={st}
                        onClick={() => stageMutation.mutate({ id: selectedLead.id, stage: st })}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition ${
                          selectedLead.stage === st
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Counsellor & Routing Info */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Assigned Counsellor & Routing
                  </div>
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Assigned Staff:</span>
                    <span className="font-semibold text-cyan-400">
                      {selectedLead.assignedCounsellor?.name || 'Unassigned Queue'}
                    </span>
                  </div>
                  {selectedLead.assignments?.[0]?.reason && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Routing Match:</span>{' '}
                      {selectedLead.assignments[0].reason}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Add New Admissions Lead</h3>
                <p className="text-xs text-slate-400">Capture lead with deterministic scoring</p>
              </div>
              <button
                onClick={() => setIsAddLeadOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {addLeadError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{addLeadError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLead.studentName.trim() || !newLead.email.trim() || !newLead.phone.trim()) {
                  setAddLeadError('Please fill in student name, email, and phone number.');
                  return;
                }
                addLeadMutation.mutate(newLead);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newLead.studentName}
                  onChange={(e) => setNewLead({ ...newLead, studentName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Course Interest
                </label>
                <select
                  value={newLead.courseInterest}
                  onChange={(e) => setNewLead({ ...newLead, courseInterest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="JEE Advanced FastTrack">JEE Advanced FastTrack</option>
                  <option value="NEET Medical Excellence">NEET Medical Excellence</option>
                  <option value="Foundation Class 10th">Foundation Class 10th</option>
                  <option value="CUET Crash Course">CUET Crash Course</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLeadMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow"
                >
                  {addLeadMutation.isPending ? 'Submitting...' : 'Submit Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
