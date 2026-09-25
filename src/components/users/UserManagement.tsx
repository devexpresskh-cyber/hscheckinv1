import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { RoleDefinition, Permission, UserRole, UserAccount } from '../../types/index.ts';
import {
  ShieldAlert,
  Users,
  Check,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Building,
  Key,
  X
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { currentUser, allUsers, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [roles, setRoles] = useState<RoleDefinition[]>(StorageService.getRoles());
  const [users, setUsers] = useState<UserAccount[]>(StorageService.getUsers());

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const departments = StorageService.getDepartments();

  const [newUserData, setNewUserData] = useState<UserAccount>({
    id: `usr-${Date.now()}`,
    email: '',
    fullName: '',
    khmerName: '',
    role: 'teacher',
    department: 'Mathematics & Science',
    status: 'Active',
    createdAt: new Date().toISOString()
  });

  const allPermissionKeys: Array<{ key: Permission; label: string; group: string }> = [
    // Users & Roles
    { key: 'users.view', label: 'View Users', group: 'Users & Roles' },
    { key: 'users.create', label: 'Create Users', group: 'Users & Roles' },
    { key: 'users.edit', label: 'Edit Users', group: 'Users & Roles' },
    { key: 'users.delete', label: 'Delete Users', group: 'Users & Roles' },
    { key: 'roles.view', label: 'View Roles', group: 'Users & Roles' },
    { key: 'roles.edit', label: 'Modify Roles & Permissions', group: 'Users & Roles' },

    // Teachers
    { key: 'teachers.view', label: 'View Teachers', group: 'Faculty' },
    { key: 'teachers.create', label: 'Add Teachers', group: 'Faculty' },
    { key: 'teachers.edit', label: 'Edit Teachers', group: 'Faculty' },
    { key: 'teachers.delete', label: 'Delete Teachers', group: 'Faculty' },

    // Employees
    { key: 'employees.view', label: 'View Employees', group: 'Staff' },
    { key: 'employees.create', label: 'Add Employees', group: 'Staff' },
    { key: 'employees.edit', label: 'Edit Employees', group: 'Staff' },
    { key: 'employees.delete', label: 'Delete Employees', group: 'Staff' },

    // Schedules
    { key: 'schedules.view', label: 'View Schedules', group: 'Schedules' },
    { key: 'schedules.create', label: 'Create Schedules', group: 'Schedules' },
    { key: 'schedules.edit', label: 'Edit Schedules', group: 'Schedules' },
    { key: 'schedules.delete', label: 'Delete Schedules', group: 'Schedules' },

    // Attendance
    { key: 'attendance.view', label: 'View Attendance', group: 'Attendance' },
    { key: 'attendance.checkin', label: 'Check-in Action', group: 'Attendance' },
    { key: 'attendance.checkout', label: 'Check-out Action', group: 'Attendance' },
    { key: 'attendance.edit', label: 'Edit Records', group: 'Attendance' },
    { key: 'attendance.approve', label: 'Approve Corrections & Leaves', group: 'Attendance' },

    // Reports & Telegram
    { key: 'reports.view', label: 'View Reports', group: 'Reports' },
    { key: 'reports.export', label: 'Export Reports', group: 'Reports' },
    { key: 'telegram.view', label: 'View Telegram', group: 'Telegram' },
    { key: 'telegram.configure', label: 'Configure Telegram Bot', group: 'Telegram' },
    { key: 'audit.view', label: 'View Audit Logs', group: 'System' },
    { key: 'settings.manage', label: 'Manage Settings', group: 'System' }
  ];

  const groupedPermissions = allPermissionKeys.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, typeof allPermissionKeys>);

  const togglePermissionForRole = (roleKey: UserRole, permKey: Permission) => {
    if (!hasPermission('roles.edit')) {
      showToast('You do not have permission to edit roles', 'error');
      return;
    }

    if (roleKey === 'super_admin' && permKey === 'roles.edit') {
      showToast('Super Admin role must retain role management permission', 'warning');
      return;
    }

    const updated = roles.map(r => {
      if (r.code === roleKey) {
        const has = r.permissions.includes(permKey);
        const perms = has
          ? r.permissions.filter(p => p !== permKey)
          : [...r.permissions, permKey];
        return { ...r, permissions: perms };
      }
      return r;
    });

    setRoles(updated);
    StorageService.saveRoles(updated);
    showToast(`Updated permissions for ${roleKey}`, 'success');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.fullName.trim() || !newUserData.email.trim()) return;

    StorageService.addUser(newUserData);
    setUsers(StorageService.getUsers());
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Created User Account',
      target: `${newUserData.fullName} (${newUserData.role})`,
      ipAddress: '127.0.0.1'
    });
    showToast(`Created user account for ${newUserData.fullName}`, 'success');
    setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Users, Roles & Permission System
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ការគ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ តួនាទី និងការកំណត់សិទ្ធិយ៉ាងលម្អិត (RBAC)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'roles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Permission Matrix
            </button>
          </div>

          {activeTab === 'users' && hasPermission('users.create') && (
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: User Accounts Table */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Department Scope</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Switch As</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-slate-900 block">{u.fullName}</span>
                      {u.khmerName && (
                        <span className="text-slate-400 font-khmer text-[11px] block">{u.khmerName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {u.department}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-400">
                      {u.id === currentUser.id ? (
                        <span className="text-emerald-600 font-bold">Current Active</span>
                      ) : (
                        <span className="text-[11px] text-indigo-600">Available in Switcher</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Granular Role Permission Matrix */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Granular Permission Matrix</h3>
            <p className="text-xs text-slate-500">
              Toggle specific permissions on or off per system role in real time.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-64">Permission</th>
                  {roles.map(r => (
                    <th key={r.id} className="py-3 px-3 text-center">
                      <span className="block font-bold">{r.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({r.permissions.length} perms)
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-indigo-50/60 font-bold text-indigo-900 text-[11px]">
                      <td colSpan={roles.length + 1} className="py-2 px-4 uppercase tracking-wider">
                        {group}
                      </td>
                    </tr>
                    {perms.map(p => (
                      <tr key={p.key} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {p.label}
                          <span className="font-mono text-[10px] text-slate-400 block font-normal">{p.key}</span>
                        </td>
                        {roles.map(r => {
                          const hasIt = r.permissions.includes(p.key);
                          return (
                            <td key={r.id} className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => togglePermissionForRole(r.code, p.key)}
                                className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-colors ${
                                  hasIt
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {hasIt ? <Check className="w-3.5 h-3.5" /> : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Create User Account</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserData.fullName}
                  onChange={e => setNewUserData({ ...newUserData, fullName: e.target.value })}
                  placeholder="e.g. Chan Dara"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-khmer">Khmer Name (ឈ្មោះខ្មែរ)</label>
                <input
                  type="text"
                  value={newUserData.khmerName}
                  onChange={e => setNewUserData({ ...newUserData, khmerName: e.target.value })}
                  placeholder="ឧ. ចាន់ តារា"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-khmer font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="chandara@school.edu.kh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUserData.role}
                    onChange={e => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin_hr">Admin / HR</option>
                    <option value="supervisor">Department Manager</option>
                    <option value="teacher">Teacher</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserData.department}
                    onChange={e => setNewUserData({ ...newUserData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-600 text-white rounded-xl"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
