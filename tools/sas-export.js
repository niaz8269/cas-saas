/**
 * Export the Chinese universities and programs from the SAS site
 * (https://sas.cas.moe) into the JSON file the catalog seeder imports.
 *
 * How to run:
 *   1. Open https://sas.cas.moe/universities in Chrome.
 *   2. Open DevTools (F12) -> Console, paste this whole file, press Enter.
 *   3. Wait for "SAS export finished" (about 25 minutes for ~300 universities;
 *      it fetches one page at a time with short pauses).
 *   4. Run `window.__sas.download()` — it saves sas_china_universities.json.
 *      (If Chrome blocks the download, click "Allow" for the site and run it again.)
 *   5. Replace backend/database/data/sas_china_universities.json with that file,
 *      then: docker compose -f docker/compose.yml exec app php artisan db:seed --class=SasCatalogSeeder
 *
 * The export only reads public pages from the same site. Progress is available
 * in `window.__sas.prog`. Universities outside China are skipped.
 */
(() => {
  const S = (window.__sas = { results: [], prog: { phase: 'list', done: 0, total: 0, errors: [], aborted: null, finished: false, last: '' } })

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '')

  S.parsePage = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style').forEach((e) => e.remove())
    const main = doc.querySelector('main') || doc.body
    const out = { name: text(main.querySelector('h1')) }

    const h1 = main.querySelector('h1')
    out.header = text(h1 && h1.parentElement).slice(0, 300)

    // Program rows: [name, name_zh, csc_listed, level, language, years, tuition]
    const table = [...main.querySelectorAll('table')].find(
      (t) => /Programme/.test(t.textContent) && /Tuition/.test(t.textContent) && /Level/.test(t.textContent),
    )
    out.rows = []
    if (table) {
      for (const tr of table.querySelectorAll('tr')) {
        const td = [...tr.children]
        if (td.length < 5 || td[0].tagName === 'TH') continue
        const cell = text(td[0])
        const csc = /CSC listed/.test(cell)
        const cleaned = cell.replace('\u2605', '').replace('CSC listed', '').trim()
        const zhMatch = cleaned.match(/[\u3400-\u9fff][\u3400-\u9fff\s()\uff08\uff09\u3001\uff0c\u00b7\-A-Za-z0-9]*$/)
        const zh = zhMatch ? zhMatch[0].trim() : ''
        const en = zh ? cleaned.slice(0, cleaned.length - zh.length).trim() : cleaned
        out.rows.push([en, zh, csc ? 1 : 0, text(td[1]), text(td[2]), text(td[3]), text(td[4]).replace(/[^0-9.]/g, '')])
      }
    }

    // Curated guide section (fees, scholarships, documents, recognition...), when the page has one.
    const section = [...main.querySelectorAll('section')].find(
      (s) => /Studying|Study /.test(text(s.querySelector('h2'))) && s.querySelector('h3'),
    )
    out.editorial = null
    if (section) {
      const blocks = []
      let cur = null
      section.querySelectorAll('h2,h3,h4,p,li,table').forEach((e) => {
        if (e.closest('table') && e.tagName !== 'TABLE') return
        if (/^H[234]$/.test(e.tagName)) {
          cur = { h: text(e), t: [] }
          blocks.push(cur)
        } else {
          if (!cur) blocks.push((cur = { h: '', t: [] }))
          if (e.tagName === 'TABLE') {
            cur.t.push('TABLE: ' + [...e.querySelectorAll('tr')].map((tr) => [...tr.children].map(text).join(' | ')).join(' // '))
          } else if (text(e)) {
            cur.t.push(text(e))
          }
        }
      })
      const links = [...section.querySelectorAll('a[href]')]
        .map((a) => [text(a).slice(0, 60), a.getAttribute('href')])
        .filter((x) => /^https?:/.test(x[1]) && !/sas\.cas\.moe/.test(x[1]))
      out.editorial = { blocks, links }
    }

    out.pages = Math.max(1, ...[...main.querySelectorAll('a[href*="page="]')].map((a) => +((a.getAttribute('href').match(/page=(\d+)/) || [])[1] || 1)))
    out.total = +((main.textContent.match(/of\s*(\d+)\s*results/) || [])[1] || out.rows.length)
    out.levels = main.textContent.replace(/\s+/g, ' ').match(/Bachelor:\s*\d+|Master's:\s*\d+|Doctorate:\s*\d+|Non-degree:\s*\d+/g)

    return out
  }

  S.download = () => {
    const blob = new Blob([JSON.stringify({ fetched: new Date().toISOString(), universities: S.results })], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sas_china_universities.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const get = async (url) => {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(url)
      if (r.status === 200) return r.text()
      if (r.status === 429 || r.status >= 500) {
        await sleep(30000 * (i + 1)) // back off when the server pushes back
        continue
      }
      throw new Error('HTTP ' + r.status + ' ' + url)
    }
    throw new Error('gave up ' + url)
  }

  ;(async () => {
    try {
      const foreign = /Lombardy|Dubai|England|Leinster|Preston|Milan|Abu Dhabi/i
      const unis = []
      for (let p = 1; p < 60; p++) {
        const doc = new DOMParser().parseFromString(await get('/universities?page=' + p), 'text/html')
        const slugs = [...new Set([...doc.querySelectorAll('a[href*="/universities/"]')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => /\/universities\/[a-z0-9-]+$/.test(h))
          .map((h) => h.split('/').pop()))]
        const fresh = slugs.filter((s) => !unis.includes(s))
        if (!fresh.length) break
        unis.push(...fresh)
        await sleep(200)
      }
      S.prog.total = unis.length
      S.prog.phase = 'universities'

      for (const slug of unis) {
        const first = S.parsePage(await get('/universities/' + slug))
        if (foreign.test(first.header)) {
          S.prog.done++
          continue
        }
        const rows = [...first.rows]
        for (let p = 2; p <= first.pages; p++) {
          await sleep(200)
          rows.push(...S.parsePage(await get('/universities/' + slug + '?page=' + p)).rows)
        }
        const location = (first.header.match(/Location(.*?)Programmes/) || [])[1] || ''
        S.results.push({ slug, url: 'https://sas.cas.moe/universities/' + slug, name: first.name, header: first.header, location, total: first.total, levels: first.levels, rows, editorial: first.editorial })
        if (rows.length !== first.total) S.prog.errors.push(slug + ' rows ' + rows.length + ' of ' + first.total)
        S.prog.done++
        S.prog.last = slug
        await sleep(200)
      }
      S.prog.finished = true
      console.log('SAS export finished:', S.results.length, 'universities. Run window.__sas.download()')
    } catch (e) {
      S.prog.aborted = String(e) + ' at ' + S.prog.last
      console.error('SAS export stopped:', S.prog.aborted)
    }
  })()
})()
