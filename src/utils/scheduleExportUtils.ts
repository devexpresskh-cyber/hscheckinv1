import { Teacher, TeacherSubjectSchedule } from '../types/index.ts';

export const SCHEDULE_CSV_HEADERS = [
  'Teacher ID / Name',
  'Subject Title',
  'Khmer Subject',
  'Subject Code',
  'Grade / Class',
  'Room',
  'Days of Week',
  'Period Number',
  'Period Name',
  'Start Time',
  'End Time',
  'Grace Mins',
  'Hourly Wage Rate'
];

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a list of day indices (0-6) into standard day tokens matching ImportTeacherScheduleModal parser
 * e.g. [1, 2, 3, 4, 5] -> "Mon,Tue,Wed,Thu,Fri"
 */
export function formatDaysOfWeek(days?: number[] | null, fallbackDay?: number | null): string {
  let resolved: number[] = [];
  if (Array.isArray(days) && days.length > 0) {
    resolved = Array.from(new Set(days)).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
  } else if (typeof fallbackDay === 'number' && fallbackDay >= 0 && fallbackDay <= 6) {
    resolved = [fallbackDay];
  } else {
    resolved = [1, 2, 3, 4, 5]; // Default Mon-Fri
  }

  resolved.sort((a, b) => a - b);
  return resolved.map(d => DAY_ABBREVIATIONS[d] || 'Mon').join(',');
}

/**
 * Converts a list of TeacherSubjectSchedule records into an import-compatible CSV string.
 * Uses exact headers and formatting expected by ImportTeacherScheduleModal.
 */
export function generateScheduleCsvString(
  schedules: TeacherSubjectSchedule[],
  teachers: Teacher[]
): string {
  const teacherMap = new Map<string, Teacher>();
  teachers.forEach(t => {
    if (t.id) teacherMap.set(t.id, t);
    if (t.teacherId) teacherMap.set(t.teacherId.toLowerCase(), t);
    if (t.fullName) teacherMap.set(t.fullName.toLowerCase(), t);
  });

  const rows: string[][] = schedules.map((sch, idx) => {
    // Resolve matching teacher
    const teacher =
      (sch.teacherId ? teacherMap.get(sch.teacherId) : undefined) ||
      (sch.teacherId ? teacherMap.get(sch.teacherId.toLowerCase()) : undefined) ||
      (sch.teacherName ? teacherMap.get(sch.teacherName.toLowerCase()) : undefined) ||
      teachers.find(t => t.id === sch.teacherId || t.fullName === sch.teacherName);

    // Prefer teacher ID code for robust re-import match, fallback to name
    const teacherIdentifier = teacher?.teacherId || teacher?.fullName || sch.teacherName || 'Faculty';

    const subjectTitle = sch.subject || 'Subject';
    const khmerSubject = sch.khmerSubject || sch.subject || '';
    const subjectCode = sch.subjectCode || '';
    const gradeClass = sch.gradeClass || 'All Classes';
    const room = sch.room || 'Room 101';
    const daysStr = formatDaysOfWeek(sch.daysOfWeek, sch.dayOfWeek);
    const periodNumber = String(sch.periodNumber || (idx + 1));
    const periodName = sch.periodName || `Period ${periodNumber}`;
    const startTime = sch.startTime || '07:30';
    const endTime = sch.endTime || '09:00';
    const graceMins = String(sch.gracePeriodMinutes ?? 10);
    const hourlyRate = (sch.hourlyRate ?? teacher?.hourlyRate ?? 20.0).toFixed(2);

    return [
      teacherIdentifier,
      subjectTitle,
      khmerSubject,
      subjectCode,
      gradeClass,
      room,
      daysStr,
      periodNumber,
      periodName,
      startTime,
      endTime,
      graceMins,
      hourlyRate
    ];
  });

  // Quote each cell to safely escape commas, quotes, and newlines
  const escapeCell = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const headerLine = SCHEDULE_CSV_HEADERS.map(escapeCell).join(',');
  const rowLines = rows.map(r => r.map(escapeCell).join(','));

  // Prepend UTF-8 BOM so Excel and spreadsheet editors properly display Khmer and special characters
  return '\uFEFF' + [headerLine, ...rowLines].join('\n');
}

/**
 * Triggers a browser download of the schedule CSV file.
 */
export function exportSchedulesToCsv(
  schedules: TeacherSubjectSchedule[],
  teachers: Teacher[],
  filenamePrefix = 'teacher_schedules_export'
): { count: number; filename: string } {
  const csvContent = generateScheduleCsvString(schedules, teachers);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: schedules.length, filename };
}
