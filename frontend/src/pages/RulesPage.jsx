import React, { useMemo, useState } from 'react';

const ruleSections = [
  {
    id: 'general',
    title: 'Általános szabályok',
    fileName: 'altalanos-szabalyok.doc',
    content: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia doloribus reprehenderit tempora! Saepe doloribus odit exercitationem, aspernatur nisi mollitia explicabo eligendi ratione ea deserunt, voluptatem perferendis! Dolores expedita a perferendis.'
    ]
  },
  {
    id: 'category-1',
    title: 'Szumó',
    fileName: 'szumo.doc',
    content: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.',
      'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
      'Sed vestibulum lectus in turpis suscipit, vel aliquet erat imperdiet.',
      'Integer malesuada libero ac lorem scelerisque, vitae vulputate sapien dapibus.'
    ]
  },
  {
    id: 'category-2',
    title: 'Vonalkövetés',
    fileName: 'vonalkovetes.doc',
    content: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris ultricies orci a justo rhoncus, vitae fermentum ligula malesuada.',
      'Cras euismod lacus vitae augue facilisis, nec ultrices nisi feugiat.',
      'Proin volutpat augue quis mauris cursus, nec sed viverra nisl pharetra.',
      'Suspendisse potenti. Donec vitae quam at dolor tincidunt convallis.'
    ]
  },
  {
    id: 'category-3',
    title: 'Kosárra dobás',
    fileName: 'kosarra-dobas.doc',
    content: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Aliquam erat volutpat.',
      'Fusce rutrum est a augue placerat, vitae finibus augue molestie.',
      'Morbi suscipit odio et justo ultricies, eu fermentum enim imperdiet.',
      'Nam congue mi a magna volutpat, eget ultrices magna luctus.'
    ]
  },
  {
    id: 'category-4',
    title: 'Hegymászás',
    fileName: 'hegymaszas.doc',
    content: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur dignissim quam eu feugiat consequat.',
      'Etiam faucibus nisi id libero accumsan, sit amet commodo ipsum tempus.',
      'Quisque pharetra purus ac metu s dignissim, vitae venenatis nibh efficitur.',
      'Aenean eu tellus quis lorem elementum laoreet sed a enim.'
    ]
  }
];

function buildDocumentdoc(section) {
  const bodyContent = section.content.map((item) => `<p>${item}</p>`).join('');

  return `<!DOCTYPE doc>
<doc lang="hu">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${section.title}</title>
    <style>
      @page { size: A4; margin: 0; }
      body {
        margin: 0;
        padding: 0;
        background: #f4f4f4;
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 16mm;
        box-sizing: border-box;
        background: white;
      }
      h1 { font-size: 18pt; margin: 0 0 8mm; }
      h2 { font-size: 14pt; margin: 8mm 0 4mm; }
      p { font-size: 11pt; line-height: 1.5; margin: 0 0 3mm; }
      .meta { font-size: 10pt; color: #555; margin-bottom: 6mm; }
      .footer { margin-top: 10mm; font-size: 9pt; color: #666; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="meta">Lego Robotverseny • Szabályzat</div>
      <h1>${section.title}</h1>
      <p>A szabályok nem ismerete nem mentesít a felelősségtől.</p>
      ${bodyContent}
      <div class="footer">Ez a tartalom A4-es formátumban jelenik meg a weboldalon is, és letöltéskor ugyanilyen elrendezésben kerül mentésre.</div>
    </div>
  </body>
</doc>`;
}

function downloaddocFile(filename, content) {
  const blob = new Blob([content], { type: 'text/doc;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function RulesPage() {
  const [openSectionId, setOpenSectionId] = useState(null);

  const allSections = useMemo(() => ruleSections, []);

  const handleToggle = (sectionId) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  const handleDownloadSection = (section) => {
    downloaddocFile(section.fileName, buildDocumentdoc(section));
  };

  const handleDownloadAll = () => {
    const combined = allSections.map((section) => {
      return `<section><h2>${section.title}</h2>${section.content.map((item) => `<p>${item}</p>`).join('')}</section>`;
    }).join('');

    const fullDocument = `<!DOCTYPE doc>
<doc lang="hu">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Szabályzat – Összes rész</title>
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, Helvetica, sans-serif; color: #111; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; box-sizing: border-box; background: white; }
      h1 { font-size: 18pt; margin: 0 0 8mm; }
      h2 { font-size: 14pt; margin: 8mm 0 4mm; }
      p { font-size: 11pt; line-height: 1.5; margin: 0 0 3mm; }
      .meta { font-size: 10pt; color: #555; margin-bottom: 6mm; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="meta">Lego Robotverseny • Szabályzat</div>
      <h1>Összes szabályzati rész</h1>
      ${combined}
    </div>
  </body>
</doc>`;

    downloaddocFile('szabalyzat-osszes.doc', fullDocument);
  };

  return (
    <main className="rules-page">
      <section className="container py-4 py-md-5">
        <div className="home-panel rules-panel">
          <span className="home-kicker">Szabályzat</span>
          <h1 className="home-title">Versenyszabályzat és részletes feltételek</h1>
          <p className="home-copy">
            Az alábbi részeket egymás után böngészheted, és mindegyikhez külön letöltési lehetőséget is biztosítunk. A tartalom A4-es, nyomtatható formátumra van tervezve.
          </p>

          <div className="rules-actions">
            <button className="btn btn-primary" type="button" onClick={handleDownloadAll}>
              Összes letöltése
            </button>
          </div>

          <div className="rules-list">
            {allSections.map((section) => {
              const isOpen = openSectionId === section.id;

              return (
                <article key={section.id} className="rules-card">
                  <button
                    className="rules-toggle"
                    type="button"
                    onClick={() => handleToggle(section.id)}
                    aria-expanded={isOpen}
                  >
                    <span>{section.title}</span>
                    <span className="rules-toggle-icon">{isOpen ? '▴' : '▾'}</span>
                  </button>

                  <div className={`rules-body ${isOpen ? 'open' : ''}`}>
                    <div className="rules-body-inner">
                      <div className="rules-download-row rules-download-row-top">
                        <button className="btn btn-theme-secondary" type="button" onClick={() => handleDownloadSection(section)}>
                          Szabályzat letöltése
                        </button>
                      </div>
                      <div className="rules-document-preview">
                        <div className="rules-document-meta">Lego Robotverseny • Szabályzat</div>
                        <h3>{section.title}</h3>
                        <p>
                          Ez a tartalom A4-es formátumban jelenik meg a weboldalon is, és letöltéskor ugyanilyen elrendezésben kerül mentésre.
                        </p>
                        <ul className="rules-list-items">
                          {section.content.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <div className="rules-document-footer">A4-es nyomtatási formátum • automatikusan generált dokumentum</div>
                      </div>
                      <div className="rules-download-row rules-download-row-bottom">
                        <button className="btn btn-theme-secondary" type="button" onClick={() => handleDownloadSection(section)}>
                          Szabályzat letöltése
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
