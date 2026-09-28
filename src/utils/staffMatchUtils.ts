import { Teacher, Employee } from '../types/index.ts';
import { phoneNumbersMatch } from './phoneUtils.ts';

export function normalizeIdString(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Robustly matches a search query or input ID against a Teacher profile.
 * Supports:
 * - Full Teacher ID: "TCH-2026-001", "tch-2026-001"
 * - Compact ID without dashes: "TCH2026001", "tch2026001"
 * - Short ID without year: "TCH-001", "tch001", "tch-1"
 * - System ID: "tch-001", "tch-1718291823"
 * - Associated Employee ID: "EMP-101", "emp101", "101"
 * - Numeric sequence suffix: "001", "01", "1", "2026-001"
 * - Phone numbers (Cambodian +855 or 0xx)
 * - Email address or email prefix
 * - Full Name, Khmer Name, or English Name (exact or substring)
 */
export function matchTeacher(query: string, teacher: Teacher): boolean {
  if (!query || !teacher) return false;
  const raw = query.trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const cleanQuery = normalizeIdString(raw);

  // 1. Exact or normalized teacherId (e.g. "TCH-2026-001", "tch2026001", "TCH 2026 001")
  if (teacher.teacherId) {
    if (teacher.teacherId.toLowerCase() === lower) return true;
    if (normalizeIdString(teacher.teacherId) === cleanQuery) return true;

    // Check without year: e.g. teacherId "TCH-2026-001" -> matches "TCH-001", "tch001"
    const parts = teacher.teacherId.split('-');
    if (parts.length >= 3) {
      const prefix = parts[0]; // "TCH"
      const num = parts[parts.length - 1]; // "001"
      const shortId = `${prefix}-${num}`.toLowerCase(); // "tch-001"
      if (shortId === lower || normalizeIdString(shortId) === cleanQuery) return true;
      if (cleanQuery === `${prefix.toLowerCase()}${parseInt(num, 10)}`) return true;
    }
  }

  // 2. Exact or normalized database id (e.g. "tch-001", "tch001")
  if (teacher.id) {
    if (teacher.id.toLowerCase() === lower) return true;
    if (normalizeIdString(teacher.id) === cleanQuery) return true;
  }

  // 3. Exact or normalized employeeId (e.g. "EMP-101", "emp101", "101")
  if (teacher.employeeId) {
    if (teacher.employeeId.toLowerCase() === lower) return true;
    if (normalizeIdString(teacher.employeeId) === cleanQuery) return true;
    const empDigits = teacher.employeeId.replace(/\D/g, '');
    const queryDigits = raw.replace(/\D/g, '');
    if (queryDigits && queryDigits.length >= 2 && empDigits === queryDigits) return true;
  }

  // 4. Numeric matching on teacher ID suffix (e.g. "001", "01", "1")
  const queryOnlyDigits = raw.replace(/\D/g, '');
  if (queryOnlyDigits && queryOnlyDigits.length >= 1 && queryOnlyDigits.length <= 4) {
    const teacherIdDigits = (teacher.teacherId || '').replace(/\D/g, '');
    if (teacherIdDigits.endsWith(queryOnlyDigits)) {
      return true;
    }
    const idDigits = (teacher.id || '').replace(/\D/g, '');
    if (idDigits === queryOnlyDigits || idDigits.endsWith(queryOnlyDigits)) {
      return true;
    }
    // Also parse as number if query is purely numeric and <= 3 digits
    if (/^\d+$/.test(raw)) {
      const qNum = parseInt(raw, 10);
      const tNum = parseInt(teacherIdDigits.slice(-3), 10);
      if (!isNaN(qNum) && !isNaN(tNum) && qNum === tNum) return true;
    }
  }

  // 5. Phone number match
  if (teacher.phone && phoneNumbersMatch(raw, teacher.phone)) {
    return true;
  }

  // 6. Email match
  if (teacher.email) {
    if (teacher.email.toLowerCase() === lower) return true;
    if (lower.length >= 4 && teacher.email.toLowerCase().startsWith(lower)) return true;
  }

  // 7. Full name, Khmer name, English name
  if (teacher.fullName && (teacher.fullName.toLowerCase() === lower || teacher.fullName.toLowerCase().includes(lower))) {
    return true;
  }
  if (teacher.khmerName && (teacher.khmerName.includes(raw) || lower.includes(teacher.khmerName.toLowerCase()))) {
    return true;
  }
  if (teacher.englishName && (teacher.englishName.toLowerCase() === lower || teacher.englishName.toLowerCase().includes(lower))) {
    return true;
  }

  return false;
}

/**
 * Robustly matches a search query or input ID against an Employee profile.
 */
export function matchEmployee(query: string, employee: Employee): boolean {
  if (!query || !employee) return false;
  const raw = query.trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const cleanQuery = normalizeIdString(raw);

  if (employee.employeeId) {
    if (employee.employeeId.toLowerCase() === lower) return true;
    if (normalizeIdString(employee.employeeId) === cleanQuery) return true;
    const empDigits = employee.employeeId.replace(/\D/g, '');
    const queryDigits = raw.replace(/\D/g, '');
    if (queryDigits && queryDigits.length >= 2 && empDigits === queryDigits) return true;
  }

  if (employee.id) {
    if (employee.id.toLowerCase() === lower) return true;
    if (normalizeIdString(employee.id) === cleanQuery) return true;
  }

  if (employee.phone && phoneNumbersMatch(raw, employee.phone)) {
    return true;
  }

  if (employee.email) {
    if (employee.email.toLowerCase() === lower) return true;
    if (lower.length >= 4 && employee.email.toLowerCase().startsWith(lower)) return true;
  }

  if (employee.fullName && (employee.fullName.toLowerCase() === lower || employee.fullName.toLowerCase().includes(lower))) {
    return true;
  }
  if (employee.khmerName && employee.khmerName.includes(raw)) {
    return true;
  }

  return false;
}

/**
 * Searches across all teachers and employees and returns the best matched person.
 */
export function findStaffPerson(
  query: string,
  teachers: Teacher[],
  employees: Employee[]
): { type: 'teacher'; data: Teacher } | { type: 'employee'; data: Employee } | null {
  if (!query || !query.trim()) return null;

  // 1. Search teachers first
  const foundTeacher = teachers.find(t => matchTeacher(query, t));
  if (foundTeacher) {
    return { type: 'teacher', data: foundTeacher };
  }

  // 2. Search employees
  const foundEmployee = employees.find(e => matchEmployee(query, e));
  if (foundEmployee) {
    return { type: 'employee', data: foundEmployee };
  }

  return null;
}
