import React, { useState, useRef } from 'react';
import { Teacher, TeacherSubjectSchedule } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Clipboard,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  Filter,
  Trash2,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';

interface ImportTeacherScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  teachers: Teacher[];
}

interface ParsedScheduleRow {
  id: string;
  rawTeacher: string;
  matchedTeacherId: string;
  matchedTeacherName: string;
  matchedKhmerTeacherName: string;
  subject: string;
  khmerSubject: string;
  subjectCode: string;
  gradeClass: string;
  room: string;
  daysOfWeek: number[];
  periodNumber: number;
  periodName: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  hourlyRate?: number;
  color: string;
  isValid: boolean;
  validationErrors: string[];
}

const COLOR_PALETTE = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];

export const ImportTeacherScheduleModal: React.FC<ImportTeacherScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teachers
}) => {
  const { isKhmer } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedScheduleRow[]>([]);
  const [importConflictStrategy, setImportConflictStrategy] = useState<'append' | 'replace_all'>('append');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Day string parsing helper
  const parseDaysOfWeek = (val: string): number[] => {
    if (!val) return [1, 2, 3, 4, 5]; // Default Mon-Fri
    const cleaned = val.toLowerCase().replace(/['"]/g, '').trim();

    // Check if comma or hyphen separated numbers: e.g. "1,2,3,4,5" or "1-5"
    if (cleaned.includes('-') && /^[0-6]\s*-\s*[0-6]$/.test(cleaned)) {
      const [start, end] = cleaned.split('-').map(s => parseInt(s.trim(), 10));
      const days: number[] = [];
      for (let i = start; i <= end; i++) days.push(i);
      return days;
    }

    const tokens = cleaned.split(/[,;\s/|]+/).filter(Boolean);
    const dayMap: Record<string, number> = {
      '0': 0, 'sun': 0, 'sunday': 0, 'អាទិត្យ': 0,
      '1': 1, 'mon': 1, 'monday': 1, 'ច័ន្ទ': 1,
      '2': 2, 'tue': 2, 'tuesday': 2, 'អង្គារ': 2,
      '3': 3, 'wed': 3, 'wednesday': 3, 'ពុធ': 3,
      '4': 4, 'thu': 4, 'thursday': 4, 'ព្រហស្បតិ៍': 4,
      '5': 5, 'fri': 5, 'friday': 5, 'សុក្រ': 5,
      '6': 6, 'sat': 6, 'saturday': 6, 'សៅរ៍': 6
    };

    const resolved: number[] = [];
    tokens.forEach(tok => {
      const match = dayMap[tok];
      if (match !== undefined && !resolved.includes(match)) {
        resolved.push(match);
      }
    });

    return resolved.length > 0 ? resolved.sort() : [1, 2, 3, 4, 5];
  };

  // Find matching teacher by ID, code, name or email
  const matchTeacher = (query: string): Teacher | undefined => {
    if (!query) return undefined;
    const q = query.trim().toLowerCase();
    return teachers.find(t => 
      t.id.toLowerCase() === q ||
      t.teacherId.toLowerCase() === q ||
      t.employeeId?.toLowerCase() === q ||
      t.fullName.toLowerCase() === q ||
      t.englishName?.toLowerCase() === q ||
      t.khmerName?.toLowerCase() === q ||
      t.email?.toLowerCase() === q ||
      t.fullName.toLowerCase().includes(q)
    );
  };

  // Time normalization: "7:30" -> "07:30"
  const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    const parts = clean.split(':');
    if (parts.length >= 2) {
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].slice(0, 2).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return clean;
  };

  // Parse raw text table (CSV or Tab-delimited)
  const parseTableText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Detect delimiter: tab or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    // Parse CSV line respecting quotes
    const parseLine = (line: string): string[] => {
      if (delimiter === '\t') {
        return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      }
      const values: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      values.push(cur.trim().replace(/^["']|["']$/g, ''));
      return values;
    };

    const headerTokens = parseLine(firstLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Check if first line is a header
    const hasHeader = headerTokens.some(h => 
      h.includes('teacher') || h.includes('subject') || h.includes('period') || h.includes('start') || h.includes('time') || h.includes('class')
    );

    const startIdx = hasHeader ? 1 : 0;
    
    // Map column indices
    let colTeacher = -1;
    let colSubject = -1;
    let colKhmerSubject = -1;
    let colCode = -1;
    let colClass = -1;
    let colRoom = -1;
    let colDays = -1;
    let colPeriodNum = -1;
    let colPeriodName = -1;
    let colStart = -1;
    let colEnd = -1;
    let colGrace = -1;
    let colRate = -1;

    if (hasHeader) {
      headerTokens.forEach((token, idx) => {
        if (token.includes('teacher') || token === 'instructor' || token === 'faculty') colTeacher = idx;
        else if (token.includes('khmersubject') || token.includes('khmername')) colKhmerSubject = idx;
        else if (token.includes('subject') || token.includes('course') || token === 'title') colSubject = idx;
        else if (token.includes('code')) colCode = idx;
        else if (token.includes('class') || token.includes('grade')) colClass = idx;
        else if (token.includes('room') || token.includes('lab')) colRoom = idx;
        else if (token.includes('day') || token.includes('days')) colDays = idx;
        else if (token.includes('periodnum') || token === 'period' || token === 'no') colPeriodNum = idx;
        else if (token.includes('periodname') || token.includes('session')) colPeriodName = idx;
        else if (token.includes('start') || token.includes('from')) colStart = idx;
        else if (token.includes('end') || token.includes('to')) colEnd = idx;
        else if (token.includes('grace')) colGrace = idx;
        else if (token.includes('rate') || token.includes('wage') || token.includes('fee')) colRate = idx;
      });
    }

    // Fallback standard positions if not found by name
    if (colTeacher === -1) colTeacher = 0;
    if (colSubject === -1) colSubject = 1;
    if (colClass === -1) colClass = 2;
    if (colDays === -1) colDays = 3;
    if (colStart === -1) colStart = 4;
    if (colEnd === -1) colEnd = 5;
    if (colRoom === -1 && headerTokens.length > 6) colRoom = 6;
    if (colPeriodNum === -1 && headerTokens.length > 7) colPeriodNum = 7;

    const rows: ParsedScheduleRow[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || cols.every(c => c === '')) continue;

      const rawTeacher = (cols[colTeacher] || '').trim();
      const subject = (cols[colSubject] || '').trim();
      const khmerSubject = (colKhmerSubject !== -1 ? cols[colKhmerSubject] : '') || '';
      const subjectCode = (colCode !== -1 ? cols[colCode] : '') || '';
      const gradeClass = (colClass !== -1 ? cols[colClass] : '') || 'Grade 12A';
      const room = (colRoom !== -1 ? cols[colRoom] : '') || 'Room 201';
      const daysStr = colDays !== -1 ? cols[colDays] : '';
      const rawPeriodNum = colPeriodNum !== -1 ? parseInt(cols[colPeriodNum], 10) : NaN;
      const periodNumber = !isNaN(rawPeriodNum) && rawPeriodNum > 0 ? rawPeriodNum : (i - startIdx + 1);
      const periodName = (colPeriodName !== -1 ? cols[colPeriodName] : '') || `Period ${periodNumber}`;
      const startTime = normalizeTime(colStart !== -1 ? cols[colStart] : '07:30');
      const endTime = normalizeTime(colEnd !== -1 ? cols[colEnd] : '09:00');
      const rawGrace = colGrace !== -1 ? parseInt(cols[colGrace], 10) : 10;
      const gracePeriodMinutes = isNaN(rawGrace) ? 10 : rawGrace;
      const rawRate = colRate !== -1 ? parseFloat(cols[colRate]) : undefined;
      const hourlyRate = rawRate && !isNaN(rawRate) ? rawRate : undefined;

      const matched = matchTeacher(rawTeacher);
      const daysOfWeek = parseDaysOfWeek(daysStr);

      // Validation
      const errors: string[] = [];
      if (!rawTeacher) errors.push('Missing Teacher identification');
      if (!matched && rawTeacher) errors.push(`Teacher "${rawTeacher}" not found in database`);
      if (!subject) errors.push('Missing Subject name');
      if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) errors.push(`Invalid start time: "${startTime}" (expected HH:mm)`);
      if (!endTime || !/^\d{2}:\d{2}$/.test(endTime)) errors.push(`Invalid end time: "${endTime}" (expected HH:mm)`);
      if (startTime && endTime && startTime >= endTime) errors.push(`Start time (${startTime}) must be earlier than End time (${endTime})`);

      rows.push({
        id: `parsed-${i}-${Date.now()}`,
        rawTeacher,
        matchedTeacherId: matched?.id || '',
        matchedTeacherName: matched?.fullName || rawTeacher,
        matchedKhmerTeacherName: matched?.khmerName || '',
        subject,
        khmerSubject,
        subjectCode: subjectCode || `${subject.substring(0, 4).toUpperCase()}-${gradeClass.replace(/[^0-9A-Za-z]/g, '')}`,
        gradeClass,
        room,
        daysOfWeek,
        periodNumber,
        periodName: periodName.includes(startTime) ? periodName : `${periodName} (${startTime} - ${endTime})`,
        startTime,
        endTime,
        gracePeriodMinutes,
        hourlyRate,
        color: COLOR_PALETTE[(i - startIdx) % COLOR_PALETTE.length],
        isValid: errors.length === 0,
        validationErrors: errors
      });
    }

    setParsedRows(rows);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      parseTableText(content);
    };
    reader.readAsText(file);
  };

  // Handle manual paste text
  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    setFileName('Pasted_Data.tsv');
    parseTableText(pastedText);
  };

  // Change teacher mapping for a row
  const handleUpdateRowTeacher = (rowId: string, newTeacherId: string) => {
    const t = teachers.find(teach => teach.id === newTeacherId);
    if (!t) return;
    setParsedRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        const errors = row.validationErrors.filter(e => !e.includes('Teacher'));
        return {
          ...row,
          matchedTeacherId: t.id,
          matchedTeacherName: t.fullName,
          matchedKhmerTeacherName: t.khmerName || '',
          validationErrors: errors,
          isValid: errors.length === 0
        };
      })
    );
  };

  // Delete row from preview
  const handleDeleteRow = (rowId: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = [
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

    const sampleTeacher1 = teachers[0]?.teacherId || 'TCH-2026-001';
    const sampleTeacher2 = teachers[1]?.teacherId || 'TCH-2026-002';
    const sampleTeacher3 = teachers[2]?.teacherId || 'TCH-2026-003';

    const rows = [
      [
        sampleTeacher1,
        'Advanced Mathematics',
        'គណិតវិទ្យាកម្រិតខ្ពស់',
        'MATH-12A',
        'Grade 12A',
        'Room 204 (Math Lab)',
        'Mon,Tue,Wed,Thu,Fri',
        '1',
        'Period 1',
        '07:30',
        '09:00',
        '10',
        '20.00'
      ],
      [
        sampleTeacher1,
        'Applied Calculus & Analysis',
        'គណិតវិទ្យាអនុវត្តន៍',
        'MATH-11B',
        'Grade 11B',
        'Room 102',
        'Mon,Tue,Wed,Thu,Fri',
        '2',
        'Period 2',
        '09:15',
        '10:45',
        '10',
        '20.00'
      ],
      [
        sampleTeacher2,
        'Khmer Classic Literature',
        'អក្សរសិល្ប៍ខ្មែរបុរាណ',
        'KHM-12A',
        'Grade 12A',
        'Room 201',
        'Mon,Wed,Fri',
        '1',
        'Period 1',
        '07:30',
        '09:00',
        '10',
        '18.00'
      ],
      [
        sampleTeacher3,
        'Academic English & IELTS',
        'ភាសាអង់គ្លេសកម្រិតខ្ពស់',
        'ENG-10A',
        'Grade 10A',
        'Room 302 (Language Lab)',
        'Mon,Tue,Wed,Thu,Fri',
        '3',
        'Period 3',
        '13:30',
        '15:00',
        '10',
        '25.00'
      ]
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'teacher_schedules_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Perform Final Import
  const handleCommitImport = () => {
    const validRows = parsedRows.filter(r => r.isValid && r.matchedTeacherId);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      const newSubjectSchedules: TeacherSubjectSchedule[] = validRows.map((row, idx) => ({
        id: `tss-imported-${Date.now()}-${idx}`,
        teacherId: row.matchedTeacherId,
        teacherName: row.matchedTeacherName,
        khmerTeacherName: row.matchedKhmerTeacherName,
        subject: row.subject,
        khmerSubject: row.khmerSubject || row.subject,
        subjectCode: row.subjectCode,
        gradeClass: row.gradeClass,
        room: row.room,
        dayOfWeek: row.daysOfWeek[0] || 1,
        daysOfWeek: row.daysOfWeek,
        periodNumber: row.periodNumber,
        periodName: row.periodName,
        startTime: row.startTime,
        endTime: row.endTime,
        gracePeriodMinutes: row.gracePeriodMinutes,
        hourlyRate: row.hourlyRate,
        color: row.color,
        isActive: true
      }));

      if (importConflictStrategy === 'replace_all') {
        // Replace existing subject schedules with imported set
        StorageService.saveSubjectSchedules(newSubjectSchedules);
      } else {
        // Append
        StorageService.addSubjectSchedulesBatch(newSubjectSchedules);
      }

      setIsProcessing(false);
      onSuccess(newSubjectSchedules.length);
      onClose();
    }, 400);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {isKhmer ? 'នាំចូលកាលវិភាគបង្រៀនគ្រូ' : 'Import Teacher Subject Schedules'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKhmer 
                  ? 'បញ្ចូលកាលវិភាគបង្រៀនជាដុំតាមរយៈឯកសារ CSV, Excel ឬចម្លងទិន្នន័យតារាង' 
                  : 'Batch upload subject periods, times, classes & teaching rates via CSV or spreadsheet copy-paste'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Top Actions: Template & Mode switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Table Data</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template (CSV)</span>
            </button>
          </div>

          {/* Input Method: Upload or Paste */}
          {inputMode === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt, .tsv, .xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {fileName ? `Selected: ${fileName}` : 'Choose CSV or text file to upload'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click here or drag-and-drop your prepared schedule CSV spreadsheet
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Paste rows directly from Google Sheets or Excel:
              </label>
              <textarea
                rows={4}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Teacher ID/Name	Subject	Khmer Subject	Code	Grade/Class	Room	Days	Start	End	Grace	Rate&#10;TCH-2026-001	Advanced Mathematics	គណិតវិទ្យា	MATH-12A	Grade 12A	Room 204	Mon,Tue,Wed,Thu,Fri	07:30	09:00	10	20.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleParsePasted}
                disabled={!pastedText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Parse Pasted Rows
              </button>
            </div>
          )}

          {/* Validation & Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Summary Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold">Parsed: {parsedRows.length} schedules</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {invalidCount} Needs Attention
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-400">Import Mode:</label>
                  <select
                    value={importConflictStrategy}
                    onChange={e => setImportConflictStrategy(e.target.value as any)}
                    className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="append">Append to existing</option>
                    <option value="replace_all">Replace all schedules</option>
                  </select>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Teacher Mapping</th>
                      <th className="p-2.5">Subject & Class</th>
                      <th className="p-2.5">Days</th>
                      <th className="p-2.5">Time (Start - End)</th>
                      <th className="p-2.5">Rate ($/hr)</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map(row => {
                      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const daysText = row.daysOfWeek.map(d => dayLabels[d] || d).join(', ');

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid ? 'bg-rose-50/50' : ''
                          }`}
                        >
                          <td className="p-2.5 align-middle">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                              </span>
                            ) : (
                              <div className="group relative inline-block cursor-help">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" /> Error
                                </span>
                                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-52 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-lg z-20">
                                  {row.validationErrors.map((err, i) => (
                                    <div key={i} className="text-rose-300">• {err}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Teacher Column with inline correction if unmatched */}
                          <td className="p-2.5 align-middle">
                            {row.matchedTeacherId ? (
                              <div className="font-bold text-slate-900">
                                {row.matchedTeacherName}
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  {row.matchedKhmerTeacherName}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-[11px] text-rose-600 font-bold block">
                                  "{row.rawTeacher}" (Unmatched)
                                </span>
                                <select
                                  onChange={e => handleUpdateRowTeacher(row.id, e.target.value)}
                                  className="text-[11px] bg-white border border-rose-300 text-slate-800 rounded-lg px-1.5 py-0.5 font-medium"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Select teacher...</option>
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.fullName} ({t.teacherId})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>

                          {/* Subject & Class */}
                          <td className="p-2.5 align-middle">
                            <div className="font-bold text-slate-900">{row.subject}</div>
                            <div className="text-[10px] text-slate-500">
                              {row.gradeClass} • {row.room}
                            </div>
                          </td>

                          {/* Days */}
                          <td className="p-2.5 align-middle text-slate-600 font-medium">
                            {daysText}
                          </td>

                          {/* Time */}
                          <td className="p-2.5 align-middle">
                            <span className="font-mono font-bold text-slate-900">
                              {row.startTime} - {row.endTime}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {row.periodName}
                            </span>
                          </td>

                          {/* Rate */}
                          <td className="p-2.5 align-middle font-bold text-emerald-700">
                            {row.hourlyRate ? `$${row.hourlyRate.toFixed(2)}` : 'Teacher Base'}
                          </td>

                          {/* Action */}
                          <td className="p-2.5 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick instructions / Help */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import Tips & Auto-Calculation Information:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-500">
              <li>
                <strong>Teacher Identification:</strong> You can supply Teacher ID (e.g. <code className="bg-slate-200 px-1 rounded">TCH-2026-001</code>) or full name. Unmatched names can be mapped directly in the preview.
              </li>
              <li>
                <strong>Days Format:</strong> Comma-separated day abbreviations (e.g. <code className="bg-slate-200 px-1 rounded">Mon,Tue,Wed,Thu,Fri</code>) or numbers (<code className="bg-slate-200 px-1 rounded">1,2,3,4,5</code>).
              </li>
              <li>
                <strong>Wage Calculation:</strong> Setting an hourly rate here overrides the teacher's profile base rate for that subject period in wage reports.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={validCount === 0 || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-black text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Import {validCount} Valid Schedules</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
