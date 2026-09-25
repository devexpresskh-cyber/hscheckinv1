import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { AttendanceRecord, AttendanceCorrectionRequest, AttendanceStatus } from '../../types/index.ts';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal.tsx';
import {
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  Download,
  Clock,
  MapPin,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  PlusCircle,
  FileSpreadsheet,
  Building
} from 'lucide-react';

export const AttendanceList: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [activeTab, setActiveTab] = useState<'daily' | 'corrections'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);

  const departments = StorageService.getDepartments();
  const attendanceList = StorageService.getAttendance();
  const corrections = StorageService.getCorrections();

  // Filter daily attendance
  const filteredAttendance = useMemo(() => {
    return attendanceList.filter(record => {
      // Date filter
      if (selectedDate && record.date !== selectedDate) return false;
      // Supervisor department check
      if (!canAccessDepartment(record.department)) return false;
      // Dropdown department
      if (selectedDept !== 'All' && record.department !== selectedDept) return false;
      // Status
      if (selectedStatus !== 'All' && record.status !== selectedStatus) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = record.personName.toLowerCase().includes(q);
        const matchKhmer = (record.khmerName || '').toLowerCase().includes(q);
        if (!matchName && !matchKhmer) return false;
      }
      return true;
    });
  }, [attendanceList, selectedDate, selectedDept, selectedStatus, searchQuery, canAccessDepartment]);

  // Filter corrections
  const filteredCorrections = useMemo(() => {
    return corrections.filter(c => {
      if (!canAccessDepartment(c.department)) return false;
      return true;
    });
  }, [corrections, canAccessDepartment]);

  const pendingCorrectionsCount = filteredCorrections.filter(c => c.status === 'Pending').length;

  // Handle Submit new correction request
  const handleSubmitCorrection = (req: AttendanceCorrectionRequest) => {
    StorageService.addCorrection(req);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Submitted Attendance Correction',
      target: `${req.personName} for ${req.date}`,
      newValue: `Requested In: ${req.requestedCheckIn}, Out: ${req.requestedCheckOut}`,
      ipAddress: '127.0.0.1'
    });
    showToast('Correction request submitted for approval', 'success');
    setIsCorrectionModalOpen(false);
    setSelectedRecordForCorrection(null);
  };

  // Approve Correction
  const handleApproveCorrection = (req: AttendanceCorrectionRequest) => {
    StorageService.updateCorrection(req.id, {
      status: 'Approved',
      reviewedBy: currentUser.fullName,
      reviewedAt: new Date().toISOString()
    });

    // Update the corresponding attendance record
    const target = attendanceList.find(
      a => a.personId === req.personId && a.date === req.date
    );

    if (target) {
      // Re-calculate late minutes with requested check-in
      const schedule = StorageService.getSchedules().find(s => s.id === target.scheduleId) || StorageService.getSchedules()[0];
      const { status, lateMinutes } = AttendanceEngine.evaluateCheckInStatus(
        req.requestedCheckIn || target.checkInTime || '07:30',
        schedule.startTime,
        schedule.gracePeriodMinutes
      );

      StorageService.updateAttendanceRecord(target.id, {
        checkInTime: req.requestedCheckIn || target.checkInTime,
        checkOutTime: req.requestedCheckOut || target.checkOutTime,
        status: status,
        lateMinutes: lateMinutes,
        isCorrected: true,
        correctionNote: `Adjusted: ${req.reason} (Approved by ${currentUser.fullName})`
      });
    }

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Approved Attendance Correction',
      target: `${req.personName} (${req.date})`,
      newValue: 'Approved',
      ipAddress: '127.0.0.1'
    });

    showToast(`Approved correction for ${req.personName}`, 'success');
  };

  // Reject Correction
  const handleRejectCorrection = (req: AttendanceCorrectionRequest) => {
    StorageService.updateCorrection(req.id, {
      status: 'Rejected',
      reviewedBy: currentUser.fullName,
      reviewedAt: new Date().toISOString()
    });

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Rejected Attendance Correction',
      target: `${req.personName} (${req.date})`,
      newValue: 'Rejected',
      ipAddress: '127.0.0.1'
    });

    showToast(`Rejected correction request for ${req.personName}`, 'info');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Staff Name',
      'Khmer Name',
      'Type',
      'Department',
      'Subject',
      'Grade/Class',
      'Room',
      'Period',
      'Scheduled In',
      'Scheduled Out',
      'Check-in',
      'Check-out',
      'Status',
      'Late (Mins)',
      'Early Leave (Mins)',
      'Overtime (Mins)',
      'GPS Verified'
    ];
    const rows = filteredAttendance.map(r => [
      r.date,
      `"${r.personName}"`,
      `"${r.khmerName || ''}"`,
      r.personType,
      `"${r.department}"`,
      `"${r.subject || ''}"`,
      `"${r.gradeClass || ''}"`,
      `"${r.room || ''}"`,
      `"${r.periodName || ''}"`,
      r.scheduledStart,
      r.scheduledEnd,
      r.checkInTime || '',
      r.checkOutTime || '',
      r.status,
      r.lateMinutes,
      r.earlyLeaveMinutes,
      r.overtimeMinutes,
      r.locationVerified ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported daily attendance report', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Attendance Records & Corrections
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            បញ្ជីកត់ត្រាវត្តមានប្រចាំថ្ងៃ ការគណនាការយឺតយ៉ាវ និងការអនុម័តកែសម្រួលម៉ោង
          </p>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Daily Roster
            </button>
            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'corrections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <span>Correction Requests</span>
              {pendingCorrectionsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCorrectionsCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => {
              setSelectedRecordForCorrection(null);
              setIsCorrectionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Request Correction</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Daily Attendance Roster */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
                />
              </div>

              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Leave">On Leave</option>
                <option value="Early Leave">Early Leave</option>
                <option value="Missing Check-out">Missing Check-out</option>
              </select>
            </div>

          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isKhmer ? 'បុគ្គលិក / គ្រូ' : 'Staff Member'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ផ្នែក / មុខវិជ្ជា & បន្ទប់' : 'Dept / Subject & Class'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ស្កេនចូល' : 'Check-in'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ស្កេនចេញ' : 'Check-out'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ស្ថានភាព' : 'Status & Lateness'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ផ្ទៀងផ្ទាត់' : 'Verification'}</th>
                    <th className="py-3 px-4 text-right">{isKhmer ? 'សកម្មភាព' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No attendance records found for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(record => {
                      const statusColors = {
                        Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        Late: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                        Absent: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                        'Early Leave': 'bg-orange-100 text-orange-800 border-orange-200',
                        Leave: 'bg-purple-100 text-purple-800 border-purple-200',
                        Holiday: 'bg-blue-100 text-blue-800 border-blue-200',
                        'Missing Check-out': 'bg-rose-50 text-rose-700 border-rose-200',
                        'Off Day': 'bg-slate-100 text-slate-600 border-slate-200'
                      }[record.status] || 'bg-slate-100 text-slate-700';

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block leading-tight">
                              {record.personName}
                            </span>
                            {record.khmerName && (
                              <span className="text-[11px] text-slate-500 font-khmer">
                                {record.khmerName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 capitalize block">
                              {record.personType}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {record.subject ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                    {record.gradeClass || 'Class'}
                                  </span>
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {record.subject}
                                  </span>
                                </div>
                                {record.khmerSubject && (
                                  <span className="text-[11px] text-slate-500 font-khmer block">
                                    {record.khmerSubject}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                  {record.periodName && <span className="font-bold text-indigo-700">{record.periodName}</span>}
                                  {record.room && <span>• 📍 {record.room}</span>}
                                  <span className="font-mono text-slate-400">({record.scheduledStart} - {record.scheduledEnd})</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {record.department}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {record.scheduledStart} - {record.scheduledEnd}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {record.checkInTime || <span className="text-slate-400 font-normal">--:--</span>}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {record.checkOutTime || <span className="text-slate-400 font-normal">--:--</span>}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusColors}`}>
                                {record.status}
                              </span>
                              {record.lateMinutes > 0 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  +{record.lateMinutes}m
                                </span>
                              )}
                              {record.earlyLeaveMinutes > 0 && (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                                  -{record.earlyLeaveMinutes}m early
                                </span>
                              )}
                              {record.isCorrected && (
                                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded" title={record.correctionNote}>
                                  Corrected
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {record.locationVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <MapPin className="w-3 h-3 text-emerald-600" /> GPS OK
                              </span>
                            ) : record.checkInTime ? (
                              <span className="text-[11px] text-slate-400">Standard</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedRecordForCorrection(record);
                                setIsCorrectionModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              Request Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
              <span>Total records for {selectedDate}: <b>{filteredAttendance.length}</b></span>
              <span>All times recorded in Cambodia Time (UTC+7)</span>
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Attendance Corrections Queue */}
      {activeTab === 'corrections' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Attendance Adjustment Requests</h3>
              <p className="text-xs text-slate-500">
                Staff submissions for missed scans, faulty scanners, or official off-campus duty
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {filteredCorrections.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No correction requests found.
              </div>
            ) : (
              filteredCorrections.map(req => {
                const statusBadge = {
                  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  Rejected: 'bg-rose-100 text-rose-800 border-rose-200'
                }[req.status];

                return (
                  <div key={req.id} className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{req.personName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-medium">{req.department}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="text-slate-600">
                        Date: <b className="text-slate-800">{req.date}</b> | Requested Check-in: <b className="text-slate-800">{req.requestedCheckIn || '-'}</b> | Requested Check-out: <b className="text-slate-800">{req.requestedCheckOut || '-'}</b>
                      </div>

                      <p className="text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px]">
                        <b>Reason:</b> {req.reason}
                        {req.supportingNote && <span className="text-slate-500 ml-2">({req.supportingNote})</span>}
                      </p>

                      {req.reviewedBy && (
                        <p className="text-[10px] text-slate-400">
                          Reviewed by {req.reviewedBy} at {req.reviewedAt?.slice(0, 16)}
                        </p>
                      )}
                    </div>

                    {/* Actions if Pending and has permission */}
                    {req.status === 'Pending' && hasPermission('attendance.approve') && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveCorrection(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectCorrection(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
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
      )}

      {/* Correction Request Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedRecordForCorrection(null);
        }}
        onSubmit={handleSubmitCorrection}
        targetRecord={selectedRecordForCorrection}
      />

    </div>
  );
};
