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
  AppNotification,
  OfflineSyncItem,
  SyncHistoryLog,
  SyncStatusState,
  ScheduleSubstitution,
  ScheduleSubstitutionAssignee
} from '../types/index.ts';
import {
  DEFAULT_ROLES,
  DEFAULT_USERS,
  DEFAULT_TEACHERS,
  DEFAULT_EMPLOYEES,
  DEFAULT_SCHEDULES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_LOCATIONS,
  DEFAULT_TIMETABLE_PERIODS,
  DEFAULT_SUBJECT_SCHEDULES,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_TELEGRAM_SETTINGS
} from '../data/initialData.ts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
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
  SUBSTITUTIONS: 'edutrack_substitutions_v2',
  HAS_BOOTSTRAPPED: 'edutrack_bootstrapped_v2',
  OFFLINE_SYNC_QUEUE: 'edutrack_offline_sync_queue_v2',
  SYNC_HISTORY: 'edutrack_sync_history_v2',
  LAST_SYNCED: 'edutrack_last_synced_at_v2'
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

// Convert any undefined fields to null or strip them so Firestore setDoc never throws Unsupported field value: undefined
export function sanitizeForFirestore<T>(data: T): any {
  if (data === undefined) return null;
  return JSON.parse(JSON.stringify(data, (_, value) => (value === undefined ? null : value)));
}

// In-memory cache for synchronous, flicker-free rendering
const initialRoles = getStored<RoleDefinition[]>(STORAGE_KEYS.ROLES, DEFAULT_ROLES).map(r => {
  if (r.code === 'admin_hr') {
    const perms = new Set(r.permissions);
    perms.add('teachers.delete');
    perms.add('employees.delete');
    perms.add('attendance.delete');
    return { ...r, permissions: Array.from(perms) };
  }
  return r;
});

let cache = {
  roles: initialRoles,
  users: getStored<UserAccount[]>(STORAGE_KEYS.USERS, DEFAULT_USERS),
  teachers: getStored<Teacher[]>(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS),
  employees: getStored<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES),
  schedules: getStored<Schedule[]>(STORAGE_KEYS.SCHEDULES, DEFAULT_SCHEDULES),
  periods: getStored<TimetablePeriod[]>(STORAGE_KEYS.PERIODS, DEFAULT_TIMETABLE_PERIODS),
  subjectSchedules: getStored<TeacherSubjectSchedule[]>(STORAGE_KEYS.SUBJECT_SCHEDULES, DEFAULT_SUBJECT_SCHEDULES),
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
  substitutions: getStored<ScheduleSubstitution[]>(STORAGE_KEYS.SUBSTITUTIONS, []),
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
        if (role.code === 'admin_hr') {
          const perms = new Set(role.permissions);
          perms.add('teachers.delete');
          perms.add('employees.delete');
          return { ...role, permissions: Array.from(perms) };
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
    if (!snapshot.empty) {
      cache.employees = snapshot.docs.map(d => d.data() as Employee);
      setStored(STORAGE_KEYS.EMPLOYEES, cache.employees);
      notifyListeners();
    } else {
      DEFAULT_EMPLOYEES.forEach(e => {
        setDoc(doc(db, 'employees', e.id), e).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `employees/${e.id}`)
        );
      });
    }
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
      // Check if localStorage already has saved custom periods before bootstrapping defaults
      const stored = getStored<TimetablePeriod[]>(STORAGE_KEYS.PERIODS, []);
      const periodsToSave = stored && stored.length > 0 ? stored : DEFAULT_TIMETABLE_PERIODS;
      cache.periods = periodsToSave.sort((a, b) => a.periodNumber - b.periodNumber);
      setStored(STORAGE_KEYS.PERIODS, cache.periods);
      periodsToSave.forEach(p => {
        setDoc(doc(db, 'timetable_periods', p.id), p).catch(err =>
          console.warn('Timetable period bootstrap notice:', err)
        );
      });
      notifyListeners();
    }
  }, err => console.warn('Timetable periods sync notice:', err));

  // 7. Subject Schedules (Class teaching periods)
  onSnapshot(collection(db, 'subject_schedules'), snapshot => {
    if (!snapshot.empty) {
      cache.subjectSchedules = snapshot.docs.map(d => d.data() as TeacherSubjectSchedule);
      setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, cache.subjectSchedules);
      notifyListeners();
    } else {
      const stored = getStored<TeacherSubjectSchedule[]>(STORAGE_KEYS.SUBJECT_SCHEDULES, []);
      const toSave = stored && stored.length > 0 ? stored : DEFAULT_SUBJECT_SCHEDULES;
      cache.subjectSchedules = toSave;
      setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, toSave);
      toSave.forEach(s => {
        setDoc(doc(db, 'subject_schedules', s.id), s).catch(err =>
          console.warn('Subject schedule bootstrap notice:', err)
        );
      });
      notifyListeners();
    }
  }, err => console.warn('Subject schedules sync notice:', err));

  // 8. Attendance records
  onSnapshot(collection(db, 'attendance'), snapshot => {
    // Ignore summary docs
    const records = snapshot.docs
      .filter(d => !d.id.startsWith('summary_'))
      .map(d => d.data() as AttendanceRecord);
    cache.attendance = records;
    setStored(STORAGE_KEYS.ATTENDANCE, cache.attendance);
    notifyListeners();
    setTimeout(() => {
      StorageService.processAutoCheckOut();
    }, 1200);
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
      // Do not wipe out custom settings! Check localStorage first before falling back to defaults
      const stored = getStored<TelegramSettings>(STORAGE_KEYS.TELEGRAM_SETTINGS, DEFAULT_TELEGRAM_SETTINGS);
      const toPersist = (stored && (stored.botToken || stored.adminChatId || stored.groupChatId || stored.isEnabled))
        ? stored
        : DEFAULT_TELEGRAM_SETTINGS;
      cache.telegramSettings = toPersist;
      setStored(STORAGE_KEYS.TELEGRAM_SETTINGS, toPersist);
      setDoc(doc(db, 'telegram_settings', 'config'), toPersist, { merge: true }).catch(err =>
        console.warn('Telegram settings bootstrap notice:', err)
      );
      notifyListeners();
    }
  }, err => console.warn('Telegram settings sync notice:', err));

  // 15. Telegram Message Logs
  onSnapshot(collection(db, 'telegram_logs'), snapshot => {
    cache.telegramLogs = snapshot.docs.map(d => d.data() as TelegramMessageLog);
    setStored(STORAGE_KEYS.TELEGRAM_LOGS, cache.telegramLogs);
    notifyListeners();
  }, err => console.warn('Telegram logs sync notice:', err));

  // 16. System Settings
  onSnapshot(doc(db, 'system_settings', 'config'), snapshot => {
    if (snapshot.exists()) {
      cache.systemSettings = snapshot.data() as SystemSettings;
      setStored(STORAGE_KEYS.SYSTEM_SETTINGS, cache.systemSettings);
      notifyListeners();
    } else {
      // Do not wipe out custom settings! Check localStorage first before falling back to defaults
      const stored = getStored<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SYSTEM_SETTINGS);
      const toPersist = (stored && stored.organizationName) ? stored : DEFAULT_SYSTEM_SETTINGS;
      cache.systemSettings = toPersist;
      setStored(STORAGE_KEYS.SYSTEM_SETTINGS, toPersist);
      setDoc(doc(db, 'system_settings', 'config'), toPersist, { merge: true }).catch(err =>
        console.warn('System settings bootstrap notice:', err)
      );
      notifyListeners();
    }
  }, err => console.warn('System settings sync notice:', err));

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

  // 19. Schedule Substitutions
  onSnapshot(collection(db, 'schedule_substitutions'), snapshot => {
    cache.substitutions = snapshot.docs.map(d => d.data() as ScheduleSubstitution);
    setStored(STORAGE_KEYS.SUBSTITUTIONS, cache.substitutions);
    notifyListeners();
  }, err => console.warn('Substitutions sync notice:', err));

  cache.isSyncReady = true;
}

// Auto-start sync
initFirestoreSync();

// ==========================================
// OFFLINE AUTO-SYNC ENGINE FOR ADMIN & SYSTEM
// ==========================================

let offlineSyncQueue: OfflineSyncItem[] = getStored<OfflineSyncItem[]>(STORAGE_KEYS.OFFLINE_SYNC_QUEUE, []);
let syncHistory: SyncHistoryLog[] = getStored<SyncHistoryLog[]>(STORAGE_KEYS.SYNC_HISTORY, []);
let lastSyncedAt: string | null = getStored<string | null>(STORAGE_KEYS.LAST_SYNCED, null);
let isSyncing = false;

const syncListeners = new Set<() => void>();

function notifySyncListeners() {
  syncListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
}

function saveSyncQueue() {
  setStored(STORAGE_KEYS.OFFLINE_SYNC_QUEUE, offlineSyncQueue);
}

function saveSyncHistory() {
  setStored(STORAGE_KEYS.SYNC_HISTORY, syncHistory.slice(0, 60));
}

/**
 * Queue or execute a Firestore cloud mutation with automatic offline resilience.
 * If online: attempts immediate write; on failure or network interruption, queues for auto-sync.
 * If offline: queues directly and notifies UI.
 */
async function queueCloudWrite(
  collectionName: string,
  docId: string,
  action: 'set' | 'update' | 'delete',
  payload?: any,
  description?: string
): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      if (action === 'delete') {
        await deleteDoc(doc(db, collectionName, docId));
      } else {
        await setDoc(doc(db, collectionName, docId), payload, { merge: action === 'update' });
      }
      lastSyncedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.LAST_SYNCED, lastSyncedAt);
      notifySyncListeners();
      return;
    } catch (err: any) {
      console.warn(`Direct write to ${collectionName}/${docId} unconfirmed, enqueuing for offline auto-sync:`, err);
    }
  }

  // Enqueue for auto sync
  const existingIdx = offlineSyncQueue.findIndex(
    item => item.collection === collectionName && item.docId === docId
  );

  const syncItem: OfflineSyncItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    collection: collectionName,
    docId,
    action,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    description: description || `${action.toUpperCase()} ${collectionName} (${docId})`
  };

  if (existingIdx >= 0) {
    offlineSyncQueue[existingIdx] = syncItem;
  } else {
    offlineSyncQueue.push(syncItem);
  }

  saveSyncQueue();
  notifySyncListeners();
}

/**
 * Auto-sync worker: synchronizes all pending offline mutations to Cloud Firestore sequentially.
 */
async function processOfflineSyncQueue(): Promise<{ succeeded: number; failed: number }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline || isSyncing || offlineSyncQueue.length === 0) {
    return { succeeded: 0, failed: 0 };
  }

  isSyncing = true;
  notifySyncListeners();

  let succeeded = 0;
  let failed = 0;
  const remainingQueue: OfflineSyncItem[] = [];

  for (const item of offlineSyncQueue) {
    try {
      if (item.action === 'delete') {
        await deleteDoc(doc(db, item.collection, item.docId));
      } else {
        await setDoc(doc(db, item.collection, item.docId), sanitizeForFirestore(item.payload), { merge: item.action === 'update' });
      }
      succeeded++;
      syncHistory.unshift({
        id: item.id,
        action: item.action,
        target: item.description,
        timestamp: new Date().toLocaleTimeString(),
        status: 'success'
      });
    } catch (err: any) {
      failed++;
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastError = err instanceof Error ? err.message : String(err);
      item.status = 'failed';
      remainingQueue.push(item);
      syncHistory.unshift({
        id: item.id,
        action: item.action,
        target: item.description,
        timestamp: new Date().toLocaleTimeString(),
        status: 'failed',
        error: item.lastError
      });
    }
  }

  offlineSyncQueue = remainingQueue;
  saveSyncQueue();
  saveSyncHistory();

  lastSyncedAt = new Date().toISOString();
  setStored(STORAGE_KEYS.LAST_SYNCED, lastSyncedAt);

  isSyncing = false;
  notifySyncListeners();
  notifyListeners();

  return { succeeded, failed };
}

// Automatically trigger auto-sync when internet reconnects
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network online detected: auto-syncing pending offline mutations...');
    processOfflineSyncQueue();
  });

  // Background auto-sync heartbeat (every 15s when online and items pending)
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && offlineSyncQueue.length > 0 && !isSyncing) {
      processOfflineSyncQueue();
    }
  }, 15000);
}

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
    if (!cache.users || cache.users.length === 0) {
      const stored = getStored<UserAccount[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
      if (stored && stored.length > 0) {
        cache.users = stored;
        return stored;
      }
      return DEFAULT_USERS;
    }
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
    if (!cache.teachers || cache.teachers.length === 0) {
      const stored = getStored<Teacher[]>(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS);
      if (stored && stored.length > 0) {
        cache.teachers = stored;
        return stored;
      }
      return DEFAULT_TEACHERS;
    }
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
    queueCloudWrite('teachers', teacher.id, 'set', teacher, `Create Teacher ${teacher.fullName}`);
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
      queueCloudWrite('teachers', id, 'update', updated, `Update Teacher ${updated.fullName}`);
    }
  },
  deleteTeacher(
    id: string,
    options: { deleteSchedules?: boolean; deleteUserAccount?: boolean } = { deleteSchedules: true, deleteUserAccount: true }
  ) {
    const target = cache.teachers.find(t => t.id === id);
    const teacherName = target?.fullName || id;

    // 1. Remove teacher from cache and localStorage
    const list = cache.teachers.filter(t => t.id !== id);
    cache.teachers = list;
    setStored(STORAGE_KEYS.TEACHERS, list);
    queueCloudWrite('teachers', id, 'delete', undefined, `Delete Teacher ${teacherName}`);

    // 2. Cascade delete subject timetable schedules if requested
    if (options.deleteSchedules) {
      const remainingSchedules = cache.subjectSchedules.filter(s => s.teacherId !== id);
      const deletedSchedules = cache.subjectSchedules.filter(s => s.teacherId === id);
      cache.subjectSchedules = remainingSchedules;
      setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, remainingSchedules);
      deletedSchedules.forEach(s => {
        queueCloudWrite('subject_schedules', s.id, 'delete', undefined, `Delete Schedule slot for ${teacherName}`);
      });
    }

    // 3. Cascade delete linked login user account if requested
    if (options.deleteUserAccount) {
      const linkedUsers = cache.users.filter(
        u => u.personId === id || u.id === `usr-${id}` || (target?.email && u.email.toLowerCase() === target.email.toLowerCase())
      );
      if (linkedUsers.length > 0) {
        const remainingUsers = cache.users.filter(u => !linkedUsers.some(lu => lu.id === u.id));
        cache.users = remainingUsers;
        setStored(STORAGE_KEYS.USERS, remainingUsers);
        linkedUsers.forEach(lu => {
          queueCloudWrite('users', lu.id, 'delete', undefined, `Delete Login Account for ${teacherName}`);
        });
      }
    }

    notifyListeners();
  },

  // Employees
  getEmployees(): Employee[] {
    if (!cache.employees || cache.employees.length === 0) {
      const stored = getStored<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
      if (stored && stored.length > 0) {
        cache.employees = stored;
        return stored;
      }
      return DEFAULT_EMPLOYEES;
    }
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
    queueCloudWrite('employees', employee.id, 'set', employee, `Create Staff ${employee.fullName}`);
  },
  updateEmployee(id: string, updates: Partial<Employee>) {
    const list = cache.employees.map(e => (e.id === id ? { ...e, ...updates } : e));
    cache.employees = list;
    setStored(STORAGE_KEYS.EMPLOYEES, list);
    notifyListeners();
    const updated = list.find(e => e.id === id);
    if (updated) {
      queueCloudWrite('employees', id, 'update', updated, `Update Staff ${updated.fullName}`);
    }
  },
  deleteEmployee(id: string) {
    const target = cache.employees.find(e => e.id === id);
    const empName = target?.fullName || id;
    const list = cache.employees.filter(e => e.id !== id);
    cache.employees = list;
    setStored(STORAGE_KEYS.EMPLOYEES, list);
    queueCloudWrite('employees', id, 'delete', undefined, `Delete Staff ${empName}`);

    // Clean up linked user account
    const linkedUsers = cache.users.filter(u => u.personId === id || u.id === `usr-${id}`);
    if (linkedUsers.length > 0) {
      const remainingUsers = cache.users.filter(u => !linkedUsers.some(lu => lu.id === u.id));
      cache.users = remainingUsers;
      setStored(STORAGE_KEYS.USERS, remainingUsers);
      linkedUsers.forEach(lu => {
        queueCloudWrite('users', lu.id, 'delete', undefined, `Delete Login Account for ${empName}`);
      });
    }

    notifyListeners();
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
    const settings = this.getSettings();
    const defaultGrace = settings.defaultGracePeriodMinutes ?? settings.defaultGracePeriod ?? 15;
    const finalSch: Schedule = {
      ...sch,
      gracePeriodMinutes: sch.gracePeriodMinutes !== undefined && !isNaN(Number(sch.gracePeriodMinutes))
        ? Number(sch.gracePeriodMinutes)
        : defaultGrace
    };
    const list = [...cache.schedules.filter(s => s.id !== finalSch.id), finalSch];
    cache.schedules = list;
    setStored(STORAGE_KEYS.SCHEDULES, list);
    notifyListeners();
    setDoc(doc(db, 'schedules', finalSch.id), finalSch).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `schedules/${finalSch.id}`)
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
    const oldPeriods = cache.periods;
    cache.periods = periods.sort((a, b) => a.periodNumber - b.periodNumber);
    setStored(STORAGE_KEYS.PERIODS, cache.periods);
    notifyListeners();

    // 1. Delete removed periods from Firestore
    const newIdSet = new Set(periods.map(p => p.id));
    oldPeriods.forEach(oldP => {
      if (!newIdSet.has(oldP.id)) {
        deleteDoc(doc(db, 'timetable_periods', oldP.id)).catch(() => {});
      }
    });

    // 2. Persist current periods
    periods.forEach(p => {
      setDoc(doc(db, 'timetable_periods', p.id), p, { merge: true }).catch(err =>
        console.warn(`Failed to write timetable period ${p.id}:`, err)
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
    const rawId = (teacherId || '').trim();
    const lowId = rawId.toLowerCase();
    const matchedTeacher = cache.teachers.find(
      t => t.id === rawId ||
           t.id?.toLowerCase() === lowId ||
           t.teacherId?.toLowerCase() === lowId ||
           t.fullName?.toLowerCase() === lowId
    );

    const validIds = new Set<string>();
    if (rawId) validIds.add(lowId);
    if (matchedTeacher) {
      if (matchedTeacher.id) validIds.add(matchedTeacher.id.toLowerCase());
      if (matchedTeacher.teacherId) validIds.add(matchedTeacher.teacherId.toLowerCase());
    }

    return cache.subjectSchedules.filter(s => {
      if (!s.isActive) return false;
      const sTeacherId = (s.teacherId || '').trim().toLowerCase();
      const matchesId = validIds.has(sTeacherId);
      const matchesName = matchedTeacher && s.teacherName &&
        s.teacherName.trim().toLowerCase() === matchedTeacher.fullName.trim().toLowerCase();

      if (!matchesId && !matchesName) return false;

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
    const settings = this.getSettings();
    const defaultGrace = settings.defaultGracePeriodMinutes ?? settings.defaultGracePeriod ?? 15;
    const teacher = cache.teachers.find(t => t.id === schedule.teacherId || (schedule.teacherName && t.fullName === schedule.teacherName));
    const finalSchedule: TeacherSubjectSchedule = {
      ...schedule,
      gracePeriodMinutes: schedule.gracePeriodMinutes !== undefined && !isNaN(Number(schedule.gracePeriodMinutes))
        ? Number(schedule.gracePeriodMinutes)
        : defaultGrace,
      hourlyRate: schedule.hourlyRate !== undefined && !isNaN(Number(schedule.hourlyRate))
        ? Number(schedule.hourlyRate)
        : (teacher?.hourlyRate !== undefined ? teacher.hourlyRate : undefined)
    };
    const list = [...cache.subjectSchedules.filter(s => s.id !== finalSchedule.id), finalSchedule];
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();
    setDoc(doc(db, 'subject_schedules', finalSchedule.id), finalSchedule).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `subject_schedules/${finalSchedule.id}`)
    );
  },
  addSubjectSchedulesBatch(newSchedules: TeacherSubjectSchedule[]) {
    const settings = this.getSettings();
    const defaultGrace = settings.defaultGracePeriodMinutes ?? settings.defaultGracePeriod ?? 15;
    const processed = newSchedules.map(schedule => {
      const teacher = cache.teachers.find(t => t.id === schedule.teacherId || (schedule.teacherName && t.fullName === schedule.teacherName));
      return {
        ...schedule,
        gracePeriodMinutes: schedule.gracePeriodMinutes !== undefined && !isNaN(Number(schedule.gracePeriodMinutes))
          ? Number(schedule.gracePeriodMinutes)
          : defaultGrace,
        hourlyRate: schedule.hourlyRate !== undefined && !isNaN(Number(schedule.hourlyRate))
          ? Number(schedule.hourlyRate)
          : (teacher?.hourlyRate !== undefined ? teacher.hourlyRate : undefined)
      };
    });
    const map = new Map<string, TeacherSubjectSchedule>();
    cache.subjectSchedules.forEach(s => map.set(s.id, s));
    processed.forEach(s => map.set(s.id, s));
    const list = Array.from(map.values());
    cache.subjectSchedules = list;
    setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, list);
    notifyListeners();

    try {
      const batch = writeBatch(db);
      processed.forEach(s => {
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
      setDoc(doc(db, 'attendance', r.id), sanitizeForFirestore(r)).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance/${r.id}`)
      );
    });
  },
  addAttendanceRecord(record: AttendanceRecord) {
    const list = [record, ...cache.attendance.filter(r => r.id !== record.id)];
    cache.attendance = list;
    setStored(STORAGE_KEYS.ATTENDANCE, list);
    notifyListeners();
    setDoc(doc(db, 'attendance', record.id), sanitizeForFirestore(record)).catch(err =>
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
      setDoc(doc(db, 'attendance', id), sanitizeForFirestore(updated), { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `attendance/${id}`)
      );
    }
  },

  async deleteAttendanceRecord(id: string): Promise<boolean> {
    const list = cache.attendance.filter(r => r.id !== id);
    cache.attendance = list;
    setStored(STORAGE_KEYS.ATTENDANCE, list);

    offlineSyncQueue = offlineSyncQueue.filter(item => !(item.collection === 'attendance' && item.docId === id));
    saveSyncQueue();
    notifySyncListeners();
    notifyListeners();

    try {
      await deleteDoc(doc(db, 'attendance', id));
      return true;
    } catch (err) {
      console.warn('Firestore attendance delete notice:', err);
      return true;
    }
  },

  async deleteAttendanceRecords(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const list = cache.attendance.filter(r => !idSet.has(r.id));
    cache.attendance = list;
    setStored(STORAGE_KEYS.ATTENDANCE, list);

    offlineSyncQueue = offlineSyncQueue.filter(item => !(item.collection === 'attendance' && idSet.has(item.docId)));
    saveSyncQueue();
    notifySyncListeners();
    notifyListeners();

    try {
      const batchSize = 400;
      for (let i = 0; i < ids.length; i += batchSize) {
        const chunk = ids.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'attendance', id));
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Batch deletion of attendance records failed, fallback:', err);
      ids.forEach(id => {
        deleteDoc(doc(db, 'attendance', id)).catch(() => {});
      });
    }

    notifyListeners();
    return ids.length;
  },

  /**
   * Auto Check-Out Engine for Missing Check-Outs
   * Identifies attendance records with check-in but missing check-out whose scheduled
   * end time (or grace buffer) has elapsed, and automatically closes them according to system policy.
   */
  processAutoCheckOut(targetDate?: string): { processedCount: number; updatedRecords: AttendanceRecord[] } {
    const settings = this.getSystemSettings();
    if (settings.enableAutoCheckOut === false) {
      return { processedCount: 0, updatedRecords: [] };
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const policy = settings.autoCheckOutPolicy || 'scheduled_end';
    const bufferMinutes = Number(settings.autoCheckOutBufferMinutes ?? 15);

    const records = cache.attendance;
    const updatedRecords: AttendanceRecord[] = [];

    records.forEach(record => {
      // Must have check-in and no check-out
      if (!record.checkInTime || record.checkOutTime) return;

      // Only check records on or before today
      if (record.date > todayStr) return;

      // If a specific targetDate was requested and doesn't match
      if (targetDate && record.date !== targetDate) return;

      // Determine scheduled end time in minutes
      const [endH, endM] = (record.scheduledEnd || '17:00').split(':').map(Number);
      const scheduledEndMinutes = (isNaN(endH) ? 17 : endH) * 60 + (isNaN(endM) ? 0 : endM);

      // If record is from a past date, it's overdue
      // If record is today, check if current clock time is past scheduled end (+ buffer if policy)
      const isPastDate = record.date < todayStr;
      const isPastTimeToday = curMinutes >= (scheduledEndMinutes + (policy === 'scheduled_end_buffer' ? bufferMinutes : 0));

      if (isPastDate || isPastTimeToday) {
        // Calculate auto check-out time
        let autoOutTime = record.scheduledEnd || '17:00';
        if (policy === 'scheduled_end_buffer') {
          const totalBufferEnd = scheduledEndMinutes + bufferMinutes;
          const bh = Math.floor(totalBufferEnd / 60) % 24;
          const bm = totalBufferEnd % 60;
          autoOutTime = `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}`;
        } else if (policy === 'end_of_day') {
          autoOutTime = settings.autoCheckOutDailyTime || '17:30';
        }

        const updated: AttendanceRecord = {
          ...record,
          checkOutTime: autoOutTime,
          isAutoCheckedOut: true,
          checkOutMethod: 'AUTO_SYSTEM',
          status: record.status === 'Missing Check-out'
            ? (record.lateMinutes > 0 ? 'Late' : 'Present')
            : record.status,
          updatedAt: new Date().toISOString()
        };

        updatedRecords.push(updated);
      }
    });

    if (updatedRecords.length > 0) {
      const updatedMap = new Map(updatedRecords.map(r => [r.id, r]));
      const newList = cache.attendance.map(r => updatedMap.get(r.id) || r);
      cache.attendance = newList;
      setStored(STORAGE_KEYS.ATTENDANCE, newList);
      notifyListeners();

      // Persist updates to Firestore
      updatedRecords.forEach(r => {
        setDoc(doc(db, 'attendance', r.id), sanitizeForFirestore(r), { merge: true }).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, `attendance/${r.id}`)
        );
      });

      // Audit Log
      this.addAuditLog({
        userId: 'system',
        userName: 'Auto Check-Out Engine',
        userRole: 'super_admin',
        action: 'ATTENDANCE_AUTO_CHECKOUT',
        target: `${updatedRecords.length} records`,
        details: `System automatically completed missing check-out for ${updatedRecords.length} record(s) using policy: ${policy}`,
        ipAddress: '127.0.0.1'
      });
    }

    return { processedCount: updatedRecords.length, updatedRecords };
  },
  async clearAllAttendance(): Promise<number> {
    const initialCount = cache.attendance.length;
    const oldRecords = [...cache.attendance];

    // 1. Immediately wipe in-memory cache and localStorage
    cache.attendance = [];
    setStored(STORAGE_KEYS.ATTENDANCE, []);

    // 2. Remove pending offline mutations for attendance to prevent ghost re-creations
    offlineSyncQueue = offlineSyncQueue.filter(item => item.collection !== 'attendance');
    saveSyncQueue();

    notifyListeners();

    // 3. Delete from Firestore in batches
    let deletedCount = initialCount;
    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      if (!snapshot.empty) {
        deletedCount = snapshot.size;
        const docs = snapshot.docs;
        const batchSize = 400; // max batch limit in Firestore is 500
        for (let i = 0; i < docs.length; i += batchSize) {
          const chunk = docs.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach(d => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.warn('Batch deletion of attendance failed, trying individual deleteDocs:', err);
      // Fallback: delete old known records individually
      oldRecords.forEach(r => {
        deleteDoc(doc(db, 'attendance', r.id)).catch(() => {});
      });
    }

    notifyListeners();
    return deletedCount;
  },

  // Schedule Substitutions & Absent Coverage Management
  getSubstitutions(): ScheduleSubstitution[] {
    return cache.substitutions;
  },
  saveSubstitutions(items: ScheduleSubstitution[]) {
    cache.substitutions = items;
    setStored(STORAGE_KEYS.SUBSTITUTIONS, items);
    notifyListeners();
    items.forEach(s => {
      setDoc(doc(db, 'schedule_substitutions', s.id), sanitizeForFirestore(s)).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `schedule_substitutions/${s.id}`)
      );
    });
  },
  findSubstitution(scheduleId: string, dateStr: string): ScheduleSubstitution | undefined {
    return cache.substitutions.find(
      s => (s.subjectScheduleId === scheduleId) && s.date === dateStr && s.status !== 'cancelled'
    );
  },
  saveSubstitution(sub: ScheduleSubstitution) {
    const list = [sub, ...cache.substitutions.filter(s => s.id !== sub.id)];
    cache.substitutions = list;
    setStored(STORAGE_KEYS.SUBSTITUTIONS, list);
    notifyListeners();
    setDoc(doc(db, 'schedule_substitutions', sub.id), sanitizeForFirestore(sub)).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, `schedule_substitutions/${sub.id}`)
    );
  },
  deleteSubstitution(id: string) {
    const list = cache.substitutions.filter(s => s.id !== id);
    cache.substitutions = list;
    setStored(STORAGE_KEYS.SUBSTITUTIONS, list);
    notifyListeners();
    deleteDoc(doc(db, 'schedule_substitutions', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `schedule_substitutions/${id}`)
    );
  },
  assignScheduleSubstitute(params: {
    schedule: TeacherSubjectSchedule;
    date: string;
    assignees?: ScheduleSubstitutionAssignee[];
    // Single assignee backwards compatibility:
    substituteType?: 'teacher' | 'employee';
    substituteId?: string;
    substituteName?: string;
    substituteKhmerName?: string;
    substituteDepartment?: string;
    manualGrossWage?: number; // for staff: manual gross wage, default 0
    markCheckedIn?: boolean;
    checkInTime?: string;
    checkOutTime?: string;
    note?: string;
    assignedBy?: string;
  }): { success: boolean; message: string; substitution: ScheduleSubstitution } {
    const { schedule, date } = params;

    // Helper: calculate schedule duration
    const parseMins = (t?: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const sStartM = parseMins(schedule.startTime);
    const sEndM = parseMins(schedule.endTime);
    const schedDurationHours = Math.max(0.5, Math.round(((sEndM - sStartM) / 60) * 100) / 100);

    // 1. Normalize assignees list: support 1 or more teachers / staff
    let normalizedAssignees: ScheduleSubstitutionAssignee[] = [];
    if (params.assignees && params.assignees.length > 0) {
      normalizedAssignees = params.assignees.map((a, idx) => ({
        id: a.id || `assignee-${Date.now()}-${idx}`,
        substituteType: a.substituteType,
        substituteId: a.substituteId,
        substituteName: a.substituteName,
        substituteKhmerName: a.substituteKhmerName,
        substituteDepartment: a.substituteDepartment,
        startTime: a.startTime || schedule.startTime,
        endTime: a.endTime || schedule.endTime,
        allocatedHours: a.allocatedHours || schedDurationHours,
        // For staff gross wage is manual, default is 0
        manualGrossWage: a.substituteType === 'employee'
          ? (a.manualGrossWage !== undefined && !isNaN(Number(a.manualGrossWage)) ? Number(a.manualGrossWage) : 0)
          : 0,
        hourlyRate: a.hourlyRate,
        calculatedWage: a.calculatedWage,
        checkInTime: a.checkInTime || (params.markCheckedIn !== false ? (a.startTime || schedule.startTime) : undefined),
        checkOutTime: a.checkOutTime || (params.markCheckedIn !== false ? (a.endTime || schedule.endTime) : undefined)
      }));
    } else if (params.substituteId && params.substituteName) {
      const subType = params.substituteType || 'teacher';
      const staffWage = subType === 'employee'
        ? (params.manualGrossWage !== undefined && !isNaN(Number(params.manualGrossWage)) ? Number(params.manualGrossWage) : 0)
        : 0;
      normalizedAssignees = [
        {
          id: `assignee-${Date.now()}-0`,
          substituteType: subType,
          substituteId: params.substituteId,
          substituteName: params.substituteName,
          substituteKhmerName: params.substituteKhmerName,
          substituteDepartment: params.substituteDepartment,
          startTime: params.checkInTime || schedule.startTime,
          endTime: params.checkOutTime || schedule.endTime,
          allocatedHours: schedDurationHours,
          manualGrossWage: staffWage,
          checkInTime: params.markCheckedIn !== false ? (params.checkInTime || schedule.startTime) : undefined,
          checkOutTime: params.markCheckedIn !== false ? (params.checkOutTime || schedule.endTime) : undefined
        }
      ];
    } else {
      throw new Error('No substitute assignees specified.');
    }

    // 2. Clean up any previous substitute attendance records for this schedule & date
    const prevSubRecords = cache.attendance.filter(
      r => r.date === date &&
           (r.subjectScheduleId === schedule.id || r.scheduleId === schedule.id) &&
           r.isSubstitute
    );
    prevSubRecords.forEach(r => this.deleteAttendanceRecord(r.id));

    // 3. Mark original teacher as Absent ($0 wage) for this class session if not already absent
    const origTeacherId = schedule.teacherId;
    const existingAbsent = cache.attendance.find(
      r => r.date === date &&
           (r.subjectScheduleId === schedule.id || r.scheduleId === schedule.id) &&
           (r.personId === origTeacherId || r.personName?.toLowerCase() === schedule.teacherName?.toLowerCase())
    );

    const summaryAssigneeNames = normalizedAssignees.map(a =>
      `${a.substituteName} (${a.substituteType === 'employee' ? 'Staff' : 'Teacher'}, ${a.allocatedHours}h${a.substituteType === 'employee' ? `, $${(a.manualGrossWage ?? 0).toFixed(2)}` : ''})`
    ).join(' + ');

    const absentNote = `Absent - Reassigned to: ${summaryAssigneeNames}`;

    if (existingAbsent) {
      this.updateAttendanceRecord(existingAbsent.id, {
        status: 'Absent',
        checkInTime: undefined,
        checkOutTime: undefined,
        correctionNote: absentNote,
        updatedAt: new Date().toISOString()
      });
    } else {
      const absentRecord: AttendanceRecord = {
        id: `att-${date}-${origTeacherId}-${schedule.id}-absent`,
        personId: origTeacherId,
        personType: 'teacher',
        personName: schedule.teacherName,
        khmerName: schedule.khmerTeacherName,
        department: 'Academic',
        date,
        scheduleId: schedule.id,
        subjectScheduleId: schedule.id,
        subject: schedule.subject,
        khmerSubject: schedule.khmerSubject,
        gradeClass: schedule.gradeClass,
        room: schedule.room,
        periodName: schedule.periodName,
        session: parseInt(schedule.startTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
        scheduledStart: schedule.startTime,
        scheduledEnd: schedule.endTime,
        status: 'Absent',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        locationVerified: false,
        correctionNote: absentNote,
        createdAt: `${date}T${schedule.startTime}:00`
      };
      this.addAttendanceRecord(absentRecord);
    }

    // 4. Create attendance records for each assigned substitute (teacher or staff)
    normalizedAssignees.forEach((assignee, idx) => {
      const subAttendanceId = `att-${date}-${assignee.substituteId}-${schedule.id}-sub-${idx}`;
      const resolvedStaffWage = assignee.substituteType === 'employee'
        ? (assignee.manualGrossWage !== undefined && !isNaN(Number(assignee.manualGrossWage)) ? Number(assignee.manualGrossWage) : 0)
        : undefined;

      const subRecord: AttendanceRecord = {
        id: subAttendanceId,
        personId: assignee.substituteId,
        personType: assignee.substituteType,
        personName: assignee.substituteName,
        khmerName: assignee.substituteKhmerName,
        department: assignee.substituteDepartment || 'Academic',
        date,
        scheduleId: schedule.id,
        subjectScheduleId: schedule.id,
        subject: schedule.subject,
        khmerSubject: schedule.khmerSubject,
        gradeClass: schedule.gradeClass,
        room: schedule.room,
        periodName: schedule.periodName,
        session: parseInt((assignee.startTime || schedule.startTime).split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
        scheduledStart: assignee.startTime || schedule.startTime,
        scheduledEnd: assignee.endTime || schedule.endTime,
        checkInTime: assignee.checkInTime || (params.markCheckedIn !== false ? (assignee.startTime || schedule.startTime) : undefined),
        checkOutTime: assignee.checkOutTime || (params.markCheckedIn !== false ? (assignee.endTime || schedule.endTime) : undefined),
        status: 'Present',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        locationVerified: true,
        isSubstitute: true,
        originalTeacherId: origTeacherId,
        originalTeacherName: schedule.teacherName,
        originalTeacherKhmer: schedule.khmerTeacherName,
        substituteType: assignee.substituteType,
        manualGrossWage: resolvedStaffWage,
        reassignedBy: params.assignedBy || 'Admin',
        reassignedAt: new Date().toISOString(),
        reassignReason: params.note,
        correctionNote: `Substitute covering for absent teacher ${schedule.teacherName} (${assignee.allocatedHours} hr${assignee.substituteType === 'employee' ? `, Staff Gross Wage: $${(resolvedStaffWage ?? 0).toFixed(2)}` : ''})`,
        createdAt: `${date}T${assignee.startTime || schedule.startTime}:00`,
        updatedAt: new Date().toISOString()
      };

      this.addAttendanceRecord(subRecord);
      assignee.attendanceRecordId = subAttendanceId;
    });

    // 5. Save the substitution record
    const subRecordId = `subst-${date}-${schedule.id}`;
    const primaryAssignee = normalizedAssignees[0];
    const totalStaffManualWage = normalizedAssignees
      .filter(a => a.substituteType === 'employee')
      .reduce((sum, a) => sum + (Number(a.manualGrossWage) || 0), 0);

    const substitution: ScheduleSubstitution = {
      id: subRecordId,
      date,
      subjectScheduleId: schedule.id,
      subject: schedule.subject,
      khmerSubject: schedule.khmerSubject,
      gradeClass: schedule.gradeClass,
      room: schedule.room,
      periodName: schedule.periodName,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      totalScheduleHours: schedDurationHours,
      originalTeacherId: origTeacherId,
      originalTeacherName: schedule.teacherName,
      originalTeacherKhmer: schedule.khmerTeacherName,
      assignees: normalizedAssignees,
      // Backwards-compatible fields for components reading single substitute properties:
      substituteType: primaryAssignee.substituteType,
      substituteId: primaryAssignee.substituteId,
      substituteName: normalizedAssignees.length === 1
        ? primaryAssignee.substituteName
        : normalizedAssignees.map(a => a.substituteName).join(', '),
      substituteKhmerName: primaryAssignee.substituteKhmerName,
      substituteDepartment: primaryAssignee.substituteDepartment,
      manualGrossWage: totalStaffManualWage,
      status: 'assigned',
      note: params.note,
      checkInTime: primaryAssignee.checkInTime,
      checkOutTime: primaryAssignee.checkOutTime,
      assignedBy: params.assignedBy || 'Admin',
      assignedAt: new Date().toISOString()
    };
    this.saveSubstitution(substitution);

    // 6. Add Audit Log
    this.addAuditLog({
      userId: params.assignedBy || 'admin',
      userName: params.assignedBy || 'Administrator',
      userRole: 'admin',
      action: 'SCHEDULE_SUBSTITUTE_ASSIGNED',
      target: `${schedule.subject} (${schedule.gradeClass}) - ${schedule.periodName}`,
      details: `Teacher ${schedule.teacherName} absent. Reassigned to ${normalizedAssignees.length} substitute(s): ${summaryAssigneeNames}. Total schedule hours: ${schedDurationHours}h.`,
      ipAddress: '127.0.0.1'
    });

    return {
      success: true,
      message: `Successfully assigned ${normalizedAssignees.length} substitute(s) to cover ${schedule.subject} for absent teacher ${schedule.teacherName}.`,
      substitution
    };
  },
  removeScheduleSubstitute(scheduleId: string, dateStr: string): { success: boolean; message: string } {
    const existing = this.findSubstitution(scheduleId, dateStr);
    if (!existing) {
      return { success: false, message: 'No active substitution found for this schedule.' };
    }

    // 1. Delete the substitution entry
    this.deleteSubstitution(existing.id);

    // 2. Remove all substitute attendance records for this schedule & date
    const subAtts = cache.attendance.filter(
      r => r.date === dateStr &&
           (r.subjectScheduleId === scheduleId || r.scheduleId === scheduleId) &&
           r.isSubstitute
    );
    subAtts.forEach(att => {
      this.deleteAttendanceRecord(att.id);
    });

    // 3. Remove absent record or revert note on original teacher's record if requested
    const origAtt = cache.attendance.find(
      r => r.date === dateStr &&
           (r.subjectScheduleId === scheduleId || r.scheduleId === scheduleId) &&
           r.personId === existing.originalTeacherId &&
           r.status === 'Absent'
    );
    if (origAtt && origAtt.correctionNote?.includes('Reassigned')) {
      this.updateAttendanceRecord(origAtt.id, {
        correctionNote: undefined
      });
    }

    // 4. Audit Log
    this.addAuditLog({
      userId: 'admin',
      userName: 'Administrator',
      userRole: 'admin',
      action: 'SCHEDULE_SUBSTITUTE_REMOVED',
      target: `${existing.subject} (${existing.gradeClass}) - ${dateStr}`,
      details: `Removed substitution for ${existing.substituteName} covering ${existing.originalTeacherName}`,
      ipAddress: '127.0.0.1'
    });

    return { success: true, message: 'Substitution reverted successfully.' };
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
      setDoc(doc(db, 'leave_requests', r.id), sanitizeForFirestore(r)).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `leave_requests/${r.id}`)
      );
    });
  },
  addLeaveRequest(req: LeaveRequest) {
    const list = [req, ...cache.leaveRequests.filter(l => l.id !== req.id)];
    cache.leaveRequests = list;
    setStored(STORAGE_KEYS.LEAVE_REQUESTS, list);
    notifyListeners();
    setDoc(doc(db, 'leave_requests', req.id), sanitizeForFirestore(req)).catch(err =>
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
      setDoc(doc(db, 'leave_requests', id), sanitizeForFirestore(updated), { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `leave_requests/${id}`)
      );
      if (updates.status === 'Approved') {
        this.generateAttendanceForApprovedLeave(updated, updates.approvedBy);
      } else if (updates.status === 'Rejected') {
        this.removeAttendanceForCancelledLeave(updated);
      }
    }
  },

  generateAttendanceForApprovedLeave(leave: LeaveRequest, _approvedBy?: string): AttendanceRecord[] {
    if (!leave.startDate || !leave.endDate) return [];

    // Helper to calculate all date strings between startDate and endDate
    const dates: string[] = [];
    const [sYear, sMonth, sDay] = leave.startDate.split('-').map(Number);
    const [eYear, eMonth, eDay] = leave.endDate.split('-').map(Number);
    if (!sYear || !sMonth || !sDay || !eYear || !eMonth || !eDay) {
      dates.push(leave.startDate);
    } else {
      const current = new Date(sYear, sMonth - 1, sDay);
      const end = new Date(eYear, eMonth - 1, eDay);
      let guard = 0;
      while (current <= end && guard < 90) {
        guard++;
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    }

    if (dates.length === 0) return [];

    const teachers = this.getTeachers();
    const employees = this.getEmployees();
    const subjectSchedules = this.getSubjectSchedules();
    const dutySchedules = this.getSchedules();

    // Match teacher or employee
    const matchedTeacher = teachers.find(
      t => t.id === leave.personId ||
           t.fullName?.trim().toLowerCase() === leave.personName?.trim().toLowerCase() ||
           (t.khmerName && t.khmerName.trim() === leave.personName?.trim())
    );
    const matchedEmployee = !matchedTeacher ? employees.find(
      e => e.id === leave.personId ||
           e.fullName?.trim().toLowerCase() === leave.personName?.trim().toLowerCase() ||
           (e.khmerName && e.khmerName.trim() === leave.personName?.trim())
    ) : undefined;

    const generatedRecords: AttendanceRecord[] = [];

    dates.forEach(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      if (matchedTeacher) {
        // Find teacher subject classes scheduled on this day of week
        const matchingSchedules = subjectSchedules.filter(s => {
          const isTeacher = s.teacherId === matchedTeacher.id ||
            s.teacherName?.trim().toLowerCase() === matchedTeacher.fullName?.trim().toLowerCase();
          if (!isTeacher) return false;
          if (s.daysOfWeek && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
            return s.daysOfWeek.includes(dayOfWeek);
          }
          return s.dayOfWeek === dayOfWeek;
        });

        if (matchingSchedules.length > 0) {
          matchingSchedules.forEach(sub => {
            const existing = cache.attendance.find(
              a => a.personId === matchedTeacher.id &&
                   a.date === dateStr &&
                   (a.subjectScheduleId === sub.id || a.scheduleId === sub.id) &&
                   !a.isSubstitute
            );

            if (existing) {
              if (existing.status !== 'Present' && !existing.checkInTime) {
                this.updateAttendanceRecord(existing.id, {
                  status: 'Leave',
                  correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
                  reassignReason: `On approved ${leave.leaveType}`
                });
                generatedRecords.push(existing);
              }
            } else {
              const newRec: AttendanceRecord = {
                id: `att-${dateStr}-${matchedTeacher.id}-${sub.id}-leave`,
                personId: matchedTeacher.id,
                personType: 'teacher',
                personName: matchedTeacher.fullName,
                khmerName: matchedTeacher.khmerName,
                department: matchedTeacher.department || leave.department,
                date: dateStr,
                scheduleId: matchedTeacher.assignedScheduleId || 'sch-standard-fulltime',
                scheduleName: `${sub.subject} Class Schedule`,
                subjectScheduleId: sub.id,
                subject: sub.subject,
                khmerSubject: sub.khmerSubject,
                subjectCode: sub.subjectCode,
                gradeClass: sub.gradeClass,
                room: sub.room,
                periodName: sub.periodName,
                session: parseInt(sub.startTime.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
                scheduledStart: sub.startTime,
                scheduledEnd: sub.endTime,
                status: 'Leave',
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeMinutes: 0,
                locationVerified: false,
                correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
                reassignReason: `On approved ${leave.leaveType}`,
                createdAt: `${dateStr}T${sub.startTime}:00`
              };
              this.addAttendanceRecord(newRec);
              generatedRecords.push(newRec);
            }
          });
        } else if (dayOfWeek >= 1 && dayOfWeek <= 6) {
          // If no specific class schedule on this day of week, log daily duty leave
          const existing = cache.attendance.find(
            a => a.personId === matchedTeacher.id && a.date === dateStr && !a.isSubstitute
          );
          if (!existing) {
            const generalSched = dutySchedules.find(s => s.id === matchedTeacher.assignedScheduleId) || dutySchedules[0];
            const newRec: AttendanceRecord = {
              id: `att-${dateStr}-${matchedTeacher.id}-leave`,
              personId: matchedTeacher.id,
              personType: 'teacher',
              personName: matchedTeacher.fullName,
              khmerName: matchedTeacher.khmerName,
              department: matchedTeacher.department || leave.department,
              date: dateStr,
              scheduleId: generalSched?.id || 'sch-standard-fulltime',
              scheduleName: generalSched?.name || 'General Teaching Duty',
              scheduledStart: generalSched?.startTime || '07:30',
              scheduledEnd: generalSched?.endTime || '16:30',
              status: 'Leave',
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: 0,
              locationVerified: false,
              correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
              reassignReason: `On approved ${leave.leaveType}`,
              createdAt: `${dateStr}T07:30:00`
            };
            this.addAttendanceRecord(newRec);
            generatedRecords.push(newRec);
          }
        }
      } else if (matchedEmployee) {
        // Employee / Staff: Look up assigned duty schedule
        const empSchedule = dutySchedules.find(s => s.id === matchedEmployee.assignedScheduleId) ||
          dutySchedules.find(s => s.department === matchedEmployee.department) ||
          dutySchedules[0];

        const isWorkingDay = empSchedule ? empSchedule.daysOfWeek.includes(dayOfWeek) : (dayOfWeek >= 1 && dayOfWeek <= 5);

        if (isWorkingDay) {
          const existing = cache.attendance.find(
            a => a.personId === matchedEmployee.id && a.date === dateStr && !a.subjectScheduleId && !a.isSubstitute
          );

          if (existing) {
            if (existing.status !== 'Present' && !existing.checkInTime) {
              this.updateAttendanceRecord(existing.id, {
                status: 'Leave',
                correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
                reassignReason: `On approved ${leave.leaveType}`
              });
              generatedRecords.push(existing);
            }
          } else {
            const newRec: AttendanceRecord = {
              id: `att-${dateStr}-${matchedEmployee.id}-leave`,
              personId: matchedEmployee.id,
              personType: 'employee',
              personName: matchedEmployee.fullName,
              khmerName: matchedEmployee.khmerName,
              department: matchedEmployee.department || leave.department,
              date: dateStr,
              scheduleId: empSchedule?.id || 'sch-office-fulltime',
              scheduleName: empSchedule?.name || 'Office Duty Schedule',
              scheduledStart: empSchedule?.startTime || '07:30',
              scheduledEnd: empSchedule?.endTime || '17:00',
              status: 'Leave',
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: 0,
              locationVerified: false,
              correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
              reassignReason: `On approved ${leave.leaveType}`,
              createdAt: `${dateStr}T${empSchedule?.startTime || '07:30'}:00`
            };
            this.addAttendanceRecord(newRec);
            generatedRecords.push(newRec);
          }
        }
      } else {
        // General staff fallback without explicit teacher/employee profile
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const existing = cache.attendance.find(
            a => a.personId === leave.personId && a.date === dateStr && !a.isSubstitute
          );
          if (!existing) {
            const newRec: AttendanceRecord = {
              id: `att-${dateStr}-${leave.personId}-leave`,
              personId: leave.personId,
              personType: 'employee',
              personName: leave.personName,
              department: leave.department,
              date: dateStr,
              scheduleId: 'sch-general-leave',
              scheduleName: 'General Duty Schedule',
              scheduledStart: '07:30',
              scheduledEnd: '17:00',
              status: 'Leave',
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: 0,
              locationVerified: false,
              correctionNote: `Approved Leave (${leave.leaveType}): ${leave.reason || 'Auto-logged on leave approval'}`,
              reassignReason: `On approved ${leave.leaveType}`,
              createdAt: `${dateStr}T07:30:00`
            };
            this.addAttendanceRecord(newRec);
            generatedRecords.push(newRec);
          }
        }
      }
    });

    return generatedRecords;
  },

  removeAttendanceForCancelledLeave(leave: LeaveRequest) {
    if (!leave.startDate || !leave.endDate) return;

    const dates: string[] = [];
    const [sYear, sMonth, sDay] = leave.startDate.split('-').map(Number);
    const [eYear, eMonth, eDay] = leave.endDate.split('-').map(Number);
    if (!sYear || !sMonth || !sDay || !eYear || !eMonth || !eDay) {
      dates.push(leave.startDate);
    } else {
      const current = new Date(sYear, sMonth - 1, sDay);
      const end = new Date(eYear, eMonth - 1, eDay);
      let guard = 0;
      while (current <= end && guard < 90) {
        guard++;
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    }

    if (dates.length === 0) return;

    const toRemove = cache.attendance.filter(a => {
      const isPerson = a.personId === leave.personId ||
        a.personName?.trim().toLowerCase() === leave.personName?.trim().toLowerCase();
      if (!isPerson) return false;
      if (!dates.includes(a.date)) return false;
      // Only remove if it was an auto-logged leave record that hasn't been scanned/checked-in
      return a.status === 'Leave' && !a.checkInTime;
    });

    if (toRemove.length > 0) {
      const remaining = cache.attendance.filter(a => !toRemove.some(r => r.id === a.id));
      cache.attendance = remaining;
      setStored(STORAGE_KEYS.ATTENDANCE, remaining);
      notifyListeners();
      toRemove.forEach(r => {
        deleteDoc(doc(db, 'attendance', r.id)).catch(err =>
          handleFirestoreError(err, OperationType.DELETE, `attendance/${r.id}`)
        );
      });
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
    setDoc(doc(db, 'telegram_settings', 'config'), settings, { merge: true }).catch(err => {
      console.warn('Notice: telegram settings saved locally, cloud sync pending:', err);
    });
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
      console.warn('Failed to log telegram message to cloud:', err)
    );
  },

  // System Settings
  getSystemSettings(): SystemSettings {
    return cache.systemSettings;
  },
  getSettings(): SystemSettings {
    return this.getSystemSettings();
  },
  saveSystemSettings(settings: SystemSettings) {
    cache.systemSettings = settings;
    setStored(STORAGE_KEYS.SYSTEM_SETTINGS, settings);
    notifyListeners();
    setDoc(doc(db, 'system_settings', 'config'), settings, { merge: true }).catch(err => {
      console.warn('Notice: system settings saved locally, cloud sync pending:', err);
    });
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
  },

  // Offline Auto-Sync API for Admin
  getOfflineSyncQueue(): OfflineSyncItem[] {
    return [...offlineSyncQueue];
  },
  getSyncHistory(): SyncHistoryLog[] {
    return [...syncHistory];
  },
  getLastSyncedAt(): string | null {
    return lastSyncedAt;
  },
  isSyncing(): boolean {
    return isSyncing;
  },
  subscribeSync(fn: () => void): () => void {
    syncListeners.add(fn);
    return () => {
      syncListeners.delete(fn);
    };
  },
  triggerOfflineSync(): Promise<{ succeeded: number; failed: number }> {
    return processOfflineSyncQueue();
  },
  clearSyncQueue(): void {
    offlineSyncQueue = [];
    saveSyncQueue();
    notifySyncListeners();
  },
  clearSyncHistory(): void {
    syncHistory = [];
    saveSyncHistory();
    notifySyncListeners();
  },

  // Full Database Backup Engine
  createFullDatabaseBackup() {
    const sys = this.getSystemSettings();
    const teachers = this.getTeachers();
    const employees = this.getEmployees();
    const departments = this.getDepartments();
    const schedules = this.getSchedules();
    const subjectSchedules = this.getSubjectSchedules();
    const periods = this.getPeriods();
    const attendance = this.getAttendance();
    const leaveRequests = this.getLeaveRequests();
    const holidays = this.getHolidays();
    const substitutions = this.getSubstitutions();
    const users = this.getUsers().map(u => ({ ...u, password: '[PROTECTED]' }));
    const roles = this.getRoles();
    const auditLogs = this.getAuditLogs();
    const now = new Date().toISOString();

    const stats = {
      teachers: teachers.length,
      employees: employees.length,
      departments: departments.length,
      dutySchedules: schedules.length,
      subjectSchedules: subjectSchedules.length,
      timetablePeriods: periods.length,
      attendanceRecords: attendance.length,
      leaveRequests: leaveRequests.length,
      holidays: holidays.length,
      substitutions: substitutions.length,
      userAccounts: users.length,
      auditLogs: auditLogs.length,
      totalEntities:
        teachers.length +
        employees.length +
        departments.length +
        schedules.length +
        subjectSchedules.length +
        attendance.length +
        leaveRequests.length +
        holidays.length
    };

    return {
      version: '2.0.0',
      exportedAt: now,
      organizationName: sys.organizationName || 'Heart School Siem Reap',
      khmerOrgName: sys.khmerOrgName || 'សាលា Heart School',
      academicYear: sys.academicYear || '2026-2027',
      backupType: 'Full System Snapshot Archive',
      stats,
      data: {
        systemSettings: sys,
        teachers,
        employees,
        departments,
        schedules,
        subjectSchedules,
        periods,
        attendance,
        leaveRequests,
        holidays,
        substitutions,
        roles,
        users,
        auditLogs: auditLogs.slice(0, 200)
      }
    };
  },

  // Restore Full Database from Backup Object
  restoreFullDatabaseBackup(backup: any): { success: boolean; message: string; restoredCount: number } {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup data format');
    }

    const payload = backup.data || backup;
    let restoredCount = 0;

    if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
      cache.teachers = payload.teachers;
      setStored(STORAGE_KEYS.TEACHERS, cache.teachers);
      payload.teachers.forEach((t: any) => {
        setDoc(doc(db, 'teachers', t.id), sanitizeForFirestore(t), { merge: true }).catch(err =>
          console.warn('Restore teacher notice:', err)
        );
      });
      restoredCount += payload.teachers.length;
    }

    if (Array.isArray(payload.employees) && payload.employees.length > 0) {
      cache.employees = payload.employees;
      setStored(STORAGE_KEYS.EMPLOYEES, cache.employees);
      payload.employees.forEach((e: any) => {
        setDoc(doc(db, 'employees', e.id), sanitizeForFirestore(e), { merge: true }).catch(err =>
          console.warn('Restore employee notice:', err)
        );
      });
      restoredCount += payload.employees.length;
    }

    if (Array.isArray(payload.departments) && payload.departments.length > 0) {
      cache.departments = payload.departments;
      setStored(STORAGE_KEYS.DEPARTMENTS, cache.departments);
      payload.departments.forEach((d: any) => {
        setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d), { merge: true }).catch(err =>
          console.warn('Restore department notice:', err)
        );
      });
      restoredCount += payload.departments.length;
    }

    if (Array.isArray(payload.schedules) && payload.schedules.length > 0) {
      cache.schedules = payload.schedules;
      setStored(STORAGE_KEYS.SCHEDULES, cache.schedules);
      payload.schedules.forEach((s: any) => {
        setDoc(doc(db, 'schedules', s.id), sanitizeForFirestore(s), { merge: true }).catch(err =>
          console.warn('Restore schedule notice:', err)
        );
      });
      restoredCount += payload.schedules.length;
    }

    if (Array.isArray(payload.subjectSchedules) && payload.subjectSchedules.length > 0) {
      cache.subjectSchedules = payload.subjectSchedules;
      setStored(STORAGE_KEYS.SUBJECT_SCHEDULES, cache.subjectSchedules);
      payload.subjectSchedules.forEach((s: any) => {
        setDoc(doc(db, 'subject_schedules', s.id), sanitizeForFirestore(s), { merge: true }).catch(err =>
          console.warn('Restore subject schedule notice:', err)
        );
      });
      restoredCount += payload.subjectSchedules.length;
    }

    if (Array.isArray(payload.periods) && payload.periods.length > 0) {
      cache.periods = payload.periods;
      setStored(STORAGE_KEYS.PERIODS, cache.periods);
      payload.periods.forEach((p: any) => {
        setDoc(doc(db, 'timetable_periods', p.id), sanitizeForFirestore(p), { merge: true }).catch(err =>
          console.warn('Restore period notice:', err)
        );
      });
      restoredCount += payload.periods.length;
    }

    if (Array.isArray(payload.attendance) && payload.attendance.length > 0) {
      cache.attendance = payload.attendance;
      setStored(STORAGE_KEYS.ATTENDANCE, cache.attendance);
      payload.attendance.forEach((a: any) => {
        setDoc(doc(db, 'attendance', a.id), sanitizeForFirestore(a), { merge: true }).catch(err =>
          console.warn('Restore attendance notice:', err)
        );
      });
      restoredCount += payload.attendance.length;
    }

    if (Array.isArray(payload.leaveRequests) && payload.leaveRequests.length > 0) {
      cache.leaveRequests = payload.leaveRequests;
      setStored(STORAGE_KEYS.LEAVE_REQUESTS, cache.leaveRequests);
      payload.leaveRequests.forEach((l: any) => {
        setDoc(doc(db, 'leave_requests', l.id), sanitizeForFirestore(l), { merge: true }).catch(err =>
          console.warn('Restore leave request notice:', err)
        );
      });
      restoredCount += payload.leaveRequests.length;
    }

    if (Array.isArray(payload.holidays) && payload.holidays.length > 0) {
      cache.holidays = payload.holidays;
      setStored(STORAGE_KEYS.HOLIDAYS, cache.holidays);
      payload.holidays.forEach((h: any) => {
        setDoc(doc(db, 'holidays', h.id), sanitizeForFirestore(h), { merge: true }).catch(err =>
          console.warn('Restore holiday notice:', err)
        );
      });
      restoredCount += payload.holidays.length;
    }

    if (Array.isArray(payload.substitutions) && payload.substitutions.length > 0) {
      cache.substitutions = payload.substitutions;
      setStored(STORAGE_KEYS.SUBSTITUTIONS, cache.substitutions);
      payload.substitutions.forEach((sub: any) => {
        setDoc(doc(db, 'schedule_substitutions', sub.id), sanitizeForFirestore(sub), { merge: true }).catch(err =>
          console.warn('Restore substitution notice:', err)
        );
      });
      restoredCount += payload.substitutions.length;
    }

    if (payload.systemSettings && typeof payload.systemSettings === 'object') {
      cache.systemSettings = payload.systemSettings;
      setStored(STORAGE_KEYS.SYSTEM_SETTINGS, cache.systemSettings);
      setDoc(doc(db, 'system_settings', 'config'), sanitizeForFirestore(payload.systemSettings), { merge: true }).catch(err =>
        console.warn('Restore system settings notice:', err)
      );
    }

    notifyListeners();

    return {
      success: true,
      message: `Successfully restored ${restoredCount} database records from backup archive.`,
      restoredCount
    };
  }
};
