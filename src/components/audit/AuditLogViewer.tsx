import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  ShieldCheck,
  User,
  Clock
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');

  const auditLogs = StorageService.getAuditLogs();

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
    showToast('Exported audit trail to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-slate-800" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Audit & Compliance Log
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            កំណត់ត្រាសកម្មភាពសំខាន់ៗ ការកែប្រែទិន្នន័យ និងការការពារសុវត្ថិភាពប្រព័ន្ធ
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Trail</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search action, target or user name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="All">All Roles</option>
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
            <option value="All">All Action Types</option>
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
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target / Entity</th>
                <th className="py-3 px-4">Details / Value</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records match your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
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
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono max-w-xs truncate">
                      {log.newValue || log.previousValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
