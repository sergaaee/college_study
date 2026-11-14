import { compile } from 'mathjs'

const cache = new Map()
function node(src) {
  let n = cache.get(src)
  if (!n) { n = compile(String(src).replace(/−/g, '-')); cache.set(src, n) }
  return n
}
const num = v => (typeof v === 'number' ? v : v && typeof v.re === 'number' && Math.abs(v.im || 0) < 1e-12 ? v.re : typeof v === 'boolean' ? +v : NaN)

/** Компиляция строки в функцию одной переменной с параметрами: f = fn('a*x^2+b', 'x')(params) */
export function fn(src, variable = 'x', params = {}) {
  const n = node(src)
  return x => {
    try { return num(n.evaluate({ ...params, [variable]: x })) } catch { return NaN }
  }
}
export function evalNum(src, scope = {}) {
  if (typeof src === 'number') return src
  try { return num(node(src).evaluate(scope)) } catch { return NaN }
}

export const D = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h)
export const D2 = (f, x, h = 1e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)
export function integral(f, a, b, n = 2000) {
  if (n % 2) n++
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2)
  return (s * h) / 3
}
export function root(f, a, b, it = 80) {
  let fa = f(a), fb = f(b)
  if (!(fa * fb <= 0)) return NaN
  for (let i = 0; i < it; i++) {
    const m = (a + b) / 2, fm = f(m)
    if (fa * fm <= 0) { b = m; fb = fm } else { a = m; fa = fm }
  }
  return (a + b) / 2
}
/** Все корни f на [a,b] (по смене знака на сетке). */
export function roots(f, a, b, n = 800) {
  const out = []
  let px = a, py = f(a)
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n, y = f(x)
    if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0 && Math.abs(y - py) < 1e3) out.push(root(f, px, x))
    else if (y === 0) out.push(x)
    px = x; py = y
  }
  return out
}
/** Оценка диапазона значений по сетке (устойчиво к асимптотам). */
export function yRange(f, a, b, n = 400, pad = 0.12, clip = 1e3) {
  const ys = []
  for (let i = 0; i <= n; i++) { const y = f(a + ((b - a) * i) / n); if (Number.isFinite(y) && Math.abs(y) < clip) ys.push(y) }
  if (!ys.length) return [-1, 1]
  ys.sort((p, q) => p - q)
  let lo = ys[Math.floor(ys.length * 0.01)], hi = ys[Math.ceil(ys.length * 0.99) - 1]
  if (hi - lo < 1e-9) { lo -= 1; hi += 1 }
  const p = (hi - lo) * pad
  return [lo - p, hi + p]
}
export const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r }
export const binom = (n, k) => { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r) }
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
