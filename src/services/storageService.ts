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
  DEFAULT_ROLES,
  DEFAULT_USERS,
  DEFAULT_TEACHERS,
  DEFAULT_SCHEDULES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_LOCATIONS,
  DEFAULT_TIMETABLE_PERIODS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_TELEGRAM_SETTINGS
} from '../data/initialData.ts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

const STORAGE_KEYS = {
  ROLES: 'edutrack_roles_v2',
  USERS: 'edutrack_users_v2',
  TEACHERS: 'edutrack_teachers_v2',
  EMPLOYEES: 'edutrack_employees_v2',
  SCHEDULES: 'edutrack_schedules_v2',
  PERIODS: 'edutrack_periods_v2',
  SUBJECT_SCHEDULES: 'edutrack_subject_schedules_v2',
  ATTENDANCE: 'edutrack_attendance_v2',
  HOLIDAYS: 'edutrack_holidays_v2',
  DEPARTMENTS: 'edutrack_departments_v2',
  LOCATIONS: 'edutrack_locations_v2',
  TELEGRAM_SETTINGS: 'edutrack_tg_settings_v2',
  TELEGRAM_LOGS: 'edutrack_tg_logs_v2',
  SYSTEM_SETTINGS: 'edutrack_sys_settings_v2',
  CORRECTIONS: 'edutrack_corrections_v2',
  LEAVE_REQUESTS: 'edutrack_leaves_v2',
  AUDIT_LOGS: 'edutrack_audit_logs_v2',
  NOTIFICATIONS: 'edutrack_notifs_v2',
  HAS_BOOTSTRAPPED: 'edutrack_bootstrapped_v2'
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
  } catch (e) {
    console.error(`Error caching to localStorage [${key}]:`, e);
  }
}

// In-memory cache for synchronous, flicker-free rendering
let cache = {
  roles: getStored<RoleDefinition[]>(STORAGE_KEYS.ROLES, DEFAULT_ROLES),
  users: getStored<UserAccount[]>(STORAGE_KEYS.USERS, DEFAULT_USERS),
  teachers: getStored<Teacher[]>(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS),
  employees: getStored<Employee[]>(STORAGE_KEYS.EMPLOYEES, []),
  schedules: getStored<Schedule[]>(STORAGE_KEYS.SCHEDULES, DEFAULT_SCHEDULES),
  periods: getStored<TimetablePeriod[]>(STORAGE_KEYS.PERIODS, DEFAULT_TIMETABLE_PERIODS),
  subjectSchedules: getStored<TeacherSubjectSchedule[]>(STORAGE_KEYS.SUBJECT_SCHEDULES, []),
  attendance: getStored<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []),
  holidays: getStored<Holiday[]>(STORAGE_KEYS.HOLIDAYS, []),
  departments: getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS),
  locations: getStored<WorkLocation[]>(STORAGE_KEYS.LOCATIONS, DEFAULT_LOCATIONS),
  telegramSettings: getStored<TelegramSettings>(STORAGE_KEYS.TELEGRAM_SETTINGS, DEFAULT_TELEGRAM_SETTINGS),
  telegramLogs: getStored<TelegramMessageLog[]>(STORAGE_KEYS.TELEGRAM_LOGS, []),
  systemSettings: getStored<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SYSTEM_SETTINGS),
  corrections: getStored<AttendanceCorrectionRequest[]>(STORAGE_KEYS.CORRECTIONS, []),
  leaveRequests: getStored<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS, []),
  auditLogs: getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []),
  notifications: getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
  isSyncReady: false
};

// Initialize real-time listeners to Firestore collections
let isInitialized = false;

function initFirestoreSync() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Roles
  onSnapshot(collection(db, 'roles'), snapshot => {
    if (!snapshot.empty) {
      cache.roles = snapshot.docs.map(d => {
        const role = d.data() as RoleDefinition;
        if (role.code === 'teacher' || role.code === 'employee') {
          return {
            ...role,
            permissions: role.permissions.filter(
              p => !['telegram.view', 'telegram.configure', 'settings.manage'].includes(p)
            )
          };
        }
        return role;
      });
      setStored(STORAGE_KEYS.ROLES, cache.roles);
      notifyListeners();
    } else {
      // Bootstrap default roles to Firestore
      DEFAULT_ROLES.forEach(r => {
        setDoc(doc(db, 'roles', r.id), r).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `roles/${r.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'roles'));

  // 2. Users
  onSnapshot(collection(db, 'users'), snapshot => {
    if (!snapshot.empty) {
      cache.users = snapshot.docs.map(d => d.data() as UserAccount);
      setStored(STORAGE_KEYS.USERS, cache.users);
      notifyListeners();
    } else {
      // Bootstrap default admin users to Firestore
      DEFAULT_USERS.forEach(u => {
        setDoc(doc(db, 'users', u.id), u).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'users'));

  // 3. Teachers
  onSnapshot(collection(db, 'teachers'), snapshot => {
    if (!snapshot.empty) {
      cache.teachers = snapshot.docs.map(d => d.data() as Teacher);
      setStored(STORAGE_KEYS.TEACHERS, cache.teachers);
      notifyListeners();
    } else {
      DEFAULT_TEACHERS.forEach(t => {
        setDoc(doc(db, 'teachers', t.id), t).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `teachers/${t.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'teachers'));

  // 4. Employees
  onSnapshot(collection(db, 'employees'), snapshot => {
    cache.employees = snapshot.docs.map(d => d.data() as Employee);
    setStored(STORAGE_KEYS.EMPLOYEES, cache.employees);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'employees'));

  // 5. Schedules
  onSnapshot(collection(db, 'schedules'), snapshot => {
    if (!snapshot.empty) {
      cache.schedules = snapshot.docs.map(d => d.data() as Schedule);
      setStored(STORAGE_KEYS.SCHEDULES, cache.schedules);
      notifyListeners();
    } else {
      DEFAULT_SCHEDULES.forEach(s => {
        setDoc(doc(db, 'schedules', s.id), s).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `schedules/${s.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'schedules'));

  // 6. Timetable Periods
  onSnapshot(collection(db, 'timetable_periods'), snapshot => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => d.data() as TimetablePeriod);
      cache.periods = list.sort((a, b) => a.periodNumber - b.periodNumber);
      setStored(STORAGE_KEYS.PERIODS, cache.periods);
      notifyListeners();
    } else {
      // Bootstrap default timetable periods
      DEFAULT_TIMETABLE_PERIODS.forEach(p => {
        setDoc(doc(db, 'timetable_periods', p.id), p).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `timetable_periods/${p.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'timetable_periods'));

  // 7. Subject Schedules (Class teaching periods)
  onSnapshot(collection(db, 'subject_schedules'), snapshot => {
    cache.subjectSchedules = snapshot.docs.map(d => d.data() as TeacherSubjectSchedule);
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, cache.subjectSchedules);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'subject_schedules'));

  // 8. Attendance records
  onSnapshot(collection(db, 'attendance'), snapshot => {
    // Ignore summary docs
    const records = snapshot.docs
      .filter(d => !d.id.startsWith('summary_'))
      .map(d => d.data() as AttendanceRecord);
    cache.attendance = records;
    setStored(STORAGE_KEYS.ATTENDANCE, cache.attendance);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'attendance'));

  // 9. Attendance Corrections
  onSnapshot(collection(db, 'attendance_corrections'), snapshot => {
    cache.corrections = snapshot.docs.map(d => d.data() as AttendanceCorrectionRequest);
    setStored(STORAGE_KEYS.CORRECTIONS, cache.corrections);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'attendance_corrections'));

  // 10. Leave Requests
  onSnapshot(collection(db, 'leave_requests'), snapshot => {
    cache.leaveRequests = snapshot.docs.map(d => d.data() as LeaveRequest);
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, cache.leaveRequests);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'leave_requests'));

  // 11. Holidays
  onSnapshot(collection(db, 'holidays'), snapshot => {
    cache.holidays = snapshot.docs.map(d => d.data() as Holiday);
    setStored(STORAGE_KEYS.HOLIDAYS, cache.holidays);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'holidays'));

  // 12. Departments
  onSnapshot(collection(db, 'departments'), snapshot => {
    if (!snapshot.empty) {
      cache.departments = snapshot.docs.map(d => d.data() as Department);
      setStored(STORAGE_KEYS.DEPARTMENTS, cache.departments);
      notifyListeners();
    } else {
      DEFAULT_DEPARTMENTS.forEach(dept => {
        setDoc(doc(db, 'departments', dept.id), dept).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `departments/${dept.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'departments'));

  // 13. Locations
  onSnapshot(collection(db, 'locations'), snapshot => {
    if (!snapshot.empty) {
      cache.locations = snapshot.docs.map(d => d.data() as WorkLocation);
      setStored(STORAGE_KEYS.LOCATIONS, cache.locations);
      notifyListeners();
    } else {
      DEFAULT_LOCATIONS.forEach(loc => {
        setDoc(doc(db, 'locations', loc.id), loc).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `locations/${loc.id}`)
        );
      });
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'locations'));

  // 14. Telegram Settings
  onSnapshot(doc(db, 'telegram_settings', 'config'), snapshot => {
    if (snapshot.exists()) {
      cache.telegramSettings = snapshot.data() as TelegramSettings;
      setStored(STORAGE_KEYS.TELEGRAM_SETTINGS, cache.telegramSettings);
      notifyListeners();
    } else {
      setDoc(doc(db, 'telegram_settings', 'config'), DEFAULT_TELEGRAM_SETTINGS).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, 'telegram_settings/config')
      );
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'telegram_settings/config'));

  // 15. Telegram Message Logs
  onSnapshot(collection(db, 'telegram_logs'), snapshot => {
    cache.telegramLogs = snapshot.docs.map(d => d.data() as TelegramMessageLog);
    setStored(STORAGE_KEYS.TELEGRAM_LOGS, cache.telegramLogs);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'telegram_logs'));

  // 16. System Settings
  onSnapshot(doc(db, 'system_settings', 'config'), snapshot => {
    if (snapshot.exists()) {
      cache.systemSettings = snapshot.data() as SystemSettings;
      setStored(STORAGE_KEYS.SYSTEM_SETTINGS, cache.systemSettings);
      notifyListeners();
    } else {
      setDoc(doc(db, 'system_settings', 'config'), DEFAULT_SYSTEM_SETTINGS).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, 'system_settings/config')
      );
    }
  }, err => handleFirestoreError(err, OperationType.GET, 'system_settings/config'));

  // 17. Audit Logs
  onSnapshot(collection(db, 'audit_logs'), snapshot => {
    cache.auditLogs = snapshot.docs.map(d => d.data() as AuditLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, cache.auditLogs);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'audit_logs'));

  // 18. Notifications
  onSnapshot(collection(db, 'notifications'), snapshot => {
    cache.notifications = snapshot.docs.map(d => d.data() as AppNotification);
    setStored(STORAGE_KEYS.NOTIFICATIONS, cache.notifications);
    notifyListeners();
  }, err => handleFirestoreError(err, OperationType.GET, 'notifications'));

  cache.isSyncReady = true;
}

// Auto-start sync
initFirestoreSync();

export const StorageService = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  isCloudReady(): boolean {
    return cache.isSyncReady;
  },

  // Roles
  getRoles(): RoleDefinition[] {
    return cache.roles;
  },
  saveRoles(roles: RoleDefinition[]) {
    const sanitized = roles.map(r => {
      if (r.code === 'teacher' || r.code === 'employee') {
        return {
          ...r,
          permissions: r.permissions.filter(
            p => !['telegram.view', 'telegram.configure', 'settings.manage'].includes(p)
          )
        };
      }
      return r;
    });
    cache.roles = sanitized;
    setStored(STORAGE_KEYS.ROLES, sanitized);
    notifyListeners();
    sanitized.forEach(r => {
      setDoc(doc(db, 'roles', r.id), r).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `roles/${r.id}`)
      );
    });
  },

  // Users
  getUsers(): UserAccount[] {
    return cache.users;
  },
  saveUsers(users: UserAccount[]) {
    cache.users = users;
    setStored(STORAGE_KEYS.USERS, users);
    notifyListeners();
    users.forEach(u => {
      setDoc(doc(db, 'users', u.id), u).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`)
      );
    });
  },
  addUser(user: UserAccount) {
    const list = [user, ...cache.users.filter(u => u.id !== user.id)];
    cache.users = list;
    setStored(STORAGE_KEYS.USERS, list);
    notifyListeners();
    setDoc(doc(db, 'users', user.id), user).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`)
    );
  },
  updateUser(id: string, updates: Partial<UserAccount>) {
    const list = cache.users.map(u => (u.id === id ? { ...u, ...updates } : u));
    cache.users = list;
    setStored(STORAGE_KEYS.USERS, list);
    notifyListeners();
    const updated = list.find(u => u.id === id);
    if (updated) {
      setDoc(doc(db, 'users', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `users/${id}`)
      );
    }
  },
  deleteUser(id: string) {
    const list = cache.users.filter(u => u.id !== id);
    cache.users = list;
    setStored(STORAGE_KEYS.USERS, list);
    notifyListeners();
    deleteDoc(doc(db, 'users', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`)
    );
  },
  deleteUsersBatch(ids: string[]) {
    const idSet = new Set(ids);
    const list = cache.users.filter(u => !idSet.has(u.id));
    cache.users = list;
    setStored(STORAGE_KEYS.USERS, list);
    notifyListeners();
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'users', id));
      });
      batch.commit().catch(err => {
        console.warn('Batch delete error:', err);
      });
    } catch (e) {
      console.warn('Batch delete error:', e);
    }
  },

  // Teachers
  getTeachers(): Teacher[] {
    return cache.teachers;
  },
  saveTeachers(teachers: Teacher[]) {
    cache.teachers = teachers;
    setStored(STORAGE_KEYS.TEACHERS, teachers);
    notifyListeners();
    teachers.forEach(t => {
      setDoc(doc(db, 'teachers', t.id), t).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `teachers/${t.id}`)
      );
    });
  },
  addTeacher(teacher: Teacher) {
    const list = [teacher, ...cache.teachers.filter(t => t.id !== teacher.id)];
    cache.teachers = list;
    setStored(STORAGE_KEYS.TEACHERS, list);
    notifyListeners();
    setDoc(doc(db, 'teachers', teacher.id), teacher).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `teachers/${teacher.id}`)
    );
  },
  addTeachersBatch(newTeachers: Teacher[], mode: 'append' | 'replace' = 'append') {
    let finalTeachers: Teacher[];
    if (mode === 'replace') {
      finalTeachers = newTeachers;
    } else {
      const map = new Map<string, Teacher>();
      cache.teachers.forEach(t => map.set(t.id, t));
      newTeachers.forEach(t => map.set(t.id, t));
      finalTeachers = Array.from(map.values());
    }
    cache.teachers = finalTeachers;
    setStored(STORAGE_KEYS.TEACHERS, finalTeachers);
    notifyListeners();

    // Use Firestore WriteBatch for high-speed atomic upload
    try {
      const batch = writeBatch(db);
      newTeachers.forEach(t => {
        batch.set(doc(db, 'teachers', t.id), t);
      });
      batch.commit().catch(err => {
        console.warn('Batch write notice:', err);
      });
    } catch (e) {
      console.warn('Batch write error:', e);
    }
  },
  updateTeacher(id: string, updates: Partial<Teacher>) {
    const list = cache.teachers.map(t => (t.id === id ? { ...t, ...updates } : t));
    cache.teachers = list;
    setStored(STORAGE_KEYS.TEACHERS, list);
    notifyListeners();
    const updated = list.find(t => t.id === id);
    if (updated) {
      setDoc(doc(db, 'teachers', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `teachers/${id}`)
      );
    }
  },
  deleteTeacher(id: string) {
    const list = cache.teachers.filter(t => t.id !== id);
    cache.teachers = list;
    setStored(STORAGE_KEYS.TEACHERS, list);
    notifyListeners();
    deleteDoc(doc(db, 'teachers', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `teachers/${id}`)
    );
  },

  // Employees
  getEmployees(): Employee[] {
    return cache.employees;
  },
  saveEmployees(employees: Employee[]) {
    cache.employees = employees;
    setStored(STORAGE_KEYS.EMPLOYEES, employees);
    notifyListeners();
    employees.forEach(e => {
      setDoc(doc(db, 'employees', e.id), e).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${e.id}`)
      );
    });
  },
  addEmployee(employee: Employee) {
    const list = [employee, ...cache.employees.filter(e => e.id !== employee.id)];
    cache.employees = list;
    setStored(STORAGE_KEYS.EMPLOYEES, list);
    notifyListeners();
    setDoc(doc(db, 'employees', employee.id), employee).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `employees/${employee.id}`)
    );
  },
  updateEmployee(id: string, updates: Partial<Employee>) {
    const list = cache.employees.map(e => (e.id === id ? { ...e, ...updates } : e));
    cache.employees = list;
    setStored(STORAGE_KEYS.EMPLOYEES, list);
    notifyListeners();
    const updated = list.find(e => e.id === id);
    if (updated) {
      setDoc(doc(db, 'employees', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
      );
    }
  },
  deleteEmployee(id: string) {
    const list = cache.employees.filter(e => e.id !== id);
    cache.employees = list;
    setStored(STORAGE_KEYS.EMPLOYEES, list);
    notifyListeners();
    deleteDoc(doc(db, 'employees', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`)
    );
  },

  // Schedules
  getSchedules(): Schedule[] {
    return cache.schedules;
  },
  saveSchedules(schedules: Schedule[]) {
    cache.schedules = schedules;
    setStored(STORAGE_KEYS.SCHEDULES, schedules);
    notifyListeners();
    schedules.forEach(s => {
      setDoc(doc(db, 'schedules', s.id), s).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `schedules/${s.id}`)
      );
    });
  },
  addSchedule(sch: Schedule) {
    const list = [...cache.schedules.filter(s => s.id !== sch.id), sch];
    cache.schedules = list;
    setStored(STORAGE_KEYS.SCHEDULES, list);
    notifyListeners();
    setDoc(doc(db, 'schedules', sch.id), sch).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `schedules/${sch.id}`)
    );
  },
  updateSchedule(id: string, updates: Partial<Schedule>) {
    const list = cache.schedules.map(s => (s.id === id ? { ...s, ...updates } : s));
    cache.schedules = list;
    setStored(STORAGE_KEYS.SCHEDULES, list);
    notifyListeners();
    const updated = list.find(s => s.id === id);
    if (updated) {
      setDoc(doc(db, 'schedules', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `schedules/${id}`)
      );
    }
  },
  deleteSchedule(id: string) {
    const list = cache.schedules.filter(s => s.id !== id);
    cache.schedules = list;
    setStored(STORAGE_KEYS.SCHEDULES, list);
    notifyListeners();
    deleteDoc(doc(db, 'schedules', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `schedules/${id}`)
    );
  },

  // School Timetable Periods
  getPeriods(): TimetablePeriod[] {
    return cache.periods;
  },
  savePeriods(periods: TimetablePeriod[]) {
    cache.periods = periods;
    setStored(STORAGE_KEYS.PERIODS, periods);
    notifyListeners();
    periods.forEach(p => {
      setDoc(doc(db, 'timetable_periods', p.id), p).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `timetable_periods/${p.id}`)
      );
    });
  },
  addPeriod(period: TimetablePeriod) {
    const list = [...cache.periods.filter(p => p.id !== period.id), period];
    cache.periods = list.sort((a, b) => a.periodNumber - b.periodNumber);
    setStored(STORAGE_KEYS.PERIODS, cache.periods);
    notifyListeners();
    setDoc(doc(db, 'timetable_periods', period.id), period).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `timetable_periods/${period.id}`)
    );
  },
  updatePeriod(id: string, updates: Partial<TimetablePeriod>, syncSubjectSchedules = false) {
    const target = cache.periods.find(p => p.id === id);
    const updated = cache.periods.map(p => (p.id === id ? { ...p, ...updates } : p));
    cache.periods = updated;
    setStored(STORAGE_KEYS.PERIODS, updated);
    notifyListeners();

    const currentDoc = updated.find(p => p.id === id);
    if (currentDoc) {
      setDoc(doc(db, 'timetable_periods', id), currentDoc, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `timetable_periods/${id}`)
      );
    }

    if (syncSubjectSchedules && target) {
      const oldNum = target.periodNumber;
      const newNum = updates.periodNumber !== undefined ? updates.periodNumber : oldNum;
      const newStart = updates.startTime || target.startTime;
      const newEnd = updates.endTime || target.endTime;
      const newName = updates.periodName || target.periodName;

      const subList = cache.subjectSchedules.map(sub => {
        if (sub.periodNumber === oldNum) {
          const mod = {
            ...sub,
            periodNumber: newNum,
            periodName: `${newName} (${newStart} - ${newEnd})`,
            startTime: newStart,
            endTime: newEnd
          };
          setDoc(doc(db, 'subject_schedules', mod.id), mod, { merge: true }).catch(() => {});
          return mod;
        }
        return sub;
      });
      cache.subjectSchedules = subList;
      setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, subList);
      notifyListeners();
    }
  },
  deletePeriod(id: string) {
    const list = cache.periods.filter(p => p.id !== id);
    cache.periods = list;
    setStored(STORAGE_KEYS.PERIODS, list);
    notifyListeners();
    deleteDoc(doc(db, 'timetable_periods', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `timetable_periods/${id}`)
    );
  },
  resetPeriodsToDefault() {
    this.savePeriods(DEFAULT_TIMETABLE_PERIODS);
  },

  // Teacher Subject Schedules (Class teaching periods)
  getSubjectSchedules(): TeacherSubjectSchedule[] {
    return cache.subjectSchedules;
  },
  saveSubjectSchedules(schedules: TeacherSubjectSchedule[]) {
    cache.subjectSchedules = schedules;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, schedules);
    notifyListeners();
    schedules.forEach(s => {
      setDoc(doc(db, 'subject_schedules', s.id), s).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `subject_schedules/${s.id}`)
      );
    });
  },
  getSubjectSchedulesForTeacher(teacherId: string, dayOfWeek?: number): TeacherSubjectSchedule[] {
    return cache.subjectSchedules.filter(s => {
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
    return cache.subjectSchedules.find(s => s.id === id);
  },
  addSubjectSchedule(schedule: TeacherSubjectSchedule) {
    const list = [...cache.subjectSchedules.filter(s => s.id !== schedule.id), schedule];
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();
    setDoc(doc(db, 'subject_schedules', schedule.id), schedule).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `subject_schedules/${schedule.id}`)
    );
  },
  addSubjectSchedulesBatch(newSchedules: TeacherSubjectSchedule[]) {
    const map = new Map<string, TeacherSubjectSchedule>();
    cache.subjectSchedules.forEach(s => map.set(s.id, s));
    newSchedules.forEach(s => map.set(s.id, s));
    const list = Array.from(map.values());
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();

    try {
      const batch = writeBatch(db);
      newSchedules.forEach(s => {
        batch.set(doc(db, 'subject_schedules', s.id), s);
      });
      batch.commit().catch(err => {
        console.warn('Batch write notice:', err);
      });
    } catch (e) {
      console.warn('Batch error:', e);
    }
  },
  updateSubjectSchedule(id: string, updates: Partial<TeacherSubjectSchedule>) {
    const list = cache.subjectSchedules.map(s => (s.id === id ? { ...s, ...updates } : s));
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();
    const updated = list.find(s => s.id === id);
    if (updated) {
      setDoc(doc(db, 'subject_schedules', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `subject_schedules/${id}`)
      );
    }
  },
  deleteSubjectSchedule(id: string) {
    const list = cache.subjectSchedules.filter(s => s.id !== id);
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();
    deleteDoc(doc(db, 'subject_schedules', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `subject_schedules/${id}`)
    );
  },

  // Attendance
  getAttendance(): AttendanceRecord[] {
    return cache.attendance;
  },
  saveAttendance(records: AttendanceRecord[]) {
    cache.attendance = records;
    setStored(STORAGE_KEYS.ATTENDANCE, records);
    notifyListeners();
    records.forEach(r => {
      setDoc(doc(db, 'attendance', r.id), r).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance/${r.id}`)
      );
    });
  },
  addAttendanceRecord(record: AttendanceRecord) {
    const list = [record, ...cache.attendance.filter(r => r.id !== record.id)];
    cache.attendance = list;
    setStored(STORAGE_KEYS.ATTENDANCE, list);
    notifyListeners();
    setDoc(doc(db, 'attendance', record.id), record).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `attendance/${record.id}`)
    );
  },
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
    const list = cache.attendance.map(r => (r.id === id ? { ...r, ...updates } : r));
    cache.attendance = list;
    setStored(STORAGE_KEYS.ATTENDANCE, list);
    notifyListeners();
    const updated = list.find(r => r.id === id);
    if (updated) {
      setDoc(doc(db, 'attendance', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance/${id}`)
      );
    }
  },

  // Attendance Corrections
  getCorrections(): AttendanceCorrectionRequest[] {
    return cache.corrections;
  },
  saveCorrections(items: AttendanceCorrectionRequest[]) {
    cache.corrections = items;
    setStored(STORAGE_KEYS.CORRECTIONS, items);
    notifyListeners();
    items.forEach(c => {
      setDoc(doc(db, 'attendance_corrections', c.id), c).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance_corrections/${c.id}`)
      );
    });
  },
  addCorrection(req: AttendanceCorrectionRequest) {
    const list = [req, ...cache.corrections.filter(c => c.id !== req.id)];
    cache.corrections = list;
    setStored(STORAGE_KEYS.CORRECTIONS, list);
    notifyListeners();
    setDoc(doc(db, 'attendance_corrections', req.id), req).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `attendance_corrections/${req.id}`)
    );
  },
  updateCorrection(id: string, updates: Partial<AttendanceCorrectionRequest>) {
    const list = cache.corrections.map(c => (c.id === id ? { ...c, ...updates } : c));
    cache.corrections = list;
    setStored(STORAGE_KEYS.CORRECTIONS, list);
    notifyListeners();
    const updated = list.find(c => c.id === id);
    if (updated) {
      setDoc(doc(db, 'attendance_corrections', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance_corrections/${id}`)
      );
    }
  },

  // Leave Requests
  getLeaveRequests(): LeaveRequest[] {
    return cache.leaveRequests;
  },
  saveLeaveRequests(requests: LeaveRequest[]) {
    cache.leaveRequests = requests;
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, requests);
    notifyListeners();
    requests.forEach(r => {
      setDoc(doc(db, 'leave_requests', r.id), r).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `leave_requests/${r.id}`)
      );
    });
  },
  addLeaveRequest(req: LeaveRequest) {
    const list = [req, ...cache.leaveRequests.filter(l => l.id !== req.id)];
    cache.leaveRequests = list;
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, list);
    notifyListeners();
    setDoc(doc(db, 'leave_requests', req.id), req).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `leave_requests/${req.id}`)
    );
  },
  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const list = cache.leaveRequests.map(l => (l.id === id ? { ...l, ...updates } : l));
    cache.leaveRequests = list;
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, list);
    notifyListeners();
    const updated = list.find(l => l.id === id);
    if (updated) {
      setDoc(doc(db, 'leave_requests', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `leave_requests/${id}`)
      );
    }
  },

  // Holidays
  getHolidays(): Holiday[] {
    return cache.holidays;
  },
  saveHolidays(holidays: Holiday[]) {
    cache.holidays = holidays;
    setStored(STORAGE_KEYS.HOLIDAYS, holidays);
    notifyListeners();
    holidays.forEach(h => {
      setDoc(doc(db, 'holidays', h.id), h).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `holidays/${h.id}`)
      );
    });
  },
  addHoliday(h: Holiday) {
    const list = [...cache.holidays.filter(item => item.id !== h.id), h];
    cache.holidays = list;
    setStored(STORAGE_KEYS.HOLIDAYS, list);
    notifyListeners();
    setDoc(doc(db, 'holidays', h.id), h).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `holidays/${h.id}`)
    );
  },
  deleteHoliday(id: string) {
    const list = cache.holidays.filter(h => h.id !== id);
    cache.holidays = list;
    setStored(STORAGE_KEYS.HOLIDAYS, list);
    notifyListeners();
    deleteDoc(doc(db, 'holidays', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `holidays/${id}`)
    );
  },

  // Departments
  getDepartments(): Department[] {
    return cache.departments;
  },
  saveDepartments(departments: Department[]) {
    cache.departments = departments;
    setStored(STORAGE_KEYS.DEPARTMENTS, departments);
    notifyListeners();
    departments.forEach(d => {
      setDoc(doc(db, 'departments', d.id), d).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `departments/${d.id}`)
      );
    });
  },
  addDepartment(d: Department) {
    const list = [...cache.departments.filter(item => item.id !== d.id), d];
    cache.departments = list;
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    notifyListeners();
    setDoc(doc(db, 'departments', d.id), d).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `departments/${d.id}`)
    );
  },
  updateDepartment(id: string, updates: Partial<Department>) {
    const list = cache.departments.map(d => (d.id === id ? { ...d, ...updates } : d));
    cache.departments = list;
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    notifyListeners();
    const updated = list.find(d => d.id === id);
    if (updated) {
      setDoc(doc(db, 'departments', id), updated, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `departments/${id}`)
      );
    }
  },
  deleteDepartment(id: string) {
    const list = cache.departments.filter(d => d.id !== id);
    cache.departments = list;
    setStored(STORAGE_KEYS.DEPARTMENTS, list);
    notifyListeners();
    deleteDoc(doc(db, 'departments', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `departments/${id}`)
    );
  },

  // Locations
  getLocations(): WorkLocation[] {
    return cache.locations;
  },
  saveLocations(locations: WorkLocation[]) {
    cache.locations = locations;
    setStored(STORAGE_KEYS.LOCATIONS, locations);
    notifyListeners();
    locations.forEach(l => {
      setDoc(doc(db, 'locations', l.id), l).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `locations/${l.id}`)
      );
    });
  },

  // Telegram Settings
  getTelegramSettings(): TelegramSettings {
    return cache.telegramSettings;
  },
  saveTelegramSettings(settings: TelegramSettings) {
    cache.telegramSettings = settings;
    setStored(STORAGE_KEYS.TELEGRAM_SETTINGS, settings);
    notifyListeners();
    setDoc(doc(db, 'telegram_settings', 'config'), settings, { merge: true }).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, 'telegram_settings/config')
    );
  },

  // Telegram Logs
  getTelegramLogs(): TelegramMessageLog[] {
    return cache.telegramLogs;
  },
  addTelegramLog(log: TelegramMessageLog) {
    const list = [log, ...cache.telegramLogs].slice(0, 100);
    cache.telegramLogs = list;
    setStored(STORAGE_KEYS.TELEGRAM_LOGS, list);
    notifyListeners();
    setDoc(doc(db, 'telegram_logs', log.id), log).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `telegram_logs/${log.id}`)
    );
  },

  // System Settings
  getSystemSettings(): SystemSettings {
    return cache.systemSettings;
  },
  saveSystemSettings(settings: SystemSettings) {
    cache.systemSettings = settings;
    setStored(STORAGE_KEYS.SYSTEM_SETTINGS, settings);
    notifyListeners();
    setDoc(doc(db, 'system_settings', 'config'), settings, { merge: true }).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/config')
    );
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return cache.auditLogs;
  },
  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const now = new Date();
    const formatted = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const log: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted
    };
    const list = [log, ...cache.auditLogs].slice(0, 200);
    cache.auditLogs = list;
    setStored(STORAGE_KEYS.AUDIT_LOGS, list);
    notifyListeners();
    setDoc(doc(db, 'audit_logs', log.id), log).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `audit_logs/${log.id}`)
    );
  },

  // Notifications
  getNotifications(): AppNotification[] {
    return cache.notifications;
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
    const list = [newNotif, ...cache.notifications].slice(0, 50);
    cache.notifications = list;
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyListeners();
    setDoc(doc(db, 'notifications', newNotif.id), newNotif).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `notifications/${newNotif.id}`)
    );
  },
  markNotificationRead(id: string) {
    const list = cache.notifications.map(n => (n.id === id ? { ...n, isRead: true } : n));
    cache.notifications = list;
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyListeners();
    setDoc(doc(db, 'notifications', id), { isRead: true }, { merge: true }).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `notifications/${id}`)
    );
  },
  markAllNotificationsRead() {
    const list = cache.notifications.map(n => ({ ...n, isRead: true }));
    cache.notifications = list;
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyListeners();
    list.forEach(n => {
      setDoc(doc(db, 'notifications', n.id), { isRead: true }, { merge: true }).catch(() => {});
    });
  },
  clearNotifications() {
    cache.notifications = [];
    setStored(STORAGE_KEYS.NOTIFICATIONS, []);
    notifyListeners();
  },

  // Clear local storage cache and force refetch from cloud
  refreshFromCloud() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    isInitialized = false;
    initFirestoreSync();
    notifyListeners();
  }
};
