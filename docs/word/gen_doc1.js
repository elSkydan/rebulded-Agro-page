const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');

const CONTENT_WIDTH = 9026; // A4 with 1" margins
const col3_a = 2800, col3_b = 2000, col3_c = 4226; // 3-col table
const col4_a = 2000, col4_b = 2200, col4_c = 2000, col4_d = 2826; // 4-col table
const col2_a = 4000, col2_b = 5026; // 2-col table

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const hdrShading = { fill: '1F4E79', type: ShadingType.CLEAR };
const altShading = { fill: 'E9F1F7', type: ShadingType.CLEAR };
const warnShading = { fill: 'FFF2CC', type: ShadingType.CLEAR };

function hdrCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, shading: hdrShading,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })]
  });
}
function dataCell(text, width, shade) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })]
  });
}
function hdrRow(cols, widths) {
  return new TableRow({ children: cols.map((c, i) => hdrCell(c, widths[i])), tableHeader: true });
}
function dataRow(cols, widths, shade) {
  return new TableRow({ children: cols.map((c, i) => dataCell(c, widths[i], shade)) });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: '1F4E79' })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: '2E75B6' })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: '404040' })] });
}
function p(text) {
  return new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 22 })], spacing: { after: 120 } });
}
function warn(text) {
  return new Paragraph({
    children: [new TextRun({ text: '⚠ WARNING: ' + text, font: 'Arial', size: 22, bold: true, color: 'C00000' })],
    spacing: { after: 120, before: 120 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'C00000' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C00000' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'C00000' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'C00000' } },
    shading: { fill: 'FFF2CC', type: ShadingType.CLEAR }
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '1F4E79' },
        paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '2E75B6' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '404040' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } }] },
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        children: [new TextRun({ text: 'Agro Servis — Confidential Technical Documentation', font: 'Arial', size: 18, color: '666666', italics: true })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E75B6' } }
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        children: [
          new TextRun({ text: 'Agro Servis System Analysis  |  Page ', font: 'Arial', size: 18, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
          new TextRun({ text: ' of ', font: 'Arial', size: 18, color: '888888' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: '888888' }),
        ],
        alignment: AlignmentType.CENTER
      })] })
    },
    children: [
      // TITLE PAGE
      new Paragraph({ spacing: { before: 1440, after: 240 }, children: [new TextRun({ text: 'Agro Servis', font: 'Arial', size: 64, bold: true, color: '1F4E79' })], alignment: AlignmentType.CENTER }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'System Architecture & Services Analysis', font: 'Arial', size: 36, color: '2E75B6' })], alignment: AlignmentType.CENTER }),
      new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: 'Full Technical Analysis  |  Date: 2026-05-03  |  Status: Frontend COMPLETE, Backend PLANNED', font: 'Arial', size: 22, color: '888888', italics: true })], alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 1
      h1('1. System Architecture'),
      h2('1.1 System Type'),
      p('Modular Monolith. Single Node.js/Express process serves both static frontend and API. Services are logically separated (assignmentService, pricingService, telegramService, timeoutService) but run in the same process. No microservices, no separate frontend server — static files served directly from Express root.'),

      h2('1.2 Product Role'),
      p('Lead Aggregator / Marketplace (B2C to B2B). Clients submit agricultural service requests via the landing page form. Workers receive leads via Telegram bot and accept or reject them. Admin manages workers, cities, and lead statuses via a protected API with Bearer token authentication.'),
      p('Domain: Ukrainian agricultural machinery services — Vspashka (plowing), Tsilyna (virgin land), Pokos (mowing), Sverdlinnya (hole drilling), Myika (equipment washing).'),

      h2('1.3 Implementation Status'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [col3_a, col3_b, col3_c],
        rows: [
          hdrRow(['Module', 'Status', 'Notes'], [col3_a, col3_b, col3_c]),
          dataRow(['Frontend (index.html + main.js)', 'COMPLETE', 'Full landing page, calculator, lead form'], [col3_a, col3_b, col3_c]),
          dataRow(['Express server (server.js)', 'COMPLETE (broken imports)', 'Route imports fail — backend not built'], [col3_a, col3_b, col3_c], altShading.fill),
          dataRow(['Routes (leads, workers, cities, telegram)', 'NOT BUILT', 'Files do not exist'], [col3_a, col3_b, col3_c]),
          dataRow(['Services (assignment, pricing, timeout, telegram)', 'NOT BUILT', 'Files do not exist'], [col3_a, col3_b, col3_c], altShading.fill),
          dataRow(['DB layer (db/pool.js)', 'NOT BUILT', 'PostgreSQL pool not created'], [col3_a, col3_b, col3_c]),
          dataRow(['Middlewares (auth, validateLead, rateLimiter)', 'NOT BUILT', 'Files do not exist'], [col3_a, col3_b, col3_c], altShading.fill),
          dataRow(['Database schema (schema.sql)', 'NOT BUILT', 'No migration files exist'], [col3_a, col3_b, col3_c]),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h2('1.4 Lead Submission Request Lifecycle'),
      ...[
        'Browser submits form — POST /api/leads',
        'rateLimiter middleware checks IP (max 5 req/min)',
        'validateLead middleware validates phone, city_id, service_type',
        'Route handler calls pricingService.calculatePrice(service, area, outOfCity)',
        'DB: Phone normalization and spam check (10-minute duplicate window)',
        'DB: INSERT lead with status="new"',
        'assignmentService.assignLead(lead_id) is called',
        'DB: SELECT worker (priority DESC, last_assigned ASC, FOR UPDATE lock)',
        'DB: INSERT lead_assignment, UPDATE lead status="assigned"',
        'telegramService.sendLeadNotification(worker, lead)',
        'Telegram Bot API: sendMessage with inline Accept/Reject buttons',
        'Return HTTP 201 with lead_id and estimated_price',
      ].map(t => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: t, font: 'Arial', size: 22 })], spacing: { after: 80 } })),
      new Paragraph({ spacing: { after: 160 } }),

      h2('1.5 Integration Points'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [col4_a, col4_b, col4_c, col4_d],
        rows: [
          hdrRow(['System', 'Protocol', 'Direction', 'Status'], [col4_a, col4_b, col4_c, col4_d]),
          dataRow(['PostgreSQL', 'TCP via pg driver', 'Backend <-> DB', 'Not yet created'], [col4_a, col4_b, col4_c, col4_d]),
          dataRow(['Telegram Bot API', 'HTTPS webhook', 'Bidirectional', 'Token is placeholder'], [col4_a, col4_b, col4_c, col4_d], altShading.fill),
          dataRow(['Browser frontend', 'HTTP/HTTPS', 'Client to Backend', 'Working (static files served)'], [col4_a, col4_b, col4_c, col4_d]),
          dataRow(['Admin API', 'HTTP Bearer Token', 'Admin to Backend', 'Not implemented'], [col4_a, col4_b, col4_c, col4_d], altShading.fill),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h2('1.6 Environment Configuration'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2800, 3000, 3226],
        rows: [
          hdrRow(['Variable', 'Purpose', 'Default / Note'], [2800, 3000, 3226]),
          dataRow(['DATABASE_URL', 'PostgreSQL connection string', 'postgres://localhost:5432/lead_distribution'], [2800, 3000, 3226]),
          dataRow(['TELEGRAM_BOT_TOKEN', 'Telegram Bot API key', 'PLACEHOLDER — must replace before production'], [2800, 3000, 3226], altShading.fill),
          dataRow(['ADMIN_CHAT_ID', 'Admin Telegram user ID', 'PLACEHOLDER'], [2800, 3000, 3226]),
          dataRow(['ADMIN_TOKEN', 'Bearer auth for admin endpoints', 'PLACEHOLDER — use 32+ random chars'], [2800, 3000, 3226], altShading.fill),
          dataRow(['PORT', 'HTTP server port', '3000'], [2800, 3000, 3226]),
          dataRow(['TIMEOUT_MINUTES', 'Assignment timeout before reassign', '3 minutes'], [2800, 3000, 3226], altShading.fill),
          dataRow(['ACCEPTED_TTL_MINUTES', 'Time before accepted lead expires', '30 minutes'], [2800, 3000, 3226]),
          dataRow(['SPAM_WINDOW_MINUTES', 'Duplicate phone detection window', '10 minutes'], [2800, 3000, 3226], altShading.fill),
          dataRow(['ACTIVE_LEAD_LIMIT', 'Max concurrent active leads per worker', '3'], [2800, 3000, 3226]),
          dataRow(['RATE_LIMIT_MAX', 'Max requests per window', '5'], [2800, 3000, 3226], altShading.fill),
          dataRow(['RATE_LIMIT_WINDOW_MS', 'Rate limit window duration', '60000 ms (1 minute)'], [2800, 3000, 3226]),
        ]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 2
      h1('2. Internal Services Analysis'),

      h2('2.1 assignmentService'),
      p('Role: Core orchestrator for lead-to-worker assignment. Handles the full assignment state machine including initial assignment, rejection-triggered reassignment, and timeout reassignment.'),

      h3('assignLead(lead_id) — Logic'),
      ...[
        'BEGIN TRANSACTION',
        'SELECT lead WHERE id=lead_id FOR UPDATE — prevents concurrent assignment',
        'SELECT worker WHERE city matches AND is_active=true AND NOT IN already-tried workers, ORDER BY priority DESC, last_assigned_at ASC, LIMIT 1',
        'If no worker found: UPDATE lead SET status="unassigned", COMMIT, return',
        'If worker found: INSERT lead_assignment, UPDATE lead status="assigned", UPDATE worker last_assigned_at=NOW()',
        'Call telegramService.sendLeadNotification(worker, lead)',
        'COMMIT',
      ].map(t => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: t, font: 'Arial', size: 22 })], spacing: { after: 80 } })),
      new Paragraph({ spacing: { after: 100 } }),

      h3('Risks and Edge Cases'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [col2_a, col2_b],
        rows: [
          hdrRow(['Scenario', 'System Handling'], [col2_a, col2_b]),
          dataRow(['No available workers in city', 'Lead set to "unassigned", no Telegram notification sent'], [col2_a, col2_b]),
          dataRow(['Worker deactivated during assignment', 'Skipped in reassignment query (is_active filter)'], [col2_a, col2_b], altShading.fill),
          dataRow(['Concurrent duplicate callback', 'FOR UPDATE lock prevents double-processing'], [col2_a, col2_b]),
          dataRow(['Worker at ACTIVE_LEAD_LIMIT (default 3)', 'Worker filtered out in assignment SELECT query'], [col2_a, col2_b], altShading.fill),
          dataRow(['Lead already accepted when reject arrives', 'Status transition validation blocks the reject'], [col2_a, col2_b]),
          dataRow(['DB transaction failure', 'Rollback — lead stays in previous state, no notification sent'], [col2_a, col2_b], altShading.fill),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h2('2.2 pricingService'),
      p('Role: Pure calculation function — no side effects, no DB access. Calculates total price from service type, area (in sotky), and city delivery flag. Pricing constants are defined here AND duplicated in main.js frontend. Both must be updated together.'),

      h3('Pricing Constants'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [3200, 2600, 3226],
        rows: [
          hdrRow(['Service Key', 'Rate', 'Minimum Price'], [3200, 2600, 3226]),
          dataRow(['ogorod — Vspashka horodu (plowing)', '300 hrn per sotka', '1000 hrn (global min)'], [3200, 2600, 3226]),
          dataRow(['celina — Tsilyna (virgin land)', '600 hrn per sotka', '1800 hrn'], [3200, 2600, 3226], altShading.fill),
          dataRow(['mowing — Pokos (mowing)', '200 hrn per sotka', '200 hrn'], [3200, 2600, 3226]),
          dataRow(['tree — Sverdlinnya lunok (drilling)', '500 hrn flat rate', '—'], [3200, 2600, 3226], altShading.fill),
          dataRow(['washing — Myika tekhniky (washing)', '250 hrn flat rate', '—'], [3200, 2600, 3226]),
        ]
      }),
      new Paragraph({ spacing: { after: 120 } }),
      p('Additional charges: Out-of-city surcharge +800 hrn. Global minimum order 1000 hrn applied after all calculations.'),
      warn('Pricing constants exist in TWO places — main.js (frontend calculator) and pricingService.js (backend). Any price change must be made in BOTH files simultaneously. If they diverge, users will see one price on screen but a different price is recorded in the system.'),

      h2('2.3 telegramService'),
      p('Role: All Telegram Bot API interactions — composing and sending lead notifications to workers, processing inline button callbacks, and sending admin alerts.'),
      p('Callback data uses compact JSON to stay within Telegram\'s 64-byte limit: {"l": lead_id, "w": worker_id, "a": "accept"} — single-letter keys (l=lead, w=worker, a=action).'),

      h3('Security Validation'),
      p('Before processing any callback, the system verifies that callback_query.from.id (Telegram user ID) matches workers.telegram_chat_id in the database. This prevents replay attacks and forged callbacks.'),

      h3('Known Risks'),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [col2_a, col2_b],
        rows: [
          hdrRow(['Risk', 'Handling Required'], [col2_a, col2_b]),
          dataRow(['Worker has blocked the bot', 'Telegram returns HTTP 403 — must catch, log, and flag worker'], [col2_a, col2_b]),
          dataRow(['Telegram API timeout or outage', 'Retry logic needed (not yet specified in design)'], [col2_a, col2_b], altShading.fill),
          dataRow(['Worker has no telegram_chat_id in DB', 'Skip notification, log warning — lead remains assigned'], [col2_a, col2_b]),
          dataRow(['Callback data exceeds 64 bytes', 'Prevented by short key format (current size ~30-35 bytes)'], [col2_a, col2_b], altShading.fill),
          dataRow(['Stale buttons after reassignment', 'Old worker still sees Accept/Reject — must call editMessageReplyMarkup'], [col2_a, col2_b]),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h2('2.4 timeoutService'),
      p('Role: Background cron job running every 60 seconds via node-cron. Responsible for two timeout checks.'),

      h3('Check 1 — Assignment Timeout (TIMEOUT_MINUTES = 3)'),
      p('Finds all leads where status="assigned" AND updated_at is older than TIMEOUT_MINUTES. Uses FOR UPDATE SKIP LOCKED to avoid blocking concurrent assignment operations. For each stale lead, calls assignmentService.reassignLead() to find the next available worker or set status to "unassigned".'),

      h3('Check 2 — Accepted Lead Expiry (ACCEPTED_TTL_MINUTES = 30)'),
      p('Finds all leads where status="accepted" AND updated_at is older than ACCEPTED_TTL_MINUTES. Updates status to "failed_contact". This handles the case where a worker accepted a lead but never made contact with the client.'),

      warn('If TIMEOUT_MINUTES is set to 0 in .env, ALL currently assigned leads will immediately expire on the next cron run. The application MUST validate this variable is a positive integer on startup.'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/01_Architecture_and_Services.docx', buf);
  console.log('OK: 01_Architecture_and_Services.docx created');
});
