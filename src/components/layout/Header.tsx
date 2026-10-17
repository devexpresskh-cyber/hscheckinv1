import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { StorageService } from '../../services/storageService.ts';
import { OfflineSyncBadge } from '../sync/OfflineSyncBadge.tsx';
import { AcademicDatesModal } from '../schedules/AcademicDatesModal.tsx';
import { TeacherProfileModal } from '../teachers/TeacherProfileModal.tsx';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
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
  LogOut,
  GraduationCap,
  Users2,
  ShieldCheck,
  Calendar,
  UserCog,
  Camera,
  Video,
  Download,
  Play
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileKiosk?: () => void;
  isMobileKioskOpen?: boolean;
  onOpenTelegram: () => void;
  onToggleMobileMenu?: () => void;
  onOpenManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTelegram,
  onToggleMobileMenu,
  onOpenManual
}) => {
  const { currentUser, currentRole, hasPermission, logout, switchUser, allUsers } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, showToast } = useNotification();
  const { isKhmer, t } = useLanguage();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAcademicDatesModalOpen, setIsAcademicDatesModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());
  const [telegramSettings, setTelegramSettings] = useState(() => StorageService.getTelegramSettings());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSystemSettings(StorageService.getSystemSettings());
      setTelegramSettings(StorageService.getTelegramSettings());
    });
    return unsub;
  }, []);

  const canEditAcademicDates =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    hasPermission('settings.manage') ||
    hasPermission('schedules.edit');

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
    <>
      <header className="shrink-0 z-40 bg-[#2563eb] text-white border-b border-blue-700/60 shadow-md print:hidden transition-colors">
      <div className="flex items-center justify-between px-3 sm:px-6 h-16 max-w-full gap-2 sm:gap-4 overflow-visible">
        
        {/* Left: Mobile Menu Button & Organization Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Hamburger toggle on mobile */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-white hover:text-white hover:bg-white/15 active:scale-95 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs shrink-0 backdrop-blur-xs border border-white/20">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="min-w-0 truncate max-w-[160px] xs:max-w-[210px] sm:max-w-xs md:max-w-sm lg:max-w-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-extrabold text-white text-xs sm:text-base leading-tight truncate">
                {isKhmer ? systemSettings.khmerOrgName : systemSettings.organizationName}
              </h1>
              <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/25 shrink-0">
                School MIS
              </span>
              {systemSettings.academicYear ? (
                canEditAcademicDates ? (
                  <button
                    type="button"
                    onClick={() => setIsAcademicDatesModalOpen(true)}
                    title={
                      systemSettings.academicStartDate && systemSettings.academicEndDate
                        ? `Academic Term: ${systemSettings.academicStartDate} to ${systemSettings.academicEndDate} (Click to edit dates)`
                        : `Academic Year: ${systemSettings.academicYear} (Click to edit dates)`
                    }
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <GraduationCap className="w-3 h-3 text-white" />
                    <span>AY {systemSettings.academicYear}</span>
                    <span className="text-[9px] text-blue-200 font-normal">✎</span>
                  </button>
                ) : (
                  <span
                    title={
                      systemSettings.academicStartDate && systemSettings.academicEndDate
                        ? `Academic Term: ${systemSettings.academicStartDate} to ${systemSettings.academicEndDate}`
                        : `Academic Year: ${systemSettings.academicYear}`
                    }
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/25 shrink-0 cursor-default shadow-2xs"
                  >
                    <GraduationCap className="w-3 h-3 text-white" />
                    <span>AY {systemSettings.academicYear}</span>
                  </span>
                )
              ) : canEditAcademicDates ? (
                <button
                  type="button"
                  onClick={() => setIsAcademicDatesModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all cursor-pointer shadow-2xs"
                  title="Click to set Academic Start & End Dates"
                >
                  <Calendar className="w-3 h-3 text-white" />
                  <span>{isKhmer ? 'កំណត់ឆ្នាំសិក្សា' : 'Set Academic Dates'}</span>
                </button>
              ) : null}
            </div>
            <p className="text-[11px] text-blue-100 font-medium hidden sm:block truncate">
              {isKhmer
                ? `${systemSettings.organizationName} • ប្រព័ន្ធកត់ត្រាវត្តមាន និងកាលវិភាគ`
                : `${systemSettings.khmerOrgName} • Faculty Attendance & Scheduling`}
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock (hidden on smaller devices to avoid crowding) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white shrink-0 mx-2 backdrop-blur-xs">
          <Clock className="w-4 h-4 text-white animate-pulse shrink-0" />
          <span className="font-mono font-semibold text-sm tracking-wide text-white">{timeStr}</span>
          <span className="text-blue-200">|</span>
          <span className="text-xs font-medium text-blue-100">{dateStr}</span>
        </div>

        {/* Right: Actions, Scanner, Notifications, Role Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* User Manual quick button */}
          {onOpenManual && (
            <button
              onClick={onOpenManual}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-colors cursor-pointer"
              title={isKhmer ? 'សៀវភៅណែនាំការប្រើប្រាស់ប្រព័ន្ធ (Khmer/English)' : 'System User Manual (Khmer/English)'}
            >
              <BookOpen className="w-3.5 h-3.5 text-white" />
              <span>{isKhmer ? 'សៀវភៅណែនាំ' : 'Manual'}</span>
            </button>
          )}

          {/* Absence Detector Scanner Button */}
          {hasPermission('attendance.edit') && (
            <button
              onClick={handleRunAbsenceScanner}
              disabled={isScanning}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/25 transition-colors shrink-0 cursor-pointer"
              title={isKhmer ? 'ស្វែងរកគ្រូ ឬបុគ្គលិកអវត្តមាន និងមិនបានស្កេនចេញ' : "Runs automated absence & late scanner on today's rosters"}
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? t('header.scanning', 'Scanning...') : t('header.detectAbsences', 'Detect Absences')}</span>
            </button>
          )}

          {/* Offline Cloud Auto-Sync Badge */}
          <div className="hidden sm:flex shrink-0">
            <OfflineSyncBadge variant="pill" />
          </div>

          {/* Quick PWA Install App Button */}
          <PWAInstallButton variant="header" />

          {/* Telegram Status Badge (Restricted from teachers and employees) */}
          {currentUser.role !== 'teacher' && currentUser.role !== 'employee' && hasPermission('telegram.view') && (
            <button
              onClick={onOpenTelegram}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors shrink-0 cursor-pointer"
              title={isKhmer ? 'ការជូនដំណឹងតេឡេក្រាម' : 'Telegram Alerts configured and active'}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="hidden xl:inline">{t('header.telegram', 'Telegram')}:</span>
              <span className="font-semibold">{telegramSettings.isEnabled ? t('header.active', 'Active') : t('header.muted', 'Muted')}</span>
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsUserMenuOpen(false);
              }}
              className="relative p-2 rounded-xl text-white hover:text-white hover:bg-white/15 active:scale-95 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-[#2563eb]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown with Click-Outside Backdrop */}
            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsNotifOpen(false)}
                />
                <div className="fixed sm:absolute top-16 sm:top-full right-2 sm:right-0 mt-1 max-w-[calc(100vw-1rem)] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
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
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        {t('header.markAllRead', 'Mark all read')}
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={clearAll}
                        className="text-[11px] text-slate-500 hover:text-rose-600 cursor-pointer"
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
              </>
            )}
          </div>

          {/* Quick RBAC Switcher / Current User Profile */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-white/15 border border-white/20 transition-colors cursor-pointer text-white"
            >
              <img
                src={currentUser.avatarUrl?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-white/60 shrink-0 shadow-2xs"
              />
              <div className="text-left hidden md:block max-w-[120px] truncate">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white leading-none truncate font-khmer">
                    {(currentUser.khmerName || currentUser.fullName).split(' ')[0]}
                  </span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/20 text-white shrink-0">
                    {currentRole.name}
                  </span>
                </div>
                <span className="text-[10px] text-blue-100 font-medium block truncate">
                  {currentUser.department}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-blue-100 shrink-0" />
            </button>

            {/* User Profile Menu Dropdown with Backdrop */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="fixed sm:absolute top-16 sm:top-full right-2 sm:right-0 mt-1 max-w-[calc(100vw-1rem)] w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in-50 zoom-in-95 duration-150">
                  {/* Active User Card */}
                  <div className="p-3 bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-xl border border-indigo-100/60 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="relative group cursor-pointer shrink-0"
                        title={isKhmer ? 'ចុចដើម្បីប្តូររូបថតប្រវត្តិរូប' : 'Click to change profile picture'}
                      >
                        <img
                          src={currentUser.avatarUrl?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-200 transition-all group-hover:ring-indigo-400"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate font-khmer">
                          {currentUser.khmerName || currentUser.fullName}
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

                  {/* Edit Profile & Upload Photo Button */}
                  <div className="pb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-slate-800 hover:text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{isKhmer ? 'កែប្រវត្តិរូប & រូបថត (Edit Profile)' : 'Edit Profile & Photo'}</span>
                      </div>
                      <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                  </div>

                  {/* Quick User Manual Link */}
                  {onOpenManual && (
                    <div className="pb-1 space-y-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenManual();
                        }}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{isKhmer ? 'សៀវភៅណែនាំប្រព័ន្ធ (User Manual)' : 'System User Manual (Khmer/EN)'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('edutrack:open-video-manual'));
                        }}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-2xs transition-all cursor-pointer"
                        title={isKhmer ? 'វីដេអូណែនាំសម្រាប់គ្រូ (សកម្មភាពលើផ្ទាំងពិត & MP4)' : 'Teacher Video Manual (Real Action & MP4)'}
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 shrink-0" />
                          <span>{isKhmer ? 'វីដេអូណែនាំគ្រូ (Video Manual)' : 'Teacher Video Manual'}</span>
                        </div>
                        <Play className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
                      </button>
                    </div>
                  )}

                  {/* Quick Install Mobile/Desktop App Button */}
                  <div className="pt-1">
                    <PWAInstallButton variant="compact" className="w-full justify-center" />
                  </div>

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
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/70 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>{isKhmer ? 'ចាកចេញពីប្រព័ន្ធ (Sign Out)' : 'Log Out (Sign Out)'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </header>

    {/* Teacher / Staff Profile & Owned Info Modal */}
    {isProfileModalOpen && (
      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    )}

    {/* Quick Academic Dates Modal for Admins */}
    {isAcademicDatesModalOpen && (
      <AcademicDatesModal
        isOpen={isAcademicDatesModalOpen}
        onClose={() => setIsAcademicDatesModalOpen(false)}
      />
    )}
  </>
  );
};
