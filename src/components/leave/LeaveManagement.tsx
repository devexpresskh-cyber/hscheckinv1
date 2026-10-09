import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { LeaveRequest } from '../../types/index.ts';
import {
  CalendarCheck,
  Plus,
  Check,
  X,
  Calendar,
  User,
  Building,
  Palmtree,
  Clock,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Filter
} from 'lucide-react';

export const LeaveManagement: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterDurationUnit, setFilterDurationUnit] = useState<'All' | 'days' | 'hours'>('All');

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => StorageService.getLeaveRequests());
  const teachers = StorageService.getTeachers();
  const subjectSchedules = StorageService.getSubjectSchedules();

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setLeaves(StorageService.getLeaveRequests());
    });
    return unsub;
  }, []);

  const [formData, setFormData] = useState<{
    personId: string;
    personName: string;
    department: string;
    leaveType: 'Annual Leave' | 'Sick Leave' | 'Personal Leave' | 'Maternity Leave' | 'Other';
    startDate: string;
    endDate: string;
    reason: string;
    durationUnit: 'days' | 'hours';
    hours: number;
    startTime: string;
    endTime: string;
  }>({
    personId: currentUser.personId || currentUser.id,
    personName: currentUser.fullName,
    department: currentUser.department,
    leaveType: 'Annual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    durationUnit: 'days',
    hours: 2,
    startTime: '08:00',
    endTime: '10:00'
  });

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) return 1;
    const diff = (endMins - startMins) / 60;
    return Math.round(diff * 10) / 10;
  };

  const handleOpenApplyModal = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setFormData({
      personId: currentUser.personId || currentUser.id,
      personName: currentUser.fullName,
      department: currentUser.department,
      leaveType: 'Annual Leave',
      startDate: dateStr,
      endDate: dateStr,
      reason: '',
      durationUnit: 'days',
      hours: 2,
      startTime: '08:00',
      endTime: '10:00'
    });
    setIsModalOpen(true);
  };

  // Find classes on selected date if applicant is a teacher
  const applicantClassesOnDate = useMemo(() => {
    if (formData.durationUnit !== 'hours' || !formData.startDate) return [];
    const [y, m, d] = formData.startDate.split('-').map(Number);
    if (!y || !m || !d) return [];
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const matchedTeacher = teachers.find(
      t => t.id === formData.personId ||
           t.fullName?.trim().toLowerCase() === formData.personName?.trim().toLowerCase()
    );
    if (!matchedTeacher) return [];

    return subjectSchedules.filter(s => {
      const isTeacherMatch = s.teacherId === matchedTeacher.id ||
        s.teacherName?.trim().toLowerCase() === matchedTeacher.fullName?.trim().toLowerCase();
      if (!isTeacherMatch) return false;
      if (s.daysOfWeek && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
        return s.daysOfWeek.includes(dayOfWeek);
      }
      return s.dayOfWeek === dayOfWeek;
    });
  }, [formData.startDate, formData.personId, formData.personName, formData.durationUnit, teachers, subjectSchedules]);

  const filteredLeaves = leaves.filter(l => {
    if (currentUser.role === 'teacher' || currentUser.role === 'employee') {
      const myId = (currentUser.personId || currentUser.id || '').toLowerCase();
      const myName = (currentUser.fullName || '').toLowerCase();
      const myKhmer = (currentUser.khmerName || '').toLowerCase();
      const reqId = (l.personId || '').toLowerCase();
      const reqName = (l.personName || '').toLowerCase();

      const isOwned =
        reqId === myId ||
        reqName === myName ||
        (myKhmer && reqName === myKhmer);
      if (!isOwned) return false;
    } else {
      if (!canAccessDepartment(l.department)) return false;
    }
    if (filterStatus !== 'All' && l.status !== filterStatus) return false;
    if (filterDurationUnit !== 'All') {
      const isHourly = l.durationUnit === 'hours';
      if (filterDurationUnit === 'hours' && !isHourly) return false;
      if (filterDurationUnit === 'days' && isHourly) return false;
    }
    return true;
  });

  const handleApprove = (leave: LeaveRequest) => {
    const approverName = `${currentUser.fullName} (${currentUser.role})`;
    StorageService.updateLeaveRequest(leave.id, {
      status: 'Approved',
      approvedBy: approverName
    });

    // Auto-generate absent log records for all scheduled dates/classes in the approved leave range
    const createdRecords = StorageService.generateAttendanceForApprovedLeave(
      { ...leave, status: 'Approved', approvedBy: approverName },
      approverName
    );

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Approved Leave Request & Auto-Logged Absence',
      target: `${leave.personName} (${leave.durationUnit === 'hours' ? `${leave.hours || ''} hours` : `${leave.startDate} to ${leave.endDate}`}) - ${createdRecords.length} sessions logged`,
      ipAddress: '127.0.0.1'
    });

    TelegramService.sendLeaveApprovedAlert({
      name: leave.personName,
      department: leave.department,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      approvedBy: approverName,
      scheduleCount: createdRecords.length,
      durationUnit: leave.durationUnit,
      hours: leave.hours,
      startTime: leave.startTime,
      endTime: leave.endTime
    });

    const isHourly = leave.durationUnit === 'hours';
    showToast(
      isKhmer
        ? isHourly
          ? `បានអនុម័តច្បាប់ឈប់សម្រាក ${leave.hours || ''} ម៉ោងសម្រាប់ ${leave.personName} (${createdRecords.length} ម៉ោងបង្រៀន)`
          : `បានអនុម័តច្បាប់ឈប់សម្រាកសម្រាប់ ${leave.personName} និងបានកត់ត្រាអវត្តមានស្វ័យប្រវត្ត (${createdRecords.length} វេន/ម៉ោងបង្រៀន)`
        : isHourly
          ? `Approved ${leave.hours || ''} hours leave for ${leave.personName} (${createdRecords.length} class session${createdRecords.length === 1 ? '' : 's'})`
          : `Approved leave for ${leave.personName} & auto-logged absence (${createdRecords.length} schedule session${createdRecords.length === 1 ? '' : 's'})`,
      'success'
    );
  };

  const handleReject = (leave: LeaveRequest) => {
    const reviewerName = `${currentUser.fullName} (${currentUser.role})`;
    StorageService.updateLeaveRequest(leave.id, {
      status: 'Rejected',
      approvedBy: reviewerName
    });
    StorageService.removeAttendanceForCancelledLeave(leave);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Rejected Leave Request',
      target: `${leave.personName} (${leave.startDate} to ${leave.endDate})`,
      ipAddress: '127.0.0.1'
    });
    showToast(
      isKhmer ? `បានបដិសេធសំណើសុំច្បាប់សម្រាប់ ${leave.personName}` : `Rejected leave for ${leave.personName}`,
      'info'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) return;

    const isHourly = formData.durationUnit === 'hours';
    const computedHours = isHourly ? calculateHours(formData.startTime, formData.endTime) : undefined;

    const newLeave: LeaveRequest = {
      personId: formData.personId,
      personName: formData.personName,
      department: formData.department,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: isHourly ? formData.startDate : formData.endDate,
      reason: formData.reason,
      durationUnit: formData.durationUnit,
      hours: isHourly ? (formData.hours || computedHours || 1) : undefined,
      startTime: isHourly ? formData.startTime : undefined,
      endTime: isHourly ? formData.endTime : undefined,
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
      target: `${formData.personName} (${formData.leaveType} - ${isHourly ? `${formData.hours} hrs` : 'Full Day'})`,
      ipAddress: '127.0.0.1'
    });

    showToast(
      isKhmer
        ? isHourly
          ? `បានដាក់ពាក្យសុំច្បាប់ ${formData.hours} ម៉ោងរង់ចាំការអនុម័ត`
          : 'បានដាក់ពាក្យសុំច្បាប់ឈប់សម្រាករង់ចាំការអនុម័ត'
        : isHourly
          ? `Submitted ${formData.hours} hours leave request for supervisor review`
          : 'Leave request submitted for supervisor approval',
      'success'
    );
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
              {isKhmer ? 'ការស្នើសុំ និងអនុម័តច្បាប់ឈប់សម្រាក' : 'Leave Management & Approvals'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            {isKhmer
              ? 'ការស្នើសុំច្បាប់ជាម៉ោង ឬជាថ្ងៃពេញ និងការអនុម័តដោយប្រធានដេប៉ាតឺម៉ង់'
              : 'Apply for leave by hours or full days; review and approve absence permissions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="All">{isKhmer ? 'គ្រប់ស្ថានភាព (All)' : 'All Status'}</option>
            <option value="Pending">{isKhmer ? 'រង់ចាំពិនិត្យ (Pending)' : 'Pending Review'}</option>
            <option value="Approved">{isKhmer ? 'បានអនុម័ត (Approved)' : 'Approved'}</option>
            <option value="Rejected">{isKhmer ? 'បានបដិសេធ (Rejected)' : 'Rejected'}</option>
          </select>

          {/* Duration Unit Filter (Hours vs Days) */}
          <select
            value={filterDurationUnit}
            onChange={e => setFilterDurationUnit(e.target.value as any)}
            className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-800 focus:outline-hidden"
          >
            <option value="All">{isKhmer ? 'គ្រប់ទម្រង់ (All Modes)' : 'All Durations'}</option>
            <option value="hours">{isKhmer ? '⏱️ សុំច្បាប់ជាម៉ោង (Hourly)' : '⏱️ Hourly Only'}</option>
            <option value="days">{isKhmer ? '📅 សុំច្បាប់ជាថ្ងៃ (Full Days)' : '📅 Full Days Only'}</option>
          </select>

          <button
            onClick={handleOpenApplyModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isKhmer ? 'ស្នើសុំច្បាប់ (Apply Leave)' : 'Apply For Leave'}</span>
          </button>
        </div>
      </div>

      {/* Leave Requests Cards / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {isKhmer ? 'មិនមានទិន្នន័យច្បាប់ឈប់សម្រាកឡើយ។' : 'No leave requests found.'}
            </div>
          ) : (
            filteredLeaves.map(leave => {
              const statusBadge = {
                Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                Rejected: 'bg-rose-100 text-rose-800 border-rose-200'
              }[leave.status];

              const isHourly = leave.durationUnit === 'hours';

              return (
                <div key={leave.id} className="p-5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{leave.personName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">{leave.department}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {leave.status}
                      </span>

                      {/* Hourly vs Full Day Badge */}
                      {isHourly ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>{leave.hours ? `${leave.hours} hrs` : 'Hourly'}</span>
                          {leave.startTime && leave.endTime && (
                            <span className="text-purple-600 font-mono">({leave.startTime}-{leave.endTime})</span>
                          )}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-slate-500" />
                          <span>{isKhmer ? 'ជាថ្ងៃពេញ' : 'Full Day'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 flex-wrap">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                        {leave.leaveType}
                      </span>

                      {isHourly ? (
                        <span className="font-medium text-slate-800">
                          {isKhmer ? 'កាលបរិច្ឆេទ៖' : 'Date:'} <b>{leave.startDate}</b>
                          {leave.startTime && leave.endTime && (
                            <span className="ml-1 text-purple-900 font-bold">
                              • ម៉ោង: {leave.startTime} ដល់ {leave.endTime} ({leave.hours || ''} ម៉ោង)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>
                          {isKhmer ? 'ពី៖' : 'From:'} <b>{leave.startDate}</b> {isKhmer ? 'ដល់' : 'to'} <b>{leave.endDate}</b>
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <b>{isKhmer ? 'មូលហេតុ៖' : 'Reason:'}</b> {leave.reason}
                    </p>

                    {leave.approvedBy && (
                      <p className="text-[10px] text-slate-400">
                        {isKhmer ? 'ពិនិត្យដោយ៖' : 'Reviewed by:'} {leave.approvedBy}
                      </p>
                    )}
                  </div>

                  {leave.status === 'Pending' && hasPermission('attendance.approve') && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(leave)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'អនុម័ត' : 'Approve'}</span>
                      </button>
                      <button
                        onClick={() => handleReject(leave)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 active:scale-95 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'បដិសេធ' : 'Reject'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Apply For Leave (Supports Full Days & Hourly Leave) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {isKhmer ? 'ស្នើសុំច្បាប់ឈប់សម្រាក' : 'Apply For Leave'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isKhmer ? 'អាចសុំជាម៉ោង ឬជាថ្ងៃពេញ លើកលែងការស្កេនវត្តមានស្វ័យប្រវត្តិ' : 'Request by hours or full days; exempts attendance scanner upon approval'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Duration Mode Switcher: Days vs Hours */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isKhmer ? 'ទម្រង់សុំច្បាប់ (Duration Mode)' : 'Leave Duration Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, durationUnit: 'days' });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.durationUnit === 'days'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isKhmer ? 'ជាថ្ងៃពេញ (Full Days)' : 'Full Days'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        durationUnit: 'hours',
                        hours: formData.hours || 2,
                        startTime: formData.startTime || '08:00',
                        endTime: formData.endTime || '10:00'
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.durationUnit === 'hours'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isKhmer ? '⏱️ ជាម៉ោង (By Hours)' : '⏱️ By Hours'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ឈ្មោះអ្នកស្នើសុំ' : 'Applicant Name'}
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
                  {isKhmer ? 'ប្រភេទច្បាប់' : 'Leave Category'}
                </label>
                <select
                  value={formData.leaveType}
                  onChange={e => setFormData({ ...formData, leaveType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="Annual Leave">{isKhmer ? 'ច្បាប់ប្រចាំឆ្នាំ (Annual Leave)' : 'Annual Leave'}</option>
                  <option value="Sick Leave">{isKhmer ? 'ច្បាប់ឈឺ (Sick Leave)' : 'Sick Leave'}</option>
                  <option value="Personal Leave">{isKhmer ? 'ច្បាប់ផ្ទាល់ខ្លួន (Personal Leave)' : 'Personal Leave'}</option>
                  <option value="Maternity Leave">{isKhmer ? 'ច្បាប់លំហែមាតុភាព (Maternity Leave)' : 'Maternity Leave'}</option>
                  <option value="Other">{isKhmer ? 'ធុរៈផ្សេងៗ / បេសកកម្ម (Other Duty)' : 'Other Duty / Compassionate'}</option>
                </select>
              </div>

              {/* SECTION A: BY HOURS CONFIGURATION */}
              {formData.durationUnit === 'hours' ? (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>{isKhmer ? 'កំណត់កាលបរិច្ឆេទ និងម៉ោងសុំច្បាប់' : 'Select Date & Leave Hours'}</span>
                    </div>

                    <span className="text-[11px] font-black text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200 shadow-xs">
                      {formData.hours} {isKhmer ? 'ម៉ោង' : 'Hours'}
                    </span>
                  </div>

                  {/* Single Date Picker for Hourly Leave */}
                  <div>
                    <label className="block text-[11px] font-bold text-purple-950 mb-1">
                      {isKhmer ? 'កាលបរិច្ឆេទសុំច្បាប់' : 'Date of Leave'}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-950 shadow-xs"
                    />
                  </div>

                  {/* Start & End Times */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-950 mb-1">
                        {isKhmer ? 'ម៉ោងចាប់ផ្តើម' : 'Start Time'}
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={e => {
                          const newStart = e.target.value;
                          const hrs = calculateHours(newStart, formData.endTime);
                          setFormData({ ...formData, startTime: newStart, hours: hrs });
                        }}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-950 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-950 mb-1">
                        {isKhmer ? 'ម៉ោងបញ្ចប់' : 'End Time'}
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={e => {
                          const newEnd = e.target.value;
                          const hrs = calculateHours(formData.startTime, newEnd);
                          setFormData({ ...formData, endTime: newEnd, hours: hrs });
                        }}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-950 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Quick Hour Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                      {isKhmer ? 'ជ្រើសរើសម៉ោងរហ័ស (Quick Presets):' : 'Quick Hour Presets:'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: '1 hr', h: 1, end: '09:00' },
                        { label: '1.5 hrs', h: 1.5, end: '09:30' },
                        { label: '2 hrs', h: 2, end: '10:00' },
                        { label: '3 hrs', h: 3, end: '11:00' },
                        { label: 'Half Day (4h)', h: 4, end: '12:00' }
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              startTime: '08:00',
                              endTime: preset.end,
                              hours: preset.h
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            formData.hours === preset.h
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Class Matcher for Teachers */}
                  {applicantClassesOnDate.length > 0 && (
                    <div className="pt-2 border-t border-purple-200/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>{isKhmer ? 'ម៉ោងបង្រៀនថ្ងៃនេះ (ចុចដើម្បីជ្រើស):' : 'Teaching sessions on this date:'}</span>
                      </span>

                      <div className="space-y-1">
                        {applicantClassesOnDate.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              const hrs = calculateHours(sub.startTime, sub.endTime);
                              setFormData({
                                ...formData,
                                startTime: sub.startTime,
                                endTime: sub.endTime,
                                hours: hrs,
                                reason: formData.reason || `Leave for ${sub.subject} (${sub.gradeClass})`
                              });
                            }}
                            className="w-full text-left p-2 rounded-xl bg-white hover:bg-purple-100 border border-purple-200 text-purple-950 text-xs flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div>
                              <span className="font-black">{sub.subject}</span>
                              <span className="text-purple-600 ml-1.5 text-[11px]">({sub.gradeClass} • {sub.room})</span>
                            </div>
                            <span className="font-mono font-bold text-[11px] bg-purple-100 px-2 py-0.5 rounded text-purple-800">
                              {sub.startTime} - {sub.endTime}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* SECTION B: FULL DAYS CONFIGURATION */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKhmer ? 'កាលបរិច្ឆេទចាប់ផ្តើម' : 'Start Date'}
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
                      {isKhmer ? 'កាលបរិច្ឆេទបញ្ចប់' : 'End Date'}
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
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKhmer ? 'មូលហេតុនៃការសុំច្បាប់ *' : 'Reason for Leave *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder={
                    isKhmer
                      ? 'បញ្ជាក់ពីមូលហេតុជាក់ស្តែង (ឧ. ឈឺ, ទៅពេទ្យ, ធុរៈគ្រួសារបន្ទាន់...)'
                      : 'Provide details for leave justification (e.g., doctor visit, personal emergency)'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  {formData.durationUnit === 'hours'
                    ? (isKhmer ? `ស្នើសុំ ${formData.hours} ម៉ោង` : `Submit ${formData.hours} hrs Leave`)
                    : (isKhmer ? 'ដាក់ពាក្យស្នើសុំ' : 'Submit Application')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
