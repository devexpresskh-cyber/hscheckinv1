import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { AttendanceRecord, AttendanceCorrectionRequest, AttendanceStatus, TeacherSubjectSchedule, ScheduleSubstitution } from '../../types/index.ts';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal.tsx';
import { Attendance31DaysSheet } from './Attendance31DaysSheet.tsx';
import { AttendancePeriodGrid } from './AttendancePeriodGrid.tsx';
import { ScheduleSubstituteModal } from '../schedules/ScheduleSubstituteModal.tsx';
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
  Building,
  Trash2,
  LogIn,
  LogOut,
  BookOpen,
  GraduationCap,
  Users2,
  Sparkles,
  Zap,
  UserPlus,
  UserCheck
} from 'lucide-react';

// Split E/L badge icon matching the uploaded screenshot
const EarlyLateBadge: React.FC<{ className?: string }> = ({ className = "w-5 h-5 shrink-0 inline-block mr-1.5 align-middle" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#f59e0b" strokeWidth="1.6" />
    <line x1="5" y1="19" x2="19" y2="5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
    <text x="8" y="11" fill="#d97706" fontSize="8" fontWeight="800" fontStyle="italic" textAnchor="middle">E</text>
    <text x="16" y="18.5" fill="#dc2626" fontSize="8" fontWeight="800" fontStyle="italic" textAnchor="middle">L</text>
  </svg>
);

function formatScreenshotDate(dateStr: string): { weekday: string; dateFormatted: string; full: string } {
  if (!dateStr) return { weekday: '', dateFormatted: '', full: '--' };
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length < 3) return { weekday: '', dateFormatted: dateStr, full: dateStr };
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = days[dateObj.getDay()] || '';
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');
    const yearShort = String(y).slice(-2);
    const dateFormatted = `${dayStr}-${monthStr}-${yearShort}`;
    return {
      weekday,
      dateFormatted,
      full: `${weekday}, ${dateFormatted}`
    };
  } catch {
    return { weekday: '', dateFormatted: dateStr, full: dateStr };
  }
}

function format12HourTime(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '';
  const clean = timeStr.trim().slice(0, 5);
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  const displayHours = hours === 0 ? 12 : hours;
  const formattedHours = (ampm === 'AM' && displayHours < 10) ? `0${displayHours}` : `${displayHours}`;
  return `${formattedHours}:${minutes} ${ampm}`;
}

function calculateDurationString(checkIn?: string, checkOut?: string): string {
  if (!checkIn || !checkOut) return '--';
  const startM = AttendanceEngine.timeToMinutes(checkIn);
  const endM = AttendanceEngine.timeToMinutes(checkOut);
  if (endM < startM) return '--';
  const diff = endM - startM;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}hr ${mins}min`;
}

function getAttendanceRowConfig(record: AttendanceRecord) {
  const isAbsent = record.status === 'Absent' || record.status === 'Leave';
  const isWeeklyOff = record.status === 'Off Day';
  const isPrivilegeOrHalfDay =
    record.status === 'Holiday' ||
    Boolean(record.correctionNote && /half day|privilege|holiday/i.test(record.correctionNote)) ||
    (record.department && /privilege|holiday/i.test(record.department));
  const isMissingCheckout = record.status === 'Missing Check-out';
  const hasLateOrEarly = (record.lateMinutes > 0 || record.earlyLeaveMinutes > 0);

  if (isAbsent) {
    return {
      letter: 'A',
      circleBg: 'bg-[#e11d48]',
      dateTextColor: 'text-[#e11d48]',
      rowBg: 'bg-[#fff0f2] hover:bg-[#ffe4e9]',
      timingType: 'leave',
      timingTitle: record.status === 'Leave' ? 'On Leave' : 'Absent',
      duration: '--',
      durationColor: 'text-[#e11d48]',
      hasEarlyLate: false,
    };
  }

  if (isWeeklyOff) {
    return {
      letter: 'W',
      circleBg: 'bg-[#a855f7]',
      dateTextColor: 'text-[#a855f7]',
      rowBg: 'bg-[#faf5ff] hover:bg-[#f3e8ff]',
      timingType: 'off',
      timingTitle: 'Weekly Off',
      duration: '--',
      durationColor: 'text-purple-400',
      hasEarlyLate: false,
    };
  }

  if (isPrivilegeOrHalfDay) {
    const inTime = format12HourTime(record.checkInTime || record.scheduledStart);
    const outTime = format12HourTime(record.checkOutTime || record.scheduledEnd);
    const timingSub = (inTime && outTime) ? `${inTime} - ${outTime}` : (inTime ? `${inTime} - --:--` : '09:31 AM - 6:12 PM');
    const dur = calculateDurationString(record.checkInTime || record.scheduledStart, record.checkOutTime || record.scheduledEnd);
    return {
      letter: 'H',
      circleBg: 'bg-[#38bdf8]',
      dateTextColor: 'text-slate-800',
      rowBg: 'bg-[#f0f7ff] hover:bg-[#e4f1ff]',
      timingType: 'privilege',
      timingTitle: record.correctionNote || (record.status === 'Holiday' ? 'Holiday Privilege' : 'Half Day Privilege'),
      timingSub,
      duration: dur !== '--' ? dur : '8hr 41min',
      durationColor: 'text-slate-700',
      hasEarlyLate: hasLateOrEarly,
    };
  }

  if (isMissingCheckout) {
    const inTime = format12HourTime(record.checkInTime);
    return {
      letter: 'M',
      circleBg: 'bg-[#f59e0b]',
      dateTextColor: 'text-amber-900',
      rowBg: 'bg-[#fffbeb] hover:bg-[#fef3c7]',
      timingType: 'missing',
      timingTitle: 'Missing Check-out',
      timingSub: inTime ? `${inTime} - (Unrecorded)` : 'Check-in recorded',
      duration: '--',
      durationColor: 'text-amber-600',
      hasEarlyLate: hasLateOrEarly,
    };
  }

  // Default: Present or Late
  const inTime = format12HourTime(record.checkInTime || record.scheduledStart || '09:31');
  const outTime = format12HourTime(record.checkOutTime || record.scheduledEnd || (record.checkInTime ? undefined : '18:12'));
  const timingSub = (inTime && outTime) ? `${inTime} - ${outTime}` : (inTime ? `${inTime} - --:--` : '--');
  const dur = calculateDurationString(record.checkInTime, record.checkOutTime);

  return {
    letter: 'P',
    circleBg: 'bg-[#00a86b]',
    dateTextColor: 'text-slate-800',
    rowBg: 'bg-white hover:bg-slate-50/70',
    timingType: 'standard',
    timingSub,
    duration: dur,
    durationColor: 'text-slate-700',
    hasEarlyLate: hasLateOrEarly,
  };
}

export const AttendanceList: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [activeTab, setActiveTab] = useState<'daily' | 'period_grid' | 'monthly_sheet' | 'corrections'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);

  // Clear All Attendance States
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const [departments, setDepartments] = useState(() => StorageService.getDepartments());
  const [attendanceList, setAttendanceList] = useState(() => StorageService.getAttendance());
  const [corrections, setCorrections] = useState(() => StorageService.getCorrections());
  const [teachers, setTeachers] = useState(() => StorageService.getTeachers());
  const [employees, setEmployees] = useState(() => StorageService.getEmployees());
  const [subjectSchedules, setSubjectSchedules] = useState(() => StorageService.getSubjectSchedules());

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setAttendanceList(StorageService.getAttendance());
      setCorrections(StorageService.getCorrections());
      setDepartments(StorageService.getDepartments());
      setTeachers(StorageService.getTeachers());
      setEmployees(StorageService.getEmployees());
      setSubjectSchedules(StorageService.getSubjectSchedules());
    });
    return unsub;
  }, []);

  const isTeacherRecord = (record: AttendanceRecord): boolean => {
    return (
      record.personType === 'teacher' ||
      Boolean(record.subject) ||
      Boolean(record.subjectCode) ||
      Boolean(record.subjectScheduleId) ||
      teachers.some(t => t.id === record.personId || t.fullName?.toLowerCase() === record.personName?.toLowerCase())
    );
  };

  const getSubjectCode = (record: AttendanceRecord): string => {
    if (record.subjectCode && record.subjectCode.trim()) {
      return record.subjectCode.trim();
    }
    if (record.subjectScheduleId) {
      const match = subjectSchedules.find(s => s.id === record.subjectScheduleId);
      if (match?.subjectCode && match.subjectCode.trim()) {
        return match.subjectCode.trim();
      }
    }
    if (record.scheduleId) {
      const match = subjectSchedules.find(s => s.id === record.scheduleId);
      if (match?.subjectCode && match.subjectCode.trim()) {
        return match.subjectCode.trim();
      }
    }
    if (record.subject) {
      const match = subjectSchedules.find(
        s => (s.teacherId === record.personId || s.teacherName === record.personName) &&
             s.subject.trim().toLowerCase() === record.subject?.trim().toLowerCase()
      );
      if (match?.subjectCode && match.subjectCode.trim()) {
        return match.subjectCode.trim();
      }
      const matchByClass = subjectSchedules.find(
        s => s.subject.trim().toLowerCase() === record.subject?.trim().toLowerCase() &&
             (!record.gradeClass || s.gradeClass.trim().toLowerCase() === record.gradeClass.trim().toLowerCase())
      );
      if (matchByClass?.subjectCode && matchByClass.subjectCode.trim()) {
        return matchByClass.subjectCode.trim();
      }
      const matchSub = subjectSchedules.find(
        s => s.subject.trim().toLowerCase() === record.subject?.trim().toLowerCase()
      );
      if (matchSub?.subjectCode && matchSub.subjectCode.trim()) {
        return matchSub.subjectCode.trim();
      }
      const subClean = record.subject.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
      const classClean = record.gradeClass ? record.gradeClass.replace(/[^A-Za-z0-9]/g, '') : '';
      return classClean ? `${subClean}-${classClean}` : `${subClean}-01`;
    }
    const teacherSchedules = subjectSchedules.filter(s => s.teacherId === record.personId);
    if (teacherSchedules.length > 0 && teacherSchedules[0].subjectCode) {
      return teacherSchedules[0].subjectCode;
    }
    return '';
  };

  const isAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'supervisor' ||
    (!['teacher', 'employee'].includes(currentUser.role) && (hasPermission('attendance.delete') || hasPermission('attendance.view')));

  const canDeleteAttendance =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'supervisor' ||
    hasPermission('attendance.delete');

  // Selected Attendance Records for deletion
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
  const [recordToDeleteSingle, setRecordToDeleteSingle] = useState<AttendanceRecord | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Substitute modal state
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteTargetSchedule, setSubstituteTargetSchedule] = useState<TeacherSubjectSchedule | null>(null);
  const [substituteTargetExisting, setSubstituteTargetExisting] = useState<ScheduleSubstitution | null>(null);
  const [substituteTargetDate, setSubstituteTargetDate] = useState<string>(AttendanceEngine.getCurrentDateString());

  const handleOpenSubstituteForRecord = (record: AttendanceRecord) => {
    const schedId = record.subjectScheduleId || record.scheduleId;
    let targetSched = subjectSchedules.find(s => s.id === schedId);
    if (!targetSched) {
      targetSched = subjectSchedules.find(
        s => (s.teacherId === record.personId || s.teacherName?.toLowerCase() === record.personName?.toLowerCase()) &&
             (!record.subject || s.subject.toLowerCase() === record.subject.toLowerCase())
      );
    }
    const finalSched: TeacherSubjectSchedule = targetSched || {
      id: schedId || `sched-${record.personId}-${Date.now()}`,
      teacherId: record.personId,
      teacherName: record.personName,
      khmerTeacherName: record.khmerName,
      subject: record.subject || 'Class Session',
      khmerSubject: record.khmerSubject || '',
      subjectCode: getSubjectCode(record) || 'SUB-01',
      gradeClass: record.gradeClass || 'General',
      room: record.room || 'Main Room',
      periodNumber: 1,
      periodName: record.periodName || 'Session',
      dayOfWeek: new Date(record.date).getDay(),
      startTime: record.scheduledStart || record.checkInTime || '07:30',
      endTime: record.scheduledEnd || record.checkOutTime || '09:00',
      gracePeriodMinutes: 15,
      hourlyRate: 20,
      isActive: true
    };
    setSubstituteTargetSchedule(finalSched);
    setSubstituteTargetDate(record.date);
    const existing = StorageService.findSubstitution(finalSched.id, record.date);
    setSubstituteTargetExisting(existing || null);
    setIsSubstituteModalOpen(true);
  };

  const handleClearAllAttendance = async () => {
    try {
      setIsClearing(true);
      const deletedCount = await StorageService.clearAllAttendance();
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Cleared All Attendance Records',
        target: `All Attendance (${deletedCount} records deleted)`,
        ipAddress: '127.0.0.1'
      });
      showToast(
        isKhmer
          ? `បានសម្អាតកំណត់ត្រាវត្តមានទាំងអស់ (${deletedCount} កំណត់ត្រា) ដោយជោគជ័យ!`
          : `Successfully cleared all ${deletedCount} attendance records!`,
        'success'
      );
      setIsClearAllModalOpen(false);
      setClearConfirmText('');
      setSelectedRecordIds(new Set());
    } catch (err) {
      showToast('Failed to clear attendance: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Filter daily attendance
  const filteredAttendance = useMemo(() => {
    const isTeacherOrEmployee = currentUser.role === 'teacher' || currentUser.role === 'employee';
    return attendanceList.filter(record => {
      // Date filter
      if (selectedDate && record.date !== selectedDate) return false;

      // Teacher must only see owned attendance
      if (isTeacherOrEmployee) {
        const isOwned =
          (currentUser.personId && record.personId === currentUser.personId) ||
          record.personId === currentUser.id ||
          record.personName.toLowerCase() === currentUser.fullName.toLowerCase();
        if (!isOwned) return false;
      } else {
        // Supervisor department check
        if (!canAccessDepartment(record.department)) return false;
        // Dropdown department
        if (selectedDept !== 'All' && record.department !== selectedDept) return false;
      }

      // Status
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Absent') {
          if (record.status !== 'Absent' && record.status !== 'Leave') return false;
        } else if (record.status !== selectedStatus) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = getSubjectCode(record).toLowerCase();
        const matchCode = code.includes(q);
        const matchSubject = (record.subject || '').toLowerCase().includes(q);
        const matchClass = (record.gradeClass || '').toLowerCase().includes(q);
        const isTeacher = isTeacherRecord(record);
        const matchName = (isAdmin || !isTeacher) && record.personName.toLowerCase().includes(q);
        const matchKhmer = (isAdmin || !isTeacher) && (record.khmerName || '').toLowerCase().includes(q);
        if (!matchCode && !matchSubject && !matchClass && !matchName && !matchKhmer) return false;
      }
      return true;
    });
  }, [attendanceList, selectedDate, selectedDept, selectedStatus, searchQuery, canAccessDepartment, currentUser, subjectSchedules, isAdmin]);

  // Selection state helpers
  const isAllVisibleSelected = useMemo(() => {
    if (filteredAttendance.length === 0) return false;
    return filteredAttendance.every(r => selectedRecordIds.has(r.id));
  }, [filteredAttendance, selectedRecordIds]);

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedRecordIds(prev => {
        const next = new Set(prev);
        filteredAttendance.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedRecordIds(prev => {
        const next = new Set(prev);
        filteredAttendance.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedRecordIds(new Set());
  };

  const selectedRecordsList = useMemo(() => {
    if (recordToDeleteSingle) return [recordToDeleteSingle];
    return attendanceList.filter(r => selectedRecordIds.has(r.id));
  }, [attendanceList, selectedRecordIds, recordToDeleteSingle]);

  const handleConfirmDelete = async () => {
    const idsToDelete = recordToDeleteSingle ? [recordToDeleteSingle.id] : Array.from(selectedRecordIds);
    if (idsToDelete.length === 0) return;

    try {
      setIsDeletingSelected(true);
      const deletedCount = await StorageService.deleteAttendanceRecords(idsToDelete);

      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted Attendance Records',
        target: `${deletedCount} attendance record(s)`,
        details: recordToDeleteSingle
          ? `Deleted attendance record of ${recordToDeleteSingle.personName} for ${recordToDeleteSingle.date} (${recordToDeleteSingle.subject || recordToDeleteSingle.department})`
          : `Batch deleted ${deletedCount} selected attendance record(s)`,
        ipAddress: '127.0.0.1'
      });

      showToast(
        isKhmer
          ? `បានលុបកំណត់ត្រាវត្តមានចំនួន ${deletedCount} ដោយជោគជ័យ!`
          : `Successfully deleted ${deletedCount} selected attendance record(s)!`,
        'success'
      );

      setSelectedRecordIds(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
      setIsDeleteSelectedModalOpen(false);
      setRecordToDeleteSingle(null);
    } catch (err) {
      showToast(
        'Failed to delete attendance: ' + (err instanceof Error ? err.message : String(err)),
        'error'
      );
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Filter corrections
  const filteredCorrections = useMemo(() => {
    const isTeacherOrEmployee = currentUser.role === 'teacher' || currentUser.role === 'employee';
    return corrections.filter(c => {
      if (isTeacherOrEmployee) {
        const isOwned =
          (currentUser.personId && c.personId === currentUser.personId) ||
          c.personId === currentUser.id ||
          c.personName.toLowerCase() === currentUser.fullName.toLowerCase();
        if (!isOwned) return false;
      } else {
        if (!canAccessDepartment(c.department)) return false;
      }
      return true;
    });
  }, [corrections, canAccessDepartment, currentUser]);

  const pendingCorrectionsCount = filteredCorrections.filter(c => c.status === 'Pending').length;

  // Handle Submit new correction request
  const handleSubmitCorrection = (req: AttendanceCorrectionRequest) => {
    StorageService.addCorrection(req);
    const matchedAtt = attendanceList.find(a => a.id === req.attendanceId);
    const isTeacherReq =
      Boolean(matchedAtt && isTeacherRecord(matchedAtt)) ||
      teachers.some(t => t.id === req.personId || t.fullName?.toLowerCase() === req.personName?.toLowerCase()) ||
      subjectSchedules.some(s => s.teacherId === req.personId || s.teacherName?.toLowerCase() === req.personName?.toLowerCase());
    const displayLabel = isTeacherReq
      ? (isAdmin
          ? `${req.personName} (${matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'SUB')})`
          : (matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'Subject Code')))
      : req.personName;

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Submitted Attendance Correction',
      target: `${displayLabel} for ${req.date}`,
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

    const matchedAtt = attendanceList.find(a => a.id === req.attendanceId);
    const isTeacherReq =
      Boolean(matchedAtt && isTeacherRecord(matchedAtt)) ||
      teachers.some(t => t.id === req.personId || t.fullName?.toLowerCase() === req.personName?.toLowerCase()) ||
      subjectSchedules.some(s => s.teacherId === req.personId || s.teacherName?.toLowerCase() === req.personName?.toLowerCase());
    const displayLabel = isTeacherReq
      ? (isAdmin
          ? `${req.personName} (${matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'SUB')})`
          : (matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'Subject Code')))
      : req.personName;

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Approved Attendance Correction',
      target: `${displayLabel} (${req.date})`,
      newValue: 'Approved',
      ipAddress: '127.0.0.1'
    });

    showToast(`Approved correction for ${displayLabel}`, 'success');
  };

  // Reject Correction
  const handleRejectCorrection = (req: AttendanceCorrectionRequest) => {
    StorageService.updateCorrection(req.id, {
      status: 'Rejected',
      reviewedBy: currentUser.fullName,
      reviewedAt: new Date().toISOString()
    });

    const matchedAtt = attendanceList.find(a => a.id === req.attendanceId);
    const isTeacherReq =
      Boolean(matchedAtt && isTeacherRecord(matchedAtt)) ||
      teachers.some(t => t.id === req.personId || t.fullName?.toLowerCase() === req.personName?.toLowerCase()) ||
      subjectSchedules.some(s => s.teacherId === req.personId || s.teacherName?.toLowerCase() === req.personName?.toLowerCase());
    const displayLabel = isTeacherReq
      ? (isAdmin
          ? `${req.personName} (${matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'SUB')})`
          : (matchedAtt ? getSubjectCode(matchedAtt) : (subjectSchedules.find(s => s.teacherId === req.personId)?.subjectCode || 'Subject Code')))
      : req.personName;

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Rejected Attendance Correction',
      target: `${displayLabel} (${req.date})`,
      newValue: 'Rejected',
      ipAddress: '127.0.0.1'
    });

    showToast(`Rejected correction request for ${displayLabel}`, 'info');
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

  const missingCheckoutsCount = useMemo(() => {
    return attendanceList.filter(r => Boolean(r.checkInTime) && !r.checkOutTime).length;
  }, [attendanceList]);

  const handleRunAutoCheckOut = () => {
    const res = StorageService.processAutoCheckOut();
    if (res.processedCount > 0) {
      showToast(
        isKhmer
          ? `បានកត់ត្រាម៉ោងចេញស្វ័យប្រវត្តិជោគជ័យ ${res.processedCount} កំណត់ត្រា!`
          : `Auto check-out engine resolved ${res.processedCount} missing check-out schedule(s)!`,
        'success'
      );
    } else {
      showToast(
        isKhmer
          ? 'ពុំមានកាលវិភាគដែលហួសពេលខកខានស្កេនចេញនៅពេលនេះទេ'
          : 'No overdue missing check-out schedules found at this moment.',
        'info'
      );
    }
  };

  return (
    <div className="space-y-6 max-w-full min-w-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {currentUser.role === 'employee'
                ? (isKhmer ? 'ប្រវត្តិវត្តមានបុគ្គលិក (Staff Check-in History)' : 'Staff Check-in History')
                : 'Attendance Records & Corrections'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            {currentUser.role === 'employee'
              ? (isKhmer ? `កំណត់ត្រាស្កេនចូល-ចេញផ្ទាល់ខ្លួនរបស់ ${currentUser.fullName}` : `Personal check-in and check-out records for ${currentUser.fullName}`)
              : 'បញ្ជីកត់ត្រាវត្តមានប្រចាំថ្ងៃ ការគណនាការយឺតយ៉ាវ និងការអនុម័តកែសម្រួលម៉ោង'}
          </p>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-w-full">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                activeTab === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {currentUser.role === 'employee' ? (isKhmer ? 'ប្រវត្តិវត្តមាន' : 'History Log') : (isKhmer ? 'វត្តមានប្រចាំថ្ងៃ' : 'Daily Roster')}
            </button>
            <button
              onClick={() => setActiveTab('period_grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'period_grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{isKhmer ? 'វត្តមានតាមម៉ោង' : 'Period Header'}</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'monthly_sheet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{isKhmer ? 'តារាង ៣១ ថ្ងៃ' : '31 Days Records'}</span>
            </button>
            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'corrections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{isKhmer ? 'សំណើកែសម្រួល' : 'Correction Requests'}</span>
              {pendingCorrectionsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCorrectionsCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Admin Auto Check-Out Button */}
            {isAdmin && (
              <button
                onClick={handleRunAutoCheckOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors shadow-xs cursor-pointer active:scale-95 shrink-0"
                title={isKhmer ? 'ដំណើរការកត់ត្រាម៉ោងចេញស្វ័យប្រវត្តសម្រាប់អ្នកដែលខកខាន' : 'Run Auto Check-Out for Missing Schedules'}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>{isKhmer ? 'កត់ត្រាចេញស្វ័យប្រវត្តិ' : 'Auto Check-Out Engine'}</span>
                {missingCheckoutsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                    {missingCheckoutsCount}
                  </span>
                )}
              </button>
            )}

            {/* Admin Clear All Attendance Button */}
            {isAdmin && (
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 transition-colors shadow-xs cursor-pointer active:scale-95 shrink-0"
                title={isKhmer ? 'សម្អាតវត្តមានទាំងអស់ចេញពីប្រព័ន្ធ' : 'Clear all attendance records from database'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isKhmer ? 'សម្អាតវត្តមានទាំងអស់' : 'Clear All Attendance'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedRecordForCorrection(null);
                setIsCorrectionModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Request Correction</span>
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Owned Attendance Security Banner */}
      {(currentUser.role === 'teacher' || currentUser.role === 'employee') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:p-4 bg-indigo-50/90 rounded-2xl border border-indigo-200 text-indigo-950 text-xs max-w-full min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold">
                {isKhmer ? 'កំណត់ត្រាវត្តមានផ្ទាល់ខ្លួន៖ ' : 'Owned Attendance History: '}
              </span>
              <span className="text-slate-600">
                {isKhmer
                  ? `បង្ហាញកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ ${currentUser.fullName} ប៉ុណ្ណោះ។ មិនអនុញ្ញាតឱ្យផ្លាស់ប្តូរ ឬមើលគ្រូដទៃឡើយ។`
                  : `Showing records for ${currentUser.fullName} only. Viewing or altering other faculty records is strictly disabled.`}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-200 text-indigo-900 uppercase tracking-wide shrink-0 self-start sm:self-auto">
            {isKhmer ? 'វត្តមានផ្ទាល់ខ្លួន' : 'Owned Only'}
          </span>
        </div>
      )}

      {/* Tab 1: Daily Attendance Roster */}
      {activeTab === 'daily' && (
        <div className="space-y-4 max-w-full min-w-0">
          
          {/* Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-full min-w-0">
            
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  isKhmer
                    ? (isAdmin ? "ស្វែងរកតាមឈ្មោះគ្រូ លេខកូដមុខវិជ្ជា..." : "ស្វែងរកតាមលេខកូដមុខវិជ្ជា (Subject Code)...")
                    : (isAdmin ? "Search teacher name, subject code, class..." : "Search Subject Code, class, staff...")
                }
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

              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isKhmer ? 'មើលទាំងអស់ (All)' : 'All Dates'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                >
                  {isKhmer ? 'ថ្ងៃនេះ (Today)' : 'Today'}
                </button>
              )}

              {currentUser.role !== 'teacher' && currentUser.role !== 'employee' && (
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
              )}

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

          {/* Bulk Action Bar for Selected Records */}
          {canDeleteAttendance && selectedRecordIds.size > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-rose-500/10 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {selectedRecordIds.size}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-rose-950">
                    {isKhmer ? `បានជ្រើសរើស ${selectedRecordIds.size} កំណត់ត្រាវត្តមាន` : `${selectedRecordIds.size} Attendance Record(s) Selected`}
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium">
                    {isKhmer ? 'អ្នកគ្រប់គ្រងអាចលុបកំណត់ត្រាដែលបានជ្រើសរើសទាំងអស់នេះចេញពីប្រព័ន្ធ' : 'Admin can permanently remove all selected attendance records from the system.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់ (Deselect)' : 'Deselect All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordToDeleteSingle(null);
                    setIsDeleteSelectedModalOpen(true);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isKhmer ? `លុបកំណត់ត្រា (${selectedRecordIds.size})` : `Delete Selected (${selectedRecordIds.size})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Attendance Records Table matching screenshot style */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200/90 text-sm font-bold text-slate-700 bg-white">
                    {canDeleteAttendance && (
                      <th className="py-4 px-3 sm:px-4 w-[46px] text-center">
                        <input
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={handleToggleSelectAll}
                          title={isAllVisibleSelected ? "Deselect all visible" : "Select all visible"}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer align-middle"
                        />
                      </th>
                    )}
                    <th className="py-4 px-4 sm:px-6 w-[34%] sm:w-[32%]">{isKhmer ? 'កាលបរិច្ឆេទ (Date)' : 'Date'}</th>
                    <th className="py-4 px-3 sm:px-5 w-[38%] sm:w-[44%]">{isKhmer ? 'ម៉ោងស្កេន (Timing)' : 'Timing'}</th>
                    <th className="py-4 px-4 sm:px-6 w-[24%] sm:w-[20%] text-right">{isKhmer ? 'រយៈពេល (Duration)' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-xs sm:text-sm">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={canDeleteAttendance ? 4 : 3} className="py-16 text-center text-slate-400 text-xs sm:text-sm">
                        {isKhmer ? `ពុំមានកំណត់ត្រាវត្តមានសម្រាប់កាលបរិច្ឆេទ ${selectedDate || 'ដែលបានជ្រើសរើស'}` : `No attendance records found for ${selectedDate || 'selected criteria'}.`}
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(record => {
                      const dateInfo = formatScreenshotDate(record.date);
                      const config = getAttendanceRowConfig(record);
                      const isTeacher = isTeacherRecord(record);
                      const subjectCode = isTeacher ? (getSubjectCode(record) || 'SUB-01') : '';
                      const isSelected = selectedRecordIds.has(record.id);

                      return (
                        <tr key={record.id} className={`${isSelected ? 'bg-rose-50/70 border-l-4 border-l-rose-500' : config.rowBg} transition-colors border-b border-slate-100/60`}>
                          {/* Selection Checkbox */}
                          {canDeleteAttendance && (
                            <td className="py-3.5 px-3 sm:px-4 align-middle text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRecord(record.id)}
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer align-middle"
                              />
                            </td>
                          )}

                          {/* Date Column */}
                          <td className="py-3.5 px-4 sm:px-6 align-middle">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 shadow-2xs ${config.circleBg}`}>
                                {config.letter}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs sm:text-sm font-semibold tracking-tight block ${config.dateTextColor}`}>
                                  {dateInfo.full}
                                </span>
                                <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {isTeacher ? (
                                    isAdmin ? (
                                      <>
                                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                                          {record.personName}
                                        </span>
                                        {record.khmerName && (
                                          <span className="text-slate-400 text-[10px] hidden md:inline">
                                            ({record.khmerName})
                                          </span>
                                        )}
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-wider shadow-2xs">
                                          {subjectCode}
                                        </span>
                                        {record.subject && (
                                          <span className="hidden sm:inline text-slate-600 font-medium truncate">
                                            • {record.subject} {record.gradeClass ? `(${record.gradeClass})` : ''}
                                          </span>
                                        )}
                                        {record.room && (
                                          <span className="hidden sm:inline text-slate-400 text-[10px]">
                                            • {record.room}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-wider shadow-2xs">
                                          {subjectCode}
                                        </span>
                                        {record.subject && (
                                          <span className="hidden sm:inline text-slate-600 font-medium truncate">
                                            {record.subject} {record.gradeClass ? `(${record.gradeClass})` : ''}
                                          </span>
                                        )}
                                        {record.room && (
                                          <span className="hidden sm:inline text-slate-400 text-[10px]">
                                            • {record.room}
                                          </span>
                                        )}
                                      </>
                                    )
                                  ) : (
                                    <>
                                      <span className="font-semibold text-slate-600">{record.personName}</span>
                                      {record.department && <span> • {record.department}</span>}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Timing Column */}
                          <td className="py-3.5 px-3 sm:px-5 align-middle">
                            {config.timingType === 'leave' ? (
                              <div className="text-xs sm:text-sm font-semibold text-[#e11d48]">
                                {config.timingTitle}
                              </div>
                            ) : config.timingType === 'off' ? (
                              <div className="text-xs sm:text-sm font-semibold text-[#a855f7]">
                                {config.timingTitle}
                              </div>
                            ) : config.timingType === 'privilege' ? (
                              <div className="space-y-0.5">
                                <div className="text-xs sm:text-sm font-semibold text-[#0ea5e9]">
                                  {config.timingTitle}
                                </div>
                                <div className="text-xs sm:text-sm font-medium text-slate-700">
                                  {config.timingSub}
                                </div>
                              </div>
                            ) : config.timingType === 'missing' ? (
                              <div className="space-y-0.5">
                                <div className="text-xs sm:text-sm font-semibold text-amber-700">
                                  {config.timingTitle}
                                </div>
                                <div className="text-xs sm:text-sm font-medium text-slate-600 font-mono">
                                  {config.timingSub}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {config.hasEarlyLate && <EarlyLateBadge />}
                                <span className="text-xs sm:text-sm font-medium text-slate-700 tracking-tight">
                                  {config.timingSub}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Duration Column */}
                          <td className="py-3.5 px-4 sm:px-6 align-middle text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className={`text-xs sm:text-sm font-semibold tracking-tight ${config.durationColor}`}>
                                {config.duration}
                              </span>
                              {/* Admin Assign Substitute Button for absent teacher */}
                              {isAdmin && isTeacher && (record.status === 'Absent' || record.status === 'Leave') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubstituteForRecord(record)}
                                  className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 text-[11px] font-bold border border-purple-200 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                                  title={isKhmer ? 'ចាត់តាំងគ្រូ ឬបុគ្គលិកជំនួស (គ្រូដើមអវត្តមាន)' : 'Assign Teacher or Staff Substitute'}
                                >
                                  <UserPlus className="w-3 h-3 text-purple-600" />
                                  <span className="hidden sm:inline">{isKhmer ? 'ជំនួស' : 'Sub'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordForCorrection(record);
                                  setIsCorrectionModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 text-[11px] font-bold border border-slate-200/80 transition-all opacity-80 hover:opacity-100 shrink-0 cursor-pointer"
                                title={isKhmer ? 'កែសម្រួល' : 'Request Correction'}
                              >
                                {isKhmer ? 'កែ' : 'Edit'}
                              </button>
                              {canDeleteAttendance && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecordToDeleteSingle(record);
                                    setIsDeleteSelectedModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-[11px] font-bold border border-rose-200 transition-all opacity-85 hover:opacity-100 shrink-0 flex items-center gap-1 cursor-pointer"
                                  title={isKhmer ? 'លុបកំណត់ត្រានេះ' : 'Delete Record'}
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span className="hidden sm:inline">{isKhmer ? 'លុប' : 'Delete'}</span>
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

            <div className="p-4 bg-slate-50/90 border-t border-slate-200/90 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span>Total records for {selectedDate || 'all dates'}: <b>{filteredAttendance.length}</b></span>
                {canDeleteAttendance && selectedRecordIds.size > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 text-[11px] font-extrabold border border-rose-200">
                    {selectedRecordIds.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#00a86b]" /> Present</span>
                <span className="flex items-center gap-1"><EarlyLateBadge className="w-3.5 h-3.5" /> Early/Late</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" /> On Leave</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Privilege / Half Day</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> Weekly Off</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Period Header Attendance Grid */}
      {activeTab === 'period_grid' && (
        <AttendancePeriodGrid
          onRequestCorrection={(partialRecord) => {
            setSelectedRecordForCorrection(partialRecord as any);
            setIsCorrectionModalOpen(true);
          }}
        />
      )}

      {/* Tab: 31 Days Header Attendance Records Sheet */}
      {activeTab === 'monthly_sheet' && (
        <Attendance31DaysSheet
          onRequestCorrection={(partialRecord) => {
            setSelectedRecordForCorrection(partialRecord as any);
            setIsCorrectionModalOpen(true);
          }}
        />
      )}

      {/* Tab 2: Attendance Corrections Queue */}
      {activeTab === 'corrections' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Attendance Adjustment & Correction Requests</h3>
              <p className="text-xs text-slate-500">
                Staff submissions for missed scans, faulty scanners, or official off-campus duty
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
              {pendingCorrectionsCount} Pending Review
            </span>
          </div>

          {/* Corrections Table matching screenshot style */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200/90 text-sm font-bold text-slate-700 bg-white">
                    <th className="py-4 px-4 sm:px-6 w-[36%] sm:w-[32%]">{isKhmer ? 'កាលបរិច្ឆេទ (Date)' : 'Date'}</th>
                    <th className="py-4 px-3 sm:px-5 w-[42%] sm:w-[48%]">{isKhmer ? 'ម៉ោងស្នើសុំ (Timing)' : 'Timing'}</th>
                    <th className="py-4 px-4 sm:px-6 w-[22%] sm:w-[20%] text-right">{isKhmer ? 'ស្ថានភាព / រយៈពេល (Duration)' : 'Duration & Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-xs sm:text-sm">
                  {filteredCorrections.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center text-slate-400 text-xs sm:text-sm">
                        No correction requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredCorrections.map(req => {
                      const dateInfo = formatScreenshotDate(req.date);
                      const reqIn = format12HourTime(req.requestedCheckIn);
                      const reqOut = format12HourTime(req.requestedCheckOut);
                      const timingStr = (reqIn && reqOut) ? `${reqIn} - ${reqOut}` : (reqIn ? `${reqIn} - --:--` : '--:-- - ' + reqOut);
                      const dur = calculateDurationString(req.requestedCheckIn, req.requestedCheckOut);

                      const isPending = req.status === 'Pending';
                      const isApproved = req.status === 'Approved';
                      const isRejected = req.status === 'Rejected';

                      const rowBg = isPending
                        ? 'bg-[#fffbeb] hover:bg-[#fef3c7]'
                        : isApproved
                        ? 'bg-[#f0fdf4] hover:bg-[#dcfce7]'
                        : 'bg-[#fff0f2] hover:bg-[#ffe4e9]';

                      const circleBg = isPending ? 'bg-[#f59e0b]' : isApproved ? 'bg-[#00a86b]' : 'bg-[#e11d48]';
                      const circleLetter = isPending ? 'P' : isApproved ? 'A' : 'R';
                      const dateTextColor = isRejected ? 'text-[#e11d48]' : 'text-slate-800';

                      const matchedAtt = attendanceList.find(a => a.id === req.attendanceId);
                      const isTeacherReq =
                        teachers.some(t => t.id === req.personId || t.fullName?.toLowerCase() === req.personName?.toLowerCase()) ||
                        Boolean(matchedAtt && isTeacherRecord(matchedAtt)) ||
                        subjectSchedules.some(s => s.teacherId === req.personId || s.teacherName?.toLowerCase() === req.personName?.toLowerCase());
                      const reqSubjectCode = matchedAtt
                        ? (getSubjectCode(matchedAtt) || 'SUB-01')
                        : (subjectSchedules.find(s => s.teacherId === req.personId || s.teacherName?.toLowerCase() === req.personName?.toLowerCase())?.subjectCode || 'SUB-01');

                      return (
                        <tr key={req.id} className={`${rowBg} transition-colors border-b border-slate-100/60`}>
                          {/* Date Column */}
                          <td className="py-3.5 px-4 sm:px-6 align-middle">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 shadow-2xs ${circleBg}`}>
                                {circleLetter}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs sm:text-sm font-semibold tracking-tight block ${dateTextColor}`}>
                                  {dateInfo.full}
                                </span>
                                <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {isTeacherReq ? (
                                    isAdmin ? (
                                      <>
                                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                                          {req.personName}
                                        </span>
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-wider shadow-2xs">
                                          {reqSubjectCode}
                                        </span>
                                        {matchedAtt?.subject ? (
                                          <span className="hidden sm:inline text-slate-600 font-medium truncate">
                                            • {matchedAtt.subject} {matchedAtt.gradeClass ? `(${matchedAtt.gradeClass})` : ''}
                                          </span>
                                        ) : (
                                          <span className="hidden sm:inline text-slate-600 font-medium">• {req.department}</span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-wider shadow-2xs">
                                          {reqSubjectCode}
                                        </span>
                                        {matchedAtt?.subject ? (
                                          <span className="hidden sm:inline text-slate-600 font-medium truncate">
                                            {matchedAtt.subject} {matchedAtt.gradeClass ? `(${matchedAtt.gradeClass})` : ''}
                                          </span>
                                        ) : (
                                          <span className="hidden sm:inline text-slate-600 font-medium">{req.department}</span>
                                        )}
                                      </>
                                    )
                                  ) : (
                                    <>
                                      <span className="font-semibold text-slate-700">{req.personName}</span>
                                      {req.department && <span> • {req.department}</span>}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Timing Column */}
                          <td className="py-3.5 px-3 sm:px-5 align-middle">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-medium text-slate-800 font-mono">
                                  {timingStr}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60 inline-block max-w-md truncate">
                                <span className="font-bold text-slate-700">Reason:</span> {req.reason}
                                {req.supportingNote && <span className="text-slate-500 ml-1">({req.supportingNote})</span>}
                              </div>
                              {req.reviewedBy && (
                                <div className="text-[10px] text-slate-400">
                                  Reviewed by {req.reviewedBy} at {req.reviewedAt?.slice(0, 16)}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Duration & Actions Column */}
                          <td className="py-3.5 px-4 sm:px-6 align-middle text-right">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2.5">
                              <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-700">
                                {dur}
                              </span>

                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                                isPending ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {req.status}
                              </span>

                              {/* Supervisor / Admin approval buttons */}
                              {isPending && hasPermission('attendance.approve') && (
                                <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveCorrection(req)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                                    title="Approve"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span className="hidden sm:inline">Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectCorrection(req)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1"
                                    title="Reject"
                                  >
                                    <X className="w-3 h-3" />
                                    <span className="hidden sm:inline">Reject</span>
                                  </button>
                                </div>
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

      {/* Admin Clear All Attendance Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {isKhmer ? 'សម្អាតវត្តមានទាំងអស់' : 'Clear All Attendance'}
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    {isKhmer ? 'សកម្មភាពអភិបាលប្រព័ន្ធ • មិនអាចត្រឡប់វិញបានទេ' : 'Administrative Wipe • Irreversible'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isClearing) {
                    setIsClearAllModalOpen(false);
                    setClearConfirmText('');
                  }
                }}
                disabled={isClearing}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {isKhmer
                      ? `កំណត់ត្រាវត្តមានសរុបបច្ចុប្បន្ន៖ ${attendanceList.length} កំណត់ត្រា`
                      : `Current Attendance Records in Database: ${attendanceList.length}`}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {isKhmer
                    ? 'ការបញ្ជាក់សកម្មភាពនេះ នឹងលុបកំណត់ត្រាវត្តមានទាំងអស់របស់គ្រូបង្រៀន និងបុគ្គលិកចេញពីប្រព័ន្ធ និង Cloud Firestore ជាអចិន្ត្រៃយ៍។'
                    : 'This action will permanently delete all attendance records (check-ins, check-outs, GPS location logs, late records) from both local cache and Cloud Firestore.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isKhmer
                    ? 'សូមវាយពាក្យ "CLEAR" ដើម្បីបញ្ជាក់ការសម្អាត៖'
                    : 'Please type "CLEAR" to confirm deletion:'}
                </label>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={e => setClearConfirmText(e.target.value.toUpperCase())}
                  placeholder="CLEAR"
                  disabled={isClearing}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-sm font-black uppercase focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsClearAllModalOpen(false);
                    setClearConfirmText('');
                  }}
                  disabled={isClearing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllAttendance}
                  disabled={isClearing || clearConfirmText !== 'CLEAR'}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isClearing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isKhmer ? 'កំពុងសម្អាត...' : 'Clearing...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'យល់ព្រមសម្អាតទាំងអស់' : 'Confirm Clear All Attendance'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Selected Attendance Modal */}
      {isDeleteSelectedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {isKhmer
                      ? (recordToDeleteSingle ? 'បញ្ជាក់ការលុបកំណត់ត្រាវត្តមាន' : `បញ្ជាក់ការលុប ${selectedRecordIds.size} កំណត់ត្រាវត្តមាន`)
                      : (recordToDeleteSingle ? 'Confirm Attendance Record Deletion' : `Confirm Delete of ${selectedRecordIds.size} Attendance Record(s)`)}
                  </h3>
                  <p className="text-xs text-rose-100">
                    {isKhmer ? 'សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ' : 'This action is permanent and cannot be undone'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingSelected) {
                    setIsDeleteSelectedModalOpen(false);
                    setRecordToDeleteSingle(null);
                  }
                }}
                disabled={isDeletingSelected}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {isKhmer
                      ? `ចំនួនកំណត់ត្រាដែលត្រូវលុប៖ ${selectedRecordsList.length} កំណត់ត្រា`
                      : `Selected Record(s) to Delete: ${selectedRecordsList.length}`}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {isKhmer
                    ? 'កំណត់ត្រាវត្តមានដែលបានជ្រើសរើស (ម៉ោងស្កេនចូល-ចេញ ស្ថានភាព និងទិន្នន័យពាក់ព័ន្ធ) នឹងត្រូវលុបចេញពីប្រព័ន្ធ និង Cloud Firestore។'
                    : 'The selected record(s) including clock-in/out timestamps and attendance status will be removed from local storage and Cloud Firestore.'}
                </p>
              </div>

              {/* Records preview list */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {isKhmer ? 'កំណត់ត្រាដែលនឹងត្រូវលុប៖' : 'Records to be deleted:'}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {selectedRecordsList.slice(0, 15).map(r => (
                    <div key={r.id} className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {r.personName} {r.khmerName ? `(${r.khmerName})` : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {r.date} • {r.checkInTime || r.scheduledStart} - {r.checkOutTime || r.scheduledEnd || '--:--'}
                          {r.subject ? ` • ${r.subject}` : (r.department ? ` • ${r.department}` : '')}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                        {r.status}
                      </span>
                    </div>
                  ))}
                  {selectedRecordsList.length > 15 && (
                    <div className="text-center text-[10px] text-slate-500 py-1 font-bold">
                      + and {selectedRecordsList.length - 15} more records...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteSelectedModalOpen(false);
                    setRecordToDeleteSingle(null);
                  }}
                  disabled={isDeletingSelected}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingSelected || selectedRecordsList.length === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isDeletingSelected ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isKhmer ? 'កំពុងលុប...' : 'Deleting...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {isKhmer
                          ? `លុបជាអចិន្ត្រៃយ៍ (${selectedRecordsList.length})`
                          : `Permanently Delete (${selectedRecordsList.length})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Substitute Assignment Modal */}
      {isSubstituteModalOpen && (
        <ScheduleSubstituteModal
          isOpen={isSubstituteModalOpen}
          onClose={() => {
            setIsSubstituteModalOpen(false);
            setSubstituteTargetSchedule(null);
            setSubstituteTargetExisting(null);
          }}
          schedule={substituteTargetSchedule}
          selectedDate={substituteTargetDate}
          teachers={teachers}
          employees={employees}
          currentUser={currentUser}
          existingSubstitution={substituteTargetExisting}
          onSuccess={() => {
            setAttendanceList(StorageService.getAttendance());
          }}
        />
      )}

    </div>
  );
}