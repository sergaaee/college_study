import React, { useEffect } from 'react'
import { getWeek, STAGES, BOOKS } from '../content/index.js'
import { useStore, update, patchLesson, lessonOf } from '../lib/store.js'
import { href, go } from '../lib/router.js'
import { mastery } from '../lib/progress.js'
import { addToSrs } from '../lib/srs.js'
import { inline } from '../lib/rich.jsx'
import { srsItemsOfWeek } from '../content/index.js'
import { HookStage, TheoryStage, LabStage, PracticeStage, ReviewStage, WrapStage } from './LessonParts.jsx'

export default function Lesson({ book, n, stage }) {
  const w = getWeek(book, n)
  const l = useStore(s => lessonOf(s, w?.id))
  useEffect(() => {
    if (!w) return
    update(s => { s.last = { book, week: n } })
    const t = setInterval(() => { if (!document.hidden) update(s => { const d = s.log[new Date().toISOString().slice(0, 10)] ||= { reviews: 0, secs: 0 }; d.secs += 15 }) }, 15000)
    return () => clearInterval(t)
  }, [book, n])
  if (!w) return <main className="page"><h1>Такой недели нет</h1><a href={href('b/' + book)}>← к списку недель</a></main>

  const firstOpen = STAGES.find(s => !l.stages?.[s.id])?.id || 'hook'
  const cur = STAGES.some(s => s.id === stage) ? stage : firstOpen
  const idx = STAGES.findIndex(s => s.id === cur)
  const m = mastery(l, w)
  const done = id => !!l.stages?.[id]
  const mark = id => { patchLesson(w.id, x => { x.stages[id] = true }); const nx = STAGES[STAGES.findIndex(s => s.id === id) + 1]; if (nx) go(`b/${book}/${n}/${nx.id}`) }
  const finish = () => {
    patchLesson(w.id, x => { STAGES.forEach(s => { x.stages[s.id] = true }) })
    srsItemsOfWeek(w).forEach(i => addToSrs(i.id, 0))
    go(`b/${book}`)
  }

  const body = {
    hook: <HookStage w={w} />,
    theory: <TheoryStage w={w} done={done('theory')} onDone={() => mark('theory')} />,
    lab: <LabStage w={w} done={done('lab')} onDone={() => mark('lab')} />,
    practice: <PracticeStage w={w} done={done('practice')} onDone={() => mark('practice')} />,
    review: <ReviewStage w={w} done={done('review')} onDone={() => mark('review')} />,
    wrap: <WrapStage w={w} m={m} onFinish={finish} />,
  }[cur]

  return (
    <main className="page">
      <div className="lesson-head">
        <div className="crumbs"><a href={href('b/' + book)}>{BOOKS[book].name}</a> · неделя {n} из {BOOKS[book].weeks} · освоено {m}%</div>
        <h1>{w.title}</h1>
        {w.tagline && <div className="tagline">{inline(w.tagline, 'tg')}</div>}
      </div>
      <nav className="stepper">
        {STAGES.map((s, i) => (
          <button key={s.id} className={(s.id === cur ? 'on ' : '') + (done(s.id) ? 'done' : '')} onClick={() => go(`b/${book}/${n}/${s.id}`)}>
            <span className="n">{done(s.id) ? '✓' : i + 1}</span>{s.icon} {s.name}
          </button>
        ))}
      </nav>
      {body}
      <div className="stage-nav" style={{ marginTop: 40 }}>
        {idx > 0 ? <a className="btn ghost" href={href(`b/${book}/${n}/${STAGES[idx - 1].id}`)}>◂ {STAGES[idx - 1].name}</a> : <span />}
        {idx < STAGES.length - 1 ? <a className="btn ghost" href={href(`b/${book}/${n}/${STAGES[idx + 1].id}`)}>{STAGES[idx + 1].name} ▸</a> : <span />}
      </div>
    </main>
  )
}
