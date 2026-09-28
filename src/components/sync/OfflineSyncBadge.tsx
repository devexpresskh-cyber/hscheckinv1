import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService.ts';
import { OfflineSyncModal } from './OfflineSyncModal.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';

interface OfflineSyncBadgeProps {
  className?: string;
  variant?: 'compact' | 'pill' | 'button';
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  className = '',
  variant = 'pill'
}) => {
  const { isKhmer } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState<number>(() => StorageService.getOfflineSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(() => StorageService.isSyncing());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = StorageService.subscribeSync(() => {
      setQueueCount(StorageService.getOfflineSyncQueue().length);
      setIsSyncing(StorageService.isSyncing());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            !isOnline
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : queueCount > 0
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          } ${className}`}
          title={
            !isOnline
              ? (isKhmer ? 'កំពុងដំណើរការ Offline (ចុចដើម្បីមើលជួរ Sync)' : 'Offline mode active (Click to view sync queue)')
              : (isKhmer ? 'ភ្ជាប់ Firestore រួចរាល់' : 'Cloud Firestore synced')
          }
        >
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          ) : !isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-600" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-600" />
          )}

          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold ring-2 ring-white">
              {queueCount}
            </span>
          )}
        </button>

        <OfflineSyncModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-2xs cursor-pointer ${
          !isOnline
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
            : queueCount > 0
            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
            : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 border-emerald-200'
        } ${className}`}
        title={isKhmer ? 'ចុចដើម្បីពិនិត្យស្ថានភាព Cloud Auto-Sync' : 'Click to manage offline sync queue'}
      >
        <div className="flex items-center gap-1.5">
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
          ) : !isOnline ? (
            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          )}

          <span className="font-bold text-[11px]">
            {!isOnline
              ? (isKhmer ? 'Offline (ក្នុងម៉ាស៊ីន)' : 'Offline Mode')
              : isSyncing
              ? (isKhmer ? 'កំពុង Sync...' : 'Syncing...')
              : (isKhmer ? 'Cloud Synced' : 'Cloud Synced')}
          </span>
        </div>

        {queueCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            <Database className="w-2.5 h-2.5" />
            <span>{queueCount} {isKhmer ? 'រង់ចាំ' : 'queued'}</span>
          </span>
        ) : (
          <span className="hidden sm:inline-block text-[10px] text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded font-mono font-semibold">
            Auto
          </span>
        )}
      </button>

      <OfflineSyncModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
