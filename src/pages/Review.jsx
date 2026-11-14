import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Rich, inline } from '../lib/rich.jsx'
import { useStore, getState } from '../lib/store.js'
import { grade, isDue, INTERVALS, addToSrs } from '../lib/srs.js'
import { findItem, getWeek, srsItemsOfWeek, BOOKS, BOOK_IDS } from '../content/index.js'
import { href } from '../lib/router.js'

function buildQueue(query) {
  const st = getState()
  let items = []
  if (query.week) {
    const [book, n] = query.week.split('-')
    const w = getWeek(book, +n)
    items = w ? srsItemsOfWeek(w) : []
  } else {
    items = Object.entries(st.srs).filter(([, it]) => isDue(it)).map(([id]) => findItem(id)).filter(Boolean)
    if (query.book) items = items.filter(i => i.week.book === query.book)
  }
  // перемешиваем (чередование тем и книг)
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[items[i], items[j]] = [items[j], items[i]] }
  return items
}

function Face({ item, flipped }) {
  const { type, data } = item
  if (type === 'card') return (
    <>
      <div className="front"><Rich>{data.f}</Rich></div>
      {flipped && <div className="back"><Rich>{data.b}</Rich></div>}
    </>
  )
  if (type === 'term') {
    const mode = (getState().srs[item.id]?.n || 0) % 3
    const sides = [['ru', 'en', 'he'], ['he', 'ru', 'en'], ['en', 'ru', 'he']][mode]
    const show = k => <span className={k === 'he' ? 'he hebrew' : ''}>{data[k]}</span>
    return (
      <>
        <div className="front">{show(sides[0])}</div>
        <div className="muted small">{{ ru: 'по-русски', en: 'in English', he: 'בעברית' }[sides[0]]} → как сказать на других языках?</div>
        {flipped && <div className="back"><div>{show(sides[1])}</div><div style={{ marginTop: 6 }}>{show(sides[2])}</div></div>}
      </>
    )
  }
  if (type === 'task') return (
    <>
      <div className="front" style={{ fontSize: '1.05rem', fontWeight: 600 }}><Rich>{data.q}</Rich></div>
      {flipped && <div className="back" style={{ textAlign: 'left' }}><b>Ответ.</b> <Rich>{data.ans}</Rich><b>Решение.</b> <Rich>{data.sol}</Rich></div>}
    </>
  )
  // quiz
  return (
    <>
      <div className="front" style={{ fontSize: '1.05rem', fontWeight: 600 }}><Rich>{data.q}</Rich></div>
      {flipped && <div className="back"><div><b>Верно:</b> {inline(data.opts[data.ok], 'ok')}</div><div className="muted" style={{ marginTop: 6 }}>{inline(data.why || '', 'why')}</div></div>}
    </>
  )
}

export default function Review({ query }) {
  const key = JSON.stringify(query)
  const [queue, setQueue] = useState(() => buildQueue(query))
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  useStore(s => s.srs) // обновление счётчиков
  useEffect(() => { setQueue(buildQueue(query)); setI(0); setFlipped(false); setStats({ again: 0, hard: 0, good: 0, easy: 0 }) }, [key])
  const item = queue[i]

  const rate = useCallback(g => {
    if (!item) return
    if (!getState().srs[item.id]) addToSrs(item.id, 0)
    grade(item.id, g)
    setStats(s => ({ ...s, [g]: s[g] + 1 }))
    if (g === 'again') setQueue(q => [...q, item])
    setI(x => x + 1); setFlipped(false)
  }, [item])

  useEffect(() => {
    const onKey = e => {
      if (e.target.matches('input,textarea')) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(true) }
      if (flipped) {
        const g = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }[e.key]
        if (g) rate(g)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, rate])

  const total = useStore(s => Object.keys(s.srs).length)
  const nextDue = useStore(s => { const t = Object.values(s.srs).map(x => x.due).filter(d => d > Date.now()); return t.length ? Math.min(...t) : null })

  const title = query.week ? `Карточки недели ${query.week.split('-')[1]} · ${BOOKS[query.week.split('-')[0]].short}` : query.book ? `Повторение · ${BOOKS[query.book].name}` : 'Повторение'
  return (
    <main className="page">
      <div className="lesson-head">
        <h1>🧠 {title}</h1>
        <div className="tagline">Сначала вспомните ответ — потом переверните. Оценка определяет, когда карточка вернётся.</div>
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={!query.book && !query.week ? 'on' : ''} onClick={() => (window.location.hash = '#/review')}>Всё</button>
          {BOOK_IDS.map(b => <button key={b} className={query.book === b ? 'on' : ''} onClick={() => (window.location.hash = '#/review?book=' + b)}>{BOOKS[b].short}</button>)}
        </div>
        <span className="spacer" />
        <span className="muted small">осталось: {Math.max(0, queue.length - i)} · всего в расписании: {total}</span>
      </div>
      {item ? (
        <>
          <div className="card flash" onClick={() => setFlipped(true)}>
            <div className="row"><span className="chip accent">{BOOKS[item.week.book].short} · нед. {item.week.n}</span>
              <span className="chip">{{ card: 'карточка', term: 'термин', task: 'задача', quiz: 'вопрос' }[item.type]}</span></div>
            <Face item={item} flipped={flipped} />
            {!flipped && <button className="btn primary" onClick={e => { e.stopPropagation(); setFlipped(true) }}>Показать ответ <span className="kbd">space</span></button>}
          </div>
          {flipped && (
            <div className="review-bar">
              {[['again', 'Снова', '10 мин', 1, 'bad'], ['hard', 'Трудно', 'повтор', 2, 'warn'], ['good', 'Хорошо', 'дальше', 3, 'good'], ['easy', 'Легко', 'через две', 4, '']].map(([g, l, sub, k, cls]) => (
                <button key={g} className={'btn ' + cls} onClick={() => rate(g)}>{l} <small>{sub} · {k}</small></button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card center">
          <h2>{queue.length ? 'Сессия закончена 🎉' : 'Сейчас повторять нечего ✨'}</h2>
          {queue.length > 0 && <p>Снова: {stats.again} · Трудно: {stats.hard} · Хорошо: {stats.good} · Легко: {stats.easy}</p>}
          {!queue.length && <p className="muted">Карточки попадают в расписание, когда вы завершаете неделю («Итог» → «Завершить неделю»), отправляете задачу в повторение или ошибаетесь в тесте.{nextDue ? ` Ближайшая — ${new Date(nextDue).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : ''}</p>}
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn primary" href={href('')}>На главную</a>
            <a className="btn" href={href('terms')}>Тренажёр терминов</a>
          </div>
          <p className="muted small">Интервалы (дни): {INTERVALS.slice(1).join(' → ')}</p>
        </div>
      )}
    </main>
  )
}
