import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import {
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Award,
  IndianRupee,
  PhoneCall,
  Printer,
  ShieldCheck,
  MessageSquare,
  Clock,
  BookOpen,
} from 'lucide-react';

export const ParentPortal: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState('stu-stu001');

  const { data: studentsData } = useQuery({
    queryKey: ['students-parent-list'],
    queryFn: () => fetchApi('/api/students?limit=100'),
  });

  const students = studentsData?.students || [];
  const currentStudent = students.find((s: any) => s.id === selectedStudentId || s.studentIdNumber === selectedStudentId) || students[0] || {
    id: 'stu-stu001',
    studentIdNumber: 'STU001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+919800100001',
    courseName: 'Java Full Stack',
    feeStatus: 'PAID',
    studentStatus: 'ACTIVE',
  };

  const attendancePercent = 88.5;
  const isAttendanceAtRisk = attendancePercent < 75;

  return (
    <div className="space-y-6">
      {/* Header & Ward Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Parent Transparency & Engagement Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Parent & Guardian View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verified oversight of your child's attendance cadence, fee status, and exam assessments
          </p>
        </div>

        {/* Ward Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Child Ward:</span>
          <select
            value={currentStudent.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
          >
            {students.slice(0, 15).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.studentIdNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ward Profile Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{currentStudent.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Enrolled & Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Roll ID: <span className="font-mono text-cyan-400 font-semibold">{currentStudent.studentIdNumber || 'STU001'}</span> • Program: {currentStudent.courseName || 'Java Full Stack'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => alert(`Connecting you to Academic Coordinator for ${currentStudent.name}...`)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Contact Coordinator</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance Monitor */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Class Attendance</span>
            {isAttendanceAtRisk ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Attendance Alert (&lt;75%)</span>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Compliant (&gt;75%)</span>
              </span>
            )}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{attendancePercent}%</span>
            <span className="text-xs text-slate-500">Regularity rate</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isAttendanceAtRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">Mandatory criteria for exam qualification is 75%.</p>
        </div>

        {/* Fee Standing */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tuition Fee Account</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                currentStudent.feeStatus === 'PAID'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {currentStudent.feeStatus || 'PAID'}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              ₹{currentStudent.feeStatus === 'PAID' ? '45,000' : '20,000'}
            </span>
            <span className="text-xs text-slate-500">Paid in total</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: currentStudent.feeStatus === 'PAID' ? '100%' : '44%' }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{currentStudent.feeStatus === 'PAID' ? 'All dues cleared' : 'Balance: ₹25,000'}</span>
            <button
              onClick={() => window.print()}
              className="text-cyan-400 hover:underline flex items-center space-x-0.5"
            >
              <Printer className="w-3 h-3" />
              <span>Download Receipt</span>
            </button>
          </div>
        </div>

        {/* Faculty Remarks */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Faculty Evaluation</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold">Updated Weekly</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">Top 10%</span>
            <span className="text-xs text-slate-500">Class Rank</span>
          </div>
          <p className="text-xs text-slate-300 italic pt-1">
            "Demonstrates exceptional dedication in lab problem sets and active participation in class discussions."
          </p>
          <p className="text-[10px] text-slate-500">— Lead Faculty Member</p>
        </div>
      </div>

      {/* Official Weekly Reports & Communication Log */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Institute SMS & WhatsApp Notifications</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Verified Automated Gateway</span>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Weekly Performance Summary Dispatched</span>
                <span className="text-[10px] text-slate-500">Sunday 18:00</span>
              </div>
              <p className="text-slate-400 mt-0.5">
                Weekly academic briefing for {currentStudent.name}: 100% attendance recorded, scored 88/100 in weekly assessment.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Fee Installment Receipt Acknowledged</span>
                <span className="text-[10px] text-slate-500">12 Nov 2026</span>
              </div>
              <p className="text-slate-400 mt-0.5">
                Receipt generated for ₹25,000 against course registration. Official tax invoice available in your portal downloads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentPortal;
