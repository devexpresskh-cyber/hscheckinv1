import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { NavTab } from './Sidebar.tsx';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  CheckCircle2,
  Menu,
  GraduationCap,
  Users2,
  BarChart3,
  CalendarCheck,
  Palmtree,
  Send,
  UserCog,
  Settings,
  HelpCircle,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Building,
  History
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

interface BottomNavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCheckInModal: () => void;
  onOpenFullMenu?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenCheckInModal,
  onOpenFullMenu
}) => {
  const { currentUser, currentRole, hasPermission, logout } = useAuth();
  const { isKhmer } = useLanguage();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  const isEmployee = currentUser.role === 'employee';
  const isTeacher = currentUser.role === 'teacher';
  const isRestrictedStaff = isTeacher || isEmployee;

  // Secondary items for the "More" bottom sheet
  const secondaryMenuItems = [
    {
      id: 'teachers' as NavTab,
      label: 'Teachers',
      khmer: 'គ្រូបង្រៀន',
      icon: GraduationCap,
      permission: 'teachers.view',
      color: 'bg-indigo-50 text-indigo-700'
    },
    {
      id: 'employees' as NavTab,
      label: 'Employees',
      khmer: 'បុគ្គលិកទូទៅ',
      icon: Users2,
      permission: 'employees.view',
      color: 'bg-emerald-50 text-emerald-700'
    },
    {
      id: 'departments' as NavTab,
      label: 'Departments',
      khmer: 'ដេប៉ាតឺម៉ង់ / ផ្នែក',
      icon: Building,
      permission: 'settings.manage',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      id: 'leave' as NavTab,
      label: 'Leave Requests',
      khmer: 'ច្បាប់ឈប់សម្រាក',
      icon: CalendarCheck,
      color: 'bg-purple-50 text-purple-700'
    },
    {
      id: 'holidays' as NavTab,
      label: 'Holidays Calendar',
      khmer: 'ប្រតិទិនថ្ងៃឈប់សម្រាក',
      icon: Palmtree,
      color: 'bg-teal-50 text-teal-700'
    },
    {
      id: 'reports' as NavTab,
      label: 'Attendance & Wage Reports',
      khmer: 'របាយការណ៍វត្តមាន និងប្រាក់បៀវត្ស',
      icon: BarChart3,
      permission: 'reports.view',
      color: 'bg-amber-50 text-amber-700'
    },
    {
      id: 'telegram' as NavTab,
      label: 'Telegram Bot Alerts',
      khmer: 'ការជូនដំណឹងតេឡេក្រាម',
      icon: Send,
      permission: 'telegram.view',
      restricted: isRestrictedStaff,
      color: 'bg-sky-50 text-sky-700'
    },
    {
      id: 'users' as NavTab,
      label: 'User Accounts & Roles',
      khmer: 'គណនីអ្នកប្រើប្រាស់ និងសិទ្ធិ',
      icon: UserCog,
      permission: 'users.view',
      color: 'bg-rose-50 text-rose-700'
    },
    {
      id: 'settings' as NavTab,
      label: 'System Settings',
      khmer: 'ការកំណត់ប្រព័ន្ធ',
      icon: Settings,
      permission: 'settings.manage',
      restricted: isRestrictedStaff,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'manual' as NavTab,
      label: 'User Manual & Guides',
      khmer: 'សៀវភៅណែនាំប្រើប្រាស់',
      icon: HelpCircle,
      color: 'bg-cyan-50 text-cyan-700'
    }
  ].filter(item => {
    if (isEmployee) {
      return item.id === 'leave' || item.id === 'holidays' || item.id === 'manual';
    }
    if (isTeacher) {
      return item.id === 'reports' || item.id === 'leave' || item.id === 'holidays' || item.id === 'manual';
    }
    if (item.restricted) return false;
    if (!item.permission) return true;
    return hasPermission(item.permission as any);
  });

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMoreSheetOpen(false);
  };

  const handleMoreClick = () => {
    if (onOpenFullMenu) {
      onOpenFullMenu();
    } else {
      setIsMoreSheetOpen(true);
    }
  };

  return (
    <>
      {/* Fixed Native-Style Bottom Navigation Bar (Mobile only, hidden on md+) */}
      <nav
        aria-label="Mobile Navigation Menu"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_25px_rgba(15,23,42,0.08)] px-2 safe-area-bottom print:hidden transition-all duration-200"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
          
          {/* TAB 1: HOME / MONTHLY CALENDAR */}
          {isEmployee ? (
            <button
              onClick={() => handleTabClick('monthly_calendar')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'monthly_calendar' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <CalendarDays className={`w-5 h-5 transition-transform ${currentTab === 'monthly_calendar' ? 'scale-110' : ''}`} />
                {currentTab === 'monthly_calendar' && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'វត្តមានប្រចាំខែ' : 'Present'}
              </span>
            </button>
          ) : isTeacher ? (
            <button
              onClick={() => handleTabClick('monthly_calendar')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'monthly_calendar' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <CalendarDays className={`w-5 h-5 transition-transform ${currentTab === 'monthly_calendar' ? 'scale-110' : ''}`} />
                {currentTab === 'monthly_calendar' && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'កាលវិភាគខែ' : 'Monthly'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'dashboard' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <LayoutDashboard className={`w-5 h-5 transition-transform ${currentTab === 'dashboard' ? 'scale-110' : ''}`} />
                {currentTab === 'dashboard' && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'ទំព័រដើម' : 'Home'}
              </span>
            </button>
          )}

          {/* TAB 2: SCHEDULES / TIMETABLE / SHIFTS */}
          {isEmployee ? (
            <button
              onClick={() => handleTabClick('schedules')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'schedules' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Clock className={`w-5 h-5 transition-transform ${currentTab === 'schedules' ? 'scale-110' : ''}`} />
                {currentTab === 'schedules' && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'វេនការងារ' : 'Shifts'}
              </span>
            </button>
          ) : isTeacher ? (
            <button
              onClick={() => handleTabClick('schedules')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'schedules' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Clock className={`w-5 h-5 transition-transform ${currentTab === 'schedules' ? 'scale-110' : ''}`} />
                {currentTab === 'schedules' && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'កាលវិភាគ' : 'Timetable'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleTabClick('monthly_calendar')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                currentTab === 'monthly_calendar' || currentTab === 'schedules' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <CalendarDays className={`w-5 h-5 transition-transform ${currentTab === 'monthly_calendar' || currentTab === 'schedules' ? 'scale-110' : ''}`} />
                {(currentTab === 'monthly_calendar' || currentTab === 'schedules') && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
                {isKhmer ? 'កាលវិភាគ' : 'Schedules'}
              </span>
            </button>
          )}

          {/* TAB 3: CENTER QUICK CHECK-IN ACTION (Elevated floating button) */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-5">
            <button
              onClick={onOpenCheckInModal}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/35 flex flex-col items-center justify-center ring-4 ring-white active:scale-90 transition-all duration-150 group"
              title={isKhmer ? 'ស្កេនចូល / ចេញ' : 'Quick Check In / Out'}
              aria-label="Scan attendance check in"
            >
              <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black tracking-tight leading-none mt-0.5">
                {isKhmer ? 'ស្កេន' : 'SCAN'}
              </span>
            </button>
            <span className={`text-[9px] font-bold text-slate-700 mt-1 ${isKhmer ? 'font-khmer' : ''}`}>
              {isKhmer ? 'វត្តមាន' : 'Check In'}
            </span>
          </div>

          {/* TAB 4: ATTENDANCE / HISTORY */}
          <button
            onClick={() => handleTabClick('attendance')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              currentTab === 'attendance' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              {isEmployee ? (
                <History className={`w-5 h-5 transition-transform ${currentTab === 'attendance' ? 'scale-110' : ''}`} />
              ) : (
                <CheckCircle2 className={`w-5 h-5 transition-transform ${currentTab === 'attendance' ? 'scale-110' : ''}`} />
              )}
              {currentTab === 'attendance' && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </div>
            <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
              {isKhmer ? (isEmployee ? 'ប្រវត្តិ' : 'វត្តមាន') : (isEmployee ? 'History' : 'Attendance')}
            </span>
          </button>

          {/* TAB 5: MORE MENU (For accessing other sections or Employee Profile) */}
          <button
            onClick={handleMoreClick}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isMoreSheetOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
            </div>
            <span className={`text-[10px] mt-1 font-bold truncate max-w-[65px] ${isKhmer ? 'font-khmer' : ''}`}>
              {isKhmer ? 'ម៉ឺនុយ' : 'More'}
            </span>
          </button>

        </div>
      </nav>

      {/* Slide-Up Bottom Sheet for "More" Menu items on mobile */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom-10 duration-200 overflow-hidden"
          >
            {/* Sheet Handle & Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                    {isKhmer && currentUser.khmerName ? currentUser.khmerName : currentUser.fullName}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {currentRole.name} • {currentUser.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Menu Grid */}
            <div className="overflow-y-auto p-4 space-y-4">
              {secondaryMenuItems.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                    {isKhmer ? 'កម្មវិធី និងការគ្រប់គ្រង' : 'Modules & Management'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {secondaryMenuItems.map(item => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all border ${
                            isActive
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold block leading-tight truncate">
                              {isKhmer ? item.khmer : item.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {isKhmer ? item.label : item.khmer}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Install App to Mobile Home Screen */}
              <div className="pt-2 border-t border-slate-100">
                <PWAInstallButton variant="login" />
              </div>

              {/* Logout Action in Sheet */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isKhmer ? 'ចាកចេញពីគណនី (Sign Out)' : 'Sign Out of Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
