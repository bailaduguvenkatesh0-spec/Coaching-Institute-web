import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  RotateCcw,
  History,
} from 'lucide-react';

const SAMPLE_CSV = `studentIdNumber,classCode,date,status,remarks
TB-2026-001,BATCH-JEE-A,2026-10-25,PRESENT,On time
TB-2026-002,BATCH-NEET-B,2026-10-25,PRESENT,Class test attendee
TB-2026-003,BATCH-JEE-A,2026-10-25,ABSENT,Consecutive unexcused
TB-UNKNOWN-99,BATCH-JEE-A,2026-10-25,PRESENT,Testing validation
TB-2026-001,BATCH-JEE-A,2026-10-25,PRESENT,Duplicate row in batch`;

export const AttendanceImport: React.FC = () => {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [fileName, setFileName] = useState('attendance_sample.csv');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Fetch Import Batches History
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['import-batches'],
    queryFn: () => fetchApi('/api/imports'),
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: ({ commit }: { commit: boolean }) => {
      // Parse CSV Text to row objects
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain a header and at least one data row');

      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = parts[i] || '';
        });
        return rowObj;
      });

      return fetchApi('/api/imports/attendance', {
        method: 'POST',
        body: JSON.stringify({ rows, fileName, commit }),
      });
    },
    onSuccess: (data) => {
      setValidationResult(data.result);
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      queryClient.invalidateQueries({ queryKey: ['academic-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['engagement-flags'] });
    },
  });

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_attendance_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const batches = batchesData?.batches || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Attendance CSV Import & Reconciler</span>
            <Badge variant="info">Staging Engine</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-import validation, duplicate detection, row-numbered error reporting, and automatic at-risk recalculation
          </p>
        </div>

        <button
          onClick={downloadSampleCsv}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Main Upload / Paste Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Box */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                CSV Payload Editor (Direct Input or File Paste)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="filename.csv"
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 font-mono"
              />
            </div>
            <textarea
              rows={12}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <button
              onClick={() => setCsvText(SAMPLE_CSV)}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Data</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => importMutation.mutate({ commit: false })}
                disabled={importMutation.isPending}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                {importMutation.isPending ? 'Verifying...' : 'Validate (Dry Run)'}
              </button>
              <button
                onClick={() => importMutation.mutate({ commit: true })}
                disabled={importMutation.isPending}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition flex items-center space-x-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{importMutation.isPending ? 'Processing...' : 'Commit Import'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Validation & Staging Preview Box */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Validation Outcome & Diagnostics</h3>
            {validationResult ? (
              <div className="space-y-4">
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">TOTAL</div>
                    <div className="font-bold text-white mt-1">{validationResult.totalRows}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
                    <div className="text-emerald-400 text-[10px]">VALID</div>
                    <div className="font-bold text-emerald-300 mt-1">{validationResult.validRows}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50">
                    <div className="text-rose-400 text-[10px]">REJECTED</div>
                    <div className="font-bold text-rose-300 mt-1">{validationResult.rejectedRows}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/50">
                    <div className="text-amber-400 text-[10px]">DUPLICATES</div>
                    <div className="font-bold text-amber-300 mt-1">{validationResult.duplicateRows}</div>
                  </div>
                </div>

                {/* Staging Status */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Batch Status:</span>
                  <Badge
                    variant={
                      validationResult.status === 'COMPLETED'
                        ? 'success'
                        : validationResult.status === 'PARTIAL'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {validationResult.status}
                  </Badge>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({validationResult.importedRecordsCount} records committed)
                  </span>
                </div>

                {/* Row-Numbered Error Log */}
                {validationResult.errors?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-400 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Row-Numbered Rejections:</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {validationResult.errors.map((err: any, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs text-rose-200"
                        >
                          <span className="font-mono font-bold text-rose-400">Row {err.row}:</span>{' '}
                          {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-600" />
                <p>Run validation to inspect rows before committing records to database.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import History Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Import Batch Audit History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Batch ID</th>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Rows (Valid / Total)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Uploaded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batchesLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    Loading history...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    No import batches yet.
                  </td>
                </tr>
              ) : (
                batches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{b.id.slice(0, 16)}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{b.fileName}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {b.validRows} / {b.totalRows} ({b.rejectedRows} errors)
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={b.status === 'COMPLETED' ? 'success' : 'warning'}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(b.createdAt).toLocaleString()}
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
