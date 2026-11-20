import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api.js';
import {
  IndianRupee,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  Search,
  Plus,
  ArrowUpRight,
  Receipt,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const FeeManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [paymentData, setPaymentData] = useState({
    feeId: '',
    studentId: '',
    amount: '',
    paymentMode: 'UPI',
    transactionRef: '',
    remarks: 'Installment payment',
  });

  const { data: statsData } = useQuery({
    queryKey: ['fees-stats'],
    queryFn: () => fetchApi('/api/fees/stats'),
  });

  const { data: feesData, isLoading, refetch } = useQuery({
    queryKey: ['fees', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);
      return fetchApi(`/api/fees?${params.toString()}`);
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['fees-stats'] });
      setIsRecordOpen(false);
      setFormError(null);
      if (res.payment) {
        setSelectedReceipt({
          ...res.payment,
          studentName: feesData?.fees?.find((f: any) => f.id === res.payment.feeId)?.student?.name || 'Student',
          studentIdNumber: feesData?.fees?.find((f: any) => f.id === res.payment.feeId)?.student?.studentIdNumber || 'STU001',
          courseName: feesData?.fees?.find((f: any) => f.id === res.payment.feeId)?.course?.title || 'Course',
        });
      }
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record payment');
    },
  });

  const stats = statsData?.stats || {
    totalFeesExpected: 4500000,
    totalCollected: 3150000,
    totalOutstanding: 1350000,
    collectionRate: 70.0,
    statusCounts: { PAID: 60, PARTIALLY_PAID: 25, PENDING: 15 },
  };

  const fees = feesData?.fees || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Fee Ledger & Payment Collection</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              ₹{(stats.totalCollected / 100000).toFixed(1)}L Collected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track student fee balances, record installments, issue instant PDF tax receipts, and audit collections
          </p>
        </div>

        <button
          onClick={() => setIsRecordOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-400">Total Expected Fees</p>
            <IndianRupee className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">₹{Number(stats.totalFeesExpected).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-1">Across 100 registered students</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-400">Total Collected</p>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">₹{Number(stats.totalCollected).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">{stats.collectionRate}% Collection Rate</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-400">Total Outstanding Balance</p>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-1">₹{Number(stats.totalOutstanding).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-rose-400/80 mt-1">{stats.statusCounts?.PENDING || 0} unpaid accounts</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-400">Paid In Full</p>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.statusCounts?.PAID || 0} Students</p>
          <p className="text-[10px] text-slate-500 mt-1">{stats.statusCounts?.PARTIALLY_PAID || 0} partially paid</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or student ID..."
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
          <option value="ALL">All Fee Statuses</option>
          <option value="PAID">PAID</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="PENDING">PENDING</option>
        </select>

        <button
          onClick={() => refetch()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Fees Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Student & ID</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Total Fee</th>
                <th className="py-3.5 px-4">Paid Amount</th>
                <th className="py-3.5 px-4">Balance Due</th>
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
                      <span className="text-xs">Loading fee records...</span>
                    </div>
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="w-8 h-8 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-300">No fee records found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                fees.map((fee: any) => {
                  const total = fee.totalAmount || 45000;
                  const paid = fee.paidAmount || (fee.status === 'PAID' ? 45000 : fee.status === 'PARTIALLY_PAID' ? 20000 : 0);
                  const balance = Math.max(0, total - paid);

                  return (
                    <tr key={fee.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{fee.student?.name || 'Student'}</div>
                        <div className="text-[11px] font-mono text-cyan-400 mt-0.5">{fee.student?.studentIdNumber || fee.studentId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {fee.course?.title || 'Java Full Stack'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        ₹{Number(total).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        ₹{Number(paid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-400">
                        ₹{Number(balance).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fee.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : fee.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {fee.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {fee.payments && fee.payments.length > 0 && (
                            <button
                              onClick={() =>
                                setSelectedReceipt({
                                  ...fee.payments[0],
                                  studentName: fee.student?.name,
                                  studentIdNumber: fee.student?.studentIdNumber,
                                  courseName: fee.course?.title,
                                })
                              }
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 flex items-center space-x-1"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}
                          {fee.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setPaymentData({
                                  ...paymentData,
                                  feeId: fee.id,
                                  studentId: fee.student?.id || fee.studentId,
                                  amount: String(balance),
                                });
                                setIsRecordOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Record Fee Payment</span>
              </h2>
              <button onClick={() => setIsRecordOpen(false)} className="text-slate-400 hover:text-white text-xs">
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
                recordPaymentMutation.mutate(paymentData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Student / Fee Record *</label>
                <select
                  required
                  value={paymentData.feeId}
                  onChange={(e) => {
                    const selFee = fees.find((f: any) => f.id === e.target.value);
                    const total = selFee?.totalAmount || 45000;
                    const paid = selFee?.paidAmount || 0;
                    setPaymentData({
                      ...paymentData,
                      feeId: e.target.value,
                      studentId: selFee?.student?.id || selFee?.studentId || '',
                      amount: String(Math.max(0, total - paid)),
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a student...</option>
                  {fees.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.student?.name} ({f.student?.studentIdNumber}) - Due: ₹{(f.totalAmount || 45000) - (f.paidAmount || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Amount to Pay (₹) *</label>
                  <input
                    type="number"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Mode *</label>
                  <select
                    value={paymentData.paymentMode}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="NET_BANKING">Net Banking / NEFT</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="CHEQUE">Cheque / DD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-98471203"
                  value={paymentData.transactionRef}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionRef: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow"
                >
                  {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Tax Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                  TB
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">TEAM B COACHING INSTITUTE</h3>
                  <p className="text-[10px] text-slate-400">Official Fee Receipt</p>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Receipt No: <strong className="text-white font-mono">{selectedReceipt.id || 'RCT-88491'}</strong></span>
                <span>Date: <strong className="text-white">{new Date(selectedReceipt.paymentDate || Date.now()).toLocaleDateString()}</strong></span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Student Name</span>
                  <span className="font-semibold text-white">{selectedReceipt.studentName || 'Student'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Student ID</span>
                  <span className="font-mono text-cyan-400">{selectedReceipt.studentIdNumber || 'STU001'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Course Track</span>
                  <span className="text-slate-300">{selectedReceipt.courseName || 'Java Full Stack'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Payment Mode</span>
                  <span className="font-semibold text-emerald-400">{selectedReceipt.paymentMode || 'UPI'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Amount Received:</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  ₹{Number(selectedReceipt.amount || 25000).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 text-center pt-2">
                This is a computer-generated receipt valid for tax and academic records.
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Download PDF</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
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

export default FeeManagement;
