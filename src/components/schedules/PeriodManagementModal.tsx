import React, { useState } from 'react';
import { TimetablePeriod, TeacherSubjectSchedule } from '../../types/index.ts';
import { PeriodModal } from './PeriodModal.tsx';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  Coffee,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface PeriodManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: TimetablePeriod[];
  subjectSchedules: TeacherSubjectSchedule[];
  onAddPeriod: (period: TimetablePeriod) => void;
  onUpdatePeriod: (id: string, updates: Partial<TimetablePeriod>, syncClasses: boolean) => void;
  onDeletePeriod: (id: string) => void;
  onResetDefaults: () => void;
  isKhmer?: boolean;
}

export const PeriodManagementModal: React.FC<PeriodManagementModalProps> = ({
  isOpen,
  onClose,
  periods,
  subjectSchedules,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onResetDefaults,
  isKhmer = false
}) => {
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sort periods by startTime
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleOpenAdd = () => {
    setEditingPeriod(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (p: TimetablePeriod) => {
    setEditingPeriod(p);
    setIsAddEditOpen(true);
  };

  const handleSavePeriod = (period: TimetablePeriod, syncClasses: boolean) => {
    if (editingPeriod) {
      onUpdatePeriod(editingPeriod.id, period, syncClasses);
    } else {
      onAddPeriod(period);
    }
  };

  const handleDelete = (p: TimetablePeriod) => {
    const classCount = subjectSchedules.filter(s => s.periodNumber === p.periodNumber).length;
    if (classCount > 0) {
      const msg = isKhmer
        ? `វេន "${p.periodName}" នេះមានមុខវិជ្ជាបង្រៀនចំនួន ${classCount} ថ្នាក់។ តើអ្នកពិតជាចង់លុបវេននេះមែនទេ?`
        : `Period "${p.periodName}" currently has ${classCount} active classes assigned to it. Are you sure you want to delete it?`;
      if (!window.confirm(msg)) return;
    }
    onDeletePeriod(p.id);
    setDeleteConfirmId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isKhmer ? 'ការកំណត់វេនម៉ោងបង្រៀន (Period Slots)' : 'Manage Timetable Periods & Bells'}
                </h3>
                <p className="text-xs text-indigo-200 font-khmer mt-0.5">
                  {isKhmer
                    ? 'បង្កើត កែសម្រួល ឬលុបវេនម៉ោងបង្រៀនប្រចាំសាលា និងចន្លោះសម្រាក'
                    : 'Create, modify, and delete teaching period bell schedules and recess intervals'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'បន្ថែមវេនថ្មី' : 'Add Period'}</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader / Summary bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                {isKhmer ? 'វេនសរុប:' : 'Total Periods:'}{' '}
                <span className="font-mono font-black text-indigo-600">{sortedPeriods.length}</span>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                {sortedPeriods.filter(p => !p.isBreak).length} {isKhmer ? 'វេនសិក្សា' : 'Class Periods'}
                {sortedPeriods.some(p => p.isBreak) && ` + ${sortedPeriods.filter(p => p.isBreak).length} ${isKhmer ? 'សម្រាក' : 'Break'}`}
              </span>
            </div>

            <button
              onClick={() => {
                if (window.confirm(isKhmer ? 'តើអ្នកចង់កំណត់វេនឡើងវិញតាមគំរូដើមរបស់សាលាទេ?' : 'Reset period schedule back to default standard school bells (4 periods + midday break)?')) {
                  onResetDefaults();
                }
              }}
              className="text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 transition-colors text-[11px]"
              title="Reset to default timetable periods"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isKhmer ? 'កំណត់ឡើងវិញតាមគំរូដើម' : 'Reset to Defaults'}</span>
            </button>
          </div>

          {/* Periods Table / List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {sortedPeriods.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl p-6">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">
                  {isKhmer ? 'មិនទាន់មានវេនម៉ោងត្រូវបានបង្កើតនៅឡើយទេ' : 'No Timetable Periods Configured'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {isKhmer
                    ? 'ចុចប៊ូតុង "បន្ថែមវេនថ្មី" ខាងលើដើម្បីបង្កើតវេនម៉ោងដំបូង ឬកំណត់តាមគំរូដើម'
                    : 'Click "Add Period" to create school bell periods or reset to standard presets.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-xs"
                  >
                    + {isKhmer ? 'បង្កើតវេនថ្មី' : 'Create First Period'}
                  </button>
                  <button
                    onClick={onResetDefaults}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    {isKhmer ? 'ផ្ទុកគំរូដើម' : 'Load Defaults'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedPeriods.map(p => {
                  const classCount = subjectSchedules.filter(s => s.periodNumber === p.periodNumber).length;
                  const isBreakItem = p.isBreak || p.sessionType === 'Break';
                  const badgeColor = p.color || (isBreakItem ? '#D97706' : '#4F46E5');

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isBreakItem
                          ? 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                      style={{ borderLeftColor: badgeColor, borderLeftWidth: '5px' }}
                    >
                      {/* Left: Sequence, Title, Session */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 text-white shadow-2xs"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {isBreakItem ? <Coffee className="w-4 h-4" /> : `P${p.periodNumber}`}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900">
                              {p.periodName}
                            </h4>
                            {p.khmerPeriodName && (
                              <span className="text-[11px] font-khmer font-bold text-slate-500">
                                ({p.khmerPeriodName})
                              </span>
                            )}
                            {isBreakItem && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {isKhmer ? 'ចន្លោះសម្រាក' : 'Break'}
                              </span>
                            )}
                            {!p.isActive && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                                {isKhmer ? 'បិទ' : 'Inactive'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              {p.startTime} – {p.endTime}
                            </span>
                            <span>•</span>
                            <span>{p.durationMinutes || 90} mins</span>
                            {p.sessionType && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-slate-600">{p.sessionType} Session</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Class Count & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {!isBreakItem && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              {isKhmer ? 'ថ្នាក់បង្រៀន' : 'Classes'}
                            </span>
                            <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 inline-block">
                              {classCount} {isKhmer ? 'ថ្នាក់' : 'classes'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all"
                            title={isKhmer ? 'កែសម្រួលវេន' : 'Edit Period'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all"
                            title={isKhmer ? 'លុបវេន' : 'Delete Period'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              💡 {isKhmer ? 'ការកែប្រែវេននឹងធ្វើបច្ចុប្បន្នភាពលើតារាងកាលវិភាគភ្លាមៗ' : 'Periods automatically organize the Monday–Saturday weekly timetable grid.'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              {isKhmer ? 'បិទ' : 'Done'}
            </button>
          </div>

        </div>
      </div>

      {/* Edit / Add Modal */}
      {isAddEditOpen && (
        <PeriodModal
          isOpen={isAddEditOpen}
          onClose={() => {
            setIsAddEditOpen(false);
            setEditingPeriod(null);
          }}
          initialPeriod={editingPeriod}
          existingPeriods={periods}
          onSave={handleSavePeriod}
          isKhmer={isKhmer}
        />
      )}
    </>
  );
};
