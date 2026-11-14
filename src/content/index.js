import bookIndex from '../data/bookIndex.json'
import terms from '../data/terms.json'

export const BOOKS = {
  matan: {
    id: 'matan', name: 'Матанализ 1', short: 'Матан', icon: '∫', file: bookIndex.matan.file,
    sub: 'Пределы, производные, интегралы', ref: 'Thomas', weeks: bookIndex.matan.chapters.length,
  },
  linal: {
    id: 'linal', name: 'Линейная алгебра', short: 'Линал', icon: '⟂', file: bookIndex.linal.file,
    sub: 'Комплексные числа, пространства, преобразования', ref: 'Стренг', weeks: bookIndex.linal.chapters.length,
  },
  discrete: {
    id: 'discrete', name: 'Дискретная математика', short: 'Дискра', icon: '∀', file: bookIndex.discrete.file,
    sub: 'Логика, множества, комбинаторика, графы', ref: 'Розен', weeks: bookIndex.discrete.chapters.length,
  },
}
export const BOOK_IDS = Object.keys(BOOKS)

const mods = import.meta.glob('./*/w*.js', { eager: true })
const byBook = { matan: {}, linal: {}, discrete: {} }
for (const [path, m] of Object.entries(mods)) {
  const mm = path.match(/\.\/(\w+)\/w(\d+)\.js$/)
  if (mm) byBook[mm[1]][+mm[2]] = m.default
}

export const STAGES = [
  { id: 'hook', name: 'Зачем', icon: '🌍' },
  { id: 'theory', name: 'Теория', icon: '📘' },
  { id: 'lab', name: 'Лаборатория', icon: '🎛' },
  { id: 'practice', name: 'Практика', icon: '✏️' },
  { id: 'review', name: 'Закрепление', icon: '🧠' },
  { id: 'wrap', name: 'Итог', icon: '🏁' },
]

const cache = {}
export function getWeek(book, n) {
  const id = `${book}-${n}`
  if (cache[id]) return cache[id]
  const idx = bookIndex[book]
  const ch = idx.chapters[n - 1]
  if (!ch) return null
  const src = byBook[book][n] || {}
  const sec = k => idx.sections[k]
  const w = {
    life: [], theory: [], labs: [], tasks: [], quiz: [], cards: [], can: [],
    ...src,
    id, book, n,
    title: src.title || ch.title,
    chapter: ch,
    terms: terms[id] || [],
    stub: !byBook[book][n],
    pages: {
      chapter: ch.start,
      problems: sec('problems')?.byWeek?.[n] || sec('problems')?.start,
      answers: sec('answers')?.byWeek?.[n] || sec('answers')?.start,
      walk: sec('walk')?.byWeek?.[n] || sec('walk')?.start,
      terms: ch.termsPage,
    },
  }
  cache[id] = w
  return w
}
export const weeksOf = book => Array.from({ length: BOOKS[book].weeks }, (_, i) => getWeek(book, i + 1))
export const allWeeks = () => BOOK_IDS.flatMap(weeksOf)
export const bookSections = book => bookIndex[book].sections

export const itemId = (type, week, i) => `${type}:${week.id}:${i}`
/** Все элементы повторения недели: авторские карточки, термины. */
export function srsItemsOfWeek(w) {
  return [
    ...w.cards.map((c, i) => ({ id: itemId('card', w, i), type: 'card', week: w, data: c })),
    ...w.terms.map((t, i) => ({ id: itemId('term', w, i), type: 'term', week: w, data: t })),
  ]
}
export function findItem(id) {
  const [type, wid, i] = id.split(':')
  const [book, n] = wid.split('-')
  const w = getWeek(book, +n)
  if (!w) return null
  if (type === 'card') return w.cards[+i] && { id, type, week: w, data: w.cards[+i] }
  if (type === 'term') return w.terms[+i] && { id, type, week: w, data: w.terms[+i] }
  if (type === 'quiz') return w.quiz[+i] && { id, type, week: w, data: w.quiz[+i] }
  if (type === 'task') { const t = w.tasks.find(t => t.id === i); return t && { id, type, week: w, data: t } }
  return null
}
