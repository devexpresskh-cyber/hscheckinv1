import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { TelegramSettings, TelegramMessageLog } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
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
  Upload,
  Trash2,
  RotateCcw,
  X,
  AlertOctagon,
  Loader2,
  KeyRound,
  BellOff
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

  const { isKhmer, t } = useLanguage();
  const isAdmin = currentUser.role === 'admin_hr' || currentUser.role === 'super_admin' || hasPermission('telegram.configure');

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

  // Clear Telegram Integration & Alerts modal states
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearOption, setClearOption] = useState<'all' | 'credentials' | 'logs' | 'default'>('all');
  const [isClearingAction, setIsClearingAction] = useState(false);

  const handleExecuteClear = async () => {
    if (!isAdmin) {
      showToast('You do not have permission to clear Telegram configuration', 'error');
      return;
    }

    setIsClearingAction(true);
    try {
      if (clearOption === 'logs') {
        const deleted = await StorageService.clearTelegramLogs();
        setLogs([]);
        StorageService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'CLEARED_TELEGRAM_LOGS',
          target: `${deleted} dispatch logs deleted`,
          ipAddress: '127.0.0.1'
        });
        showToast(
          isKhmer
            ? `បានសម្អាតប្រវត្តិសារ Telegram ចំនួន ${deleted} ដោយជោគជ័យ!`
            : `Successfully cleared ${deleted} Telegram dispatch logs!`,
          'success'
        );
      } else if (clearOption === 'credentials') {
        StorageService.clearTelegramSettings();
        setSettings(StorageService.getTelegramSettings());
        StorageService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'CLEARED_TELEGRAM_CREDENTIALS',
          target: 'Telegram Bot Token & Chat IDs cleared',
          ipAddress: '127.0.0.1'
        });
        showToast(
          isKhmer
            ? 'បានសម្អាតព័ត៌មាន Bot Token និង Chat IDs រួចរាល់។ ការជូនដំណឹងត្រូវបានបិទ!'
            : 'Telegram Bot credentials cleared and notifications disabled!',
          'success'
        );
      } else if (clearOption === 'default') {
        StorageService.resetTelegramSettingsToDefault();
        setSettings(StorageService.getTelegramSettings());
        StorageService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'RESET_TELEGRAM_SETTINGS',
          target: 'Telegram configuration reset to demo defaults',
          ipAddress: '127.0.0.1'
        });
        showToast(
          isKhmer
            ? 'បានកំណត់ការកំណត់រចនាសម្ព័ន្ធ Telegram ទៅទម្រង់ដើម Demo រួចរាល់!'
            : 'Telegram configuration reset to default demo settings!',
          'success'
        );
      } else if (clearOption === 'all') {
        const { logsDeleted } = await StorageService.clearAllTelegramIntegrationAndAlerts();
        setSettings(StorageService.getTelegramSettings());
        setLogs([]);
        setChatHistory([
          {
            sender: 'bot',
            text: isKhmer
              ? '👋 <b>ប្រព័ន្ធតេឡេក្រាម Bot ត្រូវបានសម្អាតឡើងវិញ</b>\nព័ត៌មាន Bot និងប្រវត្តិសារទាំងអស់ត្រូវបានជម្រះរួចរាល់។'
              : '👋 <b>Telegram Bot Integration Cleared</b>\nCredentials and dispatch logs have been wiped clean.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        StorageService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'CLEARED_TELEGRAM_FULL',
          target: `Full Telegram wipe (${logsDeleted} logs, credentials cleared)`,
          ipAddress: '127.0.0.1'
        });
        confetti({ particleCount: 40, spread: 50 });
        showToast(
          isKhmer
            ? `បានសម្អាតការតភ្ជាប់ Telegram & Alerts ទាំងអស់ទាំងស្រុង (លុប ${logsDeleted} កំណត់ត្រាសារ)!`
            : `Telegram Bot Integration & Alerts completely cleared (${logsDeleted} logs deleted)!`,
          'success'
        );
      }
      setIsClearModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to clear: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsClearingAction(false);
    }
  };

  const handleDirectClearLogs = async () => {
    if (!isAdmin) return;
    if (!confirm(isKhmer ? 'តើអ្នកប្រាកដថាចង់សម្អាតប្រវត្តិសារ Telegram ទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។' : 'Are you sure you want to delete all Telegram dispatch logs? This cannot be undone.')) {
      return;
    }
    setIsClearingAction(true);
    const count = await StorageService.clearTelegramLogs();
    setIsClearingAction(false);
    setLogs([]);
    showToast(isKhmer ? `បានសម្អាតប្រវត្តិសារចំនួន ${count} រួចរាល់!` : `Cleared ${count} Telegram logs!`, 'success');
  };

  const handleDirectClearCredentials = () => {
    if (!isAdmin) return;
    if (!confirm(isKhmer ? 'តើអ្នកពិតជាចង់សម្អាត Token និងព័ត៌មានសម្ងាត់ Telegram Bot ទាំងអស់មែនទេ?' : 'Are you sure you want to clear all Telegram Bot credentials and disable alerts?')) {
      return;
    }
    StorageService.clearTelegramSettings();
    setSettings(StorageService.getTelegramSettings());
    showToast(isKhmer ? 'បានសម្អាត Token និងព័ត៌មាន Bot រួចរាល់!' : 'Telegram bot credentials cleared!', 'success');
  };

  const handleDirectResetDefault = () => {
    if (!isAdmin) return;
    if (!confirm(isKhmer ? 'កំណត់ការកំណត់ Telegram ឡើងវិញទៅទម្រង់ដើម Demo?' : 'Reset Telegram settings to default demo configuration?')) {
      return;
    }
    StorageService.resetTelegramSettingsToDefault();
    setSettings(StorageService.getTelegramSettings());
    showToast(isKhmer ? 'បានកំណត់ទៅទម្រង់ដើម Demo រួចរាល់!' : 'Reset to default configuration!', 'success');
  };

  const handleDirectClearChat = () => {
    setChatHistory([
      {
        sender: 'bot',
        text: isKhmer
          ? '👋 <b>ប្រព័ន្ធតេឡេក្រាម Bot ត្រូវបានតភ្ជាប់</b>\nភ្ជាប់ជាមួយប្រព័ន្ធបញ្ជូនដំណឹងវត្តមានរបស់សាលា Heart School។\nសាកល្បងវាយ៖ /status, /myschedule, ឬ /checkin'
          : '👋 <b>Telegram Bot Connected</b>\nHeart School Attendance Bot Simulator.\nTry typing: /status, /myschedule, or /checkin',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    showToast(isKhmer ? 'បានសម្អាតការសន្ទនាសាកល្បង' : 'Simulator chat history cleared', 'info');
  };

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

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Admin Clear Telegram Integration & Alerts Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setClearOption('all');
                setIsClearModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title={isKhmer ? 'សម្អាតការតភ្ជាប់ Telegram & Alerts' : 'Clear Telegram Integration & Alerts'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline font-khmer">
                {isKhmer ? 'សម្អាត Telegram & Alerts' : 'Clear Integration & Alerts'}
              </span>
              <span className="sm:hidden font-khmer">{isKhmer ? 'សម្អាត' : 'Clear'}</span>
            </button>
          )}
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
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      Save Settings
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleDirectResetDefault}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title={isKhmer ? 'កំណត់ឡើងវិញទៅទម្រង់ដើម' : 'Reset to factory demo defaults'}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isKhmer ? 'ទម្រង់ដើម Demo' : 'Reset Defaults'}</span>
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDirectClearCredentials}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
                        title={isKhmer ? 'សម្អាត Token និងព័ត៌មាន Bot' : 'Clear credentials & disable alerts'}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isKhmer ? 'សម្អាត Token' : 'Clear Bot Token'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClearOption('all');
                          setIsClearModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                        title={isKhmer ? 'សម្អាត Telegram & Alerts ទាំងអស់' : 'Clear all Telegram integration and alerts'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{isKhmer ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
                      </button>
                    </div>
                  )}
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

          {/* Admin Management & Danger Zone */}
          {isAdmin && (
            <div className="lg:col-span-3 bg-gradient-to-r from-rose-50/60 via-slate-50 to-amber-50/50 rounded-3xl p-5 sm:p-6 border border-rose-200/70 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                      <span>{isKhmer ? 'តំបន់គ្រប់គ្រងការសម្អាត Telegram Bot & Alerts' : 'Administrative Telegram Reset & Danger Zone'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Admin Only</span>
                    </h4>
                    <p className="text-xs text-slate-600 font-khmer mt-1 max-w-2xl leading-relaxed">
                      {isKhmer
                        ? 'អ្នកគ្រប់គ្រងអាចសម្អាត Bot Token, បិទការជូនដំណឹងទាំងអស់ភ្លាមៗ ឬលុបប្រវត្តិសារ (Logs) ដែលបានផ្ញើចេញពី Cloud Database និងកម្មវិធីដោយសុវត្ថិភាព។'
                        : 'Administrators can clear Telegram Bot credentials, disable automated alert triggers, or wipe dispatch history logs from both local storage and the cloud database.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                      <span>Token: <b>{settings.botToken ? 'Configured' : 'Empty'}</b></span>
                      <span>•</span>
                      <span>Target: <b>{settings.groupChatId || settings.adminChatId || 'Not set'}</b></span>
                      <span>•</span>
                      <span>Alerts: <b className={settings.isEnabled ? 'text-emerald-600' : 'text-slate-400'}>{settings.isEnabled ? 'Active' : 'Disabled'}</b></span>
                      <span>•</span>
                      <span>Dispatch Logs: <b>{logs.length}</b></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setClearOption('logs');
                      setIsClearModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isKhmer ? 'សម្អាត Logs' : 'Purge Logs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClearOption('all');
                      setIsClearModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="font-khmer">{isKhmer ? 'សម្អាត Telegram & Alerts' : 'Clear Integration & Alerts'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectClearChat}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer"
                title={isKhmer ? 'សម្អាតការសន្ទនា' : 'Clear simulator chat history'}
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>{isKhmer ? 'សម្អាតឆាត' : 'Clear Chat'}</span>
              </button>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Chatting as: <b>{currentUser.fullName}</b></span>
              </div>
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
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Telegram Bot Dispatch History</h3>
              <p className="text-[11px] text-slate-500 font-khmer">
                {isKhmer ? 'ប្រវត្តិនៃការបញ្ជូនសារ និងការជូនដំណឹងទៅកាន់ Telegram' : 'History of automated notifications and alerts sent to Telegram'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleDirectClearLogs}
                  disabled={isClearingAction}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  title={isKhmer ? 'សម្អាតប្រវត្តិសារទាំងអស់' : 'Delete all dispatch logs'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isKhmer ? 'សម្អាត Logs' : 'Clear Dispatch Logs'}</span>
                </button>
              )}
              <button
                onClick={() => setLogs(StorageService.getTelegramLogs())}
                className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold px-3 py-1.5 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
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

      {/* Clear Telegram Integration & Alerts Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {isKhmer ? 'សម្អាតការតភ្ជាប់ Telegram Bot & Alerts' : 'Clear Telegram Integration & Alerts'}
                    </h3>
                    <p className="text-xs text-slate-500 font-khmer mt-0.5">
                      {isKhmer
                        ? 'ជ្រើសរើសជម្រើសសម្អាតព័ត៌មាន Bot, បិទការជូនដំណឹង ឬលុបប្រវត្តិសារ'
                        : 'Choose the scope of credentials and alert data you wish to reset or purge.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isClearingAction && setIsClearModalOpen(false)}
                  disabled={isClearingAction}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scope Selection */}
            <div className="p-6 overflow-y-auto space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                {isKhmer ? 'សូមជ្រើសរើសវិសាលភាពនៃការសម្អាត (Select Clear Action):' : 'Select Reset & Clear Scope:'}
              </label>

              <div className="space-y-2.5">
                {/* Option 1: Full Wipe */}
                <div
                  onClick={() => setClearOption('all')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    clearOption === 'all'
                      ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={clearOption === 'all'}
                      onChange={() => setClearOption('all')}
                      className="mt-1 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          {isKhmer ? 'សម្អាតទាំងអស់ទាំងស្រុង (Full Wipe - Recommended for Reset)' : 'Clear All (Credentials, Alerts & Logs)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {isKhmer ? 'ទូទៅ' : 'Full Reset'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-khmer mt-1 leading-relaxed">
                        {isKhmer
                          ? `លុប Token, Chat ID, បិទការជូនដំណឹងទាំងអស់ និងលុបប្រវត្តិសារចំនួន ${logs.length} កំណត់ត្រាចេញពី Cloud Database និងកម្មវិធីទាំងស្រុង។`
                          : `Completely erases Bot Token, Chat IDs, disables all alert triggers (check-in, check-out, late, absent, backups) and purges all ${logs.length} dispatch logs.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Credentials & Alerts Only */}
                <div
                  onClick={() => setClearOption('credentials')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    clearOption === 'credentials'
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={clearOption === 'credentials'}
                      onChange={() => setClearOption('credentials')}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {isKhmer ? 'សម្អាតតែ Token & បិទការជូនដំណឹង (Credentials & Alerts Only)' : 'Clear Bot Credentials & Disable Alerts'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-khmer mt-1 leading-relaxed">
                        {isKhmer
                          ? 'លុប Bot Token, Bot Username, Group Chat ID, Admin Chat ID និងបិទ Alerts ទាំងអស់ ប៉ុន្តែរក្សាទុកប្រវត្តិសារ (Logs) សម្រាប់ពិនិត្យ។'
                          : 'Clears Telegram token, username, group ID, and stops all alerts. Preserves dispatch logs for historical reference.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 3: Logs Only */}
                <div
                  onClick={() => setClearOption('logs')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    clearOption === 'logs'
                      ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={clearOption === 'logs'}
                      onChange={() => setClearOption('logs')}
                      className="mt-1 text-sky-600 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {isKhmer ? 'សម្អាតតែប្រវត្តិសារដែលបានផ្ញើ (Purge Dispatch Logs Only)' : 'Purge Dispatch Logs History Only'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                          {logs.length} {isKhmer ? 'កំណត់ត្រា' : 'records'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-khmer mt-1 leading-relaxed">
                        {isKhmer
                          ? `លុបប្រវត្តិសារចំនួន ${logs.length} ចេញពី Firestore និង Local Storage។ ការតភ្ជាប់ Bot Token និងការកំណត់ជូនដំណឹងនៅតែរក្សាដដែល។`
                          : `Deletes all ${logs.length} historical dispatch log entries. Keeps Bot Token and alert configuration active.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 4: Reset to Demo Defaults */}
                <div
                  onClick={() => setClearOption('default')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    clearOption === 'default'
                      ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={clearOption === 'default'}
                      onChange={() => setClearOption('default')}
                      className="mt-1 text-slate-700 focus:ring-slate-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {isKhmer ? 'កំណត់ឡើងវិញទៅទម្រង់ដើម Demo (Reset to Factory Defaults)' : 'Reset to Default Factory / Demo Settings'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-khmer mt-1 leading-relaxed">
                        {isKhmer
                          ? 'កំណត់ Bot Token និង Chat IDs ទៅកាន់គំរូ Demo សាលា Heart School (@EduTrackSchoolBot) ជាមួយការជូនដំណឹងស្តង់ដារ។'
                          : 'Re-applies default demo bot configuration with demo token, default group and standard alert schedule.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Review Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isKhmer ? 'ស្ថានភាព Bot បច្ចុប្បន្ន៖' : 'Current Bot Status:'}</span>
                  <span className={`font-bold ${settings.isEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {settings.isEnabled ? '● Active' : '○ Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isKhmer ? 'ចំនួនប្រវត្តិសារក្នុង Database៖' : 'Logs in Database:'}</span>
                  <span className="font-mono font-bold text-slate-800">{logs.length} entries</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isKhmer ? 'អនុវត្តដោយអ្នកគ្រប់គ្រង៖' : 'Admin Operator:'}</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    {currentUser.fullName} ({currentUser.role})
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearingAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isKhmer ? 'បោះបង់' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={isClearingAction}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isClearingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isKhmer ? 'កំពុងសម្អាត...' : 'Clearing...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {clearOption === 'all'
                        ? (isKhmer ? 'យល់ព្រមសម្អាតទាំងអស់' : 'Execute Full Clear')
                        : clearOption === 'credentials'
                        ? (isKhmer ? 'សម្អាត Token & Alerts' : 'Clear Credentials')
                        : clearOption === 'logs'
                        ? (isKhmer ? 'សម្អាតកំណត់ត្រា Logs' : 'Purge All Logs')
                        : (isKhmer ? 'កំណត់ទៅទម្រង់ដើម' : 'Reset to Defaults')}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
