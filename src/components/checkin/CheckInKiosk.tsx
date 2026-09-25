import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { StorageService } from '../../services/storageService.ts';
import confetti from 'canvas-confetti';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Calendar,
  Building,
  Smartphone,
  Navigation,
  ShieldCheck,
  User,
  Sparkles,
  Info,
  BookOpen,
  GraduationCap,
  Lock,
  KeyRound,
  Scan,
  ShieldAlert,
  Delete,
  Eye,
  EyeOff,
  Hash,
  Check,
  X
} from 'lucide-react';

interface CheckInKioskProps {
  isMobileModal?: boolean;
  onCloseMobileModal?: () => void;
  isPublicKiosk?: boolean;
  onExitPublicKiosk?: () => void;
}

export const CheckInKiosk: React.FC<CheckInKioskProps> = ({
  isMobileModal = false,
  onCloseMobileModal,
  isPublicKiosk = false,
  onExitPublicKiosk
}) => {
  const { currentUser, allUsers, loginWithCredentials, loginWithPin, logout } = useAuth();
  const { showToast } = useNotification();
  const { t, isKhmer } = useLanguage();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [gpsSimulated, setGpsSimulated] = useState<'on_campus' | 'off_campus'>('on_campus');
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [useCustomTime, setUseCustomTime] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsMode, setGpsMode] = useState<'simulated' | 'device'>('simulated');
  const [geoDistance, setGeoDistance] = useState<number | null>(null);

  // Kiosk In-Terminal Teacher Login States (When user is not authenticated as a teacher)
  const [kioskIdentifier, setKioskIdentifier] = useState<string>('');
  const [kioskPin, setKioskPin] = useState<string>('');
  const [kioskLoginError, setKioskLoginError] = useState<string | null>(null);
  const [isKioskLoggingIn, setIsKioskLoggingIn] = useState<boolean>(false);

  // Anti-Proxy Restriction States
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    action: 'checkin' | 'checkout';
    specificSubjectId?: string;
  }>({
    isOpen: false,
    action: 'checkin'
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinDigits, setShowPinDigits] = useState<boolean>(false);

  // Handle in-terminal teacher authentication
  const handleKioskTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskIdentifier.trim()) return;
    setIsKioskLoggingIn(true);
    setKioskLoginError(null);
    try {
      const success = kioskPin.trim()
        ? await loginWithPin(kioskIdentifier.trim(), kioskPin.trim())
        : await loginWithCredentials(kioskIdentifier.trim());
      if (success) {
        showToast(
          isKhmer
            ? 'បានផ្ទៀងផ្ទាត់ដោយជោគជ័យ! វត្តមានត្រូវបានចាក់សោរសម្រាប់តែអ្នក។'
            : 'Authenticated successfully! Terminal locked to your owned profile.',
          'success'
        );
        setKioskIdentifier('');
        setKioskPin('');
      } else {
        setKioskLoginError(
          isKhmer
            ? 'រកមិនឃើញគណនីគ្រូ ឬលេខកូដសម្ងាត់ PIN មិនត្រឹមត្រូវ។'
            : 'Faculty account not found or invalid PIN. Please verify credentials.'
        );
      }
    } catch {
      setKioskLoginError(
        isKhmer ? 'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់។ សូមព្យាយាមម្តងទៀត។' : 'Authentication failed. Please try again.'
      );
    } finally {
      setIsKioskLoggingIn(false);
    }
  };

  const handleQuickTeacherAuth = async (code: string) => {
    setIsKioskLoggingIn(true);
    setKioskLoginError(null);
    try {
      const success = await loginWithCredentials(code);
      if (success) {
        showToast(
          isKhmer ? `បានចូលគណនីគ្រូ [${code}] ដោយជោគជ័យ!` : `Authenticated as teacher [${code}] successfully!`,
          'success'
        );
      }
    } finally {
      setIsKioskLoggingIn(false);
    }
  };

  // Subscribe to live settings updates
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  // Try fetching browser GPS if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setDeviceCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          const check = AttendanceEngine.verifyLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            systemSettings
          );
          setGeoDistance(check.distance);
        },
        () => {
          // Fallback to simulated if device location denied
          setGpsMode('simulated');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }, [systemSettings]);
  const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
  const employees = StorageService.getEmployees().filter(e => e.status === 'Active');
  const attendanceList = StorageService.getAttendance();

  // Create combined staff list with personal security PINs
  const staffList = [
    ...teachers.map(t => ({
      id: t.id,
      name: t.fullName,
      khmerName: t.khmerName,
      code: t.teacherId,
      type: 'teacher' as const,
      dept: t.department,
      scheduleId: t.assignedScheduleId,
      location: t.assignedLocation,
      photo: t.photoUrl,
      pinCode: t.pinCode || '1234',
      email: t.email
    })),
    ...employees.map(e => ({
      id: e.id,
      name: e.fullName,
      khmerName: e.khmerName,
      code: e.employeeId,
      type: 'employee' as const,
      dept: e.department,
      scheduleId: e.assignedScheduleId,
      location: e.workLocation,
      photo: e.photoUrl,
      pinCode: e.pinCode || '1234',
      email: e.email
    }))
  ];

  // Strictly lock attendance to authenticated user's owned profile (No switching allowed)
  const activeStaff = React.useMemo(() => {
    if (!currentUser) return null;

    // 1. By linked personId
    if (currentUser.personId) {
      const byPersonId = staffList.find(
        s => s.id === currentUser.personId || s.code.toLowerCase() === currentUser.personId?.toLowerCase()
      );
      if (byPersonId) return byPersonId;
    }

    // 2. By user email
    if (currentUser.email) {
      const byEmail = staffList.find(
        s => s.email && s.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
    }

    // 3. By user full name
    if (currentUser.fullName) {
      const byName = staffList.find(
        s => s.name.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (byName) return byName;
    }

    // 4. Do not default to other teachers for admin accounts
    return null;
  }, [currentUser, staffList]);

  // Keep selectedStaffId locked to activeStaff.id
  useEffect(() => {
    if (activeStaff) {
      setSelectedStaffId(activeStaff.id);
    }
  }, [activeStaff]);

  // Live ticking clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(isKhmer ? 'km-KH' : 'en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      setCurrentDate(
        now.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isKhmer]);

  const schedules = StorageService.getSchedules();
  const activeSchedule = schedules.find(s => s.id === activeStaff?.scheduleId) || schedules[0] || {
    id: 'default',
    name: 'Standard Morning Shift',
    startTime: '07:30',
    endTime: '11:30',
    gracePeriodMinutes: 10,
    location: 'Main Campus - Central Building'
  };

  const isTeacher = activeStaff?.type === 'teacher';
  const teacherSubjectSchedules = isTeacher && activeStaff
    ? StorageService.getSubjectSchedulesForTeacher(activeStaff.id)
    : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const effectiveTime = useCustomTime && customTimeInput
    ? customTimeInput
    : AttendanceEngine.getCurrentTimeString();

  // Auto-select active present-time subject period for teacher
  useEffect(() => {
    if (isTeacher && teacherSubjectSchedules.length > 0) {
      // 1. Look for an in-progress class (checked in, not checked out)
      const inProgress = teacherSubjectSchedules.find(sub => {
        const rec = attendanceList.find(
          a => a.personId === activeStaff.id && a.date === todayStr && a.subjectScheduleId === sub.id
        );
        return rec && rec.checkInTime && !rec.checkOutTime;
      });

      if (inProgress) {
        setSelectedSubjectId(inProgress.id);
        return;
      }

      // 2. Find class active at the PRESENT TIME
      const activeNow = teacherSubjectSchedules.find(sub => {
        return AttendanceEngine.isSubjectScheduleAtPresentTime(sub, effectiveTime, todayStr).isValid;
      });

      if (activeNow) {
        setSelectedSubjectId(activeNow.id);
        return;
      }

      // 3. Fallback to first schedule or maintain selection if valid
      if (!selectedSubjectId || !teacherSubjectSchedules.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(teacherSubjectSchedules[0].id);
      }
    }
  }, [activeStaff?.id, isTeacher, teacherSubjectSchedules.length, attendanceList.length, effectiveTime]);

  const activeSubject = isTeacher
    ? (teacherSubjectSchedules.find(s => s.id === selectedSubjectId) || teacherSubjectSchedules[0])
    : undefined;

  const activeSubjectTimeCheck = isTeacher && activeSubject
    ? AttendanceEngine.isSubjectScheduleAtPresentTime(activeSubject, effectiveTime, todayStr)
    : null;
  const isCurrentSubjectPresentTime = activeSubjectTimeCheck ? activeSubjectTimeCheck.isValid : true;

  const currentScheduledEndTime = isTeacher && activeSubject ? activeSubject.endTime : activeSchedule.endTime;
  const isOverEndTime = AttendanceEngine.timeToMinutes(effectiveTime) >= AttendanceEngine.timeToMinutes(currentScheduledEndTime);

  // Selected subject attendance record for today (if teacher)
  const activeSubjectRecord = isTeacher && activeSubject
    ? attendanceList.find(
        a => a.personId === activeStaff?.id && a.date === todayStr && a.subjectScheduleId === activeSubject.id
      )
    : undefined;

  // General shift record (for employee)
  const generalRecord = !isTeacher
    ? attendanceList.find(a => a.personId === activeStaff?.id && a.date === todayStr && !a.subjectScheduleId)
    : undefined;

  const currentRecord = isTeacher ? activeSubjectRecord : generalRecord;

  // Actual Check-in Execution
  const executeCheckIn = (specificSubjectId?: string) => {
    if (!activeStaff) return;

    const targetSubject = isTeacher
      ? (teacherSubjectSchedules.find(s => s.id === (specificSubjectId || selectedSubjectId)) || activeSubject)
      : undefined;

    // Strict validation: Do not allow scan-in if current time is over end-time
    const targetEndTime = isTeacher && targetSubject ? targetSubject.endTime : activeSchedule.endTime;
    const curMins = AttendanceEngine.timeToMinutes(effectiveTime);
    const endMins = AttendanceEngine.timeToMinutes(targetEndTime);

    if (curMins >= endMins) {
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ ម៉ោងបច្ចុប្បន្ន (${effectiveTime}) បានដល់ ឬហួសម៉ោងបញ្ចប់កាលវិភាគ (${targetEndTime}) រួចហើយ!`
          : `Cannot scan in: Current time (${effectiveTime}) is over the scheduled end-time (${targetEndTime}). Scanning in after end-time is strictly prohibited.`,
        'error'
      );
      return;
    }

    // Strict validation: Prevent scanning into a schedule that is not at the present time
    if (isTeacher && targetSubject) {
      const timeCheck = AttendanceEngine.isSubjectScheduleAtPresentTime(targetSubject, effectiveTime, todayStr);
      if (!timeCheck.isValid) {
        showToast(
          isKhmer && timeCheck.khmerMessage ? timeCheck.khmerMessage : (timeCheck.message || 'Cannot scan in: Selected schedule is not active at the present time.'),
          'error'
        );
        return;
      }
    }

    setIsSubmitting(true);

    // Determine GPS coordinates (real device or simulated)
    let lat: number;
    let lng: number;

    if (gpsMode === 'device' && deviceCoords) {
      lat = deviceCoords.latitude;
      lng = deviceCoords.longitude;
    } else {
      const isOnCampus = gpsSimulated === 'on_campus';
      lat = isOnCampus ? systemSettings.defaultLocationLatitude : systemSettings.defaultLocationLatitude + 0.05;
      lng = isOnCampus ? systemSettings.defaultLocationLongitude : systemSettings.defaultLocationLongitude + 0.05;
    }

    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId: activeStaff.id,
        personName: activeStaff.name,
        khmerName: activeStaff.khmerName,
        personType: activeStaff.type,
        department: activeStaff.dept,
        scheduleId: activeStaff.scheduleId,
        subjectScheduleId: targetSubject?.id,
        customTime: effectiveTime,
        latitude: lat,
        longitude: lng
      });

      setIsSubmitting(false);

      if (result.success) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast(
          isKhmer
            ? `ស្កេនចូលជោគជ័យ៖ ${activeStaff.khmerName || activeStaff.name} ${targetSubject ? `[${targetSubject.khmerSubject || targetSubject.subject}]` : ''} (${result.record?.status === 'Late' ? 'មកយឺត' : 'ទាន់ម៉ោង'})`
            : result.message,
          result.record?.status === 'Late' ? 'warning' : 'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 350);
  };

  // Actual Check-out Execution
  const executeCheckOut = (specificSubjectId?: string) => {
    if (!activeStaff) return;
    setIsSubmitting(true);

    const effectiveTime = useCustomTime && customTimeInput
      ? customTimeInput
      : AttendanceEngine.getCurrentTimeString();

    const targetSubjectId = isTeacher
      ? (specificSubjectId || selectedSubjectId || activeSubject?.id)
      : undefined;

    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId: activeStaff.id,
        personName: activeStaff.name,
        subjectScheduleId: targetSubjectId,
        customTime: effectiveTime
      });

      setIsSubmitting(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `ស្កេនចេញជោគជ័យ៖ ${activeStaff.khmerName || activeStaff.name} ម៉ោង ${effectiveTime}`
            : result.message,
          'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 350);
  };

  // Trigger Check-in (Checks Anti-Proxy PIN restriction)
  const handleCheckIn = (specificSubjectId?: string) => {
    if (!activeStaff) return;

    if (systemSettings.requirePinForKiosk !== false) {
      setPinError(null);
      setEnteredPin('');
      setPinModal({
        isOpen: true,
        action: 'checkin',
        specificSubjectId
      });
      return;
    }

    executeCheckIn(specificSubjectId);
  };

  // Trigger Check-out (Checks Anti-Proxy PIN restriction)
  const handleCheckOut = (specificSubjectId?: string) => {
    if (!activeStaff) return;

    if (systemSettings.requirePinForKiosk !== false) {
      setPinError(null);
      setEnteredPin('');
      setPinModal({
        isOpen: true,
        action: 'checkout',
        specificSubjectId
      });
      return;
    }

    executeCheckOut(specificSubjectId);
  };

  // Verify PIN submission before executing attendance action
  const handleVerifyPinAndSubmit = () => {
    if (!activeStaff) return;
    const requiredPin = activeStaff.pinCode || '1234';

    if (enteredPin !== requiredPin) {
      setPinError(
        isKhmer
          ? 'លេខកូដសម្ងាត់ PIN មិនត្រឹមត្រូវ! មិនអនុញ្ញាតឱ្យស្កេនជំនួសគ្រូដទៃឡើយ!'
          : 'Incorrect PIN! You cannot clock in/out for another teacher.'
      );
      // Log unauthorized attempt to audit logs
      StorageService.addAuditLog({
        userId: currentUser?.id || 'terminal_kiosk',
        userName: currentUser?.fullName || 'Kiosk Terminal',
        userRole: currentUser?.role || 'kiosk',
        action: 'SECURITY_ALERT_PROXY_ATTEMPT',
        target: `Staff: ${activeStaff.name} [${activeStaff.code}]`,
        details: `Failed PIN attempt to clock in as ${activeStaff.name} (${activeStaff.code})`,
        ipAddress: 'Kiosk Terminal'
      });
      return;
    }

    // Success: close modal and perform action
    const currentAction = pinModal.action;
    const currentSubId = pinModal.specificSubjectId;
    setPinModal({ isOpen: false, action: 'checkin' });
    setEnteredPin('');
    setPinError(null);

    if (currentAction === 'checkin') {
      executeCheckIn(currentSubId);
    } else {
      executeCheckOut(currentSubId);
    }
  };

  return (
    <div className={isMobileModal ? 'p-2 sm:p-4 max-w-md mx-auto w-full' : 'space-y-6 max-w-4xl mx-auto w-full'}>
      
      {/* Top Card: Responsive Check-in Terminal */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                {isKhmer ? 'ចំណុចស្កេនវត្តមានជាក់ស្តែង' : 'Live Attendance Terminal'}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black mt-1">
              {isKhmer ? 'ចំណុចស្កេនវត្តមានគ្រូ និងបុគ្គលិក' : 'Teacher & Employee Kiosk'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isKhmer
                ? 'ប្រព័ន្ធកត់ត្រាវត្តមានផ្ទាល់ • ស្កេនចូល និងចេញការងារ'
                : 'Real-time attendance kiosk • Clock in & out with GPS verification'}
            </p>
          </div>

          {/* Live Clock Display & Exit Kiosk in Public Mode */}
          <div className="flex items-center gap-3">
            {isPublicKiosk && onExitPublicKiosk && (
              <button
                type="button"
                onClick={onExitPublicKiosk}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span>{isKhmer ? 'ចាកចេញ / ចូលប្រព័ន្ធ' : 'Portal Login'}</span>
              </button>
            )}

            <div className="text-right sm:text-right bg-white/10 px-3.5 py-2 rounded-2xl border border-white/15 self-start sm:self-auto shrink-0">
              <div className="text-xl sm:text-3xl font-mono font-extrabold tracking-wider text-white">
                {currentTime || '--:--:--'}
              </div>
              <div className="text-[11px] sm:text-xs text-indigo-200 font-medium">
                {currentDate}
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Content Body */}
        <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">

          {/* Strict Owned Attendance Banner (No Switching Allowed) */}
          {activeStaff ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-r from-indigo-50/95 via-slate-50 to-indigo-50/95 rounded-2xl border-2 border-indigo-200/90 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      {isKhmer ? 'កត់ត្រាវត្តមានផ្ទាល់ខ្លួន (ចាក់សោរសម្រាប់តែអ្នក)' : 'Locked to Your Authenticated Account'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 uppercase tracking-wide">
                      {isKhmer ? 'វត្តមានផ្ទាល់ខ្លួន' : 'Owned Only'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                    {isKhmer
                      ? 'ប្រព័ន្ធត្រូវបានចាក់សោរសម្រាប់តែគណនីរបស់អ្នក។ មិនអនុញ្ញាតឱ្យផ្លាស់ប្តូរ ឬស្កេនជំនួសគ្រូដទៃឡើយ។'
                      : 'Anti-proxy policy active: Switching staff is disabled. All attendance is recorded under your personal identity.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 shadow-2xs self-start sm:self-auto shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-black text-indigo-950">
                  [{activeStaff.code}] {activeStaff.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 rounded-3xl p-6 sm:p-8 border-2 border-indigo-200/90 shadow-sm space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {isKhmer ? 'ចូលគណនីគ្រូដើម្បីកត់ត្រាវត្តមានផ្ទាល់ខ្លួន' : 'Teacher Login for Owned Attendance'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {isKhmer
                    ? 'មិនអនុញ្ញាតឱ្យផ្លាស់ប្តូរ ឬស្កេនជំនួសគ្រូដទៃឡើយ។ លោកគ្រូ-អ្នកគ្រូ ត្រូវតែ Login ចូលគណនីផ្ទាល់ខ្លួនជាមុនសិន ដើម្បីកត់ត្រាវត្តមាន។'
                    : 'Anti-proxy policy active: Switching staff is disabled. Each teacher must log in to their personal account to record owned attendance.'}
                </p>
                {currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'admin_hr') && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-semibold mt-1">
                    <span>Admin: {currentUser.fullName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-700 font-bold">Proxy check-in disabled</span>
                  </div>
                )}
              </div>

              {/* Quick Login Form */}
              <form onSubmit={handleKioskTeacherLogin} className="max-w-md mx-auto space-y-4">
                {kioskLoginError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{kioskLoginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'លេខសម្គាល់គ្រូ (Teacher ID) ឬអ៊ីមែល' : 'Teacher ID or Email'}
                  </label>
                  <input
                    type="text"
                    value={kioskIdentifier}
                    onChange={e => setKioskIdentifier(e.target.value)}
                    placeholder="TCH-2026-001 or sok.chenda@edutrack.edu.kh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'លេខសម្ងាត់ផ្ទាល់ខ្លួន (PIN)' : 'Security PIN (Default: 1234)'}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={kioskPin}
                    onChange={e => setKioskPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-center tracking-widest text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isKioskLoggingIn || !kioskIdentifier.trim()}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  {isKioskLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>{isKhmer ? 'ផ្ទៀងផ្ទាត់ & បើកវត្តមានផ្ទាល់ខ្លួន' : 'Authenticate & Record Owned Attendance'}</span>
                  )}
                </button>
              </form>

              {/* One-click Faculty Test Sign-in */}
              <div className="pt-4 border-t border-slate-200 max-w-md mx-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
                  {isKhmer ? 'ចូលគណនីគ្រូផ្ទាល់ខ្លួន (One-Click Testing)' : 'One-Click Faculty Authentication:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickTeacherAuth('TCH-2026-001')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
                  >
                    <div className="font-bold text-slate-800 text-xs truncate">Sok Chenda</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-001</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTeacherAuth('TCH-2026-002')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
                  >
                    <div className="font-bold text-slate-800 text-xs truncate">Chann Borey</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-002</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTeacherAuth('TCH-2026-003')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-left"
                  >
                    <div className="font-bold text-slate-800 text-xs truncate">Keo Piseth</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-003</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Staff Profile & Today's Schedule Card */}
          {activeStaff && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <img
                  src={activeStaff.photo}
                  alt={activeStaff.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-indigo-200 shadow-sm shrink-0"
                />
                <div className="min-w-0 truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight truncate">
                      {isKhmer && activeStaff.khmerName ? activeStaff.khmerName : activeStaff.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase shrink-0">
                      {isKhmer ? (activeStaff.type === 'teacher' ? 'គ្រូបង្រៀន' : 'បុគ្គលិក') : activeStaff.type}
                    </span>
                  </div>
                  {activeStaff.khmerName && (
                    <p className="text-xs text-slate-600 mt-0.5 font-medium truncate">
                      {isKhmer ? activeStaff.name : activeStaff.khmerName}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {activeStaff.dept} • ID: <span className="font-mono font-semibold">{activeStaff.code}</span>
                  </p>
                </div>
              </div>

              {/* Today's Schedule Details */}
              <div className="border-t md:border-t-0 md:border-l border-indigo-200/60 pt-3 md:pt-0 md:pl-6 space-y-1 shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">
                  {isTeacher 
                    ? (isKhmer ? 'កាលវិភាគបង្រៀនតាមមុខវិជ្ជា' : "Subject Teaching Mode")
                    : (isKhmer ? 'កាលវិភាគថ្ងៃនេះ' : "Today's Assigned Shift")}
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {isTeacher
                    ? `${teacherSubjectSchedules.length} ${isKhmer ? 'ម៉ោងបង្រៀនថ្ងៃនេះ' : 'Class Periods Today'}`
                    : activeSchedule.name}
                </p>
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    {isTeacher && activeSubject
                      ? `${activeSubject.startTime} — ${activeSubject.endTime} (${activeSubject.periodName})`
                      : `${activeSchedule.startTime} — ${activeSchedule.endTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {isTeacher && activeSubject
                      ? `${activeSubject.room} • ${activeSubject.gradeClass}`
                      : (activeStaff.location || activeSchedule.location)}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TEACHER ONLY: Interactive Subject Schedule Selector */}
          {isTeacher && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {isKhmer ? 'ជ្រើសរើសម៉ោងបង្រៀនតាមមុខវិជ្ជា (ស្កេនចូល/ចេញ)' : 'Class Timetable & Subject Check-in / Check-out'}
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 self-start sm:self-auto">
                  {isKhmer 
                    ? `មាន ${teacherSubjectSchedules.length} ម៉ោងក្នុងកាលវិភាគ`
                    : `${teacherSubjectSchedules.length} Class Periods Today`}
                </span>
              </div>

              {teacherSubjectSchedules.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">
                      {isKhmer 
                        ? 'គ្រូបង្រៀនត្រូវតែស្កេនវត្តមានតាមកាលវិភាគមុខវិជ្ជាជាក់លាក់'
                        : 'Teachers must check in and check out by subject schedule'}
                    </span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {isKhmer 
                        ? 'ពុំទាន់មានកាលវិភាគមុខវិជ្ជាត្រូវបានកំណត់សម្រាប់គ្រូនេះនៅឡើយទេ។ សូមចូលទៅកាន់ទំព័រកាលវិភាគដើម្បីបន្ថែមមុខវិជ្ជា។'
                        : 'No subject class periods are assigned to this teacher yet. Please add subject schedules in Schedule Management.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teacherSubjectSchedules.map((sub, idx) => {
                    const isSelected = (activeSubject?.id === sub.id);
                    const subRecord = attendanceList.find(
                      a => a.personId === activeStaff?.id && a.date === todayStr && a.subjectScheduleId === sub.id
                    );
                    const isCheckedIn = Boolean(subRecord?.checkInTime);
                    const isCheckedOut = Boolean(subRecord?.checkOutTime);
                    const timeCheck = AttendanceEngine.isSubjectScheduleAtPresentTime(sub, effectiveTime, todayStr);
                    const isPresentTime = timeCheck.isValid;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`cursor-pointer relative p-3.5 rounded-2xl border transition-all duration-150 text-left flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                            : isPresentTime
                            ? 'bg-white border-emerald-300 hover:border-emerald-500 shadow-xs'
                            : 'bg-white/80 border-slate-200 opacity-90 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        {/* Card Header: Period & Time */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : isPresentTime
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.periodName}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Clock className={`w-3 h-3 ${isPresentTime ? 'text-emerald-600' : 'text-slate-400'}`} />
                            {sub.startTime} - {sub.endTime}
                          </span>
                        </div>

                        {/* Card Body: Subject & Class */}
                        <div>
                          <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                            {sub.subject}
                          </h5>
                          {sub.khmerSubject && (
                            <p className="text-[11px] text-slate-500 font-khmer mt-0.5">
                              {sub.khmerSubject}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                              {sub.gradeClass}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {sub.room}
                            </span>
                          </div>
                        </div>

                        {/* Status Indicator & Quick Action */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                          {isCheckedOut ? (
                            <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-sky-600" />
                              {isKhmer ? 'បង្រៀនចប់' : 'Completed'} ({subRecord?.checkInTime} - {subRecord?.checkOutTime})
                            </span>
                          ) : isCheckedIn ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {isKhmer ? 'កំពុងបង្រៀន' : 'In Class'} ({subRecord?.checkInTime})
                            </span>
                          ) : isPresentTime ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {isKhmer ? 'ម៉ោងបច្ចុប្បន្ន' : 'Active Now'}
                            </span>
                          ) : timeCheck.reason === 'too_early' ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {isKhmer ? `ចាប់ផ្តើម ${sub.startTime}` : `Starts ${sub.startTime}`}
                            </span>
                          ) : timeCheck.reason === 'too_late' ? (
                            <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {isKhmer ? `ហួសម៉ោងបញ្ចប់ (${sub.endTime})` : `Over End-Time (${sub.endTime})`}
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {isKhmer ? 'គ្មានកាលវិភាគថ្ងៃនេះ' : 'Off Schedule'}
                            </span>
                          )}

                          {/* Quick trigger button */}
                          {!isCheckedIn ? (
                            isPresentTime ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubjectId(sub.id);
                                  handleCheckIn(sub.id);
                                }}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-wide shrink-0 transition-colors shadow-xs"
                              >
                                {isKhmer ? 'ស្កេនចូល' : 'Check In'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubjectId(sub.id);
                                  showToast(
                                    isKhmer && timeCheck.khmerMessage
                                      ? timeCheck.khmerMessage
                                      : (timeCheck.message || 'Cannot scan in: Schedule is not at the present time.'),
                                    'warning'
                                  );
                                }}
                                className={`px-2 py-1 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 text-[10px] cursor-not-allowed ${
                                  timeCheck.reason === 'too_late'
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                                }`}
                                title={timeCheck.message}
                              >
                                <Lock className={`w-3 h-3 ${timeCheck.reason === 'too_late' ? 'text-rose-500' : 'text-slate-400'}`} />
                                {timeCheck.reason === 'too_early'
                                  ? (isKhmer ? 'មិនទាន់ដល់ម៉ោង' : 'Upcoming')
                                  : timeCheck.reason === 'too_late'
                                  ? (isKhmer ? 'ហួសម៉ោងបញ្ចប់' : 'Over End-Time')
                                  : (isKhmer ? 'ខុសថ្ងៃ' : 'Locked')}
                              </button>
                            )
                          ) : !isCheckedOut ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubjectId(sub.id);
                                handleCheckOut(sub.id);
                              }}
                              disabled={isSubmitting}
                              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-wide shrink-0 transition-colors shadow-xs"
                            >
                              {isKhmer ? 'ស្កេនចេញ' : 'Check Out'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ✓ {isKhmer ? 'រួចរាល់' : 'Done'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Current Session Attendance Status Banner & Action Buttons */}
          {activeStaff && (
            <>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                {isTeacher ? <GraduationCap className="w-5 h-5 text-indigo-600" /> : <Calendar className="w-5 h-5 text-indigo-600" />}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  {isTeacher
                    ? (isKhmer ? `ស្ថានភាពម៉ោងបង្រៀន៖ ${activeSubject?.subject || 'មុខវិជ្ជា'}` : `Selected Class Status: ${activeSubject?.subject || 'Subject'}`)
                    : (isKhmer ? 'ស្ថានភាពវត្តមានថ្ងៃនេះ' : "Today's Attendance Status")}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900">
                  {currentRecord ? (
                    isKhmer ? (
                      currentRecord.status === 'Present' ? 'មានវត្តមាន (ទាន់ម៉ោង)' :
                      currentRecord.status === 'Late' ? `មកយឺត (${currentRecord.lateMinutes} នាទី)` :
                      currentRecord.status === 'Absent' ? 'អវត្តមាន' :
                      currentRecord.status === 'Leave' ? 'សុំច្បាប់' : currentRecord.status
                    ) : (
                      currentRecord.status === 'Late' ? `Late (${currentRecord.lateMinutes}m)` : currentRecord.status
                    )
                  ) : (
                    isKhmer ? 'មិនទាន់ស្កេនវត្តមាន' : 'Not Checked In'
                  )}
                </span>
              </div>
            </div>

            {/* Timestamps if recorded */}
            <div className="text-left sm:text-right text-xs">
              {currentRecord?.checkInTime && (
                <div className="font-semibold text-emerald-700">
                  {isKhmer ? 'ស្កេនចូល៖ ' : 'Checked in: '}
                  <span className="font-mono font-bold">{currentRecord.checkInTime}</span>
                  {currentRecord.lateMinutes > 0 && (
                    <span className="text-amber-700 ml-1">
                      ({isKhmer ? `យឺត ${currentRecord.lateMinutes} នាទី` : `${currentRecord.lateMinutes}m late`})
                    </span>
                  )}
                </div>
              )}
              {currentRecord?.checkOutTime && (
                <div className="font-semibold text-sky-700 mt-0.5">
                  {isKhmer ? 'ស្កេនចេញ៖ ' : 'Checked out: '}
                  <span className="font-mono font-bold">{currentRecord.checkOutTime}</span>
                </div>
              )}
              {!currentRecord && (
                <span className="text-slate-400">
                  {isTeacher
                    ? (isKhmer ? `ត្រៀមស្កេនចូលបង្រៀនម៉ោង ${activeSubject?.startTime || ''}` : `Ready to clock in for ${activeSubject?.periodName || 'class'}`)
                    : (isKhmer ? 'ត្រៀមស្កេនវត្តមានសម្រាប់វេនការងារ' : "Ready for today's clock-in")}
                </span>
              )}
            </div>
          </div>

          {/* Large Action Buttons (Check-in & Check-out) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            
            {/* Check-in Button */}
            <button
              onClick={() => handleCheckIn()}
              disabled={
                isSubmitting ||
                Boolean(currentRecord?.checkInTime) ||
                (isTeacher && !activeSubject) ||
                (isTeacher && !isCurrentSubjectPresentTime) ||
                isOverEndTime
              }
              className={`flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl font-black text-center transition-all duration-150 active:scale-98 shadow-lg ${
                currentRecord?.checkInTime ||
                (isTeacher && !activeSubject) ||
                (isTeacher && !isCurrentSubjectPresentTime) ||
                isOverEndTime
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:shadow-xl'
              }`}
            >
              {isOverEndTime ? (
                <Lock className="w-9 h-9 sm:w-10 sm:h-10 mb-2 text-rose-500" />
              ) : isTeacher && !isCurrentSubjectPresentTime ? (
                <Lock className="w-9 h-9 sm:w-10 sm:h-10 mb-2 text-slate-400" />
              ) : (
                <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10 mb-2" />
              )}
              <span className="text-base sm:text-xl font-black tracking-tight uppercase">
                {isTeacher && !activeSubject
                  ? (isKhmer ? 'ត្រូវមានកាលវិភាគមុខវិជ្ជា' : 'SUBJECT SCHEDULE REQUIRED')
                  : currentRecord?.checkInTime
                  ? (isKhmer ? 'បានស្កេនចូលរួចរាល់' : 'Already Checked In')
                  : isOverEndTime
                  ? (isKhmer ? 'មិនអនុញ្ញាតស្កេនចូល — ហួសម៉ោងបញ្ចប់' : 'CANNOT SCAN IN — OVER END-TIME')
                  : isTeacher && !isCurrentSubjectPresentTime
                  ? (isKhmer ? 'មិនមែនជាម៉ោងបង្រៀនបច្ចុប្បន្ន' : 'CANNOT SCAN IN — NOT PRESENT TIME')
                  : isTeacher && activeSubject
                  ? (isKhmer ? `ស្កេនចូល៖ ${activeSubject.khmerSubject || activeSubject.subject}` : `CHECK IN — ${activeSubject.subject}`)
                  : (isKhmer ? 'ស្កេនចូល (CHECK IN)' : 'CHECK IN')}
              </span>
              <span className="text-xs font-medium opacity-90 mt-1">
                {isTeacher && !activeSubject
                  ? (isKhmer ? 'គ្រូត្រូវតែស្កេនចូលតាមកាលវិភាគមុខវិជ្ជា' : 'Teachers must clock in by specific subject period')
                  : currentRecord?.checkInTime
                  ? (isKhmer ? `បានកត់ត្រាម៉ោង ${currentRecord.checkInTime}` : `Recorded at ${currentRecord.checkInTime}`)
                  : isOverEndTime
                  ? (isKhmer ? `កាលវិភាគបានបញ្ចប់នៅម៉ោង ${currentScheduledEndTime}។ ម៉ោងបច្ចុប្បន្ន៖ ${effectiveTime}។ ហាមស្កេនចូលពេលហួសម៉ោងបញ្ចប់។` : `Schedule ended at ${currentScheduledEndTime}. Current time: ${effectiveTime}. Scanning in after end-time is strictly prohibited.`)
                  : isTeacher && !isCurrentSubjectPresentTime
                  ? (activeSubjectTimeCheck?.khmerMessage || activeSubjectTimeCheck?.message || (isKhmer ? 'មិនអនុញ្ញាតឱ្យស្កេនចូលម៉ោងដែលមិនមែនជាពេលបច្ចុប្បន្នឡើយ' : 'Teachers can only scan in during present class hours'))
                  : isTeacher && activeSubject
                  ? `${activeSubject.periodName} (${activeSubject.startTime} - ${activeSubject.endTime}) • ${activeSubject.gradeClass} (${activeSubject.room})`
                  : (isKhmer ? 'ចុចទីនេះដើម្បីកត់ត្រាវត្តមានចូល' : "Clock in for today's shift")}
              </span>
            </button>

            {/* Check-out Button */}
            <button
              onClick={() => handleCheckOut()}
              disabled={isSubmitting || !currentRecord?.checkInTime || Boolean(currentRecord?.checkOutTime) || (isTeacher && !activeSubject)}
              className={`flex flex-col items-center justify-center p-5 sm:p-7 rounded-3xl font-black text-center transition-all duration-150 active:scale-98 shadow-lg ${
                !currentRecord?.checkInTime || currentRecord?.checkOutTime || (isTeacher && !activeSubject)
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:shadow-xl'
              }`}
            >
              <LogOut className="w-9 h-9 sm:w-10 sm:h-10 mb-2" />
              <span className="text-base sm:text-xl font-black tracking-tight uppercase">
                {isTeacher && !activeSubject
                  ? (isKhmer ? 'ត្រូវមានកាលវិភាគមុខវិជ្ជា' : 'SUBJECT SCHEDULE REQUIRED')
                  : currentRecord?.checkOutTime
                  ? (isKhmer ? 'បានស្កេនចេញរួចរាល់' : 'Session Completed')
                  : isTeacher && activeSubject
                  ? (isKhmer ? `ស្កេនចេញ៖ ${activeSubject.khmerSubject || activeSubject.subject}` : `CHECK OUT — ${activeSubject.subject}`)
                  : (isKhmer ? 'ស្កេនចេញ (CHECK OUT)' : 'CHECK OUT')}
              </span>
              <span className="text-xs font-medium opacity-90 mt-1">
                {isTeacher && !activeSubject
                  ? (isKhmer ? 'គ្រូត្រូវតែស្កេនចេញតាមកាលវិភាគមុខវិជ្ជា' : 'Teachers must clock out by specific subject period')
                  : currentRecord?.checkOutTime
                  ? (isKhmer ? `បានស្កេនចេញម៉ោង ${currentRecord.checkOutTime}` : `Checked out at ${currentRecord.checkOutTime}`)
                  : !currentRecord?.checkInTime
                  ? (isKhmer ? 'ត្រូវស្កេនចូលជាមុនសិន' : 'Check-in required first')
                  : isTeacher && activeSubject
                  ? (isKhmer ? `ចុចទីនេះដើម្បីបញ្ចប់ម៉ោងបង្រៀន ${activeSubject.subject}` : `End class session for ${activeSubject.gradeClass}`)
                  : (isKhmer ? 'ចុចទីនេះដើម្បីស្កេនចេញបញ្ចប់ការងារ' : "Clock out from today's shift")}
              </span>
            </button>

          </div>

          {/* Active Session Footer: Sign out / Switch for next teacher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isKhmer ? `កំពុងស្ថិតក្នុងគណនីគ្រូ ${activeStaff.name} [${activeStaff.code}]` : `Authenticated: ${activeStaff.name} [${activeStaff.code}]`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isKhmer ? 'វត្តមានផ្ទាល់ខ្លួនប៉ុណ្ណោះ។ មិនអនុញ្ញាតឱ្យផ្លាស់ប្តូរ ឬស្កេនជំនួសគ្រូដទៃឡើយ។' : 'Owned attendance only. Switching staff on this terminal is disabled.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                showToast(isKhmer ? 'បានចាកចេញពីប្រព័ន្ធ។ គ្រូបន្ទាប់អាច Login បាន។' : 'Signed out successfully. Next teacher may sign in.', 'info');
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs border border-rose-200 shadow-2xs hover:border-rose-300 transition-all self-start sm:self-auto shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{isKhmer ? 'ចាកចេញ / គ្រូបន្ទាប់ចូល (Sign Out)' : 'Sign Out / Next Teacher'}</span>
            </button>
          </div>
        </>
      )}

          {/* Test & Simulation Controls Drawer */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {isKhmer ? 'ផ្ទាំងសាកល្បងម៉ោង និងទីតាំង GPS' : 'Testing & Simulator Controls'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isKhmer
                  ? 'សាកល្បងម៉ោងចូលយឺត (ឧ. 07:55) ឬទីតាំងក្រៅសាលា'
                  : 'Simulate early, on-time, late, or geofence boundary tests'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Geofence Simulator & Device Location Toggle */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      {isKhmer ? 'ទីតាំងបរិវេណសាលា' : 'GPS Campus Boundary'}
                      {systemSettings.enforceGeofence ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          {isKhmer ? 'កំពុងអនុវត្តកំហិត' : 'ENFORCED'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">
                          {isKhmer ? 'មិនកំហិត (Off)' : 'OFF'}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isKhmer
                        ? `កាំ ${systemSettings.geofenceRadiusMeters}ម ជុំវិញសាលា`
                        : `Radius: ${systemSettings.geofenceRadiusMeters}m from Campus`}
                      {deviceCoords && geoDistance !== null && (
                        <span className="block text-[9px] text-indigo-600 font-mono">
                          Device GPS: {geoDistance}m away ({geoDistance <= systemSettings.geofenceRadiusMeters ? 'Inside' : 'Outside'})
                        </span>
                      )}
                    </span>
                  </div>

                  {deviceCoords && (
                    <button
                      type="button"
                      onClick={() => setGpsMode(gpsMode === 'device' ? 'simulated' : 'device')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                        gpsMode === 'device'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {gpsMode === 'device' ? 'Using Device GPS' : 'Use Real GPS'}
                    </button>
                  )}
                </div>

                {gpsMode === 'simulated' && (
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-end">
                    <button
                      onClick={() => setGpsSimulated('on_campus')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        gpsSimulated === 'on_campus'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isKhmer ? 'ក្នុងសាលា' : 'On-Campus'}
                    </button>
                    <button
                      onClick={() => setGpsSimulated('off_campus')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        gpsSimulated === 'off_campus'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isKhmer ? 'ក្រៅសាលា' : 'Outside'}
                    </button>
                  </div>
                )}
              </div>

              {/* Time Override Simulator */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 block">
                    {isKhmer ? 'ក្លែងធ្វើម៉ោង' : 'Time Simulation'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isKhmer ? 'សាកល្បងមកយឺត (ឧ. 07:55)' : 'Test late arrival (e.g. 07:55)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="time"
                    value={customTimeInput}
                    onChange={e => {
                      setCustomTimeInput(e.target.value);
                      setUseCustomTime(true);
                    }}
                    placeholder="07:50"
                    className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                  />
                  {useCustomTime && (
                    <button
                      onClick={() => {
                        setUseCustomTime(false);
                        setCustomTimeInput('');
                      }}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      {isKhmer ? 'កំណត់ឡើងវិញ' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Anti-Proxy Personal PIN Verification Modal */}
      {pinModal.isOpen && activeStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                    {isKhmer ? 'ផ្ទៀងផ្ទាត់លេខកូដសម្ងាត់ PIN' : 'Personal PIN Verification'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-amber-100/90 font-medium">
                    {isKhmer ? 'ប្រព័ន្ធការពារការស្កេនជំនួសគ្រូដទៃ' : 'Anti-Proxy Attendance Protection'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinModal({ isOpen: false, action: 'checkin' });
                  setEnteredPin('');
                  setPinError(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              
              {/* Staff Target Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src={activeStaff.photo}
                  alt={activeStaff.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {isKhmer && activeStaff.khmerName ? activeStaff.khmerName : activeStaff.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      pinModal.action === 'checkin' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {pinModal.action === 'checkin'
                        ? (isKhmer ? 'ស្កេនចូល' : 'CLOCK IN')
                        : (isKhmer ? 'ស្កេនចេញ' : 'CLOCK OUT')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ID: {activeStaff.code} • {activeStaff.dept}
                  </p>
                </div>
              </div>

              {/* Instruction */}
              <p className="text-xs text-slate-600 text-center font-medium">
                {isKhmer
                  ? `សូមបញ្ចូលលេខកូដ PIN ផ្ទាល់ខ្លួន ៤ ខ្ទង់ របស់លោកគ្រូ/អ្នកគ្រូ ដើម្បីបញ្ជាក់វត្តមាន៖`
                  : `Please enter your confidential 4-digit PIN to confirm your attendance:`}
              </p>

              {/* PIN Display (Circles / Digits) */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map(idx => {
                    const hasChar = enteredPin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                          hasChar
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm scale-105'
                            : 'border-slate-300 bg-slate-50 text-transparent'
                        }`}
                      >
                        {hasChar ? (showPinDigits ? enteredPin[idx] : '●') : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Show Digits Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPinDigits(!showPinDigits)}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                >
                  {showPinDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPinDigits ? (isKhmer ? 'លាក់លេខកូដ' : 'Hide Digits') : (isKhmer ? 'បង្ហាញលេខកូដ' : 'Show Digits')}</span>
                </button>
              </div>

              {/* Error Message */}
              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2 animate-in shake">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Invisible input for physical keyboard entry */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleVerifyPinAndSubmit();
                }}
              >
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={enteredPin}
                  onChange={e => {
                    setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (pinError) setPinError(null);
                  }}
                  className="sr-only"
                />
              </form>

              {/* Touchscreen Numpad */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (enteredPin.length < 6) {
                        setEnteredPin(prev => prev + num);
                        if (pinError) setPinError(null);
                      }
                    }}
                    className="h-12 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 border border-slate-200 font-mono font-black text-lg transition-all active:scale-95 shadow-2xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEnteredPin('');
                    if (pinError) setPinError(null);
                  }}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold text-xs transition-all active:scale-95"
                >
                  {isKhmer ? 'លុប' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 6) {
                      setEnteredPin(prev => prev + '0');
                      if (pinError) setPinError(null);
                    }
                  }}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 border border-slate-200 font-mono font-black text-lg transition-all active:scale-95 shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnteredPin(prev => prev.slice(0, -1));
                    if (pinError) setPinError(null);
                  }}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-700 border border-slate-200 font-bold text-xs flex items-center justify-center transition-all active:scale-95"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinModal({ isOpen: false, action: 'checkin' });
                    setEnteredPin('');
                    setPinError(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={enteredPin.length < 4}
                  onClick={handleVerifyPinAndSubmit}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isKhmer ? 'បញ្ជាក់វត្តមាន' : 'Verify & Clock In'}</span>
                </button>
              </div>

              {/* Default PIN note */}
              <p className="text-[10px] text-slate-400 text-center">
                {isKhmer
                  ? 'លេខកូដ PIN លំនាំដើម៖ 1234 (អាចកែប្រែក្នុងព័ត៌មានគ្រូ)'
                  : 'Default PIN is 1234 (configurable in Teacher Management profile)'}
              </p>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
