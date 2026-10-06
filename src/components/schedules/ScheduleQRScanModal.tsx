import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Camera,
  Upload,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Calendar,
  Check,
  Lock,
  LogOut,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduleQrService, DecodedScheduleResult } from '../../services/scheduleQrService.ts';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { Teacher, AttendanceRecord, TeacherSubjectSchedule } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';

interface ScheduleQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: AttendanceRecord) => void;
}

export const ScheduleQRScanModal: React.FC<ScheduleQRScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  // Modal Flow Step: 'scan' -> 'pin' -> 'success'
  const [step, setStep] = useState<'scan' | 'pin' | 'success'>('scan');

  // Scanner Mode: 'camera' | 'upload' | 'code'
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'code'>('camera');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  const scanLoopRef = useRef<number | null>(null);

  // Manual code input
  const [manualCode, setManualCode] = useState('');

  // Decoded QR Data
  const [decodedData, setDecodedData] = useState<DecodedScheduleResult | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TeacherSubjectSchedule | null>(null);

  // Available periods for the teacher today (for multi-period support)
  const availablePeriodsToday = useMemo(() => {
    if (!decodedData) return [];
    if (selectedTeacher) {
      const todayDayNum = new Date().getDay();
      const allSub = StorageService.getSubjectSchedules();
      const teacherSubs = allSub
        .filter(
          s =>
            (s.teacherId === selectedTeacher.id ||
              (s.teacherName &&
                s.teacherName.toLowerCase() === selectedTeacher.fullName.toLowerCase())) &&
            (s.daysOfWeek && s.daysOfWeek.length > 0
              ? s.daysOfWeek.includes(todayDayNum)
              : s.dayOfWeek === todayDayNum)
        )
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      if (teacherSubs.length > 0) {
        return teacherSubs;
      }
    }
    return decodedData.todayPeriods || (decodedData.subjectSchedule ? [decodedData.subjectSchedule] : []);
  }, [decodedData, selectedTeacher]);

  // Keep selectedPeriod synced with available periods
  useEffect(() => {
    if (availablePeriodsToday.length > 0) {
      const now = new Date();
      const curM = now.getHours() * 60 + now.getMinutes();
      const active = availablePeriodsToday.find(s => {
        const [sh, sm] = (s.startTime || '07:30').split(':').map(Number);
        const [eh, em] = (s.endTime || '09:00').split(':').map(Number);
        return curM >= Math.max(0, sh * 60 + sm - 30) && curM <= eh * 60 + em;
      });
      setSelectedPeriod(active || availablePeriodsToday[0]);
    }
  }, [availablePeriodsToday]);

  // Manual override to allow immediate checkout during duplicate detection
  const [forceCheckOutMode, setForceCheckOutMode] = useState<boolean>(false);

  // Duplicate Scan & Smart Check-Out detection
  const duplicateScanInfo = useMemo(() => {
    if (!selectedTeacher || !decodedData) return null;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const activeTarget = selectedPeriod || decodedData.subjectSchedule;
    const targetPeriodId = activeTarget?.id;

    const allAttendance = StorageService.getAttendance();

    // Look for attendance record today for this teacher matching this session
    const existing = allAttendance.find(r => {
      if (r.personId !== selectedTeacher.id || r.date !== todayStr) return false;
      if (targetPeriodId) {
        return r.subjectScheduleId === targetPeriodId || r.scheduleId === targetPeriodId;
      }
      return r.scheduleId === decodedData.scheduleId;
    });

    if (!existing) return null;

    // 1. Both Check-In and Check-Out completed!
    if (existing.checkInTime && existing.checkOutTime) {
      return {
        type: 'ALREADY_COMPLETED' as const,
        record: existing,
        title: isKhmer ? 'វត្តមានបានកត់ត្រាពេញលេញរួចរាល់' : 'Attendance Already Completed',
        message: isKhmer
          ? `វត្តមានសម្រាប់ម៉ោងបង្រៀននេះត្រូវបានកត់ត្រារួចរាល់ហើយ (ចូល: ${existing.checkInTime} • ចេញ: ${existing.checkOutTime})។ ការស្កេនត្រួតគ្នាត្រូវបានទប់ស្កាត់។`
          : `Attendance for this class period has already been marked and completed today (In: ${existing.checkInTime} • Out: ${existing.checkOutTime}). Duplicate scans are prevented.`
      };
    }

    // 2. Already checked in, no check-out yet
    if (existing.checkInTime && !existing.checkOutTime) {
      const [inH, inM] = existing.checkInTime.split(':').map(Number);
      const inMinutes = (isNaN(inH) ? 0 : inH) * 60 + (isNaN(inM) ? 0 : inM);
      const diffMinutes = Math.max(0, curMinutes - inMinutes);

      const sysSettings = StorageService.getSystemSettings();
      const duplicateCooldown = sysSettings.preventDuplicateScanMinutes ?? 10;

      // Accidental duplicate scan within cooldown window
      if (diffMinutes < duplicateCooldown && !forceCheckOutMode) {
        return {
          type: 'RECENT_DUPLICATE' as const,
          record: existing,
          diffMinutes,
          cooldown: duplicateCooldown,
          title: isKhmer ? 'បានស្កេនចូលរួចរាល់ហើយ' : 'Already Checked In Recently',
          message: isKhmer
            ? `លោកគ្រូ/អ្នកគ្រូបានស្កេនចូលរួចហើយនៅម៉ោង ${existing.checkInTime} (${diffMinutes} នាទីមុន)។ ប្រព័ន្ធទប់ស្កាត់ការស្កេនត្រួតគ្នា។`
            : `You have already checked in at ${existing.checkInTime} (${diffMinutes}m ago). Duplicate scan is blocked.`
        };
      }

      // Ready for Check-Out!
      return {
        type: 'READY_TO_CHECKOUT' as const,
        record: existing,
        title: isKhmer ? 'កត់ត្រាម៉ោងចេញ (Class Check-Out)' : 'Class Session Check-Out',
        message: isKhmer
          ? `លោកគ្រូ/អ្នកគ្រូបានចុះវត្តមានចូលនៅម៉ោង ${existing.checkInTime}។ សូមវាយលេខកូដ PIN ៤ ខ្ទង់ដើម្បីកត់ត្រាម៉ោងចេញពីថ្នាក់ (Check-Out)។`
          : `You checked in at ${existing.checkInTime}. Enter your 4-digit PIN to Check-Out now.`
      };
    }

    return null;
  }, [selectedTeacher, selectedPeriod, decodedData, isKhmer, forceCheckOutMode]);

  // PIN verification state
  const [pinDigits, setPinDigits] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Completed record
  const [completedRecord, setCompletedRecord] = useState<AttendanceRecord | null>(null);
  const [countdown, setCountdown] = useState<number>(6);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setScanMode('camera');
      setDecodedData(null);
      setSelectedTeacher(null);
      setSelectedPeriod(null);
      setForceCheckOutMode(false);
      setPinDigits('');
      setPinError(null);
      setCompletedRecord(null);
      setCountdown(6);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Start/Stop Camera when in scan step and camera mode
  useEffect(() => {
    if (isOpen && step === 'scan' && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, step, scanMode, facingMode]);

  // Success auto-dismiss countdown
  useEffect(() => {
    if (step === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 'success' && countdown === 0) {
      handleModalClose();
    }
  }, [step, countdown]);

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          isKhmer
            ? 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រការប្រើកាមេរ៉ាទេ។ សូមប្រើជម្រើស Upload រូបភាព ឬបញ្ចូលកូដ។'
            : 'Camera API is not supported in this browser. Please use image upload or enter code.'
        );
        setScanMode('upload');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setIsScanning(true);
        startScanLoop();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(
        isKhmer
          ? 'មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាត Camera Permission)។'
          : 'Could not access camera. Please allow camera permissions or upload an image.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
  };

  const flipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous frame scanning loop
  const startScanLoop = () => {
    const checkFrame = () => {
      if (!videoRef.current || !canvasRef.current) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const rawCode = ScheduleQrService.scanCanvasImageData(imageData);

          if (rawCode) {
            handleCodeScanned(rawCode);
            return; // Stop scan loop
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(checkFrame);
    };

    scanLoopRef.current = requestAnimationFrame(checkFrame);
  };

  // Process a scanned QR code text
  const handleCodeScanned = (rawText: string) => {
    stopCamera();

    const decoded = ScheduleQrService.decodeQRCode(rawText);
    if (!decoded.isValid) {
      showToast(
        decoded.error ||
          (isKhmer
            ? 'កូដ QR នេះមិនត្រឹមត្រូវសម្រាប់កាលវិភាគ EduTrack ទេ។'
            : 'QR code is not a valid EduTrack schedule.'),
        'error'
      );
      // Restart camera after short pause
      setTimeout(() => {
        if (step === 'scan' && scanMode === 'camera') {
          startCamera();
        }
      }, 1500);
      return;
    }

    setDecodedData(decoded);

    // Resolve teacher
    const allTeachers = StorageService.getTeachers();
    let assignedTeacher: Teacher | null = null;

    if (decoded.teacher) {
      assignedTeacher = decoded.teacher;
    } else if (decoded.targetTeacherId) {
      assignedTeacher =
        allTeachers.find(
          t =>
            t.id === decoded.targetTeacherId ||
            t.teacherId?.toLowerCase() === decoded.targetTeacherId?.toLowerCase() ||
            t.fullName.toLowerCase() === decoded.targetTeacherName?.toLowerCase()
        ) || null;
    }

    setSelectedTeacher(assignedTeacher);
    const initialPeriod =
      decoded.activePeriod ||
      decoded.nextPeriod ||
      decoded.todayPeriods?.[0] ||
      decoded.subjectSchedule ||
      null;
    setSelectedPeriod(initialPeriod);
    setPinDigits('');
    setPinError(null);
    setStep('pin');
  };

  // Handle Image File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = ScheduleQrService.scanCanvasImageData(imageData);
        if (code) {
          handleCodeScanned(code);
        } else {
          showToast(
            isKhmer
              ? 'មិនអាចស្វែងរក QR code ក្នុងរូបភាពនេះបានទេ។ សូមព្យាយាមម្តងទៀត។'
              : 'No QR code found in this image. Please upload a clear photo.',
            'error'
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Manual Code Submit
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim());
  };

  // Keypad click for PIN
  const handleKeypadPress = (val: string) => {
    setPinError(null);
    if (val === 'back') {
      setPinDigits(p => p.slice(0, -1));
    } else if (val === 'clear') {
      setPinDigits('');
    } else {
      if (pinDigits.length < 6) {
        const next = pinDigits + val;
        setPinDigits(next);
        if (next.length === 4 && selectedTeacher) {
          // Auto submit on 4th digit
          triggerPinVerification(next, selectedTeacher);
        }
      }
    }
  };

  // PIN Verification and Attendance Marking
  const triggerPinVerification = (pinToVerify: string, teacher: Teacher) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setPinError(null);

    try {
      const result = ScheduleQrService.verifyTeacherPin(teacher.id, pinToVerify);

      if (!result.isValid) {
        setPinError(
          result.message ||
            (isKhmer
              ? `កូដ PIN មិនត្រឹមត្រូវសម្រាប់ ${teacher.fullName} ទេ។ (សាកល្បង 1234)`
              : `Incorrect PIN for ${teacher.fullName}. (Default PIN is 1234)`)
        );
        setIsVerifying(false);
        setPinDigits('');
        return;
      }

      // PIN is valid! Mark Attendance
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const sysSettings = StorageService.getSystemSettings();
      const activeTarget = selectedPeriod || decodedData?.subjectSchedule;
      const scheduledStart = activeTarget?.startTime || decodedData?.startTime || '07:30';
      const scheduledEnd = activeTarget?.endTime || decodedData?.endTime || '09:00';

      // Lateness calculation
      const [schedH, schedM] = scheduledStart.split(':').map(Number);
      const [nowH, nowM] = timeStr.split(':').map(Number);
      const schedMinutes = schedH * 60 + schedM;
      const nowMinutes = nowH * 60 + nowM;

      const graceMinutes =
        activeTarget?.gracePeriodMinutes ??
        decodedData?.subjectSchedule?.gracePeriodMinutes ??
        sysSettings.defaultGracePeriodMinutes ??
        15;
      const lateDiff = nowMinutes - schedMinutes;
      const isLate = lateDiff > graceMinutes;
      const lateMinutes = isLate ? Math.max(0, lateDiff) : 0;

      // 1. Check if this is a Check-Out action for an already checked-in session
      if (
        duplicateScanInfo?.type === 'READY_TO_CHECKOUT' ||
        (duplicateScanInfo?.type === 'RECENT_DUPLICATE' && forceCheckOutMode)
      ) {
        const existingRecord = duplicateScanInfo.record;

        const [schedEndH, schedEndM] = (existingRecord.scheduledEnd || '09:00').split(':').map(Number);
        const schedEndMinutes = (isNaN(schedEndH) ? 9 : schedEndH) * 60 + (isNaN(schedEndM) ? 0 : schedEndM);
        const [outH, outM] = timeStr.split(':').map(Number);
        const outMinutes = (isNaN(outH) ? 0 : outH) * 60 + (isNaN(outM) ? 0 : outM);

        const earlyLeaveDiff = schedEndMinutes - outMinutes;
        const earlyLeaveMinutes = earlyLeaveDiff > 10 ? earlyLeaveDiff : 0;
        const overtimeDiff = outMinutes - schedEndMinutes;
        const overtimeMinutes = overtimeDiff > 15 ? overtimeDiff : 0;

        const updatedRecord: AttendanceRecord = {
          ...existingRecord,
          checkOutTime: timeStr,
          checkOutMethod: 'QR_SCAN',
          earlyLeaveMinutes,
          overtimeMinutes,
          updatedAt: new Date().toISOString()
        };

        StorageService.updateAttendanceRecord(existingRecord.id, updatedRecord);

        // Audit Log
        StorageService.addAuditLog({
          userId: result.user?.id || teacher.id,
          userName: teacher.fullName,
          userRole: 'teacher',
          action: 'ATTENDANCE_CHECKOUT_QR',
          target: existingRecord.id,
          details: `Faculty checked out via Schedule QR (${existingRecord.subject || 'Class'}, PIN verified)`,
          ipAddress: '127.0.0.1'
        });

        // Telegram notification
        TelegramService.sendCheckOutAlert({
          name: teacher.fullName,
          khmerName: teacher.khmerName,
          personType: 'teacher',
          department: teacher.department || 'Academic',
          checkOutTime: timeStr,
          workingTime: `${existingRecord.checkInTime} — ${timeStr}`,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          subjectInfo: `${existingRecord.subject || 'Class'}`
        });

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}

        setCompletedRecord(updatedRecord);
        setStep('success');
        showToast(
          isKhmer
            ? `បានកត់ត្រាម៉ោងចេញដោយជោគជ័យសម្រាប់ ${teacher.fullName} (${timeStr})`
            : `Check-out recorded successfully for ${teacher.fullName} (${timeStr})`,
          'success'
        );
        onSuccess?.(updatedRecord);
        return;
      }

      // 2. Prevent duplicate scan if already completed today
      if (duplicateScanInfo?.type === 'ALREADY_COMPLETED') {
        showToast(duplicateScanInfo.message, 'warning');
        setPinError(duplicateScanInfo.message);
        setIsVerifying(false);
        setPinDigits('');
        return;
      }

      // 3. Prevent duplicate scan if scanned too recently
      if (duplicateScanInfo?.type === 'RECENT_DUPLICATE' && !forceCheckOutMode) {
        showToast(duplicateScanInfo.message, 'warning');
        setPinError(duplicateScanInfo.message);
        setIsVerifying(false);
        setPinDigits('');
        return;
      }

      // 4. Double check fresh records in storage to eliminate rapid double-tap race conditions
      const freshAttendance = StorageService.getAttendance();
      const duplicateFresh = freshAttendance.find(
        r =>
          r.personId === teacher.id &&
          r.date === todayStr &&
          Boolean(r.checkInTime && r.checkInTime.trim().length > 0) &&
          ((activeTarget?.id && r.subjectScheduleId === activeTarget.id) ||
            r.scheduleId === (activeTarget?.id || decodedData?.scheduleId))
      );
      if (duplicateFresh) {
        showToast(
          isKhmer
            ? `ការស្កេនត្រួតគ្នាត្រូវបានទប់ស្កាត់៖ វត្តមានត្រូវបានកត់ត្រារួចហើយនៅម៉ោង ${duplicateFresh.checkInTime}`
            : `Duplicate scan prevented: Attendance was already recorded at ${duplicateFresh.checkInTime}`,
          'warning'
        );
        setPinError(isKhmer ? 'ការស្កេនត្រួតគ្នាត្រូវបានទប់ស្កាត់' : 'Duplicate scan prevented');
        setIsVerifying(false);
        setPinDigits('');
        return;
      }

      // Check if there is an existing record without checkInTime (e.g. marked absent earlier) to update
      const existingUnattended = freshAttendance.find(
        r =>
          r.personId === teacher.id &&
          r.date === todayStr &&
          !r.checkInTime &&
          ((activeTarget?.id && r.subjectScheduleId === activeTarget.id) ||
            r.scheduleId === (activeTarget?.id || decodedData?.scheduleId))
      );

      const recordId = existingUnattended
        ? existingUnattended.id
        : `att-qr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newRecord: AttendanceRecord = {
        id: recordId,
        userId: result.user?.id,
        personId: teacher.id,
        personType: 'teacher',
        personName: teacher.fullName,
        khmerName: teacher.khmerName,
        department: teacher.department || 'Academic & Curriculum',
        date: todayStr,
        scheduleId: activeTarget?.id || decodedData?.scheduleId || 'sch-qr',
        scheduleName: activeTarget?.subject || decodedData?.subject || 'Class Schedule',
        subjectScheduleId: activeTarget?.id || decodedData?.subjectSchedule?.id,
        subject: activeTarget?.subject || decodedData?.subject || teacher.subject,
        khmerSubject: activeTarget?.khmerSubject || decodedData?.khmerSubject,
        gradeClass: activeTarget?.gradeClass || decodedData?.gradeClass || 'Standard Class',
        room: activeTarget?.room || decodedData?.room || 'Assigned Room',
        periodName: activeTarget?.periodName || decodedData?.periodName || 'Scheduled Period',
        session: nowH < 12 ? 'morning' : 'afternoon',
        scheduledStart,
        scheduledEnd,
        checkInTime: timeStr,
        status: isLate ? 'Late' : 'Present',
        lateMinutes,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        locationVerified: true,
        deviceInfo: 'QR_SCHEDULE_PIN',
        createdAt: existingUnattended?.createdAt || new Date().toISOString()
      };

      // Save attendance (update existing or add new)
      if (existingUnattended) {
        StorageService.updateAttendanceRecord(existingUnattended.id, newRecord);
      } else {
        StorageService.addAttendanceRecord(newRecord);
      }

      // Audit Log
      StorageService.addAuditLog({
        userId: result.user?.id || teacher.id,
        userName: teacher.fullName,
        userRole: 'teacher',
        action: 'ATTENDANCE_CHECKIN_QR',
        target: newRecord.id,
        details: `Faculty marked attendance via Schedule QR (${decodedData?.subject || 'Class'}, PIN verified)`,
        ipAddress: '127.0.0.1'
      });

      // Telegram notification
      TelegramService.sendCheckInAlert({
        name: teacher.fullName,
        khmerName: teacher.khmerName,
        personType: 'teacher',
        department: teacher.department || 'Academic',
        time: timeStr,
        scheduled: `${scheduledStart} - ${scheduledEnd}`,
        status: newRecord.status,
        lateMinutes,
        subjectInfo: `${decodedData?.subject || 'Class'} (${decodedData?.room || 'Room'})`
      });

      // Confetti celebratory burst
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}

      setCompletedRecord(newRecord);
      setStep('success');
      showToast(
        isKhmer
          ? `បានកត់ត្រាវត្តមានដោយជោគជ័យសម្រាប់ ${teacher.fullName}`
          : `Attendance marked successfully for ${teacher.fullName}`,
        'success'
      );
      onSuccess?.(newRecord);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {step === 'scan' && (isKhmer ? 'ស្កេន QR កាលវិភាគបង្រៀន' : 'Scan Schedule QR Code')}
                  {step === 'pin' && (isKhmer ? 'បញ្ជាក់លេខសម្ងាត់ PIN' : 'Confirm Faculty PIN')}
                  {step === 'success' && (isKhmer ? 'វត្តមានត្រូវបានកត់ត្រា!' : 'Attendance Verified!')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {isKhmer ? 'មិនបាច់ Login' : 'No Login Required'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-medium">
                {step === 'scan' &&
                  (isKhmer
                    ? 'ស្កេន QR នៅមុខបន្ទប់ ឬលើកាលវិភាគដើម្បីចុះវត្តមាន'
                    : 'Scan door or timetable QR to check into your scheduled class')}
                {step === 'pin' &&
                  (isKhmer
                    ? 'បញ្ចូលលេខ PIN ៤ ខ្ទង់ដើម្បីផ្ទៀងផ្ទាត់អត្តសញ្ញាណ'
                    : 'Enter your 4-digit PIN to authenticate this session')}
                {step === 'success' &&
                  (isKhmer
                    ? 'ទិន្នន័យត្រូវបានកត់ត្រាទុកក្នុងប្រព័ន្ធដោយសុវត្ថិភាព'
                    : 'Session recorded with institutional timestamp')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* STEP 1: SCAN QR (Camera, File Upload, or Code) */}
          {step === 'scan' && (
            <div className="space-y-4">
              
              {/* Scan Mode Switcher (Clean tabs: Camera, File, Code - No Test Mock) */}
              <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setScanMode('camera')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                    scanMode === 'camera'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isKhmer ? 'កាមេរ៉ា' : 'Live Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('upload')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                    scanMode === 'upload'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isKhmer ? 'រូបភាព QR' : 'Upload Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('code')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                    scanMode === 'code'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isKhmer ? 'បញ្ចូលកូដ' : 'Enter Code'}</span>
                </button>
              </div>

              {/* MODE 1: Camera Scanner */}
              {scanMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative aspect-square sm:aspect-4/3 w-full bg-slate-900 rounded-3xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
                    
                    {/* Hidden canvas for image data analysis */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera Video Stream */}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Scanning Target Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                      <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400/80 rounded-3xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                        {/* Animated Laser Bar */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
                      </div>
                    </div>

                    {/* Controls at bottom of video */}
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                      <div className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/10">
                        {isScanning
                          ? (isKhmer ? 'កំពុងស្វែងរក QR...' : 'Position QR inside target')
                          : (isKhmer ? 'កំពុងបើកកាមេរ៉ា...' : 'Starting camera...')}
                      </div>

                      <button
                        type="button"
                        onClick={flipCamera}
                        className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'ប្តូរកាមេរ៉ា' : 'Flip'}</span>
                      </button>
                    </div>

                    {/* Camera Error State */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                        <AlertCircle className="w-10 h-10 text-rose-400" />
                        <p className="text-xs max-w-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setScanMode('upload')}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                        >
                          {isKhmer ? 'ប្រើការ Upload រូបភាព' : 'Switch to Image Upload'}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs text-slate-500 font-medium">
                    {isKhmer
                      ? 'ដាក់ QR កាលវិភាគ ឬស្លាកទ្វារបន្ទប់ឱ្យចំប្រអប់ដើម្បីស្កេន'
                      : 'Hold camera steady over the classroom door sign or printed timetable QR'}
                  </p>
                </div>
              )}

              {/* MODE 2: File Upload Scanner */}
              {scanMode === 'upload' && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/70 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform mb-3 border border-indigo-100">
                      <Upload className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-black text-slate-800">
                      {isKhmer ? 'ជ្រើសរើសរូបថត QR Code' : 'Upload QR Code Image'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 max-w-xs">
                      {isKhmer
                        ? 'ចុចទីនេះដើម្បីជ្រើសរើសរូបភាពពីទូរស័ព្ទ ឬកុំព្យូទ័ររបស់អ្នក'
                        : 'Select screenshot or photo of door sign / timetable QR from your gallery'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* MODE 3: Manual Code / ID Input */}
              {scanMode === 'code' && (
                <form onSubmit={handleManualCodeSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      {isKhmer ? 'លេខកូដកាលវិភាគ ឬតំណភ្ជាប់ (Schedule ID / Link)' : 'Schedule ID or QR URL'}
                    </label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value)}
                      placeholder="e.g. sub-1741234567 or paste QR URL"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                  >
                    {isKhmer ? 'ផ្ទៀងផ្ទាត់កូដ' : 'Decode & Continue'}
                  </button>
                </form>
              )}

            </div>
          )}

          {/* STEP 2: CONFIRM TEACHER IDENTITY WITH 4-DIGIT PIN */}
          {step === 'pin' && decodedData && (
            <div className="space-y-4">
              
              {/* Teacher Identity - Strictly Locked to Scanned QR */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isKhmer ? 'គ្រូបង្រៀនដែលត្រូវបានកំណត់ (ចាក់សោ)' : 'Assigned Faculty Member (Locked)'}</span>
                  </label>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>{isKhmer ? 'មិនអនុញ្ញាតឱ្យប្តូរគ្រូទេ' : 'Cannot Switch Teacher'}</span>
                  </span>
                </div>
                
                {selectedTeacher ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                        {selectedTeacher.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate flex items-center gap-1.5">
                          <span>{selectedTeacher.fullName}</span>
                          {selectedTeacher.khmerName && (
                            <span className="text-slate-500 font-medium text-xs">({selectedTeacher.khmerName})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          ID: {selectedTeacher.teacherId || selectedTeacher.id} • {selectedTeacher.department}
                        </div>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>{isKhmer ? 'ចាក់សោតាម QR' : 'Locked to QR'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{isKhmer ? 'រកមិនឃើញគ្រូបង្រៀនដែលកំណត់ជាមួយកូដ QR នេះទេ' : 'No Faculty Member Bound to this QR Code'}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {isKhmer
                        ? 'ដើម្បីធានាសុវត្ថិភាពវត្តមាន ប្រព័ន្ធមិនអនុញ្ញាតឱ្យជ្រើសរើស ឬប្តូរគ្រូបង្រៀនដោយដៃឡើយ។ សូមស្កេនកូដ QR ផ្ទាល់ខ្លួនរបស់លោកគ្រូអ្នកគ្រូ។'
                        : 'To prevent attendance fraud, switching or selecting other teachers is strictly prohibited. Please scan your personal Teacher Smart QR.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('scan');
                        if (scanMode === 'camera') startCamera();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isKhmer ? 'ស្កេនកូដ QR ផ្សេង' : 'Scan Valid QR'}
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Period Selector for Teachers with Multiple Classes Today */}
              {availablePeriodsToday.length > 1 && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {isKhmer
                          ? `ម៉ោងបង្រៀនថ្ងៃនេះ (${availablePeriodsToday.length} ម៉ោង) – ចុចដើម្បីជ្រើសរើស ៖`
                          : `Teaching Periods Today (${availablePeriodsToday.length}) – Tap to Select:`}
                      </span>
                    </span>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100/70 px-2 py-0.5 rounded-full">
                      {isKhmer ? 'កូដ QR ឆ្លាតវៃ' : 'Smart Period'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availablePeriodsToday.map((period, idx) => {
                      const isSelected = (selectedPeriod?.id || '') === (period.id || '');
                      const now = new Date();
                      const curM = now.getHours() * 60 + now.getMinutes();
                      const [sh, sm] = (period.startTime || '07:30').split(':').map(Number);
                      const [eh, em] = (period.endTime || '09:00').split(':').map(Number);
                      const isNow = curM >= Math.max(0, sh * 60 + sm - 30) && curM <= eh * 60 + em;

                      return (
                        <button
                          key={period.id || idx}
                          type="button"
                          onClick={() => setSelectedPeriod(period)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                              : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full text-[10px]">
                            <span
                              className={`font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {period.startTime} - {period.endTime}
                            </span>
                            {isNow && (
                              <span
                                className={`px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                                  isSelected
                                    ? 'bg-emerald-400 text-slate-950 font-black'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                ⚡ {isKhmer ? 'កំពុងបង្រៀន' : 'Active'}
                              </span>
                            )}
                          </div>

                          <div>
                            <div className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {period.khmerSubject || period.subject}
                            </div>
                            <div
                              className={`text-[10px] truncate flex items-center gap-1.5 ${
                                isSelected ? 'text-indigo-100' : 'text-slate-500'
                              }`}
                            >
                              <span>{period.gradeClass}</span>
                              <span>•</span>
                              <span>{period.room}</span>
                              {period.periodName && (
                                <>
                                  <span>•</span>
                                  <span>{period.periodName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Decoded Schedule Class Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold text-[11px]">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
                    <span>
                      {selectedPeriod?.gradeClass || decodedData.gradeClass || 'Faculty Class'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-indigo-950 text-xs">
                    {selectedPeriod?.startTime || decodedData.startTime} -{' '}
                    {selectedPeriod?.endTime || decodedData.endTime}
                  </span>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    {selectedPeriod?.khmerSubject ||
                      selectedPeriod?.subject ||
                      decodedData.khmerSubject ||
                      decodedData.subject ||
                      'Class Subject'}
                  </h4>
                  {(selectedPeriod?.subject || decodedData.subject) &&
                    (selectedPeriod?.subject || decodedData.subject) !==
                      (selectedPeriod?.khmerSubject || decodedData.khmerSubject) && (
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedPeriod?.subject || decodedData.subject}
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      {selectedPeriod?.room || decodedData.room || 'Assigned Room'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      {selectedPeriod?.periodName || decodedData.periodName || 'Class Period'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate Scan Prevention & Smart Check-Out Status Banner */}
              {duplicateScanInfo && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                    duplicateScanInfo.type === 'ALREADY_COMPLETED'
                      ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                      : duplicateScanInfo.type === 'RECENT_DUPLICATE'
                      ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-1.5">
                      {duplicateScanInfo.type === 'ALREADY_COMPLETED' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : duplicateScanInfo.type === 'RECENT_DUPLICATE' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span className="text-sm font-black">{duplicateScanInfo.title}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        duplicateScanInfo.type === 'ALREADY_COMPLETED'
                          ? 'bg-rose-200/80 text-rose-900'
                          : duplicateScanInfo.type === 'RECENT_DUPLICATE'
                          ? 'bg-amber-200/80 text-amber-900'
                          : 'bg-emerald-200/80 text-emerald-900'
                      }`}
                    >
                      {duplicateScanInfo.type === 'ALREADY_COMPLETED'
                        ? (isKhmer ? 'ទប់ស្កាត់ការស្កេនជាន់' : 'Duplicate Blocked')
                        : duplicateScanInfo.type === 'RECENT_DUPLICATE'
                        ? (isKhmer ? 'កំពុងស្ថិតក្នុង Cooldown' : 'Cooldown Active')
                        : (isKhmer ? 'ត្រៀមស្កេនចេញ' : 'Check-Out Ready')}
                    </span>
                  </div>

                  <p className="text-[11.5px] leading-relaxed text-slate-700">
                    {duplicateScanInfo.message}
                  </p>

                  {/* If recent duplicate, allow intentional check-out override */}
                  {duplicateScanInfo.type === 'RECENT_DUPLICATE' && !forceCheckOutMode && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10.5px] text-amber-800">
                        {isKhmer ? 'ចង់កត់ត្រាម៉ោងចេញមុនម៉ោង?' : 'Want to record Check-Out instead?'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setForceCheckOutMode(true);
                          setPinError(null);
                        }}
                        className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {isKhmer ? 'ប្តូរទៅស្កេនចេញ (Check-Out)' : 'Switch to Check-Out'}
                      </button>
                    </div>
                  )}

                  {/* If already completed, show option to scan another class or close */}
                  {duplicateScanInfo.type === 'ALREADY_COMPLETED' && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('scan');
                          if (scanMode === 'camera') startCamera();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {isKhmer ? 'ស្កេនម៉ោងបង្រៀនផ្សេងទៀត' : 'Scan Different Class Period'}
                      </button>
                      <button
                        type="button"
                        onClick={handleModalClose}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
                      >
                        {isKhmer ? 'បិទផ្ទាំងនេះ' : 'Close Modal'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4-Digit Security PIN Section - Only available when assigned teacher is locked and not blocked by completed duplicate */}
              {selectedTeacher && duplicateScanInfo?.type !== 'ALREADY_COMPLETED' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{isKhmer ? 'បញ្ចូលលេខកូដ PIN ៤ ខ្ទង់' : 'Enter 4-Digit Security PIN'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* PIN Display Indicators */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[0, 1, 2, 3].map(idx => {
                      const digit = pinDigits[idx];
                      const isFilled = digit !== undefined;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-mono font-black border-2 transition-all ${
                            isFilled
                              ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-inner scale-105'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                        >
                          {isFilled ? (showPin ? digit : '•') : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Error Banner */}
                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  {/* Keypad Grid (0-9, Backspace, Clear) */}
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleKeypadPress(val)}
                        className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg font-mono transition-all active:scale-95 shadow-xs cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('clear')}
                      className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg font-mono transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('back')}
                      className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      ⌫ Back
                    </button>
                  </div>

                  {/* Confirm Action Button */}
                  <button
                    type="button"
                    disabled={!selectedTeacher || pinDigits.length < 4 || isVerifying}
                    onClick={() => selectedTeacher && triggerPinVerification(pinDigits, selectedTeacher)}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-sm tracking-tight shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>{isKhmer ? 'បញ្ជាក់វត្តមានបង្រៀន' : 'Confirm Attendance'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Back to Rescan Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {isKhmer ? '← ស្កេន QR ផ្សេងទៀត' : '← Scan Different QR Code'}
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && completedRecord && (
            <div className="text-center space-y-4 py-2">
              
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20 animate-in zoom-in-75 duration-300">
                <Check className="w-8 h-8 stroke-3" />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {completedRecord.status === 'Present'
                      ? (isKhmer ? 'មកទាន់ពេល (On Time)' : 'Status: On Time')
                      : (isKhmer ? `យឺត ${completedRecord.lateMinutes} នាទី` : `Late: ${completedRecord.lateMinutes} mins`)}
                  </span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {completedRecord.personName}
                </h3>
                {completedRecord.khmerName && (
                  <p className="text-xs font-semibold text-slate-500">({completedRecord.khmerName})</p>
                )}
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold">{isKhmer ? 'មុខវិជ្ជា' : 'Subject'}:</span>
                  <span className="font-bold text-slate-800">{completedRecord.subject}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold">{isKhmer ? 'ថ្នាក់ / បន្ទប់' : 'Class / Room'}:</span>
                  <span className="font-bold text-slate-800">
                    {completedRecord.gradeClass} • {completedRecord.room}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold">{isKhmer ? 'ម៉ោងកត់ត្រា' : 'Timestamp'}:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {completedRecord.checkInTime} ({completedRecord.date})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">{isKhmer ? 'វិធីសាស្ត្រ' : 'Method'}:</span>
                  <span className="font-bold text-indigo-700">QR Code + PIN Verified</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  {isKhmer
                    ? `រួចរាល់ (បិទស្វ័យប្រវត្តិក្នុង ${countdown}វ)`
                    : `Done (Auto-closing in ${countdown}s)`}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
