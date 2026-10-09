import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  LayoutDashboard,
  Clock,
  GraduationCap,
  Users2,
  CalendarDays,
  CheckCircle2,
  CalendarCheck,
  Palmtree,
  BarChart3,
  Send,
  UserCog,
  ShieldCheck,
  History,
  Settings,
  Building,
  HelpCircle,
  BookOpen,
  X,
  LogOut,
  DollarSign,
  Languages,
  Video
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
import { TeacherProfileModal } from '../teachers/TeacherProfileModal.tsx';

export type NavTab =
  | 'dashboard'
  | 'kiosk'
  | 'teachers'
  | 'employees'
  | 'departments'
  | 'schedules'
  | 'monthly_calendar'
  | 'attendance'
  | 'leave'
  | 'holidays'
  | 'reports'
  | 'telegram'
  | 'users'
  | 'roles'
  | 'audit'
  | 'settings'
  | 'manual'
  | 'architecture';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose
}) => {
  const { currentUser, currentRole, hasPermission, logout } = useAuth();
  const { t, isKhmer, language, setLanguage } = useLanguage();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  interface NavItem {
    id: NavTab;
    label: string;
    khmer: string;
    icon: React.ElementType;
    permission?: string;
    badge?: string;
    section: 'overview' | 'staff' | 'attendance' | 'communication' | 'administration';
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      khmer: 'ផ្ទាំងគ្រប់គ្រង',
      icon: LayoutDashboard,
      section: 'overview'
    },
    // Academic & People
    {
      id: 'teachers',
      label: 'Teachers',
      khmer: 'គ្រូបង្រៀន',
      icon: GraduationCap,
      permission: 'teachers.view',
      section: 'staff'
    },
    {
      id: 'employees',
      label: 'Employees',
      khmer: 'បុគ្គលិកទូទៅ',
      icon: Users2,
      permission: 'employees.view',
      section: 'staff'
    },
    {
      id: 'departments',
      label: 'Departments',
      khmer: 'ដេប៉ាតឺម៉ង់ / ផ្នែក',
      icon: Building,
      permission: 'settings.manage',
      section: 'staff'
    },
    // Scheduling & Attendance
    {
      id: 'monthly_calendar',
      label: 'Monthly Calendar',
      khmer: 'ប្រតិទិនប្រចាំខែ',
      icon: CalendarDays,
      permission: 'schedules.view',
      section: 'attendance'
    },
    {
      id: 'schedules',
      label: 'Schedules & Calendar',
      khmer: 'កាលវិភាគការងារ',
      icon: Clock,
      permission: 'schedules.view',
      section: 'attendance'
    },
    {
      id: 'attendance',
      label: 'Daily Attendance',
      khmer: 'វត្តមានប្រចាំថ្ងៃ',
      icon: CheckCircle2,
      permission: 'attendance.view',
      section: 'attendance'
    },
    {
      id: 'leave',
      label: 'Leave Management',
      khmer: 'ការសុំច្បាប់ឈប់សម្រាក',
      icon: CalendarCheck,
      section: 'attendance'
    },
    {
      id: 'holidays',
      label: 'Holidays Calendar',
      khmer: 'ប្រតិទិនថ្ងៃឈប់សម្រាក',
      icon: Palmtree,
      section: 'attendance'
    },
    // Analytics & Alerts
    {
      id: 'reports',
      label: 'Reports & Wage Payroll',
      khmer: 'របាយការណ៍ និងប្រាក់ឈ្នួល',
      icon: BarChart3,
      permission: 'reports.view',
      badge: 'Wage',
      section: 'communication'
    },
    {
      id: 'telegram',
      label: 'Telegram Bot & Alerts',
      khmer: 'តេឡេក្រាម Bot',
      icon: Send,
      permission: 'telegram.view',
      badge: 'Bot API',
      section: 'communication'
    },
    // Governance & Security
    {
      id: 'users',
      label: 'User Accounts',
      khmer: 'គណនីអ្នកប្រើប្រាស់',
      icon: UserCog,
      permission: 'users.view',
      section: 'administration'
    },
    {
      id: 'roles',
      label: 'Roles & Permissions',
      khmer: 'តួនាទី និងសិទ្ធិអនុញ្ញាត',
      icon: ShieldCheck,
      permission: 'roles.view',
      section: 'administration'
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      khmer: 'កំណត់ត្រាសវនកម្ម',
      icon: History,
      permission: 'audit.view',
      section: 'administration'
    },
    {
      id: 'settings',
      label: 'System Settings',
      khmer: 'ការកំណត់ប្រព័ន្ធ',
      icon: Settings,
      permission: 'settings.manage',
      section: 'administration'
    },
    {
      id: 'manual',
      label: 'User Manual (Khmer/EN)',
      khmer: 'សៀវភៅណែនាំប្រព័ន្ធ',
      icon: BookOpen,
      badge: 'Guide',
      section: 'administration'
    },
    {
      id: 'architecture',
      label: 'System Architecture',
      khmer: 'ស្ថាបត្យកម្មប្រព័ន្ធ',
      icon: HelpCircle,
      permission: 'settings.manage',
      section: 'administration'
    }
  ];

  // Restrict teacher and employee from accessing telegram and system settings
  const isEmployee = currentUser.role === 'employee';
  const isRestrictedStaff = currentUser.role === 'teacher' || isEmployee;

  // Filter items by RBAC
  const visibleItems = navItems.map(item => {
    // Customize labels for employee and teacher accounts
    if (isEmployee) {
      if (item.id === 'monthly_calendar') {
        return {
          ...item,
          label: 'Monthly Present Calendar',
          khmer: 'ប្រតិទិនវត្តមានប្រចាំខែ',
          badge: 'Monthly',
          icon: CalendarDays,
          section: 'overview' as const
        };
      }
      if (item.id === 'schedules') {
        return {
          ...item,
          label: 'Work Shifts & Roster',
          khmer: 'កាលវិភាគវេនការងារ',
          icon: Clock,
          section: 'overview' as const
        };
      }
      if (item.id === 'attendance') {
        return {
          ...item,
          label: 'Staff Check-in History',
          khmer: 'ប្រវត្តិវត្តមានបុគ្គលិក',
          icon: CheckCircle2,
          section: 'overview' as const
        };
      }
      if (item.id === 'leave') {
        return {
          ...item,
          label: 'My Leave Requests',
          khmer: 'ការសុំច្បាប់ឈប់សម្រាក',
          icon: CalendarCheck,
          section: 'overview' as const
        };
      }
      if (item.id === 'holidays') {
        return {
          ...item,
          label: 'School Holidays Calendar',
          khmer: 'ប្រតិទិនថ្ងៃឈប់សម្រាក',
          icon: Palmtree,
          section: 'overview' as const
        };
      }
    }
    if (currentUser.role === 'teacher') {
      if (item.id === 'schedules') {
        return {
          ...item,
          label: 'Daily Teacher Schedule',
          khmer: 'កាលវិភាគបង្រៀនប្រចាំថ្ងៃ',
          badge: 'Daily',
          icon: Clock,
          section: 'overview' as const
        };
      }
      if (item.id === 'monthly_calendar') {
        return {
          ...item,
          label: 'Monthly Schedule Calendar',
          khmer: 'ប្រតិទិនកាលវិភាគប្រចាំខែ',
          badge: 'Monthly',
          icon: CalendarDays,
          section: 'overview' as const
        };
      }
      if (item.id === 'attendance') {
        return {
          ...item,
          label: 'My Attendance History',
          khmer: 'ប្រវត្តិវត្តមានរបស់ខ្ញុំ',
          icon: CheckCircle2,
          section: 'overview' as const
        };
      }
      if (item.id === 'reports') {
        return {
          ...item,
          label: 'Wage & Payroll History',
          khmer: 'ប្រវត្តិប្រាក់បៀវត្ស និងប្រាក់ឈ្នួល',
          badge: 'Wage',
          icon: DollarSign,
          section: 'overview' as const
        };
      }
      if (item.id === 'holidays') {
        return {
          ...item,
          label: 'School Holidays Calendar',
          khmer: 'ប្រតិទិនថ្ងៃឈប់សម្រាក',
          icon: Palmtree,
          section: 'overview' as const
        };
      }
      if (item.id === 'leave') {
        return {
          ...item,
          label: 'My Leave Requests',
          khmer: 'ការសុំច្បាប់ឈប់សម្រាក',
          icon: CalendarCheck,
          section: 'overview' as const
        };
      }
      if (item.id === 'manual') {
        return {
          ...item,
          label: 'Teacher Manual & Video',
          khmer: 'សៀវភៅ & វីដេអូណែនាំគ្រូ',
          badge: 'Video',
          icon: Video,
          section: 'overview' as const
        };
      }
    }
    return item;
  }).filter(item => {
    // If logged in as an Employee, show Monthly Present Calendar, Staff Shifts, Check-in History, Leave Requests, Holidays, and Manual
    if (isEmployee) {
      return item.id === 'monthly_calendar' || item.id === 'schedules' || item.id === 'attendance' || item.id === 'leave' || item.id === 'holidays' || item.id === 'manual';
    }

    // If logged in as a Teacher, show Daily Teacher Schedule first, then Monthly Calendar, Attendance History, Holidays, Leave, and Manual & Video
    if (currentUser.role === 'teacher') {
      return item.id === 'schedules' || item.id === 'monthly_calendar' || item.id === 'attendance' || item.id === 'holidays' || item.id === 'leave' || item.id === 'manual';
    }

    // Explicitly disallow teachers and employees from accessing telegram setting and system setting
    if (isRestrictedStaff && (item.id === 'telegram' || item.id === 'settings' || item.id === 'architecture')) {
      return false;
    }
    if (!item.permission) return true;
    return hasPermission(item.permission as any);
  }).sort((a, b) => {
    if (currentUser.role === 'teacher') {
      const order: NavTab[] = ['schedules', 'monthly_calendar', 'attendance', 'holidays', 'leave', 'manual'];
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    }
    return 0;
  });

  const sectionKeys: ('overview' | 'staff' | 'attendance' | 'communication' | 'administration')[] = [
    'overview',
    'staff',
    'attendance',
    'communication',
    'administration'
  ];

  const getSectionTitle = (secKey: string) => {
    if (isEmployee) {
      return isKhmer ? 'ផតថលបុគ្គលិក (STAFF PORTAL)' : 'STAFF WORK PORTAL';
    }
    if (currentUser.role === 'teacher') {
      return isKhmer ? 'ផតថលគ្រូបង្រៀន (TEACHER PORTAL)' : 'TEACHER FACULTY PORTAL';
    }
    switch (secKey) {
      case 'overview':
        return t('section.overview', 'OVERVIEW');
      case 'staff':
        return t('section.staff', 'STAFF & ROSTERS');
      case 'attendance':
        return t('section.attendance', 'TIME & ATTENDANCE');
      case 'communication':
        return t('section.communication', 'COMMUNICATION & ANALYTICS');
      case 'administration':
        return t('section.administration', 'ADMINISTRATION');
      default:
        return secKey.toUpperCase();
    }
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {sectionKeys.map(secKey => {
          const items = visibleItems.filter(i => i.section === secKey);
          if (items.length === 0) return null;

          return (
            <div key={secKey} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {getSectionTitle(secKey)}
              </div>
              {items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const displayName = isKhmer ? item.khmer : item.label;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{displayName}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Install Mobile App Shortcut in Sidebar */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <PWAInstallButton variant="sidebar" />
      </div>

      {/* Language Switcher in Sidebar */}
      <div className="px-3 py-2 border-t border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">
          <span className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKhmer ? 'ភាសាប្រព័ន្ធ' : 'Language'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {language === 'km' ? 'Khmer' : 'English'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setLanguage('km')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === 'km'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🇰🇭</span>
            <span>ភាសាខ្មែរ</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
        </div>
      </div>

      {/* Current User Session Bar at bottom of sidebar */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setIsProfileModalOpen(true);
              if (onClose) onClose();
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group"
            title={isKhmer ? 'កែសម្រួលព័ត៌មានប្រវត្តិរូប (Edit Profile)' : 'Edit My Profile & Owned Info'}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:ring-2 group-hover:ring-indigo-400">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-indigo-300">
                {isKhmer && currentUser.khmerName ? currentUser.khmerName : currentUser.fullName}
              </p>
              <p className="text-[10px] text-indigo-400 font-medium truncate flex items-center gap-1">
                <span>{currentRole.name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 truncate">{currentUser.department}</span>
              </p>
            </div>
            <UserCog className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-300 shrink-0" />
          </button>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title={isKhmer ? 'ចាកចេញពីប្រព័ន្ធ (Log Out)' : 'Log Out'}
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Teacher Profile Modal */}
      {isProfileModalOpen && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
      {/* Desktop Sidebar: in-flow flex child, fills remaining viewport height, always fixed in view */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-slate-900 border-r border-slate-800 h-full overflow-hidden select-none z-20 print:hidden">
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-over Drawer with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer container */}
          <div className="relative w-72 max-w-[85vw] h-full flex flex-col bg-slate-900 z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Mobile drawer header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isKhmer ? 'ម៉ឺនុយប្រព័ន្ធ' : 'Navigation Menu'}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
