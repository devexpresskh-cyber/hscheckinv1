import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { SystemSettings } from '../../types/index.ts';
import {
  Calendar,
  CalendarDays,
  Clock,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap
} from 'lucide-react';

interface AcademicDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AcademicDatesModal: React.FC<AcademicDatesModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const currentSettings = StorageService.getSystemSettings();

  const [academicYear, setAcademicYear] = useState<string>(
    currentSettings.academicYear || '2026-2027'
  );
  const [academicStartDate, setAcademicStartDate] = useState<string>(
    currentSettings.academicStartDate || '2026-09-01'
  );
  const [academicEndDate, setAcademicEndDate] = useState<string>(
    currentSettings.academicEndDate || '2027-06-30'
  );
  const [currentSemester, setCurrentSemester] = useState<string>(
    currentSettings.currentSemester || 'Semester 1'
  );
  const [semesterStartDate, setSemesterStartDate] = useState<string>(
    currentSettings.semesterStartDate || '2026-09-01'
  );
  const [semesterEndDate, setSemesterEndDate] = useState<string>(
    currentSettings.semesterEndDate || '2027-01-31'
  );

  if (!isOpen) return null;

  // Calculate duration and statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const startDt = new Date(academicStartDate);
  const endDt = new Date(academicEndDate);
  const todayDt = new Date(todayStr);

  const totalDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.min(totalDays, Math.round((todayDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24))));
  const daysRemaining = Math.max(0, Math.round((endDt.getTime() - todayDt.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  const isCurrentActive = todayStr >= academicStartDate && todayStr <= academicEndDate;

  const handleApplyPreset = (year: string, start: string, end: string, sem1Start: string, sem1End: string) => {
    setAcademicYear(year);
    setAcademicStartDate(start);
    setAcademicEndDate(end);
    setSemesterStartDate(sem1Start);
    setSemesterEndDate(sem1End);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (academicStartDate >= academicEndDate) {
      showToast(
        isKhmer
          ? 'កាលបរិច្ឆេទចាប់ផ្តើមត្រូវតែនៅមុនកាលបរិច្ឆេទបញ្ចប់!'
          : 'Academic Start Date must be before Academic End Date!',
        'error'
      );
      return;
    }

    const updatedSettings: SystemSettings = {
      ...currentSettings,
      academicYear,
      academicStartDate,
      academicEndDate,
      currentSemester,
      semesterStartDate,
      semesterEndDate
    };

    StorageService.saveSystemSettings(updatedSettings);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Updated Academic Year Dates',
      target: `${academicYear} (${academicStartDate} to ${academicEndDate})`,
      ipAddress: '127.0.0.1'
    });

    showToast(
      isKhmer
        ? `បានកំណត់កាលបរិច្ឆេទឆ្នាំសិក្សា ${academicYear} ដោយជោគជ័យ!`
        : `Academic Year ${academicYear} dates updated successfully (${academicStartDate} to ${academicEndDate})!`,
      'success'
    );

    if (onSaved) onSaved();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {isKhmer ? 'កំណត់កាលបរិច្ឆេទឆ្នាំសិក្សា (Academic Dates)' : 'Set Academic Start & End Dates'}
              </h3>
              <p className="text-xs text-indigo-200 font-khmer mt-0.5">
                {isKhmer
                  ? 'កំណត់កាលបរិច្ឆេទចាប់ផ្តើម-បញ្ចប់ឆ្នាំសិក្សា និងឆមាសផ្លូវការ'
                  : 'Configure official academic session dates, terms, and instructional calendar'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto text-xs">
          
          {/* Quick Presets Strip */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'ជម្រើសគំរូរហ័ស (Quick Presets):' : 'Quick Presets:'}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('2026-2027', '2026-09-01', '2027-06-30', '2026-09-01', '2027-01-31')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
              >
                2026-2027 (01 Sep – 30 Jun)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('2026-2027', '2026-11-01', '2027-08-31', '2026-11-01', '2027-03-31')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {isKhmer ? 'ស្តង់ដារកម្ពុជា (01 Nov – 31 Aug)' : 'Cambodia Term (01 Nov – 31 Aug)'}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('2027-2028', '2027-09-01', '2028-06-30', '2027-09-01', '2028-01-31')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                2027-2028 (01 Sep – 30 Jun)
              </button>
            </div>
          </div>

          {/* Academic Year Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isKhmer ? 'ឆ្នាំសិក្សា (Academic Year) *' : 'Academic Year *'}
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isKhmer ? 'ឆមាសបច្ចុប្បន្ន (Current Semester)' : 'Current Semester / Term'}
              </label>
              <select
                value={currentSemester}
                onChange={e => setCurrentSemester(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:outline-hidden"
              >
                <option value="Semester 1">Semester 1 (ឆមាសទី ១)</option>
                <option value="Semester 2">Semester 2 (ឆមាសទី ២)</option>
                <option value="Full Year">Full Academic Year (ពេញមួយឆ្នាំ)</option>
                <option value="Summer Term">Summer / Vacation Term (វគ្គវិស្សមកាល)</option>
              </select>
            </div>
          </div>

          {/* Academic Start Date & End Date */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
            <span className="font-extrabold text-indigo-950 block text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{isKhmer ? 'កាលបរិច្ឆេទពេញមួយឆ្នាំសិក្សា (Academic Full Session)' : 'Full Academic Session Window'}</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ថ្ងៃចាប់ផ្តើមឆ្នាំសិក្សា (Start Date) *' : 'Academic Start Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={academicStartDate}
                  onChange={e => setAcademicStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ថ្ងៃបញ្ចប់ឆ្នាំសិក្សា (End Date) *' : 'Academic End Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={academicEndDate}
                  onChange={e => setAcademicEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Semester Start & End Dates */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-extrabold text-slate-900 block text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>{isKhmer ? `កាលបរិច្ឆេទ ${currentSemester} (Semester Window)` : `${currentSemester} Dates`}</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ថ្ងៃចាប់ផ្តើមឆមាស (Semester Start)' : 'Semester Start Date'}
                </label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={e => setSemesterStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isKhmer ? 'ថ្ងៃបញ្ចប់ឆមាស (Semester End)' : 'Semester End Date'}
                </label>
                <input
                  type="date"
                  value={semesterEndDate}
                  onChange={e => setSemesterEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Live Academic Session Status Card */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-300 font-bold">
                {isKhmer ? 'ស្ថានភាពឆ្នាំសិក្សា' : 'Academic Session Progress'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isCurrentActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {isCurrentActive ? (isKhmer ? 'កំពុងដំណើរការ' : 'In Session') : (isKhmer ? 'ក្រៅវគ្គសិក្សា' : 'Off-Session / Vacation')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">{isKhmer ? 'ថ្ងៃសរុប' : 'Total Days'}</span>
                <span className="text-base font-black text-white">{totalDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{isKhmer ? 'បានកន្លងផុត' : 'Elapsed'}</span>
                <span className="text-base font-black text-indigo-300">{daysElapsed}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{isKhmer ? 'នៅសល់' : 'Remaining'}</span>
                <span className="text-base font-black text-emerald-400">{daysRemaining}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isKhmer ? 'រក្សាទុកកាលបរិច្ឆេទ' : 'Save Academic Dates'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
