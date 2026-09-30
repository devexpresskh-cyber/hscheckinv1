import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { ScheduleAlertService, AlertPreferences } from '../../services/scheduleAlertService.ts';
import { StorageService } from '../../services/storageService.ts';
import { TeacherSubjectSchedule } from '../../types/index.ts';
import {
  Bell,
  Clock,
  Volume2,
  VolumeX,
  Settings2,
  CheckCircle2,
  MapPin,
  Play,
  X,
  AlertCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface TeacherScheduleAlertBannerProps {
  onOpenCheckIn?: () => void;
}

export const TeacherScheduleAlertBanner: React.FC<TeacherScheduleAlertBannerProps> = ({
  onOpenCheckIn
}) => {
  const { currentUser } = useAuth();
  const { isKhmer } = useLanguage();
  const isTeacher = currentUser.role === 'teacher';

  const [activeAlert, setActiveAlert] = useState<{
    type: 'start' | 'end';
    schedule: TeacherSubjectSchedule;
    minutesRemaining: number;
  } | null>(null);

  const [nextScheduleData, setNextScheduleData] = useState<{
    schedule: TeacherSubjectSchedule;
    status: 'upcoming' | 'ongoing';
    minutesDiff: number;
  } | null>(null);

  const [prefs, setPrefs] = useState<AlertPreferences>(() =>
    ScheduleAlertService.getPreferences()
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  // Identify teacher's id
  const teacherId = currentUser.personId || currentUser.id;

  // Poll schedule every 20 seconds
  useEffect(() => {
    const checkSchedule = () => {
      // 1. Trigger alerts if within threshold
      ScheduleAlertService.checkTeacherScheduleAlerts(
        teacherId,
        currentUser.fullName,
        currentUser.khmerName,
        (alert) => {
          setActiveAlert(alert);
        }
      );

      // 2. Update next upcoming or ongoing class
      const next = ScheduleAlertService.getNextSchedule(teacherId);
      setNextScheduleData(next);
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 20000); // 20s tick

    return () => clearInterval(interval);
  }, [teacherId, currentUser]);

  const handleToggleSound = () => {
    const updated = { ...prefs, audioChimeEnabled: !prefs.audioChimeEnabled };
    setPrefs(updated);
    ScheduleAlertService.savePreferences(updated);
    if (updated.audioChimeEnabled) {
      ScheduleAlertService.playStartAlertSound();
    }
  };

  const handleTestSound = (type: 'start' | 'end') => {
    if (type === 'start') {
      ScheduleAlertService.playStartAlertSound();
    } else {
      ScheduleAlertService.playEndAlertSound();
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await ScheduleAlertService.requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const updated = { ...prefs, browserNotificationsEnabled: granted };
    setPrefs(updated);
    ScheduleAlertService.savePreferences(updated);
    if (granted) {
      ScheduleAlertService.sendBrowserNotification(
        isKhmer ? '🔔 បានបើកការដាស់តឿនជោគជ័យ' : '🔔 Schedule Alerts Enabled',
        isKhmer
          ? 'ប្រព័ន្ធនឹងផ្ញើសាររំលឹកមុនម៉ោងបង្រៀនចូល និងចេញ'
          : 'You will receive timely reminders before class begins and ends.'
      );
    }
  };

  const handleSavePrefField = <K extends keyof AlertPreferences>(
    key: K,
    val: AlertPreferences[K]
  ) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    ScheduleAlertService.savePreferences(updated);
  };

  // Only teachers have scheduled class alert countdowns - admin and employees do not teach
  if (!isTeacher) {
    return null;
  }

  // If no upcoming or ongoing class, don't crowd the top
  if (!nextScheduleData && !activeAlert) {
    return null;
  }

  const schedule = activeAlert ? activeAlert.schedule : nextScheduleData?.schedule;
  if (!schedule) return null;

  const isOngoing = activeAlert ? activeAlert.type === 'end' : nextScheduleData?.status === 'ongoing';
  const minutes = activeAlert ? activeAlert.minutesRemaining : nextScheduleData?.minutesDiff || 0;
  const subjectName = isKhmer && schedule.khmerSubject ? schedule.khmerSubject : schedule.subject;

  return (
    <div className="relative mb-4">
      {/* Active Class Alert Banner */}
      <div
        className={`rounded-2xl p-3 sm:p-4 border transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          isOngoing
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-amber-300 text-amber-950'
            : 'bg-gradient-to-r from-indigo-500/10 via-indigo-50 to-blue-50 border-indigo-200 text-indigo-950'
        }`}
      >
        {/* Left Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              isOngoing
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 animate-pulse'
                : 'bg-gradient-to-tr from-indigo-600 to-blue-600'
            }`}
          >
            {isOngoing ? <Clock className="w-5 h-5" /> : <Bell className="w-5 h-5 animate-bounce" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isOngoing
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                }`}
              >
                {isOngoing
                  ? (isKhmer ? '⏳ កំពុងបង្រៀន' : '⏳ Class in Progress')
                  : (isKhmer ? '🔔 ម៉ោងបង្រៀនបន្ទាប់' : '🔔 Upcoming Class')}
              </span>

              <span className="text-xs font-black text-slate-800">
                {isOngoing
                  ? (isKhmer ? `នៅសល់ ${minutes} នាទីទៀត` : `${minutes} min left until end`)
                  : (isKhmer ? `ចាប់ផ្តើមក្នុង ${minutes} នាទីទៀត` : `Starts in ${minutes} min`)}
              </span>

              <span className="text-[11px] text-slate-500 font-mono">
                ({schedule.startTime} — {schedule.endTime})
              </span>
            </div>

            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {subjectName} • <span className="font-semibold text-slate-700">{schedule.gradeClass}</span>
              {schedule.room && (
                <span className="ml-2 text-xs font-normal text-slate-600 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  {schedule.room}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {/* Audio Chime quick toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              prefs.audioChimeEnabled
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={
              prefs.audioChimeEnabled
                ? (isKhmer ? 'បានបើកសម្លេងរោទ៍ (ចុចដើម្បីបិទ)' : 'Sound Chime Active (click to mute)')
                : (isKhmer ? 'បានបិទសម្លេងរោទ៍ (ចុចដើម្បីបើក)' : 'Sound Chime Muted (click to unmute)')
            }
          >
            {prefs.audioChimeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-xs">
              {prefs.audioChimeEnabled ? (isKhmer ? 'សម្លេងរោទ៍' : 'Sound ON') : (isKhmer ? 'ស្ងាត់' : 'Muted')}
            </span>
          </button>

          {/* Quick Check-in / Check-out button if parent provided handler */}
          {onOpenCheckIn && (
            <button
              onClick={onOpenCheckIn}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                isOngoing
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isOngoing ? (isKhmer ? 'ស្កេនចេញ' : 'Check-out') : (isKhmer ? 'ស្កេនវត្តមាន' : 'Check-in')}</span>
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            title={isKhmer ? 'កំណត់ការដាស់តឿន' : 'Alert Preferences'}
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {activeAlert && (
            <button
              onClick={() => setActiveAlert(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/50"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alert Settings Modal / Popover */}
      {isSettingsOpen && (
        <div className="absolute top-full right-0 mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">
                {isKhmer ? 'ការកំណត់ដាស់តឿនម៉ោងបង្រៀន' : 'Schedule Alert Preferences'}
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-3.5 text-xs text-slate-700">
            {/* Start Alert Lead Time */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 flex items-center justify-between">
                <span>{isKhmer ? 'រំលឹកមុនម៉ោងបង្រៀនចូល៖' : 'Alert Before Class Starts:'}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyBeforeStart}
                  onChange={(e) => handleSavePrefField('notifyBeforeStart', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
              {prefs.notifyBeforeStart && (
                <div className="flex items-center gap-2 pt-1">
                  {[5, 10, 15].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSavePrefField('minutesBeforeStart', m)}
                      className={`flex-1 py-1 px-2 rounded-lg font-bold border transition-colors ${
                        prefs.minutesBeforeStart === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m} {isKhmer ? 'នាទី' : 'mins'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* End Alert Lead Time */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 flex items-center justify-between">
                <span>{isKhmer ? 'រំលឹកមុនចប់ម៉ោងបង្រៀន៖' : 'Alert Before Class Ends:'}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyBeforeEnd}
                  onChange={(e) => handleSavePrefField('notifyBeforeEnd', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
              {prefs.notifyBeforeEnd && (
                <div className="flex items-center gap-2 pt-1">
                  {[3, 5, 10].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSavePrefField('minutesBeforeEnd', m)}
                      className={`flex-1 py-1 px-2 rounded-lg font-bold border transition-colors ${
                        prefs.minutesBeforeEnd === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m} {isKhmer ? 'នាទី' : 'mins'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sound Chime & Sound Preview */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {isKhmer ? 'សម្លេងរោទ៍កណ្ដឹង (Audio Chime)' : 'Bell Audio Chime'}
                </span>
                <input
                  type="checkbox"
                  checked={prefs.audioChimeEnabled}
                  onChange={(e) => handleSavePrefField('audioChimeEnabled', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleTestSound('start')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-[11px]"
                >
                  <Play className="w-3 h-3 text-indigo-600" />
                  <span>{isKhmer ? 'សាកល្បងសម្លេងចូល' : 'Test Start Bell'}</span>
                </button>
                <button
                  onClick={() => handleTestSound('end')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-[11px]"
                >
                  <Play className="w-3 h-3 text-amber-600" />
                  <span>{isKhmer ? 'សាកល្បងសម្លេងចេញ' : 'Test End Bell'}</span>
                </button>
              </div>
            </div>

            {/* Browser / Mobile Push Notifications */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">
                  {isKhmer ? 'ការជូនដំណឹងលើទូរស័ព្ទ (Web Push)' : 'Phone Web Push Notification'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {notificationPermission === 'granted'
                    ? (isKhmer ? '✅ បានអនុញ្ញាត' : '✅ Allowed')
                    : (isKhmer ? '⚠️ មិនទាន់បានអនុញ្ញាត' : '⚠️ Permission needed')}
                </p>
              </div>
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleEnableNotifications}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs"
                >
                  {isKhmer ? 'បើក' : 'Enable'}
                </button>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
            </div>

            {/* Telegram Bot Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {isKhmer ? 'ការដាស់តឿនតាម Telegram' : 'Telegram Bot Reminders'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isKhmer ? 'ផ្ញើសាររំលឹកផ្ទាល់ទៅកាន់ Bot' : 'Dispatches schedule reminder via bot'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.telegramAlertEnabled}
                onChange={(e) => handleSavePrefField('telegramAlertEnabled', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100 text-right">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              {isKhmer ? 'រួចរាល់' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
