import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { Schedule, ScheduleTargetType, TeacherSubjectSchedule, TimetablePeriod, Department, WorkLocation, Teacher } from '../../types/index.ts';
import {
  CalendarDays,
  Plus,
  Clock,
  ClockAlert,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  Users,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  BookOpen,
  GraduationCap,
  Search,
  Filter,
  Check,
  Palette,
  Sparkles,
  Upload,
  Sliders,
  LogIn,
  LogOut,
  Lock,
  Table,
  LayoutGrid,
  ArrowUpDown,
  Layers,
  List,
  RefreshCw,
  QrCode,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ImportTeacherScheduleModal } from './ImportTeacherScheduleModal.tsx';
import { MonSatWeeklyTimetable } from './MonSatWeeklyTimetable.tsx';
import { PeriodManagementModal } from './PeriodManagementModal.tsx';
import { AcademicDatesModal } from './AcademicDatesModal.tsx';
import { TeacherMonthlyCalendar } from './TeacherMonthlyCalendar.tsx';
import { ScheduleQRCodeModal } from './ScheduleQRCodeModal.tsx';
import { ScheduleQRScanModal } from './ScheduleQRScanModal.tsx';
import { DailyScheduleTableView, DailySortColumn, DailyGroupMode } from './DailyScheduleTableView.tsx';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';

interface ScheduleManagementProps {
  initialView?: 'daily_schedule' | 'weekly_timetable' | 'monthly_calendar' | 'subject_schedules' | 'cards';
}

export const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ initialView }) => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { t, isKhmer } = useLanguage();

  const isTeacher = currentUser.role === 'teacher';
  const canAdminManageAttendance = currentUser.role === 'super_admin' || currentUser.role === 'admin_hr' || currentUser.role === 'supervisor' || hasPermission('attendance.edit') || hasPermission('schedules.create');
  const todayDayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(todayDayIndex);

  const [viewMode, setViewMode] = useState<'daily_schedule' | 'weekly_timetable' | 'monthly_calendar' | 'subject_schedules' | 'cards'>(
    () => initialView || 'daily_schedule'
  );

  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);
  const [dailyLayoutMode, setDailyLayoutMode] = useState<'table' | 'cards'>(() => (!isTeacher ? 'table' : 'cards'));
  const [dailyGroupMode, setDailyGroupMode] = useState<DailyGroupMode>('period');
  const [dailySortBy, setDailySortBy] = useState<DailySortColumn>('time');
  const [dailySortOrder, setDailySortOrder] = useState<'asc' | 'desc'>('asc');
  const [dailySearchQuery, setDailySearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Subject Schedules Management
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectSchedule, setEditingSubjectSchedule] = useState<TeacherSubjectSchedule | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('All');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');

  // Reactive state synced with StorageService
  const [schedules, setSchedules] = useState<Schedule[]>(() => StorageService.getSchedules());
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() => StorageService.getSubjectSchedules());
  const [periods, setPeriods] = useState<TimetablePeriod[]>(() => StorageService.getPeriods());
  const [teachers, setTeachers] = useState<Teacher[]>(() => StorageService.getTeachers().filter(t => t.status === 'Active'));
  const [departments, setDepartments] = useState<Department[]>(() => StorageService.getDepartments());
  const [locations, setLocations] = useState<WorkLocation[]>(() => StorageService.getLocations());
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSettings());
  const [isPeriodManageModalOpen, setIsPeriodManageModalOpen] = useState(false);
  const [isAcademicDatesModalOpen, setIsAcademicDatesModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [selectedScheduleForQR, setSelectedScheduleForQR] = useState<TeacherSubjectSchedule | null>(null);
  const [selectedTeacherForQR, setSelectedTeacherForQR] = useState<Teacher | null>(null);
  const [isQRScanModalOpen, setIsQRScanModalOpen] = useState(false);

  const systemGraceMinutes = useMemo(() => {
    return systemSettings?.defaultGracePeriodMinutes ?? systemSettings?.defaultGracePeriod ?? 15;
  }, [systemSettings]);

  // Identify teacher role and matching profile for owned-only schedule access
  const activeTeacher = useMemo(() => {
    if (!currentUser) return null;
    // 1. By linked personId
    if (currentUser.personId) {
      const byPersonId = teachers.find(
        t => t.id === currentUser.personId || t.teacherId?.toLowerCase() === currentUser.personId?.toLowerCase()
      );
      if (byPersonId) return byPersonId;
    }
    // 2. By email
    if (currentUser.email) {
      const byEmail = teachers.find(
        t => t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
    }
    // 3. By fullName
    if (currentUser.fullName) {
      const byName = teachers.find(
        t => t.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (byName) return byName;
    }
    return null;
  }, [currentUser, teachers]);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSchedules(StorageService.getSchedules());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setPeriods(StorageService.getPeriods());
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setDepartments(StorageService.getDepartments());
      setLocations(StorageService.getLocations());
      setSystemSettings(StorageService.getSettings());
    });
    return unsub;
  }, []);

  const [subjectFormData, setSubjectFormData] = useState<TeacherSubjectSchedule>(() => {
    const s = StorageService.getSettings();
    const g = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;
    const t = StorageService.getTeachers().find(x => x.status === 'Active');
    return {
      id: '',
      teacherId: t?.id || '',
      teacherName: t?.fullName || '',
      khmerTeacherName: t?.khmerName || '',
      subject: '',
      khmerSubject: '',
      subjectCode: '',
      gradeClass: 'Grade 12A',
      room: 'Room 201',
      dayOfWeek: 1,
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      periodNumber: 1,
      periodName: 'Period 1',
      startTime: '07:30',
      endTime: '09:00',
      gracePeriodMinutes: g,
      hourlyRate: t?.hourlyRate,
      color: '#4F46E5',
      isActive: true
    };
  });

  const selectedSubjectTeacher = useMemo(() => {
    return teachers.find(t => t.id === subjectFormData.teacherId);
  }, [teachers, subjectFormData.teacherId]);

  const [formData, setFormData] = useState<Schedule>(() => {
    const s = StorageService.getSettings();
    const g = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;
    return {
      id: '',
      name: '',
      department: 'Academic & Curriculum',
      targetType: 'Standard',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '07:30',
      endTime: '11:30',
      breakStart: '11:30',
      breakEnd: '13:30',
      afternoonStartTime: '13:30',
      afternoonEndTime: '17:00',
      gracePeriodMinutes: g,
      absenceDetectionMinutes: s.absenceDetectionMinutes ?? 60,
      requiredCheckIn: true,
      requiredCheckOut: true,
      location: 'Main Campus - Central Building',
      isActive: true,
      color: '#3B82F6'
    };
  });

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    const s = StorageService.getSettings();
    const defaultGrace = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;
    setFormData({
      id: `sch-${Date.now()}`,
      name: '',
      department: departments[0]?.name || 'Academic & Curriculum',
      targetType: 'Department',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '07:30',
      endTime: '11:30',
      afternoonStartTime: '13:30',
      afternoonEndTime: '17:00',
      gracePeriodMinutes: defaultGrace,
      absenceDetectionMinutes: s.absenceDetectionMinutes ?? 60,
      requiredCheckIn: true,
      requiredCheckOut: true,
      location: locations[0]?.name || 'Main Campus - Central Building',
      isActive: true,
      color: '#3B82F6'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sch: Schedule) => {
    setEditingSchedule(sch);
    const s = StorageService.getSettings();
    const defaultGrace = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;
    setFormData({
      ...sch,
      name: sch.name || '',
      department: sch.department || departments[0]?.name || 'Academic & Curriculum',
      targetType: sch.targetType || 'Standard',
      daysOfWeek: sch.daysOfWeek || [1, 2, 3, 4, 5],
      startTime: sch.startTime || '07:30',
      endTime: sch.endTime || '11:30',
      afternoonStartTime: sch.afternoonStartTime || '',
      afternoonEndTime: sch.afternoonEndTime || '',
      gracePeriodMinutes: sch.gracePeriodMinutes ?? defaultGrace,
      absenceDetectionMinutes: sch.absenceDetectionMinutes ?? s.absenceDetectionMinutes ?? 60,
      requiredCheckIn: sch.requiredCheckIn ?? true,
      requiredCheckOut: sch.requiredCheckOut ?? true,
      location: sch.location || locations[0]?.name || 'Main Campus - Central Building',
      isActive: sch.isActive ?? true,
      color: sch.color || '#3B82F6'
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSchedule) {
      StorageService.updateSchedule(formData.id, formData);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Updated Schedule',
        target: `${formData.name} (${formData.startTime}-${formData.endTime})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Updated schedule: ${formData.name}`, 'success');
    } else {
      StorageService.addSchedule(formData);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Created Schedule',
        target: `${formData.name}`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Created schedule: ${formData.name}`, 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (schedules.length <= 1) {
      showToast('Cannot delete the default primary schedule', 'error');
      return;
    }
    if (window.confirm(`Delete schedule "${name}"?`)) {
      StorageService.deleteSchedule(id);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted Schedule',
        target: name,
        ipAddress: '127.0.0.1'
      });
      showToast(`Deleted schedule ${name}`, 'info');
    }
  };

  const monToSatDays = [
    { index: 1, en: 'Mon', fullEn: 'Monday', km: 'ចន្ទ', fullKm: 'ថ្ងៃចន្ទ' },
    { index: 2, en: 'Tue', fullEn: 'Tuesday', km: 'អង្គារ', fullKm: 'ថ្ងៃអង្គារ' },
    { index: 3, en: 'Wed', fullEn: 'Wednesday', km: 'ពុធ', fullKm: 'ថ្ងៃពុធ' },
    { index: 4, en: 'Thu', fullEn: 'Thursday', km: 'ព្រហ', fullKm: 'ថ្ងៃព្រហស្បតិ៍' },
    { index: 5, en: 'Fri', fullEn: 'Friday', km: 'សុក្រ', fullKm: 'ថ្ងៃសុក្រ' },
    { index: 6, en: 'Sat', fullEn: 'Saturday', km: 'សៅរ៍', fullKm: 'ថ្ងៃសៅរ៍' },
    { index: 0, en: 'Sun', fullEn: 'Sunday', km: 'អាទិត្យ', fullKm: 'ថ្ងៃអាទិត្យ' }
  ];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesKm = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍'];
  const dayNames = isKhmer ? dayNamesKm : dayNamesEn;

  const toggleDay = (dayIndex: number) => {
    if (formData.daysOfWeek.includes(dayIndex)) {
      if (formData.daysOfWeek.length > 1) {
        setFormData({
          ...formData,
          daysOfWeek: formData.daysOfWeek.filter(d => d !== dayIndex)
        });
      }
    } else {
      setFormData({
        ...formData,
        daysOfWeek: [...formData.daysOfWeek, dayIndex].sort()
      });
    }
  };

  // Subject Schedules Handlers
  const toggleSubjectDay = (dayIndex: number) => {
    const currentDays = subjectFormData.daysOfWeek || [1, 2, 3, 4, 5, 6];
    if (currentDays.includes(dayIndex)) {
      if (currentDays.length > 1) {
        const nextDays = currentDays.filter(d => d !== dayIndex);
        setSubjectFormData({
          ...subjectFormData,
          daysOfWeek: nextDays,
          dayOfWeek: nextDays[0] ?? 1
        });
      } else {
        showToast(isKhmer ? 'ត្រូវជ្រើសរើសយ៉ាងហោចណាស់មួយថ្ងៃ' : 'At least one day must be selected', 'warning');
      }
    } else {
      const nextDays = [...currentDays, dayIndex].sort();
      setSubjectFormData({
        ...subjectFormData,
        daysOfWeek: nextDays,
        dayOfWeek: nextDays[0] ?? 1
      });
    }
  };

  const handleOpenAddSubject = () => {
    if (teachers.length === 0) {
      showToast(isKhmer ? 'សូមបន្ថែមព័ត៌មានគ្រូបង្រៀនជាមុនសិន' : 'Please add teachers before creating subject schedules', 'warning');
      return;
    }
    const defaultTeacher = selectedTeacherFilter !== 'All' 
      ? teachers.find(t => t.id === selectedTeacherFilter) || teachers[0]
      : teachers[0];
      
    const s = StorageService.getSettings();
    const defaultGrace = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;

    setEditingSubjectSchedule(null);
    setSubjectFormData({
      id: `sub-sch-${Date.now()}`,
      teacherId: defaultTeacher?.id || '',
      teacherName: defaultTeacher?.fullName || '',
      khmerTeacherName: defaultTeacher?.khmerName || '',
      subject: '',
      khmerSubject: '',
      subjectCode: '',
      gradeClass: 'Grade 12A',
      room: 'Room 201',
      dayOfWeek: 1,
      periodNumber: 1,
      periodName: 'Period 1 (07:30 - 09:00)',
      startTime: '07:30',
      endTime: '09:00',
      gracePeriodMinutes: defaultGrace,
      hourlyRate: defaultTeacher?.hourlyRate,
      color: '#4F46E5',
      isActive: true,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenAddSubjectForSlot = (dayIndex: number, periodNumber?: number, startTime?: string, endTime?: string) => {
    handleOpenAddSubject();
    setSubjectFormData(prev => ({
      ...prev,
      dayOfWeek: dayIndex,
      daysOfWeek: [dayIndex],
      periodNumber: periodNumber || prev.periodNumber,
      startTime: startTime || prev.startTime,
      endTime: endTime || prev.endTime
    }));
  };

  const handleOpenEditSubject = (sub: TeacherSubjectSchedule) => {
    const s = StorageService.getSettings();
    const defaultGrace = s.defaultGracePeriodMinutes ?? s.defaultGracePeriod ?? 15;
    const teacher = teachers.find(t => t.id === sub.teacherId);
    setEditingSubjectSchedule(sub);
    setSubjectFormData({
      id: sub.id || '',
      teacherId: sub.teacherId || '',
      teacherName: sub.teacherName || '',
      khmerTeacherName: sub.khmerTeacherName || '',
      subject: sub.subject || '',
      khmerSubject: sub.khmerSubject || '',
      subjectCode: sub.subjectCode || '',
      gradeClass: sub.gradeClass || 'Grade 12A',
      room: sub.room || 'Room 201',
      dayOfWeek: sub.dayOfWeek ?? 1,
      daysOfWeek: sub.daysOfWeek && sub.daysOfWeek.length > 0 ? sub.daysOfWeek : [sub.dayOfWeek ?? 1],
      periodNumber: sub.periodNumber ?? 1,
      periodName: sub.periodName || 'Period 1',
      startTime: sub.startTime || '07:30',
      endTime: sub.endTime || '09:00',
      gracePeriodMinutes: sub.gracePeriodMinutes ?? defaultGrace,
      hourlyRate: sub.hourlyRate !== undefined ? sub.hourlyRate : teacher?.hourlyRate,
      color: sub.color || '#4F46E5',
      isActive: sub.isActive ?? true
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectFormData.subject.trim()) {
      showToast(isKhmer ? 'សូមបញ្ចូលឈ្មោះមុខវិជ្ជា' : 'Please enter subject title', 'warning');
      return;
    }
    if (!subjectFormData.teacherId) {
      showToast(isKhmer ? 'សូមជ្រើសរើសគ្រូបង្រៀន' : 'Please select a teacher', 'warning');
      return;
    }

    const teacher = teachers.find(t => t.id === subjectFormData.teacherId);
    const finalData: TeacherSubjectSchedule = {
      ...subjectFormData,
      teacherName: teacher ? teacher.fullName : subjectFormData.teacherName,
      khmerTeacherName: teacher?.khmerName || subjectFormData.khmerTeacherName,
      dayOfWeek: subjectFormData.daysOfWeek && subjectFormData.daysOfWeek.length > 0 
        ? subjectFormData.daysOfWeek[0] 
        : subjectFormData.dayOfWeek
    };

    if (editingSubjectSchedule) {
      StorageService.updateSubjectSchedule(finalData.id, finalData);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Updated Subject Schedule',
        target: `${finalData.subject} (${finalData.gradeClass} - ${finalData.teacherName})`,
        ipAddress: '127.0.0.1'
      });
      showToast(isKhmer ? `បានកែប្រែកាលវិភាគមុខវិជ្ជា៖ ${finalData.subject}` : `Updated subject schedule: ${finalData.subject}`, 'success');
    } else {
      StorageService.addSubjectSchedule(finalData);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Created Subject Schedule',
        target: `${finalData.subject} (${finalData.gradeClass} - ${finalData.teacherName})`,
        ipAddress: '127.0.0.1'
      });
      showToast(isKhmer ? `បានបង្កើតកាលវិភាគមុខវិជ្ជាថ្មី៖ ${finalData.subject}` : `Created subject schedule: ${finalData.subject}`, 'success');
    }

    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = (id: string, subjectName: string) => {
    if (window.confirm(isKhmer ? `តើអ្នកពិតជាចង់លុបកាលវិភាគមុខវិជ្ជា "${subjectName}" មែនទេ?` : `Delete subject schedule "${subjectName}"?`)) {
      StorageService.deleteSubjectSchedule(id);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted Subject Schedule',
        target: subjectName,
        ipAddress: '127.0.0.1'
      });
      showToast(isKhmer ? `បានលុបកាលវិភាគមុខវិជ្ជា "${subjectName}"` : `Deleted subject schedule "${subjectName}"`, 'info');
    }
  };

  // Scoped subject schedules: Teacher can view owned schedule only
  const filteredSubjectSchedules = useMemo(() => {
    return subjectSchedules.filter(sub => {
      if (isTeacher) {
        const isOwned =
          (activeTeacher && sub.teacherId === activeTeacher.id) ||
          (activeTeacher?.teacherId && sub.teacherId?.toLowerCase() === activeTeacher.teacherId.toLowerCase()) ||
          (activeTeacher && sub.teacherName?.toLowerCase() === activeTeacher.fullName.toLowerCase()) ||
          (currentUser.personId && (sub.teacherId === currentUser.personId || sub.teacherId?.toLowerCase() === currentUser.personId.toLowerCase())) ||
          sub.teacherName?.toLowerCase() === currentUser.fullName.toLowerCase();
        if (!isOwned) return false;
      } else {
        const matchesTeacher = selectedTeacherFilter === 'All' || sub.teacherId === selectedTeacherFilter;
        if (!matchesTeacher) return false;
      }

      const q = subjectSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        sub.subject.toLowerCase().includes(q) ||
        (sub.khmerSubject && sub.khmerSubject.toLowerCase().includes(q)) ||
        sub.gradeClass.toLowerCase().includes(q) ||
        sub.room.toLowerCase().includes(q) ||
        sub.teacherName.toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [subjectSchedules, isTeacher, activeTeacher, currentUser, selectedTeacherFilter, subjectSearchQuery]);

  // Scoped general duty shifts: Teacher sees their assigned shift
  const filteredGeneralSchedules = useMemo(() => {
    if (!isTeacher) return schedules;
    const owned = schedules.filter(sch => {
      // 1. Direct assigned schedule ID on teacher profile
      if (activeTeacher?.assignedScheduleId && sch.id === activeTeacher.assignedScheduleId) {
        return true;
      }
      // 2. Schedule assigned specifically to this teacher's ID or personId
      if (sch.assignedPersonIds && (
        (activeTeacher && sch.assignedPersonIds.includes(activeTeacher.id)) ||
        (currentUser.personId && sch.assignedPersonIds.includes(currentUser.personId))
      )) {
        return true;
      }
      // 3. Fallback: department schedule if teacher has department and no explicit schedule assigned
      if (!activeTeacher?.assignedScheduleId && sch.department === activeTeacher?.department) {
        return true;
      }
      return false;
    });
    return owned.length > 0 ? owned : schedules.slice(0, 1);
  }, [schedules, isTeacher, activeTeacher, currentUser]);

  const [attendanceList, setAttendanceList] = useState(() => StorageService.getAttendance());
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setAttendanceList(StorageService.getAttendance());
    });
    return unsub;
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter daily classes for the selected day - move current schedule to top
  const dailyClasses = useMemo(() => {
    const list = filteredSubjectSchedules
      .filter(sub => {
        if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
          return sub.daysOfWeek.includes(selectedDay);
        }
        return sub.dayOfWeek === selectedDay;
      });

    const isClassToday = selectedDay === todayDayIndex;
    if (!isClassToday) {
      return list.sort((a, b) => {
        if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
        return a.startTime.localeCompare(b.startTime);
      });
    }

    const curTime = AttendanceEngine.getCurrentTimeString();
    const curMins = AttendanceEngine.timeToMinutes(curTime);
    const teacherId = activeTeacher?.id || currentUser.personId || currentUser.id;

    // Move current schedule to TOP
    return list.sort((a, b) => {
      const recA = attendanceList.find(
        r => (r.personId === teacherId || r.personName?.toLowerCase() === currentUser.fullName?.toLowerCase()) &&
             r.date === todayStr &&
             r.subjectScheduleId === a.id
      );
      const recB = attendanceList.find(
        r => (r.personId === teacherId || r.personName?.toLowerCase() === currentUser.fullName?.toLowerCase()) &&
             r.date === todayStr &&
             r.subjectScheduleId === b.id
      );

      // 1. In-progress class (checked in, not checked out) goes to top
      const inProgressA = Boolean(recA?.checkInTime && !recA?.checkOutTime);
      const inProgressB = Boolean(recB?.checkInTime && !recB?.checkOutTime);
      if (inProgressA !== inProgressB) return inProgressA ? -1 : 1;

      const aStart = AttendanceEngine.timeToMinutes(a.startTime);
      const aEnd = AttendanceEngine.timeToMinutes(a.endTime);
      const bStart = AttendanceEngine.timeToMinutes(b.startTime);
      const bEnd = AttendanceEngine.timeToMinutes(b.endTime);

      // 2. Currently active time window
      const isActiveNowA = curMins >= aStart && curMins < aEnd && !recA?.checkOutTime;
      const isActiveNowB = curMins >= bStart && curMins < bEnd && !recB?.checkOutTime;
      if (isActiveNowA !== isActiveNowB) return isActiveNowA ? -1 : 1;

      // 3. Next upcoming classes today
      const isUpcomingA = curMins < aStart && !recA?.checkInTime;
      const isUpcomingB = curMins < bStart && !recB?.checkInTime;
      if (isUpcomingA !== isUpcomingB) return isUpcomingA ? -1 : 1;

      return aStart - bStart;
    });
  }, [filteredSubjectSchedules, selectedDay, todayDayIndex, attendanceList, activeTeacher, currentUser, todayStr]);

  // Daily classes filtered with search query
  const dailyClassesFiltered = useMemo(() => {
    let list = dailyClasses;
    if (dailySearchQuery.trim()) {
      const q = dailySearchQuery.toLowerCase().trim();
      list = list.filter(
        sub =>
          sub.subject.toLowerCase().includes(q) ||
          (sub.khmerSubject && sub.khmerSubject.toLowerCase().includes(q)) ||
          sub.gradeClass.toLowerCase().includes(q) ||
          sub.room.toLowerCase().includes(q) ||
          sub.teacherName.toLowerCase().includes(q) ||
          (sub.khmerTeacherName && sub.khmerTeacherName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [dailyClasses, dailySearchQuery]);

  // Group and order daily classes by Period
  const dailyClassesGroupedByPeriod = useMemo(() => {
    const list = dailyClassesFiltered;
    if (list.length === 0) return [];

    const isClassToday = selectedDay === todayDayIndex;
    const curTimeStr = AttendanceEngine.getCurrentTimeString();
    const curMins = AttendanceEngine.timeToMinutes(curTimeStr);

    const map = new Map<number, {
      periodNumber: number;
      periodName: string;
      khmerPeriodName: string;
      startTime: string;
      endTime: string;
      sessionType: 'Morning' | 'Afternoon' | 'Evening';
      color?: string;
      classes: TeacherSubjectSchedule[];
    }>();

    list.forEach(sub => {
      let pNum = sub.periodNumber || 0;
      if (!pNum) {
        const matched = periods.find(
          p => p.startTime === sub.startTime ||
               (p.periodName && sub.periodName && p.periodName.toLowerCase() === sub.periodName.toLowerCase())
        );
        if (matched) {
          pNum = matched.periodNumber;
        } else {
          const sMin = AttendanceEngine.timeToMinutes(sub.startTime);
          pNum = sMin > 0 ? Math.floor(sMin / 60) : 1;
        }
      }

      const periodDef = periods.find(p => p.periodNumber === pNum);
      const sTime = sub.startTime || periodDef?.startTime || '07:30';
      const eTime = sub.endTime || periodDef?.endTime || '08:15';
      const sMins = AttendanceEngine.timeToMinutes(sTime);
      const sessionType: 'Morning' | 'Afternoon' | 'Evening' = periodDef?.sessionType && periodDef.sessionType !== 'Break'
        ? periodDef.sessionType
        : (sMins < 720 ? 'Morning' : sMins < 1080 ? 'Afternoon' : 'Evening');

      if (!map.has(pNum)) {
        map.set(pNum, {
          periodNumber: pNum,
          periodName: periodDef?.periodName || sub.periodName || `Period ${pNum}`,
          khmerPeriodName: periodDef?.khmerPeriodName || `ម៉ោងទី ${pNum}`,
          startTime: periodDef?.startTime || sTime,
          endTime: periodDef?.endTime || eTime,
          sessionType,
          color: periodDef?.color || sub.color || '#4F46E5',
          classes: []
        });
      }

      map.get(pNum)!.classes.push(sub);
    });

    const sortedGroups = Array.from(map.values()).sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

    sortedGroups.forEach(g => {
      g.classes.sort((a, b) => {
        const timeDiff = a.startTime.localeCompare(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.gradeClass.localeCompare(b.gradeClass);
      });
    });

    return sortedGroups.map(g => {
      const gStart = AttendanceEngine.timeToMinutes(g.startTime);
      const gEnd = AttendanceEngine.timeToMinutes(g.endTime);

      const isCurrentActive = isClassToday && curMins >= gStart && curMins < gEnd;
      const isUpcoming = isClassToday && curMins < gStart;
      const isCompleted = isClassToday && curMins >= gEnd;

      return {
        ...g,
        isCurrentActive,
        isUpcoming,
        isCompleted
      };
    });
  }, [dailyClassesFiltered, selectedDay, todayDayIndex, periods]);

  // Group daily classes by Teacher
  const dailyClassesGroupedByTeacher = useMemo(() => {
    const list = dailyClassesFiltered;
    if (list.length === 0) return [];

    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        khmerName?: string;
        department?: string;
        classes: TeacherSubjectSchedule[];
      }
    >();

    list.forEach(sub => {
      const key = sub.teacherId || sub.teacherName;
      const teacherObj = teachers.find(
        t =>
          t.id === sub.teacherId ||
          t.teacherId?.toLowerCase() === sub.teacherId?.toLowerCase() ||
          t.fullName.toLowerCase() === sub.teacherName.toLowerCase()
      );

      if (!map.has(key)) {
        map.set(key, {
          teacherId: key,
          teacherName: teacherObj?.fullName || sub.teacherName,
          khmerName: teacherObj?.khmerName || sub.khmerTeacherName,
          department: teacherObj?.department || 'Academic Faculty',
          classes: []
        });
      }

      map.get(key)!.classes.push(sub);
    });

    const groups = Array.from(map.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    groups.forEach(g => {
      g.classes.sort((a, b) => {
        const timeDiff = a.startTime.localeCompare(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.gradeClass.localeCompare(b.gradeClass);
      });
    });

    return groups;
  }, [dailyClassesFiltered, teachers]);

  const weekDayTabs = [
    { index: 1, shortEn: 'Mon', shortKm: 'ចន្ទ', fullEn: 'Monday', fullKm: 'ថ្ងៃចន្ទ' },
    { index: 2, shortEn: 'Tue', shortKm: 'អង្គារ', fullEn: 'Tuesday', fullKm: 'ថ្ងៃអង្គារ' },
    { index: 3, shortEn: 'Wed', shortKm: 'ពុធ', fullEn: 'Wednesday', fullKm: 'ថ្ងៃពុធ' },
    { index: 4, shortEn: 'Thu', shortKm: 'ព្រហ', fullEn: 'Thursday', fullKm: 'ថ្ងៃព្រហស្បតិ៍' },
    { index: 5, shortEn: 'Fri', shortKm: 'សុក្រ', fullEn: 'Friday', fullKm: 'ថ្ងៃសុក្រ' },
    { index: 6, shortEn: 'Sat', shortKm: 'សៅរ៍', fullEn: 'Saturday', fullKm: 'ថ្ងៃសៅរ៍' },
    { index: 0, shortEn: 'Sun', shortKm: 'អាទិត្យ', fullEn: 'Sunday', fullKm: 'ថ្ងៃអាទិត្យ' }
  ];

  const handleTeacherClassCheckIn = (sub: TeacherSubjectSchedule, forceAdminOverride = false) => {
    // Only teachers or authorized admins/supervisors can check in
    if (!isTeacher && !canAdminManageAttendance) {
      showToast(
        isKhmer
          ? 'លោកអ្នកគ្មានសិទ្ធិស្កេនវត្តមានជំនួសគ្រូបង្រៀនឡើយ។'
          : 'You do not have permission to check in for teacher schedules.',
        'error'
      );
      return;
    }

    const curTime = AttendanceEngine.getCurrentTimeString();
    const curMins = AttendanceEngine.timeToMinutes(curTime);
    const startMins = AttendanceEngine.timeToMinutes(sub.startTime);
    const endMins = AttendanceEngine.timeToMinutes(sub.endTime);

    // Resolve assigned teacher for this class schedule
    const assignedTeacher = teachers.find(
      t => t.id === sub.teacherId ||
           t.teacherId?.toLowerCase() === sub.teacherId?.toLowerCase() ||
           t.fullName.toLowerCase() === sub.teacherName.toLowerCase()
    ) || (activeTeacher && (activeTeacher.id === sub.teacherId || activeTeacher.teacherId === sub.teacherId) ? activeTeacher : null);

    const targetTeacherId = assignedTeacher?.id || sub.teacherId;
    const targetTeacherName = assignedTeacher?.fullName || sub.teacherName;
    const targetTeacherKhmer = assignedTeacher?.khmerName || sub.khmerTeacherName;
    const targetDept = assignedTeacher?.department || 'Academic & Curriculum';

    // Allow early check-in buffer: 30 minutes before class
    const earlyBuffer = 30;
    const earliestMins = Math.max(0, startMins - earlyBuffer);
    const canOverride = !isTeacher || hasPermission('schedules.create') || hasPermission('attendance.edit') || forceAdminOverride;

    if (isTeacher && curMins >= endMins) {
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ ម៉ោងបង្រៀន "${sub.khmerSubject || sub.subject}" បានបញ្ចប់នៅម៉ោង ${sub.endTime} រួចហើយ! គ្រូមិនអាចស្កេនចូលកាលវិភាគហួសម៉ោងឡើយ។`
          : `Cannot check in: Class ended at ${sub.endTime}. Teachers are not allowed to scan into overtime schedules.`,
        'error'
      );
      return;
    }

    if (!canOverride && curMins < earliestMins) {
      const waitMins = startMins - curMins;
      showToast(
        isKhmer
          ? `មិនទាន់ដល់ម៉ោងស្កេនចូលទេ៖ ម៉ោងបង្រៀន "${sub.khmerSubject || sub.subject}" ចាប់ផ្តើមនៅម៉ោង ${sub.startTime} (នៅសល់ ${waitMins} នាទី)។ អាចស្កេនមុនបាន ${earlyBuffer} នាទី។`
          : `Cannot check in yet: Class starts at ${sub.startTime} (starts in ${waitMins}m). Early check-in opens ${earlyBuffer}m before class.`,
        'error'
      );
      return;
    }

    const result = AttendanceEngine.processCheckIn({
      personId: targetTeacherId,
      personName: targetTeacherName,
      khmerName: targetTeacherKhmer,
      personType: 'teacher',
      department: targetDept,
      subjectScheduleId: sub.id,
      customTime: curTime,
      allowEarlyCheckInMinutes: 30,
      bypassScheduleWindow: canOverride
    });

    if (result.success) {
      confetti({ particleCount: 40, spread: 50 });
      showToast(
        isKhmer
          ? `ស្កេនចូលជោគជ័យសម្រាប់ ${targetTeacherName} - ${sub.khmerSubject || sub.subject}`
          : `Check-in successful for ${targetTeacherName} - ${sub.subject}`,
        'success'
      );
      setAttendanceList(StorageService.getAttendance());
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleTeacherClassCheckOut = (sub: TeacherSubjectSchedule, forceAdminOverride = false) => {
    // Only teachers or authorized admins/supervisors can check out
    if (!isTeacher && !canAdminManageAttendance) {
      showToast(
        isKhmer
          ? 'លោកអ្នកគ្មានសិទ្ធិស្កេនចេញជំនួសគ្រូបង្រៀនឡើយ។'
          : 'You do not have permission to check out for teacher schedules.',
        'error'
      );
      return;
    }

    const curTime = AttendanceEngine.getCurrentTimeString();
    const curMins = AttendanceEngine.timeToMinutes(curTime);
    const endMins = AttendanceEngine.timeToMinutes(sub.endTime);

    // Resolve assigned teacher
    const assignedTeacher = teachers.find(
      t => t.id === sub.teacherId ||
           t.teacherId?.toLowerCase() === sub.teacherId?.toLowerCase() ||
           t.fullName.toLowerCase() === sub.teacherName.toLowerCase()
    );

    const targetTeacherId = assignedTeacher?.id || sub.teacherId;
    const targetTeacherName = assignedTeacher?.fullName || sub.teacherName;
    const canOverride = !isTeacher || hasPermission('schedules.create') || hasPermission('attendance.edit') || forceAdminOverride;

    if (!canOverride && curMins < endMins) {
      const waitMins = endMins - curMins;
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យស្កេនចេញមុនម៉ោងទេ៖ ម៉ោងបង្រៀន "${sub.khmerSubject || sub.subject}" បញ្ចប់នៅម៉ោង ${sub.endTime} (នៅសល់ ${waitMins} នាទី)។`
          : `Cannot check out before schedule: Class ends at ${sub.endTime} (${waitMins}m remaining).`,
        'error'
      );
      return;
    }

    const isAutoSetToEnd = isTeacher && curMins >= endMins;
    const result = AttendanceEngine.processCheckOut({
      personId: targetTeacherId,
      personName: targetTeacherName,
      subjectScheduleId: sub.id,
      customTime: isAutoSetToEnd ? sub.endTime : curTime,
      autoSetToEndOfSchedule: isAutoSetToEnd
    });

    if (result.success) {
      showToast(
        isKhmer
          ? `ស្កេនចេញជោគជ័យសម្រាប់ ${targetTeacherName} - ${sub.khmerSubject || sub.subject}`
          : result.message,
        'success'
      );
      setAttendanceList(StorageService.getAttendance());
    } else {
      showToast(result.message, 'error');
    }
  };

  const renderClassCard = (sub: TeacherSubjectSchedule, idx: number) => {
    // Find attendance record for this class today using robust matcher
    const isClassToday = selectedDay === todayDayIndex;
    const todayRec = AttendanceEngine.findRecordForSubjectSchedule(sub, attendanceList, todayStr, teachers);

    const isCheckedIn = Boolean(todayRec?.checkInTime);
    const isCheckedOut = Boolean(todayRec?.checkOutTime);
    const isLate = todayRec?.status === 'Late';

    const curTimeStr = AttendanceEngine.getCurrentTimeString();
    const curMins = AttendanceEngine.timeToMinutes(curTimeStr);
    const sStart = AttendanceEngine.timeToMinutes(sub.startTime);
    const sEnd = AttendanceEngine.timeToMinutes(sub.endTime);

    const isCurrentActive = isClassToday && (
      (isCheckedIn && !isCheckedOut) ||
      (curMins >= sStart && curMins < sEnd && !isCheckedOut)
    );

    return (
      <div
        key={sub.id}
        className={`bg-white rounded-3xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${
          isCurrentActive ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm' : 'border-slate-200'
        }`}
        style={{ borderLeftWidth: '6px', borderLeftColor: sub.color || '#4F46E5' }}
      >
        <div>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: sub.color || '#4F46E5' }}
              >
                {isKhmer ? `ម៉ោងទី ${sub.periodNumber || 1}` : sub.periodName || `Period ${sub.periodNumber || 1}`}
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {sub.startTime} - {sub.endTime}
              </span>
              {isClassToday && isCurrentActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-indigo-600 text-white uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>{isKhmer ? 'ម៉ោងបច្ចុប្បន្ន' : 'Current Class'}</span>
                </span>
              )}
            </div>

            {/* Status Badge if checking today */}
            {isClassToday && (
              <div>
                {isCheckedOut ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isKhmer ? `ចប់ម៉ោង (${todayRec?.checkOutTime})` : `Out: ${todayRec?.checkOutTime}`}</span>
                  </span>
                ) : isCheckedIn ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                    isLate ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isKhmer ? `ស្កេនចូលម៉ោង ${todayRec?.checkInTime}` : `In: ${todayRec?.checkInTime}`}</span>
                  </span>
                ) : isCurrentActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isKhmer ? 'កំពុងបង្រៀន (មិនទាន់ស្កេន)' : 'In Session (Unscanned)'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-600">
                    {isKhmer ? 'រង់ចាំស្កេន' : 'Scheduled'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 mb-3">
            <h4 className="font-black text-base text-slate-900">
              {sub.subject}
            </h4>
            {sub.khmerSubject && (
              <p className="text-xs font-semibold text-indigo-700">
                {sub.khmerSubject}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-bold text-slate-800">
              {sub.gradeClass}
            </span>
            <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-bold text-slate-700 flex items-center gap-1">
              <Building className="w-3 h-3 text-slate-400" />
              {sub.room}
            </span>
            {sub.subjectCode && (
              <span className="font-mono text-[11px] text-slate-400">
                {sub.subjectCode}
              </span>
            )}
          </div>

          {/* Attribution for Admin / HR */}
          {!isTeacher && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-800">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold">{sub.teacherName}</span>
              {sub.khmerTeacherName && (
                <span className="text-slate-500 font-medium">({sub.khmerTeacherName})</span>
              )}
            </div>
          )}
        </div>

        {/* Quick Attendance Action Buttons for Today (Teachers for their own classes, or Admin/HR with override permission) */}
        {isClassToday && (isTeacher || canAdminManageAttendance) && (
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            {!isCheckedIn ? (
              curMins < sStart - 30 && isTeacher ? (
                <div className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isKhmer
                      ? `មិនទាន់ដល់ម៉ោង (ចាប់ផ្តើម ${sub.startTime})`
                      : `Upcoming Class (Starts ${sub.startTime})`}
                  </span>
                </div>
              ) : curMins >= sEnd && isTeacher ? (
                <div
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold cursor-not-allowed"
                  title="Class period ended. Scanning into overtime schedules is strictly prohibited for teachers."
                >
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    {isKhmer
                      ? `ហួសម៉ោងបង្រៀន (Overtime — ចប់ ${sub.endTime})`
                      : `Schedule Ended (Overtime — ${sub.endTime})`}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTeacherClassCheckIn(sub, !isTeacher)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-white text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer ${
                    isCurrentActive
                      ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/40 animate-pulse'
                      : curMins < sStart && isTeacher
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {!isTeacher
                      ? (isKhmer ? `ស្កេនចូល (${sub.teacherName})` : `Scan In (${sub.teacherName})`)
                      : curMins < sStart
                      ? (isKhmer ? `ស្កេនចូលមុនម៉ោង (ចាប់ផ្តើម ${sub.startTime})` : `Early Check In (Starts ${sub.startTime})`)
                      : (isKhmer ? 'ស្កេនចូលម៉ោងបង្រៀននេះ (Check In)' : 'Check In for this Class')}
                  </span>
                </button>
              )
            ) : !isCheckedOut ? (
              curMins < sEnd && isTeacher ? (
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>{isKhmer ? `កំពុងបង្រៀន (ចប់ម៉ោង ${sub.endTime})` : `In Class (${sub.startTime}-${sub.endTime})`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTeacherClassCheckOut(sub, true)}
                    className="flex items-center gap-1 py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    title="Check out early or complete class session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ចេញ' : 'End'}</span>
                  </button>
                </div>
              ) : curMins >= sEnd && isTeacher ? (
                <button
                  type="button"
                  onClick={() => handleTeacherClassCheckOut(sub, true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-indigo-600 to-indigo-700 hover:from-amber-500 hover:to-indigo-600 text-white text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer"
                  title={isKhmer ? `ស្កេនចេញបំពេញម៉ោងខកខាន (កំណត់ស្វ័យប្រវត្តិតាម ${sub.endTime})` : `Scan out missing check-out (auto-set to ${sub.endTime})`}
                >
                  <ClockAlert className="w-3.5 h-3.5 text-amber-200" />
                  <span>
                    {isKhmer ? `ស្កេនចេញបំពេញម៉ោង (${sub.endTime})` : `Scan Out Missing Check-out (${sub.endTime})`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTeacherClassCheckOut(sub, !isTeacher)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>
                    {!isTeacher
                      ? (isKhmer ? `ស្កេនចេញ (${sub.teacherName})` : `Scan Out (${sub.teacherName})`)
                      : (isKhmer ? 'ស្កេនចេញបញ្ចប់ម៉ោង (Check Out)' : 'Check Out of this Class')}
                  </span>
                </button>
              )
            ) : (
              <div className="w-full text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isKhmer ? 'បានកត់ត្រាវត្តមានសម្រាប់ម៉ោងនេះរួចរាល់' : 'Class Attendance Completed'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isKhmer ? 'កាលវិភាគការងារ និងវេនបង្រៀន' : 'Work Schedules & Shift Calendar'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isKhmer
              ? 'ការគ្រប់គ្រងកាលវិភាគ ម៉ោងចូល-ចេញ រយៈពេលអនុគ្រោះ និងការកំណត់វត្តមាន'
              : 'Configure shifts, flexible grace periods, absence thresholds, and department rosters.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle: Daily > Weekly > Monthly */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200">
            <button
              onClick={() => setViewMode('daily_schedule')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daily_schedule' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isKhmer ? 'កាលវិភាគប្រចាំថ្ងៃ (Daily)' : 'Daily Schedule'}</span>
            </button>
            <button
              onClick={() => setViewMode('weekly_timetable')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'weekly_timetable' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isKhmer ? 'កាលវិភាគពេញមួយសប្តាហ៍ (Weekly)' : 'Weekly Timetable'}</span>
            </button>
            <button
              onClick={() => setViewMode('monthly_calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'monthly_calendar' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{isKhmer ? 'កាលវិភាគប្រចាំខែ (Monthly)' : 'Monthly Calendar'}</span>
            </button>
            <button
              onClick={() => setViewMode('subject_schedules')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'subject_schedules' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{isKhmer ? 'កាតមុខវិជ្ជា' : 'Subject Cards'}</span>
            </button>
            {!isTeacher && (
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-slate-900 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 bg-white/60'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>{isKhmer ? 'វេនទូទៅ' : 'General Shifts'}</span>
              </button>
            )}
          </div>

          {hasPermission('schedules.create') && !isTeacher && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAcademicDatesModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Configure Academic Start Date & End Date"
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>
                  {systemSettings?.academicStartDate && systemSettings?.academicEndDate
                    ? `${systemSettings.academicYear || 'AY'}: ${systemSettings.academicStartDate} – ${systemSettings.academicEndDate}`
                    : (isKhmer ? 'កាលបរិច្ឆេទឆ្នាំសិក្សា' : 'Set Academic Dates')}
                </span>
              </button>

              <button
                onClick={() => setIsPeriodManageModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-all active:scale-95"
                title="Manage School Timetable Periods & Bells"
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>{isKhmer ? 'កំណត់វេនម៉ោង' : 'Manage Periods'}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedScheduleForQR(null);
                  setIsQRCodeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Create & Print Schedule QR Code Door Sign"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>{isKhmer ? 'QR កាលវិភាគ' : 'Schedule QR'}</span>
              </button>

              <button
                onClick={() => setIsQRScanModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                title="Scan Schedule QR Code & confirm PIN"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>{isKhmer ? 'ស្កេន QR' : 'Scan QR'}</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{isKhmer ? 'នាំចូលកាលវិភាគ' : 'Import Schedules (CSV)'}</span>
              </button>

              <button
                onClick={viewMode === 'cards' ? handleOpenAdd : handleOpenAddSubject}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>
                  {viewMode === 'cards'
                    ? (isKhmer ? 'បង្កើតវេនថ្មី' : 'Create Shift')
                    : (isKhmer ? 'បន្ថែមម៉ោងបង្រៀន' : 'Add Subject Period')}
                </span>
              </button>
            </div>
          )}

          {isTeacher && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQRScanModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                title="Scan Classroom QR Code with PIN confirmation"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>{isKhmer ? 'ស្កេន QR' : 'Scan Class QR'}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedScheduleForQR(null);
                  setSelectedTeacherForQR(activeTeacher || null);
                  setIsQRCodeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="View & Download My Smart QR Card for all classes"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>{isKhmer ? 'កូដ QR របស់ខ្ញុំ' : 'My QR Card'}</span>
              </button>

              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-2xl text-indigo-900 shadow-2xs">
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-black block leading-tight">
                    {activeTeacher?.fullName || currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                    {isKhmer ? 'កាលវិភាគផ្ទាល់ខ្លួន' : 'Owned Schedule Only'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Owned Schedule Notification Banner */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 border border-indigo-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/30 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-indigo-900">
                  {isKhmer ? 'កាលវិភាគបង្រៀនផ្ទាល់ខ្លួន' : 'Personal Teacher Timetable & Shift'}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                  {activeTeacher?.teacherId || 'TCH'}
                </span>
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                {isKhmer
                  ? 'ប្រព័ន្ធត្រូវបានចាក់សោរបង្ហាញតែកាលវិភាគបង្រៀន និងវេនការងារផ្ទាល់ខ្លួនរបស់អ្នកប៉ុណ្ណោះ។'
                  : 'Locked to your owned teaching roster and assigned duty schedule. Proxy viewing of other faculty schedules is disabled.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3.5 py-1.5 rounded-xl shrink-0 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{isKhmer ? 'សុវត្ថិភាពទិន្នន័យផ្ទាល់ខ្លួន' : 'Owned Schedule Enforced'}</span>
          </span>
        </div>
      )}

      {/* Daily Schedule View (Default for Teacher Account) */}
      {viewMode === 'daily_schedule' && (
        <div className="space-y-4">
          
          {/* Day Selector Navigation Pills & Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Top Toolbar: Teacher Filter, Search, Layout & Group Switchers, Sort */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Left Controls: Teacher Filter & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {!isTeacher ? (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">
                      {isKhmer ? 'ជ្រើសរើសគ្រូបង្រៀន:' : 'Teacher:'}
                    </span>
                    <select
                      value={selectedTeacherFilter}
                      onChange={e => setSelectedTeacherFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="All">{isKhmer ? 'គ្រូទាំងអស់ (All Faculty)' : 'All Faculty'}</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} — {t.department}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">
                      {isKhmer ? 'កាលវិភាគប្រចាំថ្ងៃ' : 'Daily Teaching Schedule'}
                    </span>
                  </div>
                )}

                {/* Search Input for Daily Classes */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isKhmer ? 'ស្វែងរកមុខវិជ្ជា, ថ្នាក់, បន្ទប់...' : 'Search subject, class, room...'}
                    value={dailySearchQuery}
                    onChange={e => setDailySearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {dailySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDailySearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Controls: View Layout, Group By & Sort */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                {/* Layout Switcher: Table vs Cards */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDailyLayoutMode('table')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      dailyLayoutMode === 'table'
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={isKhmer ? 'ទិដ្ឋភាពតារាង (Table View)' : 'Table View'}
                  >
                    <Table className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isKhmer ? 'តារាង (Table)' : 'Table'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyLayoutMode('cards')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      dailyLayoutMode === 'cards'
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={isKhmer ? 'ទិដ្ឋភាពកាត (Cards View)' : 'Cards View'}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isKhmer ? 'កាត (Cards)' : 'Cards'}</span>
                  </button>
                </div>

                {/* Group By Switcher */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDailyGroupMode('period')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      dailyGroupMode === 'period'
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={isKhmer ? 'តាមវេនម៉ោង (By Period)' : 'Group By Period'}
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isKhmer ? 'តាមវេន' : 'Period'}</span>
                  </button>
                  {!isTeacher && (
                    <button
                      type="button"
                      onClick={() => setDailyGroupMode('teacher')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        dailyGroupMode === 'teacher'
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={isKhmer ? 'តាមគ្រូបង្រៀន (By Teacher)' : 'Group By Teacher'}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isKhmer ? 'តាមគ្រូ' : 'Teacher'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDailyGroupMode('flat')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      dailyGroupMode === 'flat'
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={isKhmer ? 'បញ្ជីសរុប (Flat / None)' : 'Flat / No Grouping'}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isKhmer ? 'សរុប' : 'Flat'}</span>
                  </button>
                </div>

                {/* Sort By Dropdown & Order Toggle */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  <select
                    value={dailySortBy}
                    onChange={e => setDailySortBy(e.target.value as DailySortColumn)}
                    className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    title={isKhmer ? 'តម្រៀបទិន្នន័យ' : 'Sort Classes'}
                  >
                    <option value="time">{isKhmer ? 'តម្រៀប៖ ម៉ោង' : 'Sort: Time'}</option>
                    <option value="period">{isKhmer ? 'តម្រៀប៖ វេន' : 'Sort: Period'}</option>
                    <option value="teacher">{isKhmer ? 'តម្រៀប៖ គ្រូ' : 'Sort: Teacher'}</option>
                    <option value="subject">{isKhmer ? 'តម្រៀប៖ មុខវិជ្ជា' : 'Sort: Subject'}</option>
                    <option value="grade">{isKhmer ? 'តម្រៀប៖ ថ្នាក់' : 'Sort: Class'}</option>
                    <option value="room">{isKhmer ? 'តម្រៀប៖ បន្ទប់' : 'Sort: Room'}</option>
                    <option value="status">{isKhmer ? 'តម្រៀប៖ វត្តមាន' : 'Sort: Status'}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setDailySortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-white transition-all cursor-pointer font-bold"
                    title={dailySortOrder === 'asc' ? 'Ascending (A-Z, 0-9)' : 'Descending (Z-A, 9-0)'}
                  >
                    <span className="text-[11px] font-mono font-black">{dailySortOrder === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Day Selector Navigation Pills & Stats */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {isKhmer ? 'ជ្រើសរើសថ្ងៃបង្រៀន (Select Day):' : 'Select Day of Week:'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                  {dailyClassesFiltered.length} {isKhmer ? 'ម៉ោងបង្រៀន' : 'Classes'}
                </span>
                <span className="text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                  {dailyClassesGroupedByPeriod.length} {isKhmer ? 'វេនម៉ោង' : 'Periods'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {weekDayTabs.map(tab => {
                const isSelected = selectedDay === tab.index;
                const isToday = tab.index === todayDayIndex;
                const countForDay = filteredSubjectSchedules.filter(s =>
                  s.daysOfWeek && s.daysOfWeek.length > 0 ? s.daysOfWeek.includes(tab.index) : s.dayOfWeek === tab.index
                ).length;

                return (
                  <button
                    key={tab.index}
                    type="button"
                    onClick={() => setSelectedDay(tab.index)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {isKhmer ? tab.shortKm : tab.shortEn}
                      </span>
                      {isToday && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-white text-indigo-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'} font-medium`}>
                      {countForDay} {isKhmer ? 'ម៉ោង' : 'classes'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classes for Selected Day: Table View vs Cards View */}
          <div className="space-y-4">
            {dailyClassesFiltered.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="font-black text-base text-slate-900">
                  {isKhmer ? 'មិនមានម៉ោងបង្រៀនសម្រាប់ថ្ងៃនេះទេ' : 'No Classes Scheduled for This Day'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {isKhmer
                    ? 'អ្នកមិនមានកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះឡើយ។ អ្នកអាចជ្រើសរើសថ្ងៃផ្សេងទៀតដើម្បីពិនិត្យ។'
                    : 'You do not have any teaching sessions matching this day or search filter.'}
                </p>
              </div>
            ) : dailyLayoutMode === 'table' ? (
              /* Table View with Group By and Sort */
              <DailyScheduleTableView
                classes={dailyClassesFiltered}
                periods={periods}
                teachers={teachers}
                attendanceList={attendanceList}
                selectedDay={selectedDay}
                todayDayIndex={todayDayIndex}
                todayStr={todayStr}
                isTeacher={isTeacher}
                currentUser={currentUser}
                activeTeacher={activeTeacher}
                groupMode={dailyGroupMode}
                sortBy={dailySortBy}
                sortOrder={dailySortOrder}
                onSortChange={col => {
                  if (dailySortBy === col) {
                    setDailySortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setDailySortBy(col);
                    setDailySortOrder('asc');
                  }
                }}
                onCheckIn={handleTeacherClassCheckIn}
                onCheckOut={handleTeacherClassCheckOut}
                onEdit={hasPermission('schedules.edit') && !isTeacher ? handleOpenEditSubject : undefined}
                onDelete={hasPermission('schedules.delete') && !isTeacher ? handleDeleteSubject : undefined}
                canEdit={hasPermission('schedules.edit') && !isTeacher}
                canDelete={hasPermission('schedules.delete') && !isTeacher}
                isKhmer={isKhmer}
              />
            ) : dailyGroupMode === 'period' ? (
              /* Cards View Grouped by Period */
              <div className="space-y-5">
                {dailyClassesGroupedByPeriod.map(group => {
                  return (
                    <div
                      key={group.periodNumber}
                      className={`bg-white rounded-3xl border p-4 sm:p-5 shadow-xs space-y-3.5 transition-all ${
                        group.isCurrentActive
                          ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Period Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className="w-8 h-8 rounded-xl font-black text-white text-xs flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: group.color || '#4F46E5' }}
                          >
                            P{group.periodNumber}
                          </span>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-slate-900">
                                {isKhmer ? group.khmerPeriodName : group.periodName}
                              </h4>
                              {group.sessionType && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {group.sessionType === 'Morning'
                                    ? isKhmer
                                      ? 'វេនព្រឹក'
                                      : 'Morning'
                                    : group.sessionType === 'Afternoon'
                                    ? isKhmer
                                      ? 'វេនរសៀល'
                                      : 'Afternoon'
                                    : isKhmer
                                    ? 'វេនយប់'
                                    : 'Evening'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Period Bell Time Badge */}
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {group.startTime} – {group.endTime}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Period live indicator on today */}
                          {selectedDay === todayDayIndex && (
                            group.isCurrentActive ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span>{isKhmer ? 'កំពុងបង្រៀន (Active Now)' : 'Active Class Period'}</span>
                              </span>
                            ) : group.isUpcoming ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                {isKhmer ? 'វេនបន្ទាប់' : 'Upcoming'}
                              </span>
                            ) : group.isCompleted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                {isKhmer ? 'បានបញ្ចប់' : 'Passed'}
                              </span>
                            ) : null
                          )}

                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                            {group.classes.length} {isKhmer ? 'ថ្នាក់/ម៉ោង' : group.classes.length === 1 ? 'class' : 'classes'}
                          </span>
                        </div>
                      </div>

                      {/* Class Cards inside this Period */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {group.classes.map((sub, idx) => renderClassCard(sub, idx))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : dailyGroupMode === 'teacher' ? (
              /* Cards View Grouped by Teacher */
              <div className="space-y-5">
                {dailyClassesGroupedByTeacher.map(group => {
                  return (
                    <div
                      key={group.teacherId}
                      className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5"
                    >
                      {/* Teacher Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                            {group.teacherName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-slate-900">
                                {group.khmerName ? `${group.khmerName} (${group.teacherName})` : group.teacherName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {group.department}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                            {group.classes.length} {isKhmer ? 'ម៉ោងបង្រៀន' : group.classes.length === 1 ? 'class' : 'classes'}
                          </span>
                        </div>
                      </div>

                      {/* Class Cards for this Teacher */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {group.classes.map((sub, idx) => renderClassCard(sub, idx))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat Cards View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dailyClassesFiltered.map((sub, idx) => renderClassCard(sub, idx))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Mon-Sat Header Weekly Timetable View */}
      {viewMode === 'weekly_timetable' && (
        <MonSatWeeklyTimetable
          subjectSchedules={isTeacher ? filteredSubjectSchedules : subjectSchedules}
          teachers={isTeacher && activeTeacher ? [activeTeacher] : teachers}
          onEditSchedule={hasPermission('schedules.edit') && !isTeacher ? handleOpenEditSubject : undefined}
          onDeleteSchedule={hasPermission('schedules.delete') && !isTeacher ? handleDeleteSubject : undefined}
          onAddForSlot={hasPermission('schedules.create') && !isTeacher ? handleOpenAddSubjectForSlot : undefined}
          initialTeacherFilter={isTeacher && activeTeacher ? activeTeacher.id : selectedTeacherFilter}
          lockedTeacherId={isTeacher && activeTeacher ? activeTeacher.id : undefined}
          isTeacherRole={isTeacher}
          canEdit={hasPermission('schedules.edit') && !isTeacher}
          canDelete={hasPermission('schedules.delete') && !isTeacher}
          canCreate={hasPermission('schedules.create') && !isTeacher}
        />
      )}

      {/* Monthly Calendar Schedule View */}
      {viewMode === 'monthly_calendar' && (
        <TeacherMonthlyCalendar
          initialTeacher={activeTeacher}
          onCheckIn={isTeacher ? handleTeacherClassCheckIn : undefined}
          onCheckOut={isTeacher ? handleTeacherClassCheckOut : undefined}
          onAddScheduleForDay={hasPermission('schedules.create') && !isTeacher ? (dayOfWeek) => {
            handleOpenAddSubjectForSlot(dayOfWeek);
          } : undefined}
        />
      )}

      {/* Teacher Subject Schedules View */}
      {viewMode === 'subject_schedules' && (
        <div className="space-y-4">
          {/* Controls Bar: Filter by Teacher and Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">
                  {isKhmer ? 'ច្រោះតាមគ្រូ៖' : 'Filter by Teacher:'}
                </span>
              </div>
              {isTeacher ? (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                  <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900">
                    {activeTeacher?.fullName || currentUser.fullName}
                    {activeTeacher?.khmerName ? ` (${activeTeacher.khmerName})` : ''}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                    {isKhmer ? 'កាលវិភាគផ្ទាល់ខ្លួន' : 'Owned'}
                  </span>
                </div>
              ) : (
                <select
                  value={selectedTeacherFilter}
                  onChange={e => setSelectedTeacherFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="All">{isKhmer ? 'គ្រូទាំងអស់ (All Teachers)' : 'All Teachers'}</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.department}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isKhmer ? 'ស្វែងរកមុខវិជ្ជា, ថ្នាក់, បន្ទប់...' : 'Search subject, class, room...'}
                value={subjectSearchQuery}
                onChange={e => setSubjectSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-hidden"
              />
            </div>
          </div>

          {/* Subject Cards Grid */}
          {filteredSubjectSchedules.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">
                {isKhmer ? 'ពុំមានកាលវិភាគមុខវិជ្ជាដែលត្រូវគ្នានឹងការស្វែងរកឡើយ' : 'No subject schedules found matching your filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjectSchedules.map(sub => {
                const teacher = teachers.find(t => t.id === sub.teacherId);
                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: sub.color || '#4F46E5' }}
                    />
                    <div>
                      {/* Header: Period & Time */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {sub.periodName}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{sub.startTime} - {sub.endTime}</span>
                        </div>
                      </div>

                      {/* Subject Title */}
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {sub.subject}
                      </h3>
                      {sub.khmerSubject && (
                        <p className="text-xs text-slate-500 font-khmer mt-0.5">
                          {sub.khmerSubject}
                        </p>
                      )}
                      <span className="text-[11px] font-mono text-indigo-600 font-bold block mt-1">
                        {sub.subjectCode}
                      </span>

                      {/* Class & Location */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{sub.gradeClass}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sub.room}</span>
                        </div>
                      </div>

                      {/* Assigned Teacher */}
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
                        {teacher?.photoUrl?.trim() ? (
                          <img
                            src={teacher.photoUrl.trim()}
                            alt={teacher.fullName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {sub.teacherName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isKhmer ? 'គ្រូបង្រៀន' : 'Assigned Teacher'}
                          </span>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {isKhmer && sub.khmerTeacherName ? sub.khmerTeacherName : sub.teacherName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {isKhmer ? `អនុគ្រោះ៖ ${sub.gracePeriodMinutes || 10} នាទី` : `Grace: ${sub.gracePeriodMinutes || 10}m`}
                      </span>
                      {!isTeacher && (
                        <div className="flex items-center gap-1">
                          {hasPermission('schedules.edit') && (
                            <button
                              onClick={() => handleOpenEditSubject(sub)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('schedules.delete') && (
                            <button
                              onClick={() => handleDeleteSubject(sub.id, sub.subject)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cards View (General Shifts & Organization Mon-Sat Weekly Grid) */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {isTeacher && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isKhmer
                  ? 'វេនការងារផ្លូវការដែលបានកំណត់សម្រាប់អ្នក (កាលវិភាគផ្ទាល់ខ្លួន)៖'
                  : 'Your assigned work shift schedule (Owned Schedule):'}
              </span>
            </div>
          )}

          {filteredGeneralSchedules.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Building className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">
                {isKhmer ? 'ពុំមានវេនការងារដែលបានកំណត់នៅឡើយទេ' : 'No assigned shift schedule found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGeneralSchedules.map(sch => {
                const isAssigned = isTeacher;
                return (
                  <div
                    key={sch.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Color Banner Accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: sch.color || '#3B82F6' }}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                              {sch.targetType}
                            </span>
                            <span className="text-xs text-indigo-700 font-semibold">
                              {sch.department}
                            </span>
                            {isAssigned && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {isKhmer ? 'វេនរបស់អ្នក' : 'Your Shift'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                            {sch.name}
                          </h3>
                        </div>

                        {!isTeacher && hasPermission('schedules.edit') && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(sch)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sch.id, sch.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Timing Badges */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Morning Session
                          </span>
                          <span className="text-base font-mono font-black text-slate-900">
                            {sch.startTime} — {sch.endTime}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Afternoon Session
                          </span>
                          <span className="text-base font-mono font-black text-slate-900">
                            {sch.afternoonStartTime ? `${sch.afternoonStartTime} — ${sch.afternoonEndTime}` : 'None (Half Day)'}
                          </span>
                        </div>
                      </div>

                      {/* Rules: Grace period & Absence detector */}
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            Grace Period:
                          </span>
                          <span className="font-bold text-slate-900">{sch.gracePeriodMinutes} minutes allowed</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            Auto-Absence Flag:
                          </span>
                          <span className="font-bold text-slate-900">{sch.absenceDetectionMinutes} min after shift start</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Assigned Location:
                          </span>
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]">{sch.location}</span>
                        </div>
                      </div>

                      {/* Applicable Days */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                          Active Days
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {monToSatDays.map(d => {
                            const isSelected = sch.daysOfWeek?.includes(d.index);
                            return (
                              <span
                                key={d.index}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-50 text-slate-300'
                                }`}
                              >
                                {isKhmer ? d.km : d.en}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Weekly Timetable View for Shifts with Mon-Sat headers */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isKhmer ? 'តារាងវេនការងារប្រចាំសប្តាហ៍ (ចន្ទ ដល់ សៅរ៍)' : 'Organization Weekly Shift Roster (Mon – Sat View)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isKhmer ? 'ទិដ្ឋភាពប្រចាំសប្តាហ៍សម្រាប់វេនការងារទូទៅ' : 'Weekly shift matrix showing active days Monday to Saturday'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-slate-900 text-white font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isKhmer ? 'ឈ្មោះកាលវិភាគ' : 'Schedule Name'}</th>
                    <th className="py-3 px-4">{isKhmer ? 'ម៉ោងវេន' : 'Shift Hours'}</th>
                    {monToSatDays.slice(0, 6).map(d => (
                      <th key={d.index} className="py-3 px-3 text-center">
                        <div>{d.en}</div>
                        <div className="text-[10px] text-indigo-300 font-khmer font-normal">({d.km})</div>
                      </th>
                    ))}
                    <th className="py-3 px-4">{isKhmer ? 'អនុគ្រោះ' : 'Grace'}</th>
                    <th className="py-3 px-4 text-right">{isKhmer ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(isTeacher ? filteredGeneralSchedules : schedules).map(sch => (
                    <tr key={sch.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>
                          {sch.name}
                          <span className="text-[10px] text-slate-400 font-normal block">{sch.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                        {sch.startTime} - {sch.endTime}
                      </td>
                      {monToSatDays.slice(0, 6).map(d => (
                        <td key={d.index} className="py-3 px-3 text-center">
                          {sch.daysOfWeek.includes(d.index) ? (
                            <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] leading-4">
                              ✓
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {sch.gracePeriodMinutes}{isKhmer ? 'ន' : 'm'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isTeacher ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {isKhmer ? 'វេនផ្ទាល់ខ្លួន' : 'Assigned'}
                            </span>
                          ) : (
                            <>
                              {hasPermission('schedules.edit') && (
                                <button
                                  onClick={() => handleOpenEdit(sch)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title={isKhmer ? 'កែប្រែ' : 'Edit'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {hasPermission('schedules.delete') && (
                                <button
                                  onClick={() => handleDelete(sch.id, sch.name)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title={isKhmer ? 'លុប' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingSchedule ? 'Edit Schedule' : 'Create Work Schedule'}
                </h3>
                <p className="text-xs text-slate-400">Define working hours, grace period and working days</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard High School Shift"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="All Departments">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Schedule Type
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={e => setFormData({ ...formData, targetType: e.target.value as ScheduleTargetType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Department">Department</option>
                    <option value="Individual">Individual</option>
                    <option value="Special">Special Event</option>
                  </select>
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Morning Start *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Morning End *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Afternoon Start (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.afternoonStartTime || ''}
                    onChange={e => setFormData({ ...formData, afternoonStartTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Afternoon End (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.afternoonEndTime || ''}
                    onChange={e => setFormData({ ...formData, afternoonEndTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Grace & Absence Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Grace Period (Minutes)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gracePeriodMinutes: systemGraceMinutes }))}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                      title="Sync from system setting"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Setting: {systemGraceMinutes}m
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.gracePeriodMinutes}
                    onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-indigo-600 font-semibold mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>Auto-synced from system setting ({systemGraceMinutes}m default)</span>
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Absence Deadline (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={formData.absenceDetectionMinutes}
                    onChange={e => setFormData({ ...formData, absenceDetectionMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500">e.g. 60m past start triggers absent</span>
                </div>
              </div>

              {/* Days of Week selector (Mon to Sat + Sun) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isKhmer ? 'ថ្ងៃធ្វើការប្រចាំសប្តាហ៍ (Days of Week)' : 'Scheduled Days of Week'}
                </label>
                <div className="flex items-center gap-1.5">
                  {monToSatDays.map(d => {
                    const isSelected = formData.daysOfWeek.includes(d.index);
                    return (
                      <button
                        type="button"
                        key={d.index}
                        onClick={() => toggleDay(d.index)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {isKhmer ? d.km : d.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                >
                  {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Subject Schedule Create / Edit Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {editingSubjectSchedule 
                      ? (isKhmer ? 'កែប្រែកាលវិភាគបង្រៀនមុខវិជ្ជា' : 'Edit Subject Schedule Period') 
                      : (isKhmer ? 'បន្ថែមម៉ោងបង្រៀនមុខវិជ្ជាថ្មី' : 'Create Subject Schedule Period')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKhmer 
                      ? 'កំណត់ព័ត៌មានមុខវិជ្ជា គ្រូបង្រៀន បន្ទប់សិក្សា ម៉ោងវេន និងរយៈពេលអនុគ្រោះ' 
                      : 'Assign teacher, subject title, room, classroom timetable, and grace period'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubject} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              
              {/* Teacher Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKhmer ? 'គ្រូបង្រៀនទទួលបន្ទុក (Assigned Teacher) *' : 'Assigned Teacher *'}
                </label>
                <select
                  required
                  value={subjectFormData.teacherId}
                  onChange={e => {
                    const selId = e.target.value;
                    const sel = teachers.find(t => t.id === selId);
                    setSubjectFormData(prev => ({
                      ...prev,
                      teacherId: selId,
                      teacherName: sel ? sel.fullName : '',
                      khmerTeacherName: sel?.khmerName || '',
                      hourlyRate: sel?.hourlyRate !== undefined ? sel.hourlyRate : prev.hourlyRate
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសគ្រូបង្រៀន --' : '-- Select Teacher --'}</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.department} {t.hourlyRate !== undefined ? `[Rate: $${t.hourlyRate}/h]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Title & Khmer Subject Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ឈ្មោះមុខវិជ្ជា (Subject Title) *' : 'Subject Title (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.subject || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, subject: e.target.value })}
                    placeholder="e.g. Advanced Mathematics"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ឈ្មោះមុខវិជ្ជាជាភាសាខ្មែរ (Khmer Subject)' : 'Khmer Subject Name'}
                  </label>
                  <input
                    type="text"
                    value={subjectFormData.khmerSubject || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, khmerSubject: e.target.value })}
                    placeholder="ឧទាហរណ៍៖ គណិតវិទ្យាកម្រិតខ្ពស់"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-khmer focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Subject Code & Grade/Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'កូដមុខវិជ្ជា (Subject Code)' : 'Subject Code'}
                  </label>
                  <input
                    type="text"
                    value={subjectFormData.subjectCode || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, subjectCode: e.target.value })}
                    placeholder="e.g. MATH-12A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ថ្នាក់ / បន្ទប់សិក្សា (Grade & Section) *' : 'Grade & Section *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.gradeClass || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, gradeClass: e.target.value })}
                    placeholder="e.g. Grade 12A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Classroom & Period Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'បន្ទប់សិក្សា (Room / Lab) *' : 'Classroom / Room *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.room || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, room: e.target.value })}
                    placeholder="e.g. Room 201 or Physics Lab"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ឈ្មោះវេន / ម៉ោងសិក្សា (Period Name) *' : 'Period Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.periodName || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, periodName: e.target.value })}
                    placeholder="e.g. Period 1 (07:30 - 09:00)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Period Presets */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {isKhmer ? 'ជ្រើសរើសម៉ោងគំរូរហ័ស (Quick Period Presets)' : 'Quick Timetable Presets'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPeriodManageModalOpen(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    + {isKhmer ? 'កែសម្រួល / បន្ថែមវេនម៉ោង' : 'Configure Periods'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(periods.filter(p => !p.isBreak && p.isActive !== false).length > 0
                    ? periods.filter(p => !p.isBreak && p.isActive !== false).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(p => ({
                        num: p.periodNumber,
                        name: `${p.periodName} (${p.startTime} - ${p.endTime})`,
                        start: p.startTime,
                        end: p.endTime
                      }))
                    : [
                        { num: 1, name: 'Period 1 (07:30 - 09:00)', start: '07:30', end: '09:00' },
                        { num: 2, name: 'Period 2 (09:15 - 10:45)', start: '09:15', end: '10:45' },
                        { num: 3, name: 'Period 3 (13:30 - 15:00)', start: '13:30', end: '15:00' },
                        { num: 4, name: 'Period 4 (15:15 - 16:45)', start: '15:15', end: '16:45' }
                      ]
                  ).map(p => (
                    <button
                      type="button"
                      key={p.num}
                      onClick={() => setSubjectFormData({
                        ...subjectFormData,
                        periodNumber: p.num,
                        periodName: p.name,
                        startTime: p.start,
                        endTime: p.end
                      })}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        subjectFormData.startTime === p.start && subjectFormData.endTime === p.end
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      P{p.num}: {p.start}-{p.end}
                    </button>
                  ))}
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ម៉ោងចាប់ផ្តើម (Start Time) *' : 'Period Start *'}
                  </label>
                  <input
                    type="time"
                    required
                    value={subjectFormData.startTime || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, startTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ម៉ោងបញ្ចប់ (End Time) *' : 'Period End *'}
                  </label>
                  <input
                    type="time"
                    required
                    value={subjectFormData.endTime || ''}
                    onChange={e => setSubjectFormData({ ...subjectFormData, endTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'ថ្ងៃបង្រៀនប្រចាំសប្តាហ៍ (Days of Week) *' : 'Scheduled Teaching Days *'}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {isKhmer ? 'ចុចដើម្បីបើក/បិទថ្ងៃ' : 'Click to toggle active days'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {monToSatDays.map(d => {
                    const isSelected = (subjectFormData.daysOfWeek || []).includes(d.index);
                    return (
                      <button
                        type="button"
                        key={d.index}
                        onClick={() => toggleSubjectDay(d.index)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {isKhmer ? d.km : d.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grace Period & Hourly Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      {isKhmer ? 'រយៈពេលអនុគ្រោះយឺត (Grace Period Minutes)' : 'Grace Period (Minutes)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setSubjectFormData(prev => ({ ...prev, gracePeriodMinutes: systemGraceMinutes }))}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                      title={isKhmer ? 'ធ្វើសមកាលកម្មតាមការកំណត់' : 'Sync with system setting'}
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      {isKhmer ? `ការកំណត់៖ ${systemGraceMinutes}ន` : `Setting: ${systemGraceMinutes}m`}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={subjectFormData.gracePeriodMinutes ?? systemGraceMinutes}
                    onChange={e => setSubjectFormData({ ...subjectFormData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>
                      {isKhmer
                        ? `បានធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិតាមការកំណត់ (${systemGraceMinutes} នាទី)`
                        : `Auto-synced from system setting (${systemGraceMinutes} mins default)`}
                    </span>
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-emerald-800">
                      {isKhmer ? 'អត្រាកម្រៃបង្រៀនម៉ោងនេះ ($/hr)' : 'Subject Teaching Rate ($/hr)'}
                    </label>
                    {selectedSubjectTeacher?.hourlyRate !== undefined && (
                      <button
                        type="button"
                        onClick={() => setSubjectFormData(prev => ({ ...prev, hourlyRate: selectedSubjectTeacher.hourlyRate }))}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                        title={isKhmer ? 'ធ្វើសមកាលកម្មពីប្រវត្តិរូបគ្រូ' : 'Sync from teacher profile rate'}
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        {isKhmer ? `ស្មើគ្រូ ($${selectedSubjectTeacher.hourlyRate}/h)` : `Teacher: $${selectedSubjectTeacher.hourlyRate}/h`}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder={selectedSubjectTeacher?.hourlyRate ? `Auto: $${selectedSubjectTeacher.hourlyRate}/h` : 'e.g. 25.00'}
                    value={subjectFormData.hourlyRate !== undefined ? subjectFormData.hourlyRate : ''}
                    onChange={e => setSubjectFormData({ 
                      ...subjectFormData, 
                      hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>
                      {selectedSubjectTeacher?.hourlyRate !== undefined
                        ? (isKhmer ? `បានធ្វើសមកាលកម្មពីប្រវត្តិរូបគ្រូ (${selectedSubjectTeacher.fullName}: $${selectedSubjectTeacher.hourlyRate}/ម៉ោង)` : `Auto-synced from teacher info (${selectedSubjectTeacher.fullName}: $${selectedSubjectTeacher.hourlyRate}/hr)`)
                        : (isKhmer ? 'មិនទាន់មានអត្រាក្នុងប្រវត្តិរូបគ្រូ (អាចបញ្ចូលដោយផ្ទាល់)' : 'No rate set on teacher profile (can enter custom rate)')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Card Color Theme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ពណ៌សម្គាល់កាលវិភាគ (Color Tag)' : 'Card Color Theme'}
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  {[
                    { code: '#4F46E5', label: 'Indigo' },
                    { code: '#10B981', label: 'Emerald' },
                    { code: '#2563EB', label: 'Blue' },
                    { code: '#7C3AED', label: 'Purple' },
                    { code: '#E11D48', label: 'Rose' },
                    { code: '#D97706', label: 'Amber' },
                    { code: '#0891B2', label: 'Cyan' }
                  ].map(c => (
                    <button
                      type="button"
                      key={c.code}
                      onClick={() => setSubjectFormData({ ...subjectFormData, color: c.code })}
                      style={{ backgroundColor: c.code }}
                      className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center text-white ${
                        subjectFormData.color === c.code ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                      }`}
                      title={c.label}
                    >
                      {subjectFormData.color === c.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subjectFormData.isActive}
                    onChange={e => setSubjectFormData({ ...subjectFormData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'បើកដំណើរការកាលវិភាគនេះ (Active Timetable Period)' : 'Active Timetable Period'}
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
                >
                  {editingSubjectSchedule 
                    ? (isKhmer ? 'រក្សាទុកការកែប្រែ' : 'Save Changes') 
                    : (isKhmer ? 'បង្កើតកាលវិភាគបង្រៀន' : 'Create Subject Period')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Import Teacher Schedule Modal */}
      <ImportTeacherScheduleModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          setSubjectSchedules(StorageService.getSubjectSchedules());
          showToast(
            isKhmer 
              ? `បាននាំចូលកាលវិភាគបង្រៀន ${count} ដោយជោគជ័យ!` 
              : `Successfully imported ${count} teacher schedules!`,
            'success'
          );
        }}
        teachers={teachers}
      />

      {/* Period Management Modal */}
      {isPeriodManageModalOpen && (
        <PeriodManagementModal
          isOpen={isPeriodManageModalOpen}
          onClose={() => setIsPeriodManageModalOpen(false)}
          periods={periods}
          subjectSchedules={subjectSchedules}
          onAddPeriod={(p) => StorageService.addPeriod(p)}
          onUpdatePeriod={(id, updates, syncClasses) => StorageService.updatePeriod(id, updates, syncClasses)}
          onDeletePeriod={(id) => StorageService.deletePeriod(id)}
          onResetDefaults={() => StorageService.resetPeriodsToDefault()}
          isKhmer={isKhmer}
        />
      )}

      {/* Academic Dates Modal */}
      {isAcademicDatesModalOpen && (
        <AcademicDatesModal
          isOpen={isAcademicDatesModalOpen}
          onClose={() => setIsAcademicDatesModalOpen(false)}
          onSaved={() => {
            setSystemSettings(StorageService.getSettings());
          }}
        />
      )}

      {/* Schedule QR Code Creator & Printable Door Sign Modal */}
      {isQRCodeModalOpen && (
        <ScheduleQRCodeModal
          isOpen={isQRCodeModalOpen}
          onClose={() => {
            setIsQRCodeModalOpen(false);
            setSelectedScheduleForQR(null);
            setSelectedTeacherForQR(null);
          }}
          initialSubjectSchedule={selectedScheduleForQR}
          initialTeacher={selectedTeacherForQR}
        />
      )}

      {/* Schedule QR Code Scanner & PIN Confirmation Modal */}
      {isQRScanModalOpen && (
        <ScheduleQRScanModal
          isOpen={isQRScanModalOpen}
          onClose={() => setIsQRScanModalOpen(false)}
        />
      )}

    </div>
  );
};
