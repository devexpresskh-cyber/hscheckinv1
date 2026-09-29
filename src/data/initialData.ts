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
    id: 'usr-admin-ktasa',
    email: 'ktasa7038@gmail.com',
    fullName: 'Super Administrator',
    khmerName: 'អភិបាលប្រព័ន្ធកំពូល',
    role: 'super_admin',
    department: 'Administration',
    phone: '+855 12 888 999',
    pinCode: '1234',
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
    email: 'sok.chenda@edutrack.edu.kh',
    fullName: 'Sok Chenda',
    khmerName: 'សុខ ចិន្តា',
    role: 'teacher',
    department: 'Academic & Curriculum',
    phone: '+855 12 345 678',
    personId: 'tch-001',
    status: 'Active',
    pinCode: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-tch-002',
    email: 'chann.borey@edutrack.edu.kh',
    fullName: 'Chann Borey',
    khmerName: 'ចាន់ បូរី',
    role: 'teacher',
    department: 'Academic & Curriculum',
    phone: '+855 11 987 654',
    personId: 'tch-002',
    status: 'Active',
    pinCode: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-tch-003',
    email: 'keo.piseth@edutrack.edu.kh',
    fullName: 'Keo Piseth',
    khmerName: 'កែវ ពិសិដ្ឋ',
    role: 'teacher',
    department: 'Academic & Curriculum',
    phone: '+855 92 888 777',
    personId: 'tch-003',
    status: 'Active',
    pinCode: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-emp-001',
    email: 'heng.sophea@edutrack.edu.kh',
    fullName: 'Heng Sophea',
    khmerName: 'ហេង សុភា',
    role: 'employee',
    department: 'Administration',
    phone: '+855 12 654 321',
    personId: 'emp-001',
    status: 'Active',
    pinCode: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'tch-001',
    teacherId: 'TCH-2026-001',
    employeeId: 'EMP-101',
    fullName: 'Sok Chenda',
    khmerName: 'សុខ ចិន្តា',
    gender: 'Female',
    department: 'Academic & Curriculum',
    position: 'Senior Mathematics Lecturer',
    subject: 'Advanced Mathematics',
    phone: '+855 12 345 678',
    email: 'sok.chenda@edutrack.edu.kh',
    telegramUsername: '@sok_chenda',
    employmentType: 'Full-time',
    status: 'Active',
    joinDate: '2022-01-15',
    assignedLocation: 'Main Campus - Central Building',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    assignedScheduleId: 'sch-standard-fulltime',
    hourlyRate: 25.00,
    currency: 'USD',
    pinCode: '1234'
  },
  {
    id: 'tch-002',
    teacherId: 'TCH-2026-002',
    employeeId: 'EMP-102',
    fullName: 'Chann Borey',
    khmerName: 'ចាន់ បូរី',
    gender: 'Male',
    department: 'Academic & Curriculum',
    position: 'Associate Professor',
    subject: 'Khmer Literature & History',
    phone: '+855 11 987 654',
    email: 'chann.borey@edutrack.edu.kh',
    telegramUsername: '@chann_borey',
    employmentType: 'Full-time',
    status: 'Active',
    joinDate: '2021-08-01',
    assignedLocation: 'Main Campus - Central Building',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    assignedScheduleId: 'sch-standard-fulltime',
    hourlyRate: 22.00,
    currency: 'USD',
    pinCode: '1234'
  },
  {
    id: 'tch-003',
    teacherId: 'TCH-2026-003',
    employeeId: 'EMP-103',
    fullName: 'Keo Piseth',
    khmerName: 'កែវ ពិសិដ្ឋ',
    gender: 'Male',
    department: 'Academic & Curriculum',
    position: 'Lecturer & Lab Instructor',
    subject: 'Computer Science & IT',
    phone: '+855 92 888 777',
    email: 'keo.piseth@edutrack.edu.kh',
    telegramUsername: '@keo_piseth',
    employmentType: 'Full-time',
    status: 'Active',
    joinDate: '2023-03-10',
    assignedLocation: 'Main Campus - Central Building',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    assignedScheduleId: 'sch-standard-fulltime',
    hourlyRate: 28.00,
    currency: 'USD',
    pinCode: '1234'
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    employeeId: 'EMP-2026-001',
    fullName: 'Heng Sophea',
    khmerName: 'ហេង សុភា',
    phone: '+855 12 654 321',
    email: 'heng.sophea@edutrack.edu.kh',
    telegramChatId: '',
    department: 'Administration',
    position: 'Administrative Coordinator',
    supervisor: 'Super Administrator',
    employmentType: 'Full-time',
    joinDate: '2023-01-10',
    workLocation: 'Main Campus - Central Building',
    assignedScheduleId: 'sch-standard-fulltime',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    pinCode: '1234'
  },
  {
    id: 'emp-002',
    employeeId: 'EMP-2026-002',
    fullName: 'Ly Chantha',
    khmerName: 'លី ចាន់ថា',
    phone: '+855 16 111 222',
    email: 'ly.chantha@edutrack.edu.kh',
    telegramChatId: '',
    department: 'Academic & Curriculum',
    position: 'Academic Affairs Officer',
    supervisor: 'Principal Singsa',
    employmentType: 'Full-time',
    joinDate: '2022-09-01',
    workLocation: 'Main Campus - Central Building',
    assignedScheduleId: 'sch-standard-fulltime',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    pinCode: '1234'
  }
];

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'sch-standard-fulltime',
    name: 'Standard Morning Shift',
    khmerName: 'វេនព្រឹកស្តង់ដារ',
    department: 'Academic & Curriculum',
    targetType: 'Standard',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '07:30',
    endTime: '11:30',
    gracePeriodMinutes: 15,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus - Central Building',
    applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workLocation: 'Main Campus - Central Building',
    isOvernight: false,
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sch-afternoon-fulltime',
    name: 'Standard Afternoon Shift',
    khmerName: 'វេនរសៀលស្តង់ដារ',
    department: 'Academic & Curriculum',
    targetType: 'Standard',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '13:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    absenceDetectionMinutes: 60,
    requiredCheckIn: true,
    requiredCheckOut: true,
    location: 'Main Campus - Central Building',
    applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workLocation: 'Main Campus - Central Building',
    isOvernight: false,
    color: '#0ea5e9',
    isActive: true
  }
];

export const DEFAULT_SUBJECT_SCHEDULES: TeacherSubjectSchedule[] = [
  // Sok Chenda (tch-001) - Advanced Mathematics
  {
    id: 'sub-tch001-p1-monwed',
    teacherId: 'tch-001',
    teacherName: 'Sok Chenda',
    khmerTeacherName: 'សុខ ចិន្តា',
    subject: 'Advanced Mathematics',
    khmerSubject: 'គណិតវិទ្យាកម្រិតខ្ពស់',
    subjectCode: 'MATH-12',
    gradeClass: 'Grade 12A',
    room: 'Room 204',
    dayOfWeek: 1,
    daysOfWeek: [1, 3], // Mon, Wed
    periodNumber: 1,
    periodName: 'Period 1 (07:00 - 07:45)',
    startTime: '07:00',
    endTime: '07:45',
    gracePeriodMinutes: 10,
    hourlyRate: 25,
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sub-tch001-p2-monwed',
    teacherId: 'tch-001',
    teacherName: 'Sok Chenda',
    khmerTeacherName: 'សុខ ចិន្តា',
    subject: 'Advanced Mathematics',
    khmerSubject: 'គណិតវិទ្យាកម្រិតខ្ពស់',
    subjectCode: 'MATH-12',
    gradeClass: 'Grade 12B',
    room: 'Room 205',
    dayOfWeek: 1,
    daysOfWeek: [1, 3], // Mon, Wed
    periodNumber: 2,
    periodName: 'Period 2 (07:50 - 08:35)',
    startTime: '07:50',
    endTime: '08:35',
    gracePeriodMinutes: 10,
    hourlyRate: 25,
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sub-tch001-p3-tuethu',
    teacherId: 'tch-001',
    teacherName: 'Sok Chenda',
    khmerTeacherName: 'សុខ ចិន្តា',
    subject: 'Calculus & Algebra',
    khmerSubject: 'គណិតវិទ្យាពិជគណិត',
    subjectCode: 'MATH-11',
    gradeClass: 'Grade 11A',
    room: 'Room 201',
    dayOfWeek: 2,
    daysOfWeek: [2, 4], // Tue, Thu
    periodNumber: 3,
    periodName: 'Period 3 (08:45 - 09:30)',
    startTime: '08:45',
    endTime: '09:30',
    gracePeriodMinutes: 10,
    hourlyRate: 25,
    color: '#4F46E5',
    isActive: true
  },
  {
    id: 'sub-tch001-p6-fri',
    teacherId: 'tch-001',
    teacherName: 'Sok Chenda',
    khmerTeacherName: 'សុខ ចិន្តា',
    subject: 'Math Olympiad Seminar',
    khmerSubject: 'សិក្ខាសាលាគណិតវិទ្យា',
    subjectCode: 'MATH-OLY',
    gradeClass: 'Grade 12A',
    room: 'Room 204',
    dayOfWeek: 5,
    daysOfWeek: [5], // Fri
    periodNumber: 6,
    periodName: 'Period 6 (13:00 - 13:45)',
    startTime: '13:00',
    endTime: '13:45',
    gracePeriodMinutes: 10,
    hourlyRate: 30,
    color: '#6366F1',
    isActive: true
  },
  {
    id: 'sub-tch001-p2-sat',
    teacherId: 'tch-001',
    teacherName: 'Sok Chenda',
    khmerTeacherName: 'សុខ ចិន្តា',
    subject: 'Foundation Mathematics',
    khmerSubject: 'គណិតវិទ្យាមូលដ្ឋាន',
    subjectCode: 'MATH-10',
    gradeClass: 'Grade 10A',
    room: 'Room 101',
    dayOfWeek: 6,
    daysOfWeek: [6], // Sat
    periodNumber: 2,
    periodName: 'Period 2 (07:50 - 08:35)',
    startTime: '07:50',
    endTime: '08:35',
    gracePeriodMinutes: 10,
    hourlyRate: 25,
    color: '#4F46E5',
    isActive: true
  },

  // Chann Borey (tch-002) - Khmer Literature & History
  {
    id: 'sub-tch002-p3-monwed',
    teacherId: 'tch-002',
    teacherName: 'Chann Borey',
    khmerTeacherName: 'ចាន់ បូរី',
    subject: 'Khmer Literature & History',
    khmerSubject: 'អក្សរសាស្ត្រខ្មែរ និងប្រវត្តិវិទ្យា',
    subjectCode: 'KHM-11',
    gradeClass: 'Grade 11B',
    room: 'Room 102',
    dayOfWeek: 1,
    daysOfWeek: [1, 3], // Mon, Wed
    periodNumber: 3,
    periodName: 'Period 3 (08:45 - 09:30)',
    startTime: '08:45',
    endTime: '09:30',
    gracePeriodMinutes: 10,
    hourlyRate: 22,
    color: '#D97706',
    isActive: true
  },
  {
    id: 'sub-tch002-p1-tuethu',
    teacherId: 'tch-002',
    teacherName: 'Chann Borey',
    khmerTeacherName: 'ចាន់ បូរី',
    subject: 'Khmer Literature',
    khmerSubject: 'អក្សរសាស្ត្រខ្មែរ',
    subjectCode: 'KHM-12',
    gradeClass: 'Grade 12A',
    room: 'Room 204',
    dayOfWeek: 2,
    daysOfWeek: [2, 4], // Tue, Thu
    periodNumber: 1,
    periodName: 'Period 1 (07:00 - 07:45)',
    startTime: '07:00',
    endTime: '07:45',
    gracePeriodMinutes: 10,
    hourlyRate: 22,
    color: '#D97706',
    isActive: true
  },
  {
    id: 'sub-tch002-p2-fri',
    teacherId: 'tch-002',
    teacherName: 'Chann Borey',
    khmerTeacherName: 'ចាន់ បូរី',
    subject: 'Khmer Culture & Civilization',
    khmerSubject: 'វប្បធម៌ និងអរិយធម៌ខ្មែរ',
    subjectCode: 'KHM-10',
    gradeClass: 'Grade 10B',
    room: 'Room 103',
    dayOfWeek: 5,
    daysOfWeek: [5], // Fri
    periodNumber: 2,
    periodName: 'Period 2 (07:50 - 08:35)',
    startTime: '07:50',
    endTime: '08:35',
    gracePeriodMinutes: 10,
    hourlyRate: 22,
    color: '#B45309',
    isActive: true
  },
  {
    id: 'sub-tch002-p1-sat',
    teacherId: 'tch-002',
    teacherName: 'Chann Borey',
    khmerTeacherName: 'ចាន់ បូរី',
    subject: 'Khmer Classical Poetry',
    khmerSubject: 'កាព្យសាស្ត្រខ្មែរ',
    subjectCode: 'KHM-POET',
    gradeClass: 'Grade 11A',
    room: 'Room 102',
    dayOfWeek: 6,
    daysOfWeek: [6], // Sat
    periodNumber: 1,
    periodName: 'Period 1 (07:00 - 07:45)',
    startTime: '07:00',
    endTime: '07:45',
    gracePeriodMinutes: 10,
    hourlyRate: 24,
    color: '#D97706',
    isActive: true
  },

  // Keo Piseth (tch-003) - Computer Science & IT
  {
    id: 'sub-tch003-p4-monwed',
    teacherId: 'tch-003',
    teacherName: 'Keo Piseth',
    khmerTeacherName: 'កែវ ពិសិដ្ឋ',
    subject: 'Computer Science & IT',
    khmerSubject: 'វិទ្យាសាស្ត្រកុំព្យូទ័រ និងព័ត៌មានវិទ្យា',
    subjectCode: 'CS-12',
    gradeClass: 'Grade 12A',
    room: 'Computer Lab 1',
    dayOfWeek: 1,
    daysOfWeek: [1, 3], // Mon, Wed
    periodNumber: 4,
    periodName: 'Period 4 (09:35 - 10:20)',
    startTime: '09:35',
    endTime: '10:20',
    gracePeriodMinutes: 10,
    hourlyRate: 28,
    color: '#059669',
    isActive: true
  },
  {
    id: 'sub-tch003-p2-tuethu',
    teacherId: 'tch-003',
    teacherName: 'Keo Piseth',
    khmerTeacherName: 'កែវ ពិសិដ្ឋ',
    subject: 'Web Programming & Coding',
    khmerSubject: 'កម្មវិធីគេហទំព័រ និងការសរសេរកូដ',
    subjectCode: 'CS-11',
    gradeClass: 'Grade 11A',
    room: 'Computer Lab 2',
    dayOfWeek: 2,
    daysOfWeek: [2, 4], // Tue, Thu
    periodNumber: 2,
    periodName: 'Period 2 (07:50 - 08:35)',
    startTime: '07:50',
    endTime: '08:35',
    gracePeriodMinutes: 10,
    hourlyRate: 28,
    color: '#059669',
    isActive: true
  },
  {
    id: 'sub-tch003-p4-fri',
    teacherId: 'tch-003',
    teacherName: 'Keo Piseth',
    khmerTeacherName: 'កែវ ពិសិដ្ឋ',
    subject: 'Information Technology Basics',
    khmerSubject: 'ព័ត៌មានវិទ្យាមូលដ្ឋាន',
    subjectCode: 'CS-10',
    gradeClass: 'Grade 10A',
    room: 'Computer Lab 1',
    dayOfWeek: 5,
    daysOfWeek: [5], // Fri
    periodNumber: 4,
    periodName: 'Period 4 (09:35 - 10:20)',
    startTime: '09:35',
    endTime: '10:20',
    gracePeriodMinutes: 10,
    hourlyRate: 28,
    color: '#0D9488',
    isActive: true
  },
  {
    id: 'sub-tch003-p3-sat',
    teacherId: 'tch-003',
    teacherName: 'Keo Piseth',
    khmerTeacherName: 'កែវ ពិសិដ្ឋ',
    subject: 'Algorithm Design & Python',
    khmerSubject: 'ការរចនាអាល់ហ្គោរីត និង Python',
    subjectCode: 'CS-ALGO',
    gradeClass: 'Grade 12B',
    room: 'Computer Lab 1',
    dayOfWeek: 6,
    daysOfWeek: [6], // Sat
    periodNumber: 3,
    periodName: 'Period 3 (08:45 - 09:30)',
    startTime: '08:45',
    endTime: '09:30',
    gracePeriodMinutes: 10,
    hourlyRate: 30,
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
  summaryTime: '17:30'
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'sys-default',
  organizationName: 'Heart School',
  khmerOrgName: 'សាលា ហាថ',
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
  requireBarcodeScanOnly: false
};
