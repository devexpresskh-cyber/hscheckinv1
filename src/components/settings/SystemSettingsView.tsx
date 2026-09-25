import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { SystemSettings } from '../../types/index.ts';
import {
  Settings,
  Building,
  MapPin,
  Clock,
  Shield,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  Database
} from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();

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
    const updated: SystemSettings = {
      ...settings,
      organizationName: settings.organizationName || settings.schoolName || 'EduTrack Academy',
      schoolName: settings.organizationName || settings.schoolName || 'EduTrack Academy',
      khmerOrgName: settings.khmerOrgName || settings.khmerSchoolName || 'សាលាអន្តរជាតិ',
      khmerSchoolName: settings.khmerOrgName || settings.khmerSchoolName || 'សាលាអន្តរជាតិ'
    };
    StorageService.saveSystemSettings(updated);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Updated System Settings',
      target: `Organization Name: ${updated.organizationName}`,
      ipAddress: '127.0.0.1'
    });
    showToast('System configuration & organization profile saved', 'success');
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
      </div>

    </div>
  );
};
