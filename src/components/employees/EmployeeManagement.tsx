import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { Employee } from '../../types/index.ts';
import { EmployeeModal } from './EmployeeModal.tsx';
import {
  Users2,
  Plus,
  Search,
  Download,
  Send,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  X
} from 'lucide-react';

export const EmployeeManagement: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmpForHistory, setSelectedEmpForHistory] = useState<Employee | null>(null);

  const departments = StorageService.getDepartments();
  const employees = StorageService.getEmployees();
  const attendanceList = StorageService.getAttendance();

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!canAccessDepartment(emp.department)) return false;
      if (selectedDept !== 'All' && emp.department !== selectedDept) return false;
      if (selectedStatus !== 'All' && emp.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchKhmer = (emp.khmerName || '').toLowerCase().includes(q);
        const matchId = emp.employeeId.toLowerCase().includes(q);
        const matchPos = emp.position.toLowerCase().includes(q);
        if (!matchName && !matchKhmer && !matchId && !matchPos) return false;
      }
      return true;
    });
  }, [employees, canAccessDepartment, selectedDept, selectedStatus, searchQuery]);

  const handleSaveEmployee = (emp: Employee) => {
    if (editingEmployee) {
      StorageService.updateEmployee(emp.id, emp);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Updated Employee Profile',
        target: `${emp.fullName} (${emp.employeeId})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Updated employee ${emp.fullName}`, 'success');
    } else {
      StorageService.addEmployee(emp);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Created Employee Record',
        target: `${emp.fullName} (${emp.employeeId})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Added employee ${emp.fullName}`, 'success');
    }
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove employee ${name}?`)) {
      StorageService.deleteEmployee(id);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted Employee Record',
        target: name,
        ipAddress: '127.0.0.1'
      });
      showToast(`Removed employee ${name}`, 'info');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Khmer Name', 'Department', 'Position', 'Supervisor', 'Phone', 'Email', 'Telegram ID', 'Location', 'Status'];
    const rows = filteredEmployees.map(e => [
      e.employeeId,
      `"${e.fullName}"`,
      `"${e.khmerName || ''}"`,
      `"${e.department}"`,
      `"${e.position}"`,
      `"${e.supervisor}"`,
      e.phone,
      e.email,
      e.telegramChatId || '',
      `"${e.workLocation}"`,
      e.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduTrack_Employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported employee roster to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              School Employee Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ការគ្រប់គ្រងបុគ្គលិកទូទៅ រដ្ឋបាល IT សន្តិសុខ និងគណនេយ្យ
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {hasPermission('employees.create') && (
            <button
              onClick={() => {
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, position..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">ID & Position</th>
                <th className="py-3 px-4">Department & Supervisor</th>
                <th className="py-3 px-4">Contact & Telegram</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employees found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {emp.fullName}
                            </span>
                            {emp.khmerName && (
                              <span className="text-[11px] text-slate-500 font-khmer">
                                {emp.khmerName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {emp.employeeId}
                        </span>
                        <span className="text-[11px] text-blue-700 font-semibold">
                          {emp.position}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {emp.department}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Sup: {emp.supervisor}
                        </span>
                      </td>

                      <td className="py-3 px-4 space-y-0.5">
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{emp.email}</span>
                        </div>
                        {emp.telegramChatId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                            <Send className="w-2.5 h-2.5 text-sky-500" /> TG #{emp.telegramChatId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No Telegram</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          emp.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {emp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {emp.workLocation}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmpForHistory(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Attendance History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasPermission('employees.edit') && (
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {hasPermission('employees.delete') && (
                            <button
                              onClick={() => handleDeleteEmployee(emp.id, emp.fullName)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
      />

      {/* History Drawer */}
      {selectedEmpForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmpForHistory.photoUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold text-base">{selectedEmpForHistory.fullName}</h3>
                  <p className="text-xs text-slate-300 font-khmer">
                    {selectedEmpForHistory.khmerName} • {selectedEmpForHistory.employeeId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpForHistory(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              <h4 className="font-bold text-xs uppercase text-slate-500">Attendance Log</h4>
              {(() => {
                const history = attendanceList.filter(a => a.personId === selectedEmpForHistory.id);
                if (history.length === 0) {
                  return <p className="text-xs text-slate-400 py-6 text-center">No attendance logged yet.</p>;
                }
                return (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {history.map(item => (
                      <div key={item.id} className="p-3 text-xs flex justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.date}</span>
                          <span className="text-slate-500 text-[11px]">
                            In: {item.checkInTime || '-'} | Out: {item.checkOutTime || '-'}
                          </span>
                        </div>
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 self-center">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedEmpForHistory(null)}
                className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
