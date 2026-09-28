import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { isKhmer } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl border border-slate-700 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        {isKhmer
          ? 'ដំណើរការ Offline — កំពុងប្រើប្រាស់ទិន្នន័យក្នុងឧបករណ៍'
          : 'Offline Mode — Operating on cached local data'}
      </span>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span>{isKhmer ? 'ផ្ទុកឡើងវិញ' : 'Retry'}</span>
      </button>
    </div>
  );
};
