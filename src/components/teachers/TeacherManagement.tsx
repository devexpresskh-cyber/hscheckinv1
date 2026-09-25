import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { Teacher, AttendanceRecord, TeacherSubjectSchedule, Department } from '../../types/index.ts';
import { TeacherModal } from './TeacherModal.tsx';
import { ImportTeacherModal } from './ImportTeacherModal.tsx';
import { MonSatWeeklyTimetable } from '../schedules/MonSatWeeklyTimetable.tsx';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Send,
  MoreVertical,
  Calendar,
  CalendarDays,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Clock,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const TeacherManagement: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'joinDate'>('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForHistory, setSelectedTeacherForHistory] = useState<Teacher | null>(null);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<Teacher | null>(null);
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() => StorageService.getSubjectSchedules());
  const [teachers, setTeachers] = useState<Teacher[]>(() => StorageService.getTeachers());
  const [departments, setDepartments] = useState<Department[]>(() => StorageService.getDepartments());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers());
      setDepartments(StorageService.getDepartments());
      setSubjectSchedules(StorageService.getSubjectSchedules());
    });
    return unsub;
  }, []);

  const attendanceList = StorageService.getAttendance();

  // Filter & Sort
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter(t => {
        // Supervisor department restriction
        if (!canAccessDepartment(t.department)) return false;
        // Dept dropdown
        if (selectedDept !== 'All' && t.department !== selectedDept) return false;
        // Status dropdown
        if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.fullName.toLowerCase().includes(q);
          const matchKhmer = (t.khmerName || '').toLowerCase().includes(q);
          const matchId = t.teacherId.toLowerCase().includes(q);
          const matchSub = t.subject.toLowerCase().includes(q);
          const matchPhone = t.phone.toLowerCase().includes(q);
          if (!matchName && !matchKhmer && !matchId && !matchSub && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'id') return a.teacherId.localeCompare(b.teacherId);
        if (sortBy === 'joinDate') return b.joinDate.localeCompare(a.joinDate);
        return 0;
      });
  }, [teachers, canAccessDepartment, selectedDept, selectedStatus, searchQuery, sortBy]);

  const handleSaveTeacher = (teacher: Teacher) => {
    if (editingTeacher) {
      StorageService.updateTeacher(teacher.id, teacher);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Updated Teacher Profile',
        target: `${teacher.fullName} (${teacher.teacherId})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Updated teacher ${teacher.fullName}`, 'success');
    } else {
      StorageService.addTeacher(teacher);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Created Teacher Profile',
        target: `${teacher.fullName} (${teacher.teacherId})`,
        ipAddress: '127.0.0.1'
      });
      showToast(`Added teacher ${teacher.fullName}`, 'success');
    }
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove teacher ${name}?`)) {
      StorageService.deleteTeacher(id);
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Deleted Teacher Profile',
        target: name,
        ipAddress: '127.0.0.1'
      });
      showToast(`Removed teacher ${name}`, 'info');
    }
  };

  const handleSendScheduleReminder = (teacher: Teacher) => {
    TelegramService.sendScheduleReminder(
      teacher.fullName,
      '07:30',
      teacher.assignedLocation,
      teacher.department
    );
    showToast(`Dispatched schedule reminder to ${teacher.fullName} via Telegram`, 'success');
  };

  const handleExportCSV = () => {
    const headers = ['Teacher ID', 'Employee ID', 'Full Name', 'Khmer Name', 'Department', 'Position', 'Subject', 'Status', 'Phone', 'Email', 'Telegram ID', 'Join Date'];
    const rows = filteredTeachers.map(t => [
      t.teacherId,
      t.employeeId,
      `"${t.fullName}"`,
      `"${t.khmerName || ''}"`,
      `"${t.department}"`,
      `"${t.position}"`,
      `"${t.subject}"`,
      t.status,
      t.phone,
      t.email,
      t.telegramChatId || '',
      t.joinDate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduTrack_Teachers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported teachers roster to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Teacher Faculty Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-khmer mt-0.5">
            ការគ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន កាលវិភាគ និងប្រវត្តិនៃការបង្រៀន
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {hasPermission('teachers.create') && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Teachers (CSV)</span>
            </button>
          )}

          {hasPermission('teachers.create') && (
            <button
              onClick={() => {
                setEditingTeacher(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, subject, phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="id">Sort: Teacher ID</option>
            <option value="joinDate">Sort: Newest Join Date</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">ID & Subject</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Contact & Telegram</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No teachers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(teacher => {
                  const statusColors = {
                    Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    'On Leave': 'bg-purple-100 text-purple-800 border-purple-200',
                    Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
                    Resigned: 'bg-rose-100 text-rose-800 border-rose-200'
                  }[teacher.status] || 'bg-slate-100 text-slate-700';

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Teacher Profile & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={teacher.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {teacher.fullName}
                            </span>
                            {teacher.khmerName && (
                              <span className="text-[11px] text-slate-500 font-khmer">
                                {teacher.khmerName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ID & Subject */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {teacher.teacherId}
                        </span>
                        <span className="text-[11px] text-indigo-700 font-semibold block">
                          {teacher.subject}
                        </span>
                        <span className="inline-block mt-0.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          {teacher.currency === 'KHR' ? '៛' : '$'}{(teacher.hourlyRate ?? 20).toFixed(2)}/hr
                        </span>
                      </td>

                      {/* Department & Position */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {teacher.department}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {teacher.position}
                        </span>
                      </td>

                      {/* Contact & Telegram */}
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{teacher.phone}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{teacher.email}</span>
                        </div>
                        {teacher.telegramChatId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                            <Send className="w-2.5 h-2.5 text-sky-500" /> TG #{teacher.telegramChatId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No Telegram</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors}`}>
                          {teacher.status}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {teacher.assignedLocation}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Mon-Sat Weekly Schedule */}
                          <button
                            onClick={() => {
                              setSubjectSchedules(StorageService.getSubjectSchedules());
                              setSelectedTeacherForSchedule(teacher);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Mon-Sat Weekly Schedule"
                          >
                            <CalendarDays className="w-4 h-4 text-indigo-600" />
                          </button>

                          {/* View Attendance History */}
                          <button
                            onClick={() => setSelectedTeacherForHistory(teacher)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="View Attendance History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Telegram Reminder */}
                          <button
                            onClick={() => handleSendScheduleReminder(teacher)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Send Telegram Reminder"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Edit Teacher */}
                          {hasPermission('teachers.edit') && (
                            <button
                              onClick={() => {
                                setEditingTeacher(teacher);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Teacher */}
                          {hasPermission('teachers.delete') && (
                            <button
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.fullName)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredTeachers.length} of {teachers.length} teachers</span>
          <span>Department scoped according to your role permission</span>
        </div>
      </div>

      {/* Modal for Add / Edit */}
      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTeacher(null);
        }}
        onSave={handleSaveTeacher}
        initialTeacher={editingTeacher}
      />

      {/* Drawer: Individual Teacher Attendance History */}
      {selectedTeacherForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedTeacherForHistory.photoUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-300"
                />
                <div>
                  <h3 className="font-bold text-base">{selectedTeacherForHistory.fullName}</h3>
                  <p className="text-xs text-indigo-200 font-khmer">
                    {selectedTeacherForHistory.khmerName} • {selectedTeacherForHistory.teacherId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacherForHistory(null)}
                className="p-1 rounded-xl text-slate-300 hover:text-white hover:bg-indigo-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Attendance Records History
              </h4>

              {(() => {
                const history = attendanceList.filter(
                  a => a.personId === selectedTeacherForHistory.id
                );

                if (history.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No attendance records found for this faculty member yet.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {history.map(item => (
                      <div key={item.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.date}</span>
                          <span className="text-slate-500 text-[11px]">
                            Check-in: <b>{item.checkInTime || 'None'}</b> | Check-out: <b>{item.checkOutTime || 'None'}</b>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border">
                            {item.status}
                          </span>
                          {item.lateMinutes > 0 && (
                            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                              +{item.lateMinutes}m late
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedTeacherForHistory(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Teacher Mon-Sat Weekly Schedule Modal */}
      {selectedTeacherForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Weekly Teaching Timetable (Mon – Sat)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Faculty: <span className="text-white font-semibold">{selectedTeacherForSchedule.fullName}</span> ({selectedTeacherForSchedule.subject} • {selectedTeacherForSchedule.department})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacherForSchedule(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <MonSatWeeklyTimetable
                subjectSchedules={subjectSchedules}
                teachers={[selectedTeacherForSchedule]}
                initialTeacherFilter={selectedTeacherForSchedule.id}
                canEdit={false}
                canDelete={false}
                canCreate={false}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Rate: <span className="font-bold text-slate-800">${selectedTeacherForSchedule.hourlyRate || 25}/hr</span>
              </div>
              <button
                onClick={() => setSelectedTeacherForSchedule(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Close Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Teachers Modal */}
      <ImportTeacherModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingTeachers={teachers}
        onSuccess={(count) => {
          setTeachers(StorageService.getTeachers());
          showToast(`Successfully imported ${count} teachers`, 'success');
        }}
      />

    </div>
  );
};
