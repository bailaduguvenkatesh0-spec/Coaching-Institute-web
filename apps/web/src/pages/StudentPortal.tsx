import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import {
  GraduationCap,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  Award,
  IndianRupee,
  FileText,
  User,
  Shield,
  Printer,
  Loader2,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState('stu-stu001');

  const { data: studentsData } = useQuery({
    queryKey: ['students-portal-list'],
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

  const { data: examsData } = useQuery({
    queryKey: ['exams-portal'],
    queryFn: () => fetchApi('/api/exams'),
  });

  return (
    <div className="space-y-6">
      {/* Header & Student Switcher for Demo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Student Self-Service Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              Student View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personal academic dashboard: view your enrolled batch, attendance track, fee balance, and exam grades
          </p>
        </div>

        {/* Demo Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Viewing Student:</span>
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

      {/* Profile Overview Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {currentStudent.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{currentStudent.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {currentStudent.studentStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Roll ID: <span className="font-mono text-cyan-400 font-semibold">{currentStudent.studentIdNumber || 'STU001'}</span> • {currentStudent.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 block">Enrolled Track</span>
              <span className="font-semibold text-slate-200">{currentStudent.courseName || 'Java Full Stack'}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 block">Current Batch</span>
              <span className="font-semibold text-cyan-400">Morning Alpha (09:00 - 12:30)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Class Attendance</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">Good Standing</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">88.5%</span>
            <span className="text-xs text-slate-500">of 45 sessions</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88.5%' }} />
          </div>
          <p className="text-[10px] text-slate-400">40 Present • 5 Excused Absences</p>
        </div>

        {/* Fee Status */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Fee Account</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                currentStudent.feeStatus === 'PAID'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : currentStudent.feeStatus === 'PARTIALLY_PAID'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {currentStudent.feeStatus || 'PAID'}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              ₹{currentStudent.feeStatus === 'PAID' ? '45,000' : currentStudent.feeStatus === 'PARTIALLY_PAID' ? '20,000' : '0'}
            </span>
            <span className="text-xs text-slate-500">Paid of ₹45,000</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: currentStudent.feeStatus === 'PAID' ? '100%' : currentStudent.feeStatus === 'PARTIALLY_PAID' ? '44%' : '0%' }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {currentStudent.feeStatus === 'PAID' ? 'No outstanding dues' : 'Remaining balance: ₹25,000'}
          </p>
        </div>

        {/* Academic GPA / Grade */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Academic Standing</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold">Grade A</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">82.0%</span>
            <span className="text-xs text-slate-500">Cumulative Score</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
          </div>
          <p className="text-[10px] text-slate-400">Top 15% of Batch</p>
        </div>
      </div>

      {/* Examination Performance Report Cards */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Official Examination Report Cards</h3>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Transcript</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Exam Assessment</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(examsData?.exams || []).map((exam: any, idx: number) => {
                const marks = 78 + (idx * 6);
                const pct = Math.min(100, marks);
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : 'C';

                return (
                  <tr key={exam.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      {exam.title}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(exam.examDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {marks} / {exam.totalMarks || 100}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                      {pct}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {grade}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>PASSED</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
