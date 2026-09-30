import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { BottomNavigation } from './components/layout/BottomNavigation.tsx';
import { Dashboard } from './components/dashboard/Dashboard.tsx';
import { CheckInKiosk } from './components/checkin/CheckInKiosk.tsx';
import { TeacherManagement } from './components/teachers/TeacherManagement.tsx';
import { EmployeeManagement } from './components/employees/EmployeeManagement.tsx';
import { DepartmentManagement } from './components/departments/DepartmentManagement.tsx';
import { ScheduleManagement } from './components/schedules/ScheduleManagement.tsx';
import { AttendanceList } from './components/attendance/AttendanceList.tsx';
import { AttendanceReports } from './components/reports/AttendanceReports.tsx';
import { TeachingWageReport } from './components/reports/TeachingWageReport.tsx';
import { LeaveManagement } from './components/leave/LeaveManagement.tsx';
import { HolidayManagement } from './components/holidays/HolidayManagement.tsx';
import { TelegramCenter } from './components/telegram/TelegramCenter.tsx';
import { UserManagement } from './components/users/UserManagement.tsx';
import { AuditLogViewer } from './components/audit/AuditLogViewer.tsx';
import { SystemSettingsView } from './components/settings/SystemSettingsView.tsx';
import { SystemUserManual } from './components/manual/SystemUserManual.tsx';
import { EmployeeStaffCalendar } from './components/schedules/EmployeeStaffCalendar.tsx';
import { EmployeeMonthlyPresentCalendar } from './components/schedules/EmployeeMonthlyPresentCalendar.tsx';
import { StorageService } from './services/storageService.ts';
import { OfflineIndicator } from './components/pwa/OfflineIndicator.tsx';
import { FirstLoginInstallModal } from './components/pwa/FirstLoginInstallModal.tsx';
import { TeacherScheduleAlertBanner } from './components/schedules/TeacherScheduleAlertBanner.tsx';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Building2, ArrowRight } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0" />
        };

        const bg = {
          success: 'bg-white border-emerald-200 text-slate-800 shadow-emerald-500/10',
          error: 'bg-white border-rose-200 text-slate-800 shadow-rose-500/10',
          warning: 'bg-white border-amber-200 text-slate-800 shadow-amber-500/10',
          info: 'bg-white border-sky-200 text-slate-800 shadow-sky-500/10'
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${bg}`}
          >
            <div className="flex items-center gap-2.5">
              {icons[toast.type]}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const isEmployee = currentUser.role === 'employee';
  const isTeacher = currentUser.role === 'teacher';
  // Teacher lands on Daily Schedule ('schedules') by default; Employee on Monthly Present Calendar
  const [currentTab, setCurrentTab] = useState<NavTab>(() => (isTeacher ? 'schedules' : isEmployee ? 'monthly_calendar' : 'dashboard'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const { isKhmer } = useLanguage();

  const isRestrictedStaff = isTeacher || isEmployee;

  // Automatically enforce guard: teacher lands directly on Daily Schedule; employee on Monthly Calendar
  React.useEffect(() => {
    if (isEmployee) {
      const allowedEmployeeTabs: NavTab[] = ['monthly_calendar', 'schedules', 'attendance', 'leave', 'holidays', 'manual'];
      if (!allowedEmployeeTabs.includes(currentTab)) {
        setCurrentTab('monthly_calendar');
      }
      return;
    }

    if (isTeacher) {
      const allowedTeacherTabs: NavTab[] = ['schedules', 'monthly_calendar', 'attendance', 'reports', 'holidays', 'leave', 'manual'];
      if (!allowedTeacherTabs.includes(currentTab)) {
        setCurrentTab('schedules');
      }
      return;
    }
  }, [isEmployee, isTeacher, currentUser.id]);

  const renderContent = () => {
    // If logged in as Employee, allow Monthly Present Calendar, Staff Shifts, Check-in History, Leave Requests, and Holidays
    if (isEmployee) {
      if (currentTab === 'attendance') {
        return <AttendanceList />;
      }
      if (currentTab === 'schedules') {
        return <EmployeeStaffCalendar initialTab="weekly_shifts" onNavigateToHistory={() => setCurrentTab('attendance')} />;
      }
      if (currentTab === 'leave') {
        return <LeaveManagement />;
      }
      if (currentTab === 'holidays') {
        return <HolidayManagement />;
      }
      if (currentTab === 'manual') {
        return <SystemUserManual />;
      }
      // Monthly Present Calendar directly
      return <EmployeeMonthlyPresentCalendar onNavigateToHistory={() => setCurrentTab('attendance')} />;
    }

    // If logged in as Teacher, show Daily Teacher Schedule by default, and allow Monthly Schedule Calendar, Attendance History, Wage & Payroll, Holidays, and Leave
    if (isTeacher) {
      if (currentTab === 'monthly_calendar') {
        return <ScheduleManagement initialView="monthly_calendar" />;
      }
      if (currentTab === 'attendance') {
        return <AttendanceList />;
      }
      if (currentTab === 'schedules') {
        return <ScheduleManagement initialView="daily_schedule" />;
      }
      if (currentTab === 'reports') {
        return <TeachingWageReport />;
      }
      if (currentTab === 'holidays') {
        return <HolidayManagement />;
      }
      if (currentTab === 'leave') {
        return <LeaveManagement />;
      }
      if (currentTab === 'manual') {
        return <SystemUserManual />;
      }
      // Default: Daily Teacher Schedule directly
      return <ScheduleManagement initialView="daily_schedule" />;
    }

    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(tab: any) => setCurrentTab(tab as NavTab)}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
          />
        );
      case 'kiosk':
        return <CheckInKiosk />;
      case 'teachers':
        return <TeacherManagement />;
      case 'employees':
        return <EmployeeManagement />;
      case 'departments':
        return <DepartmentManagement />;
      case 'monthly_calendar':
        return <ScheduleManagement initialView="monthly_calendar" />;
      case 'schedules':
        return <ScheduleManagement initialView="daily_schedule" />;
      case 'attendance':
        return <AttendanceList />;
      case 'reports':
        return <AttendanceReports />;
      case 'leave':
        return <LeaveManagement />;
      case 'holidays':
        return <HolidayManagement />;
      case 'telegram':
        if (isRestrictedStaff) {
          return (
            <Dashboard
              onNavigate={(tab: any) => setCurrentTab(tab as NavTab)}
              onOpenCheckIn={() => setIsCheckInModalOpen(true)}
            />
          );
        }
        return <TelegramCenter />;
      case 'users':
      case 'roles':
        return <UserManagement />;
      case 'audit':
        return <AuditLogViewer />;
      case 'settings':
      case 'architecture':
        if (isRestrictedStaff) {
          return (
            <Dashboard
              onNavigate={(tab: any) => setCurrentTab(tab as NavTab)}
              onOpenCheckIn={() => setIsCheckInModalOpen(true)}
            />
          );
        }
        return <SystemSettingsView />;
      case 'manual':
        return <SystemUserManual />;
      default:
        return (
          <Dashboard
            onNavigate={(tab: any) => setCurrentTab(tab as NavTab)}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-slate-100 antialiased text-slate-900 selection:bg-indigo-500 selection:text-white print:h-auto print:overflow-visible print:bg-white ${isKhmer ? 'font-khmer' : 'font-sans'}`}>
      
      {/* Top Global Header with zero overlap */}
      <Header
        onOpenTelegram={() => setCurrentTab('telegram')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenManual={() => setCurrentTab('manual')}
      />

      {/* Main Body with side-by-side flex layout (Desktop) / Slide-over (Mobile) */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative print:overflow-visible print:h-auto print:block">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab: NavTab) => {
            setCurrentTab(tab);
            setIsMobileMenuOpen(false);
          }}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Viewport: min-w-0 ensures no horizontal overflow, w-full for full-width layout */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 print:p-0 print:overflow-visible print:h-auto print:block">
          <div className="w-full">
            {/* Real-time Schedule Alert & Countdown Widget */}
            <TeacherScheduleAlertBanner onOpenCheckIn={() => setIsCheckInModalOpen(true)} />
            {renderContent()}
          </div>
        </main>

      </div>

      {/* Mobile App Native-Style Bottom Navigation Menu */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={(tab: NavTab) => {
          setCurrentTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onOpenCheckInModal={() => setIsCheckInModalOpen(true)}
        onOpenFullMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Quick Check-in Full Screen Modal with animate from bottom */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] sm:max-w-2xl flex flex-col bg-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border sm:border-slate-200 animate-in slide-in-from-bottom duration-300 ease-out">
            {/* Mobile Top Bar */}
            <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold font-khmer">ស្ថានីយស្កេនវត្តមាន</span>
                <span className="text-[11px] text-slate-400 font-medium">| Attendance Kiosk</span>
              </div>
              <button
                onClick={() => setIsCheckInModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Close button */}
            <button
              onClick={() => setIsCheckInModalOpen(false)}
              className="hidden sm:flex absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white items-center justify-center transition-colors shadow-md"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 overscroll-contain">
              <CheckInKiosk
                isMobileModal={true}
                onCloseMobileModal={() => setIsCheckInModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Popup Alert on Home Screen at First Logged-in for App Installation */}
      <FirstLoginInstallModal />

      {/* Global Notifications */}
      <ToastContainer />

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />

    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { isKhmer } = useLanguage();
  const [sysSettings, setSysSettings] = useState(() => StorageService.getSystemSettings());

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSysSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  if (isLoading) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white ${isKhmer ? 'font-khmer' : 'font-sans'}`}>
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-2">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>{isKhmer ? 'កំពុងដំណើរការប្រព័ន្ធ...' : 'Connecting to EduTrack MIS...'}</span>
        </div>
        <p className="text-xs text-slate-400">{sysSettings.organizationName}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
        <OfflineIndicator />
      </>
    );
  }

  return <MainLayout key={currentUser.id} />;
};

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
