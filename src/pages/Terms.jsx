import React, { useMemo, useState } from 'react'
import { BOOKS, BOOK_IDS, weeksOf } from '../content/index.js'

function pick(a, n, exclude) {
  const pool = a.filter(x => x !== exclude)
  const out = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return out
}

function Drill({ all }) {
  const [dir, setDir] = useState('ru-he')
  const [seed, setSeed] = useState(0)
  const [pickd, setPickd] = useState(null)
  const [score, setScore] = useState([0, 0])
  const q = useMemo(() => {
    if (all.length < 5) return null
    const t = all[Math.floor(Math.random() * all.length)]
    const [from, to] = dir.split('-')
    const wrong = pick(all.filter(x => x[to] !== t[to]), 3, t)
    const opts = [...wrong, t].sort(() => Math.random() - 0.5)
    return { t, from, to, opts }
  }, [all, dir, seed])
  if (!q) return null
  const answered = pickd !== null
  const L = { ru: 'ru', en: 'en', he: 'he' }
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="row"><h3 style={{ margin: 0 }}>🎯 Тренажёр терминов</h3><span className="spacer" />
        <div className="segmented">{[['ru-he', 'RU → עב'], ['he-ru', 'עב → RU'], ['en-he', 'EN → עב'], ['he-en', 'עב → EN']].map(([v, l]) => <button key={v} className={dir === v ? 'on' : ''} onClick={() => { setDir(v); setPickd(null) }}>{l}</button>)}</div>
        <span className="muted small">счёт {score[0]}/{score[1]}</span></div>
      <div className={'front ' + (q.from === 'he' ? 'he' : '')} style={{ fontSize: '1.4rem', fontWeight: 700, margin: '14px 0' }}>{q.t[q.from]}</div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {q.opts.map((o, i) => (
          <button key={i} disabled={answered} className={'quiz-opt ' + (q.to === 'he' ? 'he ' : '') + (answered ? (o === q.t ? 'right' : o === pickd ? 'wrong' : '') : '')}
            style={{ margin: 0 }}
            onClick={() => { setPickd(o); setScore(([a, b]) => [a + (o === q.t ? 1 : 0), b + 1]) }}>{o[q.to]}</button>
        ))}
      </div>
      {answered && <div className="row" style={{ marginTop: 10 }}><span className="muted">{q.t.ru} · {q.t.en} · <span className="he">{q.t.he}</span></span><span className="spacer" /><button className="btn primary" onClick={() => { setPickd(null); setSeed(s => s + 1) }}>Дальше ▸</button></div>}
    </div>
  )
}

export default function Terms() {
  const [q, setQ] = useState('')
  const [book, setBook] = useState('all')
  const all = useMemo(() => BOOK_IDS.flatMap(b => weeksOf(b).flatMap(w => w.terms.map(t => ({ ...t, book: b, n: w.n })))), [])
  const rows = all.filter(t => (book === 'all' || t.book === book) && (!q || (t.ru + ' ' + t.en + ' ' + t.he).toLowerCase().includes(q.toLowerCase())))
  return (
    <main className="page wide">
      <div className="lesson-head"><h1>🔤 Термины: русский · English · עברית</h1>
        <div className="tagline">{all.length} терминов из трёх конспектов. Экзамены по линалу и дискре — на иврите, так что иврит надо знать так же, как определения.</div></div>
      <Drill all={book === 'all' ? all : all.filter(t => t.book === book)} />
      <div className="row" style={{ marginBottom: 10 }}>
        <input type="search" placeholder="Поиск на любом языке…" value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 260 }} />
        <div className="tabs" style={{ margin: 0 }}>
          <button className={book === 'all' ? 'on' : ''} onClick={() => setBook('all')}>Все</button>
          {BOOK_IDS.map(b => <button key={b} className={book === b ? 'on' : ''} onClick={() => setBook(b)}>{BOOKS[b].short}</button>)}
        </div>
        <span className="muted small">{rows.length} найдено</span>
      </div>
      <div className="card"><div className="table-wrap">
        <table className="termtable">
          <thead><tr><th>Русский</th><th>English</th><th style={{ textAlign: 'right' }}>עברית</th><th>Где</th></tr></thead>
          <tbody>{rows.slice(0, 400).map((t, i) => <tr key={i}><td>{t.ru}</td><td>{t.en}</td><td className="he">{t.he}</td><td className="muted small">{BOOKS[t.book].short} {t.n}</td></tr>)}</tbody>
        </table>
      </div></div>
    </main>
  )
}
