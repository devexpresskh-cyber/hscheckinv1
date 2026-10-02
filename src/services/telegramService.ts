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
    const targetChatId = (params.chatId || '').trim();
    const botToken = (settings.botToken || '').trim();

    if (!targetChatId) {
      return { success: false, statusText: 'Missing Chat ID' };
    }

    // Check if token exists and format looks valid (e.g. 123456:ABC-DEF...)
    const hasLiveToken = botToken.length > 10 && botToken.includes(':');

    let sendStatus: TelegramMessageLog['status'] = 'Simulated';
    let errorMessage: string | undefined = undefined;

    if (hasLiveToken && settings.isEnabled) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
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
      chatId: targetChatId,
      type: params.type,
      message: params.text,
      status: sendStatus,
      error: errorMessage || '',
      sentAt: now
    };
    StorageService.addTelegramLog(log);

    // Also push to in-app notification center
    if (params.type === 'late' || params.type === 'absence') {
      StorageService.addNotification({
        title: params.type === 'late' ? '⚠️ ការជូនដំណឹង Telegram៖ វត្តមានមកយឺត' : '🚨 ការជូនដំណឹង Telegram៖ អវត្តមាន',
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

  // 1. Check-in Alert (Sent to Telegram group for Teachers and Employees)
  sendCheckInAlert(data: {
    name: string;
    khmerName?: string;
    personType?: string;
    department: string;
    time: string;
    scheduled: string;
    status: string;
    lateMinutes: number;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || settings.notifyCheckIn === false) return;

    const groupChatId = (settings.groupChatId || '').trim();
    const adminChatId = (settings.adminChatId || '').trim();
    const isTeacher = data.personType?.toLowerCase() === 'teacher';
    const roleTagKhmer = isTeacher ? 'គ្រូបង្រៀន' : 'បុគ្គលិក';
    const displayName = data.khmerName ? `${data.khmerName} (${data.name})` : data.name;
    const subjectLine = data.subjectInfo ? `\n📚 <b>ថ្នាក់/មុខវិជ្ជា៖</b> ${data.subjectInfo}` : '';
    const isLate = data.status === 'Late';

    let msg = '';
    if (isLate) {
      msg = `⚠️ <b>[${roleTagKhmer}] វត្តមានមកយឺត (Late Check-in)</b>\n\n` +
        `👤 <b>ឈ្មោះ៖</b> ${displayName}\n` +
        `🏷️ <b>តួនាទី៖</b> ${roleTagKhmer}\n` +
        `🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ${data.department}${subjectLine}\n` +
        `⏰ <b>ម៉ោងស្កេនចូល៖</b> ${data.time}\n` +
        `📋 <b>វេនកំណត់៖</b> ${data.scheduled}\n` +
        `⏳ <b>យឺត៖</b> ${data.lateMinutes} នាទី\n` +
        `📊 <b>ស្ថានភាព៖</b> មកយឺត\n` +
        `🏫 <b>សាលា៖</b> Heart School`;
    } else {
      msg = `✅ <b>[${roleTagKhmer}] វត្តមានស្កេនចូលបម្រើការ (Check-in)</b>\n\n` +
        `👤 <b>ឈ្មោះ៖</b> ${displayName}\n` +
        `🏷️ <b>តួនាទី៖</b> ${roleTagKhmer}\n` +
        `🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ${data.department}${subjectLine}\n` +
        `⏰ <b>ម៉ោងស្កេនចូល៖</b> ${data.time}\n` +
        `📋 <b>វេនកំណត់៖</b> ${data.scheduled}\n` +
        `📊 <b>ស្ថានភាព៖</b> មានវត្តមាន (ទាន់ពេល)\n` +
        `🏫 <b>សាលា៖</b> Heart School`;
    }

    // 1. Prioritize Telegram Group
    if (groupChatId) {
      this.dispatchMessage({
        chatId: groupChatId,
        text: msg,
        type: isLate ? 'late' : 'checkin'
      });
    }

    // 2. Also notify admin if configured and distinct from group
    if (adminChatId && adminChatId !== groupChatId) {
      this.dispatchMessage({
        chatId: adminChatId,
        text: msg,
        type: isLate ? 'late' : 'checkin'
      });
    }

    // Fallback if only adminChatId is set
    if (!groupChatId && adminChatId) {
      this.dispatchMessage({
        chatId: adminChatId,
        text: msg,
        type: isLate ? 'late' : 'checkin'
      });
    }
  },

  // 2. Absence Alert
  sendAbsenceAlert(data: {
    name: string;
    khmerName?: string;
    personType?: string;
    department: string;
    date: string;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || !settings.notifyAbsent) return;

    const groupChatId = (settings.groupChatId || '').trim();
    const adminChatId = (settings.adminChatId || '').trim();
    const isTeacher = data.personType?.toLowerCase() === 'teacher';
    const roleTagKhmer = isTeacher ? 'គ្រូបង្រៀន' : 'បុគ្គលិក';
    const displayName = data.khmerName ? `${data.khmerName} (${data.name})` : data.name;

    const subjectLine = data.subjectInfo ? `\n📚 <b>ថ្នាក់/មុខវិជ្ជា៖</b> ${data.subjectInfo}` : '';
    const msg = `🚨 <b>[${roleTagKhmer}] សេចក្តីជូនដំណឹងអំពីអវត្តមាន</b>\n\n` +
      `👤 <b>ឈ្មោះ៖</b> ${displayName}\n` +
      `🏷️ <b>តួនាទី៖</b> ${roleTagKhmer}\n` +
      `🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ${data.department}${subjectLine}\n` +
      `📅 <b>កាលបរិច្ឆេទ៖</b> ${data.date}\n` +
      `⚠️ <b>ស្ថានភាព៖</b> មិនមានការស្កេនវត្តមានត្រឹមពេលកំណត់ទេ\n` +
      `🏫 <b>ប្រព័ន្ធ៖</b> Heart School - ប្រព័ន្ធគ្រប់គ្រងវត្តមាន`;

    const targetChat = groupChatId || adminChatId;
    if (targetChat) {
      this.dispatchMessage({
        chatId: targetChat,
        text: msg,
        type: 'absence'
      });
    }
    if (adminChatId && groupChatId && adminChatId !== groupChatId) {
      this.dispatchMessage({
        chatId: adminChatId,
        text: msg,
        type: 'absence'
      });
    }
  },

  // 3. Check-out Alert (Sent to Telegram group for Teachers and Employees)
  sendCheckOutAlert(data: {
    name: string;
    khmerName?: string;
    personType?: string;
    department: string;
    checkOutTime: string;
    workingTime: string;
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
    subjectInfo?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled || settings.notifyCheckOut === false) return;

    const groupChatId = (settings.groupChatId || '').trim();
    const adminChatId = (settings.adminChatId || '').trim();
    const isTeacher = data.personType?.toLowerCase() === 'teacher';
    const roleTagKhmer = isTeacher ? 'គ្រូបង្រៀន' : 'បុគ្គលិក';
    const displayName = data.khmerName ? `${data.khmerName} (${data.name})` : data.name;

    const subjectLine = data.subjectInfo ? `\n📚 <b>ថ្នាក់/មុខវិជ្ជា៖</b> ${data.subjectInfo}` : '';
    let extraInfo = '';
    if (data.earlyLeaveMinutes > 0) {
      extraInfo = `\n⚠️ <b>ចេញមុនម៉ោង៖</b> ${data.earlyLeaveMinutes} នាទី`;
    } else if (data.overtimeMinutes > 0) {
      extraInfo = `\n⭐ <b>ថែមម៉ោង (OT)៖</b> +${data.overtimeMinutes} នាទី`;
    }

    const msg = `👋 <b>[${roleTagKhmer}] វត្តមានស្កេនចេញ (Check-out)</b>\n\n` +
      `👤 <b>ឈ្មោះ៖</b> ${displayName}\n` +
      `🏷️ <b>តួនាទី៖</b> ${roleTagKhmer}\n` +
      `🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ${data.department}${subjectLine}\n` +
      `⏰ <b>ម៉ោងស្កេនចេញ៖</b> ${data.checkOutTime}\n` +
      `⌛ <b>រយៈពេលបំពេញការងារ៖</b> ${data.workingTime}${extraInfo}\n` +
      `🏫 <b>សាលា៖</b> Heart School`;

    // 1. Prioritize Telegram Group
    if (groupChatId) {
      this.dispatchMessage({
        chatId: groupChatId,
        text: msg,
        type: 'checkout'
      });
    }

    // 2. Also dispatch to admin chat if distinct
    if (adminChatId && adminChatId !== groupChatId) {
      this.dispatchMessage({
        chatId: adminChatId,
        text: msg,
        type: 'checkout'
      });
    }

    // Fallback if only adminChatId is set
    if (!groupChatId && adminChatId) {
      this.dispatchMessage({
        chatId: adminChatId,
        text: msg,
        type: 'checkout'
      });
    }
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

    const msg = `📊 <b>របាយការណ៍សង្ខេបវត្តមានប្រចាំថ្ងៃ</b>\n\n` +
      `📅 <b>កាលបរិច្ឆេទ៖</b> ${today}\n\n` +
      `👨‍🏫 <b>ចំនួនគ្រូបង្រៀនសកម្ម៖</b> ${teachers.length} នាក់\n` +
      `👥 <b>ចំនួនបុគ្គលិកសកម្ម៖</b> ${employees.length} នាក់\n\n` +
      `✅ <b>មានវត្តមាន៖</b> ${present} នាក់\n` +
      `⚠️ <b>មកយឺត៖</b> ${late} នាក់\n` +
      `🚨 <b>អវត្តមាន៖</b> ${absent} នាក់\n` +
      `🏖️ <b>សុំច្បាប់៖</b> ${leave} នាក់\n` +
      `⏳ <b>មិនទាន់ស្កេនចេញ / ខ្វះទិន្នន័យ៖</b> ${missing} នាក់\n\n` +
      `<i>រៀបចំដោយស្វ័យប្រវត្តិតាមប្រព័ន្ធវត្តមាន Heart School</i>`;

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

    const msg = `🔔 <b>សេចក្តីរំលឹកកាលវិភាគការងារ / បង្រៀន</b>\n\n` +
      `សួស្តីលោក/លោកស្រី <b>${personName}</b>\n\n` +
      `កាលវិភាគការងាររបស់អ្នកនឹងចាប់ផ្តើមនៅម៉ោង <b>${startTime}</b>។\n\n` +
      `📍 <b>ទីតាំង / បន្ទប់៖</b> ${location}\n` +
      `🏢 <b>ដេប៉ាតឺម៉ង់ / មុខវិជ្ជា៖</b> ${department}\n\n` +
      `សូមមេត្តាស្កេនវត្តមានចូលឱ្យបានទាន់ពេលវេលា។\n` +
      `🏫 <b>ស្ថាប័ន៖</b> Heart School`;

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
    const displayName = staff.khmerName ? `${staff.khmerName} (${staff.fullName})` : staff.fullName;

    const khmerStatusMap: Record<string, string> = {
      'Present': 'មានវត្តមាន (ទាន់ពេល)',
      'Late': 'មកយឺត',
      'Absent': 'អវត្តមាន',
      'Leave': 'សុំច្បាប់',
      'Missing Check-out': 'មិនទាន់ស្កេនចេញ'
    };

    const attendance = StorageService.getAttendance().find(
      r => r.personId === staff.id && r.date === today
    );

    if (cmd === '/start') {
      return `👋 <b>សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ Bot វត្តមាន Heart School</b>\n\n` +
        `សួស្តី <b>${displayName}</b>!\n` +
        `ខ្ញុំអាចជួយលោកអ្នកពិនិត្យកាលវិភាគ ស្ថានភាពវត្តមាន និងទទួលការជូនដំណឹងផ្សេងៗ។\n\n` +
        `<b>ពាក្យបញ្ជាដែលអាចប្រើបាន៖</b>\n` +
        `/status - ពិនិត្យស្ថានភាពវត្តមានថ្ងៃនេះ\n` +
        `/checkin - ស្កេនវត្តមានចូលភ្លាមៗ\n` +
        `/checkout - ស្កេនវត្តមានចេញ\n` +
        `/myschedule - មើលកាលវិភាគការងារដែលបានចាត់តាំង\n` +
        `/myattendance - មើលប្រវត្តិវត្តមានថ្មីៗ\n` +
        `/help - ជំនួយ និងព័ត៌មានបន្ថែម`;
    }

    if (cmd === '/status') {
      if (!attendance) {
        return `📅 <b>ស្ថានភាពវត្តមានថ្ងៃនេះ (${today})</b>\n\n` +
          `👤 <b>បុគ្គលិក/គ្រូ៖</b> <b>${displayName}</b>\n` +
          `📊 <b>ស្ថានភាព៖</b> <b>មិនទាន់ស្កេនវត្តមានចូលនៅឡើយទេ</b>\n` +
          `⏰ <b>ម៉ោងកំណត់៖</b> 07:30 - 11:30\n\n` +
          `សូមប្រើប្រាស់ស្ថានីយស្កេន ឬវាយពាក្យបញ្ជា /checkin ដើម្បីស្កេនវត្តមានចូល។`;
      }
      return `📅 <b>ស្ថានភាពវត្តមានថ្ងៃនេះ (${today})</b>\n\n` +
        `👤 <b>បុគ្គលិក/គ្រូ៖</b> <b>${displayName}</b>\n` +
        `📊 <b>ស្ថានភាព៖</b> <b>${khmerStatusMap[attendance.status] || attendance.status}</b>\n` +
        `⏰ <b>ម៉ោងស្កេនចូល៖</b> <b>${attendance.checkInTime || 'គ្មាន'}</b>\n` +
        `🚪 <b>ម៉ោងស្កេនចេញ៖</b> <b>${attendance.checkOutTime || 'មិនទាន់ស្កេនចេញ'}</b>\n` +
        `${attendance.lateMinutes > 0 ? `⏳ <b>យឺត៖</b> ${attendance.lateMinutes} នាទី\n` : ''}` +
        `📍 <b>ផ្ទៀងផ្ទាត់ទីតាំង៖</b> ${attendance.locationVerified ? '✅ ត្រឹមត្រូវ' : '⚠️ មិនត្រឹមត្រូវ'}`;
    }

    if (cmd === '/myschedule') {
      const schedule = StorageService.getSchedules().find(s => s.id === staff.assignedScheduleId) || StorageService.getSchedules()[0];
      return `⏰ <b>កាលវិភាគការងារដែលបានចាត់តាំង</b>\n\n` +
        `👤 <b>បុគ្គលិក/គ្រូ៖</b> <b>${displayName}</b>\n` +
        `📋 <b>កាលវិភាគ៖</b> <b>${schedule.khmerName || schedule.name}</b>\n` +
        `⏱️ <b>ម៉ោងបំពេញការងារ៖</b> <b>${schedule.startTime} — ${schedule.endTime}</b>\n` +
        `⌛ <b>រយៈពេលអនុគ្រោះ៖</b> <b>${schedule.gracePeriodMinutes} នាទី</b>\n` +
        `📍 <b>ទីតាំង៖</b> <b>${schedule.location}</b>`;
    }

    if (cmd === '/myattendance') {
      const myRecords = StorageService.getAttendance()
        .filter(r => r.personId === staff.id)
        .slice(0, 5);

      if (myRecords.length === 0) {
        return `📜 <b>ប្រវត្តិវត្តមាន</b>\n\nមិនមានកំណត់ត្រាវត្តមានសម្រាប់ ${displayName} នៅឡើយទេ។`;
      }

      const rows = myRecords.map(r => `• ${r.date}: <b>${khmerStatusMap[r.status] || r.status}</b> (ចូល: ${r.checkInTime || '-'}, ចេញ: ${r.checkOutTime || '-'})`).join('\n');
      return `📜 <b>ប្រវត្តិវត្តមានថ្មីៗ (${displayName})</b>\n\n${rows}`;
    }

    if (cmd === '/help') {
      return `ℹ️ <b>ជំនួយពីប្រព័ន្ធតេឡេក្រាម Heart School</b>\n\nសម្រាប់ចម្ងល់អំពីការផ្លាស់ប្តូរកាលវិភាគ ឬការស្នើសុំច្បាប់ឈប់សម្រាក សូមទាក់ទងមកកាន់ការិយាល័យ ឬទូរស័ព្ទលេខ +855 12 345 678 ឬទាក់ទងប្រធានផ្នែករបស់អ្នកផ្ទាល់។`;
    }

    return `❓ <b>ពាក្យបញ្ជាមិនត្រឹមត្រូវ</b>។ ពាក្យបញ្ជាដែលអាចប្រើបាន៖\n/start, /status, /checkin, /checkout, /myschedule, /myattendance, /help`;
  }
};
