import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { UserAccount, UserRole, Permission, RoleDefinition } from '../types/index.ts';
import { StorageService } from '../services/storageService.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { phoneNumbersMatch, normalizePhoneNumber } from '../utils/phoneUtils.ts';
import { matchTeacher, matchEmployee, findStaffPerson } from '../utils/staffMatchUtils.ts';

interface AuthContextType {
  currentUser: UserAccount;
  currentRole: RoleDefinition;
  hasPermission: (permission: Permission) => boolean;
  canAccessDepartment: (departmentName: string) => boolean;
  switchUser: (user: UserAccount) => void;
  allUsers: UserAccount[];
  roles: RoleDefinition[];
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  loginAs: (role: UserRole) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithCredentials: (identifier: string, password?: string) => Promise<boolean>;
  loginWithPin: (identifier: string, pin: string) => Promise<boolean>;
  loginWithPhone: (phone: string, pin: string) => Promise<boolean>;
  updateCurrentUserProfile: (updates: Partial<UserAccount>) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'edutrack_active_user_v1';
const AUTH_STATUS_KEY = 'edutrack_auth_status_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(StorageService.getUsers());
  const [roles, setRoles] = useState<RoleDefinition[]>(StorageService.getRoles());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Default to Super Admin (planningtks585@gmail.com / singsabmc@gmail.com)
  const defaultAdmin = users.find(u => u.role === 'super_admin') || users[0];

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) {
          // If the saved user is a teacher, guarantee role is 'teacher'
          if (parsed.role === 'teacher' || parsed.personId?.startsWith('tch-') || parsed.id?.includes('tch-')) {
            return {
              ...parsed,
              role: 'teacher'
            };
          }
          let match = users.find(u => u.id === parsed.id || u.email === parsed.email);
          if (match) {
            if (match.role === 'super_admin' && (match.personId === 'tch-001' || match.personId === 'tch-002')) {
              match = { ...match, personId: undefined };
            }
            return match;
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    const sanitizedAdmin = defaultAdmin.role === 'super_admin' && (defaultAdmin.personId === 'tch-001' || defaultAdmin.personId === 'tch-002')
      ? { ...defaultAdmin, personId: undefined }
      : defaultAdmin;
    return sanitizedAdmin;
  });

  const currentUserRef = useRef<UserAccount>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedStatus = localStorage.getItem(AUTH_STATUS_KEY);
      if (savedStatus !== null) {
        return savedStatus === 'true';
      }
      // If user has a valid saved user in localStorage, default to true for existing sessions
      const savedUser = localStorage.getItem(CURRENT_USER_KEY);
      return savedUser !== null;
    } catch {
      return false;
    }
  });

  // Keep users and roles updated with StorageService without corrupting teacher sessions
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      const updatedUsers = StorageService.getUsers();
      setUsers(updatedUsers);
      setRoles(StorageService.getRoles());

      // If user is not authenticated, do not do anything
      const authStatus = localStorage.getItem(AUTH_STATUS_KEY);
      if (authStatus !== 'true') return;

      // Always read the active session from localStorage first, then fallback to currentUserRef
      let activeUser = currentUserRef.current;
      const savedUserStr = localStorage.getItem(CURRENT_USER_KEY);
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.id) {
            activeUser = parsed;
          }
        } catch {}
      }

      if (!activeUser || !activeUser.id) return;

      const isTeacher =
        activeUser.role === 'teacher' ||
        activeUser.personId?.startsWith('tch-') ||
        activeUser.id?.includes('tch-');

      const isEmployee =
        activeUser.role === 'employee' ||
        activeUser.personId?.startsWith('emp-') ||
        activeUser.id?.includes('emp-');

      const currentStillExists = updatedUsers.find(u => u.id === activeUser.id);
      if (currentStillExists) {
        if (isTeacher) {
          const preservedTeacher: UserAccount = {
            ...currentStillExists,
            role: 'teacher',
            personId: activeUser.personId || currentStillExists.personId
          };
          setCurrentUser(preservedTeacher);
          currentUserRef.current = preservedTeacher;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(preservedTeacher));
        } else if (isEmployee) {
          const preservedEmployee: UserAccount = {
            ...currentStillExists,
            role: 'employee',
            personId: activeUser.personId || currentStillExists.personId
          };
          setCurrentUser(preservedEmployee);
          currentUserRef.current = preservedEmployee;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(preservedEmployee));
        } else {
          setCurrentUser(currentStillExists);
          currentUserRef.current = currentStillExists;
        }
      } else {
        // Current user is not in updatedUsers.
        // If currentUser is a teacher, keep their teacher profile! NEVER fallback to super_admin!
        if (isTeacher) {
          const teachers = StorageService.getTeachers();
          const teacher = teachers.find(
            t => t.id === activeUser.personId || t.id === activeUser.id.replace(/^usr-/, '')
          );
          if (teacher) {
            const preservedTeacherUser: UserAccount = {
              ...activeUser,
              role: 'teacher',
              personId: teacher.id,
              fullName: teacher.fullName,
              khmerName: teacher.khmerName,
              department: teacher.department,
              phone: teacher.phone || activeUser.phone
            };
            setCurrentUser(preservedTeacherUser);
            currentUserRef.current = preservedTeacherUser;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(preservedTeacherUser));
          }
        } else if (isEmployee) {
          const employees = StorageService.getEmployees();
          const employee = employees.find(
            e => e.id === activeUser.personId || e.id === activeUser.id.replace(/^usr-/, '')
          );
          if (employee) {
            const preservedEmployeeUser: UserAccount = {
              ...activeUser,
              role: 'employee',
              personId: employee.id,
              fullName: employee.fullName,
              khmerName: employee.khmerName,
              department: employee.department,
              phone: employee.phone || activeUser.phone
            };
            setCurrentUser(preservedEmployeeUser);
            currentUserRef.current = preservedEmployeeUser;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(preservedEmployeeUser));
          }
        }
      }
    });
    return unsub;
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      const authStatus = localStorage.getItem(AUTH_STATUS_KEY);
      const savedUserStr = localStorage.getItem(CURRENT_USER_KEY);

      // If user deliberately logged out, do NOT auto sign-in with stale Firebase Google session
      if (authStatus === 'false') {
        if (fbUser) {
          signOut(auth).catch(() => {});
        }
        setIsLoading(false);
        return;
      }

      // If the saved user in localStorage is a PIN, Phone, or Credentials account (not a Google account),
      // do NOT overwrite it with a background Firebase Google session
      if (savedUserStr && fbUser) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && (parsed.role === 'teacher' || parsed.role === 'employee' || !parsed.id?.startsWith('usr-google-'))) {
            signOut(auth).catch(() => {});
            setIsLoading(false);
            return;
          }
        } catch {}
      }

      if (fbUser && fbUser.email) {
        const updatedUsers = StorageService.getUsers();
        let match = updatedUsers.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

        if (!match) {
          const matchedTeacher = StorageService.getTeachers().find(t => t.email?.toLowerCase() === fbUser.email?.toLowerCase());
          const matchedEmployee = StorageService.getEmployees().find(e => e.email?.toLowerCase() === fbUser.email?.toLowerCase());

          const isSuperAdminEmail =
            !matchedTeacher &&
            (fbUser.email?.toLowerCase() === 'ktasa7038@gmail.com' ||
             fbUser.email?.toLowerCase() === 'planningtks585@gmail.com' ||
             fbUser.email?.toLowerCase() === 'singsabmc@gmail.com');

          const newUser: UserAccount = {
            id: `usr-google-${fbUser.uid.slice(0, 8)}`,
            email: fbUser.email,
            fullName: fbUser.displayName || matchedTeacher?.fullName || 'Faculty Member',
            khmerName: fbUser.displayName || matchedTeacher?.khmerName || 'សាស្ត្រាចារ្យ',
            role: matchedTeacher ? 'teacher' : (matchedEmployee ? 'employee' : (isSuperAdminEmail ? 'super_admin' : 'teacher')),
            department: isSuperAdminEmail ? 'Administration' : (matchedTeacher?.department || 'Academic & Curriculum'),
            personId: matchedTeacher?.id || matchedEmployee?.id || undefined,
            status: 'Active',
            avatarUrl: fbUser.photoURL || matchedTeacher?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            createdAt: new Date().toISOString()
          };
          StorageService.addUser(newUser);
          match = newUser;
        }

        // Clean up legacy erroneous personId if an admin was wrongly tied to a teacher
        if (match.role === 'super_admin' && (match.personId === 'tch-001' || match.personId === 'tch-002')) {
          match = { ...match, personId: undefined };
          StorageService.updateUser(match.id, { personId: undefined });
        }

        setCurrentUser(match);
        currentUserRef.current = match;
        setIsAuthenticated(true);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(match));
        localStorage.setItem(AUTH_STATUS_KEY, 'true');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentRole = useMemo(() => {
    // If the active user is a teacher or tied to a teacher profile, guarantee teacher role definition
    if (currentUser.role === 'teacher' || currentUser.personId?.startsWith('tch-') || currentUser.id?.includes('tch-')) {
      const teacherRole = roles.find(r => r.code === 'teacher');
      if (teacherRole) return teacherRole;
    }
    if (currentUser.role === 'employee' || currentUser.personId?.startsWith('emp-') || currentUser.id?.includes('emp-')) {
      const empRole = roles.find(r => r.code === 'employee');
      if (empRole) return empRole;
    }
    return roles.find(r => r.code === currentUser.role) || roles.find(r => r.code === 'teacher') || roles[0];
  }, [roles, currentUser.role, currentUser.personId, currentUser.id]);

  const hasPermission = (permission: Permission): boolean => {
    // Teachers and employees are strictly barred from Telegram settings and System settings
    if (currentUser.role === 'teacher' || currentUser.role === 'employee') {
      if (
        permission === 'telegram.view' ||
        permission === 'telegram.configure' ||
        permission === 'settings.manage'
      ) {
        return false;
      }
      // Guaranteed permissions for teacher and employee faculty & staff calendars, wage reports, and attendance
      if (
        permission === 'schedules.view' ||
        permission === 'attendance.view' ||
        permission === 'attendance.checkin' ||
        permission === 'attendance.checkout' ||
        permission === 'reports.view'
      ) {
        return true;
      }
    }
    if (currentUser.role === 'super_admin') return true;
    return currentRole.permissions.includes(permission);
  };

  const canAccessDepartment = (departmentName: string): boolean => {
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin_hr') {
      return true;
    }
    if (currentUser.role === 'supervisor') {
      return currentUser.department.toLowerCase() === departmentName.toLowerCase();
    }
    return currentUser.department.toLowerCase() === departmentName.toLowerCase();
  };

  const switchUser = async (user: UserAccount) => {
    // Detach Firebase if switching away from Google account
    if (!user.id.startsWith('usr-google-')) {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch {}
    }
    setCurrentUser(user);
    currentUserRef.current = user;
    setIsAuthenticated(true);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_STATUS_KEY, 'true');
    StorageService.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'Session Role Switched',
      target: `Switched active session to ${user.fullName} (${user.role})`,
      ipAddress: '127.0.0.1'
    });
  };

  const loginAs = (role: UserRole) => {
    const userWithRole = users.find(u => u.role === role) || users[0];
    switchUser(userWithRole);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    // Clear old session
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;
      if (fbUser && fbUser.email) {
        let match = users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (!match) {
          const isSuperAdminEmail =
            fbUser.email?.toLowerCase() === 'ktasa7038@gmail.com' ||
            fbUser.email?.toLowerCase() === 'planningtks585@gmail.com' ||
            fbUser.email?.toLowerCase() === 'singsabmc@gmail.com';

          const matchedTeacher = StorageService.getTeachers().find(t => t.email?.toLowerCase() === fbUser.email?.toLowerCase());
          const matchedEmployee = StorageService.getEmployees().find(e => e.email?.toLowerCase() === fbUser.email?.toLowerCase());

          const newUser: UserAccount = {
            id: `usr-google-${fbUser.uid.slice(0, 8)}`,
            email: fbUser.email,
            fullName: fbUser.displayName || matchedTeacher?.fullName || 'Faculty Member',
            khmerName: fbUser.displayName || matchedTeacher?.khmerName || 'សាស្ត្រាចារ្យ',
            role: isSuperAdminEmail ? 'super_admin' : (matchedTeacher ? 'teacher' : (matchedEmployee ? 'employee' : 'teacher')),
            department: isSuperAdminEmail ? 'Administration' : (matchedTeacher?.department || 'Academic & Curriculum'),
            personId: matchedTeacher?.id || matchedEmployee?.id || undefined,
            status: 'Active',
            avatarUrl: fbUser.photoURL || matchedTeacher?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            createdAt: new Date().toISOString()
          };
          StorageService.addUser(newUser);
          match = newUser;
        }

        // Clean up legacy erroneous personId if an admin was wrongly tied to a teacher
        if (match.role === 'super_admin' && (match.personId === 'tch-001' || match.personId === 'tch-002')) {
          match = { ...match, personId: undefined };
          StorageService.updateUser(match.id, { personId: undefined });
        }

        setCurrentUser(match);
        currentUserRef.current = match;
        setIsAuthenticated(true);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(match));
        localStorage.setItem(AUTH_STATUS_KEY, 'true');

        StorageService.addAuditLog({
          userId: match.id,
          userName: match.fullName,
          userRole: match.role,
          action: 'Google Login',
          target: `User signed in with Google (${fbUser.email})`,
          ipAddress: '127.0.0.1'
        });
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by browser. Please allow popups or use email sign-in.');
      } else {
        setAuthError(err?.message || 'Google sign-in encountered an error. Please try again or sign in with your email / Staff ID.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (identifier: string, _password?: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    // Clear old session first so previous account state never leaks
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {}
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');

    const rawTrimmed = identifier.trim();
    const trimmed = rawTrimmed.toLowerCase();
    
    // 1. First, check teachers directly by smart matching
    const allTeachers = StorageService.getTeachers();
    const matchedTeacher = allTeachers.find(t => matchTeacher(rawTrimmed, t));

    if (matchedTeacher) {
      const updatedUsers = StorageService.getUsers();
      let matched = updatedUsers.find(
        u =>
          (u.personId && u.personId === matchedTeacher.id) ||
          u.id === `usr-${matchedTeacher.id}` ||
          (matchedTeacher.email && u.email.toLowerCase() === matchedTeacher.email.toLowerCase()) ||
          (matchedTeacher.phone && u.phone && phoneNumbersMatch(matchedTeacher.phone, u.phone))
      );

      const isNew = !matched;
      if (!matched) {
        matched = {
          id: `usr-${matchedTeacher.id}`,
          email: matchedTeacher.email || `${matchedTeacher.teacherId.toLowerCase()}@edutrack.edu`,
          fullName: matchedTeacher.fullName,
          khmerName: matchedTeacher.khmerName,
          role: 'teacher',
          department: matchedTeacher.department,
          phone: matchedTeacher.phone,
          personId: matchedTeacher.id,
          pinCode: matchedTeacher.pinCode || '1234',
          status: 'Active',
          avatarUrl: matchedTeacher.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
      } else {
        matched = {
          ...matched,
          role: 'teacher',
          personId: matchedTeacher.id,
          department: matchedTeacher.department,
          phone: matchedTeacher.phone || matched.phone
        };
      }

      setCurrentUser(matched);
      currentUserRef.current = matched;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');

      if (isNew) {
        StorageService.addUser(matched);
      } else {
        StorageService.updateUser(matched.id, matched);
      }

      StorageService.addAuditLog({
        userId: matched.id,
        userName: matched.fullName,
        userRole: 'teacher',
        action: 'User Sign In',
        target: `Signed in as Teacher ${matched.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    // 2. Check employees directly
    const allEmployees = StorageService.getEmployees();
    const matchedEmployee = allEmployees.find(e => matchEmployee(rawTrimmed, e));

    if (matchedEmployee) {
      const updatedUsers = StorageService.getUsers();
      let matched = updatedUsers.find(
        u =>
          (u.personId && u.personId === matchedEmployee.id) ||
          u.id === `usr-${matchedEmployee.id}` ||
          (matchedEmployee.email && u.email.toLowerCase() === matchedEmployee.email.toLowerCase()) ||
          (matchedEmployee.phone && u.phone && phoneNumbersMatch(matchedEmployee.phone, u.phone))
      );

      const isNew = !matched;
      if (!matched) {
        matched = {
          id: `usr-${matchedEmployee.id}`,
          email: matchedEmployee.email || `${matchedEmployee.employeeId.toLowerCase()}@edutrack.edu`,
          fullName: matchedEmployee.fullName,
          khmerName: matchedEmployee.khmerName,
          role: 'employee',
          department: matchedEmployee.department,
          phone: matchedEmployee.phone,
          personId: matchedEmployee.id,
          pinCode: matchedEmployee.pinCode || '1234',
          status: 'Active',
          avatarUrl: matchedEmployee.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
      } else {
        matched = {
          ...matched,
          role: 'employee',
          personId: matchedEmployee.id,
          department: matchedEmployee.department,
          phone: matchedEmployee.phone || matched.phone
        };
      }

      setCurrentUser(matched);
      currentUserRef.current = matched;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');

      if (isNew) {
        StorageService.addUser(matched);
      } else {
        StorageService.updateUser(matched.id, matched);
      }

      StorageService.addAuditLog({
        userId: matched.id,
        userName: matched.fullName,
        userRole: 'employee',
        action: 'User Sign In',
        target: `Signed in as Staff ${matched.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    // 3. Find matching dedicated administrative system user
    let matchedAdmin = users.find(u => 
      u.email.toLowerCase() === trimmed ||
      u.id.toLowerCase() === trimmed ||
      (u.phone && phoneNumbersMatch(rawTrimmed, u.phone)) ||
      (u.phoneNumber && phoneNumbersMatch(rawTrimmed, u.phoneNumber)) ||
      u.fullName.toLowerCase() === trimmed
    );

    if (matchedAdmin) {
      // Guard: if user has a teacher ID or profile, strictly enforce teacher role
      if (
        matchedAdmin.personId?.startsWith('tch-') ||
        allTeachers.some(t => t.id === matchedAdmin?.personId || t.email?.toLowerCase() === matchedAdmin?.email.toLowerCase())
      ) {
        matchedAdmin = {
          ...matchedAdmin,
          role: 'teacher'
        };
      }

      setCurrentUser(matchedAdmin);
      currentUserRef.current = matchedAdmin;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matchedAdmin));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
      StorageService.addAuditLog({
        userId: matchedAdmin.id,
        userName: matchedAdmin.fullName,
        userRole: matchedAdmin.role,
        action: 'User Sign In',
        target: `Signed in as ${matchedAdmin.fullName} (${matchedAdmin.role})`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    } else {
      setIsLoading(false);
      setAuthError('Account not found with this email, phone number, or staff ID. Please verify your credentials or contact the administrator.');
      return false;
    }
  };

  const loginWithPin = async (identifier: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    // Clear old session first so previous account state never leaks
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {}
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');

    const rawTrimmedId = identifier.trim();
    const trimmedId = rawTrimmedId.toLowerCase();
    const trimmedPin = pin.trim();

    if (!trimmedPin) {
      setIsLoading(false);
      setAuthError('Please enter your 4-digit security PIN (សូមបញ្ចូលលេខកូដសម្ងាត់ PIN)');
      return false;
    }

    const allUsers = StorageService.getUsers();
    const allTeachers = StorageService.getTeachers();
    const allEmployees = StorageService.getEmployees();

    // 1. Locate specific teacher or employee
    let matchedPerson:
      | { type: 'teacher'; data: (typeof allTeachers)[0] }
      | { type: 'employee'; data: (typeof allEmployees)[0] }
      | undefined;

    if (trimmedId) {
      // Prioritize smart teacher and employee matching (Teacher ID, short ID, suffix, name, phone, etc.)
      const staffMatch = findStaffPerson(rawTrimmedId, allTeachers, allEmployees);
      if (staffMatch) {
        matchedPerson = staffMatch;
      } else {
        // Fallback: check if matching an administrator or system user by phone, email, or id
        const foundUser = allUsers.find(
          u =>
            (u.phone && phoneNumbersMatch(rawTrimmedId, u.phone)) ||
            (u.phoneNumber && phoneNumbersMatch(rawTrimmedId, u.phoneNumber)) ||
            u.email.toLowerCase() === trimmedId ||
            u.id.toLowerCase() === trimmedId ||
            (u.fullName && u.fullName.toLowerCase() === trimmedId)
        );

        if (foundUser) {
          // If this user is tied to a teacher/employee, resolve to their profile
          const t = allTeachers.find(
            item =>
              item.id === foundUser.personId ||
              (item.email && foundUser.email && item.email.toLowerCase() === foundUser.email.toLowerCase()) ||
              (item.phone && foundUser.phone && phoneNumbersMatch(item.phone, foundUser.phone)) ||
              (foundUser.id && foundUser.id.replace(/^usr-/, '') === item.id)
          );

          if (t) {
            matchedPerson = { type: 'teacher', data: t };
          } else {
            const e = allEmployees.find(
              item =>
                item.id === foundUser.personId ||
                (item.email && foundUser.email && item.email.toLowerCase() === foundUser.email.toLowerCase()) ||
                (item.phone && foundUser.phone && phoneNumbersMatch(item.phone, foundUser.phone)) ||
                (foundUser.id && foundUser.id.replace(/^usr-/, '') === item.id)
            );
            if (e) {
              matchedPerson = { type: 'employee', data: e };
            }
          }

          if (!matchedPerson) {
            // Strictly check if foundUser is a teacher account
            if (foundUser.role === 'teacher' || foundUser.id.startsWith('usr-tch-') || foundUser.personId?.startsWith('tch-')) {
              const requiredPin = foundUser.pinCode || '1234';
              if (trimmedPin !== requiredPin) {
                setIsLoading(false);
                setAuthError(`Incorrect PIN for Teacher ${foundUser.fullName}. Please enter the correct PIN code.`);
                return false;
              }

              const safeTeacherUser: UserAccount = {
                ...foundUser,
                role: 'teacher'
              };
              setCurrentUser(safeTeacherUser);
              currentUserRef.current = safeTeacherUser;
              setIsAuthenticated(true);
              localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeTeacherUser));
              localStorage.setItem(AUTH_STATUS_KEY, 'true');
              StorageService.addAuditLog({
                userId: safeTeacherUser.id,
                userName: safeTeacherUser.fullName,
                userRole: 'teacher',
                action: 'Staff PIN Login',
                target: `Signed in via PIN as Teacher ${safeTeacherUser.fullName}`,
                ipAddress: '127.0.0.1'
              });
              setIsLoading(false);
              return true;
            }

            const requiredPin = foundUser.pinCode || '1234';
            if (trimmedPin !== requiredPin) {
              setIsLoading(false);
              setAuthError(`Incorrect PIN for account ${foundUser.fullName}. Please enter the correct PIN code.`);
              return false;
            }

            // In Teacher PIN portal, if matched to teacher or employee profile, enforce their staff role
            const matchedTeacherProfile = allTeachers.find(
              t => t.id === foundUser.personId || (t.email && foundUser.email && t.email.toLowerCase() === foundUser.email.toLowerCase())
            );
            const isSuperAdminEmail =
              !matchedTeacherProfile &&
              (foundUser.email?.toLowerCase() === 'ktasa7038@gmail.com' ||
               foundUser.email?.toLowerCase() === 'planningtks585@gmail.com' ||
               foundUser.email?.toLowerCase() === 'singsabmc@gmail.com');

            const validatedUser: UserAccount = {
              ...foundUser,
              role: matchedTeacherProfile ? 'teacher' : (isSuperAdminEmail ? 'super_admin' : (foundUser.role === 'super_admin' ? 'teacher' : foundUser.role)),
              personId: matchedTeacherProfile ? matchedTeacherProfile.id : foundUser.personId
            };

            setCurrentUser(validatedUser);
            currentUserRef.current = validatedUser;
            setIsAuthenticated(true);
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(validatedUser));
            localStorage.setItem(AUTH_STATUS_KEY, 'true');
            StorageService.addAuditLog({
              userId: validatedUser.id,
              userName: validatedUser.fullName,
              userRole: validatedUser.role,
              action: 'PIN Login',
              target: `Signed in as ${validatedUser.fullName} (${validatedUser.role})`,
              ipAddress: '127.0.0.1'
            });
            setIsLoading(false);
            return true;
          }
        }
      }
    } else {
      // If no identifier provided, check if exactly one active person has this PIN
      const teachersWithPin = allTeachers.filter(t => (t.pinCode || '1234') === trimmedPin);
      const employeesWithPin = allEmployees.filter(e => (e.pinCode || '1234') === trimmedPin);
      const totalMatches = teachersWithPin.length + employeesWithPin.length;
      if (totalMatches === 1) {
        if (teachersWithPin.length === 1) {
          matchedPerson = { type: 'teacher', data: teachersWithPin[0] };
        } else {
          matchedPerson = { type: 'employee', data: employeesWithPin[0] };
        }
      } else if (totalMatches > 1) {
        setIsLoading(false);
        setAuthError('Multiple accounts share this default PIN. Please enter your Teacher ID, Staff ID, or Phone Number.');
        return false;
      }
    }

    if (!matchedPerson) {
      setIsLoading(false);
      setAuthError(`Teacher or Staff account not found for "${rawTrimmedId}". Please verify your Teacher ID (e.g. TCH-2026-001 or TCH-001) or phone number.`);
      return false;
    }

    // 2. Validate PIN code
    const requiredPin = matchedPerson.data.pinCode || '1234';
    if (trimmedPin !== requiredPin) {
      setIsLoading(false);
      setAuthError(`Incorrect PIN for ${matchedPerson.data.fullName}. Please enter the correct PIN code.`);
      StorageService.addAuditLog({
        userId: 'kiosk_login',
        userName: 'PIN Login',
        userRole: matchedPerson.type,
        action: 'FAILED_PIN_LOGIN',
        target: `${matchedPerson.data.fullName}`,
        details: `Failed PIN attempt for ${matchedPerson.data.fullName}`,
        ipAddress: '127.0.0.1'
      });
      return false;
    }

    // 3. Find or create UserAccount with synchronized PIN and phone
    const updatedUsers = StorageService.getUsers();
    const pData = matchedPerson.data;
    let matchedUser = updatedUsers.find(
      u =>
        (u.personId && u.personId === pData.id) ||
        (pData.phone && u.phone && phoneNumbersMatch(pData.phone, u.phone)) ||
        (pData.email && u.email.toLowerCase() === pData.email.toLowerCase()) ||
        u.fullName.toLowerCase() === pData.fullName.toLowerCase()
    );

    const isNew = !matchedUser;
    if (!matchedUser) {
      matchedUser = {
        id: `usr-${pData.id}`,
        email: pData.email || `${('teacherId' in pData ? pData.teacherId : pData.employeeId).toLowerCase()}@edutrack.edu`,
        fullName: pData.fullName,
        khmerName: pData.khmerName,
        role: matchedPerson.type,
        department: pData.department,
        phone: pData.phone,
        personId: pData.id,
        pinCode: pData.pinCode || '1234',
        status: 'Active',
        avatarUrl: pData.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
        createdAt: new Date().toISOString()
      };
    } else {
      matchedUser = {
        ...matchedUser,
        role: matchedPerson.type,
        personId: pData.id,
        phone: pData.phone || matchedUser.phone,
        pinCode: pData.pinCode || matchedUser.pinCode || '1234',
        avatarUrl: pData.photoUrl || matchedUser.avatarUrl
      };
    }

    // Set active state FIRST before triggering any StorageService listeners
    setCurrentUser(matchedUser);
    currentUserRef.current = matchedUser;
    setIsAuthenticated(true);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matchedUser));
    localStorage.setItem(AUTH_STATUS_KEY, 'true');

    if (isNew) {
      StorageService.addUser(matchedUser);
    } else {
      StorageService.updateUser(matchedUser.id, matchedUser);
    }

    StorageService.addAuditLog({
      userId: matchedUser.id,
      userName: matchedUser.fullName,
      userRole: matchedPerson.type,
      action: 'Staff PIN Login',
      target: `Signed in via PIN as ${matchedPerson.data.fullName}`,
      ipAddress: '127.0.0.1'
    });

    setIsLoading(false);
    return true;
  };

  // Direct Phone Number Login with Security PIN (No Google Phone Auth required)
  const loginWithPhone = async (phone: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    // Clear old session first so previous account state never leaks
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {}
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');

    const trimmedPhone = phone.trim();
    const trimmedPin = pin.trim();

    if (!trimmedPhone) {
      setIsLoading(false);
      setAuthError('Please enter your registered phone number (សូមបញ្ចូលលេខទូរស័ព្ទ)');
      return false;
    }

    if (!trimmedPin) {
      setIsLoading(false);
      setAuthError('Please enter your 4-digit security PIN (សូមបញ្ចូលលេខកូដសម្ងាត់ PIN)');
      return false;
    }

    const allUsers = StorageService.getUsers();
    const allTeachers = StorageService.getTeachers();
    const allEmployees = StorageService.getEmployees();

    // 1. Check if matches any registered teacher first
    const matchedTeacher = allTeachers.find(
      t => t.phone && phoneNumbersMatch(trimmedPhone, t.phone)
    );

    if (matchedTeacher) {
      const requiredPin = matchedTeacher.pinCode || '1234';
      if (trimmedPin !== requiredPin) {
        setIsLoading(false);
        setAuthError(`Incorrect PIN for Teacher ${matchedTeacher.fullName}. Please check your PIN code.`);
        return false;
      }

      let userAcc = allUsers.find(
        u =>
          u.personId === matchedTeacher.id ||
          (matchedTeacher.phone && u.phone && phoneNumbersMatch(matchedTeacher.phone, u.phone)) ||
          (matchedTeacher.email && u.email.toLowerCase() === matchedTeacher.email.toLowerCase())
      );

      const isNew = !userAcc;
      if (!userAcc) {
        userAcc = {
          id: `usr-${matchedTeacher.id}`,
          email: matchedTeacher.email || `${matchedTeacher.teacherId.toLowerCase()}@edutrack.edu`,
          fullName: matchedTeacher.fullName,
          khmerName: matchedTeacher.khmerName,
          role: 'teacher',
          department: matchedTeacher.department,
          phone: matchedTeacher.phone,
          personId: matchedTeacher.id,
          pinCode: matchedTeacher.pinCode || '1234',
          status: 'Active',
          avatarUrl: matchedTeacher.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
      } else {
        userAcc = {
          ...userAcc,
          role: 'teacher',
          personId: matchedTeacher.id,
          phone: matchedTeacher.phone,
          pinCode: matchedTeacher.pinCode || userAcc.pinCode || '1234',
          avatarUrl: matchedTeacher.photoUrl || userAcc.avatarUrl
        };
      }

      // Set active user state FIRST
      setCurrentUser(userAcc);
      currentUserRef.current = userAcc;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userAcc));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');

      if (isNew) {
        StorageService.addUser(userAcc);
      } else {
        StorageService.updateUser(userAcc.id, userAcc);
      }

      StorageService.addAuditLog({
        userId: userAcc.id,
        userName: userAcc.fullName,
        userRole: 'teacher',
        action: 'Phone Login',
        target: `Signed in via Phone (${trimmedPhone}) as ${userAcc.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    // 2. Check if matches any registered employee
    const matchedEmployee = allEmployees.find(
      e => e.phone && phoneNumbersMatch(trimmedPhone, e.phone)
    );

    if (matchedEmployee) {
      const requiredPin = matchedEmployee.pinCode || '1234';
      if (trimmedPin !== requiredPin) {
        setIsLoading(false);
        setAuthError(`Incorrect PIN for Staff ${matchedEmployee.fullName}. Please check your PIN code.`);
        return false;
      }

      let userAcc = allUsers.find(
        u =>
          u.personId === matchedEmployee.id ||
          (matchedEmployee.phone && u.phone && phoneNumbersMatch(matchedEmployee.phone, u.phone)) ||
          (matchedEmployee.email && u.email.toLowerCase() === matchedEmployee.email.toLowerCase())
      );

      const isNew = !userAcc;
      if (!userAcc) {
        userAcc = {
          id: `usr-${matchedEmployee.id}`,
          email: matchedEmployee.email || `${matchedEmployee.employeeId.toLowerCase()}@edutrack.edu`,
          fullName: matchedEmployee.fullName,
          khmerName: matchedEmployee.khmerName,
          role: 'employee',
          department: matchedEmployee.department,
          phone: matchedEmployee.phone,
          personId: matchedEmployee.id,
          pinCode: matchedEmployee.pinCode || '1234',
          status: 'Active',
          avatarUrl: matchedEmployee.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
      } else {
        userAcc = {
          ...userAcc,
          role: 'employee',
          personId: matchedEmployee.id,
          phone: matchedEmployee.phone,
          pinCode: matchedEmployee.pinCode || userAcc.pinCode || '1234',
          avatarUrl: matchedEmployee.photoUrl || userAcc.avatarUrl
        };
      }

      // Set active user state FIRST
      setCurrentUser(userAcc);
      currentUserRef.current = userAcc;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userAcc));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');

      if (isNew) {
        StorageService.addUser(userAcc);
      } else {
        StorageService.updateUser(userAcc.id, userAcc);
      }

      StorageService.addAuditLog({
        userId: userAcc.id,
        userName: userAcc.fullName,
        userRole: 'employee',
        action: 'Phone Login',
        target: `Signed in via Phone (${trimmedPhone}) as ${userAcc.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    // 3. Check if matches any registered administrator or system user
    const matchedUser = allUsers.find(
      u =>
        (u.phone && phoneNumbersMatch(trimmedPhone, u.phone)) ||
        (u.phoneNumber && phoneNumbersMatch(trimmedPhone, u.phoneNumber))
    );

    if (matchedUser) {
      const requiredPin = matchedUser.pinCode || '1234';
      if (trimmedPin !== requiredPin) {
        setIsLoading(false);
        setAuthError(`Incorrect PIN for account ${matchedUser.fullName}. Please check your PIN code.`);
        return false;
      }

      // Guard: if user has a teacher ID or profile, strictly enforce teacher role
      const isTeacher =
        matchedUser.role === 'teacher' ||
        matchedUser.personId?.startsWith('tch-') ||
        allTeachers.some(
          t =>
            t.id === matchedUser.personId ||
            (t.phone && phoneNumbersMatch(trimmedPhone, t.phone)) ||
            (matchedUser.email && t.email?.toLowerCase() === matchedUser.email.toLowerCase())
        );

      const isSuperAdminEmail =
        !isTeacher &&
        (matchedUser.email?.toLowerCase() === 'ktasa7038@gmail.com' ||
         matchedUser.email?.toLowerCase() === 'planningtks585@gmail.com' ||
         matchedUser.email?.toLowerCase() === 'singsabmc@gmail.com');

      const effectiveUser: UserAccount = {
        ...matchedUser,
        role: isTeacher ? 'teacher' : (isSuperAdminEmail ? 'super_admin' : (matchedUser.role === 'super_admin' ? 'teacher' : matchedUser.role))
      };

      setCurrentUser(effectiveUser);
      currentUserRef.current = effectiveUser;
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(effectiveUser));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
      StorageService.addAuditLog({
        userId: effectiveUser.id,
        userName: effectiveUser.fullName,
        userRole: effectiveUser.role,
        action: 'Phone Login',
        target: `Signed in via Phone (${trimmedPhone}) as ${effectiveUser.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    setAuthError('No account found registered with this phone number. Please check your number or contact the administration.');
    return false;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut notice:', e);
    }

    if (currentUser) {
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'User Sign Out',
        target: `${currentUser.fullName} signed out of session`,
        ipAddress: '127.0.0.1'
      });
    }

    // Completely clear active user storage keys
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');

    // Reset currentUser to default sanitized admin so memory state is fresh
    const sanitizedAdmin = defaultAdmin.role === 'super_admin' && (defaultAdmin.personId === 'tch-001' || defaultAdmin.personId === 'tch-002')
      ? { ...defaultAdmin, personId: undefined }
      : defaultAdmin;
    setCurrentUser(sanitizedAdmin);
    currentUserRef.current = sanitizedAdmin;
    setIsAuthenticated(false);
    setAuthError(null);
    setIsLoading(false);
  };

  const updateCurrentUserProfile = (updates: Partial<UserAccount>) => {
    const updated: UserAccount = {
      ...currentUser,
      ...updates
    };
    setCurrentUser(updated);
    currentUserRef.current = updated;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
    if (updated.id) {
      StorageService.updateUser(updated.id, updates);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        hasPermission,
        canAccessDepartment,
        switchUser,
        allUsers: users,
        roles,
        isAuthenticated,
        isLoading,
        logout,
        loginAs,
        loginWithGoogle,
        loginWithCredentials,
        loginWithPin,
        loginWithPhone,
        updateCurrentUserProfile,
        authError,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
