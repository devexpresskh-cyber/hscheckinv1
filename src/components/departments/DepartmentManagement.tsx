import React, { useState } from 'react';
import { Department, Teacher, Employee } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  const [departments, setDepartments] = useState<Department[]>(() => StorageService.getDepartments());
  const [teachers, setTeachers] = useState<Teacher[]>(() => StorageService.getTeachers());
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptForStaff, setSelectedDeptForStaff] = useState<Department | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Department>({
    id: '',
    name: '',
    khmerName: '',
    code: '',
    managerName: '',
    description: ''
  });

  const refreshData = () => {
    setDepartments(StorageService.getDepartments());
    setTeachers(StorageService.getTeachers());
    setEmployees(StorageService.getEmployees());
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      id: `dept-${Date.now()}`,
      name: '',
      khmerName: '',
      code: `DEP-${Math.floor(100 + Math.random() * 900)}`,
      managerName: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ ...dept });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast(isKhmer ? 'សូមបញ្ចូលឈ្មោះដេប៉ាតឺម៉ង់' : 'Department name is required', 'error');
      return;
    }

    if (editingDept) {
      StorageService.updateDepartment(editingDept.id, formData);
      StorageService.addAuditLog({
        userId: currentUser?.id || 'admin',
        userName: currentUser?.fullName || 'Administrator',
        userRole: currentUser?.role || 'admin',
        action: 'Updated Department',
        target: formData.name,
        details: `Updated department: ${formData.name} (${formData.code})`,
        ipAddress: '127.0.0.1'
      });
      showToast(isKhmer ? 'បានកែប្រែដេប៉ាតឺម៉ង់ជោគជ័យ' : 'Department updated successfully', 'success');
    } else {
      StorageService.addDepartment(formData);
      StorageService.addAuditLog({
        userId: currentUser?.id || 'admin',
        userName: currentUser?.fullName || 'Administrator',
        userRole: currentUser?.role || 'admin',
        action: 'Created Department',
        target: formData.name,
        details: `Created new department: ${formData.name} (${formData.code})`,
        ipAddress: '127.0.0.1'
      });
      showToast(isKhmer ? 'បានបន្ថែមដេប៉ាតឺម៉ង់ថ្មីជោគជ័យ' : 'Department created successfully', 'success');
    }

    setIsModalOpen(false);
    refreshData();
  };

  const handleDelete = (dept: Department) => {
    const teacherCount = teachers.filter(t => t.department === dept.name).length;
    const employeeCount = employees.filter(e => e.department === dept.name).length;

    if (teacherCount > 0 || employeeCount > 0) {
      const confirmDelete = window.confirm(
        isKhmer
          ? `ដេប៉ាតឺម៉ង់នេះមានសាស្ត្រាចារ្យ ${teacherCount} នាក់ និងបុគ្គលិក ${employeeCount} នាក់។ តើអ្នកពិតជាចង់លុបមែនទេ?`
          : `This department currently has ${teacherCount} teachers and ${employeeCount} employees. Are you sure you want to delete it?`
      );
      if (!confirmDelete) return;
    } else {
      if (!window.confirm(isKhmer ? `តើអ្នកចង់លុបដេប៉ាតឺម៉ង់ ${dept.name} មែនទេ?` : `Are you sure you want to delete department ${dept.name}?`)) {
        return;
      }
    }

    StorageService.deleteDepartment(dept.id);
    StorageService.addAuditLog({
      userId: currentUser?.id || 'admin',
      userName: currentUser?.fullName || 'Administrator',
      userRole: currentUser?.role || 'admin',
      action: 'Deleted Department',
      target: dept.name,
      details: `Deleted department: ${dept.name} (${dept.code})`,
      ipAddress: '127.0.0.1'
    });
    showToast(isKhmer ? 'បានលុបដេប៉ាតឺម៉ង់រួចរាល់' : 'Department deleted successfully', 'info');
    refreshData();
  };

  // Filtered list
  const filteredDepartments = departments.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.khmerName || '').toLowerCase().includes(q) ||
      (d.code || '').toLowerCase().includes(q) ||
      (d.managerName || '').toLowerCase().includes(q)
    );
  });

  // Potential managers from teachers and employees
  const managerOptions = Array.from(
    new Set([
      ...teachers.map(t => t.fullName),
      ...employees.map(e => e.fullName)
    ])
  ).sort();

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building className="w-5 h-5" />
            </div>
            <span>{isKhmer ? 'ការគ្រប់គ្រងដេប៉ាតឺម៉ង់ និងផ្នែក' : 'Department & Faculty Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-khmer mt-1">
            {isKhmer
              ? 'រៀបចំរចនាសម្ព័ន្ធអង្គភាព ដេប៉ាតឺម៉ង់មុខវិជ្ជា និងថ្នាក់ដឹកនាំផ្នែក'
              : 'Manage academic divisions, subject departments, faculty coordinators, and staff distribution'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasPermission('settings.manage') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isKhmer ? 'បន្ថែមដេប៉ាតឺម៉ង់ថ្មី' : 'Add Department'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isKhmer ? 'ដេប៉ាតឺម៉ង់សរុប' : 'Total Departments'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {departments.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isKhmer ? 'សាស្ត្រាចារ្យសរុប' : 'Total Faculty'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {teachers.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isKhmer ? 'បុគ្គលិកទូទៅ' : 'Support Staff'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {employees.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isKhmer ? 'ប្រធានដេប៉ាតឺម៉ង់' : 'Assigned Heads'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {departments.filter(d => d.managerName).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះ, លេខកូដ, ប្រធាន...' : 'Search by name, code, manager...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          {isKhmer ? `បង្ហាញ ${filteredDepartments.length} ក្នុងចំណោម ${departments.length}` : `Showing ${filteredDepartments.length} of ${departments.length} departments`}
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepartments.map(dept => {
          const deptTeachers = teachers.filter(t => t.department === dept.name);
          const deptEmployees = employees.filter(e => e.department === dept.name);
          const totalStaff = deptTeachers.length + deptEmployees.length;

          return (
            <div
              key={dept.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header row: Code & Actions */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                    {dept.code || 'DEPT'}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {hasPermission('settings.manage') && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Names */}
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {dept.name}
                </h3>
                {dept.khmerName && (
                  <p className="text-xs font-khmer text-slate-500 font-semibold mt-0.5">
                    {dept.khmerName}
                  </p>
                )}

                {/* Description */}
                {dept.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                    {dept.description}
                  </p>
                )}

                {/* Manager */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {isKhmer ? 'ប្រធានផ្នែក' : 'Head / Manager'}:
                  </span>
                  <span className="font-bold text-slate-800">
                    {dept.managerName || (isKhmer ? 'មិនទាន់ចាត់តាំង' : 'Unassigned')}
                  </span>
                </div>
              </div>

              {/* Bottom Staff Distribution & Drilldown */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-center mb-3">
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isKhmer ? 'សាស្ត្រាចារ្យ' : 'Teachers'}
                    </span>
                    <span className="text-xs font-black text-indigo-700 font-mono">
                      {deptTeachers.length}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isKhmer ? 'បុគ្គលិកទូទៅ' : 'Employees'}
                    </span>
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {deptEmployees.length}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDeptForStaff(dept)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isKhmer ? `មើលបុគ្គលិកទាំង ${totalStaff} នាក់` : `View ${totalStaff} Members`}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Staff Roster Drilldown Modal */}
      {selectedDeptForStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {selectedDeptForStaff.name} ({selectedDeptForStaff.code})
                  </h3>
                  <p className="text-xs text-slate-400 font-khmer">
                    {selectedDeptForStaff.khmerName || 'បញ្ជីរាយនាមបុគ្គលិកក្នុងដេប៉ាតឺម៉ង់'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeptForStaff(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Teachers in this Department */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Faculty & Teachers ({teachers.filter(t => t.department === selectedDeptForStaff.name).length})</span>
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {teachers.filter(t => t.department === selectedDeptForStaff.name).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No teachers assigned to this department yet.
                    </div>
                  ) : (
                    teachers.filter(t => t.department === selectedDeptForStaff.name).map(t => (
                      <div key={t.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.fullName} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                              {t.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-black text-slate-900">{t.fullName} {t.khmerName ? `(${t.khmerName})` : ''}</div>
                            <div className="text-[10px] text-slate-500">{t.subject} • {t.teacherId}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ${t.hourlyRate || 25}/hr
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{t.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Employees in this Department */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Support Staff & Employees ({employees.filter(e => e.department === selectedDeptForStaff.name).length})</span>
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {employees.filter(e => e.department === selectedDeptForStaff.name).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No general staff assigned to this department yet.
                    </div>
                  ) : (
                    employees.filter(e => e.department === selectedDeptForStaff.name).map(e => (
                      <div key={e.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                            {e.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">{e.fullName}</div>
                            <div className="text-[10px] text-slate-500">{e.position} • {e.employeeId}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium">{e.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDeptForStaff(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingDept ? (isKhmer ? 'កែប្រែដេប៉ាតឺម៉ង់' : 'Edit Department') : (isKhmer ? 'បន្ថែមដេប៉ាតឺម៉ង់ថ្មី' : 'Create Department')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingDept ? editingDept.name : 'Enter department details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ឈ្មោះដេប៉ាតឺម៉ង់ (EN) *' : 'Department Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Mathematics & Science"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ឈ្មោះជាភាសាខ្មែរ (KM)' : 'Khmer Name (KM)'}
                  </label>
                  <input
                    type="text"
                    value={formData.khmerName}
                    onChange={e => setFormData({ ...formData, khmerName: e.target.value })}
                    placeholder="ឧ. គណិតវិទ្យា និងវិទ្យាសាស្ត្រ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-khmer font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'លេខកូដសម្គាល់' : 'Department Code'}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MATH-SCI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKhmer ? 'ប្រធានដេប៉ាតឺម៉ង់' : 'Head / Manager'}
                  </label>
                  <input
                    type="text"
                    list="managersList"
                    value={formData.managerName}
                    onChange={e => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="Select or enter name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="managersList">
                    {managerOptions.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ការពិពណ៌នា' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Academic disciplines, grade levels, or responsibilities..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                >
                  {editingDept ? (isKhmer ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes') : (isKhmer ? 'បង្កើតដេប៉ាតឺម៉ង់' : 'Create Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
