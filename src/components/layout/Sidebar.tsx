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
  LogOut
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'kiosk'
  | 'teachers'
  | 'employees'
  | 'departments'
  | 'schedules'
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
  const { t, isKhmer } = useLanguage();

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
    {
      id: 'kiosk',
      label: 'Check-in Terminal',
      khmer: 'ចំណុចស្កេនវត្តមាន',
      icon: Clock,
      badge: 'Live',
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
      id: 'schedules',
      label: 'Schedules & Calendar',
      khmer: 'កាលវិភាគការងារ',
      icon: CalendarDays,
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
  const isRestrictedStaff = currentUser.role === 'teacher' || currentUser.role === 'employee';

  // Filter items by RBAC
  const visibleItems = navItems.filter(item => {
    // Explicitly disallow teachers and employees from accessing telegram setting and system setting
    if (isRestrictedStaff && (item.id === 'telegram' || item.id === 'settings' || item.id === 'architecture')) {
      return false;
    }
    if (!item.permission) return true;
    return hasPermission(item.permission as any);
  });

  const sectionKeys: ('overview' | 'staff' | 'attendance' | 'communication' | 'administration')[] = [
    'overview',
    'staff',
    'attendance',
    'communication',
    'administration'
  ];

  const getSectionTitle = (secKey: string) => {
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

      {/* Current User Session Bar at bottom of sidebar */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {isKhmer && currentUser.khmerName ? currentUser.khmerName : currentUser.fullName}
              </p>
              <p className="text-[10px] text-indigo-400 font-medium truncate">
                {currentRole.name} • {currentUser.department}
              </p>
            </div>
          </div>
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
