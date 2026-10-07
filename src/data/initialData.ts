import {
  RoleDefinition,
  UserAccount,
  TimetablePeriod,
  Department,
  WorkLocation,
  TelegramSettings,
  SystemSettings,
  Teacher,
  Employee,
  Schedule,
  TeacherSubjectSchedule
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
      'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete',
      'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
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
    id: 'usr-admin-planning',
    email: 'planningtks585@gmail.com',
    fullName: 'Planning Admin',
    khmerName: 'អ្នកគ្រប់គ្រងផែនការ',
    role: 'super_admin',
    department: 'Administration',
    phone: '+855 12 777 666',
    pinCode: '1234',
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
    phone: '+855 12 555 444',
    pinCode: '1234',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-tch-001',
    email: 'sok.dara@heartschool.edu.kh',
    fullName: 'Sok Dara',
    khmerName: 'សុខ តារា',
    role: 'teacher',
    personId: 'tch-001',
    department: 'Academic & Curriculum',
    phone: '+855 12 345 678',
    pinCode: '1234',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-emp-001',
    email: 'chea.sambath@heartschool.edu.kh',
    fullName: 'Chea Sambath',
    khmerName: 'ជា សម្បត្តិ',
    role: 'employee',
    personId: 'emp-001',
    department: 'Administration',
    phone: '+855 12 111 222',
    pinCode: '1234',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'tch-001',
    teacherId: 'TCH-2026-001',
    employeeId: 'EMP-101',
    fullName: 'Sok Dara',
    khmerName: 'សុខ តារា',
    englishName: 'Sok Dara',
    gender: 'Male',
    dateOfBirth: '1988-05-12',
    phone: '+855 12 345 678',
    email: 'sok.dara@heartschool.edu.kh',
    telegramChatId: '5252354054',
    telegramUsername: '@sokdara_tch',
    department: 'Academic & Curriculum',
    position: 'Senior Mathematics Teacher',
    subject: 'Mathematics',
    employmentType: 'Full-time',
    joinDate: '2023-01-15',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    status: 'Active',
    assignedLocation: 'Main Campus',
    assignedScheduleId: 'sch-teacher-morning',
    hourlyRate: 20,
    currency: 'USD',
    pinCode: '1234'
  },
  {
    id: 'tch-002',
    teacherId: 'TCH-2026-002',
    employeeId: 'EMP-102',
    fullName: 'Chan Bopha',
    khmerName: 'ចាន់ បុប្ផា',
    englishName: 'Chan Bopha',
    gender: 'Female',
    dateOfBirth: '1992-08-20',
    phone: '+855 12 888 999',
    email: 'chan.bopha@heartschool.edu.kh',
    telegramChatId: '5252354054',
    telegramUsername: '@bopha_chan',
    department: 'Academic & Curriculum',
    position: 'English Language Teacher',
    subject: 'English Literature',
    employmentType: 'Full-time',
    joinDate: '2023-08-01',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    status: 'Active',
    assignedLocation: 'Main Campus',
    assignedScheduleId: 'sch-teacher-morning',
    hourlyRate: 18,
    currency: 'USD',
    pinCode: '1234'
  },
  {
    id: 'tch-003',
    teacherId: 'TCH-2026-003',
    employeeId: 'EMP-103',
    fullName: 'Vannak Heng',
    khmerName: 'ហេង វណ្ណៈ',
    englishName: 'Vannak Heng',
    gender: 'Male',
    dateOfBirth: '1990-11-04',
    phone: '+855 12 444 333',
    email: 'vannak.heng@heartschool.edu.kh',
    telegramChatId: '5252354054',
    telegramUsername: '@vannak_heng',
    department: 'Academic & Curriculum',
    position: 'Physics & Science Teacher',
    subject: 'Physics',
    employmentType: 'Full-time',
    joinDate: '2024-01-10',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    status: 'Active',
    assignedLocation: 'Main Campus',
    assignedScheduleId: 'sch-teacher-afternoon',
    hourlyRate: 22,
    currency: 'USD',
    pinCode: '1234'
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    employeeId: 'EMP-201',
    fullName: 'Chea Sambath',
    khmerName: 'ជា សម្បត្តិ',
    phone: '+855 12 111 222',
    email: 'chea.sambath@heartschool.edu.kh',
    telegramChatId: '5252354054',
    department: 'Administration',
    position: 'Administrative Coordinator',
    supervisor: 'Planning Admin',
    employmentType: 'Full-time',
    joinDate: '2022-09-01',
    workLocation: 'Main Campus',
    assignedScheduleId: 'sch-admin-standard',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    pinCode: '1234'
  },
  {
    id: 'emp-002',
    employeeId: 'EMP-202',
    fullName: 'Keo Sophea',
    khmerName: 'កែវ សុភា',
    phone: '+855 12 222 333',
    email: 'keo.sophea@heartschool.edu.kh',
    telegramChatId: '5252354054',
    department: 'Finance & Accounting',
    position: 'Accountant & Cashier',
    supervisor: 'Planning Admin',
    employmentType: 'Full-time',
    joinDate: '2023-03-15',
    workLocation: 'Main Campus',
    assignedScheduleId: 'sch-admin-standard',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    pinCode: '1234'
  },
  {
    id: 'emp-003',
    employeeId: 'EMP-203',
    fullName: 'Pov Bunthoeun',
    khmerName: 'ពៅ ប៊ុនធឿន',
    phone: '+855 12 333 444',
    email: 'pov.bunthoeun@heartschool.edu.kh',
    telegramChatId: '5252354054',
    department: 'Student Affairs',
    position: 'Student Affairs Officer',
    supervisor: 'Planning Admin',
    employmentType: 'Full-time',
    joinDate: '2023-06-01',
    workLocation: 'Main Campus',
    assignedScheduleId: 'sch-admin-standard',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    pinCode: '1234'
  }
];

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'sch-admin-standard',
    name: 'Administrative Staff Schedule (Full Day)',
    khmerName: 'កាលវិភាគបុគ្គលិករដ្ឋបាល (ពេញមួយថ្ងៃ)',
    department: 'Administration',
    targetType: 'Standard',
    assignedPersonIds: ['emp-001', 'emp-002', 'emp-003'],
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    startTime: '08:00',
    endTime: '12:00',
    breakStart: '12:00',
    breakEnd: '13:30',
    afternoonStartTime: '13:30',
    afternoonEndTime: '17:30',
    gracePeriodMinutes: 15,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus',
    workLocation: 'Main Campus',
    isActive: true,
    color: '#4F46E5'
  },
  {
    id: 'sch-teacher-morning',
    name: 'Academic Morning Shift',
    khmerName: 'វេនព្រឹកផ្នែកសិក្សាធិការ',
    department: 'Academic & Curriculum',
    targetType: 'Standard',
    assignedPersonIds: ['tch-001', 'tch-002'],
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    startTime: '07:30',
    endTime: '11:30',
    gracePeriodMinutes: 15,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus',
    workLocation: 'Main Campus',
    isActive: true,
    color: '#0284C7'
  },
  {
    id: 'sch-teacher-afternoon',
    name: 'Academic Afternoon Shift',
    khmerName: 'វេនរសៀលផ្នែកសិក្សាធិការ',
    department: 'Academic & Curriculum',
    targetType: 'Standard',
    assignedPersonIds: ['tch-003'],
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    startTime: '13:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus',
    workLocation: 'Main Campus',
    isActive: true,
    color: '#059669'
  }
];

export const DEFAULT_TIMETABLE_PERIODS: TimetablePeriod[] = [
  {
    id: 'per-1',
    periodNumber: 1,
    periodName: 'Period 1',
    khmerPeriodName: 'ម៉ោងទី ១',
    startTime: '07:30',
    endTime: '09:00',
    sessionType: 'Morning',
    isBreak: false,
    durationMinutes: 90,
    description: 'Morning Instruction Session 1',
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'per-break-am',
    periodNumber: 91,
    periodName: 'Morning Break',
    khmerPeriodName: 'សម្រាកពេលព្រឹក',
    startTime: '09:00',
    endTime: '09:15',
    sessionType: 'Break',
    isBreak: true,
    durationMinutes: 15,
    description: 'Morning Student & Faculty Recess',
    color: '#D97706',
    isActive: true
  },
  {
    id: 'per-2',
    periodNumber: 2,
    periodName: 'Period 2',
    khmerPeriodName: 'ម៉ោងទី ២',
    startTime: '09:15',
    endTime: '10:45',
    sessionType: 'Morning',
    isBreak: false,
    durationMinutes: 90,
    description: 'Morning Instruction Session 2',
    color: '#0284C7',
    isActive: true
  },
  {
    id: 'per-3',
    periodNumber: 3,
    periodName: 'Period 3',
    khmerPeriodName: 'ម៉ោងទី ៣',
    startTime: '10:45',
    endTime: '12:00',
    sessionType: 'Morning',
    isBreak: false,
    durationMinutes: 75,
    description: 'Midday Instruction Session 3',
    color: '#059669',
    isActive: true
  },
  {
    id: 'per-break-lunch',
    periodNumber: 92,
    periodName: 'Lunch Break',
    khmerPeriodName: 'សម្រាកអាហារថ្ងៃត្រង់',
    startTime: '12:00',
    endTime: '13:30',
    sessionType: 'Break',
    isBreak: true,
    durationMinutes: 90,
    description: 'Lunch & Faculty Rest Hour',
    color: '#D97706',
    isActive: true
  },
  {
    id: 'per-4',
    periodNumber: 4,
    periodName: 'Period 4',
    khmerPeriodName: 'ម៉ោងទី ៤',
    startTime: '13:30',
    endTime: '15:00',
    sessionType: 'Afternoon',
    isBreak: false,
    durationMinutes: 90,
    description: 'Afternoon Instruction Session 4',
    color: '#7C3AED',
    isActive: true
  },
  {
    id: 'per-break-pm',
    periodNumber: 93,
    periodName: 'Afternoon Break',
    khmerPeriodName: 'សម្រាកពេលរសៀល',
    startTime: '15:00',
    endTime: '15:15',
    sessionType: 'Break',
    isBreak: true,
    durationMinutes: 15,
    description: 'Afternoon Short Recess',
    color: '#D97706',
    isActive: true
  },
  {
    id: 'per-5',
    periodNumber: 5,
    periodName: 'Period 5',
    khmerPeriodName: 'ម៉ោងទី ៥',
    startTime: '15:15',
    endTime: '16:45',
    sessionType: 'Afternoon',
    isBreak: false,
    durationMinutes: 90,
    description: 'Afternoon Instruction Session 5',
    color: '#E11D48',
    isActive: true
  }
];

export const DEFAULT_SUBJECT_SCHEDULES: TeacherSubjectSchedule[] = [
  {
    id: 'sub-sch-001',
    teacherId: 'tch-001',
    teacherName: 'Sok Dara',
    khmerTeacherName: 'សុខ តារា',
    subject: 'Advanced Mathematics',
    khmerSubject: 'គណិតវិទ្យាកម្រិតខ្ពស់',
    subjectCode: 'MATH-12',
    gradeClass: 'Grade 12A',
    room: 'Room 201',
    dayOfWeek: 1, // Monday
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    periodNumber: 1,
    periodName: 'Period 1 (07:30 - 09:00)',
    startTime: '07:30',
    endTime: '09:00',
    gracePeriodMinutes: 15,
    hourlyRate: 20,
    currency: 'USD',
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sub-sch-002',
    teacherId: 'tch-001',
    teacherName: 'Sok Dara',
    khmerTeacherName: 'សុខ តារា',
    subject: 'Geometry & Calculus',
    khmerSubject: 'ធរណីមាត្រ និងគណិតវិភាគ',
    subjectCode: 'MATH-11',
    gradeClass: 'Grade 11B',
    room: 'Room 202',
    dayOfWeek: 2, // Tuesday
    daysOfWeek: [2, 4, 6], // Tue, Thu, Sat
    periodNumber: 2,
    periodName: 'Period 2 (09:15 - 10:45)',
    startTime: '09:15',
    endTime: '10:45',
    gracePeriodMinutes: 15,
    hourlyRate: 20,
    currency: 'USD',
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sub-sch-003',
    teacherId: 'tch-002',
    teacherName: 'Chan Bopha',
    khmerTeacherName: 'ចាន់ បុប្ផា',
    subject: 'English Communication',
    khmerSubject: 'ទំនាក់ទំនងភាសាអង់គ្លេស',
    subjectCode: 'ENG-10',
    gradeClass: 'Grade 10A',
    room: 'Room 105',
    dayOfWeek: 1, // Monday
    daysOfWeek: [1, 2, 3, 4, 5],
    periodNumber: 2,
    periodName: 'Period 2 (09:15 - 10:45)',
    startTime: '09:15',
    endTime: '10:45',
    gracePeriodMinutes: 15,
    hourlyRate: 18,
    currency: 'USD',
    color: '#0284C7',
    isActive: true
  },
  {
    id: 'sub-sch-004',
    teacherId: 'tch-003',
    teacherName: 'Vannak Heng',
    khmerTeacherName: 'ហេង វណ្ណៈ',
    subject: 'General Physics',
    khmerSubject: 'រូបវិទ្យាទូទៅ',
    subjectCode: 'PHYS-12',
    gradeClass: 'Grade 12B',
    room: 'Lab 01',
    dayOfWeek: 1,
    daysOfWeek: [1, 3, 5],
    periodNumber: 4,
    periodName: 'Period 4 (13:30 - 15:00)',
    startTime: '13:30',
    endTime: '15:00',
    gracePeriodMinutes: 15,
    hourlyRate: 22,
    currency: 'USD',
    color: '#059669',
    isActive: true
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
  },
  {
    id: 'loc-2',
    name: 'Campus 2',
    address: 'Norodom Blvd, Phnom Penh, Cambodia',
    latitude: 11.5564,
    longitude: 104.9282,
    radiusMeters: 500,
    isActive: false
  }
];

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  id: 'tg-default',
  botToken: '8662747303:AAFC0F7-WDiUe80ZjFVMZKDf2zZbXKCAIfg',
  botUsername: '@hschoolsiamreap_bot',
  adminChatId: '-5252354054',
  groupChatId: '-5171679529',
  isEnabled: true,
  notifyCheckIn: true,
  notifyLate: true,
  notifyAbsent: true,
  notifyCheckOut: true,
  notifyDailySummary: true,
  notifyReminder: true,
  reminderMinutesBefore: 15,
  summaryTime: '17:30',
  autoBackupEnabled: true,
  autoBackupTime: '20:00',
  autoBackupFrequency: 'daily',
  autoBackupTarget: 'group'
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'sys-default',
  organizationName: 'Heart School',
  khmerOrgName: 'សាលា ហាថ',
  academicYear: '2026-2027',
  academicStartDate: '2026-09-01',
  academicEndDate: '2027-06-30',
  currentSemester: 'Semester 1',
  semesterStartDate: '2026-09-01',
  semesterEndDate: '2027-01-31',
  tagline: 'Heart School - Excellence in Education',
  timezone: 'Asia/Phnom Penh',
  workingDays: [1, 2, 3, 4, 5, 6],
  defaultGracePeriod: 15,
  defaultGracePeriodMinutes: 30,
  absenceDetectionMinutes: 60,
  defaultLocationLatitude: 11.5564,
  defaultLocationLongitude: 104.9282,
  geofenceRadiusMeters: 500,
  enforceGeofence: false,
  allowSelfCorrection: true,
  requirePinForKiosk: true,
  allowSwitchStaffInKiosk: false,
  requireBarcodeScanOnly: false,
  enableAutoCheckOut: true,
  autoCheckOutPolicy: 'scheduled_end',
  autoCheckOutBufferMinutes: 15,
  autoCheckOutDailyTime: '17:30',
  preventDuplicateScanMinutes: 10
};
