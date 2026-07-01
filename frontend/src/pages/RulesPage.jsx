import React, { useMemo, useState } from 'react';

const ruleSections = [
  {
    id: 'general',
    title: 'Általános szabályok',
    fileName: 'altalanos-szabalyok.doc',
    content: [
      'A verseny lebonyolítása',
      'A robot versenyre 2 fős csapatokkal lehet, középiskolás diákoknak jelentkezni egy, maximum 2 felkészítő tanárral.',
      'A versenyzőknek a saját robotjukkal kell a feladatokat az előre megírt szabályok alapján megoldaniuk. A szabályzat nem ismerete nem ment fel semmilyen szabálytalanság alól.',
      'A helyszínen a csapatok kapnak saját asztalt, amin dolgozhatnak és a felszerelésüket tárolhatják. A nap elejétől minden csapat meg tudja tekinteni saját beosztását a weboldalunkon, a regisztrált fiókkal bejelentkezve. Ha a csapat nem tudja tartani az adott időbeosztást és nem jelenik meg időben az adott versenyszámnál, akkor automatikusan 0 pontot kapnak, és nem lesz lehetőségük javítani azon.',
      'A robot',
      'A robotok kizárólag hivatalos Lego által gyártott, Lego alkatrészekből épülhetnek. A robot mérete maximum 40x40x40 centiméter lehet. A méretek ellenőrzése minden versenyszám előtt le fog zajlani, és bele lesznek helyezve egy megfelelő méretű, felülről nyitott kockába. Ez azért szükséges, mert a versenyzők a versenyszámok között átépíthetik, módosíthatják robotjaikat. Amennyiben a robot meghaladja az előírt méreteket, módosítani kell ott a versenyszám helyszínén, amennyiben ez nem történik meg, a versenyző nem ér el pontot az adott versenyszámban, és automatikusan 0 pontot kap.',
      'A versenyszámok',
      'Minden évben egy Joker versenyszám van, ami véletlenszerűen van kiválasztva, és a jelentkezés megnyitásakor derül ki, hogy mik a végleges versenyszámok.',
      'A versenyszámok alatt a versenyző az adott feladatszabályoknak megfelelően nyúlhat hozzá a robothoz. A versenyszámok alatt nincs videóbíró.'
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

function isHeadingLike(value) {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    return false;
  }

  if (/[.!?]$/.test(text)) {
    return false;
  }

  if (text.length > 40) {
    return false;
  }

  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= 6;
}

function buildContentHtml(content) {
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(`<ul style="margin: 0 0 3mm; padding-left: 5mm;">${listItems.join('')}</ul>`);
    listItems = [];
  };

  content.forEach((item) => {
    if (typeof item === 'string') {
      const text = item.trim();

      if (isHeadingLike(text)) {
        flushList();
        blocks.push(`<p style="font-size: 13pt; font-weight: 700; margin: 6mm 0 2mm;">${text}</p>`);
        return;
      }

      listItems.push(`<li style="font-size: 11pt; line-height: 1.5; margin: 0 0 2mm;">${text}</li>`);
      return;
    }

    flushList();
    const paragraphs = Array.isArray(item.text) ? item.text : [item.text];
    const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');

    blocks.push(`<h3 style="font-size: 13pt; font-weight: 700; margin: 6mm 0 2mm;">${item.title}</h3>${body}`);
  });

  flushList();
  return blocks.join('');
}

function renderContentItems(content, sectionId) {
  const elements = [];
  let listItems = [];
  let listCounter = 0;

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <ul key={`${sectionId}-list-${listCounter}`} className="ps-3 mb-3">
        {listItems}
      </ul>
    );
    listItems = [];
    listCounter += 1;
  };

  content.forEach((item, index) => {
    if (typeof item === 'string') {
      const text = item.trim();

      if (isHeadingLike(text)) {
        flushList();
        elements.push(
          <p key={`${sectionId}-heading-${index}`} className="fw-bold fs-5 mt-3 mb-2">
            {text}
          </p>
        );
        return;
      }

      listItems.push(
        <li key={`${sectionId}-item-${index}`} className="mb-2">
          {text}
        </li>
      );
      return;
    }

    flushList();
    const paragraphs = Array.isArray(item.text) ? item.text : [item.text];

    elements.push(
      <div key={`${sectionId}-object-${index}`} className="mb-3">
        <p className="fw-bold fs-5 mb-2">{item.title}</p>
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p key={`${sectionId}-object-${index}-${paragraphIndex}`} className="mb-2">
            {paragraph}
          </p>
        ))}
      </div>
    );
  });

  flushList();
  return elements;
}

function buildDocumentdoc(section) {
  const bodyContent = buildContentHtml(section.content);

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
      return `<section><h2>${section.title}</h2>${buildContentHtml(section.content)}</section>`;
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
                  <div className="rules-toggle-row">
                    <button
                      className="rules-toggle"
                      type="button"
                      onClick={() => handleToggle(section.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{section.title}</span>
                      <span className="rules-toggle-icon">{isOpen ? '▴' : '▾'}</span>
                    </button>
                    <button className="btn btn-theme-secondary rules-header-download" type="button" onClick={() => handleDownloadSection(section)}>
                      Letöltés
                    </button>
                  </div>

                  <div className={`rules-body ${isOpen ? 'open' : ''}`}>
                    <div className="rules-body-inner">

                      <div className="rules-document-preview">
                        <div className="rules-document-meta">Lego Robotverseny • Szabályzat</div>
                        <h3>{section.title}</h3>
                        <p>
                          Ez a tartalom A4-es formátumban jelenik meg a weboldalon is, és letöltéskor ugyanilyen elrendezésben kerül mentésre.
                        </p>
                        <div className="rules-list-items">
                          {renderContentItems(section.content, section.id)}
                        </div>
                        <div className="rules-document-footer">A4-es nyomtatási formátum • automatikusan generált dokumentum</div>
                      </div>
                      <div className="rules-download-row rules-download-row-bottom">
                        <button className="btn btn-theme-secondary" type="button" onClick={() => handleDownloadSection(section)}>
                          Letöltés
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
