/**
 * generate_teacher_video_manual.js
 * Programmatically generates a 1080p Full HD Video Manual with REAL UI ACTIONS on authentic EduTrack interface.
 * Features animated cursor movement, tactile click ripples, keypad PIN entry, GPS attendance check-in,
 * schedule navigation, and export actions.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.resolve('public/downloads');
const TEMP_DIR = path.resolve('temp_video_build');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Common SVG Header / CSS styles to mimic Tailwind + EduTrack theme
const COMMON_DEFS = `
  <defs>
    <linearGradient id="bgNavy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="40%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="appHeaderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="timelineDeepBlue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0b2a5e"/>
      <stop offset="50%" stop-color="#09224c"/>
      <stop offset="100%" stop-color="#071b38"/>
    </linearGradient>
    <linearGradient id="qrModalHeader" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#3730a3"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="emeraldBtn" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <filter id="softShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="cardShadow" x="-3%" y="-3%" width="106%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
  </defs>
`;

// Helper: XML Escaper
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: Action Mouse Cursor Graphic with optional click ripple and text label
function renderCursor(x, y, isClick = false, label = '') {
  if (x === undefined || y === undefined || x === null || y === null) return '';
  const labelWidth = Math.max(70, (label || '').length * 8 + 24);
  return `
  <!-- Animated Action Cursor Overlay -->
  <g transform="translate(${x}, ${y})">
    ${isClick ? `
      <circle cx="0" cy="0" r="34" fill="none" stroke="#38bdf8" stroke-width="4" opacity="0.9"/>
      <circle cx="0" cy="0" r="18" fill="#38bdf8" fill-opacity="0.3"/>
    ` : ''}
    <path d="M 0 0 L 0 28 L 7 21 L 15 32 L 19 30 L 11 19 L 21 19 Z" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" filter="url(#softShadow)"/>
    ${label ? `
      <rect x="24" y="-12" width="${labelWidth}" height="28" rx="8" fill="#0f172a" fill-opacity="0.95" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="${24 + labelWidth / 2}" y="7" fill="#38bdf8" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">${esc(label)}</text>
    ` : ''}
  </g>
  `;
}

// Helper: Common Left Educational Panel
function renderLeftPanel(moduleNum, titleEn, titleKm, step1, step2, step3, step4) {
  return `
  <!-- Left Side: Step-by-Step Training Instruction Panel -->
  <g transform="translate(100, 140)">
    <!-- Module Badge -->
    <rect x="0" y="0" width="140" height="36" rx="18" fill="#3b82f6" fill-opacity="0.2" stroke="#60a5fa" stroke-width="1.5"/>
    <text x="70" y="24" fill="#93c5fd" font-size="14" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">MODULE 0${moduleNum}</text>

    <!-- Module Title -->
    <text x="0" y="75" fill="#ffffff" font-size="34" font-weight="900" font-family="Liberation Sans, sans-serif">${esc(titleEn)}</text>
    <text x="0" y="112" fill="#93c5fd" font-size="22" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(titleKm)}</text>

    <!-- Steps Stack -->
    <g transform="translate(0, 140)">
      <!-- Step 1 -->
      <rect x="0" y="0" width="760" height="135" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="50" cy="67" r="26" fill="#2563eb"/>
      <text x="50" y="75" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">1</text>
      <text x="95" y="45" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(step1.title)}</text>
      <text x="95" y="75" fill="#93c5fd" font-size="15" font-family="Liberation Sans, sans-serif">${esc(step1.desc)}</text>
      <text x="95" y="105" fill="#cbd5e1" font-size="13" font-family="Liberation Sans, sans-serif">${esc(step1.km)}</text>

      <!-- Step 2 -->
      <rect x="0" y="155" width="760" height="135" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="50" cy="222" r="26" fill="#2563eb"/>
      <text x="50" y="230" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">2</text>
      <text x="95" y="200" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(step2.title)}</text>
      <text x="95" y="230" fill="#93c5fd" font-size="15" font-family="Liberation Sans, sans-serif">${esc(step2.desc)}</text>
      <text x="95" y="260" fill="#cbd5e1" font-size="13" font-family="Liberation Sans, sans-serif">${esc(step2.km)}</text>

      <!-- Step 3 -->
      <rect x="0" y="310" width="760" height="135" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="50" cy="377" r="26" fill="#2563eb"/>
      <text x="50" y="385" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">3</text>
      <text x="95" y="355" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(step3.title)}</text>
      <text x="95" y="385" fill="#93c5fd" font-size="15" font-family="Liberation Sans, sans-serif">${esc(step3.desc)}</text>
      <text x="95" y="415" fill="#cbd5e1" font-size="13" font-family="Liberation Sans, sans-serif">${esc(step3.km)}</text>

      <!-- Step 4 / Pro Tip -->
      <rect x="0" y="465" width="760" height="135" rx="18" fill="#047857" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
      <circle cx="50" cy="532" r="26" fill="#10b981"/>
      <text x="50" y="540" fill="#ffffff" font-size="22" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">✓</text>
      <text x="95" y="510" fill="#34d399" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(step4.title)}</text>
      <text x="95" y="540" fill="#a7f3d0" font-size="15" font-family="Liberation Sans, sans-serif">${esc(step4.desc)}</text>
      <text x="95" y="570" fill="#e2e8f0" font-size="13" font-family="Liberation Sans, sans-serif">${esc(step4.km)}</text>
    </g>
  </g>
  `;
}

// Scene Definitions with Multi-Frame Real Action
const scenes = [
  // 1. INTRO (8s)
  {
    id: 'scene_01_intro',
    frames: [
      {
        duration: 8,
        renderSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  <!-- Glowing Aura -->
  <circle cx="960" cy="360" r="320" fill="#3b82f6" opacity="0.12"/>

  <!-- Real EduTrack Header Pill -->
  <g transform="translate(710, 100)">
    <rect width="500" height="56" rx="28" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" filter="url(#softShadow)"/>
    <circle cx="36" cy="28" r="16" fill="url(#appHeaderGrad)"/>
    <text x="36" y="34" fill="#ffffff" font-size="16" font-family="Liberation Sans, sans-serif" text-anchor="middle">🏛</text>
    <text x="68" y="35" fill="#ffffff" font-size="18" font-weight="900" font-family="Liberation Sans, sans-serif" letter-spacing="1">EDUTRACK ACADEMIC MIS</text>
    <rect x="400" y="14" width="84" height="28" rx="14" fill="#3b82f6" fill-opacity="0.3"/>
    <text x="442" y="33" fill="#60a5fa" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">FACULTY</text>
  </g>

  <!-- Title -->
  <text x="960" y="270" fill="#ffffff" font-size="58" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle" letter-spacing="-1">
    TEACHER VIDEO USER MANUAL
  </text>
  <text x="960" y="330" fill="#93c5fd" font-size="30" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">
    វីដេអូណែនាំការប្រើប្រាស់សម្រាប់គ្រូបង្រៀន (ចាប់ពីដំឡើងរហូតដល់បញ្ចប់)
  </text>
  <text x="960" y="380" fill="#cbd5e1" font-size="20" font-family="Liberation Sans, sans-serif" text-anchor="middle">
    Real Interface Action • PWA App Install • Faculty PIN Sign-In • Weekly Timeline • GPS Kiosk • Personal QR • Gross Wages
  </text>

  <!-- Real 7 Module Cards in 1 Row -->
  <g transform="translate(110, 470)">
    ${[
      { num: '01', title: 'PWA Install', sub: 'Mobile & PC Apps', km1: 'ដំឡើងកម្មវិធី', km2: 'ប្រើ Offline', icon: '📱', color: '#3b82f6' },
      { num: '02', title: 'Login & PIN', sub: '4-Digit Secret PIN', km1: 'ចូលតាម PIN', km2: 'សុវត្ថិភាពខ្ពស់', icon: '🔑', color: '#3b82f6' },
      { num: '03', title: 'Weekly Timeline', sub: 'Classroom Timetable', km1: 'កាលវិភាគ ៧ថ្ងៃ', km2: 'បន្ទប់ & មុខវិជ្ជា', icon: '📅', color: '#3b82f6' },
      { num: '04', title: 'Attendance GPS', sub: 'Check-In Terminal', km1: 'ស្កេនវត្តមាន', km2: 'GPS បរិវេណសាលា', icon: '📍', color: '#10b981' },
      { num: '05', title: 'Personal QR', sub: 'Door Sign Poster', km1: 'កូដ QR ផ្ទាល់ខ្លួន', km2: 'ស្លាកបិទទ្វារថ្នាក់', icon: '🏁', color: '#3b82f6' },
      { num: '06', title: 'Leave & Breaks', sub: 'Holiday Calendar', km1: 'សុំច្បាប់សម្រាក', km2: 'បុណ្យជាតិ', icon: '🌴', color: '#3b82f6' },
      { num: '07', title: 'Wage Summary', sub: 'Gross Pay Ledger', km1: 'ម៉ោងបង្រៀនពិត', km2: 'ប្រាក់ឈ្នួលសរុប', icon: '💵', color: '#10b981' },
    ].map((m, idx) => `
      <g transform="translate(${idx * 245}, 0)">
        <rect width="220" height="280" rx="20" fill="#1e293b" stroke="${m.color}" stroke-width="2" filter="url(#softShadow)"/>
        <rect x="20" y="20" width="46" height="46" rx="14" fill="${m.color}" fill-opacity="0.25"/>
        <text x="43" y="49" fill="#60a5fa" font-size="22" font-family="Liberation Sans, sans-serif" text-anchor="middle">${m.icon}</text>
        <text x="20" y="98" fill="#60a5fa" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">MODULE ${m.num}</text>
        <text x="20" y="128" fill="#ffffff" font-size="19" font-weight="bold" font-family="Liberation Sans, sans-serif">${esc(m.title)}</text>
        <text x="20" y="155" fill="#94a3b8" font-size="13" font-family="Liberation Sans, sans-serif">${esc(m.sub)}</text>
        <text x="20" y="195" fill="#cbd5e1" font-size="12" font-family="Liberation Sans, sans-serif">${esc(m.km1)}</text>
        <text x="20" y="220" fill="#cbd5e1" font-size="12" font-family="Liberation Sans, sans-serif">${esc(m.km2)}</text>
      </g>
    `).join('')}
  </g>

  <!-- Bottom Bar -->
  <rect x="0" y="980" width="1920" height="100" fill="#020617"/>
  <text x="120" y="1038" fill="#64748b" font-size="18" font-family="Liberation Sans, sans-serif">
    EduTrack Academic Management • Full HD 1080p Downloadable Faculty Video Manual
  </text>
  <text x="1800" y="1038" fill="#38bdf8" font-size="18" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="end">
    Official Training Resource for Teachers
  </text>
</svg>
        `
      }
    ]
  },

  // 2. PWA INSTALLATION (10s total: 4s + 3s + 3s)
  {
    id: 'scene_02_install',
    frames: [
      {
        duration: 4,
        renderSvg: () => renderInstallScene(1210, 560, false, 'Hover "Install App"')
      },
      {
        duration: 3,
        renderSvg: () => renderInstallScene(1210, 560, true, 'Click "Install App"')
      },
      {
        duration: 3,
        renderSvg: () => renderInstallScene(null, null, false, '', true)
      }
    ]
  },

  // 3. LOGIN & PIN (9s total: 3s + 2s + 2s + 2s)
  {
    id: 'scene_03_login',
    frames: [
      {
        duration: 3,
        renderSvg: () => renderLoginScene(1235, 300, false, 'Select Staff PIN', 0)
      },
      {
        duration: 2,
        renderSvg: () => renderLoginScene(1050, 615, true, 'Enter [1]', 1)
      },
      {
        duration: 2,
        renderSvg: () => renderLoginScene(1185, 615, true, 'Enter [2]', 2)
      },
      {
        duration: 2,
        renderSvg: () => renderLoginScene(1320, 840, true, 'PIN Verified ✓', 4, true)
      }
    ]
  },

  // 4. WEEKLY SCHEDULE TIMELINE (11s total: 3s + 4s + 4s)
  {
    id: 'scene_04_schedule',
    frames: [
      {
        duration: 3,
        renderSvg: () => renderScheduleScene(1240, 285, false, 'Hover Wednesday', 'Mon')
      },
      {
        duration: 4,
        renderSvg: () => renderScheduleScene(1240, 285, true, 'Click Wednesday', 'Wed')
      },
      {
        duration: 4,
        renderSvg: () => renderScheduleScene(1240, 420, true, 'CS-201 Room 304', 'Wed', true)
      }
    ]
  },

  // 5. ATTENDANCE & GPS CHECK-IN (11s total: 3s + 4s + 4s)
  {
    id: 'scene_05_kiosk',
    frames: [
      {
        duration: 3,
        renderSvg: () => renderKioskScene(1235, 685, false, 'GPS Verifying Coordinates', false)
      },
      {
        duration: 4,
        renderSvg: () => renderKioskScene(1235, 770, false, 'Hover CHECK IN NOW', false)
      },
      {
        duration: 4,
        renderSvg: () => renderKioskScene(1235, 770, true, 'Checked In Successfully ✓', true)
      }
    ]
  },

  // 6. PERSONAL QR BADGE & DOOR SIGN (9s total: 3s + 3s + 3s)
  {
    id: 'scene_06_qr',
    frames: [
      {
        duration: 3,
        renderSvg: () => renderQrScene(1360, 860, false, 'Hover Print Door Sign', false)
      },
      {
        duration: 3,
        renderSvg: () => renderQrScene(1360, 860, true, 'Click Print Door Sign', false)
      },
      {
        duration: 3,
        renderSvg: () => renderQrScene(null, null, false, '', true)
      }
    ]
  },

  // 7. LEAVE REQUESTS (9s total: 3s + 3s + 3s)
  {
    id: 'scene_07_leave',
    frames: [
      {
        duration: 3,
        renderSvg: () => renderLeaveScene(1400, 280, true, 'Click + New Request', false)
      },
      {
        duration: 3,
        renderSvg: () => renderLeaveScene(1240, 720, true, 'Submit Sick Leave Form', true)
      },
      {
        duration: 3,
        renderSvg: () => renderLeaveScene(null, null, false, '', false, true)
      }
    ]
  },

  // 8. WAGES & REPORTS (10s total: 4s + 3s + 3s)
  {
    id: 'scene_08_wages',
    frames: [
      {
        duration: 4,
        renderSvg: () => renderWageScene(1110, 870, false, '38.0 Verified Hours', false)
      },
      {
        duration: 3,
        renderSvg: () => renderWageScene(1110, 870, true, 'Export to CSV / Excel', false)
      },
      {
        duration: 3,
        renderSvg: () => renderWageScene(null, null, false, '', true)
      }
    ]
  }
];

// Scene 2 Renderer: PWA Install
function renderInstallScene(cursorX, cursorY, isClick, label, isInstalled = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    1,
    'PWA App Installation',
    'ការដំឡើងកម្មវិធីលើទូរស័ព្ទដៃ (Android &amp; iOS) និងកុំព្យូទ័រ',
    {
      title: 'Enter School Web Link in Browser',
      desc: 'Open Google Chrome (Android/PC) or Safari (iPhone/iPad), tap the top address bar, and enter https://edutrack.edu.kh.',
      km: 'បើក Chrome ឬ Safari រួចចុចលើរបារអាសយដ្ឋានខាងលើ និងវាយ https://edutrack.edu.kh'
    },
    {
      title: 'Android: Tap "Install App" or Browser Menu (⋮)',
      desc: 'Tap "Install App" directly from the bottom banner or select "Add to Home Screen".',
      km: 'ចុចលើប៊ូតុង "ដំឡើងកម្មវិធី" ឬចុចសញ្ញាចុចបី (⋮) រួចជ្រើស "Add to Home screen"'
    },
    {
      title: 'iPhone (iOS): Tap Share (⎋) → "Add to Home Screen"',
      desc: 'Tap the Safari Share icon at bottom center and select "Add to Home Screen".',
      km: 'លើ iPhone៖ ចុចប៊ូតុង Share (⎋) នៅខាងក្រោម រួចជ្រើស "Add to Home Screen"'
    },
    {
      title: 'PRO TIP: Offline Mode Supported',
      desc: 'EduTrack automatically caches your weekly teaching schedule for offline access without internet.',
      km: 'គន្លឹះសំខាន់៖ កម្មវិធីរក្សាទុកកាលវិភាគបង្រៀនក្នុងម៉ាស៊ីន អាចបើកមើលបានទោះគ្មានអ៊ីនធឺណិត'
    }
  )}

  <!-- Right: Phone Mockup Frame -->
  <g transform="translate(1000, 100)">
    <rect width="500" height="880" rx="44" fill="#0f172a" stroke="#334155" stroke-width="6" filter="url(#softShadow)"/>
    <rect x="180" y="16" width="140" height="20" rx="10" fill="#1e293b"/>

    <g transform="translate(16, 48)">
      <rect width="468" height="800" rx="32" fill="#f8fafc"/>

      <!-- Real Web Browser Top Address Bar -->
      <rect width="468" height="46" rx="16" fill="#0b1b36"/>
      <rect x="10" y="7" width="448" height="32" rx="14" fill="#051024" stroke="#1e3a8a" stroke-width="1"/>
      <text x="26" y="28" fill="#10b981" font-size="12">🔒</text>
      <text x="46" y="28" fill="#93c5fd" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">https://edutrack.edu.kh</text>
      <text x="440" y="27" fill="#64748b" font-size="14" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">⋮</text>

      <!-- App Header Bar -->
      <g transform="translate(0, 46)">
        <rect width="468" height="64" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
        <rect x="16" y="12" width="40" height="40" rx="12" fill="url(#appHeaderGrad)"/>
        <text x="36" y="38" fill="#ffffff" font-size="20" font-family="Liberation Sans, sans-serif" text-anchor="middle">🏛</text>
        <text x="68" y="30" fill="#0f172a" font-size="15" font-weight="bold" font-family="Liberation Sans, sans-serif">EduTrack Academy</text>
        <text x="68" y="47" fill="#64748b" font-size="11" font-family="Liberation Sans, sans-serif">Faculty Portal</text>
      </g>

      <!-- App Body Content Background -->
      <rect x="16" y="80" width="436" height="110" rx="20" fill="#0f172a"/>
      <text x="36" y="112" fill="#93c5fd" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif">FACULTY DASHBOARD</text>
      <text x="36" y="140" fill="#ffffff" font-size="20" font-weight="bold" font-family="Liberation Sans, sans-serif">Welcome, Dr. Sovann</text>
      <text x="36" y="165" fill="#94a3b8" font-size="12" font-family="Liberation Sans, sans-serif">Today: 3 Scheduled Classes • Next: 08:00 AM</text>

      <!-- Real PWA Install Banner Overlay -->
      <g transform="translate(24, 215)">
        <rect width="420" height="380" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#softShadow)"/>
        <circle cx="210" cy="65" r="36" fill="${isInstalled ? '#ecfdf5' : '#eff6ff'}"/>
        <text x="210" y="77" fill="${isInstalled ? '#10b981' : '#2563eb'}" font-size="34" font-family="Liberation Sans, sans-serif" text-anchor="middle">${isInstalled ? '✓' : '📲'}</text>

        <text x="210" y="140" fill="#0f172a" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ${isInstalled ? 'App Successfully Installed!' : 'Install EduTrack App'}
        </text>
        <text x="210" y="170" fill="#475569" font-size="14" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ${isInstalled ? 'Native standalone icon created on your home screen' : 'Install to your Home Screen for faster access'}
        </text>
        <text x="210" y="192" fill="#64748b" font-size="13" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ${isInstalled ? 'Works completely offline without web browser URL bar' : 'Works offline with zero web browser address bars'}
        </text>

        <!-- Feature Pills -->
        <rect x="40" y="215" width="340" height="34" rx="10" fill="#f1f5f9"/>
        <text x="210" y="237" fill="#334155" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">✓ Instant 1-Tap Home Screen Access</text>

        <rect x="40" y="255" width="340" height="34" rx="10" fill="#f1f5f9"/>
        <text x="210" y="277" fill="#334155" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">✓ Offline Timetable &amp; QR Attendance Sync</text>

        <!-- Install Button -->
        <rect x="40" y="305" width="340" height="52" rx="16" fill="${isInstalled ? '#059669' : '#2563eb'}"/>
        <text x="210" y="337" fill="#ffffff" font-size="16" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ${isInstalled ? '✓ APP READY ON HOME SCREEN' : 'INSTALL APP NOW'}
        </text>
      </g>
    </g>
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 3 Renderer: Login & PIN
function renderLoginScene(cursorX, cursorY, isClick, label, pinCount = 0, isVerified = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    2,
    'Faculty Login &amp; PIN Authentication',
    'ការចូលប្រើប្រាស់ និងផ្ទៀងផ្ទាត់លេខកូដសម្ងាត់ ៤ ខ្ទង់',
    {
      title: 'Select "Staff PIN" or "Phone" Tab',
      desc: 'EduTrack login card offers 3 fast modes: Phone Login, Staff PIN, or Standard Email.',
      km: 'ជ្រើសរើសផ្ទាំង "កូដគ្រូ PIN (Staff PIN)" ឬផ្ទាំងទូរស័ព្ទ'
    },
    {
      title: 'Enter Faculty ID / Phone Number',
      desc: 'Enter your teacher code (e.g. TCH-001) or your registered school mobile number.',
      km: 'បញ្ចូលអត្តលេខគ្រូ (ឧ. TCH-001) ឬលេខទូរស័ព្ទដែលបានចុះឈ្មោះ'
    },
    {
      title: 'Enter Confidential 4-Digit Security PIN',
      desc: 'Type your secret 4-digit PIN code to instantly authenticate your session.',
      km: 'បញ្ចូលលេខកូដសម្ងាត់ ៤ ខ្ទង់របស់អ្នក (Default PIN: 1234)'
    },
    {
      title: 'Strict Teacher Role Isolation',
      desc: 'Logged-in teachers view their own schedule, personal QR badge and wages with zero access leaks.',
      km: 'ប្រព័ន្ធកំណត់សិទ្ធិយ៉ាងតឹងរ៉ឹង៖ មើលបានតែកាលវិភាគ និងកូដ QR ផ្ទាល់ខ្លួនប៉ុណ្ណោះ'
    }
  )}

  <!-- Right: Real EduTrack LoginPage Card -->
  <g transform="translate(1000, 110)">
    <rect width="520" height="880" rx="36" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" filter="url(#softShadow)"/>

    <!-- Top Card Header Gradient -->
    <rect width="520" height="175" rx="36" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
    
    <rect x="150" y="24" width="220" height="30" rx="15" fill="#e0e7ff"/>
    <text x="260" y="44" fill="#3730a3" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">🛡 Institutional Secure Login</text>

    <text x="260" y="88" fill="#0f172a" font-size="28" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">Sign in to EduTrack</text>
    <text x="260" y="115" fill="#64748b" font-size="14" font-family="Liberation Sans, sans-serif" text-anchor="middle">ចូលប្រើប្រព័ន្ធ EduTrack (គ្រូបង្រៀន)</text>
    <text x="260" y="142" fill="#64748b" font-size="13" font-family="Liberation Sans, sans-serif" text-anchor="middle">Fast PIN access for faculty members</text>

    <!-- 3 Mode Switcher Tabs -->
    <g transform="translate(25, 200)">
      <rect width="470" height="48" rx="16" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/>
      <text x="78" y="30" fill="#64748b" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">📱 Phone</text>

      <rect x="156" y="4" width="158" height="40" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" filter="url(#cardShadow)"/>
      <text x="235" y="29" fill="#4338ca" font-size="13" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">🔑 Staff PIN (គ្រូ)</text>

      <text x="392" y="30" fill="#64748b" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">✉ Email / Pwd</text>
    </g>

    <!-- Faculty ID Input Field -->
    <g transform="translate(25, 275)">
      <text x="4" y="16" fill="#334155" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">FACULTY / STAFF ID (លេខសម្គាល់គ្រូ)</text>
      <rect x="0" y="28" width="470" height="54" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="20" y="62" fill="#0f172a" font-size="16" font-weight="bold" font-family="Liberation Sans, sans-serif">Dr. Sovann Vichea (TCH-001)</text>
      <rect x="360" y="38" width="94" height="32" rx="8" fill="#eff6ff"/>
      <text x="407" y="59" fill="#2563eb" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">VERIFIED</text>
    </g>

    <!-- 4-Digit Security PIN Section -->
    <g transform="translate(25, 380)">
      <text x="4" y="16" fill="#334155" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">4-DIGIT SECURITY PIN (លេខកូដសម្ងាត់ ៤ ខ្ទង់)</text>
      <!-- PIN Indicators -->
      <g transform="translate(85, 30)">
        ${[0, 1, 2, 3].map(i => `
          <rect x="${i * 80}" y="0" width="60" height="66" rx="16" fill="${pinCount > i ? '#eff6ff' : '#f8fafc'}" stroke="${pinCount > i ? '#2563eb' : '#cbd5e1'}" stroke-width="${pinCount > i ? '2.5' : '1.5'}"/>
          <text x="${i * 80 + 30}" y="44" fill="${pinCount > i ? '#1e40af' : 'transparent'}" font-size="34" font-weight="black" font-family="Liberation Sans, sans-serif" text-anchor="middle">•</text>
        `).join('')}
      </g>
    </g>

    <!-- Numeric Keypad Grid (3x4) -->
    <g transform="translate(75, 510)">
      ${[
        { num: '1', x: 50, y: 40, active: pinCount >= 1 },
        { num: '2', x: 185, y: 40, active: pinCount >= 2 },
        { num: '3', x: 320, y: 40, active: pinCount >= 3 },
        { num: '4', x: 50, y: 115, active: pinCount >= 4 },
        { num: '5', x: 185, y: 115 },
        { num: '6', x: 320, y: 115 },
        { num: '7', x: 50, y: 190 },
        { num: '8', x: 185, y: 190 },
        { num: '9', x: 320, y: 190 },
        { num: 'CLEAR', x: 50, y: 265, color: '#dc2626', bg: '#fee2e2' },
        { num: '0', x: 185, y: 265 },
        { num: 'SIGN IN', x: 320, y: 265, color: '#ffffff', bg: isVerified ? '#059669' : '#2563eb' },
      ].map(b => `
        <circle cx="${b.x}" cy="${b.y}" r="32" fill="${b.bg || (b.active ? '#eff6ff' : '#f8fafc')}" stroke="${b.active ? '#2563eb' : '#cbd5e1'}" stroke-width="${b.active ? '2.5' : '1.5'}"/>
        <text x="${b.x}" y="${b.y + 8}" fill="${b.color || (b.active ? '#1e40af' : '#0f172a')}" font-size="${b.num.length > 2 ? '13' : '24'}" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">${b.num}</text>
      `).join('')}
    </g>

    ${isVerified ? `
      <!-- Verification Success Banner -->
      <g transform="translate(45, 810)">
        <rect width="430" height="50" rx="16" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="2"/>
        <text x="215" y="31" fill="#047857" font-size="14" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ✓ ACCESS GRANTED • WELCOME DR. SOVANN VICHEA
        </text>
      </g>
    ` : ''}
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 4 Renderer: Weekly Schedule
function renderScheduleScene(cursorX, cursorY, isClick, label, activeDay = 'Mon', isClassClicked = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    3,
    'Weekly Teaching Schedule',
    'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ និងប្រតិទិន Timeline ៧ថ្ងៃ',
    {
      title: 'Month Picker Header (e.g. January ∨)',
      desc: 'Click on the Month dropdown to expand a mini monthly picker to jump to any date.',
      km: 'ចុចលើឈ្មោះខែ (January ∨) ដើម្បីពន្លាតប្រតិទិនប្រចាំខែ និងជ្រើសថ្ងៃ'
    },
    {
      title: '7-Day Strip Navigation (Mon - Sat)',
      desc: 'Active day is highlighted with a prominent blue pill showing date numbers.',
      km: 'របារថ្ងៃប្រចាំសប្តាហ៍ ៧ថ្ងៃ ជាមួយប៊ូតុងរំលេចពណ៌ខៀវលើថ្ងៃដែលបានជ្រើស'
    },
    {
      title: 'Deep Blue Timeline Class Event Cards',
      desc: 'Each card shows bell time, period badge, subject title, room number and teacher avatar.',
      km: 'កាតម៉ោងបង្រៀនបង្ហាញម៉ោងច្បាស់លាស់ មុខវិជ្ជា បន្ទប់រៀន និងរូបថតគ្រូ'
    },
    {
      title: 'Interactive Schedule Check-In & Check-Out',
      desc: 'Tap "Check In Class" on the active card to start teaching. When session finishes, tap "Check Out Class" to log verified hours.',
      km: 'ចុច "ស្កេនចូល" លើកាតម៉ោងបង្រៀន ដើម្បីចាប់ផ្តើមបង្រៀន និងចុច "ស្កេនចេញ" ពេលចប់ម៉ោង'
    }
  )}

  <!-- Right: Real Weekly Timeline UI -->
  <g transform="translate(1000, 100)">
    <rect width="520" height="880" rx="36" fill="#071b38" stroke="#1e3a8a" stroke-width="2" filter="url(#softShadow)"/>

    <!-- Header Bar -->
    <rect width="520" height="74" rx="36" fill="#0b2a5e"/>
    <text x="25" y="44" fill="#ffffff" font-size="20" font-weight="900" font-family="Liberation Sans, sans-serif">January 2026 ∨</text>

    <!-- 7 Day Strip -->
    <g transform="translate(20, 90)">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => {
        const isCurrent = d === activeDay;
        return `
          <g transform="translate(${idx * 80}, 0)">
            <rect width="72" height="64" rx="16" fill="${isCurrent ? '#2563eb' : '#0f274a'}" stroke="${isCurrent ? '#60a5fa' : '#1e3a8a'}" stroke-width="${isCurrent ? '2' : '1'}"/>
            <text x="36" y="28" fill="${isCurrent ? '#ffffff' : '#94a3b8'}" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">${d}</text>
            <text x="36" y="50" fill="${isCurrent ? '#ffffff' : '#cbd5e1'}" font-size="16" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">${12 + idx}</text>
          </g>
        `;
      }).join('')}
    </g>

    <!-- Timeline Event Cards -->
    <g transform="translate(20, 180)">
      <!-- Class 1 -->
      <g transform="translate(0, 0)">
        <rect width="480" height="150" rx="22" fill="${isClassClicked ? '#1e40af' : '#0b2a5e'}" stroke="${isClassClicked ? '#60a5fa' : '#1d4ed8'}" stroke-width="${isClassClicked ? '3' : '1.5'}" filter="url(#cardShadow)"/>
        <rect x="18" y="18" width="110" height="30" rx="10" fill="#2563eb"/>
        <text x="73" y="38" fill="#ffffff" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">08:00 - 09:30</text>
        <rect x="360" y="18" width="100" height="30" rx="10" fill="#10b981" fill-opacity="0.3"/>
        <text x="410" y="38" fill="#34d399" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">Room 304</text>
        <text x="18" y="80" fill="#ffffff" font-size="18" font-weight="900" font-family="Liberation Sans, sans-serif">CS-201 Data Structures &amp; Algorithms</text>
        <text x="18" y="105" fill="#93c5fd" font-size="13" font-family="Liberation Sans, sans-serif">Faculty: Dr. Sovann Vichea • Year 2 Semester 1</text>
        <text x="18" y="130" fill="${isClassClicked ? '#38bdf8' : '#34d399'}" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif">
          ${isClassClicked ? '● Session Active (In: 08:00 AM)' : '● Current Schedule Ready'}
        </text>
        <rect x="330" y="112" width="130" height="28" rx="8" fill="${isClassClicked ? '#f59e0b' : '#2563eb'}"/>
        <text x="395" y="130" fill="${isClassClicked ? '#0f172a' : '#ffffff'}" font-size="11" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ${isClassClicked ? '✓ Check Out Class' : '▶ Check In Class'}
        </text>
      </g>

      <!-- Class 2 -->
      <g transform="translate(0, 170)">
        <rect width="480" height="150" rx="22" fill="#0b2a5e" stroke="#1d4ed8" stroke-width="1.5" filter="url(#cardShadow)"/>
        <rect x="18" y="18" width="110" height="30" rx="10" fill="#334155"/>
        <text x="73" y="38" fill="#cbd5e1" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">10:00 - 11:30</text>
        <rect x="360" y="18" width="100" height="30" rx="10" fill="#3b82f6" fill-opacity="0.2"/>
        <text x="410" y="38" fill="#60a5fa" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">Lab 2</text>
        <text x="18" y="80" fill="#ffffff" font-size="18" font-weight="900" font-family="Liberation Sans, sans-serif">CS-305 Database Systems</text>
        <text x="18" y="105" fill="#93c5fd" font-size="13" font-family="Liberation Sans, sans-serif">Faculty: Dr. Sovann Vichea • Year 3 Semester 1</text>
      </g>
    </g>
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 5 Renderer: GPS Attendance Kiosk
function renderKioskScene(cursorX, cursorY, isClick, label, isConfirmed = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    4,
    'Classroom Attendance &amp; GPS Kiosk',
    'ការស្កេនវត្តមានចូល-ចេញ និងផ្ទៀងផ្ទាត់ GPS បរិវេណសាលា',
    {
      title: 'Auto-Detects Faculty Profile',
      desc: 'Check-in terminal instantly maps the logged-in teacher and their assigned class.',
      km: 'ស្ថានីយស្កេនកំណត់អត្តសញ្ញាណគ្រូបង្រៀន និងមុខវិជ្ជាត្រូវបង្រៀនដោយស្វ័យប្រវត្តិ'
    },
    {
      title: 'GPS Perimeter Boundary Check (&lt; 500m)',
      desc: 'Verifies the teacher is physically inside campus before recording check-in.',
      km: 'ផ្ទៀងផ្ទាត់ទីតាំង GPS ពិតប្រាកដក្នុងបរិវេណសាលា (កាំ ៥០០ ម៉ែត្រ) ធានាសុពលភាព'
    },
    {
      title: '1-Tap CHECK IN Button',
      desc: 'One tap registers attendance at 07:58 AM on-time with verified audio confirmation.',
      km: 'ចុចប៊ូតុង "CHECK IN" តែមួយដង កត់ត្រាវត្តមានទាន់ពេលវេលាភ្លាមៗ'
    },
    {
      title: 'Instant Telegram Group Notification',
      desc: 'Dispatches instant broadcast to school Telegram group for coordinator visibility.',
      km: 'ប្រព័ន្ធបញ្ជូនសារដំណឹងស្វ័យប្រវត្តិទៅកាន់ Telegram ក្រុមសាលាភ្លាមៗ'
    }
  )}

  <!-- Right: Check-In Terminal Card -->
  <g transform="translate(1000, 110)">
    <rect width="520" height="880" rx="36" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" filter="url(#softShadow)"/>

    <rect width="520" height="90" rx="36" fill="#0f172a"/>
    <text x="30" y="52" fill="#ffffff" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif">Classroom Attendance Kiosk</text>
    <rect x="380" y="28" width="110" height="34" rx="12" fill="#10b981" fill-opacity="0.25"/>
    <text x="435" y="50" fill="#34d399" font-size="13" font-weight="black" font-family="Liberation Sans, sans-serif" text-anchor="middle">ONLINE</text>

    <!-- Faculty Card -->
    <g transform="translate(25, 110)">
      <rect width="470" height="100" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="30" fill="#2563eb"/>
      <text x="50" y="58" fill="#ffffff" font-size="20" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">SV</text>
      <text x="95" y="44" fill="#0f172a" font-size="18" font-weight="900" font-family="Liberation Sans, sans-serif">Dr. Sovann Vichea</text>
      <text x="95" y="68" fill="#64748b" font-size="13" font-family="Liberation Sans, sans-serif">CS-201 Data Structures • Room 304</text>
    </g>

    <!-- GPS Verified Card -->
    <g transform="translate(25, 230)">
      <rect width="470" height="90" rx="20" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="2"/>
      <circle cx="45" cy="45" r="22" fill="#10b981"/>
      <text x="45" y="52" fill="#ffffff" font-size="20" font-family="Liberation Sans, sans-serif" text-anchor="middle">📍</text>
      <text x="80" y="38" fill="#065f46" font-size="15" font-weight="900" font-family="Liberation Sans, sans-serif">GPS Verified: Inside Campus Perimeter</text>
      <text x="80" y="62" fill="#047857" font-size="12" font-family="Liberation Sans, sans-serif">11.5564° N, 104.9282° E • 18m from building (&lt; 500m boundary)</text>
    </g>

    <!-- Giant Green CHECK IN Button -->
    <g transform="translate(25, 345)">
      <rect width="470" height="74" rx="22" fill="${isConfirmed ? '#047857' : '#059669'}" filter="url(#cardShadow)"/>
      <text x="235" y="46" fill="#ffffff" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle" letter-spacing="1">
        ${isConfirmed ? '✓ CHECK IN RECORDED (07:58 AM)' : '✓ CHECK IN NOW (ស្កេនចូល)'}
      </text>
    </g>

    ${isConfirmed ? `
      <!-- Confirmation Banner & Telegram Dispatched -->
      <g transform="translate(25, 435)">
        <rect width="470" height="66" rx="16" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5"/>
        <text x="235" y="32" fill="#0369a1" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          ✈ Dispatched to School Telegram Group:
        </text>
        <text x="235" y="52" fill="#0284c7" font-size="12" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          "Dr. Sovann Vichea Checked In at 07:58 AM (On-Time)"
        </text>
      </g>

      <!-- End of Period CHECK OUT Option -->
      <g transform="translate(25, 515)">
        <rect width="470" height="64" rx="20" fill="#f59e0b" filter="url(#cardShadow)"/>
        <text x="235" y="40" fill="#0f172a" font-size="18" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          CHECK OUT (បញ្ចប់ម៉ោងបង្រៀន) • 09:30 AM
        </text>
      </g>
    ` : ''}
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 6 Renderer: Personal QR Badge
function renderQrScene(cursorX, cursorY, isClick, label, isDoorSignOpen = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    5,
    'Personal QR &amp; Door Sign Poster',
    'កូដ QR ផ្ទាល់ខ្លួន និងស្លាកបិទទ្វារថ្នាក់រៀន A4 សម្រាប់បោះពុម្ព',
    {
      title: 'Teacher-Locked Personal QR Badge',
      desc: 'Security prevents altering or downloading other faculty codes. You own your QR sign.',
      km: 'សុវត្ថិភាពខ្ពស់៖ គ្រូអាចមើល និងទាញយកបានតែកូដ QR ផ្ទាល់ខ្លួនប៉ុណ្ណោះ'
    },
    {
      title: '1 Master QR Covers All Weekly Teaching Periods',
      desc: 'One smart QR code dynamically routes students and faculty across all periods Monday to Saturday.',
      km: 'កូដ QR វៃឆ្លាតតែមួយ អាចស្កេនគ្រប់ម៉ោងបង្រៀនទាំងអស់ពេញមួយសប្តាហ៍'
    },
    {
      title: 'High-Resolution Door Sign with Schedule Table',
      desc: 'Features official academy branding, faculty photo, subject credentials and timetable table.',
      km: 'ទម្រង់ស្លាកបិទទ្វារថ្នាក់រៀន A4 រួមមានរូបថតគ្រូ និងតារាងម៉ោងបង្រៀនច្បាស់លាស់'
    },
    {
      title: 'One-Click Download PNG or Direct Print',
      desc: 'Save high-res PNG image directly to your phone gallery or print directly to attach outside classroom.',
      km: 'ចុចទាញយកជារូបភាព PNG រក្សាទុកក្នុងទូរស័ព្ទ ឬបោះពុម្ពបិទមុខបន្ទប់រៀន'
    }
  )}

  <!-- Right: Personal QR Badge Card -->
  <g transform="translate(1000, 100)">
    <rect width="520" height="880" rx="36" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#softShadow)"/>

    <rect width="520" height="90" rx="36" fill="url(#qrModalHeader)"/>
    <text x="260" y="54" fill="#ffffff" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
      ${isDoorSignOpen ? 'Classroom Door Sign (Print Ready)' : 'Personal Faculty Smart QR'}
    </text>

    <!-- Faculty Portrait Box -->
    <g transform="translate(185, 120)">
      <circle cx="75" cy="75" r="60" fill="#2563eb"/>
      <text x="75" y="86" fill="#ffffff" font-size="36" font-weight="black" font-family="Liberation Sans, sans-serif" text-anchor="middle">SV</text>
    </g>

    <text x="260" y="285" fill="#0f172a" font-size="24" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">Dr. Sovann Vichea</text>
    <text x="260" y="312" fill="#64748b" font-size="14" font-family="Liberation Sans, sans-serif" text-anchor="middle">Faculty of Computer Science • ID: TCH-001</text>

    <!-- Mock QR Code Matrix -->
    <g transform="translate(160, 340)">
      <rect width="200" height="200" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="20" y="20" width="50" height="50" fill="#0f172a"/>
      <rect x="130" y="20" width="50" height="50" fill="#0f172a"/>
      <rect x="20" y="130" width="50" height="50" fill="#0f172a"/>
      <rect x="80" y="80" width="40" height="40" fill="#2563eb"/>
      <rect x="85" y="25" width="30" height="30" fill="#0f172a"/>
      <rect x="25" y="85" width="30" height="30" fill="#0f172a"/>
      <rect x="135" y="85" width="40" height="40" fill="#0f172a"/>
      <rect x="85" y="145" width="40" height="30" fill="#0f172a"/>
      <rect x="145" y="145" width="30" height="30" fill="#0f172a"/>
    </g>

    <text x="260" y="570" fill="#64748b" font-size="13" font-family="Liberation Sans, sans-serif" text-anchor="middle">
      Scan to mark classroom attendance • 1 QR covers all weekly classes
    </text>

    <!-- Action Buttons -->
    <g transform="translate(45, 610)">
      <rect width="205" height="54" rx="16" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="102" y="33" fill="#334155" font-size="14" font-weight="bold" font-family="Liberation Sans, sans-serif" text-anchor="middle">📥 Download PNG</text>

      <rect x="225" y="0" width="205" height="54" rx="16" fill="${isDoorSignOpen ? '#6b21a8' : '#7c3aed'}"/>
      <text x="327" y="33" fill="#ffffff" font-size="14" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">🖨️ Print Door Sign</text>
    </g>
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 7 Renderer: Leave Request
function renderLeaveScene(cursorX, cursorY, isClick, label, isSubmitted = false, isApproved = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    6,
    'Leave Requests &amp; Academic Breaks',
    'ការស្នើសុំច្បាប់សម្រាក និងប្រតិទិនឈប់សម្រាកបុណ្យជាតិ',
    {
      title: 'Navigate to "Leave" Tab',
      desc: 'Review your personal annual leave quota and sick leave allowances.',
      km: 'ចូលផ្ទាំង "ច្បាប់ឈប់សម្រាក (Leave)" ពិនិត្យកូតាច្បាប់នៅសល់ប្រចាំឆ្នាំ'
    },
    {
      title: 'Duration: Full Days or Flexible Hourly Leave',
      desc: 'Select Full Days or By Hours (e.g., 2.0 hrs: 08:00 - 10:00) matching specific class periods.',
      km: 'ជ្រើសរើសសុំច្បាប់ជាថ្ងៃពេញ ឬជាម៉ោង (ឧ. ២ ម៉ោង៖ ០៨:០០-១០:០០) ស្របតាមវេនបង្រៀន'
    },
    {
      title: 'Real-Time Status Tracking',
      desc: 'Track requests live: Pending Review → Approved with substitute teacher assignment.',
      km: 'តាមដានស្ថានភាពជាក់ស្តែង (រង់ចាំការពិនិត្យ → ត្រូវបានអនុម័ត)'
    },
    {
      title: 'School Academic Holiday Calendar',
      desc: 'Integrated national holiday schedule ensures full visibility over upcoming breaks.',
      km: 'ប្រតិទិនបុណ្យជាតិ និងថ្ងៃឈប់សម្រាកផ្លូវការរបស់សាលាមានភាពច្បាស់លាស់'
    }
  )}

  <!-- Right: Leave Request Card -->
  <g transform="translate(1000, 110)">
    <rect width="520" height="880" rx="36" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#softShadow)"/>

    <rect width="520" height="90" rx="36" fill="#0f172a"/>
    <text x="30" y="54" fill="#ffffff" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif">Faculty Leave Management</text>

    <!-- Quota Pills -->
    <g transform="translate(25, 115)">
      <rect width="225" height="70" rx="16" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
      <text x="20" y="32" fill="#1e40af" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif">Annual Leave Quota</text>
      <text x="20" y="55" fill="#1e3a8a" font-size="20" font-weight="900" font-family="Liberation Sans, sans-serif">12 Days Remaining</text>

      <rect x="245" y="0" width="225" height="70" rx="16" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
      <text x="265" y="32" fill="#065f46" font-size="12" font-weight="bold" font-family="Liberation Sans, sans-serif">Sick Leave Quota</text>
      <text x="265" y="55" fill="#064e3b" font-size="20" font-weight="900" font-family="Liberation Sans, sans-serif">5 Days Remaining</text>
    </g>

    <!-- Form Preview -->
    <g transform="translate(25, 210)">
      <text x="5" y="16" fill="#334155" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">LEAVE CATEGORY</text>
      <rect x="0" y="26" width="470" height="48" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="20" y="56" fill="#0f172a" font-size="14" font-weight="bold" font-family="Liberation Sans, sans-serif">Sick Leave (ច្បាប់ឈឺ) ∨</text>

      <text x="5" y="100" fill="#334155" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">DATE &amp; DURATION (HOURLY / DAYS)</text>
      <rect x="0" y="110" width="470" height="48" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="20" y="140" fill="#0f172a" font-size="14" font-weight="bold" font-family="Liberation Sans, sans-serif">16 Jan 2026 • ⏱️ 2.0 Hours (08:00 - 10:00)</text>

      <text x="5" y="185" fill="#334155" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">REASON / NOTES</text>
      <rect x="0" y="195" width="470" height="48" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="20" y="225" fill="#0f172a" font-size="14" font-family="Liberation Sans, sans-serif">Medical appointment &amp; doctor prescribed rest</text>

      <rect x="0" y="270" width="470" height="54" rx="16" fill="${isSubmitted ? '#d97706' : '#2563eb'}"/>
      <text x="235" y="303" fill="#ffffff" font-size="15" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
        ${isSubmitted ? '✓ SUBMITTED • STATUS: PENDING REVIEW' : 'SUBMIT LEAVE REQUEST'}
      </text>
    </g>
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

// Scene 8 Renderer: Wages & Reports
function renderWageScene(cursorX, cursorY, isClick, label, isExported = false) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${COMMON_DEFS}
  <rect width="1920" height="1080" fill="url(#bgNavy)"/>

  ${renderLeftPanel(
    7,
    'Teaching Hours &amp; Wage Report',
    'របាយការណ៍ម៉ោងបង្រៀនជាក់ស្តែង និងប្រាក់ឈ្នួលសរុបប្រចាំខែ',
    {
      title: 'Automated Verified Hours Calculation',
      desc: 'System aggregates checked-in classroom periods across the month automatically.',
      km: 'ប្រព័ន្ធបូកសរុបម៉ោងបង្រៀនដែលបានស្កេនចូលជាក់ស្តែងប្រចាំខែដោយស្វ័យប្រវត្តិ'
    },
    {
      title: 'Transparent Gross Wage Formula',
      desc: 'Total Verified Sessions × Hourly Teaching Rate ($25.00/hr) = Monthly Gross Wages.',
      km: 'រូបមន្តគណនាតម្លាភាព៖ ម៉ោងជាក់ស្តែង × អត្រាឈ្នួល ($25/ម៉ោង) = ប្រាក់ឈ្នួលសរុប'
    },
    {
      title: 'Digital Ledger Export to CSV / Excel',
      desc: 'Download itemized teaching session records to Excel for personal archives.',
      km: 'ទាញយករបាយការណ៍បង្រៀនជា Excel ឬ CSV រក្សាទុកជាឯកសារយោង'
    },
    {
      title: 'Official Wrap-Up &amp; IT Support',
      desc: 'Congratulations! You are fully prepared to operate EduTrack Faculty Portal.',
      km: 'អបអរសាទរ! លោកគ្រូ-អ្នកគ្រូបានបញ្ចប់វគ្គណែនាំ និងរួចរាល់ក្នុងការប្រើប្រាស់'
    }
  )}

  <!-- Right: Monthly Teaching Wage Summary Card -->
  <g transform="translate(1000, 110)">
    <rect width="520" height="880" rx="36" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#softShadow)"/>

    <rect width="520" height="90" rx="36" fill="#0f172a"/>
    <text x="30" y="54" fill="#ffffff" font-size="22" font-weight="900" font-family="Liberation Sans, sans-serif">Monthly Teaching Wage Summary</text>

    <!-- Big Wage Summary Card -->
    <g transform="translate(25, 120)">
      <rect width="470" height="180" rx="24" fill="url(#emeraldBtn)" filter="url(#cardShadow)"/>
      <text x="30" y="44" fill="#a7f3d0" font-size="13" font-weight="bold" font-family="Liberation Sans, sans-serif">TOTAL MONTHLY GROSS PAYABLE</text>
      <text x="30" y="100" fill="#ffffff" font-size="48" font-weight="900" font-family="Liberation Sans, sans-serif">$950.00</text>
      <text x="30" y="140" fill="#d1fae5" font-size="14" font-family="Liberation Sans, sans-serif">
        38.0 Verified Teaching Hours × $25.00/hr • 19 Sessions
      </text>
    </g>

    <!-- Action Buttons -->
    <g transform="translate(25, 330)">
      <rect width="225" height="54" rx="16" fill="${isExported ? '#047857' : '#059669'}"/>
      <text x="112" y="33" fill="#ffffff" font-size="14" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
        ${isExported ? '✓ EXPORTED (.CSV)' : '📥 Export to CSV'}
      </text>

      <rect x="245" y="0" width="225" height="54" rx="16" fill="#0f172a"/>
      <text x="357" y="33" fill="#ffffff" font-size="14" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
        🖨️ Print Wage Ledger
      </text>
    </g>

    ${isExported ? `
      <g transform="translate(25, 415)">
        <rect width="470" height="70" rx="18" fill="#eff6ff" stroke="#bfdbfe" stroke-width="2"/>
        <text x="235" y="32" fill="#1e40af" font-size="14" font-weight="900" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          🎉 TRAINING COMPLETE • FILE READY FOR DOWNLOAD
        </text>
        <text x="235" y="54" fill="#2563eb" font-size="12" font-family="Liberation Sans, sans-serif" text-anchor="middle">
          All 7 Modules Mastered • Faculty Certified
        </text>
      </g>
    ` : ''}
  </g>

  ${renderCursor(cursorX, cursorY, isClick, label)}
</svg>
  `;
}

async function buildVideoManual() {
  console.log('Starting Real UI Action Video Manual generation...');

  const clipPaths = [];
  let frameCount = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    for (let f = 0; f < scene.frames.length; f++) {
      frameCount++;
      const frame = scene.frames[f];
      const frameId = `${scene.id}_f${f + 1}`;
      const svgPath = path.join(TEMP_DIR, `${frameId}.svg`);
      const pngPath = path.join(TEMP_DIR, `${frameId}.png`);
      const clipPath = path.join(TEMP_DIR, `${frameId}.mp4`);

      console.log(`[${frameCount}] Rendering ${frameId} (${frame.duration}s)...`);
      fs.writeFileSync(svgPath, frame.renderSvg().trim(), 'utf-8');

      // 1. Convert SVG to PNG
      const renderPngCmd = `ffmpeg -y -i "${svgPath}" -vframes 1 "${pngPath}"`;
      execSync(renderPngCmd, { stdio: 'pipe' });

      // 2. Encode to MP4 clip
      const encodeClipCmd = `ffmpeg -y -loop 1 -i "${pngPath}" -c:v libx264 -t ${frame.duration} -pix_fmt yuv420p -preset ultrafast -tune stillimage -r 25 "${clipPath}"`;
      execSync(encodeClipCmd, { stdio: 'pipe' });

      clipPaths.push(clipPath);
    }
  }

  // Create concat list file
  const concatListPath = path.join(TEMP_DIR, 'concat_list.txt');
  const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
  fs.writeFileSync(concatListPath, concatContent, 'utf-8');

  console.log('Concatenating all action clips...');
  const finalVideoWithoutAudio = path.join(TEMP_DIR, 'video_no_audio.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${finalVideoWithoutAudio}"`, { stdio: 'pipe' });

  // Calculate total duration
  let totalDuration = 0;
  for (const s of scenes) {
    for (const f of s.frames) {
      totalDuration += f.duration;
    }
  }

  console.log(`Adding pleasant ambient audio track (${totalDuration}s)...`);
  const finalOutputMp4 = path.join(OUTPUT_DIR, 'teacher-video-manual.mp4');

  const audioFilter = `aevalsrc='(sin(440*2*PI*t)*0.03 + sin(554.37*2*PI*t)*0.02 + sin(659.25*2*PI*t)*0.02 + sin(220*2*PI*t)*0.02)*0.6':s=44100:d=${totalDuration}`;
  const audioCmd = `ffmpeg -y -i "${finalVideoWithoutAudio}" -f lavfi -i "${audioFilter}" -c:v copy -c:a aac -b:a 128k -shortest "${finalOutputMp4}"`;
  execSync(audioCmd, { stdio: 'pipe' });

  const stats = fs.statSync(finalOutputMp4);
  console.log(`\n========================================`);
  console.log(`SUCCESS! Real Action Video Manual generated at: ${finalOutputMp4}`);
  console.log(`Resolution: 1920x1080 Full HD`);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${totalDuration} seconds`);
  console.log(`Total Animated Action Frames: ${frameCount}`);
  console.log(`========================================\n`);

  // Cleanup temp files
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (e) {}
}

buildVideoManual().catch(err => {
  console.error('Failed to generate video:', err);
  process.exit(1);
});
