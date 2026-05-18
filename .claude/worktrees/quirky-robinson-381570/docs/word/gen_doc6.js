// 06_AdminPanel_Production_CICD.docx
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
function h3(t){return new Paragraph({heading:HeadingLevel.HEADING_3,children:[new TextRun({text:t,font:'Arial',size:24,bold:true,color:'404040'})]})}
function p(t){return new Paragraph({children:[new TextRun({text:t,font:'Arial',size:22})],spacing:{after:120}})}
function code(t){return new Paragraph({children:[new TextRun({text:t,font:'Courier New',size:18,color:'1F4E79'})],spacing:{after:40},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},indent:{left:360}})}
function nb(t,ref){return new Paragraph({numbering:{reference:ref||'numbers',level:0},children:[new TextRun({text:t,font:'Arial',size:22})],spacing:{after:80}})}

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
    headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'Agro Servis — Admin Panel, Production & CI/CD Guide',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})]})},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Operations Guide  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})]})},
    children:[
      new Paragraph({spacing:{before:1440,after:240},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Operations Guide',font:'Arial',size:64,bold:true,color:'1F4E79'})]}),
      new Paragraph({spacing:{after:480},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Admin Panel | Production Deployment | CI/CD Pipeline',font:'Arial',size:32,color:'2E75B6'})]}),
      new Paragraph({children:[new PageBreak()]}),

      // ADMIN PANEL
      h1('Part 1: Admin Panel Architecture'),
      h2('1.1 Current State'),
      p('No admin panel exists. No admin.html file has been created. The project documentation mentions it as planned but not yet built. Database access is currently only possible via direct psql or a GUI client like DBeaver.'),

      h2('1.2 Recommended MVP Admin Panel Features'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3000,1600,1800,2626],rows:[
        hr(['Feature','Priority','Section','Notes'],[3000,1600,1800,2626]),
        dr(['View all leads with filters','CRITICAL','Leads','Filter by status, city, date'],[3000,1600,1800,2626]),
        dr(['View lead detail + history','CRITICAL','Leads','Full assignment trail'],[3000,1600,1800,2626],'E9F1F7'),
        dr(['Cancel / override lead status','HIGH','Leads','Admin manual control'],[3000,1600,1800,2626]),
        dr(['Add / edit / deactivate workers','CRITICAL','Workers','Full CRUD'],[3000,1600,1800,2626],'E9F1F7'),
        dr(['Add / edit cities','HIGH','Cities','Manage service areas'],[3000,1600,1800,2626]),
        dr(['Dashboard: lead counts by status','HIGH','Dashboard','At-a-glance overview'],[3000,1600,1800,2626],'E9F1F7'),
        dr(['Alert: unassigned leads count','CRITICAL','Dashboard','Operational alert'],[3000,1600,1800,2626]),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('1.3 Recommended Architecture'),
      p('Phase 1 — Separate admin.html page served by Express at /admin. Uses vanilla JS and the existing API with Bearer token stored in localStorage. Zero additional deployment cost.'),
      p('Phase 2 — React SPA for the admin panel deployed separately on Vercel. Better UX, component reuse, but requires separate deployment.'),
      p('Phase 0 (Now) — Use Supabase Studio or Retool connected to the database directly. Zero development required, operational in minutes.'),

      h2('1.4 Role Model'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,7026],rows:[
        hr(['Role','Access'],[2000,7026]),
        dr(['Admin','Full: read/write all resources, manage workers, override leads, manage cities'],[2000,7026]),
        dr(['Operator','Read-only for leads and workers; can cancel leads; cannot manage workers or cities'],[2000,7026],'E9F1F7'),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('1.5 Security Model'),
      p('Current: Single ADMIN_TOKEN in .env for all admin operations. No role differentiation, no user accounts.'),
      p('Improvement path (without rewriting): Add OPERATOR_TOKEN to .env for read-only access. Admin endpoints check ADMIN_TOKEN; read-only endpoints accept either token.'),
      p('Production-ready: Replace with JWT-based auth with session management, HttpOnly cookies, and user accounts stored in DB.'),

      new Paragraph({children:[new PageBreak()]}),

      // PRODUCTION
      h1('Part 2: Production Deployment'),
      h2('2.1 Local Development Setup'),
      nb('Clone repository and run npm install'),
      nb('Create PostgreSQL database: createdb lead_distribution'),
      nb('Apply schema: psql lead_distribution < db/schema.sql'),
      nb('Copy .env.example to .env and fill in all values'),
      nb('Start dev server: npm run dev'),
      nb('Register Telegram webhook using ngrok (see Telegram Bot Guide)'),
      new Paragraph({spacing:{after:160}}),

      h2('2.2 Environment Variables (Required for Production)'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2600,3400,3026],rows:[
        hr(['Variable','Production Value','Security Note'],[2600,3400,3026]),
        dr(['DATABASE_URL','Supabase or Neon connection string','Never commit to git'],[2600,3400,3026]),
        dr(['TELEGRAM_BOT_TOKEN','Real token from BotFather','Never expose publicly'],[2600,3400,3026],'E9F1F7'),
        dr(['ADMIN_TOKEN','node -e "require(crypto).randomBytes(32).toString(hex)"','Minimum 32 characters'],[2600,3400,3026]),
        dr(['CORS_ORIGIN','https://your-production-domain.com','Never use wildcard (*) in production'],[2600,3400,3026],'E9F1F7'),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('2.3 Deployment Option A: Railway (Recommended)'),
      nb('Create account at railway.app'),
      nb('New Project -> Deploy from GitHub repository'),
      nb('Add PostgreSQL Plugin in Railway dashboard'),
      nb('Copy DATABASE_URL from Plugin settings'),
      nb('Add all environment variables in Settings -> Variables'),
      nb('Railway auto-detects Node.js and runs npm start'),
      nb('Set custom domain in Settings -> Domains'),
      nb('Register Telegram webhook with Railway domain URL'),
      new Paragraph({spacing:{after:160}}),

      h2('2.4 Deployment Option B: VPS (Ubuntu)'),
      code('# Install Node.js 18'),
      code('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -'),
      code('sudo apt-get install -y nodejs postgresql nginx'),
      code(''),
      code('# Clone and configure'),
      code('git clone https://github.com/YOUR/repo.git /opt/agroservice'),
      code('cd /opt/agroservice && npm install --production'),
      code('cp .env.example .env && nano .env'),
      code(''),
      code('# Run with PM2'),
      code('npm install -g pm2'),
      code('pm2 start server.js --name agroservice'),
      code('pm2 startup && pm2 save'),
      new Paragraph({spacing:{after:160}}),

      h2('2.5 Production Checklist'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[1200,7826],rows:[
        hr(['Done','Check'],[1200,7826]),
        dr(['[ ]','All placeholder values in .env replaced with real values'],[1200,7826]),
        dr(['[ ]','ADMIN_TOKEN is a strong random secret (32+ chars)'],[1200,7826],'E9F1F7'),
        dr(['[ ]','Database password is strong (not the default SkydG1488!)'],[1200,7826]),
        dr(['[ ]','HTTPS enabled on all endpoints'],[1200,7826],'E9F1F7'),
        dr(['[ ]','Telegram webhook registered and verified'],[1200,7826]),
        dr(['[ ]','db/schema.sql applied to production database'],[1200,7826],'E9F1F7'),
        dr(['[ ]','.env file NOT committed to git (verify .gitignore)'],[1200,7826]),
        dr(['[ ]','Health check GET /health returns 200'],[1200,7826],'E9F1F7'),
        dr(['[ ]','CORS_ORIGIN set to production domain (not wildcard)'],[1200,7826]),
        dr(['[ ]','Database backup scheduled (minimum daily)'],[1200,7826],'E9F1F7'),
      ]}),
      new Paragraph({children:[new PageBreak()]}),

      // CI/CD
      h1('Part 3: CI/CD Pipeline'),
      h2('3.1 GitHub Actions Pipeline'),
      p('Three environments: development (feature branches), staging (main branch), production (release tags).'),

      h3('Workflow: ci.yml (Run on all PRs)'),
      code('name: CI'),
      code('on: [push, pull_request]'),
      code('jobs:'),
      code('  test:'),
      code('    runs-on: ubuntu-latest'),
      code('    services:'),
      code('      postgres:'),
      code('        image: postgres:14'),
      code('        env:'),
      code('          POSTGRES_DB: lead_distribution_test'),
      code('          POSTGRES_PASSWORD: test'),
      code('        ports: ["5432:5432"]'),
      code('    steps:'),
      code('      - uses: actions/checkout@v4'),
      code('      - uses: actions/setup-node@v4'),
      code('        with: { node-version: "18" }'),
      code('      - run: npm ci'),
      code('      - run: psql ... < db/schema.sql'),
      code('      - run: npm test'),
      new Paragraph({spacing:{after:160}}),

      h3('Workflow: deploy-staging.yml (Auto-deploy main -> staging)'),
      code('name: Deploy Staging'),
      code('on:'),
      code('  push:'),
      code('    branches: [main]'),
      code('jobs:'),
      code('  deploy:'),
      code('    runs-on: ubuntu-latest'),
      code('    steps:'),
      code('      - uses: actions/checkout@v4'),
      code('      - name: Deploy to Railway staging'),
      code('        run: railway up --service agroservice-staging'),
      code('        env:'),
      code('          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}'),
      new Paragraph({spacing:{after:160}}),

      h3('Workflow: deploy-production.yml (Manual trigger on release tag)'),
      code('name: Deploy Production'),
      code('on:'),
      code('  push:'),
      code('    tags: ["v*"]'),
      code('jobs:'),
      code('  deploy:'),
      code('    runs-on: ubuntu-latest'),
      code('    environment: production  # requires manual approval'),
      code('    steps:'),
      code('      - uses: actions/checkout@v4'),
      code('      - name: Deploy to Railway production'),
      code('        run: railway up --service agroservice-prod'),
      new Paragraph({spacing:{after:160}}),

      h2('3.2 GitHub Secrets Required'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3000,6026],rows:[
        hr(['Secret Name','Value'],[3000,6026]),
        dr(['RAILWAY_TOKEN','Railway API token from Account Settings'],[3000,6026]),
        dr(['DATABASE_URL_TEST','Test database connection string'],[3000,6026],'E9F1F7'),
        dr(['TELEGRAM_BOT_TOKEN_TEST','Test bot token for integration tests'],[3000,6026]),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('3.3 Branch Strategy'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,3000,4026],rows:[
        hr(['Branch','Environment','Trigger'],[2000,3000,4026]),
        dr(['feature/*','Local only','Developer push -> CI tests run'],[2000,3000,4026]),
        dr(['main','Staging','Auto-deploy on merge'],[2000,3000,4026],'E9F1F7'),
        dr(['v1.0.0 (tags)','Production','Manual release tag -> deploy with approval'],[2000,3000,4026]),
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/06_AdminPanel_Production_CICD.docx',buf);
  console.log('OK: 06_AdminPanel_Production_CICD.docx created');
});
