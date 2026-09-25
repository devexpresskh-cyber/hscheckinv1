import React, { useState, useEffect, useMemo } from 'react';
import { TimetablePeriod } from '../../types/index.ts';
import {
  Clock,
  X,
  Check,
  Sparkles,
  Coffee,
  Sun,
  Sunset,
  Moon,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPeriod?: TimetablePeriod | null;
  existingPeriods: TimetablePeriod[];
  onSave: (period: TimetablePeriod, syncClasses: boolean) => void;
  isKhmer?: boolean;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#4F46E5', bg: 'bg-indigo-600' },
  { name: 'Sky Blue', value: '#0284C7', bg: 'bg-sky-600' },
  { name: 'Emerald Green', value: '#059669', bg: 'bg-emerald-600' },
  { name: 'Purple', value: '#7C3AED', bg: 'bg-purple-600' },
  { name: 'Amber Orange', value: '#D97706', bg: 'bg-amber-600' },
  { name: 'Rose Red', value: '#E11D48', bg: 'bg-rose-600' },
  { name: 'Slate Gray', value: '#475569', bg: 'bg-slate-600' },
];

export const PeriodModal: React.FC<PeriodModalProps> = ({
  isOpen,
  onClose,
  initialPeriod,
  existingPeriods,
  onSave,
  isKhmer = false
}) => {
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [periodName, setPeriodName] = useState<string>('Period 1');
  const [khmerPeriodName, setKhmerPeriodName] = useState<string>('ម៉ោងទី ១');
  const [startTime, setStartTime] = useState<string>('07:30');
  const [endTime, setEndTime] = useState<string>('09:00');
  const [sessionType, setSessionType] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Break'>('Morning');
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [color, setColor] = useState<string>('#4F46E5');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [syncClasses, setSyncClasses] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Suggest next period number if adding
  useEffect(() => {
    if (!isOpen) return;

    if (initialPeriod) {
      setPeriodNumber(initialPeriod.periodNumber ?? 1);
      setPeriodName(initialPeriod.periodName || 'Period 1');
      setKhmerPeriodName(initialPeriod.khmerPeriodName || '');
      setStartTime(initialPeriod.startTime || '07:30');
      setEndTime(initialPeriod.endTime || '09:00');
      setSessionType(initialPeriod.sessionType || 'Morning');
      setIsBreak(initialPeriod.isBreak || false);
      setDescription(initialPeriod.description || '');
      setColor(initialPeriod.color || '#4F46E5');
      setIsActive(initialPeriod.isActive ?? true);
      setSyncClasses(true);
      setErrorMsg('');
    } else {
      // Find highest non-break period number
      const normalPeriods = existingPeriods.filter(p => !p.isBreak && p.periodNumber < 90);
      const maxNum = normalPeriods.length > 0 ? Math.max(...normalPeriods.map(p => p.periodNumber)) : 0;
      const nextNum = maxNum + 1;

      // Suggest appropriate times based on next number
      let defStart = '07:30';
      let defEnd = '09:00';
      let defSession: 'Morning' | 'Afternoon' | 'Evening' | 'Break' = 'Morning';

      if (nextNum === 1) {
        defStart = '07:30';
        defEnd = '09:00';
        defSession = 'Morning';
      } else if (nextNum === 2) {
        defStart = '09:15';
        defEnd = '10:45';
        defSession = 'Morning';
      } else if (nextNum === 3) {
        defStart = '13:30';
        defEnd = '15:00';
        defSession = 'Afternoon';
      } else if (nextNum === 4) {
        defStart = '15:15';
        defEnd = '16:45';
        defSession = 'Afternoon';
      } else if (nextNum === 5) {
        defStart = '17:00';
        defEnd = '18:30';
        defSession = 'Evening';
      } else if (nextNum === 6) {
        defStart = '18:45';
        defEnd = '20:15';
        defSession = 'Evening';
      }

      setPeriodNumber(nextNum);
      setPeriodName(`Period ${nextNum}`);
      setKhmerPeriodName(`ម៉ោងទី ${nextNum}`);
      setStartTime(defStart);
      setEndTime(defEnd);
      setSessionType(defSession);
      setIsBreak(false);
      setDescription(`Session ${nextNum} (90 mins)`);
      setColor(PRESET_COLORS[(nextNum - 1) % PRESET_COLORS.length].value);
      setIsActive(true);
      setSyncClasses(true);
      setErrorMsg('');
    }
  }, [initialPeriod, isOpen, existingPeriods]);

  // Duration in minutes
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalStart = startH * 60 + startM;
    const totalEnd = endH * 60 + endM;
    return totalEnd - totalStart;
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName.trim()) {
      setErrorMsg(isKhmer ? 'សូមបញ្ចូលឈ្មោះវេន / ម៉ោង' : 'Please provide a period name.');
      return;
    }
    if (durationMinutes <= 0) {
      setErrorMsg(isKhmer ? 'ម៉ោងបញ្ចប់ត្រូវតែធំជាងម៉ោងចាប់ផ្តើម!' : 'End time must be after start time.');
      return;
    }

    const payload: TimetablePeriod = {
      id: initialPeriod?.id || `period-${Date.now()}`,
      periodNumber: Number(periodNumber),
      periodName: periodName.trim(),
      khmerPeriodName: khmerPeriodName.trim() || undefined,
      startTime,
      endTime,
      sessionType,
      isBreak,
      durationMinutes,
      description: description.trim() || `${periodName} (${durationMinutes} mins)`,
      color,
      isActive
    };

    onSave(payload, syncClasses);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {initialPeriod 
                  ? (isKhmer ? 'កែសម្រួលវេនម៉ោងបង្រៀន' : 'Edit Timetable Period')
                  : (isKhmer ? 'បង្កើតវេនម៉ោងបង្រៀនថ្មី' : 'Create New Period Slot')}
              </h3>
              <p className="text-xs text-indigo-200 font-khmer mt-0.5">
                {isKhmer 
                  ? 'កំណត់ម៉ោងចាប់ផ្តើម-បញ្ចប់ ឈ្មោះវេន និងប្រភេទវេនសិក្សា'
                  : 'Define period bells, working durations, and session categorization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Period Type: Normal vs Break Interval */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setIsBreak(false);
                if (sessionType === 'Break') setSessionType('Morning');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                !isBreak
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'ម៉ោងសិក្សា (Class Period)' : 'Class Period'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBreak(true);
                setSessionType('Break');
                setPeriodName(prev => prev.includes('Break') ? prev : 'Midday Break');
                setKhmerPeriodName('សម្រាកថ្ងៃត្រង់');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                isBreak
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>{isKhmer ? 'ម៉ោងសម្រាក (Break Interval)' : 'Break Interval'}</span>
            </button>
          </div>

          {/* Period Number & Session Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isKhmer ? 'លេខរៀងវេន (Period Number) *' : 'Period Sequence # *'}
              </label>
              <input
                type="number"
                min={1}
                max={99}
                required
                value={periodNumber}
                onChange={e => setPeriodNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isKhmer ? 'វេនពេល (Session Category)' : 'Session Category'}
              </label>
              <select
                value={sessionType}
                onChange={e => setSessionType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Morning">🌅 Morning (ព្រឹក)</option>
                <option value="Afternoon">☀️ Afternoon (រសៀល)</option>
                <option value="Evening">🌙 Evening (យប់ / ពេលល្ងាច)</option>
                <option value="Break">☕ Break / Recess (សម្រាក)</option>
              </select>
            </div>
          </div>

          {/* Period Title (EN & Khmer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isKhmer ? 'ឈ្មោះវេន (English) *' : 'Period Title (English) *'}
              </label>
              <input
                type="text"
                required
                value={periodName}
                onChange={e => setPeriodName(e.target.value)}
                placeholder="e.g. Period 1 or Morning Session"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-khmer">
                {isKhmer ? 'ឈ្មោះជាភាសាខ្មែរ (Khmer Title)' : 'Khmer Title (ឈ្មោះខ្មែរ)'}
              </label>
              <input
                type="text"
                value={khmerPeriodName}
                onChange={e => setKhmerPeriodName(e.target.value)}
                placeholder="ឧទាហរណ៍៖ ម៉ោងទី ១"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-khmer focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Time Picker & Live Duration Box */}
          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  {isKhmer ? 'ម៉ោងចាប់ផ្តើម (Start Time) *' : 'Start Time *'}
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  {isKhmer ? 'ម៉ោងបញ្ចប់ (End Time) *' : 'End Time *'}
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Calculated duration badge */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-indigo-100">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {isKhmer ? 'រយៈពេលវេនបង្រៀន:' : 'Calculated Duration:'}
              </span>
              <span className={`font-mono font-black px-2 py-0.5 rounded-lg ${
                durationMinutes > 0
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {durationMinutes > 0 
                  ? `${durationMinutes} mins (${(durationMinutes / 60).toFixed(1)} hrs)` 
                  : (isKhmer ? 'ម៉ោងមិនត្រឹមត្រូវ' : 'Invalid Time')}
              </span>
            </div>
          </div>

          {/* Color Badge */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isKhmer ? 'ពណ៌សម្គាល់វេន (Period Badge Color)' : 'Period Color Badge'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center ${c.bg} ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                >
                  {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isKhmer ? 'ព័ត៌មានបន្ថែម / ចំណាំ (Description)' : 'Period Description / Notes'}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Standard 90-minute lecture session"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Status & Options */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700">
                {isKhmer ? 'បើកដំណើរការវេននេះ (Active Period)' : 'Period is Active'}
              </span>
            </label>

            {initialPeriod && (
              <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={syncClasses}
                  onChange={e => setSyncClasses(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    {isKhmer ? 'ធ្វើបច្ចុប្បន្នភាពម៉ោងថ្នាក់រៀនទាំងអស់ក្នុងវេននេះ' : 'Automatically sync scheduled classes'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isKhmer
                      ? 'កែប្រែម៉ោង និងឈ្មោះវេនលើគ្រប់មុខវិជ្ជាដែលកំពុងប្រើប្រាស់លេខវេននេះ'
                      : 'Update start/end times and period title for all classes currently assigned to this period'}
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialPeriod ? (isKhmer ? 'រក្សាទុកការកែប្រែ' : 'Update Period') : (isKhmer ? 'បង្កើតវេន' : 'Create Period')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
