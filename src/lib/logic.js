// Разбор логических формул и формул над множествами (для виджетов).
const norm = s => String(s)
  .replace(/∧|\band\b/gi, '&').replace(/∨|\bor\b/gi, '|').replace(/¬|~|\bnot\b/gi, '!')
  .replace(/↔|⇔|<=>/g, '<->').replace(/→|⇒/g, '->').replace(/⊕|\bxor\b/gi, '^')

function tokenize(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (s.startsWith('<->', i)) { out.push('<->'); i += 3; continue }
    if (s.startsWith('->', i)) { out.push('->'); i += 2; continue }
    if ('()&|!^-'.includes(c)) { out.push(c); i++; continue }
    if (/[A-Za-z01]/.test(c)) { out.push(c); i++; continue }
    throw new Error('неожиданный символ «' + c + '»')
  }
  return out
}

/** Логика: ! > & > | ^ > -> > <->. Возвращает { f(env), vars } или бросает ошибку. */
export function parseLogic(src) {
  const t = tokenize(norm(src))
  let p = 0
  const vars = new Set()
  const peek = () => t[p]
  const eat = x => { if (t[p] !== x) throw new Error('ожидалось «' + x + '»'); p++ }
  function iff() { let l = imp(); while (peek() === '<->') { p++; const r = imp(); const a = l; l = e => a(e) === r(e) } return l }
  function imp() { const l = or(); if (peek() === '->') { p++; const r = imp(); return e => !l(e) || r(e) } return l }
  function or() {
    let l = and()
    while (peek() === '|' || peek() === '^') { const op = t[p++]; const r = and(); const a = l; l = op === '|' ? e => a(e) || r(e) : e => a(e) !== r(e) }
    return l
  }
  function and() { let l = not(); while (peek() === '&') { p++; const r = not(); const a = l; l = e => a(e) && r(e) } return l }
  function not() { if (peek() === '!') { p++; const x = not(); return e => !x(e) } return atom() }
  function atom() {
    const x = t[p]
    if (x === '(') { p++; const v = iff(); eat(')'); return v }
    if (x === '1') { p++; return () => true }
    if (x === '0') { p++; return () => false }
    if (x && /[A-Za-z]/.test(x)) { p++; vars.add(x.toLowerCase()); const k = x.toLowerCase(); return e => !!e[k] }
    throw new Error('ожидалась переменная или «(»')
  }
  if (!t.length) throw new Error('пустая формула')
  const f = iff()
  if (p < t.length) throw new Error('лишнее «' + t[p] + '»')
  return { f, vars: [...vars].sort() }
}

/** Множества: выражение над A,B,C,U (U — всё), операторы ! & | - ^ ; возвращает функцию (sets) => boolean[] */
export function parseSet(src) {
  const t = tokenize(String(src).replace(/∪/g, '|').replace(/∩/g, '&').replace(/△|Δ/g, '^').replace(/∖|\\/g, '-').replace(/¬|~|'/g, '!'))
  let p = 0
  const peek = () => t[p]
  function expr() {
    let l = term()
    while (peek() === '|' || peek() === '-' || peek() === '^') {
      const op = t[p++]; const r = term(); const a = l
      l = op === '|' ? s => a(s).map((x, i) => x || r(s)[i]) : op === '-' ? s => a(s).map((x, i) => x && !r(s)[i]) : s => a(s).map((x, i) => x !== r(s)[i])
    }
    return l
  }
  function term() { let l = fac(); while (peek() === '&') { p++; const r = fac(); const a = l; l = s => a(s).map((x, i) => x && r(s)[i]) } return l }
  function fac() {
    const x = t[p]
    if (x === '!') { p++; const f = fac(); return s => f(s).map(v => !v) }
    if (x === '(') { p++; const v = expr(); if (t[p] !== ')') throw new Error('ожидалось «)»'); p++; return v }
    if (x && /[A-Za-z]/.test(x)) { p++; const k = x.toUpperCase(); return s => (k === 'U' ? s.A.map(() => true) : s[k] || s.A.map(() => false)) }
    if (x === '0') { p++; return s => s.A.map(() => false) }
    throw new Error('ожидалось множество A, B, C или U')
  }
  if (!t.length) throw new Error('пустое выражение')
  const f = expr()
  if (p < t.length) throw new Error('лишнее «' + t[p] + '»')
  return f
}
