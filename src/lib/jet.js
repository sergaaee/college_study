import { parse } from 'mathjs'

/**
 * Коэффициенты Тейлора c_k = f^(k)(a)/k! для выражения от x, k = 0..N.
 * Считаются арифметикой усечённых рядов (автоматическое дифференцирование) —
 * без символьных производных, поэтому быстро для любой степени и любой функции.
 */

const trees = new Map()
const tree = src => {
  let t = trees.get(src)
  if (!t) { t = parse(String(src).replace(/−/g, '-')); trees.set(src, t) }
  return t
}

const zeros = N => new Array(N + 1).fill(0)
const cst = (c, N) => { const j = zeros(N); j[0] = c; return j }
const isConst = j => j.every((v, i) => i === 0 || v === 0)

const add = (f, g) => f.map((v, i) => v + g[i])
const sub = (f, g) => f.map((v, i) => v - g[i])
const neg = f => f.map(v => -v)
function mul(f, g) {
  const N = f.length - 1, h = zeros(N)
  for (let i = 0; i <= N; i++) { if (f[i] === 0) continue; for (let j = 0; i + j <= N; j++) h[i + j] += f[i] * g[j] }
  return h
}
function div(f, g) {
  const N = f.length - 1, h = zeros(N)
  for (let k = 0; k <= N; k++) {
    let s = f[k]
    for (let j = 1; j <= k; j++) s -= g[j] * h[k - j]
    h[k] = s / g[0]
  }
  return h
}
/** g^α для постоянного α */
function powConst(g, al) {
  const N = g.length - 1
  if (Number.isInteger(al) && al >= 0) {
    let res = cst(1, N), b = g, e = al
    while (e > 0) { if (e & 1) res = mul(res, b); e >>= 1; if (e) b = mul(b, b) }
    return res
  }
  if (Number.isInteger(al)) return div(cst(1, N), powConst(g, -al))
  const g0 = g[0]
  if (!(g0 > 0)) return cst(NaN, N)
  const p = zeros(N)
  p[0] = Math.pow(g0, al)
  for (let k = 1; k <= N; k++) {
    let s = 0
    for (let j = 1; j <= k; j++) s += (al * j - (k - j)) * g[j] * p[k - j]
    p[k] = s / (k * g0)
  }
  return p
}
function expJ(g) {
  const N = g.length - 1, e = zeros(N)
  e[0] = Math.exp(g[0])
  for (let k = 1; k <= N; k++) {
    let s = 0
    for (let j = 1; j <= k; j++) s += j * g[j] * e[k - j]
    e[k] = s / k
  }
  return e
}
function logJ(g) {
  const N = g.length - 1, l = zeros(N)
  if (!(g[0] > 0)) return cst(NaN, N)
  l[0] = Math.log(g[0])
  for (let k = 1; k <= N; k++) {
    let s = k * g[k]
    for (let j = 1; j < k; j++) s -= j * l[j] * g[k - j]
    l[k] = s / (k * g[0])
  }
  return l
}
function sincos(g) {
  const N = g.length - 1, s = zeros(N), c = zeros(N)
  s[0] = Math.sin(g[0]); c[0] = Math.cos(g[0])
  for (let k = 1; k <= N; k++) {
    let a = 0, b = 0
    for (let j = 1; j <= k; j++) { a += j * g[j] * c[k - j]; b += j * g[j] * s[k - j] }
    s[k] = a / k; c[k] = -b / k
  }
  return [s, c]
}
function sinhcosh(g) {
  const N = g.length - 1, s = zeros(N), c = zeros(N)
  s[0] = Math.sinh(g[0]); c[0] = Math.cosh(g[0])
  for (let k = 1; k <= N; k++) {
    let a = 0, b = 0
    for (let j = 1; j <= k; j++) { a += j * g[j] * c[k - j]; b += j * g[j] * s[k - j] }
    s[k] = a / k; c[k] = b / k
  }
  return [s, c]
}
function atanJ(g) {
  const N = g.length - 1
  const q = add(cst(1, N), mul(g, g))       // (1+g²)·a' = g'
  const a = zeros(N)
  a[0] = Math.atan(g[0])
  const dg = k => (k + 1) * g[k + 1]
  const da = zeros(N)                         // коэффициенты a'
  for (let k = 0; k < N; k++) {
    let s = dg(k)
    for (let j = 1; j <= k; j++) s -= q[j] * da[k - j]
    da[k] = s / q[0]
    a[k + 1] = da[k] / (k + 1)
  }
  return a
}
const compose1 = {
  exp: expJ, log: logJ, ln: logJ,
  sqrt: g => powConst(g, 0.5), cbrt: g => powConst(g, 1 / 3),
  sin: g => sincos(g)[0], cos: g => sincos(g)[1],
  tan: g => { const [s, c] = sincos(g); return div(s, c) },
  sinh: g => sinhcosh(g)[0], cosh: g => sinhcosh(g)[1],
  tanh: g => { const [s, c] = sinhcosh(g); return div(s, c) },
  atan: atanJ,
  asin: g => { const N = g.length - 1; return jetAsin(g, N) },
  acos: g => { const N = g.length - 1; const a = jetAsin(g, N); const r = neg(a); r[0] += Math.PI / 2; return r },
  abs: g => (g[0] >= 0 ? g : neg(g)),
}
/** asin: (1−g²)·a' = g' */
function jetAsin(g, N) {
  const q = sub(cst(1, N), mul(g, g))
  const a = zeros(N), da = zeros(N)
  a[0] = Math.asin(g[0])
  if (!(q[0] > 0) && N > 0) return cst(NaN, N)
  const sq = powConst(q, 0.5)
  const dg = zeros(N)
  for (let k = 0; k < N; k++) dg[k] = (k + 1) * g[k + 1]
  const d = div(dg, sq)
  for (let k = 0; k < N; k++) a[k + 1] = d[k] / (k + 1)
  return a
}

function ev(node, a, N) {
  switch (node.type) {
    case 'ConstantNode': return cst(Number(node.value), N)
    case 'ParenthesisNode': return ev(node.content, a, N)
    case 'SymbolNode': {
      if (node.name === 'x') { const j = zeros(N); j[0] = a; if (N >= 1) j[1] = 1; return j }
      if (node.name === 'pi') return cst(Math.PI, N)
      if (node.name === 'e') return cst(Math.E, N)
      throw new Error('symbol ' + node.name)
    }
    case 'OperatorNode': {
      const args = node.args.map(n => ev(n, a, N))
      switch (node.fn) {
        case 'add': return args.reduce(add)
        case 'subtract': return sub(args[0], args[1])
        case 'unaryMinus': return neg(args[0])
        case 'unaryPlus': return args[0]
        case 'multiply': return args.reduce(mul)
        case 'divide': return div(args[0], args[1])
        case 'pow': {
          const [b, p] = args
          if (isConst(p)) return powConst(b, p[0])
          return expJ(mul(p, logJ(b)))
        }
        default: throw new Error('op ' + node.fn)
      }
    }
    case 'FunctionNode': {
      const f = compose1[node.fn.name]
      if (!f) throw new Error('fn ' + node.fn.name)
      return f(ev(node.args[0], a, N))
    }
    default: throw new Error('node ' + node.type)
  }
}

const cache = new Map()
/** [c_0 … c_N] — коэффициенты Тейлора в точке a (NaN-массив, если не получилось) */
export function taylorCoefs(src, a, N) {
  const key = src + '|' + a + '|' + N
  if (cache.has(key)) return cache.get(key)
  let out
  try { out = ev(tree(src), a, N) } catch { out = cst(NaN, N) }
  if (cache.size > 400) cache.clear()
  cache.set(key, out)
  return out
}
