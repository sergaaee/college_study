import { useSyncExternalStore } from 'react'

const KEY = 'college-study.v1'
const blank = () => ({
  v: 1,
  lessons: {},           // 'matan-1': { stages:{}, tasks:{}, quiz:{}, can:{}, notes:'', secs:0 }
  srs: {},               // 'card:matan-1:3': { box, due, n, lapses, last }
  log: {},               // '2026-11-14': { reviews, secs }
  settings: { theme: 'auto', newPerDay: 10 },
  last: null,            // { book, week }
})

let state
try {
  state = { ...blank(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
} catch { state = blank() }

const subs = new Set()
let saveTimer = null
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, 120)
}

export function getState() { return state }
export function update(fn) {
  const next = structuredClone(state)
  fn(next)
  state = next
  persist()
  subs.forEach(f => f())
}
export function useStore(sel = s => s) {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb) },
    () => sel(state)
  )
}

export const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_LESSON = Object.freeze({ stages: {}, tasks: {}, quiz: {}, can: {}, notes: '', secs: 0 })
export function lessonOf(s, id) {
  return s.lessons[id] || EMPTY_LESSON
}
export const EMPTY_ARR = Object.freeze([])
export function patchLesson(id, fn) {
  update(s => {
    const l = s.lessons[id] ||= { stages: {}, tasks: {}, quiz: {}, can: {}, notes: '', secs: 0 }
    fn(l)
  })
}
export function bumpLog(field, n = 1) {
  update(s => {
    const d = s.log[today()] ||= { reviews: 0, secs: 0 }
    d[field] = (d[field] || 0) + n
  })
}

export function exportJson() { return JSON.stringify(state, null, 1) }
export function importJson(txt) {
  const obj = JSON.parse(txt)
  if (!obj || typeof obj !== 'object' || !obj.lessons) throw new Error('Неверный файл')
  state = { ...blank(), ...obj }
  persist(); subs.forEach(f => f())
}
export function resetAll() { state = blank(); persist(); subs.forEach(f => f()) }
