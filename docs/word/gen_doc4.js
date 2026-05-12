// 04_Database_Guide.docx
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
function hr(cols,ws){return new TableRow({children:cols.map((c,i)=>hc(c,ws[i])),tableHeader:true})}
function dr(cols,ws,sh){return new TableRow({children:cols.map((c,i)=>dc(c,ws[i],sh))})}
function h1(t){return new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,font:'Arial',size:36,bold:true,color:'1F4E79'})]})}
function h2(t){return new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,font:'Arial',size:28,bold:true,color:'2E75B6'})]})}
function h3(t){return new Paragraph({heading:HeadingLevel.HEADING_3,children:[new TextRun({text:t,font:'Arial',size:24,bold:true,color:'404040'})]})}
function p(t){return new Paragraph({children:[new TextRun({text:t,font:'Arial',size:22})],spacing:{after:120}})}
function code(t){return new Paragraph({children:[new TextRun({text:t,font:'Courier New',size:18,color:'1F4E79'})],spacing:{after:40},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},indent:{left:360}})}

const doc = new Document({
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:36,bold:true,font:'Arial',color:'1F4E79'},paragraph:{spacing:{before:300,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:28,bold:true,font:'Arial',color:'2E75B6'},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
    {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:24,bold:true,font:'Arial',color:'404040'},paragraph:{spacing:{before:180,after:80},outlineLevel:2}},
  ]},
  numbering:{config:[
    {reference:'numbers',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}]},
    {reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'-',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}]},
  ]},
  sections:[{
    properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'Agro Servis — Database & UI Guide',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})]})} ,
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Database Guide  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})]})},
    children:[
      new Paragraph({spacing:{before:1440,after:240},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Database Guide',font:'Arial',size:64,bold:true,color:'1F4E79'})]}),
      new Paragraph({spacing:{after:480},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Schema, Relations, Indexes & UI Access Guide',font:'Arial',size:32,color:'2E75B6'})]}),
      new Paragraph({children:[new PageBreak()]}),

      h1('1. Database Configuration'),
      p('Host: localhost | Port: 5432 | Database: lead_distribution | User: postgres'),
      new Paragraph({children:[new TextRun({text:'WARNING: Change the default password before any production deployment.',font:'Arial',size:22,bold:true,color:'C00000'})],spacing:{after:200}}),

      h1('2. Schema — Table Definitions'),
      h2('2.1 Table: cities'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,2000,1600,3226],rows:[
        hr(['Column','Type','Constraint','Notes'],[2200,2000,1600,3226]),
        dr(['id','SERIAL','PRIMARY KEY','Auto-increment'],[2200,2000,1600,3226]),
        dr(['name','VARCHAR(100)','NOT NULL UNIQUE','City name'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['delivery_type','VARCHAR(50)','—','in_city | out_of_city | both'],[2200,2000,1600,3226]),
        dr(['delivery_price','INTEGER','DEFAULT 0','Surcharge in UAH (usually 800 or 0)'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['is_active','BOOLEAN','DEFAULT TRUE','Inactive cities excluded from form'],[2200,2000,1600,3226]),
        dr(['created_at','TIMESTAMPTZ','DEFAULT NOW()','Creation timestamp'],[2200,2000,1600,3226],'E9F1F7'),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('2.2 Table: workers'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,2000,1600,3226],rows:[
        hr(['Column','Type','Constraint','Notes'],[2200,2000,1600,3226]),
        dr(['id','SERIAL','PRIMARY KEY','Auto-increment'],[2200,2000,1600,3226]),
        dr(['name','VARCHAR(100)','NOT NULL','Worker display name'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['phone','VARCHAR(20)','—','Worker phone number'],[2200,2000,1600,3226]),
        dr(['telegram_chat_id','BIGINT','UNIQUE','Telegram user ID — required for notifications'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['city_id','INTEGER','FK -> cities.id','City where worker operates'],[2200,2000,1600,3226]),
        dr(['priority','INTEGER','DEFAULT 5','1-10; higher = assigned first'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['is_active','BOOLEAN','DEFAULT TRUE','Inactive workers skipped in assignment'],[2200,2000,1600,3226]),
        dr(['last_assigned_at','TIMESTAMPTZ','—','For round-robin ordering among equal priority'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['created_at','TIMESTAMPTZ','DEFAULT NOW()','Creation timestamp'],[2200,2000,1600,3226]),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('2.3 Table: leads'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,2000,1600,3226],rows:[
        hr(['Column','Type','Constraint','Notes'],[2200,2000,1600,3226]),
        dr(['id','SERIAL','PRIMARY KEY','Auto-increment'],[2200,2000,1600,3226]),
        dr(['name','VARCHAR(100)','—','Client name (optional)'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['phone_normalized','VARCHAR(20)','NOT NULL','+380XXXXXXXXX format'],[2200,2000,1600,3226]),
        dr(['city_id','INTEGER','FK -> cities.id','Selected city'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['service_type','VARCHAR(20)','NOT NULL','ogorod|celina|mowing|tree|washing'],[2200,2000,1600,3226]),
        dr(['area','DECIMAL(6,1)','—','Area in sotky, 0.5 precision'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['out_of_city','BOOLEAN','DEFAULT FALSE','Out-of-city visit flag (+800 hrn)'],[2200,2000,1600,3226]),
        dr(['comment','TEXT','—','Optional client comment'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['total_price','INTEGER','—','Calculated by pricingService (UAH)'],[2200,2000,1600,3226]),
        dr(['status','VARCHAR(30)','NOT NULL DEFAULT "new"','State machine status'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['worker_id','INTEGER','FK -> workers.id','Currently assigned worker'],[2200,2000,1600,3226]),
        dr(['created_at','TIMESTAMPTZ','DEFAULT NOW()','Submission timestamp'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['updated_at','TIMESTAMPTZ','DEFAULT NOW()','Last status change — used for timeout'],[2200,2000,1600,3226]),
      ]}),
      new Paragraph({spacing:{after:120}}),
      p('Valid status values: new | assigned | accepted | rejected | completed | unassigned | failed_contact | canceled | timeout'),
      new Paragraph({spacing:{after:160}}),

      h2('2.4 Table: lead_assignments'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,2000,1600,3226],rows:[
        hr(['Column','Type','Constraint','Notes'],[2200,2000,1600,3226]),
        dr(['id','SERIAL','PRIMARY KEY','Auto-increment'],[2200,2000,1600,3226]),
        dr(['lead_id','INTEGER','FK -> leads.id CASCADE','Cascades on lead delete'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['worker_id','INTEGER','FK -> workers.id','Worker who was tried'],[2200,2000,1600,3226]),
        dr(['status','VARCHAR(20)','DEFAULT "sent"','sent | accepted | rejected | timeout'],[2200,2000,1600,3226],'E9F1F7'),
        dr(['created_at','TIMESTAMPTZ','DEFAULT NOW()','When this assignment was made'],[2200,2000,1600,3226]),
      ]}),
      p('Purpose: Tracks all assignment attempts per lead. Used to exclude already-tried workers during reassignment.'),
      new Paragraph({children:[new PageBreak()]}),

      h1('3. Entity Relationships'),
      p('cities 1:N workers — A city has many workers'),
      p('cities 1:N leads — A city has many leads'),
      p('workers 1:N leads — A worker can be the current assignee on many leads'),
      p('leads 1:N lead_assignments — A lead can have multiple assignment attempts'),
      p('workers 1:N lead_assignments — A worker can be tried for many different leads'),

      h1('4. Recommended Indexes'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,2400,3426],rows:[
        hr(['Index Name','Table / Columns','Purpose'],[3200,2400,3426]),
        dr(['idx_workers_city_active','workers(city_id, is_active, priority DESC, last_assigned_at ASC)','Fastest path for worker assignment query'],[3200,2400,3426]),
        dr(['idx_leads_status_updated','leads(status, updated_at)','Timeout cron query performance'],[3200,2400,3426],'E9F1F7'),
        dr(['idx_leads_phone_created','leads(phone_normalized, created_at DESC)','Spam/duplicate check performance'],[3200,2400,3426]),
        dr(['idx_lead_assignments_lead','lead_assignments(lead_id)','History lookup per lead'],[3200,2400,3426],'E9F1F7'),
        dr(['idx_lead_assignments_worker','lead_assignments(worker_id)','Worker assignment history'],[3200,2400,3426]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('5. Data Consistency Issues'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4226],rows:[
        hr(['Issue','Severity','Recommendation'],[3200,1600,4226]),
        dr(['updated_at not auto-updated by DB trigger','MEDIUM','Add BEFORE UPDATE trigger on leads table'],[3200,1600,4226]),
        dr(['Phone normalization must match between frontend and backend','HIGH','Validate both produce identical output'],[3200,1600,4226],'E9F1F7'),
        dr(['No audit log table for admin actions','LOW','Add audit_log table for production'],[3200,1600,4226]),
        dr(['Deleting a worker leaves leads with orphan worker_id reference','LOW','Add ON DELETE SET NULL or restrict deletion'],[3200,1600,4226],'E9F1F7'),
        dr(['lead_assignments grows unbounded over time','MEDIUM','Implement archive/purge policy after 90 days'],[3200,1600,4226]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('6. Database UI — Access Methods'),
      h2('Option A: DBeaver (Recommended for Development)'),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Download DBeaver Community Edition from https://dbeaver.io',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'New Connection -> PostgreSQL',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Host: localhost, Port: 5432, DB: lead_distribution, User: postgres',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Enter password from .env -> Test Connection -> Connect',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Expand: Databases -> lead_distribution -> Schemas -> public -> Tables',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Right-click any table -> View Data',font:'Arial',size:22})],spacing:{after:160}}),

      h2('Option B: psql Command Line'),
      code('psql postgres://postgres:PASSWORD@localhost:5432/lead_distribution'),
      code('\\dt                    -- list all tables'),
      code('SELECT * FROM leads ORDER BY created_at DESC LIMIT 20;'),
      code('SELECT * FROM workers WHERE is_active = true;'),
      code('SELECT l.id, l.phone_normalized, l.status, c.name as city, w.name as worker'),
      code('FROM leads l LEFT JOIN cities c ON l.city_id=c.id LEFT JOIN workers w ON l.worker_id=w.id'),
      code('ORDER BY l.created_at DESC LIMIT 20;'),
      new Paragraph({spacing:{after:160}}),

      h2('Option C: Supabase Studio (Production Recommended)'),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Create project at https://supabase.com',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Table Editor tab: view and edit data visually',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'SQL Editor tab: run raw queries',font:'Arial',size:22})],spacing:{after:80}}),
      new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:'Get connection string from Settings -> Database',font:'Arial',size:22})],spacing:{after:160}}),

      h2('Creating Test Data (SQL Examples)'),
      code('-- Add a city'),
      code('INSERT INTO cities (name, delivery_type, delivery_price) VALUES ("Kyiv", "both", 800);'),
      code(''),
      code('-- Add a worker'),
      code('INSERT INTO workers (name, phone, telegram_chat_id, city_id, priority, is_active)'),
      code('VALUES ("Ivan Petrovych", "+380671234567", 123456789, 1, 10, true);'),
      code(''),
      code('-- Dashboard summary'),
      code('SELECT'),
      code('  COUNT(*) FILTER (WHERE status="new") as new_leads,'),
      code('  COUNT(*) FILTER (WHERE status="assigned") as assigned,'),
      code('  COUNT(*) FILTER (WHERE status="accepted") as accepted,'),
      code('  COUNT(*) FILTER (WHERE status="completed") as completed,'),
      code('  COUNT(*) FILTER (WHERE status="unassigned") as unassigned'),
      code('FROM leads;'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/04_Database_Guide.docx',buf);
  console.log('OK: 04_Database_Guide.docx created');
});
