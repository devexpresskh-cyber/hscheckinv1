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
  Sliders
} from 'lucide-react';
import { ImportTeacherScheduleModal } from './ImportTeacherScheduleModal.tsx';
import { MonSatWeeklyTimetable } from './MonSatWeeklyTimetable.tsx';
import { PeriodManagementModal } from './PeriodManagementModal.tsx';

export const ScheduleManagement: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { t, isKhmer } = useLanguage();

  const [viewMode, setViewMode] = useState<'weekly_timetable' | 'subject_schedules' | 'cards'>('weekly_timetable');
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
  const [isPeriodManageModalOpen, setIsPeriodManageModalOpen] = useState(false);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSchedules(StorageService.getSchedules());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setPeriods(StorageService.getPeriods());
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setDepartments(StorageService.getDepartments());
      setLocations(StorageService.getLocations());
    });
    return unsub;
  }, []);

  const [subjectFormData, setSubjectFormData] = useState<TeacherSubjectSchedule>({
    id: '',
    teacherId: teachers[0]?.id || '',
    teacherName: teachers[0]?.fullName || '',
    khmerTeacherName: teachers[0]?.khmerName || '',
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
    gracePeriodMinutes: 10,
    color: '#4F46E5',
    isActive: true
  });

  const [formData, setFormData] = useState<Schedule>({
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
    gracePeriodMinutes: 10,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus - Central Building',
    isActive: true,
    color: '#3B82F6'
  });

  const handleOpenAdd = () => {
    setEditingSchedule(null);
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
      gracePeriodMinutes: 10,
      absenceDetectionMinutes: 60,
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
      gracePeriodMinutes: sch.gracePeriodMinutes ?? 10,
      absenceDetectionMinutes: sch.absenceDetectionMinutes ?? 60,
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
      gracePeriodMinutes: 10,
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
      gracePeriodMinutes: sub.gracePeriodMinutes ?? 10,
      hourlyRate: sub.hourlyRate,
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

  const filteredSubjectSchedules = subjectSchedules.filter(sub => {
    const matchesTeacher = selectedTeacherFilter === 'All' || sub.teacherId === selectedTeacherFilter;
    const q = subjectSearchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      sub.subject.toLowerCase().includes(q) ||
      (sub.khmerSubject && sub.khmerSubject.toLowerCase().includes(q)) ||
      sub.gradeClass.toLowerCase().includes(q) ||
      sub.room.toLowerCase().includes(q) ||
      sub.teacherName.toLowerCase().includes(q);
    return matchesTeacher && matchesQuery;
  });

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
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('weekly_timetable')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'weekly_timetable' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'កាលវិភាគសប្តាហ៍ (ចន្ទ-សៅរ៍)' : 'Weekly Timetable (Mon–Sat)'}</span>
            </button>
            <button
              onClick={() => setViewMode('subject_schedules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'subject_schedules' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'កាតមុខវិជ្ជា' : 'Subject Cards'}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'វេនទូទៅ' : 'General Shifts'}</span>
            </button>
          </div>

          {hasPermission('schedules.create') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPeriodManageModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-all active:scale-95"
                title="Manage School Timetable Periods & Bells"
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>{isKhmer ? 'កំណត់វេនម៉ោង' : 'Manage Periods'}</span>
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
        </div>
      </div>

      {/* Mon-Sat Header Weekly Timetable View */}
      {viewMode === 'weekly_timetable' && (
        <MonSatWeeklyTimetable
          subjectSchedules={subjectSchedules}
          teachers={teachers}
          onEditSchedule={handleOpenEditSubject}
          onDeleteSchedule={handleDeleteSubject}
          onAddForSlot={handleOpenAddSubjectForSlot}
          initialTeacherFilter={selectedTeacherFilter}
          canEdit={hasPermission('schedules.edit')}
          canDelete={hasPermission('schedules.delete')}
          canCreate={hasPermission('schedules.create')}
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
                        {teacher?.photoUrl ? (
                          <img
                            src={teacher.photoUrl}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map(sch => {
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
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                        {sch.name}
                      </h3>
                    </div>

                    {hasPermission('schedules.edit') && (
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
                        Absence Detection Threshold:
                      </span>
                      <span className="font-bold text-slate-900">{sch.absenceDetectionMinutes} minutes past start</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Location:
                      </span>
                      <span className="font-semibold text-slate-700">{sch.location}</span>
                    </div>
                  </div>

                    {/* Active Days (Mon-Sat standard) */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                        Working Days of Week
                      </span>
                      <div className="flex items-center gap-1.5">
                        {monToSatDays.map(d => {
                          const isWorking = sch.daysOfWeek.includes(d.index);
                          return (
                            <span
                              key={d.index}
                              className={`w-8 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                isWorking
                                  ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {isKhmer ? d.km : d.en}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Enforces check-in & check-out logs</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>

              </div>
            );
          })}
        </div>

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
                  {schedules.map(sch => (
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.gracePeriodMinutes}
                    onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500">e.g. 10m allowed late</span>
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
                    const sel = teachers.find(t => t.id === e.target.value);
                    setSubjectFormData({
                      ...subjectFormData,
                      teacherId: e.target.value,
                      teacherName: sel ? sel.fullName : '',
                      khmerTeacherName: sel?.khmerName || ''
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសគ្រូបង្រៀន --' : '-- Select Teacher --'}</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.department}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'រយៈពេលអនុគ្រោះយឺត (Grace Period Minutes)' : 'Grace Period (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={subjectFormData.gracePeriodMinutes || 10}
                    onChange={e => setSubjectFormData({ ...subjectFormData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {isKhmer ? 'អនុញ្ញាតឱ្យចូលយឺតអតិបរមាដោយមិនកត់ត្រាជាយឺត' : 'Late threshold in minutes before flagged as late'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    {isKhmer ? 'អត្រាកម្រៃបង្រៀនម៉ោងនេះ ($/hr)' : 'Subject Teaching Rate ($/hr)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Leave empty for teacher default"
                    value={subjectFormData.hourlyRate !== undefined ? subjectFormData.hourlyRate : ''}
                    onChange={e => setSubjectFormData({ 
                      ...subjectFormData, 
                      hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    {isKhmer ? 'ទុកនៅទទេបើចង់ប្រើអត្រាកម្រៃគោលរបស់គ្រូ' : 'Overrides teacher base rate for wage calculation'}
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

    </div>
  );
};
