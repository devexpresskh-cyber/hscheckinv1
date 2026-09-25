import {
  RoleDefinition,
  UserAccount,
  Teacher,
  Employee,
  Schedule,
  TimetablePeriod,
  TeacherSubjectSchedule,
  AttendanceRecord,
  Holiday,
  Department,
  WorkLocation,
  TelegramSettings,
  TelegramMessageLog,
  SystemSettings,
  AttendanceCorrectionRequest,
  LeaveRequest,
  AuditLog,
  AppNotification
} from '../types/index.ts';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_TEACHERS,
  INITIAL_EMPLOYEES,
  INITIAL_SCHEDULES,
  INITIAL_TIMETABLE_PERIODS,
  INITIAL_TEACHER_SUBJECT_SCHEDULES,
  INITIAL_ATTENDANCE,
  INITIAL_HOLIDAYS,
  INITIAL_DEPARTMENTS,
  INITIAL_LOCATIONS,
  INITIAL_TELEGRAM_SETTINGS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_CORRECTIONS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS
} from '../data/seedData.ts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  ROLES: 'edutrack_roles_v1',
  USERS: 'edutrack_users_v1',
  TEACHERS: 'edutrack_teachers_v1',
  EMPLOYEES: 'edutrack_employees_v1',
  SCHEDULES: 'edutrack_schedules_v1',
  PERIODS: 'edutrack_periods_v1',
  SUBJECT_SCHEDULES: 'edutrack_subject_schedules_v1',
  ATTENDANCE: 'edutrack_attendance_v1',
  HOLIDAYS: 'edutrack_holidays_v1',
  DEPARTMENTS: 'edutrack_departments_v1',
  LOCATIONS: 'edutrack_locations_v1',
  TELEGRAM_SETTINGS: 'edutrack_tg_settings_v1',
  TELEGRAM_LOGS: 'edutrack_tg_logs_v1',
  SYSTEM_SETTINGS: 'edutrack_sys_settings_v1',
  CORRECTIONS: 'edutrack_corrections_v1',
  LEAVE_REQUESTS: 'edutrack_leaves_v1',
  AUDIT_LOGS: 'edutrack_audit_logs_v1',
  NOTIFICATIONS: 'edutrack_notifs_v1',
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Listener callback error:', e);
    }
  });
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error saving to localStorage [${key}]:`, e);
  }
}

export const StorageService = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  // Roles
  getRoles(): RoleDefinition[] {
    return getStored<RoleDefinition[]>(STORAGE_KEYS.ROLES, INITIAL_ROLES);
  },
  saveRoles(roles: RoleDefinition[]) {
    setStored(STORAGE_KEYS.ROLES, roles);
  },

  // Users
  getUsers(): UserAccount[] {
    return getStored<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },
  saveUsers(users: UserAccount[]) {
    setStored(STORAGE_KEYS.USERS, users);
  },
  addUser(user: UserAccount) {
    const list = this.getUsers();
    this.saveUsers([user, ...list]);
  },
  updateUser(id: string, updates: Partial<UserAccount>) {
    const list = this.getUsers().map(u => u.id === id ? { ...u, ...updates } : u);
    this.saveUsers(list);
  },

  // Teachers
  getTeachers(): Teacher[] {
    return getStored<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
  },
  saveTeachers(teachers: Teacher[]) {
    setStored(STORAGE_KEYS.TEACHERS, teachers);
  },
  addTeacher(teacher: Teacher) {
    const list = this.getTeachers();
    this.saveTeachers([teacher, ...list]);
  },
  addTeachersBatch(newTeachers: Teacher[], mode: 'append' | 'replace' = 'append') {
    if (mode === 'replace') {
      this.saveTeachers(newTeachers);
      return;
    }
    const current = this.getTeachers();
    const map = new Map<string, Teacher>();
    // index existing
    current.forEach(t => {
      map.set(t.id, t);
      if (t.teacherId) map.set(t.teacherId.toLowerCase(), t);
    });
    // add or overwrite
    newTeachers.forEach(t => {
      map.set(t.id, t);
    });
    // filter unique by id
    const unique = Array.from(new Set(Array.from(map.values()).map(t => t.id)))
      .map(id => Array.from(map.values()).find(t => t.id === id)!);
    this.saveTeachers(unique);
  },
  updateTeacher(id: string, updates: Partial<Teacher>) {
    const list = this.getTeachers().map(t => t.id === id ? { ...t, ...updates } : t);
    this.saveTeachers(list);
  },
  deleteTeacher(id: string) {
    const list = this.getTeachers().filter(t => t.id !== id);
    this.saveTeachers(list);
  },

  // Employees
  getEmployees(): Employee[] {
    return getStored<Employee[]>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  },
  saveEmployees(employees: Employee[]) {
    setStored(STORAGE_KEYS.EMPLOYEES, employees);
  },
  addEmployee(employee: Employee) {
    const list = this.getEmployees();
    this.saveEmployees([employee, ...list]);
  },
  updateEmployee(id: string, updates: Partial<Employee>) {
    const list = this.getEmployees().map(e => e.id === id ? { ...e, ...updates } : e);
    this.saveEmployees(list);
  },
  deleteEmployee(id: string) {
    const list = this.getEmployees().filter(e => e.id !== id);
    this.saveEmployees(list);
  },

  // Schedules
  getSchedules(): Schedule[] {
    return getStored<Schedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
  },
  saveSchedules(schedules: Schedule[]) {
    setStored(STORAGE_KEYS.SCHEDULES, schedules);
  },
  addSchedule(sch: Schedule) {
    const list = this.getSchedules();
    this.saveSchedules([...list, sch]);
  },
  updateSchedule(id: string, updates: Partial<Schedule>) {
    const list = this.getSchedules().map(s => s.id === id ? { ...s, ...updates } : s);
    this.saveSchedules(list);
  },
  deleteSchedule(id: string) {
    const list = this.getSchedules().filter(s => s.id !== id);
    this.saveSchedules(list);
  },

  // School Timetable Periods (Period Slots)
  getPeriods(): TimetablePeriod[] {
    return getStored<TimetablePeriod[]>(STORAGE_KEYS.PERIODS, INITIAL_TIMETABLE_PERIODS);
  },
  savePeriods(periods: TimetablePeriod[]) {
    setStored(STORAGE_KEYS.PERIODS, periods);
  },
  addPeriod(period: TimetablePeriod) {
    const list = this.getPeriods();
    this.savePeriods([...list, period]);
  },
  updatePeriod(id: string, updates: Partial<TimetablePeriod>, syncSubjectSchedules = false) {
    const periods = this.getPeriods();
    const target = periods.find(p => p.id === id);
    const updated = periods.map(p => p.id === id ? { ...p, ...updates } : p);
    this.savePeriods(updated);

    if (syncSubjectSchedules && target) {
      const oldNum = target.periodNumber;
      const newNum = updates.periodNumber !== undefined ? updates.periodNumber : oldNum;
      const newStart = updates.startTime || target.startTime;
      const newEnd = updates.endTime || target.endTime;
      const newName = updates.periodName || target.periodName;

      const subList = this.getSubjectSchedules().map(sub => {
        if (sub.periodNumber === oldNum) {
          return {
            ...sub,
            periodNumber: newNum,
            periodName: `${newName} (${newStart} - ${newEnd})`,
            startTime: newStart,
            endTime: newEnd
          };
        }
        return sub;
      });
      this.saveSubjectSchedules(subList);
    }
  },
  deletePeriod(id: string) {
    const list = this.getPeriods().filter(p => p.id !== id);
    this.savePeriods(list);
  },
  resetPeriodsToDefault() {
    this.savePeriods(INITIAL_TIMETABLE_PERIODS);
  },

  // Teacher Subject Schedules (Period / Timetable)
  getSubjectSchedules(): TeacherSubjectSchedule[] {
    return getStored<TeacherSubjectSchedule[]>(STORAGE_KEYS.SUBJECT_SCHEDULES, INITIAL_TEACHER_SUBJECT_SCHEDULES);
  },
  saveSubjectSchedules(schedules: TeacherSubjectSchedule[]) {
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, schedules);
  },
  getSubjectSchedulesForTeacher(teacherId: string, dayOfWeek?: number): TeacherSubjectSchedule[] {
    return this.getSubjectSchedules().filter(s => {
      if (s.teacherId !== teacherId || !s.isActive) return false;
      if (dayOfWeek !== undefined) {
        if (s.daysOfWeek && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
          return s.daysOfWeek.includes(dayOfWeek);
        }
        return s.dayOfWeek === dayOfWeek;
      }
      return true;
    });
  },
  getSubjectScheduleById(id: string): TeacherSubjectSchedule | undefined {
    return this.getSubjectSchedules().find(s => s.id === id);
  },
  addSubjectSchedule(schedule: TeacherSubjectSchedule) {
    const list = this.getSubjectSchedules();
    this.saveSubjectSchedules([...list, schedule]);
  },
  addSubjectSchedulesBatch(newSchedules: TeacherSubjectSchedule[]) {
    const list = this.getSubjectSchedules();
    this.saveSubjectSchedules([...list, ...newSchedules]);
  },
  updateSubjectSchedule(id: string, updates: Partial<TeacherSubjectSchedule>) {
    const list = this.getSubjectSchedules().map(s => s.id === id ? { ...s, ...updates } : s);
    this.saveSubjectSchedules(list);
  },
  deleteSubjectSchedule(id: string) {
    const list = this.getSubjectSchedules().filter(s => s.id !== id);
    this.saveSubjectSchedules(list);
  },

  // Attendance
  getAttendance(): AttendanceRecord[] {
    return getStored<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  },
  saveAttendance(records: AttendanceRecord[]) {
    setStored(STORAGE_KEYS.ATTENDANCE, records);
    // Asynchronously replicate to Firestore
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = records.filter(r => r.date === today);
      setDoc(doc(db, 'attendance', `summary_${today}`), {
        recordsCount: todayRecords.length,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `attendance/summary_${today}`);
      });
    } catch {
      // Ignore background firestore sync error
    }
  },
  addAttendanceRecord(record: AttendanceRecord) {
    const list = this.getAttendance();
    this.saveAttendance([record, ...list]);
  },
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
    const list = this.getAttendance().map(r => r.id === id ? { ...r, ...updates } : r);
    this.saveAttendance(list);
  },

  // Attendance Corrections
  getCorrections(): AttendanceCorrectionRequest[] {
    return getStored<AttendanceCorrectionRequest[]>(STORAGE_KEYS.CORRECTIONS, INITIAL_CORRECTIONS);
  },
  saveCorrections(items: AttendanceCorrectionRequest[]) {
    setStored(STORAGE_KEYS.CORRECTIONS, items);
  },
  addCorrection(req: AttendanceCorrectionRequest) {
    const list = this.getCorrections();
    this.saveCorrections([req, ...list]);
  },
  updateCorrection(id: string, updates: Partial<AttendanceCorrectionRequest>) {
    const list = this.getCorrections().map(c => c.id === id ? { ...c, ...updates } : c);
    this.saveCorrections(list);
  },

  // Leave Requests
  getLeaveRequests(): LeaveRequest[] {
    return getStored<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS, INITIAL_LEAVE_REQUESTS);
  },
  saveLeaveRequests(requests: LeaveRequest[]) {
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, requests);
  },
  addLeaveRequest(req: LeaveRequest) {
    const list = this.getLeaveRequests();
    this.saveLeaveRequests([req, ...list]);
  },
  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const list = this.getLeaveRequests().map(l => l.id === id ? { ...l, ...updates } : l);
    this.saveLeaveRequests(list);
  },

  // Holidays
  getHolidays(): Holiday[] {
    return getStored<Holiday[]>(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS);
  },
  saveHolidays(holidays: Holiday[]) {
    setStored(STORAGE_KEYS.HOLIDAYS, holidays);
  },
  addHoliday(h: Holiday) {
    const list = this.getHolidays();
    this.saveHolidays([...list, h]);
  },
  deleteHoliday(id: string) {
    const list = this.getHolidays().filter(h => h.id !== id);
    this.saveHolidays(list);
  },

  // Departments
  getDepartments(): Department[] {
    return getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  },
  saveDepartments(departments: Department[]) {
    setStored(STORAGE_KEYS.DEPARTMENTS, departments);
  },
  addDepartment(d: Department) {
    const list = this.getDepartments();
    this.saveDepartments([...list, d]);
  },
  updateDepartment(id: string, updates: Partial<Department>) {
    const list = this.getDepartments().map(d => d.id === id ? { ...d, ...updates } : d);
    this.saveDepartments(list);
  },
  deleteDepartment(id: string) {
    const list = this.getDepartments().filter(d => d.id !== id);
    this.saveDepartments(list);
  },

  // Locations
  getLocations(): WorkLocation[] {
    return getStored<WorkLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
  },
  saveLocations(locations: WorkLocation[]) {
    setStored(STORAGE_KEYS.LOCATIONS, locations);
  },

  // Telegram Settings
  getTelegramSettings(): TelegramSettings {
    return getStored<TelegramSettings>(STORAGE_KEYS.TELEGRAM_SETTINGS, INITIAL_TELEGRAM_SETTINGS);
  },
  saveTelegramSettings(settings: TelegramSettings) {
    setStored(STORAGE_KEYS.TELEGRAM_SETTINGS, settings);
  },

  // Telegram Logs
  getTelegramLogs(): TelegramMessageLog[] {
    return getStored<TelegramMessageLog[]>(STORAGE_KEYS.TELEGRAM_LOGS, []);
  },
  addTelegramLog(log: TelegramMessageLog) {
    const list = this.getTelegramLogs();
    setStored(STORAGE_KEYS.TELEGRAM_LOGS, [log, ...list].slice(0, 100)); // retain last 100
  },

  // System Settings
  getSystemSettings(): SystemSettings {
    return getStored<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, INITIAL_SYSTEM_SETTINGS);
  },
  saveSystemSettings(settings: SystemSettings) {
    setStored(STORAGE_KEYS.SYSTEM_SETTINGS, settings);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },
  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const now = new Date();
    const formatted = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const log: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted
    };
    const list = this.getAuditLogs();
    setStored(STORAGE_KEYS.AUDIT_LOGS, [log, ...list].slice(0, 200));
  },

  // Notifications
  getNotifications(): AppNotification[] {
    return getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },
  addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
    const now = new Date();
    const formatted = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0].slice(0, 5)}`;
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: formatted
    };
    const list = this.getNotifications();
    setStored(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...list].slice(0, 50));
  },
  markNotificationRead(id: string) {
    const list = this.getNotifications().map(n => n.id === id ? { ...n, isRead: true } : n);
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
  },
  markAllNotificationsRead() {
    const list = this.getNotifications().map(n => ({ ...n, isRead: true }));
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
  },
  clearNotifications() {
    setStored(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  // Factory reset to seed data
  resetToDefaults() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    notifyListeners();
  },
  resetToSeedData() {
    this.resetToDefaults();
  }
};
