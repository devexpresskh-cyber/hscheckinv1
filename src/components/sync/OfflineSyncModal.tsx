import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService.ts';
import { OfflineSyncItem, SyncHistoryLog } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cloud,
  X,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<OfflineSyncItem[]>(() => StorageService.getOfflineSyncQueue());
  const [history, setHistory] = useState<SyncHistoryLog[]>(() => StorageService.getSyncHistory());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => StorageService.getLastSyncedAt());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => StorageService.isSyncing());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = StorageService.subscribeSync(() => {
      setQueue(StorageService.getOfflineSyncQueue());
      setHistory(StorageService.getSyncHistory());
      setLastSyncedAt(StorageService.getLastSyncedAt());
      setIsSyncing(StorageService.isSyncing());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    if (!isOnline) {
      showToast(
        isKhmer
          ? 'ឧបករណ៍កំពុងស្ថិតក្នុងទម្រង់ Offline! ការធ្វើសមកាលកម្មស្វ័យប្រវត្តិនឹងដំណើរការពេលមានអ៊ីនធឺណិត'
          : 'Device is offline. Changes will auto-sync once internet connection is restored.',
        'warning'
      );
      return;
    }

    try {
      const res = await StorageService.triggerOfflineSync();
      if (res.succeeded > 0) {
        showToast(
          isKhmer
            ? `បានធ្វើសមកាលកម្មដោយជោគជ័យ ${res.succeeded} ទិន្នន័យទៅកាន់ Cloud Firestore!`
            : `Successfully synchronized ${res.succeeded} change(s) to Cloud Firestore!`,
          'success'
        );
      } else if (res.failed > 0) {
        showToast(
          isKhmer
            ? `បរាជ័យក្នុងការធ្វើសមកាលកម្ម ${res.failed} ទិន្នន័យ។ ប្រព័ន្ធនឹងព្យាយាមម្តងទៀត។`
            : `Sync encountered errors on ${res.failed} item(s). Will retry automatically.`,
          'error'
        );
      } else {
        showToast(
          isKhmer
            ? 'ទិន្នន័យទាំងអស់បានធ្វើសមកាលកម្មរួចរាល់ជាមួយ Cloud Firestore!'
            : 'All data is fully synchronized with Cloud Firestore. Zero pending mutations.',
          'info'
        );
      }
    } catch {
      showToast('Sync error occurred', 'error');
    }
  };

  const handleClearHistory = () => {
    StorageService.clearSyncHistory();
    setHistory([]);
    showToast(isKhmer ? 'បានសម្អាតប្រវត្តិ Sync' : 'Cleared sync history log', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">
                  {isKhmer ? 'មជ្ឈមណ្ឌល Auto-Sync និង Cloud Storage' : 'Admin Offline Auto-Sync Center'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {isOnline ? (isKhmer ? 'ONLINE (ភ្ជាប់)' : 'ONLINE') : (isKhmer ? 'OFFLINE (គ្មានសេវា)' : 'OFFLINE')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isKhmer
                  ? 'ធ្វើសមកាលកម្មទិន្នន័យស្វ័យប្រវត្តិរវាងឧបករណ៍ និង Google Cloud Firestore'
                  : 'Automatic background replication between local offline cache & Cloud Firestore'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Dashboard Row */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{isKhmer ? 'ស្ថានភាពបណ្តាញ' : 'Network Connection'}</span>
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
            </div>
            <div className="font-bold text-slate-800 text-sm">
              {isOnline ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isKhmer ? 'ភ្ជាប់អ៊ីនធឺណិត Cloud' : 'Active Internet Link'}
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {isKhmer ? 'គ្មានអ៊ីនធឺណិត (Offline)' : 'Offline Local Mode'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isOnline
                ? (isKhmer ? 'កំពុងភ្ជាប់ផ្ទាល់ Firestore' : 'Live Firestore listeners active')
                : (isKhmer ? 'ការផ្លាស់ប្តូររក្សាទុកក្នុងម៉ាស៊ីន' : 'Saving mutations locally')}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{isKhmer ? 'ជួររង់ចាំ Sync' : 'Pending Sync Queue'}</span>
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className={`text-base font-extrabold ${queue.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {queue.length}
              </span>
              <span className="text-xs font-normal text-slate-500">
                {isKhmer ? 'ទិន្នន័យរង់ចាំ' : 'mutations waiting'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {queue.length > 0
                ? (isKhmer ? 'នឹង Sync ស្វ័យប្រវត្តិកាលណា Online' : 'Auto-replicates upon reconnect')
                : (isKhmer ? 'គ្មានទិន្នន័យរង់ចាំទេ' : 'All local changes uploaded')}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{isKhmer ? 'Sync ចុងក្រោយ' : 'Last Cloud Sync'}</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="font-bold text-slate-900 text-xs truncate">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Recently'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : 'Auto-heartbeat'}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-indigo-900">
            <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>
              {isKhmer
                ? 'ប្រព័ន្ធដំណើរការ Auto-Sync Heartbeat រៀងរាល់ ១៥វិនាទី និងភ្លាមៗពេលអ៊ីនធឺណិតមកវិញ'
                : 'Background auto-sync heartbeat active every 15s and immediately on reconnection'}
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (isKhmer ? 'កំពុង Sync...' : 'Syncing...') : (isKhmer ? 'Sync ឥឡូវនេះ' : 'Sync Now')}</span>
          </button>
        </div>

        {/* Content body: Pending Queue & Sync History Tabs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Pending Queue Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'ជួរទិន្នន័យរង់ចាំបញ្ជូន (Pending Queue)' : 'Pending Offline Sync Queue'}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                  {queue.length}
                </span>
              </h4>
            </div>

            {queue.length === 0 ? (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">{isKhmer ? 'ទិន្នន័យទាំងអស់បានធ្វើសមកាលកម្មរួចរាល់' : 'Zero Pending Offline Mutations'}</p>
                  <p className="text-emerald-700 text-[11px] mt-0.5">
                    {isKhmer
                      ? 'រាល់ការបង្កើត កែប្រែ ឬលុបគ្រូ/កាលវិភាគ ត្រូវបានផ្ញើទៅកាន់ Firestore រួចរាល់។'
                      : 'All teacher additions, profile updates, timetable changes, and deletions are saved in the cloud.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.action === 'delete'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.action === 'update'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.action}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">{item.description}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.collection}/{item.docId} • {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {isKhmer ? 'រង់ចាំផ្ញើ' : 'Queued'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync History Logs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{isKhmer ? 'ប្រវត្តិ Auto-Sync ថ្មីៗ' : 'Recent Auto-Sync Activity Log'}</span>
              </h4>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isKhmer ? 'សម្អាត' : 'Clear log'}</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {isKhmer ? 'មិនទាន់មានប្រវត្តិ Sync ទេ' : 'No sync events recorded yet'}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {history.slice(0, 20).map(log => (
                  <div key={log.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-800 block text-[11px] leading-tight">
                          {log.target}
                        </span>
                        {log.error && (
                          <span className="text-[10px] text-rose-600 block">{log.error}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono block">{log.timestamp}</span>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          log.status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education Box */}
          <div className="p-3.5 bg-slate-100 rounded-xl text-slate-600 text-[11px] leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">
                {isKhmer ? 'ការការពារទិន្នន័យពេល Offline (Offline First)' : 'Zero Data Loss Architecture'}:
              </span>{' '}
              {isKhmer
                ? 'ទោះបីជាសាលាដាច់ភ្លើង ឬគ្មានអ៊ីនធឺណិត ក៏អ្នកគ្រប់គ្រងអាចបង្កើត កែប្រែ ឬលុបគ្រូ កាលវិភាគ និងកត់វត្តមានបានដោយរលូន។ ទិន្នន័យត្រូវបានរក្សាទុកសុវត្ថិភាពក្នុងម៉ាស៊ីន និងធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិទៅ Cloud Firestore ពេលមានសេវាវិញ។'
                : 'Admins can create, edit, or delete teachers, configure schedules, and record attendance with or without internet. All operations update locally in under 1ms and synchronize automatically with Cloud Firestore when a connection is available.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {isKhmer ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
