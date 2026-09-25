import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
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
  Languages
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithCredentials, authError, setAuthError, isLoading } = useAuth();
  const { isKhmer, toggleLanguage, language, t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const systemSettings = StorageService.getSystemSettings();

  const handleSubmit = async (e: React.FormEvent) => {
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
          <div className="p-6 sm:p-8 bg-gradient-to-b from-indigo-50/60 to-white border-b border-slate-100 text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isKhmer ? 'ច្រកចូលប្រព័ន្ធដែលមានសុវត្ថិភាព' : 'Institutional Secure Login'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isKhmer ? 'ចូលប្រើប្រព័ន្ធ EduTrack' : 'Sign in to EduTrack'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              {isKhmer
                ? 'សូមជ្រើសរើសការចូលប្រើតាមរយៈ Google ឬគណនីបុគ្គលិករបស់អ្នក'
                : 'Access daily schedules, faculty check-in kiosk, and administrative tools'}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Error Message if any */}
            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
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

            {/* Google Authentication Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed group"
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
                {isKhmer ? 'ឬចូលប្រើដោយផ្ទាល់' : 'OR SIGN IN WITH CREDENTIALS'}
              </span>
            </div>

            {/* Email / Staff ID Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  {isKhmer ? 'ពាក្យសម្ងាត់' : 'Password'}
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

          {/* Card Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isKhmer ? 'ប្រព័ន្ធការពារទិន្នន័យស្របតាមស្តង់ដារ' : '256-bit SSL Protected MIS'}</span>
            </span>
            <span>Phnom Penh Academy • Academic Year 2026-2027</span>
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
