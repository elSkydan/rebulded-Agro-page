// 08_Implementation_Backlog.docx
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, PageOrientation
} = require('docx');
const fs = require('fs');

// Landscape A4: width=16838, height=11906
// Content width = 16838 - 2880 = 13958
const CW = 13958;
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top:border,bottom:border,left:border,right:border };
const cm = { top:60,bottom:60,left:100,right:100 };

function hc(t,w){
  return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,
    children:[new Paragraph({children:[new TextRun({text:t,bold:true,color:'FFFFFF',font:'Arial',size:18})]})]});
}
function dc(t,w,fill){
  return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:fill?{fill,type:ShadingType.CLEAR}:undefined,margins:cm,
    children:[new Paragraph({children:[new TextRun({text:t,font:'Arial',size:18})]})]});
}
function prioCell(prio, w, rowShade) {
  const col = prio==='CRITICAL'?'C00000':prio==='HIGH'?'C55A11':prio==='MEDIUM'?'7030A0':'1D6F42';
  return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:rowShade?{fill:rowShade,type:ShadingType.CLEAR}:undefined,margins:cm,
    children:[new Paragraph({children:[new TextRun({text:prio,font:'Arial',size:18,bold:true,color:col})]})]});
}
function catCell(cat, w, rowShade) {
  const catColors = { Backend:'1F4E79', Frontend:'7030A0', DevOps:'1D6F42', Telegram:'C55A11', Admin:'404040', SEO:'843C0C' };
  return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:rowShade?{fill:rowShade,type:ShadingType.CLEAR}:undefined,margins:cm,
    children:[new Paragraph({children:[new TextRun({text:cat,font:'Arial',size:18,color:catColors[cat]||'000000'})]})]});
}

function row(id, name, desc, cat, prio, cx, dep, time, shade) {
  const s = shade;
  return new TableRow({children:[
    dc(id,    600, s),
    dc(name,  1800, s),
    dc(desc,  3200, s),
    catCell(cat, 900, s),
    prioCell(prio, 900, s),
    dc(String(cx),  600, s),
    dc(dep,   2000, s),
    dc(time,  1200, s),
    dc('Todo', 758, s),
  ]});
}

const tasks = [
  // Backend Foundation
  ['B-001','Create db/pool.js','PostgreSQL connection pool singleton using pg and DATABASE_URL','Backend','CRITICAL',1,'—','0.5h'],
  ['B-002','Create db/schema.sql','All 4 tables: cities, workers, leads, lead_assignments with constraints and indexes','Backend','CRITICAL',2,'B-001','2h'],
  ['B-003','Create db/seed.sql','Test data: 2 cities, 3 workers, 5 sample leads','Backend','HIGH',1,'B-002','1h'],
  ['B-004','Create server/middlewares/auth.js','Bearer token validation for admin routes','Backend','CRITICAL',1,'—','1h'],
  ['B-005','Create server/middlewares/validateLead.js','Phone normalization + field validation for lead submission','Backend','CRITICAL',2,'—','2h'],
  ['B-006','Create server/middlewares/rateLimiter.js','express-rate-limit config: 5 req/min/IP','Backend','HIGH',1,'—','0.5h'],
  ['B-007','Create server/services/pricingService.js','Price calculation logic matching main.js constants','Backend','CRITICAL',2,'—','1h'],
  ['B-008','Create server/services/assignmentService.js','Worker selection with FOR UPDATE, reassignment, ACTIVE_LEAD_LIMIT','Backend','CRITICAL',5,'B-001,B-002','4h'],
  ['B-009','Create server/services/telegramService.js','sendLeadNotification, answerCallbackQuery, sendAdminAlert','Backend','CRITICAL',4,'—','3h'],
  ['B-010','Create server/services/timeoutService.js','Cron job: assignment timeout + accepted lead expiry','Backend','CRITICAL',3,'B-001,B-008','2h'],
  ['B-011','Create server/routes/leads.js','POST /api/leads, GET /api/leads, GET /api/leads/:id, PATCH status','Backend','CRITICAL',3,'B-004,B-005,B-007,B-008','3h'],
  ['B-012','Create server/routes/workers.js','GET/POST/PATCH /api/workers — CRUD with auth','Backend','CRITICAL',2,'B-004','2h'],
  ['B-013','Create server/routes/cities.js','GET/POST /api/cities + GET /api/cities/public','Backend','HIGH',2,'B-004','1.5h'],
  ['B-014','Create server/routes/telegram.js','POST /api/telegram/webhook — parse callbacks, call assignmentService','Backend','CRITICAL',3,'B-008,B-009','2h'],
  ['B-015','Add updated_at DB trigger','BEFORE UPDATE trigger on leads to auto-set updated_at','Backend','HIGH',2,'B-002','0.5h'],
  ['B-016','Add .env.example file','Document all env vars with descriptions and example values','Backend','HIGH',1,'—','0.5h'],
  ['B-017','Add input validation library (joi or zod)','Replace manual validation with schema-based validation','Backend','MEDIUM',2,'B-005','2h'],
  ['B-018','Add winston/pino logging','Replace console.log with structured logging','Backend','MEDIUM',2,'—','2h'],
  // Telegram
  ['T-001','Implement worker /start command','Register telegram_chat_id in DB when worker sends /start','Telegram','CRITICAL',3,'B-009,B-012','2h'],
  ['T-002','Add webhook signature verification','Validate X-Telegram-Bot-Api-Secret-Token header','Telegram','HIGH',2,'B-014','1h'],
  ['T-003','Edit message after Accept/Reject','Call editMessageReplyMarkup to remove stale buttons','Telegram','MEDIUM',2,'B-009','1h'],
  ['T-004','Admin Telegram alerts','Send Telegram message to ADMIN_CHAT_ID on unassigned lead or error','Telegram','MEDIUM',2,'B-009','1h'],
  ['T-005','Retry logic for failed Telegram sends','Exponential backoff if Telegram API times out','Telegram','HIGH',3,'B-009','2h'],
  ['T-006','Worker /status command','Show worker their current active leads','Telegram','LOW',2,'B-009','1.5h'],
  ['T-007','BullMQ queue for Telegram sends','Async notification queue to prevent blocking API responses','Telegram','MEDIUM',4,'B-009','3h'],
  // Admin Panel
  ['A-001','Build admin.html — Lead table','Filterable leads table with status, city, date filters','Admin','HIGH',3,'B-011','4h'],
  ['A-002','Build admin.html — Worker management','Add/edit/deactivate workers via form','Admin','HIGH',3,'B-012','3h'],
  ['A-003','Build admin.html — City management','Add/edit cities','Admin','MEDIUM',2,'B-013','2h'],
  ['A-004','Build admin.html — Dashboard','Lead counts by status, unassigned alert widget','Admin','HIGH',3,'B-011','3h'],
  ['A-005','Admin Bearer token login form','Simple login page storing token in sessionStorage','Admin','HIGH',2,'B-004','2h'],
  ['A-006','Add OPERATOR_TOKEN role','Read-only role for operators distinct from admin','Admin','MEDIUM',2,'B-004','1h'],
  ['A-007','CSV export for leads','Date-range CSV download for admin panel','Admin','LOW',2,'B-011','2h'],
  // DevOps
  ['D-001','Set up GitHub Actions CI pipeline','Run tests on all PRs and pushes to main','DevOps','HIGH',3,'—','2h'],
  ['D-002','Configure Railway production deploy','Auto-deploy on release tags with environment approval','DevOps','HIGH',2,'D-001','2h'],
  ['D-003','Configure staging environment','Auto-deploy main branch to staging on Railway','DevOps','MEDIUM',2,'D-001','1h'],
  ['D-004','Set up PostgreSQL on Supabase','Create production DB, apply schema, migrate data','DevOps','CRITICAL',2,'B-002','1h'],
  ['D-005','Register Telegram webhook in production','Set webhook URL after production deploy','DevOps','CRITICAL',1,'D-002','0.5h'],
  ['D-006','Add PM2 process management','Install and configure PM2 on VPS deployment','DevOps','MEDIUM',1,'—','1h'],
  ['D-007','Set up Nginx reverse proxy + SSL','Nginx config with Let\'s Encrypt HTTPS','DevOps','HIGH',2,'D-006','2h'],
  ['D-008','Configure daily database backups','pg_dump cron job or Supabase scheduled backup','DevOps','HIGH',2,'D-004','1h'],
  ['D-009','Add Redis for rate limiter','Shared rate limit state across multiple Express processes','DevOps','MEDIUM',3,'B-006','2h'],
  // SEO
  ['S-001','Add meta title and description to index.html','Keyword-optimized Ukrainian title and description tags','SEO','CRITICAL',1,'—','0.5h'],
  ['S-002','Add Schema.org LocalBusiness markup','JSON-LD structured data for Google rich results','SEO','HIGH',1,'—','1h'],
  ['S-003','Self-host hero image','Download Unsplash image, host locally, add preload link','SEO','HIGH',1,'—','0.5h'],
  ['S-004','Add canonical URL tag','Prevent duplicate content issues','SEO','HIGH',1,'—','0.25h'],
  ['S-005','Create /sitemap.xml endpoint','Dynamic sitemap generated from cities DB table','SEO','HIGH',2,'B-013','2h'],
  ['S-006','Add robots.txt','Disallow /api/ and /admin from search crawlers','SEO','HIGH',1,'—','0.25h'],
  ['S-007','Register Google Search Console','Submit domain and sitemap, monitor indexing','SEO','HIGH',1,'S-005','0.5h'],
  ['S-008','Create Google Business Profile','Business listing for each city served','SEO','HIGH',1,'—','1h'],
  ['S-009','Build city landing pages','Dedicated page per city with H1, local info, pre-filled form','SEO','MEDIUM',3,'B-013','8h'],
  ['S-010','Build service landing pages','Dedicated page per service type with pricing and FAQ','SEO','MEDIUM',3,'—','8h'],
  // Frontend
  ['F-001','Fix CORS_ORIGIN for production','Set environment-aware CORS (not wildcard)','Frontend','HIGH',1,'—','0.5h'],
  ['F-002','Move pricing to shared config or API','Eliminate duplicate pricing constants between frontend and backend','Frontend','HIGH',2,'B-007','2h'],
  ['F-003','Add loading state to form on slow responses','Show spinner while API call is in progress','Frontend','LOW',1,'—','1h'],
  ['F-004','Add error messaging for rate limit (429)','Show user-friendly message when rate limit hit','Frontend','MEDIUM',1,'—','0.5h'],
];

const doc = new Document({
  styles:{default:{document:{run:{font:'Arial',size:18}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:32,bold:true,font:'Arial',color:'1F4E79'},paragraph:{spacing:{before:240,after:120},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:26,bold:true,font:'Arial',color:'2E75B6'},paragraph:{spacing:{before:180,after:80},outlineLevel:1}},
  ]},
  sections:[{
    properties:{page:{
      size:{width:11906,height:16838,orientation:PageOrientation.LANDSCAPE},
      margin:{top:1080,right:1080,bottom:1080,left:1080}
    }},
    headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'Agro Servis — Implementation Backlog',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})]})},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Implementation Backlog  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})]})},
    children:[
      new Paragraph({spacing:{before:720,after:240},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Implementation Backlog',font:'Arial',size:56,bold:true,color:'1F4E79'})]}),
      new Paragraph({spacing:{after:480},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Agro Servis — Full Development Backlog | Total Tasks: '+tasks.length,font:'Arial',size:28,color:'2E75B6'})]}),

      // Legend
      new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:'Category Color Legend',font:'Arial',size:26,bold:true,color:'2E75B6'})]}),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2326,2326,2326,2326,2326,2328],rows:[
        new TableRow({children:[
          new TableCell({borders,width:{size:2326,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'Backend (B-XXX)',font:'Arial',size:18,bold:true,color:'FFFFFF'})]})]}),
          new TableCell({borders,width:{size:2326,type:WidthType.DXA},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'Telegram (T-XXX)',font:'Arial',size:18,bold:true,color:'C55A11'})]})]}),
          new TableCell({borders,width:{size:2326,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'Admin (A-XXX)',font:'Arial',size:18,bold:true,color:'FFFFFF'})]})]}),
          new TableCell({borders,width:{size:2326,type:WidthType.DXA},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'DevOps (D-XXX)',font:'Arial',size:18,bold:true,color:'1D6F42'})]})]}),
          new TableCell({borders,width:{size:2326,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'SEO (S-XXX)',font:'Arial',size:18,bold:true,color:'FFFFFF'})]})]}),
          new TableCell({borders,width:{size:2328,type:WidthType.DXA},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'Frontend (F-XXX)',font:'Arial',size:18,bold:true,color:'7030A0'})]})]}),
        ]})
      ]}),
      new Paragraph({spacing:{after:120}}),
      new Paragraph({children:[new TextRun({text:'Priority: CRITICAL = must-have for MVP launch | HIGH = needed for production | MEDIUM = important | LOW = nice-to-have',font:'Arial',size:18,color:'666666',italics:true})],spacing:{after:160}}),

      // Main backlog table
      new Table({
        width:{size:CW,type:WidthType.DXA},
        columnWidths:[600,1800,3200,900,900,600,2000,1200,758],
        rows:[
          new TableRow({
            children:[hc('ID',600),hc('Task Name',1800),hc('Description',3200),hc('Category',900),hc('Priority',900),hc('CX',600),hc('Dependencies',2000),hc('Est. Time',1200),hc('Status',758)],
            tableHeader:true
          }),
          ...tasks.map((t,i) => row(...t, i%2===0?undefined:'E9F1F7')),
        ]
      }),

      new Paragraph({children:[new PageBreak()]}),
      new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:'Summary by Category',font:'Arial',size:32,bold:true,color:'1F4E79'})]}),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,2000,2000,2000,1958+2000],rows:[
        new TableRow({children:[hc('Category',2000),hc('Total Tasks',2000),hc('Critical',2000),hc('High',2000),hc('Total Est. Hours',3958)],tableHeader:true}),
        new TableRow({children:[dc('Backend',2000),dc('18',2000),dc('11',2000),dc('5',2000),dc('~35h',3958)]}),
        new TableRow({children:[dc('Telegram',2000),dc('7',2000),dc('1',2000),dc('3',2000),dc('~12h',3958)],'_shading':'E9F1F7'}),
        new TableRow({children:[dc('Admin',2000),dc('7',2000),dc('0',2000),dc('3',2000),dc('~17h',3958)]}),
        new TableRow({children:[dc('DevOps',2000),dc('9',2000),dc('2',2000),dc('4',2000),dc('~12.5h',3958)],'_shading':'E9F1F7'}),
        new TableRow({children:[dc('SEO',2000),dc('10',2000),dc('1',2000),dc('6',2000),dc('~22.5h',3958)]}),
        new TableRow({children:[dc('Frontend',2000),dc('4',2000),dc('0',2000),dc('1',2000),dc('~4h',3958)],'_shading':'E9F1F7'}),
        new TableRow({children:[new TableCell({borders,width:{size:2000,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:'TOTAL',font:'Arial',size:18,bold:true,color:'FFFFFF'})]})] }),dc('55',2000),dc('15',2000),dc('22',2000),dc('~103 hours',3958)]}),
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/08_Implementation_Backlog.docx',buf);
  console.log('OK: 08_Implementation_Backlog.docx created');
});
