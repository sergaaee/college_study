// Интервальные повторения (Leitner): коробки 1..7, интервалы в днях.
import { update, getState, today } from './store.js'

export const INTERVALS = [0, 1, 2, 4, 8, 16, 35, 70]
const DAY = 86400000

export function dueAt(box) { return Date.now() + INTERVALS[Math.min(box, INTERVALS.length - 1)] * DAY }

/** grade: 'again' | 'hard' | 'good' | 'easy' */
export function grade(id, g) {
  update(s => {
    const it = s.srs[id] || { box: 0, n: 0, lapses: 0 }
    if (g === 'again') { it.box = 1; it.lapses++ }
    else if (g === 'hard') it.box = Math.max(1, it.box)
    else if (g === 'good') it.box = Math.min(INTERVALS.length - 1, it.box + 1)
    else it.box = Math.min(INTERVALS.length - 1, it.box + 2)
    it.n++
    it.last = Date.now()
    // «снова» — повторить в этой же сессии (через 10 мин), остальное по интервалу
    it.due = g === 'again' ? Date.now() + 10 * 60000 : dueAt(it.box)
    s.srs[id] = it
    const d = s.log[today()] ||= { reviews: 0, secs: 0 }
    d.reviews++
  })
}

export function addToSrs(id, boxStart = 0) {
  const s = getState()
  if (s.srs[id]) return
  update(st => { st.srs[id] = { box: boxStart, n: 0, lapses: 0, due: Date.now() } })
}

export function isDue(it) { return !it || (it.due ?? 0) <= Date.now() }
export function boxLabel(box) { return ['новая', '1 д', '2 д', '4 д', '8 д', '16 д', '35 д', '70 д'][box] || '' }
