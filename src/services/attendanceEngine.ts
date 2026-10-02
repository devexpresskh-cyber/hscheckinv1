import {
  AttendanceRecord,
  AttendanceStatus,
  Schedule,
  Teacher,
  Employee,
  Holiday,
  LeaveRequest,
  SystemSettings,
  TeacherSubjectSchedule
} from '../types/index.ts';
import { StorageService } from './storageService.ts';
import { TelegramService } from './telegramService.ts';

export interface CheckInResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}

export interface CheckOutResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}

export const AttendanceEngine = {
  // Convert 'HH:mm' to minutes from midnight
  timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  },

  // Convert minutes from midnight to 'HH:mm'
  minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.floor(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  // Get current time string 'HH:mm'
  getCurrentTimeString(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  },

  // Get current date 'YYYY-MM-DD' in local timezone
  getCurrentDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Haversine distance in meters
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  // Verify geofence
  verifyLocation(lat: number, lon: number, settings: SystemSettings): { inside: boolean; distance: number } {
    const distance = this.calculateDistance(
      lat,
      lon,
      settings.defaultLocationLatitude,
      settings.defaultLocationLongitude
    );
    const inside = distance <= settings.geofenceRadiusMeters;
    return { inside, distance };
  },

  // Find assigned schedule for teacher or employee
  getScheduleForPerson(scheduleId: string, department: string): Schedule {
    const schedules = StorageService.getSchedules();
    const directMatch = schedules.find(s => s.id === scheduleId && s.isActive);
    if (directMatch) return directMatch;

    const deptMatch = schedules.find(s => s.department === department && s.isActive);
    if (deptMatch) return deptMatch;

    const standard = schedules.find(s => s.targetType === 'Standard' && s.isActive);
    if (standard) return standard;

    return schedules[0];
  },

  // Verify if a teacher subject schedule is at the present time
  isSubjectScheduleAtPresentTime(
    subjectSchedule: TeacherSubjectSchedule,
    currentTimeStr: string,
    dateStr?: string,
    earlyBufferMinutes: number = 30 // Allow teachers to check in up to 30 mins before class starts to prepare!
  ): {
    isValid: boolean;
    reason?: 'day_mismatch' | 'too_early' | 'too_late';
    message?: string;
    khmerMessage?: string;
    startsInMinutes?: number;
    endedMinutesAgo?: number;
  } {
    const today = dateStr || this.getCurrentDateString();
    const [year, month, day] = today.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const todayDayOfWeek = dateObj.getDay();

    const scheduledDays = subjectSchedule.daysOfWeek && subjectSchedule.daysOfWeek.length > 0
      ? subjectSchedule.daysOfWeek
      : [subjectSchedule.dayOfWeek];

    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesKm = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

    if (!scheduledDays.includes(todayDayOfWeek)) {
      const scheduledDayNames = scheduledDays.map(d => dayNamesEn[d]).join(', ');
      return {
        isValid: false,
        reason: 'day_mismatch',
        message: `Cannot scan in: "${subjectSchedule.subject}" (${subjectSchedule.periodName}) is not scheduled for today (${dayNamesEn[todayDayOfWeek]}). Scheduled days: ${scheduledDayNames}.`,
        khmerMessage: `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ មុខវិជ្ជា "${subjectSchedule.khmerSubject || subjectSchedule.subject}" (${subjectSchedule.periodName}) គ្មានកាលវិភាគបង្រៀននៅថ្ងៃនេះ (${dayNamesKm[todayDayOfWeek]}) ទេ។`
      };
    }

    const sStart = this.timeToMinutes(subjectSchedule.startTime);
    const sEnd = this.timeToMinutes(subjectSchedule.endTime);
    const cur = this.timeToMinutes(currentTimeStr);

    // Early buffer: allow check-in up to earlyBufferMinutes (default 30) before class start
    const earliestAllowed = Math.max(0, sStart - earlyBufferMinutes);
    if (cur < earliestAllowed) {
      const waitMins = sStart - cur;
      return {
        isValid: false,
        reason: 'too_early',
        startsInMinutes: waitMins,
        message: `Cannot scan in yet: "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) starts in ${waitMins} minute(s). Early check-in opens ${earlyBufferMinutes}m before class.`,
        khmerMessage: `មិនទាន់ដល់ម៉ោងស្កេនចូលទេ៖ មុខវិជ្ជា "${subjectSchedule.khmerSubject || subjectSchedule.subject}" (${subjectSchedule.startTime} - ${subjectSchedule.endTime}) នៅសល់ ${waitMins} នាទីទៀតទើបចាប់ផ្តើម (អាចស្កេនមុនបាន ${earlyBufferMinutes} នាទី)។`
      };
    }

    // Schedule has ended
    if (cur >= sEnd) {
      const pastMins = cur - sEnd;
      return {
        isValid: false,
        reason: 'too_late',
        endedMinutesAgo: pastMins,
        message: `Schedule ended: "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) ended at ${subjectSchedule.endTime} (${pastMins}m ago).`,
        khmerMessage: `ម៉ោងបង្រៀនបានបញ្ចប់៖ មុខវិជ្ជា "${subjectSchedule.khmerSubject || subjectSchedule.subject}" បានចប់នៅម៉ោង ${subjectSchedule.endTime} រួចហើយ (${pastMins} នាទីមុន)។`
      };
    }

    return {
      isValid: true
    };
  },

  // Determine late status
  evaluateCheckInStatus(checkInTimeStr: string, scheduledStartTimeStr: string, gracePeriodMinutes: number): {
    status: AttendanceStatus;
    lateMinutes: number;
  } {
    const checkInMins = this.timeToMinutes(checkInTimeStr);
    const scheduledMins = this.timeToMinutes(scheduledStartTimeStr);
    const allowedGraceDeadline = scheduledMins + gracePeriodMinutes;

    if (checkInMins <= allowedGraceDeadline) {
      return { status: 'Present', lateMinutes: 0 };
    } else {
      const lateMinutes = checkInMins - scheduledMins;
      return { status: 'Late', lateMinutes };
    }
  },

  // Determine early leave & overtime on check-out
  evaluateCheckOutStatus(checkOutTimeStr: string, scheduledEndTimeStr: string, isTeacher: boolean = false): {
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
  } {
    const checkOutMins = this.timeToMinutes(checkOutTimeStr);
    const scheduledEndMins = this.timeToMinutes(scheduledEndTimeStr);

    if (checkOutMins < scheduledEndMins) {
      return {
        earlyLeaveMinutes: scheduledEndMins - checkOutMins,
        overtimeMinutes: 0
      };
    } else if (checkOutMins > scheduledEndMins) {
      return {
        earlyLeaveMinutes: 0,
        // Overtime is disabled for teachers
        overtimeMinutes: isTeacher ? 0 : checkOutMins - scheduledEndMins
      };
    }
    return { earlyLeaveMinutes: 0, overtimeMinutes: 0 };
  },

  // Find the matching attendance record for a teacher subject schedule on a given date
  findRecordForSubjectSchedule(
    sub: TeacherSubjectSchedule,
    records: AttendanceRecord[],
    dateStr: string,
    teachersList?: Teacher[]
  ): AttendanceRecord | undefined {
    if (!sub || !records || records.length === 0) return undefined;

    const allTeachers = teachersList && teachersList.length > 0 ? teachersList : StorageService.getTeachers();
    const lowSubTeachId = (sub.teacherId || '').trim().toLowerCase();
    const lowSubTeachName = (sub.teacherName || '').trim().toLowerCase();
    const khmerSubTeachName = (sub.khmerTeacherName || '').trim();

    const teacherObj = allTeachers.find(
      t =>
        (lowSubTeachId && t.id?.toLowerCase() === lowSubTeachId) ||
        (lowSubTeachId && t.teacherId?.toLowerCase() === lowSubTeachId) ||
        (lowSubTeachName && t.fullName?.toLowerCase() === lowSubTeachName) ||
        (khmerSubTeachName && t.khmerName === khmerSubTeachName)
    );

    const isTeacherOwner = (a: AttendanceRecord) => {
      const pId = (a.personId || '').trim().toLowerCase();
      const pName = (a.personName || '').trim().toLowerCase();
      const pKhmer = (a.khmerName || '').trim();

      if (lowSubTeachId && pId === lowSubTeachId) return true;
      if (teacherObj) {
        if (teacherObj.id && pId === teacherObj.id.toLowerCase()) return true;
        if (teacherObj.teacherId && pId === teacherObj.teacherId.toLowerCase()) return true;
        if (teacherObj.fullName && pName === teacherObj.fullName.trim().toLowerCase()) return true;
        if (teacherObj.khmerName && (pKhmer === teacherObj.khmerName || pName === teacherObj.khmerName.toLowerCase())) return true;
      }
      if (lowSubTeachName && pName === lowSubTeachName) return true;
      if (khmerSubTeachName && (pKhmer === khmerSubTeachName || pName === khmerSubTeachName.toLowerCase())) return true;
      return false;
    };

    // Filter to records for this date
    const dateRecords = records.filter(a => {
      const recDate = String(a.date || '').slice(0, 10);
      return recDate === dateStr;
    });

    // 1. Direct subjectScheduleId match (with teacher ownership confirmation)
    const directWithTeacher = dateRecords.find(
      a => (a.subjectScheduleId === sub.id || a.scheduleId === sub.id) && isTeacherOwner(a)
    );
    if (directWithTeacher) return directWithTeacher;

    const directAny = dateRecords.find(
      a => a.subjectScheduleId === sub.id || a.scheduleId === sub.id
    );
    if (directAny) return directAny;

    // Filter to this teacher's records for today
    const teacherRecords = dateRecords.filter(isTeacherOwner);
    if (teacherRecords.length === 0) return undefined;

    // Strictly exclude any records that are already bound to a DIFFERENT subject schedule ID
    // This prevents cross-contamination between different, overlapping, or future classes.
    const unclaimedTeacherRecords = teacherRecords.filter(a => {
      if (a.subjectScheduleId && a.subjectScheduleId !== sub.id) return false;
      if (a.scheduleId && a.scheduleId !== sub.id && a.scheduleId.startsWith('sch-sub-')) return false;
      return true;
    });
    if (unclaimedTeacherRecords.length === 0) return undefined;

    // 2. Exact subject name & scheduled start time (among unclaimed records only)
    const lowSubName = (sub.subject || '').trim().toLowerCase();
    const khmerSubName = (sub.khmerSubject || '').trim();
    const bySubAndStart = unclaimedTeacherRecords.find(a => {
      const matchStart = a.scheduledStart === sub.startTime;
      const matchSubject =
        (a.subject && a.subject.trim().toLowerCase() === lowSubName) ||
        (khmerSubName && a.khmerSubject === khmerSubName) ||
        (khmerSubName && a.subject === khmerSubName);
      return matchStart && matchSubject;
    });
    if (bySubAndStart) return bySubAndStart;

    // 3. Exact scheduled start time
    const byStart = unclaimedTeacherRecords.find(a => a.scheduledStart === sub.startTime);
    if (byStart) return byStart;

    // 4. Exact periodName
    if (sub.periodName) {
      const lowPeriod = sub.periodName.trim().toLowerCase();
      const byPeriod = unclaimedTeacherRecords.find(a => a.periodName && a.periodName.trim().toLowerCase() === lowPeriod);
      if (byPeriod) return byPeriod;
    }

    // 5. Match by check-in time during class window [startTime - 30m, endTime + 15m]
    const subStartMins = this.timeToMinutes(sub.startTime);
    const subEndMins = this.timeToMinutes(sub.endTime);
    const byTimeWindow = unclaimedTeacherRecords.find(a => {
      if (!a.checkInTime) return false;
      const inMins = this.timeToMinutes(a.checkInTime);
      return inMins >= Math.max(0, subStartMins - 30) && inMins <= (subEndMins + 15);
    });
    if (byTimeWindow) return byTimeWindow;

    // 6. If scheduleId matches sub.id
    const byScheduleId = unclaimedTeacherRecords.find(a => a.scheduleId === sub.id);
    if (byScheduleId) return byScheduleId;

    return undefined;
  },

  // Process Check-in
  processCheckIn(params: {
    personId: string;
    personType: 'teacher' | 'employee';
    personName: string;
    khmerName?: string;
    department: string;
    scheduleId?: string;
    subjectScheduleId?: string;
    customTime?: string;
    latitude?: number;
    longitude?: number;
    ipAddress?: string;
    deviceInfo?: string;
    bypassGeofence?: boolean;
    bypassScheduleWindow?: boolean;
    allowEarlyCheckInMinutes?: number;
    shiftType?: 'morning' | 'evening';
    session?: 'morning' | 'afternoon' | 'evening';
  }): CheckInResult {
    const today = this.getCurrentDateString();
    const currentTime = params.customTime || this.getCurrentTimeString();
    const currentMins = this.timeToMinutes(currentTime);
    const systemSettings = StorageService.getSystemSettings();

    let subjectSchedule = params.subjectScheduleId
      ? StorageService.getSubjectSchedules().find(s => s.id === params.subjectScheduleId)
      : undefined;

    // Requirement: Teachers check in by subject schedule
    if (params.personType === 'teacher') {
      const allTeachers = StorageService.getTeachers();

      // If a specific subject schedule was selected/provided
      if (subjectSchedule) {
        const schedTeacher = allTeachers.find(
          t => t.id === subjectSchedule!.teacherId ||
               t.teacherId?.toLowerCase() === subjectSchedule!.teacherId?.toLowerCase() ||
               t.fullName.toLowerCase() === subjectSchedule!.teacherName.toLowerCase()
        );

        const currentTeacher = allTeachers.find(
          t => t.id === params.personId ||
               t.teacherId?.toLowerCase() === params.personId?.toLowerCase() ||
               t.fullName.toLowerCase() === params.personName.toLowerCase()
        );

        const isOwner =
          subjectSchedule.teacherId === params.personId ||
          subjectSchedule.teacherId.toLowerCase() === params.personId.toLowerCase() ||
          subjectSchedule.teacherName.toLowerCase() === params.personName.toLowerCase() ||
          (schedTeacher && currentTeacher && (schedTeacher.id === currentTeacher.id || schedTeacher.teacherId === currentTeacher.teacherId)) ||
          params.bypassScheduleWindow; // admin or manual schedule check-in

        if (!isOwner) {
          return {
            success: false,
            message: `Check-in rejected: Selected subject schedule (${subjectSchedule.subject}) does not belong to ${params.personName}.`
          };
        }

        // Check time window if not bypassed
        if (!params.bypassScheduleWindow) {
          const earlyBuffer = params.allowEarlyCheckInMinutes ?? 30;
          const timeCheck = this.isSubjectScheduleAtPresentTime(subjectSchedule, currentTime, today, earlyBuffer);
          if (!timeCheck.isValid) {
            return {
              success: false,
              message: timeCheck.message || `Check-in denied: Selected schedule "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) is not in active window.`
            };
          }
        }
      } else {
        const teacherSubjects = StorageService.getSubjectSchedulesForTeacher(params.personId);
        if (teacherSubjects.length === 0) {
          return {
            success: false,
            message: `Check-in rejected: Teachers must check in by subject schedule, but ${params.personName} has no subject class schedules assigned. Please assign or create a subject schedule first.`
          };
        }

        // Teacher scanned without specifying a subject -> Auto-find the scheduled class active at the PRESENT TIME (with early buffer)
        const earlyBuffer = params.allowEarlyCheckInMinutes ?? 30;
        const activeNow = teacherSubjects.find(s => {
          return this.isSubjectScheduleAtPresentTime(s, currentTime, today, earlyBuffer).isValid;
        });

        if (activeNow) {
          subjectSchedule = activeNow;
        } else {
          return {
            success: false,
            message: `Check-in denied: No scheduled class is active for ${params.personName} at the present time (${currentTime}). Teachers cannot scan into schedules outside of their active teaching hours.`
          };
        }
      }
    }

    const schedule = this.getScheduleForPerson(params.scheduleId || 'sch-standard-fulltime', params.department);
    
    // For employees: support both shifts (Morning & Evening)
    const isExplicitEvening = params.shiftType === 'evening' || params.session === 'afternoon' || params.session === 'evening';
    const isExplicitMorning = params.shiftType === 'morning' || params.session === 'morning';

    const existingRecords = StorageService.getAttendance().filter(
      r => r.personId === params.personId && r.date === today && !r.subjectScheduleId
    );
    const existingMorning = existingRecords.find(
      r => r.session === 'morning' || (!r.session && !r.scheduleName?.includes('Evening'))
    );

    const morningStart = schedule.startTime || '08:00';
    const morningEnd = schedule.endTime || '12:00';
    const eveningStart = schedule.afternoonStartTime || '13:30';
    const eveningEnd = schedule.afternoonEndTime || '17:30';

    let isEveningShift = false;
    if (params.personType === 'employee') {
      if (isExplicitEvening) {
        isEveningShift = true;
      } else if (isExplicitMorning) {
        isEveningShift = false;
      } else {
        // Auto-detect: if morning is already checked in and current time is past morning end, or current time is >= 12:30
        if (existingMorning?.checkInTime && currentMins >= this.timeToMinutes(morningEnd)) {
          isEveningShift = true;
        } else if (currentMins >= 12 * 60 + 30) {
          isEveningShift = true;
        } else {
          isEveningShift = false;
        }
      }
    }

    const scheduledStartTime = subjectSchedule
      ? subjectSchedule.startTime
      : (params.personType === 'employee' ? (isEveningShift ? eveningStart : morningStart) : schedule.startTime);
    const scheduledEndTime = subjectSchedule
      ? subjectSchedule.endTime
      : (params.personType === 'employee' ? (isEveningShift ? eveningEnd : morningEnd) : schedule.endTime);
    const gracePeriod = subjectSchedule?.gracePeriodMinutes || schedule.gracePeriodMinutes || systemSettings.defaultGracePeriod;

    const scheduledStartMins = this.timeToMinutes(scheduledStartTime);
    const scheduledEndMins = this.timeToMinutes(scheduledEndTime);

    // Validation: Early check-in window (Strictly for teachers only; employees can check in before shift time)
    const earlyBuffer = params.allowEarlyCheckInMinutes ?? 30;
    const earliestAllowedMins = Math.max(0, scheduledStartMins - earlyBuffer);
    if (!params.bypassScheduleWindow && params.personType === 'teacher' && currentMins < earliestAllowedMins) {
      const waitMins = scheduledStartMins - currentMins;
      const targetLabel = subjectSchedule
        ? `"${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime})`
        : `shift "${schedule.name}" (${schedule.startTime} - ${schedule.endTime})`;
      return {
        success: false,
        message: `Check-in denied: Current time (${currentTime}) is before check-in window for ${targetLabel}. Starts in ${waitMins} minute(s). Early check-in opens ${earlyBuffer}m before class.`
      };
    }

    // Validation: Over scheduled end-time check (Strictly for teachers only; employees can check in after shift time)
    if (params.personType === 'teacher' && currentMins >= scheduledEndMins) {
      const targetLabel = subjectSchedule
        ? `"${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime})`
        : `shift "${schedule.name}" (${schedule.startTime} - ${schedule.endTime})`;
      return {
        success: false,
        message: `Check-in denied: Schedule period has already ended (${scheduledEndTime}) for ${targetLabel}. Teachers are strictly not allowed to scan into overtime or completed schedules.`
      };
    }

    // Check for ongoing overlapping class session that has not checked out yet
    // Teachers must complete or checkout of their active class before clocking into another period
    if (params.personType === 'teacher' && subjectSchedule) {
      const activeUnfinishedSession = StorageService.getAttendance().find(r => {
        return (
          r.personId === params.personId &&
          r.date === today &&
          r.checkInTime &&
          !r.checkOutTime &&
          r.subjectScheduleId &&
          r.subjectScheduleId !== subjectSchedule!.id
        );
      });

      if (activeUnfinishedSession) {
        return {
          success: false,
          message: `Check-in denied: Teacher is currently checked in to ongoing class "${activeUnfinishedSession.subject || 'Class'}" (${activeUnfinishedSession.periodName || 'period'}) from ${activeUnfinishedSession.checkInTime}. Please check out of that session before starting this new schedule.`
        };
      }
    }

    // Check duplicate check-in
    // Specifically query and target the active schedule ID or specific shift to prevent cross-contamination
    const existing = StorageService.getAttendance().find(r => {
      if (subjectSchedule) {
        return (
          r.personId === params.personId &&
          r.date === today &&
          (r.subjectScheduleId === subjectSchedule.id || r.scheduleId === subjectSchedule.id)
        );
      }
      if (params.personType === 'employee') {
        if (isEveningShift) {
          return r.personId === params.personId && r.date === today && !r.subjectScheduleId &&
            (r.session === 'afternoon' || r.session === 'evening' || r.scheduleName?.includes('Evening'));
        } else {
          return r.personId === params.personId && r.date === today && !r.subjectScheduleId &&
            (r.session === 'morning' || (!r.session && !r.scheduleName?.includes('Evening')));
        }
      }
      return r.personId === params.personId && r.date === today && !r.subjectScheduleId;
    });

    if (existing && existing.checkInTime) {
      const targetLabel = subjectSchedule
        ? `${subjectSchedule.subject} (${subjectSchedule.periodName})`
        : (params.personType === 'employee' ? (isEveningShift ? 'Evening Shift' : 'Morning Shift') : 'today');
      return {
        success: false,
        message: `Already checked in for ${targetLabel} at ${existing.checkInTime}. Duplicate check-ins are prevented.`
      };
    }

    // Geofencing verification
    let locationVerified = true;
    if (params.latitude && params.longitude) {
      const geo = this.verifyLocation(params.latitude, params.longitude, systemSettings);
      locationVerified = geo.inside;
      if (systemSettings.enforceGeofence && !params.bypassGeofence && !geo.inside) {
        return {
          success: false,
          message: `Check-in denied: You are ${geo.distance}m away from campus. Authorized radius is ${systemSettings.geofenceRadiusMeters}m.`
        };
      }
    } else {
      params.latitude = systemSettings.defaultLocationLatitude;
      params.longitude = systemSettings.defaultLocationLongitude;
      locationVerified = true;
    }

    // Status evaluation based on class session / schedule
    const { status, lateMinutes } = this.evaluateCheckInStatus(
      currentTime,
      scheduledStartTime,
      gracePeriod
    );

    const shiftSuffix = params.personType === 'employee' ? (isEveningShift ? ' (Evening Shift)' : ' (Morning Shift)') : '';
    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att-${today}-${params.personId}-${subjectSchedule ? subjectSchedule.id : (isEveningShift ? 'shift-eve' : 'shift-morn')}-${Date.now().toString().slice(-4)}`,
      personId: params.personId,
      personType: params.personType,
      personName: params.personName,
      khmerName: params.khmerName,
      department: params.department,
      date: today,
      // Target active schedule ID specifically for both scheduleId and subjectScheduleId
      scheduleId: subjectSchedule ? subjectSchedule.id : schedule.id,
      scheduleName: subjectSchedule ? `${subjectSchedule.subject} (${subjectSchedule.periodName})` : `${schedule.name}${shiftSuffix}`,
      // Teacher Subject Schedule properties
      subjectScheduleId: subjectSchedule?.id,
      subject: subjectSchedule?.subject,
      khmerSubject: subjectSchedule?.khmerSubject,
      gradeClass: subjectSchedule?.gradeClass,
      room: subjectSchedule?.room,
      periodName: subjectSchedule?.periodName,
      session: params.personType === 'employee'
        ? (isEveningShift ? 'afternoon' : 'morning')
        : (parseInt(scheduledStartTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon'),
      scheduledStart: scheduledStartTime,
      scheduledEnd: scheduledEndTime,
      checkInTime: currentTime,
      checkOutTime: existing?.checkOutTime || '',
      status: status,
      lateMinutes: lateMinutes,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      ipAddress: params.ipAddress || '192.168.1.100',
      deviceInfo: params.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web Client'),
      locationLatitude: params.latitude ?? null,
      locationLongitude: params.longitude ?? null,
      locationVerified: locationVerified,
      createdAt: `${today}T${currentTime}:00`
    };

    if (existing) {
      StorageService.updateAttendanceRecord(existing.id, newRecord);
    } else {
      StorageService.addAttendanceRecord(newRecord);
    }

    const sessionDesc = subjectSchedule
      ? `${subjectSchedule.subject} (${subjectSchedule.gradeClass} • ${subjectSchedule.room})`
      : `${params.department} Shift`;

    // Audit Log
    StorageService.addAuditLog({
      userId: params.personId,
      userName: params.personName,
      userRole: params.personType,
      action: 'Check-in Recorded',
      target: `${params.personName} - ${sessionDesc}`,
      previousValue: 'None',
      newValue: `${status} at ${currentTime} (Late: ${lateMinutes}m)`,
      ipAddress: newRecord.ipAddress || '127.0.0.1'
    });

    // Telegram Notification
    TelegramService.sendCheckInAlert({
      name: params.personName,
      khmerName: params.khmerName,
      personType: params.personType === 'teacher' ? 'Teacher' : 'Employee',
      department: params.department,
      time: currentTime,
      scheduled: scheduledStartTime,
      status: status,
      lateMinutes: lateMinutes,
      subjectInfo: subjectSchedule ? `${subjectSchedule.subject} [${subjectSchedule.gradeClass} - ${subjectSchedule.room}] (${subjectSchedule.periodName})` : undefined
    });

    return {
      success: true,
      message: status === 'Late'
        ? `Checked in for ${subjectSchedule ? subjectSchedule.subject : 'shift'} at ${currentTime}. (Late by ${lateMinutes}m)`
        : `Checked in successfully for ${subjectSchedule ? subjectSchedule.subject : 'shift'} at ${currentTime}. Status: Present.`,
      record: newRecord
    };
  },

  // Process Check-out
  processCheckOut(params: {
    personId: string;
    personName: string;
    customTime?: string;
    attendanceRecordId?: string;
    subjectScheduleId?: string;
    shiftType?: 'morning' | 'evening';
    session?: 'morning' | 'afternoon' | 'evening';
    autoSetToEndOfSchedule?: boolean;
  }): CheckOutResult {
    const today = this.getCurrentDateString();
    let currentTime = params.customTime || this.getCurrentTimeString();
    
    // Find matching record
    let existing: AttendanceRecord | undefined;
    if (params.attendanceRecordId) {
      existing = StorageService.getAttendance().find(r => r.id === params.attendanceRecordId);
    } else if (params.shiftType === 'morning' || params.session === 'morning') {
      existing = StorageService.getAttendance().find(
        r => r.personId === params.personId && r.date === today &&
          (r.session === 'morning' || (!r.session && !r.scheduleName?.includes('Evening'))) &&
          !r.checkOutTime
      );
    } else if (params.shiftType === 'evening' || params.session === 'afternoon' || params.session === 'evening') {
      existing = StorageService.getAttendance().find(
        r => r.personId === params.personId && r.date === today &&
          (r.session === 'afternoon' || r.session === 'evening' || r.scheduleName?.includes('Evening')) &&
          !r.checkOutTime
      );
    } else if (params.subjectScheduleId) {
      existing = StorageService.getAttendance().find(
        r =>
          r.personId === params.personId &&
          r.date === today &&
          (r.subjectScheduleId === params.subjectScheduleId || r.scheduleId === params.subjectScheduleId)
      );
    } else {
      // Find latest check-in for this person today that is missing check-out
      existing = StorageService.getAttendance()
        .slice()
        .reverse()
        .find(r => r.personId === params.personId && r.date === today && !r.checkOutTime);
    }

    if (!existing || !existing.checkInTime) {
      return {
        success: false,
        message: 'Cannot check out before checking in. Please check in first.'
      };
    }

    if (existing.checkOutTime) {
      return {
        success: false,
        message: `Already checked out at ${existing.checkOutTime} for this session.`
      };
    }

    const isTeacher = existing.personType === 'teacher' || Boolean(existing.subjectScheduleId);
    let checkOutMins = this.timeToMinutes(currentTime);
    const scheduledEndMins = this.timeToMinutes(existing.scheduledEnd);

    // Auto-set check-out time to scheduled end of schedule when requested or resolving missing check-out
    let isAutoSetToEnd = Boolean(params.autoSetToEndOfSchedule);
    if (isTeacher && (params.autoSetToEndOfSchedule || checkOutMins >= scheduledEndMins)) {
      // If teacher is scanning out at or after schedule end-time (missing check-out), auto set to schedule end time
      currentTime = existing.scheduledEnd;
      checkOutMins = scheduledEndMins;
      isAutoSetToEnd = true;
    }

    // Strict Universal Validation: Do not allow teacher to check out BEFORE schedule
    if (isTeacher && !isAutoSetToEnd) {
      // 1. Check out before schedule
      if (checkOutMins < scheduledEndMins) {
        const earlyMins = scheduledEndMins - checkOutMins;
        const targetLabel = existing.subject
          ? `"${existing.subject}" (${existing.periodName || 'class'}: ${existing.scheduledStart} - ${existing.scheduledEnd})`
          : `scheduled session (${existing.scheduledStart} - ${existing.scheduledEnd})`;
        return {
          success: false,
          message: `Check-out denied: Current time (${currentTime}) is before scheduled end-time (${existing.scheduledEnd}) for ${targetLabel}. Class ends in ${earlyMins} minute(s). Teachers are strictly prohibited from checking out before schedule.`
        };
      }
    }

    const { earlyLeaveMinutes, overtimeMinutes } = this.evaluateCheckOutStatus(
      currentTime,
      existing.scheduledEnd,
      isTeacher
    );

    // Calculate working / teaching duration
    const checkInMins = this.timeToMinutes(existing.checkInTime);
    const totalWorkingMins = Math.max(0, checkOutMins - checkInMins);
    const hours = Math.floor(totalWorkingMins / 60);
    const mins = totalWorkingMins % 60;
    const workingTimeText = `${hours}h ${mins}m`;

    let finalStatus = existing.status;
    if (!isAutoSetToEnd && earlyLeaveMinutes > 0 && existing.status === 'Present') {
      finalStatus = 'Early Leave';
    } else if (existing.status === 'Missing Check-out') {
      finalStatus = existing.lateMinutes > 0 ? 'Late' : 'Present';
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOutTime: currentTime,
      earlyLeaveMinutes: isAutoSetToEnd ? 0 : earlyLeaveMinutes,
      overtimeMinutes: isAutoSetToEnd ? 0 : overtimeMinutes,
      status: finalStatus,
      updatedAt: `${today}T${this.getCurrentTimeString()}:00`
    };

    StorageService.updateAttendanceRecord(existing.id, updatedRecord);

    const sessionDesc = existing.subject
      ? `${existing.subject} (${existing.gradeClass || ''} • ${existing.room || ''})`
      : `${existing.department} Shift`;

    // Audit Log
    StorageService.addAuditLog({
      userId: params.personId,
      userName: params.personName,
      userRole: existing.personType,
      action: isAutoSetToEnd ? 'Missing Check-out Resolved' : 'Check-out Recorded',
      target: `${params.personName} - ${sessionDesc}`,
      previousValue: `Checked in at ${existing.checkInTime} (Check-out was missing)`,
      newValue: isAutoSetToEnd
        ? `Checked out at ${currentTime} [Auto-set to schedule end ${existing.scheduledEnd}] (Duration: ${workingTimeText})`
        : `Checked out at ${currentTime} (Class/Work duration: ${workingTimeText})`,
      ipAddress: existing.ipAddress || '127.0.0.1'
    });

    // Telegram Notification
    TelegramService.sendCheckOutAlert({
      name: params.personName,
      khmerName: existing.khmerName,
      personType: existing.personType === 'teacher' ? 'Teacher' : 'Employee',
      department: existing.department,
      checkOutTime: currentTime,
      workingTime: workingTimeText,
      earlyLeaveMinutes: isAutoSetToEnd ? 0 : earlyLeaveMinutes,
      overtimeMinutes: isAutoSetToEnd ? 0 : overtimeMinutes,
      subjectInfo: existing.subject ? `${existing.subject} [${existing.gradeClass} - ${existing.room}]` : undefined
    });

    return {
      success: true,
      message: isAutoSetToEnd
        ? `Checked out successfully from ${existing.subject || 'session'}. Check-out time was auto-set to schedule end-time (${existing.scheduledEnd}) to resolve missing check-out.`
        : earlyLeaveMinutes > 0
        ? `Checked out at ${currentTime} for ${existing.subject || 'session'}. (Early Leave by ${earlyLeaveMinutes}m. Duration: ${workingTimeText})`
        : `Checked out successfully from ${existing.subject || 'session'} at ${currentTime}. (Duration: ${workingTimeText})`,
      record: updatedRecord
    };
  },

  // Automated Absence & Missing Check-out Scanner
  runAbsenceDetector(): { absencesMarked: number; missingCheckoutsMarked: number } {
    const today = this.getCurrentDateString();
    const nowMins = this.timeToMinutes(this.getCurrentTimeString());
    const dayOfWeek = new Date().getDay(); // 0-6

    const holidays = StorageService.getHolidays();
    const isHoliday = holidays.some(h => h.date === today);
    if (isHoliday) {
      return { absencesMarked: 0, missingCheckoutsMarked: 0 };
    }

    const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
    const employees = StorageService.getEmployees().filter(e => e.status === 'Active');
    const subjectSchedules = StorageService.getSubjectSchedules().filter(s => s.isActive);

    const currentAttendance = StorageService.getAttendance().filter(r => r.date === today);
    const leaveRequests = StorageService.getLeaveRequests().filter(
      l => l.status === 'Approved' && l.startDate <= today && l.endDate >= today
    );

    let absencesMarked = 0;
    let missingCheckoutsMarked = 0;

    // 1. Process TEACHERS strictly by Subject Schedule
    teachers.forEach(teacher => {
      const onLeave = leaveRequests.find(l => l.personId === teacher.id);
      const teacherSubjects = subjectSchedules.filter(s => {
        if (s.teacherId !== teacher.id) return false;
        if (s.daysOfWeek && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
          return s.daysOfWeek.includes(dayOfWeek);
        }
        return s.dayOfWeek === dayOfWeek;
      });

      teacherSubjects.forEach(sub => {
        const attendance = currentAttendance.find(
          a => a.personId === teacher.id && a.subjectScheduleId === sub.id
        );

        if (onLeave && !attendance) {
          StorageService.addAttendanceRecord({
            id: `att-${today}-${teacher.id}-${sub.id}-leave`,
            personId: teacher.id,
            personType: 'teacher',
            personName: teacher.fullName,
            khmerName: teacher.khmerName,
            department: teacher.department,
            date: today,
            scheduleId: teacher.assignedScheduleId || 'sch-standard-fulltime',
            scheduleName: `${sub.subject} Class Schedule`,
            subjectScheduleId: sub.id,
            subject: sub.subject,
            khmerSubject: sub.khmerSubject,
            gradeClass: sub.gradeClass,
            room: sub.room,
            periodName: sub.periodName,
            session: parseInt(sub.startTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
            scheduledStart: sub.startTime,
            scheduledEnd: sub.endTime,
            status: 'Leave',
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 0,
            locationVerified: false,
            createdAt: `${today}T${sub.startTime}:00`
          });
          return;
        }

        const startMins = this.timeToMinutes(sub.startTime);
        const deadlineMins = startMins + (sub.gracePeriodMinutes || 10) + 30; // 30m past grace period

        // Mark Absent if class period start has passed without checkin
        if (!attendance && nowMins > deadlineMins && !onLeave) {
          const absentRecord: AttendanceRecord = {
            id: `att-${today}-${teacher.id}-${sub.id}-absent`,
            personId: teacher.id,
            personType: 'teacher',
            personName: teacher.fullName,
            khmerName: teacher.khmerName,
            department: teacher.department,
            date: today,
            scheduleId: teacher.assignedScheduleId || 'sch-standard-fulltime',
            scheduleName: `${sub.subject} Class Schedule`,
            subjectScheduleId: sub.id,
            subject: sub.subject,
            khmerSubject: sub.khmerSubject,
            gradeClass: sub.gradeClass,
            room: sub.room,
            periodName: sub.periodName,
            session: parseInt(sub.startTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
            scheduledStart: sub.startTime,
            scheduledEnd: sub.endTime,
            status: 'Absent',
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 0,
            locationVerified: false,
            createdAt: `${today}T${this.getCurrentTimeString()}:00`
          };
          StorageService.addAttendanceRecord(absentRecord);
          absencesMarked++;

          TelegramService.sendAbsenceAlert({
            name: `${teacher.fullName} (Subject: ${sub.subject} - ${sub.gradeClass})`,
            department: teacher.department,
            date: today
          });

          StorageService.addAuditLog({
            userId: 'system-worker',
            userName: 'Automated Absence Engine',
            userRole: 'system',
            action: 'Class Absence Flagged',
            target: `${teacher.fullName} - ${sub.subject} (${sub.gradeClass})`,
            previousValue: `Scheduled for ${sub.startTime} (${sub.periodName})`,
            newValue: 'Marked Absent for this class session',
            ipAddress: '127.0.0.1'
          });
        }

        // Missing check-out for class period
        if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
          const endMins = this.timeToMinutes(sub.endTime);
          if (nowMins > endMins + 45 && attendance.status !== 'Missing Check-out') {
            StorageService.updateAttendanceRecord(attendance.id, {
              status: 'Missing Check-out'
            });
            missingCheckoutsMarked++;
          }
        }
      });
    });

    // 2. Process EMPLOYEES by Duty Shift Schedule
    employees.forEach(emp => {
      const schedule = this.getScheduleForPerson(emp.assignedScheduleId, emp.department);
      if (!schedule.daysOfWeek.includes(dayOfWeek)) return;

      const onLeave = leaveRequests.find(l => l.personId === emp.id);
      const attendance = currentAttendance.find(a => a.personId === emp.id && !a.subjectScheduleId);

      if (onLeave && !attendance) {
        StorageService.addAttendanceRecord({
          id: `att-${today}-${emp.id}-leave`,
          personId: emp.id,
          personType: 'employee',
          personName: emp.fullName,
          khmerName: emp.khmerName,
          department: emp.department,
          date: today,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          scheduledStart: schedule.startTime,
          scheduledEnd: schedule.endTime,
          status: 'Leave',
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          locationVerified: false,
          createdAt: `${today}T07:00:00`
        });
        return;
      }

      const startMins = this.timeToMinutes(schedule.startTime);
      const deadlineMins = startMins + (schedule.absenceDetectionMinutes || 60);

      if (!attendance && nowMins > deadlineMins && !onLeave) {
        const absentRecord: AttendanceRecord = {
          id: `att-${today}-${emp.id}-absent`,
          personId: emp.id,
          personType: 'employee',
          personName: emp.fullName,
          khmerName: emp.khmerName,
          department: emp.department,
          date: today,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          scheduledStart: schedule.startTime,
          scheduledEnd: schedule.endTime,
          status: 'Absent',
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          locationVerified: false,
          createdAt: `${today}T${this.getCurrentTimeString()}:00`
        };
        StorageService.addAttendanceRecord(absentRecord);
        absencesMarked++;

        TelegramService.sendAbsenceAlert({
          name: emp.fullName,
          department: emp.department,
          date: today
        });

        StorageService.addAuditLog({
          userId: 'system-worker',
          userName: 'Automated Absence Engine',
          userRole: 'system',
          action: 'Shift Absence Triggered',
          target: `${emp.fullName} (${emp.department})`,
          previousValue: `Scheduled for ${schedule.startTime}`,
          newValue: 'Marked Absent (Duty shift deadline exceeded)',
          ipAddress: '127.0.0.1'
        });
      }

      if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
        const endMins = this.timeToMinutes(attendance.scheduledEnd);
        if (nowMins > endMins + 90 && attendance.status !== 'Missing Check-out') {
          StorageService.updateAttendanceRecord(attendance.id, {
            status: 'Missing Check-out'
          });
          missingCheckoutsMarked++;
        }
      }
    });

    return { absencesMarked, missingCheckoutsMarked };
  }
};
