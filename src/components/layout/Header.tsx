import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { StorageService } from '../../services/storageService.ts';
import {
  Bell,
  Clock,
  Sparkles,
  Smartphone,
  ChevronDown,
  Building2,
  Menu,
  Languages,
  BookOpen,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileKiosk: () => void;
  isMobileKioskOpen: boolean;
  onOpenTelegram: () => void;
  onToggleMobileMenu?: () => void;
  onOpenManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileKiosk,
  isMobileKioskOpen,
  onOpenTelegram,
  onToggleMobileMenu,
  onOpenManual
}) => {
  const { currentUser, currentRole, hasPermission, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, showToast } = useNotification();
  const { language, toggleLanguage, t, isKhmer } = useLanguage();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const systemSettings = StorageService.getSystemSettings();
  const telegramSettings = StorageService.getTelegramSettings();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(isKhmer ? 'km-KH' : 'en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      setDateStr(
        now.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isKhmer]);

  const handleRunAbsenceScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const result = AttendanceEngine.runAbsenceDetector();
      setIsScanning(false);
      if (result.absencesMarked > 0 || result.missingCheckoutsMarked > 0) {
        showToast(
          isKhmer
            ? `បានស្កេនចប់៖ បានសម្គាល់ ${result.absencesMarked} អវត្តមាន, កែសម្រួល ${result.missingCheckoutsMarked} ខកខានស្កេនចេញ`
            : `Scan complete: ${result.absencesMarked} absence(s) flagged, ${result.missingCheckoutsMarked} missing checkout(s) updated`,
          'warning'
        );
      } else {
        showToast(
          isKhmer
            ? 'ការត្រួតពិនិត្យបានបញ្ចប់៖ គ្រូ និងបុគ្គលិកទាំងអស់មានវត្តមានត្រឹមត្រូវ'
            : 'Absence detector check complete. All scheduled staff are accounted for.',
          'success'
        );
      }
    }, 600);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 h-16 max-w-full">
        
        {/* Left: Mobile Menu Button & Organization Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Hamburger toggle on mobile */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold text-slate-900 text-xs sm:text-base leading-tight truncate">
                {isKhmer ? systemSettings.khmerOrgName : systemSettings.organizationName}
              </h1>
              <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                School MIS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
              {isKhmer
                ? `${systemSettings.organizationName} • ប្រព័ន្ធកត់ត្រាវត្តមាន និងកាលវិភាគ`
                : `${systemSettings.khmerOrgName} • Faculty Attendance & Scheduling`}
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock (hidden on smaller devices to avoid crowding) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-700 shrink-0 mx-2">
          <Clock className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
          <span className="font-mono font-semibold text-sm tracking-wide text-slate-900">{timeStr}</span>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-medium text-slate-500">{dateStr}</span>
        </div>

        {/* Right: Actions, Language Switcher, Scanner, Notifications, Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* User Manual quick button */}
          {onOpenManual && (
            <button
              onClick={onOpenManual}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 transition-colors"
              title={isKhmer ? 'សៀវភៅណែនាំការប្រើប្រាស់ប្រព័ន្ធ (Khmer/English)' : 'System User Manual (Khmer/English)'}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">{isKhmer ? 'សៀវភៅណែនាំ' : 'Manual'}</span>
            </button>
          )}

          {/* Language Switcher Pill Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 border-indigo-200 shadow-xs"
            title={language === 'km' ? 'Switch to English' : 'ប្តូរជាភាសាខ្មែរ'}
          >
            <Languages className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              {language === 'km' ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}
            </span>
          </button>

          {/* Mobile Kiosk Toggle */}
          <button
            onClick={onToggleMobileKiosk}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
              isMobileKioskOpen
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={isKhmer ? 'បើកផ្ទាំងស្កេនវត្តមានលើទូរស័ព្ទដៃ' : 'Open phone-sized check-in terminal'}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden md:inline">{t('header.kiosk', 'Mobile Check-in')}</span>
          </button>

          {/* Absence Detector Scanner Button */}
          {hasPermission('attendance.edit') && (
            <button
              onClick={handleRunAbsenceScanner}
              disabled={isScanning}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 transition-colors shrink-0"
              title={isKhmer ? 'ស្វែងរកគ្រូ ឬបុគ្គលិកអវត្តមាន និងមិនបានស្កេនចេញ' : "Runs automated absence & late scanner on today's rosters"}
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? t('header.scanning', 'Scanning...') : t('header.detectAbsences', 'Detect Absences')}</span>
            </button>
          )}

          {/* Telegram Status Badge (Restricted from teachers and employees) */}
          {currentUser.role !== 'teacher' && currentUser.role !== 'employee' && hasPermission('telegram.view') && (
            <button
              onClick={onOpenTelegram}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors shrink-0"
              title={isKhmer ? 'ការជូនដំណឹងតេឡេក្រាម' : 'Telegram Alerts configured and active'}
            >
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping shrink-0" />
              <span className="hidden md:inline">{t('header.telegram', 'Telegram')}:</span>
              <span className="font-semibold">{telegramSettings.isEnabled ? t('header.active', 'Active') : t('header.muted', 'Muted')}</span>
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{t('header.notifications', 'Notifications & Alerts')}</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {t('header.markAllRead', 'Mark all read')}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-slate-500 hover:text-rose-600"
                    >
                      {t('header.clear', 'Clear')}
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      {t('header.noNotifications', 'No notifications right now')}
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.isRead ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-xs text-slate-900 leading-snug">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick RBAC Switcher / Current User Profile */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-300 shrink-0"
              />
              <div className="text-left hidden md:block max-w-[120px] truncate">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 leading-none truncate">
                    {isKhmer && currentUser.khmerName ? currentUser.khmerName.split(' ')[0] : currentUser.fullName.split(' ')[0]}
                  </span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900 text-white shrink-0">
                    {currentRole.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  {currentUser.department}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* User Profile Menu Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in-50 zoom-in-95 duration-150">
                {/* Active User Card */}
                <div className="p-3 bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-xl border border-indigo-100/60 mb-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {isKhmer && currentUser.khmerName ? currentUser.khmerName : currentUser.fullName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate font-mono">{currentUser.email}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white uppercase tracking-wider">
                          {currentRole.name}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">• {currentUser.department}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick User Manual Link */}
                {onOpenManual && (
                  <div className="pb-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenManual();
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{isKhmer ? 'សៀវភៅណែនាំប្រព័ន្ធ (User Manual)' : 'System User Manual (Khmer/EN)'}</span>
                    </button>
                  </div>
                )}

                {/* Logout Button */}
                <div className="pt-1">
                  <button
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      await logout();
                      showToast(
                        isKhmer ? 'បានចាកចេញពីប្រព័ន្ធដោយជោគជ័យ' : 'Logged out successfully',
                        'info'
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/70 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{isKhmer ? 'ចាកចេញពីប្រព័ន្ធ (Sign Out)' : 'Log Out (Sign Out)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
