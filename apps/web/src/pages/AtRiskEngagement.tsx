import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Filter,
  Search,
  ExternalLink,
} from 'lucide-react';

export const AtRiskEngagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [actionType, setActionType] = useState<'resolve' | 'dismiss' | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['engagement-flags', statusFilter],
    queryFn: () => fetchApi(`/api/engagement/flags?status=${statusFilter}`),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      fetchApi(`/api/engagement/flags/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes: notes }),
      }),
    onSuccess: () => {
      setSelectedFlag(null);
      setActionType(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['engagement-flags'] });
      queryClient.invalidateQueries({ queryKey: ['academic-analytics'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      fetchApi(`/api/engagement/flags/${id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ dismissalReason: reason }),
      }),
    onSuccess: () => {
      setSelectedFlag(null);
      setActionType(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['engagement-flags'] });
      queryClient.invalidateQueries({ queryKey: ['academic-analytics'] });
    },
  });

  const flags = data?.flags || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>At-Risk Student Engagement Engine</span>
            <Badge variant="danger">{flags.length} Flags</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rule-driven explainable flags with evidence trail, coordinator intervention gating, and resolution audit
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {['ACTIVE', 'RESOLVED', 'DISMISSED'].map((st) => (
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

      {/* Flags List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading engagement flags...</div>
        ) : flags.length === 0 ? (
          <div className="glass-panel py-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-800">
            No {statusFilter.toLowerCase()} flags found.
          </div>
        ) : (
          flags.map((flag: any) => (
            <div
              key={flag.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      flag.severity === 'HIGH' || flag.severity === 'CRITICAL'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center space-x-2">
                      <span>{flag.studentName}</span>
                      <span className="text-xs font-mono text-slate-400">({flag.studentIdNumber})</span>
                      <Badge variant={flag.severity === 'HIGH' ? 'danger' : 'warning'}>
                        {flag.severity}
                      </Badge>
                    </div>
                    <div className="text-xs text-cyan-400 font-mono mt-0.5">
                      RULE: {flag.rule.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {flag.status === 'ACTIVE' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedFlag(flag);
                        setActionType('resolve');
                        setNotes('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Resolve Flag</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFlag(flag);
                        setActionType('dismiss');
                        setNotes('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Evidence & Action Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Evidence:</span>{' '}
                  <span className="text-slate-200">{flag.evidence}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Recommended Staff Action:</span>{' '}
                  <span className="text-cyan-300 font-medium">{flag.suggestedAction}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-3 pt-1 border-t border-slate-800/50">
                  <span>Window: {flag.observationWindowStart?.slice(0, 10)} to {flag.observationWindowEnd?.slice(0, 10)}</span>
                  <span>•</span>
                  <span>Created: {new Date(flag.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {flag.resolutionNotes && (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300">
                  <span className="font-semibold">Resolution Notes:</span> {flag.resolutionNotes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Dialog Modal */}
      {selectedFlag && actionType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {actionType === 'resolve' ? 'Resolve At-Risk Engagement Flag' : 'Dismiss Flag with Reason'}
            </h3>
            <p className="text-xs text-slate-400">
              Student: <span className="font-semibold text-white">{selectedFlag.studentName}</span> ({selectedFlag.studentIdNumber})
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {actionType === 'resolve' ? 'Intervention / Resolution Notes (Required)' : 'Dismissal Rationale (Required)'}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === 'resolve' ? 'Document call outcome, parent meeting, or catch-up schedule...' : 'Provide valid educational or administrative justification for dismissal...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setSelectedFlag(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionType === 'resolve') {
                    resolveMutation.mutate({ id: selectedFlag.id, notes });
                  } else {
                    dismissMutation.mutate({ id: selectedFlag.id, reason: notes });
                  }
                }}
                disabled={notes.trim().length < 3 || resolveMutation.isPending || dismissMutation.isPending}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition ${
                  actionType === 'resolve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionType === 'resolve' ? 'Confirm Resolution' : 'Confirm Dismissal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
