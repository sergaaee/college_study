import React, { useState } from 'react'
import { BOOKS, BOOK_IDS, weeksOf } from '../content/index.js'
import { href } from '../lib/router.js'
import { LabCard } from './LessonParts.jsx'

export default function Labs() {
  const [book, setBook] = useState('all')
  const [open, setOpen] = useState(null)
  const list = BOOK_IDS.filter(b => book === 'all' || b === book).flatMap(b => weeksOf(b).flatMap(w => w.labs.map((l, i) => ({ b, w, l, i }))))
  return (
    <main className="page wide">
      <div className="lesson-head"><h1>🎛 Все лаборатории</h1><div className="tagline">Быстрый доступ к ползункам — без чтения. Хорошо для разминки перед занятием и повторения «на ощупь».</div></div>
      <div className="tabs"><button className={book === 'all' ? 'on' : ''} onClick={() => setBook('all')}>Все</button>
        {BOOK_IDS.map(b => <button key={b} className={book === b ? 'on' : ''} onClick={() => setBook(b)}>{BOOKS[b].short}</button>)}</div>
      {open ? (
        <div data-book={open.b}>
          <div className="row"><button className="btn" onClick={() => setOpen(null)}>◂ ко всем</button><a className="btn ghost" href={href(`b/${open.b}/${open.w.n}`)}>Урок: неделя {open.w.n}</a></div>
          <LabCard lab={open.l} />
        </div>
      ) : (
        <div className="cards" style={{ marginTop: 12 }}>
          {list.map(({ b, w, l, i }) => (
            <button key={b + w.n + i} className="card bookcard" data-book={b} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => setOpen({ b, w, l })}>
              <span className="chip accent">{BOOKS[b].short} · нед. {w.n}</span>
              <b>{l.title}</b>
              <span className="muted small">{w.title}</span>
            </button>
          ))}
          {!list.length && <p className="muted">Лабораторий пока нет.</p>}
        </div>
      )}
    </main>
  )
}
