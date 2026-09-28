import React, { useState } from 'react';
import { Teacher } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  AlertTriangle,
  Trash2,
  X,
  Calendar,
  UserX,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

interface DeleteTeacherModalProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (teacherId: string) => void;
}

export const DeleteTeacherModal: React.FC<DeleteTeacherModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onDeleted
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();
  const { currentUser } = useAuth();

  const [deleteSchedules, setDeleteSchedules] = useState(true);
  const [deleteUserAccount, setDeleteUserAccount] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !teacher) return null;

  // Count active timetable sessions for this teacher
  const allSchedules = StorageService.getSubjectSchedules();
  const teacherSchedules = allSchedules.filter(s => s.teacherId === teacher.id);

  const handleDelete = () => {
    setIsDeleting(true);
    try {
      StorageService.deleteTeacher(teacher.id, {
        deleteSchedules,
        deleteUserAccount
      });

      StorageService.addAuditLog({
        userId: currentUser?.id || 'admin',
        userName: currentUser?.fullName || 'Administrator',
        userRole: currentUser?.role || 'admin',
        action: 'Deleted Teacher Profile',
        target: `${teacher.fullName} (${teacher.teacherId}) - Cleaned schedules: ${deleteSchedules ? 'Yes' : 'No'}`,
        ipAddress: '127.0.0.1'
      });

      showToast(
        isKhmer
          ? `បានលុបព័ត៌មានគ្រូ ${teacher.fullName} ដោយជោគជ័យ!`
          : `Teacher ${teacher.fullName} has been removed successfully.`,
        'info'
      );

      if (onDeleted) {
        onDeleted(teacher.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to delete teacher:', err);
      showToast(err?.message || 'Failed to delete teacher', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header with Red Warning Accent */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-950">
                {isKhmer ? 'បញ្ជាក់ការលុបព័ត៌មានគ្រូបង្រៀន' : 'Confirm Teacher Deletion'}
              </h3>
              <p className="text-xs text-rose-700">
                {isKhmer ? 'សកម្មភាពនេះនឹងលុបគ្រូចេញពីបញ្ជីបុគ្គលិកសាលា' : 'Permanent faculty directory removal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teacher Details Card */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            {teacher.photoUrl && teacher.photoUrl.trim() ? (
              <img
                src={teacher.photoUrl.trim()}
                alt={teacher.fullName}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold text-xl flex items-center justify-center ring-2 ring-white shadow-xs shrink-0">
                {teacher.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base leading-tight truncate">
                  {teacher.fullName}
                </span>
                {teacher.khmerName && (
                  <span className="text-xs text-slate-500 font-khmer">
                    ({teacher.khmerName})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {teacher.teacherId}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {teacher.subject}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  {teacher.department}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              {isKhmer
                ? `តើអ្នកពិតជាចង់លុបគ្រូ ${teacher.fullName} មែនទេ? ទិន្នន័យនេះនឹងត្រូវដកចេញភ្លាមៗ និងធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិតាមរយៈ Cloud Auto-Sync។`
                : `Are you sure you want to remove ${teacher.fullName} from the faculty registry? This change will be queued and auto-synced across all connected devices.`}
            </p>

            {/* Cascading Options */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteSchedules}
                  onChange={e => setDeleteSchedules(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {isKhmer
                        ? `លុបកាលវិភាគបង្រៀនរបស់គ្រូនេះផងដែរ (${teacherSchedules.length} វេនបង្រៀន)`
                        : `Also remove associated timetable class schedules (${teacherSchedules.length} classes)`}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isKhmer
                      ? 'ដកស្រង់កាលវិភាគចេញពីកាលវិភាគប្រចាំសប្តាហ៍ និងប្រចាំខែដើម្បីការពារម៉ោងទំនេរ'
                      : 'Cleans up class timetable slots assigned to this instructor'}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteUserAccount}
                  onChange={e => setDeleteUserAccount(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {isKhmer
                        ? 'លុបគណនីចូលប្រព័ន្ធ (PIN & Staff Login)'
                        : 'Also remove login credentials / PIN account'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isKhmer
                      ? 'បិទគណនីចូលប្រើរបស់គ្រូនេះទាំងស្រុង'
                      : 'Prevents future sign-ins with this teacher’s credentials'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {isKhmer ? 'បោះបង់' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isDeleting
                ? (isKhmer ? 'កំពុងលុប...' : 'Deleting...')
                : (isKhmer ? 'លុបគ្រូចេញ' : 'Confirm Delete Teacher')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
