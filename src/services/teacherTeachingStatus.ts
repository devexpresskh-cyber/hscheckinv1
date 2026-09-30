import { Teacher, TeacherSubjectSchedule, AttendanceRecord } from '../types/index.ts';

export interface TeacherLiveTeachingInfo {
  teacher: Teacher;
  status: 'teaching' | 'upcoming' | 'completed' | 'off';
  currentSchedule?: TeacherSubjectSchedule;
  upcomingSchedules: TeacherSubjectSchedule[];
  nextUpcomingSchedule?: TeacherSubjectSchedule;
  completedSchedules: TeacherSubjectSchedule[];
  allTodaySchedules: TeacherSubjectSchedule[];
  minutesRemainingInCurrent?: number;
  minutesElapsedInCurrent?: number;
  totalDurationMinutes?: number;
  progressPercentage?: number;
  todayAttendanceRecord?: AttendanceRecord;
  isCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  totalClassesToday: number;
  totalWeeklyClasses: number;
  totalWeeklyHours: number;
}

export interface TeachingFacultySummary {
  totalFaculty: number;
  currentlyTeachingCount: number;
  scheduledTodayCount: number;
  completedTodayCount: number;
  offTodayCount: number;
  checkedInTodayCount: number;
}

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export const TeacherTeachingService = {
  /**
   * Computes the live teaching status for a single faculty member
   */
  getTeacherLiveStatus(
    teacher: Teacher,
    allSubjectSchedules: TeacherSubjectSchedule[],
    attendanceRecords: AttendanceRecord[],
    currentDate: Date = new Date()
  ): TeacherLiveTeachingInfo {
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const currentHours = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const ty = currentDate.getFullYear();
    const tm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const td = String(currentDate.getDate()).padStart(2, '0');
    const todayDateStr = `${ty}-${tm}-${td}`;

    // Filter all active schedules for this teacher
    const teacherWeeklySchedules = allSubjectSchedules.filter(
      s => (s.teacherId === teacher.id ||
            (teacher.teacherId && s.teacherId?.toLowerCase() === teacher.teacherId.toLowerCase()) ||
            (s.teacherName && teacher.fullName && s.teacherName.trim().toLowerCase() === teacher.fullName.trim().toLowerCase())) &&
           s.isActive
    );

    // Filter schedules active for today
    const todaySchedules = teacherWeeklySchedules
      .filter(s => {
        if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
          return s.daysOfWeek.includes(dayOfWeek);
        }
        return s.dayOfWeek === dayOfWeek;
      })
      .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

    // Calculate weekly metrics
    let totalWeeklyMinutes = 0;
    teacherWeeklySchedules.forEach(s => {
      const daysCount = Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0 ? s.daysOfWeek.length : 1;
      const duration = Math.max(0, timeStringToMinutes(s.endTime) - timeStringToMinutes(s.startTime));
      totalWeeklyMinutes += duration * daysCount;
    });
    const totalWeeklyHours = Math.round((totalWeeklyMinutes / 60) * 10) / 10;

    // Check today's attendance record for this teacher (matches ID, teacher code, or full name)
    const todayAttendance = attendanceRecords.find(a => {
      const isDate = a.date === todayDateStr;
      if (!isDate) return false;
      const isPerson =
        a.personId === teacher.id ||
        (teacher.teacherId && a.personId.toLowerCase() === teacher.teacherId.toLowerCase()) ||
        (a.personName && teacher.fullName && a.personName.trim().toLowerCase() === teacher.fullName.trim().toLowerCase()) ||
        (teacher.khmerName && a.khmerName && a.khmerName.trim() === teacher.khmerName.trim());
      return isPerson && Boolean(a.checkInTime);
    });
    const isCheckedIn = Boolean(todayAttendance && todayAttendance.checkInTime);
    const checkInTime = todayAttendance?.checkInTime;
    const checkOutTime = todayAttendance?.checkOutTime;

    // If teacher has no schedules today
    if (todaySchedules.length === 0) {
      return {
        teacher,
        status: 'off',
        upcomingSchedules: [],
        completedSchedules: [],
        allTodaySchedules: [],
        isCheckedIn,
        checkInTime,
        checkOutTime,
        todayAttendanceRecord: todayAttendance,
        totalClassesToday: 0,
        totalWeeklyClasses: teacherWeeklySchedules.length,
        totalWeeklyHours
      };
    }

    // Determine current, upcoming, completed classes today
    let currentSchedule: TeacherSubjectSchedule | undefined;
    const upcomingSchedules: TeacherSubjectSchedule[] = [];
    const completedSchedules: TeacherSubjectSchedule[] = [];

    todaySchedules.forEach(s => {
      const startMin = timeStringToMinutes(s.startTime);
      const endMin = timeStringToMinutes(s.endTime);

      if (currentTotalMinutes >= startMin && currentTotalMinutes <= endMin) {
        currentSchedule = s;
      } else if (currentTotalMinutes < startMin) {
        upcomingSchedules.push(s);
      } else {
        completedSchedules.push(s);
      }
    });

    // Determine overall status
    let status: 'teaching' | 'upcoming' | 'completed' | 'off' = 'off';
    let minutesRemainingInCurrent: number | undefined;
    let minutesElapsedInCurrent: number | undefined;
    let totalDurationMinutes: number | undefined;
    let progressPercentage: number | undefined;

    if (currentSchedule) {
      status = 'teaching';
      const startMin = timeStringToMinutes(currentSchedule.startTime);
      const endMin = timeStringToMinutes(currentSchedule.endTime);
      totalDurationMinutes = Math.max(1, endMin - startMin);
      minutesElapsedInCurrent = Math.max(0, currentTotalMinutes - startMin);
      minutesRemainingInCurrent = Math.max(0, endMin - currentTotalMinutes);
      progressPercentage = Math.min(100, Math.round((minutesElapsedInCurrent / totalDurationMinutes) * 100));
    } else if (upcomingSchedules.length > 0) {
      status = 'upcoming';
    } else if (completedSchedules.length > 0) {
      status = 'completed';
    }

    return {
      teacher,
      status,
      currentSchedule,
      upcomingSchedules,
      nextUpcomingSchedule: upcomingSchedules[0],
      completedSchedules,
      allTodaySchedules: todaySchedules,
      minutesRemainingInCurrent,
      minutesElapsedInCurrent,
      totalDurationMinutes,
      progressPercentage,
      todayAttendanceRecord: todayAttendance,
      isCheckedIn,
      checkInTime,
      checkOutTime,
      totalClassesToday: todaySchedules.length,
      totalWeeklyClasses: teacherWeeklySchedules.length,
      totalWeeklyHours
    };
  },

  /**
   * Computes live status across all faculty members and aggregate summary
   */
  getAllFacultyLiveStatus(
    teachers: Teacher[],
    allSubjectSchedules: TeacherSubjectSchedule[],
    attendanceRecords: AttendanceRecord[],
    currentDate: Date = new Date()
  ): {
    list: TeacherLiveTeachingInfo[];
    summary: TeachingFacultySummary;
  } {
    const list = teachers.map(teacher =>
      this.getTeacherLiveStatus(teacher, allSubjectSchedules, attendanceRecords, currentDate)
    );

    const summary: TeachingFacultySummary = {
      totalFaculty: list.length,
      currentlyTeachingCount: list.filter(item => item.status === 'teaching').length,
      scheduledTodayCount: list.filter(item => item.allTodaySchedules.length > 0).length,
      completedTodayCount: list.filter(item => item.status === 'completed').length,
      offTodayCount: list.filter(item => item.status === 'off').length,
      checkedInTodayCount: list.filter(item => item.isCheckedIn).length
    };

    return { list, summary };
  }
};
