import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { TelegramSettings, TelegramMessageLog } from '../../types/index.ts';
import confetti from 'canvas-confetti';
import {
  Send,
  Bot,
  Settings,
  Terminal,
  History,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Database,
  Download,
  Calendar,
  Layers,
  FileJson,
  Check,
  Users,
  GraduationCap,
  Building2,
  Upload
} from 'lucide-react';

export const TelegramCenter: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();

  // Guard: teacher and employee cannot access telegram settings
  if (currentUser.role === 'teacher' || currentUser.role === 'employee' || !hasPermission('telegram.view')) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Faculty instructors and support employees are not authorized to view or configure Telegram Bot settings or notification dispatch credentials.
        </p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState<'config' | 'backup' | 'simulator' | 'logs'>('config');
  const [settings, setSettings] = useState<TelegramSettings>(StorageService.getTelegramSettings());
  const [logs, setLogs] = useState<TelegramMessageLog[]>(StorageService.getTelegramLogs());
  const [commandInput, setCommandInput] = useState<string>('/status');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '👋 <b>ប្រព័ន្ធតេឡេក្រាម Bot ត្រូវបានតភ្ជាប់</b>\nភ្ជាប់ជាមួយប្រព័ន្ធបញ្ជូនដំណឹងវត្តមានរបស់សាលា Heart School។\nសាកល្បងវាយ៖ /status, /myschedule, ឬ /checkin',
      time: '12:00'
    }
  ]);
  const [isTesting, setIsTesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync settings when storage changes
  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSettings(StorageService.getTelegramSettings());
      setLogs(StorageService.getTelegramLogs());
    });
    return unsub;
  }, []);

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    const res = await TelegramService.sendDataBackupToTelegram({
      trigger: 'manual',
      targetChatId: settings.groupChatId || settings.adminChatId
    });
    setIsBackingUp(false);
    setLogs(StorageService.getTelegramLogs());
    setSettings(StorageService.getTelegramSettings());

    if (res.success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      showToast(
        res.statusText === 'Sent'
          ? 'បានបម្រុងទុកទិន្នន័យ និងផ្ញើទៅ Telegram Group ដោយជោគជ័យ!'
          : 'Database backup snapshot generated & logged (Simulated mode)',
        'success'
      );
    } else {
      showToast(`Backup error: ${res.error || res.statusText}`, 'error');
    }
  };

  const handleDownloadBackup = () => {
    const backup = StorageService.createFullDatabaseBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `EduTrack_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded local backup JSON archive', 'info');
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!confirm(`Are you sure you want to restore the database from "${file.name}"? This will synchronize all faculty, staff, schedules, and attendance records.`)) {
          if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
          return;
        }

        setIsRestoring(true);
        const res = StorageService.restoreFullDatabaseBackup(json);
        setIsRestoring(false);
        showToast(res.message, 'success');
        confetti({ particleCount: 50, spread: 60 });
      } catch (err) {
        setIsRestoring(false);
        showToast('Failed to parse backup JSON file: ' + (err instanceof Error ? err.message : 'Invalid JSON file'), 'error');
      } finally {
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveTelegramSettings(settings);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Updated Telegram Configuration',
      target: `Bot ${settings.botUsername}`,
      ipAddress: '127.0.0.1'
    });
    showToast('Telegram configuration saved successfully', 'success');
  };

  const handleTestAlert = async (type: 'checkin' | 'late' | 'absence' | 'summary') => {
    setIsTesting(true);
    let result;
    if (type === 'checkin') {
      result = await TelegramService.dispatchMessage({
        chatId: settings.groupChatId || settings.adminChatId,
        text: `✅ <b>[គ្រូបង្រៀន] វត្តមានស្កេនចូលបម្រើការ (Check-in)</b>\n\n👤 <b>ឈ្មោះ៖</b> សុខ ចិន្តា (Sok Chenda)\n🏷️ <b>តួនាទី៖</b> គ្រូបង្រៀន\n🏢 <b>ដេប៉ាតឺម៉ង់៖</b> គណិតវិទ្យា និងវិទ្យាសាស្ត្រ\n⏰ <b>ម៉ោងស្កេនចូល៖</b> 07:28\n📋 <b>វេនកំណត់៖</b> 07:30\n📊 <b>ស្ថានភាព៖</b> មានវត្តមាន (ទាន់ពេល)\n🏫 <b>សាលា៖</b> Heart School`,
        type: 'checkin'
      });
    } else if (type === 'late') {
      result = await TelegramService.dispatchMessage({
        chatId: settings.adminChatId,
        text: `⚠️ <b>[គ្រូបង្រៀន] វត្តមានមកយឺត (Late Check-in)</b>\n\n👤 <b>ឈ្មោះ៖</b> ចាន់ បូរី (Chann Borey)\n🏷️ <b>តួនាទី៖</b> គ្រូបង្រៀន\n🏢 <b>ដេប៉ាតឺម៉ង់៖</b> ភាសា និងមនុស្សសាស្ត្រ\n⏰ <b>ម៉ោងស្កេនចូល៖</b> 07:52\n📋 <b>វេនកំណត់៖</b> 07:30\n⏳ <b>យឺត៖</b> 22 នាទី\n📊 <b>ស្ថានភាព៖</b> មកយឺត\n🏫 <b>សាលា៖</b> Heart School`,
        type: 'late'
      });
    } else if (type === 'absence') {
      result = await TelegramService.dispatchMessage({
        chatId: settings.adminChatId,
        text: `🚨 <b>[គ្រូបង្រៀន] សេចក្តីជូនដំណឹងអំពីអវត្តមាន</b>\n\n👤 <b>ឈ្មោះ៖</b> គីម ស្រីពៅ (Kim Sreypov)\n🏷️ <b>តួនាទី៖</b> គ្រូបង្រៀន\n🏢 <b>ដេប៉ាតឺម៉ង់៖</b> គណិតវិទ្យា និងវិទ្យាសាស្ត្រ\n📅 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toISOString().split('T')[0]}\n⚠️ <b>ស្ថានភាព៖</b> មិនមានការស្កេនវត្តមានត្រឹមពេលកំណត់ទេ\n🏫 <b>ប្រព័ន្ធ៖</b> Heart School - ប្រព័ន្ធគ្រប់គ្រងវត្តមាន`,
        type: 'absence'
      });
    } else {
      result = await TelegramService.sendDailySummary();
    }

    setIsTesting(false);
    setLogs(StorageService.getTelegramLogs());

    if (result.success) {
      showToast(`Telegram message dispatched (${result.statusText})`, 'success');
    } else {
      showToast(`Telegram error: ${result.error || 'Failed to dispatch'}`, 'error');
    }
  };

  const handleSendCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const userMsg = commandInput;
    setCommandInput('');

    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg, time }]);

    setTimeout(() => {
      const reply = TelegramService.processBotCommand(userMsg, currentUser.personId);
      setChatHistory(prev => [...prev, { sender: 'bot', text: reply, time }]);
    }, 250);
  };

  const handleRetryMessage = async (log: TelegramMessageLog) => {
    const res = await TelegramService.dispatchMessage({
      chatId: log.chatId,
      text: log.message,
      type: log.type
    });
    setLogs(StorageService.getTelegramLogs());
    showToast(`Retry result: ${res.statusText}`, res.success ? 'success' : 'error');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-6 h-6 text-sky-500" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Telegram Bot Integration & Alerts
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ការកំណត់រចនាសម្ព័ន្ធតេឡេក្រាម ការបញ្ជូនសារដោយស្វ័យប្រវត្តិ និងការសាកល្បងបញ្ជា Bot
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'config' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Bot Config
          </button>
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'backup' ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-indigo-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Auto Data Backup</span>
            {settings.autoBackupEnabled !== false && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Auto Backup Active" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              activeSubTab === 'simulator' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-sky-500" />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => {
              setLogs(StorageService.getTelegramLogs());
              setActiveSubTab('logs');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Dispatch Log ({logs.length})
          </button>
        </div>
      </div>

      {/* Subtab 1: Bot Configuration */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Config Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">Telegram Bot Credentials</h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter your official Telegram Bot Token from @BotFather to enable real alerts.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Enable Telegram Notifications</span>
                  <span className="text-slate-500">Master switch for all automated bot dispatches</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={e => setSettings({ ...settings, isEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Telegram Bot API Token *
                </label>
                <input
                  type="text"
                  required
                  value={settings.botToken}
                  onChange={e => setSettings({ ...settings, botToken: e.target.value })}
                  placeholder="e.g. 7394819280:AAHGv82910kd982JksmDk20aL9381k"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bot Username
                  </label>
                  <input
                    type="text"
                    value={settings.botUsername}
                    onChange={e => setSettings({ ...settings, botUsername: e.target.value })}
                    placeholder="@EduTrackSchoolBot"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Admin / HR Chat ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.adminChatId}
                    onChange={e => setSettings({ ...settings, adminChatId: e.target.value })}
                    placeholder="-1002348910281"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Faculty & Staff Broadcast Group Chat ID
                </label>
                <input
                  type="text"
                  value={settings.groupChatId}
                  onChange={e => setSettings({ ...settings, groupChatId: e.target.value })}
                  placeholder="-1008923419012"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              {/* Notification Event Toggles */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-900 text-xs block mb-2">Automated Event Triggers</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyCheckIn}
                      onChange={e => setSettings({ ...settings, notifyCheckIn: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Check-in alerts</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyLate}
                      onChange={e => setSettings({ ...settings, notifyLate: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Late arrival warnings</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyAbsent}
                      onChange={e => setSettings({ ...settings, notifyAbsent: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Absence alerts to Admin</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyCheckOut}
                      onChange={e => setSettings({ ...settings, notifyCheckOut: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Check-out & working time</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyDailySummary}
                      onChange={e => setSettings({ ...settings, notifyDailySummary: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Daily summary (17:30)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyReminder}
                      onChange={e => setSettings({ ...settings, notifyReminder: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Schedule reminders</span>
                  </label>
                </div>
              </div>

              {/* Automated Data Backup Section */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      ការបម្រុងទុកទិន្នន័យស្វ័យប្រវត្ត (Automated Data Backup to Telegram)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackupEnabled !== false}
                      onChange={e => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="ml-1.5 text-xs font-bold text-indigo-900">
                      {settings.autoBackupEnabled !== false ? 'សកម្ម (Enabled)' : 'បិទ (Disabled)'}
                    </span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-khmer">
                  ប្រព័ន្ធនឹងចងក្រងទិន្នន័យគ្រូបង្រៀន បុគ្គលិក កាលវិភាគ និងកំណត់ត្រាវត្តមានទាំងអស់ជាឯកសារ JSON រួចបញ្ជូនទៅកាន់ Telegram Group ដោយស្វ័យប្រវត្ត។
                </p>

                {settings.autoBackupEnabled !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ម៉ោងបម្រុងទុក (Time)
                      </label>
                      <input
                        type="time"
                        value={settings.autoBackupTime || '20:00'}
                        onChange={e => setSettings({ ...settings, autoBackupTime: e.target.value })}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ភាពញឹកញាប់ (Frequency)
                      </label>
                      <select
                        value={settings.autoBackupFrequency || 'daily'}
                        onChange={e => setSettings({ ...settings, autoBackupFrequency: e.target.value as any })}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value="daily">រៀងរាល់ថ្ងៃ (Daily once)</option>
                        <option value="twice_daily">ពីរដងក្នុងមួយថ្ងៃ (12:00 & 20:00)</option>
                        <option value="hourly">រៀងរាល់មួយម៉ោង (Hourly)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        គោលដៅបញ្ជូន (Target)
                      </label>
                      <select
                        value={settings.autoBackupTarget || 'group'}
                        onChange={e => setSettings({ ...settings, autoBackupTarget: e.target.value as any })}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value="group">Telegram Group ({settings.groupChatId || 'Not set'})</option>
                        <option value="admin">Admin Chat ({settings.adminChatId || 'Not set'})</option>
                        <option value="both">Both Group & Admin</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {hasPermission('telegram.configure') && (
                <div className="pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all active:scale-95"
                  >
                    Save Settings
                  </button>
                </div>
              )}

            </form>
          </div>

          {/* Alert Preview & Test Dispatcher */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Live Alert Dispatcher</h3>
              <p className="text-xs text-slate-500 mb-4">
                Test real or simulated delivery to verify alert templates.
              </p>

              <div className="space-y-2.5">
                {/* Instant Backup to Telegram Button */}
                <button
                  type="button"
                  onClick={handleTriggerBackup}
                  disabled={isBackingUp}
                  className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-left transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Backup Now to Telegram</span>
                      <span className="text-[10px] text-indigo-700 font-khmer block">
                        {settings.lastBackupAt
                          ? `ចុងក្រោយ៖ ${new Date(settings.lastBackupAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${settings.lastBackupStatus || 'Sent'})`
                          : 'បញ្ជូនទិន្នន័យបម្រុងទុក JSON ទៅ Telegram'}
                      </span>
                    </div>
                  </div>
                  {isBackingUp ? (
                    <RotateCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => handleTestAlert('checkin')}
                  disabled={isTesting}
                  className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs block">Test Check-in Notification</span>
                    <span className="text-[10px] text-emerald-700">Present (On-time) format</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                </button>

                <button
                  onClick={() => handleTestAlert('late')}
                  disabled={isTesting}
                  className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs block">Test Late Arrival Alert</span>
                    <span className="text-[10px] text-amber-700">Scheduled vs Actual Check-in</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-amber-600" />
                </button>

                <button
                  onClick={() => handleTestAlert('absence')}
                  disabled={isTesting}
                  className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs block">Test Absence Alert</span>
                    <span className="text-[10px] text-rose-700">No check-in detected</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-rose-600" />
                </button>

                <button
                  onClick={() => handleTestAlert('summary')}
                  disabled={isTesting}
                  className="w-full p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs block">Test Daily Attendance Summary</span>
                    <span className="text-[10px] text-sky-700">Full school headcount statistics</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-sky-600" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6 text-xs text-slate-500">
              <span>Status: <b>{settings.isEnabled ? 'Active Bot' : 'Disabled'}</b></span>
            </div>
          </div>

        </div>
      )}

      {/* Subtab: Auto Data Backup Dashboard */}
      {activeSubTab === 'backup' && (() => {
        const fullBackup = StorageService.createFullDatabaseBackup();
        const { stats } = fullBackup;
        const backupLogs = logs.filter(l => l.type === 'backup');

        return (
          <div className="space-y-6">
            
            {/* Hero Card: Status & Actions */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      <Database className="w-5 h-5" />
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                      settings.autoBackupEnabled !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {settings.autoBackupEnabled !== false ? '● Auto-Backup Active' : '○ Auto-Backup Paused'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Automated Cloud Data Backup to Telegram Group
                  </h3>

                  <p className="text-xs text-indigo-200/90 font-khmer leading-relaxed">
                    ប្រព័ន្ធដំណើរការចងក្រងទិន្នន័យគ្រូបង្រៀន បុគ្គលិក កាលវិភាគបង្រៀន និងកំណត់ត្រាវត្តមានទាំងអស់ជាឯកសារ JSON រួចបញ្ជូនទៅកាន់ Telegram Group តាមកាលវិភាគកំណត់ដោយស្វ័យប្រវត្ត។
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-indigo-200">
                    <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-indigo-300" />
                      <span>ម៉ោងកំណត់៖ <b>{settings.autoBackupTime || '20:00'}</b> ({settings.autoBackupFrequency || 'daily'})</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
                      <Send className="w-3.5 h-3.5 text-sky-300" />
                      <span>គោលដៅ៖ <b>{settings.groupChatId ? `Group (${settings.groupChatId})` : 'Admin Chat'}</b></span>
                    </span>
                    {settings.lastBackupAt && (
                      <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded-xl border border-emerald-400/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>បម្រុងទុកចុងក្រោយ៖ <b>{new Date(settings.lastBackupAt).toLocaleString()}</b></span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerBackup}
                    disabled={isBackingUp}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isBackingUp ? 'កំពុងចងក្រង & បញ្ជូន...' : 'Backup & Send to Telegram Group Now'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => restoreFileInputRef.current?.click()}
                      disabled={isRestoring}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-indigo-100 font-bold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isRestoring ? 'Restoring...' : 'Restore JSON'}</span>
                    </button>
                    <input
                      ref={restoreFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleRestoreFileSelected}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scope Stats Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>ទិន្នន័យក្នុងប្រព័ន្ធដែលត្រូវបម្រុងទុក (Current Database Snapshot Scope)</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Total: {stats.totalEntities} entities
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">គ្រូបង្រៀន</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{stats.teachers}</span>
                    <span className="text-[10px] text-slate-400">teachers</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">បុគ្គលិកទូទៅ</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{stats.employees}</span>
                    <span className="text-[10px] text-slate-400">staff</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">កាលវិភាគបង្រៀន</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-indigo-700">{stats.subjectSchedules}</span>
                    <span className="text-[10px] text-slate-400">classes</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">កំណត់ត្រាវត្តមាន</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-emerald-700">{stats.attendanceRecords}</span>
                    <span className="text-[10px] text-slate-400">logs</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">ច្បាប់ឈប់សម្រាក</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-purple-700">{stats.leaveRequests}</span>
                    <span className="text-[10px] text-slate-400">leaves</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">ថ្ងៃឈប់សម្រាក</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-amber-700">{stats.holidays}</span>
                    <span className="text-[10px] text-slate-400">holidays</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduler Configuration & Settings Form */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-700" />
                <span>ការកំណត់កាលវិភាគបម្រុងទុកស្វ័យប្រវត្ត (Automated Backup Configuration)</span>
              </h3>
              <p className="text-xs text-slate-500 mb-5 font-khmer">
                កំណត់ម៉ោងបញ្ជូន ភាពញឹកញាប់ និងក្រុមតេឡេក្រាមដែលត្រូវទទួលឯកសារបម្រុងទុក។
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">បើកដំណើរការបម្រុងទុកស្វ័យប្រវត្ត (Enable Auto-Backup)</span>
                    <span className="text-[11px] text-slate-500 font-khmer">ដំណើរការស្វ័យប្រវត្តរាល់ពេលកំណត់តាមពេលវេលាដែលបានជ្រើសរើស</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoBackupEnabled !== false}
                    onChange={e => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ម៉ោងបម្រុងទុកស្វ័យប្រវត្ត (Time of Day) *
                    </label>
                    <input
                      type="time"
                      value={settings.autoBackupTime || '20:00'}
                      onChange={e => setSettings({ ...settings, autoBackupTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">ម៉ោងលំនាំដើម៖ 20:00 (8:00 PM)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ភាពញឹកញាប់នៃការបញ្ជូន (Frequency)
                    </label>
                    <select
                      value={settings.autoBackupFrequency || 'daily'}
                      onChange={e => setSettings({ ...settings, autoBackupFrequency: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                    >
                      <option value="daily">រៀងរាល់ថ្ងៃម្តង (Daily once at specified time)</option>
                      <option value="twice_daily">ពីរដងក្នុងមួយថ្ងៃ (12:00 PM & Specified Time)</option>
                      <option value="every_6_hours">រៀងរាល់ ៦ ម៉ោងម្តង (Every 6 Hours)</option>
                      <option value="hourly">រៀងរាល់មួយម៉ោងម្តង (Hourly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      គោលដៅទទួលឯកសារ (Dispatch Destination)
                    </label>
                    <select
                      value={settings.autoBackupTarget || 'group'}
                      onChange={e => setSettings({ ...settings, autoBackupTarget: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                    >
                      <option value="group">Telegram Group ({settings.groupChatId || 'Not set'})</option>
                      <option value="admin">Admin Chat ({settings.adminChatId || 'Not set'})</option>
                      <option value="both">Both Group & Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Faculty & Backup Telegram Group Chat ID *</span>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">Group ID</span>
                    </label>
                    <input
                      type="text"
                      value={settings.groupChatId || ''}
                      onChange={e => setSettings({ ...settings, groupChatId: e.target.value })}
                      placeholder="e.g. -1005171679529 or -5171679529"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      អត្តសញ្ញាណក្រុមតេឡេក្រាម (Group Chat ID) សម្រាប់ទទួលទិន្នន័យបម្រុងទុក JSON
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Admin / HR Direct Chat ID</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">Admin ID</span>
                    </label>
                    <input
                      type="text"
                      value={settings.adminChatId || ''}
                      onChange={e => setSettings({ ...settings, adminChatId: e.target.value })}
                      placeholder="e.g. -5252354054"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      អត្តសញ្ញាណគណនី Admin ឬ Channel សម្រាប់ទទួលការជូនដំណឹងផ្ទាល់
                    </span>
                  </div>
                </div>

                {/* Setup Guide Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      របៀបភ្ជាប់ Telegram Group ដើម្បីទទួលទិន្នន័យបម្រុងទុក (How to setup Telegram Group):
                    </span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 font-khmer pl-1">
                    <li>បង្កើត ឬបើក Telegram Group របស់សាលា ឬគណៈគ្រប់គ្រង។</li>
                    <li>បន្ថែម Telegram Bot <b>{settings.botUsername || '@hschoolsiamreap_bot'}</b> ចូលទៅក្នុង Telegram Group។</li>
                    <li>តម្លើងសិទ្ធិ Bot ជា <b>Administrator</b> (បើកសិទ្ធិ Send Messages & Send Media/Files)។</li>
                    <li>ចម្លង Chat ID របស់ Group (ឧ. <code>{settings.groupChatId || '-5171679529'}</code>) ដាក់ក្នុងប្រអប់ខាងលើ រួចចុច Save។</li>
                    <li>ចុចប៊ូតុង <b>"Backup & Send to Telegram Group Now"</b> ដើម្បីសាកល្បងបញ្ជូនឯកសារ JSON ភ្លាមៗ!</li>
                  </ol>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    Save Auto-Backup Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerBackup}
                    disabled={isBackingUp}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {isBackingUp ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-indigo-600" />}
                    <span>Test Backup Dispatch</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Telegram Backup Dispatch Logs */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">ប្រវត្តិបញ្ជូនឯកសារបម្រុងទុក (Backup Dispatch Logs)</h3>
                  <span className="text-[11px] text-slate-500">កំណត់ត្រាការបញ្ជូនទិន្នន័យទៅកាន់ Telegram Group</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogs(StorageService.getTelegramLogs())}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">កាលបរិច្ឆេទ & ម៉ោង</th>
                      <th className="py-3 px-4">ឈ្មោះឯកសារ</th>
                      <th className="py-3 px-4">Chat ID ទទួល</th>
                      <th className="py-3 px-4">ស្ថានភាព</th>
                      <th className="py-3 px-4">សេចក្តីលម្អិត</th>
                      <th className="py-3 px-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {backupLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-khmer">
                          មិនទាន់មានកំណត់ត្រាការបញ្ជូនឯកសារបម្រុងទុកនៅឡើយទេ។ ចុចប៊ូតុង "Backup & Send to Telegram Now" ដើម្បីសាកល្បង។
                        </td>
                      </tr>
                    ) : (
                      backupLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {log.sentAt.replace('T', ' ').slice(0, 19)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700 text-[11px]">
                            {log.documentName || 'EduTrack_Backup.json'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">{log.chatId}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.status === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : log.status === 'Simulated'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {log.status === 'Sent' ? '✅ Sent to Telegram' : log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 truncate max-w-xs font-mono">
                            {log.message.replace(/<[^>]*>?/gm, ' ').slice(0, 80)}...
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(log)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              Re-send
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* Subtab 2: Interactive Bot Command Simulator */}
      {activeSubTab === 'simulator' && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-800 max-w-2xl mx-auto space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">{settings.botUsername || '@EduTrackSchoolBot'}</h4>
                <p className="text-[10px] text-emerald-400 font-mono">● bot active</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Chatting as: <b>{currentUser.fullName}</b></span>
            </div>
          </div>

          {/* Quick command buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['/status', '/myschedule', '/myattendance', '/checkin', '/checkout', '/help'].map(cmd => (
              <button
                key={cmd}
                onClick={() => {
                  setCommandInput(cmd);
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[11px] border border-slate-700 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div className="h-80 overflow-y-auto space-y-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 font-sans">
            {chatHistory.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    m.sender === 'user'
                      ? 'bg-sky-600 text-white font-mono font-semibold'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 leading-relaxed'
                  }`}
                  dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }}
                />
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Command Input Bar */}
          <form onSubmit={handleSendCommand} className="flex items-center gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              placeholder="Type /status or /myschedule..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-md transition-colors"
            >
              Send
            </button>
          </form>

        </div>
      )}

      {/* Subtab 3: Dispatch Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Telegram Bot Dispatch History</h3>
            <button
              onClick={() => setLogs(StorageService.getTelegramLogs())}
              className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Target Chat ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Message Content</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No Telegram messages dispatched yet.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.sentAt.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded border ${
                          log.type === 'backup'
                            ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                            : 'text-sky-800 bg-sky-50 border-sky-200'
                        }`}>
                          {log.type === 'backup' ? '💾 Backup' : log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">{log.chatId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.status === 'Sent'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : log.status === 'Simulated'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 truncate max-w-xs font-mono">
                        {log.message.replace(/<[^>]*>?/gm, ' ').slice(0, 80)}...
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRetryMessage(log)}
                          className="text-[11px] text-sky-600 hover:text-sky-800 font-bold"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
