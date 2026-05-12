// 09_Safe_Execution_Plan.docx — Restructured Production-Safe Backlog
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, PageOrientation
} = require('docx');
const fs = require('fs');

const CW = 9026; // A4 portrait content width
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

// ─── helpers ────────────────────────────────────────────────────────────────
function hc(t, w, fill='1F4E79') {
  return new TableCell({ borders, width:{size:w,type:WidthType.DXA}, shading:{fill,type:ShadingType.CLEAR}, margins:cm,
    children:[new Paragraph({children:[new TextRun({text:t,bold:true,color:'FFFFFF',font:'Arial',size:20})]})] });
}
function dc(t, w, fill) {
  return new TableCell({ borders, width:{size:w,type:WidthType.DXA}, shading: fill?{fill,type:ShadingType.CLEAR}:undefined, margins:cm,
    children:[new Paragraph({children:[new TextRun({text:t,font:'Arial',size:20})]})] });
}
function h1(t) { return new Paragraph({ heading:HeadingLevel.HEADING_1, children:[new TextRun({text:t,font:'Arial',size:36,bold:true,color:'1F4E79'})], spacing:{before:400,after:200} }); }
function h2(t) { return new Paragraph({ heading:HeadingLevel.HEADING_2, children:[new TextRun({text:t,font:'Arial',size:28,bold:true,color:'2E75B6'})], spacing:{before:280,after:140} }); }
function h3(t) { return new Paragraph({ heading:HeadingLevel.HEADING_3, children:[new TextRun({text:t,font:'Arial',size:24,bold:true,color:'404040'})], spacing:{before:200,after:80} }); }
function p(t, col) { return new Paragraph({ children:[new TextRun({text:t,font:'Arial',size:22,color:col||'000000'})], spacing:{after:100} }); }
function code(t) { return new Paragraph({ children:[new TextRun({text:t,font:'Courier New',size:18,color:'1F4E79'})], spacing:{after:40}, shading:{fill:'F0F4F8',type:ShadingType.CLEAR}, indent:{left:360} }); }
function nb(t, ref='numbers') { return new Paragraph({ numbering:{reference:ref,level:0}, children:[new TextRun({text:t,font:'Arial',size:22})], spacing:{after:80} }); }
function bb(t) { return new Paragraph({ numbering:{reference:'bullets',level:0}, children:[new TextRun({text:t,font:'Arial',size:22})], spacing:{after:80} }); }
function sp(h=120) { return new Paragraph({ spacing:{after:h} }); }

function dangerBox(t) {
  return new Paragraph({
    children:[new TextRun({text:'⛔ DANGEROUS: '+t,font:'Arial',size:22,bold:true,color:'C00000'})],
    spacing:{before:120,after:120}, indent:{left:360},
    border:{ top:{style:BorderStyle.SINGLE,size:6,color:'C00000'}, bottom:{style:BorderStyle.SINGLE,size:6,color:'C00000'}, left:{style:BorderStyle.SINGLE,size:6,color:'C00000'}, right:{style:BorderStyle.SINGLE,size:6,color:'C00000'} },
    shading:{fill:'FFF2CC',type:ShadingType.CLEAR}
  });
}
function noteBox(t) {
  return new Paragraph({
    children:[new TextRun({text:'ℹ NOTE: '+t,font:'Arial',size:22,color:'1F4E79'})],
    spacing:{before:100,after:100}, indent:{left:360},
    border:{ left:{style:BorderStyle.SINGLE,size:8,color:'2E75B6'} },
    shading:{fill:'E9F4FF',type:ShadingType.CLEAR}
  });
}
function riskBadge(level) {
  const map = { Low:'1D6F42', Medium:'7B3F00', High:'C00000', Critical:'8B0000' };
  const fill = level==='Low'?'E2EFDA':level==='Medium'?'FFF2CC':level==='High'?'FFE0E0':'FFD0D0';
  return new TableCell({ borders, width:{size:1200,type:WidthType.DXA}, shading:{fill,type:ShadingType.CLEAR}, margins:cm,
    children:[new Paragraph({children:[new TextRun({text:level,font:'Arial',size:20,bold:true,color:map[level]||'000000'})]}) ] });
}

// ─── phase header ────────────────────────────────────────────────────────────
function phaseHeader(num, title, desc, color='1F4E79') {
  return [
    new Paragraph({ children:[new PageBreak()] }),
    new Paragraph({ spacing:{before:200,after:80}, children:[
      new TextRun({text:`PHASE ${num}`, font:'Arial', size:48, bold:true, color:'FFFFFF',
        shading:{fill:color,type:ShadingType.CLEAR}})
    ], shading:{fill:color,type:ShadingType.CLEAR}, alignment:AlignmentType.CENTER }),
    new Paragraph({ spacing:{after:80}, alignment:AlignmentType.CENTER, children:[new TextRun({text:title,font:'Arial',size:36,bold:true,color:color})] }),
    new Paragraph({ spacing:{after:240}, alignment:AlignmentType.CENTER, children:[new TextRun({text:desc,font:'Arial',size:22,color:'666666',italics:true})] }),
  ];
}

// ─── task card ───────────────────────────────────────────────────────────────
function taskCard(id, title, type, dep, risk, desc, steps, filesToCheck, outcome, dangers=[]) {
  const typeColors = { Analysis:'1D6F42', Implementation:'1F4E79', Refactor:'7B3F00', DevOps:'404040', SEO:'843C0C', Configuration:'2E75B6' };
  const typeFills = { Analysis:'E2EFDA', Implementation:'E9F1F7', Refactor:'FFF2CC', DevOps:'EDEDED', SEO:'FBE5D6', Configuration:'DEEAF1' };
  const tc = typeColors[type]||'000000';
  const tf = typeFills[type]||'FFFFFF';
  const depText = dep && dep.length ? dep.join(', ') : '—';

  const rows = [
    // Header row
    new TableRow({ children:[
      new TableCell({ columnSpan:4, borders, width:{size:CW,type:WidthType.DXA}, shading:{fill:'1F4E79',type:ShadingType.CLEAR}, margins:cm,
        children:[new Paragraph({children:[
          new TextRun({text:id+'  ',font:'Courier New',size:22,bold:true,color:'AACCFF'}),
          new TextRun({text:title,font:'Arial',size:24,bold:true,color:'FFFFFF'}),
        ]})] })
    ]}),
    // Meta row
    new TableRow({ children:[
      new TableCell({ borders, width:{size:2200,type:WidthType.DXA}, shading:{fill:tf,type:ShadingType.CLEAR}, margins:cm,
        children:[new Paragraph({children:[new TextRun({text:'Type: ',font:'Arial',size:20,bold:true,color:'666666'}),new TextRun({text:type,font:'Arial',size:20,bold:true,color:tc})]})] }),
      riskBadge(risk),
      new TableCell({ borders, width:{size:2000,type:WidthType.DXA}, shading:{fill:'F5F5F5',type:ShadingType.CLEAR}, margins:cm,
        children:[new Paragraph({children:[new TextRun({text:'Depends on: ',font:'Arial',size:18,bold:true,color:'666666'}),new TextRun({text:depText,font:'Arial',size:18,color:'1F4E79'})]})] }),
      new TableCell({ borders, width:{size:3626,type:WidthType.DXA}, shading:{fill:'F5F5F5',type:ShadingType.CLEAR}, margins:cm,
        children:[new Paragraph({children:[new TextRun({text:'Status: Todo',font:'Arial',size:18,color:'888888'})]})] }),
    ]}),
  ];

  const allRows = [
    sp(160),
    new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[2200,1200,2000,3626], rows }),
  ];

  // Description
  allRows.push(new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[CW], rows:[
    new TableRow({ children:[ new TableCell({ borders, width:{size:CW,type:WidthType.DXA}, margins:cm, shading:{fill:'FAFAFA',type:ShadingType.CLEAR},
      children:[
        new Paragraph({spacing:{after:80},children:[new TextRun({text:'Description',font:'Arial',size:22,bold:true,color:'1F4E79'})]}),
        new Paragraph({children:[new TextRun({text:desc,font:'Arial',size:21})],spacing:{after:80}}),
        ...dangers.map(d=>new Paragraph({children:[new TextRun({text:'⛔  '+d,font:'Arial',size:20,bold:true,color:'C00000'})],spacing:{after:60},indent:{left:240}})),
      ]
    }) ]} )
  ]}));

  // Steps
  allRows.push(new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[CW], rows:[
    new TableRow({ children:[ new TableCell({ borders, width:{size:CW,type:WidthType.DXA}, margins:cm, shading:{fill:'F7FBFF',type:ShadingType.CLEAR},
      children:[
        new Paragraph({spacing:{after:80},children:[new TextRun({text:'Steps',font:'Arial',size:22,bold:true,color:'2E75B6'})]}),
        ...steps.map((s,i)=>new Paragraph({children:[new TextRun({text:`${i+1}.  ${s}`,font:'Arial',size:21})],spacing:{after:60}})),
      ]
    }) ]} )
  ]}));

  // Files + Outcome
  allRows.push(new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[4000,5026], rows:[
    new TableRow({ children:[
      new TableCell({ borders, width:{size:4000,type:WidthType.DXA}, margins:cm, shading:{fill:'FFF9F0',type:ShadingType.CLEAR},
        children:[
          new Paragraph({spacing:{after:80},children:[new TextRun({text:'Files to Inspect',font:'Arial',size:20,bold:true,color:'843C0C'})]}),
          ...filesToCheck.map(f=>new Paragraph({children:[new TextRun({text:'  '+f,font:'Courier New',size:18,color:'1F4E79'})],spacing:{after:40}})),
        ] }),
      new TableCell({ borders, width:{size:5026,type:WidthType.DXA}, margins:cm, shading:{fill:'F0FBF0',type:ShadingType.CLEAR},
        children:[
          new Paragraph({spacing:{after:80},children:[new TextRun({text:'Expected Outcome',font:'Arial',size:20,bold:true,color:'1D6F42'})]}),
          new Paragraph({children:[new TextRun({text:outcome,font:'Arial',size:21})],spacing:{after:40}}),
        ] }),
    ]} )
  ]}));

  return allRows;
}

// ════════════════════════════════════════════════════════════════════════════
// TASKS DATA
// ════════════════════════════════════════════════════════════════════════════

const allContent = [];

// ─── TITLE PAGE ──────────────────────────────────────────────────────────────
allContent.push(
  new Paragraph({ spacing:{before:1440,after:200}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'Safe Execution Plan',font:'Arial',size:72,bold:true,color:'1F4E79'})] }),
  new Paragraph({ spacing:{after:120}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'Agro Servis — Production-Safe Implementation Backlog',font:'Arial',size:32,color:'2E75B6'})] }),
  new Paragraph({ spacing:{after:80}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'Version 1.0  |  Date: 2026-05-03  |  64 Tasks  |  9 Phases',font:'Arial',size:22,color:'888888',italics:true})] }),
  new Paragraph({ spacing:{after:400}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'Senior Architect Review — Every task starts with analysis. No destructive actions.',font:'Arial',size:20,color:'C00000',bold:true})] }),
);

// ─── RULES PAGE ──────────────────────────────────────────────────────────────
allContent.push(
  new Paragraph({children:[new PageBreak()]}),
  h1('Core Safety Rules'),
  noteBox('These rules apply to EVERY task in this document without exception.'),
  sp(100),
  ...['The project already exists and is partially working. Never assume a clean slate.',
    'Every task begins with inspecting existing files before writing any code.',
    'Never drop databases, truncate tables, or delete files without explicit backup confirmation.',
    '"Create X" always means: check if X exists first, then create or extend.',
    'Tasks are atomic — each can be implemented and rolled back independently.',
    'All tasks that modify production must be tested on local/staging first.',
    'Broken imports in server.js mean the server crashes — fix the foundation before testing.',
    'Pricing constants in main.js (frontend) and pricingService.js (backend) MUST match exactly.',
    'Never commit .env to git. Always work from .env.example.',
    'Telegram webhook must return HTTP 200 within 60 seconds or Telegram retries.',
  ].map((r,i) => new Paragraph({ spacing:{after:100}, children:[
    new TextRun({text:`${i+1}.  `,font:'Arial',size:22,bold:true,color:'1F4E79'}),
    new TextRun({text:r,font:'Arial',size:22}),
  ]})),

  sp(200),
  h1('Risk Level Definitions'),
  new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[1400,7626], rows:[
    new TableRow({children:[hc('Level',1400),hc('Meaning',7626)],tableHeader:true}),
    new TableRow({children:[riskBadge('Low'), dc('Safe to implement directly. Failure is recoverable with no data loss.',7626)]}),
    new TableRow({children:[riskBadge('Medium'), dc('Requires testing on local/staging first. May affect related functionality.',7626,'E9F1F7')]}),
    new TableRow({children:[riskBadge('High'), dc('Touches live data, auth, or core flow. Must be peer-reviewed before deploying.',7626)]}),
    new TableRow({children:[riskBadge('Critical'), dc('If done incorrectly, causes data loss, security breach, or system outage. Requires explicit backup.',7626,'FFE0E0')]}),
  ]}),

  sp(200),
  h1('Phase Overview'),
  new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[1000,2600,4000,1426], rows:[
    new TableRow({children:[hc('Phase',1000),hc('Name',2600),hc('Goal',4000),hc('Tasks',1426)],tableHeader:true}),
    new TableRow({children:[dc('1',1000),dc('Safety Audit',2600),dc('Read everything. Write nothing. Map all gaps.',4000),dc('5 tasks',1426)]}),
    new TableRow({children:[dc('2',1000),dc('Database Foundation',2600),dc('Pool, schema, seed — local only',4000),dc('5 tasks',1426)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('3',1000),dc('Middleware Layer',2600),dc('Auth, validation, rate limiting',4000),dc('4 tasks',1426)]}),
    new TableRow({children:[dc('4',1000),dc('Services Layer',2600),dc('Pricing, Telegram, assignment, timeout',4000),dc('5 tasks',1426)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('5',1000),dc('Routes & Wiring',2600),dc('All API endpoints + fix server.js imports',4000),dc('5 tasks',1426)]}),
    new TableRow({children:[dc('6',1000),dc('Telegram Hardening',2600),dc('Webhook security, stale buttons, retries',4000),dc('5 tasks',1426)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('7',1000),dc('Admin Panel',2600),dc('Dashboard, worker/lead management',4000),dc('6 tasks',1426)]}),
    new TableRow({children:[dc('8',1000),dc('DevOps & Security',2600),dc('Production deploy, CI/CD, backups',4000),dc('9 tasks',1426)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('9',1000),dc('SEO & Frontend',2600),dc('Meta tags, Schema.org, sitemap, shared config',4000),dc('7 tasks',1426)]}),
    new TableRow({children:[new TableCell({borders,width:{size:1000,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'MT',font:'Arial',size:20,bold:true,color:'FFFFFF'})]})]}),dc('Missing Tasks',2600),dc('8 additional tasks not in original backlog',4000),dc('8 tasks',1426)]}),
  ]}),
);

// ════════════════════════════════════════════════════════════════════════════
// PHASE 1 — SAFETY AUDIT
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(1,'Safety Audit','Read everything. Write nothing. Map all gaps before any code is written.','C00000'));

allContent.push(...taskCard(
  'P1-001','Audit server.js — Map All Broken Imports','Analysis',[],  'Low',
  'server.js is the entry point and currently imports routes and services that do not exist. The server cannot start. This task maps every broken import to its missing file so Phase 5 implementation is accurate.',
  [
    'Open server.js and list every require() or import statement',
    'For each import, check if the target file exists on disk',
    'Create a table: import path | file exists (Y/N) | planned file name',
    'Verify CORS configuration — check if CORS_ORIGIN uses wildcard (*) in .env',
    'Check if any route is already partially implemented',
    'Document the exact startup error when running npm start',
    'Record any additional middleware or configuration in server.js not listed in docs',
  ],
  ['server.js', 'package.json', '.env'],
  'Complete map of all missing files required by server.js. No code written.',
  []
));

allContent.push(...taskCard(
  'P1-002','Audit .env — Identify Placeholders & Create .env.example','Analysis',[],  'Low',
  'The .env file contains several placeholder values that will cause runtime failures. This task documents every variable, identifies which are placeholders, and creates .env.example for developer onboarding.',
  [
    'Open .env and list every variable with its current value',
    'Mark each value as: REAL or PLACEHOLDER',
    'Identify the critical placeholders: TELEGRAM_BOT_TOKEN, ADMIN_TOKEN, ADMIN_CHAT_ID',
    'Check that DATABASE_URL points to a real, reachable PostgreSQL instance',
    'Create .env.example with all variable names, descriptions, and example safe values (no real secrets)',
    'Add .env to .gitignore if not already present',
    'Verify PORT, TIMEOUT_MINUTES, RATE_LIMIT_MAX are valid integers (not 0 for timeout)',
  ],
  ['.env', '.gitignore'],
  '.env.example file created. All placeholder variables documented. .env confirmed git-ignored.',
  ['Ensure .env is never committed to version control — verify .gitignore before proceeding']
));

allContent.push(...taskCard(
  'P1-003','Full Repository Audit — Find Any Undocumented Existing Files','Analysis',['P1-001'],'Low',
  'Before writing any new files, perform a complete directory scan to find any backend code that may already exist but is not in the documented structure. This prevents overwriting work in progress.',
  [
    'Run a recursive directory listing of the full project',
    'Check for any .js files outside of the documented structure',
    'Check if any of these paths already exist: db/pool.js, db/schema.sql, server/routes/, server/services/, server/middlewares/',
    'Check for any test files (*.test.js, *.spec.js) that may reveal implemented logic',
    'Check if node_modules is present and package-lock.json is up to date',
    'Document any files found that are not in the project documentation',
    'Check git log for any recent commits that may have added unreferenced files',
  ],
  ['All directories recursively', 'package-lock.json', '.git/'],
  'Complete inventory of all existing files. No surprises during implementation phases.',
  []
));

allContent.push(...taskCard(
  'P1-004','Audit package.json — Verify All Dependencies Are Declared','Analysis',['P1-001'],'Low',
  'Services will require packages not yet in package.json (e.g., node-fetch or axios for Telegram API calls). Identify all missing dependencies before starting implementation.',
  [
    'Open package.json and list all current dependencies',
    'Cross-reference with planned services: telegramService needs HTTP client, timeoutService needs node-cron (already present)',
    'Verify express-rate-limit version is compatible with Node.js 18',
    'Check if pg is present for PostgreSQL (it is — verify version 8.x)',
    'Identify missing: node-fetch or axios (for Telegram API), potentially dotenv (already present)',
    'Do NOT run npm install yet — only document what is needed',
    'Check engines field — should specify Node.js >= 18',
  ],
  ['package.json', 'package-lock.json'],
  'List of all required vs declared dependencies. Ready for single npm install before Phase 4.',
  []
));

allContent.push(...taskCard(
  'P1-005','Extract & Document Pricing Constants from main.js','Analysis',['P1-003'],'Medium',
  'Pricing constants exist in main.js (frontend). When pricingService.js is created (Phase 4), it MUST use identical values. This task extracts and documents them to prevent price discrepancies where users see one price but the system records another.',
  [
    'Open main.js and search for all pricing constants',
    'Extract: OGOROD_RATE, CELINA_RATE, MOWING_RATE, TREE_MIN, WASHING_MIN, OUT_OF_CITY_SURCHARGE, MIN_ORDER',
    'Document each constant with its exact numeric value and unit (hrn, hrn/sotka)',
    'Verify the calculation logic for each service type (how minimums are applied)',
    'Document the out-of-city surcharge logic (added before or after minimum check)',
    'Note the global MIN_ORDER application order',
    'Create a reference document: pricing-constants.md in the project root',
  ],
  ['main.js (pricing section)', 'BUSINESS_LOGIC.md'],
  'Pricing constants documented with exact values. pricingService.js will use these verbatim.',
  ['Any deviation between main.js and pricingService.js will show wrong prices to users']
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 2 — DATABASE FOUNDATION
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(2,'Database Foundation','Create pool, schema, seed. Apply to LOCAL only. Never touch production.','1F4E79'));

allContent.push(...taskCard(
  'P2-001','Create db/pool.js — PostgreSQL Connection Pool','Implementation',['P1-001','P1-003'],'Medium',
  'Create the singleton PostgreSQL connection pool used by all services. First verify db/pool.js does not already exist (P1-003 confirmed this). The pool reads DATABASE_URL from environment.',
  [
    'Confirm db/ directory does not exist — create it only if missing',
    'Confirm db/pool.js does not exist',
    'Create db/pool.js using the pg Pool class with DATABASE_URL',
    'Add a test query on startup: pool.query("SELECT 1") to verify connectivity',
    'Export the pool as a singleton (module.exports = pool)',
    'Add error handler: pool.on("error", ...) to log unexpected idle client errors',
    'Test locally: node -e "require(\'./db/pool\')" should connect without error',
  ],
  ['db/ (check existence)', '.env (DATABASE_URL)', 'package.json (pg dependency)'],
  'db/pool.js exports a working pg Pool. require("./db/pool") connects to the local DB without error.',
  ['Ensure DATABASE_URL is set in .env before testing', 'Local PostgreSQL must be running']
));

allContent.push(...taskCard(
  'P2-002','Create db/schema.sql — Full Database Schema','Implementation',['P1-001','P1-003','P1-005'],'High',
  'Create the complete PostgreSQL schema. This is HIGH risk because applying it incorrectly to an existing database could overwrite real data. Use CREATE TABLE IF NOT EXISTS to make it idempotent.',
  [
    'Confirm db/schema.sql does not exist (P1-003 verified)',
    'Write schema using CREATE TABLE IF NOT EXISTS for all 4 tables: cities, workers, leads, lead_assignments',
    'Use exact column types and constraints from Database.md analysis',
    'Add CHECK constraint for lead status enum values',
    'Add CHECK constraint for service_type enum values',
    'Add recommended indexes from Database.md (idx_workers_city_active, idx_leads_status_updated, idx_leads_phone_created)',
    'Add BEFORE UPDATE trigger for auto-updating leads.updated_at',
    'Test on LOCAL database only: psql lead_distribution < db/schema.sql',
    'Verify all tables created: \\dt in psql',
    'Run twice to confirm idempotency (no errors on second run)',
  ],
  ['db/schema.sql (create)', 'docs/Database.md (reference)', 'BUSINESS_LOGIC.md'],
  'All 4 tables created with constraints and indexes. Schema is idempotent (safe to run multiple times).',
  ['NEVER run on production DB until all local tests pass', 'Use IF NOT EXISTS on every CREATE statement']
));

allContent.push(...taskCard(
  'P2-003','Install Missing npm Dependencies','Implementation',['P1-004'],'Low',
  'Install any dependencies identified in P1-004 that are missing from package.json. Do this as one atomic step before implementing services.',
  [
    'Review the dependency gap list from P1-004',
    'If Telegram API calls will use node-fetch: npm install node-fetch@2 (CommonJS compatible with Node 18)',
    'Alternatively, use the built-in https module — decide which approach before P4-002',
    'Run npm install to ensure all declared dependencies are installed',
    'Verify node_modules is populated',
    'Do NOT upgrade existing packages — only add new ones',
    'Commit updated package.json and package-lock.json',
  ],
  ['package.json', 'package-lock.json', 'node_modules/'],
  'All required dependencies are declared in package.json and installed.',
  []
));

allContent.push(...taskCard(
  'P2-004','Create db/seed.sql — Safe Test Data','Implementation',['P2-002'],'Low',
  'Create seed data for local development testing. Use small, realistic data that covers all test scenarios including multi-worker assignment, timeout, and rejection flows.',
  [
    'Confirm db/seed.sql does not exist',
    'Write seed with: 2 cities (one with out-of-city enabled, one without)',
    'Write seed with: 3 workers — different priorities, all with telegram_chat_id values',
    'Write seed with: at least 3 leads in different statuses (new, assigned, accepted)',
    'Use INSERT ... ON CONFLICT DO NOTHING to make seed safe to re-run',
    'Do NOT use real phone numbers or real Telegram IDs in seed',
    'Apply to local DB: psql lead_distribution < db/seed.sql',
    'Verify data: SELECT * FROM workers; SELECT * FROM leads;',
  ],
  ['db/seed.sql (create)', 'db/schema.sql (must exist first)'],
  'Test data present in local DB. All service flows can be tested without manual data entry.',
  []
));

allContent.push(...taskCard(
  'P2-005','Verify DB Connection End-to-End from Node.js','Analysis',['P2-001','P2-002','P2-004'],'Medium',
  'Before building any service, confirm the pool connects correctly and queries return expected data. This catches connection string issues early.',
  [
    'Create a temporary test script: node -e "const pool=require(\'./db/pool\'); pool.query(\'SELECT count(*) FROM leads\').then(r=>console.log(r.rows[0])).catch(console.error)"',
    'Verify the count returns the seeded rows (not an error)',
    'Test a JOIN query: SELECT l.id, w.name FROM leads l LEFT JOIN workers w ON l.worker_id=w.id LIMIT 3',
    'Confirm SSL settings are correct (may need ssl:false for local, ssl:true for Supabase)',
    'Delete the temporary test script after verification',
    'Document any connection flags needed in pool.js (ssl, max connections)',
  ],
  ['db/pool.js', '.env (DATABASE_URL)', 'db/seed.sql output'],
  'Confirmed: Node.js can query the DB and return seeded data. Pool is production-ready.',
  []
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 3 — MIDDLEWARE LAYER
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(3,'Middleware Layer','Auth, validation, rate limiting. These gates protect all routes.','404040'));

allContent.push(...taskCard(
  'P3-001','Create server/middlewares/auth.js — Bearer Token Validation','Implementation',['P1-001','P1-002'],'Medium',
  'Create the Bearer token middleware that protects all admin routes. The token is compared against ADMIN_TOKEN from .env. MUST use constant-time comparison to prevent timing attacks.',
  [
    'Create server/middlewares/ directory only if it does not exist',
    'Confirm auth.js does not exist in that directory',
    'Implement: extract Authorization header, validate "Bearer " prefix, extract token',
    'Use crypto.timingSafeEqual() for token comparison to prevent timing attacks',
    'Return 401 with { error: "Unauthorized" } if token missing or invalid',
    'Never log the actual token value — only log "auth failed" with timestamp',
    'Call next() only on successful validation',
    'Test manually: curl with correct token should pass, without should return 401',
  ],
  ['server/middlewares/ (check existence)', '.env (ADMIN_TOKEN value)', 'server.js (how auth is applied)'],
  'auth.js middleware rejects requests without valid Bearer token. Timing-safe comparison used.',
  ['ADMIN_TOKEN must not be empty string or the placeholder "change-me" value — validate on startup']
));

allContent.push(...taskCard(
  'P3-002','Create server/middlewares/validateLead.js — Phone Normalization & Validation','Implementation',['P1-005'],'High',
  'This middleware normalizes phone numbers and validates lead submission fields. It MUST produce the same normalized phone format as the frontend (main.js) to ensure spam detection works correctly.',
  [
    'Confirm validateLead.js does not exist',
    'Implement phone normalization: strip non-digits, handle 0XX -> +380XX, handle 380XX -> +380XX',
    'Test normalization with exact inputs from main.js: "0679020326", "+38(067)902-03-26", "380679020326"',
    'Verify all 3 produce identical output: "+380679020326"',
    'Validate required fields: phone (post-normalization: 13 chars, starts with +380), city_id (integer), service_type (enum)',
    'Validate optional area: if present, must be a positive float',
    'Return 400 with field-level error objects, not generic messages',
    'Test that normalized phone is attached to req.body.phone_normalized for use by route handler',
  ],
  ['main.js (phone normalization logic — MUST match)', 'BUSINESS_LOGIC.md (phone format spec)'],
  'Lead validation middleware correctly normalizes phones and rejects invalid inputs with field-level errors.',
  ['Phone normalization MUST produce identical output to main.js — test with identical inputs']
));

allContent.push(...taskCard(
  'P3-003','Create server/middlewares/rateLimiter.js — IP Rate Limiting','Implementation',['P1-001','P1-002'],'Low',
  'Create the rate limiter middleware using express-rate-limit. For now use in-memory store. A Redis store will be added in Phase 8 when horizontal scaling is needed.',
  [
    'Confirm rateLimiter.js does not exist',
    'Import express-rate-limit (already in package.json)',
    'Configure: windowMs from RATE_LIMIT_WINDOW_MS env var (default 60000), max from RATE_LIMIT_MAX (default 5)',
    'Set standardHeaders: true (adds RateLimit-* headers to responses)',
    'Set legacyHeaders: false',
    'Custom handler: return 429 with { error: "Too many requests, please wait before submitting again." }',
    'Export the configured limiter',
    'Note in a comment: in-memory store — not suitable for multiple Node.js processes (Redis needed for cluster mode)',
  ],
  ['package.json (express-rate-limit version)', '.env (RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)', 'server.js (where limiter is applied)'],
  'Rate limiter middleware exported and ready to be applied to POST /api/leads.',
  []
));

allContent.push(...taskCard(
  'P3-004','Validate Env Variables on Server Startup','Implementation',['P1-002','P2-001'],'High',
  'Add a startup validation that checks all required env variables are present and valid before the server accepts connections. This prevents silent failures where a missing token lets all admin requests through.',
  [
    'In server.js, add a validateEnv() function that runs before app.listen()',
    'Required checks: TELEGRAM_BOT_TOKEN is not empty and not the placeholder value',
    'Required checks: ADMIN_TOKEN length >= 32 characters',
    'Required checks: TIMEOUT_MINUTES is a positive integer > 0',
    'Required checks: DATABASE_URL is present',
    'If any check fails: console.error the specific issue and process.exit(1)',
    'For non-critical checks (ADMIN_CHAT_ID placeholder): log a warning but do not exit',
    'Test: set TIMEOUT_MINUTES=0 in .env and confirm server refuses to start',
  ],
  ['server.js', '.env', '.env.example'],
  'Server exits immediately on startup with a clear error message if any critical config is missing or invalid.',
  ['Ensure this validation does not run during test execution (check NODE_ENV)']
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 4 — SERVICES LAYER
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(4,'Services Layer','Core business logic. Implement in isolation. Test each service independently.','7B3F00'));

allContent.push(...taskCard(
  'P4-001','Create server/services/pricingService.js','Implementation',['P1-005'],'High',
  'Create the pricing service using the EXACT constants documented in P1-005 from main.js. This is HIGH risk because any deviation causes users to see a different price on screen than what is stored in the database.',
  [
    'Confirm pricingService.js does not exist',
    'Copy pricing constants from the P1-005 reference document (NOT from memory)',
    'Implement calculatePrice(serviceType, area, outOfCity) as a pure function (no DB, no side effects)',
    'Implement all 5 service types with their minimum calculations',
    'Apply out-of-city surcharge AFTER base price calculation, BEFORE minimum check',
    'Apply MIN_ORDER (1000) as the final step',
    'Write 10 unit tests covering: each service type, minimum boundaries, out-of-city combinations',
    'Run tests: node --test (Node.js 18 built-in test runner)',
    'Cross-check 5 test cases against the frontend calculator manually in the browser',
    'Keep constants in a named exports block so they can be referenced elsewhere',
  ],
  ['main.js (pricing constants — source of truth)', 'P1-005 reference document', 'BUSINESS_LOGIC.md'],
  'pricingService.js produces identical prices to the frontend calculator for all inputs. All unit tests pass.',
  ['Any constant mismatch between main.js and pricingService.js will cause price discrepancies visible to customers']
));

allContent.push(...taskCard(
  'P4-002','Create server/services/telegramService.js — Foundation','Implementation',['P2-003','P3-004'],'High',
  'Create the Telegram service foundation: sending lead notifications, answering callbacks, and admin alerts. Worker /start registration is handled in Phase 6 (T-001). Token MUST be real before any function is tested.',
  [
    'Confirm telegramService.js does not exist',
    'Implement sendMessage(chatId, text, options) — raw Telegram Bot API call via https.request or node-fetch',
    'Implement sendLeadNotification(worker, lead) — composes formatted message + inline keyboard',
    'Validate callback_data payload stays under 64 bytes: JSON.stringify({l:id,w:id,a:"accept"}).length',
    'Implement answerCallbackQuery(callbackQueryId, text) — clears Telegram loading spinner',
    'Implement sendAdminAlert(message) — sends to ADMIN_CHAT_ID',
    'Wrap all API calls in try/catch — log errors but do NOT throw (so assignment flow is not blocked)',
    'Test sendAdminAlert with real token: should receive message in Telegram',
    'Verify TELEGRAM_BOT_TOKEN is real (not placeholder) before running any test',
  ],
  ['server/services/ (check existence)', '.env (TELEGRAM_BOT_TOKEN must be real)', 'BUSINESS_LOGIC.md (callback data format)'],
  'telegramService.js sends real Telegram messages. Admin alert test received in Telegram.',
  ['Do NOT test with placeholder token — API calls will silently fail or return 401', 'Never log the bot token']
));

allContent.push(...taskCard(
  'P4-003','Create server/services/assignmentService.js','Implementation',['P2-001','P2-002','P4-001','P4-002'],'High',
  'The core assignment engine. This is the most complex service — it manages transactions, row locking, worker selection, and triggers Telegram notifications. Must be implemented carefully to prevent race conditions.',
  [
    'Confirm assignmentService.js does not exist',
    'Implement assignLead(lead_id): BEGIN TRANSACTION -> SELECT lead FOR UPDATE -> SELECT worker (priority DESC, last_assigned ASC, NOT IN tried workers, active, under ACTIVE_LEAD_LIMIT) -> INSERT assignment -> UPDATE lead status -> UPDATE worker last_assigned_at -> call telegramService.sendLeadNotification() -> COMMIT',
    'Wrap Telegram call in try/catch INSIDE the transaction — if Telegram fails, still COMMIT the DB changes (log warning)',
    'Implement reassignLead(lead_id): same as assignLead but excludes current assignment worker from selection',
    'Implement updateStatus(lead_id, worker_id, action): validate transition legality -> UPDATE lead -> if rejected: call reassignLead()',
    'Add status transition validation map: only allow legal transitions',
    'Test each function independently with seeded data from P2-004',
    'Simulate race condition: two simultaneous assignLead calls for same lead — verify only one succeeds',
  ],
  ['db/pool.js', 'db/schema.sql (table structures)', 'server/services/telegramService.js', 'BUSINESS_LOGIC.md (state machine)'],
  'assignmentService assigns leads correctly, handles rejected/timeout reassignment, and prevents race conditions.',
  ['Transaction isolation is critical — test concurrent calls', 'If FOR UPDATE is missing, two workers can receive the same lead']
));

allContent.push(...taskCard(
  'P4-004','Create server/services/timeoutService.js — Cron Job','Implementation',['P4-003'],'High',
  'Create the background cron job. HIGH risk because it runs every 60 seconds and processes leads in bulk. A bug here can mass-reassign or mass-expire valid leads.',
  [
    'Confirm timeoutService.js does not exist',
    'Import node-cron (already in package.json)',
    'Implement checkTimeouts() with two queries using FOR UPDATE SKIP LOCKED',
    'Query 1: SELECT assigned leads WHERE updated_at < NOW() - INTERVAL TIMEOUT_MINUTES minutes',
    'For each result: call assignmentService.reassignLead(lead_id) wrapped in try/catch — one failure must NOT abort the entire batch',
    'Query 2: SELECT accepted leads WHERE updated_at < NOW() - INTERVAL ACCEPTED_TTL_MINUTES minutes',
    'For each result: UPDATE status to failed_contact',
    'Export startCron() function that registers "* * * * *" schedule',
    'Add a console.log("[cron] checkTimeouts fired") for monitoring',
    'Test with TIMEOUT_MINUTES=1 — submit a lead, do not respond, wait 60-120 seconds, verify reassignment',
  ],
  ['server/services/assignmentService.js', 'db/pool.js', '.env (TIMEOUT_MINUTES, ACCEPTED_TTL_MINUTES)', 'server.js (startCron is called here)'],
  'Timeout cron fires every 60s, reassigns stale leads, marks expired accepted leads as failed_contact.',
  ['A bug in the cron loop can expire all assigned leads in one pass — test with TIMEOUT_MINUTES=10 first, then reduce']
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 5 — ROUTES & WIRING
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(5,'Routes & Wiring','All API endpoints plus fixing the broken server.js imports.','1D6F42'));

allContent.push(...taskCard(
  'P5-001','Create server/routes/cities.js','Implementation',['P2-001','P3-001'],'Low',
  'Create the cities routes — the simplest route file. Public endpoint for form dropdown, plus admin CRUD. Good starting point to validate the route/middleware pattern.',
  [
    'Confirm routes/cities.js does not exist',
    'Create Express Router',
    'GET /public — no auth, returns { id, name } for is_active=true cities only',
    'GET / — admin auth required, returns all cities with worker count',
    'POST / — admin auth required, validate name (required), create city',
    'PATCH /:id — admin auth required, update city fields',
    'Test GET /api/cities/public without auth — should return city list',
    'Test POST /api/cities without token — should return 401',
    'Verify response format matches API.md documentation',
  ],
  ['server/middlewares/auth.js', 'db/pool.js', 'docs/API.md (response format)'],
  'Cities routes work. Public endpoint returns city list. Admin endpoints require Bearer token.',
  []
));

allContent.push(...taskCard(
  'P5-002','Create server/routes/workers.js','Implementation',['P3-001','P4-003'],'Medium',
  'Create worker management routes — used by admin panel and internal assignment. Worker deactivation affects ongoing assignment, so the PATCH endpoint needs care.',
  [
    'Confirm routes/workers.js does not exist',
    'GET / — admin auth, returns all workers with city name join',
    'POST / — admin auth, validate name (required) and city_id (required), create worker',
    'PATCH /:id — admin auth, allow updating: name, phone, telegram_chat_id, city_id, priority, is_active',
    'When setting is_active=false: do NOT touch existing assigned/accepted leads (only affects future assignments)',
    'Reject priority values outside 1-10 range with 400 error',
    'Test creating a worker, then patching to deactivate, verify deactivated worker is excluded from new assignments',
    'Verify 409 response if telegram_chat_id already registered to another worker',
  ],
  ['server/middlewares/auth.js', 'db/pool.js', 'docs/API.md'],
  'Worker CRUD works. Deactivated workers are excluded from assignment without affecting their existing leads.',
  []
));

allContent.push(...taskCard(
  'P5-003','Create server/routes/leads.js','Implementation',['P3-001','P3-002','P3-003','P4-001','P4-003'],'High',
  'The most critical route file — handles public lead submission (the primary product flow) and admin lead management. Every piece of middleware from Phase 3 converges here.',
  [
    'Confirm routes/leads.js does not exist',
    'POST / (public): apply rateLimiter -> validateLead -> call pricingService.calculatePrice() -> spam check -> INSERT lead -> call assignmentService.assignLead() -> return 201',
    'GET / (admin): auth middleware, support query params: status, city_id, page, limit, from, to',
    'GET /:id (admin): auth middleware, return lead + assignment_history join',
    'PATCH /:id/status (admin): auth middleware, validate transition, update status',
    'Test the full flow end-to-end: submit form -> lead created -> worker notified via Telegram',
    'Test duplicate phone within 10 minutes -> existing lead updated, not duplicated',
    'Test rate limiter: 6th request in 1 minute -> 429 response',
    'Test admin list with status filter: only leads with that status returned',
  ],
  ['server/middlewares/ (all three)', 'server/services/pricingService.js', 'server/services/assignmentService.js', 'db/pool.js', 'docs/API.md'],
  'Lead submission fully functional end-to-end. Rate limiting, validation, pricing, assignment, and Telegram notification all work.',
  ['Test with real Telegram token before marking complete — the integration must work end-to-end']
));

allContent.push(...taskCard(
  'P5-004','Create server/routes/telegram.js — Webhook Handler','Implementation',['P4-002','P4-003'],'High',
  'Create the Telegram webhook receiver. Telegram sends button press events here. Every response must be HTTP 200 — non-200 causes Telegram to retry the same update repeatedly.',
  [
    'Confirm routes/telegram.js does not exist',
    'POST /webhook — no external auth (validated internally via chat_id ownership)',
    'Parse callback_query from request body',
    'Extract: callback_query.from.id (Telegram user ID), callback_query.data (JSON string), callback_query.id',
    'Parse callback data JSON: {l: lead_id, w: worker_id, a: action}',
    'Query DB: verify that worker_id has telegram_chat_id = callback_query.from.id',
    'If verification fails: answerCallbackQuery with error text, return HTTP 200',
    'If valid: call assignmentService.updateStatus(lead_id, worker_id, action)',
    'Always call answerCallbackQuery() to clear Telegram loading spinner',
    'ALWAYS return HTTP 200 — even for errors (return 200 with error in answerCallbackQuery)',
    'Test with real Telegram: tap Accept -> DB shows status=accepted',
  ],
  ['server/services/assignmentService.js', 'server/services/telegramService.js', 'db/pool.js (worker lookup)'],
  'Webhook correctly routes Accept/Reject to assignmentService. Always returns 200. Chat ID ownership verified.',
  ['Never return non-200 — Telegram will retry the same update and cause duplicate processing']
));

allContent.push(...taskCard(
  'P5-005','Fix server.js — Wire All Routes & Start Cron','Implementation',['P5-001','P5-002','P5-003','P5-004','P4-004'],'High',
  'Update server.js to import the now-existing routes and start the timeout cron. This is the final wiring step that makes the server runnable for the first time.',
  [
    'Open server.js and map each existing import to its now-created file',
    'Fix the route imports: require("./server/routes/leads"), etc.',
    'Fix the timeoutService import and call startCron() after DB connection is verified',
    'Verify the health endpoint responds: curl http://localhost:3000/health',
    'Run npm start — server must start without MODULE_NOT_FOUND errors',
    'Run npm run dev — hot reload must work',
    'Test all 5 route groups are reachable: /health, /api/leads, /api/workers, /api/cities, /api/telegram/webhook',
    'Verify static files served: open http://localhost:3000 in browser — landing page renders',
    'Submit a test lead through the form — verify end-to-end flow works',
  ],
  ['server.js', 'All Phase 3-5 created files'],
  'Server starts without errors. All routes reachable. Frontend form submits successfully. Cron starts.',
  ['This is the first time the full system will run — test on local before anything else']
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 6 — TELEGRAM HARDENING
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(6,'Telegram Hardening','Secure the webhook, fix stale buttons, add retries and worker onboarding.','C55A11'));

allContent.push(...taskCard(
  'T-001','Implement Worker /start Command — Self-Registration','Implementation',['P5-004'],'Medium',
  'CRITICAL MISSING FEATURE: Currently, workers must be manually added to the DB by an admin with their telegram_chat_id. This creates an operational bottleneck and risks of incorrect IDs. The /start command lets workers self-register.',
  [
    'In routes/telegram.js, add handling for message updates (not just callback_query)',
    'If update.message.text === "/start": read update.message.from.id (the Telegram chat ID)',
    'Check if a worker exists with this telegram_chat_id in the DB',
    'If exists: reply "You are already registered as {worker.name}"',
    'If not exists: create a pending registration request — OR — check if admin pre-created worker with phone but no chat_id, then link by phone',
    'Design decision: auto-register (simpler) vs admin-approval-required (safer) — document the choice',
    'For MVP: if admin pre-created worker record with is_active=false and no telegram_chat_id — worker sends /start with their phone number -> system links their chat_id and activates them',
    'Send confirmation: "Registration successful, {name}! You will now receive lead notifications."',
    'Test: add a worker row with is_active=false and no telegram_chat_id, then send /start with the matching phone',
  ],
  ['server/routes/telegram.js', 'db/pool.js (workers table)', 'server/services/telegramService.js'],
  'Workers can self-register via /start command. No longer requires admin to manually set telegram_chat_id.',
  []
));

allContent.push(...taskCard(
  'T-002','Add Webhook Signature Verification','Implementation',['P5-004'],'High',
  'Without signature verification, anyone who discovers the webhook URL can send fake lead acceptances. Telegram supports a secret token header that must be validated.',
  [
    'In routes/telegram.js, add middleware that checks X-Telegram-Bot-Api-Secret-Token header',
    'Add TELEGRAM_WEBHOOK_SECRET to .env (generate 32+ random chars)',
    'When registering webhook with Telegram setWebhook: include secret_token parameter',
    'Middleware: if header is missing or does not match TELEGRAM_WEBHOOK_SECRET -> return HTTP 200 (do NOT return 4xx — Telegram interprets this as endpoint error) but take no action',
    'Add to .env.example',
    'Test: send a POST to webhook without the header -> request ignored',
    'Test: send a POST with correct header -> request processed',
    'Re-register the webhook with Telegram to include the secret_token',
  ],
  ['server/routes/telegram.js', '.env (TELEGRAM_WEBHOOK_SECRET)', 'Production.md (webhook registration steps)'],
  'Webhook rejects unsigned requests silently. Only Telegram-signed updates are processed.',
  ['Must re-register webhook with Telegram after adding secret_token — old registration does not have the secret']
));

allContent.push(...taskCard(
  'T-003','Fix Stale Telegram Buttons After Reassignment','Implementation',['P4-002','P4-003'],'Medium',
  'When a lead is reassigned (timeout or rejection), the previous worker\'s Telegram message still shows active Accept/Reject buttons. While the backend correctly rejects stale actions, the UX is confusing.',
  [
    'In assignmentService.js, after reassigning a lead, identify the previous worker\'s message ID',
    'Store message_id in lead_assignments table: add message_id column to schema (new column, non-destructive)',
    'In telegramService.sendLeadNotification(): after sendMessage succeeds, record the returned message_id',
    'In assignmentService.reassignLead(): after assigning to new worker, call telegramService.clearButtons(previousWorkerChatId, previousMessageId)',
    'Implement clearButtons(chatId, messageId): call Telegram editMessageReplyMarkup with empty reply_markup',
    'Handle failure gracefully: if clearing buttons fails (message too old, user blocked bot), log and continue',
    'Test: submit lead, reject, verify first worker\'s buttons are removed, second worker receives notification',
  ],
  ['server/services/telegramService.js', 'server/services/assignmentService.js', 'db/schema.sql (add message_id to lead_assignments)'],
  'Previous worker\'s message has buttons removed after reassignment. No confusing stale buttons.',
  ['Adding message_id column: use ALTER TABLE IF NOT EXISTS or add to schema CREATE and re-run']
));

allContent.push(...taskCard(
  'T-004','Add Retry Logic for Failed Telegram Sends','Implementation',['P4-002'],'Medium',
  'If Telegram API is temporarily unavailable when a lead is assigned, the worker never receives the notification and the lead stays in "assigned" state indefinitely (until timeout). Retry logic prevents silent notification failures.',
  [
    'In telegramService.sendLeadNotification(), wrap the API call in a retry loop',
    'Implement simple exponential backoff: attempt 1 immediately, attempt 2 after 2s, attempt 3 after 4s',
    'Maximum 3 attempts — if all fail, log critical error with lead_id and worker telegram_chat_id',
    'If all retries fail: call sendAdminAlert() to notify admin that a notification failed',
    'Do NOT block the assignment transaction on retries — perform retries asynchronously after commit',
    'Test: temporarily set an invalid bot token, submit lead, verify retry attempts are logged',
    'Restore real token and verify success on retry',
  ],
  ['server/services/telegramService.js', 'server/services/assignmentService.js'],
  'Up to 3 retry attempts for failed Telegram sends. Admin alerted if all retries fail.',
  []
));

allContent.push(...taskCard(
  'T-005','Add Admin Telegram Alerts for Critical Events','Implementation',['P4-002'],'Low',
  'Admin needs to know in real-time when leads cannot be assigned (no workers) or when system errors occur. Implement sendAdminAlert() integration into key failure paths.',
  [
    'In assignmentService.js: when a lead becomes "unassigned" (no workers available), call telegramService.sendAdminAlert()',
    'Alert message: "Lead #ID unassigned — no available workers in {city}. Manual assignment required."',
    'In timeoutService.js: when a lead becomes "failed_contact", call sendAdminAlert()',
    'Alert message: "Lead #ID marked failed_contact — worker accepted but no contact for 30 min."',
    'Verify ADMIN_CHAT_ID is a real Telegram user ID before enabling',
    'Test: disable all workers, submit a lead — admin should receive Telegram alert',
    'Add a cooldown to prevent alert flood: no more than 1 alert per 5 minutes for the same event type',
  ],
  ['server/services/assignmentService.js', 'server/services/timeoutService.js', 'server/services/telegramService.js', '.env (ADMIN_CHAT_ID)'],
  'Admin receives Telegram messages for unassigned leads and failed_contact events.',
  []
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 7 — ADMIN PANEL
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(7,'Admin Panel','Dashboard, lead management, worker management. Build on top of the working API.','7030A0'));

allContent.push(...taskCard(
  'A-001','Create admin.html — Authentication & Dashboard Shell','Implementation',['P5-003','P5-002'],'Medium',
  'Create the admin panel entry point with a login form and dashboard shell. Authentication is Bearer token stored in sessionStorage (cleared on browser close). Build minimal — no framework required.',
  [
    'Check if admin.html already exists (P1-003 should have confirmed)',
    'Create admin.html at project root (served by Express static middleware at /admin.html)',
    'Implement login form: password input, submit button',
    'On submit: attempt GET /api/leads?limit=1 with entered token as Bearer — if 200: store in sessionStorage, redirect to dashboard; if 401: show error',
    'Dashboard shell: navbar with sections (Leads, Workers, Cities), logout button',
    'Dashboard counters: fetch /api/leads with each status filter, display counts',
    'Highlight unassigned count in red if > 0 (operational alert)',
    'Apply same Tailwind CSS + Inter font as main index.html for consistent styling',
  ],
  ['index.html (style reference)', 'server.js (static file serving config)', 'docs/API.md (auth header format)'],
  'Admin can log in with ADMIN_TOKEN, see lead count dashboard, and navigate between sections.',
  ['HTTPS must be used in production — token in sessionStorage is visible to browser extensions']
));

allContent.push(...taskCard(
  'A-002','Admin Panel — Lead Management Table','Implementation',['A-001'],'Medium',
  'Create a filterable leads table in the admin panel. This is the primary operational view for managing lead assignments.',
  [
    'Add Leads section to admin.html',
    'Build a fetch call to GET /api/leads with status/city/date filter params',
    'Render results in an HTML table: ID, phone, city, service, status (colored badge), worker, price, date',
    'Add filter controls: status dropdown, city dropdown (from /api/cities), date range pickers',
    'Add a Cancel button per lead that calls PATCH /api/leads/:id/status with { status: "canceled" }',
    'Confirm dialog before canceling: "Are you sure you want to cancel lead #X?"',
    'Add pagination: prev/next buttons using page param',
    'Clicking a lead row opens a detail modal: show full info + assignment history',
    'Refresh leads table automatically every 30 seconds',
  ],
  ['admin.html', 'docs/API.md (GET /api/leads response format)'],
  'Admin can view, filter, and cancel leads. Assignment history visible per lead.',
  []
));

allContent.push(...taskCard(
  'A-003','Admin Panel — Worker Management','Implementation',['A-001'],'Medium',
  'Create worker management section: list workers, add new workers, edit priority/city, activate/deactivate.',
  [
    'Add Workers section to admin.html',
    'Fetch GET /api/workers and render table: name, phone, city, priority, status (active/inactive badge), last assigned',
    'Add "New Worker" button: opens form modal with fields from POST /api/workers spec',
    'In the form, explain that telegram_chat_id is optional — worker can self-register via /start command (Phase 6)',
    'Each worker row: Edit button (opens pre-filled form), Deactivate/Activate toggle button',
    'Deactivate confirmation: "Deactivating {name} will stop them receiving new leads. Existing leads are unaffected."',
    'After any action, refresh the workers table',
    'Show worker\'s active lead count next to their name (helps decide who to deactivate)',
  ],
  ['admin.html', 'docs/API.md (worker endpoints)'],
  'Admin can add, edit, activate, and deactivate workers from the browser without using the API directly.',
  []
));

allContent.push(...taskCard(
  'A-004','Admin Panel — City Management','Implementation',['A-001'],'Low',
  'Add city management. Simple table with add/edit capability. Less frequently used than leads/workers.',
  [
    'Add Cities section to admin.html',
    'Fetch GET /api/cities (admin) and render: name, delivery_type, delivery_price, is_active, worker count',
    'Add "New City" button: opens form with name (required), delivery_type dropdown, delivery_price input',
    'Edit button per city: updates delivery settings',
    'Toggle active/inactive per city',
    'Note: deactivating a city hides it from the public form dropdown but existing leads are unaffected',
  ],
  ['admin.html', 'docs/API.md (city endpoints)'],
  'Admin can manage cities. New cities immediately appear in lead submission form.',
  []
));

allContent.push(...taskCard(
  'A-005','Add OPERATOR_TOKEN — Read-Only Role','Implementation',['P3-001'],'Medium',
  'Add a second access level for operators who need to view lead and worker data but should not be able to make destructive changes.',
  [
    'Add OPERATOR_TOKEN to .env (different value from ADMIN_TOKEN)',
    'Add OPERATOR_TOKEN to .env.example with description',
    'Modify auth.js: extract the validated token role ("admin" or "operator") and attach to req.userRole',
    'In workers routes: POST and PATCH require admin role, GET allows operator',
    'In leads routes: PATCH /:id/status requires admin, GET allows operator',
    'In cities routes: POST and PATCH require admin, GET allows operator',
    'Test: operator token can list leads but cannot cancel them (403 response)',
    'Update admin.html: operator login sees read-only view (no edit/cancel buttons)',
  ],
  ['server/middlewares/auth.js', '.env', 'All route files (add role check)'],
  'Two roles working: admin (full access) and operator (read-only). Role attached to request object.',
  []
));

allContent.push(...taskCard(
  'A-006','Add CSV Export for Leads','Implementation',['P5-003'],'Low',
  'Add a CSV download endpoint for the admin to export lead data for reporting and analysis.',
  [
    'Add GET /api/leads/export to leads.js route (admin auth required)',
    'Accept same filter params as GET /api/leads (status, city_id, from, to)',
    'Set response headers: Content-Type: text/csv, Content-Disposition: attachment; filename="leads_{date}.csv"',
    'Generate CSV with columns: id, phone, city, service_type, area, price, status, worker, created_at',
    'Limit export to 10,000 rows maximum (add LIMIT to SQL query)',
    'In admin.html: add "Export CSV" button that triggers download',
    'Test: export filtered leads, open in spreadsheet, verify all columns present',
  ],
  ['server/routes/leads.js', 'admin.html'],
  'Admin can download a CSV of filtered leads for external reporting.',
  []
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 8 — DEVOPS & SECURITY
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(8,'DevOps & Security','Production database, CI/CD pipeline, secure deploy. Every step verified before the next.','C00000'));

allContent.push(...taskCard(
  'D-001','Set Up Production Database on Supabase','DevOps',['P2-002'],'Critical',
  'Create and configure the production PostgreSQL database. CRITICAL — this is live data storage. Every step must be done carefully and in the correct order.',
  [
    'Create a Supabase project at supabase.com',
    'Copy the connection string from Settings -> Database -> Connection string (URI format)',
    'Go to SQL Editor in Supabase Studio',
    'Paste and run db/schema.sql — verify all 4 tables are created in Table Editor',
    'Do NOT run seed.sql on production — seed is for local only',
    'Set DATABASE_URL in the production environment to the Supabase connection string',
    'Verify SSL is enabled in the connection string (Supabase requires SSL)',
    'Update db/pool.js if needed to add ssl: { rejectUnauthorized: false } for Supabase',
    'Test connection from deployed backend: GET /health should show DB status OK',
    'Enable daily automatic backups in Supabase dashboard',
  ],
  ['db/schema.sql', 'db/pool.js (SSL config)', '.env (DATABASE_URL)'],
  'Production database running on Supabase with schema applied. SSL connection verified. Daily backups enabled.',
  ['NEVER run seed.sql on production', 'NEVER expose Supabase service_role key — only use the connection string']
));

allContent.push(...taskCard(
  'D-002','Configure Railway Staging Environment','DevOps',['D-001','P5-005'],'High',
  'Set up the staging environment on Railway. Staging uses a separate DB from production. Auto-deploys from the main branch.',
  [
    'Create Railway project for staging',
    'Add PostgreSQL plugin to staging project',
    'Apply schema.sql to staging DB via Railway console',
    'Connect GitHub repository to Railway staging service',
    'Set all environment variables in Railway staging (use staging-specific ADMIN_TOKEN, staging bot token)',
    'Create a SEPARATE Telegram bot for staging (BotFather: /newbot)',
    'Set auto-deploy from main branch',
    'Deploy and verify: GET https://staging-url.railway.app/health returns 200',
    'Register staging Telegram webhook: setWebhook with staging URL',
    'Run a full end-to-end test on staging before setting up production',
  ],
  ['server.js', 'db/schema.sql', '.env (staging-specific values)'],
  'Staging environment running on Railway. Auto-deploys from main branch. Separate bot and DB from production.',
  []
));

allContent.push(...taskCard(
  'D-003','Configure Railway Production Environment','DevOps',['D-001','D-002'],'Critical',
  'Set up production deployment on Railway. Only deploy to production after staging is confirmed working.',
  [
    'Create a SEPARATE Railway project for production (different from staging)',
    'Connect to the Supabase production DB (from D-001)',
    'Set all production environment variables: real ADMIN_TOKEN, real TELEGRAM_BOT_TOKEN, production CORS_ORIGIN',
    'Set auto-deploy ONLY from release tags (not from main branch)',
    'Configure custom domain in Railway Settings -> Domains',
    'Ensure HTTPS is enforced (Railway provides this automatically)',
    'Deploy initial version and verify: GET https://your-domain.com/health',
    'Register production Telegram webhook: setWebhook with production domain URL',
    'Verify webhook with: GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo',
    'Submit one test lead to confirm end-to-end flow works in production',
  ],
  ['All Phase 1-7 files', '.env (production values)', 'docs/Production.md'],
  'Production environment live on Railway with custom domain, HTTPS, production DB, and real Telegram bot.',
  ['Deploy to production ONLY after staging passes all tests', 'Production bot token must be different from staging']
));

allContent.push(...taskCard(
  'D-004','GitHub Actions — CI Pipeline (Tests on PRs)','DevOps',['P5-005'],'Medium',
  'Create a CI pipeline that runs on every pull request to catch regressions before they reach staging.',
  [
    'Create .github/workflows/ci.yml',
    'Trigger: on push and pull_request',
    'Set up PostgreSQL service container in the workflow',
    'Steps: checkout -> setup node 18 -> npm ci -> apply schema to test DB -> npm test',
    'Fail the pipeline if any test fails',
    'Add a step to verify server starts: npm start & sleep 5 && curl http://localhost:3000/health && kill %1',
    'Add TELEGRAM_BOT_TOKEN=test_placeholder as env var (tests should mock Telegram calls)',
    'Add status badge to README.md',
  ],
  ['.github/workflows/ (create)', 'package.json (test script)', 'db/schema.sql'],
  'CI pipeline runs on every PR. PRs with failing tests cannot be merged.',
  []
));

allContent.push(...taskCard(
  'D-005','GitHub Actions — Auto Deploy to Staging on main Merge','DevOps',['D-002','D-004'],'Medium',
  'Create auto-deployment workflow that deploys to staging whenever code is merged to main branch.',
  [
    'Create .github/workflows/deploy-staging.yml',
    'Trigger: on push to main branch',
    'Steps: checkout -> deploy to Railway staging using railway CLI',
    'Add RAILWAY_TOKEN to GitHub repository secrets',
    'After deploy: health check the staging URL',
    'Notify via Telegram message to admin on successful/failed deploy (optional)',
    'Test by merging a small change to main and verifying Railway deploys automatically',
  ],
  ['.github/workflows/ (create)', 'docs/Production.md (Railway CLI commands)'],
  'Every merge to main automatically deploys to staging. Health check confirms deployment success.',
  []
));

allContent.push(...taskCard(
  'D-006','GitHub Actions — Production Deploy on Release Tags','DevOps',['D-003','D-005'],'High',
  'Create a controlled production deployment workflow triggered only by release tags. Requires manual approval to prevent accidental production pushes.',
  [
    'Create .github/workflows/deploy-production.yml',
    'Trigger: on push of tags matching v* (e.g., v1.0.0)',
    'Add environment: production with required_reviewers set to at least 1 person',
    'Steps: checkout -> wait for approval -> deploy to Railway production',
    'After deploy: health check production URL',
    'On success: send admin Telegram alert "Production deployed: {tag}"',
    'Test: create a v0.0.1 tag, verify approval requirement, approve, verify deploy',
  ],
  ['.github/workflows/ (create)', 'GitHub repository Settings -> Environments (set up production environment)'],
  'Production only deploys on release tags with manual approval gate.',
  ['Test the approval gate before first real production deploy']
));

allContent.push(...taskCard(
  'D-007','Add Redis for Distributed Rate Limiting','DevOps',['D-002','P3-003'],'Medium',
  'The in-memory rate limiter from P3-003 does not work across multiple Node.js processes (PM2 cluster or Railway replicas). Add Redis to make rate limiting consistent across all instances.',
  [
    'Add Redis service to Railway staging project',
    'Install rate-limit-redis package: npm install rate-limit-redis ioredis',
    'Update rateLimiter.js: create RedisStore using REDIS_URL env var if present, fall back to MemoryStore',
    'Add REDIS_URL to .env.example with description',
    'Test: run two Node.js processes on different ports, verify rate limit is shared between them',
    'Only apply Redis if REDIS_URL is set — this makes the change backwards-compatible for local dev',
    'Monitor Redis memory usage — rate limit data is small, should not be an issue',
  ],
  ['server/middlewares/rateLimiter.js', 'package.json (new deps)', '.env (REDIS_URL)'],
  'Rate limiting is consistent across all Node.js processes. Falls back to in-memory if Redis not configured.',
  []
));

allContent.push(...taskCard(
  'D-008','Schedule Daily Database Backups','DevOps',['D-001'],'High',
  'Ensure production data is backed up daily. If using Supabase, this is built-in. If using custom PostgreSQL, configure pg_dump.',
  [
    'For Supabase: verify automatic daily backups are enabled in project Settings -> Backups',
    'For custom PostgreSQL on VPS: create a cron script that runs pg_dump daily',
    'pg_dump command: pg_dump -Fc DATABASE_URL > /backup/lead_distribution_$(date +%Y%m%d).dump',
    'Rotate backups: keep last 7 days, delete older ones',
    'Test restore on staging: pg_restore -d staging_db /backup/latest.dump',
    'Document the restore procedure in Production.md',
    'Set up alert: if backup fails (non-zero exit code), send admin Telegram alert',
  ],
  ['Production.md (document procedure)', 'Supabase dashboard (if applicable)'],
  'Daily backups confirmed running. Restore procedure documented and tested.',
  ['Test the restore procedure BEFORE you need it — not after a data loss event']
));

allContent.push(...taskCard(
  'D-009','Add Nginx + SSL for VPS Deployment (Alternative to Railway)','DevOps',['P5-005'],'High',
  'If deploying on a VPS instead of Railway, configure Nginx as a reverse proxy with Let\'s Encrypt SSL. Telegram webhook REQUIRES HTTPS.',
  [
    'Install Nginx: sudo apt install nginx',
    'Create Nginx config at /etc/nginx/sites-available/agroservice with proxy_pass to localhost:3000',
    'Install Certbot: sudo apt install certbot python3-certbot-nginx',
    'Run: sudo certbot --nginx -d your-domain.com',
    'Verify HTTPS: curl https://your-domain.com/health',
    'Configure auto-renewal: certbot renew runs via system timer',
    'Install PM2: npm install -g pm2 && pm2 start server.js --name agroservice && pm2 startup && pm2 save',
    'Verify PM2 restarts on reboot',
  ],
  ['docs/Production.md', '/etc/nginx/sites-available/ (create)', 'server.js (PORT config)'],
  'Nginx serves HTTPS, forwards to Node.js. Let\'s Encrypt auto-renews. PM2 restarts on reboot.',
  ['Only needed for VPS deployment — skip if using Railway which handles SSL automatically']
));

// ════════════════════════════════════════════════════════════════════════════
// PHASE 9 — SEO & FRONTEND
// ════════════════════════════════════════════════════════════════════════════
allContent.push(...phaseHeader(9,'SEO & Frontend','Non-destructive improvements to index.html and routing. Zero backend risk.','1D6F42'));

allContent.push(...taskCard(
  'S-001','Add Meta Title, Description & OG Tags to index.html','Implementation',['P5-005'],'Low',
  'Add SEO meta tags to index.html. Currently the page has no meta description or title optimized for keywords. This is the highest-impact, lowest-effort SEO task.',
  [
    'Open index.html and locate the <head> section',
    'Check if any meta tags already exist (title, description)',
    'Replace or add: <title> with Ukrainian keyword-optimized title (vspashka, pokos, tsilyna)',
    'Add <meta name="description"> with 150-160 characters including city and price range',
    'Add Open Graph tags: og:title, og:description, og:image, og:url',
    'Add Twitter Card tags: twitter:card, twitter:title, twitter:description',
    'Add <meta name="robots" content="index, follow">',
    'Verify in browser: page title shows in tab',
    'Test OG tags with Facebook Sharing Debugger or opengraph.xyz',
  ],
  ['index.html (head section)'],
  'Page has keyword-rich title, meta description, and OG tags. SEO and social sharing improved.',
  []
));

allContent.push(...taskCard(
  'S-002','Add Schema.org LocalBusiness Structured Data','Implementation',['S-001'],'Low',
  'Add JSON-LD structured data to index.html. This enables Google rich results (star ratings, business hours, service areas in search results).',
  [
    'Add a <script type="application/ld+json"> block in the <head> of index.html',
    'Use @type: LocalBusiness with real business details',
    'Include: name, description, telephone, openingHours (Mo-Su 07:00-20:00), priceRange',
    'Include areaServed array with all served cities',
    'Include hasOfferCatalog with all 5 service types',
    'Test with Google Rich Results Test tool (https://search.google.com/test/rich-results)',
    'Fix any validation errors reported by the tool',
  ],
  ['index.html (head section)', 'docs/SEO.md (schema template)'],
  'Schema.org markup validates cleanly. Google Rich Results Test shows no errors.',
  []
));

allContent.push(...taskCard(
  'S-003','Self-Host Hero Image & Add Performance Optimizations','Implementation',['P5-005'],'Low',
  'The hero image currently loads from Unsplash (external CDN). In production, this creates a privacy/GDPR concern and LCP performance dependency on a third-party server.',
  [
    'Identify the Unsplash image URL in index.html',
    'Download the image and save to a local /images/ directory',
    'Update the CSS/HTML reference to use the local path',
    'Add loading="lazy" to all below-fold images in index.html',
    'Add explicit width and height attributes to all <img> tags (prevents CLS)',
    'Add <link rel="preload" as="image" href="/images/hero.jpg"> in <head> for the hero image',
    'Test with Lighthouse: LCP score should improve',
    'Verify the local image loads correctly in the browser',
  ],
  ['index.html (all img references)', 'style.css (background-image references)'],
  'Hero image served locally. No external Unsplash dependencies. Lighthouse performance score improved.',
  []
));

allContent.push(...taskCard(
  'S-004','Create /robots.txt and /sitemap.xml Endpoints','Implementation',['P5-001'],'Low',
  'Add robots.txt to control crawler access and sitemap.xml to help Google discover all pages. Both served by Express.',
  [
    'In server.js or a new route: add GET /robots.txt that returns the robots.txt content',
    'robots.txt should: Allow /, Disallow /api/, Disallow /admin, include Sitemap URL',
    'Add GET /sitemap.xml endpoint in routes/cities.js or server.js',
    'Sitemap should include: / (main page), /vspashka-gorodu (if exists), plus dynamically generated city pages',
    'Generate sitemap dynamically from the cities table — query active cities, generate URLs',
    'Set Content-Type: application/xml for sitemap, text/plain for robots.txt',
    'Test: curl https://your-domain.com/robots.txt and curl https://your-domain.com/sitemap.xml',
    'Validate sitemap at https://www.xml-sitemaps.com/validate-xml-sitemap.html',
  ],
  ['server.js (add routes)', 'server/routes/cities.js (dynamic sitemap)', 'docs/SEO.md'],
  'robots.txt and sitemap.xml accessible via HTTP. Sitemap includes all active city pages.',
  []
));

allContent.push(...taskCard(
  'S-005','Fix CORS_ORIGIN for Production — Remove Wildcard','Implementation',['D-003'],'Medium',
  'The current CORS configuration may use a wildcard (*) origin. In production, this allows any website to make API calls. Must be locked to the production domain.',
  [
    'Open server.js and find the CORS configuration',
    'Change from wildcard to: origin: process.env.CORS_ORIGIN || "http://localhost:3000"',
    'Add CORS_ORIGIN=https://your-domain.com to production Railway environment variables',
    'Add CORS_ORIGIN to .env.example with description',
    'Test: from a different domain, make a POST to /api/leads — should receive CORS error',
    'Test: from the production domain, form submission should still work',
    'If admin panel is on a different subdomain (admin.your-domain.com), add it to the allowed origins array',
  ],
  ['server.js (CORS config)', '.env (CORS_ORIGIN)', 'Railway production environment variables'],
  'CORS restricts API access to production domain only. Cross-origin requests from unauthorized domains blocked.',
  []
));

allContent.push(...taskCard(
  'S-006','Move Pricing Constants to Shared Configuration','Refactor',['P4-001','P5-003'],'High',
  'This is the highest-risk duplication in the codebase. Pricing constants exist in both main.js (frontend) and pricingService.js (backend). This refactor consolidates them WITHOUT breaking either.',
  [
    'Create a new file: config/pricing.js with all pricing constants exported',
    'In server.js (or as an API endpoint): add GET /api/config/pricing that returns the constants as JSON',
    'In pricingService.js: replace hardcoded constants with require("../../config/pricing")',
    'In main.js: modify the calculator initialization to fetch /api/config/pricing on page load, then populate the constants',
    'Add a loading state in main.js: show "Loading prices..." while fetch is in progress',
    'Fall back to hardcoded values in main.js if the fetch fails (network offline)',
    'Test: change one constant in config/pricing.js — verify BOTH the frontend calculator and the backend price calculation update',
    'Test offline: disconnect network, submit form — fallback prices should still work',
  ],
  ['main.js (pricing constants)', 'server/services/pricingService.js', 'config/pricing.js (create)', 'server.js (new endpoint)'],
  'Single source of truth for pricing. Frontend fetches prices from API. Backend reads from same config file.',
  ['HIGH risk: if main.js fallback fails and pricing fetch fails, the calculator will show wrong prices']
));

allContent.push(...taskCard(
  'S-007','Register Google Search Console & Submit Sitemap','DevOps',['S-004','D-003'],'Low',
  'Register the production domain with Google Search Console and submit the sitemap. This is required for Google to index the site.',
  [
    'Go to https://search.google.com/search-console',
    'Add property: enter production domain URL',
    'Choose verification method: HTML tag (add <meta name="google-site-verification"> to index.html)',
    'Deploy the updated index.html with the verification tag',
    'Click Verify in Search Console',
    'Go to Sitemaps section: enter https://your-domain.com/sitemap.xml and submit',
    'Monitor Coverage report for any indexing errors',
    'Request indexing for the main URL in URL Inspection tool',
  ],
  ['index.html (add verification tag)', 'sitemap.xml endpoint (must be live)'],
  'Domain verified in Google Search Console. Sitemap submitted. Pages queued for indexing.',
  []
));

// ════════════════════════════════════════════════════════════════════════════
// MISSING TASKS
// ════════════════════════════════════════════════════════════════════════════
allContent.push(
  new Paragraph({children:[new PageBreak()]}),
  h1('Missing Tasks — Not in Original Backlog'),
  p('The following 8 tasks were identified during architectural analysis. They were not in the original backlog but are necessary for a production-ready system.'),
  sp(120),
);

allContent.push(...taskCard(
  'MT-001','Add Structured Logging — winston or pino','Implementation',['P5-005'],'Low',
  'console.log is not suitable for production. It has no log levels, no structured output, and cannot be queried. Add a logging framework before deployment.',
  [
    'Install pino (faster) or winston: npm install pino pino-pretty',
    'Create logger.js utility: const logger = require("pino")({ level: process.env.LOG_LEVEL || "info" })',
    'Replace all console.log/error in services and routes with logger.info/logger.error',
    'In production, set LOG_LEVEL=warn in environment variables',
    'Structured logs: always include { lead_id, worker_id, action } in service logs',
    'Never log: passwords, tokens, full phone numbers (only last 4 digits)',
  ],
  ['All server/ files with console.log', 'package.json (new dependency)'],
  'All logs are structured JSON with log levels. Sensitive data never logged.',
  []
));

allContent.push(...taskCard(
  'MT-002','Health Check — Add Real Database Ping','Implementation',['P2-001','P5-005'],'Low',
  'The current /health endpoint returns { status: "ok" } regardless of DB connectivity. A real health check must verify the database is reachable.',
  [
    'In server.js, modify the GET /health handler',
    'Run: await pool.query("SELECT 1") inside a try/catch',
    'If DB query succeeds: return 200 { status: "ok", db: "connected", uptime: process.uptime() }',
    'If DB query fails: return 503 { status: "degraded", db: "disconnected", error: "DB unreachable" }',
    'Railway and monitoring tools check /health — 503 will trigger alerts',
  ],
  ['server.js (health endpoint)', 'db/pool.js'],
  '/health returns 503 when DB is unreachable. Monitoring can detect DB outages.',
  []
));

allContent.push(...taskCard(
  'MT-003','Add Response Compression Middleware','Implementation',['P5-005'],'Low',
  'Express responses are not compressed by default. Large JSON responses (lead lists) and the HTML/JS files benefit from gzip compression.',
  [
    'Install compression: npm install compression',
    'In server.js: const compression = require("compression"); app.use(compression());',
    'Add before static file serving and all routes',
    'Test: curl -H "Accept-Encoding: gzip" http://localhost:3000/ -- check Content-Encoding: gzip in headers',
    'Measure size difference on GET /api/leads with 100 leads — should be significantly smaller',
  ],
  ['server.js', 'package.json'],
  'All HTTP responses compressed with gzip. Bandwidth reduced, page load improved.',
  []
));

allContent.push(...taskCard(
  'MT-004','Add Database Connection Retry on Startup','Implementation',['P2-001'],'Medium',
  'If the database is briefly unavailable when the server starts (e.g., during Railway deployment), the server crashes immediately. Add startup retry logic.',
  [
    'In db/pool.js or server.js startup, wrap the initial pool.query("SELECT 1") in a retry loop',
    'Retry up to 5 times with 3-second delays',
    'Log each attempt: "[DB] Connection attempt {n}/5..."',
    'If all attempts fail: log "[DB] Failed to connect after 5 attempts" and process.exit(1)',
    'If connected: log "[DB] Connected successfully"',
    'Test: start server while PostgreSQL is stopped, watch retry attempts in logs, start PostgreSQL, verify server connects',
  ],
  ['db/pool.js', 'server.js (startup sequence)'],
  'Server retries DB connection up to 5 times on startup. Tolerates brief DB unavailability during deploys.',
  []
));

allContent.push(...taskCard(
  'MT-005','Add Lead Completion Flow — Worker Marks Job Done','Implementation',['P5-003','P5-004'],'Medium',
  'Currently, leads can only be marked "completed" by an admin via the admin panel. There is no way for a worker to mark a job as done. This is a business logic gap.',
  [
    'Add a "Complete" Telegram button alongside Accept/Reject when lead is in "accepted" status',
    'In telegramService.js: when sending the "accepted" confirmation message, include a [Mark Complete] button',
    'Add a new callback action: "complete" in addition to "accept" and "reject"',
    'In assignmentService.updateStatus(): handle "complete" action -> UPDATE lead status to "completed"',
    'In routes/telegram.js webhook handler: handle "complete" action',
    'In admin.html: also add a Complete button for accepted leads',
    'Test: accept a lead, receive follow-up message with Complete button, tap it, verify status=completed in DB',
  ],
  ['server/services/telegramService.js', 'server/services/assignmentService.js', 'server/routes/telegram.js'],
  'Workers can mark jobs complete via Telegram. Leads transition to "completed" status without admin intervention.',
  []
));

allContent.push(...taskCard(
  'MT-006','Add HTTPS Redirect Middleware','Implementation',['D-003','P5-005'],'Low',
  'If the server is ever accessed over HTTP in production, credentials (Bearer tokens) are sent in plaintext. Add HTTPS redirect in Express as a defence-in-depth measure.',
  [
    'In server.js, add middleware that runs only in production (NODE_ENV === "production")',
    'Check if req.secure or req.headers["x-forwarded-proto"] === "https"',
    'If HTTP: res.redirect(301, "https://" + req.headers.host + req.url)',
    'This is already handled by Railway/Nginx, but adding it in Express is defence-in-depth',
    'Test: in staging, try accessing HTTP URL and verify redirect to HTTPS',
  ],
  ['server.js', '.env (NODE_ENV)'],
  'HTTP requests redirected to HTTPS in production. Credentials never sent over plaintext.',
  []
));

allContent.push(...taskCard(
  'MT-007','Add Request ID for Request Tracing','Implementation',['MT-001'],'Low',
  'When debugging production issues, it is impossible to correlate a client request with server logs without a request ID. Add a UUID to every request.',
  [
    'Install: npm install uuid',
    'In server.js, add early middleware: req.requestId = uuidv4(); res.setHeader("X-Request-Id", req.requestId)',
    'In all service logs, include the requestId: logger.info({ requestId: req.requestId, action: "assignLead" })',
    'When returning error responses, include the requestId: { error: "...", requestId: req.requestId }',
    'Client can report the requestId when reporting a bug — allows exact log lookup',
  ],
  ['server.js', 'server/middlewares/', 'logger.js (MT-001)'],
  'Every request has a unique ID in logs and response headers. Production debugging is tractable.',
  []
));

allContent.push(...taskCard(
  'MT-008','Document and Test Phone Normalization Parity','Analysis',['P3-002'],'High',
  'The spam detection system depends entirely on phone normalization producing the same output in frontend (main.js) and backend (validateLead.js). A single edge case mismatch means duplicate leads bypass spam detection.',
  [
    'Extract phone normalization function from main.js',
    'Extract phone normalization function from validateLead.js (created in P3-002)',
    'Write 20+ test cases covering: international format, national format, with dashes, with spaces, with parentheses, different prefix styles',
    'Run both functions against all test cases and compare output',
    'If any output differs: fix the backend to match the frontend (frontend is the user-facing contract)',
    'Add these tests to the CI pipeline (D-004)',
    'Document the canonical phone format: +380XXXXXXXXX (13 characters, starts with +380)',
  ],
  ['main.js (normalization function)', 'server/middlewares/validateLead.js'],
  '20+ normalization test cases pass identically for both frontend and backend. Spam detection works for all phone input formats.',
  ['Any mismatch means a user can bypass spam protection by formatting their phone slightly differently']
));

// ════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY PAGE
// ════════════════════════════════════════════════════════════════════════════
allContent.push(
  new Paragraph({children:[new PageBreak()]}),
  h1('Execution Summary'),
  sp(80),
  new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[1000,2400,2200,1600,1826], rows:[
    new TableRow({children:[hc('Phase',1000),hc('Name',2400),hc('Tasks',2200),hc('Risk',1600),hc('Prereq',1826)],tableHeader:true}),
    new TableRow({children:[dc('1',1000),dc('Safety Audit',2400),dc('P1-001 to P1-005',2200),dc('Low',1600),dc('None',1826)]}),
    new TableRow({children:[dc('2',1000),dc('Database Foundation',2400),dc('P2-001 to P2-005',2200),dc('Med-High',1600),dc('Phase 1',1826)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('3',1000),dc('Middleware Layer',2400),dc('P3-001 to P3-004',2200),dc('Med-High',1600),dc('Phase 2',1826)]}),
    new TableRow({children:[dc('4',1000),dc('Services Layer',2400),dc('P4-001 to P4-004',2200),dc('High',1600),dc('Phase 3',1826)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('5',1000),dc('Routes & Wiring',2400),dc('P5-001 to P5-005',2200),dc('High',1600),dc('Phase 4',1826)]}),
    new TableRow({children:[dc('6',1000),dc('Telegram Hardening',2400),dc('T-001 to T-005',2200),dc('Medium',1600),dc('Phase 5',1826)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('7',1000),dc('Admin Panel',2400),dc('A-001 to A-006',2200),dc('Medium',1600),dc('Phase 5',1826)]}),
    new TableRow({children:[dc('8',1000),dc('DevOps & Security',2400),dc('D-001 to D-009',2200),dc('Critical',1600),dc('Phase 5',1826)],'_sh':'E9F1F7'}),
    new TableRow({children:[dc('9',1000),dc('SEO & Frontend',2400),dc('S-001 to S-007',2200),dc('Low-Med',1600),dc('Phase 8',1826)]}),
    new TableRow({children:[dc('MT',1000),dc('Missing Tasks',2400),dc('MT-001 to MT-008',2200),dc('Low-High',1600),dc('Various',1826)],'_sh':'E9F1F7'}),
    new TableRow({children:[
      new TableCell({borders,width:{size:1000,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'TOTAL',font:'Arial',size:20,bold:true,color:'FFFFFF'})]})]}),
      dc('All Phases',2400),dc('64 tasks',2200),dc('Low → Critical',1600),dc('Sequential',1826),
    ]}),
  ]}),
  sp(200),

  h2('Top 5 Dangerous Tasks (Must Review Before Executing)'),
  new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[1000,2200,5826], rows:[
    new TableRow({children:[hc('Task',1000),hc('Name',2200),hc('Why Dangerous',5826)],tableHeader:true}),
    new TableRow({children:[riskBadge('Critical'),dc('D-001',2200),dc('Production DB setup — running schema.sql on wrong DB wipes it. Triple-check the connection string.',5826)]}),
    new TableRow({children:[riskBadge('Critical'),dc('D-003',2200),dc('Production deploy — wrong env vars mean real users hit misconfigured system.',5826)]}),
    new TableRow({children:[riskBadge('High'),dc('P4-003',2200),dc('assignmentService — missing FOR UPDATE causes race conditions leading to duplicate lead assignments.',5826)],'_sh':'E9F1F7'}),
    new TableRow({children:[riskBadge('High'),dc('S-006',2200),dc('Pricing refactor — if main.js fallback fails, calculator shows wrong prices to users.',5826)]}),
    new TableRow({children:[riskBadge('High'),dc('MT-008',2200),dc('Phone normalization parity — mismatch allows spam bypass. Must be verified with 20+ test cases.',5826)],'_sh':'E9F1F7'}),
  ]}),
);

// ════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:36,bold:true,font:'Arial',color:'1F4E79'}, paragraph:{spacing:{before:300,after:180},outlineLevel:0} },
      { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:28,bold:true,font:'Arial',color:'2E75B6'}, paragraph:{spacing:{before:240,after:120},outlineLevel:1} },
      { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:24,bold:true,font:'Arial',color:'404040'}, paragraph:{spacing:{before:180,after:80},outlineLevel:2} },
    ]
  },
  numbering: { config: [
    { reference:'numbers', levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}] },
    { reference:'bullets', levels:[{level:0,format:LevelFormat.BULLET,text:'-',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}] },
  ]},
  sections: [{
    properties: { page: { size:{width:11906,height:16838}, margin:{top:1080,right:1080,bottom:1080,left:1080} } },
    headers: { default: new Header({ children:[new Paragraph({
      children:[new TextRun({text:'Agro Servis — Safe Execution Plan v1.0  |  2026-05-03  |  64 Tasks across 9 Phases',font:'Arial',size:18,color:'666666',italics:true})],
      border:{ bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'} }
    })] }) },
    footers: { default: new Footer({ children:[new Paragraph({
      alignment:AlignmentType.CENTER,
      children:[
        new TextRun({text:'Safe Execution Plan  |  Page ',font:'Arial',size:18,color:'888888'}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'}),
        new TextRun({text:' of ',font:'Arial',size:18,color:'888888'}),
        new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:18,color:'888888'}),
      ]
    })] }) },
    children: allContent
  }]
});

Packer.toBuffer(doc).then(buf => {
  const outPath = 'C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/09_Safe_Execution_Plan.docx';
  fs.writeFileSync(outPath, buf);
  console.log('OK: 09_Safe_Execution_Plan.docx created — size: ' + buf.length + ' bytes');
});
