import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { Holiday } from '../../types/index.ts';
import {
  Palmtree,
  Plus,
  Trash2,
  Calendar,
  X,
  Sparkles
} from 'lucide-react';

export const HolidayManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const holidays = StorageService.getHolidays();

  const [formData, setFormData] = useState<Holiday>({
    id: '',
    name: '',
    khmerName: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Public',
    description: ''
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete holiday "${name}"?`)) {
      StorageService.deleteHoliday(id);
      showToast(`Removed holiday ${name}`, 'info');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    StorageService.addHoliday({
      ...formData,
      id: `hol-${Date.now()}`
    });
    showToast(`Added holiday: ${formData.name}`, 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Palmtree className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              School & National Holidays
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ប្រតិទិនថ្ងៃបុណ្យជាតិ និងថ្ងៃឈប់សម្រាករបស់សាលា (លើកលែងការកត់ត្រាវត្តមានដោយស្វ័យប្រវត្តិ)
          </p>
        </div>

        {hasPermission('settings.manage') && (
          <button
            onClick={() => {
              setFormData({
                id: `hol-${Date.now()}`,
                name: '',
                khmerName: '',
                date: new Date().toISOString().split('T')[0],
                type: 'Public',
                description: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.map(h => (
          <div
            key={h.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {h.type} Holiday
                </span>
                {hasPermission('settings.manage') && (
                  <button
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mt-2">{h.name}</h3>
              {h.khmerName && (
                <p className="text-xs text-slate-500 font-khmer mt-0.5">{h.khmerName}</p>
              )}

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-3 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{h.date} {h.endDate ? `to ${h.endDate}` : ''}</span>
              </div>

              {h.description && (
                <p className="text-xs text-slate-600 mt-2">{h.description}</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Attendance check-in exempted on this date</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Add Official Holiday</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Holiday Name (English) *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Teacher's Day"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-khmer">Khmer Name (ឈ្មោះជាភាសាខ្មែរ)</label>
                <input
                  type="text"
                  value={formData.khmerName}
                  onChange={e => setFormData({ ...formData, khmerName: e.target.value })}
                  placeholder="ឧ. ទិវាគ្រូបង្រៀន"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-khmer font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  >
                    <option value="Public">Public National</option>
                    <option value="School">School Specific</option>
                    <option value="Special">Special Holiday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
