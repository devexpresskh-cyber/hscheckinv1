import React, { useState, useEffect } from 'react';
import { Teacher, StaffStatus } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { X, User, Phone, Mail, Building, Send, Calendar, MapPin, Award, DollarSign } from 'lucide-react';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  initialTeacher?: Teacher | null;
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTeacher
}) => {
  const departments = StorageService.getDepartments();
  const schedules = StorageService.getSchedules();
  const locations = StorageService.getLocations();

  const [formData, setFormData] = useState<Teacher>({
    id: '',
    teacherId: `TCH-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    employeeId: `EMP-${String(Math.floor(Math.random() * 900) + 100)}`,
    fullName: '',
    khmerName: '',
    englishName: '',
    gender: 'Female',
    dateOfBirth: '1992-05-15',
    phone: '+855 ',
    email: '',
    telegramChatId: '',
    department: departments[0]?.name || 'Mathematics & Science',
    position: 'Teacher',
    subject: 'General Education',
    employmentType: 'Full-time',
    joinDate: new Date().toISOString().split('T')[0],
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    status: 'Active',
    assignedLocation: locations[0]?.name || 'Main Campus - Central Building',
    assignedScheduleId: schedules[0]?.id || 'sch-standard-fulltime',
    hourlyRate: 20,
    currency: 'USD'
  });

  useEffect(() => {
    if (initialTeacher) {
      setFormData({
        ...initialTeacher,
        fullName: initialTeacher.fullName || '',
        khmerName: initialTeacher.khmerName || '',
        englishName: initialTeacher.englishName || initialTeacher.fullName || '',
        teacherId: initialTeacher.teacherId || '',
        employeeId: initialTeacher.employeeId || '',
        phone: initialTeacher.phone || '',
        email: initialTeacher.email || '',
        telegramChatId: initialTeacher.telegramChatId || '',
        department: initialTeacher.department || departments[0]?.name || 'Mathematics & Science',
        position: initialTeacher.position || 'Teacher',
        subject: initialTeacher.subject || 'General Education',
        dateOfBirth: initialTeacher.dateOfBirth || '1990-01-01',
        joinDate: initialTeacher.joinDate || new Date().toISOString().split('T')[0],
        photoUrl: initialTeacher.photoUrl || '',
        status: initialTeacher.status || 'Active',
        assignedLocation: initialTeacher.assignedLocation || locations[0]?.name || 'Main Campus - Central Building',
        assignedScheduleId: initialTeacher.assignedScheduleId || schedules[0]?.id || 'sch-standard-fulltime',
        hourlyRate: initialTeacher.hourlyRate !== undefined && initialTeacher.hourlyRate !== null ? initialTeacher.hourlyRate : 20,
        currency: initialTeacher.currency || 'USD'
      });
    } else {
      setFormData({
        id: `tch-${Date.now()}`,
        teacherId: `TCH-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        employeeId: `EMP-${String(Math.floor(Math.random() * 900) + 100)}`,
        fullName: '',
        khmerName: '',
        englishName: '',
        gender: 'Female',
        dateOfBirth: '1992-05-15',
        phone: '+855 ',
        email: '',
        telegramChatId: '',
        department: departments[0]?.name || 'Mathematics & Science',
        position: 'Teacher',
        subject: 'Mathematics',
        employmentType: 'Full-time',
        joinDate: new Date().toISOString().split('T')[0],
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
        status: 'Active',
        assignedLocation: locations[0]?.name || 'Main Campus - Central Building',
        assignedScheduleId: schedules[0]?.id || 'sch-standard-fulltime',
        hourlyRate: 20,
        currency: 'USD'
      });
    }
  }, [initialTeacher, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {initialTeacher ? 'Edit Teacher Profile' : 'Add New Teacher'}
            </h3>
            <p className="text-xs text-slate-400">
              Complete faculty record, department, schedule and Telegram ID
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Identity & Khmer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name (English) *
              </label>
              <input
                type="text"
                required
                value={formData.fullName || ''}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Sok Chenda"
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
                placeholder="ឧ. សុខ ចិន្តា"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-khmer font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Teacher ID & Employee ID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teacher ID *
              </label>
              <input
                type="text"
                required
                value={formData.teacherId || ''}
                onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId || ''}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Department, Position, Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Position / Title *
              </label>
              <input
                type="text"
                required
                value={formData.position || ''}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                placeholder="Senior Mathematics Teacher"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subject Specialization *
              </label>
              <input
                type="text"
                required
                value={formData.subject || ''}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Calculus & Physics"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Contact: Phone, Email, Telegram Chat ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 text-sky-700">
                <Send className="w-3 h-3 text-sky-500" /> Telegram Chat ID
              </label>
              <input
                type="text"
                value={formData.telegramChatId || ''}
                onChange={e => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="e.g. 892341901"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Schedule Assignment, Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Work Schedule *
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
                Assigned Campus Location *
              </label>
              <select
                value={formData.assignedLocation}
                onChange={e => setFormData({ ...formData, assignedLocation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
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
          </div>

          {/* Photo URL & Employment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={e => setFormData({ ...formData, employmentType: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
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

          {/* Teaching Wage & Hourly Compensation */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Teaching Compensation & Rate (អត្រាប្រាក់ឈ្នួលបង្រៀន)
                </h4>
                <p className="text-[11px] text-emerald-700">
                  Used by Teaching Hours & Wage Report to calculate earnings per class taught
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Teaching Hourly Rate *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-emerald-600 font-bold text-xs">
                    {formData.currency === 'KHR' ? '៛' : '$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.hourlyRate ?? 20}
                    onChange={e => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    placeholder="20.00"
                    className="w-full bg-white border border-emerald-300 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Currency (រូបិយប័ណ្ណ)
                </label>
                <select
                  value={formData.currency || 'USD'}
                  onChange={e => setFormData({ ...formData, currency: e.target.value as 'USD' | 'KHR' })}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="KHR">KHR (៛) - Khmer Riel</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              {initialTeacher ? 'Save Changes' : 'Create Teacher Record'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
