import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { Teacher, Employee, UserAccount } from '../../types/index.ts';
import confetti from 'canvas-confetti';
import {
  X,
  User,
  Phone,
  Mail,
  Send,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Save,
  BookOpen,
  ShieldCheck,
  Building2,
  KeyRound,
  Upload,
  Trash2,
  Loader2
} from 'lucide-react';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop'
];

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated
}) => {
  const { currentUser, currentRole, updateCurrentUserProfile } = useAuth();
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  // Find linked teacher or employee record
  const teachers = StorageService.getTeachers();
  const employees = StorageService.getEmployees();

  const linkedTeacher = teachers.find(
    t =>
      (currentUser.personId && (t.id === currentUser.personId || t.teacherId.toLowerCase() === currentUser.personId.toLowerCase())) ||
      t.id === currentUser.id.replace(/^usr-/, '') ||
      (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      t.fullName.toLowerCase() === currentUser.fullName.toLowerCase() ||
      (currentUser.khmerName && t.khmerName && t.khmerName.trim() === currentUser.khmerName.trim())
  );

  const linkedEmployee = !linkedTeacher
    ? employees.find(
        e =>
          (currentUser.personId && (e.id === currentUser.personId || e.employeeId.toLowerCase() === currentUser.personId.toLowerCase())) ||
          e.id === currentUser.id.replace(/^usr-/, '') ||
          (currentUser.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          e.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      )
    : undefined;

  const [formData, setFormData] = useState({
    fullName: '',
    khmerName: '',
    englishName: '',
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    phone: '',
    email: '',
    subject: '',
    telegramUsername: '',
    telegramChatId: '',
    pinCode: '1234',
    photoUrl: '',
    hourlyRate: 20,
    currency: 'USD'
  });

  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'telegram'>('profile');

  // Photo upload ref & state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Teaching rate visibility permissions: NEVER show rate to teacher account
  const canManageRate = ['super_admin', 'admin_hr', 'admin'].includes(currentUser.role);
  const isTeacherAccount = currentUser.role === 'teacher';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(isKhmer ? 'សូមជ្រើសរើសឯកសារជារូបភាព (PNG, JPG, WebP)' : 'Please select an image file (PNG, JPG, WebP)', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setFormData(prev => ({ ...prev, photoUrl: compressedDataUrl }));
            setIsUploadingPhoto(false);
            showToast(isKhmer ? 'បានផ្ទុកឡើងរូបថតប្រវត្តិរូបជោគជ័យ' : 'Profile picture loaded successfully', 'success');
          } else {
            setIsUploadingPhoto(false);
          }
        } catch {
          setIsUploadingPhoto(false);
          showToast(isKhmer ? 'មិនអាចបង្រួមរូបភាពបានទេ' : 'Failed to process image', 'error');
        }
      };
      img.onerror = () => {
        setIsUploadingPhoto(false);
        showToast(isKhmer ? 'មិនអាចអានរូបភាពបានទេ' : 'Failed to load image file', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      showToast(isKhmer ? 'បរាជ័យក្នុងការអានឯកសារ' : 'Failed to read file', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Populate form with current data
  useEffect(() => {
    if (isOpen) {
      const source = linkedTeacher || linkedEmployee;
      setFormData({
        fullName: source?.fullName || currentUser.fullName || '',
        khmerName: source?.khmerName || currentUser.khmerName || '',
        englishName: (source as any)?.englishName || source?.fullName || currentUser.fullName || '',
        gender: (source as any)?.gender || 'Male',
        dateOfBirth: (source as any)?.dateOfBirth || '1990-01-01',
        phone: source?.phone || currentUser.phone || '',
        email: source?.email || currentUser.email || '',
        subject: (source as any)?.subject || (source as any)?.position || 'General Education',
        telegramUsername: (source as any)?.telegramUsername || '',
        telegramChatId: source?.telegramChatId || '',
        pinCode: source?.pinCode || currentUser.pinCode || '1234',
        photoUrl: source?.photoUrl || currentUser.avatarUrl || AVATAR_PRESETS[0],
        hourlyRate: (source as any)?.hourlyRate !== undefined ? Number((source as any).hourlyRate) : 20,
        currency: (source as any)?.currency || 'USD'
      });
    }
  }, [isOpen, linkedTeacher, linkedEmployee, currentUser]);

  if (!isOpen) return null;

  const handleTestTelegram = async () => {
    const chatId = formData.telegramChatId.trim();
    if (!chatId) {
      showToast(
        isKhmer
          ? 'សូមបញ្ចូល Telegram Chat ID មុនពេលសាកល្បង'
          : 'Please enter your Telegram Chat ID first.',
        'error'
      );
      return;
    }

    setIsTestingTelegram(true);
    const testText = isKhmer
      ? `🔔 <b>ការជូនដំណឹងសាកល្បងប្រព័ន្ធ Edutrack</b>\nសួស្តីលោកគ្រូ/អ្នកគ្រូ <b>${formData.khmerName || formData.fullName}</b>!\nតំណភ្ជាប់ Telegram ជាមួយប្រវត្តិរូបរបស់អ្នកដំណើរការបានយ៉ាងល្អឥតខ្ចោះ។`
      : `🔔 <b>Edutrack Test Notification</b>\nHello <b>${formData.fullName}</b>!\nYour Telegram notifications are successfully connected.`;

    const res = await TelegramService.dispatchMessage({
      chatId,
      text: testText,
      type: 'custom'
    });
    setIsTestingTelegram(false);

    if (res.success || res.statusText === 'Sent' || res.statusText === 'Simulated') {
      showToast(
        isKhmer
          ? `បានផ្ញើសារសាកល្បងទៅកាន់ Chat ID: ${chatId} ដោយជោគជ័យ!`
          : `Test message sent to Chat ID ${chatId}! Check your Telegram.`,
        'success'
      );
    } else {
      showToast(
        isKhmer
          ? `បរាជ័យក្នុងការផ្ញើសារ៖ ${res.error || res.statusText}`
          : `Failed to dispatch Telegram message: ${res.error || res.statusText}`,
        'error'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      showToast(isKhmer ? 'សូមបញ្ចូលឈ្មោះពេញ' : 'Full Name is required', 'error');
      return;
    }

    if (formData.pinCode && (formData.pinCode.length < 4 || !/^\d+$/.test(formData.pinCode))) {
      showToast(
        isKhmer ? 'លេខសម្ងាត់ PIN ត្រូវតែជាលេខយ៉ាងហោចណាស់ ៤ ខ្ទង់' : 'PIN Code must be at least 4 digits',
        'error'
      );
      return;
    }

    setIsSaving(true);

    try {
      const parsedRate = Number(formData.hourlyRate) > 0 ? Number(formData.hourlyRate) : 20;

      // 1. Update Teacher record if linked
      if (linkedTeacher) {
        StorageService.updateTeacher(linkedTeacher.id, {
          fullName: formData.fullName.trim(),
          khmerName: formData.khmerName.trim(),
          englishName: formData.englishName.trim() || formData.fullName.trim(),
          gender: formData.gender as any,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          telegramUsername: formData.telegramUsername.trim(),
          telegramChatId: formData.telegramChatId.trim(),
          pinCode: formData.pinCode.trim(),
          photoUrl: formData.photoUrl.trim(),
          hourlyRate: (!isTeacherAccount && canManageRate) ? parsedRate : (linkedTeacher.hourlyRate ?? 20),
          currency: (!isTeacherAccount && canManageRate) ? ((formData.currency as 'USD' | 'KHR') || 'USD') : (linkedTeacher.currency || 'USD')
        });
      } else if (currentUser.role === 'teacher') {
        // Create teacher profile if missing
        const newTeacherId = currentUser.personId || currentUser.id.replace(/^usr-/, '') || `tch-${Date.now().toString().slice(-4)}`;
        StorageService.addTeacher({
          id: newTeacherId,
          teacherId: `TCH-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
          employeeId: `EMP-${String(Math.floor(Math.random() * 900) + 100)}`,
          fullName: formData.fullName.trim(),
          khmerName: formData.khmerName.trim(),
          englishName: formData.englishName.trim() || formData.fullName.trim(),
          gender: formData.gender as any,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim() || 'General Education',
          department: currentUser.department || 'Academic & Curriculum',
          position: 'Teacher',
          employmentType: 'Full-time',
          joinDate: new Date().toISOString().slice(0, 10),
          assignedLocation: 'Main Campus',
          assignedScheduleId: 'sch-teacher-morning',
          telegramUsername: formData.telegramUsername.trim(),
          telegramChatId: formData.telegramChatId.trim(),
          pinCode: formData.pinCode.trim(),
          photoUrl: formData.photoUrl.trim(),
          hourlyRate: (!isTeacherAccount && canManageRate) ? parsedRate : 20,
          currency: (!isTeacherAccount && canManageRate) ? ((formData.currency as 'USD' | 'KHR') || 'USD') : 'USD',
          status: 'Active'
        });
      } else if (linkedEmployee) {
        StorageService.updateEmployee(linkedEmployee.id, {
          fullName: formData.fullName.trim(),
          khmerName: formData.khmerName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          telegramChatId: formData.telegramChatId.trim(),
          pinCode: formData.pinCode.trim(),
          photoUrl: formData.photoUrl.trim()
        });
      }

      // 2. Update UserAccount in StorageService & AuthContext
      const userUpdates: Partial<UserAccount> = {
        fullName: formData.fullName.trim(),
        khmerName: formData.khmerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        pinCode: formData.pinCode.trim(),
        avatarUrl: formData.photoUrl.trim()
      };

      updateCurrentUserProfile(userUpdates);

      // Audit Log
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: formData.fullName.trim(),
        userRole: currentUser.role,
        action: 'Profile Updated',
        target: `${formData.fullName.trim()} updated owned profile info & credentials`,
        previousValue: currentUser.fullName,
        newValue: formData.fullName.trim(),
        ipAddress: '127.0.0.1'
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      showToast(
        isKhmer
          ? 'បានធ្វើបច្ចុប្បន្នភាពព័ត៌មានប្រវត្តិរូបផ្ទាល់ខ្លួនដោយជោគជ័យ!'
          : 'Profile and owned information updated successfully!',
        'success'
      );

      if (onProfileUpdated) {
        onProfileUpdated();
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showToast(
        isKhmer
          ? `បរាជ័យក្នុងការកែប្រែប្រវត្តិរូប៖ ${err?.message || err}`
          : `Failed to update profile: ${err?.message || err}`,
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header Banner */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-indigo-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{isKhmer ? 'កែសម្រួលព័ត៌មានប្រវត្តិរូបរបស់ខ្ញុំ' : 'Edit My Profile & Owned Information'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                  {currentRole.name}
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80 font-khmer">
                {isKhmer
                  ? 'ធ្វើបច្ចុប្បន្នភាពព័ត៌មានទំនាក់ទំនង លេខសម្ងាត់ PIN ស្កេន និងការជូនដំណឹងតេឡេក្រាម'
                  : 'Manage your contact details, security check-in PIN, and Telegram notifications.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-5 bg-slate-50 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-indigo-600" />
            <span>{isKhmer ? 'ព័ត៌មានទូទៅ (Profile)' : 'General Info'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span>{isKhmer ? 'លេខសម្ងាត់ PIN ស្កេន' : 'Kiosk PIN & Security'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'telegram'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-sky-500" />
            <span>{isKhmer ? 'តេឡេក្រាម (Telegram)' : 'Telegram Alerts'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form
          id="teacher-profile-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1 min-h-0"
        >
          
          {/* TAB 1: GENERAL PROFILE INFO */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Photo & Avatar Selection with Direct File Upload */}
              <div className="bg-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={formData.photoUrl || AVATAR_PRESETS[0]}
                    alt="Profile Preview"
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-200/80 shadow-md transition-all group-hover:ring-indigo-400"
                    onError={e => {
                      (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white cursor-pointer text-[10px] font-bold p-1 text-center"
                    title={isKhmer ? 'ចុចដើម្បីផ្ទុកឡើងរូបថតថ្មី' : 'Click to upload new photo'}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>{isKhmer ? 'ប្តូររូបថត' : 'Change'}</span>
                      </>
                    )}
                  </button>
                  {formData.photoUrl && formData.photoUrl !== AVATAR_PRESETS[0] && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: AVATAR_PRESETS[0] })}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                      title={isKhmer ? 'លុបរូបថតនេះចេញ' : 'Remove uploaded photo'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0 w-full space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        {isKhmer ? 'រូបថតប្រវត្តិរូបផ្ទាល់ខ្លួន (Profile Picture)' : 'Teacher Profile Picture'}
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        {isKhmer
                          ? 'ផ្ទុកឡើងរូបថតពីទូរស័ព្ទ ឬកុំព្យូទ័រ (JPG, PNG, WebP) - ប្រព័ន្ធនឹងបង្រួមទំហំដោយស្វ័យប្រវត្ត'
                          : 'Upload directly from camera or device (JPG, PNG, WebP) - auto-optimized'}
                      </span>
                    </div>

                    {/* Hidden file input triggered by button and avatar click */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isKhmer ? 'ផ្ទុកឡើងរូបថត' : 'Upload Photo'}</span>
                      </button>

                      {formData.photoUrl && formData.photoUrl !== AVATAR_PRESETS[0] && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photoUrl: AVATAR_PRESETS[0] })}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                          title={isKhmer ? 'កំណត់ឡើងវិញ' : 'Reset to default'}
                        >
                          {isKhmer ? 'កំណត់ឡើងវិញ' : 'Reset'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Avatar Presets */}
                  <div className="pt-1 border-t border-indigo-100/70">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                      {isKhmer ? 'ឬជ្រើសរើសរូបតំណាងគំរូ (Quick Presets):' : 'Or choose an avatar preset:'}
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, photoUrl: preset })}
                          className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 ring-2 transition-all cursor-pointer ${
                            formData.photoUrl === preset ? 'ring-indigo-600 scale-110 shadow-xs' : 'ring-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={preset} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Names: Full Name & Khmer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'ឈ្មោះពេញ (ឡាតាំង / English Full Name) *' : 'Full Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Sok Dara"
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'ឈ្មោះជាភាសាខ្មែរ (Khmer Full Name)' : 'Khmer Full Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.khmerName}
                    onChange={e => setFormData({ ...formData, khmerName: e.target.value })}
                    placeholder="ឧ. សុខ តារា"
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-khmer text-slate-900"
                  />
                </div>
              </div>

              {/* Gender, DOB & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'ភេទ (Gender)' : 'Gender'}
                  </label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                  >
                    <option value="Male">{isKhmer ? 'ប្រុស (Male)' : 'Male'}</option>
                    <option value="Female">{isKhmer ? 'ស្រី (Female)' : 'Female'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'ថ្ងៃខែឆ្នាំកំណើត (Date of Birth)' : 'Date of Birth'}
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'មុខវិជ្ជាបង្រៀន / ជំនាញ' : 'Subject / Specialization'}
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Contact: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'លេខទូរស័ព្ទទំនាក់ទំនង (Phone Number) *' : 'Phone Number *'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+855 12 345 678"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-xs text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-khmer">
                    ប្រើសម្រាប់ចូលប្រព័ន្ធ (Login with Phone)
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'អ៊ីមែល (Email Address) *' : 'Email Address *'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="teacher@heartschool.edu.kh"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-xs text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-khmer">
                    ប្រើសម្រាប់ការជូនដំណឹង និងចូលប្រព័ន្ធ
                  </p>
                </div>
              </div>

              {/* Hourly Teaching Rate & Currency (Restricted: NEVER show on teacher accounts) */}
              {!isTeacherAccount && canManageRate && Boolean(linkedTeacher) && (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">$</span>
                      <span className="text-xs font-bold text-emerald-950">
                        {isKhmer ? 'អត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោង (Hourly Teaching Rate)' : 'Hourly Teaching Rate'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-mono">
                      {formData.currency} {Number(formData.hourlyRate).toFixed(2)}/hr
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mb-3 font-khmer">
                    {isKhmer
                      ? 'អត្រានេះត្រូវប្រើសម្រាប់គណនាប្រាក់ឈ្នួលសរុប (Gross Wage) ដោយស្វ័យប្រវត្តិក្នុងរបាយការណ៍បង្រៀន។'
                      : 'This rate is used to calculate Gross Wage ($) for all completed and checked-in teaching sessions.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {isKhmer ? 'កម្រៃក្នុងមួយម៉ោង ($/hr)' : 'Rate Per Hour ($/hr)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={formData.hourlyRate}
                        onChange={e => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-3 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {isKhmer ? 'រូបិយប័ណ្ណ (Currency)' : 'Currency'}
                      </label>
                      <select
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full text-xs px-3 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                      >
                        <option value="USD">USD ($ - ដុល្លារ)</option>
                        <option value="KHR">KHR (៛ - រៀល)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KIOSK PIN & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-900">
                      {isKhmer ? 'លេខកូដសម្ងាត់ ៤ ខ្ទង់សម្រាប់ស្កេនចូលរៀន (Kiosk Check-in PIN)' : '4-Digit Kiosk Check-in PIN'}
                    </h3>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-khmer leading-relaxed">
                      {isKhmer
                        ? 'លេខសម្ងាត់នេះប្រើសម្រាប់ផ្ទៀងផ្ទាត់ពេលស្កេនវត្តមានចូលរៀននៅតាមបញ្ជរ Kiosk ឬស្កេន QR Code កាលវិភាគ។'
                        : 'This 4-digit PIN is required to authenticate and verify check-in at attendance kiosks and QR scanners.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 block text-center">
                  {isKhmer ? 'បញ្ចូលលេខកូដសម្ងាត់ PIN (៤-៦ ខ្ទង់)' : 'Security PIN Code (4-6 digits)'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, pinCode: val });
                    }}
                    placeholder="1234"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 bg-slate-50 focus:bg-white border-2 border-emerald-500/40 focus:border-emerald-600 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isKhmer
                      ? `លេខកូដបច្ចុប្បន្នមាន ${formData.pinCode.length} ខ្ទង់`
                      : `Current PIN length: ${formData.pinCode.length} digits`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TELEGRAM INTEGRATION */}
          {activeTab === 'telegram' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-sky-950">
                      {isKhmer ? 'ការជូនដំណឹងតាមតេឡេក្រាម (Telegram Schedule Alerts)' : 'Personal Telegram Notifications'}
                    </h3>
                    <p className="text-[11px] text-sky-800 mt-0.5 font-khmer leading-relaxed">
                      {isKhmer
                        ? 'ទទួលការជូនដំណឹងរំលឹកកាលវិភាគបង្រៀន ម៉ោងបង្រៀនបន្ទាប់ និងរបាយការណ៍ម៉ោងវត្តមានដោយផ្ទាល់ទៅកាន់គណនី Telegram របស់អ្នក។'
                        : 'Receive automated schedule reminders, timetable notifications, and attendance verification directly in Telegram.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'ឈ្មោះគណនីតេឡេក្រាម (Telegram Username)' : 'Telegram Username'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={formData.telegramUsername.replace(/^@/, '')}
                      onChange={e => setFormData({ ...formData, telegramUsername: `@${e.target.value.replace(/^@/, '')}` })}
                      placeholder="username"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isKhmer ? 'Telegram Chat ID (លេខសម្គាល់ឆាត)' : 'Telegram Chat ID'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.telegramChatId}
                      onChange={e => setFormData({ ...formData, telegramChatId: e.target.value.trim() })}
                      placeholder="e.g. 5252354054"
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={isTestingTelegram || !formData.telegramChatId.trim()}
                      onClick={handleTestTelegram}
                      className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title={isKhmer ? 'ផ្ញើសារសាកល្បង' : 'Send Test Notification'}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTestingTelegram ? '...' : (isKhmer ? 'សាកល្បង' : 'Test')}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-khmer">
                    ដើម្បីដឹង Chat ID របស់អ្នក សូមឆាតទៅកាន់ <span className="font-mono text-indigo-600">@userinfobot</span> ក្នុង Telegram។
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Pinned Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50/95 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {linkedTeacher ? (
              <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                {linkedTeacher.teacherId}
              </span>
            ) : (
              <span>{currentUser.email}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="teacher-profile-form"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (isKhmer ? 'កំពុងរក្សាទុក...' : 'Saving...') : (isKhmer ? 'រក្សាទុកការកែប្រែ' : 'Save Changes')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
