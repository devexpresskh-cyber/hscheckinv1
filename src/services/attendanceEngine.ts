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

  // Get current date 'YYYY-MM-DD'
  getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
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
    earlyBufferMinutes: number = 30
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
    const allowedEarlyMins = sStart - earlyBufferMinutes;

    if (cur < allowedEarlyMins) {
      const waitMins = sStart - cur;
      return {
        isValid: false,
        reason: 'too_early',
        startsInMinutes: waitMins,
        message: `Cannot scan in: "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) has not started yet (Current time: ${currentTimeStr}). Scan-in opens ${earlyBufferMinutes}m before class at ${this.minutesToTime(allowedEarlyMins)}.`,
        khmerMessage: `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ មិនទាន់ដល់ម៉ោងបង្រៀនមុខវិជ្ជា "${subjectSchedule.khmerSubject || subjectSchedule.subject}" (${subjectSchedule.startTime} - ${subjectSchedule.endTime}) នៅឡើយទេ។ ការស្កេនចូលនឹងបើកនៅម៉ោង ${this.minutesToTime(allowedEarlyMins)}។`
      };
    }

    if (cur >= sEnd) {
      const pastMins = cur - sEnd;
      return {
        isValid: false,
        reason: 'too_late',
        endedMinutesAgo: pastMins,
        message: `Cannot scan in: "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) has reached or exceeded its end-time (${subjectSchedule.endTime}). Current time (${currentTimeStr}) is over end-time. Teachers are strictly prohibited from scanning in over schedule end-time.`,
        khmerMessage: `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ ម៉ោងបង្រៀនមុខវិជ្ជា "${subjectSchedule.khmerSubject || subjectSchedule.subject}" បានដល់ ឬហួសម៉ោងបញ្ចប់ ${subjectSchedule.endTime} រួចហើយ (ម៉ោងបច្ចុប្បន្ន៖ ${currentTimeStr})។`
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
  evaluateCheckOutStatus(checkOutTimeStr: string, scheduledEndTimeStr: string): {
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
        overtimeMinutes: checkOutMins - scheduledEndMins
      };
    }
    return { earlyLeaveMinutes: 0, overtimeMinutes: 0 };
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
  }): CheckInResult {
    const today = this.getCurrentDateString();
    const currentTime = params.customTime || this.getCurrentTimeString();
    const currentMins = this.timeToMinutes(currentTime);
    const systemSettings = StorageService.getSystemSettings();

    let subjectSchedule = params.subjectScheduleId
      ? StorageService.getSubjectSchedules().find(s => s.id === params.subjectScheduleId)
      : undefined;

    // Strict requirement: Teachers MUST check in by subject schedule at the PRESENT TIME
    if (params.personType === 'teacher') {
      const teacherSubjects = StorageService.getSubjectSchedulesForTeacher(params.personId);

      if (teacherSubjects.length === 0) {
        return {
          success: false,
          message: `Check-in rejected: Teachers must check in by subject schedule, but ${params.personName} has no subject class schedules assigned. Please assign or create a subject schedule first.`
        };
      }

      if (subjectSchedule) {
        // A specific schedule was requested (e.g. from kiosk card selection or barcode scan)
        // Verify it belongs to this teacher
        if (subjectSchedule.teacherId !== params.personId) {
          return {
            success: false,
            message: `Check-in rejected: Selected subject schedule (${subjectSchedule.subject}) does not belong to ${params.personName}.`
          };
        }

        // Strict enforcement: Do not allow teacher to scan in other different schedule that is not present time
        const timeCheck = this.isSubjectScheduleAtPresentTime(subjectSchedule, currentTime, today);
        if (!timeCheck.isValid) {
          return {
            success: false,
            message: timeCheck.message || `Check-in denied: Selected schedule "${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime}) is not at the present time (${currentTime}). Teachers are not allowed to scan into schedules that are not at the present time.`
          };
        }
      } else {
        // Teacher scanned without specifying a subject -> Auto-find the scheduled class active at the PRESENT TIME
        const activeNow = teacherSubjects.find(s => {
          return this.isSubjectScheduleAtPresentTime(s, currentTime, today).isValid;
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
    const scheduledStartTime = subjectSchedule ? subjectSchedule.startTime : schedule.startTime;
    const scheduledEndTime = subjectSchedule ? subjectSchedule.endTime : schedule.endTime;
    const gracePeriod = subjectSchedule?.gracePeriodMinutes || schedule.gracePeriodMinutes || systemSettings.defaultGracePeriod;

    // Strict Universal Validation: Do not allow teacher or staff to scan in if over scheduled end-time
    const scheduledEndMins = this.timeToMinutes(scheduledEndTime);
    if (currentMins >= scheduledEndMins) {
      const targetLabel = subjectSchedule
        ? `"${subjectSchedule.subject}" (${subjectSchedule.periodName}: ${subjectSchedule.startTime} - ${subjectSchedule.endTime})`
        : `shift "${schedule.name}" (${schedule.startTime} - ${schedule.endTime})`;
      return {
        success: false,
        message: `Check-in denied: Current time (${currentTime}) is over the scheduled end-time (${scheduledEndTime}) for ${targetLabel}. Scanning in over end-time is strictly prohibited.`
      };
    }

    // Check duplicate check-in
    // If teacher checking in by subject schedule, check duplicate for that specific subject period today
    const existing = StorageService.getAttendance().find(r => {
      if (subjectSchedule) {
        return r.personId === params.personId && r.date === today && r.subjectScheduleId === subjectSchedule.id;
      }
      return r.personId === params.personId && r.date === today && !r.subjectScheduleId;
    });

    if (existing && existing.checkInTime) {
      const targetLabel = subjectSchedule
        ? `${subjectSchedule.subject} (${subjectSchedule.periodName})`
        : 'today';
      return {
        success: false,
        message: `Already checked in for ${targetLabel} at ${existing.checkInTime}. Duplicate check-ins are prevented.`
      };
    }

    // Geofencing verification
    let locationVerified = true;
    if (systemSettings.enforceGeofence && !params.bypassGeofence && params.latitude && params.longitude) {
      const geo = this.verifyLocation(params.latitude, params.longitude, systemSettings);
      if (!geo.inside) {
        return {
          success: false,
          message: `Check-in denied: You are ${geo.distance}m away from campus. Authorized radius is ${systemSettings.geofenceRadiusMeters}m.`
        };
      }
    }

    // Status evaluation based on class session / schedule
    const { status, lateMinutes } = this.evaluateCheckInStatus(
      currentTime,
      scheduledStartTime,
      gracePeriod
    );

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att-${today}-${params.personId}-${subjectSchedule ? subjectSchedule.id : 'shift'}-${Date.now().toString().slice(-4)}`,
      personId: params.personId,
      personType: params.personType,
      personName: params.personName,
      khmerName: params.khmerName,
      department: params.department,
      date: today,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      // Teacher Subject Schedule properties
      subjectScheduleId: subjectSchedule?.id,
      subject: subjectSchedule?.subject,
      khmerSubject: subjectSchedule?.khmerSubject,
      gradeClass: subjectSchedule?.gradeClass,
      room: subjectSchedule?.room,
      periodName: subjectSchedule?.periodName,
      session: parseInt(scheduledStartTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
      scheduledStart: scheduledStartTime,
      scheduledEnd: scheduledEndTime,
      checkInTime: currentTime,
      checkOutTime: existing?.checkOutTime || '',
      status: status,
      lateMinutes: lateMinutes,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      ipAddress: params.ipAddress || '192.168.1.100',
      deviceInfo: params.deviceInfo || navigator.userAgent.slice(0, 60),
      locationLatitude: params.latitude,
      locationLongitude: params.longitude,
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
  }): CheckOutResult {
    const today = this.getCurrentDateString();
    const currentTime = params.customTime || this.getCurrentTimeString();
    
    // Find matching record
    let existing: AttendanceRecord | undefined;
    if (params.attendanceRecordId) {
      existing = StorageService.getAttendance().find(r => r.id === params.attendanceRecordId);
    } else if (params.subjectScheduleId) {
      existing = StorageService.getAttendance().find(
        r => r.personId === params.personId && r.date === today && r.subjectScheduleId === params.subjectScheduleId
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

    const { earlyLeaveMinutes, overtimeMinutes } = this.evaluateCheckOutStatus(
      currentTime,
      existing.scheduledEnd
    );

    // Calculate working / teaching duration
    const checkInMins = this.timeToMinutes(existing.checkInTime);
    const checkOutMins = this.timeToMinutes(currentTime);
    const totalWorkingMins = Math.max(0, checkOutMins - checkInMins);
    const hours = Math.floor(totalWorkingMins / 60);
    const mins = totalWorkingMins % 60;
    const workingTimeText = `${hours}h ${mins}m`;

    let finalStatus = existing.status;
    if (earlyLeaveMinutes > 0 && existing.status === 'Present') {
      finalStatus = 'Early Leave';
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOutTime: currentTime,
      earlyLeaveMinutes,
      overtimeMinutes,
      status: finalStatus,
      updatedAt: `${today}T${currentTime}:00`
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
      action: 'Check-out Recorded',
      target: `${params.personName} - ${sessionDesc}`,
      previousValue: `Checked in at ${existing.checkInTime}`,
      newValue: `Checked out at ${currentTime} (Class/Work duration: ${workingTimeText})`,
      ipAddress: existing.ipAddress || '127.0.0.1'
    });

    // Telegram Notification
    TelegramService.sendCheckOutAlert({
      name: params.personName,
      department: existing.department,
      checkOutTime: currentTime,
      workingTime: workingTimeText,
      earlyLeaveMinutes,
      overtimeMinutes,
      subjectInfo: existing.subject ? `${existing.subject} [${existing.gradeClass} - ${existing.room}]` : undefined
    });

    return {
      success: true,
      message: earlyLeaveMinutes > 0
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
