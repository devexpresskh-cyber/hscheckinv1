import React, { useState } from 'react';
import { AttendanceCorrectionRequest, AttendanceRecord } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { X, Clock, FileText } from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: AttendanceCorrectionRequest) => void;
  targetRecord?: AttendanceRecord | null;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  targetRecord
}) => {
  const { currentUser } = useAuth();

  const [date, setDate] = useState<string>(
    targetRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [requestedCheckIn, setRequestedCheckIn] = useState<string>(
    targetRecord?.checkInTime || '07:30'
  );
  const [requestedCheckOut, setRequestedCheckOut] = useState<string>(
    targetRecord?.checkOutTime || '11:30'
  );
  const [reason, setReason] = useState<string>('');
  const [supportingNote, setSupportingNote] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const request: AttendanceCorrectionRequest = {
      id: `corr-${Date.now()}`,
      attendanceId: targetRecord?.id,
      personId: targetRecord?.personId || currentUser.personId || currentUser.id,
      personName: targetRecord?.personName || currentUser.fullName,
      department: targetRecord?.department || currentUser.department,
      date: date,
      requestedCheckIn: requestedCheckIn,
      requestedCheckOut: requestedCheckOut,
      reason: reason,
      supportingNote: supportingNote,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    onSubmit(request);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Request Attendance Correction</h3>
            <p className="text-xs text-slate-400">
              Submit adjusted clock times for supervisor or HR review
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Name & Department
            </label>
            <input
              type="text"
              disabled
              value={`${targetRecord?.personName || currentUser.fullName} (${targetRecord?.department || currentUser.department})`}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
            />
            {targetRecord?.subject && (
              <div className="mt-1.5 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center justify-between">
                <span>
                  <strong className="font-bold">{targetRecord.subject}</strong> ({targetRecord.gradeClass} • {targetRecord.room})
                </span>
                {targetRecord.periodName && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold text-[10px]">
                    {targetRecord.periodName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requested In
              </label>
              <input
                type="time"
                value={requestedCheckIn}
                onChange={e => setRequestedCheckIn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requested Out
              </label>
              <input
                type="time"
                value={requestedCheckOut}
                onChange={e => setRequestedCheckOut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Adjustment *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Biometric reader was offline; official off-campus school assignment; technical network issue"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supporting Reference / Note (Optional)
            </label>
            <input
              type="text"
              value={supportingNote}
              onChange={e => setSupportingNote(e.target.value)}
              placeholder="e.g. Verified by Front Desk Officer Mao Sopheap"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30"
            >
              Submit Request
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
