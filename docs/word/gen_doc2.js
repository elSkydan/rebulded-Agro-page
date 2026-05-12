// 02_TelegramBot_Guide.docx
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');

const CW = 9026;
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

function hdrCell(text, w) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: { fill: '1F4E79', type: ShadingType.CLEAR }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })] });
}
function dc(text, w, shade) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })] });
}
function hdrRow(cols, ws) { return new TableRow({ children: cols.map((c,i)=>hdrCell(c,ws[i])), tableHeader: true }); }
function dr(cols, ws, sh) { return new TableRow({ children: cols.map((c,i)=>dc(c,ws[i],sh)) }); }
function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: 'Arial', size: 36, bold: true, color: '1F4E79' })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: 'Arial', size: 28, bold: true, color: '2E75B6' })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: 'Arial', size: 24, bold: true, color: '404040' })] }); }
function p(t) { return new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', size: 22 })], spacing: { after: 120 } }); }
function code(t) { return new Paragraph({ children: [new TextRun({ text: t, font: 'Courier New', size: 18, color: '1F4E79' })], spacing: { after: 60 }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, indent: { left: 360 } }); }
function warn(t) { return new Paragraph({ children: [new TextRun({ text: '⚠ ' + t, font: 'Arial', size: 22, bold: true, color: 'C00000' })], spacing: { after: 120, before: 120 }, border: { left: { style: BorderStyle.SINGLE, size: 8, color: 'C00000' } }, indent: { left: 360 } }); }
function nb(t, ref) { return new Paragraph({ numbering: { reference: ref || 'numbers', level: 0 }, children: [new TextRun({ text: t, font: 'Arial', size: 22 })], spacing: { after: 80 } }); }

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: '1F4E79' }, paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: '2E75B6' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: 'Arial', color: '404040' }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } }] },
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '-', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } }] },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'Agro Servis — Telegram Bot Guide', font: 'Arial', size: 18, color: '666666', italics: true })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E75B6' } } })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Telegram Bot Guide  |  Page ', font: 'Arial', size: 18, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' })] })] }) },
    children: [
      new Paragraph({ spacing: { before: 1440, after: 240 }, children: [new TextRun({ text: 'Telegram Bot', font: 'Arial', size: 64, bold: true, color: '1F4E79' })], alignment: AlignmentType.CENTER }),
      new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: 'Deep Analysis & Real Account Testing Guide', font: 'Arial', size: 32, color: '2E75B6' })], alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new PageBreak()] }),

      h1('1. Bot Architecture'),
      h2('1.1 Integration Pattern'),
      p('Webhook-based (not polling). Telegram pushes updates to POST /api/telegram/webhook. The bot runs inside the main Express process — no separate bot process. Raw Telegram Bot API calls via HTTP (no grammy/telegraf library mentioned).'),

      h2('1.2 Message Flow Overview'),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [2400, 6626],
        rows: [
          hdrRow(['Flow', 'Description'], [2400, 6626]),
          dr(['New Lead Notification', 'Backend assigns worker -> telegramService.sendLeadNotification() -> Telegram sendMessage + InlineKeyboard'], [2400, 6626]),
          dr(['Worker Accepts', 'Worker taps Accept -> Telegram sends callback_query -> POST /api/telegram/webhook -> status=accepted'], [2400, 6626], 'E9F1F7'),
          dr(['Worker Rejects', 'Worker taps Reject -> callback_query -> reassignment to next worker or status=unassigned'], [2400, 6626]),
          dr(['Timeout Reassign', 'Cron fires -> stale lead -> reassign -> new Telegram notification to next worker'], [2400, 6626], 'E9F1F7'),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h1('2. Lead Notification Format'),
      h2('2.1 Message Content (Ukrainian)'),
      p('When a lead is assigned, the worker receives a Telegram message containing:'),
      code('New order notification'),
      code('Service: Vspashka horodu'),
      code('Area: 5.5 sotky'),
      code('City: Kyiv'),
      code('Out-of-city visit: No'),
      code('Price: 1650 hrn'),
      code('Client phone: +380679020326'),
      code('Please call to confirm!'),
      new Paragraph({ spacing: { after: 120 } }),
      p('The message includes an inline keyboard with two buttons: Accept (green checkmark) and Reject (red cross).'),

      h2('2.2 Callback Data Format'),
      p('Telegram inline buttons carry callback_data. The system uses compact JSON to stay within the 64-byte Telegram limit:'),
      code('Accept button:  {"l":42,"w":7,"a":"accept"}'),
      code('Reject button:  {"l":42,"w":7,"a":"reject"}'),
      new Paragraph({ spacing: { after: 100 } }),
      p('Key meanings: l = lead_id, w = worker_id, a = action. Current payload size is approximately 30-35 bytes — safely within the 64-byte limit.'),

      h2('2.3 Security Validation'),
      p('Before processing any callback, the system verifies: callback_query.from.id (Telegram user ID) MUST EQUAL workers.telegram_chat_id stored in the database. This prevents replay attacks and forged button presses from malicious users.'),

      h1('3. Identified Weak Points'),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [3200, 1800, 4026],
        rows: [
          hdrRow(['Issue', 'Severity', 'Resolution (Without Rewriting)'], [3200, 1800, 4026]),
          dr(['Stale buttons on old messages after reassignment', 'MEDIUM', 'Call editMessageReplyMarkup to remove buttons from previous worker message'], [3200, 1800, 4026]),
          dr(['No retry logic if Telegram API is down', 'HIGH', 'Wrap in try/catch; revert lead status or schedule retry via queue'], [3200, 1800, 4026], 'E9F1F7'),
          dr(['Bot token is placeholder in .env', 'CRITICAL', 'Must replace with real BotFather token before any testing'], [3200, 1800, 4026]),
          dr(['No webhook signature verification', 'HIGH', 'Add X-Telegram-Bot-Api-Secret-Token header check'], [3200, 1800, 4026], 'E9F1F7'),
          dr(['No worker /start onboarding flow', 'CRITICAL', 'Must implement to register telegram_chat_id in DB'], [3200, 1800, 4026]),
          dr(['Admin ADMIN_CHAT_ID is placeholder', 'HIGH', 'Replace with real Telegram user ID'], [3200, 1800, 4026], 'E9F1F7'),
        ]
      }),
      new Paragraph({ spacing: { after: 160 } }),

      h1('4. Scaling Limitations'),
      p('Single bot token handles all cities and workers. The global Telegram rate limit is 30 messages per second — sufficient for MVP but may become a constraint above 1800 leads/hour. The webhook endpoint processes updates synchronously in the main Express process; heavy load could affect other API routes. Solution path: BullMQ queue for Telegram sends running in a separate worker process.'),

      h1('5. How to Test on a Real Telegram Account'),
      h2('Step 1: Create a Test Bot in BotFather'),
      nb('Open Telegram and search for @BotFather'),
      nb('Send the command: /newbot'),
      nb('Enter a display name, e.g.: AgroServiceBot'),
      nb('Enter a username ending in "bot", e.g.: agro_service_test_bot'),
      nb('Copy the token that BotFather provides — format: 1234567890:ABCdef...'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 2: Find Your Telegram User ID'),
      p('Message @userinfobot in Telegram. It will reply with your numeric user ID (e.g., 123456789). You will need this for ADMIN_CHAT_ID and for adding yourself as a test worker.'),

      h2('Step 3: Configure .env'),
      code('TELEGRAM_BOT_TOKEN=1234567890:ABCdef...'),
      code('ADMIN_CHAT_ID=123456789'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 4: Set Up ngrok for Local Testing'),
      p('The Telegram webhook requires a public HTTPS URL. Use ngrok to expose your local server:'),
      code('# Download from https://ngrok.com/download'),
      code('ngrok http 3000'),
      code('# Copy the HTTPS URL: https://abc123.ngrok.io'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 5: Register the Webhook with Telegram'),
      code('curl -X POST "https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook" \\'),
      code('  -d "url=https://YOUR_NGROK_URL/api/telegram/webhook"'),
      new Paragraph({ spacing: { after: 80 } }),
      code('# Verify the webhook is registered:'),
      code('curl "https://api.telegram.org/bot{YOUR_TOKEN}/getWebhookInfo"'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 6: Add a Test Worker to the Database'),
      code('INSERT INTO workers (name, phone, telegram_chat_id, city_id, priority, is_active)'),
      code('VALUES ("Test Worker", "+380671234567", YOUR_TELEGRAM_ID, 1, 10, true);'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 7: Submit a Test Lead'),
      nb('Open the landing page in your browser'),
      nb('Fill in the form: any name, phone number, select the city matching the worker\'s city_id, choose a service'),
      nb('Click Submit'),
      nb('Your Telegram app should receive the notification within seconds'),
      nb('The message should show lead details with Accept and Reject buttons'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 8: Test Accept Flow'),
      nb('Tap the Accept (checkmark) button'),
      nb('Telegram should show a small popup confirmation'),
      nb('Check the database: SELECT status FROM leads WHERE id=X — should be "accepted"'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 9: Test Reject and Reassignment'),
      nb('Add a second worker for the same city in the database'),
      nb('Submit a new lead'),
      nb('First worker taps Reject'),
      nb('The second worker should receive the notification'),
      nb('Database: lead_assignments should show two rows — one rejected, one sent'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 10: Test Timeout'),
      nb('Set TIMEOUT_MINUTES=1 in .env and restart the server'),
      nb('Submit a lead'),
      nb('Do NOT tap any button'),
      nb('Wait 60-120 seconds for the cron to fire'),
      nb('Check database: lead should be reassigned or show status "unassigned" if no second worker exists'),
      new Paragraph({ spacing: { after: 120 } }),

      h2('Step 11: Test Edge Cases'),
      nb('Submit the same phone number within 10 minutes — system should update existing lead, not create a new one'),
      nb('Disable all workers (is_active=false) and submit a lead — status should become "unassigned"'),
      nb('Tap the Accept button on a lead that was already reassigned — should receive an error response in Telegram'),
      new Paragraph({ spacing: { after: 160 } }),

      h2('Verification Checklist'),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [1200, 7826],
        rows: [
          hdrRow(['Done', 'Check'], [1200, 7826]),
          dr(['[ ]', 'Bot created in BotFather and token saved'], [1200, 7826]),
          dr(['[ ]', 'Token set in .env (real value, not placeholder)'], [1200, 7826], 'E9F1F7'),
          dr(['[ ]', 'ngrok or public URL running and webhook registered'], [1200, 7826]),
          dr(['[ ]', 'Webhook info shows correct URL and no errors'], [1200, 7826], 'E9F1F7'),
          dr(['[ ]', 'Worker added to DB with real telegram_chat_id'], [1200, 7826]),
          dr(['[ ]', 'Lead submitted successfully (HTTP 201 returned)'], [1200, 7826], 'E9F1F7'),
          dr(['[ ]', 'Telegram notification received with correct lead info'], [1200, 7826]),
          dr(['[ ]', 'Accept button works and DB shows status="accepted"'], [1200, 7826], 'E9F1F7'),
          dr(['[ ]', 'Reject button works and DB shows second assignment'], [1200, 7826]),
          dr(['[ ]', 'Timeout cron fires and reassigns or unassigns stale lead'], [1200, 7826], 'E9F1F7'),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/02_TelegramBot_Guide.docx', buf);
  console.log('OK: 02_TelegramBot_Guide.docx created');
});
