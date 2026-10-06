import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { Teacher, AttendanceRecord, TeacherSubjectSchedule, TeacherWageSummary, TeacherClassSessionDetail } from '../../types/index.ts';
import {
  GraduationCap,
  Clock,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Building,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  TrendingUp,
  X,
  Award,
  BookOpen,
  UserCheck,
  ShieldCheck,
  FileCheck,
  CalendarDays
} from 'lucide-react';
import { AcademicDatesModal } from '../schedules/AcademicDatesModal.tsx';

function buildPayslipHtml(
  summary: TeacherWageSummary,
  systemSettings: any,
  periodStr: string,
  lateDeductionMode: 'deduct' | 'non_deduct',
  wageDurationMode: 'full_schedule' | 'actual_scan' = 'full_schedule'
): string {
  const orgName = systemSettings?.organizationName || 'EDUCATION MANAGEMENT SYSTEM';
  const khmerOrgName = systemSettings?.khmerOrgName || '';
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const voucherNo = `VCH-${summary.teacherCode || 'TCH'}-${Date.now().toString().slice(-6)}`;

  const sessionsRows = summary.classSessions.length > 0
    ? summary.classSessions.map((session, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-family: monospace; font-weight: 600;">${session.date}</td>
        <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">
          ${session.subject}
          <div style="font-size: 10px; color: #64748b; font-weight: 400;">${session.gradeClass || ''} ${session.room ? '• ' + session.room : ''}</div>
        </td>
        <td style="padding: 6px 8px; text-align: center; font-family: monospace;">
          ${session.checkInTime ? `${session.checkInTime} - ${session.checkOutTime || 'Ongoing'}` : `<span style="color:#ef4444; font-weight:700;">No Check-in ($0.00)</span>`}
        </td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #2563eb; font-family: monospace;">${session.actualTaughtHours}h</td>
        <td style="padding: 6px 8px; text-align: center; font-family: monospace;">$${session.rateApplied.toFixed(2)}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #047857; font-family: monospace;">$${session.wageEarned.toFixed(2)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 11px;">No check-in punch logs recorded in this period ($0.00 Net Wage).</td></tr>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Payslip Voucher - ${summary.teacherName} - ${periodStr}</title>
      <style>
        @page {
          size: portrait;
          margin: 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Khmer OS", "Khmer OS Battambang";
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
        }
        .voucher-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #0f172a;
          padding: 20px 24px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .org-name {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin: 0;
        }
        .khmer-org {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 2px 0 0 0;
        }
        .voucher-title {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          color: #047857;
          letter-spacing: 1px;
          margin-top: 6px;
        }
        .meta-strip {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          margin-bottom: 16px;
        }
        .meta-item strong {
          color: #0f172a;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 12px 14px;
          border-radius: 6px;
        }
        .profile-table {
          width: 100%;
          font-size: 11px;
          border-collapse: collapse;
        }
        .profile-table td {
          padding: 3px 0;
        }
        .rate-box {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          background: #f8fafc;
        }
        .kpi-title {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
        }
        .kpi-val {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
          font-family: monospace;
        }
        .net-banner {
          background: #047857;
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .sessions-table th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 800;
          color: #334155;
        }
        .sessions-table td {
          border: 1px solid #e2e8f0;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          text-align: center;
          margin-top: 24px;
          padding-top: 12px;
          page-break-inside: avoid;
        }
        .sig-line {
          height: 55px;
          border-bottom: 1px solid #0f172a;
          margin-bottom: 6px;
        }
        .sig-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
        }
        .sig-sub {
          font-size: 9px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="voucher-container">
        <div class="header">
          <div class="org-name">${orgName}</div>
          ${khmerOrgName ? `<div class="khmer-org">${khmerOrgName}</div>` : ''}
          <div class="voucher-title">TEACHER TEACHING COMPENSATION PAYSLIP VOUCHER</div>
          <div style="font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px;">
            ប័ណ្ណទូទាត់ប្រាក់ឈ្នួលបង្រៀនគ្រូផ្លូវការ
          </div>
        </div>

        <div class="meta-strip">
          <div class="meta-item"><strong>Voucher No:</strong> <span style="font-family: monospace;">${voucherNo}</span></div>
          <div class="meta-item"><strong>Period:</strong> ${periodStr}</div>
          <div class="meta-item"><strong>Wage Basis:</strong> ${wageDurationMode === 'full_schedule' ? 'Full Schedule (Only Checked-in Sessions Credited)' : 'Actual Scan Punch'}</div>
          <div class="meta-item"><strong>Academic Year:</strong> ${systemSettings?.academicYear || '2026-2027'}${systemSettings?.academicStartDate && systemSettings?.academicEndDate ? ` (${systemSettings.academicStartDate} to ${systemSettings.academicEndDate})` : ''}</div>
          <div class="meta-item"><strong>Date Issued:</strong> ${currentDate}</div>
        </div>

        <div class="profile-grid">
          <div>
            <table class="profile-table">
              <tr>
                <td style="width: 110px; color: #64748b; font-weight: 600;">Teacher Name:</td>
                <td style="font-weight: 800; font-size: 13px; color: #0f172a;">${summary.teacherName} ${summary.khmerName ? `(${summary.khmerName})` : ''}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 600;">Faculty ID / Code:</td>
                <td style="font-family: monospace; font-weight: 700;">${summary.teacherCode}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 600;">Department:</td>
                <td>${summary.department}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 600;">Position / Title:</td>
                <td>${summary.position} • ${summary.employmentType}</td>
              </tr>
            </table>
          </div>
          <div class="rate-box">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Hourly Rate</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 3px;">
              $${summary.hourlyRate.toFixed(2)} <span style="font-size: 11px; font-weight: 600; color: #64748b;">/hr</span>
            </div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-title">Classes Delivered</div>
            <div class="kpi-val">${summary.totalCompletedClasses} / ${summary.totalScheduledClasses}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Taught Hours</div>
            <div class="kpi-val" style="color: #2563eb;">${summary.completedHours.toFixed(1)} hrs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Gross Earnings</div>
            <div class="kpi-val">$${summary.grossWage.toFixed(2)}</div>
          </div>
          <div class="kpi-card" style="${lateDeductionMode === 'deduct' && summary.lateDeductions > 0 ? 'background: #fff1f2; border-color: #fecdd3;' : ''}">
            <div class="kpi-title">Late Deduction</div>
            <div class="kpi-val" style="${lateDeductionMode === 'deduct' && summary.lateDeductions > 0 ? 'color: #e11d48;' : 'color: #059669;'}">
              ${lateDeductionMode === 'deduct' && summary.lateDeductions > 0 ? `-$${summary.lateDeductions.toFixed(2)}` : '$0.00'}
            </div>
            <div style="font-size: 8px; color: #64748b;">${summary.totalLateMinutes} mins late</div>
          </div>
        </div>

        <div class="net-banner">
          <div>
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">
              Net Compensation Payable / ប្រាក់ឈ្នួលត្រូវបើកសុទ្ធ
            </div>
            <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">
              ${lateDeductionMode === 'deduct' ? 'Net after prorated tardiness deduction' : 'Full compensation (late penalty waived policy)'}
            </div>
          </div>
          <div style="font-size: 26px; font-weight: 900; font-family: monospace;">
            $${summary.netWage.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </div>
        </div>

        <div style="margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1e293b;">
          Itemized Teaching Sessions Log (${summary.classSessions.length} classes recorded)
        </div>

        <table class="sessions-table">
          <thead>
            <tr>
              <th style="width: 32px;">No.</th>
              <th style="width: 75px;">Date</th>
              <th>Subject & Class</th>
              <th style="width: 120px;">Actual Scan</th>
              <th style="width: 60px;">Hours</th>
              <th style="width: 65px;">Rate</th>
              <th style="width: 75px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sessionsRows}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line"></div>
            <div class="sig-title">Prepared by (HR / Payroll)</div>
            <div class="sig-sub">អ្នករៀបចំ</div>
          </div>
          <div>
            <div class="sig-line"></div>
            <div class="sig-title">Academic Director</div>
            <div class="sig-sub">ប្រធានដេប៉ាតឺម៉ង់ / នាយកសិក្សា</div>
          </div>
          <div>
            <div class="sig-line"></div>
            <div class="sig-title">Teacher Acknowledgment</div>
            <div class="sig-sub">ហត្ថលេខាគ្រូទទួល</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface TeachingWageReportProps {
  lockedTeacherId?: string;
}

export const TeachingWageReport: React.FC<TeachingWageReportProps> = ({ lockedTeacherId }) => {
  const { canAccessDepartment, currentUser } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  const isTeacherRole = currentUser.role === 'teacher';
  const effectiveTeacherId = lockedTeacherId || (isTeacherRole ? (currentUser.personId || currentUser.id) : undefined);

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lateDeductionMode, setLateDeductionMode] = useState<'deduct' | 'non_deduct'>('non_deduct');
  const [wageDurationMode, setWageDurationMode] = useState<'full_schedule' | 'actual_scan'>(() => {
    return systemSettings?.teachingWageDurationMode || 'full_schedule';
  });
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherWageSummary | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isAcademicDatesModalOpen, setIsAcademicDatesModalOpen] = useState(false);

  const canEditAcademicDates =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'supervisor';

  const departments = StorageService.getDepartments();
  const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
  const allAttendance = StorageService.getAttendance();
  const subjectSchedules = StorageService.getSubjectSchedules();

  // Helper: Convert time "07:30" to minutes
  const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    if (effectiveTeacherId || isTeacherRole) {
      const match = teachers.find(t => 
        (effectiveTeacherId && (t.id === effectiveTeacherId || t.teacherId.toLowerCase() === effectiveTeacherId.toLowerCase())) ||
        (currentUser.personId && (t.id === currentUser.personId || t.teacherId.toLowerCase() === currentUser.personId.toLowerCase())) ||
        t.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (match) return [match];
      if (teachers.length > 0) return [teachers[0]];
    }

    return teachers.filter(t => {
      if (!canAccessDepartment(t.department)) return false;
      if (selectedDept !== 'All' && t.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.fullName.toLowerCase().includes(q) ||
          t.khmerName?.toLowerCase().includes(q) ||
          t.teacherId.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, selectedDept, searchQuery, canAccessDepartment, effectiveTeacherId, isTeacherRole, currentUser]);

  // Calculate Teaching Wage Summaries
  const wageSummaries: TeacherWageSummary[] = useMemo(() => {
    return filteredTeachers.map(teacher => {
      const baseHourlyRate = teacher.hourlyRate || 20;
      const currency = teacher.currency || 'USD';

      // Filter attendance records in date window
      const teacherRecords = allAttendance.filter(att => {
        if (att.personId !== teacher.id) return false;
        if (dateFilterMode === 'month') {
          return att.date.startsWith(selectedMonth);
        } else {
          return att.date >= startDate && att.date <= endDate;
        }
      });

      // Filter subject periods (classes)
      const subjectRecords = teacherRecords.filter(r => Boolean(r.subjectScheduleId || r.subject || r.personType === 'teacher'));

      let totalScheduledClasses = subjectRecords.length;
      let totalCompletedClasses = 0;
      let totalMissedClasses = 0;
      let totalLateClasses = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;
      let scheduledHours = 0;
      let completedHours = 0;
      let grossWage = 0;

      const classSessions: TeacherClassSessionDetail[] = [];

      subjectRecords.forEach(rec => {
        const scheduleRef = subjectSchedules.find(s => s.id === rec.subjectScheduleId);
        const rateApplied = scheduleRef?.hourlyRate || baseHourlyRate;

        // Calculate scheduled duration
        const schedStart = rec.scheduledStart || scheduleRef?.startTime || '08:00';
        const schedEnd = rec.scheduledEnd || scheduleRef?.endTime || '09:00';
        const schedStartMins = timeToMinutes(schedStart);
        const schedEndMins = timeToMinutes(schedEnd);
        const schedDurationMinutes = Math.max(0, schedEndMins - schedStartMins) || 60;
        const schedDurationHours = schedDurationMinutes / 60;
        scheduledHours += schedDurationHours;

        // Calculate actual / credited taught duration
        let actualTaughtHours = 0;
        // Teacher's Net Wage ($) Full Schedule is ONLY if they have checked in!
        const hasCheckedIn = Boolean(rec.checkInTime && rec.checkInTime.trim().length > 0) && rec.status !== 'Absent';

        if (wageDurationMode === 'full_schedule') {
          // Full schedule duration charge wage policy:
          // Teacher's Net Wage ($) Full Schedule is ONLY earned for sessions with verified check-in
          // (e.g. teacher's schedule start 8:00 end 9:00 = 1h and Rate is 5.5
          // but teacher scan late or overtime checkout just set Gross Wage = 1 h * 5.5$)
          if (hasCheckedIn) {
            actualTaughtHours = schedDurationHours;
            totalCompletedClasses++;
          } else {
            actualTaughtHours = 0;
            totalMissedClasses++;
          }
        } else {
          // Actual scan punch calculation mode (also requires verified check-in)
          if (hasCheckedIn && rec.checkOutTime) {
            const inMins = timeToMinutes(rec.checkInTime);
            const outMins = timeToMinutes(rec.checkOutTime);
            const actualDurationMinutes = Math.max(0, outMins - inMins);
            // Credit up to scheduled duration plus minor overtime
            actualTaughtHours = Math.min(schedDurationHours + 0.5, actualDurationMinutes / 60);
            totalCompletedClasses++;
          } else if (hasCheckedIn && (rec.status === 'Present' || rec.status === 'Late')) {
            // In session or single punch, credit scheduled duration
            actualTaughtHours = schedDurationHours;
            totalCompletedClasses++;
          } else {
            actualTaughtHours = 0;
            totalMissedClasses++;
          }
        }

        completedHours += actualTaughtHours;

        if (hasCheckedIn && (rec.status === 'Late' || (rec.lateMinutes && rec.lateMinutes > 0))) {
          totalLateClasses++;
          totalLateMinutes += rec.lateMinutes || 0;
        }

        if (hasCheckedIn) {
          totalOvertimeMinutes += rec.overtimeMinutes || 0;
        }

        const sessionWage = actualTaughtHours * rateApplied;
        grossWage += sessionWage;

        classSessions.push({
          attendanceId: rec.id,
          date: rec.date,
          subject: rec.subject || scheduleRef?.subject || 'Class Period',
          khmerSubject: rec.khmerSubject || scheduleRef?.khmerSubject,
          subjectCode: rec.subjectCode || scheduleRef?.subjectCode || '',
          gradeClass: rec.gradeClass || scheduleRef?.gradeClass || 'General',
          room: rec.room || scheduleRef?.room || 'Main Classroom',
          periodName: rec.periodName || scheduleRef?.periodName || 'Class Session',
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          scheduledDurationHours: Number(schedDurationHours.toFixed(2)),
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          actualTaughtHours: Number(actualTaughtHours.toFixed(2)),
          status: rec.status,
          lateMinutes: rec.lateMinutes || 0,
          rateApplied,
          wageEarned: Number(sessionWage.toFixed(2)),
          wageCalculationBasis: wageDurationMode
        });
      });

      // If no recorded attendance records exist yet for this teacher in this cycle:
      // Reflect timetable scheduled hours, but STRICTLY 0 hours and $0 wage because teacher has NOT checked in!
      if (subjectRecords.length === 0) {
        const assignedSubjects = subjectSchedules.filter(s => s.teacherId === teacher.id && s.isActive);
        const estWeeklyHours = assignedSubjects.reduce((sum, s) => {
          const sStart = timeToMinutes(s.startTime);
          const sEnd = timeToMinutes(s.endTime);
          const daysCount = s.daysOfWeek ? s.daysOfWeek.length : 1;
          return sum + ((sEnd - sStart) / 60) * daysCount;
        }, 0);

        // Baseline scheduled hours
        const estMonthHours = estWeeklyHours * 4;
        scheduledHours = Number(estMonthHours.toFixed(1));
        totalScheduledClasses = assignedSubjects.length * 4;
        // Strictly $0.00 wage and 0 completed hours if no verified check-in
        completedHours = 0;
        totalCompletedClasses = 0;
        totalMissedClasses = totalScheduledClasses;
        grossWage = 0;
      }

      const completionRate = totalScheduledClasses > 0
        ? Math.round((totalCompletedClasses / totalScheduledClasses) * 100)
        : 0;

      const punctualityRate = totalCompletedClasses > 0
        ? Math.round(((totalCompletedClasses - totalLateClasses) / totalCompletedClasses) * 100)
        : 100;

      const lateDeduction = lateDeductionMode === 'deduct'
        ? Number(((totalLateMinutes / 60) * baseHourlyRate).toFixed(2))
        : 0;

      const netWage = Math.max(0, grossWage - lateDeduction);

      return {
        teacherId: teacher.id,
        teacherCode: teacher.teacherId,
        teacherName: teacher.fullName,
        khmerName: teacher.khmerName,
        photoUrl: teacher.photoUrl,
        department: teacher.department,
        position: teacher.position,
        employmentType: teacher.employmentType,
        hourlyRate: baseHourlyRate,
        currency,
        totalScheduledClasses,
        totalCompletedClasses,
        totalMissedClasses,
        totalLateClasses,
        totalLateMinutes,
        totalOvertimeMinutes,
        scheduledHours: Number(scheduledHours.toFixed(1)),
        completedHours: Number(completedHours.toFixed(1)),
        completionRate,
        punctualityRate,
        grossWage: Number(grossWage.toFixed(2)),
        lateDeductions: Number(lateDeduction.toFixed(2)),
        netWage: Number(netWage.toFixed(2)),
        wageDurationMode,
        classSessions
      };
    });
  }, [filteredTeachers, allAttendance, subjectSchedules, selectedMonth, dateFilterMode, startDate, endDate, lateDeductionMode, wageDurationMode]);

  // Overall Aggregate KPIs
  const overallKPIs = useMemo(() => {
    const totalFaculty = wageSummaries.length;
    const totalHours = wageSummaries.reduce((sum, s) => sum + s.completedHours, 0);
    const totalGrossWage = wageSummaries.reduce((sum, s) => sum + s.grossWage, 0);
    const totalLateDeductions = wageSummaries.reduce((sum, s) => sum + s.lateDeductions, 0);
    const totalWage = wageSummaries.reduce((sum, s) => sum + s.netWage, 0);
    const totalClasses = wageSummaries.reduce((sum, s) => sum + s.totalCompletedClasses, 0);
    const avgRate = totalFaculty > 0
      ? wageSummaries.reduce((sum, s) => sum + s.hourlyRate, 0) / totalFaculty
      : 0;
    const avgCompletion = totalFaculty > 0
      ? wageSummaries.reduce((sum, s) => sum + s.completionRate, 0) / totalFaculty
      : 100;

    return {
      totalFaculty,
      totalHours: Number(totalHours.toFixed(1)),
      totalGrossWage: Number(totalGrossWage.toFixed(2)),
      totalLateDeductions: Number(totalLateDeductions.toFixed(2)),
      totalWage: Number(totalWage.toFixed(2)),
      totalClasses,
      avgRate: Number(avgRate.toFixed(2)),
      avgCompletion: Math.round(avgCompletion)
    };
  }, [wageSummaries]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Teacher ID',
      'Teacher Full Name',
      'Khmer Name',
      'Department',
      'Employment Type',
      'Hourly Teaching Rate ($/hr)',
      'Scheduled Classes',
      'Completed Classes',
      'Missed Classes',
      'Late Classes',
      'Total Late (Minutes)',
      'Scheduled Hours',
      'Actual Taught Hours',
      'Completion Rate (%)',
      'Punctuality Rate (%)',
      'Gross Wage ($)',
      'Net Payable Wage ($)'
    ];

    const rows = wageSummaries.map(s => [
      s.teacherCode,
      `"${s.teacherName}"`,
      `"${s.khmerName || ''}"`,
      `"${s.department}"`,
      s.employmentType,
      s.hourlyRate.toFixed(2),
      s.totalScheduledClasses,
      s.totalCompletedClasses,
      s.totalMissedClasses,
      s.totalLateClasses,
      s.totalLateMinutes,
      s.scheduledHours.toFixed(1),
      s.completedHours.toFixed(1),
      `${s.completionRate}%`,
      `${s.punctualityRate}%`,
      s.grossWage.toFixed(2),
      s.netWage.toFixed(2)
    ]);

    const periodLabel = dateFilterMode === 'month' ? selectedMonth : `${startDate}_to_${endDate}`;
    const metaRows = [
      `# Organization: "${systemSettings.organizationName || 'EduTrack MIS'}"`,
      `# Academic Year: "${systemSettings.academicYear || '2026-2027'} (${systemSettings.academicStartDate || ''} to ${systemSettings.academicEndDate || ''})"`,
      `# Payroll Period: "${periodLabel}"`,
      `# Wage Charging Basis: "${wageDurationMode === 'full_schedule' ? 'Full Schedule Duration (100% Scheduled Hours Charged)' : 'Actual Scan Punch Duration'}"`,
      `# Generated Date: "${new Date().toISOString()}"`,
      ''
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [...metaRows, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Teaching_Hours_Wage_Report_${periodLabel}_AY${systemSettings.academicYear || '2026-2027'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported teaching hours and wage report to CSV', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintPayslip = () => {
    if (!selectedTeacherForDetail) return;
    const periodStr = dateFilterMode === 'month' ? selectedMonth : `${startDate} to ${endDate}`;

    try {
      let iframe = document.getElementById('payslip-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'payslip-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);
      }

      const voucherHtml = buildPayslipHtml(
        selectedTeacherForDetail,
        systemSettings,
        periodStr,
        lateDeductionMode,
        wageDurationMode
      );

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(voucherHtml);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 250);
        return;
      }
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print():', e);
    }

    // Direct fallback
    document.body.classList.add('printing-payslip-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-payslip-active');
    }, 1200);
  };

  const openTeacherDetail = (summary: TeacherWageSummary) => {
    setSelectedTeacherForDetail(summary);
    setIsPayslipModalOpen(true);
  };

  return (
    <div className="space-y-6 print:space-y-0 main-report-container">
      
      {/* Header & Controls (Screen only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isKhmer ? 'របាយការណ៍ម៉ោងបង្រៀន និងប្រាក់ឈ្នួលគ្រូ' : 'Teaching Hours & Wage Summary Report'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-500 font-khmer">
                  គណនាស្វ័យប្រវត្តិនូវម៉ោងបង្រៀនជាក់ស្តែង និងប្រាក់ឈ្នួលសរុបផ្អែកលើអត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោង
                </p>
                {systemSettings.academicYear && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <GraduationCap className="w-3 h-3 text-emerald-600" />
                    <span>AY {systemSettings.academicYear}</span>
                    {systemSettings.academicStartDate && systemSettings.academicEndDate && (
                      <span className="text-slate-500 font-normal">
                        ({systemSettings.academicStartDate} – {systemSettings.academicEndDate})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canEditAcademicDates && (
            <button
              type="button"
              onClick={() => setIsAcademicDatesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Configure Academic Year start and end dates"
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>Set Academic Dates</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Wage CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Screen only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'គ្រូបង្រៀនសរុប' : 'Teaching Faculty'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {overallKPIs.totalFaculty}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Active monitored teachers
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'ម៉ោងបង្រៀនជាក់ស្តែង' : 'Hours Delivered'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
            {overallKPIs.totalHours} <span className="text-sm font-bold text-slate-400">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {overallKPIs.totalClasses} classes taught
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              {isKhmer ? 'ប្រាក់ឈ្នួលត្រូវបើកសរុប' : 'Total Wage Payable'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            ${overallKPIs.totalWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Avg. ${overallKPIs.avgRate.toFixed(2)}/hr rate
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'អត្រាបំពេញម៉ោង' : 'Completion Rate'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {overallKPIs.avgCompletion}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Classes attended vs scheduled
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Screen only) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateFilterMode === 'month' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
            </div>
          )}

          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Late Wage Deduction Policy Toggle (Deduct Late vs Non-Deduct Late) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 pl-2 pr-1.5 hidden md:inline">
              {isKhmer ? 'កាត់ប្រាក់ម៉ោងយឺត៖' : 'Late Policy:'}
            </span>
            <button
              type="button"
              onClick={() => setLateDeductionMode('non_deduct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                lateDeductionMode === 'non_deduct'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={isKhmer ? 'មិនកាត់ប្រាក់ម៉ោងយឺត (គិតប្រាក់ពេញ)' : 'Non-deduct late: Full compensation without penalties'}
            >
              <span>{isKhmer ? 'មិនកាត់ (Non-Deduct)' : 'Non-Deduct Late'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLateDeductionMode('deduct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                lateDeductionMode === 'deduct'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
              title={isKhmer ? 'កាត់ប្រាក់ម៉ោងយឺតតាមអត្រាកម្រៃបង្រៀន' : 'Deduct late: Prorated deduction based on hourly rate'}
            >
              <span>{isKhmer ? 'កាត់ម៉ោងយឺត (Deduct)' : 'Deduct Late'}</span>
            </button>
          </div>

          {/* Wage Duration Basis Policy Toggle (Full Schedule vs Actual Scan) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 pl-2 pr-1.5 hidden md:inline">
              {isKhmer ? 'គិតកម្រៃបង្រៀន៖' : 'Wage Basis:'}
            </span>
            <button
              type="button"
              onClick={() => setWageDurationMode('full_schedule')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wageDurationMode === 'full_schedule'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={isKhmer ? 'គិតពេញតាមកាលវិភាគ (ស្កេនយឺត ឬលើសម៉ោង ក៏គិត Gross Wage ពេញតាមម៉ោងកាលវិភាគ)' : 'Full schedule duration: 100% scheduled duration charged for delivered sessions'}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${wageDurationMode === 'full_schedule' ? 'text-white' : 'hidden'}`} />
              <span>{isKhmer ? 'ពេញកាលវិភាគ (Full Schedule)' : 'Full Schedule'}</span>
            </button>
            <button
              type="button"
              onClick={() => setWageDurationMode('actual_scan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wageDurationMode === 'actual_scan'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-extrabold'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
              title={isKhmer ? 'គិតតាមម៉ោងស្កេនជាក់ស្តែងតាមម៉ោង Punch In/Out' : 'Actual scan punch duration: Prorated to punch timestamps'}
            >
              <Clock className={`w-3.5 h-3.5 ${wageDurationMode === 'actual_scan' ? 'text-indigo-600' : 'hidden'}`} />
              <span>{isKhmer ? 'ស្កេនជាក់ស្តែង (Actual Scan)' : 'Actual Scan'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teacher, ID or subject..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Full Schedule Active Explanatory Banner */}
      {wageDurationMode === 'full_schedule' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-950">
                {isKhmer ? 'គោលការណ៍គិតប្រាក់កម្រៃពេញកាលវិភាគកំពុងដំណើរការ (Full Schedule Duration Wage Active)៖ ' : 'Full Schedule Duration Wage Active: '}
              </span>
              <span className="text-emerald-800 text-[11px]">
                {isKhmer
                  ? 'ប្រាក់កម្រៃ Net Wage ត្រូវបានគិតពេញតាមកាលវិភាគ សម្រាប់តែម៉ោងបង្រៀនណាដែលមានការស្កេនចូលប៉ុណ្ណោះ (ស្កេនយឺត ឬស្កេនចេញលើសម៉ោង ក៏គិតពេញ ១០០% កាលវិភាគ។ បើមិនស្កេនចូល មិនគិតប្រាក់កម្រៃឡើយ)។'
                  : "Teacher's Net Wage is charged for the full scheduled duration only when checked in (wages credited 100% for checked-in classes even if late scan or overtime checkout; $0 for sessions without check-in)."}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-200 text-emerald-900 font-black text-[10px] uppercase tracking-wide shrink-0 self-start sm:self-auto">
            100% Scheduled Hours Charge
          </span>
        </div>
      )}

      {/* Main Table Container: Standard Form on Admin */}
      <div className="standard-report-wrapper bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Institutional Standard Form Header (Visible on Admin Screen and in Print) */}
        <div className="standard-admin-report-header p-5 sm:p-7 border-b border-slate-200 bg-white">
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="text-xs font-khmer font-bold text-slate-700 tracking-wider">
              ព្រះរាជាណាចក្រកម្ពុជា • ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
              Kingdom of Cambodia • Nation Religion King
            </div>
            <div className="w-16 h-0.5 bg-slate-300 mx-auto my-2 rounded-full" />
            
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {systemSettings.organizationName}
            </h1>
            {systemSettings.khmerOrgName && (
              <p className="text-sm sm:text-base font-khmer font-bold text-slate-800 mt-0.5">
                {systemSettings.khmerOrgName}
              </p>
            )}
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              {isKhmer ? 'ការិយាល័យកិច្ចការគ្រូបង្រៀន និងគណនេយ្យបៀវត្សរ៍' : 'Faculty Affairs, Academic Operations & Payroll Division'}
            </div>
          </div>

          <div className="text-center my-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-khmer tracking-wide">
              តារាងសង្ខេបម៉ោងបង្រៀន និងបើកប្រាក់កម្រៃបង្រៀនគ្រូ
            </h2>
            <h3 className="text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-wider mt-0.5">
              Standard Faculty Teaching Hours & Payroll Compensation Statement
            </h3>
          </div>

          {/* Administrative Reference Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Reference No. (លេខយោង)</span>
              <span className="font-mono font-bold text-slate-800">
                REP-PAY-${dateFilterMode === 'month' ? selectedMonth.replace('-', '') : 'PAY'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Year (ឆ្នាំសិក្សា)</span>
              <span className="font-bold text-slate-800 font-mono">
                {systemSettings.academicYear || '2026-2027'}
              </span>
              {systemSettings.academicStartDate && systemSettings.academicEndDate && (
                <span className="text-[10px] text-slate-500 block font-mono">
                  {systemSettings.academicStartDate} to {systemSettings.academicEndDate}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Payroll Cycle (ការបរិច្ឆេទ)</span>
              <span className="font-bold text-slate-800">
                {dateFilterMode === 'month' ? `Month ${selectedMonth}` : `${startDate} to ${endDate}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Department (ដេប៉ាតឺម៉ង់)</span>
              <span className="font-bold text-slate-800">
                {selectedDept === 'All' ? (isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់ (All)' : 'All Departments') : selectedDept}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Late Policy (គោលការណ៍យឺត)</span>
              <span className={`font-bold ${lateDeductionMode === 'deduct' ? 'text-rose-700' : 'text-indigo-700'}`}>
                {lateDeductionMode === 'deduct' ? 'Deduct Late Mins' : 'Non-Deduct (Full Rate)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Wage Basis (គិតកម្រៃបង្រៀន)</span>
              <span className={`font-bold ${wageDurationMode === 'full_schedule' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                {wageDurationMode === 'full_schedule' ? 'Full Schedule (100%)' : 'Actual Scan Punch'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              {isKhmer ? 'បញ្ជីប្រាក់ឈ្នួលបង្រៀនលម្អិតតាមគ្រូ' : 'Faculty Teaching Wage Breakdown'}
            </h3>
            <p className="text-xs text-slate-400">
              Auto-calculated based on verified check-in/out records and teaching hourly rate
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
            {wageSummaries.length} Teachers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="standard-report-table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center w-12">No. (ល.រ)</th>
                <th className="p-3.5 pl-3">Teacher Profile</th>
                <th className="p-3.5">Department & Subject</th>
                <th className="p-3.5 text-center">Hourly Rate</th>
                <th className="p-3.5 text-center">Classes (Done / Sched)</th>
                <th className="p-3.5 text-center">Taught Hours</th>
                <th className="p-3.5 text-center">Punctuality</th>
                <th className="p-3.5 text-right font-bold text-slate-700">Gross Wage ($)</th>
                <th className="p-3.5 text-center font-bold">Late Deduction</th>
                <th className="p-3.5 text-right font-black text-emerald-800">Net Wage ($)</th>
                <th className="p-3.5 pr-5 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {wageSummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    No teaching records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                wageSummaries.map((summary, idx) => (
                  <tr key={summary.teacherId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Seq # */}
                    <td className="p-3.5 text-center text-slate-400 font-bold font-mono">
                      {idx + 1}
                    </td>

                    {/* Teacher profile */}
                    <td className="p-3.5 pl-3">
                      <div className="flex items-center gap-3">
                        {summary.photoUrl && summary.photoUrl.trim() ? (
                          <img
                            src={summary.photoUrl.trim()}
                            alt={summary.teacherName}
                            className="w-9 h-9 rounded-2xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {summary.teacherName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-black text-slate-900">{summary.teacherName}</div>
                          <div className="text-[10px] text-slate-400 font-khmer">
                            {summary.khmerName || summary.teacherCode} • {summary.teacherCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-3.5">
                      <div className="text-slate-800 font-semibold">{summary.department}</div>
                      <div className="text-[10px] text-slate-400">{summary.position}</div>
                    </td>

                    {/* Hourly rate */}
                    <td className="p-3.5 text-center">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        ${summary.hourlyRate.toFixed(2)}/hr
                      </span>
                    </td>

                    {/* Classes */}
                    <td className="p-3.5 text-center">
                      <div className="font-bold text-slate-900">
                        {summary.totalCompletedClasses} / {summary.totalScheduledClasses}
                      </div>
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, summary.completionRate)}%` }}
                        />
                      </div>
                    </td>

                    {/* Taught hours */}
                    <td className="p-3.5 text-center">
                      <span className="font-black text-blue-600 font-mono text-sm">
                        {summary.completedHours.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        of {summary.scheduledHours} hrs
                      </span>
                    </td>

                    {/* Punctuality */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          summary.punctualityRate >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {summary.punctualityRate}%
                      </span>
                      {summary.totalLateMinutes > 0 && (
                        <span className="text-[10px] text-rose-500 block font-medium mt-0.5">
                          {summary.totalLateMinutes}m late
                        </span>
                      )}
                    </td>

                    {/* Gross Wage */}
                    <td className="p-3.5 text-right font-mono text-slate-800 font-semibold">
                      ${summary.grossWage.toFixed(2)}
                    </td>

                    {/* Late Deduction */}
                    <td className="p-3.5 text-center">
                      {lateDeductionMode === 'deduct' ? (
                        summary.lateDeductions > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            -${summary.lateDeductions.toFixed(2)}
                            <span className="text-[9px] font-normal text-rose-500 ml-1">({summary.totalLateMinutes}m)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">$0.00</span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200" title="Non-deduct late policy active">
                          $0.00 (Waived)
                        </span>
                      )}
                    </td>

                    {/* Net Wage */}
                    <td className="p-3.5 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-black text-sm sm:text-base text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-xl shadow-xs">
                          ${summary.netWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right print:hidden">
                      <button
                        onClick={() => openTeacherDetail(summary)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Standard Form Table Footer with Grand Totals */}
            <tfoot className="bg-slate-100/90 text-slate-900 font-black border-t-2 border-slate-300 text-xs">
              <tr>
                <td className="p-3.5 text-center text-slate-400 font-bold">--</td>
                <td className="p-3.5 pl-3">
                  <div className="text-slate-900 uppercase font-black tracking-wider">
                    {isKhmer ? 'សរុបរួម (GRAND TOTAL)' : 'GRAND TOTAL / សរុប'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {wageSummaries.length} Faculty Members Monitored
                  </div>
                </td>
                <td className="p-3.5 text-slate-500 font-normal text-[11px]">
                  All Active Subjects
                </td>
                <td className="p-3.5 text-center font-mono">
                  <span className="text-[11px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    Avg ${overallKPIs.avgRate.toFixed(2)}/hr
                  </span>
                </td>
                <td className="p-3.5 text-center font-mono font-black">
                  {overallKPIs.totalClasses} classes
                </td>
                <td className="p-3.5 text-center font-mono font-black text-blue-700 text-sm">
                  {overallKPIs.totalHours.toFixed(1)} hrs
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800">
                    {overallKPIs.avgCompletion}% Avg
                  </span>
                </td>
                <td className="p-3.5 text-right font-mono font-black text-slate-900">
                  ${overallKPIs.totalGrossWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-center font-mono font-black text-rose-700">
                  {lateDeductionMode === 'deduct' && overallKPIs.totalLateDeductions > 0
                    ? `-$${overallKPIs.totalLateDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '$0.00'}
                </td>
                <td className="p-3.5 text-right font-mono font-black text-emerald-800 text-base">
                  ${overallKPIs.totalWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Institutional Standard Form Footer (Signatures & Certification) */}
        <div className="standard-admin-report-footer p-6 sm:p-8 border-t border-slate-200 bg-slate-50/70">
          {/* Official Certification Statement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800 font-bold block mb-0.5">
                  {isKhmer ? 'សេចក្តីបញ្ជាក់ត្រួតពិនិត្យផ្លូវការ (Administrative Certification):' : 'Official Administrative Certification:'}
                </strong>
                {isKhmer
                  ? 'យើងខ្ញុំសូមបញ្ជាក់ និងទទួលខុសត្រូវថា តារាងម៉ោងបង្រៀន និងប្រាក់ឈ្នួលគ្រូខាងលើ ត្រូវបានត្រួតពិនិត្យផ្ទៀងផ្ទាត់យ៉ាងហ្មត់ចត់ស្របតាមទិន្នន័យស្កេនជាក់ស្តែងពីប្រព័ន្ធ Terminal Check-in និងគោលការណ៍គ្រឹះស្ថាន។'
                  : 'We hereby certify and confirm that all faculty teaching hours, delivery timestamps, and calculated compensations stated in this document have been fully audited, reconciled with terminal scan logs, and prepared in accordance with institutional financial guidelines.'}
              </div>
            </div>
          </div>

          {/* Signatures 3 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {/* Column 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isKhmer ? 'អ្នករៀបចំ (Prepared By)' : 'Prepared By (HR / Payroll)'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {currentUser.role === 'admin_hr' || currentUser.role === 'super_admin' ? 'HR & Compensation Officer' : currentUser.role}
                </p>
              </div>
              <div className="my-8">
                <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isKhmer ? 'អ្នកត្រួតពិនិត្យ (Verified By)' : 'Verified By (Finance & Audit)'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Head of Accounting / Financial Auditor
                </p>
              </div>
              <div className="my-8">
                <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto" />
              </div>
              <div>
                <div className="font-bold text-slate-400 text-xs">____________________________</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: ____ / ____ / 2026
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isKhmer ? 'អ្នកអនុម័ត (Approved By)' : 'Approved By (Director / President)'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  School Board / Executive Director
                </p>
              </div>
              <div className="my-8 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase rotate-[-12deg]">
                  Official Stamp
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-400 text-xs">____________________________</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: ____ / ____ / 2026
                </div>
              </div>
            </div>
          </div>

          {/* Watermark / Control info */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
            <span>Generated from EduTrack Academic & Attendance Management System</span>
            <span>Confidential Financial Document • For Internal Administrative Use Only</span>
          </div>
        </div>

      </div>

      {/* Individual Teacher Itemized Payslip Modal */}
      {isPayslipModalOpen && selectedTeacherForDetail && (
        <div id="teacher-payslip-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div id="teacher-payslip-card" className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto">
            
            {/* Modal Header */}
            <div className="payslip-modal-header bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {isKhmer ? 'ប័ណ្ណបើកប្រាក់ឈ្នួលបង្រៀនគ្រូ' : 'Teacher Teaching Compensation Payslip'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Period: {dateFilterMode === 'month' ? selectedMonth : `${startDate} to ${endDate}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayslipModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Printable Payslip Voucher */}
            <div id="teacher-payslip-print" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Printable Org Banner */}
              <div className="hidden print:block text-center border-b border-slate-200 pb-4 mb-2">
                <h1 className="text-xl font-black text-slate-900 uppercase">
                  {systemSettings.organizationName}
                </h1>
                {systemSettings.khmerOrgName && (
                  <p className="text-sm font-khmer font-bold text-slate-700 mt-0.5">
                    {systemSettings.khmerOrgName}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  Official Faculty Teaching Wage Voucher
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Academic Year: {systemSettings.academicYear || '2026-2027'}
                  {systemSettings.academicStartDate && systemSettings.academicEndDate && (
                    <span> ({systemSettings.academicStartDate} to {systemSettings.academicEndDate})</span>
                  )}
                  <span> • Cycle: {dateFilterMode === 'month' ? selectedMonth : `${startDate} to ${endDate}`}</span>
                </p>
              </div>

              {/* Teacher Profile Summary Card */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {selectedTeacherForDetail.photoUrl && selectedTeacherForDetail.photoUrl.trim() ? (
                    <img
                      src={selectedTeacherForDetail.photoUrl.trim()}
                      alt={selectedTeacherForDetail.teacherName}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-lg flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                      {selectedTeacherForDetail.teacherName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      {selectedTeacherForDetail.teacherName}
                    </h4>
                    <p className="text-xs text-slate-500 font-khmer">
                      {selectedTeacherForDetail.khmerName || ''} • {selectedTeacherForDetail.teacherCode}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedTeacherForDetail.department} • {selectedTeacherForDetail.position}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-right space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Base Hourly Rate
                  </div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    ${selectedTeacherForDetail.hourlyRate.toFixed(2)} / hour
                  </div>
                </div>
              </div>

              {/* Wage Math Highlights: 4 Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Classes Taught</div>
                  <div className="text-lg font-black text-blue-950 mt-0.5">
                    {selectedTeacherForDetail.totalCompletedClasses} / {selectedTeacherForDetail.totalScheduledClasses}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Taught Hours</div>
                  <div className="text-lg font-black text-indigo-950 mt-0.5 font-mono">
                    {selectedTeacherForDetail.completedHours}h
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Gross Wage</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                    ${selectedTeacherForDetail.grossWage.toFixed(2)}
                  </div>
                </div>

                <div className={`p-3 rounded-xl text-center border ${
                  lateDeductionMode === 'deduct' && selectedTeacherForDetail.lateDeductions > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="text-[10px] font-bold uppercase">
                    {lateDeductionMode === 'deduct' ? 'Late Deduction' : 'Late (Waived)'}
                  </div>
                  <div className="text-lg font-black mt-0.5 font-mono">
                    {lateDeductionMode === 'deduct'
                      ? (selectedTeacherForDetail.lateDeductions > 0 ? `-$${selectedTeacherForDetail.lateDeductions.toFixed(2)}` : '$0.00')
                      : '$0.00'}
                  </div>
                  <span className="text-[9px] block text-slate-500 font-medium">
                    {selectedTeacherForDetail.totalLateMinutes}m late
                  </span>
                </div>
              </div>

              {/* Wage Charging Policy Strip */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">Wage Charging Policy:</span>
                <span className={`font-black ${wageDurationMode === 'full_schedule' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                  {wageDurationMode === 'full_schedule'
                    ? 'Full Scheduled Duration Policy (100% scheduled duration charged for delivered sessions)'
                    : 'Actual Scan Punch Duration Policy'}
                </span>
              </div>

              {/* Net Payable Highlight Card */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                    {isKhmer ? 'ប្រាក់ឈ្នួលត្រូវបើកសរុប (Net Payable)' : 'Net Payable Teaching Compensation'}
                  </span>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    {lateDeductionMode === 'deduct'
                      ? 'Gross wage minus prorated late minutes deduction'
                      : 'Non-deduct late policy applied (Full gross wage awarded)'}
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono">
                  ${selectedTeacherForDetail.netWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Itemized Class Sessions Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Itemized Teaching Sessions Log ({selectedTeacherForDetail.classSessions.length} classes)</span>
                </h5>

                {selectedTeacherForDetail.classSessions.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">
                      {isKhmer ? 'មិនមានកំណត់ត្រាស្កេនចូលក្នុងកាលបរិច្ឆេទនេះទេ' : 'No attendance check-in records found for this period'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isKhmer
                        ? 'ប្រាក់ឈ្នួល Net Wage គឺ $0.00 (គោលការណ៍ Full Schedule គិតប្រាក់កម្រៃជូនសម្រាប់តែកាលវិភាគណាដែលមានការស្កេនវត្តមានចូលប៉ុណ្ណោះ)'
                        : "Teacher's Net Wage is $0.00. Under Full Schedule policy, wages are only earned for sessions with verified check-in."}
                    </p>
                  </div>
                ) : (
                  <div className="payslip-sessions-table-wrapper border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Subject & Class</th>
                          <th className="p-2.5 text-center">Actual Time</th>
                          <th className="p-2.5 text-center">Hours</th>
                          <th className="p-2.5 text-center">Rate</th>
                          <th className="p-2.5 text-right">Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTeacherForDetail.classSessions.map((session, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-medium text-slate-700">
                              {session.date}
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{session.subject}</span>
                              <span className="text-[10px] text-slate-400">
                                {session.gradeClass} • {session.room}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {session.checkInTime ? (
                                <span className="font-bold text-slate-800">
                                  {session.checkInTime} - {session.checkOutTime || 'Ongoing'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                  No Check-in ($0.00)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-blue-600 font-mono">
                              {session.actualTaughtHours}h
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-600">
                              ${session.rateApplied.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-700 font-mono">
                              ${session.wageEarned.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Signatures block for official voucher */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Prepared by (HR)</p>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Academic Director</p>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Teacher Acknowledgment</p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="payslip-modal-footer bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsPayslipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handlePrintPayslip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Payslip Voucher</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Academic Dates Configuration Modal */}
      {isAcademicDatesModalOpen && (
        <AcademicDatesModal
          isOpen={isAcademicDatesModalOpen}
          onClose={() => setIsAcademicDatesModalOpen(false)}
        />
      )}

    </div>
  );
};
