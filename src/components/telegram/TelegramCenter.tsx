import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { TelegramSettings, TelegramMessageLog } from '../../types/index.ts';
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
  MessageSquare
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

  const [activeSubTab, setActiveSubTab] = useState<'config' | 'simulator' | 'logs'>('config');
  const [settings, setSettings] = useState<TelegramSettings>(StorageService.getTelegramSettings());
  const [logs, setLogs] = useState<TelegramMessageLog[]>(StorageService.getTelegramLogs());
  const [commandInput, setCommandInput] = useState<string>('/status');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '👋 <b>EduTrack Telegram Bot Initialized</b>\nConnected to school attendance dispatch engine.\nTry typing: /status, /myschedule, or /checkin',
      time: '12:00'
    }
  ]);
  const [isTesting, setIsTesting] = useState(false);

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
        text: `✅ <b>Attendance Check-in</b>\n\n<b>Name:</b> Sok Chenda (សុខ ចិន្តា)\n<b>Department:</b> Mathematics & Science\n<b>Time:</b> 07:28\n<b>Status:</b> Present (On-time)\n<b>System:</b> EduTrack School Attendance`,
        type: 'checkin'
      });
    } else if (type === 'late') {
      result = await TelegramService.dispatchMessage({
        chatId: settings.adminChatId,
        text: `⚠️ <b>Late Arrival Alert</b>\n\n<b>Name:</b> Chann Borey (ចាន់ បូរី)\n<b>Department:</b> Languages & Humanities\n<b>Scheduled:</b> 07:30\n<b>Check-in:</b> 07:52\n<b>Late:</b> 22 minutes\n<b>System:</b> EduTrack School Attendance`,
        type: 'late'
      });
    } else if (type === 'absence') {
      result = await TelegramService.dispatchMessage({
        chatId: settings.adminChatId,
        text: `🚨 <b>Absence Alert</b>\n\n<b>Name:</b> Kim Sreypov (គីម ស្រីពៅ)\n<b>Department:</b> Mathematics & Science\n<b>Date:</b> ${new Date().toISOString().split('T')[0]}\n<b>Status:</b> No check-in detected by 08:30 deadline.\n<b>Action:</b> Contact faculty member.\n<b>System:</b> EduTrack School Attendance`,
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
                        <span className="font-bold uppercase text-[10px] tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {log.type}
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
