import React, { useMemo, useState } from 'react'
import { Rich, inline } from '../lib/rich.jsx'
import { Callout, Reveal, Observe, Predict } from '../lib/ui.jsx'
import { Lab } from '../widgets/index.jsx'
import { patchLesson, useStore, lessonOf } from '../lib/store.js'
import { grade as srsGrade, addToSrs } from '../lib/srs.js'
import { openBook } from '../lib/pdfpanel.jsx'
import { weeksOf, srsItemsOfWeek } from '../content/index.js'
import { href } from '../lib/router.js'

const META = ['w', 'title', 'story', 'observe', 'predict', 'takeaway']

export function LabCard({ lab, compact = false }) {
  if (!lab) return null
  const props = Object.fromEntries(Object.entries(lab).filter(([k]) => !META.includes(k)))
  return (
    <section className="lab">
      {!compact && (
        <div className="lab-head">
          <h3>🎛 {inline(lab.title, 'lt')}</h3>
          {lab.story && <Rich className="lab-story">{lab.story}</Rich>}
        </div>
      )}
      <div className="lab-body">
        {lab.predict && <Predict {...lab.predict} />}
        <Lab w={lab.w} {...props} />
        <Observe items={lab.observe} />
        {lab.takeaway && <Reveal label="Вывод лаборатории">{lab.takeaway}</Reveal>}
      </div>
    </section>
  )
}

/* ------------------------------ Зачем ------------------------------ */
export function HookStage({ w }) {
  return (
    <>
      {w.goal && <div className="goal"><b>Цель недели.</b> <span>{inline(w.goal, 'g')}</span></div>}
      <BookLinks w={w} />
      <h2>Где это встречается в жизни</h2>
      <div className="life-grid">
        {w.life.map((x, i) => (
          <div className="life" key={i}>
            <div className="ico">{x.icon}</div>
            <h3>{x.title}</h3>
            <Rich>{x.text}</Rich>
          </div>
        ))}
      </div>
      {w.labs[0] && (
        <>
          <h2>Разминка: почувствуйте идею руками</h2>
          <LabCard lab={w.labs[0]} />
        </>
      )}
      {w.stub && <Callout kind="note" title="Конспект недели ещё без интерактива">Для этой недели читайте главу в книге (кнопка выше) и решайте задачи из задачника.</Callout>}
    </>
  )
}

export function BookLinks({ w }) {
  const b = w.book
  return (
    <div className="booklinks">
      <button className="btn" onClick={() => openBook(b, w.chapter.start, `глава ${w.n}`)}>📖 Читать главу в книге</button>
      {w.pages.problems && <button className="btn" onClick={() => openBook(b, w.pages.problems, `задачи недели ${w.n}`)}>✏️ Задачник</button>}
      {w.pages.answers && <button className="btn" onClick={() => openBook(b, w.pages.answers, `ответы недели ${w.n}`)}>✅ Ответы</button>}
      {w.pages.walk && <button className="btn" onClick={() => openBook(b, w.pages.walk, `разбор недели ${w.n}`)}>🔍 Подробный разбор</button>}
    </div>
  )
}

/* ------------------------------ Теория ------------------------------ */
export function TheoryStage({ w, done, onDone }) {
  return (
    <>
      <BookLinks w={w} />
      <div className="muted small" style={{ marginBottom: 6 }}>
        Правило: прочитайте блок → закройте глаза → скажите вслух своими словами → только потом открывайте «Проверь себя».
      </div>
      {w.theory.map((b, i) => (
        <React.Fragment key={i}>
          <Callout kind={b.k || 'note'} title={b.t}>{b.b}</Callout>
          {b.check && (
            <div className="check">
              <b className="t">Проверь себя.</b> {inline(b.check.q, 'cq' + i)}
              <Reveal label="Показать ответ" tone="ans">{b.check.a}</Reveal>
            </div>
          )}
        </React.Fragment>
      ))}
      {!w.theory.length && <Callout kind="note">Теория этой недели — в главе книги.</Callout>}
      <div className="stage-nav"><span /><button className={'btn ' + (done ? '' : 'primary')} onClick={onDone}>{done ? '✓ Теория пройдена' : '✓ Я разобрался(лась), дальше'}</button></div>
    </>
  )
}

/* ------------------------------ Лаборатория ------------------------------ */
export function LabStage({ w, done, onDone }) {
  return (
    <>
      <div className="goal"><b>Как работать.</b> Для каждой лаборатории: 1) прочитайте жизненную историю, 2) <b>предскажите</b> результат, 3) подвигайте ползунки, 4) сформулируйте вывод одной фразой — и только потом откройте «Вывод».</div>
      {w.labs.map((l, i) => <LabCard key={i} lab={l} />)}
      {!w.labs.length && <Callout kind="note">Для этой недели лабораторий пока нет.</Callout>}
      <div className="stage-nav"><span /><button className={'btn ' + (done ? '' : 'primary')} onClick={onDone}>{done ? '✓ Лаборатория пройдена' : '✓ Понял(а) зависимости, дальше'}</button></div>
    </>
  )
}

/* ------------------------------ Практика ------------------------------ */
function TaskCard({ w, t }) {
  const st = useStore(s => lessonOf(s, w.id).tasks[t.id])
  const [hints, setHints] = useState(0)
  const hs = t.hints || []
  const setGrade = g => {
    patchLesson(w.id, l => { l.tasks[t.id] = g })
    const sid = `task:${w.id}:${t.id}`
    if (g === 'fail' || g === 'hint') addToSrs(sid, 0)
    else srsGrade(sid, 'good')
  }
  const lab = typeof t.lab === 'number' ? w.labs[t.lab] : t.lab && t.lab.w ? { title: 'Лаборатория к задаче', ...t.lab } : w.labs[0]
  return (
    <div className={'card task ' + (st || '')}>
      <div className="task-h">
        <span className="task-id">{w.book === 'matan' ? 'М' : w.book === 'linal' ? 'Л' : 'Д'}&nbsp;{t.id}</span>
        <span className={'chip ' + t.lvl}>уровень {t.lvl}</span>
        {st === 'ok' && <span className="chip A">решено ✓</span>}
        {st === 'hint' && <span className="chip B">с подсказкой</span>}
        {st === 'fail' && <span className="chip" style={{ color: 'var(--bad)' }}>в повторение</span>}
        <span className="spacer" />
        {t.fromBook !== false && w.pages.problems && <button className="btn tiny ghost" onClick={() => openBook(w.book, w.pages.problems, `задачи недели ${w.n}`)}>в задачнике ↗</button>}
      </div>
      <div className="task-q"><Rich>{t.q}</Rich></div>
      {t.life && <div className="life-line"><b>🌍 Из жизни.</b> {inline(t.life, 'tl')}</div>}
      {lab && (
        <details className="minilab">
          <summary>🎛 Покрутить ползунки к этой задаче</summary>
          <LabCard lab={lab} compact={!t.lab || typeof t.lab === 'number' ? false : true} />
        </details>
      )}
      {hs.length > 0 && (
        <div className="hints">
          {hs.slice(0, hints).map((h, i) => <div className="hint-item" key={i}>💡 <b>Подсказка {i + 1}.</b> {inline(h, 'h' + i)}</div>)}
          {hints < hs.length && <div><button className="btn tiny" onClick={() => setHints(hints + 1)}>💡 Подсказка {hints + 1} из {hs.length}</button></div>}
        </div>
      )}
      <Reveal label="Показать ответ" tone="ans">{t.ans}</Reveal>
      <Reveal label="Показать решение" tone="sol">{t.sol}</Reveal>
      <div className="grade-row">
        <span className="muted small">Как получилось?</span>
        <button className="btn tiny good" onClick={() => setGrade('ok')}>✅ Сам(а)</button>
        <button className="btn tiny warn" onClick={() => setGrade('hint')}>🟡 С подсказкой</button>
        <button className="btn tiny bad" onClick={() => setGrade('fail')}>❌ Не вышло → в повторение</button>
        {w.pages.answers && <button className="btn tiny ghost" onClick={() => openBook(w.book, w.pages.answers, `ответы недели ${w.n}`)}>ответ в книге ↗</button>}
      </div>
    </div>
  )
}

export function PracticeStage({ w, done, onDone }) {
  const [lvl, setLvl] = useState('all')
  const l = useStore(s => lessonOf(s, w.id))
  const list = w.tasks.filter(t => lvl === 'all' || t.lvl === lvl)
  const solved = w.tasks.filter(t => l.tasks[t.id] === 'ok' || l.tasks[t.id] === 'hint').length
  return (
    <>
      <div className="goal">
        <b>Как решать.</b> Таймер в голове: 10–15 минут без подсказок. Потом подсказки по одной. Честно отметьте результат — «не вышло» отправит задачу в расписание повторений. Уровни: <span className="chip A">A</span> база (обязательно), <span className="chip B">B</span> экзамен, <span className="chip C">C</span> на сотку.
      </div>
      <div className="row">
        <div className="tabs">
          {['all', 'A', 'B', 'C'].map(x => <button key={x} className={lvl === x ? 'on' : ''} onClick={() => setLvl(x)}>{x === 'all' ? 'Все' : x}</button>)}
        </div>
        <span className="spacer" />
        <span className="muted small">решено {solved} из {w.tasks.length}</span>
      </div>
      {list.map(t => <TaskCard key={t.id} w={w} t={t} />)}
      {!list.length && <Callout kind="note">Задач нет — используйте задачник книги (кнопка «Задачник»).</Callout>}
      <div className="stage-nav"><span /><button className={'btn ' + (done ? '' : 'primary')} onClick={onDone}>{done ? '✓ Практика пройдена' : '✓ Практика готова, дальше'}</button></div>
    </>
  )
}

/* ------------------------------ Закрепление ------------------------------ */
function shuffle(a, seed) {
  const r = [...a]
  let s = seed
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
}

export function QuizBox({ w }) {
  const prevQs = useMemo(() => {
    const out = []
    weeksOf(w.book).filter(x => x.n < w.n).forEach(x => x.quiz.forEach((q, i) => out.push({ ...q, wid: x.id, i, old: x.n })))
    return shuffle(out, w.n * 97 + 13).slice(0, 2)
  }, [w.id])
  const qs = useMemo(() => {
    const own = w.quiz.map((q, i) => ({ ...q, wid: w.id, i }))
    const all = shuffle([...own, ...prevQs], w.n * 31 + 7)
    return all.map((q, qi) => {
      const order = shuffle(q.opts.map((_, k) => k), 100 + qi * 7 + w.n)
      return { ...q, order }
    })
  }, [w.id, prevQs])
  const [idx, setIdx] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const [fin, setFin] = useState(false)
  if (!qs.length) return null
  if (fin) {
    const pct = Math.round((score / qs.length) * 100)
    return (
      <div className="card">
        <h3>Результат: {score} из {qs.length} ({pct}%)</h3>
        <p className="muted">{pct >= 80 ? 'Отлично! Вопросы с ошибками вернутся в повторение.' : 'Ошибочные вопросы добавлены в расписание повторений — вернитесь к теории и сыграйте ещё раз.'}</p>
        <button className="btn" onClick={() => { setIdx(0); setPick(null); setScore(0); setFin(false) }}>Ещё раз</button>
      </div>
    )
  }
  const q = qs[idx]
  const answered = pick !== null
  const choose = k => {
    if (answered) return
    setPick(k)
    const ok = k === q.ok
    if (ok) setScore(s => s + 1)
    else srsGrade(`quiz:${q.wid}:${q.i}`, 'again')
  }
  const next = () => {
    if (idx + 1 >= qs.length) {
      const pct = Math.round(((score) / qs.length) * 100)
      patchLesson(w.id, l => { l.quiz.best = Math.max(l.quiz.best || 0, pct); l.quiz.last = pct })
      setFin(true)
    } else { setIdx(idx + 1); setPick(null) }
  }
  return (
    <div className="card">
      <div className="row"><b>Вопрос {idx + 1} из {qs.length}</b>{q.old && <span className="chip">повторение недели {q.old}</span>}<span className="spacer" /><span className="muted small">верно: {score}</span></div>
      <div style={{ margin: '10px 0' }}><Rich>{q.q}</Rich></div>
      {q.order.map(k => (
        <button key={k} disabled={answered} onClick={() => choose(k)}
          className={'quiz-opt ' + (answered ? (k === q.ok ? 'right' : k === pick ? 'wrong' : '') : '')}>
          {inline(q.opts[k], 'qo' + k)}
        </button>
      ))}
      {answered && (
        <div className={'predict-why ' + (pick === q.ok ? 'good' : 'bad')} style={{ marginTop: 8 }}>
          {pick === q.ok ? '✅ Верно. ' : '❌ Неверно. '}{inline(q.why || '', 'qw')}
        </div>
      )}
      {answered && <div className="stage-nav"><span /><button className="btn primary" onClick={next}>{idx + 1 >= qs.length ? 'Показать результат' : 'Дальше ▸'}</button></div>}
    </div>
  )
}

export function ReviewStage({ w, done, onDone }) {
  const items = srsItemsOfWeek(w)
  const srs = useStore(s => s.srs)
  const added = items.filter(i => srs[i.id]).length
  const traps = w.theory.filter(b => b.k === 'trap')
  const addAll = () => items.forEach(i => addToSrs(i.id, 0))
  return (
    <>
      <div className="goal"><b>Зачем.</b> Вспоминать полезнее, чем перечитывать. Мини-тест подмешивает вопросы из прошлых недель (так мозг учится различать темы), а карточки возвращаются по расписанию.</div>
      <div className="section-title"><h2>🧠 Мини-тест</h2></div>
      <QuizBox w={w} />
      <div className="section-title"><h2>🃏 Карточки и термины недели</h2></div>
      <div className="card">
        <p>Карточек определений/формул: <b>{w.cards.length}</b> · терминов (рус / English / עברית): <b>{w.terms.length}</b>. В расписании повторений: <b>{added}</b> из {items.length}.</p>
        <div className="row">
          <a className="btn primary" href={href(`review?week=${w.id}`)}>▶ Пройти сейчас</a>
          {added < items.length && <button className="btn" onClick={addAll}>＋ Добавить все в расписание</button>}
        </div>
      </div>
      {traps.length > 0 && (
        <>
          <div className="section-title"><h2>⚠️ Ловушки недели</h2></div>
          {traps.map((b, i) => <Callout key={i} kind="trap" title={b.t}>{b.b}</Callout>)}
        </>
      )}
      {w.terms.length > 0 && (
        <>
          <div className="section-title"><h2>🔤 Термины</h2><span className="muted small">иврит — для экзамена на иврите</span></div>
          <div className="card"><div className="table-wrap">
            <table className="termtable">
              <thead><tr><th>Русский</th><th>English</th><th style={{ textAlign: 'right' }}>עברית</th></tr></thead>
              <tbody>{w.terms.map((t, i) => <tr key={i}><td>{t.ru}</td><td>{t.en}</td><td className="he">{t.he}</td></tr>)}</tbody>
            </table>
          </div></div>
        </>
      )}
      <div className="stage-nav"><span /><button className={'btn ' + (done ? '' : 'primary')} onClick={onDone}>{done ? '✓ Закрепление пройдено' : '✓ Закреплено, дальше'}</button></div>
    </>
  )
}

/* ------------------------------ Итог ------------------------------ */
export function WrapStage({ w, m, onFinish }) {
  const l = useStore(s => lessonOf(s, w.id))
  const set = (i, v) => patchLesson(w.id, x => { x.can[i] = v })
  const next = w.n < weeksOf(w.book).length ? w.n + 1 : null
  const failed = w.tasks.filter(t => l.tasks[t.id] === 'fail')
  return (
    <>
      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Освоение недели: {m}%</h2><span className="spacer" />
          <span className="chip accent">этапы {Object.keys(l.stages).filter(k => l.stages[k]).length}/6</span></div>
        <div className="bar" style={{ margin: '10px 0' }}><i style={{ width: m + '%' }} /></div>
        <p className="muted small">Складывается из пройденных этапов, решённых задач, мини-теста и самооценки ниже. Порог «освоено» — 70%.</p>
      </div>
      <div className="section-title"><h2>✅ Что я должен(на) уметь</h2></div>
      <div className="card">
        {w.can.map((c, i) => (
          <div className="can-item" key={i}>
            <div style={{ flex: 1 }}>{inline(c, 'can' + i)}</div>
            <div className="segmented">
              {[['no', 'не умею'], ['mid', 'шатко'], ['yes', 'умею']].map(([v, lab]) => <button key={v} className={l.can[i] === v ? 'on' : ''} onClick={() => set(i, v)}>{lab}</button>)}
            </div>
          </div>
        ))}
        {!w.can.length && <div className="muted">См. раздел «Что вы должны уметь» в конце главы книги.</div>}
      </div>
      {failed.length > 0 && <Callout kind="trap" title="Не получились">Задачи {failed.map(t => t.id).join(', ')} уже в расписании повторений.</Callout>}
      <div className="section-title"><h2>📝 Мои заметки</h2></div>
      <textarea placeholder="Где ошибся? Какую ловушку поймал? Что спросить у лектора?" value={l.notes || ''} onChange={e => patchLesson(w.id, x => { x.notes = e.target.value })} />
      <div className="stage-nav">
        <span />
        <div className="row">
          <button className="btn primary" onClick={onFinish}>🏁 Завершить неделю и запланировать повторения</button>
          {next && <a className="btn" href={href(`b/${w.book}/${next}`)}>К неделе {next} ▸</a>}
        </div>
      </div>
    </>
  )
}
