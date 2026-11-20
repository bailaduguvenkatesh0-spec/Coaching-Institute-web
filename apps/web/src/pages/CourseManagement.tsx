import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Calendar,
  IndianRupee,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const CourseManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newCourse, setNewCourse] = useState({
    courseCode: '',
    title: '',
    description: '',
    duration: '6 Months',
    fee: '45000',
    status: 'ACTIVE',
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchApi('/api/courses'),
  });

  const createCourseMutation = useMutation({
    mutationFn: (courseData: any) =>
      fetchApi('/api/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setIsAddOpen(false);
      setFormError(null);
      setNewCourse({
        courseCode: '',
        title: '',
        description: '',
        duration: '6 Months',
        fee: '45000',
        status: 'ACTIVE',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create course');
    },
  });

  const courses = (data?.courses || []).filter((c: any) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCourses = data?.courses?.length || 0;
  const activeCourses = (data?.courses || []).filter((c: any) => c.status === 'ACTIVE').length;
  const totalEnrolled = (data?.courses || []).reduce((acc: number, c: any) => acc + (c.enrolledStudentsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Course Curriculum & Offerings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              {totalCourses} Courses
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage comprehensive academic courses, durations, fees, and syllabus tracks
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Active Curriculum</p>
            <p className="text-xl font-bold text-white mt-0.5">{activeCourses}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Enrolled Students</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalEnrolled}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Standard Base Fee</p>
            <p className="text-xl font-bold text-white mt-0.5">₹45,000</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses by title or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <button
          onClick={() => refetch()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Courses Grid / Cards */}
      {isLoading ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <p className="text-xs text-slate-400">Loading course curriculum...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No courses found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or add a new course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {course.courseCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      course.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">{course.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {course.description || 'Full comprehensive professional development syllabus and hands-on projects.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Duration</span>
                    <span className="font-semibold text-slate-200">{course.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Course Fee</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      ₹{Number(course.fee).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{course.classesCount || 1} Batches</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{course.enrolledStudentsCount || 0} Students</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Create New Academic Course</span>
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
                createCourseMutation.mutate(newCourse);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Course Code *</label>
                <input
                  type="text"
                  placeholder="e.g. JAVA-FS-2026"
                  required
                  value={newCourse.courseCode}
                  onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Course Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Java Full Stack Development"
                  required
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fee (₹ INR)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={newCourse.fee}
                    onChange={(e) => setNewCourse({ ...newCourse, fee: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  placeholder="Course highlights, prerequisites, target roles..."
                  rows={2}
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
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
                  disabled={createCourseMutation.isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow"
                >
                  {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
