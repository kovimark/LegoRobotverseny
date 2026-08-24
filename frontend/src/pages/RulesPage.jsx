  import React, { useEffect, useMemo, useState } from 'react'

  const publicImage = (fileName) => `${process.env.PUBLIC_URL}/Images/${fileName}`
  const HANDBOOK_TEXT_URL = `${process.env.PUBLIC_URL}/handbook-2026.txt`

  const handbookSections = [
    { id: 'intro', title: 'Általános tudnivalók', start: 'Versenyzői kézikönyv', end: 'Hegymászás' },
    { id: 'hill-climb', title: 'Hegymászás', start: 'Hegymászás', end: 'Kosárra dobás' },
    { id: 'basketball', title: 'Kosárra dobás', start: 'Kosárra dobás', end: 'Vonalkövetés' },
    { id: 'line-following', title: 'Vonalkövetés', start: 'Vonalkövetés', end: 'Szumó' },
    { id: 'sumo', title: 'Szumó', start: 'Szumó', end: 'Egyéb fontos tudnivalók a naphoz' },
    { id: 'extra', title: 'Egyéb fontos tudnivalók', start: 'Egyéb fontos tudnivalók a naphoz', end: null }
  ]

  const subsectionMarkersBySection = {
    intro: [
      'Versenyzői kézikönyv',
      '2026',
      'A 4 aranyszabalyod:',
      'Nevezés a versenyre:',
      'Versenyzői felület használata:',
      'Jogok és Kötelességek',
      'Az Óvás Protokollja',
      'Hogyan próbálkozhatsz a versenyszámoknál',
      'Versenyszámok szabályai'
    ],
    'hill-climb': [
      'Hegymászás',
      'A feladatod:',
      'A próbálkozás menete:',
      'Mire figyelj nagyon?'
    ],
    basketball: [
      'Kosárra dobás',
      'A feladatod:',
      'A próbálkozás menete:',
      'Mire figyelj nagyon? (Az érvényes dobás feltételei):'
    ],
    'line-following': [
      'Vonalkövetés',
      'A feladatod:',
      'A próbálkozás menete:',
      'Mire figyelj nagyon? (A sárga pöttyök szabálya):'
    ],
    sumo: [
      'Szumó',
      'A feladatod:',
      'A mérkőzés menete:',
      'Mire figyelj nagyon?'
    ],
    extra: [
      'Egyéb fontos tudnivalók a naphoz',
      'Rekordok Ládája:',
      'Tombola:'
    ]
  }

  const sectionImages = {
    sumo: {
      type: 'image',
      title: 'A szumópálya',
      src: publicImage('SzumoPalya.png'),
      alt: 'A szumópálya ábrája'
    },
    'line-following': {
      type: 'image',
      title: 'A vonalkövető pálya',
      src: publicImage('vonalkovetesWeboldalnezet.png'),
      alt: 'A vonalkövető pálya ábrája'
    },
    basketball: {
      type: 'image',
      title: 'A kosárra dobás pályája',
      src: publicImage('kosarradobas.png'),
      alt: 'A kosárra dobás pályájának ábrája'
    }
  }

  const decodeEntities = (text) => text
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&ldquo;', '"')
    .replaceAll('&rdquo;', '"')
    .replaceAll('&bdquo;', '"')
    .replaceAll('&amp;', '&')

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const normalizeWhitespace = (text) => text
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/\t+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const normalizeHandbookText = (text) => {
    let normalized = decodeEntities(text)
    normalized = normalized.replace('Versenyzői kézikönyv2026', 'Versenyzői kézikönyv\n2026')
    normalized = normalizeWhitespace(normalized)
    return normalized
  }

  const insertMarkerBreaks = (text, markers) => {
    let nextText = text

    markers.forEach((marker) => {
      const pattern = new RegExp(`\\s*${escapeRegExp(marker)}\\s*`, 'g')
      nextText = nextText.replace(pattern, `\n${marker}\n`)
    })

    return nextText
      .replace(/([.!?])([A-ZÁÉÍÓÖŐÚÜŰ][^.!?\n]{1,80}:)/g, '$1\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const splitParagraphs = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    const blocks = []
    let currentBlock = null

    const pushBlock = () => {
      if (currentBlock && currentBlock.items.length > 0) {
        blocks.push(currentBlock)
      }
      currentBlock = null
    }

    const isOrdered = (line) => /^\d+\.\s/.test(line)
    const isUnordered = (line) => /^[•●▪▫○◦‣⁃\-*+]\s/.test(line)

    lines.forEach(line => {
      if (isOrdered(line)) {
        if (!currentBlock || currentBlock.type !== 'ordered') {
          pushBlock()
          currentBlock = { type: 'ordered', items: [] }
        }
        currentBlock.items.push(line.replace(/^\d+\.\s/, ''))
      } else if (isUnordered(line)) {
        if (!currentBlock || currentBlock.type !== 'unordered') {
          pushBlock()
          currentBlock = { type: 'unordered', items: [] }
        }
        currentBlock.items.push(line.replace(/^[•●▪▫○◦‣⁃\-*+]\s/, ''))
      } else {
        // Sima bekezdés: ha már van aktuális blokk, és az nem paragraph, akkor lezárjuk
        if (currentBlock && currentBlock.type !== 'paragraph') {
          pushBlock()
        }
        if (!currentBlock) {
          currentBlock = { type: 'paragraph', items: [] }
        }
        currentBlock.items.push(line)
      }
    })
    pushBlock()

    return blocks
  }

  const buildSectionContent = (sectionId, text, fallbackTitle) => {
    const markedText = insertMarkerBreaks(text, subsectionMarkersBySection[sectionId] || [])
    const lines = markedText.split('\n').map((line) => line.trim()).filter(Boolean)
    const content = []
    let currentItem = { title: fallbackTitle, lines: [] }

    const pushCurrentItem = () => {
      if (currentItem.lines.length === 0) {
        return
      }

      content.push({
        ...currentItem,
        blocks: splitParagraphs(currentItem.lines.join('\n'))
      })
    }

    lines.forEach((line) => {
      if ((subsectionMarkersBySection[sectionId] || []).includes(line)) {
        pushCurrentItem()
        currentItem = { title: line.replace(/:$/, ''), lines: [] }
        return
      }

      currentItem.lines.push(line)
    })

    pushCurrentItem()

    const image = sectionImages[sectionId]
    if (!image) {
      return content
    }

    return content.length > 1
      ? [content[0], image, ...content.slice(1)]
      : [...content, image]
  }

  const parseSections = (rawText) => {
    const text = normalizeHandbookText(rawText)

    return handbookSections.map((section) => {
      const startIndex = text.indexOf(section.start)
      if (startIndex < 0) {
        return null
      }

      const endIndex = section.end ? text.indexOf(section.end, startIndex + section.start.length) : text.length
      const sectionText = text.slice(startIndex, endIndex < 0 ? text.length : endIndex).trim()

      return {
        id: section.id,
        title: section.title,
        content: buildSectionContent(section.id, sectionText, section.title)
      }
    }).filter(Boolean)
  }

  function renderContentItems(content, sectionId, onImageClick) {
    return content.map((item, index) => {
      const key = `${sectionId}-${index}`
      const subsectionId = `rules-subsection-${sectionId}-${index}`

      if (item.type === 'image') {
        return (
          <div key={key} id={subsectionId} data-rules-section-id={sectionId} className="mb-4 rules-subsection">
            <p className="fw-bold fs-5 mb-2">{item.title}</p>
            <div className="rules-image-preview border rounded p-2 bg-light">
              <button
                type="button"
                onClick={() => onImageClick(item)}
                title="Kép megnyitása teljes méretben"
                aria-label={`${item.title} megnyitása teljes méretben`}
                className="rules-image-button"
              >
                <img src={item.src} alt={item.alt || ''} className="img-fluid d-block mx-auto" />
              </button>
            </div>
            <p className="small text-muted fst-italic mt-2 mb-0">
              Kattints a képre a teljes méretű megtekintéshez.
            </p>
          </div>
        )
      }

      return (
        <div key={key} id={subsectionId} data-rules-section-id={sectionId} className="mb-3 rules-subsection">
          <p className="fw-bold fs-5 mb-2">{item.title}</p>
          {item.blocks.map((block, blockIndex) => {
            if (block.type === 'paragraph') {
              return block.items.map((paragraph, paraIndex) => (
                <p key={`${key}-${blockIndex}-${paraIndex}`} className="mb-2">{paragraph}</p>
              ))
            } else if (block.type === 'ordered') {
              return (
                <ol key={`${key}-${blockIndex}`} className="mb-2">
                  {block.items.map((listItem, listIndex) => (
                    <li key={`${key}-${blockIndex}-${listIndex}`}>{listItem}</li>
                  ))}
                </ol>
              )
            } else if (block.type === 'unordered') {
              return (
                <ul key={`${key}-${blockIndex}`} className="mb-2">
                  {block.items.map((listItem, listIndex) => (
                    <li key={`${key}-${blockIndex}-${listIndex}`}>{listItem}</li>
                  ))}
                </ul>
              )
            }
            return null
          })}
        </div>
      )
    })
  }

  export default function RulesPage() {
    const [handbookText, setHandbookText] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeSectionId, setActiveSectionId] = useState('')
    const [activeSubsectionId, setActiveSubsectionId] = useState('')
    const [expandedTocSections, setExpandedTocSections] = useState(() => new Set())
    const [mobileTocOpen, setMobileTocOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)

    const allSections = useMemo(() => (
      handbookText ? parseSections(handbookText) : []
    ), [handbookText])

    useEffect(() => {
      let cancelled = false

      const loadHandbook = async () => {
        try {
          setLoading(true)
          setError('')

          const response = await fetch(HANDBOOK_TEXT_URL, { headers: { accept: 'text/plain,*/*' } })
          if (!response.ok) {
            throw new Error('A versenyzői kézikönyv betöltése nem sikerült.')
          }

          const nextText = await response.text()
          if (!cancelled) {
            setHandbookText(nextText)
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(loadError.message || 'A versenyzői kézikönyv betöltése nem sikerült.')
            setHandbookText('')
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

      loadHandbook()

      return () => {
        cancelled = true
      }
    }, [])

    useEffect(() => {
      if (allSections.length === 0) {
        setActiveSectionId('')
        setActiveSubsectionId('')
        setExpandedTocSections(new Set())
        return
      }

      setActiveSectionId((current) => (
        allSections.some((section) => section.id === current) ? current : allSections[0].id
      ))

      setExpandedTocSections((current) => {
        const validIds = new Set(allSections.map((section) => section.id))
        const next = new Set([...current].filter((sectionId) => validIds.has(sectionId)))
        if (next.size === 0) {
          next.add(allSections[0].id)
        }
        return next
      })
    }, [allSections])

    useEffect(() => {
      if (allSections.length === 0) {
        return undefined
      }

      let animationFrame = null
      const updateActiveSection = () => {
        animationFrame = null
        const sections = allSections
          .map((section) => document.getElementById(`rules-section-${section.id}`))
          .filter(Boolean)

        if (sections.length === 0) {
          return
        }

        const readingLine = Math.min(220, window.innerHeight * 0.28)
        let activeSection = sections[0]
        sections.forEach((section) => {
          if (section.getBoundingClientRect().top <= readingLine) {
            activeSection = section
          }
        })

        setActiveSectionId(activeSection.dataset.rulesSectionId || allSections[0].id)

        const activeSectionIdValue = activeSection.dataset.rulesSectionId || allSections[0].id
        const subsections = [...document.querySelectorAll(`.rules-subsection[data-rules-section-id="${activeSectionIdValue}"]`)]
        let activeSubsection = null
        subsections.forEach((subsection) => {
          if (subsection.getBoundingClientRect().top <= readingLine) {
            activeSubsection = subsection
          }
        })
        setActiveSubsectionId(activeSubsection?.id || '')
      }

      const handleScroll = () => {
        if (animationFrame === null) {
          animationFrame = window.requestAnimationFrame(updateActiveSection)
        }
      }

      updateActiveSection()
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleScroll)

      return () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame)
        }
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener('resize', handleScroll)
      }
    }, [allSections])

    useEffect(() => {
      if (!selectedImage) {
        return undefined
      }

      const previousOverflow = document.body.style.overflow
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          setSelectedImage(null)
        }
      }

      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = previousOverflow
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [selectedImage])

    const goToSection = (sectionId) => {
      setActiveSectionId(sectionId)
      setExpandedTocSections((current) => new Set(current).add(sectionId))
      document.getElementById(`rules-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const goToSubsection = (sectionId, subsectionIndex) => {
      setActiveSectionId(sectionId)
      const subsectionId = `rules-subsection-${sectionId}-${subsectionIndex}`
      setActiveSubsectionId(subsectionId)
      document.getElementById(subsectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const toggleTocSection = (sectionId) => {
      setExpandedTocSections((current) => {
        const next = new Set(current)
        if (next.has(sectionId)) {
          next.delete(sectionId)
        } else {
          next.add(sectionId)
        }
        return next
      })
    }

    const activeSection = allSections.find((section) => section.id === activeSectionId) || allSections[0]
    const activeSubsectionPrefix = activeSection ? `rules-subsection-${activeSection.id}-` : ''
    const activeSubsectionIndex = activeSubsectionId.startsWith(activeSubsectionPrefix)
      ? Number(activeSubsectionId.slice(activeSubsectionPrefix.length))
      : -1
    const activeSubsection = activeSection?.content?.[activeSubsectionIndex] || null

    return (
      <main className="rules-page">
        <section className="container py-4 py-md-5">
          <div className="home-panel rules-panel">
            <span className="home-kicker">2026</span>
            <h1 className="home-title">Versenyzői kézikönyv</h1>

            {loading && <div className="alert alert-secondary">Kézikönyv betöltése...</div>}
            {!loading && error && <div className="alert alert-danger">{error}</div>}

            {allSections.length > 0 && (
              <div className="rules-reading-layout">
                <nav className="rules-toc" aria-label="Versenyzői kézikönyv tartalomjegyzéke">
                  <div className="rules-toc-heading">
                    <div className="rules-toc-title"><i className="bi bi-list-ul" />Tartalomjegyzék</div>
                    <button
                      type="button"
                      className="rules-toc-mobile-toggle"
                      aria-expanded={mobileTocOpen}
                      onClick={() => setMobileTocOpen((open) => !open)}
                    >
                      <span className="rules-toc-mobile-label">
                        <strong>{mobileTocOpen ? 'Tartalomjegyzék bezárása' : 'Teljes tartalomjegyzék megnyitása'}</strong>
                        <small>Most: {activeSubsection?.title || activeSection?.title || 'Versenyzői kézikönyv'}</small>
                      </span>
                      <i className={`bi bi-chevron-${mobileTocOpen ? 'up' : 'down'}`} />
                    </button>
                  </div>

                  <div className={`rules-toc-content ${mobileTocOpen ? 'open' : ''}`}>
                    <div className="rules-toc-content-inner">
                      <div className="rules-toc-current" aria-live="polite">
                        <span>Most ezt olvasod</span>
                        <strong>{activeSubsection?.title || activeSection?.title || 'Versenyzői kézikönyv'}</strong>
                      </div>

                      <div className="rules-toc-items">
                        {allSections.map((section, index) => {
                          const expanded = expandedTocSections.has(section.id)
                          return (
                            <div className={`rules-toc-group ${activeSectionId === section.id ? 'active' : ''}`} key={section.id}>
                              <div className="rules-toc-group-row">
                                <button
                                  type="button"
                                  data-rules-toc-section={section.id}
                                  className={`rules-toc-link ${activeSectionId === section.id ? 'active' : ''}`}
                                  aria-current={activeSectionId === section.id ? 'location' : undefined}
                                  onClick={() => goToSection(section.id)}
                                >
                                  <span>{index + 1}</span>
                                  {section.title}
                                </button>
                                <button
                                  type="button"
                                  className="rules-toc-expand"
                                  aria-expanded={expanded}
                                  aria-label={`${section.title} alcímeinek ${expanded ? 'összecsukása' : 'lenyitása'}`}
                                  onClick={() => toggleTocSection(section.id)}
                                >
                                  <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} />
                                </button>
                              </div>

                              <div className={`rules-toc-submenu ${expanded ? 'open' : ''}`}>
                                <div className="rules-toc-submenu-inner">
                                  {section.content.map((item, subsectionIndex) => {
                                    const subsectionId = `rules-subsection-${section.id}-${subsectionIndex}`
                                    return (
                                      <button
                                        data-rules-toc-subsection={subsectionId}
                                        className={activeSubsectionId === subsectionId ? 'active' : ''}
                                        aria-current={activeSubsectionId === subsectionId ? 'location' : undefined}
                                        key={subsectionId}
                                        type="button"
                                        onClick={() => goToSubsection(section.id, subsectionIndex)}
                                      >
                                        {item.title}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </nav>

                <div className="rules-list">
                  {allSections.map((section) => (
                    <article
                      key={section.id}
                      id={`rules-section-${section.id}`}
                      data-rules-section-id={section.id}
                      className={`rules-card rules-readable-section ${activeSectionId === section.id ? 'is-reading' : ''}`}
                    >
                      <div className="rules-section-header">
                        <h2>{section.title}</h2>
                      </div>

                      <div className="rules-body open">
                        <div className="rules-body-inner">
                          <div className="rules-document-preview">
                            <div className="rules-document-meta">Brickathlon • Versenyzői kézikönyv</div>
                            <h3>{section.title}</h3>
                            <div className="rules-list-items">
                              {renderContentItems(section.content, section.id, setSelectedImage)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {selectedImage && (
          <>
            <div
              className="modal d-block rules-image-modal"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rules-image-modal-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedImage(null)
                }
              }}
            >
              <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h2 className="modal-title fs-5" id="rules-image-modal-title">{selectedImage.title}</h2>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Bezárás"
                      onClick={() => setSelectedImage(null)}
                    />
                  </div>
                  <div className="modal-body">
                    <img src={selectedImage.src} alt={selectedImage.alt || ''} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop show" />
          </>
        )}
      </main>
    )
  }