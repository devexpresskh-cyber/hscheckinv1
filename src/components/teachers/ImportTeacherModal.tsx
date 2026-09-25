import React, { useState, useRef } from 'react';
import { Teacher, Department, StaffStatus } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Clipboard,
  ChevronRight,
  Trash2,
  RefreshCw,
  GraduationCap,
  Users,
  AlertTriangle,
  Building,
  DollarSign
} from 'lucide-react';

interface ImportTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  existingTeachers: Teacher[];
}

interface ParsedTeacherRow {
  id: string;
  teacherId: string;
  employeeId: string;
  fullName: string;
  khmerName: string;
  englishName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  department: string;
  position: string;
  subject: string;
  hourlyRate: number;
  phone: string;
  email: string;
  telegramChatId: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  status: StaffStatus;
  joinDate: string;
  assignedLocation: string;
  assignedScheduleId: string;
  isValid: boolean;
  validationErrors: string[];
  isDuplicateId: boolean;
}

export const ImportTeacherModal: React.FC<ImportTeacherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingTeachers
}) => {
  const { isKhmer } = useLanguage();
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [importConflictStrategy, setImportConflictStrategy] = useState<'append' | 'replace_all'>('append');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'issues'>('all');

  const availableDepartments = StorageService.getDepartments();

  if (!isOpen) return null;

  // Sample CSV Template Generator
  const downloadSampleTemplate = () => {
    const headers = [
      'Teacher ID',
      'Employee ID',
      'Full Name',
      'Khmer Name',
      'Gender',
      'Department',
      'Position',
      'Subject',
      'Hourly Rate',
      'Phone',
      'Email',
      'Telegram ID',
      'Employment Type',
      'Status',
      'Join Date',
      'Work Location'
    ];

    const sampleRows = [
      [
        'TCH-2026-001',
        'EMP-101',
        'Sok Chenda',
        'សុខ ចិន្តា',
        'Female',
        'Mathematics & Science',
        'Senior Mathematics Lecturer',
        'Advanced Calculus & Algebra',
        '25.00',
        '+855 12 345 678',
        'sok.chenda@edutrack.edu.kh',
        '@sok_chenda',
        'Full-time',
        'Active',
        '2022-01-15',
        'Main Campus - Building A'
      ],
      [
        'TCH-2026-002',
        'EMP-102',
        'Chann Borey',
        'ចាន់ បូរី',
        'Male',
        'Languages & Humanities',
        'Associate Professor',
        'Khmer Literature & History',
        '22.00',
        '+855 11 987 654',
        'chann.borey@edutrack.edu.kh',
        '@chann_borey',
        'Full-time',
        'Active',
        '2021-08-01',
        'Main Campus - Building B'
      ],
      [
        'TCH-2026-003',
        'EMP-103',
        'Keo Piseth',
        'កែវ ពិសិដ្ឋ',
        'Male',
        'Information Technology',
        'Lecturer & Lab Instructor',
        'Computer Science & Programming',
        '28.00',
        '+855 92 888 777',
        'keo.piseth@edutrack.edu.kh',
        '@keo_piseth',
        'Contract',
        'Active',
        '2023-03-01',
        'Technology Wing - Lab 1'
      ]
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'teachers_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Robust CSV parser supporting quotes and commas inside cells
  const parseCSVLines = (text: string): string[][] => {
    const lines: string[][] = [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawLines = normalized.split('\n');

    for (let rawLine of rawLines) {
      if (!rawLine.trim()) continue;

      const cells: string[] = [];
      let inQuotes = false;
      let currentCell = '';

      for (let i = 0; i < rawLine.length; i++) {
        const char = rawLine[i];
        if (char === '"') {
          if (inQuotes && rawLine[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      lines.push(cells);
    }
    return lines;
  };

  // Flexible column finder
  const findColumnIndex = (headers: string[], keywords: string[]): number => {
    return headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return keywords.some(k => normalized.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
    });
  };

  // Main Parsing Logic
  const processRawData = (text: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    setIsProcessing(true);

    try {
      const rows = parseCSVLines(text);
      if (rows.length < 2) {
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      const headers = rows[0];

      // Identify column indices
      const teacherIdCol = findColumnIndex(headers, ['teacherid', 'tchid', 'teacher_id', 'facultyid']);
      const empIdCol = findColumnIndex(headers, ['employeeid', 'empid', 'employee_id', 'staffid']);
      const fullNameCol = findColumnIndex(headers, ['fullname', 'teachername', 'name', 'facultyname', 'lecturer']);
      const khmerNameCol = findColumnIndex(headers, ['khmername', 'khmer', 'namekhmer', 'ឈ្មោះខ្មែរ']);
      const genderCol = findColumnIndex(headers, ['gender', 'sex']);
      const deptCol = findColumnIndex(headers, ['department', 'dept', 'faculty', 'division', 'ដេប៉ាតឺម៉ង់']);
      const posCol = findColumnIndex(headers, ['position', 'role', 'title', 'job']);
      const subjectCol = findColumnIndex(headers, ['subject', 'course', 'major', 'discipline', 'មុខវិជ្ជា']);
      const rateCol = findColumnIndex(headers, ['hourlyrate', 'rate', 'wage', 'salary', 'hourly', 'តម្លៃម៉ោង']);
      const phoneCol = findColumnIndex(headers, ['phone', 'tel', 'mobile', 'contact']);
      const emailCol = findColumnIndex(headers, ['email', 'mail']);
      const telegramCol = findColumnIndex(headers, ['telegram', 'chatid', 'tg']);
      const typeCol = findColumnIndex(headers, ['employmenttype', 'type', 'contract']);
      const statusCol = findColumnIndex(headers, ['status', 'state']);
      const joinDateCol = findColumnIndex(headers, ['joindate', 'hiredate', 'startdate', 'date']);
      const locationCol = findColumnIndex(headers, ['location', 'campus', 'building', 'room']);

      const existingTeacherIds = new Set(existingTeachers.map(t => t.teacherId.toLowerCase()));
      const seenFileTeacherIds = new Set<string>();

      const parsed: ParsedTeacherRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || row.every(cell => !cell)) continue;

        const getVal = (col: number) => (col >= 0 && col < row.length ? row[col].trim() : '');

        const fullName = fullNameCol >= 0 ? getVal(fullNameCol) : (row[0] || '');
        const khmerName = khmerNameCol >= 0 ? getVal(khmerNameCol) : '';
        const deptRaw = deptCol >= 0 ? getVal(deptCol) : '';
        const subject = subjectCol >= 0 ? getVal(subjectCol) : '';
        const position = posCol >= 0 ? getVal(posCol) : 'Lecturer';

        // Hourly Rate parsing
        const rateRaw = rateCol >= 0 ? getVal(rateCol) : '';
        const numericRate = parseFloat(rateRaw.replace(/[^0-9.]/g, '')) || 25.0;

        // IDs
        let teacherId = teacherIdCol >= 0 ? getVal(teacherIdCol) : '';
        if (!teacherId) {
          teacherId = `TCH-2026-${String(existingTeachers.length + i).padStart(3, '0')}`;
        }
        let employeeId = empIdCol >= 0 ? getVal(empIdCol) : '';
        if (!employeeId) {
          employeeId = `EMP-${String(100 + existingTeachers.length + i)}`;
        }

        // Gender
        let gender: 'Male' | 'Female' | 'Other' = 'Male';
        const genderRaw = (genderCol >= 0 ? getVal(genderCol) : '').toLowerCase();
        if (genderRaw.includes('f') || genderRaw.includes('ស្រី') || genderRaw.includes('female')) {
          gender = 'Female';
        } else if (genderRaw.includes('other') || genderRaw.includes('ផ្សេងៗ')) {
          gender = 'Other';
        }

        // Status
        let status: StaffStatus = 'Active';
        const statusRaw = (statusCol >= 0 ? getVal(statusCol) : '').toLowerCase();
        if (statusRaw.includes('inactive')) status = 'Inactive';
        else if (statusRaw.includes('leave')) status = 'On Leave';
        else if (statusRaw.includes('resign')) status = 'Resigned';

        // Employment type
        let employmentType: 'Full-time' | 'Part-time' | 'Contract' = 'Full-time';
        const typeRaw = (typeCol >= 0 ? getVal(typeCol) : '').toLowerCase();
        if (typeRaw.includes('part')) employmentType = 'Part-time';
        else if (typeRaw.includes('contract')) employmentType = 'Contract';

        // Department matching
        let department = deptRaw;
        if (!department) {
          department = availableDepartments[0]?.name || 'Academic Faculty';
        } else {
          const match = availableDepartments.find(
            d => d.name.toLowerCase() === department.toLowerCase() ||
                 (d.khmerName && d.khmerName === department)
          );
          if (match) department = match.name;
        }

        // Validation
        const validationErrors: string[] = [];
        if (!fullName) {
          validationErrors.push('Missing Full Name');
        }
        if (!subject) {
          validationErrors.push('Missing Subject');
        }

        const isDuplicateId = existingTeacherIds.has(teacherId.toLowerCase()) || seenFileTeacherIds.has(teacherId.toLowerCase());
        if (isDuplicateId) {
          validationErrors.push(`Teacher ID "${teacherId}" already exists`);
        }
        seenFileTeacherIds.add(teacherId.toLowerCase());

        parsed.push({
          id: `tch-imp-${Date.now()}-${i}`,
          teacherId,
          employeeId,
          fullName,
          khmerName,
          englishName: fullName,
          gender,
          dateOfBirth: '1990-01-01',
          department,
          position,
          subject,
          hourlyRate: numericRate,
          phone: phoneCol >= 0 ? getVal(phoneCol) : '+855 ',
          email: emailCol >= 0 ? getVal(emailCol) : `${fullName.toLowerCase().replace(/\s+/g, '.')}@edutrack.edu.kh`,
          telegramChatId: telegramCol >= 0 ? getVal(telegramCol) : '',
          employmentType,
          status,
          joinDate: joinDateCol >= 0 && getVal(joinDateCol) ? getVal(joinDateCol) : new Date().toISOString().split('T')[0],
          assignedLocation: locationCol >= 0 && getVal(locationCol) ? getVal(locationCol) : 'Main Campus',
          assignedScheduleId: 'sch-teacher-default',
          isValid: validationErrors.length === 0,
          validationErrors,
          isDuplicateId
        });
      }

      setParsedRows(parsed);
    } catch (err: any) {
      console.error('Failed to parse teacher CSV:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      processRawData(text);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPastedText(val);
    processRawData(val);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  // Perform Final Import
  const handleExecuteImport = () => {
    const validRows = parsedRows.filter(r => r.isValid || !r.validationErrors.includes('Missing Full Name'));
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const newTeachers: Teacher[] = validRows.map(r => ({
      id: `tch-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      teacherId: r.teacherId,
      employeeId: r.employeeId,
      fullName: r.fullName,
      khmerName: r.khmerName || '',
      englishName: r.fullName,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth || '1990-01-01',
      phone: r.phone || '',
      email: r.email || '',
      telegramChatId: r.telegramChatId || '',
      department: r.department,
      position: r.position,
      subject: r.subject,
      employmentType: r.employmentType,
      joinDate: r.joinDate,
      photoUrl: '',
      status: r.status,
      assignedLocation: r.assignedLocation,
      assignedScheduleId: r.assignedScheduleId,
      hourlyRate: r.hourlyRate || 25,
      currency: 'USD'
    }));

    if (importConflictStrategy === 'replace_all') {
      StorageService.saveTeachers(newTeachers);
    } else {
      StorageService.addTeachersBatch(newTeachers, 'append');
    }

    StorageService.addAuditLog({
      userId: currentUser?.id || 'admin',
      userName: currentUser?.fullName || 'Administrator',
      userRole: currentUser?.role || 'admin',
      action: 'Imported Teachers',
      target: `${newTeachers.length} Teachers`,
      details: `Bulk imported ${newTeachers.length} teachers via CSV (${importConflictStrategy} mode)`,
      ipAddress: '127.0.0.1'
    });

    setIsProcessing(false);
    onSuccess(newTeachers.length);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const issueCount = parsedRows.filter(r => !r.isValid).length;

  const displayedRows = parsedRows.filter(r => {
    if (activeFilter === 'valid') return r.isValid;
    if (activeFilter === 'issues') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>{isKhmer ? 'នាំចូលបញ្ជីគ្រូបង្រៀន (Import Teachers)' : 'Import Teachers Roster (CSV / Excel)'}</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Bulk CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-khmer mt-0.5">
                {isKhmer
                  ? 'បញ្ចូលព័ត៌មានសាស្ត្រាចារ្យជាដុំតាមរយៈឯកសារ CSV ឬចម្លងពី Excel / Google Sheets'
                  : 'Import faculty profiles, subject specializations, teaching rates, and departments seamlessly'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              title="Download CSV Template"
            >
              <Download className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">{isKhmer ? 'ទាញយកគំរូ CSV' : 'Sample Template'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Input Method Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  inputMode === 'upload'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isKhmer ? 'ផ្ទុកឯកសារឡើង (Upload File)' : 'Upload CSV / TSV'}</span>
              </button>

              <button
                onClick={() => setInputMode('paste')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  inputMode === 'paste'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>{isKhmer ? 'ចម្លងដាក់ទីនេះ (Paste Text)' : 'Paste from Excel / Sheets'}</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden sm:block">
              {isKhmer ? 'ទ្រទ្រង់ UTF-8 ភាសាខ្មែរ និងអង់គ្លេស' : 'Supports Khmer & English (UTF-8)'}
            </div>
          </div>

          {/* Upload Dropzone */}
          {inputMode === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .tsv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? fileName : (isKhmer ? 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ CSV ឬអូសទម្លាក់' : 'Click to select CSV file or drag and drop here')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isKhmer ? 'គាំទ្រទម្រង់ .CSV, .TSV (Comma / Tab delimited)' : 'Supports .CSV, .TSV format (Max 5MB)'}
              </p>
            </div>
          )}

          {/* Paste Area */}
          {inputMode === 'paste' && (
            <div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={handlePasteChange}
                placeholder="Paste tab-separated or comma-separated rows from Excel / Google Sheets here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
              />
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>{isKhmer ? 'ទិន្នន័យបានត្រួតពិនិត្យ' : 'Parsed Faculty'}:</span>
                    <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-lg">
                      {parsedRows.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        activeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({parsedRows.length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('valid')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        activeFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Ready ({validCount})
                    </button>
                    {issueCount > 0 && (
                      <button
                        onClick={() => setActiveFilter('issues')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          activeFilter === 'issues' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        Warnings ({issueCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Conflict Strategy */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">{isKhmer ? 'វិធីសាស្ត្រនាំចូល៖' : 'Mode:'}</span>
                  <select
                    value={importConflictStrategy}
                    onChange={e => setImportConflictStrategy(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="append">{isKhmer ? 'បន្ថែម និងធ្វើបច្ចុប្បន្នភាព (Append / Update)' : 'Append & Update Existing'}</option>
                    <option value="replace_all">{isKhmer ? 'ជំនួសបញ្ជីទាំងអស់ (Replace All)' : 'Replace All Teachers'}</option>
                  </select>
                </div>
              </div>

              {/* Table of Parsed Teachers */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white sticky top-0 z-10 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Teacher ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Hourly Rate</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedRows.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full cursor-help"
                                title={row.validationErrors.join(', ')}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {row.validationErrors[0]}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {row.teacherId}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{row.fullName}</div>
                            {row.khmerName && (
                              <div className="text-[10px] text-slate-500 font-khmer">{row.khmerName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium">
                              {row.department}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {row.subject}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                            ${row.hourlyRate.toFixed(2)}/h
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                            <div>{row.phone}</div>
                            <div className="text-[10px] text-slate-400">{row.telegramChatId}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                Ready to import <strong className="text-indigo-600">{validCount}</strong> of {parsedRows.length} teachers.
              </span>
            ) : (
              <span>Please upload a CSV file or paste spreadsheet data to preview.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isProcessing
                  ? (isKhmer ? 'កំពុងដំណើរការ...' : 'Importing...')
                  : (isKhmer ? `នាំចូលគ្រូ ${validCount} នាក់` : `Import ${validCount} Teachers`)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
