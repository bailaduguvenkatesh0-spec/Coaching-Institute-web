import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const ParentCommunications: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [editedDraft, setEditedDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['parent-messages'],
    queryFn: () => fetchApi('/api/messages'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved, editedContent }: { id: string; approved: boolean; editedContent?: string }) =>
      fetchApi(`/api/messages/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved, editedContent }),
      }),
    onSuccess: () => {
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['academic-analytics'] });
    },
  });

  const messages = data?.messages || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Parent Outreach Approval Queue</span>
            <Badge variant="simulated">SIMULATED DELIVERY</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict human-in-the-loop gating: verify records, check guardian consent & quiet hours before mock dispatch
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Gated by Academic Staff Approval</span>
        </div>
      </div>

      {/* Message Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading communication drafts...</div>
        ) : messages.length === 0 ? (
          <div className="glass-panel py-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-800">
            No pending parent communications in queue.
          </div>
        ) : (
          messages.map((msg: any) => (
            <div
              key={msg.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-white text-sm flex items-center space-x-2">
                    <span>Guardian: {msg.guardianName}</span>
                    <Badge variant={msg.status === 'APPROVED' ? 'success' : msg.status === 'REJECTED' ? 'danger' : 'warning'}>
                      {msg.status}
                    </Badge>
                    <Badge variant="simulated">SIMULATED MOCK</Badge>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-3">
                    <span>Recipient: {msg.guardianContact}</span>
                    <span>•</span>
                    <span>Channel: {msg.channel}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMessage(msg);
                      setEditedDraft(msg.draftContent);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview & Edit</span>
                  </button>

                  {msg.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => approveMutation.mutate({ id: msg.id, approved: true })}
                      disabled={approveMutation.isPending}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Authorize & Dispatch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Draft Content Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-sans text-xs text-slate-300 leading-relaxed">
                {msg.draftContent}
              </div>

              {msg.approverName && (
                <div className="text-[11px] text-emerald-400 font-mono flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorized by: {msg.approverName} ({new Date(msg.approvedAt).toLocaleString()})</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Preview / Edit Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-purple-400">OUTREACH PREVIEW (MOCK ADAPTER)</div>
                <h3 className="text-base font-bold text-white">Guardian Message Dispatch</h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
              <span>SIMULATED ADAPTER: In demo mode, approved messages are safely logged and mock dispatched without calling paid third-party SMS or WhatsApp gateways.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Message Content (Staff may review and edit text before authorization)
              </label>
              <textarea
                rows={5}
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              {selectedMessage.status === 'PENDING_APPROVAL' && (
                <button
                  onClick={() =>
                    approveMutation.mutate({
                      id: selectedMessage.id,
                      approved: true,
                      editedContent: editedDraft,
                    })
                  }
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                >
                  Confirm Authorization & Send (Simulated)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
