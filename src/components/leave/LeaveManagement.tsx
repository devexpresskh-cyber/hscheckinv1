import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { LeaveRequest } from '../../types/index.ts';
import {
  CalendarCheck,
  Plus,
  Check,
  X,
  Calendar,
  User,
  Building,
  Palmtree
} from 'lucide-react';

export const LeaveManagement: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  const leaves = StorageService.getLeaveRequests();
  const departments = StorageService.getDepartments();

  const [formData, setFormData] = useState<Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>>({
    personId: currentUser.personId || currentUser.id,
    personName: currentUser.fullName,
    department: currentUser.department,
    leaveType: 'Annual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const filteredLeaves = leaves.filter(l => {
    if (currentUser.role === 'teacher' || currentUser.role === 'employee') {
      const isOwned =
        (currentUser.personId && l.personId === currentUser.personId) ||
        l.personId === currentUser.id ||
        l.personName.toLowerCase() === currentUser.fullName.toLowerCase();
      if (!isOwned) return false;
    } else {
      if (!canAccessDepartment(l.department)) return false;
    }
    if (filterStatus !== 'All' && l.status !== filterStatus) return false;
    return true;
  });

  const handleApprove = (leave: LeaveRequest) => {
    StorageService.updateLeaveRequest(leave.id, {
      status: 'Approved',
      approvedBy: `${currentUser.fullName} (${currentUser.role})`
    });
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Approved Leave Request',
      target: `${leave.personName} (${leave.startDate} to ${leave.endDate})`,
      ipAddress: '127.0.0.1'
    });
    showToast(`Approved leave for ${leave.personName}`, 'success');
  };

  const handleReject = (leave: LeaveRequest) => {
    StorageService.updateLeaveRequest(leave.id, {
      status: 'Rejected',
      approvedBy: `${currentUser.fullName} (${currentUser.role})`
    });
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Rejected Leave Request',
      target: `${leave.personName} (${leave.startDate} to ${leave.endDate})`,
      ipAddress: '127.0.0.1'
    });
    showToast(`Rejected leave for ${leave.personName}`, 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) return;

    const newLeave: LeaveRequest = {
      ...formData,
      id: `leave-${Date.now()}`,
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0]
    };

    StorageService.addLeaveRequest(newLeave);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Submitted Leave Request',
      target: `${formData.personName} (${formData.leaveType})`,
      ipAddress: '127.0.0.1'
    });
    showToast('Leave request submitted for supervisor approval', 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Leave Management & Approvals
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ការស្នើសុំច្បាប់ឈប់សម្រាកប្រចាំឆ្នាំ ច្បាប់ឈឺ និងការអនុម័តដោយប្រធានផ្នែក
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="All">All Requests</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Apply For Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Requests Cards / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No leave requests found.
            </div>
          ) : (
            filteredLeaves.map(leave => {
              const statusBadge = {
                Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                Rejected: 'bg-rose-100 text-rose-800 border-rose-200'
              }[leave.status];

              return (
                <div key={leave.id} className="p-5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{leave.personName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">{leave.department}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {leave.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {leave.leaveType}
                      </span>
                      <span>From: <b>{leave.startDate}</b> to <b>{leave.endDate}</b></span>
                    </div>

                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <b>Reason:</b> {leave.reason}
                    </p>

                    {leave.approvedBy && (
                      <p className="text-[10px] text-slate-400">
                        Reviewed by: {leave.approvedBy}
                      </p>
                    )}
                  </div>

                  {leave.status === 'Pending' && hasPermission('attendance.approve') && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(leave)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(leave)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Apply For Leave</h3>
                <p className="text-xs text-slate-400">Exempts attendance scanner on approved dates</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.personName}
                  onChange={e => setFormData({ ...formData, personName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Leave Category
                </label>
                <select
                  value={formData.leaveType}
                  onChange={e => setFormData({ ...formData, leaveType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Other">Other Duty / Compassionate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Provide details for leave justification"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-600/30"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
