import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { ScheduleAlertService } from '../../services/scheduleAlertService.ts';
import { SystemSettings } from '../../types/index.ts';
import {
  Settings,
  Building,
  Calendar,
  CalendarDays,
  MapPin,
  Clock,
  Shield,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  Database,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  X,
  Bell,
  Send,
  Radio,
  ExternalLink,
  HelpCircle,
  Zap,
  Check,
  RotateCw,
  ShieldCheck
} from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();

  // Guard: teacher and employee cannot access system settings
  if (currentUser.role === 'teacher' || currentUser.role === 'employee' || !hasPermission('settings.manage')) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Faculty instructors and support employees are not authorized to view or configure organization profile and system governance settings.
        </p>
      </div>
    );
  }

  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSystemSettings());

  // Listen to live Firestore updates
  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (settings.academicStartDate && settings.academicEndDate && settings.academicStartDate >= settings.academicEndDate) {
      showToast('Academic Start Date must be before Academic End Date!', 'error');
      return;
    }

    const updated: SystemSettings = {
      ...settings,
      organizationName: settings.organizationName || settings.schoolName || 'EduTrack Academy',
      schoolName: settings.organizationName || settings.schoolName || 'EduTrack Academy',
      khmerOrgName: settings.khmerOrgName || settings.khmerSchoolName || 'សាលាអន្តរជាតិ',
      khmerSchoolName: settings.khmerOrgName || settings.khmerSchoolName || 'សាលាអន្តរជាតិ',
      academicYear: settings.academicYear || '2026-2027',
      academicStartDate: settings.academicStartDate || '2026-09-01',
      academicEndDate: settings.academicEndDate || '2027-06-30',
      enableAutoCheckOut: settings.enableAutoCheckOut !== false,
      autoCheckOutPolicy: settings.autoCheckOutPolicy || 'scheduled_end',
      autoCheckOutBufferMinutes: Number(settings.autoCheckOutBufferMinutes ?? 15),
      autoCheckOutDailyTime: settings.autoCheckOutDailyTime || '17:30',
      preventDuplicateScanMinutes: Number(settings.preventDuplicateScanMinutes ?? 10),
      teachingWageDurationMode: settings.teachingWageDurationMode || 'full_schedule'
    };
    StorageService.saveSystemSettings(updated);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Updated System Settings',
      target: `Academic Year: ${updated.academicYear} (AutoCheckOut: ${updated.enableAutoCheckOut ? 'Enabled' : 'Disabled'}, Policy: ${updated.autoCheckOutPolicy}, WageBasis: ${updated.teachingWageDurationMode})`,
      ipAddress: '127.0.0.1'
    });
    showToast('System configuration & attendance policies saved successfully', 'success');
  };

  const handleExportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      settings: StorageService.getSystemSettings(),
      teachers: StorageService.getTeachers(),
      employees: StorageService.getEmployees(),
      schedules: StorageService.getSchedules(),
      attendance: StorageService.getAttendance(),
      leaveRequests: StorageService.getLeaveRequests(),
      corrections: StorageService.getCorrections(),
      holidays: StorageService.getHolidays()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `EduTrack_Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded full system backup JSON', 'info');
  };

  const [isClearAttendanceModalOpen, setIsClearAttendanceModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [attendanceCount, setAttendanceCount] = useState(() => StorageService.getAttendance().length);

  // Web Push & Device Notification Diagnostics State
  const [notificationStatus, setNotificationStatus] = useState(() => ScheduleAlertService.getNotificationSupportStatus());
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);

  const [missingCheckoutsCount, setMissingCheckoutsCount] = useState(() => {
    return StorageService.getAttendance().filter(r => Boolean(r.checkInTime) && !r.checkOutTime).length;
  });
  const [isProcessingAutoCheckOut, setIsProcessingAutoCheckOut] = useState(false);
  const [autoCheckOutMessage, setAutoCheckOutMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setAttendanceCount(StorageService.getAttendance().length);
      setMissingCheckoutsCount(
        StorageService.getAttendance().filter(r => Boolean(r.checkInTime) && !r.checkOutTime).length
      );
    });
    return unsub;
  }, []);

  const handleRunAutoCheckOut = () => {
    setIsProcessingAutoCheckOut(true);
    setAutoCheckOutMessage(null);
    try {
      const res = StorageService.processAutoCheckOut();
      const updatedMissing = StorageService.getAttendance().filter(r => Boolean(r.checkInTime) && !r.checkOutTime).length;
      setMissingCheckoutsCount(updatedMissing);
      if (res.processedCount > 0) {
        const msg = `Auto Check-Out Engine resolved ${res.processedCount} missing check-out schedule(s) successfully!`;
        showToast(msg, 'success');
        setAutoCheckOutMessage(msg);
      } else {
        const msg = 'No overdue missing check-outs detected on system at this time.';
        showToast(msg, 'info');
        setAutoCheckOutMessage(msg);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to process auto check-out engine', 'error');
    } finally {
      setIsProcessingAutoCheckOut(false);
    }
  };

  const handleRequestPushPermission = async () => {
    const res = await ScheduleAlertService.requestNotificationPermission();
    setNotificationStatus(ScheduleAlertService.getNotificationSupportStatus());
    if (res.granted) {
      showToast('Notification permission granted!', 'success');
      await ScheduleAlertService.sendBrowserNotification(
        '🔔 Web Push Enabled',
        'System notifications are now active on this browser.'
      );
    } else {
      showToast(res.error || 'Permission was not granted', 'warning');
    }
  };

  const handleTestSystemPush = async () => {
    setIsTestingPush(true);
    setPushTestResult(null);
    try {
      const res = await ScheduleAlertService.testWebPushNotification();
      setNotificationStatus(ScheduleAlertService.getNotificationSupportStatus());
      setPushTestResult(res.message);
      if (res.success) {
        showToast('🔔 Test push notification delivered successfully!', 'success');
      } else {
        showToast(res.message, 'warning');
      }
    } catch (e: any) {
      setPushTestResult(e?.message || 'Error triggering push');
      showToast('Test push failed', 'error');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleClearAttendance = async () => {
    try {
      setIsClearing(true);
      const deletedCount = await StorageService.clearAllAttendance();
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Cleared All Attendance Records',
        target: `Database Maintenance (${deletedCount} records deleted)`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Successfully cleared all ${deletedCount} attendance records from database!`, 'success');
      setIsClearAttendanceModalOpen(false);
      setClearConfirmText('');
    } catch (err) {
      showToast('Failed to clear attendance: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefreshFromCloud = () => {
    StorageService.refreshFromCloud();
    setSettings(StorageService.getSystemSettings());
    showToast('Cache cleared and re-synced with Cloud Firestore', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-800" />
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System & Organization Settings
          </h2>
        </div>
        <p className="text-xs text-slate-500 font-khmer mt-0.5">
          ការកំណត់ទូទៅរបស់សាលា ទីតាំងភូមិសាស្ត្រ GPS ម៉ោងអនុគ្រោះ និងការគ្រប់គ្រងទិន្នន័យ
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Organization Info */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            School Identity & Contact
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Organization Name (English) *
              </label>
              <input
                type="text"
                required
                value={settings.organizationName || settings.schoolName || ''}
                onChange={e => setSettings({
                  ...settings,
                  organizationName: e.target.value,
                  schoolName: e.target.value
                })}
                placeholder="e.g. Phnom Penh Academy"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 font-khmer">
                ឈ្មោះសាលា / ស្ថាប័ន (ភាសាខ្មែរ)
              </label>
              <input
                type="text"
                value={settings.khmerOrgName || settings.khmerSchoolName || ''}
                onChange={e => setSettings({
                  ...settings,
                  khmerOrgName: e.target.value,
                  khmerSchoolName: e.target.value
                })}
                placeholder="ឧ. សាលាអន្តរជាតិភ្នំពេញ"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-khmer font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={e => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Academic Year & Session Dates */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Academic Year & Session Calendar (កាលបរិច្ឆេទឆ្នាំសិក្សា)
              </h3>
              <p className="text-[11px] text-slate-500 font-khmer mt-0.5">
                កំណត់កាលបរិច្ឆេទចាប់ផ្តើម-បញ្ចប់ឆ្នាំសិក្សា ឆមាសផ្លូវការ និងការរាប់ចំនួនថ្ងៃសិក្សា
              </p>
            </div>
            
            {/* Quick presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  academicYear: '2026-2027',
                  academicStartDate: '2026-09-01',
                  academicEndDate: '2027-06-30',
                  currentSemester: 'Semester 1',
                  semesterStartDate: '2026-09-01',
                  semesterEndDate: '2027-01-31'
                })}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
              >
                2026-2027 (01 Sep – 30 Jun)
              </button>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  academicYear: '2026-2027',
                  academicStartDate: '2026-11-01',
                  academicEndDate: '2027-08-31',
                  currentSemester: 'Semester 1',
                  semesterStartDate: '2026-11-01',
                  semesterEndDate: '2027-03-31'
                })}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cambodia (01 Nov – 31 Aug)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Academic Year Title (ឆ្នាំសិក្សា) *
              </label>
              <input
                type="text"
                value={settings.academicYear || '2026-2027'}
                onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
                placeholder="e.g. 2026-2027"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Active Semester / Term (ឆមាសបច្ចុប្បន្ន)
              </label>
              <select
                value={settings.currentSemester || 'Semester 1'}
                onChange={e => setSettings({ ...settings, currentSemester: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
              >
                <option value="Semester 1">Semester 1 (ឆមាសទី ១)</option>
                <option value="Semester 2">Semester 2 (ឆមាសទី ២)</option>
                <option value="Full Year">Full Academic Year (ពេញមួយឆ្នាំ)</option>
                <option value="Summer Term">Summer / Vacation Term (វគ្គវិស្សមកាល)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
              <label className="block font-extrabold text-indigo-950 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Academic Start Date (កាលបរិច្ឆេទចាប់ផ្តើម) *</span>
              </label>
              <input
                type="date"
                required
                value={settings.academicStartDate || '2026-09-01'}
                onChange={e => setSettings({ ...settings, academicStartDate: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                The official opening date of the school year.
              </span>
            </div>

            <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
              <label className="block font-extrabold text-indigo-950 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Academic End Date (កាលបរិច្ឆេទបញ្ចប់) *</span>
              </label>
              <input
                type="date"
                required
                value={settings.academicEndDate || '2027-06-30'}
                onChange={e => setSettings({ ...settings, academicEndDate: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                The official closing date / commencement of the school year.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Semester Start Date (ថ្ងៃចាប់ផ្តើមឆមាស)
              </label>
              <input
                type="date"
                value={settings.semesterStartDate || '2026-09-01'}
                onChange={e => setSettings({ ...settings, semesterStartDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 cursor-pointer"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Semester End Date (ថ្ងៃបញ្ចប់ឆមាស)
              </label>
              <input
                type="date"
                value={settings.semesterEndDate || '2027-01-31'}
                onChange={e => setSettings({ ...settings, semesterEndDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Attendance Policy & Geolocation Rules */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Attendance Rules & GPS Geofencing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block font-bold text-slate-900 mb-1">
                Default Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.defaultGracePeriodMinutes}
                onChange={e => setSettings({ ...settings, defaultGracePeriodMinutes: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Permits arrival within X minutes after shift start without marking Late.
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block font-bold text-slate-900 mb-1">
                Absence Scanner Threshold (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={settings.absenceDetectionMinutes}
                onChange={e => setSettings({ ...settings, absenceDetectionMinutes: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Triggers absent flag & alert if no clock-in within X minutes past start.
              </span>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Enforce Campus GPS Geofence</span>
                <span className="text-[11px] text-slate-500">
                  Restricts mobile check-ins to within authorized physical campus radius
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enforceGeofence}
                onChange={e => setSettings({ ...settings, enforceGeofence: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.defaultLocationLatitude}
                  onChange={e => setSettings({ ...settings, defaultLocationLatitude: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.defaultLocationLongitude}
                  onChange={e => setSettings({ ...settings, defaultLocationLongitude: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  value={settings.geofenceRadiusMeters}
                  onChange={e => setSettings({ ...settings, geofenceRadiusMeters: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Terminal Anti-Proxy & Security Controls */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-amber-950 block">
                  Strict Owned Attendance & Fraud Prevention (គោលការណ៍វត្តមានផ្ទាល់ខ្លួន)
                </span>
                <span className="text-[11px] text-amber-800">
                  Switching staff on attendance terminals is permanently prohibited. Teachers must sign in to record owned attendance.
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200/80">
                <div>
                  <span className="font-bold text-slate-900 block">Require Personal Security PIN</span>
                  <span className="text-[11px] text-slate-500">
                    Teachers must enter their confidential 4-digit PIN before check-in/out is recorded
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requirePinForKiosk !== false}
                  onChange={e => setSettings({ ...settings, requirePinForKiosk: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/70 rounded-xl border border-indigo-200">
                <div>
                  <span className="font-bold text-indigo-950 block">Switching Staff on Kiosk Status</span>
                  <span className="text-[11px] text-indigo-700">
                    Permanently Disabled: Faculty must authenticate to their owned account
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                  Enforced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Automated Attendance Governance: Duplicate Scan Prevention & Missing Check-Out Automation */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Attendance Governance: Duplicate Scan Prevention & Auto Check-Out</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ការគ្រប់គ្រងស្វ័យប្រវត្ត៖ ទប់ស្កាត់ការស្កេនជាន់គ្នា និងជម្រើសកត់ត្រាម៉ោងចេញស្វ័យប្រវត្តិពេលខកខាន
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                settings.enableAutoCheckOut !== false
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${settings.enableAutoCheckOut !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>Auto Check-Out: {settings.enableAutoCheckOut !== false ? 'Active' : 'Disabled'}</span>
              </span>
            </div>
          </div>

          {/* 1. Prevent Duplicate Scan Configuration */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
                    Prevent Duplicate Scan (ទប់ស្កាត់ការស្កេនត្រួតគ្នា)
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Blocks accidental multiple scans or rapid re-scans for the same schedule period. If a teacher attempts to scan again within the cooldown window, the system warns them that attendance was already captured, preventing inflated records.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-amber-200/70 text-amber-950 font-black text-[10px] shrink-0 uppercase tracking-wide">
                Security Enforced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <label className="block font-bold text-slate-900 mb-1">
                  Duplicate Scan Cooldown Window (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.preventDuplicateScanMinutes ?? 10}
                    onChange={e => setSettings({ ...settings, preventDuplicateScanMinutes: Math.max(1, Number(e.target.value)) })}
                    className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    minutes cooldown between scans
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Recommended: 10 minutes (prevents double-tap mistakes while allowing check-out later).
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Cooldown Presets
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 15, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSettings({ ...settings, preventDuplicateScanMinutes: mins })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.preventDuplicateScanMinutes ?? 10) === mins
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Automated Missing Check-Out Engine */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-700" />
                  <span className="font-extrabold text-indigo-950 text-xs sm:text-sm">
                    Option Auto Check-Out for Missing Check-Out Schedule (ជម្រើសកត់ត្រាម៉ោងចេញស្វ័យប្រវត្ត)
                  </span>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Automatically resolves missing check-outs when teachers checked in to teach their class but forgot or missed scanning out at the end of their period.
                </p>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.enableAutoCheckOut !== false}
                  onChange={e => setSettings({ ...settings, enableAutoCheckOut: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {settings.enableAutoCheckOut !== false && (
              <div className="space-y-3 pt-1 text-xs">
                
                {/* Policy Selector */}
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                  <label className="block font-bold text-slate-900">
                    Auto Check-Out Time Policy (គោលការណ៍ម៉ោងចេញស្វ័យប្រវត្ត)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, autoCheckOutPolicy: 'scheduled_end' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        (settings.autoCheckOutPolicy || 'scheduled_end') === 'scheduled_end'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between text-xs">
                        <span>Scheduled Class End</span>
                        {(settings.autoCheckOutPolicy || 'scheduled_end') === 'scheduled_end' && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 ${
                        (settings.autoCheckOutPolicy || 'scheduled_end') === 'scheduled_end'
                          ? 'text-indigo-100'
                          : 'text-slate-500'
                      }`}>
                        Auto-sets to exact schedule period end (e.g. 09:00).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, autoCheckOutPolicy: 'scheduled_end_buffer' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        settings.autoCheckOutPolicy === 'scheduled_end_buffer'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between text-xs">
                        <span>End + Grace Buffer</span>
                        {settings.autoCheckOutPolicy === 'scheduled_end_buffer' && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 ${
                        settings.autoCheckOutPolicy === 'scheduled_end_buffer'
                          ? 'text-indigo-100'
                          : 'text-slate-500'
                      }`}>
                        Scheduled end + buffer window (e.g. 09:00 + 15m = 09:15).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, autoCheckOutPolicy: 'end_of_day' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        settings.autoCheckOutPolicy === 'end_of_day'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between text-xs">
                        <span>Fixed Daily Cutoff</span>
                        {settings.autoCheckOutPolicy === 'end_of_day' && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 ${
                        settings.autoCheckOutPolicy === 'end_of_day'
                          ? 'text-indigo-100'
                          : 'text-slate-500'
                      }`}>
                        Institutional daily closing cutoff (e.g. 17:30).
                      </span>
                    </button>
                  </div>
                </div>

                {/* Additional parameters for policy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settings.autoCheckOutPolicy === 'scheduled_end_buffer' && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200">
                      <label className="block font-bold text-slate-900 mb-1">
                        Grace Buffer After Class End (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={settings.autoCheckOutBufferMinutes ?? 15}
                        onChange={e => setSettings({ ...settings, autoCheckOutBufferMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Adds this buffer to the scheduled end time.
                      </span>
                    </div>
                  )}

                  {settings.autoCheckOutPolicy === 'end_of_day' && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200">
                      <label className="block font-bold text-slate-900 mb-1">
                        Daily Institutional Cutoff Time (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={settings.autoCheckOutDailyTime || '17:30'}
                        onChange={e => setSettings({ ...settings, autoCheckOutDailyTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Missing check-outs are set to this time when unresolved at end of day.
                      </span>
                    </div>
                  )}
                </div>

                {/* Manual Engine Trigger & Overdue Missing Counter */}
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Live Missing Check-Outs on System:
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        missingCheckoutsCount > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {missingCheckoutsCount} session(s) pending check-out
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      The engine runs automatically in the background on periodic data sync. You can also trigger it manually right now.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessingAutoCheckOut}
                    onClick={handleRunAutoCheckOut}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isProcessingAutoCheckOut ? 'animate-spin' : ''}`} />
                    <span>{isProcessingAutoCheckOut ? 'Processing...' : 'Run Auto Check-Out Now'}</span>
                  </button>
                </div>

                {autoCheckOutMessage && (
                  <div className="p-3 rounded-xl bg-indigo-100/70 border border-indigo-200 text-xs text-indigo-900 font-medium">
                    {autoCheckOutMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Teaching Payroll & Wage Charging Policy */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">$</span>
                <span>Teaching Payroll Wage Charging Basis (គោលការណ៍គិតប្រាក់កម្រៃបង្រៀនគ្រូ)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                កំណត់ជម្រើសគិតថ្លៃបង្រៀនពេញតាមកាលវិភាគ ឬគិតតាមម៉ោងស្កេនជាក់ស្តែងសម្រាប់របាយការណ៍ Payroll
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {settings.teachingWageDurationMode === 'actual_scan' ? 'Actual Scan Mode' : 'Full Schedule Mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, teachingWageDurationMode: 'full_schedule' })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                settings.teachingWageDurationMode !== 'actual_scan'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${settings.teachingWageDurationMode !== 'actual_scan' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      Full Schedule Duration Charge (គិតពេញតាមកាលវិភាគ)
                    </span>
                  </div>
                  {settings.teachingWageDurationMode !== 'actual_scan' && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Charges the full schedule duration for delivered classes regardless of punch timing.
                </p>
                <div className="mt-2.5 p-2.5 rounded-xl bg-white/90 border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Example:</span>
                    <span className="font-mono text-emerald-700">08:00 – 09:00 (1.0 hr), Rate $5.50/hr</span>
                  </div>
                  <p className="text-slate-600 text-[10px]">
                    If teacher scans late or overtime checkout, Gross Wage is charged for the exact full scheduled duration: <b>1.0 hr × $5.50 = $5.50</b>.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, teachingWageDurationMode: 'actual_scan' })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                settings.teachingWageDurationMode === 'actual_scan'
                  ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${settings.teachingWageDurationMode === 'actual_scan' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      Actual Scan Punch Duration (គិតតាមម៉ោងស្កេនជាក់ស្តែង)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Calculates wage strictly according to actual clock-in and clock-out timestamps recorded at the terminal.
                </p>
                <div className="mt-2.5 p-2.5 rounded-xl bg-white/90 border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div className="font-bold text-slate-800">
                    Exact Punch Duration:
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Prorates pay down to exact minutes between scan-in and scan-out (e.g. 50 mins = 0.83 hr × Rate).
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Save button */}
        {hasPermission('settings.manage') && (
          <div>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        )}

      </form>

      {/* Web Push & Device Notification Diagnostics */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Web Push Notifications & Service Worker Diagnostics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time browser notifications, PWA service worker status, and mobile device lock-screen push testing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                notificationStatus.permission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : notificationStatus.permission === 'denied'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${notificationStatus.permission === 'granted' ? 'bg-emerald-500 animate-pulse' : notificationStatus.permission === 'denied' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span>Permission: {notificationStatus.permission}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Browser Engine Support
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              {notificationStatus.supported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Notification API Supported</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Not Supported</span>
                </>
              )}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              PWA Service Worker
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              {notificationStatus.swSupported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>sw.js Ready (Background Push)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Service Worker Unavailable</span>
                </>
              )}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Window Context
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              {notificationStatus.isIframe ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Embedded Sub-Frame / Iframe</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Top-Level Window (Unrestricted)</span>
                </>
              )}
            </span>
          </div>
        </div>

        {notificationStatus.isIframe && (
          <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-start justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Notice: Running in Preview / Sub-Frame</span>
                <span className="text-[11px] text-indigo-800">
                  Chromium security policies restrict top-level Push Notification dialogs inside iframes. For native lock-screen mobile push, test via a direct top-level browser tab.
                </span>
              </div>
            </div>
            <a
              href={window.location.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 font-bold text-indigo-700 shadow-2xs"
            >
              <span>Open Direct Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          {notificationStatus.permission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPushPermission}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Bell className="w-4 h-4" />
              <span>Enable Web Push Permissions</span>
            </button>
          )}

          <button
            type="button"
            disabled={isTestingPush}
            onClick={handleTestSystemPush}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>{isTestingPush ? 'Sending Test Push...' : 'Send Test Web Push Notification'}</span>
          </button>
        </div>

        {pushTestResult && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
            <span className="font-bold text-slate-900 block mb-0.5 font-sans">Diagnostic Output:</span>
            {pushTestResult}
          </div>
        )}
      </div>

      {/* Data Backup & Factory Reset */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-700" />
          Data Backup & Database Maintenance
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshFromCloud}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sync & Refresh from Cloud Firestore</span>
          </button>
        </div>

        {/* Clear Attendance Database Card */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
          <div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="font-bold text-slate-900 text-xs">Clear All Attendance Records</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-200 text-rose-900 font-mono">
                {attendanceCount} records
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Permanently delete all check-in/out attendance logs from local storage and Cloud Firestore. Useful for term resets or testing cleanup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsClearAttendanceModalOpen(true)}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Attendance Data</span>
          </button>
        </div>
      </div>

      {/* Admin Clear Attendance Confirmation Modal */}
      {isClearAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">Clear All Attendance Records</h3>
                  <p className="text-[11px] text-rose-100">Permanent Database Deletion</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isClearing) {
                    setIsClearAttendanceModalOpen(false);
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
                  <span>Total Records: {attendanceCount}</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  This operation cannot be reversed. All faculty and employee attendance logs will be wiped from both your local browser storage and Cloud Firestore.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Type "CLEAR" to confirm deletion:
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
                    setIsClearAttendanceModalOpen(false);
                    setClearConfirmText('');
                  }}
                  disabled={isClearing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAttendance}
                  disabled={isClearing || clearConfirmText !== 'CLEAR'}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isClearing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Clearing Database...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Clear All Attendance</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
