import React, { useEffect, useRef, useState } from 'react'
import { BOOKS, BOOK_IDS, bookSections } from '../content/index.js'
import { openBook } from '../lib/pdfpanel.jsx'
import { href } from '../lib/router.js'
import { useStore, update, EMPTY_ARR } from '../lib/store.js'

export default function Exam({ book }) {
  if (!book || !BOOKS[book]) return <ExamPicker />
  return <ExamRun key={book} book={book} />
}

function ExamPicker() {
  {
    return (
      <main className="page">
        <div className="lesson-head"><h1>⏱ Пробный экзамен</h1><div className="tagline">180 минут, без подсказок и без интернета — как на настоящем.</div></div>
        <div className="cards">{BOOK_IDS.map(b => (
          <a key={b} className="card bookcard" data-book={b} href={href('exam/' + b)} style={{ color: 'inherit' }}>
            <div className="ico">{BOOKS[b].icon}</div><h3>{BOOKS[b].name}</h3><div className="muted small">Пробный экзамен из конспекта</div>
          </a>))}</div>
      </main>
    )
  }
}

function ExamRun({ book }) {
  const sec = bookSections(book)
  const [left, setLeft] = useState(180 * 60)
  const [run, setRun] = useState(false)
  const t = useRef(null)
  const scores = useStore(s => s.exams?.[book] || EMPTY_ARR)
  const [pts, setPts] = useState('')
  useEffect(() => {
    if (!run) return
    t.current = setInterval(() => setLeft(x => Math.max(0, x - 1)), 1000)
    return () => clearInterval(t.current)
  }, [run])
  useEffect(() => { if (left === 0) setRun(false) }, [left])
  const mm = String(Math.floor(left / 60)).padStart(3, '0'), ss = String(left % 60).padStart(2, '0')
  const addScore = () => {
    const v = parseFloat(pts)
    if (Number.isFinite(v)) update(s => { (s.exams ||= {})[book] = [...(s.exams[book] || []), { score: v, at: Date.now() }]; })
    setPts('')
  }
  return (
    <main className="page" data-book={book}>
      <div className="lesson-head"><div className="crumbs"><a href={href('exam')}>Пробные экзамены</a></div>
        <h1>⏱ Пробный экзамен · {BOOKS[book].name}</h1>
        <div className="tagline">Правила: 180 минут, только калькулятор, листов с формулами нет. Записывайте решения полностью — оценивают ход мысли.</div></div>
      <div className="card center">
        <div className="timer" style={{ color: left < 600 ? 'var(--bad)' : 'inherit' }}>{mm}:{ss}</div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn primary" onClick={() => { setRun(r => !r); if (!run) openBook(book, sec.exam.start, 'пробный экзамен') }}>{run ? '⏸ Пауза' : left === 180 * 60 ? '▶ Начать экзамен' : '▶ Продолжить'}</button>
          <button className="btn" onClick={() => { setRun(false); setLeft(180 * 60) }}>Сброс</button>
          <button className="btn" onClick={() => openBook(book, sec.exam.start, 'пробный экзамен')}>📖 Открыть варианты</button>
          <button className="btn" onClick={() => openBook(book, sec.exam.end, 'критерии оценки')}>✅ Критерии (после!)</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Запишите результат</h3>
        <div className="row"><input type="number" value={pts} onChange={e => setPts(e.target.value)} placeholder="баллов из 100" /><button className="btn" onClick={addScore}>Сохранить</button></div>
        {scores.length > 0 && <p className="muted">История: {scores.map(s => `${s.score} (${new Date(s.at).toLocaleDateString('ru-RU')})`).join(' → ')}</p>}
      </div>
    </main>
  )
}
