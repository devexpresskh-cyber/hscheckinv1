import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'km';

export interface Translations {
  [key: string]: {
    en: string;
    km: string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.dashboard': { en: 'Dashboard', km: 'ផ្ទាំងគ្រប់គ្រង' },
  'nav.kiosk': { en: 'Check-in Terminal', km: 'ចំណុចស្កេនវត្តមាន' },
  'nav.teachers': { en: 'Teachers', km: 'គ្រូបង្រៀន' },
  'nav.employees': { en: 'Employees', km: 'បុគ្គលិកទូទៅ' },
  'nav.departments': { en: 'Departments', km: 'ដេប៉ាតឺម៉ង់ / ផ្នែក' },
  'nav.schedules': { en: 'Schedules & Calendar', km: 'កាលវិភាគការងារ' },
  'nav.attendance': { en: 'Daily Attendance', km: 'វត្តមានប្រចាំថ្ងៃ' },
  'nav.leave': { en: 'Leave Management', km: 'ការសុំច្បាប់ឈប់សម្រាក' },
  'nav.holidays': { en: 'Holidays Calendar', km: 'ប្រតិទិនថ្ងៃឈប់សម្រាក' },
  'nav.reports': { en: 'Reports & Export', km: 'របាយការណ៍ និងទិន្នន័យ' },
  'nav.telegram': { en: 'Telegram Bot & Alerts', km: 'តេឡេក្រាម Bot' },
  'nav.users': { en: 'User Accounts', km: 'គណនីអ្នកប្រើប្រាស់' },
  'nav.roles': { en: 'Roles & Permissions', km: 'តួនាទី និងសិទ្ធិ' },
  'nav.audit': { en: 'Audit Trail Logs', km: 'កំណត់ត្រាសវនកម្ម' },
  'nav.settings': { en: 'System Settings', km: 'ការកំណត់ប្រព័ន្ធ' },
  'nav.architecture': { en: 'System Architecture & ERD', km: 'ស្ថាបត្យកម្មប្រព័ន្ធ' },

  // Sections
  'section.overview': { en: 'OVERVIEW', km: 'ទិដ្ឋភាពទូទៅ' },
  'section.staff': { en: 'STAFF & ROSTERS', km: 'គ្រូ និងបុគ្គលិក' },
  'section.attendance': { en: 'TIME & ATTENDANCE', km: 'ម៉ោង និងវត្តមាន' },
  'section.communication': { en: 'COMMUNICATION & ANALYTICS', km: 'ទំនាក់ទំនង និងទិន្នន័យ' },
  'section.administration': { en: 'ADMINISTRATION', km: 'រដ្ឋបាល និងសុវត្ថិភាព' },

  // Common Statuses
  'status.present': { en: 'Present', km: 'មានវត្តមាន' },
  'status.late': { en: 'Late', km: 'មកយឺត' },
  'status.absent': { en: 'Absent', km: 'អវត្តមាន' },
  'status.leave': { en: 'On Leave', km: 'សុំច្បាប់' },
  'status.missingCheckout': { en: 'Missing Check-out', km: 'ខកខានស្កេនចេញ' },
  'status.checkedOut': { en: 'Checked Out', km: 'បានស្កេនចេញ' },
  'status.active': { en: 'Active', km: 'សកម្ម' },
  'status.inactive': { en: 'Inactive', km: 'អសកម្ម' },
  'status.pending': { en: 'Pending', km: 'រង់ចាំការពិនិត្យ' },
  'status.approved': { en: 'Approved', km: 'បានអនុម័ត' },
  'status.rejected': { en: 'Rejected', km: 'បានបដិសេធ' },
  'status.ontime': { en: 'On-time', km: 'ទាន់ពេលវេលា' },

  // Authentication
  'auth.login': { en: 'Sign In', km: 'ចូលប្រើប្រព័ន្ធ' },
  'auth.logout': { en: 'Log Out', km: 'ចាកចេញ' },
  'auth.signInGoogle': { en: 'Sign in with Google', km: 'ចូលប្រើតាមរយៈ Google' },
  'auth.orEmail': { en: 'Or sign in with email & password', km: 'ឬចូលប្រើដោយអ៊ីមែល និងពាក្យសម្ងាត់' },
  'auth.email': { en: 'Email address or Staff ID', km: 'អាសយដ្ឋានអ៊ីមែល ឬលេខកូដបុគ្គលិក' },
  'auth.password': { en: 'Password', km: 'ពាក្យសម្ងាត់' },
  'auth.confirmLogout': { en: 'Are you sure you want to log out?', km: 'តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?' },
  'auth.switchAccount': { en: 'Switch Account', km: 'ប្តូរគណនី' },
  'auth.welcomeBack': { en: 'Welcome back', km: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ' },
  'auth.institutionalLogin': { en: 'Faculty & Staff MIS Portal', km: 'ច្រកចូលប្រព័ន្ធកត់ត្រាវត្តមាន និងកាលវិភាគ' },

  // Header
  'header.kiosk': { en: 'Mobile Check-in Kiosk', km: 'ចំណុចស្កេនចល័ត' },
  'header.detectAbsences': { en: 'Detect Absences', km: 'ស្វែងរកអវត្តមាន' },
  'header.scanning': { en: 'Scanning...', km: 'កំពុងស្វែងរក...' },
  'header.telegram': { en: 'Telegram', km: 'តេឡេក្រាម' },
  'header.active': { en: 'Active', km: 'ដំណើរការ' },
  'header.muted': { en: 'Muted', km: 'បិទ' },
  'header.notifications': { en: 'Notifications & Alerts', km: 'ការជូនដំណឹង និងប្រកាស' },
  'header.markAllRead': { en: 'Mark all read', km: 'អានទាំងអស់' },
  'header.clear': { en: 'Clear', km: 'សម្អាត' },
  'header.noNotifications': { en: 'No notifications right now', km: 'មិនទាន់មានការជូនដំណឹងនៅឡើយ' },
  'header.switchRole': { en: 'Switch Test Account / Role (RBAC)', km: 'ប្តូរគណនីសាកល្បង (RBAC)' },
  'header.switchDesc': { en: 'Test how permissions filter views, departments, and editing rules.', km: 'សាកល្បងការកំណត់សិទ្ធិ តួនាទី និងការបែងចែកដេប៉ាតឺម៉ង់' },

  // Kiosk & Check-in
  'kiosk.title': { en: 'Staff Attendance Terminal', km: 'ចំណុចស្កេនវត្តមានគ្រូ និងបុគ្គលិក' },
  'kiosk.subtitle': { en: 'Check in or check out with instant GPS geofence verification and Telegram alert dispatch.', km: 'ស្កេនវត្តមានចូល-ចេញ ផ្ទៀងផ្ទាត់ទីតាំង GPS និងផ្ញើសារដំណឹងទៅតេឡេក្រាមភ្លាមៗ' },
  'kiosk.checkInBtn': { en: 'CHECK IN (ARRIVAL)', km: 'ស្កេនចូល (វត្តមាន)' },
  'kiosk.checkOutBtn': { en: 'CHECK OUT (DEPARTURE)', km: 'ស្កេនចេញ (បញ្ចប់ការងារ)' },
  'kiosk.selectStaff': { en: 'Select Teacher / Employee', km: 'ជ្រើសរើសគ្រូបង្រៀន ឬបុគ្គលិក' },
  'kiosk.gpsStatus': { en: 'GPS Geofence Status', km: 'ស្ថានភាពទីតាំង GPS សាលា' },
  'kiosk.onCampus': { en: 'Within Campus Perimeter', km: 'ស្ថិតក្នុងបរិវេណសាលា' },
  'kiosk.offCampus': { en: 'Outside Campus Perimeter', km: 'នៅក្រៅបរិវេណសាលា' },
  'kiosk.shiftMorning': { en: 'Morning Shift: 07:30 – 11:30', km: 'វេនព្រឹក៖ ០៧:៣០ – ១១:៣០' },
  'kiosk.shiftAfternoon': { en: 'Afternoon Shift: 13:30 – 17:00', km: 'វេនរសៀល៖ ១៣:៣០ – ១៧:០០' },
  'kiosk.timeSimTitle': { en: 'Attendance & GPS Simulation Controls', km: 'ផ្ទាំងសាកល្បងម៉ោង និងទីតាំង GPS' },
  'kiosk.timeSimDesc': { en: 'Simulate early, on-time, late, or geofence boundary tests', km: 'សាកល្បងចូលមុនម៉ោង ទាន់ម៉ោង មកយឺត ឬនៅក្រៅបរិវេណសាលា' },
  'kiosk.gpsBoundary': { en: 'GPS Campus Boundary', km: 'ដែនកំណត់ទីតាំង GPS' },
  'kiosk.timeSimulation': { en: 'Time Simulation', km: 'ការក្លែងធ្វើម៉ោង' },
  'kiosk.reset': { en: 'Reset', km: 'កំណត់ឡើងវិញ' },

  // Dashboard
  'dash.welcome': { en: 'Welcome back', km: 'សូមស្វាគមន៍' },
  'dash.todaySummary': { en: 'Today Attendance & Faculty Overview', km: 'ទិដ្ឋភាពទូទៅនៃវត្តមានគ្រូ និងបុគ្គលិកថ្ងៃនេះ' },
  'dash.totalStaff': { en: 'Total Rostered Staff', km: 'បុគ្គលិកសរុប' },
  'dash.present': { en: 'Present Today', km: 'វត្តមានថ្ងៃនេះ' },
  'dash.late': { en: 'Late Arrivals', km: 'មកយឺត' },
  'dash.absent': { en: 'Unexcused Absent', km: 'អវត្តមាន' },
  'dash.onLeave': { en: 'Approved Leave', km: 'សុំច្បាប់អនុញ្ញាត' },
  'dash.checkedOut': { en: 'Checked Out', km: 'បានស្កេនចេញ' },
  'dash.attendanceRate': { en: 'Attendance Rate', km: 'អត្រាវត្តមានសរុប' },
  'dash.filterDept': { en: 'Department', km: 'ដេប៉ាតឺម៉ង់' },
  'dash.filterStatus': { en: 'Attendance Status', km: 'ស្ថានភាពវត្តមាន' },
  'dash.filterDate': { en: 'Date', km: 'កាលបរិច្ឆេទ' },
  'dash.all': { en: 'All', km: 'ទាំងអស់' },
  'dash.recentCheckIns': { en: 'Recent Check-in Logs', km: 'កំណត់ត្រាវត្តមានថ្មីៗ' },
  'dash.viewAll': { en: 'View All Records', km: 'មើលកំណត់ត្រាទាំងអស់' },
  'dash.sendTelegram': { en: 'Send Daily Telegram Summary', km: 'ផ្ញើសេចក្តីសង្ខេបទៅតេឡេក្រាម' },
  'dash.scanAbsence': { en: 'Run Absence Scanner', km: 'ដំណើរការស្វែងរកអវត្តមាន' },
  'dash.quickCheckIn': { en: 'Quick Check-in', km: 'ស្កេនវត្តមានរហ័ស' },

  // Staff Lists (Teachers & Employees)
  'staff.teachersTitle': { en: 'Faculty & Teachers Roster', km: 'បញ្ជីរាយនាមគ្រូបង្រៀន' },
  'staff.teachersDesc': { en: 'Manage academic faculty profiles, schedules, and Telegram integration.', km: 'គ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន កាលវិភាគបង្រៀន និងគណនីតេឡេក្រាម' },
  'staff.employeesTitle': { en: 'Administrative & Support Staff', km: 'បញ្ជីរាយនាមបុគ្គលិកទូទៅ' },
  'staff.employeesDesc': { en: 'Manage non-academic staff profiles, assigned departments, and shift schedules.', km: 'គ្រប់គ្រងបុគ្គលិករដ្ឋបាល និងជំនួយការ តាមដេប៉ាតឺម៉ង់ និងវេនការងារ' },
  'staff.addTeacher': { en: 'Add Teacher', km: 'បន្ថែមគ្រូបង្រៀន' },
  'staff.addEmployee': { en: 'Add Employee', km: 'បន្ថែមបុគ្គលិក' },
  'staff.exportRoster': { en: 'Export Roster (CSV)', km: 'ទាញយកបញ្ជី (CSV)' },
  'staff.search': { en: 'Search by name, ID, or subject...', km: 'ស្វែងរកតាមឈ្មោះ អត្តលេខ ឬមុខវិជ្ជា...' },
  'staff.name': { en: 'Staff Member', km: 'ឈ្មោះបុគ្គលិក' },
  'staff.department': { en: 'Department', km: 'ដេប៉ាតឺម៉ង់ / ផ្នែក' },
  'staff.schedule': { en: 'Schedule', km: 'កាលវិភាគ' },
  'staff.contact': { en: 'Contact & Telegram', km: 'ទំនាក់ទំនង & តេឡេក្រាម' },
  'staff.status': { en: 'Status', km: 'ស្ថានភាព' },
  'staff.actions': { en: 'Actions', km: 'សកម្មភាព' },

  // Schedules
  'sched.title': { en: 'Faculty & Staff Work Schedules', km: 'កាលវិភាគការងាររបស់គ្រូ និងបុគ្គលិក' },
  'sched.desc': { en: 'Define teaching shifts, administrative office hours, grace periods, and absence thresholds.', km: 'កំណត់វេនបង្រៀន ម៉ោងធ្វើការ ម៉ោងអនុគ្រោះ និងលក្ខខណ្ឌអវត្តមាន' },
  'sched.create': { en: 'Create Schedule', km: 'បង្កើតកាលវិភាគថ្មី' },
  'sched.cardsView': { en: 'Schedule Cards', km: 'កាតកាលវិភាគ' },
  'sched.gridView': { en: 'Weekly Timetable Grid', km: 'តារាងប្រចាំសប្តាហ៍' },
  'sched.gracePeriod': { en: 'Grace Period', km: 'ម៉ោងអនុគ្រោះ' },
  'sched.minutes': { en: 'minutes', km: 'នាទី' },
  'sched.location': { en: 'Location', km: 'ទីតាំង' },

  // Leave & Holidays
  'leave.title': { en: 'Leave Requests & Approvals', km: 'ការស្នើសុំ និងអនុម័តច្បាប់ឈប់សម្រាក' },
  'leave.desc': { en: 'Review and approve absence permissions for teachers and staff.', km: 'ពិនិត្យ និងអនុម័តការសុំច្បាប់ឈប់សម្រាករបស់គ្រូ និងបុគ្គលិក' },
  'leave.apply': { en: 'Apply for Leave', km: 'ស្នើសុំច្បាប់ឈប់សម្រាក' },
  'holidays.title': { en: 'School & National Holidays', km: 'ប្រតិទិនថ្ងៃបុណ្យជាតិ និងឈប់សម្រាកសាលា' },
  'holidays.desc': { en: 'Official Cambodian holidays automatically exempt attendance detection.', km: 'ថ្ងៃឈប់សម្រាកផ្លូវការនឹងលើកលែងការកត់ត្រាអវត្តមានដោយស្វ័យប្រវត្តិ' },
  'holidays.add': { en: 'Add Holiday', km: 'បន្ថែមថ្ងៃឈប់សម្រាក' },

  // Reports & Telegram
  'reports.title': { en: 'Attendance Analytics & Export', km: 'របាយការណ៍ និងការទាញយកទិន្នន័យវត្តមាន' },
  'reports.desc': { en: 'Detailed monthly attendance reports, late statistics, and export to CSV/Excel.', km: 'របាយការណ៍វត្តមានប្រចាំខែ ស្ថិតិមកយឺត និងទាញយកជាឯកសារ Excel/CSV' },
  'telegram.title': { en: 'Telegram Bot Integration & Alerts', km: 'ការតភ្ជាប់តេឡេក្រាម Bot និងការជូនដំណឹង' },
  'telegram.desc': { en: 'Automated attendance dispatch engine, alert triggers, and interactive bot commands.', km: 'ប្រព័ន្ធផ្ញើសារស្វ័យប្រវត្តិតាមតេឡេក្រាម និងផ្ទាំងសាកល្បងបញ្ជា Bot' },

  // User & RBAC
  'rbac.title': { en: 'Users, Roles & Permission System', km: 'ប្រព័ន្ធគ្រប់គ្រងអ្នកប្រើប្រាស់ តួនាទី និងសិទ្ធិ (RBAC)' },
  'rbac.desc': { en: 'Role-based access control with granular permission configuration.', km: 'ការកំណត់សិទ្ធិលម្អិតតាមតួនាទីនីមួយៗ' },
  'rbac.usersTab': { en: 'Users', km: 'អ្នកប្រើប្រាស់' },
  'rbac.matrixTab': { en: 'Permission Matrix', km: 'ម៉ាទ្រីសកំណត់សិទ្ធិ' },
  'rbac.addUser': { en: 'Add User', km: 'បង្កើតគណនីថ្មី' },

  // Settings & Audit
  'audit.title': { en: 'System Audit & Compliance Log', km: 'កំណត់ត្រាសវនកម្ម និងសុវត្ថិភាពប្រព័ន្ធ' },
  'audit.desc': { en: 'Immutable record of staff check-ins, manual modifications, and policy changes.', km: 'កំណត់ត្រាសកម្មភាពសំខាន់ៗ ការកែប្រែទិន្នន័យ និងសុវត្ថិភាព' },
  'settings.title': { en: 'System & Organization Settings', km: 'ការកំណត់ស្ថាប័ន និងប្រព័ន្ធ' },
  'settings.desc': { en: 'School branding, GPS coordinates, grace periods, and data backup.', km: 'ព័ត៌មានសាលា កូអរដោនេ GPS ម៉ោងអនុគ្រោះ និងការបម្រុងទុកទិន្នន័យ' },

  // Common UI actions
  'btn.save': { en: 'Save', km: 'រក្សាទុក' },
  'btn.cancel': { en: 'Cancel', km: 'បោះបង់' },
  'btn.delete': { en: 'Delete', km: 'លុប' },
  'btn.edit': { en: 'Edit', km: 'កែប្រែ' },
  'btn.close': { en: 'Close', km: 'បិទ' },
  'btn.export': { en: 'Export', km: 'ទាញយក' },
  'btn.submit': { en: 'Submit', km: 'ដាក់ស្នើ' },
  'btn.approve': { en: 'Approve', km: 'អនុម័ត' },
  'btn.reject': { en: 'Reject', km: 'បដិសេធ' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
  isKhmer: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('edutrack_language');
    return saved === 'en' || saved === 'km' ? saved : 'km'; // Default to Khmer as requested
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('edutrack_language', lang);
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'km' ? 'en' : 'km');
  };

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'km') {
      document.body.classList.add('font-khmer');
    } else {
      document.body.classList.remove('font-khmer');
    }
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    if (translations[key]) {
      return translations[key][language] || defaultText || key;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isKhmer: language === 'km'
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
