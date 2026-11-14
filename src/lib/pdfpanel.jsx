import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import bookIndex from '../data/bookIndex.json'

let pdfjsP = null
function loadPdfjs() {
  if (!pdfjsP) {
    pdfjsP = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default
      return lib
    })
  }
  return pdfjsP
}
const docs = new Map()
async function getDoc(book) {
  if (!docs.has(book)) {
    const p = loadPdfjs().then(lib => lib.getDocument({ url: '/' + bookIndex[book].file }).promise)
    docs.set(book, p)
  }
  return docs.get(book)
}

// ---- маленький стор панели
let panel = { open: false, book: 'matan', page: 1, label: '' }
const subs = new Set()
const set = p => { panel = { ...panel, ...p }; subs.forEach(f => f()) }
const usePanel = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => panel)

/** Открыть книгу на странице (номер страницы в PDF). */
export function openBook(book, page, label = '') { set({ open: true, book, page: Math.max(1, page || 1), label }) }
export function closeBook() { set({ open: false }) }

export function BookDrawer() {
  const p = usePanel()
  const canvas = useRef(null)
  const wrap = useRef(null)
  const [total, setTotal] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [state, setState] = useState('idle')
  const task = useRef(null)
  const info = bookIndex[p.book]

  useEffect(() => {
    if (!p.open) return
    let dead = false
    setState('loading')
    ;(async () => {
      try {
        const doc = await getDoc(p.book)
        if (dead) return
        setTotal(doc.numPages)
        const n = Math.min(Math.max(1, p.page), doc.numPages)
        const page = await doc.getPage(n)
        if (dead) return
        const el = canvas.current
        const width = (wrap.current?.clientWidth || 700) - 4
        const base = page.getViewport({ scale: 1 })
        const scale = (width / base.width) * zoom
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
        const vp = page.getViewport({ scale: scale * dpr })
        el.width = Math.floor(vp.width); el.height = Math.floor(vp.height)
        el.style.width = Math.floor(vp.width / dpr) + 'px'
        el.style.height = Math.floor(vp.height / dpr) + 'px'
        task.current?.cancel?.()
        task.current = page.render({ canvas: el, canvasContext: el.getContext('2d'), viewport: vp })
        await task.current.promise
        if (!dead) { setState('ready'); wrap.current?.scrollTo({ top: 0 }) }
      } catch (e) {
        if (!dead && e?.name !== 'RenderingCancelledException') setState('error')
      }
    })()
    return () => { dead = true }
  }, [p.open, p.book, p.page, zoom])

  useEffect(() => {
    if (!p.open) return
    const onKey = e => {
      if (e.target.matches('input,textarea')) return
      if (e.key === 'Escape') closeBook()
      if (e.key === 'ArrowRight') set({ page: Math.min(total || 9999, panel.page + 1) })
      if (e.key === 'ArrowLeft') set({ page: Math.max(1, panel.page - 1) })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p.open, total])

  if (!p.open) return null
  const jump = (name, label) => {
    const s = info.sections[name]
    return s && <button key={name} className="btn tiny" onClick={() => set({ page: s.start })}>{label}</button>
  }
  return (
    <aside className="drawer" role="dialog" aria-label="Книга">
      <header>
        <div className="drawer-title">
          <b>📖 {p.book === 'matan' ? 'Матанализ' : p.book === 'linal' ? 'Линейная алгебра' : 'Дискретная математика'}</b>
          {p.label && <span className="muted"> · {p.label}</span>}
        </div>
        <button className="icon-btn" onClick={closeBook} aria-label="Закрыть">✕</button>
      </header>
      <div className="drawer-bar">
        <button className="btn tiny" onClick={() => set({ page: Math.max(1, p.page - 1) })}>◀</button>
        <input className="page-in" type="number" min="1" max={total || undefined} value={p.page}
          onChange={e => set({ page: Math.max(1, +e.target.value || 1) })} />
        <span className="muted">/ {total || info.pages}</span>
        <button className="btn tiny" onClick={() => set({ page: Math.min(total || 9999, p.page + 1) })}>▶</button>
        <span className="sep" />
        <button className="btn tiny" onClick={() => setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(1)))}>−</button>
        <span className="muted">{Math.round(zoom * 100)}%</span>
        <button className="btn tiny" onClick={() => setZoom(z => Math.min(2.6, +(z + 0.2).toFixed(1)))}>+</button>
        <span className="sep" />
        {jump('formulas', 'Формулы')}{jump('problems', 'Задачник')}{jump('answers', 'Ответы')}{jump('walk', 'Разборы')}{jump('exam', 'Экзамен')}{jump('glossary', 'Глоссарий')}
        <a className="btn tiny" href={`/${info.file}#page=${p.page}`} target="_blank" rel="noreferrer">↗ вкладка</a>
      </div>
      <div className="drawer-body" ref={wrap}>
        {state === 'loading' && <div className="drawer-msg">Загружаю страницу…</div>}
        {state === 'error' && <div className="drawer-msg">Не удалось открыть PDF. Проверьте, что файл {info.file} лежит в корне проекта.</div>}
        <canvas ref={canvas} style={{ opacity: state === 'ready' ? 1 : 0.25 }} />
      </div>
    </aside>
  )
}
