import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { History, Shield, Filter, Search } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityFilter) params.append('entityType', entityFilter);
      return fetchApi(`/api/audit-logs?${params.toString()}`);
    },
  });

  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>System Audit & Compliance Trail</span>
            <Badge variant="info">{logs.length} Logged Events</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of security authentication, lead transitions, coordinator actions & message approvals
          </p>
        </div>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Entity Types</option>
          <option value="User">User / Security</option>
          <option value="Lead">Lead Lifecycle</option>
          <option value="EngagementFlag">Engagement Flag</option>
          <option value="MessageApproval">Message Approval</option>
          <option value="ImportBatch">CSV Import Batch</option>
          <option value="SystemSetting">System Settings</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Action & Entity</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono text-xs">{log.action}</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        {log.entityType} {log.entityId ? `[${log.entityId.slice(0, 10)}]` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {log.userEmail || 'System Process'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
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
