import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, Permission, RoleDefinition } from '../types/index.ts';
import { StorageService } from '../services/storageService.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

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
        const match = users.find(u => u.id === parsed.id || u.email === parsed.email);
        if (match) return match;
      }
    } catch {
      // fallback
    }
    return defaultAdmin;
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
            fbUser.email === 'planningtks585@gmail.com' ||
            fbUser.email === 'singsabmc@gmail.com';

          const newUser: UserAccount = {
            id: `usr-google-${fbUser.uid.slice(0, 8)}`,
            email: fbUser.email,
            fullName: fbUser.displayName || 'Google Faculty Member',
            khmerName: fbUser.displayName || 'សាស្ត្រាចារ្យ',
            role: isSuperAdminEmail ? 'super_admin' : 'teacher',
            department: isSuperAdminEmail ? 'Administration' : 'Academic & Curriculum',
            status: 'Active',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            createdAt: new Date().toISOString()
          };
          StorageService.addUser(newUser);
          match = newUser;
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
            fbUser.email === 'planningtks585@gmail.com' ||
            fbUser.email === 'singsabmc@gmail.com';

          const newUser: UserAccount = {
            id: `usr-google-${fbUser.uid.slice(0, 8)}`,
            email: fbUser.email,
            fullName: fbUser.displayName || 'Google Faculty Member',
            khmerName: fbUser.displayName || 'សាស្ត្រាចារ្យ',
            role: isSuperAdminEmail ? 'super_admin' : 'teacher',
            department: isSuperAdminEmail ? 'Administration' : 'Academic & Curriculum',
            status: 'Active',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            createdAt: new Date().toISOString()
          };
          StorageService.addUser(newUser);
          match = newUser;
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
    const trimmed = identifier.trim().toLowerCase();
    
    // Find matching user by email, personId, id, or case-insensitive match
    const matched = users.find(u => 
      u.email.toLowerCase() === trimmed ||
      u.id.toLowerCase() === trimmed ||
      (u.personId && u.personId.toLowerCase() === trimmed) ||
      u.fullName.toLowerCase() === trimmed ||
      u.fullName.toLowerCase().startsWith(trimmed)
    );

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
      setAuthError('Account not found with this email or staff ID. Please verify your credentials or contact the administrator.');
      return false;
    }
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
