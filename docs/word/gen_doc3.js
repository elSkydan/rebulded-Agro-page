// 03_API_Documentation.docx
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

function hc(t,w) { return new TableCell({ borders, width:{size:w,type:WidthType.DXA}, shading:{fill:'1F4E79',type:ShadingType.CLEAR}, margins:cm, children:[new Paragraph({children:[new TextRun({text:t,bold:true,color:'FFFFFF',font:'Arial',size:20})]})] }); }
function dc(t,w,sh) { return new TableCell({ borders, width:{size:w,type:WidthType.DXA}, shading:sh?{fill:sh,type:ShadingType.CLEAR}:undefined, margins:cm, children:[new Paragraph({children:[new TextRun({text:t,font:'Arial',size:20})]})] }); }
function hr(cols,ws) { return new TableRow({ children:cols.map((c,i)=>hc(c,ws[i])), tableHeader:true }); }
function dr(cols,ws,sh) { return new TableRow({ children:cols.map((c,i)=>dc(c,ws[i],sh)) }); }
function h1(t) { return new Paragraph({ heading:HeadingLevel.HEADING_1, children:[new TextRun({text:t,font:'Arial',size:36,bold:true,color:'1F4E79'})] }); }
function h2(t) { return new Paragraph({ heading:HeadingLevel.HEADING_2, children:[new TextRun({text:t,font:'Arial',size:28,bold:true,color:'2E75B6'})] }); }
function h3(t) { return new Paragraph({ heading:HeadingLevel.HEADING_3, children:[new TextRun({text:t,font:'Arial',size:24,bold:true,color:'404040'})] }); }
function p(t) { return new Paragraph({ children:[new TextRun({text:t,font:'Arial',size:22})], spacing:{after:120} }); }
function code(t) { return new Paragraph({ children:[new TextRun({text:t,font:'Courier New',size:18,color:'1F4E79'})], spacing:{after:40}, shading:{fill:'F0F4F8',type:ShadingType.CLEAR}, indent:{left:360} }); }
function methodBadge(method, route) {
  const colors = { GET:'1D6F42', POST:'1F4E79', PATCH:'7B3F00', DELETE:'C00000' };
  return new Paragraph({ spacing:{before:240,after:80}, children:[
    new TextRun({text:` ${method} `, font:'Courier New', size:22, bold:true, color:'FFFFFF', highlight: method==='GET'?'green':method==='POST'?'blue':'darkYellow'}),
    new TextRun({text:'  '+route, font:'Courier New', size:22, bold:true, color:'1F4E79'}),
  ]});
}

const stylesDef = {
  default: { document: { run: { font: 'Arial', size: 22 } } },
  paragraphStyles: [
    { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:36,bold:true,font:'Arial',color:'1F4E79'}, paragraph:{spacing:{before:300,after:180},outlineLevel:0} },
    { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:28,bold:true,font:'Arial',color:'2E75B6'}, paragraph:{spacing:{before:240,after:120},outlineLevel:1} },
    { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true, run:{size:24,bold:true,font:'Arial',color:'404040'}, paragraph:{spacing:{before:180,after:80},outlineLevel:2} },
  ]
};

const doc = new Document({
  styles: stylesDef,
  numbering: { config: [
    { reference:'numbers', levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}] },
    { reference:'bullets', levels:[{level:0,format:LevelFormat.BULLET,text:'-',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}},run:{font:'Arial',size:22}}}] },
  ]},
  sections: [{
    properties: { page: { size:{width:11906,height:16838}, margin:{top:1440,right:1440,bottom:1440,left:1440} } },
    headers: { default: new Header({ children:[new Paragraph({children:[new TextRun({text:'Agro Servis — API Documentation',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})] }) },
    footers: { default: new Footer({ children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'API Documentation  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})] }) },
    children: [
      new Paragraph({ spacing:{before:1440,after:240}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'API Documentation',font:'Arial',size:64,bold:true,color:'1F4E79'})] }),
      new Paragraph({ spacing:{after:480}, alignment:AlignmentType.CENTER, children:[new TextRun({text:'Agro Servis — All Endpoints Reference',font:'Arial',size:32,color:'2E75B6'})] }),
      new Paragraph({ children:[new PageBreak()] }),

      h1('Authentication & Global Rules'),
      h2('Bearer Token (Admin endpoints)'),
      p('All admin endpoints require the header: Authorization: Bearer {ADMIN_TOKEN}'),
      p('ADMIN_TOKEN is set in .env. Returns 401 Unauthorized if missing or invalid.'),
      h2('Rate Limiting'),
      p('Applied to POST /api/leads. Window: 60,000ms. Max: 5 requests per IP address. Response on exceed: 429 Too Many Requests.'),
      h2('Error Response Format'),
      code('{ "error": "Human-readable error message", "field": "fieldName", "code": "VALIDATION_ERROR" }'),
      new Paragraph({ spacing:{after:200} }),

      h1('Public Endpoints'),

      h2('Health Check'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /health',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      p('Verifies server process is alive. No DB check.'),
      new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[2000,7026], rows:[
        hr(['Field','Value'],[2000,7026]),
        dr(['Auth','None'],[2000,7026]),
        dr(['Response 200','{ "status": "ok", "timestamp": "2026-05-03T12:00:00.000Z" }'],[2000,7026],'E9F1F7'),
      ]}),
      new Paragraph({ spacing:{after:200} }),

      h2('List Cities (for form dropdown)'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /api/cities/public',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      p('Returns active cities for the lead submission form dropdown. No authentication required.'),
      code('Response 200: [{ "id": 1, "name": "Kyiv" }, { "id": 2, "name": "Kharkiv" }]'),
      new Paragraph({ spacing:{after:200} }),

      h2('Submit Lead (Client)'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'POST  /api/leads',font:'Courier New',size:24,bold:true,color:'1F4E79'})] }),
      p('Submit a new service request from a client. Rate limited: 5 per minute per IP.'),
      h3('Request Body'),
      new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[2400,1600,1600,3426], rows:[
        hr(['Field','Type','Required','Notes'],[2400,1600,1600,3426]),
        dr(['name','string','No','Client name'],[2400,1600,1600,3426]),
        dr(['phone','string','YES','Min 10 digits — normalized to +380XXXXXXXXX'],[2400,1600,1600,3426],'E9F1F7'),
        dr(['city_id','integer','YES','Must exist in cities table'],[2400,1600,1600,3426]),
        dr(['service_type','string','YES','ogorod | celina | mowing | tree | washing'],[2400,1600,1600,3426],'E9F1F7'),
        dr(['area','float','Conditional','Required for area services; must be > 0'],[2400,1600,1600,3426]),
        dr(['out_of_city','boolean','No','Default: false. Adds +800 hrn surcharge'],[2400,1600,1600,3426],'E9F1F7'),
        dr(['comment','string','No','Optional client comment'],[2400,1600,1600,3426]),
      ]}),
      new Paragraph({ spacing:{after:120} }),
      h3('Anti-spam Logic'),
      p('Same phone within 10 minutes: if existing lead is "new" or "assigned" — UPDATE existing (no new row). If terminal status — INSERT new lead.'),
      h3('Response 201'),
      code('{ "lead_id": 42, "status": "assigned", "estimated_price": 1650, "message": "Your request has been accepted!" }'),
      new Paragraph({ spacing:{after:120} }),
      h3('Error Codes'),
      new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[1400,3200,4426], rows:[
        hr(['Code','Body','Reason'],[1400,3200,4426]),
        dr(['400','{"error": "phone is required"}','Missing phone'],[1400,3200,4426]),
        dr(['400','{"error": "invalid service_type"}','Unknown service type'],[1400,3200,4426],'E9F1F7'),
        dr(['400','{"error": "city_id is required"}','Missing city'],[1400,3200,4426]),
        dr(['429','{"error": "Too many requests"}','Rate limit exceeded'],[1400,3200,4426],'E9F1F7'),
        dr(['500','{"error": "Internal server error"}','DB or Telegram failure'],[1400,3200,4426]),
      ]}),
      new Paragraph({ children:[new PageBreak()] }),

      h1('Admin Endpoints'),
      p('All admin endpoints require: Authorization: Bearer {ADMIN_TOKEN}'),

      h2('List Leads'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /api/leads',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      h3('Query Parameters'),
      new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[2200,1800,5026], rows:[
        hr(['Parameter','Type','Description'],[2200,1800,5026]),
        dr(['status','string','Filter by: new | assigned | accepted | completed | unassigned'],[2200,1800,5026]),
        dr(['city_id','integer','Filter by city'],[2200,1800,5026],'E9F1F7'),
        dr(['page','integer','Pagination page (default: 1)'],[2200,1800,5026]),
        dr(['limit','integer','Items per page (default: 50, max: 200)'],[2200,1800,5026],'E9F1F7'),
        dr(['from / to','ISO date','Date range filter (e.g., 2026-01-01)'],[2200,1800,5026]),
      ]}),
      new Paragraph({ spacing:{after:120} }),
      h3('Response 200'),
      code('{ "total": 142, "page": 1, "limit": 50, "data": [{ "id": 42, "phone_normalized": "+380679020326",'),
      code('  "city": "Kyiv", "service_type": "ogorod", "status": "assigned", "worker": "Petro Koval",'),
      code('  "total_price": 1650, "created_at": "2026-05-03T10:30:00Z" }] }'),
      new Paragraph({ spacing:{after:200} }),

      h2('Get Lead Detail'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /api/leads/:id',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      p('Returns full lead info including assignment history for debugging.'),
      code('Response 200: { "id": 42, ..., "assignment_history": ['),
      code('  { "worker": "Mykola Sydorenko", "status": "rejected", "at": "..." },'),
      code('  { "worker": "Petro Koval", "status": "accepted", "at": "..." } ] }'),
      new Paragraph({ spacing:{after:200} }),

      h2('Update Lead Status (Admin Override)'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'PATCH  /api/leads/:id/status',font:'Courier New',size:24,bold:true,color:'7B3F00'})] }),
      p('Manually override a lead status. Allowed transitions: any status -> "canceled"; "unassigned" -> triggers reassignment.'),
      code('Request: { "status": "canceled" }'),
      code('Response 200: { "id": 42, "status": "canceled", "updated_at": "..." }'),
      new Paragraph({ spacing:{after:200} }),

      h2('List Workers'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /api/workers',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      p('Returns all workers with city info, priority, active status.'),
      new Paragraph({ spacing:{after:200} }),

      h2('Create Worker'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'POST  /api/workers',font:'Courier New',size:24,bold:true,color:'1F4E79'})] }),
      new Table({ width:{size:CW,type:WidthType.DXA}, columnWidths:[2400,1600,1600,3426], rows:[
        hr(['Field','Type','Required','Notes'],[2400,1600,1600,3426]),
        dr(['name','string','YES','Worker display name'],[2400,1600,1600,3426]),
        dr(['phone','string','No','Worker phone number'],[2400,1600,1600,3426],'E9F1F7'),
        dr(['telegram_chat_id','integer','No','Required for Telegram notifications'],[2400,1600,1600,3426]),
        dr(['city_id','integer','YES','City where worker operates'],[2400,1600,1600,3426],'E9F1F7'),
        dr(['priority','integer','No','1-10, default 5. Higher = assigned first'],[2400,1600,1600,3426]),
      ]}),
      new Paragraph({ spacing:{after:200} }),

      h2('Update Worker'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'PATCH  /api/workers/:id',font:'Courier New',size:24,bold:true,color:'7B3F00'})] }),
      p('Update any worker field. Set is_active=false to deactivate. Deactivated workers are skipped in assignment.'),
      code('Request: { "is_active": false }  or  { "priority": 8, "city_id": 2 }'),
      new Paragraph({ spacing:{after:200} }),

      h2('List Cities (Admin)'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'GET  /api/cities',font:'Courier New',size:24,bold:true,color:'1D6F42'})] }),
      p('Returns all cities including inactive, with worker count per city.'),

      h2('Create City'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'POST  /api/cities',font:'Courier New',size:24,bold:true,color:'1F4E79'})] }),
      code('Request: { "name": "Lviv", "delivery_type": "both", "delivery_price": 800 }'),
      code('Response 201: { "id": 4, "name": "Lviv", "delivery_type": "both", "delivery_price": 800 }'),
      new Paragraph({ spacing:{after:200} }),

      h2('Telegram Webhook'),
      new Paragraph({ spacing:{before:200,after:60}, children:[new TextRun({text:'POST  /api/telegram/webhook',font:'Courier New',size:24,bold:true,color:'1F4E79'})] }),
      p('Called by Telegram servers only. Receives button press callbacks from workers. Must return HTTP 200 within 60 seconds.'),
      p('Security: Validated via telegram_chat_id ownership check. Should be secured with X-Telegram-Bot-Api-Secret-Token header (not yet implemented).'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/03_API_Documentation.docx', buf);
  console.log('OK: 03_API_Documentation.docx created');
});
