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

  // Detect if app is running inside an iframe (e.g. AI Studio development environment)
  isSubframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  // Ensure Service Worker is registered and ready for Web Push
  async ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      return reg;
    } catch (err) {
      console.warn('ensureServiceWorker error:', err);
      return null;
    }
  }

  getNotificationSupportStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    swSupported: boolean;
    isIframe: boolean;
  } {
    if (typeof window === 'undefined') {
      return { supported: false, permission: 'default', swSupported: false, isIframe: false };
    }
    const supported = 'Notification' in window;
    const permission = supported ? Notification.permission : 'denied';
    const swSupported = 'serviceWorker' in navigator;
    const isIframe = this.isSubframe();
    return { supported, permission, swSupported, isIframe };
  }

  async requestNotificationPermission(): Promise<{ granted: boolean; status: NotificationPermission; error?: string }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { granted: false, status: 'denied', error: 'Notifications are not supported by this browser engine.' };
    }

    if (Notification.permission === 'granted') {
      await this.ensureServiceWorker();
      return { granted: true, status: 'granted' };
    }

    if (Notification.permission === 'denied') {
      return {
        granted: false,
        status: 'denied',
        error: 'Notification permission is blocked. Please enable notifications in your browser address bar settings.'
      };
    }

    try {
      // In modern browsers, sub-frames/iframes cannot call requestPermission()
      if (this.isSubframe()) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            await this.ensureServiceWorker();
          }
          return { granted: perm === 'granted', status: perm };
        } catch (subErr: any) {
          console.warn('Sub-frame notification request blocked by browser policy:', subErr);
          return {
            granted: false,
            status: Notification.permission,
            error: 'The browser prohibits requesting notification permission inside sub-frames/iframes. Please open the app in a direct top-level browser tab to allow notifications.'
          };
        }
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.ensureServiceWorker();
      }
      return { granted: permission === 'granted', status: permission };
    } catch (err: any) {
      console.warn('Failed to request notification permission:', err);
      return {
        granted: false,
        status: Notification.permission,
        error: err?.message || 'Could not request notification permission'
      };
    }
  }

  async sendBrowserNotification(title: string, body: string, tag?: string): Promise<{ delivered: boolean; method: string }> {
    if (typeof window === 'undefined') return { delivered: false, method: 'server_env' };

    // Check Notification API
    if (!('Notification' in window)) {
      console.warn('Notification API not supported');
      return { delivered: false, method: 'unsupported' };
    }

    // Auto-request permission if in default state and not in iframe
    if (Notification.permission === 'default' && !this.isSubframe()) {
      try {
        const p = await Notification.requestPermission();
        if (p !== 'granted') return { delivered: false, method: 'permission_denied' };
      } catch {
        return { delivered: false, method: 'permission_request_failed' };
      }
    }

    if (Notification.permission !== 'granted') {
      return { delivered: false, method: 'permission_not_granted' };
    }

    const options: any = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag || 'edutrack-schedule-alert',
      vibrate: [200, 100, 200],
      renotify: true,
      data: {
        timestamp: Date.now(),
        url: '/'
      }
    };

    // Method 1: ServiceWorkerRegistration.showNotification (Required for mobile PWA, Android Chrome, and iOS Safari 16.4+)
    try {
      if ('serviceWorker' in navigator) {
        let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await this.ensureServiceWorker();
        }
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return { delivered: true, method: 'service_worker' };
        }
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, trying fallback:', swErr);
    }

    // Method 2: Service Worker controller message
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options
        });
        return { delivered: true, method: 'sw_message' };
      }
    } catch (msgErr) {
      console.warn('ServiceWorker postMessage notice:', msgErr);
    }

    // Method 3: Desktop window.Notification fallback
    try {
      new Notification(title, options);
      return { delivered: true, method: 'desktop_window_notification' };
    } catch (winErr) {
      console.warn('window.Notification constructor fallback failed:', winErr);
    }

    return { delivered: false, method: 'failed' };
  }

  // Test Web Push notification directly on demand
  async testWebPushNotification(): Promise<{ success: boolean; method: string; message: string }> {
    const permResult = await this.requestNotificationPermission();
    if (!permResult.granted) {
      return {
        success: false,
        method: permResult.status,
        message: permResult.error || `Notification permission is ${permResult.status}. Please grant permission in browser settings.`
      };
    }

    // Play chime sound
    this.playStartAlertSound();

    const res = await this.sendBrowserNotification(
      '🔔 Test Web Push Notification (ការសាកល្បង)',
      'EduTrack Web Push notifications are active and functioning correctly on this device!',
      'test-alert-' + Date.now()
    );

    return {
      success: res.delivered,
      method: res.method,
      message: res.delivered
        ? `Web Push notification successfully delivered via ${res.method}!`
        : `Could not display system push notification (delivery: ${res.method}). In-app alert logged.`
    };
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
