// Проверка контента: структура, дубликаты, виджеты, выражения mathjs, «битые» escape-последовательности.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile } from 'mathjs'

const WID = new Set()
for (const f of ['matan', 'matanA', 'matanB', 'linal', 'linalA', 'linalB', 'discrete', 'discreteA', 'discreteB']) {
  const p = `src/widgets/${f}.jsx`
  if (!fs.existsSync(p)) continue
  const m = fs.readFileSync(p, 'utf8').match(/export default \{([^}]*)\}/)
  if (m) m[1].split(',').forEach(x => { const k = x.split(':')[0].trim(); if (k && !k.startsWith('...')) WID.add(k) })
}
const root = 'src/content'
let errors = 0, warns = 0, nTasks = 0, nLabs = 0, nWeeks = 0
const err = (w, m) => { errors++; console.log(`✗ ${w}: ${m}`) }
const warn = (w, m) => { warns++; console.log(`! ${w}: ${m}`) }

function walk(o, f, p = '') { if (typeof o === 'string') f(o, p); else if (Array.isArray(o)) o.forEach((x, i) => walk(x, f, p + '[' + i + ']')); else if (o && typeof o === 'object') for (const k in o) walk(o[k], f, p + '.' + k) }

function checkExpr(id, where, src, scope) {
  try {
    const node = compile(String(src))
    let ok = false
    for (const v of [0.5, 1.5, 2.5, 3.5, 7]) { try { const r = node.evaluate({ ...scope, x: v, n: Math.round(v) + 1 }); if (typeof r === 'number' ? Number.isFinite(r) : r != null) { ok = true; break } } catch {} }
    if (!ok) warn(id, `${where}: выражение «${src}» не вычисляется ни в одной пробной точке`)
  } catch (e) { err(id, `${where}: выражение «${src}» не компилируется: ${e.message}`) }
}
function checkLab(id, lab, where) {
  if (typeof lab !== 'object') return
  if (!WID.has(lab.w)) err(id, `${where}: неизвестный виджет «${lab.w}»`)
  const scope = {}
  for (const [k, s] of Object.entries(lab.params || {})) scope[k] = s.val
  for (const k of ['expr', 'f', 'g', 'u']) if (typeof lab[k] === 'string' && !['taylor', 'optim', 'transform', 'parts'].includes(lab.w)) checkExpr(id, where + '.' + k, lab[k], scope)
  if (typeof lab.L === 'string') checkExpr(id, where + '.L', lab.L, scope)
  for (const [k, s] of Object.entries(lab.params || {})) if (!(s.min <= s.val && s.val <= s.max)) err(id, `${where}: параметр ${k}: val вне [min,max]`)
}

for (const book of fs.readdirSync(root)) {
  const dir = path.join(root, book)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const f of fs.readdirSync(dir).filter(f => /^w\d+\.js$/.test(f)).sort()) {
    const id = `${book}/${f}`
    const w = (await import(pathToFileURL(path.resolve(dir, f)).href)).default
    nWeeks++
    for (const k of ['tagline', 'goal', 'life', 'theory', 'labs', 'tasks', 'quiz', 'cards', 'can']) if (!w[k] || (Array.isArray(w[k]) && !w[k].length)) err(id, `нет поля ${k}`)
    walk(w, (s, p) => { if (/[\x07\x08\x09\x0b\x0c\x0d]/.test(s)) err(id, `управляющий символ в строке ${p}: «${s.slice(0, 50).replace(/[\x00-\x1f]/g, '·')}» — вероятно, \\t/\\f/\\b/\\v в обычной кавычке без r`) })
    walk(w, (s, p) => { const n = (s.match(/\$/g) || []).length; if (n % 2) err(id, `нечётное число $ в ${p}: «${s.slice(0, 60)}»`) })
    const ids = new Set()
    for (const t of w.tasks || []) {
      nTasks++
      if (ids.has(t.id)) err(id, `повтор id задачи ${t.id}`); ids.add(t.id)
      for (const k of ['q', 'ans', 'sol', 'life', 'lvl']) if (!t[k]) err(id, `задача ${t.id}: нет ${k}`)
      if (!t.hints?.length) warn(id, `задача ${t.id}: нет подсказок`)
      if (!['A', 'B', 'C'].includes(t.lvl)) err(id, `задача ${t.id}: уровень ${t.lvl}`)
      if (typeof t.lab === 'number' && !w.labs[t.lab]) err(id, `задача ${t.id}: lab=${t.lab} не существует`)
      if (typeof t.lab === 'object') checkLab(id, t.lab, `задача ${t.id}.lab`)
      if (t.lab === undefined) warn(id, `задача ${t.id}: нет собственной лаборатории (будет первая лаба недели)`)
    }
    ;(w.labs || []).forEach((l, i) => { nLabs++; checkLab(id, l, `labs[${i}]`); if (!l.observe?.length) warn(id, `labs[${i}] без «что попробовать»`) })
    ;(w.quiz || []).forEach((q, i) => { if (!(q.ok >= 0 && q.ok < q.opts.length)) err(id, `quiz[${i}]: ok вне диапазона`); if (!q.why) warn(id, `quiz[${i}] без пояснения`) })
    ;(w.theory || []).forEach((b, i) => { if (!b.b) err(id, `theory[${i}] пусто`) })
  }
}
console.log(`\nнедель: ${nWeeks}, лабораторий: ${nLabs}, задач: ${nTasks}; ошибок: ${errors}, предупреждений: ${warns}`)
process.exit(errors ? 1 : 0)
