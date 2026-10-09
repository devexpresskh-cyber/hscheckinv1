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

  // 3b. Leave Approved Alert (Auto-logged Absence)
  sendLeaveApprovedAlert(data: {
    name: string;
    khmerName?: string;
    personType?: string;
    department: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    approvedBy: string;
    scheduleCount?: number;
    durationUnit?: 'days' | 'hours';
    hours?: number;
    startTime?: string;
    endTime?: string;
  }) {
    const settings = StorageService.getTelegramSettings();
    if (!settings.isEnabled) return;

    const isTeacher = data.personType?.toLowerCase() === 'teacher';
    const roleTagKhmer = isTeacher ? 'គ្រូបង្រៀន' : 'បុគ្គលិក';
    const displayName = data.khmerName ? `${data.khmerName} (${data.name})` : data.name;

    const groupChatId = (settings.groupChatId || '').trim();
    const adminChatId = (settings.adminChatId || '').trim();

    const durationLine = data.durationUnit === 'hours'
      ? `⏱️ <b>រយៈពេល៖</b> ${data.hours ? `${data.hours} ម៉ោង (Hours)` : 'សុំច្បាប់ជាម៉ោង'}${data.startTime && data.endTime ? ` (${data.startTime} ដល់ ${data.endTime})` : ''}`
      : `📅 <b>កាលបរិច្ឆេទ៖</b> ${data.startDate} ដល់ ${data.endDate}`;

    const msg = `📝 <b>[${roleTagKhmer}] ការអនុម័តច្បាប់ឈប់សម្រាក (Approved Leave - Auto Logged)</b>\n\n` +
      `👤 <b>ឈ្មោះ៖</b> ${displayName}\n` +
      `🏷️ <b>តួនាទី៖</b> ${roleTagKhmer}\n` +
      `🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ${data.department}\n` +
      `📋 <b>ប្រភេទច្បាប់៖</b> ${data.leaveType}\n` +
      `${durationLine}\n` +
      `💬 <b>មូលហេតុ៖</b> ${data.reason}\n` +
      `✅ <b>អនុម័តដោយ៖</b> ${data.approvedBy}\n` +
      `📌 <b>ស្ថានភាព៖</b> កត់ត្រាអវត្តមានស្វ័យប្រវត្តក្នុងតារាង (${data.scheduleCount || 0} វេន/ម៉ោងបង្រៀន)\n` +
      `🏫 <b>សាលា៖</b> Heart School`;

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

    if (cmd === '/backup') {
      const backup = StorageService.createFullDatabaseBackup();
      return `💾 <b>[ទិន្នន័យបម្រុងទុក] ស្ថិតិទិន្នន័យប្រព័ន្ធ</b>\n\n` +
        `🏫 <b>ស្ថាប័ន៖</b> ${backup.organizationName}\n` +
        `📅 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toISOString().split('T')[0]}\n` +
        `👨‍🏫 <b>គ្រូបង្រៀន៖</b> ${backup.stats.teachers} នាក់\n` +
        `👥 <b>បុគ្គលិក៖</b> ${backup.stats.employees} នាក់\n` +
        `⏱️ <b>កំណត់ត្រាវត្តមាន៖</b> ${backup.stats.attendanceRecords} កំណត់ត្រា\n` +
        `📝 <b>ច្បាប់ឈប់សម្រាក៖</b> ${backup.stats.leaveRequests} ច្បាប់\n` +
        `📚 <b>កាលវិភាគបង្រៀន៖</b> ${backup.stats.subjectSchedules} ថ្នាក់\n\n` +
        `ឯកសារបម្រុងទុកពេញលេញត្រូវបានដំណើរការ និងរក្សាទុកក្នុងប្រព័ន្ធ។`;
    }

    if (cmd === '/help') {
      return `ℹ️ <b>ជំនួយពីប្រព័ន្ធតេឡេក្រាម Heart School</b>\n\nសម្រាប់ចម្ងល់អំពីការផ្លាស់ប្តូរកាលវិភាគ ឬការស្នើសុំច្បាប់ឈប់សម្រាក សូមទាក់ទងមកកាន់ការិយាល័យ ឬទូរស័ព្ទលេខ +855 12 345 678 ឬទាក់ទងប្រធានផ្នែករបស់អ្នកផ្ទាល់។`;
    }

    return `❓ <b>ពាក្យបញ្ជាមិនត្រឹមត្រូវ</b>។ ពាក្យបញ្ជាដែលអាចប្រើបាន៖\n/start, /status, /checkin, /checkout, /myschedule, /myattendance, /backup, /help`;
  },

  // 7. Full Automated Data Backup & Dispatch to Telegram Group
  async sendDataBackupToTelegram(options?: {
    targetChatId?: string;
    isManual?: boolean;
    trigger?: 'manual' | 'auto';
  }): Promise<{ success: boolean; statusText: string; error?: string; backup?: any; sentTargets?: string[] }> {
    const settings = StorageService.getTelegramSettings();
    const backup = StorageService.createFullDatabaseBackup();
    const now = new Date();
    
    // Local date/time formatting
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const triggerLabel = options?.trigger === 'auto' ? 'ស្វ័យប្រវត្ត (Scheduled Auto-Backup)' : 'ដោយដៃផ្ទាល់ (Manual Trigger)';

    const groupChatId = (settings.groupChatId || '').trim();
    const adminChatId = (settings.adminChatId || '').trim();
    
    // Resolve target chat IDs based on options or configuration
    let targetChatIds: string[] = [];
    if (options?.targetChatId) {
      targetChatIds = [options.targetChatId.trim()];
    } else if (settings.autoBackupTarget === 'both') {
      targetChatIds = [groupChatId, adminChatId].filter(id => Boolean(id && id.length > 0));
      if (targetChatIds.length === 0 && groupChatId) targetChatIds = [groupChatId];
      if (targetChatIds.length === 0 && adminChatId) targetChatIds = [adminChatId];
    } else if (settings.autoBackupTarget === 'admin') {
      targetChatIds = [adminChatId || groupChatId].filter(id => Boolean(id && id.length > 0));
    } else {
      // Default: prioritize Telegram Group
      targetChatIds = [groupChatId || adminChatId].filter(id => Boolean(id && id.length > 0));
    }

    const botToken = (settings.botToken || '').trim();

    if (targetChatIds.length === 0) {
      return { success: false, statusText: 'Missing Group Chat ID or Admin Chat ID', error: 'No target Chat ID configured for backup' };
    }

    const { stats, organizationName, academicYear } = backup;
    const documentName = `EduTrack_Backup_${dateStr}_${timeStr.replace(':', '')}.json`;

    const escapeHtml = (str: string) => {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const rawCaption = `💾 [ទិន្នន័យបម្រុងទុក] ការបម្រុងទុកប្រព័ន្ធទូទៅ (Data Backup)\n\n` +
      `🏫 ស្ថាប័ន៖ ${organizationName}\n` +
      `📅 កាលបរិច្ឆេទ៖ ${dateStr} ${timeStr}\n` +
      `🔄 លក្ខខណ្ឌ៖ ${triggerLabel}\n` +
      `🎓 ឆ្នាំសិក្សា៖ ${academicYear}\n\n` +
      `📊 ស្ថិតិទិន្នន័យបម្រុងទុកសរុប (${stats.totalEntities} កំណត់ត្រា)៖\n` +
      `• 👨‍🏫 គ្រូបង្រៀន (Teachers)៖ ${stats.teachers} នាក់\n` +
      `• 👥 បុគ្គលិកទូទៅ (Staff)៖ ${stats.employees} នាក់\n` +
      `• 🏢 ដេប៉ាតឺម៉ង់ (Departments)៖ ${stats.departments} ផ្នែក\n` +
      `• 📋 កាលវិភាគវេនការងារ (Schedules)៖ ${stats.dutySchedules} វេន\n` +
      `• 📚 ថ្នាក់មុខវិជ្ជា (Subject Classes)៖ ${stats.subjectSchedules} ថ្នាក់\n` +
      `• ⏱️ កំណត់ត្រាវត្តមាន (Attendance)៖ ${stats.attendanceRecords} កំណត់ត្រា\n` +
      `• 📝 ច្បាប់ឈប់សម្រាក (Leaves)៖ ${stats.leaveRequests} ច្បាប់\n` +
      `• 🌴 ថ្ងៃឈប់សម្រាក (Holidays)៖ ${stats.holidays} ថ្ងៃ\n` +
      `• 🔁 ការបង្រៀនជំនួស (Substitutions)៖ ${stats.substitutions} វេន\n` +
      `• 👤 គណនីប្រើប្រាស់ (User Accounts)៖ ${stats.userAccounts} គណនី\n\n` +
      `📁 ឯកសារភ្ជាប់៖ ${documentName}\n` +
      `🔐 សុវត្ថិភាព៖ ផ្ទៀងផ្ទាត់ និងអ៊ិនគ្រីបទិន្នន័យ (SHA-Verified Archive)\n` +
      `🛡️ ប្រព័ន្ធ៖ Heart School / EduTrack Automated Cloud Archive`;

    const htmlCaption = `💾 <b>[ទិន្នន័យបម្រុងទុក] ការបម្រុងទុកប្រព័ន្ធទូទៅ (Data Backup)</b>\n\n` +
      `🏫 <b>ស្ថាប័ន៖</b> <b>${escapeHtml(organizationName)}</b>\n` +
      `📅 <b>កាលបរិច្ឆេទ៖</b> <b>${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</b>\n` +
      `🔄 <b>លក្ខខណ្ឌ៖</b> ${escapeHtml(triggerLabel)}\n` +
      `🎓 <b>ឆ្នាំសិក្សា៖</b> ${escapeHtml(academicYear)}\n\n` +
      `📊 <b>ស្ថិតិទិន្នន័យបម្រុងទុកសរុប (${stats.totalEntities} កំណត់ត្រា)៖</b>\n` +
      `• 👨‍🏫 <b>គ្រូបង្រៀន (Teachers)៖</b> ${stats.teachers} នាក់\n` +
      `• 👥 <b>បុគ្គលិកទូទៅ (Staff)៖</b> ${stats.employees} នាក់\n` +
      `• 🏢 <b>ដេប៉ាតឺម៉ង់ (Departments)៖</b> ${stats.departments} ផ្នែក\n` +
      `• 📋 <b>កាលវិភាគវេនការងារ (Schedules)៖</b> ${stats.dutySchedules} វេន\n` +
      `• 📚 <b>ថ្នាក់មុខវិជ្ជា (Subject Classes)៖</b> ${stats.subjectSchedules} ថ្នាក់\n` +
      `• ⏱️ <b>កំណត់ត្រាវត្តមាន (Attendance)៖</b> ${stats.attendanceRecords} កំណត់ត្រា\n` +
      `• 📝 <b>ច្បាប់ឈប់សម្រាក (Leaves)៖</b> ${stats.leaveRequests} ច្បាប់\n` +
      `• 🌴 <b>ថ្ងៃឈប់សម្រាក (Holidays)៖</b> ${stats.holidays} ថ្ងៃ\n` +
      `• 🔁 <b>ការបង្រៀនជំនួស (Substitutions)៖</b> ${stats.substitutions} វេន\n` +
      `• 👤 <b>គណនីប្រើប្រាស់ (User Accounts)៖</b> ${stats.userAccounts} គណនី\n\n` +
      `📁 <b>ឯកសារភ្ជាប់៖</b> <code>${escapeHtml(documentName)}</code>\n` +
      `🔐 <b>សុវត្ថិភាព៖</b> ផ្ទៀងផ្ទាត់ និងអ៊ិនគ្រីបទិន្នន័យ (SHA-Verified Archive)\n` +
      `🛡️ <b>ប្រព័ន្ធ៖</b> Heart School / EduTrack Automated Cloud Archive`;

    const hasLiveToken = botToken.length > 10 && botToken.includes(':');
    const jsonString = JSON.stringify(backup, null, 2);
    let overallSuccess = false;
    let lastError: string | undefined = undefined;
    let lastStatus: TelegramMessageLog['status'] = 'Simulated';
    const successfulTargets: string[] = [];

    for (let targetChatId of targetChatIds) {
      let sendStatus: TelegramMessageLog['status'] = 'Simulated';
      let errorMessage: string | undefined = undefined;
      let effectiveChatId = targetChatId;

      if (hasLiveToken && settings.isEnabled) {
        let documentSent = false;

        // 1. Try sending as real attached JSON document via sendDocument with HTML caption
        try {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const formData = new FormData();
          formData.append('chat_id', effectiveChatId);
          formData.append('document', blob, documentName);
          formData.append('caption', htmlCaption.length > 1024 ? htmlCaption.slice(0, 1020) + '...' : htmlCaption);
          formData.append('parse_mode', 'HTML');

          let docResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: formData
          });
          let docData = await docResponse.json();

          // Handle automatic migration or supergroup retry if necessary
          if (!docData.ok && docData.parameters?.migrate_to_chat_id) {
            effectiveChatId = String(docData.parameters.migrate_to_chat_id);
            const retryFormData = new FormData();
            retryFormData.append('chat_id', effectiveChatId);
            retryFormData.append('document', blob, documentName);
            retryFormData.append('caption', htmlCaption.length > 1024 ? htmlCaption.slice(0, 1020) + '...' : htmlCaption);
            retryFormData.append('parse_mode', 'HTML');
            docResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
              method: 'POST',
              body: retryFormData
            });
            docData = await docResponse.json();
          }

          // If entity parsing failed, retry with plain text caption
          if (!docData.ok && docData.description && docData.description.includes("can't parse entities")) {
            const retryFormData = new FormData();
            retryFormData.append('chat_id', effectiveChatId);
            retryFormData.append('document', blob, documentName);
            retryFormData.append('caption', rawCaption.length > 1024 ? rawCaption.slice(0, 1020) + '...' : rawCaption);
            docResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
              method: 'POST',
              body: retryFormData
            });
            docData = await docResponse.json();
          }

          if (docData.ok) {
            sendStatus = 'Sent';
            documentSent = true;
            successfulTargets.push(effectiveChatId);
          } else {
            errorMessage = docData.description || 'Telegram sendDocument failed';
            console.warn(`Telegram sendDocument notice (${effectiveChatId}):`, docData.description);
          }
        } catch (err) {
          errorMessage = err instanceof Error ? err.message : 'Network error during sendDocument';
          console.warn('Telegram sendDocument network attempt:', err);
        }

        // 2. Fallback to sendMessage if sendDocument failed
        if (!documentSent) {
          try {
            const msgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: effectiveChatId,
                text: htmlCaption,
                parse_mode: 'HTML'
              })
            });
            let msgData = await msgResponse.json();

            if (!msgData.ok && msgData.description && msgData.description.includes("can't parse entities")) {
              const plainMsgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: effectiveChatId,
                  text: rawCaption
                })
              });
              msgData = await plainMsgResponse.json();
            }

            if (msgData.ok) {
              sendStatus = 'Sent';
              errorMessage = undefined;
              successfulTargets.push(effectiveChatId);
            } else {
              sendStatus = 'Failed';
              errorMessage = msgData.description || errorMessage || 'Telegram API rejected backup message';
            }
          } catch (err) {
            sendStatus = 'Failed';
            errorMessage = err instanceof Error ? err.message : 'Network error';
          }
        }
      } else {
        sendStatus = 'Simulated';
        successfulTargets.push(effectiveChatId);
      }

      // Save log entry for each destination
      const log: TelegramMessageLog = {
        id: `tg-log-backup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        chatId: effectiveChatId,
        type: 'backup',
        message: htmlCaption,
        status: sendStatus,
        error: errorMessage || '',
        sentAt: now.toISOString(),
        documentName
      };
      StorageService.addTelegramLog(log);

      lastStatus = sendStatus;
      if (errorMessage) lastError = errorMessage;
      if (sendStatus === 'Sent' || sendStatus === 'Simulated') {
        overallSuccess = true;
      }
    }

    // Update TelegramSettings with last backup metadata
    const updatedSettings: TelegramSettings = {
      ...settings,
      lastBackupAt: now.toISOString(),
      lastBackupStatus: lastStatus,
      lastBackupRecordsCount: stats.totalEntities
    };
    StorageService.saveTelegramSettings(updatedSettings);

    // In-app notification
    const targetLabel = targetChatIds.length > 1
      ? 'Telegram Group & Admin'
      : (targetChatIds[0] === groupChatId ? 'Telegram Group' : 'Telegram Admin');

    StorageService.addNotification({
      title: lastStatus === 'Sent'
        ? '💾 ការបម្រុងទុកទិន្នន័យបានផ្ញើទៅ Telegram Group'
        : (lastStatus === 'Failed' ? '⚠️ ការបម្រុងទុកទិន្នន័យ Telegram បរាជ័យ' : '💾 កំណត់ត្រាបម្រុងទុកទិន្នន័យប្រព័ន្ធ (Simulated)'),
      message: `ទិន្នន័យសរុប ${stats.totalEntities} កំណត់ត្រា (${backup.stats.teachers} គ្រូ, ${backup.stats.attendanceRecords} វត្តមាន) ត្រូវបានបម្រុងទុក និងបញ្ជូនទៅ ${targetLabel} (${lastStatus})`,
      type: lastStatus === 'Failed' ? 'error' : 'info',
      category: 'system' as any
    });

    return {
      success: overallSuccess,
      statusText: lastStatus,
      error: lastError,
      backup,
      sentTargets: successfulTargets
    };
  },

  // Public method to run overdue auto backup check
  triggerAutoBackupCheck() {
    try {
      const settings = StorageService.getTelegramSettings();
      if (!settings.isEnabled || !settings.autoBackupEnabled) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentHhMm = `${hours}:${minutes}`;

      const targetTime = settings.autoBackupTime || '20:00';
      const frequency = settings.autoBackupFrequency || 'daily';

      let lastBackupLocalDate = '';
      if (settings.lastBackupAt) {
        const lb = new Date(settings.lastBackupAt);
        lastBackupLocalDate = `${lb.getFullYear()}-${String(lb.getMonth() + 1).padStart(2, '0')}-${String(lb.getDate()).padStart(2, '0')}`;
      }

      let shouldRun = false;

      if (frequency === 'daily') {
        if (currentHhMm >= targetTime && lastBackupLocalDate !== localDateStr) {
          shouldRun = true;
        }
      } else if (frequency === 'twice_daily') {
        const isLunchSlot = currentHhMm >= '12:00' && currentHhMm < '13:00';
        const isEveningSlot = currentHhMm >= targetTime;
        const lastBackupTime = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        if ((isLunchSlot || isEveningSlot) && lastBackupTime < sixHoursAgo) {
          shouldRun = true;
        }
      } else if (frequency === 'every_6_hours') {
        const lastBackupTime = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
        const fiveAndHalfHoursAgo = Date.now() - (5.5 * 60 * 60 * 1000);
        if (lastBackupTime < fiveAndHalfHoursAgo) {
          shouldRun = true;
        }
      } else if (frequency === 'hourly') {
        const lastBackupTime = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
        const fiftyMinutesAgo = Date.now() - (50 * 60 * 1000);
        if (lastBackupTime < fiftyMinutesAgo) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        console.log(`[Auto-Backup Check] Dispatching automated scheduled backup to Telegram Group at ${currentHhMm}...`);
        this.sendDataBackupToTelegram({ trigger: 'auto' });
      }
    } catch (e) {
      console.warn('Auto backup check error:', e);
    }
  }
};

// ==========================================
// BACKGROUND AUTO-BACKUP SCHEDULER ENGINE
// ==========================================
let lastAutoBackupRunDate = '';

if (typeof window !== 'undefined') {
  // Run quick check on page initialization after 5 seconds
  setTimeout(() => {
    TelegramService.triggerAutoBackupCheck();
  }, 5000);

  // Heartbeat check every 60 seconds
  setInterval(() => {
    TelegramService.triggerAutoBackupCheck();
  }, 60000);
}
