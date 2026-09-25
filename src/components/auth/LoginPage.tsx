import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { Teacher } from '../../types/index.ts';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Languages,
  KeyRound,
  User,
  Search,
  Check,
  Delete,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { loginWithGoogle, loginWithCredentials, loginWithPin, authError, setAuthError, isLoading } = useAuth();
  const { isKhmer, toggleLanguage, language } = useLanguage();

  // Mode: 'pin' for dedicated teacher PIN authentication, 'standard' for password & Google
  const [authMode, setAuthMode] = useState<'pin' | 'standard'>('pin');

  // Standard Login States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Teacher PIN Login States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [manualTeacherId, setManualTeacherId] = useState('');
  const [pinDigits, setPinDigits] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  const systemSettings = StorageService.getSystemSettings();

  // Load active teachers from storage/sync
  useEffect(() => {
    const loadTeachers = () => {
      const active = StorageService.getTeachers().filter(t => t.status === 'Active');
      setTeachers(active);
      if (active.length > 0 && !selectedTeacher) {
        setSelectedTeacher(active[0]);
      }
    };

    loadTeachers();
    const unsub = StorageService.subscribe(loadTeachers);
    return unsub;
  }, []);

  // Filter teachers for the selector
  const filteredTeachers = teachers.filter(t => {
    if (!teacherSearch.trim()) return true;
    const q = teacherSearch.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      (t.khmerName && t.khmerName.toLowerCase().includes(q)) ||
      t.teacherId.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q)
    );
  });

  // Handle Standard Credential Login
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setAuthError(isKhmer ? 'សូមបញ្ចូលអ៊ីមែល ឬលេខសម្គាល់បុគ្គលិក' : 'Please enter an email or staff ID');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithCredentials(identifier, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch {
      // Handled in context
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle PIN input key clicks (Touch Numpad)
  const handleNumpadPress = (digit: string) => {
    if (pinDigits.length < 6) {
      setPinDigits(prev => prev + digit);
    }
  };

  const handleNumpadBackspace = () => {
    setPinDigits(prev => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    setPinDigits('');
  };

  // Handle Teacher PIN Login Submission
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const targetId = selectedTeacher ? selectedTeacher.teacherId : manualTeacherId.trim();

    if (!targetId) {
      setAuthError(
        isKhmer
          ? 'សូមជ្រើសរើសគ្រូបង្រៀន ឬបញ្ចូលលេខកូដគ្រូ (Teacher ID)'
          : 'Please select a teacher or enter your Teacher ID'
      );
      return;
    }

    if (!pinDigits.trim()) {
      setAuthError(
        isKhmer ? 'សូមបញ្ចូលលេខកូដសម្ងាត់ PIN ៤ ខ្ទង់របស់អ្នក' : 'Please enter your 4-digit PIN'
      );
      return;
    }

    setIsPinSubmitting(true);
    try {
      const success = await loginWithPin(targetId, pinDigits);
      if (!success && !authError) {
        setAuthError(
          isKhmer
            ? 'លេខកូដសម្ងាត់ PIN មិនត្រឹមត្រូវ។ សូមសាកល្បងលេខកូដ 1234'
            : 'Incorrect PIN. Default testing PIN is 1234.'
        );
      }
    } finally {
      setIsPinSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 ${isKhmer ? 'font-khmer' : 'font-sans'}`}>
      
      {/* Top Bar with School Name and Language Switcher */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                {isKhmer ? systemSettings.khmerOrgName : systemSettings.organizationName}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                School MIS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              {isKhmer
                ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន កាលវិភាគ និងប្រតិបត្តិការសាលារៀន'
                : 'Faculty Attendance, Timetable & Operational Management'}
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all backdrop-blur-md"
        >
          <Languages className="w-4 h-4 text-indigo-400" />
          <span>{language === 'km' ? '🇰🇭 ភាសាខ្មែរ' : '🇬🇧 English'}</span>
        </button>
      </header>

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center py-6 sm:py-10">
        <div className="w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* Card Header */}
          <div className="p-6 bg-gradient-to-b from-indigo-50/70 to-white border-b border-slate-100 text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isKhmer ? 'ច្រកចូលប្រព័ន្ធដែលមានសុវត្ថិភាព' : 'Institutional Secure Login'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isKhmer ? 'ចូលប្រើប្រព័ន្ធ EduTrack' : 'Sign in to EduTrack'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {isKhmer
                ? 'ចូលប្រើតាមលេខកូដសម្ងាត់ PIN របស់គ្រូ ឬគណនី Google / Email'
                : 'Fast PIN access for faculty, or sign in via Google & institutional email'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-5 grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
                  authMode === 'pin'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>{isKhmer ? 'ចូលតាមលេខ PIN គ្រូ' : 'Teacher PIN Login'}</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700">
                  Fast
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('standard');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
                  authMode === 'standard'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{isKhmer ? 'Google / អ៊ីមែល' : 'Password / Google'}</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Owned Attendance Policy Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-1">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {isKhmer ? 'គោលការណ៍វត្តមានផ្ទាល់ខ្លួន (Owned Attendance Only)' : 'Owned Attendance Policy (No Proxy / Switching)'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed font-medium">
                {isKhmer
                  ? 'លោកគ្រូ-អ្នកគ្រូ ត្រូវតែ Login ចូលគណនីផ្ទាល់ខ្លួនដើម្បីកត់ត្រាវត្តមាន។ ប្រព័ន្ធចាក់សោរស្វ័យប្រវត្តិដើម្បីការពារការស្កេនជំនួស ឬការជ្រើសរើសឈ្មោះគ្រូដទៃ។'
                  : 'Teachers and staff must log in to their authenticated personal account to record attendance. Switching accounts on terminals is strictly disabled.'}
              </p>
            </div>

            {/* Error Message if any */}
            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">
                  {authError}
                </div>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-rose-400 hover:text-rose-700 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: TEACHER PIN LOGIN */}
            {authMode === 'pin' && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                
                {/* Teacher Selector Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isKhmer ? 'ជ្រើសរើសលោកគ្រូ-អ្នកគ្រូ៖' : '1. Select Teacher Profile:'}</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {teachers.length} {isKhmer ? 'គ្រូកំពុងបង្រៀន' : 'Active Teachers'}
                    </span>
                  </div>

                  {/* Search Bar for Teachers if more than 3 */}
                  {teachers.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={e => setTeacherSearch(e.target.value)}
                        placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះ ឬលេខកូដគ្រូ...' : 'Filter by name or Teacher ID...'}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                      />
                    </div>
                  )}

                  {/* Teacher Cards Carousel / Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {filteredTeachers.map(teacher => {
                      const isSelected = selectedTeacher?.id === teacher.id;
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setManualTeacherId(teacher.teacherId);
                            setAuthError(null);
                          }}
                          className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-600 shadow-xs ring-2 ring-indigo-500/30'
                              : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-1.5">
                            <img
                              src={teacher.photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-xs text-slate-900 block truncate">
                                {teacher.fullName}
                              </span>
                              {teacher.khmerName && (
                                <span className="font-khmer text-[10px] text-slate-500 block truncate">
                                  {teacher.khmerName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-100">
                            <span className="text-indigo-600 font-bold">{teacher.teacherId}</span>
                            <span className="text-slate-400 truncate max-w-[80px]">{teacher.subject}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Fallback Manual Teacher ID Input */}
                  <div className="pt-1">
                    <details className="text-xs group">
                      <summary className="text-[11px] text-indigo-600 font-bold cursor-pointer hover:underline list-none flex items-center gap-1">
                        <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                        <span>{isKhmer ? 'ឬបញ្ចូលលេខកូដគ្រូដោយផ្ទាល់' : 'Or type Teacher ID manually'}</span>
                      </summary>
                      <div className="mt-2 relative">
                        <input
                          type="text"
                          value={manualTeacherId}
                          onChange={e => {
                            setManualTeacherId(e.target.value);
                            const found = teachers.find(
                              t => t.teacherId.toLowerCase() === e.target.value.trim().toLowerCase()
                            );
                            if (found) setSelectedTeacher(found);
                          }}
                          placeholder="e.g. TCH-2026-001"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </details>
                  </div>
                </div>

                {/* Selected Teacher Banner */}
                {selectedTeacher && (
                  <div className="p-3 rounded-2xl bg-indigo-600 text-white flex items-center justify-between shadow-sm shadow-indigo-600/20">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedTeacher.photoUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm tracking-tight">{selectedTeacher.fullName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-indigo-100">
                            {selectedTeacher.teacherId}
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-100 font-medium">
                          {selectedTeacher.khmerName} • {selectedTeacher.subject}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-indigo-700 px-2 py-1 rounded-lg">
                      Ready
                    </span>
                  </div>
                )}

                {/* PIN Code Input Display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isKhmer ? '2. បញ្ចូលលេខកូដសម្ងាត់ PIN (៤ ខ្ទង់)៖' : '2. Enter 4-Digit Security PIN:'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPin ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  {/* Masked / Visible PIN Display Boxes */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[0, 1, 2, 3].map(idx => {
                      const char = pinDigits[idx];
                      const isFilled = char !== undefined;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-14 rounded-2xl flex items-center justify-center font-mono text-2xl font-black transition-all border-2 ${
                            isFilled
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          {isFilled ? (showPin ? char : '•') : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct Keyboard Input Alternative */}
                  <div className="text-center">
                    <input
                      type="password"
                      maxLength={6}
                      value={pinDigits}
                      onChange={e => setPinDigits(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Type PIN or use keypad below"
                      className="w-full text-center py-2 px-3 text-xs font-mono font-bold tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Touch Numpad (0-9, Clear, Backspace) */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleNumpadPress(digit)}
                        className="py-3 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-slate-900 font-black text-base shadow-xs active:scale-95 transition-all"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="py-3 rounded-xl bg-slate-200/70 hover:bg-slate-300/80 text-slate-700 font-bold text-xs uppercase active:scale-95 transition-all"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="py-3 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-slate-900 font-black text-base shadow-xs active:scale-95 transition-all"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="py-3 rounded-xl bg-slate-200/70 hover:bg-slate-300/80 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Fill Test Hint */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {isKhmer ? 'លេខសម្ងាត់សាកល្បង៖' : 'Demo Test PIN:'}{' '}
                      <strong className="text-indigo-600 font-mono">1234</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPinDigits('1234')}
                      className="px-2 py-0.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold transition-colors"
                    >
                      {isKhmer ? 'បំពេញ 1234 ស្វ័យប្រវត្តិ' : 'Auto-Fill 1234'}
                    </button>
                  </div>
                </div>

                {/* Submit PIN Button */}
                <button
                  type="button"
                  onClick={() => handlePinSubmit()}
                  disabled={isPinSubmitting || isLoading || pinDigits.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:shadow-xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPinSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {selectedTeacher
                          ? isKhmer
                            ? `ចូលប្រើជាគ្រូ ${selectedTeacher.fullName}`
                            : `Sign In as ${selectedTeacher.fullName}`
                          : isKhmer
                          ? 'ចូលប្រើប្រព័ន្ធតាមរយៈ PIN'
                          : 'Sign In with PIN'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </div>
            )}

            {/* TAB 2: STANDARD / GOOGLE SIGN-IN */}
            {authMode === 'standard' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Google Authentication Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-xs transition-all duration-200 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isGoogleLoading ? (
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {isKhmer ? 'ចូលប្រើតាមរយៈគណនី Google' : 'Continue with Google Account'}
                    </span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    {isKhmer
                      ? 'គាំទ្រគណនី Google ស្ថាប័ន ឬអ៊ីមែលផ្ទាល់ខ្លួន'
                      : 'Fast, secure authentication via Google Firebase Auth'}
                  </p>
                </div>

                {/* Visual Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    {isKhmer ? 'ឬចូលប្រើតាមអ៊ីមែល' : 'OR SIGN IN WITH CREDENTIALS'}
                  </span>
                </div>

                {/* Email / Staff ID Form */}
                <form onSubmit={handleStandardSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isKhmer ? 'អ៊ីមែល ឬលេខសម្គាល់បុគ្គលិក' : 'Email Address or Staff ID'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="planningtks585@gmail.com / TCH-2026-001"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isKhmer ? 'ពាក្យសម្ងាត់ ឬលេខកូដ PIN' : 'Password or PIN'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isKhmer ? 'ចូលប្រើប្រព័ន្ធ' : 'Sign In to Portal'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Quick Demo Faculty Accounts for Immediate Testing */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                <span>
                  {isKhmer ? 'ចូលគណនីគ្រូសាកល្បងរហ័ស (One-Click Testing):' : 'Quick One-Click Test Sign-In:'}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase">
                  {isKhmer ? 'វត្តមានផ្ទាល់ខ្លួន' : 'Owned Only'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => loginWithCredentials('TCH-2026-001')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/70 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600">Sok Chenda (គណិត)</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-001 • PIN 1234</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => loginWithCredentials('TCH-2026-002')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/70 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    C
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate group-hover:text-emerald-700">Chann Borey (អក្សរ)</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-002 • PIN 1234</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => loginWithCredentials('TCH-2026-003')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/70 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    K
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate group-hover:text-sky-700">Keo Piseth (IT)</div>
                    <div className="font-mono text-[10px] text-slate-400">TCH-2026-003 • PIN 1234</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => loginWithCredentials('planningtks585@gmail.com')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/70 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    🛡️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600">Super Admin</div>
                    <div className="font-mono text-[10px] text-slate-400">planningtks585@...</div>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Card Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isKhmer ? 'ប្រព័ន្ធការពារទិន្នន័យស្របតាមស្តង់ដារ' : '256-bit SSL Protected MIS'}</span>
            </span>
            <span>{systemSettings.organizationName} • Academic Year 2026-2027</span>
          </div>

        </div>
      </div>

      {/* Bottom Footer Info */}
      <footer className="text-center text-xs text-slate-400 py-2">
        <p>© 2026 {systemSettings.organizationName} ({systemSettings.khmerOrgName}). All rights reserved.</p>
      </footer>

    </div>
  );
};
