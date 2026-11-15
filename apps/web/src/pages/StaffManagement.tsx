import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Shield,
} from 'lucide-react';

interface StaffRecord {
  id: string;
  staffId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

export const StaffManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters & Search
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers state
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Form states
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    joiningDate: '',
    employmentStatus: 'ACTIVE' as StaffRecord['employmentStatus'],
  });

  // 1. Fetch Dynamic Stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: () => fetchApi('/api/staff/stats'),
  });

  // 2. Fetch Staff List
  const {
    data: staffData,
    isLoading: staffLoading,
    isError: staffIsError,
    error: staffError,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ['staff-list', search, departmentFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter && departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      return fetchApi(`/api/staff?${params.toString()}`);
    },
  });

  const staffList: StaffRecord[] = staffData?.data || [];
  const stats = statsData?.data || { total: 0, active: 0, inactive: 0, byDepartment: {} };

  // 3. Create Staff Mutation
  const createMutation = useMutation({
    mutationFn: (newStaff: any) =>
      fetchApi('/api/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      setIsAddingStaff(false);
      setFormError(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add staff member');
    },
  });

  // 4. Update Staff Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      fetchApi(`/api/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      if (selectedStaff && selectedStaff.id === res.data.id) {
        setSelectedStaff(res.data);
      }
      setIsEditingStaff(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update staff member');
    },
  });

  // 5. Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'ACTIVE' | 'INACTIVE' }) =>
      fetchApi(`/api/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ employmentStatus: nextStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: '',
      fullName: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      joiningDate: '',
      employmentStatus: 'ACTIVE',
    });
  };

  const openAddModal = () => {
    resetForm();
    setFormError(null);
    setIsAddingStaff(true);
  };

  const openEditModal = (staff: StaffRecord) => {
    setSelectedStaff(staff);
    setFormData({
      staffId: staff.staffId,
      fullName: staff.fullName,
      email: staff.email || '',
      phone: staff.phone || '',
      designation: staff.designation || '',
      department: staff.department || '',
      joiningDate: staff.joiningDate ? staff.joiningDate.slice(0, 10) : '',
      employmentStatus: staff.employmentStatus,
    });
    setFormError(null);
    setIsEditingStaff(true);
  };

  const openProfileDrawer = (staff: StaffRecord) => {
    setSelectedStaff(staff);
    setIsViewingProfile(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffId.trim() || !formData.fullName.trim()) {
      setFormError('Staff ID and Full Name are required.');
      return;
    }
    createMutation.mutate({
      staffId: formData.staffId.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim() ? formData.email.trim() : null,
      phone: formData.phone.trim() ? formData.phone.trim() : null,
      designation: formData.designation.trim() ? formData.designation.trim() : null,
      department: formData.department.trim() ? formData.department.trim() : null,
      joiningDate: formData.joiningDate ? formData.joiningDate : null,
      employmentStatus: formData.employmentStatus,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!formData.fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    updateMutation.mutate({
      id: selectedStaff.id,
      updates: {
        fullName: formData.fullName.trim(),
        email: formData.email.trim() ? formData.email.trim() : null,
        phone: formData.phone.trim() ? formData.phone.trim() : null,
        designation: formData.designation.trim() ? formData.designation.trim() : null,
        department: formData.department.trim() ? formData.department.trim() : null,
        joiningDate: formData.joiningDate ? formData.joiningDate : null,
        employmentStatus: formData.employmentStatus,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Staff Management</span>
            </h2>
            <Badge variant="info">{stats.total} Members</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Database-connected staff directory, departmental role assignments, and access policies
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchStaff();
              refetchStats();
            }}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition shadow-sm"
            title="Refresh from Database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-cyan-950/50 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Dynamic Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Staff */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Total Staff
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">
              {statsLoading ? '...' : stats.total}
            </span>
            <span className="text-xs text-slate-400">enrolled in system</span>
          </div>
        </div>

        {/* Active Staff */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Active Staff
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {statsLoading ? '...' : stats.active}
            </span>
            <span className="text-xs text-emerald-500/80">currently active</span>
          </div>
        </div>

        {/* Inactive Staff */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Inactive Staff
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-400 font-mono">
              {statsLoading ? '...' : stats.inactive}
            </span>
            <span className="text-xs text-rose-500/80">inactive or on leave</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {staffIsError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-rose-200">Unable to load staff records from database</p>
              <p className="text-[11px] text-rose-300/80">{(staffError as any)?.message || 'Database error'}</p>
            </div>
          </div>
          <button
            onClick={() => refetchStaff()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Staff ID, Name, Designation, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter by Department */}
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
        >
          <option value="ALL">All Departments</option>
          <option value="Academics">Academics</option>
          <option value="Admissions">Admissions</option>
          <option value="Administration">Administration</option>
          <option value="Unassigned">Unassigned</option>
        </select>

        {/* Filter by Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {staffLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs">Loading staff records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Users className="w-8 h-8 text-slate-600" />
                      <div className="text-sm font-semibold text-slate-300">No staff members found.</div>
                      <p className="text-xs text-slate-500">
                        {search || departmentFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Try adjusting your search query or filters.'
                          : 'Add your first staff member to the institution.'}
                      </p>
                      <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Staff Member</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition">
                    {/* Staff ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {member.staffId}
                    </td>

                    {/* Full Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{member.fullName}</div>
                      <div className="text-[10px] text-slate-400">
                        Added: {new Date(member.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {member.email ? (
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not provided</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {member.phone ? (
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not provided</span>
                      )}
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {member.designation ? (
                        <div className="flex items-center space-x-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.designation}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {member.department ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {member.department}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          member.employmentStatus === 'ACTIVE'
                            ? 'success'
                            : member.employmentStatus === 'INACTIVE'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {member.employmentStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* View Profile */}
                        <button
                          onClick={() => openProfileDrawer(member)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Staff */}
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:text-cyan-200 hover:bg-slate-700 transition"
                          title="Edit Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Activate / Deactivate Toggle */}
                        {member.employmentStatus === 'ACTIVE' ? (
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: member.id, nextStatus: 'INACTIVE' })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition"
                            title="Deactivate Staff"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: member.id, nextStatus: 'ACTIVE' })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/60 transition"
                            title="Activate Staff"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Profile Drawer / Modal */}
      {isViewingProfile && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-cyan-400">STAFF PROFILE</div>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedStaff.fullName}</h3>
              </div>
              <button
                onClick={() => setIsViewingProfile(false)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Staff ID: {selectedStaff.staffId}</span>
                <Badge
                  variant={
                    selectedStaff.employmentStatus === 'ACTIVE'
                      ? 'success'
                      : selectedStaff.employmentStatus === 'INACTIVE'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {selectedStaff.employmentStatus}
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email Address:</span>
                  </span>
                  <span className="text-white font-mono">
                    {selectedStaff.email || <span className="text-slate-500 italic">Not set</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Phone Number:</span>
                  </span>
                  <span className="text-white font-mono">
                    {selectedStaff.phone || <span className="text-slate-500 italic">Not set</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>Designation:</span>
                  </span>
                  <span className="text-white font-medium">
                    {selectedStaff.designation || <span className="text-slate-500 italic">Unassigned</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Department:</span>
                  </span>
                  <span className="text-white font-medium">
                    {selectedStaff.department || <span className="text-slate-500 italic">Unassigned</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joining Date:</span>
                  </span>
                  <span className="text-white font-mono">
                    {selectedStaff.joiningDate
                      ? new Date(selectedStaff.joiningDate).toLocaleDateString()
                      : <span className="text-slate-500 italic">Not set</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Database ID:</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px]">
                    {selectedStaff.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setIsViewingProfile(false);
                  openEditModal(selectedStaff);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Staff Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditingStaff && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Staff Details</h3>
                <p className="text-xs text-slate-400 font-mono">Staff ID: {selectedStaff.staffId}</p>
              </div>
              <button
                onClick={() => setIsEditingStaff(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. staff@teamb.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Faculty / Counsellor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    <option value="Academics">Academics</option>
                    <option value="Admissions">Admissions</option>
                    <option value="Administration">Administration</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employment Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, employmentStatus: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingStaff(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddingStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Staff Member</h3>
                <p className="text-xs text-slate-400">Register employee record in PostgreSQL database</p>
              </div>
              <button
                onClick={() => setIsAddingStaff(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Staff ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STF006"
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Employee Full Name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. name@teamb.edu (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210 (optional)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Faculty / Counsellor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    <option value="Academics">Academics</option>
                    <option value="Admissions">Admissions</option>
                    <option value="Administration">Administration</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, employmentStatus: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingStaff(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
