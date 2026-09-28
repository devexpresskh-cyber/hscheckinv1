import { StorageService } from './storageService.ts';
import { TelegramService } from './telegramService.ts';
import { TeacherSubjectSchedule } from '../types/index.ts';

export interface AlertPreferences {
  notifyBeforeStart: boolean;
  minutesBeforeStart: number; // 5, 10, or 15
  notifyBeforeEnd: boolean;
  minutesBeforeEnd: number; // 3, 5, or 10
  audioChimeEnabled: boolean;
  browserNotificationsEnabled: boolean;
  telegramAlertEnabled: boolean;
}

const DEFAULT_PREFS: AlertPreferences = {
  notifyBeforeStart: true,
  minutesBeforeStart: 10,
  notifyBeforeEnd: true,
  minutesBeforeEnd: 5,
  audioChimeEnabled: true,
  browserNotificationsEnabled: true,
  telegramAlertEnabled: true
};

const PREFS_STORAGE_KEY = 'edutrack_teacher_alert_prefs';
const TRIGGERED_ALERTS_KEY = 'edutrack_triggered_schedule_alerts';

class ScheduleAlertEngine {
  private triggeredAlerts: Set<string> = new Set();
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.loadTriggeredAlerts();
  }

  private loadTriggeredAlerts() {
    try {
      const stored = sessionStorage.getItem(TRIGGERED_ALERTS_KEY);
      if (stored) {
        this.triggeredAlerts = new Set(JSON.parse(stored));
      }
    } catch {
      this.triggeredAlerts = new Set();
    }
  }

  private saveTriggeredAlerts() {
    try {
      sessionStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify(Array.from(this.triggeredAlerts)));
    } catch {
      // Ignore storage errors
    }
  }

  getPreferences(): AlertPreferences {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PREFS;
  }

  savePreferences(prefs: AlertPreferences) {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }

  // Pure Web Audio API Synthesizer Bell Chimes (100% offline, zero external dependencies)
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play pleasant, melodic bell chime for class start reminder (C5 -> E5 -> G5)
  playStartAlertSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.55);
      });
    } catch (e) {
      console.warn('Could not play alert chime:', e);
    }
  }

  // Play soft chime for class completion / wrap-up reminder (G5 -> E5)
  playEndAlertSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [783.99, 659.25]; // G5, E5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0, now + idx * 0.16);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.65);
      });
    } catch (e) {
      console.warn('Could not play alert chime:', e);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  sendBrowserNotification(title: string, body: string, tag?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || 'edutrack-schedule-alert',
        silent: false
      });
    } catch (e) {
      console.warn('Failed to send browser notification:', e);
    }
  }

  // Check schedule for teacher and trigger alerts
  checkTeacherScheduleAlerts(
    teacherId: string,
    teacherName: string,
    teacherKhmerName?: string,
    onAlertTriggered?: (alert: {
      type: 'start' | 'end';
      schedule: TeacherSubjectSchedule;
      minutesRemaining: number;
    }) => void
  ) {
    const prefs = this.getPreferences();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const todayDateStr = now.toISOString().split('T')[0];

    const allSubjectSchedules = StorageService.getSubjectSchedules();
    const mySchedules = allSubjectSchedules.filter(s => {
      if (!s.isActive) return false;
      const isMyTeacher = s.teacherId === teacherId;
      const isToday =
        s.dayOfWeek === dayOfWeek ||
        (Array.isArray(s.daysOfWeek) && s.daysOfWeek.includes(dayOfWeek));
      return isMyTeacher && isToday;
    });

    for (const schedule of mySchedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      // 1. Alert BEFORE schedule starts
      if (prefs.notifyBeforeStart) {
        const minutesBeforeStart = startTotalMinutes - currentTotalMinutes;
        const alertThreshold = prefs.minutesBeforeStart;

        // If within lead time window (e.g., between 1 and 10 minutes before start)
        if (minutesBeforeStart > 0 && minutesBeforeStart <= alertThreshold) {
          const alertKey = `${todayDateStr}_start_${schedule.id}_${startTotalMinutes}`;

          if (!this.triggeredAlerts.has(alertKey)) {
            this.triggeredAlerts.add(alertKey);
            this.saveTriggeredAlerts();

            const subjectDisplayName = teacherKhmerName && schedule.khmerSubject ? schedule.khmerSubject : schedule.subject;
            const roomText = schedule.room || 'Classroom';
            const title = `🔔 Class Reminder (${minutesBeforeStart}m left)`;
            const body = `${subjectDisplayName} (${schedule.gradeClass || ''}) starts at ${schedule.startTime} in ${roomText}.`;

            // 1. Audio Bell
            if (prefs.audioChimeEnabled) {
              this.playStartAlertSound();
            }

            // 2. Browser Push
            if (prefs.browserNotificationsEnabled) {
              this.sendBrowserNotification(title, body, `class-start-${schedule.id}`);
            }

            // 3. System Notification
            StorageService.addNotification({
              title,
              message: body,
              type: 'info',
              category: 'schedule'
            });

            // 4. Telegram alert dispatch
            if (prefs.telegramAlertEnabled) {
              TelegramService.sendScheduleReminder(
                teacherName,
                schedule.startTime,
                roomText,
                `${schedule.subject} (${schedule.gradeClass || ''})`
              );
            }

            // Callback for UI banner
            if (onAlertTriggered) {
              onAlertTriggered({
                type: 'start',
                schedule,
                minutesRemaining: minutesBeforeStart
              });
            }
          }
        }
      }

      // 2. Alert BEFORE schedule ends
      if (prefs.notifyBeforeEnd) {
        const minutesBeforeEnd = endTotalMinutes - currentTotalMinutes;
        const alertEndThreshold = prefs.minutesBeforeEnd;

        // If currently in class and within 1 to 5 minutes before end
        if (
          currentTotalMinutes >= startTotalMinutes &&
          minutesBeforeEnd > 0 &&
          minutesBeforeEnd <= alertEndThreshold
        ) {
          const alertKey = `${todayDateStr}_end_${schedule.id}_${endTotalMinutes}`;

          if (!this.triggeredAlerts.has(alertKey)) {
            this.triggeredAlerts.add(alertKey);
            this.saveTriggeredAlerts();

            const subjectDisplayName = teacherKhmerName && schedule.khmerSubject ? schedule.khmerSubject : schedule.subject;
            const title = `⏳ Class Ending Soon (${minutesBeforeEnd}m left)`;
            const body = `${subjectDisplayName} ends at ${schedule.endTime}. Please prepare to wrap up and submit check-out.`;

            // 1. Audio Bell
            if (prefs.audioChimeEnabled) {
              this.playEndAlertSound();
            }

            // 2. Browser Push
            if (prefs.browserNotificationsEnabled) {
              this.sendBrowserNotification(title, body, `class-end-${schedule.id}`);
            }

            // 3. System Notification
            StorageService.addNotification({
              title,
              message: body,
              type: 'warning',
              category: 'schedule'
            });

            // Callback for UI banner
            if (onAlertTriggered) {
              onAlertTriggered({
                type: 'end',
                schedule,
                minutesRemaining: minutesBeforeEnd
              });
            }
          }
        }
      }
    }
  }

  // Get next upcoming schedule for display in widget
  getNextSchedule(teacherId: string): {
    schedule: TeacherSubjectSchedule;
    status: 'upcoming' | 'ongoing';
    minutesDiff: number;
  } | null {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    const allSubjectSchedules = StorageService.getSubjectSchedules();
    const mySchedules = allSubjectSchedules.filter(s => {
      if (!s.isActive) return false;
      const isMyTeacher = s.teacherId === teacherId;
      const isToday =
        s.dayOfWeek === dayOfWeek ||
        (Array.isArray(s.daysOfWeek) && s.daysOfWeek.includes(dayOfWeek));
      return isMyTeacher && isToday;
    });

    // Sort by start time
    const sorted = [...mySchedules].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    for (const schedule of sorted) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      // Currently ongoing
      if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
        return {
          schedule,
          status: 'ongoing',
          minutesDiff: endTotalMinutes - currentTotalMinutes
        };
      }

      // Next upcoming class today
      if (startTotalMinutes > currentTotalMinutes) {
        return {
          schedule,
          status: 'upcoming',
          minutesDiff: startTotalMinutes - currentTotalMinutes
        };
      }
    }

    return null;
  }
}

export const ScheduleAlertService = new ScheduleAlertEngine();
