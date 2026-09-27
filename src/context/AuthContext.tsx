import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, Permission, RoleDefinition } from '../types/index.ts';
import { StorageService } from '../services/storageService.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { phoneNumbersMatch, normalizePhoneNumber } from '../utils/phoneUtils.ts';

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
        let match = users.find(u => u.id === parsed.id || u.email === parsed.email);
        if (match) {
          if (match.role === 'super_admin' && (match.personId === 'tch-001' || match.personId === 'tch-002')) {
            match = { ...match, personId: undefined };
          }
          return match;
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

  // Keep users and roles updated with StorageService
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      const updatedUsers = StorageService.getUsers();
      setUsers(updatedUsers);
      setRoles(StorageService.getRoles());
      const currentStillExists = updatedUsers.find(u => u.id === currentUser.id);
      if (currentStillExists) {
        setCurrentUser(currentStillExists);
      } else if (updatedUsers.length > 0) {
        const fallback = updatedUsers.find(u => u.role === 'super_admin') || updatedUsers[0];
        setCurrentUser(fallback);
        try {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(fallback));
        } catch {}
      }
    });
    return unsub;
  }, [currentUser.id]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser && fbUser.email) {
        const updatedUsers = StorageService.getUsers();
        let match = updatedUsers.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

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
        setIsAuthenticated(true);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(match));
        localStorage.setItem(AUTH_STATUS_KEY, 'true');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentRole = roles.find(r => r.code === currentUser.role) || roles[0];

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

  const switchUser = (user: UserAccount) => {
    setCurrentUser(user);
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
    const rawTrimmed = identifier.trim();
    const trimmed = rawTrimmed.toLowerCase();
    
    // 1. Find matching existing user (by email, id, personId, phone, or name)
    let matched = users.find(u => 
      u.email.toLowerCase() === trimmed ||
      u.id.toLowerCase() === trimmed ||
      (u.personId && u.personId.toLowerCase() === trimmed) ||
      (u.phone && phoneNumbersMatch(rawTrimmed, u.phone)) ||
      (u.phoneNumber && phoneNumbersMatch(rawTrimmed, u.phoneNumber)) ||
      u.fullName.toLowerCase() === trimmed ||
      u.fullName.toLowerCase().startsWith(trimmed)
    );

    // 2. If not found in user list, check teachers directly by Teacher ID, Phone, Email, or Name
    if (!matched) {
      const allTeachers = StorageService.getTeachers();
      const matchedTeacher = allTeachers.find(t => 
        t.teacherId.toLowerCase() === trimmed ||
        t.id.toLowerCase() === trimmed ||
        (t.employeeId && t.employeeId.toLowerCase() === trimmed) ||
        (t.phone && phoneNumbersMatch(rawTrimmed, t.phone)) ||
        (t.email && t.email.toLowerCase() === trimmed) ||
        t.fullName.toLowerCase() === trimmed ||
        t.fullName.toLowerCase().includes(trimmed) ||
        (t.khmerName && t.khmerName.includes(trimmed))
      );

      if (matchedTeacher) {
        matched = {
          id: `usr-${matchedTeacher.id}`,
          email: matchedTeacher.email || `${matchedTeacher.teacherId.toLowerCase()}@edutrack.edu`,
          fullName: matchedTeacher.fullName,
          khmerName: matchedTeacher.khmerName,
          role: 'teacher',
          department: matchedTeacher.department,
          phone: matchedTeacher.phone,
          personId: matchedTeacher.id,
          status: 'Active',
          avatarUrl: matchedTeacher.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
        StorageService.addUser(matched);
      }
    }

    // 3. If not found in teachers, check employees directly
    if (!matched) {
      const allEmployees = StorageService.getEmployees();
      const matchedEmployee = allEmployees.find(e => 
        e.employeeId.toLowerCase() === trimmed ||
        e.id.toLowerCase() === trimmed ||
        (e.phone && phoneNumbersMatch(rawTrimmed, e.phone)) ||
        (e.email && e.email.toLowerCase() === trimmed) ||
        e.fullName.toLowerCase() === trimmed ||
        e.fullName.toLowerCase().includes(trimmed) ||
        (e.khmerName && e.khmerName.includes(trimmed))
      );

      if (matchedEmployee) {
        matched = {
          id: `usr-${matchedEmployee.id}`,
          email: matchedEmployee.email || `${matchedEmployee.employeeId.toLowerCase()}@edutrack.edu`,
          fullName: matchedEmployee.fullName,
          khmerName: matchedEmployee.khmerName,
          role: 'employee',
          department: matchedEmployee.department,
          phone: matchedEmployee.phone,
          personId: matchedEmployee.id,
          status: 'Active',
          avatarUrl: matchedEmployee.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
          createdAt: new Date().toISOString()
        };
        StorageService.addUser(matched);
      }
    }

    if (matched) {
      setCurrentUser(matched);
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
      StorageService.addAuditLog({
        userId: matched.id,
        userName: matched.fullName,
        userRole: matched.role,
        action: 'User Sign In',
        target: `Signed in as ${matched.fullName} (${matched.role})`,
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

    // Check if matching an administrator or system user by phone, email, or id
    if (trimmedId) {
      const foundUser = allUsers.find(
        u =>
          (u.phone && phoneNumbersMatch(rawTrimmedId, u.phone)) ||
          (u.phoneNumber && phoneNumbersMatch(rawTrimmedId, u.phoneNumber)) ||
          u.email.toLowerCase() === trimmedId ||
          u.id.toLowerCase() === trimmedId
      );

      if (foundUser) {
        const requiredPin = foundUser.pinCode || '1234';
        if (trimmedPin !== requiredPin) {
          setIsLoading(false);
          setAuthError(`Incorrect PIN for account ${foundUser.fullName}. Please enter the correct PIN code.`);
          return false;
        }

        setCurrentUser(foundUser);
        setIsAuthenticated(true);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(foundUser));
        localStorage.setItem(AUTH_STATUS_KEY, 'true');
        StorageService.addAuditLog({
          userId: foundUser.id,
          userName: foundUser.fullName,
          userRole: foundUser.role,
          action: 'PIN Login',
          target: `Signed in as ${foundUser.fullName} (${foundUser.role})`,
          ipAddress: '127.0.0.1'
        });
        setIsLoading(false);
        return true;
      }
    }

    // 1. Locate specific teacher or employee
    let matchedPerson:
      | { type: 'teacher'; data: (typeof allTeachers)[0] }
      | { type: 'employee'; data: (typeof allEmployees)[0] }
      | undefined;

    if (trimmedId) {
      const foundTeacher = allTeachers.find(
        t =>
          t.teacherId.toLowerCase() === trimmedId ||
          t.id.toLowerCase() === trimmedId ||
          (t.employeeId && t.employeeId.toLowerCase() === trimmedId) ||
          (t.phone && phoneNumbersMatch(rawTrimmedId, t.phone)) ||
          (t.email && t.email.toLowerCase() === trimmedId) ||
          t.fullName.toLowerCase() === trimmedId ||
          t.fullName.toLowerCase().includes(trimmedId) ||
          (t.khmerName && t.khmerName.toLowerCase().includes(trimmedId))
      );
      if (foundTeacher) {
        matchedPerson = { type: 'teacher', data: foundTeacher };
      } else {
        const foundEmployee = allEmployees.find(
          e =>
            e.employeeId.toLowerCase() === trimmedId ||
            e.id.toLowerCase() === trimmedId ||
            (e.phone && phoneNumbersMatch(rawTrimmedId, e.phone)) ||
            (e.email && e.email.toLowerCase() === trimmedId) ||
            e.fullName.toLowerCase() === trimmedId ||
            e.fullName.toLowerCase().includes(trimmedId) ||
            (e.khmerName && e.khmerName.toLowerCase().includes(trimmedId))
        );
        if (foundEmployee) {
          matchedPerson = { type: 'employee', data: foundEmployee };
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
      setAuthError('Staff or Teacher account not found. Please enter your Phone Number, Teacher ID, or Staff ID.');
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

    // 3. Find or create UserAccount
    const updatedUsers = StorageService.getUsers();
    const pData = matchedPerson.data;
    let matchedUser = updatedUsers.find(
      u =>
        (u.personId && u.personId === pData.id) ||
        (pData.phone && u.phone && phoneNumbersMatch(pData.phone, u.phone)) ||
        (pData.email && u.email.toLowerCase() === pData.email.toLowerCase()) ||
        u.fullName.toLowerCase() === pData.fullName.toLowerCase()
    );

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
      StorageService.addUser(matchedUser);
    } else {
      if (matchedUser.role !== matchedPerson.type || matchedUser.personId !== pData.id || !matchedUser.pinCode || !matchedUser.phone) {
        matchedUser = {
          ...matchedUser,
          role: matchedPerson.type,
          personId: pData.id,
          phone: pData.phone || matchedUser.phone,
          pinCode: pData.pinCode || '1234'
        };
        StorageService.updateUser(matchedUser.id, matchedUser);
      }
    }

    setCurrentUser(matchedUser);
    setIsAuthenticated(true);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matchedUser));
    localStorage.setItem(AUTH_STATUS_KEY, 'true');

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

    // 1. Check if matches any registered system user (Super Admin, HR, Manager)
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

      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matchedUser));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
      StorageService.addAuditLog({
        userId: matchedUser.id,
        userName: matchedUser.fullName,
        userRole: matchedUser.role,
        action: 'Phone Login',
        target: `Signed in via Phone (${trimmedPhone}) as ${matchedUser.fullName}`,
        ipAddress: '127.0.0.1'
      });
      setIsLoading(false);
      return true;
    }

    // 2. Check if matches any registered teacher
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
        StorageService.addUser(userAcc);
      } else {
        if (!userAcc.phone || userAcc.phone !== matchedTeacher.phone || !userAcc.pinCode) {
          userAcc = {
            ...userAcc,
            phone: matchedTeacher.phone,
            pinCode: matchedTeacher.pinCode || userAcc.pinCode || '1234'
          };
          StorageService.updateUser(userAcc.id, userAcc);
        }
      }

      setCurrentUser(userAcc);
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userAcc));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
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

    // 3. Check if matches any registered employee
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
        StorageService.addUser(userAcc);
      } else {
        if (!userAcc.phone || userAcc.phone !== matchedEmployee.phone || !userAcc.pinCode) {
          userAcc = {
            ...userAcc,
            phone: matchedEmployee.phone,
            pinCode: matchedEmployee.pinCode || userAcc.pinCode || '1234'
          };
          StorageService.updateUser(userAcc.id, userAcc);
        }
      }

      setCurrentUser(userAcc);
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userAcc));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
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

    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(AUTH_STATUS_KEY, 'false');
    setIsAuthenticated(false);
    setIsLoading(false);
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
