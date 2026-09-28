import React, { useMemo } from 'react';
import {
  Clock,
  BookOpen,
  GraduationCap,
  MapPin,
  CheckCircle2,
  LogIn,
  LogOut,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  Building,
  User,
  AlertCircle
} from 'lucide-react';
import { TeacherSubjectSchedule, TimetablePeriod, Teacher, UserAccount } from '../../types/index.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';

export type DailySortColumn = 'period' | 'time' | 'subject' | 'grade' | 'room' | 'teacher' | 'status';
export type DailyGroupMode = 'period' | 'teacher' | 'flat';

interface DailyScheduleTableViewProps {
  classes: TeacherSubjectSchedule[];
  periods: TimetablePeriod[];
  teachers: Teacher[];
  attendanceList: any[];
  selectedDay: number;
  todayDayIndex: number;
  todayStr: string;
  isTeacher: boolean;
  currentUser: UserAccount;
  activeTeacher: Teacher | null;
  groupMode: DailyGroupMode;
  sortBy: DailySortColumn;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: DailySortColumn) => void;
  onCheckIn: (sub: TeacherSubjectSchedule, forceAdminOverride?: boolean) => void;
  onCheckOut: (sub: TeacherSubjectSchedule, forceAdminOverride?: boolean) => void;
  onEdit?: (sub: TeacherSubjectSchedule) => void;
  onDelete?: (id: string, name: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isKhmer: boolean;
}

export const DailyScheduleTableView: React.FC<DailyScheduleTableViewProps> = ({
  classes,
  periods,
  teachers,
  attendanceList,
  selectedDay,
  todayDayIndex,
  todayStr,
  isTeacher,
  currentUser,
  activeTeacher,
  groupMode,
  sortBy,
  sortOrder,
  onSortChange,
  onCheckIn,
  onCheckOut,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  isKhmer
}) => {
  const isClassToday = selectedDay === todayDayIndex;
  const curTimeStr = AttendanceEngine.getCurrentTimeString();
  const curMins = AttendanceEngine.timeToMinutes(curTimeStr);

  // Helper to resolve teacher profile
  const getTeacher = (teacherId?: string, teacherName?: string) => {
    return (
      teachers.find(
        t =>
          (teacherId && t.id === teacherId) ||
          (teacherId && t.teacherId?.toLowerCase() === teacherId.toLowerCase()) ||
          (teacherName && t.fullName.toLowerCase() === teacherName.toLowerCase())
      ) || null
    );
  };

  // Helper to extract attendance info for a class
  const getClassAttendanceInfo = (sub: TeacherSubjectSchedule) => {
    const todayRec = attendanceList.find(
      a =>
        a.date === todayStr &&
        (a.subjectScheduleId === sub.id ||
          (sub.teacherId && a.personId === sub.teacherId && (a.subject === sub.subject || a.periodName === sub.periodName)) ||
          (sub.teacherName &&
            a.personName?.toLowerCase() === sub.teacherName?.toLowerCase() &&
            (a.subject === sub.subject || a.periodName === sub.periodName)))
    );

    const isCheckedIn = Boolean(todayRec?.checkInTime);
    const isCheckedOut = Boolean(todayRec?.checkOutTime);
    const isLate = todayRec?.status === 'Late';

    const sStart = AttendanceEngine.timeToMinutes(sub.startTime);
    const sEnd = AttendanceEngine.timeToMinutes(sub.endTime);

    const isCurrentActive =
      isClassToday && ((isCheckedIn && !isCheckedOut) || (curMins >= sStart && curMins < sEnd && !isCheckedOut));
    const isUpcoming = isClassToday && curMins < sStart && !isCheckedIn;
    const isPassed = isClassToday && curMins >= sEnd && !isCheckedIn;

    return {
      todayRec,
      isCheckedIn,
      isCheckedOut,
      isLate,
      sStart,
      sEnd,
      isCurrentActive,
      isUpcoming,
      isPassed
    };
  };

  // Comparator for sorting classes
  const compareClasses = (a: TeacherSubjectSchedule, b: TeacherSubjectSchedule) => {
    let result = 0;

    switch (sortBy) {
      case 'period': {
        const pA = a.periodNumber || 0;
        const pB = b.periodNumber || 0;
        if (pA !== pB) {
          result = pA - pB;
        } else {
          result = a.startTime.localeCompare(b.startTime);
        }
        break;
      }
      case 'time': {
        const tA = AttendanceEngine.timeToMinutes(a.startTime);
        const tB = AttendanceEngine.timeToMinutes(b.startTime);
        if (tA !== tB) {
          result = tA - tB;
        } else {
          result = (a.periodNumber || 0) - (b.periodNumber || 0);
        }
        break;
      }
      case 'subject': {
        const subA = (isKhmer && a.khmerSubject ? a.khmerSubject : a.subject).toLowerCase();
        const subB = (isKhmer && b.khmerSubject ? b.khmerSubject : b.subject).toLowerCase();
        result = subA.localeCompare(subB);
        break;
      }
      case 'grade': {
        result = a.gradeClass.localeCompare(b.gradeClass);
        break;
      }
      case 'room': {
        result = a.room.localeCompare(b.room);
        break;
      }
      case 'teacher': {
        const nameA = a.teacherName.toLowerCase();
        const nameB = b.teacherName.toLowerCase();
        result = nameA.localeCompare(nameB);
        break;
      }
      case 'status': {
        const infoA = getClassAttendanceInfo(a);
        const infoB = getClassAttendanceInfo(b);
        // Priority: Active (1) > Checked In (2) > Upcoming (3) > Completed (4) > Passed (5)
        const getRank = (info: ReturnType<typeof getClassAttendanceInfo>) => {
          if (info.isCurrentActive) return 1;
          if (info.isCheckedIn && !info.isCheckedOut) return 2;
          if (info.isUpcoming) return 3;
          if (info.isCheckedOut) return 4;
          return 5;
        };
        result = getRank(infoA) - getRank(infoB);
        break;
      }
      default:
        result = a.startTime.localeCompare(b.startTime);
    }

    return sortOrder === 'asc' ? result : -result;
  };

  // Grouping classes by Period
  const periodGroups = useMemo(() => {
    if (groupMode !== 'period') return [];

    const map = new Map<
      number,
      {
        periodNumber: number;
        periodName: string;
        khmerPeriodName: string;
        startTime: string;
        endTime: string;
        sessionType: 'Morning' | 'Afternoon' | 'Evening';
        color?: string;
        classes: TeacherSubjectSchedule[];
      }
    >();

    classes.forEach(sub => {
      let pNum = sub.periodNumber || 0;
      if (!pNum) {
        const matched = periods.find(
          p =>
            p.startTime === sub.startTime ||
            (p.periodName && sub.periodName && p.periodName.toLowerCase() === sub.periodName.toLowerCase())
        );
        pNum = matched ? matched.periodNumber : 1;
      }

      const periodDef = periods.find(p => p.periodNumber === pNum);
      const sTime = sub.startTime || periodDef?.startTime || '07:30';
      const eTime = sub.endTime || periodDef?.endTime || '08:15';
      const sMinsVal = AttendanceEngine.timeToMinutes(sTime);
      const sessionType: 'Morning' | 'Afternoon' | 'Evening' =
        periodDef?.sessionType && periodDef.sessionType !== 'Break'
          ? periodDef.sessionType
          : sMinsVal < 720
          ? 'Morning'
          : sMinsVal < 1080
          ? 'Afternoon'
          : 'Evening';

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

    const groups = Array.from(map.values()).sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

    // Sort classes within each period group
    groups.forEach(g => {
      g.classes.sort(compareClasses);
    });

    return groups.map(g => {
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
  }, [classes, periods, groupMode, sortBy, sortOrder, isClassToday, curMins]);

  // Grouping classes by Teacher
  const teacherGroups = useMemo(() => {
    if (groupMode !== 'teacher') return [];

    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        khmerName?: string;
        department?: string;
        photoUrl?: string;
        classes: TeacherSubjectSchedule[];
      }
    >();

    classes.forEach(sub => {
      const key = sub.teacherId || sub.teacherName;
      const teacherObj = getTeacher(sub.teacherId, sub.teacherName);

      if (!map.has(key)) {
        map.set(key, {
          teacherId: key,
          teacherName: teacherObj?.fullName || sub.teacherName,
          khmerName: teacherObj?.khmerName || sub.khmerTeacherName,
          department: teacherObj?.department || 'Academic Faculty',
          photoUrl: teacherObj?.photoUrl,
          classes: []
        });
      }

      map.get(key)!.classes.push(sub);
    });

    const groups = Array.from(map.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    // Sort classes within each teacher group
    groups.forEach(g => {
      g.classes.sort(compareClasses);
    });

    return groups;
  }, [classes, teachers, groupMode, sortBy, sortOrder]);

  // Flat sorted classes
  const flatSortedClasses = useMemo(() => {
    if (groupMode !== 'flat') return [];
    return [...classes].sort(compareClasses);
  }, [classes, groupMode, sortBy, sortOrder]);

  // Header column sort helper
  const renderSortIndicator = (column: DailySortColumn) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors inline-block ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-indigo-600 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-indigo-600 inline-block ml-1" />
    );
  };

  // Render class row inside table
  const renderRow = (sub: TeacherSubjectSchedule, index: number, showTeacher = true, showPeriod = true) => {
    const info = getClassAttendanceInfo(sub);
    const teacherObj = getTeacher(sub.teacherId, sub.teacherName);
    const earlyBuffer = 30;
    const earliestAllowedMins = Math.max(0, info.sStart - earlyBuffer);
    const canCheckInNow = !isTeacher || (curMins >= earliestAllowedMins && curMins < info.sEnd);

    return (
      <tr
        key={sub.id}
        className={`group border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${
          info.isCurrentActive ? 'bg-emerald-50/40' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
        }`}
      >
        {/* Period & Bell Time */}
        {showPeriod && (
          <td className="py-3 px-3.5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: sub.color || '#4F46E5' }}
              >
                P{sub.periodNumber || 1}
              </span>
              <div>
                <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {sub.startTime} – {sub.endTime}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block">
                  {sub.periodName || `Period ${sub.periodNumber || 1}`}
                </span>
              </div>
            </div>
          </td>
        )}

        {/* Subject */}
        <td className="py-3 px-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-1.5 h-8 rounded-full shrink-0"
              style={{ backgroundColor: sub.color || '#4F46E5' }}
            />
            <div>
              <div className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-indigo-950 transition-colors">
                {sub.khmerSubject ? (
                  <>
                    <span>{sub.khmerSubject}</span>
                    {sub.subject && sub.subject !== sub.khmerSubject && (
                      <span className="text-xs text-slate-500 font-normal ml-1.5 hidden sm:inline">
                        ({sub.subject})
                      </span>
                    )}
                  </>
                ) : (
                  sub.subject
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {sub.subjectCode && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {sub.subjectCode}
                  </span>
                )}
                {sub.gracePeriodMinutes && (
                  <span className="text-[10px] text-slate-400">
                    {sub.gracePeriodMinutes}m grace
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* Grade & Room */}
        <td className="py-3 px-3.5 whitespace-nowrap">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <Building className="w-3 h-3 text-indigo-500" />
              <span>{sub.gradeClass}</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{sub.room}</span>
            </div>
          </div>
        </td>

        {/* Teacher & Department */}
        {showTeacher && (
          <td className="py-3 px-3.5">
            <div className="flex items-center gap-2.5">
              {teacherObj?.photoUrl ? (
                <img
                  src={teacherObj.photoUrl}
                  alt={sub.teacherName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {sub.teacherName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 truncate">
                  {sub.khmerTeacherName ? (
                    <>
                      <span>{sub.khmerTeacherName}</span>
                      <span className="text-slate-500 text-[11px] font-normal ml-1 hidden lg:inline">
                        ({sub.teacherName})
                      </span>
                    </>
                  ) : (
                    sub.teacherName
                  )}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {teacherObj?.department || 'Academic'}
                </div>
              </div>
            </div>
          </td>
        )}

        {/* Attendance Status */}
        <td className="py-3 px-3.5 whitespace-nowrap">
          {!isClassToday ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{isKhmer ? 'កាលវិភាគទៀងទាត់' : 'Scheduled'}</span>
            </span>
          ) : info.isCheckedOut ? (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{isKhmer ? `ចប់ម៉ោង (${info.todayRec?.checkOutTime})` : `Out: ${info.todayRec?.checkOutTime}`}</span>
              </span>
              <div className="text-[10px] text-slate-400 pl-1 font-mono">
                In: {info.todayRec?.checkInTime}
              </div>
            </div>
          ) : info.isCheckedIn ? (
            <div className="space-y-0.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                  info.isLate
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {info.isLate
                    ? isKhmer
                      ? `ចូលយឺត (${info.todayRec?.checkInTime})`
                      : `Late (${info.todayRec?.checkInTime})`
                    : isKhmer
                    ? `បានស្កេនចូល (${info.todayRec?.checkInTime})`
                    : `In: ${info.todayRec?.checkInTime}`}
                </span>
              </span>
              {info.isCurrentActive && (
                <div className="text-[10px] text-emerald-700 font-bold pl-1 animate-pulse">
                  {isKhmer ? 'កំពុងបង្រៀន...' : 'In Session Now'}
                </div>
              )}
            </div>
          ) : info.isCurrentActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-2xs animate-pulse">
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>{isKhmer ? 'កំពុងបង្រៀន (Active)' : 'Active Class'}</span>
            </span>
          ) : info.isUpcoming ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{isKhmer ? `ម៉ោងបន្ទាប់ (${sub.startTime})` : `Starts ${sub.startTime}`}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500">
              <AlertCircle className="w-3 h-3 text-slate-400" />
              <span>{isKhmer ? 'មិនទាន់ស្កេន' : 'Not Recorded'}</span>
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 px-3.5 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1.5">
            {/* Live Attendance Check-In / Check-Out */}
            {isClassToday && (
              <>
                {!info.isCheckedIn ? (
                  <button
                    type="button"
                    onClick={() => onCheckIn(sub, !canCheckInNow)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-2xs active:scale-95 cursor-pointer ${
                      curMins < info.sStart
                        ? 'bg-indigo-600 hover:bg-indigo-500'
                        : curMins >= info.sEnd
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                    title={
                      curMins < info.sStart
                        ? `Early Check In (Starts ${sub.startTime})`
                        : curMins >= info.sEnd
                        ? 'Record Late Attendance'
                        : 'Check In for Class'
                    }
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>
                      {curMins >= info.sEnd
                        ? isKhmer
                          ? 'ស្កេនចូលយឺត'
                          : 'Late Check In'
                        : isKhmer
                        ? 'ស្កេនចូល'
                        : 'Check In'}
                    </span>
                  </button>
                ) : !info.isCheckedOut ? (
                  <button
                    type="button"
                    onClick={() => onCheckOut(sub, true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Check out of class"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ស្កេនចេញ' : 'Check Out'}</span>
                  </button>
                ) : (
                  <span className="p-1.5 text-emerald-600" title="Attendance completed">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </>
            )}

            {/* Admin Edit & Delete buttons */}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(sub)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title={isKhmer ? 'កែប្រែម៉ោងបង្រៀន' : 'Edit Class Schedule'}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(sub.id, sub.subject)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title={isKhmer ? 'លុបម៉ោងបង្រៀន' : 'Delete Class Schedule'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Table column headers
  const renderTableHeader = (showTeacher = true, showPeriod = true) => (
    <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
      <tr>
        {showPeriod && (
          <th
            scope="col"
            className="py-3 px-3.5 text-left cursor-pointer hover:bg-slate-100 transition-colors group select-none"
            onClick={() => onSortChange('period')}
          >
            <div className="flex items-center gap-1">
              <span>{isKhmer ? 'វេន & ម៉ោង' : 'Period & Time'}</span>
              {renderSortIndicator('period')}
            </div>
          </th>
        )}
        <th
          scope="col"
          className="py-3 px-3.5 text-left cursor-pointer hover:bg-slate-100 transition-colors group select-none"
          onClick={() => onSortChange('subject')}
        >
          <div className="flex items-center gap-1">
            <span>{isKhmer ? 'មុខវិជ្ជា' : 'Subject'}</span>
            {renderSortIndicator('subject')}
          </div>
        </th>
        <th
          scope="col"
          className="py-3 px-3.5 text-left cursor-pointer hover:bg-slate-100 transition-colors group select-none"
          onClick={() => onSortChange('grade')}
        >
          <div className="flex items-center gap-1">
            <span>{isKhmer ? 'ថ្នាក់ & បន្ទប់' : 'Class & Room'}</span>
            {renderSortIndicator('grade')}
          </div>
        </th>
        {showTeacher && (
          <th
            scope="col"
            className="py-3 px-3.5 text-left cursor-pointer hover:bg-slate-100 transition-colors group select-none"
            onClick={() => onSortChange('teacher')}
          >
            <div className="flex items-center gap-1">
              <span>{isKhmer ? 'គ្រូបង្រៀន' : 'Teacher / Faculty'}</span>
              {renderSortIndicator('teacher')}
            </div>
          </th>
        )}
        <th
          scope="col"
          className="py-3 px-3.5 text-left cursor-pointer hover:bg-slate-100 transition-colors group select-none"
          onClick={() => onSortChange('status')}
        >
          <div className="flex items-center gap-1">
            <span>{isKhmer ? 'ស្ថានភាពវត្តមាន' : 'Attendance Status'}</span>
            {renderSortIndicator('status')}
          </div>
        </th>
        <th scope="col" className="py-3 px-3.5 text-right">
          <span>{isKhmer ? 'សកម្មភាព' : 'Actions'}</span>
        </th>
      </tr>
    </thead>
  );

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="font-black text-base text-slate-900">
          {isKhmer ? 'មិនមានម៉ោងបង្រៀនត្រូវបង្ហាញទេ' : 'No Classes Scheduled'}
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          {isKhmer
            ? 'មិនមានកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះ ឬលក្ខខណ្ឌចម្រោះបច្ចុប្បន្នឡើយ។'
            : 'There are no class schedules matching your day selection or search filters.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Group By Period Table View */}
      {groupMode === 'period' && (
        <div className="space-y-4">
          {periodGroups.map(group => (
            <div
              key={group.periodNumber}
              className={`bg-white rounded-2xl sm:rounded-3xl border shadow-xs overflow-hidden transition-all ${
                group.isCurrentActive
                  ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-slate-200'
              }`}
            >
              {/* Period Header Row */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
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

                  <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {group.startTime} – {group.endTime}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isClassToday && (
                    <>
                      {group.isCurrentActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>{isKhmer ? 'កំពុងបង្រៀន (Active)' : 'Active Period'}</span>
                        </span>
                      ) : group.isUpcoming ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          {isKhmer ? 'វេនបន្ទាប់' : 'Upcoming'}
                        </span>
                      ) : group.isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          {isKhmer ? 'បានបញ្ចប់' : 'Completed'}
                        </span>
                      ) : null}
                    </>
                  )}

                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                    {group.classes.length} {isKhmer ? 'ថ្នាក់/ម៉ោង' : group.classes.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {renderTableHeader(true, false)}
                  <tbody>
                    {group.classes.map((sub, idx) => renderRow(sub, idx, true, false))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Group By Teacher Table View */}
      {groupMode === 'teacher' && (
        <div className="space-y-4">
          {teacherGroups.map(group => (
            <div
              key={group.teacherId}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Teacher Header Row */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {group.photoUrl ? (
                    <img
                      src={group.photoUrl}
                      alt={group.teacherName}
                      className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {group.teacherName.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                    {group.classes.length} {isKhmer ? 'ម៉ោងបង្រៀនថ្ងៃនេះ' : group.classes.length === 1 ? 'class today' : 'classes today'}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {renderTableHeader(false, true)}
                  <tbody>
                    {group.classes.map((sub, idx) => renderRow(sub, idx, false, true))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Flat Unified Table View */}
      {groupMode === 'flat' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>
                {isKhmer ? 'បញ្ជីកាលវិភាគសរុប (Flat Schedule Table)' : 'All Classes Schedule Table'}
              </span>
            </div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
              {flatSortedClasses.length} {isKhmer ? 'ម៉ោងបង្រៀន' : 'Classes Total'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {renderTableHeader(true, true)}
              <tbody>
                {flatSortedClasses.map((sub, idx) => renderRow(sub, idx, true, true))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
