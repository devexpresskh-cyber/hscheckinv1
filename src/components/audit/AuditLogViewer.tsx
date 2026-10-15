import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AuditLog } from '../../types/index.ts';
import {
  History,
  Search,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { language, t } = useLanguage();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');

  // Clear modal and processing states
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Subscribe to storage changes so logs reflect real-time updates
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setAuditLogs(StorageService.getAuditLogs());
    });
    return () => unsub();
  }, []);

  // Admin access check: Super Admin, Admin/HR, or user with audit.clear permission
  const canClearLogs = Boolean(
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin_hr' ||
    hasPermission('audit.clear')
  );

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (selectedRole !== 'All' && log.userRole !== selectedRole) return false;
      if (selectedAction !== 'All' && !log.action.includes(selectedAction)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchTarget = (log.target || '').toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchTarget) return false;
      }
      return true;
    });
  }, [auditLogs, selectedRole, selectedAction, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User Name', 'Role', 'Action', 'Target', 'New Value', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      `"${l.userName}"`,
      l.userRole,
      `"${l.action}"`,
      `"${l.target || ''}"`,
      `"${l.newValue || ''}"`,
      l.ipAddress || '127.0.0.1'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduTrack_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'km' ? 'បានទាញយកឯកសារ CSV ដោយជោគជ័យ' : 'Exported audit trail to CSV', 'info');
  };

  const handleConfirmClear = async () => {
    if (!canClearLogs) {
      showToast(language === 'km' ? 'អ្នកគ្មានសិទ្ធិសម្អាតកំណត់ត្រានេះទេ' : 'You do not have permission to clear audit logs', 'error');
      return;
    }

    setIsClearing(true);
    try {
      const count = await StorageService.clearAllAuditLogs();
      setIsClearModalOpen(false);
      showToast(
        language === 'km'
          ? `បានសម្អាតកំណត់ត្រាសវនកម្ម ${count} ដោយជោគជ័យ`
          : `Successfully cleared ${count} audit log records`,
        'success'
      );
    } catch (err) {
      console.error('Error clearing audit logs:', err);
      showToast(
        language === 'km'
          ? 'មានបញ្ហាក្នុងការសម្អាតកំណត់ត្រាសវនកម្ម'
          : 'Failed to clear audit logs',
        'error'
      );
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteSingleLog = async (id: string) => {
    if (!canClearLogs) return;
    setDeletingId(id);
    try {
      await StorageService.deleteAuditLog(id);
      showToast(
        language === 'km'
          ? 'បានលុបកំណត់ត្រានេះរួចរាល់'
          : 'Audit record deleted',
        'info'
      );
    } catch (err) {
      console.error('Error deleting log:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t('audit.title')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  {auditLogs.length} {language === 'km' ? 'កំណត់ត្រា' : 'records'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-khmer mt-0.5">
                {t('audit.desc')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Admin Clear Audit Logs Button */}
          {canClearLogs && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              disabled={auditLogs.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                auditLogs.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 active:scale-95'
              }`}
              title={language === 'km' ? 'សម្អាតកំណត់ត្រាសវនកម្មទាំងអស់' : 'Clear all audit logs'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('audit.clearLogs')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'ទាញយក CSV' : 'Export Audit Trail'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'km' ? 'ស្វែងរកសកម្មភាព ឬឈ្មោះអ្នកប្រើ...' : 'Search action, target or user name...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="All">{language === 'km' ? 'គ្រប់តួនាទី (All Roles)' : 'All Roles'}</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin / HR">Admin / HR</option>
            <option value="Department Manager">Department Manager</option>
            <option value="Teacher">Teacher</option>
            <option value="Employee">Employee</option>
          </select>

          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="All">{language === 'km' ? 'គ្រប់ប្រភេទសកម្មភាព (All Actions)' : 'All Action Types'}</option>
            <option value="Check-in">Check-in</option>
            <option value="Check-out">Check-out</option>
            <option value="Correction">Correction</option>
            <option value="Absence">Absence Scanner</option>
            <option value="Schedule">Schedule</option>
            <option value="Teacher">Teacher Profile</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{language === 'km' ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Timestamp'}</th>
                <th className="py-3 px-4">{language === 'km' ? 'អ្នកប្រើ & តួនាទី' : 'User & Role'}</th>
                <th className="py-3 px-4">{language === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                <th className="py-3 px-4">{language === 'km' ? 'ទិន្នន័យគោលដៅ' : 'Target / Entity'}</th>
                <th className="py-3 px-4">{language === 'km' ? 'ព័ត៌មានលម្អិត' : 'Details / Value'}</th>
                <th className="py-3 px-4 text-right">{language === 'km' ? 'IP Address' : 'IP Address'}</th>
                {canClearLogs && (
                  <th className="py-3 px-4 text-center w-16">{language === 'km' ? 'លុប' : 'Action'}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={canClearLogs ? 7 : 6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-semibold text-slate-500">
                        {auditLogs.length === 0
                          ? (language === 'km' ? 'កំណត់ត្រាសវនកម្មស្អាត (គ្មានទិន្នន័យ)' : 'Audit trail is clean (no logs recorded)')
                          : (language === 'km' ? 'មិនមានកំណត់ត្រាត្រូវនឹងការស្វែងរកទេ' : 'No audit records match your filters')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-slate-900 block">{log.userName}</span>
                      <span className="text-[10px] text-indigo-700 font-bold block">{log.userRole}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.target || '—'}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono max-w-xs truncate" title={log.newValue || log.previousValue || ''}>
                      {log.newValue || log.previousValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    {canClearLogs && (
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleLog(log.id)}
                          disabled={deletingId === log.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={language === 'km' ? 'លុបកំណត់ត្រានេះ' : 'Delete this record'}
                        >
                          {deletingId === log.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Audit Logs */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => !isClearing && setIsClearModalOpen(false)}
                  disabled={isClearing}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {t('audit.clearConfirmTitle')}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-khmer">
                  {t('audit.clearConfirmDesc')}
                </p>
              </div>

              {/* Summary Stats Box */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {language === 'km' ? 'ចំនួនកំណត់ត្រាត្រូវសម្អាត៖' : 'Total records to purge:'}
                </span>
                <span className="font-extrabold text-rose-600 font-mono">
                  {auditLogs.length} {language === 'km' ? 'កំណត់ត្រា' : 'records'}
                </span>
              </div>

              {/* Admin identity badge */}
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  {language === 'km' ? 'អនុវត្តដោយ៖' : 'Performed by:'}{' '}
                  <strong className="text-slate-700">{currentUser?.fullName}</strong> ({currentUser?.role})
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {t('btn.cancel')}
              </button>

              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'km' ? 'កំពុងសម្អាត...' : 'Clearing...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'បាទ/ចាស សម្អាតទាំងអស់' : 'Confirm & Clear All'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

