import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const MACROS = {
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\F': '\\mathbb{F}',
  '\\eps': '\\varepsilon',
  '\\abs': '\\left|#1\\right|',
  '\\ceil': '\\left\\lceil #1\\right\\rceil',
  '\\floor': '\\left\\lfloor #1\\right\\rfloor',
  '\\norm': '\\left\\lVert #1\\right\\rVert',
  '\\ip': '\\left\\langle #1\\right\\rangle',
  '\\Ker': '\\operatorname{Ker}',
  '\\Im': '\\operatorname{Im}',
  '\\Re': '\\operatorname{Re}',
  '\\rk': '\\operatorname{rk}',
  '\\dim': '\\operatorname{dim}',
  '\\span': '\\operatorname{span}',
  '\\tr': '\\operatorname{tr}',
  '\\sgn': '\\operatorname{sgn}',
  '\\lcm': '\\operatorname{lcm}',
}

const cache = new Map()
export function texHtml(src, display = false) {
  const key = (display ? 'D' : 'I') + src
  let h = cache.get(key)
  if (h === undefined) {
    try {
      h = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', macros: { ...MACROS } })
    } catch (e) {
      h = `<span class="tex-err">${src}</span>`
    }
    cache.set(key, h)
  }
  return h
}

/** Формула из JSX: <M>{String.raw`\frac{a}{b}`}</M>  (display — блочная). */
export function M({ children, d = false }) {
  const s = Array.isArray(children) ? children.join('') : String(children ?? '')
  return <span className={d ? 'tex-d' : 'tex-i'} dangerouslySetInnerHTML={{ __html: texHtml(s, d) }} />
}

const INLINE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+?\*\*|(?<![\w*])\*[^*\n]+?\*(?![\w*])|`[^`\n]+`)/g

/** Инлайн-разметка: $формула$, **жирный**, *курсив*, `код`. */
export function inline(text, keyPrefix = 'i') {
  const parts = String(text).split(INLINE)
  return parts.map((p, i) => {
    if (!p) return null
    const k = keyPrefix + i
    if (p.startsWith('$$')) return <M key={k} d>{p.slice(2, -2)}</M>
    if (p.startsWith('$')) return <M key={k}>{p.slice(1, -1)}</M>
    if (p.startsWith('**')) return <strong key={k}>{inline(p.slice(2, -2), k)}</strong>
    if (p.startsWith('`')) return <code key={k}>{p.slice(1, -1)}</code>
    if (p.startsWith('*') && p.length > 2) return <em key={k}>{inline(p.slice(1, -1), k)}</em>
    return <React.Fragment key={k}>{p}</React.Fragment>
  })
}

/** Блоки: абзацы, списки (- / 1.), таблицы (| a | b |), блочные формулы ($$...$$), цитаты (>). */
export function Rich({ children, className = '' }) {
  const src = String(children ?? '').replace(/\r/g, '').trim()
  if (!src) return null
  const lines = src.split('\n')
  const out = []
  let i = 0
  let para = []
  const flush = () => {
    if (para.length) {
      out.push(<p key={out.length}>{inline(para.join(' '), 'p' + out.length)}</p>)
      para = []
    }
  }
  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) { flush(); i++; continue }
    // блочная формула
    if (line.startsWith('$$')) {
      const close = line.indexOf('$$', 2)
      // «$$ формула $$ и дальше текст» — обычный абзац (формула вставится блоком внутри него)
      if (close === -1 || line.slice(close + 2).trim() === '') {
        flush()
        let buf = line
        if (close === -1) {
          i++
          while (i < lines.length && !lines[i].trim().endsWith('$$')) { buf += '\n' + lines[i]; i++ }
          if (i < lines.length) buf += '\n' + lines[i]
        }
        out.push(<div className="tex-block" key={out.length}><M d>{buf.trim().replace(/^\$\$/, '').replace(/\$\$$/, '')}</M></div>)
        i++; continue
      }
    }
    // таблица
    if (line.startsWith('|')) {
      flush()
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++ }
      const cells = rows.filter(r => !/^\|[\s:|-]+\|?$/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
      out.push(
        <div className="table-wrap" key={out.length}>
          <table>
            <thead><tr>{cells[0].map((c, j) => <th key={j}>{inline(c, 'h' + j)}</th>)}</tr></thead>
            <tbody>{cells.slice(1).map((r, a) => <tr key={a}>{r.map((c, b) => <td key={b}>{inline(c, `c${a}_${b}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }
    // маркированный / нумерованный список
    const isUl = /^[-•]\s+/.test(line)
    const isOl = /^\d+[.)]\s+/.test(line)
    if (isUl || isOl) {
      flush()
      const items = []
      while (i < lines.length) {
        const l = lines[i]
        const t = l.trim()
        if (isUl && /^[-•]\s+/.test(t)) items.push(t.replace(/^[-•]\s+/, ''))
        else if (isOl && /^\d+[.)]\s+/.test(t)) items.push(t.replace(/^\d+[.)]\s+/, ''))
        else if (t && /^\s{2,}/.test(l) && items.length) items[items.length - 1] += ' ' + t
        else break
        i++
      }
      const Tag = isUl ? 'ul' : 'ol'
      out.push(<Tag key={out.length}>{items.map((it, j) => <li key={j}>{inline(it, `l${j}`)}</li>)}</Tag>)
      continue
    }
    if (line.startsWith('>')) {
      flush()
      const q = []
      while (i < lines.length && lines[i].trim().startsWith('>')) { q.push(lines[i].trim().replace(/^>\s?/, '')); i++ }
      out.push(<blockquote key={out.length}>{inline(q.join(' '), 'q')}</blockquote>)
      continue
    }
    para.push(line)
    i++
  }
  flush()
  return <div className={'rich ' + className}>{out}</div>
}
