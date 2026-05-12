// 05_System_Risks.docx
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');
const CW = 9026;
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top:border,bottom:border,left:border,right:border };
const cm = { top:80,bottom:80,left:120,right:120 };
function hc(t,w){return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:{fill:'1F4E79',type:ShadingType.CLEAR},margins:cm,children:[new Paragraph({children:[new TextRun({text:t,bold:true,color:'FFFFFF',font:'Arial',size:20})]})]})}
function dc(t,w,sh){return new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:sh?{fill:sh,type:ShadingType.CLEAR}:undefined,margins:cm,children:[new Paragraph({children:[new TextRun({text:t,font:'Arial',size:20})]})]})}
function hr(c,w){return new TableRow({children:c.map((x,i)=>hc(x,w[i])),tableHeader:true})}
function dr(c,w,sh){return new TableRow({children:c.map((x,i)=>dc(x,w[i],sh))})}
function h1(t){return new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,font:'Arial',size:36,bold:true,color:'1F4E79'})]})}
function h2(t){return new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,font:'Arial',size:28,bold:true,color:'2E75B6'})]})}
function p(t){return new Paragraph({children:[new TextRun({text:t,font:'Arial',size:22})],spacing:{after:120}})}
function riskRow(risk, sev, impact, fix, shade) {
  const sevColor = sev==='CRITICAL'?'C00000':sev==='HIGH'?'C55A11':sev==='MEDIUM'?'7030A0':'1F4E79';
  return new TableRow({children:[
    new TableCell({borders,width:{size:2400,type:WidthType.DXA},shading:shade?{fill:shade,type:ShadingType.CLEAR}:undefined,margins:cm,children:[new Paragraph({children:[new TextRun({text:risk,font:'Arial',size:20})]})] }),
    new TableCell({borders,width:{size:1200,type:WidthType.DXA},shading:shade?{fill:shade,type:ShadingType.CLEAR}:undefined,margins:cm,children:[new Paragraph({children:[new TextRun({text:sev,font:'Arial',size:20,bold:true,color:sevColor})]})] }),
    new TableCell({borders,width:{size:2400,type:WidthType.DXA},shading:shade?{fill:shade,type:ShadingType.CLEAR}:undefined,margins:cm,children:[new Paragraph({children:[new TextRun({text:impact,font:'Arial',size:20})]})] }),
    new TableCell({borders,width:{size:3026,type:WidthType.DXA},shading:shade?{fill:shade,type:ShadingType.CLEAR}:undefined,margins:cm,children:[new Paragraph({children:[new TextRun({text:fix,font:'Arial',size:20})]})] }),
  ]});
}

const doc = new Document({
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:36,bold:true,font:'Arial',color:'1F4E79'},paragraph:{spacing:{before:300,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:28,bold:true,font:'Arial',color:'2E75B6'},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
  ]},
  sections:[{
    properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'Agro Servis — System Risks Report',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})]})},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'System Risks  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})]})},
    children:[
      new Paragraph({spacing:{before:1440,after:240},alignment:AlignmentType.CENTER,children:[new TextRun({text:'System Risks Report',font:'Arial',size:64,bold:true,color:'C00000'})]}),
      new Paragraph({spacing:{after:480},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Bottlenecks | Security Issues | Race Conditions | Tech Debt',font:'Arial',size:32,color:'2E75B6'})]}),
      new Paragraph({children:[new PageBreak()]}),

      h1('1. Critical Missing Implementation Risks'),
      p('The backend is fully documented but NOT built. Running npm start will throw MODULE_NOT_FOUND errors because server.js imports routes and services that do not exist. The system cannot process any leads until all backend files are created.'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2400,1200,2400,3026],rows:[
        new TableRow({children:[hc('Risk',2400),hc('Severity',1200),hc('Impact',2400),hc('Resolution',3026)],tableHeader:true}),
        riskRow('Backend routes do not exist','CRITICAL','Server crashes on start','Implement all route files'),
        riskRow('DB schema not created','CRITICAL','No data can be stored','Create and run schema.sql','E9F1F7'),
        riskRow('Services not implemented','CRITICAL','No lead assignment or Telegram','Implement all service files'),
        riskRow('Telegram bot token is placeholder','CRITICAL','No worker notifications possible','Replace with real BotFather token','E9F1F7'),
        riskRow('ADMIN_TOKEN is placeholder','HIGH','Admin API accessible without auth','Set strong 32+ char random token'),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('2. Security Risks'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2400,1200,2400,3026],rows:[
        new TableRow({children:[hc('Risk',2400),hc('Severity',1200),hc('Impact',2400),hc('Resolution',3026)],tableHeader:true}),
        riskRow('Database password in plain .env','CRITICAL','Credential exposure if file leaked','Use secrets manager; never commit .env'),
        riskRow('No Telegram webhook signature check','HIGH','Forged webhook calls possible','Add X-Telegram-Bot-Api-Secret-Token validation','E9F1F7'),
        riskRow('Single ADMIN_TOKEN for all admins','HIGH','Cannot revoke individual access','Implement user accounts with JWT'),
        riskRow('CORS wildcard in .env','MEDIUM','Any origin can call the API','Set CORS_ORIGIN to production domain only','E9F1F7'),
        riskRow('No HTTPS enforcement in Express','MEDIUM','Credentials sent over HTTP','Use HTTPS redirect middleware or Nginx'),
        riskRow('No SQL injection protection visible','MEDIUM','If parameterized queries not used','Use pg parameterized queries everywhere','E9F1F7'),
        riskRow('Admin routes not protected until middleware built','HIGH','All admin data exposed','Build auth.js middleware immediately'),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('3. Race Conditions'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2800,1200,2400,2626],rows:[
        new TableRow({children:[hc('Condition',2800),hc('Severity',1200),hc('Impact',2400),hc('Mitigation',2626)],tableHeader:true}),
        riskRow('Two requests assign same lead simultaneously','HIGH','Lead assigned to two workers','SELECT FOR UPDATE on lead row'),
        riskRow('Worker taps button while reassignment is running','MEDIUM','Double status change','FOR UPDATE prevents this','E9F1F7'),
        riskRow('Cron timeout and manual admin override race','LOW','Both try to change status','FOR UPDATE SKIP LOCKED handles this'),
        riskRow('Rate limiter state not shared in cluster mode','MEDIUM','Rate limit bypassed across processes','Use Redis store for express-rate-limit','E9F1F7'),
        riskRow('Telegram API down during assignment','HIGH','Lead assigned in DB, worker never notified','Wrap in try/catch with status revert'),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('4. Performance Bottlenecks'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2400,1200,2400,3026],rows:[
        new TableRow({children:[hc('Bottleneck',2400),hc('Severity',1200),hc('Trigger Point',2400),hc('Solution',3026)],tableHeader:true}),
        riskRow('Synchronous Telegram API call during lead submit','HIGH','Any Telegram API slowdown','BullMQ async queue for notifications'),
        riskRow('FOR UPDATE serializes all assignment requests','MEDIUM','>100 concurrent submissions/min','Queue-based assignment to avoid DB locking','E9F1F7'),
        riskRow('No DB indexes on leads(status, updated_at)','HIGH','Table >10,000 rows','Add indexes before launch'),
        riskRow('Missing updated_at trigger','MEDIUM','Timeout cron uses wrong timestamp','Add DB trigger for updated_at','E9F1F7'),
        riskRow('Static files served by Express (no CDN)','LOW','>1000 concurrent users','Move static files to Cloudflare or Vercel'),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('5. Scaling Blockers'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2800,1200,5026],rows:[
        hr(['Blocker','When','Required Change'],[2800,1200,5026]),
        dr(['Single Node.js process (no cluster)','At >500 req/sec','PM2 cluster mode + Redis for shared state'],[2800,1200,5026]),
        dr(['Single PostgreSQL instance','At >10k leads/day','Read replicas; connection pooler (PgBouncer)'],[2800,1200,5026],'E9F1F7'),
        dr(['node-cron runs in main process','When timeout processing takes >60s','Extract timeoutService to separate process'],[2800,1200,5026]),
        dr(['One bot token for all workers','At 30+ concurrent notifications/sec','BullMQ per-chat rate limiting'],[2800,1200,5026],'E9F1F7'),
        dr(['No Redis — rate limiter is in-memory','On first horizontal scale','Add Redis + connect to express-rate-limit'],[2800,1200,5026]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('6. Tech Debt'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3000,1400,4626],rows:[
        hr(['Item','Priority','Notes'],[3000,1400,4626]),
        dr(['Pricing constants duplicated in frontend and backend','HIGH','Single source of truth needed — serve from API or shared config file'],[3000,1400,4626]),
        dr(['No .env.example file','MEDIUM','Developers cannot set up without seeing the .env'],[3000,1400,4626],'E9F1F7'),
        dr(['No input validation library (joi/zod)','MEDIUM','Manual validation is error-prone and verbose'],[3000,1400,4626]),
        dr(['No logging framework (winston/pino)','MEDIUM','console.log not suitable for production debugging'],[3000,1400,4626],'E9F1F7'),
        dr(['No health check for DB connection','LOW','Health endpoint returns ok even if DB is down'],[3000,1400,4626]),
        dr(['No automated tests','HIGH','No safety net for backend development'],[3000,1400,4626],'E9F1F7'),
        dr(['No CI/CD pipeline','MEDIUM','Manual deployments; no automated quality gate'],[3000,1400,4626]),
        dr(['Worker self-registration not designed','HIGH','Admin must manually add every worker to DB'],[3000,1400,4626],'E9F1F7'),
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/05_System_Risks.docx',buf);
  console.log('OK: 05_System_Risks.docx created');
});
