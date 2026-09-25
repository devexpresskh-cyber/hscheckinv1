export type UserRole = 'super_admin' | 'admin_hr' | 'supervisor' | 'teacher' | 'employee';

export type Permission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'roles.view'
  | 'roles.create'
  | 'roles.edit'
  | 'roles.delete'
  | 'teachers.view'
  | 'teachers.create'
  | 'teachers.edit'
  | 'teachers.delete'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'schedules.view'
  | 'schedules.create'
  | 'schedules.edit'
  | 'schedules.delete'
  | 'attendance.view'
  | 'attendance.checkin'
  | 'attendance.checkout'
  | 'attendance.edit'
  | 'attendance.approve'
  | 'attendance.delete'
  | 'reports.view'
  | 'reports.export'
  | 'telegram.view'
  | 'telegram.configure'
  | 'notifications.send'
  | 'audit.view'
  | 'settings.manage';

export interface RoleDefinition {
  id: string;
  name: string;
  code: UserRole;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  khmerName: string;
  role: UserRole;
  department: string;
  telegramChatId?: string;
  status: 'Active' | 'Inactive';
  personId?: string; // Links to Teacher or Employee profile
  avatarUrl?: string;
  createdAt: string;
}

export type StaffStatus = 'Active' | 'Inactive' | 'On Leave' | 'Resigned';

export interface Teacher {
  id: string;
  teacherId: string; // e.g. TCH-2026-001
  employeeId: string; // e.g. EMP-101
  fullName: string;
  khmerName: string;
  englishName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  phone: string;
  email: string;
  telegramChatId: string;
  department: string;
  position: string;
  subject: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  joinDate: string;
  photoUrl: string;
  status: StaffStatus;
  assignedLocation: string;
  assignedScheduleId: string;
  hourlyRate?: number; // Base teaching rate per hour (e.g., 20.00)
  currency?: 'USD' | 'KHR'; // default 'USD'
}

export interface Employee {
  id: string;
  employeeId: string; // e.g. EMP-201
  fullName: string;
  khmerName: string;
  phone: string;
  email: string;
  telegramChatId: string;
  department: string;
  position: string;
  supervisor: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  joinDate: string;
  workLocation: string;
  assignedScheduleId: string;
  status: StaffStatus;
  photoUrl: string;
}

export type ScheduleTargetType = 'Department' | 'Individual' | 'Standard' | 'Special';

export interface TimetablePeriod {
  id: string;
  periodNumber: number; // 1, 2, 3, 4, 5...
  periodName: string; // e.g. 'Period 1'
  khmerPeriodName?: string; // e.g. 'ម៉ោងទី ១'
  startTime: string; // e.g. '07:30'
  endTime: string; // e.g. '09:00'
  sessionType?: 'Morning' | 'Afternoon' | 'Evening' | 'Break';
  isBreak?: boolean;
  durationMinutes?: number;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface TeacherSubjectSchedule {
  id: string;
  teacherId: string; // Links to Teacher.id
  teacherName: string;
  khmerTeacherName?: string;
  subject: string; // e.g. 'Advanced Mathematics'
  khmerSubject: string; // e.g. 'គណិតវិទ្យាកម្រិតខ្ពស់'
  subjectCode: string; // e.g. 'MATH-12'
  gradeClass: string; // e.g. 'Grade 12A'
  room: string; // e.g. 'Room 204'
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  daysOfWeek?: number[]; // [1, 2, 3, 4, 5] for multi-day recurring schedules
  periodNumber: number; // 1, 2, 3, 4
  periodName: string; // e.g. 'Period 1 (07:30 - 09:00)'
  startTime: string; // '07:30'
  endTime: string; // '09:00'
  gracePeriodMinutes: number; // e.g. 10
  hourlyRate?: number; // Optional subject-specific hourly rate override
  color?: string;
  isActive: boolean;
}

export interface TeacherWageSummary {
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  khmerName?: string;
  photoUrl?: string;
  department: string;
  position: string;
  employmentType: string;
  hourlyRate: number;
  currency: 'USD' | 'KHR';
  totalScheduledClasses: number;
  totalCompletedClasses: number;
  totalMissedClasses: number;
  totalLateClasses: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  scheduledHours: number;
  completedHours: number; // Actual hours taught
  completionRate: number; // %
  punctualityRate: number; // %
  grossWage: number; // completedHours * hourlyRate
  lateDeductions: number; // e.g. prorated or policy penalty
  netWage: number;
  classSessions: TeacherClassSessionDetail[];
}

export interface TeacherClassSessionDetail {
  attendanceId: string;
  date: string;
  subject: string;
  khmerSubject?: string;
  subjectCode?: string;
  gradeClass: string;
  room: string;
  periodName: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDurationHours: number;
  checkInTime?: string;
  checkOutTime?: string;
  actualTaughtHours: number;
  status: AttendanceStatus;
  lateMinutes: number;
  rateApplied: number;
  wageEarned: number;
}

export interface Schedule {
  id: string;
  name: string;
  department: string;
  targetType: ScheduleTargetType;
  assignedPersonIds?: string[];
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // '07:30'
  endTime: string; // '11:30'
  breakStart?: string; // '12:00'
  breakEnd?: string; // '13:00'
  afternoonStartTime?: string; // '13:30'
  afternoonEndTime?: string; // '17:00'
  gracePeriodMinutes: number; // e.g. 10
  absenceDetectionMinutes: number; // e.g. 60
  requiredCheckIn: boolean;
  requiredCheckOut: boolean;
  location: string;
  isActive: boolean;
  color?: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Absent'
  | 'Early Leave'
  | 'Leave'
  | 'Holiday'
  | 'Missing Check-out'
  | 'Off Day';

export interface AttendanceRecord {
  id: string;
  userId?: string;
  personId: string;
  personType: 'teacher' | 'employee';
  personName: string;
  khmerName?: string;
  department: string;
  date: string; // 'YYYY-MM-DD'
  scheduleId: string;
  scheduleName?: string;
  // Subject Schedule specific fields for teachers
  subjectScheduleId?: string;
  subject?: string;
  khmerSubject?: string;
  subjectCode?: string;
  gradeClass?: string;
  room?: string;
  periodName?: string;
  session?: 'morning' | 'afternoon' | 'full';
  scheduledStart: string;
  scheduledEnd: string;
  checkInTime?: string; // '07:42'
  checkOutTime?: string; // '17:05'
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  ipAddress?: string;
  deviceInfo?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationVerified: boolean;
  isCorrected?: boolean;
  correctionNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  attendanceId?: string;
  personId: string;
  personName: string;
  department: string;
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  supportingNote?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  personId: string;
  personName: string;
  department: string;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Personal Leave' | 'Maternity Leave' | 'Other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  khmerName: string;
  date: string; // 'YYYY-MM-DD'
  endDate?: string;
  type: 'Public' | 'School' | 'Special';
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  khmerName: string;
  code: string;
  managerName: string;
  description: string;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface TelegramSettings {
  id: string;
  botToken: string;
  botUsername: string;
  adminChatId: string;
  groupChatId: string;
  isEnabled: boolean;
  notifyCheckIn: boolean;
  notifyLate: boolean;
  notifyAbsent: boolean;
  notifyCheckOut: boolean;
  notifyDailySummary: boolean;
  notifyReminder: boolean;
  reminderMinutesBefore: number;
  summaryTime: string;
}

export interface TelegramMessageLog {
  id: string;
  chatId: string;
  type: 'checkin' | 'late' | 'absence' | 'checkout' | 'summary' | 'reminder' | 'custom';
  message: string;
  status: 'Sent' | 'Failed' | 'Simulated';
  error?: string;
  sentAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'attendance' | 'schedule' | 'leave' | 'system';
  isRead: boolean;
  createdAt: string;
  targetRole?: UserRole;
  link?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  organizationName: string;
  khmerOrgName: string;
  schoolName?: string;
  khmerSchoolName?: string;
  contactPhone?: string;
  contactEmail?: string;
  tagline: string;
  logoUrl?: string;
  timezone: string;
  workingDays: number[]; // 1 to 5 = Mon to Fri
  defaultGracePeriod: number; // 10 mins
  defaultGracePeriodMinutes?: number;
  absenceDetectionMinutes: number; // 60 mins
  enforceGeofence: boolean;
  defaultLocationLatitude: number;
  defaultLocationLongitude: number;
  geofenceRadiusMeters: number;
  allowSelfCorrection: boolean;
}
