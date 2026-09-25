import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { Dashboard } from './components/dashboard/Dashboard.tsx';
import { CheckInKiosk } from './components/checkin/CheckInKiosk.tsx';
import { TeacherManagement } from './components/teachers/TeacherManagement.tsx';
import { EmployeeManagement } from './components/employees/EmployeeManagement.tsx';
import { DepartmentManagement } from './components/departments/DepartmentManagement.tsx';
import { ScheduleManagement } from './components/schedules/ScheduleManagement.tsx';
import { AttendanceList } from './components/attendance/AttendanceList.tsx';
import { AttendanceReports } from './components/reports/AttendanceReports.tsx';
import { LeaveManagement } from './components/leave/LeaveManagement.tsx';
import { HolidayManagement } from './components/holidays/HolidayManagement.tsx';
import { TelegramCenter } from './components/telegram/TelegramCenter.tsx';
import { UserManagement } from './components/users/UserManagement.tsx';
import { AuditLogViewer } from './components/audit/AuditLogViewer.tsx';
import { SystemSettingsView } from './components/settings/SystemSettingsView.tsx';
import { SystemUserManual } from './components/manual/SystemUserManual.tsx';
import { StorageService } from './services/storageService.ts';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Building2, ArrowRight } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden">
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
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const { isKhmer } = useLanguage();

  const isRestrictedStaff = currentUser.role === 'teacher' || currentUser.role === 'employee';

  // Automatically enforce guard: teacher and employee cannot access telegram setting and system setting
  React.useEffect(() => {
    if (isRestrictedStaff && (currentTab === 'telegram' || currentTab === 'settings' || currentTab === 'architecture')) {
      setCurrentTab('dashboard');
    }
  }, [isRestrictedStaff, currentTab]);

  const renderContent = () => {
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
      case 'schedules':
        return <ScheduleManagement />;
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
        onToggleMobileKiosk={() => setIsCheckInModalOpen(!isCheckInModalOpen)}
        isMobileKioskOpen={isCheckInModalOpen}
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
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 sm:p-5 lg:p-6 print:p-0 print:overflow-visible print:h-auto print:block">
          <div className="w-full">
            {renderContent()}
          </div>
        </main>

      </div>

      {/* Quick Check-in Floating Modal with scroll protection */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <button
              onClick={() => setIsCheckInModalOpen(false)}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center transition-colors shadow-md"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-y-auto p-1 sm:p-2">
              <CheckInKiosk
                isMobileModal={true}
                onCloseMobileModal={() => setIsCheckInModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Notifications */}
      <ToastContainer />

    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
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
      </>
    );
  }

  return <MainLayout />;
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
