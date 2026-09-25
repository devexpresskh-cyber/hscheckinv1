import React, { useState, useEffect } from 'react';
import { Employee, StaffStatus } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { X, Send } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  initialEmployee?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee
}) => {
  const departments = StorageService.getDepartments();
  const schedules = StorageService.getSchedules();
  const locations = StorageService.getLocations();

  const [formData, setFormData] = useState<Employee>({
    id: '',
    employeeId: `EMP-${String(Math.floor(Math.random() * 900) + 200)}`,
    fullName: '',
    khmerName: '',
    phone: '+855 ',
    email: '',
    telegramChatId: '',
    department: 'IT & Facilities',
    position: 'Specialist',
    supervisor: 'Meas Kosal',
    employmentType: 'Full-time',
    joinDate: new Date().toISOString().split('T')[0],
    workLocation: locations[0]?.name || 'Main Campus - Central Building',
    assignedScheduleId: schedules[0]?.id || 'sch-standard-fulltime',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'
  });

  useEffect(() => {
    if (initialEmployee) {
      setFormData({
        ...initialEmployee,
        fullName: initialEmployee.fullName || '',
        khmerName: initialEmployee.khmerName || '',
        employeeId: initialEmployee.employeeId || '',
        phone: initialEmployee.phone || '',
        email: initialEmployee.email || '',
        telegramChatId: initialEmployee.telegramChatId || '',
        department: initialEmployee.department || 'IT & Facilities',
        position: initialEmployee.position || 'Staff Specialist',
        supervisor: initialEmployee.supervisor || '',
        employmentType: initialEmployee.employmentType || 'Full-time',
        joinDate: initialEmployee.joinDate || new Date().toISOString().split('T')[0],
        workLocation: initialEmployee.workLocation || locations[0]?.name || 'Main Campus - Central Building',
        assignedScheduleId: initialEmployee.assignedScheduleId || schedules[0]?.id || 'sch-standard-fulltime',
        status: initialEmployee.status || 'Active',
        photoUrl: initialEmployee.photoUrl || ''
      });
    } else {
      setFormData({
        id: `emp-${Date.now()}`,
        employeeId: `EMP-${String(Math.floor(Math.random() * 900) + 200)}`,
        fullName: '',
        khmerName: '',
        phone: '+855 ',
        email: '',
        telegramChatId: '',
        department: 'IT & Facilities',
        position: 'Staff Specialist',
        supervisor: 'Head of Department',
        employmentType: 'Full-time',
        joinDate: new Date().toISOString().split('T')[0],
        workLocation: locations[0]?.name || 'Main Campus - Central Building',
        assignedScheduleId: schedules[0]?.id || 'sch-standard-fulltime',
        status: 'Active',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'
      });
    }
  }, [initialEmployee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 my-8">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {initialEmployee ? 'Edit Employee Profile' : 'Add New Support Staff / Employee'}
            </h3>
            <p className="text-xs text-slate-400">
              Department, operational schedule, and contact channels
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName || ''}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Heng Vannara"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-khmer">
                Khmer Name (ឈ្មោះជាភាសាខ្មែរ)
              </label>
              <input
                type="text"
                value={formData.khmerName || ''}
                onChange={e => setFormData({ ...formData, khmerName: e.target.value })}
                placeholder="ឧ. ហេង វណ្ណារ៉ា"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-khmer font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={formData.employeeId || ''}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Position / Role *
              </label>
              <input
                type="text"
                required
                value={formData.position || ''}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supervisor / Manager
              </label>
              <input
                type="text"
                value={formData.supervisor || ''}
                onChange={e => setFormData({ ...formData, supervisor: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 text-sky-700">
                <Send className="w-3 h-3 text-sky-500" /> Telegram Chat ID
              </label>
              <input
                type="text"
                value={formData.telegramChatId || ''}
                onChange={e => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="451298711"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Schedule *
              </label>
              <select
                value={formData.assignedScheduleId}
                onChange={e => setFormData({ ...formData, assignedScheduleId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {schedules.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Work Location *
              </label>
              <select
                value={formData.workLocation}
                onChange={e => setFormData({ ...formData, workLocation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as StaffStatus })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Profile Photo URL
              </label>
              <input
                type="text"
                value={formData.photoUrl || ''}
                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {initialEmployee ? 'Save Changes' : 'Create Employee Record'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
