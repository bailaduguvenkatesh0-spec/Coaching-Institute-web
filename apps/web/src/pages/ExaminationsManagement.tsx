import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import {
  Award,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  BookOpen,
  Users,
  Edit3,
  BarChart2,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const ExaminationsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isEnteringMarks, setIsEnteringMarks] = useState(false);
  const [studentMarks, setStudentMarks] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [newExam, setNewExam] = useState({
    title: '',
    courseId: 'course-java-fs',
    examDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    totalMarks: '100',
    passingMarks: '40',
  });

  const { data: examsData, isLoading, refetch } = useQuery({
    queryKey: ['exams'],
    queryFn: () => fetchApi('/api/exams'),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchApi('/api/courses'),
  });

  const { data: examDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['exam', selectedExamId],
    queryFn: () => fetchApi(`/api/exams/${selectedExamId}`),
    enabled: !!selectedExamId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => fetchApi('/api/students?limit=100'),
    enabled: isEnteringMarks,
  });

  const createExamMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/api/exams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setIsScheduleOpen(false);
      setFormError(null);
      setNewExam({
        title: '',
        courseId: 'course-java-fs',
        examDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        totalMarks: '100',
        passingMarks: '40',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to schedule exam');
    },
  });

  const submitMarksMutation = useMutation({
    mutationFn: ({ examId, marks }: { examId: string; marks: any[] }) =>
      fetchApi(`/api/exams/${examId}/marks`, {
        method: 'POST',
        body: JSON.stringify({ marks }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam', selectedExamId] });
      setIsEnteringMarks(false);
      setStudentMarks({});
    },
  });

  const publishExamMutation = useMutation({
    mutationFn: (examId: string) =>
      fetchApi(`/api/exams/${examId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam', selectedExamId] });
    },
  });

  const exams = (examsData?.exams || []).filter((e: any) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.courseTitle && e.courseTitle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Examinations & Performance Assessment</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              {exams.length} Evaluations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conduct formal assessments, record marks with automated grade assignments, and publish student report cards
          </p>
        </div>

        <button
          onClick={() => setIsScheduleOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Examination</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Scheduled Exams</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {exams.filter((e: any) => e.status === 'SCHEDULED').length} Upcoming
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Published Results</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {exams.filter((e: any) => e.status === 'PUBLISHED').length} Published
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Average Institute Pass Rate</p>
            <p className="text-xl font-bold text-white mt-0.5">92.4%</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search examinations by title or course..."
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

      {/* Exams Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Exam Title</th>
                <th className="py-3.5 px-4">Course Track</th>
                <th className="py-3.5 px-4">Exam Date</th>
                <th className="py-3.5 px-4">Max Marks / Pass</th>
                <th className="py-3.5 px-4">Results</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs">Loading examinations...</span>
                    </div>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Award className="w-8 h-8 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-300">No examinations found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                exams.map((exam: any) => (
                  <tr key={exam.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{exam.title}</div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">{exam.className || 'All Batches'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {exam.courseTitle || 'General'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(exam.examDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-white font-semibold">{exam.totalMarks}</span> / <span className="text-rose-400">{exam.passingMarks} Pass</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-indigo-400 font-semibold">{exam.resultsCount || 0} Recorded</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exam.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : exam.status === 'COMPLETED'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setIsEnteringMarks(true);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Enter Marks</span>
                        </button>
                        <button
                          onClick={() => setSelectedExamId(exam.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center space-x-1"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Exam Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Schedule New Examination</span>
              </h2>
              <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-white text-xs">
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
                createExamMutation.mutate(newExam);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Exam Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Java OOPs & Collections Mid-Term"
                  required
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Course Curriculum *</label>
                <select
                  value={newExam.courseId}
                  onChange={(e) => setNewExam({ ...newExam, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {(coursesData?.courses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={newExam.examDate}
                    onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newExam.totalMarks}
                    onChange={(e) => setNewExam({ ...newExam, totalMarks: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Passing</label>
                  <input
                    type="number"
                    value={newExam.passingMarks}
                    onChange={(e) => setNewExam({ ...newExam, passingMarks: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExamMutation.isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow"
                >
                  {createExamMutation.isPending ? 'Scheduling...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Student Marks Modal */}
      {isEnteringMarks && selectedExamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Enter Student Marks & Calculate Grades</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Grade scales: 90%+ A+, 80%+ A, 70%+ B, 60%+ C, 40%+ D, &lt;40% F</p>
              </div>
              <button onClick={() => setIsEnteringMarks(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {(studentsData?.students || []).slice(0, 20).map((student: any) => {
                const marks = studentMarks[student.id] !== undefined ? studentMarks[student.id] : 75;
                const pct = Math.min(100, Math.max(0, marks));
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';

                return (
                  <div key={student.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{student.name || student.fullName}</p>
                      <p className="text-[10px] font-mono text-cyan-400">{student.studentIdNumber || student.studentId}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={marks}
                          onChange={(e) =>
                            setStudentMarks({
                              ...studentMarks,
                              [student.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white text-center font-mono focus:border-cyan-500"
                        />
                        <span className="text-xs text-slate-500">/ 100</span>
                      </div>

                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                          grade.startsWith('A')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : grade === 'B' || grade === 'C'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {grade}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEnteringMarks(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitMarksMutation.isPending}
                onClick={() => {
                  const payload = (studentsData?.students || []).slice(0, 20).map((s: any) => ({
                    studentId: s.id,
                    marksObtained: studentMarks[s.id] !== undefined ? studentMarks[s.id] : 75,
                  }));
                  submitMarksMutation.mutate({ examId: selectedExamId, marks: payload });
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow"
              >
                {submitMarksMutation.isPending ? 'Saving...' : 'Save Marks & Calculate Grades'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Exam Results Drawer / Modal */}
      {selectedExamId && !isEnteringMarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{examDetail?.exam?.title || 'Examination Results'}</h3>
                <p className="text-xs text-slate-400">Pass Rate: {examDetail?.exam?.analytics?.passRate || 92}% • Average Score: {examDetail?.exam?.analytics?.avgMarks || 74.5}/100</p>
              </div>
              <button onClick={() => setSelectedExamId(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {(examDetail?.exam?.results && examDetail.exam.results.length > 0) ? (
                examDetail.exam.results.map((r: any) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{r.student?.name || 'Student'}</p>
                      <p className="text-[10px] font-mono text-slate-400">{r.student?.studentIdNumber || 'STU001'}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-white">{r.marksObtained} Marks</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {r.grade}
                      </span>
                      <span className={`text-[10px] font-semibold ${r.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No student marks entered yet. Click "Enter Marks" to record marks for this exam.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-800">
              {examDetail?.exam?.status !== 'PUBLISHED' ? (
                <button
                  onClick={() => publishExamMutation.mutate(selectedExamId)}
                  disabled={publishExamMutation.isPending}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Results to Portals</span>
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Results Live on Student & Parent Portals</span>
                </span>
              )}

              <button
                onClick={() => setSelectedExamId(null)}
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

export default ExaminationsManagement;
