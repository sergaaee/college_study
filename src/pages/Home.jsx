import React from 'react'
import { BOOKS, BOOK_IDS, weeksOf, STAGES } from '../content/index.js'
import { useStore, today } from '../lib/store.js'
import { href } from '../lib/router.js'
import { mastery, stageCount } from '../lib/progress.js'
import { Bar } from '../lib/ui.jsx'

export default function Home() {
  const s = useStore()
  const due = Object.values(s.srs).filter(i => (i.due ?? 0) <= Date.now()).length
  const days = [...Array(7)].map((_, k) => {
    const d = new Date(Date.now() - (6 - k) * 86400000)
    const key = d.toISOString().slice(0, 10)
    return { key, n: s.log[key]?.reviews || 0, label: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()] }
  })
  const maxN = Math.max(5, ...days.map(d => d.n))
  const last = s.last
  const lastWeek = last && weeksOf(last.book)[last.week - 1]

  return (
    <main className="page wide">
      <div className="hero">
        <div className="card">
          <h1>Привет! Давай учиться 👋</h1>
          <p className="muted">Три конспекта → один тренажёр. В каждой неделе: <b>зачем это нужно</b> → <b>теория</b> → <b>ползунки</b> → <b>практика</b> → <b>закрепление</b> → <b>итог</b>. Забывать будешь меньше: карточки сами возвращаются через 1, 2, 4, 8 … дней.</p>
          <div className="loop">{STAGES.map((st, i) => <span key={st.id}><b>{i + 1}</b> {st.icon} {st.name}</span>)}</div>
          <div className="row" style={{ marginTop: 16 }}>
            {lastWeek
              ? <a className="btn primary" href={href(`b/${last.book}/${last.week}`)}>▶ Продолжить: {BOOKS[last.book].short}, неделя {last.week}</a>
              : <a className="btn primary" href={href('b/matan/1')}>▶ Начать с матана, неделя 1</a>}
            <a className="btn" href={href('review')}>🧠 Повторение{due ? `: ${due} к повторению` : ''}</a>
          </div>
        </div>
        <div className="card">
          <h3>Активность за 7 дней</h3>
          <div className="muted small">повторений карточек и вопросов</div>
          <div className="bars7" style={{ marginBottom: 22 }}>
            {days.map((d, i) => <div key={d.key} className={d.key === today() ? 'today' : ''} style={{ height: `${Math.max(8, (d.n / maxN) * 100)}%` }} title={`${d.n}`}><small>{d.label}</small></div>)}
          </div>
          <div className="muted small">Сегодня: {s.log[today()]?.reviews || 0} повторений · {Math.round((s.log[today()]?.secs || 0) / 60)} мин в уроках</div>
        </div>
      </div>

      <div className="cards">
        {BOOK_IDS.map(b => {
          const ws = weeksOf(b)
          const done = ws.filter(w => mastery(s.lessons[w.id], w) >= 70).length
          const started = ws.filter(w => stageCount(s.lessons[w.id]) > 0).length
          const nextW = ws.find(w => mastery(s.lessons[w.id], w) < 70) || ws[0]
          return (
            <div key={b} className="card bookcard" data-book={b}>
              <div className="ico">{BOOKS[b].icon}</div>
              <div><h3>{BOOKS[b].name}</h3><div className="muted small">{BOOKS[b].sub} · {ws.length} недель</div></div>
              <Bar value={done} max={ws.length} />
              <div className="muted small">освоено {done} из {ws.length} · начато {started}</div>
              <div className="row">
                <a className="btn primary" href={href(`b/${b}/${nextW.n}`)}>Неделя {nextW.n}</a>
                <a className="btn" href={href(`b/${b}`)}>Все недели</a>
                <a className="btn" href={href(`exam/${b}`)}>Пробный экзамен</a>
              </div>
            </div>
          )
        })}
      </div>
      <p className="muted small" style={{ marginTop: 22 }}>
        Совет по методике: сначала читай теорию «закрыв глаза» (попробуй вспомнить определение сам), в лаборатории <b>сначала предскажи</b>, потом двигай ползунок, в практике не открывай подсказки раньше 10 минут. Всё сохраняется в браузере — раздел «⚙ Настройки» позволяет сделать копию прогресса.
      </p>
    </main>
  )
}
