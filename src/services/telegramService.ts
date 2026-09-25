import { TelegramSettings, TelegramMessageLog } from '../types/index.ts';
import { StorageService } from './storageService.ts';

export const TelegramService = {
  // Format and dispatch message
  async dispatchMessage(params: {
    chatId: string;
    text: string;
    type: TelegramMessageLog['type'];
  }): Promise<{ success: boolean; statusText: string; error?: string }> {
    const settings = StorageService.getTelegramSettings();
    const now = new Date().toISOString();

    // Check if token exists and format looks valid (e.g. 123456:ABC-DEF...)
    const hasLiveToken = settings.botToken && settings.botToken.includes(':') && !settings.botToken.startsWith('7394819280');

    let sendStatus: TelegramMessageLog['status'] = 'Simulated';
    let errorMessage: string | undefined = undefined;

    if (hasLiveToken && settings.isEnabled) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: params.chatId,
            text: params.text,
            parse_mode: 'HTML'
          })
        });

        const data = await response.json();
        if (data.ok) {
          sendStatus = 'Sent';
        } else {
          sendStatus = 'Failed';
          errorMessage = data.description || 'Telegram API rejected message';
        }
      } catch (err) {
        sendStatus = 'Failed';
        errorMessage = err instanceof Error ? err.message : 'Network error';
      }
    } else {
      // In simulator / test mode
      sendStatus = 'Simulated';
    }

    // Save log entry
    const log: TelegramMessageLog = {
      id: `tg-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      chatId: params.chatId,
      type: params.type,
      message: params.text,
      status: sendStatus,
      error: errorMessage,
      sentAt: now
    };
    StorageService.addTelegramLog(log);

    // Also push to in-app notification center
    if (params.type === 'late' || params.type === 'absence') {
      StorageService.addNotification({
        title: params.type === 'late' ? '⚠️ Telegram Alert: Late Arrival' : '🚨 Telegram Alert: Absence',
        message: params.text.slice(0, 140) + '...',
        type: params.type === 'late' ? 'warning' : 'error',
        category: 'attendance'
      });
    }

    return {
      success: sendStatus === 'Sent' || sendStatus === 'Simulated',
      statusText: sendStatus,
      error: errorMessage
    };
  },

  // 1. Check-in Alert
  sendCheckInAlert(data: {
    name: string;
    khmerName?: string;
    department: string;
    time: string;
    scheduled: string;
    status: string;
    lateMinutes: number;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled) return;

    const subjectLine = data.subjectInfo ? `\n<b>Class Session:</b> ${data.subjectInfo}` : '';

    if (data.status === 'Late' && settings.notifyLate) {
      const msg = `⚠️ <b>Late Arrival Alert</b>\n\n<b>Name:</b> ${data.name} ${data.khmerName ? `(${data.khmerName})` : ''}\n<b>Department:</b> ${data.department}${subjectLine}\n<b>Scheduled:</b> ${data.scheduled}\n<b>Check-in:</b> ${data.time}\n<b>Late:</b> ${data.lateMinutes} minutes\n<b>System:</b> EduTrack School Attendance`;
      this.dispatchMessage({
        chatId: settings.adminChatId,
        text: msg,
        type: 'late'
      });
    } else if (settings.notifyCheckIn) {
      const msg = `✅ <b>Attendance Check-in</b>\n\n<b>Name:</b> ${data.name} ${data.khmerName ? `(${data.khmerName})` : ''}\n<b>Department:</b> ${data.department}${subjectLine}\n<b>Time:</b> ${data.time}\n<b>Status:</b> ${data.status}\n<b>System:</b> EduTrack School Attendance`;
      this.dispatchMessage({
        chatId: settings.groupChatId || settings.adminChatId,
        text: msg,
        type: 'checkin'
      });
    }
  },

  // 2. Absence Alert
  sendAbsenceAlert(data: {
    name: string;
    department: string;
    date: string;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || !settings.notifyAbsent) return;

    const subjectLine = data.subjectInfo ? `\n<b>Class Session:</b> ${data.subjectInfo}` : '';
    const msg = `🚨 <b>Absence Alert</b>\n\n<b>Name:</b> ${data.name}\n<b>Department:</b> ${data.department}${subjectLine}\n<b>Date:</b> ${data.date}\n<b>Status:</b> No check-in detected by deadline.\n<b>Action:</b> Contact staff or record approved leave.\n<b>System:</b> EduTrack School Attendance`;

    this.dispatchMessage({
      chatId: settings.adminChatId,
      text: msg,
      type: 'absence'
    });
  },

  // 3. Check-out Alert
  sendCheckOutAlert(data: {
    name: string;
    department: string;
    checkOutTime: string;
    workingTime: string;
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || !settings.notifyCheckOut) return;

    const subjectLine = data.subjectInfo ? `\n<b>Class Session:</b> ${data.subjectInfo}` : '';
    let extraInfo = '';
    if (data.earlyLeaveMinutes > 0) {
      extraInfo = `\n<b>Notice:</b> Early Leave (${data.earlyLeaveMinutes} minutes before period end)`;
    } else if (data.overtimeMinutes > 0) {
      extraInfo = `\n<b>Overtime:</b> +${data.overtimeMinutes} minutes`;
    }

    const msg = `👋 <b>Check-out Recorded</b>\n\n<b>Name:</b> ${data.name}\n<b>Department:</b> ${data.department}${subjectLine}\n<b>Check-out:</b> ${data.checkOutTime}\n<b>Duration:</b> ${data.workingTime}${extraInfo}\n<b>System:</b> EduTrack School Attendance`;

    this.dispatchMessage({
      chatId: settings.groupChatId || settings.adminChatId,
      text: msg,
      type: 'checkout'
    });
  },

  // 4. Admin Daily Attendance Summary
  sendDailySummary() {
    const settings = StorageService.getTelegramSettings();
    const today = new Date().toISOString().split('T')[0];
    const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
    const employees = StorageService.getEmployees().filter(e => e.status === 'Active');
    const records = StorageService.getAttendance().filter(r => r.date === today);

    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const missing = records.filter(r => r.status === 'Missing Check-out' || (r.checkInTime && !r.checkOutTime)).length;

    const msg = `📊 <b>Daily Attendance Summary</b>\n\n<b>Date:</b> ${today}\n\n<b>Active Teachers:</b> ${teachers.length}\n<b>Active Employees:</b> ${employees.length}\n\n✅ <b>Present:</b> ${present}\n⚠️ <b>Late:</b> ${late}\n🚨 <b>Absent:</b> ${absent}\n🏖️ <b>On Leave:</b> ${leave}\n⏳ <b>Incomplete / Missing Checkout:</b> ${missing}\n\n<i>Generated by EduTrack Automated Attendance Engine</i>`;

    return this.dispatchMessage({
      chatId: settings.adminChatId,
      text: msg,
      type: 'summary'
    });
  },

  // 5. Schedule Reminder
  sendScheduleReminder(personName: string, startTime: string, location: string, department: string) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || !settings.notifyReminder) return;

    const msg = `🔔 <b>Schedule Reminder</b>\n\nGood morning <b>${personName}</b>.\n\nYour work schedule begins at <b>${startTime}</b>.\n\n<b>Campus Location:</b> ${location}\n<b>Department:</b> ${department}\n\nPlease remember to check in on time via mobile kiosk.`;

    return this.dispatchMessage({
      chatId: settings.groupChatId || settings.adminChatId,
      text: msg,
      type: 'reminder'
    });
  },

  // 6. Interactive Bot Command Processor
  processBotCommand(command: string, personId?: string): string {
    const cmd = command.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const teachers = StorageService.getTeachers();
    const employees = StorageService.getEmployees();
    const staff = teachers.find(t => t.id === personId) || employees.find(e => e.id === personId) || teachers[0];

    const attendance = StorageService.getAttendance().find(
      r => r.personId === staff.id && r.date === today
    );

    if (cmd === '/start') {
      return `👋 <b>Welcome to EduTrack Bot</b>\n\nHello ${staff.fullName}!\nI can help you check your schedule, report attendance, and receive alerts.\n\n<b>Available Commands:</b>\n/status - View today's attendance status\n/checkin - Submit instant check-in\n/checkout - Submit shift check-out\n/myschedule - View your assigned shift\n/myattendance - View recent records\n/help - Instructions & support`;
    }

    if (cmd === '/status') {
      if (!attendance) {
        return `📅 <b>Today's Attendance (${today})</b>\n\nStaff: <b>${staff.fullName}</b>\nStatus: <b>Not checked in yet</b>\nScheduled: 07:30 - 11:30\n\nType /checkin to record your attendance.`;
      }
      return `📅 <b>Today's Attendance (${today})</b>\n\nStaff: <b>${staff.fullName}</b>\nStatus: <b>${attendance.status}</b>\nCheck-in: <b>${attendance.checkInTime || 'None'}</b>\nCheck-out: <b>${attendance.checkOutTime || 'Not yet'}</b>\n${attendance.lateMinutes > 0 ? `Late by: ${attendance.lateMinutes} minutes\n` : ''}Location Verified: ${attendance.locationVerified ? '✅ Yes' : '⚠️ No'}`;
    }

    if (cmd === '/myschedule') {
      const schedule = StorageService.getSchedules().find(s => s.id === staff.assignedScheduleId) || StorageService.getSchedules()[0];
      return `⏰ <b>Your Assigned Schedule</b>\n\nStaff: <b>${staff.fullName}</b>\nSchedule: <b>${schedule.name}</b>\nWorking Hours: <b>${schedule.startTime} — ${schedule.endTime}</b>\nGrace Period: <b>${schedule.gracePeriodMinutes} minutes</b>\nCampus Location: <b>${schedule.location}</b>`;
    }

    if (cmd === '/myattendance') {
      const myRecords = StorageService.getAttendance()
        .filter(r => r.personId === staff.id)
        .slice(0, 5);

      if (myRecords.length === 0) {
        return `📜 <b>Attendance History</b>\n\nNo records found for ${staff.fullName}.`;
      }

      const rows = myRecords.map(r => `• ${r.date}: <b>${r.status}</b> (In: ${r.checkInTime || '-'}, Out: ${r.checkOutTime || '-'})`).join('\n');
      return `📜 <b>Recent Attendance History (${staff.fullName})</b>\n\n${rows}`;
    }

    if (cmd === '/help') {
      return `ℹ️ <b>EduTrack Telegram Support</b>\n\nFor questions about schedule changes or leave approvals, please contact HR at +855 12 345 678 or reach out to your department supervisor.`;
    }

    return `❓ <b>Unknown command</b>. Available commands:\n/start, /status, /checkin, /checkout, /myschedule, /myattendance, /help`;
  }
};
