import {
  RoleDefinition,
  UserAccount,
  TimetablePeriod,
  Department,
  WorkLocation,
  TelegramSettings,
  SystemSettings
} from '../types/index.ts';

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-superadmin',
    name: 'Super Admin',
    code: 'super_admin',
    description: 'Full unconstrained system administration and governance.',
    isSystem: true,
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
      'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete',
      'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
      'schedules.view', 'schedules.create', 'schedules.edit', 'schedules.delete',
      'attendance.view', 'attendance.checkin', 'attendance.checkout', 'attendance.edit', 'attendance.approve', 'attendance.delete',
      'reports.view', 'reports.export',
      'telegram.view', 'telegram.configure',
      'notifications.send',
      'audit.view',
      'settings.manage'
    ]
  },
  {
    id: 'role-adminhr',
    name: 'Admin / HR',
    code: 'admin_hr',
    description: 'Manages staff profiles, schedules, attendance monitoring, and reports.',
    isSystem: true,
    permissions: [
      'teachers.view', 'teachers.create', 'teachers.edit',
      'employees.view', 'employees.create', 'employees.edit',
      'schedules.view', 'schedules.create', 'schedules.edit',
      'attendance.view', 'attendance.checkin', 'attendance.checkout', 'attendance.edit', 'attendance.approve',
      'reports.view', 'reports.export',
      'notifications.send',
      'audit.view'
    ]
  },
  {
    id: 'role-supervisor',
    name: 'Supervisor / Dept Manager',
    code: 'supervisor',
    description: 'Supervises assigned department staff, schedules, and approves attendance corrections.',
    isSystem: true,
    permissions: [
      'teachers.view',
      'employees.view',
      'schedules.view', 'schedules.create', 'schedules.edit',
      'attendance.view', 'attendance.approve',
      'reports.view'
    ]
  },
  {
    id: 'role-teacher',
    name: 'Teacher',
    code: 'teacher',
    description: 'Academic instructor with personal schedule, check-in/out, and attendance history.',
    isSystem: true,
    permissions: [
      'schedules.view',
      'attendance.checkin', 'attendance.checkout', 'attendance.view'
    ]
  },
  {
    id: 'role-employee',
    name: 'Employee',
    code: 'employee',
    description: 'School non-teaching staff with personal check-in/out and duty times.',
    isSystem: true,
    permissions: [
      'schedules.view',
      'attendance.checkin', 'attendance.checkout', 'attendance.view'
    ]
  }
];

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-admin-ktasa',
    email: 'ktasa7038@gmail.com',
    fullName: 'Super Administrator',
    khmerName: 'អភិបាលប្រព័ន្ធកំពូល',
    role: 'super_admin',
    department: 'Administration',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-admin-planning',
    email: 'planningtks585@gmail.com',
    fullName: 'Planning Admin',
    khmerName: 'អ្នកគ្រប់គ្រងផែនការ',
    role: 'super_admin',
    department: 'Administration',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-admin-singsa',
    email: 'singsabmc@gmail.com',
    fullName: 'Principal Singsa',
    khmerName: 'នាយកសាលា',
    role: 'super_admin',
    department: 'Administration',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'dept-academic',
    name: 'Academic & Curriculum',
    khmerName: 'ផ្នែកសិក្សាធិការ និងកម្មវិធីសិក្សា',
    code: 'ACAD',
    description: 'Faculty management, subject curriculum, and instructional scheduling.',
    managerName: 'Academic Director'
  },
  {
    id: 'dept-admin',
    name: 'Administration',
    khmerName: 'ផ្នែករដ្ឋបាលទូទៅ',
    code: 'ADMIN',
    description: 'School institutional operations, registry, and governance.',
    managerName: 'School Administrator'
  },
  {
    id: 'dept-hr',
    name: 'Human Resources',
    khmerName: 'ផ្នែកធនធានមនុស្ស',
    code: 'HR',
    description: 'Staff payroll, records, compliance, and contracts.',
    managerName: 'HR Manager'
  },
  {
    id: 'dept-student-affairs',
    name: 'Student Affairs',
    khmerName: 'ផ្នែកកិច្ចការសិស្ស',
    code: 'SA',
    description: 'Student discipline, counselling, and campus activities.',
    managerName: 'Student Affairs Officer'
  },
  {
    id: 'dept-finance',
    name: 'Finance & Accounting',
    khmerName: 'ផ្នែកគណនេយ្យ និងហិរញ្ញវត្ថុ',
    code: 'FIN',
    description: 'Institutional budget, accounting, and cashier operations.',
    managerName: 'Chief Accountant'
  }
];

export const DEFAULT_LOCATIONS: WorkLocation[] = [
  {
    id: 'loc-main',
    name: 'Main Campus',
    address: 'Norodom Blvd, Phnom Penh, Cambodia',
    latitude: 11.5564,
    longitude: 104.9282,
    radiusMeters: 500,
    isActive: true
  }
];

export const DEFAULT_TIMETABLE_PERIODS: TimetablePeriod[] = [
  {
    id: 'period-1',
    periodNumber: 1,
    periodName: 'Period 1',
    khmerPeriodName: 'ម៉ោងទី ១',
    startTime: '07:00',
    endTime: '07:45',
    isBreak: false,
    sessionType: 'Morning'
  },
  {
    id: 'period-2',
    periodNumber: 2,
    periodName: 'Period 2',
    khmerPeriodName: 'ម៉ោងទី ២',
    startTime: '07:50',
    endTime: '08:35',
    isBreak: false,
    sessionType: 'Morning'
  },
  {
    id: 'period-3',
    periodNumber: 3,
    periodName: 'Period 3',
    khmerPeriodName: 'ម៉ោងទី ៣',
    startTime: '08:45',
    endTime: '09:30',
    isBreak: false,
    sessionType: 'Morning'
  },
  {
    id: 'period-4',
    periodNumber: 4,
    periodName: 'Period 4',
    khmerPeriodName: 'ម៉ោងទី ៤',
    startTime: '09:35',
    endTime: '10:20',
    isBreak: false,
    sessionType: 'Morning'
  },
  {
    id: 'period-5',
    periodNumber: 5,
    periodName: 'Period 5',
    khmerPeriodName: 'ម៉ោងទី ៥',
    startTime: '10:30',
    endTime: '11:15',
    isBreak: false,
    sessionType: 'Morning'
  },
  {
    id: 'period-6',
    periodNumber: 6,
    periodName: 'Period 6',
    khmerPeriodName: 'ម៉ោងទី ៦',
    startTime: '13:00',
    endTime: '13:45',
    isBreak: false,
    sessionType: 'Afternoon'
  },
  {
    id: 'period-7',
    periodNumber: 7,
    periodName: 'Period 7',
    khmerPeriodName: 'ម៉ោងទី ៧',
    startTime: '13:50',
    endTime: '14:35',
    isBreak: false,
    sessionType: 'Afternoon'
  },
  {
    id: 'period-8',
    periodNumber: 8,
    periodName: 'Period 8',
    khmerPeriodName: 'ម៉ោងទី ៨',
    startTime: '14:45',
    endTime: '15:30',
    isBreak: false,
    sessionType: 'Afternoon'
  },
  {
    id: 'period-9',
    periodNumber: 9,
    periodName: 'Period 9',
    khmerPeriodName: 'ម៉ោងទី ៩',
    startTime: '15:35',
    endTime: '16:20',
    isBreak: false,
    sessionType: 'Afternoon'
  },
  {
    id: 'period-10',
    periodNumber: 10,
    periodName: 'Period 10',
    khmerPeriodName: 'ម៉ោងទី ១០',
    startTime: '16:30',
    endTime: '17:15',
    isBreak: false,
    sessionType: 'Afternoon'
  }
];

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  id: 'tg-default',
  botToken: '',
  botUsername: '',
  adminChatId: '',
  groupChatId: '',
  isEnabled: false,
  notifyCheckIn: true,
  notifyLate: true,
  notifyAbsent: true,
  notifyCheckOut: true,
  notifyDailySummary: false,
  notifyReminder: true,
  reminderMinutesBefore: 15,
  summaryTime: '17:30'
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'sys-default',
  organizationName: 'Phnom Penh Academy',
  khmerOrgName: 'សាលាអន្តរជាតិភ្នំពេញ',
  tagline: 'Phnom Penh International Academy',
  timezone: 'Asia/Phnom Penh',
  workingDays: [1, 2, 3, 4, 5, 6],
  defaultGracePeriod: 15,
  absenceDetectionMinutes: 60,
  defaultLocationLatitude: 11.5564,
  defaultLocationLongitude: 104.9282,
  geofenceRadiusMeters: 500,
  enforceGeofence: false,
  allowSelfCorrection: true
};
