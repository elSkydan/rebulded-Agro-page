// 07_SEO_Strategy.docx
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
function nb(t){return new Paragraph({numbering:{reference:'numbers',level:0},children:[new TextRun({text:t,font:'Arial',size:22})],spacing:{after:80}})}

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
    headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'Agro Servis — SEO Strategy',font:'Arial',size:18,color:'666666',italics:true})],border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E75B6'}}})]})},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'SEO Strategy  |  Page ',font:'Arial',size:18,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:'888888'})]})]})},
    children:[
      new Paragraph({spacing:{before:1440,after:240},alignment:AlignmentType.CENTER,children:[new TextRun({text:'SEO Strategy',font:'Arial',size:64,bold:true,color:'1F4E79'})]}),
      new Paragraph({spacing:{after:480},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Agricultural Services Aggregator — Ukrainian Market',font:'Arial',size:32,color:'2E75B6'})]}),
      new Paragraph({children:[new PageBreak()]}),

      h1('1. Keyword Strategy'),
      h2('1.1 Primary Keywords (Ukrainian)'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[4000,2200,2826],rows:[
        hr(['Keyword','Search Intent','Est. Volume'],[4000,2200,2826]),
        dr(['vspashka horodu (vspashka gorodu)','Transactional','High'],[4000,2200,2826]),
        dr(['vspashka gorodu Kyiv','Local transactional','Medium'],[4000,2200,2826],'E9F1F7'),
        dr(['zamovyty vspashku (order plowing)','Transactional','Medium'],[4000,2200,2826]),
        dr(['pokos travy tsina (mowing price)','Transactional','Medium'],[4000,2200,2826],'E9F1F7'),
        dr(['tsilyna rozrobka (virgin land prep)','Transactional','Low-Medium'],[4000,2200,2826]),
        dr(['vspashka motoblock (plowing with motoblock)','Informational','Medium'],[4000,2200,2826],'E9F1F7'),
        dr(['skilky koshtuye vspashka (how much does plowing cost)','Transactional','Medium'],[4000,2200,2826]),
        dr(['vspashka za sotku tsina (price per sotka)','Transactional','Medium'],[4000,2200,2826],'E9F1F7'),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('1.2 City-Specific Keywords'),
      p('Target pattern for each city: {service} + {city}. Examples:'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[4513,4513],rows:[
        hr(['Keyword Example','City'],[4513,4513]),
        dr(['vspashka gorodu Kyiv','Kyiv'],[4513,4513]),
        dr(['pokos travy Kharkiv','Kharkiv'],[4513,4513],'E9F1F7'),
        dr(['tsilyna Odesa tsina','Odesa'],[4513,4513]),
        dr(['vspashka Dnipro nedorogo','Dnipro'],[4513,4513],'E9F1F7'),
        dr(['zamovyty pokos Zaporizhzhia','Zaporizhzhia'],[4513,4513]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('2. Landing Page & City Page Architecture'),
      h2('2.1 Current SEO Issues'),
      p('The entire site is a single page at the root URL (/). This means all city-specific searches lead to the same generic page — Google cannot rank individual cities. There are no meta title, meta description, or structured data tags in index.html. Hero image is loaded from Unsplash (external CDN) which harms performance and LCP score.'),

      h2('2.2 Required Meta Tags (Add to index.html immediately)'),
      code('<title>Vspashka horodu v Kyevi | Pokos travy | Tsilyna — Agro Servis</title>'),
      code('<meta name="description" content="Zamovte vspashku horodu, pokos travy abo rozrobku tsilyny v Kyevi. Tsina vid 200 hrn/sotku. Vyizd u den zamovlennya.">'),
      code('<meta name="robots" content="index, follow">'),
      code('<link rel="canonical" href="https://your-domain.com/">'),
      code('<meta property="og:title" content="Vspashka horodu v Kyevi — Agro Servis">'),
      code('<meta property="og:description" content="Zamovte vspashku vid 300 hrn/sotku. Vyizd u toy samyy den!">'),
      new Paragraph({spacing:{after:160}}),

      h2('2.3 Recommended URL Structure for City Pages'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3500,5526],rows:[
        hr(['URL','Purpose'],[3500,5526]),
        dr(['/','Main page — Kyiv default'],[3500,5526]),
        dr(['/vspashka-gorodu','Service page — plowing (informational)'],[3500,5526],'E9F1F7'),
        dr(['/vspashka-gorodu-kyiv','City page — Kyiv plowing'],[3500,5526]),
        dr(['/vspashka-gorodu-kharkiv','City page — Kharkiv plowing'],[3500,5526],'E9F1F7'),
        dr(['/pokos-travy','Service page — mowing'],[3500,5526]),
        dr(['/pokos-travy-odesa','City page — Odesa mowing'],[3500,5526],'E9F1F7'),
        dr(['/tsilyna','Service page — virgin land'],[3500,5526]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('3. Technical SEO'),
      h2('3.1 Schema.org Structured Data'),
      p('Add LocalBusiness schema to the main page and each city page:'),
      code('{'),
      code('  "@context": "https://schema.org",'),
      code('  "@type": "LocalBusiness",'),
      code('  "name": "Agro Servis",'),
      code('  "description": "Agricultural machinery services — plowing, mowing, virgin land",'),
      code('  "telephone": "+380679020326",'),
      code('  "openingHours": "Mo-Su 07:00-20:00",'),
      code('  "priceRange": "vid 200 hrn",'),
      code('  "areaServed": ["Kyiv", "Kharkiv", "Odesa"],'),
      code('  "serviceType": ["Vspashka", "Pokos", "Tsilyna"]'),
      code('}'),
      new Paragraph({spacing:{after:160}}),

      h2('3.2 Core Web Vitals'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,1600,2200,3026],rows:[
        hr(['Metric','Target','Current Issue','Fix'],[2200,1600,2200,3026]),
        dr(['LCP (Largest Contentful Paint)','< 2.5s','Hero image from Unsplash (external)','Self-host hero image, add preload link'],[2200,1600,2200,3026]),
        dr(['FID / INP','< 100ms','Large main.js executed on load','Split JS; load non-critical async'],[2200,1600,2200,3026],'E9F1F7'),
        dr(['CLS (Cumulative Layout Shift)','< 0.1','Lucide icons load may cause shift','Add width/height to all images'],[2200,1600,2200,3026]),
      ]}),
      new Paragraph({spacing:{after:160}}),

      h2('3.3 robots.txt'),
      code('User-agent: *'),
      code('Allow: /'),
      code('Disallow: /api/'),
      code('Disallow: /admin'),
      code('Sitemap: https://your-domain.com/sitemap.xml'),
      new Paragraph({spacing:{after:160}}),

      h2('3.4 sitemap.xml (Dynamic — Generate from DB)'),
      code('<?xml version="1.0" encoding="UTF-8"?>'),
      code('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'),
      code('  <url><loc>https://your-domain.com/</loc><priority>1.0</priority></url>'),
      code('  <url><loc>https://your-domain.com/vspashka-gorodu</loc><priority>0.9</priority></url>'),
      code('  <url><loc>https://your-domain.com/vspashka-gorodu-kyiv</loc><priority>0.8</priority></url>'),
      code('  <url><loc>https://your-domain.com/pokos-travy</loc><priority>0.8</priority></url>'),
      code('</urlset>'),
      new Paragraph({spacing:{after:200}}),

      h1('4. Local SEO'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3000,6026],rows:[
        hr(['Action','Platform / Notes'],[3000,6026]),
        dr(['Create Google Business Profile','google.com/business — add for each city served'],[3000,6026]),
        dr(['List on 2GIS','Popular Ukrainian local business directory'],[3000,6026],'E9F1F7'),
        dr(['List on OLX','Post service listings per city with website link'],[3000,6026]),
        dr(['List on Prom.ua','Ukrainian marketplace — create service profile'],[3000,6026],'E9F1F7'),
        dr(['Register in Google Search Console','Submit domain and sitemap.xml'],[3000,6026]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('5. Content Strategy'),
      h2('5.1 Blog Article Topics'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[4500,4526],rows:[
        hr(['Article Title','Target Keyword'],[4500,4526]),
        dr(['Koly krashche oraty horod? (When is best to plow?)','koly oraty horod'],[4500,4526]),
        dr(['Tsina vspashky horodu u 2025 rotsi','tsina vspashky horodu 2025'],[4500,4526],'E9F1F7'),
        dr(['Yak pidhotuvaty horod do vesny','pidhotovka horodu do posivu'],[4500,4526]),
        dr(['Tsilyna vs vspashka — shcho vyberty','riznytsia mizh tsilynoyu i vspashkoyu'],[4500,4526],'E9F1F7'),
        dr(['Skiky sotoky na moiy diliantsi? Yak porakhuvaty','rozrakhunok ploshchi dilianky'],[4500,4526]),
      ]}),
      new Paragraph({spacing:{after:200}}),

      h1('6. Implementation Priority'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[4000,1800,1600,1626],rows:[
        hr(['Action','Priority','Effort','Impact'],[4000,1800,1600,1626]),
        dr(['Add meta title and description to index.html','CRITICAL','30 min','Very High'],[4000,1800,1600,1626]),
        dr(['Add Schema.org LocalBusiness markup','HIGH','1 hour','High'],[4000,1800,1600,1626],'E9F1F7'),
        dr(['Add canonical URL tag','HIGH','15 min','Medium'],[4000,1800,1600,1626]),
        dr(['Self-host hero image (remove Unsplash in prod)','HIGH','30 min','High (LCP)'],[4000,1800,1600,1626],'E9F1F7'),
        dr(['Create sitemap.xml endpoint','HIGH','2 hours','High'],[4000,1800,1600,1626]),
        dr(['Add robots.txt','HIGH','15 min','Medium'],[4000,1800,1600,1626],'E9F1F7'),
        dr(['Register Google Search Console','HIGH','30 min','High'],[4000,1800,1600,1626]),
        dr(['Create Google Business Profile','HIGH','1 hour','Very High (local)'],[4000,1800,1600,1626],'E9F1F7'),
        dr(['Build city-specific landing pages','MEDIUM','1 week','Very High (long-term)'],[4000,1800,1600,1626]),
        dr(['Build service-specific pages','MEDIUM','1 week','High (long-term)'],[4000,1800,1600,1626],'E9F1F7'),
        dr(['Start blog content (2 articles/month)','LOW','Ongoing','High (long-term)'],[4000,1800,1600,1626]),
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('C:/Users/Agent005/Desktop/agroagriggator_v2/.claude/worktrees/quirky-robinson-381570/docs/word/07_SEO_Strategy.docx',buf);
  console.log('OK: 07_SEO_Strategy.docx created');
});
