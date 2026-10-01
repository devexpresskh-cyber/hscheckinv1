import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { TeacherSubjectSchedule, Schedule, Teacher, UserAccount } from '../types/index.ts';
import { StorageService } from './storageService.ts';

export interface ScheduleQRPayload {
  app: 'edutrack';
  type: 'schedule_attendance' | 'teacher_master_qr' | 'room_poster_qr';
  version: 1;
  scheduleType: 'teacher' | 'subject' | 'general' | 'room';
  scheduleId: string;
  teacherId?: string;
  teacherName?: string;
  subject?: string;
  khmerSubject?: string;
  gradeClass?: string;
  room?: string;
  periodName?: string;
  periodNumber?: number;
  startTime?: string;
  endTime?: string;
  timestamp?: number;
}

export interface DecodedScheduleResult {
  isValid: boolean;
  error?: string;
  scheduleType: 'teacher' | 'subject' | 'general' | 'room';
  scheduleId: string;
  subjectSchedule?: TeacherSubjectSchedule;
  generalSchedule?: Schedule;
  teacher?: Teacher;
  targetTeacherId?: string;
  targetTeacherName?: string;
  subject?: string;
  khmerSubject?: string;
  room?: string;
  gradeClass?: string;
  periodName?: string;
  startTime?: string;
  endTime?: string;
  // Multi-period schedule support for teachers with many periods
  todayPeriods?: TeacherSubjectSchedule[];
  activePeriod?: TeacherSubjectSchedule;
  nextPeriod?: TeacherSubjectSchedule;
  hasMultiplePeriodsToday?: boolean;
}

export const ScheduleQrService = {
  /**
   * Build a standard web deep-link URL for the schedule QR code.
   * Teachers scanning with native mobile cameras will open this URL directly in their browser.
   */
  buildScheduleUrl(
    scheduleId: string,
    scheduleType: 'teacher' | 'subject' | 'general' | 'room' = 'subject',
    teacherId?: string
  ): string {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://edutrack.edu';
    
    const params = new URLSearchParams();
    if (scheduleType === 'teacher') {
      params.set('scan_teacher', scheduleId);
      params.set('type', 'teacher');
    } else if (scheduleType === 'room') {
      params.set('scan_room', scheduleId);
      params.set('type', 'room');
    } else {
      params.set('scan_schedule', scheduleId);
      params.set('type', scheduleType);
      if (teacherId) {
        params.set('teacherId', teacherId);
      }
    }
    return `${origin}/?${params.toString()}`;
  },

  /**
   * Build Teacher Master QR deep link
   */
  buildTeacherMasterUrl(teacherId: string): string {
    return this.buildScheduleUrl(teacherId, 'teacher');
  },

  /**
   * Build Room Door Poster QR deep link
   */
  buildRoomUrl(roomName: string): string {
    return this.buildScheduleUrl(roomName, 'room');
  },

  /**
   * Build complete JSON payload for offline or app-only QR codes
   */
  buildJsonPayload(
    schedule: TeacherSubjectSchedule | Schedule | Teacher | { room: string },
    scheduleType: 'teacher' | 'subject' | 'general' | 'room' = 'subject',
    customRoom?: string
  ): ScheduleQRPayload {
    if (scheduleType === 'teacher') {
      const teacher = schedule as Teacher;
      return {
        app: 'edutrack',
        type: 'teacher_master_qr',
        version: 1,
        scheduleType: 'teacher',
        scheduleId: teacher.id,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        subject: teacher.subject,
        timestamp: Date.now()
      };
    }

    if (scheduleType === 'room') {
      const roomStr = 'room' in schedule ? schedule.room : customRoom || 'Main Room';
      return {
        app: 'edutrack',
        type: 'room_poster_qr',
        version: 1,
        scheduleType: 'room',
        scheduleId: `room-${roomStr.toLowerCase().replace(/\s+/g, '-')}`,
        room: roomStr,
        timestamp: Date.now()
      };
    }

    const isSubject = 'subject' in schedule;
    const sub = isSubject ? (schedule as TeacherSubjectSchedule) : null;
    const gen = !isSubject ? (schedule as Schedule) : null;

    return {
      app: 'edutrack',
      type: 'schedule_attendance',
      version: 1,
      scheduleType,
      scheduleId: (schedule as any).id,
      teacherId: sub?.teacherId,
      teacherName: sub?.teacherName,
      subject: sub?.subject || gen?.name,
      khmerSubject: sub?.khmerSubject || gen?.khmerName,
      gradeClass: sub?.gradeClass,
      room: sub?.room || customRoom || gen?.workLocation || gen?.location,
      periodName: sub?.periodName,
      periodNumber: sub?.periodNumber,
      startTime: (schedule as any).startTime,
      endTime: (schedule as any).endTime,
      timestamp: Date.now()
    };
  },

  /**
   * Generate QR Code as high-res PNG Data URL
   */
  async generateQRCodeDataUrl(
    text: string,
    options?: {
      color?: { dark: string; light: string };
      width?: number;
      margin?: number;
    }
  ): Promise<string> {
    return QRCode.toDataURL(text, {
      width: options?.width || 360,
      margin: options?.margin !== undefined ? options.margin : 2,
      color: {
        dark: options?.color?.dark || '#1e1b4b', // deep indigo/slate
        light: options?.color?.light || '#ffffff'
      },
      errorCorrectionLevel: 'H' // High error tolerance for clear scanning and logo overlay
    });
  },

  /**
   * Generate QR Code as SVG String
   */
  async generateQRCodeSvg(
    text: string,
    options?: {
      color?: { dark: string; light: string };
      margin?: number;
    }
  ): Promise<string> {
    return QRCode.toString(text, {
      type: 'svg',
      margin: options?.margin !== undefined ? options.margin : 2,
      color: {
        dark: options?.color?.dark || '#1e1b4b',
        light: options?.color?.light || '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  },

  /**
   * Decode raw QR code text or URL into a validated schedule result
   */
  decodeQRCode(rawText: string): DecodedScheduleResult {
    const text = (rawText || '').trim();
    if (!text) {
      return {
        isValid: false,
        error: 'Empty QR code content',
        scheduleType: 'subject',
        scheduleId: ''
      };
    }

    let scheduleId = '';
    let scheduleType: 'teacher' | 'subject' | 'general' | 'room' = 'subject';
    let targetTeacherId: string | undefined;
    let targetTeacherName: string | undefined;
    let room: string | undefined;
    let subject: string | undefined;
    let khmerSubject: string | undefined;
    let gradeClass: string | undefined;
    let periodName: string | undefined;
    let startTime: string | undefined;
    let endTime: string | undefined;

    // Case 1: URL format (native camera scan or app deep-link)
    if (text.startsWith('http://') || text.startsWith('https://') || text.includes('scan_schedule=') || text.includes('schedule_id=') || text.includes('scan_teacher=') || text.includes('scan_room=')) {
      try {
        const url = new URL(text.startsWith('http') ? text : `https://dummy.host/${text.startsWith('?') ? '' : '?'}${text}`);
        const teacherParam = url.searchParams.get('scan_teacher');
        const roomParam = url.searchParams.get('scan_room');
        const schedParam = url.searchParams.get('scan_schedule') || url.searchParams.get('schedule_id') || url.searchParams.get('qr');
        const parsedType = url.searchParams.get('type');

        if (teacherParam || parsedType === 'teacher') {
          scheduleType = 'teacher';
          scheduleId = teacherParam || schedParam || '';
          targetTeacherId = scheduleId;
        } else if (roomParam || parsedType === 'room') {
          scheduleType = 'room';
          room = roomParam || schedParam || '';
          scheduleId = `room-${room.toLowerCase().replace(/\s+/g, '-')}`;
        } else {
          scheduleId = schedParam || '';
          if (parsedType === 'general') scheduleType = 'general';
          targetTeacherId = url.searchParams.get('teacherId') || undefined;
        }
      } catch {
        // Fallback regex extraction
        const matchTeacher = text.match(/(?:scan_teacher)=([^&]+)/);
        const matchRoom = text.match(/(?:scan_room)=([^&]+)/);
        const match = text.match(/(?:scan_schedule|schedule_id|qr)=([^&]+)/);
        if (matchTeacher && matchTeacher[1]) {
          scheduleType = 'teacher';
          scheduleId = decodeURIComponent(matchTeacher[1]);
          targetTeacherId = scheduleId;
        } else if (matchRoom && matchRoom[1]) {
          scheduleType = 'room';
          room = decodeURIComponent(matchRoom[1]);
          scheduleId = `room-${room.toLowerCase().replace(/\s+/g, '-')}`;
        } else if (match && match[1]) {
          scheduleId = decodeURIComponent(match[1]);
        }
      }
    }

    // Case 2: JSON payload format
    if (!scheduleId && (text.startsWith('{') && text.endsWith('}'))) {
      try {
        const parsed = JSON.parse(text) as Partial<ScheduleQRPayload>;
        if (parsed.scheduleId || parsed.teacherId || parsed.room) {
          scheduleId = parsed.scheduleId || parsed.teacherId || '';
          scheduleType = parsed.scheduleType || (parsed.type === 'teacher_master_qr' ? 'teacher' : parsed.type === 'room_poster_qr' ? 'room' : 'subject');
          targetTeacherId = parsed.teacherId;
          targetTeacherName = parsed.teacherName;
          room = parsed.room;
          subject = parsed.subject;
          khmerSubject = parsed.khmerSubject;
          gradeClass = parsed.gradeClass;
          periodName = parsed.periodName;
          startTime = parsed.startTime;
          endTime = parsed.endTime;
        }
      } catch {}
    }

    // Case 3: EDUTRACK prefix formatted string e.g. "EDUTRACK:TEACHER:tch-001" or "EDUTRACK:ROOM:Room 204"
    if (!scheduleId && text.startsWith('EDUTRACK:')) {
      const parts = text.split(':');
      if (parts[1] === 'TEACHER') {
        scheduleType = 'teacher';
        scheduleId = parts[2] || '';
        targetTeacherId = scheduleId;
      } else if (parts[1] === 'ROOM') {
        scheduleType = 'room';
        room = parts[2] || '';
        scheduleId = `room-${room.toLowerCase().replace(/\s+/g, '-')}`;
      } else if (parts[2]) {
        scheduleId = parts[2];
        if (parts[1] === 'GENERAL') scheduleType = 'general';
        if (parts[1] === 'ROOM') scheduleType = 'room';
        if (parts[3]) targetTeacherId = parts[3];
      }
    }

    // Case 4: Plain ID (e.g. "sub-math-12", "tch-101", or "Room 204")
    if (!scheduleId) {
      scheduleId = text;
    }

    // Now resolve against StorageService
    const allSubjects = StorageService.getSubjectSchedules();
    const allGeneral = StorageService.getSchedules();
    const allTeachers = StorageService.getTeachers();

    const todayDay = new Date().getDay();
    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    // Helper: Find active & next period from a list of schedules
    const analyzePeriods = (list: TeacherSubjectSchedule[]) => {
      const todayList = list
        .filter(s => (s.daysOfWeek && s.daysOfWeek.length > 0 ? s.daysOfWeek.includes(todayDay) : s.dayOfWeek === todayDay))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Active: currently in session or within 30 min early check-in buffer up to end time
      const active = todayList.find(s => {
        const [sh, sm] = (s.startTime || '07:30').split(':').map(Number);
        const [eh, em] = (s.endTime || '09:00').split(':').map(Number);
        const startM = sh * 60 + sm;
        const endM = eh * 60 + em;
        return curMinutes >= Math.max(0, startM - 30) && curMinutes <= endM;
      });

      // Next: first future upcoming class today
      const next = todayList.find(s => {
        const [sh, sm] = (s.startTime || '07:30').split(':').map(Number);
        return curMinutes < (sh * 60 + sm);
      });

      return { todayList, active, next };
    };

    // CHECK A: Is this a Teacher Master QR?
    const matchedTeacherAsMaster = allTeachers.find(
      t => t.id === scheduleId ||
           t.teacherId?.toLowerCase() === scheduleId.toLowerCase() ||
           t.id === targetTeacherId ||
           (targetTeacherId && t.teacherId?.toLowerCase() === targetTeacherId.toLowerCase())
    );

    if (scheduleType === 'teacher' || (matchedTeacherAsMaster && !scheduleId.startsWith('sub-') && !scheduleId.startsWith('sch-'))) {
      const teacherObj = matchedTeacherAsMaster || allTeachers[0];
      const teacherSubjects = allSubjects.filter(
        s => s.teacherId === teacherObj?.id ||
             (s.teacherName && teacherObj?.fullName && s.teacherName.toLowerCase() === teacherObj.fullName.toLowerCase())
      );

      const { todayList, active, next } = analyzePeriods(teacherSubjects);
      const chosenPeriod = active || next || todayList[0] || teacherSubjects[0];

      return {
        isValid: Boolean(teacherObj),
        scheduleType: 'teacher',
        scheduleId: chosenPeriod?.id || `tch-master-${teacherObj?.id}`,
        subjectSchedule: chosenPeriod,
        teacher: teacherObj,
        targetTeacherId: teacherObj?.id,
        targetTeacherName: teacherObj?.fullName,
        subject: chosenPeriod?.subject || teacherObj?.subject || 'All Scheduled Classes',
        khmerSubject: chosenPeriod?.khmerSubject,
        room: chosenPeriod?.room || 'Faculty Assigned Room',
        gradeClass: chosenPeriod?.gradeClass || 'All Classes',
        periodName: chosenPeriod?.periodName || (active ? 'Active Period' : 'Next Period'),
        startTime: chosenPeriod?.startTime || '07:30',
        endTime: chosenPeriod?.endTime || '17:00',
        todayPeriods: todayList,
        activePeriod: active,
        nextPeriod: next,
        hasMultiplePeriodsToday: todayList.length > 1
      };
    }

    // CHECK B: Is this a Room Poster QR?
    const isRoomLookup = scheduleType === 'room' || scheduleId.startsWith('room-') || room;
    if (isRoomLookup) {
      const targetRoom = room || scheduleId.replace(/^room-/, '').replace(/-/g, ' ');
      const roomSubjects = allSubjects.filter(
        s => s.room && s.room.toLowerCase().replace(/[\s-]/g, '') === targetRoom.toLowerCase().replace(/[\s-]/g, '')
      );

      const { todayList, active, next } = analyzePeriods(roomSubjects);
      const chosenPeriod = active || next || todayList[0] || roomSubjects[0];

      let scheduledTeacher = chosenPeriod
        ? allTeachers.find(t => t.id === chosenPeriod.teacherId || (chosenPeriod.teacherName && t.fullName.toLowerCase() === chosenPeriod.teacherName.toLowerCase()))
        : undefined;

      return {
        isValid: Boolean(chosenPeriod || roomSubjects.length > 0 || targetRoom),
        scheduleType: 'room',
        scheduleId: chosenPeriod?.id || `room-${targetRoom}`,
        subjectSchedule: chosenPeriod,
        teacher: scheduledTeacher,
        targetTeacherId: scheduledTeacher?.id || chosenPeriod?.teacherId,
        targetTeacherName: scheduledTeacher?.fullName || chosenPeriod?.teacherName,
        subject: chosenPeriod?.subject || `Class in ${targetRoom}`,
        khmerSubject: chosenPeriod?.khmerSubject,
        room: chosenPeriod?.room || targetRoom,
        gradeClass: chosenPeriod?.gradeClass || 'Room Schedule',
        periodName: chosenPeriod?.periodName,
        startTime: chosenPeriod?.startTime || '07:30',
        endTime: chosenPeriod?.endTime || '17:00',
        todayPeriods: todayList,
        activePeriod: active,
        nextPeriod: next,
        hasMultiplePeriodsToday: todayList.length > 1
      };
    }

    // CHECK C: Is this a Single Subject Schedule?
    const matchedSubject = allSubjects.find(s => s.id === scheduleId);
    if (matchedSubject) {
      scheduleType = 'subject';
      const teacherObj = allTeachers.find(
        t => t.id === matchedSubject.teacherId ||
             (matchedSubject.teacherName && t.fullName.toLowerCase() === matchedSubject.teacherName.toLowerCase())
      );

      // Check all periods for this teacher today so they can see context if they have multiple classes
      const teacherSubjects = teacherObj
        ? allSubjects.filter(s => s.teacherId === teacherObj.id || (s.teacherName && s.teacherName.toLowerCase() === teacherObj.fullName.toLowerCase()))
        : [matchedSubject];
      const { todayList, active, next } = analyzePeriods(teacherSubjects);

      return {
        isValid: true,
        scheduleType: 'subject',
        scheduleId: matchedSubject.id,
        subjectSchedule: matchedSubject,
        teacher: teacherObj,
        targetTeacherId: matchedSubject.teacherId || teacherObj?.id,
        targetTeacherName: matchedSubject.teacherName || teacherObj?.fullName,
        subject: matchedSubject.subject,
        khmerSubject: matchedSubject.khmerSubject,
        room: matchedSubject.room,
        gradeClass: matchedSubject.gradeClass,
        periodName: matchedSubject.periodName,
        startTime: matchedSubject.startTime,
        endTime: matchedSubject.endTime,
        todayPeriods: todayList,
        activePeriod: active || (todayList.some(p => p.id === matchedSubject.id) ? matchedSubject : undefined),
        nextPeriod: next,
        hasMultiplePeriodsToday: todayList.length > 1
      };
    }

    // CHECK D: General Shift
    const matchedGeneral = allGeneral.find(s => s.id === scheduleId);
    if (matchedGeneral) {
      scheduleType = 'general';
      let teacherObj: Teacher | undefined;
      if (targetTeacherId) {
        teacherObj = allTeachers.find(t => t.id === targetTeacherId);
      }

      return {
        isValid: true,
        scheduleType: 'general',
        scheduleId: matchedGeneral.id,
        generalSchedule: matchedGeneral,
        teacher: teacherObj,
        targetTeacherId: teacherObj?.id || targetTeacherId,
        targetTeacherName: teacherObj?.fullName || targetTeacherName,
        subject: matchedGeneral.name,
        khmerSubject: matchedGeneral.khmerName,
        room: matchedGeneral.workLocation || matchedGeneral.location,
        startTime: matchedGeneral.startTime,
        endTime: matchedGeneral.endTime
      };
    }

    // If ID is not in subject/general schedules, check if schedule was passed with embedded metadata in JSON
    if (subject && startTime && endTime) {
      return {
        isValid: true,
        scheduleType,
        scheduleId,
        targetTeacherId,
        targetTeacherName,
        subject,
        khmerSubject,
        room,
        gradeClass,
        periodName,
        startTime,
        endTime
      };
    }

    return {
      isValid: false,
      error: `Schedule not found with ID "${scheduleId}". Please verify the QR code was generated from EduTrack.`,
      scheduleType,
      scheduleId
    };
  },

  /**
   * Scan image data from HTML Canvas using jsQR
   */
  scanCanvasImageData(imageData: ImageData): string | null {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });
      return code ? code.data : null;
    } catch (e) {
      console.warn('jsQR scan error:', e);
      return null;
    }
  },

  /**
   * Verify Teacher PIN
   */
  verifyTeacherPin(
    teacherId: string,
    enteredPin: string
  ): {
    isValid: boolean;
    teacher?: Teacher;
    user?: UserAccount;
    message?: string;
  } {
    const rawPin = (enteredPin || '').trim();
    if (!rawPin) {
      return { isValid: false, message: 'Please enter your 4-digit PIN.' };
    }

    const teachers = StorageService.getTeachers();
    const users = StorageService.getUsers();

    const teacher = teachers.find(
      t => t.id === teacherId ||
           t.teacherId?.toLowerCase() === teacherId.toLowerCase() ||
           t.employeeId?.toLowerCase() === teacherId.toLowerCase()
    );

    if (!teacher) {
      return { isValid: false, message: 'Teacher profile not found.' };
    }

    // Look for matching user account
    const user = users.find(
      u => u.personId === teacher.id ||
           u.id === `usr-${teacher.id}` ||
           (teacher.email && u.email.toLowerCase() === teacher.email.toLowerCase()) ||
           (teacher.phone && u.phone === teacher.phone)
    );

    // Allowed PINs: teacher.pinCode (default '1234'), user.pinCode, or system fallback
    const expectedTeacherPin = (teacher.pinCode || '1234').trim();
    const expectedUserPin = user?.pinCode ? user.pinCode.trim() : null;

    const matches = rawPin === expectedTeacherPin || (expectedUserPin && rawPin === expectedUserPin);

    if (matches) {
      return { isValid: true, teacher, user };
    }

    return {
      isValid: false,
      teacher,
      user,
      message: `Incorrect PIN for ${teacher.fullName}. Please enter your 4-digit security PIN.`
    };
  }
};
