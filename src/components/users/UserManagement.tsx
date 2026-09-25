import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { currentUser, allUsers, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [roles, setRoles] = useState<RoleDefinition[]>(StorageService.getRoles());
  const [users, setUsers] = useState<UserAccount[]>(StorageService.getUsers());

  // Listen to live updates from StorageService
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setUsers(StorageService.getUsers());
      setRoles(StorageService.getRoles());
    });
    return unsub;
  }, []);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

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

    // Teachers and employees cannot be assigned Telegram or System settings permissions
    if (
      (roleKey === 'teacher' || roleKey === 'employee') &&
      (permKey === 'telegram.view' || permKey === 'telegram.configure' || permKey === 'settings.manage')
    ) {
      showToast('Teachers and employees cannot access Telegram or System settings', 'warning');
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
    setNewUserData({
      id: `usr-${Date.now()}`,
      email: '',
      fullName: '',
      khmerName: '',
      role: 'teacher',
      department: 'Mathematics & Science',
      status: 'Active',
      createdAt: new Date().toISOString()
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.fullName.trim() || !editingUser.email.trim()) return;

    StorageService.updateUser(editingUser.id, editingUser);
    setUsers(StorageService.getUsers());
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Updated User Account',
      target: `${editingUser.fullName} (${editingUser.email} - ${editingUser.role})`,
      ipAddress: '127.0.0.1'
    });
    showToast(`Updated user account: ${editingUser.fullName}`, 'success');
    setEditingUser(null);
  };

  // Check permissions and constraints
  const canDeleteUser = hasPermission('users.delete') || currentUser.role === 'super_admin';
  const canEditUser = hasPermission('users.edit') || currentUser.role === 'super_admin';
  const superAdminCount = users.filter(u => u.role === 'super_admin').length;

  const handleDeleteSingleUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      StorageService.deleteUser(userToDelete.id);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted User Account',
        target: `${userToDelete.fullName} (${userToDelete.email} - ${userToDelete.role})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`User account "${userToDelete.fullName}" has been permanently deleted`, 'success');
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        next.delete(userToDelete.id);
        return next;
      });
      setUserToDelete(null);
    } catch (e) {
      showToast('Error deleting user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDeleteUsers = async () => {
    if (selectedUserIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const idsToDelete = Array.from(selectedUserIds).filter(id => id !== currentUser.id);
      StorageService.deleteUsersBatch(idsToDelete);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Batch Deleted User Accounts',
        target: `${idsToDelete.length} user accounts deleted`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Successfully deleted ${idsToDelete.length} user accounts`, 'success');
      setSelectedUserIds(new Set());
      setIsBatchDeleteModalOpen(false);
    } catch (e) {
      showToast('Error batch deleting users', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Department filter
      if (deptFilter !== 'all' && u.department !== deptFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchKhmer = (u.khmerName || '').toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDept = (u.department || '').toLowerCase().includes(q);
        const matchRole = u.role.toLowerCase().includes(q);
        if (!matchName && !matchKhmer && !matchEmail && !matchDept && !matchRole) return false;
      }
      return true;
    });
  }, [users, roleFilter, deptFilter, searchQuery]);

  // Batch selection helpers
  const selectableUsers = filteredUsers.filter(u => u.id !== currentUser.id);
  const isAllSelectableChecked =
    selectableUsers.length > 0 && selectableUsers.every(u => selectedUserIds.has(u.id));

  const toggleSelectAll = () => {
    if (isAllSelectableChecked) {
      setSelectedUserIds(new Set());
    } else {
      const allIds = new Set(selectableUsers.map(u => u.id));
      setSelectedUserIds(allIds);
    }
  };

  const toggleSelectUser = (id: string) => {
    if (id === currentUser.id) return;
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
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
            ការគ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ ការលុបគណនី និងការកំណត់សិទ្ធិយ៉ាងលម្អិត (RBAC)
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

      {/* Tab 1: User Accounts Table with Search & Delete Capabilities */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, department, or role..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-hidden text-xs"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin_hr">Admin / HR</option>
                  <option value="supervisor">Department Manager</option>
                  <option value="teacher">Teacher</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-hidden text-xs max-w-[140px] truncate"
                >
                  <option value="all">All Depts</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {canDeleteUser && selectedUserIds.size > 0 && (
                <button
                  onClick={() => setIsBatchDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedUserIds.size})</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    {canDeleteUser && (
                      <th className="py-3 px-4 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          disabled={selectableUsers.length === 0}
                          className="text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30"
                          title="Select / Deselect All (except current active account)"
                        >
                          {isAllSelectableChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Department Scope</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={canDeleteUser ? 7 : 6} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-500">No user accounts found matching your filters</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search query or role filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isSelf = u.id === currentUser.id;
                      const isLastSuperAdmin = u.role === 'super_admin' && superAdminCount <= 1;
                      const isSelected = selectedUserIds.has(u.id);

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          {canDeleteUser && (
                            <td className="py-3 px-4 text-center">
                              {isSelf ? (
                                <span title="Current active session cannot be selected for deletion">
                                  <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleSelectUser(u.id)}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.fullName}
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs">
                                  {u.fullName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-extrabold text-slate-900 block leading-tight">
                                  {u.fullName}
                                </span>
                                {u.khmerName && (
                                  <span className="text-slate-400 font-khmer text-[11px] block">
                                    {u.khmerName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {u.department || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isSelf ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Active Session</span>
                                </span>
                              ) : (
                                <>
                                  {canEditUser && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingUser(u)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Edit User Account"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  {canDeleteUser && (
                                    <button
                                      type="button"
                                      disabled={isLastSuperAdmin}
                                      onClick={() => setUserToDelete(u)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isLastSuperAdmin
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title={
                                        isLastSuperAdmin
                                          ? 'Cannot delete the sole Super Administrator'
                                          : `Delete User Account (${u.fullName})`
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Granular Role Permission Matrix */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Granular Permission Matrix</h3>
            <p className="text-xs text-slate-500">
              Toggle specific permissions on or off per system role in real time. (Include users.delete for admin accounts)
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
                          const isRestrictedForRole =
                            (r.code === 'teacher' || r.code === 'employee') &&
                            (p.key === 'telegram.view' || p.key === 'telegram.configure' || p.key === 'settings.manage');
                          const hasIt = !isRestrictedForRole && r.permissions.includes(p.key);

                          if (isRestrictedForRole) {
                            return (
                              <td key={r.id} className="py-2.5 px-3 text-center">
                                <span
                                  className="w-6 h-6 rounded-lg inline-flex items-center justify-center bg-rose-50 text-rose-300 border border-rose-100 cursor-not-allowed"
                                  title="Restricted: Teachers and employees cannot access Telegram or System settings"
                                >
                                  <Lock className="w-3 h-3 text-rose-400" />
                                </span>
                              </td>
                            );
                          }

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

      {/* Confirmation Modal: Single User Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-rose-900 text-base">Delete User Account</h3>
                  <p className="text-xs text-rose-700 font-khmer">ការបញ្ជាក់លុបគណនីអ្នកប្រើប្រាស់</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete the user account for{' '}
                <strong className="text-slate-900 font-bold">{userToDelete.fullName}</strong>?
              </p>

              {/* User preview pill */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{userToDelete.fullName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                    {userToDelete.role.replace('_', ' ')}
                  </span>
                </div>
                {userToDelete.khmerName && (
                  <p className="text-slate-500 font-khmer text-xs">{userToDelete.khmerName}</p>
                )}
                <div className="text-slate-500 flex flex-col gap-0.5 text-[11px] pt-1 border-t border-slate-200/60">
                  <div><strong>Email:</strong> {userToDelete.email}</div>
                  <div><strong>Department:</strong> {userToDelete.department}</div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Permanent Action:</span>
                  This will remove login credentials and access rights immediately. This action cannot be undone.
                  <span className="font-khmer block text-amber-800 mt-0.5">
                    គណនីនេះនឹងត្រូវលុបជាអចិន្ត្រៃយ៍ ហើយមិនអាចចូលប្រើប្រព័ន្ធបានទៀតឡើយ។
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteSingleUser}
                  className="flex items-center gap-1.5 px-5 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Batch Deletion */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-rose-900 text-base">Delete Selected Users</h3>
                  <p className="text-xs text-rose-700 font-khmer">លុបគណនីអ្នកប្រើប្រាស់ដែលបានជ្រើសរើស</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                You have selected <strong className="text-rose-700 font-black">{selectedUserIds.size}</strong> user account(s) for permanent deletion.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Permanent Deletion:</span>
                  All selected user accounts will be permanently deleted and cannot be recovered.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBatchDeleteUsers}
                  className="flex items-center gap-1.5 px-5 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Deleting...' : `Delete All (${selectedUserIds.size})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Edit User Account</h3>
                <p className="text-xs text-slate-400 font-khmer">កែប្រែព័ត៌មានគណនីអ្នកប្រើប្រាស់</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-khmer">Khmer Name (ឈ្មោះខ្មែរ)</label>
                <input
                  type="text"
                  value={editingUser.khmerName || ''}
                  onChange={e => setEditingUser({ ...editingUser, khmerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-khmer font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
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
                    value={editingUser.department}
                    onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editingUser.status}
                  onChange={e => setEditingUser({ ...editingUser, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Create User Account</h3>
                <p className="text-xs text-slate-400 font-khmer">បង្កើតគណនីអ្នកប្រើប្រាស់ថ្មី</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
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
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
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
