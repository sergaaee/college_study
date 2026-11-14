import React from 'react'
import { BOOKS, weeksOf, STAGES, bookSections } from '../content/index.js'
import { useStore } from '../lib/store.js'
import { href } from '../lib/router.js'
import { mastery } from '../lib/progress.js'
import { openBook } from '../lib/pdfpanel.jsx'
import { inline } from '../lib/rich.jsx'

export default function BookPage({ book }) {
  const s = useStore()
  const B = BOOKS[book]
  const ws = weeksOf(book)
  const sec = bookSections(book)
  return (
    <main className="page wide">
      <div className="lesson-head">
        <div className="crumbs">Книга {book === 'matan' ? 'I' : book === 'linal' ? 'II' : 'III'} · опорный учебник: {B.ref}</div>
        <h1>{B.icon} {B.name}</h1>
        <div className="tagline">{B.sub}</div>
      </div>
      <div className="booklinks">
        <button className="btn" onClick={() => openBook(book, 1, 'оглавление')}>📖 Открыть книгу</button>
        <button className="btn" onClick={() => openBook(book, sec.formulas.start, 'листок формул')}>∑ Листок формул</button>
        <button className="btn" onClick={() => openBook(book, sec.problems.start, 'задачник')}>✏️ Задачник</button>
        <button className="btn" onClick={() => openBook(book, sec.walk.start, 'подробные разборы')}>🔍 Подробные разборы</button>
        <button className="btn" onClick={() => openBook(book, sec.glossary.start, 'глоссарий')}>🔤 Глоссарий</button>
        <a className="btn" href={href('exam/' + book)}>⏱ Пробный экзамен</a>
        <a className="btn" href={href('review?book=' + book)}>🧠 Повторить всё по книге</a>
      </div>
      <div className="week-grid">
        {ws.map(w => {
          const l = s.lessons[w.id]
          const m = mastery(l, w)
          return (
            <a key={w.id} className="card week" href={href(`b/${book}/${w.n}`)}>
              <span className="num">Неделя {w.n}</span>
              <span className="mastery">{m ? m + '%' : ''}</span>
              <h3>{w.title}</h3>
              <div className="muted small">{inline(w.tagline || (w.stub ? 'материал в книге — страницы ' + w.chapter.start + '–' + w.chapter.end : ''), 'tg')}</div>
              <div className="dots">{STAGES.map(st => <i key={st.id} className={l?.stages?.[st.id] ? 'on' : ''} title={st.name} />)}</div>
            </a>
          )
        })}
      </div>
    </main>
  )
}
