import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import { Cpu, CheckCircle2, Play, AlertCircle, RefreshCw, Layers } from 'lucide-react';

const WORKFLOW_REGISTRY = [
  // Project 1: Admissions (1 - 9)
  { id: 'wf-01', name: '01 Lead Form Ingestion', project: 'Admissions', trigger: 'Webhook', status: 'READY', desc: 'Validates public form payloads, normalizes phone E.164 and email, attaches ingestion timestamps.' },
  { id: 'wf-02', name: '02 External Channel Simulation', project: 'Admissions', trigger: 'Simulated Inbound', status: 'READY', desc: 'Ingests simulated WhatsApp and phone enquiries into normalized admissions intake.' },
  { id: 'wf-03', name: '03 Validation & Deduplication', project: 'Admissions', trigger: 'Pipeline Hook', status: 'READY', desc: 'Checks duplicate phone or email, merges without losing source attribution, logs merge reviews.' },
  { id: 'wf-04', name: '04 Lead Scoring & Routing', project: 'Admissions', trigger: 'Event Trigger', status: 'READY', desc: 'Computes 0-100 deterministic score, routes to course-compatible counsellor with lowest workload.' },
  { id: 'wf-05', name: '05 Follow-up Scheduling', project: 'Admissions', trigger: 'Event Trigger', status: 'READY', desc: 'Schedules 15-minute SLA task, then +1, +3, +7 day cadences; respects quiet hours (21:00-08:00).' },
  { id: 'wf-06', name: '06 SLA Breach Alerts', project: 'Admissions', trigger: 'Cron Schedule (15m)', status: 'ACTIVE', desc: 'Detects overdue follow-up tasks for hot leads and alerts lead counsellors.' },
  { id: 'wf-07', name: '07 AI Draft Generation', project: 'Admissions', trigger: 'On-Demand Hook', status: 'READY', desc: 'Generates draft replies and lead notes labelled DRAFT requiring staff approval.' },
  { id: 'wf-08', name: '08 Approved Communication Dispatch', project: 'Admissions', trigger: 'Staff Approval', status: 'READY', desc: 'Dispatches counsellor outreach via mock channel (labelled SIMULATED); checks opt-out.' },
  { id: 'wf-09', name: '09 Daily Counsellor Task Digest', project: 'Admissions', trigger: 'Cron Schedule (08:30)', status: 'ACTIVE', desc: 'Compiles morning agenda of due follow-ups and uncontacted hot enquiries.' },

  // Project 2: Academic & Engagement (10 - 16)
  { id: 'wf-10', name: '10 Attendance CSV Import', project: 'Academic', trigger: 'CSV Upload Webhook', status: 'READY', desc: 'Validates row numbers, student IDs, rejects duplicates and unknown students atomically.' },
  { id: 'wf-11', name: '11 Assessment CSV Import', project: 'Academic', trigger: 'CSV Upload Webhook', status: 'READY', desc: 'Validates subject codes and percentage scores, computes class percentile benchmarks.' },
  { id: 'wf-12', name: '12 Attendance & Engagement Evaluation', project: 'Academic', trigger: 'Post-Import Hook', status: 'READY', desc: 'Evaluates 5 at-risk rules: 3 consecutive absences, <75% attendance, assessment decline.' },
  { id: 'wf-13', name: '13 Coordinator Task Creation', project: 'Academic', trigger: 'Flag Raised Hook', status: 'READY', desc: 'Creates intervention tasks for academic coordinators; prevents duplicate open tasks.' },
  { id: 'wf-14', name: '14 Weekly Summary Generation', project: 'Academic', trigger: 'Cron Schedule (Sun 18:00)', status: 'ACTIVE', desc: 'Generates weekly summaries from verified records only; unique on student + ISO week.' },
  { id: 'wf-15', name: '15 Parent Message Approval & Dispatch', project: 'Academic', trigger: 'Staff Approval', status: 'READY', desc: 'Validates guardian consent, displays draft preview, logs simulated delivery.' },
  { id: 'wf-16', name: '16 Import Error Reporting & Recovery', project: 'Academic', trigger: 'Error Branch', status: 'READY', desc: 'Captures rejected rows and provides actionable correction paths for re-import.' },
];

export const AutomationMonitoring: React.FC = () => {
  const [filterProject, setFilterProject] = useState('ALL');
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const filtered = filterProject === 'ALL'
    ? WORKFLOW_REGISTRY
    : WORKFLOW_REGISTRY.filter((w) => w.project.toLowerCase() === filterProject.toLowerCase());

  const runTestWebhook = async (wf: typeof WORKFLOW_REGISTRY[0]) => {
    setTriggerStatus(`Triggering test event for '${wf.name}'...`);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setTriggerStatus(`Event for '${wf.name}' successfully processed (SIMULATED / DEMO MODE). Execution logged.`);
      setTimeout(() => setTriggerStatus(null), 4000);
    } catch {
      setTriggerStatus('Failed to trigger workflow');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>n8n Automation Engine Control Center</span>
            <Badge variant="simulated">16 WORKFLOWS REGISTERED</Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            9 Admissions automation pipelines + 7 Academic engagement & parent outreach workflows
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {['ALL', 'Admissions', 'Academic'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProject(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterProject === p ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {triggerStatus && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center space-x-2 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>{triggerStatus}</span>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((wf) => (
          <div
            key={wf.id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{wf.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {wf.project} • {wf.trigger}
                    </div>
                  </div>
                </div>

                <Badge variant={wf.status === 'ACTIVE' ? 'success' : 'info'}>
                  {wf.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {wf.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono">Workflow ID: {wf.id}</span>
              <button
                onClick={() => runTestWebhook(wf)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition border border-slate-700"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Simulate Event</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
